# 团队三角色统一与权限矩阵首版

## 1. 变更背景

- 个人中心团队协作仍沿用 `OWNER / ADMIN / EDITOR / OPERATOR / VIEWER` 旧角色口径，和当前新的品牌协作规则不一致。
- 前端多个页面继续把品牌增长策略和第三方接口配置写死成 `Owner` 专属入口，无法承接“管理员全权限、员工/达人按模板配置”的新需求。
- 用户明确要求把团队角色统一为 `管理员 / 员工 / 达人`，并在团队页的“待处理邀请”和“当前品牌成员”之间增加按板块勾选的权限矩阵。

## 2. 变更目标

- 将团队协作对外角色统一收口为 `ADMIN / STAFF / TALENT` 三类。
- 为品牌增加员工与达人的权限模板，支持按项目配置 `可见 / 编辑`。
- 让团队页、品牌增长策略、第三方接口配置和关键后端接口开始吃同一份权限定义。

## 3. 修改内容

### 3.1 前端

- `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
  - 团队页角色展示与可分配角色统一为管理员、员工、达人。
  - 在“待处理邀请”和“当前品牌成员”之间新增团队权限设置区。
  - 权限设置按目录树渲染，员工与达人分别支持勾选 `可见 / 编辑`。
  - 品牌主账号转移区改为只对真实品牌归属 Owner 展示，不再依赖旧角色字符串。
- `apps/web/src/services/brand-growth.ts`
  - 新增团队权限矩阵相关类型与 `getBrandPermissionSettings / updateBrandPermissionSettings` 服务。
  - 品牌成员、邀请和可分配角色的前端契约改为三角色。
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - 页面初始化先读取当前品牌权限模板。
  - 若当前账号没有品牌增长策略任一板块的查看权限，则前端直接拦截进入。
  - 当前页面的保存、同步、报告生成等操作开始按对应 `edit` 权限禁用或拦截。
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
  - 文案改为“按当前板块编辑权限控制”，不再写死只有 Owner 可维护私钥。
  - 页面头部角色状态胶囊统一改为走三角色中文映射，不再直接回显 `ADMIN` 等原始值。

### 3.2 后端

- `packages/shared/src/brand-permissions.ts`
  - 新增三角色定义、权限键、权限树、默认权限模板、角色归一化和权限判断函数。
- `apps/server/src/modules/auth/auth.service.ts`
  - 品牌访问结果开始返回归一化三角色、品牌权限模板和当前用户权限图。
  - 新增 `assertBrandAdminAccess()` 与 `assertBrandPermission()`。
- `apps/server/src/modules/brands/brands.service.ts`
  - 团队成员、邀请、审计等对外角色统一输出为 `ADMIN / STAFF / TALENT`。
  - 新增品牌权限模板读写能力。
  - 团队管理从旧 `Owner` 主控扩展为管理员主控；品牌归属 Owner 语义仅保留给主账号转移等特殊场景。
- `apps/server/src/modules/brands/brands.controller.ts`
  - 新增 `/brands/:id/member-permissions` 读写接口。
  - 团队成员、邀请、审计接口改为管理员可操作。
  - 品牌资料、产品、调研、资料投喂、飞书绑定等接口开始按权限键校验编辑权限。
- `apps/server/src/modules/reports/reports.controller.ts`
  - 品牌增长报告、可视化报告、半年营销规划的读取/生成/更新接口改为按权限键控制。
- `apps/server/src/modules/third-party-platforms/third-party-platforms.controller.ts`
  - 第三方接口配置读取与私钥保存改为按 `personalCenter.thirdPartyPlatforms` 权限控制。

### 3.3 数据与配置

- `prisma/schema.prisma`
  - `Brand` 新增 `memberPermissionsJson`，用于保存品牌级协作权限模板。
- Prisma Client 已重新生成，保证后端编译能识别新字段。
- 当前数据库里的旧成员角色未强制迁移枚举，而是在运行时统一归一化到三角色，避免一次性数据改表带来的额外风险。

## 4. 修改意图

- 保留数据库中的 `OWNER` 语义，只把它收口为“品牌归属主账号”，避免主账号转移、归属判断和历史数据被硬迁移打断。
- 将旧 `EDITOR / OPERATOR / VIEWER` 在运行时归并到 `STAFF / TALENT`，可以在不阻塞现有数据的前提下先完成前后端角色统一。
- 用共享权限树定义驱动团队页配置和接口鉴权，减少后续每个页面各写一套角色判断的分叉成本。

## 5. 影响范围

- 影响页面
  - `/personal-center/team`
  - `/brand-growth`
  - `/personal-center/third-party-platforms`
- 影响接口
  - `/api/brands/:id/members`
  - `/api/brands/:id/invites`
  - `/api/brands/:id/role-audit-logs`
  - `/api/brands/:id/member-permissions`
  - `/api/brands/:id/background`
  - `/api/brands/:id/products*`
  - `/api/brands/:id/survey`
  - `/api/brands/:id/industry-feeds`
  - `/api/brands/:id/business-assets`
  - `/api/brands/:id/feishu-binding`
  - `/api/reports/brands/:brandId/*`
  - `/api/third-party-platforms*`
- 影响模块
  - `AuthModule`
  - `BrandsModule`
  - `ReportsModule`
  - `ThirdPartyPlatformsModule`
  - `packages/shared`
- 是否影响已有数据
  - 影响 `Brand.memberPermissionsJson` 新字段。
  - 旧成员角色数据不做破坏性迁移，继续兼容读取并归一化显示。

## 6. 验证方式

- 手工验证
  - 团队页可展示三角色与权限矩阵区域。
  - 权限矩阵位置位于“待处理邀请”和“当前品牌成员”之间。
  - 本地 `3001/3011` 联调下，团队页已实际勾选权限并点击“保存权限设置”，页面成功提示“员工和达人的权限模板已保存。”
  - 本地 `/brand-growth` 已确认管理员可进入品牌增长策略，`刷新数据 / 保存页面` 按钮可用，相关工作区接口返回 `200`。
  - 本地 `/personal-center/third-party-platforms` 已确认管理员可查看平台基线并可编辑私有 API Key；角色状态展示已统一为“管理员”。
- 接口验证
  - 新增团队权限模板接口已接入前端服务层。
  - 品牌增长报告、第三方接口配置和团队管理接口已切到新权限判断。
- 编译/诊断验证
  - `GetDiagnostics` 已检查本次核心改动文件，无新增诊断错误。
  - `npm run prisma:generate` 通过。
  - `npm run build:server` 通过。
  - `npm run build:web` 通过。
  - `npm run dev:server:stable` 已按真实构建入口成功拉起 `3011`，健康检查返回 `200`。

## 7. 风险与后续

- 当前已把品牌增长策略和第三方接口配置接入权限闸门，但其他前台板块仍需继续按同一权限树扩散。
- 品牌资料读取接口仍返回整份资料包；若后续需要做到后端级别的细粒度“按项脱敏返回”，需要继续拆分读取接口或对返回内容做权限过滤。
- 若后续决定彻底删除数据库中的旧角色枚举，还需要补充数据迁移脚本和历史数据回填方案。
- 本地稳定启动脚本已兼容 `dist/apps/server/src/main.js` 与 `dist/main.js` 两种编译入口；`apps/server` 的 `start` 也已同步到当前真实产物路径，后续本地联调不再需要手动指定入口。

## 8. 相关文件

- `packages/shared/src/brand-permissions.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/brands/brands.service.ts`
- `apps/server/src/modules/brands/brands.controller.ts`
- `apps/server/src/modules/reports/reports.controller.ts`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.controller.ts`
- `apps/web/src/services/brand-growth.ts`
- `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
- `prisma/schema.prisma`
