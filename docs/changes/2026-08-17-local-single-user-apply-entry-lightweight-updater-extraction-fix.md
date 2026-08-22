# 2026-08-17 local-single-user 升级入口轻量化与单文件 updater 提取修复

## 1. 背景

用户反馈：

- 本机点击 `立即升级` 经常不成功
- 另一台笔记本点击 `立即升级` 也经常不成功
- 通过应用内升级的成功率越来越低

当前现象不是“检测不到新版本”，而是：

- 版本页能正常看到 `最新版本`
- 后端也知道对应的 `downloadedReleaseTag`
- 但点击 `立即升级` 后，版本并没有稳定切到目标版本

## 2. 运行时证据

本轮按 `TRAE-debugger` 开了 `upgrade-apply-fail` 调试会话，并先加埋点再排查。

关键证据包括：

1. `GET /api/system/update/status` 能正常返回：
   - `current.releaseTag=hotfix-63`
   - `latest.tagName=hotfix-66`
   - `downloadedReleaseTag=hotfix-66`
2. 直接调用 `POST /api/system/update/apply` 时，请求不是立即报错，而是卡到超时。
3. 最新 `apply-runs/<runId>/` 目录里只留下：
   - `release-script-source/`

   但没有生成：

   - `local-single-user-updater.ps1`
   - `local-single-user-updater.config.json`
   - `stdout/stderr/trace` 日志

这说明问题发生在：

- **真正 spawn 独立 updater 之前**

## 3. 根因

`SystemUpdateService.applyLatestUpdate()` 在同步请求链里，会先执行：

- `resolveUpdaterScriptContentFromDownloadedRelease(zipPath, runRoot, fallbackSourcePath)`

旧逻辑为了“优先使用目标发布包里的最新版 updater”，采用的是：

- `Expand-Archive` 整包解压整个升级包

而当前升级包体积已经在 250MB 量级。

这会导致：

- `立即升级` 的同步入口请求在真正启动 updater 之前，就先卡在整包解压
- 慢机器、杀软扫描、磁盘繁忙时更容易超时
- 最终表现为“点击立即升级越来越不成功”

也就是说，这次问题不是单纯的前端按钮状态，也不是后面的 PowerShell updater 才失败，而是：

- **升级入口在前置准备阶段做了过重的同步工作**

## 4. 本次改动

文件：

- `apps/server/src/modules/system-update/system-update.service.ts`

### 4.1 不再同步整包解压 250MB 升级包

旧逻辑：

- `Expand-Archive` 整包到 `apply-run/release-script-source`
- 再从解压目录里读取 `local-single-user-updater.ps1`

新逻辑：

- 直接用 `System.IO.Compression.ZipFile.OpenRead()` 打开 zip
- 只提取单个 entry：
  - `app\scripts\local-single-user-updater.ps1`

这样仍然保持：

- **优先使用目标发布包里的 updater**

但不会再把整个升级包同步解开。

### 4.2 实测结果

对同一个 `hotfix-66` 约 250MB 升级包做单文件提取实测：

- `EXTRACT_MS=31`

也就是说，原来会把 apply 入口拖死的“整包预解压”，现在已经收敛成几十毫秒级的单文件提取。

## 5. 影响面检查

### 5.1 受影响范围

- `local-single-user` 应用内升级入口
- 独立 updater 启动前的脚本准备阶段

### 5.2 为避免副作用做的保护

- 没有改升级协议
- 没有改 `.sha256` 校验逻辑
- 没有改独立 updater 主流程
- 没有放弃“优先使用目标发布包中的 updater”这条原则
- 只是把“获取 updater 脚本”的方式从整包解压改成单文件提取

## 6. 验证

已执行：

- `npm run build:server`
- 对真实升级包实测单文件提取：
  - `app\scripts\local-single-user-updater.ps1`
  - `EXTRACT_MS=31`

待用户现场继续验证：

1. 升级到包含本修复的新版本
2. 在本机和另一台笔记本再次点击 `立即升级`
3. 观察是否不再出现“点击后长时间无结果、最终没有切版本”的问题

## 7. 结论

这次问题的关键不在后面的安装脚本，而在升级入口本身做了过重的同步前置工作。

修复后，`立即升级` 会从：

- 先同步整包解压升级包，再尝试启动 updater

收口为：

- 只快速提取目标发布包里的单个 updater 脚本，再尽快进入独立 updater

这能明显提高应用内升级入口在慢机器和磁盘繁忙场景下的成功率。
