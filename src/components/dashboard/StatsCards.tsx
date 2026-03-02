// =============================================================================
// src/components/dashboard/StatsCards.tsx — KPI stat cards for dashboard
// Professional industrial design with animated counters
//
// PROPÓSITO: Muestra 4 tarjetas KPI principales en el dashboard:
// 1. Total Registros → conteo total de las últimas 24h
// 2. Quality Good → conteo y porcentaje de logs con quality "Good"
// 3. Clientes Activos → número de clientes y nodos monitoreados
// 4. Alertas → suma de Bad + Uncertain, cambia icono/color si hay Bad
//
// USADO POR: Dashboard principal (src/app/page.tsx)
//
// PROPS:
// - stats: DashboardStats | null → datos del dashboard (usa totalLogs, totalByQuality, etc.)
// - loading: boolean → muestra 4 SkeletonCard mientras carga
//
// COMPONENTES INTERNOS:
// - SkeletonCard → tarjeta con animación pulse para el estado de carga
//
// PARA MODIFICAR:
// - Agregar/quitar KPIs → editar el array cards[]
// - Cambiar colores → editar las propiedades iconBg, iconColor, accent
// - Agregar animación de conteo → implementar hook de counter animation
// =============================================================================
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from '@/types';
import {
    Activity, Server, AlertTriangle,
    CheckCircle2
} from 'lucide-react';

interface StatsCardsProps {
    stats: DashboardStats | null;
    loading?: boolean;
}

/** Tarjeta skeleton con animación pulse para el estado de carga. */
function SkeletonCard() {
    return (
        <Card className="glass border-border/40 overflow-hidden">
            <CardContent className="p-5">
                <div className="space-y-3">
                    <div className="h-3 w-20 bg-muted/30 rounded animate-pulse" />
                    <div className="h-8 w-24 bg-muted/20 rounded animate-pulse" />
                    <div className="h-2 w-32 bg-muted/10 rounded animate-pulse" />
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Grid de 4 tarjetas KPI: Total Registros, Quality Good, Clientes Activos, Alertas.
 * Cada tarjeta tiene icono, valor numérico, subtítulo y borde lateral de color.
 * Si no hay datos de "Bad", la tarjeta de Alertas se muestra en verde.
 *
 * @param props.stats - Datos del dashboard con totalLogs, totalByQuality, activeClients/Nodes
 * @param props.loading - Muestra 4 SkeletonCard si es true o stats es null
 */
export function StatsCards({ stats, loading }: StatsCardsProps) {
    if (loading || !stats) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
        );
    }

    const goodCount = stats.totalByQuality.find(q => q.quality === 'Good')?.count ?? 0;
    const badCount = stats.totalByQuality.find(q => q.quality === 'Bad')?.count ?? 0;
    const uncertainCount = stats.totalByQuality.find(q => q.quality === 'Uncertain')?.count ?? 0;
    const goodPct = stats.totalLogs > 0 ? ((goodCount / stats.totalLogs) * 100).toFixed(1) : '0';

    const cards = [
        {
            label: 'Total Registros',
            value: stats.totalLogs.toLocaleString('es-CO'),
            subtitle: 'Últimas 24 horas',
            icon: Activity,
            iconBg: 'bg-cyan-500/15',
            iconColor: 'text-cyan-400',
            accent: 'border-l-cyan-500',
        },
        {
            label: 'Quality Good',
            value: goodCount.toLocaleString('es-CO'),
            subtitle: `${goodPct}% del total`,
            icon: CheckCircle2,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            accent: 'border-l-emerald-500',
        },
        {
            label: 'Clientes Activos',
            value: `${stats.activeClients}`,
            subtitle: `${stats.activeNodes} nodos monitoreados`,
            icon: Server,
            iconBg: 'bg-violet-500/15',
            iconColor: 'text-violet-400',
            accent: 'border-l-violet-500',
        },
        {
            label: 'Alertas',
            value: (badCount + uncertainCount).toLocaleString('es-CO'),
            subtitle: `${badCount} Bad · ${uncertainCount} Uncertain`,
            icon: badCount > 0 ? AlertTriangle : CheckCircle2,
            iconBg: badCount > 0 ? 'bg-amber-500/15' : 'bg-emerald-500/15',
            iconColor: badCount > 0 ? 'text-amber-400' : 'text-emerald-400',
            accent: badCount > 0 ? 'border-l-amber-500' : 'border-l-emerald-500',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <Card
                    key={card.label}
                    className={`glass border-border/40 border-l-[3px] ${card.accent} overflow-hidden
                       hover:border-border/60 transition-all duration-200 group`}
                >
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {card.label}
                                </p>
                                <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                                    {card.value}
                                </p>
                                <p className="text-xs text-muted-foreground/70">{card.subtitle}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center
                                group-hover:scale-110 transition-transform duration-200`}>
                                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
