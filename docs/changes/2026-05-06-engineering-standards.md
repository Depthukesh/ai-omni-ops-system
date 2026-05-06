# 2026-05-06 开发规范与代码收敛基线

## 1. 变更背景

- 随着小红书原创、二创、视频笔记、电脑端发布、手机接力等链路持续增加，代码规模已经明显上升
- 当前代码里已经出现超大页面、超大 service、扩展协议重复、环境变量散读、资源外链失效等问题
- 如果不尽快建立规范，后续越开发越容易偏离既有边界，导致可维护性下降和错误增多

## 2. 变更目标

- 输出一份后续开发可直接执行的工程规范文档
- 基于当前代码现状，明确哪些能力需要收敛、抽象、复用与限制
- 为后续重构和新功能开发建立统一基线

## 3. 修改内容

### 3.1 文档

- 新增 `docs/engineering-standards.md`
- 将当前前端、后端、扩展、资源、文档与 Git 规则统一沉淀为规范

### 3.2 第一轮代码收敛

- 新增后端全局 `AppConfigModule` 与 `AppConfigService`
- 将 `publishing.service.ts` 和 `works.service.ts` 中分散的 URL、端口、Web/API 基地址解析收口到统一配置服务
- 同步补齐 `.env.example` 中当前发布链路与飞书授权链路常用但未显式列出的环境变量

### 3.3 第二轮代码收敛

- 将小红书工作台中“电脑端发布桥接”相关的协议探测、消息监听、启动发布逻辑抽离为独立 `desktop-publish-bridge.ts`
- 页面文件继续保留业务编排，但不再直接承载整段扩展桥接细节

### 3.4 第三轮代码收敛

- 新增通用 `task-polling.ts`
- 将小红书工作台中营销方案、营销日历、原创笔记、二创笔记、视频笔记、发布任务的重复轮询逻辑统一收口
- 页面内不再保留 6 段重复的 `useEffect + setTimeout + taskStatus` 轮询模板

### 3.5 第四轮代码收敛

- 新增 `use-publish-flow.ts`
- 将小红书工作台中的发布弹窗状态、电脑端发布、手机接力二维码、发布完成回写等逻辑抽为独立 hook
- 新增 `publish-types.ts`，把发布目标类型从页面文件中独立出来

### 3.6 第五轮代码收敛

- 新增 `use-note-composer-forms.ts`
- 将原创、二创、视频三套创作表单的状态、重置逻辑、打开关闭逻辑从页面文件中抽为统一 hook
- 页面文件继续保留创作提交编排，但不再直接承载大段表单状态初始化代码

### 3.7 第六轮代码收敛

- 新增 `use-work-editors.ts`
- 将原创、二创、视频三套作品编辑弹窗的状态、开始编辑、取消编辑等逻辑从页面文件中抽为统一 hook
- 页面文件继续保留保存接口调用与作品列表更新，但不再直接承载大段编辑状态初始化逻辑

### 3.8 第七轮代码收敛

- 新增 `use-work-composer-actions.ts`
- 将原创、二创、视频三套作品创建时的参数校验、接口调用、提交中状态、列表回写、编辑态清理与提示文案从页面文件中抽为统一 hook
- 页面文件继续保留弹窗展示与卡片渲染，但不再直接承载三大段创作提交流程

### 3.9 第八轮代码收敛

- 新增 `docs/generated-content-storage-standards.md`
- 明确原创、二创、视频三类作品的“Task + MediaAsset + 本地副本”统一存储规则
- 将视频生成结果中的成片视频和视频封面统一补到本站副本链路，避免继续依赖第三方临时地址
- 新增 `work-card-grids.tsx`，将原创、二创、视频三套作品卡片列表从页面主文件中抽为独立子组件

### 3.10 第九轮代码收敛

- 新增 `plan-workspace.tsx`
- 新增 `calendar-workspace.tsx`
- 将小红书工作台中的“营销策划方案工作区”和“营销日历工作区”从 `page.tsx` 主文件中抽为独立子组件
- 页面主文件继续保留工作区切换与状态编排，但不再直接承载这两大块长段 JSX

