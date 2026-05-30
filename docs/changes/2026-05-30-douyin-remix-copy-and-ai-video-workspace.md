# 2026-05-30 抖音工作台补齐二创文案与 AI生视频（故事板）

## 背景

- 抖音工作台首版只打通了营销策划方案、素材库、热点找选题和选题库，文档与页面能力说明仍停留在较早阶段。
- 后续已连续补齐抖音原创文案、二创文案和 AI生视频（故事板）两条内容生产链路，但根 README、站点地图和部分页面文案没有同步更新。
- 复查中还发现两类明显问题：
  - 抖音工作台在权限接口读取失败时，前端默认按“可编辑”展示，容易误导用户。
  - 抖音原创文案区仍残留“原创笔记 / 添加原创笔记”这类小红书语境文案。

## 本次调整

### 1. 补齐抖音内容生产工作台文档口径

- 根 `README.md` 不再继续描述为“第一版 monorepo 项目骨架初始化”，改为明确当前真实已落地能力：
  - 品牌增长策略工作台
  - 小红书工作台
  - 抖音工作台
  - 技能中心、任务中心、作品中心和 OSS 资源持久化
- `docs/site-map.md` 同步补充抖音工作台当前已包含：
  - 营销策划方案
  - 素材库
  - 热点找选题
  - 选题库
  - 原创文案
  - 二创文案
  - AI生视频（故事板）
- `docs/README.md` 的近期重点变更补入本次记录，并移除一个当前仓库中不存在的旧文档引用，避免继续出现失效链接。

### 2. 同步站点地图里的视频阶段真实逻辑

- `docs/site-map.md` 中原先仍写“小红书视频笔记第 3 阶段先生成短视频提示词，再生成视频”。
- 当前真实逻辑已经改为：
  - 直接使用固定视频生成提示词
  - 结合故事板图片生成短视频
  - 不再额外生成“短视频提示词”
- 本次把站点地图同步到当前真实实现，避免文档与代码分叉。

### 3. 修正抖音工作台前端权限展示

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 当品牌权限接口读取失败时，前端现在改为“默认保留工作台入口，但编辑能力按只读处理”，不再因为 `permissionMap` 为空而直接把所有操作展示成可编辑。
  - 顶部“当前板块可编辑 / 当前板块只读”的状态样式改为跟随当前 section 的真实权限，不再固定绑定 `douyin.plan`。

### 4. 收口抖音原创文案遗留文案

- `apps/web/src/app/(dashboard)/douyin/original-copy-workspace.tsx`
  - 把按钮文案从“添加原创笔记”改为“创建原创文案”
  - 把空状态说明里的“添加原创笔记”同步改为“创建原创文案”
- `apps/web/src/app/(dashboard)/douyin/original-copy-create-modal.tsx`
  - 创建弹窗标题从“添加原创笔记”改为“创建原创文案”

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/douyin/original-copy-workspace.tsx`
  - `apps/web/src/app/(dashboard)/douyin/original-copy-create-modal.tsx`
- 文档：
  - `README.md`
  - `docs/site-map.md`
  - `docs/README.md`
  - 本次新增变更记录

## 验证

- `GetDiagnostics`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`
- 复查抖音工作台顶部权限提示、原创文案按钮文案和站点地图对应条目

## 后续关注

- 当前抖音板块在权限模型上仍只有 `douyin.plan` 与 `douyin.video` 两档，原创文案、二创文案、热点找选题、选题库仍未拆成更细权限键。
- 如果后续需要让团队成员按板块独立授权，建议继续补：
  - `douyin.original`
  - `douyin.remix`
  - `douyin.hotTopics`
  - `douyin.topicLibrary`
  - `douyin.assets`
- 文档更新后，后续新增工作台子板块时仍应优先同步 `docs/site-map.md`，避免继续出现“功能已上线但地图未更新”的情况。
