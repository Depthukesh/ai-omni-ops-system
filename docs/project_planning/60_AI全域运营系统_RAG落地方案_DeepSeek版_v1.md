# AI全域运营系统 RAG落地方案 DeepSeek版 v1

## 1. 文档目的

本文档用于把当前项目中的知识库骨架、文档上传链路和后台治理能力，进一步收束成一套可直接落地的 RAG 技术方案，用于：

- 明确 RAG 在我方系统中的真实职责边界
- 明确原始文档、数据库记录、切片和向量的存储分层
- 明确 DeepSeek 第三方大模型接口在本方案中的使用方式
- 明确服务器、数据库、对象存储、异步任务和模型服务的最小配置
- 指导后续 Prisma 建表、接口补齐和前后台联调顺序

## 2. 当前现状判断

结合当前代码，项目已经具备了知识库第一阶段的部分底座，但还没有进入完整生产级 RAG 阶段。

当前已经具备：

- 企业知识库页面可上传资料
- 后端已支持文件写入对象存储
- 数据库已具备知识库主表、知识文件表、绑定表、检索配置表、同步记录表
- 后台已具备知识库管理、绑定关系、检索配置的治理页面骨架
- 企业知识库桥接到后台知识库后，已经可以自动触发正文提取、切片与 embedding 写入链路
- `KnowledgeBinding` 已支持创建、编辑、删除、按目标查询，并能在企业知识库桥接时自动补默认接入对象

当前仍未完整具备：

- 基于接入对象自动定位知识库范围的运行时执行链
- 模块 / 能力包 / 提示词在执行时自动按绑定关系注入检索结果
- 向量索引规模化优化与高并发召回能力
- rerank 二次排序生产化链路
- 检索问答统一执行链
- 检索命中日志与效果评估

因此，当前系统定位更接近：

- 知识库治理底座
- 文档接入骨架
- RAG 前置主数据层

而不是完整可商用的知识问答引擎。

## 3. 核心结论

本项目建议采用如下总体原则：

1. 原始文档放 `OSS`
2. 主数据、元数据、绑定关系、检索配置放 `PostgreSQL`
3. 切片文本与切片元数据放 `PostgreSQL`
4. 向量优先落 `pgvector`
5. 问答模型使用 `DeepSeek` 第三方接口
6. `deepseek-v4-flash` 用于问答生成、摘要、改写、轻量重排，不直接作为 embedding 主模型
7. embedding 采用 DeepSeek 兼容的 embedding 能力或独立 embedding 模型，接入方式保持 OpenAI-compatible

简化表达就是：

- 文件本体交给对象存储
- 数据关系交给数据库
- 语义检索交给向量层
- 最终回答交给 DeepSeek

## 4. 为什么不把文档本体放数据库

不建议把 PDF、Word、Excel、图片或大文本原件直接长期塞入关系数据库，主要原因是：

- 数据库体积膨胀快，备份与恢复成本高
- 二进制文件并不适合高频结构化查询
- 文档下载、预览、签名访问更适合对象存储
- 后续做冷热分层、CDN、生命周期管理时，OSS 更合适
- RAG 真正查询时查的是切片和向量，而不是直接扫描原文件

因此建议长期固定为：

- `OSS` 存原文件
- `PostgreSQL` 存记录
- `pgvector` 存向量

## 5. 当前项目中的文档存储定位

根据当前代码实现，文档上传链路已经基本符合上述方向：

- 上传资料时，后端先把文件写到对象存储
- 业务表中保存 `fileUrl`
- 知识库文件表中保存文件名、类型、状态、来源等元数据
- 数据库并不保存文件二进制本体

因此，当前知识库文档存储方向不需要推翻，只需要继续深化为真正的 RAG 入库链路即可。

## 6. DeepSeek 在本方案中的角色

## 6.1 建议角色分工

本方案建议把 DeepSeek 分成两类能力看待：

- 问答与生成模型
- embedding 模型或 embedding 接口

其中：

- `deepseek-v4-flash` 适合做问答生成、总结、改写、解释、引用整合
- `deepseek-v4-flash` 不建议直接在方案中定义为 embedding 主模型

原因是：

- 官方模型页把 `deepseek-v4-flash` 定位为聊天/生成模型
- 官方快速开始与定价页展示的是 chat/completions 能力和模型特性
- embedding 在工程上应与问答模型解耦，便于后续替换、降本和评测

## 6.2 本方案的落地建议

建议采用以下接法：

- 问答生成：`deepseek-v4-flash`
- 检索摘要整合：`deepseek-v4-flash`
- FAQ 改写与引用整理：`deepseek-v4-flash`
- embedding：使用 DeepSeek 兼容的 embedding 接口或独立 embedding 模型

