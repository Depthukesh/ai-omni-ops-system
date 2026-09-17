# 2026-09-17 标准运行态安装/更新指引与 OpenClaw 安装中心同步

## 1. 背景

本轮排查里同时暴露了三类问题：

1. 新机器照着版本页和 README 的旧命令执行 `docker compose ... up -d --build postgres server web`，容易继续沿用过时的首装口径。
2. 另一台新机器即使重新 `git clone` 后再构建，也会在 `apps/server/src/modules/openclaw/openclaw.service.ts` 因已提交的语法断裂直接卡死在 `tsc`。
3. OpenClaw 安装中心、MCP 真源、Skill ZIP 说明和站内结构口径，必须继续跟当前网站结构保持一致，不能还把 `达人合作` 说成挂在 `投流获客` 下的旧子板块。

因此这次不是单点修一个 Dockerfile，而是把：

- 标准运行态安装/更新指引
- OpenClaw MCP / Skill 口径
- `达人合作` 独立工作台的对外说明
- `openclaw.service.ts` / MCP 脚本中的语法断裂

一次性收口。

## 2. 本次改动

### 2.1 版本页与 README 统一改成新的标准运行态命令

更新：

- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `apps/server/src/modules/system-update/system-update.service.ts`
- `README.md`

收口后：

- 首次安装明确改为：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml up -d --build --force-recreate db-init server web
```

- 不再继续把 `postgres server web` 当成推荐首装口径
- 更新命令改为先 `git fetch --all --prune` / `git pull --ff-only`，再：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml up -d --build --force-recreate server web
```

- 只有命中 schema 或初始化链时，才额外补跑：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml run --rm db-init
```

- 安装提醒里补齐：
  - Docker Hub 网络 / 代理 / IPv6-DNS 排查
  - 如果要复现当前交付分支，不要只 clone 默认分支，要先切到对应远端分支
  - 如果 `server` 构建失败，应优先抓完整 TypeScript 日志，而不是只看 compose 最后一行

### 2.2 修复 OpenClaw 主服务与 MCP 脚本中的已提交语法断裂

更新：

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `scripts/openclaw-ai-omni-mcp-server.mjs`

本次补齐了多处已提交的语法坏块，包括：

- MCP 工具数组对象缺失的 `},`
- `switch case` 中缺失的 `});`
- 由前一处未闭合导致的连锁 `TS1136 / TS1137 / TS1005`

这样 fresh clone 后再执行 Docker 构建，不会继续稳定死在 `openclaw.service.ts` 的语法解析阶段。

### 2.3 `达人合作` 改成独立一级工作台，并同步到 OpenClaw 对外口径

更新：

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `scripts/openclaw-ai-omni-mcp-server.mjs`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`
- `docs/changes/2026-09-10-paid-acquisition-creator-cooperation-workspace.md`

当前对外真相改为：

- `投流获客 /paid-acquisition`
  - 只承接腾讯投流获客列表
- `达人合作 /creator-cooperation`
  - 承接达人匹配、达人跟踪、合作作品跟踪

OpenClaw / MCP / Skill 中对应的 `workspaceScope` 也同步从旧的 `paid_acquisition` 收口到：

- `creator_cooperation`

### 2.4 OpenClaw 安装中心与 Skill 真源补充更新提醒

更新：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `docs/openclaw/skill-package/SKILL.md`
- `docs/openclaw/skill-package/README.md`

补齐内容包括：

- Skill 默认覆盖域新增：
  - `投流获客`
  - `达人合作`
- 安装中心的 Skill 安装摘要、步骤、提醒中明确：
  - 如果网站标准运行态更新提示涉及 `Skill / MCP`
  - 需要回到 `个人中心 -> OpenClaw 安装中心`
  - 重新复制 MCP 片段并重新同步 Skill ZIP / Git 安装指令

这样网站升级后，不会继续让客户端沿用旧的 Skill 文案或旧的 MCP 配置。

## 3. 影响范围

### 3.1 直接影响

- 标准运行态新机器安装
- 标准运行态已有工作区更新
- OpenClaw 安装中心展示的 MCP / Skill 说明
- Skill ZIP 与 Git 安装真源
- `达人合作` 对外页面与 workspace scope 口径
- `openclaw.service.ts` 的 Docker / TypeScript 构建稳定性

### 3.2 刻意避免的副作用

- 没有改 Docker 对外端口
- 没有改 `db-init -> server -> web` 的大体启动职责
- 没有改 OpenClaw 安装令牌鉴权模式
- 没有把达人合作再塞回投流获客旧结构

## 4. 验证

已做：

- `npm run build:server`
  - 当前工作区可通过
- `npm run build:web`
  - 代码编译已通过，当前本机在 Next.js `Collecting page data` 阶段命中 Node 堆内存不足，需要更大 `NODE_OPTIONS` 才能跑完整站生产构建

建议继续补做：

```powershell
docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build --force-recreate db-init server web
```

以及标准运行态更新链：

```powershell
git fetch --all --prune
git pull --ff-only
docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build --force-recreate server web
```

如本次更新涉及 schema 或初始化链，再补：

```powershell
docker compose -f "docker/docker-compose.local-postgres.yml" run --rm db-init
```

## 5. 后续建议

- 如果默认分支仍要继续给新用户直接 clone 安装，后续应把这批已验证改动并回默认交付分支，避免用户 clone 默认分支后再次落回旧代码。
- 标准运行态版本页未来可以继续考虑把“当前交付分支”显式展示给用户，减少 fresh clone 时误停在默认分支的概率。
