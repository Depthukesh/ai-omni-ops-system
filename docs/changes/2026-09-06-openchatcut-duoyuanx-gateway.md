# 2026-09-06 OpenChatCut 多元探索统一网关

## 背景

OpenChatCut 已经独立以 Docker 方式部署，但它的 Agent、图片、音频、视频、音乐能力仍要求在 OpenChatCut 侧分别配置 API URL、API Key 和模型名。

当前系统里已经把“多元探索”作为品牌共享第三方平台接入，并预埋了文本、图像、视频、TTS、转写、音乐六类 provider。继续让 OpenChatCut 直接持有多家平台的独立密钥，会带来三个问题：

1. 密钥分散在 OpenChatCut 和本站两边，无法统一收口
2. 品牌共享 Key 无法直接被 OpenChatCut 复用
3. 后续切换供应商、补 fallback 或审计请求来源时，需要同时改两套系统

因此本轮把“OpenChatCut -> 我们自己的系统 -> 多元探索”这条路正式落成最小可用网关。

## 本次改动

### 1. 新增 OpenChatCut 专用网关

新增文件：

- `apps/server/src/modules/openclaw/openclaw-openchatcut-gateway.service.ts`
- `apps/server/src/modules/openclaw/openclaw-openchatcut-gateway.controller.ts`

新增接口前缀：

- `GET/POST /api/openclaw/openchatcut-gateway/*`

当前已显式暴露这些能力：

- A 类文本 / Agent
  - `GET /api/openclaw/openchatcut-gateway/v1/models`
  - `POST /api/openclaw/openchatcut-gateway/v1/chat/completions`
  - `POST /api/openclaw/openchatcut-gateway/v1/responses`
  - `POST /api/openclaw/openchatcut-gateway/v1/messages`
- B 类图片 / 音频
  - `POST /api/openclaw/openchatcut-gateway/v1/images/generations`
  - `POST /api/openclaw/openchatcut-gateway/v1/audio/speech`
  - `POST /api/openclaw/openchatcut-gateway/v1/audio/transcriptions`
  - `POST /api/openclaw/openchatcut-gateway/v1/audio/translations`
- C 类视频 / 音乐
  - `POST /api/openclaw/openchatcut-gateway/v1/videos`
  - `GET /api/openclaw/openchatcut-gateway/v1/videos/:taskId`
  - `POST /api/openclaw/openchatcut-gateway/suno/submit/:action`
  - `GET /api/openclaw/openchatcut-gateway/suno/fetch`
  - `GET /api/openclaw/openchatcut-gateway/suno/fetch/:taskId`

### 2. 复用 OpenClaw 安装令牌和品牌隔离

网关不新增第二套鉴权，而是直接复用 OpenClaw 现有约束：

- 支持 `Authorization: Bearer ocp_xxx`
- 支持 `x-brand-id: br_xxx`
- 安装令牌与品牌不一致时继续直接拦截

也就是说，OpenChatCut 后续走本站网关时，仍然沿用 OpenClaw 现有安装中心导出的品牌绑定语义。

### 3. 复用品牌共享的多元探索 Key

网关不会把 OpenChatCut 传来的 Authorization 原样转发给多元探索，而是：

1. 先解析当前请求属于哪个品牌
2. 再通过 `ThirdPartyPlatformsService.resolveBrandRuntimeApiKeys(...)`
3. 读取该品牌在“个人中心 -> 第三方平台”里配置的多元探索共享 Key
4. 由服务端代替 OpenChatCut 调多元探索

这样做的结果是：

- OpenChatCut 不需要再保存品牌级多元探索明文 Key
- 本站仍然掌握最终上游模型调用权
- 后续如果切到别的统一平台，只需要改本站网关

### 4. 透传多元探索原生路径，减少协议翻译

本轮刻意没有把上游协议重写成另一套自定义语义，而是遵循两条原则：

1. A/B 类尽量按 OpenAI 兼容接口透传
2. C 类继续保留多元探索的视频与 Suno 异步任务路径

这样做的原因是：

- OpenChatCut 自定义 API 配置页本来就围绕 Base URL / API Key / 模型名工作
- 视频和音乐任务通常不是单次同步返回，保留原始任务接口更稳
- 先让“统一网关 + 品牌共享 Key”这件事跑通，比先造一层协议翻译更重要

## 影响范围

### 受影响模块

- `OpenClawModule`
- OpenClaw 安装令牌鉴权链路
- 品牌共享第三方平台密钥读取链路

### 未改动内容

- 没有改动现有 `openclaw/mcp` 工具面
- 没有改动设计工作台、报告工作台、视频工作台原有 provider fallback 逻辑
- 没有把 OpenChatCut 并入本站主 Docker compose
- 没有在本站直接替 OpenChatCut 创建工程或操作时间线

## 使用口径

当前推荐的对接关系是：

```text
OpenChatCut
-> /api/openclaw/openchatcut-gateway/...
-> 本站按品牌解析多元探索共享 Key
-> 多元探索
```

建议后续在 OpenChatCut 里统一把自定义 Base URL 指到：

```text
https://你的域名/api/openclaw/openchatcut-gateway
```

并继续使用：

- `Authorization: Bearer ocp_xxx`
- `x-brand-id: br_xxx`

## 验证建议

最小验证顺序建议如下：

1. 先用安装令牌访问 `GET /api/openclaw/openchatcut-gateway/v1/models`
2. 再验证 `POST /v1/chat/completions`
3. 再验证 `POST /v1/images/generations`
4. 再验证 `POST /v1/audio/speech`、`POST /v1/audio/transcriptions`
5. 最后验证 `POST /v1/videos` 与 `POST /suno/submit/music`

## 后续建议

本轮先把“统一网关 + 品牌共享 Key + 多元探索承接 A/B/C 三类能力”收口为最小可用版本。

后续更值得继续推进的是：

1. 给 OpenChatCut 安装中心补一组现成的网关配置示例
2. 进一步确认 OpenChatCut 各自定义接口页对视频/音乐路径的具体调用方式
3. 再决定是否需要在本站额外补一层“更贴近 OpenChatCut UI 语义”的适配器
