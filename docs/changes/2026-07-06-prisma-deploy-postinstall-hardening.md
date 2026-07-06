# 2026-07-06 自动部署规避 Prisma postinstall 超时

## 1. 背景

- 本次自动部署失败点不在业务代码编译，也不在 `prisma db push`。
- 远端日志显示失败发生在 `npm ci` 阶段的 `@prisma/client postinstall`：
  - `Prisma schema loaded from prisma/schema.prisma`
  - `Environment variables loaded from .env`
  - `Timeout, server *** not responding.`
- 当前仓库使用 `prisma-client-js` generator，Prisma 6 在安装或生成阶段仍可能下载 Rust 引擎文件；若服务器到 `binaries.prisma.sh` 出网不稳定，就会在 `postinstall` 阶段提前中断整个部署。

## 2. 目标

- 避免 `npm ci` 因 `@prisma/client` 的自动 postinstall generate 提前失败。
- 保留显式的 `npm run prisma:generate`、`npm run prisma:db:push`、`seed`、构建与 PM2 重启链路。
- 允许部署流程透传 Prisma 引擎镜像或代理配置，适配受限网络环境。

## 3. 本次修正

### 3.1 跳过安装阶段自动 generate

- 更新 `.github/workflows/deploy.yml`：
  - `npm ci` 改为在显式环境变量下执行：
    - `PRISMA_SKIP_POSTINSTALL_GENERATE=1`
- 这样 `npm ci` 不再在 `@prisma/client postinstall` 阶段自动触发 Prisma Client 生成。

### 3.2 保留显式 generate，并透传网络配置

- 工作流继续保留后续：
  - `npm run prisma:generate`
  - `npm run prisma:db:push`
- 新增可选环境变量透传：
  - `PRISMA_ENGINES_MIRROR`
  - `HTTPS_PROXY`
  - `HTTP_PROXY`
  - `NO_PROXY`
- 这些变量会从 GitHub Secrets 进入远端 shell，再进入 `runuser -u aiops` 的部署上下文，确保 Prisma CLI 真正运行时也能使用镜像或代理。

### 3.3 增强部署日志可读性

- 若配置了 `PRISMA_ENGINES_MIRROR`，部署日志会明确输出当前正在使用 Prisma 引擎镜像。
- 若只配置了代理，也会输出“通过代理下载”的提示。
- 若两者都未配置，则明确提示当前仍默认直连 `binaries.prisma.sh`。

## 4. 影响范围

- `.github/workflows/deploy.yml`
- `docs/changes/2026-07-06-prisma-deploy-postinstall-hardening.md`

## 5. 预期效果

- 服务器即使偶发在 `@prisma/client postinstall` 阶段拉引擎超时，也不会让 `npm ci` 直接中断。
- Prisma Client 生成被收口到可观察、可重试、可单独定位的 `npm run prisma:generate` 步骤。
- 若后续给 GitHub Secrets 配置 Prisma 镜像或代理，自动部署无需再改代码即可直接生效。

## 6. 风险与后续

- 如果服务器对 `binaries.prisma.sh` 的出网本身完全不通，而又没有配置 `PRISMA_ENGINES_MIRROR` 或代理，那么失败点只会从 `npm ci` 后移到 `npm run prisma:generate`，不会凭空消失。
- 若后续再次出现 Prisma 引擎下载失败，优先检查：
  - GitHub Secrets 中是否已配置 `PRISMA_ENGINES_MIRROR`
  - 远端是否已配置 `HTTPS_PROXY` / `HTTP_PROXY`
  - 服务器对 `binaries.prisma.sh` 的出网连通性
