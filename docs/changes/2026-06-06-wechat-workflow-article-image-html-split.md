# 2026-06-06 公众号工作流改为“文章 -> 生图 -> HTML -> 发布”

## 背景

- 原公众号工作流把文章正文生成、图片锚点提炼、HTML 排版放在同一个技能里完成。
- 在 Doubao 场景下，`htmlContent` 长字符串与 JSON 一起返回时更容易出现格式污染，导致任务报“模型未返回有效 JSON”。
- 同时用户已明确要求把 HTML 阶段单独拆出，让 `deepseek-v4-pro` 独立承担公众号 HTML 生成。

## 本次调整

### 1. 工作流阶段改为四段式

- 生成文章
- 生成封面图和正文配图
- 生成 HTML
- 发布确认 / API 发布

对应状态机新增：

- `HTML_PENDING`
- `currentStep = "html"`

### 2. 技能拆分调整

- `wechat-article-composer`
  - 改为只生成结构化文章内容
  - 输出 `title`、`summary`、`author`、`content`、`coverImageBrief`、`bodyImageBriefs`
  - 不再输出 `htmlContent`
- 新增 `wechat-html-renderer`
  - 对应 `prompt_wechat_html_render`
  - 专门负责根据文章正文、封面图、正文配图和主题色生成最终公众号 HTML
  - 默认模型基线设为 `provider_runtime_text_deepseek::deepseek-v4-pro`

### 3. 数据库存储约束继续保持

- 新增技能与提示词已同步进入平台技能 / prompt 注册表
- 平台级提示词仍以 `PromptTemplate.content` 为唯一真源
- 仓库内 `提示词/wechat/*` 文件只作为首次导库与文件基线，不再反向覆盖数据库

## 代码落点

- 后端工作流与模型调用：
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/tasks/tasks.service.ts`
- 技能与提示词注册：
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/web/src/services/admin.ts`
- 前端工作流步骤：
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- 仓库技能基线：
  - `提示词/wechat/wechat-article-composer/SKILL.md`
  - `提示词/wechat/wechat-html-renderer/SKILL.md`
  - `提示词/wechat/prompt_wechat_article_compose.md`
  - `提示词/wechat/prompt_wechat_html_render.md`

## 结果

- 豆包不再承担“长正文 + HTML + JSON”同一返回体的强耦合任务
- HTML 渲染从文章生成中独立出来，便于在技能中心单独配置 DeepSeek 4.0 Pro
- 任务中心后续可以清晰区分文章阶段任务与 HTML 阶段任务
