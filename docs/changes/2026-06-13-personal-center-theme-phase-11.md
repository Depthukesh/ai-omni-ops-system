# 2026-06-13 个人中心第十一批开发：双主题与整体版式重设计

## 为什么继续重做

- 第十批主要解决了外层深色背景与内层浅色工作区的割裂。
- 但从整体观感看，`personal-center` 仍然更像“把旧后台模块放进新壳层里”，容器、按钮、卡片、工作区目录和概览排版还没有真正统一成一套体系。
- 同时页面缺少显式的主题切换能力，无法在 `dark` 和 `light` 两种模式下保持一致体验。

## 这一批的目标

- 给 `dashboard` 右上角增加 `Dark / Light` 切换按钮。
- 把主题从局部样式调整升级为根级 `data-theme` 变量系统。
- 重新组织 `personal-center` 概览页版式，让账号上下文、优先动作、重点信息、工作区目录形成更清晰的阅读顺序。
- 统一容器、按钮、输入框、状态胶囊、卡片和导航在双主题下的材料语言。

## 主要改动

### 1. 根级双主题系统

- 在 `apps/web/src/app/layout.tsx` 中增加主题初始化脚本。
- 页面进入时会优先读取本地保存的主题，没有记录时再按系统偏好决定初始主题。
- 主题通过 `html[data-theme="dark" | "light"]` 驱动，避免只在某个局部切换颜色。

### 2. 右上角主题切换按钮

- 新增 `apps/web/src/components/theme-mode-toggle.tsx`
- 在 `apps/web/src/app/(dashboard)/layout.tsx` 顶栏右上角接入 `Dark / Light` 切换按钮。
- 切换结果写入 `localStorage`，刷新后仍保持当前模式。

### 3. personal-center 概览重排

- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- 将原来偏列表堆叠式的结构重排为四层：
  - 顶部概览舞台区
  - 优先动作卡组
  - 重点信息双栏
  - 工作区目录矩阵
- 账号摘要和品牌上下文集中到右侧账户卡，左侧保留今日工作入口和概览说明。
- 指标卡、动作卡、待办列表、最近动态和工作区链接重新分层，降低“同一种卡片重复堆满页面”的疲劳感。

### 4. 工作区壳层与控件统一

- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- 重组工作区头部类名，便于对标题区、状态区、品牌选择区和操作按钮区分别控制排版。

### 5. 双主题 token 与组件样式统一

- `apps/web/src/styles/globals.css`
- 增加双主题变量：
  - 页面背景
  - 壳层背景
  - 工作区背景
  - 卡片表面
  - 按钮背景与边框
  - 输入框背景与边框
  - 文本层级
- 顶栏导航、工作区容器、按钮、标签、输入框、表格、头像 fallback、概览卡片、动作卡、目录卡统一接入变量系统。
- 补充 `personal-center` 新布局的响应式规则，保证在 1200px 和 900px 以下能自然折叠。

## 当前验证

- `theme-mode-toggle.tsx`、`layout.tsx`、`dashboard/layout.tsx`、`personal-center/layout.tsx`、`personal-center/page.tsx`、`globals.css` 诊断全部通过。
- 本地浏览器已验证 `http://127.0.0.1:3002/personal-center`
- 已确认：
  - 右上角 `Dark / Light` 按钮可点击
  - `data-theme="dark"` 与 `data-theme="light"` 都能正确生效
  - 新的概览版式、动作卡、账户卡、工作区目录都能正常显示

## 说明

- 浏览器控制台里仍有本地开发态已有的 Fast Refresh / WebView 相关日志，不影响本轮主题切换与页面重设计的视觉验证。

## 后续建议

- 下一步可以把同一套双主题材料系统继续扩展到 `works`、`team`、`invites` 等页，尤其是表格更长、交互更密的页面。
- 等你确认这一版方向后，再单独提交并推送这一批改动。
