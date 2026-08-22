# 2026-08-13 user-skills SQLite 兼容修复

## 1. 背景

用户反馈另一台电脑虽然已经安装 `local-single-user-win-x64-2026-08-13-hotfix-47`，但个人中心出现：

- `本地登录态`
- `版本与升级` 入口不显示

同时现场提供的 `runtime` 文件确认该机器已经启动在：

- `appVersion = 0.1.22`
- `releaseTag = local-single-user-win-x64-2026-08-13-hotfix-47`

说明问题不在安装包覆盖失败，而在启动后的接口层。

## 2. 现场线索

`server.err.log` 指向 `UserSkillsService` 的 SQLite 原生 SQL 兼容问题，典型报错包括：

- `near "EXISTS": syntax error`
- `no such table: COALESCE`

从调用栈看，问题集中在品牌技能表补齐和 GPT 模型名同步逻辑。

## 3. 本次改动

- 文件：`apps/server/src/modules/user-skills/user-skills.service.ts`
- 调整 `syncGlobalGpt54BrandOverrides()` 的 SQLite 分支
- 不再使用嵌套函数条件：
  - `instr(COALESCE(...), ...)`
- 改为更保守的 SQLite 过滤条件：
  - `IS NOT NULL`
  - `LIKE '%gpt-5.5%'`

## 4. 影响面检查

### 4.1 受影响范围

- local-single-user 安装态
- `user-skills` 品牌技能表初始化与历史模型名替换

### 4.2 为避免副作用做的保护

- 仅调整 SQLite 分支
- Postgres 分支保持不变
- 不改变任何品牌技能数据结构，只收窄 SQL 写法

## 5. 验证

- 对照用户提供的 `local-single-user-runtime.json`，确认问题机器已在 `hotfix-47`
- 静态核对 `user-skills.service.ts` 的 SQLite 分支 SQL
- 后续需要重新打包并让用户安装带修复的新包，再验证个人中心接口恢复

## 6. 后续建议

- 继续检查 `user-skills` 里所有仅适用于 Postgres 的原生 SQL 是否都已被 SQLite 分支隔离
- 若后续还有接口降级到“本地登录态”，优先抓取最新 `server.err.log` 与 `runtime` 文件核对
