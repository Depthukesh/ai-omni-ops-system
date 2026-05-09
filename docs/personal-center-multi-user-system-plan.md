# 个人中心、多用户、品牌协作、技能定制、会员积分与用户管理完整方案

## 1. 文档目的

- 基于当前 AI 全域运营系统的真实代码状态，输出个人中心升级为多用户系统的完整方案
- 覆盖前端个人中心、前后端任务管理、用户技能定制、品牌主账号与子用户协作、会员与积分规则、后台用户管理
- 作为后续 `schema` 设计、接口实现、页面改造和排期推进的统一基线

## 2. 本次新增需求

### 2.1 任务管理

- 前端要有任务管理模块
- 用户要能看到自己所有任务
- 所有大模型生成都算任务
- 后端要能按不同用户查看任务并进行管理

### 2.2 用户单独管理技能

- 后端统一管理平台全部技能
- 前端用户可以基于平台技能进行调整、修改、保存
- 用户不能删除平台技能
- 用户可以重置为后台原始技能
- 每个用户要有独立的技能存储空间

### 2.3 品牌主账号与子用户协作

- 每名用户代表一个品牌
- 每个品牌下面可以添加多个子用户
- 子用户需要可配置权限
- 同一品牌下不同用户生成的内容要落到同一个品牌数据空间
- 前后端都要有针对品牌协作和权限差异的不同呈现形式

### 2.4 后端用户管理

- 后台用户管理需要支持管理员权限设置
- 需要支持普通用户、会员用户等身份/等级管理

## 3. 当前系统基线

### 3.1 已有能力

- 已有前端个人中心页面，包含个人信息、点数流水、会员订单、充值明细、任务记录、我的作品
- 已有后端 `User`、`MembershipOrder`、`PointLedger`、`Task`、`MediaAsset` 等核心表
- 已有后端订单支付后更新会员等级与点数余额的联动逻辑
- 已有后台用户管理基础能力，可查看用户并手动调整会员和积分
- 已有后台技能中心，技能和提示词已支持数据库优先读取

### 3.2 当前关键缺口

- 认证仍偏演示态，很多接口仍未严格按“当前登录用户”隔离
- 个人中心当前更像“展示型聚合页”，还不是完整用户资产中心
- 任务虽然已存在，但缺少清晰的“个人任务中心”和“后台任务管理中心”
- 技能当前是平台级注册表，缺少用户级覆盖层
- 品牌下多成员协作模型尚未建立
- 权限模型尚未正式落库
- 会员/积分规则仍主要停留在 mock 层，后台尚不具备正式运营能力

## 4. 总体设计原则

- 先统一“多用户和当前用户上下文”，再继续扩业务功能
- 先统一“品牌数据空间”，再做成员协作和权限隔离
- 先统一“平台技能基线 + 用户覆盖层”，不要做每个用户一套物理分库
- 会员等级、系统管理员权限、品牌协作权限必须拆开建模，不能混成一个字段
- 所有生成都统一记为任务，所有任务都必须有归属用户、归属品牌、来源模块和消耗记录

## 5. 目标架构

### 5.1 三层身份模型

- `systemRole`
  - 面向平台后台权限
  - 例如：`SUPER_ADMIN`、`ADMIN_OPERATOR`、`FINANCE_OPERATOR`、`SUPPORT_OPERATOR`
- `accountTier`
  - 面向用户会员等级和产品权益
  - 例如：`NORMAL_USER`、`MEMBER_BASIC`、`MEMBER_PRO`、`ENTERPRISE_MEMBER`
- `brandRole`
  - 面向品牌工作区协作权限
  - 例如：`BRAND_OWNER`、`BRAND_ADMIN`、`BRAND_EDITOR`、`BRAND_OPERATOR`、`BRAND_VIEWER`

### 5.2 两级数据空间

- `平台级数据空间`
  - 后台全局技能
  - 平台会员/积分规则
  - 平台用户管理
  - 全局任务监管
- `品牌级数据空间`
  - 品牌资料
  - 品牌收集数据
  - 品牌报告
  - 小红书作品
  - 品牌任务
  - 品牌成员

