# AI全域运营系统全站地图

## 1. 文档说明

本文件记录当前系统的真实结构，用于回答三个问题：

1. 系统现在有哪些已落地功能
2. 这些功能从哪里进入、由谁承接
3. 当前哪些部分是主链路，哪些部分仍是占位或过渡实现

补充说明：

- 若需要查看可视化结构图，请同时参考 `docs/site-map-mermaid.md`
- 若需要查看数据库与持久化边界，请同时参考 `docs/database-archive.md`
- 该文件负责文字化说明，本文件继续作为“真实结构的文字基线”

## 2. 当前产品主入口

### 2.1 前端入口

- `/`：系统首页，作为门户入口
- `/brand-growth`：品牌增长策略工作台
- `/xiaohongshu`：小红书工作台
- `/personal-center`：个人中心
- `/admin`：后台管理台
- `/login`：登录页，已接入账号密码登录并保存前端 access/refresh 登录态
- `/register`：注册页，占位
- 后端已新增真实登录态接口：`/api/auth/login`、`/api/auth/refresh`、`/api/auth/me`、`/api/auth/brands`、`/api/auth/switch-brand`、`/api/auth/logout`

### 2.2 当前主要用户链路

1. 品牌建档
2. 收集数据
3. 生成品牌增长报告
4. 生成可视化报告/全年营销规划
5. 进入小红书继续策划、排期和内容生产
6. 到个人中心查看任务、订单、作品

## 3. 前端结构地图

### 3.1 品牌增长策略 `/brand-growth`

- 顶部导航：已统一为后台同语言的浅底导航壳，使用短标签徽标与当前栏目高亮
- 左侧导航：已改为目录式浅底菜单，当前仅保留分区与页面按钮本体，去掉上方说明标题头

#### 一级分区

- 品牌资料库
- 收集数据
- 品牌增长报告

#### 品牌资料库

- 品牌背景资料
- 产品资料库
- 品牌运营情况
- 第三方数据
- 企业经营数据

#### 收集数据

- 小红书平台
- 每日热点

#### 品牌增长报告

- 生成品牌增长报告
- 品牌增长可视化报告
- 全年营销规划

### 3.2 小红书 `/xiaohongshu`

- 顶部导航：已统一为后台同语言的浅底导航壳，使用短标签徽标与当前栏目高亮
- 左侧导航：已改为更简化的目录式浅底菜单，仅保留分区按钮本体
- 营销策划方案
  - 当前页面已去掉 Hero 徽标和重复说明，聚焦标题、状态、动作按钮与 Markdown 编辑/预览主链路
- 素材库
- 营销日历
  - 当前“生成接下来 7 天”通过后台任务异步生成；任务状态会显示 `QUEUED / RUNNING / SUCCESS / FAILED`
  - 生成依赖 `品牌增长报告`、`全年营销规划`、`小红书营销策划方案` 三项前置输入，并读取 `第三方api接口文生文国内.txt` 中的国内文生文 provider 配置
- 原创笔记
  - 已支持原创图文作品列表、添加弹窗、编辑、删除
  - 已接入营销日历选题、产品选择、参考图上传、配图数量、用户要求
- 二创笔记
  - 已支持二创图文作品列表、添加弹窗、编辑、删除
  - 已接入素材库作品选择、产品选择、用户要求
- 视频笔记
  - 已支持视频作品列表、添加弹窗、编辑、删除
  - 已接入营销日历选题、产品选择、参考图上传、视频模型、时长、提示词输出和双段用户要求

### 3.3 个人中心 `/personal-center`

- 个人信息
- 点数流水
- 会员订单
- 充值明细
- 任务记录
- 我的作品
- 当前已接入真实登录态：
  - 无登录态时跳转 `/login`
  - 页面会通过 `/api/auth/me` 获取当前用户和品牌信息
  - 已支持当前品牌切换与退出登录
  - 请求层会自动附带 `Authorization` 和 `x-brand-id`
- 当前采用“真数据优先、局部种子兜底”：
  - 用户资料优先走真实接口
  - 点数流水、订单、任务、作品任一接口失败时仅该部分回退演示数据
- 当前已进入二级路由阶段：
  - `/personal-center`：个人中心概览页，仍保留原聚合视图，并已开始露出“待处理品牌邀请”通知卡
