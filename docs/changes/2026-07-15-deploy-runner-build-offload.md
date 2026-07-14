# 2026-07-15 部署链治理第二阶段：将构建前移到 GitHub Runner

## 背景

线上长期存在两个明显问题：

1. 部署期间生产机需要原地执行 `npm ci + build`
2. 部署时会和在线流量争抢 CPU、内存、磁盘和网络，导致网站体感变卡，严重时还会误判成“服务器挂了”

在完成 `pm2-aiops` 开机自启动和运行时 debug 收口后，下一步需要继续处理部署链本身。

## 本次改动

### 1. GitHub Actions 改为先在 Runner 构建

- 新的 `deploy.yml` 在 GitHub Runner 上执行：
  - `npm ci`
  - `npm run prisma:generate`
  - `npm run build:server`
  - `npm run build:web`
- 构建完成后，会把运行所需文件打成 `release archive`

### 2. 服务器改为只接收产物并切换

- Runner 通过 SSH / SCP 把构建好的 `release archive` 上传到服务器
- 服务器侧不再执行：
  - `npm ci`
  - `npm run build:server`
  - `npm run build:web`
- 服务器仍保留这些动作：
  - `git fetch / checkout / reset`
  - 环境文件回填
  - `prisma db push`
  - 种子脚本
  - PM2 切换与健康检查

### 3. 保留原有稳定性保护

- 保留 SSH host key 预热
- 保留远端工作区脏状态备份与收口
- 保留端口冲突清理
- 保留 PM2 重载与健康检查

## 处理结果

这次改造的核心目标不是“缩短部署日志”，而是把最重的 `npm ci + build` 从生产机挪走，让线上机器只做：

1. 接收产物
2. 同步数据库
3. 切换运行进程
4. 探活

这样能明显降低部署过程对在线服务的干扰。

## 风险与注意事项

1. 当前前端已开始切到 standalone 交付，但后端运行依赖和部分根目录运行时文件仍会进入 release archive
2. `prisma db push` 和 seed 仍然留在服务器执行，因为数据库连接和环境文件以线上为准
3. 如果后续继续做部署瘦身，下一步应评估：
   - Web standalone 化
   - Server 运行依赖进一步裁剪
   - release archive 体积控制
4. 远端 SSH 脚本避免继续使用易受缩进影响的嵌套 here-doc，改为 `declare -f + runuser bash -lc` 方式执行，减少 YAML 内嵌 bash 的解析风险

## 2026-07-15 补充修正

在 Runner 构建版首次稳定跑通后，又补了一轮发布包治理：

1. `release archive` 去掉 `tar --exclude-vcs`
   - 之前这个参数会把 `.gitignore`、`.gitattributes` 这类被 Git 跟踪但属于 VCS 配置的文件也排除掉
   - 服务器同步产物后，这些文件会被 `rsync --delete` 一起删掉，进一步导致 `node_modules` 等本应被忽略的目录全部冒成未收口文件
2. 发布包显式排除本地运行时垃圾目录：
   - `.runtime`
   - `.tmp*`
   - `.dbg`
   - `.lark-cli`
   - `.trae`
   - `.pnpm-store`
   - `coverage`
3. 根目录 `.dbg` 也加入 `.gitignore`

这轮修正的目标有两个：

1. 避免继续把本地运行时垃圾带进发布包，控制 `release archive` 体积
2. 避免线上工作区因为缺失 `.gitignore` 等文件而出现“明明没改代码却到处都是未跟踪文件”的假脏状态

## 2026-07-15 第二轮瘦身

为了继续压缩 `release archive`，前端交付方式又做了一轮收缩：

1. `apps/web` 改为 `Next standalone` 输出
2. PM2 启动前端时优先走 standalone 的 `server.js`
3. GitHub Runner 在打包前，先把 standalone 运行所需的 `static/public` 资源补齐到 standalone 目录
4. 发布包排除一批已经不再需要由根目录 `node_modules` 提供的前端运行时依赖，例如：
   - `node_modules/next`
   - `node_modules/@next`
   - `node_modules/@img`
   - `node_modules/react`
   - `node_modules/react-dom`
   - `node_modules/styled-jsx`
   - `node_modules/lucide-react`
   - `node_modules/lunar-javascript`
   - `node_modules/qrcode`
