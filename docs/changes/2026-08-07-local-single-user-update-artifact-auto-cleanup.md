# 2026-08-07 local-single-user 升级成功后自动清理更新临时文件

## 背景

用户反馈本地单机版每次通过“版本与升级”完成更新后，`C` 盘都会继续保留下载下来的升级包和解压临时目录。时间一长，这些文件会持续累积，最终把磁盘空间吃满。

排查后确认，现有升级链虽然已经具备：

- 升级包下载
- SHA256 校验
- 独立 updater 停机替换
- 新版本 API / Web 验活
- 失败自动回滚

但在“升级成功”之后，没有继续回收以下临时产物：

- `LOCAL_APP_DATA_ROOT/updates/downloads/<releaseTag>/`
- `LOCAL_APP_DATA_ROOT/updates/extract-*`
- `LOCAL_APP_DATA_ROOT/updates/apply-runs/<runId>/`

## 本次改动

### 1. 升级成功后自动清理下载与解压目录

更新文件：

- `scripts/local-single-user-updater.ps1`

新增 `Cleanup-UpdateArtifacts` 收口逻辑，在新版本通过 API / Web 验活并写成 `SUCCEEDED` 后，自动删除：

- 当前版本下载目录 `updates/downloads/<releaseTag>`
- 本轮升级解压目录 `updates/extract-*`

这样大体积 zip 和解压产物不会继续留在 `C` 盘。

### 2. 本轮 apply-run 目录改为延迟自清理

因为 updater 自己就是从 `updates/apply-runs/<runId>/` 启动的，运行过程中无法直接删除自身所在目录。

本次改成：

- 升级成功后由 updater 额外启动一个受控的隐藏 `cmd.exe`
- 等当前 updater 进程退出后，再延迟删除本轮 `apply-runs/<runId>`

这样可以把本次升级过程的脚本、副本和日志一并清掉。

### 3. 失败回滚场景先保留现场

为了不影响排障，本次没有把失败场景也强制清空。

当前策略是：

- 升级成功：自动清理本轮更新临时产物
- 升级失败 / 回滚失败：保留现场，方便继续查看日志与 trace

## 影响范围

- 影响文件：
  - `scripts/local-single-user-updater.ps1`
- 文档同步：
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`

本次没有改：

- 版本页 UI
- OSS `latest.json` 协议
- 升级触发入口
- 数据目录 / 存储目录 / 日志目录的持久化策略
- 数据库结构

## 防副作用说明

为了避免把长期目录误删，本次清理严格只针对升级临时目录：

- `updates/downloads/<releaseTag>`
- 本轮 `extract-*`
- 本轮 `apply-runs/<runId>`

不会清理：

- `LOCAL_APP_DATA_ROOT/data`
- `LOCAL_APP_DATA_ROOT/storage`
- `LOCAL_APP_DATA_ROOT/logs`
- `LOCAL_APP_DATA_ROOT/cache`
- `LOCAL_APP_DATA_ROOT/backup`

## 验证

本次已完成：

- 静态代码检查：
  - 确认清理逻辑只挂在 `SUCCEEDED` 路径
  - 确认失败与回滚路径不会误删排障现场
  - 确认本轮 `apply-runs` 采用延迟删除而不是进程内直接删自身目录
- PowerShell 语法检查：
  - 解析 `scripts/local-single-user-updater.ps1`
- 发布链验证：
  - 后续将重新打包并上传到 OSS，让网站通过“版本与升级”获取新包

## 结果

升级成功后，用户机器不会再长期保留本轮升级下载包和解压目录；版本更新主链保持不变，但磁盘占用会明显更可控。
