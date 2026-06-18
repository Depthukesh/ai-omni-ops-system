# 2026-06-18 Skill Center Modularization Phase 1

## 背景

- 技能模块已经具备 `SkillPackage`、`SkillPromptBinding`、`ReferenceAsset`、`ScriptAsset` 等真源能力，但前端仍存在两类收口不完整的问题：
  - 技能清单定义仍位于 `apps/web` 页面目录下，被后台、个人中心、设计工作台共同依赖。
  - 技能安装流程中的辅助逻辑直接堆在超大文件 `admin-page-client.tsx` 中，页面入口承担了过多资产导入编排。
- 这会让技能模块继续扩展时更容易出现：
  - 共享清单修改需要在页面层处理，边界不清晰。
  - 技能安装链路难以复用、难以验证，也不利于后续继续拆后台技能中心。

## 本次改动

### 1. 技能清单定义收口到共享包

- 新增：
  - `packages/shared/src/skill-center-manifest.ts`
- 更新：
  - `packages/shared/src/index.ts`
  - `apps/web/src/app/(dashboard)/skill-center-config.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
  - `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`

当前做法：

- 把原本位于 `apps/web/src/app/(dashboard)/skill-center-config.ts` 的 `SKILL_CENTER_TREE` 和 `flattenSkillCenterLeaves()` 提升到 `packages/shared`。
- 保留原页面目录下的 `skill-center-config.ts` 作为兼容导出层，避免一次性打断已有引用。
- 后台、个人中心、设计工作台改为直接从 `@shared/skill-center-manifest` 读取共享定义。

目的：

- 让技能清单从页面层抽离，成为真正的共享能力，而不是某个页面的附属配置。
- 为后续把更多技能中心映射、筛选、搜索辅助逻辑继续收口到共享层打基础。

### 2. 技能安装辅助逻辑拆出后台超大页面

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`
- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

当前做法：

- 把以下技能安装辅助逻辑从 `admin-page-client.tsx` 拆到独立模块：
  - `InstallSkillDraft`
  - `buildInstallSkillDraft()`
  - `readFileAsBase64()`
  - `buildInstallSkillRequestPayload()`
  - `resolveInstalledSkillPromptScene()`
  - `resolveInstalledSkillBindingOptions()`
  - `buildPackageIdFromKey()`
  - `importInstalledAssetsToPackage()`
  - `buildInstallSkillNotice()`

目的：

- 页面入口只保留状态编排和 UI 交互。
- 技能安装的请求参数整理、能力包资产导入和成功提示拼装，单独沉到技能安装模块。
- 降低后台技能中心后续继续拆分时的编辑风险。

## 影响范围

- 本次仅影响技能治理域前端结构：
  - 后台技能中心
  - 个人中心技能页
  - 设计工作台中的技能清单依赖
- 不影响：
  - 数据库 schema
  - 后端接口
  - Prompt / Provider 生效逻辑
  - 其他业务工作台运行时结果

## 验证

- `GetDiagnostics`
  - `packages/shared/src/skill-center-manifest.ts`
  - `packages/shared/src/index.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
  - `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
- `npm run build:web`

## 后续建议

- 第二阶段可以继续把后台技能中心内与安装、绑定、筛选相关的更多状态编排拆到独立 hook / module。
- 第三阶段再考虑把技能中心搜索、统计、筛选辅助从页面实现提升为共享查询层，逐步减少 `admin-page-client.tsx` 的体积和职责。