### 3.11 第十轮代码收敛

- 新增 `note-create-modals.tsx`
- 将原创、二创、视频三套“创建弹窗”从 `page.tsx` 主文件中抽为独立子组件
- 页面主文件继续保留弹窗开关、表单状态与提交流程编排，但不再直接承载三套创建表单的长段 JSX

### 3.12 第十一轮代码收敛

- 新增 `note-edit-modals.tsx`
- 将原创、二创、视频三套“编辑弹窗”从 `page.tsx` 主文件中抽为独立子组件
- 页面主文件继续保留保存接口调用、状态提示与列表回写编排，但不再直接承载三套编辑弹窗的长段 JSX

### 3.13 第十二轮代码收敛

- 新增 `assets-workspace.tsx`
- 将小红书工作台中的“素材库工作区”从 `page.tsx` 主文件中抽为独立子组件
- 素材卡片列表、预览切换、灯箱入参组装与指标展示逻辑统一转入素材库子组件
- 页面主文件继续保留素材选中态、预览索引状态与全局灯箱状态编排

### 3.14 第十三轮代码收敛

- 新增 `note-workspaces.tsx`
- 将原创笔记、二创笔记、视频笔记三个分区工作区从 `page.tsx` 主文件中抽为独立子组件
- 三个分区的状态面板、作品卡片区、编辑弹窗、创建弹窗装配逻辑统一迁入分区组件
- 页面主文件继续保留任务状态计算、作品列表状态、发布弹窗与全局灯箱编排

### 3.15 第十四轮代码收敛

- 新增 `publish-modal.tsx`
- 将小红书一键发布弹窗从 `page.tsx` 主文件中抽为独立子组件
- 发布账号选择、电脑端扩展提示、桌面发布会话区、手机接力二维码区统一迁入发布弹窗组件
- 页面主文件继续保留 `use-publish-flow` 状态机与全局提示文案编排

### 3.16 第十五轮代码收敛

- 新增 `media-lightbox.tsx`
- 将全局图片/视频预览灯箱从 `page.tsx` 主文件中抽为独立子组件
- 页面主文件继续保留灯箱状态与打开关闭动作编排，不再直接承载预览弹层 JSX

### 3.17 第十六轮代码收敛

- 新增 `markdown-render.ts`
- 将小红书页面内的 Markdown 渲染、表格/list 转换与行内格式化 helper 从 `page.tsx` 主文件中抽为独立工具模块
- 页面主文件继续只保留 `marketingPlanPreviewHtml` 的调用点，不再直接承载这组纯工具函数

### 3.18 第十七轮代码收敛

- 新增 `shared-types.ts`
- 将 `SelectOption`、`ProductOption`、`MaterialOption`、`PlatformAccount`、`MediaLightboxState` 等重复小类型统一收口为共享定义
- 将 `PublishModal`、`MediaLightbox`、`AssetsWorkspace`、`OriginalWorkspace`、`RewriteWorkspace`、`VideoWorkspace`、三套创建弹窗与三套编辑弹窗改为显式 `Props` 接口
- 将 `PublishModal` 的 `target` 改为 `publishTarget`、`MediaLightbox` 的 `lightbox` 改为 `state`，统一 props 命名可读性
- `use-note-composer-forms`、`use-work-composer-actions`、`use-publish-flow` 同步改为复用共享类型，减少局部重复声明

### 3.19 第十八轮代码收敛

- 将 `plan-workspace.tsx`、`calendar-workspace.tsx`、`work-card-grids.tsx` 统一改为显式 `Props` 接口
- 三个剩余工作区/卡片组件同步复用 `shared-types.ts` 中的通用 handler 与格式化类型
- 至此，小红书工作台本轮新拆出去的核心组件已基本统一到“共享类型 + 显式 Props 接口 + 更直白 prop 命名”的同一套风格

### 3.20 第十九轮代码收敛

