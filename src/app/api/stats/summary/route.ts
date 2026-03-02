// =============================================================================
// src/app/api/stats/summary/route.ts — GET /api/stats/summary
// Optimizado para alto volumen: queries acotadas + caché en memoria
//
// PROPÓSITO: Proveer todos los KPIs y datos de gráficas para el dashboard
// principal en una sola llamada. Cacheado 30s en memoria para evitar
// recalcular sobre millones de filas.
//
// CONSUMIDO POR: hook useDashboardStats → dashboard (src/app/page.tsx)
//
// RESPUESTA: DashboardStats {
//   totalLogs, totalByQuality, activeClients, activeNodes,
//   logsByHour, logsByTagGroup, recentLogs
// }
//
// QUERIES EJECUTADAS (en paralelo):
// 1. COUNT + nodos activos → últimas 24h sobre tabla logs
// 2. Distribución por quality → GROUP BY quality, últimas 24h
// 3. Frecuencia por hora → date_trunc('hour'), últimas 24h
// 4. Distribución por tag_group → JOIN con node_ids, LIMIT 10
// 5. Últimos 5 logs → JOIN completo, ORDER BY timestamp DESC LIMIT 5
// 6. Clientes activos → COUNT DISTINCT sobre node_ids
//
// PARA MODIFICAR:
// - Cambiar TTL del caché → editar STATS_CACHE_TTL (30000ms)
// - Cambiar ventana temporal → editar INTERVAL '24 hours' en las queries
// - Agregar nuevos KPIs → añadir query en el Promise.all y al objeto de retorno
// - Cambiar cantidad de logs recientes → editar LIMIT 5 en la query
// =============================================================================
import { NextResponse } from 'next/server';
import { query, cached } from '@/lib/db';
import { getMockStats } from '@/data/mockData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Caché: stats se refrescan cada 30s (no tiene sentido re-calcular sobre
// millones de filas más frecuentemente)
const STATS_CACHE_TTL = 30000;

/**
 * GET /api/stats/summary — Devuelve todos los KPIs del dashboard en una sola llamada.
 * Resultado cacheado 30s en memoria. Ejecuta 6 queries en paralelo, todas acotadas
 * a las últimas 24 horas para limitar el escaneo sobre tablas grandes.
 * En modo mock, retorna datos estáticos de getMockStats().
 *
 * @returns DashboardStats con totalLogs, byQuality, activeClients/Nodes,
 *          logsByHour, logsByTagGroup, recentLogs
 */
export async function GET() {
  try {
    if (USE_MOCK) {
      return NextResponse.json(getMockStats());
    }

    const stats = await cached('dashboard-stats', STATS_CACHE_TTL, async () => {
      // Ejecutar todas las queries en paralelo, todas acotadas a 24h
      const [
        totalsResult,
        byQualityResult,
        byHourResult,
        byTagGroupResult,
        recentLogsResult,
      ] = await Promise.all([
        // Total + clientes/nodos activos
        // Usa solo la tabla logs + subquery en node_ids (evita JOIN en tabla grande)
        query(`
                    SELECT
                        COUNT(*) as total,
                        COUNT(DISTINCT l.node_id_fk) as active_nodes
                    FROM logs l
                    WHERE l.opc_timestamp >= NOW() - INTERVAL '24 hours'
                `, [], 30000, 'stats-totals'),

        // Distribución por quality — solo sobre logs (sin JOIN)
        query(`
                    SELECT quality, COUNT(*) as count
                    FROM logs
                    WHERE opc_timestamp >= NOW() - INTERVAL '24 hours'
                    GROUP BY quality
                    ORDER BY count DESC
                `, [], 30000, 'stats-by-quality'),

        // Frecuencia por hora — solo sobre logs (sin JOIN)
        query(`
                    SELECT
                        date_trunc('hour', opc_timestamp) as hora,
                        COUNT(*) as count
                    FROM logs
                    WHERE opc_timestamp >= NOW() - INTERVAL '24 hours'
                    GROUP BY hora
                    ORDER BY hora ASC
                `, [], 30000, 'stats-by-hour'),

        // Distribución por tag_group — necesita JOIN con node_ids (tabla pequeña)
        query(`
                    SELECT n.tag_group, COUNT(*) as count
                    FROM logs l
                    JOIN node_ids n ON l.node_id_fk = n.id
                    WHERE l.opc_timestamp >= NOW() - INTERVAL '24 hours'
                    GROUP BY n.tag_group
                    ORDER BY count DESC
                    LIMIT 10
                `, [], 30000, 'stats-by-tag-group'),

        // Últimos 5 logs — usa el índice (node_id_fk, opc_timestamp DESC)
        // LIMIT 5 es instantáneo con el índice
        query(`
                    SELECT l.id::text, l.opc_timestamp as timestamp, l.value, l.quality,
                        c.name as client, c.id as client_id,
                        n.tag_name, n.id as node_id, n.tag_group, n.is_alarm
                    FROM logs l
                    JOIN node_ids n ON l.node_id_fk = n.id
                    JOIN clients c ON n.client_id = c.id
                    ORDER BY l.opc_timestamp DESC
                    LIMIT 5
                `, [], 10000, 'stats-recent-logs'),
      ]);

      const totals = totalsResult.rows[0];
      const totalLogs = parseInt(totals.total);

      // Contar clientes activos desde la pequeña tabla node_ids
      const activeClients = await query<{ count: string }>(
        `SELECT COUNT(DISTINCT client_id) as count FROM node_ids
                 WHERE id IN (SELECT DISTINCT node_id_fk FROM logs WHERE opc_timestamp >= NOW() - INTERVAL '24 hours' LIMIT 10000)`,
        [], 10000, 'stats-active-clients'
      );

      return {
        totalLogs,
        totalByQuality: byQualityResult.rows.map(r => ({
          quality: r.quality || 'Unknown',
          count: parseInt(r.count),
        })),
        activeClients: parseInt(activeClients.rows[0]?.count || '0'),
        activeNodes: parseInt(totals.active_nodes),
        logsByHour: byHourResult.rows.map(r => ({
          hora: new Date(r.hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          count: parseInt(r.count),
        })),
        logsByTagGroup: byTagGroupResult.rows.map(r => ({
          tag_group: r.tag_group || 'Sin grupo',
          count: parseInt(r.count),
          percentage: totalLogs > 0 ? Math.round((parseInt(r.count) / totalLogs) * 100) : 0,
        })),
        recentLogs: recentLogsResult.rows,
      };
    });

    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=20');
    return NextResponse.json(stats, { headers });
  } catch (err: any) {
    console.error('[API /stats/summary] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
