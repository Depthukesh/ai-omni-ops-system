# AI全域运营系统重构路线图

## 1. 文档目的

- 在不影响现有业务连续性的前提下，分阶段收口系统结构、性能瓶颈与模块耦合问题
- 给后续新增板块、模型、工作区和资源类型提供稳定扩展边界，避免系统继续横向膨胀
- 明确哪些改造可以先做“低风险增量收口”，哪些需要后续进入“结构拆分”

## 2. 当前核心问题

### 2.1 前端层

- `xiaohongshu/page.tsx`、`brand-growth/workspace.tsx` 已接近大页面容器，集成权限、工作区状态、请求编排、轮询、弹窗和预览
- 图片、视频预览仍有较多原始资源直载路径，首屏和长列表容易形成并发加载压力
- 通用能力在多个板块重复实现，例如日期格式化、Markdown 渲染、权限分区与状态提示
- 跨板块存在直接引用，模块边界不够清晰

### 2.2 后端层

- `works.service.ts`、`collectors.service.ts`、`reports.service.ts` 文件较大，业务编排、第三方调用、资源处理与运行时配置交织
- 部分 Service 仍存在手工 `new AppConfigService()`、直接读取 `process.env` 等做法，削弱 DI 边界
- 外部 HTTP、飞书代理、CLI 调用、存储读取尚未完全沉淀为统一基础设施能力
- 作品资源和受保护媒体仍主要通过应用层转发，后续资源规模继续扩大时会持续放大服务器读流量

### 2.3 扩展风险

- 新增板块若继续照搬当前工作区模式，页面文件和服务文件会继续增厚
- 新增模型、平台、内容类型时，容易把“板块逻辑 + 平台细节 + 资源处理”再次耦合进现有主链路
- 若不提前拆出共享层与基础设施层，后续每次扩展都将同时推高性能成本和维护成本

## 3. 重构目标

- 页面做薄：页面只负责布局、入口参数和视图装配
- 功能归域：每个板块按 feature 建立独立组件、hooks、service、schema、状态容器
- 基础设施统一：配置、HTTP、任务轮询、资源读取、第三方调用统一下沉到共享层
- 资源分级：图片区分缩略图、预览图、原图，视频区分封面、预览、原始文件
- 运行时可扩展：第三方模型与平台只扩展 Provider 元数据与 adapter，不侵入主业务流程

## 4. 分阶段路线

### 阶段 A：低风险收口

- 目标：不改主业务协议，先降低页面压力和继续膨胀的速度
- 动作：
  - 建立前端统一图片组件，补 `loading / decoding / fetchPriority`
  - 长列表卡片启用接近视口再加载，减少首屏并发图片/视频请求
  - 统一收口受保护媒体与作品资产的缓存策略
  - 为重复工具建立 shared 迁移清单：日期、Markdown、权限、AsyncAction 类型
  - 统一梳理所有直接 `process.env` 与手工 `new ConfigService` 的位置
- 退出条件：
  - 小红书与品牌增长工作区的图片加载链路具备统一组件和首屏优化
  - 明确第一批 shared 工具迁移名单
  - 明确第一批后端 DI 修复名单

### 阶段 B：页面与 Hook 拆分

- 目标：把“大页面”拆成布局层 + feature 容器层 + 面板层
- 动作：
  - `xiaohongshu/page.tsx` 拆为：
    - 工作区壳层
    - 营销策划
    - 营销日历
    - 原创笔记
    - 二创笔记
    - 视频笔记
    - 素材库
    - 发布工作流
  - `brand-growth/workspace.tsx` 拆为：
    - 品牌资料
    - 收集数据
    - 品牌增长报告
    - 可视化报告
    - 半年营销规划
  - 抽出统一 hook：
    - `useBrandContextGate`
    - `useTaskPolling`
    - `useProtectedMedia`
    - `useWorkspaceAsyncState`
- 退出条件：
  - 页面入口文件只保留布局和分区路由
  - 工作区副作用不再全部堆在单个 `page.tsx`

