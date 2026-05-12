# 2026-05-12 Brand Context Refresh For Growth And Xiaohongshu

## 背景
- 线上 `brand-growth` 已部署到最新修复后，页面中的飞书同步结果仍然看起来“不对劲”。
- 实际排查发现，问题不一定是字段映射本身，而是页面请求仍然打到了 demo 工作区：`br_super_admin_demo` / `usr_super_admin_demo`。

## 根因
- `brand-growth` 与 `xiaohongshu` 两个工作区初始化时，会优先从浏览器本地 `ai-omni-auth-session.currentBrandId` 读取品牌上下文。
- 当本地会话残留的是 demo brand 时，页面不会先向后端确认当前登录用户的真实 `currentBrandId`，导致后续所有工作区接口继续落到 demo 品牌。
- 这样即使部署了最新的飞书字段/媒体映射修复，页面看到的也可能仍是 demo 数据或旧工作区内容。

## 本次调整
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - 新增 `resolveActiveBrandId()`
  - 初始化 `loadArchive()` 时，先调用 `/auth/me` 刷新当前登录用户的品牌上下文，再决定读取哪个 `brandId`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - 同样补 `resolveActiveBrandId()`
  - 初始化 `loadWorkspace()` 时不再盲信本地旧会话中的 `currentBrandId`

## 预期效果
- 当浏览器本地残留 demo brand，但当前用户真实品牌已切换时，品牌增长策略页与小红书页会优先拉回真实 `currentBrandId`
- 飞书同步、作品区、品牌档案、报告等接口不再持续命中 `br_super_admin_demo`

## 验证
- `npm run build:web`
- 两个页面文件诊断无报错
