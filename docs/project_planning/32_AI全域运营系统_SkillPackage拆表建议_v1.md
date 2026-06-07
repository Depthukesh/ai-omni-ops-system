# AI全域运营系统 SkillPackage 拆表建议 v1

## 1. 文档目的

本文档用于把《SkillPackage 数据结构草案 v1》进一步下钻成数据库拆表建议，用于：

- 指导数据库表设计
- 指导 Prisma schema 规划
- 避免把能力包相关对象全部塞进一张大表

## 2. 拆表原则

建议遵循以下原则：

- 主对象和资产对象分表
- 绑定关系单独成表
- 版本快照独立成表
- 覆盖层独立成表
- 多对多关系使用关联表

这样做的原因是：

- 便于后续扩展 Prompt、references、scripts、knowledge、Provider
- 便于版本快照和回滚
- 便于品牌覆盖、用户覆盖独立演进

## 3. 建议的表清单

### 3.1 主表

- `skill_packages`
- `skill_definitions`
- `skill_package_versions`

### 3.2 资产表

- `prompt_assets`
- `reference_assets`
- `script_assets`

### 3.3 绑定表

- `knowledge_bindings`
- `provider_bindings`

### 3.4 覆盖表

- `brand_skill_package_overrides`
- `user_skill_package_overrides`

### 3.5 关联表

- `skill_package_modules`
- `skill_package_workflow_steps`

## 4. 主表建议

### 4.1 `skill_packages`

建议保存：

- `id`
- `package_key`
- `package_name`
- `description`
- `status`
- `scope`
- `current_version_id`
- `created_at`
- `updated_at`
- `deleted_at`

表职责：

- 作为能力包主记录
- 承担顶部摘要区主信息
- 作为其他资产与绑定的根对象

### 4.2 `skill_definitions`

建议保存：

- `id`
- `package_id`
- `skill_key`
- `skill_name`
- `summary`
- `execution_mode`
- `input_schema_json`
- `output_schema_json`
- `created_at`
- `updated_at`

表职责：

- 承担能力定义本身
- 与 `skill_packages` 保持一对一或一对多可扩展关系

### 4.3 `skill_package_versions`

建议保存：

- `id`
- `package_id`
- `version_number`
- `change_log`
- `is_active`
- `snapshot_json`
- `created_by`
- `created_at`

表职责：

- 承担版本管理
- 存储完整快照
- 支撑回滚和版本对比

## 5. 资产表建议

### 5.1 `prompt_assets`

建议保存：

- `id`
- `package_id`
- `prompt_key`
- `prompt_name`
- `prompt_role`
- `content`
- `is_default`
- `version_tag`
- `sort_order`
- `created_at`
- `updated_at`

### 5.2 `reference_assets`

建议保存：

- `id`
- `package_id`
- `reference_key`
- `title`
- `source_type`
- `source_uri`
- `usage_note`
- `applicable_scopes_json`
- `sort_order`
- `created_at`
- `updated_at`

### 5.3 `script_assets`

建议保存：

- `id`
- `package_id`
- `script_key`
- `script_name`
- `runtime`
- `entry`
- `args_schema_json`
- `usage_note`
- `sort_order`
- `created_at`
- `updated_at`

## 6. 绑定表建议

### 6.1 `knowledge_bindings`

建议保存：

- `id`
- `package_id`
- `knowledge_space_id`
- `binding_scope`
- `retrieval_mode`
- `priority`
- `workflow_step_keys_json`
- `created_at`
- `updated_at`

### 6.2 `provider_bindings`

建议保存：

- `id`
- `package_id`
- `provider_type`
- `provider_id`
- `model_name`
- `priority`
- `is_default`
- `fallback_provider_ids_json`
- `model_whitelist_json`
- `created_at`
- `updated_at`

## 7. 覆盖表建议

### 7.1 `brand_skill_package_overrides`

建议保存：

- `id`
- `package_id`
- `brand_id`
- `enabled`
- `prompt_overrides_json`
- `provider_overrides_json`
- `knowledge_overrides_json`
- `created_at`
- `updated_at`

### 7.2 `user_skill_package_overrides`

建议保存：

- `id`
- `package_id`
- `user_id`
- `enabled`
- `prompt_overrides_json`
- `provider_overrides_json`
- `personal_preferences_json`
- `created_at`
- `updated_at`

## 8. 关联表建议

### 8.1 `skill_package_modules`

建议保存：

- `id`
- `package_id`
- `module_key`
- `created_at`

用途：

- 记录能力包挂载到了哪些模块

### 8.2 `skill_package_workflow_steps`

建议保存：

- `id`
- `package_id`
- `workflow_key`
- `step_key`
- `step_order`
- `created_at`

用途：

- 记录能力包参与了哪些工作流步骤

## 9. 索引建议

建议优先加以下索引：

- `skill_packages.package_key` 唯一索引
- `skill_definitions.package_id` 普通索引
- `prompt_assets.package_id + prompt_key` 组合索引
- `provider_bindings.package_id + provider_type + priority` 组合索引
- `skill_package_versions.package_id + version_number` 组合索引
- `brand_skill_package_overrides.package_id + brand_id` 唯一索引
- `user_skill_package_overrides.package_id + user_id` 唯一索引

## 10. 第一阶段最小落地建议

### P0

- `skill_packages`
- `skill_definitions`
- `prompt_assets`
- `provider_bindings`
- `skill_package_versions`
- `skill_package_modules`

### P1

- `reference_assets`
- `script_assets`
- `skill_package_workflow_steps`

### P2

- `knowledge_bindings`
- `brand_skill_package_overrides`
- `user_skill_package_overrides`

## 11. 为什么不建议一开始全 JSON 化

如果第一阶段把所有数据都塞进 `skill_packages.config_json` 这种单字段里，会有几个问题：

- 前端字段和后端结构难以统一
- Prompt、Provider、Version 很难独立管理
- 品牌覆盖和用户覆盖难以扩展
- 后续做查询、筛选、审计和回滚会变重

因此，第一阶段更合理的方案是：

- 主对象独立
- 高频资产独立
- 低频复杂覆盖先 JSON 化存储在覆盖表中

## 12. 最终结论

`SkillPackage` 的拆表重点，不是把表拆得越多越好，而是围绕第一阶段最常用的对象先稳定落地：

- 能力包主表
- Skill 定义表
- Prompt 资产表
- Provider 绑定表
- 版本表
- 模块关联表

这样既能支撑统一技能中心第一阶段上线，也给后续 knowledge、品牌覆盖、用户覆盖留出了扩展空间。
