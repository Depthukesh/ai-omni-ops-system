# 2026-08-08 品牌增长策略抖音采集视频预览本地副本修复

## 背景

用户反馈 `brand-growth -> 收集数据 -> 抖音 -> 对标作品信息及数据` 中，表格“视频预览”列无法打开。

现场现象是：

- API 数据存在
- 抖音作品记录已入库
- 网页版历史上通过 OSS 同步后可以预览
- 当前本地版缺少 OSS 时，视频预览列显示为空或无法打开

这说明问题不在“接口没有返回视频地址”，而在“受控副本 URL 生成逻辑仍然把 OSS 当成唯一可读出口”。

## 根因

排查 `apps/server/src/modules/collectors/collectors.service.ts` 后确认：

1. 抖音采集视频缓存本来就会写入 `videoStorageKey`
2. `OssStorageService` 在缺少 OSS 配置且非生产环境时，也确实会回退到 `.runtime/local-oss`
3. 但 `resolveDouyinVideoPlaybackUrl()` 里仍然写死了：
   - 只有 `ossStorageService.isEnabled()` 为真时，才返回可预览 URL
4. 结果是：
   - 视频已经缓存到本地副本
   - 但因为本地版没有 OSS，前端拿到的 `videoUrl` 仍然是空

也就是说，真正断掉的是“本地副本 -> 前端预览 URL”这一步，而不是采集 API 本身。

## 本次修复

### 1. 为存储服务补充本地回退状态判断

- 文件：`apps/server/src/storage/oss-storage.service.ts`
- 新增：
  - `isUsingLocalFallback()`

用于让上层明确判断当前是否处于“未配置 OSS，但已启用本地受控副本”的运行态。

### 2. 为抖音采集视频补站内受控媒体接口

- 文件：`apps/server/src/modules/collectors/collectors.controller.ts`
- 新增：
  - `GET /api/collectors/douyin/brands/:brandId/media/:assetId`

该接口会：

- 校验品牌权限
- 按采集资产读取 `videoStorageKey`
- 从 OSS 或本地回退存储读取视频副本
- 以受控流方式返回给前端

### 3. 抖音视频预览 URL 改为本地/OSS 双模式兼容

- 文件：`apps/server/src/modules/collectors/collectors.service.ts`

调整后规则：

- 如果当前是 OSS 正常模式：
  - 继续返回签名 OSS 读取地址
- 如果当前是本地回退模式：
  - 返回站内受控媒体接口 URL
- 如果缓存未完成、已过期或副本不存在：
  - 仍按原逻辑返回空并展示对应状态

### 4. 为抖音视频副本补读取方法

- 文件：`apps/server/src/modules/collectors/collectors.service.ts`
- 新增：
  - `fetchDouyinStoredMedia(brandId, assetId)`

用于统一读取当前采集资产对应的受控视频副本。

## 影响范围

- `apps/server/src/storage/oss-storage.service.ts`
- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/server/src/modules/collectors/collectors.controller.ts`
- `docs/engineering-standards.md`
- `docs/generated-content-storage-standards.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/changes/2026-08-08-brand-growth-douyin-local-video-preview-fix.md`

## 验证

本次已执行：

- 静态排查抖音采集视频缓存链路
- 确认 `OssStorageService` 已具备 `.runtime/local-oss` 本地回退能力
- 确认原问题根因是 `resolveDouyinVideoPlaybackUrl()` 只认 OSS，不认本地回退
- 运行 `npm --workspace apps/server run build` 验证后端编译链路

本次未执行：

- 未在当前回合重新触发一条真实抖音采集任务做端到端联调
- 未在浏览器里重新点击该行“视频预览”做手工回归

## 结果

这次修复后，抖音采集视频预览不再把 OSS 当成唯一出口。

对于本地版：

- 视频副本仍然会落受控存储
- 缺 OSS 时改走站内受控接口读取本地副本
- 前端可以继续拿到可播放的 `videoUrl`

## 后续建议

1. 在出问题的本地环境里重新同步一条抖音对标作品，确认该条记录的 `videoCacheStatus` 能进入 `READY`
2. 手工回归：
   - `brand-growth -> 收集数据 -> 抖音 -> 对标作品信息及数据 -> 视频预览`
3. 后续可继续收口：
   - 抖音封面图是否也统一走同一受控副本接口
   - 素材库、OpenClaw、发布链路里是否还有只认 OSS 的同类分支
