# AI全域运营系统 Mermaid 全站关联地图

## 1. 文档目的

本文件是 `docs/site-map.md` 的可视化补充版本，专门用 Mermaid 把当前项目的前端板块、页面内部结构、前端服务层、后端 API 模块、数据模型和运行脚本串成一张可以快速总览的结构地图。

适用场景：

- 新人快速理解项目全貌
- 排查某个页面到底依赖了哪些 service、API 和数据表
- 评估新增功能应该挂在哪个板块和模块
- 后续持续维护“页面 -> service -> API -> schema”的全局索引

## 2. 阅读建议

- 先看“全站总图”，建立项目分层认知
- 再按业务看“品牌增长策略”和“小红书工作台”两张主链路图
- 然后看“后台/个人中心”与“后端模块/数据模型”图
- 需要落到代码时，再回到 `docs/site-map.md` 与对应文件

## 3. 全站总图

```mermaid
flowchart TD
    A["AI全域运营系统"]
    A --> B["apps/web 前端站点"]
    A --> C["apps/server 后端 API"]
    A --> D["prisma/schema.prisma 数据模型"]
    A --> E["docs 结构化文档"]
    A --> F["scripts 稳定启动/初始化脚本"]

    B --> B1["首页 /"]
    B --> B2["品牌增长策略 /brand-growth"]
    B --> B3["小红书工作台 /xiaohongshu"]
    B --> B4["个人中心 /personal-center"]
    B --> B5["后台管理 /admin"]
    B --> B6["登录注册 /login /register"]
    B --> B7["会员/点数/订单"]
    B --> B8["移动发布 /publish/mobile/[token]"]
    B --> B9["共享浅底导航壳"]
    B9 --> B91["前台顶部导航（仅保留横向主导航）"]
    B9 --> B92["前台左侧目录导航（仅保留按钮本体）"]
    B9 --> B93["后台目录导航"]

    C --> C1["AuthModule"]
    C --> C2["BrandsModule"]
    C --> C3["CollectorsModule"]
    C --> C4["ReportsModule"]
    C --> C5["WorksModule"]
    C --> C6["PublishingModule"]
    C --> C7["TasksModule"]
    C --> C8["MediaModule"]
    C --> C9["OrdersModule"]
    C --> C10["Admin 模块组"]

    D --> D1["用户与订单域"]
    D --> D2["品牌资料域"]
    D --> D3["采集资产域"]
    D --> D4["任务域"]
    D --> D5["媒体资产域"]
    D --> D6["飞书授权域"]

    E --> E1["site-map.md 文字地图"]
    E --> E2["site-map-mermaid.md Mermaid 地图"]
    E --> E3["engineering-standards.md"]
    E --> E4["changes/*.md"]

    F --> F1["dev:web:stable"]
    F --> F2["dev:server:stable"]
    F --> F3["seed-demo.cjs"]
```

## 4. 前端路由地图

```mermaid
flowchart LR
    Root["apps/web/src/app"]

    Root --> Home["/"]
    Root --> Auth["(auth)"]
    Root --> Dash["(dashboard)"]
    Root --> Publish["/publish/mobile/[token]"]

    Auth --> Login["/login"]
    Auth --> Register["/register"]

    Dash --> BrandGrowth["/brand-growth"]
    Dash --> Xiaohongshu["/xiaohongshu"]
    Dash --> Personal["/personal-center"]
    Dash --> Admin["/admin"]
    Dash --> Membership["/membership-purchase"]
    Dash --> Points["/points-purchase"]
    Dash --> OrderDetail["/orders/[id]"]
```

## 5. 品牌增长策略板块深度地图

