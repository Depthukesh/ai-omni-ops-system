# OpenClaw 详细开发方案

## 1. 文档定位

本方案不是一份脱离现有系统的理想化接入建议，而是基于当前 `ai-omni-ops-system` 已有文档、真实系统结构和近期演进方向，给出一份可直接进入开发拆解的 OpenClaw 类智能体接入方案。

这份方案重点回答六类问题：

1. 当前系统的真实结构，决定了 OpenClaw 应该接在哪里，而不应该接在哪里。
2. 在现有“品牌上下文 + 多工作台 + 技能中心 + 知识库 + 任务中心”的体系下，OpenClaw 如何接入才不会破坏边界。
3. 如何让不同权限的员工，在权限范围内自由使用网站能力与读取数据。
4. 如何在网站功能后续不断优化、拆分、迁移的情况下，保持 OpenClaw 接入层长期稳定。
5. Skill、MCP、CLI 在当前系统里的最佳分工是什么。
6. 开发应按什么阶段推进，哪些内容先做，哪些内容后做。

一句话结论：

> 对当前这套系统，最合理的 OpenClaw 接入方式是：以品牌上下文和正式权限体系为前提，以 `Skill` 作为认知与编排层，以 `MCP` 作为主执行层，以受限 `CLI` 作为后台自动化补充层，并把接入层设计成与页面实现解耦的“稳定能力层”，从而适应后续持续重构和功能演进。

---

## 2. 本方案依据

本方案基于以下两组文档：

### 2.1 系统主文档

- `ai-omni-ops-system/docs/README.md`
- `ai-omni-ops-system/docs/site-map.md`
- `ai-omni-ops-system/docs/2026-06-06-system-architecture-analysis-report.md`
- `ai-omni-ops-system/docs/engineering-standards.md`
- `ai-omni-ops-system/docs/personal-center-multi-user-system-plan.md`
- `ai-omni-ops-system/docs/system-refactor-roadmap.md`
- `ai-omni-ops-system/docs/project_planning/14_AI全域运营系统_统一技能中心设计方案_v1.md`
- `ai-omni-ops-system/docs/project_planning/43_AI全域运营系统_知识库主数据层设计草案_v1.md`
- `ai-omni-ops-system/docs/changes/2026-06-10-knowledge-binding-runtime-and-docs-sync.md`

### 2.2 OpenClaw 方案文档

- `openclaw对接网站解决方案/01-OpenClaw对接网站完整方案.md`
- `openclaw对接网站解决方案/02-OpenClaw品牌运营助手Skill草案.md`
- `openclaw对接网站解决方案/03-OpenClaw实施清单与验收标准.md`
- `openclaw对接网站解决方案/04-OpenClaw接入技术评估与安全权限方案.md`

---

## 3. 当前系统对 OpenClaw 接入的真实约束

如果不先尊重当前系统的真实结构，OpenClaw 方案就很容易写成一套“好看但不能落地”的空方案。

基于现有文档，当前系统对 OpenClaw 接入有以下关键约束。

## 3.1 系统不是单页产品，而是品牌上下文下的复合业务系统

当前系统的真实主轴不是一个单页面问答网站，而是：

- 统一认证入口
- 品牌与团队协作体系
- 品牌增长工作台
- 小红书工作台
- 抖音工作台
- 公众号工作台
- 设计工作台
- 个人中心
- 后台治理台
- 任务中心
- 媒体资产体系
- 技能中心与 Provider 治理中心
- 企业知识库与知识绑定运行时

因此 OpenClaw 不能被设计成：

- 一个只会调某几个接口的问答机器人
- 一个直接连接数据库的“万能代理”
- 一个只懂前台页面、却不懂后台治理和工作流差异的脚本

OpenClaw 必须理解：

- 用户是谁
- 当前品牌是谁
- 当前处在什么工作台语义下
- 当前问题是只读、执行、分析还是配置治理
- 当前能力来自前台品牌空间、后台平台空间，还是知识库运行时

---

## 3.2 当前系统是“品牌上下文优先”的架构

当前系统已经明确收口为：

