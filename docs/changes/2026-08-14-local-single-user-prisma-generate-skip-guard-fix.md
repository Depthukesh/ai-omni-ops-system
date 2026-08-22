# 2026-08-14 local-single-user Prisma generate 跳过判定修复

## 1. 背景

本机已经安装到 `hotfix-55 / 0.1.30`，但页面仍持续显示：

- `本地登录态`
- `演示账号`

继续排查时发现：

- `runtime/local-single-user-runtime.json` 已确认当前运行的是 `local-single-user-win-x64-2026-08-14-hotfix-55`
- SQLite 文件可直接读，真实用户和真实 `UserSession` 记录仍在
- 但 `POST /auth/local-single-user/resume` 仍返回：
  - `本地数据库暂不可用，请稍后重试`
- 安装目录 `app/node_modules/.prisma/client/schema.prisma` 当前仍是：
  - `provider = "postgresql"`

同时 `launcher.log` 显示本轮启动连续命中：

- `Skip local Prisma generate`
- `Skip local Prisma db push`

## 2. 根因

`scripts/local-single-user-launcher.cjs` 之前判断是否跳过 `prisma generate` 时，只看：

- `runtime/local-prisma-generate-state.json` 里的 `schemaHash`
- `.prisma/client` 目录和 query engine 文件是否存在

但它**没有检查安装目录里当前真实生成出来的 Prisma client 是否仍然匹配本地单机版的 SQLite schema**。

这样一来，只要：

1. 旧运行时已经记录过 `schemaHash`
2. 后续升级包又把 `node_modules/.prisma/client` 覆回了默认 PostgreSQL 版本

launcher 仍会误判“已经 generate 过”，继续跳过本地 SQLite 的重新生成。

最终后果是：

- 安装态实际跑着错误 provider 的 Prisma client
- `canUseDatabase()`、`/auth/local-single-user/resume` 等链路会把数据库持续判成不可用
- 前端又回落到浏览器里的默认本地演示会话

## 3. 本次改动

文件：`scripts/local-single-user-launcher.cjs`

### 3.1 收紧 `hasGeneratedPrismaClient()` 判定

在原有“目录存在 + query engine 存在”的基础上，新增对：

- `node_modules/.prisma/client/schema.prisma`

的真实检查。

只有当其中 `datasource db` 的 `provider` 仍然是 `sqlite` 时，才允许把当前 client 视为可复用。

### 3.2 生成结果与 state 双重校验

即使 runtime 下残留的是旧的 `schemaHash` 缓存，只要安装目录里的 `.prisma/client/schema.prisma` 已经被升级包覆回 PostgreSQL 版本，launcher 也会在下次启动时：

- 强制重新执行 `prisma generate`

不再继续误跳过。

## 4. 影响面检查

### 4.1 影响范围

- `local-single-user` launcher 的 Prisma 生成跳过逻辑
- 本地单机版升级后首轮启动

### 4.2 为避免副作用做的保护

- 只收紧 `local-single-user` launcher 对“已生成 client”的判断
- 不改业务接口协议
- 不改数据库 schema
- 不改前端会话逻辑

## 5. 验证

已完成验证：

- 现场确认安装目录 `app/node_modules/.prisma/client/schema.prisma` 当前确实是 `provider = "postgresql"`
- 现场确认 runtime 仍缓存了与当前 `schema.local.prisma` 一致的 `schemaHash`，导致 launcher 连续跳过 `prisma generate`
- 代码层已改为：跳过前必须额外校验真实生成 client 的 datasource provider 是否为 `sqlite`

待继续验证：

- 用包含该修复的新包重新安装 / 启动后，确认 launcher 会重新 generate 本地 Prisma client
- 再次验证 `POST /auth/local-single-user/resume` 是否恢复真实账号
- 再次验证个人中心是否不再显示 `演示账号`
