# AI全域运营系统 ModuleDefinition 注册后台表单字段草案 v1

## 1. 文档目的

本文档用于把《ModuleDefinition 注册表草案 v1》进一步落成后台录入表单字段草案，用于：

- 指导模块注册后台页面设计
- 指导前后端字段命名统一
- 指导第一阶段模块录入和校验规则

## 2. 页面定位

该表单面向后台“模块注册中心”。

建议支持两种模式：

- 新建模块
- 编辑模块

第一阶段先不追求复杂批量导入，优先把单模块录入、查看、编辑流程跑通。

## 3. 表单分区建议

建议分成以下 6 个区域：

1. 基本信息
2. 展示与可见性
3. 权限与依赖
4. 任务与流程
5. 默认绑定
6. 审计与备注

## 4. 基本信息区字段

| 字段名 | 展示名称 | 控件建议 | 必填级别 | 说明 |
|---|---|---|---|---|
| `moduleKey` | 模块标识 | 单行输入框 | 必填 | 全局唯一，英文短横线命名 |
| `moduleName` | 模块名称 | 单行输入框 | 必填 | 面向用户的中文名称 |
| `moduleType` | 模块类型 | 下拉框 | 必填 | `WORKBENCH` / `DOMAIN` / `ADMIN_TOOL` 等 |
| `moduleStatus` | 模块状态 | 下拉框 | 必填 | `PLANNING` / `ACTIVE` / `DISABLED` / `ARCHIVED` |
| `entryRoute` | 入口路由 | 单行输入框 | 必填 | 如 `/wechat` |
| `description` | 模块说明 | 多行文本框 | 推荐 | 说明模块用途 |
| `icon` | 图标标识 | 单行输入框 | 推荐 | 前端图标 key |
| `sortOrder` | 排序权重 | 数字输入框 | 推荐 | 菜单和列表排序 |

## 5. 展示与可见性区字段

| 字段名 | 展示名称 | 控件建议 | 必填级别 | 说明 |
|---|---|---|---|---|
| `isPlatformVisible` | 平台端可见 | 开关 | 推荐 | 平台后台是否显示 |
| `isBrandVisible` | 品牌端可见 | 开关 | 推荐 | 品牌侧是否显示 |
| `isAdminVisible` | 管理端可见 | 开关 | 推荐 | 管理台是否显示 |
| `featureFlags` | 功能开关 | 标签输入 / 多选 | 必填 | 功能控制标识 |

## 6. 权限与依赖区字段

| 字段名 | 展示名称 | 控件建议 | 必填级别 | 说明 |
|---|---|---|---|---|
| `requiredPermissions` | 所需权限 | 标签输入 / 多选 | 必填 | 访问模块所需权限 |
| `requiredCapabilities` | 依赖能力域 | 标签输入 / 多选 | 必填 | 如 `copy-domain`、`publish-domain` |
| `requiredProviders` | 依赖 Provider 类型 | 标签输入 / 多选 | 推荐 | 如 `text`、`image` |
| `requiredTables` | 依赖数据表 | 标签输入 / 多选 | 推荐 | 模块依赖的核心表 |
| `requiredStorages` | 依赖存储能力 | 标签输入 / 多选 | 扩展 | 如 `oss` |
| `requiredThirdPartyPlatforms` | 第三方平台依赖 | 标签输入 / 多选 | 扩展 | 如 `wechat-official-account` |

## 7. 任务与流程区字段

| 字段名 | 展示名称 | 控件建议 | 必填级别 | 说明 |
|---|---|---|---|---|
| `taskTypes` | 任务类型 | 标签输入 / 多选 | 必填 | 模块可能产生的任务类型 |
| `mediaTypes` | 媒体类型 | 标签输入 / 多选 | 推荐 | 模块可能生成的媒体类型 |
| `workflowTypes` | 工作流类型 | 标签输入 / 多选 | 推荐 | 模块参与的工作流 |
| `publishTargets` | 发布目标 | 标签输入 / 多选 | 扩展 | 模块可发布到的目标 |

## 8. 默认绑定区字段

| 字段名 | 展示名称 | 控件建议 | 必填级别 | 说明 |
|---|---|---|---|---|
| `defaultSkillPackages` | 默认能力包 | 多选下拉 | 推荐 | 默认挂载的能力包 |
| `defaultKnowledgeSpaces` | 默认知识空间 | 多选下拉 | 扩展 | 默认知识空间绑定 |
| `defaultProviderPolicies` | 默认 Provider 策略 | 多选下拉 | 扩展 | 默认 Provider 治理策略 |

## 9. 审计与备注区字段

| 字段名 | 展示名称 | 控件建议 | 必填级别 | 说明 |
|---|---|---|---|---|
| `phasePriority` | 阶段优先级 | 下拉框 | 推荐 | `P0` / `P1` / `P2` |
| `remarks` | 备注 | 多行文本框 | 推荐 | 补充说明 |
| `createdAt` | 创建时间 | 只读文本 | 自动 | 系统生成 |
| `updatedAt` | 更新时间 | 只读文本 | 自动 | 系统生成 |

## 10. 校验规则建议

### 10.1 强校验

- `moduleKey` 必须唯一
- `moduleKey` 只能使用英文小写、数字和短横线
- `moduleName` 不能为空
- `moduleType` 不能为空
- `moduleStatus` 不能为空
- `entryRoute` 必须以 `/` 开头
- `requiredCapabilities` 不能为空
- `requiredPermissions` 不能为空
- `taskTypes` 不能为空

### 10.2 业务校验

- `ADMIN_TOOL` 类型模块的 `entryRoute` 应优先以 `/admin/` 开头
- 如果填了 `publishTargets`，建议同步填写 `requiredThirdPartyPlatforms`
- 如果填了 `defaultSkillPackages`，这些能力包应可在技能中心中查询到
- `featureFlags` 与前端功能开关命名需保持一致

## 11. 第一阶段页面交互建议

建议支持：

- 保存草稿
- 发布启用
- 停用模块
- 复制模块定义
- 查看依赖摘要

不建议第一阶段先做：

- 批量导入
- 批量修改
- 可视化依赖图拖拽编辑

## 12. 第一阶段最小表单集合

### P0

- 基本信息
- 权限与依赖
- 任务与流程
- 默认能力包绑定

### P1

- 展示与可见性
- 审计与备注

### P2

- 默认知识空间
- 默认 Provider 策略
- 更多发布目标配置

## 13. 与其他文档的关系

### 对应 `ModuleDefinition` 字段字典

- 本文档是字段字典的表单化表达

### 对应模块注册表草案

- 本文档定义如何录入注册表里的每一条记录

### 对应统一技能中心

- `defaultSkillPackages` 是模块和能力包之间最直接的挂点

## 14. 最终结论

`ModuleDefinition` 注册后台表单的第一阶段目标，不是做一个很重的配置平台，而是先做一个能稳定录入、查看、编辑模块定义的标准化页面。

只要先把：

- 基本信息
- 权限与依赖
- 任务与流程
- 默认能力包绑定

这四块跑通，模块注册机制就已经可以真正落地。
