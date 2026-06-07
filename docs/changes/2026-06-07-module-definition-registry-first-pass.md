# 2026-06-07 模块注册中心第一批落地

## 背景

- 当前 `docs/project_planning` 已明确：第一阶段不只是知识库开发，还包括模块注册、能力包、关系表与接口底座。
- 在这条主线里，`ModuleDefinition` 是模块化和标准化接入的核心主表。
- 为了遵守“不影响现有网站功能运行”的原则，本次先落正式表和后台接口，不直接把现有菜单与后台单页改成注册表驱动。

## 本次改动

### 1. 新增模块注册正式表

- 在 `prisma/schema.prisma` 中新增：
  - `ModuleDefinition`
- 配套迁移：
  - `prisma/migrations/20260607_module_definitions_first_pass/migration.sql`

### 2. 新增后台模块注册接口

- 新增服务：
  - `apps/server/src/modules/admin/module-definitions.service.ts`
- 新增控制器：
  - `apps/server/src/modules/admin/module-definitions.controller.ts`
- 新增模块：
  - `apps/server/src/modules/admin/module-definitions.module.ts`
- 并在：
  - `apps/server/src/app.module.ts`
  中完成注册

### 3. 已提供接口

- `GET /admin/module-definitions`
- `GET /admin/module-definitions/:id`
- `POST /admin/module-definitions`
- `PATCH /admin/module-definitions/:id`
- `PATCH /admin/module-definitions/:id/archive`
- `DELETE /admin/module-definitions/:id`

### 4. 前端服务层预留

- 已在：
  - `apps/web/src/services/admin.ts`
  中补入：
  - `ModuleDefinitionRecord`
  - `getModuleDefinitions`
  - `getModuleDefinition`
  - `createModuleDefinition`
  - `updateModuleDefinition`
  - `archiveModuleDefinition`
  - `deleteModuleDefinition`

### 5. 演示数据与平滑回退

- `mock-data.ts` 中新增 `moduleDefinitions`
- 首批放入 5 个工作台样例：
  - 品牌增长工作台
  - 小红书工作台
  - 抖音工作台
  - 公众号工作台
  - 设计工作台
- 当前策略：
  - 数据库和模块注册表可用时，优先读写 PostgreSQL
  - 若迁移未执行，则回退到 `mock-data`

## 设计原则落实

### 1. 以整个 project_planning 作为开发依据

本次直接对应的规划文档包括：

- `15_AI全域运营系统_模块注册规范_v1`
- `26_AI全域运营系统_ModuleDefinition字段字典_v1`
- `33_AI全域运营系统_ModuleDefinition注册后台表单字段草案_v1`
- `38_AI全域运营系统_第一阶段数据库落地优先表清单_v1`
- `39_AI全域运营系统_第一阶段接口与页面对照表_v1`

### 2. 不影响现有网站功能运行

- 本次没有改顶部导航逻辑
- 没有把现有后台 `/admin` 单页强行替换成模块注册中心驱动
- 没有修改现有工作台入口行为
- 新增的是独立后台接口和正式表，属于增量接入

## 影响范围

- 后端：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_module_definitions_first_pass/migration.sql`
  - `apps/server/src/modules/admin/module-definitions.service.ts`
  - `apps/server/src/modules/admin/module-definitions.controller.ts`
  - `apps/server/src/modules/admin/module-definitions.module.ts`
  - `apps/server/src/app.module.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/prisma/prisma.service.ts`
- 前端服务层：
  - `apps/web/src/services/admin.ts`
- 文档：
  - `docs/database-archive.md`
  - 本文档

## 下一步建议

- 下一步继续按第一阶段主线推进，最顺的两个方向是：
  - `skill_package_modules` 关系表与接口
  - 模块注册中心后台页面接线

## 验证

- 待执行：
  - `npm run prisma:generate`
  - `npm run build:server`
  - `GetDiagnostics`
