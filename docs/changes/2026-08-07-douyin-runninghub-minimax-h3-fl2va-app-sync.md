# 2026-08-07 抖音 RunningHub 接入 3 个 MiniMax H3 FL2VA 应用并同步 OpenClaw / Skill

## 背景

用户要求把以下 3 个 RunningHub 应用正式接入当前系统，并且不只是在抖音工作台里可见，还要同步到 OpenClaw / MCP / Skill 说明链路：

- `2084109189609246721`
  - `MiniMax H3 FL2VA开源版-文生视频`
- `2084087262228336642`
  - `MiniMax H3 FL2VA开源版-首帧参考生视频`
- `2084086089706459137`
  - `MiniMax H3 FL2VA开源版-首尾帧参考生视频`

排查现有结构后确认：

- 抖音 RunningHub 页面与 OpenClaw `runninghub:list_apps` 共用 `WorksService` 里的静态应用清单
- 每个应用的参数模板不是手写在代码里，而是运行时通过 `webappId` 拉取 `nodeInfoList`
- Skill ZIP 的路由说明来源于：
  - `docs/openclaw/skill-package/*.md`
  - `apps/server/src/modules/openclaw/openclaw-installation.service.ts` 中生成的根 `SKILL.md` 与 fallback 文档

因此本次采用“扩充通用应用清单 + 同步 Skill 文档”的最小影响方案，没有新增独立 MCP 工具，也没有改 RunningHub 提交协议。

## 本次改动

### 1. 扩充抖音 RunningHub 通用应用清单

更新文件：

- `apps/server/src/modules/works/works.service.ts`

新增 3 个 appKey：

- `minimax-h3-fl2va-text-to-video`
- `minimax-h3-fl2va-first-frame-video`
- `minimax-h3-fl2va-first-last-frame-video`

每个应用都补齐了：

- `name`
- `summary`
- `description`
- `tutorialUrl`
- `webappId`
- `tags`
- `statusHint`
- `estimatedDuration`

这样前端抖音 RunningHub 工作区和 OpenClaw `manage_douyin_video_production` 的 `section=runninghub action=list_apps` 会自动复用同一份列表。

### 2. 同步 OpenClaw / Skill ZIP 说明

更新文件：

- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`

同步内容：

- 在抖音 / RunningHub 路由说明里补充 3 个新 appKey 示例
- 在 Skill 高频任务手册里补充这 3 个应用的自然语言识别提示
- 在安装中心导出的根 `SKILL.md` 与 fallback 文档里同步相同示例，避免部署环境缺少源 Markdown 时退回旧说明

## 影响范围检查

本次改动前已确认影响面如下：

- 会影响：
  - 抖音工作台 RunningHub 应用卡片列表
  - OpenClaw / MCP `runninghub:list_apps`
  - Skill ZIP 中 RunningHub 路由说明
- 不会影响：
  - RunningHub 提交协议
  - `nodeInfoList` 动态读取方式
  - 数据库结构
  - OpenClaw 工具名与工具入参
  - 既有 RunningHub 作品记录兼容性

为避免副作用，本次没有新增独立 controller / tool / 页面分支，而是继续复用现有通用入口：

- 页面：抖音 RunningHub 通用卡片 + 通用详情弹窗
- MCP：`manage_douyin_video_production`
- section：`runninghub`

## 验证

本次已执行：

- 代码结构复核：
  - 确认前端列表来自 `getDouyinRunningHubApps`
  - 确认后端列表来自 `DOUYIN_RUNNING_HUB_APPS`
  - 确认 OpenClaw `runninghub:list_apps / get_app_detail / generate` 复用 `WorksService`
- 文档链路复核：
  - 确认 Skill ZIP 会打包 `docs/openclaw/skill-package/*`
  - 确认安装中心还会生成根 `SKILL.md`，并具备 fallback 文档
- 外部应用信息核对：
  - 读取 3 个 RunningHub API 详情页，核对名称、用途和时长提示

本次未执行：

- 未做真实 RunningHub 任务提交验证
  - 原因：需要当前品牌已配置有效 RunningHub API Key，并且属于实际计费调用
- 未做完整服务端 TypeScript 全量构建
  - 原因：当前工作区已存在多处与本轮无关的在制改动，先按最小边界完成本次接入

## 结果

完成后，以下三条链路口径一致：

1. 抖音工作台能看到这 3 个新应用
2. OpenClaw / MCP 能通过 `runninghub:list_apps` 读取到这 3 个 appKey
3. 新下载的 Skill ZIP 与 Skill 说明文档会提示这些 appKey 的用途与标准调用顺序
