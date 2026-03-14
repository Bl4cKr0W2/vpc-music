FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace root files needed for install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY shared/package.json ./shared/

# Install deps
RUN pnpm install --frozen-lockfile --filter @vpc-music/api --filter @vpc-music/shared

# Copy source
COPY shared/ ./shared/
COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "src/index.js"]
