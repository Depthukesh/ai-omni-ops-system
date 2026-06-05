# 2026-06-03 公众号工作台正式落地与发布链路补齐

## 背景

- 公众号板块原先只有演示页面和零散说明，未在正式 `docs/` 体系中登记为已落地工作台。
- 本轮代码已经补齐公众号独立页面、配置保存、原创创作、HTML 草稿生成和一键发布入口，但 `docs/site-map.md` 仍写着“公众号尚未独立落地”。
- 用户明确要求按照 `AGENTS.md` 更新正式文档体系，而不是只更新 `.trae` 内部文档。

## 本次调整

### 1. 前台新增独立公众号工作台

- 页面入口：
  - `apps/web/src/app/(dashboard)/wechat/page.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- 工作台结构已收口为两个正式板块：
  - 配置页面
  - 原创创作
- 顶部导航已补入独立 `公众号` 入口，前台登录拦截范围同步覆盖 `/wechat`

### 2. 配置页补齐公众号正式配置

- 前端配置页当前只保留：
  - `AppID`
  - `AppSecret`
  - `IP 白名单`
- 对应前端服务：
  - `getWechatAccountConfig`
  - `saveWechatAccountConfig`
- 对应后端接口：
  - `GET /works/brands/:brandId/wechat/config`
  - `POST /works/brands/:brandId/wechat/config`
- 服务端会返回 `appSecretMasked` 供前端掩码回显。
- 若用户本次未重填 `AppSecret`，但品牌下已有旧密钥，保存时会沿用旧值，不强制每次重新填写。

### 3. 原创创作页补齐正式创作链路

- 创作页当前会并行读取：
  - 当前品牌档案
  - 小红书营销日历工作区
  - 公众号配置
  - 公众号文章草稿列表
- 添加原创文章弹窗已收口为：
  - 营销日历下拉
  - 产品信息下拉
  - 品牌资料是否植入
  - 图片生成策略
  - 主题颜色
  - 创作要求
- 对应前端服务：
  - `getWechatArticleDrafts`
  - `generateWechatArticleDraft`
  - `updateWechatArticleDraft`
- 对应后端接口：
  - `GET /works/brands/:brandId/wechat/articles`
  - `POST /works/brands/:brandId/wechat/articles/generate`
  - `PATCH /works/brands/:brandId/wechat/articles/:draftId`
- 生成结果当前固定为 `HTML` 草稿，并在作品记录中保留：
  - 营销日历标签
  - 产品标签
  - 品牌资料标签
  - 主题色
  - 图片任务信息
  - 发布状态

### 4. 技能中心与发布入口同步补齐

- 后台技能中心和前台技能中心当前已补入两个公众号技能叶子项：
  - `公众号-创作文章`
  - `公众号-制作图片`
- 对应技能 slug：
  - `wechat-article-composer`
  - `wechat-image-designer`
- 前端发布服务新增：
  - `publishWechatArticleToOfficialAccount`
- 后端发布接口新增：
  - `POST /publishing/brands/:brandId/wechat/articles/:draftId/publish`
- 发布执行当前通过 `PublishingModule -> WorksModule.publishWechatArticleDraft()` 统一处理：
  - 配置校验
  - 发布任务创建
  - 草稿状态回写为 `PUBLISHED`

### 5. 正式文档体系同步补齐

- 本轮已更新：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
- 目的：
  - 把公众号从“未独立落地”修正为“已独立落地正式工作台”
  - 把 `/wechat` 的页面结构、service/API 关系和发布链路补入正式地图

### 6. 权限与创作参数补充修正

- 公众号接口最初误复用了 `personalCenter.works` 权限，导致部分品牌成员进入 `/wechat` 后会提示无权限。
- 本次已新增独立公众号品牌权限：
  - `wechat.config`
  - `wechat.original`
- 当前公众号配置、草稿列表、草稿生成、草稿更新和一键发布分别改为走对应的公众号权限，不再借道“我的作品”权限。
- 原创创作弹窗中的“产品信息”当前已补充 `不植入产品` 选项：
  - 选中后会按“无具体产品植入”生成文章内容
  - 作品卡片也会明确显示 `不植入产品`
- 发布接口补权限校验后，`PublishingController` 新增了 `AuthService` 依赖；本次同步修正 `PublishingModule` 的模块导入，补齐 `AuthModule`，避免生产环境启动时报 `Nest can't resolve dependencies of the PublishingController`。
- 公众号工作台初始加载曾先用默认 `DEMO_BRAND_ID` 发起一次请求，再切换到当前品牌重新加载，导致旧请求失败后把“当前账号无权访问该品牌”残留到页面顶部；本次已改为直接用登录态当前品牌初始化，并在加载 effect 中增加过期请求保护。
- 公众号配置页当前不会再因为品牌档案或小红书营销日历这些辅助数据读取失败而阻塞主页面配置加载。

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/wechat/page.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/services/publishing.ts`
  - `apps/web/src/services/brand-growth.ts`
  - `apps/web/src/app/(dashboard)/layout.tsx`
  - `apps/web/src/app/(dashboard)/skill-center-config.ts`
- 后端：
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/publishing/publishing.controller.ts`
  - `apps/server/src/modules/publishing/publishing.module.ts`
  - `apps/server/src/modules/publishing/publishing.service.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `packages/shared/src/brand-permissions.ts`
- 文档：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
  - 本文档

## 验证

- 已核对真实代码入口与接口：
  - `apps/web/src/app/(dashboard)/wechat/page.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/services/publishing.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/publishing/publishing.controller.ts`
  - `apps/server/src/modules/publishing/publishing.service.ts`
- 已核对正式文档基线：
  - `AGENTS.md`
  - `docs/development-delivery-checklist.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
