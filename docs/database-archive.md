# AI全域运营系统数据库存档

## 1. 文档目的

- 记录当前项目数据库的真实构建方式、表结构分层和业务映射
- 说明哪些数据已经正式落 PostgreSQL，哪些仍处于 `mock-data` / 本地文件过渡态
- 作为后续更新 `schema`、迁移、后台技能中心和业务模块时的数据库基线

## 2. 当前数据库构建方式

### 2.1 技术栈

- ORM：`Prisma`
- 主库：`PostgreSQL`
- 连接入口：`prisma/schema.prisma`
- 运行时客户端：`apps/server/src/prisma/prisma.service.ts`
- 环境变量：`.env` / `.env.example` 中的 `DATABASE_URL`

### 2.2 初始化路径

- 首次建库推荐走根脚本：`npm run db:init`
- 该脚本会依次执行：
  - `npm run prisma:generate`
  - `npm run prisma:db:push`
  - `npm run prisma:seed`
- 已存在的结构化迁移位于：`prisma/migrations/`

### 2.3 运行时可用性判断

- 后端统一通过 `PrismaService.canUseDatabase()` 判断当前是否可连数据库
- 若数据库不可用，部分板块仍会临时回退到 `apps/server/src/common/mock-data.ts`
- 因此当前系统是“PostgreSQL 主库优先，少量 mock 兜底”的过渡结构，不是纯数据库单轨

### 2.4 技能/提示词注册表

- 当前新增两张注册表：
  - `SkillConfig`
  - `PromptTemplate`
- 持久化真源已补入：
  - `prisma/schema.prisma`
  - `prisma/migrations/20260508_skill_prompt_registry/migration.sql`
- 后端服务入口：
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 当前策略：
  - 数据库可用时，后台技能中心优先从注册表读写
  - 首次命中时会把 `mock-data` 与真实 `SKILL.md` 内容回填进库
  - 数据库不可用时，仍回退到 `mock-data + 文件`

## 3. 正式数据表分层

### 3.1 用户与交易域

- `User`
  - 用途：账号、会员等级、点数余额、飞书绑定主实体
  - 关键字段：`mobile`、`email`、`nickname`、`status`、`membership`、`systemRole`、`pointsBalance`、`lastLoginAt`
- `UserSession`
  - 用途：登录态会话、refresh token、当前品牌工作区绑定
  - 关键字段：`userId`、`refreshTokenHash`、`currentBrandId`、`expiresAt`、`revokedAt`
- `MembershipOrder`
  - 用途：会员购买、点数充值订单
  - 关键字段：`orderNo`、`orderType`、`orderStatus`、`membership`、`pointsAmount`、`amountYuan`
- `PointLedger`
  - 用途：点数增减流水
  - 关键字段：`changeType`、`pointsDelta`、`balanceAfter`、`relatedTaskId`

### 3.2 品牌资料域

- `Brand`
  - 用途：品牌主档
  - 关键字段：`ownerUserId`、`brandName`、`industry`、`storeCount`、`foundedYear`、`brandDescription`
- `BrandMember`
  - 用途：品牌主账号与子用户协作关系
  - 关键字段：`brandId`、`userId`、`role`、`status`、`joinedAt`、`invitedByUserId`
- `BrandInvite`
  - 用途：品牌成员邀请、邀请码、邀请链接与接受状态闭环
  - 关键字段：`brandId`、`inviteAccount`、`inviteCode`、`inviteeUserId`、`role`、`status`、`invitedByUserId`、`expiresAt`、`acceptedAt`
- `BrandInviteReadState`
  - 用途：邀请通知中心未读/已读状态的用户级持久化，支撑跨设备同步
  - 关键字段：`inviteId`、`userId`、`readAt`
- `BrandInviteNotification`
  - 用途：邀请站内消息表第一版，给邀请通知中心提供独立消息记录
  - 关键字段：`inviteId`、`userId`、`brandId`、`title`、`summary`、`actionUrl`、`readAt`
- `BrandRoleAuditLog`
  - 用途：品牌成员邀请、角色修改、状态修改、主账号转移等成员域审计
  - 关键字段：`brandId`、`operatorUserId`、`targetUserId`、`targetInviteId`、`action`、`summary`、`detailJson`
