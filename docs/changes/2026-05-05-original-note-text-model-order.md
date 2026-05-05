# 原创笔记文生文模型顺序调整

## 1. 变更背景

- 用户要求调整原创笔记中 `original_copy` 与 `original_image` 两段文生文能力的主模型和替补顺序
- 当前实现仍保留了旧的 `gemini-3.1-pro-preview` 与 `gpt-5.4-nano` 作为首选，不符合最新要求
- 这次修改要把原创笔记两段文生文统一切到国内模型优先的链路

## 2. 变更目标

- 将 `original_copy` 改为 `deepseek-v4-pro` 主模型，`doubao-seed-2-0-pro-260215`、`kimi-k2.6` 依次替补
- 将 `original_image` 改为 `deepseek-v4-pro` 主模型，`doubao-seed-2-0-pro-260215`、`kimi-k2.6` 依次替补

## 3. 修改内容

### 3.1 前端

- 无前端交互改动

### 3.2 后端

- 调整 `WorksService` 中 `loadOriginalCopyProviders()` 的 provider 顺序，移除旧第三方首选模型
- 调整 `WorksService` 中 `loadOriginalImagePromptProviders()` 的 provider 顺序，移除旧第三方首选模型
- 同步将原创笔记任务创建时的 `modelName` 改为 `deepseek-v4-pro`

### 3.3 数据与配置

- 不新增环境变量
- 不调整文生图模型配置，仍保持 `gpt-image-2 -> nano-banana-pro-2k -> gemini-3-pro-image-preview-2k`

## 4. 修改意图

- 采用国内文生文模型优先，是为了与用户最新指定链路保持一致，减少模型行为偏差
- 没有改动最后的文生图 fallback，是因为用户明确要求“生图大模型不变”
- 将任务记录主模型名同步为 `deepseek-v4-pro`，能让任务状态与真实执行链路保持一致

## 5. 影响范围

- 影响页面：`/xiaohongshu` 的原创笔记创作链路
- 影响接口：`/api/works/brands/:brandId/xiaohongshu/original/generate`
- 影响模块：`WorksModule`
- 不影响已有作品数据

## 6. 验证方式

- 编译验证：`apps/server` 执行 `npm run build`
- 诊断验证：检查 `works.service.ts` 无新增诊断错误

## 7. 风险与后续

- 当前文生图阶段仍可能因为第三方图片模型接口权限或请求结构问题返回 `403`
- 后续仍需继续联调图片生成 fallback，确认 `gpt-image-2` 与备用模型在当前接口上的可用性

## 8. 相关文件

- `apps/server/src/modules/works/works.service.ts`
- `docs/changes/2026-05-05-original-note-text-model-order.md`
