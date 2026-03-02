// =============================================================================
// src/components/dashboard/RecentLogs.tsx — Lista de logs recientes con diseño
// premium industrial para el dashboard
//
// PROPÓSITO: Componente que muestra los últimos 5 logs registrados en formato
// de lista compacta. Cada entrada muestra tag_name, tag_group, cliente, valor
// formateado, badge de quality y tiempo relativo. Incluye enlace a /logs.
//
// USADO POR: Dashboard principal (src/app/page.tsx)
//
// PROPS:
// - logs: LogEntry[] → array de logs recientes (normalmente 5)
// - loading: boolean → muestra 5 filas skeleton con animación pulse
//
// DETALLES DE RENDERIZADO:
// - Si el valor es JSON con {valor, unidad}, muestra "valor unidad" formateado
// - Si es texto plano, muestra truncado a 30 caracteres
// - El indicador de quality es un punto de color (verde/amarillo/rojo/gris)
//
// PARA MODIFICAR:
// - Cambiar cantidad de skeletons → editar Array.from({ length: 5 })
// - Cambiar largo del truncado → editar truncate(log.value, 30)
// - Ocultar badge de tag_group en móvil → ya usa hidden sm:inline-flex
// =============================================================================
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogEntry } from '@/types';
import { formatTimestamp, getQualityBadgeClass, getQualityLabel, formatValue, truncate, timeAgo } from '@/lib/utils';
import { Clock, ArrowRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface RecentLogsProps {
    logs: LogEntry[];
    loading?: boolean;
}

/**
 * Lista de los logs más recientes en el dashboard.
 * Cada fila muestra tag_name, grupo, cliente, valor formateado, badge de quality y tiempo.
 * Incluye enlace "Ver todos" que navega a /logs.
 *
 * @param props.logs - Array de LogEntry recientes (normalmente 5)
 * @param props.loading - Muestra 5 filas skeleton si es true
 */
export function RecentLogs({ logs, loading }: RecentLogsProps) {
    if (loading) {
        return (
            <Card className="glass border-border/40">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Eventos Recientes
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/5 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-muted/30" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-40 bg-muted/20 rounded" />
                                <div className="h-2 w-24 bg-muted/10 rounded" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass border-border/40">
            <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Eventos Recientes
                </CardTitle>
                <Link href="/logs" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                    Ver todos <ArrowRight className="w-3 h-3" />
                </Link>
            </CardHeader>
            <CardContent className="space-y-1">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                        <Inbox className="w-8 h-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No hay eventos recientes</p>
                    </div>
                ) : logs.map((log) => {
                    const { parsed, isJson } = formatValue(log.value);
                    const displayVal = isJson && parsed?.valor !== undefined
                        ? `${parsed.valor} ${parsed.unidad || ''}`
                        : truncate(log.value, 30);

                    return (
                        <div
                            key={log.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/10 transition-colors group"
                        >
                            {/* Quality indicator dot */}
                            <div className={cn(
                                'w-2 h-2 rounded-full shrink-0',
                                log.quality === 'Good' ? 'bg-emerald-400' :
                                    log.quality === 'Bad' ? 'bg-red-400' :
                                        log.quality === 'Uncertain' ? 'bg-amber-400' : 'bg-slate-400'
                            )} />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-medium text-foreground truncate">{log.tag_name}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">
                                        {log.tag_group}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{log.client}</span>
                                    <span>·</span>
                                    <span className="font-mono">{displayVal}</span>
                                </div>
                            </div>

                            {/* Time */}
                            <div className="text-right shrink-0">
                                <Badge className={cn('text-[10px] mb-1', getQualityBadgeClass(log.quality))}>
                                    {getQualityLabel(log.quality)}
                                </Badge>
                                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 justify-end">
                                    <Clock className="w-2.5 h-2.5" />
                                    {timeAgo(log.timestamp)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
