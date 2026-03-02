// =============================================================================
// src/data/mockData.ts — Datos mock realistas simulando campo Costayaco
// Estructura alineada con la DB real en QNAP (clients, node_ids, logs)
//
// PROPÓSITO: Proveer datos de prueba para desarrollo y demo sin necesidad de
// conexión a la base de datos PostgreSQL en la QNAP. Cada array y función
// replica la estructura exacta de las tablas reales.
//
// MODO DE USO: Se activa cuando la variable de entorno NEXT_PUBLIC_USE_MOCK='true'.
// Las rutas API verifican esa variable y usan estos datos en lugar de queries SQL.
//
// PARA MODIFICAR:
// - Agregar/quitar clientes → editar MOCK_CLIENTS
// - Agregar/quitar nodos OPC-UA → editar MOCK_NODOS
// - Cambiar rangos de valores simulados → editar generateRealisticValue()
// - Cambiar distribución de quality → editar getRealisticQuality()
// - Cambiar cantidad de logs → modificar el parámetro en generateMockLogs(1000, 48)
// =============================================================================
import { LogEntry, Cliente, Nodo, DashboardStats } from '@/types';

// ── Clientes reales: PLCs OPC-UA del campo ──────────────────────────────────
/**
 * Lista de clientes OPC-UA simulados. Cada entrada corresponde a un PLC físico
 * del campo Costayaco. La estructura replica la tabla `clients` de la DB QNAP.
 *
 * Campos:
 * - id: Identificador único del cliente (replica clients.id)
 * - name: Nombre descriptivo del PLC/equipo
 * - server_url: URL del servidor OPC-UA (formato opc.tcp://IP:puerto)
 * - server_ip: Dirección IP del PLC en la red de campo
 *
 * Para agregar un nuevo cliente, añadir un objeto al array con un id único.
 */
export const MOCK_CLIENTS: Cliente[] = [
    { id: 1, name: 'PLC Separador V-301', server_url: 'opc.tcp://10.20.1.10:4840', server_ip: '10.20.1.10' },
    { id: 2, name: 'PLC Bomba Multifásica P-101', server_url: 'opc.tcp://10.20.1.11:4840', server_ip: '10.20.1.11' },
    { id: 3, name: 'PLC Tea de Gas FL-401', server_url: 'opc.tcp://10.20.1.12:4840', server_ip: '10.20.1.12' },
    { id: 4, name: 'PLC Tanque Almacenamiento TK-201', server_url: 'opc.tcp://10.20.1.13:4840', server_ip: '10.20.1.13' },
    { id: 5, name: 'PLC Generador Eléctrico GE-501', server_url: 'opc.tcp://10.20.1.14:4840', server_ip: '10.20.1.14' },
];

// ── Nodos OPC-UA realistas ──────────────────────────────────────────────────
/**
 * Lista de nodos OPC-UA simulados. Cada nodo representa una variable monitoreada
 * en un PLC (sensor, alarma, estado). Replica la tabla `node_ids` de la DB QNAP.
 *
 * Campos:
 * - id: Identificador único del nodo (replica node_ids.id)
 * - client_id: FK al cliente/PLC al que pertenece (replica node_ids.client_id)
 * - node_id: Identificador OPC-UA del nodo (ej: 'ns=2;s=V301.PT.001')
 * - tag_name: Nombre legible del tag (ej: 'PT-301A Presión entrada')
 * - tag_group: Agrupación funcional (Presión, Temperatura, Caudal, Alarmas, etc.)
 * - is_alarm: true si el nodo es una alarma digital (valor '0' o '1')
 * - client_name: Nombre del cliente (JOIN virtual, normalmente viene del JOIN SQL)
 *
 * Los tag_group se usan para filtros y gráficas en el dashboard.
 * Para agregar nodos, mantener la convención de nomenclatura ISA (PT, TT, LT, FT, etc.).
 */
