# 2026-09-01 按用户要求回退到账号隔离，一账号一品牌

## 背景

此前两轮未提交改动把系统临时往“一个账号管理多个品牌”方向推进，包含：

- 前台顶栏品牌切换器
- 个人中心概览页创建品牌入口
- OpenClaw 安装中心改成账号级令牌 + `x-brand-id` 切品牌
- 对应 Skill / 安装文档同步改口径

用户本轮明确要求改回“账号隔离，每个账号一个品牌”模型，因此需要把上述未提交改动回退，恢复到原先更接近单账号单品牌的使用方式。

## 本次回退

### 1. 回退前台多品牌入口

更新文件：

- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `apps/web/src/services/brand-growth.ts`
- `apps/web/src/styles/globals.css`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/brands/brands.controller.ts`

处理结果：

- 移除全站顶栏品牌切换器
- 移除个人中心概览页“创建品牌并切换”卡片
- 移除前端新增的 `createBrand(...)` 请求封装
- 恢复品牌列表归一化逻辑
- 恢复 `POST /brands` 原有创建入口写法

### 2. 回退 OpenClaw 账号级安装令牌改造

更新文件：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `apps/web/src/app/(dashboard)/personal-center/openclaw/page.tsx`
- `apps/web/src/services/openclaw.ts`

处理结果：

- 恢复为品牌级安装令牌
- 恢复 `x-brand-id` 必须与令牌绑定品牌一致
- 移除安装页“多品牌使用方式”和可切换品牌展示
- 恢复令牌缓存按品牌维度存储

### 3. 回退多品牌文档口径

更新文件：

- `docs/openclaw/OpenClaw正式安装与网站对接说明.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `docs/openclaw/skill-package/SKILL.md`
- `docs/openclaw/skill-package/README.md`
- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/README.md`

处理结果：

- 删掉未提交的两篇多品牌变更记录
- 恢复 OpenClaw、Skill、站点地图中的单品牌口径

## 验证

本次计划执行：

- `pnpm --filter server build`
- `pnpm --filter web build`

## 说明

本次回退只针对未提交的“多品牌扩展”改动，不影响既有邀请码注册、团队邀请、品牌成员协作等已存在链路。
