# 2026-05-27 视频笔记去掉总任务超时回收，并补充第三方生视频细状态

## 背景

- 视频笔记此前在任务中心层面仍保留 `XHS_VIDEO_NOTE` 固定总时长回收。
- 这会和当前真实业务冲突：
  - 用户可能先生成故事板，过一段时间再继续生成视频。
  - 这类链路不应该因为“整条任务创建较早”就被统一判定超时失败。
- 同时，最终生视频阶段虽然内部已经在第三方平台创建任务并持续查询，但系统对外暴露的状态仍然太粗：
  - 前台更多只能看到 `GENERATING_VIDEO` 或最终 `FAILED`
  - 很难区分到底是“任务已创建”“第三方处理中”“查询异常”“成功但没有返回视频地址”还是“正在准备兜底”

## 本次调整

### 1. 去掉视频笔记的总任务超时自动回收

- 从任务中心的 `ACTIVE_TASK_TIMEOUT_MS_BY_TYPE` 中移除：
  - `XHS_VIDEO_NOTE`
- 结果是：
  - 视频笔记不再因为固定总时长被任务中心自动标记失败
  - 是否继续等待、是否失败，改为完全由视频工作流自身和第三方查询结果决定

### 2. 最终生视频阶段补充第三方细状态写回

- 最终生视频阶段现在会把第三方状态同步写回视频作品 metadata 和任务 `outputJson`
- 新增的核心可见信息包括：
  - `thirdPartyStatus`
  - `thirdPartyStatusLabel`
  - `thirdPartyStatusDetail`
  - `thirdPartyRawStatus`
  - `thirdPartyStatusUpdatedAt`
  - `videoProviderErrors`

### 3. 第三方状态拆细为更可读的阶段

- 当前会写出的细状态包括：
  - `TASK_CREATED`
  - `QUERYING`
  - `QUERY_ERROR`
  - `SUCCESS_NO_VIDEO_URL`
  - `FALLBACK_PENDING`
  - `SUCCESS`
  - `FAILED`
- 这样后续前端、任务中心或排查接口读取同一条视频作品时，可以明确知道：
  - 第三方任务是否已创建
  - 当前是不是仍在轮询
  - 第三方是否返回了成功态但没有最终视频地址
  - 是否正在切换兜底候选
  - 最终失败到底失败在哪一段

### 4. 最终生视频链路同步记录尝试失败轨迹

- 当首选视频 Provider 失败后，如果系统准备继续兜底，会把失败原因先记入：
  - `videoProviderErrors`
- 同时把状态切成：
  - `FALLBACK_PENDING`
- 如果最终所有候选都失败，则会把最后一次真实失败信息写回 metadata 和任务失败信息，避免只剩一句笼统的“视频生成失败”

### 5. 最终生视频阶段补上固定 20 分钟硬上限

- 去掉 `XHS_VIDEO_NOTE` 的总任务回收后，视频任务中心不再负责统一收口。
- 但最终生视频阶段此前没有补上自己的固定总超时，仍然按 Provider 轮询窗口决定等待时长：
  - 这会导致第三方一直不返回最终视频地址时，页面可能长时间保持运行中。
- 本次补充后：
  - 最终生视频阶段固定最多等待 `20 分钟`
  - 单次查询请求超时固定收紧到 `20 秒`
  - 超过 `20 分钟` 仍未拿到最终视频地址时，直接按失败收口，并写回明确报错：
    - `第三方视频生成超过20分钟仍未完成`

### 6. 补齐 APIZ / 火山方舟的视频结果地址解析

- 火山方舟视频查询成功后，最终视频地址按官方返回结构读取：
  - `content.video_url`
- APIZ 某些视频模型查询成功后，最终地址并不放在 `video_url`，而是放在：
  - `data.result.output.images[0]`
- 本次把视频查询结果解析补成与图片链路一致的递归 URL 提取，并对 APIZ 额外兼容 `images` 字段：
  - `output`
  - `content`
  - `result`
  - `data`
  - `images`
  - `videos`
- 这样可以避免“第三方后台明明已成功，但网站因为没接住地址而继续轮询、超时甚至触发再次尝试”的问题。

## 影响范围

- 后端任务中心：
  - `TasksService`
- 视频笔记最终生视频链路：
  - `runContinueVideoGenerationTask()`
  - `generateVideoAsset()`
  - `pollVideoGenerationResult()`
  - `readVideoTaskSnapshot()`
- 前端类型：
  - `apps/web/src/services/works.ts`

## 预期效果

- 用户先生成故事板、稍后再生成视频时，不会再被固定总任务时长自动判死
- 视频生成卡住时，可以更明确地区分：
  - 第三方任务创建失败
  - 第三方任务还在处理中
  - 查询接口异常
  - 第三方返回成功但没有最终视频地址
  - 首选失败后正在切换兜底
- 第三方视频任务即使一直挂起，也不会再无限等待；超过 `20 分钟` 会明确失败收口
- APIZ / 火山方舟第三方任务成功后，网站能更稳定接住最终视频地址，不再把已成功误判成未完成

## 验证

- `GetDiagnostics` 已检查相关改动文件
- `npm --workspace apps/server run build` 已通过
