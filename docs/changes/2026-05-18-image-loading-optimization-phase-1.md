# 2026-05-18 图片加载优化第一版与系统重构路线图

## 1. 变更背景

- 当前小红书工作区的作品卡片、素材库和模板库中存在较多图片直载路径
- 页面首次打开时，列表中的图片和视频会并发请求，容易形成首屏资源拥堵
- 受保护媒体和作品资源虽然已有站内受控读取链路，但缓存策略仍偏保守
- 同时，系统已经出现页面过重、重复工具扩散、Service 分层不清的问题，需要先形成一份不影响现有业务的重构路线图

## 2. 变更目标

- 先落地一版低风险图片加载优化，降低首屏和长列表的资源压力
- 输出系统重构路线图，明确后续如何分阶段拆结构而不影响当前业务
- 把这次方案与第一步改造同步沉淀到 `docs`

## 3. 修改内容

### 3.1 前端

- 新增小红书工作区统一图片组件 `managed-image.tsx`
  - 默认补齐 `loading`、`decoding`、`fetchPriority`
- 新增 `use-near-viewport.ts`
  - 让素材库受保护媒体只在接近视口时再触发 blob 拉取
- 小红书作品卡片改造：
  - 原创、二创、视频卡片的首屏前三张图优先加载，其余延后懒加载
  - 视频卡片预览视频从 `preload="metadata"` 调整为 `preload="none"`
- 小红书素材库改造：
  - 非当前视口附近的受保护媒体不立即 fetch blob
  - 降低一次打开页面时的受保护媒体并发拉取量
- 小红书灯箱图片改为统一图片组件
- 原创模板图库图片改为统一图片组件
- 卡片和模板卡片增加 `content-visibility: auto`
  - 降低长列表首次渲染成本

### 3.2 后端

- 小红书作品资产读取接口 `GET /api/works/brands/:brandId/assets/:fileName`
  - 增加 `Cache-Control: private, max-age=86400`
- 飞书媒体代理接口 `GET /api/collectors/brands/:brandId/feishu-media`
  - 缓存时间由 5 分钟提升到 30 分钟

### 3.3 文档与方案

- 新增系统重构路线图：`docs/system-refactor-roadmap.md`
- 同步更新：
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/engineering-standards.md`

## 4. 修改意图

- 这次先做“低风险收口”，不改现有接口协议和业务流程，只收紧最明显的图片加载瓶颈
- 选择前端懒加载 + 近视口加载 + 缓存头优化，是因为这三类改动最容易先见效，也最不容易影响现有业务功能
- 没有在第一版直接切 `next/image + CDN + 缩略图服务`，是因为那会同时牵动站内受保护媒体、OSS 读链路和资源规格生成流程，风险更高
- 先补路线图，是为了避免后续继续“边修性能边继续堆结构”，让重构有清晰执行顺序

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响接口：
  - `GET /api/works/brands/:brandId/assets/:fileName`
  - `GET /api/collectors/brands/:brandId/feishu-media`
- 影响模块：
  - 小红书作品卡片
  - 小红书素材库
  - 小红书灯箱
  - 小红书原创模板图库
- 不影响已有数据结构

## 6. 验证方式

- `GetDiagnostics` 检查新增/修改前端文件是否引入类型错误
- `GetDiagnostics` 检查相关后端 controller 是否引入语法错误
- 手工验证重点：
  - 打开 `/xiaohongshu` 时作品卡片是否仍正常显示
  - 素材库滚动前后图片是否按需加载
  - 灯箱图片是否可正常打开
  - 模板图库是否仍正常展示
  - 作品资产与飞书代理资源是否仍能读取

## 7. 风险与后续

- 当前只是第一版优化，还没有做到：
  - 缩略图 / 预览图 / 原图三级资源分层
  - 对象存储签名直链或 CDN 加速
  - 统一 `next/image` 化
  - 飞书媒体受控缓存落盘
- 下一步应优先进入 `docs/system-refactor-roadmap.md` 的阶段 A 和阶段 B：
  - 继续统一图片链路
  - 开始拆 `xiaohongshu/page.tsx`
  - 再拆 `brand-growth/workspace.tsx`

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/managed-image.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-near-viewport.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/media-lightbox.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-reference-template-picker.tsx`
- `apps/web/src/styles/globals.css`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/collectors/collectors.controller.ts`
- `docs/system-refactor-roadmap.md`
