# 2026-08-06 本地单机启动链异常退出调试埋点

## 背景

- `local-single-user` 从 `hotfix-22` 升级失败并自动回滚到 `hotfix-21` 后，现场日志显示 API、worker、Web 都曾成功启动。
- 但稍后再次抓现场时，`3011/3001` 端口与相关 `AiOmniOps` 进程已经全部消失；用户再次手动双击 `start-local-single-user.cmd` 时，launcher 又会报“本地 API 未能成功启动”。
- 现有 `server.log`、`worker.log`、`web.log` 能证明“服务曾经成功拉起”，却无法说明“是谁把已经启动的进程停掉了”。

## 本次调整

### 1. 为 launcher 增加独立调试会话上报

- 新增调试会话文件：
  - `debug-local-runtime-exit.md`
- 新增运行时调试上报：
  - 读取 `.dbg/local-runtime-exit.env`
  - 通过 `TRAE-debugger` 自带 Debug Server 上报 `pre-fix` 事件
- 同一批调试事件也会同步追加到本地 `launcher.log`
  - 即使测试机没有额外跑 Debug Server，仍可以直接回读 `launcher.log` 中的 `[debug:A-E]` 记录

### 2. 启动链关键分支补埋点

- `scripts/local-single-user-launcher.cjs` 现在会额外上报：
  - `stopPreviousRuntime` 命中的 runtime metadata PID 与实际 alive target
  - 每次 `killProcessTree` 的 `pid` 与 `reason`
  - `server / worker / web` 拉起成功时的 pid 与关键 URL
  - `waitForUrl` 的超时、重试成功、进程提前退出
  - child `exit` 事件的 `code / signal`
  - `shutdown`、`main.catch`、`uncaughtException`、`unhandledRejection`
  - runtime metadata 成功写入后的进程组快照

### 3. 本轮不改业务逻辑

- 本次只补调试埋点，不改变 launcher 的既有启动、停机、回滚、复用或健康检查行为。
- 目标是先用一次真实复现把“谁主动停进程 / 哪个 child 先退出 / 健康检查是怎么失败的”收集完整，再做最小修复。

## 影响范围

- 文件：
  - `scripts/local-single-user-launcher.cjs`
  - `debug-local-runtime-exit.md`
- 本次不改数据库结构、不改版本页协议、不改安装包格式。

## 验证

- `node --check scripts/local-single-user-launcher.cjs`
- Debug Server `.dbg/local-runtime-exit.env` 已生成
- `.dbg/trae-debug-log-local-runtime-exit.ndjson` 已清空，等待新一轮真实复现

## 后续

- 基于新埋点打出新的 `local-single-user` hotfix 包。
- 让测试机只做一次最短复现，直接读取 `.dbg/trae-debug-log-local-runtime-exit.ndjson` 判断：
  - 是否 launcher / updater 主动停掉已启动进程
  - 是否 child 先退出并反向触发整组清理
  - 是否 API / Web 健康检查时序误判导致清理分支被执行
