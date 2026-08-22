# 2026-08-14 local-single-user SQLite 可用性探测重试修复

## 1. 背景

在已经安装 `hotfix-54` 后，本机仍出现：

- 安装和启动已经成功
- `sqlite3` 直接连接 `%APPDATA%\\AiOmniOps\\db\\local-single-user.sqlite` 正常
- 但 `POST /auth/local-single-user/resume` 仍返回：
  - `本地数据库暂不可用，请稍后重试`

同时 `server.log` 中可见：

- `local-single-user 模式下数据库尚不可用，跳过默认用户/品牌初始化。`

## 2. 根因

`apps/server/src/prisma/prisma.service.ts` 中的 `canUseDatabase()` 之前只有一次：

```ts
await this.$queryRawUnsafe("SELECT 1");
```

对于 local-single-user 的 SQLite 启动期，这个判断过于脆弱：

- Prisma 连接刚建立时的瞬时抖动
- SQLite 短时 `BUSY / LOCKED`
- 启动期 connector timeout

都会让 `canUseDatabase()` 直接返回 `false`。

结果是：

- 本地单机 bootstrap 误以为数据库不可用
- 真实本地会话自动续回接口也被一起拦掉

## 3. 本次改动

文件：`apps/server/src/prisma/prisma.service.ts`

### 3.1 `canUseDatabase()` 改为先连接再探测

- 在探测前先执行 `await this.$connect()`
- 不再只依赖“裸打一条 `SELECT 1`”

### 3.2 SQLite 模式增加短重试

- PostgreSQL 维持单次判断
- local SQLite 模式改为最多 `3` 次探测
- 只对这些已知瞬时错误重试：
  - `Socket timeout`
  - `database failed to respond`
  - `SQLITE_BUSY`
  - `SQLITE_LOCKED`
  - `Timed out during query execution`
  - `ConnectorError`

### 3.3 重试间隔保持很短

- 每次只做受控短等待
- 避免把启动探测本身变成新的长阻塞

## 4. 影响面检查

### 4.1 影响范围

- `PrismaService.canUseDatabase()`
- 所有依赖该判断的 local-single-user 启动期与运行期逻辑：
  - auth
  - personal-center
  - OpenClaw
  - 本地 bootstrap

### 4.2 为避免副作用做的保护

- 只对 local SQLite 增加重试
- PostgreSQL 不改探测节奏
- 只对典型瞬时错误重试，不把所有异常都吞成“重试直到超时”

## 5. 验证

- 本机安装 `hotfix-54` 后复现：
  - SQLite 文件可直接查询
  - 但 API 进程启动日志仍报告数据库暂不可用
- 代码层已将该单点探测改为“连接 + SQLite 短重试”

## 6. 后续建议

- 基于该修复继续打包新包
- 重新安装后优先验证：
  - `POST /auth/local-single-user/resume` 能返回真实账号
  - 个人中心是否从 `演示账号` 自动切回真实账号
