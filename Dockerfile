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

# Construir aplicación
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine AS production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json para instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos construidos desde la etapa builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copiar archivos necesarios para el servidor
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

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
