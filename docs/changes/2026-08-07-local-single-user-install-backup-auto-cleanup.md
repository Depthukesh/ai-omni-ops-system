# 2026-08-07 local-single-user 升级成功后自动清理安装备份目录

## 背景

在上一轮“升级成功后自动清理 `updates/downloads`、解压目录和 `apply-runs`”修复之后，用户继续反馈 `C` 盘空间仍然没有明显回收。

进一步核对现场截图后确认，实际残留的不是 `updates/` 目录，而是安装目录旁边持续累积的历史备份目录：

- `%LOCALAPPDATA%\Programs\AiOmniOps-backup-*`

这些目录来自升级安装阶段的“先把旧安装目录挪到 backup，再落新版本”流程。它们原本是为了：

- 升级失败时支持自动回滚
- 安装目录替换阶段降低中断风险

但在升级已经成功、且新版本已经通过 API / Web 验活之后，旧备份目录已经不再有保留价值，继续堆积只会持续占用磁盘空间。

## 本次改动

### 1. 升级成功后自动删除安装目录旁边的历史 backup

更新文件：

- `scripts/local-single-user-updater.ps1`

在新版本验活成功并写成 `SUCCEEDED` 后，新增 `Cleanup-InstallBackups`：

- 重新枚举安装目录同级的 `AiOmniOps-backup-*`
- 逐个删除这些历史备份目录
- 如果升级成功当下仍有目录句柄尚未完全释放，则再启动一个隐藏的延迟清理进程继续重试删除

这样下一次升级成功后，不只会清掉下载缓存，也会顺带把 `%LOCALAPPDATA%\Programs` 下旧版本副本一并回收。

### 2. 清理顺序继续保持“成功后才删”

为了不影响回滚能力，当前顺序仍然是：

1. 下载升级包
2. 停机并把当前安装目录移动到 `AiOmniOps-backup-*`
3. 安装新版本
4. 重启并等待 API / Web 验活
5. 只有在验活成功后，才删除这些 backup 目录

这保证了：

- 升级失败时仍然能靠 backup 回滚
- 升级成功后不再无限堆积旧版本副本

## 影响范围

- 影响文件：
  - `scripts/local-single-user-updater.ps1`
- 同步文档：
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`

本次没有改：

- 版本页 UI
- OSS `latest.json` 协议
- 升级入口与交互
- 数据目录、日志目录、存储目录的持久化策略
- 升级失败时的回滚机制

## 防副作用说明

本次删除范围只针对安装目录同级、且命名为 `AiOmniOps-backup-*` 的历史备份目录。

不会删除：

- 当前正在使用的 `%LOCALAPPDATA%\Programs\AiOmniOps`
- `LOCAL_APP_DATA_ROOT/data`
- `LOCAL_APP_DATA_ROOT/storage`
- `LOCAL_APP_DATA_ROOT/logs`
- `LOCAL_APP_DATA_ROOT/cache`
- `LOCAL_APP_DATA_ROOT/backup`

## 验证

本次已完成：

- 静态代码检查：
  - 确认安装 backup 清理只挂在 `SUCCEEDED` 路径
  - 确认回滚路径不会在升级失败时提前删 backup
- PowerShell 语法检查：
  - 解析 `scripts/local-single-user-updater.ps1`
- 发布链验证：
  - 后续重新打包并上传到 OSS，让网站端版本更新拿到修复包

## 结果

升级成功后，系统会同时清理两类临时占用：

1. `updates/` 里的下载与运行缓存
2. `%LOCALAPPDATA%\Programs` 下的 `AiOmniOps-backup-*` 历史备份目录

这样下一次版本更新成功后，用户机器上的旧升级残留会一起回收，`C` 盘空间才会真正释放下来。
