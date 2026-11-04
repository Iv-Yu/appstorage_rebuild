# Multi-stage Dockerfile for FieldOps IT Rebuild Application
# Base Image: Node 22 Alpine

# Stage 1: Build Frontend Production Assets
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
COPY frontend/package.json ./frontend/

RUN npm install

COPY frontend ./frontend
COPY tsconfig.json vite.config.ts index.html ./

RUN npm run build:frontend

# Stage 2: Production App Runtime Container
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* bun.lock* ./
COPY backend/package.json ./backend/

RUN npm install --omit=dev

COPY --from=builder /app/frontend/dist ./frontend/dist
COPY backend ./backend
COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

CMD ["npx", "tsx", "backend/src/server.ts"]
