# 2026-08-31 RunningHub OpenClaw 提交空媒体节点拦截与 Skill 指引补强

## 背景

内容获客 `某音/某号 -> RunningHub应用` 出现多次失败，作品中心统一显示：

- `errorCode=803 | JsonNull | RunningHub 未返回任务 ID`

结合本地数据库里的失败记录排查后确认，这批失败任务并不是额度、API Key 或限流问题。

失败记录里的 `metadataJson.nodeInfoList` 显示：

- `image` 节点只剩 `nodeId + fieldName`
- `audio` 节点只剩 `nodeId + fieldName`
- 没有 `fieldValue`
- 也没有 `upload`

也就是 OpenClaw 实际把必填媒体节点空着提交给了 RunningHub，平台才返回 `errorCode=803 / JsonNull`。

## 根因

原链路存在两个问题：

1. 服务端对 `errorCode=803 / JsonNull` 的报错解释不够直接  
   当前逻辑主要依赖“是否拿到 taskId”来判定提交成功，容易把真实平台报错冲淡成“未返回任务 ID”。

2. 服务端没有前置拦截“必填媒体节点为空”的情况  
   当 `image / audio / video` 这类输入节点最终只剩模板空壳时，系统仍会继续向 RunningHub 提交，导致平台返回 `803 / JsonNull`。

## 本次改动

### 1. RunningHub 提交前新增空媒体节点拦截

更新文件：

- `apps/server/src/modules/works/works.service.ts`

改动：

- 在 RunningHub 提交前新增 `assertRunningHubRequiredMediaInputResolved(...)`
- 对图片 / 音频 / 视频必填输入节点，如果最终：
  - 没有 `upload`
  - 也没有有效 `fieldValue`
  - 只剩 `nodeId + fieldName`
  - 则直接在服务端报可执行错误

这样会把错误前移成明确提示，而不会再落到 RunningHub 平台侧返回模糊的 `JsonNull`。

### 2. RunningHub 平台错误翻译更直接

更新文件：

- `apps/server/src/modules/works/works.service.ts`

改动：

- 在 `unwrapRunningHubEnvelope(...)` 中补充对 `errorCode` / `errorMessage` 的识别
- 当平台返回 HTTP 200 但业务层 `errorCode != 0` 时，直接按失败处理
- 对 `errorCode=803 / JsonNull` 统一翻译为：
  - 优先排查必填媒体节点为空
  - 不是先怀疑额度、API Key 或限流

### 3. Skill / MCP / 安装中心说明补强

更新文件：

- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`

新增指引：

- 普通文本 / 数值节点才只改 `fieldValue`
- 图片 / 音频 / 视频节点不能只留 `nodeId + fieldName` 空壳
- 如果 `RunningHub` 返回 `errorCode=803 / JsonNull`，优先检查媒体节点是否为空
- 同一品牌下 `RunningHub` 任务默认按串行执行

## 影响范围

本次会影响：

- OpenClaw -> RunningHub `generate` 提交链路
- 内容获客 `某音/某号 -> RunningHub应用` 的服务端报错提示
- OpenClaw Skill / MCP / 安装中心里的 RunningHub 使用说明

本次不会影响：

- RunningHub 应用清单
- RunningHub app detail 模板结构
- 数据库 schema
- 前端页面结构

## 验证

本次执行：

- 读取失败作品 HTML 快照，确认统一报错为 `errorCode=803 | JsonNull | RunningHub 未返回任务 ID`
- 直接查询本地 Postgres `MediaAsset.metadataJson.nodeInfoList`
- 确认失败记录中 `image` / `audio` 节点确实为空壳提交
- 构建验证：
  - `pnpm build:server`

## 一句话结论

这次把 RunningHub `803 / JsonNull` 从“模糊平台错误”收口成了“必填媒体节点空提交”的可执行错误，并同步补强了 OpenClaw Skill / MCP / 安装中心里的 RunningHub 操作指引。
