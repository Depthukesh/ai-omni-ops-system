# 2026-08-04 local-single-user 重复启动复用与启动锁修复

## 为什么改

- 用户现场验证时，第一次 `start-local-single-user.cmd` 可以把页面拉起来，但关闭浏览器后再次双击同一入口，页面又会打不开。
- 排查后确认，问题不在“浏览器关闭”，而在启动链本身：
  - launcher 每次执行前都会准备停旧实例、重建运行时目录
  - 如果第一次启动已经成功，重复双击仍会触发一次新的重启风险
  - 如果第一次启动还没完全写完 `runtime/local-single-user-runtime.json`，第二次启动会并发改写 `runtime/web-standalone-current`，把正在运行的 Web 目录撞坏
  - `start-local-single-user.cmd` 还会把所有启动输出都重定向到同一个 `start-local-single-user.log`，并发启动时容易直接抢锁失败

## 本次范围

- `scripts/local-single-user-launcher.cjs`
- `scripts/build-local-single-user-release.cjs`
- `docs/engineering-standards.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`

## 这次改了什么

### 1. 已健康运行时直接复用现有实例

- launcher 启动时会先读取现有 `runtime/local-single-user-runtime.json`
- 如果发现当前 server / web（以及已有 worker）都还活着，且 API / Web 健康检查都通过：
  - 不再停旧实例
  - 不再重建 `runtime/web-standalone-current`
  - 直接输出当前入口并复用现有实例

### 2. 首次启动未完成时增加启动锁

- launcher 现在会在 `runtime` 目录下写 `local-single-user-launcher.lock`
- 如果第二次启动赶在第一次启动尚未完成时进来：
  - 不会再并发进入重建流程
  - 会先等待当前启动完成
  - 如果等待期间现有实例已经健康可用，就直接复用
  - 如果超过受控时限仍未就绪，再明确报“本地工作台正在启动中，请稍候再试”

### 3. 每次启动写独立会话日志

- `start-local-single-user.cmd` 现在除了继续维护总览 `start-local-single-user.log`
- 还会为每次启动单独生成：
  - `start-local-single-user-session-*.log`
- 避免第一次启动尚未结束时，第二次启动因为同一个日志文件被占用而直接失败

## 影响范围与防副作用说明

- 这次没有改安装目录、资料目录、数据库 schema、升级页 UI 或 OSS 协议
- 主要是把 `start-local-single-user.cmd` 做成真正幂等：
  - 已经运行时不再冒险重启
  - 启动中时不再并发踩同一份运行时目录
  - 并发启动时不再争抢同一个日志文件

## 验证

- 重新生成 `.release/local-single-user-win-x64`
- 本地隔离运行时验证：
  - 首次启动会生成独立 `start-local-single-user-session-*.log`
  - 重复启动不再因共享 `start-local-single-user.log` 被占用而直接失败
- 代码级复核：
  - launcher 已新增健康实例复用
  - launcher 已新增启动锁等待逻辑

## 下一步

- 重新打包并上传带本次修复的新安装包
- 在用户机器上重点验证两条真实链路：
  - 页面已打开时再次双击 `start-local-single-user.cmd`
  - 电脑重启后再次进入本地工作台
