# 2026-08-22 设计工作台首屏加载保护

## 背景

- 用户反馈登录后进入 `更多功能 -> 设计` 时，浏览器会直接卡死，甚至触发虚拟内存爆满。
- 前一轮已去掉列表首屏自动加载原图，但问题仍然存在，说明首屏还有其他重负载来源。

## 本次改动

### 1. 前端首屏不再自动拉取创建弹窗所需的重配置

- 文件：`apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
- 进入设计页时只拉取历史作品列表。
- `品牌资料 / 营销日历 / 产品列表 / 模型列表` 这类创建弹窗配置，改为用户点击“创建图片设计 / 创建 HTML 设计 / 创建 PPT 设计 / 创建视频设计”时再按需加载。

### 2. 后端历史窗口缩小

- 文件：`apps/server/src/modules/works/works.service.ts`
- 设计历史接口从最近 `80` 条缩到最近 `24` 条，更贴近首屏一页展示需要。

### 3. 后端历史摘要与错误详情限长

- 文件：`apps/server/src/modules/works/works.service.ts`
- 历史项里的 `summary` 和 `errorDetail` 会在返回前截断，避免超长错误链直接把前端卡片和 DOM 撑大。

## 影响面

- 仅收紧设计工作台进入页的首屏数据量。
- 不改设计任务生成协议。
- 不改历史记录删除能力。
- 进入页面后首次打开创建弹窗时，会额外触发一次按需配置加载。

## 验证

- `pnpm exec tsc --noEmit -p apps/web/tsconfig.json`
- `pnpm exec tsc --noEmit -p apps/server/tsconfig.json`
- Docker 重建 `web` / `server` 后，再做登录态真实联调。

## 说明

- 这次修复优先目标是“先进页不炸”，因此采用了更保守的首屏加载策略。
- 如果后续仍需在创建弹窗里展示更多模型或更多日历项，建议继续拆成带搜索的远程分页，而不是恢复到页面初始全量加载。
