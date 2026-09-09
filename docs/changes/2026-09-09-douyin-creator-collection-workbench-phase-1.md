# 2026-09-09 抖音达人抓取工作台第一期

## 背景

用户要求在 `品牌增长策略 -> 收集数据 -> 抖音` 下补齐一套只负责“抓取”的达人工作台，先不做分析页，也不做推荐打分。

第一期范围固定为：

1. 达人搜索抓取
2. 达人深度抓取
3. 达人结果池

## 本次落地

### 1. 后端补齐达人采集真接口

- 新增 `POST /collectors/douyin/brands/:brandId/creator-search`
- 新增 `POST /collectors/douyin/brands/:brandId/creator-deep-fetch-tasks`
- 搜索结果写入 `BusinessAsset.metadataJson.kind = DOUYIN_CREATOR_SEARCH_RESULT`
- 深抓结果写入 `BusinessAsset.metadataJson.kind = DOUYIN_CREATOR_PROFILE`
- 深抓执行态落到 `Task`，并通过 workspace 统一回传

### 2. 深抓改为轻任务化

- 前端创建任务后立即返回，不阻塞页面
- `CollectorsService` 后台异步执行达人深抓
- 成功后回写：
  - `Task.outputJson`
  - `DOUYIN_CREATOR_PROFILE`
- 失败后回写 `FAILED + errorMessage`
- 前端沿用现有抖音 workspace 轮询机制自动刷新

### 3. 品牌增长抖音采集页新增 3 个达人卡片

- `达人搜索抓取`
  - 支持按关键词、一级行业、营销目标、任务分类、达人标签、粉丝区间、预估播放区间、互动率区间、报价区间提交抓取
- `达人深度抓取`
  - 支持按 `O_AUTHOR_ID / UID / SEC_USER_ID / UNIQUE_ID / AUTO` 创建深抓任务
- `达人结果池`
  - 直接查看深抓后沉淀下来的达人画像快照

### 4. 工作区返回结构扩展

- `DouyinCollectionWorkspace` 新增：
  - `creatorSearchResults`
  - `creatorProfiles`
  - `creatorDeepFetchTasks`

### 5. OpenClaw / MCP / Skill 同步暴露

- `get_douyin_collection_workspace`
  - 现在会一起返回达人搜索结果、达人结果池和达人深抓任务摘要
- `search_douyin_creators`
  - 允许 OpenClaw / MCP 直接发起达人搜索抓取
- `create_douyin_creator_deep_fetch_tasks`
  - 允许 OpenClaw / MCP 直接批量创建达人深抓任务

## 影响范围

- 影响页面：
  - `品牌增长策略 -> 收集数据 -> 抖音`
- 影响接口：
  - `collectors/douyin` workspace 读取
  - `creator-search`
  - `creator-deep-fetch-tasks`
  - `openclaw` MCP tool 暴露层
- 影响模块：
  - `apps/server/src/modules/collectors/*`
  - `apps/web/src/app/(dashboard)/brand-growth/*`
  - `apps/web/src/services/collectors.ts`

## 兼容与边界

- 只新增达人抓取相关结果集，不改数据库 schema
- 不改现有抖音品牌账号、竞品账号、作品、评论、热点等既有抓取链路
- 不新增达人分析页，不做推荐评分，不改 OpenClaw 后续分析职责
- 旧的抖音同步入口继续保留；达人 3 个新卡片走专属 handler，不混入旧 `sync` scope

## 验证

- `pnpm --filter server build`
  - 通过
- `pnpm --filter web build`
  - 通过

## 后续建议

1. 在真实 TikHub 凭证下补一轮端到端联调，重点确认：
   - `search_creator` 字段映射
   - 各类达人标识解析成功率
   - 深抓任务失败时的错误信息可读性
2. 第二期再考虑：
   - 批量勾选搜索结果直接创建深抓任务
   - 结果池筛选/导出
   - OpenClaw 自动消费达人结果池
