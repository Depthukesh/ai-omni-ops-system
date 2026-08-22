# 2026-08-22 OpenClaw 设计工作台显式补齐 imageSize 入参

## 背景

- 用户在 OpenClaw 侧测试 `create_design_work` 时，感知为“只能生成 1242x1660 竖版图”。
- 进一步核查后确认，底层 `WorksService` 实际早已支持通过 `spec: "宽x高"` 透传尺寸；真正的问题是 OpenClaw MCP schema 没有把尺寸能力显式暴露出来。
- 这会导致外部调用方不知道该如何传尺寸，一旦没有正确传入 `spec`，又会静默回退到默认 `1242x1660`，从而误判为“其他尺寸不支持”。

## 本次改动

- 为 `create_design_work` 正式补齐显式尺寸字段：
  - 新增 `imageSize`
  - 格式固定为 `宽x高`，例如 `1200x628`、`1080x1920`
- 保持兼容旧链路：
  - 旧的 `spec: "宽x高"` 仍然有效
  - 最终仍统一映射到底层已有的 `spec`
- 补充入口校验：
  - 若显式传入 `imageSize` 或 `spec`，但格式不符合 `宽x高`，服务端直接返回 `400`
  - 不再在“用户明确传了尺寸但格式写错”的情况下悄悄回退默认竖版
- OpenClaw 返回摘要中补充尺寸说明：
  - `image` 模块会明确显示本次图片尺寸
  - 未指定时会明确提示默认使用 `1242x1660`

## 影响面

- 仅影响 OpenClaw 的设计工作台入口语义与校验提示。
- 不改数据库结构。
- 不改底层 `WorksService` 的生图能力。
- 不改已有设计类型路由；`品牌封面图 / 信息图海报 / 社媒轮播图` 仍共享当前 `image` 生图主链，只是尺寸输入不再隐式。

## 文档同步

- `docs/openclaw/OpenClaw正式安装与网站对接说明.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`

## 验证

- 后端静态校验：
  - `pnpm exec tsc --noEmit -p apps/server/tsconfig.json`
- 代码对照确认：
  - `create_design_work` MCP schema 已新增 `imageSize`
  - HTTP controller 已允许接收 `imageSize`
  - OpenClaw service 已把 `imageSize/spec` 统一归一成底层 `spec`
  - 显式错误格式会在入口层直接返回 `400`
