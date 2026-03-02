// =============================================================================
// src/lib/constants.ts — Constantes centralizadas de la aplicación
// =============================================================================
//
// PROPÓSITO:
//   Archivo central de configuración. Todas las constantes que controlan el
//   comportamiento de la aplicación se definen aquí para evitar valores
//   hardcodeados dispersos en el código.
//
// PARA MODIFICAR:
//   - Cambiar tamaños de página: editar PAGE_SIZE_OPTIONS y DEFAULT_PAGE_SIZE
//   - Cambiar colores/etiquetas de quality: editar QUALITY_CONFIG
//   - Cambiar intervalos de polling/caché: editar POLLING_INTERVAL_MS
//   - Cambiar estilos de la gráfica: editar CHART_CONFIG
//
// CONSUMIDO POR:
//   - Componentes UI (StatsCards, QualityDonut, LogChart, TagGroupBars, LogFilterBar, LogTable)
//   - Hooks (useDashboardStats, useLogs)
//   - API routes (/api/logs)
//   - Utilidades (utils.ts, db.ts)
// =============================================================================

/**
 * Opciones disponibles en el selector de "Filas por página" de la tabla de logs.
 * Se renderizan en el componente LogTable como opciones de un <Select>.
 * Para agregar más opciones, simplemente añadir valores al array.
 */
export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

/**
 * Tamaño de página predeterminado al cargar la vista de logs.
 * Debe ser uno de los valores incluidos en PAGE_SIZE_OPTIONS.
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Configuración visual y de etiquetas para cada valor de "quality" conocido.
 * Los logs OPC-UA reportan la calidad del dato: Good, Bad o Uncertain.
 *
 * Cada entrada define:
 *   - label:      Texto que se muestra en badges y tooltips
 *   - badgeClass: Clases Tailwind para el <Badge> en la tabla y filtros
 *   - dotClass:   Clase de color para el indicador circular (punto) de quality
 *   - chartColor: Color hexadecimal usado en la gráfica QualityDonut (PieChart)
 *
 * PARA AGREGAR UN NUEVO QUALITY:
 *   Añadir una nueva entrada con la clave exacta que devuelve la DB.
 *   Ejemplo: 'GoodLocalOverride': { label: 'Override', badgeClass: '...', ... }
 */
export const QUALITY_CONFIG: Record<string, {
    label: string;
    badgeClass: string;
    dotClass: string;
    chartColor: string;
}> = {
    Good: {
        label: 'Good',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        dotClass: 'bg-emerald-400',
        chartColor: '#10b981',
    },
    Bad: {
        label: 'Bad',
        badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
        dotClass: 'bg-red-400',
        chartColor: '#ef4444',
    },
    Uncertain: {
        label: 'Uncertain',
        badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        dotClass: 'bg-amber-400',
        chartColor: '#f59e0b',
    },
};

/**
 * Clase CSS por defecto para valores de quality no definidos en QUALITY_CONFIG.
 * Se aplica cuando la DB devuelve un quality desconocido (ej: 'GoodLocalOverride').
 */
export const DEFAULT_QUALITY_BADGE = 'bg-slate-500/15 text-slate-400 border border-slate-500/30';

/**
 * Paleta de colores para las barras del componente TagGroupBars.
 * Cada tag_group recibe un color de esta lista de forma cíclica (módulo).
 * Para cambiar colores de los grupos, modificar los valores hexadecimales aquí.
 */
export const TAG_GROUP_COLORS = [
    '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981',
    '#ef4444', '#ec4899', '#6366f1', '#14b8a6',
    '#f97316', '#84cc16',
];

/**
 * Timeout máximo en milisegundos para queries a PostgreSQL.
 * Valor alto (60s) porque las tablas pueden tener millones de filas.
 * Se usa como valor por defecto en la función query() de db.ts.
 */
export const QUERY_TIMEOUT_MS = 60000;

/**
 * Intervalo de polling automático en milisegundos para refrescar las
 * estadísticas del dashboard (hook useDashboardStats).
 * 15s es un balance entre frescura de datos y carga en la DB.
 * Reducir este valor aumenta la frecuencia de consultas a la BD.
 */
export const POLLING_INTERVAL_MS = 15000;

/**
 * Tiempo en milisegundos durante el cual una fila se considera "nueva"
 * y se resalta visualmente con la clase CSS 'row-new' en la tabla.
 * Usado por la función isRecent() en utils.ts.
 */
export const NEW_ROW_HIGHLIGHT_MS = 30000;

/**
 * Configuración visual de la gráfica de área temporal (LogChart).
 * Controla dimensiones, opacidad, ancho de trazo y estilo del tooltip.
 * Para cambiar la apariencia de la gráfica, modificar estos valores.
 */
export const CHART_CONFIG = {
    height: 300,
    areaOpacity: 0.3,
    strokeWidth: 2,
    dotRadius: 3,
    gridColor: 'rgba(148,163,184,0.1)',
    tooltipStyle: { background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' },
} as const;

/**
 * Clave de localStorage donde se persisten los filtros de la tabla de logs.
 * El hook useLogs() guarda y restaura los filtros con esta clave para que
 * el usuario no pierda su selección al navegar entre páginas.
 */
export const FILTERS_STORAGE_KEY = 'plc_dashboard_filters';
