# 2026-06-12 生产部署修复：显式收口 Web 的 Next CLI 解析

## 为什么改

- 提交 `3235620` 在 ECS 部署时失败，前端构建阶段报错 `next: not found`
- 问题出在生产部署链路对 `apps/web` 工作区内 `next` 可执行文件的解析不稳定，不是页面业务逻辑或样式代码本身报错
- 这类问题如果只在 `apps/web/package.json` 里临时改脚本，容易和正在进行中的前端页面改造混在一起，不利于分批提交

## 这次改了什么

### 1. 新增根层 Web Next CLI 包装脚本

- `scripts/run-web-next.cjs`
  - 在仓库根目录显式定位 `node_modules/next/dist/bin/next`
  - 以 `apps/web` 为工作目录转发 `build`、`lint` 等命令
  - 只解决 CLI 定位问题，不改页面代码、不改接口逻辑

### 2. 根脚本改为走显式 CLI

- `package.json`
  - `build:web` 改为 `node scripts/run-web-next.cjs build`
  - `lint:web` 改为 `node scripts/run-web-next.cjs lint`
  - 避免部署阶段继续依赖工作区脚本去隐式解析 `next`

### 3. PM2 Web 启动改为直接指向根目录 Next CLI

- `ecosystem.config.cjs`
  - `ai-omni-web` 不再通过 `npm --workspace apps/web run start`
  - 改为直接以 `node` 解释器执行根目录的 `next` CLI
  - 保持运行目录为 `apps/web`
  - 保持监听地址 `127.0.0.1:3001` 不变

## 明确不改的内容

- 不改任何前端业务页面逻辑
- 不改登录、跳转、接口请求、数据库、鉴权和品牌切换行为
- 不增加客户端动效、图片、脚本体积或额外接口请求
- 不增加线上常驻 Node 服务数量，只是把 Web 进程启动入口改为更稳定的显式路径

## 对功能和负载的影响

- 功能层面：
  - 仅修复部署和启动入口，不影响站内现有功能
- 性能层面：
  - 不新增运行时网络请求
  - 不新增浏览器端 JS 负担
  - 不新增服务端渲染开销
  - 不增加 PM2 维护的服务实例数量

## 验证

- 本地执行 `node .\\node_modules\\next\\dist\\bin\\next --version`，确认根目录 Next CLI 可用
- 本地执行 `npm run build:web`，已从原来的 `next: not found` 进入真实 `next build` 阶段
- 本地后续阻塞为 Windows SWC 二进制加载问题，这与 ECS Linux 环境中的 `next: not found` 不是同一类故障

## 后续建议

- 修复推送后，优先观察 GitHub Actions 中 `npm run build:web` 是否恢复正常
- 如果部署恢复，再继续做个人中心剩余页面的视觉统一和可编译清理
- 后续所有视觉优化继续遵守两条边界：
  - 不影响现有业务功能
  - 不为了美化而增加服务器长期负担