```mermaid
flowchart TD
    BG["/brand-growth page.tsx"]
    BG --> BGW["workspace.tsx 编排层"]

    BGW --> BGW1["collection-workspace.tsx 收集数据"]
    BGW --> BGW2["library-workspace.tsx 品牌资料库"]
    BGW --> BGW3["report-workspace.tsx 品牌增长报告"]
    BGW --> BGW4["shared-types.ts"]
    BGW --> BGW5["datetime-helpers.ts"]
    BGW --> BGW6["markdown-render.ts"]
    BGW --> BGW7["task-status-helpers.ts"]

    BGW1 --> S1["brand-growth.ts"]
    BGW1 --> S2["collectors.ts"]
    BGW1 --> S3["daily-hotspots.ts"]

    BGW2 --> S1
    BGW3 --> S4["reports.ts"]

    S1 --> API1["/brands/*"]
    S1 --> API2["/auth/feishu/*"]
    S2 --> API3["/collectors/xiaohongshu/*"]
    S3 --> API4["/collectors/daily-hotspots/*"]
    S4 --> API5["/reports/*"]

    API1 --> M1["BrandsModule"]
    API2 --> M2["AuthModule"]
    API3 --> M3["CollectorsModule"]
    API4 --> M3
    API5 --> M4["ReportsModule"]

    M1 --> T1["Brand"]
    M1 --> T2["Product"]
    M1 --> T3["BrandSurvey"]
    M1 --> T4["PlatformAccount"]
    M1 --> T5["CompetitorAccount"]
    M1 --> T6["IndustryReport"]
    M1 --> T7["BusinessAsset"]

    M2 --> T8["User"]
    M2 --> T9["UserFeishuIntegration"]

    M3 --> T4
    M3 --> T5
    M3 --> T7

    M4 --> T10["Task"]
    M4 --> T11["MediaAsset"]
    M4 --> T1
    M4 --> T7
```

### 5.1 品牌增长策略内部页面颗粒度

```mermaid
flowchart LR
    A["collection-workspace.tsx"]
    A --> A1["飞书应用配置"]
    A --> A2["飞书 OAuth 状态"]
    A --> A3["飞书副本绑定"]
    A --> A4["小红书收集结果"]
    A --> A5["每日热点"]

    B["library-workspace.tsx"]
    B --> B1["品牌背景资料"]
    B --> B2["产品资料库"]
    B --> B3["品牌运营情况"]
    B --> B4["第三方数据"]
    B --> B5["企业经营数据"]

    C["report-workspace.tsx"]
    C --> C1["品牌增长报告"]
    C --> C2["品牌增长可视化报告"]
    C --> C3["全年营销规划"]
```

## 6. 小红书工作台深度地图

```mermaid
flowchart TD
    XHS["/xiaohongshu page.tsx"]

    XHS --> HX1["AssetsWorkspace 素材库"]
    XHS --> HX2["PlanWorkspace 营销策划方案"]
    XHS --> HX3["CalendarWorkspace 营销日历"]
    XHS --> HX4["OriginalWorkspace 原创笔记"]
    XHS --> HX5["RewriteWorkspace 二创笔记"]
    XHS --> HX6["VideoWorkspace 视频笔记"]
    XHS --> HX7["PublishModal 发布弹窗"]
    XHS --> HX8["MediaLightbox 媒体灯箱"]

    XHS --> HK1["useNoteComposerForms"]
    XHS --> HK2["usePublishFlow"]
    XHS --> HK3["useWorkComposerActions"]
    XHS --> HK4["useWorkEditors"]
    XHS --> HK5["useWorkMutationActions"]
    XHS --> HK6["useWorkspaceSelectionSync"]
    XHS --> HK7["task-polling.ts"]

    HX4 --> HX41["note-create-modals.tsx"]
    HX4 --> HX42["note-edit-modals.tsx"]
    HX4 --> HX43["work-card-grids.tsx"]
    HX5 --> HX41
    HX5 --> HX42
    HX5 --> HX43
    HX6 --> HX41
    HX6 --> HX42
    HX6 --> HX43

    XHS --> HH1["calendar-helpers.ts"]
    XHS --> HH2["datetime-helpers.ts"]
    XHS --> HH3["markdown-render.ts"]
    XHS --> HH4["preview-builders.ts"]
    XHS --> HH5["publish-status-helpers.ts"]
    XHS --> HH6["task-status-text-helpers.ts"]
    XHS --> HH7["work-media-helpers.ts"]
    XHS --> HH8["work-task-helpers.ts"]
    XHS --> HH9["desktop-publish-bridge.ts"]
    XHS --> HH10["shared-types.ts"]
    XHS --> HH11["publish-types.ts"]

    HK1 --> SX1["xiaohongshu.ts"]
    HK2 --> SX2["publishing.ts"]
    HK3 --> SX3["works.ts"]
    HK5 --> SX3
    HX1 --> SX4["collectors.ts"]
    HX2 --> SX5["reports.ts"]
    HX3 --> SX5

    SX1 --> AX1["/brands/* + /reports/* + /collectors/* 聚合读取"]
    SX2 --> AX2["/publishing/xiaohongshu/*"]
    SX3 --> AX3["/works/brands/:brandId/xiaohongshu/*"]
    SX4 --> AX4["/collectors/xiaohongshu/*"]
    SX5 --> AX5["/reports/brands/:brandId/xiaohongshu-*"]

    AX2 --> MX1["PublishingModule"]
    AX3 --> MX2["WorksModule"]
    AX4 --> MX3["CollectorsModule"]
    AX5 --> MX4["ReportsModule"]

    MX1 --> TX1["Task"]
    MX1 --> TX2["MediaAsset"]
    MX2 --> TX1
    MX2 --> TX2
    MX2 --> TX3["Brand"]
    MX2 --> TX4["Product"]
    MX3 --> TX5["PlatformAccount"]
    MX3 --> TX6["CompetitorAccount"]
    MX3 --> TX7["BusinessAsset"]
    MX4 --> TX1
    MX4 --> TX2
```

