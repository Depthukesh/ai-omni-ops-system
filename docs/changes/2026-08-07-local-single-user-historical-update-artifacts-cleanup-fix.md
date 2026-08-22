# 2026-08-07 local-single-user 历史升级残留清理修复

## 背景

用户在升级到 `hotfix-33` 后，版本页已显示升级成功，但 `%APPDATA%\AiOmniOps\updates` 下仍然残留大量历史目录：

- `downloads/<releaseTag>`
- `extract-*`
- `apply-runs/*`

现场截图说明，当前实现虽然会在升级成功后触发清理，但实际上只覆盖了“本轮升级”相关目录，没有把历史积累的升级残留一起回收。

这样会导致：

- 每次升级虽然看起来“有清理”
- 但历史旧目录会越来越多
- 长期仍会持续吞掉 C 盘空间

## 根因

`scripts/local-single-user-updater.ps1` 里的 `Cleanup-UpdateArtifacts` 只处理：

- 当前这轮的解压目录
- 当前这轮下载目录
- 当前这轮 `apply-runs/<runId>`（通过延迟清理）

没有额外遍历并删除：

- `updates/downloads/*` 下旧版本目录
- `updates` 根下历史 `extract-*`
- `apply-runs/*` 下更早的历史运行目录

所以“升级成功后自动清理”只删掉了当前这一刀，用户之前多轮升级留下的旧目录会一直留存。

## 本次改动

更新文件：

- `scripts/local-single-user-updater.ps1`

### 1. 成功后新增历史升级残留统一清理

新增 `Cleanup-HistoricalUpdateArtifacts`，在升级成功路径额外执行：

- 清理 `updates` 根目录下所有历史 `extract-*`
- 清理 `updates/downloads/*` 下所有历史版本目录
- 清理 `updates/apply-runs/*` 下所有旧运行目录
  - 当前这轮正在执行的 run root 会跳过，避免自删

### 2. downloads / apply-runs 根目录支持清空后删空目录

当历史子目录全部清掉后，还会继续尝试删除空的：

- `updates/downloads`
- `updates/apply-runs`

避免用户还看到“空壳目录一直堆在那”。

## 影响范围

- 影响文件：
  - `scripts/local-single-user-updater.ps1`
- 文档同步：
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
  - `docs/changes/2026-08-07-local-single-user-historical-update-artifacts-cleanup-fix.md`

## 不影响范围

这次不会动正式长期数据：

- `data/`
- `db/`
- `storage/`
- `cache/`
- 正常运行日志

只针对升级链历史残留目录做回收。

## 验证

本次已完成：

- PowerShell 语法解析：
  - `scripts/local-single-user-updater.ps1`
- 静态代码检查：
  - 确认升级成功后除了本轮目录，还会额外扫描并删除历史 `downloads/*`、`extract-*`、旧 `apply-runs/*`
- 发布链验证：
  - 重新打包并上传到 OSS，供版本与升级页获取修复包

## 结果

后续 local-single-user 升级成功后，不再只是“清当前这一轮”的临时目录，而会把 `%APPDATA%\AiOmniOps\updates` 下历史积累的升级残留统一回收，避免多轮升级后仍持续占用 C 盘空间。
