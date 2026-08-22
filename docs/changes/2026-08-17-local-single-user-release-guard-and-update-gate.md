# 2026-08-17 local-single-user 发版强校验与升级门禁收口

## 背景

近期 `local-single-user` 的后台【立即升级】连续在多个版本上失败，已确认根因并不只有一个，而是分布在：

- 升级入口前置工作过重
- updater bootstrap 慢机器误判
- 发布包遗漏关键 helper
- OSS 大包发布不稳定
- 发版前缺少对最终发布物的强校验

其中最后一项会放大前面所有问题：即使代码里已经修过，只要发布物里遗漏关键文件，或者 `latest.json` 元数据不完整，客户端看到的仍然是一个“能检测到但不能稳定升级”的坏版本。

因此本轮继续按第一性原理收口，把“发布前强校验”和“远端升级门禁”补齐。

## 本次改动

### 1. 新增发布物强校验脚本

新增文件：

- `scripts/validate-local-single-user-release.cjs`

校验内容包括：

- 发布目录关键文件是否齐全
- `release-manifest.json` 的 `releaseTag / appVersion / copiedPaths` 是否完整
- 发布包内是否包含：
  - `local-single-user-platform.cjs`
  - `local-single-user-runtime.cjs`
  - `local-single-user-launcher.cjs`
  - `local-single-user-updater.ps1`
- 使用发布物内置 `node.exe` 对 `local-single-user-runtime.cjs` 做 `require()` smoke test
- zip 与 `.sha256` 是否一致
- zip 内部是否包含关键条目
- 若提供 `latest.json`，还会检查：
  - `version`
  - `appVersion`
  - `checksumValue`
  - `zipUrl / sha256Url`

### 2. 将强校验接入正式发版链

修改文件：

- `scripts/build-local-single-user-release.cjs`
- `scripts/package-local-single-user-release.cjs`
- `scripts/upload-local-single-user-release-to-oss.cjs`

收口结果：

- 构建 release bundle 后立即校验
- 压缩 zip 后再次校验 zip / sha256 / manifest
- 上传 OSS 前先校验本地 `latest.json`
- 上传 OSS 后再强制回读远端 `latest.json`，确认：
  - `version`
  - `appVersion`
  - `checksumValue`
  - `zipUrl`

只有全部一致，上传脚本才算成功。

### 3. 给升级页加远端版本元数据门禁

修改文件：

- `apps/server/src/modules/system-update/system-update.service.ts`

新增逻辑：

- 远端 `latest.json` 缺少 `releaseTag / appVersion / zipUrl / sha256Url / checksumValue` 时
  - 不再把它当成正常可升级版本
  - `updateAvailable=false`
  - 页面消息直接提示“远端升级版本元数据不完整”

这样可以避免客户端继续推荐一个元数据不完整的坏版本。

## 影响面检查

### 受影响范围

- `local-single-user` 正式发版脚本链
- `latest.json` 上传后校验
- 版本页远端升级可用性判定

### 未改动范围

- 数据库与业务数据
- updater 主安装 / 回滚实现
- 安装器主逻辑
- 页面协议

## 验证

本次至少要求通过：

- `node --check scripts/validate-local-single-user-release.cjs`
- `npm run build:server`
- `node scripts/build-local-single-user-release.cjs`
- `node scripts/package-local-single-user-release.cjs --dry-run --release-tag <tag>`

后续真实验收要求：

1. 用正式脚本链重发新版本
2. 本机从旧版本点击【立即升级】完成升级
3. 笔记本从旧版本点击【立即升级】完成升级

## 当前结论

到这一步，升级链还没有被宣称“已经彻底解决”，但已经把最关键的发版缺口补上：

- 不是“代码里修过就算完成”
- 而是“只有最终发布物、zip、checksum、latest.json、远端回读全部一致，版本才允许进入可升级状态”

这为下一步继续做真实后台升级验收，提供了更可靠的门禁基础。
