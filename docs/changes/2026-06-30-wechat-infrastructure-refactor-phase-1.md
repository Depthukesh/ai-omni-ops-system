# 公众号底层改造 Phase 1：Canonical Service 拆分

## 1. 变更背景

- 公众号工作流近期连续暴露了 HTML 中途截断、正文回填污染 HTML、OpenClaw 直写与网站按钮链路语义不一致等问题
- 根因不是单个判断分支，而是公众号正文、图片资产、最终 HTML 之间缺少单一事实源
- `WorksService` 同时承担正文渲染、HTML 补齐、纯文本抽取、Step 4 容错与状态编排，文件职责过重，导致每次修复都容易继续向大 service 堆逻辑

## 2. 本阶段目标

- 落下公众号底层改造专题方案，明确后续不再使用“截断后把原文硬补回 HTML”作为长期方案
- 在不改变现有工作流协议的前提下，先把公众号 canonical 和富文本渲染相关纯逻辑从 `WorksService` 中拆出来
- 通过第一阶段拆分，实质降低 `works.service.ts` 的职责密度，为后续 Step 2 canonical 化和 Step 4 规则渲染器打基础

## 3. 修改内容

### 3.1 新增公众号底层改造方案文档

- `docs/wechat-infrastructure-refactor-plan.md`
  - 新增“单一事实源、服务拆分、分阶段实施计划”专题方案
  - 明确 `articleCanonical / imageAssets / htmlDraft / resolvedHtml` 的目标边界
  - 明确 `WorksService` 后续应退化为 Facade 编排层

### 3.2 文档索引同步

- `docs/README.md`
  - 把 `docs/wechat-infrastructure-refactor-plan.md` 加入“当前仍在使用的专题方案”

### 3.3 Canonical Service 拆分

- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
  - 新增独立 service
  - 承接以下纯逻辑能力：
    - HTML 纯文本抽取
    - 正文覆盖校验
    - 安全 HTML 补齐
    - 轻量 Markdown 富文本段落渲染
    - 规则化文章 HTML 壳层渲染

### 3.4 WorksModule provider 注册

- `apps/server/src/modules/works/works.module.ts`
  - 注册 `WechatWorkflowCanonicalService`

### 3.5 WorksService 第一轮减压

- `apps/server/src/modules/works/works.service.ts`
  - 注入 `WechatWorkflowCanonicalService`
  - 将以下逻辑改为委托给 canonical service：
    - `ensureWechatHtmlContainsFullArticleContent(...)`
    - `extractWechatPlainTextFromHtml(...)` 的使用点
    - `renderWechatArticleHtml(...)`
    - `renderWechatWorkflowArticleHtml(...)`
  - 删除 `WorksService` 内已经迁出的正文比较、HTML 补齐、富文本渲染相关私有方法

## 4. 这一步解决的不是最终问题，而是结构问题

- 这次变更并没有宣称“公众号截断问题已经被永久解决”
- 它解决的是更底层的结构问题：
  - 公众号正文 canonical 与 HTML 渲染能力不再继续绑死在 `WorksService`
  - 后续 Step 2 canonical 化、Step 4 规则渲染器、Step 5 resolved HTML 收口可以基于独立 service 继续演进

## 5. 对 `WorksService` 的减压效果

- 第一阶段先迁出纯逻辑，避免 `WorksService` 继续膨胀为“工作流状态机 + 文本解析器 + HTML 渲染器 + 容错补丁集合”
- 后续如果继续推进：
  - `WechatWorkflowImagePlanService`
  - `WechatWorkflowHtmlRendererService`
  - `WechatWorkflowPublishService`
  这些能力也将进一步从 `WorksService` 中拆出
- 最终目标是让 `WorksService` 只负责编排，不再兼任领域实现细节

## 6. 影响范围

- 影响模块：`works`
- 影响文档：`docs/README.md`、公众号专题方案、本变更记录
- 当前不影响范围：
  - 前端页面协议
  - OpenClaw MCP 动作协议
  - 数据库 schema

## 7. 验证

- `works.service.ts` 诊断通过
- `wechat-workflow-canonical.service.ts` 诊断通过
- `works.module.ts` 诊断通过
- `npm --workspace apps/server run build` 通过

## 8. 下一步

- Step 2 引入 canonical 正文层，统一手动保存与 AI 生成文章的下游语义
- Step 3 从 canonical blocks 派生图片计划，不再直接猜测原始长文本
- Step 4 建立 block 覆盖率校验与规则渲染器 fallback
- Step 5 统一 resolved HTML 入口，停止发布前再次“猜测性修补正文”

## 9. 相关文件

- `docs/wechat-infrastructure-refactor-plan.md`
- `docs/README.md`
- `apps/server/src/modules/works/wechat-workflow-canonical.service.ts`
- `apps/server/src/modules/works/works.module.ts`
- `apps/server/src/modules/works/works.service.ts`
