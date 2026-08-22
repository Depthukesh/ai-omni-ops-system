# 2026-08-18 local-single-user 安装备份与版本入口韧性修复

## 背景

用户在本机和另一台笔记本上执行本地安装时，都遇到了旧安装目录备份失败：

- 安装器在 `AiOmniOps -> AiOmniOps-backup-*` 阶段报错
- 错误信息指向 `app` 目录仍被其它进程占用
- 报错后，部分机器个人中心里的 `版本与升级` 入口也一起消失

现场进一步确认后发现有两类问题叠加：

1. 安装器虽然会停 runtime metadata 里的 PID，但没有稳定清掉命令行仍引用 `start-local-single-user.cmd` 的 `cmd.exe` wrapper 进程
2. 个人中心虽然已在 helper 层约定 local-single-user 固定保留版本入口，但页面加载逻辑仍在 `getSystemUpdateStatus()` 失败时把入口整体隐藏

## 本次改动

### 1. 安装器停机阶段补清 `start-local-single-user.cmd` wrapper

修改文件：

- `scripts/build-local-single-user-release.cjs`

生成的 `install-local-single-user.ps1` 现在在扫描旧安装根相关进程时，除了：

- runtime metadata 记录的 launcher / server / worker / web PID
- 命令行或可执行路径命中安装根的进程

还会额外匹配：

- 命令行显式引用安装根 `start-local-single-user.cmd` 的进程
- `cmd.exe` 且命令行包含 `start-local-single-user.cmd` 的 wrapper 进程

避免手动双击启动后的 `cmd.exe` 残留继续占用安装目录。

### 2. 旧安装备份失败时不再留下“半安装根”

修改文件：

- `scripts/build-local-single-user-release.cjs`

旧逻辑直接对整个安装根执行 `Move-Item`。一旦其中某个子项仍被占用，PowerShell 可能已经把部分文件先搬走，最终留下：

- 旧安装没有完全进 backup
- 当前安装根只剩下一半文件

新逻辑改为：

- 逐个移动安装根下的顶层条目到 `AiOmniOps-backup-*`
- 一旦中途失败，立即把已移动条目按逆序搬回原位
- 仅在 backup 目录为空时清掉临时 backup 目录

这样即使备份阶段仍失败，也不会把当前安装根撕成半包。

### 3. local-single-user 下版本入口不再依赖升级接口成功

修改文件：

- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`

调整后：

- 只要当前运行态是 `local-single-user`
- 即使 `getSystemUpdateStatus()` 请求失败

个人中心仍继续保留 `版本与升级` 入口，不再把自救入口一起折叠掉。

## 影响面检查

### 受影响范围

- `local-single-user` 安装器备份旧安装目录阶段
- 手动双击启动后残留的 `cmd.exe` wrapper 清理
- 个人中心概览页与二级导航的 `版本与升级` 入口可见性

### 未改动范围

- 升级包下载协议
- updater 主安装 / 回滚链路
- 网站版与源码运行态的版本入口门禁

## 验证

已执行：

- `node --check scripts/build-local-single-user-release.cjs`
- `npm run build:web`
- `npm run build:server`
- `node scripts/package-local-single-user-release.cjs --release-tag local-single-user-win-x64-2026-08-18-install-backup-fix`

结果：

- 构建通过
- 本地正式发布包生成通过
- 生成后的 release manifest 为：
  - `releaseTag: local-single-user-win-x64-2026-08-18-hotfix-78`
  - `appVersion: 0.1.52`
- 额外说明：
  - `hotfix-77 / 0.1.51` 中安装脚本的回滚分支误用了 `Select-Object -Reverse`，在 PowerShell 5 安装现场会直接报错，已由 `hotfix-78` 纠正
  - 新一轮现场又确认 `hotfix-78 / 0.1.52` 仍可能在“停止旧 runtime”阶段残留父级 `cmd.exe` wrapper 与子进程树，导致备份旧安装目录时继续遇到文件占用；当前已由 `hotfix-79 / 0.1.53` 改为把 metadata PID 的父级链一并纳入清理，并在停机后回查确认剩余 PID
  - 再下一轮现场手工验证已确认，真正阻塞旧安装备份的底层信号不是“重试不够”，而是对现有 launcher/server/worker/web 树执行 `taskkill` 会直接返回 `Access is denied`，连 `process.kill(pid, 'SIGTERM')` 也会返回 `EPERM`
  - 因此 `hotfix-80 / 0.1.54` 改为在检测到已有安装目录时，由 `install-local-single-user.cmd` 先请求 Windows elevation，再进入 PowerShell 安装主体；避免继续用同一权限级别在外层硬停旧 runtime

## 结论

这次修复的重点不是“让安装更激进地继续跑”，而是先保证两个底线：

1. 备份旧安装失败时，不能把现有安装根破坏成半包
2. 即使升级状态接口失败，用户仍要看得到 `版本与升级` 入口
