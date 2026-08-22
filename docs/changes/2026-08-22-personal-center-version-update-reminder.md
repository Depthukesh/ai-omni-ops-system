# 2026-08-22 个人中心版本更新提醒前置

## 背景

- 个人中心 `版本与升级` 页面此前已经能承接 `local-single-user` 自动升级与 Docker 标准运行态更新引导。
- 但提醒还不够前置：用户需要点进页面后，才知道有没有新版本，以及这次要怎么更新。
- 用户要求把“更新方法”明确放在个人中心里，同时在个人中心入口层就提醒版本更新。

## 本次改动

### 1. 二级导航补版本提醒

更新：

- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`

当前行为：

- `版本与升级` 二级导航会根据 `system/update/status` 显示状态标记：
  - `有新版本`
  - `升级中`
  - `需处理`
  - `已同步`

这样用户进入个人中心后，不用先点开版本页，也能先知道当前是不是有更新。

### 2. 概览页新增版本提醒卡片

更新：

- `apps/web/src/app/(dashboard)/personal-center/page.tsx`

当前行为：

- 个人中心概览页新增 `Version & Updates` 卡片。
- 卡片会直接展示：
  - 当前是否有新版本
  - 当前是否正在升级
  - 上一次更新是否失败
  - 进入版本页后能做什么

### 3. 版本页固定展示“更新方法”

更新：

- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`

当前行为：

- 不再只在 Docker 标准运行态且远端 manifest 返回完整时才看到方法说明。
- 当前改为：
  - `local-single-user`
    - 固定显示“检查更新 -> 预下载安装包 -> 立即升级 -> 自动重启确认”的方法
  - `standard`
    - 固定显示 `git pull`、`docker compose up -d --build ...`、mixedcut 重建与 Skill ZIP 重导的引导
- 即使当前已经是最新版本，也会保留方法说明，方便后续用户回看更新步骤。

## 影响范围

- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`

## 验证

- `pnpm build:web`

## 结果

- 个人中心里现在既有“版本更新提醒”，也有“更新方法”。
- 用户不用先点进版本页，也能知道当前是否有新版本。
- 进入版本页后，无论当前是否已经是最新版本，都能直接看到下一次该怎么更新。