- 用户登录态是统一入口
- 工作区请求必须先校正当前品牌
- 后端对品牌域接口做品牌成员校验
- 前端不允许继续依赖 demo brand
- 品牌域请求不能只信任前端传的 `brandId`

这意味着：

### 对 OpenClaw 的直接要求

1. OpenClaw 的任何品牌域能力都必须在真实会话中运行。
2. OpenClaw 必须显式感知当前品牌。
3. OpenClaw 不允许默认跨品牌聚合。
4. 品牌切换必须是显式动作，而不是模型自行猜测。
5. 工具层必须由服务端注入真实品牌上下文，而不能只让模型自己拼参数。

---

## 3.3 当前系统权限不是单一角色，而是多层身份模型

现有文档已经明确了多层身份体系：

- `systemRole`：平台后台身份
- `accountTier`：会员等级和权益层
- `brandRole` 或当前实际前台品牌协作角色
- 板块级权限模板
- 品牌成员关系

当前系统又已经向：

- 品牌级权限模板
- 板块级权限拆分
- 工作区级 view/edit 区分
- 后端品牌归属校验

持续推进。

这意味着：

### 对 OpenClaw 的直接要求

1. OpenClaw 不能只判断“是否登录”。
2. OpenClaw 不能只判断“是不是管理员”。
3. OpenClaw 必须同时考虑：
   - 平台后台权限
   - 品牌成员身份
   - 能力动作权限
   - 数据可见范围
4. OpenClaw 的能力开放必须与现有页面权限一致，甚至更严，不能更松。

---

## 3.4 当前系统已进入“技能中心 + Provider + 知识库运行时”阶段

现有系统已经不是“写死 prompt + 写死模型”的阶段，而是进入了：

- 统一技能中心
- 能力包模型
- Provider 配置中心
- 模型优先级与 fallback 规则统一
- 知识库治理层
- 知识绑定运行时
- 模块 -> 能力包 -> 技能 的继承解析

这意味着：

### 对 OpenClaw 的直接要求

1. OpenClaw 不应该绕开技能中心和 Provider 治理层。
2. OpenClaw 应该把“技能 / 能力包 / 模块 / 知识绑定”作为核心系统概念。
3. OpenClaw 的执行能力不应只接页面按钮，而应对接统一能力对象。
4. OpenClaw 在后期要能够复用知识绑定运行时，而不是额外造一套“机器人知识库”。

---

## 3.5 当前系统要求页面做薄、业务能力下沉、外部依赖隔离

工程规范和重构路线已经明确要求：

- 页面做薄
- controller 做薄
- 复杂逻辑下沉到 service、gateway、repository、adapter
- 外部依赖统一封装
- 新增能力不能继续把逻辑堆到页面层
- 后续功能会持续拆壳、拆 Hook、拆服务边界

这意味着：

### 对 OpenClaw 的直接要求

1. OpenClaw 接入不能直接依赖当前页面结构。
2. OpenClaw 接入不能直接依赖某个页面组件当前怎么拆。
3. OpenClaw 不能通过抓页面结构、点击页面按钮的方式作为主接入模式。
4. OpenClaw 的主接入层必须建立在稳定能力层，而不是建立在不稳定 UI 结构上。

---

## 3.6 当前系统已要求“所有明确执行动作进入正式 Task”

工程规范已经明确：

- 只要是明确执行/生成/发布动作
- 且进入异步或长耗时链路
- 就必须接入正式 `Task`

因此 OpenClaw 不能自行搞一套影子任务体系。

### 对 OpenClaw 的直接要求

1. 所有触发生成的动作都应落到现有 Task 体系。
2. OpenClaw 只负责触发、读取状态、解释结果，不应绕过任务中心。
3. OpenClaw 的工具层必须能够返回：
   - taskId
   - stage
   - status
   - latestOutput
   - errorSummary
   - resultAssetId

---

## 4. OpenClaw 接入的总体目标

结合系统基线和你的要求，本方案将目标定义为：

## 4.1 对员工侧

- 员工可以在网站内或 OpenClaw 渠道中自然发起请求。
- 员工不需要理解复杂页面结构，也能调用自己有权限的功能。
- 员工能读取自己有权限查看的数据。
- 员工能在授权范围内触发网站已有能力。
- 员工在使用过程中始终知道自己正在操作哪个品牌、哪个模块、什么风险级别。