- 本轮为文档补更，不涉及新增代码编译验证；代码编译通过状态沿用上一轮公众号代码提交时的前后端 TypeScript 校验结果。

## 后续关注

- 当前公众号工作台、配置保存、草稿生成和一键发布入口已经落地，但发布内部仍是站内状态流转骨架。
- 若后续继续推进公众号正式发布，需要把当前 `publishWechatArticleDraft()` 内部执行替换为真实公众号官方 API。
- 若公众号后续新增更多板块，如素材管理、草稿箱同步、历史群发记录，还需继续同步更新 `docs/site-map*` 与新的 `docs/changes/*.md`。

---

## 2026-06-05 技术重构方案补充

### 补充背景

- 用户进一步确认：当前公众号创作文章板块并未按 `baoyu-post-to-wechat` 技能文档的多步骤工作流开发。
- 用户提供的技能文档包含：
  - `SKILL.md`
  - `references/`
  - `scripts/`
- 当前站内实现仍属于“一次提交表单 -> 直接生成 HTML 草稿 -> 站内骨架发布”的 MVP，不满足正式工作流要求。
- 本次补充的目标不是继续修补现有页面，而是形成一份可直接落地的技术方案，作为下一阶段公众号模块重构基线。

### 本次重构的明确约束

#### 1. 发布方式固定为 API

- 只保留 `api` 模式。
- 明确禁止 `browser` 模式，不再支持：
  - 浏览器自动化发文
  - Chrome 登录态依赖
  - 剪贴板粘贴发文
  - CDP 驱动占位图替换
- 因此外部技能仓库中的以下能力本次不进入一期实现：
  - `scripts/wechat-article.ts`
  - `scripts/wechat-browser.ts`
  - `scripts/cdp.ts`
  - `scripts/copy-to-clipboard.ts`
  - `scripts/paste-from-clipboard.ts`

#### 2. 创作工作流必须新增“生图”阶段

- 原先的“生成或编辑文章内容”之后，必须新增独立“生图”步骤。
- 这一步不是附带元数据，而是独立阶段，负责：
  - 公众号封面图生成
  - 正文插图生成
  - 图片任务状态回写
  - 图片资产绑定