### 5.3 技能模型

- `平台基线技能`
  - 由后台统一维护
  - 用户不可删除
- `用户技能覆盖层`
  - 用户基于平台技能修改后保存
  - 只影响当前用户，不影响平台原技能
- `重置机制`
  - 删除用户覆盖层
  - 回到平台技能原始版本

## 6. 任务管理完整方案

### 6.1 定义

- 所有大模型生成都统一记为任务
- 包括但不限于：
  - 品牌增长报告
  - 可视化报告
  - 全年营销规划
  - 小红书营销策划方案
  - 营销日历
  - 原创笔记
  - 二创笔记
  - 视频笔记
  - 后续抖音、公众号、海报、脚本等生成

### 6.2 前端任务中心

- 入口：`/personal-center/tasks`
- 默认展示当前用户自己的任务
- 核心筛选：
  - 任务状态
  - 任务类型
  - 品牌
  - 时间范围
  - 是否失败
- 核心字段：
  - 任务标题
  - 任务类型
  - 所属品牌
  - 发起人
  - 创建时间
  - 状态
  - 消耗点数
  - 使用模型
  - 结果跳转
- 行为：
  - 查看详情
  - 跳转作品
  - 重试
  - 复制失败原因
  - 筛选“只看我的”或“看品牌内任务”
- 权限建议：
  - `BRAND_OWNER`、`BRAND_ADMIN` 可查看品牌全部任务
  - `BRAND_EDITOR`、`BRAND_OPERATOR` 默认看自己任务，可按授权查看品牌内任务
  - `BRAND_VIEWER` 只读且不能重试

### 6.3 后台任务管理中心

- 入口：`/admin/tasks`
- 视图：
  - 全平台任务总览
  - 按品牌筛选
  - 按用户筛选
  - 按任务类型筛选
  - 按失败原因聚合
- 行为：
  - 查看任务详情
  - 查看原始输入输出
  - 标记无效任务
  - 风控冻结异常账号
  - 手工重试
  - 导出任务报表

### 6.4 任务表改造建议

- 在现有 `Task` 基础上补充：
  - `brandId`
  - `createdByUserId`
  - `operatorUserId`
  - `taskCategory`
  - `taskSource`
  - `resultAssetId`
  - `visibilityScope`
  - `retryParentTaskId`

## 7. 用户技能管理完整方案

### 7.1 设计原则

- 不建议为每个用户创建物理独立数据库
- 推荐做“逻辑独立技能库”
- 即在同一 PostgreSQL 中，以用户维度建立覆盖表和版本表
- 原因：
  - 便于统一升级平台技能
  - 便于做重置
  - 便于后续做品牌共享技能和团队协作
  - 便于审计和回滚

### 7.2 数据分层

- 平台技能层
  - `SkillConfig`
  - `PromptTemplate`
- 用户覆盖层
  - `UserSkillProfile`
  - `UserPromptOverride`
  - `UserSkillResetLog`

### 7.3 推荐表设计

- `UserSkillProfile`
  - `id`
  - `userId`
  - `brandId`
  - `baseSkillId`
  - `displayName`
  - `status`
  - `lastResetAt`
  - `updatedAt`
- `UserPromptOverride`
  - `id`
  - `userId`
  - `brandId`
  - `basePromptId`
  - `content`
  - `temperature`
  - `maxTokens`
  - `version`
  - `updatedAt`
- `UserSkillResetLog`
  - `id`
  - `userId`
  - `brandId`
  - `baseSkillId`
  - `resetType`
  - `beforeVersion`
  - `afterVersion`
  - `createdAt`

### 7.4 前端呈现

- 入口：`/personal-center/skills`
- 页面结构：
  - 左侧：技能分类树
  - 中间：当前技能详情和用户可编辑内容
  - 右侧：平台原始版本对照、差异提示、重置入口
- 用户行为：
  - 基于平台技能复制出自己的覆盖版本
  - 修改提示词、模型参数、默认开关
  - 保存
  - 预览差异
  - 重置到平台版本
