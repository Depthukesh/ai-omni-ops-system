# 2026-09-10 投流获客达人合作工作区

## 背景

`投流获客` 原先只承接 `腾讯投流获客` 单块内容型列表，缺少一套按达人合作链路持续沉淀候选达人、合作档案和作品跟踪数据的真源工作区。当前需要把品牌增长里已经沉淀的抖音达人结果池继续往下游衔接，让 OpenClaw 可以直接筛达人、入合作清单、跟踪合作作品，并按设定周期自动更新作品数据。

## 本次收口

### 1. 页面结构

- `投流获客 /paid-acquisition`
  - 保留 `腾讯投流获客`
  - 新增 `达人合作`
    - `达人匹配`
    - `达人跟踪`

### 2. 真源与接口

- 新增达人合作三张真源表：
  - `OpenClawCreatorCooperationMatch`
  - `OpenClawCreatorCooperationTracking`
  - `OpenClawCreatorCooperationWork`
- 达人匹配从抖音达人结果池读取达人快照，不重复发明另一套达人主数据
- 达人跟踪按达人维度建档，并按作品数量回填 `合作作品数量`
- 合作作品记录支持：
  - 抖音作品链接
  - 首轮数据抓取
  - `X` 天自动更新频率
  - 结果评估
  - 再次选择（`复投 / 调整 / 暂停`）

### 3. 自动更新

- 新增每日调度任务，扫描 `nextRefreshAt` 已到期的合作作品
- 到期作品重新抓取抖音作品快照，并更新：
  - 标题
  - 链接
  - 播放 / 点赞 / 收藏 / 评论 / 转发
  - 最近同步时间
  - 下次刷新时间
- 如果刷新失败，会保留错误信息，并把下次重试时间顺延一天，避免在同一天无限重复撞错

### 4. OpenClaw / MCP / Skill

- 新增达人合作工具族：
  - `get_openclaw_creator_match_workspace`
  - `create_openclaw_creator_matches`
  - `delete_openclaw_creator_matches`
  - `move_openclaw_creator_matches_to_tracking`
  - `get_openclaw_creator_tracking_workspace`
  - `create_openclaw_creator_tracking_records`
  - `delete_openclaw_creator_tracking_record`
  - `get_openclaw_creator_tracking_works`
  - `create_openclaw_creator_tracking_work`
  - `update_openclaw_creator_tracking_work`
  - `delete_openclaw_creator_tracking_work`
- 同步更新：
  - `scripts/openclaw-ai-omni-mcp-server.mjs`
  - `docs/openclaw/skill-package/*`
  - `apps/server/src/modules/openclaw/openclaw-installation.service.ts`

## 影响面与保护

- 不改抖音达人结果池原有采集协议，只复用其结果快照做下游合作链路
- 不改数据库已有业务表语义；达人合作使用独立真源表，避免把合作状态混写进采集结果池
- 自动刷新只读取合作作品记录，不会改动原有品牌增长抖音采集列表
- 所有达人合作真源统一收口到 `paid_acquisition` workspace scope，避免混入 `brand_growth` 或 `all_network_growth`

## 验证

- `pnpm --filter server build`
- `pnpm --filter web build`

## 相关文件

- `apps/server/src/modules/openclaw/openclaw-creator-cooperation.service.ts`
- `apps/server/src/modules/openclaw/openclaw-creator-cooperation.controller.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw.module.ts`
- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/web/src/app/(dashboard)/paid-acquisition/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/paid-acquisition/openclaw-creator-cooperation-workspace.tsx`
- `apps/web/src/services/openclaw.ts`
- `prisma/schema.prisma`
- `prisma/schema.local.prisma`
