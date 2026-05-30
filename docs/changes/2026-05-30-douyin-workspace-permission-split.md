# 2026-05-30 抖音工作台权限拆分到板块级

## 背景

- 抖音工作台最近连续补齐了原创文案、二创文案和 AI生视频（故事板），但权限模型仍停留在 `douyin.plan` 和 `douyin.video` 两档。
- 这会导致原创文案、二创文案、热点找选题、选题库和素材库虽然在页面上已经是独立板块，但管理员仍无法单独授权。
- 前端工作台和后端接口也因此存在权限错位：
  - 页面目录与状态提示无法按板块独立控制
  - 热点、选题库、原创文案、二创文案接口仍全部复用 `douyin.plan`
  - 视频创建依赖的部分输入选项来自原创文案/二创文案 workspace，拆权限时需要兼顾读取链路

## 本次调整

### 1. 扩展抖音权限枚举与默认模板

- `packages/shared/src/brand-permissions.ts` 新增：
  - `douyin.assets`
  - `douyin.hotTopics`
  - `douyin.topicLibrary`
  - `douyin.original`
  - `douyin.remix`
- 抖音权限树从原来的 2 个板块扩展为：
  - 营销策划方案
  - 素材库
  - 热点找选题
  - 选题库
  - 原创文案
  - 二创文案
  - AI生视频（故事板）
- STAFF / TALENT 默认权限同步补齐上述新权限，继续保持默认可见可编辑。

### 2. 前端权限类型同步

- `apps/web/src/services/brand-growth.ts`
  - `BrandPermissionKey` 同步补齐新增的抖音权限键，保证团队权限设置和工作台前端读取保持一致。

### 3. 工作台目录与交互改为按板块权限控制

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 目录按钮改为按当前账号的板块 `view` 权限裁剪，不再固定展示全部 section。
  - 顶部“当前板块可编辑 / 当前板块只读”改为读取当前 section 的真实 `edit` 权限。
  - 当某个 section 不可见时，当前激活板块会自动切到第一个有权限的 section。
  - `热点找选题 / 选题库 / 原创文案 / 二创文案 / AI生视频` 的前端操作函数，改为分别校验各自板块权限，不再统一沿用 `douyin.plan`。
  - 热点找选题中的“加入选题库”与“查看选题库”按钮，改为分别读取选题库的 `edit/view` 权限。

### 4. 后端接口鉴权改为按板块权限控制

- `apps/server/src/modules/reports/reports.controller.ts`
  - 抖音营销策划方案仍使用 `douyin.plan`
  - 热点找选题生成改用 `douyin.hotTopics`
  - 选题库写入改用 `douyin.topicLibrary`
  - 原创文案增删改改用 `douyin.original`
  - 二创文案增删改改用 `douyin.remix`
- 同时补了 2 个兼容读取策略：
  - `GET /douyin-hot-topic-candidates` 允许 `douyin.hotTopics.view` 或 `douyin.topicLibrary.view`
  - `GET /douyin-original-copy` 允许 `douyin.original.view` 或 `douyin.video.view`
  - `GET /douyin-remix-copy` 允许 `douyin.remix.view` 或 `douyin.video.view`

这样做的原因是：
- 选题库与热点找选题当前共用一个 workspace 读取接口
- 视频创建页当前仍复用原创文案/二创文案 workspace 中的营销日历和产品下拉选项

## 影响范围

- 共享权限模型：
  - `packages/shared/src/brand-permissions.ts`
- 前端：
  - `apps/web/src/services/brand-growth.ts`
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/douyin/hot-topic-candidates-workspace.tsx`
- 后端：
  - `apps/server/src/modules/reports/reports.controller.ts`

## 验证

- `GetDiagnostics`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`
- 手工复查抖音工作台目录是否按权限裁剪、热点页与选题库按钮是否按权限变化

## 后续关注

- 当前视频页为了复用现有输入数据，仍会通过原创文案与二创文案 workspace 读取营销日历和产品选项。
- 如果后续要让 `douyin.video` 完全独立于原创/二创权限，建议补一个专用的“视频创建输入选项”接口，避免继续复用其他板块的 workspace 结果。
