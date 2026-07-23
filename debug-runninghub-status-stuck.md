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
