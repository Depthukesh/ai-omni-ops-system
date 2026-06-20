# 2026-06-21 机会洞察 fallback 与技能中心热修复

## 背景

- 用户再次反馈两个问题仍未真正修复：
  - 机会洞察第 2 步评论洞察在 `gpt-5.4` 失败后，没有继续按既定顺序切换到 `kimi-k2.6 -> deepseek-v4-pro -> deepseek-v4-flash`
  - 个人中心/后台技能中心里的机会洞察 4 个技能，看到的提示词仍然不是用户指定的本地提示词文件内容

## 根因

### 1. 第 2 步 fallback 链被返回前再次压缩

- `ReportsService.loadOpportunityInsightNarrativeProviderConfigs(...)` 前面虽然已经拼出了 `THIRD_PARTY / KIMI / DEEPSEEK` 多 Provider 列表
- 但返回前又调用了一次 `applyReportProviderSelectionRule(...)`
- 当首选模型是 `gpt-5.4` 时，这一步会把候选 Provider 再次筛回首选 Provider，导致运行时只持续尝试 `THIRD_PARTY/gpt-5.4`

### 2. 技能中心存在两层旧内容抢占

- 第一层：数据库读取 `PromptTemplate` 时，机会洞察 4 个 prompt 没有再次按本地源文件水合，因此真表或缓存里残留的旧内容仍可能直接显示出来
- 第二层：`UserSkillsService` 仍兼容历史的未绑定 `baseSkillId` 的 prompt override，这类旧覆盖会继续抢占机会洞察 prompt 的 effective content
- 同时，mock fallback 下执行“恢复平台基线”时，旧 override 只按 `baseSkillId` 删除，没有按 `promptId` 一并清掉

## 修复

### 1. 恢复机会洞察第 2/3 步的真实多模型回退链

- 在 `apps/server/src/modules/reports/reports.service.ts` 中，机会洞察 narrative provider 列表返回前不再调用 `applyReportProviderSelectionRule(...)`
- 保留前面已经排好的多 Provider 列表，仅按首选模型做顺序重排

### 2. 固定机会洞察 4 个 prompt 的源文件真源读取

- 在 `apps/server/src/modules/admin/skills-prompts.service.ts` 中新增 source-pinned prompt 处理
- 对以下 4 个 prompt：
  - `prompt_opportunity_insight_brand_account`
  - `prompt_opportunity_insight_competitor_account`
  - `prompt_opportunity_insight_comment`
  - `prompt_opportunity_insight_final_report`
- 无论是按 `id`、按 `scene` 读取，还是列表读取，都会再次从本地提示词文件读取内容

### 3. 屏蔽机会洞察的历史脏 override 抢占

- 在 `apps/server/src/modules/user-skills/user-skills.service.ts` 中：
  - 优先匹配当前技能自己的 scoped override
  - 对机会洞察 4 个 prompt，不再继续使用历史遗留的“未绑定 `baseSkillId`” override 作为 effective prompt
  - mock fallback 下重置技能时，同时按 `promptId` 清理对应旧 override

## 验证

- `npm --workspace apps/server run build`
- `npm --workspace apps/web run build`

以上构建均已通过。
