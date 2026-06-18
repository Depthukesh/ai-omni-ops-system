# 2026-06-18 Skill Center Modularization Phase 3

## 背景

- 第一阶段已完成：
  - 技能清单定义提升到共享层
  - 技能安装辅助逻辑拆出后台超大页面
- 第二阶段已完成：
  - 技能绑定合并逻辑、筛选项推导逻辑拆出后台超大页面
- `admin-page-client.tsx` 中仍保留一块高耦合的技能中心推导逻辑：
  - 过滤后的技能树生成
  - 当前激活技能的主分组 / 子分组 / 叶子节点解析
  - 技能总量统计

这些逻辑本质上都是纯计算，不应该继续滞留在页面入口里。

## 本次改动

### 1. 新增技能中心状态推导模块

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-center-state.ts`

抽离内容：

- `countSkillCenterLeaves()`
- `filterSkillCenterTree()`
- `resolveActiveSkillSelection()`

职责：

- 统一计算技能树总叶子数
- 根据关键字、模块、能力包筛选条件，生成过滤后的技能树
- 根据当前选中的主分组 / 子分组 / 叶子节点 ID，解析当前激活技能上下文

### 2. 后台技能中心页面继续瘦身

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

当前做法：

- `admin-page-client.tsx` 改为直接调用 `skill-center-state.ts` 中的纯推导函数。
- 页面不再自行维护这几段技能树过滤和激活解析细节。
- 同时移除了页面里重复定义的 `SkillCenter*Config` 类型，改为复用共享状态模块导出的类型。

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
  - `apps/web/src/app/(dashboard)/admin/skill-center-state.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
- `npm run build:web`

## 当前阶段进度

- 已完成 Phase 1：共享清单与技能安装辅助模块拆分
- 已完成 Phase 2：技能绑定与筛选项推导模块拆分
- 已完成 Phase 3：技能树过滤与当前激活技能解析模块拆分

## 后续建议

- 第四阶段建议继续拆：
  - 当前技能关系摘要、能力包上下游链路说明
  - 技能资产展示相关的组合派生数据
- 仍然保持“先抽纯函数，再抽 hook，最后才拆 UI 容器”的低风险顺序。
