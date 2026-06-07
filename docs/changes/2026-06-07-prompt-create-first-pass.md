# 2026-06-07 技能中心创建提示词模板第一批接线

## 背景

- 前一轮已经完成：
  - 后台创建技能
  - 创建技能时登记所属模块与能力包
- 但提示词模板仍然只有读取和更新，没有后台创建入口。
- 如果只创建提示词模板、不处理绑定关系，新提示词也不会立即在技能中心生效。

## 本次改动

### 1. 后台新增创建提示词模板接口

- 修改：
  - `apps/server/src/modules/admin/skills-prompts.controller.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
- 新增接口：
  - `POST /admin/prompts`
- 当前支持字段：
  - `name`
  - `scene`
  - `version`
  - `status`
  - `modelName`
  - `temperature`
  - `maxTokens`
  - `content`

### 2. 创建提示词模板支持数据库与 mock 双模式

- 数据库可用时：
  - 写入 `PromptTemplate`
- 数据库不可用时：
  - 回写 `database.promptTemplates`
- 当前已补校验：
  - 提示词名称不能为空
  - 提示词场景不能为空
  - 提示词模型不能为空
  - 提示词场景不能重复

### 3. 技能中心新增“创建提示词”弹窗

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 录入字段：
  - 提示词名称
  - 提示词场景
  - 版本
  - 状态
  - 模型
  - 温度
  - 最大 Tokens
  - 提示词内容
  - 绑定技能
  - 绑定说明

### 4. 创建后可直接绑定到技能并立即生效

- 当前策略：
  - 提示词模板创建成功后，如果用户选择了绑定技能
  - 则同步更新前端 `skillAssetBindings` 中该技能的 `promptScene`
- 结果：
  - 当前技能中心详情区会立即切换到新提示词场景
  - 技能树筛选和技能详情的提示词显示同步生效

### 5. 技能中心优先读取绑定后的提示词场景

- 修改：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- 当前逻辑：
  - 若技能绑定关系中存在 `promptScene`
  - 则优先使用绑定后的提示词场景
  - 否则回退到技能树静态配置中的默认 `promptScene`

## 当前效果

- 后台技能中心左侧目录新增：
  - `创建提示词`
- 创建成功后：
  - 提示词模板进入提示词列表状态
  - 若绑定技能，则当前技能立即改用新提示词场景
  - 无需刷新页面即可继续编辑新提示词

## 当前边界

- 当前“提示词绑定技能”仍属于第一批前端状态层联动方案。
- 真正下一步建议继续推进：
  - `SkillConfig -> PromptTemplate` 正式关系表
  - 后台创建提示词时直接正式落库绑定关系
  - 支持一个技能多提示词版本管理

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
