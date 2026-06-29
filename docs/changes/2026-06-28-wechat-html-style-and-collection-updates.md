# 公众号HTML排版技能改造 + 品牌增长策略公众号采集板块 + 视频文案复制弹窗

## 1. 变更背景

- 用户要求将公众号工作台的"生成最终公众号 HTML"板块从原来的 6 参数排版系统（推荐预设/排版风格/精细排版参数）改为简单的 4 种排版风格选择（通用排版/极简排版/空间艺术排版/通知类排版）
- 用户要求在品牌增长策略-收集数据板块新增公众号采集功能，包含品牌公众号数据、对标作品信息及数据、微信搜一搜三个子版块
- 用户要求视频文案点击复制时有"已复制"弹窗提醒
- 新的排版技能提示词未自动入库，需要补全种子数据

## 2. 变更目标

- 公众号 HTML 排版从复杂参数系统简化为 4 种排版风格下拉选择
- 4 个排版技能提示词从 txt 文件自动写入数据库
- 品牌增长策略新增公众号采集板块，调用 TikHub 和 GLM reader 接口
- 视频文案点击复制增加浮动 toast 弹窗

## 3. 修改内容

### 3.1 前端

- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`：删除推荐预设、排版风格、精细排版参数 3 个板块，改为"选择文章排版风格"下拉框
- `apps/web/src/app/(dashboard)/brand-growth/wechat-mp-collection-workspace.tsx`：新建公众号采集工作区组件，包含品牌公众号数据、对标作品信息及数据、微信搜一搜三个子版块
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`：集成公众号采集工作区状态和渲染
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`：视频文案复制增加 CopyToastPortal 浮动弹窗
- `apps/web/src/services/works.ts`：WechatHtmlStyleConfig 类型简化为 { styleType } 单字段
- `apps/web/src/services/collectors.ts`：新增公众号采集和对标作品相关 API 函数和类型
- `apps/web/src/styles/globals.css`：新增 copy-toast 样式和 wechat-mp-article-table-shell 固定高度样式，并补充收集数据表格 80px 行高约束与公众号标题多行截断

### 3.2 后端

- `apps/server/src/modules/admin/skills-prompts.service.ts`：删除旧 prompt_wechat_html_render 常量和绑定，新增 4 个排版技能提示词常量、绑定和 backfill 方法
- `apps/server/src/modules/works/works.service.ts`：WechatHtmlStyleConfig 简化为 { styleType }，generateWechatHtmlByModel 根据 styleType 动态选择 promptId
- `apps/server/src/modules/collectors/collectors.service.ts`：新增公众号采集方法（品牌账号绑定、文章列表获取、GLM reader 读取正文、TikHub stats 更新、微信搜一搜），并增强 fetch_article_stats 的深层字段解析兼容性
- `apps/server/src/modules/collectors/collectors.controller.ts`：新增 WechatMpCollectorsController（公众号采集+对标作品+搜一搜路由）
- `apps/server/src/modules/collectors/collectors.module.ts`：注册新 controller
- `apps/server/src/common/mock-data.ts`：新增 4 个 prompt 种子和 4 个 skill 种子
- `apps/server/src/common/prompt-source-loader.ts`：新增 4 个 promptId 文件路径候选

### 3.3 数据与配置

- `packages/shared/src/brand-permissions.ts`：新增 brandGrowth.collection.wechatMpCollection 权限键
- `packages/shared/src/skill-center-manifest.ts`：删除 wechat-html-render，新增 wechat-html-general/minimal/space/notice 4 个技能
- `apps/web/src/services/brand-growth.ts`：BrandPermissionKey 类型新增 wechatMpCollection
- 提示词文件位于 `提示词/公众号提示词/html排版提示词/` 下的 4 个 txt 文件

## 4. 修改意图

- 简化公众号排版体验：从 6 个参数的复杂选择简化为一键选择排版风格
- 排版技能提示词从文件自动入库：通过 mock-data.ts 种子 + prompt-source-loader.ts 文件路径 + backfill 方法三层保障
- 公众号采集链路完整：品牌账号绑定 → TikHub 获取文章列表 → GLM reader 读取正文 → TikHub fetch_article_stats 更新阅读量、点赞数等互动数据
- 微信搜一搜：关键词搜索 + 类型/排序/时间筛选 + 翻页 + GLM reader 读正文 + TikHub stats 更新
- 收集数据表格高度约束补强：不仅锁定 `tr/td` 为 80px，也对公众号标题单元格增加 3 行截断，避免长标题继续撑高整行
- 公众号互动数据兼容性补强：`fetch_article_stats` 统一使用深层多键名数值提取，兼容返回体中的嵌套结构与字符串数值

## 5. 影响范围

- 影响页面：公众号工作台、品牌增长策略-收集数据
- 影响接口：新增 collectors/wechat-mp 系列 API
- 影响模块：collectors、works、admin/skills-prompts
- 不影响已有数据：旧的 htmlStyleConfig 数据通过兼容处理回退到默认值
- 旧的 prompt_wechat_html_render 和 wechat-html-renderer 保留不删除，ON CONFLICT DO NOTHING 不会覆盖

## 6. 验证方式

- 前端 `tsc --noEmit` → exit code 0
- 后端 `tsc --noEmit` → exit code 0
- 服务重启后 bootstrapRegistryTables 自动写入 4 个 prompt 和 4 个 skill 到数据库
- backfillWechatHtmlStylePromptContents 确保提示词内容从 txt 文件同步

## 7. 风险与后续

- 旧的 prompt_wechat_html_render 和 wechat-html-renderer 可以后续清理
- 公众号采集的图片暂未转 OSS 链接（外部链接直接展示）
- TikHub 接口响应较慢，前端需设置合理超时

## 8. 相关文件

- `apps/server/src/modules/admin/skills-prompts.service.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/server/src/modules/collectors/collectors.controller.ts`
- `apps/server/src/common/mock-data.ts`
- `apps/server/src/common/prompt-source-loader.ts`
- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/wechat-mp-collection-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
- `apps/web/src/services/works.ts`
- `apps/web/src/services/collectors.ts`
- `packages/shared/src/brand-permissions.ts`
- `packages/shared/src/skill-center-manifest.ts`

## 9. 后续增量：统一素材库改造

### 9.1 变更目标

- 将“小红书素材库”和“抖音素材库”从各自工作台中收口，统一迁移到 `品牌增长策略 -> 品牌增长报告 -> 素材库`
- 统一素材库以表格列表展示，字段融合小红书与抖音素材，并增加平台类型列
- 小红书创作、抖音二创文案、抖音复刻短视频、抖音 AI 生视频、RunningHub、数字人等需要选素材的入口，统一消费同一份素材源

### 9.2 前端调整

- `apps/web/src/services/collectors.ts`：新增统一素材库类型、统一表格项构建函数、统一下拉选项构建函数
- `apps/web/src/app/(dashboard)/brand-growth/report-material-library-workspace.tsx`：新增品牌增长报告下的统一素材库表格页面
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`：在“选题库”下新增“素材库”子版块，并挂载统一素材库数据
- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`：移除小红书独立素材库入口，二创/视频创作改为读取统一素材库选项
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`：移除抖音独立素材库入口，二创文案 / 复刻短视频 / AI 生视频 / RunningHub / 数字人改为统一素材口径
- `apps/web/src/app/(dashboard)/douyin/remix-copy-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/remix-short-video-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/video-storyboard-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/video-direct-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/douyin-runninghub-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`：收集数据页的提示文案统一改为“加入统一素材库”

