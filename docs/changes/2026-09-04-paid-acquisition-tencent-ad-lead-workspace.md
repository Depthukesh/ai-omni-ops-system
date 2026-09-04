# 2026-09-04 投流获客腾讯投流获客工作台

## 背景

用户要求在顶栏 `全网获客` 后面新增独立一级入口 `投流获客`，进入后左侧先收口一个 `腾讯投流获客` 子板块。该板块由 OpenClaw 直接创建内容，并以列表形式展示：

- 标题
- 内容
- 创建时间
- 留言
- 查看
- 删除

同时，查看详情后还要支持正文阅读和留言协作。

## 本次改动

### 1. 新增投流获客工作台

- 顶栏新增 `/paid-acquisition` 一级导航 `投流获客`
- 新建 `投流获客工作台` 壳层
- 左侧当前先收口单一子板块 `腾讯投流获客`

### 2. 新增腾讯投流获客真源

- 新增 `OpenClawTencentAdLead` 真源模型
- 固定字段：
  - `title`
  - `content`
  - `createdAt`
- 真源默认固定写入 `workspaceScope=paid_acquisition`

### 3. 页面列表与详情交互

- 列表固定展示：
  - 标题
  - 内容摘要
  - 创建时间
  - 留言入口
  - 查看 / 删除
- 列表按每页 20 条分页
- 详情弹窗支持：
  - 查看完整正文
  - 查看创建时间 / 更新时间
  - 在详情下留言协作

### 4. OpenClaw MCP 与 Skill 同步

- 新增 MCP 工具：
  - `get_openclaw_tencent_ad_leads`
  - `create_openclaw_tencent_ad_lead`
  - `delete_openclaw_tencent_ad_lead`
- OpenClaw 安装中心 fallback 文案同步补齐 `投流获客`
- Skill 网站功能域地图、工具矩阵、高频任务路由手册同步补齐 `投流获客 -> 腾讯投流获客`

## 影响范围

- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/paid-acquisition/*`
- `apps/web/src/services/openclaw.ts`
- `apps/server/src/modules/openclaw/openclaw-tencent-ad-lead.service.ts`
- `apps/server/src/modules/openclaw/openclaw-tencent-ad-lead.controller.ts`
- `apps/server/src/modules/openclaw/openclaw-comment.service.ts`
- `apps/server/src/modules/openclaw/openclaw.module.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `prisma/schema.prisma`
- `prisma/schema.local.prisma`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/openclaw/skill-package/*`

## 兼容性与保护

- 新增板块使用独立 `paid_acquisition` workspace scope，不混入 `all_network_growth`
- 详情留言继续复用 `OpenClawComment` 统一线程模型，只补充新的 `resourceType=tencent_ad_lead`
- 只新增新的投流获客真源和页面，不改现有全网获客评论获客 / 平台获客链路

## 验证

- `npm run build:server`
- `npm run build:web`
- `build:web` 产物已出现 `/paid-acquisition` 路由

结果：

- `npm run build:server` 通过
- `npm run build:web` 通过
- 当前未额外执行浏览器态页面联调与 MCP 实调用冒烟；本轮主要完成代码、构建与文档收口
