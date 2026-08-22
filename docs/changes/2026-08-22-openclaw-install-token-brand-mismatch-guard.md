# 2026-08-22 OpenClaw 安装令牌品牌错配拦截

## 背景

- OpenClaw 的正式安装走 `ocp_` 安装令牌。
- 该令牌本身绑定具体品牌；同时客户端配置片段里也会写入 `x-brand-id`。
- 之前如果客户端里的 `Authorization` 和 `x-brand-id` 指向了不同品牌，服务端会静默按安装令牌绑定品牌继续执行，外部很容易误以为当前请求跑在另一个品牌下。
- 这会让 `create_design_work` 一类依赖品牌资料、知识库和品牌配置的能力，看起来像“prompt 没生效”或“走错模板流”，但真实原因其实是串品牌了。

## 本次改动

### 1. 安装令牌增加品牌一致性校验

更新：

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`

当前行为：

- 当请求带 `Bearer ocp_...` 安装令牌时，服务端会检查：
  - 安装令牌绑定的 `brandId`
  - 请求头里的 `x-brand-id`
- 如果两者不一致，不再静默继续执行，而是直接返回明确报错：
  - 当前令牌绑定的是哪个品牌
  - 当前请求头声明的是哪个品牌
  - 需要去网站重新生成对应品牌令牌，或把客户端里的 `x-brand-id` 改成与令牌一致

### 2. 设计任务返回补充执行品牌

更新：

- `apps/server/src/modules/openclaw/openclaw.service.ts`

当前行为：

- `create_design_work` 的成功摘要里会额外带出：
  - `执行品牌：<brandId>`

这样即使后续还有人贴结果回来，也能第一眼看出任务实际跑在哪个品牌下。

## 影响范围

- 仅影响 OpenClaw 正式安装令牌认证链路和设计任务回执提示。
- 不改数据库结构。
- 不改设计工作台底层 prompt / 生图模型 / brand profile 拼接逻辑。

## 验证

- `pnpm exec tsc --noEmit -p apps/server/tsconfig.json`

## 结果

- 后续再出现“明明写的是 A 品牌，但结果像 B 品牌模板”的情况时，系统会直接在认证层拦截，而不会继续产出误导性结果。
