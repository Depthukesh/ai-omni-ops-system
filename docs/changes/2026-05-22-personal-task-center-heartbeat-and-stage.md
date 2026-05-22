# 2026-05-22 任务中心补充阶段、心跳与模型接力可视化

## 背景

- 任务中心此前只展示 `taskStatus`、创建时间与最近更新时间。
- 当任务长时间停留在 `QUEUED / RUNNING` 时，用户无法判断它究竟卡在什么阶段，也看不出是否已经切换到兜底模型。
- 在补齐“总任务超时回收”和“单模型超时即 fallback”之后，任务中心还需要把这些运行时信号展示出来，才能真正帮助排查。

## 本次调整

### 1. 作品任务补充阶段心跳

- 小红书原创笔记任务在运行中会按阶段持续写入 `outputJson.stage`：
  - `PREPARING_REFERENCES`
  - `GENERATING_COPY`
  - `GENERATING_IMAGE_PROMPTS`
  - `GENERATING_IMAGES`
  - `SAVING_WORK`
  - `WORK_READY`

- 小红书二创笔记任务在运行中会按阶段持续写入：
  - `GENERATING_COPY`
  - `GENERATING_IMAGE_PROMPTS`
  - `GENERATING_IMAGES`
  - `SAVING_WORK`
  - `WORK_READY`

- 小红书视频笔记任务在运行中会持续写入：
  - `GENERATING_SCRIPT`
  - `GENERATING_STORYBOARD`
  - `VIDEO_PROVIDER_TASK_CREATED`
  - `VIDEO_READY`

- 每次写入阶段时都会同步刷新任务 `updatedAt`，任务中心可将其视作心跳时间。

### 2. 任务中心页面增加 4 个辅助维度

- 当前阶段：优先读取 `outputJson.stage`，不再只看总状态
- 心跳状态：根据 `updatedAt` 判断是“刚刚更新”还是“心跳偏旧”
- 模型接力：根据 `outputJson` 内实际模型摘要和失败文案里的尝试顺序，判断是否已触发 fallback
- 实际模型：展示任务真实使用到的文案模型、图片提示词模型、生图模型、视频模型等摘要

### 3. 错误信息直出

- 任务卡片直接展示 `errorMessage`，避免必须进入工作区才知道失败原因。

## 影响

- 用户在个人中心任务页可以更快区分：
  - 真正在跑的任务
  - 心跳已经变旧、疑似卡住的任务
  - 已切到兜底模型的任务
  - 已经明确失败并可重试的任务

## 验证建议

- 触发原创、二创、视频 3 类任务，确认运行中任务会显示阶段变化
- 人为制造超时或失败，确认任务卡片能展示心跳偏旧、错误原因与模型接力状态
- 触发一条存在多模型 fallback 的失败任务，确认“模型接力”显示为已触发
