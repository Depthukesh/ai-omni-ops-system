# 2026-05-21 抖音 Tikhub 配置入口与表格采集流程

## 背景

- 用户反馈个人中心和后台接口供应商中均未出现 `Tikhub` 配置入口，导致抖音采集链路无法完成用户自助配置。
- 抖音页此前误做成统一的“使用前置”说明面板和卡片式结果展示，不符合“品牌账号信息 / 竞品账号信息 / 品牌作品信息及数据 / 对标作品信息及数据”四个分组内各自录入、提交、表格呈现的交互要求。
- 小红书与抖音页顶部误出现“生成规划”按钮，和收集数据页面职责不符。

## 本次调整

### 1. 补齐 Tikhub 平台入口

- 在第三方平台种子中新增 `Tikhub 平台`
- 平台基线：
  - `baseUrl`: `https://api.tikhub.io`
  - `tutorialUrl`: `https://docs.tikhub.io/186826222e0`
- 这样个人中心“第三方接口配置”和后台“接口供应商”都会在下次服务启动 / 接口初始化后出现 Tikhub 条目，用户可以录入品牌级 API Key，后台可以维护平台说明文档和基线链接。

### 2. 抖音页改为分组内录入与提交

- 移除抖音页公共“使用前置”面板
- 保留四个分组切换：
  - 品牌账号信息
  - 竞品账号信息
  - 品牌作品信息及数据
  - 对标作品信息及数据
- 每个分组内部都直接提供：
  - 输入框
  - 对应的 Tikhub 文档链接
  - `提交` 按钮
  - 下方结果表格

### 3. 抖音字段展示口径

- 品牌账号信息、竞品账号信息：
  - `nickname`
  - `unique_id`
  - `signature`
  - `avatar_300x300`
  - `follower_count`
  - `following_count`
  - `aweme_count`
  - `total_favorited`
- 品牌作品信息及数据：
  - `aweme_id`
  - `desc`
  - `create_time`
  - `media_type`
  - `duration`
  - `statistics`
  - `images`
  - `aweme_type`
  - `video_download_addr`
- 对标作品信息及数据：
  - 单作品详情来自 `获取单个作品数据 V3`
  - `play_count` 来自 `根据视频 ID 获取作品统计数据`

### 4. 去掉收集数据页面误放的生成按钮

- 对收集数据分组统一取消顶部“生成规划”主按钮
- 保留当前页面已有的刷新动作，不再混入报告/规划型操作

## 影响范围

- `apps/server/src/common/third-party-platform-catalog.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`

## 验证建议

- 打开个人中心“第三方接口配置”，确认出现 `Tikhub 平台`
- 打开后台“接口供应商”，确认出现 `Tikhub 平台`
- 进入抖音页，确认：
  - 顶部不再出现“生成规划”
  - 不再出现“使用前置”大面板
  - 四个分组中均是“输入框 + 提交 + 表格”
