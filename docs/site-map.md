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

- `/`：统一认证入口，默认展示邀请码注册，并可切换到普通登录；已登录用户会自动回到目标前台页面
- `/brand-growth`：品牌增长策略工作台
- `/xiaohongshu`：小红书工作台
- `/personal-center`：个人中心
- `/personal-center/*`、`/brand-growth`、`/xiaohongshu`、会员/点数/订单等前台工作台页面：统一要求登录后访问，未登录自动回到 `/?next=...`
- `/admin`：后台管理台，仅管理员角色账号可进入
- `/login`：兼容登录页，已接入账号密码登录，并提供回流根页注册入口
- `/register`：兼容注册页，已接入邀请码注册表单，注册成功后自动进入工作台
- `/admin/login`：后台管理员专用登录页
- 后端已新增真实登录态接口：`/api/auth/login`、`/api/auth/register`、`/api/auth/refresh`、`/api/auth/me`、`/api/auth/brands`、`/api/auth/switch-brand`、`/api/auth/logout`

### 2.2 当前主要用户链路

1. 品牌建档
2. 收集数据
3. 生成品牌增长报告
4. 生成可视化报告/半年营销规划
5. 进入小红书继续策划、排期和内容生产
6. 到个人中心查看任务、订单、作品

### 2.3 部署与运行入口

- GitHub 自动部署入口：`.github/workflows/deploy.yml`
- 生产 PM2 进程定义：`ecosystem.config.cjs`
- 当前部署约束：
  - 部署前会先检查服务器仓库 `git status --porcelain -uall` 是否为空；如发现额外文件或未收口改动，直接终止部署
  - 生产前后端统一通过 `PM2 + ecosystem.config.cjs` 启动
  - 对第三方运行时 Secret，除了在部署脚本里透传给 `pm2 startOrReload --update-env`，还要在 `ecosystem.config.cjs` 的目标进程 `env` 中显式映射，并在部署后校验该 Secret 已进入目标 PM2 进程
  - `apps/server` 默认通过 `SERVER_HOST=127.0.0.1` 仅监听本机 `3011`
  - `apps/web` 生产启动统一绑定 `127.0.0.1:3001`，外部访问只允许经 `nginx` 反代

## 3. 前端结构地图

### 3.1 品牌增长策略 `/brand-growth`

- 顶部导航：已统一为后台同语言的浅底导航壳，使用短标签徽标与当前栏目高亮
- 左侧导航：已改为目录式浅底菜单，当前仅保留分区与页面按钮本体，去掉上方说明标题头

#### 一级分区

- 品牌资料库
- 收集数据
- 品牌增长报告
- 当前品牌上下文：
  - 前端请求默认优先读取当前登录品牌，不再把工作区硬编码到 `DEMO_BRAND_ID`
  - `brand-growth/workspace.tsx` 进入页面时会先调用 `/api/auth/me` 校正当前登录用户的 `currentBrandId`，再加载品牌档案、飞书绑定、收集工作区与报告工作区，避免浏览器残留 demo brand 把整页请求继续打到 `br_super_admin_demo`
  - 后端 `brands / reports / collectors / daily-hotspots` 相关品牌接口已补当前用户品牌访问校验，避免新账号继续读到演示品牌或其他品牌数据

#### 品牌资料库

- 品牌背景资料
- 产品资料库
- 品牌运营情况
- 第三方数据
- 企业经营数据

#### 收集数据

- 小红书平台
  - 当前“小红书平台”中的“打开飞书模板”入口已直接指向最新的飞书 Base 副本链接 `https://acn8dzidreuv.feishu.cn/base/Q4UNbUmY1acU9rsiYaAcobZwnte?from=from_copylink`
  - 飞书同步排障阶段临时加入的“同步诊断”折叠面板已从正式页面移除；作品卡片默认只保留正文、指标、附件与作品链接等用户向信息
- 每日热点

#### 品牌增长报告

- 生成品牌增长报告
  - 当前已改为后台任务异步生成；点击“生成报告”后接口立即返回工作区，前端轮询 `latestTask`
  - 当前品牌增长报告在运行时会严格先尝试后台技能中心当前选中的首选模型，再按兼容 provider 继续 fallback；失败提示会展示实际尝试顺序，避免把最后一次失败误看成第一跳模型
