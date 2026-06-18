# 2026-06-18 Skill Center Built-in Input Seeds Phase 9D

## 背景

- `Phase 9B/9C` 已经把技能输入项升级为结构化字段，并让安装器支持写入 `inputSchemaJson`。
- 但系统里有一批更早存在的核心内置技能，并不是通过安装器导入的。
- 这些技能原始数据通常只有一段简短描述，没有：
  - `inputSchemaJson`
  - 旧版 `数据库参数 / 知识库参数 / 自定义输入参数` 描述块
- 结果就是：后台页面虽然已支持结构化输入，但这批老技能仍会显示“输入配置来源：未配置”。

## 本次改动

### 1. 为核心内置技能补默认结构化输入

- 更新：
  - `apps/server/src/common/mock-data.ts`
  - `apps/web/src/services/admin.ts`

为以下核心内置技能补上默认 `inputSchemaJson`：

- `brand-omni-growth-analysis`
- `enterprise-annual-plan`
- `xiaohongshu-brand-marketing-plan`
- `tongcheng-brand-douyin-planning`
- `wechat-article-composer`
- `wechat-html-renderer`

默认输入项覆盖：

- 数据库参数
- 知识库参数
- 自定义输入参数

用途：

- 新环境初始化时，这批技能会直接拥有默认结构化输入
- 后台技能中心打开后即可看到对应输入项

### 2. 为现有环境补启动回填

- 更新：
  - `apps/server/src/modules/admin/skills-prompts.service.ts`

新增回填逻辑：

- 在已有 `backfillLegacySkillInputSchemas()` 之后
- 对仍然没有 `inputSchemaJson` 的技能：
  - 按 `slug` 匹配内置默认输入 schema
  - 自动写入 `SkillConfig.inputSchemaJson`

这样已有数据库中的老技能，不需要重新安装，也可以在服务启动后自动补齐默认输入项。

## 影响范围

- 仅影响技能治理域中的核心内置技能输入配置
- 不影响：
  - 其他业务工作台
  - 已通过安装器安装的技能输入 schema
  - Prompt 模板结构

## 为什么之前页面还是空的

- 因为你看到的技能属于更早的内置技能，不是新安装技能
- 它原本没有 `inputSchemaJson`
- 也没有旧描述块可供自动迁移
- 所以在本轮补齐默认输入 schema 之前，页面显示为空是符合当前数据状态的

## 生效方式

- 对新环境：初始化时直接带默认结构化输入
- 对已有环境：服务启动后会执行内置技能输入 schema 回填

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/services/admin.ts`
- `npm run build:web`
- `npm run build:server`

## 当前阶段进度

- 已完成 Phase 9A：真实 `references/scripts` 安装同步
- 已完成 Phase 9B：技能真实输入项结构化同步
- 已完成 Phase 9C：安装器输入 schema 解析与来源提示
- 已完成 Phase 9D：核心内置技能默认输入 schema 回填

## 后续建议

- 继续补充更多核心技能的默认输入 schema
- 为后台增加“立即回填内置技能输入配置”的管理动作，减少必须依赖服务重启的感知成本
