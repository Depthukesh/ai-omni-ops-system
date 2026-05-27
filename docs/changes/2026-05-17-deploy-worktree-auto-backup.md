# 2026-05-17 自动部署改为远端工作区先备份再收口

## 1. 背景

- 当前 GitHub Actions 已能正常连上服务器并执行 `git fetch origin main`，本次失败点不在拉代码、构建、PM2 重启或健康检查。
- 真正阻断点是服务器部署目录存在未收口改动：`git status --porcelain=v1 -uall` 返回了 `提示词/视频生成提示词/` 下的已修改文件。
- 用户本轮明确要求按“最省事”的方式处理，因此不再让用户手动 SSH 上机清理现场，而是在保留追溯资料的前提下，让工作流自动收口。

## 2. 目标

- 保留服务器脏工作区的追溯资料，避免直接覆盖后完全丢失现场。
- 让 GitHub Actions 在常见“单文件被改、少量未跟踪文件残留”的情况下自动继续部署，减少人工介入。
- 保持现有 `PM2`、端口检查、健康检查与关键 Secret 校验链路不变。

## 3. 本次修正

### 3.1 自动备份远端工作区

- 更新 `.github/workflows/deploy.yml` 中 `runuser -u aiops -- ...` 的 Git 阶段逻辑：
  - 发现 `git status --porcelain=v1 -uall` 非空时，不再立即 `exit 1`
  - 先在运行用户家目录创建 `$HOME/.deploy-worktree-backups/<timestamp>-<shortSha>/`
  - 导出：
    - `git-status.txt`
    - `head-before.txt`
    - `branch.txt`
    - `worktree.diff`
    - `index.diff`
    - `deleted-files.txt`
    - `worktree-files.tar.gz`
    - `latest.txt`

### 3.2 自动收口后继续部署

- 备份完成后，工作流自动执行：
  - `git reset --hard HEAD`
  - `git clean -fd`
- 若自动收口后工作区仍不干净，才真正终止部署，避免在“备份失败或仍有异常残留”时继续往下走。

### 3.3 文档与规则同步

- `docs/git-workflow.md`：
  - 将自动部署规则收口为“默认先检查，若明确采用省事模式，则必须先备份再清理”
- `docs/engineering-standards.md`：
  - 补充受控自动收口模式的最低备份要求
- `docs/development-delivery-checklist.md`：
  - 部署链验证项新增“是否生成远端现场备份/备份路径”
- `docs/site-map.md`：
  - 更新部署链现状说明，写明 `.deploy-worktree-backups/` 备份目录
- `docs/README.md`：
  - 纳入本次变更记录索引

## 4. 影响范围

- `.github/workflows/deploy.yml`
- `docs/changes/2026-05-17-deploy-worktree-auto-backup.md`
- `docs/git-workflow.md`
- `docs/engineering-standards.md`
- `docs/development-delivery-checklist.md`
- `docs/site-map.md`
- `docs/README.md`

## 5. 验证

- `GetDiagnostics`
  - `.github/workflows/deploy.yml`
  - `docs/git-workflow.md`
  - `docs/engineering-standards.md`
  - `docs/development-delivery-checklist.md`
  - `docs/site-map.md`
  - `docs/README.md`
- 工作流静态核对：
  - 发现脏工作区后会生成备份目录，而不是直接失败
  - 备份内容包含 `git status`、`git diff --binary` 和未收口文件快照
  - 自动收口后仍会再次检查工作区是否干净
  - 原有 `npm ci`、`build`、`pm2 startOrReload`、Secret 校验和健康检查未被删除

## 6. 风险与后续

- 本次方案属于“最省事”的自动化折中：能减少用户手动 SSH 清理的成本，但不等于可以忽略服务器异常来源。
- 2026-05-17 首次上线时曾把备份目录放到部署目录同级，结果命中 `/srv` 父目录权限不足；现已改成写入 `aiops` 家目录下的 `.deploy-worktree-backups/`，避免再次因目录权限导致部署提前失败。
- 若后续再次出现来源不明的脚本、可疑二进制或大批量未跟踪文件，仍应按安全事件流程单独隔离和排查，而不是长期依赖自动备份后覆盖。
