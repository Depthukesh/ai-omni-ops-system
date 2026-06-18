# 2026-06-18 Skill Center Modularization Phase 7

## 背景

- 前六个阶段已经把技能中心中的共享清单、安装辅助、绑定推导、技能树状态、当前技能关系摘要、资产继承逻辑和展示摘要从 `admin-page-client.tsx` 中逐步拆离。
- 页面入口里仍有一组高频输入项编辑 handler：
  - 数据库输入项的新增、删除、变更
  - 知识库输入项的新增、删除、变更
  - 自定义输入项的新增、删除、变更

这些 handler 虽然不直接发请求，但内部包含大量数组更新和派生字段同步逻辑，继续留在页面里会让入口职责持续膨胀。

## 本次改动

### 1. 新增技能输入项编辑辅助模块

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-input-editing.ts`

抽离内容：

- `updateDatabaseInputConfigs()`
- `appendDatabaseInputConfig()`
- `updateKnowledgeInputConfigs()`
- `appendKnowledgeInputConfig()`
- `updateCustomInputConfigs()`
- `appendCustomInputConfig()`
- `removeSkillInputConfigById()`

职责：

- 统一处理三类输入项的数组更新
- 统一处理数据库参数切换时的标签和默认值同步
- 统一处理知识库切换时的知识库名称、目标内容默认值和标签同步
- 统一处理自定义输入项的增删改

### 2. 后台技能中心页面继续减负

- 更新：
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`

当前做法：

- 页面仍保留 `activeSkillConfig` 判空与 `handleSkillDraftChange()` 调用，保证现有交互边界不变。
- 具体输入项数组变换逻辑改为交由 `skill-input-editing.ts` 处理。

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
  - `apps/web/src/app/(dashboard)/admin/skill-input-editing.ts`
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

## 后续建议

- 第八阶段优先建议：
  - 收口技能中心保存区的请求编排
  - 收口重置/回滚到草稿默认值的辅助逻辑
  - 评估是否已经适合进入 hook 层，而不是继续堆在页面入口
