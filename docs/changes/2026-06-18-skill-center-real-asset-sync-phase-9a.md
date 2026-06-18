# 2026-06-18 Skill Center Real Asset Sync Phase 9A

## 背景

- 技能中心此前已经能从安装包中解析出 `references/` 和 `scripts/` 目录清单，但这一步只停留在安装结果返回值里。
- 真正把资产写入后台能力包资产表的动作，仍由前端安装成功后再额外逐条调用接口完成。
- 这导致两类问题：
  - 安装结果与后台真实资产状态分成两段流程，任何一步失败都会造成“技能正文里看起来有 references，但后台来源统计为 0”。
  - 前端若已缓存过能力包详情，即使后端后续有资产导入成功，也可能继续显示旧的 0。

## 本次改动

### 1. 安装技能接口支持直接绑定能力包

- 更新：
  - `apps/server/src/modules/admin/skill-installer.service.ts`
  - `apps/server/src/modules/admin/skills-prompts.module.ts`
  - `apps/server/src/modules/admin/skill-packages.module.ts`

新增能力：

- 安装技能请求现在可携带：
  - `packageId`
  - `packageKey`
  - `packageName`
  - `bindingRemarks`
- 如果安装时已选择能力包，后端会在安装流程内直接创建技能与能力包关系，而不是再依赖前端二次补写。

### 2. 安装技能流程内直接导入真实 References / Scripts

- 安装器在解析出 `references` / `scripts` manifest 后，会在同一条安装流程中：
  - 创建能力包技能关系
  - 将 references 写入 `ReferenceAsset`
  - 将 scripts 写入 `ScriptAsset`

这样后台技能中心里 `References 来源 / Scripts 来源` 的统计口径，终于与安装链路中的真实资产写入动作直接对齐。

### 3. 安装结果返回真实导入摘要

- `InstallSkillResult` 现在新增：
  - `packageBinding`
  - `importedAssets`

返回给前端的信息包括：

- 是否已经完成能力包绑定
- 成功导入了多少个 `References`
- 成功导入了多少个 `Scripts`

### 4. 前端安装流程去掉二次资产导入

- 更新：
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/services/admin.ts`

当前做法：

- 前端安装时直接把选中的能力包信息带给后端安装接口
- 前端不再在安装成功后单独逐条调用 `createReferenceAsset()` / `createScriptAsset()`
- 安装成功后，前端会：
  - 使用返回的 `packageBinding` 更新本地技能-能力包关系状态
  - 主动刷新当前能力包详情缓存，避免继续显示安装前的旧统计

## 影响范围

- 本次仅影响技能治理域中的“技能安装 -> 能力包资产同步”链路：
  - 技能安装器
  - 技能中心后台安装流程
  - 能力包资产展示
- 不影响：
  - 数据库 schema
  - 其他业务工作台
  - 已有知识库和 Prompt 保存逻辑

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skill-installer.service.ts`
  - `apps/server/src/modules/admin/skills-prompts.module.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
- `npm run build:web`
- `npm run build:server`

## 当前阶段进度

- 已完成 Phase 1：共享清单与技能安装辅助模块拆分
- 已完成 Phase 2：技能绑定与筛选项推导拆分
- 已完成 Phase 3：技能树过滤与当前激活技能解析拆分
- 已完成 Phase 4：当前技能关系摘要与能力包链路说明拆分
- 已完成 Phase 5：技能资产继承与选择逻辑拆分
- 已完成 Phase 6：知识库、输入参数与状态展示摘要拆分
- 已完成 Phase 7：三类输入项编辑辅助逻辑拆分
- 已完成 Phase 8：保存区持久化辅助逻辑拆分
- 已完成 Phase 9A：真实 `references/scripts` 安装同步打通

## 后续建议

- Phase 9B 优先建议：
  - 将 `databaseInputs / knowledgeInputs / customInputs` 从描述文本协议提升为后端结构化字段或独立配置表
  - 让技能安装器同步真实输入定义，而不是只写入概述文本
  - 为旧 `description` 文本中的输入协议提供一次性迁移入口
