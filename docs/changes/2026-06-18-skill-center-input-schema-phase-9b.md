# 2026-06-18 Skill Center Input Schema Phase 9B

## 背景

- 技能中心此前的 `databaseInputs / knowledgeInputs / customInputs` 只存在于前端描述层。
- 真实保存时，三类输入项会被拼进 `SkillConfig.description` 文本，再在页面读取时反解析回来。
- 这种做法会带来三个问题：
  - 后端没有结构化真源，输入项无法作为正式技能配置管理。
  - 描述文案与输入项协议耦合，人工改文案容易导致解析失败。
  - 新老数据无法明确区分哪些是真实输入配置，哪些只是描述文本。

## 本次改动

### 1. 为技能配置增加结构化输入字段

- 更新：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260618_skill_input_schema_first_pass/migration.sql`

新增字段：

- `SkillConfig.inputSchemaJson Json?`

用途：

- 作为技能真实输入项的后端结构化真源
- 存储三类输入项：
  - `databaseInputs`
  - `knowledgeInputs`
  - `customInputs`

### 2. 后端技能服务支持读写 inputSchemaJson

- 更新：
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/common/mock-data.ts`

改动内容：

- 技能创建、更新和列表返回现在都支持 `inputSchemaJson`
- `SkillConfig` 引导建表逻辑会自动补齐 `inputSchemaJson` 列
- 本地 seed 数据类型也补上了结构化输入字段定义

### 3. 自动把旧 description 协议回填到结构化字段

- 在技能注册表 bootstrap 阶段，后端会扫描：
  - `inputSchemaJson IS NULL`
  - 但 `description` 中仍包含旧输入项块的技能

回填逻辑：

- 解析旧的：
  - `数据库参数：`
  - `知识库参数：`
  - `自定义输入参数：`
- 成功解析后，自动写入 `inputSchemaJson`

这样历史技能无需人工逐条打开再保存，就能逐步迁移到结构化真源。

### 4. 前端技能中心优先读取结构化输入

- 更新：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/app/(dashboard)/admin/skill-center-persistence.ts`

当前做法：

- 页面构建技能草稿时：
  - 优先读取 `inputSchemaJson`
  - 若没有，再回退到旧 `description` 解析
- 页面保存技能时：
  - 继续保留可读性的 `description`
  - 同时把三类输入项写入 `inputSchemaJson`

这样兼顾了：

- 旧链路兼容
- 新结构化真源落地
- 页面展示与编辑行为保持稳定

## 影响范围

- 仅影响技能治理域：
  - 技能配置后台
  - 技能注册表后端
  - 技能输入项持久化逻辑
- 不影响：
  - 其他业务工作台
  - Prompt 模板结构
  - 知识库表结构
  - 既有技能输入编辑交互方式

## 兼容策略

- 读取优先级：
  - `inputSchemaJson`
  - `description` 旧协议 fallback
- 保存策略：
  - `inputSchemaJson` 作为真实结构化真源
  - `description` 继续保留摘要和兼容块
- 历史数据：
  - 通过 bootstrap 回填逻辑自动迁移一部分旧记录

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/app/(dashboard)/admin/skill-center-persistence.ts`
  - `apps/web/src/services/admin.ts`
- `npm run build:web`
- `npm run build:server`

## 当前阶段进度

- 已完成 Phase 9A：真实 `references/scripts` 安装同步打通
- 已完成 Phase 9B：技能真实输入项结构化同步第一步

## 后续建议

- 下一步可继续做：
  - 为技能安装器定义显式输入 schema 解析规范
  - 避免新安装技能只能依赖描述摘要而没有结构化输入定义
  - 在后台增加“输入 schema 来源”提示，区分结构化同步与旧描述回填
