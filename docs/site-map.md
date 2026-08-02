# AI全域运营系统全站地图

## 1. 文档定位

本文件只记录当前系统的真实结构，不再混入历史规划稿、已放弃路线或展示镜像。

它需要回答四个问题：

1. 现在有哪些真实入口
2. 每条主链路由哪些前后端模块承接
3. 哪些能力已经正式落地
4. 哪些目录是当前真相，哪些目录只是历史参考

## 2. 顶层结构

### 2.1 代码目录

- `apps/web`
  - 官网首页、认证页、前台工作台、个人中心、后台管理台、帮助页、发布页
- `apps/server`
  - 认证、品牌、采集、报告、作品、任务、发布、系统升级、OpenClaw、后台治理等 API 模块
- `packages/config`
  - 配置相关共享包
- `packages/prompt-runtime`
  - 提示词与运行时能力
- `packages/shared`
  - 前后端共享类型与常量
- `packages/ui`
  - 共享 UI 预留层
- `docs`
  - 当前真相文档、专题方案、变更记录、历史规划

### 2.2 文档目录

- `docs/README.md`
  - 文档总入口
- `docs/changes/`
  - 真实变更记录
- `docs/project_planning/`
  - 历史规划与阶段草案，仅作参考
- `docs/openclaw/`
  - OpenClaw 相关专题文档

## 3. 前端路由地图

### 3.1 公共与认证入口

- `/`
  - 官网首页，当前是营销型首页
- `/login`
  - 前台登录页
- `/register`
  - 前台注册页；网站版默认仍走邀请码注册，`local-single-user` 安装态改为按 `GET /auth/register-config` 动态切到“直接注册”
- `/admin/login`
  - 后台管理员登录页
- `/help/xhs-draft-publisher`
  - 小红书扩展帮助页
- `/help/publisher`
  - 统一发布扩展帮助页
- `/help/douyin-publisher`
  - 抖音扩展帮助页
- `/help/wechat-channel-publisher`
  - 视频号扩展帮助页
- `/publish/mobile/[token]`
  - 移动发布接力页

### 3.2 受保护工作台入口

- `/brand-growth`
  - 品牌增长策略工作台
- `/xiaohongshu`
  - 小红书工作台
- `/douyin`
  - 抖音工作台
- `/wechat`
  - 公众号工作台
- `/more-features`
  - 更多功能入口，当前重定向到 `/more-features/design`
- `/more-features/design`
  - 设计工作台
- `/personal-center`
  - 个人中心总入口
- `/admin`
  - 后台管理台
- `/membership-purchase`
  - 会员购买
- `/points-purchase`
  - 点数购买
- `/orders/[id]`
  - 订单详情

### 3.3 登录门卫规则

- `/brand-growth`、`/xiaohongshu`、`/douyin`、`/wechat`、`/more-features/design`、`/personal-center/*` 默认要求登录
- 未登录时统一跳转 `/login?next=...`
- `/admin` 额外要求管理员身份

## 4. 主要业务板块

### 4.1 品牌增长策略 `/brand-growth`

包含四类主工作区：

- 品牌资料库
  - 品牌背景、产品资料、品牌运营情况、第三方数据、企业知识库
- 收集数据
  - 小红书采集、抖音采集、公众号采集（品牌公众号数据 / 对标作品信息及数据 / 微信搜一搜）、每日热点、飞书绑定
- 品牌增长报告
  - 品牌增长报告、可视化报告、半年营销规划、营销日历、选题库、素材库（统一素材库）
- OpenClaw专区
  - 龙虾日记（仅 OpenClaw Agent 创建，页面侧只支持查看与删除）

当前特点：

- 首次进入会通过 `/auth/me` 校正真实品牌上下文
- 报告类任务走后台任务中心
- 知识绑定已进入部分报告运行时
- 营销日历已收口在品牌增长策略，而不是继续挂在小红书首页
- OpenClaw 专区与品牌增长共用左侧手风琴导航，龙虾日记数据由 `openclaw` 模块提供

