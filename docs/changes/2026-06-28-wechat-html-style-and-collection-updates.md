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
- `apps/web/src/styles/globals.css`：新增 copy-toast 样式和 wechat-mp-article-table-shell 固定高度样式

### 3.2 后端

- `apps/server/src/modules/admin/skills-prompts.service.ts`：删除旧 prompt_wechat_html_render 常量和绑定，新增 4 个排版技能提示词常量、绑定和 backfill 方法
- `apps/server/src/modules/works/works.service.ts`：WechatHtmlStyleConfig 简化为 { styleType }，generateWechatHtmlByModel 根据 styleType 动态选择 promptId
- `apps/server/src/modules/collectors/collectors.service.ts`：新增公众号采集方法（品牌账号绑定、文章列表获取、GLM reader 读取正文、TikHub stats 更新、微信搜一搜）
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
- 公众号采集链路完整：品牌账号绑定 → TikHub 获取文章列表（raw=true 提取阅读量/点赞数）→ GLM reader 读取正文 → TikHub fetch_article_stats 更新互动数据
- 微信搜一搜：关键词搜索 + 类型/排序/时间筛选 + 翻页 + GLM reader 读正文 + TikHub stats 更新

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