# 2026-06-07 SkillPackage 版本管理第一批落地

## 背景

- 统一技能中心列表与详情 first pass 已经完成
- 但版本能力此前仍停留在：
  - 详情接口里的占位版本摘要
  - 没有真实版本记录表
  - 不能创建版本
  - 不能激活版本

## 本次改动

### 1. 新增 `SkillPackageVersion` 表

- 修改：
  - `prisma/schema.prisma`
- 新增：
  - `prisma/migrations/20260607_skill_package_versions_first_pass/migration.sql`

当前字段覆盖：

- `id`
- `packageId`
- `packageKey`
- `versionNumber`
- `changeLog`
- `sourceMode`
- `sourceVersionId`
- `isActive`
- `snapshotJson`
- `createdBy`
- `createdAt`
- `updatedAt`

### 2. 后端补版本管理接口 first pass

- 修改：
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`

新增接口：

- `GET /admin/skill-packages/:id/versions`
- `POST /admin/skill-packages/:id/versions`
- `POST /admin/skill-packages/:id/activate-version`

当前规则：

- 同一能力包下 `versionNumber` 唯一
- `CURRENT_STATE` 支持直接从当前已保存状态生成版本
- `CLONE_FROM_VERSION` 支持从已有历史版本克隆
- 激活版本时会：
  - 自动取消旧激活版本
  - 同步回写 `SkillPackage.currentVersionId`

### 3. 详情接口版本摘要改为真实版本数据

- `GET /admin/skill-packages/:id` 中的 `versions`
  - 不再只返回占位版本
  - 当前优先读取 `SkillPackageVersion`
  - 表未落地时继续回退到 seed/mock

### 4. 后台统一技能中心接入版本操作

- 修改：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`

当前版本摘要区已支持：

- 查看版本列表
- 创建版本
- 激活指定版本

## 当前边界

- 本轮仍是 version first pass：
  - `GET /version-diff` 还未实现
  - 版本快照仍是第一批摘要结构，不是完整对象级别 diff 快照
  - 版本操作目前先放在统一技能中心摘要详情区域，不单独做完整版本页签

## 影响范围

- 数据库：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260607_skill_package_versions_first_pass/migration.sql`
- 后端：
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/prisma/prisma.service.ts`
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-packages.controller.ts`
- 前端：
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/skill-package-overview-panel.tsx`
- 文档：
  - `docs/database-archive.md`
  - 本文件

## 验证

- `npm run prisma:generate`
- `GetDiagnostics`
- `npm --workspace apps/server exec tsc --noEmit`
- `npm --workspace apps/web exec tsc --noEmit`