- 品牌增长可视化报告
- 半年营销规划
- 当前三条报告链路会先按技能配置尝试匹配兼容的文本 provider；若技能默认 provider 与链路不兼容，例如把可视化报告误绑到 `图像生成`，后端会自动回退到正确的文本 runtime，并按 provider 白名单收敛可用模型
- 参考变更：`docs/changes/2026-05-13-brand-growth-report-provider-routing-fix.md`
- 参考变更：`docs/changes/2026-05-13-brand-growth-report-async-task.md`
- 参考变更：`docs/changes/2026-05-13-brand-growth-report-model-priority-and-attempt-order.md`
- 参考变更：`docs/changes/2026-05-13-half-year-marketing-plan-refactor.md`

### 3.2 小红书 `/xiaohongshu`

- 顶部导航：已统一为后台同语言的浅底导航壳，使用短标签徽标与当前栏目高亮
- 左侧导航：已改为更简化的目录式浅底菜单，仅保留分区按钮本体
- 营销策划方案
  - 当前页面已去掉 Hero 徽标和重复说明，聚焦标题、状态、动作按钮与 Markdown 编辑/预览主链路
- 素材库
  - 当前素材库中的飞书图片/视频预览若命中站内 `feishu-media` 代理，会先通过前端鉴权请求拉取 blob，再转 object URL 给卡片和灯箱展示，避免浏览器媒体请求不带 Bearer Token 导致空白
  - 参考变更：`docs/changes/2026-05-13-xiaohongshu-assets-protected-media-preview.md`
- 营销日历
  - 当前“生成接下来 7 天”通过后台任务异步生成；任务状态会显示 `QUEUED / RUNNING / SUCCESS / FAILED`
- 生成依赖 `品牌增长报告`、`半年营销规划`、`小红书营销策划方案` 三项前置输入，并读取 `第三方api接口文生文国内.txt` 中的国内文生文 provider 配置
- 原创笔记
  - 已支持原创图文作品列表、添加弹窗、编辑、删除
  - 已接入营销日历选题、产品选择、参考图上传、配图数量、用户要求
  - “封面参考图 / 配图参考图”已升级为模板图库选择 + 本地上传兜底双入口；模板选中后会先下载成 `File`，再继续复用现有参考图分析与生图链路
  - 原创模板图库当前通过 `GET /api/works/xiaohongshu/original/reference-templates` 返回分类与模板清单，并通过站内 `/api/works/xiaohongshu/original/reference-templates/:templateId/asset` 受控读取图片资源
  - 本地开发因前端走 `3001`、后端走 `3011` 属于跨端口请求；模板资源接口现已暴露 `Content-Disposition` 给浏览器端 `fetch`，回填表单时可保留真实模板文件名，不再退回显示 `asset`
  - 创作成功后会自动刷新任务状态和作品列表；新任务按当前登录用户归属，可在个人中心任务中心继续查看
  - 当前支持在小红书工作区和个人中心任务中心对运行中的任务发起 `取消任务`；取消属于 best-effort 中断，会尽量阻止后续步骤继续写回成功状态
- 二创笔记
  - 已支持二创图文作品列表、添加弹窗、编辑、删除
  - 已接入素材库作品选择、产品选择、用户要求
  - 创作成功后会自动刷新任务状态和作品列表；新任务按当前登录用户归属，并可在工作区内直接取消最近一次运行中任务
- 视频笔记
  - 已支持视频作品列表、添加弹窗、编辑、删除
  - 已接入营销日历选题、产品选择、参考图上传、视频模型、时长、提示词输出和双段用户要求
  - 视频模型下拉现通过 `/api/works/brands/:brandId/xiaohongshu/video/providers` 动态读取后台当前启用的视频 Provider，不再写死前端枚举
  - 创作成功后会自动刷新任务状态和作品列表；新任务按当前登录用户归属，并可在工作区内直接取消最近一次运行中任务
- 当前品牌上下文：
  - 前端工作区聚合读取、作品生成、素材代理和报告依赖现统一优先读取当前登录品牌
  - `xiaohongshu/page.tsx` 进入页面时会先调用 `/api/auth/me` 刷新当前品牌，再决定营销方案、营销日历、作品列表和收集工作区应该读取哪个 `brandId`，避免旧会话把页面长期锁在 demo 工作区
  - `xiaohongshu/assets-workspace.tsx` 生成飞书素材图片/视频代理 URL 时也会显式透传当前真实 `brandId`，避免素材库媒体预览继续回退到 `DEMO_BRAND_ID`
  - 后端按 `brandId` 读取的小红书收集、营销方案、营销日历等接口已补当前用户品牌访问校验，避免跨用户串读数据

