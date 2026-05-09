# AI全域运营系统文档中心

## 目的

本目录用于沉淀项目的结构化文档，避免随着系统复杂度上升，出现“功能已存在但没人说得清”“改动已发生但找不到原因”的情况。

从现在开始，代码修改默认同时更新文档。

## 文档分层

### 1. 全站地图

- 文件：`docs/site-map.md`
- 作用：记录系统当前有哪些页面、模块、接口、主链路，以及各部分之间的依赖关系
- 更新时机：新增页面、模块、接口、主流程，或调整入口关系时
- 可视化补充：`docs/site-map-mermaid.md`
- 作用：用 Mermaid 图把页面、工作区、service、API、模块、数据模型和运行脚本串成一张可追踪结构图

### 2. 变更记录

- 目录：`docs/changes/`
- 作用：记录每次重要代码修改的背景、目标、方案、影响范围、验证方式和后续事项
- 更新时机：每次有实际代码修改时

### 3. 专题复盘

- 示例：`docs/brand-growth-retro-2026-05-04.md`
- 作用：对某一阶段、某一问题、某一链路做深入复盘，不替代日常变更记录

### 4. 开发规范

- 文件：`docs/engineering-standards.md`
- 作用：沉淀前端、后端、扩展、资源、文档和 Git 的统一开发规则，作为后续开发默认遵循的基线
- 更新时机：发现新的工程共性问题、调整默认架构边界、确定新的通用约束时

### 5. 开发交付清单

- 文件：`docs/development-delivery-checklist.md`
- 作用：定义每次开发前必须明确哪些信息、开发后必须补齐哪些记录，作为任务交付闭环清单
- 更新时机：当开发流程、交付要求、必填信息项发生变化时

### 6. 数据库存档

- 文件：`docs/database-archive.md`
- 作用：记录数据库构建方式、正式表结构、业务板块与数据表映射，以及仍处于 mock / 文件过渡态的部分
- 更新时机：新增或调整 `prisma/schema.prisma`、迁移文件、持久化结构、技能/提示词注册表或业务板块入库边界时

### 7. 专项方案

- 文件：`docs/personal-center-multi-user-system-plan.md`
- 作用：记录个人中心、多用户、品牌成员协作、任务中心、用户技能覆盖层、会员积分和后台用户管理的整体目标方案与执行路径
- 更新时机：相关模块的权限模型、数据模型、执行阶段或页面结构方案发生变化时

## 记录原则

### 全站地图必须回答

1. 现在系统有哪些真实功能
2. 每个功能入口在哪里
3. 前后端分别由哪些模块承接
4. 哪些是已完成、哪些是占位、哪些是过渡方案

### 变更记录必须回答

1. 为什么改
2. 改了什么
3. 影响哪些页面、接口、模块
4. 如何验证
5. 还有什么风险或后续事项

## 执行约定

- 代码变更与文档变更视为同一工作的一部分
- 重要功能完成后，至少新增一条 `docs/changes/*.md`
- 涉及系统结构变化时，必须同步更新 `docs/site-map.md`
- 涉及开发流程、交付要求、记录清单变化时，必须同步更新 `docs/development-delivery-checklist.md`
- 涉及数据库结构、持久化边界或模块入库路径变化时，必须同步更新 `docs/database-archive.md`
- 涉及大模块技术路线、权限模型、数据分层或执行路径变化时，必须同步更新对应专项方案文档
- 如果只是很小的样式或文案调整，可合并记录到最近一次相关变更中，但不能完全不记

## 开发前必读

每次进入实际开发、排查、联调、重构、提交流程前，默认至少先读下面这些文档：

- `docs/engineering-standards.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/development-delivery-checklist.md`
- 与当前任务最近的一条 `docs/changes/*.md`

按任务类型追加必读：

- 涉及 Git 边界、提交拆分、快照备份：`docs/git-workflow.md`
- 涉及数据库 schema、迁移、正式入库边界：`docs/database-archive.md`
- 涉及资源生成、作品副本、发布素材：`docs/generated-content-storage-standards.md`
- 涉及个人中心、多用户、品牌协作：`docs/personal-center-multi-user-system-plan.md`

## 开发后必更

每次发生实际代码改动后，默认至少补齐下面这些记录：

- 必更：`docs/changes/*.md`
- 结构或入口变化：`docs/site-map.md`
- 结构关系变化：`docs/site-map-mermaid.md`
- schema、迁移、持久化边界变化：`docs/database-archive.md`
- 通用工程规则变化：`docs/engineering-standards.md`
- 开发流程或交付清单变化：`docs/development-delivery-checklist.md`
- Git 规则、快照、暂存策略变化：`docs/git-workflow.md`
- 新增文档类型或索引变化：`docs/README.md`

交付时还必须说明：

- 做了哪些验证、哪些通过、哪些没做
- 本次提交范围与提交信息
- 是否还有未纳入提交的剩余改动
- 当前待解决事项和下一步建议
