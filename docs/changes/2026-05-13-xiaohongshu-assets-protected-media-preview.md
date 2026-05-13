# 2026-05-13 小红书素材库飞书媒体预览鉴权修复

## 背景

飞书同步链路本身已经恢复正常，但用户把作品加入小红书素材库后，素材卡片里的图片和视频仍然空白。根因不是同步数据没回来，而是前端素材库仍然把受保护的 `feishu-media` 代理地址直接赋给 `<img>` / `<video>` 和灯箱预览，浏览器媒体请求不会自动附带本地 Bearer Token，最终继续 401。

## 本次改动

- 在 `xiaohongshu/assets-workspace.tsx` 中新增素材预览专用受保护媒体 hook
- 对命中站内 `feishu-media` 代理的素材，先通过 `requestBlobByUrl()` 鉴权拉取 blob，再转成 object URL 给卡片和灯箱使用
- 对普通外链图片/视频继续保持直出，避免把非受保护资源也强行改成 fetch blob 后引入跨域副作用
- 在 `work-media-helpers.ts` 中补 `isProtectedCollectorMediaUrl()`，用于识别当前素材是否属于受保护飞书代理资源

## 影响范围

- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/work-media-helpers.ts`

## 验证

- `GetDiagnostics` 检查 `assets-workspace.tsx`、`work-media-helpers.ts` 无新增错误
- `npm run build:web` 通过

## 预期效果

- 小红书素材库中的飞书图片、视频卡片可以正常显示
- 点击素材卡片后，灯箱中的图片和视频也能正常打开
- 非飞书直链素材继续保持原有展示方式，不被这次鉴权修复误伤
