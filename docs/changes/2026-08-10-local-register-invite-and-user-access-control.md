# 2026-08-10 本地邀请码注册与用户访问管控第一版

## 背景

- 用户明确要求 `local-single-user` 安装态也必须继续走邀请码注册，不能再保留“本地可直接注册”的分支。
- 同时需要在后台可管理注册用户的使用期限，以及不同用户可使用的功能范围。
- 这类限制如果只做前端隐藏没有意义，必须进入后端账号治理和鉴权层。

## 本次改动

### 1. 本地安装态恢复为邀请码注册

- `apps/server/src/modules/auth/auth.service.ts`
  - 注册配置统一改为邀请码准入。
  - 注册接口统一要求校验邀请码并消费。
  - 当数据库可用且邀请码表为空时，会自动把 `prisma/seed-data/registration-invite-codes.txt` 同步入库，避免本地 SQLite / 新库因为未 seed 而把所有邀请码都判成失效。
- `apps/server/src/modules/local-runtime/local-runtime.service.ts`
  - `local-single-user` 运行态返回的注册准入信息改为 `inviteCodeRequired: true`。
- `apps/web/src/app/home-page-client.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/security/page.tsx`
  - 前台注册页、首页注册态和安全页文案同步回到“邀请码准入”口径，不再把本地安装态描述为免邀请码。

### 2. 用户账号增加使用期限与模块权限字段

- `prisma/schema.prisma`
- `prisma/schema.local.prisma`
- `prisma/migrations/20260810_user_access_control_first_pass/migration.sql`
  - 为 `User` 新增：
    - `accessExpiresAt`
    - `allowedFeatureKeysJson`
- `packages/shared/src/user-access.ts`
  - 新增前后端共用的模块权限枚举、展示名称和序列化工具。

### 3. 后台用户管理支持直接配置

- `apps/server/src/modules/admin/users-admin.service.ts`
  - 后台用户列表/详情/更新接口增加：
    - 使用期限
    - 模块权限
    - 是否不限制模块权限
- `apps/web/src/services/admin.ts`
- `apps/web/src/app/(dashboard)/admin/users-management-panel.tsx`
  - 后台用户管理面板新增：
    - `datetime-local` 使用期限输入
    - 模块权限勾选区
    - “不限制模块权限”开关

### 4. 后端统一执行账号可用性和模块权限拦截

- `apps/server/src/modules/auth/auth.service.ts`
  - 登录、刷新登录态、请求鉴权时统一检查：
    - 用户状态是否禁用
    - 账号是否到期
  - 结合前端自动透传的 `x-app-path`，在后端统一判断当前请求命中的主模块。
  - 如果当前用户没有对应模块权限，则直接返回无权访问错误。
- `apps/web/src/services/http.ts`
  - 前端请求统一补充 `x-app-path` 头，供后端鉴权层识别模块范围。

## 影响范围

- 影响前台注册入口的准入口径。
- 影响后台用户管理页的数据结构与编辑表单。
- 影响登录态校验和各主工作台的访问控制。
- 不改 API 协议以外的工作流，不改数据库以外的业务表结构，不改主业务页面路由。

## 验证

- `node scripts/generate-local-prisma-schema.cjs`
- `npm run prisma:generate`
- `npm --workspace apps/server run build`
- `npm --workspace apps/web run build`

## 风险与保护

- 当前模块权限是按主页面路径收口，不是细粒度到每个按钮；这样影响面更小，也更适合作为第一版稳定落地。
- 若 `allowedFeatureKeysJson` 为空字符串或 `null`，默认仍视为“全量权限”，避免历史老用户被误伤。
- 到期和权限限制都在后端执行，避免用户只靠改前端状态绕过。

## 后续建议

- 后台可继续补“批量延期 / 批量开通模块”的运营入口。
- 若后续需要更细粒度控制，再在主模块权限稳定后补二级能力权限，不建议现在一次做重。
