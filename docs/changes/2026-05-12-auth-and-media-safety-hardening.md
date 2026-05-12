# 2026-05-12 认证与作品资产安全收口

## 背景

- 个人中心的 `orders`、`tasks`、`media` 接口仍允许匿名请求落到默认用户，存在跨账号数据泄漏风险。
- 作品中心直接展示 `storageKey` 与原始 `sourceUrl`，会把内部存储路径和错误的 `localhost` 资源地址暴露给前端。
- 个人中心部分页面在品牌名为空时直接显示“未绑定品牌”，会误导已登录用户。

## 本次修复

- 收紧 `orders`、`tasks`、`media` 的 controller 鉴权入口，移除默认用户兜底。
- 收紧 `orders`、`tasks`、`media` 的 service 行为，无登录态时直接返回未授权，不再自动借用首个用户。
- 将作品中心返回模型改为安全字段：
  - 返回 `assetUrl` 作为可打开入口。
  - 返回 `scope` 标记作品归属。
  - 不再向前端页面暴露 `storageKey` 与原始 `sourceUrl`。
- 当媒体记录对应 `works/{brandId}/{fileName}` 内部资产时，统一改写为站内 `/api/works/brands/:brandId/assets/:fileName` 访问入口。
- 修正 `AppConfigService.getServerBaseUrl()` 的公网回退策略，生产环境缺少显式配置时不再回退到 `localhost`。
- 调整个人中心作品页与概览页展示，去掉存储路径/源地址文案和搜索项，改为展示站内安全入口状态。
- 调整个人中心布局与团队页的品牌文案兜底，避免品牌已绑定但名称为空时误报“未绑定品牌”。

## 验证

- `npm run lint:server`
- `npx tsc --noEmit -p apps/web/tsconfig.json` 等价验证已在 `apps/web` 目录执行
- 针对本次修改文件执行 VS Code diagnostics，未发现新增诊断错误

## 风险与后续

- `works` 生成资产下载接口当前仍是可直链访问模型；本次先通过不再暴露内部路径和统一站内入口降低风险，后续可继续补签名访问或受保护代理。
- 当前仓库存在其他未提交改动；本次仅在最小范围内触达认证、媒体返回模型和个人中心作品展示相关文件。