- 禁止行为：
  - 删除平台技能
  - 修改平台技能原始记录

### 7.5 后台呈现

- 入口：`/admin/skills`
- 后台功能：
  - 管理平台基线技能
  - 查看某个技能被多少品牌、多少用户覆盖
  - 比较平台版本与用户版本差异
  - 强制发布平台新版本
  - 标记技能废弃

## 8. 品牌主账号、子用户与权限完整方案

### 8.1 核心模型

- 每个品牌有一个主账号 `BRAND_OWNER`
- 品牌下可以邀请多个子用户加入同一品牌工作区
- 品牌下所有内容都落到同一品牌数据空间
- 但每条数据仍保留“创建人”和“最后操作人”

### 8.2 数据模型建议

- 现有 `Brand` 继续作为品牌主档
- 新增：
  - `BrandMember`
  - `BrandInvite`
  - `BrandRoleAuditLog`

### 8.3 推荐表设计

- `BrandMember`
  - `id`
  - `brandId`
  - `userId`
  - `role`
  - `status`
  - `joinedAt`
  - `invitedByUserId`
- `BrandInvite`
  - `id`
  - `brandId`
  - `invitedEmailOrMobile`
  - `role`
  - `inviteStatus`
  - `expireAt`
  - `invitedByUserId`
- `BrandRoleAuditLog`
  - `id`
  - `brandId`
  - `targetUserId`
  - `operatorUserId`
  - `beforeRole`
  - `afterRole`
  - `createdAt`

### 8.4 品牌角色方案

- `BRAND_OWNER`
  - 品牌主账号
  - 拥有品牌全部权限
  - 可管理成员、权限、技能、数据和结算
- `BRAND_ADMIN`
  - 协作管理员
  - 可管理成员、任务、作品和品牌内部技能
  - 不可变更品牌所有权
- `BRAND_EDITOR`
  - 内容编辑
  - 可创建、编辑、删除内容和任务
  - 不可管理成员和结算
- `BRAND_OPERATOR`
  - 运营执行
  - 可发起生成、查看结果、查看品牌任务
  - 不可删核心数据
- `BRAND_VIEWER`
  - 只读
  - 只能查看品牌数据和结果

### 8.5 前端呈现

- 品牌主账号前端：
  - 可见品牌成员管理
  - 可邀请成员
  - 可设置角色
  - 可查看品牌全部任务和作品
- 子用户前端：
  - 首页显示“当前所属品牌”
  - 页面只展示有权限的菜单和按钮
  - 无权限按钮直接隐藏，不做灰置误导

### 8.6 后端呈现

- 后台用户详情页增加：
  - 所属品牌
  - 品牌角色
  - 可访问品牌数
  - 品牌内任务数
  - 品牌内作品数
- 后台品牌详情页增加：
  - 品牌主账号
  - 成员列表
  - 角色分布
  - 品牌任务统计
  - 品牌作品统计

## 9. 后台用户管理完整方案

### 9.1 后台管理维度

- 用户基础身份
- 平台管理员权限
- 会员等级
- 品牌归属与品牌角色
- 点数与订单
- 登录与操作日志

### 9.2 推荐后台字段

- `systemRole`
  - `SUPER_ADMIN`
  - `ADMIN_OPERATOR`
  - `FINANCE_OPERATOR`
  - `SUPPORT_OPERATOR`
- `accountTier`
  - `NORMAL_USER`
  - `MEMBER_BASIC`
  - `MEMBER_PRO`
  - `ENTERPRISE_MEMBER`
- `userStatus`
  - `ACTIVE`
  - `DISABLED`
  - `PENDING`
  - `RISK_LOCKED`

### 9.3 后台管理能力

- 用户列表
- 用户详情
- 修改平台管理员角色
- 修改会员等级
- 调整点数
- 禁用/解禁
- 查看所属品牌与品牌角色
- 查看最近订单、最近任务、最近作品
- 查看登录日志和管理员操作日志

## 10. 会员与积分规则升级方案

