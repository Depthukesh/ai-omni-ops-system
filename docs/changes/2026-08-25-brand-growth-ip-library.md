# 2026-08-25 品牌资料库新增 IP资料库

## 变更背景

品牌增长策略下原有 `品牌资料库` 只有品牌背景、产品资料、品牌运营情况、第三方数据和企业知识库，缺少可独立维护的品牌 IP 归档区域，导致品牌 IP 的名称、故事、价值观、风格和账号链接没有统一真源，也无法通过 OpenClaw / MCP 直接维护。

## 本次改动

1. 前端 `品牌增长 -> 品牌资料库` 下新增独立子板块 `IP资料库`，位置在 `品牌背景资料` 下方。
2. 左侧菜单新增独立 `IP资料库` 入口，支持以下字段：
   - IP名称
   - IP照片（支持一次选择多张图片上传）
   - IP定位
   - IP故事
   - IP价值观
   - IP风格
   - IP抖音账号链接
   - IP小红书账号链接
3. 后端品牌归档链新增 `Brand.ipProfileJson`，统一承接 IP 资料，不额外拆独立重表。
4. 新增品牌 IP 资料更新与图片上传接口，并让归档摘要、步骤状态和本地 mock fallback 一并返回 `ipProfile`。
5. `manage_brand_library` 新增 `get_ip_library`、`update_ip_library`、`upload_ip_image`，让 OpenClaw / MCP / Skill 能直接读写 IP 资料库。
6. 同步更新站点地图、Mermaid 结构图、数据库档案和品牌运营助手 Skill 文档。

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/brand-growth/*`
  - `apps/web/src/services/brand-growth.ts`
- 后端：
  - `apps/server/src/modules/brands/*`
  - `apps/server/src/modules/openclaw/openclaw.service.ts`
- 共享层：
  - `packages/shared/src/*`
- 数据层：
  - `prisma/schema.prisma`
  - `prisma/schema.local.prisma`
  - `prisma/migrations/20260825_brand_ip_library_first_pass/`
- 文档：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/database-archive.md`
  - `docs/openclaw/skill-package/*.md`

## 兼容性与边界

- 本次继续复用品牌主档归档链，只在 `Brand` 上新增 `ipProfileJson`，不改变既有产品、问卷、账号、行业资料和知识库的数据结构。
- `IP资料库` 走独立权限键 `brandGrowth.library.ipLibrary`，避免把品牌背景编辑权限直接外溢到 IP 资料编辑。
- 图片上传沿用现有 OSS 受控存储方式，前端仅保存站内可访问 URL，不直接把临时文件状态写入归档。

## 验证

- 待本轮代码收尾后执行：
  - Web 侧类型 / 构建检查
  - Server 侧类型 / 构建检查
  - 关键品牌资料库链路静态检查

## 后续建议

- 下一步可为 `IP资料库` 增加图片删除 / 排序能力，但应继续保持在当前 `ipProfileJson` 轻量归档模型内演进。
