# Dockerfile para Frontend Next.js
# Optimizado para Amazon Linux 2023

# Etapa 1: Construcción (Build)
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Construir la aplicación Next.js
# La variable de entorno NEXT_TELEMETRY_DISABLED desactiva telemetría
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Etapa 2: Producción (Runtime)
FROM node:20-alpine AS runner

WORKDIR /app

# Variables de entorno para producción
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Crear usuario no root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos necesarios desde la etapa de construcción
# En modo standalone, Next.js crea una carpeta .next/standalone con todo lo necesario
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Cambiar a usuario no root
USER nextjs

# Exponer el puerto 3000
EXPOSE 3000

# Variable de entorno para el puerto
ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

# Comando de inicio
# En modo standalone, el servidor está en .next/standalone/server.js
CMD ["node", "server.js"]