### 10.1 会员规则

- 新增 `MembershipPlan`
- 新增 `UserMembership`
- 支持：
  - 普通用户
  - 会员用户
  - 企业会员
- 会员权益建议包含：
  - 月度可用点数
  - 任务并发数
  - 可用技能范围
  - 可创建品牌数
  - 可邀请子用户数

### 10.2 积分规则

- 新增 `PointsPlan`
- 新增 `PointsAccount`
- `PointLedger` 保留并强化
- 点数规则建议支持：
  - 充值发点
  - 会员赠点
  - 任务消耗
  - 失败返还
  - 管理员调整
  - 过期清理

### 10.3 为什么必须和品牌协作一起设计

- 同一品牌下多个子用户都会消耗品牌资源
- 所以后续必须定义点数归属策略
- MVP 建议采用：
  - 品牌公共点数池
  - 同时记录个人发起人
- 即：
  - 消耗从品牌账户扣
  - 流水记录写明操作用户

## 11. 前端改造路径

### 11.1 个人中心

- 从当前单页 Tab 逐步升级为二级路由：
  - `/personal-center/profile`
  - `/personal-center/membership`
  - `/personal-center/points`
  - `/personal-center/orders`
  - `/personal-center/tasks`
  - `/personal-center/works`
  - `/personal-center/skills`
  - `/personal-center/team`
  - `/personal-center/security`

### 11.2 任务中心

- 增加任务列表、筛选器、失败原因、重试、结果跳转

### 11.3 技能中心

- 增加用户技能覆盖、保存、重置、差异对比

### 11.4 团队与权限

- 品牌主账号显示“成员管理”
- 子用户只显示有权限操作的菜单

## 12. 后端模块改造路径

### 12.1 新增或重构模块

- `AuthModule`
  - 引入 JWT、Refresh Token、CurrentUser、AuthGuard
- `PersonalCenterModule`
  - 聚合 profile、membership、points、orders、tasks、works、skills、team
- `TasksModule`
  - 强化品牌维度与用户维度查询
- `SkillsModule`
  - 平台技能 + 用户覆盖层
- `BrandMembersModule`
  - 品牌成员、邀请、角色控制
- `MembershipModule`
  - 会员套餐、会员实例、权益判断
- `PointsModule`
  - 积分账户、积分规则、流水、返还
- `AdminUsersModule`
  - 平台用户管理、平台角色、日志

### 12.2 必改接口

- 所有与个人中心有关的接口都必须按当前登录用户和当前品牌过滤
- 所有任务、作品、订单都必须同时记录 `brandId` 和 `createdByUserId`
- 所有后台用户管理接口都必须增加管理员权限校验

## 13. 数据库执行建议

### 13.1 建议新增的正式表

- `UserSession`
- `MembershipPlan`
- `UserMembership`
- `PointsPlan`
- `PointsAccount`
- `BrandMember`
- `BrandInvite`
- `BrandRoleAuditLog`
- `UserSkillProfile`
- `UserPromptOverride`
- `UserSkillResetLog`
- `AdminOperationLog`

### 13.2 建议扩展的现有表

- `Task`
  - 增加 `brandId`、`createdByUserId`、`operatorUserId`
- `MediaAsset`
  - 增加 `brandId`、`createdByUserId`、`taskId`
- `MembershipOrder`
  - 增加 `brandId`、`createdByUserId`
- `User`
  - 增加 `systemRole`、`accountTier`、`lastLoginAt`

## 14. 推荐执行路径

### 阶段 0：方案和数据设计

- 输出正式文档
- 确定权限模型
- 确定新增表与迁移顺序

### 阶段 1：真实多用户登录态

- 上 JWT
- 上 refresh token
- 上 current user
- 所有接口按用户隔离
- 先把当前“默认首个用户”的逻辑清掉

### 阶段 2：品牌成员和权限体系

- 新增 `BrandMember`
- 做品牌主账号和子用户邀请
- 前后端按品牌角色控制菜单和按钮

### 阶段 3：任务中心升级