## 4.2 对系统侧

- OpenClaw 不新增第二套权限体系，而是复用现有权限体系并增强动作级表达。
- OpenClaw 不新增第二套知识治理体系，而是复用现有知识绑定运行时。
- OpenClaw 不新增第二套任务执行体系，而是复用现有 Task。
- OpenClaw 不绑死页面和 UI 结构，而是绑定稳定能力层。

## 4.3 对未来演进

- 后续前端页面继续拆分，不影响 OpenClaw 工具能力。
- 后续新增工作台、新技能、新能力包，只需注册能力和映射，不必重写整个智能体。
- 后续知识库、Provider、权限策略变化，可以在治理层更新，不必到处修改 OpenClaw prompt。

---

## 5. 核心设计原则

## 5.1 以品牌上下文为第一边界

没有明确品牌上下文时：

- 可以解释系统
- 可以列出用户品牌
- 可以提示用户选择品牌

不能：

- 读取品牌业务数据
- 触发品牌执行动作
- 修改品牌配置

## 5.2 以正式权限为真实边界

OpenClaw 的所有能力都必须继承：

- 当前用户真实身份
- 当前品牌成员关系
- 当前板块权限
- 当前动作权限
- 当前数据可见范围

## 5.3 以稳定能力层为接入点

OpenClaw 对接的不是页面，而是：

- 领域动作
- 聚合能力
- 工具协议
- 任务接口
- 知识绑定运行时

## 5.4 以治理层为配置来源

OpenClaw 不应写死：

- 模型名
- Provider
- 知识库绑定关系
- 技能默认值
- 板块权限

这些都应来自现有治理层。

## 5.5 以未来可演进为架构前提

任何 OpenClaw 接入设计都要优先考虑：

- 页面拆分
- 工作台新增
- 技能注册扩展
- 知识绑定演进
- 权限模型细化
- Provider 改造

不能做成“现在能跑，后面每改页面就全崩”的接法。

---

## 6. 推荐总体架构

建议采用七层架构。

## 6.1 第 1 层：用户入口层

包括：

- 网站内助手入口
- OpenClaw 外部客户端
- 消息渠道入口

职责：

- 用户发起自然语言请求
- 展示确认、结果、错误和审计摘要

## 6.2 第 2 层：认证与授权交换层

职责：

- 用户在网站内授权 OpenClaw
- 票据换取助手会话
- 管理会话续期、吊销、设备绑定和品牌上下文初始化

建议：

- 不使用长期密码直登作为正式方案
- 使用网站内授权票据或 OAuth 风格交换

## 6.3 第 3 层：Skill 编排层

职责：

- 解释系统结构
- 判断用户意图
- 判断需不需要先确认品牌
- 判断该走哪个工具
- 判断是否需要二次确认
- 组织自然语言输出

## 6.4 第 4 层：MCP 主执行层

职责：

- 暴露标准化工具
- 对工具做 Schema 管理
- 注入上下文
- 执行权限裁决
- 记录审计
- 做限流、幂等、风控和版本管理

这是本方案的主接入层。

## 6.5 第 5 层：领域能力适配层

职责：

- 对接当前 `apps/server` 真实模块和 service
- 适配现有 API / Service / Repository
- 聚合多个模块能力
- 对结果做裁剪、脱敏、摘要化

## 6.6 第 6 层：任务与知识运行时层

职责：

- 统一走正式 Task
- 接入知识绑定运行时
- 读取能力包 / 技能 / 模块绑定
- 衔接 Provider 与模型配置

## 6.7 第 7 层：数据与基础设施层

包括：

- PostgreSQL
- OSS / 本地受控 fallback
- Provider 配置
- 媒体存储
- 知识库主数据
- 审计日志
- 任务记录

---

## 7. Skill、MCP、CLI 的最佳分工

## 7.1 Skill 的职责

Skill 只负责：

- 系统认知
- 工具选择
- 品牌确认策略
- 风险提示策略
- 输出风格
- 对话流程编排

Skill 不负责：

- 最终权限放行
- 直接执行高风险动作
- 直接读写数据库

## 7.2 MCP 的职责

