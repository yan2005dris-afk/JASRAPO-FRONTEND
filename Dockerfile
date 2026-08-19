# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Instalar dependencias
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copiar el resto del código fuente
COPY . .

# Build de producción de Angular
RUN pnpm run build -- --configuration production

# ---- Stage 2: Development (hot-reload) ----
FROM node:22-alpine AS development

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Instalar dependencias
RUN corepack enable pnpm && pnpm install --frozen-lockfile

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

# Copiar el build de Angular al directorio de Nginx
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
