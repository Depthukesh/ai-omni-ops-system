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

1. 当前前端仍不是 standalone 交付，因此 release archive 会包含运行时所需依赖与构建产物
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

## 验证建议

部署完成后重点看：

1. GitHub Actions 是否在 Runner 端完成 `npm ci + build`
2. 服务器日志里是否已经不再出现原地 `npm ci + build`
3. 部署期间首页和 API 是否比之前更稳
