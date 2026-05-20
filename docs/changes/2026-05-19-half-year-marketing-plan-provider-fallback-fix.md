# 2026-05-19 半年营销规划 Provider 回退修复

## 背景

- 品牌增长页“半年营销规划”板块点击“生成规划”后，前端直接提示：
  - `生成失败：第三方文生文接口配置读取失败`
- 但这条链路理论上并不应该强依赖 `text-global`，因为当前半年营销规划本来就允许优先走国内文本模型，如 DeepSeek 和豆包。

## 根因

- `ReportsService.loadAnnualMarketingProviderConfigs()` 一进入就调用了 `loadThirdPartyChatConfig()`。
- 该方法会在以下任一条件不满足时直接抛错：
  - 未找到 `text-global` 运行时 Provider
  - 无可用 Base URL
  - 无可用 API Key
  - 无可用模型
- 结果是：即使国内文本 Provider 已配置完备，半年营销规划也会在“第三方文生文配置缺失”这一层被提前短路，根本走不到后续的 DeepSeek / 豆包回退。

## 本次修复

- 将半年营销规划的 Provider 装配改为与品牌增长报告链路一致的“第三方可选、国内可回退”模式：
  - `text-global` 不再作为硬前置条件
  - 仅当第三方 Provider、Base URL、模型、API Key 都可用时，才把它加入尝试队列
  - 如果第三方未配置，但国内 DeepSeek / 豆包可用，链路会继续正常生成
- 保留品牌级私钥严格模式：
  - 如果命中了品牌平台基线，但品牌 Owner 没配对应私钥，仍然继续返回明确中文提示，不会静默回退公共 Key

## 影响范围

- `apps/server/src/modules/reports/reports.service.ts`

## 验证

- `GetDiagnostics`
- `npm run build:server`

## 结果说明

- 这次修复收口的是“Provider 装配过早失败”的问题。
- 如果后续仍报错，则更可能是具体 Provider 的品牌级 API Key 未配置、模型白名单不兼容，或实际接口返回失败，而不再是这里的装配短路。
