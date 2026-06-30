# 公众号底层改造 Phase 3：Step 4 覆盖率校验与规则渲染器

## 1. 变更背景

- Phase 2 已让 `articleCanonical` 正式进入公众号工作流主链路，Step 2、Step 3 和 Step 4 都可以读取同一份结构化正文
- 但在 Step 4 中，如果仍然采用“模型 HTML 不完整就把缺失段落补到末尾”的策略，本质上还是字符串补丁，不符合公众号底层改造方案里“覆盖不足就整篇降级规则渲染”的原则
- 同时，公众号规则渲染、图片注入和 resolved HTML 仍然主要堆在 `WorksService` 内部，尚未继续减压

## 2. 本阶段目标

- 为 Step 4 引入基于 canonical blocks 的 HTML 覆盖率校验
- 当模型 HTML 覆盖不足时，不再追加缺失段落，而是直接降级到规则渲染器生成完整 HTML
- 新增独立的 `WechatWorkflowHtmlRendererService`，继续把公众号 HTML 规则渲染和图片注入从 `WorksService` 迁出

## 3. 修改内容

### 3.1 Canonical Service 增加覆盖率校验

- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
  - 新增 `WechatHtmlCoverageResult`
  - 新增 `inspectHtmlCoverage(...)`
  - 按 `articleCanonical.blocks` 计算：
    - 总 block 数
    - 已覆盖 block 数
    - heading 覆盖率
    - 总体覆盖率
    - 是否需要 fallback
  - 规则：
    - 小文章要求完整覆盖
    - 较长文章至少达到可接受覆盖率
    - heading 缺失则直接判定需要 fallback

### 3.2 新增 HTML Renderer Service

- `apps/server/src/modules/works/wechat-workflow-html-renderer.service.ts`
  - 新增独立 service
  - 承接以下公众号 HTML 领域能力：
    - 规则化文章 HTML 渲染
    - Step 4 降级 HTML 渲染
    - resolved HTML 构建
    - 已生成图片注入
    - HTML 间距归一化
  - 让 `WorksService` 不再同时承担正文渲染器和图片注入器职责

### 3.3 WorksModule 注册新 provider

- `apps/server/src/modules/works/works.module.ts`
  - 注册 `WechatWorkflowHtmlRendererService`

### 3.4 Step 4 切换为“覆盖率不足即整篇 fallback”

- `apps/server/src/modules/works/works.service.ts`
  - `generateWechatWorkflowHtml(...)` 调模型时补充 `bodyImageAspectRatio`
  - `generateWechatHtmlByModel(...)` 在模型返回 HTML 后：
    - 先归一化 HTML
    - 再调用 `inspectHtmlCoverage(...)`
    - 若覆盖不足，则调用 `WechatWorkflowHtmlRendererService.renderWorkflowResolvedHtml(...)`
    - 不再使用“把缺失段落追加回 HTML”策略
  - `attemptTrail` 中增加“覆盖率不足，降级规则渲染器”的标记，方便后续排查

### 3.5 Resolved HTML 与文章规则渲染委托到新 service

- `apps/server/src/modules/works/works.service.ts`
  - `buildWechatWorkflowResolvedHtmlContent(...)` 改为委托 renderer service
  - `buildWechatDraftResolvedHtmlContent(...)` 改为委托 renderer service
  - `renderWechatArticleHtml(...)` 改为委托 renderer service
  - `renderWechatWorkflowArticleHtml(...)` 改为委托 renderer service
  - `normalizeWechatGeneratedHtmlDocument(...)` 内部也改为复用 renderer service 的 HTML 归一化能力

## 4. 这一步解决的结构问题

- Step 4 不再把“正文完整性”寄托给模型幸运输出
- 一旦模型 HTML 丢段、漏标题、正文覆盖不足，系统会直接回落到 canonical + 图片资产驱动的规则渲染器
- 公众号 HTML 的图片注入、规则渲染与 resolved HTML 开始拥有独立 service 边界
- `WorksService` 进一步朝 Facade 编排层收敛

## 5. 对 `WorksService` 的减压效果

- `WorksService` 不再独占公众号 Step 4 的 HTML 规则渲染与 resolved HTML 组装
- 公众号 HTML 相关职责现在开始分成两层：
  - `WechatWorkflowCanonicalService`：正文结构与覆盖校验
  - `WechatWorkflowHtmlRendererService`：规则渲染与图片注入
- 后续继续推进时，可以更自然地把发布前收口继续拆给 `WechatWorkflowPublishService`

## 6. 影响范围

- 影响模块：`works`
- 影响阶段：公众号 `Step 4`、`Step 5` 的 HTML 收口链路
- 影响文档：本变更记录
- 当前不影响范围：
  - 前端接口协议
  - OpenClaw MCP 接口字段
  - Step 2 / Step 3 的输入输出协议

## 7. 验证

- `works.service.ts` 诊断通过
- `wechat-workflow-canonical.service.ts` 诊断通过
- `wechat-workflow-html-renderer.service.ts` 诊断通过
- `works.module.ts` 诊断通过
- `npm --workspace apps/server run build` 通过

## 8. 下一步

- 继续清理 `WorksService` 中已经失效的公众号 HTML helper，减少历史残留
- 让 Step 5 只消费统一的 resolved HTML，而不是多处条件分支拼接
- 继续推进 `WechatWorkflowPublishService`，把发布前摘要收口和 API 发布组装继续从 `WorksService` 拆出

## 9. 相关文件

- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
- `apps/server/src/modules/works/wechat-workflow-html-renderer.service.ts`
- `apps/server/src/modules/works/works.module.ts`
- `apps/server/src/modules/works/works.service.ts`
