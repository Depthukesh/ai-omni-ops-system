# AI全域运营系统 SkillPackage 数据结构草案 v1

## 1. 文档目的

本文档用于把《SkillPackage 对象关系图说明 v1》继续下钻成更贴近实现的数据结构草案，用于：

- 指导后端领域对象与 DTO 设计
- 指导数据库表结构拆分
- 指导统一技能中心详情页接口返回结构

## 2. 建模原则

### 2.1 聚合根

建议以 `SkillPackage` 作为聚合根。

原因：

- 它能把 Skill、Prompt、references、scripts、knowledge、Provider 统一收口
- 它天然适合作为统一技能中心详情页根对象
- 它能承接平台默认、品牌覆盖、用户覆盖三层规则

### 2.2 三层结构

建议分成三层：

1. 主对象层：`SkillPackage`
2. 资产与绑定层：`PromptAsset`、`ReferenceAsset`、`ScriptAsset`、`KnowledgeBinding`、`ProviderBinding`
3. 版本与覆盖层：`SkillPackageVersion`、`BrandOverride`、`UserOverride`

## 3. 核心对象草案

```ts
export interface SkillPackage {
  id: string;
  packageKey: string;
  packageName: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  scope: "PLATFORM" | "BRAND" | "USER";
  moduleKeys: string[];
  workflowStepKeys: string[];
  tags: string[];
  currentVersionId?: string;
  defaultKnowledgeSpaceIds: string[];
  defaultProviderPolicyIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

- `packageKey`：能力包全局唯一标识，建议使用英文短横线命名
- `scope`：区分平台默认包、品牌覆盖包、用户层派生包
- `moduleKeys`：反映能力包挂载到哪些模块
- `workflowStepKeys`：反映能力包参与哪些工作流步骤

## 4. 子对象草案

### 4.1 Skill

```ts
export interface SkillDefinition {
  id: string;
  skillKey: string;
  skillName: string;
  summary?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  executionMode: "SYNC" | "ASYNC" | "WORKFLOW_STEP";
}
```

### 4.2 PromptAsset

```ts
export interface PromptAsset {
  id: string;
  packageId: string;
  promptKey: string;
  promptName: string;
  promptRole: "SYSTEM" | "USER_TEMPLATE" | "FORMATTER" | "SUMMARY";
  content: string;
  isDefault: boolean;
  versionTag?: string;
}
```

### 4.3 ReferenceAsset

```ts
export interface ReferenceAsset {
  id: string;
  packageId: string;
  referenceKey: string;
  title: string;
  sourceType: "URL" | "FILE" | "DOC" | "MARKDOWN";
  sourceUri?: string;
  usageNote?: string;
  applicableScopes: string[];
}
```

### 4.4 ScriptAsset

```ts
export interface ScriptAsset {
  id: string;
  packageId: string;
  scriptKey: string;
  scriptName: string;
  runtime: "TS" | "JS" | "PYTHON" | "SHELL";
  entry?: string;
  argsSchema?: Record<string, unknown>;
  usageNote?: string;
}
```

### 4.5 KnowledgeBinding

```ts
export interface KnowledgeBinding {
  id: string;
  packageId: string;
  knowledgeSpaceId: string;
  bindingScope: "DEFAULT" | "BRAND_OVERRIDE" | "USER_OVERRIDE";
  retrievalMode: "SEMANTIC" | "HYBRID" | "MANUAL";
  priority: number;
  workflowStepKeys: string[];
}
```

### 4.6 ProviderBinding

```ts
export interface ProviderBinding {
  id: string;
  packageId: string;
  providerType: "TEXT" | "IMAGE" | "VIDEO" | "EMBEDDING" | "RERANK";
  providerId?: string;
  modelName?: string;
  priority: number;
  isDefault: boolean;
  fallbackProviderIds: string[];
  modelWhitelist: string[];
}
```

## 5. 版本结构草案

```ts
export interface SkillPackageVersion {
  id: string;
  packageId: string;
  versionNumber: string;
  changeLog?: string;
  isActive: boolean;
  snapshot: SkillPackageVersionSnapshot;
  createdBy?: string;
  createdAt: string;
}

