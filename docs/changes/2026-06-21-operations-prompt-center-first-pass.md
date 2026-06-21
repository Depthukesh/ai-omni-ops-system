# 2026-06-21 运营提示词中心首轮落地

## 背景

- 用户要求在 `更多功能` 下新增与 `设计` 同级的独立板块 `运营提示词中心`。
- 该板块不再沿用前端本地 Prompt 临时态，而是要求：
  - 后台统一读取 `提示词/内容获客`
  - 提示词正文落到数据库真源
  - 用户每次打开弹窗都读取后台模板
  - 点击重置时恢复后台原文
  - 点击生成后改为后台异步任务，不阻塞弹窗
  - 右上角提供作品中心查看和删除历史作品

## 本次实现

### 1. 后台模板真源

- `prisma/schema.prisma`
  - 新增 `OperationsPromptTemplate`
- `prisma/migrations/20260621_operations_prompt_center_first_pass/migration.sql`
  - 新增模板表建表 SQL
- `apps/server/src/modules/works/operations-prompt-center.helpers.ts`
  - 扫描 `提示词/内容获客`
  - 只导入 `md` / `txt`
  - 跳过 `json`
  - 提取标题、预览和最多三个分类维度：
    - `businessStage`
    - `outputType`
    - `scenarioLabel`

### 2. 运营提示词中心后端接口

- `apps/server/src/modules/works/works.service.ts`
  - 新增模板 bootstrap，同步文件系统到后台模板存储
  - 新增运营提示词中心 options、模板详情、作品列表、删除、生成接口
  - 生成链路改为 `Task` 异步执行
  - 作品结果直接写入 `Task.outputJson`
  - Prompt 编辑仅对本次生成生效，不回写后台模板
  - 模型调用顺序固定为：
    - `doubao-seed-2-0-pro-260215`
    - `kimi-k2.6`
    - `deepseek-v4-pro`
    - `deepseek-v4-flash`
- `apps/server/src/modules/works/works.controller.ts`
  - 新增：
    - `GET /works/brands/:brandId/design/operations-prompt-center/options`
    - `GET /works/brands/:brandId/design/operations-prompt-center/templates/:templateId`
    - `GET /works/brands/:brandId/design/operations-prompt-center/works`
    - `DELETE /works/brands/:brandId/design/operations-prompt-center/works/:workId`
    - `POST /works/brands/:brandId/design/operations-prompt-center/generate`

### 3. 前端页面接入

- `apps/web/src/services/design.ts`
  - 新增运营提示词中心前端 API 类型与请求方法
- `apps/web/src/app/(dashboard)/more-features/section-sidebar.tsx`
  - 新增 `更多功能` 左侧独立板块导航
  - 当前包含：
    - `设计`
    - `运营提示词中心`
- `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
  - 恢复为纯设计工作台，不再内嵌运营提示词中心切换
- `apps/web/src/app/(dashboard)/more-features/operations-prompt-center/page.tsx`
  - 新增运营提示词中心独立路由页
- `apps/web/src/app/(dashboard)/more-features/operations-prompt-center/workspace-shell.tsx`
  - 新增运营提示词中心独立工作区壳层
- `apps/web/src/app/(dashboard)/more-features/design/operations-prompt-center.tsx`
  - 新增运营提示词中心独立前端组件
  - 支持：
    - 模板卡片网格
    - 三维筛选
    - 模板详情弹窗
    - 复制 Prompt
    - 可编辑 Prompt
    - 重置提示词
    - 是否植入品牌资料
    - 产品资料选择
    - 每日营销日历选择
    - 用户要求输入
    - 后台异步生成
    - 作品中心查看与删除
- `apps/web/src/styles/globals.css`
  - 新增运营提示词中心卡片、弹窗和作品中心样式
- `apps/web/src/app/(dashboard)/more-features/design/page.tsx`
  - 更新页面描述，恢复为仅说明设计工作台本身

## 当前行为边界

- 模板真源以后台存储为准，前端不保存原始模板内容。
- 作品记录当前复用 `Task` 存储生成结果与上下文字段，不额外新建作品表。
- 当数据库未就绪或模板表尚未可用时，服务端仍可退回 mock 内存存储，避免页面直接不可用。

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/web/src/services/design.ts`
  - `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/more-features/design/operations-prompt-center.tsx`
  - `apps/web/src/app/(dashboard)/more-features/design/page.tsx`
- `npm --workspace apps/server run build`
  - 已通过
- `npm --workspace apps/web run build`
  - 已通过
  - 当前仍有环境 warning：
    - Windows 本机 `@next/swc-win32-x64-msvc` DLL 初始化失败 warning
    - 上级目录和当前仓库同时存在 `package-lock.json`，Next 会提示 workspace root 推断 warning
- `npx prisma migrate status`
  - 当前未完成
  - 原因不是迁移 SQL 本身报错，而是本地 `127.0.0.1:5432` PostgreSQL 未启动，返回 `P1001: Can't reach database server`

## 运行说明

- 提示词源目录默认按以下优先顺序查找：
  - 环境变量 `OPERATIONS_PROMPT_SOURCE_DIR`
  - 项目相邻目录中的 `提示词/内容获客`
- 本地可用脚本：
  - `npx tsx scripts/import-operations-prompt-templates.ts`
  - 用于把当前 `提示词/内容获客` 中的模板批量导入 `OperationsPromptTemplate`
- 当 `OperationsPromptTemplate` 真表可用时：
  - 服务端会在首次访问时把文件系统模板同步进数据库
  - 前端模板列表和详情都以数据库内容为准
- 当数据库不可用，或真表尚未创建时：
  - 服务端会退回内存 fallback
  - 页面仍可浏览和生成，但模板真源不会持久化到数据库
- 要完成真实迁移与落库验证，至少需要先满足：
  - 本地 PostgreSQL 已启动
  - `.env` 中的 `DATABASE_URL` 可连通
  - 执行 `npx prisma migrate deploy` 或等价迁移命令

## 当前结论

- “运营提示词中心”前后端主链路、页面接入、异步作品中心和固定模型顺序已经完成。
- 当前可确认：
  - 代码诊断通过
  - server / web 构建通过
  - 文档已补齐实现说明与运行边界
- 本地联调新增验证结果：
  - Docker 本地 PostgreSQL 15 已成功启动
  - `ai_omni_ops` 数据库已创建
  - `OperationsPromptTemplate` 真表已创建
  - 已通过 `scripts/import-operations-prompt-templates.ts` 导入 `182` 条模板
- 当前仍有一个环境边界：
  - 代理沙箱内直接执行 `Prisma CLI` 访问 `127.0.0.1:5432` 仍返回 `P1001`
  - 但通过容器内 `psql` 已经完成真库建库、建表和模板导入，说明数据库本身可用

## 后续建议

- 继续补一次前端实际页面联调，确认 `运营提示词中心` 独立页打开后直接读取到数据库中的 `182` 条模板，而不是 fallback。
- 如需支持管理员后台维护模板，可在后续增加模板管理面板，而不是继续依赖文件导入。