### 3.3 个人中心 `/personal-center`

- 个人信息
- 点数流水
- 会员订单
- 充值明细
- 任务记录
- 我的作品
- 当前已接入真实登录态：
  - 无登录态时统一跳转 `/?next=...`
  - 页面会通过 `/api/auth/me` 获取当前用户和品牌信息
  - 已支持当前品牌切换与退出登录
  - 请求层会自动附带 `Authorization` 和 `x-brand-id`
- 前台品牌列表已收口为真实 `BrandMember` 可访问范围，不再因为后台 `SUPER_ADMIN` 身份在个人中心直接暴露全品牌
- 当前采用“真数据优先、局部种子兜底”：
  - 用户资料优先走真实接口
  - 点数流水、订单、任务、作品任一接口失败时仅该部分回退演示数据
- 当前已进入二级路由阶段：
  - `/personal-center`：个人中心概览页，已从旧聚合页收成简洁首页；当前只保留账号摘要、品牌上下文、待处理事项、最近动态和快捷入口，不再在根页堆点数流水、订单列表、任务列表与作品长列表，详细内容统一进入对应二级工作区
- `/personal-center`：概览页中的“账号与品牌”卡现已补充“编辑账号资料”直达入口，便于从首页快速进入资料维护
- `/personal-center/orders`：订单中心第一版，已接真实 `/orders` 列表接口，按当前登录用户查看会员订单和点数充值记录，支持状态筛选、类型筛选、关键词搜索、品牌上下文切换、筛选金额汇总和订单详情跳转；当前订单仍主要按用户维度过滤，品牌级订单归属后续继续扩展
- `/personal-center/works`：作品中心第一版，已接真实 `/media` 列表接口，按当前登录用户查看 HTML、图片、视频与文档资产，支持作品范围筛选、类型筛选、关键词搜索、品牌上下文切换、小红书作品回跳与源文件打开；当前作品仍主要按用户维度过滤，品牌内共享与更细作品分类后续继续扩展
- `/personal-center/skills`：技能中心已升级为“平台基线 + 用户覆盖”双层结构；页面已去掉第一版的大段说明型区块，改为左侧技能列表、右侧技能编辑器，支持按当前登录用户和当前品牌读取真实 `/api/user-skills`，可修改技能名称、默认模型、技能说明以及关联提示词的模型/温度/Tokens/内容，并支持保存到用户自己的技能库、重置回后台平台基线、品牌上下文切换与退出登录；后台继续通过 `/admin/skills` 与 `/admin/prompts` 维护平台技能基线
- `/personal-center/security`：安全设置第二版，已从纯只读会话页升级为“账号资料 + 会话安全”组合页；当前支持用户自助编辑用户名、头像地址、手机号，支持上传头像到 OSS 并通过站内头像接口读取，支持查看邮箱验证状态、账号与品牌上下文、access/refresh token 持有状态、自动 refresh 机制说明和退出当前登录态入口；邮箱改绑、密码修改、会话列表、多端下线后续继续扩展
- `/personal-center/invites`：邀请通知中心，现已接入邀请站内消息表第一版；统一查看待处理、已接受、已过期和已撤回的品牌邀请，并支持直接接受待处理邀请、后端持久化未读/已读、只看未读、状态筛选、关键词搜索、排序、分页总览、URL 参数状态回放、复制当前筛选链接与一键重置筛选
- `/personal-center/tasks`：用户任务中心，已接真实任务接口、品牌切换、失败重试与运行中任务取消；小红书原创/二创/视频任务现按当前登录用户归属，可在这里直接追踪
- `/personal-center/team`：团队协作页已收口为 `Owner` 主控模型；团队成员列表仍走真实 `BrandMember` 数据，但只有 Owner 可邀请成员、查看审计与调整角色。“直接添加成员”改成对指定账号发送待确认邀请，“创建邀请”改成纯邀请链接生成，手动邀请码加入入口已移除；未登录打开邀请链接时会保留 `inviteCode` 并回流到登录后页面
- 前台共享顶栏已新增全局待处理邀请提示条，登录后若存在待接受邀请，会在导航下方直接提醒，并每 60 秒自动刷新一次邀请状态；提示条已联动未读待处理数量
  - 该提示条现默认跳转到 `/personal-center/invites`
