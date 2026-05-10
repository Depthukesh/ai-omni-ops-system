# 2026-05-10 reports、品牌素材、用户头像统一接入 OSS

## 本次变更

- `apps/server/src/modules/reports/reports.service.ts` 把品牌增长报告、可视化报告、全年营销规划、小红书营销策划方案 4 类 HTML 产物改为真实写入 OSS
- `apps/server/src/modules/reports/reports.controller.ts` 新增 `/api/reports/brands/:brandId/assets/:fileName`，统一代理报告 HTML 产物读取
- `apps/server/src/modules/brands/brands.service.ts` 把品牌产品图、品牌资料附件从本地目录切到 OSS，并统一生成站内资源 URL
- `apps/server/src/modules/brands/brands.controller.ts` 保留 `/api/brands/:id/product-images/:fileName`、`/api/brands/:id/asset-files/:fileName` 作为稳定读取入口
- `apps/server/src/modules/auth/auth.service.ts` 新增头像上传与读取逻辑，头像对象统一存到 `users/<userId>/avatars/<fileName>`
- `apps/server/src/modules/auth/auth.controller.ts` 新增 `POST /api/auth/profile/avatar` 与 `GET /api/auth/users/:userId/avatar/:fileName`
- `apps/web/src/services/auth.ts` 与 `apps/web/src/app/(dashboard)/personal-center/security/page.tsx` 补齐前端头像上传入口

## 修改意图

- 在 `works` 纯 OSS 收口后，继续把用户可见、需要长期访问的资源统一收成同一套对象存储规则
- 避免 `reports` 只保存占位 `oss.example.com` 链接但实际没有对象
- 避免品牌资料上传素材继续依赖单机本地目录，导致多实例部署时资源丢失或不一致
- 让用户头像从“手填 URL”升级为“真实上传 + 站内稳定访问”

## 存储约定

- 报告 HTML：`reports/<brandId>/<fileName>`
- 品牌产品图：`brands/<brandId>/product-images/<fileName>`
- 品牌资料附件：`brands/<brandId>/asset-files/<fileName>`
- 用户头像：`users/<userId>/avatars/<fileName>`
- 对外访问继续优先走站内接口，不直接暴露 OSS 原始路径

## 影响范围

- 后端：
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/server/src/modules/reports/reports.controller.ts`
  - `apps/server/src/modules/brands/brands.service.ts`
  - `apps/server/src/modules/brands/brands.controller.ts`
  - `apps/server/src/modules/auth/auth.service.ts`
  - `apps/server/src/modules/auth/auth.controller.ts`
- 前端：
  - `apps/web/src/services/auth.ts`
  - `apps/web/src/app/(dashboard)/personal-center/security/page.tsx`
- 文档：
  - `docs/generated-content-storage-standards.md`
  - `docs/database-archive.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/engineering-standards.md`
  - `docs/README.md`

## 验证

- `GetDiagnostics` 检查本轮相关 TS/TSX 文件，结果为空
- `npm --workspace apps/server run build`
- `npm --workspace apps/server run lint`
- `npm --workspace apps/web run build`

## 当前边界

- 本轮已收口 `works + reports + 品牌产品图/资料附件 + 用户头像`
- `apps/server/src/common/mock-data.ts` 中仍保留少量 `oss.example.com` 演示占位链接，属于种子/演示层，尚未在本轮统一替换
- 尚未提交 Git，也未推 GitHub 和触发阿里云自动部署
