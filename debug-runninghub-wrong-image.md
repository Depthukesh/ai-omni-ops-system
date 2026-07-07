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
- 网站侧复现证据（`https://17ai.site/api/openclaw/mcp/debug/runninghub-wrong-image/logs`）显示：
  - `nodeId=444 / nodeName=LoadImage / fieldName=image`
  - 服务端上传前：`hasUploadPayload=false`
  - `originalFieldValue=ad1d3a5cfac9c22f651f56ced659c61bd36db51c935ef8f60bd4bdaabf36d288.png`
  - `fieldDataPreview` 仍为 `[[\"example.png\", \"None\", \"example.png\", \"keep_this_dic\"], {\"image_upload\": true}]`
  - 服务端最终提交前，`finalFieldValue` 与 `finalFieldData` 未变化
- 对照同批日志：
  - 音频节点 `nodeId=1755 / VHS_LoadAudioUpload` 的 `hasUploadPayload=true`
  - 且成功拿到了 RunningHub `responseFileName=openapi/...mp3`
  - 说明服务端上传与回填链路本身是通的，问题只出在图片节点这次请求没有真正把上传带进来

## 当前状态

- 已创建调试会话文件。
- 已完成调试日志链路与最小插桩。
- 已完成网站侧日志接收点，远端环境可直接回传证据。
- 已确认假设状态：
  - 假设 1：部分成立。当前复现里桥接层日志未上报到网站，但服务端证据已证明图片节点没有真实上传进入请求。
  - 假设 2：被证伪。服务端没有把正确上传覆盖成女生图；它这次压根没拿到图片上传。
  - 假设 3：成立。`fieldData` 中模板占位值 `example.png` 仍保留到最终提交。
  - 假设 4：被证伪。音频节点上传返回值正常，说明 RunningHub 上传接口与回填机制可用。
  - 假设 5：被证伪。`LoadImage + image_upload` 识别无误，问题不在节点识别分支。
- 已新增最小修复：
  - 对标准图片上传节点，如果最终没有真实上传、仍保留模板占位值，服务端直接报错拦截，避免继续误用示例女生图。
- 下一步：提交并推送这版修复，等待用户再次网站复现，验证“错误请求被明确拦截”。
