# 2026-06-07 模块能力包关系后台页面第一批接线

## 背景

- 当前第一阶段主线已经有：
  - 模块注册中心正式表与后台页面
  - 模块默认能力包关系正式表与后台接口
- 为了让模块逐步真正独立，后台不能只维护 `ModuleDefinition` 摘要字段，还需要把模块与能力包的真实挂载关系可视化、可编辑。

## 本次改动

### 1. 在模块注册中心内挂入关系管理面板

- 新增文件：
  - `apps/web/src/app/(dashboard)/admin/skill-package-modules-panel.tsx`
- 挂载位置：
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
- 当前提供的能力：
  - 模块能力包关系列表查看
  - 按模块 / 绑定类型 / 启用状态筛选
  - 新增关系
  - 编辑关系
  - 删除关系

### 2. 前端 seed 回退补齐

- 修改：
  - `apps/web/src/services/admin.ts`
- 新增：
  - `skillPackageModuleSeed`
- 作用：
  - 当后台关系接口不可用时，模块注册中心仍可展示和联调能力包挂载关系
  - 与当前后台其他页面保持一致的 `api` 优先、`seed` 回退策略

### 3. 模块与能力包职责进一步收口

- 当前页面层明确了两个层次：
  - `ModuleDefinition.defaultSkillPackages`
    - 用作模块定义中的摘要字段
  - `SkillPackageModule`
    - 用作真实挂载关系真源
- 后续技能所属模块展示、模块默认能力包装配、影响范围分析，都应优先查关系表，而不是只依赖摘要字段反推

## 对应规划文档

- `36_AI全域运营系统_SkillPackage与ModuleDefinition关系表草案_v1`
- `39_AI全域运营系统_第一阶段接口与页面对照表_v1`

## 影响范围

- 前端页面：
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/skill-package-modules-panel.tsx`
- 前端服务层：
  - `apps/web/src/services/admin.ts`
- 文档：
  - 本文件

## 当前效果

- 后台“模块注册中心”不再只看模块定义，还能直接维护模块与能力包的真实挂载关系。
- 页面优先调用：
  - `GET /admin/skill-package-modules`
  - `POST /admin/skill-package-modules`
  - `PATCH /admin/skill-package-modules/:id`
  - `DELETE /admin/skill-package-modules/:id`
- 当接口不可用时，自动回退到本地演示关系数据。

## 这对后续模块化的意义

- 技能中心后续可以明确展示“所属模块”。
- 模块初始化时可以按关系表装配默认能力包。
- 某个能力包改动后，可以反查受影响的模块范围。
- 这一步也为后续“后台创建技能 / 能力包”提供了挂载位置，不再依赖硬编码目录。

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/skill-package-modules-panel.tsx`
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
  - `apps/web/src/services/admin.ts`
- `npm --workspace apps/web exec tsc --noEmit`
