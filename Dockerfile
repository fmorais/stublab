# syntax=docker/dockerfile:1

# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM base AS builder

# Copiar arquivos de manifest e configuração TS raiz
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Instalar todas as dependências (dev included)
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build frontend
RUN pnpm --filter web build

# Build backend
RUN pnpm --filter api build

# ─── Stage 3: prod-deps ───────────────────────────────────────────────────────
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --prod

# ─── Stage 4: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Criar usuário não-root
RUN addgroup -S stublab && adduser -S stublab -G stublab

WORKDIR /app

# Copiar dependências de produção
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules

# Copiar build do backend
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copiar build do frontend para dentro do backend como arquivos estáticos
COPY --from=builder /app/apps/web/dist ./apps/api/public

# Copiar entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Criar diretório de dados e ajustar permissões
RUN mkdir -p /app/data && chown -R stublab:stublab /app

USER stublab

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
