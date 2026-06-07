# 2026-06-07 Skill Package References First Pass

## 背景

- 统一技能中心能力包详情中的 `references` 一直是占位空数组：
  - `...(includeOptions.includeReferences ? { references: [] } : {})`
- 这一块不同于 Prompt / Provider，仓库里没有现成的能力包级参考资料真源，不能只做桥接。
- 按 `docs/project_planning` 第一阶段拆表建议，先把 `references` 落成独立资产对象，补最小可维护闭环。

## 本次改动

- 新增 `ReferenceAsset` Prisma 模型与迁移：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_reference_assets_first_pass/migration.sql`
- 更新 Prisma schema summary，并执行 `prisma generate`
- 扩展 `apps/server/src/common/mock-data.ts`
  - 新增 `ReferenceAssetRecord`
  - 新增 `database.referenceAssets`
  - 补第一批能力包参考资料 seed
- 扩展 `SkillPackagesService`
  - `getSkillPackage()` 在 `includeReferences=true` 时返回真实 `references`
  - 新增 `createReferenceAsset()`
  - 新增 `updateReferenceAsset()`
  - 新增 `deleteReferenceAsset()`
  - 新增 `loadReferenceAssetsByPackage()`、`normalizeReferenceAsset()` 等归一化与 seed 回填逻辑
  - 版本快照 `snapshotSummary.referenceCount` 改成按真实 `ReferenceAsset` 数量统计
- 新增后台接口：
  - `POST /admin/skill-packages/:packageId/references`
  - `PATCH /admin/skill-packages/:packageId/references/:referenceId`
  - `DELETE /admin/skill-packages/:packageId/references/:referenceId`
- 扩展后台统一技能中心详情页：
  - 能力包详情开始显式请求 `includeReferences=true`
  - 新增 `References 资产` 管理区
  - 支持参考资料新增、编辑、删除
  - 支持维护 `referenceKey`、`title`、`sourceType`、`sourceUri`、`usageNote`、`applicableScopes`、`sortOrder`

## 当前策略

- 数据库和 `ReferenceAsset` 表可用时，能力包参考资料优先读写 PostgreSQL。
- 若数据库不可用，或迁移尚未执行，则回退到 `mock-data.referenceAssets`。
- 这一轮只补能力包级参考资料真源与后台维护面，不改现有业务工作流的运行逻辑，因此不会影响现有网站功能。

## 验证

- `npx prisma generate`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
