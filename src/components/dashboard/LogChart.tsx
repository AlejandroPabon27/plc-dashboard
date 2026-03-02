// =============================================================================
// src/components/dashboard/LogChart.tsx — Gráfica de área temporal con Recharts
// Adaptada al esquema QNAP (solo count por hora, sin desglose por status)
//
// PROPÓSITO: Gráfica de área que muestra la frecuencia de eventos por hora
// durante las últimas 24 horas. Usa Recharts con gradiente cyan.
//
// USADO POR: Dashboard principal (src/app/page.tsx)
//
// PROPS:
// - stats: DashboardStats | null → datos del dashboard (usa stats.logsByHour)
// - loading: boolean → muestra skeleton con animación pulse mientras carga
//
// COMPONENTES INTERNOS:
// - CustomTooltip → tooltip estilizado que muestra hora y conteo al hacer hover
//
// PARA MODIFICAR:
// - Cambiar color de la gráfica → editar stopColor en linearGradient y stroke en Area
// - Agregar más series → añadir más elementos <Area> con dataKey diferente
// - Cambiar altura → editar CHART_CONFIG.height en lib/constants.ts
// - Cambiar formato de labels del eje X → editar tick props en XAxis
// =============================================================================
'use client';

import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats } from '@/types';
import { CHART_CONFIG } from '@/lib/constants';

interface LogChartProps {
    stats: DashboardStats | null;
    loading?: boolean;
}

/**
 * Tooltip personalizado para la gráfica de área.
 * Muestra la hora y el conteo con un punto de color indicador.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
            <p className="font-medium text-foreground mb-2">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-medium" style={{ color: entry.color }}>{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

/**
 * Gráfica de área temporal que muestra frecuencia de eventos por hora (24h).
 * Usa Recharts AreaChart con gradiente cyan y tooltip personalizado.
 *
 * @param props.stats - Datos del dashboard; se usa stats.logsByHour para la gráfica
 * @param props.loading - Muestra placeholder animado si es true o stats es null
 */
export function LogChart({ stats, loading }: LogChartProps) {
    if (loading || !stats) {
        return (
            <Card className="glass border-border/40">
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Frecuencia de eventos (24h)</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[300px] animate-pulse bg-muted/20 rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass border-border/40">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Frecuencia de eventos — Últimas 24 horas
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
                    <AreaChart data={stats.logsByHour} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_CONFIG.gridColor} />
                        <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                            formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                        />
                        <Area
                            type="monotone" dataKey="count" name="Total Logs"
                            stroke="#06b6d4" strokeWidth={CHART_CONFIG.strokeWidth}
                            fill="url(#gradTotal)" dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
