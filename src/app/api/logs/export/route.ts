// =============================================================================
// src/app/api/logs/export/route.ts — POST /api/logs/export
// Exportación optimizada con LIMIT de seguridad y streaming para CSV
//
// PROPÓSITO: Exportar logs filtrados a CSV o JSON. Protege contra exportaciones
// masivas limitando a 50,000 filas máximo. El CSV se envía como stream chunked
// para evitar acumular todo en memoria.
//
// CONSUMIDO POR: botón "Exportar" en la página /logs (logs/page.tsx)
//
// BODY (JSON):
// - filters: objeto LogFilters (dateFrom, dateTo, qualities, search, etc.)
// - format: 'csv' (default) o 'json'
//
// RESPUESTA:
// - CSV: stream chunked con BOM UTF-8 + header + filas (Content-Disposition: attachment)
// - JSON: array de objetos LogEntry (Content-Disposition: attachment)
//
// PARA MODIFICAR:
// - Cambiar límite de exportación → editar MAX_EXPORT_ROWS (50000)
// - Cambiar columnas del CSV → editar CSV_HEADER y rowToCSV()
// - Agregar formato Excel → añadir nueva rama en el if(format)
// - Cambiar orden de exportación → editar ORDER BY en el SQL
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { buildWhereClause, query as dbQuery } from '@/lib/db';
import { MOCK_LOGS } from '@/data/mockData';
import { formatTimestamp, getQualityLabel } from '@/lib/utils';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Máximo de filas exportables en una sola descarga
// Con 1-5M filas/hora, exportar sin límite colapsaría la memoria
const MAX_EXPORT_ROWS = 50000;

const CSV_HEADER = 'ID,Timestamp,Client,Tag Group,Tag Name,Value,Quality\n';

/**
 * Convierte una fila de log a formato CSV. Escapa comillas dobles en el valor.
 * Columnas: ID, Timestamp formateado, Client, Tag Group, Tag Name, Value, Quality label.
 *
 * @param row - Fila de resultado (del mock o de PostgreSQL)
 * @returns Línea CSV con salto de línea al final
 */
function rowToCSV(row: any): string {
    const value = String(row.value || '').replace(/"/g, '""');
    return `${row.id},"${formatTimestamp(row.timestamp)}","${row.client}","${row.tag_group}","${row.tag_name}","${value}","${getQualityLabel(row.quality)}"\n`;
}

/**
 * Handler POST para exportar logs filtrados.
 * Construye la query con los mismos filtros que usa la tabla de logs,
 * pero sin paginación (solo LIMIT forzado de seguridad).
 * En modo mock, filtra el array MOCK_LOGS en memoria.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const filters = body.filters || {};
        const format = body.format || 'csv';

        // ── Modo Mock ──────────────────────────────────────────────────────────────
        if (USE_MOCK) {
            let data = [...MOCK_LOGS];
            if (filters.qualities?.length) data = data.filter(l => filters.qualities.includes(l.quality));
            if (filters.search) {
                const s = filters.search.toLowerCase();
                data = data.filter(l => l.value.toLowerCase().includes(s) || l.tag_name.toLowerCase().includes(s));
            }
            if (filters.dateFrom) data = data.filter(l => l.timestamp >= filters.dateFrom);
            if (filters.dateTo) data = data.filter(l => l.timestamp <= filters.dateTo);
            data = data.slice(0, MAX_EXPORT_ROWS);

            if (format === 'json') {
                return NextResponse.json(data, {
                    headers: { 'Content-Disposition': 'attachment; filename=logs.json' },
                });
            }
            const csv = CSV_HEADER + data.map(rowToCSV).join('');
            return new NextResponse('\uFEFF' + csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=logs_${new Date().toISOString().slice(0, 10)}.csv`,
                },
            });
        }

        // ── Modo PostgreSQL — LIMIT forzado, streaming para CSV ─────────────────
        const { where, params, nextIndex } = buildWhereClause(filters);

        const SQL = `
            SELECT l.id::text, l.opc_timestamp as timestamp, l.value, l.quality,
                c.name as client, n.tag_group, n.tag_name
            FROM logs l
            JOIN node_ids n ON l.node_id_fk = n.id
            JOIN clients c ON n.client_id = c.id
            ${where}
            ORDER BY l.opc_timestamp DESC
            LIMIT $${nextIndex}
        `;

        const result = await dbQuery(SQL, [...params, MAX_EXPORT_ROWS], 60000, 'export');

        if (format === 'json') {
            return NextResponse.json(result.rows, {
                headers: { 'Content-Disposition': 'attachment; filename=logs.json' },
            });
        }

        // Streaming CSV — no acumula todo en memoria
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode('\uFEFF' + CSV_HEADER));
                for (const row of result.rows) {
                    controller.enqueue(encoder.encode(rowToCSV(row)));
                }
                controller.close();
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=logs_${new Date().toISOString().slice(0, 10)}.csv`,
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (err: any) {
        console.error('[API /logs/export] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
