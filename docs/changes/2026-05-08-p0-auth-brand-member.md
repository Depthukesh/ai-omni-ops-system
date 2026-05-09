# 2026-05-08 P0 登录态与品牌成员底座

## 1. 变更背景

- 个人中心、多用户和品牌协作要真正启动，必须先把“当前登录用户是谁”“当前品牌是谁”“任务/订单/作品属于谁”这三个问题落到代码里
- 原系统仍是单用户演示态，`profile`、`tasks`、`orders`、`media` 多处默认读取首个用户

## 2. 本次目标

- 落第一段 P0 多用户底座
- 建立真实登录态
- 建立品牌成员表
- 把个人中心核心依赖的任务、订单、媒体接口开始按当前用户过滤

## 3. 本次修改

### 3.1 数据库结构

- 更新 `prisma/schema.prisma`
- 新增：
  - `SystemRole`
  - `UserSession`
  - `BrandMemberRole`
  - `BrandMemberStatus`
  - `BrandMember`
- 更新 `User`：
  - 新增 `systemRole`
  - 新增 `lastLoginAt`
- 新增迁移：
  - `prisma/migrations/20260508_auth_brand_member_p0/migration.sql`

### 3.2 认证模块

- 更新 `apps/server/src/modules/auth/auth.controller.ts`
- 更新 `apps/server/src/modules/auth/auth.service.ts`
- 新增能力：
  - `login`
  - `refresh`
  - `me`
  - `brands`
  - `switch-brand`
  - `logout`
- 实现基于签名 token 的 access/refresh 登录态
- 历史明文密码用户登录成功后自动升级为哈希密码

### 3.3 品牌成员底座

- 更新 `apps/server/src/modules/brands/brands.service.ts`
- 创建品牌时自动把品牌 owner 写入 `BrandMember`

### 3.4 当前用户过滤

- 更新 `apps/server/src/modules/tasks/tasks.controller.ts`
- 更新 `apps/server/src/modules/tasks/tasks.service.ts`
- 更新 `apps/server/src/modules/media/media.controller.ts`
- 更新 `apps/server/src/modules/media/media.service.ts`
- 更新 `apps/server/src/modules/orders/orders.controller.ts`
- 更新 `apps/server/src/modules/orders/orders.service.ts`
- 当前开始按请求登录态过滤：
  - 任务
  - 媒体
  - 订单

### 3.5 模块接线

- 更新：
  - `apps/server/src/modules/tasks/tasks.module.ts`
  - `apps/server/src/modules/media/media.module.ts`
  - `apps/server/src/modules/orders/orders.module.ts`
- 让这些模块可以复用 `AuthService` 解析当前用户

### 3.6 前端登录态接线

- 新增：
  - `apps/web/src/services/auth-session.ts`
  - `apps/web/src/services/auth.ts`
- 更新：
  - `apps/web/src/services/http.ts`
  - `apps/web/src/app/(auth)/login/page.tsx`
  - `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- 前端已新增本地登录态存储层，统一保存：
  - `accessToken`
  - `refreshToken`
  - `currentBrandId`
  - `brands`
  - `user`
- 前端请求层现在会自动附带：
  - `Authorization: Bearer <accessToken>`
  - `x-brand-id`
- 当前已接入 refresh 自动续期，`401` 时会先尝试刷新 access token
- 登录页已从占位页改为可提交账号密码的真实页面
- 个人中心已接入：
  - `/api/auth/me`
  - `/api/auth/brands`
  - `/api/auth/switch-brand`
  - `/api/auth/logout`
- 个人中心当前已支持：
  - 登录态校验
  - 未登录跳转 `/login`
  - 当前品牌切换
  - 退出登录
  - 真实用户资料、任务、订单、作品加载
  - 局部接口失败时按模块回退演示数据，而不是整页失效

## 4. 验证结果

- `GetDiagnostics` 检查通过
- `npm run prisma:generate` 通过
- `npm run build:server` 通过
- `npm run prisma:db:push` 通过
- `npm run build:web` 通过
- 冒烟测试通过：
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `GET /api/tasks`

## 5. 当前边界

- 个人中心前端已接上第一版真实登录态，但仍是聚合页，尚未拆成 `/profile`、`/tasks`、`/skills`、`/team` 等二级路由
- 目前任务/订单/媒体主要按“当前用户”过滤，品牌管理员查看品牌内全部任务的能力后续继续补
- 品牌邀请、品牌角色管理页面、后台任务管理页和管理员审计尚未开始
