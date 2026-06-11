# OpenClaw 接口与权限落地规格 v1

## 1. 文档定位

本文件是 `05-OpenClaw详细开发方案_基于现有系统文档.md` 的落地规格版，目标是把方向方案进一步收口为开发可直接拆任务、拆接口、拆权限校验和拆审计表的执行规格。

本文件重点定义：

1. `Action Code` 体系
2. `MCP Tool Registry` 结构与首批工具清单
3. 角色权限矩阵
4. Data View 与字段分级策略
5. OpenClaw 授权与会话时序
6. 审计日志与批准流数据结构
7. REST / MCP 契约建议

一句话结论：

> OpenClaw 不应直接绑定页面或零散接口，而应绑定一套版本化、可审计、可授权、可扩展的 `Action Code + MCP Tool Registry + Data View` 体系。

---

## 2. 适用范围

本规格面向以下范围：

- 网站内 OpenClaw 授权入口
- OpenClaw 外部客户端
- 后续消息渠道接入
- MCP 主执行层
- 后端领域适配层
- 审计与权限治理层

不直接覆盖：

- 页面原型
- 具体数据库迁移 SQL
- 具体前端 UI 样式细节

---

## 3. 术语约定

## 3.1 Action Code

动作编码，是对“系统能力”的统一抽象标识。

示例：

- `brand.profile.read`
- `task.list`
- `knowledge.file.upload`
- `skill.override.update`
- `report.brand-growth.generate`

## 3.2 MCP Tool

MCP 工具，是可被模型调用的结构化能力入口。每个工具应绑定一个主 Action Code，并声明：

- 参数 Schema
- 返回 Schema
- 风险等级
- 最小权限
- 是否需要品牌上下文
- 是否进入 Task

## 3.3 Scope

Scope 是动作级授权表达。

示例：

- `brand.profile.read`
- `task.retry`
- `knowledge.manage`
- `skill.baseline.reset`

## 3.4 Data View

Data View 是“同一条数据对不同角色返回什么形态”的策略层。

建议值：

- `SUMMARY`
- `DETAIL`
- `MASKED_DETAIL`
- `EXPORTABLE_DETAIL`
- `RESTRICTED`

## 3.5 Risk Level

动作风险级别。

建议值：

- `L1`
- `L2`
- `L3`
- `L4`

---

## 4. Action Code 设计原则

## 4.1 命名原则

统一格式：

`<domain>.<resource>.<verb>`

示例：

- `brand.profile.read`
- `brand.member.read`
- `task.detail.read`
- `task.retry`
- `knowledge.base.create`
- `report.brand-growth.generate`

## 4.2 设计原则

1. 不按页面命名
2. 不按组件命名
3. 不按当前 service 文件命名
4. 不按某一次实现细节命名
5. 优先按业务动作命名
6. 一个 Action Code 只表达一个主要业务动作

## 4.3 版本策略

Action Code 本身尽量稳定不带版本。

版本变化通过：

- 工具版本
- 返回契约版本
- Registry 版本

来承载，而不是随意重命名动作码。

---

## 5. Action Code 清单 v1

## 5.1 会话与上下文

| Action Code | 说明 | 风险 | 品牌上下文 |
| --- | --- | --- | --- |
| `identity.read` | 读取当前身份、角色、授权状态 | L1 | 否 |
| `brand.list` | 读取我可访问的品牌列表 | L1 | 否 |
| `brand.current.read` | 读取当前品牌上下文 | L1 | 否 |
| `brand.switch` | 切换当前品牌上下文 | L2 | 否 |
| `capability.list` | 读取当前用户可用能力清单 | L1 | 否 |

## 5.2 品牌信息与资料

| Action Code | 说明 | 风险 | 品牌上下文 |
| --- | --- | --- | --- |
| `brand.summary.read` | 读取品牌摘要 | L1 | 是 |
| `brand.archive.read` | 读取品牌档案全貌 | L1 | 是 |
| `brand.product.list` | 读取产品资料列表 | L1 | 是 |
| `brand.survey.list` | 读取品牌调研资料 | L1 | 是 |
| `brand.account.platform.list` | 读取品牌平台账号 | L1 | 是 |
| `brand.account.competitor.list` | 读取竞品账号 | L1 | 是 |
| `brand.report.industry.list` | 读取行业报告 | L1 | 是 |
| `brand.member.list` | 读取品牌成员 | L1 | 是 |

