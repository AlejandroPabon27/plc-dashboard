// =============================================================================
// src/lib/utils.ts — Utilidades generales (extiende el utils.ts de shadcn/ui)
// =============================================================================
//
// PROPÓSITO:
//   Funciones auxiliares reutilizables en toda la aplicación.
//   Incluye formateo de fechas, manejo de quality, exportación a Excel/CSV,
//   y helpers de UI.
//
// PARA MODIFICAR:
//   - Formato de fechas: editar formatTimestamp() — usa date-fns con locale 'es'
//   - Lógica de quality badges: editar getQualityBadgeClass() y getQualityLabel()
//   - Exportación Excel: editar exportLogsToExcel() — columnas y estilos
//   - Exportación CSV: editar exportLogsToCSV() — formato de columnas
//
// CONSUMIDO POR:
//   - Componentes: LogTable, LogFilterBar, RecentLogs, LogDetailModal, QualityDonut
//   - Páginas: page.tsx (dashboard), logs/page.tsx
//   - API: /api/logs/export (formatTimestamp, getQualityLabel)
//   - Hooks: useLogs (filtersToQueryString)
// =============================================================================
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogEntry } from '@/types';
import { QUALITY_CONFIG, DEFAULT_QUALITY_BADGE, NEW_ROW_HIGHLIGHT_MS } from './constants';

/**
 * Combina clases CSS de Tailwind de forma inteligente.
 * Resuelve conflictos entre clases (ej: 'p-4' y 'p-2' → se queda con la última).
 * Requerido por todos los componentes shadcn/ui.
 *
 * @param inputs - Lista de clases CSS, objetos condicionales o arrays.
 * @returns String con las clases combinadas y sin conflictos.
 *
 * Ejemplo de uso:
 *   cn('p-4 bg-red-500', isActive && 'bg-blue-500')  →  'p-4 bg-blue-500'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha ISO 8601 al formato legible 'dd/MM/yyyy HH:mm:ss' en español.
 * Se usa en la tabla de logs, modal de detalle y exportación de archivos.
 *
 * @param iso - Fecha en formato ISO 8601 (ej: '2026-03-02T14:30:00.000Z')
 * @returns Fecha formateada (ej: '02/03/2026 14:30:00') o el string original si falla.
 *
 * PARA CAMBIAR EL FORMATO: Modificar el patrón 'dd/MM/yyyy HH:mm:ss' usando
 * tokens de date-fns: https://date-fns.org/docs/format
 */
export function formatTimestamp(iso: string): string {
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm:ss', { locale: es });
  } catch {
    return iso;
  }
}

/**
 * Devuelve la distancia relativa entre una fecha y el momento actual.
 * Ejemplo de salida: "hace 5 minutos", "hace 2 horas".
 * Se usa en el header del dashboard y en las tarjetas de alarmas/logs recientes.
 *
 * @param iso - Fecha en formato ISO 8601.
 * @returns Texto relativo en español (ej: 'hace 3 minutos').
 */
export function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  } catch {
    return iso;
  }
}

/**
 * Determina si un timestamp es "reciente" comparándolo con el momento actual.
 * Se usa en LogTable para aplicar la clase CSS 'row-new' que resalta filas
 * recién llegadas con una animación sutil.
 *
 * @param iso         - Fecha ISO 8601 del registro.
 * @param thresholdMs - Umbral en milisegundos (default: NEW_ROW_HIGHLIGHT_MS = 30s).
 * @returns true si la diferencia entre ahora y el timestamp es menor al umbral.
 */
export function isRecent(iso: string, thresholdMs = NEW_ROW_HIGHLIGHT_MS): boolean {
  return Date.now() - new Date(iso).getTime() < thresholdMs;
}

/**
 * Obtiene las clases CSS de Tailwind para el <Badge> de quality.
 * Busca en QUALITY_CONFIG (constants.ts); si no existe, usa DEFAULT_QUALITY_BADGE.
 *
 * @param quality - Valor de quality del log (ej: 'Good', 'Bad', 'Uncertain').
 * @returns String con clases Tailwind para aplicar al componente Badge.
 */
export function getQualityBadgeClass(quality: string): string {
  return QUALITY_CONFIG[quality]?.badgeClass ?? DEFAULT_QUALITY_BADGE;
}

/**
 * Obtiene el texto legible para un valor de quality.
 * Si el quality no está definido en QUALITY_CONFIG, retorna el valor tal cual.
 *
 * @param quality - Valor crudo de quality desde la DB.
 * @returns Label legible (ej: 'Good', 'Bad').
 */