- `/personal-center/orders`：订单中心第一版，已接真实 `/orders` 列表接口，按当前登录用户查看会员订单和点数充值记录，支持状态筛选、类型筛选、关键词搜索、品牌上下文切换、筛选金额汇总和订单详情跳转；当前订单仍主要按用户维度过滤，品牌级订单归属后续继续扩展
- `/personal-center/works`：作品中心第一版，已接真实 `/media` 列表接口，按当前登录用户查看 HTML、图片、视频与文档资产，支持作品范围筛选、类型筛选、关键词搜索、品牌上下文切换、小红书作品回跳与源文件打开；当前作品仍主要按用户维度过滤，品牌内共享与更细作品分类后续继续扩展
- `/personal-center/invites`：邀请通知中心，现已接入邀请站内消息表第一版；统一查看待处理、已接受、已过期和已撤回的品牌邀请，并支持直接接受待处理邀请、后端持久化未读/已读、只看未读、状态筛选、关键词搜索、排序、分页总览、URL 参数状态回放、复制当前筛选链接与一键重置筛选
  - `/personal-center/tasks`：用户任务中心，已接真实任务接口、品牌切换和失败重试
  - `/personal-center/team`：团队协作页第一版，已接真实 `/api/brands/:id/members`、`/api/brands/:id/invites`、`/api/brands/me/invites`、`/api/brands/me/invites/accept-by-code`、`/api/brands/:id/role-audit-logs`、`/api/brands/:id/transfer-owner`，支持成员列表、角色与状态管理、创建邀请、撤回邀请、接受邀请、邀请码加入、邀请链接复制、成员审计日志查看和主账号转移入口；未登录点击邀请链接时会保留 `inviteCode` 并回流到登录后页面
- 前台共享顶栏已新增全局待处理邀请提示条，登录后若存在待接受邀请，会在导航下方直接提醒，并每 60 秒自动刷新一次邀请状态；提示条已联动未读待处理数量
  - 该提示条现默认跳转到 `/personal-center/invites`
- 规划中：
  - `/personal-center/skills`：用户技能中心，基于平台技能做个人覆盖、保存与重置
  - `/personal-center/security`：登录态、密码、安全设置

### 3.4 后台管理 `/admin`

- 仪表盘
- 订单管理
- 会员/积分规则
- 用户管理
- 任务管理
- 品牌成员与权限管理
- API/模型消耗管理
- 技能中心
  - 右侧一级分类：品牌增长策略 / 小红书 / 抖音，点击一级项后展开下级树
  - 右侧二级分类：按业务模块展开，例如品牌增长报告、全年营销规划
  - 右侧三级分类：具体技能项，例如“品牌增长报告-生成品牌增长报告”
  - 小红书内容生产：已拆分为 `原创笔记-原创文案`、`原创笔记-原创配图`、`二创笔记-二创文案`、`二创笔记-二创配图`、`视频笔记-视频创作`
  - 右侧导航样式：已改为目录式展开菜单，与左侧后台导航保持同一视觉语言
  - 中间只展示当前选中三级技能的一张精简详情卡
  - 详情卡字段：标题、技能名称、状态、默认模型、点数成本、更新时间、技能提示词、保存技能
  - 技能提示词：优先展示系统内真实 `SKILL.md` / `.txt` 全文；原创笔记已拆分为“原创文案”和“原创配图”两套提示词分别呈现
- 知识库管理
- API Provider 管理
- 当前后台入口已支持角色矩阵：
  - `SUPER_ADMIN`：可见全部后台栏目
  - `ADMIN_OPERATOR`：侧重订单、用户、模型资产、知识库和接口供应商
  - `FINANCE_OPERATOR`：侧重订单与会员/积分规则
  - `SUPPORT_OPERATOR`：侧重订单、用户与模型消耗排查

### 后台左侧导航

- 当前采用浅底目录式导航，弱化大卡片感，栏目切换以单行标签为主
- 激活态强调当前栏目，未激活项仅保留简洁标签和方向箭头

### 前后台共享视觉壳层

- `dashboard` 顶栏、前台左侧工作区导航、后台左右导航已统一为浅底圆角目录式风格
- 前台顶部左侧品牌说明卡已移除，前台顶栏当前只保留横向主导航
- 前后台主内容卡片已统一为浅灰背景、大圆角、轻阴影与蓝灰状态高亮体系

## 4. 后端结构地图

### 4.1 基础模块

- `PrismaModule`：数据库访问
- `SchedulerModule`：统一定时任务注册与调度

### 4.2 业务模块

- `AuthModule`：登录、注册、用户资料、飞书 OAuth、飞书应用配置
- `AuthModule`
  - 当前已接入基于签名 token 的 access/refresh 登录态
  - 已支持 `me`、品牌列表、切换当前品牌、logout
  - 兼容历史明文密码登录，并会在成功登录时自动升级为哈希密码
- `apps/web/src/services/auth-session.ts`
  - 前端登录态本地存储层
  - 负责保存 `accessToken`、`refreshToken`、当前品牌和用户信息
- `apps/web/src/services/auth.ts`
  - 前端认证服务层
  - 已接入 `login`、`me`、`brands`、`switch-brand`、`logout`
- `apps/web/src/services/http.ts`
  - 当前已支持自动附带 `Authorization`、`x-brand-id`
  - `401` 时会自动尝试 `refresh`
