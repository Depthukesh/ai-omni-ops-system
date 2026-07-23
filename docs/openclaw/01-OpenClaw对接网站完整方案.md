# OpenClaw 对接网站完整方案

## 1. 方案目标

本方案的目标是让 OpenClaw 成为“品牌运营智能助手”，能够在用户授权后：

1. 使用用户身份登录当前网站系统。
2. 识别当前用户可访问的品牌列表与当前品牌上下文。
3. 通过受控工具层读取该品牌下的资料、任务、资产、技能中心配置等数据。
4. 基于系统数据结构、实体关系和业务规则，回答用户问题。
5. 在权限允许时，帮助用户触发网站已有能力，例如：
   - 查询品牌档案
   - 查询每日热点
   - 生成热点找选题
   - 查询任务状态
   - 查询或修改品牌技能中心提示词
   - 恢复平台基线

本方案不建议让 OpenClaw 直接连接 PostgreSQL 数据库，而是建议通过网站侧统一暴露的 API / Tool / MCP 层完成接入。

## 2. 当前系统基础

### 2.1 当前架构现状

- 当前网站数据库是单库 PostgreSQL，不是每品牌独立数据库。
- 系统采用“单库多品牌”模式，品牌数据通过 `brandId` 做逻辑隔离。
- 后台技能中心是平台基线，全局共享。
- 前端用户中心技能中心已改为品牌级共享覆盖。
- 现有系统已经具备：
  - 用户登录与会话
  - 品牌切换
  - 品牌成员与角色
  - 品牌资料库
  - 品牌任务系统
  - 品牌工作台
  - 技能中心
  - 报告与生成链路

### 2.2 当前适合接入 OpenClaw 的原因

- 数据结构较完整，品牌实体清晰。
- 权限边界已有基础框架。
- 业务能力已经 API 化。
- 存在大量结构化与半结构化业务数据，可供 AI 查询与总结。
- 存在异步任务型能力，可供助手代触发和追踪。

## 3. OpenClaw 在本系统中的定位

OpenClaw 在本方案里不是“数据库机器人”，而是：

- 一个以用户身份登录网站的智能客户端
- 一个知道品牌数据结构和业务关系的助手
- 一个通过受控工具层调用网站能力的智能代理
- 一个可在消息渠道中为用户提供品牌运营问答与操作辅助的入口

## 4. 总体设计原则

1. 不直连数据库
   - 所有数据读取与写入通过网站 API / Tool 层完成。
2. 用户身份隔离
   - OpenClaw 的每次请求都代表某个真实用户。
3. 品牌上下文强约束
   - 没有当前品牌上下文时，不允许查询品牌数据。
4. 权限沿用现有系统
   - 可见、可写、可恢复平台基线等能力沿用网站现有权限校验。
5. 先读后写
   - 第一阶段优先实现只读问答和低风险操作。
6. 全程可审计
   - 所有写操作、恢复操作、任务触发都要记录日志。
7. 最小影响面
   - 不改现有核心业务生成链，不推翻既有权限与数据模型。

## 5. 推荐总体架构

推荐采用四层结构：

### 5.1 第一层：用户认证与品牌上下文层

负责：

- 用户登录
- 会话获取
- 品牌列表获取
- 当前品牌切换
- 会话续期
- OpenClaw 会话和网站会话绑定

### 5.2 第二层：品牌助手工具层

负责：

- 向 OpenClaw 暴露高语义工具
- 工具内部调用现有网站 API 或新增聚合 API
- 保证所有数据都在权限范围内返回

### 5.3 第三层：OpenClaw Skill 层

负责：

- 描述当前网站的数据结构和实体关系
- 定义遇到不同问题时该调用哪些工具
- 约束输出格式、风险边界、确认机制

### 5.4 第四层：审计与安全层

负责：

- 写操作审计
- 高风险动作确认
- 访问日志
- 敏感数据脱敏
- Token 生命周期与吊销

## 6. 登录与授权方案

## 6.1 方案 A：账号密码直登

### 流程

1. 用户在 OpenClaw 中输入账号和密码。
2. OpenClaw 调用网站登录接口。
3. 网站返回 access token / refresh token / session。
4. OpenClaw 调用“我的品牌列表”接口。
5. 用户选择一个品牌作为当前上下文。
6. 后续所有品牌操作都带上当前品牌上下文。

### 优点

- 开发成本低
- 上线快
- 与现有登录方式最兼容

### 风险

- 需要在 OpenClaw 侧存储密码或长期会话
- 安全风险较高
- 后续做多设备、撤权、过期控制不够优雅

## 6.2 方案 B：OpenClaw 专用授权票据

### 流程

1. 用户在网站内点击“授权 OpenClaw”。
2. 网站生成一次性授权码或短期授权票据。
3. OpenClaw 使用该票据向网站换取正式会话。
4. 后续使用 token 访问品牌助手工具层。

### 优点

- 更安全
- 更易做吊销与失效控制
- 不必长期存储用户密码

### 推荐

