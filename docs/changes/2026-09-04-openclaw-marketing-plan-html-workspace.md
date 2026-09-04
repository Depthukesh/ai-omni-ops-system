# 2026-09-04 OpenClaw 营销策划方案 HTML 工作区

## 背景

内容获客里的某书、某音/某号原本仍沿用旧的站内营销策划方案工作区，公众号下也没有对应的独立营销策划方案板块。现在需要把三块统一收口为 OpenClaw 上传的 HTML 营销策划方案列表，并支持在方案详情下留言协作。

## 本次变更

### 1. 新增独立真源 `OpenClawMarketingPlan`

- 新增后端运行时表 `OpenClawMarketingPlan`
- 固定字段：
  - `title`
  - `htmlContent`
  - `createdAt`
- 支持：
  - 列表读取
  - OpenClaw 创建
  - 站内删除
  - 详情留言

### 2. 内容获客三板块统一切到 HTML 方案列表

- 某书：`营销策划方案` 入口改为 `OpenClawMarketingPlan`
- 某音/某号：`营销策划方案` 入口改为 `OpenClawMarketingPlan`
- 公众号：新增独立 `营销策划方案` 左侧菜单，并放到 `配置初始化` 上方

页面统一支持：

- 列表显示 `标题 / 内容 / 创建时间 / 留言 / 操作`
- 点击 `查看 HTML`
- 点击 `打开 HTML`
- 在详情弹窗下留言
- 每页 20 条自动分页

### 3. 留言链路复用原评论系统

- `OpenClawComment.resourceType` 新增 `marketing_plan`
- 方案详情继续复用 `OpenClawCommentThread`

### 4. MCP / Skill 同步补齐

- MCP 新增：
  - `get_openclaw_marketing_plans`
  - `create_openclaw_marketing_plan`
  - `delete_openclaw_marketing_plan`
- OpenClaw Skill 文档同步加入营销策划方案的功能地图、工具矩阵和高频任务路由说明

## 影响面说明

- 本次没有替换旧小红书 / 抖音原有营销策划方案生成链路，只是在内容获客聚合工作台里把 `营销策划方案` 入口切到 OpenClaw HTML 方案列表
- 没有改既有 provider、prompt、fallback 或模型配置同步行为
- 没有改数据库现有正式 Prisma schema，只新增 OpenClaw 运行时建表真源
- 评论线程仍沿用既有 OpenClaw 留言模型，只扩展了一个新资源类型

## 验证重点

- 某书 / 某音/某号 / 公众号下是否都能看到 `营销策划方案`
- 公众号左侧菜单里该入口是否位于 `配置初始化` 上方
- 列表是否回显 `标题 / 查看 HTML / 创建时间 / 留言 / 删除`
- 详情弹窗是否能预览 HTML、打开 HTML，并正常显示留言线程
- OpenClaw MCP 是否能对营销策划方案执行查、建、删
