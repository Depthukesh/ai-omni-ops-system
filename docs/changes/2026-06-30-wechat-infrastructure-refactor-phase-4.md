# 公众号底层改造 Phase 4：清理 WorksService 历史 HTML Helper

## 1. 变更背景

- Phase 3 已新增 `WechatWorkflowHtmlRendererService`，并把公众号 Step 4 的规则渲染、图片注入、resolved HTML 构建切到独立 service
- 但 `WorksService` 中仍然残留一整段旧的公众号 HTML helper，包括：
  - HTML 图片注入
  - HTML 间距归一化
  - 已生成图片 block 构建
  - 图片标签替换
- 这些 helper 已不再被主链路使用，如果继续留在 `WorksService`，后续很容易被误接回旧链路，重新制造“双实现源”

## 2. 本阶段目标

- 删除 `WorksService` 中已经被 `WechatWorkflowHtmlRendererService` 替代的历史 helper
- 确保公众号 HTML 的规则渲染与图片注入只保留一份实现
- 继续降低 `works.service.ts` 的职责密度，避免后续改动再次堆回大 service

## 3. 修改内容

### 3.1 删除 WorksService 历史 HTML helper

- `apps/server/src/modules/works/works.service.ts`
  - 删除以下已失效的公众号 HTML helper：
    - `injectWechatImagesIntoHtml(...)`
    - `normalizeWechatHtmlSpacing(...)`
    - `stripWechatGeneratedImageArtifacts(...)`
    - `normalizeWechatHtmlInlineStyle(...)`
    - `replaceWechatImageTag(...)`
    - `injectWechatGeneratedImageBlocks(...)`
    - `injectWechatCoverImageBlock(...)`
    - `injectWechatBodyImageBlocks(...)`
    - `appendWechatGeneratedImageBlocks(...)`
    - `buildWechatGeneratedImageFigure(...)`
    - `buildWechatGeneratedImageAppendBlock(...)`

### 3.2 保留仍在被主链路使用的公共能力

- `apps/server/src/modules/works/works.service.ts`
  - 保留 `resolveWechatBodyImageAspectRatio(...)`
  - 该方法当前仍作为 Step 4 / Step 5 resolved HTML 的参数装配层使用

## 4. 这一步解决的结构问题

- 公众号 HTML 规则渲染与注图逻辑不再同时存在于两个 service
- 后续若继续调整 Step 4 或 Step 5，只需要修改 `WechatWorkflowHtmlRendererService`
- 降低了“某次修复只改到旧 helper、主链路却没生效”的风险

## 5. 对 WorksService 的减压效果

- `WorksService` 再次减少一段大体量 HTML 字符串处理代码
- 公众号模块的服务边界进一步清晰：
  - `WechatWorkflowCanonicalService`：正文结构与覆盖率校验
  - `WechatWorkflowHtmlRendererService`：HTML 渲染、图片注入、resolved HTML
  - `WorksService`：工作流编排与调用装配

## 6. 影响范围

- 影响模块：`works`
- 影响文件：`works.service.ts`
- 当前不影响范围：
  - 对外 API 协议
  - OpenClaw MCP 接口
  - 前端页面字段

## 7. 验证

- `works.service.ts` 诊断通过
- `wechat-workflow-html-renderer.service.ts` 诊断通过
- `npm --workspace apps/server run build` 通过

## 8. 下一步

- 继续推进 Step 5 发布前收口，评估是否把发布参数组装和摘要归一化继续拆到 `WechatWorkflowPublishService`
- 继续验证 OpenClaw `set_html`、网站 `generate_html` 和最终发布 HTML 的一致性

## 9. 相关文件

- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/works/wechat-workflow-html-renderer.service.ts`
