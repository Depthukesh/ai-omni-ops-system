# 2026-05-17 火山方舟 Seedance 2.0 视频 Provider 接入

## 背景

- 用户要求新增两个第三方大模型视频接口，并同时出现在：
  - 前端个人中心 `/personal-center/third-party-platforms`
  - 后台 `/admin` 的“接口供应商”
- 指定模型为：
  - `doubao-seedance-2-0-260128`
  - `doubao-seedance-2-0-fast-260128`
- 指定接口文档为火山方舟视频生成 API：
  - 创建任务：`POST /api/v3/contents/generations/tasks`
  - 查询任务：`GET /api/v3/contents/generations/tasks/{id}`

## 本次处理

### 1. 新增火山方舟 Seedance 视频运行时 Provider

- 更新：
  - `apps/server/src/common/api-provider-catalog.ts`
- 新增两个 `video-generation` 系统 Provider：
  - `provider_runtime_video_volcengine_seedance_20`
  - `provider_runtime_video_volcengine_seedance_20_fast`
- 两条 Provider 统一挂在：
  - `baseUrl=https://ark.cn-beijing.volces.com/api/v3`
- 并补入：
  - `backendKey`
  - `displayLabel`
  - `createPath=/contents/generations/tasks`
  - `queryPath=/contents/generations/tasks/{id}`
  - `queryMethod=GET`
  - `requestProfile=volcengine_seedance`
  - `supportsTextToVideo=true`
  - `supportsImageToVideo=true`

### 2. 视频生成运行时新增火山方舟 Seedance 请求/查询适配

- 更新：
  - `apps/server/src/modules/works/works.service.ts`
- 新增 `volcengine_seedance` 请求构造逻辑：
  - 文生视频时提交 `model + content[text]`
  - 图生视频时提交 `model + content[text + image_url(first_frame)]`
- 查询链路补充：
  - `resolveVideoQueryPath()` 兼容 `{id}` 占位符
  - `readVideoTaskSnapshot()` 兼容火山方舟返回的 `content.video_url / content.last_frame_url / error.message`
  - `normalizeVideoTaskStatus()` 兼容 `running / cancelled / expired`

### 3. 平台级第三方接口配置补齐旧平台模型列表

- 更新：
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
- 现有“火山方舟平台”如果已经在数据库中存在，不会再只做“缺失项插入”
- 启动引导时会把新模型 ID 自动并入已有平台记录的 `modelIdsJson`
- 因此前端个人中心和后台接口供应商都会自动看到：
  - `doubao-seedance-2-0-260128`
  - `doubao-seedance-2-0-fast-260128`

## 影响范围

- 前端个人中心第三方接口配置
- 后台接口供应商
- 视频笔记视频模型下拉与运行时视频生成
- 火山方舟平台聚合模型列表

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/api-provider-catalog.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
- `npm --workspace apps/server run build`

## 当前边界

- 本次已完成平台基线、运行时 Provider 和火山方舟视频请求/查询协议接入
- 本次未直接执行真实火山方舟账号联调，实际额度、模型开通状态和账号权限仍需在配置私钥后走一次真实视频链路确认
