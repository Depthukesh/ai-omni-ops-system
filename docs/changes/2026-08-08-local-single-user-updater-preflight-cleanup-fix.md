# 2026-08-08 local-single-user updater 预清理与启动期清理回收职责修复

## 背景

用户升级到 `hotfix-35` 后反馈：

- 升级失败
- 页面打不开
- 之前积累的升级垃圾目录仍然没有被稳定回收

结合最近几轮改动，问题已经不是“是否有清理逻辑”，而是“清理逻辑放在哪条链路更安全”。

`hotfix-35` 把历史升级垃圾回收补到 launcher 启动期，目标是让新版本一旦启动成功就顺手把垃圾目录清掉。但这条路径会和仍在运行的 updater 共用同一批 `updates/*` 目录，存在时序冲突：

- updater 仍在使用当前 `downloads` / `apply-runs`
- launcher 已经开始启动
- launcher 如果此时直接回收 `updates/*`
- 就可能把当前升级链自己正在使用的目录一起碰掉

这会导致升级链变得不稳定，严重时会把页面带到打不开的状态。

## 本次改动

更新文件：

- `scripts/local-single-user-updater.ps1`
- `scripts/local-single-user-launcher.cjs`

### 1. 垃圾清理职责重新收口到 updater

新增 `Cleanup-StaleUpdateArtifactsBeforeInstall`，在 updater 主流程一开始就执行预清理，目标是：

- 清理历史 `extract-*`
- 清理历史 `downloads/*`
- 清理历史 `apply-runs/*`
- 跳过当前这轮正在使用的：
  - 当前下载目录
  - 当前 apply run 目录

这样可以在真正解压、安装前先腾空间，但不会误删本轮升级正在使用的目录。

### 2. 保留升级成功后的复清

原有成功路径里的：

- `Cleanup-UpdateArtifacts`
- `Cleanup-HistoricalUpdateArtifacts`
- `Cleanup-LegacyLocalInstallerArtifacts`

继续保留，用于在验活成功后做第二轮清理，保证：

- 本轮目录能清
- 历史目录也能清

### 3. 撤掉 launcher 启动期直接碰 updates 目录

`hotfix-35` 新加到 launcher 启动期的：

- `cleanupHistoricalUpdateArtifacts(paths)`
- `cleanupLegacyLocalAppDataArtifacts()`

本次不再在 launcher 主流程中调用。

原因很明确：

- 启动期与 updater 运行期会重叠
- launcher 不适合直接碰当前升级目录
- 更安全的做法是让 updater 在安装前后自己闭环处理

## 影响范围

- 影响文件：
  - `scripts/local-single-user-updater.ps1`
  - `scripts/local-single-user-launcher.cjs`
- 文档同步：
  - `docs/engineering-standards.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/changes/2026-08-08-local-single-user-updater-preflight-cleanup-fix.md`

## 验证

本次已完成：

- PowerShell 语法解析：
  - `scripts/local-single-user-updater.ps1`
- Node 语法解析：
  - `scripts/local-single-user-launcher.cjs`
- 静态代码检查：
  - 确认 updater 会在安装前预清理历史升级残留，但跳过当前下载目录和当前 run 目录
  - 确认 launcher 主启动链不再直接触碰 `updates/*`
- 发布链验证：
  - 重新打包并上传到 OSS，供版本与升级页获取修复包

## 结果

后续 local-single-user 升级链的垃圾回收改为更稳的双阶段：

1. updater 安装前预清理历史残留，优先腾空间
2. updater 成功验活后再复清一次，完成收尾

launcher 不再在启动瞬间直接去删 `updates/*`，避免升级失败后页面打不开。
