# 2026-06-19 技能中心 Open Design 退场与排版收口

## 背景

- 技能中心最近几轮能力扩展后，后台技能页开始出现明显的视觉噪声：
  - 左侧筛选区域复用了不适合当前场景的多列表单网格。
  - 技能详情区域容器嵌套过深，层级关系不清晰。
  - 输入区、Prompt 区和资产区都使用近似样式，导致页面重点不突出。
- 同时，历史遗留的 `Open Design` 技能和提示词已经不再是前端真实工作流的一部分：
  - 前端未实际使用这些旧技能分组。
  - 旧提示词内容与当前设计工作台定位不一致。
  - 如果只隐藏前端入口，数据库中的旧技能、旧 Prompt 和旧绑定仍可能继续残留。

## 本次调整

### 1. 前端技能树与设计工作台去除 Open Design 露出

- `packages/shared/src/skill-center-manifest.ts`
  - 删除共享清单中的 Open Design 旧分组，不再向技能中心暴露这些历史技能入口。
  - 保留仍在使用的 `design-*` 技能，但描述文案改为直接说明用途，不再以 “对应 Open Design 某方向” 命名。
- `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
  - 将设计工作台的说明文案改成通用设计工作台表述，不再向用户展示 Open Design 品牌或组织方式。

### 2. 彻底移除 Open Design 旧技能与旧 Prompt 种子

- `apps/server/src/common/mock-data.ts`
  - 删除 `skill_open_design_*` 技能种子。
  - 删除 `prompt_open_design_*` Prompt 种子。
  - 将保留的 `design-*` 技能描述改写为通用设计能力说明，去掉所有 Open Design 方向性文案。
- `提示词/open-design/`
  - 删除全部 `prompt_open_design_*` 目录。
  - 保留的 `prompt_design_*` 文件统一去掉 Open Design 角色描述和措辞。
- `apps/server/src/common/prompt-source-loader.ts`
  - 收窄 Prompt 文件自动查找规则，只继续支持 `prompt_design_*`，不再主动兼容 `prompt_open_design_*`。

### 3. 后端启动时清理历史数据库残留

- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - 删除 Open Design 旧技能的 fallback 绑定定义。
  - 新增退役清理名单：
    - 旧 skill id
    - 旧 skill slug
    - 旧 prompt id
    - 旧 prompt scene
  - 在后台技能/Prompt 注册流程中加入 `removeRetiredOpenDesignArtifacts()`：
    - 删除 `SkillPromptBinding` 中相关旧绑定
    - 删除 `PromptTemplate` 中相关旧 Prompt
    - 删除 `SkillConfig` 中相关旧技能
    - 同步清理内存种子缓存，避免页面重新读出旧数据

### 4. 收口后台技能页排版层级

- `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - 将左侧筛选区域替换为技能中心专用布局类，不再复用用户管理页的表单网格。
  - 技能详情区按信息块重新分层：
    - 顶层外壳
    - 输入区
    - Prompt 与资源区
    - 输出区
  - 通过更轻的中间容器减少“卡片套卡片”的视觉堆叠。
- `apps/web/src/styles/globals.css`
  - 新增技能中心专用布局样式：
    - `admin-skill-filter-grid`
    - `admin-skill-form-shell`
    - `admin-skill-section-card`
    - `admin-skill-stack-card`
    - `admin-skill-assets-grid`
  - 压低内部堆叠容器的边框和背景强度。
  - 缩短 textarea 的默认高度，减少单屏挤压感。
  - 为窄屏补充单列回落，避免侧栏与资源区继续显得拥挤。

## 影响范围

- 影响模块：
  - 后台技能中心
  - 设计工作台
  - 技能/Prompt 种子与注册流程
- 影响文件：
  - `packages/shared/src/skill-center-manifest.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
  - `apps/web/src/styles/globals.css`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `提示词/open-design/*`
- 不涉及：
  - 数据库 schema 变更
  - 其他业务工作台流程
  - 设计工作台现有 `design-*` 技能的运行入口

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/web/src/app/(dashboard)/admin/admin-page-client.tsx`
  - `apps/web/src/styles/globals.css`
- `npm run build:web`
- `npm run build:server`

## 备注

- 当前仓库中仍保留少量 `Open Design` 字样，仅存在于后台清理旧数据库记录所需的退役名单常量里，不会再作为前端展示或运行时能力入口对外暴露。