MCP 负责：

- 工具注册
- 参数校验
- 权限校验
- 品牌上下文注入
- 风险分级
- 审计记录
- 幂等
- 错误码
- 稳定对外协议

MCP 是正式主执行层。

## 7.3 CLI 的职责

CLI 只建议用于：

- 后台运维
- 批量同步
- 索引重建
- 数据修复
- 诊断
- 受控批处理

CLI 不建议用于：

- 员工网站主能力层
- 普通查询与常规执行动作
- 跨品牌多角色精细授权的正式接入

## 7.4 最终分工结论

推荐组合如下：

- `Skill`：认知与编排
- `MCP`：正式执行
- `CLI`：后台受限执行器

---

## 8. 面向后续持续优化的网站适配策略

这是本方案最关键的新增点之一。

因为当前系统文档已经明确后续还会持续：

- 页面拆壳
- Hook 化
- Feature 化
- 后端 service 分层
- 知识库运行时继续扩展
- Provider 和模型治理继续统一

如果 OpenClaw 接入设计不考虑这点，后面每一次优化网站，OpenClaw 都会跟着返工。

所以必须从一开始就做“抗变化设计”。

## 8.1 不绑定页面，绑定领域动作

不要把 OpenClaw 能力设计为：

- “点击某页面某按钮”
- “走某个当前页面的特定提交路径”
- “读取某个 UI 组件的当前结构”

应该设计为：

- `brand.archive.read`
- `brand.report.generate`
- `xhs.original.create`
- `knowledge.base.upload`
- `skill.profile.read`
- `skill.override.update`
- `task.status.read`

页面如何重构，不影响动作定义。

## 8.2 不绑定具体 service 文件，绑定稳定能力接口

后续 `works.service.ts`、`reports.service.ts`、`collectors.service.ts` 都会继续拆分。

所以 OpenClaw 不应依赖：

- 某个 service 当前类名
- 某个方法当前放在哪个文件
- 某个页面当前调用哪个 Hook

应该依赖：

- 稳定能力网关
- 统一 action code
- 稳定数据契约

## 8.3 把“模块 / 能力包 / 技能”作为一等公民

当前知识绑定运行时已经按：

- 模块
- 能力包
- 技能

做继承解析。

OpenClaw 接入层也必须沿同一维度建模。

原因是：

- 后续页面入口会变
- 页面结构会拆
- 但模块、能力包、技能作为治理对象反而会越来越稳定

因此 OpenClaw 应优先围绕：

- `moduleKey`
- `skillPackageKey`
- `skillKey`
- `taskType`
- `actionCode`

建立工具协议与路由，而不是围绕页面 URL 建立。

## 8.4 做版本化工具协议

建议从一开始就给 MCP 工具做版本号：

- `assistant.brand.summary.get.v1`
- `assistant.task.list.v1`
- `assistant.skill.override.update.v1`

当后续页面、数据结构、治理模型升级时：

- 可以新增 `v2`
- 不必强行破坏旧客户端

## 8.5 做能力注册表，不做散式硬编码

建议建立统一能力注册表，记录：

- action code
- 工具名
- 所属模块
- 所属能力包
- 风险等级
- 最小权限
- 是否需要品牌上下文
- 是否需要确认
- 是否写操作
- 是否进 Task
- 是否支持知识库绑定

以后新增能力时：

- 注册即可接入
- 不必修改 OpenClaw 核心逻辑

---

## 9. 推荐的能力模型

## 9.1 Action Code 模型

建议所有 OpenClaw 能力都基于统一动作编码，而不是直接基于页面或接口。

示例：

- `brand.profile.read`
- `brand.archive.read`
- `brand.team.read`
- `brand.skill.read`
- `brand.skill.override.update`
- `brand.skill.baseline.reset`
- `knowledge.base.list`
- `knowledge.base.create`
- `knowledge.file.upload`
- `knowledge.binding.read`
- `task.list`
- `task.detail.read`
- `task.retry`
- `report.brand-growth.generate`
- `report.half-year-plan.generate`
- `xhs.original.create`
- `xhs.rewrite.create`
- `xhs.video.create`
- `douyin.plan.generate`
- `wechat.article.generate`
- `design.task.create`

