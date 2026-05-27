# 2026-05-18 移除柏拉图第三方平台

## 变更背景

- 柏拉图第三方平台已下线，继续在系统中保留该平台及其模型会导致：
  - 个人中心第三方接口配置仍展示已失效平台
  - 后台接口供应商仍保留不可用 Provider
  - 视频创作链路里的历史默认值继续指向已下线后端

## 本次调整

### 1. 移除柏拉图系统 Provider 基线

- 从系统级 `ApiProviderConfig` 种子中移除以下柏拉图共享代理 Provider：
  - `provider_runtime_text_global`
  - `provider_runtime_image_generation`
  - `provider_runtime_video_hailuo`
  - `provider_runtime_video_kling`
  - `provider_runtime_video_veo`
  - `provider_runtime_video_wan`
  - `provider_runtime_video_seedance`
- 保留其余可用平台：
  - `Right Codes`
  - `火山方舟`
  - `DeepSeek`
  - `Kimi`
  - `GLM`

### 2. 启动时自动清理旧数据库残留

- `ApiProvidersService` 启动引导阶段新增下线平台清理：
  - 若发现 Provider 的 `id` 属于柏拉图旧系统种子，自动删除
  - 若发现 Provider 的 `baseUrl / extraParams.baseUrls` 命中 `hk-api.gptbest.vip / api.gptbest.vip / api.bltcy.ai`，自动删除
- `ThirdPartyPlatformsService` 启动引导阶段同步新增平台清理：
  - 自动删除柏拉图平台基线
  - 自动清理该平台下已保存的 `UserThirdPartyPlatformSecret`

### 3. 视频链路默认值切到火山方舟 Seedance

- 视频笔记运行时若读到历史兼容值 `seedance / seedance20`，现在统一映射到 `volcengine_seedance_20`
- 视频笔记元数据缺省 Provider 也从旧 `seedance` 改为 `volcengine_seedance_20`
- 前端视频创作弹窗的兜底 Provider 选项同步改为 `火山方舟 Seedance 2.0`

### 4. 技能中心与用户覆盖层兼容旧值

- 后台技能基线启动时会把旧视频技能默认模型 `seedance` 自动回填为 `doubao-seedance-2-0-260128`
- 用户技能覆盖层若仍残留旧值 `seedance`，首次命中相关接口时会自动回填为火山方舟 Seedance 2.0 模型

## 影响范围

- 个人中心 `/personal-center/third-party-platforms`
- 后台 `/admin` 接口供应商
- 小红书视频笔记 Provider 选择与运行时解析
- 技能中心视频笔记默认模型显示

## 风险控制

- 旧视频默认值保留兼容映射，避免历史 `seedance` 文案直接触发运行时报错
