// =============================================================================
// src/lib/db.ts — Pool de conexiones PostgreSQL optimizado para alto volumen
// =============================================================================
//
// PROPÓSITO:
//   Gestiona la conexión a la base de datos PostgreSQL de la QNAP.
//   Implementa un pool de conexiones reutilizable, caché en memoria para
//   consultas costosas, y un constructor de cláusulas WHERE dinámicas
//   optimizado para tablas con millones de registros por hora.
//
// PARA MODIFICAR:
//   - Parámetros del pool (max, min, timeouts): editar getPool()
//   - Configuración de rendimiento por conexión (work_mem, statement_timeout):
//     editar el handler pool.on('connect')
//   - TTL del caché: se configura al llamar cached() desde cada ruta API
//   - Filtros SQL (nuevos campos): editar buildWhereClause()
//
// CONSUMIDO POR:
//   - Todas las rutas en src/app/api/ que acceden a la DB
//   - El caché es usado por /api/logs (conteo) y /api/stats/summary
// =============================================================================
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { withMetrics } from './monitoring';
import { QUERY_TIMEOUT_MS } from './constants';

let pool: Pool | null = null;

/**
 * Obtiene (o crea) el pool de conexiones de PostgreSQL.
 * Usa el patrón Singleton: solo se crea una instancia del pool
 * durante todo el ciclo de vida del proceso Node.js.
 *
 * Configuración del pool:
 *   - max: 30 conexiones simultáneas (soporta picos de queries concurrentes)
 *   - min: 5 conexiones pre-abiertas (evita latencia de cold-start)
 *   - idleTimeoutMillis: 60s (las conexiones inactivas se mantienen más tiempo)
 *   - connectionTimeoutMillis: 10s (la QNAP puede tener carga I/O)
 *   - statement_timeout: 60s por query (previene queries colgadas)
 *   - work_mem: 64MB (permite JOINs y sorts grandes en memoria)
 *
 * PARA MODIFICAR CONEXIÓN:
 *   La variable de entorno DATABASE_URL debe tener el formato:
 *   postgres://usuario:contraseña@host:puerto/nombre_db
 *
 * @returns Pool de conexiones PostgreSQL listo para usar.
 * @throws Error si DATABASE_URL no está configurada.
 */
function getPool(): Pool {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada en las variables de entorno.');
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 30,                         // 30 conexiones para soportar múltiples queries concurrentes
            min: 5,                          // Mantener 5 conexiones siempre abiertas (evita cold-start)
            idleTimeoutMillis: 60000,        // 60s — conexiones inactivas viven más para reuso
            connectionTimeoutMillis: 10000,  // 10s timeout de conexión (QNAP puede estar bajo carga)
            // Configuración de rendimiento para alto volumen
            allowExitOnIdle: false,          // No cerrar el pool si hay idle
            ssl: false,
        });

        pool.on('error', (err) => {
            console.error('[DB] Error inesperado en cliente del pool:', err.message);
        });

        // Configurar cada nueva conexión para rendimiento
        pool.on('connect', (client) => {
            // statement_timeout previene queries que se cuelgan
            client.query('SET statement_timeout = 60000'); // 60s max por query
            // work_mem más alto para JOINs y sorts en memoria
            client.query('SET work_mem = \'64MB\'');
        });
    }
    return pool;
}

/**
 * Ejecuta una query SQL parametrizada contra PostgreSQL.
 * Obtiene un cliente del pool, ejecuta la consulta y lo libera automáticamente.
 * Usa withMetrics() para registrar el tiempo de ejecución y detectar queries lentas.
 *
 * @param text    - Query SQL con parámetros posicionales ($1, $2, etc.).
 * @param params  - Array de valores para los parámetros posicionales.
 * @param timeout - Timeout específico para esta query en ms (default: QUERY_TIMEOUT_MS).
 * @param label   - Etiqueta descriptiva para logs de monitoreo.
 * @returns QueryResult<T> con las filas resultantes.
 *
 * Ejemplo de uso:
 *   const result = await query<LogEntry>(
 *     'SELECT * FROM logs WHERE id = $1', [42], 10000, 'getLogById'
 *   );
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
    timeout: number = QUERY_TIMEOUT_MS,
    label: string = 'query'
): Promise<QueryResult<T>> {
    return withMetrics(label, async () => {
        const client: PoolClient = await getPool().connect();
        try {
            // Aplicar timeout específico si es diferente al default
            if (timeout !== QUERY_TIMEOUT_MS) {
                await client.query(`SET LOCAL statement_timeout = ${timeout}`);
            }
            const result = await client.query<T>(text, params);
            return result;
        } finally {
            client.release();
        }
    });
}

/**
 * Ejecuta múltiples queries dentro de una transacción atómica (BEGIN/COMMIT/ROLLBACK).
 * Si alguna query falla, se revierte toda la transacción.
 * Se usa en operaciones de escritura que requieren consistencia, como:
 *   - Eliminación de un cliente con sus nodos asociados (cascade)
 *   - Creación de entidades con múltiples inserts relacionados
 *
 * @param fn - Función async que recibe el PoolClient y ejecuta las queries.
 * @returns El resultado de la función fn.
 * @throws Re-lanza el error original después de hacer ROLLBACK.
 *
 * Ejemplo de uso:
 *   await transaction(async (client) => {
 *     await client.query('DELETE FROM node_ids WHERE client_id = $1', [id]);
 *     await client.query('DELETE FROM clients WHERE id = $1', [id]);
 *   });
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// =============================================================================
// Caché en memoria (Map) para consultas costosas en tablas grandes
// =============================================================================
//
// Se usa para evitar repetir COUNT(*) y consultas de estadísticas que no cambian
// drásticamente en intervalos cortos. Cada entrada tiene un TTL configurable.
//
// PARA MODIFICAR:
//   - Para agregar una nueva entrada cacheada, llamar cached('mi_clave', 30000, fn)
//   - El TTL se define por cada llamada individual, no de forma global
//   - Para invalidar todo el caché: cache.clear() (actualmente no expuesto)
// =============================================================================

/** Estructura interna de una entrada del caché con expiración */
interface CacheEntry<T> {
    data: T;
    expiresAt: number;  // Timestamp epoch en ms cuando expira
}

