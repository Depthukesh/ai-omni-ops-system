# 2026-05-24 抖音榜单采集与收集页容器收口

## 1. 变更背景

- “品牌增长策略 -> 收集数据”子页顶部还保留了一层重复头部和关闭式叉号区，和板块内实际操作区重复。
- 抖音收集区原先只有品牌账号、竞品账号、品牌作品、对标作品 4 个子板块，无法直接按垂类分类拉取榜单作品。
- 新增榜单结果如果不复用现有素材库和视频缓存链路，会再次依赖第三方临时视频直链，无法稳定沉淀到抖音工作台。

## 2. 变更目标

- 去掉“收集数据”子页顶部重复头部，把标题、状态和操作按钮统一收口到板块内容容器内。
- 在抖音收集区保留“对标作品信息及数据”的手动输入，同时新增 3 个按垂类分类提交的榜单采集入口。
- 让榜单采集结果与对标作品使用同一套表格、素材库勾选和 OSS 视频缓存链路。

## 3. 修改内容

### 3.1 前端

- `brand-growth/workspace.tsx` 不再为“收集数据”页渲染顶部公共头部，页面级状态改为下沉给子页面容器自身展示。
- `brand-growth/collection-workspace.tsx` 新增抖音 3 个榜单卡片：`获取低粉爆款榜`、`获取高完播率榜`、`获取高点赞率榜`。
- 3 个榜单卡片统一使用一级分类、二级分类下拉和【提交】按钮；“对标作品信息及数据”继续保留手动输入 `aweme_id`。
- 榜单结果表格复用对标作品表格，首列统一支持加入素材库，并新增榜单名、一级分类、二级分类等展示字段。
- `douyin/workspace-shell.tsx` 的素材库聚合范围从原先仅 `benchmarkWorks` 扩展到 3 个榜单结果。

### 3.2 后端

- `collectors.controller.ts` 扩展抖音同步 scope，允许按榜单类型提交同步请求，并接受 `contentTagSelection`。
- `collectors.service.ts` 新增 TikHub `POST` 调用能力、抖音垂类标签解析与缓存能力，以及 3 个榜单采集流程。
- 榜单接口统一按 TikHub 要求组装 `tags` 结构，把返回结果映射成统一的抖音作品采集资产。
- 榜单作品复用现有 `upsertCollectorAsset(...)`、素材库状态字段和视频缓存队列，不新增独立存储表。

### 3.3 数据与配置

- 抖音工作区类型新增 `contentTags`、`lowFanExplosiveWorks`、`highCompletionRateWorks`、`highLikeRateWorks`。
- 抖音作品类型新增榜单来源、分类标签和榜单分数字段，供前端统一表格展示。
- 抖音素材库允许的作品类型从仅 `DOUYIN_BENCHMARK_WORK` 扩展到 3 个榜单作品类型。

## 4. 修改意图

- 页面结构方面，收口到“板块内自带标题和动作”的模式后，后续新增收集子板块无需再依赖外层重复头部。
- 交互方面，保留“对标作品”的手动输入，是因为该链路更适合精确指定作品；新增榜单则更适合按垂类分类批量拉取。
- 数据链路方面，继续复用既有采集资产、素材库和 OSS 视频缓存，可以避免为榜单功能额外分叉数据模型。

## 5. 影响范围

- 影响页面：`/brand-growth` 的“收集数据 -> 抖音”，以及 `/douyin` 的素材库。
- 影响接口：`/collectors/douyin/brands/:brandId/sync`、抖音工作区读取接口。
- 影响模块：`CollectorsModule`、品牌增长抖音收集页、抖音工作台壳层。
- 已有数据影响：无表结构迁移；历史对标作品数据保持兼容，新榜单结果以同类采集资产增量写入。

## 6. 验证方式

- 编译验证：`npm exec --workspace apps/web -- tsc --noEmit` 通过。
- 编译验证：`npm exec --workspace apps/server -- tsc --noEmit` 通过。
- 编辑器诊断：本轮直接改动的前后端文件 diagnostics 已清零。
- 手工验证待补：实际选择垂类标签后触发 3 个榜单接口，确认返回结果、素材库勾选和视频缓存地址展示正常。

## 7. 风险与后续

- 当前已完成类型与结构校验，但尚未做真实 TikHub 榜单接口联调。
- 榜单接口字段若后续调整，需同步更新 `collectors.service.ts` 的字段映射和前端表格列展示。
- 后续若继续扩展更多榜单，建议直接复用现有“分类下拉 + 提交 + 统一结果表格”模式。

## 8. 相关文件

- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- `apps/web/src/services/collectors.ts`
- `apps/server/src/modules/collectors/collectors.controller.ts`
- `apps/server/src/modules/collectors/collectors.service.ts`