## 9.2 Tool Registry 模型

每个工具最少应有如下字段：

- `toolName`
- `version`
- `actionCode`
- `moduleKey`
- `skillPackageKey`
- `riskLevel`
- `requiresBrandContext`
- `requiresConfirmation`
- `writesData`
- `createsTask`
- `knowledgeAware`
- `minScope`
- `resultViewPolicy`

## 9.3 Data View 模型

OpenClaw 返回的数据不应只有“能不能看”，还要定义“能看到什么形态”。

建议：

- `SUMMARY`
- `DETAIL`
- `MASKED_DETAIL`
- `EXPORTABLE_DETAIL`
- `RESTRICTED`

这样可以解决：

- 能看品牌资产摘要
- 但不能直接看全量敏感明细
- 能在对话里看摘要
- 但导出要额外审批

---

## 10. 与现有系统模块的映射方案

## 10.1 认证与品牌上下文

优先复用当前：

- `/api/auth/login`
- `/api/auth/refresh`
- `/api/auth/me`
- `/api/auth/brands`
- `/api/auth/switch-brand`
- `/api/auth/logout`

正式 OpenClaw 方案建议新增：

- `POST /api/assistant/auth/authorize`
- `POST /api/assistant/auth/exchange`
- `POST /api/assistant/auth/revoke`
- `GET /api/assistant/session`

职责：

- 不替代原登录体系
- 只在网站统一身份体系之上增加 OpenClaw 授权交换

## 10.2 品牌与团队协作

优先复用当前品牌成员与品牌权限体系。

OpenClaw 侧建议只额外增加：

- 能力动作矩阵
- Data View 策略
- 风险等级

不要另造第二套品牌角色。

## 10.3 技能中心

当前系统已经将技能中心定位为：

- 统一入口
- 能力包管理中心
- Prompt / references / scripts / knowledge / provider / 覆盖层的治理中心

因此 OpenClaw 应围绕能力包模型接入，而不是直接围绕零散 prompt 接入。

建议 OpenClaw 可读写能力分为：

- 平台基线读取
- 品牌覆盖读取
- 品牌覆盖更新
- 用户偏好读取
- 重置到平台基线

其中写操作必须明确区分：

- 改的是平台基线
- 还是品牌覆盖
- 还是用户偏好

## 10.4 知识库运行时

当前系统知识库已经进入真实运行时，且采用：

- 模块 -> 能力包 -> 技能

的继承解析规则，并使用 best-effort 注入。

OpenClaw 接入时建议：

1. 不单独再做一套机器人知识检索层。
2. 直接复用现有知识绑定运行时。
3. OpenClaw 作为新的调用入口时，也按同样的继承规则读取绑定。
4. 调用记录继续走统一知识调用日志。

这样可以保证：

- 知识治理层只有一套
- 知识绑定策略只有一套
- 后续知识库调整时 OpenClaw 自动跟随

## 10.5 任务中心

所有生成型工具统一进入 Task：

- 报告
- 规划
- 内容生成
- 图片生成
- 视频生成
- 设计任务

OpenClaw 工具执行后的标准返回建议统一为：

- `accepted`
- `taskId`
- `taskType`
- `taskStatus`
- `currentStage`
- `resultUrl`
- `nextSuggestedAction`

## 10.6 Provider 与模型治理

OpenClaw 不应写死使用哪个模型，而应：

- 读取技能中心当前 Provider / 模型偏好
- 尊重现有 runtime 选择规则
- 返回真实尝试顺序和失败信息

OpenClaw 的价值在于解释和协助，而不是绕过治理层直接指定模型。

---

## 11. 权限模型的详细设计

## 11.1 四层权限模型

建议沿用并细化为四层：

### 第一层：身份层

- `userId`
- `systemRole`
- `accountTier`
- 会话状态
- 风险状态

### 第二层：品牌成员层

- `brandId`
- `brandRole`
- 是否品牌成员
- 是否品牌管理员
- 是否为邀请中状态

### 第三层：能力动作层

- `actionCode`
- `scope`
- `modulePermission`
- `view/edit/manage/approve/export`

### 第四层：数据视图层

