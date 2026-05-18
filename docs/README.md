# AI全域运营系统文档中心

## 目的

本目录用于沉淀项目的结构化文档，避免随着系统复杂度上升，出现“功能已存在但没人说得清”“改动已发生但找不到原因”的情况。

从现在开始，代码修改默认同时更新文档。

## 文档分层

### 1. 全站地图

- 文件：`docs/site-map.md`
- 作用：记录系统当前有哪些页面、模块、接口、主链路，以及各部分之间的依赖关系
- 更新时机：新增页面、模块、接口、主流程，或调整入口关系时
- 可视化补充：`docs/site-map-mermaid.md`
- 作用：用 Mermaid 图把页面、工作区、service、API、模块、数据模型和运行脚本串成一张可追踪结构图

### 2. 变更记录

- 目录：`docs/changes/`
- 作用：记录每次重要代码修改的背景、目标、方案、影响范围、验证方式和后续事项
- 更新时机：每次有实际代码修改时

### 3. 专题复盘

- 示例：`docs/brand-growth-retro-2026-05-04.md`
- 作用：对某一阶段、某一问题、某一链路做深入复盘，不替代日常变更记录

### 4. 开发规范

- 文件：`docs/engineering-standards.md`
- 作用：沉淀前端、后端、扩展、资源、文档和 Git 的统一开发规则，作为后续开发默认遵循的基线
- 更新时机：发现新的工程共性问题、调整默认架构边界、确定新的通用约束时

### 5. 开发交付清单

- 文件：`docs/development-delivery-checklist.md`
- 作用：定义每次开发前必须明确哪些信息、开发后必须补齐哪些记录，作为任务交付闭环清单
- 更新时机：当开发流程、交付要求、必填信息项发生变化时

### 6. 数据库存档

- 文件：`docs/database-archive.md`
- 作用：记录数据库构建方式、正式表结构、业务板块与数据表映射，以及仍处于 mock / 文件过渡态的部分
- 更新时机：新增或调整 `prisma/schema.prisma`、迁移文件、持久化结构、技能/提示词注册表或业务板块入库边界时

### 7. 专项方案

- 文件：`docs/personal-center-multi-user-system-plan.md`
- 作用：记录个人中心、多用户、品牌成员协作、任务中心、用户技能覆盖层、会员积分和后台用户管理的整体目标方案与执行路径
- 更新时机：相关模块的权限模型、数据模型、执行阶段或页面结构方案发生变化时
- 文件：`docs/system-refactor-roadmap.md`
- 作用：记录系统按“不影响现有业务”的方式分阶段拆结构、收口性能与控制膨胀的执行路线
- 更新时机：当重构阶段、目标边界、优先级或拆分顺序发生变化时

## 记录原则

### 全站地图必须回答

1. 现在系统有哪些真实功能
2. 每个功能入口在哪里
3. 前后端分别由哪些模块承接
4. 哪些是已完成、哪些是占位、哪些是过渡方案

### 变更记录必须回答

1. 为什么改
2. 改了什么
3. 影响哪些页面、接口、模块
4. 如何验证
5. 还有什么风险或后续事项

## 执行约定

- 代码变更与文档变更视为同一工作的一部分
- 重要功能完成后，至少新增一条 `docs/changes/*.md`
- 如果本次修改的是已有页面、已有工作区或已有链路，开始开发前必须回看 `docs/site-map.md` / `docs/site-map-mermaid.md` 对应条目与最近相关的 `docs/changes/*.md`
- 如果准备采用的实现方式与既有结构或逻辑不一致，必须先询问用户并确认后再开发
- 涉及系统结构变化时，必须同步更新 `docs/site-map.md`
- 涉及开发流程、交付要求、记录清单变化时，必须同步更新 `docs/development-delivery-checklist.md`
- 涉及数据库结构、持久化边界或模块入库路径变化时，必须同步更新 `docs/database-archive.md`
- 涉及大模块技术路线、权限模型、数据分层或执行路径变化时，必须同步更新对应专项方案文档
- 更新 `docs/site-map.md` 时，要把本次对应的 `docs/changes/*.md` 作为参考变更挂到相关位置
- 如果只是很小的样式或文案调整，可合并记录到最近一次相关变更中，但不能完全不记

