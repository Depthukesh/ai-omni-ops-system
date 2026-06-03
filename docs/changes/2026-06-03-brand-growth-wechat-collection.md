# 2026-06-03 品牌增长策略新增公众号采集板块

## 背景

- `Brand Growth -> 收集数据` 原先只有飞书配置、小红书、抖音和每日热点。
- 公众号相关能力虽然已有独立 `/wechat` 工作台，但品牌增长策略内缺少面向数据收集阶段的公众号入口，无法在同一套收集页里完成文章详情、公众号搜索和文章搜索。

## 本次改动

- 在 `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx` 中新增 `wechatCollection` 页面键，并把入口放到“抖音”下方。
- 在 `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx` 中新增公众号采集页面，样式复用现有 collection 容器。
- 公众号采集页新增 3 个子卡片：
  - 获取微信公众号文章详情 JSON
  - 搜索微信公众号
  - 搜索微信公众号文章
- 页面结果展示字段按需求收口为：
  - 文章详情：标题、正文、作者、文中图片列表
  - 公众号搜索：公众号名称、公众号页面链接
  - 文章搜索：文章标题、文章链接
- 在 `packages/shared/src/brand-permissions.ts` 和 `apps/web/src/services/brand-growth.ts` 中补入独立权限键：
  - `brandGrowth.collection.wechatCollection`
  - `brandGrowth.collection.douyinCollection`
- `workspace.tsx` 中同步修正抖音页权限映射，不再继续复用小红书收集权限。

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - `apps/web/src/services/brand-growth.ts`
- 权限：
  - `packages/shared/src/brand-permissions.ts`
- 后端公众号采集接口沿用此前已补好的 collectors service / controller / module。

## 验证

- 使用 VS Code diagnostics 检查以下文件，当前无新增类型错误：
  - `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - `apps/web/src/services/brand-growth.ts`
  - `packages/shared/src/brand-permissions.ts`
  - `apps/server/src/modules/collectors/collectors.service.ts`
  - `apps/server/src/modules/collectors/collectors.controller.ts`
  - `apps/server/src/modules/collectors/collectors.module.ts`

## 后续建议

- 如需更强权限隔离，可进一步把飞书配置从 `brandGrowth.collection.xiaohongshuCollection` 中拆成独立权限键。
- 若后续需要验证 TikHub 真实返回结构，可补一轮联调截图或接口录样，进一步收紧公众号字段映射。
