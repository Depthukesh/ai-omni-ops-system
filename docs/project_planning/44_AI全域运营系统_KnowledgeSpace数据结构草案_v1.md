# AI全域运营系统 KnowledgeSpace 数据结构草案 v1

## 1. 文档目的

本文档用于把《知识库主数据层设计草案 v1》继续下钻成更贴近实现的 `KnowledgeSpace` 数据结构草案，用于：

- 指导知识空间领域对象与 DTO 设计
- 指导数据库表结构拆分
- 指导知识库后台列表页和详情页接口返回结构

## 2. 建模原则

### 2.1 聚合根

建议以 `KnowledgeSpace` 作为知识库域的聚合根。

原因：

- 它是品牌、模块、用户和平台知识的统一入口
- 它天然适合作为后台知识空间详情页根对象
- 它能承接文档、标签、绑定关系和默认检索配置

### 2.2 三层结构

建议分成三层：

1. 主对象层：`KnowledgeSpace`
2. 内容与标签层：`KnowledgeDocument`、`KnowledgeTag`
3. 绑定与配置层：`KnowledgeBinding`、`KnowledgeRetrievalConfig`

## 3. 核心对象草案

```ts
export interface KnowledgeSpace {
  id: string;
  spaceKey: string;
  spaceName: string;
  description?: string;
  scope: "PLATFORM" | "BRAND" | "MODULE" | "USER";
  ownerBrandId?: string;
  ownerUserId?: string;
  moduleKeys: string[];
  status: "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  sourceMode: "MANUAL" | "SYNCED" | "HYBRID";
  visibility: "PRIVATE" | "BRAND_SHARED" | "PLATFORM_SHARED";
  tagIds: string[];
  retrievalConfigId?: string;
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

- `spaceKey`：知识空间全局唯一标识，建议使用英文短横线命名
- `scope`：区分平台公共空间、品牌空间、模块空间、用户私有空间
- `moduleKeys`：反映该知识空间主要服务哪些模块
- `sourceMode`：区分手工录入、同步导入和混合模式

## 4. 子对象草案

### 4.1 KnowledgeDocument

```ts
export interface KnowledgeDocument {
  id: string;
  spaceId: string;
  documentKey: string;
  title: string;
  sourceType: "FILE" | "URL" | "DOC" | "MARKDOWN" | "API";
  sourceUri?: string;
  mimeType?: string;
  summary?: string;
  language?: string;
  parseStatus: "PENDING" | "PARSED" | "FAILED";
  syncStatus: "NONE" | "SYNCING" | "SYNCED" | "FAILED";
  tagIds: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 KnowledgeTag

```ts
export interface KnowledgeTag {
  id: string;
  tagKey: string;
  tagName: string;
  scope: "PLATFORM" | "BRAND";
  ownerBrandId?: string;
  color?: string;
  description?: string;
}
```

### 4.3 KnowledgeRetrievalConfig

```ts
export interface KnowledgeRetrievalConfig {
  id: string;
  spaceId: string;
  defaultTopK: number;
  recallMode: "SEMANTIC" | "HYBRID";
  rerankEnabled: boolean;
  rerankModelName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  retrievalThreshold?: number;
}
```

## 5. 聚合详情结构草案

```ts
export interface KnowledgeSpaceDetailDTO {
  space: KnowledgeSpace;
  retrievalConfig?: KnowledgeRetrievalConfig;
  tags: KnowledgeTag[];
  documentStats: KnowledgeDocumentStatsDTO;
  bindingSummaries: KnowledgeBindingSummaryDTO[];
}
```

### 5.1 文档统计结构

```ts
export interface KnowledgeDocumentStatsDTO {
  totalDocuments: number;
  parsedDocuments: number;
  failedDocuments: number;
  syncingDocuments: number;
  lastUpdatedAt?: string;
}
```

### 5.2 绑定摘要结构

```ts
export interface KnowledgeBindingSummaryDTO {
  bindingType: "MODULE" | "SKILL_PACKAGE" | "PROMPT" | "WORKFLOW_STEP";
  targetId: string;
  targetKey?: string;
  priority: number;
  enabled: boolean;
}
```

## 6. 列表接口返回草案

```ts
export interface KnowledgeSpaceListResponse {
  items: KnowledgeSpaceListItemDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface KnowledgeSpaceListItemDTO {
  id: string;
  spaceKey: string;
  spaceName: string;
  scope: string;
  status: string;
  sourceMode: string;
  visibility: string;
  documentCount: number;
  bindingCount: number;
  updatedAt?: string;
}
```

## 7. 详情接口返回草案

```ts
export interface KnowledgeSpaceDetailResponse {
  space: KnowledgeSpace;
  retrievalConfig?: KnowledgeRetrievalConfig;
  tags: KnowledgeTag[];
  documents?: KnowledgeDocument[];
  bindingSummaries: KnowledgeBindingSummaryDTO[];
}
```

## 8. 多品牌规则落点

### 平台默认层

- 平台公共 `KnowledgeSpace`
- 平台公共标签
- 平台默认检索配置

### 品牌层

- 品牌私有 `KnowledgeSpace`
- 品牌私有标签
- 品牌检索策略覆盖

### 用户层

- 用户临时 `KnowledgeSpace`
- 用户私有临时资料

## 9. 数据落地建议

第一阶段不建议把空间、标签、文档、配置全塞进一张大表。

建议至少拆成以下数据块：

- `knowledge_spaces`
- `knowledge_documents`
- `knowledge_tags`
- `knowledge_space_tags`
- `knowledge_retrieval_configs`
- `knowledge_bindings`

## 10. 第一阶段最小实现集合

### P0

- `KnowledgeSpace`
- `KnowledgeDocument`
- `KnowledgeBinding`

### P1

- `KnowledgeTag`
- `KnowledgeRetrievalConfig`
- 空间标签关联

### P2

- 文档统计缓存
- 检索效果统计

## 11. 最终结论

`KnowledgeSpace` 数据结构草案的核心价值，是把知识库主数据层从概念推进到可定义接口、可拆表、可支撑后台页面和绑定关系的真实实现层。

第一阶段应优先让 `KnowledgeSpace + KnowledgeDocument + KnowledgeBinding` 跑通，再逐步补标签、检索配置和统计层。
