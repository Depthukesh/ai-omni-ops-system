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
- `/help/xhs-draft-publisher`：小红书电脑端一键发布扩展的下载与安装帮助页
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
  - 部署前会先检查服务器仓库 `git status --porcelain -uall`；如发现额外文件或未收口改动，当前工作流会先把现场导出到运行用户家目录的 `$HOME/.deploy-worktree-backups/`，再自动执行 `git reset --hard` 与 `git clean -fd` 收口后继续部署
  - 生产前后端统一通过 `PM2 + ecosystem.config.cjs` 启动
  - 对第三方运行时 Secret，除了在部署脚本里透传给 `pm2 startOrReload --update-env`，还要在 `ecosystem.config.cjs` 的目标进程 `env` 中显式映射，并在部署后校验该 Secret 已进入目标 PM2 进程
  - `apps/server` 默认通过 `SERVER_HOST=127.0.0.1` 仅监听本机 `3011`
  - `apps/web` 生产启动统一绑定 `127.0.0.1:3001`，外部访问只允许经 `nginx` 反代
  - 参考变更：`docs/changes/2026-05-17-deploy-worktree-auto-backup.md`

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
  - 当前品牌作品/对标作品中的受保护附件预览已切到 `(dashboard)` 共享 blob 缓存层；同一飞书附件在翻页、重复预览和跨卡片回看时不再总是重新鉴权拉取
- 每日热点

#### 品牌增长报告

- 生成品牌增长报告
  - 当前已改为后台任务异步生成；点击“生成报告”后接口立即返回工作区，前端轮询 `latestTask`
  - 当前品牌增长报告在运行时会严格先尝试后台技能中心当前选中的首选模型，再按兼容 provider 继续 fallback；失败提示会展示实际尝试顺序，避免把最后一次失败误看成第一跳模型
- 品牌增长可视化报告
- 半年营销规划
- 当前三条报告链路会先按技能配置尝试匹配兼容的文本 provider；若技能默认 provider 与链路不兼容，例如把可视化报告误绑到 `图像生成`，后端会自动回退到正确的文本 runtime，并按 provider 白名单收敛可用模型
- 当前页面已接入品牌成员权限模板：管理员默认拥有全部权限；员工/达人按团队页配置的 `view/edit` 模板决定是否可进入页面以及是否可执行保存、同步和报告生成动作
- 参考变更：`docs/changes/2026-05-13-brand-growth-report-provider-routing-fix.md`
- 参考变更：`docs/changes/2026-05-13-brand-growth-report-async-task.md`
- 参考变更：`docs/changes/2026-05-13-brand-growth-report-model-priority-and-attempt-order.md`
- 参考变更：`docs/changes/2026-05-13-half-year-marketing-plan-refactor.md`
- 参考变更：`docs/changes/2026-05-15-team-role-unification-and-permission-matrix.md`

### 3.2 小红书 `/xiaohongshu`

- 顶部导航：已统一为后台同语言的浅底导航壳，使用短标签徽标与当前栏目高亮
- 左侧导航：已改为更简化的目录式浅底菜单，仅保留分区按钮本体；当前只展示当前账号有 `view` 权限的小红书板块
- 当前页面入口已拆为薄路由 + 工作区壳层：`page.tsx` 只负责挂载 `workspace-shell.tsx`，原有品牌上下文校正、权限闸门、工作区聚合加载、轮询与弹窗编排统一下沉到壳层文件，便于后续继续拆分 section 容器与共享 hook
- 当前工作区壳层里的品牌上下文校正、权限门卫、聚合加载和局部刷新，已进一步抽到 `use-xiaohongshu-workspace-loader.ts`，壳层开始从“异步 orchestration + 视图混写”转向“状态消费 + section 装配”
- 当前营销策划方案、营销日历、原创/二创/视频和发布任务的最新状态派生与轮询刷新，已进一步抽到 `use-xiaohongshu-workspace-tasks.ts`；`workspace-shell.tsx` 不再内联拼装多组 `findLatestTaskByTypes + useDelayedTaskPolling`
- 当前原创、二创、视频三个工作区的 props 装配已进一步抽到 `note-workspace-section-props.ts`；`workspace-shell.tsx` 的 `renderSectionCard()` 不再内联维护三大段超长 section 参数拼装
- 当前原创、二创、视频三个笔记 section 的 container 层已进一步抽到 `note-workspace-section-containers.tsx`；壳层开始只向 note section 传 grouped hooks 与少量共享数据
- 当前原创、二创、视频三个笔记 section 已进一步拆成独立叶子 container：`original-workspace-section-container.tsx`、`rewrite-workspace-section-container.tsx`、`video-workspace-section-container.tsx`；中间层 `note-workspace-section-containers.tsx` 当前只保留共享类型与路由分发，旧的 `note-workspace-sections.tsx` 集合出口已退出主链路
- 当前 `note-workspaces.tsx` 内部重复的顶部工具栏、创作状态面板和发布状态面板已进一步抽到 `note-workspace-shared-panels.tsx`，面板本体开始只保留原创/二创/视频各自的差异化内容
- 当前 `VideoWorkspace` 里的详情区已进一步抽到 `video-workspace-detail-panel.tsx`，把阶段状态、故事板区、视频预览和操作按钮从面板本体中继续拆出
- 当前 `VideoWorkspace` 的编辑弹窗和创建弹窗挂载层已进一步抽到 `video-workspace-modals.tsx`，面板本体尾部不再直接维护整段视频模态参数透传
- 当前原创与二创面板的编辑弹窗、创建弹窗挂载层已进一步抽到 `note-workspace-modals.tsx`，三类 note 面板的模态挂载方式开始统一
- 当前原创创建弹窗里的“封面参考图 / 配图参考图 / 模板选择器应用”局部块已进一步抽到 `original-create-reference-fields.tsx`，`note-create-modals.tsx` 不再内联维护模板应用状态与上传区细节
- 当前原创、二创、视频三类编辑弹窗共用的文本编辑壳层已进一步抽到 `note-text-edit-modal.tsx`，`note-edit-modals.tsx` 当前更聚焦标题、摘要和视频差异字段映射
- 营销策划方案
  - 当前页面已去掉 Hero 徽标和重复说明，聚焦标题、状态、动作按钮与 Markdown 编辑/预览主链路
  - 当前会先读取团队权限模板；若只有 `view` 没有 `edit`，则板块切换为只读态，编辑、删除、重新生成、保存按钮都会禁用
