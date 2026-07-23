# 品牌运营助手 Skill 网站功能域地图

## 1. 这份文档怎么用

这份文档是给 `品牌运营助手` 主 Skill 配套使用的外部能力地图，用来回答 4 件事：

1. 网站现在有哪些真实业务域
2. 每个业务域对应哪个页面入口
3. 哪些能力可以直接通过 MCP 执行
4. 哪些能力当前仍以网站页面承接为主

当用户提到“网站里那个板块”“某个页面上的功能”“这个模块能不能直接做”时，优先配合：

- `get_website_function_catalog`
- `get_website_function_detail`
- `route_website_function_by_intent`
- `get_website_function_execution_plan`

## 2. 总体规则

- 当前品牌是默认上下文，除非用户明确切换品牌
- 能直接通过 MCP 执行的，优先在对话里完成
- 只有当前还没有直连 MCP 的页面功能，才引导用户回网页
- 即便当前要回网页，也要先告诉用户应去哪个页面、做什么动作、为什么不能直接在对话里完成

## 3. 网站功能域总览

### 3.1 品牌增长 `/brand-growth`

当前承载：

- 品牌资料库
- 企业知识库
- 小红书 / 抖音 / 公众号采集
- 品牌增长报告
- 半年营销规划
- 营销日历
- 选题库
- 统一素材库
- OpenClaw 的每日计划、每日复盘、创作素材、视频作品

当前优先 MCP：

- `manage_brand_library`
- `manage_growth_reports`
- `get_unified_material_library_items`
- `get_xiaohongshu_collection_workspace`
- `get_douyin_collection_workspace`
- `get_wechat_collection_workspace`
- `get_openclaw_daily_plans`
- `get_openclaw_lobster_diaries`
- `get_openclaw_creative_materials`
- `get_openclaw_video_works`

### 3.2 小红书 `/xiaohongshu`

当前承载：

- 原创图文
- 二创图文
- 视频笔记
- 草稿接力

当前优先 MCP：

- `create_xiaohongshu_original_note`
- `create_xiaohongshu_rewrite_note`
- `manage_xiaohongshu_video`
- `create_xiaohongshu_mobile_draft_session`
- `create_xiaohongshu_desktop_draft_session`

处理原则：

- 原创 / 二创图文优先走直连工具
- 视频笔记优先走 `manage_xiaohongshu_video`
- 草稿接力只有在用户明确要落到草稿箱时才继续发起

### 3.3 抖音 `/douyin`

当前承载：

- 原创文案
- 二创文案
- AI 生视频
- 数字人
- 口型驱动
- RunningHub
- 广告预审
- 发布工作流

当前优先 MCP：

- `create_douyin_original_copy`
- `create_douyin_remix_copy`
- `manage_douyin_video_production`
- `create_douyin_mobile_publish_session`
- `create_douyin_desktop_publish_session`

处理原则：

- 普通视频、直接视频、混剪短视频、数字人、口型驱动、RunningHub、广告预审都优先从 `manage_douyin_video_production` 进入
- 数字人语音试听属于 `section=digital_human`
- RunningHub 属于 `section=runninghub`
- 广告预审属于 `section=ad_preaudit`

### 3.4 公众号 `/wechat`

当前承载：

- 账号配置
- 正文工作流
- 配图生成
- HTML 排版
- 发布确认
- 正式发布
- 发布历史

当前优先 MCP：

- `manage_wechat_workflow`
- `get_wechat_article_drafts`
- `get_wechat_official_accounts`
- `get_wechat_workflow_sessions`
- `get_wechat_workflow_preferences`
- `get_wechat_workflow_session_detail`
- `check_wechat_workflow_publish_readiness`
- `get_wechat_publish_history`
- `get_wechat_publish_history_detail`
- `publish_wechat_article`
- `publish_wechat_workflow`
- `retry_wechat_publish_history`

处理原则：

- 公众号工作流优先走统一工具 `manage_wechat_workflow`
- `set_article / set_images / set_html` 表示外部已有结果，直接写入
- `generate_article / generate_images / generate_html` 表示继续走网站链路
- 发布前先 `rebuild_publish_config`
- 正式发稿再 `publish_workflow`

### 3.5 设计工作台 `/more-features/design`

当前承载：

