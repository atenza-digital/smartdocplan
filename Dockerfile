# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy manifests first for cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY patches/ ./patches/

# Install all deps (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend + backend
RUN pnpm run build

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy manifests for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY patches/ ./patches/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.js"]
