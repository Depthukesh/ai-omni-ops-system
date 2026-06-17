# 2026-06-17 公众号 HTML Prompt 同步与 Dark 字体修复

## 背景

- 公众号 `wechat-html-renderer` 的仓库技能文件已经升级为支持 `htmlStyleConfig` 的强约束版本，但管理端技能中心里仍可能看到旧 prompt。
- 旧内容存在于数据库 `PromptTemplate.content` 中，且此前同步逻辑主要依赖服务启动时回填一次。
- 公众号工作台 `Step 4` 的外层卡片虽然已经切到主题变量，但标题区和状态卡仍残留浅色主题时期的硬编码文字颜色，导致 dark 模式下观感发灰、对比度不足。

## 本次调整

### 1. 公众号 HTML prompt 改为“读库前同步”

- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - 为 `prompt_wechat_html_render` 增加运行时同步逻辑。
  - 在以下读取入口前补一次定向同步：
    - `getPromptById()`
    - `getActivePromptByScene()`
    - `listPromptRows()`
  - 同步条件新增两类兜底：
    - 旧内容仍包含旧摘要，但缺少 `## 参数映射协议`
    - 数据库版本号落后于仓库 seed，且内容仍未进入新协议结构
- 这样即使历史数据已入库，后台再次读取该 prompt 时也会把仓库中的新版技能内容同步到数据库，而不是只依赖启动时机。

### 2. 提升 prompt seed 版本，确保可见升级

- `apps/server/src/common/mock-data.ts`
  - `prompt_wechat_html_render.version` 从 `v1.0` 提升到 `v1.1`
- `apps/web/src/services/admin.ts`
  - 同步更新前端 seed 的版本与摘要，避免管理端接口失败退回 seed 时继续显示旧说明

### 3. 修复 Step 4 dark 模式文字对比度

- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `wechat-stage-copy strong` 改为使用 `var(--site-hero-text)`
  - `wechat-stage-kicker` 改为使用主题化底色和 `var(--site-hero-muted)`
  - `wechat-stage-meta-card` / `wechat-stage-empty` 改为使用主题变量背景、边框与文字色
- 目标是让 Step 4 标题、说明卡和空状态在 dark 模式下保持一致的可读性与层级。

## 验证建议

- 打开后台技能中心，查看 `公众号HTML渲染` 的 prompt 内容是否已包含 `## 参数映射协议`
- 在公众号工作台切换到 dark 模式，确认 `Step 4` 的标题、标签和状态卡文字不再发灰
- 生成 HTML 时，确认后端读取到的 `prompt_wechat_html_render` 已是新版内容
