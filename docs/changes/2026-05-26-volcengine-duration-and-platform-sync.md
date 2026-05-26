# 2026-05-26 火山方舟 Seedance 时长修正与系统平台同步

## 背景

- 视频笔记创建弹窗已允许用户选择 `10s` 或 `15s`。
- 用户实测选择火山方舟 Seedance 生成 `15s` 视频时，最终结果仍落成 `10s`。
- 同期还暴露出一个平台配置层问题：
  - 个人中心不展示 `baseUrl`
  - 但运行时平台匹配仍依赖数据库中的 `ThirdPartyPlatformConfig.baseUrl`
  - 如果历史库里系统平台记录漂移，会导致“当前品牌未匹配到第三方平台配置”这类误报。

## 根因

### 1. 火山方舟 Seedance 时长能力声明过旧

- 视频生成链路会先调用 `normalizeRequestedVideoDuration()` 保留用户选择的 `10` 或 `15`。
- 之后 `normalizeProviderDuration()` 会按照 Provider 自身的 `durationOptions` 取最近值。
- 火山方舟 Seedance 两个系统 Provider 之前仍声明为 `[5, 10]`，因此用户请求 `15` 时会被压到最近的 `10`。

### 2. 系统平台同步未纠正 baseUrl

- `ThirdPartyPlatformsService.syncSeedPlatform()` 之前只会同步：
  - `modelIdsJson`
  - `tutorialUrl`
  - `defaultModel`
  - `remark`
- 不会纠正数据库中已有系统平台记录的：
  - `name`
  - `providerType`
  - `status`
  - `baseUrl`
- 当火山方舟平台历史记录的 `baseUrl` 漂移时，运行时即使代码种子已是正确地址，也可能匹配失败。

## 本次修复

### 1. 修正火山方舟 Seedance 时长能力

- 更新文件：
  - `apps/server/src/common/api-provider-catalog.ts`
- 将火山方舟 Seedance 2.0 / 2.0 Fast 的 `durationOptions` 修正为 `4~15 秒`。
- 这样 `normalizeProviderDuration()` 不会再把用户选择的 `15s` 压成 `10s`。

### 2. 修正火山方舟图生视频 role

- 更新文件：
  - `apps/server/src/modules/works/works.service.ts`
- 图生视频请求体按最新火山方舟文档使用：
  - `type: "image_url"`
  - `role: "reference_image"`

### 3. 增强系统平台自愈同步

- 更新文件：
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
- 系统平台启动同步时，除模型列表外，还会纠正：
  - `name`
  - `providerType`
  - `status`
  - `baseUrl`
- 这样即使前端不向用户暴露 `baseUrl`，系统平台也能回到代码内置值，避免旧库记录继续影响火山方舟匹配。

## 影响

- 小红书视频笔记中，选择火山方舟 Seedance 并指定 `15s` 时，不会再被运行时自动压成 `10s`。
- 火山方舟平台在数据库已有旧记录的情况下，会在服务初始化时自动回正系统平台关键信息。
- 后续排查火山方舟问题时，应优先区分：
  - 平台匹配问题
  - 模型权限问题
  - 请求体字段问题
  - Provider 时长能力声明问题

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/api-provider-catalog.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
- `npm --workspace apps/server run build`