#### 3. 公众号需形成独立模块能力

- 公众号不能继续作为“品牌增长报告 / 小红书营销日历 / 发布模块”的附属工作区。
- 公众号需要形成独立的模块边界，包括：
  - 独立工作流状态机
  - 独立配置模型
  - 独立发布执行模型
  - 独立历史记录
  - 独立技能配置
  - 独立文档登记

### 与当前实现的核心差距

#### 当前实现

- 工作区只有：
  - 配置页面
  - 原创创作
- 草稿生成为单步接口：
  - `POST /works/brands/:brandId/wechat/articles/generate`
- 发布为站内骨架：
  - `POST /publishing/brands/:brandId/wechat/articles/:draftId/publish`
- 工作流中没有：
  - 首次初始化配置
  - 多步骤状态机
  - 生图阶段
  - API 凭证引导
  - 正式发布报告

#### 目标实现

- 公众号工作区升级为多步骤独立模块：
  1. 初始化配置
  2. 输入与创作
  3. 文章生成与编辑
  4. 生图
  5. 发布参数确认
  6. API 发布
  7. 完成报告与历史

### 目标工作流

#### Step 0：初始化配置

- 检查是否存在公众号模块配置。
- 对齐技能文档中 `EXTEND.md` 的角色，但落地到站内配置模型，不直接照搬本地文件依赖。
- 初始必须先完成以下默认项：
  - 默认主题
  - 默认颜色
  - 默认作者
  - 评论是否开启
  - 是否仅粉丝评论
  - 默认 API 发布账号

#### Step 0.5：账号解析

- 若品牌下配置了多个公众号账号，则必须先选账号。
- 账号解析结果影响：
  - AppID / AppSecret
  - 封面上传
  - 草稿发布
  - 默认作者
  - 默认评论配置

#### Step 1：输入与创作来源选择

- 公众号模块应支持四类输入来源：
  - 纯文本创作
  - Markdown 文件
  - HTML 文件
  - 基于品牌资料与营销日历生成创作草稿
- 营销日历是可选上游，不再是公众号模块的唯一前置依赖。

#### Step 2：文章生成或编辑

- 生成或编辑阶段的产物至少包含：
  - 标题
  - 摘要
  - 正文结构
  - 作者
  - 标签/栏目归属
  - HTML 原始稿
- 这一步支持自动生成与人工修改闭环。

#### Step 3：生图

- 这是本次重构必须新增的独立步骤。
- 输入：
  - 文章标题
  - 摘要
  - 正文段落结构
  - 品牌资料
  - 产品资料
  - 主题色
  - 图片风格
- 输出：
  - 封面图
  - 正文插图列表
  - 图片任务状态
  - 图片资产 URL / 本地文件引用
- 能力来源：
  - 复用当前平台已有图像生成供应商能力
  - 不再只保留一个 `imageTask` 元数据占位

#### Step 4：发布参数确认

- 固定使用 `api` 模式，不再出现发布方式切换。
- 在真正发布前，统一确认以下字段：
  - 标题
  - 摘要
  - 作者
  - 封面图
  - 评论开关
  - 仅粉丝评论
  - 所属账号
- 若封面图、AppID、AppSecret 等关键项缺失，则阻止进入发布阶段。

#### Step 5：API 发布

- 调用公众号官方 API，目标至少为：
  - 上传封面素材
  - 调用 `draft/add`
  - 写入公众号草稿箱
- 发布结果需要回写：
  - `media_id`
  - 发布时间
  - 发布状态
  - 失败错误详情

#### Step 6：完成报告

- 返回一份结构化完成报告，至少包括：
  - 发布方式：`API`
  - 标题
  - 摘要
  - 图片数量
  - 评论设置
  - 发布结果
  - `media_id`
  - 草稿箱状态
  - 重试入口

### 前端技术方案

#### 页面结构

