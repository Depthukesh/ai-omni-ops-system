# OpenClaw 第一阶段 MCP 工具字段草案

## 1. 文档定位

这份文档是在《OpenClaw第一阶段MCP工具清单》基础上继续细化，重点回答：

1. 每个核心 MCP 工具的请求参数应该有哪些
2. 每个核心 MCP 工具的返回字段应该有哪些
3. 哪些字段应该由服务端自动补齐
4. 哪些字段不应该暴露给 OpenClaw 用户

一句话目标：

> 让第一阶段 MCP 工具从“有名字的能力清单”进一步收口成“接近可实现的字段契约草案”。

---

## 2. 统一字段原则

## 2.1 身份与品牌上下文由服务端解析

以下字段不应默认让渠道侧显式传入：

- `userId`
- `role`
- `scopes`

这些字段应由服务端基于绑定关系和会话上下文自动解析。

## 2.2 品牌字段可传，但不能只信客户端

如果用户主动指定品牌，可以传：

- `brandId`
- `brandName`

但服务端仍需校验：

- 用户是否有该品牌权限
- 当前会话是否允许切换

## 2.3 结果统一返回摘要层

第一阶段所有工具建议至少包含：

- `title`
- `summary`
- `status`
- `highlights`
- `links`

## 2.4 不暴露内部字段

不建议直接返回：

- 原始数据库主键
- 内部错误堆栈
- Provider 内部配置
- 内部服务名和路由名

---

## 3. 通用结构建议

## 3.1 通用请求结构

```json
{
  "context": {
    "brandId": "optional-if-user-specified",
    "timeRange": "optional",
    "platform": "optional"
  },
  "input": {}
}
```

## 3.2 通用响应结构

