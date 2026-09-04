# 2026-09-04 版本页部署分支更新指引修复

## 背景

个人中心 `版本与升级` 页面在标准运行态下，之前会优先按远端默认分支或当前解析出的分支生成固定命令：

- `git pull origin <branch>`

这在“生产工作区固定跑发布分支、而不是远端默认分支”的场景下会误导用户。实际执行后，常见结果是：

- `git fetch` 成功，但当前工作区并没有切到本次发布分支
- 后续 `docker compose up -d --build` 仍然用旧代码重建容器
- 页面看起来像“更新成功了，但系统里没有变化”

## 本次修正

- 标准运行态更新命令改为页面内置的 PowerShell 通用升级指令，优先自动识别当前工作区已绑定的上游分支（upstream）
- 页面命令明确拆成：
  - `git fetch --all --prune`
  - `git rev-parse --abbrev-ref --symbolic-full-name "@{u}"` 自动识别 upstream
  - 若没有 upstream，则回退到 `origin/HEAD`
  - `git checkout <自动识别出的部署分支>`
  - `git pull --ff-only <remote> <branch>`
  - `docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build server web`
- 如果当前工作区既没有 upstream、也没有可识别的 `origin/HEAD`，页面会明确提示先手动 `git checkout` 到部署分支
- 更新提醒文案同步改成“按页面生成的 Git 更新命令执行”，不再把升级口径写成固定分支

## 影响面

- 仅影响个人中心 `版本与升级` 页面在标准运行态下的 Git 更新指引
- 不影响 local-single-user 自动升级
- 不影响业务数据、数据库结构和 OpenClaw 链路

## 验证重点

- 页面是否展示 PowerShell 通用升级指令
- 页面命令是否先自动识别部署分支，再 `checkout` + `pull --ff-only`
- 发布分支场景下，按页面命令执行后是否能真正拉到最新提交并重建容器