/** Map global en memoria — persiste mientras el proceso Node.js esté activo */
const cache = new Map<string, CacheEntry<any>>();

/**
 * Lee del caché si la entrada no ha expirado. Si ha expirado o no existe,
 * ejecuta la función fetchFn, guarda el resultado con el TTL indicado, y lo retorna.
 *
 * @param key     - Clave única del caché (ej: 'logs_count_24h', 'stats_summary').
 * @param ttlMs   - Tiempo de vida en milisegundos (ej: 30000 = 30s).
 * @param fetchFn - Función async que obtiene los datos frescos desde la DB.
 * @returns Los datos cacheados o frescos de tipo T.
 */
export async function cached<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = cache.get(key);
    if (entry && entry.expiresAt > now) {
        return entry.data;
    }
    const data = await fetchFn();
    cache.set(key, { data, expiresAt: now + ttlMs });
    return data;
}

// =============================================================================
// WHERE clause builder — optimizado para uso con índices
// =============================================================================

/**
 * Construye una cláusula WHERE dinámica con parámetros posicionales ($1, $2...)
 * a partir del objeto de filtros del usuario.
 *
 * Está diseñado para aprovechar el índice compuesto:
 *   CREATE INDEX ON logs (node_id_fk, opc_timestamp DESC)
 *
 * Cuando los filtros de cliente o tag_group se aplican, se usan sub-queries
 * contra node_ids para resolver a node_id_fk IN (...), lo que permite que
 * PostgreSQL use el índice principal en vez de hacer full-table scans.
 *
 * PROTECCIÓN DE RENDIMIENTO:
 *   Si no se especifican fechas (dateFrom/dateTo), se limita automáticamente
 *   a las últimas 24 horas. Esto evita escanear millones de filas accidentalmente.
 *
 * @param filters          - Objeto con los filtros seleccionados por el usuario.
 * @param enforceTimeRange - Si es true (default), aplica el límite de 24h
 *                           cuando no hay fechas. Poner false para exportaciones.
 * @returns Objeto con:
 *   - where: String SQL (ej: 'WHERE l.opc_timestamp >= $1 AND l.quality = ANY($2::varchar[])')
 *   - params: Array de valores para los parámetros posicionales
 *   - nextIndex: Siguiente índice disponible para agregar más parámetros
 *
 * PARA AGREGAR UN NUEVO FILTRO:
 *   1. Agregar el campo al interface 'filters' del parámetro
 *   2. Agregar un bloque if (filters.nuevoFiltro) con conditions.push()
 *   3. Agregar el tipo correspondiente en src/types/index.ts → LogFilters
 */
export function buildWhereClause(filters: {
    dateFrom?: string;
    dateTo?: string;
    clientIds?: number[];
    tagGroups?: string[];
    nodeIds?: number[];
    qualities?: string[];
    search?: string;
}, enforceTimeRange = true): { where: string; params: any[]; nextIndex: number } {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    // Si no hay rango de fechas, forzar últimas 24h para proteger rendimiento
    if (!filters.dateFrom && !filters.dateTo && enforceTimeRange) {
        conditions.push(`l.opc_timestamp >= NOW() - INTERVAL '24 hours'`);
    }

    if (filters.dateFrom) {
        conditions.push(`l.opc_timestamp >= $${idx++}`);
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push(`l.opc_timestamp <= $${idx++}`);
        params.push(filters.dateTo);
    }
    if (filters.clientIds?.length) {
        // Usar node_id_fk IN (subquery) para aprovechar el índice de logs
        conditions.push(`l.node_id_fk IN (SELECT id FROM node_ids WHERE client_id = ANY($${idx++}::int[]))`);
        params.push(filters.clientIds);
    }
    if (filters.tagGroups?.length) {
        conditions.push(`l.node_id_fk IN (SELECT id FROM node_ids WHERE tag_group = ANY($${idx++}::text[]))`);
        params.push(filters.tagGroups);
    }
    if (filters.nodeIds?.length) {
        conditions.push(`l.node_id_fk = ANY($${idx++}::int[])`);
        params.push(filters.nodeIds);
    }
    if (filters.qualities?.length) {
        conditions.push(`l.quality = ANY($${idx++}::varchar[])`);
        params.push(filters.qualities);
    }
    if (filters.search) {
        // ILIKE en tablas de millones de filas es costoso; limitar a node_ids
        conditions.push(`l.node_id_fk IN (
            SELECT id FROM node_ids WHERE tag_name ILIKE $${idx}
            UNION SELECT n2.id FROM node_ids n2 JOIN clients c2 ON n2.client_id = c2.id WHERE c2.name ILIKE $${idx}
        )`);
        params.push(`%${filters.search}%`);
        idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params, nextIndex: idx };
}
