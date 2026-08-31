# 品牌运营助手 Skill 高频任务路由手册

## 1. 这份文档做什么

这份手册解决的不是“有哪些工具”，而是：

- 用户一句话过来时，应该先怎么判断
- 先读什么，后写什么
- 哪些动作必须确认
- 哪些场景要直接回网页

## 2. 统一执行顺序

除非用户已经明确给出非常具体的工具级意图，否则统一按下面顺序执行：

1. `route_website_function_by_intent`
2. `get_website_function_execution_plan`
3. 补齐缺失信息
4. 按计划里的工具顺序执行
5. 返回结论、关键结果、下一步建议

默认心法：

- 先路由，再执行
- 先摘要，再决定是否继续深挖
- 先读状态，再决定是否写入或发布

## 3. 高频任务路由

### 3.1 看当前品牌和最近任务

典型问法：

- 帮我看当前品牌情况
- 最近任务怎么样
- 最近失败主要卡在哪

优先工具：

- `get_current_brand_context`
- `get_recent_tasks_summary`
- `get_failed_tasks_summary`

### 3.2 看品牌档案、IP资料库、产品、竞品和行业资料

典型问法：

- 帮我提取品牌档案摘要
- 帮我看下当前品牌 IP 资料
- 帮我更新 IP 定位 / IP 故事 / IP 价值观
- 帮我给 IP 资料库上传几张图片
- 帮我给 IP 资料库上传一段品牌语音
- 这个品牌主要卖什么
- 帮我看竞品账号和行业资料

优先工具：

- `manage_brand_library`
- `get_brand_archive_summary`
- `get_brand_archive_survey`
- `get_brand_products`
- `get_platform_accounts`
- `get_brand_competitor_accounts`
- `get_brand_industry_feeds`
- `get_brand_business_assets`

处理原则：

- 只看 IP 资料时，优先 `manage_brand_library` + `action=get_ip_library`
- 改 IP 字段时，优先 `manage_brand_library` + `action=update_ip_library`
- 上传 IP 图片时，优先 `manage_brand_library` + `action=upload_ip_image`
- 上传 IP 语音时，优先 `manage_brand_library` + `action=upload_ip_voice`
- IP 语音当前要求：`mp3` 且时长 `> 30 秒`
- 涉及整份品牌档案概览时，再配合 `get_brand_archive_summary`

### 3.3 维护知识库和资料

典型问法：

- 帮我创建一个知识库
- 把这份资料加进去
- 最近新增了哪些资料

优先工具：

- `create_knowledge_base`
- `upload_knowledge_base_files`
- `get_recent_knowledge_files`

确认规则：

- 上传资料默认做一次轻确认

### 3.4 看和改技能配置

典型问法：

- 这个技能现在怎么配的
- 把它恢复平台基线
- 帮我改下品牌级覆盖

优先工具：

- `get_skill_config_summary`
- `get_skill_config_detail`
- `update_skill_config`
- `reset_skill_to_platform_baseline`

确认规则：

- 修改和重置都属于高风险动作，默认先确认

### 3.5 看第三方接口和共享密钥可用性

典型问法：

- 当前品牌接了哪些接口
- OpenClaw 能不能直接用这个平台密钥
- 帮我更新 API Key

优先工具：

- `list_my_third_party_platforms`
- `check_my_third_party_platform_runtime_access`
- `update_my_third_party_platform_secret`

安全规则：

- 只能返回遮罩状态和可用性
- 严禁返回明文 API Key
- 如果某平台已被确认可直供网站运行时或 OpenClaw 使用，不要重复要求用户再发一次同样的明文密钥

多元探索统一网关处理规则：

- 典型问法：
  - 帮我看多元探索接进来没有
  - 帮我把多元探索平台的品牌共享 Key 更新一下
  - 现在文本、图像、视频、音频、音乐是不是都能直用多元探索
  - 设计工作台或 OpenClaw 现在能不能直接吃多元探索
