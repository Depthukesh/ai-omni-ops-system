# 2026-06-10 知识库真实切片与 embedding 入库第一版

## 本次变更

- 为知识库新增 `KnowledgeChunk` 数据表，用于持久化真实切片内容，而不是只保存估算的 `chunkCount`。
- 后台知识库文件同步从“最小估算骨架”升级为“正文提取 -> 切片 -> 落库 -> 回写 chunkCount”。
- 新增文件切片查看接口：
  - `GET /admin/knowledge-base-files/:id/chunks`
- 新增文件 embedding 查看接口：
  - `GET /admin/knowledge-base-files/:id/embeddings`
- 知识库同步时会自动判断当前知识库是否来自品牌 `企业知识库` 桥接容器：
  - 如果是，则根据 `knowledgeBaseId` 反推出 `brandId`
  - 再去品牌资产 OSS 路径读取原始文件
- 当前正文提取优先支持：
  - `MD / TXT / CSV` 等文本类文件
  - `DOCX`
  - `XLSX`
  - `PDF` 先提供轻量文本提取兜底，不保证复杂版式稳定
- 当正文暂时无法稳定提取时，系统不会直接中断，而是按文件元数据生成占位分片，方便后续继续接 embedding 与排查。

## 品牌共享 Key 接入状态

- 知识库同步链路已经接入品牌共享 API Key 的识别逻辑。
- 当前会按知识库所属品牌去解析火山方舟平台的共享 Key，并在同步结果摘要中提示：
  - 已识别品牌共享 Key，可继续接入 embedding
  - 或当前品牌尚未配置共享 Key
- 本轮已接入火山方舟 `doubao-embedding-vision-250615`：
  - 同步完成 chunk 后，会自动尝试生成文本 embedding
  - 当前向量先写入 `KnowledgeEmbedding.embeddingJson`
  - 本轮先不引入 `pgvector`，以便快速打通品牌共享 Key -> embedding -> 入库链路

## 当前范围

- 已打通：原文件 -> 正文/元数据 -> chunk 表
- 已打通：品牌上下文 -> 火山方舟共享 Key 识别
- 已打通：chunk -> 火山方舟 embedding -> embedding 表
- 未打通：向量检索 -> RAG 问答

## 下一步建议

- 为 embedding 增加批处理、重试与限流
- 评估切到 `pgvector` 或独立向量库
- 增加检索测试接口与引用返回