- `Product`
  - 用途：品牌产品资料库
  - 关键字段：`brandId`、`productName`、`productType`、`price`、`productPositioning`、`targetAudience`、`usageScenario`、`differentiators`
- `BrandSurvey`
  - 用途：品牌运营情况、问卷类建档结果
  - 关键字段：`brandId`、`surveyType`、`surveyJson`、`summary`

### 3.3 外部账号与经营资产域

- `PlatformAccount`
  - 用途：品牌官方平台账号
  - 关键字段：`brandId`、`platform`、`accountName`、`accountLink`、`username`、`isPrimary`
- `CompetitorAccount`
  - 用途：竞品平台账号
  - 关键字段：`brandId`、`platform`、`accountName`、`accountLink`、`username`
- `IndustryReport`
  - 用途：行业报告外链或附件索引
  - 关键字段：`brandId`、`title`、`summary`、`fileUrl`、`sourceName`
- `BusinessAsset`
  - 用途：品牌经营资产、收集结果、生成报告索引
  - 关键字段：`brandId`、`category`、`title`、`description`、`fileUrl`、`metadataJson`

### 3.4 任务与生成结果域

- `Task`
  - 用途：所有生成、同步、发布类任务主记录
  - 关键字段：`taskType`、`taskStatus`、`taskTitle`、`promptName`、`modelName`、`inputJson`、`outputJson`、`errorMessage`、`pointsCost`
- `MediaAsset`
  - 用途：图片、视频、HTML、文档等结果媒体
  - 关键字段：`mediaType`、`title`、`sourceUrl`、`storageKey`、`mimeType`、`durationSec`、`metadataJson`

### 3.5 飞书集成域

- `UserFeishuIntegration`
  - 用途：用户自有飞书开放平台应用配置与 OAuth 授权结果
  - 关键字段：`userId`、`appId`、`appSecret`、`redirectUri`、`scope`、`providerUserOpenId`、`accessToken`、`refreshToken`

### 3.6 技能与提示词注册域

- `SkillConfig`
  - 用途：后台技能中心中的技能元信息
  - 关键字段：`name`、`slug`、`category`、`status`、`provider`、`defaultModel`、`pointsCost`、`description`
- `PromptTemplate`
  - 用途：后台技能中心中的提示词模板正文与参数
  - 关键字段：`name`、`scene`、`version`、`status`、`modelName`、`temperature`、`maxTokens`、`content`

## 4. 业务板块与数据表映射

### 4.1 品牌增长策略 `/brand-growth`

- 品牌资料库
  - 主表：`Brand`、`Product`、`BrandSurvey`、`IndustryReport`、`BusinessAsset`
- 收集数据
  - 主表：`PlatformAccount`、`CompetitorAccount`、`BusinessAsset`
  - 飞书绑定：`UserFeishuIntegration`
- 品牌增长报告 / 可视化报告 / 全年营销规划
  - 任务：`Task`
  - 媒体结果：`MediaAsset`
  - 结果索引：`BusinessAsset`

### 4.2 小红书 `/xiaohongshu`

- 营销策划方案
  - 上游读取：`Brand`、`Product`、`PlatformAccount`、`CompetitorAccount`、`BusinessAsset`
  - 生成结果：`Task`、`MediaAsset`、`BusinessAsset`
- 营销日历
  - 上游读取：品牌资料域 + 报告/策划结果 + 热点/素材结果
  - 生成结果：`Task`、`BusinessAsset`
- 原创笔记 / 二创笔记 / 视频笔记
  - 任务：`Task`
  - 成品 HTML / 图片 / 视频：`MediaAsset`
  - 作品工作区主记录：当前主要通过 `MediaAsset.metadataJson` 承载结构化作品元数据

### 4.3 个人中心 `/personal-center`

- 用户资料：`User`
- 登录态：`UserSession`
- 点数流水：`PointLedger`
- 会员订单 / 充值明细：`MembershipOrder`
- 任务记录：`Task`
- 我的作品：`MediaAsset`
- 邀请通知已读状态：`BrandInviteReadState`
- 邀请站内消息：`BrandInviteNotification`

### 4.4 后台管理 `/admin`