export const MOCK_NODOS: Nodo[] = [
    // --- Separador V-301 ---
    { id: 1, client_id: 1, node_id: 'ns=2;s=V301.PT.001', tag_name: 'PT-301A Presión entrada', tag_group: 'Presión', is_alarm: false, client_name: 'PLC Separador V-301' },
    { id: 2, client_id: 1, node_id: 'ns=2;s=V301.PT.002', tag_name: 'PT-301B Presión gas salida', tag_group: 'Presión', is_alarm: false, client_name: 'PLC Separador V-301' },
    { id: 3, client_id: 1, node_id: 'ns=2;s=V301.LT.001', tag_name: 'LT-301 Nivel interfase', tag_group: 'Nivel', is_alarm: false, client_name: 'PLC Separador V-301' },
    { id: 4, client_id: 1, node_id: 'ns=2;s=V301.TT.001', tag_name: 'TT-301 Temperatura proceso', tag_group: 'Temperatura', is_alarm: false, client_name: 'PLC Separador V-301' },
    { id: 5, client_id: 1, node_id: 'ns=2;s=V301.PSH.001', tag_name: 'PSH-301 Alta presión separador', tag_group: 'Alarmas', is_alarm: true, client_name: 'PLC Separador V-301' },
    { id: 6, client_id: 1, node_id: 'ns=2;s=V301.LSH.001', tag_name: 'LSH-301 Alto nivel separador', tag_group: 'Alarmas', is_alarm: true, client_name: 'PLC Separador V-301' },

    // --- Bomba Multifásica P-101 ---
    { id: 7, client_id: 2, node_id: 'ns=2;s=P101.FT.001', tag_name: 'FT-101 Caudal descarga', tag_group: 'Caudal', is_alarm: false, client_name: 'PLC Bomba Multifásica P-101' },
    { id: 8, client_id: 2, node_id: 'ns=2;s=P101.PT.001', tag_name: 'PT-101A Presión succión', tag_group: 'Presión', is_alarm: false, client_name: 'PLC Bomba Multifásica P-101' },
    { id: 9, client_id: 2, node_id: 'ns=2;s=P101.PT.002', tag_name: 'PT-101B Presión descarga', tag_group: 'Presión', is_alarm: false, client_name: 'PLC Bomba Multifásica P-101' },
    { id: 10, client_id: 2, node_id: 'ns=2;s=P101.TT.001', tag_name: 'TT-101 Temp. cojinete motor', tag_group: 'Temperatura', is_alarm: false, client_name: 'PLC Bomba Multifásica P-101' },
    { id: 11, client_id: 2, node_id: 'ns=2;s=P101.VT.001', tag_name: 'VT-101 Vibración bomba', tag_group: 'Vibración', is_alarm: false, client_name: 'PLC Bomba Multifásica P-101' },
    { id: 12, client_id: 2, node_id: 'ns=2;s=P101.II.001', tag_name: 'II-101 Corriente motor', tag_group: 'Eléctrico', is_alarm: false, client_name: 'PLC Bomba Multifásica P-101' },
    { id: 13, client_id: 2, node_id: 'ns=2;s=P101.XS.RUN', tag_name: 'XS-101 Estado bomba ON/OFF', tag_group: 'Estado', is_alarm: false, client_name: 'PLC Bomba Multifásica P-101' },

    // --- Tea de Gas FL-401 ---
    { id: 14, client_id: 3, node_id: 'ns=2;s=FL401.FT.001', tag_name: 'FT-401 Caudal gas a tea', tag_group: 'Caudal', is_alarm: false, client_name: 'PLC Tea de Gas FL-401' },
    { id: 15, client_id: 3, node_id: 'ns=2;s=FL401.TT.001', tag_name: 'TT-401 Temp. llama piloto', tag_group: 'Temperatura', is_alarm: false, client_name: 'PLC Tea de Gas FL-401' },
    { id: 16, client_id: 3, node_id: 'ns=2;s=FL401.BSH.001', tag_name: 'BSH-401 Llama piloto activa', tag_group: 'Estado', is_alarm: true, client_name: 'PLC Tea de Gas FL-401' },

    // --- Tanque TK-201 ---
    { id: 17, client_id: 4, node_id: 'ns=2;s=TK201.LT.001', tag_name: 'LT-201 Nivel tanque crudo', tag_group: 'Nivel', is_alarm: false, client_name: 'PLC Tanque Almacenamiento TK-201' },
    { id: 18, client_id: 4, node_id: 'ns=2;s=TK201.TT.001', tag_name: 'TT-201 Temperatura crudo', tag_group: 'Temperatura', is_alarm: false, client_name: 'PLC Tanque Almacenamiento TK-201' },
    { id: 19, client_id: 4, node_id: 'ns=2;s=TK201.LSH.001', tag_name: 'LSH-201 Alto nivel tanque', tag_group: 'Alarmas', is_alarm: true, client_name: 'PLC Tanque Almacenamiento TK-201' },
    { id: 20, client_id: 4, node_id: 'ns=2;s=TK201.LSL.001', tag_name: 'LSL-201 Bajo nivel tanque', tag_group: 'Alarmas', is_alarm: true, client_name: 'PLC Tanque Almacenamiento TK-201' },

    // --- Generador GE-501 ---
    { id: 21, client_id: 5, node_id: 'ns=2;s=GE501.WI.001', tag_name: 'WI-501 Potencia activa', tag_group: 'Eléctrico', is_alarm: false, client_name: 'PLC Generador Eléctrico GE-501' },
    { id: 22, client_id: 5, node_id: 'ns=2;s=GE501.FI.001', tag_name: 'FI-501 Frecuencia', tag_group: 'Eléctrico', is_alarm: false, client_name: 'PLC Generador Eléctrico GE-501' },
    { id: 23, client_id: 5, node_id: 'ns=2;s=GE501.TT.001', tag_name: 'TT-501 Temp. gases escape', tag_group: 'Temperatura', is_alarm: false, client_name: 'PLC Generador Eléctrico GE-501' },
    { id: 24, client_id: 5, node_id: 'ns=2;s=GE501.RPM.001', tag_name: 'SI-501 RPM motor', tag_group: 'Velocidad', is_alarm: false, client_name: 'PLC Generador Eléctrico GE-501' },
    { id: 25, client_id: 5, node_id: 'ns=2;s=GE501.LT.001', tag_name: 'LT-501 Nivel aceite lubricante', tag_group: 'Nivel', is_alarm: false, client_name: 'PLC Generador Eléctrico GE-501' },
];

