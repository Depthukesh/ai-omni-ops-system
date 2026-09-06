# 2026-09-05 OpenChatCut Docker 启动链修正

## 变更背景

此前仓库内给 OpenChatCut 提供了一套独立 Docker 部署样板，但按该样板直接启动后，页面实际无法打开。真实排查结果不是端口没映射，而是 Docker 开发态启动链本身存在多处不兼容：

1. 直接 `npm install` 会在 Linux 容器里触发 `onnxruntime-node` 原生安装链失败
2. `sync-whisper-cli` 依赖容器内存在 `unzip`
3. `dev-profile.mjs` 依赖容器内存在 `git`
4. OpenChatCut 的 Vite dev server 默认尝试自动 `xdg-open`，容器里没有桌面环境时会输出错误

因此，原先的 `node:24-bookworm-slim + npm install + npm run dev` 只能算部署思路，不能作为当前仓库里的实际可运行样板。

## 本次改动

### 1. 新增 OpenChatCut Docker 启动镜像

新增：

- `docker/openchatcut.Dockerfile`
- `docker/openchatcut-start.sh`

当前职责：

- 基于 `node:24-bookworm-slim`
- 在镜像内补齐 `git`、`unzip`
- 启动时先执行 `npm install --ignore-scripts --package-lock=false`
- 再手动执行：
  - `node scripts/sync-mediapipe.mjs`
  - `node scripts/sync-whisper-cli.mjs`
  - `npx tsx server/agent-runs/generate-tool-catalog.mts --check`
- 最后再启动：
  - `node scripts/dev-profile.mjs --host 0.0.0.0 --port 5199 --open false`

### 2. 更新 OpenChatCut compose 样板

更新：

- `docker/docker-compose.openchatcut.yml`

主要变化：

- 不再直接使用 `node:24-bookworm-slim` 裸镜像跑 `npm install; npm run dev`
- 改为 `build` 当前仓库内的 `docker/openchatcut.Dockerfile`
- 新增独立卷：
  - `openchatcut_node_modules:/workspace/node_modules`
- 容器环境里显式补：
  - `BROWSER=none`
  - `VITE_CONFIG_NATIVE_IGNORE_WARNING=true`

### 3. 更新安装中心与公开文档

同步更新：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.md`
- `apps/web/public/docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.html`

当前统一口径：

- 启动命令改为：
  - `docker compose --env-file "docker/openchatcut.env" -f "docker/docker-compose.openchatcut.yml" up -d --build`
- 首次启动会明显更慢，因为要执行依赖安装与预处理
- `openchatcut.env.example` 需复制成 `openchatcut.env` 后再使用

## 真实验证结果

本次在本机对 Docker 启动链做了逐段验证：

1. `npm install --ignore-scripts --package-lock=false`
   - 通过
2. `node scripts/sync-mediapipe.mjs`
   - 通过
3. `node scripts/sync-whisper-cli.mjs`
   - 通过
4. `npx tsx server/agent-runs/generate-tool-catalog.mts --check`
   - 通过
5. 补齐 `git + unzip` 后启动 OpenChatCut dev server
   - 宿主机访问 `http://127.0.0.1:15199`
   - 返回 `200`

说明当前 Docker 方向是可落的，且此前页面打不开的根因已经被明确收口到启动链，而不是网络、端口或浏览器本身。

## 影响范围与保护

本次改动只针对 OpenChatCut 独立 Docker 样板，不影响：

- 主站 `server/web/postgres` Docker 运行态
- 现有品牌后台功能
- OpenClaw MCP 工具面
- 数据库 schema

也就是说，这一刀只修独立 OpenChatCut 的部署事实，不把外部剪辑系统的 Docker 运行时问题扩散回主站。

## 后续建议

下一步建议按顺序继续做两件事：

1. 用当前正式 `docker-compose.openchatcut.yml` 跑一次完整启动
2. 再从宿主机验证：
   - `http://127.0.0.1:15199`
   - `http://127.0.0.1:15199/api/external-mcp/mcp`

如果页面可打开、MCP 可连通，再继续做 OpenClaw 双 MCP 联调。 