- `PersonalCenterModule`：规划中；负责个人中心聚合视图、我的任务、我的作品、我的技能、我的团队
- `BrandsModule`：品牌档案、产品、调研、经营资产、飞书绑定
- `BrandMembersModule`：规划中；负责品牌主账号、子用户邀请、品牌角色与权限
- `BrandsModule`
  - 当前已新增 `/api/brands/:id/members`
  - 当前已新增 `POST /api/brands/:id/members`
  - 当前已新增 `PATCH /api/brands/:id/members/:memberId`
  - 当前已新增 `/api/brands/:id/invites`
  - 当前已新增 `POST /api/brands/:id/invites`
  - 当前已新增 `PATCH /api/brands/:id/invites/:inviteId/revoke`
  - 当前已新增 `PATCH /api/brands/me/invites/read-state`
  - 当前已新增 `PATCH /api/brands/me/invites/accept-by-code`
  - 当前已新增 `GET /api/brands/me/invites/history`
  - 当前已新增 `GET /api/brands/me/invite-notifications`
  - 当前已新增 `PATCH /api/brands/me/invite-notifications/read-state`
  - 已修复 `/api/brands/me/invites*` 与 `/:id/invites*` 的路由优先级冲突，当前终端用户邀请接口会优先命中 `me` 路由
  - 当前已新增 `GET /api/brands/:id/role-audit-logs`
  - 当前已新增 `PATCH /api/brands/:id/transfer-owner`
  - 已开始按当前登录用户校验品牌成员访问范围，并返回当前品牌成员列表与当前用户角色
- `CollectorsModule`：小红书收集、飞书同步、每日热点
- `ReportsModule`：品牌增长报告、可视化报告、全年营销规划、小红书策划与日历
- `WorksModule`：原创笔记作品生成、列表、编辑、删除、作品文件读取
  - 原创/二创配图现在会结构化保存 `coverText`、`imageTexts`，并在出图前把标题/小标签强制注入最终图片 prompt
  - 原创/二创生成图在保存本站副本前会统一规范为 `1242x1660` 的竖版 `3:4`，避免历史横图或方图继续进入作品库
  - 二创链路在“未选产品”时会强约束禁止扩写具体 SKU、价格、门店购买引导，默认优先围绕对标素材的主事件与主场景生成
- `TasksModule`：任务记录与重试
- `TasksModule`
  - 当前已开始按请求登录态过滤用户任务，不再固定读取首个用户
- `MembershipModule`：规划中；负责会员套餐、会员实例与权益判断
- `PointsModule`：规划中；负责积分账户、积分规则、积分流水与返还
- `MediaModule`：媒体资产
- `MediaModule`
  - 当前已开始按请求登录态过滤用户媒体，不再固定读取首个用户
- `OrdersModule`：订单、支付、取消、后台订单视图
- `OrdersModule`
  - 当前已开始按请求登录态过滤订单访问，不再固定绑定首个用户
- `admin/skills-prompts`：后台技能中心；当前技能与提示词已新增 `SkillConfig` / `PromptTemplate` 注册表，生成链路按“数据库优先、文件兜底”读取

### 4.3 管理模块

- `admin/api-providers`
- `admin/billing-rules`
- `admin/knowledge-bases`
- `admin/model-usage`
- `admin/skills-prompts`
- `admin/users-admin`

## 5. 关键数据链路

### 5.1 品牌增长主链路

1. 品牌基础资料进入 `BrandsModule`
2. 小红书与每日热点进入 `CollectorsModule`
3. 报告类生成进入 `ReportsModule`
4. 任务状态进入 `TasksModule`
5. 结果资产进入 `MediaModule` 或品牌相关资产表

### 5.2 小红书数据链路

1. 用户在飞书多维表格中维护品牌/竞品主页链接
2. 前端在 `/brand-growth` 里保存飞书应用配置和飞书副本绑定
3. 后端通过用户级飞书 OAuth 读取飞书表
4. 同步结果沉淀为小红书工作区数据
5. `/xiaohongshu` 页面消费这些结果继续生成策划方案与营销日历

### 5.3 每日热点链路

1. 后端读取 `TIKHUB_API_KEY`
2. `SchedulerModule` 注册每日热点任务
3. `CollectorsModule` 每天 4:00 自动拉取热点
4. 数据写回每日热点工作区
5. `/brand-growth` 的“每日热点”页面直接展示

### 5.3A 营销日历链路

1. 用户在 `/xiaohongshu` 的“营销日历”点击“一键生成”或“生成接下来 7 天”
2. 前端先校验 `品牌增长报告`、`全年营销规划`、`小红书营销策划方案` 是否已存在
3. 后端 `ReportsModule` 创建 `XHS_MARKETING_CALENDAR` 后台任务，并把状态写入任务记录
4. 任务执行时读取品牌资料、小红书收集结果、每日热点、历史营销日历和国内文生文 provider 配置
5. 生成成功后写回新的 7 天营销日历；失败时前端直接展示中文错误

