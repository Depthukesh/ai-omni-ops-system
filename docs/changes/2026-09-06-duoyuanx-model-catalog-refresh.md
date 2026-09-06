# 2026-09-06 多元探索模型目录刷新

## 背景

当前系统里“多元探索平台”走的是后台 Provider 种子 + 前台品牌共享 Key 的统一网关口径。

但仓库里的多元探索模型白名单和文档入口还停在 2026-07-22 版本，已经落后于当前官方定价页和文档矩阵，主要有三个问题：

1. 文本模型列表还缺少 `gpt-5.5`、`gpt-5.6-*`、`gpt-6-astra`、`claude-sonnet-5`、`claude-opus-5`、`gemini-3.6-flash`、`qwen3.7-*` 等新模型
2. 图像模型列表还没补进 `qwen-image-3.0` / `qwen-image-3.0-pro`，也没同步新的 `gpt-image-2-all`
3. 文档根地址仍指向旧的 `doc.duoyuanx.com/zh`，后台教程和供应商说明会继续跳旧地址

## 本次改动

### 1. 刷新多元探索文档根地址

更新：

- `apps/server/src/common/api-provider-catalog.ts`

把：

- `https://doc.duoyuanx.com/zh`

更新为：

- `https://docs.deepwl.cn/duoyuanx/zh`

这样后台供应商教程地址和后续引用都会继续指向当前官方文档站。

### 2. 刷新文本模型白名单

补入当前文档与定价页已出现的代表模型，包括：

- OpenAI / GPT：`gpt-5.5`、`gpt-5.5-pro`、`gpt-5.6-luna`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-6-astra`、`gpt-5.4`、`gpt-5.4-mini`、`gpt-5.3-codex`、`gpt-5-nano`
- Claude：`claude-fable-5`、`claude-fable-5-1`、`claude-sonnet-5`、`claude-opus-4-5-20251101`、`claude-opus-4-6-thinking`、`claude-opus-4-8`、`claude-opus-5`
- Gemini：`gemini-3.6-flash`、`gemini-3-flash-preview`、`gemini-2.5-flash-lite`、`gemini-3.1-flash-lite-preview`
- Qwen：`qwen3.7-max`、`qwen3.7-plus`、`qwen3.6-plus`、`qwen3.5-plus`

### 3. 刷新图像模型白名单

补入当前图像矩阵已明确出现的新模型，包括：

- `gemini-2.5-flash-image`
- `gpt-image-2-all`
- `qwen-image-3.0`
- `qwen-image-3.0-pro`
- `doubao-seedream-5-0-pro-260628`

### 4. 刷新视频模型白名单

补入当前视频文档里已经明确出现、但旧目录没覆盖的模型别名或新家族，包括：

- `veo-3-1`
- `veo-3-1-fast`
- `MiniMax-H3`

## 影响范围

- 后台 `接口供应商` 中的多元探索种子模型白名单
- 个人中心 `第三方接口配置` 页里多元探索平台的模型数量与默认候选口径
- 后续依赖多元探索模型目录的安装说明和后台展示

## 未改动内容

- 没有改变多元探索品牌共享 Key 的存储与解析方式
- 没有改变现有运行时路由顺序
- 没有把多元探索 Provider 默认状态从 `DRAFT` 改成 `ACTIVE`

## 验证

- `pnpm --filter server build`
- 人工核对多元探索官方定价页与文档矩阵中的文本 / 图像 / 视频代表模型
