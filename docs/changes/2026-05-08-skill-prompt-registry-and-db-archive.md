# 2026-05-08 技能提示词注册表与数据库存档

## 1. 变更背景

- 用户要求把数据库整体结构做成可长期维护的存档文档，和代码规范、网站地图一起维护
- 用户同时要求技能/提示词不再只停留在文件和 mock 层，而要能正式进入数据库，支持调用、修改和存储
- 当前代码已开始做 `SkillsPromptsService` 的数据库优先改造，但尚未把业务调用链、`Prisma schema` 和文档体系完全闭环

## 2. 变更目标

- 让后台技能中心具备“数据库优先、文件兜底”的注册表能力
- 让品牌增长与小红书作品生成链路真正优先读取数据库中的技能/提示词
- 新增数据库存档文档，明确正式表、业务板块映射和过渡边界

## 3. 修改内容

### 3.1 后端技能注册表

- 更新 `apps/server/src/modules/admin/skills-prompts.service.ts`
- 新增 `SkillConfig`、`PromptTemplate` 两张注册表的运行时建表、回填、查询与更新逻辑
- 后台 `list/update skill`、`list/update prompt` 在数据库可用时优先读写 PostgreSQL，不可用时回退到 `mock-data`

### 3.2 业务生成链路切换

- 更新 `apps/server/src/modules/reports/reports.service.ts`
- 修复品牌增长报告技能提示词读取时遗漏的 `await`
- 品牌增长、小红书营销策划方案等读取继续保持数据库优先

- 更新 `apps/server/src/modules/works/works.service.ts`
- 新增 `SkillsPromptsService` 注入
- 原创文案、原创配图、二创文案、二创配图、视频文案、视频提示词现在都优先读取注册表中的 `PromptTemplate`
- 数据库未命中时，才回退到原有 `SKILL.md` / `.runtime/prompt_extract` 文件

### 3.3 Schema 与迁移补齐

- 更新 `prisma/schema.prisma`
- 新增 `SkillConfig`、`PromptTemplate` 两个模型定义
- 新增 `prisma/migrations/20260508_skill_prompt_registry/migration.sql`
- 把运行时注册表提升为可追踪的正式数据库结构，而不只停留在 service 内部隐式建表

### 3.4 文档闭环

- 新增 `docs/database-archive.md`
- 更新 `docs/README.md`
- 更新 `docs/engineering-standards.md`
- 更新 `docs/site-map.md`
- 更新 `docs/site-map-mermaid.md`
- 把“数据库存档”纳入正式文档体系，并把“schema / 迁移 / 入库边界变化时必须更新数据库文档”写入规范

## 4. 影响范围

- 影响后台技能中心的配置真源
- 影响品牌增长报告与小红书原创/二创/视频链路的提示词读取方式
- 影响后续数据库结构维护方式与文档更新要求
- 不直接改动前端页面交互

## 5. 验证方式

- `GetDiagnostics` 检查：
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
- 计划继续执行：
  - `npm run build:server`
  - 必要时 `npm run prisma:generate`

## 6. 风险与后续

- 当前 `SkillConfig` / `PromptTemplate` 已补入 `schema` 和迁移，但业务代码仍主要通过原始 SQL 与通用类型读写，后续可再逐步切到 Prisma typed model
- `apiProviders`、知识库、会员/积分规则等后台数据当前仍主要停留在 `mock-data`
- 若后续把更多后台配置正式入库，需要继续扩写 `docs/database-archive.md`