- 素材库
  - 当前素材库中的飞书图片/视频预览若命中站内 `feishu-media` 代理，会先通过前端鉴权请求拉取 blob，再转 object URL 给卡片和灯箱展示，避免浏览器媒体请求不带 Bearer Token 导致空白
  - 当前素材库第一版性能优化已落地：受保护媒体改为接近视口后再触发 blob 拉取，非当前可视区域素材不再在首屏一次性全部并发请求
  - 当前素材库第二版性能优化已落地：受保护媒体 blob 预览已切到 `(dashboard)` 共享缓存层；同一素材在滚动回看、重复选中或再次打开时，优先复用已创建的 object URL，并对同 URL 并发请求做去重
  - 参考变更：`docs/changes/2026-05-13-xiaohongshu-assets-protected-media-preview.md`
  - 参考变更：`docs/changes/2026-05-18-image-loading-optimization-phase-1.md`
  - 参考变更：`docs/changes/2026-05-18-image-loading-optimization-phase-2.md`
- 营销日历
  - 当前“生成接下来 7 天”通过后台任务异步生成；任务状态会显示 `QUEUED / RUNNING / SUCCESS / FAILED`
  - 当前已补入前后台技能中心：技能 slug 为 `xiaohongshu-marketing-calendar`，提示词为 `prompt_xhs_calendar`，默认优先回源 `提示词/营销日历提示词.txt`
  - 若运行环境读不到仓库外提示词文件，后端会自动回退到内置完整营销日历提示词；不会再退回一句占位式短文案
  - 当前生成运行时会优先读取后台技能中心为营销日历配置的默认模型与提示词内容，默认以 `deepseek-v4-pro` 作为文本模型兜底
  - 当前后台技能中心展示的营销日历提示词已改为完整原始文件内容，不再回退为一句技能说明短文案
  - 当前日历视图已从月份矩阵改为“未来 7 天”真实日历卡片，一排展示月份、日期、星期、主题、内容目的与关键标签；点击单日卡片后在详情弹窗中查看完整内容
  - 当前详情面板已拆为“基础信息 / 选题策略 / 关键词与标题 / 封面与配图”四块，适合作为创作执行面板直接使用
  - 参考变更：`docs/changes/2026-05-14-xhs-marketing-calendar-skill-and-seven-day-view.md`
- 原创笔记
  - 已支持原创图文作品列表、添加弹窗、编辑、删除
  - 已接入营销日历选题、产品选择、参考图上传、配图数量、用户要求
  - 创建弹窗新增“账号角色”选择：管理员可选 `品牌号 / 员工号 / 达人号`，员工只可选员工号，达人只可选达人号
  - 原创文案与配图提示词链路会感知当前选择的账号角色，让生成结果的人设和表达更贴近发布主体
  - 原创作品主记录会把账号角色写入 `MediaAsset.metadataJson`；作品卡片左上角直接显示 `品牌号 / 员工号 / 达人号`
  - “封面参考图 / 配图参考图”已升级为模板图库选择 + 本地上传兜底双入口；模板选中后会先下载成 `File`，再继续复用现有参考图分析与生图链路
  - 当前原创链路已拆成两层技能：`原创配图提示词` 负责生成封面/内页提示词，`原创图片生成` 负责选择最终图像模型、继承参考图结构并执行成品图生成
  - 原创模板图库当前通过 `GET /api/works/xiaohongshu/original/reference-templates` 返回分类与模板清单，并通过站内 `/api/works/xiaohongshu/original/reference-templates/:templateId/asset` 同域受控读取图片资源；若某张模板对象缺失，前端会显示“模板预览加载失败”占位而不是只保留浏览器裂图图标
  - 当前原创模板图库第一版性能优化已落地：模板卡片改为统一懒加载图片组件，并对长列表卡片启用浏览器级内容可见性裁剪，降低模板库首屏渲染开销
  - 本地开发因前端走 `3001`、后端走 `3011` 属于跨端口请求；模板资源接口现已暴露 `Content-Disposition` 给浏览器端 `fetch`，回填表单时可保留真实模板文件名，不再退回显示 `asset`
  - 上传参考图当前会同时参与两步：先进入 `analyzeReferenceImages()` 做风格拆解，再在最终文生图阶段以原图 data URL 形式继续传给图像模型，不再只保留文字化风格档案
  - 最终成品图 prompt 已显式增加竖版 `1242x1660`、中文排版、标题层级和 8% 安全边距约束，用于收紧文字贴边和越界问题
  - 创作成功后会自动刷新任务状态和作品列表；新任务按当前登录用户归属，可在个人中心任务中心继续查看
  - 当前支持在小红书工作区和个人中心任务中心对运行中的任务发起 `取消任务`；取消属于 best-effort 中断，会尽量阻止后续步骤继续写回成功状态
- 参考变更：`docs/changes/2026-05-15-xhs-extension-and-image-generation-runtime.md`、`docs/changes/2026-05-15-xhs-reference-template-same-origin-preview-fallback.md`
- 参考变更：`docs/changes/2026-05-15-xhs-original-account-role.md`
- 参考变更：`docs/changes/2026-05-18-image-loading-optimization-phase-1.md`
- 二创笔记
  - 已支持二创图文作品列表、添加弹窗、编辑、删除
  - 已接入素材库作品选择、产品选择、账号角色、用户要求
  - 创建弹窗现已补入“账号角色”选择：管理员可选 `品牌号 / 员工号 / 达人号`，员工只可选员工号，达人只可选达人号
  - 二创文案与配图提示词链路现会感知当前选择的账号角色，让生成结果的人设、口吻和画面关系更贴近发布主体
  - 二创作品主记录会把账号角色写入 `MediaAsset.metadataJson`；作品卡片左上角直接显示 `品牌号 / 员工号 / 达人号`
  - 当前二创链路已拆成两层技能：`二创配图提示词` 负责生成封面/内页提示词，`二创图片生成` 负责选择最终图像模型、跟随对标图结构并执行成品图生成
  - 创作成功后会自动刷新任务状态和作品列表；新任务按当前登录用户归属，并可在工作区内直接取消最近一次运行中任务
