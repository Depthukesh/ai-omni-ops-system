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

### 3.30 第二十九轮代码收敛

- 新增 `apps/web/src/app/(dashboard)/xiaohongshu/use-work-mutation-actions.ts`
- 将小红书工作台中原创、二创、视频三套作品的“保存编辑 + 删除作品”动作从 `page.tsx` 主文件中抽为独立 hook
- 页面主文件继续只保留选中态、弹窗开关与工作区装配，不再直接承载 6 段高度重复的作品更新/删除流程

### 3.31 第三十轮代码收敛

- 新增 `apps/web/src/app/(dashboard)/xiaohongshu/use-workspace-selection-sync.ts`
- 将小红书工作台中 URL 入参回填、默认作品选中、表单产品/素材/日历值兜底、营销日历月份与详情选中等一组同步型 `useEffect` 从 `page.tsx` 主文件中抽为独立 hook
- 页面主文件继续只保留任务轮询、工作区数据装配与动作传参，不再直接承载这一组选择态校验与默认值回填细节

### 3.32 第三十一轮文档收敛

- 新增 `docs/site-map-mermaid.md`
- 基于当前真实代码结构，补充一份 Mermaid 版“全站板块与内部关联地图”
- 地图覆盖 monorepo 总图、前端路由树、`brand-growth` 和 `xiaohongshu` 的工作区/组件/hook 深度结构、前端 service 到后端 API 关系、后端模块关系、核心数据模型关系，以及运行与文档维护脉络
- 更新 `docs/README.md` 与 `docs/site-map.md`，把 Mermaid 可视化地图纳入现有文档中心与站点地图基线

### 3.33 第三十二轮文档收敛

- 继续增强 `docs/site-map-mermaid.md`
- 新增“代码定位索引”，把前端页面入口、`brand-growth` 与 `xiaohongshu` 的工作区/组件/hook、前端 service、后端 API controller、后台管理接口、数据模型与运行脚本映射到真实文件路径
- 新增“常用追踪路径”，约定从页面到 service、从 service 到 API、从 API 到 schema 的阅读顺序，方便后续从全局图快速落到具体代码

### 3.34 第三十三轮规范收敛

- 新增 `docs/development-delivery-checklist.md`
- 明确“每次开发前必须带上的信息”和“每次开发完成后必须更新的信息”，把任务范围、验证方式、Git 边界、网站地图、规范更新、变更记录、待解决事项等纳入统一清单
- 更新 `docs/README.md`，把开发交付清单纳入文档中心
- 更新 `docs/engineering-standards.md`，把交付清单与开发闭环要求提升为默认执行规则

### 3.35 第三十四轮规范收敛

- 继续增强 `docs/development-delivery-checklist.md`
- 明确该清单不是在用户说“继续”时才触发，而是适用于每一次实际开发动作，包括排查、改动、验证、提交与交接
- 同步更新 `docs/engineering-standards.md`，把“逐步执行开发交付清单”提升为默认规则，避免后续按关键词选择性执行

### 3.36 第三十五轮后台界面收敛

- 更新 `apps/web/src/app/(dashboard)/admin/page.tsx`
- 将后台首栏改为真正的“仪表盘”，并把原有后台项目统一整理为左侧栏目导航
- 重做后台页面整体视觉骨架，形成“深色左侧栏目 + 中央主内容 + 右侧总览卡片”的首版中文管理台样式
- 保留现有订单、规则、用户、模型消耗、技能/提示词、知识库、接口供应商等业务逻辑，仅优先优化整体界面与信息分层
- 更新 `apps/web/src/styles/globals.css`，补充后台专属布局、概览卡、栏目导航、右侧速览卡和移动端响应式样式

### 3.37 第三十六轮后台界面收敛

- 更新 `apps/web/src/app/(dashboard)/layout.tsx`
- 对 `/admin` 路由单独隐藏前台共用的顶部横向主导航，避免后台页面同时出现顶栏导航和左侧后台栏目，保证后台界面更像独立管理台

### 3.38 第三十七轮后台界面收敛

- 更新 `apps/web/src/app/(dashboard)/admin/page.tsx`
- 在后台【技能与提示词】栏目中新增首版分类工作区：技能按 `category` 分组筛选，提示词按 `scene` 分组筛选
- 保留现有提示词编辑与保存逻辑，并把提示词卡片统一整理为“按场景板块浏览 -> 直接修改内容 -> 单条保存”的首版后台编辑体验
- 更新 `apps/web/src/styles/globals.css`，补充技能/提示词板块的筛选芯片、分组容器和提示词编辑区样式
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，同步后台管理台中【技能与提示词】的内部颗粒度结构

