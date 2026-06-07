# 2026-06-07 SkillPackage Provider First Pass

## 本次改动

- 在 `SkillPackagesService` 中新增能力包维度 Provider 更新能力：
  - 新增 `PATCH /admin/skill-packages/:packageId/providers/:bindingId`
  - 更新前校验 Provider 绑定是否归属于当前能力包
  - first pass 先桥接到对应技能配置，更新 `SkillConfig.provider` 与 `SkillConfig.defaultModel`
- 扩展 `SkillsPromptsService.updateSkill()`，让技能配置真源支持更新 `provider`
- 后台统一技能中心 `skill-package-overview-panel` 中的 Provider 区块从只读摘要升级为可编辑区：
  - 读取可用 Provider 列表
  - 支持切换 Provider
  - 支持编辑模型值
  - 支持逐条保存并在保存后回刷能力包详情

## 实现策略

- 当前 `providerBindings` 仍未单独落独立表。
- 本轮不新增 `provider_bindings` 真表，而是沿用现有聚合逻辑：
  - `SkillPackageSkill`
  - `SkillConfig`
  - `ApiProviderConfig`
- 这样可以先把统一技能中心详情页的 Provider 管理做成可用闭环，同时不影响现有前台业务运行。

## 校验

- `GetDiagnostics`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
