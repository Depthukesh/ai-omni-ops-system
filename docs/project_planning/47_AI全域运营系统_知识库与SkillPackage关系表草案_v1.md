# AI全域运营系统 知识库与SkillPackage关系表草案 v1

## 1. 文档目的

本文档用于把《知识库主数据层设计草案 v1》与《SkillPackage 数据结构草案 v1》进一步打通，形成知识库与能力包之间的关系表草案，用于：

- 指导知识空间与能力包的关系建模
- 指导数据库关系表设计
- 指导知识绑定接口和技能中心详情页后续扩展

## 2. 核心结论

建议不要把知识空间直接塞进 `skill_packages` 主表字段中长期维护，而是通过独立关系表管理。

原因：

- 一个 `SkillPackage` 可以绑定多个知识空间
- 一个知识空间也可以被多个能力包复用
- 后续还需要支持优先级、检索模式、启用状态、品牌覆盖

因此更适合采用：

- 多对多关系
- 带业务属性的关系表

## 3. 关系模型

建议关系如下：

- 一个 `SkillPackage` -> 多个知识空间
- 一个 `KnowledgeSpace` -> 多个能力包

关系对象建议命名为：

- `SkillPackageKnowledgeRelation`

数据库表建议命名为：

- `skill_package_knowledge_spaces`

## 4. 关系表字段建议

```ts
export interface SkillPackageKnowledgeRelation {
  id: string;
  packageId: string;
  knowledgeSpaceId: string;
  relationType: "DEFAULT" | "OPTIONAL" | "BRAND_OVERRIDE" | "USER_OVERRIDE";
  priority: number;
  retrievalMode: "SEMANTIC" | "HYBRID" | "MANUAL";
  isRequired: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## 5. 字段说明

- `packageId`：指向 `skill_packages.id`
- `knowledgeSpaceId`：指向 `knowledge_spaces.id`
- `relationType`：表达这是默认知识、可选知识还是覆盖层知识
- `priority`：多个知识空间参与同一能力包时的检索顺序
- `retrievalMode`：该能力包使用这个知识空间时的检索方式
- `isRequired`：是否必须参与检索
- `enabled`：是否启用这条关系

## 6. 约束建议

建议至少增加以下约束：

- `packageId + knowledgeSpaceId + relationType` 唯一
- `priority` 必须大于 0
- 被归档或停用的 `SkillPackage` 不建议再新增关系
- 被停用的 `KnowledgeSpace` 不建议再新增关系

## 7. 查询方向建议

### 7.1 从能力包看知识空间

适用场景：

- 统一技能中心详情页查看知识页签
- 工作流执行前计算该能力包默认知识集

### 7.2 从知识空间看能力包

适用场景：

- 知识空间详情页查看“被哪些能力包引用”
- 判断某个知识空间是否是平台核心知识空间

## 8. 与 `KnowledgeBinding` 的关系

`KnowledgeBinding` 和本关系表并不冲突。

建议理解为：

- `KnowledgeBinding`：通用绑定协议，面向模块、能力包、Prompt、工作流步骤
- `skill_package_knowledge_spaces`：当知识空间明确和能力包建立长期关系时的专用关系表

如果第一阶段希望模型简单，可以：

- 先使用 `KnowledgeBinding(bindingType = SKILL_PACKAGE)` 跑通
- 后续再平滑演进为专用关系表

如果第一阶段希望直接为长期能力包管理做准备，也可以直接落专用关系表。

## 9. 第一阶段建议方案

我建议第一阶段采用折中方案：

### 第一阶段执行期

- 对外接口先继续使用统一的 `KnowledgeBinding`

### 第一阶段数据库设计期

- 文档层先明确 `skill_package_knowledge_spaces` 关系表草案

这样做的好处是：

- 不增加当前接口复杂度
- 但提前把长期关系模型定下来

## 10. 页面影响

这个关系表后续主要影响两个页面：

### 统一技能中心详情页

- 知识页签显示绑定知识空间
- 支持显示默认知识空间、优先级、检索模式、启用状态

### 知识空间详情页

- 显示该知识空间被哪些能力包引用

## 11. 数据落地建议

建议关系表字段如下：

- `id`
- `package_id`
- `knowledge_space_id`
- `relation_type`
- `priority`
- `retrieval_mode`
- `is_required`
- `enabled`
- `created_at`
- `updated_at`

建议索引：

- `idx_spks_package_id`
- `idx_spks_knowledge_space_id`
- `idx_spks_enabled`

## 12. 最终结论

知识库与 `SkillPackage` 的关系，本质上不是简单字段引用，而是一个带业务属性的多对多关系。

把这层关系单独建模后，后续知识空间才能真正成为能力包体系的一部分，而不是停留在松散外挂引用层。
