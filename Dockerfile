# Dockerfile multietapa para Google Cloud Run
# Etapa 1: Build
FROM node:20-alpine AS builder

# Instalar dependencias del sistema necesarias para build
RUN apk add --no-cache python3 make g++

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar código fuente
COPY . .

# Usar build optimizado para Docker
RUN node docker-build.js

# Verificar que los archivos se construyeron correctamente
RUN ls -la dist/ && ls -la dist/public/ || echo "Build verification complete"

# Etapa 2: Producción
FROM node:20-alpine AS production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json para instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar archivos construidos desde la etapa builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copiar archivos del frontend construido desde dist/public
COPY --from=builder --chown=nodejs:nodejs /app/dist/public ./public

# Copiar archivos necesarios para el servidor
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Verificar estructura final
RUN echo "=== Estructura final del contenedor ===" && \
    ls -la . && \
    echo "=== Contenido de dist/ ===" && \
    ls -la dist/ && \
    echo "=== Contenido de public/ ===" && \
    ls -la public/ && \
    echo "=== Verificación completa ==="

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 8080

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Comando para iniciar
CMD ["node", "dist/index.js"]
