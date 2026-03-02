// =============================================================================
// src/hooks/useRealtimeLogs.ts — Hook SSE para logs en tiempo real
// Se conecta a /api/logs/stream y recibe nuevos logs + alarmas
//
// PROPÓSITO: Mantener una conexión Server-Sent Events (SSE) persistente con el
// backend para recibir logs nuevos y alarmas en tiempo real sin hacer polling
// desde el cliente.
//
// USADO POR: src/app/page.tsx (dashboard principal)
//
// FLUJO:
// 1. Al montar, se crea un EventSource hacia /api/logs/stream
// 2. El servidor envía eventos 'connected', 'logs', 'alarm' y 'error'
// 3. Los logs nuevos se acumulan en un buffer de máximo maxRecent entradas
// 4. Las alarmas se acumulan en un buffer separado de máximo maxAlarms entradas
// 5. EventSource reconecta automáticamente si la conexión se pierde
//
// PARA MODIFICAR:
// - Cambiar tamaño de buffer de logs → maxRecent (default: 50)
// - Cambiar tamaño de buffer de alarmas → maxAlarms (default: 20)
// - Agregar nuevos tipos de eventos → añadir es.addEventListener() en connect()
// - Cambiar endpoint SSE → modificar la URL en new EventSource(...)
// =============================================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LogEntry } from '@/types';

interface RealtimeState {
    /** Nuevos logs recibidos desde la conexión */
    recentLogs: LogEntry[];
    /** Alarmas activas (is_alarm=true, value='1') */
    activeAlarms: LogEntry[];
    /** ¿Está conectado el stream? */
    connected: boolean;
    /** Contador de logs recibidos desde la conexión */
    newLogCount: number;
    /** Último error */
    error: string | null;
}

interface UseRealtimeLogsOptions {
    /** Máximo de logs recientes en memoria */
    maxRecent?: number;
    /** Máximo de alarmas activas en memoria */
    maxAlarms?: number;
    /** Habilitar el stream */
    enabled?: boolean;
    /** Callback cuando llega una alarma */
    onAlarm?: (alarms: LogEntry[]) => void;
}

/**
 * Hook para recepción de logs y alarmas en tiempo real mediante Server-Sent Events.
 *
 * @param options.maxRecent - Máximo de logs recientes en memoria (default: 50)
 * @param options.maxAlarms - Máximo de alarmas activas en memoria (default: 20)
 * @param options.enabled - Si es false, no se establece la conexión SSE (default: true)
 * @param options.onAlarm - Callback ejecutado cuando llegan nuevas alarmas.
 *                          Se usa en page.tsx para mostrar toast de notificación.
 *
 * @returns Objeto con:
 * - recentLogs: LogEntry[] — últimos logs recibidos (más reciente primero)
 * - activeAlarms: LogEntry[] — alarmas activas (is_alarm=true, value='1')
 * - connected: boolean — estado de la conexión SSE
 * - newLogCount: number — contador acumulado de logs recibidos desde la conexión
 * - error: string | null — último error de conexión
 * - clearAlarms: () => void — limpia el array de alarmas activas (botón Limpiar)
 * - resetCount: () => void — reinicia el contador de nuevos logs
 *
 * Eventos SSE manejados:
 * - 'connected' → marca la conexión como activa
 * - 'logs' → agrega nuevos logs al buffer (FIFO, máx maxRecent)
 * - 'alarm' → agrega alarmas al buffer y ejecuta onAlarm callback
 * - 'error' → marca desconexión (EventSource reconecta solo)
 */
export function useRealtimeLogs(options: UseRealtimeLogsOptions = {}) {
    const {
        maxRecent = 50,
        maxAlarms = 20,
        enabled = true,
        onAlarm,
    } = options;

    const [state, setState] = useState<RealtimeState>({
        recentLogs: [],
        activeAlarms: [],
        connected: false,
        newLogCount: 0,
        error: null,
    });

    const eventSourceRef = useRef<EventSource | null>(null);
    const onAlarmRef = useRef(onAlarm);
    onAlarmRef.current = onAlarm;

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const es = new EventSource('/api/logs/stream');
        eventSourceRef.current = es;

        es.addEventListener('connected', () => {
            setState(prev => ({ ...prev, connected: true, error: null }));
        });

        es.addEventListener('logs', (event) => {
            try {
                const { logs } = JSON.parse(event.data);
                setState(prev => ({
                    ...prev,
                    recentLogs: [...logs, ...prev.recentLogs].slice(0, maxRecent),
                    newLogCount: prev.newLogCount + logs.length,
                }));
            } catch { }
        });

        es.addEventListener('alarm', (event) => {
            try {
                const { alarms } = JSON.parse(event.data);
                setState(prev => ({
                    ...prev,
                    activeAlarms: [...alarms, ...prev.activeAlarms].slice(0, maxAlarms),
                }));
                onAlarmRef.current?.(alarms);
            } catch { }
        });

        es.addEventListener('error', (event) => {
            // EventSource auto-reconnects, just update state
            setState(prev => ({ ...prev, connected: false }));
        });

        es.onerror = () => {
            setState(prev => ({ ...prev, connected: false }));
        };
    }, [maxRecent, maxAlarms]);

    useEffect(() => {
        if (!enabled) return;
        connect();
        return () => {
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
        };
    }, [enabled, connect]);

    const clearAlarms = useCallback(() => {
        setState(prev => ({ ...prev, activeAlarms: [] }));
    }, []);

    const resetCount = useCallback(() => {
        setState(prev => ({ ...prev, newLogCount: 0 }));
    }, []);

    return {
        ...state,
        clearAlarms,
        resetCount,
    };
}
