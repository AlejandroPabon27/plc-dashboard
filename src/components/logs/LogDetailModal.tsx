// =============================================================================
// src/components/logs/LogDetailModal.tsx — Modal de detalle de log
// Campos mapeados a la DB QNAP
//
// PROPÓSITO: Diálogo modal que muestra todos los campos de un registro de log
// seleccionado. Se abre al hacer clic en el botón "Ver" de la tabla de logs.
// Muestra: timestamp, quality (badge), cliente, tag_group, tag_name (con node_id),
// y el valor completo. Si el valor es JSON con {valor, unidad, timestamp},
// lo muestra desglosado en campos individuales.
//
// USADO POR: LogTable (src/components/logs/LogTable.tsx)
//
// PROPS:
// - log: LogEntry | null → el registro a mostrar (null = no renderiza nada)
// - open: boolean → controla la visibilidad del diálogo
// - onClose: () => void → callback para cerrar el modal
//
// PARA MODIFICAR:
// - Agregar más campos → añadir <div> al grid de metadata
// - Cambiar ancho máximo → editar max-w-2xl en DialogContent
// - Agregar acciones (ej: exportar, copiar) → añadir botones en el DialogContent
// =============================================================================
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogEntry } from '@/types';
import { formatTimestamp, formatValue, getQualityBadgeClass, getQualityLabel } from '@/lib/utils';
import { Calendar, Cpu, Network, Tag, Database } from 'lucide-react';

interface LogDetailModalProps {
    log: LogEntry | null;
    open: boolean;
    onClose: () => void;
}

/**
 * Modal de detalle que muestra todos los campos de un registro de log.
 * Si el valor es JSON con {valor, unidad, timestamp}, lo desglosa en campos.
 * Se abre desde el botón "Ver" en LogTable.
 *
 * @param props.log - Registro a mostrar (null = no renderiza nada)
 * @param props.open - Controla la visibilidad del diálogo
 * @param props.onClose - Callback para cerrar el modal
 */
export function LogDetailModal({ log, open, onClose }: LogDetailModalProps) {
    if (!log) return null;
    const { parsed, isJson } = formatValue(log.value);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Database className="w-4 h-4 text-primary" />
                        Detalle del Registro #{log.id}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Timestamp
                            </p>
                            <p className="font-mono text-foreground">{formatTimestamp(log.timestamp)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Quality</p>
                            <Badge className={getQualityBadgeClass(log.quality)}>{getQualityLabel(log.quality)}</Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Network className="w-3 h-3" /> Cliente
                            </p>
                            <p className="font-medium">{log.client}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Grupo de Tag
                            </p>
                            <p className="font-medium">{log.tag_group || 'Sin grupo'}</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> Tag Name (Node)
                            </p>
                            <p className="font-medium">{log.tag_name} <span className="text-muted-foreground text-xs">(ID: {log.node_id})</span></p>
                        </div>
                    </div>

                    <Separator />

                    {/* Valor */}
                    <div>
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Valor registrado</p>
                        {isJson ? (
                            <pre className="bg-muted/30 border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-60 text-foreground/90">
                                {JSON.stringify(parsed, null, 2)}
                            </pre>
                        ) : (
                            <p className="bg-muted/30 border border-border rounded-lg p-4 text-sm font-mono text-foreground/90">
                                {log.value}
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
