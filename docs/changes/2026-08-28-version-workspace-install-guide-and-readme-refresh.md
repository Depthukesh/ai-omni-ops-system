# 2026-08-28 版本页安装指引与 README 刷新

## 背景

个人中心 `版本与升级` 在标准运行态下虽然已经能展示 Docker 更新命令，但还缺两块关键内容：

1. 系统更新日志在仓库回退模式下容易出现“版本号未记录”。
2. 页面与根 `README.md` 都没有把“安装前电脑需要哪些软件 / 依赖、怎么下载项目、如何安装、如何更新”收成一套可直接照抄的步骤。

这会导致用户虽然已经能打开版本页，却还得回到对话或额外文档里继续找安装命令。

## 本次改动

### 1. 版本页补齐标准运行态安装指南

更新：

- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`

当前标准运行态下的 `版本与升级` 页面新增：

- 安装前需要的软件
  - `Git for Windows`
  - `WSL 2`
  - `Docker Desktop`
- 每个软件的最小安装/验证方法
- 额外依赖提醒
  - GitHub / Docker Hub 网络访问
  - 代理配置
  - 端口占用
  - 首次启动中断后补跑 `db-init`
- 标准运行态安装命令
  - 下载项目
  - 复制 `.env`
  - `docker compose up -d --build ...`
  - `db-init`
  - 默认访问地址与演示账号

### 2. 仓库回退模式的更新日志补版本号

更新：

- `apps/server/src/modules/system-update/system-update.service.ts`

当标准运行态未配置远端 manifest、回退读取仓库 `docs/changes/*.md` 时：

- 更新日志条目现在会带上当前 `appVersion`
- 版本页不再出现整块“版本号未记录”的空提示

前端同时补了兜底展示逻辑：

- 有 `appVersion` 时显示 `版本号 xxx`
- 没有 `appVersion` 但有 `releaseTag` 时显示 `版本标识 xxx`

### 3. 根 README 改成完整安装/更新步骤

更新：

- `README.md`

当前 `README.md` 的 Docker 标准运行态部分，已经明确写出：

- 安装前需要的软件与用途
- 安装完成后的验证命令
- 额外依赖提醒
- 下载项目代码的命令
- 复制 `.env`、启动容器、补跑 `db-init` 的命令
- 默认访问地址与演示账号
- 标准运行态更新命令与 Skill / MCP 同步提醒

## 影响范围

- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `apps/server/src/modules/system-update/system-update.service.ts`
- `README.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`

## 验证

- `npm run build`（`apps/web`）
- `npm run build`（`apps/server`）

## 结果

现在用户在标准运行态下打开 `个人中心 -> 版本与升级`，可以直接看到：

- 当前版本号 / 最近版本记录
- 安装前需要的软件与依赖
- 下载项目与安装系统的命令
- 更新系统的命令

同时 GitHub 根 `README.md` 也已经同步成同一套安装与更新口径，不再需要额外口头补充。