- 统一所有生成进入任务中心
- 完成前端任务页和后台任务页
- 任务补齐品牌与用户维度

### 阶段 4：用户技能覆盖层

- 新增用户技能覆盖表
- 前端开放“保存我的技能”“重置平台技能”
- 后台可查看平台技能与用户覆盖差异

### 阶段 5：会员与积分正式落库

- 替换现有 mock 规则
- 增加套餐表、账户表、实例表
- 打通品牌公共点数池

### 阶段 6：后台用户管理升级

- 管理平台管理员角色
- 管理会员等级
- 管理品牌角色
- 加登录日志和操作审计

### 阶段 7：稳定性与迁移

- 把历史任务、作品、订单补 `brandId` / `createdByUserId`
- 清理 mock 回退
- 做权限回归测试

## 15. MVP 优先顺序建议

- `P0`
  - 真实登录态
  - 当前用户隔离
  - 品牌成员表
- `P1`
  - 前端个人任务中心
  - 后台任务管理页
- `P2`
  - 用户技能覆盖层
  - 重置能力
- `P3`
  - 品牌成员管理与角色控制
- `P4`
  - 会员/积分规则正式落库
- `P5`
  - 后台管理员与审计增强

## 16. 最终建议

- 先不要做“每个用户一套物理数据库”，这会显著放大复杂度
- 推荐用“品牌共享数据空间 + 用户操作留痕 + 用户技能逻辑独立库”模式
- 管理员权限、会员等级、品牌协作权限一定要拆成三套模型
- 当前最应该先落地的是：
  - 真实多用户登录态
  - 品牌成员模型
  - 任务中心
  - 用户技能覆盖层

## 17. 后续文档联动要求

- 方案进入开发后，任何实际表结构变更都要同步更新 `docs/database-archive.md`
- 任何模块、路由、主链路变更都要同步更新 `docs/site-map.md`
- 每个阶段至少新增一条 `docs/changes/*.md`

## 18. 数据库表结构草案

### 18.1 `User` 扩展建议

- 新增字段：
  - `systemRole`
  - `accountTier`
  - `lastLoginAt`
  - `lastActiveBrandId`
- 用途：
  - 区分平台管理员权限
  - 区分普通用户与会员等级
  - 支持登录态与默认品牌工作区

### 18.2 `BrandMember`

- 关键字段：
  - `id`
  - `brandId`
  - `userId`
  - `role`
  - `status`
  - `joinedAt`
  - `invitedByUserId`
- 唯一约束：
  - `brandId + userId`
- 作用：
  - 建立品牌主账号与子用户的正式关系

### 18.3 `BrandInvite`

- 关键字段：
  - `id`
  - `brandId`
  - `invitedEmailOrMobile`
  - `role`
  - `inviteCode`
  - `inviteStatus`
  - `expireAt`
  - `invitedByUserId`
- 作用：
  - 支持品牌邀请成员

### 18.4 `UserSession`

- 关键字段：
  - `id`
  - `userId`
  - `refreshTokenHash`
  - `deviceInfo`
  - `ipAddress`
  - `expiredAt`
  - `revokedAt`
- 作用：
  - 支撑 refresh token、登出和多端登录控制

### 18.5 `MembershipPlan`

- 关键字段：
  - `id`
  - `planName`
  - `planCode`
  - `priceYuan`
  - `durationDays`
  - `bonusPoints`
  - `maxBrandCount`
  - `maxMemberCount`
  - `maxParallelTasks`
  - `enabled`
  - `sortOrder`
- 作用：
  - 取代当前 mock 会员规则

### 18.6 `UserMembership`

- 关键字段：
  - `id`
  - `userId`
  - `planId`
  - `status`
  - `startedAt`
  - `expiredAt`
  - `sourceOrderId`
- 作用：
  - 表示用户当前或历史会员实例

### 18.7 `PointsPlan`

- 关键字段：
  - `id`
  - `planName`
  - `pointsAmount`
  - `bonusPoints`
  - `priceYuan`
  - `enabled`
  - `sortOrder`
