# 2026-08-15 品牌增长收集数据补齐评论用户账号链接链路

## 背景

本轮要补齐品牌增长策略里“小红书 / 抖音作品 -> 评论 -> 匹配评论用户 -> 账号链接”的完整链路，并确保这条链路既能在 `收集数据` 工作区里人工验证，也能被 OpenClaw 直接调用。

此前系统已具备：

- 作品来源采集
- 评论采集
- OpenClaw 调用评论采集

但仍缺少：

- 评论记录里的标准化评论用户主页链接
- 从评论结果反提目标用户账号链接的正式能力
- 抖音侧对等的目标用户工作区结果
- OpenClaw 对应的评论用户提取工具
- `收集数据` 页面对这一步的最小验证入口

## 本次改动

### 1. Collectors 真源补齐评论用户账号链接

- 小红书评论记录补 `commentUserProfileUrl`
- 抖音评论记录补 `commentUserProfileUrl`
- 小红书 `targetUsers` 改为从已采集评论中真实提取，不再停留在失败占位态
- 抖音新增 `DOUYIN_TARGET_USER` 真源和工作区返回结构
- 两个平台都支持：
  - `sourceUrls`
  - `matchKeywords`
  - `syncCommentsFirst`

### 2. OpenClaw 工具补齐评论用户提取

- 增强 `sync_xiaohongshu_target_users`
- 新增 `sync_douyin_target_users`
- OpenClaw 可直接从作品链接出发，自动补拉评论并提取匹配评论用户的账号链接

### 3. 品牌增长收集数据页补最小验证入口

- 小红书评论数据卡新增“从评论提取账号链接”
- 抖音评论数据卡新增“从评论提取账号链接”
- 支持输入匹配关键词，不填时提取全部评论用户
- 评论表新增评论用户主页链接列
- 评论用户结果表单独展示：
  - 来源作品/笔记
  - 用户昵称
  - 用户 ID / sec_user_id
  - 账号链接
  - 匹配关键词
  - 来源评论

## 影响范围

- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/server/src/modules/collectors/collectors.controller.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/web/src/services/collectors.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`

## 验证

- `npm run build:server`
- `npm run build:web`

结果：

- 服务端 TypeScript 构建通过
- Web 生产构建通过

## 兼容性与保护

- 没有改 API 既有主流程入口，仍然继续收口在 `collectors + OpenClaw + brand-growth`
- 目标用户提取优先复用已采集评论资产，避免另开一套孤立链路
- 提取动作支持按关键词筛选，也支持无关键词提取全部评论用户
- 评论用户 identity 做了去重匹配，避免同一作品评论用户重复入库
