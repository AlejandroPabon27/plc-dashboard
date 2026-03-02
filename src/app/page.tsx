// =============================================================================
// src/app/page.tsx — Dashboard principal con SSE en tiempo real
// Diseño industrial profesional — alertas, alarmas y KPIs
//
// PROPÓSITO: Página principal de la aplicación (ruta /). Muestra KPIs,
// gráficas y alarmas en tiempo real usando dos hooks:
// - useDashboardStats: polling cada 15s a /api/stats/summary para KPIs
// - useRealtimeLogs: conexión SSE a /api/logs/stream para logs y alarmas live
//
// LAYOUT DE LA PÁGINA:
// └─ AppShell (con errorCount = número de alarmas activas)
//    ├─ Header de página (título + indicador SSE + botón actualizar)
//    ├─ AlarmPanel (alarmas activas, siempre visible)
//    ├─ StatsCards (4 KPIs en grid)
//    ├─ LogChart (gráfica de área temporal 24h)
//    └─ Grid 3 columnas:
//       ├─ QualityDonut (distribución Good/Uncertain/Bad)
//       ├─ TagGroupBars (barras por tag_group)
//       └─ RecentLogs (5 últimos logs)
//
// FLUJO DE ALARMAS:
// - Cuando llega un evento 'alarm' por SSE, handleAlarm muestra un toast rojo
// - activeAlarms se pasa a AlarmPanel para visualización persistente
//
// PARA MODIFICAR:
// - Agregar/quitar componentes → editar el return JSX
// - Cambiar layout del grid → editar grid-cols-1 lg:grid-cols-3
// - Cambiar callback de alarma → editar handleAlarm
// - Deshabilitar SSE → cambiar enabled: false en useRealtimeLogs
// =============================================================================
'use client';

import React, { useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { LogChart } from '@/components/dashboard/LogChart';
import { QualityDonut } from '@/components/dashboard/QualityDonut';
import { TagGroupBars } from '@/components/dashboard/TagGroupBars';
import { RecentLogs } from '@/components/dashboard/RecentLogs';
import { AlarmPanel } from '@/components/dashboard/AlarmPanel';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRealtimeLogs } from '@/hooks/useRealtimeLogs';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { LogEntry } from '@/types';

/**
 * Página principal del dashboard. Combina datos de polling (stats)
 * con datos en tiempo real de SSE (logs, alarmas). Cuando llega una alarma,
 * muestra un toast de error persistente. Los logs en tiempo real tienen
 * prioridad sobre los de stats para la lista de "Eventos Recientes".
 */
export default function DashboardPage() {
  const { stats, loading, lastUpdated, refresh } = useDashboardStats();

  // Callback cuando llega una alarma — mostrar toast
  const handleAlarm = useCallback((alarms: LogEntry[]) => {
    alarms.forEach(alarm => {
      toast.error(`⚠️ ALARMA: ${alarm.tag_name}`, {
        description: `${alarm.client} — ${alarm.tag_group}`,
        duration: 10000,
      });
    });
  }, []);

  const {
    recentLogs: realtimeLogs,
    activeAlarms,
    connected,
    newLogCount,
    clearAlarms,
  } = useRealtimeLogs({
    enabled: true,
    onAlarm: handleAlarm,
  });

  // Usar logs en tiempo real si hay, o los de stats como fallback
  const displayLogs = realtimeLogs.length > 0
    ? realtimeLogs.slice(0, 5)
    : (stats?.recentLogs ?? []);

  return (
    <AppShell errorCount={activeAlarms.length}>
      {/* ── Header de página ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Panel de Control</h1>
            <p className="text-xs text-muted-foreground">
              {lastUpdated
                ? `Stats actualizados ${timeAgo(lastUpdated.toISOString())}`
                : 'Conectando…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de conexión SSE */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border/60">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 live-indicator' : 'bg-amber-400'}`} />
            <span className="text-[11px] text-muted-foreground font-medium">
              {connected ? 'Tiempo real' : 'Reconectando…'}
            </span>
            {newLogCount > 0 && (
              <Badge className="ml-1 h-4 text-[10px] px-1.5 bg-primary/20 text-primary border-0">
                +{newLogCount > 999 ? '999+' : newLogCount}
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-border/60 hover:border-primary/40 transition-colors"
            onClick={refresh}
            id="refresh-dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* ── Panel de Alarmas (siempre visible) ── */}
      <AlarmPanel
        alarms={activeAlarms}
        connected={connected}
        onClear={clearAlarms}
      />

      {/* ── KPI Cards ── */}
      <StatsCards stats={stats} loading={loading} />

      {/* ── Gráfica temporal ── */}
      <LogChart stats={stats} loading={loading} />

      {/* ── Row: Quality donut + Tag group bars + Recent logs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <QualityDonut stats={stats} loading={loading} />
        <TagGroupBars stats={stats} loading={loading} />
        <RecentLogs logs={displayLogs} loading={loading} />
      </div>
    </AppShell>
  );
}
