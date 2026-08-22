# 2026-08-07 local-single-user launcher 启动期垃圾回收兜底

## 背景

此前已连续修过两轮升级残留清理：

- 升级成功后清理本轮 `downloads / extract / apply-runs`
- 升级成功后清理历史 `downloads/* / extract-* / 旧 apply-runs/*`

但用户实际升级到 `hotfix-34` 后，`%APPDATA%\AiOmniOps\updates` 下的历史垃圾目录仍然存在。

这说明仅依赖独立 updater 在升级成功路径清理，仍然存在时机缺口：

- 如果当前这轮升级执行的是旧版 updater
- 或者 updater 的清理阶段被跳过 / 被锁定目录阻塞
- 新版本虽然已经能正常启动，但历史垃圾目录仍可能残留

## 本次改动

更新文件：

- `scripts/local-single-user-launcher.cjs`

### 1. launcher 启动时补历史升级残留回收

新版本启动进入 launcher 主流程后，会先对当前 `LOCAL_APP_DATA_ROOT/updates` 做一次 best-effort 清理，主动删除：

- `updates/downloads`
- `updates/apply-runs`
- `updates/extract-*`

这样即使本轮升级阶段的 updater 没有把旧垃圾扫干净，只要新版本能成功启动，launcher 也会补做一次回收。

### 2. launcher 启动时补旧 `%LOCALAPPDATA%\AiOmniOps` 痕迹回收

在 Windows 下，launcher 也会额外清理历史遗留的：

- `%LOCALAPPDATA%\AiOmniOps\updates`
- `%LOCALAPPDATA%\AiOmniOps\downloads`
- `%LOCALAPPDATA%\AiOmniOps\apply-runs`
- `%LOCALAPPDATA%\AiOmniOps\extract`
- `%LOCALAPPDATA%\AiOmniOps\logs\install-local-single-user.log`
- `%LOCALAPPDATA%\AiOmniOps\logs\local-single-user-updater*.log`
- `%LOCALAPPDATA%\AiOmniOps\logs\updater-launcher*.log`

如果目录已空，还会继续尝试删除空目录。

### 3. 保持 best-effort，不影响主启动链

这层回收是“启动兜底”，不是新的阻塞步骤：

- 删除成功则记录 bootstrap log
- 删除失败只记日志，不阻断 launcher 拉起 API / worker / Web

## 影响范围

- 影响文件：
  - `scripts/local-single-user-launcher.cjs`
- 文档同步：
  - `docs/README.md`
  - `docs/changes/2026-08-07-local-single-user-launcher-startup-cleanup-fallback.md`

## 验证

本次已完成：

- 静态代码检查：
  - 确认 launcher 启动时会补清当前 `updates` 历史垃圾目录
  - 确认 launcher 启动时会补清历史 `%LOCALAPPDATA%\AiOmniOps` 安装痕迹
- 发布链验证：
  - 重新打包并上传到 OSS，供版本与升级页获取修复包

## 结果

后续 local-single-user 的垃圾回收不再只依赖独立 updater 单点触发；即使升级阶段漏删了历史目录，只要新版本实际启动成功，launcher 也会在启动期补做一次历史垃圾回收，进一步收紧 C 盘占用问题。
