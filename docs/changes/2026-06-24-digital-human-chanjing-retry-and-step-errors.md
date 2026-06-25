# 2026-06-24 数字人创建链路蝉镜重试与分步骤报错

## 背景

- 抖音工作台 `数字人 -> 快速创建数字人` 在上传训练视频后，页面偶发提示 `上游服务暂时不可用（502 Bad Gateway）`
- 原有链路无法明确区分失败发生在：
  - 获取蝉镜上传地址
  - 上传训练视频
  - 等待文件同步完成
  - 创建数字人训练任务
  - 等待训练结果

## 本次改动

### 1. 蝉镜 OpenAPI 网关类错误自动重试

- 文件：`apps/server/src/modules/works/chanjing-open-api.service.ts`
- 对蝉镜 OpenAPI 调用增加短重试，覆盖以下典型瞬时错误：
  - `502 Bad Gateway`
  - `503 Service Unavailable`
  - `504 Gateway Timeout`
  - `524`
  - `ECONNRESET`
  - `socket hang up`
  - `fetch failed`
  - 请求超时
- 重试时通过服务端日志记录接口路径、状态码和重试次数，便于线上排查。

### 2. 数字人创建流程拆分为明确步骤错误

- 文件：`apps/server/src/modules/works/works.service.ts`
- `createDouyinDigitalHumanCustomPerson(...)` 现在会分别返回更清晰的错误提示：
  - `数字人训练视频上传失败`
  - `数字人训练任务创建失败`
  - `数字人训练结果同步失败`

### 3. 训练视频上传内部步骤继续细化

- 文件：`apps/server/src/modules/works/works.service.ts`
- `uploadChanjingCustomPersonTrainingVideo(...)` 内部细分为：
  - `获取蝉镜训练视频上传地址失败`
  - `上传训练视频到蝉镜失败`
  - `等待蝉镜训练视频同步完成失败`

## 验证

- `GetDiagnostics`
- `pnpm build:server`

## 结果

- 同样的蝉镜瞬时网关抖动会优先被自动重试
- 即使最终失败，前端也能看到更接近真实步骤的错误，而不是统一的模糊 `502` 提示

## 补充修复

- 文件：`apps/server/src/modules/works/works.service.ts`
- 修复 `listDouyinDigitalHumanCustomPersons(...)` 的本地待处理记录合并逻辑：
  - 之前刚创建、但远端还没返回 `personId` 的本地数字人记录会被错误跳过
  - 导致页面表现为“上传后没有报错，但首页没有任何新增记录”
  - 现在会优先按本地 `workId` 去重并回显待处理记录
  - 即使蝉镜远端列表接口瞬时失败，只要本地快照已经写入，首页依然能显示这条待处理数字人
