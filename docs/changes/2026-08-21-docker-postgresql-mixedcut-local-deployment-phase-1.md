# 2026-08-21 Docker + PostgreSQL + mixedcut 本地部署第一阶段

## 背景

用户明确选择后续本地部署方案收口到：

- Docker
- PostgreSQL
- mixedcut

同时要求：

1. 素材仍能在本地电脑上管理
2. OpenClaw 后续可读取本地图片作为垫图，再调生图 / 生视频模型
3. mixedcut 与主服务共用同一份宿主机数据目录，而不是各自散落

## 本次改动

### 1. 补标准 Docker 运行态的本地存储配置

- `apps/server/src/config/app-config.service.ts`
  - 新增 `STORAGE_PROVIDER_MODE`
  - 新增 `MATERIAL_LIBRARY_BASE_ROOT`
  - 新增 `MATERIAL_LIBRARY_DISPLAY_ROOT`
  - 新增 `MANAGED_STORAGE_ROOT`
  - 新增 `MANAGED_STORAGE_DISPLAY_ROOT`
  - 允许标准运行态显式指定容器内素材根、容器内站内存储根，以及前端展示给用户的宿主机路径

### 2. 补宿主机显示路径与容器实际路径分离

- `apps/server/src/storage/oss-storage.service.ts`
  - 新增本地显示路径解析
  - 本地 fallback 模式下可分别返回：
    - 容器真实文件路径
    - 页面 / OpenClaw 返回给用户的宿主机路径
- `apps/server/src/modules/openclaw/openclaw-creative-material.service.ts`
- `apps/server/src/modules/openclaw/openclaw-geo-content.service.ts`
  - 改为优先返回宿主机显示路径，避免页面出现 `/data/...` 这类容器路径

### 3. 新增 Docker 脚手架

- `.env.docker.example`
  - 提供 PostgreSQL、主服务、前端、mixedcut、宿主机挂载根的环境模板
  - 默认把宿主机映射端口收口到 `13001 / 13011 / 15000 / 15432 / 15501`，避免与本机已存在的 `3001 / 3011 / 5000` 现场冲突
  - 补充默认启动策略说明：先起 `postgres + server + web`，需要 mixedcut 时再显式加 profile
- `.dockerignore`
  - 避免把 `node_modules`、构建产物、调试日志和本地数据目录带进镜像上下文
- `docker/server.Dockerfile`
- `docker/web.Dockerfile`
  - 提供 Nest 与 Next 的第一阶段镜像构建脚手架
  - 移除对不存在的 `packages/config/package.json` 的复制，避免镜像在安装依赖前就失败
  - 在 `server` 镜像构建前补 `pnpm prisma:generate`，避免 Docker 环境里 Prisma Client 未生成导致 `build:server` 失败
  - 在 `server` 镜像里补装 `openssl`，避免 Prisma 在 slim 镜像里运行时缺少 openssl 依赖告警
  - `web` 镜像安装依赖时改用 `pnpm install --ignore-scripts`，避免前端镜像被根工作区里的 Prisma / 原生依赖脚本拖慢或卡住
  - `web` 镜像启动命令改为 `pnpm --filter web exec next start --hostname 0.0.0.0 -p 3001`，避免 `--` 参数被错误传给 `next start`
- `docker/docker-compose.local-postgres-mixedcut.yml`
  - 编排：
    - `postgres`
    - `server`
    - `web`
    - `mixedcut`
  - 默认把 `mixedcut` / `mixedcut-mcp` 收口为按需启用的 profile，避免重型镜像构建阻塞主链验证

### 3.1 补 mixedcut 样本镜像缺失的 `pip.conf`

- `workspace-notes/mixedcut_integration_bundle/pip.conf`
  - 补齐 mixedcut 样本 `Dockerfile` 依赖的 pip 镜像配置，避免构建阶段直接因 `COPY pip.conf` 失败
- `workspace-notes/mixedcut_integration_bundle/Dockerfile`
  - 在安装 `requirements.txt` 前显式安装 CPU 版 `torch / torchvision / torchaudio`
  - 避免 Docker 在本地 CPU 场景下默认把 CUDA 依赖整串拉进镜像，导致 mixedcut 构建时间和镜像体积被不必要放大

### 3.2 补 server 镜像运行依赖

- `apps/server/package.json`
  - 补 `sharp` 依赖，和当前 `works.service.ts` 的动态导入保持一致，避免 Docker 构建时找不到模块
  - 补 `express` 运行依赖，避免 `server` 容器启动时 `MODULE_NOT_FOUND: express`
- `package.json`
  - 新增 `pnpm.onlyBuiltDependencies` 白名单，显式允许 `sharp / prisma / @prisma/client / @prisma/engines / esbuild / @ffmpeg-installer/linux-x64` 执行原生构建脚本，降低 Docker 运行时缺原生产物的风险

### 4. 新增正式开发方案文档

- `docs/docker-postgresql-mixedcut-local-deployment-plan.md`
  - 收口这条部署路线的目标、风险、阶段拆分与下一步建议

## 影响范围

- Docker 本地部署基线
- OpenClaw 素材本地路径展示
- mixedcut 共享挂载根
- PostgreSQL 容器化基线

## 验证

- `pnpm build:server`
- `pnpm prisma:generate`
- `docker build -f docker/server.Dockerfile -t ai-omni-server-debug .`
- `docker build -f docker/web.Dockerfile -t ai-omni-web-debug .`
- `docker compose -f docker/docker-compose.local-postgres-mixedcut.yml config`

## 当前边界

- 本次还没有把 OpenClaw 全链路统一切到 `assetId`
- 本次 mixedcut 仍基于 `workspace-notes/mixedcut_integration_bundle` 样本源码构建
- 本次还没有补 Docker 一键安装、健康检查与升级脚本
