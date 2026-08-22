# 2026-08-06 local-single-user 安装备份目录占用恢复

## 背景

- 测试机安装 `hotfix-20` 时，安装器在“将旧安装目录挪到 backup”阶段失败：
  - `Failed to move existing install to backup`
  - `C:\Users\...\AppData\Local\Programs\AiOmniOps\app` 正由另一进程使用
- 现场日志同时显示：
  - `No runtime metadata PIDs found; proceeding without explicit task kill.`

这说明旧安装目录并不是完全空闲，而当前安装器只会根据 `runtime/local-single-user-runtime.json` 里的 PID 停进程；一旦 metadata 丢失或过期，仍在占用安装目录的 `node.exe` / `cmd.exe` / 其他命中旧安装路径的进程就不会被处理。

## 本次调整

- `scripts/build-local-single-user-release.cjs`
- 安装脚本生成逻辑新增两层保护：
  1. 在原有 runtime metadata PID 停止逻辑之外，再额外扫描 `Win32_Process`
     - 只要进程的 `CommandLine` 或 `ExecutablePath` 命中当前旧安装目录，就纳入待停止列表
  2. 旧安装目录移动到 backup 时增加 3 次短重试
     - 避免刚停止进程后文件句柄尚未完全释放，就立即 `Move-Item` 失败

## 影响范围

- 只影响 `install-local-single-user.cmd` / `install-local-single-user.ps1` 的旧安装备份阶段
- 不改程序运行时协议，不改升级元数据结构，不改 API / Web 端口与业务逻辑

## 验证

- `node --check scripts/build-local-single-user-release.cjs`
- 重新打包本地单机版发布物，确认新的 `install-local-single-user.ps1` 已包含：
  - `Win32_Process` 安装目录占用扫描
  - `Move-ExistingInstallToBackup` 3 次重试
