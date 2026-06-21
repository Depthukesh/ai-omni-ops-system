# 品牌账号角色持久化补强

## 1. 背景

- 品牌增长工作台中的品牌账号信息支持区分 `品牌号 / 员工号 / 达人号`。
- 但此前账号角色主要依赖采集结果 `metadataJson.accountRole` 与前端内存态保护，品牌档案真源 `PlatformAccount / CompetitorAccount` 并没有独立存储该角色。
- 结果是刷新页面、重新进入工作区或再次触发同步后，账号角色存在回落成 `BRAND` 的风险。

## 2. 文档核查结论

- 与 `docs/engineering-standards.md` 没有阻塞性冲突。
- 与历史变更文档的兼容要求一致，尤其是：
  - 继续保留 `metadataJson.accountRole` 的兼容读取；
  - 继续保留缺失历史数据时默认 `BRAND` 的回落；
  - 不推翻 `2026-06-20-douyin-account-sync-stability.md` 中关于前端/后端角色保护的既有修复。

## 3. 本次调整

### 3.1 数据库

- 为 `PlatformAccount` 新增可空字段 `accountRole`。
- 为 `CompetitorAccount` 新增可空字段 `accountRole`。
- 新增 Prisma migration：`20260621_brand_account_roles_first_pass`。

### 3.2 品牌档案真源

- `brands.service.ts` 的品牌账号、竞品账号替换接口现在会保存 `accountRole`。
- 读取品牌档案时，账号记录会一并回传 `accountRole`。
- mock 数据结构同步补齐 `accountRole`，避免本地假数据环境与数据库环境协议漂移。

### 3.3 采集链路

- `collectors.service.ts` 从 `PlatformAccount / CompetitorAccount` 读取预置账号时，保留其已存储的 `accountRole`。
- 合并品牌账号时：
  - 若数据库里已有显式角色，则优先沿用；
  - 若历史旧数据缺失角色，仍兼容回落到 `BRAND`；
  - 手动提交时显式传入的角色仍保持最高优先级。

## 4. 影响范围

- 影响页面：`/brand-growth` 品牌增长工作台中的账号采集区域。
- 影响模块：品牌账号信息、竞品账号信息，以及依赖品牌账号角色解释的下游采集结果。
- 对已有数据的影响：
  - 不会删除已有采集资产；
  - 历史无角色数据继续按 `BRAND` 兼容；
  - 新保存/新同步的数据会有更稳定的账号角色来源。

## 5. 风险控制

- 本次没有移除 `metadataJson.accountRole`，避免影响旧作品、旧采集资产的回读。
- 本次没有取消 `BRAND` 默认回落，避免历史数据出现空角色导致 UI 异常。
- 本次采用“数据库真源补强 + 旧链路继续兼容”的方式，避免与既有同步逻辑冲突。

## 6. 验证建议

- 在品牌账号信息中分别保存 `品牌号` 与 `员工号`，刷新页面后确认角色保持原值。
- 再次提交同一员工号，确认角色不会被品牌号覆盖。
- 执行：
  - `npx prisma generate`
  - `npm --workspace apps/server run build`
  - `npm --workspace apps/web run build`
