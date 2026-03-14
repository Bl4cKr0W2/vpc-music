FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile --filter @vpc-music/web --filter @vpc-music/shared

COPY shared/ ./shared/
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web
RUN pnpm build

# ── Serve with Nginx ──────────────────────────────
FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
