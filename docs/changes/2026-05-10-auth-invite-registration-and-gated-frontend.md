# 前台统一认证入口与邀请码注册

## 1. 变更背景

- 当前前台只有个人中心会强制登录，`/brand-growth`、`/xiaohongshu` 等前台页面仍可直接进入，和统一会员体系不一致。
- 首页 `/` 还是公开门户页，不符合“进入网站先注册/登录”的产品要求。
- 邮箱链路暂时不可用，注册流程不能继续依赖邮箱验证码。

## 2. 变更目标

- 将前台默认入口 `/` 改为统一认证页，默认展示注册表单。
- 前台所有工作台页面统一要求登录后访问，未登录自动回到根页认证入口。
- 后台管理台继续保持 `/admin/login`，并只允许管理员角色账号进入 `/admin`。
- 注册链路从“邮箱验证码”切换为“邀请码一次性消费”。

## 3. 修改内容

### 3.1 前端

- 将 `apps/web/src/app/page.tsx` 改为统一认证入口，默认展示邀请码注册，并支持切换到普通登录。
- 保留 `apps/web/src/app/(auth)/login/page.tsx`、`apps/web/src/app/(auth)/register/page.tsx` 兼容入口，但统一回流到根页认证逻辑。
- 在 `apps/web/src/app/(dashboard)/layout.tsx` 增加前台全局登录拦截；未登录访问前台工作台时跳回 `/?next=...`。
- 将个人中心各页残留的硬编码 `/login` 跳转统一改为根页认证入口。
- 在 `apps/web/src/services/auth.ts` 将注册载荷从 `emailCode` 切换为 `inviteCode`，移除前端发验证码调用。

### 3.2 后端

- 在 `apps/server/src/modules/auth/auth.service.ts` 将注册逻辑切换为邀请码校验与单次消费。
- 移除 `POST /api/auth/register/email-code` 接口及其对应服务逻辑。
- 保持登录继续支持手机号 / 邮箱 / 昵称 + 密码，并保留管理员后台独立登录链路。
- 登录不再阻断历史“邮箱未验证”账号，避免临时停用邮箱验证后影响已有账号使用。

### 3.3 数据与初始化

- 在 `prisma/schema.prisma` 新增 `RegistrationInviteCode` 表，用于正式持久化注册邀请码。
- 新增 `prisma/seed-data/registration-invite-codes.txt`，预置 300 个 6 位邀请码。
- 在 `scripts/seed-demo.cjs` 增加邀请码 seed，`db:init` / `prisma:seed` 会自动将邀请码写入数据库。

## 4. 修改意图

- 根页统一认证入口，避免前台出现“有些页面要登录、有些页面不用登录”的割裂体验。
- 将邀请码落表而不是只放前端常量，保证后端可以可靠消费、记录使用状态并支持后续后台管理。
- 后台继续走独立管理员入口，避免普通用户误进后台或复用前台登录页造成权限判断混乱。

## 5. 影响范围

- 影响页面：`/`、`/brand-growth`、`/xiaohongshu`、`/personal-center/*`、`/login`、`/register`
- 影响接口：`/api/auth/register`、`/api/auth/login`、`/api/auth/me`、`/api/auth/logout`
- 影响数据表：`RegistrationInviteCode`、`User`、`Brand`、`BrandMember`
- 影响脚本：`prisma:seed`、`db:init`

## 6. 验证方式

- 构建验证：`npm run prisma:generate`
- 服务端编译：`npm --workspace apps/server run build`
- 前端编译：`npm --workspace apps/web run build`
- 数据同步：`npm run prisma:db:push`
- 初始化验证：`npm run prisma:seed`
- 数据校验：本地查询 `RegistrationInviteCode`，确认 `total=300`、`consumed=0`
- 页面实测：
  - 访问 `http://localhost:3001/`，默认展示“邀请制注册”
  - 未登录访问 `http://localhost:3001/brand-growth`，自动跳回 `/?next=%2Fbrand-growth`
  - 未登录访问 `http://localhost:3001/admin`，自动跳转 `/admin/login?next=/admin`
  - 访问 `http://localhost:3001/?mode=login`，展示普通登录表单

## 7. 风险与后续

- 当前只完成“邀请码准入 + 一次性消费”，尚未提供后台邀请码管理页。
- 线上部署后需再执行一次 `prisma db push` 与 `prisma:seed`，确保生产库也具备邀请码表和 300 个初始邀请码。
- 若后续恢复邮箱链路，需要明确邀请码注册与邮箱验证的组合关系，避免再次出现双入口分叉。

## 8. 相关文件

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- `apps/web/src/services/auth.ts`
- `apps/server/src/modules/auth/auth.controller.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `prisma/schema.prisma`
- `prisma/seed-data/registration-invite-codes.txt`
- `scripts/seed-demo.cjs`
