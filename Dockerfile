# Dockerfile SÓLO para crear las tablas
FROM node:20-slim AS builder

WORKDIR /app

# Copiamos lo necesario para que drizzle-kit funcione
COPY package*.json ./
COPY drizzle.config.ts ./
COPY server/db/schema.ts ./server/db/schema.ts
COPY drizzle ./drizzle

# Instalamos las dependencias
RUN npm install

# El comando que ejecuta la creación de tablas y luego termina
CMD ["npm", "run", "db:push"]
