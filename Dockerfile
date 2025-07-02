# --- ETAPA 1: BUILDER ---
# Usa la imagen base de Node.js. 'slim' es una buena opción de tamaño.
FROM node:20-slim AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de manifiesto del proyecto.
COPY package*.json ./

# Instala TODAS las dependencias para poder construir el proyecto
RUN npm install

# Copia todo el código fuente de tu aplicación al contenedor
COPY . .

# Ejecuta el script de construcción estándar de tu package.json
RUN npm run build

# --- ETAPA 2: PRODUCTION ---
# Esta es la imagen final que se ejecutará en Cloud Run.

FROM node:20-slim AS production

# Establece el entorno a producción
ENV NODE_ENV=production

WORKDIR /app

# Copia solo lo necesario para producción desde la etapa anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# --- CORRECCIÓN IMPORTANTE AQUÍ ---
# Copiamos nuestro script de depuración al contenedor final
COPY debug.js .

# Expone el puerto en el que la aplicación escuchará.
EXPOSE 8080

# Comando para ejecutar el script de depuración en lugar de la app
CMD ["node", "debug.js"]
