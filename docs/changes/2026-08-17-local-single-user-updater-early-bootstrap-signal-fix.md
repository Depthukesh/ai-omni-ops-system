# 2026-08-17 local-single-user updater 早期 bootstrap 信号修复

## 背景

在 `hotfix-71 -> hotfix-74` 的本机升级验证中，发现一种仍会击穿旧版本升级页判定的组合问题：

- 当前安装版的 `waitForUpdaterBootstrap()` 仍依赖：
  - `status message`
  - `trace`
  - `stdout`
- 下载到的 updater 脚本要先读完 config，才会写第一条 trace

这意味着只要 updater 在“读取 config 之前”就出现延迟或异常，旧版本升级页就可能在 15 秒窗口内直接报：

- `升级器未成功启动`

即使新版本里已经补了“进程仍存活则继续视为启动成功”的逻辑，旧版本本身仍可能在首次跨版本升级时先误判。

## 本次改动

修改文件：

- `scripts/local-single-user-updater.ps1`

收口方式：

1. 在读取 config 之前，先确定 `TraceLogPath`
2. 在读取 config 之前，先输出一条：
   - `stdout`
   - `trace`
3. 读取 config 成功后，再补写带 `statusFilePath` 的启动 trace

现在 updater 只要真正进入 PowerShell 执行，就会尽早留下 bootstrap 痕迹，降低旧版本升级页在首跳时的误判概率。

## 影响面检查

### 影响范围

- Windows 本地单机 updater 启动期证据采集
- 旧版本升级页的 bootstrap 判定兼容性

### 未改动范围

- 升级安装逻辑
- 回滚逻辑
- 安装器
- 页面协议

## 验证

本次至少要求：

- PowerShell Parser 解析 `scripts/local-single-user-updater.ps1`
- 后续发版时确认 apply run 目录在进入 updater 后能更早出现：
  - `local-single-user-updater.stdout.log`
  - 或 `local-single-user-updater.trace.log`

## 当前结论

这不是替代“进程存活兜底”的修复，而是补齐首跳兼容性：

- 新版本负责把 bootstrap 判定放宽
- updater 本身也负责更早留下启动证据

两者一起，才能降低旧版本跨版本升级时的误判概率。
