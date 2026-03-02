// =============================================================================
// src/app/logs/page.tsx — Vista de logs con filtros y paginación
// Diseño profesional industrial
//
// PROPÓSITO: Página /logs que muestra la tabla completa de logs con filtros,
// paginación server-side y ordenamiento. Incluye funcionalidad de exportación
// a Excel (.xlsx) y CSV.
//
// LAYOUT DE LA PÁGINA:
// └─ AppShell
//    ├─ Header (título + conteo de registros + botón exportar + botón actualizar)
//    ├─ Card con LogFilterBar (filtros de búsqueda, fecha, cliente, grupo, quality)
//    └─ Card con LogTable (tabla con sort y paginación server-side)
//
// HOOKS UTILIZADOS:
// - useLogs({ initialPageSize: 15 }) → maneja todo el estado de filtros,
//   paginación, ordenamiento y fetch de datos desde /api/logs
//
// EXPORTACIÓN:
// - handleExport('excel') → llama exportLogsToExcel() con los datos visibles
// - handleExport('csv') → llama exportLogsToCSV() con los datos visibles
// NOTA: Solo exporta la página actual. Para exportación masiva se usa
//       POST /api/logs/export (no implementado en esta página aún).
//
// PARA MODIFICAR:
// - Cambiar tamaño de página inicial → editar initialPageSize
// - Agregar exportación masiva → llamar a /api/logs/export con filtros actuales
// - Quitar borde de la tabla → editar className de la Card contenedora
// =============================================================================
'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { LogTable } from '@/components/logs/LogTable';
import { LogFilterBar } from '@/components/logs/LogFilterBar';
import { useLogs } from '@/hooks/useLogs';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportLogsToExcel, exportLogsToCSV } from '@/lib/utils';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

/**
 * Página de visualización y búsqueda de logs.
 * Toda la lógica de filtros, paginación y sort la maneja el hook useLogs.
 * La exportación se hace sobre los datos de la página actual visible.
 */
export default function LogsPage() {
    const {
        data, loading, filters, updateFilters, clearFilters,
        page, setPage, pageSize, setPageSize, sortBy, sortOrder, handleSort, refresh,
    } = useLogs({ initialPageSize: 15 });

    const handleExport = async (format: 'excel' | 'csv') => {
        if (!data?.data.length) return;
        if (format === 'excel') await exportLogsToExcel(data.data);
        else await exportLogsToCSV(data.data);
    };

    return (
        <AppShell>
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Registro de Eventos</h1>
                        <p className="text-xs text-muted-foreground">
                            {data?.total !== undefined
                                ? `${data.total.toLocaleString('es-CO')} registros encontrados`
                                : 'Cargando…'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-2 border-border/60"
                                disabled={!data?.data.length}
                            >
                                <Download className="w-3.5 h-3.5" />
                                Exportar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport('excel')}>
                                📊 Exportar a Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('csv')}>
                                📄 Exportar a CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 border-border/60 hover:border-primary/40 transition-colors"
                        onClick={refresh}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* ── Filtros ── */}
            <Card className="glass border-border/40">
                <CardContent className="p-4">
                    <LogFilterBar
                        filters={filters}
                        onUpdateFilters={updateFilters}
                        onClearFilters={clearFilters}
                    />
                </CardContent>
            </Card>

            {/* ── Tabla ── */}
            <Card className="glass border-border/40">
                <CardContent className="p-0 sm:p-4">
                    <LogTable
                        data={data}
                        loading={loading}
                        page={page}
                        pageSize={pageSize}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        onSort={handleSort}
                    />
                </CardContent>
            </Card>
        </AppShell>
    );
}
