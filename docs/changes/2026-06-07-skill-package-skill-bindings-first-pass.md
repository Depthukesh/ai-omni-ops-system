# 2026-06-07 能力包与技能关系真源化第一批接线

## 背景

- 前几轮已经完成：
  - 模块注册中心
  - 模块默认能力包关系
  - 技能中心展示所属模块 / 所属能力包
  - 技能中心按模块 / 能力包筛选
  - 后台创建技能
  - 技能与提示词关系正式真源化
- 但技能所属能力包仍主要依赖：
  - 前端 `skillAssetBindings` 过渡态
  - `SkillPackageModule` 的间接映射
- 这会导致后台创建技能后的能力包归属、页面筛选和后续独立关系管理没有统一真源。

## 本次改动

### 1. 新增正式关系表 `SkillPackageSkill`

- 修改：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_package_skills_first_pass/migration.sql`
- 新增字段：
  - `packageId`
  - `packageKey`
  - `packageName`
  - `skillId`
  - `skillSlug`
  - `bindingType`
  - `isDefault`
  - `sortOrder`
  - `enabled`
  - `remarks`

### 2. 后端新增能力包与技能关系接口

- 新增：
  - `apps/server/src/modules/admin/skill-package-skills.service.ts`
  - `apps/server/src/modules/admin/skill-package-skills.controller.ts`
  - `apps/server/src/modules/admin/skill-package-skills.module.ts`
- 修改：
  - `apps/server/src/app.module.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/prisma/prisma.service.ts`
- 新增接口：
  - `GET /admin/skill-package-skills`
  - `GET /admin/skill-package-skills/:id`
  - `GET /admin/skill-package-skills/by-skill/:skillSlug`
  - `GET /admin/skill-package-skills/by-package/:packageKey`
  - `POST /admin/skill-package-skills`
  - `PATCH /admin/skill-package-skills/:id`
  - `DELETE /admin/skill-package-skills/:id`

### 3. 数据库首次命中时自动回填能力包技能 seed

- 当前实现：
  - 数据库可用且 `SkillPackageSkill` 表存在时，首次命中会把 `mock-data` 中已有的能力包技能关系回填进库
  - 若迁移未执行，则接口会自动回退到 `mock-data`
- 目的：
  - 不影响现有后台页面继续使用
  - 给下一步独立关系页预留统一后端基础

### 4. 前端服务层与技能中心开始读取真实能力包技能关系

- 修改：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 当前新增：
  - `SkillPackageSkillRecord`
  - `skillPackageSkillSeed`
  - `getSkillPackageSkills()`
  - `createSkillPackageSkill()`
- 技能中心加载时：
  - 优先读取真实 `SkillPackageSkill`
  - 再把能力包技能关系与已有 `SkillPromptBinding`、`SkillPackageModule`、seed 归属做合并
- 这样“所属能力包”与包级筛选开始以正式关系表为主，而不是只依赖前端常量。

### 5. 创建技能时同步写入能力包归属

- 当前实现：
  - 后台创建技能时，如果选择了所属能力包
  - 创建成功后会继续写入 `SkillPackageSkill`
  - 接口不可用时仍保留前端本地兜底，避免页面中断
- 同时：
  - 技能中心的包级筛选与所属能力包展示会立即更新
  - 模块标签仍保留现有 `SkillPackageModule` 推导逻辑，不影响上一轮功能

## 当前效果

- 技能所属能力包开始有正式后端真源，不再只靠前端临时状态。
- 技能中心包级筛选、归属显示和创建技能后的归属保持一致。
- 已有模块默认能力包关系继续可用，现有后台交互不需要重做。

## 当前边界

- 本轮把“能力包 <-> 技能”正式落库了。
- 但还没有单独做“能力包与技能关系后台管理页”。
- 技能所属模块仍主要通过：
  - `SkillPackageModule`
  - `SkillPromptBinding / seed`
  - 前端合并逻辑
  来推导，下一步还可以继续往统一注册域收口。

## 影响范围

- 数据库：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_package_skills_first_pass/migration.sql`
- 后端：
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skill-package-skills.service.ts`
  - `apps/server/src/modules/admin/skill-package-skills.controller.ts`
  - `apps/server/src/modules/admin/skill-package-skills.module.ts`
  - `apps/server/src/app.module.ts`
  - `apps/server/src/prisma/prisma.service.ts`
- 前端：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 文档：
  - `docs/database-archive.md`
  - 本文件

## 验证

- `npm run prisma:generate`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
- `GetDiagnostics`
  - `apps/server/src/modules/admin/skill-package-skills.service.ts`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
