// =============================================================================
// src/components/layout/Header.tsx — Top bar con búsqueda y controles
//
// PROPÓSITO: Barra superior fija que contiene:
// - Input de búsqueda global (llama a onSearch con el texto)
// - Indicador de errores críticos (badge rojo con conteo)
// - Botón de notificaciones (placeholder, puede conectarse a alarmas)
// - Toggle de tema claro/oscuro (usa next-themes)
//
// USADO POR: AppShell (src/components/layout/AppShell.tsx)
//
// PROPS:
// - errorCount: number → número de errores a mostrar (0 = oculto)
// - onSearch: (term: string) => void → callback invocado al escribir en el input
//
// PARA MODIFICAR:
// - Conectar notificaciones reales → reemplazar el botón Bell placeholder
// - Agregar avatar/perfil de usuario → añadir a la derecha del toggle de tema
// - Cambiar height → editar h-14 en <header>
// =============================================================================
'use client';

import React from 'react';
import { Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
    errorCount?: number;
    onSearch?: (term: string) => void;
}

/**
 * Barra superior fija con input de búsqueda, indicador de errores,
 * botón de notificaciones y toggle de tema claro/oscuro.
 *
 * @param props.errorCount - Número de errores a mostrar; 0 oculta el badge
 * @param props.onSearch - Callback invocado al escribir en el input de búsqueda
 */
export function Header({ errorCount = 0, onSearch }: HeaderProps) {
    const { theme, setTheme } = useTheme();

    return (
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-40">
            {/* Búsqueda global */}
            <div className="flex-1 max-w-md">
                <Input
                    placeholder="Buscar en logs..."
                    className="h-8 bg-background/60 border-border/60 text-sm"
                    onChange={e => onSearch?.(e.target.value)}
                    id="global-search"
                />
            </div>

            <div className="flex items-center gap-2 ml-auto">
                {/* Notificaciones con indicador de errores */}
                <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Notificaciones">
                    <Bell className="w-4 h-4" />
                    {errorCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                            {errorCount > 9 ? '9+' : errorCount}
                        </Badge>
                    )}
                </Button>

                {/* Toggle de tema */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label="Cambiar tema"
                >
                    <Sun className="w-4 h-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                </Button>
            </div>
        </header>
    );
}
