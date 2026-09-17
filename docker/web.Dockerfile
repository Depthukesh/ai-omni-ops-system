FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/prompt-runtime/package.json packages/prompt-runtime/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci --ignore-scripts

COPY . .

RUN npm run build:web

EXPOSE 3001

CMD ["sh", "-lc", "cd /app/apps/web && HOSTNAME=0.0.0.0 PORT=3001 node .next/standalone/apps/web/server.js"]
