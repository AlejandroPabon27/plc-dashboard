// =============================================================================
// src/app/api/logs/route.ts — GET /api/logs — Optimizado para alto volumen
// Diseñado para tablas con decenas de millones de filas
//
// PROPÓSITO: Endpoint principal de consulta de logs con filtros, paginación y
// ordenamiento server-side. Soporta modo mock y PostgreSQL real.
//
// CONSUMIDO POR: hook useLogs (src/hooks/useLogs.ts) → página /logs
//
// QUERY PARAMS ACEPTADOS:
// - dateFrom, dateTo: rango de fechas ISO
// - clientIds: IDs de clientes separados por coma (ej: 1,2,3)
// - tagGroups: grupos de tag separados por coma (ej: Presión,Temperatura)
// - nodeIds: IDs de nodos separados por coma
// - qualities: calidades separadas por coma (ej: Good,Bad)
// - search: texto libre para buscar en valor, tag_name o nombre de cliente
// - page: número de página (1-based, máx 1000)
// - pageSize: filas por página (máx 100)
// - sortBy: columna de ordenamiento (timestamp, opc_timestamp, quality, client, tag_group)
// - sortOrder: 'asc' o 'desc' (default: desc)
//
// RESPUESTA: PaginatedResponse<LogEntry> { data, total, page, pageSize, totalPages }
//
// OPTIMIZACIONES:
// - COUNT cacheado 15s en memoria (evita recontar millones de filas)
// - COUNT y DATA se ejecutan en paralelo (Promise.all)
// - Sort solo por columnas indexadas (whitelist allowedSortColumns)
// - OFFSET limitado a máx 100,000 filas (MAX_PAGE_NUMBER * MAX_PAGE_SIZE)
//
// PARA MODIFICAR:
// - Agregar columnas de sort → editar allowedSortColumns
// - Cambiar límites de paginación → editar MAX_PAGE_SIZE / MAX_PAGE_NUMBER
// - Cambiar TTL del caché de COUNT → editar COUNT_CACHE_TTL
// - Cambiar campos retornados → editar el SELECT de dataPromise
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { query, buildWhereClause, cached } from '@/lib/db';
import { MOCK_LOGS } from '@/data/mockData';
import { LogFilters, PaginationParams, PaginatedResponse, LogEntry } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Límites para proteger rendimiento en tablas de millones de filas
const MAX_PAGE_SIZE = 100;       // Máximo de filas por página
const MAX_PAGE_NUMBER = 1000;    // No permitir OFFSET > 100,000 filas
const COUNT_CACHE_TTL = 15000;   // 15s de caché para COUNT (evita contar millones en cada request)