- 默认顺序：
  1. `list_my_third_party_platforms`
  2. `check_my_third_party_platform_runtime_access`
  3. 只有当前品牌还没配置或需要替换密钥时，才 `update_my_third_party_platform_secret`
- 输出要求：
  - 先告诉用户多元探索是否已经接入当前品牌
  - 再告诉用户五类 runtime 的可用性结论
  - 最后再决定是否要继续路由到设计、视频、音频或 OpenClaw 相关能力
- 不要把多元探索说成一个独立工作台；它当前在产品里属于统一网关型第三方平台
- 如果用户明确说“就用多元探索做图 / 做视频”：
  - 平台识别阶段不要把 APIZ / XSkill 当成多元探索
  - 后续必须从模型列表中选择 `providerName` 为多元探索的 `selectionKey`
  - 若当前列表里没有多元探索对应的 `selectionKey`，应明确告知“当前品牌/工作台还不能直接用多元探索”，不要私自切到 APIZ

### 3.6 团队协作和邀请

典型问法：

- 帮我看当前品牌成员和邀请
- 创建一个员工邀请链接
- 看我还有哪些邀请没处理
- 接受这个邀请

优先工具：

- `list_brand_members`
- `list_brand_invites`
- `create_brand_invite_link`
- `revoke_brand_invite`
- `get_brand_permission_settings`
- `list_my_brand_invites`
- `list_my_brand_invite_notifications`
- `accept_my_brand_invite`

确认规则：

- 创建邀请链接前，优先确认角色、有效期和备注

### 3.7 品牌增长报告、半年营销规划、营销策划

典型问法：

- 帮我做一份品牌增长报告
- 做半年营销规划
- 给我一版营销方案

优先工具：

- `manage_growth_reports`
- `get_latest_brand_growth_report_summary`
- `create_brand_growth_report`
- `create_half_year_marketing_plan`
- `get_brand_growth_visual_report_workspace`
- `generate_brand_growth_visual_report`
- `get_brand_growth_marketing_calendar_workspace`
- `generate_brand_growth_marketing_calendar`
- `update_brand_growth_marketing_calendar`
- `get_brand_growth_topic_library_workspace`
- `generate_brand_growth_topic_candidates`
- `update_brand_growth_topic_library`
- `get_brand_growth_material_library_items`

处理原则：

- 用户只说“做营销方案 / 营销规划 / 报告”时，优先让 `manage_growth_reports` 先做统一编排
- 用户明确只要某一份单体产物时，再走专用创建工具
- 用户明确提到“品牌增长可视化报告 / 营销日历 / 选题库 / 素材库”时，优先走对应的品牌增长语义别名工具，不再混用 `xiaohongshu_*` 或 `douyin_*` 命名
- 选题库支持人工与 OpenClaw 共用同一份结构化记录；OpenClaw 侧优先用 `create_brand_growth_topic_library_item`、`update_brand_growth_topic_library_item`、`delete_brand_growth_topic_library_item` 做单条增删改

### 3.8 看和同步采集数据

典型问法：

- 帮我看品牌资料库里的小红书/抖音/公众号采集
- 帮我同步一下
- 帮我更新公众号文章统计
- 帮我删掉采集错的数据
- 这个抖音视频预览为什么打不开
- 帮我看这个抖音视频实际存到了哪里
- 上次抖音视频文案一直卡在提取中，现在充值后帮我重新提取

优先工具：

- 小红书：
  - `get_xiaohongshu_collection_workspace`
  - `sync_xiaohongshu_*`
- 抖音：
  - `get_douyin_collection_workspace`
  - `extract_douyin_work_transcript`
  - `sync_douyin_*`
- 公众号：
  - `get_wechat_collection_workspace`
  - `sync_wechat_brand_accounts`
  - `fetch_wechat_brand_articles`
  - `sync_wechat_benchmark_articles`
  - `sync_wechat_search_articles`
  - `update_wechat_article_stats`
- 删除：
  - `delete_xhs_collected_note`
  - `delete_douyin_collected_work`
  - `delete_wechat_collected_article`

处理原则补充：

