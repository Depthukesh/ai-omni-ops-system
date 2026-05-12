# 2026-05-12 Feishu Media Proxy Brand Context Hardening

## 背景
- 线上已经部署了飞书字段映射和品牌上下文修复后，飞书同步结果中的图片、视频仍然经常显示为空白或破图。
- 继续排查发现，除了字段别名仍需逐步补齐外，媒体代理链路本身还存在一个确定性问题：部分页面在生成飞书媒体代理 URL 时，没有显式携带当前真实品牌。

## 根因
- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx` 在构建素材库预览媒体地址时，没有把当前工作区真实 `brandId` 透传给 `buildCollectorMediaProxyUrl()`
- `work-media-helpers.ts` 在未收到显式 `brandId` 时会回退本地 `currentBrandId`，再兜底 `DEMO_BRAND_ID`
- 这样即使页面主体数据已切到真实品牌，图片/视频代理请求仍可能继续命中 demo brand 的 `feishu-media` 接口，最终表现为媒体加载失败
- 同时，`collectors.service.ts` 的昵称字段别名里包含了 `作品采集` 这类非昵称表头，可能把表分组名或列名误识别成作者昵称

## 本次调整
- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
  - 新增 `brandId` 属性
  - 素材库图片/视频预览地址统一显式透传当前工作区真实品牌
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - 给 `AssetsWorkspace` 显式传入 `workspace.archive.brand.id`
- `apps/server/src/modules/collectors/collectors.service.ts`
  - 收紧品牌作品/对标作品的昵称字段别名，移除 `作品采集` 这类会造成误识别的候选项
  - 微调 `sourceAccountId` 的候选别名，避免和昵称类字段继续混淆

## 预期效果
- 小红书素材库中的飞书图片、视频代理请求会稳定命中当前真实品牌，不再因为回退 `DEMO_BRAND_ID` 导致附件空白或破图
- 作者昵称字段误识别概率下降，减少把表头或分组名展示为作者信息的情况

## 验证
- `npm run build:web`
- `npm run build:server`
