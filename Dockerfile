# syntax=docker/dockerfile:1

# ─── 1. Dependências ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ─── 2. Build do front-end ────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── 3. Só as dependências de produção ────────────────────────────────────────
# Separado do estágio "deps" porque o vite/react só servem para compilar; não
# faz sentido carregar isso na imagem final.
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── 4. Imagem final ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# --init faz o Node rodar sob um init de verdade, que recolhe processos zumbis
# e repassa SIGTERM direito no deploy.
RUN apk add --no-cache tini wget

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build     /app/dist         ./dist
COPY server                             ./server
COPY package.json                       ./

# Não roda como root: se alguém escapar do processo, escapa sem privilégio.
USER node

EXPOSE 3000

# O EasyPanel usa isso para saber se o container subiu de verdade. O /api/health
# dá um "select 1" no Postgres, então healthy aqui significa "banco respondendo".
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.js"]
