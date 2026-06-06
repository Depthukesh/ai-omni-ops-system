# 2026-06-06 技能中心 Provider / 模型选择规则统一

## 背景

- 站内多个板块都已经接入后台技能中心与个人中心技能配置，但不同链路对“供应商优先级 / 模型优先级 / fallback 时机”的实现并不一致。
- 公众号文章生成已经按“先供应商、再模型、最后 fallback”的逻辑收口，但 `works.service.ts` 和 `reports.service.ts` 里的其他技能仍存在“只排序、不严格收敛候选 Provider”的分支。
- 项目后续目标是让所有板块都模块化、标准化，因此这套规则需要沉淀为公共能力，而不是继续以单模块补丁的方式扩散。

## 本次调整

### 1. 建立服务端公共选择规则 helper

- 新增公共 helper：
  - `apps/server/src/common/skill-provider-selection.ts`
- 统一定义技能中心 Provider / 模型偏好的选择规则：
  - 若技能中心配置里带了明确的供应商选择，则先只使用该供应商构建候选列表
  - 若没有明确供应商，但有明确模型名，则先只使用包含该模型的 Provider 构建候选列表
  - 只有在上述严格匹配都不存在时，才回退到当前 runtimeKey 下的通用 Provider 候选链路

### 2. `WorksModule` 统一接入公共规则

- `apps/server/src/modules/works/works.service.ts`
- 本次已把公共规则统一接入以下链路的底层 Provider loader：
  - 原创文案
  - 原创配图提示词
  - 二创文案
  - 二创配图提示词
  - 视频文案
  - 视频提示词
  - 公众号文章生成
- 生图 Provider 选择也已同步收口：
  - 当技能中心配置里已明确指定供应商或模型时，优先只在匹配到的 image-generation Provider 中执行
  - 若严格匹配不到，再回退到通用生图 Provider 列表

### 3. `ReportsModule` 统一接入公共规则

- `apps/server/src/modules/reports/reports.service.ts`
- 本次已把公共规则统一接入以下报告 / 规划类链路：
  - 品牌增长报告
  - 可视化报告
  - 半年营销规划
  - 小红书营销策划方案
  - 抖音营销策划方案
  - 抖音热点候选选题
  - 抖音原创文案
  - 抖音二创文案
  - 小红书营销日历
- `ReportsModule` 的 Provider config 构造阶段现在会保留真实 `providerId / providerName`，再由公共规则统一做候选收口与排序，不再只按本地固定顺序拼装。
- `resolveRuntimeProviderByBaseUrl()` 已补充“按首选模型优先匹配 Provider”的逻辑，避免同一 runtime 下多个 Provider 并存时仍然先命中错误平台。

## 影响范围

- 公共能力：
  - `apps/server/src/common/skill-provider-selection.ts`
- 后端：
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/reports/reports.service.ts`
- 文档：
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - 本文档

## 规范同步

- 已把公共规则同步写入 `docs/engineering-standards.md`
- 后续新增任何文本、生图、报告技能时，都必须复用这套公共规则，不允许再在单个板块里手写“固定先 DeepSeek / 固定先某个 global provider”的私有顺序

## 验证

- 待执行：
  - `npm --workspace apps/server run lint`
  - `npx tsc --noEmit -p apps/web/tsconfig.json`
  - `GetDiagnostics`

## 后续关注

- 当前公共规则已统一落到 `works` 与 `reports` 两条主链路；后续若继续拆分出独立 `gateway / repository / runtime resolver`，应把该 helper 上移为更稳定的共享运行时模块。
- 若未来需要支持“某些技能显式禁止 fallback”的特殊模式，应作为公共规则上的显式开关扩展，而不是在业务链路里私自重写。
