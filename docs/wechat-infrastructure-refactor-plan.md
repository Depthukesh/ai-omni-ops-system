# 公众号工作流底层改造方案

## 1. 文档目的

- 用第一性原理重新定义公众号 `Step 2-5` 的数据边界，停止“截断了再补、补坏了再修”的补丁式演进
- 建立公众号工作流的单一事实源，让文章正文、图片资产、最终发布 HTML 各自有明确职责
- 以低风险增量方式从 `WorksService` 中抽离公众号 canonical、HTML 渲染与发布前收口能力，实质减轻 `works.service.ts` 的职责压力
- 为后续 OpenClaw / WorkBuddy 直写、手动编辑、按钮生成、API 发布统一到底层同一套数据契约

## 2. 当前现状与核心问题

### 2.1 现状

- 公众号工作流当前已经具备 `Step 2 文章`、`Step 3 生图`、`Step 4 HTML`、`Step 5 API 发布确认` 的完整业务链路
- 前端、OpenClaw MCP、服务端 API 都可以推进这条链路，但底层并没有统一的数据语义层
- `WorksService` 同时承担了工作流状态编排、第三方调用、图片 prompt 生成、HTML 生成容错、HTML 归一化、注图、发布前收口等多种职责

### 2.2 核心问题

- `content` 既承载输入草稿，又承载最终正文，语义混杂
- `htmlContent` 既像 Step 4 模型产物，又会在后续链路被再次改写
- 发布前并不直接使用存库的 `htmlContent`，而是再走一层 resolved HTML 逻辑，导致“预览正确但发布结果不同源”
- 为了应对模型截断、模型返回脏 JSON、OpenClaw 直写 HTML、图片注入等问题，系统已经叠加了多层补丁式容错
- 前后端分别维护 HTML 归一化和注图逻辑，进一步放大结果漂移

### 2.3 已暴露的具体症状

- Step 4 模型返回不完整时，HTML 中途截断
- 为补齐正文引入了 Markdown / 原文回填，导致 HTML 中途出现 Markdown 段
- 手动保存文章与执行文章 AI 后，Step 3 生图语义分配不一致
- OpenClaw 走 `set_html` 和网站按钮走 `generate_html` 时，HTML 处理语义并不一致

## 3. 第一性原理判断

- 公众号 API 发布链路真正需要的不是“一段幸运的 HTML”，而是一个可验证、可重建的发布产物
- 正文完整性不能由 Step 4 的 HTML 模型单独承担
- 图片资产不能靠 Step 4 再次猜测文章语义
- 最终发布 HTML 必须是一个可由结构化正文和图片资产重新生成的结果，而不是一份被多次修补后的半成品

## 4. 改造目标

- 让 `Step 2` 成为唯一正文事实源入口
- 让 `Step 3` 只消费结构化正文，不再直接猜测原始长文本
- 让 `Step 4` 只承担“风格化 HTML 渲染”职责，不再承担正文完整性的最终责任
- 让 `Step 5` 只消费统一收口后的最终 HTML，不再现场改正文
- 把公众号纯逻辑能力从 `WorksService` 中拆到独立 service，逐步收口为“Facade 编排 + 领域能力 service”的结构

## 5. 单一事实源模型

### 5.1 目标数据层

- `articleSource`
  - 记录 Step 2 的原始输入来源与输入类型
  - 只做来源留档，不作为后续直接发布依据
- `articleCanonical`
  - 公众号正文的唯一事实源
  - 存放结构化结果，如 `title`、`summary`、`author`、`blocks`
- `imagePlan`
  - 从 `articleCanonical.blocks` 派生出的封面图与正文配图语义计划
- `imageAssets`
  - Step 3 的正式图片结果，仅记录图片资产，不改写正文
- `htmlDraft`
  - Step 4 生成的风格化 HTML 草稿，仅作为渲染结果
- `resolvedHtml`
  - 发布前统一由 `articleCanonical + imageAssets + styleType` 收口得到的最终 HTML

### 5.2 文章块结构

- `heading`
- `paragraph`
- `quote`
- `list`
- `image-slot`
- `divider`

### 5.3 关键原则

- 正文完整性只对 `articleCanonical.blocks` 负责
- `htmlDraft` 不再承担“正文真相”
- Step 4 模型失败时，允许降级为规则渲染器，但不允许再把原始长文本硬拼回 HTML

## 6. 服务拆分方案

### 6.1 目标结构

- `WorksService`
  - 只保留工作流主编排、权限、状态推进、任务协调
- `WechatWorkflowCanonicalService`
  - 负责正文 canonical、轻量 Markdown 富文本渲染、安全补齐与正文覆盖校验
- `WechatWorkflowHtmlRendererService`
  - 负责规则渲染器、HTML 壳层、图片插槽映射与 resolved HTML 收口
- `WechatWorkflowImagePlanService`
  - 负责从 canonical blocks 派生封面图 brief 和正文配图 brief
- `WechatWorkflowPublishService`
  - 负责发布前校验、摘要收口、API 发布参数整合

### 6.2 对 `works.service.ts` 的减压效果

