# 2026-09-04 OpenChatCut 独立 Docker 集成与安装中心补充

## 变更背景

当前已明确后续视频剪辑链路不并入本站主系统，而是采用：

- 本站负责品牌、素材、任务与 OpenClaw MCP
- OpenChatCut 独立部署一套 Docker 服务
- OpenClaw 同时连接本站 MCP 与 OpenChatCut MCP

为了让这条链路能进入实际实施阶段，本次先把部署样板、安装中心口径和文档入口补齐。

## 本次改动

### 1. OpenClaw 安装中心补充 OpenChatCut 独立部署说明

- 后端安装工作区新增 `openChatCutGuide`
- 前端安装中心新增：
  - OpenChatCut 独立 Docker 部署说明卡片
  - compose 样板复制
  - 环境变量与持久化目录说明
  - 公开部署文档入口

对应文件：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `apps/web/src/services/openclaw.ts`
- `apps/web/src/app/(dashboard)/personal-center/openclaw/page.tsx`

### 2. 仓库新增独立 Docker 部署样板

新增：

- `docker/docker-compose.openchatcut.yml`
- `docker/openchatcut.env.example`

当前定位是第一阶段实施样板，重点是：

- 独立端口
- 独立持久化目录
- 通过 `HOME` 承接 OpenChatCut 工程库
- 暴露 MCP Token 配置位

### 3. 新增 OpenChatCut 双 MCP 集成文档

新增：

- `docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.md`
- `apps/web/public/docs/openclaw/OpenChatCut独立Docker部署与双MCP集成说明.html`

文档统一表达：

- 为什么不并入本站主 compose
- 推荐目录与部署边界
- 独立 compose 样板
- 双 MCP 编排方式
- 第一阶段验证清单

### 4. 同步总文档入口

已同步：

- `docs/openclaw/README.md`
- `docs/openclaw/OpenClaw正式安装与网站对接说明.md`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`

## 当前结论

截至本次改动：

- OpenChatCut 已被明确纳入本站 OpenClaw 安装中心口径
- 已有可复制的独立 Docker 部署样板
- 已明确它在整体系统中的职责边界：本站产素材，OpenChatCut 剪辑导出，OpenClaw 双 MCP 编排

## 后续建议

下一阶段直接做最小联调闭环：

1. 检出 OpenChatCut 源码并用独立 compose 起服务
2. 验证 OpenChatCut MCP 可连接
3. 从本站生成一张图、一段音频、一个视频片段
4. 验证 OpenChatCut 能导入这些素材并导出测试成片
