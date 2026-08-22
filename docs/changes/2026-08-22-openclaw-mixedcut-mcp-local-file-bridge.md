# 2026-08-22 OpenClaw mixedcut MCP 与本机素材桥接

## 背景

- 站内 `内容获客 -> 视频混剪` 已经能手动选择站内视频素材并发起 mixedcut 任务。
- 但 OpenClaw 侧此前还没有 mixedcut 专属 MCP 工具，也没有把本机 `localFilePath` 直接桥接到 mixedcut。
- 用户进一步要求确认两件事：
  - 本机电脑上的素材，后续能否由 OpenClaw 直接调用给 mixedcut 使用。
  - mixedcut 当前是否已经同步到 MCP / Skill。

## 本次改动

### 1. OpenClaw 补 mixedcut MCP 工具

在 `apps/server/src/modules/openclaw/openclaw.service.ts` 新增并接通：

- `get_mixedcut_media_assets`
- `create_mixedcut_remix_task`
- `get_mixedcut_remix_task_progress`

其中：

- `get_mixedcut_media_assets` 用于读取当前品牌可供 mixedcut 使用的站内视频素材。
- `create_mixedcut_remix_task` 用于直接发起 mixedcut 混剪任务。
- `get_mixedcut_remix_task_progress` 用于轮询 mixedcut 任务进度与结果。

### 2. mixedcut 底层桥接改为支持多来源视频

在 `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts` 把 mixedcut 创建任务链路从原本偏向 `MediaAsset` 的实现，收口为可复用的通用来源：

- 新增 `MixedcutRemixSourceRecord`
- 新增 `createMixedcutRemixTaskFromSources(...)`
- 统一通过 `createMixedcutRemixTaskFromResolvedSources(...)` 创建任务

这样 mixedcut 现在可以同时吃：

- 站内 `MediaAsset`
- OpenClaw 创作素材
- 其它后续可映射为同结构的视频来源

### 3. 本机素材经 OpenClaw 入站后再送 mixedcut

`create_mixedcut_remix_task` 支持三类输入：

- `mediaAssetIds`
- `creativeMaterialIds`
- `uploadItems`

对于本机素材，不直接绕过站内后端上传到 mixedcut，而是：

1. 在 stdio MCP 下传 `localFilePath / localFilePaths`
2. `scripts/openclaw-ai-omni-mcp-server.mjs` 自动把本机文件读取为 `uploadItems`
3. OpenClaw 先把文件归档为站内创作素材
4. 再复用主站现有 mixedcut bridge 发起任务

这样可以保持：

- 权限仍走站内鉴权
- 文件进入站内统一素材体系
- 后续可继续复用、审计和回显

### 4. MCP / Skill 同步边界

本次结论需要写清：

- mixedcut **已同步到 OpenClaw MCP**
- mixedcut **还没有单独同步到 Skill ZIP / Skill 任务语义层**

也就是说：

- 底层工具已接通
- Skill 编排话术、任务意图映射、Skill 包更新仍是下一步工作

## 影响范围

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
- `scripts/openclaw-ai-omni-mcp-server.mjs`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`

## 兼容性说明

- 本次没有改 mixedcut 任务协议本身。
- 本次没有改数据库 schema。
- 主站原有 `视频混剪` 工作区链路继续保留。
- OpenClaw 只是复用同一条 mixedcut 后端能力，没有新起第二套上传 / 发任务通道。

## 验证计划

- `pnpm --filter @ai-omni/server build`
- 最小链路验证：
  - `create_mixedcut_remix_task` 传站内 `mediaAssetIds`
  - `create_mixedcut_remix_task` 传 `creativeMaterialIds`
  - stdio MCP 传 `localFilePath / localFilePaths`
  - `get_mixedcut_remix_task_progress` 轮询任务状态

## 后续建议

- 继续补 mixedcut 的 Skill 任务语义与 Skill ZIP，同步让 OpenClaw 在自然语言层更清楚地知道何时优先调用 mixedcut。
- 若后续还要支持“宿主机素材目录直接枚举给 OpenClaw”，建议继续复用站内素材库 / 创作素材真源，不要让 OpenClaw 直接维护另一套目录索引。