### 9.3 后端调整

- `apps/server/src/modules/collectors/collectors.service.ts`：新增统一素材库聚合与按 ID 查找能力，供各工作流跨平台取材
- `apps/server/src/modules/reports/reports.service.ts`：抖音二创文案工作区的 `materialOptions` 改为基于统一素材库构建，不再只读取抖音采集素材
- `apps/server/src/modules/works/works.service.ts`：小红书二创 / 视频笔记、抖音复刻短视频 / AI 生视频 / AI 直出视频统一改为按 `findUnifiedMaterialLibraryItem(...)` 查找素材

### 9.4 结果影响

- 素材采集入口仍位于品牌增长策略 -> 收集数据，但所有被加入素材库的内容都会统一沉淀到品牌增长报告下
- 小红书与抖音创作侧都可以直接复用对方平台中已入库且满足条件的素材
- 统一素材库表格沿用抖音数据表格风格，继续兼容固定 80px 行高与多行截断约束

## 10. 后续增量：公众号接入统一素材库 + 统一素材库预览修复

### 10.1 变更目标

- 让 `公众号 -> 对标作品信息及数据` 与 `公众号 -> 微信搜一搜` 也支持勾选后批量加入统一素材库
- 统一素材库补齐公众号来源，真正实现“小红书 / 抖音 / 公众号”三端采集结果共用
- 修复统一素材库图片在受保护地址下无法直接打开的问题，改为缩略图 + 点击预览

### 10.2 前端调整

- `apps/web/src/services/collectors.ts`：扩展 `UnifiedMaterialPlatform` 为 `WECHAT_MP`，补充公众号素材库字段与加入素材库 API
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`：统一素材库聚合改为同时接入公众号对标文章与搜一搜工作区，并新增公众号加入素材库 handler
- `apps/web/src/app/(dashboard)/brand-growth/wechat-mp-collection-workspace.tsx`：公众号两个列表新增批量 `加入素材库 / 删除 / 更新数据` 按钮，列表中新增素材库状态列
- `apps/web/src/app/(dashboard)/brand-growth/report-material-library-workspace.tsx`：统一素材库图片单元格改为受保护媒体加载、缩略图展示与弹层预览
- `apps/web/src/styles/globals.css`：补充统一素材库缩略图按钮、占位态与预览覆盖样式，继续锁定 80px 行高

### 10.3 后端调整

- `apps/server/src/modules/collectors/collectors.service.ts`：新增公众号对标文章 / 微信搜一搜加入素材库方法，映射输出增加 `isInMaterialLibrary` 与 `materialAddedAt`
- `apps/server/src/modules/collectors/collectors.controller.ts`：新增公众号素材库入库接口
- 统一素材库聚合接口同步纳入公众号来源，便于后续跨工作流按素材 ID 查找

### 10.4 结果影响

- 收集数据页现在三端列表都能通过勾选批量沉淀到统一素材库
- 统一素材库中的公众号文章会展示为 `平台类型=公众号`，并复用阅读量到统一的播放列口径
- 素材库图片对受保护媒体地址不再依赖直接外链打开，改为先拉取 blob 再本地预览