- 作用：
  - 取代当前 mock 积分包

### 18.8 `PointsAccount`

- 关键字段：
  - `id`
  - `brandId`
  - `ownerUserId`
  - `accountType`
  - `balance`
  - `frozenBalance`
  - `expiredPoints`
- 作用：
  - MVP 建议优先支持品牌公共点数池

### 18.9 `Task` 扩展建议

- 在现有基础上新增：
  - `createdByUserId`
  - `operatorUserId`
  - `taskCategory`
  - `taskSource`
  - `resultAssetId`
  - `retryParentTaskId`
  - `visibilityScope`
- 说明：
  - `userId` 可逐步收敛为 `createdByUserId`
  - 迁移期可保留兼容字段，避免一次性破坏现有链路

### 18.10 `UserSkillProfile`

- 关键字段：
  - `id`
  - `userId`
  - `brandId`
  - `baseSkillId`
  - `displayName`
  - `status`
  - `lastResetAt`
  - `updatedAt`

### 18.11 `UserPromptOverride`

- 关键字段：
  - `id`
  - `userId`
  - `brandId`
  - `basePromptId`
  - `content`
  - `temperature`
  - `maxTokens`
  - `version`
  - `updatedAt`

### 18.12 `UserSkillResetLog`

- 关键字段：
  - `id`
  - `userId`
  - `brandId`
  - `baseSkillId`
  - `resetType`
  - `beforeVersion`
  - `afterVersion`
  - `createdAt`

### 18.13 `AdminOperationLog`

- 关键字段：
  - `id`
  - `operatorUserId`
  - `targetType`
  - `targetId`
  - `action`
  - `beforeJson`
  - `afterJson`
  - `createdAt`
- 作用：
  - 后台管理员审计

## 19. API 清单草案

### 19.1 认证与登录态

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `PATCH /api/auth/password`
- `GET /api/auth/brands`
- `POST /api/auth/switch-brand`

### 19.2 个人中心聚合

- `GET /api/personal-center/overview`
- `GET /api/personal-center/tasks`
- `GET /api/personal-center/works`
- `GET /api/personal-center/orders`
- `GET /api/personal-center/points`
- `GET /api/personal-center/membership`
- `GET /api/personal-center/skills`
- `GET /api/personal-center/team`

### 19.3 任务中心

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks/:id/retry`
- `POST /api/tasks/:id/cancel`
- `GET /api/admin/tasks`
- `GET /api/admin/tasks/:id`
- `POST /api/admin/tasks/:id/retry`

### 19.4 用户技能中心

- `GET /api/user-skills`
- `GET /api/user-skills/:skillId`
- `PATCH /api/user-skills/:skillId`
- `POST /api/user-skills/:skillId/reset`
- `GET /api/admin/skills/:skillId/overrides`

### 19.5 品牌成员与协作

- `GET /api/brands/current/members`
- `POST /api/brands/current/invites`
- `POST /api/brands/current/invites/:inviteId/resend`
- `POST /api/brands/current/invites/:inviteId/cancel`
- `PATCH /api/brands/current/members/:memberId/role`
- `PATCH /api/brands/current/members/:memberId/status`
- `DELETE /api/brands/current/members/:memberId`

### 19.6 会员与积分

- `GET /api/membership/plans`
- `GET /api/membership/current`
- `POST /api/membership/orders`
- `GET /api/points/plans`
- `GET /api/points/account`
- `GET /api/points/ledgers`
- `POST /api/points/orders`

### 19.7 后台用户管理

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/system-role`
- `PATCH /api/admin/users/:id/account-tier`
- `PATCH /api/admin/users/:id/status`
- `POST /api/admin/users/:id/points/adjust`
- `PATCH /api/admin/users/:id/membership`
- `GET /api/admin/users/:id/logs`

## 20. 前后端页面清单草案

### 20.1 前端个人中心

- `/personal-center/profile`
  - 个人资料
  - 登录信息
  - 当前所属品牌
- `/personal-center/membership`
  - 当前会员
  - 权益说明
  - 续费入口