// ── Generación de valores realistas por tag_group ────────────────────────────
/**
 * Genera un valor numérico simulado realista según el tipo de tag (tag_group).
 * Los rangos están calibrados con valores reales de campo petrolero.
 *
 * @param nodo - Nodo OPC-UA para el cual generar un valor
 * @returns Valor como string (mismo formato que logs.value en la DB)
 *
 * Rangos por grupo:
 * - Presión: 35-220 PSI según tipo (succión/descarga/entrada/gas)
 * - Temperatura: 55-950°C según punto de medición
 * - Nivel: 30-90% según equipo
 * - Caudal: 500-2000 BPD o 0.5-3.0 MMSCFD
 * - Vibración: 1.5-6.0 mm/s RMS
 * - Eléctrico: corriente 120-180A, potencia 350-500kW, frecuencia 59.8-60.2Hz
 * - Velocidad: 1790-1810 RPM
 * - Estado: '1' (activo) o '0' (inactivo)
 * - Alarmas: '1' (activa, 5% probabilidad) o '0' (normal, 95%)
 *
 * Para ajustar rangos, modificar los valores min/max en cada rama del if.
 */
function generateRealisticValue(nodo: Nodo): string {
    const g = nodo.tag_group;
    const tag = nodo.tag_name;

    if (g === 'Presión') {
        // PSI con variación por tipo de punto
        if (tag.includes('succión')) return (45 + Math.random() * 15).toFixed(1);       // 45-60 PSI
        if (tag.includes('descarga')) return (180 + Math.random() * 40).toFixed(1);     // 180-220 PSI
        if (tag.includes('entrada')) return (120 + Math.random() * 30).toFixed(1);      // 120-150 PSI
        if (tag.includes('gas')) return (35 + Math.random() * 10).toFixed(1);           // 35-45 PSI
        return (80 + Math.random() * 60).toFixed(1);
    }
    if (g === 'Temperatura') {
        if (tag.includes('gases escape')) return (380 + Math.random() * 80).toFixed(1);  // 380-460 °C
        if (tag.includes('cojinete')) return (55 + Math.random() * 20).toFixed(1);       // 55-75 °C
        if (tag.includes('crudo')) return (85 + Math.random() * 15).toFixed(1);          // 85-100 °C
        if (tag.includes('proceso')) return (90 + Math.random() * 20).toFixed(1);        // 90-110 °C
        if (tag.includes('llama')) return (750 + Math.random() * 200).toFixed(0);        // 750-950 °C
        return (60 + Math.random() * 40).toFixed(1);
    }
    if (g === 'Nivel') {
        if (tag.includes('interfase')) return (40 + Math.random() * 20).toFixed(1);     // 40-60 %
        if (tag.includes('tanque')) return (30 + Math.random() * 50).toFixed(1);        // 30-80 %
        if (tag.includes('aceite')) return (70 + Math.random() * 20).toFixed(1);        // 70-90 %
        return (45 + Math.random() * 30).toFixed(1);
    }
    if (g === 'Caudal') {
        if (tag.includes('descarga')) return (1200 + Math.random() * 800).toFixed(0);   // 1200-2000 BPD
        if (tag.includes('gas')) return (0.5 + Math.random() * 2.5).toFixed(2);         // 0.5-3.0 MMSCFD
        return (500 + Math.random() * 1500).toFixed(0);
    }
    if (g === 'Vibración') {
        return (1.5 + Math.random() * 4.5).toFixed(2);   // 1.5-6.0 mm/s RMS
    }
    if (g === 'Eléctrico') {
        if (tag.includes('Corriente')) return (120 + Math.random() * 60).toFixed(1);    // 120-180 A
        if (tag.includes('Potencia')) return (350 + Math.random() * 150).toFixed(0);    // 350-500 kW
        if (tag.includes('Frecuencia')) return (59.8 + Math.random() * 0.4).toFixed(2); // 59.8-60.2 Hz
        return (220 + Math.random() * 30).toFixed(1);
    }
    if (g === 'Velocidad') {
        return (1790 + Math.random() * 20).toFixed(0);   // 1790-1810 RPM
    }
    if (g === 'Estado') {
        if (tag.includes('ON/OFF')) return Math.random() > 0.05 ? '1' : '0';            // 95% ON
        if (tag.includes('Llama')) return Math.random() > 0.02 ? '1' : '0';             // 98% activa
        return Math.random() > 0.1 ? '1' : '0';
    }
    if (g === 'Alarmas') {
        // Las alarmas se activan raramente
        return Math.random() > 0.95 ? '1' : '0';    // 5% activa
    }
    return (Math.random() * 100).toFixed(2);
}

