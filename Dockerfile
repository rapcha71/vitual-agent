# Dockerfile final optimizado para Virtual Agent
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias del proyecto
RUN npm cache clean --force
RUN npm install --no-audit --no-fund

# Copiar archivos de configuración
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Copiar código fuente
COPY . .

# Crear directorio dist
RUN mkdir -p dist

# Build frontend usando vite local
RUN echo "Building frontend with npx vite..."
RUN npx vite build

# Build backend usando esbuild local
RUN echo "Building backend with npx esbuild..."
RUN npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Verificar builds
RUN echo "Verifying builds..."
RUN ls -la dist/
RUN test -f dist/index.html && echo "✓ Frontend build successful"
RUN test -f dist/index.js && echo "✓ Backend build successful"

# Configuración de producción
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S virtual-agent -u 1001 -G nodejs

RUN chown -R virtual-agent:nodejs /app
USER virtual-agent

EXPOSE 8080

CMD ["node", "dist/index.js"]