## 近期重点变更

- `docs/changes/2026-05-10-auth-invite-registration-and-gated-frontend.md`
  - 前台统一改为“根页认证入口 + 邀请码注册 + 工作台全局登录拦截”，后台继续保持管理员专用登录入口
- `docs/changes/2026-05-10-deploy-hardening-and-non-root-runtime.md`
  - GitHub Actions 部署前新增服务器工作区阻断，生产 PM2 进程统一切到普通用户并收口到 `ecosystem.config.cjs`，同时增加本机端口和健康检查
- `docs/changes/2026-05-17-deploy-worktree-auto-backup.md`
  - 在保留服务器现场追溯资料的前提下，把自动部署从“发现脏工作区直接失败”升级为“先备份 `git status/diff/文件快照`，再自动收口并继续部署”
- `docs/changes/2026-05-10-oss-phase-2-report-brand-avatar-assets.md`
  - `reports` HTML 产物、品牌资料上传素材、用户头像统一接到 OSS，站内保留稳定资源读取入口
- `docs/changes/2026-05-10-works-pure-oss-storage.md`
  - `works` 作品链路改为纯 OSS 存储，站内保留统一资产读取接口，不再依赖 `.runtime/generated-works`
- `docs/changes/2026-05-10-admin-user-management-panel.md`
  - 后台用户管理升级为“筛选区 + 用户列表 + 弹窗详情编辑”，并补齐管理员账号编辑、删除与确认弹窗
- `docs/changes/2026-05-11-admin-api-provider-config-center.md`
  - 后台接口供应商页升级为运行时 Provider 真源；`Reports/Works` 统一读取后台配置，小红书视频模型下拉改为动态同步，并继续补齐搜索筛选、API Key 遮挡和 JSON 折叠式管理交互
- `docs/changes/2026-05-11-registration-invite-seed-deploy.md`
  - 修复线上注册邀请码“代码里有、数据库里没有”的问题；部署流程改为在 `db push` 后单独补 `RegistrationInviteCode` seed，而不执行整套 demo seed
- `docs/changes/2026-05-11-daily-hotspot-catch-up-and-notice-cleanup.md`
  - 修复每日热点当天快照偶发缺失时需手动触发的问题；工作区读取时会自动补抓当天热点，并继续补齐 `TIKHUB_API_KEY` 在 `ecosystem + PM2` 运行态中的透传校验
- `docs/changes/2026-05-12-feishu-media-field-mapping-hardening.md`
  - 修复飞书同步作品时把附件文件名误当图片 URL、字段别名覆盖不全以及飞书媒体代理白名单过窄的问题
- `docs/changes/2026-05-12-brand-context-refresh-for-growth-and-xiaohongshu.md`
  - 修复 `brand-growth` 与 `xiaohongshu` 页面初始化时继续读取 demo brand 的问题；页面进入时会先通过 `/api/auth/me` 刷新真实品牌上下文，再决定后续工作区请求的 `brandId`
- `docs/changes/2026-05-12-feishu-media-proxy-brand-context-hardening.md`
  - 修复小红书素材库的飞书媒体代理 URL 未显式携带真实 `brandId` 的问题，并收紧飞书昵称/来源账号字段别名，降低图片视频继续落到 demo brand 或作者字段误识别的概率
- `docs/changes/2026-05-12-brand-growth-feishu-template-link-and-debug-cleanup.md`
  - 更新品牌增长页“打开飞书模板”的默认飞书 Base 链接，并移除作品卡片中的“同步诊断”临时面板
- `docs/changes/2026-05-13-admin-skill-center-reference-bundles.md`
  - 恢复后台技能中心目录树，并将 `SKILL.md + 同目录参考资料` 统一聚合到提示词读取链路中
- `docs/changes/2026-05-13-xiaohongshu-assets-protected-media-preview.md`
  - 修复小红书素材库中飞书图片/视频加入后仍空白的问题；受保护媒体改为先鉴权拉 blob，再用 object URL 预览
- `docs/changes/2026-05-13-brand-growth-report-provider-routing-fix.md`
  - 修复品牌增长报告、可视化报告、半年营销规划三条链路对 provider / model 的错绑与错选问题，避免文本报告误走图像 provider 或不兼容模型
