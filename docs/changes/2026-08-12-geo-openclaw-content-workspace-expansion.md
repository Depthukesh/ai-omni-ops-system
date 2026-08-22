# 2026-08-12 GEO 工作台扩展 OpenClaw 多类内容与存储地址

## 1. 背景

本轮目标是把 OpenClaw 新建的 GEO 工作流结果继续挂到网站中的 `/geo` 工作台，不再只承接 `GEO可见度诊断`。

用户这次要求新增两类能力：

- 一次性生成内容：
  - 关键词挖掘：`xlsx + html`
  - 网站诊断：`docx + html`
  - 知识库搭建：`md + html`
  - GEO优化方案：`docx + html`
- 多次生成内容：
  - 自媒体内容：`docx + html`
  - 第三方媒体：`docx + html`
  - 品牌网站：`docx + html`

同时，所有非 HTML 产物都要新增 `存储地址` 展示。

## 2. 本次改动

### 2.1 GEO 真源拆分

- 保留既有 `OpenClawGeoVisibilityReport`
  - 继续只承接 `GEO可见度诊断`
  - 不改历史数据结构
- 新增 `OpenClawGeoContent`
  - 承接其余 7 个 GEO 板块
  - 统一保存：
    - `contentType`
    - `title`
    - `description`
    - `htmlContent`
    - `attachmentFileUrl`
    - `attachmentFileName`
    - `attachmentMimeType`
    - `attachmentStorageKey`

### 2.2 GEO 页面扩展

- `/geo` 左侧导航从单板块扩成 8 个板块：
  - GEO可见度诊断
  - 关键词挖掘
  - 网站诊断
  - 知识库搭建
  - GEO优化方案
  - 自媒体内容
  - 第三方媒体
  - 品牌网站
- 新增通用 GEO 内容列表组件：
  - HTML 可查看
  - 非 HTML 产物可展示
  - `存储地址` 可展示
  - 一次性内容与多次生成内容都统一按列表呈现

### 2.3 附件存储地址

- 新增 GEO 内容的非 HTML 附件统一走受控副本
- 当前存储键前缀：
  - `reports/<brandId>/openclaw/geo/...`
- `local-single-user` 安装态下：
  - `attachmentStorageKey` 会映射为本地 `storageAddress`
  - 页面直接展示本地文件夹地址

### 2.4 OpenClaw MCP / Skill 同步

- 新增 MCP 工具：
  - `get_openclaw_geo_contents`
  - `create_openclaw_geo_content`
  - `delete_openclaw_geo_content`
- OpenClaw 功能目录补齐 GEO 其它工作流内容说明
- Skill 示例、功能域地图、工具矩阵、高频路由手册同步补齐新 GEO 板块

## 3. 影响面检查

### 3.1 受影响范围

- GEO 工作台 `/geo`
- OpenClaw 后端模块
- GEO 数据持久化边界
- OpenClaw MCP 工具目录
- OpenClaw Skill ZIP 文档

### 3.2 为避免副作用做的保护

- 没有重构或迁移既有 `OpenClawGeoVisibilityReport` 数据
- 没有改已有 `GEO可见度诊断` 的前端交互和删除链路
- 新增 7 个板块统一落在新真源里，避免把历史 GEO 诊断链路一并改动

## 4. 验证

- 后端构建：`npm run build:server`
- 前端构建：`npm run build:web`

## 5. 后续建议

- 后续如果 OpenClaw 会批量回写 GEO 板块，可继续在 `create_openclaw_geo_content` 上补批量写入编排，而不是先扩更多单独表
- 若后续确认 `GEO可见度诊断` 也需要附件存储地址，再评估是否并入通用 `OpenClawGeoContent`，目前先保持低风险并行真源