### 3.39 第三十八轮后台界面收敛

- 继续更新 `apps/web/src/app/(dashboard)/admin/page.tsx`
- 将后台【技能与提示词】重构为统一的【技能中心】：左侧栏目更名为“技能中心”，不再把技能和提示词拆成两个中间板块
- 调整为“右侧一级 / 二级 / 三级分类树 + 中间单技能详情卡”的结构：点击三级技能项后，中间只展示当前技能的一张完整配置卡
- 统一把原提示词内容收口到“技能执行内容”分区，并与技能基础配置一并展示、修改和保存
- 更新 `apps/web/src/styles/globals.css`，补充技能中心的单卡片详情、分类树、路径条和空状态样式
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，把后台【技能中心】改为三级分类导航与单技能详情结构

### 3.40 第三十九轮技能中心瘦身

- 继续更新 `apps/web/src/app/(dashboard)/admin/page.tsx`
- 将技能中心中间区域进一步收口为单张精简编辑卡：只保留标题、技能名称、状态、默认模型、点数成本、更新时间、技能提示词和【保存技能】按钮
- 移除原先的路径条、分区说明、供应商、版本、Temperature、Max Tokens 等冗余块，并将状态文案改为中文化显示
- 将右侧导航重做为更直观的“一级分类点击展开 -> 二级分类 -> 三级技能项”结构，并补齐 `全年营销规划` 对应的独立技能配置映射
- 更新 `apps/web/src/styles/globals.css`，重做技能中心单卡片与右侧树导航的视觉层级、间距和选中态
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，同步后台【技能中心】最新的瘦身卡片与展开树导航结构

### 3.41 第四十轮技能中心接入真实提示词

- 继续更新 `apps/server/src/common/mock-data.ts`
- 将后台技能中心提示词数据从短句演示文案切换为真实文件内容：优先读取 `SKILL.md` / `.txt`，品牌增长报告、小红书营销规划、可视化报告三项直接展示系统内已有全文
- 修正后端稳定启动时的路径基准，改为按 `apps/server` 运行目录解析真实提示词文件
- 为 `enterprise-annual-plan` 补齐后端技能配置映射，并统一若干技能的默认模型为单个可选值，避免下拉框出现整串模型名
- 继续调整 `apps/web/src/app/(dashboard)/admin/page.tsx` 与 `apps/web/src/styles/globals.css`：去掉技能卡片上方说明区，把右侧导航进一步压向目录式手风琴样式
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，同步技能中心“真实提示词全文 + 目录式分级导航”的最新结构

### 3.42 第四十一轮补齐小红书内容生产技能与左侧导航

- 继续更新 `apps/web/src/app/(dashboard)/admin/page.tsx`
- 将小红书 `内容生产` 二级分类从单一占位项拆成三条独立三级技能：`原创笔记-原创配图`、`二创笔记-二创配图`、`视频笔记-视频创作`
- 更新 `apps/server/src/common/mock-data.ts` 与 `apps/web/src/services/admin.ts`，为上述三条技能补齐技能配置与提示词记录；其中原创、二创接入真实技能文件内容，视频笔记接入真实工作流文档内容
- 重做 `apps/web/src/styles/globals.css` 左侧后台导航：去掉深色大卡片堆叠感，改为更接近目录导航的浅底轻量样式，并压缩导航项说明信息
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，同步后台技能中心的小红书三级技能拆分和左侧导航结构调整

### 3.43 第四十二轮统一右侧技能导航风格

- 继续更新 `apps/web/src/app/(dashboard)/admin/page.tsx` 与 `apps/web/src/styles/globals.css`
- 将右侧技能导航从卡片树样式改成与左侧导航同语言的目录式展开结构
- 一级分类改为浅蓝标题条，二级分类改为分组标题行，三级技能改为缩进文本项，仅保留当前选中高亮
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，同步后台技能导航的目录式呈现方式

### 3.44 第四十三轮统一前后台视觉语言

