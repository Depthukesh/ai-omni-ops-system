# 2026-05-13 半年营销规划替换全年营销规划

## 背景

- 原“全年营销规划”要求模型一次性输出完整 12 个月规划，输入约束与输出条目过多，生成稳定性和可维护性都偏弱。
- 产品要求已调整为“半年营销规划”，需要把前后端、提示词、解析规则、任务类型、页面文案和上下游依赖一起切到半年口径，而不是只改按钮文案。

## 本次改动

- 将品牌增长链路中的“全年营销规划”统一改为“半年营销规划”：
  - 任务标题、主提示词、HTML 标题、解析失败文案、前端工作区说明都切到半年语义。
  - 规划窗口改为从当前生成时间起向后 6 个月，限制模型只输出该时间窗内的月份。
  - JSON 解析阈值从“至少 24 条”收敛为“至少 12 条”，降低模型输出负担。
- 后端继续保留历史兼容：
  - 任务读取兼容旧 `BRAND_ANNUAL_MARKETING_PLAN`。
  - 报告资产读取兼容旧 `BRAND_ANNUAL_MARKETING_PLAN` 元数据。
  - 控制器新增 `/half-year-marketing-plan` 主路径，同时保留旧 `annual-marketing-plan` 路径兼容旧调用。
- 同步调整后台技能中心、mock/seed 和 demo 品牌描述中的半年口径，避免后台配置和演示数据仍显示“年度营销规划”。
- 同步更新品牌增长页、小红书页、站点地图、数据库存档和生成内容存储规范中的当前态说明。

## 影响范围

- `apps/server/src/modules/reports/reports.service.ts`
- `apps/server/src/modules/reports/reports.controller.ts`
- `apps/server/src/common/mock-data.ts`
- `apps/web/src/services/reports.ts`
- `apps/web/src/services/brand-growth.ts`
- `scripts/seed-demo.cjs`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/database-archive.md`
- `docs/generated-content-storage-standards.md`
- `docs/README.md`

## 验证

- `GetDiagnostics`
- `npm run build:server`
- `npm run build:web`

## 后续关注

- 代码内部仍保留部分 `AnnualMarketingPlan*` 类型和方法名，当前作为兼容层保留；若后续继续演进，可再做一次纯技术命名清理。
- 若线上已经存在旧全年规划任务与资产，当前实现会继续兼容读取，但新生成结果应统一走半年任务类型和半年主路径。
