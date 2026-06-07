# 2026-06-07 模块注册中心后台页面第一批接线

## 背景

- 按 `docs/project_planning` 第一阶段规划，`ModuleDefinition` 不应只停留在数据库表和接口层，还需要尽快在后台形成可操作页面。
- 上一轮已经完成模块注册正式表、后台接口和前端服务层，本轮继续把能力接到 `/admin`。
- 本次仍遵守既定原则：
  - 以 `docs/project_planning` 为开发依据
  - 增量接入，不破坏现有后台其他标签页
  - 模块开发完成后，模块内功能可以独立使用

## 本次改动

### 1. 新增模块注册中心面板组件

- 新增文件：
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
- 当前已提供的页面能力：
  - 模块列表查看
  - 关键词 / 类型 / 状态筛选
  - 点击按钮弹窗新建模块
  - 编辑模块
  - 归档模块
  - 删除模块
- 组件内部兼容两种模式：
  - `api`
  - `seed`
- 本轮补充的交互调整：
  - 新建模块不再默认展开整块表单
  - 改为点击“创建模块”后打开弹窗填写资料
  - 支持遮罩关闭、按钮关闭和 `Esc` 关闭

### 2. 后台 `/admin` 正式挂入模块标签

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 本次补齐内容：
  - `AdminTab` 增加 `modules`
  - 标签栏增加“模块注册中心”
  - 权限矩阵为 `SUPER_ADMIN`、`ADMIN_OPERATOR` 开放 `modules`
  - `loadAdminData()` 增加模块列表加载
  - 主渲染分支增加 `activeTab === "modules"` 面板渲染

### 3. 前端 seed 回退补齐

- 修改：
  - `apps/web/src/services/admin.ts`
- 新增：
  - `moduleDefinitionSeed`
- 作用：
  - 当后台模块接口不可用时，`/admin` 仍可展示模块注册中心演示数据
  - 与知识库、接口供应商等后台页保持一致的“API 优先，seed 回退”策略

## 对应规划文档

- `33_AI全域运营系统_ModuleDefinition注册后台表单字段草案_v1`
- `37_AI全域运营系统_模块注册中心列表页字段清单_v1`
- `39_AI全域运营系统_第一阶段接口与页面对照表_v1`

## 影响范围

- 前端页面：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
- 前端服务层：
  - `apps/web/src/services/admin.ts`
- 文档：
  - 本文件

## 当前效果

- 后台 `/admin` 已可直接进入“模块注册中心”标签页。
- 新建模块改为弹窗录入，后台首屏信息密度更稳定。
- 若接口可用，则页面直接读写 `ModuleDefinition` 正式接口。
- 若接口不可用，则页面自动回退到 `moduleDefinitionSeed`，保证后台仍可演示和继续联调。

## 后续建议

- 下一步优先继续接：
  - 模块默认能力包关系页
  - 知识绑定后台页
  - 模块与技能中心、知识空间的联动入口
- 等这些页面都接齐后，再考虑把后台部分导航与模块注册表做更深层的关联，而不是过早改动现有前端工作台入口。

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/module-definitions-panel.tsx`
  - `apps/web/src/services/admin.ts`
- `npm --workspace apps/web exec tsc --noEmit`
