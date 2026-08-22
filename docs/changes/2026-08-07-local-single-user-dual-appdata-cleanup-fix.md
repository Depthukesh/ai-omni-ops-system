# 2026-08-07 local-single-user 双 AppData 升级残留清理修复

## 背景

用户反馈本地单机版每次升级后，C 盘会在两个目录同时残留升级相关文件：

- `%APPDATA%\AiOmniOps`
- `%LOCALAPPDATA%\AiOmniOps`

时间一长，两个目录都会持续占用磁盘空间，而且此前“升级成功后自动清理”的实现并没有把这两处都收干净。

结合当前代码链路，实际存在两条来源：

1. 正式 local-single-user 运行时与升级临时目录，设计上位于：
   - `%APPDATA%\AiOmniOps`
2. 安装器 `install-local-single-user.cmd` 自己的日志目录，历史上单独写到了：
   - `%LOCALAPPDATA%\AiOmniOps\logs`

这导致用户会看到“两份 AiOmniOps 目录都在长”，而此前 updater 成功后的清理只覆盖了主资料目录下的：

- `updates/downloads`
- 解压目录
- `apply-runs`
- `AiOmniOps-backup-*`

没有把历史 `%LOCALAPPDATA%\AiOmniOps` 安装/升级痕迹一起回收。

## 本次改动

更新文件：

- `scripts/build-local-single-user-release.cjs`
- `scripts/local-single-user-updater.ps1`

### 1. 安装器日志统一回到主资料目录

生成的 `install-local-single-user.cmd` 里，安装日志目录从：

- `%LOCALAPPDATA%\AiOmniOps\logs`

改为：

- `%APPDATA%\AiOmniOps\logs`

这样后续新包不会再继续制造第二份 `%LOCALAPPDATA%\AiOmniOps` 日志目录。

### 2. 升级成功后增加对历史 `%LOCALAPPDATA%\AiOmniOps` 的清理

在 updater 成功路径新增 `Cleanup-LegacyLocalInstallerArtifacts`，会额外清理：

- `%LOCALAPPDATA%\AiOmniOps\updates`
- `%LOCALAPPDATA%\AiOmniOps\downloads`
- `%LOCALAPPDATA%\AiOmniOps\apply-runs`
- `%LOCALAPPDATA%\AiOmniOps\extract`
- `%LOCALAPPDATA%\AiOmniOps\logs\install-local-single-user.log`
- `%LOCALAPPDATA%\AiOmniOps\logs\local-single-user-updater*.log`
- `%LOCALAPPDATA%\AiOmniOps\logs\updater-launcher*.log`

如果 `logs/` 或根目录在清理后已经为空，还会继续尝试删空目录。

### 3. 不影响长期运行资料目录

这次新增清理只针对“安装/升级遗留痕迹”，不会动：

- `%APPDATA%\AiOmniOps\data`
- `%APPDATA%\AiOmniOps\db`
- `%APPDATA%\AiOmniOps\storage`
- `%APPDATA%\AiOmniOps\cache`
- `%APPDATA%\AiOmniOps\logs` 中正常运行日志

## 影响范围

- 影响文件：
  - `scripts/build-local-single-user-release.cjs`
  - `scripts/local-single-user-updater.ps1`
- 文档同步：
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
  - `docs/changes/2026-08-07-local-single-user-dual-appdata-cleanup-fix.md`

## 验证

本次已完成：

- PowerShell 语法解析：
  - `scripts/local-single-user-updater.ps1`
- 静态代码检查：
  - 确认安装器日志已从 `%LOCALAPPDATA%\AiOmniOps\logs` 改为 `%APPDATA%\AiOmniOps\logs`
  - 确认升级成功后会额外清理历史 `%LOCALAPPDATA%\AiOmniOps` 安装/升级痕迹
- 发布链验证：
  - 重新打包并上传到 OSS，供版本与升级页获取修复包

## 结果

后续 local-single-user 升级链会统一到一条主资料目录：

- 正式运行资料继续保留在 `%APPDATA%\AiOmniOps`

同时不再继续在 `%LOCALAPPDATA%\AiOmniOps` 制造新的安装日志目录；旧版本留下的本地安装/升级痕迹，也会在升级成功后一起清理，避免 C 盘双份堆积。
