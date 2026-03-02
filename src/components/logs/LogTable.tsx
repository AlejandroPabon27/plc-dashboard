// =============================================================================
// src/components/logs/LogTable.tsx — Tabla con TanStack Table v8
// Columnas mapeadas a la DB QNAP (clients, node_ids, logs)
//
// PROPÓSITO: Tabla principal de visualización de logs con:
// - Columnas: Timestamp, Cliente, Tag Group, Tag Name, Valor, Quality, Acciones
// - Ordenamiento server-side (clic en headers sortables)
// - Paginación server-side con selector de tamaño de página
// - Filas nuevas (< 30s) resaltadas con borde izquierdo cyan
// - Fila expandible al hacer clic para ver el valor completo
// - Botón "Ver" que abre LogDetailModal con todos los campos
//
// USADO POR: Página /logs (src/app/logs/page.tsx)
//
// PROPS:
// - data: PaginatedResponse<LogEntry> | null → página actual de datos
// - loading: boolean → muestra tabla skeleton
// - page, pageSize, sortBy, sortOrder → estado actual de paginación y sort
// - onPageChange, onPageSizeChange, onSort → callbacks para el hook useLogs
//
// COMPONENTES INTERNOS:
// - SortIcon → icono de flecha que indica dirección de sort activo
// - LogDetailModal → modal de detalle abierto por el botón "Ver"
//
// PARA MODIFICAR:
// - Agregar/quitar columnas → editar el array columns[]
// - Cambiar formato de timestamp → editar formatTimestamp en cell renderer
// - Agregar acciones por fila → añadir botones en la columna 'actions'
// - Cambiar tamaños de página → editar PAGE_SIZE_OPTIONS en constants.ts
// =============================================================================
'use client';

import React, { useState } from 'react';
import {
    useReactTable, getCoreRowModel, flexRender,
    ColumnDef
} from '@tanstack/react-table';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { LogEntry, PaginatedResponse } from '@/types';
import { PAGE_SIZE_OPTIONS } from '@/lib/constants';
import { formatTimestamp, getQualityBadgeClass, getQualityLabel, truncate, isRecent, formatValue } from '@/lib/utils';
import { LogDetailModal } from './LogDetailModal';
import { cn } from '@/lib/utils';

interface LogTableProps {
    data: PaginatedResponse<LogEntry> | null;
    loading: boolean;
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    onSort: (column: string) => void;
}

/** Icono de flecha que indica la dirección de sort en el header de la tabla. */
function SortIcon({ column, currentSort, currentOrder }: { column: string; currentSort: string; currentOrder: 'asc' | 'desc' }) {
    if (currentSort !== column) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return currentOrder === 'asc'
        ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
        : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
}

/**
 * Tabla principal de logs con ordenamiento y paginación server-side.
 * Usa TanStack Table v8 para la estructura de columnas.
 * Las filas nuevas (< 30s) se resaltan con borde izquierdo cyan.
 * Al hacer clic en una fila se expande para mostrar el valor completo.
 *
 * @param props.data - Página actual de datos (PaginatedResponse<LogEntry>)
 * @param props.loading - Muestra tabla skeleton si es true
 * @param props.page - Número de página actual (1-based)
 * @param props.pageSize - Filas por página
 * @param props.sortBy - Columna de sort activa
 * @param props.sortOrder - Dirección de sort ('asc' | 'desc')
 * @param props.onPageChange - Callback al cambiar de página
 * @param props.onPageSizeChange - Callback al cambiar tamaño de página
 * @param props.onSort - Callback al hacer clic en header sortable
 */
