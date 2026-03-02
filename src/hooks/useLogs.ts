// =============================================================================
// src/hooks/useLogs.ts — Hook central para gestión de logs con filtros y caché
//
// PROPÓSITO: Manejar toda la lógica de la página de logs incluyendo:
// filtros (fecha, cliente, grupo, quality, búsqueda), paginación server-side,
// ordenamiento por columna, persistencia de filtros en localStorage y URL.
//
// USADO POR: src/app/logs/page.tsx (tabla de logs)
//
// FLUJO DE DATOS:
// 1. El usuario cambia un filtro → se actualiza el estado local
// 2. Se cancela cualquier request anterior (AbortController)
// 3. Se hace fetch a GET /api/logs?filtros&paginación
// 4. Los filtros se guardan en localStorage y se reflejan en la URL
//
// PARA MODIFICAR:
// - Cambiar tamaño de página por defecto → editar DEFAULT_PAGE_SIZE en constants.ts
// - Cambiar debounce o comportamiento de filtros → editar updateFilters()
// - Agregar nuevos filtros → extender LogFilters en types/ y updateFilters()
// - Cambiar endpoint → modificar la URL en fetchLogs()
// =============================================================================
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LogEntry, LogFilters, PaginatedResponse } from '@/types';
import { DEFAULT_PAGE_SIZE, FILTERS_STORAGE_KEY } from '@/lib/constants';
import { filtersToQueryString } from '@/lib/utils';

const DEFAULT_FILTERS: LogFilters = {};

interface UseLogsOptions {
    initialPageSize?: number;
    enableLocalStorage?: boolean;
}

/**
 * Hook principal para la página de logs con filtrado, paginación y sort server-side.
 *
 * @param options.initialPageSize - Número de filas por página (default: DEFAULT_PAGE_SIZE)
 * @param options.enableLocalStorage - Persistir filtros en localStorage (default: true)
 *
 * @returns Objeto con:
 * - data: PaginatedResponse<LogEntry> | null — logs de la página actual con metadatos
 * - loading: boolean — true mientras se carga una página
 * - error: string | null — mensaje de error del último fetch fallido
 * - filters: LogFilters — filtros activos actuales
 * - updateFilters: (partial) => void — actualiza filtros parcialmente y resetea a pág. 1
 * - clearFilters: () => void — limpia todos los filtros
 * - page / setPage: control de página actual
 * - pageSize / setPageSize: control de tamaño de página
 * - sortBy / sortOrder / handleSort: control de ordenamiento por columna
 * - refresh: () => void — forzar recarga de datos (botón Actualizar)
 *
 * Características:
 * - Cancela requests anteriores automáticamente (evita race conditions)
 * - Sincroniza filtros con la URL del navegador (query params)
 * - Persiste filtros en localStorage para recuperarlos al volver
 */
export function useLogs(options: UseLogsOptions = {}) {
    const { initialPageSize = DEFAULT_PAGE_SIZE, enableLocalStorage = true } = options;

    // ── Estado de filtros con caché en localStorage ──────────────────────────
    const [filters, setFilters] = useState<LogFilters>(() => {
        if (!enableLocalStorage || typeof window === 'undefined') return DEFAULT_FILTERS;
        try {
            const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_FILTERS;
        } catch {
            return DEFAULT_FILTERS;
        }
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [data, setData] = useState<PaginatedResponse<LogEntry> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Referencia para abortar requests anteriores
    const abortRef = useRef<AbortController | null>(null);

    // Guardar filtros en localStorage
    useEffect(() => {
        if (!enableLocalStorage || typeof window === 'undefined') return;
        try {
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
        } catch { }
    }, [filters, enableLocalStorage]);

    // Sincronizar filtros con URL (para compartir)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const qs = filtersToQueryString({ ...filters, page, pageSize, sortBy, sortOrder });
        const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState({}, '', url);
    }, [filters, page, pageSize, sortBy, sortOrder]);

    const fetchLogs = useCallback(async () => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        try {
            const qs = filtersToQueryString({ ...filters, page, pageSize, sortBy, sortOrder });
            const res = await fetch(`/api/logs?${qs}`, { signal: abortRef.current.signal });
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const result: PaginatedResponse<LogEntry> = await res.json();
            setData(result);
            setError(null);
        } catch (err: any) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters, page, pageSize, sortBy, sortOrder]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const updateFilters = useCallback((newFilters: Partial<LogFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1); // Resetear paginación al cambiar filtros
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
        setPage(1);
    }, []);

    const handleSort = useCallback((column: string) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    }, [sortBy]);

    return {
        data, loading, error,
        filters, updateFilters, clearFilters,
        page, setPage,
        pageSize, setPageSize,
        sortBy, sortOrder, handleSort,
        refresh: fetchLogs,
    };
}
