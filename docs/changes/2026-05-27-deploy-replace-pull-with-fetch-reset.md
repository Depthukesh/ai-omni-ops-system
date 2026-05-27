# 2026-05-27 自动部署改为 fetch + reset，同步远端提交不再依赖 git pull

## 背景

- 本次线上部署失败并不是业务代码构建失败，而是服务器在自动部署时卡在 Git 同步阶段。
- 日志显示：
  - `git fetch origin main` 成功
  - `git pull --ff-only origin main` 失败，并报：
    - `git@github.com: Permission denied (publickey).`
- 这说明服务器并非完全无法访问 GitHub，而是 `pull` 这一步实际走到了 `SSH` 鉴权路径；当前部署用户在该路径上没有稳定可用的仓库读取权限。

## 本次调整

- 更新 `.github/workflows/deploy.yml` 中远端工作区同步逻辑：
  - 保留 `git fetch origin main`
  - 保留 `git checkout main`
  - 将 `git pull --ff-only origin main` 改为：
    - `git reset --hard origin/main`
- 同步把“拉取后工作区检查”文案改为“同步远端提交后工作区检查”，避免误导为仍在依赖 `pull`。

## 为什么这样改

- 当前部署脚本前半段已经成功完成 `fetch`，说明获取远端最新提交这一动作本身是通的。
- 自动部署目标只是把服务器工作区对齐到 `origin/main` 的最新提交，并不需要保留本地分支合并语义。
- 对自动部署来说：
  - `fetch + reset --hard origin/main`
  - 比 `pull --ff-only`
  - 更直接，也更不容易受远端 URL、SSH 配置、全局 git config 或协议改写影响。

## 影响范围

- `.github/workflows/deploy.yml`
- `docs/changes/2026-05-27-deploy-replace-pull-with-fetch-reset.md`

## 预期效果

- 自动部署在服务器端同步代码时，不再额外依赖 `git pull` 的协议与鉴权行为。
- 只要 `git fetch origin main` 成功，后续就能直接把工作区对齐到最新远端提交，减少再次命中 `Permission denied (publickey)` 的概率。