- 新增 `calendar-helpers.ts`
- 将日期格式化、月份标签、节日标签、日历矩阵构建与日历可选值/list 展示 helper 从 `page.tsx` 主文件中抽为独立工具模块
- 页面主文件继续只保留营销日历数据编排与传参，不再直接承载这组日期/日历纯工具函数

### 3.21 第二十轮代码收敛

- 新增 `publish-status-helpers.ts`
- 将任务状态样式、作品状态文案、发布状态文案与发布按钮标签 helper 从 `page.tsx` 主文件中抽为独立工具模块
- 页面主文件改为直接复用 `getTaskStatusClass`、`getWorkTaskStatusClass`、`getWorkTaskStatusText`、`getPublishTaskStatusText`、`getWorkPublishTaskLabel`、`getPublishTaskSummaryText`
- 页面内调用点同步从旧的 `getOriginalTaskStatusClass / Text` 名称过渡到更直白的 `getWorkTaskStatusClass / Text`

### 3.22 第二十一轮代码收敛

- 新增 `work-media-helpers.ts`
- 新增 `work-task-helpers.ts`
- 将素材代理 URL、作品图片数组、预览索引、作品标题基线、草稿匹配、关联作品查找、发布任务映射与任务输入解析 helper 从 `page.tsx` 主文件中抽为独立工具模块
- `assets-workspace.tsx` 同步复用新的媒体 helper，去掉本地重复的素材代理与预览索引实现
- 页面主文件继续只保留作品工作区状态编排与预览数据组装，不再直接承载这组媒体/任务辅助函数

### 3.23 第二十二轮代码收敛

- 新增 `datetime-helpers.ts`
- 新增 `preview-builders.ts`
- 将页面级 `formatDateTime` 与发布预览拼装 `buildPublishedPreview` 从 `page.tsx` 主文件中抽为独立工具模块
- 页面主文件继续只保留发布预览的入参准备与状态编排，不再直接承载时间格式化和发布预览文案拼装细节

### 3.24 第二十三轮代码收敛

- 新增 `task-status-text-helpers.ts`
- 将营销策划方案、营销日历、原创/二创/视频创作任务的状态文案判断从 `page.tsx` 主文件中抽为独立工具模块
- 页面主文件统一改为复用 `getPhaseTaskStatusText` 与 `getComposeTaskStatusText`，减少多段重复的状态文案三元判断

### 3.25 第二十四轮代码收敛

