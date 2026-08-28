# 2026-08-28 RunningHub 媒体节点对象型 fieldValue 拦截

## 背景

OpenClaw 通过 `manage_douyin_video_production` 调 RunningHub 应用时，媒体上传节点偶发出现：

- `LoadAudio：Failed to create AudioDecoder for /workspace/ComfyUI/input/[object Object]`

这类报错表面上像是 RunningHub 找不到音频文件，实际根因是调用方把对象型参数直接塞进了：

- `payload.nodeInfoList[*].fieldValue`
- 或 `payload.nodeInfoList[*].fieldData`

服务端在标准化节点参数时会把对象隐式转成字符串，最终落成：

- `[object Object]`

于是 RunningHub 会尝试打开 `/workspace/ComfyUI/input/[object Object]`，自然报文件不存在。

## 根因

RunningHub 的图片、音频、视频上传节点并不接受“把对象直接塞进 `fieldValue`”这种写法。

正确约定是二选一：

1. `stdio MCP` 调用时，在节点对象顶层传 `localFilePath`
2. 直接传 `upload.fileName / upload.contentType / upload.dataBase64`

错误写法通常是把下面这类对象直接塞进 `fieldValue / fieldData`：

```json
{ "localFilePath": "D:\\media\\voice.mp3" }
```

或：

```json
{ "fileName": "voice.mp3", "contentType": "audio/mpeg", "dataBase64": "..." }
```

## 本次改动

更新：

- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`

改动：

- 在 `normalizeRunningHubNodeInfoList(...)` 增加媒体上传节点参数强校验
- 对图片 / 音频 / 视频节点，如果发现 `fieldValue / fieldData` 是对象，或已经被串成 `[object Object]`，直接报可执行错误
- MCP 工具说明补充“不能把对象塞进 `fieldValue / fieldData`”
- Skill 手册同步补充 RunningHub 上传节点正确写法

## 影响范围

- OpenClaw -> RunningHub `generate` 调用链
- 抖音工作台 RunningHub 服务端提交前标准化逻辑
- OpenClaw MCP / Skill 文档口径

这次不会改：

- RunningHub 应用清单
- RunningHub 节点模板结构
- 数据库结构
- 现有站内 Web 工作台上传交互

## 验证

建议至少验证：

```powershell
npm --workspace apps/server run build
```

并补一条真实调用验证：

1. 先 `get_app_detail`
2. 找到音频上传节点
3. 故意传错误对象到 `fieldValue`
4. 预期服务端直接返回明确错误，而不是继续落到 RunningHub 报 `[object Object]`

## 一句话结论

这次把 RunningHub 媒体上传节点的错误对象写法前移拦截，并把 OpenClaw 的 MCP / Skill 说明同步成同一套约束，避免 `LoadAudio` 再收到 `[object Object]` 这种不可执行路径。
