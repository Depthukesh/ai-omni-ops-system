# 2026-05-11 飞书 OAuth 默认回调地址修正

## 1. 背景

- 线上品牌增长页的飞书应用配置表单中，`授权回调地址` 默认值仍显示为 `http://localhost:3011/api/auth/feishu/oauth/callback`
- 用户按该默认值保存或直接参考填写飞书开放平台安全设置时，会在授权阶段触发飞书 `20029`：重定向 URL 有误

## 2. 根因

- 后端 `AuthService.getDefaultRedirectUri()` 在未配置 `FEISHU_OAUTH_REDIRECT_URI` 时，默认回退到本地开发地址 `http://localhost:3011/api/auth/feishu/oauth/callback`
- 该默认值会同时影响：
  - 飞书应用配置接口返回给前端的 `redirectUri`
  - 无显式配置时生成的飞书授权地址 `redirect_uri`
- 因此前端页面与实际 OAuth 授权链路都会误用 `localhost`，与飞书开放平台中登记的生产回调地址不一致

## 3. 本次修复

- 将 `AuthService.getDefaultRedirectUri()` 改为：
  - 优先使用 `FEISHU_OAUTH_REDIRECT_URI`
  - 若未配置，则自动基于 `WEB_BASE_URL` 拼接 `${WEB_BASE_URL}/api/auth/feishu/oauth/callback`
- 将品牌增长页飞书应用配置表单中的示例占位文案，改为生产可用示例：
  - `https://17ai.site/api/auth/feishu/oauth/callback`

## 4. 影响范围

- 飞书应用配置页默认展示值
- 飞书授权发起接口 `/api/auth/feishu/oauth/start`
- 飞书 OAuth 回调链路 `/api/auth/feishu/oauth/callback`

## 5. 验证方式

- 服务端构建：`npm run build:server`
- 前端构建：`npm --workspace apps/web run build`
- 线上复验：
  - 品牌增长页 `收集数据` 中默认 `授权回调地址` 不再显示 `localhost`
  - 飞书开放平台与系统后台中都统一填写 `https://17ai.site/api/auth/feishu/oauth/callback`
  - 再次发起飞书授权，不应再因默认回调地址错误触发 `20029`
