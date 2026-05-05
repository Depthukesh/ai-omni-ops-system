# 原创笔记文生图链路加固

## 1. 变更背景

- 原创笔记在文案和配图提示词阶段已经能跑通，但在图片生成阶段频繁失败
- 页面此前只暴露 `403`，无法判断是模型不可用、提示词过长还是返回结构无法解析
- 这次修改要让文生图链路更兼容、更易定位，并恢复真实生成成功率

## 2. 变更目标

- 提高原创笔记文生图阶段对第三方接口返回格式的兼容性
- 在不改变用户指定生图模型顺序的前提下，降低因提示词形态和响应解析差异导致的失败

## 3. 修改内容

### 3.1 前端

- 无新增页面结构改动

### 3.2 后端

- 调整 `buildImageGenerationPayload()`，统一使用多段 `content` 结构发送图片生成请求
- 调整 `generateImageAsset()`，同一模型下增加“原始提示词 + 压缩净化提示词”两轮尝试
- 调整 `extractGeneratedImagePayload()`，兼容 JSON、Markdown 图片链接、普通链接和数组内容
- 增加非 2xx 响应摘要读取，失败时把接口返回片段拼接到错误信息里

### 3.3 数据与配置

- 不调整文生图模型顺序，仍保持 `gpt-image-2 -> nano-banana-pro-2k -> gemini-3-pro-image-preview-2k`
- 不新增环境变量

## 4. 修改意图

- 保持模型顺序不变，是为了遵守用户对生图模型链路的明确要求
- 增加净化提示词重试，是为了兼容代理图片接口对长提示词、特殊符号和格式噪音的敏感性
- 强化响应解析，是为了适配不同模型返回 Markdown 链接、数组内容和 JSON 的差异

## 5. 影响范围

- 影响页面：`/xiaohongshu` 的原创笔记生成结果
- 影响接口：`/api/works/brands/:brandId/xiaohongshu/original/generate`
- 影响模块：`WorksModule`
- 不影响已有作品数据；只影响新生成链路

## 6. 验证方式

- 编译验证：`apps/server` 执行 `npm run build`
- 接口验证：手工调用原创笔记生成接口，确认出现新的 `XHS_ORIGINAL_NOTE SUCCESS` 任务
- 结果验证：原创笔记作品列表出现新作品，并包含封面图 URL

## 7. 风险与后续

- 第三方图片接口仍受站点状态、限流和账号权限影响，极端情况下仍可能失败
- 若后续再次出现 4xx，可基于现在透出的响应摘要继续细化特定模型的专属 payload

## 8. 相关文件

- `apps/server/src/modules/works/works.service.ts`
- `docs/changes/2026-05-05-original-note-image-chain-hardening.md`
