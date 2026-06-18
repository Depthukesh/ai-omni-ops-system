# 2026-06-18 Skill Center Modularization Phase 5

## 背景

- 前四个阶段已经把技能中心中的共享清单、安装辅助、绑定推导、技能树状态和当前技能关系摘要从 `admin-page-client.tsx` 中逐步抽离。
- 后台技能中心中仍有一组围绕资产继承的纯逻辑：
  - 当前技能默认继承哪些 References / Scripts
  - 技能级显式选择后应使用哪些 keys
  - 资产来源摘要文案如何拼接
  - 资产卡片 summary 如何跟随“默认继承 / 显式选择”状态变化
  - 勾选某个资产后的 keys 如何增删

这些逻辑仍然是纯计算，适合继续从页面中拆走。

## 本次改动

### 1. 新增技能资产选择辅助模块

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-asset-selection.ts`

抽离内容：

- `resolveEffectiveInheritedReferenceKeys()`
- `resolveEffectiveInheritedScriptKeys()`
- `buildInheritedAssetSourceSummary()`
- `buildInheritedAssetCardSummary()`
- `toggleInheritedAssetKeys()`

职责：

- 统一计算当前技能实际生效的 References / Scripts keys
- 统一生成资产来源摘要文案
- 统一生成资产卡片摘要文案
- 统一处理勾选资产后的 keys 增删

### 2. 后台技能中心页面继续瘦身

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

当前做法：

- `admin-page-client.tsx` 不再直接维护资产继承相关的重复判断。
- 页面改为调用 `skill-asset-selection.ts` 中的辅助逻辑，保留原有展示与交互行为不变。

## 影响范围

- 本次仍只影响技能治理域前端内部结构：
  - 后台技能中心
- 不影响：
  - 数据库 schema
  - 后端接口
  - 其他业务工作台
  - Prompt / Provider / Knowledge 的运行时行为

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/skill-asset-selection.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
- `npm run build:web`

## 当前阶段进度

- 已完成 Phase 1：共享清单与技能安装辅助模块拆分
- 已完成 Phase 2：技能绑定与筛选项推导拆分
- 已完成 Phase 3：技能树过滤与当前激活技能解析拆分
- 已完成 Phase 4：当前技能关系摘要与能力包链路说明拆分
- 已完成 Phase 5：技能资产继承与选择逻辑拆分

## 后续建议

- 第六阶段建议继续拆：
  - 知识库摘要
  - 数据库输入参数摘要
  - 自定义输入摘要
  - 模型/状态展示摘要
- 继续保持“只抽纯逻辑，不改外部行为”的节奏，逐步压缩 `admin-page-client.tsx` 的职责。
