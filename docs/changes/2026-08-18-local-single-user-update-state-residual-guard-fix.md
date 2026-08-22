# 2026-08-18 local-single-user 升级状态残留兜底修复

## 背景

在本机连续测试 `hotfix-74` 与 `hotfix-75` 的后台【立即升级】时，发现升级链除了 updater 早期退出之外，还存在第二类问题：

- `system-update-status.json` 可能残留在旧的 `DOWNLOADING` / `READY_TO_APPLY`
- `downloadedReleaseTag` 仍指向旧版本
- 页面已看到新版本，但 apply 链路没有真正切到新版本下载包

这会导致：

- 页面显示“升级中”或“正在下载”
- 旧版本工作台先被停掉
- 新版本没有接管成功
- 用户感知为“页面直接打不开”

## 本次改动

修改文件：

- `apps/server/src/modules/system-update/system-update.service.ts`

### 1. 增加旧下载状态残留兜底

在 `reconcilePersistedState()` 中补充：

- 当持久状态停留在 `DOWNLOADING` / `READY_TO_APPLY`
- 且 `downloadedReleaseTag` 与当前远端最新版本不一致时
- 自动将该状态转成 `FAILED`

避免旧下载状态继续污染下一轮升级。

### 2. 增加下载后版本一致性校验

在 `applyLatestUpdate()` 中，下载完成后不再只检查：

- `downloadedZipPath`
- `expectedSha256`

而是要求必须同时满足：

- `phase === READY_TO_APPLY`
- `downloadedReleaseTag === latest.tagName`
- 对应 zip 文件存在

否则直接拒绝继续 apply，并明确提示“当前仍停留在旧版本下载状态”。

### 3. 增加下载超时自动失败

对长时间停留在 `DOWNLOADING` / `READY_TO_APPLY` 且没有新进展的状态，自动转 `FAILED`，避免页面长期被旧状态卡住。

## 影响面检查

### 受影响范围

- 本地单机版后台升级状态机
- 旧版本下载状态残留时的下一轮升级行为
- 页面上的升级状态展示

### 未改动范围

- 升级包下载协议
- updater 解压与安装主流程
- 启动器启动链

## 验证目标

至少满足以下结果：

1. 若 `system-update-status.json` 残留旧版本下载状态，不再继续沿用旧 zip 进入 apply
2. 页面刷新后，应能自动结束旧残留状态
3. 后续重新检查更新时，应以最新版本重新准备安装包
