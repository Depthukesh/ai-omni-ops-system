# 小红书原创笔记参考模板图库与存储接入

## 1. 变更背景

- 用户要求把小红书原创笔记里的“封面参考图 / 配图参考图”改成截图式模板图库选择体验
- 用户同时提供了一批本地模板素材，希望这些图片能稳定上传到服务器或 OSS，而不是继续依赖本地目录或前端静态资源
- 现有原创生图链路已经打通参考图分析、`xhs-original-image-prompt` 和生图模型，不适合为模板图库另起一套生成流程

## 2. 变更目标

- 把原创笔记弹窗从纯文件上传升级为“模板图库选择 + 本地上传兜底”
- 让模板选中后继续复用既有原创生图链路，而不是改写后端生成主流程
- 将本地模板素材目录批量导入到受控存储，并通过站内接口统一读取

## 3. 修改内容

### 3.1 前端

- 在 `/xiaohongshu` 原创笔记弹窗中新增模板入口，分别用于封面模板和配图模板选择
- 新增 `original-reference-template-picker.tsx`，支持分类筛选、关键词搜索、单选封面模板、多选配图模板
- 页面初始化时并行拉取原创模板分类和模板清单，并将加载态、错误态、重试方法透传给原创工作区
- 用户确认模板后，前端先通过站内模板资源接口下载图片，再转换成 `File`，继续交给现有 `toUploadPayload()` 上传逻辑

### 3.2 后端

- `WorksModule` 新增原创模板列表接口：`GET /api/works/xiaohongshu/original/reference-templates`
- `WorksModule` 新增原创模板资源接口：`GET /api/works/xiaohongshu/original/reference-templates/:templateId/asset`
- 模板元数据由 `xhs-original-reference-templates.generated.ts` 统一维护，避免手写大量素材记录
- 模板图片统一通过站内接口读取，不直接暴露底层 OSS 链接
- 模板资源接口补充 `Content-Disposition` 文件名响应头；后端全局 CORS 同步暴露该响应头，保证本地 `3001 -> 3011` 跨端口 `fetch` 仍能读到真实文件名，而不是退回显示 `asset`

### 3.3 存储与导入

- 新增 `scripts/import-xhs-original-reference-templates.cjs`，用于扫描本地目录、生成分类/模板清单并批量导入存储
- 模板素材统一写入 `reference-templates/xiaohongshu/original/<categoryId>/<fileName>`
- 若环境已配置 `OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET / OSS_REGION`，脚本直接上传到 OSS
- 默认走公网 OSS endpoint；只有显式设置 `OSS_INTERNAL=true` 时才切到内网 endpoint，避免本地开发机器误连 `oss-cn-hangzhou-internal`
- 若本地开发未配置 OSS，脚本回退到 `.runtime/local-oss/<storageKey>`，但前端读取路径与正式环境保持一致

## 4. 修改意图

- 保留“模板选择后仍转成 `File`”的做法，是为了复用当前原创参考图分析、`xhs-original-image-prompt` 和生图链路，降低回归风险
- 不把模板图片直接放进前端静态目录，是为了避免仓库体积继续膨胀，并保持素材更新与资源访问边界可控
- 用生成文件维护模板清单，是为了让后续新增模板目录时只需重跑导入脚本

## 5. 影响范围

- 影响页面：`/xiaohongshu`
- 影响模块：`WorksModule`
- 影响存储：原创参考模板素材目录与站内模板资源读取接口
- 影响脚本：`scripts/import-xhs-original-reference-templates.cjs`

## 6. 验证方式

- 诊断验证：`page.tsx`、`note-create-modals.tsx`、`original-reference-template-picker.tsx`、`globals.css` 均无新增诊断
- 前端构建：`npm run build:web` 通过
- 后端构建：`npm run build:server` 通过
- 导入验证：模板目录已完成扫描并生成模板清单文件，可用于本地联调
- 本地联调：`http://127.0.0.1:3001/xiaohongshu` 中实测“选择封面模板 -> 使用这张模板 -> 回填表单”成功，封面参考图显示真实文件名 `tpl_bba0d70ff090.jpg`

## 7. 风险与后续

- 正式环境若要让模板图片走 OSS 真源，需要在部署环境补齐 OSS 配置后重跑导入脚本
- 当前模板库以静态清单为真源；若后续需要运营后台增删模板，可再演进为数据库驱动
- 这轮完成的是模板图库接入与受控存储边界，后续仍可继续按截图样式精调卡片排版与筛选交互

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-reference-template-picker.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/services/works.ts`
- `apps/web/src/styles/globals.css`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/works/xhs-original-reference-templates.generated.ts`
- `scripts/import-xhs-original-reference-templates.cjs`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/generated-content-storage-standards.md`