### 4.2 小红书工作台 `/xiaohongshu`

包含：

- 营销策划方案
- 原创笔记
- 二创笔记
- 视频笔记
- 发布工作流

当前特点：

- 页面结构已拆成薄入口 + `workspace-shell`
- 创作侧素材选择已统一切到品牌增长策略 → 品牌增长报告 → 素材库
- 原创 / 二创 / 视频创建与编辑已经拆分为独立字段组件和模态组件
- 受保护媒体预览已走鉴权 blob / 共享缓存
- 账号角色已进入作品元数据

### 4.3 抖音工作台 `/douyin`

包含：

- 营销策划方案
- 热点找选题
- 选题库
- 原创文案
- 二创文案
- 复刻短视频
- AI 生视频（故事板）
- AI 生视频（直接视频）
- 数字人
- 广告预审
- 发布工作流

当前特点：

- 多板块已独立分区
- 采集结果统一沉淀到品牌增长策略 → 品牌增长报告 → 素材库
- 创作侧素材选择已统一切到品牌增长策略 → 品牌增长报告 → 素材库
- 视频与数字人能力已经接入
- 复刻短视频已拆成独立板块，创建后先按每 15 秒一段输出拉片分析、角色卡、分镜脚本、角色图、分镜图和一致性质检结果
- 复刻短视频支持第二阶段一键生成分段视频，并通过 `ffmpeg` 自动拼接完整视频
- 广告预审已接入火山引擎 VOD 广告预审链路，支持品牌级默认配置
- 广告预审可直接读取作品中心内的站内视频或带 `videoUrl` 的 HTML 作品，并通过 VOD `UploadMediaByUrl` 回填 `Vid / FileId`
- 发布与视频号桥接能力位于同一工作台体系

### 4.4 公众号工作台 `/wechat`

包含：

- 账号配置
- 原创创作工作流（Step 2 文章 / Step 3 生图 / Step 4 HTML / Step 5 发布确认与正式发布）
- HTML 排版生成（4 种排版风格：通用排版 / 极简排版 / 空间艺术排版 / 通知类排版）
- 一键发布
- OpenClaw / WorkBuddy 可通过 `manage_wechat_workflow` 直接写入或推进同一条工作流
- 当前底层已经按 3 层 service 收口：
  - `WechatWorkflowCanonicalService`
  - `WechatWorkflowHtmlRendererService`
  - `WechatWorkflowPublishService`

### 4.5 设计工作台 `/more-features/design`

包含：

- 图片设计
- HTML 设计
- PPT 设计
- 视频方案设计

当前已经接入真实品牌档案、营销日历和 Provider 配置。

### 4.6 个人中心 `/personal-center`

子页面包括：

- `/personal-center`
  - 概览
- `/personal-center/tasks`
  - 任务中心
- `/personal-center/orders`
  - 订单中心
- `/personal-center/works`
  - 作品中心
- `/personal-center/skills`
  - 技能中心
- `/personal-center/third-party-platforms`
  - 第三方接口配置
- `/personal-center/openclaw`
  - OpenClaw 安装中心
- `/personal-center/version`
  - 版本与升级
- `/personal-center/security`
  - 安全设置；`local-single-user` 安装态还会在这里展示注册准入规则和本地资料目录设置
- `/personal-center/team`
  - 团队协作
- `/personal-center/invites`
  - 邀请通知

当前补充说明：

