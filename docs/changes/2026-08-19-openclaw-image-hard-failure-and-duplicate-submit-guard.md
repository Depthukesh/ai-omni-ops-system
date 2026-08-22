# 2026-08-19 OpenClaw 生图硬失败归因修正与重复提交保护

## 背景

用户反馈：

- OpenClaw 一直提示 `create_design_work 生图接口当前真返 502/504`
- 但平台后台同时又能看到调用记录
- 同一类生图任务在短时间内出现多次重复调用

## 现场结论

### 1. OpenClaw 口头提示的“真返 502/504”与真实下游错误不一致

从本地单机版实际运行数据库与任务错误信息看，`2026-08-19 11:44 ~ 12:10` 这一段反复失败的主因不是 502/504，而是：

- `HTTP 403`
- `预扣费额度失败`
- `insufficient_user_...`

这说明真实下游是：

- 图片 provider 拒绝执行
- 原因是额度不足 / 预扣费失败

而不是“地址修对后 provider 真返 502/504”。

### 2. 存在两层重复

#### A. 单个任务内部的 provider 重试

旧链路里，图片生成失败后会继续尝试同一批候选 provider / model / prompt 组合。

当错误属于：

- 403 / 额度不足
- 400 / 内容策略或无效请求

这类硬拒绝时，继续重试没有收益，只会放大噪音。

#### B. 外部重复提交

安装版实际数据库显示：

- `excel_auto_cover_v1`
- 在 `11:44:38 ~ 12:10:12`
- 共创建 `26` 条 `DESIGN_IMAGE`
- 相邻间隔约 `61s`

这说明外部调用方存在“按分钟重复重新提交”的行为，而不是单次请求在本站内裂变成多条任务。

## 本次改动

修改文件：

- `apps/server/src/modules/works/works.service.ts`

### 1. 修正图片错误归因

`normalizeImageGenerationFailureMessage()` 新增对以下错误的明确归类：

- `403 / forbidden / insufficient_user_ / 预扣费额度失败 / 额度不足`
- `400 / status_code=400 / content policy / 内容政策 / invalid_request`

用户侧错误文案现在会明确说明：

- 这不是 502/504
- 是上游 provider 的额度或内容策略拒绝

### 2. 硬失败不再继续撞图片 provider

`shouldShortCircuitImagePromptRetries()` 现在会把以下情况视为硬失败：

- 403 / 额度不足 / 预扣费失败
- 400 / 内容策略 / 非法请求

命中后会停止当前任务内继续重试其它 prompt 候选，避免一条本来必败的请求在同任务内反复撞 provider。

### 3. 增加短时间窗重复提交保护

`generateDesignWork()` 新增了图片任务请求指纹：

- `module`
- `designType`
- `title`
- `calendarItemId`
- `productId`
- `injectBrandProfile`
- `referenceImageUrl`
- `referenceImageSignature`
- `modelSelection`
- `spec`
- `additionalInstruction`

当 `DESIGN_IMAGE` 在最近 `120s` 内已经因硬失败报错过，且请求指纹一致时：

- 不再新建任务
- 直接拦截重复提交
- 返回最近一次失败任务 ID 与真实失败原因

这样可以把“外部定时重试”对 provider 的冲击压下来。

## 第一性原理结论

这次问题的本质不是单纯“接口报错”，而是两个边界同时失真：

1. **错误归因边界失真**
   - 真正的 403 / 400 被外部口头总结成 502/504，导致排查方向被带偏

2. **重试边界失真**
   - provider 已经明确硬拒绝，系统却还在继续尝试
   - 外部又按分钟重新提交，最终把一次额度问题放大成大量噪音任务

因此修复方向不该只是“继续重试”，而应是：

- 先把真实错误类型说准
- 再让硬失败及时停下
- 最后对短时间重复请求做去重保护

## 验证

已执行：

- `npm run build:server`

结果：

- 后端构建通过

## 后续建议

1. OpenClaw 外部侧如果存在自动重试，建议同步配置：
   - 仅对真正的网络错误 / 5xx 做重试
   - 不对 400/403 业务硬失败做分钟级重复提交

2. 后续可继续补一层：
   - 对 `create_design_work` 返回结构增加更显式的 `errorCategory`
   - 让外部平台前台不要再把所有失败笼统显示成 `502/504`
