# Debug Session: openclaw-mcp-load
- **Status**: [OPEN]
- **Issue**: `/api/openclaw/mcp` 请求量异常高，持续抬升 `ai-omni-server` CPU，需要找出根因并在不影响 OpenClaw 功能的前提下降低请求量。
- **Debug Server**: Pending
- **Log File**: `.dbg/trae-debug-log-openclaw-mcp-load.ndjson`

## Reproduction Steps
1. 打开线上站点并观察 Nginx access log。
2. 统计最近 2000 条访问中的 `/api/*` 请求分布。
3. 对照后端 `openclaw` 路由与调用代码，定位高频来源。

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | OpenClaw 客户端对 `POST /api/openclaw/mcp` 做了高频轮询或重复初始化，导致每次用户操作都拆成多次 RPC 请求。 | High | Med | Pending |
| B | `openclaw/mcp` 内部单次请求会级联触发额外站内 HTTP 调用或调试上报，导致“1 次外部调用 -> 多次站内请求”。 | High | Med | Pending |
| C | 客户端缺少会话级缓存，像品牌上下文、工具清单、权限类信息在短时间内被重复请求。 | High | Low | Pending |
| D | 存在某个特定 MCP tool 或安装脚本在异常重试，导致 `/api/openclaw/mcp` 成为总量第一。 | Med | Med | Pending |
| E | Nginx access log 中的 `/api/openclaw/mcp` 很多是正常功能流量，但后端缺少结果缓存/限流/幂等复用，导致 CPU 被重复计算拖高。 | Med | Med | Pending |

## Log Evidence
- 已观察到最近 2000 条 access log 中，`/api/openclaw/mcp` 约 366 次，显著高于其他 API。
- 代码层确认：`handleMcpRpcRequest()` 会将 `initialize`、`tools/list`、`tools/call` 全部汇总到同一路径 `POST /api/openclaw/mcp`。
- 代码层确认：`resolveInstallToken()` 每次 `Bearer ocp_*` 请求都会执行：
  - `findActiveTokenByHash(...)`
  - `assertBrandAccess(...)`
  - `touchToken(...)`，即每请求一次就更新一次 `lastUsedAt`
- 已添加入口埋点：`apps/server/src/modules/openclaw/openclaw.controller.ts` 会将 `method/toolName/authSource/ip/ua/durationMs/isError` 写入 `.dbg/trae-debug-log-openclaw-mcp-load.ndjson`。

## Verification Conclusion
- Pending