- 可否看摘要
- 可否看明细
- 是否要脱敏
- 可否导出
- 是否仅限本人创建数据

## 11.2 推荐角色映射

由于当前系统真实前台角色已收口为：

- `ADMIN`
- `STAFF`
- `TALENT`

OpenClaw 方案不建议重新发明前台角色名，而建议：

### 平台层

- `SUPER_ADMIN`
- `ADMIN_OPERATOR`
- 其他后台系统角色

### 品牌层

- `ADMIN`
- `STAFF`
- `TALENT`

### 再叠加动作权限模板

例如：

- `brand-growth.view`
- `brand-growth.edit`
- `knowledge.view`
- `knowledge.edit`
- `task.retry`
- `skill.override.edit`
- `skill.baseline.reset`
- `export.full`

## 11.3 风险分级

建议将工具动作分为四级：

### L1：只读

示例：

- 读取品牌资料
- 读取任务状态
- 读取知识库列表
- 读取技能详情

策略：

- 自动执行
- 正常审计

### L2：低风险写操作

示例：

- 创建草稿任务
- 新增知识库
- 上传资料
- 更新个人偏好

策略：

- 简短确认
- 正常审计

### L3：高风险业务写操作

示例：

- 修改品牌技能覆盖
- 重置品牌技能基线
- 批量触发生成
- 删除品牌知识资料

策略：

- 二次确认
- 强审计
- 可回滚或可恢复

### L4：敏感治理动作

示例：

- 导出全量敏感数据
- 调整授权
- 批量删除或批量重置
- 触发后台运维工具

策略：

- 管理员批准
- 双人确认或审批流
- 强审计与告警

---

## 12. 安全方案

本节只收口与开发方案直接相关的安全控制。

## 12.1 会话安全

- 使用网站授权票据，不长期保存密码
- Access Token 短期有效
- Refresh Token 绑定设备与客户端
- 支持按品牌、按客户端撤权
- 敏感操作支持再认证

## 12.2 品牌隔离

- 所有品牌工具必须从服务端会话解析当前 `brandId`
- 不允许只信前端传值
- 不允许默认跨品牌
- 品牌切换必须显式调用

## 12.3 Prompt Injection 防护

- 外部网页、知识库文本、OCR 文本统一视为不可信输入
- 不可信输入只能影响回答内容，不能提升权限
- 最终权限裁决始终在 MCP / 领域服务侧

## 12.4 字段脱敏

建议字段分级：

- `PUBLIC`
- `INTERNAL`
- `SENSITIVE`
- `RESTRICTED`

OpenClaw 默认返回：

- 对话中优先摘要
- 明细按 Data View 决定
- 高敏字段默认脱敏

## 12.5 CLI 约束

- CLI 不允许模型自由拼接命令
- CLI 只允许白名单模板
- CLI 在隔离环境执行
- CLI 全量审计

## 12.6 导出控制

- 读取权限不等于导出权限
- 大批量导出走审批
- 下载链接短期有效
- 高敏导出带水印和导出原因

---

## 13. MCP 工具分组设计

建议第一阶段工具按以下分组建立。

## 13.1 会话与上下文类

- `get_my_identity`
- `get_my_brands`
- `get_current_brand`
- `switch_brand`
- `get_my_capabilities`

## 13.2 品牌信息类

- `get_brand_summary`
- `get_brand_archive`
- `get_brand_members`
- `get_brand_platform_accounts`
- `get_brand_products`

## 13.3 任务与结果类

- `list_brand_tasks`
- `get_task_detail`
- `get_latest_running_tasks`
- `retry_task`
- `cancel_task`

## 13.4 知识库类

- `list_knowledge_bases`
- `get_knowledge_base_detail`
- `create_knowledge_base`
- `upload_knowledge_files`
- `delete_knowledge_file`
- `list_knowledge_invocation_logs`

## 13.5 技能中心类

- `list_skill_packages`
- `get_skill_package_detail`
- `get_brand_skill_override`
- `update_brand_skill_override`
- `reset_brand_skill_baseline`

## 13.6 工作台执行类

- `generate_brand_growth_report`
- `generate_half_year_plan`
- `generate_xhs_original_note`
- `generate_xhs_rewrite_note`
- `generate_xhs_video_note`
- `generate_douyin_plan`
- `generate_wechat_article`
- `create_design_task`

