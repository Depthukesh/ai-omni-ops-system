# 2026-06-18 Skill Center Modularization Phase 4

## 背景

- 第三阶段已经把技能树过滤、当前激活技能选择、技能总量统计从 `admin-page-client.tsx` 中拆出。
- 后台技能中心中仍有一组高耦合的“当前技能关系摘要”推导逻辑：
  - 当前技能绑定到哪些模块、能力包
  - 当前能力包中的上下游技能链路
  - 当前技能继承到哪些脚本、参考资料
  - 当前输出说明与资产来源文案

这些逻辑仍然是纯计算，不应该继续留在页面入口中。

## 本次改动

### 1. 新增当前技能上下文解析模块

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-active-context.ts`

抽离内容：

- `resolveActiveSkillRelations()`

职责：

- 根据当前激活技能叶子节点、技能绑定、能力包关系、模块关系、能力包详情和提示词列表，统一推导：
  - 当前技能绑定记录
  - 当前提示词场景解析结果
  - 当前模块归属与能力包归属
  - 当前主能力包关系
  - 当前技能在能力包中的上下游链路
  - 当前输出摘要
  - 当前参考资料与脚本资产来源

### 2. 后台技能中心页面继续减负

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

当前做法：

- `admin-page-client.tsx` 不再自行计算当前技能关系摘要。
- 页面仅消费 `resolveActiveSkillRelations()` 的结果用于展示。

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
  - `apps/web/src/app/(dashboard)/admin/skill-active-context.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
- `npm run build:web`

## 当前阶段进度

- 已完成 Phase 1：共享清单与技能安装辅助模块拆分
- 已完成 Phase 2：技能绑定与筛选项推导拆分
- 已完成 Phase 3：技能树过滤与当前激活技能解析拆分
- 已完成 Phase 4：当前技能关系摘要与能力包链路说明拆分

## 后续建议

- 第五阶段建议继续拆：
  - 技能资产选择、继承状态与展示文案
  - 知识库摘要、输入参数摘要、模型摘要这类展示派生逻辑
- 继续维持“小步拆分、每步可构建、只动技能治理域”的策略。
