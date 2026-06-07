# 2026-06-07 SkillPackage Basic First Pass

## 本次改动

- 在 `SkillPackagesService` 中新增能力包基础信息更新能力：
  - 新增 `PATCH /admin/skill-packages/:packageId/basic`
  - first pass 仅允许更新能力包主字段：
    - `packageName`
    - `packageKey`
    - `description`
    - `status`
    - `scope`
    - `tags`
    - `remarks`
- 后台统一技能中心 `skill-package-overview-panel` 中的顶部摘要区升级为基础信息编辑区：
  - 支持编辑能力包名称、标识、状态、作用域、说明、标签、备注
  - 保留模块、知识空间、主技能、默认 Provider、默认模型、版本等聚合字段只读展示
  - 保存后回刷能力包详情，并同步更新当前列表中的能力包摘要

## 实现边界

- 本轮不改模块绑定、技能绑定、知识绑定等关系对象。
- 本轮不改 Prompt、Provider、Version 的既有能力。
- 目标是先把 `basic` 独立成稳定可用的最小写接口，与详情读取接口分离。

## 校验

- `GetDiagnostics`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
