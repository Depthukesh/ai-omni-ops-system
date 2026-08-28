# 2026-08-28 Docker 标准运行态 web 容器 Corepack 运行时下载修复

## 背景

标准 Docker 运行态在用户机器上首次安装时，`postgres`、`server`、`db-init` 已经可以正常起来，但 `web` 容器会在启动阶段反复输出：

- `Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-10.0.0.tgz`

随后容器不断重启，浏览器访问 `http://127.0.0.1:13001` 只看到 `ERR_EMPTY_RESPONSE`。

真实原因不是 Next.js 业务代码，而是当前 `docker/web.Dockerfile` 运行命令仍然使用：

- `pnpm --filter web exec next start ...`

这会在容器每次启动时再触发一次 `corepack` / `pnpm` 下载；只要用户机器的 Docker 运行时网络或代理有一点不稳定，前端容器就会“镜像已构建成功，但运行期卡死在下载 pnpm”。

## 本次改动

### 1. web 容器运行时不再依赖 pnpm

更新：

- `docker/web.Dockerfile`

改动：

- 构建阶段显式执行 `corepack prepare pnpm@10.0.0 --activate`
- 容器启动命令从 `pnpm --filter web exec next start ...` 改成直接执行镜像内已安装的：
  - `node apps/web/node_modules/next/dist/bin/next start --hostname 0.0.0.0 -p 3001`

效果：

- `web` 容器启动时不再需要联网下载 `pnpm`
- 即使用户机器运行时代理不稳定，只要镜像已经构建完成，前端容器仍可正常启动

### 2. server 镜像同步把 pnpm 固定在构建期准备好

更新：

- `docker/server.Dockerfile`

改动：

- 把 `corepack enable` 补成 `corepack enable && corepack prepare pnpm@10.0.0 --activate`

效果：

- `db-init`、`server` 相关的 `pnpm` 运行链也不再依赖容器启动期临时解析包管理器
- 标准 Docker 运行态的一次性初始化链更稳

### 3. 工程规则升级

更新：

- `docs/engineering-standards.md`

新增规则：

- 标准 Docker 运行态的容器启动命令不能继续依赖运行时外网下载 `pnpm` / `corepack` 元数据
- 这类包管理器必须在镜像构建阶段准备好，避免用户现场因为代理、Docker 运行时网络或 npm registry 抖动而出现“镜像已构建，但容器启动即退出”

## 影响范围

- `docker/web.Dockerfile`
- `docker/server.Dockerfile`
- `docs/engineering-standards.md`

## 验证

建议本地按以下顺序验证：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml build server web
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
