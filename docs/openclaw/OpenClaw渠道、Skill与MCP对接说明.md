# OpenClaw 渠道、Skill 与 MCP 对接说明

## 1. 这份文档解决什么问题

这份文档专门解决前面方案里一个关键但没有说透的问题：

1. OpenClaw 到底是不是网站内聊天前端？
2. Skill 和 MCP 在 OpenClaw 里分别承担什么角色？
3. 我们这套网站能力，应该如何被 OpenClaw 接入？
4. 第一阶段到底需要开发什么，不需要开发什么？

一句话先说结论：

> OpenClaw 的主入口不是网站前端，而是飞书、企微等外部沟通渠道；Skill 是让助手“会做事、会理解业务”的认知和工作流层，MCP 是让助手“能安全调用网站能力和历史数据”的标准化工具接入层，网站本身第一阶段主要提供后端能力层、绑定鉴权和复杂结果落点页。

---

## 2. 对 OpenClaw 的正确理解

根据 OpenClaw 官方仓库与文档，OpenClaw 的核心定位是：

- 自托管 Gateway
- 多渠道 AI 助手
- 通过已有聊天渠道和设备入口与用户交互

官方说明里的关键事实包括：

- 它支持 Feishu、Slack、Telegram、Discord、Microsoft Teams、WebChat 等多种渠道
- `Gateway` 是控制平面，不是产品本身
- `Control UI` 是控制和调试界面，不是必须的主对话入口
- 它原生支持 `skills`
- 它也原生支持 `MCP`

对我们来说，最重要的落地含义是：

### 2.1 用户主要不在网站里和 OpenClaw 对话

用户主要应该在这些地方和 OpenClaw 交互：

- 飞书
- 企微
- 未来可扩展到其他渠道

网站不是第一阶段的主对话入口。

### 2.2 网站仍然重要，但角色变了

网站在这套架构里的角色主要是：

- 业务能力提供方
- 历史数据提供方
- 账号和品牌权限的权威来源
- 授权绑定和审计管理入口
- 复杂结果查看页和配置页

而不是“主聊天窗口”。

---

## 3. Skill 和 MCP 到底分别做什么

这是整个方案里最容易混淆的一层。

## 3.1 Skill 的职责

在 OpenClaw 官方语义里，Skill 本质上是：

- 教 agent 如何使用工具
- 教 agent 如何理解领域术语
- 教 agent 如何执行某类多步骤工作

也就是说，Skill 更接近：

- 业务操作手册
- 任务工作流说明
- 领域认知提示层
- 决策和追问策略层

### Skill 负责的事情

- 定义“品牌增长报告”是什么意思
- 定义“最近失败任务原因总结”该怎么做
- 定义“知识库最近新增资料”应该先查什么、后查什么
- 定义默认追问策略
- 定义输出风格
- 定义什么场景应该调什么能力

### Skill 不负责的事情

- 不直接读数据库
- 不直接承接复杂权限校验
- 不直接暴露网站底层接口
- 不应该自己承载大规模结构化数据查询逻辑

一句话：

> Skill 解决的是“OpenClaw 知不知道该怎么做”和“该怎么和用户说”的问题。

---

## 3.2 MCP 的职责

MCP 在这里解决的是标准化工具接入问题。

对我们这套系统来说，MCP 更适合承担：

- 网站能力读取
- 历史数据读取
- 任务触发
- 结构化结果返回
- 受控写操作

### MCP 负责的事情

- 提供 `get_recent_tasks_summary`
- 提供 `get_failed_tasks_summary`
- 提供 `create_brand_growth_report`
- 提供 `get_brand_archive_summary`
- 提供 `get_brand_archive_survey`
- 提供 `get_platform_accounts`
- 提供 `get_brand_competitor_accounts`
- 提供 `get_brand_industry_feeds`
- 提供 `get_brand_business_assets`
- 提供 `get_opportunity_insight_workspace`
- 提供 `generate_opportunity_insight_step_one`
- 提供 `generate_opportunity_insight_step_two`
- 提供 `generate_opportunity_insight_step_three`
- 提供 `get_personal_center_overview`
- 提供 `list_brand_members`
- 提供 `list_brand_invites`
- 提供 `create_brand_invite_link`
- 提供 `revoke_brand_invite`
- 提供 `get_brand_permission_settings`
- 提供 `list_my_brand_invites`
- 提供 `list_my_brand_invite_notifications`
- 提供 `accept_my_brand_invite`
- 提供 `get_recent_knowledge_files`
- 提供 `get_skill_config_summary`
- 提供 `create_xiaohongshu_original_note`
- 提供 `list_my_third_party_platforms`
- 提供 `update_my_third_party_platform_secret`
- 提供 `list_my_orders`

### MCP 不负责的事情

- 不负责定义业务语言
- 不负责定义高频任务模板
- 不负责告诉 agent 哪个任务该先问什么
- 不负责决定输出语气和业务表达

