# 2026-06-07 技能中心创建技能第一批接线

## 背景

- 前几轮已经完成：
  - 模块注册中心
  - 模块默认能力包关系后台页
  - 技能中心显示所属模块 / 所属能力包
  - 技能中心按模块 / 能力包筛选
- 但技能中心仍然只有“编辑现有技能”，还不能在后台直接创建新技能。

## 本次改动

### 1. 后台新增创建技能接口

- 修改：
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 新增接口：
  - `POST /admin/skills`
- 当前支持字段：
  - `name`
  - `slug`
  - `category`
  - `status`
  - `provider`
  - `defaultModel`
  - `pointsCost`
  - `description`

### 2. 后台创建技能接口支持数据库与 mock 双模式

- 数据库可用时：
  - 写入 `SkillConfig`
- 数据库不可用时：
  - 回写 `database.skillConfigs`
- 并补充了以下校验：
  - 技能名称不能为空
  - 技能标识不能为空
  - 技能标识只能使用英文小写、数字和短横线
  - 技能标识不能重复
  - 分类 / 供应商 / 默认模型不能为空

### 3. 技能中心新增“创建技能”弹窗

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 当前可录入：
  - 技能名称
  - 技能标识
  - 分类
  - 状态
  - 供应商
  - 默认模型
  - 点数成本
  - 技能说明
  - 所属模块
  - 所属能力包
  - 提示词场景
  - 归属说明

### 4. 创建时同步登记模块与能力包归属

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/services/admin.ts`
- 当前策略：
  - 技能本体走真实后台创建接口
  - 模块 / 能力包归属先写入前端 `skillAssetBindings` 状态
- 目的：
  - 让新建技能创建完成后，立即可以参与：
    - 技能中心归属展示
    - 技能中心按模块筛选
    - 技能中心按能力包筛选

## 当前效果

- 后台技能中心左侧目录新增“创建技能”按钮。
- 点击后弹窗创建技能。
- 创建成功后：
  - 技能加入技能列表
  - 技能草稿可继续编辑
  - 模块 / 能力包归属立即生效

## 当前边界

- 本轮先打通“技能本体创建”。
- 技能与能力包、模块的归属关系，目前仍是第一批前端状态层方案，不是最终正式真源表。
- 后续建议继续推进：
  - `SkillPackage -> SkillConfig` 正式关系表
  - 后台创建技能时同步正式写入关系表
  - 自动联动提示词模板创建

## 影响范围

- 前端页面：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 前端服务层：
  - `apps/web/src/services/admin.ts`
- 后端控制器：
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
- 后端服务：
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 文档：
  - 本文件

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/services/admin.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
- `npm --workspace apps/web exec tsc --noEmit`
- `npm --workspace apps/server exec tsc --noEmit`