- 订单管理：`MembershipOrder`
- 会员/积分规则：当前仍主要来自 `mock-data`
- 用户管理：`User`、`UserSession`
- 品牌成员与权限：`Brand`、`BrandMember`
- API Provider 管理：当前仍主要来自 `mock-data`
- 技能中心
  - 正式注册表：`SkillConfig`、`PromptTemplate`
  - 文件镜像：真实 `SKILL.md` / `.txt`
- 知识库管理：当前仍主要来自 `mock-data`

## 5. 当前仍未完全入库的部分

- `apps/server/src/common/mock-data.ts`
  - 仍承载部分演示数据和兜底数据
  - 当前典型包括：`apiProviders`、`billingRules`、部分知识库配置
- `提示词/` 与 `.trae/skills/`
  - 仍作为提示词文件真源和回填来源之一
- `.runtime/generated-works/`
  - 仍保存生成资源的本站副本文件
  - 数据库中保存的是索引、元数据和可访问路径，不直接存二进制文件本体

## 6. 当前关键参数约定

### 6.1 任务记录通用参数

- `taskType`：业务任务类型，如品牌增长报告、小红书营销日历、原创笔记、视频笔记
- `taskStatus`：`PENDING / QUEUED / RUNNING / SUCCESS / FAILED / CANCELLED`
- `modelName`：本次任务最终采用的文本模型或视频模型标识
- `inputJson`：输入快照
- `outputJson`：输出快照
- `pointsCost`：本次任务扣点成本

### 6.2 媒体记录通用参数

- `mediaType`：`IMAGE / VIDEO / DOCUMENT / HTML / ARCHIVE`
- `sourceUrl`：访问地址
- `storageKey`：本站存储定位键
- `mimeType`：文件类型
- `durationSec`：视频时长
- `metadataJson`：作品或报告的结构化扩展字段

### 6.3 技能注册表参数

- `SkillConfig.provider`：后台配置的模型供应商名，需与后台 provider 配置保持一致
- `SkillConfig.defaultModel`：技能默认模型
- `PromptTemplate.scene`：提示词场景标识
- `PromptTemplate.content`：提示词正文
- `PromptTemplate.temperature` / `maxTokens`：运行时生成参数

## 7. 后续维护规则

- 只要 `prisma/schema.prisma` 有新增、删除或字段变更，必须同步更新本文件
- 只要某个业务板块从 `mock-data` 切到正式数据库，必须同步更新“业务板块与数据表映射”
- 只要后台技能中心新增数据库字段或改写读写链路，必须同步更新本文件与 `docs/site-map.md`

## 8. 下一阶段规划中的目标模型

> 本节是“规划目标”，不是当前已落地结构。后续真正进入开发并完成迁移后，再把对应内容合并进前文正式分层。

### 8.1 多用户与品牌协作域

- 当前已落地：
  - `BrandInvite`
  - `BrandInviteReadState`
  - `BrandInviteNotification`
  - `BrandRoleAuditLog`
- 已落地作用：
  - 支持一个品牌生成邀请码与邀请链接并完成接受闭环
  - 支持品牌成员邀请、角色调整和主账号转移的成员域审计
  - 支持同一品牌下多用户共享品牌数据空间并保留操作留痕

### 8.2 用户技能覆盖域

- 目标新增表：
  - `UserSkillProfile`
  - `UserPromptOverride`
  - `UserSkillResetLog`
- 目标作用：
  - 平台统一维护基线技能
  - 用户基于平台技能创建自己的覆盖层
  - 用户不可删除平台技能，但可保存和重置自己的版本

### 8.3 会员与积分正式规则域

- 目标新增表：
  - `MembershipPlan`
  - `UserMembership`
  - `PointsPlan`
  - `PointsAccount`
- 目标作用：
  - 替换当前 `mock-data` 中的会员/积分规则
  - 支持普通用户、会员用户、企业会员等账号等级
  - 支持品牌公共点数池和操作用户留痕

### 8.4 会话与审计域

- 目标新增表：
  - `AdminOperationLog`
- 目标作用：
  - 在已落地 `UserSession` 基础上继续补足管理员审计
  - 记录后台管理员对用户、品牌、会员、积分、角色的操作审计