## 5.3 任务与结果

| Action Code | 说明 | 风险 | 品牌上下文 |
| --- | --- | --- | --- |
| `task.list` | 读取品牌任务列表 | L1 | 是 |
| `task.detail.read` | 读取任务详情 | L1 | 是 |
| `task.running.list` | 读取运行中任务 | L1 | 是 |
| `task.cancel` | 取消任务 | L2 | 是 |
| `task.retry` | 重试任务 | L3 | 是 |
| `task.result.read` | 读取任务产物跳转信息 | L1 | 是 |

## 5.4 知识库

| Action Code | 说明 | 风险 | 品牌上下文 |
| --- | --- | --- | --- |
| `knowledge.base.list` | 读取知识库列表 | L1 | 是 |
| `knowledge.base.detail.read` | 读取知识库详情 | L1 | 是 |
| `knowledge.base.create` | 新建知识库 | L2 | 是 |
| `knowledge.base.update` | 更新知识库设置 | L2 | 是 |
| `knowledge.base.delete` | 删除知识库 | L3 | 是 |
| `knowledge.file.list` | 读取知识库资料列表 | L1 | 是 |
| `knowledge.file.upload` | 上传知识资料 | L2 | 是 |
| `knowledge.file.delete` | 删除知识资料 | L3 | 是 |
| `knowledge.binding.read` | 读取知识绑定关系 | L1 | 是 |
| `knowledge.invocation.list` | 读取知识调用记录 | L1 | 是 |

## 5.5 技能中心

| Action Code | 说明 | 风险 | 品牌上下文 |
| --- | --- | --- | --- |
| `skill.package.list` | 读取能力包列表 | L1 | 否或是 |
| `skill.package.detail.read` | 读取能力包详情 | L1 | 否或是 |
| `skill.platform.read` | 读取平台技能基线 | L1 | 否 |
| `skill.brand.override.read` | 读取品牌覆盖 | L1 | 是 |
| `skill.brand.override.update` | 更新品牌覆盖 | L3 | 是 |
| `skill.baseline.reset` | 重置到平台基线 | L3 | 是 |

## 5.6 品牌增长与工作台生成

| Action Code | 说明 | 风险 | 品牌上下文 |
| --- | --- | --- | --- |
| `report.brand-growth.generate` | 生成品牌增长报告 | L2 | 是 |
| `report.visual.generate` | 生成可视化报告 | L2 | 是 |
| `plan.half-year.generate` | 生成半年营销规划 | L2 | 是 |
| `calendar.xhs.generate` | 生成营销日历 | L2 | 是 |
| `xhs.original.generate` | 生成小红书原创图文 | L2 | 是 |
| `xhs.rewrite.generate` | 生成小红书二创图文 | L2 | 是 |
| `xhs.video.generate` | 生成小红书视频笔记 | L2 | 是 |
| `douyin.plan.generate` | 生成抖音营销策划方案 | L2 | 是 |
| `douyin.topic.generate` | 生成抖音热点选题 | L2 | 是 |
| `wechat.article.generate` | 生成公众号文章 | L2 | 是 |
| `wechat.image.generate` | 生成公众号配图 | L2 | 是 |
| `design.task.create` | 创建设计工作台任务 | L2 | 是 |

## 5.7 导出与治理

| Action Code | 说明 | 风险 | 品牌上下文 |
| --- | --- | --- | --- |
| `export.summary` | 导出摘要数据 | L2 | 是 |
| `export.full` | 导出完整数据 | L4 | 是 |
| `assistant.grant.manage` | 管理 OpenClaw 授权 | L4 | 否或是 |
| `assistant.audit.read` | 读取审计日志 | L3 | 否或是 |
| `internal.cli.run` | 触发后台 CLI 作业 | L4 | 否 |

---

## 6. MCP Tool Registry 结构

建议统一数据结构如下：

