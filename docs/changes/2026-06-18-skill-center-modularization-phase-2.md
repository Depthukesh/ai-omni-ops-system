# 2026-06-18 Skill Center Modularization Phase 2

## 背景

- 第一阶段已经把技能清单定义提升到共享层，并把技能安装辅助逻辑从 `admin-page-client.tsx` 中拆出。
- 后台技能中心里仍残留一组典型的“页面内纯函数”：
  - 技能绑定记录合并
  - 技能模块筛选项推导
  - 技能能力包筛选项推导
- 这组逻辑与页面 UI 无关，却继续留在超大页面里，后续会让技能中心继续膨胀。

## 本次改动

### 1. 新增技能绑定辅助模块

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-asset-bindings.ts`

抽离内容：

- `buildPackageIdFromKey()`
- `buildSkillModuleFilterOptions()`
- `buildSkillPackageFilterOptions()`
- `mergeSkillAssetBindings()`
- `mergeSkillAssetBindingRecord()`

这些函数现在统一负责：

- 根据模块定义生成技能模块筛选项
- 根据能力包-技能、能力包-模块关系生成能力包筛选项
- 把平台默认绑定、后台真实绑定、能力包默认关系合并成页面可用的技能绑定快照

### 2. 后台技能中心页面进一步瘦身

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`

当前做法：

- `admin-page-client.tsx` 改为直接调用 `skill-asset-bindings.ts` 中的共享辅助逻辑。
- `skill-installation.ts` 改为复用 `buildPackageIdFromKey()`，避免同一规则在技能后台出现多份实现。

## 影响范围

- 本次仍然只影响技能治理域前端内部结构：
  - 后台技能中心
- 不影响：
  - 数据库 schema
  - 后端接口
  - 其他业务工作台
  - Prompt / Provider / Knowledge 的运行时结果

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/skill-asset-bindings.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-installation.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
- `npm run build:web`

## 后续建议

- 第三阶段可以继续把技能中心中“过滤后的技能树推导”“当前技能绑定解析”“安装模态状态切换”拆到独立 hook。
- 拆分顺序仍建议遵循：
  - 先抽纯函数
  - 再抽 hook
  - 最后才拆 UI 容器

这样可以最大限度降低对其他板块的连带风险。
