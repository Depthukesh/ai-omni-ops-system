# 品牌增长策略新增 OpenClaw专区 / 龙虾日记

## 1. 变更背景

- 用户要求在 `品牌增长策略` 左侧导航中，在现有 `品牌增长报告` 同级位置下新增一个一级分组 `OpenClaw专区`
- 用户要求在该分组下新增二级菜单 `龙虾日记`
- 页面进入后的视觉与“小红书 -> 原创笔记”工作区接近，但这里不允许用户手动新建日记
- 龙虾日记的创建入口交给 OpenClaw 类 AI Agent，创建时只需要 `日期 / 标题 / 内容` 三个参数
- 创建完成后，页面下方要出现列表；每行包含 `日期 / 标题 / 内容 / 查看 / 删除`
- 用户点击“查看”后只能查看，不能编辑

## 2. 变更目标

- 品牌增长策略工作区新增 `OpenClaw专区 -> 龙虾日记`
- 页面仅提供查看与删除能力，不提供人工新建入口
- OpenClaw MCP 新增龙虾日记的 `查看 / 创建 / 删除` 工具
- 站内用户与 OpenClaw Agent 共享同一份龙虾日记数据

## 3. 修改内容

### 3.1 前端

- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - 新增左侧一级分组 `OpenClaw专区`
  - 新增二级页面 `龙虾日记`
  - 接入龙虾日记工作区状态、刷新与删除逻辑
- `apps/web/src/app/(dashboard)/brand-growth/openclaw-lobster-diary-workspace.tsx`
  - 新增龙虾日记工作区组件
  - 列表展示 `日期 / 标题 / 内容 / 创建时间 / 查看 / 删除`
  - 新增只读查看弹窗
  - 页面强调“仅 OpenClaw 可创建”
- `apps/web/src/services/openclaw.ts`
  - 新增龙虾日记类型
  - 新增获取龙虾日记列表与删除日记的请求函数
- `apps/web/src/styles/globals.css`
  - 新增龙虾日记只读弹窗样式

### 3.2 后端

- `apps/server/src/modules/openclaw/openclaw-lobster-diary.service.ts`
  - 新增龙虾日记存储服务
  - 通过 `CREATE TABLE IF NOT EXISTS` 自动确保表存在
  - 数据库不可用时提供内存 fallback
- `apps/server/src/modules/openclaw/openclaw-lobster-diary.controller.ts`
  - 新增用户侧列表 / 创建 / 删除 API
- `apps/server/src/modules/openclaw/openclaw.service.ts`
  - 新增 OpenClaw MCP 工具：
    - `get_openclaw_lobster_diaries`
    - `create_openclaw_lobster_diary`
    - `delete_openclaw_lobster_diary`
  - 新增对应工具执行逻辑与总结响应
- `apps/server/src/modules/openclaw/openclaw.module.ts`
  - 注册龙虾日记 controller 与 service

## 4. 数据设计

- 使用独立表 `OpenClawLobsterDiary`
- 核心字段：
  - `id`
  - `brandId`
  - `createdByUserId`
  - `diaryDate`
  - `title`
  - `content`
  - `createdAt`
  - `updatedAt`
- 列表默认按 `diaryDate DESC, createdAt DESC` 排序

## 5. 交互规则

- 页面不显示“新建日记”按钮
- 页面顶部明确标识“仅 OpenClaw 可创建”
- “查看”打开只读弹窗，不允许编辑
- “删除”走品牌增长报告同权限口径，复用 `brandGrowth.report.topicLibrary` 权限

## 6. 验证方式

- 前端 `workspace.tsx / openclaw-lobster-diary-workspace.tsx / services/openclaw.ts` 无类型错误
- 后端 `openclaw.service.ts / openclaw-lobster-diary.*` 无类型错误
- 打开 `品牌增长策略 -> OpenClaw专区 -> 龙虾日记` 能看到列表和只读查看弹窗
- 通过 OpenClaw MCP 工具可成功创建、查询、删除龙虾日记

## 7. 影响范围

- 影响页面：`/brand-growth`
- 影响服务：`services/openclaw.ts`
- 影响后端模块：`openclaw`
- 不影响原有小红书 / 抖音 / 公众号工作区

## 8. 相关文件

- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/openclaw-lobster-diary-workspace.tsx`
- `apps/web/src/services/openclaw.ts`
- `apps/web/src/styles/globals.css`
- `apps/server/src/modules/openclaw/openclaw.module.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw-lobster-diary.service.ts`
- `apps/server/src/modules/openclaw/openclaw-lobster-diary.controller.ts`
- `docs/site-map.md`
