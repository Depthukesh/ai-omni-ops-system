# [OPEN] daily-hotspot-loss

## 问题概述
- 症状：每日热点页面历史记录疑似丢失，当天榜单为空，并出现接口异常提示。
- 目标：确认是数据被覆盖、接口调用失败、三方返回结构变化，还是前端读取逻辑导致的空展示。

## 当前范围
- 前端页面：`apps/web/src/app/(dashboard)/brand-growth/*`
- 前端服务：`apps/web/src/services/daily-hotspots.ts`
- 后端接口：`apps/server/src/modules/collectors/daily-hotspots.controller.ts`
- 后端服务：`apps/server/src/modules/collectors/collectors.service.ts`
- 持久化：`BusinessAsset`

## 初始假设
1. 同一天热点快照被失败同步覆盖，导致 `items=[]` 且历史日期仍存在或回退到空数据。
2. 自动补抓/定时抓取没有真正执行，因为运行链路只识别环境变量 `TIKHUB_API_KEY`，没有稳定走品牌级 key。
3. 第三方接口返回结构变化，后端提取逻辑未命中，最终写入空 `items`。
4. 历史日期仍在库里，但 `availableDates` 生成条件或前端回退逻辑导致用户看起来像“历史没了”。
5. 下游接口请求本身失败，页面只显示了默认空工作区和错误提示，没有把旧数据保住。

## 证据计划
- 查 `BusinessAsset` 中每日热点相关记录的 `snapshotDate`、`syncStatus`、`items` 数量。
- 查当前环境/品牌级 key 是否满足自动补抓条件。
- 查三方接口调用点和原始响应结构兼容逻辑。
- 必要时做最小化日志插桩，先记录 pre-fix 证据。

## 当前状态
- 状态：调查中，尚未修改业务逻辑。

## 已确认运行时证据
- 线上页面 `https://17ai.site/brand-growth` 已登录态下，`每日热点` 首屏真实触发：
  - `GET /api/collectors/daily-hotspots/brands/br_super_admin_demo/workspace`
- 点击 `手动搜索` 后，真实触发：
  - `POST /api/collectors/daily-hotspots/brands/br_super_admin_demo/sync`
- 浏览器 `PerformanceResourceTiming` 证据：
  - `GET /workspace` 一次请求耗时约 `60087ms`，`responseStatus=504`
  - `POST /sync` 一次请求耗时约 `60113ms`，`responseStatus=504`
- 页面最终用户可见错误文案为：
  - `每日热点搜索失败：上游服务暂时不可用（502 Bad Gateway），请稍后重试`
- 当前页面展示状态：
  - `查看日期` 只有 `2026-06-08`
  - `IDLE`
  - `热点榜单共 0 条`
  - `当前榜单还没有可展示的热点条目`

## 当前代码链路判断
- `GET /workspace` 并不只是读库。
- `apps/server/src/modules/collectors/collectors.service.ts` 中：
  - `getDailyHotspotWorkspace()` 会先 `readDailyHotspotWorkspace()`，随后在未指定日期且未跳过补抓时，进入 `shouldCatchUpDailyHotspotBrand()`
  - `shouldCatchUpDailyHotspotBrand()` 只认 `process.env.TIKHUB_API_KEY`
  - 若判断今天快照未成功，会同步执行 `syncDailyHotspots()`
- 因此首屏 `GET /workspace` 也可能被自动补抓阻塞，而不是单纯读取历史快照。
- `syncDailyHotspots()` 内部并发调用 `collectAndStoreDailyHotspotPlatform()`，后者会直接请求 `Tikhub`。
- 当前 `requestTikHub()` 未看到显式超时控制；线上请求稳定在约 60 秒后返回 `504`，更像是上游接口/反向代理超时，而不是前端状态没收口。

## 当前最可能结论
1. 当前最直接故障点是 `Tikhub` 热点采集链路过慢或卡住，导致 `GET /workspace` 和 `POST /sync` 都在约 60 秒后超时。
2. “历史记录像没了” 至少有一部分是展示层结果：首屏 `workspace` 不是纯读历史，而是可能先卡在自动补抓上，最终返回超时。
3. 是否存在“同日失败快照覆盖成功快照”风险，代码上仍然成立，因为 `upsertDailyHotspotAsset()` 会按 `platformKey + snapshotDate` 覆盖同日记录；但目前还缺数据库证据证明线上已经发生。

## 下一步建议
- 优先查看线上服务日志中 `Tikhub` 热点接口的超时/504 记录，确认是：
  - `api.tikhub.io` 响应过慢
  - 出口网络问题
  - 反向代理 60 秒超时
- 若要继续修复，优先级建议：
  1. 让 `GET /workspace` 不阻塞在自动补抓上，先返回已有历史快照
  2. 给 `Tikhub` 请求补显式超时与更清晰的错误落库
  3. 避免同日失败结果覆盖已成功快照
