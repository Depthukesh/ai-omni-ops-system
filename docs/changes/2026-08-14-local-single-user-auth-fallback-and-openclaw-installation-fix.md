# 2026-08-14 local-single-user 认证 fallback 与 OpenClaw 安装中心修复

## 1. 背景

本地单机版升级到 `0.1.26 / hotfix-51` 后，本机出现以下异常组合：

- 个人中心显示 `本地登录态`
- 页面顶部品牌信息与后端真实当前账号不一致
- OpenClaw 安装中心提示 `当前用户不存在`、`未配置品牌`
- SQLite 安装态下 `OpenClawDailyPlan`、`OpenClawLobsterDiary` 仍出现 `near "EXISTS": syntax error` 历史报错

## 2. 根因

### 2.1 `/auth/me` 与 `/auth/brands` 的 fallback 会把本地单机版带回演示态

此前 `auth.controller.ts` 对 `/auth/me`、`/auth/brands` 也启用了 `fallbackToDefaultUser`。  
当 local-single-user 里出现 SQLite 超时、锁等待或旧 token 会话失配时：

- `resolveRequestAuthContext()` 会进入 fallback
- fallback 再通过 `mock-data` 生成演示用户 / 演示品牌返回给前端

这会让页面从“真实本地账号 + 浏览器缓存登录态”被拉回到“演示账号语义”，造成品牌上下文错位。

### 2.2 OpenClaw 安装中心没有接入 local-single-user 的 fallback

`openclaw-installation.controller.ts` 之前仍强依赖正常 token 认证。  
当本地浏览器 token 已陈旧、session 查询超时或数据库短时锁住时，安装中心直接报：

- `当前用户不存在`
- `请先登录`

### 2.3 OpenClaw 两个工作区表的 SQLite 兼容 SQL 仍不够保守

`OpenClawDailyPlan` 和 `OpenClawLobsterDiary` 仍使用了：

- `COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') = ''`

这条语句虽然在多数 SQLite 版本可用，但在当前安装态历史环境里已反复触发建表/回填阶段异常，继续保留收益不高。

## 3. 本次改动

### 3.1 个人中心认证接口改回前端 session fallback 优先

文件：`apps/server/src/modules/auth/auth.controller.ts`

- `/auth/me`
- `/auth/brands`

不再启用 `fallbackToDefaultUser`。  
这样当后端真实登录态暂时失败时，前端会走自己已实现的浏览器 session fallback，而不是被后端塞回演示账号。

### 3.2 本地单机版 auth fallback 优先沿用当前 token 的真实 user/brand

文件：`apps/server/src/modules/auth/auth.service.ts`

- `resolveRequestAuthContext()` 在 local-single-user 下遇到：
  - SQLite timeout / lock
  - `当前用户不存在`
  - `登录态已失效`
- 会优先用当前 token 里的 `sub / bid / sid` 生成 fallback auth 上下文
- `resolveFallbackAuthContext()` 改为优先尝试 `preferredUserId / preferredBrandId`
- fallback profile 用户信息不再直接退回演示 `mock-data`

### 3.3 OpenClaw 安装中心接入 local-single-user fallback

文件：`apps/server/src/modules/openclaw/openclaw-installation.controller.ts`

以下接口统一启用 `fallbackToDefaultUser`：

- `GET /openclaw/installation-hub`
- `POST /openclaw/installation-hub/tokens/rotate`
- `DELETE /openclaw/installation-hub/tokens/:tokenId`
- `GET /openclaw/installation-hub/tokens/:tokenId/reveal`
- `GET /openclaw/installation-hub/skill-package.zip`

### 3.4 SQLite 兼容 SQL 收口

文件：

- `apps/server/src/modules/openclaw/openclaw-daily-plan.service.ts`
- `apps/server/src/modules/openclaw/openclaw-lobster-diary.service.ts`

将 `workspaceScope` 的空值回填条件改为更保守的：

- `"workspaceScope" IS NULL OR TRIM("workspaceScope") = ''`

## 4. 影响面检查

### 4.1 影响范围

- local-single-user 个人中心认证体验
- OpenClaw 安装中心
- OpenClaw 每日计划 / 每日复盘 SQLite 初始化链路

### 4.2 为避免副作用做的保护

- 没改登录协议、没改 token 结构
- 没改数据库 schema
- `/auth/me`、`/auth/brands` 只是去掉服务端 fallback，改回由前端 session fallback 接手
- OpenClaw 安装中心 fallback 只在 local-single-user 下兜底，不扩散到标准网站部署态

## 5. 验证

- `npm run build:server`

## 6. 后续建议

- 继续把 OpenClaw 其它 SQLite 工作区表中的类似空值回填 SQL 一并收口为保守写法
- 若仍出现“重启后账号没了”，下一步优先核查另一台机器的 `runtime databasePath` 是否漂移到另一份 SQLite 文件
