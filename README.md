# AI全域运营系统

一套已经进入真实业务阶段的品牌运营系统，不再是早期骨架仓库。当前主线同时覆盖：

- 品牌增长策略
- 内容获客（某书 / 某音/某号 / 公众号）
- GEO 获客
- 全网获客
- 设计工作台
- OpenClaw / MCP / Skill 对接
- Docker 标准运行态与 `local-single-user` 单机交付

更完整的系统结构请直接看：

- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`

## 当前已落地能力

- 品牌账号、邀请码注册、登录、品牌切换、多用户协作
- 品牌增长策略：品牌资料、收集数据、增长报告、半年营销规划、营销日历
- 内容获客工作台：
  - 某书：营销策划、创作素材、每日计划、每日复盘、作品列表
  - 某音/某号：营销策划、数字人、RunningHub、创作素材、作品列表
  - 公众号：配置初始化、创作工作流、发布历史、创作素材、作品列表
- 设计工作台：图片、HTML、PPT、视频方案
- GEO 获客与全网获客工作台
- 个人中心：技能、团队、第三方接口、OpenClaw、版本与升级
- OpenClaw 安装中心、正式安装令牌、MCP 地址、Skill ZIP 导出

## 当前推荐部署方式

### 1. Docker 标准运行态

这是当前最适合给别人部署、也最接近“长期可维护”的方案。

当前仓库已提供：

- PostgreSQL
- 主站 `server`
- 主站 `web`

对应 compose 文件：

```text
docker/docker-compose.local-postgres.yml
```

默认端口：

- 主站前端：`13001`
- 主站后端：`13011`
- PostgreSQL：`15432`

当前标准运行态的重要特点：

- 素材与受控存储可统一挂到宿主机目录
- 个人中心 `版本与升级` 支持“更新通知 + 操作引导”
- 配置 `STANDARD_RUNTIME_UPDATE_MANIFEST_URL` 后，可在页面看到更新说明、容器重建命令和 Skill 重导提醒

安装这套标准运行态前，电脑至少需要：

- `Git for Windows`
  - 用于下载项目代码与后续执行 `git pull`
- `WSL 2`
  - Docker Desktop 在 Windows 下推荐依赖的 Linux 运行环境
- `Docker Desktop for Windows`
  - 用于拉起 `postgres / server / web` 容器

安装完成后的最小自检命令：

```powershell
git --version
wsl --status
docker version
```

额外依赖提醒：

- 需要可访问 GitHub 与 Docker Hub 的网络
- 如果当前网络依赖代理，Git 与 Docker Desktop 都要分别配置代理
- 首次启动至少需要可用的 `13001`、`13011`、`15432` 端口
- 首次拉镜像与构建容器时，需要预留足够磁盘空间

### 2. local-single-user 单机安装态

适合本地单机交付，不要求用户机器预装 Node。

当前交付基线仍然是：

- `zip`
- `install-local-single-user.cmd`
- `start-local-single-user.cmd`
- 随包 `node.exe`

不是仓库内直接放 `.exe` 安装器。

## 快速开始

### 方式 A：Docker 标准运行态

1. 安装并确认必备软件

```powershell
git --version
wsl --status
docker version
```

2. 下载项目代码

```powershell
cd "D:\aiproject"
git clone https://github.com/Depthukesh/ai-omni-ops-system.git
cd "D:\aiproject\ai-omni-ops-system"
```

如果你要切到指定分支，例如当前线上交付分支，可以执行：

```powershell
git pull origin push_version_update_3384a55
```

3. 准备环境变量

```powershell
Copy-Item .env.docker.example .env
```

4. 启动主站

```powershell
docker compose -f docker/docker-compose.local-postgres.yml up -d --build postgres server web
```

首次启动会自动执行一次 `db-init`：

- 自动建表
- 自动同步注册邀请码
- 自动准备演示账号 `13800000000 / 123456`
- 自动补最小默认品牌，不再要求手动额外执行 `pnpm db:init`

如果中途打断过首次启动，想手动补一次初始化，可以执行：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml run --rm db-init
```

