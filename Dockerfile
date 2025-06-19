# Usar Node.js 18 LTS como imagen base
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para build
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

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production && npm cache clean --force

# Copiar el código fuente
COPY . .

# Crear directorio para archivos estáticos
RUN mkdir -p /app/dist

# Build de la aplicación frontend
RUN npm run build

# Exponer puerto (Cloud Run asigna dinámicamente)
EXPOSE $PORT

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Usuario no root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S virtual-agent -u 1001
USER virtual-agent

# Comando para iniciar la aplicación
CMD ["node", "server/index.js"]