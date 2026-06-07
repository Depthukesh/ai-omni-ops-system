# 2026-06-07 统一技能中心能力包详情第一批落地

## 背景

- 上一轮已经完成：
  - `SkillPackage` 主数据注册中心
  - `SkillPackageModule`
  - `SkillPackageSkill`
  - `SkillPromptBinding`
  - `GET /admin/skill-packages` 列表摘要聚合
- 但后台“技能中心”中的能力包视角仍停留在列表摘要：
  - 能看到模块、技能数、提示词数和默认模型
  - 还没有真正读取 `GET /admin/skill-packages/:id` 的聚合详情

## 本次改动

### 1. 补 `GET /admin/skill-packages/:id` 详情聚合 first pass

- 修改：
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
- 当前详情接口第一批返回：
  - `package`
  - `skill`
  - `moduleSummaries`
  - `workflowStepSummaries`
  - `prompts`
  - `providerBindings`
  - `versions`
- 同时补了查询参数：
  - `includePrompts`
  - `includeReferences`
  - `includeScripts`
  - `includeKnowledge`
  - `includeProviders`
  - `includeVersions`
  - `includeBrandOverrides`
  - `includeUserOverrides`

### 2. 详情聚合的数据来源

- `package`
  - 来自 `SkillPackage` 主表 / `mock-data`
- `skill`
  - 来自 `SkillPackageSkill -> SkillConfig`
  - 当前先取默认技能或排序第一技能作为主技能摘要
- `prompts`
  - 来自 `SkillPackageSkill -> SkillPromptBinding -> PromptTemplate`
- `providerBindings`
  - 当前第一批先根据技能默认 Provider / 默认模型反推 Provider 摘要
  - 若命中 `ApiProviderConfig` / seed，则补齐 `providerId`、`modelWhitelist`
- `versions`
  - 当前先返回 `currentVersionId` 对应的“当前版本占位摘要”
  - 为后续正式 `SkillPackageVersion` 域落地预留位置

### 3. 后台能力包面板升级为详情视角

- 修改：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`
- 当前效果：
  - 点击能力包列表行可切换当前选中能力包
  - 右侧面板会异步读取详情接口
  - 当前展示：
    - 能力包基础摘要
    - 主技能
    - Prompt 资产
    - Provider 绑定
    - 版本摘要
    - 工作流步骤摘要
- 原有技能目录树编辑区保持不变，不影响现有技能中心操作

## 当前边界

- 本轮仍是 detail first pass：
  - `references`
  - `scripts`
  - `knowledgeBindings`
  - `brandOverrides`
  - `userOverrides`
  仍只保留 include 参数和空集合占位
- `versions` 当前仍是“当前版本摘要占位”，不是正式版本表
- `providerBindings` 当前仍是基于技能默认模型和 Provider 注册表做的第一批推导，不是正式 ProviderPolicy 绑定域

## 影响范围

- 后端：
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
- 前端：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`
- 文档：
  - `docs/database-archive.md`
  - 本文件

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
