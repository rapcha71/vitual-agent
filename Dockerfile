# Dockerfile minimal para Virtual Agent
FROM node:18-alpine

# Instalar solo dependencias esenciales
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar todo el proyecto
COPY . .

# Instalar dependencias
RUN npm install

# Build directo con el script principal
RUN npm run build || (echo "Build failed, trying alternatives..." && npx vite build && npx tsc server/index.ts --outDir dist --module esnext --target es2020 --moduleResolution node)

# Verificar que tenemos los archivos necesarios
RUN ls -la dist/ && test -f dist/index.js

# Configuración
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]