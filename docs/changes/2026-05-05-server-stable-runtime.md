# 后端 3011 稳定启动与托管脚本补齐

## 1. 变更背景

- 小红书页面出现“接口异常”时，实际根因是 `3011` 后端进程掉线
- 之前后端主要依赖临时命令启动，没有和前端一样的受管稳定启动脚本
- 服务掉线后只能手工判断端口、日志和进程状态，维护成本高

## 2. 变更目标

- 为 `3011` 后端补齐受管稳定启动与停止脚本
- 让后端具备 pid 文件、日志文件和健康检查验证
- 在服务异常退出时留下更明确的进程级错误日志

## 3. 修改内容

### 3.1 前端

- 无前端页面结构改动

### 3.2 后端

- 在 `apps/server/src/main.ts` 增加 `unhandledRejection` 和 `uncaughtException` 日志输出

### 3.3 数据与配置

- 新增 `scripts/dev-server-stable.cjs`
- 新增 `scripts/stop-server-stable.cjs`
- 根目录 `package.json` 增加：
- `dev:server:stable`
- `dev:server:stop`
- 运行时统一使用：
- `.runtime/server-3011.pid`
- `.runtime/server-3011.out.log`
- `.runtime/server-3011.err.log`

## 4. 修改意图

- 采用受管启动脚本，是为了把后端运行状态从“临时命令”收敛成可重复、可检查、可停止的标准流程
- 给 `main.ts` 补进程级错误日志，是为了后续若再异常退出，能直接从日志看到根因，而不是只看到端口消失

## 5. 影响范围

- 影响后端运行方式：`3011` 的稳定启动与停止流程
- 不影响现有 API 路由和业务数据

## 6. 验证方式

- 编译验证：`apps/server` 执行 `npm run build` 通过
- 启停验证：执行 `node scripts/stop-server-stable.cjs` 与 `node scripts/dev-server-stable.cjs`
- 健康检查：`http://127.0.0.1:3011/api/health` 返回 `status: ok`
- 页面验证：`http://127.0.0.1:3001/xiaohongshu` 返回 `200`

## 7. 风险与后续

- 这次修复解决了“无受管后端进程”问题，但如果业务代码内部后续真的触发崩溃，仍需结合 `.runtime/server-3011.err.log` 继续定位
- 后续建议把本地联调统一切到 `dev:web:stable` 和 `dev:server:stable`

## 8. 相关文件

- `scripts/dev-server-stable.cjs`
- `scripts/stop-server-stable.cjs`
- `package.json`
- `apps/server/src/main.ts`
