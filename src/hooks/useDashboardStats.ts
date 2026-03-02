// =============================================================================
// src/hooks/useDashboardStats.ts — Hook para stats del dashboard con polling
//
// PROPÓSITO: Obtener y mantener actualizadas las estadísticas del dashboard
// (KPIs, gráficas, logs recientes). Hace polling automático cada 15 segundos
// al endpoint GET /api/stats/summary.
//
// USADO POR: src/app/page.tsx (dashboard principal)
//
// PARA MODIFICAR:
// - Cambiar intervalo de polling → editar POLLING_INTERVAL_MS en constants.ts
// - Cambiar endpoint de stats → editar la URL en fetchStats()
// - Agregar más campos al estado → extender el hook y el tipo DashboardStats
// =============================================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardStats } from '@/types';
import { POLLING_INTERVAL_MS } from '@/lib/constants';

/**
 * Hook que gestiona la obtención y actualización automática de estadísticas.
 *
 * Comportamiento:
 * 1. Al montar, hace un fetch inmediato a /api/stats/summary
 * 2. Programa un setInterval que refresca cada POLLING_INTERVAL_MS (15s)
 * 3. Al desmontar, limpia el intervalo para evitar memory leaks
 *
 * @returns Objeto con:
 * - stats: DashboardStats | null — datos de KPIs, calidades, logs por hora, etc.
 * - loading: boolean — true durante la carga inicial
 * - error: string | null — mensaje de error si falla el fetch
 * - lastUpdated: Date | null — timestamp del último fetch exitoso
 * - refresh: () => void — función para forzar un refresco manual (botón Actualizar)
 */
export function useDashboardStats() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/stats/summary');
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data: DashboardStats = await res.json();
            setStats(data);
            setError(null);
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, POLLING_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchStats]);

    return { stats, loading, error, lastUpdated, refresh: fetchStats };
}
