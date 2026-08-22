# 2026-08-08 local-single-user 安装验活兜底修复

## 背景

手动安装 `hotfix-37` 时，安装窗口显示：

- 已完成复制和自启动配置
- 已启动本地工作台
- 但卡在 `Waiting for local workspace to become ready...`
- 随后报：
  - `Local workspace did not become ready after install`

这类现象会把“安装后的首启验活失败”直接暴露给用户，安装窗口停在失败态，即使实例实际上已经开始拉起，也会让用户误以为整包安装失败。

## 根因

安装脚本由 `scripts/build-local-single-user-release.cjs` 动态生成，其中 `Wait-LocalWorkspaceReady()` 原先主要依赖：

- `LOCAL_APP_DATA_ROOT/runtime/local-single-user-runtime.json`

再从该 metadata 中读取：

- `apiHealthUrl`
- `browserUrl`
- `previewUrl`

这导致两个问题：

1. 如果实例已经在启动，但 metadata 还没来得及写出，安装脚本会持续空等
2. 启动入口原先直接 `Start-Process start-local-single-user.cmd`，对 `.cmd` 的拉起方式不够稳，容易把“命令已触发但窗口很快退出”的现象误判成未启动

## 本次改动

更新文件：

- `scripts/build-local-single-user-release.cjs`

### 1. 安装 ready 判定增加 API / Web 直接健康兜底

`Wait-LocalWorkspaceReady()` 现在会：

- 先尝试读取 `runtime/local-single-user-runtime.json`
- 如果 metadata 还没写好，也继续用默认地址直接探测：
  - `http://127.0.0.1:3011/api/health`
  - `http://127.0.0.1:3001/brand-growth`

只要 API 与 Web 已经真实可用，就直接认定安装成功，不再硬卡 metadata。

### 2. 安装阶段启动入口改为显式通过 `cmd.exe /d /c`

安装脚本在拉起：

- `start-local-single-user.cmd`

时，不再把 `.cmd` 直接交给 `Start-Process`，而是改成：

- `cmd.exe /d /c start-local-single-user.cmd`

这样在 Windows 上的启动行为更稳定，也更接近用户手动双击 `.cmd` 的真实路径。

### 3. 延长安装等待窗口

首次安装后的 ready 等待从：

- `120s`

调整为：

- `240s`

给预构建运行时的首启、数据库初始化和本地环境波动留出更充足的缓冲时间。

## 影响范围

- `scripts/build-local-single-user-release.cjs`
- `docs/engineering-standards.md`
- `docs/README.md`
- `docs/changes/2026-08-08-local-single-user-install-ready-check-fallback-fix.md`

## 验证

本次已完成：

- Node 语法校验：
  - `node --check scripts/build-local-single-user-release.cjs`
- 重新打包 release
- 上传 OSS 并回读 `latest.json`

## 结果

后续 local-single-user 手动安装链不再只依赖 runtime metadata 单点验活。  
只要本地 API / Web 已经真实起来，安装脚本就会认定安装成功并打开页面，避免“窗口里显示安装失败，但实例其实已经拉起”的误判。
