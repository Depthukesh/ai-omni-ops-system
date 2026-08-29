# 2026-08-29 OpenClaw 图片设计默认优先多元探索

## 背景

用户反馈：

- 多元探索平台里的 `gpt-image-2` 额度仍可用
- OpenClaw `create_design_work` 却持续命中 `Right Codes`，并返回 `HTTP 403`

代码复核后确认，问题不在 MCP 工具名本身，而在默认路由：

- 设计工作台网页侧会读取 `get_design_workspace_options` 返回的模型列表，并默认选择推荐项
- 但 OpenClaw `create_design_work` 在未显式传 `modelSelection` 时，会继续落回技能默认模型
- 当前图片设计相关技能和 Prompt 的默认模型长期收口在：
  - `provider_runtime_image_generation_right_codes::gpt-image-2`

因此只要 OpenClaw 不显式带 `modelSelection`，就会优先把图片请求锁到 `Right Codes`，而不是跟随当前品牌下“多元探索可用”的工作台选项。

## 为什么之前能用

不是因为 OpenClaw 之前自动走了多元探索，而是因为：

1. 这条默认链本来就长期指向 `Right Codes`
2. 之前 `Right Codes` 这条路还有可用额度，所以任务能成功
3. 现在 `Right Codes` 子账户额度耗尽 / 失效后，同一条默认路由才集中暴露成 `403`

换句话说：

- “之前能用”不代表它之前走的是多元探索
- 更可能只是 `Right Codes` 当时还能用

## 本次改动

更新：

- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`

当前行为：

- `create_design_work` 如果显式传了 `modelSelection`
  - 继续严格按调用方指定的 `selectionKey` 走
- `create_design_work` 如果是图片模块，且没有显式传 `modelSelection`
  - 先读取工作台模型列表
  - 优先选择 `providerName=多元探索` 且 `modelName=gpt-image-2` 的 `selectionKey`
  - 若当前品牌没有这项，再回退到工作台推荐项

## 影响范围

- 仅影响 OpenClaw `create_design_work` 的图片模块默认模型路由
- 不改网页设计工作台默认值
- 不改数据库里的技能默认模型
- 不改后台供应商种子顺序

## 验证建议

至少执行：

```powershell
npm --workspace apps/server run build
```

并补一条真实链路验证：

1. 当前品牌已配置多元探索图像 Key
2. 调用 `get_design_workspace_options`
3. 确认 `moduleOptions.image.models` 中存在 `providerName=多元探索`
4. 直接调用 `create_design_work`，故意不传 `modelSelection`
5. 预期默认命中多元探索，而不是 `Right Codes`

## 一句话结论

这次不是把全站图片默认 Provider 一刀切改掉，而是把 OpenClaw 图片设计在“未显式指定模型”时的默认路由，收口到当前品牌可用的多元探索图片项，避免继续被技能旧默认值锁到 `Right Codes`。
