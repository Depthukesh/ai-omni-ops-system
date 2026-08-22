# 2026-08-18 全网获客平台获客与评论获客分页收口

## 背景

本轮目标是继续收口 `/all-network-growth`：

- 评论获客页面去掉用户明确不要的站内生成区
- 评论获客列表改为每页固定 20 条分页
- 在左侧菜单中，位于 `评论获客` 下方新增独立子板块 `平台获客`
- 平台获客不复用评论获客的派生逻辑，而是由 OpenClaw 直接写入名单
- 同步补齐 MCP、Skill、安装说明和持久化真源

## 本次改动

### 1. 评论获客页面收口

- 删除评论获客页原有的作品链接、关键词、生成选项与“由 OpenClaw 生成列表”表单区
- 列表保留平台筛选、查看详情、删除
- 列表改为前端每页 20 条分页展示

### 2. 新增平台获客子板块

- `/all-network-growth` 左侧菜单新增 `平台获客`
- 字段固定为：
  - 名称
  - 业务范围
  - 入选理由
  - 联系方式
  - 地址
  - 入选时间
- 列表同样按每页 20 条分页展示

### 3. 新增平台获客真源与接口

- 新增 `OpenClawPlatformLead` 真源模型
- 新增：
  - `openclaw-platform-lead.service.ts`
  - `openclaw-platform-lead.controller.ts`
- 新增 REST：
  - `GET /openclaw/brands/:brandId/platform-leads`
  - `POST /openclaw/brands/:brandId/platform-leads`
  - `DELETE /openclaw/brands/:brandId/platform-leads/:leadId`
- 真源默认固定写入 `workspaceScope=all_network_growth`

### 4. MCP 与 Skill 同步

- OpenClaw 新增 MCP 工具：
  - `get_openclaw_platform_leads`
  - `create_openclaw_platform_leads`
  - `delete_openclaw_platform_lead`
- 安装中心 fallback 说明同步补齐平台获客能力
- Skill 网站功能域地图、工具矩阵、高频任务路由手册同步补齐平台获客

## 影响范围

- `apps/web/src/app/(dashboard)/all-network-growth/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/all-network-growth/openclaw-comment-lead-workspace.tsx`
- `apps/web/src/app/(dashboard)/all-network-growth/openclaw-platform-lead-workspace.tsx`
- `apps/web/src/services/openclaw.ts`
- `apps/server/src/modules/openclaw/openclaw-platform-lead.service.ts`
- `apps/server/src/modules/openclaw/openclaw-platform-lead.controller.ts`
- `apps/server/src/modules/openclaw/openclaw.module.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `prisma/schema.prisma`
- `prisma/schema.local.prisma`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/database-archive.md`
- `docs/openclaw/skill-package/*`

## 兼容性与保护

- 评论获客既有真源 `OpenClawCommentLead` 不改来源链路，只改页面呈现
- 平台获客单独使用 `OpenClawPlatformLead`，避免与评论获客混表或混语义
- OpenClaw 平台获客写入支持显式 `id` 更新；无 `id` 时按 `name + contactInfo + address` 做去重匹配

## 验证

- `npm run build:server`
- `npm run build:web`
- 本地单机版发包、上传 OSS、更新版本号

结果：

- `npm run build:server` 通过
- `npm run build:web` 通过
- `npm run local:release:package -- --release-tag local-single-user-win-x64-2026-08-18-hotfix-76` 通过
- `npm run local:release:upload:oss -- --version local-single-user-win-x64-2026-08-18-hotfix-76 ...` 通过
- 本次发布版本：
  - `releaseTag: local-single-user-win-x64-2026-08-18-hotfix-76`
  - `appVersion: 0.1.50`
