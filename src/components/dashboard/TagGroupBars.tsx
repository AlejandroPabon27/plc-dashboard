// =============================================================================
// src/components/dashboard/TagGroupBars.tsx — Custom horizontal bars (no Recharts)
// Diseño limpio con barras de progreso y colores industriales
//
// PROPÓSITO: Gráfica de barras horizontales que muestra la distribución de logs
// por tag_group (ej: Presión, Temperatura, Flujo). No usa Recharts; las barras
// se renderizan con divs y estilos inline para mayor control visual.
// Muestra hasta 8 grupos con barra de progreso proporcional al máximo.
//
// USADO POR: Dashboard principal (src/app/page.tsx)
//
// PROPS:
// - stats: DashboardStats | null → datos del dashboard (usa stats.logsByTagGroup)
// - loading: boolean → muestra 5 barras skeleton con animación pulse
//
// DATOS:
// - Los colores se toman de TAG_GROUP_COLORS en lib/constants.ts (ciclando)
// - Cada barra muestra nombre, conteo absoluto y porcentaje
// - Footer con el total general de registros
//
// PARA MODIFICAR:
// - Cambiar cantidad máxima de barras → editar slice(0, 8)
// - Cambiar paleta de colores → editar TAG_GROUP_COLORS en constants.ts
// - Cambiar altura de las barras → editar h-2 en el progress bar div
// =============================================================================
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats } from '@/types';
import { TAG_GROUP_COLORS } from '@/lib/constants';

interface TagGroupBarsProps {
    stats: DashboardStats | null;
    loading?: boolean;
}

/**
 * Barras horizontales mostrando distribución de logs por tag_group.
 * Usa divs con estilos inline (no Recharts). Muestra hasta 8 grupos,
 * cada uno con nombre, conteo, porcentaje y barra proporcional al máximo.
 *
 * @param props.stats - Datos del dashboard; se usa stats.logsByTagGroup
 * @param props.loading - Muestra 5 barras skeleton si es true o stats es null
 */
export function TagGroupBars({ stats, loading }: TagGroupBarsProps) {
    if (loading || !stats) {
        return (
            <Card className="glass border-border/40">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Registros por Grupo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="space-y-1.5">
                                <div className="h-3 w-20 bg-muted/20 rounded animate-pulse" />
                                <div className="h-2 bg-muted/10 rounded-full animate-pulse" style={{ width: `${90 - i * 15}%` }} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const data = stats.logsByTagGroup.slice(0, 8);
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <Card className="glass border-border/40">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Registros por Grupo
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3.5">
                    {data.map((item, i) => {
                        const color = TAG_GROUP_COLORS[i % TAG_GROUP_COLORS.length];
                        const pct = (item.count / maxCount) * 100;

                        return (
                            <div key={item.tag_group} className="group">
                                {/* Label row */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ background: color }}
                                        />
                                        <span className="text-xs font-medium text-foreground">
                                            {item.tag_group}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground tabular-nums">
                                            {item.count.toLocaleString('es-CO')}
                                        </span>
                                        <span className="text-muted-foreground/60 w-10 text-right tabular-nums">
                                            {item.percentage}%
                                        </span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${pct}%`,
                                            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                    <span className="text-[11px] text-muted-foreground">Total registros</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                        {stats.totalLogs.toLocaleString('es-CO')}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
