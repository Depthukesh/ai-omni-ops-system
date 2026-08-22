# 2026-08-15 全网获客评论获客工作台

## 背景

本轮要把原顶栏 `GEO` 正式改为 `GEO获客`，并在其右侧新增一个真实可用的 `全网获客` 工作台，而不是继续把评论用户结果只埋在品牌增长策略的 `评论数据` 卡片里做临时验证。

用户要求的新闭环是：

- 新增顶栏 `全网获客`
- 左侧先收口一个子板块 `评论获客`
- 由 OpenClaw 把品牌增长策略里小红书 / 抖音评论用户结果生成表格列表
- 列表字段固定为：
  - 用户名
  - 用户评论
  - 入选理由
  - 用户主页
  - 入选时间
  - 来源平台（抖音 / 小红书）
- 同步到 MCP 和 Skill

## 本次改动

### 1. 顶栏与工作台命名收口

- 顶部主导航把 `GEO` 改为 `GEO获客`
- 在 `GEO获客` 右侧新增 `全网获客`
- `/geo` 工作台展示文案同步改为 `GEO获客`

### 2. OpenClaw 新增评论获客真源

- 新增 `OpenClawCommentLead` 真源模型
- 新增 `openclaw-comment-lead.service.ts`
- 新增 `openclaw-comment-lead.controller.ts`
- 真源默认写入 `all_network_growth` workspace scope
- 直接复用品牌增长策略里既有的小红书 / 抖音评论用户提取结果，不再额外开第二套爬取链路

### 3. 全网获客工作台新增评论获客页面

- 新增 `/all-network-growth`
- 左侧目录先收口单一子板块 `评论获客`
- 页面支持：
  - 由 OpenClaw 生成评论获客名单
  - 按平台筛选列表
  - 按作品链接定向生成
  - 按关键词筛选生成
  - 单条删除
  - 查看详情与跳转用户主页

### 4. MCP 与 Skill 同步

- OpenClaw 网站功能目录新增 `全网获客 -> 评论获客`
- 新增 MCP 工具：
  - `get_openclaw_comment_leads`
  - `create_openclaw_comment_leads`
  - `delete_openclaw_comment_lead`
- Skill 网站功能域地图、MCP 工具矩阵、高频任务路由手册同步新增 `全网获客 / 评论获客`
- OpenClaw 安装中心导出的 Skill ZIP fallback 文案同步补齐，避免部署环境缺失源 Markdown 时回退到旧描述

## 影响范围

- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/geo/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/all-network-growth/page.tsx`
- `apps/web/src/app/(dashboard)/all-network-growth/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/all-network-growth/openclaw-comment-lead-workspace.tsx`
- `apps/web/src/services/openclaw.ts`
- `apps/server/src/modules/openclaw/openclaw-workspace-scope.ts`
- `apps/server/src/modules/openclaw/openclaw-comment-lead.service.ts`
- `apps/server/src/modules/openclaw/openclaw-comment-lead.controller.ts`
- `apps/server/src/modules/openclaw/openclaw.module.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `prisma/schema.prisma`
- `prisma/schema.local.prisma`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/openclaw/skill-package/*`

## 验证

- `npm run build:server`
- `npm run build:web`

结果：

- 待本轮构建完成后补充

## 兼容性与保护

- 评论获客没有改品牌增长策略里既有评论采集主链路，只是在其结果上增加一个 OpenClaw 收口真源
- 全网获客工作台当前只新增 `评论获客` 一个低风险子板块，没有改动 GEO 或内容获客的原有业务流程
- 新列表固定按 `all_network_growth` 独立 scope 持久化，避免把品牌增长策略里的临时采集结果误当成最终获客名单
