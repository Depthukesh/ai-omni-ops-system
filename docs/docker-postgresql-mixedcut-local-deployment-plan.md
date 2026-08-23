# Docker + PostgreSQL + mixedcut 本地部署开发方案

## 1. 当前进度

### 已完成

- 明确本轮目标是把本地部署方案从 `SQLite 单机` 收口到 `Docker + PostgreSQL + mixedcut`
- 明确素材、作品、OpenClaw 上传文件仍以宿主机目录为真源，不能只放容器内
- 后端已补第一批 Docker 运行态配置能力：
  - `STORAGE_PROVIDER_MODE`
  - `MATERIAL_LIBRARY_BASE_ROOT`
  - `MATERIAL_LIBRARY_DISPLAY_ROOT`
  - `MANAGED_STORAGE_ROOT`
  - `MANAGED_STORAGE_DISPLAY_ROOT`
  - `MIXEDCUT_INSTALL_ROOT`
- 新增第一批 Docker 脚手架：
  - `docker/server.Dockerfile`
  - `docker/web.Dockerfile`
  - `docker/docker-compose.local-postgres-mixedcut.yml`
  - `.env.docker.example`

### 部分完成

- mixedcut 已接入正式 compose 编排，构建真源当前收口到仓库正式目录 `mixedcut_integration_bundle/`
- 为避免 `mixedcut` 镜像构建阻塞主链，compose 默认启动已收口为 `postgres + server + web`，需要 mixedcut 时再显式启用 `mixedcut` profile
- 主服务已能按 Docker 标准运行态读取宿主机挂载目录，但 OpenClaw / RunningHub / 其它上传链路尚未全部补完“宿主机显示路径 vs 容器实际路径”的统一映射

### 尚未开始

- 一键启动脚本与 Docker 健康检查闭环
- OpenClaw 直接消费 `assetId` 的统一素材解析层
- mixedcut 真实上传、任务发起、进度轮询代理
- Docker 本地发布/升级说明页与运维脚本

### 风险 / 不匹配

- 现有仓库是 `Next.js + NestJS` 分离结构，实际落 Docker 时更自然是 `web + server + postgres + mixedcut` 四服务，而不是纯三容器
- mixedcut 运行时 `config` 与镜像构建源码已统一收口到仓库内 `mixedcut_integration_bundle/`
- 若页面继续直接展示容器路径 `/data/...`，用户在 Windows 本地无法直接定位素材；因此必须保留 display path 映射层

## 2. 产品理解

### 产品目标

当前系统是一个本地可运行的 AI 全域运营工作台，核心包括：

- 品牌增长与内容获客工作台
- OpenClaw 驱动的素材、报告、评论获客与 GEO 内容链
- 某音/某号视频混剪能力
- 个人中心第三方接口配置与模型复用

### 本轮确认范围

用户已确认选择：

- `Docker + PostgreSQL + mixedcut`
- 素材仍要能在本地电脑上管理
- OpenClaw 需要支持“本地图片作为垫图 -> 调生图/生视频模型”

### 当前最小可交付目标

本轮不是一次性做完整容器化产品，而是先打通最小可信基线：

1. 主服务与前端具备 Docker 运行脚手架
2. PostgreSQL 有独立持久化目录
3. mixedcut 有独立服务位与共享配置根
4. 素材库 / 站内存储 / mixedcut 运行目录全部挂到宿主机
5. 后端能区分容器内路径与前端展示给用户的本地路径

## 3. MVP 阻塞点

### 阻塞 1：标准运行态本地存储口径不足

此前本地受控存储主要偏 `local-single-user`，Docker 标准运行态缺少显式配置入口。

### 阻塞 2：本地素材路径与容器路径混用

如果不拆开：

- 容器内读取路径
- 页面展示路径

则用户在页面看到的会是 `/data/materials/...`，不能直接在 Windows 文件系统里使用。

### 阻塞 3：mixedcut 镜像真源与安装根分离

