# 2026-09-06 OpenChatCut 安装中心补齐完整教程

## 背景

前一轮已经把 OpenChatCut 的独立 Docker 部署、统一模型网关、A/B/C 三类配置示例和受控 fork 口径补进了本站，但真实联调时还暴露出一个交付问题：

- 页面里虽然已经有部署说明和配置字段
- 但还没有把“从拉源码、生成 Token、编辑 `openchatcut.env`、WorkBuddy 双 MCP，到 OpenChatCut 页面填写与验证顺序”收成一套后台内可直接照抄的完整教程

这会导致实施时仍然要来回翻聊天记录或文档，尤其容易在下面几处反复踩坑：

1. 不知道 OpenChatCut MCP 的 Bearer Token 应该取自哪里
2. 不清楚 WorkBuddy 里应该怎样同时挂本站 MCP 和 OpenChatCut MCP
3. 不知道 Agent 大脑页为什么必须带 `/v1`
4. 不清楚 Docker 容器里为什么不能继续写 `127.0.0.1:13011`

因此本轮把整套安装配置流程正式收口到：

- `个人中心 -> OpenClaw -> 安装中心`

让后台页面本身就可以直接当教程使用。

## 本次改动

### 1. 安装中心新增“完整安装配置教程”

更新：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `apps/web/src/services/openclaw.ts`
- `apps/web/src/app/(dashboard)/personal-center/openclaw/page.tsx`

当前安装中心新增了可直接复制的教程分段，覆盖：

1. 拉取 OpenChatCut 受控 fork 源码并准备目录
2. 生成随机 Token 并填写 `docker/openchatcut.env`
3. 首次启动、查看日志、源码更新和 Docker 重建命令
4. WorkBuddy 双 MCP 的完整 `mcp.json` 示例
5. OpenChatCut 页面里 A/B/C 三类能力的填写顺序
6. 从 curl 到页面再到双 MCP 的验证顺序

本轮还继续把后台里的网关地址拆成两套：

- `统一网关地址`
  - 默认给 OpenChatCut Docker 页面直接填写
  - 当本站主系统当前是宿主机本机地址时，会优先改成 `host.docker.internal` 这类容器可达口径
- `宿主机调试地址`
  - 专门给浏览器 / PowerShell 本机执行 curl 调试使用
  - 避免用户再把宿主机 `127.0.0.1:13011` 错抄回 OpenChatCut Docker 页面

### 2. 明确 OpenChatCut MCP Token 的真实来源

安装中心教程与文档同步明确：

- WorkBuddy 连接 OpenChatCut MCP 时使用的 Bearer Token
- 应来自 `docker/openchatcut.env` 中的 `OPENCHATCUT_MCP_TOKEN`
- 不是宿主机 `~/.openchatcut/mcp-token`

### 3. 同步 OpenClaw 的 MCP / Skill 文档口径

更新：

- `docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.md`
- `apps/web/public/docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.html`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`
- `docs/openclaw/skill-package/README.md`
- `docs/openclaw/skill-package/SKILL.md`
- `docs/openclaw/README.md`

这几份文档现在都补齐了同一套安装收口：

- 安装中心里已经提供完整教程
- WorkBuddy 双 MCP 示例应如何填写
- OpenChatCut 页面配置时为什么 Agent 大脑必须带 `/v1`
- 为什么 Docker 场景要改用 `host.docker.internal`
- 用户问安装与配置时，应优先引导回安装中心，而不是让他继续手工拼凑信息

### 4. 基线索引同步

更新：

- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`

当前系统地图已把 OpenClaw 安装中心更新为：

- 不只提供品牌令牌和 MCP 片段
- 还承接 OpenChatCut 完整安装配置教程、双 MCP 配置和网关验证说明

## 影响范围

### 受影响板块

- `个人中心 -> OpenClaw -> 安装中心`
- OpenClaw 相关安装说明与 Skill 包文档

### 未改动内容

- 没有新增 OpenChatCut 本体接口
- 没有改变已有统一网关的转发逻辑
- 没有改变已有桥接工具 `get_openchatcut_bridge_assets` / `build_openchatcut_storyboard_draft`

## 验证

本轮主要验证安装中心数据结构与前端展示链路：

- `pnpm --filter server build`
- `pnpm --filter web build`

同时会继续确认：

- WorkBuddy 双 MCP 示例中本站 MCP 与 OpenChatCut MCP 片段是否来自当前真实运行口径
- 安装中心页面是否能直接展示并复制新增教程段落
