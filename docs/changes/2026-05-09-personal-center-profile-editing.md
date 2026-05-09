# 2026-05-09 个人中心账号资料编辑

## 1. 变更背景

- 个人中心之前已经拆出 `/security`，但该页面仍停留在“只读会话安全页”，用户无法自己修改用户名、头像、手机号等基础资料。
- 用户明确提出：用户中心应增加一个编辑账号的功能，让用户自己设置用户名、头像、电话等信息。
- 现有认证体系已经有真实登录态和 `me/profile` 读取能力，因此最小可用方案是先在个人中心开放“基础资料编辑”，不扩到邮箱改绑与密码修改。

## 2. 本次目标

- 在个人中心为当前登录用户开放基础资料自助编辑能力。
- 允许修改：用户名、头像地址、手机号。
- 保持邮箱继续只读，避免绕过刚完成的邮箱验证注册链路。
- 保留并兼容原有 `/personal-center/security` 的登录态、品牌上下文、token 安全摘要能力。

## 3. 本次修改

### 3.1 后端

- 在 `apps/server/src/modules/auth/auth.controller.ts` 新增 `PATCH /auth/profile`。
- 在 `apps/server/src/modules/auth/auth.service.ts` 新增 `updateProfile()`：
  - 校验用户名非空且长度上限
  - 校验手机号格式
  - 校验头像地址只允许 `http(s)` 或站内路径
  - 校验手机号唯一性
  - 返回更新后的公开用户资料
- 继续复用现有 `User.avatarUrl` 字段，不新增 schema。
- mock 模式下同步支持资料更新与头像字段回写。

### 3.2 前端

- 在 `apps/web/src/services/auth.ts` 新增 `updateProfile()`，更新成功后同步刷新本地登录态里的用户快照。
- 在 `apps/web/src/services/auth-session.ts` 扩展 `AuthUser.avatarUrl`。
- 在 `apps/web/src/app/(dashboard)/personal-center/security/page.tsx` 将页面升级为“账号资料与安全设置”：
  - 支持编辑用户名、手机号、头像地址
  - 支持头像预览与占位首字母
  - 支持邮箱与邮箱验证状态只读展示
  - 继续保留 token 摘要、品牌上下文、刷新状态和退出登录
- 在 `apps/web/src/app/(dashboard)/personal-center/page.tsx` 的“账号与品牌”卡增加头像和“编辑账号资料”快捷入口。
- 在 `apps/web/src/styles/globals.css` 补充资料编辑区与头像预览样式。

## 4. 修改意图

- 把资料编辑能力放在 `/personal-center/security`，是因为该路由已经承接账号与登录态上下文，用户认知成本最低。
- 暂不开放邮箱改绑，是为了避免把“邮箱验证注册”主链再次打断；邮箱改绑应在后续补“二次验证”后再开启。
- 暂不做头像上传文件流，只先开放头像地址输入，是为了先让功能可用，避免把文件上传链路和存储边界一起拉进本轮。

## 5. 影响范围

- 页面：
  - `/personal-center`
  - `/personal-center/security`
- 接口：
  - `GET /auth/me`
  - `GET /auth/profile`
  - `PATCH /auth/profile`
- 数据：
  - 使用既有 `User.avatarUrl`
  - 不涉及 schema 变更

## 6. 验证结果

- `GetDiagnostics`
  - `auth.service.ts`、`auth.controller.ts`、`personal-center/security/page.tsx`、`personal-center/page.tsx`、`auth.ts`、`auth-session.ts`、`personal-center.ts`、`globals.css`、`mock-data.ts` 均无报错
- `npm run build:server` 通过
- `npm run build:web` 通过
- 运行态验证
  - 重启 `3011` 后端稳定实例
  - 重启 `3001` 前端稳定实例
  - 实测注册测试账号后调用 `PATCH /api/auth/profile` 成功，`GET /api/auth/me` 可读回更新后的昵称、手机号和头像地址
  - 实测 `http://localhost:3001/personal-center/security` 页面已返回“账号资料与安全设置”“编辑账号资料”“保存账号资料”等新内容

## 7. 当前边界

- 当前只支持头像地址输入，不支持图片上传。
- 当前邮箱保持只读，不支持邮箱改绑。
- 当前仍未实现：
  - 密码修改
  - 会话列表
  - 多端设备管理
  - 单端 / 全端下线

## 8. 后续建议

- 下一步优先补邮箱改绑与二次验证，再决定是否开放邮箱编辑。
- 若用户后续明确需要头像上传，再补文件上传、站内存储和资源校验链路。