- `/wechat` 不再只保留“配置页面 / 原创创作”。
- 建议升级为独立模块壳层，左侧导航至少包含：
  - 配置初始化
  - 创作工作流
  - 发布历史

#### 创作工作流页

- 顶部改为阶段条：
  - 输入
  - 文章
  - 生图
  - 发布确认
  - 发布结果
- 现有“添加原创文章”弹窗需要重构为分步面板，不再一次性提交全部字段。

#### 前端新增核心能力

- 初始化配置表单
- 多账号切换器
- Markdown / HTML 输入入口
- 文章编辑器
- 生图结果面板
- 发布参数确认面板
- 发布结果报告面板
- 历史与重试面板

#### 前端服务层建议新增

- `getWechatWorkflowPreferences`
- `saveWechatWorkflowPreferences`
- `listWechatAccounts`
- `createWechatWorkflow`
- `getWechatWorkflowSession`
- `updateWechatWorkflowInput`
- `updateWechatWorkflowDraft`
- `generateWechatWorkflowImages`
- `confirmWechatWorkflowPublishPayload`
- `publishWechatWorkflowByApi`
- `listWechatPublishHistory`
- `retryWechatPublishExecution`

### 后端技术方案

#### 模块拆分建议

- 当前公众号逻辑集中在 `WorksModule` / `PublishingModule` 内，建议重构为以下内部服务：
  - `wechat-config.service.ts`
  - `wechat-workflow.service.ts`
  - `wechat-article.service.ts`
  - `wechat-image.service.ts`
  - `wechat-publish.service.ts`
  - `wechat-history.service.ts`

#### 状态机建议

- 建议新增工作流状态：
  - `INIT_REQUIRED`
  - `ACCOUNT_REQUIRED`
  - `INPUT_PENDING`
  - `ARTICLE_PENDING`
  - `IMAGE_PENDING`
  - `PUBLISH_CONFIRM_PENDING`
  - `PUBLISHING`
  - `PUBLISHED`
  - `FAILED`

#### 接口建议

- 配置类：
  - `GET /works/brands/:brandId/wechat/preferences`
  - `POST /works/brands/:brandId/wechat/preferences/init`
  - `PATCH /works/brands/:brandId/wechat/preferences`
  - `GET /works/brands/:brandId/wechat/accounts`
- 工作流类：
  - `POST /works/brands/:brandId/wechat/workflows`
  - `GET /works/brands/:brandId/wechat/workflows/:workflowId`
  - `PATCH /works/brands/:brandId/wechat/workflows/:workflowId/input`
  - `PATCH /works/brands/:brandId/wechat/workflows/:workflowId/article`
  - `POST /works/brands/:brandId/wechat/workflows/:workflowId/images/generate`
  - `PATCH /works/brands/:brandId/wechat/workflows/:workflowId/publish-confirm`
  - `POST /publishing/brands/:brandId/wechat/workflows/:workflowId/publish`
- 历史类：
  - `GET /works/brands/:brandId/wechat/publish-history`
  - `POST /publishing/brands/:brandId/wechat/publish-history/:executionId/retry`

#### 数据结构建议

- `WechatWorkflowPreferenceRecord`
- `WechatOfficialAccountRecord`
- `WechatWorkflowSessionRecord`
- `WechatArticleDraftRecord`
- `WechatImageBundleRecord`
- `WechatPublishExecutionRecord`

#### 关键存储字段建议

- `WechatWorkflowSessionRecord`
  - `id`
  - `brandId`
  - `accountId`
  - `status`
  - `currentStep`
  - `inputType`
  - `publishMethod` 固定为 `API`
- `WechatImageBundleRecord`
  - `coverImageUrl`
  - `inlineImages`
  - `imagePromptSummary`
  - `imageTaskStatus`
- `WechatPublishExecutionRecord`
  - `mediaId`
  - `requestPayloadSnapshot`
  - `responseSnapshot`
  - `publishedAt`
  - `errorDetail`

### references 与 scripts 的落地方式

#### references 的作用

