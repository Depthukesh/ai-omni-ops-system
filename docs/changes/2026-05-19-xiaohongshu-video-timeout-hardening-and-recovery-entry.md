# 2026-05-19 小红书视频超时硬化与页面恢复入口

## 1. 背景

- 视频笔记第 3 阶段在部分 Seedance 任务上仍会出现一种误判：
  - 第三方任务状态仍是 `IN_PROGRESS`
  - 但站内已提前报错并把任务写成失败
- 代码里虽然已经把 Seedance 默认轮询窗口放宽到约 15 分钟，但运行时仍存在两个真实风险：
  - 后台 `ApiProviderConfig.extraParams` 可能残留旧的较短轮询配置，覆盖代码默认值
  - 轮询查询接口若发生超时或瞬时网络异常，旧逻辑会在 15 分钟内直接失败

## 2. 本次修正

### 2.1 服务端对 Seedance 增加 15 分钟硬下限

- 更新：
  - `apps/server/src/modules/works/works.service.ts`
- `loadVideoProviderConfig()` 现在会在读取运行时 Provider 配置后，再额外套一层最小轮询窗口约束
- 只要 backend 命中 `seedance`，有效轮询窗口至少为 15 分钟
- 即使数据库里仍残留较短的 `pollMaxAttempts / pollIntervalMs`，也不会再把窗口压回旧值

### 2.2 轮询查询异常改为窗口内重试

- 更新：
  - `apps/server/src/modules/works/works.service.ts`
- `pollVideoGenerationResult()` 现在会把查询超时、网络抖动等异常记录为最后一次错误，并在 15 分钟窗口内继续轮询
- 只有满足以下条件之一才会真正报错：
  - 第三方明确返回 `FAILED`
  - 有效轮询窗口已经超过 15 分钟，任务仍未完成

### 2.3 页面补入“找回视频结果”入口

- 更新：
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/use-work-mutation-actions.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-panel.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-section-container.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
- 视频详情面板现在新增“找回视频结果”按钮
- 当前视频记录若已带 `providerTaskId` 且尚未生成成片，可直接调用现有恢复接口并把结果回填到当前页面列表

## 3. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响链路：
  - 视频笔记第 3 阶段短视频生成
  - 已失败但第三方仍在运行/已成功的视频补抓回填
- 不影响数据库结构
- 不改变已有视频生成 API 协议

## 4. 验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/use-work-mutation-actions.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-panel.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-section-container.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
- `npm --workspace apps/server run build`
- `npm run build:web`

## 5. 当前边界

- 本轮已把“15 分钟前不能因轮询异常误判失败”和“页面内直接触发恢复”两条链路补齐
- 但当前执行环境里，本地 PostgreSQL 没有启动，且线上 `17ai.site` demo 品牌当前没有对应的视频记录
- 因此这次无法在当前环境直接把用户截图中的那条本地异常视频即时恢复；后续需要接回本地数据源或提供该视频的 `providerTaskId` 才能完成定点补抓

## 6. 后续

- 优先继续处理用户当前这条异常视频：
  - 启动本地数据库并读取本地视频作品记录
  - 或直接拿到截图对应作品的 `providerTaskId`
  - 然后通过页面“找回视频结果”按钮或恢复接口把视频同步回页面
