# 2026-05-16 RunningHub 视频平台接入

## 1. 背景

- 用户要求新增一个与既有第三方接口平台同级的平台接入，需同时出现在：
  - 前端 `/personal-center/third-party-platforms`
  - 后台 `/admin` 的“接口供应商”
- 本次平台为 `https://www.runninghub.cn`
- 接入范围不只是平台名展示，还包括小红书视频笔记运行时真正可调用的 Provider

## 2. 本次处理

- `ApiProviderConfig` 运行时种子新增 RunningHub 视频 Provider
  - 覆盖海螺 2.3、Vidu Q3、可灵 3.0、seedance 2.0、happyhorse 1.0 五组视频模型
  - 每条 Provider 统一补入 `backendKey`、`displayLabel`、`requestProfile`、`createPath`、`queryPath`、`durationOptions`
  - 所有 RunningHub 视频 Provider 统一归类到 `runtimeKey=video-generation`
- 平台级第三方目录新增 RunningHub 平台聚合
  - `www.runninghub.cn` 映射为 `RunningHub 平台`
  - `ThirdPartyPlatformConfig` 引导时会自动从运行时种子聚合出 RunningHub 平台基线
  - 因此前台个人中心和后台接口供应商会自动看到 RunningHub 平台，不需要再手工新增第二份平台清单
- `WorksService` 视频生成运行时从“固定 5 个后端硬编码”升级为“按 Provider 元数据驱动”
  - `VideoBackendKey` 放宽为字符串，按 `backendKey` 动态匹配当前激活 Provider
  - 新增 `requestProfile` 适配层，分别兼容 RunningHub 的海螺、Vidu、可灵、seedance、happyhorse 请求体
  - 新增 `queryMethod` 与 `queryBodyMode`
  - 兼容 RunningHub 任务查询接口 `POST /openapi/v2/query`，请求体为 `{ taskId }`
  - 兼容 RunningHub 返回体中的 `taskId`、`results[].url`、`task_status`、失败原因字段
- 品牌私钥隔离继续沿用既有平台规则
  - 当视频 Provider 的 `baseUrl` 命中 RunningHub 平台时，真实运行时仍优先读取当前品牌 Owner 在个人中心维护的私有 API Key
  - 若 Owner 未配置 RunningHub Key，则继续返回中文提醒，不回退公共 Key

## 3. 影响文件

- `apps/server/src/common/api-provider-catalog.ts`
- `apps/server/src/common/third-party-platform-catalog.ts`
- `apps/server/src/modules/works/works.service.ts`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/database-archive.md`
- `docs/README.md`

## 4. 验证结果

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/common/third-party-platform-catalog.ts`
  - 无新增诊断错误
- `npm --workspace apps/server run build`
  - 通过
- 平台引导链路复核
  - `THIRD_PARTY_PLATFORM_SEEDS` 由 `SYSTEM_API_PROVIDER_SEEDS` 聚合生成
  - `ThirdPartyPlatformsService.ensureBootstrapSeeded()` 会自动补齐缺失平台
  - 结论：RunningHub 会进入前后台同一份平台基线

## 5. 当前边界

- 本次已完成平台基线、运行时 Provider 和视频请求/查询适配
- 本次未执行真实 RunningHub 外部 API 调用验证，因此实际账号额度、限流、第三方返回时延仍需在配置私钥后做一次联调
- 当前 RunningHub 主要覆盖视频生成链路，不涉及文本生成或图像生成平台能力扩展
