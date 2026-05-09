# 2026-05-09 个人中心安全设置第一版

## 1. 变更背景

- 个人中心已经拆出 `/orders`、`/works`、`/skills`、`/tasks`、`/team`、`/invites`，但安全设置仍停留在规划状态，用户无法在前台独立确认当前浏览器保存的登录态与会话上下文
- 当前代码已经具备真实 `login / refresh / me / switch-brand / logout` 能力，但尚未开放密码修改、会话列表和多端下线接口，适合先补一个“登录态与会话可视化优先”的最小可用页

## 2. 本次目标

- 新增 `/personal-center/security`
- 让用户可以在个人中心独立查看当前浏览器登录态和会话安全摘要
- 提供品牌上下文切换、token 持有状态查看、自动 refresh 机制说明和退出当前登录态入口
- 不扩 schema，不额外拉大安全设置后端改动范围

## 3. 本次修改

### 3.1 前端路由壳

- 更新 `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- 个人中心二级导航新增：
  - `安全设置`
- 路由壳说明同步补充当前已拆出的任务、订单、作品、技能、安全、团队、邀请七类工作区

### 3.2 安全设置页面

- 新增 `apps/web/src/app/(dashboard)/personal-center/security/page.tsx`
- 当前能力：
  - 校验登录态
  - 读取真实 `/auth/me`
  - 支持品牌上下文切换与退出当前登录态
  - 支持展示账号 ID、手机号、邮箱、会员等级、系统角色
  - 支持展示 access token / refresh token 是否存在与脱敏摘要
  - 支持说明当前前端 `401 -> refresh` 自动续期机制
  - 支持明确展示当前未落地的密码修改、多端管理和会话列表边界

### 3.3 当前边界

- 本页当前聚焦“登录态与会话可视化”，不在本轮直接开放密码修改
- 规划中的密码修改、会话列表、多端下线接口本次未实现
- 后续再补：
  - 密码修改
  - 会话列表
  - 单端 / 全端下线

### 3.4 文档同步

- 更新 `docs/site-map.md`
- 更新 `docs/site-map-mermaid.md`
- 补充个人中心已落地的 `/personal-center/security` 入口和代码定位索引

## 4. 验证结果

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/personal-center/security/page.tsx` 无报错
  - `apps/web/src/app/(dashboard)/personal-center/layout.tsx` 无报错
- `npm run build:web` 通过
- Next 构建已识别新增页面：
  - `/personal-center/security`

## 5. 风险与后续

- 当前页面只能看到浏览器内已保存的 token 持有状态，不能真正查看后端 `UserSession` 列表
- 当前“退出当前登录态”本质上仍是调用 `/auth/logout` 并清空本地会话，不是多端设备级精细控制
