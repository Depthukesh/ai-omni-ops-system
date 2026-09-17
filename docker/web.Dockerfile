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

# Next standalone server expects static assets and public files beside server.js.
RUN mkdir -p /app/apps/web/.next/standalone/apps/web/.next/static \
    && cp -R /app/apps/web/.next/static/. /app/apps/web/.next/standalone/apps/web/.next/static/ \
    && if [ -d /app/apps/web/public ]; then mkdir -p /app/apps/web/.next/standalone/apps/web/public && cp -R /app/apps/web/public/. /app/apps/web/.next/standalone/apps/web/public/; fi

EXPOSE 3001

CMD ["sh", "-lc", "cd /app/apps/web && HOSTNAME=0.0.0.0 PORT=3001 node .next/standalone/apps/web/server.js"]
