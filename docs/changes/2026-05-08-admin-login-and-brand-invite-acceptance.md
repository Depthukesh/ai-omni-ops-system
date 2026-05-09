# 2026-05-08 后台独立登录与品牌邀请接受闭环

## 本次变更

- 前端新增独立后台登录页 `/admin/login`
- `/admin` 页面新增 `SUPER_ADMIN` 登录态与权限校验
- 登录态前端模型补充 `systemRole`
- 品牌邀请流新增“我的待接受邀请”接口
- 品牌邀请流新增“接受邀请”接口
- 接受邀请后自动写入 `BrandMember`
- `team` 页新增“我的待接受邀请”区块与接受按钮
- 已接受邀请会从待处理邀请列表中收口

## 影响范围

- 前端：
  - `apps/web/src/app/(auth)/admin/login/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
  - `apps/web/src/services/auth-session.ts`
  - `apps/web/src/services/brand-growth.ts`
- 后端：
  - `apps/server/src/modules/auth/auth.service.ts`
  - `apps/server/src/modules/brands/brands.controller.ts`
  - `apps/server/src/modules/brands/brands.service.ts`

## 验证

- `GetDiagnostics` 通过
- `npm run build:server` 通过
- `npm run build:web` 通过

## 当前边界

- 后台管理台目前仅做页面入口守卫，未拆更细的后台角色矩阵
- 接受邀请当前走站内接口闭环，尚未补邀请通知、邀请链接和消息提醒
- mock 模式下仍不支持邀请流写操作，需连接数据库
