# Build stage
FROM node:20-alpine AS builder

# Dependencias para módulos nativos (bufferutil, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install all deps (including dev for build)
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
