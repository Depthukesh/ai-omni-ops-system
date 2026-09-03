# 2026-09-03 软文街凭证刷新与缓存时间字段修复

## 背景

`GEO -> 第三方媒体投放 -> 刷新媒体` 仍然报 `Internal server error`。这次继续排查后发现，之前表面看到的“验证码过期 / 账号或密码错误”并不是唯一问题，链路里实际叠了两层故障：

1. 当前品牌保存的软文街账号密码已经不是可用凭证，导致鉴权失败。
2. 在换成可用凭证后，媒体同步又在本地缓存入库阶段触发 PostgreSQL 类型错误。

## 本次确认的真实根因

### 1. 软文街可用凭证已变化

- 直接按用户提供的新账号密码调用 `POST https://api.kol.cn/api/auth/authenticate`
- 在保留当前系统使用的：
  - `identity=advertiser`
  - `captcha_token=advertiser`
  - `captcha=advertiser`
  条件下，可以成功换取 token
- 继续调用 `GET /api/news_resource_2/data` 也能正常返回媒体列表

因此，本轮页面失败的第一层原因是：

- **当前品牌保存的软文街共享凭证已过期 / 已变更**

### 2. 站内缓存写入把字符串时间直接写进 `TIMESTAMPTZ`

在把凭证更新为可用值后，`/resources/sync` 不再卡在外部鉴权，而是出现新的后端异常：

```text
ERROR: column "lastSyncedAt" is of type timestamp with time zone but expression is of type text
```

根因是：

- `OpenClawThirdPartyMediaResourceService`
  - 在写入 `OpenClawThirdPartyMediaResource.lastSyncedAt`
  - 以及 `OpenClawThirdPartyMediaSyncState.lastSyncAt`
- 直接把 ISO 时间字符串传给 PostgreSQL `TIMESTAMPTZ`

SQLite 路径容忍这个写法，但 PostgreSQL 容器运行态会报类型错误。

## 本次修复

### 1. 刷新当前品牌软文街共享凭证

- 将当前运行品牌的软文街配置更新为用户确认的有效账号密码
- 保持：
  - `identity=advertiser`
  - `captchaToken=advertiser`
  - `captcha=advertiser`

### 2. 补充数据库时间入库转换

- 在 `apps/server/src/modules/openclaw/openclaw-third-party-media-resource.service.ts`
  新增数据库时间转换辅助
- 在以下写库路径中，先把字符串统一转成 `Date | null` 再传给 Prisma raw SQL：
  - `saveOrUpdateResource`
  - `saveSyncState`

## 验证

### 1. 外部软文街接口验证

- `POST /api/auth/authenticate`：成功返回 token
- `GET /api/news_resource_2/data?page=1`：成功返回媒体列表

### 2. 站内接口验证

- 重建 `docker/docker-compose.local-postgres.yml` 下的 `server` 容器
- `POST /api/openclaw/brands/br_demo_001/third-party-media-delivery/resources/sync`
  - 成功
  - 返回：
    - `remotePage=1`
    - `fetchedCount=50`
    - `createdCount=50`
    - `nextRemotePage=2`
- `GET /api/openclaw/brands/br_demo_001/third-party-media-delivery/resources?page=1`
  - 成功
  - 返回：
    - `total=50`
    - `pageSize=20`
    - `hasMore=true`

## 影响面说明

- 没有改软文街下单协议
- 没有改 GEO 页面交互
- 没有改缓存分页和搜索语义
- 本次修的是：
  - 当前品牌凭证可用性
  - PostgreSQL 下缓存时间字段写库兼容性
