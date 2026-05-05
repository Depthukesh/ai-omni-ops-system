# 原创笔记功能落地与作品域接入

## 1. 变更背景

- 小红书工作台里的“原创笔记”此前仍是草稿演示区，不符合当前 MVP 要求
- 用户要求把原创笔记做成真实业务链路，支持历史记录、添加、编辑、删除和保存到“我的作品”
- 用户同时要求删除原创笔记区域下方无关内容，只保留原创笔记主链路

## 2. 变更目标

- 打通原创笔记从表单输入到作品落库的完整前后端链路
- 把 `/xiaohongshu` 中的原创笔记区替换成真实作品管理界面

## 3. 修改内容

### 3.1 前端

- 改造 `/xiaohongshu` 的“原创笔记”分区，替换旧草稿展示和“创建任务并产出作品”按钮
- 新增原创笔记作品卡片列表，展示封面、标题、选题信息、编辑和删除动作
- 新增“添加原创笔记”弹窗，接入营销日历、产品、参考图、配图数量、用户要求等表单字段
- 新增原创笔记详情区，支持查看正文、标签、提示词、参考图风格档案和配图结果
- 新增原创笔记编辑保存、删除、刷新列表等交互
- 新增 `apps/web/src/services/works.ts`，统一封装原创笔记相关接口请求

### 3.2 后端

- 新建 `WorksController` 与 `WorksService`，提供原创笔记列表、生成、编辑、删除、作品文件读取接口
- 完成 `WorksModule` 装配，并挂载到 `AppModule`
- 生成链路按要求串联参考图分析、原创文案、配图提示词、文生图与作品落库
- 通过 `MediaAsset.metadataJson` 承载原创笔记作品元数据，MVP 阶段不新增 Prisma 表

### 3.3 数据与配置

- 为 mock `MediaRecord` 增加 `metadataJson`，支撑作品信息存储
- 生成的 HTML 与图片文件落地到 `.runtime/generated-works`
- 作品最终保存到“我的作品”对应的媒体记录中，分类为原创、类型为图文

## 4. 修改意图

- 采用独立 `WorksModule`，是为了把原创笔记从前端伪闭环提升为可复用的作品域能力
- 没有直接新建专门作品表，是因为当前 MVP 更适合复用既有 `Task + MediaAsset` 结构，减少迁移成本
- 前端直接切掉无关草稿区，能让原创笔记页面更贴近真实交付路径，减少演示噪音

## 5. 影响范围

- 影响页面：`/xiaohongshu`
- 影响接口：`/api/works/brands/:brandId/xiaohongshu/original/*`
- 影响模块：`WorksModule`、小红书工作台原创笔记分区
- 对已有数据无破坏性迁移；新增作品通过媒体资产记录保存

## 6. 验证方式

- 手工验证：检查原创笔记区已显示卡片列表、添加弹窗、编辑和删除入口
- 接口验证：前端已切到 `works` 相关接口，不再沿用旧的本地草稿发布伪链路
- 编译验证：`apps/web` 执行 `npx tsc --noEmit` 通过
- 构建验证：`apps/web` 执行 `npm run build` 通过

## 7. 风险与后续

- 真实模型接口是否全部可用，仍需在 3001/3011 联调时继续验证
- 参考图分析、文案生成、文生图链路涉及多个第三方 provider，异常提示还可继续细化
- 后续可继续补原创笔记作品预览页、图片放大查看和更细粒度的状态回显

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `apps/web/src/services/works.ts`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/works/works.module.ts`
- `apps/server/src/app.module.ts`
- `apps/server/src/common/mock-data.ts`
- `docs/site-map.md`
