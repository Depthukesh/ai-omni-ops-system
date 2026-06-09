# 2026-06-09 知识检索配置第一版

## 本次变更

- 在 `prisma/schema.prisma` 中新增 `KnowledgeRetrievalConfig`，并为 `KnowledgeBase` 补上一对一 `retrievalConfig` 关系。
- 新增迁移 `prisma/migrations/20260609_knowledge_retrieval_configs_first_pass/migration.sql`，把知识库默认检索策略正式落到数据库。
- 后端 `KnowledgeBasesService` 补齐知识检索配置的查询与保存能力，支持数据库优先、`mock-data` 兜底，以及缺省配置自动回填。
- 后端新增接口：
  - `GET /admin/knowledge-bases/retrieval-configs`
  - `PATCH /admin/knowledge-bases/:id/retrieval-config`
- 后台 `/admin` 的知识库卡片新增“检索配置”区块，可直接维护：
  - `defaultTopK`
  - `recallMode`
  - `rerankEnabled`
  - `rerankModelName`
  - `chunkSize`
  - `chunkOverlap`
  - `retrievalThreshold`

## 当前结果

- 知识库后台治理层已经从“主档 + 文件 + 同步 + 绑定关系”继续推进到“默认检索配置”层。
- 这一层先解决知识库的默认召回参数沉淀与后台可维护，不直接承诺真实 RAG 已落地。
- 新建知识库时会同步生成默认检索配置，避免后台页出现无配置可编辑的空档。

## 仍未完成

- 还没有接入真实文档解析、切片器、Embedding、向量库与检索日志。
- 还没有把检索配置真正下沉到运行时调用链。
- 后续还需要继续补：
  - 检索日志 / 命中明细
  - Rerank Provider 真正执行链路
  - Knowledge Base 级别的执行监控与回归验证