- 用户问“视频存哪里了”时，优先先读 `get_douyin_collection_workspace`
  - 看 `videoStoragePath`
  - 看 `videoUrl`
  - 看 `videoSourceUrl`
- 用户问“为什么网页里打开预览失败”时，不要只盯着外部下载地址：
  - 当前网页预览优先依赖站内受控副本
  - 若受控副本未就绪、已过期或曾失败，应同时把原作品地址和缓存状态告诉用户
- 用户问“为什么一直是提取中”时，优先查看：
  - `transcriptStatus`
  - `transcriptStatusUpdatedAt`
  - `transcriptLastError`
- 如果错误里出现余额不足、欠费、quota、credit、balance 等信息，应直接告诉用户：
  - 这是上游 GLM Key 额度问题
  - 充值后可再次调用 `extract_douyin_work_transcript`
- 如果状态长期停在 `PENDING`，当前后端会自动把超时任务收口成可重试失败态；Skill 不需要继续把它描述成“还在正常处理中”

### 3.9 统一素材库

典型问法：

- 帮我看统一素材库
- 把这条内容加入素材库
- 从素材库里移除

优先工具：

- `get_unified_material_library_items`
- `get_douyin_material_library_items`
- `add_xiaohongshu_note_to_material_library`
- `add_douyin_work_to_material_library`
- `add_wechat_article_to_material_library`
- `remove_xiaohongshu_note_from_material_library`
- `remove_douyin_work_from_material_library`

### 3.10 小红书图文

典型问法：

- 帮我做一版原创笔记
- 基于素材做一版二创笔记

优先工具：

- `create_xiaohongshu_original_note`
- `create_xiaohongshu_rewrite_note`

### 3.11 小红书视频笔记与草稿箱

典型问法：

- 帮我做一条小红书视频笔记
- 帮我把作品送到小红书草稿箱

优先工具：

- `manage_xiaohongshu_video`
- `create_xiaohongshu_mobile_draft_session`
- `get_xiaohongshu_mobile_draft_session`
- `create_xiaohongshu_desktop_draft_session`
- `get_xiaohongshu_desktop_draft_session`

### 3.12 抖音文案

典型问法：

- 帮我做一条抖音原创文案
- 帮我做一条抖音二创文案

优先工具：

- `create_douyin_original_copy`
- `create_douyin_remix_copy`

### 3.13 抖音视频、数字人、RunningHub、广告预审

典型问法：

- 帮我做一条抖音视频
- 帮我用数字人做视频
- 帮我用 RunningHub 跑这个应用
- 帮我做广告预审

优先工具分两组：

- 通用抖音视频生产：
  - `manage_douyin_video_production`

子路由：

- 普通视频：`section=video`
- 直接生视频：`section=direct_video`
- 混剪短视频：`section=remix_short_video`
- 数字人：`section=digital_human`
- 口型驱动：`section=lip_sync`
- RunningHub：`section=runninghub`
- 广告预审：`section=ad_preaudit`

RunningHub 关键规则：

1. 先 `list_apps`
2. 再 `get_app_detail`
3. 从返回的 `nodeInfoList` 模板里回填参数
4. 最后 `generate`
5. 如果节点是图片、音频、视频上传位：
   - 传本地文件时，把 `localFilePath` 放在节点对象顶层
   - 传文件内容时，走 `upload.fileName / upload.contentType / upload.dataBase64`
   - 不要把 `{ localFilePath: ... }`、`{ fileName, contentType, dataBase64 }` 这类对象直接塞进 `fieldValue / fieldData`

当前可直接识别的 RunningHub 示例：

