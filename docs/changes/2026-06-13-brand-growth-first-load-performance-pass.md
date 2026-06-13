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
  - 优化后：4 条
- 本地浏览器请求路径：
  - 优化前：`http://127.0.0.1:3011/api/...`
  - 优化后：`http://localhost:3002/api/...`
- `next build` 结果：
  - `/brand-growth` 页面体积由约 `140 kB / 248 kB` 下降到约 `120 kB / 228 kB`

## 后续建议

- 收紧 `DashboardLayout` 中邀请数据的首屏请求与轮询范围。
- 对 `auth/me`、`auth/profile`、`member-permissions` 增加短时缓存。
- 将报告任务相关轮询限制为当前处于 report 板块时才启动。
- 对 collection 和 report 内部再继续按子页签细分懒加载。
