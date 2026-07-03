# OpenClaw 第一阶段 MCP 工具清单

## 1. 文档定位

这份文档只讨论我们系统侧第一阶段需要提供给 OpenClaw 的 `MCP` 工具，不讨论：

- OpenClaw 自己的模型配置
- OpenClaw 的安装与 onboarding
- OpenClaw 渠道侧部署细节

这份文档的目标只有一个：

> 把我们网站现有能力和历史数据，整理成一组可以被 OpenClaw 安全调用的、标准化的 MCP 工具清单。

---

## 2. 设计原则

## 2.1 先工具化高频任务，不先工具化全部系统能力

第一阶段工具只服务于已确定的高频任务，不追求“一次性全接完”。

## 2.2 只暴露业务语义，不暴露内部实现细节

MCP 工具名称和参数要围绕业务语义设计，不把内部字段直接暴露给 OpenClaw 用户。

例如：

- 应使用 `get_recent_tasks_summary`
- 不应使用 `query_task_table_raw`

## 2.3 不直连数据库

MCP 工具必须通过网站后端服务层或受控查询层读取数据，不允许 OpenClaw 直连数据库。

## 2.4 所有工具都带身份和品牌上下文

OpenClaw 调用任何工具时，服务端都必须基于绑定关系解析：

- `userId`
- `brandId`
- `role`
- `scopes`

不能只信客户端传值。

## 2.5 返回结果优先摘要，不优先原始数据

第一阶段工具返回应优先面向对话消费：

- 结论
- 摘要
- 关键字段
- 深链接

而不是大段原始表格或内部 JSON。

---

## 3. 第一阶段工具分组

建议第一阶段按 6 组工具来做。

## 3.1 品牌上下文工具

负责识别：

- 当前用户是谁
- 当前默认品牌是谁
- 用户在该品牌内有哪些权限

## 3.2 任务与报告工具

负责：

- 看最近任务
- 总结失败原因
- 触发品牌增长报告
- 触发半年营销规划

## 3.3 知识库工具

负责：

- 看知识库
- 看最近新增资料
- 新建知识库
- 上传资料

## 3.4 技能配置工具

负责：

- 看当前技能配置摘要
- 看品牌覆盖状态
- 看最近配置变化

## 3.5 内容生成工具

负责：

- 触发小红书原创图文
- 触发公众号文章
- 回读生成结果摘要

## 3.6 历史分析工具

负责：

- 总结高表现内容规律
- 做时间段对比

## 3.7 当前已落地增量能力

截至 `2026-06-30`，第一阶段之外，系统里已经新增并开放了几组与 OpenClaw 高度相关的实用工具，后续 Skill 和安装验收都应按这些真实能力来描述：

- 网站功能路由：
  - `get_website_function_catalog`
  - `get_website_function_detail`
  - `route_website_function_by_intent`
  - `get_website_function_execution_plan`
- OpenClaw 专区：
  - `get_openclaw_lobster_diaries`
  - `create_openclaw_lobster_diary`
  - `delete_openclaw_lobster_diary`
- 统一素材库：
  - `get_unified_material_library_items`
  - `get_douyin_material_library_items`
  - `add_xiaohongshu_note_to_material_library`
  - `add_douyin_work_to_material_library`
  - `add_wechat_article_to_material_library`
  - `remove_xiaohongshu_note_from_material_library`
  - `remove_douyin_work_from_material_library`
- 公众号采集工作区：
  - `get_wechat_collection_workspace`
  - `sync_wechat_benchmark_articles`
  - `sync_wechat_search_articles`
  - `update_wechat_article_stats`
  - `delete_wechat_collected_article`
- 公众号工作流：
  - `manage_wechat_workflow`
  - 当前已支持：
    - 偏好读取与保存
    - 工作流创建、查询与删除
    - `set_article / set_images / set_html` 直写 Step 2-4 产物
    - `generate_article / generate_images / generate_html` 继续推进网站内生成链路
    - `rebuild_publish_config` 重新计算发布确认状态
    - `publish_workflow` 正式调用公众号 API 发布
  - 当前语义约束：
    - `set_article` 未显式传 `inputType` 时，服务端会按正文内容自动识别 `plain-text / markdown / html`
    - `set_html` 代表外部已给出完整 HTML 草稿
    - `generate_html` 代表系统基于正文 canonical、图片资产和风格规则重新渲染，并产出可直接发布到公众号正文的 HTML 片段
- 采集数据删除：
  - `delete_xhs_collected_note`
  - `delete_douyin_collected_work`

---

## 4. 工具清单

下面按第一阶段推荐清单给出工具定义草案。

