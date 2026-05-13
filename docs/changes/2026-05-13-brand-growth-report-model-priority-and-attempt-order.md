# 2026-05-13 品牌增长报告模型优先级与尝试顺序修正

## 背景

- 后台技能中心将“生成品牌增长报告”的默认模型设为 `deepseek-v4-pro` 后，前端报错文案里仍可能出现 `THIRD_PARTY/claude-opus-4-6`，容易被误解为“系统首先调用了 Claude”。
- 实际原因有两层：
  - 品牌增长报告运行时在组装模型配置时，历史上优先读取 `PromptTemplate.modelName`，用户在技能中心看到的 `SkillConfig.defaultModel` 并不总是第一优先。
  - 报错文案展示的是“最后一次失败”的 provider/model，而不是完整的实际尝试顺序。

## 本次改动

- 后端 `ReportsService`
  - `loadGrowthReportGenerationSettings()` 改为品牌增长报告优先以后台技能中心选中的 `SkillConfig.defaultModel` 作为首选模型，再合并 `PromptTemplate.modelName` 作为后续兼容候选。
  - `loadGrowthReportProviderConfigs()` 会按首选模型重排 provider 与模型顺序，确保系统先严格尝试后台选中的模型，再继续 fallback 到其他兼容 provider/model。
  - `generateReportByModel()` 的失败提示改为同时包含：
    - 首选模型
    - 最后失败原因
    - 实际尝试顺序（按真实执行顺序列出 provider/model/baseUrl）
- 品牌增长报告任务创建时，任务记录中的 `modelName` 也会优先记录本次真实首跑的模型，而不是仅依赖旧的固定 provider 顺序。

## 结果

- 当后台技能中心为“品牌增长报告”选择 `deepseek-v4-pro` 时，系统会先严格尝试 `deepseek-v4-pro`。
- 若该模型或对应 provider 失败，系统仍会继续 fallback 到 GLM / Kimi / 豆包 / 第三方文本 provider。
- 如果最终全部失败，错误提示会明确告诉用户系统实际按什么顺序尝试过，不再把“最后一次失败”误看成“第一次调用”。

## 验证

- `GetDiagnostics` 检查 `apps/server/src/modules/reports/reports.service.ts` 无新增诊断错误
- 后续建议结合本地/线上再复测一次品牌增长报告生成失败提示，确认前端展示文案与真实顺序一致
