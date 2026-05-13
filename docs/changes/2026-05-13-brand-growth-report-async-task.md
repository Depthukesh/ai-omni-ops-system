# 2026-05-13 品牌增长报告改为异步任务

## 背景

- 线上 `POST /api/reports/brands/:brandId/growth-report/generate` 仍按同步方式等待完整大模型报告生成。
- `17ai.site` 通过同域 `/api` 调用该接口时，会被网关等待窗口截断，出现 `504 Gateway Time-out`。
- 已有“品牌增长可视化报告”“全年营销规划”“小红书营销策划/日历”都采用 `任务入队 -> 后台执行 -> 前端轮询 latestTask` 模式，品牌增长报告需要对齐。

## 本次改动

- 后端 `ReportsService`
  - `generateGrowthReport()` 改为只负责创建 `BRAND_GROWTH_REPORT` 任务并立即返回工作区。
  - 新增品牌增长报告任务状态收口：
    - `getGrowthReportWorkspace()` 返回 `latestTask`
    - `normalizeLatestGrowthReportTask()` 处理超时任务自动失败
    - `persistGrowthReportResult()` 统一写入 `BusinessAsset + MediaAsset + HTML 文件`
    - `updateGrowthReportTaskStatus()` 统一维护 `QUEUED / RUNNING / SUCCESS / FAILED`
- 前端品牌增长页
  - `GrowthReportWorkspace` 增加 `latestTask`
  - `workspace.tsx` 增加品牌增长报告任务轮询逻辑
  - `report-workspace.tsx` 增加品牌增长报告的排队中、生成中、失败提示态
  - 点击“生成报告”后，前端改为提示“已提交后台任务”，不再假设同步生成完成

## 验证

- `npm run build:server`
- `npm run build:web`
- 本地接口验证：
  - `POST http://127.0.0.1:3011/api/reports/brands/br_demo_001/growth-report/generate` 现可立即返回 `201`
  - `POST http://127.0.0.1:3001/api/reports/brands/br_demo_001/growth-report/generate` 现可立即返回 `201`
  - `GET http://127.0.0.1:3001/api/reports/brands/br_demo_001/growth-report` 可读到 `latestTask`

## 影响与后续

- 线上品牌增长报告生成不再依赖单次 HTTP 长连接等待完整报告产出，主故障面从“网关 504”收敛为“后台任务执行结果”。
- 当前品牌增长报告任务没有像小红书营销策划方案那样写分阶段 heartbeat，长耗时期间 `updatedAt` 不会持续推进；若后续需要更细的前端阶段反馈，可继续补阶段状态。