- `docs/changes/2026-05-13-local-report-storage-fallback.md`
  - 修复本地未配置 OSS 时报告生成在保存 HTML 附件阶段直接 500 的问题；本地开发改为回退到 `.runtime/local-oss`，生产态仍坚持 OSS 真源
- `docs/changes/2026-05-13-local-web-api-direct-backend.md`
  - 修复本地页面通过 Next `/api` rewrite 调用报告生成接口时出现 `socket hang up / ECONNRESET` 的问题；本地 `localhost/127.0.0.1` 改为浏览器直接请求 `127.0.0.1:3011/api`
- `docs/changes/2026-05-13-production-api-route-proxy-fix.md`
  - 修复线上 `17ai.site` 品牌增长报告仍经 Next rewrite 同域代理而触发 `502/socket hang up` 的问题；改为由 `app/api/[...path]/route.ts` 显式代理同域 API 请求到 `3011/api`
- `docs/changes/2026-05-13-brand-growth-report-async-task.md`
  - 将品牌增长报告从同步接口改为后台任务模式，避免线上同域生成时再被网关 `504` 截断；前端改为轮询 `latestTask`
- `docs/changes/2026-05-13-brand-growth-report-model-priority-and-attempt-order.md`
  - 修正品牌增长报告的模型优先级与错误提示：先严格尝试后台选中的首选模型，再继续 fallback，并在失败时展示实际尝试顺序
- `docs/changes/2026-05-13-global-skill-model-priority-unification.md`
  - 将后台技能中心所有文本类技能统一到同一模型优先级逻辑：后台默认模型真实首跑，失败后再 fallback，并统一展示实际尝试顺序
- `docs/changes/2026-05-13-half-year-marketing-plan-refactor.md`
  - 将“全年营销规划”整体收口为“半年营销规划”，统一调整任务类型、提示词约束、解析阈值、页面文案、接口主路径与上下游依赖说明
- `docs/changes/2026-05-13-team-collaboration-owner-guard-and-invite-confirmation.md`
  - 团队协作与前台品牌权限收口为“Owner 主控 + 邀请确认加入”：前台不再因 `SUPER_ADMIN` 暴露全品牌，品牌增长策略仅 `Owner` 可操作，直接添加成员改为待确认邀请，创建邀请改为生成邀请链接
- `docs/changes/2026-05-14-xhs-original-reference-template-library.md`
  - 小红书原创笔记新增参考模板图库、站内模板资源接口与模板导入脚本；模板选中后继续复用现有参考图分析和 `xhs-original-image-prompt` 生图链路
- `docs/changes/2026-05-14-xhs-note-marketing-plan-toggle.md`
  - 小红书原创/二创笔记创建弹窗新增“植入营销策划方案”开关；选择“否”时不再强依赖先生成营销策划方案
- `docs/changes/2026-05-14-xhs-template-picker-pagination-and-pruning.md`
  - 小红书模板选择器增加图片点击提示和每页 10 张分页，并从模板库移除 city walk 两组模板
- `docs/changes/2026-05-14-feishu-partial-table-match-backfill.md`
  - 飞书同步改为表名优先、内容补齐缺项，修复只命中部分表名时对标作品表被跳过的问题
- `docs/changes/2026-05-14-brand-service-explicit-brandid-precedence.md`
  - 品牌增长页的品牌域 service 改为显式 `brandId` 优先，避免同步和刷新时被本地缓存品牌上下文覆盖
- `docs/changes/2026-05-14-feishu-table-dedup-and-unique-count.md`
  - 飞书同步改为唯一表去重分配与唯一表计数，修复 4 张表被错误显示为 5 张及近名表重复占用问题
- `docs/changes/2026-05-14-feishu-sync-diagnostics-and-workspace-fallback.md`
  - 飞书同步接口新增命中表、分类写入条数和工作区计数诊断，品牌增长页同步后优先采用响应里的工作区并对 `benchmarkNotes` 提供回退保护