- `minimax-h3-fl2va-text-to-video`：文生视频
- `minimax-h3-fl2va-first-frame-video`：首帧参考生视频
- `minimax-h3-fl2va-first-last-frame-video`：首尾帧参考生视频
- `minimax-h3-fl2va-multi-image-video`：多图参考生视频
- `minimax-h3-audio-clip-single-image-digital-human`：音频裁剪驱动 MiniMax H3 数字人单图版
- `minimax-h3-multi-image-2k-upscale-v3`：4 步 Lora 超级加速多图生视频 + 2K 放大 V3
- `minimax-h3-8step-image-to-video`：8 步加速图生视频
- `minimax-h3-4step-first-last-frame-video`：4 步加速首尾帧生视频
- `minimax-h3-accelerated-all-reference-video`：全能参考视频
- `minimax-h3-digital-human-auto`：数字人口播 / 唱歌 / 电商讲解自动版
- `seedance25-multimodal-video`：Seedance 2.5 多模态视频
- `seedance20-viral-video-remix`：Seedance 2.0 复刻爆款视频
- `seedance20-fast-all-reference-video`：Seedance 2.0 Fast 全能生视频
- `seedance20-fast-rh`：Seedance 2.0 Fast RH 版
- `qwen-image-chinese-font-design`：中文字体设计图生图
- `qwen-font-design-8step`：Qwen 8 步加速字体设计

### 3.14 公众号工作流

典型问法：

- 帮我创建一条公众号工作流
- 直接生成正文、配图和 HTML
- 我已经有文章或 HTML，直接写进去
- 重算发布确认状态
- 正式发稿

优先工具：

- `manage_wechat_workflow`

子路由：

- 直写外部结果：
  - `set_article`
  - `set_images`
  - `set_html`
- 继续网站生成：
  - `generate_article`
  - `generate_images`
  - `generate_html`
- 发布前检查：
  - `rebuild_publish_config`
- 正式发布：
  - `publish_workflow`

关键规则：

- 外部已有结果时，不要再重复生成
- 正式发布属于高风险动作，默认先确认
- 如果用户只说“帮我把这篇文章发公众号”，先判断他是要新建工作流、直写外部结果，还是直接正式发布

### 3.15 设计工作台

典型问法：

- 帮我做一张海报
- 做一个 HTML 视觉稿
- 做一页 PPT
- 做一个视频方案设计

优先工具：

- `get_design_workspace_options`
- `get_recent_design_works`
- `create_design_work`

关键规则：

- 指定模型前必须先读 options
- 如果用户指定参考图，尽量带上参考图输入
- 如果用户明确指定图片尺寸，优先传 `imageSize: "宽x高"`，例如 `1200x628`
- 兼容旧链路时也可以继续传 `spec: "宽x高"`，但不要把“品牌封面图 / 信息图海报”误写成纯中文尺寸描述
- 当前 `create_design_work` 在图片模块下如果未显式传 `modelSelection`，OpenClaw 默认会优先尝试工作台模型列表里 `providerName=多元探索` 的 `gpt-image-2`；若当前品牌没有多元探索可用项，才回退到工作台推荐项
- 如果用户说“用多元探索做图 / 做视频方案”，先检查多元探索平台 runtime 是否可用；确认可用后，仍然通过网站现有的设计或视频工具链执行，不直接伪造一个不存在的多元探索专用设计工具

### 3.16 OpenClaw 专区

典型问法：

- 帮我写每日计划/每周复盘
- 帮我生成音乐并保存素材
- 帮我把结果存进创作素材
- 帮我把最终视频保存到视频作品

优先工具：

- 每周复盘：
  - `get_openclaw_lobster_diaries`
  - `create_openclaw_lobster_diary`
  - `update_openclaw_lobster_diary`
  - `delete_openclaw_lobster_diary`
- 策略优化记录：
  - `get_openclaw_strategy_optimizations`
  - `create_openclaw_strategy_optimization`
  - `update_openclaw_strategy_optimization`
  - `delete_openclaw_strategy_optimization`
- 每日计划：
  - `get_openclaw_daily_plans`
  - `create_openclaw_daily_plan`
  - `delete_openclaw_daily_plan`
- 音乐：
  - `create_volcengine_music_task`
  - `get_volcengine_music_task`
- 创作素材：
  - `get_openclaw_creative_materials`
  - `create_openclaw_creative_material`
  - `delete_openclaw_creative_material`
- 视频作品：
  - `get_openclaw_video_works`
  - `create_openclaw_video_work`
  - `delete_openclaw_video_work`
  - `create_openclaw_video_work_douyin_desktop_publish_session`

