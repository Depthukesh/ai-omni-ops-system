# Debug Session: runninghub-missing-taskid
- **Status**: [OPEN]
- **Issue**: RunningHub 应用对接时报错 `errorCode=414`，提示“RunningHub 未返回任务 ID”，实际期望是提交后拿到稳定的三方任务 ID 并继续状态托管。
- **Debug Server**: pending
- **Log File**: .dbg/trae-debug-log-runninghub-missing-taskid.ndjson

## Reproduction Steps
1. 在站内或 OpenClaw 发起一个 RunningHub 应用生成请求。
2. 观察返回结果是否出现 `errorCode=414` / “RunningHub 未返回任务 ID”。
3. 对照当前品牌、应用 key、请求参数与 RunningHub 返回体。

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | RunningHub 创建接口响应里根本没有返回任务 ID | High | Low | Pending |
| B | 真实任务 ID 在返回体其他字段，当前解析逻辑取错路径 | High | Low | Pending |
| C | RunningHub 实际返回业务错误，站内把它折叠成“未返回任务 ID” | High | Low | Pending |
| D | 提交后存在异步竞态，任务 ID 尚未落到当前返回阶段 | Medium | Medium | Pending |
| E | 当前品牌 RunningHub 配置导致请求半成功但不可创建任务 | Medium | Medium | Pending |

## Log Evidence
- Pending

## Verification Conclusion
- Pending

## Instrumentation
- Added debug points in submitRunningHubTask() to capture request entry, non-OK HTTP responses, successful payload shape, missing-taskId extraction, and resolved task IDs.
- Current log file has been cleared for a fresh pre-fix reproduction run.

