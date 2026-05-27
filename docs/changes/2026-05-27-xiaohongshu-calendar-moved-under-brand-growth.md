# 2026-05-27 小红书营销日历入口迁移到品牌增长报告

## 背景

- 现有“小红书营销日历”页面原本挂在 `/xiaohongshu` 工作台左侧导航中。
- 用户要求把该板块入口迁到 `品牌增长报告 -> 半年营销规划` 下方，同时明确要求：
  - 小红书 `原创笔记` 仍然可以继续选择营销日历中的选题
  - 其他逻辑不要发生变化

## 本次修改

### 1. 品牌增长工作台新增营销日历页面入口

- 文件：`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- 调整内容：
  - 在 `品牌增长报告` 分组下新增页面：
    - `营销日历`
  - 页面顺序调整为：
    - `生成品牌增长报告`
    - `品牌增长可视化报告`
    - `半年营销规划`
    - `营销日历`
- 该页面复用原有 `CalendarWorkspace` UI 组件，支持：
  - 刷新结果
  - 生成接下来 7 天营销日历
  - 打开单日详情
  - 编辑并保存当天内容

### 2. 品牌增长工作台补入营销日历数据加载与操作

- 文件：`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- 新增接入：
  - `getXiaohongshuMarketingCalendarWorkspace`
  - `generateXiaohongshuMarketingCalendar`
  - `updateXiaohongshuMarketingCalendar`
  - `getXiaohongshuMarketingPlanWorkspace`
- 保持原有生成前置条件不变：
  - 先有品牌增长报告
  - 先有半年营销规划
  - 先有小红书营销策划方案
- 保持原有权限口径不变：
  - 页面显示/编辑仍继续使用 `xiaohongshu.calendar` 权限

### 3. 小红书工作台移除独立营销日历入口

- 文件：`apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- 调整内容：
  - 左侧导航移除 `营销日历`
  - 不再在 `/xiaohongshu` 工作台中单独渲染营销日历页面

## 保持不变的部分

- `原创笔记` 与 `视频笔记` 创建弹窗中的营销日历选题来源不变，仍继续读取同一份 `xiaohongshu-marketing-calendar` 工作区数据。
- 营销日历后端接口不变，仍继续使用：
  - `GET /reports/brands/:brandId/xiaohongshu-marketing-calendar`
  - `POST /reports/brands/:brandId/xiaohongshu-marketing-calendar/generate`
  - `PATCH /reports/brands/:brandId/xiaohongshu-marketing-calendar/:reportId`
- 未新增第二套营销日历存储，也未改原创笔记生成链路。

## 影响范围

- `apps/web/src/app/(dashboard)/brand-growth/shared-types.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `docs/site-map.md`
- `docs/changes/2026-05-27-xiaohongshu-calendar-moved-under-brand-growth.md`

## 验证要点

- `品牌增长报告` 分组下能看到 `营销日历` 页面入口，且位置在 `半年营销规划` 后面
- `/xiaohongshu` 左侧导航不再显示 `营销日历`
- 在 `品牌增长报告 -> 营销日历` 中仍可生成、刷新、查看和编辑日历
- `原创笔记` 仍可继续选择营销日历选题，不影响原有下拉来源
