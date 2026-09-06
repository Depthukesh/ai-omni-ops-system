# 2026-09-06 OpenChatCut 受控 Fork 交付策略

## 背景

前一轮已经把 OpenChatCut 独立 Docker 样板、OpenClaw 统一模型网关和安装中心配置示例接入本站，但在继续联调时确认了一件更关键的事实：

- 只要某个修复需要改 OpenChatCut 本体源码，如果只是本机手工改一下，就不具备可复制交付能力

这会直接带来三个问题：

1. 其他电脑重新安装后，问题会原样复现
2. 无法清楚区分哪些差异属于官方、哪些属于我们自己的实施补丁
3. 后续接收 OpenChatCut 原版更新时，容易把本地临时改动丢掉或冲突失控

同时，本轮已确认 OpenChatCut 官方源码在 Docker 端口发布场景下，设置页部分写请求会触发它自己的 request-origin 校验。这个问题不属于本站安装中心文案错误，而是 OpenChatCut 本体在 Docker 访问链路下的真实边界。

因此，本次正式把 OpenChatCut 的交付口径从“本机调通”收口为“受控 fork / 受控镜像”。

## 本次改动

### 1. 安装中心同步受控 fork 口径

更新：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`

当前 `个人中心 -> OpenClaw -> 安装中心` 中的 OpenChatCut 指南已明确：

- `OPENCHATCUT_SOURCE_DIR` 应指向 OpenChatCut 受控 fork 的源码检出目录
- 本站主仓库只保留部署样板、网关和文档，不承接 OpenChatCut 整仓源码
- 如果必须改 OpenChatCut 本体，不再允许“每台电脑手工改官方源码”
- 后续推荐按 `官方仓库 = upstream / 我们的 fork = origin` 持续同步原版更新

### 2. Docker 样板与环境变量说明同步更新

更新：

- `docker/openchatcut.env.example`
- `docker/docker-compose.openchatcut.yml`

本轮同步做了三件事：

1. 把 `OPENCHATCUT_SOURCE_DIR` 的说明改成“受控 fork 检出目录”
2. 把默认 `OPENCHATCUT_EDITOR_URL` 从 `http://127.0.0.1:15199` 统一到 `http://localhost:15199`
3. 把 `OPENCHATCUT_TRUST_DOCKER_LOCALHOST=1` 收进样板和说明，用于 Docker 端口发布场景下兼容 OpenChatCut 的本地来源校验

第二项不是为了解决 OpenChatCut 当前 Docker 写请求拦截问题，而是为了避免后续文档、安装中心和浏览器实际访问地址继续一边写 `localhost`、一边写 `127.0.0.1`。

### 3. OpenChatCut 部署文档补齐维护边界

更新：

- `docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.md`
- `apps/web/public/docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.html`
- `docs/openclaw/README.md`

文档新增并明确了：

- 为什么当前不仅要独立 Docker，还要受控 fork
- 为什么不把整份 OpenChatCut 源码塞进本站主仓库
- 受控 fork 和 upstream 的关系是什么
- 当前 Docker 样板已经解决什么、还没自动解决什么
- 当前受控 fork 第一个 Docker 兼容补丁是什么
- 后续 OpenChatCut 本体修复应先进 fork，再回本站同步安装说明

### 4. 基线文档同步

更新：

- `docs/engineering-standards.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`

本轮把“外部开源系统需要部署补丁时，应维护受控 fork / 受控镜像，而不是手工改每台机器”升级为基线规则，并把 OpenClaw 安装中心当前已承接的 OpenChatCut 口径同步进站点地图。

## 影响范围

### 受影响板块

- `个人中心 -> OpenClaw -> 安装中心`
- OpenChatCut 独立 Docker 部署样板
- OpenClaw / OpenChatCut 对接说明文档

### 未改动内容

- 没有把 OpenChatCut 整仓源码纳入本站主仓库
- 没有直接替 OpenChatCut 官方源码打补丁
- 没有改变本站 OpenChatCut 统一网关的接口集合
- 没有改变已有桥接工具 `get_openchatcut_bridge_assets` / `build_openchatcut_storyboard_draft`

## 当前正式口径

后续推荐按下面方式实施：

```text
本站主仓库
-> 保留部署样板、网关、安装中心、文档

OpenChatCut 受控 fork / 受控镜像
-> 承接 OpenChatCut 本体修复

官方 OpenChatCut
-> 作为 upstream 持续同步
```

如果后续确认某个 Docker 适配修复已经足够稳定，优先顺序应是：

1. 先进 OpenChatCut 受控 fork
2. 再回本站同步部署说明
3. 能回提官方时，再提 upstream PR

当前第一条已明确的 fork 补丁就是：

- `OPENCHATCUT_TRUST_DOCKER_LOCALHOST`
  - 作用：允许 Docker 端口发布场景下，`localhost/127.0.0.1` 浏览器请求通过 OpenChatCut 的本地来源校验
  - 目标：解决设置页测试接口常见的 `invalid request origin`

## 验证

本轮以“受控 fork 策略 + 第一个 Docker 兼容补丁”收口为主，已完成：

- 安装中心数据口径检查
- Docker 样板默认值与文档一致性检查
- OpenChatCut 仓库内三条 verify：
  - `server/project-store-http-auth.verify.ts`
  - `server/plugins/request-shape-gate.verify.ts`
  - `server/plugins/read-path-auth.verify.ts`

本轮已完成的真实联调补充：

- 重启本机 OpenChatCut Docker 容器
- 用宿主机 `http://localhost:15199` 真实访问页面成功返回 `200`
- 用同源请求头真实验证：
  - `POST /api/keys` 返回 `200`
  - `POST /api/keys/test` 返回 `200`
- 这说明当前 `OPENCHATCUT_TRUST_DOCKER_LOCALHOST=1 + OPENCHATCUT_EDITOR_URL=http://localhost:15199` 口径已经能够穿过之前的 `invalid request origin`

本轮未新增的联调项：

- 未在浏览器设置页里逐项重新填写完整的 OpenAI / 多元探索网关配置
- 未继续验证真实模型列表拉取成功，因为这一步还取决于你在 OpenChatCut 页面里填写的网关地址、安装令牌、品牌头与本站多元探索共享 Key 是否一致

当前剩余差距不是 Docker 本地来源校验，而是后续正式 fork 仓库发布与真实模型配置联调。
