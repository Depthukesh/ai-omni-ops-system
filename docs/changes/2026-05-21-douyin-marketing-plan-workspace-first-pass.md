# 2026-05-21 抖音营销策划方案工作台首版打通

## 背景

- 用户要求在抖音板块启动第一个可用模块“营销策划方案”，并要求整体链路参考小红书营销策划方案模块落地。
- 本次功能不仅需要在前端个人中心和后台技能中心完成技能注册，还要真正打通工作台入口、后端生成链路、任务状态、结果持久化与编辑保存能力。
- 现状中抖音只有技能占位与部分接口骨架，`/douyin` 页面尚不存在，`reports.service.ts` 也缺少抖音专属的生成设置、输入拼装、结果校验与资产映射闭环。

## 本次调整

### 1. 打通抖音营销策划方案后端闭环

- 在 `reports.service.ts` 中补齐抖音营销策划方案专用方法：
  - 生成配置加载 `loadDouyinMarketingPlanGenerationSettings`
  - 输入拼装 `buildDouyinMarketingPlanInput`
  - 模型调用 `generateDouyinMarketingPlanByModel`
  - 结果构建 `buildDouyinMarketingPlan`
  - phase 进度 `buildDouyinMarketingPlanPhaseStatus`
  - 文件名生成 `buildDouyinMarketingPlanFileName`
  - 手工保存归一化 `buildManualDouyinMarketingPlanResult`
  - 资产映射与可用性判断 `mapDouyinMarketingPlanAsset` / `isUsableDouyinMarketingPlanRecord`
- 抖音任务状态更新不再借用小红书命名，新增独立的 `updateDouyinMarketingPlanTaskStatus`，避免后续维护时出现语义混淆。
- 抖音 Markdown 结果增加基础完整性校验：
  - 必须存在一级标题
  - 至少存在 3 个二级标题
  - 过滤工作流/文件操作残留
  - 过滤明显截断尾巴

### 2. 新建 `/douyin` 工作台首屏

- 新增 `apps/web/src/app/(dashboard)/douyin/page.tsx` 作为薄入口。
- 新增 `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`，实现抖音首个可用工作台：
  - 读取品牌权限
  - 读取抖音采集数据、品牌增长报告、半年营销规划、抖音营销策划方案
  - 展示输入准备情况
  - 支持生成、轮询刷新、保存、删除
  - 展示 Markdown 编辑区与 HTML 预览
- 页面默认只承载“营销策划方案”这一个首模块，没有把小红书其它模块硬迁入抖音页，保持首版范围可控。

### 3. 明确抖音策划方案输入口径

- 生成输入固定组合以下三类数据：
  - 品牌增长报告
  - 半年营销规划
  - 抖音采集数据
- 抖音采集数据内进一步拆分为：
  - 品牌账号信息
  - 竞品账号信息
  - 品牌作品信息及数据
  - 对标作品信息及数据
- 作品样本输入中保留了抖音策划常用字段：
  - 标题 / 描述
  - 作品链接 / 封面 / 视频地址
  - 发布时间 / 时长秒数
  - 点赞 / 评论 / 分享 / 收藏 / 播放 / 下载 / 推荐
  - 标签 / 音乐 / 爆款标记 / 跟进决策

## 影响范围

- `apps/server/src/modules/reports/reports.service.ts`
- `apps/web/src/app/(dashboard)/douyin/page.tsx`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`

## 验证

- `GetDiagnostics`:
  - `apps/server/src/modules/reports/reports.service.ts`
  - `apps/web/src/app/(dashboard)/douyin/page.tsx`
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- 建议继续执行：
  - `npm run build:server`
  - `npm run build:web`

## 结果说明

- 本次交付的是抖音板块首个可用工作台首版，目标是先把“技能注册 -> 工作台入口 -> 生成/保存/删除 -> 结果持久化”完整跑通。
- 抖音页目前仍是单模块首版，不包含小红书页里的素材库、营销日历、原创/二创/视频等后续模块。
- 如果后续实测发现抖音策划方案单次输出过长而出现截断，可以进一步像小红书一样拆成多段生成，但本次先保持实现复杂度最小可用。
