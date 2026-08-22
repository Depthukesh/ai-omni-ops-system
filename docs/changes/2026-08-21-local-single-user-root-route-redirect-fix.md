# 2026-08-21 local-single-user 根路径重定向修复

## 背景

用户反馈最新版 `local-single-user` 安装包虽然已经能正常打开：

- `http://127.0.0.1:3001/brand-growth`
- `http://127.0.0.1:3011/api/health`

但直接访问根路径：

- `http://127.0.0.1:3001/`

会自动掉进 Next.js 的 `/error`，页面表现为 `500: Internal Error`。

## 根因

当前前端根路由 `/` 仍按官网营销首页实现，运行时会在服务端组件里读取：

- `src/app/landing-page-template.html`

对应代码位于：

- `apps/web/src/app/page.tsx`

该页面对网站版/源码运行态是合理的，但对 `local-single-user` 安装态并不合适：

1. 安装态的真实主入口本来就是工作台，而不是官网营销首页
2. 根路由首页模板读取属于安装态额外依赖，失败后会直接把 `/` 打成错误页
3. 用户现场已经证明主工作台与 API 正常，异常只集中在根路径首页

## 本次改动

修改文件：

- `apps/web/src/app/page.tsx`
- `docs/site-map.md`
- `docs/README.md`
- `docs/changes/2026-08-21-local-single-user-root-route-redirect-fix.md`

### 1. 安装态下把 `/` 直接收口到 `/brand-growth`

`apps/web/src/app/page.tsx` 现在会先判断：

- `APP_RUNTIME_MODE`
- 若未命中，再回退 `NEXT_PUBLIC_APP_RUNTIME_MODE`

如果当前是：

- `local-single-user`

则直接：

- `redirect("/brand-growth")`

不再继续渲染官网营销首页。

### 2. 网站版/源码运行态保持原行为

只有 `local-single-user` 安装态改为重定向。网站版和源码运行态仍保留原来的官网首页模板渲染逻辑，不改变公网首页结构。

之所以不再只依赖 `NEXT_PUBLIC_APP_RUNTIME_MODE`，是因为该值在前端构建阶段就可能被固化；安装包虽然会在 launcher 运行时注入 `APP_RUNTIME_MODE=local-single-user`，但如果根路由只读 `NEXT_PUBLIC_*`，独立发布包里的 `/` 仍可能继续按官网首页渲染，导致用户看到“新包已安装，但访问根路径还是掉进 /error”。

## 补充修正：发包构建链也必须显式带入安装态 runtime mode

后续排查又确认，仅修改 `page.tsx` 里的判断还不够，因为 `apps/web/src/app/page.tsx` 在当前 Next.js 构建结果中会被静态预渲染；如果 `local-single-user` 发布包构建 `build:web` 时没有显式注入：

- `APP_RUNTIME_MODE=local-single-user`
- `NEXT_PUBLIC_APP_RUNTIME_MODE=local-single-user`

那么安装包里的 `/` 仍会在打包阶段被固化成标准网站首页。

因此本次同时把 `scripts/build-local-single-user-release.cjs` 调整为：在生成本地单机版发布物时，Web standalone 一律按 `local-single-user` 模式构建，避免安装态根首页继续被预渲染成网站版。

## 影响面检查

### 受影响范围

- `local-single-user` 安装态访问根路径 `/`
- 安装态浏览器首次打开后的默认落地页

### 不受影响

- `/brand-growth`
- `/personal-center/*`
- `/xiaohongshu`
- `/douyin`
- `/wechat`
- 网站版和源码运行态的官网首页

## 验证

需要重点验证：

- `local-single-user` 安装态访问 `/` 是否直接落到 `/brand-growth`
- `http://127.0.0.1:3001/brand-growth` 是否继续正常可用
- 网站版/源码运行态访问 `/` 是否仍展示官网首页

## 结论

这次修复不是“再改一个端口”，而是收口安装态根路径的职责边界：

- 安装态 `/` 直接落到工作台
- 官网营销首页只留给网站版/源码运行态

这样可以避免本地安装态明明主系统已启动，却因为首页模板链路出错被用户感知成“整个页面打不开”。
