# 2026-06-19 小红书品牌作品媒体落 OSS 与列表回显修复

## 问题背景

- 收集数据 -> 小红书 -> `品牌作品信息及数据` 中，图片列与视频列长期显示为空。
- Tikhub 的 `获取用户笔记列表` 接口实际已经返回了图片数据，用户提供的样例 `第三方数据接口/小红书用户笔记列表.json` 中可以看到 `images_list`。
- 但系统当前只把原始作品 URL 与少量结构化字段写入采集资产，并没有把小红书 CDN 图片真正落到 OSS，也没有给前端可直接预览的站内媒体地址。

## 根因分析

### 1. 小红书图片 URL 识别规则过严

- 之前 `CollectorsService` 中的 `isLikelyImageUrl()` 只识别以 `.png/.jpg/.webp` 等扩展名结尾的 URL。
- 小红书接口返回的图片链接常见格式为：
  - `https://sns-i11.rednotecdn.com/...?.../format/webp...`
- 这类链接不以文件扩展名结尾，因此会被误判为“不是图片”，导致：
  - `extractXhsImageList()` 返回空数组
  - 品牌作品表格图片列显示 `-`

### 2. 小红书作品采集链路没有媒体缓存到 OSS

- 抖音作品已经有 `视频下载 -> OSS 缓存 -> 回传可读地址` 的链路。
- 小红书作品此前只有：
  - 采集 URL
  - 写 metadata
  - 前端直接展示链接
- 没有：
  - 下载图片/视频
  - 存储到 OSS 或本地 OSS 回退
  - 站内媒体读取接口

### 3. 前端品牌作品表格只输出纯文本链接

- `collection-workspace.tsx` 中，品牌作品表格的图片列仅输出“查看首图”文本链接。
- 即便后端后续回传了图片地址，也不会以缩略图方式直接呈现。

## 本次修复

### 1. 修正小红书图片与视频 URL 提取规则

- 文件：
  - `apps/server/src/modules/collectors/collectors.service.ts`
- 调整内容：
  - 扩展 `isLikelyImageUrl()`，支持识别小红书 CDN 的 `rednotecdn.com` / `xhscdn.com` 图片链接。
  - 扩展 `isLikelyVideoUrl()`，支持识别小红书视频 CDN 与流式地址特征。
  - `extractXhsImageList()` 优先读取：
    - `images_list`
    - `image_list`
    - `images`
  - `extractXhsVideoUrl()` 增加对：
    - `video_info`
    - `video_info_v2`
    - `video`
    - `note_card`
    的递归提取。

### 2. 为小红书作品新增媒体缓存到 OSS

- 文件：
  - `apps/server/src/modules/collectors/collectors.service.ts`
- 新增能力：
  - `cacheXhsNoteMediaBundle()`
  - `cacheXhsRemoteMedia()`
  - `fetchXhsStoredMedia()`
  - 小红书媒体存储 key 与访问 URL 构建辅助函数
- 行为变化：
  - 品牌作品、对标作品、搜索笔记在采集时会尝试：
    - 下载图片
    - 下载视频
    - 存入 OSS 或本地 OSS 回退
  - metadata 中会同时保留：
    - OSS 落库后的媒体地址
    - 原始来源地址
  - `mapCollectedNote()` 优先返回已落库地址，落库失败时才回退原始来源地址。

### 3. 新增小红书媒体读取接口

- 文件：
  - `apps/server/src/modules/collectors/collectors.controller.ts`
- 新增接口：
  - `GET /api/collectors/xiaohongshu/brands/:brandId/media/:fileName`
- 用途：
  - 读取已落到 OSS 的小红书图片/视频
  - 保持品牌权限校验
  - 支持 `inline` / `attachment` 两种返回方式

### 4. 品牌作品表格改为真实图片预览

- 文件：
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- 调整内容：
  - `XhsNotesTable` 的图片列改为 `ProtectedImageCard`
  - 列表中直接显示图片缩略图
  - 点击缩略图可进入现有媒体预览弹层
- 结果：
  - 不再只显示文字链接
  - 用户能在列表里直接看到已落库的图片

## 影响范围

- 后端：
  - `apps/server/src/modules/collectors/collectors.service.ts`
  - `apps/server/src/modules/collectors/collectors.controller.ts`
- 前端：
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- 不影响：
  - 技能板块
  - 微信工作流
  - 抖音既有媒体缓存逻辑

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/collectors/collectors.service.ts`
  - `apps/server/src/modules/collectors/collectors.controller.ts`
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- `npm run build:server`
- `npm run build:web`

## 当前边界

- 本次先修复“小红书品牌作品信息及数据”的媒体提取与回显主链路。
- 对标作品与搜索笔记采集链路也已同步接入媒体缓存能力，但前端重点优化的是品牌作品列表显示。
- 当前策略优先保证媒体能被识别、落 OSS、可预览；后续如果需要，可继续扩展：
  - 多图宫格展示
  - 视频缩略图封面
  - 重复同步时的旧媒体清理策略
