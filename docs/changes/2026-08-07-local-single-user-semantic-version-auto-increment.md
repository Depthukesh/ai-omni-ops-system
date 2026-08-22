# 2026-08-07 本地单机版语义版本号自动递增

## 背景

- 版本与升级页面顶部一直显示 `0.1.0`，虽然下面的 `hotfix-xx` 打包名每次都在变化。
- 原因不是页面缓存，而是发布链始终把主版本号固定读取自根 `package.json`，导致每次热修复发包都沿用同一个语义版本。

## 本次调整

### 1. 发包时自动生成下一个语义版本

- `scripts/package-local-single-user-release.cjs`
  - 读取 `.release/artifacts/latest.json` 里的上一版 `appVersion`
  - 以根 `package.json` 的版本为基线
  - 每次新的 local-single-user 发包自动把 patch 版本加一
  - 例如：`0.1.0 -> 0.1.1 -> 0.1.2`

### 2. 发布物 manifest 记录当前语义版本

- `scripts/build-local-single-user-release.cjs`
  - 新增 `release-manifest.json.appVersion`
  - 安装包自身携带本次真正的语义版本，不再只依赖根 `package.json`

### 3. OSS latest.json 与安装态版本保持同一来源

- `scripts/upload-local-single-user-release-to-oss.cjs`
  - 上传时优先读取发布物 `meta/release-manifest.json` 中的 `appVersion`
  - 保证页面“当前版本”和“最新版本”使用同一条语义版本来源

### 4. 当前安装态版本优先读取 release manifest

- `apps/server/src/modules/system-update/system-update.service.ts`
  - `current.version` 改为优先读取 `release-manifest.json.appVersion`
  - 这样升级成功后，页面顶部会显示安装包真正携带的语义版本

## 影响

- 本次不改变 `hotfix-xx` 打包名规则。
- 版本页仍保持：
  - 主行显示语义版本号
  - 副行显示具体打包名称

## 验证

- `node --check scripts/package-local-single-user-release.cjs`
- `node --check scripts/build-local-single-user-release.cjs`
- `node --check scripts/upload-local-single-user-release-to-oss.cjs`
- `npm run build:server`

## 预期结果

- 后续每次新的 local-single-user 发版，页面顶部主版本号都会跟着增长。
- 示例：
  - 当前 `hotfix-25` 之后的下一版会显示为 `0.1.1`
  - 再下一版显示为 `0.1.2`
