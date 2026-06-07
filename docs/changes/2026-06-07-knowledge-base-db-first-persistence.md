# 2026-06-07 知识库后台数据库优先持久化

## 背景

- 当前后台 `/admin` 的知识库管理页已经有完整交互，但后端仍主要依赖 `mock-data`。
- 这意味着知识库、文件和同步记录不会正式落 PostgreSQL，重启、发布或切换环境后无法稳定保留。
- 根据当前 `docs/project_planning` 下的第一阶段规划，知识库方向已经进入“开始开发”阶段，第一批需要先把现有知识库管理改成正式持久化，同时不影响现有网站功能运行。

## 本次改动

### 1. 新增知识库正式表

- 在 `prisma/schema.prisma` 中新增：
  - `KnowledgeBase`
  - `KnowledgeBaseFile`
  - `KnowledgeBaseSyncRun`
- 并补入迁移：
  - `prisma/migrations/20260607_knowledge_base_persistence_tables/migration.sql`

### 2. 知识库服务改为数据库优先

- `KnowledgeBasesService` 现在改为：
  - 数据库和知识库表可用时，优先从 PostgreSQL 读写
  - 数据库不可用，或知识库迁移尚未执行时，继续回退到 `mock-data`
- 现有接口路径保持不变：
  - `GET /admin/knowledge-bases`
  - `POST /admin/knowledge-bases`
  - `PATCH /admin/knowledge-bases/:id`
  - `POST /admin/knowledge-bases/:id/files`
  - `POST /admin/knowledge-bases/:id/sync`
  - `PATCH /admin/knowledge-bases/sync-runs/:id`
  - `PATCH /admin/knowledge-base-files/:id`
  - `POST /admin/knowledge-base-files/:id/sync`
  - `DELETE /admin/knowledge-base-files/:id`

### 3. 首次迁移后的平滑接管

- 当数据库和知识库表都可用、且知识库表为空时：
  - 服务会把当前 `mock-data` 中的知识库、文件和同步记录自动回填到正式表
- 这样可以保证当前后台知识库页在切换到数据库真源后，仍然保留现有演示/初始化数据，不会突然变成空白页。

## 设计原则落实

### 1. 不影响现有网站功能运行

- 本次没有修改后台知识库页的前端调用方式
- 没有更换接口路径
- 没有强制要求数据库必须先完成迁移才允许页面打开
- 知识库表未就绪时，后端仍自动回退到旧的 `mock-data`

### 2. 增量接入而不是破坏性替换

- 先把当前知识库管理模块正式落库
- 暂不在第一批里强接知识切片、向量化、检索日志和外部知识源同步
- 暂不改动现有其他业务工作流

## 影响范围

- 后端：
  - `apps/server/src/modules/admin/knowledge-bases.service.ts`
  - `apps/server/src/prisma/prisma.service.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_knowledge_base_persistence_tables/migration.sql`
- 文档：
  - `docs/database-archive.md`
  - 本文档

## 下一步建议

- 先执行数据库迁移并生成 Prisma Client
- 然后继续第一阶段知识库开发：
  - 知识空间 / 知识库列表页与详情页正式化
  - 绑定关系页与知识绑定接口
  - 能力包与知识空间关系表接入

## 验证

- 待执行：
  - `npm run prisma:generate`
  - `npm run build:server`
  - `GetDiagnostics`
