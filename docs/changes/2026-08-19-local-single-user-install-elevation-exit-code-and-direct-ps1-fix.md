# 2026-08-19 local-single-user 安装提权退出码与直接拉起 PowerShell 主体修复

## 背景

用户在使用安装包覆盖安装已存在的 `local-single-user` 时，安装窗口会先提示：

- `Existing install detected, requesting Windows elevation...`

随后窗口立刻消失，升级没有继续完成。

现场日志只留下：

- `Existing install detected; requesting Windows elevation.`

没有进入真正的 `install-local-single-user.ps1` 主体日志，说明问题发生在安装入口请求 UAC 提权后的第一跳。

## 根因

本次确认有两个问题叠在一起：

### 1. 批处理在括号块内错误读取了旧的 `%ERRORLEVEL%`

旧版 `install-local-single-user.cmd` 在 `if (...)` 代码块里执行提权后，使用：

- `set EXIT_CODE=%ERRORLEVEL%`

批处理在括号块内会提前展开 `%ERRORLEVEL%`，导致：

- 即使提权被拒绝
- 或提权后的第二段安装没有真正跑起来

脚本仍可能把 `EXIT_CODE` 记成旧值 `0`，然后直接正常退出。用户看到的现象就是：

- 弹窗一闪
- 窗口消失
- 安装没有成功

### 2. 提权入口多绕了一层 `cmd.exe -> install-local-single-user.cmd --elevated`

旧版入口在检测到已有安装时，会先提权拉起：

- `cmd.exe /c "<install-local-single-user.cmd> --elevated"`

这条链路对 Windows `cmd /c` 引号、路径解析和回调入口本身更敏感；现场日志也说明第二段并没有稳定进入真正的 PowerShell 安装主体。

## 本次改动

修改文件：

- `scripts/build-local-single-user-release.cjs`

### 1. 安装入口改为启用 delayed expansion

生成的 `install-local-single-user.cmd` 现在会使用：

- `setlocal EnableExtensions EnableDelayedExpansion`

并把退出码读取改成：

- `set "EXIT_CODE=!ERRORLEVEL!"`

确保括号块里的提权返回码读取到的是真实值，不再误把失败当成功。

### 2. 提权后不再回调 `.cmd`，而是直接拉起 PowerShell 安装主体

旧链路：

- 提权后再启动 `cmd.exe`
- `cmd.exe` 再回调 `install-local-single-user.cmd --elevated`

新链路：

- 直接提权拉起 `POWERSHELL_EXE`
- 直接执行 `install-local-single-user.ps1`
- 同时继续把输出 `Tee-Object` 追加到统一安装日志

这样把最脆弱的 `cmd.exe` 中转和自回调跳板去掉，减少引号/路径解析差异造成的第一跳失败。

## 影响面检查

### 受影响范围

- `local-single-user` 覆盖安装时的 UAC 提权入口
- 安装入口退出码记录
- 安装失败时是否能在原窗口正确停住并暴露日志

### 未改动范围

- 安装主体 `install-local-single-user.ps1` 的停机、备份、回滚逻辑
- updater 主链路
- 网站版与源码运行态

## 验证

已执行：

- `node --check scripts/build-local-single-user-release.cjs`
- `npm run build:server`
- `npm run local:release:package -- --release-tag local-single-user-win-x64-2026-08-19-hotfix-83`
- 回读 `.release/local-single-user-win-x64/install-local-single-user.cmd`

结果：

- 语法检查通过
- 服务端构建通过
- 本地发布包重新生成通过
- 新生成的安装入口已确认：
  - 使用 delayed expansion
  - 提权后直接拉起 `install-local-single-user.ps1`
  - 退出码改为读取真实 `!ERRORLEVEL!`

## 结论

这次修复的重点不是“再加一次重试”，而是把安装入口第一跳收口到更稳定的执行模型：

1. 失败必须拿到真实退出码
2. 提权后直接进入 PowerShell 安装主体
3. 失败时原窗口不能再误判成功然后直接消失