## 4.1 品牌上下文工具

### `get_current_brand_context`

#### 用途

返回当前渠道用户在当前会话下的默认品牌上下文。

#### 主要输入

- `sessionId` 或渠道绑定上下文

#### 主要输出

- `userId`
- `brandId`
- `brandName`
- `role`
- `scopes`
- `isDefaultBrand`

#### 主要服务来源

- 用户绑定关系
- 品牌成员关系
- 权限解析服务

#### 备注

这是第一阶段多数工具的前置依赖。

---

### `list_accessible_brands`

#### 用途

当用户存在多个品牌权限时，返回其可访问品牌列表。

#### 主要输入

- `userId`

#### 主要输出

- 品牌列表
- 默认品牌标记
- 用户在每个品牌的角色

#### 备注

仅在默认品牌无法确定或用户主动要求切换时使用。

---

## 4.2 任务与报告工具

### `get_recent_tasks_summary`

#### 用途

返回最近任务的摘要结果。

#### 主要输入

- `brandId`
- `timeRange`，默认 `7d`
- `taskTypes`，可选

#### 主要输出

- 总任务数
- 已完成 / 进行中 / 失败数量
- 重点任务列表
- 建议摘要

#### 主要服务来源

- 任务中心
- Task 聚合服务

---

### `summarize_failed_tasks`

#### 用途

按时间范围汇总失败任务的主要原因。

#### 主要输入

- `brandId`
- `timeRange`，默认 `7d`
- `taskTypes`，可选

#### 主要输出

- 失败任务总数
- 失败原因 Top3
- 重复出现的问题
- 修复建议

#### 主要服务来源

- 任务中心
- 错误摘要归一化层

---

### `create_brand_growth_report`

#### 用途

触发品牌增长报告任务。

#### 主要输入

- `brandId`
- `timeRange`，默认值由服务端决定
- `goal`，可选

#### 主要输出

- `taskId`
- `accepted`
- 任务受理摘要
- 深链接

#### 主要服务来源

- 品牌增长报告任务链路

---

### `create_half_year_marketing_plan`

#### 用途

触发半年营销规划任务。

#### 主要输入

- `brandId`
- `focusDirection`，可选

#### 主要输出

- `taskId`
- `accepted`
- 任务受理摘要
- 深链接

#### 主要服务来源

- 半年营销规划任务链路

---

### `get_task_result_summary`

#### 用途

读取某个任务的当前状态和摘要结果。

#### 主要输入

- `brandId`
- `taskId`

#### 主要输出

- 任务状态
- 当前阶段
- 结果摘要
- 深链接

#### 主要服务来源

- 任务中心
- 结果摘要适配层

---

## 4.3 知识库工具

### `list_knowledge_bases`

#### 用途

返回当前品牌知识库列表。

#### 主要输入

- `brandId`

#### 主要输出

- 知识库列表
- 每个知识库的简介
- 同步状态
- 文件数量

#### 主要服务来源

- 企业知识库接口

---

### `list_recent_knowledge_files`

#### 用途

返回最近新增到知识库的资料。

#### 主要输入

- `brandId`
- `knowledgeBaseId`，可选
- `timeRange`，默认 `7d`

#### 主要输出

- 最近新增资料列表
- 所属知识库
- 上传时间
- 同步 / 切片状态

#### 主要服务来源

- 企业知识库文件接口
- 最近新增聚合层

---

### `create_knowledge_base`

#### 用途

创建知识库。

#### 主要输入

- `brandId`
- `name`
- `description`，可选

#### 主要输出

- 知识库创建结果
- `knowledgeBaseId`
- 当前状态

#### 主要服务来源

- 企业知识库创建接口

#### 风险说明

- 低风险写操作

---

### `upload_knowledge_files`

#### 用途

向知识库上传资料并触发切片 / 同步。

#### 主要输入

- `brandId`
- `knowledgeBaseId`
- 文件引用列表

#### 主要输出

- 上传受理结果
- 文件数量
- 同步任务状态

#### 主要服务来源

- 文件上传服务
- 企业知识库资料接口
- 切片 / 同步任务链路

#### 风险说明

- 低风险写操作
- 建议在渠道内做一次轻确认

---

## 4.4 技能配置工具

### `get_skill_config_summary`

#### 用途

返回某个技能或能力包在当前品牌下的配置摘要。

#### 主要输入

- `brandId`
- `skillKey` 或 `packageKey`

#### 主要输出

- 当前启用状态
- 品牌覆盖摘要
- 关键配置说明
- 最近是否有改动

#### 主要服务来源

- 技能中心
- 品牌覆盖服务

---

### `list_brand_skill_overrides`

