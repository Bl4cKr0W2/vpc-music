# ── Build stage ───────────────────────────────────
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

COPY shared/ shared/
COPY apps/web/ apps/web/
RUN pnpm --filter @vpc-music/web build

# ── Serve with nginx ─────────────────────────────
FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
