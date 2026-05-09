# 2026-05-08 个人中心二级路由壳与任务/团队子页

## 1. 变更背景

- 个人中心已经接入真实登录态，但前端仍停留在单页聚合页，无法继续自然承接任务中心、团队协作和后续技能中心
- 为了让个人中心进入可持续扩展阶段，需要先把路由壳和子页面入口搭起来

## 2. 本次目标

- 搭建个人中心二级路由壳
- 优先落地：
  - `/personal-center/tasks`
  - `/personal-center/team`
- 保持现有 `/personal-center` 聚合页可用，不做一次性大拆

## 3. 本次修改

### 3.1 新增路由壳

- 新增 `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- 为个人中心新增二级导航壳，当前已提供：
  - 概览
  - 任务中心
  - 团队协作

### 3.2 新增共享辅助

- 新增 `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- 收口：
  - 登录跳转路径生成
  - 任务状态样式映射
  - 日期格式化
  - 登录态错误识别

### 3.3 新增任务中心页面

- 新增 `apps/web/src/app/(dashboard)/personal-center/tasks/page.tsx`
- 当前能力：
  - 校验登录态
  - 读取真实 `/auth/me` 与 `/tasks`
  - 支持品牌切换
  - 支持失败任务重试
  - 支持搜索任务名称、类型、模型和品牌 ID
  - 任务接口失败时回退演示数据

### 3.4 新增团队协作页面

- 新增 `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
- 当前能力：
  - 校验登录态
  - 读取真实 `/auth/me`
  - 读取真实 `/api/brands/:id/members`
  - 展示当前品牌、当前角色、可访问品牌数
  - 展示真实品牌成员列表
  - 展示当前用户是否可管理成员
  - 支持品牌切换与退出登录
- 后续继续接：
  - 邀请成员
  - 角色修改
  - 审计记录

### 3.5 新增品牌成员接口

- 更新 `apps/server/src/modules/brands/brands.controller.ts`
- 更新 `apps/server/src/modules/brands/brands.service.ts`
- 新增：
  - `GET /api/brands/:id/members`
- 当前能力：
  - 读取真实 `BrandMember`
  - 校验当前登录用户是否属于该品牌
  - 返回当前用户角色
  - 返回是否可管理成员
  - 返回真实品牌成员列表

## 4. 验证结果

- `GetDiagnostics` 检查通过
- `npm run build:web` 通过
- Next 构建已识别新增页面：
  - `/personal-center/tasks`
  - `/personal-center/team`

## 5. 当前边界

- `/personal-center` 根页仍保留原聚合视图，后续继续拆到更细的 profile/points/orders/works 子页
- `team` 页已接入真实成员列表，但邀请成员、角色修改和审计入口仍未继续补
