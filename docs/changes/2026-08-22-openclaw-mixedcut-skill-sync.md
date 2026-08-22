# 2026-08-22 OpenClaw mixedcut Skill 同步

## 背景

- 前一轮已经把 mixedcut 接进 OpenClaw MCP，并验证了：
  - 可读取站内 mixedcut 素材
  - 可发起 mixedcut 混剪任务
  - 可轮询任务进度
  - stdio MCP 下可把本机 `localFilePath / localFilePaths` 先归档到 OpenClaw 创作素材，再送 mixedcut
- 但当时还停在“底层工具已接通”，Skill ZIP 与 Skill 任务语义尚未同步。
- 继续收口的目标，是让 OpenClaw 的正式 Skill 包也知道：
  - 什么叫 `视频混剪 / mixedcut`
  - 什么时候该走 mixedcut 专用工具
  - 本机路径、站内视频、OpenClaw 创作素材三类来源应如何处理

## 本次改动

### 1. 同步 Skill 包三份源文档

更新：

- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

补齐 mixedcut 语义：

- 抖音 / 内容获客能力图中加入 `视频混剪`
- 工具矩阵加入：
  - `get_mixedcut_media_assets`
  - `create_mixedcut_remix_task`
  - `get_mixedcut_remix_task_progress`
- 高频任务路由中明确：
  - 用户提到 `视频混剪` / `mixedcut` 时，不要误走 `manage_douyin_video_production`
  - 应优先路由到 mixedcut 专用工具
  - 本机 `localFilePath / localFilePaths` 会先归档成 OpenClaw 创作素材，再复用主站 mixedcut bridge

### 2. 同步安装中心导出的 Skill ZIP fallback

更新 `apps/server/src/modules/openclaw/openclaw-installation.service.ts` 中：

- `buildBrandOperatorSkillMarkdown()`
- `buildSkillPackageDomainMapMarkdown()`
- `buildSkillPackageToolMatrixMarkdown()`
- `buildSkillPackageRoutingHandbookMarkdown()`

保证：

- 即使部署环境临时读不到 `docs/openclaw/skill-package/*` 源 Markdown
- 安装中心导出的正式 Skill ZIP 仍然能带上 mixedcut 的最新语义

### 3. 更新现状说明文档

同步更新：

- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`

把 mixedcut 的现状从：

- “只同步到底层 MCP，Skill 仍待补”

改为：

- “已同步到 MCP 与 Skill ZIP，Skill 已补 mixedcut 任务语义”

## 当前结果

现在 mixedcut 在 OpenClaw 侧分成两层都已打通：

### MCP 层

- `get_mixedcut_media_assets`
- `create_mixedcut_remix_task`
- `get_mixedcut_remix_task_progress`

### Skill 层

- 主 Skill 已能识别：
  - `视频混剪`
  - `mixedcut`
  - `把站内视频拿去混剪`
  - `把本机视频拿去混剪`
- 路由时会优先走 mixedcut 专用工具，而不是通用抖音视频生产入口
- 本机 `localFilePath / localFilePaths` 的处理方式已在 Skill 文档中写明

## 影响范围

- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`

## 验证

- `pnpm build:server`
- 重新构建 Docker `server` 服务，确认运行态载入最新 Skill ZIP fallback 文本：
  - `docker compose -f docker/docker-compose.local-postgres-mixedcut.yml up -d --build server`
- OpenClaw MCP 真实验证仍保持通过：
  - `get_mixedcut_media_assets`
  - `create_mixedcut_remix_task`
  - `get_mixedcut_remix_task_progress`
  - stdio MCP 下 `localFilePath` 直通 mixedcut

## 后续建议

- 下一步如果要继续产品化，优先补 OpenClaw 安装中心页面上的 mixedcut 示例话术与可复制 prompt，让用户在客户端导入 Skill 后更容易直接说出正确任务句式。
