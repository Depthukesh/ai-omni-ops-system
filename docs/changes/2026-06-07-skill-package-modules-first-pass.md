# 2026-06-07 模块默认能力包关系第一批落地

## 背景

- 当前第一阶段主线已经补入：
  - 知识库正式表与接口
  - 知识绑定桥接层
  - 模块注册中心正式表与接口
- 按 `docs/project_planning` 的联调顺序，下一步最关键的就是把：
  - 模块默认能力包绑定
 这条关系层先落下来。

## 本次改动

### 1. 新增关系表

- 在 `prisma/schema.prisma` 中新增：
  - `SkillPackageModule`
- 配套迁移：
  - `prisma/migrations/20260607_skill_package_modules_first_pass/migration.sql`

### 2. 新增后台关系接口

- 新增服务：
  - `apps/server/src/modules/admin/skill-package-modules.service.ts`
- 新增控制器：
  - `apps/server/src/modules/admin/skill-package-modules.controller.ts`
- 新增模块：
  - `apps/server/src/modules/admin/skill-package-modules.module.ts`
- 并注册到：
  - `apps/server/src/app.module.ts`

### 3. 已提供接口

- `GET /admin/skill-package-modules`
- `GET /admin/skill-package-modules/:id`
- `GET /admin/skill-package-modules/by-module/:moduleKey`
- `GET /admin/skill-package-modules/by-package/:packageKey`
- `POST /admin/skill-package-modules`
- `PATCH /admin/skill-package-modules/:id`
- `DELETE /admin/skill-package-modules/:id`

### 4. 前端服务层预留

- 在：
  - `apps/web/src/services/admin.ts`
  中补入：
  - `SkillPackageModuleRecord`
  - `getSkillPackageModules`
  - `getSkillPackageModule`
  - `getSkillPackageModulesByModule`
  - `getSkillPackageModulesByPackage`
  - `createSkillPackageModule`
  - `updateSkillPackageModule`
  - `deleteSkillPackageModule`

### 5. 演示数据与回退

- `mock-data.ts` 中新增 `skillPackageModules`
- 当前内置了公众号、小红书、抖音、设计等工作台的默认挂载样例
- 当前策略：
  - 数据库和关系表可用时，优先走 PostgreSQL
  - 若迁移未执行，则回退到 `mock-data`

## 设计原则落实

### 1. 以整个 project_planning 作为开发依据

本次主要对应：

- `29_AI全域运营系统_SkillPackage数据结构草案_v1`
- `36_AI全域运营系统_SkillPackage与ModuleDefinition关系表草案_v1`
- `39_AI全域运营系统_第一阶段接口与页面对照表_v1`

### 2. 每个模块开发完后，模块内功能仍能正常使用

- 本次只新增关系表和后台接口
- 没有改现有模块页面内部逻辑
- 没有替换现有工作台的运行链路
- 这一层为后续模块挂能力包提供标准底座，但不直接改变现有模块执行行为

## 影响范围

- 后端：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_package_modules_first_pass/migration.sql`
  - `apps/server/src/modules/admin/skill-package-modules.service.ts`
  - `apps/server/src/modules/admin/skill-package-modules.controller.ts`
  - `apps/server/src/modules/admin/skill-package-modules.module.ts`
  - `apps/server/src/app.module.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/prisma/prisma.service.ts`
- 前端服务层：
  - `apps/web/src/services/admin.ts`
- 文档：
  - `docs/database-archive.md`
  - 本文档

## 下一步建议

- 继续正式开发时，后续最顺的方向是：
  - 开始接模块注册中心页面
  - 或开始接统一技能中心页面与能力包详情接口

## 验证

- 待执行：
  - `npm run prisma:generate`
  - `npm run build:server`
  - `GetDiagnostics`