```ts
type AssistantToolRegistryItem = {
  toolName: string;
  version: "v1";
  actionCode: string;
  domain: string;
  moduleKey?: string;
  skillPackageKey?: string;
  skillKey?: string;
  description: string;
  requiresBrandContext: boolean;
  requiresConfirmation: boolean;
  writesData: boolean;
  createsTask: boolean;
  knowledgeAware: boolean;
  riskLevel: "L1" | "L2" | "L3" | "L4";
  minScopes: string[];
  allowedBrandRoles?: string[];
  inputSchemaRef: string;
  outputSchemaRef: string;
  resultViewPolicy: "SUMMARY" | "DETAIL" | "MASKED_DETAIL" | "RESTRICTED";
  idempotencyMode?: "NONE" | "REQUEST_KEY" | "TASK_KEY";
  auditMode: "NONE" | "BASIC" | "FULL";
  enabled: boolean;
};
```

---

## 7. 首批 MCP 工具清单 v1

## 7.1 会话与上下文类

### `assistant.identity.get.v1`

- 主 Action Code：`identity.read`
- 用途：读取当前登录身份、角色、当前品牌、授权来源
- 风险：`L1`
- 品牌上下文：否
- 审计：基础审计

### `assistant.brands.list.v1`

- 主 Action Code：`brand.list`
- 用途：读取我可访问品牌列表
- 风险：`L1`
- 品牌上下文：否

### `assistant.brand.current.get.v1`

- 主 Action Code：`brand.current.read`
- 用途：读取当前品牌上下文
- 风险：`L1`

### `assistant.brand.switch.v1`

- 主 Action Code：`brand.switch`
- 用途：切换当前品牌
- 风险：`L2`
- 需确认：否
- 幂等：按目标 `brandId`

## 7.2 品牌信息类

### `assistant.brand.summary.get.v1`

- 主 Action Code：`brand.summary.read`
- 用途：读取品牌摘要
- 风险：`L1`
- Data View：`SUMMARY`

### `assistant.brand.archive.get.v1`

- 主 Action Code：`brand.archive.read`
- 用途：读取品牌档案
- 风险：`L1`
- Data View：按角色返回 `SUMMARY / DETAIL / MASKED_DETAIL`

### `assistant.brand.products.list.v1`

- 主 Action Code：`brand.product.list`
- 用途：读取产品资料列表
- 风险：`L1`

### `assistant.brand.members.list.v1`

- 主 Action Code：`brand.member.list`
- 用途：读取品牌成员
- 风险：`L1`
- Data View：普通员工默认 `MASKED_DETAIL`

## 7.3 任务类

### `assistant.tasks.list.v1`

- 主 Action Code：`task.list`
- 用途：读取品牌任务列表
- 风险：`L1`
- 支持：
  - 状态筛选
  - 任务类型筛选
  - 时间范围
  - 是否只看本人

### `assistant.task.detail.get.v1`

- 主 Action Code：`task.detail.read`
- 用途：读取任务详情
- 风险：`L1`

### `assistant.task.cancel.v1`

- 主 Action Code：`task.cancel`
- 用途：取消任务
- 风险：`L2`
- 需确认：是

### `assistant.task.retry.v1`

- 主 Action Code：`task.retry`
- 用途：重试任务
- 风险：`L3`
- 需确认：是
- 进入审计：完整

## 7.4 知识库类

### `assistant.knowledge.bases.list.v1`

- 主 Action Code：`knowledge.base.list`
- 用途：读取企业知识库列表
- 风险：`L1`

### `assistant.knowledge.base.create.v1`

- 主 Action Code：`knowledge.base.create`
- 用途：新建知识库
- 风险：`L2`
- 需确认：否
- 输入只保留：
  - `name`
  - `description`

### `assistant.knowledge.files.upload.v1`

- 主 Action Code：`knowledge.file.upload`
- 用途：向指定知识库上传资料
- 风险：`L2`
- 需确认：是
- 进入 Task：是

### `assistant.knowledge.invocations.list.v1`

- 主 Action Code：`knowledge.invocation.list`
- 用途：读取知识调用记录
- 风险：`L1`

## 7.5 技能中心类

### `assistant.skill.packages.list.v1`

- 主 Action Code：`skill.package.list`
- 用途：读取能力包列表
- 风险：`L1`

### `assistant.skill.package.detail.get.v1`

- 主 Action Code：`skill.package.detail.read`
- 用途：读取能力包详情
- 风险：`L1`

### `assistant.skill.override.get.v1`

