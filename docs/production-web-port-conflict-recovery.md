# 线上前端 3001 端口冲突排障手册

## 1. 适用场景

- GitHub Actions 显示部署成功，但线上页面还是旧版本。
- 前端页面偶发白屏，或者出现 `Application error: a client-side exception has occurred`。
- `pm2 info ai-omni-web` 显示 `restarts` 很高、`uptime` 很短。
- `pm2 logs ai-omni-web` 出现 `EADDRINUSE: address already in use 127.0.0.1:3001`。
- 本机 `3001` 和外网 `17ai.site` 返回的 `brand-growth page-*.js` hash 不一致，或始终停留在旧 hash。

## 2. 这类问题的真实根因

### 2.1 最常见根因

- 生产环境应由 `aiops` 用户下的 `pm2` 统一管理 `ai-omni-web`。
- 如果之前有人在 `root` 会话里手动执行过 `npm start`、`next start`，或者用 `root` 下的 `pm2` 拉起过旧前端进程，就可能残留一个独立的 `next-server`。
- 这个残留进程会持续占用 `127.0.0.1:3001`。
- GitHub Actions 虽然已经把代码和 `.next` 构建到最新版本，但 `aiops` 下的 `pm2 restart ai-omni-web` 无法抢到端口，于是不断重启失败。
- 外网 `nginx -> 127.0.0.1:3001` 实际打到的仍然是旧进程，所以页面表现为“部署成功但还是旧版”。

### 2.2 典型症状

- `pm2 logs ai-omni-web --lines 200 --nostream`

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:3001
```

- `ss -ltnp | grep 3001`

```text
LISTEN 0 511 127.0.0.1:3001 0.0.0.0:* users:(("next-server",pid=841977,fd=18))
```

## 3. 标准排查流程

### 3.1 先确认线上是不是新包没生效

在 `aiops` 下执行：

```bash
cd /srv/ai-omni-ops-system

curl -s "http://127.0.0.1:3001/brand-growth?ts=$(date +%s)" | grep -o '/_next/static/chunks/app/(dashboard)/brand-growth/page-[^"]*js' | head -1
curl -s "https://17ai.site/brand-growth?ts=$(date +%s)" | grep -o '/_next/static/chunks/app/(dashboard)/brand-growth/page-[^"]*js' | head -1
```

判断方式：

- 如果两个 hash 一致，说明外网和本机已经打到同一套前端。
- 如果两个 hash 不一致，或者一直返回旧 hash，要继续查端口占用与 PM2 日志。

### 3.2 查看 `aiops` 下的 Web 进程是否在重启

```bash
pm2 info ai-omni-web
pm2 logs ai-omni-web --lines 200 --nostream
```

重点看：

- `restarts` 是否异常高。
- `uptime` 是否只有几秒。
- 是否存在 `EADDRINUSE`。

### 3.3 直接确认谁占了 3001

如果 `aiops` 没有 sudo 权限，直接用密钥重新开一个 `root` SSH 会话，不要先登录 `aiops` 再 `su - root`。

在 `root` 下执行：

```bash
lsof -iTCP:3001 -sTCP:LISTEN -n -P
ss -ltnp | grep 3001
```

如果输出里能看到这种内容：

```text
users:(("next-server",pid=841977,fd=18))
```

就说明 `3001` 确实被一个残留的旧 `next-server` 占住了。

## 4. 标准恢复步骤

### 4.1 杀掉残留旧进程

在 `root` 下执行：

```bash
kill -9 <PID>
ss -ltnp | grep 3001
```

例如：

```bash
kill -9 841977
ss -ltnp | grep 3001
```

判断方式：

- 如果第二条没有输出，说明 `3001` 已经释放。

### 4.2 让 `aiops` 的 PM2 正式接管 3001

切回 `aiops`：

```bash
su - aiops
cd /srv/ai-omni-ops-system
pm2 restart ai-omni-web --update-env
pm2 status
pm2 logs ai-omni-web --lines 50 --nostream
```

判断方式：

- `ai-omni-web` 应为 `online`
- `uptime` 持续增长
- 不再出现 `EADDRINUSE`

### 4.3 再次验证外网已切到新版本

```bash
curl -s "http://127.0.0.1:3001/brand-growth?ts=$(date +%s)" | grep -o '/_next/static/chunks/app/(dashboard)/brand-growth/page-[^"]*js' | head -1
curl -s "https://17ai.site/brand-growth?ts=$(date +%s)" | grep -o '/_next/static/chunks/app/(dashboard)/brand-growth/page-[^"]*js' | head -1
```

判断方式：

- 两边返回相同的 `page-*.js` hash，说明新版本已经真正接管对外流量。

## 5. 这次事故的最短处理版

### 5.1 快速判断

```bash
pm2 logs ai-omni-web --lines 50 --nostream
```

如果看到：

```text
EADDRINUSE: address already in use 127.0.0.1:3001
```

继续执行：

```bash
# root 会话
ss -ltnp | grep 3001
kill -9 <PID>

