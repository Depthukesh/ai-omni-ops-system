# 2026-08-07 local-single-user 升级磁盘压力与回滚收紧

## 背景

用户在升级到 `hotfix-30` 时，现场出现：

- 安装脚本 `Copy-Item` 报 `磁盘空间不足`
- `%LOCALAPPDATA%\Programs\AiOmniOps` 已经被先移动到新的 `AiOmniOps-backup-*`
- 新版本复制中断后，本地页面也随之无法打开

这说明当前升级链还存在两个缺口：

1. 升级前虽然会在成功后清理 backup，但如果机器上已经累积了很多历史 `AiOmniOps-backup-*`，复制新版本前仍可能先被磁盘空间卡死
2. updater 调用 `install-local-single-user.ps1` 后，没有显式校验该子进程退出码；一旦安装脚本非 0 退出，升级器不该继续往后跑，而应该立即转入失败回滚

## 本次改动

更新文件：

- `scripts/local-single-user-updater.ps1`

### 1. 升级开始前先预清理历史 backup

新增 `Cleanup-StaleInstallBackups`，在正式解压和替换安装目录之前，先尝试删除已有的历史：

- `%LOCALAPPDATA%\Programs\AiOmniOps-backup-*`

如果当下仍有句柄未释放，则再安排一个延迟清理进程继续重试删除。

这样可以在真正复制新版本前，先把历史备份占用的磁盘空间腾出来，减少 `Copy-Item` 因空间不足而中断的概率。

### 2. 安装脚本非 0 退出时立即判定失败并回滚

新增对 installer 子进程退出码的显式检查：

- `install-local-single-user.ps1` 执行完成后读取 `$LASTEXITCODE`
- 只要退出码不是 `0`，立即抛错
- 让 updater 直接进入既有的失败回滚链路

这样即使安装脚本中途因为：

- 磁盘空间不足
- 文件复制失败
- 安装目录写入失败

而退出，系统也不会继续把它当成“安装成功”，而是会马上恢复旧版本。

## 影响范围

- 影响文件：
  - `scripts/local-single-user-updater.ps1`
- 文档同步：
  - `docs/README.md`
  - `docs/changes/2026-08-07-local-single-user-upgrade-disk-pressure-rollback-tightening.md`

本次没有改：

- 版本页 UI
- OSS `latest.json` 协议
- 升级入口与按钮交互
- 数据目录、日志目录、存储目录持久化

## 防副作用说明

本次预清理只针对历史 `AiOmniOps-backup-*`，不会动：

- 当前正在使用的 `%LOCALAPPDATA%\Programs\AiOmniOps`
- `LOCAL_APP_DATA_ROOT/data`
- `LOCAL_APP_DATA_ROOT/storage`
- `LOCAL_APP_DATA_ROOT/logs`
- `LOCAL_APP_DATA_ROOT/cache`
- `LOCAL_APP_DATA_ROOT/backup`

同时，当前升级过程真正用于回滚的新 backup 仍然会在本轮安装时重新创建，因此不会削弱当前版本更新的回滚能力。

## 验证

本次已完成：

- PowerShell 语法解析：
  - `scripts/local-single-user-updater.ps1`
- 静态代码检查：
  - 确认升级前会先预清理旧 backup
  - 确认 installer 非 0 退出会立即进入失败回滚路径
- 发布链验证：
  - 将重新打包并上传到 OSS，供网站版本更新获取修复包

## 结果

升级链在“磁盘被历史 backup 挤占”这类现场下会更稳：

1. 先主动回收旧 backup，减少空间压力
2. 一旦安装脚本中途失败，立即回滚旧版本

这样即使升级失败，也不应该再把用户留在“旧版本已挪走、新版本又没装完整、页面也打不开”的半安装状态。
