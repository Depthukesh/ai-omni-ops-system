# 2026-08-28 Docker 标准运行态 web 容器 Corepack 运行时下载修复

## 背景

标准 Docker 运行态在用户机器上首次安装时，`postgres`、`server`、`db-init` 已经可以正常起来，但 `web` 容器会在启动阶段反复输出：

- `Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-10.0.0.tgz`

随后容器不断重启，浏览器访问 `http://127.0.0.1:13001` 只看到 `ERR_EMPTY_RESPONSE`。

第一轮修复已经把 `web` 运行命令从 `pnpm exec next start` 改成直接执行 `next` 二进制，但在真实用户机器继续验证时，仍发现：

- `docker compose build web` 可能先失败在 `RUN pnpm install ...`
- 失败后 `docker compose up` 会继续复用本地旧镜像
- 用户看到的现象仍然像“运行时继续刷 `Corepack is about to download ...`”

所以真实根因不只是运行命令，还包括 Docker 镜像构建阶段本身仍然依赖 `corepack` 解析 `pnpm`。

历史上的直接触发点是 `docker/web.Dockerfile` 运行命令仍然使用：

- `pnpm --filter web exec next start ...`

这会在容器每次启动时再触发一次 `corepack` / `pnpm` 下载；只要用户机器的 Docker 运行时网络或代理有一点不稳定，前端容器就会“镜像已构建成功，但运行期卡死在下载 pnpm”。

## 本次改动

### 1. 构建期不再依赖 corepack

更新：

- `docker/web.Dockerfile`
- `docker/server.Dockerfile`

改动：

- 删除 `corepack enable && corepack prepare pnpm@10.0.0 --activate`
- 改为在镜像构建阶段直接执行：
  - `npm install -g pnpm@10.0.0`

效果：

- `pnpm` 通过明确安装的全局二进制提供
- 构建阶段不再额外走 `corepack` 解析链

### 2. 运行期继续避免 pnpm

更新：

- `docker/web.Dockerfile`
- `docker/docker-compose.local-postgres.yml`

改动：

- `web` 容器运行命令从 `pnpm --filter web exec next start ...` 改成直接执行镜像内已安装的：
  - `node apps/web/node_modules/next/dist/bin/next start --hostname 0.0.0.0 -p 3001`
- `db-init` 命令从：
  - `pnpm db:init:standard`
  改成：
  - `npm run db:init:standard`

效果：

- `web` 与 `db-init` 运行时都不再依赖 `pnpm` / `corepack`
- 即使用户机器 Docker 运行时代理不稳定，也不会在容器启动阶段反复命中 `Corepack is about to download ...`

### 3. 构建脚本同步切到 npm run

更新：

- `docker/web.Dockerfile`
- `docker/server.Dockerfile`

改动：

- `pnpm build:web` 改成 `npm run build:web`
- `pnpm prisma:generate && pnpm build:server` 改成 `npm run prisma:generate && npm run build:server`

效果：

- 构建阶段除 `pnpm install` 外，不再继续把 `pnpm` 作为脚本入口
- 启动链更贴近 Node 自带的 `npm` 运行口径

### 4. 工程规则升级

更新：

- `docs/engineering-standards.md`

新增规则：

- 标准 Docker 运行态的容器不能继续依赖 `corepack` 在构建期或运行期临时解析 `pnpm`
- 包管理器必须在镜像构建阶段通过确定性方式准备好
- 运行时尽量直接执行应用或 `npm run ...`

## 影响范围

- `docker/web.Dockerfile`
- `docker/server.Dockerfile`
- `docker/docker-compose.local-postgres.yml`
- `docs/engineering-standards.md`

## 验证

建议本地按以下顺序验证：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml down --remove-orphans
docker compose -f docker/docker-compose.local-postgres.yml build --no-cache server web
docker compose -f docker/docker-compose.local-postgres.yml up -d postgres server web
docker compose -f docker/docker-compose.local-postgres.yml ps
docker compose -f docker/docker-compose.local-postgres.yml logs --tail=100 web
```

预期结果：

- `web` 容器不再反复输出 `Corepack is about to download`
- `web` 容器保持 `Up`
- 浏览器可正常打开 `http://127.0.0.1:13001`

## 结果

这次修复后，标准 Docker 运行态的前端容器启动链从“运行时还要联网取包管理器”收口为“构建时准备好、运行时只启动应用”，更适合真实用户机器的一次性安装与长期更新场景。

## 补充修复：web 容器启动目录

在真实用户机器继续验证时，又进一步暴露出一个更靠后的问题：

- `web` 容器不再刷 `Corepack is about to download ...`
- 但启动日志改成：
  - `Could not find a production build in the '.next' directory`

这说明镜像已经完成 `next build`，但 `next start` 启动时所处工作目录不对：它在 `/app` 查找 `.next`，而真正产物位于 `/app/apps/web/.next`。

因此继续补了一刀：

- 更新 `docker/web.Dockerfile`
- `CMD` 从直接在 `/app` 下执行 `next start`
- 改成先 `cd /app/apps/web`，再执行：
  - `node node_modules/next/dist/bin/next start --hostname 0.0.0.0 -p 3001`

这样 `next start` 会在正确目录下查找 `.next`，`web` 容器就不会再因为“生产构建目录找错位置”而重启。
