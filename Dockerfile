# ==========================================
# Stage 1: Build the Client (Vite + React + Tailwind)
# ==========================================
FROM node:24-alpine AS client-builder

WORKDIR /app/client

# Copy client manifests
COPY client/package.json client/package-lock.json ./
RUN npm ci

# Copy client source code and build
COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server Runner
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/server/data
ENV DATABASE_PATH=/app/server/data/eartraining.sqlite

# Copy server package manifests and install production dependencies
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Copy server source code
COPY server/src ./src

# Copy built frontend assets from Stage 1 into client/dist
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client/dist

# Ensure SQLite data directory exists
RUN mkdir -p /app/server/data

# Expose server port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/curriculum || exit 1

# Start the full-stack server
CMD ["node", "server/src/index.js"]
