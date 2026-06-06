# 2026-06-06 公众号任务中心接线与技能提示词数据库真源修复

## 背景

- 公众号工作流里的“执行文章AI”已经切到新工作流接口，但后台任务中心看不到对应任务记录。
- 后台技能中心里的提示词虽然支持保存，但服务后续读取时仍会让本地提示词文件反向覆盖数据库，导致重启、发布或代码回滚后页面重新显示旧内容。
- 这与既有规范中“提示词应正式持久化到数据库”的要求不一致，也会让后台与品牌技能中心都出现“保存后又恢复原样”的假象。

## 本次修复

### 1. 公众号工作流文章生成接入正式任务中心

- `POST /works/brands/:brandId/wechat/workflows/:workflowId/article/generate`
  - 现在会把当前 `auth` 透传到 `WorksService`
  - 生成文章前先创建正式 `Task`
  - 执行中写入 `RUNNING`
  - 成功后写入 `SUCCESS + outputJson`
  - 失败后写入 `FAILED`
- 新增公众号任务类型：
  - `WECHAT_ARTICLE_AI`
  - `WECHAT_ARTICLE_DRAFT_AI`
  - `WECHAT_WORKFLOW_PUBLISH`
  - `WECHAT_ARTICLE_DRAFT_PUBLISH`
- 任务中心超时表也已同步补入上述类型，避免新任务类型缺少自动超时收口。

### 2. 平台级技能提示词恢复为数据库真源

- `SkillsPromptsService` 现在恢复为：
  - 首次建库或缺失记录时，允许从仓库提示词文件导入默认值
  - 后台保存后，以 `PromptTemplate.content` 为唯一真源
  - 后台列表、详情、按场景读取时，不再用本地提示词文件反向覆盖数据库
- 同时去掉了平台级提示词保存时“顺手回写仓库文件”的逻辑，避免数据库与部署目录形成双写冲突。

## 影响范围

- 后台任务中心现在能看到公众号工作流文章生成任务
- 后台技能中心与品牌技能中心看到的平台提示词基线会稳定来自数据库
- 生产环境的重启、发版、容器替换不再把旧仓库文件重新刷回 `PromptTemplate.content`
- 仓库内 `提示词/` 目录继续保留给首次种子导入、数据库不可用时的 fallback，以及开发阶段文件基线维护

## 代码落点

- 后端：
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/tasks/tasks.service.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 文档：
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/database-archive.md`
  - 本文档

## 验证

- 待执行：
  - `npm --workspace apps/server run lint`
  - `npx tsc --noEmit -p apps/web/tsconfig.json`
  - `GetDiagnostics`