如果后续确认 DeepSeek 账户下可稳定提供 embedding endpoint 且效果满足要求，可继续保留同一供应商；但即使如此，也建议把配置拆成两套：

- `chatModel`
- `embeddingModel`

不要把两者写死成同一个模型名。

## 6.3 为什么不建议用同一个聊天模型直接兼任 embedding

主要原因有四点：

- 问答模型和 embedding 模型的目标不同
- 向量稳定性和相似度表现需要专门评估
- 后续换模型时，问答和 embedding 的升级节奏不同
- 一旦混在一起，成本与效果都难以优化

所以本方案明确要求：

- 允许同一供应商
- 不建议同一模型名同时承担两种职责

## 7. RAG 在本系统中的真实工作流

建议把 RAG 执行链拆成 10 个步骤：

1. 用户上传文档到企业知识库
2. 系统把原始文件写入 `OSS`
3. 数据库创建文档记录和知识库文件记录
4. 异步任务拉取原文并做文档解析
5. 解析结果按规则切成多个 `chunk`
6. 对每个 `chunk` 调用 embedding 接口生成向量
7. 把 `chunk` 文本、元数据和向量写入存储层
8. 用户提问时，系统先根据品牌、模块、能力包、工作流定位知识库范围
9. 系统把问题向量化，进行 TopK 召回，再可选做 rerank
10. 系统把命中的片段作为上下文交给 `deepseek-v4-flash` 生成最终答案并返回引用来源

## 7.1 接入对象当前作用与现状

当前后台里的“接入对象”，本质上就是 `KnowledgeBinding`。

它现在已经承担的作用有：

- 把某个知识库声明为“可供哪个模块 / 能力包 / 提示词使用”
- 保存目标对象标识，例如 `targetId`、`targetKey`、`targetName`
- 保存治理参数，例如 `priority`、`retrievalMode`、`isRequired`、`enabled`
- 在企业知识库桥接时，自动为“品牌增长工作台”补一条默认绑定，避免容器创建后完全孤立
- 为后台页面展示“这个知识库准备给谁用”提供依据

它现在还没有完全承担的作用有：

- 报告生成、提示词执行、模块运行时还没有统一调用“按接入对象解析知识库”的服务
- `retrieval-test` 目前仍是面向“指定知识库”手动调试，不是面向“目标对象”自动解析
- 绑定里的 `priority`、`retrievalMode`、`isRequired` 目前主要还是治理字段，还没有全面进入运行时编排

因此，当前应把“接入对象”理解为：

- 已完成：知识库治理层、配置层、主数据层
- 未完成：业务运行时自动消费层

换句话说，现在“接入对象”已经能告诉系统“谁应该使用哪个知识库”，但还没有在所有报告、能力包、提示词执行入口里做到“系统自动按这条绑定去检索并把命中片段塞进 prompt”。

## 8. 系统分层设计

建议把 RAG 相关能力分为 6 层：

### 8.1 文件层

职责：

- 存原始文档
- 存导入版本
- 支撑预览和下载

建议承载：

- `OSS`

### 8.2 主数据层

职责：

- 管理知识库容器
- 管理文档记录
- 管理绑定关系
- 管理检索配置

建议承载：

- `PostgreSQL`

### 8.3 切片层

职责：

- 保存切片文本
- 保存来源页码、标题路径、段落序号
- 保存切片状态

建议承载：

- `PostgreSQL`

### 8.4 向量层

职责：

- 保存向量
- 建立相似度检索索引
- 提供 TopK 召回

建议承载：

- 前期：`PostgreSQL + pgvector`
- 中后期：视规模切换到 `Qdrant` 或 `Milvus`

### 8.5 检索编排层

职责：

- 过滤知识库范围
- 合并关键词和向量召回
- 处理阈值、TopK、rerank
- 输出命中结果

建议承载：

- `NestJS` 服务层

### 8.6 生成层

职责：

- 基于命中上下文组织 prompt
- 调用大模型生成答案
- 输出引用来源和置信说明

建议承载：

- `DeepSeek API`

## 9. 数据模型落地建议

在现有 `KnowledgeBase`、`KnowledgeBaseFile`、`KnowledgeBinding`、`KnowledgeRetrievalConfig`、`KnowledgeBaseSyncRun` 基础上，建议新增以下对象。

## 9.1 `knowledge_chunks`

用途：

- 作为检索的最小内容颗粒

建议字段：

```ts
export interface KnowledgeChunk {
  id: string;
  knowledgeBaseId: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  contentHash?: string;
  tokenCount?: number;
  charCount?: number;
  sourcePage?: number;
  sourceSheet?: string;
  headingPathJson?: string;
  metadataJson?: string;
  parseStatus: "PENDING" | "READY" | "FAILED";
  createdAt: string;
  updatedAt: string;
}
```

