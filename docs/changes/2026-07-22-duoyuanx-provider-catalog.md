# 2026-07-22 多元探索统一网关供应商接入

## 为什么改

- 当前系统的接口供应商与个人中心第三方接口配置，已经形成了“后台 Provider 真源 + 品牌共享平台 Key”双层结构
- 用户要求把 [多元探索文档](https://doc.duoyuanx.com/zh) 上可用的大模型家族整体接入到系统里，而不是只加单个模型或只改前端展示
- 这类统一网关型平台，如果只在后台塞一条记录，不补平台聚合与品牌共享 Key 说明，前台用户很难理解“同一份平台 Key 对应多条供应商”

## 本次范围

- `apps/server/src/common/api-provider-catalog.ts`
- `apps/server/src/common/third-party-platform-catalog.ts`
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`

## 本次改动

### 1. 补多元探索 Provider 种子

- 新增一组 `多元探索` 系统供应商种子，覆盖五类统一网关能力：
  - 文生文/多模态
  - 文生图/图生图
  - 视频模型
  - 音频转写 / 文字转语音
  - Suno 音乐生成
- 各条种子都补齐了现有运行时依赖的关键字段：
  - `runtimeKey`
  - `runtimeTags`
  - `baseUrls`
  - `platformBaseUrls`
  - `completionPath` / `createPath` / `queryPath` / `requestPath`
  - `requestMode`
  - `supportsTextToImage`
  - `supportsReferenceImages`
  - `supportsTextToVideo`
  - `supportsImageToVideo`
  - `durationOptions`

### 2. 模型白名单按文档家族预装

- 文本侧预装了 GPT、Claude、Gemini、DeepSeek、Qwen 等家族的常见模型名
- 图像侧预装了 Gemini Image、gpt-image-2、即梦、豆包 Seedream、Grok Image、OpenAI Images 兼容模型
- 视频侧预装了 Veo、Grok Video、Omni、Seedance 1.0/1.5/2.0、wan2.6、Vidu、Kling、即梦、Hailuo 等系列的代表模型
- 音频侧预装了 `whisper-1`、`tts-1`、`tts-1-hd`
- 音乐侧预装了 `chirp-v3-5`、`chirp-v4`，并挂到 `Suno` 异步任务接口

### 3. 平台目录自动聚合到个人中心

- 在第三方平台目录里新增 `duoyuanx.com -> 多元探索平台`
- 同时补齐官网地址映射
- 这样启动后：
  - 后台 `接口供应商` 会出现多条 `多元探索` Provider
  - 个人中心 `第三方接口配置` 会自动聚合成一个 `多元探索平台`

### 4. 个人中心补统一网关说明

- 在 `第三方接口配置` 页面中，对 `多元探索平台` 增加统一网关说明文案
- 明确告诉用户：
  - 这是统一网关，不是单模型平台
  - 当前品牌只需要维护一份平台 Key
  - 后台拆分出来的文本、图像、视频、音频、音乐供应商会共用这份品牌共享 Key

## 为什么默认先用草稿状态

- 当前系统的 `reports / works` 运行时会按 `runtimeKey` 选择第一个命中的激活 Provider
- 如果直接把多元探索文本/图像/视频种子默认启用为 `ACTIVE`，可能会改变现有线上稳定链路的默认路由顺序
- 因此本轮的策略是：
  - **先完整预装**
  - **先在后台可见、前台可配**
  - **默认保持 `DRAFT`**
  - 待平台 Key 配置完毕并确认要切流时，再由后台按需启用

## 验证方式

- 启动后检查后台 `接口供应商` 是否新增多条 `多元探索` 记录
- 检查个人中心 `第三方接口配置` 是否出现 `多元探索平台`
- 检查同一品牌下填写多元探索 API Key 后，前台说明文案是否明确提示“统一网关共用同一份 Key”，并覆盖文本、图像、视频、音频、音乐五类能力
- 后续如要真正切流，再单独验证各条 `runtimeKey` 的运行时命中顺序与实际调用效果
