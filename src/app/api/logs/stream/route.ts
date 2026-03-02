// =============================================================================
// src/app/api/logs/stream/route.ts — Server-Sent Events (SSE) para logs en
// tiempo real. Hace polling cada 5s al servidor y envía solo logs nuevos.
//
// PROPÓSITO: Proveer un stream SSE que envía nuevos logs y alarmas al dashboard
// en tiempo real. El cliente se conecta una vez y recibe eventos periódicamente.
//
// CONSUMIDO POR: hook useRealtimeLogs (src/hooks/useRealtimeLogs.ts) → dashboard
//
// FLUJO:
// 1. El cliente abre conexión GET /api/logs/stream
// 2. El servidor obtiene el MAX(id) actual como punto de partida
// 3. Cada 5 segundos, busca logs con id > lastId (máx 100 por ciclo)
// 4. Si hay nuevos logs, envía evento 'logs' con el array completo
// 5. Si alguno es alarma activa (is_alarm=true, value='1'), envía evento 'alarm'
// 6. Si no hay datos nuevos, envía heartbeat para mantener la conexión
//
// EVENTOS SSE EMITIDOS:
// - 'connected' → { lastId: string } al establecer conexión
// - 'logs' → { logs: LogEntry[], count: number } con nuevos registros
// - 'alarm' → { alarms: LogEntry[] } cuando hay alarmas activas
// - 'error' → { message: string } si falla un poll
// - ': heartbeat' → comentario SSE para mantener conexión viva
//
// PARA MODIFICAR:
// - Cambiar frecuencia de polling → editar POLL_INTERVAL (5000ms)
// - Cambiar límite de logs por ciclo → editar LIMIT 100 en la query
// - Agregar nuevos tipos de eventos → añadir controller.enqueue() con nuevo evento
// - Cambiar lógica de alarmas → editar el filter de alarms (línea ~70)
// =============================================================================
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const POLL_INTERVAL = 5000;  // 5 segundos entre polls al DB

export const dynamic = 'force-dynamic';

/**
 * GET /api/logs/stream — Abre una conexión SSE para recibir logs en tiempo real.
 * Crea un ReadableStream que hace polling cada 5s a PostgreSQL buscando logs
 * con ID superior al último enviado. Emite eventos 'logs', 'alarm' y heartbeats.
 * Se cierra automáticamente cuando el cliente aborta la conexión.
 *
 * @param req - Request; se usa req.signal para detectar cierre del cliente
 * @returns Response de tipo text/event-stream con headers de no-cache
 */
export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
        async start(controller) {
            // Último ID conocido — para buscar solo lo más nuevo
            let lastId = BigInt(0);

            // Obtener el ID máximo actual como punto de partida
            try {
                if (!USE_MOCK) {
                    const res = await query<{ max_id: string }>(
                        'SELECT COALESCE(MAX(id), 0) as max_id FROM logs',
                        [], 10000, 'stream-init'
                    );
                    lastId = BigInt(res.rows[0]?.max_id || '0');
                }
            } catch (err) {
                console.error('[SSE] Error init:', err);
            }

            // Enviar evento de conexión
            controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ lastId: lastId.toString() })}\n\n`));

            let pollTimer: ReturnType<typeof setTimeout> | null = null;

            const poll = async () => {
                if (closed) return;

                try {
                    if (USE_MOCK) {
                        // En modo mock, enviar heartbeat
                        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                    } else {
                        // Buscar logs nuevos desde el último ID
                        const result = await query<any>(
                            `SELECT l.id::text, l.opc_timestamp as timestamp, l.value, l.quality,
                                c.name as client, c.id as client_id,
                                n.tag_name, n.id as node_id, n.tag_group, n.is_alarm
                            FROM logs l
                            JOIN node_ids n ON l.node_id_fk = n.id
                            JOIN clients c ON n.client_id = c.id
                            WHERE l.id > $1
                            ORDER BY l.id ASC
                            LIMIT 100`,
                            [lastId.toString()], 10000, 'stream-poll'
                        );

                        if (result.rows.length > 0) {
                            // Actualizar lastId
                            lastId = BigInt(result.rows[result.rows.length - 1].id);

                            // Separar alarmas de logs normales
                            const alarms = result.rows.filter((r: any) => r.is_alarm && r.value === '1');
                            const logs = result.rows;

                            // Enviar los nuevos logs
                            controller.enqueue(encoder.encode(
                                `event: logs\ndata: ${JSON.stringify({ logs, count: logs.length })}\n\n`
                            ));

                            // Si hay alarmas activas, enviar evento separado
                            if (alarms.length > 0) {
                                controller.enqueue(encoder.encode(
                                    `event: alarm\ndata: ${JSON.stringify({ alarms })}\n\n`
                                ));
                            }
                        } else {
                            // Heartbeat para mantener la conexión viva
                            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                        }
                    }
                } catch (err: any) {
                    if (!closed) {
                        console.error('[SSE] Poll error:', err.message);
                        controller.enqueue(encoder.encode(
                            `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
                        ));
                    }
                }

                // Programar siguiente poll
                if (!closed) {
                    pollTimer = setTimeout(poll, POLL_INTERVAL);
                }
            };

            // Iniciar polling
            poll();

            // Detectar cierre del cliente — limpiar timeout pendiente
            req.signal.addEventListener('abort', () => {
                closed = true;
                if (pollTimer) clearTimeout(pollTimer);
            });
        },
        cancel() {
            closed = true;
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  // Nginx: no buffering
        },
    });
}
