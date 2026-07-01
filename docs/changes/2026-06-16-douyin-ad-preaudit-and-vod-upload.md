# 2026-06-16 抖音广告预审与 VOD 上传闭环

## 1. 变更背景

- 抖音工作台已经有数字人、AI 生视频和作品中心能力，但广告预审还停留在手填 `Vid` 的模式。
- 运营实际需要从站内作品直接进入广告预审，而不是先跳出系统手动上传到 VOD、再复制 `Vid` 回来。
- 广告主账户 ID 和 VOD `SpaceName` 也不适合每次手填，需要按品牌保存默认值，降低重复操作成本。

## 2. 变更目标

- 在抖音工作台新增可闭环的广告预审板块。
- 支持从站内作品区选择视频，提交到火山引擎 VOD，并把返回的 `Vid / FileId` 自动回填到预审表单。
- 支持品牌级保存默认广告主账户 ID、默认 `BusinessType` 和 `VOD SpaceName`。
- 修复广告预审首次进入时未加载默认配置和可选视频列表的问题。

## 3. 修改内容

### 3.1 前端

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 新增广告预审默认配置、可选视频列表、VOD 上传和状态刷新接口接入。
  - 首次进入抖音工作台时，初始化加载广告预审记录、默认配置和可选视频列表，避免页面一直停在空状态。
- `apps/web/src/app/(dashboard)/douyin/ad-preaudit-workspace.tsx`
  - 新增“默认配置”“作品区上传到 VOD”“广告预审提交”三段式工作区。
  - 当已保存默认广告主账户 ID 时，提交区允许留空并直接复用默认值。
  - 上传成功后自动带入 `Vid / FileId`，减少手工复制。
- `apps/web/src/services/works.ts`
  - 新增广告预审配置、可选视频、VOD 上传和上传状态刷新等前端服务方法。

### 3.2 后端

- `apps/server/src/modules/works/works.controller.ts`
  - 新增广告预审配置读写、可选视频读取、VOD 上传提交和上传状态刷新接口。
- `apps/server/src/modules/works/works.service.ts`
  - 新增品牌级广告预审配置的运行时建表和读写逻辑。
  - 接入火山引擎 VOD `UploadMediaByUrl` 与 `QueryUploadTaskInfo`。
  - 把上传结果写回 `MediaAsset.metadataJson.vodUpload`，包括 `jobId`、`status`、`vid`、`fileId`、`storeUri` 等字段。
  - 广告预审可选视频不再只认 `MediaType.VIDEO`，同时识别带 `videoUrl` 的 HTML 作品，例如数字人、口型驱动和部分视频工作流的作品壳。
  - 广告预审提交时，如果当前请求未显式传广告主账户 ID 或 `BusinessType`，会自动兜底品牌默认配置。

### 3.3 数据与配置

- 品牌级广告预审默认配置字段：
  - `defaultAdvertiserId`
  - `defaultBusinessType`
  - `vodSpaceName`
- VOD 上传结果写入 `MediaAsset.metadataJson.vodUpload`，不新增第二套视频资产表。
- 火山引擎 VOD 凭证继续复用品牌级第三方平台配置，格式保持 `accessKeyId::secretAccessKey`，必要时可追加 `::region`。

## 4. 修改意图

- 采用 `UploadMediaByUrl + QueryUploadTaskInfo`，是因为站内很多作品已经具备可访问 URL，可以直接复用现有 OSS / 站内资源能力，不需要额外接入新的上传 SDK。
- 广告主账户 ID 和 `SpaceName` 采用品牌级默认配置，是为了减少高频投放场景下的重复输入，并把“品牌投放默认值”和“本次临时覆盖”区分开。
- 可选视频列表兼容 HTML 作品壳，是因为当前数字人、口型驱动和部分视频作品中心本身以 HTML 作品承载详情，真实视频地址保存在元数据里。

## 5. 影响范围

- 影响页面：
  - `/douyin`
- 影响板块：
  - 抖音工作台 `广告预审`
- 影响接口：
  - `GET /works/brands/:brandId/douyin/ad-preaudit`
  - `GET /works/brands/:brandId/douyin/ad-preaudit/config`
  - `PATCH /works/brands/:brandId/douyin/ad-preaudit/config`
  - `GET /works/brands/:brandId/douyin/ad-preaudit/media`
  - `POST /works/brands/:brandId/douyin/ad-preaudit/upload`
  - `POST /works/brands/:brandId/douyin/ad-preaudit/media/:mediaAssetId/upload/refresh`
  - `POST /works/brands/:brandId/douyin/ad-preaudit/submit`
- 影响数据：
  - 新增广告预审默认配置运行时表
  - 更新 `MediaAsset.metadataJson`

## 6. 验证方式

- 手工验证：
  - 打开抖音工作台广告预审板块，确认默认配置、可选视频列表和广告预审记录在首次进入时即可显示真实数据。
  - 选择站内视频或数字人作品，发起上传到 VOD，刷新状态后确认 `Vid / FileId` 能自动回填。
  - 在已保存默认广告主账户 ID 的前提下，提交区留空广告主账户 ID，确认仍可正常发起预审。
- 编译验证：
  - `npm run build:server`
  - `npm run build:web`

## 7. 风险与后续

- 当前上传状态仍以手动刷新为主，后续可继续补自动轮询。
- 当前“上传成功后自动发起预审”还未接入，仍需要用户确认后点击提交预审。
- 当前 VOD 上传首版走 URL 拉取上传，后续如果需要支持本地文件直传，可再补 `ApplyUploadInfo / CommitUploadInfo`。

## 8. 相关文件

- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/web/src/app/(dashboard)/douyin/ad-preaudit-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- `apps/web/src/services/works.ts`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
