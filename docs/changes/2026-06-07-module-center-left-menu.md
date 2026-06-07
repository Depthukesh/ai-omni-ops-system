# 2026-06-07 模块注册中心左侧子菜单调整

## 背景

- 当前后台“模块注册中心”已经承载 4 组能力：
  - 模块注册
  - 能力包注册
  - 模块与能力包关系
  - 能力包与技能关系
- 但页面仍然是 4 个大面板从上到下直排，随着模块化底座继续扩展，查看和维护成本会越来越高。

## 本次改动

- 修改：
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
- 当前把模块注册中心改成：
  - 左侧子菜单
  - 右侧当前内容区
- 左侧当前提供 4 个子菜单：
  - `模块注册`
  - `能力包注册`
  - `模块绑定`
  - `技能绑定`

## 当前效果

- 页面结构更接近各业务模块工作台的左侧导航模式
- 后台不再一次性直排展示 4 块长页面
- 用户可以按当前工作目标在左侧切换：
  - 先录入模块
  - 再录入能力包
  - 再维护模块挂载关系
  - 最后维护能力包与技能关系

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
- `npm --workspace apps/web exec tsc --noEmit`
