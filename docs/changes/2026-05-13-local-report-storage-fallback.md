# 2026-05-13 本地报告生成 OSS 回退修复

## 背景

本地点击 `品牌增长报告 -> 生成品牌增长报告` 时，页面仍返回 `Internal Server Error`。

排查后确认，这次报错的主因不再是模型 provider 选择，而是报告生成完成后会继续执行：

- 将 HTML 报告写入 `reports/<brandId>/<fileName>`
- 再创建 `MediaAsset` / `BusinessAsset`

当前本地 `3011` 未配置 `OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`、`OSS_BUCKET`、`OSS_REGION` 时，`OssStorageService.getClient()` 会直接抛错，导致本地报告虽然已生成出内容，但在“保存 HTML 附件”阶段被整体打成 500。

## 本次处理

- 在 `apps/server/src/storage/oss-storage.service.ts` 新增本地开发态回退
- 当 `NODE_ENV !== production` 且未配置 OSS 时：
  - `putObject()` 改为写入 `.runtime/local-oss/<storageKey>`
  - `getObject()` 改为从 `.runtime/local-oss/<storageKey>` 读取
  - `deleteObject()` 改为删除本地回退文件与 `.meta.json`
- 本地回退仍保持 `storageKey` 与站内读取接口不变，因此不影响：
  - `reports/<brandId>/<fileName>`
  - `/api/reports/brands/:brandId/assets/:fileName`

## 边界

- 生产环境仍要求真实 OSS；未配置时继续报错，不允许把本地目录当线上真源
- 本地回退仅用于开发 / 调试态，避免因缺少 OSS 配置导致报告、作品、附件链路无法联调

## 验证

- `GetDiagnostics`：`oss-storage.service.ts` 无新增错误
- `npm run build:server`：通过
- 使用最小脚本验证本地无 OSS 时 `put/get/delete` 正常：
  - 写入 `reports/test-brand/test-report.html`
  - 读取成功，`contentType = text/html; charset=utf-8`
  - 删除成功
- 已重启本地稳定后端：`PID=35892`

## 影响范围

- `apps/server/src/storage/oss-storage.service.ts`
- 本地 `reports`、`works`、头像、品牌附件等所有走 `OssStorageService` 的受控资源链路
