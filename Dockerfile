# Build stage
FROM node:20-alpine AS builder

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
COPY --from=builder /app/public ./public

EXPOSE 5000

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