#### 用途

列出品牌层面对技能的覆盖配置。

#### 主要输入

- `brandId`

#### 主要输出

- 覆盖列表
- 作用范围
- 更新时间

#### 主要服务来源

- 品牌技能覆盖接口

---

## 4.5 内容生成工具

### `create_xiaohongshu_original_note`

#### 用途

触发小红书原创图文任务。

#### 主要输入

- `calendarItemId`，可选
- `customTopicName`，可选；兼容旧写法 `topic`
- `productId`，可选
- `accountRole`，可选
- `imageCount`，可选
- `includeMarketingPlan`，可选
- `additionalInstruction`，可选；兼容旧写法 `styleHint`
- `noteTitle`，可选；直接指定原创笔记标题
- `noteContent`，可选；如果直接传入原创笔记正文，将跳过原创文案技能，直接进入原创配图提示词和图片生成链路

#### 主要输出

- `taskId`
- 任务受理结果
- 进度查询方式
- 深链接

#### 主要服务来源

- 小红书原创图文生成链路

---

### `create_wechat_article`

#### 用途

触发公众号文章生成任务。

#### 主要输入

- `brandId`
- `topic`，可选
- `styleHint`，可选

#### 主要输出

- `taskId`
- 任务受理结果
- 深链接

#### 主要服务来源

- 公众号文章生成链路

---

### `get_content_generation_summary`

#### 用途

返回内容生成类任务的摘要结果。

#### 主要输入

- `brandId`
- `taskId`

#### 主要输出

- 当前阶段
- 文案摘要
- 图片 / 文章结果摘要
- 深链接

#### 主要服务来源

- Works / Reports 结果读取层

---

## 4.6 历史分析工具

### `summarize_top_content_patterns`

#### 用途

总结高表现内容的共性规律。

#### 主要输入

- `brandId`
- `platform`
- `timeRange`

#### 主要输出

- Top 内容列表
- 共性规律
- 风格 / 选题建议

#### 主要服务来源

- 内容历史
- 表现指标聚合层

---

### `compare_period_metrics`

#### 用途

对比两段时间的任务、内容或报告变化。

#### 主要输入

- `brandId`
- `leftRange`
- `rightRange`
- `dimension`

#### 主要输出

- 上升项
- 下降项
- 差异摘要
- 下一步建议

#### 主要服务来源

- 任务历史
- 内容历史
- 报告历史
- 对比聚合层

---

## 5. 第一阶段工具与高频任务映射

| 高频任务 | 主要 MCP 工具 |
|---|---|
| 看最近任务情况 | `get_recent_tasks_summary` |
| 总结失败任务原因 | `summarize_failed_tasks` |
| 生成品牌增长报告 | `create_brand_growth_report` + `get_task_result_summary` |
| 查看知识库和最近新增资料 | `list_knowledge_bases` + `list_recent_knowledge_files` |
| 看当前技能配置摘要 | `get_skill_config_summary` + `list_brand_skill_overrides` |
| 生成半年营销规划 | `create_half_year_marketing_plan` + `get_task_result_summary` |
| 做一版小红书原创图文 | `create_xiaohongshu_original_note` + `get_content_generation_summary` |
| 生成公众号文章 | `create_wechat_article` + `get_content_generation_summary` |
| 新建知识库 | `create_knowledge_base` |
| 上传知识资料 | `upload_knowledge_files` |
| 总结高表现内容规律 | `summarize_top_content_patterns` |
| 对比两段时间变化 | `compare_period_metrics` |

---

## 6. 第一阶段不建议优先暴露的工具

以下工具不建议第一阶段优先暴露：

- 批量删除类工具
- 高风险导出类工具
- 大规模原始明细查询工具
- 跨品牌聚合写入工具
- 直接修改核心技能基线的工具

原因：

- 风险高
- 频率低
- 不利于先把顺滑体验做出来

---

## 7. 工具返回格式建议

第一阶段所有工具统一建议返回：

### 摘要字段

- `title`
- `summary`
- `highlights`
- `nextActions`

### 结构化字段

- `items`
- `counts`
- `status`
- `links`

### 安全字段

- `allowed`
- `requiresConfirmation`
- `reason`

这样 Skill 可以稳定消费，渠道侧也更容易组织成可读消息。

---

## 8. 一句话结论

> 第一阶段的 MCP 不应该被做成“网站全部接口的简单搬运”，而应该被做成“围绕 12 个高频任务的受控能力层”，优先提供摘要型查询、低风险任务触发和历史分析能力，让 OpenClaw 先在飞书、企微等渠道里顺滑跑通最有价值的业务任务。
