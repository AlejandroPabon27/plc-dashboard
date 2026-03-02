// =============================================================================
// src/app/layout.tsx — Root layout con ThemeProvider, Sonner y fuentes
//
// PROPÓSITO: Layout raíz de Next.js que envuelve todas las páginas de la
// aplicación. Configura:
// - Fuentes Google: Geist (sans) y Geist_Mono (mono) como variables CSS
// - ThemeProvider de next-themes: tema oscuro por defecto, toggle con clase CSS
// - Toaster de Sonner: notificaciones toast en esquina superior derecha
// - Metadata SEO: título, descripción y keywords
//
// USADO POR: Next.js automáticamente como layout global
//
// PARA MODIFICAR:
// - Cambiar fuentes → editar las llamadas a Geist/Geist_Mono
// - Cambiar tema default → editar defaultTheme en ThemeProvider
// - Cambiar posición de toasts → editar position en <Toaster>
// - Cambiar metadata SEO → editar el objeto metadata
// =============================================================================
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CostayacoLogs — Monitor PLC',
  description: 'Dashboard de monitoreo de logs de eventos PLC en tiempo real para el proyecto Costayaco.',
  keywords: ['PLC', 'OPC-UA', 'SCADA', 'logs', 'monitoreo industrial'],
};

/**
 * Layout raíz de la aplicación. Configura HTML lang="es", fuentes,
 * tema oscuro por defecto y sistema de notificaciones toast.
 * Todas las páginas se renderizan como children dentro de este layout.
 *
 * @param props.children - Contenido de la página activa
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
