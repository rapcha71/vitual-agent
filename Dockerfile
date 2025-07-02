# --- ETAPA 1: BUILDER ---
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- ETAPA 2: PRODUCTION (PARA DEPURACIÓN) ---
FROM node:20-slim AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY drizzle.config.ts ./
COPY drizzle ./drizzle

# Este comando mantendrá el contenedor vivo por 1 hora sin hacer nada, para que podamos entrar.
CMD ["sleep", "3600"]