- 新增 `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- 将 `brand-growth/workspace.tsx` 中“收集数据”板块的大段 JSX 抽为独立组件，统一承载飞书绑定、小红书收集结果和每日热点工作区
- `workspace.tsx` 主文件改为只保留数据装配、状态编排与动作回调，不再直接维护该板块的大段渲染细节

### 3.26 第二十五轮代码收敛

- 新增 `apps/web/src/app/(dashboard)/brand-growth/library-workspace.tsx`
- 将 `brand-growth/workspace.tsx` 中“品牌资料库”板块的大段 JSX 抽为独立组件，统一承载品牌背景、产品资料、品牌运营情况、第三方数据和企业经营数据工作区
- `workspace.tsx` 主文件改为只保留资料库的状态装配与动作回调，不再直接维护该板块的大段渲染细节
- 补充 `isLibraryPageKey` 类型收窄，避免资料库组件接收超出当前板块范围的步骤类型

### 3.27 第二十六轮代码收敛

- 新增 `apps/web/src/app/(dashboard)/brand-growth/report-workspace.tsx`
- 将 `brand-growth/workspace.tsx` 中“品牌增长报告”板块的大段 JSX 抽为独立组件，统一承载品牌增长报告、品牌增长可视化报告和全年营销规划三个工作区
- `workspace.tsx` 主文件改为只保留报告区的状态装配、预览字符串准备与动作回调，不再直接维护该板块的大段渲染细节

### 3.28 第二十七轮代码收敛

- 新增 `apps/web/src/app/(dashboard)/brand-growth/shared-types.ts`
- 将 `brand-growth` 新拆组件中的重复小类型统一收口，包括异步动作类型、可选日期/数字格式化器、飞书表单结构、媒体预览结构，以及资料库/报告页 key 类型
- `collection-workspace.tsx`、`library-workspace.tsx`、`report-workspace.tsx` 统一改为显式 `Props` 接口风格，减少局部重复定义
- `report-workspace.tsx` 中年度规划预览行类型改为直接复用 `AnnualMarketingPlanRow[]`，降低条件类型推导复杂度

### 3.29 第二十八轮代码收敛

- 新增 `apps/web/src/app/(dashboard)/brand-growth/datetime-helpers.ts`
- 新增 `apps/web/src/app/(dashboard)/brand-growth/markdown-render.ts`
- 新增 `apps/web/src/app/(dashboard)/brand-growth/task-status-helpers.ts`
- 将 `brand-growth/workspace.tsx` 中剩余的时间格式化、热点热度格式化、收集结果排序、Markdown 渲染、可视化预览文档拼装与状态文案 helper 统一外移
- 删除 `workspace.tsx` 内已无调用的预览图片 URL helper，让主文件继续收口为状态编排与动作装配层

### 3.11 本次评估纳入的重点范围

- 前端页面与 service
- 浏览器扩展工作台桥接与创作者页自动化
- 后端 controller、service、配置读取、异常处理
- 作品资源保存与发布链路

## 4. 修改意图

- 当前最需要的不是继续堆功能，而是把“如何写、写到哪、什么时候抽、什么时候记文档”固定下来
- 规范文档既是新开发的边界说明，也是后续重构的优先级清单
- 通过文档先统一规则，再逐步做代码收敛，比零散修补更稳

## 5. 影响范围

- 影响后续所有前端、后端、扩展相关开发
- 影响 `publishing`、`works` 两个热点模块的配置读取方式
- 影响小红书工作台中桌面发布桥接逻辑的组织方式
- 影响小红书工作台中任务轮询逻辑的组织方式
- 影响小红书工作台中发布弹窗状态与发布动作的组织方式
- 影响小红书工作台中原创/二创/视频创作表单状态的组织方式
- 影响小红书工作台中原创/二创/视频创作提交流程的组织方式
- 影响小红书工作台中原创/二创/视频编辑弹窗状态的组织方式
- 影响生成内容的文案、图片、视频存储规则与副本策略
- 影响小红书工作台中原创/二创/视频作品卡片区的组织方式
- 影响小红书工作台中营销策划方案与营销日历工作区的组织方式
- 不直接修改线上业务逻辑，但会影响后续开发时的默认落点和审查标准
- 不影响已有数据库数据

## 6. 验证方式

- 人工复核当前代码热点
- 按前端与后端两个方向分别做结构评估
- 将评估结果转化为稳定规则并落入 `docs/`
- `GetDiagnostics` 检查新增配置模块与已改服务文件
- `npm run build:server` 通过
- `GetDiagnostics` 检查 `desktop-publish-bridge.ts` 与 `xiaohongshu/page.tsx`
- `npm run build:web` 通过
- `GetDiagnostics` 检查 `task-polling.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-publish-flow.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-note-composer-forms.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-work-editors.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-work-composer-actions.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `works.service.ts`
- `GetDiagnostics` 检查 `work-card-grids.tsx` 与 `xiaohongshu/page.tsx`
- 执行前后端构建验证
- `GetDiagnostics` 检查 `plan-workspace.tsx`、`calendar-workspace.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `note-create-modals.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `note-edit-modals.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `assets-workspace.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `note-workspaces.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `publish-modal.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `media-lightbox.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `markdown-render.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `shared-types.ts`、`note-create-modals.tsx`、`note-edit-modals.tsx`、`note-workspaces.tsx`、`assets-workspace.tsx`、`publish-modal.tsx`、`media-lightbox.tsx`、`use-note-composer-forms.ts`、`use-work-composer-actions.ts`、`use-publish-flow.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `plan-workspace.tsx`、`calendar-workspace.tsx`、`work-card-grids.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `calendar-helpers.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `publish-status-helpers.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `work-media-helpers.ts`、`work-task-helpers.ts`、`assets-workspace.tsx` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `datetime-helpers.ts`、`preview-builders.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `task-status-text-helpers.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `brand-growth/collection-workspace.tsx` 与 `brand-growth/workspace.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `brand-growth/library-workspace.tsx` 与 `brand-growth/workspace.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `brand-growth/report-workspace.tsx` 与 `brand-growth/workspace.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `brand-growth/shared-types.ts`、`collection-workspace.tsx`、`library-workspace.tsx`、`report-workspace.tsx` 与 `workspace.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `brand-growth/datetime-helpers.ts`、`markdown-render.ts`、`task-status-helpers.ts` 与 `workspace.tsx`
- 再次执行 `npm run build:web` 通过

