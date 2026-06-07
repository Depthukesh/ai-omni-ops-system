# AI全域运营系统 SkillPackage 与 ModuleDefinition 关系表草案 v1

## 1. 文档目的

本文档用于把能力包与模块之间的挂载关系继续下钻成关系表草案，用于：

- 指导 `SkillPackage` 与 `ModuleDefinition` 的关联设计
- 指导模块默认能力包绑定落地
- 指导模块反查能力包、能力包反查模块

## 2. 关系定位

`SkillPackage` 与 `ModuleDefinition` 的关系，本质上是多对多关系：

- 一个模块可以挂多个能力包
- 一个能力包也可以复用到多个模块

因此不建议直接把所有关系都写死在某一侧的单字段里。

更合理的方式是使用独立关系表。

## 3. 关系表名称建议

建议关系表命名为：

```text
skill_package_modules
```

## 4. 字段草案

| 字段名 | 类型建议 | 必填级别 | 说明 |
|---|---|---|---|
| `id` | `string` | 必填 | 主键 |
| `packageId` | `string` | 必填 | 对应 `SkillPackage.id` |
| `moduleKey` | `string` | 必填 | 对应 `ModuleDefinition.moduleKey` |
| `bindingType` | `enum` | 必填 | 绑定类型 |
| `isDefault` | `boolean` | 推荐 | 是否默认挂载 |
| `sortOrder` | `number` | 推荐 | 展示和执行顺序 |
| `enabled` | `boolean` | 推荐 | 当前绑定是否启用 |
| `remarks` | `string` | 扩展 | 备注 |
| `createdAt` | `datetime` | 自动 | 创建时间 |
| `updatedAt` | `datetime` | 自动 | 更新时间 |

## 5. `bindingType` 推荐枚举

| 枚举值 | 含义 |
|---|---|
| `DEFAULT` | 模块默认绑定的能力包 |
| `OPTIONAL` | 模块可选能力包 |
| `SYSTEM_REQUIRED` | 模块强依赖能力包 |
| `EXPERIMENTAL` | 试验性挂载 |

## 6. 关系表职责

这张表建议承担四个职责：

- 记录模块挂载了哪些能力包
- 标识哪些是默认能力包
- 标识哪些是强依赖能力包
- 提供排序和启用状态

## 7. 与模块注册表的关系

`ModuleDefinition` 里已有：

- `defaultSkillPackages`

第一阶段建议这样处理：

- `defaultSkillPackages` 继续保留，作为模块定义中的摘要字段
- 真正可查询、可管理、可排序的挂载关系，以 `skill_package_modules` 为准

也就是说：

- `ModuleDefinition.defaultSkillPackages` = 便于展示和初始化
- `skill_package_modules` = 真实关系表

## 8. 查询方向建议

### 8.1 从模块反查能力包

适用场景：

- 打开模块配置页
- 查看某个工作台默认挂了哪些能力包
- 模块初始化时装配默认能力包

建议字段输出：

- `moduleKey`
- `packageId`
- `packageKey`
- `packageName`
- `bindingType`
- `isDefault`
- `enabled`
- `sortOrder`

### 8.2 从能力包反查模块

适用场景：

- 打开统一技能中心详情页
- 查看一个能力包被哪些模块复用
- 评估某个能力包的改动影响范围

建议字段输出：

- `packageId`
- `moduleKey`
- `moduleName`
- `moduleType`
- `entryRoute`
- `bindingType`
- `isDefault`

## 9. 数据落地建议

建议增加以下约束：

- `packageId + moduleKey + bindingType` 唯一约束
- `packageId` 普通索引
- `moduleKey` 普通索引
- `moduleKey + isDefault` 组合索引

如果后续一个模块只允许一个默认能力包，也可以再加业务约束：

- `moduleKey + isDefault=true` 只能存在一条

但第一阶段建议不要过早限制死，先允许一个模块挂多个默认能力包。

## 10. 第一阶段最小落地方式

### P0

- 建 `skill_package_modules` 表
- 支持 `DEFAULT` 绑定
- 支持模块反查能力包
- 支持能力包反查模块

### P1

- 支持 `OPTIONAL`
- 支持排序
- 支持启用停用

### P2

- 支持 `SYSTEM_REQUIRED`
- 支持 `EXPERIMENTAL`
- 支持更多挂载策略和灰度规则

## 11. 示例数据草案

```ts
const relations = [
  {
    packageId: "sp_wechat_article_generator",
    moduleKey: "wechat-workbench",
    bindingType: "DEFAULT",
    isDefault: true,
    sortOrder: 10,
    enabled: true,
  },
  {
    packageId: "sp_wechat_image_designer",
    moduleKey: "wechat-workbench",
    bindingType: "DEFAULT",
    isDefault: true,
    sortOrder: 20,
    enabled: true,
  },
  {
    packageId: "sp_wechat_html_renderer",
    moduleKey: "wechat-workbench",
    bindingType: "SYSTEM_REQUIRED",
    isDefault: true,
    sortOrder: 30,
    enabled: true,
  },
];
```

## 12. 与统一技能中心的对应关系

统一技能中心详情页里的“所属模块”字段，不建议直接靠 `defaultSkillPackages` 反推。

更合理的是：

- 直接查 `skill_package_modules`
- 再关联 `ModuleDefinition`

这样后续支持：

- 多模块复用
- 默认挂载与可选挂载并存
- 影响范围分析

## 13. 最终结论

`SkillPackage` 和 `ModuleDefinition` 之间，第一阶段最值得尽快落地的，不是更复杂的能力编排，而是先把一张干净、可查询、可管理的关系表立起来。

只要关系表先落地，后面的：

- 模块默认能力包绑定
- 技能中心所属模块展示
- 模块配置页反查能力包

就都会顺很多。
