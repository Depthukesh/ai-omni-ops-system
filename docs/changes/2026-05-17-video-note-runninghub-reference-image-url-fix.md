# 2026-05-17 视频笔记最终成片阶段补充 RunningHub 参考图可访问 URL

## 1. 背景

- 用户反馈视频笔记第 3 阶段在补上“文生模型自动切图生模型”后，线上仍然失败。
- 最新报错文案显示：
  - `runninghub_seedance_20_fast_i2v`
  - `runninghub_seedance_20_fast_t2v`
  - 都提示“未返回任务 ID”
- 这说明失败点已经从“选错后端”进一步收窄到“创建 RunningHub 任务时，返回体没有被成功识别成可继续轮询的任务”。

## 2. 根因

### 2.1 第 3 阶段传给 RunningHub 的故事板图仍是站内鉴权 URL

- 当前生成产物落 OSS 后，对站内前端展示统一返回：
  - `https://<site>/api/works/brands/:brandId/assets/:fileName`
- 该地址适合站内已登录用户访问，但第三方 RunningHub 在服务端拉取 `firstFrameUrl` 时并不携带站内登录态。
- 因此第 3 阶段图生视频请求虽然传了 `storyboardImageUrl`，但对 RunningHub 来说它并不是一个稳定可读的公开资源地址。

### 2.2 创建任务失败时，原逻辑只报“未返回任务 ID”

- `generateVideoAsset()` 在创建接口成功返回 `200` 但业务体中包含错误信息时，之前只要没读到 `taskId`，就统一抛：
  - `xxx 未返回任务 ID`
- 这会掩盖 RunningHub 实际返回的 `errorMessage / message / msg`，导致排障信息不够直观。

## 3. 本次修正

### 3.1 对第三方图生视频改用 OSS 签名读链

- 更新：
  - `apps/server/src/storage/oss-storage.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
- `OssStorageService` 新增 `getSignedReadUrl(storageKey, expiresInSeconds)`
- `WorksService.runContinueVideoGenerationTask()` 在调用第 3 阶段视频生成前，会先把故事板图站内 URL 转成：
  - OSS `storageKey`
  - 再生成第三方可直接访问的签名读 URL
- 若当前环境未启用 OSS，则继续保留原 URL，不破坏本地开发联调。

### 3.2 创建失败时优先透出 RunningHub 原始错误

- `WorksService` 新增 `readVideoCreateFailureReason()`
- 当创建接口返回 `200` 但没有 `taskId` 时，会优先读取：
  - `errorMessage`
  - `message`
  - `msg`
  - `errorCode`
  - 以及 `data/error` 内嵌字段
- 后续报错将优先显示：
  - `xxx 创建任务失败：<真实错误>`
  - 而不再笼统显示“未返回任务 ID”

## 4. 影响范围

- 视频笔记第 3 阶段最终成片生成
- RunningHub 图生视频/参考图视频模型
- `apps/server/src/storage/oss-storage.service.ts`
- `apps/server/src/modules/works/works.service.ts`

## 5. 验证

- `GetDiagnostics`
  - `apps/server/src/storage/oss-storage.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server run build`

## 6. 后续建议

- 当前已把“图生视频参考图地址不可被第三方直接访问”这个根因收口到后端。
- 如果后续 RunningHub 仍返回业务错误，前端任务失败文案会更接近第三方真实返回，便于继续定位是额度、素材格式、分辨率还是提示词限制。
