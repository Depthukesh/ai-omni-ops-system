# 机会洞察第1步与4技能注册

## 1. 变更背景

- 品牌增长报告页面已新增“机会洞察”板块，但原先对能力拆分的定义不够准确。
- 业务上不是 3 个技能，而是 4 个独立技能：`品牌账号分析`、`竞品账号分析`、`评论洞察分析`、`机会洞察总报告`。
- 机会洞察第 1 步需要同时完成品牌账号分析和竞品账号分析，并且每份报告都要独立沉淀为 HTML 结果，供后续确认和总报告整合使用。

## 2. 变更目标

- 将机会洞察统一调整为 4 个独立技能，并接入后台技能中心与能力包 registry。
- 打通机会洞察第 1 步后端执行链：创建任务、运行模型、生成 Markdown、持久化 HTML、映射工作区结果。
- 保持“第 1 步完成后等待确认，再进入第 2 步；第 2 步完成后再进入第 3 步”的工作流门控结构。

## 3. 修改内容

### 3.1 前端

- 本轮未新增前端文件改动，沿用此前已接入的机会洞察页签、卡片、工作区状态和确认门控 UI。
- 工作区数据结构继续按 4 个结果槽位渲染：
  - `brandAccountAnalysis`
  - `competitorAccountAnalysis`
  - `commentInsightAnalysis`
  - `finalOpportunityReport`

### 3.2 后端

- 在 `apps/server/src/modules/reports/reports.service.ts` 补齐机会洞察第 1 步执行链。
- 新增第 1 步任务创建方法，任务类型使用 `OPPORTUNITY_INSIGHT_STEP_ONE`。
- 新增第 1 步运行方法，按阶段依次执行：
  - 品牌账号分析
  - 竞品账号分析
  - HTML 持久化
- 新增机会洞察阶段状态构造与任务状态更新逻辑，用于工作区轮询和进度展示。
- 新增第 1 步输入构造逻辑，复用品牌资料库、`getXiaohongshuWorkspace()`、`getDouyinWorkspace()` 的已有采集数据。
- 新增账号分析报告生成方法，按技能分别加载 prompt 与模型设置，并输出详尽 Markdown 后转为 HTML。
- 新增机会洞察报告资产映射、任务映射和工作区聚合逻辑，后端 workspace 明确保留 4 个技能结果位与 `awaitingConfirmationStep`。
- 在 `apps/server/src/common/prompt-source-loader.ts` 新增 `prompt_opportunity_insight_final_report` 的本地提示词候选文件路径。
- 在 `apps/server/src/modules/admin/skills-prompts.service.ts` 补齐 4 个技能与 4 个 prompt 的绑定关系。

### 3.3 数据与配置

- 在 `apps/server/src/common/mock-data.ts` 新增 `sp_opportunity_insight` 能力包种子。
- 将 `brand-growth-workbench` 的 `defaultSkillPackages` 扩展为包含 `opportunity-insight`。
- 新增 `opportunity-insight` 能力包版本 `spv_opportunity_insight_v1`。
- 新增能力包与模块绑定：
  - `brand-growth-workbench` -> `opportunity-insight`
- 新增能力包与 4 个技能绑定：
  - `skill_opportunity_insight_brand_account`
  - `skill_opportunity_insight_competitor_account`
  - `skill_opportunity_insight_comment`
  - `skill_opportunity_insight_final_report`
- 新增能力包知识空间绑定：
  - `kb_brand_docs`
  - `kb_competitor_cases`

## 4. 修改意图

- 将第 1 步拆成两个技能，而不是一个笼统的“账号分析”，是为了让品牌分析和竞品分析分别沉淀产物，便于人工确认和后续总报告引用。
- 继续复用 `create -> run -> persist -> map -> workspace` 模式，是为了与品牌增长报告、抖音文案等已有异步任务体系保持一致，减少后续维护成本。
- 先打通第 1 步并补齐 registry，再继续推进第 2 步和第 3 步，可以降低一次性改动面过大导致的诊断风险。

## 5. 影响范围

- 影响页面：`/brand-growth` 下的机会洞察板块与工作区数据展示。
- 影响接口：机会洞察 workspace 查询接口与第 1 步生成接口。
- 影响模块：品牌增长工作台、后台技能中心、能力包 registry、prompt 绑定链路。
- 是否影响已有数据：否，主要为新增能力包绑定和新增机会洞察报告资产类型。

## 6. 验证方式

- 手工验证：
  - 进入品牌增长工作台，确认机会洞察工作区返回 4 个技能槽位。
  - 触发第 1 步生成后，确认任务状态会经历准备中、品牌账号分析、竞品账号分析、保存中等阶段。
  - 第 1 步完成后，确认品牌账号分析与竞品账号分析各自产生独立 HTML 报告记录。
- 接口验证：
  - 调用机会洞察 workspace 查询接口，确认 `awaitingConfirmationStep` 逻辑符合 1 -> 2 -> 3 的门控顺序。
  - 调用第 1 步生成接口，确认返回任务记录并能被轮询更新。
- 日志验证：
  - 沿用 `reports.service.ts` 现有任务失败与模型尝试轨迹日志。
- 编译/诊断验证：
  - 已执行 `reports.service.ts` 文件诊断。
  - 已执行 `mock-data.ts` 文件诊断。
  - 当前两处诊断结果均无新增 TypeScript 报错。

## 7. 风险与后续

- 当前仅完整落地了第 1 步，`评论洞察分析` 与 `机会洞察总报告` 的真实执行链仍需继续补齐。
- 第 2 步还需要补评论数据缺失时的“提示但不报错”兜底逻辑，以及品牌资料库评论内容检索策略。
- 第 3 步还需要补“整合品牌资料 + 前两步 HTML 结果”的模型输入拼装与 HTML 持久化。
- 当前完成的是首轮文件级诊断，后续仍建议补服务端构建验证。

## 8. 相关文件

- `apps/server/src/modules/reports/reports.service.ts`
- `apps/server/src/common/prompt-source-loader.ts`
- `apps/server/src/modules/admin/skills-prompts.service.ts`
- `apps/server/src/common/mock-data.ts`
- `docs/changes/2026-06-20-opportunity-insight-step-one-and-skill-registry.md`