## 9.2 `knowledge_embeddings`

用途：

- 保存某个切片对应的向量结果
- 支撑切换 embedding 供应商或模型

建议字段：

```ts
export interface KnowledgeEmbedding {
  id: string;
  chunkId: string;
  providerKey: string;
  modelName: string;
  vectorDimension: number;
  vectorStatus: "PENDING" | "READY" | "FAILED";
  checksum?: string;
  createdAt: string;
  updatedAt: string;
}
```

如果走 `pgvector`，则可直接在该表增加：

```ts
embedding vector(1536)
```

维度长度按实际模型返回值调整，不在本文档中写死。

## 9.3 `knowledge_ingestion_jobs`

用途：

- 记录文档入库任务
- 支撑重试、失败原因查看、异步处理

建议字段：

```ts
export interface KnowledgeIngestionJob {
  id: string;
  knowledgeBaseId: string;
  fileId: string;
  stage:
    | "UPLOADED"
    | "PARSING"
    | "CHUNKING"
    | "EMBEDDING"
    | "INDEXING"
    | "DONE"
    | "FAILED";
  retryCount: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 9.4 `knowledge_query_logs`

用途：

- 记录每次知识检索和问答命中情况
- 用于后续评估召回效果和优化阈值

建议字段：

```ts
export interface KnowledgeQueryLog {
  id: string;
  knowledgeBaseId?: string;
  targetType?: "MODULE" | "SKILL_PACKAGE" | "PROMPT" | "WORKFLOW_STEP";
  targetId?: string;
  question: string;
  topK: number;
  threshold?: number;
  rerankEnabled: boolean;
  answerModelName?: string;
  latencyMs?: number;
  hitCount?: number;
  createdAt: string;
}
```

## 10. 推荐数据库方案

## 10.1 第一阶段

建议采用：

- `PostgreSQL`
- `pgvector`
- `OSS`

原因：

- 部署简单
- 维护成本低
- 能快速与现有 NestJS + Prisma 体系衔接
- 足够支撑第一阶段品牌知识库、企业知识库和工作流引用

## 10.2 第二阶段

当出现以下情况时，再考虑引入独立向量库：

- 文档量级明显增长
- 品牌数量明显增长
- 在线查询并发上升
- 需要更细粒度的 ANN 索引和高性能召回

届时可考虑：

- `Qdrant`
- `Milvus`

但第一阶段不建议过早上复杂分布式向量库。

## 11. 服务器与基础设施清单

## 11.1 最小可运行配置

如果目标是先把知识库 RAG 跑通，建议最少具备：

- 1 套 `Web/API` 服务
- 1 套 `PostgreSQL`
- 1 个 `OSS Bucket`
- 1 套异步任务 `Worker`
- 1 套 `DeepSeek API Key`
- 1 套 embedding 接口配置

## 11.2 推荐生产配置

如果目标是较稳定上线，建议增加：

- `Redis`
- 队列系统
- 任务重试机制
- 文档解析服务
- OCR 服务
- 监控告警
- 访问审计
- 备份恢复策略

## 11.3 各组件职责

### API 服务

- 提供知识库管理接口
- 提供上传接口
- 提供问答接口
- 执行知识绑定范围过滤

### Worker 服务

- 解析文档
- 切片
- 调 embedding 接口
- 写入向量
- 更新入库状态

### PostgreSQL

- 保存主数据
- 保存切片
- 保存向量或向量索引引用
- 保存日志和任务状态

### OSS

- 存原始文档
- 存导入版本
- 支撑预览与下载

### DeepSeek

- 承担最终问答生成
- 承担总结、改写、答案润色

## 12. DeepSeek 接入方式建议

考虑到 DeepSeek API 兼容 OpenAI 风格，建议在我方系统中统一按 OpenAI-compatible 供应商接法设计。

建议配置结构：

```ts
export interface RagModelRuntimeConfig {
  providerKey: "deepseek";
  baseUrl: "https://api.deepseek.com";
  apiKeyEnv: "DEEPSEEK_API_KEY";
  chatCompletionPath: "/chat/completions";
  embeddingPath?: "/embeddings";
  chatModel: "deepseek-v4-flash";
  embeddingModel: string;
}
```

说明：

- `chatModel` 固定为 `deepseek-v4-flash`
- `embeddingModel` 单独配置，不与 `chatModel` 混用
- 如果后续确认 DeepSeek 的 embedding 模型名和维度稳定，再补入后台配置中心

## 13. 推荐接口设计

建议新增以下后端接口。

## 13.1 文档入库任务

- `POST /api/admin/knowledge-bases/:knowledgeBaseId/files/:fileId/ingest`
- `GET /api/admin/knowledge-ingestion-jobs/:jobId`

## 13.2 切片查询

- `GET /api/admin/knowledge-bases/:knowledgeBaseId/chunks`
- `GET /api/admin/knowledge-files/:fileId/chunks`

## 13.3 问答接口

- `POST /api/knowledge/query`

请求体建议：

```json
{
  "question": "品牌近期有哪些经营重点？",
  "brandId": "brand_xxx",
  "moduleKey": "brand-growth-workbench",
  "knowledgeBaseIds": [],
  "topK": 8,
  "rerankEnabled": true
}
```

返回体建议：

```json
{
  "answer": "......",
  "citations": [
    {
      "knowledgeBaseId": "kb_xxx",
      "fileId": "kbf_xxx",
      "chunkId": "chunk_xxx",
      "fileName": "企业年报.pdf",
      "score": 0.93
    }
  ],
  "debug": {
    "retrievalLatencyMs": 123,
    "generationLatencyMs": 955
  }
}
```

## 14. 推荐页面落地顺序

建议按以下顺序实施：

### 第一步

- 完成数据库连通
- 完成 OSS 配置
- 完成入库任务表与切片表

### 第二步

- 打通文档解析
- 打通切片
- 打通 embedding 写入

### 第三步

- 打通向量召回
- 打通问答接口
- 打通前台问答组件

### 第四步

- 打通检索日志
- 打通效果评估
- 打通引用展示和答案回溯

## 15. 与当前项目现状的衔接建议

建议在当前知识库代码基础上，分 4 个开发包推进：

### 包 A：底座修复

- 修复数据库连接
- 稳定知识库真实写库
- 稳定 OSS 配置

### 包 B：入库链路

- 增加 ingestion job
- 增加正文解析
- 增加 chunk 表和 embedding 表

### 包 C：检索链路

- 增加 query 接口
- 增加向量召回
- 增加 rerank

### 包 D：业务接入

- 品牌工作台接问答
- 模块页接知识召回
- 工作流步骤接知识输入

## 16. 风险与约束

## 16.1 当前数据库未稳定可用

当前项目环境中数据库需要先稳定连通，否则知识库和 RAG 相关数据无法真实持久化。

## 16.2 不要把 embedding 和问答模型写死为同一模型

如果把 `deepseek-v4-flash` 同时硬编码为问答和 embedding，后续几乎必然带来：

- 效果评估困难
- 成本控制困难
- 替换模型困难

## 16.3 文档解析质量会直接决定 RAG 上限

如果 PDF、Word、Excel 解析质量差，后面再强的大模型也无法弥补检索输入质量问题。

## 16.4 引用溯源必须从一开始就设计

知识问答不是只要“能答”就够，必须能知道：

- 答案来自哪个知识库
- 来自哪个文件
- 来自哪个片段

否则后台难以验收，业务也难以信任。

## 17. 最小可上线方案

如果目标是尽快上线一个可用版，建议范围收束为：

- 文档上传到 OSS
- 文档元数据入 PostgreSQL
- 只支持 PDF 和 Markdown 两种解析
- 切片落库
- 向量落 `pgvector`
- 检索召回 + 可选 rerank
- `deepseek-v4-flash` 做最终答案生成
- 返回引用来源

做到这些后，就可以支撑：

- 企业知识库问答
- 品牌工作台知识检索
- 业务模块按绑定范围调用知识

## 18. 最终建议

本项目的 RAG 落地，不建议走“大而全一次做完”，而建议走“分层落地、逐段验收”的路线。

本方案的最终推荐架构是：

- 原始文档：`OSS`
- 主数据与元数据：`PostgreSQL`
- 向量层：`pgvector`
- 问答模型：`DeepSeek deepseek-v4-flash`
- embedding：DeepSeek 兼容 embedding 能力或独立 embedding 模型
- 执行编排：现有 `NestJS` 服务 + `Worker`

这套方案与当前项目已有知识库主数据层、后台治理层和对象存储链路兼容度最高，实施成本最低，也最适合作为下一阶段正式开发底稿。

## 19. 参考说明

本方案中的 DeepSeek 角色划分基于公开文档作如下判断：

- DeepSeek 官方快速开始与模型页明确展示 `deepseek-v4-flash` 作为聊天模型接入
- DeepSeek 官方定价页展示 `deepseek-v4-flash` 的上下文长度、输出长度和 chat 能力特征
- 因此本文档将 `deepseek-v4-flash` 定位为问答生成模型
- embedding 能力在工程接入时保留为单独配置项，不与聊天模型强耦合