- 规划中：
  - `/personal-center/security`：登录态、密码、安全设置

### 3.4 后台管理 `/admin`

- 仪表盘
- 订单管理
- 会员/积分规则
- 用户管理
- 用户管理当前已升级为“筛选区 + 用户表格 + 弹窗详情编辑”结构：
  - 支持按关键词、会员等级、账号状态、系统角色、邮箱验证状态筛选
  - 支持普通用户和管理员账号统一查看
  - 支持点进单个账号详情后，通过弹窗编辑用户名、手机号、邮箱、头像地址、会员等级、账号状态、系统角色、积分余额、邮箱验证状态与密码
  - 支持直接删除单个账号，并在删除前弹出确认框
  - 用户列表已移除“角色”“会员”列，操作区保留统一样式按钮
  - 前端用户管理已从 `admin/page.tsx` 中拆到独立组件 `users-management-panel.tsx`
  - 后端用户管理已补 `GET /api/admin/users/:id`、筛选型 `GET /api/admin/users` 与 `DELETE /api/admin/users/:id`
- 任务管理
- 品牌成员与权限管理
- API/模型消耗管理
- 技能中心
  - 左侧目录树：品牌增长策略 / 小红书 / 抖音，点击一级项后展开下级树
  - 左侧二级分类：按业务模块展开，例如品牌增长报告、半年营销规划
  - 左侧三级分类：具体技能项，例如“品牌增长报告-生成品牌增长报告”
  - 小红书内容生产：已拆分为 `原创笔记-原创文案`、`原创笔记-原创配图`、`二创笔记-二创文案`、`二创笔记-二创配图`、`视频笔记-视频创作`
  - 当前目录树样式：已改为目录式展开菜单，与左侧后台导航保持同一视觉语言
  - 中间只展示当前选中三级技能的一张精简详情卡
  - 详情卡字段：标题、技能名称、状态、默认模型、点数成本、更新时间、技能提示词、保存技能
  - 后台技能中心当前所有文本类技能已统一运行逻辑：先严格尝试当前卡片里选中的默认模型，再按兼容 provider / model 继续 fallback；失败时统一展示实际尝试顺序
  - 技能提示词：后台当前会自动聚合真实 `SKILL.md` 与技能源目录下的顶层 `.md` / `.txt` 参考资料；原创笔记已拆分为“原创文案”和“原创配图”两套提示词分别呈现
  - 聚合型提示词在后台当前以只读方式展示，需回到原始提示词目录维护，避免把整份聚合内容误写回单个 `SKILL.md`
  - 参考变更：`docs/changes/2026-05-13-admin-skill-center-reference-bundles.md`
  - 参考变更：`docs/changes/2026-05-13-global-skill-model-priority-unification.md`
- 知识库管理
- API Provider 管理
  - 当前后台 `/admin` 的接口供应商页已升级为第三方接口配置中心，可统一维护 `名称 / Provider 类型 / Base URL / 教程文档链接 / API Key / 默认模型 / Organization / Project / Timeout / Stream / 自定义 Headers / 扩展参数 / 模型白名单 / 备注`
  - 当前已作为 `ReportsModule` 与 `WorksModule` 的运行时真源；报告生成、原创/二创/视频生成与视频模型下拉都通过 `runtimeKey` 读取后台激活中的 Provider 配置
  - 当前列表区已补管理型交互：支持按名称/模型/Base URL/备注搜索，支持按状态与 Provider 类型筛选，并显示结果数与状态分布
  - 当前创建表单与编辑卡片中的 API Key 默认遮挡显示，需按需手动展开；`自定义 Headers` / `扩展参数` 默认折叠为摘要，避免配置中心再次退化成长表单墙
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
  - 已支持邀请码注册；注册时会校验 `RegistrationInviteCode` 是否存在且未被消费，并在成功注册后一次性标记使用状态
  - 已移除 `register/email-code` 注册验证码发送链路；当前不再要求注册前完成邮箱验证码校验
  - 已支持 `PATCH /auth/profile`，允许当前登录用户自助更新昵称、头像地址和手机号
  - 已支持 `POST /api/auth/profile/avatar` 上传头像到 OSS，并通过 `GET /api/auth/users/:userId/avatar/:fileName` 返回站内可访问头像
  - 已支持 `me`、品牌列表、切换当前品牌、logout
  - 兼容历史明文密码登录，并会在成功登录时自动升级为哈希密码
