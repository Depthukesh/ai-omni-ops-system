# 2026-05-09 个人中心任务取消第一版

## 1. 变更背景

- 用户希望在 `个人中心 / 任务中心` 里，针对运行中的任务提供“取消任务”入口
- 当前任务中心只支持失败任务重试，不支持用户主动终止排队中或运行中的任务
- 小红书原创、二创、视频创作链路已经落任务记录，如果没有取消入口，用户只能等待任务自然结束

## 2. 变更目标

- 在 `个人中心 / 任务中心` 中为 `QUEUED` 和 `RUNNING` 状态任务提供 `取消任务` 按钮
- 后端新增统一任务取消接口，把当前用户自己的任务切换到 `CANCELLED`
- 对小红书创作链路增加取消检查，避免任务被取消后又被后续执行结果写回为 `SUCCESS`

## 3. 修改内容

### 3.1 前端

- 更新 `apps/web/src/app/(dashboard)/personal-center/tasks/page.tsx`
- 新增运行中任务的 `取消任务` 按钮
- 新增取消中的按钮状态、成功提示和失败提示
- 调整“再次运行”按钮逻辑，只允许 `FAILED` / `CANCELLED` 状态重试
- 更新 `apps/web/src/services/personal-center.ts`
- 新增 `cancelTask(taskId)` 请求封装
- 更新 `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- `CANCELLED` 状态改为暂停态视觉样式

### 3.2 后端

- 更新 `apps/server/src/modules/tasks/tasks.controller.ts`
- 新增 `PATCH /tasks/:id/cancel`
- 更新 `apps/server/src/modules/tasks/tasks.service.ts`
- 只允许当前用户取消自己的 `QUEUED` / `RUNNING` 任务
- 取消后写入：
  - `taskStatus = CANCELLED`
  - `finishedAt = 当前时间`
  - `errorMessage = 用户已在任务中心取消任务`

### 3.3 创作链路防回写

- 更新 `apps/server/src/modules/works/works.service.ts`
- 原创、二创、视频笔记在多个关键步骤前增加“任务已取消”检查
- `markTaskRunning`、`markTaskSuccess`、`markTaskFailed` 在任务已取消时不再继续覆盖状态
- 这样用户在任务中心取消后，后续即使还有剩余流程，也不会把状态重新写成成功或失败

## 4. 修改意图

- 先在统一任务中心提供通用取消入口，而不是把“取消”分散到每个业务页面单独实现
- 先做 `best-effort` 中断：允许任务在状态层面停止，并尽量阻断后续步骤
- 没有直接做“真正强杀正在执行的第三方请求”，是因为当前链路仍以单请求串行为主，外部 provider 调用本身不支持瞬时中断

## 5. 影响范围

- 影响页面：
  - `/personal-center/tasks`
- 影响接口：
  - `/api/tasks/:id/cancel`
- 影响模块：
  - `TasksModule`
  - `WorksModule`
- 不影响数据库 schema；复用现有 `TaskStatus.CANCELLED`

## 6. 验证方式

- 手工验证：
  - 任务中心运行中任务出现 `取消任务` 按钮
  - 点击后状态更新为 `CANCELLED`
- 编译验证：
  - `npm run build:web` 通过
  - `npm run build:server` 通过
- 本地服务验证：
  - `3001` 前端已重启
  - `3011` 后端已重启

## 7. 风险与后续

- 当前取消属于 `best-effort` 中断，不能保证已经发出的第三方模型请求瞬时停止
- 已经执行到末尾的任务，仍可能产出部分文件或作品副本，但任务状态会保持 `CANCELLED`
- 如果后续要实现真正的强中断，需要引入独立任务执行器、取消令牌和更明确的后台 worker 边界

## 8. 相关文件

- `apps/web/src/app/(dashboard)/personal-center/tasks/page.tsx`
- `apps/web/src/services/personal-center.ts`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- `apps/server/src/modules/tasks/tasks.controller.ts`
- `apps/server/src/modules/tasks/tasks.service.ts`
- `apps/server/src/modules/works/works.service.ts`
- `docs/site-map.md`