- 更新 `apps/web/src/app/(dashboard)/layout.tsx`，将前台顶部导航改为与后台相同的浅底导航壳、图标短标签和高亮逻辑
- 更新 `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx` 与 `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`，为前台左侧工作区导航补齐目录式导航头部与分组容器
- 更新 `apps/web/src/styles/globals.css`，统一前台 `dashboard` 顶栏、左侧目录、主内容卡片、Hero 和按钮的视觉语言到后台当前使用的浅底圆角风格
- 验证 `http://localhost:3001/brand-growth` 与 `http://localhost:3001/xiaohongshu`，确认前台主工作台已切换到与后台一致的视觉体系
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，补记前后台共享视觉壳层与前台工作台目录式导航

### 3.45 第四十四轮收口前台多余导航区块

- 根据页面标注，继续更新 `apps/web/src/app/(dashboard)/layout.tsx`、`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx` 与 `apps/web/src/styles/globals.css`
- 去掉前台顶部左侧的品牌说明大卡，仅保留横向主导航
- 去掉品牌增长页左侧两列导航上方的“功能分区 / 页面导航”标题头，仅保留目录按钮本体
- 同步压缩前台顶部导航与左侧导航宽度、圆角、间距和阴影，减少视觉占位，让主内容区更突出

### 3.46 第四十五轮继续简化小红书工作台

- 继续更新 `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`、`apps/web/src/app/(dashboard)/xiaohongshu/plan-workspace.tsx` 与 `apps/web/src/styles/globals.css`
- 去掉小红书页左侧残留的“前台导航 / 小红书工作台”标题头
- 去掉小红书 Hero 顶部的“小红书工作台”徽标，减少重复标题信息
- 去掉营销策划方案卡片中的两段重复说明文案，仅保留标题、动作按钮、状态与编辑区域
- 继续压缩小红书左侧导航、Hero、内容卡圆角和内边距，使页面更接近简洁文字目录界面

### 3.47 第四十六轮拆分原创笔记文案与配图提示词

- 更新 `apps/web/src/app/(dashboard)/admin/page.tsx`，将小红书内容生产下的原创笔记拆为 `原创笔记-原创文案` 与 `原创笔记-原创配图` 两条三级技能
- 更新 `apps/web/src/services/admin.ts`，为原创笔记补齐两条独立的技能配置与两条独立的提示词记录，分别对应标题正文和配图提示词
- 更新 `apps/server/src/common/mock-data.ts`，为后台 API/mock 数据源补齐 `original_copy` 与 `xhs-original-image-prompt` 两条原创笔记技能及其真实内容回填
- 更新 `docs/site-map.md`，同步后台技能中心中原创笔记文案链路与原创配图链路已分开展示

### 3.48 第四十七轮接通原创笔记真实 SKILL 文件读写

- 更新 `apps/server/src/common/mock-data.ts`，将 `original_copy` 与 `original_image` 的候选路径补齐到真实 `提示词` 目录，服务启动时优先读取真实 `SKILL.md`
- 更新 `apps/server/src/modules/admin/skills-prompts.service.ts`，让后台 `/admin/prompts` 在读取时主动从真实 `SKILL.md` 回填内容
- 同时让后台保存 `小红书原创笔记文案` 与 `小红书原创笔记配图` 时，直接回写对应的真实 `SKILL.md` 文件，而不是只停留在内存里的 mock 数据

### 3.49 第四十八轮补齐原创配图文字结构与强制注字

- 更新 `apps/server/src/modules/works/works.service.ts`，要求 `original_image` 与二创配图链路除返回 `cover_prompt`、`image_prompts` 外，还必须返回 `cover_text`、`image_texts`
- 为原创/二创图文作品元数据新增 `coverText`、`imageTexts` 结构，保存每张图的标题与小标签，便于后台排查和后续前端展示
- 在实际发送给文生图模型前，统一将“主标题必须直接排版到画面中”“小标签必须清晰可读”这类强约束注入最终出图 prompt，避免只生成纯场景摄影图
- 更新 `apps/web/src/services/works.ts` 类型定义，使前端工作台可获取作品的封面文字与配图文字结构

### 3.50 第四十九轮修正二创技能拆分与无产品约束

- 更新 `apps/server/src/modules/works/works.service.ts`，为 `rewrite_copy` 与 `rewrite_image` 增加“未选产品时不得自行引入具体商品 SKU、价格、门店购买引导和卖货主视觉”的系统约束，要求二创必须优先围绕对标素材主事件与主场景展开
- 更新 `apps/server/src/common/mock-data.ts`、`apps/web/src/services/admin.ts` 与 `apps/web/src/app/(dashboard)/admin/page.tsx`，将后台技能中心中的二创能力拆分为 `二创笔记-二创文案` 与 `二创笔记-二创配图`
- 更新 `apps/server/src/modules/admin/skills-prompts.service.ts`，让后台可直接读取和保存 `rewrite_copy`、`rewrite_image` 两份真实 `SKILL.md`
- 收口二创作品读取逻辑，按实际 `imagePrompts` 数量裁剪 `imageTexts`，避免历史记录中的冗余图片文字条目继续影响前端展示与排查