export function LogTable({ data, loading, page, pageSize, sortBy, sortOrder, onPageChange, onPageSizeChange, onSort }: LogTableProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

    const columns: ColumnDef<LogEntry>[] = [
        {
            id: 'timestamp',
            header: 'Timestamp',
            accessorKey: 'timestamp',
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(row.original.timestamp)}
                </span>
            ),
        },
        {
            id: 'client',
            header: 'Cliente',
            accessorKey: 'client',
            cell: ({ getValue }) => <span className="text-sm font-medium">{truncate(String(getValue()), 25)}</span>,
        },
        {
            id: 'tag_group',
            header: 'Grupo / Tag',
            accessorKey: 'tag_group',
            cell: ({ row }) => (
                <div className="text-sm">
                    <p className="font-medium">{row.original.tag_group || 'Sin grupo'}</p>
                    <p className="text-xs text-muted-foreground">{truncate(row.original.tag_name, 20)}</p>
                </div>
            ),
        },
        {
            id: 'value',
            header: 'Valor',
            accessorKey: 'value',
            cell: ({ row }) => {
                const { parsed, isJson } = formatValue(row.original.value);
                const display = isJson
                    ? (parsed?.valor !== undefined ? `${parsed.valor} ${parsed.unidad || ''}` : truncate(JSON.stringify(parsed), 40))
                    : truncate(row.original.value, 40);
                return <span className="text-sm font-mono text-foreground/80">{display}</span>;
            },
        },
        {
            id: 'quality',
            header: 'Quality',
            accessorKey: 'quality',
            cell: ({ getValue }) => (
                <Badge className={cn('text-xs', getQualityBadgeClass(String(getValue())))}>
                    {getQualityLabel(String(getValue()))}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setSelectedLog(row.original); }}
                    aria-label="Ver detalle"
                >
                    <Eye className="w-3.5 h-3.5" />
                </Button>
            ),
        },
    ];

    const table = useReactTable({
        data: data?.data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
        manualPagination: true,
    });

    const totalPages = data?.totalPages || 1;
    const total = data?.total || 0;

    return (
        <div className="space-y-3">
            {/* Tabla */}
            <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-border">
                            {table.getHeaderGroups().flatMap(hg => hg.headers).map(header => {
                                const sortableColumns = ['timestamp', 'client', 'tag_group', 'quality'];
                                const isSortable = sortableColumns.includes(header.id);
                                return (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            'text-xs font-medium text-muted-foreground uppercase tracking-wider py-3',
                                            isSortable && 'cursor-pointer select-none hover:text-foreground transition-colors'
                                        )}
                                        onClick={() => isSortable && onSort(header.id)}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {isSortable && <SortIcon column={header.id} currentSort={sortBy} currentOrder={sortOrder} />}
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i} className="border-border">
                                    {columns.map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-muted/30 rounded animate-pulse" style={{ width: `${60 + ((i * 7 + j * 13) % 40)}%` }} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : !data?.data.length ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground text-sm">
                                    No se encontraron registros con los filtros aplicados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => {
                                const recently = isRecent(row.original.timestamp);
                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            className={cn(
                                                'border-border cursor-pointer group transition-colors',
                                                recently && 'row-new',
                                                expandedRow === row.id && 'bg-muted/20'
                                            )}
                                            onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id} className="py-3">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        {/* Fila expandida */}
                                        {expandedRow === row.id && (
                                            <TableRow className="border-border bg-muted/10">
                                                <TableCell colSpan={columns.length} className="py-3 px-6">
                                                    <div className="text-xs text-muted-foreground mb-1">Valor completo:</div>
                                                    <pre className="text-xs font-mono bg-background/40 border border-border rounded p-3 overflow-auto max-h-40">
                                                        {(() => { const { parsed, isJson } = formatValue(row.original.value); return isJson ? JSON.stringify(parsed, null, 2) : row.original.value; })()}
                                                    </pre>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Filas por página:</span>
                    <Select value={String(pageSize)} onValueChange={v => onPageSizeChange(Number(v))}>
                        <SelectTrigger className="w-16 h-7 text-xs" id="page-size-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZE_OPTIONS.map(s => (
                                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-xs">{total.toLocaleString('es-CO')} total</span>
                </div>

                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-2">
                        Página {page} de {totalPages}
                    </span>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Página siguiente">
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <LogDetailModal log={selectedLog} open={!!selectedLog} onClose={() => setSelectedLog(null)} />
        </div>
    );
}
