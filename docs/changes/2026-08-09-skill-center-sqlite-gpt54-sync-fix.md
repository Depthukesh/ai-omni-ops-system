# 2026-08-09 技能中心 SQLite 全量加载 500 修复

## 背景

用户反馈 `个人中心 -> 技能中心` 打开后直接显示 `Internal server error`，页面里所有技能项都没有出来。

这次现象和 `2026-08-06` 那次 SQLite 兼容问题很像，但不是同一个炸点，需要重新按 `user-skills` 的列表加载链路排查。

## 根因

`GET /user-skills` 在加载技能列表前，会先进入：

- `apps/server/src/modules/user-skills/user-skills.service.ts`
- `ensureBrandSkillTablesReady()`
- `ensureBrandSkillTablesReadyForSqlite()`

SQLite 分支里虽然已经不再执行 PostgreSQL 的建表/改列 SQL，但它后面仍会继续调用：

- `syncGlobalGpt54BrandOverrides()`

这个同步函数内部此前统一写成了 PostgreSQL 风格：

- `POSITION('gpt-5.5' IN COALESCE(...))`

SQLite 不支持 `POSITION(...)`，因此本地单机版一进技能中心，请求就在这里直接 500，前端只能看到 `Internal server error`。

## 本次修复

文件：

- `apps/server/src/modules/user-skills/user-skills.service.ts`

调整方式：

1. `syncGlobalGpt54BrandOverrides()` 增加数据库类型分支
2. SQLite 模式改用 `instr(COALESCE(...), 'gpt-5.5') > 0`
3. PostgreSQL 继续保留原有 `POSITION(...)` 写法

这样本地 SQLite 和线上 PostgreSQL 都能继续走同一套“gpt-5.5 -> gpt-5.4”兜底同步逻辑，但不再互相污染 SQL 方言。

## 影响范围

- `apps/server/src/modules/user-skills/user-skills.service.ts`
- 影响个人中心技能中心列表加载
- 不改前端页面结构
- 不改技能中心接口路径
- 不改 OpenClaw / OSS / 升级链

## 验证

已完成：

- 静态确认 `GET /user-skills` 会命中 SQLite 分支初始化逻辑
- 定位并修复 SQLite 不支持的 `POSITION(...)`
- 执行 `npm --workspace apps/server run build` 通过

待实际联调：

- 本地单机版重新启动后，进入 `个人中心 -> 技能中心`
- 确认技能项可以正常展示，不再出现 `Internal server error`

## 结论

这次不是前端没拿到数据，而是后端在 SQLite 初始化阶段又混入了 PostgreSQL 方言函数，导致列表接口直接 500。

修完后，技能中心至少应恢复到“能正常出列表”的状态。
