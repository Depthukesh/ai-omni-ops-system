# [OPEN] unified-publisher-bug

## 症状
- 安装统一插件后，抖音点击发布会停在创作者上传页，不继续自动上传/填写。
- 小红书在“原创笔记”板块点击一键发布时，打开成了视频上传页，且左上角没有任何扩展提示。

## 预期
- 小红书原创笔记应走图文草稿发布链路，不应跳到视频上传页。
- 抖音视频发布应在打开创作者中心后继续执行自动上传与表单填写，并显示扩展运行提示。

## 初始假设
1. 统一插件将两套脚本直接拼接后，消息监听和页面判断发生冲突。
2. 小红书 creator 页被统一插件误判为视频发布流，未按 work payload 进入图文流程。
3. 抖音 creator 页没有成功收到待发布 payload，或收到后在选择器阶段卡住。
4. 创作者页 content script 没有成功注入或在初始化早期报错，导致提示和后续自动化都未出现。

## 证据计划
- 静态核对统一插件 `background.js/content-script.js` 的拼接结果与平台分流条件。
- 采集浏览器控制台、扩展消息与页面运行痕迹，确认脚本是否注入、是否报错、是否拿到 session。
- 仅在证据不足时再补最小化运行时埋点。

## 当前状态
- 已建立调试会话，尚未修改业务逻辑。

## 第一轮证据
- `apps/server/src/modules/publishing/publishing.service.ts`
  - 小红书桌面发布会话固定为 `noteType: "图文"`，并且会话内容依赖 `imageUrls`，说明当前只支持图文笔记桌面草稿，不支持视频笔记。
  - 抖音桌面发布会话固定带 `videoUrl`，`mode: "PREPARE_PUBLISH"`，说明当前只支持视频发布，不支持图文笔记。
- `apps/web/src/services/publishing.ts`
  - `XiaohongshuDesktopDraftSession` 只包含 `imageUrls`，且 `noteType` 固定 `"图文"`。
  - 抖音桌面发布类型只包含 `videoUrl`，没有图文素材字段。
- `apps/web/public/extensions/omni-publisher/content-script.js`
  - 统一插件是把小红书脚本和抖音脚本直接拼接到同一个文件里，并不是做了真正的平台抽象。
  - 这意味着两个平台脚本会同时在同一个扩展里初始化，各自按 `location.hostname` 自判页面类型，存在互相干扰和误判风险。

## 第一轮结论
1. “统一插件支持所有类型”这个前提不成立。当前只支持：
   - 小红书：图文笔记桌面草稿
   - 抖音：视频桌面辅助发布
2. 小红书出现视频上传页，说明统一插件合并方式确实有问题；这不是业务预期。
3. 抖音停在上传页并不等于完全没触发，更像是“已打开目标页，但后续自动化没有继续执行”。

## 第二轮证据（网页端真实日志）
- 已新增线上浏览器调试采集接口：
  - `POST /api/debug/browser-event`
  - `GET /api/debug/browser-logs`
  - `DELETE /api/debug/browser-logs`
- 从线上 `sessionId=unified-publisher-bug` 日志读到的关键链路：
  1. creator 页已经成功解析到 `ai_omni_token` 和 `ai_omni_api`
  2. background 已成功请求 `GET /publishing/douyin/desktop-sessions/:token`，返回 `200`
  3. background 已成功请求视频素材 URL，返回 `200` 且 `contentType=video/mp4`
  4. 之后没有再出现：
     - `buildPublishPayload resolved video file`
     - `resolveAndRunPublish got background response`
     - `runCreatorPublish start`

## 假设验证状态
| ID | 假设 | 状态 | 证据 |
|----|------|------|------|
| A | creator 页没有拿到 token/api 参数 | ❌ 否 | 日志显示 `resolvePublishFromLocation parsed creator hash` 已拿到 token 和 api |
| B | desktop session 没取到 | ❌ 否 | 日志显示 `resolvePublishPayloadByToken fetched desktop session` 返回 `200` |
| C | 视频素材 URL 无法访问 | ❌ 否 | 日志显示 `downloadFileAsTransferable fetched remote asset` 返回 `200` |
| D | creator 页没收到完整 payload | ✅ 是 | 在素材下载之后没有进入 `resolveAndRunPublish got background response` 和 `runCreatorPublish start` |

## 当前确认的根因
- 根因位于抖音插件的 `background -> creator page` 负载构建阶段，不在网页端工作台。
- 更具体地说，`downloadFileAsTransferable()` 在拿到视频响应后，要把整个视频文件转成 `Array.from(new Uint8Array(buffer))` 再通过 `chrome.runtime.sendMessage` 传给 creator 页。
- 对于 mp4 这种较大的二进制，这一步很可能卡死在“内存转换 / 消息序列化”阶段，导致 creator 页一直停在“正在匹配发布素材/获取完整发布素材”，却永远收不到完整 `publishPayload`。
