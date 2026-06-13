# 2026-06-13 品牌增长页首屏性能优化记录

## 背景

- 品牌增长策略页面在最近的视觉统一后，用户反馈“数据加载明显变慢”。
- 运行时排查确认，慢点不在首屏 HTML 或 CSS，而在品牌增长页初始化阶段的一次性全量数据预取。

## 根因

- 首屏默认预取了资料库、收集数据、品牌增长报告、飞书配置、营销计划、营销日历等多个工作区数据。
- `BrandGrowthWorkspace` 初始化链路中存在重复的 `getMe()` 请求。
- 浏览器端本地开发默认直连 `127.0.0.1:3011/api`，触发跨域预检，放大了慢加载体感。
- `/api/[...path]` 代理中遗留了运行时调试上报逻辑，代理每次转发都会产生额外的调试网络请求。

## 本次改动

### 1. 首屏改为按板块懒加载

- 默认只加载 `library` 范围所需数据：
  - `auth/me`
  - `member-permissions`
  - `archive`
- 用户切换到“收集数据”时，再加载 collection 相关工作区。
- 用户切换到“品牌增长报告”时，再加载 report 相关工作区。

### 2. 合并重复用户请求

- `resolveActiveBrandId()` 和 `loadArchive()` 不再各自单独触发 `getMe()`。
- `getCurrentUserProfile()` 延后到 collection 板块真正需要飞书相关数据时再请求。

### 3. 本地请求切换为同源 `/api`

- 浏览器端默认通过 `window.location.origin + /api` 访问接口。
- 本地页面不再默认直连 `127.0.0.1:3011/api`，从而减少 `OPTIONS` 预检。
- 仍通过 `app/api/[...path]` 统一代理到后端服务。

### 4. 品牌增长工作区按需拆分 JS

- `library-workspace`
- `collection-workspace`
- `report-workspace`
- `xiaohongshu/calendar-workspace`

- 上述模块改为动态导入，未进入的工作区不会在首屏一并下载。

### 5. 清理代理层调试残留

- 删除 `/api/[...path]` 中遗留的调试上报 `fetch`。
- 避免代理请求路径额外再发调试网络请求。

## 结果

- 首屏 API 请求数量：
  - 优化前：30+ 条
  - 第二轮优化后：4 条
  - 第三轮优化后：3 条
- 本地浏览器请求路径：
  - 优化前：`http://127.0.0.1:3011/api/...`
  - 优化后：`http://localhost:3002/api/...`
- `next build` 结果：
  - `/brand-growth` 页面体积由约 `140 kB / 248 kB` 下降到约 `120 kB / 228 kB`

## 第三轮补充优化

- 将 `DashboardLayout` 中的邀请数据同步范围收紧到 `personal-center` 相关页面。
- 在品牌增长页、抖音、小红书、公众号等工作台页面，不再首屏请求 `getMyBrandInvites()`。
- 邀请数据轮询也只在个人中心场景内运行，避免全站顶层常驻轮询。

### 第三轮验证

- 品牌增长页首屏 API 请求进一步收敛为：
  - `/api/auth/me`
  - `/api/brands/{id}/member-permissions`
  - `/api/brands/{id}/archive`
- 原先顶层布局注入的 `/api/brands/me/invites` 已从品牌增长页首屏移除。

## 第四轮补充优化

- 为 `getMe()` 增加 30 秒短时缓存与并发请求复用。
- 为 `getBrandPermissionSettings(brandId)` 增加按品牌维度的 30 秒短时缓存与并发请求复用。
- 登录、注册、切换品牌、更新资料、退出登录后会主动清理 `getMe()` 缓存，避免脏数据残留。
- 更新权限设置后会同步刷新对应品牌的权限缓存。

### 第四轮验证

- 在同一浏览器会话中执行：
  - `brand-growth -> personal-center -> brand-growth`
- 30 秒缓存窗口内再次回到品牌增长页时：
  - 未再次请求 `/api/auth/me`
  - 未再次请求 `/api/brands/{id}/member-permissions`
  - 仅补发了 `/api/brands/{id}/archive`
- 说明用户上下文和权限上下文已成功从“重复请求”收敛为“短时复用”。

## 第五轮补充优化

- 为 `getBrandArchive(brandId)` 增加按品牌维度的 30 秒短时缓存与并发请求复用。
- 品牌资料库相关写操作改为“写后失效”：
  - 更新品牌背景
  - 新增 / 编辑 / 删除产品
  - 更新调研问卷
  - 更新平台账号 / 竞品账号
  - 更新第三方数据 / 企业经营数据投喂
- 品牌增长页内“刷新数据”和关键同步后回读改为 `force: true`，确保手动刷新仍然能拿到最新数据，而不是被缓存吞掉。
- report 任务轮询改为“只有当前对应报告页处于激活状态时才继续轮询”，避免用户停留在资料库或收集数据板块时仍然后台刷新报告接口。

### 第五轮验证

- 在同一浏览器会话中执行：
  - `brand-growth -> personal-center -> brand-growth`
- 30 秒缓存窗口内再次回到品牌增长页时：
  - 未再次请求 `/api/auth/me`
  - 未再次请求 `/api/brands/{id}/member-permissions`
  - 未再次请求 `/api/brands/{id}/archive`
- 说明品牌增长页的“用户上下文 + 权限上下文 + 资料库上下文”已全部进入短时复用状态。

## 第六轮补充优化

- 为 `getMyBrandInvites()` 增加 15 秒短时缓存与并发请求复用。
- 为 report 相关工作区服务增加 30 秒 TTL 缓存，并在生成、保存、删除等写操作后按品牌维度失效缓存。
- report 任务轮询刷新继续显式走 `force: true`，保证后台任务状态回读不会被缓存吞掉。
- 在稳定预览环境下补了一层页面级 `report` 工作区快照：
  - `collectionWorkspace`
  - `reportWorkspace`
  - `visualReportWorkspace`
  - `annualMarketingPlanWorkspace`
  - `xiaohongshuMarketingPlanWorkspace`
  - `marketingCalendarWorkspace`
- 上述数据会在 report 作用域加载完成后写入 `sessionStorage`，品牌增长页重新挂载后优先恢复，并直接把 `report` 作用域标记为已加载。

### 第六轮验证

- 首次进入 `personal-center`：
  - `/api/brands/me/invites` 仅出现 1 次
- 在同一浏览器会话中执行：
  - `brand-growth(report) -> personal-center -> brand-growth(report)`
- 在 30 秒缓存窗口内重新回到 report 板块时：
  - 未再次请求 `/api/reports/brands/{id}/growth-report`
  - 未再次请求 `/api/reports/brands/{id}/visual-growth-report`
  - 未再次请求 `/api/reports/brands/{id}/half-year-marketing-plan`
  - 未再次请求 `/api/reports/brands/{id}/xiaohongshu-marketing-plan`
  - 未再次请求 `/api/reports/brands/{id}/xiaohongshu-marketing-calendar`
  - 未再次请求 `/api/collectors/xiaohongshu/brands/{id}/workspace`
  - 仅保留品牌页重新挂载时仍需要的 `/api/brands/{id}/member-permissions` 与 `/api/brands/{id}/archive`
- 说明第六轮收口后，report 板块在短时间页面往返中的重复请求已经被压缩到最小可接受范围。

## 后续建议

- 收紧 `DashboardLayout` 中邀请数据的首屏请求与轮询范围。
- 对 `auth/me`、`auth/profile`、`member-permissions` 增加短时缓存。
- 将报告任务相关轮询限制为当前处于 report 板块时才启动。
- 对 collection 和 report 内部再继续按子页签细分懒加载。
