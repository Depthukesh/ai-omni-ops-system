# 2026-06-18 Dashboard 主题与表单对比度修复

## 背景

- 最近几轮页面迭代后，前端工作台和后台管理页都出现了同一类主题问题：
  - 原生 `<select>` 下拉在部分场景中出现白底白字或浅底浅字。
  - 后台部分输入框、筛选区和详情弹窗文字颜色不稳定。
  - 少量共享卡片、空状态和警告区仍残留浅色主题时期的硬编码背景。
- 这些问题不是单一页面独有，而是集中出现在共享样式层，因此只修某个页面很容易反复回归。

## 本次调整

### 1. 统一共享主题变量

- `apps/web/src/styles/globals.css`
  - 补充 `--foreground`，并让它显式对齐到 `--text-strong`，避免后台历史样式引用不存在的变量后退回继承色。
  - 新增共享变量：
    - `--surface-elevated`
    - `--surface-warning-bg`
    - `--surface-warning-border`
    - `--select-menu-bg`
    - `--select-menu-text`
    - `--select-menu-border`
    - `--overlay-scrim`
  - 暗色和亮色主题都补了对应取值，保证同一套组件在两种主题下都保持可读性。

### 2. 修复原生下拉框菜单颜色

- `apps/web/src/styles/globals.css`
  - 为原生 `select option` / `optgroup` 统一补齐菜单背景和文字颜色。
  - 为以下常用表单容器下的 `select` 增加统一的下拉箭头、右侧留白和交互样式：
    - `.field`
    - `.admin-skill-field`
    - `.admin-provider-field`
    - `.admin-rule-card`
    - `.admin-user-filter-grid`
    - `.admin-user-detail-form`
    - `.personal-list`
- 目标是尽量在小红书、抖音、个人中心和后台管理页之间复用同一套下拉框视觉规则，而不是每个页面单独补样式。

### 3. 修复后台表单文本色失效

- `apps/web/src/styles/globals.css`
  - 将以下区域从不稳定的 `var(--foreground)` / 卡片背景组合，统一切回主题输入层：
    - `.admin-rule-card input/select/textarea`
    - `.admin-user-filter-grid input/select`
    - `.admin-user-detail-form input/select`
    - `.admin-user-filter-summary strong`
    - `.admin-user-row-title`
  - 输入框和筛选框统一改为使用 `--input-bg`、`--text-strong` 和内阴影，避免在暗色背景下出现“控件是浅底、文字又继承了浅色”的情况。

### 4. 收口共享弹窗与说明卡排版

- `apps/web/src/styles/globals.css`
  - `light-data-panel` 增加统一阴影、半径和更稳的内边距。
  - `media-preview-overlay` / `media-preview-dialog` 改为使用主题遮罩与更强的容器底色。
  - `admin-user-modal-overlay` / `admin-user-modal` / `admin-user-confirm-modal` 统一使用主题化遮罩、边框和容器背景。
  - `admin-user-modal-topbar` 增加下边界线，减少弹窗头部和表单区粘连。

### 5. 清理残留浅色硬编码区块

- `apps/web/src/styles/globals.css`
  - 将以下共享区块从写死浅色背景改为主题变量：
    - `note-empty-state`
    - `note-empty-media`
    - `note-video-player`
    - `note-pagination-bar`
    - `package-assembly-form-card`
    - `package-assembly-table-card`
    - `package-assembly-metric`
    - `package-assembly-toggle`
    - `assembly-guidance-card--warning`
- 这样这些组件在后台页、个人中心页和品牌增长页切换主题时不再出现割裂感。

## 修改意图

- 这次优先修“共享层”，而不是只修截图里能看到的单页，因为问题根因主要集中在 `globals.css` 的变量和公共表单样式。
- 统一原生 `select` 菜单与输入底色之后，后续新页面只要复用现有表单类名，就能继承正确主题，不需要再额外做一次 dark 模式兜底。
- 弹窗、卡片和空状态一起收口，是为了减少“控件颜色修好了，但容器层次还是旧风格”的不协调感。

## 影响范围

- 影响页面：
  - `/admin`
  - `/brand-growth`
  - `/douyin`
  - `/xiaohongshu`
  - `/personal-center/*`
- 影响模块：
  - 共享主题变量
  - 通用表单控件
  - 后台弹窗
  - 共享卡片和空状态
- 不涉及后端接口和数据库结构。

## 验证方式

- 手工验证：
  - 在后台管理页打开技能创建、技能安装、用户详情等弹窗，确认下拉框不再出现白底白字。
  - 在小红书、抖音、个人中心的表单区域切换明暗主题，确认输入框、下拉框、说明卡和空状态都保持可读。
  - 检查能力包组装类页面，确认浅底卡片和 warning 卡不再与暗色主题冲突。
- 编译验证：
  - `GetDiagnostics` 检查 `apps/web/src/styles/globals.css`
  - `npm run build:web`

## 相关文件

- `apps/web/src/styles/globals.css`
