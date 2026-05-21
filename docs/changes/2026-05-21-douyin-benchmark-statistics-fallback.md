# 2026-05-21 抖音对标作品统计补丁容错

## 背景

- 用户在“对标作品信息及数据”分组录入多个 `aweme_id` 后，页面仍可能报 `Tikhub 接口请求失败: 400`。
- 已排除“跨分组误提交”问题后，剩余高频问题来自单作品详情与统计补丁接口的稳定性差异：
  - `fetch_one_video_v3` 可返回作品详情
  - `fetch_video_statistics` 对部分作品返回 `400`

## 本次修复

- 对手动录入的 `benchmarkAwemeIds` 改为逐条 `Promise.allSettled`
- 某一条作品失败时，不再拖垮整次对标作品同步
- 单作品详情成功但统计补丁失败时：
  - 保留作品基础信息入库与展示
  - `play_count` 等统计补丁字段允许缺失
  - 将补丁失败作为 warning 返回给前端，而不是抛整页错误

## 结果

- “对标作品信息及数据”页会尽量展示已成功获取的作品详情
- 部分作品统计接口失败时，页面显示为完成并附带 warning，而不是直接红字失败

## 影响文件

- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/web/src/services/collectors.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
