# 2026-06-10 火山方舟 Doubao Embedding 供应商接入

## 本次变更

- 在系统级 API Provider 目录中新增火山方舟多模态 embedding 供应商：
  - `火山方舟 · Doubao Embedding Vision 250615`
  - 模型 ID：`doubao-embedding-vision-250615`
- 新增的供应商采用火山方舟基础地址：
  - `https://ark.cn-beijing.volces.com/api/v3`
- 为该供应商补充了 RAG/知识库方向的运行时元信息：
  - `runtimeKey: embedding-multimodal`
  - `runtimeTags: embedding / knowledge-runtime / rag-runtime / multimodal-embedding`
  - `embeddingPath: /embeddings/multimodal`
  - `requestMode: multimodal-embeddings`
- 补充了模型能力说明：
  - 支持文本、图片、视频多模态输入
  - 预留维度选项 `256 / 512 / 1024`
  - 标记支持 sparse embedding
- 第三方平台页会按 `baseUrl` 自动聚合，因此后台中的 `火山方舟平台` 会自动纳入这个模型，不需要额外单独加平台记录。

## 密钥策略

- 本次没有把新的火山方舟 API Key 写死在代码里。
- 该供应商的 Key 仍建议由品牌 Owner 或管理员在个人中心 / 第三方接口配置页维护。
- 如果后续要接入真实调用链，运行时应优先读取用户或品牌维度的私有 Key，而不是在仓库中保存明文密钥。

## 当前状态

- 供应商目录已具备该模型的注册信息。
- 后续如果要真正跑通知识库向量化，还需要继续补：
  - embedding 调用服务
  - knowledge chunk / embedding 入库链路
  - query 检索与 rerank 流程