5. 发布包同时排除旧的前端构建输出里仅用于传统 `next start` 的部分目录，例如：
   - `apps/web/.next/server`
   - `apps/web/.next/types`
   - `apps/web/.next/trace`
   - `apps/web/.next/diagnostics`
   - `apps/web/.next/export`

这轮的目标不是一次性做到极限瘦身，而是先把最重、最确定、最不影响线上稳定性的那一块前端运行时依赖从根目录发布包里拿掉。

## 2026-07-15 standalone 回归修正

第二轮瘦身上线后，部署日志暴露出一个实际问题：

1. `tar --exclude="node_modules/next"` 这类写法会模糊匹配到 `apps/web/.next/standalone/node_modules/next`
2. 导致 standalone 自带的前端运行时依赖被错误排除
3. 线上 PM2 启动 `apps/web/.next/standalone/apps/web/server.js` 时出现 `Error: Cannot find module 'next'`

因此又做了一次收口：

1. 所有发布包排除规则改成以 `./` 开头，只作用于仓库根目录目标
2. 保留 standalone 内嵌 `node_modules`，避免再误伤前端运行时

## 2026-07-15 standalone 端口修正

再次部署后，前端不再缺 `next`，但又暴露出新的现场问题：

1. standalone `server.js` 在缺少 `PORT/HOSTNAME` 时会退回默认的 `3000 / 0.0.0.0`
2. 线上 Nginx 和部署探活仍然按 `127.0.0.1:3001` 检查
3. 结果变成“前端其实已经启动，但启动在错误端口上”，导致部署误判失败

因此补了第二次收口：

1. `ecosystem.config.cjs` 为 `ai-omni-web` 显式注入 `PORT=3001` 与 `HOSTNAME=127.0.0.1`
2. `scripts/run-web-standalone.cjs` 再做一层兜底，确保 standalone 与 fallback 模式都固定监听 `127.0.0.1:3001`

## 2026-07-15 服务器工作区反复变脏修正

部署链跑通后，又确认了一个残留问题：

1. `.dbg` 与 `.trae/documents` 虽然不该进入 release archive，但它们仍然是 Git 已跟踪文件
2. 发布同步阶段使用 `rsync --delete` 时，会把服务器工作区里的这些已跟踪文件删掉
3. 于是下一次部署时，`git status` 总会看到一串 `D .dbg/...` 和 `D .trae/...`，被误判成“服务器工作区未收口”

因此补了一次同步层修正：

1. `sync_prepared_release_into_deploy_path` 增加 `--exclude '.dbg'`
2. `sync_prepared_release_into_deploy_path` 增加 `--exclude '.trae'`

这样服务器工作区中的这些 Git 跟踪文件会被保留下来，不再在下一轮部署里反复制造假脏状态。

## 2026-07-15 依赖与 CI 运行时告警收口

在部署链已经恢复稳定之后，还剩两类持续出现但尚未正式处理的告警：

1. `@nestjs/platform-express@10.4.8` 仍然依赖 `multer 1.4.4-lts.1`
2. GitHub Actions 仍在使用 `actions/checkout@v4` 与 `actions/setup-node@v4`，部署日志会持续提示 `Node.js 20 actions are deprecated`

这轮做了两个收口动作：

1. `apps/server/package.json` 里的 `@nestjs/common`、`@nestjs/core`、`@nestjs/platform-express` 统一升级到 `10.4.20`
2. `.github/workflows/deploy.yml` 里的：
   - `actions/checkout@v4` -> `actions/checkout@v5`
   - `actions/setup-node@v4` -> `actions/setup-node@v5`

这次没有同步提高 workflow 的 `node-version`，仍然保持 `20`，原因是：

1. 本次目标是先消掉 GitHub Actions 自身的 Node 20 runtime 弃用告警
2. 生产机当前仍以 Node 20 为主，先保持构建 Node 版本一致，减少额外变量
3. 等部署链和线上运行都完全稳定后，再单独评估业务代码切到 Node 22/24 的兼容性

## 验证建议

部署完成后重点看：

1. GitHub Actions 是否在 Runner 端完成 `npm ci + build`
2. 服务器日志里是否已经不再出现原地 `npm ci + build`
3. 部署期间首页和 API 是否比之前更稳
