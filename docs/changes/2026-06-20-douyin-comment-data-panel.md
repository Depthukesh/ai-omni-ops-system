# 抖音评论数据独立板块

## 1. 变更背景

- 抖音采集工作区已经支持账号、作品、搜索关键词和关键词推荐，但还缺少针对单个作品评论数据的独立采集入口。
- 运营同学需要直接输入抖音作品链接，快速获取评论核心参数，用于评论洞察、用户筛选和后续分析。
- 当前业务明确要求评论结果里必须保留 `sec_user_id`，包括源作品作者和评论用户两类关键标识。

## 2. 变更目标

- 在抖音采集页中新增独立的“评论数据”板块，位置放在“搜索关键词”之后。
- 支持输入抖音作品链接并提交，调用 TikHub 单个视频评论接口获取结果。
- 将评论结果接入 collectors 工作区持久化，刷新页面后仍可查看。
- 强制保证输出结果中的 `sec_user_id` 完整，不满足要求的数据不入库、不展示。

## 3. 修改内容

### 3.1 前端

- 在 `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx` 新增 `commentData` 卡片入口。
- 新增“评论数据”输入区，交互形式复用对标作品信息及数据板块，支持每行输入一个抖音作品链接并提交。
- 新增评论数据结果表格，展示核心字段：
  - `sourceWorkId`
  - `sourceWorkUrl`
  - `sourceSecUserId`
  - `commentId`
  - `commentText`
  - `commentTime`
  - `commentUserName`
  - `commentUserSecUserId`
  - `likeCount`
  - `replyCount`
  - `collectedAt`
- 在 `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx` 新增评论链接表单字段、排序结果和提交分支，并把同步结果计入抖音同步摘要。

### 3.2 后端

- 在 `apps/server/src/modules/collectors/collectors.controller.ts` 扩展 `commentData` scope 和 `commentSourceUrls` 请求字段。
- 在 `apps/server/src/modules/collectors/collectors.service.ts` 新增评论数据类型、工作区聚合、结果映射和同步流程。
- 接入 TikHub 接口 `GET /api/v1/douyin/app/v3/fetch_video_comments`，按文档固定使用 `aweme_id + cursor=0 + count=20`。
- 当输入链接本身不带 `sec_user_id` 时，服务端会继续通过作品详情接口补齐源作品作者 `sec_user_id`。
- 新增评论提取函数，兼容 `comments / comment_list` 等常见返回结构。

### 3.3 数据与配置

- 在 `apps/web/src/services/collectors.ts` 新增 `DouyinCommentRecord`、`DouyinCollectionWorkspace.commentData` 和同步统计字段。
- 评论结果以 `DOUYIN_COMMENT` 写入 collectors 资产，匹配键使用 `${sourceWorkId}:${commentId}`。
- 每条评论结果都会保留：
  - 源作品 ID
  - 源作品链接
  - 源作品作者 `sec_user_id`
  - 评论用户 `sec_user_id`

## 4. 修改意图

- 采用“独立板块 + 工作区持久化”的方式，是为了让评论采集和作品采集、关键词采集保持同一套使用习惯和刷新机制。
- 强制保证输出参数包含 `sec_user_id`，是因为评论洞察后续往往要按用户维度继续分析，没有 `sec_user_id` 的记录价值不足。
- 沿用对标作品信息及数据的输入区和结果区结构，可以降低新增板块的学习成本，也能保持页面视觉一致性。

## 5. 影响范围

- 影响页面：`/brand-growth` 下的抖音采集工作区。
- 影响接口：抖音 collectors 的 `commentData` 同步链路。
- 影响模块：品牌增长策略、抖音采集面板、collectors 工作区聚合。
- 是否影响已有数据：否，仅新增评论数据结果集，不破坏原有账号、作品和关键词数据。

## 6. 验证方式

- 手工验证：
  - 进入抖音采集页，确认“评论数据”卡片可见且位于“搜索关键词”之后。
  - 输入普通抖音作品链接或 aweme_id，点击提交后能出现评论结果列表。
  - 当原链接不带 `sec_user_id` 时，服务端仍可通过作品详情补齐源作品作者 `sec_user_id`。
- 接口验证：
  - 通过 `syncDouyinCollectionWorkspace({ scope: "commentData" })` 联动 TikHub 评论接口。
- 日志验证：
  - 继续沿用 collectors 现有错误汇总和 warning 口径，不新增额外日志面板。
- 编译/诊断验证：
  - 执行前端文件诊断。
  - 执行 `npm run build:web`。
  - 执行 `npm --workspace apps/server run build`。

## 7. 风险与后续

- 当前评论数据首版固定抓取前 20 条评论，后续如果需要翻页，可继续补 `cursor` 批次能力。
- 当前输入仍要求能解析到 `aweme_id`；如果分享链路格式变化，需要继续补充链接解析兼容。
- 当前结果只展示核心参数，若后续要做评论情绪、关键词归类或二级回复分析，可以在现有结果模型上继续扩展。

## 8. 相关文件

- `apps/server/src/modules/collectors/collectors.controller.ts`
- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/services/collectors.ts`
- `docs/changes/2026-06-20-douyin-comment-data-panel.md`