- `/personal-center/points`
  - 积分余额
  - 流水记录
  - 充值入口
- `/personal-center/orders`
  - 会员单
  - 充值单
  - 订单详情跳转
- `/personal-center/tasks`
  - 我的任务
  - 品牌任务
  - 失败重试
- `/personal-center/works`
  - 我的作品
  - 按平台筛选
  - 按任务回跳
- `/personal-center/skills`
  - 技能分类
  - 覆盖编辑
  - 重置
- `/personal-center/team`
  - 品牌成员
  - 邀请成员
  - 角色管理
- `/personal-center/security`
  - 密码修改
  - 会话管理
  - 登出

### 20.2 后台管理

- `/admin/users`
  - 用户列表
  - 搜索与筛选
- `/admin/users/:id`
  - 用户详情
  - 品牌归属
  - 会员、积分、订单、任务、作品、日志
- `/admin/tasks`
  - 平台任务管理
  - 失败任务聚合
- `/admin/brands`
  - 品牌列表
  - 品牌详情
  - 成员和角色
- `/admin/membership`
  - 会员套餐
  - 会员实例
- `/admin/points`
  - 积分包
  - 点数账户
  - 流水审计
- `/admin/skills`
  - 平台技能
  - 用户覆盖统计
  - 差异对比

## 21. P0 开发拆解

### 21.1 P0 目标

- 从“单用户演示态”升级到“真实当前用户 + 品牌工作区”的可运行基线

### 21.2 P0 必做范围

- 登录态
  - bcrypt
  - JWT access token
  - refresh token
  - logout
- 当前用户
  - `CurrentUser`
  - `AuthGuard`
  - `CurrentBrand`
- 品牌成员
  - `BrandMember`
  - 品牌主账号自动入表
  - 子用户基础邀请能力
- 数据隔离
  - 个人中心接口按当前用户过滤
  - 任务按当前品牌和当前用户过滤
  - 作品按当前品牌和当前用户过滤

### 21.3 P0 后端任务拆分

- `AuthModule`
  - 接 JWT
  - 改登录
  - 改 `profile`
- `BrandMembersModule`
  - 建表
  - 增接口
- `TasksModule`
  - 增品牌/用户过滤
- `MediaModule`
  - 增品牌/用户过滤
- `OrdersModule`
  - 增当前用户过滤

### 21.4 P0 前端任务拆分

- 接真实登录态存储
- 顶栏显示当前用户与当前品牌
- 个人中心页改走 `me`
- 任务页先从现有个人中心中独立出来
- 无权限按钮按 `brandRole` 隐藏

### 21.5 P0 验证标准

- A 用户登录后看不到 B 用户的订单、任务、作品
- 同一品牌下的管理员可看到品牌内任务
- 子用户只能看到授权范围内的页面和按钮
- 登录、刷新 token、登出都可正常闭环

## 22. 阶段验收标准

### 22.1 P1 验收

- 用户任务中心和后台任务管理可用
- 所有大模型生成都能统一落任务

### 22.2 P2 验收

- 用户技能覆盖、保存、重置可用
- 平台技能不被用户直接篡改

### 22.3 P3 验收

- 品牌主账号可邀请和管理子用户
- 子用户权限生效

### 22.4 P4 验收

- 会员套餐和积分包正式落库
- 不再依赖 mock 规则

### 22.5 P5 验收

- 后台用户管理可管理管理员权限、会员等级和品牌角色
- 审计日志可追踪关键操作

## 23. 当前已落地的 P0 进展

### 23.1 已完成

- 后端已新增真实登录态 token 机制，支持：
  - `login`
  - `refresh`
  - `me`
  - `brands`
  - `switch-brand`
  - `logout`
