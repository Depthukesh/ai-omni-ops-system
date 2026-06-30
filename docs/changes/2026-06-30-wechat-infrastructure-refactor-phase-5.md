# 公众号底层改造 Phase 5：Step 5 发布前收口下沉

## 1. 变更背景

- Phase 4 已清理 `WorksService` 中历史遗留的公众号 HTML helper，HTML 渲染与注图链路已统一到独立 service
- 但 Step 5 的发布确认、评论策略开关、发布 payload 组装仍主要堆在 `WorksService` 中
- 这意味着公众号发布链路虽然已经只消费 resolved HTML，但发布前参数装配仍缺少独立边界，不利于继续把 Step 5 从大 service 中拆薄

## 2. 本阶段目标

- 新增独立的 `WechatWorkflowPublishService`
- 把 Step 5 的发布确认、评论开关判定、发布 payload 组装从 `WorksService` 中拆出去
- 保持现有对外协议、状态流转和发布历史逻辑不变

## 3. 修改内容

### 3.1 新增发布收口 service

- `apps/server/src/modules/works/wechat-workflow-publish.service.ts`
  - 新增独立 service
  - 承接以下公众号发布领域能力：
    - `buildWorkflowPublishConfig(...)`
    - `buildPublishedWorkflowPublishConfig(...)`
    - `buildWorkflowPublishPayload(...)`
    - `buildDraftPublishPayload(...)`
    - `buildPublishConfirmErrorDetail(...)`
  - 同时把评论开关与封面图校验逻辑收口到 service 内部

### 3.2 WorksModule 注册 provider

- `apps/server/src/modules/works/works.module.ts`
  - 注册 `WechatWorkflowPublishService`

### 3.3 工作流 Step 5 改为委托 PublishService

- `apps/server/src/modules/works/works.service.ts`
  - `updateWechatWorkflowPublishConfig(...)` 改为调用 `buildWorkflowPublishConfig(...)`
  - 发布确认失败提示改为调用 `buildPublishConfirmErrorDetail(...)`
  - `publishWechatWorkflow(...)` 改为调用 `buildWorkflowPublishPayload(...)`
  - 发布成功后的 `publishConfig` 回写改为调用 `buildPublishedWorkflowPublishConfig(...)`

### 3.4 草稿发布链路同步收口

- `apps/server/src/modules/works/works.service.ts`
  - `publishWechatArticleDraft(...)` 改为调用 `buildDraftPublishPayload(...)`
  - 删除 `WorksService` 中已失效的发布 helper：
    - `resolveWechatNeedOpenComment(...)`
    - `resolveWechatOnlyFansCanComment(...)`
    - `resolveWechatDraftCoverImageUrl(...)`

## 4. 这一步解决的结构问题

- Step 5 发布前“确认项 + 评论策略 + API payload”不再散落在 `WorksService`
- 公众号发布链路现在开始具备清晰的 service 分层：
  - `WechatWorkflowCanonicalService`：正文结构与覆盖率
  - `WechatWorkflowHtmlRendererService`：HTML 渲染与 resolved HTML
  - `WechatWorkflowPublishService`：发布确认与发布参数组装
  - `WorksService`：编排、状态流转、持久化

## 5. 对 WorksService 的减压效果

- `WorksService` 继续从“既做编排又做参数组装”的重型 service 向 facade 收口
- Step 5 的领域判断被压缩到独立 service，后续若需要：
  - 调整评论策略映射
  - 扩展发布确认 checklist
  - 统一 OpenClaw / 网站按钮的发布入参语义
  只需要改 `WechatWorkflowPublishService`

## 6. 影响范围

- 影响模块：`works`
- 影响阶段：公众号 `Step 5`
- 当前不影响范围：
  - 前端接口协议
  - OpenClaw MCP 协议
  - 微信 API 调用方式

## 7. 验证

- `works.service.ts` 诊断通过
- `wechat-workflow-publish.service.ts` 诊断通过
- `works.module.ts` 诊断通过
- `npm --workspace apps/server run build` 通过

## 8. 下一步

- 继续验证 OpenClaw `set_html`、网站 `generate_html` 和最终发布 HTML 的一致性
- 评估是否把 `appendWechatPublishHistoryRecord(...)` 与发布结果映射继续下沉为 publish history/repository 层
- 继续清理 `WorksService` 中与公众号模块无关但已经具备独立 service 条件的长逻辑块

## 9. 相关文件

- `apps/server/src/modules/works/wechat-workflow-publish.service.ts`
- `apps/server/src/modules/works/works.module.ts`
- `apps/server/src/modules/works/works.service.ts`
