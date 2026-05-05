## 背景

- 小红书工作台原有 `二创笔记` 仍是占位版的草稿列表，未接真实生成链路，也没有复用已经跑通的作品管理交互。
- 本次目标是让 `二创笔记` 与 `原创笔记` 一样，形成可生成、可查看、可编辑、可删除、可沉淀到我的作品的真实闭环。

## 本次改动

### 1. 后端新增二创笔记作品链路

- 在 `WorksService` 中新增二创笔记专用能力：
  - 列表：读取 `XHS_REWRITE_NOTE` 作品
  - 生成：基于素材库作品 + 产品 + 用户要求生成二创笔记
  - 编辑：更新标题和正文
  - 删除：删除 HTML 作品、关联图片和任务记录
- 二创笔记生成链路固定为：
  - `rewrite_copy.zip` + `deepseek-v4-pro -> doubao-seed-2-0-pro-260215 -> kimi-k2.6`
  - `rewrite_image.zip` + `deepseek-v4-pro -> doubao-seed-2-0-pro-260215 -> kimi-k2.6`
  - 文生图沿用既有链路：`gpt-image-2 -> nano-banana-pro-2k -> gemini-3-pro-image-preview-2k`
- 新增运行时提示词读取：
  - `.runtime/prompt_extract/rewrite_copy/SKILL.md`
  - `.runtime/prompt_extract/rewrite_image/SKILL.md`

### 2. 二创作品数据结构落到作品域

- 二创 HTML 主作品使用 `MediaAsset.metadataJson.kind = XHS_REWRITE_NOTE`
- 二创关联图片使用 `MediaAsset.metadataJson.kind = XHS_REWRITE_NOTE_IMAGE`
- 元数据保存以下关键信息：
  - 来源素材库作品 ID / 标题 / 链接 / 图片
  - 生成标题 / 正文 / 标签
  - 产品信息
  - 配图提示词与最终图片 URL
  - 所用模型信息

### 3. 前端二创笔记区改为真实作品界面

- `xiaohongshu/page.tsx` 中 `二创笔记` 分区不再展示占位草稿版本，而改为：
  - 顶部任务状态区
  - 顶部按钮 `添加二创笔记`
  - 已生成作品卡片：封面 + 标题 + 编辑 + 删除
  - 图片轮播与点击放大预览
  - 编辑弹窗
  - 创建弹窗
- 创建弹窗字段与产品要求对齐：
  - 素材库下拉
  - 产品下拉
  - 用户要求输入框

### 4. 前端服务层补齐真实接口

- `apps/web/src/services/works.ts` 新增二创笔记接口：
  - `getXiaohongshuRewriteWorks`
  - `generateXiaohongshuRewriteWork`
  - `updateXiaohongshuRewriteWork`
  - `deleteXiaohongshuRewriteWork`

### 5. 二创提交后立即显示状态反馈

- 用户点击 `一键创作` 后，二创弹窗会先关闭并回到主工作区。
- 即使后端任务列表尚未完成一次刷新，前端也会先显示本地 `创作中` 状态，避免页面短时间没有任何反馈。
- 当后端任务进入 `QUEUED/RUNNING/SUCCESS/FAILED` 后，再自动切换为真实任务状态展示。

## 设计意图

- 延续 `原创笔记` 已验证的作品域方案，避免为二创再单独起一套结构，减少后续维护成本。
- 保持二创与原创在 UI 上的交互一致，降低用户学习成本。
- 二创生成直接从素材库作品出发，确保后续“素材沉淀 -> 二创扩写 -> 作品沉淀”的主链路完整闭环。

## 影响范围

- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/web/src/services/works.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
