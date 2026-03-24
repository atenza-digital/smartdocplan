# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar pnpm via npm (mais confiável no CI)
RUN npm install -g pnpm@10.4.1

# Copiar manifests primeiro para cache
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar dependências (sem frozen para evitar conflitos de lockfile)
RUN pnpm install --no-frozen-lockfile

# Copiar código fonte
COPY . .

# Build frontend + backend
RUN pnpm run build

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@10.4.1

# Copiar manifests para install de produção
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar apenas dependências de produção
RUN pnpm install --no-frozen-lockfile --prod

# Copiar build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.js"]