## 13.7 内部治理类

只允许后台受控使用：

- `run_internal_cli_job`
- `resync_knowledge_bindings`
- `rebuild_embeddings`
- `repair_asset_metadata`

---

## 14. 接口与数据契约建议

## 14.1 Context Envelope

建议每次工具执行都在服务端拥有统一上下文对象：

```ts
type AssistantContext = {
  requestId: string;
  userId: string;
  brandId?: string;
  systemRole?: string;
  brandRole?: string;
  scopes: string[];
  dataView: "SUMMARY" | "DETAIL" | "MASKED_DETAIL" | "RESTRICTED";
  channel: "WEB" | "OPENCLAW" | "MESSAGE";
  clientId: string;
  deviceId?: string;
};
```

这个对象不由模型自由构造，而由服务端会话解析。

## 14.2 Tool Result Envelope

建议所有工具统一返回：

```ts
type ToolResult<T> = {
  success: boolean;
  requestId: string;
  brandId?: string;
  actionCode: string;
  riskLevel: "L1" | "L2" | "L3" | "L4";
  requiresConfirmation?: boolean;
  data?: T;
  task?: {
    taskId: string;
    taskType: string;
    status: string;
    stage?: string;
  };
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
};
```

## 14.3 错误码建议

至少定义：

- `AUTH_REQUIRED`
- `BRAND_CONTEXT_REQUIRED`
- `BRAND_ACCESS_DENIED`
- `ACTION_FORBIDDEN`
- `CONFIRMATION_REQUIRED`
- `DATA_VIEW_RESTRICTED`
- `TASK_ALREADY_RUNNING`
- `TOOL_RATE_LIMITED`
- `RUNTIME_UNAVAILABLE`
- `DEPENDENCY_FAILED`

---

## 15. 与知识库运行时的接法建议

## 15.1 原则

OpenClaw 不单独造“机器人知识层”，而是复用现有知识绑定运行时。

## 15.2 接法

### 只读问答场景

OpenClaw 可以：

- 直接读取品牌档案、任务、资产等结构化数据
- 需要补充背景时，再调用知识检索工具

### 生成场景

OpenClaw 触发的生成动作：

- 报告
- 规划
- 内容创作
- 配图
- 设计

全部沿用现有：

- 模块 -> 能力包 -> 技能

的知识继承解析。

### 日志场景

OpenClaw 的知识命中情况，应写入统一调用记录，和当前 `REPORTS / WORKS` 运行时同口径。

---

## 16. 与后续重构路线的兼容方案

这是保证长期可维护的关键。

## 16.1 前端拆壳不影响 OpenClaw

因为 OpenClaw 不接页面组件，所以：

- `xiaohongshu/page.tsx` 继续拆
- `brand-growth/workspace.tsx` 继续拆
- hooks 继续下沉
- feature 继续拆分

都不影响 MCP 工具协议。

## 16.2 后端 service 拆分不影响 OpenClaw

因为 OpenClaw 通过领域适配层或稳定聚合接口接入，所以：

- `works.service.ts` 拆成 facade / gateway / asset service
- `reports.service.ts` 拆分
- 第三方适配下沉

都不影响外部工具定义。

## 16.3 新工作台接入成本可控

后续如果新增：

- 新平台工作台
- 新类型作品
- 新类设计任务
- 新知识接入对象

只要注册：

- 新模块
- 新能力包
- 新 action code
- 新工具映射

即可被 OpenClaw 继承使用。

## 16.4 文档同步纳入交付流程

由于当前系统本来就要求：

- 代码变更同步文档
- 结构变化同步站点地图
- 知识运行时变化同步说明

建议把 OpenClaw 相关更新也纳入这一规则：

- 新增工具时更新工具注册表文档
- 新增动作时更新权限矩阵
- 新增知识运行时入口时更新接入对象说明
- 新增前端授权入口时更新站点地图

---

## 17. 开发实施阶段

## 17.1 阶段 0：现状对齐与底座补齐

目标：

- 不急着做聊天入口，先把接入底座定义清楚

交付：

