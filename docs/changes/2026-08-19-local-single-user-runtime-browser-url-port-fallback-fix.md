# 2026-08-19 local-single-user runtime browserUrl 端口 fallback 收口修复

## 背景

用户升级到 `0.1.57 / hotfix-83` 后，本地工作台实际已经因为端口占用自动避让到 `3002`，但部分链路仍把页面入口默认写成：

- `http://127.0.0.1:3001`
- `http://127.0.0.1:3001/brand-growth`

结果就是：

- 浏览器可能仍被带回旧的 `3001`
- 自启 / 修复脚本会对错误端口做 Web 验活
- 本地明明已经启动成功，却又被用户感知成“升级后打开错页面”或“页面没起来”

## 根因

当前 `local-single-user` 的真实页面入口已经由 launcher 写入：

- `runtime/local-single-user-runtime.json`

其中的：

- `browserUrl`
- `previewUrl`
- `apiHealthUrl`

才是安装态当下真实可访问的入口。

但这次排查确认，仍有几处脚本和服务在未拿到显式环境变量时，继续把 `3001` 当作固定 fallback：

- `AppConfigService.getWebPublicBaseUrl()`
- `local-single-user-updater.ps1`
- `local-single-user-autostart.ps1`
- `repair-installed-local-single-user-autostart.ps1`
- `build-local-single-user-release.cjs` 生成的安装脚本 fallback

## 本次改动

修改文件：

- `apps/server/src/config/app-config.service.ts`
- `scripts/local-single-user-updater.ps1`
- `scripts/local-single-user-autostart.ps1`
- `scripts/repair-installed-local-single-user-autostart.ps1`
- `scripts/build-local-single-user-release.cjs`
- `docs/engineering-standards.md`
- `docs/README.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`

### 1. 后端公开地址优先读取 runtime metadata

`AppConfigService.getWebPublicBaseUrl()` 现在在 `local-single-user` 模式下，会先尝试读取：

- `runtime/local-single-user-runtime.json`

若其中已有 `browserUrl`，则直接返回真实运行地址，而不是再回退到固定 `3001`。

### 2. updater 验活入口改为先吃 runtime metadata

`local-single-user-updater.ps1` 新增 runtime 网络目标解析，等待新版本恢复时会优先读取：

- `apiHealthUrl`
- `previewUrl`
- `browserUrl`

避免端口已经避让到 `3002` 时，updater 还在拿 `3001` 做页面探测。

### 3. 自启与自启修复脚本改为按真实入口验活

`local-single-user-autostart.ps1` 与 `repair-installed-local-single-user-autostart.ps1` 现在都会先读取 runtime metadata，再决定：

- API 健康检查地址
- Web 验活地址
- 最终向用户打印的页面地址

### 4. 安装脚本生成器的 fallback 跟随 runtime metadata

`build-local-single-user-release.cjs` 生成的安装脚本现在会在安装阶段先尝试读取已有 runtime metadata 中的 `browserUrl`，再生成默认的 `previewUrl` fallback，避免安装阶段超时日志或首轮探测继续固化 `3001`。

### 5. 工程规则升级

本次把规则写回文档：安装、升级、自启、修复脚本一律以 runtime metadata 中的 `browserUrl / previewUrl` 为真值，不再把 `127.0.0.1:3001` 当成本地单机版固定入口。

## 影响面检查

### 受影响范围

- `local-single-user` 安装态页面入口判定
- 安装器完成后的页面打开
- 独立 updater 的 Web 验活
- 开机自启后的健康检查
- 自启修复脚本的现场校验

### 为避免副作用做的保护

- 没有改变 launcher 的端口分配机制
- 没有改变 API 默认端口 `3011`
- 没有改变网站版 / 源码运行态的公开地址策略
- 只是把安装态多条脚本链上的“页面真值”统一收口到 runtime metadata

## 验证

计划执行：

- `npm run build:server`
- `npm run local:release:package -- --release-tag <new-tag>`
- 发布物校验脚本
- 重新上传 OSS 并回读 `latest.json`

## 结论

这次修复不是“再改一个打开链接”，而是把安装态所有关键脚本统一拉回同一份页面真值：

- launcher 负责写入真实入口
- 其余链路只负责读取这份真值

这样后续即使默认端口再次被占用并避让，安装、升级、自启、修复链也不会再把用户带回错误端口。
