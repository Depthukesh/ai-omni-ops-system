# 2026-05-10 生产环境 API 基址回落修复

## 背景

- 线上 `https://17ai.site/brand-growth` 页面仍把浏览器请求发往 `http://127.0.0.1:3011/api/...`
- 这会让用户浏览器去访问其本机 `127.0.0.1:3011`，从而出现“后端暂不可用，请检查 3011 服务”的误提示

## 本次变更

- `apps/web/src/services/http.ts`
  - 当未配置 `NEXT_PUBLIC_API_BASE_URL` 时：
  - 浏览器环境默认回落到当前站点同域 `window.location.origin + "/api"`
  - 仅在服务端本地兜底时才回落到 `http://127.0.0.1:3011/api`
- `apps/web/src/app/publish/mobile/[token]/page.tsx`
  - 服务端渲染接力页时，优先读取 `INTERNAL_API_BASE_URL`
  - 若未配置，再按请求头动态推导当前访问域名下的 `/api`
- `apps/web/src/app/publish/mobile/[token]/mobile-handoff-client.tsx`
  - 浏览器端不再把本地地址强行改写为 `hostname:3011`
  - 改为在生产访问下默认走当前域名 `/api`

## 验证

- 浏览器网络面板确认问题根因是线上页面请求 `http://127.0.0.1:3011/api/...`
- `http://127.0.0.1:3011/api/health` 本地可正常返回 `ok`
- `https://17ai.site/api/health` 线上也可正常返回 `ok`
- `npm --workspace apps/web run build` 通过

## 影响

- 线上品牌增长策略、个人中心及依赖 `API_BASE_URL` 的浏览器端接口请求将改为走站点同域代理
- 本地开发在未配置前端 API 环境变量时仍可继续使用 `127.0.0.1:3011`
