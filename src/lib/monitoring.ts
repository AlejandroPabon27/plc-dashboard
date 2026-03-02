// =============================================================================
// src/lib/monitoring.ts — Monitoreo de queries lentas y métricas de rendimiento
// =============================================================================
//
// PROPÓSITO:
//   Proporciona un wrapper para medir el tiempo de ejecución de queries SQL.
//   Detecta queries lentas y las registra en la consola del servidor.
//   Se aplica automáticamente a todas las queries ejecutadas vía query() en db.ts.
//
// PARA MODIFICAR:
//   - Umbral de queries lentas: cambiar SLOW_QUERY_THRESHOLD_MS (actualmente 1000ms)
//   - Para enviar métricas a un servicio externo (Datadog, New Relic, Prometheus):
//     descomentar y configurar la línea sendMetric() dentro del bloque finally
//
// CONSUMIDO POR:
//   - src/lib/db.ts → función query() envuelve cada consulta en withMetrics()
// =============================================================================

/**
 * Umbral en milisegundos para considerar una query como "lenta".
 * Si una query tarda más de este valor, se emite un console.warn.
 * Ajustar según el rendimiento esperado del servidor QNAP.
 */
const SLOW_QUERY_THRESHOLD_MS = 1000;

/**
 * Envuelve una función async y mide su tiempo de ejecución en milisegundos.
 * Registra en la consola del servidor:
 *   - console.warn si la query supera SLOW_QUERY_THRESHOLD_MS
 *   - console.log para queries dentro del umbral
 *
 * @param queryName - Nombre descriptivo para identificar la operación en los logs
 *                    de la consola (ej: 'getLogsPaginated', 'countLogs').
 * @param queryFn   - Función async que ejecuta la operación a medir.
 * @returns El resultado de queryFn sin modificar.
 *
 * Ejemplo de salida en consola:
 *   [MONITORING] "getLogsPaginated" completada en 45ms
 *   [MONITORING] Query lenta detectada — "countLogs": 2340ms
 */
export async function withMetrics<T>(
    queryName: string,
    queryFn: () => Promise<T>
): Promise<T> {
    const start = Date.now();
    try {
        const result = await queryFn();
        return result;
    } finally {
        const duration = Date.now() - start;
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(`[MONITORING] Query lenta detectada — "${queryName}": ${duration}ms`);
            // Aquí podrías enviar métricas a un servicio externo (Datadog, New Relic, etc.)
            // sendMetric({ name: queryName, duration, timestamp: new Date() });
        } else {
            console.log(`[MONITORING] "${queryName}" completada en ${duration}ms`);
        }
    }
}
