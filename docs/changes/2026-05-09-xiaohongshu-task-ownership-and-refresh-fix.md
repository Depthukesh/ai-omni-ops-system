# 2026-05-09 小红书任务归属与状态刷新修复

## 1. 变更背景

- 用户在 `3001` 前端以同一登录账号创建原创笔记后，`/xiaohongshu` 原创笔记工作区没有看到最新任务状态
- 同时 `个人中心 / 任务中心` 也没有看到对应任务记录，导致“作品已生成，但任务链路不可见”

## 2. 根因

- `WorksController` 在创建原创笔记、二创笔记和视频笔记时，没有解析当前请求登录态
- `WorksService` 创建任务时把 `userId` 绑定为品牌 `ownerUserId`，而不是当前登录用户
- 前端在创作成功后只更新作品列表，没有立即刷新 `workspace.tasks`，导致工作区状态区继续显示旧快照

## 3. 本次修复

### 3.1 后端任务归属修正

- 更新 `apps/server/src/modules/works/works.controller.ts`
- 生成原创、二创、视频笔记时，统一解析当前请求的认证上下文
- 更新 `apps/server/src/modules/works/works.service.ts`
- 创建任务时优先使用当前登录用户 `auth.userId`
- 只有在没有登录上下文时，才回退到品牌 owner 作为兜底

### 3.2 前端任务状态刷新修正

- 更新 `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
- 原创、二创、视频笔记创作成功后，立即刷新整个小红书工作区
- 让 `workspace.tasks`、任务状态区、作品列表和个人中心读取到同一批最新任务数据

### 3.3 状态文案校正

- 更新 `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- 把“点击一键创作后会持续显示排队、创作、失败和完成状态”的旧描述改为：
  - 展示最近一次任务状态
  - 创作完成后自动刷新到最新结果

## 4. 影响范围

- 页面：
  - `/xiaohongshu`
  - `/personal-center`
  - `/personal-center/tasks`
- 后端模块：
  - `WorksModule`
  - `TasksModule`

## 5. 验证目标

- 在小红书原创/二创/视频工作区提交创作后，任务状态区能看到最新任务
- `个人中心 / 任务中心` 能看到同一登录用户刚刚发起的任务记录
- `个人中心概览` 的进行中任务摘要与最近动态同步刷新

## 6. 当前边界

- 当前原创、二创、视频生成仍以单请求内完成为主，不是真正的队列异步执行器
- 因此任务状态虽然会落库并可见，但 `QUEUED / RUNNING` 停留时长仍取决于单次请求执行过程
