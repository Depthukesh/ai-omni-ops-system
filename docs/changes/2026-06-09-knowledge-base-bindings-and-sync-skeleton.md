# 2026-06-09 知识库绑定管理与同步执行骨架

## 背景

- 当前后台 `/admin` 的知识库管理已经具备主档、文件和同步记录，但仍缺少把知识库真正绑定到模块、能力包、提示词和工作流步骤的后台入口。
- 同时，知识库“同步”此前只会创建 `RUNNING` 状态的记录，不会继续产出分片数量、索引结果和执行摘要，仍停留在治理占位层。
- 本轮目标不是一次性接入完整 RAG，而是先把知识库后台从“可记录”推进到“可治理 + 有最小执行反馈”的阶段。

## 本次改动

### 1. 知识库后台页补齐绑定关系管理

- 在后台 `/admin` 的每个知识库卡片内新增“绑定关系”区块。
- 支持直接在知识库页内：
  - 查看绑定列表
  - 新增绑定
  - 编辑绑定
  - 删除绑定
- 当前支持的绑定类型：
  - `MODULE`
  - `SKILL_PACKAGE`
  - `PROMPT`
  - `WORKFLOW_STEP`
- 当前可维护的字段包括：
  - `targetId`
  - `targetKey`
  - `targetName`
  - `priority`
  - `retrievalMode`
  - `isRequired`
  - `enabled`

### 2. 前端服务层补齐知识绑定查询入口

- `apps/web/src/services/admin.ts` 补入：
  - `knowledgeBindingSeed`
  - `getKnowledgeBindings()`
- 这样后台知识库页不再只依赖“按目标查询”，而是可以先按知识库维度拉全量绑定，再在页内归组展示。

### 3. 文件同步改为最小 ingestion 骨架

- `KnowledgeBasesService.startKnowledgeBaseFileSync()` 现在不再只创建 `RUNNING` 记录。
- 触发文件同步后，后端会：
  - 先创建同步记录
  - 再按文件类型和名称信号估算最小分片数
  - 写回 `KnowledgeBaseFile.chunkCount`
  - 自动把文件状态更新为 `INDEXED`
  - 自动把同步记录更新为 `SUCCESS`
  - 写入一条“最小解析骨架已完成”的执行摘要

### 4. 全量同步也补入最小执行反馈

- `KnowledgeBasesService.startKnowledgeBaseFullSync()` 现在会遍历知识库下全部文件：
  - 为每个文件补齐最小分片数
  - 把状态写回 `INDEXED`
  - 汇总本次累计处理文件数和分片数
  - 最终把全量同步记录直接收口到 `SUCCESS`

### 5. 后台提示与交互同步调整

- 知识库文件“触发同步”完成后，后台提示改为直接显示：
  - 文件已同步完成
  - 当前分片数
- 已 `INDEXED` 的文件现在仍允许“重新同步”，方便后续继续调试知识库 ingestion。
- 全量同步完成后，后台提示会直接显示知识库当前累计分片数。

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/services/admin.ts`
- 后端：
  - `apps/server/src/modules/admin/knowledge-bases.service.ts`
- 文档：
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/database-archive.md`
  - 本文档

## 当前边界

- 这仍然不是完整 RAG。
- 当前“同步执行”仍是最小骨架，主要用于：
  - 让后台同步动作有可见结果
  - 让文件和知识库累计分片数开始形成真实状态
  - 为后续接入真实解析器、切片器、向量索引器预留稳定接口位置
- 本轮仍未接入：
  - 原文件上传存储
  - PDF/DOCX/网页真实解析
  - 向量化与召回
  - 检索日志闭环

## 验证

- `GetDiagnostics`
- `npm run build:server`
- `npx tsc -p apps/web/tsconfig.json --noEmit`

## 下一步建议

- 下一步优先补“真实解析任务骨架”，把不同文件类型的最小解析器分发接口建立起来。
- 再下一步补“检索配置 + 检索日志”，让知识库不只停留在治理层和假分片层。