- 本轮不把外部技能仓库文档直接原样搬进运行时，而是将其转译为站内产品规则来源：
  - `references/config/first-time-setup.md`
    - 对应站内首次初始化流程
  - `references/api-setup.md`
    - 对应公众号 API 凭证引导
  - `references/article-posting.md`
    - 对应文章输入格式、元数据校验、主题与摘要处理
  - `references/multi-account.md`
    - 对应多账号配置结构

#### scripts 的一期采用范围

- 一期保留并适配：
  - `scripts/wechat-api.ts`
  - `scripts/md-to-wechat.ts`
  - `scripts/check-permissions.ts`
  - `scripts/wechat-extend-config.ts`
- 一期不接入：
  - `scripts/wechat-article.ts`
  - `scripts/wechat-browser.ts`
  - 所有浏览器粘贴链路脚本

#### 执行方式建议

- 不建议前端直接调用外部脚本。
- 建议由后端统一编排脚本能力或重写成站内 service：
  - Markdown 转公众号 HTML
  - API 凭证检测
  - 草稿发布
  - 结果回写

### 对其他模块的影响评估

#### 1. 对品牌增长模块的影响

- 当前公众号创作依赖品牌增长下的营销日历。
- 若公众号改为独立模块，营销日历应从“硬依赖”改为“可选资料源”。
- 但品牌增长仍保留作为推荐上游资料来源，不应断开数据复用。

#### 2. 对小红书模块的影响

- 营销日历底层仍来自小红书营销规划链路。
- 只要营销日历结构和接口不改，小红书原工作流可保持不变。
- 若后续把营销日历抽象成独立资源接口，则小红书与公众号都应切到统一日历资源层。

#### 3. 对技能中心的影响

- 当前公众号仅登记：
  - `公众号-创作文章`
  - `公众号-制作图片`
- 后续建议新增或明确拆分：
  - `公众号-创作文章`
  - `公众号-封面图生成`
  - `公众号-正文配图生成`
  - `公众号-API发布`
- 前台品牌共享技能覆盖与后台平台基线配置都需要同步更新。

#### 4. 对 PublishingModule 的影响

- 当前 `publishWechatArticleDraft()` 是站内状态流转骨架。
- 重构后需要升级为真实 API 发布执行入口。
- 这将影响：
  - 发布参数校验
  - 错误处理
  - 发布历史
  - 重试机制

#### 5. 对权限体系的影响

- 当前已有独立权限：
  - `wechat.config`
  - `wechat.original`
- 重构后建议继续细分：
  - `wechat.images`
  - `wechat.publish`
  - `wechat.history`

### 实施分期建议

#### 第一期：独立模块与工作流骨架

- 目标：
  - 把公众号升级为独立模块
  - 建立多步骤状态机
- 交付：
  - 初始化配置
  - 输入
  - 文章
  - 生图
  - 发布确认
  - 发布结果页

#### 第二期：真实 API 发布

- 目标：
  - 替换当前假发布
- 交付：
  - AppID / AppSecret 校验
  - Token 获取
  - 封面上传
  - `draft/add`
  - `media_id` 回写
  - 发布失败重试

#### 第三期：历史与模块联动

- 目标：
  - 形成正式模块能力
- 交付：
  - 发布历史
  - 失败诊断
  - 作品中心联动
  - 任务中心联动
  - 技能中心扩展

### 需要同步更新的文档

- 本方案进入执行阶段后，至少还需同步更新：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
- 若一期开始动工，应新增一篇新的 `docs/changes/*.md`，专门记录：
  - API-only 发布约束
  - 生图阶段落地
  - 独立模块化重构
  - 影响品牌增长 / 营销日历 / 技能中心 / 发布模块的耦合关系

### 最终判断

- 当前 2026-06-03 的公众号落地是一个有效的第一版工作台，但已经不能作为后续正式实施目标。
- 下一阶段公众号应以“API-only 发布 + 生图步骤 + 独立模块能力”为新目标进行重构。
- 当前文档自此同时承担两个职责：
  - 记录 2026-06-03 已落地的第一版实现
  - 作为 2026-06-05 后续重构的技术方案基线

