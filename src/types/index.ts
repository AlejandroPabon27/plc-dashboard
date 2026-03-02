// =============================================================================
// src/types/index.ts — Tipos TypeScript del dashboard PLC
// =============================================================================
//
// PROPÓSITO:
//   Define todas las interfaces TypeScript usadas en la aplicación.
//   Los campos están mapeados directamente a las tablas de PostgreSQL:
//     - clients → Cliente
//     - node_ids → Nodo
//     - logs (JOIN clients + node_ids) → LogEntry
//
// PARA MODIFICAR:
//   - Si se agrega una columna a la DB, agregar el campo aquí y en la query SQL.
//   - Si se agrega un nuevo filtro, agregarlo a LogFilters y a buildWhereClause() en db.ts.
//   - Si se agrega una nueva stat al dashboard, agregarla a DashboardStats.
//
// CONSUMIDO POR:
//   - Todos los componentes, hooks, rutas API y utilidades del proyecto.
// =============================================================================

/**
 * Entrada de log tal como llega de la API al frontend.
 * Cada LogEntry combina datos de tres tablas: logs, node_ids y clients.
 *
 * Mapeo de campos a tablas de la DB:
 *   id         → logs.id (BIGSERIAL)
 *   timestamp  → logs.opc_timestamp (TIMESTAMPTZ, convertido a ISO 8601)
 *   client     → clients.name (JOIN vía node_ids.client_id)
 *   client_id  → clients.id
 *   tag_group  → node_ids.tag_group (agrupación lógica de tags OPC-UA)
 *   tag_name   → node_ids.tag_name (nombre legible del tag)
 *   node_id    → node_ids.id (FK en logs.node_id_fk)
 *   value      → logs.value (TEXT — puede contener JSON)
 *   quality    → logs.quality (VARCHAR(50) — típicamente 'Good', 'Bad', 'Uncertain')
 *   is_alarm   → node_ids.is_alarm (marca si el nodo es una alarma)
 */
export interface LogEntry {
    id: string;
    timestamp: string;
    client: string;
    client_id: number;
    tag_group: string;
    tag_name: string;
    node_id: number;
    value: string;
    quality: string;
    is_alarm?: boolean;
}

/**
 * Cliente del sistema OPC-UA.
 * Corresponde a la tabla 'clients' en PostgreSQL.
 * Cada cliente tiene un servidor OPC-UA al cual se conecta.
 *
 * Mapeo:
 *   id         → clients.id (SERIAL PK)
 *   name       → clients.name (nombre legible, ej: 'PLC Costayaco')
 *   server_url → clients.server_url (URL del endpoint OPC-UA)
 *   server_ip  → clients.server_ip (dirección IP del servidor)
 */
export interface Cliente {
    id: number;
    name: string;
    server_url: string;
    server_ip: string;
}

/**
 * Nodo OPC-UA asociado a un cliente.
 * Corresponde a la tabla 'node_ids' en PostgreSQL.
 * Cada nodo representa un tag del PLC con un nombre y grupo.
 *
 * Mapeo:
 *   id          → node_ids.id (SERIAL PK)
 *   client_id   → node_ids.client_id (FK a clients.id)
 *   node_id     → node_ids.node_id (ID OPC-UA del nodo, ej: 'ns=2;s=Tag1')
 *   tag_name    → node_ids.tag_name (nombre legible del tag)
 *   tag_group   → node_ids.tag_group (agrupación: 'Presión', 'Temperatura', etc.)
 *   is_alarm    → node_ids.is_alarm (boolean — marca si es tag de alarma)
 *   client_name → (campo virtual, viene del JOIN con clients.name)
 */
export interface Nodo {
    id: number;
    client_id: number;
    node_id: string;
    tag_name: string;
    tag_group: string;
    is_alarm: boolean;
    client_name?: string;
}

/**
 * Filtros disponibles para buscar y filtrar logs.
 * Se usa en el hook useLogs(), en LogFilterBar (UI), y en el API /api/logs.
 * Cada campo es opcional — si está undefined, no se aplica el filtro.
 *
 * PARA AGREGAR UN NUEVO FILTRO:
 *   1. Agregar el campo aquí
 *   2. Agregar la condición SQL en buildWhereClause() (src/lib/db.ts)
 *   3. Leer el parámetro en /api/logs/route.ts
 *   4. Agregar el control UI en LogFilterBar.tsx
 */
export interface LogFilters {
    dateFrom?: string;        // Fecha inicio (ISO 8601)
    dateTo?: string;          // Fecha fin (ISO 8601)
    clientIds?: number[];     // IDs de clientes a incluir
    tagGroups?: string[];     // Nombres de tag_group a incluir
    nodeIds?: number[];       // IDs de nodos específicos
    qualities?: string[];     // Valores de quality ('Good', 'Bad', etc.)
    search?: string;          // Búsqueda libre por tag_name o nombre de cliente
}

/**
 * Parámetros de paginación y ordenamiento para las consultas de logs.
 * Se envían como query params a la API /api/logs.
 *
 * page      → Página actual (1-based)
 * pageSize  → Cantidad de registros por página (ver PAGE_SIZE_OPTIONS en constants.ts)
 * sortBy    → Columna de ordenamiento (ej: 'timestamp', 'client', 'quality')
 * sortOrder → Dirección del ordenamiento ('asc' | 'desc')
 */
export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Respuesta paginada genérica devuelta por la API.
 * Se usa como wrapper estándar en todos los endpoints que retornan listas.
 *
 * data       → Array de elementos de la página actual.
 * total      → Total de registros que coinciden con los filtros.
 * page       → Número de página actual.
 * pageSize   → Tamaño de página usado.
 * totalPages → Total de páginas disponibles (Math.ceil(total / pageSize)).
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * Resumen de estadísticas calculadas para el panel principal del dashboard.
 * Se obtiene de la API /api/stats/summary que ejecuta 5 queries en paralelo.
 *
 * totalLogs       → Cantidad total de logs en las últimas 24h.
 * totalByQuality  → Desglose de logs por quality (para QualityDonut).
 * activeClients   → Cantidad de clientes con actividad reciente.
 * activeNodes     → Cantidad de nodos con actividad reciente.
 * logsByHour      → Distribución horaria de logs (para LogChart).
 * logsByTagGroup  → Distribución por tag_group con porcentaje (para TagGroupBars).
 * recentLogs      → Últimos 20 logs (para RecentLogs y AlarmPanel).
 */
export interface DashboardStats {
    totalLogs: number;
    totalByQuality: { quality: string; count: number }[];
    activeClients: number;
    activeNodes: number;
    logsByHour: { hora: string; count: number }[];
    logsByTagGroup: { tag_group: string; count: number; percentage: number }[];
    recentLogs: LogEntry[];
}
