# 2026-06-07 Skill Package Knowledge Panel First Pass

## 背景

- 第一阶段此前已经落下 `KnowledgeBinding` 桥接层与后台接口，但统一技能中心能力包详情里还只能显示默认知识空间摘要，不能直接维护能力包级知识绑定。
- 作为第一阶段最后收尾，本次不重做知识库底层，而是复用现有桥接接口，把能力包详情里的 `knowledge` 补成最小可维护闭环。

## 本次改动

- 前端 `admin.ts` 新增知识绑定 API：
  - `getKnowledgeBindingsByTarget()`
  - `createKnowledgeBinding()`
  - `updateKnowledgeBinding()`
  - `deleteKnowledgeBinding()`
- 前端统一技能中心详情页新增 `Knowledge 绑定` 管理区：
  - 读取 `SKILL_PACKAGE + targetId=packageId` 的知识绑定
  - 支持新增绑定
  - 支持修改 `priority`、`retrievalMode`、`isRequired`、`enabled`
  - 支持删除绑定
  - 支持加载可用知识库下拉选项
- 基础信息摘要中的默认知识空间展示，优先取当前能力包实际知识绑定结果

## 当前策略

- 本次复用已有 `KnowledgeBinding` 桥接层，不新增新表、不修改现有业务运行链路。
- 目标是把统一技能中心从“只看到知识空间摘要”推进到“后台可维护能力包知识绑定”。
- `brandOverrides` / `userOverrides` 仍保留到后续阶段处理。

## 验证

- `npm --workspace apps/web exec tsc --noEmit`
- `GetDiagnostics`
