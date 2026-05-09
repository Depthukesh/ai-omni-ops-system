# 2026-05-09 后台角色矩阵与团队邀请码第一版

## 本次变更

- 后端新增统一后台角色矩阵基础层 `admin-access.ts`
- `ADMIN_OPERATOR`、`FINANCE_OPERATOR`、`SUPPORT_OPERATOR` 已接入后台接口访问拦截
- `/admin/login` 改为允许四类后台角色进入
- `/admin` 页面按后台角色矩阵收口可见栏目
- `team` 页新增邀请码输入并支持 `accept-by-code`
- 邀请记录新增邀请码与邀请链接展示、复制操作
- `team` 页新增品牌成员审计日志区块
- `team` 页新增品牌主账号转移入口
- 未登录点击邀请链接时，登录回流会保留 `inviteCode`
- 个人中心概览页新增待处理品牌邀请通知卡
- 前台共享顶栏新增全局待处理邀请提示条，可直接跳转处理最近一条邀请
- 新增 `/personal-center/invites` 邀请通知中心页
- 新增 `GET /api/brands/me/invites/history`，用于汇总用户邀请历史
- 邀请通知中心新增状态筛选、关键词搜索与最近同步时间展示
- 邀请通知中心新增排序切换、分页总览与筛选后空状态
- 邀请通知中心新增 URL 参数状态回放，支持保留筛选、搜索、排序与分页
- 邀请通知中心新增“复制当前链接”和“一键重置筛选”
- 邀请通知中心新增未读/已读第一版、本地持久化、单条标记和全部标记已读
- 邀请通知中心新增“只看未读”筛选，并接入 URL 参数
- 顶栏全局邀请提示条现联动未读待处理数量
- 顶栏全局邀请提示条新增 60 秒自动刷新与状态变化后自动恢复展示
- 邀请通知中心未读/已读已从本地持久化升级为后端持久化，新增 `BrandInviteReadState`
- 后端新增 `PATCH /api/brands/me/invites/read-state`，支持单条和批量标记邀请为已读/未读
- 已修复 `GET /api/brands/me/invites*` 被 `/:id/invites*` 抢先匹配的路由顺序问题
- 邀请站内消息表第一版已落地，新增 `BrandInviteNotification`
- 后端新增 `GET /api/brands/me/invite-notifications` 与 `PATCH /api/brands/me/invite-notifications/read-state`
- 邀请通知中心前端已从“直接读邀请历史”切到“读邀请站内消息接口”
- Prisma schema 已补 `BrandInvite.inviteCode` 与 `BrandRoleAuditLog`
- Prisma schema 已继续补 `BrandInviteReadState`
- Prisma schema 已继续补 `BrandInviteNotification`

## 影响范围

- 前端：
  - `apps/web/src/app/(auth)/admin/login/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/app/(dashboard)/personal-center/invites/page.tsx`
  - `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
  - `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
  - `apps/web/src/app/(dashboard)/layout.tsx`
  - `apps/web/src/services/brand-growth.ts`
- 后端：
  - `apps/server/src/modules/admin/admin-access.ts`
  - `apps/server/src/modules/admin/*.controller.ts`
  - `apps/server/src/modules/brands/brands.controller.ts`
  - `apps/server/src/modules/brands/brands.service.ts`
  - `apps/server/src/modules/orders/orders.controller.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260508_brand_audit_and_invite_code/migration.sql`
- `prisma/migrations/20260509_brand_invite_read_state/migration.sql`
- `prisma/migrations/20260509_brand_invite_notification/migration.sql`

## 验证

- `GetDiagnostics` 通过
- `npm run prisma:generate` 通过
- `npx prisma db push --schema prisma/schema.prisma` 通过
- `npm run build:server` 通过
- `npm run build:web` 通过
- 已使用临时普通测试用户完成真实链路验证：创建邀请 -> 读取邀请 -> 标记已读 -> 历史返回 `isRead=True` -> 回收测试邀请与测试用户
- 已使用临时普通测试用户完成真实消息链路验证：创建邀请 -> 生成站内邀请消息 -> 标记消息已读 -> 再次读取消息返回 `readAt` -> 回收测试邀请与测试用户

## 当前边界

- 邀请通知目前仍以站内待接受邀请 + 邀请链接/邀请码为主，尚未接短信、邮件或 IM 消息提醒
- 主账号转移目前仅开放给当前 `OWNER`，且不支持直接修改自己的角色
- 后台任务管理页和更细的后台操作审计仍待继续补齐
