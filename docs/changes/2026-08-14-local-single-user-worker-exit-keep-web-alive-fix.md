# 2026-08-14 local-single-user worker 退出不再带死页面

## 1. 背景

用户在本机更新到 `hotfix-56` 后反馈“页面又打不开了”。

现场排查确认：

- `runtime/local-single-user-runtime.json` 已显示新版本 `local-single-user-win-x64-2026-08-14-hotfix-56 / 0.1.30`
- 本地 API 和 Web 在启动阶段都能成功通过健康检查
- `start-local-single-user-session-*.log` 与 `launcher.log` 多次记录：
  - `worker 已退出，code=1 signal=null，准备关闭其余进程。`

也就是说，页面并不是先启动失败，而是：

1. API 正常启动
2. Web 正常启动
3. 后台 `worker` 进程稍后退出
4. launcher 立即把 API / Web 一并杀掉
5. 最终用户看到“页面打不开”

## 2. 根因

`scripts/local-single-user-launcher.cjs` 之前把任意一个子进程的退出都视为整套 runtime 的致命失败。

这对 `server` / `web` 是合理的，但对只承接后台守护和重任务提交的 `worker` 来说过于激进：

- `worker` 先退，并不意味着当前页面已经不可用
- 但 launcher 仍会立刻执行：
  - 杀掉 API
  - 杀掉 Web
  - 自身退出

于是“后台守护异常”被直接放大成“整个本地工作台打不开”。

## 3. 本次改动

文件：`scripts/local-single-user-launcher.cjs`

### 3.1 worker 退出后改为自动重启

当 `worker` 在启动完成后意外退出时，launcher 现在不会再把 API / Web 一起带死，而是：

- 记录退出日志
- 延迟 2 秒
- 自动重启后台 `worker`

### 3.2 增加受控重启窗口

为避免 `worker` 在异常情况下无限高频重启，本次加入窗口限制：

- 10 分钟内最多自动重启 3 次

超过上限后：

- launcher 会停止继续自动拉起 worker
- 但仍保持当前 API / Web 存活

这样至少不会再把页面整体下线。

### 3.3 保持 server / web 的致命语义

本次没有放松真正会影响页面可用性的退出条件：

- `server` 退出仍然是致命失败
- `web` 退出仍然是致命失败

只对 `worker` 做了单独降级处理。

## 4. 影响面检查

### 4.1 影响范围

- `local-single-user` launcher 的子进程退出策略
- 本地单机版启动完成后的后台守护恢复能力

### 4.2 为避免副作用做的保护

- 不改 API 协议
- 不改数据库 schema
- 不改页面路由或会话逻辑
- 不放宽 `server/web` 的致命退出语义
- 对 `worker` 自动重启增加时间窗口与次数上限

## 5. 验证

已完成：

- 现场确认当前“页面打不开”的直接触发点是 launcher 把 `worker` 退出放大成整套 runtime 退出
- `node --check scripts/local-single-user-launcher.cjs` 通过，确认本次脚本修改无语法错误

未完成：

- 在真实安装态重新启动并观察 `worker` 异常退出后的自动重启效果
- 复核页面在 `worker` 退出场景下仍保持可访问

## 6. 后续关注

本次先修“worker 退出不再带死页面”的启动链问题，页面可用性会先恢复。

如果后续仍观察到 `worker` 本身持续异常退出，还需要继续单独追：

- 哪个后台任务或模块在触发 `worker` 退出
- 退出时是否存在未落到 `worker.err.log` 的运行时上下文
