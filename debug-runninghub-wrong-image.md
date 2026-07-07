# [OPEN] runninghub-wrong-image

## 背景

- 症状：OpenClaw 通过 RunningHub 提交图片节点后，任务能成功，但最终吃到的仍是错误的女生示例图，而不是本地上传的男生图。
- 当前已知：此前曾出现 `LoadImage` 文件不存在；本轮改为走 RunningHub 上传后任务成功，但结果图仍明显不是用户上传图。
- 本次目标：用运行时证据确认图片节点在 3 个阶段的真实值：
  - OpenClaw 桥接层归一化后的 `nodeInfoList`
  - 服务端提交 RunningHub 前的 `preparedNodeInfoList`
  - RunningHub 上传接口返回的 `fileName / downloadUrl`

## 初始假设

1. OpenClaw 桥接层虽然读取了 `localFilePath`，但写回 `upload` 后仍保留了旧 `fieldValue` 或污染的 `fieldData`。
2. 服务端识别图片节点后，虽然上传成功，但最终回填给 `fieldValue` 的并不是 RunningHub 真正可用的图片路径。
3. `fieldData` 里仍残留模板示例图文件名，RunningHub 实际优先读取了 `fieldData` 而不是新的 `fieldValue`。
4. RunningHub 图片上传接口返回了成功，但返回的 `fileType / fileName` 与 `LoadImage` 节点预期不匹配，导致任务回退到模板图。
5. 某些图片节点模板并不是标准 `LoadImage + image_upload` 语义，当前服务端分支命中了错误的上传/回填策略。

## 计划

1. 只加日志，不改业务逻辑。
2. 让用户或我按同一路径复现一次。
3. 读取日志，逐条证伪上面的假设。
4. 只在证据明确后做最小修复。

## 证据记录

- 已启动 Debug Server：`.dbg/runninghub-wrong-image.env`
- 已插桩点：
  - `scripts/openclaw-ai-omni-mcp-server.mjs`：桥接层把 `localFilePath` 归一化为 `upload` 后记录节点摘要
  - `apps/server/src/modules/works/works.service.ts`：服务端上传前记录原始节点值
  - `apps/server/src/modules/works/works.service.ts`：RunningHub 上传返回后记录 `fileName / downloadUrl / fileType`
  - `apps/server/src/modules/works/works.service.ts`：最终提交前记录 `fieldValue / fieldData`
  - `apps/server/src/modules/openclaw/openclaw.controller.ts`：新增网站侧日志接收与读取接口，供远端环境回传调试证据

## 当前状态

- 已创建调试会话文件。
- 已完成调试日志链路与最小插桩。
- 已完成网站侧日志接收点，远端环境可直接回传证据。
- 下一步：把仅日志版发到网站环境，等待用户按原路径复现 1 次。
