# 2026-09-02 RunningHub 枚举字段下拉渲染修复

## 背景

内容获客 `某音/某号 -> RunningHub应用` 的应用详情弹窗里，部分本应按下拉选项选择的参数，被错误渲染成了纯数字输入框。

典型例子是：

- `设置比例`

RunningHub 原页面展示的是：

- `auto`
- `16:9`
- `9:16`
- `4:3`
- `3:4`
- `1:1`

但站内表单里却只显示成一个数字输入框，并直接回显如 `3` 这样的索引值，导致用户不知道当前到底对应哪个比例，其他同类枚举字段也存在同样问题。

## 根因

前端 `apps/web/src/app/(dashboard)/douyin/douyin-runninghub-workspace.tsx` 里的通用字段渲染逻辑，优先按“是否像数值字段”来决定渲染 `number input`。

这会漏掉一类 RunningHub 模板字段：

- `fieldData` 里其实携带了可选项列表
- `fieldValue` 返回的却是数字索引

也就是说，这类字段在协议层是“枚举项 + 原始索引值”，而不是“普通数字参数”。

## 本次改动

### 1. RunningHub 通用字段渲染优先识别枚举选项

更新文件：

- `apps/web/src/app/(dashboard)/douyin/douyin-runninghub-workspace.tsx`

改动内容：

- 新增对 `fieldData` JSON 的受控解析
- 自动提取可选项列表
- 若字段识别到选项列表，则优先渲染为 `select`
- 不再把这类字段直接误判为 `number input`

### 2. 标签显示按真实选项，提交仍保留模板原值

对于像 `设置比例` 这种：

- 页面展示：按 `4:3 / 16:9 / 9:16` 等真实标签展示
- 表单提交：仍保留模板要求的原始索引值或原始值

这样可以同时满足：

- 用户能看懂实际在选什么
- 不会把 RunningHub 需要的原始协议值改坏

### 3. 隐藏模板原始 JSON 噪音

之前部分字段会把 `fieldData` 原始 JSON 直接作为辅助说明文案显示在表单里，例如上传节点下面出现整段模板数组。

本次同步收口：

- 若 `fieldData` 是 JSON 模板，则不再直接把原始 JSON 文本回显给用户
- 表单只保留可读的说明文案

### 4. OpenClaw MCP / Skill 指引同步

更新文件：

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

同步补充规则：

- 如果模板 `fieldData` 里带选项列表，而当前 `fieldValue` 是数字索引
- 应按选项标签理解字段含义
- 但提交时仍保留模板要求的原始索引或原始值

## 影响范围

本次会影响：

- 内容获客 `某音/某号 -> RunningHub应用`
- 抖音兼容直达页 `/douyin` 的 RunningHub 应用详情弹窗
- OpenClaw / MCP / Skill 对 RunningHub 枚举字段的解释口径

本次不会影响：

- RunningHub 应用清单
- `get_app_detail / generate / delete` 接口协议
- RunningHub 作品记录结构
- 数据库 schema

## 验证重点

- `设置比例` 等枚举字段应展示为下拉，而不是数字输入框
- 切换枚举项后，提交值仍保持模板要求的原始值
- 上传节点下不再直接展示原始 `fieldData` JSON
- 前端构建通过

## 一句话结论

这次把 RunningHub 应用详情里“枚举字段显示成数字输入框”的问题收口成了通用渲染修复：页面按真实选项展示，底层仍按模板原值提交，并同步更新了 OpenClaw MCP / Skill 的操作口径。
