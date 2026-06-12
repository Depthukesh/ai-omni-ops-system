# Debug Session: login-stuck

- Status: OPEN
- Started At: 2026-06-12
- Scope: `apps/web` 登录页点击提交后一直停留在当前页面，按钮保持“登录中...”

## Symptom

- 用户在本地页面 `http://localhost:3011/login?next=%2Fpersonal-center` 输入账号密码后，页面停留在登录页不跳转
- 预期行为：登录成功后跳转到 `next` 指向的页面，失败则给出错误提示并恢复按钮状态

## Initial Hypotheses

1. 登录请求本身没有返回，前端一直卡在等待 Promise resolve/reject。
2. 登录接口返回了非预期响应，前端没有正确进入错误分支。
3. 登录成功后会话读取或 `router.replace()` 之前的某一步抛错，导致界面停在提交态。
4. 本地 `apps/web` 到后端 API 的请求链路没有通，登录页在等待不存在的服务。
5. 登录页提交态被设置为 `true` 后，在某个异常路径没有被恢复。

## Evidence Plan

- 检查登录页提交逻辑、认证服务与 API 代理链路
- 先只加运行时埋点，不直接改业务逻辑
- 复现一次登录并对比 pre-fix / post-fix 日志

## Progress Log

- 2026-06-12: 初始化调试会话，等待注入第一批运行时埋点
- 2026-06-12: 复现确认前端本地运行在 `http://localhost:3011`，浏览器登录请求发往 `http://127.0.0.1:3011/api/auth/login`
- 2026-06-12: 调试日志显示 `app/api/[...path]/route.ts` 将 `/api/auth/login` 再次代理到 `http://127.0.0.1:3011/api/auth/login`，形成前端请求自身的循环
- 2026-06-12: 开始实施最小修复，调整本地前端稳定预览脚本，支持用 `WEB_PORT` 启动到非 `3011` 端口，恢复前后端分离联调
- 2026-06-12: 登录链路恢复后，页面跳转到 `/personal-center` 时出现 `Unterminated string constant`，进一步定位为 `personal-center` 相关页面存在文本编码损坏并破坏了字符串字面量
- 2026-06-12: 已修复 `personal-center/layout.tsx`、`personal-center/invites/page.tsx`、`personal-center/skills/page.tsx` 的关键编译阻塞字符串，本地浏览器已验证登录成功后进入 `/personal-center`
