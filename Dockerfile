# Dockerfile SÓLO para crear las tablas (FASE 1)
FROM node:20-slim AS builder

WORKDIR /app

# Copiamos lo necesario para que la herramienta de tablas (drizzle-kit) funcione
COPY package*.json ./
COPY drizzle.config.ts ./
COPY server/db/schema.ts ./server/db/schema.ts
COPY drizzle ./drizzle

# Instalamos las dependencias
RUN npm install

# Este comando crea las tablas y luego termina.
CMD ["npm", "run", "db:push"]