### 6.1 小红书工作台内部页面颗粒度

```mermaid
flowchart LR
    A["素材库"]
    A --> A1["品牌笔记素材"]
    A --> A2["竞品爆文素材"]
    A --> A3["目标用户素材"]
    A --> A4["加入素材库"]

    B["营销策划方案"]
    B --> B0["简化 Hero 与重复说明"]
    B --> B1["生成"]
    B --> B2["编辑"]
    B --> B3["保存"]
    B --> B4["删除"]

    C["营销日历"]
    C --> C1["生成"]
    C --> C2["月份切换"]
    C --> C3["日历详情"]

    D["原创笔记"]
    D --> D1["创建弹窗"]
    D --> D2["编辑弹窗"]
    D --> D3["作品卡片"]
    D --> D4["一键发布"]

    E["二创笔记"]
    E --> E1["创建弹窗"]
    E --> E2["编辑弹窗"]
    E --> E3["作品卡片"]
    E --> E4["一键发布"]

    F["视频笔记"]
    F --> F1["创建弹窗"]
    F --> F2["编辑弹窗"]
    F --> F3["作品卡片"]
    F --> F4["视频预览"]
```

## 7. 个人中心、支付和后台管理地图

```mermaid
flowchart TD
    PC["/personal-center"]
    PC --> PCS1["personal-center.ts"]
    PCS1 --> PAPI1["/auth/profile"]
    PCS1 --> PAPI2["/auth/point-ledgers"]
    PCS1 --> PAPI3["/orders"]
    PCS1 --> PAPI4["/tasks"]
    PCS1 --> PAPI5["/media"]
    PAPI1 --> PM1["AuthModule"]
    PAPI2 --> PM1
    PAPI3 --> PM2["OrdersModule"]
    PAPI4 --> PM3["TasksModule"]
    PAPI5 --> PM4["MediaModule"]

    Pay["/membership-purchase + /points-purchase + /orders/[id]"]
    Pay --> PCS1

    Admin["/admin"]
    Admin --> AS1["admin.ts"]
    Admin --> AUI1["仪表盘"]
    Admin --> AUI2["订单管理"]
    Admin --> AUI3["会员与积分规则"]
    Admin --> AUI4["用户管理"]
    Admin --> AUI5["模型消耗"]
    Admin --> AUI6["技能中心"]
    Admin --> AUI7["知识库管理"]
    Admin --> AUI8["接口供应商"]
    AUI6 --> AUI61["右侧一级分类：点击后展开"]
    AUI61 --> AUI611["品牌增长策略 / 小红书 / 抖音"]
    AUI6 --> AUI62["右侧二级分类：业务模块"]
    AUI6 --> AUI63["右侧三级分类：具体技能项"]
    AUI63 --> AUI631["原创笔记-原创文案 / 原创笔记-原创配图"]
    AUI63 --> AUI632["二创笔记-二创文案 / 二创笔记-二创配图"]
    AUI63 --> AUI633["视频笔记-视频创作"]
    AUI6 --> AUI65["右侧目录式技能导航"]
    AUI6 --> AUI64["中间单技能精简卡"]
    AUI64 --> AUI641["技能名称 / 状态 / 默认模型"]
    AUI64 --> AUI642["点数成本 / 更新时间"]
    AUI64 --> AUI643["技能提示词 / 保存技能"]
    AUI643 --> AUI6431["优先展示真实 SKILL.md / .txt 全文"]
    Admin --> AUI9["左侧浅底目录导航"]
    AS1 --> AAPI1["/orders/admin/list"]
    AS1 --> AAPI2["/admin/billing-rules"]
    AS1 --> AAPI3["/admin/users"]
    AS1 --> AAPI4["/admin/model-usage"]
    AS1 --> AAPI5["/admin/skills"]
    AS1 --> AAPI6["/admin/prompts"]
    AS1 --> AAPI7["/admin/knowledge-bases"]
    AS1 --> AAPI8["/admin/knowledge-base-files"]
    AS1 --> AAPI9["/admin/api-providers"]
```

