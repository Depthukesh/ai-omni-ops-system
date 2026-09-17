# 2026-09-17 Docker 标准运行态依赖锁定收口

## 1. 背景

在另一台全新机器执行：

```powershell
docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build --force-recreate db-init server web
```

会在 `server` 镜像构建阶段失败，日志停在：

```text
npm error location /app/apps/server
npm error command sh -c tsc -p tsconfig.json
...
target server: failed to solve: process "/bin/sh -c npm run prisma:generate && npm run build:server" did not complete successfully: exit code: 2
```

表面上看像是 `server` 代码编译失败，但同一版本在已有开发机本地却可以通过 `npm run build:server`，说明问题更像是“不同机器构建时依赖解析结果不一致”，而不是单纯业务代码已经稳定可复现地报错。

## 2. 真实原因

当前 Docker 标准运行态的 `server` / `web` Dockerfile 原先使用：

- `pnpm install --no-frozen-lockfile`

但仓库根目录实际只有：

- `package-lock.json`

并没有：

- `pnpm-lock.yaml`

这意味着 Docker 在用户机器首次构建时，会在容器里重新解析一套新的 pnpm 依赖树。对开发机来说，这一步可能恰好仍能通过；但在另一台全新机器、不同时间点或不同 registry 回包下，就可能把某个子依赖解到不同版本，最终在 `tsc` 阶段暴露为类型错误并直接中断镜像构建。

因此截图里的 `exit code: 2` 不是 compose 命令本身的问题，也不是 PostgreSQL / db-init 运行时的问题，而是：

1. `docker compose up --build` 触发了 `server` 镜像重建
2. `docker/server.Dockerfile` 在构建阶段执行 `npm run prisma:generate && npm run build:server`
3. 由于容器内依赖解析不受 lock 文件约束，最终在 `tsc` 阶段失败

## 3. 本次收口

更新：

- `docker/server.Dockerfile`
- `docker/web.Dockerfile`

改动：

- 不再在 Docker 镜像里用 `pnpm install --no-frozen-lockfile`
- 改为直接复制仓库现有的 `package-lock.json`
- 构建阶段统一使用 `npm ci`
- 同时移除 Dockerfile 中仅为 `pnpm install` 服务的全局 `pnpm` 安装步骤

这样 Docker 标准运行态会与仓库现有 lock 文件保持一致，减少“同一提交、不同机器、依赖解析结果不同”的隐性漂移。

## 4. 影响范围

### 4.1 直接影响

- Docker 标准运行态的 `server` 镜像构建
- Docker 标准运行态的 `web` 镜像构建
- 新机器首次安装
- 用户机器上的 `docker compose up -d --build ...` 重建链路

### 4.2 刻意避免的副作用

- 没有改业务代码
- 没有改数据库初始化口径
- 没有改 `db-init -> server -> web` 的启动顺序
- 没有改现有对外安装命令

## 5. 验证建议

至少验证以下两组：

```powershell
docker compose -f "docker/docker-compose.local-postgres.yml" build server web
docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build --force-recreate db-init server web
```

若仍失败，必须继续补抓完整构建日志，而不是只看 compose 最后一行摘要。建议至少追加：

```powershell
docker compose -f "docker/docker-compose.local-postgres.yml" build --no-cache server
docker compose -f "docker/docker-compose.local-postgres.yml" logs --tail=200 server
```

重点看真正的 TypeScript 报错文件和报错行，而不是只看 `exit code: 2`。

## 6. 后续建议

- 如果后续仍希望统一回到 pnpm 口径，应先在仓库中正式提交 `pnpm-lock.yaml`，再把 Docker 构建链切回 `pnpm install --frozen-lockfile`
- 在 lock 口径未统一前，不要继续让 Docker 标准运行态在用户机器上使用“无锁 pnpm 安装”
