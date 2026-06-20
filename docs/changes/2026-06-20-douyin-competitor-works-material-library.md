# 2026-06-20 竞品作品支持加入抖音素材库

## 背景

- 目前“品牌增长策略 -> 收集数据 -> 抖音 -> 竞品作品信息及数据”已经能展示竞品作品列表，但列表里没有素材库勾选入口。
- 用户希望在竞品作品列表中直接勾选作品，并同步到“抖音 / 某号 - 素材库”。

## 变更

- 在 `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx` 的竞品作品专用表 `DouyinBrandWorksTable` 中新增可选的“素材库”列。
- 仅在“竞品作品信息及数据”分支下传入素材库切换能力，保证品牌作品页维持原有展示结构。
- 复用现有抖音素材库勾选交互：勾选时加入素材库，取消勾选时移出素材库。
- 在 `apps/server/src/modules/collectors/collectors.service.ts` 中把 `DOUYIN_COMPETITOR_WORK` 纳入抖音素材库支持范围。
- 同步修正素材库接口报错文案，明确当前支持竞品作品、对标作品、搜索作品和榜单作品。

## 数据口径

- 品牌作品 `DOUYIN_BRAND_WORK` 仍不支持直接加入抖音素材库。
- 竞品作品 `DOUYIN_COMPETITOR_WORK` 现在可通过列表首列勾选框加入或移出素材库。
- 素材库状态继续由采集资产元数据中的 `inMaterialLibrary` 和 `materialAddedAt` 驱动。

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - `apps/server/src/modules/collectors/collectors.service.ts`
- `npm --workspace apps/server run build`
- `npm run build:web`

## 影响文件

- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- `apps/server/src/modules/collectors/collectors.service.ts`
