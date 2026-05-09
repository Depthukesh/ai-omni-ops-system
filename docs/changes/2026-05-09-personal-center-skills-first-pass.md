# 2026-05-09 个人中心技能中心第一版

## 1. 变更背景

- 个人中心已经拆出 `/orders`、`/works`、`/tasks`、`/team`、`/invites`，但“技能中心”仍停留在规划状态，用户无法从前台确认自己当前可见的技能基线
- 当前代码已经存在后台技能注册表与提示词注册表，但还没有 `user-skills` 个人覆盖层接口，适合先补一个“平台技能可见性优先”的最小可用页

## 2. 本次目标

- 新增 `/personal-center/skills`
- 让用户可以在个人中心独立查看当前账号可见的平台技能基线
- 提供状态筛选、关键词搜索、品牌上下文切换和提示词场景参考
- 不扩 schema，不额外拉大 `user-skills` 后端改动范围

## 3. 本次修改

### 3.1 前端路由壳

- 更新 `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- 个人中心二级导航新增：
  - `技能中心`
- 路由壳说明同步补充当前已拆出的任务、订单、作品、技能、团队、邀请六类工作区

### 3.2 技能中心页面

- 新增 `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
- 当前能力：
  - 校验登录态
  - 读取真实 `/auth/me`
  - 支持品牌上下文切换与退出登录
  - 支持技能状态筛选、关键词搜索
  - 支持按分类查看平台技能
  - 支持展示技能说明、默认模型、点数成本、提示词场景参考
  - 管理员账号尝试读取真实 `/admin/skills` 与 `/admin/prompts`
  - 普通账号或接口不可用时回退 `skillConfigSeed` / `promptTemplateSeed`

### 3.3 当前边界

- 本页当前聚焦“平台技能基线可见性”，不在本轮直接开放个人覆盖保存
- 规划中的 `GET /api/user-skills`、`PATCH /api/user-skills/:skillId`、`POST /api/user-skills/:skillId/reset` 本次未实现
- 后续再补：
  - 用户技能覆盖
  - 差异对比
  - 保存与重置日志

### 3.4 文档同步

- 更新 `docs/site-map.md`
- 更新 `docs/site-map-mermaid.md`
- 补充个人中心已落地的 `/personal-center/skills` 入口和代码定位索引

## 4. 验证结果

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx` 无报错
  - `apps/web/src/app/(dashboard)/personal-center/layout.tsx` 无报错
- `npm run build:web` 通过
- Next 构建已识别新增页面：
  - `/personal-center/skills`

## 5. 风险与后续

- 普通用户当前只能看到平台注册表快照，尚未读取真正的用户覆盖层配置
- 当前通过技能名称、slug、分类与提示词场景做弱匹配提示词参考，后续可改为正式的技能-提示词关联关系
