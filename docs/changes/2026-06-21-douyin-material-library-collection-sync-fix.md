## 2026-06-21 抖音素材库采集同步修复

### 背景

- 用户反馈在“收集数据 -> 抖音 -> 竞品作品信息及数据”勾选加入素材库后，没有同步到“某音/某号 -> 素材库”。
- 同时要求排查“收集数据 -> 抖音”其他板块是否存在同类同步问题。

### 问题定位

- 勾选加入素材库的前后端主链路本身是通的，`DOUYIN_COMPETITOR_WORK` 已支持写入 `metadataJson.inMaterialLibrary`。
- 真正的断点在“抖音工作台 -> 素材库”聚合逻辑：
  - 只聚合了 `benchmarkWorks`
  - 只聚合了 `lowFanExplosiveWorks`
  - 只聚合了 `highCompletionRateWorks`
  - 只聚合了 `highLikeRateWorks`
- 因此以下两类虽然支持加入素材库，但不会出现在抖音素材库中：
  - `competitorWorks`
  - `searchWorks`
- 下游 `AI生视频（故事板）`、`AI生视频`、`复刻短视频` 的素材解析也沿用了同样的旧聚合范围，会导致即便前端素材库显示出来，生成时仍可能报“未找到你选择的抖音素材”。

### 本次修改

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 抖音素材库聚合补入：
    - `competitorWorks`
    - `searchWorks`
  - 对聚合结果按 `id` 去重，避免同一素材重复展示。
  - 素材库描述和工作台说明改成“抖音采集作品”，不再误写成只支持“对标作品”。
- `apps/web/src/app/(dashboard)/douyin/assets-workspace.tsx`
  - 卡片角标由“对标”改成“素材库”。
  - 空状态提示改成覆盖：
    - 竞品作品
    - 对标作品
    - 搜索关键词结果
    - 榜单作品
- `apps/server/src/modules/works/works.service.ts`
  - 新增统一的抖音素材库作品聚合/查找 helper。
  - 以下工作流改为统一从完整素材库范围中取材：
    - `resolveDouyinVideoComposerContext`
    - `resolveDouyinDirectVideoComposerContext`
    - `resolveDouyinRemixShortVideoComposerContext`

### 排查结论

- 有同类问题的板块：
  - 竞品作品信息及数据
  - 搜索关键词
- 没有同类问题的“可加入素材库”板块：
  - 对标作品信息及数据
  - 获取低粉爆款榜
  - 获取高完播率榜
  - 获取高点赞率榜
- 其余抖音收集板块当前只是收集留存，不属于“加入素材库后展示到某音/某号素材库”的链路，因此不算这类同步缺陷。