### 5.4 原创笔记链路

1. 用户在 `/xiaohongshu` 的“原创笔记”中选择营销日历选题或自定义选题
2. 页面可选带入产品、封面参考图、配图参考图、配图数量与用户要求
3. 后端 `WorksModule` 串联参考图分析、原创文案、配图提示词与文生图生成
4. 成品图文保存到作品记录，并同步沉淀到“我的作品”
5. `/admin` 技能中心可分别查看原创文案提示词与原创配图提示词

### 5.5 视频笔记链路

1. 用户在 `/xiaohongshu` 的“视频笔记”中选择营销日历选题或自定义选题
2. 页面可选带入产品或参考图，并指定视频模型、时长、是否植入营销策划方案、是否输出视频提示词与附加要求
3. 后端 `WorksModule` 现在统一读取真实 `提示词/short-video-api-studio/short-video-api-studio/SKILL.md` 作为视频文案和视频提示词的共同基准，不再误读 `rewrite_copy` 或工作流说明文档
4. 视频提示词阶段会结构化产出 `businessScene`、`videoType`、`segmentBrief`、`referenceStrategy`、`padImageStrategy`、`continuityRules`、`segmentPrompts`、`fullVideoPrompt`
5. 后端当前只生成 1 条 `fullVideoPrompt` 主成片，不再自动按 `segmentPrompts` 逐段发起额外视频任务
6. 视频后端按顺序逐个回退：只有当前请求失败时，才会继续尝试下一个后端；不会并发生成多个成片
7. 成品视频、视频提示词与图文内容保存到作品记录，并同步沉淀到“我的作品”

### 5.6 技能与提示词注册链路

1. 后台 `/admin` 的技能中心通过 `admin/skills-prompts` 读取技能配置与提示词模板
2. `SkillsPromptsService` 启动时优先检查 PostgreSQL 中的 `SkillConfig`、`PromptTemplate`
3. 若注册表为空，则把 `mock-data` 与真实 `SKILL.md` / `.txt` 回填进数据库
4. `ReportsModule` 与 `WorksModule` 当前已优先从注册表读取品牌增长、小红书原创/二创/视频相关提示词
5. 数据库不可用时，后端才回退到 `mock-data + 文件`

## 6. 当前已确认的真实能力

- `3001` 前端可打开品牌增长页
- `3011` 后端健康检查通过
- 小红书飞书绑定和同步状态可持久化
- 每日热点工作区和手动同步接口已跑通
- 定时器能力已独立为 `SchedulerModule`

## 7. 当前仍属过渡或待完善部分

- `/register` 仍是占位页
- 抖音/视频号/公众号/私域尚未独立落地
- 多品牌切换未完全打开，前台仍偏演示品牌模式
- 部分后端仍存在过渡性 DI 写法，需要继续收敛
- 个人中心已接入第一版真实多用户登录态，并已落地概览页、`/orders`、`/works`、`/tasks`、`/team`、`/invites` 六段前端路由；其中 `orders` 已支持用户级订单查询、状态/类型筛选与订单详情跳转，`works` 已支持用户级作品资产查询、范围/类型筛选、小红书工作台回跳与源文件打开，`team` 已支持成员添加、角色/状态修改、创建邀请、撤回邀请、接受邀请、邀请码加入、邀请链接复制、成员审计日志查看和主账号转移入口；用户技能覆盖层和更细的任务中心能力仍待继续升级
- 后台管理台现已增加独立 `/admin/login` 登录入口，并在 `/admin` 页面按 `SUPER_ADMIN / ADMIN_OPERATOR / FINANCE_OPERATOR / SUPPORT_OPERATOR` 收口后台栏目；非后台角色账号不会再直接进入后台页
- 后台用户管理、会员/积分规则和品牌权限管理仍未形成正式多用户运营体系
- P0 已完成两段半底座：后端登录态、`BrandMember`、`UserSession`、当前用户任务/订单/媒体过滤已落地；前端登录页、token 刷新、个人中心登录态校验与品牌切换已接入，并已开始拆个人中心二级路由

## 8. 维护规则

- 新增页面、模块、接口时，必须同步更新本文件
- 如果只是实现细节变化，但入口、职责、主链路没变，可只更新变更记录
- 若主链路发生变化，应先更新本文件，再继续后续开发
- 若数据库结构或入库边界变化，应同时更新 `docs/database-archive.md`
- 若用户只说“更新一下”，默认本文件与 `docs/site-map-mermaid.md` 一起更新，不再单独等待补充说明
