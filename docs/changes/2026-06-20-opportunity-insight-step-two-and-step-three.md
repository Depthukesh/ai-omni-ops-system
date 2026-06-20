# 机会洞察第2步与第3步接线

## 1. 变更背景

- 机会洞察第 1 步已经能产出 `品牌账号分析` 和 `竞品账号分析` 两份 HTML 报告，但第 2 步 `评论洞察分析` 与第 3 步 `机会洞察总报告` 仍停留在占位状态。
- 前端和后端此前都只有 step-one 的生成入口，工作区也还没有按 `awaitingConfirmationStep` 切换按钮和任务流转。
- 业务要求保持 3 步流程、4 个技能拆分，并且每一步完成后都保留确认门。

## 2. 本次完成内容

### 2.1 后端执行链

- 在 `apps/server/src/modules/reports/reports.service.ts` 新增机会洞察 step2 / step3 的公共入口：
  - `generateOpportunityInsightStepTwo(...)`
  - `generateOpportunityInsightStepThree(...)`
- 新增 step2 / step3 的任务创建、执行、持久化链路：
  - `createOpportunityInsightStepTwoTask(...)`
  - `createOpportunityInsightStepThreeTask(...)`
  - `runOpportunityInsightStepTwoTask(...)`
  - `runOpportunityInsightStepThreeTask(...)`
- 新增评论洞察与总报告生成器：
  - `buildOpportunityInsightCommentReport(...)`
  - `buildOpportunityInsightFinalReport(...)`
- 新增 step2 / step3 输入构造、知识库 query 与知识上下文构造，继续复用现有 `buildExecutionKnowledgeContext(...)` 机制。
- 新增 `loadOpportunityInsightNarrativeProviderConfigs(...)`，将模型尝试顺序落实为：
  - `gpt-5.5`
  - `kimi-k2.6`
  - `deepseek-v4-pro`
  - `deepseek-v4-flash`
- 修复机会洞察任务超时状态更新误用增长报告方法的问题，统一改为 `updateOpportunityInsightTaskStatus(...)`。

### 2.2 路由与前端 service

- 在 `apps/server/src/modules/reports/reports.controller.ts` 新增：
  - `POST /reports/brands/:brandId/opportunity-insight/step-two/generate`
  - `POST /reports/brands/:brandId/opportunity-insight/step-three/generate`
- 在 `apps/web/src/services/reports.ts` 新增：
  - `generateOpportunityInsightStepTwo(...)`
  - `generateOpportunityInsightStepThree(...)`

### 2.3 前端工作区

- 在 `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx` 将机会洞察主按钮从固定 step1 改为按 `awaitingConfirmationStep` 驱动：
  - 未开始时显示 `立刻机会洞察`
  - step1 完成后显示 `开始第 2 步`
  - step2 完成后显示 `开始第 3 步`
  - 总报告已存在时显示 `重新生成总报告`
- 同一处理函数会根据当前工作区状态自动调用 step1 / step2 / step3 的生成接口，并更新对应提示文案。
- 在 `apps/web/src/app/(dashboard)/brand-growth/report-workspace.tsx` 补齐评论洞察分析和机会洞察总报告的卡片状态、流程说明和 iframe 预览区域。

## 3. 特殊业务规则

- 评论数据缺失时不直接报错，而是输出提醒型报告，提示去：
  - `搜集数据 - 抖音 - 评论数据` 采集评论
  - 或 `品牌资料库 - 企业知识库` 上传评论相关资料
- 第 2 步必须建立在 step1 两份账号分析都完成的前提下。
- 第 3 步必须建立在 step2 评论洞察完成的前提下。
- 所有长文报告继续要求详尽输出，不少于 2000 字，并且结论必须尽量引用输入数据、评论样本、前序报告或知识库内容。

## 4. 验证结果

- 文件诊断：
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/server/src/modules/reports/reports.controller.ts`
  - `apps/web/src/services/reports.ts`
  - `apps/web/src/services/brand-growth.ts`
  - `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - `apps/web/src/app/(dashboard)/brand-growth/report-workspace.tsx`
  - 以上诊断结果均无新增 TypeScript 报错。
- 构建验证：
  - 已执行 `npm --workspace apps/server run build`
  - 已执行 `npm --workspace apps/web run build`
  - 两者均通过

## 5. 影响范围

- 页面：`/brand-growth` 的机会洞察页签和工作区
- 接口：机会洞察 step2 / step3 生成接口
- 模块：品牌增长报告模块、机会洞察异步任务执行链、品牌权限前端类型声明

## 6. 相关文件

- `apps/server/src/modules/reports/reports.service.ts`
- `apps/server/src/modules/reports/reports.controller.ts`
- `apps/web/src/services/reports.ts`
- `apps/web/src/services/brand-growth.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/report-workspace.tsx`
- `docs/changes/2026-06-20-opportunity-insight-step-two-and-step-three.md`
