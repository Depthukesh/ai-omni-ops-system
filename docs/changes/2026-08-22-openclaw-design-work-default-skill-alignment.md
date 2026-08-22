# 2026-08-22 OpenClaw 设计工作台默认模板对齐

## 背景

- `create_design_work` 的图片模块虽然对外暴露了多种 `designType`，例如：
  - `社媒轮播图`
  - `杂志风海报`
  - `品牌封面图`
  - `信息图海报`
  - `电商主视觉`
- 但在没有显式传 `skillSlug` 的情况下，后端默认一直落到 `design-social-carousel`。
- 这会让 `designType` 只停留在文本提示层，而底层技能模板仍偏向社媒轮播图，导致“明明要品牌封面图 / 信息图海报，却总带轮播图气质”的偏差。

## 本次改动

### 1. 图片模块默认 skillSlug 改为按 designType 对齐

更新：

- `apps/server/src/modules/works/works.service.ts`

当前行为：

- `社媒轮播图` 继续走 `design-social-carousel`
- `杂志风海报 / 品牌封面图 / 信息图海报 / 电商主视觉` 默认改走 `design-magazine-poster`
- `动效首帧` 默认走 `design-motion-frames`
- `像素动画首帧` 默认走 `design-sprite-animation`

这样即使 OpenClaw 没显式传 `skillSlug`，也不会再把所有图片设计都强行压到社媒轮播图模板上。

### 2. create_design_work 兼容旧写法 styleHint

更新：

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw.controller.ts`

当前行为：

- `additionalInstruction` 仍是正式字段
- 同时兼容旧写法 `styleHint`
- 两者会统一归一为同一份“设计补充要求”

这样即使上游还没完全切到 `additionalInstruction`，补充提示词也不会直接丢失。

## 影响范围

- 仅影响 OpenClaw 图片设计任务的默认模板选择和补充提示词兼容。
- 不改数据库结构。
- 不改设计工作台页面结构。
- 不新增新的 prompt 模板，只把既有模板和既有 `designType` 对齐得更合理。

## 验证

- `pnpm exec tsc --noEmit -p apps/server/tsconfig.json`

## 结果

- OpenClaw 再次发起 `品牌封面图 / 信息图海报 / 电商主视觉` 时，即使未显式指定 `skillSlug`，也不再默认掉回 `design-social-carousel`。
