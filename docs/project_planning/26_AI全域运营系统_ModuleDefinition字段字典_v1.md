# AI全域运营系统 ModuleDefinition 字段字典 v1

## 1. 文档目的

本文档用于把《模块注册规范 v1》中的 `ModuleDefinition` 进一步落成字段字典，便于后续：

- 做模块注册样例
- 做注册后台
- 做模块接入校验

## 2. 字段字典

| 字段名 | 类型建议 | 必填级别 | 说明 |
|---|---|---|---|
| `moduleKey` | `string` | 必填 | 模块全局唯一标识 |
| `moduleName` | `string` | 必填 | 模块展示名称 |
| `moduleType` | `enum` | 必填 | 模块类型，如 `WORKBENCH` |
| `moduleStatus` | `enum` | 必填 | 模块状态，如 `ACTIVE` |
| `entryRoute` | `string` | 必填 | 模块主入口路由 |
| `icon` | `string` | 推荐 | 模块图标标识 |
| `sortOrder` | `number` | 推荐 | 排序权重 |
| `description` | `string` | 推荐 | 模块描述 |
| `requiredPermissions` | `string[]` | 必填 | 访问该模块所需权限 |
| `featureFlags` | `string[]` | 必填 | 功能开关标识 |
| `isPlatformVisible` | `boolean` | 推荐 | 平台端是否可见 |
| `isBrandVisible` | `boolean` | 推荐 | 品牌端是否可见 |
| `isAdminVisible` | `boolean` | 推荐 | 管理端是否可见 |
| `requiredCapabilities` | `string[]` | 必填 | 所依赖的领域能力或底座能力 |
| `requiredProviders` | `string[]` | 推荐 | 所依赖的 Provider 类型 |
| `requiredTables` | `string[]` | 推荐 | 所依赖的业务表 |
| `requiredStorages` | `string[]` | 扩展 | 所依赖的存储能力 |
| `requiredThirdPartyPlatforms` | `string[]` | 扩展 | 所依赖的第三方平台 |
| `taskTypes` | `string[]` | 必填 | 模块可能产生的任务类型 |
| `mediaTypes` | `string[]` | 推荐 | 模块可能生成的媒体类型 |
| `workflowTypes` | `string[]` | 推荐 | 模块所参与的工作流类型 |
| `publishTargets` | `string[]` | 扩展 | 模块可发布到的目标 |
| `defaultSkillPackages` | `string[]` | 推荐 | 默认绑定的能力包 |
| `defaultKnowledgeSpaces` | `string[]` | 扩展 | 默认绑定的知识空间 |
| `defaultProviderPolicies` | `string[]` | 扩展 | 默认绑定的 Provider 策略 |

## 3. `moduleType` 推荐枚举

| 枚举值 | 含义 |
|---|---|
| `WORKBENCH` | 用户直接使用的业务工作台 |
| `DOMAIN` | 可复用的领域能力模块 |
| `PLATFORM_CORE` | 平台底座能力 |
| `ADMIN_TOOL` | 后台管理工具 |
| `EXTERNAL_BRIDGE` | 外部系统或外挂桥接模块 |

## 4. `moduleStatus` 推荐枚举

| 枚举值 | 含义 |
|---|---|
| `PLANNING` | 规划中 |
| `ACTIVE` | 启用中 |
| `DISABLED` | 已停用 |
| `ARCHIVED` | 已归档 |

## 5. 必填级别说明

### 必填

没有这些字段，就无法形成完整模块定义：

- `moduleKey`
- `moduleName`
- `moduleType`
- `moduleStatus`
- `entryRoute`
- `requiredPermissions`
- `featureFlags`
- `requiredCapabilities`
- `taskTypes`

### 推荐

建议第一阶段尽量补齐：

- `icon`
- `sortOrder`
- `description`
- `requiredProviders`
- `requiredTables`
- `mediaTypes`
- `workflowTypes`
- `defaultSkillPackages`

### 扩展

允许在后续阶段逐步补充：

- `requiredStorages`
- `requiredThirdPartyPlatforms`
- `publishTargets`
- `defaultKnowledgeSpaces`
- `defaultProviderPolicies`

## 6. 填写规则建议

- `moduleKey` 使用英文短横线命名，如 `wechat-workbench`
- `moduleName` 使用面向用户的中文名称
- `requiredCapabilities` 优先写领域能力，不写底层实现细节
- `taskTypes`、`mediaTypes`、`workflowTypes` 都应与后续真实对象对齐

## 7. 第一阶段使用方式

第一阶段建议直接用这个字段字典去做：

- 模块注册样例
- 新模块接入模板
- 后续注册后台表单草稿

## 8. 最终结论

字段字典的价值在于：

- 让模块注册不再停留在概念层
- 让后续样例和开发对齐同一份字段说明
- 让模块接入真正具备标准化基础
