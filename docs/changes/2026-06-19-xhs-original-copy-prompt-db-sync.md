# 2026-06-19 小红书原创文案 Prompt 落库收口

## 背景

- 小红书原创笔记最近新增了 3 个文案技能：
  - 科普类文案
  - 测评类文案
  - 避坑类文案
- 首轮开发已经完成前端入口、技能树映射、运行时路由和 Prompt 文件拆分，但在交付口径上存在明显缺口：
  - 新 Prompt 主要停留在代码种子和文件兜底层
  - 没有把“必须最终进入数据库”作为默认交付要求显式写下来
  - 当前本地环境数据库不可达时，也没有给出足够明确的自动落库与阻塞说明

## 本次调整

### 1. 服务启动时自动同步技能注册表

- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `SkillsPromptsService` 改为实现 `OnModuleInit`
  - 服务启动时即调用注册表初始化，数据库可用时自动同步：
    - `SkillConfig`
    - `PromptTemplate`
    - `SkillPromptBinding`
  - 修复了一个隐含问题：
    - 旧逻辑会把初始化 Promise 长期缓存
    - 如果第一次启动时数据库不可达，后续数据库恢复后不会再次尝试同步
  - 现在调整为：
    - 只有真正成功完成数据库初始化后才标记完成
    - 初始化失败或数据库暂不可用时，后续仍可继续重试

### 2. 小红书原创文案 Prompt 正式进入当前仓库

- `提示词/original_copy/original_copy/SKILL.md`
- `提示词/original_copy/science/SKILL.md`
- `提示词/original_copy/review/SKILL.md`
- `提示词/original_copy/avoid_pitfall/SKILL.md`

- 这 4 份 Prompt 文件现在正式进入 `ai-omni-ops-system` 仓库，而不是停留在仓库外目录。
- `apps/server/src/common/prompt-source-loader.ts`
  - 优先从仓库内 `提示词/original_copy/...` 读取内容
  - 避免再次出现“页面只显示短兜底文案、完整 Prompt 不在当前仓库”的情况

### 3. 前端技能中心静态展示同步修正

- `apps/web/src/services/admin.ts`
  - 将 3 个原创文案 Prompt 的静态展示内容从短描述改为完整 Prompt 文本
  - 保证前端在 Mock / 回退场景下，展示口径也与后端真实 Prompt 一致

### 4. 文档规则升级

- `docs/engineering-standards.md`
  - 新增“技能与 Prompt 落库”规则
  - 明确技能类需求默认需要一次性交付：
    - `SkillConfig`
    - `PromptTemplate`
    - `SkillPromptBinding`
    - 前端真实入口
  - 明确数据库不可达时必须说明阻塞，并补自动落库机制，不能让用户猜
- `docs/development-delivery-checklist.md`
  - 补充技能类任务开发前、开发后必须核对的数据库与前端接入清单
  - 明确验证结果里必须写清是否已真实入库，若未入库，阻塞点和自动补偿机制是什么

## 当前状态

- 代码层：
  - 小红书 3 个原创文案 Prompt 已完成技能路由、文件化和自动同步机制
- 数据库层：
  - 当前执行环境本地数据库不可达，报错为 `127.0.0.1:5432` 无法连接
  - 因此本次无法在本地直接验证 `PromptTemplate` 表中的真实写入结果
  - 但在数据库可用的环境中，服务启动后会自动补齐缺失的技能、Prompt 和绑定记录

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/web/src/services/admin.ts`
  - `docs/engineering-standards.md`
  - `docs/development-delivery-checklist.md`
- `npm run build:web`
- `npm run build:server`

## 备注

- 本次不是新增数据库 schema，而是补齐已有注册表机制的自动同步与交付规范。
- 若后续环境数据库恢复可连，应优先通过服务启动后的自动同步或后台真实接口读取，确认这 3 个 Prompt 已进入 `PromptTemplate` 表。