- 第一阶段可以先用方案 A 快速验证。
- 进入正式投入后应升级为方案 B。

## 7. 品牌上下文机制

OpenClaw 必须明确以下规则：

1. 每个用户可能属于多个品牌。
2. 所有品牌业务数据都必须在 `brandId` 下读取。
3. 如果用户问题没有明确品牌，OpenClaw 必须先确认当前品牌。
4. OpenClaw 不允许默认跨品牌聚合数据。
5. 切换品牌是显式动作，不可隐式改变。

推荐最小接口：

- `get_my_brands`
- `get_current_brand`
- `switch_brand`

## 8. 品牌数据范围定义

以下是当前系统中最适合对 OpenClaw 暴露的数据范围。

### 8.1 品牌主体与成员

- `Brand`
- `BrandMember`
- `BrandInvite`
- `BrandRoleAuditLog`

### 8.2 品牌资料库

- `Product`
- `BrandSurvey`
- `PlatformAccount`
- `CompetitorAccount`
- `IndustryReport`

### 8.3 品牌业务资产

- `BusinessAsset`
  - 各类报告
  - 各类生成结果
  - 业务沉淀资产
  - 工作台结果索引

### 8.4 品牌任务与媒体

- `Task`
- `MediaAsset`

### 8.5 品牌技能中心

- `BrandSkillProfile`
- `BrandPromptOverride`
- `BrandSkillResetLog`
- 平台基线：
  - `SkillConfig`
  - `PromptTemplate`

## 9. 数据关系图谱

核心关系建议在 Skill 中明确写清楚：

- 一个 `Brand` 拥有多条 `Product`
- 一个 `Brand` 拥有多条 `BrandSurvey`
- 一个 `Brand` 拥有多条 `PlatformAccount`
- 一个 `Brand` 拥有多条 `CompetitorAccount`
- 一个 `Brand` 拥有多条 `IndustryReport`
- 一个 `Brand` 拥有多条 `BusinessAsset`
- 一个 `Brand` 拥有多条 `Task`
- 一个 `Task` 可关联多条 `MediaAsset`
- 一个 `Brand` 拥有一套品牌级技能中心覆盖：
  - `BrandSkillProfile`
  - `BrandPromptOverride`
- 平台基线技能与提示词是全局共享，不属于任何品牌

## 10. 推荐工具层设计

不建议暴露“通用 SQL 查询工具”，建议按业务语义拆工具。

### 10.1 品牌基础工具

- `get_my_brands`
- `get_brand_profile`
- `get_brand_members`
- `switch_brand`

### 10.2 品牌资料库工具

- `get_brand_archive`
- `list_products`
- `list_brand_surveys`
- `list_platform_accounts`
- `list_competitor_accounts`
- `list_industry_reports`

### 10.3 品牌资产工具

- `list_business_assets`
- `get_business_asset_detail`
- `list_media_assets`
- `get_media_asset_detail`

### 10.4 品牌任务工具

- `list_brand_tasks`
- `get_task_detail`
- `get_running_tasks`

### 10.5 品牌工作台工具

- `get_daily_hotspots`
- `generate_hot_topic_candidates`
- `get_douyin_marketing_plan`
- `generate_douyin_marketing_plan`
- `get_xiaohongshu_marketing_calendar`
- `generate_xiaohongshu_marketing_calendar`
- `upsert_xiaohongshu_marketing_calendar_item`

### 10.6 品牌技能中心工具

- `list_brand_skill_profiles`
- `get_brand_skill_detail`
- `update_brand_skill_prompt`
- `reset_brand_skill_to_platform_baseline`
- `get_platform_skill_baseline`

## 11. OpenClaw Skill 的职责

OpenClaw Skill 不存真实业务数据，而是定义：

1. 系统是什么
2. 有哪些实体
3. 实体之间什么关系
4. 用户问什么时该调哪个工具
5. 什么时候需要确认
6. 什么内容不能直接返回
7. 写操作如何表达影响

Skill 应至少包含：

- 系统定位
- 品牌上下文规则
- 数据字典
- 工具路由规则
- 输出风格
- 风险边界
- 权限边界

## 12. 典型问答与操作场景

### 12.1 纯问答场景

用户说：

- “我们这个品牌主要卖什么？”
- “现在品牌档案里有哪些产品？”
- “最近抖音热点里哪些和我们最相关？”
- “品牌技能中心里热点找选题用的是什么提示词？”

OpenClaw 行为：

1. 确认当前品牌
2. 调用对应只读工具
3. 组织答案
4. 如有必要附带来源摘要

### 12.2 读后执行场景

用户说：

- “帮我基于今天热点生成 3 个抖音选题”
- “帮我看下最近任务有没有失败的”
- “帮我把这个品牌的热点找选题提示词恢复平台基线”

OpenClaw 行为：

1. 先读取当前品牌状态
2. 复述即将执行的操作和影响
3. 权限校验
4. 调用写操作或任务触发工具
5. 返回结果和后续状态

## 13. 安全与权限设计

### 13.1 必须遵守的安全规则

