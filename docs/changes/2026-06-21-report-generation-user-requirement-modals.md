# 2026-06-21 报告类生成弹窗补充要求

## 背景

- 小红书与抖音营销策划方案生成前，需要先弹窗展示输入范围，并允许填写“用户要求”后再提交。
- 半年营销规划与营销日历生成前，也需要统一改成先弹窗，再填写“用户要求”，点击提交后才真正开始运行。

## 本次调整

### 1. 营销策划方案输入统一

- 小红书营销策划方案输入统一为：
  - 品牌背景资料
  - 产品资料库
  - 机会洞察总报告
  - 品牌增长报告
- 抖音营销策划方案输入统一为：
  - 品牌背景资料
  - 产品资料库
  - 机会洞察总报告
  - 品牌增长报告

### 2. 营销策划方案弹窗提交

- 小红书营销策划方案点击“一键生成/重新生成”时，不再直接调用接口。
- 抖音营销策划方案点击“一键生成/重新生成”时，不再直接调用接口。
- 两端都改为：
  - 先弹窗
  - 显示本次输入范围
  - 提供“用户要求”输入框
  - 点击“提交”后再调用生成接口

### 2.1 营销策划方案运行时模型选择修复

- 小红书营销策划方案运行时模型，改为优先跟随技能中心当前生效的 `defaultModel / prompt modelName`。
- 抖音营销策划方案运行时模型，改为优先跟随技能中心当前生效的 `defaultModel / prompt modelName`。
- 运行时 provider 组装不再只限定为 `DEEPSEEK / ARK` 两类。
- 当技能中心当前模型不可用时，才按可用 provider 与模型白名单自动回退。
- 因此前台展示的“当前尝试模型”将与技能中心实际配置更一致，不再默认被营销策划方案模块自己的硬编码白名单覆盖。

### 3. 半年营销规划弹窗提交

- 品牌增长工作台中的“半年营销规划”生成按钮，改为先弹窗。
- 弹窗中新增“用户要求”输入框。
- 用户点击提交后，才调用半年营销规划生成接口。
- 后端生成任务会将 `userRequirement` 写入 task input，并在模型输入中透传。

### 4. 营销日历弹窗提交

- 品牌增长工作台中的“营销日历”生成按钮，改为先弹窗。
- 弹窗中新增“用户要求”输入框。
- 用户点击提交后，才调用营销日历生成接口。
- 后端生成任务会将 `userRequirement` 写入 task input，并在模型输入中透传。

## 涉及文件

- `apps/web/src/services/reports.ts`
- `apps/server/src/modules/reports/reports.controller.ts`
- `apps/server/src/modules/reports/reports.service.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/plan-workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-loader.ts`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`

## 验证

- 相关文件 `GetDiagnostics` 通过。
- `apps/server` 构建通过。
- `apps/web` 构建通过。
