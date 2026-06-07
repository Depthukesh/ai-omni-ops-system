# 2026-06-07 技能与提示词关系真源化第一批接线

## 背景

- 前几轮已经完成：
  - 后台创建技能
  - 后台创建提示词模板
  - 前端技能中心显示技能归属、能力包归属
  - 创建提示词时可在前端状态层立即绑定到技能
- 但技能与提示词的关系仍未正式落库：
  - 后端运行时主要依赖历史 `SKILL_PROMPT_BINDINGS`
  - 后台页面依赖前端 `skillAssetBindings` 过渡状态
- 这会导致后台管理、运行时解析和后续版本管理没有统一真源。

## 本次改动

### 1. 新增正式关系表 `SkillPromptBinding`

- 修改：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_prompt_bindings_first_pass/migration.sql`
- 新增字段：
  - `skillId`
  - `promptId`
  - `skillSlug`
  - `promptScene`
  - `bindingType`
  - `isPrimary`
  - `sortOrder`
  - `enabled`
  - `remarks`

### 2. 后端新增技能提示词绑定接口

- 修改：
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 新增接口：
  - `GET /admin/skill-prompt-bindings`
  - `GET /admin/skill-prompt-bindings/by-skill/:skillSlug`
  - `POST /admin/skill-prompt-bindings`
  - `PATCH /admin/skill-prompt-bindings/:id`

### 3. 首次命中数据库时自动回填历史绑定

- 后端在 registry bootstrap 阶段新增：
  - `SkillPromptBinding` 表自动建表
  - 根据历史 `SKILL_PROMPT_BINDINGS` 自动回填首批技能提示词关系
- 这样不会因为切到正式关系表就丢失既有技能与提示词挂载。

### 4. 运行时解析开始优先读正式绑定缓存

- 修改：
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 当前实现：
  - 后端在启动后会把 `SkillPromptBinding` 关系装入缓存
  - `resolvePromptIdsForSkill()` 优先读取这层缓存
  - 若缓存没有命中，才回退历史 `SKILL_PROMPT_BINDINGS`
- 这样后台和运行时开始共享同一套关系基础。

### 5. 后台技能中心开始读取真实技能提示词绑定

- 修改：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 当前新增：
  - `getSkillPromptBindings()`
  - `createSkillPromptBinding()`
  - `updateSkillPromptBinding()`
- 技能中心加载时：
  - 优先读取后端 `SkillPromptBinding`
  - 再与现有模块/能力包 seed 归属做合并
- 目的：
  - 不打断当前模块筛选和归属展示
  - 同时把技能-提示词关系切到正式真源

### 6. 创建技能 / 创建提示词开始尝试真实写入绑定

- 创建技能时：
  - 若填写的提示词场景已存在对应提示词模板
  - 则自动写入 `SkillPromptBinding`
- 创建提示词时：
  - 若选择绑定技能
  - 则自动写入 `SkillPromptBinding`
- 接口不可用时仍保留前端本地兜底，避免页面功能中断

## 当前效果

- 后台技能中心、创建技能、创建提示词，已经开始共用真实的技能提示词关系接口。
- 运行时用户技能解析也开始具备向正式关系表迁移的基础能力。
- 现有模块 / 能力包筛选不受影响，仍可正常使用。

## 当前边界

- 本轮把“技能 <-> 提示词”关系正式真源化了。
- 但“技能 <-> 模块 / 能力包”仍有一部分是前端过渡映射层。
- 下一步建议继续推进：
  - `SkillPackage -> SkillConfig` 正式关系表
  - 技能归属模块 / 能力包的正式落库
  - 一个技能多提示词版本管理
  - 绑定关系的后台独立管理页

## 影响范围

- 数据库：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_prompt_bindings_first_pass/migration.sql`
- 后端：
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/prisma/prisma.service.ts`
- 前端：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 文档：
  - `docs/database-archive.md`
  - 本文件

## 验证

- `GetDiagnostics`
  - `prisma/schema.prisma`
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/prisma/prisma.service.ts`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- `npm --workspace apps/web exec tsc --noEmit`
- `npm --workspace apps/server exec tsc --noEmit`
