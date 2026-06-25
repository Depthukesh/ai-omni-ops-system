# 2026-06-24 数字人上传修复与产品资料库多图上传

## 本次改动

- 修复抖音工作台 `数字人` 首页 `视频生成数字人` 弹窗中上传区点击无反应的问题。
- 将 `产品资料库` 的产品图片上传从单图改为支持一次选择并上传多张图片。

## 数字人上传修复

- 文件：`apps/web/src/app/(dashboard)/douyin/digital-human-home-panel.tsx`
- 调整内容：
  - 不再依赖隐藏 `label + file input` 的隐式触发方式。
  - 改为 `input ref + click()` 的显式触发方式。
  - 补充键盘触发支持，保证弹窗内点击和回车都能正常打开系统文件选择器。

## 产品资料库多图上传

- 文件：`apps/web/src/app/(dashboard)/brand-growth/library-workspace.tsx`
  - 产品图片输入框改为 `multiple`
  - 一次选择多张图片后，前端会依次上传并追加到当前产品的图片数组
  - 页面预览由单图切换为多图网格展示

- 文件：`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - 产品图片上传处理函数改为接受多文件数组
  - 上传成功后合并到 `imageUrls`
  - 保存品牌资料库时，把 `imageUrl + imageUrls` 一并提交

- 文件：`apps/web/src/services/brand-growth.ts`
  - `BrandProduct` 新增 `imageUrls: string[]`
  - 品牌资料归档标准化时兼容老数据：若只有 `imageUrl`，自动回填为单元素数组

- 文件：`apps/server/src/modules/brands/brands.service.ts`
  - 产品创建、更新、查询映射新增 `imageUrls`
  - 保留 `imageUrl` 作为首图兼容字段
  - 新增 `imageUrlsJson` 持久化字段的解析与回填逻辑

- 文件：`prisma/schema.prisma`
  - `Product` 新增 `imageUrlsJson Json?`

- 文件：`prisma/migrations/20260624_brand_product_multi_images_first_pass/migration.sql`
  - 新增 `imageUrlsJson` 列
  - 将旧的 `imageUrl` 自动回填到多图数组中，避免历史数据丢失

## 验证

- `pnpm prisma generate`
- `pnpm build:web`
- `pnpm build:server`

## 兼容性说明

- 老产品只有单张图片时，前端会自动把它视为一张图片的数组。
- 新产品上传多图后，首张图仍会同步写回 `imageUrl`，兼容历史页面和旧逻辑。
