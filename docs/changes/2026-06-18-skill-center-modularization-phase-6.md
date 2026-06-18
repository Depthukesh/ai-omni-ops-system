# 2026-06-18 Skill Center Modularization Phase 6

## 背景

- 前五个阶段已经把技能中心中的共享清单、安装辅助、绑定推导、技能树状态、当前技能关系摘要和资产继承逻辑逐步从 `admin-page-client.tsx` 中拆离。
- 后台技能中心里仍然堆着一组展示摘要逻辑：
  - 活跃知识库摘要
  - 知识库同步摘要
  - 数据库输入参数摘要
  - 自定义知识库输入摘要
  - 自定义输入摘要
  - 技能状态 / 模型 / 点数 / 更新时间摘要

这组逻辑本质上都是纯派生值，继续留在页面中会让页面入口职责越来越重。

## 本次改动

### 1. 新增技能展示摘要模块

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-display-summaries.ts`

抽离内容：

- `resolveSkillDisplaySummaries()`

职责：

- 统一计算知识库展示摘要
- 统一计算数据库输入参数摘要
- 统一计算知识库输入和自定义输入摘要
- 统一计算技能状态、模型、点数、更新时间摘要

### 2. 后台技能中心页面继续减负

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

当前做法：

- `admin-page-client.tsx` 不再直接拼接上述展示摘要。
- 页面改为消费 `resolveSkillDisplaySummaries()` 的返回结果。
- 知识库同步数量映射也一并由展示摘要模块产出，避免页面保留残余计算。

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
  - `apps/web/src/app/(dashboard)/admin/skill-display-summaries.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
- `npm run build:web`

## 当前阶段进度

- 已完成 Phase 1：共享清单与技能安装辅助模块拆分
- 已完成 Phase 2：技能绑定与筛选项推导拆分
- 已完成 Phase 3：技能树过滤与当前激活技能解析拆分
- 已完成 Phase 4：当前技能关系摘要与能力包链路说明拆分
- 已完成 Phase 5：技能资产继承与选择逻辑拆分
- 已完成 Phase 6：知识库、输入参数与状态展示摘要拆分

## 后续建议

- 第七阶段建议评估：
  - 技能中心保存/重置按钮区的行为编排是否还要继续收口
  - 是否值得引入 hook 层，而不是继续堆在页面入口
- 继续维持“小步拆分、每步可验证、不影响其他板块”的节奏。
