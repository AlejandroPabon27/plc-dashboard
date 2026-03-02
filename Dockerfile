# =============================================================================
# Dockerfile — PLC Dashboard (Next.js 16 Standalone)
# Optimizado para QNAP Container Station
# =============================================================================

# ---------------------------------------------------------------------------
# Etapa 1: Instalar dependencias
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar todas las dependencias
RUN npm ci

# ---------------------------------------------------------------------------
# Etapa 2: Build de la aplicación
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_USE_MOCK=false
# Conecta a la DB PostgreSQL en la QNAP

# Build de producción
RUN npm run build

# ---------------------------------------------------------------------------
# Etapa 3: Imagen de producción
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar assets públicos
COPY --from=builder /app/public ./public

# Crear directorios con permisos correctos
RUN mkdir -p .next logs
RUN chown -R nextjs:nodejs .next logs

# Copiar build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiar a usuario no-root
USER nextjs

EXPOSE 3000

# Script de entrada para verificar conexión a BD
CMD ["node", "server.js"]