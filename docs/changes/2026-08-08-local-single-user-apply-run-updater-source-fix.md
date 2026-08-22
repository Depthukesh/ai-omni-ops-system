# 2026-08-08 local-single-user apply-run updater 来源修复

## 背景

在定位 `hotfix-36` 升级失败现场时，发现一个关键事实：

- `apply-runs/<runId>/local-single-user-updater.ps1`
- 并不是来自刚下载的 `hotfix-36` 发布包
- 而是当前已安装版本自己内置的旧 updater 脚本

这会导致一个结构性问题：

1. 当前版本发起升级时，会先把自己的旧 updater 复制到 apply-run
2. 即使 OSS 上已经发布了“修过的 updater”
3. 升级链实际运行的仍然是旧 updater
4. 结果就是：
   - 新修复的 updater 永远无法通过应用内升级真正生效
   - 每次都像是在用旧升级器升级新包

`hotfix-36` 现场里，apply-run 目录中的 updater 脚本内容就直接证明了这一点。

## 根因

`apps/server/src/modules/system-update/system-update.service.ts` 在 `applyLatestUpdate()` 里，原先直接从：

- `current.projectRoot/scripts/local-single-user-updater.ps1`

读取脚本并写入 apply-run。

而 `current.projectRoot` 指向的是**当前已安装版本**的运行目录，所以 apply-run 永远只会拿到当前版本的 updater，而不是目标新版本的 updater。

## 本次改动

更新文件：

- `apps/server/src/modules/system-update/system-update.service.ts`

### 1. apply-run 优先从刚下载的发布包提取 updater

新增 `resolveUpdaterScriptContentFromDownloadedRelease()`：

- 先对当前已经下载好的 zip 做一次临时解压
- 优先读取其中的：
  - `app/scripts/local-single-user-updater.ps1`
- 再把这个脚本写入 apply-run 目录执行

这样 apply-run 运行的就是“目标发布包自带的最新 updater”。

### 2. 保留旧路径作为 fallback

如果当前网络包或解压阶段确实异常，仍会退回到原来的：

- `current.projectRoot/scripts/local-single-user-updater.ps1`

避免升级链因为 staged updater 提取失败而直接中断。

### 3. 清理解压中间目录

临时提取 updater 的目录只用于 staging：

- 读取完最新 updater 后立即删除

不会长期残留在 apply-run 中。

## 影响范围

- 影响文件：
  - `apps/server/src/modules/system-update/system-update.service.ts`
- 文档同步：
  - `docs/engineering-standards.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/changes/2026-08-08-local-single-user-apply-run-updater-source-fix.md`

## 验证

本次已完成：

- TypeScript 构建校验：
  - `apps/server`
- 静态代码检查：
  - 确认 apply-run 阶段会优先从下载包中提取最新 updater
  - 确认 fallback 仍保留，避免 staging 失败直接打断升级链

## 结果

后续 local-single-user 应用内升级链不再被“当前安装版本自带的旧 updater”锁死。  
只要目标发布包里带了修复版 updater，apply-run 就会优先执行它，升级器本身的修复也终于可以通过版本更新真正落到用户机器上。
