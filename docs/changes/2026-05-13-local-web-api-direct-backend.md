# 2026-05-13 本地前端 API 直连后端修复

## 背景

品牌增长报告在本地页面点击“生成报告”时持续显示 `Internal Server Error`，但直连后端接口：

- `POST http://127.0.0.1:3011/api/reports/brands/:brandId/growth-report/generate`

实际返回成功。

继续排查确认，真正报错的不是 `ReportsService`，而是本地前端页面默认使用：

- `http://localhost:3001/api/...`

再通过 Next.js rewrite 代理到：

- `http://127.0.0.1:3011/api/...`

这条代理链路在报告生成这类长响应 POST 上会出现：

- `socket hang up`
- `ECONNRESET`

从而让浏览器看到 `500 Internal Server Error`，即使后端真实接口本身已成功。

## 本次处理

- 调整 `apps/web/src/services/http.ts`
- 当浏览器运行在本地开发域名：
  - `localhost`
  - `127.0.0.1`
- 且未显式设置 `NEXT_PUBLIC_API_BASE_URL` 时，前端默认直接走：
  - `http://127.0.0.1:3011/api`
- 不再让本地浏览器流量绕到 `3001/api -> 3011/api` 的 Next rewrite 代理

## 规则

- 生产环境仍优先同域 `/api`
- 本地开发仅在 `localhost / 127.0.0.1` 下直连 `3011`
- 若后续需要自定义本地代理或联调地址，仍可通过 `NEXT_PUBLIC_API_BASE_URL` 覆盖

## 验证

- `GetDiagnostics`：`apps/web/src/services/http.ts` 无新增错误
- `npm run build:web`：通过
- 重启本地前端稳定服务：
  - `npm run dev:web:stop`
  - `npm run dev:web:stable`
- 已确认：
  - 直连 `3011/api/.../growth-report/generate` 成功
  - 旧的 `3001/api/...` rewrite 链路会报 `socket hang up / ECONNRESET`

## 影响范围

- `apps/web/src/services/http.ts`
- 本地开发环境下所有走统一 `request/jsonRequest/requestBlobByUrl` 的浏览器端 API 请求