export function getQualityLabel(quality: string): string {
  return QUALITY_CONFIG[quality]?.label ?? quality;
}

/**
 * Intenta parsear un string como JSON.
 * Algunos valores de logs OPC-UA pueden ser objetos JSON serializados
 * (ej: '{"valor": 120.5, "unidad": "PSI"}').
 *
 * @param value - String del campo 'value' del log.
 * @returns Objeto con { parsed, isJson }:
 *   - Si es JSON válido: { parsed: objeto, isJson: true }
 *   - Si no es JSON: { parsed: string original, isJson: false }
 */
export function formatValue(value: string): { parsed: any; isJson: boolean } {
  try {
    const parsed = JSON.parse(value);
    return { parsed, isJson: true };
  } catch {
    return { parsed: value, isJson: false };
  }
}

/**
 * Trunca un texto si excede la longitud máxima, añadiendo '…' al final.
 * Se usa en la tabla de logs para evitar que valores muy largos rompan el layout.
 *
 * @param text   - Texto a truncar.
 * @param maxLen - Longitud máxima permitida (default: 60 caracteres).
 * @returns Texto truncado con '…' si excede maxLen, o el texto original.
 */
export function truncate(text: string, maxLen = 60): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

/**
 * Helper interno para descargar un Blob como archivo en el navegador.
 * Crea un enlace temporal <a> con download, simula un click y lo limpia.
 * Solo funciona en el lado del cliente (browser).
 *
 * @param blob     - Objeto Blob con el contenido del archivo.
 * @param filename - Nombre del archivo para la descarga.
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta un array de LogEntry a un archivo Excel (.xlsx) usando la librería ExcelJS.
 * Se importa dinámicamente para no incluirla en el bundle principal.
 * Solo funciona en el cliente (browser).
 *
 * PARA MODIFICAR COLUMNAS DEL EXCEL:
 *   Editar el array 'sheet.columns' con las columnas deseadas.
 *   Cada columna tiene: header (título), key (campo de LogEntry), width (ancho).
 *
 * @param logs     - Array de registros de log a exportar.
 * @param filename - Nombre del archivo (default: 'logs.xlsx').
 */
export async function exportLogsToExcel(logs: LogEntry[], filename = 'logs.xlsx') {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Logs');

  // Definir columnas con auto-width
  sheet.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Client', key: 'client', width: 25 },
    { header: 'Tag Group', key: 'tag_group', width: 18 },
    { header: 'Tag Name', key: 'tag_name', width: 22 },
    { header: 'Value', key: 'value', width: 30 },
    { header: 'Quality', key: 'quality', width: 14 },
  ];

  // Estilo para el header
  sheet.getRow(1).font = { bold: true };

  // Agregar filas
  logs.forEach(l => {
    sheet.addRow({
      id: l.id,
      timestamp: formatTimestamp(l.timestamp),
      client: l.client,
      tag_group: l.tag_group,
      tag_name: l.tag_name,
      value: l.value,
      quality: getQualityLabel(l.quality),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}

/**
 * Exporta un array de LogEntry a un archivo CSV con codificación UTF-8 + BOM.
 * El BOM (\uFEFF) asegura que Excel abra el archivo con la codificación correcta.
 * Solo funciona en el cliente (browser).
 *
 * PARA MODIFICAR COLUMNAS DEL CSV:
 *   Editar el array 'header' y la función map que genera cada fila.
 *
 * @param logs     - Array de registros de log a exportar.
 * @param filename - Nombre del archivo (default: 'logs.csv').
 */
export async function exportLogsToCSV(logs: LogEntry[], filename = 'logs.csv') {
  const header = ['ID', 'Timestamp', 'Client', 'Tag Group', 'Tag Name', 'Value', 'Quality'];
  const rows = logs.map(l =>
    [l.id, formatTimestamp(l.timestamp), l.client, l.tag_group, l.tag_name,
    `"${l.value.replace(/"/g, '""')}"`, getQualityLabel(l.quality)].join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  downloadBlob(
    new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
    filename
  );
}

/**
 * Convierte un objeto de filtros a un query string para la URL.
 * Ignora valores undefined, null, vacíos y arrays vacíos.
 * Se usa en el hook useLogs() para construir las URLs de la API y
 * sincronizar los filtros activos con la barra de dirección del navegador.
 *
 * @param filters - Objeto con los filtros activos (clave-valor).
 * @returns Query string sin el '?' inicial (ej: 'page=1&pageSize=10&sortBy=timestamp').
 */
export function filtersToQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  });
  return params.toString();
}
