# 2026-05-14 品牌域 Service 显式 BrandId 优先级修正

## 背景

- 品牌增长页在调用品牌档案与小红书采集工作区接口时，明明已经传入了当前页面解析出的 `brandId`，但前端 `services` 层仍会优先使用本地登录态里缓存的 `currentBrandId`。
- 当页面显示的品牌上下文与本地缓存残留的品牌不一致时，就会出现“当前页发起同步成功，但刷新后读取到的是另一个品牌的数据”的错位现象。
- 这类问题在飞书同步场景下会表现为：提示已更新若干条结果，但当前品牌页的“对标作品信息及数据”仍显示 `0 条`。

## 本次调整

- `apps/web/src/services/collectors.ts`
  - `resolveBrandId()` 改为显式入参优先，只有未传 `brandId` 时才回退到本地登录态的 `currentBrandId`
- `apps/web/src/services/brand-growth.ts`
  - 同步调整 `resolveBrandId()`，保证品牌档案请求与小红书采集请求在同一品牌上下文下执行

## 影响

- 品牌增长页只要已经算出当前真实品牌，就不会再被浏览器本地残留品牌上下文覆盖。
- “同步写入品牌 A、刷新却读取品牌 B”的风险下降，尤其适用于多品牌账号切换或历史 demo brand 污染场景。

## 验证

- `GetDiagnostics` 检查：
  - `apps/web/src/services/collectors.ts`
  - `apps/web/src/services/brand-growth.ts`
- `npm run build:web`

## 后续说明

- 这次修的是前端品牌域请求参数优先级，不改变后端飞书字段解析逻辑。
- 若修完后仍存在“同步成功但当前区块无数据”，下一步应继续核对线上当前账号的真实品牌上下文与同步响应体中的 `workspace.benchmarkNotes`。 