一句话：

> MCP 解决的是“OpenClaw 具体通过什么标准化能力去安全读取数据和执行动作”的问题。

---

## 3.3 CLI 的职责

CLI 在 OpenClaw 体系里也很重要，但它不是面向业务用户的主交互层。

CLI 更适合承担：

- OpenClaw 自身部署与运维
- 本地调试
- Onboarding
- 管理 MCP 定义
- 技术排障
- 自动化脚本

对我们项目来说，CLI 不应该成为员工主入口。

一句话：

> CLI 主要给运维和研发使用，不是给业务员工日常对话使用。

---

## 4. 我们系统里 Skill 和 MCP 的正确关系

对接到我们现有网站后，推荐关系如下：

## 4.1 Skill 是“任务入口层”

Skill 定义用户最常说的话，以及对应的业务工作流。

例如：

- “帮我看看最近 7 天的任务情况”
- “帮我总结一下最近失败任务的主要原因”
- “帮我做一版小红书原创图文”
- “看看公众号文章创作现在的配置”

Skill 负责把这些自然语言任务组织成明确的执行路径。

## 4.2 MCP 是“网站能力接入层”

MCP 把网站的能力和历史数据包装成可被 OpenClaw 调用的标准化资源和工具。

OpenClaw 通过 MCP 获取：

- 当前品牌上下文
- 个人中心概览和待处理提醒
- 品牌档案摘要、建档问卷、品牌账号、竞品账号、行业资料、业务资产
- 任务摘要
- 历史失败原因
- 机会洞察工作区和 step1/2/3 的执行能力
- 团队成员、邀请链接、邀请通知和权限模板
- 内容历史
- 知识库历史
- 技能配置摘要
- 第三方接口配置摘要
- 订单中心摘要
- 各类任务触发能力

## 4.3 网站是“权威后端”

网站仍然是：

- 数据权威来源
- 权限权威来源
- 任务执行后端
- 审计权威来源

OpenClaw 不应该绕过网站后端直接碰数据库。

---

## 5. 推荐的真实接入架构

推荐架构如下：

### 5.1 渠道层

- 飞书机器人
- 企微机器人

用户在这些渠道里发消息给 OpenClaw。

### 5.2 OpenClaw Gateway 层

负责：

- 接收渠道消息
- 路由到对应 agent / session
- 装载 Skill
- 调用 MCP 能力
- 记录会话和执行过程

### 5.3 Skill 层

以“品牌运营助手 Skill”为核心，定义：

- 业务术语
- 高频任务
- 历史数据使用规则
- 默认追问策略
- 输出结构
- 风险动作判断规则

### 5.4 MCP 层

由我们来提供一个或多个 MCP server，把现有网站能力包装进去。

建议至少拆成：

- 品牌上下文 MCP
- 任务与报告 MCP
- 知识库 MCP
- 技能配置 MCP
- 内容生成 MCP
- 历史分析 MCP

### 5.5 网站后端能力层

MCP 内部不要直接写业务逻辑，而是尽量复用现有网站后端：

- 现有服务接口
- 现有任务中心
- 现有知识库接口
- 现有技能中心接口
- 现有内容生成链路

这样可以最大限度减少对现有系统运行的影响。

---

## 6. 一条请求是怎么跑通的

## 6.1 例子一：总结最近失败任务原因

用户在飞书里说：

- 帮我总结一下最近失败任务的主要原因

执行链路应该是：

1. 飞书消息进入 OpenClaw Gateway
2. Gateway 根据绑定关系识别用户和品牌
3. 品牌运营助手 Skill 识别这属于“失败任务总结”任务
4. Skill 调用 `get_failed_tasks_summary` 相关 MCP 工具
5. MCP 工具去网站后端读取失败任务历史、错误摘要、重试记录
6. OpenClaw 结合 Skill 里的输出规则生成用户可读结论
7. 结果返回飞书会话

这里：

- Skill 负责“理解任务 + 组织流程 + 输出表达”
- MCP 负责“安全调用数据与能力”

## 6.2 例子二：做一版小红书原创图文

用户在企微里说：

- 帮我做一版小红书原创图文

执行链路应该是：

1. 企微消息进入 OpenClaw Gateway
2. Gateway 根据绑定关系识别用户、品牌、权限
3. Skill 判断这是“内容生成类任务”
4. Skill 先决定是否需要最少追问
5. Skill 调用 `create_xiaohongshu_original_note` MCP 工具
6. MCP 工具去网站现有任务系统触发“小红书原创图文”任务
7. Task 进入网站原有执行链路
8. 结果摘要和链接回传到企微

这里：

- 用户仍然是在企微里完成主要交互
- 网站主要负责执行和结果沉淀

## 6.3 例子三：直接提取品牌账号和品牌资料

用户在飞书里说：