- 主 Action Code：`skill.brand.override.read`
- 用途：读取品牌技能覆盖
- 风险：`L1`

### `assistant.skill.override.update.v1`

- 主 Action Code：`skill.brand.override.update`
- 用途：更新品牌技能覆盖
- 风险：`L3`
- 需确认：是
- 审计：完整

### `assistant.skill.baseline.reset.v1`

- 主 Action Code：`skill.baseline.reset`
- 用途：恢复品牌技能平台基线
- 风险：`L3`
- 需确认：是
- 审计：完整

## 7.6 生成类

### `assistant.report.brand-growth.generate.v1`

- 主 Action Code：`report.brand-growth.generate`
- 用途：触发品牌增长报告生成
- 风险：`L2`
- 进入 Task：是
- knowledgeAware：是

### `assistant.plan.half-year.generate.v1`

- 主 Action Code：`plan.half-year.generate`
- 用途：触发半年营销规划
- 风险：`L2`
- 进入 Task：是

### `assistant.xhs.original.generate.v1`

- 主 Action Code：`xhs.original.generate`
- 用途：生成小红书原创图文
- 风险：`L2`
- 进入 Task：是

### `assistant.wechat.article.generate.v1`

- 主 Action Code：`wechat.article.generate`
- 用途：生成公众号文章
- 风险：`L2`
- 进入 Task：是

### `assistant.design.task.create.v1`

- 主 Action Code：`design.task.create`
- 用途：创建设计工作台任务
- 风险：`L2`
- 进入 Task：是

## 7.7 内部受限工具

### `assistant.internal.cli.run.v1`

- 主 Action Code：`internal.cli.run`
- 用途：触发后台受限 CLI 作业
- 风险：`L4`
- 仅后台内部可见
- 审计：完整
- 审批：必须

---

## 8. 角色权限矩阵 v1

## 8.1 角色说明

本矩阵分两层：

### 平台层

- `SUPER_ADMIN`
- `ADMIN_OPERATOR`
- `SUPPORT_OPERATOR`

### 品牌层

- `ADMIN`
- `STAFF`
- `TALENT`

OpenClaw 前台主要按品牌层权限工作，平台层角色只在后台治理类工具生效。

## 8.2 前台品牌层矩阵

| 能力分类 | ADMIN | STAFF | TALENT |
| --- | --- | --- | --- |
| 读取品牌摘要 | 允许 | 允许 | 允许 |
| 读取品牌档案详情 | 允许 | 允许 | 视模板 |
| 读取品牌成员 | 允许 | 脱敏读取 | 脱敏读取 |
| 读取任务列表 | 全品牌 | 默认本人，可授权品牌内 | 默认本人 |
| 查看任务详情 | 允许 | 允许 | 本人或授权范围 |
| 取消本人任务 | 允许 | 允许 | 允许 |
| 重试任务 | 允许 | 视模板 | 否 |
| 读取知识库列表 | 允许 | 允许 | 视模板 |
| 新建知识库 | 允许 | 视模板 | 否 |
| 上传知识资料 | 允许 | 视模板 | 否 |
| 删除知识资料 | 允许 | 视模板 | 否 |
| 读取技能覆盖 | 允许 | 允许 | 只读可见范围 |
| 更新品牌技能覆盖 | 允许 | 否 | 否 |
| 重置品牌技能基线 | 允许 | 否 | 否 |
| 触发品牌增长报告 | 允许 | 视模板 | 否 |
| 触发内容生成 | 允许 | 视模板 | 视模板 |
| 导出摘要数据 | 允许 | 视模板 | 否 |
| 导出完整数据 | 允许 | 否 | 否 |
| 管理 OpenClaw 授权 | 允许 | 否 | 否 |

## 8.3 平台后台层矩阵

| 能力分类 | SUPER_ADMIN | ADMIN_OPERATOR | SUPPORT_OPERATOR |
| --- | --- | --- | --- |
| 读取全平台审计 | 允许 | 允许 | 只读范围受限 |
| 管理 Tool Registry | 允许 | 允许 | 否 |
| 管理平台技能基线 | 允许 | 允许 | 否 |
| 查看品牌级授权状态 | 允许 | 允许 | 允许 |
| 撤销品牌授权 | 允许 | 允许 | 否 |
| 触发内部 CLI 作业 | 允许 | 审批后允许 | 否 |

