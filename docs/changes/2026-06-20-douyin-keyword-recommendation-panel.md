# 抖音关键词推荐面板

## 1. 变更背景

- 抖音采集页已经支持“搜索关键词”取数，但同一工作流里缺少“关键词推荐”的独立管理能力。
- 运营同学需要先维护一组待观察关键词，再逐条提交 TikHub 搜索推荐接口，沉淀推荐词结果。
- 现有页面没有提供弹窗新增、关键词池管理、推荐结果删除与并排展示能力。

## 2. 变更目标

- 在抖音“搜索关键词”区域右侧新增独立的“关键词推荐”板块。
- 支持添加关键词、三列管理、单条提交、单条删除，以及推荐结果的两列展示和删除。
- 将推荐结果接入 collectors 工作区，沿用现有抖音采集数据的持久化与刷新机制。

## 3. 修改内容

### 3.1 前端

- 在 `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx` 补齐 `BrandGrowthCollectionWorkspaceProps`，接入关键词推荐相关状态与事件。
- 新增“关键词推荐”弹窗、关键词池卡片区、推荐结果卡片区，并在“搜索关键词”页面内以更紧凑的双层双栏方式展示，避免中间留白过大。
- 新增独立 `keywordRecommendations` 卡片视图，便于后续单独查看和维护推荐结果。
- 在 `apps/web/src/styles/globals.css` 新增三列关键词池、两列推荐结果卡片、历史记录弹窗和响应式布局样式，复用现有品牌账号信息的卡片视觉语言。

### 3.2 后端

- 复用此前已扩展的 collectors 能力：`keywordRecommendations` scope、TikHub 搜索推荐接口采集、推荐结果删除接口。
- 将关键词推荐结果从“按关键词覆盖更新”调整为“按提交批次追加写入”，保留历史记录并确保最新结果显示在最前面。

### 3.3 数据与配置

- 继续使用 `DouyinCollectionWorkspace.keywordRecommendations` 作为工作区持久化结果集。
- 继续使用 `douyinSyncForm.keywordRecommendationEntries` 作为前端待提交关键词池。
- 推荐结果字段统一展示 `searchKeyword`、`recommendedKeyword`、`searchTime`，并保留 `queryId` / `wordsSource` 作为辅助信息。
- 每个待提交关键词都支持“查看历史”，可按搜索关键词回看历史推荐结果。

## 4. 修改意图

- 采用“工作区持久化结果 + 前端关键词池”的组合方案，避免把推荐结果做成刷新即丢失的临时态。
- 关键词池沿用品牌账号信息的卡片与弹窗模式，降低新交互的学习成本，也方便复用现有样式体系。
- 在搜索关键词页内并排展示推荐能力，可以让运营在查看搜索结果时直接补充推荐词，不需要来回切换页面。

## 5. 影响范围

- 影响页面：`/brand-growth` 下的抖音采集工作区。
- 影响接口：抖音 collectors 的 `keywordRecommendations` 同步与删除链路。
- 影响模块：品牌增长策略、抖音采集面板、collectors 工作区数据展示。
- 是否影响已有数据：否，已有抖音工作区数据结构只增加新结果集展示，不会破坏旧数据。

## 6. 验证方式

- 手工验证：检查“搜索关键词”页是否出现右侧“关键词推荐”板块，是否支持弹窗新增、提交、删除、查看历史，以及两列结果展示。
- 接口验证：通过已有 `syncDouyinCollectionWorkspace(scope: "keywordRecommendations")` 与删除接口完成联动。
- 日志验证：保持现有 collectors 运行日志口径，不新增额外日志依赖。
- 编译/诊断验证：已执行前端文件诊断；后续继续执行 `npm run build:web` 与 `npm --workspace apps/server run build`。

## 7. 风险与后续

- 当前关键词池保存在前端表单状态中，页面刷新后不会保留待提交关键词，只会保留已提交的推荐结果和历史记录。
- 本地完整联调仍受现有服务端开发态环境影响，若服务端 watch 进程再次异常，需要单独排查运行时问题。
- 如果后续需要批量提交关键词，可以在当前单条提交模型上继续扩展批量任务入口。

## 8. 相关文件

- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/services/collectors.ts`
- `apps/server/src/modules/collectors/collectors.controller.ts`
- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/web/src/styles/globals.css`
