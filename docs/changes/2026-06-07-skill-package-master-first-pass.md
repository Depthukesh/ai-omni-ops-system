# 2026-06-07 SkillPackage 主数据第一批落地

## 背景

- 前几轮已经完成：
  - 模块注册中心
  - 模块默认能力包关系
  - 能力包与技能关系
  - 技能与提示词关系
- 但当前仍存在一个明显缺口：
  - 关系表已经有了
  - 能力包主体 `SkillPackage` 还没有正式主数据真源
- 这会导致后台只能维护“谁挂谁”，但没有统一的能力包主对象去承接：
  - `packageKey`
  - `packageName`
  - 状态
  - 作用域
  - 默认知识空间
  - 默认 Provider 策略
  - 当前版本 ID

## 本次改动

### 1. 新增 `SkillPackage` 主表

- 修改：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_packages_first_pass/migration.sql`
- 第一批字段：
  - `id`
  - `packageKey`
  - `packageName`
  - `description`
  - `status`
  - `scope`
  - `moduleKeysJson`
  - `workflowStepKeysJson`
  - `tagsJson`
  - `currentVersionId`
  - `defaultKnowledgeSpaceIdsJson`
  - `defaultProviderPolicyIdsJson`
  - `sortOrder`
  - `remarks`

### 2. 新增后端能力包主数据 CRUD

- 新增：
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
  - `apps/server/src/modules/admin/skill-packages.module.ts`
- 修改：
  - `apps/server/src/app.module.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/prisma/prisma.service.ts`
- 当前接口：
  - `GET /admin/skill-packages`
  - `GET /admin/skill-packages/:id`
  - `POST /admin/skill-packages`
  - `PATCH /admin/skill-packages/:id`
  - `DELETE /admin/skill-packages/:id`

### 3. 新增能力包主数据后台页

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-packages-panel.tsx`
- 页面能力：
  - 列表查看能力包
  - 按关键词 / 状态 / 作用域筛选
  - 左侧列表、右侧编辑
  - 弹窗创建
  - 删除能力包

### 4. 接入模块注册后台上下文

- 修改：
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
- 当前后台注册域结构进一步变成：
  - 模块注册中心
  - SkillPackage 注册中心
  - 模块与能力包关系
  - 能力包与技能关系

这样模块、能力包、技能三层主数据和关系已经开始形成连续可维护的后台基座。

## 当前效果

- `SkillPackage` 不再只是关系表里的复制字段，已经有自己的正式主数据入口。
- 后台可以直接维护能力包主体信息。
- 关系表继续保留，且不影响当前已完成的模块关系和技能关系功能。

## 当前边界

- 本轮先落的是能力包主对象 CRUD。
- 还没有继续做：
  - `GET /admin/skill-packages/:id` 的完整详情聚合
  - Prompt / Provider / 版本页签
  - `SkillPackageVersion`
  - 能力包详情视图与 diff / activate-version
- 这些仍按规划文档继续后推。

## 影响范围

- 数据库：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_packages_first_pass/migration.sql`
- 后端：
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
  - `apps/server/src/modules/admin/skill-packages.module.ts`
  - `apps/server/src/app.module.ts`
  - `apps/server/src/prisma/prisma.service.ts`
- 前端：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-packages-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
- 文档：
  - `docs/database-archive.md`
  - 本文件

## 验证

- `npm run prisma:generate`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
- `GetDiagnostics`
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-packages-panel.tsx`
  - `apps/web/src/services/admin.ts`