```json
{
  "status": "success",
  "title": "最近 7 天任务摘要",
  "summary": "最近 7 天共有 12 个任务，8 个已完成，2 个进行中，2 个失败。",
  "highlights": [],
  "data": {},
  "links": [],
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4. 核心工具字段草案

## 4.1 `get_current_brand_context`

### 请求字段

```json
{
  "context": {},
  "input": {
    "includeScopes": true
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "当前品牌上下文",
  "summary": "当前默认品牌为 A 品牌，你在该品牌下具备运营权限。",
  "data": {
    "brand": {
      "id": "brand_xxx",
      "name": "A品牌",
      "isDefault": true
    },
    "member": {
      "role": "operator",
      "scopes": ["task.read", "task.create", "kb.read"]
    }
  },
  "allowed": true,
  "requiresConfirmation": false
}
```

### 说明

- `userId` 不建议返回给用户侧消费
- `scopes` 供 Skill 决策，不需要直接展示给业务用户

---

## 4.2 `get_recent_tasks_summary`

### 请求字段

```json
{
  "context": {
    "brandId": "optional",
    "timeRange": "7d"
  },
  "input": {
    "taskTypes": [],
    "includeTopFailed": true
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "最近 7 天任务摘要",
  "summary": "最近 7 天共有 12 个任务，8 个已完成，2 个进行中，2 个失败。",
  "highlights": [
    "已完成任务占比 66.7%",
    "失败任务主要集中在内容生成类"
  ],
  "data": {
    "counts": {
      "total": 12,
      "completed": 8,
      "running": 2,
      "failed": 2
    },
    "topTaskTypes": [
      { "label": "品牌增长报告", "count": 4 },
      { "label": "小红书原创图文", "count": 3 }
    ],
    "topFailedTasks": [
      { "label": "小红书原创图文", "count": 1 }
    ]
  },
  "links": [
    { "label": "打开任务中心", "url": "/brand-growth/tasks" }
  ],
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.3 `summarize_failed_tasks`

### 请求字段

```json
{
  "context": {
    "brandId": "optional",
    "timeRange": "7d"
  },
  "input": {
    "taskTypes": [],
    "limit": 3
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "失败任务原因总结",
  "summary": "最近失败主要集中在图片生成超时和资料不足两类问题。",
  "highlights": [
    "图片生成超时出现 3 次",
    "资料不足出现 2 次"
  ],
  "data": {
    "topReasons": [
      { "label": "图片生成超时", "count": 3 },
      { "label": "资料不足", "count": 2 }
    ],
    "suggestions": [
      "优先检查图片生成链路稳定性",
      "补齐品牌知识资料"
    ]
  },
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.4 `create_brand_growth_report`

### 请求字段

```json
{
  "context": {
    "brandId": "optional"
  },
  "input": {
    "timeRange": "30d",
    "goal": "optional"
  }
}
```

### 返回字段

```json
{
  "status": "accepted",
  "title": "品牌增长报告已受理",
  "summary": "已为当前品牌发起品牌增长报告任务。",
  "data": {
    "task": {
      "id": "task_xxx",
      "type": "brand_growth_report",
      "stage": "queued"
    }
  },
  "links": [
    { "label": "打开完整结果", "url": "/brand-growth/reports/task_xxx" }
  ],
  "allowed": true,
  "requiresConfirmation": false
}
```

### 说明

- `task.id` 可以给 Skill 使用
- 对业务用户展示时优先用“已受理”“处理中”这类表达

---

## 4.5 `list_knowledge_bases`

### 请求字段

```json
{
  "context": {
    "brandId": "optional"
  },
  "input": {
    "includeCounts": true
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "当前品牌知识库",
  "summary": "当前共有 3 个知识库，其中 2 个已完成同步。",
  "data": {
    "items": [
      {
        "id": "kb_xxx",
        "name": "产品资料库",
        "description": "沉淀产品说明和素材",
        "syncStatus": "completed",
        "fileCount": 18
      }
    ]
  },
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.6 `list_recent_knowledge_files`

### 请求字段

```json
{
  "context": {
    "brandId": "optional",
    "timeRange": "7d"
  },
  "input": {
    "knowledgeBaseId": "optional",
    "limit": 10
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "最近新增知识资料",
  "summary": "最近 7 天新增了 6 份资料，4 份已完成切片。",
  "data": {
    "items": [
      {
        "name": "新品卖点说明.pdf",
        "knowledgeBaseName": "产品资料库",
        "uploadedAt": "2026-06-11T10:00:00Z",
        "syncStatus": "completed"
      }
    ]
  },
  "links": [
    { "label": "打开知识库", "url": "/brand-growth/business-assets" }
  ],
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.7 `create_knowledge_base`

### 请求字段

```json
{
  "context": {
    "brandId": "optional"
  },
  "input": {
    "name": "产品资料库",
    "description": "optional"
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "知识库已创建",
  "summary": "知识库“产品资料库”已创建成功。",
  "data": {
    "knowledgeBase": {
      "id": "kb_xxx",
      "name": "产品资料库"
    }
  },
  "links": [
    { "label": "继续上传资料", "url": "/brand-growth/business-assets" }
  ],
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.8 `upload_knowledge_files`

### 请求字段

```json
{
  "context": {
    "brandId": "optional"
  },
  "input": {
    "knowledgeBaseId": "kb_xxx",
    "files": [
      {
        "fileToken": "upload_xxx",
        "name": "新品介绍.pdf"
      }
    ]
  }
}
```

### 返回字段

```json
{
  "status": "accepted",
  "title": "资料上传已受理",
  "summary": "已向知识库上传 2 份资料，系统将自动开始切片处理。",
  "data": {
    "knowledgeBaseName": "产品资料库",
    "acceptedFileCount": 2
  },
  "allowed": true,
  "requiresConfirmation": true
}
```

### 说明

- 文件本体不通过 Skill 传输，建议通过渠道或中转上传后传 `fileToken`
- 此工具建议保留轻确认

---

## 4.9 `get_skill_config_summary`

### 请求字段

```json
{
  "context": {
    "brandId": "optional"
  },
  "input": {
    "skillKey": "wechat_article_creation"
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "技能配置摘要",
  "summary": "公众号文章创作当前已在本品牌启用，并存在品牌层覆盖配置。",
  "data": {
    "skill": {
      "key": "wechat_article_creation",
      "name": "公众号文章创作",
      "enabled": true
    },
    "override": {
      "exists": true,
      "updatedAt": "2026-06-10T12:00:00Z"
    }
  },
  "links": [
    { "label": "查看完整配置", "url": "/skills" }
  ],
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.10 `create_xiaohongshu_original_note`

### 请求字段

```json
{
  "context": {
  },
  "input": {
    "calendarItemId": "optional",
    "customTopicName": "optional",
    "topic": "optional, legacy alias of customTopicName",
    "productId": "optional",
    "accountRole": "optional, BRAND | STAFF | TALENT",
    "imageCount": "optional, 2-10",
    "includeMarketingPlan": "optional, boolean",
    "additionalInstruction": "optional",
    "noteTitle": "optional, direct note title for the generated original note",
    "noteContent": "optional, direct note body for bypassing original-copy skill",
    "styleHint": "optional, legacy alias of additionalInstruction"
  }
}
```

### 返回字段

```json
{
  "status": "accepted",
  "title": "小红书原创图文已受理",
  "summary": "已为当前品牌发起小红书原创图文任务。",
  "data": {
    "task": {
      "id": "task_xxx",
      "stage": "queued"
    }
  },
  "links": [
    { "label": "打开完整结果", "url": "/works" }
  ],
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.11 `create_wechat_article`

### 请求字段

```json
{
  "context": {
    "brandId": "optional"
  },
  "input": {
    "topic": "optional",
    "styleHint": "optional"
  }
}
```

### 返回字段

```json
{
  "status": "accepted",
  "title": "公众号文章任务已受理",
  "summary": "已为当前品牌发起公众号文章生成任务。",
  "data": {
    "task": {
      "id": "task_xxx",
      "stage": "queued"
    }
  },
  "links": [
    { "label": "打开文章结果", "url": "/works" }
  ],
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 4.12 `summarize_top_content_patterns`

### 请求字段

```json
{
  "context": {
    "brandId": "optional",
    "platform": "xiaohongshu",
    "timeRange": "30d"
  },
  "input": {
    "limit": 5
  }
}
```

### 返回字段

```json
{
  "status": "success",
  "title": "高表现内容规律总结",
  "summary": "最近高表现内容主要集中在对比型选题和明确痛点表达。",
  "highlights": [
    "对比型标题出现频率较高",
    "首屏信息密度更高"
  ],
  "data": {
    "topPatterns": [
      "对比型选题",
      "明确痛点表达"
    ],
    "topItems": [
      { "title": "示例内容 A" }
    ]
  },
  "allowed": true,
  "requiresConfirmation": false
}
```

---

## 5. 服务端自动补齐字段建议

以下字段建议统一由服务端自动补齐：

- 默认品牌
- 默认时间范围
- 当前用户角色
- 当前用户 scopes
- 深链接 URL 前缀

这样可以减少 Skill 负担，也能减少渠道侧传参复杂度。

---

## 6. 第一阶段字段控制建议

第一阶段字段设计要尽量满足这几点：

1. 对话友好
2. 结果可摘要
3. 可扩展
4. 不暴露内部实现
5. 能和后续 HTML 卡片 / 渠道模板消息兼容

---

## 7. 一句话结论

> 第一阶段 MCP 字段设计不应该追求“接口完整性”，而应该优先追求“对话可消费性”和“网站侧实现可控性”，让 Skill 能稳定调用，让用户能直接看懂，让服务端能安全演进。
