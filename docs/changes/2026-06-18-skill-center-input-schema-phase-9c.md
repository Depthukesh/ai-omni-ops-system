# 2026-06-18 Skill Center Input Schema Phase 9C

## 背景

- `Phase 9B` 已经把技能输入项从 `description` 文本协议升级为 `SkillConfig.inputSchemaJson`。
- 但新安装技能时，安装器仍主要生成 `inputHints` 摘要，并不会主动写入真实输入 schema。
- 同时后台页面虽然已经能读取 `inputSchemaJson`，但还缺少清晰的来源提示，无法区分：
  - 安装器结构化解析
  - 旧描述协议迁移
  - 后台手工编辑

## 本次改动

### 1. 安装器直接生成真实输入 schema

- 更新：
  - `apps/server/src/modules/admin/skill-installer.service.ts`

新增能力：

- 安装技能时会从 `SKILL.md` 中尝试解析输入相关段落
- 优先按标题关键字识别：
  - 数据库输入
  - 知识库输入
  - 自定义输入
- 如果没有显式输入段落，就会将 `inputHints` 退化为自定义输入项，避免新安装技能完全丢失结构化输入

写入结果：

- 安装器现在会在创建技能时直接写入 `inputSchemaJson`
- 来源标记为：
  - `INSTALLER_PARSED`

### 2. 输入 schema 来源支持追踪

- 更新：
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/services/admin.ts`

`inputSchemaJson` 现在支持 `source` 字段，当前约定包括：

- `INSTALLER_PARSED`
- `DESCRIPTION_MIGRATED`
- `ADMIN_EDITED`

用途：

- 后端可以保留结构化输入的真实来源
- 前端可以准确提示当前技能输入配置来自哪条链路

### 3. 后台技能配置页增加输入来源提示

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

页面现在会显示：

- `结构化同步：安装器解析`
- `兼容迁移：旧描述回填`
- `结构化同步：后台编辑`
- `兼容读取：描述协议解析`
- `未配置`

这样可以直接判断当前输入项是否已经进入真实结构化配置链路。

### 4. 安装成功提示补充结构化输入摘要

- 更新：
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`

安装成功后会额外提示：

- 结构化输入条目数量
- 数据库 / 知识库 / 自定义输入的解析结果

## 影响范围

- 本次仍只影响技能治理域：
  - 技能安装器
  - 技能配置后台
  - 输入 schema 追踪与提示
- 不影响：
  - 其他业务工作台
  - Prompt 模板结构
  - 知识库主数据结构

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skill-installer.service.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`
- `npm run build:web`
- `npm run build:server`

## 当前阶段进度

- 已完成 Phase 9A：真实 `references/scripts` 安装同步打通
- 已完成 Phase 9B：技能真实输入项结构化同步第一步
- 已完成 Phase 9C：安装器真实输入 schema 解析与来源提示

## 后续建议

- 后续可以继续把安装器输入解析做成更明确的协议：
  - 例如在 `SKILL.md` 里支持专门的输入 schema 区块
  - 避免只能依赖关键词推断
- 也可以补一个后台“输入 schema 校验/预览”区，帮助运营确认安装解析结果是否符合预期