- `apps/web/src/services/auth-session.ts`
  - 前端登录态本地存储层
  - 负责保存 `accessToken`、`refreshToken`、当前品牌和用户信息
- `apps/web/src/services/auth.ts`
  - 前端认证服务层
  - 已接入 `login`、`register`、`me`、`profile update`、`brands`、`switch-brand`、`logout`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - 当前会在初始化工作区前先通过 `/api/auth/me` 校正真实品牌上下文，再并行读取品牌档案、飞书绑定、小红书收集、每日热点和报告相关工作区
  - 当前 `FEISHU_XHS_TEMPLATE_URL` 已改为最新飞书 Base 副本链接，品牌增长页顶部与收集区的“打开飞书模板”入口统一复用这一路径
  - 当前品牌增长页里的飞书媒体地址会先校验是否为真实飞书/Lark 附件链接；命中飞书附件才走站内 `feishu-media` 代理，普通外链资源继续直出，非法串直接丢弃
- 当前品牌增长策略已收口为 `Owner` 专属工作区：非 Owner 进入 `/brand-growth` 时不再继续加载操作面板，而是提示前往小红书或个人中心；对应品牌资料写接口、飞书绑定和报告生成接口也同步做 `Owner` 鉴权
 - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - 当前不再默认展示飞书同步原始字段、来源表格和来源记录等临时诊断内容；排障信息改回仅在开发时临时加挂，不作为正式界面的一部分
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - 当前会在初始化工作区前先通过 `/api/auth/me` 校正真实品牌上下文，再读取营销方案、营销日历、作品列表、视频 Provider 与素材库数据
- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
  - 当前素材库预览图片/视频时，会显式把当前工作区 `brandId` 透传给飞书媒体代理地址，避免附件预览继续误打到 demo brand
  - 对受保护的飞书代理资源，当前会先用前端鉴权请求拉 blob，再以 object URL 渲染卡片和灯箱；普通外链继续直出
  - 参考变更：`docs/changes/2026-05-13-xiaohongshu-assets-protected-media-preview.md`
- `apps/web/src/services/http.ts`
  - 当前已支持自动附带 `Authorization`、`x-brand-id`
  - `401` 时会自动尝试 `refresh`
  - 浏览器端默认走同域 `/api`
- `apps/web/src/app/api/[...path]/route.ts`
  - 生产同域 API 统一入口：将 `/api/*` 显式代理到 `127.0.0.1:3011/api` 或 `INTERNAL_API_BASE_URL`
  - 用于替代对长响应 POST 不稳定的 `next.config.ts` rewrite
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
- 当前团队成员管理、邀请创建、邀请撤回与成员审计已收口为 `Owner` 权限；`POST /api/brands/:id/members` 不再直接写入成员，而是改为给已注册账号创建待确认邀请
- 当前 `POST /api/brands/:id/invites` 改为只生成邀请链接，不再要求输入邀请账号
- 参考变更：`docs/changes/2026-05-13-team-collaboration-owner-guard-and-invite-confirmation.md`
  - 品牌资料库中的产品图片与资料附件现已统一写入 OSS，并分别通过 `/api/brands/:id/product-images/:fileName`、`/api/brands/:id/asset-files/:fileName` 代理读取
- `CollectorsModule`：小红书收集、飞书同步、每日热点
  - 飞书作品同步时会把附件字段先按图片/视频类型分流，再决定写入 `imageList` 或 `videoUrl`，避免把任意附件下载链接都当图片缩略图渲染
