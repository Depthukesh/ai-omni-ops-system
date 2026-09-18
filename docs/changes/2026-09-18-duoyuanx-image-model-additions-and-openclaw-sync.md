# 2026-09-18 多元探索图像模型补充与 OpenClaw MCP / Skill 同步

## 背景

用户要求把多元探索图像目录中的两个新模型补进系统：

- `gpt-image-2.5-sunburst`
- `gpt-image-2.5-flare`

这次不只是补后台 Provider 白名单，还要同步 OpenClaw 的 MCP / Skill 文档口径，避免客户端仍沿用旧示例说明。

## 本次改动

### 1. 补多元探索图像模型白名单

更新：

- `apps/server/src/common/api-provider-catalog.ts`

在 `DUOYUANX_IMAGE_MODEL_WHITELIST` 中新增：

- `gpt-image-2.5-sunburst`
- `gpt-image-2.5-flare`

同时把多元探索图像 Provider 说明从 `gpt-image-2` 扩展为 `gpt-image-2/2.5`，让后台供应商与第三方接口配置页的模型目录口径保持一致。

### 2. 同步 OpenClaw Skill / MCP 文档

更新：

- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL1.md`

统一补充规则：

- 当用户明确指定多元探索 `gpt-image-2.5-sunburst` 或 `gpt-image-2.5-flare` 时
- 不要手写 providerId
- 必须先调用 `get_design_workspace_options`
- 再使用返回的 `selectionKey`

这样安装中心导出的 Skill ZIP、示例 Skill 和 MCP 说明都能保持同一套执行口径。

## 影响范围

- 后台 `接口供应商` 中的多元探索图像模型目录
- 个人中心 `第三方接口配置` 对多元探索图像能力的模型展示
- OpenClaw `get_design_workspace_options` 返回的可选模型集合
- OpenClaw Skill / MCP 文档里关于多元探索图片模型的说明

## 未改动内容

- 没有改变多元探索图片 Provider 的默认启用状态
- 没有把 OpenClaw 图片默认路由从 `gpt-image-2` 改到新的 `2.5` 模型
- 没有新增多元探索专用 MCP 工具，仍然复用现有设计工作台链路

## 验证

- 人工核对用户提供的多元探索模型定价页：
  - `https://duoyuanx.com/pricing/gpt-image-2.5-sunburst`
  - `https://duoyuanx.com/pricing/gpt-image-2.5-flare`
- `npm run build:server`
