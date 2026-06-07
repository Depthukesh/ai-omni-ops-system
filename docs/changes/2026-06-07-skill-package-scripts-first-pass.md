# 2026-06-07 Skill Package Scripts First Pass

## 背景

- 统一技能中心能力包详情中的 `scripts` 此前仍是占位空数组：
  - `...(includeOptions.includeScripts ? { scripts: [] } : {})`
- 按 `docs/project_planning` 的第一阶段拆表建议，`ScriptAsset` 属于 `P1` 资产域，适合作为第一阶段收尾开发补齐。

## 本次改动

- 新增 `ScriptAsset` Prisma 模型与迁移：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_script_assets_first_pass/migration.sql`
- 更新 Prisma schema summary，并执行 `prisma generate`
- 扩展 `apps/server/src/common/mock-data.ts`
  - 新增 `ScriptAssetRecord`
  - 新增 `database.scriptAssets`
  - 补第一批能力包脚本资产 seed
- 扩展 `SkillPackagesService`
  - `getSkillPackage()` 在 `includeScripts=true` 时返回真实 `scripts`
  - 新增 `createScriptAsset()`
  - 新增 `updateScriptAsset()`
  - 新增 `deleteScriptAsset()`
  - 新增 `loadScriptAssetsByPackage()`、`normalizeScriptAsset()` 等归一化与 seed 回填逻辑
  - 版本快照 `snapshotSummary.scriptCount` 改成按真实 `ScriptAsset` 数量统计
- 新增后台接口：
  - `POST /admin/skill-packages/:packageId/scripts`
  - `PATCH /admin/skill-packages/:packageId/scripts/:scriptId`
  - `DELETE /admin/skill-packages/:packageId/scripts/:scriptId`
- 扩展后台统一技能中心详情页：
  - 能力包详情开始显式请求 `includeScripts=true`
  - 新增 `Scripts 资产` 管理区
  - 支持脚本新增、编辑、删除
  - 支持维护 `scriptKey`、`scriptName`、`runtime`、`entry`、`argsSchema`、`usageNote`、`sortOrder`

## 当前策略

- 数据库和 `ScriptAsset` 表可用时，能力包脚本资产优先读写 PostgreSQL。
- 若数据库不可用，或迁移尚未执行，则回退到 `mock-data.scriptAssets`。
- 这一轮只补能力包级脚本资产真源与后台维护面，不改现有业务工作流运行链路，因此不会影响现有网站功能。

## 验证

- `npx prisma generate`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
