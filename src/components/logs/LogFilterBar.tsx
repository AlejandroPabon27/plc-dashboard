// =============================================================================
// src/components/logs/LogFilterBar.tsx — Barra de filtros para la tabla de logs
// Campos mapeados a la DB QNAP (clients, node_ids, logs)
//
// PROPÓSITO: Componente con todos los controles de filtrado para la tabla de logs.
// Organizado en 2 filas:
// - Fila 1: Input de búsqueda de texto libre (con debounce 400ms) + rango de fechas
// - Fila 2: Select de equipo/cliente + Select de tag_group + badges toggle de quality
//           + botón "Limpiar filtros" con conteo de filtros activos
//
// USADO POR: Página /logs (src/app/logs/page.tsx)
//
// PROPS:
// - filters: LogFilters → estado actual de los filtros
// - onUpdateFilters: (Partial<LogFilters>) => void → actualiza filtros parciales
// - onClearFilters: () => void → limpia todos los filtros
//
// ESTADO LOCAL:
// - searchInput: string → valor del input de búsqueda (debounced a 400ms)
// - clients: Cliente[] → lista cargada desde GET /api/clients al montar
// - tagGroups: string[] → lista cargada desde GET /api/nodos al montar
//
// PARA MODIFICAR:
// - Cambiar debounce de búsqueda → editar setTimeout 400ms
// - Agregar filtro de nodo específico → añadir otro Select con datos de /api/nodos
// - Agregar filtro de alarma → añadir badge toggle para is_alarm
// - Cambiar fetch de datos → editar useEffect de clients y tagGroups
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Search, X, CalendarDays } from 'lucide-react';
import { LogFilters, Cliente } from '@/types';
import { QUALITY_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface LogFilterBarProps {
    filters: LogFilters;
    onUpdateFilters: (filters: Partial<LogFilters>) => void;
    onClearFilters: () => void;
}

/**
 * Barra de filtros completa para la tabla de logs.
 * Carga clientes y tag_groups al montar. Búsqueda con debounce de 400ms.
 * Los badges de quality funcionan como toggles (multi-select).
 *
 * @param props.filters - Estado actual de los filtros (LogFilters)
 * @param props.onUpdateFilters - Callback para actualizar filtros parciales
 * @param props.onClearFilters - Callback para limpiar todos los filtros
 */
export function LogFilterBar({ filters, onUpdateFilters, onClearFilters }: LogFilterBarProps) {
    const [searchInput, setSearchInput] = useState(filters.search || '');
    const [clients, setClients] = useState<Cliente[]>([]);
    const [tagGroups, setTagGroups] = useState<string[]>([]);

    // ── Cargar lista de clientes/equipos ──────────────────────────────────────
    useEffect(() => {
        fetch('/api/clients')
            .then(r => r.ok ? r.json() : [])
            .then(setClients)
            .catch(() => setClients([]));
    }, []);

    // ── Cargar lista de tag_groups dinámicamente ──────────────────────────────
    useEffect(() => {
        fetch('/api/nodos')
            .then(r => r.ok ? r.json() : [])
            .then((nodos: any[]) => {
                const groups = [...new Set(nodos.map(n => n.tag_group).filter(Boolean))].sort();
                setTagGroups(groups);
            })
            .catch(() => setTagGroups([]));
    }, []);

    // ── Debounce para búsqueda por texto ──────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            const val = searchInput.trim() || undefined;
            if (val !== filters.search) {
                onUpdateFilters({ search: val });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Contar filtros activos ────────────────────────────────────────────────
    const activeCount = [
        filters.dateFrom,
        filters.dateTo,
        ...(filters.clientIds || []),
        ...(filters.tagGroups || []),
        ...(filters.qualities || []),
        filters.search,
    ].filter(Boolean).length;

    // ── Toggle de quality ────────────────────────────────────────────────────
    const toggleQuality = useCallback((quality: string) => {
        const current = filters.qualities || [];
        const next = current.includes(quality)
            ? current.filter(e => e !== quality)
            : [...current, quality];
        onUpdateFilters({ qualities: next.length ? next : undefined });
    }, [filters.qualities, onUpdateFilters]);

    return (
        <div className="space-y-3">
            {/* ── Fila 1: Búsqueda + Fechas ── */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Búsqueda general */}
                <div className="relative flex-1 min-w-50">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por valor, tag o cliente…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className="pl-9 h-9 bg-background/50 border-border/60 text-sm"
                        id="filter-search"
                    />
                    {searchInput && (
                        <button
                            onClick={() => { setSearchInput(''); onUpdateFilters({ search: undefined }); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Fecha desde */}
                <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={e => onUpdateFilters({ dateFrom: e.target.value || undefined })}
                        className="h-9 w-37.5 bg-background/50 border-border/60 text-sm"
                        id="filter-date-from"
                        title="Fecha desde"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
                    <Input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={e => onUpdateFilters({ dateTo: e.target.value || undefined })}
                        className="h-9 w-37.5 bg-background/50 border-border/60 text-sm"
                        id="filter-date-to"
                        title="Fecha hasta"
                    />
                </div>
            </div>

            {/* ── Fila 2: Selects + Badges de quality ── */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Equipo / Cliente */}
                <Select
                    value={filters.clientIds?.[0]?.toString() || 'all'}
                    onValueChange={v => onUpdateFilters({ clientIds: v === 'all' ? undefined : [Number(v)] })}
                >
                    <SelectTrigger className="w-45 h-9 bg-background/50 border-border/60 text-sm" id="filter-client">
                        <SelectValue placeholder="Todos los equipos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los equipos</SelectItem>
                        {clients.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Tag Group */}
                <Select
                    value={filters.tagGroups?.[0] || 'all'}
                    onValueChange={v => onUpdateFilters({ tagGroups: v === 'all' ? undefined : [v] })}
                >
                    <SelectTrigger className="w-40 h-9 bg-background/50 border-border/60 text-sm" id="filter-tag-group">
                        <SelectValue placeholder="Todos los grupos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los grupos</SelectItem>
                        {tagGroups.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Separador visual */}
                <div className="h-6 w-px bg-border/50 hidden sm:block" />

                {/* Badges de quality */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">Quality:</span>
                    {Object.entries(QUALITY_CONFIG).map(([key, config]) => {
                        const isActive = filters.qualities?.includes(key);
                        return (
                            <button
                                key={key}
                                onClick={() => toggleQuality(key)}
                                className="transition-all duration-150"
                                id={`filter-quality-${key}`}
                            >
                                <Badge
                                    className={cn(
                                        'text-xs cursor-pointer select-none transition-all duration-150',
                                        isActive
                                            ? config.badgeClass
                                            : 'bg-muted/30 text-muted-foreground border border-border/40 hover:bg-muted/50'
                                    )}
                                >
                                    {config.label}
                                </Badge>
                            </button>
                        );
                    })}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Limpiar filtros */}
                {activeCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => { onClearFilters(); setSearchInput(''); }}
                        id="filter-clear"
                    >
                        <X className="w-3.5 h-3.5" />
                        Limpiar filtros
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                            {activeCount}
                        </Badge>
                    </Button>
                )}
            </div>
        </div>
    );
}