- 参考变更：`docs/changes/2026-05-15-xhs-extension-and-image-generation-runtime.md`
- 参考变更：`docs/changes/2026-05-16-xhs-all-works-account-role.md`
- 参考变更：`docs/changes/2026-05-18-image-loading-optimization-phase-1.md`
- 视频笔记
  - 已支持视频作品列表、三阶段详情面板、添加弹窗、编辑、删除
  - 已接入营销日历选题、自定义选题、产品选择、视频素材库、账号角色、参考图上传、视频模型、时长和双段用户要求
  - 视频类型已收口为 `品牌宣传视频 / 口播带货视频 / 短剧带货视频 / 复刻视频`；其中 `复刻视频` 必须选择视频素材
  - 视频时长只保留 `10 秒 / 15 秒`，不再提供“输出视频提示词”选项
  - 创建弹窗现已补入“账号角色”选择：管理员可选 `品牌号 / 员工号 / 达人号`，员工只可选员工号，达人只可选达人号
  - 视频三阶段链路现会感知当前选择的账号角色，让剧本、故事板和短视频提示词的人设与口吻更贴近发布主体
  - 视频作品主记录会把账号角色写入 `MediaAsset.metadataJson`；作品卡片左上角直接显示 `品牌号 / 员工号 / 达人号`
  - 视频作品会把 `workflowStage / creativeScript / storyboardPrompt / storyboardImageUrl / storyboardRevisions` 等中间结果持久化到 `MediaAsset.metadataJson`，支持离开页面后回来继续查看和操作
  - 视频模型下拉现通过 `/api/works/brands/:brandId/xiaohongshu/video/providers` 动态读取后台当前启用的视频 Provider，不再写死前端枚举
  - 创作成功后会自动刷新任务状态和作品列表；故事板阶段完成后可直接在详情区修改提示词并重生故事板，或继续生成短视频
- 参考变更：`docs/changes/2026-05-16-xhs-all-works-account-role.md`
- 参考变更：`docs/changes/2026-05-17-video-note-staged-workflow-and-prompts.md`
- 参考变更：`docs/changes/2026-05-18-image-loading-optimization-phase-1.md`
- 当前品牌上下文：
  - 前端工作区聚合读取、作品生成、素材代理和报告依赖现统一优先读取当前登录品牌
  - `xiaohongshu/workspace-shell.tsx` 当前通过 `use-xiaohongshu-workspace-loader.ts` 先调用 `/api/auth/me` 刷新当前品牌，再决定营销方案、营销日历、作品列表和收集工作区应该读取哪个 `brandId`，避免旧会话把页面长期锁在 demo 工作区
  - `xiaohongshu/assets-workspace.tsx` 生成飞书素材图片/视频代理 URL 时也会显式透传当前真实 `brandId`，避免素材库媒体预览继续回退到 `DEMO_BRAND_ID`
  - 后端按 `brandId` 读取的小红书收集、营销方案、营销日历等接口已补当前用户品牌访问校验，避免跨用户串读数据
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-workspace-shell-split.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-workspace-loader-hook.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-workspace-task-hook.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-note-section-props-split.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-note-section-router-split.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-note-section-containers.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-note-leaf-section-containers.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-note-workspace-shared-panels.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-video-detail-panel-split.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-video-modal-mount-split.md`
  - 参考变更：`docs/changes/2026-05-18-xiaohongshu-note-modal-mount-split.md`
- 参考变更：`docs/changes/2026-05-19-xiaohongshu-original-create-reference-fields-split.md`
- 参考变更：`docs/changes/2026-05-19-xiaohongshu-video-create-config-fields-split.md`
- 参考变更：`docs/changes/2026-05-19-xiaohongshu-note-text-edit-modal-split.md`

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
- `/personal-center/skills`：技能中心已升级为“平台基线 + 用户覆盖”双层结构；当前采用左侧分类树、右侧单条提示词编辑器，支持按当前登录用户和当前品牌读取真实 `/api/user-skills`
  - 左侧不再按“总技能卡”展示，而是按统一分类树直接展开到“可编辑提示词叶子项”；视频笔记会明确拆成 `品牌宣传剧本 / 口播带货剧本 / 短剧带货剧本 / 复刻视频拆解 / 故事板提示词 / 短视频提示词`
  - 左侧一级分类和二级分类现都支持折叠；搜索时会自动展开全部结果分组，选中某条提示词时也会自动展开到对应位置
  - 右侧当前聚焦所选提示词本身，展示所属分类、所属执行技能、提示词场景和提示词编辑字段；保存时继续复用原有用户覆盖层
  - 提示词模型当前改为下拉框，选项通过 `/api/user-skills/editor-options` 动态读取后台激活 `ApiProviderConfig` 的默认模型与模型白名单；未覆盖时默认跟随后台平台模型
  - 当多个平台存在同名模型时，`/api/user-skills/editor-options` 会返回带 Provider 作用域的模型值，前端以下拉标签 `模型名 · Provider名` 区分；保存时会把 `providerId::modelName` 写回技能配置，供运行时精确命中对应 Provider
  - 当前 `/api/user-skills/:skillId` 保存链路会先把传入模型值归一化为“精确作用域值 / 兼容 label / 纯模型名”三类之一，再写入用户覆盖层；前端也只提交实际改动的 `promptOverrides`，避免仅切换模型时被无关字段放大为保存失败
  - 当前旧环境首次命中 `/api/user-skills` 相关接口时，会自动补齐 `UserSkillProfile`、`UserPromptOverride`、`UserSkillResetLog` 缺失的基础列；保存与重置链路也已兼容 `undefined -> null`、`promptIdsJson -> jsonb` 写入，以及 `baseSkillId` 为空的历史提示词覆盖记录，避免历史库在切模型或重置平台基线时触发 500
  - 原创图片生成、二创图片生成两条技能当前平台默认模型已正式切到 `provider_runtime_image_generation_right_codes::gpt-image-2`；若用户覆盖层中还残留旧的 `provider_runtime_image_generation::gpt-image-2`，后端会在接口初始化时自动安全回填到 `Right Codes`，保证页面展示与实际运行时一致
  - 视频笔记技能若数据库或用户覆盖层里仍残留旧默认值 `seedance`，当前也会在接口初始化时自动安全回填到火山方舟 `doubao-seedance-2-0-260128`，避免柏拉图下线后技能中心继续显示不可用模型
  - 当前仍支持保存到用户自己的技能库、重置回后台平台基线、品牌上下文切换与退出登录
  - 后台继续通过 `/admin/skills` 与 `/admin/prompts` 维护平台技能基线
  - 参考变更：`docs/changes/2026-05-11-personal-center-user-skills-overrides.md`
  - 参考变更：`docs/changes/2026-05-14-personal-center-skill-editor-layout-and-model-options.md`
  - 参考变更：`docs/changes/2026-05-15-user-skills-table-compat-fix.md`
  - 参考变更：`docs/changes/2026-05-17-skill-center-prompt-leaf-classification.md`
  - 参考变更：`docs/changes/2026-05-17-skill-center-collapsible-tree.md`
- `/personal-center/third-party-platforms`：第三方接口配置页已落地，布局对齐技能中心，当前采用左侧平台列表、右侧单平台详情
  - 页面统一展示平台基线：第三方平台链接、默认模型、大模型 ID、说明文档与备注
  - 当前页面改为按 `personalCenter.thirdPartyPlatforms` 权限控制：拥有该板块 `edit` 的成员可维护自己的私有 API Key，仅有 `view` 的成员保持只读
  - 当前品牌与角色展示已统一到三角色口径，品牌切换下拉与页面头部状态均显示 `管理员 / 员工 / 达人`
  - 页面通过 `/api/third-party-platforms` 读取平台基线，通过 `/api/third-party-platforms/:id/secret` 保存当前账号在当前品牌下的私有 Key
  - 当前页面已对手机号/数字串误填搜索框做自动清空兜底，避免左侧平台列表被浏览器自动填充意外过滤成 0 条
  - 后台 `/admin` 的接口供应商页现与这里同步同一份平台基线
  - 当前平台基线已补入 `Right Codes 平台`，基础链接为 `https://www.right.codes/draw`；平台页统一聚合文生文（可带图）与文生图/图生图两类模型，并由 Owner 单独维护该平台私有 Key
  - 当前平台基线已补入 `RunningHub 平台`，基础链接为 `https://www.runninghub.cn`；平台页会自动聚合同域下的海螺 2.3、Vidu Q3、可灵 3.0、seedance 2.0、happyhorse 1.0 视频模型，并由 Owner 单独维护该平台私有 Key
  - 当前平台基线已补入火山方舟视频模型 `doubao-seedance-2-0-260128 / doubao-seedance-2-0-fast-260128`；平台页会把这两条模型并入既有 `火山方舟平台`，无需手工新增第二个平台
  - 柏拉图平台当前已正式下线；服务启动时会自动清理 `hk-api.gptbest.vip / api.gptbest.vip / api.bltcy.ai` 对应的平台基线与私有 Key 残留，前后台都不再展示该平台
  - 当前前台保存的 API Key 已接入 `ReportsModule` / `WorksModule` 的真实运行时调用链：运行时会先按当前 `brandId` 找品牌 Owner，再按平台 `baseUrl` 匹配对应私有 Key；命中平台后必须使用品牌私钥，若 Owner 尚未配置则直接返回中文提醒，不再回退 `ApiProviderConfig` 公共 Key
  - 当前品牌间第三方模型调用已按 `brandId + ownerUserId + platformId` 隔离，不再直接共用同一套品牌外私钥
  - 参考变更：`docs/changes/2026-05-14-third-party-platform-config-center-and-personal-page.md`
  - 参考变更：`docs/changes/2026-05-16-runninghub-video-platform.md`
  - 参考变更：`docs/changes/2026-05-17-volcengine-seedance-video-providers.md`
  - 参考变更：`docs/changes/2026-05-15-team-role-unification-and-permission-matrix.md`