mixedcut 运行配置要写到当前安装根 `config/ai_config.json`，但容器镜像构建真源在 `workspace-notes/mixedcut_integration_bundle`。

同时样本源码的 `Dockerfile` 依赖 `pip.conf`；如果目录里缺少该文件，会在构建阶段直接失败，导致主服务联调也被拖住。

### 阻塞 4：OpenClaw 还没完全切到素材 ID 口径

当前很多链路仍能返回或消费本地路径，后续要进一步收口成：

- 网站内统一 `assetId`
- 服务层解析为容器可读路径 / 上传文件流 / 临时 URL

## 4. 推荐执行路径

### 阶段 1：部署基线

目标：

- 让主服务、前端、PostgreSQL、mixedcut 具备统一 Docker 编排

代码落点：

- `docker/*.Dockerfile`
- `docker/docker-compose.local-postgres-mixedcut.yml`
- `.env.docker.example`
- `apps/server/src/config/app-config.service.ts`
- `apps/server/src/storage/oss-storage.service.ts`

验收标准：

- `docker compose config` 可通过
- 后端可识别 Docker 标准运行态的本地存储根
- OpenClaw / GEO 返回的本地路径展示为宿主机路径

### 阶段 2：素材与 mixedcut 共享根

目标：

- 把 `素材库 / 站内存储 / mixedcut` 统一到宿主机根目录下

建议目录：

```text
D:\AiOmniOpsData
  ├─ materials
  ├─ storage
  ├─ mixedcut
  ├─ postgres
  └─ logs
```

验收标准：

- mixedcut `config/ai_config.json` 由主服务写入宿主机目录
- mixedcut 容器能读到同一份配置
- 页面与 OpenClaw 返回的路径是本地 Windows 路径

### 阶段 3：OpenClaw 素材解析层

目标：

- 不再把裸本地路径当作主业务协议

建议方向：

- 站内统一传 `assetId`
- 服务层解析：
  - 容器读本地挂载文件
  - 或转 multipart 上传
  - 或生成临时 URL

验收标准：

- OpenClaw 生图 / 生视频 / RunningHub 上传节点不再依赖人工拼路径

### 阶段 4：本地运维闭环

目标：

- 给本地用户一套可重复启动、可查看日志、可迁移数据的 Docker 运维口径

建议补齐：

- 启停脚本
- 健康检查脚本
- 宿主机目录初始化脚本
- Docker 版安装与升级文档

## 5. 当前建议

短期内按下面顺序继续推进最稳：

1. 完成 compose 和 Dockerfile 可验证闭环
2. 先验证默认 `postgres + server + web` 三容器能稳定启动
3. 补 Docker 目录初始化说明，并保留 `mixedcut` profile 作为按需启用路径
4. 把 mixedcut 同步接口改成默认面向共享挂载根
5. 开始收口 OpenClaw 的 `assetId` 素材解析层

## 6. 当前默认端口

为避免本机已有服务占用常见端口，Docker 版第一阶段默认使用独立宿主机端口：

- Web：`13001 -> 3001`
- API：`13011 -> 3011`
- PostgreSQL：`15432 -> 5432`
- mixedcut：`15000 -> 5000`
- mixedcut MCP：`15501 -> 5501`

容器内端口仍保持原有口径，后续如需改成其它宿主机端口，只需要调整 `.env.docker.example` 中对应变量，不要在业务代码里写死。

## 7. 当前启动建议

- 默认启动主链：`docker compose --env-file .env.docker.example -f docker/docker-compose.local-postgres-mixedcut.yml up --build -d`
- 需要 mixedcut 时再补：`--profile mixedcut`
- 需要 mixedcut MCP 时再补：`--profile mixedcut-mcp`

当前仓库内 `mixedcut_integration_bundle/` 已补齐：

- `Dockerfile`
- `Dockerfile.mcp`
- `requirements-mcp.txt`
- `mcp_server.py`

也就是说，公开仓库 clone 后，`mixedcut-mcp` 不再只是 compose 里的占位服务，而是可以被真实构建的独立 HTTP MCP bridge。
