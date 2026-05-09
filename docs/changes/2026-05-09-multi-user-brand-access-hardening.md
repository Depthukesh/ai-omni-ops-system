# 2026-05-09 多用户品牌访问收口

## 1. 变更背景

- 用户注册了新账号后，个人中心已显示新账号信息，但 `brand-growth`、`xiaohongshu` 等工作区仍能看到旧账号或演示品牌的数据。
- 排查后确认问题不在注册登录本身，而在品牌工作区的“当前品牌解析”和“后端品牌访问校验”两层都没有完全收口。
- 如果不同时修前后端，新账号即使登录成功，也可能继续读到 `br_demo_001` 或其他不属于自己的品牌数据。

## 2. 本次目标

- 让前端品牌工作区默认优先读取当前登录品牌，而不是落回演示品牌。
- 让后端所有按 `brandId` 读取品牌数据的主链接口，统一校验当前登录用户是否属于该品牌。
- 把“新账号仍看到旧账号数据”的问题收口为真正的多用户隔离，而不是仅靠页面文案掩盖。

## 3. 本次修改

### 3.1 前端

- 在 `apps/web/src/services/auth-session.ts` 新增 `getStoredCurrentBrandId()`，统一解析当前登录品牌。
- 在 `apps/web/src/services/brand-growth.ts`、`reports.ts`、`collectors.ts`、`daily-hotspots.ts` 中，把品牌默认值从硬编码 `DEMO_BRAND_ID` 收口为“当前登录品牌优先，演示品牌仅保留兜底”。
- 在 `apps/web/src/services/xiaohongshu.ts`、`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`、`apps/web/src/app/(dashboard)/xiaohongshu/page.tsx` 中，把首屏聚合读取、作品生成、营销方案、素材代理等调用改为优先使用当前品牌。
- 在 `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`、`use-work-mutation-actions.ts`、`work-media-helpers.ts` 中同步收口品牌参数来源，避免创建作品时仍误发到 demo 品牌。

### 3.2 后端

- 在 `apps/server/src/modules/auth/auth.service.ts` 新增 `assertBrandAccess()`，统一校验当前用户是否属于目标品牌。
- 在 `apps/server/src/modules/brands/brands.controller.ts` 为品牌档案、产品、问卷、飞书绑定、文件代理等按 `brandId` 访问的接口补品牌访问校验。
- 在 `apps/server/src/modules/reports/reports.controller.ts` 为品牌增长报告、可视化报告、全年营销规划、小红书策划方案、营销日历等接口补品牌访问校验。
- 在 `apps/server/src/modules/collectors/collectors.controller.ts` 与 `daily-hotspots.controller.ts` 为小红书收集、飞书同步、媒体代理、每日热点等接口补品牌访问校验。
- 在 `apps/server/src/modules/reports/reports.module.ts` 与 `apps/server/src/modules/collectors/collectors.module.ts` 补 `AuthModule` 依赖接线，保证 controller 能注入 `AuthService`。

## 4. 修改意图

- 前端“当前品牌优先”是为了避免用户刚注册或切换账号后，业务页仍悄悄打到演示品牌。
- 后端访问校验是为了防止只靠前端修复造成“页面默认不串号，但手动传 brandId 仍可越权读取”的假闭环。
- 两层一起做，才能真正把品牌数据隔离拉回到“当前登录用户可访问的品牌集合”。

## 5. 影响范围

- 页面：
  - `/brand-growth`
  - `/xiaohongshu`
- 前端服务：
  - `auth-session.ts`
  - `brand-growth.ts`
  - `reports.ts`
  - `collectors.ts`
  - `daily-hotspots.ts`
  - `xiaohongshu.ts`
- 后端接口：
  - `/api/brands/:id/*`
  - `/api/reports/brands/:brandId/*`
  - `/api/collectors/xiaohongshu/brands/:brandId/*`
  - `/api/collectors/daily-hotspots/brands/:brandId/*`

## 6. 验证结果

- `GetDiagnostics` 检查本轮核心前后端文件无报错。
- `npm run build:server` 通过。
- `npm run build:web` 通过。
- 运行态验证：
  - 重启 `3011` 后端稳定实例。
  - 重启 `3001` 前端稳定实例。
  - 注册新的测试账号并成功登录。
  - 使用新账号访问自己的品牌档案接口成功。
  - 使用同一登录态访问 `br_demo_001` 的品牌档案接口时，已被后端拒绝。

## 7. 当前边界

- 这次优先收口了 `brand-growth`、`xiaohongshu` 及其核心依赖接口。
- 项目里仍有部分历史演示数据和 fallback 逻辑存在于非主链路或后台页，后续还需要继续做一次全仓库清理。
- 当前只保证“品牌级读写不再默认串到 demo 品牌”，品牌内更细粒度的角色动作约束仍可继续增强。

## 8. 后续建议

- 继续全仓库扫掉剩余 `DEMO_BRAND_ID` 的用户态使用点。
- 将品牌访问校验继续下沉到更统一的 guard / decorator，而不是只停留在 controller 中显式调用。
- 为多用户品牌访问补自动化回归用例，避免后续新页面又回退到演示品牌模式。
