# [OPEN] remix-json-failure

## 1. 症状

- 复刻短视频点击创建后，任务很快失败。
- 任务中心错误为“模型未返回有效 JSON”。
- 页面显示的实际尝试顺序只有 `KIMI/kimi-k2.6@api.moonshot.cn/v1`。

## 2. 当前证据

- 用户截图显示：
  - 当前阶段：生成脚本
  - 首选模型：`kimi-k2.6 + volcengine_seedance_20`
  - 实际尝试顺序：仅 `KIMI/kimi-k2.6@api.moonshot.cn/v1`
  - 最后失败：模型未返回有效 JSON

## 3. 可证伪假设

1. `requestVideoStageJson()` 运行时 provider 列表仍只剩 KIMI，fallback provider 没有真正进入尝试列表。
2. fallback provider 实际有尝试，但错误汇总或 attempt 展示被中途覆盖。
3. `kimi-k2.6` 返回值是可恢复格式，但当前 JSON 提取逻辑仍无法解析。
4. 线上运行没有命中最新修复代码，或者复刻短视频走的是另一条旧路径。
5. 输入 prompt 或素材上下文异常，导致模型输出根本不符合阶段 JSON 结构。

## 4. 调试策略

- 第一步只加埋点，不改业务逻辑。
- 记录：
  - 最终 provider 列表
  - fallback model 顺序
  - 每次 attempt 的 provider/model/baseUrl
  - 每次返回的原始内容摘要
  - JSON 提取前后的状态
- 拿到运行时证据后再判断是 provider 选择问题，还是 JSON 解析问题。

## 5. 当前分析

- 已确认 `requestVideoStageJson()` 当前真实代码路径里仍然使用：
  - `loadOriginalCopyProviders(params.brandId, preference)`
- 而不是保留 fallback provider 的：
  - `loadOriginalCopyProviders(params.brandId, preference, true)`
- 这与用户截图中的运行时现象一致：
  - 实际尝试顺序只有 `KIMI/kimi-k2.6@api.moonshot.cn/v1`
  - 没有继续进入 `deepseek-v4-pro / deepseek-v4-flash / doubao`

## 6. 当前修复

- 已做最小修复：把 `requestVideoStageJson()` 的 provider 加载改为保留 fallback provider 链。
- 当前保持调试埋点不清理，等待用户再次复现并确认：
  - 是否出现多模型顺序兜底；
  - 若仍失败，再看是不是 JSON 解析能力仍不足。
