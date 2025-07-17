# --- ETAPA 1: BUILDER ---
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- ETAPA 2: PRODUCTION ---
FROM node:20-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Copiamos la carpeta con los archivos SQL de migración
COPY --from=builder /app/drizzle ./drizzle
EXPOSE 8080
CMD ["node", "dist/index.js"]
