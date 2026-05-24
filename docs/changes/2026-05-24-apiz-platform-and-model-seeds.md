# 2026-05-24 APIZ 平台与模型种子接入

## 背景
- 需要把 APIZ / NEX AI 作为新的第三方大模型接口平台接入现有标准化体系。
- 要求同时出现在：
  - 个人中心 -> 第三方接口配置
  - 后台 -> 接口供应商
- 同时要求沿用现有 `ApiProviderConfig -> ThirdPartyPlatformConfig -> 品牌 Owner 私钥解析 -> Works Runtime` 链路，避免单独写一套平台逻辑。

## 本次变更
- 在 `api-provider-catalog.ts` 新增 APIZ / NEX AI 的系统 Provider 种子：
  - Seedance 2.0 (Ark API)
  - Kling V3 图生视频 [4K]
  - Kling V3 文生视频 [4K]
  - ChatGPT Images 2.0 文生图
  - ChatGPT Images 2.0 Edit 图生图
  - Nano Banana 2
  - Happy Horse 文生视频
  - Happy Horse 图生视频
  - Happy Horse 参考图生视频
  - Veo 3.1 文生视频
  - Veo 3.1 参考图视频
  - Veo 3.1 图生视频
- 所有上述模型统一归到 `https://api.apiz.ai`，通过 `third-party-platform-catalog.ts` 自动聚合成同一个平台目录项，平台名为 `APIZ / NEX AI 平台`。
- 运行时元数据沿用现有标准：
  - 图片模型：`runtimeKey = image-generation`
  - 视频模型：`runtimeKey = video-generation`
  - 统一补齐 `baseUrls / createPath / queryPath / queryMethod / queryBodyMode / requestProfile / backendKey`

## 运行时适配
- 视频生成链路新增 APIZ 任务接口适配：
  - 创建任务：`POST /api/v3/tasks/create`
  - 查询任务：`POST /api/v3/tasks/query`
  - 查询体支持 `task_id`
- 图片生成链路新增 APIZ 异步任务模式：
  - 支持 APIZ 图像任务创建与轮询
  - 兼容 `result.output.images` 返回结构
- 视频状态归一化补充 `completed -> SUCCESS`，避免 APIZ 任务完成后被误判成仍在处理中。

## 结果
- 后台“接口供应商”会自动出现新增 APIZ Provider 种子。
- 个人中心“第三方接口配置”会自动出现 `APIZ / NEX AI 平台`，用户可按品牌维护自己的平台 API Key。
- Works 运行时后续可直接消费 APIZ 的图片/视频 Provider，无需再单独补平台配置。
