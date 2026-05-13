# 2026-05-13 品牌增长报告链路 Provider 选择修复

## 背景

品牌增长页中的三个报告入口出现运行时错配：

- `生成品牌增长报告` 点击后返回 `模型接口请求失败: 403`
- `品牌增长可视化报告` 与 `全年营销规划` 虽未逐一报出同样错误，但与品牌增长报告共用同一批报告生成链路，也存在相同的 provider / model 选择风险

排查后确认，问题不只是一组 API Key 是否可用，更关键的是报告链路的 provider 选择逻辑与技能默认配置不一致：

- 品牌增长报告技能虽然默认绑定 `国内文生文 · DeepSeek`，但生成时仍硬走 `text-global`
- 全年营销规划技能默认绑定 `国内文生文 · DeepSeek`，但默认模型仍是 `gpt-5.5`，与国内 provider 白名单不匹配
- 可视化报告技能默认 provider 仍是 `图像生成`，与当前文本型 HTML 大纲生成链路不兼容

## 本次处理

- 调整 `ReportsService` 中品牌增长报告、可视化报告、全年营销规划三条链路的 provider 选择逻辑
- `resolvePreferredProvider()` 仅在技能配置的 provider 与当前链路允许的 `runtimeKey` 兼容时才采用；若技能里填了不兼容 provider，则自动回退到正确的文本 runtime
- 新增品牌增长报告的 provider fallback 组合，支持按兼容的国内文本 provider / 全球文本 provider 依次尝试，而不再强制只走 `text-global`
- 生成设置阶段会先根据目标 provider 的模型白名单重排模型列表；若技能或提示词中写了不兼容模型，会自动收敛到 provider 可用模型
- 同步修正 `mock-data` 中三个报告技能的默认配置：
  - `brand-omni-growth-analysis` 默认模型改为 `deepseek-v4-pro`
  - `enterprise-annual-plan` 默认模型改为 `deepseek-v4-pro`
  - `article-visual-report-designer` provider 改为 `国内文生文 · DeepSeek`，默认模型改为 `deepseek-v4-flash`

## 影响范围

- `apps/server/src/modules/reports/reports.service.ts`
- `apps/server/src/common/mock-data.ts`

## 验证

- `GetDiagnostics` 检查本次改动文件，无新增错误
- `npm run build:server` 通过
- 重启本地稳定后端：`npm run dev:server:stop` / `npm run dev:server:stable`

## 当前说明

- 这次修复已经把报告链路中的 provider / model 选择错配收口到代码层
- 单独用脚本直调 `ReportsService` 做本地全链路验证时，当前环境暴露出独立的 `OSS_*` 配置缺失问题，导致无法在脚本里走完整个“生成后落盘 OSS”流程
- 该环境问题不改变本次代码层根因判断：原先的 `403` 来自报告链路对 provider / model 的错选与错绑
