# 2026-06-12 个人中心第一批上线：壳层统一与安全页修复

## 为什么改

- 线上个人中心仍停留在旧的浅色工作台壳层，和首页已经切换的品牌语言不一致。
- 安全页虽然已经接入功能，但存在大面积中文乱码，无法作为正式用户界面上线。
- 这一批优先做“用户能立刻看到变化”的低风险收口，不碰接口协议和后端逻辑。

## 这次改了什么

### 1. 统一 Dashboard 顶部壳层

- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/styles/globals.css`

改动内容：

- 为工作台补充品牌头部区、返回首页入口和统一的深色导航视觉。
- 收口顶部导航、按钮、输入框和表单 focus 规则，让已登录区域和首页保持同一品牌语言。
- 仅调整视觉层与交互反馈，不改现有业务路由、鉴权和数据请求。

### 2. 修复个人中心安全页中文文案

- `apps/web/src/app/(dashboard)/personal-center/security/page.tsx`

改动内容：

- 修复安全页标题、副标题、按钮、空态、提示语和表单占位文案中的乱码。
- 收口 Token 状态、品牌上下文、邮箱验证、头像上传、密码修改等用户可见说明。
- 保留原有 `getMe`、`switchBrand`、`updateProfile`、`uploadProfileAvatar`、`changePassword` 等逻辑不变。

## 明确不改的内容

- 不改登录链路和鉴权逻辑。
- 不改任何后端接口、数据库结构和权限规则。
- 不新增额外接口请求，不增加服务器常驻进程或计算负担。
- 不为了美化新增重动画、大图资源或前端高开销效果。

## 影响范围

- 个人中心工作台壳层
- 个人中心安全页
- 工作台内通用按钮、输入框和顶部导航的视觉反馈

## 验证

- `apps/web/src/styles/globals.css` 诊断通过
- `apps/web/src/app/(dashboard)/layout.tsx` 诊断通过
- `apps/web/src/app/(dashboard)/personal-center/security/page.tsx` 诊断通过

## 后续建议

- 下一批继续收口：
  - `personal-center/team`
  - `personal-center/third-party-platforms`
  - `personal-center/invites`
  - `personal-center/skills`
- 后续每一批仍保持两个边界：
  - 不影响现有功能
  - 不增加服务器长期负担