## 7. 风险与后续

- 规范文档已经落地，但代码本身仍需要分阶段按 P0/P1/P2 逐步整改
- 若后续开发不按文档执行，仍可能继续产生重复实现和结构膨胀
- 下一阶段建议优先处理配置收口、共享协议、资源本站缓存和页面拆分
- 当前只先收口了 `publishing` 与 `works` 的配置读取，其他模块仍需继续迁移
- `xiaohongshu/page.tsx` 体量仍然很大，本次只先切出了发布桥接热点，后续还需继续拆任务轮询、作品弹窗和表单状态
- 当前虽然已抽出发布桥接、任务轮询、发布状态机、创作表单状态、创作提交流程和编辑弹窗状态，但页面仍保留大量卡片渲染与分区视图逻辑，后续应继续按“卡片渲染分区、营销方案工作区子组件”两个方向拆分
- 当前已开始收口生成内容存储规则，并拆出作品卡片区、营销方案工作区、营销日历工作区、素材库工作区、原创/二创/视频三个分区工作区、三套创建弹窗、三套编辑弹窗、发布弹窗、全局灯箱、markdown/render helper、共享类型、日期/日历 helper、发布状态 helper、作品媒体 helper、任务关联 helper、时间格式 helper、发布预览 builder 与任务状态文案 helper；后续重点转到 `page.tsx` 内极少量剩余局部逻辑的最终收口与整体复盘
- 当前已开始收口生成内容存储规则，并拆出作品卡片区、营销方案工作区、营销日历工作区、素材库工作区、原创/二创/视频三个分区工作区、三套创建弹窗、三套编辑弹窗、发布弹窗、全局灯箱、markdown/render helper、共享类型、日期/日历 helper、发布状态 helper、作品媒体 helper、任务关联 helper、时间格式 helper、发布预览 builder 与任务状态文案 helper；同时开始进入 `brand-growth` 板块规范化，已完成“收集数据工作区”“资料库工作区”“报告工作区”三轮拆分，并补齐共享类型与 `Props` 接口规范，主 `workspace.tsx` 已明显收口为编排层

## 8. 相关文件

- `docs/engineering-standards.md`
- `docs/generated-content-storage-standards.md`
- `docs/README.md`
- `apps/server/src/config/app-config.module.ts`
- `apps/server/src/config/app-config.service.ts`
- `apps/server/src/modules/publishing/publishing.service.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/desktop-publish-bridge.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/publish-types.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-publish-flow.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/task-polling.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-editors.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/plan-workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/calendar-workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/media-lightbox.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/markdown-render.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/shared-types.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/calendar-helpers.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/publish-status-helpers.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/work-media-helpers.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/work-task-helpers.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/datetime-helpers.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/preview-builders.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/task-status-text-helpers.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/library-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/report-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/shared-types.ts`
- `apps/web/src/app/(dashboard)/brand-growth/datetime-helpers.ts`
- `apps/web/src/app/(dashboard)/brand-growth/markdown-render.ts`
- `apps/web/src/app/(dashboard)/brand-growth/task-status-helpers.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-edit-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `.env.example`
