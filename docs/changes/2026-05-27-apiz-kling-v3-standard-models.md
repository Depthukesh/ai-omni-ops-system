# 2026-05-27 APIZ 平台新增 Kling V3 Standard 视频模型

## 本次调整

- 为 `APIZ / NEX AI 平台` 新增两个视频模型种子：
  - `Kling V3 图生视频 [Standard]`
  - `Kling V3 文生视频 [Standard]`
- 对应模型 ID：
  - `fal-ai/kling-video/v3/standard/image-to-video`
  - `fal-ai/kling-video/v3/standard/text-to-video`
- 对应文档入口：
  - `https://apiz.ai/#/v2/models/fal-ai%2Fkling-video%2Fv3%2Fstandard%2Fimage-to-video`
  - `https://apiz.ai/#/v2/models/fal-ai%2Fkling-video%2Fv3%2Fstandard%2Ftext-to-video`

## 影响范围

- 后端系统 Provider 种子：
  - `apps/server/src/common/api-provider-catalog.ts`
- 第三方平台聚合：
  - `APIZ / NEX AI 平台` 的 `modelIds` 会随系统种子自动并入这两个新模型
- 前端视频模型选择：
  - 依赖系统种子与平台模型列表的现有页面会自动看到新模型，无需单独改页面代码

## 兼容性说明

- 本次只新增模型注册，不改 APIZ 任务创建/查询协议
- 现有 `Kling V3 [4K]`、`Seedance`、`Happy Horse`、`Veo 3.1` 的执行逻辑不受影响
