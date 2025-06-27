# --- ETAPA 1: BUILDER ---
# Usa la imagen base de Node.js. 'slim' es una buena opción de tamaño.
FROM node:20-slim AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de manifiesto del proyecto. El '*' maneja si tienes o no un lockfile.
COPY package*.json ./

# Instala TODAS las dependencias, incluyendo las de desarrollo para poder construir el proyecto
RUN npm install

# Copia todo el código fuente de tu aplicación al contenedor
COPY . .

# Ejecuta el script de construcción estándar de tu package.json.
# npm usará el último script "build" que encuentre: 'vite build && esbuild...'
RUN npm run build

# --- ETAPA 2: PRODUCTION ---
# Esta es la imagen final que se ejecutará en Cloud Run. Es más pequeña y segura.

FROM node:20-slim AS production

# Establece el entorno a producción
ENV NODE_ENV=production

WORKDIR /app

# Copia SOLO las dependencias de producción desde la etapa 'builder'
# Esto hace la imagen final mucho más pequeña
COPY --from=builder /app/node_modules ./node_modules

# Copia la carpeta 'dist' construida, que contiene tu frontend y backend listos para usar
COPY --from=builder /app/dist ./dist

# Expone el puerto en el que la aplicación escuchará. Cloud Run te pasará el puerto exacto a través de la variable de entorno PORT.
EXPOSE 8080

# El comando final para iniciar tu servidor. Esto coincide con el script "start" de tu package.json.
CMD ["ls", "-R"]