- `ReportsModule`：品牌增长报告、可视化报告、半年营销规划、小红书策划与日历
- `ReportsModule`
  - 品牌增长报告、可视化报告、半年营销规划、小红书营销策划方案 4 类 HTML 产物现已真实写入 OSS
  - 报告产物统一通过 `/api/reports/brands/:brandId/assets/:fileName` 代理读取，不再只保存占位外链
  - 报告生成链路当前不再盲信技能里写入的 provider 名称；会先校验 `runtimeKey` 是否与当前文本生成任务兼容，再决定优先 provider 与可用模型，避免把文本报告请求误发到图像 provider 或与白名单不兼容的模型
  - 品牌增长报告现已对齐可视化报告/半年营销规划的后台任务模式：`generate -> create task -> background run -> persist asset -> polling latestTask`
  - 品牌增长报告现以后台技能中心当前首选模型作为真实第一跳模型；若首选模型失败，再按兼容 provider 顺序 fallback，并把实际尝试顺序写入失败提示
  - 品牌增长可视化报告、半年营销规划、小红书营销策划方案与营销日历现也对齐相同模型优先级规则，不再只让单条报告链路先吃后台默认模型
  - 半年营销规划当前以 `/reports/brands/:brandId/half-year-marketing-plan` 作为主读取与生成路径，同时保留旧 `annual-marketing-plan` 路径兼容历史前端和外部调用
  - 本地开发若未配置 OSS，`OssStorageService` 会临时回退到 `.runtime/local-oss/<storageKey>`；但 `reports/<brandId>/<fileName>` 和站内 `/api/reports/.../assets/...` 读取接口保持不变，避免本地与正式结构分叉
  - 本地浏览器端若运行在 `localhost/127.0.0.1`，统一 HTTP 客户端会优先直连 `http://127.0.0.1:3011/api`，绕开 Next `/api` rewrite 对长响应 POST 的 `ECONNRESET` 问题；生产环境继续走同域 `/api`
  - 线上 `17ai.site` 现应通过 `apps/web/src/app/api/[...path]/route.ts` 承接同域 `/api` 请求，再转发到 `3011/api`，避免 `next.config.ts` rewrite 在品牌增长报告这类长请求上触发 `502/socket hang up`
  - 参考变更：`docs/changes/2026-05-13-brand-growth-report-provider-routing-fix.md`
  - 参考变更：`docs/changes/2026-05-13-brand-growth-report-async-task.md`
  - 参考变更：`docs/changes/2026-05-13-brand-growth-report-model-priority-and-attempt-order.md`
  - 参考变更：`docs/changes/2026-05-13-local-report-storage-fallback.md`
  - 参考变更：`docs/changes/2026-05-13-local-web-api-direct-backend.md`
  - 参考变更：`docs/changes/2026-05-13-production-api-route-proxy-fix.md`
  - 参考变更：`docs/changes/2026-05-13-half-year-marketing-plan-refactor.md`
- `WorksModule`：原创笔记作品生成、列表、编辑、删除、作品文件读取
  - 原创/二创配图现在会结构化保存 `coverText`、`imageTexts`，并在出图前把标题/小标签强制注入最终图片 prompt
  - 原创/二创生成图在保存本站副本前会统一规范为 `1242x1660` 的竖版 `3:4`，避免历史横图或方图继续进入作品库
  - 二创链路在“未选产品”时会强约束禁止扩写具体 SKU、价格、门店购买引导，默认优先围绕对标素材的主事件与主场景生成
  - `works` 生成出来的 HTML、图片、视频现已统一持久化到 OSS，前端仍通过 `/api/works/brands/:brandId/assets/:fileName` 读取
  - 原创参考模板库现由 `xhs-original-reference-templates.generated.ts` 作为静态清单真源，配合 `scripts/import-xhs-original-reference-templates.cjs` 把本地素材批量导入 OSS 或 `.runtime/local-oss`
  - 原创参考模板资产统一通过 `/api/works/xiaohongshu/original/reference-templates/:templateId/asset` 站内接口读取，不直接暴露底层 OSS 链接
  - 原创文案、原创配图提示词、二创文案、二创配图提示词、参考图分析、图像生成、视频文案、视频提示词、视频成片生成现统一通过后台 API Provider 配置中心读取运行时模型配置
  - 原创文案、原创配图提示词、二创文案、二创配图提示词、视频文案、视频提示词现已统一按后台技能中心当前默认模型作为真实第一跳模型；若失败再继续 fallback，并把实际尝试顺序写入错误提示
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
- `admin/skills-prompts`：后台技能中心；当前技能与提示词已新增 `SkillConfig` / `PromptTemplate` 注册表，技能元数据继续走“数据库优先、Mock 兜底”，但提示词正文会优先回源读取真实 `SKILL.md + 同目录参考资料`
  - 当前自动聚合 `SKILL.md`、`00_资料总索引.md`、模块参考稿、原始 `.txt` 与补出的 `.md` 参考文档，不纳入 `outputs/`、`scripts/`、`__pycache__/` 等运行产物目录
  - 参考变更：`docs/changes/2026-05-13-admin-skill-center-reference-bundles.md`

### 4.3 管理模块

