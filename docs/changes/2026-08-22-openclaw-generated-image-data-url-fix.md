# 2026-08-22 OpenClaw 设计生图结果回写补齐 data URL 兼容

## 背景

- OpenClaw 侧在调用 `create_design_work` 做图片设计时，反馈里出现了：
  - `imageSize` 仍被 MCP schema 拒绝
  - `spec` 看起来没有生效
  - 服务端报错为“下载远程生成图片 `data:image/png;base64,...` 失败”
- 代码复核后确认：
  - `imageSize` 字段已经进入服务端 schema，但 MCP 客户端如果仍持有旧工具缓存，确实会继续报 `must NOT have additional properties`
  - `spec` 与 `imageSize` 的尺寸解析本身已支持从字符串中提取 `宽x高`
  - 真正的服务端 bug 在于：第三方图片结果若返回 `data:image/...;base64,...`，现有回写逻辑会把它误当成 HTTP 远程地址，导致缓存落盘失败

## 本次改动

- 在 `apps/server/src/modules/works/works.service.ts` 中为生成图片结果回写补齐 `data:` URL 兼容：
  - 若第三方返回 `data:image/png;base64,...`
  - 服务端会直接解析 base64 内容
  - 按现有尺寸规范化逻辑处理后落盘为站内文件
- 只有真正的非 `http/https` 且非 `data:` 内容，才继续报“未返回有效图片地址”

## 影响面

- 仅影响设计图片生成成功后的结果保存阶段。
- 不改 OpenClaw 的工具 schema。
- 不改 `spec/imageSize` 的尺寸解析规则。
- 不改第三方图片生成请求本身。

## 验证

- `pnpm exec tsc --noEmit -p apps/server/tsconfig.json`
- 代码对照确认：
  - `create_design_work` 已支持 `imageSize`
  - `spec` 仍兼容 `宽x高`
  - `cacheRemoteGeneratedFile` 已新增 `data:` 图片解析与落盘逻辑

## 额外说明

- OpenClaw 侧若仍提示 `imageSize` 非法字段，说明 MCP 服务或客户端缓存尚未刷新，不代表当前服务端代码里没有这个字段。
- 这类情况下，刷新 OpenClaw MCP schema 后优先用 `imageSize: "1200x628"` 重试；若仍需临时兼容旧 schema，也可继续用 `spec: "1200x628"`。
