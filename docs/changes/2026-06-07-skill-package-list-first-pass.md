# 2026-06-07 统一技能中心能力包列表第一批落地

## 背景

- 上一轮已经完成：
  - `SkillPackage` 主数据注册中心
  - `SkillPackageModule`
  - `SkillPackageSkill`
  - `SkillPromptBinding`
- 但后台“技能中心”仍主要是技能目录树视角：
  - 可以按技能项维护
  - 也能看见所属模块 / 能力包
  - 但还没有按规划文档提供统一的“能力包列表视角”

## 本次改动

### 1. 补 `GET /admin/skill-packages` 列表摘要聚合

- 修改：
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
- 当前列表接口在第一批返回以下摘要字段：
  - `moduleSummaries`
  - `currentVersionNumber`
  - `defaultProviderSummary`
  - `brandOverrideCount`
  - `userOverrideCount`
  - `promptCount`
  - `skillCount`

### 2. 列表筛选第一批支持

- 当前已支持：
  - `keyword`
  - `moduleKey`
  - `status`
  - `scope`
- 其中：
  - `moduleKey` 会结合 `SkillPackageModule` 关系和 `SkillPackage.moduleKeys` 摘要字段一起过滤
  - `promptCount` 基于 `SkillPackageSkill -> SkillPromptBinding` 进行统计

### 3. 新增后台“能力包摘要视图”

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`
- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/services/admin.ts`
- 当前效果：
  - 在后台“技能中心”页签上方新增能力包摘要面板
  - 能从能力包视角查看：
    - 所属模块
    - 技能数
    - 提示词数
    - 默认 Provider / 默认模型
    - 当前版本 ID
  - 同时保留现有技能目录树，不破坏之前的技能中心编辑能力

## 当前效果

- 后台“技能中心”开始有两层视角：
  - 能力包摘要视角
  - 技能目录编辑视角
- 这样第一阶段已经开始从“技能零件管理”往“统一技能中心”过渡。

## 当前边界

- 本轮只完成列表摘要视图 first pass。
- 还没有完成：
  - `GET /admin/skill-packages/:id` 的完整详情聚合
  - Prompt / Provider / 版本页签聚合详情
  - `SkillPackageVersion`、diff、activate-version

## 影响范围

- 后端：
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
- 前端：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 文档：
  - `docs/database-archive.md`
  - 本文件

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/services/admin.ts`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
