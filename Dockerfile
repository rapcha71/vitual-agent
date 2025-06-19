# Multi-stage build para Virtual Agent en Google Cloud Run
FROM node:18-alpine AS builder

# Instalar dependencias del sistema para el build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copiar archivos de configuración primero
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Limpiar caché y instalar dependencias
RUN npm cache clean --force
RUN npm install --verbose
RUN npm ls

# Copiar código fuente
COPY . .

# Verificar estructura antes del build
RUN ls -la
RUN ls -la server/

# Build de la aplicación (frontend y backend)
RUN npm run build

# Verificar que el build se completó
RUN ls -la dist/

# Stage de producción
FROM node:18-alpine AS production

# Instalar dependencias runtime mínimas
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

WORKDIR /app

# Copiar package files para instalar solo dependencias de producción
COPY package*.json ./
RUN npm cache clean --force
RUN npm ci --only=production --verbose
RUN npm cache clean --force

# Copiar archivos built desde el stage anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Verificar estructura final
RUN ls -la
RUN ls -la dist/

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S virtual-agent -u 1001 -G nodejs

# Cambiar ownership de archivos
RUN chown -R virtual-agent:nodejs /app
USER virtual-agent

# Variables de entorno
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Exponer puerto
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
CMD ["node", "dist/index.js"]