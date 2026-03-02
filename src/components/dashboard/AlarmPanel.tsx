// =============================================================================
// src/components/dashboard/AlarmPanel.tsx — Panel de alarmas en tiempo real
// Muestra alarmas activas recibidas vía SSE con animaciones de urgencia
//
// PROPÓSITO: Componente visual que muestra las alarmas activas del sistema.
// Tiene dos estados visuales:
// 1. Sin alarmas → tarjeta verde con indicador "Sin alarmas activas"
// 2. Con alarmas → tarjeta roja pulsante con lista scrollable de alarmas
// Cada alarma muestra tag_name, tag_group, cliente y tiempo relativo.
//
// USADO POR: Dashboard principal (src/app/page.tsx)
//
// PROPS:
// - alarms: LogEntry[] → array de alarmas activas (is_alarm=true, value='1')
// - connected: boolean → indica si la conexión SSE está activa
// - onClear: () => void → callback para limpiar la lista de alarmas
//
// PARA MODIFICAR:
// - Cambiar límite de scroll → editar max-h-48 en el contenedor
// - Cambiar diseño de tarjeta vacía → editar el bloque if(alarms.length===0)
// - Agregar sonido de alarma → añadir useEffect con Audio API
// =============================================================================
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogEntry } from '@/types';
import { timeAgo } from '@/lib/utils';
import { AlertTriangle, Bell, BellOff, ShieldAlert, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlarmPanelProps {
    alarms: LogEntry[];
    connected: boolean;
    onClear: () => void;
}

/**
 * Panel visual de alarmas activas en el dashboard.
 * Si no hay alarmas, renderiza una tarjeta verde indicando que el sistema está limpio.
 * Si hay alarmas, renderiza una tarjeta roja con animación pulsante y lista scrollable.
 *
 * @param props.alarms - Array de LogEntry con alarmas activas (is_alarm=true, value='1')
 * @param props.connected - Indica si la conexión SSE está activa
 * @param props.onClear - Callback para vaciar la lista de alarmas
 */
export function AlarmPanel({ alarms, connected, onClear }: AlarmPanelProps) {
    if (alarms.length === 0) {
        return (
            <Card className="glass border-border/40 border-l-[3px] border-l-emerald-500">
                <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                            <BellOff className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Sin alarmas activas</p>
                            <p className="text-xs text-muted-foreground">
                                {connected
                                    ? 'Monitoreando en tiempo real…'
                                    : 'Reconectando al servidor…'}
                            </p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 live-indicator' : 'bg-amber-400'}`} />
                            <span className="text-[10px] text-muted-foreground uppercase">
                                {connected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass border-border/40 border-l-[3px] border-l-red-500 alarm-card">
            <CardHeader className="pb-2 flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center alarm-icon">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-semibold text-red-400">
                            {alarms.length} {alarms.length === 1 ? 'Alarma Activa' : 'Alarmas Activas'}
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground">
                            {connected ? 'Monitoreando en tiempo real' : 'Reconectando…'}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onClear}>
                    Limpiar
                </Button>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-48 overflow-y-auto">
                {alarms.map((alarm, i) => (
                    <div
                        key={`${alarm.id}-${i}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 
                                   hover:bg-red-500/10 transition-colors animate-fade-in-up"
                    >
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-red-300 truncate">
                                    {alarm.tag_name}
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-red-500/30 text-red-400">
                                    {alarm.tag_group}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {alarm.client}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[10px] text-red-400/70 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {timeAgo(alarm.timestamp)}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
