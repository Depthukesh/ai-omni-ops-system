# 2026-09-01 软文街第三方媒体投放缓存库、搜索与分页收口

## 背景

`GEO -> 第三方媒体 -> 第三方媒体投放` 原本每次只是临时读取软文街某一页媒体列表。用户一旦离开页面，下次回来又要从头刷新，而且一次只看到当前远端页的少量媒体，不利于长期挑选和筛选投放渠道。

本次目标是把这条链路从“实时拉单页”升级为“站内持续缓存媒体库”。

## 本次变更

### 1. 新增品牌级软文街媒体缓存真源

- 新增运行时表：
  - `OpenClawThirdPartyMediaResource`
  - `OpenClawThirdPartyMediaSyncState`
- 每次从软文街读取到的媒体都会按：
  - `brandId`
  - `workspaceScope`
  - `providerType`
  - `remoteResourceId`
  去重后持续保存
- 同时记录：
  - 来源远端页码
  - 最近同步时间
  - 下一次待同步远端页码
  - 是否已同步到最后一页

### 2. 页面改成“读缓存 + 继续同步下一页”

- `GET /openclaw/brands/:brandId/third-party-media-delivery/resources`
  - 现在读取站内缓存真源
- `POST /openclaw/brands/:brandId/third-party-media-delivery/resources/sync`
  - 现在继续同步软文街下一页到站内缓存
  - 不覆盖历史缓存

页面语义同步改成：

- 进入页面：直接看当前品牌已缓存媒体库
- 点击“刷新媒体”：继续同步下一页
- 不再每次都重新从零读取第一页

### 3. 站内分页固定 20 条

- 软文街缓存列表当前固定按每页 20 条分页
- 分页语义以站内缓存库为准，不再直接跟随远端接口单页大小

### 4. 支持缓存库搜索

- 支持按以下字段搜索当前品牌已缓存媒体：
  - 媒体名称
  - 平台
  - 分类
  - 地区
- 搜索命中的是站内已累计缓存的数据，不是远端当前单页

### 5. OpenClaw MCP / Skill 同步

- OpenClaw MCP 新增：
  - `get_openclaw_third_party_media_delivery_resources`
  - `sync_openclaw_third_party_media_delivery_resources`
- Skill 手册同步补充：
  - GEO 第三方媒体投放当前是“缓存库”语义
  - 同步一次 = 继续拉远端下一页并保存
  - 列表页 = 已缓存媒体按 20 条分页
  - 搜索 = 搜当前品牌已缓存媒体

## 影响面说明

- 本次没有改登录态和品牌鉴权方式
- 没有改软文街下单协议
- 没有改 `third_party_media` 文章真源结构
- 这次新增的是 GEO 第三方媒体投放的站内缓存层，避免页面反复重拉和媒体池过小

## 验证重点

- 页面首次进入是否能读取站内已缓存媒体
- 点击“刷新媒体”后是否继续同步下一页而不是覆盖旧列表
- 列表是否固定按 20 条分页
- 搜索是否命中站内已缓存媒体
- OpenClaw MCP 是否能读取缓存库并触发继续同步
