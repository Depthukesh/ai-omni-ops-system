# 2026-06-24 小红书评论数据面板与生图后台上传补齐

## 背景

- 用户要求在 `收集数据 -> 小红书` 的 `搜索笔记` 右侧新增独立板块 `评论数据`。
- 新板块需要与抖音评论数据面板保持同级排版与交互，支持首层评论翻页、加载更多。
- 小红书额外需要支持二级评论：
  - 一级评论行内增加 `查看二级评论`
  - 点击后采集该评论下的二级评论
  - 二级评论列表展示在一级评论下方
  - 一级评论支持展开 / 收起
- 同时，之前后台 `生图提示词中心` 手动新增后仍缺少预览图上传能力，需要和本次一起补齐并交付。

## 本次实现

### 1. 小红书评论数据接口链路补齐

- `apps/server/src/modules/collectors/collectors.controller.ts`
  - 新增 `POST /collectors/xiaohongshu/brands/:brandId/comment-data/sync`
  - 新增 `POST /collectors/xiaohongshu/brands/:brandId/comment-data/sub-comments`
- `apps/server/src/modules/collectors/collectors.service.ts`
  - 新增小红书一级评论采集与存储逻辑
  - 新增小红书评论分页状态提取逻辑
  - 新增二级评论按一级评论懒加载逻辑
  - 评论数据写入小红书 collection workspace，避免与抖音结构混淆
- `apps/web/src/services/collectors.ts`
  - 新增 `XhsCommentRecord`
  - 新增 `XhsCommentPaginationState`
  - 新增 `XhsSubCommentRecord`
  - 新增 `XhsSubCommentPaginationState`
  - 新增 `syncXiaohongshuCommentData(...)`
  - 新增 `getXiaohongshuCommentReplies(...)`

### 2. 小红书 collection 页面新增评论数据卡片

- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - 新增 `commentSourceUrls` 表单字段
  - 新增一级评论分页状态与加载更多状态
  - 新增二级评论展开态、加载态、分页态、本地缓存态
  - 新增 `handleSyncXhsCommentData()`
  - 新增 `handleLoadMoreXhsComments()`
  - 新增 `handleToggleXhsCommentReplies()`
  - 新增 `handleLoadXhsCommentReplies()`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - 小红书卡片导航增加 `评论数据`
  - 新增与抖音一致的提交面板与结果头部统计
  - 新增 `XhsCommentTable`
  - 一级评论支持查看 / 收起二级评论
  - 二级评论支持继续加载更多
  - 二级评论列表内展示用户、时间、评论正文、评论 ID、用户 ID、点赞数

## 3. 生图提示词后台上传能力补齐

- `apps/web/src/services/admin.ts`
  - `updateImagePromptTemplate(...)` 补充 `previewImage` 上传参数
- `apps/server/src/modules/works/works.service.ts`
  - `UpdateImagePromptTemplatePayload` 补充 `previewImage`
  - `updateImagePromptTemplateForAdmin(...)` 现在会：
    - 调用 `ensureImagePromptTemplatePreviewStored(...)`
    - 把新预览图覆盖写入 OSS
    - 更新 `previewImageStorageKey`
    - 更新 `previewImageFileName`
    - 更新 `previewImageContentType`
- `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - 生图提示词编辑 draft 增加待上传预览图字段
  - 详情区新增文件上传控件
  - 选择文件后立即显示本地预览
  - 保存时把 `previewImage` 一并提交
  - 支持清除待上传图片，恢复使用当前 OSS 版本

## 交互结果

- 小红书评论数据现在和抖音评论数据一样支持批量输入链接并采集。
- 一级评论支持继续翻页 / 加载更多。
- 存在回复数的一级评论可以单独拉取二级评论。
- 已加载过二级评论的一级评论支持点击行或按钮收起 / 展开。
- 生图提示词后台现在可以直接替换模板预览图，并在保存后同步写入 OSS。

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/web/src/services/admin.ts`
  - 结果：已通过
- `pnpm build:server`
  - 结果：已通过
- `pnpm build:web`
  - 结果：已通过
  - 环境 warning 保留：
    - `@next/swc-win32-x64-msvc` DLL 初始化 warning
    - 上级目录与当前目录同时存在 `package-lock.json` 的 workspace root warning

## 结论

- 小红书收集数据页已具备独立评论数据采集能力，并支持二级评论按需抓取与展开查看。
- 生图提示词后台已补齐预览图上传替换能力，能把新图片正确保存到 OSS 和数据库记录中。
