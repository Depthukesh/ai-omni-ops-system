# 2026-06-24 提示词中心作品中心弹窗滚动与预览排版修复

## 背景

- 用户反馈 `运营提示词中心` 与 `生图提示词中心` 的 `作品中心` 弹窗在内容较长时存在明显可用性问题：
  - 弹窗外层不可顺畅上下浏览
  - 生成正文较长时底部内容难以看到
  - 生图结果在长图场景下被裁切，查看体验差

## 本次修复

- `apps/web/src/app/(dashboard)/more-features/design/operations-prompt-center.tsx`
  - 作品中心弹窗改为固定头部 + 可滚动主体结构
  - 在弹窗主体顶部增加简洁统计卡，提升当前选择态与信息密度
  - 作品列表与详情区统一纳入主体滚动区，长文本可继续向下浏览

- `apps/web/src/app/(dashboard)/more-features/design/image-prompt-center.tsx`
  - 生图作品中心弹窗同步改为固定头部 + 可滚动主体结构
  - 作品列表与图片预览、Prompt 快照统一纳入滚动区
  - 保持与运营提示词中心相同的交互层级和视觉节奏

- `apps/web/src/styles/globals.css`
  - `ops-works-dialog` 改为双层结构：弹窗外壳固定，主体区域 `overflow-y: auto`
  - 新增 `ops-works-dialog__body`、`ops-works-dialog__summary` 等样式
  - 作品列表区域增加内部滚动约束，防止单屏列表挤压详情区
  - 生图预览从 `object-fit: cover` 调整为完整展示，避免长图被裁切
  - 文本输出区域取消过度固定高度，让外层弹窗滚动承担主阅读路径

## 结果

- 作品中心在长文案和长图场景下都可继续向下浏览，不再“卡死”在固定高度内。
- 生图作品的长图可完整查看，不会再因裁切导致下半部分丢失。
- 两个提示词中心的作品中心弹窗视觉结构更统一，也更接近可长期维护的后台工作台样式。

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/more-features/design/operations-prompt-center.tsx`
  - `apps/web/src/app/(dashboard)/more-features/design/image-prompt-center.tsx`
  - `apps/web/src/styles/globals.css`
  - 结果：通过

- `pnpm build:web`
  - 结果：通过
  - 保留既有环境 warning：
    - `@next/swc-win32-x64-msvc` DLL 初始化 warning
    - 多 `package-lock.json` 的 workspace root warning
