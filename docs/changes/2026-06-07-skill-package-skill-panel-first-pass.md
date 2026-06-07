# 2026-06-07 能力包与技能关系后台页第一批接线

## 背景

- 上一轮已经完成：
  - `SkillPackageSkill` 正式关系表
  - 后端 `skill-package-skills` 接口
  - 技能中心优先读取真实能力包技能关系
  - 创建技能时同步写入能力包归属
- 但当前后台仍缺一个独立管理入口：
  - 只能在创建技能时顺带写入
  - 无法单独维护已有关系
  - 也不方便后续做批量整理和归属调整

## 本次改动

### 1. 新增能力包与技能关系后台页

- 新增：
  - `apps/web/src/app/(dashboard)/admin/skill-package-skills-panel.tsx`
- 页面能力：
  - 列表查看关系
  - 按技能 / 绑定类型 / 启用状态 / 关键词筛选
  - 左侧选中，右侧编辑
  - 弹窗创建
  - 删除关系

### 2. 复用现有后台交互模式

- 当前交互与模块关系页保持一致：
  - 顶部筛选卡片
  - 左侧关系表格
  - 右侧详情编辑
  - 弹窗新建
  - `Esc` 关闭创建弹窗
- 这样后台模块注册域的交互风格保持统一，不额外引入新的页面模式。

### 3. 接入模块注册后台页

- 修改：
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 当前结构：
  - 模块注册中心
  - 模块默认能力包关系
  - 能力包与技能关系
- 三层关系在一个后台上下文里连续维护，更符合第一阶段注册域底座的收口目标。

## 当前效果

- 后台已经可以独立维护“能力包 <-> 技能”关系。
- 不再只能靠创建技能时顺带写入。
- 后续整理已有技能归属、补挂能力包和调整默认挂载，都可以直接在后台完成。

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/admin/skill-package-skills-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 文档：
  - 本文件

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/skill-package-skills-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- `npm --workspace apps/web exec tsc --noEmit`
