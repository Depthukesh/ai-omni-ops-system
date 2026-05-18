# 2026-05-18 Seedance 视频生成轮询窗口放宽

## 背景

- 用户反馈视频笔记第 3 阶段在调用柏拉图平台 `seedance2.0` 时，页面提示：
  - `视频任务长时间未完成，当前状态：IN_PROGRESS`
- 但第三方平台后台已经出现成功创建记录，并且实际费用已扣除。
- 这说明任务大概率已经成功提交到第三方，而不是创建失败。

## 根因

- `WorksService.pollVideoGenerationResult()` 之前固定只轮询：
  - `40` 次
  - 每次间隔 `4s`
- 总轮询窗口约为 `160s`
- 对 Seedance 这类真实生成时长偏长的视频模型来说，这个窗口偏短。
- 结果是：
  - 第三方仍处于 `queued / running / in_progress`
  - 我方后端就提前抛出“视频任务长时间未完成”
  - 并把视频笔记任务写成失败，形成“实际扣费了，但站内显示失败”的误判。

## 本次修正

### 1. 视频 Provider 增加轮询窗口配置

- 更新：
  - `apps/server/src/modules/works/works.service.ts`
- `VideoProviderConfig` 新增：
  - `pollMaxAttempts`
  - `pollIntervalMs`
- `loadVideoProviderConfig()` 会优先从 `ApiProviderConfig.extraParams` 读取这两个值。

### 2. 柏拉图 Seedance 默认放宽轮询时长

- 更新：
  - `apps/server/src/common/api-provider-catalog.ts`
  - `apps/server/src/modules/works/works.service.ts`
- 当前 `provider_runtime_video_seedance` 默认补入：
  - `pollMaxAttempts = 180`
  - `pollIntervalMs = 5000`
- 即总轮询窗口放宽到约 `15 分钟`，避免第三方已接单但站内过早判失败。

### 3. 运行时保留后续扩展能力

- 后续若其他视频 Provider 也存在“创建成功但耗时更长”的情况，可直接在后台 Provider 元数据里继续补：
  - `pollMaxAttempts`
  - `pollIntervalMs`
- 不需要再改一轮固定代码。

## 影响范围

- 视频笔记第 3 阶段最终成片生成
- 柏拉图平台 `seedance2.0`
- 其他未来需要更长轮询窗口的视频 Provider

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/api-provider-catalog.ts`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server run build`

## 当前边界

- 本次修正解决的是“第三方任务仍在处理中，但站内过早超时误判失败”。
- 若第三方最终真实失败、额度不足或素材不合规，后端仍会按真实失败状态返回中文错误，不会把真实失败吞掉。
