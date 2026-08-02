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
- `docs/production-stability-and-performance-remediation-plan.md`
  - 生产稳定性、部署降压、首屏性能和慢任务异步化治理方案
- `docs/wechat-infrastructure-refactor-plan.md`
  - 公众号 Step 2-5 单一事实源、服务拆分与底层改造方案
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

### 6. 外部表达资产

- `../文章/`
- 存放面向外部传播的长文、配图和深度讲解材料
- 不作为系统开发真相来源，但可以作为对外介绍系统技术架构、业务链路和方法论的交付资产

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

- `docs/changes/2026-08-03-version-page-log-focused-layout-and-oss-history.md`
  - 版本与升级页收口为“当前版本 / 最新版本”两张版本卡 + “系统更新日志”；OSS `latest.json` 同步补入 `appVersion` 与 `history`，后续更新记录可持续累积
- `docs/changes/2026-08-02-local-single-user-open-register-and-local-data-root.md`
  - `local-single-user` 安装态注册改为免邀请码，并在个人中心安全页补入本地资料目录设置；目录配置写入 `launcher-settings.json`，下次重启时迁移并切换到新的本地资料根
- `docs/changes/2026-07-28-personal-center-version-update.md`
  - 个人中心新增“版本与升级”页：后端通过 `system/update/*` 检查 OSS `latest.json`、预下载并校验 `AiOmniOps-local-single-user-win-x64.zip`，安装态再通过独立 updater 执行本地替换与重启
- `docs/changes/2026-07-27-readme-install-guide-and-repo-slimming.md`
  - 把根 `README.md` 重写为安装和使用教程，明确说明当前仓库为什么没有 `.exe`，并清理根目录调试笔记、`.dbg/` 旧排障文件与误生成命令输出文件
- `docs/changes/2026-07-27-system-quote-workbook-script.md`
  - 把残留的报价清单生成脚本收口为可复用的仓库内辅助脚本：默认输出改到 `.runtime/generated/quote-workbooks/`，支持 `--output` 自定义路径，并在缺少 `openpyxl` 时给出明确安装提示
- `docs/changes/2026-07-27-deploy-secret-preflight-skip.md`
  - 新仓库首次接入自动部署时，若仓库级 ECS SSH Secrets 还未迁移完成，workflow 现在会先给出缺失项提示并跳过 deploy，而不是把环境未配置直接报成代码失败
- `docs/changes/2026-07-27-local-single-user-git-hygiene.md`
  - `local-single-user` 交付链进入真实打包与安装验证后，补齐 `.release/`、`*.tsbuildinfo`、`.dbg/trae-debug-log-*.ndjson` 与临时调试笔记的 Git 边界，避免无关产物继续混入同步提交
- `docs/changes/2026-07-27-local-single-user-release-installer-and-zip-package.md`
  - `local-single-user` 方案 A 交付链继续前推：在 release bundle 基础上补 `install-local-single-user` 安装入口、`local:release:package` 压缩打包脚本，以及 `.zip + .sha256` 分发制品
- `docs/changes/2026-07-27-local-single-user-release-bundle.md`
  - `local-single-user` 方案 A 交付链继续前推：新增发布物打包脚本、随包 `node.exe`、双击启动入口与 autostart 辅助入口，形成 `.release/local-single-user-win-x64` 目录
- `docs/changes/2026-07-27-local-single-user-web-runtime-isolation.md`
  - `local-single-user` 交付级启动链收口：将 live Web 进程切到 runtime 隔离运行包，避免源码目录 fresh `next build` 继续扰动正在服务用户的主站
- `docs/changes/2026-07-26-wechat-workflow-initialization-validation.md`
  - `local-single-user` 公众号工作台验证补点：确认 fallback 偏好不等于真实初始化，并继续把同一条 workflow 推进到生图、HTML、发布确认和页面级回显，当前正式发布只剩公众号官方配置阻塞
- `docs/changes/2026-07-26-local-single-user-launcher-prisma-db-push-reuse.md`
  - `local-single-user` launcher 启动链继续收口：为 `Local Prisma db push` 补上 runtime 绑定的受控复用，并修正主流程里一度出现的重复执行问题
- `docs/changes/2026-07-26-local-single-user-launcher-server-build-reuse.md`
  - `local-single-user` launcher 启动链收口：确认长步骤周期性报活仍保留，并补上 `server build` 的输入指纹复用与 `skip` 日志
- `docs/changes/2026-07-26-report-provider-fallback-brand-key-fix.md`
  - 报告类 Provider fallback 在缺品牌共享 Key 时被提前打断的修复记录；本轮已补到 `机会洞察总报告` 与 `品牌增长报告` 的真实成功验证
- `docs/changes/2026-07-23-local-single-user-phase-1-foundation.md`
  - `local-single-user` 第一阶段兼容改造：本地目录、SQLite、默认用户/品牌、认证旁路、launcher standalone Web 闭环与重复启动防抖、沙箱内自动跳过浏览器拉起、主导航路由验证、控制台噪音归因，以及 OpenClaw、知识库、品牌知识桥接、用户技能、第三方平台配置等 SQLite 冷路径兼容修复
- `docs/local-single-user-availability-status.md`
  - 当前 live runtime 的功能可用性快照：launcher、核心工作台、OpenClaw、RunningHub、direct-video、brand-growth 等板块的可用/部分可用状态表
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-5.md`
  - 公众号 Step 5 发布前收口下沉与 `WechatWorkflowPublishService`
- `docs/changes/2026-07-14-production-stability-remediation-phase-1.md`
  - 生产稳定性治理第一阶段：系统方案文档与运行时调试收口
- `docs/changes/2026-07-15-deploy-runner-build-offload.md`
  - 部署链治理第二阶段：将 `npm ci + build` 前移到 GitHub Runner
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-4.md`
  - 清理 `WorksService` 中历史遗留的公众号 HTML helper
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-3.md`
  - Step 4 覆盖率校验、规则渲染 fallback 与 HTML renderer service
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-2.md`
  - Step 2 canonical 正文正式接入与 Step 3/4 开始消费 canonical
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-1.md`
  - 公众号 canonical service 初始拆分与底层改造第一阶段
- `docs/2026-06-14-docs-audit-report.html`
  - 本轮系统文档全面清理、代码对照和删改结果总报告
- `docs/changes/2026-06-22-system-deep-dive-article-and-doc-index.md`
  - 技术与业务深度长文、文章目录资产与文档索引补充说明
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