- `/personal-center/security`：安全设置第二版，已从纯只读会话页升级为“账号资料 + 会话安全”组合页；当前支持用户自助编辑用户名、头像地址、手机号，支持上传头像到 OSS 并通过站内头像接口读取，支持查看邮箱验证状态、账号与品牌上下文、access/refresh token 持有状态、自动 refresh 机制说明和退出当前登录态入口；邮箱改绑、密码修改、会话列表、多端下线后续继续扩展
- `/personal-center/invites`：邀请通知中心，现已接入邀请站内消息表第一版；统一查看待处理、已接受、已过期和已撤回的品牌邀请，并支持直接接受待处理邀请、后端持久化未读/已读、只看未读、状态筛选、关键词搜索、排序、分页总览、URL 参数状态回放、复制当前筛选链接与一键重置筛选
- `/personal-center/tasks`：用户任务中心，已接真实任务接口、品牌切换、失败重试与运行中任务取消；小红书原创/二创/视频任务现按当前登录用户归属，可在这里直接追踪
- `/personal-center/team`：团队协作页已统一三角色 `管理员 / 员工 / 达人`
  - 团队成员、邀请和审计对外统一显示三角色；内部仍保留 `OWNER` 仅表示品牌归属主账号
  - 管理员拥有该品牌前端全部权限，可邀请成员、查看审计、调整成员角色，并配置员工/达人的权限模板
  - 权限设置区位于“待处理邀请”和“当前品牌成员”之间，按一级目录/分组/项目展示，每项支持勾选 `可见权限 / 编辑权限`
  - “直接添加成员”继续走待确认邀请；“创建邀请”继续只生成邀请链接；手动邀请码加入入口保持移除；未登录打开邀请链接时会保留 `inviteCode` 并回流到登录后页面
  - 参考变更：`docs/changes/2026-05-15-team-role-unification-and-permission-matrix.md`
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
  - 左侧目录树：品牌增长策略 / 小红书 / 抖音，一级分类支持展开/收起
  - 左侧二级分类：按业务模块展开，例如品牌增长报告、半年营销规划；二级分类同样支持展开/收起
  - 左侧三级分类：具体技能项，例如“品牌增长报告-生成品牌增长报告”
  - 小红书内容生产：已拆分为 `原创笔记-原创文案`、`原创笔记-原创配图`、`二创笔记-二创文案`、`二创笔记-二创配图`，以及视频笔记的 `品牌宣传剧本 / 口播带货剧本 / 短剧带货剧本 / 复刻视频拆解 / 故事板提示词 / 短视频提示词`
  - 当前目录树样式：已改为目录式展开菜单，与左侧后台导航保持同一视觉语言
  - 中间只展示当前选中三级提示词叶子项的一张精简详情卡
  - 详情卡字段：当前提示词、所属执行技能、提示词场景、状态、默认模型、点数成本、更新时间、提示词内容、保存当前提示词
  - 后台技能中心当前所有文本类技能已统一运行逻辑：先严格尝试当前卡片里选中的默认模型，再按兼容 provider / model 继续 fallback；失败时统一展示实际尝试顺序
  - 技能提示词：后台当前仅对 `SKILL.md` 这类总技能入口自动聚合技能源目录下的顶层 `.md` / `.txt` 参考资料；独立提示词叶子项（如视频笔记 6 条 `.txt`）只展示自身内容，不再拼接同目录其它文件
  - 视频笔记提示词现按“剧本策划 / 视频生成”两组分类展示，前后台都可按单条 prompt 修改
  - 对于存在本地提示词文件的条目，后台启动时会按文件内容回填 `PromptTemplate.content`，避免页面继续显示数据库里遗留的一行旧占位文案
  - 视频笔记 6 条提示词源文件现已正式纳入仓库 `提示词/视频生成提示词/`；运行时优先读取仓库内路径，避免部署环境因缺少仓库外文件而继续显示错误内容
  - 当前选中某个三级提示词时，会自动展开对应一级/二级目录，避免所选项被折叠隐藏
  - 聚合型提示词在后台当前以只读方式展示，需回到原始提示词目录维护，避免把整份聚合内容误写回单个 `SKILL.md`
  - 参考变更：`docs/changes/2026-05-13-admin-skill-center-reference-bundles.md`
  - 参考变更：`docs/changes/2026-05-13-global-skill-model-priority-unification.md`
  - 参考变更：`docs/changes/2026-05-17-video-note-staged-workflow-and-prompts.md`
  - 参考变更：`docs/changes/2026-05-17-skill-center-prompt-leaf-classification.md`
  - 参考变更：`docs/changes/2026-05-17-skill-center-collapsible-tree.md`
  - 参考变更：`docs/changes/2026-05-18-skill-center-video-prompts-file-sync-fix.md`
  - 参考变更：`docs/changes/2026-05-18-video-prompt-files-moved-into-repo.md`
  - 参考变更：`docs/changes/2026-05-18-video-prompt-leaf-no-reference-bundle.md`
