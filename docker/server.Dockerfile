FROM node:22-bookworm-slim

WORKDIR /app

RUN npm install -g pnpm@10.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/prompt-runtime/package.json packages/prompt-runtime/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN npm run prisma:generate && npm run build:server

EXPOSE 3011

CMD ["node", "apps/server/dist/apps/server/src/main.js"]
