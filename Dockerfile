# =============================================================================
# UPA do Tênis — Dockerfile para Produção Local Piloto
# Build multi-stage otimizado para Next.js 14 standalone + Prisma
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Instalar dependências
# ---------------------------------------------------------------------------
FROM node:24-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
RUN pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted

# ---------------------------------------------------------------------------
# Stage 2: Build da aplicação
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código-fonte e configurações
COPY . .

# Gerar Prisma Client
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
RUN pnpm exec prisma generate

# Variável necessária para build (não é usada em runtime)
ENV NEXT_TELEMETRY_DISABLED=1

# DATABASE_URL dummy para build — necessário porque o Next.js tenta
# pré-renderizar páginas que usam Prisma (SSG). O Prisma exige a
# variável para inicializar, mas não conecta de fato durante o build.
# O valor real vem em runtime via docker-compose.
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
ENV DATABASE_URL=${DATABASE_URL}

# Build Next.js em modo standalone
RUN pnpm run build

# ---------------------------------------------------------------------------
# Stage 3: Runner — imagem mínima de produção
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar assets estáticos
COPY --from=builder /app/public ./public

# Copiar build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar Prisma schema e migrations para migrate deploy
COPY --from=builder /app/prisma ./prisma

# Copiar Prisma Client gerado (necessário em runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar Prisma CLI para migrate deploy
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Script de entrypoint
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
