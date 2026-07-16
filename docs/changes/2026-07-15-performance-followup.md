# 2026-07-15 性能治理跟进

## 背景

部署链第二阶段收口后，系统优化主线开始转向两类真实在线问题：

1. 抖音工作台首屏与重板块切换偏慢
2. `OpenClaw MCP` 请求量异常偏高，带动后端 CPU 波动

这份记录只收口本轮已经落地和已经确认的内容，不提前写尚未证实的推断。

## 一、抖音工作台首屏收口

### 已落地内容

围绕 `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx` 与 `digital-human-workspace.tsx`，已经连续做了四步收口：

1. 首屏不再一次性拉整个工作台的大量板块数据，改成：
   - 共享基础数据
   - 当前 `activeSection` 专属数据
2. 未打开过的板块切换时，只补该板块自己的数据
3. 手动刷新时，才重新完整刷新共享数据和当前板块
4. 品牌切换时重置懒加载标记，避免把旧品牌的加载状态带到新品牌

### 进一步拆出的数据

1. `growthReport / annualPlan / opportunityInsight`
   - 已从共享首屏数据里拆出
   - 只在 `plan` 板块真正需要时加载
2. 数字人板块编辑资源
   - 模板库
   - 收藏模板
   - 脚本模板
   - 公共声音
   - 我的声音
   - 试听任务
   - 已改为进入对应 tab 后再按需拉取

### 当前判断

这一轮已经把“挂载即大并发”的主问题明显压下去。后续是否继续拆，要以线上真实 Network 分布为准，而不是继续盲拆 `workspace-shell`。

## 二、OpenClaw MCP 高请求调查

### 已确认事实

通过线上 access log 与代码对照，已确认：

1. `POST /api/openclaw/mcp` 是 MCP 总入口
2. `initialize / ping / tools/list / tools/call` 全都汇总到这里
3. 它在最近一轮线上 access log 中已经高于其他业务 API

### 当前已确认的放大链路

在 `apps/server/src/modules/openclaw/openclaw-installation.service.ts` 中，`resolveInstallToken()` 每次 Bearer `ocp_*` 请求都会执行：

1. `findActiveTokenByHash(...)`
2. `assertBrandAccess(...)`
3. `touchToken(...)`

其中 `touchToken(...)` 会直接更新：

- `lastUsedAt`
- `updatedAt`

这意味着当前即便是“正常的 MCP 多轮调用”，服务端也会把它放大成：

- 每请求一次就做一次 token 查库
- 每请求一次就做一次品牌权限校验
- 每请求一次就做一次 `lastUsedAt` 写库

### 这轮新增的证据采集

为了确认真正的高频来源，而不是继续靠猜，这轮先只加了入口埋点，没有改业务逻辑：

- 文件：`apps/server/src/modules/openclaw/openclaw.controller.ts`
- 调试记录：`debug-openclaw-mcp-load.md`
- 线上日志：`.dbg/trae-debug-log-openclaw-mcp-load.ndjson`

埋点字段包括：

- `method`
- `toolName`
- `authSource`
- 来源 IP
- `user-agent`
- `durationMs`
- `isError`

### 下一步计划

等埋点版上线并拿到日志后，下一步优先验证：

1. 是不是 `initialize / tools/list` 本身占比过高
2. 是不是某几个 `tools/call` 在短时间内重复命中
3. 是不是 token 解析与 `lastUsedAt` 写入成为主要放大器

如果证据成立，最优先的降载动作将是：

1. 安装令牌解析短时缓存
2. `lastUsedAt` 写入节流
3. 只读工具短 TTL 缓存
4. 引导客户端优先走高层组合工具，减少一次意图拆成多个底层调用

## 当前状态

- 抖音工作台：第一轮性能收口已落地并上线
- OpenClaw MCP：已完成根因收窄与入口埋点，上线后等待真实日志再做最小修复
