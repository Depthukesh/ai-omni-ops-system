# 2026-08-06 技能中心本地单机版 SQLite 兼容修复

## 为什么改

- 本地单机版进入“个人中心 -> 技能中心”时出现 `Internal server error`
- 真实原因不是没有技能数据，而是 `user-skills` 模块在本地 SQLite 环境里执行了 PostgreSQL 专用 SQL
- 导致技能中心一加载就直接 500，页面只能看到空列表和错误提示

## 根因

- `apps/server/src/modules/user-skills/user-skills.service.ts`
- `ensureBrandSkillTablesReady()` 中混用了 PostgreSQL 专用语法，例如：
  - `TIMESTAMPTZ`
  - `JSONB`
  - `ALTER COLUMN ... SET DEFAULT`
  - `DO $$ ... $$`
  - `ANY (...::text[])`
  - `::jsonb`
- 这些写法在服务器 PostgreSQL 可运行，但在本地单机版 SQLite 中会直接失败

## 这次改了什么

### 1. 品牌技能表初始化改为区分数据库类型

- PostgreSQL 继续走原来的表结构和迁移逻辑
- SQLite 单独走兼容分支：
  - 时间列改用 `TEXT`
  - `promptIdsJson` 改为 `TEXT`
  - 用通用 `CREATE TABLE IF NOT EXISTS` + `ensureTableColumns()` 补列
  - 不再执行 SQLite 不支持的 `ALTER COLUMN` / `DO $$` 语句

### 2. reset 技能时的删除与记录写入补齐 SQLite 兼容

- SQLite 不再使用：
  - `ANY (...::text[])`
  - `::jsonb`
- 改成逐条删除相关 prompt override，并把 `promptIdsJson` 作为普通 JSON 字符串写入

## 影响范围

- `apps/server/src/modules/user-skills/user-skills.service.ts`
- 影响“个人中心 -> 技能中心”的技能加载、重置等品牌技能链路
- 不改页面结构，不改接口路径，不改 OSS 或升级链

## 验证

- 后端构建验证
- 确认 `user-skills` 在 SQLite 路径下不再触发 PostgreSQL 方言 SQL
