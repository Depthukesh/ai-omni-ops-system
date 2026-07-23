# [OPEN] runninghub-status-stuck

## 背景

- 症状：OpenClaw 调用 RunningHub 后，三方侧实际上已完成，但站内状态仍停留在“处理中”。
- 用户反馈：必须打开相关页面或点击查看，状态才会从“进行中”变成“完成”。
- 当前目标：确认究竟是哪条接口或哪组字段负责最终状态收敛，并找出为什么普通列表刷新没有完成收敛。

## 假设

1. `listDouyinRunningHubWorks()` 不是最终负责当前页面状态收敛的唯一接口。
2. `refreshRunningHubWorkSnapshot()` 没有把完成态写回列表依赖字段。
3. OpenClaw 创建的任务在 `workId / providerTaskId / taskCenterId` 映射上仍有分叉。
4. 页面“查看”动作走了额外刷新链，而普通列表只返回旧数据。

## 当前计划

1. 静态核对 RunningHub 列表页、详情页、OpenClaw 调用链各自使用的接口。
2. 静态核对 `works.service.ts` 中列表刷新、详情刷新、ID 映射与状态写回逻辑。
3. 对照文档与昨日新增平台接入，确认 `duoyuanx` 是否已进入 MCP/Skill 能力面。
4. 在证据明确前，不修改业务逻辑。

## 记录

- 会话已建立，尚未进行业务逻辑修改。
- 2026-07-23 新证据：
  - `openclaw.service.ts:runninghub:generate` 多次记录 `resultStatus=IN_PROGRESS`，且返回时 `providerTaskId=""`。
  - `works.service.ts:listDouyinRunningHubWorks` 明确会挑选最多 3 个进行中作品做同步刷新。
  - `works.service.ts:refreshRunningHubWorkSnapshot` 已实际命中三方查询，并能把部分作品查询到 `snapshotStatus=SUCCESS`。
  - 当前至少存在两类现象：
    - 一类作品在列表刷新时已能被收敛为成功。
    - 另一类作品在多次列表刷新里持续返回 `snapshotStatus=RUNNING`，说明不是“完全没查”，而是“查到了但第三方仍报告运行中”。

## 证据判断

1. 假设 A：OpenClaw 在 `generate` 后没有同步拿到最终 `providerTaskId`。
   - 结论：成立。
   - 证据：调试日志里多次出现 `providerTaskId=""`，说明 OpenClaw 响应返回时只拿到了站内 `workId`，没有把三方任务 ID 回传给当前对话。

2. 假设 B：OpenClaw 自己会在 `generate` 后继续自动执行 `runninghub:list_works` 做 follow-up。
   - 结论：当前证据不支持。
   - 证据：日志里能看到多次 `generate`，但几乎没有与这些新建任务紧邻的 `openclaw.service.ts:runninghub:list_works` 记录；现有刷新主要来自网站列表接口。

3. 假设 C：站内并非完全不能自动收敛，只是收敛触发点主要落在列表刷新链路。
   - 结论：成立。
   - 证据：`listDouyinRunningHubWorks()` 进入后，马上触发 `refreshRunningHubWorkSnapshot()`；且部分作品已经在该链路上查到 `SUCCESS`。

4. 假设 D：真正负责写回完成态的是 `refreshRunningHubWorkSnapshot()`，不是 OpenClaw `generate` 返回本身。
   - 结论：成立。
   - 证据：`generate` 只记录了初始 `IN_PROGRESS`；而状态查询与写回代码位于 `works.service.ts:refreshRunningHubWorkSnapshot()` / `persistRunningHubQueryResult()`。

5. 假设 E：用户说“必须打开页面才变完成”的根因，是 OpenClaw 对话侧缺少托管轮询或主动回读，导致只能依赖网站列表刷新兜底。
   - 结论：高概率成立。
   - 证据：日志显示页面列表刷新会触发收敛；OpenClaw `generate` 后没有看到等价的 follow-up 读取动作。
