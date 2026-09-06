# 2026-09-07 OpenChatCut 全量剥离

## 背景

用户确认不再继续保留 OpenChatCut 相关接入，要求把它从主系统里彻底剥离，避免安装中心、MCP、Docker 样板和文档继续误导后续使用。

## 本次处理

1. 删除 OpenClaw 中与 OpenChatCut 相关的后端集成：
   - `openclaw-openchatcut-bridge.service.ts`
   - `openclaw-openchatcut-gateway.controller.ts`
   - `openclaw-openchatcut-gateway.service.ts`
   - `openclaw.service.ts` 中对应工具、路由与说明
   - `openclaw.module.ts` 中对应注册
2. 删除个人中心 `OpenClaw 安装中心` 页面中的 OpenChatCut 教程展示。
3. 删除仓库内 OpenChatCut 独立 Docker 样板：
   - `docker/docker-compose.openchatcut.yml`
   - `docker/openchatcut.Dockerfile`
   - `docker/openchatcut-start.sh`
   - `docker/openchatcut.env.example`
4. 删除 OpenChatCut 相关公开说明与历史专项变更文档，并同步修正文档索引、站点地图和 Skill/MCP 手册。

## 影响范围

- OpenClaw 安装中心回归为仅承接本站 MCP 与 Skill 安装说明。
- 仓库不再提供 OpenChatCut 统一网关、素材桥接草案和独立部署教程。
- 现有与 OpenChatCut 相关的本地运行数据、未跟踪配置文件是否清理，需要按运行环境单独确认。

## 验证重点

1. `apps/server` 构建通过，确认删除后端注册后无残留依赖。
2. `apps/web` 构建通过，确认安装中心页面与类型收口正常。
3. 全仓搜索 `OpenChatCut|openchatcut`，确认只剩本次剥离说明或未跟踪本地运行文件。