---

## 9. Data View 与字段分级策略

## 9.1 字段敏感级别

建议定义四级：

- `PUBLIC`
- `INTERNAL`
- `SENSITIVE`
- `RESTRICTED`

## 9.2 Data View 说明

| Data View | 含义 |
| --- | --- |
| `SUMMARY` | 只返回摘要和关键业务字段 |
| `DETAIL` | 返回可见明细 |
| `MASKED_DETAIL` | 返回明细但对敏感字段脱敏 |
| `EXPORTABLE_DETAIL` | 返回完整导出明细 |
| `RESTRICTED` | 不返回内容，仅返回权限说明 |

## 9.3 关键实体字段分级建议

### Brand

| 字段 | 级别 | 默认对话返回 |
| --- | --- | --- |
| `brandName` | PUBLIC | 是 |
| `industry` | PUBLIC | 是 |
| `description` | INTERNAL | 是 |
| `contactPhone` | SENSITIVE | 脱敏 |
| `billingInfo` | RESTRICTED | 否 |

### BrandMember

| 字段 | 级别 | 默认对话返回 |
| --- | --- | --- |
| `displayName` | INTERNAL | 是 |
| `brandRole` | INTERNAL | 是 |
| `email` | SENSITIVE | 脱敏 |
| `phone` | SENSITIVE | 脱敏 |

### Product

| 字段 | 级别 | 默认对话返回 |
| --- | --- | --- |
| `productName` | INTERNAL | 是 |
| `positioning` | INTERNAL | 是 |
| `price` | INTERNAL | 是 |
| `supplierCost` | SENSITIVE | 否或脱敏 |

### Task

| 字段 | 级别 | 默认对话返回 |
| --- | --- | --- |
| `taskTitle` | INTERNAL | 是 |
| `taskType` | INTERNAL | 是 |
| `status` | INTERNAL | 是 |
| `stage` | INTERNAL | 是 |
| `errorDetail` | SENSITIVE | 摘要 |
| `rawOutputJson` | RESTRICTED | 否 |

### KnowledgeBase

| 字段 | 级别 | 默认对话返回 |
| --- | --- | --- |
| `name` | INTERNAL | 是 |
| `description` | INTERNAL | 是 |
| `syncStatus` | INTERNAL | 是 |
| `retrievalConfig` | INTERNAL | 角色决定 |
| `bindingTargetInternalId` | RESTRICTED | 否 |

### Skill Override

| 字段 | 级别 | 默认对话返回 |
| --- | --- | --- |
| `displayName` | INTERNAL | 是 |
| `promptSummary` | INTERNAL | 是 |
| `fullPromptContent` | SENSITIVE | 角色决定 |
| `providerConfig` | SENSITIVE | 摘要 |
| `apiKey` | RESTRICTED | 否 |

## 9.4 默认策略

- 普通对话默认返回 `SUMMARY`
- 品牌管理员可在部分工具上获得 `DETAIL`
- 对外部渠道默认比网站内更保守
- `EXPORTABLE_DETAIL` 永不在普通聊天中直接返回

---

## 10. OpenClaw 授权与会话时序

## 10.1 推荐流程

### 第一步：网站内发起授权

1. 用户在网站内点击“授权 OpenClaw”
2. 网站要求确认：
   - 当前品牌
   - 客户端名称
   - 可用能力范围
   - 有效期
3. 网站生成一次性 `authorizationCode`

### 第二步：OpenClaw 交换会话

1. OpenClaw 提交：
   - `authorizationCode`
   - `clientId`
   - `deviceId`
2. 服务端验证后返回：
   - `accessToken`
   - `refreshToken`
   - `grantedBrandIds`
   - `defaultBrandId`
   - `grantedScopes`

### 第三步：工具调用

1. OpenClaw 调用 MCP 工具
2. 服务端从 token 解析：
   - `userId`
   - `brandId`
   - `scopes`
   - `dataView`
3. 执行工具并记录审计

### 第四步：续期与撤权

- `refreshToken` 用于续期
- 用户或管理员可在网站内撤销授权
- 撤权后 token 立即失效

## 10.2 推荐接口

### `POST /api/assistant/auth/authorize`

用途：

- 网站内发起授权申请

### `POST /api/assistant/auth/exchange`

