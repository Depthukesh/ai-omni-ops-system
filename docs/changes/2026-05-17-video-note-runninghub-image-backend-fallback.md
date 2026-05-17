# 2026-05-17 视频笔记最终成片阶段补充 RunningHub 图生视频兼容回退

## 1. 背景

- 用户反馈视频笔记在第 3 阶段“生成短视频”时失败。
- 当前视频笔记工作流在故事板阶段完成后，已经稳定产出 `storyboardImageUrl`，第 3 阶段会携带这张故事板图继续生成最终短视频。
- 但前端视频模型下拉当前同时展示了 RunningHub 的文生视频与图生视频模型，用户可能在创建时选中 `runninghub_seedance_20_fast_t2v` 这类文生视频模型。

## 2. 根因

- `WorksService.generateVideoAsset()` 在第 3 阶段虽然会把 `referenceImageUrl=storyboardImageUrl` 一并传入，但 `buildVideoProviderFallbackOrder()` 之前只返回用户原始选择的一个 backend。
- 如果用户选择的是 RunningHub `*_t2v` 文生视频模型，运行时仍会优先调用对应的文生视频接口，而不会自动切到同系列 `*_i2v` / `*_r2v` 图生视频接口。
- 这会导致“视频笔记最后一步已经有故事板图，却还拿文生视频后端硬跑”的不兼容场景，最终让任务失败。

## 3. 本次修正

### 3.1 有故事板图时优先切到同系列图生后端

- 更新 `apps/server/src/modules/works/works.service.ts`
- 新增 `resolveReferenceImagePreferredVideoBackend()`
- 当第 3 阶段存在 `referenceImageUrl` 时，`buildVideoProviderFallbackOrder()` 不再只返回用户原选 backend，而是优先尝试同系列图生/参考图视频 backend：
  - `runninghub_hailuo_23_t2v -> runninghub_hailuo_23_i2v`
  - `runninghub_vidu_t2v_q3_pro -> runninghub_vidu_i2v_q3_pro`
  - `runninghub_kling_30_pro_t2v -> runninghub_kling_30_pro_i2v`
  - `runninghub_kling_30_std_t2v -> runninghub_kling_30_std_i2v`
  - `runninghub_seedance_20_fast_t2v -> runninghub_seedance_20_fast_i2v`
  - `runninghub_seedance_20_t2v -> runninghub_seedance_20_i2v`
  - `runninghub_happyhorse_10_t2v -> runninghub_happyhorse_10_r2v`

### 3.2 保留原选后端作为兜底

- 若图生后端读取失败或调用失败，运行时仍会回退尝试用户原始选择的 backend。
- 这样既能自动适配“有故事板图”的主场景，也不破坏已有 Provider fallback 结构。

## 4. 影响范围

- 视频笔记第 3 阶段继续生成短视频
- RunningHub 文生视频/图生视频成对模型
- `apps/server/src/modules/works/works.service.ts`

## 5. 验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server run build`

## 6. 后续建议

- 当前后端已补“有故事板图时自动切图生后端”的兼容收口。
- 后续若继续优化交互，可把前端创建弹窗中的视频模型下拉进一步收口为“默认优先展示支持图生视频的模型”，减少用户误选 `t2v` 的概率。