处理原则：

- OpenClaw 的创作素材、视频作品、GEO获客内容、全网获客评论名单都是归档板块，不是生成引擎本身
- 音乐任务创建成功不代表最终完成，必须继续轮询结果
- 当用户要求“生成后直接沉淀到素材库”时，优先把归档动作一并完成
- 当用户明确要求“先看多元探索平台当前是否可供 OpenClaw 直用，再决定是否生成并沉淀素材”时，先走第三方接口配置域工具，不要直接跳过可用性检查
- 创作素材列表当前统一回显：
  - 标题
  - 素材标签
  - 素材来源
  - 入库时间
  - 存储位置（本地文件夹地址）

### 3.17 个人中心素材管理

典型问法：

- 帮我看素材管理里的图片素材
- 帮我看内容获客最近入库的文本素材
- 帮我看哪些素材已经落到本地文件夹
- 帮我看当前素材库存到哪个本地目录
- 帮我把本地版素材库目录改到 D 盘

优先工具：

- `list_personal_material_assets`
- `get_local_material_storage_settings`
- `update_local_material_storage_settings`

处理原则：

- 这是个人中心聚合视角，不是新建第二套素材库
- 数据来源统一覆盖网站上传素材与 OpenClaw 入库素材
- 默认按 `text / image / audio / video` 四类路由
- 用户如果在问本地版素材到底写到哪个目录，优先先读 `get_local_material_storage_settings`
- 用户如果要改目录，调用 `update_local_material_storage_settings`，传入的是【素材库】外层根目录
- 网站上传素材会写入用户配置的 `素材库/文本|图片|语音|视频`
- OpenClaw 上传素材不要求必须写入 `素材库`，但同样要出现在四分类列表里
- 如果用户要求看具体素材内容，再回到对应内容获客子板块或继续读取创作素材详情

### 3.18 GEO获客可见度诊断

典型问法：

- 帮我保存 GEO 诊断报告
- 帮我看 GEO 报告列表

优先工具：

- `get_openclaw_geo_visibility_reports`
- `create_openclaw_geo_visibility_report`
- `delete_openclaw_geo_visibility_report`

### 3.19 GEO获客其它工作流内容

典型问法：

- 帮我保存关键词挖掘结果
- 帮我看网站诊断、知识库搭建或 GEO优化方案
- 帮我看自媒体内容 / 第三方媒体 / 品牌网站列表
- 帮我看某条结果的存储地址

优先工具：

- `get_openclaw_geo_contents`
- `create_openclaw_geo_content`
- `delete_openclaw_geo_content`

### 3.20 全网获客评论获客

典型问法：

- 帮我把小红书和抖音评论用户生成评论获客名单
- 帮我看全网获客里的评论获客列表
- 帮我删掉这条评论获客记录

优先工具：

- `get_openclaw_comment_leads`
- `create_openclaw_comment_leads`
- `delete_openclaw_comment_lead`

### 3.21 全网获客平台获客

典型问法：

- 帮我看全网获客里的平台获客列表
- 帮我把这批平台名单写入平台获客
- 帮我删掉这条平台获客记录

优先工具：

- `get_openclaw_platform_leads`
- `create_openclaw_platform_leads`
- `delete_openclaw_platform_lead`

## 4. 哪些场景应当回网页

默认回网页承接的场景：

- 安全设置
- OpenClaw 安装中心里的可视化复制和安装操作
- 后台管理台
- 当前尚未开放 MCP 的纯页面浏览型能力
- 需要用户在网页中做最终人工确认的高风险纯页面流程

处理方式：

1. 先明确告诉用户这个功能属于哪个页面
2. 告诉用户为什么当前更适合在网页里处理
3. 如果 MCP 能先做摘要或预检查，先做摘要或预检查

## 5. 一句话结论

品牌运营助手要像一个网站总调度，而不是只会调几个孤立工具：

- 先路由
- 再拿执行计划
- 再按域执行
- 不会做的明确说清楚并回网页
