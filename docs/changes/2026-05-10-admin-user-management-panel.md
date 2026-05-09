# 2026-05-10 后台用户管理筛选面板与账号详情编辑

## 本次变更

- `/admin` 的用户管理页从旧版逐行卡片编辑切到“筛选区 + 用户列表 + 弹窗详情编辑”结构
- 后台用户列表支持关键词、会员等级、账号状态、系统角色、邮箱验证状态筛选
- 用户列表支持普通用户与管理员账号统一查看
- 用户点击“查看详情”后，通过弹窗查看和编辑用户名、手机号、邮箱、头像地址、会员等级、账号状态、系统角色、积分余额、邮箱验证状态、密码
- 用户列表已补“删除”按钮，删除前会先弹出确认弹窗
- 用户列表已移除“角色”“会员”两列，给操作列留出更稳定的按钮排布空间
- 用户列表中的“查看详情”“删除”按钮已统一为同一套样式
- 后端新增 `GET /api/admin/users/:id` 用户详情接口
- 后端扩展 `GET /api/admin/users` 查询参数，支持筛选
- 后端扩展 `PATCH /api/admin/users/:id`，支持角色、邮箱验证、密码重置与积分直改
- 后端新增 `DELETE /api/admin/users/:id`，支持后台删除账号
- 后端用户管理在 mock/seed 分支补齐 `systemRole` 兼容，避免无库模式构建失败

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/users-management-panel.tsx`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/styles/globals.css`
- 后端：
  - `apps/server/src/modules/admin/users-admin.controller.ts`
  - `apps/server/src/modules/admin/users-admin.service.ts`
  - `apps/server/src/common/mock-data.ts`

## 验证

- `GetDiagnostics` 通过
- `npm run build:server` 通过
- `npm run build:web` 通过
- 已重启 `3001` 与 `3011` 稳定实例，确认最新代码生效
- 已实测 `/admin`：
  - 用户管理页显示筛选区与列表区，不再保留右侧常驻详情板块
  - 管理员账号 `13900000001` 可在列表中查看并点进弹窗详情
  - 弹窗中已展示手机号、邮箱、会员等级、系统角色、积分余额、邮箱验证与密码重置字段
  - 列表中可直接发起删除，并出现确认弹窗

## 当前边界

- 当前列表仍以“筛选 + 单账号弹窗编辑”为主，尚未补批量操作、导出、分页和更细的排序能力
- mock 模式下品牌关联仍只展示 owner 侧基础信息，不覆盖完整成员关系
- 用户名中历史异常字符属于现存数据，本次未额外做数据清洗
