# 2026-08-17 内容获客 / 某音某号 RunningHub 应用扩容

## 背景

用户要求在 `内容获客 -> 某音/某号 -> RunningHub应用` 板块新增一批 RunningHub 应用入口。

排查现有实现后确认：

- 内容获客里的 `某音/某号 -> RunningHub应用` 复用的是抖音工作台同一套 RunningHub 通用应用清单
- 前端卡片列表、抖音兼容直达页，以及 OpenClaw / MCP 的 `runninghub:list_apps` 都来自 `WorksService` 里的同一份静态配置
- 因此本次采用“扩充统一清单 + 同步最小必要文档”的低影响方案，不新增新页面、不改提交协议、不改数据库

## 本次新增应用

本次新增以下 11 个 RunningHub 应用：

- `2085581419040034818`
  - `8步加速Mini Max H3图生视频`
- `2086885188755349505`
  - `MiniMax H3 4步加速 图生视频 首尾帧生视频`
- `2085890677094834178`
  - `Seedance2.5多模态视频`
- `1953073163158622209`
  - `中文字体设计 - 媲美即梦 - Qwen-Image图生图`
- `1954920175764213761`
  - `【超全字体设计】Qwen文生图-8步加速（持续加更）`
- `2087128881869451265`
  - `Minimax H3（加速版）全能参考视频`
- `2089298247885086722`
  - `MiniMax H3 FL2VA-多图参考生视频`
- `2089048490512052225`
  - `MiniMax-H3-数字人-唱歌 说唱 口播 虚拟主播 电商产品讲解【自动版】`
- `2085575865559248897`
  - `Seedance 2.0 复刻爆款视频 (反推+图生视频）`
- `2065722002014564353`
  - `Seedance 2.0 Fast 全能生视频`
- `2061472073171689473`
  - `seedance2.0-fast（RH版）`

## 本次改动

### 1. 扩充 RunningHub 统一应用清单

更新文件：

- `apps/server/src/modules/works/works.service.ts`

新增对应 appKey、名称、摘要、说明、教程链接、`webappId`、标签和耗时提示。

完成后，以下入口会自动共用同一批新增应用：

- 内容获客 `某音/某号 -> RunningHub应用`
- 抖音兼容直达页 `/douyin`
- OpenClaw / MCP `manage_douyin_video_production` 的 `section=runninghub action=list_apps`

### 2. 同步 OpenClaw 安装中心与 Skill 文档示例

更新文件：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

同步内容：

- 把旧的“仅 3 个 MiniMax H3 FL2VA 示例”更新为当前常见 RunningHub appKey 示例
- 让安装中心导出的 Skill ZIP、站内说明文档和实际页面清单保持一致

### 3. 同步网站地图

更新文件：

- `docs/site-map.md`
- `docs/site-map-mermaid.md`

同步内容：

- 把 RunningHub 板块描述从“仅 3 个 MiniMax H3 FL2VA 应用”更新为“已扩充为多类应用清单”
- 在 `site-map.md` 的对应板块挂上本次变更记录

## 影响范围检查

本次确认影响面如下：

- 会影响：
  - 内容获客 `某音/某号 -> RunningHub应用` 卡片列表
  - 抖音兼容直达页 `/douyin` 的 RunningHub 卡片列表
  - OpenClaw / MCP `runninghub:list_apps`
  - OpenClaw 安装中心导出的 Skill 示例与站内说明文档
- 不会影响：
  - RunningHub `get_app_detail / generate` 提交协议
  - `nodeInfoList` 动态模板拉取逻辑
  - 数据库结构
  - 既有 RunningHub 作品记录兼容性

## 验证

本次已执行：

- 代码结构核对：
  - 确认内容获客与抖音兼容页复用同一套 `DouyinWorkspaceShell / DouyinRunningHubWorkspace`
  - 确认前端列表来自 `/works/brands/:brandId/douyin/runninghub/apps`
  - 确认后端列表由 `DOUYIN_RUNNING_HUB_APPS` 提供
  - 确认 OpenClaw `runninghub:list_apps` 复用 `WorksService`
- 外部信息核对：
  - 逐个读取 11 个 RunningHub API 详情页，核对标题与大类用途

本次计划补做：

- `pnpm build:server`

## 结果

完成后，内容获客 RunningHub 板块、抖音兼容页和 OpenClaw / MCP 的 RunningHub 应用列表会自动共享这 11 个新增应用，不再需要分别维护多套清单。