用途：

- 用授权码换取 OpenClaw 会话

### `POST /api/assistant/auth/refresh`

用途：

- 刷新 token

### `POST /api/assistant/auth/revoke`

用途：

- 撤销授权

### `GET /api/assistant/session`

用途：

- 查询当前助手会话状态

---

## 11. 审计与批准流数据结构

## 11.1 建议新增表

### `AssistantGrant`

记录一次授权关系。

建议字段：

- `id`
- `userId`
- `clientId`
- `grantScopeJson`
- `grantedBrandIdsJson`
- `defaultBrandId`
- `status`
- `expiresAt`
- `createdAt`
- `revokedAt`

### `AssistantSession`

记录当前助手会话。

建议字段：

- `id`
- `grantId`
- `accessTokenId`
- `refreshTokenId`
- `deviceId`
- `lastBrandId`
- `lastSeenAt`
- `expiresAt`
- `revokedAt`

### `AssistantToolExecutionLog`

记录每次工具调用。

建议字段：

- `id`
- `requestId`
- `sessionId`
- `userId`
- `brandId`
- `toolName`
- `toolVersion`
- `actionCode`
- `riskLevel`
- `inputSummaryJson`
- `resultSummaryJson`
- `status`
- `errorCode`
- `latencyMs`
- `taskId`
- `createdAt`

### `AssistantApprovalRequest`

记录高风险动作确认与审批。

建议字段：

- `id`
- `requestId`
- `actionCode`
- `riskLevel`
- `userId`
- `brandId`
- `toolName`
- `approvalMode`
- `approvalStatus`
- `payloadSummaryJson`
- `approvedByUserId`
- `approvedAt`
- `rejectedAt`
- `createdAt`

## 11.2 审计最少字段

每条工具调用至少记录：

- `requestId`
- `userId`
- `brandId`
- `toolName`
- `actionCode`
- `riskLevel`
- `status`
- `taskId`
- `createdAt`

## 11.3 审计检索维度

建议支持：

- 按用户
- 按品牌
- 按工具
- 按动作码
- 按风险等级
- 按时间范围
- 按状态

---

## 12. REST 契约建议

## 12.1 授权码交换请求

```json
{
  "authorizationCode": "auth_xxx",
  "clientId": "openclaw-web",
  "deviceId": "device_xxx"
}
```

## 12.2 授权码交换响应

```json
{
  "success": true,
  "accessToken": "atk_xxx",
  "refreshToken": "rtk_xxx",
  "session": {
    "sessionId": "asst_sess_xxx",
    "defaultBrandId": "brand_xxx",
    "grantedBrandIds": ["brand_xxx"],
    "grantedScopes": [
      "brand.summary.read",
      "task.list",
      "knowledge.base.list"
    ],
    "expiresAt": "2026-06-11T12:00:00.000Z"
  }
}
```

## 12.3 统一工具响应

```json
{
  "success": true,
  "requestId": "req_xxx",
  "brandId": "brand_xxx",
  "actionCode": "task.list",
  "riskLevel": "L1",
  "data": {
    "items": []
  }
}
```

## 12.4 带任务的工具响应

```json
{
  "success": true,
  "requestId": "req_xxx",
  "brandId": "brand_xxx",
  "actionCode": "report.brand-growth.generate",
  "riskLevel": "L2",
  "task": {
    "taskId": "tsk_xxx",
    "taskType": "BRAND_GROWTH_REPORT",
    "status": "QUEUED",
    "stage": "QUEUED"
  },
  "data": {
    "accepted": true
  }
}
```

## 12.5 需确认响应

```json
{
  "success": false,
  "requestId": "req_xxx",
  "brandId": "brand_xxx",
  "actionCode": "skill.baseline.reset",
  "riskLevel": "L3",
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "message": "该操作会覆盖当前品牌的技能覆盖配置，需要确认后继续。"
  }
}
```

---

## 13. MCP 输入输出 Schema 建议

## 13.1 `assistant.brand.switch.v1`

### Input

```json
{
  "brandId": "brand_xxx"
}
```

### Output

```json
{
  "success": true,
  "requestId": "req_xxx",
  "actionCode": "brand.switch",
  "riskLevel": "L2",
  "data": {
    "currentBrand": {
      "id": "brand_xxx",
      "name": "示例品牌"
    }
  }
}
```