// ── Distribución realista de quality ─────────────────────────────────────────
/**
 * Genera un valor de quality con distribución realista:
 * - 92% → 'Good' (lectura OPC-UA normal)
 * - 5%  → 'Uncertain' (dato parcial o fuera de rango)
 * - 3%  → 'Bad' (fallo de comunicación con el PLC)
 *
 * @returns 'Good' | 'Uncertain' | 'Bad'
 *
 * Para cambiar la distribución, ajustar los umbrales 0.97 y 0.92.
 */
function getRealisticQuality(): string {
    const r = Math.random();
    if (r > 0.97) return 'Bad';           // 3% — fallo de comunicación
    if (r > 0.92) return 'Uncertain';     // 5% — dato parcial o fuera de rango
    return 'Good';                         // 92% — lectura normal
}

// ── Generar logs mock con patrón temporal realista ───────────────────────────
/**
 * Genera un array de logs simulados con timestamps distribuidos de forma realista.
 * El 70% de los logs se concentra en horario laboral (6am-6pm) para simular
 * la actividad real de un campo petrolero.
 *
 * @param count - Número total de logs a generar
 * @param hoursAgo - Ventana temporal hacia atrás en horas (default: 48h)
 * @returns Array de LogEntry ordenados por timestamp descendente (más reciente primero)
 *
 * Cada log incluye: id, timestamp ISO, client, tag_group, tag_name, value, quality, is_alarm.
 * El array resultante se asigna a MOCK_LOGS y se usa en todas las rutas API en modo mock.
 */
