# 2026-08-31 内容获客某音某号 RunningHub 应用补充同步 2 个应用

## 背景

用户要求把以下 2 个 RunningHub 应用接入 `内容获客 -> 某音/某号 -> RunningHub应用`：

- `2090476428323287041`
  - `音频裁剪驱动MiniMax H3数字人-单图版`
- `2085597941657587714`
  - `MiniMax H3(全能多图生视频)4步Lora超级加速版+2k放大V3`

排查现有实现后确认：

- 内容获客 `某音/某号 -> RunningHub应用`
- 抖音兼容直达页 `/douyin`
- OpenClaw / MCP 的 `runninghub:list_apps`

三者都复用 `apps/server/src/modules/works/works.service.ts` 里的同一份统一应用清单，因此这次继续采用“扩充统一清单 + 同步 OpenClaw 安装中心 / Skill 示例”的低影响方案，不新增页面、不改数据库、不改 RunningHub 提交协议。

## 本次改动

### 1. 扩充 RunningHub 统一应用清单

更新文件：

- `apps/server/src/modules/works/works.service.ts`

新增 2 个 appKey：

- `minimax-h3-audio-clip-single-image-digital-human`
  - `音频裁剪驱动MiniMax H3数字人-单图版`
- `minimax-h3-multi-image-2k-upscale-v3`
  - `MiniMax H3(全能多图生视频)4步Lora超级加速版+2k放大V3`

同步补齐：

- `tutorialUrl`
- `webappId`
- `summary`
- `description`
- `tags`
- `statusHint`
- `estimatedDuration`

完成后，内容获客 RunningHub 卡片列表、抖音兼容直达页 RunningHub 卡片列表，以及 OpenClaw / MCP `runninghub:list_apps` 会自动共用这 2 个新应用。

### 2. 同步 OpenClaw 安装中心与 Skill / MCP 示例

更新文件：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

同步内容：

- 把 RunningHub 常见 appKey 示例补充到安装中心导出的说明
- 让 Skill ZIP、站内安装说明和实际页面卡片保持同一口径

### 3. 同步站点文档

更新文件：

- `docs/site-map.md`
- `docs/README.md`

同步内容：

- 在内容获客 / 抖音 RunningHub 描述里补充“音频裁剪驱动数字人、2K 多图生视频”等新增示例
- 把本次变更纳入文档入口与最近关注文档

## 影响范围检查

本次会影响：

- 内容获客 `某音/某号 -> RunningHub应用` 卡片列表
- 抖音兼容直达页 `/douyin` 的 RunningHub 卡片列表
- OpenClaw / MCP `runninghub:list_apps`
- OpenClaw 安装中心导出的 RunningHub 示例说明
- Skill ZIP / Skill 手册里的 RunningHub 示例列表

本次不会影响：

- RunningHub `get_app_detail / generate / delete` 协议
- `nodeInfoList` 模板拉取逻辑
- RunningHub 作品记录结构
- 数据库 schema

## 验证

本次执行：

- 代码结构核对：
  - 确认前端 `内容获客 -> 某音/某号 -> RunningHub应用` 与 `/douyin` 都复用 `/works/brands/:brandId/douyin/runninghub/apps`
  - 确认后端列表来自 `DOUYIN_RUNNING_HUB_APPS`
  - 确认 OpenClaw `runninghub:list_apps` 复用 `WorksService`
- 外部信息核对：
  - 读取 2 个 RunningHub API 详情页，核对标题与用途
- 构建验证：
  - `pnpm build:server`

## 结果

完成后，这 2 个 RunningHub 应用会同时出现在：

- 内容获客 `某音/某号 -> RunningHub应用`
- 抖音兼容直达页 `/douyin`
- OpenClaw / MCP `runninghub:list_apps`

不需要额外维护多套清单。
