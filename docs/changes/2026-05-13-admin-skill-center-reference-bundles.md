# 2026-05-13 后台技能中心目录树恢复与参考资料自动聚合

## 背景

后台 `/admin` 的技能中心页面只剩当前默认选中的一张技能卡，原来的目录树导航没有渲染出来，导致看起来像“只剩一个技能”。同时，提示词读取链路仍然只加载单个 `SKILL.md`，没有把技能目录里的 `00_资料总索引.md`、模块参考稿、原始 `.txt` 与补出的 `.md` 参考文档纳入系统，尤其影响 `xiaohongshu-brand-marketing-plan`、`short-video-api-studio` 等重参考资料技能的生成质量。

## 本次改动

- 恢复后台技能中心的目录树导航，重新展示一级分类、二级分类和三级技能项
- 新增服务端提示词目录聚合器，统一按 `promptId -> 技能源目录` 读取 `SKILL.md + 同目录参考资料`
- 将 `mock-data` 与后台 `SkillsPromptsService` 的提示词读取逻辑统一到同一套聚合器，避免“种子一套、后台展示一套”
- 对数据库中已存在的旧 `PromptTemplate` 记录，读取时也强制回源聚合文件内容，不再被历史旧值挡住
- 对自动聚合参考资料的提示词，后台编辑页改为只读展示，并要求回到原始提示词目录维护，避免误把整份聚合内容回写进 `SKILL.md`
- 将 `xiaohongshu-brand-marketing-plan` 中原本为 `.docx` 的“图文风格类型”参考稿抽出同目录 `.md` 文本版，确保聚合器和运行时都能稳定纳入

## 影响范围

- `apps/web/src/app/(dashboard)/admin/page.tsx`
- `apps/server/src/common/prompt-source-loader.ts`
- `apps/server/src/common/mock-data.ts`
- `apps/server/src/modules/admin/skills-prompts.service.ts`
- `提示词/xiaohongshu-brand-marketing-plan/xiaohongshu-brand-marketing-plan/小红书图文风格类型.md`
- `提示词/_xhs-plan-skill/xiaohongshu-brand-marketing-plan/小红书图文风格类型.md`

## 验证

- 使用 `GetDiagnostics` 检查本轮新增或修改的前后端文件，未发现新增诊断错误
- 执行 `npm run build:web`
- 执行 `npm run build:server`
- 手工确认后台技能中心重新具备目录树导航
- 手工确认 `xiaohongshu-brand-marketing-plan`、`short-video-api-studio` 等提示词内容会展示自动聚合后的参考资料

## 后续说明

- 自动聚合当前默认读取技能源目录下的顶层 `.md` / `.txt` 参考资料，不读取 `outputs/`、`scripts/`、`__pycache__/` 等运行产物目录
- 若后续还有新的 `.docx` 参考稿进入技能目录，需同步补出可读的 `.md` / `.txt` 文本版，避免运行时再次漏读
- 若后续想继续支持“后台直接编辑聚合型提示词”，需要单独设计“主提示词/参考稿分区编辑”能力，不能继续把整份聚合内容直接回写单个 `SKILL.md`
