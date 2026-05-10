# 2026-05-10 部署链加固与非 root 运行收口

## 1. 背景

- 服务器出现了运行时异常下载与可疑文件落地，说明“GitHub 仓库干净”并不能代表“服务器运行目录干净”。
- 现有 `deploy.yml` 只负责 `git pull + build + pm2 restart`，没有在部署前阻断服务器工作区脏状态，也默认沿用 `root` 下的 `pm2` 直接启动前后端。
- 线上还暴露出 `3001/3011` 直接对公网监听的风险，放大了 Web 进程被利用后的影响面。

## 2. 目标

- 让自动部署在服务器工作区出现额外文件或未收口改动时立即失败，而不是继续覆盖现场。
- 把生产运行收口到统一 `PM2` 进程定义，避免启动命令散落在工作流里。
- 让前后端生产进程优先绑定 `127.0.0.1`，只允许经 `nginx` 暴露 `80/443`。
- 为后续把生产进程从 `root` 切到普通用户提供固定入口。

## 3. 方案

### 3.1 部署脚本加固

- 更新 `.github/workflows/deploy.yml`：
  - 部署前执行 `git status --porcelain=v1 -uall`
  - 拉取后再次校验工作区是否仍然干净
  - 自动创建并使用 `aiops` 运行用户
  - 统一改为 `runuser -u aiops -- ...` 执行安装、构建和 `pm2 startOrReload`
  - 部署完成后检查 `3001/3011` 是否仍对公网监听
  - 增加本机 `3011` 健康检查和 `3001` 页面存活检查
  - 为部署后探活补充等待窗口与重试，避免 `pm2 startOrReload` 刚返回时应用尚未 ready 就被误判失败

### 3.2 运行配置收口

- 新增 `ecosystem.config.cjs`：
  - `ai-omni-server`
  - `ai-omni-web`
- 把生产启动命令、端口、监听地址统一收口在该文件，避免继续在工作流里散写 `pm2 start ...`

### 3.3 后端监听收口

- `apps/server/src/config/app-config.service.ts` 新增 `getServerHost()`
- `apps/server/src/main.ts` 改为从配置读取 `SERVER_HOST` 和 `PORT`
- 生产默认可显式绑定到 `127.0.0.1`

## 4. 影响范围

- `.github/workflows/deploy.yml`
- `ecosystem.config.cjs`
- `apps/server/src/config/app-config.service.ts`
- `apps/server/src/main.ts`
- `docs/engineering-standards.md`
- `docs/git-workflow.md`
- `docs/development-delivery-checklist.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`

## 5. 验证

- `GetDiagnostics`
  - `apps/server/src/config/app-config.service.ts`
  - `apps/server/src/main.ts`
  - `.github/workflows/deploy.yml`
  - `ecosystem.config.cjs`
- `npm --workspace apps/server run build`
- 部署工作流静态检查：
  - 确认已加入部署前工作区干净校验
  - 确认已切换到 `ecosystem.config.cjs`
  - 确认已加入本机端口与健康检查
  - 确认健康检查不是单次立即失败，而是带有限等待重试

## 6. 补充记录

- GitHub Actions `Run 8` 对应提交 `3ddd9de` 虽然最终标记为失败，但服务器实际已经拉到该提交并由 `aiops` 正常拉起 `ai-omni-server` 与 `ai-omni-web`。
- 失败根因不是工作区脏、权限错误或 `pm2` 启动失败，而是工作流在 `pm2 startOrReload` 后立刻执行 `curl http://127.0.0.1:3011/api/health`，命中了服务尚未完成启动的瞬间窗口。
- 因此本次把“部署后健康检查必须带等待窗口与重试”补进工作流，避免把“服务启动中”误报成“部署失败”。
- 随后 `Run 9` 又暴露出第二个问题：仓库目录已归属 `aiops` 后，工作流前半段仍由 `root` 执行 `git fetch/checkout/status/pull`，触发了 Git 的 `dubious ownership` 保护。
- 因此进一步把部署中的 Git 检查与拉取也一并收口到 `runuser -u aiops -- ...` 内执行，避免 `root` 再直接操作该仓库。
- 再之后 `Run 10` 又暴露出第三个问题：`aiops` 虽然接管了 Git 操作，但其家目录没有 `.ssh`、`known_hosts` 和 Deploy Key，导致 `git fetch` 命中 `Host key verification failed`。
- 因此工作流继续补齐 `aiops` 的 SSH 准备步骤：同步 GitHub 只读 Deploy Key、写入 `known_hosts` 和专用 `ssh config`，让私有仓库拉取在 `aiops` 上下文下也能稳定完成。

## 7. 风险与后续

- 本次先完成“代码与工作流层”的收口，真正的服务器 `aiops` 运行用户切换要在下次恢复上线前再做一次现场验证。
- 如果服务器后续继续保留使用，还需要补：
  - 关闭 `3001/3011` 安全组公网入口
  - 检查 `nginx` 反代仅转发到 `127.0.0.1`
  - 轮换 SSH、数据库、OSS 与 GitHub Secrets
