# AGENTS.md

## 1. 适用范围

- 本文件适用于本仓库内所有开发、排查、联调、文档更新、提交流程。
- 目标是让任何后续 Agent 或协作者进入任务时，都按同一套开发闭环、Git 边界和文档规则执行。

## 2. 强制工作方式

- 后续默认通过对话推进开发。
- 默认流程是：先本地开发与验证，等用户确认后再提交到 GitHub，由 GitHub Actions 自动部署到阿里云。
- 如果用户本轮明确要求“直接提交并推送”或给出其他更高优先级指令，以用户当轮要求为准。
- 长任务、排查任务、构建任务执行过程中，必须持续同步阶段进展，不能长时间无反馈。
- 用户只说“更新一下”时，默认不是单点修改，而是执行完整闭环：
  - 更新代码
  - 更新开发规范
  - 更新文字网站地图
  - 更新 Mermaid 网站地图
  - 更新变更记录
  - 做 Git 备份
  - 交付时说明验证结果与未纳入提交的剩余改动

## 3. 任务开始前必须执行

- 先到 `docs/` 查看是否有相关文档；如果有，先读再开始执行任务。
- 以下 4 个文档必看，读完再执行任务：
  - `docs/engineering-standards.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
- 按当前项目基线，进入实际开发前还必须再看：
  - `docs/development-delivery-checklist.md`
  - 与当前任务最近的一条 `docs/changes/*.md`
- 如果任务类型命中特定领域，还必须补读：
  - Git 边界、提交拆分、备份策略：`docs/git-workflow.md`
  - 数据库 schema、迁移、正式入库边界：`docs/database-archive.md`
  - 资源生成、作品副本、发布素材：`docs/generated-content-storage-standards.md`
  - 个人中心、多用户、品牌协作：`docs/personal-center-multi-user-system-plan.md`
- 如果要修改的是已有页面、已有工作区、已有链路，开始动手前必须额外回看：
  - `docs/site-map.md` 中对应板块的具体条目
  - `docs/site-map-mermaid.md` 中对应板块的具体关系
  - 最近相关的 `docs/changes/*.md`
- 如果回看后发现本次准备采用的方案与既有开发思路、页面结构、交互逻辑或数据链路不一致，必须先向用户说明冲突点并确认，不能直接改。
- 开始开发前，要先明确：
  - 任务标题
  - 任务类型
  - 目标板块
  - 影响范围
  - 代码落点
  - 验证方式
  - Git 边界

## 4. 开发中必须遵守

- 页面和 controller 只做入口编排，复杂逻辑下沉到 hook、service、gateway、repository、mapper。
- 共享协议、共享类型、共享工具优先收敛到 `packages/shared`，不要重复硬编码。
- 外部集成统一放 gateway 或 adapter，不把第三方调用散落在页面或主业务 service 中。
- 运行时配置统一从后台配置中心或配置模块读取，不直接在业务链路里散写 `process.env`、旧 demo provider、散落 txt 或硬编码模型名。
- 新功能先判断是否已有可复用能力，再决定新增代码位置。
- 新资源先考虑长期可访问性，再决定存储方案。
- 所有作品创作默认都必须显式设置“账号角色”，并把该字段写入作品主记录 `MediaAsset.metadataJson`，不能只停留在前端临时状态。
- 如果任务执行时间较长，必须持续记录并同步：
  - 当前做到哪一步
  - 已确认的真实原因
  - 哪些是假设、哪些已验证
  - 哪个问题已修、哪个还没修
  - 是否出现新的风险、边界变化或无关改动

## 5. 验证规则

- 不能只停留在“代码写完”或“build 通过”。
- 只要条件允许，必须优先做真实链路验证，而不是只做静态阅读。
- 至少按任务需要覆盖以下一种或多种验证：
  - `GetDiagnostics`
  - 前端构建
  - 后端构建
  - 接口调用验证
  - 页面联调验证
  - 真实主链路手工验证
- 如果任务涉及部署链、PM2、Nginx、端口、运行用户或 Secrets，还必须补服务器侧验证：
  - 服务器工作区是否干净
  - 监听端口是否只绑定本机
  - 健康检查是否通过
  - 运行用户是否正确
  - 关键环境变量/Secrets 是否真的进入目标进程

## 6. 任务结束时必须执行

- 再次检查以下 4 个文档是否需要更新：
  - `docs/engineering-standards.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
- 如果内容较多，必须单独建立一篇 `docs/changes/*.md` 或专题文档详细说明，并在上面匹配的总文档中引用该文档。
- 任何实际代码改动，默认至少新增或更新一条 `docs/changes/*.md`。
- 满足下列条件时，必须同步更新对应文档：
  - 结构、入口、主链路变化：`docs/site-map.md`
  - 结构关系变化：`docs/site-map-mermaid.md`
  - schema、迁移、正式持久化边界变化：`docs/database-archive.md`
  - 通用工程规则变化：`docs/engineering-standards.md`
  - 开发流程、交付规则、必读/必更变化：`docs/development-delivery-checklist.md`
  - Git 边界、暂存策略、备份流程变化：`docs/git-workflow.md`
  - 新增文档类型或索引变化：`docs/README.md`
- 更新 `docs/site-map.md` 时，要把本次对应的 `docs/changes/*.md` 作为“参考变更”挂到相关位置。
- 交付时必须说明：
  - 改了哪些文件
  - 做了哪些验证
  - 哪些通过、哪些没做
  - 本次提交范围
  - 未纳入提交的剩余改动
  - 当前待解决事项与下一步建议

## 7. Git 与提交规则

- 每次重要改动都要提交，不长期堆积大量未提交修改。
- 一个提交只解决一类问题，不混入无关改动。
- 提交前必须至少完成最低限度验证。
- 如果工作区里已有无关改动，必须显式缩小 `git add` 范围，只提交本次任务涉及的文件。
- 交付说明里必须写清：
  - 本次提交覆盖哪些文件
  - 哪些剩余改动未纳入
  - 为什么未纳入
- 推荐提交前缀：
  - `feat:`
  - `fix:`
  - `refactor:`
  - `docs:`
  - `chore:`
- 本项目本地 Git 身份默认使用：
  - `user.name=allentry`
  - `user.email=allentry@126.com`

## 8. 行尾与假修改处理

- 当前仓库在 Windows 下容易出现 `CRLF/LF` 导致的假修改。
- 如果 `git status --short` 显示文件被修改，但 `git diff` 基本没有真实业务内容、主要只出现 `CRLF will be replaced by LF` 警告，应优先判断是否属于行尾噪音，而不是直接把它们当作真实改动提交。
- 处理这类文件时，必须先划清哪些是真实业务修改、哪些只是行尾或索引刷新导致的临时 `M` 状态。

## 9. 强制禁止事项

- 不读基线文档就直接开始改代码。
- 发现准备采用的方案与既有实现冲突，却不经用户确认直接改。
- 只改代码不补文档。
- 只说“已完成”却不写验证方式。
- 在混合工作区里把无关改动一起提交。
- 遇到长任务时长时间无进度反馈。
- 将发布主体、账号角色等结构化业务字段只做成前端展示态而不入库。

## 10. 默认目标

- 任何任务都要做到：
  - 入口清楚
  - 边界清楚
  - 验证清楚
  - 文档清楚
  - Git 清楚
  - 待办清楚

- 如果以上任一项缺失，该任务都不算完整闭环。

## 11. 当前阶段进度快照

### 11.1 小红书结构治理

- 截至 `2026-05-19`，小红书结构治理第一阶段可以视为“主收益区已完成一轮收口”。
- 当前已完成的主线包括：
  - `note-create-modals.tsx` 已收口为纯导出层
  - 原创、二创、视频三类创建弹窗已拆为独立壳层文件
  - 三类创建弹窗字段区已拆为独立子组件
  - 创建弹窗公共外壳已统一到 `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`
  - 创建弹窗静态文案已统一到 `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-copy.ts`
  - `note-workspaces.tsx` 内视频详情区的阶段派生、props 装配、挂载层已分别拆到独立文件
  - 工作区模态挂载层已统一收口

### 11.2 当前建议暂停点

- 创建弹窗主链路和视频详情区主链路已经相对干净。
- 如果继续在这两个区域内部深挖，边际收益开始下降。
- 后续更值得继续优化的区域，优先转向：
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`

### 11.3 恢复前必看

- 恢复小红书结构治理前，必须先读：
  - `docs/xiaohongshu-structure-governance-handoff-2026-05-19.md`
  - `docs/changes/2026-05-19-xiaohongshu-structure-governance-winddown.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/system-refactor-roadmap.md`

### 11.4 恢复时必须遵守

- 只做低风险、可独立提交的小步拆分。
- 不改 API 协议。
- 不改数据库结构。
- 不改主业务流程。
- 每一刀都必须同步更新：
  - `docs/changes/*.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
