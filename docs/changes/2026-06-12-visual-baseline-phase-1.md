# 2026-06-12 全站视觉统一第一阶段：基线与认证壳层

## 为什么改

- 用户已经确认要把整个网站逐步统一到首页的品牌调性下，但不能直接把首页的营销排版硬复制到所有页面
- 当前首页、认证页、dashboard 顶层壳层仍处在明显分裂的状态：首页是深色品牌语言，登录/注册和工作台顶栏还是旧的浅色系统
- 如果继续逐页单独修样式，不先抽公共层，后面小红书、抖音、公众号、个人中心、后台会继续各自长成一套

## 这次改了什么

### 1. 在前端全局样式里补第一版品牌视觉基线

- `apps/web/src/styles/globals.css`
  - 新增第一版品牌级视觉变量：
    - `--site-hero-bg`
    - `--site-hero-surface`
    - `--site-hero-border`
    - `--site-hero-text`
    - `--site-hero-muted`
    - `--site-accent`
    - `--site-shadow-*`
  - 收口按钮基础样式，让 `primary-button / secondary-button` 进入统一的圆角、阴影、hover、focus 规则
  - 收口输入框 focus 态，让表单从旧的“业务页默认表单样式”升级到新的统一视觉反馈
  - 新增认证页专用公共壳层样式：
    - `auth-shell`
    - `auth-shell-grid`
    - `auth-brand-panel`
    - `auth-form-panel`
    - `auth-highlight-*`
  - 收口 dashboard 顶层壳层样式：
    - `dashboard-topbar-head`
    - `dashboard-topbar-brand*`
    - `dashboard-topbar-home-link`
    - 深色化 `dashboard-topnav`
    - 深色化邀请通知条 `dashboard-notice-bar-shell`

### 2. 抽出认证页公共壳层组件

- `apps/web/src/components/auth-shell.tsx`
  - 新增通用 `AuthShell`
  - 左侧承接品牌说明、当前入口标签、阶段说明和三条亮点说明
  - 右侧承接真实表单与底部跳转文案
  - 作为后续登录、注册、后台登录等入口的统一基座

### 3. 登录 / 注册 / 后台登录切到同一壳层

- `apps/web/src/app/(auth)/login/page.tsx`
  - 登录页不再使用零散的单卡片内联布局
  - 改为挂载 `AuthShell`
  - 保留原有登录逻辑、`next` 回跳逻辑和错误处理
- `apps/web/src/app/(auth)/register/page.tsx`
  - 注册页改为挂载 `AuthShell`
  - 保留手机号、邮箱、邀请码、昵称、密码校验逻辑
  - 保留注册成功后进入工作台的原逻辑
- `apps/web/src/app/(auth)/admin/login/page.tsx`
  - 管理员登录页改为挂载 `AuthShell`
  - 保留后台角色校验、已有登录态检查与失败清空逻辑

### 4. Dashboard 顶层壳层开始接入同一品牌语言

- `apps/web/src/app/(dashboard)/layout.tsx`
  - 顶部导航新增品牌头部区：
    - `17ai.site`
    - “品牌 / 门店全域运营工作台”说明
    - “返回首页”入口
  - 保留原有主导航、未登录跳转和邀请通知逻辑
  - 这次只统一壳层，不动各业务工作台内部结构

### 5. 文档同步

- `docs/project_planning/61_AI全域运营系统_全站视觉统一改造计划_v1.md`
  - 已先落整站视觉统一的阶段计划
- `docs/site-map.md`
  - 把 `/` 的描述改为官网首页
  - 把未登录跳转更新为 `/login?next=...`
  - 把 `/login`、`/register`、`/admin/login` 的入口描述更新为当前真实状态

## 影响范围

- 官网后的第一跳入口体验
- 前台统一认证入口体验
- Dashboard 顶层导航壳层
- 全站第一批按钮、输入框和品牌视觉 token

## 当前边界

- 这次还没有开始统一品牌增长、小红书、抖音、公众号等工作台内部区块样式
- 这次还没有处理个人中心、订单、会员购买、积分购买等二级页面内容区
- 这次还没有处理后台管理页主体内容区，只先统一了后台登录入口
- 首页目前仍处于“特殊接入 + 逐步站内化”的过渡阶段，后续还要继续收口

## 验证

- 对以下文件执行诊断检查，确认无新增错误：
  - `apps/web/src/styles/globals.css`
  - `apps/web/src/components/auth-shell.tsx`
  - `apps/web/src/app/(auth)/login/page.tsx`
  - `apps/web/src/app/(auth)/register/page.tsx`
  - `apps/web/src/app/(auth)/admin/login/page.tsx`
  - `apps/web/src/app/(dashboard)/layout.tsx`
- 对文档文件执行诊断检查，确认无新增格式错误：
  - `docs/site-map.md`

## 后续建议

- 下一阶段直接进入“工作台壳层统一”，优先收口：
  - `brand-growth`
  - `xiaohongshu`
  - `douyin`
  - `wechat`
  - `more-features/design`
- 再往后进入“个人中心与交易页统一”
- 最后再收后台主体内容区，避免一开始就把复杂后台页面一起卷进来
