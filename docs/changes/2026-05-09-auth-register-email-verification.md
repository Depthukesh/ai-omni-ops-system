# 注册登录补齐邮箱验证

## 1. 变更背景

- 当前 `/login` 已有真实账号密码登录，但 `/register` 仍是占位页，用户无法真正完成注册。
- 现有 `User` 只有邮箱字段，没有邮箱验证状态与验证码持久化能力，无法支撑“注册验邮箱”。
- 本次要把注册链路补成真正可用版本，同时保持登录继续走账号密码。

## 2. 变更目标

- 实现手机号必填、邮箱验证码必验的真实注册流程。
- 保持登录继续支持手机号 / 邮箱 / 昵称 + 密码，并对未验证邮箱账号做拦截。

## 3. 修改内容

### 3.1 前端

- 将 `apps/web/src/app/(auth)/register/page.tsx` 从占位页改为真实注册表单。
- 新增发送邮箱验证码、60 秒重发倒计时、开发态验证码提示、注册成功后自动登录并跳转个人中心。
- 在 `apps/web/src/services/auth.ts` 新增 `register()` 与 `sendRegisterEmailCode()`。
- 在 `apps/web/src/services/auth-session.ts` 扩展用户登录态，补充 `emailVerified`。

### 3.2 后端

- 在 `apps/server/src/modules/auth/auth.controller.ts` 新增 `POST /api/auth/register/email-code`。
- 在 `apps/server/src/modules/auth/auth.service.ts` 新增验证码发送、验证码消费校验、邮箱合法性校验、SMTP 发信与开发态回显兜底。
- 注册时要求邮箱验证码通过后才创建 `User`、`Brand`、`BrandMember`。
- 登录时对 `email` 已存在但未验证的账号进行拦截，避免绕过注册验证。

### 3.3 数据与配置

- 在 `prisma/schema.prisma` 给 `User` 增加 `emailVerifiedAt`。
- 新增 `EmailVerificationCode` 表用于注册验证码持久化、过期控制与消费标记。
- 新增迁移目录 `prisma/migrations/20260509_email_auth_register_verification/`。
- 在 `.env.example` 增加 SMTP 与验证码过期/冷却配置。
- 在 `apps/server/package.json` 增加 `nodemailer` 依赖。

## 4. 修改意图

- 采用“账号密码登录 + 注册验邮箱”的组合，是为了尽量少改现有登录主链，同时把注册补成真实闭环。
- 验证码优先持久化到数据库，数据库不可用时回退内存兜底，是为了兼容当前项目“数据库主库优先、mock 兜底”的运行状态。
- SMTP 未配置时返回开发态验证码，是为了本地联调不被邮件环境卡住，但生产可直接切换到真实发信。

## 5. 影响范围

- 影响页面：`/register`、`/login`
- 影响接口：`/api/auth/register`、`/api/auth/register/email-code`、`/api/auth/login`
- 影响模块：`AuthModule`、Prisma schema、前端 auth service
- 是否影响已有数据：会给已有非空邮箱用户回填 `emailVerifiedAt`，避免历史账号被误拦截

## 6. 验证方式

- 手工验证：注册页可填写手机号、邮箱、验证码、昵称、密码并发起真实注册。
- 接口验证：`POST /api/auth/register/email-code` 可返回发送结果；`POST /api/auth/register` 可完成注册。
- 日志验证：SMTP 未配置时接口返回开发态验证码，便于本地联调。
- 编译/诊断验证：执行 `npm run prisma:generate`、`npm run prisma:db:push`、`npm run lint:server`、`npm run lint:web`、`npm run build:server`、`npm run build:web`。

## 7. 风险与后续

- 当前只覆盖“注册验邮箱”，还未实现“修改邮箱后二次验证”与“忘记密码”邮件找回。
- SMTP 真实可达性依赖后续填写生产邮件配置；当前本地主要靠开发态回显验证。
- 当前验证码用途只实现了 `register`，后续如要扩展找回密码，可复用同一套表结构继续扩展 `purpose`。

## 8. 相关文件

- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/services/auth.ts`
- `apps/web/src/services/auth-session.ts`
- `apps/server/src/modules/auth/auth.controller.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/common/mock-data.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260509_email_auth_register_verification/migration.sql`
- `.env.example`