export interface SkillPackageVersionSnapshot {
  skill: SkillDefinition;
  prompts: PromptAsset[];
  references: ReferenceAsset[];
  scripts: ScriptAsset[];
  knowledgeBindings: KnowledgeBinding[];
  providerBindings: ProviderBinding[];
}
```

说明：

- 版本对象建议保存完整快照，而不是只保存差异
- 第一阶段优先保证“可回滚”和“可对比”，不急着做复杂 merge

## 6. 覆盖层结构草案

### 6.1 品牌覆盖

```ts
export interface BrandSkillPackageOverride {
  id: string;
  packageId: string;
  brandId: string;
  promptOverrides: PromptOverrideItem[];
  providerOverrides: ProviderOverrideItem[];
  knowledgeOverrides: KnowledgeOverrideItem[];
  enabled: boolean;
}
```

### 6.2 用户覆盖

```ts
export interface UserSkillPackageOverride {
  id: string;
  packageId: string;
  userId: string;
  promptOverrides: PromptOverrideItem[];
  providerOverrides: ProviderOverrideItem[];
  personalPreferences: Record<string, unknown>;
  enabled: boolean;
}
```

### 6.3 覆盖项建议

```ts
export interface PromptOverrideItem {
  promptKey: string;
  content: string;
}

export interface ProviderOverrideItem {
  providerType: string;
  providerId?: string;
  modelName?: string;
}

export interface KnowledgeOverrideItem {
  knowledgeSpaceId: string;
  priority: number;
}
```

## 7. 统一技能中心详情接口返回草案

```ts
export interface SkillPackageDetailDTO {
  package: SkillPackage;
  skill: SkillDefinition;
  prompts: PromptAsset[];
  references: ReferenceAsset[];
  scripts: ScriptAsset[];
  knowledgeBindings: KnowledgeBinding[];
  providerBindings: ProviderBinding[];
  versions: SkillPackageVersion[];
  brandOverrides: BrandSkillPackageOverride[];
  userOverrides: UserSkillPackageOverride[];
}
```

这份 DTO 可以直接对应详情页页签：

- `package` 对应顶部摘要区和概览页签
- `prompts` 对应 Prompt 页签
- `references` 对应参考资料页签
- `scripts` 对应脚本页签
- `knowledgeBindings` 对应知识页签
- `providerBindings` 对应 Provider 页签
- `versions` 对应版本页签
- `brandOverrides` 对应品牌覆盖页签
- `userOverrides` 对应用户覆盖页签

## 8. 数据落地建议

第一阶段不建议一开始就把所有对象塞进一张大表。

建议至少拆成以下数据块：

- `skill_packages`
- `skill_package_versions`
- `prompt_assets`
- `reference_assets`
- `script_assets`
- `knowledge_bindings`
- `provider_bindings`
- `brand_skill_package_overrides`
- `user_skill_package_overrides`
- 模块与能力包关联表
- 工作流步骤与能力包关联表

## 9. 第一阶段最小实现集合

### P0

- `SkillPackage`
- `SkillDefinition`
- `PromptAsset`
- `ProviderBinding`
- `SkillPackageVersion`

### P1

- `ReferenceAsset`
- `ScriptAsset`
- 模块关联表
- 工作流步骤关联表

### P2

- `KnowledgeBinding`
- `BrandSkillPackageOverride`
- `UserSkillPackageOverride`

## 10. 最终结论

`SkillPackage` 数据结构草案的核心价值，是把统一技能中心从概念页面推进到可定义接口、可拆表、可做版本和覆盖机制的真实实现层。

第一阶段应优先让 `SkillPackage + PromptAsset + ProviderBinding + Version` 跑通，再逐步补 references、scripts、knowledge 与覆盖层。
