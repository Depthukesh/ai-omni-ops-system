# 2026-08-19 local-single-user 认证链 owner 成员补齐读路径降压修复

## 背景

用户反馈笔记本上的 `0.1.50` 本地单机版“几乎所有页面都慢”。

现场日志显示，慢点并不是单个页面接口，而是高频认证公共链路在 SQLite 上持续超时：

- `AuthService.ensureOwnerBrandMemberships`
- `brandMember.upsert()`
- `Socket timeout (the database failed to respond to a query within the configured timeout...)`

对应日志文件：

- `workspace-notes/报错信息/server.err.log`

## 根因

`apps/server/src/modules/auth/auth.service.ts` 中，品牌列表读取与品牌访问校验这类高频读链路会先执行：

- `ensureOwnerBrandMemberships(userId)`

而旧实现的 `ensureOwnerBrandMemberships()` 会：

1. 找出当前用户拥有的所有品牌
2. 对每个品牌直接执行 `brandMember.upsert()`
3. 使用 `Promise.all(...)` 并发写库

这意味着即使 owner 成员关系本来已经是正确的，只要页面进入认证链：

- `/auth/me`
- `/auth/brands`
- 品牌访问校验
- 品牌列表读取

仍会在 SQLite 上重复触发一批并发写请求。

对 `local-single-user` 来说，这是错误的边界：高频读路径不该顺手做大批量写库自愈。

## 本次改动

修改文件：

- `apps/server/src/modules/auth/auth.service.ts`
- `docs/engineering-standards.md`

### 1. 品牌列表读取改为“先读，缺失时再修”

`listAccessibleBrands()` 现在默认直接读取有效 `brandMember` 关系。

只有在：

- 当前没有任何有效成员关系

时，才会受控触发一次 owner 成员补齐，然后重新读取。

### 2. 品牌访问校验改为“命中失败时再修”

`loadBrandAccess()` 现在会先直接查询目标品牌的有效成员关系。

只有在：

- 当前品牌访问关系未命中

且用户确实是该品牌 owner 时，才会补一次 owner 成员关系后重试。

### 3. owner 成员补齐改为“只修缺失/失真关系”

`ensureOwnerBrandMemberships()` 现在不再对所有 owner 品牌无差别 `upsert`。

新逻辑改为：

1. 查询 owner 品牌集合
2. 查询这些品牌当前已有的 `brandMember`
3. 仅筛出以下异常关系：
   - 成员记录缺失
   - 角色不是 `OWNER`
   - 状态不是 `ACTIVE`
4. 只对异常关系执行修复

### 4. 修复执行改为顺序写入

旧逻辑使用 `Promise.all(...)` 并发对 SQLite 写入。

新逻辑改为顺序修复，避免在本地单机 SQLite 上把瞬时写压放大成认证链公共超时。

### 5. 工程规则升级

在 `docs/engineering-standards.md` 中新增规则：

- `local-single-user` 的高频认证读链路不能再把 owner 成员补齐这类批量写库动作挂在每次请求上

## 影响面检查

### 受影响范围

- `local-single-user` 的认证公共链路
- 品牌列表读取
- 品牌访问校验
- 真实账号登录后进入个人中心、品牌工作台等依赖认证上下文的页面

### 为避免副作用做的保护

- 没有移除 owner 成员自愈能力
- 只是把修复时机从“每次读都写”收紧到“缺失时才修”
- 仍保留登录 / 刷新会话 / 本地账号续回时的 owner 成员补齐能力

## 第一性原理结论

这次问题暴露出的不是单点 SQL 慢，而是边界错误：

- 认证公共链路应该以“快读、稳读、少写”为目标
- owner 成员补齐属于数据修复动作，不应长期驻留在高频读路径
- 对 `local-single-user + SQLite` 这类单机环境，批量并发写入尤其不能放在用户每次打开页面都会经过的链路里

本次修复并不是简单“把并发改串行”，而是先把链路职责纠正回来：

- 先读
- 真缺了再修
- 修也只修异常项

## 验证

已执行：

- `npm run build:server`

结果：

- 后端构建通过

## 后续建议

后续针对 `local-single-user` 还应继续做两类收口：

1. 给认证链里的 SQLite 可用性探测增加短时请求级缓存，避免同一波页面并发请求重复探测数据库
2. 继续清理其它“高频读路径顺手写库”的模式，把补关系、补默认值、补种子这类动作移出主读链
