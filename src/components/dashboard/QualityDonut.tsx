// =============================================================================
// src/components/dashboard/QualityDonut.tsx — Donut chart con leyenda custom
// Diseño limpio profesional con centro informativo
//
// PROPÓSITO: Gráfica de donut (pie chart con centro vacío) que muestra la
// distribución porcentual de logs por calidad (Good, Uncertain, Bad).
// El centro muestra el total absoluto de logs.
//
// USADO POR: Dashboard principal (src/app/page.tsx)
//
// PROPS:
// - stats: DashboardStats | null → datos del dashboard (usa stats.totalByQuality)
// - loading: boolean → muestra skeleton circular mientras carga
//
// COMPONENTES INTERNOS:
// - CustomTooltip → tooltip con nombre de quality, conteo y porcentaje
//
// CONSTANTES INTERNAS:
// - QUALITY_ORDER → orden fijo de visualización: Good → Uncertain → Bad
// - DEFAULT_COLOR → color gris para qualities no estándar
//
// PARA MODIFICAR:
// - Cambiar colores de cada quality → editar QUALITY_CONFIG en lib/constants.ts
// - Cambiar tamaño del donut → editar innerRadius/outerRadius en <Pie>
// - Agregar labels dentro de los segmentos → añadir prop label a <Pie>
// =============================================================================
'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats } from '@/types';
import { QUALITY_CONFIG } from '@/lib/constants';

interface QualityDonutProps {
    stats: DashboardStats | null;
    loading?: boolean;
}

const DEFAULT_COLOR = '#475569';

// Orden fijo: Good primero, luego Uncertain, luego Bad
const QUALITY_ORDER = ['Good', 'Uncertain', 'Bad'];

/**
 * Tooltip personalizado para la gráfica donut.
 * Muestra nombre de quality, conteo de registros y porcentaje.
 */
const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0];
    return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm z-50">
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.payload.fill }} />
                <span className="font-medium text-foreground">{entry.name}</span>
            </div>
            <p className="text-muted-foreground mt-1">
                {entry.value.toLocaleString('es-CO')} registros ({entry.payload.pct}%)
            </p>
        </div>
    );
};

/**
 * Gráfica donut que muestra distribución de logs por calidad (Good/Uncertain/Bad).
 * El centro muestra el total absoluto. La leyenda muestra el porcentaje de cada quality.
 * Las qualities no estándar se agregan al final con color gris.
 *
 * @param props.stats - Datos del dashboard; se usa stats.totalByQuality y stats.totalLogs
 * @param props.loading - Muestra skeleton circular si es true o stats es null
 */
export function QualityDonut({ stats, loading }: QualityDonutProps) {
    if (loading || !stats) {
        return (
            <Card className="glass border-border/40">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Distribución de Quality
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full border-8 border-muted/20 animate-pulse" />
                    </div>
                    <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-border/30">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-muted/30 animate-pulse" />
                                <div className="h-3 w-12 bg-muted/20 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Preparar datos con orden fijo
    const dataMap = new Map(stats.totalByQuality.map(q => [q.quality, q.count]));
    const data = QUALITY_ORDER
        .filter(q => dataMap.has(q))
        .map(quality => ({
            name: QUALITY_CONFIG[quality]?.label ?? quality,
            quality,
            value: dataMap.get(quality) || 0,
            fill: QUALITY_CONFIG[quality]?.chartColor ?? DEFAULT_COLOR,
            pct: stats.totalLogs > 0 ? ((dataMap.get(quality)! / stats.totalLogs) * 100).toFixed(1) : '0',
        }));

    // Agregar cualquier quality no estándar
    stats.totalByQuality.forEach(q => {
        if (!QUALITY_ORDER.includes(q.quality)) {
            data.push({
                name: q.quality,
                quality: q.quality,
                value: q.count,
                fill: DEFAULT_COLOR,
                pct: stats.totalLogs > 0 ? ((q.count / stats.totalLogs) * 100).toFixed(1) : '0',
            });
        }
    });

    return (
        <Card className="glass border-border/40">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Distribución de Quality
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Chart + center label container */}
                <div className="relative" style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={88}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                                animationBegin={0}
                                animationDuration={800}
                            >
                                {data.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center label — dentro del relative container */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-2xl font-bold tabular-nums text-foreground">
                                {stats.totalLogs.toLocaleString('es-CO')}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total</p>
                        </div>
                    </div>
                </div>

                {/* Custom legend — limpio y ordenado */}
                <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-border/30">
                    {data.map(entry => (
                        <div key={entry.quality} className="flex items-center gap-2">
                            <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: entry.fill }}
                            />
                            <div className="text-xs">
                                <span className="text-muted-foreground">{entry.name}</span>
                                <span className="text-foreground font-semibold ml-1.5">{entry.pct}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
