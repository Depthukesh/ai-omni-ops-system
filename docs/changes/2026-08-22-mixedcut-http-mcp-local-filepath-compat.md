# 2026-08-22 mixedcut HTTP MCP 本地路径兼容与报错收口

## 背景

- 之前 `create_mixedcut_remix_task` 的文档、Skill 和对接说明里已经写了：
  - `localFilePath`
  - `localFilePaths`
- 但服务端 mixedcut tool schema 实际没有把这两个字段声明出来。
- 结果是：
  - `stdio MCP` 由于本地桥接层会先把路径转成 `uploadItems`，所以能正常工作。
  - `streamableHttp` 客户端如果直接传 `localFilePath / localFilePaths`，会先被 schema 的 `additionalProperties: false` 拒绝，连服务端都到不了。

这会造成非常明显的使用割裂：

- 文档说能传
- Skill 也写了能传
- 但 HTTP MCP 客户端一传就报 schema 错

## 本次改动

### 1. mixedcut MCP tool schema 正式声明本地路径字段

更新：

- `apps/server/src/modules/openclaw/openclaw.service.ts`

为 `create_mixedcut_remix_task` 新增：

- 顶层 `localFilePath`
- 顶层 `localFilePaths`
- `uploadItems[].localFilePath`

这样 `streamableHttp` 客户端不再会因为 schema 不认识字段而在工具层直接拦截。

### 2. 服务端补本地路径读取与转 uploadItems

`createMixedcutRemixTask()` 现在会先统一做一层来源归一化：

- 如果传了 `localFilePath / localFilePaths`
- 或 `uploadItems[].localFilePath`

服务端会尝试读取当前运行环境可访问的路径，把文件转成：

- `fileName`
- `contentType`
- `dataBase64`

再继续走原有“先归档 OpenClaw 创作素材，再送 mixedcut”的链路。

### 3. 对 HTTP MCP 的真实边界给出明确报错

如果当前服务运行环境读不到这个路径，例如：

- 用户传的是客户端宿主机路径
- 但服务端跑在 Docker 容器里，且该路径没有挂载进容器

现在不会再只表现为模糊失败，而会直接返回更明确的提示：

- 当前服务运行环境无法直接读取本地文件
- 如果现在走的是 `streamableHttp`
- 请改用 `uploadItems.dataBase64`
- 或改走 `stdio MCP`

### 4. 只允许视频文件进入 mixedcut

本次也顺手补了一层前置判断：

- `localFilePath`
- `uploadItems`

如果识别出来不是视频类型，会直接在 OpenClaw 层报错拦截，避免继续把图片/音频误送进 mixedcut。

## 当前结论

`create_mixedcut_remix_task` 的本地路径行为现在分成两种：

### stdio MCP

- `localFilePath / localFilePaths` 最适合处理“当前这台电脑上的本机文件”
- 文件先在客户端桥接层被读取
- 再自动转成 `uploadItems`

### streamableHttp

- 也允许传 `localFilePath / localFilePaths`
- 但路径解析发生在服务端
- 只有当该路径对当前服务运行环境可访问时才真正可用
- 如果文件只在客户端机器而不在服务端运行环境内，必须改用：
  - `uploadItems.fileName`
  - `uploadItems.contentType`
  - `uploadItems.dataBase64`

## 影响范围

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

## 验证建议

- `pnpm build:server`
- `tools/list` 核对 `create_mixedcut_remix_task` schema 已包含：
  - `localFilePath`
  - `localFilePaths`
- 用 `streamableHttp` 实测两类场景：
  - 可访问路径：应自动转 upload 并继续创建 mixedcut 任务
  - 不可访问路径：应返回清晰提示，要求改走 `uploadItems.dataBase64` 或 `stdio MCP`
