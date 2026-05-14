# 2026-05-15 原创模板图库同域资源地址与预览失败占位

## 1. 背景

- 用户反馈原创模板图库在不同浏览器中存在“有的能看、有的裂图”的不稳定现象。
- 当前模板卡片直接使用列表接口返回的 `assetUrl` 作为 `<img src>`；一旦部署环境生成了不稳定的绝对地址，或某些模板资源尚未同步完成，就会直接显示浏览器裂图图标。

## 2. 本次调整

- `WorksService` 返回的原创模板 `assetUrl` 从绝对 API 地址改为同域 `/api/works/xiaohongshu/original/reference-templates/:templateId/asset`
- 模板预览统一走当前站点同域代理，避免浏览器因域名、端口、协议或缓存差异拿到不同资源地址
- `original-reference-template-picker.tsx` 为模板卡片新增预览加载失败占位
- 当某张模板图片实际加载失败时，不再只显示浏览器默认裂图图标，而是明确提示“模板预览加载失败，请先刷新模板或切换其他模板”

## 3. 修改意图

- 同域资源路径更符合当前前端默认走 `/api` 的部署基线，也更适合 `17ai.site` 线上环境
- 对于真实缺失或尚未同步完成的模板对象，前端需要提供可见错误态，便于区分“浏览器显示异常”和“资源本身不存在”

## 4. 相关文件

- `apps/server/src/modules/works/works.service.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-reference-template-picker.tsx`
- `apps/web/src/styles/globals.css`
