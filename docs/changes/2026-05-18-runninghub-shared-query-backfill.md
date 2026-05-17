# 2026-05-18 RunningHub 统一查询接口补齐与旧 Provider 回填

## 背景

用户反馈 RunningHub 第三方视频模型生成时报错，核心诉求是把 RunningHub 官方统一查询接口：

- `https://www.runninghub.cn/openapi/v2/query`
- 文档：`https://www.runninghub.cn/runninghub-api-doc-cn/api-425767306`

接入到所有 RunningHub 第三方大模型生成链路，避免不同模型仍沿用旧的查询方式或缺失查询配置。

## 根因

本次问题有两层：

### 1. 运行时默认值不够强

`WorksService.loadVideoProviderConfig()` 之前虽然会从 `ApiProviderConfig.extraParams` 读取：

- `queryPath`
- `queryMethod`
- `queryBodyMode`

但如果数据库中的 RunningHub Provider 是较早写入的旧记录，缺少这些字段，就会回退到通用视频查询默认值：

- `GET /v2/videos/generations/{task_id}`

这不适用于 RunningHub。

### 2. 系统 Provider 种子只会“插入缺失项”，不会“补齐已存在记录的新字段”

`ApiProvidersService.bootstrapSystemProviders()` 之前只对缺失的系统 Provider 做插入：

- 已存在的 RunningHub Provider 不会随着新版本系统种子自动补进 `queryPath/queryMethod/queryBodyMode`
- 因此代码仓库即使已经补了 RunningHub 查询接口，线上数据库中的旧 Provider 仍可能继续保持旧配置

## 本次修正

### 1. RunningHub 查询接口元数据收口到系统种子

文件：

- `apps/server/src/common/api-provider-catalog.ts`

新增并复用：

- `RUNNINGHUB_BASE_URL`
- `RUNNINGHUB_RESULT_QUERY_PATH`
- `RUNNINGHUB_RESULT_QUERY_DOC_URL`

所有 RunningHub 视频 Provider 统一补入：

- `queryPath=/openapi/v2/query`
- `queryMethod=POST`
- `queryBodyMode=taskId-json`
- `queryTutorialUrl=https://www.runninghub.cn/runninghub-api-doc-cn/api-425767306`

### 2. 视频运行时对 RunningHub 做强默认兜底

文件：

- `apps/server/src/modules/works/works.service.ts`

在 `loadVideoProviderConfig()` 中新增 RunningHub 判定：

- 只要当前 Provider 的 `baseUrl/baseUrls` 命中 `runninghub.cn`
- 运行时就强制使用：
  - `queryPath=/openapi/v2/query`
  - `queryMethod=POST`
  - `queryBodyMode=taskId-json`

即使数据库里的旧 Provider 没补齐这几个字段，视频生成链路也不会再回退到错误的通用查询接口。

### 3. 系统 Provider 启动时回填旧 RunningHub 记录

文件：

- `apps/server/src/modules/admin/api-providers.service.ts`

`bootstrapSystemProviders()` 现在不再只处理“缺失项插入”，还会对已存在的系统 Provider 做同步：

- 识别 RunningHub Provider
- 保留现有平台状态、默认模型、密钥等用户可维护字段
- 仅把系统级稳定元数据补回到 `extraParamsJson`

重点回填：

- `queryPath`
- `queryMethod`
- `queryBodyMode`
- `queryTutorialUrl`
- `createPath`
- `requestProfile`
- `durationOptions`
- `displayLabel`
- `backendKey`

## 影响范围

- 视频笔记短视频生成
- 所有 RunningHub 视频 Provider
- 后台 `/admin` 接口供应商对应的运行时配置
- 前台个人中心基于 RunningHub 平台的品牌私钥视频生成链路

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/api-provider-catalog.ts`
  - `apps/server/src/modules/admin/api-providers.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server run build`

以上均通过。

## 当前边界

- 本次已补齐 RunningHub 统一查询接口与旧 Provider 元数据回填
- 本次未直接执行真实 RunningHub 外部任务联调，真实账号额度、第三方限流与个别模型创建返回体差异仍需线上再走一遍主链路确认