/**
 * GET /api/logs — Busca logs con filtros, paginación y ordenamiento.
 * En modo mock, filtra el array MOCK_LOGS en memoria.
 * En modo PostgreSQL, ejecuta COUNT (cacheado) y DATA en paralelo.
 *
 * @param req - Request con query params de filtros y paginación
 * @returns PaginatedResponse<LogEntry> con datos, total y metadatos de página
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const filters: LogFilters = {
            dateFrom: searchParams.get('dateFrom') || undefined,
            dateTo: searchParams.get('dateTo') || undefined,
            clientIds: searchParams.get('clientIds')?.split(',').map(Number).filter(Boolean),
            tagGroups: searchParams.get('tagGroups')?.split(',').filter(Boolean),
            nodeIds: searchParams.get('nodeIds')?.split(',').map(Number).filter(Boolean),
            qualities: searchParams.get('qualities')?.split(',').filter(Boolean),
            search: searchParams.get('search') || undefined,
        };

        const pagination: PaginationParams = {
            page: Math.min(parseInt(searchParams.get('page') || '1'), MAX_PAGE_NUMBER),
            pageSize: Math.min(parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE),
            sortBy: searchParams.get('sortBy') || 'opc_timestamp',
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
        };

        // ── Modo Mock ──────────────────────────────────────────────────────────────
        if (USE_MOCK) {
            let filtered = [...MOCK_LOGS];
            if (filters.dateFrom) filtered = filtered.filter(l => l.timestamp >= filters.dateFrom!);
            if (filters.dateTo) filtered = filtered.filter(l => l.timestamp <= filters.dateTo!);
            if (filters.clientIds?.length) filtered = filtered.filter(l => filters.clientIds!.includes(l.client_id));
            if (filters.tagGroups?.length) filtered = filtered.filter(l => filters.tagGroups!.includes(l.tag_group));
            if (filters.nodeIds?.length) filtered = filtered.filter(l => filters.nodeIds!.includes(l.node_id));
            if (filters.qualities?.length) filtered = filtered.filter(l => filters.qualities!.includes(l.quality));
            if (filters.search) {
                const s = filters.search.toLowerCase();
                filtered = filtered.filter(l =>
                    l.value.toLowerCase().includes(s) ||
                    l.tag_name.toLowerCase().includes(s) ||
                    l.client.toLowerCase().includes(s)
                );
            }
            if (pagination.sortBy === 'opc_timestamp' || pagination.sortBy === 'timestamp') {
                filtered.sort((a, b) => {
                    const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                    return pagination.sortOrder === 'asc' ? diff : -diff;
                });
            }
            const total = filtered.length;
            const offset = (pagination.page - 1) * pagination.pageSize;
            const data = filtered.slice(offset, offset + pagination.pageSize);
            return NextResponse.json({
                data, total, page: pagination.page,
                pageSize: pagination.pageSize,
                totalPages: Math.ceil(total / pagination.pageSize),
            } as PaginatedResponse<LogEntry>);
        }

        // ── Modo PostgreSQL (QNAP) — Optimizado para alto volumen ─────────────────
        const { where, params, nextIndex } = buildWhereClause(filters);
        const offset = (pagination.page - 1) * pagination.pageSize;

        const allowedSortColumns: Record<string, string> = {
            timestamp: 'l.opc_timestamp',
            opc_timestamp: 'l.opc_timestamp',
            quality: 'l.quality',
            client: 'c.name',
            tag_group: 'n.tag_group',
        };
        // Solo permitir sort por columnas indexadas para evitar filesort en millones de filas
        const sortCol = allowedSortColumns[pagination.sortBy || 'timestamp'] || 'l.opc_timestamp';
        const sortDir = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Construir clave de caché basada en los filtros
        const cacheKey = `logs-count:${JSON.stringify(filters)}`;

        // COUNT con caché de 15s — es la query más lenta en tablas grandes
        const countPromise = cached<number>(cacheKey, COUNT_CACHE_TTL, async () => {
            const res = await query<{ total: string }>(
                `SELECT COUNT(*) as total FROM logs l ${where}`,
                params, 30000, 'logs-count'
            );
            return parseInt(res.rows[0]?.total || '0');
        });

        // DATA query — JOIN solo para la página actual (muy pequeña)
        const dataPromise = query<any>(
            `SELECT
                l.id::text, l.opc_timestamp as timestamp, l.value, l.quality,
                c.name as client, c.id as client_id,
                n.tag_name, n.id as node_id, n.tag_group, n.is_alarm
            FROM logs l
            JOIN node_ids n ON l.node_id_fk = n.id
            JOIN clients c ON n.client_id = c.id
            ${where}
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
            [...params, pagination.pageSize, offset], 30000, 'logs-data'
        );

        const [total, dataResult] = await Promise.all([countPromise, dataPromise]);

        const response: PaginatedResponse<LogEntry> = {
            data: dataResult.rows,
            total,
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalPages: Math.ceil(total / pagination.pageSize),
        };

        // Headers de caché para el navegador
        const headers = new Headers();
        headers.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');

        return NextResponse.json(response, { headers });
    } catch (err: any) {
        console.error('[API /logs] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
