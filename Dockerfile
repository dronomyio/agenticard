# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (devDeps needed for build + drizzle-kit)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build: Vite frontend + esbuild server bundle
RUN pnpm build


# ─── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL deps (not --prod) so drizzle-kit is available for migrations
# drizzle-kit is a devDependency but needed at runtime for `drizzle-kit migrate`
RUN pnpm install --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Copy drizzle config for migrations
COPY drizzle.config.ts ./

# Install mysql-client for the wait-for-db readiness check
RUN apk add --no-cache mysql-client

# Expose the app port (server reads PORT env var, defaults to 3000)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/health || exit 1

# Run DB migrations then start server.
# Wait until MySQL actually accepts connections before migrating.
# Wait until MySQL actually accepts connections before migrating.
CMD sh -c '\
  DB_HOST=$(echo $DATABASE_URL | sed "s|.*@\([^:/]*\)[:/].*|\1|") && \
  DB_PORT=$(echo $DATABASE_URL | sed "s|.*:\([0-9]*\)/.*|\1|") && \
  DB_USER=$(echo $DATABASE_URL | sed "s|.*://\([^:]*\):.*|\1|") && \
  DB_PASS=$(echo $DATABASE_URL | sed "s|.*://[^:]*:\([^@]*\)@.*|\1|") && \
  echo "Waiting for MySQL at $DB_HOST:$DB_PORT as $DB_USER..." && \
  until mysql -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1" --silent 2>/dev/null; do \
    echo "MySQL not ready, retrying in 2s..."; \
    sleep 2; \
  done && \
  echo "MySQL is ready. Running DB migrations..." && \
  node_modules/.bin/drizzle-kit migrate && \
  echo "Starting server..." && \
  node dist/index.js'
