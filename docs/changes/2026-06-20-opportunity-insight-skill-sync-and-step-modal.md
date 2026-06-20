# 2026-06-20 机会洞察技能同步与步骤弹窗修复

## 背景

- 机会洞察 4 个技能虽然已经注册进技能中心，但个人中心在部分运行环境下仍显示旧的短提示词。
- 根因不是单一前端缓存，而是“技能完整安装链”只覆盖了数据库同步，没有覆盖无数据库 fallback 的提示词读取链。
- 同时，机会洞察步骤补充要求被直接渲染在页面内，不符合“点击按钮后弹窗输入再提交”的交互要求。

## 本次修复

### 1. 修复技能中心提示词真源

- 保留并继续使用以下 3 个用户明确指定的本地提示词文件：
  - `../提示词/账号分析.txt`
  - `../提示词/竞品账号分析.txt`
  - `../提示词/评论洞察提示词.txt`
- 移除 `prompt_opportunity_insight_final_report` 对 `../提示词/机会洞察.txt` 的优先映射，避免将旧需求说明文件反向写回技能中心平台基线。
- 在 `SkillsPromptsService` 中补齐无数据库 fallback 链路：
  - `getPromptById`
  - `getActivePromptByScene`
  - `listPromptRows`
  - `resolvePromptFromPayload`
- 上述链路在走内存 `database.promptTemplates` 时，也会重新读取本地提示词文件，不再直接使用 `mock-data.ts` 里的旧短 prompt。

### 2. 修复步骤补充要求交互

- 移除机会洞察页内嵌的 3 个 textarea 输入区。
- 新增 `OpportunityInsightStepInputModal`，使用统一弹窗壳承载“用户要求/补充资料”输入。
- 调整机会洞察按钮行为：
  - 点击“立刻机会洞察 / 开始第 2 步 / 开始第 3 步”时，先打开步骤弹窗。
  - 点击“重试第 1 步 / 重试第 2 步 / 重试第 3 步”时，也先打开步骤弹窗。
- 弹窗提交后，才会真正调用对应 step 接口，并把补充要求透传给后端生成任务。

## 涉及文件

- `apps/server/src/common/prompt-source-loader.ts`
- `apps/server/src/modules/admin/skills-prompts.service.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/report-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/opportunity-insight-step-input-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`

## 验证

- `npm --workspace apps/server run build`
- `npm --workspace apps/web run build`