function generateMockLogs(count: number, hoursAgo = 48): LogEntry[] {
    const logs: LogEntry[] = [];
    const now = Date.now();
    const startTime = now - hoursAgo * 60 * 60 * 1000;

    for (let i = 0; i < count; i++) {
        const nodo = MOCK_NODOS[Math.floor(Math.random() * MOCK_NODOS.length)];
        const client = MOCK_CLIENTS.find(c => c.id === nodo.client_id)!;

        // Distribución temporal: más logs en horario laboral (6am-6pm)
        let tsMs: number;
        if (Math.random() > 0.3) {
            // 70% en horario laboral
            const dayOffset = Math.floor(Math.random() * (hoursAgo / 24)) * 24 * 3600000;
            const hourOfDay = 6 + Math.random() * 12; // 6am - 6pm
            tsMs = startTime + dayOffset + hourOfDay * 3600000 + Math.random() * 3600000;
            if (tsMs > now) tsMs = now - Math.random() * 3600000;
        } else {
            tsMs = startTime + Math.random() * (now - startTime);
        }

        const quality = getRealisticQuality();
        const value = generateRealisticValue(nodo);

        logs.push({
            id: String(10000 + i),
            timestamp: new Date(tsMs).toISOString(),
            client: client.name,
            client_id: client.id,
            tag_group: nodo.tag_group,
            tag_name: nodo.tag_name,
            node_id: nodo.id,
            value,
            quality,
            is_alarm: nodo.is_alarm,
        });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Array pre-generado con 1000 logs mock que simula las últimas 48 horas de datos.
 * Se genera una sola vez al importar el módulo y se reutiliza en todas las rutas API.
 * Para cambiar la cantidad, modificar el primer parámetro (1000).
 * Para cambiar la ventana temporal, modificar el segundo parámetro (48 horas).
 */
export const MOCK_LOGS: LogEntry[] = generateMockLogs(1000, 48);

/**
 * Calcula las estadísticas del dashboard a partir de los logs mock.
 * Filtra solo las últimas 24 horas y calcula:
 * - totalLogs: cantidad total de registros en las últimas 24h
 * - totalByQuality: conteo agrupado por quality (Good, Bad, Uncertain)
 * - activeClients: número de clientes con actividad en las últimas 24h
 * - activeNodes: número de nodos con actividad en las últimas 24h
 * - logsByHour: distribución temporal, un punto por cada hora (para la gráfica de área)
 * - logsByTagGroup: conteo por grupo de tag con porcentaje (para el gráfico de barras)
 * - recentLogs: los 5 logs más recientes (para el widget de eventos recientes)
 *
 * @returns Objeto DashboardStats con todos los KPIs del dashboard
 *
 * Esta función se llama desde GET /api/stats/summary cuando USE_MOCK='true'.
 * Los datos cambian en cada invocación porque los timestamps son generados aleatoriamente.
 */
export function getMockStats(): DashboardStats {
    // Solo las últimas 24h para stats
    const last24h = MOCK_LOGS.filter(l =>
        Date.now() - new Date(l.timestamp).getTime() < 24 * 3600000
    );

    // Conteo por quality
    const qualityMap = new Map<string, number>();
    last24h.forEach(l => qualityMap.set(l.quality, (qualityMap.get(l.quality) || 0) + 1));
    const totalByQuality = Array.from(qualityMap.entries())
        .map(([quality, count]) => ({ quality, count }))
        .sort((a, b) => b.count - a.count);

    // Clientes y nodos activos
    const activeClientIds = new Set(last24h.map(l => l.client_id));
    const activeNodeIds = new Set(last24h.map(l => l.node_id));

    // Frecuencia por hora (últimas 24h)
    const hoursMap = new Map<string, number>();
    for (let h = 23; h >= 0; h--) {
        const d = new Date(Date.now() - h * 3600000);
        const key = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        hoursMap.set(key, 0);
    }
    last24h.forEach(log => {
        const d = new Date(log.timestamp);
        const key = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        // Agrupar por la hora más cercana
        const hoursAgo = Math.floor((Date.now() - d.getTime()) / 3600000);
        if (hoursAgo < 24) {
            const hourKey = new Date(Date.now() - hoursAgo * 3600000)
                .toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            hoursMap.set(hourKey, (hoursMap.get(hourKey) || 0) + 1);
        }
    });
    const logsByHour = Array.from(hoursMap.entries()).map(([hora, count]) => ({ hora, count }));

    // Por tag_group
    const groupMap = new Map<string, number>();
    last24h.forEach(l => groupMap.set(l.tag_group, (groupMap.get(l.tag_group) || 0) + 1));
    const logsByTagGroup = Array.from(groupMap.entries())
        .map(([tag_group, count]) => ({
            tag_group,
            count,
            percentage: last24h.length > 0 ? Math.round((count / last24h.length) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

    return {
        totalLogs: last24h.length,
        totalByQuality,
        activeClients: activeClientIds.size,
        activeNodes: activeNodeIds.size,
        logsByHour,
        logsByTagGroup,
        recentLogs: MOCK_LOGS.slice(0, 5),
    };
}
