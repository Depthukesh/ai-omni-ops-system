# 2026-05-19 小红书视频 providerTaskId 提前持久化

## 1. 背景

- 历史上有一类小红书视频任务会在第三方仍是 `IN_PROGRESS` 时，被站内因轮询超时或查询异常写成 `FAILED`
- 系统虽然已经补了“按第三方 `providerTaskId` 恢复视频”的接口，但旧链路里 `providerTaskId` 只会在主成片成功后才写进作品元数据
- 一旦任务在轮询阶段失败，站内会留下失败作品和失败任务，但没有任何地方保存第三方任务 ID，后续无法恢复

## 2. 本次修正

- 更新：
  - `apps/server/src/modules/works/works.service.ts`
- 视频第 3 阶段调用第三方创建任务后，只要成功拿到 `providerTaskId`，就立刻执行两步持久化：
  - 回写到视频作品元数据 `providerTaskId / resolvedVideoProvider / resolvedVideoModel`
  - 回写到站内任务 `outputJson`
- 当前任务输出会先记录：
  - `stage: VIDEO_PROVIDER_TASK_CREATED`
  - `workId`
  - `providerTaskId`
  - `provider`
  - `modelName`

## 3. 结果

- 即使后续轮询超时、第三方查询异常或主成片暂未回填，失败作品也会保留第三方任务 ID
- 页面后续只要刷新到该作品，前端就能拿到 `providerTaskId`
- 现有恢复接口 `POST /api/works/brands/:brandId/xiaohongshu/video/recover` 便可以重新查询第三方状态并补抓成片

## 4. 已知边界

- 这次修复只能保护“修复上线之后新创建的视频任务”
- 对于历史失败记录，如果当时根本没有持久化 `providerTaskId`，仍然无法自动恢复，只能重跑或去第三方后台补查

## 5. 验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server run build`