- 公众号正文 canonical 与 HTML 富文本渲染从 `WorksService` 中迁出，减少该文件内的纯文本解析、HTML 字符串拼装和补齐逻辑
- `WorksService` 后续只保留“什么时候调用 Step2/3/4/5”而不再同时负责“如何解析正文、如何补 HTML、如何兜底渲染”
- 相同逻辑不再在前端和后端重复维护，减少“为了一个页面预览问题去动大 service” 的概率
- 未来 OpenClaw / 网站按钮 / 手动直写都走同一套 canonical 与 renderer service，减少分叉成本

## 7. 分阶段实施计划

### 阶段 A：建立文档基线与服务骨架

- 新增本方案文档
- 新增 `WechatWorkflowCanonicalService`
- 先迁出不依赖数据库和第三方平台的纯逻辑：
  - HTML 纯文本抽取
  - 正文覆盖校验
  - 富文本段落渲染
  - 安全 HTML 补齐
- 保持现有数据库结构不变

### 阶段 B：建立 canonical 正文层

- 在 Step 2 保存文章和执行文章 AI 后，统一写出 canonical 结构
- 手动保存文章与 AI 生成文章共用一套 canonical 产物
- 生图 brief 从 canonical 派生，而不再从原始长文本直接猜测

### 阶段 C：建立规则渲染器与 Step 4 校验

- 新增 `WechatWorkflowHtmlRendererService`
- Step 4 模型生成后不再直接入库，而是先做 block 覆盖率校验
- 覆盖不足时，降级使用规则渲染器构建完整 HTML
- 不再走“字符串相似度补段 + 把原文拼到末尾”的临时方案

### 阶段 D：统一发布前收口

- Step 5 只消费 resolved HTML
- 前端预览与发布前 resolved HTML 统一来源
- OpenClaw 的 `set_html` 与网站按钮 `generate_html` 明确区分语义：
  - `set_html` 代表外部已给出完整 HTML 草稿
  - `generate_html` 代表系统基于 canonical + style 进行渲染

### 阶段 E：清理旧补丁逻辑

- 删除 `WorksService` 中已经被独立 service 替代的正文补齐、富文本渲染与 HTML 兜底逻辑
- 逐步清理前端重复的 HTML 归一化和注图逻辑
- 同步补充变更文档与基线文档

## 8. 当前进度快照

截至 `2026-06-30`，公众号底层改造已经完成以下收口：

- Phase 1：
  - 新增 `WechatWorkflowCanonicalService`
  - 从 `WorksService` 中迁出 canonical、富文本渲染和覆盖校验相关纯逻辑
- Phase 2：
  - Step 2 正式写入 `articleCanonical`
  - Step 3 图片 brief 开始从 canonical 派生
- Phase 3：
  - 新增 `WechatWorkflowHtmlRendererService`
  - Step 4 改为“覆盖率不足即整篇 fallback 到规则渲染器”
- Phase 4：
  - 清理 `WorksService` 中历史遗留的 HTML 注图和归一化 helper
- Phase 5：
  - 新增 `WechatWorkflowPublishService`
  - Step 5 发布确认、评论策略和 API payload 组装开始从 `WorksService` 下沉

当前尚未完成的部分：

- OpenClaw `set_html`、网站 `generate_html` 与最终发布 HTML 的一致性验证
- 前端预览与发布前 `resolvedHtml` 的最终一致性回归验证
- 更细的 publish history / repository 层继续拆分

## 9. 当前阶段不做的事

- 不一次性重写整个公众号模块的数据表
- 不在第一阶段同时改数据库 schema、前端 UI 结构和发布协议
- 不把所有 Works 领域能力一口气全部抽成独立 module

## 10. 风险与控制

- 风险：改造期间 Step 4 结果可能同时存在旧 HTML 逻辑和新 canonical 逻辑
  - 控制：先抽纯逻辑 service，再逐步切换调用方
- 风险：OpenClaw 与网站前端可能对 `set_html / generate_html` 的语义理解不同
  - 控制：在 MCP 文档和服务端动作说明里明确两类动作的输入契约
- 风险：旧工作流历史数据没有 canonical blocks
  - 控制：引入懒生成策略，从旧 `content` 迁移出 canonical 结构

## 11. 验收标准

- `WorksService` 中公众号正文 canonical / 富文本渲染 / 安全补齐逻辑已迁出到独立 service
- Step 2 手动保存和 AI 生成后的 Step 3 生图 briefs 来源一致
- Step 4 即使模型输出不完整，也不会再出现 Markdown 泄漏或正文中途截断
- Step 5 发布所用 HTML 与前端预览来源一致
- OpenClaw、网站按钮、手动直写三条链路在正文、图片、HTML 三类数据上的语义保持一致

## 12. 文档联动要求

- 代码进入第一阶段后，补一条 `docs/changes/` 记录
- 如果公众号工作流入口、数据边界或模块归属发生变化，需要同步更新：
  - `docs/site-map.md`
  - `docs/database-archive.md`
  - `docs/system-refactor-roadmap.md`

## 13. 相关文件

- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/works/works.module.ts`
- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- `apps/web/src/services/works.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `docs/changes/2026-06-03-wechat-workspace-and-publishing.md`
- `docs/system-refactor-roadmap.md`
