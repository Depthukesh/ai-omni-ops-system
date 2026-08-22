# 2026-08-17 local-single-user updater 状态文件写入容错修复

## 背景

在 `hotfix-71 -> hotfix-74` 的本机后台升级验证中，连续两轮 `apply-runs/*` 都出现同一现象：

- `local-single-user-updater.stdout.log` 为空
- `local-single-user-updater.stderr.log` 为空
- `local-single-user-updater.trace.log` 不存在

进一步核查 `apply-run` 目录导出的 `local-single-user-updater.ps1` 后确认：

1. 当前升级链优先使用**下载包内**的 `app/scripts/local-single-user-updater.ps1`
2. `hotfix-74` 包内仍带着旧版 updater
3. 旧版 updater 在启动早期会立即调用 `Write-Status()`
4. `Write-Status()` 若写 `system-update-status.json` 失败，会直接抛错终止整个脚本

这会导致：

- 升级器还没来得及写第一条 trace / stdout
- 页面就只能看到“升级器未成功启动”

## 本次改动

修改文件：

- `scripts/local-single-user-updater.ps1`

### 收口方式

将 `Write-Status()` 从“强依赖成功写入”改为“重试 + 最佳努力写入”：

- 写 `statusFilePath` 前仍会创建目录
- 失败后最多重试 5 次
- 每次失败都会尝试写 trace
- 若最终仍失败：
  - 发送一条 debug event
  - **但不再让 updater 整体退出**

## 影响面检查

### 受影响范围

- Windows 本地单机升级器启动早期的状态文件写入
- `apply-runs/*` 目录的启动证据保留
- 旧版本跨版本升级时的启动稳定性

### 未改动范围

- 升级包校验逻辑
- 解压、替换安装目录逻辑
- 回滚主逻辑
- 页面协议

## 验证

本次至少要求：

- PowerShell Parser 解析 `scripts/local-single-user-updater.ps1`
- 新发版后，后台【立即升级】再次生成 `apply-run` 时，不应再因为 `statusFilePath` 写失败而在入口级直接退出

## 当前结论

这次修复的目标不是“让状态文件一定成功写入”，而是：

- 即使状态文件瞬时被占用或写失败
- updater 也必须继续跑下去，留下 `stdout / trace / debug event`

只有这样，升级失败时我们才能拿到真实原因，而不是再次被“启动失败但没有证据”卡住。
