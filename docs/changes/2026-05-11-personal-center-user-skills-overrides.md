# 2026-05-11 个人中心技能中心用户覆盖版

## 1. 变更背景

- 用户要求个人中心技能中心去掉大段说明型区块，页面保持简洁
- 用户要求前端技能中心与后台技能中心分层：
  - 后台继续维护平台基线技能与提示词
  - 前端用户可在个人中心修改自己的技能版本并保存到自己的库
  - 用户可主动重置，重置后回到后台平台基线
- 第一版技能中心只解决“平台技能可见性”，已经不满足当前使用方式

## 2. 本次目标

- 将 `/personal-center/skills` 从只读展示页升级为可编辑的用户技能中心
- 新增 `GET /api/user-skills`、`GET /api/user-skills/:skillId`、`PATCH /api/user-skills/:skillId`、`POST /api/user-skills/:skillId/reset`
- 将后台平台技能库与前端用户覆盖层明确拆开
- 让用户未覆盖的字段继续自动跟随后台平台基线

## 3. 本次修改

### 3.1 数据与后端

- 更新 `prisma/schema.prisma`
- 新增用户技能覆盖相关模型：
  - `UserSkillProfile`
  - `UserPromptOverride`
  - `UserSkillResetLog`
- 新增 `apps/server/src/modules/user-skills/user-skills.controller.ts`
- 新增 `apps/server/src/modules/user-skills/user-skills.module.ts`
- 更新 `apps/server/src/modules/user-skills/user-skills.service.ts`
- 更新 `apps/server/src/modules/admin/skills-prompts.service.ts`
- 当前后端行为：
  - 先读取后台 `SkillConfig` / `PromptTemplate` 作为平台基线
  - 再按 `userId + brandId + baseSkillId` 合成用户有效技能视图
  - 保存时只写用户差异，不覆盖平台基线
  - 重置时删除该用户该品牌下的覆盖记录，并写入重置日志
- 技能与提示词关系已从前端弱匹配升级为后端正式映射，避免保存和重置时串错提示词

### 3.2 前端个人中心

- 更新 `apps/web/src/services/personal-center.ts`
- 更新 `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
- 页面结构改为“左侧技能列表 + 右侧编辑器”
- 移除了第一版里大块说明型卡片、边界说明和平台快照提示区
- 当前支持：
  - 查看平台基线与当前个人有效值
  - 修改技能名称、默认模型、技能说明
  - 修改每个技能关联提示词的模型、温度、Tokens 和内容
  - 保存到当前用户、当前品牌下的个人技能库
  - 一键恢复平台基线
  - 品牌切换后切到对应品牌下的用户技能覆盖

### 3.3 当前分层规则

- 后台修改 `SkillConfig` / `PromptTemplate` 后：
  - 所有未被用户自定义覆盖的字段自动跟随更新
- 前端用户保存个人技能后：
  - 仅影响当前用户当前品牌下的有效技能视图
- 前端用户点击重置后：
  - 清除个人覆盖并回退到后台平台基线

## 4. 验证结果

- `GetDiagnostics`
  - `apps/server/src/modules/admin/skills-prompts.service.ts` 无报错
  - `apps/server/src/modules/user-skills/user-skills.service.ts` 无报错
  - `apps/server/src/modules/user-skills/user-skills.controller.ts` 无报错
  - `apps/web/src/services/personal-center.ts` 无报错
  - `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx` 无报错
- `npm --workspace apps/server run build` 通过
- `npm --workspace apps/web run build` 通过

## 5. 风险与后续

- 当前已经完成技能中心自身的读写分层，但生成链路仍主要直接读取平台技能基线；若后续要求“执行任务时也使用个人技能覆盖”，需要继续把 `works`、`reports` 等模块接到 `user-skills` 有效视图
- 新 schema 当前已落文件，但若本地或线上数据库尚未执行 `prisma generate` / `prisma db push`，需要在部署或初始化链路中同步