- `admin/api-providers`
  - 当前已支持后台真实读取与保存接口供应商配置；数据库可用时优先读写 `ApiProviderConfig` 运行时表，不可用时回退到 `mock-data`
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
5. 结果资产进入 `MediaModule` 或品牌相关资产表，并用 `storageKey + 站内 sourceUrl/fileUrl` 指向 OSS 真源

### 5.2 小红书数据链路

1. 用户在飞书多维表格中维护品牌/竞品主页链接
2. 前端在 `/brand-growth` 里保存飞书应用配置和飞书副本绑定；品牌域 service 若已显式传入 `brandId`，必须优先使用该值，不能再被本地会话缓存品牌覆盖
3. 后端通过用户级飞书 OAuth 读取飞书表；同步时采用“表名优先、内容补齐缺项、唯一表去重分配”的匹配策略，避免只命中部分表名后直接跳过剩余表，也避免同一张表被多个角色重复占用并抬高命中表数
4. 同步结果沉淀为小红书工作区数据
5. `/xiaohongshu` 页面消费这些结果继续生成策划方案与营销日历

### 5.3 每日热点链路

1. 后端读取 `TIKHUB_API_KEY`；生产部署时必须把该 Secret 显式传给 PM2 运行环境，并在 `ecosystem.config.cjs` 的 `ai-omni-server.env` 中映射 `process.env.TIKHUB_API_KEY`
2. `SchedulerModule` 注册每日热点任务
3. `CollectorsModule` 每天 4:00 自动拉取热点
4. 数据写回每日热点工作区；若当天快照缺失，工作区接口会在读取时自动补抓一次
5. `/brand-growth` 的“每日热点”页面直接展示，并支持“手动搜索”即时刷新当天数据

### 5.3A 营销日历链路

1. 用户在 `/xiaohongshu` 的“营销日历”点击“一键生成”或“生成接下来 7 天”
2. 前端先校验 `品牌增长报告`、`半年营销规划`、`小红书营销策划方案` 是否已存在
3. 后端 `ReportsModule` 创建 `XHS_MARKETING_CALENDAR` 后台任务，并把状态写入任务记录
4. 任务执行时读取品牌资料、小红书收集结果、每日热点、历史营销日历和国内文生文 provider 配置
5. 生成成功后写回新的 7 天营销日历；失败时前端直接展示中文错误

### 5.4 原创笔记链路

1. 用户在 `/xiaohongshu` 的“原创笔记”中选择营销日历选题或自定义选题
2. 页面可选带入产品、封面参考图、配图参考图、配图数量、是否植入营销策划方案与用户要求；参考图既可本地上传，也可从模板图库选择
3. 模板图库会先从 `/api/works/xiaohongshu/original/reference-templates` 拉分类与模板清单，支持关键词搜索、点击提示与每页 10 张分页；用户选中后再通过站内模板资产接口下载成 `File`
4. 后端 `WorksModule` 串联参考图分析、原创文案、`xhs-original-image-prompt` 配图提示词与文生图生成
5. 当用户选择 `不植入营销策划方案` 时，原创生成可直接基于营销日历、产品、参考图和用户要求继续执行，不再强依赖先生成营销策划方案
6. 原创模板素材统一走 `reference-templates/xiaohongshu/original/...` 存储前缀；开发态未配置 OSS 时可临时回退到 `.runtime/local-oss`
7. 生成任务优先归属当前登录用户，并在创作完成后同步刷新小红书工作区与个人中心任务视图
8. 成品图文保存到作品记录，并同步沉淀到“我的作品”
9. `/admin` 技能中心可分别查看原创文案提示词与原创配图提示词
10. 模板库当前已移除 `夏日出行露营city walk小红书封面` 与 `夏日出行露营city walk小红书封面 / 效果图` 两组模板，封面模板与配图模板入口共用同一份裁剪后的清单
11. 参考变更：`docs/changes/2026-05-14-xhs-original-reference-template-library.md`、`docs/changes/2026-05-14-xhs-note-marketing-plan-toggle.md`、`docs/changes/2026-05-14-xhs-template-picker-pagination-and-pruning.md`

### 5.4B 二创笔记链路

