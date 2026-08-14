# Z-Image API - Docker Configuration
#
# Build: docker build -t z-image-api .
# Run: docker run -p 8787:8787 z-image-api
#
# Multi-stage build for optimal image size

# === Build Stage ===
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package first, then API
RUN pnpm --filter @z-image/shared build
RUN pnpm --filter @z-image/api build

# === Production Stage ===
FROM node:20-alpine AS runner

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8787

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile

# Copy shared declarations and API source. API uses tsx at runtime because its
# TypeScript config intentionally keeps noEmit enabled for the worker build.
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/src ./apps/api/src

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/ || exit 1

# Run the server
CMD ["pnpm", "--filter", "@z-image/api", "start"]
