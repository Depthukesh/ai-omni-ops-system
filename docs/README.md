# AI全域运营系统文档中心

## 目标

`docs/` 只保留对当前开发和交付真正有用的文档。

判断标准只有三条：

1. 能解释当前系统真实结构和真实规则
2. 能帮助后续开发更快定位代码与边界
3. 能追踪重要变更，而不是堆积重复方案和展示镜像

## 文档分层

### 1. 核心基线

这些文件是当前系统的真相来源，必须长期保持最新。

- `docs/site-map.md`
  - 文字版系统地图，回答“有哪些入口、由哪些模块承接、主链路是什么”
- `docs/site-map-mermaid.md`
  - Mermaid 可视化地图，帮助快速建立全局结构认知
- `docs/engineering-standards.md`
  - 当前默认工程规则与实现边界
- `docs/git-workflow.md`
  - 当前 Git 暂存、提交、拆分、备份规则
- `docs/development-delivery-checklist.md`
  - 开发前后必须补齐的交付闭环
- `docs/database-archive.md`
  - 正式持久化边界、主要表与业务映射
- `docs/generated-content-storage-standards.md`
  - 作品、报告、媒体副本的存储与访问规则

### 2. 当前仍在使用的专题方案

这些文档不是全局基线，但仍然服务于当前系统。

- `docs/personal-center-multi-user-system-plan.md`
  - 个人中心、多用户、品牌协作与权限设计
- `docs/system-refactor-roadmap.md`
  - 当前结构收口与重构路线
- `docs/production-web-port-conflict-recovery.md`
  - 生产前端端口冲突与 PM2 接管排障
- `docs/openclaw/README.md`
  - OpenClaw 文档入口索引
- `docs/openclaw/*.md`
  - OpenClaw 接入、权限、Skill、MCP 和安装说明

### 3. 变更记录

- 目录：`docs/changes/`
- 作用：记录重要改动的背景、范围、验证和后续事项
- 要求：真实代码改动默认同步补一条变更记录

### 4. 历史规划与阶段草案

- 目录：`docs/project_planning/`
- 定位：历史规划草案与阶段设计稿
- 使用方式：仅作背景参考，不作为“当前系统真相”
- 规则：如果其中内容已经被代码落实，应以 `site-map`、`engineering-standards`、`database-archive` 和 `changes/` 为准

### 5. 输出报告

- `docs/*.html`
- 只保留当前仍需要交付或汇报的 HTML 报告
- 不再保留与 Markdown 一一重复的展示镜像
- 面向站点用户公开访问的交付型 HTML，如 OpenClaw 安装说明页，放在 `apps/web/public/docs/`，不计入 `docs/` 源文档体系

## 当前推荐阅读顺序

### 开发前

1. `docs/engineering-standards.md`
2. `docs/site-map.md`
3. `docs/site-map-mermaid.md`
4. `docs/development-delivery-checklist.md`
5. 当前任务最近的一条 `docs/changes/*.md`

### 按任务补读

- Git 边界、提交拆分、快照备份：`docs/git-workflow.md`
- 数据库、迁移、正式入库：`docs/database-archive.md`
- 资源副本、作品、报告、媒体：`docs/generated-content-storage-standards.md`
- 个人中心、多用户、品牌协作：`docs/personal-center-multi-user-system-plan.md`
- OpenClaw：`docs/openclaw/README.md`

## 文档维护规则

- 代码改动和文档改动属于同一项工作
- 入口、模块、主流程变更时，先改 `site-map.md` 与 `site-map-mermaid.md`
- 通用规则变更时，改 `engineering-standards.md`
- Git 约束变化时，改 `git-workflow.md`
- 数据边界变化时，改 `database-archive.md`
- 真实代码改动后，补 `docs/changes/*.md`
- 历史草案如果已经失去储存价值，应删除；如果仍有背景价值，但不代表当前实现，应明确放在专题或规划层，不进入核心基线
- 不再保留与 Markdown 内容重复的 HTML 镜像文档

## 本次整理后的原则

- `docs/` 主目录优先放“当前真相”
- `docs/changes/` 保留演进历史
- `docs/project_planning/` 保留历史规划稿，但不再混充当前实现
- 已放弃的多-agent 方案文档已经移除，不再作为当前开发模式的一部分

## 最近应优先关注的文档

- `docs/2026-06-14-docs-audit-report.html`
  - 本轮系统文档全面清理、代码对照和删改结果总报告
- `docs/changes/2026-06-13-docs-baseline-cleanup.md`
  - 本轮文档清理、修复和删除说明
- `docs/changes/2026-06-16-douyin-ad-preaudit-and-vod-upload.md`
  - 抖音广告预审、作品区视频上传到 VOD、品牌默认配置与首屏加载修复说明
- `docs/changes/2026-06-19-douyin-remix-short-video-workspace.md`
  - 抖音独立复刻短视频板块、15 秒分段复刻流程、拼接成片与技能注册说明
- `docs/changes/2026-06-10-knowledge-binding-runtime-and-docs-sync.md`
  - 知识绑定从治理层进入运行时后的同步口径
- `docs/changes/2026-06-03-wechat-workspace-and-publishing.md`
  - 公众号工作台与发布链路
- `docs/changes/2026-06-03-design-workspace-real-data-and-provider-integration.md`
  - 设计工作台真实数据接入
- `docs/changes/2026-06-12-personal-center-overview-and-openclaw-phase-3.md`
  - 个人中心与 OpenClaw 阶段收口