- 后端已新增 `UserSession`
- 后端已新增 `BrandMember`
- 创建品牌时会自动把品牌主账号写入 `BrandMember`
- `orders`、`tasks`、`media` 已开始按当前用户过滤，不再固定读取首个用户
- 历史明文密码用户支持兼容登录，并在成功登录时自动升级为哈希密码
- 前端已新增登录态本地存储与认证服务层
- 前端请求层已支持自动附带 `Authorization`、`x-brand-id`，并在 `401` 时自动走 `refresh`
- `/login` 已从占位页改为真实账号密码登录页
- `/personal-center` 已开始消费 `/auth/me`、`/auth/brands`、`/auth/switch-brand`、`/auth/logout`
- 个人中心当前已支持未登录跳转、当前品牌切换、退出登录，以及真实用户资料/任务/订单/作品加载
- 个人中心已新增二级路由壳，前端已落地：
  - `/personal-center`
  - `/personal-center/tasks`
  - `/personal-center/team`
- `/personal-center/tasks` 已接真实任务列表、失败重试、品牌切换
- 后端已新增 `/api/brands/:id/members`，按当前登录用户校验品牌成员访问范围
- `/personal-center/team` 已接真实品牌成员列表、当前角色和是否可管理成员标识
- 后端已新增：
  - `POST /api/brands/:id/members`
  - `PATCH /api/brands/:id/members/:memberId`
- `/personal-center/team` 已支持第一版成员管理：
  - 直加已有账号到当前品牌
  - 修改成员角色
  - 修改成员状态
- 后端已新增：
  - `GET /api/brands/:id/invites`
  - `POST /api/brands/:id/invites`
  - `PATCH /api/brands/:id/invites/:inviteId/revoke`
- 后端已继续新增：
  - `GET /api/brands/me/invites`
  - `PATCH /api/brands/me/invites/:inviteId/accept`
- 后端已继续新增：
  - `PATCH /api/brands/me/invites/accept-by-code`
  - `GET /api/brands/me/invites/history`
  - `PATCH /api/brands/me/invites/read-state`
  - `GET /api/brands/me/invite-notifications`
  - `PATCH /api/brands/me/invite-notifications/read-state`
  - `GET /api/brands/:id/role-audit-logs`
  - `PATCH /api/brands/:id/transfer-owner`
- Prisma 已新增：
  - `BrandInvite`
  - `BrandInviteReadState`
  - `BrandInviteNotification`
  - `BrandRoleAuditLog`
- `/personal-center/team` 已支持：
  - 创建邀请
  - 查看待处理邀请
  - 撤回待处理邀请
  - 查看“我的待接受邀请”
  - 接受邀请后自动写入 `BrandMember`
  - 已接受邀请从待处理列表中收口
  - 通过邀请码加入品牌
  - 邀请码和邀请链接展示与复制
  - 查看品牌成员审计日志
  - 主账号转移入口
- `/personal-center/invites` 已支持：
  - 统一查看待处理、已接受、已过期和已撤回邀请
  - 直接接受待处理邀请
  - 后端持久化未读/已读，支持跨设备同步
  - 邀请站内消息表第一版，消息记录与邀请记录已拆分
  - 作为全局邀请提示条的落点页面
- 后台管理台已新增：
  - `/admin/login`
  - `/admin` 的后台角色矩阵收口
  - `SUPER_ADMIN / ADMIN_OPERATOR / FINANCE_OPERATOR / SUPPORT_OPERATOR` 四类后台角色入口

### 23.2 当前边界

- `/personal-center` 主页仍保留老的聚合页结构，尚未继续拆到 `/profile`、`/points`、`/orders`、`/works`
- `/personal-center/team` 已不再是纯骨架页，并已补齐邀请码加入、邀请链接/邀请码展示、成员审计日志和主账号转移入口；邀请通知入口已拆到 `/personal-center/invites`
- 邀请通知流已具备全局提示条 + 邀请通知中心，但仍不是完整短信/邮件/IM 消息流
- 邀请通知中心的未读/已读现已升级为后端持久化，且已补邀请站内消息表第一版；但外发通知和更通用的消息中心聚合仍未开始做
- 修改自己角色、修改主账号角色与更细的消息提醒仍未开始编码
- 后台任务管理页尚未开始编码
- 会员/积分规则仍未正式从 mock 切到数据库配置
