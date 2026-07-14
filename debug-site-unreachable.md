# [OPEN] site-unreachable

## 症状
- 用户反馈网站当前打不开。
- 需要确认问题发生在 nginx 层、前端服务层、后端 API 层，还是域名 / 证书 / 端口映射层。

## 当前假设
- 假设 1：nginx 虽然配置语法通过，但站点配置存在转发目标不可达，导致首页打不开。
- 假设 2：前端 Web 进程（例如 3001 端口）已退出或未监听，nginx 代理后返回 502/504。
- 假设 3：后端 API 进程（例如 3011 端口）异常，导致页面初始化阶段阻塞或报错，看起来像整站不可用。
- 假设 4：HTTPS 证书、80/443 监听或域名解析异常，导致浏览器无法建立正常连接。
- 假设 5：最近 nginx reload 后，线上实际加载的站点配置与预期文件不一致，导致用户访问的不是当前修改的 server 块。

## 计划
- 先收集运行时证据，不修改业务逻辑。
- 优先检查 nginx 状态、80/443 监听、3001/3011 进程监听、首页与 API 本机访问结果。
- 根据证据决定是修站点配置、恢复服务进程，还是继续下钻到应用层。

## 当前证据
- `nginx` 进程正常运行，80/443 监听正常。
- `curl -k -I https://127.0.0.1 -H "Host: 17ai.site"` 返回 `502 Bad Gateway`。
- `curl -k -I https://127.0.0.1/douyin -H "Host: 17ai.site"` 返回 `502 Bad Gateway`。
- `curl -I http://127.0.0.1:3001` 返回 `Connection refused`。
- `curl -I http://127.0.0.1:3011` 返回 `Connection refused`。
- `root` 下 `pm2 ls` 为空，说明线上运行进程不在 `root` PM2。
- 按项目文档，生产环境应由 `aiops` 用户下的 `pm2` 管理 `ai-omni-web` 与 `ai-omni-server`。
- `runuser -u aiops -- /usr/bin/node -v` 成功返回 `v20.20.2`，说明 `node` 二进制本身可被 `aiops` 执行。
- 但 `runuser -u aiops -- pm2 status` / `pm2 resurrect` 持续报 `spawn /usr/bin/node EACCES`，说明故障点进一步收敛到 `aiops` 的 PM2 运行时环境，而不是 `node` 文件本身。
- 仓库中存在 [ecosystem.config.cjs](file:///d:/王笑东/aiproject/AI全域运营/AI全域智能体/ai-omni-ops-system/ecosystem.config.cjs)，明确声明了生产进程：
  - `ai-omni-server`
  - `ai-omni-web`
- 当前更高概率原因是：在 `root` 当前目录里直接执行 `runuser -u aiops -- pm2 ...`，把 `aiops` 带到了一个其无权访问的工作目录（常见是 `/root`），从而在 PM2 派生 daemon 时触发 `EACCES`。

## 结论
- 已确认不是 nginx 主进程故障。
- 已确认根因是 nginx 反向代理的两个上游应用进程未监听：
  - 前端 Web 进程 `127.0.0.1:3001`
  - 后端 API 进程 `127.0.0.1:3011`
- 服务器重启后，这两个应用没有自动拉起，所以站点入口和 `/douyin` 都统一表现为 `502 Bad Gateway`。
- 当前更具体的根因方向已收敛为：`aiops` 在错误的当前工作目录下执行 `pm2`，导致 PM2 daemon 无法派生；并非 `node` 文件本身不可执行。

## 下一步
- 优先恢复 Web 和 API 进程。
- 再确认它们是通过 `pm2`、`systemd`、`docker compose`，还是手工命令启动。
- 恢复后补齐开机自启，避免下次重启再次掉站。
