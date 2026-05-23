# 2026-05-23 抖音采集视频落 OSS 与采集页文案收口

## 本次变更

- `apps/server/src/modules/collectors/collectors.service.ts` 在抖音作品采集时改为先落作品元数据并立刻返回，再由后台队列异步下载视频并写入 OSS 或开发态本地回退存储。
- 抖音作品元数据新增视频缓存字段，采集结果优先返回 OSS 签名地址，避免直接依赖会过期的抖音临时视频地址。
- 新增每日清理任务，删除缓存超过 7 天的抖音采集视频对象，并清空对应缓存元数据。
- 把抖音作品采集资产的去重键从账号级修正为 `workId`，避免同一账号的多条作品互相覆盖。
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx` 收掉抖音采集输入区的技术说明文案、查看文档按钮和重复标签，仅保留简洁标题、输入框和提交按钮。

## 修改意图

- 抖音接口返回的视频直链存在时效，直接展示到品牌增长或同步到素材库后会很快失效。
- 采集完成后异步缓存到 OSS，后续页面每次读取时都重新生成短时签名链接，可以兼顾稳定访问和存储安全，同时避免同步接口因下载视频和上传 OSS 耗时过长而被网关打成 `502`.
- 7 天自动清理用于控制 OSS 占用，避免采集视频长期堆积。
- 采集页输入区只保留业务必需信息，减少 `aweme_id`、`sec_user_id`、接口文档等技术细节对业务使用的干扰。

## 当前约定

- 抖音视频缓存对象路径：`collectors/<brandId>/douyin/videos/<workId>.<ext>`
- 缓存保留期：7 天
- 抖音作品缓存字段仅作用于采集结果展示和素材库浏览，不改变原始 `workUrl`
- 若重新采集同一作品，则沿用 `workId` 对应的缓存对象键并刷新缓存时间
- 抖音同步接口不再等待视频缓存完成；作品先入库，视频缓存以 `PENDING / READY / FAILED / EXPIRED` 状态在后台推进

## 影响范围

- 后端：
  - `apps/server/src/modules/collectors/collectors.service.ts`
- 前端：
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`

## 验证

- `GetDiagnostics` 检查修改文件，结果为空
- `npm run build:server`
- `npm run build:web`