## 8. 前端 service 到后端 API 关系图

```mermaid
flowchart LR
    S1["brand-growth.ts"] --> A1["BrandsController + AuthController"]
    S2["collectors.ts"] --> A2["CollectorsController"]
    S3["daily-hotspots.ts"] --> A3["DailyHotspotsController"]
    S4["reports.ts"] --> A4["ReportsController"]
    S5["works.ts"] --> A5["WorksController"]
    S6["publishing.ts"] --> A6["PublishingController"]
    S7["personal-center.ts"] --> A7["AuthController + OrdersController + TasksController + MediaController"]
    S8["admin.ts"] --> A8["Admin Controllers"]
    S9["http.ts"] --> A9["统一 request/jsonRequest 基座"]
```

## 9. 后端模块关系图

```mermaid
flowchart TD
    App["AppModule"]
    App --> Infra1["PrismaModule"]
    App --> Infra2["SchedulerModule"]
    App --> Infra3["AppConfigModule"]

    App --> M1["AuthModule"]
    App --> M2["BrandsModule"]
    App --> M3["CollectorsModule"]
    App --> M4["ReportsModule"]
    App --> M5["WorksModule"]
    App --> M6["PublishingModule"]
    App --> M7["TasksModule"]
    App --> M8["MediaModule"]
    App --> M9["OrdersModule"]
    App --> M10["Admin Modules"]

    M3 --> M2
    M4 --> M2
    M5 --> M2
    M5 --> M7
    M5 --> M8
    M5 --> M51["原创/二创成品图保存前统一规范为 1242x1660 竖版 3:4"]
    M5 --> M52["视频笔记统一读取 short-video-api-studio 并保存结构化视频提示词字段"]
    M6 --> M5
    M6 --> M7
    M6 --> M8
    M10 --> M9
    M10 --> M1
    M10 --> M7
```

## 10. 核心数据模型关系图

```mermaid
flowchart TD
    U["User"]
    MO["MembershipOrder"]
    PL["PointLedger"]
    B["Brand"]
    P["Product"]
    BS["BrandSurvey"]
    PA["PlatformAccount"]
    CA["CompetitorAccount"]
    IR["IndustryReport"]
    BA["BusinessAsset"]
    T["Task"]
    MA["MediaAsset"]
    FI["UserFeishuIntegration"]

    U --> MO
    U --> PL
    U --> B
    U --> T
    U --> MA
    U --> FI

    B --> P
    B --> BS
    B --> PA
    B --> CA
    B --> IR
    B --> BA
    B --> T
    B --> MA

    T --> MA
```

## 11. 运行与维护地图

```mermaid
flowchart LR
    Dev["本地开发"]
    Dev --> W1["npm run dev:web:stable"]
    Dev --> W2["npm run dev:server:stable"]
    Dev --> W3["/api/health 健康检查"]
    Dev --> W4["seed-demo.cjs 初始化演示数据"]

    Docs["文档维护"]
    Docs --> D1["site-map.md 文字说明"]
    Docs --> D2["site-map-mermaid.md 结构图"]
    Docs --> D3["changes/*.md 变更记录"]
    Docs --> D4["engineering-standards.md 开发规范"]
```

## 12. 维护规则

- 新增页面、工作区、hook、service、controller 或数据模型时，优先更新本文件
- 如果结构没有变化，只是实现细节变化，可以只更新 `docs/changes/*.md`
- 如果主链路发生变化，应同时更新 `docs/site-map.md` 和本文件
- Mermaid 图应保持“页面 -> service -> API -> 模块 -> 数据模型”的可追踪关系，不只列名称