- Action Code 清单
- Tool Registry 清单
- 品牌权限矩阵
- Data View 策略表
- OpenClaw 授权时序图

## 17.2 阶段 1：只读 MVP

目标：

- 跑通授权
- 跑通品牌切换
- 跑通只读问答
- 跑通品牌资料、任务、知识库、技能中心只读能力

交付：

- 授权交换接口
- 基础 MCP 工具
- 首版 Skill
- 基础审计

## 17.3 阶段 2：正式 MCP 主执行层

目标：

- 不再直接拼散式 API 调用
- 工具全部纳入统一协议和审计

交付：

- Tool Registry
- 统一 Tool Result Envelope
- 统一风险等级
- 统一错误码

## 17.4 阶段 3：低风险写操作

目标：

- 在权限内执行常见动作

交付：

- 新增知识库
- 上传资料
- 触发报告生成
- 触发内容生成
- 修改低风险偏好项

## 17.5 阶段 4：高风险动作与审批

目标：

- 开放品牌级配置写入和敏感操作

交付：

- 重置品牌技能基线
- 高风险导出审批
- 批量操作确认流
- 审计检索与告警

## 17.6 阶段 5：后台受限 CLI 接入

目标：

- 只给内部后台能力使用

交付：

- 白名单作业执行器
- CLI job registry
- 内部诊断和修复作业

---

## 18. 建议的开发清单

## 18.1 后端

- 新增 `AssistantModule`
- 新增授权交换接口
- 新增 MCP 工具注册与执行层
- 新增 Tool Registry 存储或配置源
- 新增动作码与权限映射
- 新增审计日志模型
- 新增 Data View 裁剪层
- 新增 OpenClaw 会话管理

## 18.2 前端

- 网站内“授权 OpenClaw”入口
- 当前品牌与当前权限能力展示
- 风险动作确认 UI
- 审计与授权状态页
- 管理员撤权页

## 18.3 文档

- OpenClaw 工具清单
- 权限矩阵
- 审计字段说明
- 时序图
- 测试用例库

---

## 19. 测试与验收方案

## 19.1 功能验收

- 能列出用户品牌
- 能切换品牌
- 能在指定品牌读取资料
- 能读取任务状态
- 能读取技能中心与知识库状态
- 能触发低风险生成任务

## 19.2 权限验收

- 无品牌上下文时不能读取品牌数据
- 非品牌成员不能访问品牌工具
- 无 edit 权限不能执行写操作
- 无管理权限不能执行基线重置

## 19.3 安全验收

- 不返回敏感密钥
- 不串品牌数据
- 不可通过 prompt injection 越权
- CLI 白名单以外不可执行

## 19.4 演进验收

在以下变化后，OpenClaw 不需要大改或只需最小变更：

- 页面拆壳
- 工作台新增子板块
- Provider 调整
- 知识绑定扩展
- 技能中心结构调整

---

## 20. 最终建议

基于当前系统文档和实际演进方向，最终建议如下：

## 20.1 接入方式

- 正式方案采用 `Skill + MCP + 受限 CLI`
- 不采用“只靠 Skill”
- 不采用“直接 CLI”
- 不采用“直接连数据库”

## 20.2 权限方式

- 复用现有品牌成员与板块权限
- 增加 Action Code、Data View、风险等级
- 不重造第二套角色模型

## 20.3 知识方式

- 复用现有知识绑定运行时
- 不另造一套机器人知识层
- 保持模块 -> 能力包 -> 技能 的继承规则一致

## 20.4 任务方式

- 所有长耗时动作进入正式 Task
- OpenClaw 只做触发、状态解释、结果回读

## 20.5 演进方式

- 对接稳定能力层，不对接当前页面结构
- 通过 action code、tool registry、versioned contract 适应未来重构

---

## 21. 一句话结论

> 对当前 AI 全域运营系统，OpenClaw 的详细开发方案应该建立在“品牌上下文、正式权限、统一技能中心、知识绑定运行时、正式任务体系、持续重构可适配”六个基线之上；真正长期可行的落地方式，是以 `MCP` 作为稳定能力层，把 OpenClaw 接到系统的领域能力与治理能力上，而不是接到页面实现细节上。
