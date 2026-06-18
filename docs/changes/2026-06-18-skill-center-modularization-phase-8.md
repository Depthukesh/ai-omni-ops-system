# 2026-06-18 Skill Center Modularization Phase 8

## 背景

- 前七个阶段已经逐步把技能中心中的共享清单、安装辅助、绑定推导、技能树状态、当前技能关系摘要、资产继承逻辑、展示摘要和输入项编辑逻辑从 `admin-page-client.tsx` 中拆离。
- 页面入口中仍保留一组保存区相关逻辑：
  - 技能草稿 patch
  - Prompt 草稿 patch
  - 技能保存 payload 构造
  - Prompt 保存 payload 构造
  - 保存成功后的本地回写
  - seed fallback 下的本地回写
  - 技能中心保存计划判断

这些逻辑已经偏向持久化编排，继续留在页面里会让入口同时承担 UI、状态编排和数据保存细节，模块边界仍然不够清晰。

## 本次改动

### 1. 新增技能中心持久化辅助模块

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-center-persistence.ts`

抽离内容：

- `patchSkillDraftRecord()`
- `patchPromptDraftRecord()`
- `buildSkillConfigUpdatePayload()`
- `buildPromptTemplateUpdatePayload()`
- `applyUpdatedSkillRecord()`
- `applySeedUpdatedSkillRecord()`
- `applyUpdatedPromptRecord()`
- `applySeedUpdatedPromptRecord()`
- `resolveSkillCenterSavePlan()`

职责：

- 统一处理技能与 Prompt 草稿的局部 patch
- 统一处理技能与 Prompt 保存请求的 payload 构造
- 统一处理保存成功后的列表本地回写
- 统一处理 seed 演示数据模式下的回退更新
- 统一处理技能中心保存按钮的执行计划判断

### 2. 修正持久化 helper 的类型边界

- `skill-center-persistence.ts` 不再复制一份弱化版 `SkillEditDraft` / `PromptEditDraft`
- 改为：
  - 对草稿 patch 使用泛型 `Record<string, T>`
  - 对保存 payload 和 seed fallback 使用最小字段约束

这样可以直接复用页面已有的精确 draft 类型，避免出现“同名但不相关”的类型冲突，也避免把输入项数组字段降级成 `unknown[]`。

### 3. 后台技能中心页面继续减负

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

当前做法：

- 页面仍保留保存时机控制、消息提示和当前激活项判断
- 具体保存区辅助逻辑改为交给 `skill-center-persistence.ts` 处理

## 影响范围

- 本次仍只影响技能治理域前端内部结构：
  - 后台技能中心
- 不影响：
  - 数据库 schema
  - 后端接口
  - 其他业务工作台
  - 技能、Prompt、知识库的运行时能力

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/skill-center-persistence.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
- `npm run build:web`

## 当前阶段进度

- 已完成 Phase 1：共享清单与技能安装辅助模块拆分
- 已完成 Phase 2：技能绑定与筛选项推导拆分
- 已完成 Phase 3：技能树过滤与当前激活技能解析拆分
- 已完成 Phase 4：当前技能关系摘要与能力包链路说明拆分
- 已完成 Phase 5：技能资产继承与选择逻辑拆分
- 已完成 Phase 6：知识库、输入参数与状态展示摘要拆分
- 已完成 Phase 7：三类输入项编辑辅助逻辑拆分
- 已完成 Phase 8：保存区持久化辅助逻辑拆分

## 后续建议

- 第九阶段优先建议：
  - 继续收口技能中心的重置、回滚和初始化草稿逻辑
  - 评估是否将技能中心编辑态切入独立 hook
  - 在页面只保留状态编排和 UI 事件入口
