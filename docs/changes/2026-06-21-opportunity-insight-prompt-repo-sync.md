# 2026-06-21 机会洞察 Prompt 仓库内同步收口

## 背景

- 用户继续反馈个人中心技能中心中的机会洞察提示词仍然显示短兜底文案，而不是指定的本地提示词文件内容。
- 按 `docs/changes` 历史方案回看后，问题模式与 2026-05-18、2026-06-17、2026-06-19 三次修复高度一致：
  - 不能只在运行时指向仓库外文件
  - 不能只在启动时做一次同步
  - 必须把 prompt 正式纳入当前仓库，并让读取链优先命中仓库内真源

## 根因

- 机会洞察前 3 个 prompt 此前仍主要依赖仓库外同级目录：
  - `../提示词/账号分析.txt`
  - `../提示词/竞品账号分析.txt`
  - `../提示词/评论洞察提示词.txt`
- 线上站点运行时只保证存在 `ai-omni-ops-system` 当前仓库，不保证携带仓库外同级目录。
- 一旦线上找不到这些文件，就会退回 `mock-data.ts` 中的短 fallback 文案，于是技能中心里继续看到：
  - `你是品牌账号分析顾问...`
  - `你是竞品账号分析顾问...`
  - `你是评论洞察分析顾问...`

## 对照文档后的处理方式

### 1. 按 2026-06-19 模式，把 prompt 正式纳入当前仓库

- 新增仓库内文件：
  - `提示词/账号分析.txt`
  - `提示词/竞品账号分析.txt`
  - `提示词/评论洞察提示词.txt`
  - `提示词/机会洞察总报告提示词.txt`

### 2. 按 2026-05-18 模式，优先读取仓库内路径

- `apps/server/src/common/prompt-source-loader.ts`
  - 为机会洞察 4 个 prompt 增加仓库内 `提示词/...` 候选路径，并放在最前
  - 继续保留旧外部路径作为本地兼容 fallback

### 3. 按 2026-06-17 模式，补“读库前同步”

- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `getPromptById()`
  - `getActivePromptByScene()`
  - `listPromptRows()`
- 在上述读取入口前，对 source-pinned 的机会洞察 prompt 先执行同步
- 同步语句增加差异判断，避免每次读取都无意义刷新 `updatedAt`

## 结果

- 机会洞察 4 个 prompt 不再依赖仓库外目录才能显示完整内容
- 数据库中若仍残留旧短文案，读取前也会被仓库内 prompt 同步覆盖
- 技能中心与实际运行链路会优先命中当前仓库中的机会洞察 prompt 真源

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- `npm --workspace apps/server run build`
- `npm --workspace apps/web run build`
- 本地文件命中校验：
  - `提示词/账号分析.txt`
  - `提示词/竞品账号分析.txt`
  - `提示词/评论洞察提示词.txt`
  - `提示词/机会洞察总报告提示词.txt`
  均已存在于当前仓库，并可被运行时路径稳定命中
