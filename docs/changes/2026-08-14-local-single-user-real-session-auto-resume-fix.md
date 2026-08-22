# 2026-08-14 local-single-user 真实账号会话自动续回修复

## 1. 背景

本机已经升级到 `hotfix-53 / 0.1.28` 后，页面仍可能出现：

- 个人中心顶部显示 `本地登录态`
- 账号卡片显示 `演示账号`
- 真实 SQLite 里其实已经存在用户 `allentry@126.com` 与品牌 `王笑东的品牌`

这说明问题不再是安装包未生效，而是浏览器当前使用的仍是旧的本地默认账号会话。

## 2. 根因

### 2.1 浏览器本地 session 可能仍停留在 `local_default_user`

`local-single-user` 启动时会确保默认用户 / 默认品牌存在：

- `local_default_user`
- `local_default_brand`

如果浏览器本地 `localStorage` 里还残留着这套旧 session，前端请求会继续带着默认账号 token 发到后端。

### 2.2 当前机器其实已经存在真实登录会话，但前端没有自动续回

SQLite 中最近的 `UserSession` 已经属于真实注册用户，而不是默认用户。
但前端请求层此前没有“发现自己还在默认账号 -> 自动切回最近真实本地会话”的逻辑，于是页面持续显示演示态。

## 3. 本次改动

### 3.1 后端新增 local-single-user 会话续回接口

文件：`apps/server/src/modules/auth/auth.controller.ts`
文件：`apps/server/src/modules/auth/auth.service.ts`

新增：

- `POST /auth/local-single-user/resume`

行为：

- 仅在 `local-single-user` 下可用
- 优先续回最近一个未过期、未撤销、且不属于 `local_default_user` 的真实会话
- 若最近真实会话不存在，则回退到最近登录过的真实用户并重新签发一套 token
- 若机器上根本没有真实账号，则返回未授权，不会把默认用户强行当成正式登录账号

### 3.2 前端请求层自动把默认本地会话切回真实账号

文件：`apps/web/src/services/http.ts`

新增逻辑：

- 当运行环境是 `local-single-user`
- 且当前请求不是 `/auth/*`
- 且浏览器 session 满足以下任一条件时：
  - 没有 access / refresh token
  - 当前用户是 `local_default_user`
  - 当前品牌是 `local_default_brand`

前端会先调用：

- `POST /auth/local-single-user/resume`

如果成功，就用真实账号的新 token 覆盖本地 `ai-omni-auth-session`，再继续原请求。

同时，在普通请求收到 `401` 且常规 refresh 失败后，也会再尝试一次这条 local-single-user 真实账号续回链路。

## 4. 影响面检查

### 4.1 影响范围

- `local-single-user` 下所有走前端 `request()` 的受保护接口
- 个人中心、品牌增长、内容获客、GEO、设计工作台等依赖本地浏览器 session 的页面

### 4.2 为避免副作用做的保护

- 网站版 / 标准运行态不受影响
- `/login`、`/register`、`/admin/login` 等公开认证页不会触发自动续回
- 若机器上没有真实账号，只会维持原有登录态判断，不会偷偷把默认账号当成正式账号注入浏览器

## 5. 验证

- 核对本机 `release-manifest.json` 与 `runtime/local-single-user-runtime.json`，确认已运行 `hotfix-53 / 0.1.28`
- 核对 SQLite：
  - 存在真实用户 `allentry@126.com`
  - 存在真实品牌 `王笑东的品牌`
  - 最近 `UserSession` 已属于真实注册用户
- 直打匿名 `/api/auth/me`、`/api/auth/brands` 为 `401`，说明“演示账号”不是当前后端直接返回，而是浏览器旧 session 造成

## 6. 后续建议

- 重新发包后，本机优先验证个人中心是否自动从 `演示账号` 切回真实账号
- 若仍异常，再直接读取浏览器 `localStorage['ai-omni-auth-session']` 与 `/auth/local-single-user/resume` 返回值做最终核对
