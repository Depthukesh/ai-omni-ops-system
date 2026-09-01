# 2026-09-01 软文街第三方媒体投放排查与响应结构对齐

## 1. 背景

用户反馈 `GEO -> 第三方媒体 -> 第三方媒体投放` 出现“加载失败 Internal server error”，并要求对照 `workspace-notes/GEO/软文街API接口文档2.0(2).docx` 检查软文街第三方平台为什么连不上。

## 2. 本次排查结论

本次先做了真实链路排查，没有直接按“平台挂了”下判断。

已确认：

- `https://api.kol.cn` 当前可解析、可连通
- 当前品牌保存的软文街凭证真实存在于 `BrandThirdPartyPlatformSecret`
- 用同一组凭证直调：
  - `POST /api/auth/authenticate` 登录成功
  - `GET /api/news_resource_2/data?page=1` 媒体列表成功
- 当前前端实际走的 `http://127.0.0.1:3001/api/...` 代理链路也能正常返回媒体列表

因此，本次没有复现出“软文街平台整体不可连”的事实，问题不是：

- 软文街平台宕机
- 当前机器无法访问软文街
- 当前品牌的 API Key / 登录账号 / 登录密码失效

## 3. 真实发现的问题

### 3.1 媒体列表分页字段读取不完整

软文街真实列表响应里，分页字段在顶层 `pagination`：

- `current_page`
- `last_page`
- `per_page`
- `total`

原实现只在列表容器里读 `per_page / current_page / last_page / total`，当 `data` 顶层直接是数组时，会把顶层 `pagination` 丢掉，导致站内工作区总数、是否还有下一页判断失真。

### 3.2 下单返回结构读错了

文档和真实接口都表明，下单返回主数据在 `response_data`，不是 `data`。

原实现创建投放订单时仍按 `envelope.data` 取 `order_id / resource_name`，会导致后续订单信息解析不稳。

### 3.3 当前品牌还没有可投放文章

当前品牌 `cmso3hc410004f1rkn4w9cjbr` 下，`OpenClawGeoContent` 里暂时没有 `third_party_media` 类型且带 HTML 的文章记录。

这意味着即使媒体资源列表可正常读取，页面上方“第三方媒体内容列表”仍会显示为空，需要先让 OpenClaw 或人工保存可投放的第三方媒体文章。

## 4. 本次代码修复

修改文件：

- `apps/server/src/modules/third-party-platforms/ruanwenjie-media.service.ts`

修复内容：

- 媒体列表解析显式兼容顶层 `pagination`
- 投放创建结果显式兼容 `response_data`
- 保留旧 `data` 结构作为回退兼容，避免平台后续局部调整时直接打断旧链路

## 5. 验证

- 后端构建：`pnpm build:server`
- 真实接口验证：
  - 软文街登录成功
  - 软文街媒体列表成功
  - 本地 `3011` API 直连成功
  - 本地 `3001/api` 前端代理链路成功

## 6. 当前影响与建议

- 这次修复后，仓库代码已经和软文街当前真实响应结构更一致
- 当前本地运行中的已安装 `local-single-user` 包若仍在跑旧 dist，需要在后续同步最新构建后才会带上本次修复
- 如果页面后续再次出现 `Internal server error`，优先排查当次运行时是否命中了旧安装包代码或瞬时上游响应异常，而不是先怀疑凭证失效