- 帮我把当前品牌的账号资料、竞品账号和行业资料都拉出来

执行链路应该是：

1. 消息进入 OpenClaw Gateway
2. Gateway 识别当前登录用户与默认品牌
3. 品牌运营助手 Skill 判断这是“品牌档案提取”任务
4. Skill 先调 `get_brand_archive_summary`
5. 再按需要调 `get_platform_accounts`、`get_brand_competitor_accounts`、`get_brand_industry_feeds`
6. MCP 去网站后端读取品牌档案、账号池和行业资料
7. Skill 组织成用户可读摘要后返回会话

这里：

- Skill 负责决定要不要展开明细
- MCP 负责安全地读取品牌账号和品牌数据

## 6.4 例子四：继续机会洞察下一步

用户在企微里说：

- 帮我看机会洞察到哪一步了，能继续就继续

执行链路应该是：

1. Skill 先调 `get_opportunity_insight_workspace`
2. 根据返回的 step 状态判断是先做 step1、step2 还是 step3
3. 如果条件满足，调用 `generate_opportunity_insight_step_two` 或 `generate_opportunity_insight_step_three`
4. 网站原有报告任务链路负责排队和执行
5. MCP 返回任务状态、下一步建议和页面入口

这意味着：

- OpenClaw 不只是“读报告”，还能推进网站已有的机会洞察流程
- 但仍然完全复用网站现有权限和任务中心

## 6.5 例子五：查看团队协作并创建邀请链接

用户在飞书里说：

- 帮我看当前品牌成员和邀请列表，再创建一个新的员工邀请链接

执行链路应该是：

1. Skill 先调 `list_brand_members`
2. 再调 `list_brand_invites`
3. 如果用户确认需要新建邀请，再调 `create_brand_invite_link`
4. MCP 复用网站现有团队协作与品牌邀请能力
5. 最终返回邀请码、邀请链接和页面入口

这里：

- Skill 负责先读再做，避免重复创建邀请
- MCP 负责复用网站团队协作权限和邀请审计链路

## 6.6 例子六：先看个人中心总览，再处理待接受邀请

用户在企微里说：

- 帮我看看现在有哪些待处理事项，有邀请的话顺手告诉我

执行链路应该是：

1. Skill 先调 `get_personal_center_overview`
2. 如果存在待处理邀请，再调 `list_my_brand_invites` 或 `list_my_brand_invite_notifications`
3. 如用户明确接受其中某条，再调用 `accept_my_brand_invite`
4. MCP 返回当前品牌、进行中任务、最近订单和邀请状态摘要

这意味着：

- OpenClaw 已经可以把个人中心概览和团队协作串起来
- 用户不需要先打开网页逐页查信息

---

## 7. 第一阶段到底需不需要网站前端开发

结论是：

## 7.1 第一阶段不需要把“网站内聊天前端”作为重点开发项

因为主入口应该是：

- 飞书
- 企微

所以第一阶段最该做的是：

- 渠道接入
- 账号绑定
- Skill
- MCP
- 网站后端能力层

## 7.2 第一阶段网站只需要最小配合

网站建议只做这些最小配合项：

- 账号绑定或授权回调页
- 权限和品牌映射接口
- MCP 所需后端能力接口
- 审计和管理页
- 复杂结果深链接页

这和“做一个站内聊天产品”是两回事。

---

## 8. 第一阶段的真正开发重点

第一阶段最应该优先做的不是前端，而是下面 5 层：

## 8.1 渠道接入

- 飞书
- 企微

## 8.2 绑定与鉴权

- 渠道用户和内部用户绑定
- 默认品牌识别
- 权限范围识别

## 8.3 品牌运营助手 Skill

- 高频任务模板
- 业务语义
- 输出规则
- 追问策略

## 8.4 网站 MCP 能力层

- 读任务
- 读历史
- 触发任务
- 读知识库
- 读技能配置
- 读内容历史

## 8.5 审计与风控

- 调用审计
- 高风险动作确认
- 权限校验
- 可回溯

---

## 9. 最终建议

现在应该把整套方案收口成下面这条主线：

1. **对话入口在飞书、企微，不在网站前端。**
2. **Skill 负责业务理解、任务编排和输出体验。**
3. **MCP 负责网站能力和历史数据的标准化接入。**
4. **网站第一阶段重点是后端能力层、绑定鉴权和审计，而不是站内聊天 UI。**
5. **员工最终体验应该是：在熟悉的沟通渠道里一句话发起需求，OpenClaw 自动调用网站能力和历史数据完成任务。**

---

## 10. 一句话结论

> 对我们这套系统来说，OpenClaw 的正确接法不是“在网站里再做一个聊天框”，而是“让飞书、企微成为对话入口，让 Skill 成为任务理解和编排层，让 MCP 成为网站能力与历史数据接入层”，这样既符合 OpenClaw 官方工作方式，也更符合你的用户体验目标。