### 可开工任务清单

#### 总体执行原则

- 按“先骨架、后真实发布、再联动沉淀”的顺序推进。
- 每个任务必须同时覆盖：
  - 前端页面或交互
  - 后端接口或服务
  - 技能中心与权限影响
  - 文档同步
- 严禁在一期中混入 `browser` 发布能力。

#### 里程碑 M1：公众号独立模块骨架

##### 任务 1：重构公众号工作区壳层

- 目标：
  - 把当前 `/wechat` 从“双页签页面”重构为独立模块壳层。
- 输出：
  - 左侧导航：配置初始化 / 创作工作流 / 发布历史
  - 中间内容区：根据子模块切换
- 主要文件：
  - `apps/web/src/app/(dashboard)/wechat/page.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/styles/globals.css`
- 依赖：
  - 无
- 验收：
  - 页面结构完成切换
  - 原有“配置页面 / 原创创作”入口被新壳层吸收

##### 任务 2：定义公众号工作流状态模型

- 目标：
  - 把现有“单次生成草稿”改为多步骤状态机。
- 输出：
  - `INIT_REQUIRED`
  - `ACCOUNT_REQUIRED`
  - `INPUT_PENDING`
  - `ARTICLE_PENDING`
  - `IMAGE_PENDING`
  - `PUBLISH_CONFIRM_PENDING`
  - `PUBLISHING`
  - `PUBLISHED`
  - `FAILED`
- 主要文件：
  - `apps/server/src/modules/works/works.service.ts`
  - 建议新增 `apps/server/src/modules/works/wechat-workflow.service.ts`
  - `apps/web/src/services/works.ts`
- 依赖：
  - 任务 1
- 验收：
  - 可以读取工作流状态
  - 前端可根据状态渲染阶段条

##### 任务 3：梳理并废弃旧单步链路

- 目标：
  - 标记旧的“一步生成草稿”接口为兼容态，不再作为主流程入口。
- 输出：
  - 保留兼容接口
  - 新工作流接口作为主入口