5. 打开：

```text
http://127.0.0.1:13001
```

6. 默认演示账号

```text
手机号：13800000000
密码：123456
```

7. 更新步骤与命令

```powershell
git pull origin push_version_update_3384a55
docker compose -f docker/docker-compose.local-postgres.yml up -d --build server web
```

如果这次更新涉及 schema 初始化链，额外补一次：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml run --rm db-init
```

如果这次更新涉及 OpenClaw Skill / MCP，同步后再到个人中心 `OpenClaw 安装中心` 按页面提示重新导出或重新导入最新 Skill 包。

### 方式 B：源码开发运行

1. 安装依赖

```powershell
pnpm install
```

2. 准备数据库与环境变量

```powershell
Copy-Item .env.example .env
pnpm db:init
```

3. 启动前后端

```powershell
pnpm dev:server:stable
pnpm dev:web:stable
```

常用构建命令：

```powershell
pnpm build:server
pnpm build:web
```

### 方式 C：生成 local-single-user 安装包

1. 安装依赖

```powershell
pnpm install
```

2. 生成 release 目录

```powershell
pnpm local:release:build
```

3. 生成 zip 分发包

```powershell
pnpm local:release:package
```

4. 产物位置：

```text
.release/artifacts/AiOmniOps-local-single-user-win-x64.zip
```

5. 解压后运行：

```text
install-local-single-user.cmd
```

## OpenClaw / MCP / Skill

当前仓库已经不是“未来再接 OpenClaw”，而是已经有正式接入链路。

当前已覆盖：

- OpenClaw 安装中心
- 安装令牌
- MCP 服务入口
- Skill ZIP 导出
- Skill 文档 fallback

推荐直接阅读：

- `docs/openclaw/README.md`
- `docs/openclaw/OpenClaw正式安装与网站对接说明.md`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`

相关命令：

```powershell
pnpm openclaw:mcp:server
pnpm smoke:openclaw:mcp
pnpm smoke:openclaw:adapter
```

## 仓库结构

- `apps/web`
  - 官网首页、认证、各工作台、个人中心、后台管理台
- `apps/server`
  - Auth、Brands、Collectors、Works、Publishing、OpenClaw、ThirdPartyPlatforms 等后端模块
- `packages/config`
  - 配置相关共享包
- `packages/prompt-runtime`
  - 提示词与运行时能力
- `packages/shared`
  - 前后端共享类型与常量
- `packages/ui`
  - UI 共享层
- `docs`
  - 当前真相文档、变更记录、OpenClaw 文档、历史规划
- `docker`
  - Docker 部署相关文件
- `scripts`
  - 构建、启动、OpenClaw、单机交付脚本

## 常用入口

- 官网首页：`/`
- 登录页：`/login`
- 品牌增长：`/brand-growth`
- 内容获客：`/xiaohongshu`
- GEO 获客：`/geo`
- 全网获客：`/all-network-growth`
- 设计工作台：`/more-features/design`
- 个人中心：`/personal-center`
- 后台：`/admin`

## 当前测试账号

- 演示账号手机号：`13800000000`
- 演示密码：`123456`
- 演示品牌：`默认演示品牌`

## 文档入口

- 系统总地图：`docs/site-map.md`
- Mermaid 结构图：`docs/site-map-mermaid.md`
- 文档总入口：`docs/README.md`
- 工程规范：`docs/engineering-standards.md`
- OpenClaw 文档入口：`docs/openclaw/README.md`
- 变更记录：`docs/changes/*.md`

## 说明

- 这个仓库当前以 Windows 开发环境为主，但 Docker 标准运行态是优先推荐的对外交付方式
- 如果你是给别人部署，请优先走 Docker + PostgreSQL 标准运行态
- 如果你是做 OpenClaw 对接，不要只看根目录 README，直接进入 `docs/openclaw/`
- 如果你要确认页面、模块和主链路，以 `docs/site-map.md` 为准，不要以历史截图或旧 README 为准
