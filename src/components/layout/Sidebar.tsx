// =============================================================================
// src/components/layout/Sidebar.tsx — Sidebar colapsable con navegación
//
// PROPÓSITO: Panel lateral izquierdo con navegación principal de la aplicación.
// Colapsable a 16px (solo iconos). Muestra:
// - Branding (logo + nombre "CostayacoLogs")
// - Indicador "Sistema activo" con animación live
// - Links de navegación: Dashboard, Logs, Administrar
// - Botón para colapsar/expandir
//
// USADO POR: AppShell (src/components/layout/AppShell.tsx)
//
// ESTADO LOCAL:
// - collapsed: boolean → controla si está colapsado (default: false)
//
// CONSTANTES INTERNAS:
// - navItems[] → array de { href, label, icon } para los links
//
// PARA MODIFICAR:
// - Agregar nuevas páginas → añadir entrada a navItems[]
// - Cambiar texto de branding → editar "CostayacoLogs" / "Monitor PLC"
// - Cambiar ancho expandido → editar w-60
// - Persistir estado colapsado → guardar en localStorage
// =============================================================================
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, FileText, Settings,
    ChevronLeft, ChevronRight, Activity, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/logs', label: 'Logs', icon: FileText },
    { href: '/admin', label: 'Administrar', icon: Settings },
];

/**
 * Panel lateral de navegación con soporte para colapsar/expandir.
 * Muestra branding, indicador live, links de navegación (Dashboard, Logs, Admin)
 * y botón para colapsar. El link activo se detecta con usePathname().
 */
export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                'relative flex flex-col h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300 ease-in-out',
                collapsed ? 'w-16' : 'w-60'
            )}
        >
            {/* ── Branding ── */}
            <div className={cn(
                'flex items-center gap-3 px-4 py-5 border-b border-sidebar-border',
                collapsed && 'justify-center px-2'
            )}>
                <div className="shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-sidebar-foreground leading-none">CostayacoLogs</p>
                        <p className="text-xs text-sidebar-foreground/50 mt-0.5">Monitor PLC</p>
                    </div>
                )}
            </div>

            {/* ── Indicador Live ── */}
            {!collapsed && (
                <div className="flex items-center gap-2 px-4 py-2 mx-3 mt-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 live-indicator" />
                    <span className="text-xs text-emerald-400 font-medium">Sistema activo</span>
                    <Activity className="w-3 h-3 text-emerald-400 ml-auto" />
                </div>
            )}

            {/* ── Navegación ── */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                    return (
                        <Link key={href} href={href}>
                            <div className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                                isActive
                                    ? 'bg-primary/15 text-primary shadow-sm'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                                collapsed && 'justify-center px-2'
                            )}>
                                <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-primary')} />
                                {!collapsed && <span>{label}</span>}
                                {isActive && !collapsed && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* ── Botón colapsar ── */}
            <div className="p-2 border-t border-sidebar-border">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        'w-full text-sidebar-foreground/50 hover:text-sidebar-foreground',
                        collapsed && 'justify-center'
                    )}
                    aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                        <><ChevronLeft className="w-4 h-4 mr-2" /><span className="text-xs">Colapsar</span></>
                    )}
                </Button>
            </div>
        </aside>
    );
}
