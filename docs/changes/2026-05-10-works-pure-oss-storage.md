# 2026-05-10 works 作品链路切到纯 OSS 存储

## 本次变更

- `apps/server/src/modules/works/works.service.ts` 去掉 `.runtime/generated-works` 本地落盘、读取和删除逻辑
- `works` 生成的 HTML、图片、视频现统一通过 `storageKey=works/<brandId>/<fileName>` 持久化到 OSS
- 站内资源访问入口保持不变，仍统一走 `/api/works/brands/:brandId/assets/:fileName`
- `getGeneratedAsset()` 现直接按 `storageKey` 从 OSS 读取对象，不再回退本地文件系统
- 作品更新时会直接覆盖 OSS 中的 HTML 对象，删除时会同步删除 OSS 对象
- `apps/server/src/storage/oss-storage.service.ts` 改为在 OSS 未配置时直接抛出明确错误，避免“返回了 URL 但对象未落盘”的隐性风险

## 影响范围

- 后端：
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/storage/oss-storage.service.ts`
  - `apps/server/src/storage/storage.module.ts`
  - `apps/server/src/config/app-config.service.ts`
- 文档：
  - `docs/generated-content-storage-standards.md`
  - `docs/database-archive.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/engineering-standards.md`
  - `docs/README.md`

## 修改意图

- 用户已明确要求“既然有了 OSS，就不需要本地存储”
- 继续保留本地+OSS 双写会带来对象真源不清、删除不一致、线上多实例难共享等问题
- 收成纯 OSS 后，`sourceUrl` 负责对外读取，`storageKey` 负责对象真源，读写边界更清晰

## 验证

- 计划执行：
  - `npm --workspace apps/server run build`
  - `npm --workspace apps/server run lint`
  - `GetDiagnostics`
- 本次未推 GitHub，待用户确认后再提交并触发阿里云自动部署

## 当前边界

- 本次先收口 `works` 主链路，其他模块仍可能保留历史本地文件或第三方 URL 过渡态
- `reports`、`brand-growth` 附件、用户头像/品牌素材等更多上传链路，后续仍可继续统一到 OSS
- 现有线上环境必须配置 `OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`、`OSS_BUCKET`、`OSS_REGION`，否则 `works` 生成与读取会直接报错
