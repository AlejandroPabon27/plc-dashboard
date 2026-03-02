# CostayacoLogs — PLC Log Dashboard

Dashboard web full-stack para visualizar y gestionar logs provenientes de PLCs industriales. Conecta con PostgreSQL (tablas `clientes`, `nodos`, `logs`) y expone una interfaz moderna con gráficas en tiempo real.

## Stack Tecnológico

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Estilos:** Tailwind CSS v4 + shadcn/ui
- **Tabla de datos:** TanStack Table v8
- **Gráficas:** Recharts
- **Base de datos:** PostgreSQL (via `pg`)
- **Exportación:** xlsx + file-saver

## Instalación

```bash
# Clonar e instalar dependencias
cd plc-dashboard
npm install

# Copiar variables de entorno
cp .env.example .env.local
```

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string de PostgreSQL | `postgresql://postgres:password@localhost:5432/plc_logs` |
| `NEXT_PUBLIC_USE_MOCK` | Usar datos mock sin DB | `true` |

## Ejecución

```bash
# Modo desarrollo (con datos mock)
npm run dev

# Build de producción
npm run build
npm start
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Modo Mock vs PostgreSQL

- Con `NEXT_PUBLIC_USE_MOCK=true`: la app genera 500 logs de ejemplo automáticamente. No necesita base de datos.
- Con `NEXT_PUBLIC_USE_MOCK=false`: conecta a PostgreSQL. Asegúrate de que `DATABASE_URL` apunte a un servidor con las tablas `clientes`, `nodos`, `logs`.

## Estructura del Proyecto

```
src/
├── app/                    # Páginas y API routes (App Router)
│   ├── page.tsx           # Dashboard principal
│   ├── logs/page.tsx      # Vista completa de logs con filtros
│   ├── analytics/page.tsx # Gráficas de tendencia y distribución
│   ├── admin/page.tsx     # CRUD de clientes y nodos
│   └── api/               # API routes (logs, stats, clients, nodos, admin, export)
├── components/
│   ├── dashboard/         # StatsCards, LogChart, SubsystemChart
│   ├── layout/            # AppShell, Sidebar, Header
│   ├── logs/              # LogTable, FilterBar, AdvancedFilterSheet, ExportButton, LogDetailModal
│   └── ui/                # Componentes shadcn/ui
├── hooks/                 # useLogs, useDashboardStats
├── lib/                   # db, utils, constants, monitoring
├── types/                 # Interfaces TypeScript
└── data/                  # Datos mock
```

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard con KPIs, gráfica temporal 24h, distribución por subsistema, tabla de logs recientes |
| `/logs` | Vista completa con filtros avanzados, paginación, sorting, exportación CSV/XLSX |
| `/analytics` | Gráficas expandidas, distribución por subsistema, errores recientes |
| `/admin` | Gestión CRUD de clientes OPC-UA y nodos monitoreados |

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/logs` | Logs paginados con filtros |
| POST | `/api/logs/export` | Exportar logs filtrados (CSV/JSON) |
| GET | `/api/stats/summary` | Estadísticas del dashboard (24h) |
| GET | `/api/clients` | Lista de clientes |
| GET | `/api/nodos` | Nodos (filtrable por `clienteId`) |
| GET/POST | `/api/admin/clients` | CRUD clientes |
| PUT/DELETE | `/api/admin/clients/[id]` | Editar/eliminar cliente |
| GET/POST | `/api/admin/nodos` | CRUD nodos |
| PUT/DELETE | `/api/admin/nodos/[id]` | Editar/eliminar nodo |

## Personalización

- **Tema:** El toggle dark/light está en el Header. Los colores se definen en `src/app/globals.css`.
- **Subsistemas:** Editar `KNOWN_SUBSYSTEMS` en `src/lib/constants.ts`.
- **Colores de gráficas:** Modificar `STATUS_CONFIG` y `SUBSYSTEM_COLORS` en `src/lib/constants.ts`.
