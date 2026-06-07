# 2026-06-07 SkillPackage Prompt First Pass

## 本次改动

- 在 `SkillPackagesModule` 中引入 `SkillsPromptsModule`，让能力包域直接复用现有 Prompt 中心服务。
- 在 `SkillPackagesService` 中新增能力包维度 Prompt 更新能力：
  - 新增 `PATCH /admin/skill-packages/:packageId/prompts/:promptId`
  - 更新前先校验 Prompt 是否归属于当前能力包
  - 复用 `SkillsPromptsService.updatePrompt()` 持久化 `PromptTemplate`
- 能力包详情里的 `prompts` 返回结构补充：
  - `status`
  - `modelName`
  - `temperature`
  - `maxTokens`
- 后台统一技能中心 `skill-package-overview-panel` 中的 Prompt 区块从只读摘要升级为可编辑区：
  - 支持编辑状态、模型、Temperature、Max Tokens、Prompt 内容
  - 支持逐条保存并在保存后回刷能力包详情

## 影响范围

- 不新增数据库表，不改动现有前台业务流程。
- Prompt 真源仍然是 `PromptTemplate`，本轮只是把能力包详情页接到现有真源写接口。
- 若数据库不可用，仍沿用既有 `mock-data + Prompt 文件` 兜底读取策略；更新动作继续复用 Prompt 中心已有逻辑。

## 校验

- `GetDiagnostics`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