- 主要文件：
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/web/src/services/works.ts`
- 依赖：
  - 任务 2
- 验收：
  - 新旧链路可以共存
  - 新页面不再直接依赖旧 `generateWechatArticleDraft`

#### 里程碑 M2：配置初始化与账号体系

##### 任务 4：实现公众号工作流初始化配置

- 目标：
  - 把 `references/config/first-time-setup.md` 转译成站内首次初始化流程。
- 输出：
  - 默认主题
  - 默认颜色
  - 默认作者
  - 评论开关
  - 仅粉丝评论
  - 默认 API 发布账号
- 主要文件：
  - 建议新增 `apps/server/src/modules/works/wechat-config.service.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/services/works.ts`
- 依赖：
  - 任务 1
- 验收：
  - 未初始化时必须先进入初始化流程
  - 初始化完成后才能创建工作流

##### 任务 5：实现多账号配置与账号选择

- 目标：
  - 支持一个品牌下配置多个公众号账号。
- 输出：
  - 账号列表
  - 默认账号
  - 工作流开始时账号选择
- 主要文件：
  - `apps/server/src/modules/works/works.service.ts`
  - 建议新增 `wechat-config.service.ts`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- 依赖：
  - 任务 4
- 验收：
  - 工作流 session 持有 `accountId`
  - 发布前可确认所属账号

##### 任务 6：实现 API 凭证缺失引导

- 目标：
  - 对齐 `references/api-setup.md`，当缺失 `AppID/AppSecret` 时自动引导配置。
- 输出：
  - 账号级凭证校验
  - 缺失时的引导状态
  - 保存后回到当前工作流
- 主要文件：
  - `works.service.ts`
  - `wechat-config.service.ts`
  - `workspace-shell.tsx`
- 依赖：
  - 任务 5
- 验收：
  - 未配置凭证时不能进入发布确认
  - 配置完成后不丢失当前工作流上下文

#### 里程碑 M3：创作输入与文章生成

##### 任务 7：实现输入类型选择器

- 目标：
  - 支持纯文本、Markdown、HTML、营销日历派生创作四类输入。
- 输出：
  - 输入方式切换 UI
  - 对应 payload 结构
- 主要文件：
  - `workspace-shell.tsx`
  - `works.ts`
  - `works.controller.ts`
  - `wechat-workflow.service.ts`
- 依赖：
  - 任务 2
- 验收：
  - 四类输入均可创建工作流
  - 营销日历来源为可选而非必填

##### 任务 8：实现文章生成与编辑阶段

- 目标：
  - 输出可编辑的文章正文与元数据，而不是一次性只回 HTML。
- 输出：
  - 标题
  - 摘要
  - 作者
  - 正文结构
  - HTML 预览稿
- 主要文件：
  - `works.service.ts`
  - `wechat-article.service.ts`
  - `workspace-shell.tsx`
  - `works.ts`
- 依赖：
  - 任务 7
- 验收：
  - 支持保存草稿
  - 支持修改后继续流转到生图阶段

##### 任务 9：接入 Markdown 转公众号 HTML 转换层

- 目标：
  - 对齐 `scripts/md-to-wechat.ts` 与 `references/article-posting.md` 的规则。
- 输出：
  - Markdown 转公众号友好 HTML
  - 元数据抽取
  - 外链脚注化策略
- 主要文件：
  - 建议新增 `wechat-article.service.ts`
  - `works.service.ts`
- 依赖：
  - 任务 8
- 验收：
  - Markdown 输入可稳定转换
  - 文章 HTML 不再依赖当前简化模板直接拼接

#### 里程碑 M4：生图阶段

##### 任务 10：建立公众号图片任务模型

- 目标：
  - 把封面图和正文插图从草稿附属字段升级为独立任务产物。
- 输出：
  - `WechatImageBundleRecord`
  - 封面图任务状态
  - 正文插图任务状态
- 主要文件：
  - `works.service.ts`
  - 建议新增 `wechat-image.service.ts`
  - `apps/web/src/services/works.ts`
- 依赖：
  - 任务 2
- 验收：
  - 工作流能独立读取图片任务状态

##### 任务 11：实现封面图生成链路

- 目标：
  - 根据文章内容生成公众号封面。
- 输出：
  - 封面图提示词
  - 封面图结果
  - 封面图失败信息
- 主要文件：
  - `wechat-image.service.ts`
  - 图像供应商调用相关 service
  - `workspace-shell.tsx`
- 依赖：
  - 任务 10
- 验收：
  - 封面图生成完成后可进入发布确认

##### 任务 12：实现正文插图生成链路

- 目标：
  - 根据正文段落结构生成多张插图。
- 输出：
  - 插图任务列表
  - 插图资产 URL
  - 失败重试入口
- 主要文件：
  - `wechat-image.service.ts`
  - `workspace-shell.tsx`
  - `works.ts`
- 依赖：
  - 任务 10
- 验收：
  - 支持多图生成
  - 结果可回填文章预览

##### 任务 13：新增公众号图片技能叶子项

- 目标：
  - 技能中心从“公众号-制作图片”扩展为更细粒度能力。
- 输出：
  - `公众号-封面图生成`
  - `公众号-正文配图生成`
- 主要文件：
  - `apps/web/src/app/(dashboard)/skill-center-config.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - 提示词目录文件
- 依赖：
  - 任务 11、任务 12
- 验收：
  - 前后台技能中心均能看到新叶子项

#### 里程碑 M5：API 发布与历史

##### 任务 14：实现 API 发布确认阶段

- 目标：
  - 固定 `api` 模式下，统一校验所有发布参数。
- 输出：
  - 发布确认页
  - 参数快照
  - 缺失项阻断逻辑