- `docs/changes/2026-05-14-xhs-marketing-calendar-skill-and-seven-day-view.md`
  - 将营销日历补入前后台技能中心与提示词注册表，营销日历生成统一读取技能配置；后续继续修正为完整回源 `营销日历提示词.txt`，并为读不到源文件或残留旧占位短文案的环境补上内置完整 fallback，同时允许后台技能中心直接编辑保存提示词，并把前端日历卡片收回到“日期 + 主题”、详情弹窗恢复为可编辑保存的当天排期面板
- `docs/changes/2026-05-14-personal-center-skill-editor-layout-and-model-options.md`
  - 个人中心技能中心继续精简为单层编辑区，并把提示词模型改为跟随后台 Provider 配置动态下发的模型下拉
- `docs/changes/2026-05-14-third-party-platform-config-center-and-personal-page.md`
  - 个人中心新增“第三方接口配置”页，后台“接口供应商”改成按平台分组的左右布局，平台基线与 Owner 私有 API Key 分层管理；后续继续补上严格品牌隔离、Right Codes 平台种子与技能中心同名模型的 Provider 作用域区分
- `docs/changes/2026-05-15-xhs-extension-and-image-generation-runtime.md`
  - 修复小红书电脑端发布扩展在 `17ai.site` 未注入导致的“等待电脑端扩展”，补入扩展下载/安装帮助页，并把原创/二创最终图片生成升级为独立技能，真正让参考图原图参与最终生图；后续继续把图片生成技能的默认模型基线、数据库旧记录和用户覆盖层旧记录一起切到 `Right Codes images-generations`
- `docs/changes/2026-05-15-xhs-reference-template-same-origin-preview-fallback.md`
  - 原创模板图库资源地址改为同域 `/api`，降低不同浏览器因绝对地址不一致导致的裂图；模板卡片新增“预览加载失败”占位提示
- `docs/changes/2026-05-15-user-skills-table-compat-fix.md`
  - 个人中心技能中心保存/重置链路补齐旧表结构兼容、SQL 空值归一化与 `jsonb` 写入转换，修复修改模型或重置平台基线时的 500
- `docs/changes/2026-05-15-team-role-unification-and-permission-matrix.md`
  - 团队协作统一为三角色 `管理员 / 员工 / 达人`，新增品牌级权限矩阵，并接通团队页、品牌增长策略、第三方接口配置与本地稳定联调链路
- `docs/changes/2026-05-15-xhs-original-account-role.md`
  - 小红书原创笔记补充“账号角色”选择，管理员可选品牌号/员工号/达人号，员工和达人按团队角色收口；原创作品会持久化并展示账号角色标记
- `docs/changes/2026-05-16-runninghub-video-platform.md`
  - 新增 `RunningHub 平台` 到前后台第三方接口配置基线，并把小红书视频生成运行时升级为可按 Provider 元数据适配 RunningHub 的请求/查询协议
- `docs/changes/2026-05-16-xhs-all-works-account-role.md`
  - 为二创笔记和视频笔记补齐账号角色，并把“所有作品创作默认都要设置账号角色”固化到作品元数据与工程规范
- `docs/changes/2026-05-17-video-note-staged-workflow-and-prompts.md`
  - 视频笔记改为“三阶段任务化 + 故事板确认后继续生成短视频”，并将视频提示词按业务阶段拆成 6 条独立 prompt 供前后台技能中心分类展示与修改
- `docs/changes/2026-05-17-video-note-runninghub-image-backend-fallback.md`
  - 修复视频笔记最后一步已携带故事板图、却仍按 RunningHub 文生视频模型调用导致失败的问题；后端现会优先自动切到同系列图生视频后端
- `docs/changes/2026-05-17-video-note-runninghub-reference-image-url-fix.md`
  - 修复视频笔记最终成片阶段把站内鉴权故事板图 URL 直接传给 RunningHub 导致图生任务创建失败的问题，并补充创建失败时的真实错误透传
- `docs/changes/2026-05-17-volcengine-seedance-video-providers.md`
  - 新增火山方舟 `doubao-seedance-2-0-260128` 与 `doubao-seedance-2-0-fast-260128` 视频 Provider，并补齐平台模型聚合与视频生成请求/查询适配，让前台个人中心和后台接口供应商同步可见
