# 2026-05-18 视频笔记第三方任务恢复入口

## 背景

- 视频笔记第 3 阶段历史上出现过一种场景：
  - 第三方视频平台已经成功创建并完成任务
  - 平台已扣费
  - 但站内因为轮询窗口偏短或中途异常，提前把作品写成 `FAILED`
- 这类任务并不需要再次扣费重跑，最省事的处理方式应该是：
  - 直接按第三方 `taskId` 重新查询结果
  - 若任务已成功，则把视频重新抓回站内 OSS
  - 再把视频笔记作品状态回填成成功

## 本次修正

### 1. 新增视频笔记恢复接口

- 更新：
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
- 新增接口：

```http
POST /api/works/brands/:brandId/xiaohongshu/video/recover
```

- 请求体：

```json
{
  "providerTaskId": "2056182709998739458",
  "workId": "可选，缺省时自动匹配最近失败作品",
  "requestedVideoProvider": "可选，默认沿用作品当前 provider"
}
```

### 2. 缺省时自动匹配最近失败的视频笔记

- 当用户不知道 `workId` 时，恢复逻辑会在当前品牌下：
  - 优先命中 `metadataJson.providerTaskId === providerTaskId` 的作品
  - 否则在最近视频笔记里寻找：
    - `workflowStage ∈ FAILED / GENERATING_VIDEO / WAITING_VIDEO`
    - 还没有 `videoUrl`
    - provider 兼容当前请求
- 若只找到一条候选，直接自动恢复
- 若仍有多条候选，才会要求显式传 `workId`

### 3. 恢复时直接复用第三方成功结果，不再重复扣费

- 恢复接口会按作品当前 provider 配置重新查询第三方任务状态：
  - 若仍在处理中：
    - 把站内作品重新回写到 `GENERATING_VIDEO`
    - 返回当前第三方状态
  - 若第三方已失败：
    - 把站内失败原因同步更新
  - 若第三方已成功：
    - 下载第三方视频
    - 重新写入站内 `works/<brandId>/...`
    - 回填视频笔记 `videoUrl / providerTaskId / videoAssetId / workflowStage`
    - 把原失败任务重新改写为成功

### 4. 恢复成功后清理历史失败提示

- `markTaskSuccess()` 现在会额外清空历史 `errorMessage`
- 避免任务已经恢复成功，但任务列表里还残留旧失败文案

## 适用场景

- 视频笔记第 3 阶段调用第三方视频接口后，站内误判失败
- 已能从第三方平台后台拿到 `taskId`
- 不希望再次扣费重跑，只希望把已有成片补抓回站内

## 当前边界

- 当前恢复入口是后端 API，前端页面还没有单独新增“恢复视频结果”按钮
- 但接口已经支持“只给 `providerTaskId`、不传 `workId`”的最省事模式

## 调用示例

```bash
curl 'https://17ai.site/api/works/brands/br_super_admin_demo/xiaohongshu/video/recover' \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <登录态 Cookie>' \
  --data-raw '{"providerTaskId":"2056182709998739458","requestedVideoProvider":"seedance"}'
```

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/works/works.controller.ts`
- `npm --workspace apps/server run build`