- 主要文件：
  - `workspace-shell.tsx`
  - `works.ts`
  - `works.service.ts`
- 依赖：
  - 任务 8、任务 11
- 验收：
  - 缺少封面或凭证时不能发布

##### 任务 15：替换站内假发布为真实 API 发布

- 目标：
  - 替换当前 `publishWechatArticleDraft()` 的骨架流转。
- 输出：
  - 获取 access token
  - 上传封面素材
  - 调用 `draft/add`
  - 回写 `media_id`
- 主要文件：
  - `apps/server/src/modules/publishing/publishing.service.ts`
  - `apps/server/src/modules/publishing/publishing.controller.ts`
  - 建议新增 `wechat-publish.service.ts`
- 依赖：
  - 任务 14
- 验收：
  - 发布结果来自真实公众号 API
  - 失败时保留错误详情

##### 任务 16：实现发布历史与重试

- 目标：
  - 增加公众号发布历史、失败重试与结果报告。
- 输出：
  - 发布历史页
  - 重试接口
  - 发布执行报告
- 主要文件：
  - `workspace-shell.tsx`
  - `publishing.ts`
  - `publishing.service.ts`
  - 建议新增 `wechat-history.service.ts`
- 依赖：
  - 任务 15
- 验收：
  - 能查看历史记录
  - 能对失败任务执行重试

#### 里程碑 M6：联动与文档收口

##### 任务 17：调整公众号对营销日历的依赖关系

- 目标：
  - 将营销日历从硬依赖改为可选资料源。
- 输出：
  - 营销日历可选接入
  - 无营销日历时仍能完成文章工作流
- 主要文件：
  - `workspace-shell.tsx`
  - `works.service.ts`
  - `docs/site-map.md`
- 依赖：
  - 任务 7
- 验收：
  - 不依赖营销日历也能创建公众号工作流

##### 任务 18：补齐权限拆分

- 目标：
  - 在现有 `wechat.config / wechat.original` 基础上继续细分。
- 输出：
  - `wechat.images`
  - `wechat.publish`
  - `wechat.history`
- 主要文件：
  - `packages/shared/src/brand-permissions.ts`
  - 相关 controller / service
- 依赖：
  - 任务 10、任务 15、任务 16
- 验收：
  - 不同角色对图片生成、发布、历史访问受控

##### 任务 19：同步更新站点地图与模块说明

- 目标：
  - 让正式 docs 反映公众号模块重构后的结构。
- 输出：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
  - 新的 `docs/changes/*.md`
- 依赖：
  - 至少完成 M1-M3
- 验收：
  - 文档与实际页面/接口一致

### 建议开工顺序

#### 第一批必须先做

- 任务 1：重构公众号工作区壳层
- 任务 2：定义公众号工作流状态模型
- 任务 4：实现公众号工作流初始化配置
- 任务 7：实现输入类型选择器
- 任务 8：实现文章生成与编辑阶段

#### 第二批紧接着做

- 任务 10：建立公众号图片任务模型
- 任务 11：实现封面图生成链路
- 任务 12：实现正文插图生成链路
- 任务 14：实现 API 发布确认阶段

#### 第三批收口做

- 任务 15：替换站内假发布为真实 API 发布
- 任务 16：实现发布历史与重试
- 任务 18：补齐权限拆分
- 任务 19：同步更新站点地图与模块说明

### 一期完成标准

- 公众号模块具备独立壳层
- 支持初始化配置
- 支持四类输入源
- 支持文章生成与编辑
- 支持封面图与正文配图生成
- 支持 API 发布确认
- 保留发布历史骨架
- 不再依赖 `browser` 模式

### 风险提醒

- 若直接在现有 `WorksService` 中继续堆逻辑，会进一步加重模块耦合。
- 若不先拆状态机就接真实 API，后续前端阶段流会反复返工。
- 若不先抽离图片任务模型，“生图”步骤会再次退化成附属字段，无法形成独立能力。
