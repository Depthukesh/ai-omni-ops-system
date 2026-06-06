# 2026-06-06 公众号生图改为任务化渐进执行

## 背景

- 公众号工作流原生图阶段此前是单次接口内同步执行，前端只能在全部结束后一次性看到结果。
- 用户要求：
  - 单张图片最大执行时间调整为 240 秒
  - 图片之间按 10 秒错峰生成
  - 生成一张前端显示一张
  - 总任务最长 20 分钟
  - 生图阶段进入任务中心，支持独立查看记录

## 本次调整

### 1. 生图阶段接入任务中心

- 新增任务类型：`WECHAT_IMAGE_AI`
- 任务中心超时口径：20 分钟
- 任务开始时即创建任务并标记 `RUNNING`
- 生成过程中持续写入任务 `outputJson`，记录：
  - 当前工作流 ID
  - 当前阶段
  - 已生成数量 / 总数量
  - 失败数量
  - 封面图 / 正文配图 URL
  - 当前模型与供应商

### 2. 生图改为后台渐进执行

- `generateWechatWorkflowImages` 负责：
  - 创建任务
  - 写入工作流 `imageBundle.status = RUNNING`
  - 立即返回前端
- 真正的生图逻辑转入后台异步执行：
  - 封面图先生成
  - 正文配图顺序生成
  - 每张图片成功后立即回写工作流
  - 前端轮询工作流会话列表，实时刷新显示

### 3. 超时与错峰规则

- 单张公众号图片模型尝试超时：240 秒
- 图片请求错峰间隔：10 秒
- 生图总任务超时：20 分钟

### 4. 部分成功策略

- 只要有图片成功，就保留已生成结果
- 如果不是全部成功，工作流继续停留在 `IMAGE_PENDING`
- 只有全部图片都失败时，整轮生图任务才记为失败

## 代码落点

- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/tasks/tasks.service.ts`
- `apps/web/src/services/works.ts`
- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