## 13.2 `assistant.knowledge.base.create.v1`

### Input

```json
{
  "name": "品牌知识库",
  "description": "用于品牌资料与选题创作"
}
```

### Output

```json
{
  "success": true,
  "requestId": "req_xxx",
  "actionCode": "knowledge.base.create",
  "riskLevel": "L2",
  "data": {
    "knowledgeBase": {
      "id": "kb_xxx",
      "name": "品牌知识库",
      "syncStatus": "PENDING"
    }
  }
}
```

## 13.3 `assistant.report.brand-growth.generate.v1`

### Input

```json
{
  "includeKnowledge": true
}
```

### Output

```json
{
  "success": true,
  "requestId": "req_xxx",
  "actionCode": "report.brand-growth.generate",
  "riskLevel": "L2",
  "task": {
    "taskId": "tsk_xxx",
    "taskType": "BRAND_GROWTH_REPORT",
    "status": "QUEUED",
    "stage": "QUEUED"
  }
}
```

---

## 14. 后端实现建议

## 14.1 模块建议

建议新增：

- `AssistantModule`
- `AssistantAuthController`
- `AssistantToolsController`
- `AssistantAuditController`

建议新增服务：

- `AssistantGrantService`
- `AssistantSessionService`
- `AssistantRegistryService`
- `AssistantExecutionService`
- `AssistantApprovalService`
- `AssistantAuditService`
- `AssistantDataViewService`

## 14.2 分层建议

OpenClaw 相关后端也遵守现有工程规范：

- controller 做薄
- 复杂逻辑下沉 service
- 对第三方客户端协议统一 adapter 化
- 不在工具层散写权限逻辑

## 14.3 与现有模块对接方式

- 身份与品牌：复用 auth / brands
- 知识库：复用 knowledge bases / bindings / invocation logs
- 技能中心：复用 skill center / brand override
- 任务中心：复用 task center
- 工作台生成：复用 reports / works / collectors 统一入口

---

## 15. 前端实现建议

## 15.1 新增页面

建议新增：

- `/personal-center/openclaw`
- `/brand/openclaw-access`
- `/admin/openclaw`

## 15.2 页面功能

### 前台授权页

- 查看当前授权状态
- 发起授权
- 撤销授权
- 查看当前品牌可开放能力

### 品牌管理员页

- 管理品牌内 OpenClaw 授权
- 管理可用能力范围
- 查看近期高风险调用

### 后台治理页

- 查看 Tool Registry
- 查看审计日志
- 查看失败调用分布
- 管理审批请求

---

## 16. 测试用例建议

## 16.1 权限类

- 无品牌上下文读取品牌资料应失败
- 非品牌成员访问品牌工具应失败
- STAFF 调用 `skill.baseline.reset` 应失败
- TALENT 导出完整数据应失败

## 16.2 数据视图类

- 普通员工读取成员列表时邮箱和手机号应脱敏
- 对话中读取任务详情时不应返回原始输出 JSON
- 导出完整数据时必须经过审批

## 16.3 审计类

- 每次工具调用都应生成一条执行日志
- L3/L4 动作应产生审批记录
- 任务触发类工具应正确回写 `taskId`

## 16.4 安全类

- Prompt Injection 文本不能改变工具权限
- 伪造品牌 ID 不应读取他人品牌数据
- CLI 非白名单作业应被拒绝

---

## 17. 第一阶段必须交付的最小清单

P0：

- Action Code 清单
- Tool Registry v1
- AssistantGrant / AssistantSession / AssistantToolExecutionLog 表
- 授权交换接口
- 品牌切换工具
- 品牌摘要与任务只读工具
- 知识库只读工具
- 技能中心只读工具

P1：

- 低风险生成类工具
- 知识库新建与上传
- Data View 裁剪层
- 审计检索页面

P2：

- 审批流
- 高风险治理动作
- 后台受限 CLI 作业

---

## 18. 一句话结论

> OpenClaw 的真正落地，不在于先做出多少聊天能力，而在于先把“动作编码、工具注册、权限矩阵、数据视图、授权交换、审计日志”这六块底座定义清楚；底座一旦稳定，后续新增工作台、技能、知识绑定和页面重构都可以低成本接入。
