# 2026-08-12 local-single-user 升级验活 releaseTag 回退修复

## 1. 背景

用户在个人中心点击【立即升级】后，升级弹窗与安装进度条能够走完，但版本页仍停留在 `0.1.19`。

本机现场日志确认：

- 目标包已经下载到 `local-single-user-win-x64-2026-08-12-hotfix-45`
- 安装脚本执行成功
- 新版本重启后，本地 `API / Web` 已恢复健康，升级 trace 中连续出现 `apiStatus=200`、`webStatus=200`
- 但 updater 在验活阶段持续读不到“当前安装版本”的 `releaseTag`
- 最终被误判为升级失败，并自动回滚到 `0.1.19`

## 2. 根因

本轮升级验活依赖三项条件同时成立：

- 目标 `releaseTag` 命中
- 本地 API 健康
- 本地 Web 健康

问题在于：

- updater 默认只从安装目录 `meta/release-manifest.json` 读取 `releaseTag`
- launcher 写入 `runtime/local-single-user-runtime.json` 时没有同步写入 `releaseTag/appVersion`
- 当安装目录 manifest 在升级重启窗口内短时不可读时，即使新版本已经成功启动，updater 也拿不到版本标记，只能误判失败并回滚

## 3. 本次改动

### 3.1 launcher runtime metadata 补版本标记

- `scripts/local-single-user-launcher.cjs`
- 新增读取安装包 `meta/release-manifest.json` 的 helper
- 写 runtime metadata 时同步落入：
  - `release.releaseTag`
  - `release.appVersion`
  - `release.releaseManifestPath`

### 3.2 updater 验活补回退读取

- `scripts/local-single-user-updater.ps1`
- `Wait-ForRuntimeReady` 现在先读安装目录 manifest
- 如果 install manifest 暂时读不到 `releaseTag`，则回退读取 runtime metadata 中的 `release.releaseTag`
- trace 日志新增 `runtimeMetadataReleaseTag`，便于后续定位是 manifest 丢失、metadata 丢失，还是版本不一致

## 4. 影响面检查

### 4.1 受影响范围

- local-single-user launcher
- local-single-user updater
- 本地单机版版本升级链

### 4.2 为避免副作用做的保护

- 没有放宽 API / Web 验活要求
- 没有取消失败自动回滚
- 只是把版本标记从“单一 install manifest”扩成“install manifest 优先，runtime metadata 兜底”

## 5. 验证

- 本机读取 `system-update-status.json`，确认旧问题真实存在：`API / Web` 已恢复但 `installedReleaseTag` 为空
- 静态核对：
  - `scripts/local-single-user-launcher.cjs`
  - `scripts/local-single-user-updater.ps1`
- 后续需要重新发包并让用户再次执行一次应用内升级，验证版本能从 `0.1.19` 正常切到新包

## 6. 后续建议

- 下一包继续保留 updater trace，重点观察：
  - `installedReleaseTag`
  - `runtimeMetadataReleaseTag`
  - `apiStatus`
  - `webStatus`
- 若后续仍出现偶发误判，可继续把 `appVersion` 一并纳入 trace 和版本页诊断信息