- 图片设计
- HTML 设计
- PPT 设计
- 视频方案设计

当前优先 MCP：

- `get_design_workspace_options`
- `get_recent_design_works`
- `create_design_work`

处理原则：

- 真正创建任务前先看 options
- 指定模型时必须使用返回的 `selectionKey`
- 有参考图时优先带上 `referenceImageUrl` 或 `referenceImage`

### 3.6 个人中心 `/personal-center`

当前承载：

- 概览
- 任务中心
- 订单中心
- 作品中心
- 技能中心
- 第三方接口配置
- OpenClaw 安装中心
- 安全设置
- 团队协作
- 邀请通知

当前优先 MCP：

- `get_personal_center_overview`
- `get_recent_tasks_summary`
- `get_failed_tasks_summary`
- `get_task_detail`
- `cancel_task`
- `retry_task`
- `list_my_orders`
- `get_skill_config_summary`
- `get_skill_config_detail`
- `update_skill_config`
- `reset_skill_to_platform_baseline`
- `list_my_third_party_platforms`
- `check_my_third_party_platform_runtime_access`
- `update_my_third_party_platform_secret`
- `list_brand_members`
- `list_brand_invites`
- `create_brand_invite_link`
- `revoke_brand_invite`
- `get_brand_permission_settings`
- `list_my_brand_invites`
- `list_my_brand_invite_notifications`
- `accept_my_brand_invite`

页面承接为主：

- `作品中心`
- `安全设置`
- `OpenClaw 安装中心`

处理原则：

- 如果用户问的是“账号安全”“密码”“登录保护”“安装中心”，先判断当前是否已有 MCP 能力直连
- 没有直连时，不要假装能执行；应明确引导回对应页面
- 如果用户问的是“多元探索 / duoyuanx 平台现在接进来了没有”“这份品牌共享 Key 能不能给文本、图像、视频、音频、音乐一起用”，优先把它当成 `第三方接口配置` 域处理，而不是当成某个单独页面功能
- 多元探索当前在网站里属于统一网关型第三方平台：
  - 一份品牌共享 Key
  - 统一承接文本、图像、视频、音频、音乐五类运行时
  - 具体业务执行仍由网站已有工作台或运行时路由消费，而不是新增一个单独的“多元探索工作台”
- Skill 在涉及多元探索时，默认顺序应为：
  1. `list_my_third_party_platforms`
  2. `check_my_third_party_platform_runtime_access`
  3. 必要时再 `update_my_third_party_platform_secret`

### 3.7 GEO `/geo`

当前承载：

- GEO 可见度诊断 HTML 报告查看
- 报告保存
- 报告删除

当前优先 MCP：

- `get_openclaw_geo_visibility_reports`
- `create_openclaw_geo_visibility_report`
- `delete_openclaw_geo_visibility_report`

### 3.8 后台管理 `/admin`

当前原则：

- 这不是品牌员工默认应使用的域
- 如果当前会话身份不是管理员，不应把后台能力当成默认可执行任务
- 即便未来开放后台 MCP，也必须单独按管理员权限处理

## 4. Skill 的实际落地规则

### 4.1 能直接执行的域

以下域默认优先在对话里直接完成：

- 品牌增长
- 小红书
- 抖音
- 公众号
- 设计工作台
- 个人中心中的任务 / 订单 / 技能 / 第三方接口 / 团队协作
- OpenClaw 数据归档
- GEO

### 4.2 先读后写的域

以下域默认必须先读上下文，再决定是否写入：

- 技能中心
- 团队协作
- 第三方接口配置
- 公众号正式发布
- 发布会话创建

### 4.3 页面承接优先的域

以下场景当前更适合网页承接：

- OpenClaw 安装中心里的可视化安装与复制动作
- 安全设置
- 后台管理台
- 作品中心的大范围人工浏览

### 4.4 当用户只说“网站那个功能”

统一顺序：

1. `route_website_function_by_intent`
2. `get_website_function_detail`
3. `get_website_function_execution_plan`
4. 再决定是直接执行，还是回网页承接

## 5. 一句话结论

品牌运营助手不应该只会几个孤立工具，而是要把整站功能理解为：

- 可直接对话执行的功能
- 需要确认后执行的功能
- 当前仍以页面承接为主的功能

三类统一路由。
