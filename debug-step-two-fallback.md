# Debug Session: step-two-fallback [OPEN]

## Symptoms
- 机会洞察第 2 步报错后，没有按 `gpt-5.4 -> kimi-k2.6 -> deepseek-v4-pro -> deepseek-v4-flash` 顺序继续尝试。
- 前端错误文案里只看到 `THIRD_PARTY/gpt-5.4` 的尝试轨迹。

## Hypotheses
1. 第 2 步运行时构造出的 narrative provider 列表实际上只包含 `THIRD_PARTY`，`KIMI` 与 `DEEPSEEK` 在进入候选前就被过滤掉了。
2. `KIMI` / `DEEPSEEK` provider 已被加载，但运行时可用 `apiKeys` 为空，导致循环里被静默跳过。
3. `KIMI` / `DEEPSEEK` provider 已存在，但 `models` 为空或未命中 `kimi-k2.6` / `deepseek-v4-pro` / `deepseek-v4-flash`，导致未进入尝试循环。
4. 前端展示的失败轨迹不是完整后端 `attemptTrail`，而是中途状态或截断信息，导致看起来像只尝试了 `gpt-5.4`。
5. 第 2 步实际走的不是当前修过的 provider 配置链，而是旧任务状态、旧服务实例或另一条分支逻辑。

## Plan
- 仅添加埋点，不改业务逻辑。
- 抓取第 2 步生成设置、provider 候选、每个 provider 的 `baseUrls/apiKeys/models` 数量和最终 `attemptTrail`。
- 复现一次后，根据日志证据收敛根因，再做最小修复。

## Evidence Update
- 用户补充说明：截图中的报错实际发生在第 3 步，而不是第 2 步。
- 第 2 步与第 3 步共用 `loadOpportunityInsightNarrativeProviderConfigs()` + `generateOpportunityInsightNarrativeMarkdownByModel()` 这条 narrative provider 选择链。
- 代码证据：`loadOpportunityInsightNarrativeProviderConfigs()` 在组装完 `THIRD_PARTY/KIMI/DEEPSEEK` 后，末尾仍对 narrative providers 执行了 `applyReportProviderSelectionRule(...)`。
- 运行时表象证据：前端失败轨迹只显示 `THIRD_PARTY/gpt-5.4`，与“二次筛选后只剩全球 provider”一致。

## Current Fix
- 已对 narrative 共享链做最小修复：返回 provider 列表时不再应用 `applyReportProviderSelectionRule(...)`。
- 保留调试埋点，并把 `requested / ruleSelected / actual` provider 摘要注入失败轨迹，便于线上复现时直接读取证据。
