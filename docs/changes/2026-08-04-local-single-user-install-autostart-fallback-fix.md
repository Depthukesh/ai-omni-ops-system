# 2026-08-04 local-single-user 安装阶段自启动 fallback 误报失败修复

## 为什么改

- 用户在安装 `local-single-user` 新包时，程序目录已经正常复制到本地，但安装流程仍在“配置开机自启动”这一步被判定为失败。
- 现场日志显示：计划任务安装被系统拒绝后，脚本本来已经降级到“当前用户启动文件夹快捷方式”方案，但终端仍被 PowerShell 报成 `NativeCommandError`。

## 本次范围

- `scripts/local-single-user-autostart.cjs`
- `docs/README.md`

## 这次改了什么

### 1. 修正安装态 fallback 的输出通道

- `local-single-user-autostart.cjs` 在计划任务安装被拒绝时，原本使用 `console.warn(...)`
- 这会把“正在 fallback 到启动文件夹快捷方式”的提示写到 `stderr`
- `install-local-single-user.ps1` 通过 PowerShell 调用 `install-autostart.cmd` 时，会把这类 `stderr` 文本视作 native command 错误记录，进而把整个安装流程判成失败
- 现在改为 `console.log(...)`，让这条“预期内的降级提示”走 `stdout`

## 影响范围与防副作用说明

- 这次没有改启动链、升级链、版本页或安装目录结构
- 只修安装阶段“自启动配置失败后的降级提示”被误报成致命错误的问题
- 如果当前机器允许注册计划任务，行为不变
- 如果当前机器不允许注册计划任务，安装会继续改为写入当前用户 Startup 快捷方式，而不会再把整个安装中断

## 验证

- 静态核对 `scripts/local-single-user-autostart.cjs`，确认 fallback 提示改为 `console.log`
- 重新打包发布物时会将修复后的 autostart wrapper 带入新安装包

## 下一步

- 基于这次修复重新打包并上传新的 OSS 安装包
- 让用户直接下载新包重新安装，确认“计划任务被拒绝”场景下也能正常装完
