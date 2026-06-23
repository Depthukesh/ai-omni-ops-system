# 2026-06-23 后台提示词中心新增与删除闭环

## 背景

- 用户要求后台 `运营提示词中心` 和 `生图提示词中心` 都具备：
  - 手动新增模板
  - 删除模板
  - 生图模板删除时同步删除 OSS 中的模板预览图
- 现有后台管理页只支持编辑保存，不支持新增和删除。
- 现有文件系统 bootstrap 会周期性把源目录模板重新同步进库，如果只做物理删除，会出现“删掉后又回流”的问题。

## 本次实现

### 1. 后端服务层补齐新增 / 删除接口

- `apps/server/src/modules/works/works.service.ts`
  - 新增 `createImagePromptTemplateForAdmin(...)`
  - 新增 `deleteImagePromptTemplateForAdmin(...)`
  - 延续已落地的 `createOperationsPromptTemplateForAdmin(...)`
  - 延续已落地的 `deleteOperationsPromptTemplateForAdmin(...)`
  - 两类模板都支持后台手动新增草稿记录
  - 生图模板删除时会调用 `OssStorageService.deleteObject(...)` 清理 `previewImageStorageKey`

### 2. 删除态防回灌

- `apps/server/src/modules/works/works.service.ts`
  - 复用 `DELETED` 作为提示词模板删除态
  - `listImagePromptTemplateStoreItems()` 过滤 `DELETED`
  - `findImagePromptTemplateStoreItem()` 不再返回 `DELETED`
  - `upsertImagePromptTemplate(...)` 发现同 `sourceFilePath` 的模板已被标记为 `DELETED` 时，停止重新导入
  - mock fallback bootstrap 从“按 id 对齐”改为“按 sourceFilePath 对齐”，并保留手动新增的额外记录
- 这样删除后的模板不会在下一轮源目录同步时重新出现。

### 3. 生图模板预览图清理策略

- 删除生图模板时：
  - 先读取现有 `previewImageStorageKey`
  - 调用 OSS 删除对象
  - 再把数据库/内存记录标记为 `DELETED`
  - 同时清空 `previewImageStorageKey`、`previewImageFileName`、`previewImageContentType`
- 返回结果会附带 `deletedPreviewStorageKey`，方便前端给出删除反馈。

### 4. 管理后台 API 与前端 service 补齐

- `apps/web/src/services/admin.ts`
  - 新增 `createOperationsPromptTemplate(...)`
  - 新增 `deleteOperationsPromptTemplate(...)`
  - 新增 `createImagePromptTemplate(...)`
  - 新增 `deleteImagePromptTemplate(...)`
  - 补齐对应 payload / result 类型

### 5. 后台管理页交互接入

- `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - 运营提示词侧栏增加 `新增运营提示词`
  - 生图提示词侧栏增加 `新增生图提示词`
  - 两个列表中的每个模板项下方都增加单独 `删除` 按钮
  - 右侧详情编辑区也增加删除按钮，便于在编辑时直接移除
  - 新建成功后自动选中刚创建的模板
  - 删除成功后同步清理本地 drafts 与选中态

## 当前边界

- 运营提示词模板当前没有独立 OSS 资源字段，因此删除时只删除模板记录本身，不涉及 OSS 联删。
- 生图模板支持通过后台手动新增文本模板；若需要完善“新增后再单独上传/替换预览图”的后台能力，可在后续把 `updateImagePromptTemplateForAdmin(...)` 继续扩展为支持上传文件。

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - 结果：已通过
- `npm --workspace apps/server run build`
  - 结果：已通过
- `npm --workspace apps/web run build`
  - 结果：已通过
  - 环境 warning 仍存在：
    - 本机 `@next/swc-win32-x64-msvc` DLL 初始化 warning
    - 仓库上级目录与当前目录同时存在 `package-lock.json` 的 workspace root warning

## 结论

- 后台 `运营提示词中心` 与 `生图提示词中心` 现在都具备了新增、删除、保存的完整管理闭环。
- 生图提示词删除时会同步删除 OSS 中的模板预览图，并通过删除态机制避免模板被源目录同步重新带回。
