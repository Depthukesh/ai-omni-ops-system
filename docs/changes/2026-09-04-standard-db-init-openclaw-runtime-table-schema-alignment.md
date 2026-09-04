# 2026-09-04 标准运行态 db-init 与 OpenClaw 运行时表 schema 对齐

## 背景

标准 Docker 运行态更新后，`db-init` 在执行 `prisma db push` 时会直接退出：

```text
Error: Use the --accept-data-loss flag to ignore the data loss warnings
```

进一步确认发现，Prisma 把以下已存在真实数据的 OpenClaw 运行时表识别成了“schema 外多余表”，因此判断本次同步会删表：

- `OpenClawThirdPartyMediaResource`
- `OpenClawThirdPartyMediaSyncState`

这会直接中断标准运行态的 `db-init -> server -> web` 首启 / 更新链。

## 真实根因

当前标准 Docker 运行态仍通过：

- `npm run prisma:generate`
- `npm run prisma:db:push`
- `npm run prisma:seed:*`

完成初始化。

但部分 OpenClaw 持久化真源虽然已经在 PostgreSQL 中长期承接真实数据，仍停留在“服务启动时运行时建表”的模式，没有进入 `prisma/schema.prisma`。一旦用户已经用过这些板块、表里有数据，后续再跑 `prisma db push`，Prisma 就会把它们视为待删除表并触发 data loss 保护。

## 本次修复

### 1. 把标准运行态实际在用的 OpenClaw 运行时表正式纳入 Prisma schema

本次补入：

- `OpenClawComment`
- `OpenClawMarketingPlan`
- `OpenClawStrategyOptimization`
- `OpenClawThirdPartyMediaResource`
- `OpenClawThirdPartyMediaSyncState`

### 2. 保留服务侧运行时自举作为历史兼容兜底

虽然表已进入 Prisma schema，但以下代码仍保留：

- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `ensureTableColumns(...)`

原因是：

- 继续兼容 SQLite 路径
- 继续兼容历史旧库补列
- 避免把已有服务启动自愈能力一次性拿掉

### 3. 补齐规则文档

- `docs/engineering-standards.md`
- `docs/development-delivery-checklist.md`
- `docs/database-archive.md`

统一补充了“标准 Docker 运行态下，长期承接真实业务或缓存数据的运行时表，不能长期停留在 `prisma/schema.prisma` 之外”的规则说明。

## 影响面说明

- 本次没有改软文街媒体缓存业务逻辑
- 没有改 GEO 页面交互、搜索和分页语义
- 没有改 OpenClaw 营销策划方案、策略优化记录、留言功能的前后端交互
- 本次修复的是标准运行态更新链与 Prisma schema 的边界错位

## 验证重点

- `prisma generate` 能通过
- `prisma db push` 不再把上述 OpenClaw 表判成待删除表
- `docker compose -f docker/docker-compose.local-postgres.yml run --rm db-init` 能在保留现有缓存数据的情况下通过
- `server / web` 能在 `db-init` 成功后正常拉起
