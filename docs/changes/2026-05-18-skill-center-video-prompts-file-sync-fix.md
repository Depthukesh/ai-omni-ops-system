# 2026-05-18 技能中心视频提示词文件同步修正

## 背景

视频笔记相关提示词虽然已经挂到了前后台技能中心，但实际页面中仍会看到一行简版占位文案，例如：

- `根据剧本、产品图和用户要求，生成故事板提示词。`
- `根据故事板提示词和故事板图片，生成短视频提示词。`

这与实际提示词文件中的完整内容不一致。

## 根因

- 视频提示词文件本身是正确的，源文件位于 `提示词/视频生成提示词/*.txt`
- 问题出在运行时同步链路：
  - 部分场景下提示词文件路径解析不够稳，未命中文件时会回退到数据库里旧的占位内容
  - `PromptTemplate` 首次落库后，旧记录会被 `ON CONFLICT DO NOTHING` 保留，导致数据库中可能长期留存旧的一行内容

## 本次修正

### 1. 强化提示词文件搜索根目录

- 文件：`apps/server/src/common/prompt-source-loader.ts`
- 在原有 `process.cwd()` 搜索根目录之外，新增基于 `__dirname` 的多级回溯根目录
- 兼容不同运行目录、不同启动方式下的文件解析

### 2. 启动时回填文件型 PromptTemplate 内容

- 文件：`apps/server/src/modules/admin/skills-prompts.service.ts`
- 对存在本地提示词文件的 prompt，启动时会把数据库 `PromptTemplate.content` 回填为文件真实内容
- 若内容发生变化，会同步更新时间
- 模型、温度、Tokens 等字段不受影响，仍保持数据库值

## 影响范围

- 前台个人技能中心 `/personal-center/skills`
- 后台技能中心 `/admin`
- 视频笔记相关 6 条提示词

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- `npm --workspace apps/server run build`
- 运行时路径校验：
  - `生成故事板提示词.txt`
  - `短视频提示词.txt`
  均已能在项目运行目录下稳定解析到真实文件

## 后续说明

- 这次修正生效后，需要后端进程重启一次，启动时才会执行数据库内容回填
- 后续若继续新增“文件型提示词”，优先复用这条“文件为准、数据库同步”的路径，不要再只依赖初次 seed 内容