- 个人中心已新增独立“版本与升级”页，不再要求用户每次手工下载后再判断如何覆盖安装
- “版本与升级”入口默认只在 `local-single-user` 安装态个人中心显示；网站版和源码运行态不显示该入口，也不建议直接暴露升级页
- 后端通过 `system/update/*` 统一检查 OSS `latest.json`、识别 `AiOmniOps-local-single-user-win-x64.zip` 与 `.sha256`
- 当前源码运行态允许查看最新发布信息，但会明确提示“不是安装态发布包，暂不支持一键升级”
- 当前安装态会把升级包先落到 `LOCAL_APP_DATA_ROOT/updates`，完成 SHA256 校验后再由独立 updater 停机、替换安装目录并重启本地工作台
- `local-single-user` 安装态下，前台注册入口不再要求邀请码；网站版和源码运行态继续沿用邀请码注册
- `/personal-center/security` 现在会显示当前资料目录、下次启动将使用的资料目录、`launcher-settings.json` 路径，以及数据库 / 存储 / 日志等本地子目录；保存后需重启本地工作台生效
- 参考变更：`docs/changes/2026-07-28-personal-center-version-update.md`
- 参考变更：`docs/changes/2026-08-02-local-single-user-open-register-and-local-data-root.md`

### 4.7 后台管理台 `/admin`

当前后台已包含的主栏目：

- 用户管理
- 接口供应商
- 计费规则
- 技能中心
- 模块注册中心
- 能力包总览
- 能力包与模块绑定
- 能力包与知识库绑定
- 能力包与技能绑定
- 知识库管理
- 模型用量

## 5. 前端服务层

主要 service 文件：

- `services/auth.ts`
- `services/auth-session.ts`
- `services/brand-growth.ts`
- `services/collectors.ts`
- `services/daily-hotspots.ts`
- `services/reports.ts`
- `services/works.ts`
- `services/publishing.ts`
- `services/design.ts`
- `services/personal-center.ts`
- `services/openclaw.ts`
- `services/admin.ts`

规则：

- service 只做请求层
- 页面或工作区壳层负责业务编排
- 当前品牌、权限和 Provider 选择必须由后端结果校正

## 6. 后端模块地图

### 6.1 核心业务模块

- `auth`
- `brands`
- `collectors`
- `reports`
- `works`
- `tasks`
- `publishing`
- `media`
- `orders`
- `local-runtime`
  - `local-single-user` 安装态资料目录设置、注册准入信息与 launcher 配置读写入口
- `system-update`
  - OSS `latest.json` 检查、本地升级包下载校验、独立 updater 启动入口
- `third-party-platforms`
- `user-skills`
- `openclaw`
  - 安装中心、MCP 目录、龙虾日记
- `feedback`
- `scheduler`

### 6.2 后台治理模块

- `admin/api-providers`
- `admin/billing-rules`
- `admin/knowledge-bases`
- `admin/model-usage`
- `admin/module-definitions`
- `admin/skill-packages`
- `admin/skill-package-modules`
- `admin/skill-package-knowledge-spaces`
- `admin/skill-package-skills`
- `admin/skills-prompts`
- `admin/users-admin`

## 7. 当前主链路

### 7.1 品牌增长主链路

1. 登录并进入品牌工作区
2. 维护品牌资料与企业知识库
3. 收集小红书 / 抖音 / 热点数据
4. 生成品牌增长报告 / 半年营销规划 / 营销日历
5. 将结果继续送往小红书、抖音、公众号、设计工作台
6. 在个人中心查看任务、订单、作品

### 7.2 OpenClaw 链路

1. 在个人中心 OpenClaw 页面生成正式安装令牌
2. 使用 MCP 地址与 Skill ZIP 完成客户端接入
3. 通过受控 API / MCP 读取当前品牌上下文与能力
4. 在用户权限范围内触发查询、生成和执行动作

## 8. 当前关键技术边界

- 官网首页与登录页已分离
- 前后台技能、Provider、知识绑定逐步收口到治理后台
- 长耗时生成任务统一走任务中心
- 正式资源以 OSS 为真源，本地仅允许受控回退
- `docs/project_planning/` 不代表当前实现

## 9. 相关文档

- `docs/site-map-mermaid.md`
- `docs/engineering-standards.md`
- `docs/database-archive.md`
- `docs/generated-content-storage-standards.md`
- `docs/openclaw/README.md`
- `docs/changes/2026-06-13-docs-baseline-cleanup.md`