### 3.51 第五十轮修正二创运行时上下文污染

- 定位到二创链路虽然已改系统约束，但仍然无条件把整份 `xiaohongshu-marketing-plan` 传给 `rewrite_copy`、`rewrite_image`，而该规划中包含多个具体产品、价格与核销信息，持续污染模型输出
- 更新 `apps/server/src/modules/works/works.service.ts`，在“未选产品”时对二创运行时上下文做去产品化处理：过滤营销规划中的商品/价格/核销信息，并对对标素材正文做去产品化摘要，补充事件导向的 `topic_context`
- 修正二创最终出图的参考图来源，改为优先使用对标素材 `imageList`，并在有产品时再附加产品图，避免 `rewrite_image` 实际不吃参考图导致画面风格跑偏
- 以“吉吉陪伴汉马的第十一年！ + 不植入产品”重跑验收后，新结果已收口到汉马、跑者状态、城市氛围与品牌陪伴感，不再扩写牛角包、提拉米苏、价格与门店购买导向

### 3.52 第五十一轮收口小红书配图 3:4 比例

- 更新 `apps/server/src/modules/works/works.service.ts`，补齐 `normalizeGeneratedImageBuffer(...)`，在原创/二创图片落盘前统一用 `1242x1660` 强制裁切为竖版 `3:4`
- 远程 URL 下载保存与 base64 直存两条图片链路现在都会经过比例规范化，避免模型偶发返回横图、方图后直接进入作品库
- 保留生成前 prompt 中“严格按 1242x1660（宽3:高4）构图”的硬约束，同时把服务端规范化作为最终兜底，减少第三方模型不稳定导致的比例漂移
- 更新 `apps/web/src/styles/globals.css`，将小红书作品卡片媒体展示从近似竖图改为严格 `aspect-ratio: 3 / 4`
- 本地用历史横图样本 `cmovnu5ki0001aidwpwvqz4x8-gallery-3.png` 验证后，尺寸已可稳定从 `1402x1122` 规范为 `1242x1660`

### 3.53 第五十二轮补齐规范文档、Git 规则与网站地图

- 更新 `docs/engineering-standards.md`，把“小红书成品图不能只靠 prompt 口头约束比例，必须有保存前服务端兜底”固化为通用资源规范
- 更新 `docs/git-workflow.md`，补充“混合工作区改动时只按本次任务文件暂存和备份”的规则，避免把无关改动混入同一提交
- 更新 `docs/site-map.md` 与 `docs/site-map-mermaid.md`，同步后台技能中心中二创文案/配图的拆分状态，以及 `WorksModule` 对原创/二创成品图统一收口 `1242x1660` 竖版 `3:4` 的真实链路

### 3.54 第五十三轮修正视频笔记技能接线

- 更新 `apps/server/src/modules/admin/skills-prompts.service.ts` 与 `apps/server/src/common/mock-data.ts`，让后台 `prompt_xhs_video_note` 直接读取真实 `提示词/short-video-api-studio/short-video-api-studio/SKILL.md`，不再展示工作流说明文档
- 更新 `apps/server/src/modules/works/works.service.ts`，将视频文案阶段与视频提示词阶段统一改为读取同一份真实 `short-video-api-studio` 技能，修复此前误读 `rewrite_copy` 的问题
- 扩展视频提示词结构化输出与作品元数据，新增 `businessScene`、`videoType`、`segmentBrief`、`referenceStrategy`、`padImageStrategy`、`continuityRules` 等字段，避免视频链路退化为单条简化 prompt
- 视频生成调用改为优先使用 `fullVideoPrompt`，并把新增结构字段通过视频作品接口返回，便于后续核对真实执行路径
- 本地已验证 `/api/admin/prompts` 返回的视频提示词内容切换为真实 `short-video-api-studio` 全文，长度约 `5850` 字符

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
- `GetDiagnostics` 检查 `xiaohongshu/use-work-mutation-actions.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `xiaohongshu/use-workspace-selection-sync.ts` 与 `xiaohongshu/page.tsx`
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
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-mutation-actions.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-workspace-selection-sync.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-edit-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `.env.example`
