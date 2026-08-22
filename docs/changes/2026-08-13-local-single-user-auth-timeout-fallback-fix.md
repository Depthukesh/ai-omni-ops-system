# 2026-08-13 local-single-user 认证查询超时 fallback 修复

## 1. 背景

用户反馈另一台已安装 `hotfix-47` 的本地单机版机器，即使重新安装修复包后，个人中心仍可能出现：

- `本地登录态`
- `版本与升级` 入口不显示

已知这类页面的共同前置依赖是：

- `/auth/me`
- `/auth/brands`
- `/system/update/status`

其中 `system/update/status` 之前已经允许 fallback 默认用户，但 `/auth/me` 与 `/auth/brands` 仍强依赖数据库里的 `userSession` 查询。

## 2. 根因

在 `local-single-user` 模式下，浏览器已持有 token 时，认证链会优先走数据库：

- `userSession.findUnique()`
- `user.findUnique()`

只要 SQLite 短时卡住或超时，即使本地工作台已经启动成功、默认用户也存在，接口仍会直接失败，导致前端降级为“本地登录态”，并把依赖升级状态接口的页面入口一起折叠掉。

## 3. 本次改动

### 3.1 `/auth/me` 与 `/auth/brands` 改为允许 fallback

- 文件：`apps/server/src/modules/auth/auth.controller.ts`
- 这两个接口现在也会传入：
  - `fallbackToDefaultUser: true`

### 3.2 认证链只在 local-single-user + 数据库短时异常时兜底

- 文件：`apps/server/src/modules/auth/auth.service.ts`
- `resolveRequestAuthContext()` 现在在数据库查询阶段增加受控 fallback：
  - 仅限 `local-single-user`
  - 仅限显式允许 fallback 的接口
  - 仅限数据库短时异常，例如：
    - `Socket timeout`
    - `database failed to respond`
    - `SQLITE_BUSY`
    - `SQLITE_LOCKED`

### 3.3 真正的登录失效仍保持原语义

- 对以下情况不做 fallback：
  - token 无效
  - session 已过期
  - 用户不存在
  - 账号停用 / 到期

## 4. 影响面检查

### 4.1 受影响范围

- local-single-user 个人中心基础接口
- 版本与升级页可见性
- 本地单机版启动后偶发数据库抖动场景

### 4.2 为避免副作用做的保护

- 不放宽标准运行态
- 不放宽真正的未登录 / 已失效判定
- 只在显式允许 fallback 的接口中启用

## 5. 验证

- 静态核对：
  - `apps/server/src/modules/auth/auth.controller.ts`
  - `apps/server/src/modules/auth/auth.service.ts`
- 后端构建通过：
  - `npm run build:server`

## 6. 后续建议

- 后续如果还有个别机器仍出现“本地登录态”，优先抓取最新 `server.err.log`
- 若日志继续显示 SQLite 超时，应继续排查该机器本地数据库文件是否被其他进程占用