- `docs/changes/2026-05-17-skill-center-prompt-leaf-classification.md`
  - 技能中心继续收口到“前后台统一分类树 + 单条提示词叶子项可见可改”，修正视频笔记 prompt 已注册但界面仍按总技能展示的问题
- `docs/changes/2026-05-17-skill-center-collapsible-tree.md`
  - 技能中心左侧分类树补充一级/二级折叠交互，前后台同步支持，减少提示词增多后的滚动成本
- `docs/changes/2026-05-18-skill-center-video-prompts-file-sync-fix.md`
  - 修正视频笔记提示词在技能中心仍显示旧一行占位文案的问题；改为运行时稳定命中文件，并在启动时把数据库内容回填为文件真实内容
- `docs/changes/2026-05-18-video-prompt-files-moved-into-repo.md`
  - 继续修正视频提示词线上仍不正确的问题；将 6 个视频提示词文件正式纳入仓库，并把读取优先级切到仓库内受 Git 管理的路径
- `docs/changes/2026-05-18-video-prompt-leaf-no-reference-bundle.md`
  - 修正视频提示词叶子项仍把同目录其它 `.txt` 一并拼进内容的问题；当前仅 `SKILL.md` 允许自动聚合参考资料，独立 `.txt` 只展示自身内容
- `docs/changes/2026-05-18-runninghub-shared-query-backfill.md`
  - 修正 RunningHub 第三方视频模型缺失统一查询接口元数据的问题；当前运行时会对 `runninghub.cn` 强制使用 `/openapi/v2/query`，并在服务启动时回填旧系统 Provider 缺失的查询配置
- `docs/changes/2026-05-18-seedance-video-poll-window-fix.md`
  - 修复柏拉图平台 `seedance2.0` 视频任务已创建并扣费，但站内仅轮询 160 秒就误判失败的问题；当前视频 Provider 支持独立轮询窗口，Seedance 默认放宽到约 15 分钟
- `docs/changes/2026-05-18-remove-platogram-platform.md`
  - 柏拉图第三方平台下线后，移除其平台基线与共享代理 Provider，并在服务启动时自动清理旧数据库残留；视频笔记默认值同步切到火山方舟 Seedance 2.0
- `docs/changes/2026-05-18-image-loading-optimization-phase-1.md`
  - 输出系统重构路线图，并先落地图片加载优化第一版：统一图片组件、近视口加载、列表渲染收口和媒体缓存头优化
- `docs/changes/2026-05-18-image-loading-optimization-phase-2.md`
  - 继续收口受保护媒体重复拉取：把 blob 预览逻辑抽成共享 hook，并为小红书素材库与品牌增长附件预览增加会话级缓存和并发去重
- `docs/changes/2026-05-18-xiaohongshu-workspace-shell-split.md`
  - 小红书工作台先完成“薄入口 + 编排壳层”拆分：`page.tsx` 只保留路由挂载，原有聚合加载、权限闸门、轮询与弹窗编排统一下沉到 `workspace-shell.tsx`
- `docs/changes/2026-05-18-xiaohongshu-workspace-loader-hook.md`
  - 在薄壳基础上继续把品牌上下文校正、权限门卫、工作区聚合加载和局部刷新抽到 `use-xiaohongshu-workspace-loader.ts`，让 `workspace-shell.tsx` 更聚焦状态消费与 section 装配
- `docs/changes/2026-05-18-xiaohongshu-workspace-task-hook.md`
  - 继续把营销策划方案、营销日历、原创/二创/视频和发布任务的轮询与状态派生抽到 `use-xiaohongshu-workspace-tasks.ts`，进一步降低壳层编排密度
- `docs/changes/2026-05-18-xiaohongshu-note-section-props-split.md`
  - 继续把原创、二创、视频三个工作区的 props 装配从 `workspace-shell.tsx` 抽到 `note-workspace-section-props.ts`，让 `renderSectionCard()` 更接近薄入口
- `docs/changes/2026-05-18-xiaohongshu-note-section-router-split.md`
  - 继续把原创、二创、视频三个笔记 section 的集合出口与路由判断从 `workspace-shell.tsx` 抽到 `note-workspace-sections.tsx`，进一步减薄壳层
