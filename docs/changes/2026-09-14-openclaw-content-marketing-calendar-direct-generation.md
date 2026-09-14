# 2026-09-14 OpenClaw 内容获客营销日历直生成修复

## 背景

用户在 `内容获客 -> 某音/某号 -> 营销日历` 里通过 OpenClaw 提交“生成每日营销选题”时，当前链路会暴露两层不必要限制：

1. OpenClaw 容易把内容获客营销日历误路由成 `generate_douyin_marketing_calendar` 这类别名 action，而后端此前并不兼容这些 action。
2. 即使走到真正的营销日历生成接口，`generateXiaohongshuMarketingCalendar()` 之前也强依赖：
   - 品牌增长报告
   - 机会洞察总报告

这会让内容获客营销日历在实际使用中被前置报告链路卡住，无法直接生成首版每日营销选题。

## 本次修正

### 1. 放开营销日历首版生成前置

- `apps/server/src/modules/reports/reports.service.ts`
- 营销日历生成链路不再因为缺少品牌增长报告或机会洞察总报告而直接报错。
- 当这两份前置报告尚未就绪时，系统会：
  - 基于品牌背景资料
  - 基于产品资料
  - 自动补出轻量前置摘要
  - 再直接触发首版 7 天营销日历生成
- 同时补齐营销日历模型 provider 兜底：如果当前环境只有 `text-global` 这类第三方文本 provider，而没有启用 `text-domestic-deepseek/kimi/doubao`，营销日历也能复用全局文本 provider，不再直接报“营销日历模型配置读取失败”。
- 并把营销日历默认可选模型列表补齐为和营销策划方案一致的全局+国内混合顺序，避免当前环境虽然存在 `text-global`，但只挂了 `gpt-5.4 / claude-sonnet-4-6` 这类模型时，仍因为旧代码只筛 `deepseek/kimi/doubao` 而继续报错。
- 同时放宽 provider 模型候选读取：营销日历不再只依赖 provider 的 `modelWhitelist`，也会把 provider 的 `defaultModel` 作为候选模型；这样即使后台白名单没填全，只要默认模型已配置，营销日历仍可正常生成。

### 2. OpenClaw 兼容内容获客营销日历别名 action

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `manage_growth_reports` 当前新增兼容：
  - `get_douyin_marketing_calendar_workspace`
  - `generate_douyin_marketing_calendar`
  - `update_douyin_marketing_calendar`
  - `get_wechat_marketing_calendar_workspace`
  - `generate_wechat_marketing_calendar`
  - `update_wechat_marketing_calendar`

这些别名仍然写回同一份品牌增长营销日历真源，不新增第二套存储。

### 3. Skill / MCP 文档口径同步

- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

同步说明：

- 内容获客三端营销日历支持直接生成首版每日营销选题
- 不再默认提示“必须先生成品牌增长报告 / 机会洞察总报告”
- `manage_growth_reports` 已兼容内容获客营销日历别名 action

## 影响范围

- `内容获客 -> 某书 / 某音/某号 / 公众号 -> 营销日历`
- OpenClaw `manage_growth_reports`
- 报表模块营销日历生成链路

## 风险控制

- 没有新增第二套营销日历真源，继续复用原有品牌增长营销日历存储
- 没有改前端营销日历编辑协议
- 当前只是把“缺前置报告时直接失败”改为“自动补轻量摘要后继续生成”，避免内容获客入口被品牌增长主链路硬卡死

## 验证建议

- 在未先生成品牌增长报告、未先生成机会洞察总报告的品牌下，直接从内容获客营销日历发起生成，确认任务可正常进入 `QUEUED/RUNNING`
- 用 OpenClaw 走 `generate_douyin_marketing_calendar` 或 `generate_wechat_marketing_calendar`，确认不再报 `不支持的 action`
- 确认生成后的营销日历仍然写回原有营销日历工作区，而不是新增第二套数据
