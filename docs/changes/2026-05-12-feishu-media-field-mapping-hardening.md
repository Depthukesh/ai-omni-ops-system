# 2026-05-12 Feishu Media And Field Mapping Hardening

## 背景
- 品牌增长策略页从飞书同步“小红书品牌作品信息及数据”后，页面虽然显示“已同步”，但正文、作者、发布时间等字段经常为空。
- 附件区域还会把 `webp/mp4` 文件名误当成图片 URL，导致卡片里出现破图；视频附件也可能因为飞书媒体域名或路径不在当前代理白名单内而无法播放。

## 根因
- 后端在组装 `imageList` 时，对指定字段直接走 `flattenFeishuValue()`，把附件对象里的 `name/token` 一并塞进了数组，前端会把这些非 URL 字符串当成图片地址。
- 飞书媒体代理只允许 `open.feishu.cn` / `open.larkoffice.com` 的单一路径，遇到其他飞书下载域名或常见下载路径会被拦截。
- 品牌作品/对标作品的字段别名覆盖不够，导致常见表头如“正文内容”“作品内容”“博主昵称”“发布日期”“作品封面”“附件”等未被稳定识别。

## 本次调整
- `apps/server/src/modules/collectors/collectors.service.ts`
  - 品牌作品与对标作品同步改为对图片字段只提取真实 URL，不再把附件文件名/Token 混入 `imageList`
  - 新增 `readFeishuFieldUrls()`、`extractUrlsFromUnknown()`、`readFeishuImageUrls()`，并扩展附件对象识别字段：`tmp_url`、`download_url`、`preview_url`、`file_url`、`mime_type`、`file_name`
  - 视频识别不再只看 `type`，同时根据文件名/URL 后缀识别 `mp4/mov/webm` 等视频附件
  - 扩展品牌作品/对标作品的字段别名，补齐正文、标题、作者、用户 ID、发布时间、附件等常见表头
  - 标题兜底时过滤纯文件名，避免把 `*.webp`、`*.mp4` 当作品标题
  - 飞书媒体代理白名单扩展到常见 `*.feishu.cn`、`*.larkoffice.com`、`*.larksuite.com` 下载域名，并补充常见下载路径
- `apps/web/src/app/(dashboard)/xiaohongshu/work-media-helpers.ts`
  - 仅对合法 HTTP(S) 地址生成预览/下载地址；非法字符串直接返回空串，不再把文件名当图片地址
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - 图片预览地址为空时直接跳过渲染
  - 视频预览/下载链接为空时不再输出无效播放器与按钮

## 验证
- `npm run build:server`
- `npm run build:web`
- 三个改动文件诊断均无报错

## 预期效果
- 飞书同步后的品牌作品卡片会优先显示真实正文、作者、发布时间与作品链接
- 图片附件不再把文件名误当成 URL 渲染
- 视频附件在常见飞书下载域名下可通过站内代理正常预览/下载
