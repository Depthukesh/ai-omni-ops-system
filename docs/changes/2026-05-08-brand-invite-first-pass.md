# 2026-05-08 品牌邀请流第一版

## 1. 变更背景

- 团队协作页已经支持成员列表和直加已有账号
- 但品牌主账号或管理员还缺少“先创建邀请，等待对方接受”的能力

## 2. 本次目标

- 新增 `BrandInvite` 数据模型
- 新增邀请列表、创建邀请、撤回邀请接口
- 在团队协作页接入邀请记录展示与操作

## 3. 本次修改

### 3.1 数据模型

- 更新 `prisma/schema.prisma`
- 新增：
  - `BrandInviteStatus`
  - `BrandInvite`
- 新增迁移：
  - `prisma/migrations/20260508_brand_invite_first_pass/migration.sql`

### 3.2 后端接口

- 更新 `apps/server/src/modules/brands/brands.controller.ts`
- 更新 `apps/server/src/modules/brands/brands.service.ts`
- 新增：
  - `GET /api/brands/:id/invites`
  - `POST /api/brands/:id/invites`
  - `PATCH /api/brands/:id/invites/:inviteId/revoke`

### 3.3 当前能力

- 创建邀请：
  - 记录 `inviteAccount`
  - 尝试匹配现有用户
  - 记录角色、备注、过期时间、邀请人
- 邀请列表：
  - 展示 `PENDING / REVOKED / EXPIRED`
  - 自动将已过期待处理邀请收口为 `EXPIRED`
- 撤回邀请：
  - 仅允许撤回 `PENDING`

### 3.4 前端页面

- 更新 `apps/web/src/services/brand-growth.ts`
- 更新 `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
- 当前 `team` 页面已支持：
  - 直接添加成员
  - 创建邀请
  - 查看待处理邀请
  - 撤回待处理邀请

## 4. 验证结果

- `GetDiagnostics` 检查通过
- `npm run prisma:generate` 通过
- `npm run prisma:db:push` 通过
- `npm run build:server` 通过
- `npm run build:web` 通过
- `npm run dev:server:stable` 已重新启动 3011 后端

## 5. 当前边界

- 当前邀请流还没有“接受邀请”动作
- 还没有邀请码、邀请链接和邀请确认页
- 邀请审计日志与通知发送机制尚未开始
