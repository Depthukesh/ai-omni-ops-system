# 2026-06-07 技能中心模块与能力包归属展示第一批接线

## 背景

- 当前第一阶段已经有：
  - `ModuleDefinition` 模块注册中心
  - `SkillPackageModule` 模块与能力包关系表
- 但后台“技能中心”仍主要只展示：
  - 技能
  - 提示词
  - 模型
  - 状态
- 还无法直接看出一个技能或提示词：
  - 属于哪个模块
  - 挂在哪个能力包下

## 本次改动

### 1. 技能中心显示所属模块

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 在技能中心详情区新增只读字段：
  - `所属模块`

### 2. 技能中心显示所属能力包

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 在技能中心详情区新增只读字段：
  - `所属能力包`

### 3. 补充技能/提示词到模块与能力包的归属映射 seed

- 修改：
  - `apps/web/src/services/admin.ts`
- 新增：
  - `SkillAssetBindingRecord`
  - `skillAssetBindingSeed`
- 用途：
  - 先把技能中心中已存在的主要技能 / 提示词，与模块、能力包建立一层前端归属映射
  - 让后台技能中心先具备“可视化归属能力”
  - 为后续正式落地 `SkillPackage -> Skill / Prompt / WorkflowNode` 关系表做过渡

### 4. 技能中心开始读取真实模块能力包关系

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 本次增加：
  - 技能中心加载后台 `SkillPackageModule` 数据
  - 接口失败时回退 `skillPackageModuleSeed`
- 这样技能中心显示的“所属能力包”不再只是单纯静态文本，而是开始与真实模块能力包关系层联动

## 当前效果

- 后台“技能中心”里，选中一个技能项后，可以直接看到：
  - 所属执行技能
  - 所属模块
  - 所属能力包
  - 归属说明
- 这使得后台首次具备了“技能 -> 能力包 -> 模块”的可视化观察能力。

## 架构意义

- 这一步没有把“技能只能属于一个模块”写死。
- 当前实现支持：
  - 一个技能映射多个模块
  - 一个技能映射多个能力包
- 这样后续模块复用技能时，不会被单模块关系卡死。

## 当前边界

- 本轮仍属于第一批可视化接线：
  - 技能与能力包的归属关系，还没有正式拆成独立后端真源表
  - 当前先用前端 seed 做归属映射层
- 真正的下一步应继续推进：
  - `SkillPackage` 与技能实体的正式关系表
  - 后台创建技能时直接挂能力包 / 模块
  - 技能中心列表按模块、能力包筛选

## 影响范围

- 前端页面：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 前端服务层：
  - `apps/web/src/services/admin.ts`
- 文档：
  - 本文件

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/services/admin.ts`
- `npm --workspace apps/web exec tsc --noEmit`