## 13. 代码定位索引

本节用于把“结构图节点”直接映射到真实代码入口，便于从全局图快速跳到实现。

### 13.1 前端页面入口索引

- 首页：`apps/web/src/app/page.tsx`
- 登录页：`apps/web/src/app/(auth)/login/page.tsx`
- 注册页：`apps/web/src/app/(auth)/register/page.tsx`
- 品牌增长策略：`apps/web/src/app/(dashboard)/brand-growth/page.tsx`
- 小红书工作台：`apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- 个人中心：`apps/web/src/app/(dashboard)/personal-center/page.tsx`
- 后台管理：`apps/web/src/app/(dashboard)/admin/page.tsx`
- 会员购买：`apps/web/src/app/(dashboard)/membership-purchase/page.tsx`
- 点数购买：`apps/web/src/app/(dashboard)/points-purchase/page.tsx`
- 订单详情：`apps/web/src/app/(dashboard)/orders/[id]/page.tsx`
- 移动发布承接页：`apps/web/src/app/publish/mobile/[token]/page.tsx`

### 13.2 品牌增长策略代码入口索引

- 页面编排入口：`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- 收集数据工作区：`apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- 品牌资料库工作区：`apps/web/src/app/(dashboard)/brand-growth/library-workspace.tsx`
- 报告工作区：`apps/web/src/app/(dashboard)/brand-growth/report-workspace.tsx`
- 共享类型：`apps/web/src/app/(dashboard)/brand-growth/shared-types.ts`
- 时间/排序 helper：`apps/web/src/app/(dashboard)/brand-growth/datetime-helpers.ts`
- Markdown/预览 helper：`apps/web/src/app/(dashboard)/brand-growth/markdown-render.ts`
- 状态文案 helper：`apps/web/src/app/(dashboard)/brand-growth/task-status-helpers.ts`

### 13.3 小红书工作台代码入口索引

- 页面编排入口：`apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- 素材库工作区：`apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
- 营销策划方案工作区：`apps/web/src/app/(dashboard)/xiaohongshu/plan-workspace.tsx`
- 营销日历工作区：`apps/web/src/app/(dashboard)/xiaohongshu/calendar-workspace.tsx`
- 原创/二创/视频工作区总装配：`apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- 创建弹窗：`apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- 编辑弹窗：`apps/web/src/app/(dashboard)/xiaohongshu/note-edit-modals.tsx`
- 作品卡片：`apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
- 发布弹窗：`apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
- 全局灯箱：`apps/web/src/app/(dashboard)/xiaohongshu/media-lightbox.tsx`

### 13.4 小红书工作台 hook 与 helper 索引

- 创作表单状态：`apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
- 发布状态机：`apps/web/src/app/(dashboard)/xiaohongshu/use-publish-flow.ts`
- 作品创建动作：`apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
- 作品编辑状态：`apps/web/src/app/(dashboard)/xiaohongshu/use-work-editors.ts`
- 作品更新/删除动作：`apps/web/src/app/(dashboard)/xiaohongshu/use-work-mutation-actions.ts`
- 选择态与默认值同步：`apps/web/src/app/(dashboard)/xiaohongshu/use-workspace-selection-sync.ts`
- 任务轮询：`apps/web/src/app/(dashboard)/xiaohongshu/task-polling.ts`
- 发布桥接：`apps/web/src/app/(dashboard)/xiaohongshu/desktop-publish-bridge.ts`
- 时间 helper：`apps/web/src/app/(dashboard)/xiaohongshu/datetime-helpers.ts`
- Markdown helper：`apps/web/src/app/(dashboard)/xiaohongshu/markdown-render.ts`
- 日历 helper：`apps/web/src/app/(dashboard)/xiaohongshu/calendar-helpers.ts`
- 发布状态 helper：`apps/web/src/app/(dashboard)/xiaohongshu/publish-status-helpers.ts`
- 任务文案 helper：`apps/web/src/app/(dashboard)/xiaohongshu/task-status-text-helpers.ts`
- 作品媒体 helper：`apps/web/src/app/(dashboard)/xiaohongshu/work-media-helpers.ts`
- 作品任务 helper：`apps/web/src/app/(dashboard)/xiaohongshu/work-task-helpers.ts`
- 发布预览 helper：`apps/web/src/app/(dashboard)/xiaohongshu/preview-builders.ts`
- 共享类型：`apps/web/src/app/(dashboard)/xiaohongshu/shared-types.ts`
- 发布目标类型：`apps/web/src/app/(dashboard)/xiaohongshu/publish-types.ts`

### 13.5 前端 service 索引

- 请求基座：`apps/web/src/services/http.ts`
- 品牌资料与飞书配置：`apps/web/src/services/brand-growth.ts`
- 小红书收集工作区：`apps/web/src/services/collectors.ts`
- 每日热点工作区：`apps/web/src/services/daily-hotspots.ts`
- 报告与营销方案：`apps/web/src/services/reports.ts`
- 小红书聚合工作区：`apps/web/src/services/xiaohongshu.ts`
- 作品生成与 CRUD：`apps/web/src/services/works.ts`
- 发布会话：`apps/web/src/services/publishing.ts`
- 个人中心/订单/任务/媒体：`apps/web/src/services/personal-center.ts`
- 后台管理：`apps/web/src/services/admin.ts`

### 13.6 后端 API 入口索引

- 应用装配：`apps/server/src/app.module.ts`
- 启动入口：`apps/server/src/main.ts`
- 健康检查：`apps/server/src/app.controller.ts`
- 配置服务：`apps/server/src/config/app-config.service.ts`
- 认证与飞书：`apps/server/src/modules/auth/auth.controller.ts`
- 品牌资料：`apps/server/src/modules/brands/brands.controller.ts`
- 小红书收集：`apps/server/src/modules/collectors/collectors.controller.ts`
- 每日热点：`apps/server/src/modules/collectors/daily-hotspots.controller.ts`
- 报告与营销方案：`apps/server/src/modules/reports/reports.controller.ts`
- 作品域：`apps/server/src/modules/works/works.controller.ts`
- 发布域：`apps/server/src/modules/publishing/publishing.controller.ts`
- 订单域：`apps/server/src/modules/orders/orders.controller.ts`
- 任务域：`apps/server/src/modules/tasks/tasks.controller.ts`
- 媒体域：`apps/server/src/modules/media/media.controller.ts`

### 13.7 后台管理 API 入口索引

- API Provider：`apps/server/src/modules/admin/api-providers.controller.ts`
- 会员/积分规则：`apps/server/src/modules/admin/billing-rules.controller.ts`
- 知识库：`apps/server/src/modules/admin/knowledge-bases.controller.ts`
- 知识库文件：`apps/server/src/modules/admin/knowledge-base-files.controller.ts`
- 模型消耗：`apps/server/src/modules/admin/model-usage.controller.ts`
- 技能与提示词：`apps/server/src/modules/admin/skills-prompts.controller.ts`
- 用户管理：`apps/server/src/modules/admin/users-admin.controller.ts`

### 13.8 数据模型与运行脚本索引

- 数据模型总入口：`prisma/schema.prisma`
- 初始化迁移：`prisma/migrations/20260502_init/migration.sql`
- 前端稳定启动：`scripts/dev-web-stable.cjs`
- 后端稳定启动：`scripts/dev-server-stable.cjs`
- 演示数据 seed：`scripts/seed-demo.cjs`
- 模型可用性检查：`scripts/check-model-availability.cjs`

## 14. 常用追踪路径

- 看一个页面用了哪些 service：
  - 先找 `apps/web/src/app/.../page.tsx`
  - 再看同目录工作区组件与 hook
  - 再看 `apps/web/src/services/*.ts`

- 看一个 service 最终打到哪些 API：
  - 从 `apps/web/src/services/*.ts` 搜索 `request` / `jsonRequest`
  - 对照 `apps/server/src/modules/**/*.controller.ts`

- 看一个 API 最终落到哪些数据表：
  - 从对应 controller 找 service
  - 再回看 `prisma/schema.prisma` 中 `Brand`、`Task`、`MediaAsset`、`BusinessAsset` 等模型

- 排查主链路：
  - `brand-growth` 重点从“品牌资料 -> 收集数据 -> 报告生成”往后追
  - `xiaohongshu` 重点从“营销方案/日历 -> 原创/二创/视频作品 -> 发布会话”往后追