1. 不直接给 OpenClaw 数据库账号。
2. 不允许 OpenClaw 绕过网站权限体系。
3. 不允许无品牌上下文读取品牌业务数据。
4. 不允许默认跨品牌汇总。
5. 不允许高风险写操作静默执行。
6. 不允许返回明文密钥、密码、第三方平台敏感凭据。

### 13.2 写操作确认规则

以下操作建议必须先确认：

- 修改品牌技能中心提示词
- 恢复平台基线
- 触发大模型生成任务
- 写入品牌资产
- 导出批量品牌资料

### 13.3 审计要求

建议新增或复用日志记录：

- 操作用户
- 品牌 ID
- 工具名
- 请求时间
- 请求参数摘要
- 执行动作
- 成功失败状态
- 回滚标识

## 14. 建议的接入形态

推荐三种形态，按优先顺序排序：

### 14.1 形态一：网站 API + OpenClaw Skill

适合第一阶段。

- OpenClaw 直接调用现有网站 API 和少量新增聚合 API
- Skill 负责描述规则
- 开发成本最低

### 14.2 形态二：网站 MCP Server + OpenClaw Skill

适合第二阶段。

- 把品牌助手能力抽象成 MCP 工具
- Tool Schema 更清晰
- 更适合复杂多步调用

### 14.3 形态三：网站专属 OpenClaw Extension / Connector

适合后期产品化。

- 更强的 UI 集成
- 更强的渠道联动
- 更适合对外产品化

## 15. 推荐实施分阶段

### 阶段 1：只读品牌问答

目标：

- 能登录
- 能切品牌
- 能查询品牌资料、资产、任务、技能中心配置
- 能基于品牌数据回答问题

### 阶段 2：低风险写操作

目标：

- 可触发热点找选题
- 可查询任务状态
- 可查询并恢复品牌技能中心平台基线

### 阶段 3：深度业务助手

目标：

- 支持更多工作台功能触发
- 支持复杂多轮问答
- 支持渠道内直接操作和结果回传

## 16. 推荐接口清单

建议补一组专供 OpenClaw / AI 助手使用的聚合接口。

### 16.1 会话与品牌上下文

- `POST /api/assistant/auth/login`
- `POST /api/assistant/auth/exchange`
- `GET /api/assistant/brands`
- `POST /api/assistant/brands/switch`

### 16.2 品牌档案

- `GET /api/assistant/brands/:brandId/archive`
- `GET /api/assistant/brands/:brandId/summary`

### 16.3 品牌资产

- `GET /api/assistant/brands/:brandId/business-assets`
- `GET /api/assistant/brands/:brandId/business-assets/:assetId`
- `GET /api/assistant/brands/:brandId/media-assets`

### 16.4 品牌任务

- `GET /api/assistant/brands/:brandId/tasks`
- `GET /api/assistant/brands/:brandId/tasks/:taskId`

### 16.5 品牌技能中心

- `GET /api/assistant/brands/:brandId/skills`
- `GET /api/assistant/brands/:brandId/skills/:skillId`
- `PATCH /api/assistant/brands/:brandId/skills/:skillId`
- `POST /api/assistant/brands/:brandId/skills/:skillId/reset`

### 16.6 品牌工作台

- `GET /api/assistant/brands/:brandId/daily-hotspots`
- `POST /api/assistant/brands/:brandId/douyin/hot-topic-candidates/generate`
- `GET /api/assistant/brands/:brandId/douyin/hot-topic-candidates`

## 17. 与当前网站系统的映射关系

### 17.1 现有可直接复用的能力

- 用户认证与会话
- 品牌成员和角色
- 品牌档案数据
- 报表/任务生成链路
- 品牌技能中心读取与写入

### 17.2 需要新增的能力

- OpenClaw 专用授权机制
- 面向 AI 助手的聚合工具层
- 更标准化的品牌助手接口返回格式
- 操作级审计日志
- OpenClaw 专用 Skill 包

## 18. 对当前项目影响评估

### 正向收益

- 用户可通过自然语言直接查询品牌系统数据
- 用户可通过消息渠道调用网站能力
- 品牌资料、任务、提示词配置等都能被统一解释
- 系统可变成真正的“品牌运营智能中台”

### 风险点

- 品牌边界泄漏风险
- 权限漏校验风险
- 高风险写操作误触发
- 密码授权模式的长期安全风险

### 控制策略

- 只走受控工具层
- 所有请求强带 `brandId`
- 所有写操作审计和确认
- 第二阶段前不开放高风险写操作
- 后期切换到授权票据模式

## 19. 最终建议

推荐你后续开发时按这个顺序推进：

1. 先做品牌助手工具层
2. 再做 OpenClaw Skill
3. 先落只读问答
4. 再逐步开放低风险写操作
5. 最后再产品化消息渠道接入

一句话总结：

> OpenClaw 最适合在本系统中扮演“带品牌上下文、带权限控制、通过工具层操作网站能力的品牌运营助手”，而不是直接读数据库的万能代理。
