# syntax=docker/dockerfile:1

# ---- Stage 1: Build ----
# Hard Rule #2: pin Node via the pnpm runtime, not the base image.
# The official `ghcr.io/pnpm/pnpm:12` base bundles pnpm 12.x; we activate the
# project's declared `packageManager` (pnpm@12.3.4) via corepack and pin Node
# 24 with `pnpm runtime set node 24 -g` so the project owns the Node version.
FROM ghcr.io/pnpm/pnpm:12 AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Hard Rule #3: keep the pnpm store in a BuildKit cache mount — never bake it
# into a layer. The mount lives at /var/cache/pnpm (NOT /pnpm/store — that
# path is owned by pnpm's managed runtime; mounting a cache over it would
# mask the node binary during the RUN, per the pnpm Docker docs).
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm runtime set node 24 -g \
 && pnpm install --frozen-lockfile --store-dir /var/cache/pnpm

# Copiar el resto del código fuente
COPY . .

# Build de producción de Angular
RUN pnpm run build

# ---- Stage 2: Development (hot-reload) ----
FROM ghcr.io/pnpm/pnpm:12 AS development

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Same cache mount as builder so dev rebuilds share the store with CI.
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm runtime set node 24 -g \
 && pnpm install --frozen-lockfile --store-dir /var/cache/pnpm

# Copiar el resto del código fuente
COPY . .

# Exponer puerto de desarrollo
EXPOSE 4200

# Comando para desarrollo con hot-reload
CMD ["pnpm", "run", "start", "--", "--host", "0.0.0.0"]

# ---- Stage 3: Servir con Nginx ----
FROM nginx:alpine AS production

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Register .mjs as application/javascript in nginx mime.types.
# nginx does not include .mjs by default; browsers block ES modules
# served with wrong MIME type. We patch mime.types here because
# nginx does not allow `include` inside a `types {}` block.
RUN sed -i 's|application/javascript\s*js;|application/javascript js mjs;|' /etc/nginx/mime.types

# wget is not in nginx:alpine by default; install it for the HEALTHCHECK.
# A future improvement: add a /health location to nginx.conf and probe that
# endpoint instead of /, which will fail to detect a wedged SPA route.
RUN apk add --no-cache wget

# Copiar el build de Angular al directorio de Nginx
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

# Image-level healthcheck. compose.yaml may still override per-service.
# nginx runs as root here to bind port 80 (rootless variant is a larger refactor
# that changes the external port; out of scope for this change).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