### 阶段 C：共享层与前端 Feature 化

- 目标：减少跨板块重复实现，让新板块按统一骨架扩展
- 动作：
  - 建立 `apps/web/src/shared/`
    - `ui/`
    - `lib/`
    - `datetime/`
    - `markdown/`
    - `permissions/`
    - `media/`
  - 建立 `apps/web/src/features/`
    - `xiaohongshu/`
    - `brand-growth/`
    - `personal-center/`
    - `admin/`
  - 页面和组件只从 shared / 当前 feature 取能力，不再跨板块直连引用
- 退出条件：
  - 通用日期、Markdown、权限、媒体预览能力不再重复维护两套以上实现
  - 新增工作区可以直接复用 feature 模板而非复制老页面

### 阶段 D：后端分层与基础设施收口

- 目标：把业务编排、第三方调用、存储与配置读取彻底拆层
- 动作：
  - 统一通过 DI 注入 `AppConfigService`、`OssStorageService`、`HttpClient`
  - 为重型模块建立分层：
    - `FacadeService`
    - `Gateway/Adapter`
    - `Repository`
    - `Mapper`
    - `AssetService`
  - 建立统一 HTTP 基础层：
    - 超时
    - 重试
    - 熔断
    - 日志
  - 为 CLI/外部采集建立任务队列或并发限制
- 退出条件：
  - 业务 Service 不再直接散落 env 读取与外部 fetch
  - 第三方平台新增仅需扩展 adapter 与配置，不需改业务主干

### 阶段 E：资源与性能架构升级

- 目标：内容越多，系统越不依赖应用层硬扛静态读流量
- 动作：
  - 作品图片生成后同步产出缩略图与预览图
  - 列表页只读缩略图，灯箱读预览图，下载读原图
  - 站内资源逐步切到对象存储签名读或 CDN
  - 受保护飞书媒体按需落受控缓存，降低重复回源
  - 数据库健康检查增加进程级缓存，不再每次请求都探测
- 退出条件：
  - 静态资源访问压力主要从应用层迁走
  - 图片/视频资源增长不会线性放大页面打开耗时

## 5. 推荐执行顺序

1. 先完成阶段 A
2. 再拆 `xiaohongshu/page.tsx`
3. 再拆 `brand-growth/workspace.tsx`
4. 同步推进 shared 层迁移
5. 最后收口后端基础设施与资源架构

## 6. 第一批优先事项

- P0：统一图片组件、懒加载与列表首屏压力收口
- P0：小红书与品牌增长工作区拆壳
- P0：统一配置读取和 DI 边界
- P1：统一 HTTP 基础层与任务轮询层
- P1：统一媒体资源分级与缓存策略
- P2：shared 层和 feature 模板化

## 7. 实施原则

- 每一阶段都必须允许“业务照常可用”
- 每次只拆一层，不同时改协议、页面结构和数据库边界
- 重构必须优先补文档和变更记录，避免“代码变了但团队认知没跟上”
- 任何结构性拆分都优先从小红书与品牌增长两个最重工作区开始

## 8. 相关文档

- `docs/engineering-standards.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/database-archive.md`
- `docs/generated-content-storage-standards.md`

## 9. 当前阶段快照

### 2026-05-19 小红书结构治理进度

- 当前已在“小红书工作区 + 创建弹窗 + 视频详情区”范围内完成一轮较完整的薄壳化收口
- `note-create-modals.tsx` 已收口为纯导出层，三类创建弹窗的壳层、字段区、公共外壳与静态文案配置均已拆出
- `note-workspaces.tsx` 中视频详情区相关的阶段派生、props 装配与挂载层均已外移
- 当前继续深挖创建弹窗内部的边际收益开始下降，后续更建议转向 `workspace-shell.tsx`、`publish-modal.tsx` 等仍偏厚的外层编排文件
- 续接前优先查看：`docs/xiaohongshu-structure-governance-handoff-2026-05-19.md`
