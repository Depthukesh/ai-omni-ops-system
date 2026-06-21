# 2026-06-21 品牌全平台营销日历升级

## 背景

- 用户要求将原本归在小红书语义下的“营销日历”升级为品牌板块能力，不再只服务单个平台。
- 新能力需要同时兼顾品牌营销主题、小红书品牌号/员工号、抖音品牌号/IP号/员工号、朋友圈分发建议。
- 输入项也改为品牌背景资料、机会洞察总报告、品牌增长报告，以及系统内可生产内容功能清单。
- 技能中心、真实提示词文件、后端生成协议、前端详情弹窗都必须同步升级，否则会继续显示旧的“小红书 7 天选题”口径。

## 本次改动

### 1. 营销日历数据结构升级为多板块 schema

- 文件：
  - `apps/web/src/services/reports.ts`
  - `apps/server/src/modules/reports/reports.service.ts`
- 将营销日历 item 从旧的单层小红书字段升级为以下结构：
  - `brandMarketing`
  - `xiaohongshu.brandAccount`
  - `xiaohongshu.employeeAccount`
  - `douyin.brandAccount`
  - `douyin.ipAccount`
  - `douyin.employeeAccount`
  - `moments`
- 新增 `festivalOrSolarTerm`、`executionCapabilityInventory`、`sourceOpportunityReportId/sourceOpportunityReportTitle` 等字段。
- 为避免小红书原创、视频、公众号、开放调用链一次性全部重写，保留了由新结构派生出的旧字段兼容层，如 `topicName`、`titleDirections`、`noteKeywords` 等。

### 2. 营销日历生成输入改为品牌视角

- 文件：`apps/server/src/modules/reports/reports.service.ts`
- 营销日历生成前置条件从旧的“半年营销规划 + 小红书营销策划方案”切换为：
  - 品牌背景资料
  - 机会洞察总报告
  - 品牌增长报告
- 后端生成输入新增 `systemGeneratedContentFunctions`，由系统内小红书、抖音、公众号、朋友圈可复用能力生成并随结果保存。
- 历史营销日历保留用于避免重复主题，并作为模型生成上下文的一部分继续输入。

### 3. 模型输出协议和提示词同步升级

- 文件：
  - `提示词/营销日历提示词.txt`
  - `apps/server/src/common/prompt-fallbacks.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 将营销日历运行提示词改为“品牌全平台营销日历生成”语义。
- 输出 JSON 结构强制要求：
  - `date`
  - `festivalOrSolarTerm`
  - `brandMarketing`
  - `xiaohongshu`
  - `douyin`
  - `moments`
- `prompt_xhs_calendar` 被纳入 source-pinned prompt 同步集合，避免数据库继续保留旧 scene 或短占位文案。

### 4. 技能中心展示同步为品牌全平台能力

- 文件：
  - `packages/shared/src/skill-center-manifest.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 技能中心叶子节点改为“营销日历-品牌全平台营销日历”。
- prompt scene 改为“品牌全平台营销日历生成”。
- 保持现有 `skill_xhs_calendar` / `xiaohongshu-marketing-calendar` / `prompt_xhs_calendar` 标识不变，优先保证线上兼容和已有绑定稳定。

### 5. 品牌板块和详情弹窗改为多平台展示

- 文件：
  - `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/calendar-workspace.tsx`
- 品牌增长工作区中的营销日历入口文案、按钮启用门槛和校验提示均改成品牌口径。
- 日历详情弹窗改为分区展示：
  - 品牌营销板块
  - 小红书品牌号
  - 小红书员工号
  - 抖音品牌号
  - 抖音 IP 号
  - 抖音员工号
  - 朋友圈
- 详情编辑改为 path-based 更新方式，支持嵌套字段保存。

### 6. 下游消费链增加兼容投影

- 文件：
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/openclaw/openclaw.service.ts`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- 为原创笔记、视频笔记、公众号工作流、开放接口等仍依赖旧字段的入口补了统一派生逻辑。
- 通过 `buildMarketingCalendarWorkflowSelection(...)` 与对应前端/works 侧的 topic 解析逻辑，保证新旧 schema 并存期间不阻断已有工作流。

## 影响

- 营销日历现在以品牌为中心组织，而不再是“小红书单平台日历”。
- 生成结果能直接覆盖品牌营销主题、双平台账号分工和朋友圈复用建议。
- 技能中心、真实提示词、后端生成链与前端详情展示保持一致，不会再出现“界面是品牌能力，运行还是小红书旧 prompt”的错位。
- 旧工作流在未整体重构前，继续通过兼容投影消费营销日历，降低联动改造风险。

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/openclaw/openclaw.service.ts`
  - `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/calendar-workspace.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/services/reports.ts`
- `npm --workspace apps/server run build`
- `npm --workspace apps/web run build`

## 后续建议

- 下一步建议补一轮真实页面联调，重点验证“品牌增长报告 -> 营销日历生成 -> 弹窗编辑 -> 原创笔记/视频笔记/公众号复用”的完整链路。
- 当前仍保留旧 slug 和 prompt id 兼容，后续若要彻底品牌化命名，可单独做一轮 ID 迁移与历史数据回填。
