# 公众号底层改造 Phase 2：Step 2 Canonical 正式接入

## 1. 变更背景

- Phase 1 已把公众号正文 canonical、HTML 补齐和规则渲染相关纯逻辑从 `WorksService` 中拆出到独立 service
- 但如果 Step 2 生成文章、手动保存文章、Step 3 生图和 Step 4 HTML 仍各自消费不同形态的正文，后续依然会回到“哪里出错就在哪里补字符串”的旧路径
- 因此第二阶段的核心不是继续修单点 Bug，而是让公众号正文在进入工作流后立即沉淀为可复用的 canonical 结构，并被下游统一消费

## 2. 本阶段目标

- 为公众号文章正式增加 `articleCanonical` 持久化字段，而不是临时塞进其他 JSON 杂项字段
- 统一 Step 2 两条入口：
  - 执行文章 AI
  - 手动保存文章
- 让 Step 3 图片 brief 的 fallback 和主题抽取开始优先消费 canonical 结构
- 让 Step 4 HTML 生成与完整性校验开始读取 canonical，而不是只依赖原始长文本

## 3. 修改内容

### 3.1 Canonical 结构下沉为正式数据字段

- `prisma/schema.prisma`
  - 为 `WechatWorkflowSession` 新增 `articleCanonicalJson`
  - 为 `WechatArticleDraft` 新增 `articleCanonicalJson`

- `apps/server/src/modules/works/works.service.ts`
  - 扩展 `WechatWorkflowSessionRecord` / `WechatArticleDraftRecord`
  - 扩展对应 row 类型、持久化 SQL、建表 SQL 和 `ALTER TABLE`
  - 新增 `normalizeWechatArticleCanonical(...)`，统一把 JSONB 恢复为强类型 canonical 结构

### 3.2 Step 2 正文入口统一 canonical 化

- `apps/server/src/modules/works/works.service.ts`
  - `generateWechatWorkflowArticle(...)` 在文章生成完成后立即构建 canonical
  - `updateWechatWorkflowArticle(...)` 在手动保存文章时同步重建 canonical
  - `generateWechatArticleDraft(...)` 在草稿生成时同步写入 canonical
  - `updateWechatArticleDraft(...)` 在草稿手动编辑时同步重建 canonical

- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
  - 新增 `WechatArticleCanonicalRecord`
  - 新增 `buildArticleCanonical(...)`
  - 新增 `WechatArticleCanonicalBlock` 与 `sourceFormat / headings / blocks / plainText` 结构

### 3.3 Step 3 开始从 canonical 派生图片语义

- `apps/server/src/modules/works/works.service.ts`
  - `generateWechatImageBriefsFromArticle(...)` 支持接收 `articleCanonical`
  - `buildWechatFallbackImageBriefsFromArticle(...)` 支持接收 `articleCanonical`
  - `extractWechatArticleSectionTopics(...)` 改为委托 canonical service 提取章节主题

- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
  - 新增 `extractSectionTopics(...)`
  - 优先从 canonical blocks / headings 生成章节主题，降低纯字符串切分造成的错位

### 3.4 Step 4 开始消费 canonical 正文源

- `apps/server/src/modules/works/works.service.ts`
  - `generateWechatWorkflowHtml(...)` 调用模型时传入 `articleCanonical`
  - `generateWechatHtmlByModel(...)` 把 `articleCanonical` 作为 HTML 渲染输入的一部分传给模型
  - `buildWechatHtmlKnowledgeContext(...)` 开始利用 canonical 的 `headings / plainText`
  - `ensureWechatHtmlContainsFullArticleContent(...)` 补齐校验时传入 canonical

- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
  - `ensureHtmlContainsFullArticleContent(...)` 优先按 canonical blocks 检查 HTML 是否覆盖正文
  - `renderArticleDocument(...)` / `renderRichTextContent(...)` 支持直接消费 canonical blocks

## 4. 这一步解决的结构问题

- 公众号正文不再只是一个 `content` 长字符串
- Step 2 产出后，系统内部正式出现一层可复用的：
  - `sourceFormat`
  - `plainText`
  - `headings`
  - `blocks`
- Step 3 和 Step 4 不再各自重复猜测“文章到底怎么分段、哪些是章节标题、哪些是正文重点”
- 这直接降低了手动保存文章与 AI 生成文章在下游语义不一致的概率

## 5. 对 `WorksService` 的减压效果

- 这一步虽然还没有把 Step 3 / Step 4 完全拆成独立 service，但已经把“正文结构解释权”从 `WorksService` 内部散落的字符串逻辑，收口到 `WechatWorkflowCanonicalService`
- `WorksService` 现在更多只是：
  - 触发 Step 2 / Step 3 / Step 4 流程
  - 组装上下游参数
  - 持久化结果
- 后续继续拆分时，`image plan` 和 `html renderer` 都可以直接基于 canonical service 再往外迁

## 6. 影响范围

- 影响模块：`works`
- 影响数据边界：公众号工作流 / 草稿新增 `articleCanonicalJson`
- 影响文档：本变更记录
- 当前不影响范围：
  - 前端工作流协议
  - OpenClaw MCP 接口协议
  - 公众号发布 API 对外字段

## 7. 验证

- `works.service.ts` 诊断通过
- `wechat-workflow-canonical.service.ts` 诊断通过
- `npm --workspace apps/server run build` 通过

## 8. 下一步

- 为 Step 4 增加更严格的 block 覆盖率判断，而不只是“缺段落就追加”
- 继续把 HTML 规则渲染 fallback 从 `WorksService` 下沉为独立 renderer service
- 为 Step 5 收口 `resolvedHtml`，避免发布前再次对正文做猜测性拼装

## 9. 相关文件

- `prisma/schema.prisma`
- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
- `apps/server/src/modules/works/works.module.ts`
- `apps/server/src/modules/works/works.service.ts`
