# 2026-06-07 知识绑定桥接层第一批落地

## 背景

- 当前 `docs/project_planning` 不只是知识库单点规划，而是第一阶段底座规划。
- 在这套规划里，知识空间后续需要逐步与模块、能力包、Prompt、工作流步骤建立桥接关系。
- 上一批已经把知识库主档、文件、同步记录切到数据库优先，本次继续推进更通用的桥接层，但仍然遵守“不影响现有网站功能运行”的原则。

## 本次改动

### 1. 新增知识绑定正式表

- 在 `prisma/schema.prisma` 中新增：
  - `KnowledgeBinding`
- 并补入迁移：
  - `prisma/migrations/20260607_knowledge_bindings_first_pass/migration.sql`

### 2. 新增知识绑定后台接口

- 新增控制器：
  - `apps/server/src/modules/admin/knowledge-bindings.controller.ts`
- 已提供接口：
  - `GET /admin/knowledge-bindings`
  - `GET /admin/knowledge-bindings/by-target`
  - `POST /admin/knowledge-bindings`
  - `PATCH /admin/knowledge-bindings/:id`
  - `DELETE /admin/knowledge-bindings/:id`

### 3. 服务层扩展

- `KnowledgeBasesService` 新增知识绑定能力：
  - 查询绑定
  - 按目标查询绑定
  - 创建绑定
  - 更新绑定
  - 删除绑定
- 并保持：
  - 数据库优先
  - `mock-data` 兜底

### 4. 演示数据

- `mock-data.ts` 中新增 `knowledgeBindings` 演示数据
- 用于在数据库迁移尚未执行时，仍能返回稳定结构的数据

## 设计原则落实

### 1. 使用整个 project_planning 作为开发依据

本次不是单纯延续知识库页面开发，而是按以下规划文档继续推进第一阶段底座：

- `38_AI全域运营系统_第一阶段数据库落地优先表清单_v1`
- `39_AI全域运营系统_第一阶段接口与页面对照表_v1`
- `46_AI全域运营系统_知识绑定接口草案_v1`
- `47_AI全域运营系统_知识库与SkillPackage关系表草案_v1`

### 2. 不影响现有网站功能运行

- 本次没有改现有前台业务页面
- 没有替换已有知识库后台接口
- 新增的是独立桥接接口，不会干扰现有知识库页面
- 若数据库或迁移未就绪，接口仍可回退到 `mock-data`

## 影响范围

- 后端：
  - `apps/server/src/modules/admin/knowledge-bases.service.ts`
  - `apps/server/src/modules/admin/knowledge-bindings.controller.ts`
  - `apps/server/src/modules/admin/knowledge-bases.module.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/prisma/prisma.service.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_knowledge_bindings_first_pass/migration.sql`
- 文档：
  - `docs/database-archive.md`
  - 本文档

## 下一步建议

- 继续第一阶段底座开发时，可以按 `project_planning` 继续往两条线推进：
  - 模块注册中心接口和数据表
  - 统一技能中心 `skill-package-modules` 关系接口

## 验证

- 待执行：
  - `npm run prisma:generate`
  - `npm run build:server`
  - `GetDiagnostics`
