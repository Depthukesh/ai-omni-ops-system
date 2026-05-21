# 2026-05-21 Tikhub 品牌级 API Key 优先级修复

## 背景

- 用户已在个人中心填写并提交 `Tikhub` API Key，但抖音采集仍报 `Tikhub 接口请求失败: 400`。
- 每日热点同样依赖 `Tikhub`，需要与抖音采集共用同一条品牌级 Key 解析链路。

## 根因

- `collectors.service.ts` 中的 `resolveTikHubApiKey()` 原先优先读取服务器环境变量 `TIKHUB_API_KEY`。
- 只有环境变量为空时，才会回退到品牌级第三方平台配置。
- 这会导致服务器上遗留的旧 Key 或错误 Key 覆盖用户刚在个人中心/接口供应商中配置的新 Key。

## 修复

- 调整优先级为：
  - 若传入 `brandId`，优先解析该品牌在第三方平台配置中的 `Tikhub` API Key
  - 若品牌级未解析到，再回退到服务器环境变量 `TIKHUB_API_KEY`
- 这样抖音采集和每日热点都会优先使用品牌级 Tikhub Key。

## 额外增强

- 当 Tikhub 返回 `400/403/...` 时，尽量透传上游返回的 `message/msg/error/detail/message_zh`，便于快速判断是：
  - `sec_user_id` 不合法
  - `aweme_id` 不合法
  - 当前 Key 权限不足
  - 其他业务参数错误

## 影响文件

- `apps/server/src/modules/collectors/collectors.service.ts`
