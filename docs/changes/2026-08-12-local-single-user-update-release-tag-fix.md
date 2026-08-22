# 2026-08-12 本地单机版升级验活 releaseTag 缺失修复

## 背景

- `local-single-user-win-x64-2026-08-12-hotfix-43` 已经包含“素材管理”改版，但本机升级后仍然回到旧版本。
- 排查发现不是页面缓存，也不是新包启动失败，而是升级器验活时要求“当前安装版本标签”与目标 `releaseTag` 一致。
- 之前 `scripts/package-local-single-user-release.cjs` 只会向构建脚本透传 `LOCAL_SINGLE_USER_APP_VERSION`，没有同步透传 `LOCAL_SINGLE_USER_RELEASE_TAG`。
- 结果是新包里的 `meta/release-manifest.json.releaseTag` 为空，导致升级器虽然探测到 API / Web 都已恢复可用，仍判定升级失败并回滚。

## 本次调整

- `scripts/package-local-single-user-release.cjs`
  - 新增 `--release-tag <tag>` 参数
  - 发包时把 `releaseTag` 透传给 `build-local-single-user-release.cjs`
  - 让安装包内 `meta/release-manifest.json.releaseTag` 与 OSS 发布版本标签保持一致

## 影响

- 本地单机版升级验活不再因为 `releaseTag` 为空而误判失败。
- 之后每次正式发包时，都必须让打包命令与上传命令使用同一个版本标签。

## 验证

- 读取本机 `system-update-status.json`，确认旧包失败原因是 `当前安装版本=` 为空
- `node --check scripts/package-local-single-user-release.cjs`
- 重新打包并上传带 `releaseTag` 的本地单机版安装包