- `docs/changes/2026-05-18-xiaohongshu-note-section-containers.md`
  - 继续把原创、二创、视频三个笔记 section 的 container 层从 `workspace-shell.tsx` 抽到 `note-workspace-section-containers.tsx`，让壳层只保留 grouped hooks 和一级装配
- `docs/changes/2026-05-18-xiaohongshu-note-leaf-section-containers.md`
  - 继续把原创、二创、视频三个笔记 section 再拆成独立叶子 container 文件，让 `note-workspace-section-containers.tsx` 收口为共享类型和路由层
- `docs/changes/2026-05-18-xiaohongshu-note-workspace-shared-panels.md`
  - 继续把 `note-workspaces.tsx` 里重复的头部、创作状态面板和发布状态面板抽成共享展示组件，减薄面板本体
- `docs/changes/2026-05-18-xiaohongshu-video-detail-panel-split.md`
  - 继续把 `VideoWorkspace` 的详情区抽成独立子组件，收口阶段状态、故事板区、视频预览和动作按钮
- `docs/changes/2026-05-18-xiaohongshu-video-modal-mount-split.md`
  - 继续把 `VideoWorkspace` 的编辑弹窗和创建弹窗挂载层抽成独立组件，减薄面板尾部编排
- `docs/changes/2026-05-18-xiaohongshu-note-modal-mount-split.md`
  - 继续把原创与二创面板的模态挂载层抽成独立组件，对齐三类面板的模态编排模式
- `docs/changes/2026-05-19-xiaohongshu-original-create-reference-fields-split.md`
  - 继续把原创创建弹窗中的参考模板选择、本地上传与模板应用局部块抽成独立子组件，减薄 `note-create-modals.tsx`
- `docs/changes/2026-05-19-xiaohongshu-note-text-edit-modal-split.md`
  - 继续把原创、二创、视频共用的文本编辑弹窗壳层抽成独立组件，让 `note-edit-modals.tsx` 更聚焦差异字段映射
- `docs/changes/2026-05-18-video-note-provider-task-recovery.md`
  - 新增视频笔记按第三方 `taskId` 的恢复入口；可在站内误判失败但第三方实际已成功时，直接复查任务并把视频重新抓回 OSS 与作品记录，无需再次扣费重跑
- `docs/changes/2026-05-09-auth-register-email-verification.md`
  - 记录上一阶段“邮箱验证码注册”的基线；当前已被 2026-05-10 的邀请码注册方案替代
- `docs/changes/2026-05-09-personal-center-profile-editing.md`
  - 个人中心安全设置页升级为“账号资料 + 会话安全”组合页，支持用户名、头像地址、手机号编辑
- `docs/changes/2026-05-09-multi-user-brand-access-hardening.md`
  - 修复新账号仍读到演示品牌数据的问题，收口当前品牌解析与品牌访问权限校验

## 开发前必读

每次进入实际开发、排查、联调、重构、提交流程前，默认至少先读下面这些文档：

- `docs/engineering-standards.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/development-delivery-checklist.md`
- 与当前任务最近的一条 `docs/changes/*.md`

按任务类型追加必读：

- 涉及 Git 边界、提交拆分、快照备份：`docs/git-workflow.md`
- 涉及数据库 schema、迁移、正式入库边界：`docs/database-archive.md`
- 涉及资源生成、作品副本、发布素材：`docs/generated-content-storage-standards.md`
- 涉及个人中心、多用户、品牌协作：`docs/personal-center-multi-user-system-plan.md`

## 开发后必更

每次发生实际代码改动后，默认至少补齐下面这些记录：

- 必更：`docs/changes/*.md`
- 结构或入口变化：`docs/site-map.md`
- 结构关系变化：`docs/site-map-mermaid.md`
- schema、迁移、持久化边界变化：`docs/database-archive.md`
- 通用工程规则变化：`docs/engineering-standards.md`
- 开发流程或交付清单变化：`docs/development-delivery-checklist.md`
- Git 规则、快照、暂存策略变化：`docs/git-workflow.md`
- 新增文档类型或索引变化：`docs/README.md`

交付时还必须说明：

- 做了哪些验证、哪些通过、哪些没做
- 本次提交范围与提交信息
- 是否还有未纳入提交的剩余改动
- 当前待解决事项和下一步建议