1. 用户在 `/xiaohongshu` 的“二创笔记”中从素材库选择一条已入库作品
2. 页面可选带入产品、是否植入营销策划方案与用户要求
3. 后端 `WorksModule` 基于素材库作品、二创文案提示词、二创配图提示词与文生图链路生成成品
4. 当用户选择 `不植入营销策划方案` 时，二创生成可直接基于素材库内容、产品信息和用户要求继续执行，不再强依赖先生成营销策划方案
5. 生成任务优先归属当前登录用户，并在创作完成后同步刷新小红书工作区与个人中心任务视图
6. 成品图文保存到作品记录，并同步沉淀到“我的作品”
7. 参考变更：`docs/changes/2026-05-05-rewrite-note-workflow.md`、`docs/changes/2026-05-14-xhs-note-marketing-plan-toggle.md`

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
3. 若注册表为空，则把 `mock-data` 与真实 `SKILL.md + 同目录参考资料` 回填进数据库
4. `ReportsModule` 与 `WorksModule` 当前已优先从注册表读取品牌增长、小红书原创/二创/视频相关提示词
5. 数据库已有旧内容时，后台读取链路仍会优先回源聚合文件内容，避免历史旧 `PromptTemplate.content` 把新参考资料挡住
6. 数据库不可用时，后端才回退到 `mock-data + 文件`
7. 参考变更：`docs/changes/2026-05-13-admin-skill-center-reference-bundles.md`

## 6. 当前已确认的真实能力

- `3001` 前端可打开品牌增长页
- `3011` 后端健康检查通过
- 小红书飞书绑定和同步状态可持久化
- 每日热点工作区和手动同步接口已跑通
- 定时器能力已独立为 `SchedulerModule`
- `works` 作品文件已切到纯 OSS 持久化，站内资产接口可直接代理读取
- `reports` HTML 产物已切到 OSS 持久化，站内报告资产接口可直接代理读取
- 品牌产品图、品牌资料附件和用户头像已切到 OSS 持久化

## 7. 当前仍属过渡或待完善部分

- `/` 已改为统一认证入口，默认展示邀请码注册；`/login`、`/register` 作为兼容入口保留
- 抖音/视频号/公众号/私域尚未独立落地
- 多品牌切换底座已接入登录态与当前品牌上下文，但更多页面的细粒度成员权限、品牌内共享和后台运营闭环仍待继续收口
- 部分后端仍存在过渡性 DI 写法，需要继续收敛
- `apps/server/src/common/mock-data.ts` 中仍保留少量 `oss.example.com` 演示占位链接，尚未全部替换为真实站内资源路径
- 个人中心已接入第一版真实多用户登录态，并已落地概览页、`/orders`、`/works`、`/skills`、`/security`、`/tasks`、`/team`、`/invites` 八段前端路由；其中 `orders` 已支持用户级订单查询、状态/类型筛选与订单详情跳转，`works` 已支持用户级作品资产查询、范围/类型筛选、小红书工作台回跳与源文件打开，`skills` 已支持平台技能基线查看、状态筛选与提示词场景参考，`security` 已支持当前浏览器登录态、token 持有状态、品牌上下文与退出入口可视化，`team` 已支持成员添加、角色/状态修改、创建邀请、撤回邀请、接受邀请、邀请码加入、邀请链接复制、成员审计日志查看和主账号转移入口；真正的用户技能覆盖层、更细的任务中心能力与安全设置写操作仍待继续升级
- 后台管理台现已增加独立 `/admin/login` 登录入口，并在 `/admin` 页面按 `SUPER_ADMIN / ADMIN_OPERATOR / FINANCE_OPERATOR / SUPPORT_OPERATOR` 收口后台栏目；非后台角色账号不会再直接进入后台页
- 注册当前已切为邀请码准入；项目内已预置 300 个 6 位邀请码，并通过 seed 写入 `RegistrationInviteCode`
- 后台用户管理已进入“单用户弹窗编辑”阶段，但批量操作、分页排序和更完整的品牌权限运营闭环仍待继续补齐
- P0 已完成两段半底座：后端登录态、`BrandMember`、`UserSession`、当前用户任务/订单/媒体过滤已落地；前端登录页、token 刷新、个人中心登录态校验与品牌切换已接入，并已开始拆个人中心二级路由

## 8. 维护规则

- 新增页面、模块、接口时，必须同步更新本文件
- 如果只是实现细节变化，但入口、职责、主链路没变，可只更新变更记录
- 若主链路发生变化，应先更新本文件，再继续后续开发
- 若数据库结构或入库边界变化，应同时更新 `docs/database-archive.md`
- 若用户只说“更新一下”，默认本文件与 `docs/site-map-mermaid.md` 一起更新，不再单独等待补充说明