# aiops 会话
pm2 restart ai-omni-web --update-env
```

### 5.2 最终验证

```bash
curl -s "https://17ai.site/brand-growth?ts=$(date +%s)" | grep -o '/_next/static/chunks/app/(dashboard)/brand-growth/page-[^"]*js' | head -1
```

如果 hash 已更新到最新发布版本，说明恢复完成。

## 6. 以后禁止的操作

- 不要在 `root` 下手动执行 `npm start`。
- 不要在 `root` 下手动执行 `next start`。
- 不要在 `root` 下单独维护一套 PM2 进程。
- 不要在生产环境同时保留两套会监听 `3001` 的前端进程。

## 7. 以后统一的正确操作

### 7.1 部署和运行规则

- 仓库目录：`/srv/ai-omni-ops-system`
- 运行用户：`aiops`
- 进程管理：`pm2`
- Web 服务名：`ai-omni-web`
- Server 服务名：`ai-omni-server`

### 7.2 日常查看命令

```bash
su - aiops
cd /srv/ai-omni-ops-system
pm2 status
pm2 logs ai-omni-web --lines 100 --nostream
pm2 logs ai-omni-server --lines 100 --nostream
```

### 7.3 部署后必须做的验证

```bash
curl -I http://127.0.0.1:3001/
curl -I http://127.0.0.1:3011/api/health
curl -s "https://17ai.site/brand-growth?ts=$(date +%s)" | grep -o '/_next/static/chunks/app/(dashboard)/brand-growth/page-[^"]*js' | head -1
```

### 7.4 保存 PM2 当前状态

当确认线上恢复正常后执行：

```bash
pm2 save
```

### 7.5 补齐开机自启动

如果服务器曾经出现“重启后 `3001/3011` 没起来，需要手动 `pm2 restart`”的问题，恢复后要立刻补这一步。

项目里已经提供 root 可执行脚本：

```bash
cd /srv/ai-omni-ops-system
bash scripts/ops/setup-pm2-aiops-startup.sh
```

执行完成后验证：

```bash
systemctl status pm2-aiops --no-pager
su - aiops
pm2 status
```

判断方式：

- `pm2-aiops` 为 `active (running)`
- `ai-omni-web` 和 `ai-omni-server` 能在系统重启后自动恢复

如果线上仍出现“服务器一重启就掉站”，优先回到：

- `docs/production-stability-and-performance-remediation-plan.md`

按 Phase 0 继续收口，而不是只做临时手工拉起。

## 8. 和历史文档的关系

- 本文档是“线上前端 `3001` 端口冲突”专项排障手册。
- 更早的部署与非 root 运行背景见：
  - `docs/changes/2026-05-10-deploy-hardening-and-non-root-runtime.md`
- 当前项目的文档总索引见：
  - `docs/README.md`
