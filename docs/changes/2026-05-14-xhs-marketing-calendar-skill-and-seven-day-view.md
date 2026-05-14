# 2026-05-14 小红书营销日历技能接入与 7 天视图修复

## 背景

- 用户反馈小红书工作台“营销日历”点击“一键生成”没有明显产出，同时前台个人中心技能中心与后台技能中心都缺少“营销日历”技能条目
- 本次真实技能提示词文件位于 `提示词/营销日历提示词.txt`，并要求文本生成优先走 `deepseek-v4-pro`
- 现有网站地图虽已写明营销日历应走后台任务异步生成并展示详情，但代码层尚未把营销日历纳入技能/提示词注册中心统一维护

## 本次改动

### 1. 将营销日历补入技能/提示词注册表

- 文件：
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/services/admin.ts`
- 新增 `skill_xhs_calendar / xiaohongshu-marketing-calendar`
- 新增 `prompt_xhs_calendar`
- 提示词内容回源到 `提示词/营销日历提示词.txt`
- 前台个人中心技能中心与后台技能中心现在都能看到“营销日历”这一条技能

### 2. 营销日历生成接入技能中心模型配置

- 文件：`apps/server/src/modules/reports/reports.service.ts`
- `loadXiaohongshuMarketingCalendarGenerationSettings()` 现改为优先读取：
  - 技能：`xiaohongshu-marketing-calendar`
  - 提示词：`prompt_xhs_calendar`
- 运行时优先尝试后台技能中心中为该技能配置的默认模型，并以 `deepseek-v4-pro` 作为默认兜底
- 当数据库或注册表缺失时，仍保留直接读取 `提示词/营销日历提示词.txt` 的兜底逻辑，避免本地联调中断

### 3. 后台技能中心补充营销日历入口

- 文件：`apps/web/src/app/(dashboard)/admin/page.tsx`
- 小红书 > 营销规划 分组下新增“营销日历-生成7天营销日历”
- 后台技能树现在可以直接定位到该技能与提示词场景

### 4. 营销日历页面改为 7 天真实日历卡片

- 文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/calendar-helpers.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/calendar-workspace.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - `apps/web/src/styles/globals.css`
- 原先按月份矩阵翻页的展示改为当前最新一轮“未来 7 天”横向日历卡片
- 卡片直接展示：
  - 月份 + 日期
  - 星期
  - 节日/节气
  - 当天主题
  - 笔记类型
- 点击单日卡片后继续在弹窗中查看当天完整详情
- 详情弹窗补充展示“笔记类型”

### 5. 修复营销日历提示词被短文案覆盖的问题

- 文件：
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 修复点：
  - `prompt_xhs_calendar` 的 seed 内容改为直接回源 `提示词/营销日历提示词.txt`，不再保留一句占位式短文案
  - 后台技能中心展示营销日历时，不再回退到技能说明或树节点说明充当“技能提示词”
  - 对 `txt` 单文件提示词同样按“源文件托管”处理，后台只读展示原始内容，避免误编辑数据库中的短内容覆盖真实技能稿

### 6. 提升营销日历内容结构与详情版式

- 文件：
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/web/src/services/reports.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/calendar-workspace.tsx`
  - `apps/web/src/styles/globals.css`
- 营销日历生成提示补充了更强的字段约束，要求模型尽量完整返回：
  - `noteType`
  - `targetAudience`
  - `contentGoal`
  - `expressionFocus`
  - `topicContent`
  - `noteKeywords`
  - `titleDirections`
  - `bodyStructure`
  - `coverFormat`
  - `coverKeywords`
  - `imageBrief`
- 前端详情面板改为更接近真实排期面板的 4 区块结构：
  - 基础信息
  - 选题策略
  - 关键词与标题
  - 封面与配图
- 日历卡片补充内容目的、笔记类型和产品标签，让“7 天排期”在主视图中就能快速扫读

## 影响

- 小红书营销日历正式纳入前后台统一技能中心，后续可通过技能中心维护默认模型、状态与提示词
- 营销日历工作区的“一键生成”与后台任务、提示词配置和技能中心形成一致闭环
- 用户在营销日历页可以按真实 7 天日历视角查看“月份 + 日期 + 主题”，更符合排期使用场景
- 后台与个人中心现在看到的是完整营销日历提示词原文，不再被一句短文案误导
- 营销日历生成结果对字段完整度要求更高，前端详情展示也更适合直接交付给创作执行

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/calendar-helpers.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/calendar-workspace.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/styles/globals.css`
- `npm run build:server`
- `npm run build:web`

## 后续建议

- 下一步在本地联调时，优先验证“营销日历一键生成 -> 任务状态推进 -> 7 天卡片落地 -> 点击详情”这条完整链路
- 若用户还要求“像真实日历一样按周横向滚动查看更多历史批次”，可以再在现有 7 天视图基础上补“批次切换”而不是回退到月份矩阵
