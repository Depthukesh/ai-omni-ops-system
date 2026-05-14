# 2026-05-14 个人中心技能中心精简编辑区与动态模型下拉

## 1. 变更背景

- 用户要求个人中心 `/personal-center/skills` 中，同一个技能不要再出现上下两块重复编辑区
- 用户要求把“提示词模型”改成下拉框，而不是继续手填
- 用户要求下拉默认跟随后台当前选择的大模型，同时允许用户在可用模型之间切换

## 2. 本次目标

- 收口个人中心技能编辑区，只保留一层主编辑区
- 为提示词模型提供动态下拉选项
- 保证下拉默认值与后台当前激活 Provider 的默认模型保持一致

## 3. 本次修改

### 3.1 后端

- 更新 `apps/server/src/modules/user-skills/user-skills.service.ts`
- 新增 `getEditorOptions()`，汇总当前激活 `ApiProviderConfig` 的 `defaultModel + modelWhitelist`
- 更新 `apps/server/src/modules/user-skills/user-skills.controller.ts`
- 新增 `GET /api/user-skills/editor-options`
- 更新 `apps/server/src/modules/user-skills/user-skills.module.ts`
- 注入 `ApiProvidersModule`，让个人中心技能页不再写死模型列表

### 3.2 前端

- 更新 `apps/web/src/services/personal-center.ts`
- 新增 `getUserSkillEditorOptions()`，读取后端动态模型选项
- 更新 `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
- 页面加载时并行读取 `/api/user-skills` 与 `/api/user-skills/editor-options`
- `提示词模型` 改为 `select`，选项来自后端动态下发
- 当前值优先使用用户有效值，未覆盖时默认显示后台平台模型
- 右侧技能详情区继续收口，移除重复摘要块，只保留技能标题、保存/重置操作和下方提示词编辑卡

## 4. 验证结果

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx` 无报错
- `npm --workspace apps/web run build` 通过
- `npm --workspace apps/server run build` 通过

## 5. 风险与后续

- 当前个人中心模型下拉会汇总所有激活文本 Provider 的模型白名单；如果后续需要按单个技能的 `runtimeKey` 再继续收窄选项，需要在 `editor-options` 中补技能维度过滤
- 当前仅精简了个人中心右侧编辑区，不影响后台平台技能中心的基线维护方式
