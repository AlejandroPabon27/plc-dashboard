// =============================================================================
// src/components/layout/AppShell.tsx — Layout compartido Sidebar + Header + main
//
// PROPÓSITO: Componente de layout principal que estructura todas las páginas
// de la aplicación. Renderiza el Sidebar a la izquierda, el Header arriba,
// y el contenido principal (children) en el área scrollable central.
//
// USADO POR: Todas las páginas (page.tsx, logs/page.tsx, admin/page.tsx)
//
// PROPS:
// - children: React.ReactNode → contenido de la página
// - errorCount: number → número de errores para el badge del Header
// - onSearch: (term: string) => void → callback de búsqueda global del Header
//
// ESTRUCTURA:
// └─ div.flex (h-screen)
//    ├─ <Sidebar />
//    └─ div.flex-col
//       ├─ <Header />
//       └─ <main> {children} </main>
//
// PARA MODIFICAR:
// - Cambiar padding del contenido → editar p-4 md:p-6 en <main>
// - Agregar footer → añadir elemento después de <main>
// - Agregar breadcrumbs → añadir componente entre Header y main
// =============================================================================
'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
    children: React.ReactNode;
    /** Conteo de errores para el badge del Header */
    errorCount?: number;
    /** Handler de búsqueda global */
    onSearch?: (term: string) => void;
}

/**
 * Layout principal de la aplicación. Estructura tres zonas:
 * Sidebar (izquierda), Header (arriba) y área de contenido scrollable (centro).
 * Todos los children se renderizan dentro del <main>.
 *
 * @param props.children - Contenido de la página activa
 * @param props.errorCount - Número de errores para el badge del Header (default: 0)
 * @param props.onSearch - Callback de búsqueda global invocado desde el Header
 */
export function AppShell({ children, errorCount, onSearch }: AppShellProps) {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Header errorCount={errorCount} onSearch={onSearch} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
                    {children}
                </main>
            </div>
        </div>
    );
}
