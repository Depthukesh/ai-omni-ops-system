FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/prompt-runtime/package.json packages/prompt-runtime/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm build:web

EXPOSE 3001

CMD ["pnpm", "--filter", "web", "exec", "next", "start", "--hostname", "0.0.0.0", "-p", "3001"]
