# 2026-06-18 Skill Center Backfill Input Action Phase 9E

## 背景

- `Phase 9D` 已为核心内置技能补上默认结构化输入 schema，并在服务启动时支持自动回填。
- 但在线上或已有环境里，用户仍可能遇到两个现实问题：
  - 当前环境还没有重启，自动回填尚未执行
  - 用户希望立刻让当前技能出现输入项，而不是等待下一次部署或服务重启

## 本次改动

### 1. 新增后台一键回填接口

- 更新：
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`

新增接口：

- `POST /admin/skills/:id/backfill-input-schema`

行为：

- 先读取当前技能
- 如果该技能已有 `inputSchemaJson`，直接返回当前结果
- 如果为空，则按以下顺序补齐：
  - 优先使用内置技能默认输入 schema
  - 再 fallback 到旧描述协议解析
- 成功后立即返回更新后的技能记录

### 2. 后台技能配置页新增“补齐输入项”入口

- 更新：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

新增交互：

- 在“输入配置来源”旁边新增 `补齐输入项` 按钮
- 点击后会调用新的后台接口
- 成功后会立即刷新：
  - 当前技能配置
  - 当前技能草稿

这样无需等待服务重启，老技能也可以即时出现默认输入项。

### 3. 本地演示数据 fallback

- 如果当前运行在 seed fallback 模式：
  - 前端会直接从本地 `skillConfigSeed` 中读取默认结构化输入
  - 仍然可以完成“补齐输入项”的体验闭环

## 影响范围

- 仅影响技能治理后台
- 不影响：
  - 其他业务工作台
  - Prompt 模板结构
  - 安装器主流程

## 使用方式

- 打开后台技能配置页
- 选中一个当前显示“输入配置来源：未配置”的技能
- 点击 `补齐输入项`
- 成功后页面会立即刷新当前技能输入项

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/services/admin.ts`
- `npm run build:server`
- `npm run build:web`

## 当前阶段进度

- 已完成 Phase 9A：真实 `references/scripts` 安装同步
- 已完成 Phase 9B：技能真实输入项结构化同步
- 已完成 Phase 9C：安装器输入 schema 解析与来源提示
- 已完成 Phase 9D：核心内置技能默认输入 schema 回填
- 已完成 Phase 9E：后台一键回填输入项动作

## 后续建议

- 下一步可以继续做：
  - “批量补齐所有内置技能输入项”管理动作
  - “输入 schema 预览 / 校验”辅助面板
  - 更显式的 `SKILL.md` 输入 schema 协议解析
