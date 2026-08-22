# 2026-08-07 local-single-user 升级重启 fallback 修复

## 背景

用户在“版本与升级”页点击升级后，页面会停在“升级进行中”，但既没有弹窗，也没有按预期自动断开再恢复。

现场日志显示，问题不在前端按钮，而在独立 updater 的重启阶段：

- `local-single-user-updater.trace.log`
  - `Skip restart command: missing path C:\Users\...\AppData\Local\Programs\AiOmniOps\start-local-single-user.cmd`
- 后续 updater 仍继续等待 API / Web 验活 180 秒
- 因为实际上根本没有重启命令被执行，所以最终必然写成：
  - `升级后启动验活失败`

也就是说，这次失败不是“升级器没启动”，而是“升级器启动了，但在安装完成后找不到根目录的 `start-local-single-user.cmd`，于是跳过重启，最后空等超时”。

## 本次改动

更新文件：

- `scripts/local-single-user-updater.ps1`

### 1. 升级后重启支持 launcher fallback

原先逻辑只有一种重启方式：

- 调用安装根目录的 `start-local-single-user.cmd`

只要这个文件在升级或回滚后暂时缺失，updater 就会直接：

- 记录 `Skip restart command`
- 不再真正启动任何进程
- 转头开始等待 API / Web 验活

本次改成两级重启策略：

1. 优先走原来的：
   - `start-local-single-user.cmd`
2. 如果缺失，则 fallback 到安装包内的：
   - `bin\node.exe`
   - `app\scripts\local-single-user-launcher.cjs`

由 updater 直接通过 bundled Node 拉起 launcher。

### 2. fallback 仍复用原有运行时环境变量

无论走 `.cmd` 还是 fallback launcher，本次都继续注入：

- `APP_RUNTIME_MODE`
- `LOCAL_APP_DATA_ROOT`
- `AI_OMNI_LOCAL_ROOT`
- `LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=false`

这样不会改变原有 local-single-user 的运行根、资料目录或浏览器自动打开策略。

## 影响范围

- 影响文件：
  - `scripts/local-single-user-updater.ps1`
- 文档同步：
  - `docs/README.md`
  - `docs/changes/2026-08-07-local-single-user-upgrade-restart-fallback-fix.md`

本次没有改：

- 前端版本页交互
- OSS `latest.json` 协议
- 安装器复制逻辑
- 数据目录、日志目录、存储目录持久化

## 防副作用说明

这次不是绕过 launcher，而是把“启动入口缺失时的兜底重启”重新指回同一个 launcher 主链。

所以 fallback 不会改变：

- API / worker / Web 的标准拉起方式
- runtime metadata 写入方式
- 预构建模式
- 既有启动锁和健康检查逻辑

## 验证

本次已完成：

- PowerShell 语法解析：
  - `scripts/local-single-user-updater.ps1`
- 静态代码检查：
  - 确认 `start-local-single-user.cmd` 缺失时会自动 fallback 到 bundled node launcher
  - 确认 fallback 仍复用既有 local-single-user 环境变量
- 发布链验证：
  - 将重新打包并上传到 OSS，供网站版本更新获取修复包

## 结果

升级链在“安装完成后根目录启动入口暂时缺失”的现场下，不会再直接跳过重启并空等超时；updater 会自动 fallback 到 bundled launcher，把新版本真正拉起来，再继续做 API / Web 验活。
