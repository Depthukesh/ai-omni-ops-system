# 2026-05-15 技能中心保存模型报错的用户技能表兼容修复

## 1. 问题背景

- 用户反馈个人中心 `/personal-center/skills` 在修改技能模型或提示词模型后，点击保存会提示 `Internal server error`
- 页面列表与详情能正常加载，说明读链路基本可用；问题集中出现在保存时的 `PATCH /api/user-skills/:skillId`

## 2. 根因判断

- `UserSkillProfile`、`UserPromptOverride`、`UserSkillResetLog` 三张表的建表逻辑此前只有 `CREATE TABLE IF NOT EXISTS`
- 对于已经存在的旧表，没有继续执行 `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- 当线上库里的旧表缺少后来新增的字段时，读接口仍可能正常，但保存时一旦执行 `INSERT / UPDATE` 写入这些新列，就会直接触发数据库层报错，最终在前端表现为 `Internal server error`

## 3. 修复内容

- 更新 `apps/server/src/modules/user-skills/user-skills.service.ts`
- 在 `ensureUserSkillTablesReady()` 中，为以下三张表补充列级兼容迁移：
  - `UserSkillProfile`
  - `UserPromptOverride`
  - `UserSkillResetLog`
- 对新增字段统一使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
- 本次继续补充 `UserPromptOverride.basePromptId` 的旧表兼容，避免页面能加载但保存时一命中按提示词维度查询/写入就直接触发数据库错误
- 让旧环境首次命中技能中心接口时，就能自动补齐缺失列，而不是等到保存时直接失败

## 4. 验证结果

- `GetDiagnostics` 检查 `apps/server/src/modules/user-skills/user-skills.service.ts` 通过
- `npm --workspace apps/server run build` 通过

## 5. 影响范围

- 页面：`/personal-center/skills`
- 后端模块：`UserSkillsModule`
- 影响接口：
  - `GET /api/user-skills`
  - `GET /api/user-skills/editor-options`
  - `PATCH /api/user-skills/:skillId`
  - `POST /api/user-skills/:skillId/reset`