- 知识库管理
- 接口供应商
  - 当前后台 `/admin` 的“接口供应商”页已切到平台级第三方接口配置中心，布局改为左侧平台列表 + 右侧单平台详情编辑
  - 后台当前按平台维护 `名称 / Provider 类型 / 状态 / 第三方平台链接 / 说明文档 / 大模型 ID / 默认模型 / 备注`，当前页面不再提供新增入口
  - 后台页不再填写 API Key；前台个人中心由拥有 `personalCenter.thirdPartyPlatforms.edit` 的成员在 `/personal-center/third-party-platforms` 维护当前品牌下自己的私有 Key
  - 当前后台平台页与前台个人中心同步同一份 `ThirdPartyPlatformConfig` 平台基线
  - 当前 `ApiProviderConfig` 已补入 `Right Codes · 文生文（可带图）` 与 `Right Codes · 文生图/图生图` 两条运行时 Provider 种子；若数据库里还没有对应平台基线，`ThirdPartyPlatformsService` 会在引导时自动补齐缺失的 `ThirdPartyPlatformConfig`
  - 当前 `ApiProviderConfig` 已补入 RunningHub 视频 Provider 种子；若数据库里还没有对应平台基线，`ThirdPartyPlatformsService` 会按 `https://www.runninghub.cn` 自动聚合出 `RunningHub 平台`
  - 柏拉图共享代理 Provider 已从系统基线移除；若历史数据库里仍残留其接口供应商或平台记录，`ApiProvidersService` 与 `ThirdPartyPlatformsService` 会在启动时自动清理，避免后台继续展示已失效模型
  - 当前 RunningHub 视频 Provider 统一使用 `POST /openapi/v2/query` + `{ taskId }` 查询生成结果；`WorksService` 运行时会对命中 `runninghub.cn` 的 Provider 强制兜底这组查询配置，同时 `ApiProvidersService` 会在启动时把旧 RunningHub 系统 Provider 缺失的查询元数据自动回填到 `extraParamsJson`
  - 原 `ApiProviderConfig` 运行时表仍保留给 `ReportsModule` 与 `WorksModule` 按 `runtimeKey` 读取，不直接暴露给前台用户设置私有 Key
  - 参考变更：`docs/changes/2026-05-11-admin-api-provider-config-center.md`
  - 参考变更：`docs/changes/2026-05-14-third-party-platform-config-center-and-personal-page.md`
  - 参考变更：`docs/changes/2026-05-16-runninghub-video-platform.md`
  - 参考变更：`docs/changes/2026-05-18-runninghub-shared-query-backfill.md`
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
- 当前品牌增长策略会先读取当前品牌的团队权限模板，并按页面映射到 `brandGrowth.*` 权限键：
  - 无任一 `view` 权限时直接拦截进入
  - 当前页无 `edit` 权限时，保存/同步/生成类按钮直接禁用或拦截
  - 参考变更：`docs/changes/2026-05-15-team-role-unification-and-permission-matrix.md`
  - 进入 `/brand-growth` 时先读取当前品牌团队权限；若当前账号在品牌增长策略下所有板块都没有 `view`，前端直接提示联系管理员开通
  - 品牌资料保存、飞书绑定、热点同步、报告生成等操作按对应板块的 `edit` 权限控制
  - 当前已接入的权限键覆盖品牌资料库、收集数据、品牌增长报告三组目录
 - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - 当前不再默认展示飞书同步原始字段、来源表格和来源记录等临时诊断内容；排障信息改回仅在开发时临时加挂，不作为正式界面的一部分
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - 当前已收成薄入口文件，仅负责挂载 `XiaohongshuWorkspaceShell`
- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 当前通过 `use-xiaohongshu-workspace-loader.ts` 在初始化工作区前先校正真实品牌上下文，并优先读取当前品牌的小红书权限模板
  - 若当前账号在小红书目录下所有板块都没有 `view`，前端会直接显示无权限提示，不再继续进入工作区
  - 进入工作区后只会继续请求当前账号有查看权限的营销方案、营销日历、作品列表、视频 Provider 与模板数据，避免无权限板块继续报错
- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-loader.ts`
  - 当前承接品牌上下文校正、权限门卫、工作区聚合加载、原创模板刷新以及营销方案/营销日历局部刷新逻辑
- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-tasks.ts`
  - 当前承接营销策划方案、营销日历、原创/二创/视频与发布任务的状态派生、失败内联错误、取消中态和延迟轮询刷新
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
  - 当前承接原创、二创、视频三类 section 的 props 拼装、发布目标包装与部分局部字段联动，进一步降低壳层渲染函数密度
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
  - 当前主要承接原创、二创、视频三类 note section 的共享类型与路由分发，作为壳层与叶子 container 之间的中间路由层
- `apps/web/src/app/(dashboard)/xiaohongshu/original-workspace-section-container.tsx`
  - 当前承接原创笔记 section 的状态派生、动作包装与 props 组装
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-workspace-section-container.tsx`
  - 当前承接二创笔记 section 的状态派生、动作包装与 props 组装
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-section-container.tsx`
  - 当前承接视频笔记 section 的状态派生、动作包装与 props 组装
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-shared-panels.tsx`
  - 当前承接原创、二创、视频三个 note 面板复用的头部工具栏、创作状态面板和发布状态面板
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-panel.tsx`
  - 当前承接视频 note 面板详情区的阶段状态、故事板提示词、媒体预览、修改记录和动作按钮
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-modals.tsx`
  - 当前承接视频 note 面板的编辑弹窗与创建弹窗挂载层
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modals.tsx`
  - 当前承接原创与二创 note 面板的编辑弹窗与创建弹窗挂载层
- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-reference-fields.tsx`
  - 当前承接原创创建弹窗中的封面参考图、配图参考图、本地上传和模板应用局部块
- `apps/web/src/app/(dashboard)/xiaohongshu/note-text-edit-modal.tsx`
  - 当前承接原创、二创、视频编辑弹窗共用的文本编辑壳层，视频通过额外字段扩展故事板提示词
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
  - 飞书媒体代理第一版已把浏览器缓存时间从 5 分钟提升到 30 分钟，用于降低同一素材在工作区反复滚动、打开和灯箱预览时的重复回源成本
  - 当前前端品牌增长工作区与小红书素材库对飞书附件预览已共享同一套受保护媒体 blob 缓存 hook，减少相同代理地址在会话内的重复请求与重复 `createObjectURL`
- `ReportsModule`：品牌增长报告、可视化报告、半年营销规划、小红书策划与日历
- `ReportsModule`
  - 品牌增长报告、可视化报告、半年营销规划、小红书营销策划方案 4 类 HTML 产物现已真实写入 OSS
  - 报告产物统一通过 `/api/reports/brands/:brandId/assets/:fileName` 代理读取，不再只保存占位外链
  - 报告生成链路当前不再盲信技能里写入的 provider 名称；会先校验 `runtimeKey` 是否与当前文本生成任务兼容，再决定优先 provider 与可用模型，避免把文本报告请求误发到图像 provider 或与白名单不兼容的模型
  - 当 `ApiProviderConfig` 的 `baseUrl` 能匹配到平台级 `ThirdPartyPlatformConfig` 时，报告链路必须读取当前品牌 Owner 在 `UserThirdPartyPlatformSecret` 中保存的私有 Key；若未配置则直接中断并提醒先到个人中心完成配置
  - 当技能或提示词保存了 `providerId::modelName` 形式的作用域模型值时，报告链路会优先按该 Provider 解析同名模型，再进入兼容模型 fallback
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
  - 当前作品卡片第一版性能优化已落地：首屏前三张图片优先加载，其余卡片图改为延后懒加载；视频卡片预览视频改为 `preload="none"`，降低打开工作区时的媒体并发压力
  - 当前发布弹窗二维码与视频详情故事板图片也已补入统一图片组件，避免小红书工作区继续散落原生 `<img>` 的默认加载行为
  - 当前作品资产读取接口 `GET /api/works/brands/:brandId/assets/:fileName` 第一版已补浏览器缓存头 `private, max-age=86400`，用于减少图片/视频预览反复回源应用服务
  - 原创参考模板库现由 `xhs-original-reference-templates.generated.ts` 作为静态清单真源，配合 `scripts/import-xhs-original-reference-templates.cjs` 把本地素材批量导入 OSS 或 `.runtime/local-oss`
  - 原创参考模板资产统一通过 `/api/works/xiaohongshu/original/reference-templates/:templateId/asset` 同域站内接口读取，不直接暴露底层 OSS 链接，降低不同浏览器因绝对地址不一致导致的裂图差异
  - 原创文案、原创配图提示词、原创图片生成、二创文案、二创配图提示词、二创图片生成、参考图分析、图像生成、视频文案、视频提示词、视频成片生成现统一通过后台 API Provider 配置中心读取运行时模型配置
  - 当运行时 Provider 的 `baseUrl` 命中平台级第三方接口配置时，原创/二创/视频链路会优先使用当前品牌 Owner 在 `UserThirdPartyPlatformSecret` 中保存的私有 Key；文案、配图提示词、参考图分析、文生图与视频生成均走同一套品牌隔离规则
  - 原创/二创文案与配图提示词链路当前已支持多个 `text-global` Provider 并发存在；当技能或提示词保存了 `providerId::modelName` 形式的作用域模型值时，运行时会优先命中对应平台的同名模型
  - 文生图链路当前已兼容两种请求模式：OpenAI 兼容的多模态 `chat/completions`，以及 `Right Codes` 使用的 `/v1/images/generations`
  - 视频生成链路当前已从固定后端硬编码改为按 `ApiProviderConfig.extraParams` 驱动；支持 `backendKey / requestProfile / createPath / queryPath / queryMethod / queryBodyMode`
  - 当前 RunningHub 视频 Provider 已补入海螺 2.3、Vidu Q3、可灵 3.0、seedance 2.0、happyhorse 1.0 多组模型；查询统一兼容 `POST /openapi/v2/query` 与 `{ taskId }` 请求体
  - 当前火山方舟视频 Provider 已补入 `doubao-seedance-2-0-260128` 与 `doubao-seedance-2-0-fast-260128`；运行时创建接口兼容 `POST /api/v3/contents/generations/tasks`，查询接口兼容 `GET /api/v3/contents/generations/tasks/{id}`
  - 柏拉图共享代理视频 Provider 已从系统基线移除；旧视频任务元数据里若仍残留兼容值 `seedance / seedance20`，运行时会自动映射到 `volcengine_seedance_20`，避免历史默认值在创建新任务时直接落到已下线平台
  - 当前视频笔记已补入按第三方 `providerTaskId` 的手动恢复入口：`POST /api/works/brands/:brandId/xiaohongshu/video/recover`；可直接复查第三方任务状态，并在成功时把视频重新抓回站内 OSS 与作品元数据，不必再次扣费重跑
  - 当前 Seedance 视频链路会额外强制执行“至少 15 分钟”的有效轮询窗口；即使后台 Provider 元数据仍残留较短轮询参数，也不会在 15 分钟内因轮询查询异常或旧配置覆盖而提前报错
  - 当前视频第 3 阶段在第三方创建任务成功后，会立刻把 `providerTaskId` 写进作品元数据和站内任务 `outputJson`；即使后续轮询失败，也不会再丢失恢复所需的第三方任务 ID
  - 当前 `/xiaohongshu` 视频详情面板已补入“找回视频结果”入口；只要当前作品已带 `providerTaskId` 且尚未回填成片，可直接从页面内触发第三方任务复查并把结果同步回当前列表
  - 参考图风格分析当前对 `提示词/拆解图片提示词.txt` 增加了内置 fallback；即使外部 txt 缺失，也会回退到“反推出参考图 AI 生图中文描述词”的默认拆解提示词，不再直接因文件缺失中断原创笔记创作
  - 原创/二创最终出图阶段当前会把上传参考图原图与产品图/素材图一并传给图像模型，不再只把参考图拆成文字后就丢失原图输入
  - 后台技能中心当前已补入 `原创笔记-图片生成`、`二创笔记-图片生成` 两个独立技能节点，用于单独控制最终文生图模型和执行提示词
  - 原创/二创两条图片生成技能当前默认指向 `Right Codes · 文生图/图生图 / provider_runtime_image_generation_right_codes::gpt-image-2`；若数据库里仍残留旧的 `provider_runtime_image_generation::gpt-image-2` 基线，启动时会自动安全回填到新 provider，但不会覆盖后台后来手动改成的其他模型
  - 原创文案、原创配图提示词、二创文案、二创配图提示词、视频文案、视频提示词现已统一按后台技能中心当前默认模型作为真实第一跳模型；若失败再继续 fallback，并把实际尝试顺序写入错误提示
  - 参考变更：`docs/changes/2026-05-15-xhs-extension-and-image-generation-runtime.md`
  - 参考变更：`docs/changes/2026-05-16-runninghub-video-platform.md`
  - 参考变更：`docs/changes/2026-05-17-volcengine-seedance-video-providers.md`
  - 参考变更：`docs/changes/2026-05-18-remove-platogram-platform.md`
  - 参考变更：`docs/changes/2026-05-18-image-loading-optimization-phase-1.md`
  - 参考变更：`docs/changes/2026-05-18-image-loading-optimization-phase-2.md`
  - 参考变更：`docs/changes/2026-05-18-seedance-video-poll-window-fix.md`
  - 参考变更：`docs/changes/2026-05-18-video-note-provider-task-recovery.md`
  - 参考变更：`docs/changes/2026-05-19-xiaohongshu-video-timeout-hardening-and-recovery-entry.md`
  - 参考变更：`docs/changes/2026-05-19-xiaohongshu-video-provider-taskid-early-persist.md`
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
- `ThirdPartyPlatformsModule`
  - 当前已新增平台级第三方接口配置模块，后台通过 `/api/admin/third-party-platforms` 维护平台基线，个人中心通过 `/api/third-party-platforms` 读取并由拥有对应权限的成员保存私有 API Key
  - 当前该模块还负责把平台基线 + 品牌 Owner 私钥映射回 `ReportsModule` 与 `WorksModule` 的真实运行时；解析顺序为 `brandId -> ownerUserId -> platformId(baseUrl 匹配)`，命中平台后若缺少品牌私钥会直接返回提醒，不再允许继续落回 `ApiProviderConfig` 公共 Key
  - 数据库可用时优先读写 `ThirdPartyPlatformConfig` 与 `UserThirdPartyPlatformSecret`，数据库不可用时回退到 `mock-data`
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
4. 飞书同步接口除返回总 `syncedCount`、`tableCount` 外，还会补充各角色命中的 `matchedTables`、分类写入条数 `syncBreakdown` 和同步后工作区计数 `workspaceCounts`，便于直接区分“未命中对标表”“命中但写入 0 条”与“写入后重载读空”
5. 品牌增长页点击“从飞书同步”后会先落同步响应里的 `workspace`，再触发 `loadArchive()`；若重载后把 `benchmarkNotes` 刷成 0，但同步响应中已有对标作品，则继续保留该结果，避免页面把刚同步出来的数据瞬间刷没
6. `/xiaohongshu` 页面消费这些结果继续生成策划方案与营销日历
- 参考变更：`docs/changes/2026-05-14-feishu-partial-table-match-backfill.md`
- 参考变更：`docs/changes/2026-05-14-feishu-table-dedup-and-unique-count.md`
- 参考变更：`docs/changes/2026-05-14-feishu-sync-diagnostics-and-workspace-fallback.md`
- 参考变更：`docs/changes/2026-05-14-xhs-marketing-calendar-skill-and-seven-day-view.md`

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
4. 任务执行时读取品牌资料、小红书收集结果、每日热点、历史营销日历，以及前后台统一注册的 `xiaohongshu-marketing-calendar / prompt_xhs_calendar` 技能配置
5. 运行时优先采用后台技能中心为营销日历指定的模型，默认以 `deepseek-v4-pro` 作为文本模型兜底
6. 生成成功后写回新的 7 天营销日历；前端按 7 张真实日历卡片展示月份、日期与主题，点击后查看当天详情并支持直接编辑保存；失败时前端直接展示中文错误
7. 参考变更：`docs/changes/2026-05-14-xhs-marketing-calendar-skill-and-seven-day-view.md`

### 5.4 原创笔记链路

1. 用户在 `/xiaohongshu` 的“原创笔记”中选择营销日历选题或自定义选题
2. 页面可选带入产品、封面参考图、配图参考图、配图数量、是否植入营销策划方案与用户要求；参考图既可本地上传，也可从模板图库选择
3. 模板图库会先从 `/api/works/xiaohongshu/original/reference-templates` 拉分类与模板清单，支持关键词搜索、点击提示与每页 10 张分页；用户选中后再通过站内模板资产接口下载成 `File`
4. 后端 `WorksModule` 串联参考图分析、原创文案、`xhs-original-image-prompt` 配图提示词与文生图生成
5. 当前最终文生图阶段会继续读取 `xhs-original-image-generation / prompt_xhs_original_image_generation`，并把上传参考图原图一起传给图像模型
6. 当用户选择 `不植入营销策划方案` 时，原创生成可直接基于营销日历、产品、参考图和用户要求继续执行，不再强依赖先生成营销策划方案
7. 原创模板素材统一走 `reference-templates/xiaohongshu/original/...` 存储前缀；开发态未配置 OSS 时可临时回退到 `.runtime/local-oss`
8. 生成任务优先归属当前登录用户，并在创作完成后同步刷新小红书工作区与个人中心任务视图
9. 成品图文保存到作品记录，并同步沉淀到“我的作品”
10. `/admin` 技能中心当前可分别查看原创文案、原创配图提示词与原创图片生成三段技能
11. 模板库当前已移除 `夏日出行露营city walk小红书封面` 与 `夏日出行露营city walk小红书封面 / 效果图` 两组模板，封面模板与配图模板入口共用同一份裁剪后的清单
12. 参考变更：`docs/changes/2026-05-14-xhs-original-reference-template-library.md`、`docs/changes/2026-05-14-xhs-note-marketing-plan-toggle.md`、`docs/changes/2026-05-14-xhs-template-picker-pagination-and-pruning.md`、`docs/changes/2026-05-15-xhs-extension-and-image-generation-runtime.md`

### 5.4B 二创笔记链路

1. 用户在 `/xiaohongshu` 的“二创笔记”中从素材库选择一条已入库作品
2. 页面可选带入产品、账号角色、是否植入营销策划方案与用户要求
3. 后端 `WorksModule` 会先按当前团队角色收口账号角色，再基于素材库作品、二创文案提示词、二创配图提示词与独立的二创图片生成技能链路生成成品
4. 当前二创文案与配图提示词都会感知账号角色，让语气、人设和画面主体跟随发布主体调整
5. 当前最终文生图阶段会读取 `rewrite_image_generation / prompt_xhs_rewrite_image_generation`，并继续把素材库来源图片与产品图一并传给图像模型
6. 当用户选择 `不植入营销策划方案` 时，二创生成可直接基于素材库内容、产品信息和用户要求继续执行，不再强依赖先生成营销策划方案
7. 成品图文保存到作品记录，并把账号角色写入 `MediaAsset.metadataJson`，同步沉淀到“我的作品”
8. 参考变更：`docs/changes/2026-05-05-rewrite-note-workflow.md`、`docs/changes/2026-05-14-xhs-note-marketing-plan-toggle.md`、`docs/changes/2026-05-15-xhs-extension-and-image-generation-runtime.md`、`docs/changes/2026-05-16-xhs-all-works-account-role.md`

### 5.5 视频笔记链路

1. 用户在 `/xiaohongshu` 的“视频笔记”中选择营销日历选题或自定义选题
2. 创建弹窗当前固定只提供 `10 秒 / 15 秒` 两种时长，并新增 `品牌宣传视频 / 口播带货视频 / 短剧带货视频 / 复刻视频` 类型；`复刻视频` 必须选择视频素材
3. 页面可选带入产品或参考图、账号角色、视频素材、视频模型、是否植入营销策划方案，以及“剧本要求 / 故事板与视频要求”两组输入
4. 后端 `WorksModule` 会先按当前团队角色收口账号角色，再按视频类型读取对应提示词：品牌宣传剧本、口播带货剧本、短剧带货剧本、复刻视频拆解、故事板提示词、短视频提示词
5. 第 1 阶段先生成创意剧本；品牌宣传 / 口播带货 / 短剧带货直接根据用户输入生成，复刻视频则先基于所选素材的视频链接和拆解提示词生成剧情脚本
6. 第 2 阶段根据剧本和用户产品图生成故事板提示词，并调用 `gpt-image-2` 产出故事板图片
7. 第 2 阶段完成后，作品会停在 `WAITING_VIDEO`；前端详情区会显示进度、创意剧本、可编辑故事板提示词和故事板图片，用户可选择“修改”或“生成短视频”
8. 第 3 阶段根据故事板提示词生成短视频提示词，再结合故事板图片调用用户选择的视频模型生成最终短视频
9. 成品视频、中间剧本、故事板提示词、故事板图片与阶段状态都保存到作品记录，并把账号角色写入 `MediaAsset.metadataJson`，同步沉淀到“我的作品”
10. 当前视频 Provider 下拉已可直接读取 RunningHub 视频模型；运行时会按每条 Provider 的 `requestProfile` 组装请求体，并在查询阶段兼容 RunningHub 的 `POST /openapi/v2/query`
11. 当第 3 阶段已经有故事板图、但用户之前选择的是 RunningHub `*_t2v` 文生视频模型时，后端会优先自动切到同系列 `*_i2v` / `*_r2v` 图生视频后端，避免最终成片阶段继续拿文生接口硬跑
12. 当第 3 阶段图生视频需要把故事板图传给第三方时，后端不会再直接使用站内 `/api/works/brands/:brandId/assets/:fileName` 鉴权地址，而是优先转成 OSS 签名读链接，避免 RunningHub 无法读取参考图
13. 参考变更：`docs/changes/2026-05-16-runninghub-video-platform.md`、`docs/changes/2026-05-16-xhs-all-works-account-role.md`、`docs/changes/2026-05-17-video-note-staged-workflow-and-prompts.md`、`docs/changes/2026-05-17-video-note-runninghub-image-backend-fallback.md`、`docs/changes/2026-05-17-video-note-runninghub-reference-image-url-fix.md`

### 5.6 技能与提示词注册链路

1. 后台 `/admin` 的技能中心通过 `admin/skills-prompts` 读取技能配置与提示词模板
2. `SkillsPromptsService` 启动时优先检查 PostgreSQL 中的 `SkillConfig`、`PromptTemplate`
3. 若注册表为空，则把 `mock-data` 与真实 `SKILL.md + 同目录参考资料` 回填进数据库
4. `ReportsModule` 与 `WorksModule` 当前已优先从注册表读取品牌增长、小红书原创/二创/视频相关提示词
5. 小红书营销日历现也已纳入注册表：后台技能中心、个人中心技能中心与 `ReportsModule` 统一使用 `xiaohongshu-marketing-calendar / prompt_xhs_calendar`
6. 数据库已有旧内容时，后台读取链路仍会优先回源聚合文件内容；若命中的是营销日历旧占位短文案，则自动切换到内置完整 fallback，避免历史 `PromptTemplate.content` 继续挡住真实提示词
7. 个人中心用户技能覆盖层对营销日历提示词也会做同样的占位短文案矫正，避免历史 `UserPromptOverride.content` 把平台完整提示词重新覆盖坏
8. 数据库不可用时，后端才回退到 `mock-data + 文件/内置 fallback`
- 参考变更：`docs/changes/2026-05-13-admin-skill-center-reference-bundles.md`
- 参考变更：`docs/changes/2026-05-14-xhs-marketing-calendar-skill-and-seven-day-view.md`

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
- 个人中心已接入第一版真实多用户登录态，并已落地概览页、`/orders`、`/works`、`/skills`、`/third-party-platforms`、`/security`、`/tasks`、`/team`、`/invites` 九段前端路由；其中 `orders` 已支持用户级订单查询、状态/类型筛选与订单详情跳转，`works` 已支持用户级作品资产查询、范围/类型筛选、小红书工作台回跳与源文件打开，`skills` 已支持平台技能基线查看、状态筛选与提示词场景参考，`third-party-platforms` 已支持按平台查看基线并由 Owner 保存私有 API Key，`security` 已支持当前浏览器登录态、token 持有状态、品牌上下文与退出入口可视化，`team` 已支持成员添加、角色/状态修改、创建邀请、撤回邀请、接受邀请、邀请码加入、邀请链接复制、成员审计日志查看和主账号转移入口；真正的用户技能覆盖层、更细的任务中心能力与安全设置写操作仍待继续升级
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
