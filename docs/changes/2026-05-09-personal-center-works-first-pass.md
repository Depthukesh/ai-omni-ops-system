# 2026-05-09 个人中心作品中心第一版

## 1. 变更背景

- 个人中心已经拆出 `/tasks`、`/team`、`/invites`、`/orders`，但“我的作品”仍停留在概览页聚合展示，无法独立承接后续作品分类和用户资产沉淀
- 当前后端 `MediaModule` 已具备按当前登录用户过滤媒体资产的基础能力，适合先补一个最小可用的作品中心

## 2. 本次目标

- 新增 `/personal-center/works`
- 让用户可以在个人中心独立查看当前账号沉淀下来的作品资产
- 提供作品范围筛选、类型筛选、关键词搜索、小红书工作台回跳和源文件打开
- 不扩 schema，不额外拉大媒体和作品后端改动范围

## 3. 本次修改

### 3.1 前端路由壳

- 更新 `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- 个人中心二级导航新增：
  - `作品中心`
- 路由壳说明同步补充当前已拆出的任务、订单、作品、团队、邀请五类工作区

### 3.2 作品中心页面

- 新增 `apps/web/src/app/(dashboard)/personal-center/works/page.tsx`
- 当前能力：
  - 校验登录态
  - 读取真实 `/auth/me`
  - 读取真实 `/media`
  - 支持品牌上下文切换与退出登录
  - 支持作品范围筛选、作品类型筛选、关键词搜索
  - 优先识别并展示小红书作品资产
  - 支持回跳 `/xiaohongshu?workId=...`
  - 支持打开 `sourceUrl`
  - 作品接口失败时回退 `mediaSeed`

### 3.3 文档同步

- 更新 `docs/site-map.md`
- 更新 `docs/site-map-mermaid.md`
- 补充个人中心已落地的 `/personal-center/works` 入口和代码定位索引

## 4. 验证结果

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/personal-center/works/page.tsx` 无报错
  - `apps/web/src/app/(dashboard)/personal-center/layout.tsx` 无报错
- `npm run build:web` 通过
- Next 构建已识别新增页面：
  - `/personal-center/works`

## 5. 当前边界

- 当前作品中心仍主要按“当前登录用户”维度过滤，品牌内作品共享和更细粒度权限能力后续再补
- 本次未扩展 `MediaAsset` schema，也未新增作品摘要专用接口
- 作品中心当前主要承接站内媒体资产浏览，不包含上传、删除、重命名、分组和发布记录正式管理
