# 2026-08-22 设计工作台历史列表内存压力修复

## 背景

- 用户反馈打开 `更多功能 -> 设计` 后，浏览器标签页直接崩溃并提示 `Out of Memory`。
- 崩溃后同一前端实例下的其他页面也会进入全局错误恢复页，看起来像“整个站点都打不开了”。
- 排查后确认，设计工作台首屏存在两个高内存点：
  - 历史列表接口会把每条设计记录的完整 `htmlContent` 一起返回给前端
  - 前端作品卡片列表会为 HTML 作品批量渲染 `iframe` 预览

## 本次改动

- `apps/server/src/modules/works/works.service.ts`
  - 设计历史映射结果不再默认返回完整 `htmlContent`
  - 历史列表继续保留 `assetUrl`、摘要、状态、标签和规格等轻量字段
- `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
  - 作品列表卡片不再为 HTML 作品批量渲染 `iframe`
  - 非图片作品统一退回轻量占位卡片
  - 真正预览仍保留在点击后的查看动作中，通过 `assetUrl` 打开

## 影响面

- 仅收紧设计工作台历史列表的首屏展示负载。
- 不改设计任务创建链路。
- 不改设计结果文件落盘。
- 不改单条作品的查看入口。

## 验证

- `pnpm exec tsc --noEmit -p apps/server/tsconfig.json`
- `pnpm exec tsc --noEmit -p apps/web/tsconfig.json`

## 说明

- 本次修复优先解决“打开页面直接撑爆浏览器”的问题。
- 如果后续仍需在列表卡片里展示 HTML 缩略预览，应改为单张受控截图或惰性加载，而不是一次性挂载多张实时 `iframe`。
