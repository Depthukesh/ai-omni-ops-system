# 2026-05-13 线上品牌增长报告同域 API 代理修复

## 背景

在 `21e1131` 上线后，本地 `localhost` 已可正常生成品牌增长报告，但线上 `https://17ai.site/brand-growth` 点击“生成报告”仍提示：

- `上游服务暂时不可用（502 Bad Gateway）`

继续排查后确认，线上根因与本地之前的“浏览器直连 3011”问题不同，而是卡在生产同域 API 代理链路：

- 浏览器请求：`https://17ai.site/api/reports/brands/:brandId/growth-report/generate`
- `nginx` 将流量转发给 `ai-omni-web`（`127.0.0.1:3001`）
- `Next.js` 再通过 `next.config.ts` 的 `/api -> 3011/api` rewrite 转发到 `ai-omni-server`

这条 rewrite 代理在“品牌增长报告”这类长响应 POST 上会出现：

- `socket hang up`
- `ECONNRESET`
- 最终前端收到 `502 Bad Gateway`

同时已验证：

- 直连 `http://127.0.0.1:3011/api/reports/.../growth-report/generate` 成功
- 旧的 `http://127.0.0.1:3001/api/reports/.../growth-report/generate` rewrite 链路失败

## 本次处理

- 删除 `apps/web/next.config.ts` 中对 `/api/:path*` 的 rewrite 代理
- 新增 `apps/web/src/app/api/[...path]/route.ts`
- 通过 Next App Router 的 Node Runtime 路由处理器，显式代理所有同域 `/api/*` 请求到：
  - `INTERNAL_API_BASE_URL`
  - 或默认 `http://127.0.0.1:3011/api`
- 代理处理器具备：
  - 保留原始方法与请求头
  - 转发请求体
  - 透传上游响应状态码、响应头和响应体
  - 5 分钟超时保护
  - 上游失败时返回结构化 `502` JSON，而不是让 Next rewrite 抛通用 HTML 502

## 结果

- 本地重新验证 `POST http://127.0.0.1:3001/api/reports/brands/br_demo_001/growth-report/generate`
- 返回 `201`
- 证明同域 `/api` 现在已不再依赖 rewrite 代理，可稳定完成品牌增长报告生成链路

## 影响范围

- `apps/web/next.config.ts`
- `apps/web/src/app/api/[...path]/route.ts`

## 验证

- `GetDiagnostics`：新增代理路由与 `next.config.ts` 无新增错误
- `npm run build:web`：通过
- 重启本地前端稳定服务后复测：
  - `3001/api/.../growth-report/generate` 返回 `201`
  - 不再复现 rewrite 时代的 `socket hang up / ECONNRESET`
