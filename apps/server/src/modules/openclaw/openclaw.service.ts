import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { normalizeSafeText } from "../../common/prompt-injection-guard";
import { AuthService, type RequestAuthContext } from "../auth/auth.service";
import {
  type BrandBusinessKnowledgeBaseFileRecord,
  type BrandBusinessKnowledgeBaseRecord,
  type BrandInviteListRecord,
  BrandsService,
} from "../brands/brands.service";
import {
  CollectorsService,
  type DouyinCollectionWorkspace,
  type XhsAccountRole,
  type XhsCollectionWorkspace,
} from "../collectors/collectors.service";
import { FeedbackService } from "../feedback/feedback.service";
import { OpenClawCreativeMaterialService } from "./openclaw-creative-material.service";
import { OpenClawInstallationService } from "./openclaw-installation.service";
import { OpenClawDailyPlanService } from "./openclaw-daily-plan.service";
import { OpenClawGeoVisibilityReportService } from "./openclaw-geo-visibility-report.service";
import { OpenClawLobsterDiaryService } from "./openclaw-lobster-diary.service";
import { OpenClawVideoWorkService } from "./openclaw-video-work.service";
import {
  getOpenClawWorkspaceDashboardPath,
  getOpenClawWorkspaceDisplayName,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";
import { OrdersService } from "../orders/orders.service";
import { PublishingService } from "../publishing/publishing.service";
import { ReportsService } from "../reports/reports.service";
import { TasksService } from "../tasks/tasks.service";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";
import { VolcengineMusicService } from "../third-party-platforms/volcengine-music.service";
import { UserSkillsService } from "../user-skills/user-skills.service";
import { type GeneratedAssetUploadPayload, WorksService } from "../works/works.service";

type HeadersMap = Record<string, string | string[] | undefined>;

type OpenClawResultStatus = "COMPLETED" | "IN_PROGRESS" | "ACTION_REQUIRED";

type OpenClawNextAction = {
  label: string;
  action: "open_page" | "check_status" | "continue_in_chat" | "retry" | "confirm";
  target?: string;
};

type OpenClawSummaryResponse<TData> = {
  status: "success";
  title: string;
  summary: string;
  highlights: string[];
  data: TData;
  links: Array<{ label: string; url: string }>;
  entry?: { label: string; url: string };
  resultStatus: OpenClawResultStatus;
  resource?: {
    kind: string;
    primaryId?: string;
    relatedIds: string[];
  };
  nextActions: OpenClawNextAction[];
  allowed: boolean;
  requiresConfirmation: boolean;
};

type TaskRecord = {
  id: string;
  brandId?: string;
  taskType: string;
  taskTitle: string;
  taskStatus: string;
  errorMessage?: string;
  createdAt: string;
};

type OpenClawMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type OpenClawWebsiteFunctionRiskLevel = "low" | "medium" | "high";

type OpenClawWebsiteFunctionCatalogItem = {
  key: string;
  domainKey: string;
  domainName: string;
  name: string;
  summary: string;
  pageUrl: string;
  pageLabel: string;
  riskLevel: OpenClawWebsiteFunctionRiskLevel;
  intentKeywords: string[];
  requiredInputKeys: string[];
  requiredInputs: string[];
  recommendedQuestions: string[];
  mcpTools: string[];
};

const OPENCLAW_MCP_SERVER_INFO = {
  name: "ai-omni-ops-openclaw-mcp-http",
  version: "0.5.0",
};

const OPENCLAW_WEBSITE_FUNCTION_CATALOG: OpenClawWebsiteFunctionCatalogItem[] = [
  {
    key: "brand_context_overview",
    domainKey: "brand_growth",
    domainName: "品牌增长",
    name: "查看品牌上下文与任务概况",
    summary: "适合先了解当前品牌、最近任务、失败分布和增长报告重点。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "low",
    intentKeywords: ["品牌", "任务", "报告", "增长", "失败", "概况", "上下文"],
    requiredInputKeys: ["brandId"],
    requiredInputs: ["当前品牌"],
    recommendedQuestions: ["帮我看当前品牌最近的任务概况", "帮我总结最近失败任务主要卡在哪些问题上"],
    mcpTools: ["get_current_brand_context", "get_recent_tasks_summary", "get_failed_tasks_summary", "create_brand_growth_report"],
  },
  {
    key: "knowledge_base_management",
    domainKey: "brand_assets",
    domainName: "品牌资产",
    name: "创建知识库并管理资料",
    summary: "适合通过对话创建品牌知识库、上传资料并查看最近知识文件。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["知识库", "资料", "文档", "文件", "资产", "上传"],
    requiredInputKeys: ["knowledgeBaseName", "assetDescription"],
    requiredInputs: ["知识库名称", "资料文件或资料说明"],
    recommendedQuestions: ["帮我创建一个品牌知识库", "把这份资料加入当前品牌知识库"],
    mcpTools: ["create_knowledge_base", "upload_knowledge_base_files", "get_recent_knowledge_files"],
  },
  {
    key: "skill_configuration_control",
    domainKey: "skill_center",
    domainName: "技能中心",
    name: "查看并调整品牌技能配置",
    summary: "适合查看网站技能当前生效配置、调整品牌级覆盖或恢复平台基线。",
    pageUrl: "/personal-center/skills",
    pageLabel: "打开个人中心技能中心",
    riskLevel: "high",
    intentKeywords: ["技能", "提示词", "prompt", "配置", "基线", "模型", "覆盖"],
    requiredInputKeys: ["skillIdentifier", "changeTarget"],
    requiredInputs: ["skillId 或技能名称", "修改目标"],
    recommendedQuestions: ["帮我看当前品牌小红书技能用的是什么配置", "把这个技能恢复到平台基线"],
    mcpTools: ["get_skill_config_summary", "get_skill_config_detail", "update_skill_config", "reset_skill_to_platform_baseline"],
  },
  {
    key: "xiaohongshu_content_production",
    domainKey: "xiaohongshu",
    domainName: "小红书",
    name: "生成原创或二创笔记",
    summary: "适合围绕品牌产品、选题模板和素材库生成小红书内容。",
    pageUrl: "/xiaohongshu",
    pageLabel: "打开小红书工作区",
    riskLevel: "medium",
    intentKeywords: ["小红书", "笔记", "原创", "二创", "种草", "排期", "素材"],
    requiredInputKeys: ["topicOrProduct", "accountOrDirection"],
    requiredInputs: ["产品或主题", "账号或发布方向"],
    recommendedQuestions: ["帮我生成一篇小红书原创笔记", "帮我基于最近素材做一篇二创笔记"],
    mcpTools: ["get_xiaohongshu_marketing_calendar_options", "get_xiaohongshu_original_reference_templates", "get_recent_xiaohongshu_original_works", "create_xiaohongshu_original_note", "get_xiaohongshu_material_library_items", "create_xiaohongshu_rewrite_note"],
  },
  {
    key: "douyin_copy_production",
    domainKey: "douyin",
    domainName: "抖音",
    name: "生成抖音原创或二创文案",
    summary: "适合围绕抖音账号、产品和主题生成原创或二创文案。",
    pageUrl: "/douyin",
    pageLabel: "打开抖音工作台",
    riskLevel: "medium",
    intentKeywords: ["抖音", "文案", "短视频", "视频", "原创", "二创"],
    requiredInputKeys: ["topicOrProduct", "accountOrDirection"],
    requiredInputs: ["产品或主题", "账号或内容方向"],
    recommendedQuestions: ["帮我生成一条抖音原创文案", "帮我做一条抖音二创文案"],
    mcpTools: ["get_douyin_original_copy_options", "get_recent_douyin_original_copies", "create_douyin_original_copy", "get_douyin_remix_copy_options", "get_recent_douyin_remix_copies", "create_douyin_remix_copy"],
  },
  {
    key: "wechat_workflow_control",
    domainKey: "wechat",
    domainName: "公众号",
    name: "创建公众号内容并跟踪发布",
    summary: "适合查看草稿、账号、工作流会话、发布准备状态和发布结果。",
    pageUrl: "/wechat",
    pageLabel: "打开公众号工作台",
    riskLevel: "high",
    intentKeywords: ["公众号", "微信", "草稿", "发布", "工作流", "图文", "文章"],
    requiredInputKeys: ["wechatTopicOrDraft", "accountOrPublishTarget"],
    requiredInputs: ["公众号主题或草稿", "账号或发布目标"],
    recommendedQuestions: ["帮我看最近的公众号草稿", "帮我把这个公众号草稿正式发布"],
    mcpTools: ["get_wechat_article_drafts", "get_wechat_official_accounts", "get_wechat_workflow_sessions", "get_wechat_publish_history", "check_wechat_workflow_publish_readiness", "publish_wechat_article", "publish_wechat_workflow"],
  },
  {
    key: "design_workspace_control",
    domainKey: "design",
    domainName: "设计工作台",
    name: "生成设计作品并查看结果",
    summary: "适合通过对话发起图片、HTML、PPT 等设计任务并查看最近作品。",
    pageUrl: "/more-features/design",
    pageLabel: "打开设计工作台",
    riskLevel: "medium",
    intentKeywords: ["设计", "海报", "图片", "封面", "ppt", "HTML", "视觉"],
    requiredInputKeys: ["designGoal", "styleOrAssetRequirement"],
    requiredInputs: ["设计目标", "素材或风格要求"],
    recommendedQuestions: ["帮我生成一张活动海报", "帮我看最近的设计作品结果"],
    mcpTools: ["get_design_workspace_options", "get_recent_design_works", "create_design_work"],
  },
  {
    key: "task_feedback_and_tracking",
    domainKey: "task_center",
    domainName: "任务中心",
    name: "跟踪任务并提交结果反馈",
    summary: "适合查看任务详情、取消重试任务并记录结果反馈。",
    pageUrl: "/personal-center/tasks",
    pageLabel: "打开个人中心任务中心",
    riskLevel: "medium",
    intentKeywords: ["任务", "状态", "进度", "反馈", "重试", "取消", "结果"],
    requiredInputKeys: ["taskId", "feedbackOrReason"],
    requiredInputs: ["taskId", "反馈内容或重试原因"],
    recommendedQuestions: ["帮我看这个任务现在怎么样了", "帮我记录这次生成结果不满意的原因"],
    mcpTools: ["get_task_detail", "cancel_task", "retry_task", "submit_task_result_feedback", "get_feedback_summary", "get_feedback_analysis"],
  },
  {
    key: "brand_archive_and_assets",
    domainKey: "brand_archive",
    domainName: "品牌档案",
    name: "提取品牌档案、竞品账号和行业资料",
    summary: "适合直接读取当前品牌的建档问卷、平台账号、竞品账号、行业资料和业务资产摘要。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "low",
    intentKeywords: ["品牌档案", "问卷", "品牌账号", "竞品", "行业资料", "行业报告", "业务资产"],
    requiredInputKeys: ["brandId"],
    requiredInputs: ["当前品牌"],
    recommendedQuestions: ["帮我提取当前品牌档案摘要", "帮我看一下当前品牌的竞品账号和行业资料"],
    mcpTools: [
      "get_brand_archive_summary",
      "get_brand_archive_survey",
      "get_platform_accounts",
      "get_brand_competitor_accounts",
      "get_brand_industry_feeds",
      "get_brand_business_assets",
    ],
  },
  {
    key: "xiaohongshu_collection_workspace",
    domainKey: "brand_growth",
    domainName: "品牌增长",
    name: "查看并同步小红书搜集数据",
    summary: "适合读取品牌资料库中的小红书搜集数据工作区，并直接触发品牌账号、竞品账号、作品、搜索笔记和飞书副本同步。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["品牌资料库", "搜集数据", "小红书板块", "小红书采集", "搜索笔记", "目标用户", "飞书副本"],
    requiredInputKeys: ["brandId"],
    requiredInputs: ["当前品牌"],
    recommendedQuestions: ["帮我看品牌资料库里小红书搜集数据板块", "帮我同步一下小红书搜索笔记和飞书副本"],
    mcpTools: [
      "get_xiaohongshu_collection_workspace",
      "sync_xiaohongshu_brand_accounts",
      "sync_xiaohongshu_competitor_accounts",
      "sync_xiaohongshu_brand_notes",
      "sync_xiaohongshu_benchmark_notes",
      "sync_xiaohongshu_search_notes",
      "sync_xiaohongshu_target_users",
      "sync_xiaohongshu_feishu_workspace",
      "add_xiaohongshu_note_to_material_library",
    ],
  },
  {
    key: "douyin_collection_workspace",
    domainKey: "brand_growth",
    domainName: "品牌增长",
    name: "查看并同步抖音搜集数据",
    summary: "适合读取品牌资料库中的抖音搜集数据工作区，并直接触发品牌账号、竞品账号、对标作品、搜索结果和评论数据同步。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["品牌资料库", "搜集数据", "抖音板块", "抖音采集", "对标账号", "对标作品", "搜索结果", "评论数据"],
    requiredInputKeys: ["brandId"],
    requiredInputs: ["当前品牌"],
    recommendedQuestions: ["帮我看品牌资料库里抖音搜集数据板块", "帮我同步一下抖音对标账号和对标作品"],
    mcpTools: [
      "get_douyin_collection_workspace",
      "sync_douyin_brand_accounts",
      "sync_douyin_competitor_accounts",
      "sync_douyin_benchmark_works",
      "sync_douyin_search_works",
      "sync_douyin_comment_data",
    ],
  },
  {
    key: "opportunity_insight_control",
    domainKey: "opportunity_insight",
    domainName: "机会洞察",
    name: "查看并推进机会洞察步骤",
    summary: "适合读取机会洞察工作区状态，并在对话中直接推进 step1、step2、step3 的生成。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["机会洞察", "账号分析", "评论洞察", "step1", "step2", "step3", "总报告"],
    requiredInputKeys: ["brandId"],
    requiredInputs: ["当前品牌"],
    recommendedQuestions: ["帮我看当前品牌机会洞察进行到哪一步了", "直接帮我继续生成机会洞察下一步"],
    mcpTools: [
      "get_opportunity_insight_workspace",
      "generate_opportunity_insight_step_one",
      "generate_opportunity_insight_step_two",
      "generate_opportunity_insight_step_three",
    ],
  },
  {
    key: "third_party_platform_control",
    domainKey: "personal_center",
    domainName: "个人中心",
    name: "查看品牌第三方接口配置",
    summary: "适合查看当前品牌已接入的平台、密钥遮罩状态、OpenClaw 可直接复用的共享凭证情况，并可按需更新品牌 API Key。",
    pageUrl: "/personal-center/third-party-platforms",
    pageLabel: "打开第三方接口配置",
    riskLevel: "high",
    intentKeywords: ["第三方接口", "API Key", "接口配置", "模型配置", "平台密钥", "渠道密钥"],
    requiredInputKeys: [],
    requiredInputs: [],
    recommendedQuestions: ["帮我看当前品牌第三方接口配置概况", "帮我确认 OpenClaw 能不能直接用当前品牌的第三方平台密钥", "帮我更新这个平台的 API Key"],
    mcpTools: ["list_my_third_party_platforms", "check_my_third_party_platform_runtime_access", "update_my_third_party_platform_secret"],
  },
  {
    key: "personal_order_center",
    domainKey: "personal_center",
    domainName: "个人中心",
    name: "查看个人订单中心",
    summary: "适合查看当前账号最近订单、会员购买和点数充值状态。",
    pageUrl: "/personal-center/orders",
    pageLabel: "打开订单中心",
    riskLevel: "low",
    intentKeywords: ["订单", "会员订单", "充值订单", "支付状态", "订单中心"],
    requiredInputKeys: [],
    requiredInputs: [],
    recommendedQuestions: ["帮我看最近的订单情况", "帮我看还有哪些订单没完成支付"],
    mcpTools: ["list_my_orders"],
  },
  {
    key: "personal_center_overview",
    domainKey: "personal_center",
    domainName: "个人中心",
    name: "查看个人中心总览摘要",
    summary: "适合快速查看当前账号可访问品牌数、待处理邀请、进行中任务和最近订单概况。",
    pageUrl: "/personal-center",
    pageLabel: "打开个人中心",
    riskLevel: "low",
    intentKeywords: ["个人中心", "概览", "总览", "待处理邀请", "最近订单", "最近任务"],
    requiredInputKeys: [],
    requiredInputs: [],
    recommendedQuestions: ["帮我看一下个人中心总览", "帮我总结当前账号最近需要处理的事情"],
    mcpTools: ["get_personal_center_overview"],
  },
  {
    key: "team_collaboration_center",
    domainKey: "personal_center",
    domainName: "个人中心",
    name: "管理品牌团队协作和邀请",
    summary: "适合查看品牌成员、邀请链接、待处理邀请通知和权限模板，也能直接创建或接受邀请。",
    pageUrl: "/personal-center/team",
    pageLabel: "打开团队协作",
    riskLevel: "high",
    intentKeywords: ["团队协作", "成员", "邀请", "权限模板", "品牌协作", "邀请通知"],
    requiredInputKeys: ["role", "inviteId"],
    requiredInputs: ["角色", "邀请 ID"],
    recommendedQuestions: ["帮我看当前品牌成员和邀请列表", "帮我创建一个新的品牌邀请链接", "帮我看我还有哪些品牌邀请没处理"],
    mcpTools: [
      "list_brand_members",
      "list_brand_invites",
      "create_brand_invite_link",
      "revoke_brand_invite",
      "get_brand_permission_settings",
      "list_my_brand_invites",
      "list_my_brand_invite_notifications",
      "accept_my_brand_invite",
    ],
  },
  {
    key: "openclaw_lobster_diary",
    domainKey: "openclaw",
    domainName: "OpenClaw 专区",
    name: "查看并管理每日复盘",
    summary: "适合通过 OpenClaw Agent 创建、查看和删除每日复盘，用户端只能只读查看。",
    pageUrl: "/brand-growth",
    pageLabel: "打开 OpenClaw 专区",
    riskLevel: "low",
    intentKeywords: ["每日复盘", "openclaw", "复盘", "专区", "日志", "记录"],
    requiredInputKeys: ["diaryDate", "title", "content"],
    requiredInputs: ["日期", "标题", "正文内容"],
    recommendedQuestions: ["帮我创建一篇每日复盘", "帮我看当前品牌有哪些每日复盘"],
    mcpTools: [
      "get_openclaw_lobster_diaries",
      "create_openclaw_lobster_diary",
      "delete_openclaw_lobster_diary",
    ],
  },
  {
    key: "openclaw_daily_plan",
    domainKey: "openclaw",
    domainName: "OpenClaw 专区",
    name: "查看并管理每日计划",
    summary: "适合通过 OpenClaw Agent 创建、查看和删除每日计划，用户端只能只读查看。",
    pageUrl: "/brand-growth",
    pageLabel: "打开 OpenClaw 专区",
    riskLevel: "low",
    intentKeywords: ["每日计划", "openclaw", "计划", "专区", "日志", "记录"],
    requiredInputKeys: ["planDate", "title", "content"],
    requiredInputs: ["日期", "标题", "正文内容"],
    recommendedQuestions: ["帮我创建一篇每日计划", "帮我看当前品牌有哪些每日计划"],
    mcpTools: [
      "get_openclaw_daily_plans",
      "create_openclaw_daily_plan",
      "delete_openclaw_daily_plan",
    ],
  },
  {
    key: "openclaw_music_generation",
    domainKey: "openclaw",
    domainName: "OpenClaw 专区",
    name: "生成歌曲或纯音乐并沉淀素材",
    summary: "适合直接调用火山音乐后付费接口生成带人声歌曲或纯音乐，再按需沉淀到 OpenClaw 创作素材。",
    pageUrl: "/brand-growth",
    pageLabel: "打开 OpenClaw 专区",
    riskLevel: "medium",
    intentKeywords: ["歌曲", "纯音乐", "bgm", "配乐", "人声歌曲", "音乐", "伴奏", "开场音乐", "火山音乐"],
    requiredInputKeys: ["taskType", "promptOrText"],
    requiredInputs: ["音乐类型", "歌词或音乐描述"],
    recommendedQuestions: ["帮我生成一首带人声的歌曲", "帮我做一段 60 秒纯音乐 BGM 并保存到创作素材"],
    mcpTools: [
      "create_volcengine_music_task",
      "get_volcengine_music_task",
      "get_openclaw_creative_materials",
      "create_openclaw_creative_material",
    ],
  },
  {
    key: "openclaw_creative_material",
    domainKey: "openclaw",
    domainName: "OpenClaw 专区",
    name: "查看并管理创作素材",
    summary: "适合把 OpenClaw 通过站内第三方平台能力生成的文本、图片、视频、语音和 BGM 等素材落库到专区，并支持查看与删除。",
    pageUrl: "/brand-growth",
    pageLabel: "打开 OpenClaw 专区",
    riskLevel: "medium",
    intentKeywords: ["创作素材", "素材", "图片素材", "视频素材", "语音素材", "bgm", "openclaw专区"],
    requiredInputKeys: ["title", "materialType"],
    requiredInputs: ["标题", "素材类型"],
    recommendedQuestions: ["帮我保存一条创作素材到 OpenClaw 专区", "帮我看当前品牌有哪些创作素材"],
    mcpTools: [
      "list_my_third_party_platforms",
      "check_my_third_party_platform_runtime_access",
      "get_openclaw_creative_materials",
      "create_openclaw_creative_material",
      "delete_openclaw_creative_material",
    ],
  },
  {
    key: "openclaw_video_work",
    domainKey: "openclaw",
    domainName: "OpenClaw 专区",
    name: "查看并管理视频作品",
    summary: "适合把 OpenClaw 最终整合生成的视频作品落库到专区，并在工作台中查看、删除或发起抖音发布。",
    pageUrl: "/brand-growth",
    pageLabel: "打开 OpenClaw 专区",
    riskLevel: "medium",
    intentKeywords: ["视频作品", "成片", "最终视频", "脚本", "发布到抖音", "openclaw专区"],
    requiredInputKeys: ["title", "videoUrl"],
    requiredInputs: ["作品标题", "作品视频地址"],
    recommendedQuestions: ["帮我保存一条视频作品到 OpenClaw 专区", "帮我看当前品牌有哪些视频作品", "帮我为这条 OpenClaw 视频作品发起抖音发布"],
    mcpTools: [
      "get_openclaw_video_works",
      "create_openclaw_video_work",
      "delete_openclaw_video_work",
      "create_openclaw_video_work_douyin_desktop_publish_session",
      "get_douyin_desktop_publish_session",
    ],
  },
  {
    key: "openclaw_geo_visibility_report",
    domainKey: "geo",
    domainName: "GEO",
    name: "查看并管理 GEO 可见度诊断",
    summary: "适合把 OpenClaw 生成好的 GEO 可见度诊断 HTML 报告落库到 GEO 工作台，并支持查看与删除。",
    pageUrl: "/geo",
    pageLabel: "打开 GEO 工作台",
    riskLevel: "medium",
    intentKeywords: ["geo", "GEO", "geo可见度", "可见度诊断", "诊断报告", "html报告"],
    requiredInputKeys: ["title", "htmlContent"],
    requiredInputs: ["报告标题", "HTML 报告内容"],
    recommendedQuestions: ["帮我保存一份 GEO 可见度诊断报告", "帮我看当前品牌有哪些 GEO 可见度诊断报告"],
    mcpTools: [
      "get_openclaw_geo_visibility_reports",
      "create_openclaw_geo_visibility_report",
      "delete_openclaw_geo_visibility_report",
    ],
  },
  {
    key: "unified_material_library",
    domainKey: "brand_growth",
    domainName: "品牌增长",
    name: "查看并管理统一素材库",
    summary: "适合查看跨平台统一素材库（小红书+抖音+公众号），并把采集作品加入或移除素材库。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["素材库", "统一素材", "跨平台素材", "加入素材", "移除素材"],
    requiredInputKeys: ["assetId"],
    requiredInputs: ["素材 ID"],
    recommendedQuestions: ["帮我看统一素材库有哪些素材", "帮我把这个对标作品加入素材库"],
    mcpTools: [
      "get_unified_material_library_items",
      "get_xiaohongshu_material_library_items",
      "get_douyin_material_library_items",
      "add_xiaohongshu_note_to_material_library",
      "add_douyin_work_to_material_library",
      "add_wechat_article_to_material_library",
      "remove_xiaohongshu_note_from_material_library",
      "remove_douyin_work_from_material_library",
    ],
  },
  {
    key: "wechat_collection_workspace",
    domainKey: "brand_growth",
    domainName: "品牌增长",
    name: "查看并提交公众号采集数据",
    summary: "适合读取品牌资料库中的公众号采集数据工作区，并直接绑定品牌公众号、抓取历史文章、同步对标文章和微信搜一搜。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["公众号采集", "微信搜一搜", "对标文章", "公众号数据", "文章统计", "品牌公众号数据", "gh_username", "抓历史文章", "提交采集"],
    requiredInputKeys: ["brandId"],
    requiredInputs: ["当前品牌"],
    recommendedQuestions: ["帮我看公众号采集数据板块", "帮我绑定这个公众号并抓历史文章", "帮我同步微信搜一搜数据", "帮我更新这篇文章的阅读量"],
    mcpTools: [
      "get_wechat_collection_workspace",
      "sync_wechat_brand_accounts",
      "fetch_wechat_brand_articles",
      "sync_wechat_benchmark_articles",
      "sync_wechat_search_articles",
      "update_wechat_article_stats",
      "delete_wechat_collected_article",
    ],
  },
  {
    key: "collection_data_management",
    domainKey: "brand_growth",
    domainName: "品牌增长",
    name: "删除小红书和抖音采集内容",
    summary: "适合在对话中直接删除小红书或抖音采集的对标作品、搜索笔记或榜单作品。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["删除采集", "删除作品", "删除笔记", "清理采集数据"],
    requiredInputKeys: ["assetId"],
    requiredInputs: ["采集作品 ID"],
    recommendedQuestions: ["帮我删除这条小红书采集作品", "帮我删除这条抖音采集作品"],
    mcpTools: [
      "delete_xhs_collected_note",
      "delete_douyin_collected_work",
    ],
  },
  {
    key: "growth_reports_and_plans",
    domainKey: "brand_growth",
    domainName: "品牌增长",
    name: "生成品牌增长报告、营销规划与统一素材库结果",
    summary: "适合在对话中直接触发品牌增长报告、半年营销规划、营销策划，并读取营销日历、选题库和统一素材库结果。",
    pageUrl: "/brand-growth",
    pageLabel: "打开品牌增长工作台",
    riskLevel: "medium",
    intentKeywords: ["增长报告", "半年营销规划", "营销策划", "营销日历", "选题库", "统一素材库", "品牌增长报告"],
    requiredInputKeys: ["brandId"],
    requiredInputs: ["当前品牌"],
    recommendedQuestions: ["帮我做一份品牌增长报告", "帮我生成半年营销规划并看看最近素材库有什么可复用内容"],
    mcpTools: [
      "manage_growth_reports",
      "get_latest_brand_growth_report_summary",
      "create_brand_growth_report",
      "create_half_year_marketing_plan",
      "get_unified_material_library_items",
    ],
  },
  {
    key: "xiaohongshu_video_workspace",
    domainKey: "xiaohongshu",
    domainName: "小红书",
    name: "管理小红书视频笔记与草稿接力",
    summary: "适合通过对话管理小红书视频笔记工作流，并在需要时继续创建手机或电脑端草稿接力会话。",
    pageUrl: "/xiaohongshu",
    pageLabel: "打开小红书工作区",
    riskLevel: "medium",
    intentKeywords: ["小红书视频", "视频笔记", "小红书草稿箱", "小红书草稿", "视频工作流"],
    requiredInputKeys: ["topicOrProduct"],
    requiredInputs: ["主题、产品或视频方向"],
    recommendedQuestions: ["帮我做一条小红书视频笔记", "帮我把这条小红书作品送到草稿箱"],
    mcpTools: [
      "manage_xiaohongshu_video",
      "create_xiaohongshu_mobile_draft_session",
      "get_xiaohongshu_mobile_draft_session",
      "create_xiaohongshu_desktop_draft_session",
      "get_xiaohongshu_desktop_draft_session",
    ],
  },
  {
    key: "douyin_video_production_workspace",
    domainKey: "douyin",
    domainName: "抖音",
    name: "生成抖音视频、直接视频与发布会话",
    summary: "适合通过统一视频生产入口处理普通视频、直接生视频、混剪短视频，并在需要时继续创建抖音发布会话。",
    pageUrl: "/douyin",
    pageLabel: "打开抖音工作台",
    riskLevel: "medium",
    intentKeywords: ["抖音视频", "AI生视频", "直接视频", "混剪短视频", "抖音发布", "抖音作品"],
    requiredInputKeys: ["topicOrProduct"],
    requiredInputs: ["主题、产品或视频方向"],
    recommendedQuestions: ["帮我做一条抖音视频", "帮我生成视频后继续发起抖音发布会话"],
    mcpTools: [
      "manage_douyin_video_production",
      "create_douyin_mobile_publish_session",
      "get_douyin_mobile_publish_session",
      "create_douyin_desktop_publish_session",
      "get_douyin_desktop_publish_session",
    ],
  },
  {
    key: "douyin_digital_human_workspace",
    domainKey: "douyin",
    domainName: "抖音",
    name: "管理数字人、音色克隆与纯 TTS 试听",
    summary: "适合通过抖音统一视频生产入口使用数字人模板、公共语音库、自定义音色、音色克隆和纯 TTS 试听。",
    pageUrl: "/douyin",
    pageLabel: "打开抖音工作台",
    riskLevel: "medium",
    intentKeywords: ["数字人", "音色克隆", "语音库", "TTS", "纯语音试听", "口播音色"],
    requiredInputKeys: ["scriptOrText"],
    requiredInputs: ["文案或语音内容"],
    recommendedQuestions: ["帮我看数字人语音库并做一次纯 TTS 试听", "帮我创建一个自定义音色"],
    mcpTools: ["manage_douyin_video_production"],
  },
  {
    key: "douyin_runninghub_workspace",
    domainKey: "douyin",
    domainName: "抖音",
    name: "调用 RunningHub 应用生成结果",
    summary: "适合通过抖音统一视频生产入口读取 RunningHub 应用列表、节点模板并完成生成。",
    pageUrl: "/douyin",
    pageLabel: "打开抖音工作台",
    riskLevel: "medium",
    intentKeywords: ["runninghub", "应用工作流", "节点模板", "生成应用", "comfyui"],
    requiredInputKeys: ["appKey"],
    requiredInputs: ["RunningHub 应用 key"],
    recommendedQuestions: ["帮我看 RunningHub 有哪些应用", "帮我按节点模板把这个 RunningHub 应用跑起来"],
    mcpTools: ["manage_douyin_video_production"],
  },
  {
    key: "douyin_ad_preaudit_workspace",
    domainKey: "douyin",
    domainName: "抖音",
    name: "执行广告预审并查看回填结果",
    summary: "适合通过抖音统一视频生产入口执行广告预审，并查看 Vid、FileId 与预审结果。",
    pageUrl: "/douyin",
    pageLabel: "打开抖音工作台",
    riskLevel: "medium",
    intentKeywords: ["广告预审", "预审", "vid", "fileid", "广告审核", "投流预审"],
    requiredInputKeys: ["videoSource"],
    requiredInputs: ["视频来源或视频地址"],
    recommendedQuestions: ["帮我做一次广告预审", "帮我看这条视频的预审结果和回填信息"],
    mcpTools: ["manage_douyin_video_production"],
  },
  {
    key: "openclaw_installation_center",
    domainKey: "personal_center",
    domainName: "个人中心",
    name: "查看 OpenClaw 安装中心与 Skill 交付说明",
    summary: "适合识别 OpenClaw 安装中心、MCP 安装、Skill ZIP 下载和交付文档入口；当前安装复制动作仍以网站页面承接为主。",
    pageUrl: "/personal-center/openclaw",
    pageLabel: "打开 OpenClaw 安装中心",
    riskLevel: "low",
    intentKeywords: ["openclaw安装", "mcp安装", "skill安装", "安装中心", "安装令牌", "workbuddy", "cursor", "claude desktop"],
    requiredInputKeys: [],
    requiredInputs: [],
    recommendedQuestions: ["帮我看看 OpenClaw 安装中心现在有什么可以交付的内容", "告诉我 OpenClaw 和 Skill 现在该怎么安装"],
    mcpTools: [
      "get_website_function_catalog",
      "get_website_function_detail",
      "get_website_function_execution_plan",
    ],
  },
];

const OPENCLAW_MCP_TOOLS: OpenClawMcpToolDefinition[] = [
  {
    name: "get_website_function_catalog",
    description: "查看当前网站可由 Skill 控制的功能目录，包括业务域、页面入口、风险级别和推荐使用的 MCP tools。",
    inputSchema: {
      type: "object",
      properties: {
        domainKey: { type: "string" },
        riskLevel: { type: "string", description: "可选：low、medium、high。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_website_function_detail",
    description: "查看指定网站功能的详细控制说明，包括页面入口、必需信息、推荐追问和对应工具。",
    inputSchema: {
      type: "object",
      properties: {
        functionKey: { type: "string" },
      },
      required: ["functionKey"],
      additionalProperties: false,
    },
  },
  {
    name: "route_website_function_by_intent",
    description: "根据用户意图把需求路由到最可能的网站功能，并返回推荐 MCP tools、缺失信息和确认策略。",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string" },
        preferredDomain: { type: "string" },
      },
      required: ["intent"],
      additionalProperties: false,
    },
  },
  {
    name: "get_website_function_execution_plan",
    description: "根据指定网站功能和当前已收集信息，判断是否可执行、缺少什么输入、是否需要确认，以及推荐工具顺序。",
    inputSchema: {
      type: "object",
      properties: {
        functionKey: { type: "string" },
        providedInputs: { type: "object" },
        confirmed: { type: "boolean" },
      },
      required: ["functionKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_current_brand_context",
    description: "获取当前登录账号的默认品牌、角色和权限摘要。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_brand_products",
    description: "查看当前品牌可用于内容生成的产品清单。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_platform_accounts",
    description: "查看当前品牌的平台账号清单，可按平台筛选。",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "可选：XIAOHONGSHU、DOUYIN、VIDEO_CHANNEL、WECHAT_OA。" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_brand_archive_summary",
    description: "查看当前品牌档案摘要，包括品牌背景、产品、问卷、平台账号、竞品账号与行业资料进度。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_brand_archive_survey",
    description: "查看当前品牌建档问卷答案，可按数量截断返回。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_brand_competitor_accounts",
    description: "查看当前品牌的竞品账号清单，可按平台筛选。",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "可选：XIAOHONGSHU、DOUYIN、VIDEO_CHANNEL、WECHAT_OA。" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_brand_industry_feeds",
    description: "查看当前品牌已沉淀的行业资料或行业报告。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_brand_business_assets",
    description: "查看当前品牌业务资料资产和知识绑定摘要。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_collection_workspace",
    description: "查看品牌资料库里小红书搜集数据工作区，包括品牌账号、竞品账号、品牌作品、对标作品、搜索笔记和目标用户。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_xiaohongshu_brand_accounts",
    description: "同步品牌资料库里小红书品牌账号数据，可补充账号链接。",
    inputSchema: {
      type: "object",
      properties: {
        accountLocators: { type: "array", items: { type: "string" } },
        accountEntries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locator: { type: "string" },
              accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
            },
            required: ["locator"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_xiaohongshu_competitor_accounts",
    description: "同步品牌资料库里小红书竞品账号数据，可补充账号链接。",
    inputSchema: {
      type: "object",
      properties: {
        accountLocators: { type: "array", items: { type: "string" } },
        accountEntries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locator: { type: "string" },
              accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
            },
            required: ["locator"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_xiaohongshu_brand_notes",
    description: "同步品牌资料库里小红书品牌作品数据。",
    inputSchema: {
      type: "object",
      properties: {
        accountLocators: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_xiaohongshu_benchmark_notes",
    description: "同步品牌资料库里小红书对标作品数据，需要提供作品链接。",
    inputSchema: {
      type: "object",
      properties: {
        sourceUrls: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_xiaohongshu_search_notes",
    description: "同步品牌资料库里小红书搜索笔记数据，需要提供关键词。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_xiaohongshu_target_users",
    description: "同步品牌资料库里小红书目标用户数据，需要提供用户或作品链接。",
    inputSchema: {
      type: "object",
      properties: {
        sourceUrls: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_xiaohongshu_feishu_workspace",
    description: "从品牌绑定的飞书副本同步小红书搜集数据工作区。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "add_xiaohongshu_note_to_material_library",
    description: "把小红书对标作品或搜索笔记加入素材库。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_collection_workspace",
    description: "查看当前品牌资料库中的抖音搜集数据工作区摘要。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_brand_accounts",
    description: "同步品牌资料库里抖音品牌账号数据，可传账号链接或账号条目。",
    inputSchema: {
      type: "object",
      properties: {
        accountLocators: { type: "array", items: { type: "string" } },
        accountEntries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locator: { type: "string" },
              accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
            },
            required: ["locator"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_competitor_accounts",
    description: "同步品牌资料库里抖音竞品账号数据，可传账号链接或账号条目。",
    inputSchema: {
      type: "object",
      properties: {
        accountLocators: { type: "array", items: { type: "string" } },
        accountEntries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locator: { type: "string" },
              accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
            },
            required: ["locator"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_benchmark_works",
    description: "同步品牌资料库里抖音对标作品数据，需要提供作品 aweme_id。",
    inputSchema: {
      type: "object",
      properties: {
        benchmarkAwemeIds: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_search_works",
    description: "同步品牌资料库里抖音搜索结果数据，需要提供搜索关键词。",
    inputSchema: {
      type: "object",
      properties: {
        searchKeyword: { type: "string" },
        searchSortType: { type: "string" },
        searchPublishTime: { type: "string" },
        searchFilterDuration: { type: "string" },
        searchContentType: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_comment_data",
    description: "同步品牌资料库里抖音评论数据，需要提供作品链接列表或分页请求。",
    inputSchema: {
      type: "object",
      properties: {
        commentSourceUrls: { type: "array", items: { type: "string" } },
        commentPageRequests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceUrl: { type: "string" },
              cursor: { type: "string" },
            },
            required: ["sourceUrl"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_keyword_recommendations",
    description: "同步品牌资料库里抖音关键词推荐数据，需要提供搜索关键词。",
    inputSchema: {
      type: "object",
      properties: {
        searchKeyword: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_low_fan_explosive_works",
    description: "同步品牌资料库里抖音低粉爆款榜数据，需要提供一级和二级内容标签 ID。",
    inputSchema: {
      type: "object",
      properties: {
        primaryTagId: { type: "integer" },
        secondaryTagId: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_high_completion_rate_works",
    description: "同步品牌资料库里抖音高完播率榜数据，需要提供一级和二级内容标签 ID。",
    inputSchema: {
      type: "object",
      properties: {
        primaryTagId: { type: "integer" },
        secondaryTagId: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_high_like_rate_works",
    description: "同步品牌资料库里抖音高点赞率榜数据，需要提供一级和二级内容标签 ID。",
    inputSchema: {
      type: "object",
      properties: {
        primaryTagId: { type: "integer" },
        secondaryTagId: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_city_hotspots",
    description: "同步品牌资料库里抖音同城热点榜数据，需要提供城市代码 cityCode。",
    inputSchema: {
      type: "object",
      properties: {
        cityCode: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_opportunity_insight_workspace",
    description: "查看当前品牌机会洞察工作区状态，包括 step1/2/3 产物和最近任务。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "generate_opportunity_insight_step_one",
    description: "发起机会洞察第 1 步，生成品牌账号分析与竞品账号分析。",
    inputSchema: {
      type: "object",
      properties: {
        supplementInput: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "generate_opportunity_insight_step_two",
    description: "发起机会洞察第 2 步，生成评论洞察分析。",
    inputSchema: {
      type: "object",
      properties: {
        supplementInput: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "generate_opportunity_insight_step_three",
    description: "发起机会洞察第 3 步，生成最终机会洞察总报告。",
    inputSchema: {
      type: "object",
      properties: {
        supplementInput: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_my_third_party_platforms",
    description: "查看当前品牌下个人中心第三方接口配置摘要，包括 API Key 遮罩状态、动态状态，以及 OpenClaw 是否可直接复用该品牌共享凭证；只返回遮罩，不回显明文。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "check_my_third_party_platform_runtime_access",
    description: "检查当前品牌某个第三方平台的共享凭证是否可被 OpenClaw 直接复用。只返回平台、遮罩状态和可用性，不返回明文 API Key。",
    inputSchema: {
      type: "object",
      properties: {
        platformId: { type: "string" },
        platformName: { type: "string" },
        baseUrl: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_my_third_party_platform_secret",
    description: "更新当前品牌指定第三方平台的 API Key，可用于 StepFun、Tikhub、蝉镜、RunningHub、火山 VOD 等平台。",
    inputSchema: {
      type: "object",
      properties: {
        platformId: { type: "string" },
        apiKey: { type: "string" },
      },
      required: ["platformId", "apiKey"],
      additionalProperties: false,
    },
  },
  {
    name: "list_my_orders",
    description: "查看当前账号最近订单摘要，可按状态筛选并限制返回数量。",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "可选：PENDING、PAID、CANCELLED。" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_personal_center_overview",
    description: "查看当前账号在个人中心的总览摘要，包括品牌数、待处理邀请、任务和订单概况。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_brand_members",
    description: "查看当前品牌的团队成员列表和当前账号的成员管理权限。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_brand_invites",
    description: "查看当前品牌已创建的邀请码和邀请链接列表。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_brand_invite_link",
    description: "为当前品牌创建新的邀请链接，可指定角色、备注和有效天数。",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string", description: "可选：ADMIN、STAFF、TALENT。" },
        note: { type: "string" },
        expiresInDays: { type: "integer", minimum: 1, maximum: 365 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "revoke_brand_invite",
    description: "撤回当前品牌下指定的待处理邀请。",
    inputSchema: {
      type: "object",
      properties: {
        inviteId: { type: "string" },
      },
      required: ["inviteId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_brand_permission_settings",
    description: "查看当前品牌团队权限模板和当前账号的权限范围。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_my_brand_invites",
    description: "查看当前账号待处理的品牌邀请列表。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_my_brand_invite_notifications",
    description: "查看当前账号的品牌邀请通知中心摘要。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "accept_my_brand_invite",
    description: "接受当前账号收到的品牌邀请。",
    inputSchema: {
      type: "object",
      properties: {
        inviteId: { type: "string" },
      },
      required: ["inviteId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_task_detail",
    description: "查看指定任务的详细状态、输入和输出摘要。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_task",
    description: "取消指定任务，仅支持排队中或运行中的任务。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "retry_task",
    description: "重试指定任务，把任务重新放回排队状态。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_tasks_summary",
    description: "汇总当前品牌最近任务状态，可按时间范围和任务类型筛选。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        taskTypes: { type: "array", items: { type: "string" }, description: "可选任务类型数组。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_failed_tasks_summary",
    description: "汇总当前品牌最近失败任务及主要失败原因。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        taskTypes: { type: "array", items: { type: "string" }, description: "可选任务类型数组。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_knowledge_files",
    description: "查看当前品牌最近新增的知识资料和处理状态。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string" },
        knowledgeBaseId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_skill_config_summary",
    description: "查看当前品牌技能配置摘要，可按 skillKey 定位单个技能。",
    inputSchema: {
      type: "object",
      properties: {
        skillKey: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_skill_config_detail",
    description: "查看指定网站技能的有效配置、关联提示词以及品牌覆盖详情。",
    inputSchema: {
      type: "object",
      properties: {
        skillId: { type: "string" },
      },
      required: ["skillId"],
      additionalProperties: false,
    },
  },
  {
    name: "update_skill_config",
    description: "更新指定网站技能的品牌级配置与提示词覆盖，让后续网页生成直接使用新的有效设置。",
    inputSchema: {
      type: "object",
      properties: {
        skillId: { type: "string" },
        displayName: { type: "string" },
        defaultModel: { type: "string" },
        description: { type: "string" },
        promptOverrides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              promptId: { type: "string" },
              content: { type: "string" },
              modelName: { type: "string" },
              temperature: { type: "number" },
              maxTokens: { type: "integer" },
            },
            required: ["promptId"],
            additionalProperties: false,
          },
        },
      },
      required: ["skillId"],
      additionalProperties: false,
    },
  },
  {
    name: "reset_skill_to_platform_baseline",
    description: "把指定网站技能恢复到平台基线配置，移除品牌级技能和提示词覆盖。",
    inputSchema: {
      type: "object",
      properties: {
        skillId: { type: "string" },
      },
      required: ["skillId"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_task_result_feedback",
    description: "为指定任务提交生成结果反馈，记录满意度、问题标签、备注和人工修改结果。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        rating: { type: "string", description: "仅支持 positive、neutral、negative。" },
        adopted: { type: "boolean" },
        comment: { type: "string" },
        feedbackTags: { type: "array", items: { type: "string" } },
        skillId: { type: "string" },
        promptId: { type: "string" },
        promptVersion: { type: "string" },
        workId: { type: "string" },
        editedOutput: { type: "object" },
      },
      required: ["taskId", "rating"],
      additionalProperties: false,
    },
  },
  {
    name: "get_feedback_summary",
    description: "查看当前品牌最近的生成结果反馈摘要，可按技能或提示词筛选。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        skillId: { type: "string" },
        promptId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_feedback_analysis",
    description: "查看当前品牌生成结果反馈的问题画像，识别高频问题标签和负向任务类型。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        skillId: { type: "string" },
        promptId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_prompt_optimization_suggestions",
    description: "基于当前品牌已收集的反馈，输出针对技能或提示词的最小优化建议摘要。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        skillId: { type: "string" },
        promptId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_article_drafts",
    description: "查看当前品牌最近生成的公众号文章草稿和任务状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_official_accounts",
    description: "查看当前品牌已配置的公众号账号列表，供发布时选择。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_wechat_workflow_sessions",
    description: "查看当前品牌最近的公众号排版工作流会话，供确认发布对象。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_publish_history",
    description: "查看当前品牌最近的公众号发布历史和结果。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_workflow_preferences",
    description: "查看当前品牌公众号工作流的默认作者、主题色和默认输入方式等偏好。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_wechat_workflow_session_detail",
    description: "查看指定公众号工作流会话的完整详情，包括发布配置和检查项。",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
      },
      required: ["workflowId"],
      additionalProperties: false,
    },
  },
  {
    name: "check_wechat_workflow_publish_readiness",
    description: "重新计算指定公众号工作流的发布确认状态，返回是否已具备正式发布条件。",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
      },
      required: ["workflowId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_publish_history_detail",
    description: "查看指定公众号发布历史记录的详细结果和失败原因。",
    inputSchema: {
      type: "object",
      properties: {
        historyId: { type: "string" },
      },
      required: ["historyId"],
      additionalProperties: false,
    },
  },
  {
    name: "publish_wechat_article",
    description: "把指定公众号草稿正式发布到公众号账号。",
    inputSchema: {
      type: "object",
      properties: {
        draftId: { type: "string" },
      },
      required: ["draftId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_mobile_draft_session",
    description: "为指定小红书图文作品创建手机扫码接力草稿会话，便于在手机端保存到小红书草稿箱。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_mobile_draft_session",
    description: "查询指定小红书手机草稿接力会话的最新状态、入口和完成结果。",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
      },
      required: ["token"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_desktop_draft_session",
    description: "为指定小红书图文作品创建电脑端草稿会话，便于通过浏览器扩展自动填充保存草稿。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_desktop_draft_session",
    description: "查询指定小红书电脑端草稿接力会话的最新状态、入口和完成结果。",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
      },
      required: ["token"],
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_mobile_publish_session",
    description: "为指定抖音视频作品创建手机接力发布会话，便于在手机端继续完成发布。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_mobile_publish_session",
    description: "查询指定抖音手机发布接力会话的最新状态、入口和完成结果。",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
      },
      required: ["token"],
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_desktop_publish_session",
    description: "为指定抖音视频作品创建电脑端发布会话，便于通过浏览器扩展自动填充发布信息。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_desktop_publish_session",
    description: "查询指定抖音电脑端发布接力会话的最新状态、入口和完成结果。",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
      },
      required: ["token"],
      additionalProperties: false,
    },
  },
  {
    name: "publish_wechat_workflow",
    description: "把指定公众号工作流正式发布到公众号账号。",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
      },
      required: ["workflowId"],
      additionalProperties: false,
    },
  },
  {
    name: "retry_wechat_publish_history",
    description: "重试一次失败或待处理的公众号发布历史记录。",
    inputSchema: {
      type: "object",
      properties: {
        historyId: { type: "string" },
      },
      required: ["historyId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_design_workspace_options",
    description: "查看设计工作台可用模块、设计类型、产品、营销日历和模型选项，并读取可直接传给 create_design_work.modelSelection 的 selectionKey。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_recent_design_works",
    description: "查看当前品牌最近的设计工作台生成记录和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_design_work",
    description: "在网站设计工作台中直接创建一个设计任务。支持纯文字需求，也支持补充参考图 URL 或参考图上传对象；如需指定生图模型，应先调用 get_design_workspace_options，再把返回的 selectionKey 传入 modelSelection。",
    inputSchema: {
      type: "object",
      properties: {
        module: { type: "string", description: "必填：image、html、deck、video。" },
        designType: { type: "string" },
        title: { type: "string" },
        calendarItemId: { type: "string" },
        productId: { type: "string" },
        injectBrandProfile: { type: "boolean" },
        referenceImageUrl: { type: "string", description: "可选：已存在的参考图 URL，适合图片已在网站或公网可访问地址时使用。" },
        referenceImage: {
          type: "object",
          description: "可选：直接上传参考图。可传 fileName、contentType、dataBase64。",
          properties: {
            fileName: { type: "string" },
            contentType: { type: "string" },
            dataBase64: { type: "string" },
          },
          required: ["dataBase64"],
          additionalProperties: false,
        },
        modelSelection: { type: "string", description: "可选：使用 get_design_workspace_options 返回的模型 selectionKey，例如 providerId::modelName。" },
        spec: { type: "string" },
        additionalInstruction: { type: "string" },
      },
      required: ["module"],
      additionalProperties: false,
    },
  },
  {
    name: "get_latest_brand_growth_report_summary",
    description: "获取当前品牌最新品牌增长报告摘要。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_brand_growth_report",
    description: "触发当前品牌的品牌增长报告生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string" },
        timeRange: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_half_year_marketing_plan",
    description: "触发当前品牌的半年营销规划生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        planningYear: { type: "string" },
        focus: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_knowledge_base",
    description: "为当前品牌创建业务知识库。",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "upload_knowledge_base_files",
    description: "向指定知识库上传资料，支持按知识库 ID 或名称定位。",
    inputSchema: {
      type: "object",
      properties: {
        knowledgeBaseId: { type: "string" },
        knowledgeBaseName: { type: "string" },
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              sourceName: { type: "string" },
              fileUrl: { type: "string" },
              priority: { type: "integer" },
            },
            required: ["fileUrl"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_original_copy_options",
    description: "查看抖音原创文案可用的选题库、营销日历和文案类型选项。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_recent_douyin_original_copies",
    description: "查看当前品牌最近生成的抖音原创文案结果和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_original_copy",
    description: "基于选题库或营销日历触发抖音原创文案生成。",
    inputSchema: {
      type: "object",
      properties: {
        copyType: { type: "string", description: "必填：VIEWPOINT、STORY、PROCESS、KNOWLEDGE、PLOT_SALES、SEEDING、LOCAL_SALES。" },
        topicId: { type: "string" },
        calendarItemId: { type: "string" },
        injectMarketingPlan: { type: "boolean" },
        userRequirement: { type: "string" },
      },
      required: ["copyType"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_remix_copy_options",
    description: "查看抖音二创文案可用的素材库、产品和营销策划选项。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_recent_douyin_remix_copies",
    description: "查看当前品牌最近生成的抖音二创文案结果和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_remix_copy",
    description: "基于素材库视频触发抖音二创文案生成。",
    inputSchema: {
      type: "object",
      properties: {
        materialId: { type: "string", description: "必填：素材库中的视频素材 ID。" },
        injectBrandProfile: { type: "boolean" },
        productId: { type: "string" },
        injectMarketingPlan: { type: "boolean" },
        userRequirement: { type: "string" },
      },
      required: ["materialId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_material_library_items",
    description: "查看当前品牌素材库里可用于小红书二创的对标作品。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 30 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_marketing_calendar_options",
    description: "查看当前品牌最近一期小红书营销日历选题，可直接拿到 calendarItemId 供后续创作使用。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 30 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_original_reference_templates",
    description: "查看小红书原创笔记参考模板分类和模板项，可按分类筛选。",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_xiaohongshu_original_works",
    description: "查看当前品牌最近生成的小红书原创笔记结果和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_openclaw_lobster_diaries",
    description: "查看当前品牌指定板块下的每日复盘列表。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：指定板块作用域，默认 brand_growth。" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_lobster_diary",
    description: "为当前品牌指定板块创建一篇每日复盘。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：写入哪个板块，默认 brand_growth。" },
        diaryDate: { type: "string", description: "日期，格式为 YYYY-MM-DD。" },
        title: { type: "string", description: "日记标题。" },
        content: { type: "string", description: "日记正文内容。" },
      },
      required: ["diaryDate", "title", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_openclaw_lobster_diary",
    description: "删除指定板块下的一篇每日复盘。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：删除所在板块，默认 brand_growth。" },
        diaryId: { type: "string", description: "每日复盘 ID。" },
      },
      required: ["diaryId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_openclaw_daily_plans",
    description: "查看当前品牌指定板块下的每日计划列表。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：指定板块作用域，默认 brand_growth。" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_daily_plan",
    description: "为当前品牌指定板块创建一篇每日计划。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：写入哪个板块，默认 brand_growth。" },
        planDate: { type: "string", description: "日期，格式为 YYYY-MM-DD。" },
        title: { type: "string", description: "计划标题。" },
        content: { type: "string", description: "计划正文内容。" },
      },
      required: ["planDate", "title", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_openclaw_daily_plan",
    description: "删除指定板块下的一篇每日计划。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：删除所在板块，默认 brand_growth。" },
        planId: { type: "string", description: "每日计划 ID。" },
      },
      required: ["planId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_volcengine_music_task",
    description: "调用火山音乐后付费接口创建音乐任务，可生成带人声歌曲或纯音乐 BGM。创建后请再调用 get_volcengine_music_task 轮询结果；如果要沉淀到 OpenClaw 创作素材，建议在查询成功后再保存。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：这次音乐任务主要服务于哪个板块，默认 brand_growth。" },
        taskType: { type: "string", enum: ["song", "bgm"], description: "song=生成人声歌曲，bgm=生成纯音乐。" },
        title: { type: "string", description: "可选：这次任务的业务标题，便于回读时展示。" },
        payload: {
          type: "object",
          description: "火山音乐请求体。song 模式常用 Lyrics / Prompt / ModelVersion / Genre / Mood / Gender / Timbre / Duration；bgm 模式常用 Text / Version / Duration / EnableInputRewrite / Segments。支持直接按火山文档字段名传入。",
          additionalProperties: true,
        },
      },
      required: ["taskType", "payload"],
      additionalProperties: false,
    },
  },
  {
    name: "get_volcengine_music_task",
    description: "查询火山音乐任务结果。成功后可选择直接把音频链接沉淀到 OpenClaw 创作素材，适合保存为 audio 或 bgm 素材。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：素材要落到哪个板块，默认 brand_growth。" },
        taskId: { type: "string", description: "火山音乐 TaskID。" },
        taskType: { type: "string", enum: ["song", "bgm"], description: "可选：补充任务类型，便于生成业务文案和默认素材类型。" },
        saveToCreativeMaterial: { type: "boolean", description: "可选：任务成功后是否自动保存到 OpenClaw 创作素材。" },
        materialTitle: { type: "string", description: "可选：自动保存素材时使用的标题。" },
        materialDescription: { type: "string", description: "可选：自动保存素材时使用的描述。" },
        materialType: { type: "string", description: "可选：自动保存素材时的类型，默认 song=>audio，bgm=>bgm。" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_openclaw_creative_materials",
    description: "查看当前品牌指定板块下的创作素材列表。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：指定板块作用域，默认 brand_growth。" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_creative_material",
    description: "为当前品牌指定板块保存一条创作素材，可保存文本、图片、视频、语音或 BGM 等结果。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：写入哪个板块，默认 brand_growth。" },
        title: { type: "string", description: "素材标题。" },
        description: { type: "string", description: "素材描述。" },
        materialType: { type: "string", description: "素材类型，例如 text、image、video、audio、bgm。" },
        fileUrl: { type: "string", description: "素材文件 URL，可选。" },
        fileName: { type: "string", description: "素材文件名，可选。" },
        mimeType: { type: "string", description: "素材 MIME 类型，可选。" },
        textContent: { type: "string", description: "纯文本素材正文，可选。" },
        upload: {
          type: "object",
          description: "如需直接把文件内容上传到网站，可传 fileName、contentType、dataBase64。stdio MCP 也支持直接传 localFilePath，由桥接层自动转成 upload。",
          properties: {
            fileName: { type: "string", description: "原始文件名，例如 hero.png。" },
            contentType: { type: "string", description: "文件 MIME 类型，例如 image/png。" },
            dataBase64: { type: "string", description: "文件二进制的 Base64 内容。" },
          },
          additionalProperties: false,
        },
      },
      required: ["title", "materialType"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_openclaw_creative_material",
    description: "删除指定板块下的一条创作素材。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：删除所在板块，默认 brand_growth。" },
        materialId: { type: "string", description: "创作素材 ID。" },
      },
      required: ["materialId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_openclaw_video_works",
    description: "查看当前品牌指定板块下的视频作品列表。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：指定板块作用域，默认 brand_growth。" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_video_work",
    description: "为当前品牌指定板块保存一条最终视频作品，可附带标题、描述、脚本、封面和视频地址。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：写入哪个板块，默认 brand_growth。" },
        title: { type: "string", description: "作品标题。" },
        description: { type: "string", description: "作品描述。" },
        scriptContent: { type: "string", description: "视频文案或脚本。" },
        coverImageUrl: { type: "string", description: "作品封面 URL，可选。" },
        videoUrl: { type: "string", description: "作品视频 URL。" },
      },
      required: ["title", "videoUrl"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_openclaw_video_work",
    description: "删除指定板块下的一条视频作品。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：删除所在板块，默认 brand_growth。" },
        workId: { type: "string", description: "视频作品 ID。" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_video_work_douyin_desktop_publish_session",
    description: "为指定 OpenClaw 视频作品创建抖音电脑端发布会话，便于通过浏览器扩展自动填充发布信息。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：作品所在板块，默认 brand_growth。" },
        workId: { type: "string", description: "视频作品 ID。" },
        accountId: { type: "string", description: "可选：目标抖音账号 ID。" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_openclaw_geo_visibility_reports",
    description: "查看当前品牌指定板块下的 GEO 可见度诊断报告列表。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：指定板块作用域，默认 geo。" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_geo_visibility_report",
    description: "为当前品牌指定板块保存一份 GEO 可见度诊断 HTML 报告。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：写入哪个板块，默认 geo。" },
        title: { type: "string", description: "报告标题。" },
        description: { type: "string", description: "报告摘要或补充说明，可选。" },
        htmlContent: { type: "string", description: "完整的 HTML 报告内容。" },
      },
      required: ["title", "htmlContent"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_openclaw_geo_visibility_report",
    description: "删除指定板块下的一份 GEO 可见度诊断报告。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"], description: "可选：删除所在板块，默认 geo。" },
        reportId: { type: "string", description: "GEO 可见度诊断报告 ID。" },
      },
      required: ["reportId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_rewrite_note",
    description: "基于素材库中的对标作品触发小红书二创图文生成。",
    inputSchema: {
      type: "object",
      properties: {
        sourceMaterialId: { type: "string", description: "素材库作品 ID。" },
        productId: { type: "string" },
        accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
        includeMarketingPlan: { type: "boolean" },
        additionalInstruction: { type: "string", description: "补充创作要求。" },
      },
      required: ["sourceMaterialId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_original_note",
    description: "触发小红书原创图文生成。",
    inputSchema: {
      type: "object",
      properties: {
        calendarItemId: { type: "string", description: "可选。来自小红书营销日历的选题 ID。" },
        customTopicName: { type: "string", description: "可选。自定义选题名称。" },
        topic: { type: "string", description: "兼容旧写法，等同于 customTopicName。" },
        productId: { type: "string" },
        accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
        imageCount: { type: "integer", minimum: 2, maximum: 10 },
        includeMarketingPlan: { type: "boolean" },
        additionalInstruction: { type: "string", description: "补充创作要求。" },
        noteTitle: { type: "string", description: "可选。直接指定原创笔记标题。" },
        noteContent: { type: "string", description: "可选。直接提供原创笔记正文；有值时会跳过原创文案技能，直接进入配图提示词与图片生成链路。" },
        styleHint: { type: "string", description: "兼容旧写法，等同于 additionalInstruction。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_wechat_article",
    description: "触发公众号文章草稿生成。",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        content: { type: "string" },
        author: { type: "string" },
        styleHint: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "manage_wechat_workflow",
    description: "统一管理公众号工作流，支持偏好、工作流创建、Step 2-4 直写与生成、发布确认、正式发布和删除；其中 set_article 未显式传 inputType 时会按正文内容自动识别 plain-text/markdown/html，set_images 除了直接传图片 URL 外，也支持在 coverImage / bodyImages 里传 fileUrl、materialId，或通过 upload.fileName / contentType / dataBase64 直传图片文件，set_html 代表外部已给出完整 HTML 草稿，generate_html 代表系统基于正文 canonical、图片资产与风格规则重新渲染，并产出可直接发布到公众号正文的 HTML 片段。",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "例如 list_drafts、save_preferences、create_workflow、set_article、set_images、set_html、generate_article、generate_images、generate_html、rebuild_publish_config、publish_workflow、delete_workflow。" },
        workflowId: { type: "string" },
        draftId: { type: "string" },
        historyId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        payload: {
          type: "object",
          description: "对应动作的请求体，结构与网站原始接口保持一致。set_images 除原有 coverImageUrl / bodyImageUrls 外，还支持 coverImage、bodyImages[]，每项可传 url / fileUrl / materialId，或 upload.fileName / upload.contentType / upload.dataBase64。",
          additionalProperties: true,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "manage_brand_library",
    description: "统一管理品牌资料库，支持品牌背景、产品、问卷、账号、行业资料、业务资产、知识库和飞书绑定。",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "例如 get_archive_summary、update_background、create_product、replace_platform_accounts、create_knowledge_base_files。" },
        productId: { type: "string" },
        knowledgeBaseId: { type: "string" },
        fileId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        platform: { type: "string", description: "可选：XIAOHONGSHU、DOUYIN、VIDEO_CHANNEL、WECHAT_OA。" },
        payload: {
          type: "object",
          description: "对应动作的请求体，结构与网站原始接口保持一致。",
          additionalProperties: true,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "manage_growth_reports",
    description: "统一管理品牌增长报告链路，支持增长报告、可视化增长报告、半年营销规划、小红书/抖音营销策划、热点选题和营销日历。",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "例如 get_growth_workspace、generate_visual_growth_report、update_douyin_topic_library、generate_xiaohongshu_marketing_calendar。" },
        reportId: { type: "string" },
        selectedDate: { type: "string", description: "热点选题候选日期，格式与原接口一致。" },
        payload: {
          type: "object",
          description: "对应动作的请求体，结构与网站原始接口保持一致。",
          additionalProperties: true,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "manage_xiaohongshu_video",
    description: "统一管理小红书视频笔记，支持列表、模型选项、生成、故事板重生、继续生成、找回结果、编辑和删除。",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "例如 list_works、list_providers、generate、regenerate_storyboard、continue_video、recover、update、delete。" },
        workId: { type: "string" },
        payload: {
          type: "object",
          description: "对应动作的请求体，结构与网站原始接口保持一致。",
          additionalProperties: true,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "manage_douyin_video_production",
    description: "统一管理抖音视频生产，覆盖普通视频、直接生视频、混剪短视频、数字人、口型驱动、RunningHub 和广告预审。调用数字人试听前，应先列出公共语音库或自定义音色拿到 voiceId；调用 RunningHub generate 前，应先用 get_app_detail 读取应用 nodeInfoList 模板。",
    inputSchema: {
      type: "object",
      properties: {
        section: { type: "string", description: "可选：video、direct_video、remix_short_video、digital_human、lip_sync、runninghub、ad_preaudit。" },
        action: { type: "string", description: "例如 list_works、generate、recover、list_templates、list_voice_library、list_custom_voices、create_custom_voice、create_speech_task、get_speech_task、list_apps、get_app_detail、save_config 等。" },
        workId: { type: "string" },
        taskId: { type: "string" },
        voiceId: { type: "string", description: "数字人语音 ID。create_speech_task 时可直接传这里，服务端会自动映射到 payload.audioManId。" },
        templateId: { type: "string" },
        customPersonId: { type: "string" },
        appKey: { type: "string" },
        mediaAssetId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        page: { type: "integer", minimum: 1, maximum: 1000 },
        size: { type: "integer", minimum: 1, maximum: 100 },
        sort: { type: "string" },
        tagIds: { type: "array", items: { type: "integer" } },
        payload: {
          type: "object",
          description: "对应动作的请求体。数字人 create_speech_task 需要 text，建议配合 voiceId 一起传；RunningHub generate 需要先从 get_app_detail 返回结果里取 nodeInfoList 模板，再回填 fieldValue 后原样提交。若通过 stdio MCP 运行，payload.nodeInfoList 里的上传节点可直接传 localFilePath。图片、音频、视频上传节点都会先上传到 RunningHub，再把官方返回的可用路径回填给对应节点；其中标准图片上传节点（如 LoadImage + image_upload）不要再回填网站 URL。不要把 localFilePath=... 这种字面文本塞进 fieldValue 或 fieldData，不要手改模板 fieldData，也不要保留 example.png 这类模板占位值；如果图片节点最终没有真实上传、仍保留模板占位值，服务端会直接报错拦截，避免继续误用示例图。",
          additionalProperties: true,
        },
      },
      required: ["section", "action"],
      additionalProperties: false,
    },
  },
  {
    name: "get_unified_material_library_items",
    description: "查看当前品牌统一素材库，聚合小红书、抖音和公众号素材，可用于跨平台二创。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "add_douyin_work_to_material_library",
    description: "把抖音对标作品、搜索作品或榜单作品加入统一素材库。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "抖音采集作品 ID。" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "add_wechat_article_to_material_library",
    description: "把公众号对标文章或微信搜一搜文章加入统一素材库。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "公众号采集文章 ID。" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_xiaohongshu_note_from_material_library",
    description: "把小红书对标作品或搜索笔记从统一素材库中移除。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "小红书采集作品 ID。" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_douyin_work_from_material_library",
    description: "把抖音作品从统一素材库中移除。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "抖音采集作品 ID。" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_collection_workspace",
    description: "查看品牌资料库里公众号采集数据工作区，包括品牌公众号文章、对标文章和微信搜一搜。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_wechat_brand_accounts",
    description: "绑定或同步品牌资料库里的公众号账号，需要提供 ghUsername。",
    inputSchema: {
      type: "object",
      properties: {
        ghUsername: { type: "string", description: "公众号 gh_username。" },
      },
      required: ["ghUsername"],
      additionalProperties: false,
    },
  },
  {
    name: "fetch_wechat_brand_articles",
    description: "抓取指定品牌公众号的历史文章列表，对应页面里的“提交”动作。",
    inputSchema: {
      type: "object",
      properties: {
        ghUsername: { type: "string", description: "公众号 gh_username。" },
        offset: { type: "string", description: "翻页游标；首次抓取可不传。" },
      },
      required: ["ghUsername"],
      additionalProperties: false,
    },
  },
  {
    name: "sync_wechat_benchmark_articles",
    description: "同步品牌资料库里公众号对标文章数据，需要提供文章链接。",
    inputSchema: {
      type: "object",
      properties: {
        articleUrls: {
          type: "array",
          items: { type: "string" },
          description: "公众号文章链接列表。",
        },
      },
      required: ["articleUrls"],
      additionalProperties: false,
    },
  },
  {
    name: "sync_wechat_search_articles",
    description: "同步品牌资料库里微信搜一搜数据，需要提供搜索关键词。",
    inputSchema: {
      type: "object",
      properties: {
        searchKeyword: { type: "string", description: "微信搜一搜关键词。" },
      },
      required: ["searchKeyword"],
      additionalProperties: false,
    },
  },
  {
    name: "update_wechat_article_stats",
    description: "根据公众号文章链接更新阅读量、点赞数、分享数、收藏数、评论数、喜欢数。",
    inputSchema: {
      type: "object",
      properties: {
        articleUrl: { type: "string", description: "公众号文章链接。" },
      },
      required: ["articleUrl"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_xhs_collected_note",
    description: "删除小红书采集的对标作品或搜索笔记。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "小红书采集作品 ID。" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_douyin_collected_work",
    description: "删除抖音采集的竞品作品、对标作品、搜索作品或榜单作品。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "抖音采集作品 ID。" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_wechat_collected_article",
    description: "删除公众号采集的品牌文章、对标文章或微信搜一搜文章。",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "公众号采集文章 ID。" },
        kind: { type: "string", description: "可选：benchmark、search、brand。默认自动判断。" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_material_library_items",
    description: "查看当前品牌素材库里可用于抖音二创的素材作品。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
];

@Injectable()
export class OpenClawService {
  constructor(
    private readonly authService: AuthService,
    private readonly tasksService: TasksService,
    private readonly brandsService: BrandsService,
    private readonly collectorsService: CollectorsService,
    private readonly feedbackService: FeedbackService,
    private readonly publishingService: PublishingService,
    private readonly reportsService: ReportsService,
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
    private readonly volcengineMusicService: VolcengineMusicService,
    private readonly ordersService: OrdersService,
    private readonly userSkillsService: UserSkillsService,
    private readonly worksService: WorksService,
    private readonly openClawInstallationService: OpenClawInstallationService,
    private readonly openClawLobsterDiaryService: OpenClawLobsterDiaryService,
    private readonly openClawDailyPlanService: OpenClawDailyPlanService,
    private readonly openClawCreativeMaterialService: OpenClawCreativeMaterialService,
    private readonly openClawGeoVisibilityReportService: OpenClawGeoVisibilityReportService,
    private readonly openClawVideoWorkService: OpenClawVideoWorkService,
  ) {}

  async getCurrentBrandContext(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const me = await this.authService.getMe(auth);
    const currentBrandId = me.currentBrandId;
    if (!currentBrandId) {
      throw new UnauthorizedException("当前账号没有可用品牌");
    }

    const currentBrand = me.brands.find((item) => item.id === currentBrandId);
    const access = await this.authService.assertBrandAccess(currentBrandId, auth);

    return this.buildSummaryResponse({
      title: "当前品牌上下文",
      summary: `当前默认品牌为 ${currentBrand?.brandName ?? currentBrandId}，你在该品牌下具备 ${access.role} 权限。`,
      highlights: [
        `当前品牌：${currentBrand?.brandName ?? currentBrandId}`,
        `当前角色：${access.role}`,
        `可访问品牌数：${me.brands.length}`,
      ],
      data: {
        user: {
          id: me.user.id,
          nickname: me.user.nickname,
          mobile: me.user.mobile,
        },
        brand: {
          id: currentBrandId,
          name: currentBrand?.brandName ?? "",
          industry: currentBrand?.industry ?? "",
          isDefault: true,
        },
        member: {
          role: access.role,
          isOwner: access.isOwner,
          permissions: access.permissions,
        },
      },
      links: [],
    });
  }

  async getBrandProducts(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const items = archive.products
      .slice(0, this.normalizeLimit(options?.limit))
      .map((item) => ({
        id: item.id,
        productName: item.productName,
        usageScenario: item.usageScenario,
        targetAudience: item.targetAudience,
        differentiators: item.differentiators,
        imageUrl: item.imageUrl,
      }));

    return this.buildSummaryResponse({
      title: "品牌产品清单",
      summary: items.length
        ? `当前品牌共有 ${archive.products.length} 个产品可用于内容生成。`
        : "当前品牌还没有可用产品，可直接按品牌通用内容生成。",
      highlights: items.length
        ? items.slice(0, 3).map((item) => `${item.productName}${item.targetAudience ? `｜${item.targetAudience}` : ""}`)
        : ["产品数：0"],
      data: {
        total: archive.products.length,
        items,
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
    });
  }

  async getWebsiteFunctionCatalog(
    headers: HeadersMap,
    options?: {
      domainKey?: string;
      riskLevel?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const domainKey = this.normalizeOptionalString(options?.domainKey);
    const riskLevel = this.normalizeOptionalString(options?.riskLevel);
    const items = OPENCLAW_WEBSITE_FUNCTION_CATALOG.filter((item) =>
      (!domainKey || item.domainKey === domainKey)
      && (!riskLevel || item.riskLevel === riskLevel));
    const domains = Array.from(new Map(items.map((item) => [item.domainKey, item.domainName])).entries())
      .map(([key, name]) => ({ key, name }));

    return this.buildSummaryResponse({
      title: "网站功能目录",
      summary: items.length
        ? `当前共有 ${items.length} 个可由 Skill 控制的网站功能，覆盖 ${domains.length} 个业务域。`
        : "当前筛选条件下没有匹配到可控网站功能。",
      highlights: items.length
        ? items.slice(0, 6).map((item) => `${item.domainName}｜${item.name}｜${item.riskLevel}`)
        : ["功能数：0"],
      data: {
        domains,
        items,
      },
      links: [{ label: "打开 OpenClaw 安装页", url: "/personal-center/openclaw" }],
      resourceKind: "website_function_catalog",
    });
  }

  async getWebsiteFunctionDetail(
    headers: HeadersMap,
    options?: {
      functionKey?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const functionKey = String(options?.functionKey || "").trim();
    if (!functionKey) {
      throw new BadRequestException("请提供 functionKey");
    }

    const item = OPENCLAW_WEBSITE_FUNCTION_CATALOG.find((candidate) => candidate.key === functionKey);
    if (!item) {
      throw new BadRequestException("未找到对应的网站功能");
    }

    return this.buildSummaryResponse({
      title: `${item.name} 控制说明`,
      summary: `${item.name} 属于${item.domainName}域，建议由 Skill 先补齐必需信息，再调用对应 MCP tools，必要时回到网站页面继续处理。`,
      highlights: [
        `业务域：${item.domainName}`,
        `风险级别：${item.riskLevel}`,
        `页面入口：${item.pageUrl}`,
        `对应工具：${item.mcpTools.join("、")}`,
      ],
      data: item,
      links: [{ label: item.pageLabel, url: item.pageUrl }],
      resourceKind: "website_function",
      nextActions: [
        { label: item.pageLabel, action: "open_page", target: item.pageUrl },
        { label: "继续在对话中执行", action: "continue_in_chat", target: item.key },
      ],
    });
  }

  async routeWebsiteFunctionByIntent(
    headers: HeadersMap,
    options?: {
      intent?: string;
      preferredDomain?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const intent = String(options?.intent || "").trim();
    if (!intent) {
      throw new BadRequestException("请提供 intent");
    }
    const preferredDomain = this.normalizeOptionalString(options?.preferredDomain);
    const routedItems = OPENCLAW_WEBSITE_FUNCTION_CATALOG
      .map((item) => ({
        ...item,
        score: this.scoreWebsiteFunctionIntentMatch(intent, item, preferredDomain),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const primary = routedItems[0];
    return this.buildSummaryResponse({
      title: "网站功能意图路由",
      summary: primary
        ? `当前意图最匹配的网站功能是“${primary.name}”，建议先补齐必需信息后再调用对应工具。`
        : "当前意图暂未命中明确的网站功能，建议先查看功能目录或补充更具体的需求。",
      highlights: primary
        ? [
            `首选功能：${primary.name}`,
            `业务域：${primary.domainName}`,
            `风险级别：${primary.riskLevel}`,
            `推荐工具：${primary.mcpTools.join("、")}`,
          ]
        : ["建议先调用 get_website_function_catalog 查看可控功能"],
      data: {
        intent,
        preferredDomain: preferredDomain || undefined,
        primary: primary
          ? {
              functionKey: primary.key,
              domainKey: primary.domainKey,
              domainName: primary.domainName,
              name: primary.name,
              summary: primary.summary,
              riskLevel: primary.riskLevel,
              pageUrl: primary.pageUrl,
              requiredInputs: primary.requiredInputs,
              recommendedQuestions: primary.recommendedQuestions,
              mcpTools: primary.mcpTools,
              score: primary.score,
              requiresConfirmation: primary.riskLevel === "high",
            }
          : null,
        candidates: routedItems.map((item) => ({
          functionKey: item.key,
          name: item.name,
          domainKey: item.domainKey,
          domainName: item.domainName,
          riskLevel: item.riskLevel,
          pageUrl: item.pageUrl,
          mcpTools: item.mcpTools,
          score: item.score,
        })),
      },
      links: primary
        ? [{ label: primary.pageLabel, url: primary.pageUrl }]
        : [{ label: "打开 OpenClaw 安装页", url: "/personal-center/openclaw" }],
      resourceKind: "website_function_route",
      nextActions: primary
        ? [
            ...(primary.riskLevel === "high"
              ? [{ label: "先确认再执行", action: "confirm" as const, target: primary.key }]
              : []),
            { label: "继续在对话中收集信息", action: "continue_in_chat", target: primary.key },
            { label: primary.pageLabel, action: "open_page", target: primary.pageUrl },
          ]
        : [{ label: "查看功能目录", action: "continue_in_chat", target: "website_function_catalog" }],
    });
  }

  async getWebsiteFunctionExecutionPlan(
    headers: HeadersMap,
    options?: {
      functionKey?: string;
      providedInputs?: Record<string, unknown>;
      confirmed?: boolean;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const functionKey = String(options?.functionKey || "").trim();
    if (!functionKey) {
      throw new BadRequestException("请提供 functionKey");
    }
    const item = OPENCLAW_WEBSITE_FUNCTION_CATALOG.find((candidate) => candidate.key === functionKey);
    if (!item) {
      throw new BadRequestException("未找到对应的网站功能");
    }

    const providedInputs = options?.providedInputs && typeof options.providedInputs === "object" && !Array.isArray(options.providedInputs)
      ? options.providedInputs
      : {};
    const inputChecklist = item.requiredInputKeys.map((key, index) => ({
      key,
      label: item.requiredInputs[index] || key,
      provided: this.hasProvidedExecutionInput(providedInputs[key]),
    }));
    const missingInputs = inputChecklist.filter((item) => !item.provided).map((item) => ({
      key: item.key,
      label: item.label,
    }));
    const confirmationRequired = item.riskLevel === "high";
    const confirmed = options?.confirmed === true;
    const planStatus = missingInputs.length
      ? "NEED_INPUT"
      : confirmationRequired && !confirmed
        ? "NEED_CONFIRMATION"
        : "READY";
    const recommendedToolSequence = this.buildWebsiteFunctionToolSequence(item, planStatus);

    return this.buildSummaryResponse({
      title: `${item.name} 执行计划`,
      summary: planStatus === "READY"
        ? `${item.name} 当前已具备执行条件，可按建议工具顺序继续。`
        : planStatus === "NEED_CONFIRMATION"
          ? `${item.name} 当前信息已基本齐备，但属于高风险动作，建议先确认再执行。`
          : `${item.name} 还缺少 ${missingInputs.length} 项关键信息，建议先追问补齐。`,
      highlights: [
        `执行状态：${planStatus}`,
        `风险级别：${item.riskLevel}`,
        missingInputs.length
          ? `缺失信息：${missingInputs.map((input) => input.label).join("、")}`
          : "缺失信息：无",
        `工具顺序：${recommendedToolSequence.join(" -> ")}`,
      ],
      data: {
        functionKey: item.key,
        functionName: item.name,
        domainKey: item.domainKey,
        domainName: item.domainName,
        pageUrl: item.pageUrl,
        riskLevel: item.riskLevel,
        status: planStatus,
        confirmationRequired,
        confirmed,
        inputChecklist,
        missingInputs,
        recommendedQuestions: missingInputs.length
          ? item.recommendedQuestions.slice(0, Math.max(missingInputs.length, 1))
          : [],
        recommendedToolSequence,
        nextStep: planStatus === "READY"
          ? "可以开始执行"
          : planStatus === "NEED_CONFIRMATION"
            ? "请先征得用户确认"
            : "请先补齐缺失输入",
      },
      links: [{ label: item.pageLabel, url: item.pageUrl }],
      resourceKind: "website_function_execution_plan",
      resultStatus: planStatus === "READY"
        ? "COMPLETED"
        : planStatus === "NEED_CONFIRMATION"
          ? "ACTION_REQUIRED"
          : "IN_PROGRESS",
      nextActions: [
        ...(missingInputs.length
          ? [{ label: "继续在对话中补充信息", action: "continue_in_chat" as const, target: item.key }]
          : []),
        ...(confirmationRequired && !confirmed
          ? [{ label: "先确认再执行", action: "confirm" as const, target: item.key }]
          : []),
        { label: item.pageLabel, action: "open_page", target: item.pageUrl },
      ],
    });
  }

  async getPlatformAccounts(
    headers: HeadersMap,
    options?: {
      platform?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const normalizedPlatform = this.normalizePlatformType(options?.platform);
    const scopedAccounts = archive.platformAccounts.filter((item) => (normalizedPlatform ? item.platform === normalizedPlatform : true));
    const items = scopedAccounts.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "品牌平台账号清单",
      summary: items.length
        ? `当前返回 ${items.length} 个${normalizedPlatform ? `${normalizedPlatform} ` : ""}平台账号。`
        : normalizedPlatform
          ? `当前品牌下没有 ${normalizedPlatform} 平台账号。`
          : "当前品牌下还没有配置平台账号。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.platform}｜${item.accountName || item.id}`)
        : ["账号数：0"],
      data: {
        total: scopedAccounts.length,
        platform: normalizedPlatform,
        items: items.map((item) => ({
          id: item.id,
          platform: item.platform,
          accountName: item.accountName,
          accountLink: item.accountLink,
        })),
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
    });
  }

  async getBrandArchiveSummary(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const brand = archive.brand;

    return this.buildSummaryResponse({
      title: "品牌档案摘要",
      summary: `当前品牌“${brand.brandName || brandId}”已沉淀 ${archive.products.length} 个产品、${archive.platformAccounts.length} 个平台账号、${archive.competitorAccounts.length} 个竞品账号和 ${archive.industryFeeds.length} 份行业资料。`,
      highlights: [
        `行业：${brand.industry || "待补充"}`,
        `门店数：${brand.storeCount || 0}`,
        `品牌问卷题数：${archive.survey.length}`,
        `业务资产数：${archive.businessAssets.length}`,
      ],
      data: {
        brand,
        counts: {
          products: archive.products.length,
          surveyAnswers: archive.survey.length,
          platformAccounts: archive.platformAccounts.length,
          competitorAccounts: archive.competitorAccounts.length,
          industryFeeds: archive.industryFeeds.length,
          businessAssets: archive.businessAssets.length,
        },
        steps: archive.steps,
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
      resourceKind: "brand_archive",
    });
  }

  async getBrandArchiveSurvey(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const items = archive.survey.slice(0, Math.min(100, this.normalizeLimit(options?.limit))).map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
    }));

    return this.buildSummaryResponse({
      title: "品牌建档问卷",
      summary: items.length
        ? `当前品牌已记录 ${archive.survey.length} 条建档问卷答案。`
        : "当前品牌还没有建档问卷答案。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.label}：${item.value}`)
        : ["问卷答案数：0"],
      data: {
        total: archive.survey.length,
        items,
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
      resourceKind: "brand_archive_survey",
    });
  }

  async getBrandCompetitorAccounts(
    headers: HeadersMap,
    options?: {
      platform?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const normalizedPlatform = this.normalizePlatformType(options?.platform);
    const scopedAccounts = archive.competitorAccounts.filter((item) => (normalizedPlatform ? item.platform === normalizedPlatform : true));
    const items = scopedAccounts.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "竞品账号清单",
      summary: items.length
        ? `当前返回 ${items.length} 个${normalizedPlatform ? `${normalizedPlatform} ` : ""}竞品账号。`
        : normalizedPlatform
          ? `当前品牌下没有 ${normalizedPlatform} 竞品账号。`
          : "当前品牌下还没有竞品账号。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.platform}｜${item.accountName || item.id}`)
        : ["竞品账号数：0"],
      data: {
        total: scopedAccounts.length,
        platform: normalizedPlatform,
        items: items.map((item) => ({
          id: item.id,
          platform: item.platform,
          accountName: item.accountName,
          accountLink: item.accountLink,
          accountRole: item.accountRole,
        })),
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
      resourceKind: "competitor_account",
    });
  }

  async getBrandIndustryFeeds(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const items = archive.industryFeeds.slice(0, this.normalizeLimit(options?.limit)).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      sourceName: item.sourceName,
      fileUrl: item.fileUrl,
    }));

    return this.buildSummaryResponse({
      title: "行业资料清单",
      summary: items.length
        ? `当前品牌已沉淀 ${archive.industryFeeds.length} 份行业资料。`
        : "当前品牌还没有行业资料。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}${item.sourceName ? `｜${item.sourceName}` : ""}`)
        : ["行业资料数：0"],
      data: {
        total: archive.industryFeeds.length,
        items,
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
      resourceKind: "industry_feed",
    });
  }

  async getBrandBusinessAssets(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const items = archive.businessAssets.slice(0, this.normalizeLimit(options?.limit)).map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: String(record.id || ""),
        title: String(record.title || ""),
        description: String(record.description || ""),
        sourceName: String(record.sourceName || ""),
        fileUrl: String(record.fileUrl || ""),
        knowledgeBaseName: typeof record.knowledgeBaseName === "string" ? record.knowledgeBaseName : undefined,
        bindingType: typeof record.bindingType === "string" ? record.bindingType : undefined,
        targetName: typeof record.targetName === "string" ? record.targetName : undefined,
        enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
      };
    });

    return this.buildSummaryResponse({
      title: "品牌业务资产清单",
      summary: items.length
        ? `当前品牌已有 ${archive.businessAssets.length} 份业务资产，可直接供知识库与模块调用。`
        : "当前品牌还没有业务资产。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}${item.knowledgeBaseName ? `｜${item.knowledgeBaseName}` : ""}`)
        : ["业务资产数：0"],
      data: {
        total: archive.businessAssets.length,
        items,
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
      resourceKind: "business_asset",
    });
  }

  async getXiaohongshuCollectionWorkspace(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "view", auth);

    const workspace = await this.collectorsService.getXiaohongshuWorkspace(brandId);
    const limit = this.normalizeLimit(options?.limit);
    const counts = this.buildXiaohongshuCollectionCounts(workspace);

    return this.buildSummaryResponse({
      title: "小红书搜集数据工作区",
      summary: `当前品牌资料库中的小红书搜集数据已包含 ${counts.brandAccounts} 个品牌账号、${counts.competitorAccounts} 个竞品账号、${counts.brandNotes} 条品牌作品、${counts.benchmarkNotes} 条对标作品、${counts.searchNotes} 条搜索笔记和 ${counts.targetUsers} 条目标用户。`,
      highlights: [
        `品牌账号：${counts.brandAccounts}`,
        `竞品账号：${counts.competitorAccounts}`,
        `品牌作品：${counts.brandNotes}`,
        `对标作品：${counts.benchmarkNotes}`,
        `搜索笔记：${counts.searchNotes}`,
        `目标用户：${counts.targetUsers}`,
      ],
      data: {
        counts,
        brandAccounts: workspace.brandAccounts.slice(0, limit),
        competitorAccounts: workspace.competitorAccounts.slice(0, limit),
        brandNotes: workspace.brandNotes.slice(0, limit),
        benchmarkNotes: workspace.benchmarkNotes.slice(0, limit),
        searchNotes: workspace.searchNotes.slice(0, limit),
        targetUsers: workspace.targetUsers.slice(0, limit),
      },
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resourceKind: "xiaohongshu_collection",
    });
  }

  async syncXiaohongshuBrandAccounts(
    headers: HeadersMap,
    options?: {
      accountLocators?: string[];
      accountEntries?: Array<{ locator?: string; accountRole?: string }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const result = await this.collectorsService.syncBrandAccounts(brandId, {
      accountLocators: this.normalizeStringArray(options?.accountLocators),
      accountEntries: this.normalizeXhsAccountEntries(options?.accountEntries),
    });
    const counts = this.buildXiaohongshuCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "小红书品牌账号已同步",
      summary: `已同步 ${result.syncedCount} 条品牌账号数据，当前小红书搜集数据工作区里共有 ${counts.brandAccounts} 个品牌账号。`,
      highlights: [
        `本次同步：${result.syncedCount}`,
        `工作区品牌账号：${counts.brandAccounts}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async syncXiaohongshuCompetitorAccounts(
    headers: HeadersMap,
    options?: {
      accountLocators?: string[];
      accountEntries?: Array<{ locator?: string; accountRole?: string }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const result = await this.collectorsService.syncCompetitorAccounts(brandId, {
      accountLocators: this.normalizeStringArray(options?.accountLocators),
      accountEntries: this.normalizeXhsAccountEntries(options?.accountEntries),
    });
    const counts = this.buildXiaohongshuCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "小红书竞品账号已同步",
      summary: `已同步 ${result.syncedCount} 条竞品账号数据，当前工作区里共有 ${counts.competitorAccounts} 个竞品账号。`,
      highlights: [
        `本次同步：${result.syncedCount}`,
        `工作区竞品账号：${counts.competitorAccounts}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async syncXiaohongshuBrandNotes(
    headers: HeadersMap,
    options?: {
      accountLocators?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const result = await this.collectorsService.syncBrandNotes(brandId, {
      accountLocators: this.normalizeStringArray(options?.accountLocators),
    });
    const counts = this.buildXiaohongshuCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "小红书品牌作品已同步",
      summary: `已同步 ${result.syncedCount} 条品牌作品，当前工作区里共有 ${counts.brandNotes} 条品牌作品。`,
      highlights: [
        `本次同步：${result.syncedCount}`,
        `工作区品牌作品：${counts.brandNotes}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async syncXiaohongshuBenchmarkNotes(
    headers: HeadersMap,
    options?: {
      sourceUrls?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const sourceUrls = this.normalizeStringArray(options?.sourceUrls);
    if (!sourceUrls.length) {
      throw new BadRequestException("请提供至少一条小红书对标作品链接");
    }
    const result = await this.collectorsService.syncBenchmarkNotes(brandId, sourceUrls);
    const counts = this.buildXiaohongshuCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "小红书对标作品已同步",
      summary: `已同步 ${result.syncedCount} 条对标作品，当前工作区里共有 ${counts.benchmarkNotes} 条对标作品。`,
      highlights: [
        `本次同步：${result.syncedCount}`,
        `工作区对标作品：${counts.benchmarkNotes}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async syncXiaohongshuSearchNotes(
    headers: HeadersMap,
    options?: {
      keyword?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const keyword = this.normalizeSafeInstruction(options?.keyword, "小红书搜索关键词");
    if (!keyword) {
      throw new BadRequestException("请提供 keyword");
    }
    const result = await this.collectorsService.syncSearchNotes(brandId, keyword);
    const counts = this.buildXiaohongshuCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "小红书搜索笔记已同步",
      summary: `已按关键词“${keyword}”同步 ${result.syncedCount} 条搜索笔记，当前工作区里共有 ${counts.searchNotes} 条搜索笔记。`,
      highlights: [
        `关键词：${keyword}`,
        `本次同步：${result.syncedCount}`,
        `工作区搜索笔记：${counts.searchNotes}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async syncXiaohongshuTargetUsers(
    headers: HeadersMap,
    options?: {
      sourceUrls?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const sourceUrls = this.normalizeStringArray(options?.sourceUrls);
    if (!sourceUrls.length) {
      throw new BadRequestException("请提供至少一条目标用户链接");
    }
    const result = await this.collectorsService.syncTargetUsers(brandId, sourceUrls);
    const counts = this.buildXiaohongshuCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "小红书目标用户已同步",
      summary: `已同步 ${result.syncedCount} 条目标用户数据，当前工作区里共有 ${counts.targetUsers} 条目标用户。`,
      highlights: [
        `本次同步：${result.syncedCount}`,
        `工作区目标用户：${counts.targetUsers}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async syncXiaohongshuFeishuWorkspace(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const result = await this.collectorsService.syncFeishuWorkspace(brandId);
    const counts = this.buildXiaohongshuCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "小红书飞书副本同步已完成",
      summary: `已从飞书副本同步 ${result.syncedCount} 条数据，当前工作区里共有 ${counts.brandAccounts + counts.competitorAccounts + counts.brandNotes + counts.benchmarkNotes + counts.searchNotes + counts.targetUsers} 条小红书采集结果。`,
      highlights: [
        `本次同步：${result.syncedCount}`,
        `匹配数据表：${result.tableCount}`,
        `品牌账号：${counts.brandAccounts}`,
        `竞品账号：${counts.competitorAccounts}`,
        `品牌作品：${counts.brandNotes}`,
        `对标作品：${counts.benchmarkNotes}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async addXiaohongshuNoteToMaterialLibrary(
    headers: HeadersMap,
    options?: {
      assetId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const result = await this.collectorsService.addBenchmarkNoteToMaterialLibrary(brandId, assetId);

    return this.buildSummaryResponse({
      title: "小红书素材已加入素材库",
      summary: `素材 ${assetId} 已加入素材库，可继续用于小红书二创图文。`,
      highlights: [
        `素材 ID：${assetId}`,
        result.item?.title ? `素材标题：${result.item.title}` : "素材标题：未返回",
      ],
      data: result,
      links: [{ label: "打开小红书工作区", url: "/xiaohongshu" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_material",
    });
  }

  async getDouyinCollectionWorkspace(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "view", auth);

    const workspace = await this.collectorsService.getDouyinWorkspace(brandId);
    const limit = this.normalizeLimit(options?.limit);
    const counts = this.buildDouyinCollectionCounts(workspace);

    return this.buildSummaryResponse({
      title: "抖音搜集数据工作区",
      summary: `当前品牌资料库中的抖音搜集数据已包含 ${counts.brandAccounts} 个品牌账号、${counts.competitorAccounts} 个竞品账号、${counts.benchmarkWorks} 条对标作品、${counts.searchWorks} 条搜索结果和 ${counts.commentData} 条评论数据。`,
      highlights: [
        `品牌账号：${counts.brandAccounts}`,
        `竞品账号：${counts.competitorAccounts}`,
        `品牌作品：${counts.brandWorks}`,
        `竞品作品：${counts.competitorWorks}`,
        `对标作品：${counts.benchmarkWorks}`,
        `搜索结果：${counts.searchWorks}`,
        `评论数据：${counts.commentData}`,
      ],
      data: {
        counts,
        brandAccounts: workspace.brandAccounts.slice(0, limit),
        competitorAccounts: workspace.competitorAccounts.slice(0, limit),
        brandWorks: workspace.brandWorks.slice(0, limit),
        competitorWorks: workspace.competitorWorks.slice(0, limit),
        benchmarkWorks: workspace.benchmarkWorks.slice(0, limit),
        searchWorks: workspace.searchWorks.slice(0, limit),
        commentData: workspace.commentData.slice(0, limit),
        keywordRecommendations: workspace.keywordRecommendations.slice(0, limit),
        lowFanExplosiveWorks: workspace.lowFanExplosiveWorks.slice(0, limit),
        highCompletionRateWorks: workspace.highCompletionRateWorks.slice(0, limit),
        highLikeRateWorks: workspace.highLikeRateWorks.slice(0, limit),
        cityHotspots: workspace.cityHotspots.slice(0, limit),
        contentTags: workspace.contentTags.slice(0, limit),
        cityOptions: workspace.cityOptions.slice(0, limit),
      },
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinBrandAccounts(
    headers: HeadersMap,
    options?: {
      accountLocators?: string[];
      accountEntries?: Array<{ locator?: string; accountRole?: string }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "brandAccount",
      brandAccountLinks: this.normalizeStringArray(options?.accountLocators),
      brandAccountEntries: this.normalizeXhsAccountEntries(options?.accountEntries),
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音品牌账号已同步",
      summary: `已同步 ${result.breakdown.brandAccounts} 条品牌账号数据，当前抖音搜集数据工作区里共有 ${counts.brandAccounts} 个品牌账号。`,
      highlights: [
        `本次同步：${result.breakdown.brandAccounts}`,
        `工作区品牌账号：${counts.brandAccounts}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinCompetitorAccounts(
    headers: HeadersMap,
    options?: {
      accountLocators?: string[];
      accountEntries?: Array<{ locator?: string; accountRole?: string }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "competitorAccount",
      competitorAccountLinks: this.normalizeStringArray(options?.accountLocators),
      competitorAccountEntries: this.normalizeXhsAccountEntries(options?.accountEntries),
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音竞品账号已同步",
      summary: `已同步 ${result.breakdown.competitorAccounts} 条竞品账号数据，当前工作区里共有 ${counts.competitorAccounts} 个竞品账号。`,
      highlights: [
        `本次同步：${result.breakdown.competitorAccounts}`,
        `工作区竞品账号：${counts.competitorAccounts}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinBenchmarkWorks(
    headers: HeadersMap,
    options?: {
      benchmarkAwemeIds?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const benchmarkAwemeIds = this.normalizeStringArray(options?.benchmarkAwemeIds);
    if (!benchmarkAwemeIds.length) {
      throw new BadRequestException("请提供至少一个抖音作品 aweme_id");
    }
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "benchmarkWorks",
      benchmarkAwemeIds,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音对标作品已同步",
      summary: `已同步 ${result.breakdown.benchmarkWorks} 条对标作品，当前工作区里共有 ${counts.benchmarkWorks} 条对标作品。`,
      highlights: [
        `本次同步：${result.breakdown.benchmarkWorks}`,
        `工作区对标作品：${counts.benchmarkWorks}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinSearchWorks(
    headers: HeadersMap,
    options?: {
      searchKeyword?: string;
      searchSortType?: string;
      searchPublishTime?: string;
      searchFilterDuration?: string;
      searchContentType?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const searchKeyword = this.normalizeSafeInstruction(options?.searchKeyword, "抖音搜索关键词");
    if (!searchKeyword) {
      throw new BadRequestException("请提供 searchKeyword");
    }
    const searchSortType = this.normalizeSafeInstruction(options?.searchSortType, "抖音搜索排序") || undefined;
    const searchPublishTime = this.normalizeSafeInstruction(options?.searchPublishTime, "抖音发布时间范围") || undefined;
    const searchFilterDuration = this.normalizeSafeInstruction(options?.searchFilterDuration, "抖音视频时长范围") || undefined;
    const searchContentType = this.normalizeSafeInstruction(options?.searchContentType, "抖音内容类型") || undefined;
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "searchWorks",
      searchKeyword,
      searchSortType,
      searchPublishTime,
      searchFilterDuration,
      searchContentType,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音搜索结果已同步",
      summary: `已按关键词“${searchKeyword}”同步 ${result.breakdown.searchWorks} 条搜索结果，当前工作区里共有 ${counts.searchWorks} 条搜索结果。`,
      highlights: [
        `关键词：${searchKeyword}`,
        `本次同步：${result.breakdown.searchWorks}`,
        `工作区搜索结果：${counts.searchWorks}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinCommentData(
    headers: HeadersMap,
    options?: {
      commentSourceUrls?: string[];
      commentPageRequests?: Array<{ sourceUrl?: string; cursor?: string }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const commentSourceUrls = this.normalizeStringArray(options?.commentSourceUrls);
    const commentPageRequests: Array<{ sourceUrl: string; cursor?: string }> = [];
    for (const item of options?.commentPageRequests ?? []) {
      const sourceUrl = this.normalizeSafeInstruction(item.sourceUrl, "抖音评论作品链接");
      if (!sourceUrl) {
        continue;
      }
      const cursor = this.normalizeSafeInstruction(item.cursor, "抖音评论游标") || undefined;
      commentPageRequests.push({ sourceUrl, ...(cursor ? { cursor } : {}) });
    }
    if (!commentSourceUrls.length && !commentPageRequests.length) {
      throw new BadRequestException("请提供 commentSourceUrls 或 commentPageRequests");
    }
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "commentData",
      commentSourceUrls,
      commentPageRequests,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音评论数据已同步",
      summary: `已同步 ${result.breakdown.commentData} 条评论数据，当前工作区里共有 ${counts.commentData} 条评论数据。`,
      highlights: [
        `本次同步：${result.breakdown.commentData}`,
        `工作区评论数据：${counts.commentData}`,
        `分页游标数：${result.commentPagination.length}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinKeywordRecommendations(
    headers: HeadersMap,
    options?: {
      searchKeyword?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const searchKeyword = this.normalizeSafeInstruction(options?.searchKeyword, "抖音关键词推荐搜索词");
    if (!searchKeyword) {
      throw new BadRequestException("请提供 searchKeyword");
    }
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "keywordRecommendations",
      searchKeyword,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音关键词推荐已同步",
      summary: `已按关键词“${searchKeyword}”同步 ${result.breakdown.keywordRecommendations} 条推荐词，当前工作区里共有 ${counts.keywordRecommendations} 条关键词推荐。`,
      highlights: [
        `关键词：${searchKeyword}`,
        `本次同步：${result.breakdown.keywordRecommendations}`,
        `工作区关键词推荐：${counts.keywordRecommendations}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinLowFanExplosiveWorks(
    headers: HeadersMap,
    options?: {
      primaryTagId?: number;
      secondaryTagId?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const selection = this.normalizeDouyinContentTagSelection(options);
    if (!selection) {
      throw new BadRequestException("请同时提供 primaryTagId 和 secondaryTagId");
    }
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "lowFanExplosiveWorks",
      contentTagSelection: selection,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音低粉爆款榜已同步",
      summary: `已同步 ${result.breakdown.lowFanExplosiveWorks} 条低粉爆款榜作品，当前工作区里共有 ${counts.lowFanExplosiveWorks} 条低粉爆款榜作品。`,
      highlights: [
        `一级标签：${selection.primaryTagId}`,
        `二级标签：${selection.secondaryTagId}`,
        `本次同步：${result.breakdown.lowFanExplosiveWorks}`,
        `工作区低粉爆款榜：${counts.lowFanExplosiveWorks}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinHighCompletionRateWorks(
    headers: HeadersMap,
    options?: {
      primaryTagId?: number;
      secondaryTagId?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const selection = this.normalizeDouyinContentTagSelection(options);
    if (!selection) {
      throw new BadRequestException("请同时提供 primaryTagId 和 secondaryTagId");
    }
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "highCompletionRateWorks",
      contentTagSelection: selection,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音高完播率榜已同步",
      summary: `已同步 ${result.breakdown.highCompletionRateWorks} 条高完播率榜作品，当前工作区里共有 ${counts.highCompletionRateWorks} 条高完播率榜作品。`,
      highlights: [
        `一级标签：${selection.primaryTagId}`,
        `二级标签：${selection.secondaryTagId}`,
        `本次同步：${result.breakdown.highCompletionRateWorks}`,
        `工作区高完播率榜：${counts.highCompletionRateWorks}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinHighLikeRateWorks(
    headers: HeadersMap,
    options?: {
      primaryTagId?: number;
      secondaryTagId?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const selection = this.normalizeDouyinContentTagSelection(options);
    if (!selection) {
      throw new BadRequestException("请同时提供 primaryTagId 和 secondaryTagId");
    }
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "highLikeRateWorks",
      contentTagSelection: selection,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音高点赞率榜已同步",
      summary: `已同步 ${result.breakdown.highLikeRateWorks} 条高点赞率榜作品，当前工作区里共有 ${counts.highLikeRateWorks} 条高点赞率榜作品。`,
      highlights: [
        `一级标签：${selection.primaryTagId}`,
        `二级标签：${selection.secondaryTagId}`,
        `本次同步：${result.breakdown.highLikeRateWorks}`,
        `工作区高点赞率榜：${counts.highLikeRateWorks}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async syncDouyinCityHotspots(
    headers: HeadersMap,
    options?: {
      cityCode?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const cityCode = typeof options?.cityCode === "number" && Number.isFinite(options.cityCode)
      ? Math.trunc(options.cityCode)
      : undefined;
    if (!cityCode) {
      throw new BadRequestException("请提供有效的 cityCode");
    }
    const result = await this.collectorsService.syncDouyinWorkspace(brandId, {
      scope: "cityHotspots",
      cityCode,
    });
    const counts = this.buildDouyinCollectionCounts(result.workspace);

    return this.buildSummaryResponse({
      title: "抖音同城热点已同步",
      summary: `已同步 ${result.breakdown.cityHotspots} 条同城热点，当前工作区里共有 ${counts.cityHotspots} 条同城热点。`,
      highlights: [
        `城市代码：${cityCode}`,
        `本次同步：${result.breakdown.cityHotspots}`,
        `工作区同城热点：${counts.cityHotspots}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async getOpportunityInsightWorkspace(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "view", auth);

    const workspace = await this.reportsService.getOpportunityInsightWorkspace(brandId);

    return this.buildSummaryResponse({
      title: "机会洞察工作区",
      summary: workspace.finalOpportunityReport
        ? "当前品牌已生成机会洞察总报告，可继续查看品牌账号分析、竞品账号分析与评论洞察。"
        : workspace.commentInsightAnalysis
          ? "当前品牌已完成评论洞察分析，可继续生成机会洞察总报告。"
          : workspace.brandAccountAnalysis || workspace.competitorAccountAnalysis
            ? "当前品牌已完成机会洞察第 1 步，可继续生成评论洞察。"
            : "当前品牌还没有完整的机会洞察结果，可先从第 1 步开始。",
      highlights: [
        `品牌账号分析：${workspace.brandAccountAnalysis ? "已完成" : "未完成"}`,
        `竞品账号分析：${workspace.competitorAccountAnalysis ? "已完成" : "未完成"}`,
        `评论洞察分析：${workspace.commentInsightAnalysis ? "已完成" : "未完成"}`,
        `总报告：${workspace.finalOpportunityReport ? "已完成" : "未完成"}`,
      ],
      data: {
        awaitingConfirmationStep: workspace.awaitingConfirmationStep,
        latestTask: workspace.latestTask,
        reports: {
          brandAccountAnalysis: workspace.brandAccountAnalysis
            ? { id: workspace.brandAccountAnalysis.id, title: workspace.brandAccountAnalysis.title, generatedAt: workspace.brandAccountAnalysis.generatedAt }
            : undefined,
          competitorAccountAnalysis: workspace.competitorAccountAnalysis
            ? { id: workspace.competitorAccountAnalysis.id, title: workspace.competitorAccountAnalysis.title, generatedAt: workspace.competitorAccountAnalysis.generatedAt }
            : undefined,
          commentInsightAnalysis: workspace.commentInsightAnalysis
            ? { id: workspace.commentInsightAnalysis.id, title: workspace.commentInsightAnalysis.title, generatedAt: workspace.commentInsightAnalysis.generatedAt }
            : undefined,
          finalOpportunityReport: workspace.finalOpportunityReport
            ? { id: workspace.finalOpportunityReport.id, title: workspace.finalOpportunityReport.title, generatedAt: workspace.finalOpportunityReport.generatedAt }
            : undefined,
        },
        historyCount: workspace.history.length,
      },
      links: [{ label: "打开机会洞察", url: "/brand-growth/reports?report=opportunity-insight" }],
      resourceKind: "opportunity_insight",
    });
  }

  async generateOpportunityInsightStepOne(
    headers: HeadersMap,
    options?: {
      supplementInput?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "edit", auth);

    const workspace = await this.reportsService.generateOpportunityInsightStepOne(brandId, {
      supplementInput: this.normalizeSafeInstruction(options?.supplementInput, "补充要求") || undefined,
    });

    return this.buildSummaryResponse({
      title: "机会洞察第 1 步已受理",
      summary: workspace.latestTask
        ? `已发起品牌账号分析与竞品账号分析任务，当前状态为 ${this.formatTaskStatus(workspace.latestTask.taskStatus)}。`
        : "已发起机会洞察第 1 步任务。",
      highlights: [
        options?.supplementInput ? `补充说明：${options.supplementInput}` : "补充说明：无",
        "输出内容：品牌账号分析、竞品账号分析",
      ],
      data: {
        latestTask: workspace.latestTask,
        awaitingConfirmationStep: workspace.awaitingConfirmationStep,
      },
      links: [{ label: "打开机会洞察", url: "/brand-growth/reports?report=opportunity-insight" }],
      resourceKind: "opportunity_insight",
    });
  }

  async generateOpportunityInsightStepTwo(
    headers: HeadersMap,
    options?: {
      supplementInput?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "edit", auth);

    const workspace = await this.reportsService.generateOpportunityInsightStepTwo(brandId, {
      supplementInput: this.normalizeSafeInstruction(options?.supplementInput, "补充要求") || undefined,
    });

    return this.buildSummaryResponse({
      title: "机会洞察第 2 步已受理",
      summary: workspace.latestTask
        ? `已发起评论洞察分析任务，当前状态为 ${this.formatTaskStatus(workspace.latestTask.taskStatus)}。`
        : "已发起机会洞察第 2 步任务。",
      highlights: [
        workspace.brandAccountAnalysis ? "品牌账号分析：已就绪" : "品牌账号分析：未就绪",
        workspace.competitorAccountAnalysis ? "竞品账号分析：已就绪" : "竞品账号分析：未就绪",
      ],
      data: {
        latestTask: workspace.latestTask,
        awaitingConfirmationStep: workspace.awaitingConfirmationStep,
      },
      links: [{ label: "打开机会洞察", url: "/brand-growth/reports?report=opportunity-insight" }],
      resourceKind: "opportunity_insight",
    });
  }

  async generateOpportunityInsightStepThree(
    headers: HeadersMap,
    options?: {
      supplementInput?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "edit", auth);

    const workspace = await this.reportsService.generateOpportunityInsightStepThree(brandId, {
      supplementInput: this.normalizeSafeInstruction(options?.supplementInput, "补充要求") || undefined,
    });

    return this.buildSummaryResponse({
      title: "机会洞察第 3 步已受理",
      summary: workspace.latestTask
        ? `已发起机会洞察总报告生成任务，当前状态为 ${this.formatTaskStatus(workspace.latestTask.taskStatus)}。`
        : "已发起机会洞察第 3 步任务。",
      highlights: [
        workspace.commentInsightAnalysis ? "评论洞察分析：已就绪" : "评论洞察分析：未就绪",
        "输出内容：机会洞察总报告",
      ],
      data: {
        latestTask: workspace.latestTask,
        awaitingConfirmationStep: workspace.awaitingConfirmationStep,
      },
      links: [{ label: "打开机会洞察", url: "/brand-growth/reports?report=opportunity-insight" }],
      resourceKind: "opportunity_insight",
    });
  }

  async listMyThirdPartyPlatforms(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.thirdPartyPlatforms", "view", auth);

    const [items, runtimeAccessList] = await Promise.all([
      this.thirdPartyPlatformsService.listUserPlatforms(auth.userId, brandId),
      this.thirdPartyPlatformsService.listBrandRuntimeAccessSummaries(brandId),
    ]);
    const runtimeAccessMap = new Map(runtimeAccessList.flatMap((item) => item.aliasIds.map((aliasId) => [aliasId, item] as const)));
    return this.buildSummaryResponse({
      title: "第三方接口配置摘要",
      summary: items.length
        ? `当前品牌共接入 ${items.length} 个第三方平台，可直接查看 API Key 遮罩状态、动态能力，以及 OpenClaw 是否可直接复用这些品牌共享凭证。`
        : "当前品牌还没有第三方平台配置。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => {
            const runtimeAccess = runtimeAccessMap.get(item.id);
            return `${item.name}｜${item.effectiveApiKeyMasked || "未配置"}｜OpenClaw:${runtimeAccess?.openClawCanUse ? "可直用" : "未就绪"}`;
          })
        : ["平台数：0"],
      data: {
        total: items.length,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          providerType: item.providerType,
          status: item.status,
          baseUrl: item.baseUrl,
          defaultModel: item.defaultModel,
          effectiveApiKeyMasked: item.effectiveApiKeyMasked,
          dynamicStats: item.dynamicStats,
          openClawRuntimeAccess: (() => {
            const runtimeAccess = runtimeAccessMap.get(item.id);
            return runtimeAccess
              ? {
                  status: runtimeAccess.status,
                  openClawCanUse: runtimeAccess.openClawCanUse,
                  resolvedFrom: runtimeAccess.resolvedFrom,
                  effectiveApiKeyMasked: runtimeAccess.effectiveApiKeyMasked,
                }
              : undefined;
          })(),
        })),
      },
      links: [{ label: "打开第三方接口配置", url: "/personal-center/third-party-platforms" }],
      resourceKind: "third_party_platform",
    });
  }

  async checkMyThirdPartyPlatformRuntimeAccess(
    headers: HeadersMap,
    options?: {
      platformId?: string;
      platformName?: string;
      baseUrl?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.thirdPartyPlatforms", "view", auth);

    const access = await this.thirdPartyPlatformsService.inspectBrandRuntimeAccess(brandId, {
      platformId: typeof options?.platformId === "string" ? options.platformId : undefined,
      platformName: typeof options?.platformName === "string" ? options.platformName : undefined,
      baseUrls: typeof options?.baseUrl === "string" ? [options.baseUrl] : undefined,
    });

    if (access.status === "brand-context-missing") {
      throw new UnauthorizedException("当前账号没有可用品牌，无法检查第三方平台共享凭证");
    }
    if (access.status === "no-platform-match") {
      return this.buildSummaryResponse({
        title: "未找到匹配的第三方平台",
        summary: "当前品牌下没有匹配到该平台，无法判断 OpenClaw 是否可直接复用共享凭证。",
        highlights: [
          `platformId：${String(options?.platformId || "").trim() || "-"}`,
          `platformName：${String(options?.platformName || "").trim() || "-"}`,
          `baseUrl：${String(options?.baseUrl || "").trim() || "-"}`,
        ],
        data: {
          status: access.status,
          openClawCanUse: access.openClawCanUse,
        },
        links: [{ label: "打开第三方接口配置", url: "/personal-center/third-party-platforms" }],
        resourceKind: "third_party_platform",
        resultStatus: "ACTION_REQUIRED",
      });
    }

    if (access.status === "brand-api-key-missing") {
      return this.buildSummaryResponse({
        title: "OpenClaw 暂无法直接使用该平台凭证",
        summary: `平台“${access.platform.name}”当前还没有品牌级共享 API Key，OpenClaw 无法直接代取使用。`,
        highlights: [
          `平台：${access.platform.name}`,
          `OpenClaw 直用：否`,
          "密钥状态：未配置",
        ],
        data: {
          status: access.status,
          platform: access.platform,
          openClawCanUse: access.openClawCanUse,
          apiKeyVisibleToOpenClawModel: false,
        },
        links: [{ label: "打开第三方接口配置", url: "/personal-center/third-party-platforms" }],
        resourceKind: "third_party_platform",
        resultStatus: "ACTION_REQUIRED",
        nextActions: [
          { label: "打开第三方接口配置", action: "open_page", target: "/personal-center/third-party-platforms" },
        ],
      });
    }

    if (!access.platform) {
      throw new ServiceUnavailableException("第三方平台共享凭证状态异常，暂时无法确认 OpenClaw 是否可直接使用");
    }

    return this.buildSummaryResponse({
      title: "OpenClaw 可直接复用该平台共享凭证",
      summary: `平台“${access.platform.name}”的品牌级共享 API Key 已可被 OpenClaw 服务端直接复用，后续支持该平台的工具无需再次向用户索取明文密钥。`,
      highlights: [
        `平台：${access.platform.name}`,
        `当前遮罩：${access.effectiveApiKeyMasked || "已配置"}`,
        `来源：${access.resolvedFrom === "brand" ? "个人中心品牌共享配置" : "本地开发环境"}`,
      ],
      data: {
        status: access.status,
        platform: access.platform,
        openClawCanUse: access.openClawCanUse,
        resolvedFrom: access.resolvedFrom,
        effectiveApiKeyMasked: access.effectiveApiKeyMasked,
        apiKeyVisibleToOpenClawModel: false,
        accessMode: "server-side-delegated",
      },
      links: [{ label: "打开第三方接口配置", url: "/personal-center/third-party-platforms" }],
      resourceKind: "third_party_platform",
      resultStatus: "COMPLETED",
    });
  }

  async updateMyThirdPartyPlatformSecret(
    headers: HeadersMap,
    options?: {
      platformId?: string;
      apiKey?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.thirdPartyPlatforms", "edit", auth);

    const platformId = String(options?.platformId || "").trim();
    const apiKey = String(options?.apiKey || "").trim();
    if (!platformId) {
      throw new BadRequestException("请提供 platformId");
    }
    if (!apiKey) {
      throw new BadRequestException("请提供 apiKey");
    }

    const updated = await this.thirdPartyPlatformsService.updateBrandPlatformSecret(brandId, platformId, { apiKey });
    return this.buildSummaryResponse({
      title: "第三方接口密钥已更新",
      summary: `已更新平台“${updated.name}”的品牌级 API Key，后续该品牌下相关功能会优先使用最新密钥。`,
      highlights: [
        `平台：${updated.name}`,
        `当前遮罩：${updated.effectiveApiKeyMasked || "已更新"}`,
      ],
      data: {
        platform: {
          id: updated.id,
          name: updated.name,
          providerType: updated.providerType,
          status: updated.status,
          baseUrl: updated.baseUrl,
          effectiveApiKeyMasked: updated.effectiveApiKeyMasked,
          dynamicStats: updated.dynamicStats,
        },
      },
      links: [{ label: "打开第三方接口配置", url: "/personal-center/third-party-platforms" }],
      resourceKind: "third_party_platform",
      resultStatus: "COMPLETED",
      nextActions: [
        { label: "打开第三方接口配置", action: "open_page", target: "/personal-center/third-party-platforms" },
      ],
    });
  }

  async listMyOrders(
    headers: HeadersMap,
    options?: {
      status?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const orders = await this.ordersService.listOrders(auth);
    const normalizedStatus = this.normalizeOptionalString(options?.status)?.toUpperCase();
    const filtered = orders
      .filter((item) => (!normalizedStatus ? true : String(item.orderStatus || "").toUpperCase() === normalizedStatus))
      .slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "个人订单摘要",
      summary: filtered.length
        ? `当前共返回 ${filtered.length} 条订单记录。`
        : normalizedStatus
          ? `当前没有状态为 ${normalizedStatus} 的订单。`
          : "当前没有订单记录。",
      highlights: filtered.length
        ? filtered.slice(0, 5).map((item) => `${item.orderNo}｜${item.orderType}｜${item.orderStatus}`)
        : ["订单数：0"],
      data: {
        total: filtered.length,
        status: normalizedStatus || undefined,
        items: filtered.map((item) => ({
          id: item.id,
          orderNo: item.orderNo,
          orderType: item.orderType,
          orderStatus: item.orderStatus,
          amountYuan: item.amountYuan,
          membership: item.membership,
          pointsAmount: item.pointsAmount,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          paidAt: item.paidAt,
        })),
      },
      links: [{ label: "打开订单中心", url: "/personal-center/orders" }],
      resourceKind: "order",
    });
  }

  async getPersonalCenterOverview(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const me = await this.authService.getMe(auth);
    const orders = await this.ordersService.listOrders(auth);
    const tasks = await this.loadTasks(auth);
    const pendingInvites = await this.brandsService.listMyPendingBrandInvites(auth.userId);

    const runningTasks = tasks.filter((item) => ["RUNNING", "QUEUED"].includes(String(item.taskStatus || "").toUpperCase()));
    const currentBrand = me.brands.find((item) => item.id === me.currentBrandId) ?? me.brands[0];
    const latestOrder = [...orders].sort((left, right) => this.getTimestamp(right.updatedAt || right.createdAt) - this.getTimestamp(left.updatedAt || left.createdAt))[0];
    const latestTask = [...tasks].sort((left, right) => this.getTimestamp(right.createdAt) - this.getTimestamp(left.createdAt))[0];

    return this.buildSummaryResponse({
      title: "个人中心总览",
      summary: currentBrand
        ? `当前账号正在品牌“${currentBrand.brandName}”下工作，可访问 ${me.brands.length} 个品牌，当前有 ${runningTasks.length} 个进行中任务和 ${pendingInvites.items.length} 条待处理邀请。`
        : `当前账号可访问 ${me.brands.length} 个品牌，当前有 ${runningTasks.length} 个进行中任务和 ${pendingInvites.items.length} 条待处理邀请。`,
      highlights: [
        `当前品牌：${currentBrand?.brandName || "未绑定品牌"}`,
        `可访问品牌：${me.brands.length}`,
        `待处理邀请：${pendingInvites.items.length}`,
        `进行中任务：${runningTasks.length}`,
        `订单数：${orders.length}`,
      ],
      data: {
        currentBrand: currentBrand
          ? {
              id: currentBrand.id,
              brandName: currentBrand.brandName,
              role: currentBrand.role,
            }
          : undefined,
        brands: me.brands.map((item) => ({
          id: item.id,
          brandName: item.brandName,
          role: item.role,
        })),
        counts: {
          brands: me.brands.length,
          pendingInvites: pendingInvites.items.length,
          runningTasks: runningTasks.length,
          orders: orders.length,
        },
        latestTask: latestTask
          ? {
              id: latestTask.id,
              title: latestTask.taskTitle,
              status: latestTask.taskStatus,
              createdAt: latestTask.createdAt,
            }
          : undefined,
        latestOrder: latestOrder
          ? {
              id: latestOrder.id,
              orderNo: latestOrder.orderNo,
              orderType: latestOrder.orderType,
              orderStatus: latestOrder.orderStatus,
              updatedAt: latestOrder.updatedAt,
            }
          : undefined,
      },
      links: [{ label: "打开个人中心", url: "/personal-center" }],
      resourceKind: "personal_center",
    });
  }

  async listBrandMembers(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.team", "view", auth);

    const members = await this.brandsService.listBrandMembers(brandId, auth.userId);
    return this.buildSummaryResponse({
      title: "品牌成员列表",
      summary: members.items.length
        ? `当前品牌“${members.brandName}”共有 ${members.items.length} 位成员，当前账号角色为 ${members.currentUserRole}。`
        : `当前品牌“${members.brandName}”还没有成员记录。`,
      highlights: members.items.length
        ? members.items.slice(0, 5).map((item) => `${item.nickname || item.mobile || item.email}｜${item.role}｜${item.status}`)
        : ["成员数：0"],
      data: members,
      links: [{ label: "打开团队协作", url: "/personal-center/team" }],
      resourceKind: "brand_team",
    });
  }

  async listBrandInvites(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.team", "view", auth);

    const invites = await this.brandsService.listBrandInvites(brandId, auth.userId);
    return this.buildSummaryResponse({
      title: "品牌邀请列表",
      summary: invites.items.length
        ? `当前品牌“${invites.brandName}”共有 ${invites.items.length} 条邀请记录。`
        : `当前品牌“${invites.brandName}”还没有邀请记录。`,
      highlights: invites.items.length
        ? invites.items.slice(0, 5).map((item) => `${item.role}｜${item.status}｜${item.inviteCode}`)
        : ["邀请数：0"],
      data: invites,
      links: [{ label: "打开团队协作", url: "/personal-center/team" }],
      resourceKind: "brand_invite",
    });
  }

  async createBrandInviteLink(
    headers: HeadersMap,
    options?: {
      role?: string;
      note?: string;
      expiresInDays?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.team", "edit", auth);
    const normalizedRole = this.normalizeOptionalString(options?.role)?.toUpperCase();
    const role = normalizedRole === "ADMIN" || normalizedRole === "STAFF" || normalizedRole === "TALENT"
      ? normalizedRole
      : undefined;

    const invites = await this.brandsService.createBrandInvite(
      brandId,
      {
        role,
        note: this.normalizeOptionalString(options?.note) || undefined,
        expiresInDays: typeof options?.expiresInDays === "number" ? options.expiresInDays : undefined,
      },
      auth.userId,
    ) as BrandInviteListRecord;
    const latest = invites.items[0];

    return this.buildSummaryResponse({
      title: "品牌邀请链接已创建",
      summary: latest
        ? `已为当前品牌创建 ${latest.role} 角色邀请，邀请码为 ${latest.inviteCode}。`
        : "已为当前品牌创建新的邀请链接。",
      highlights: latest
        ? [
            `邀请码：${latest.inviteCode}`,
            `角色：${latest.role}`,
            `状态：${latest.status}`,
            latest.expiresAt ? `过期时间：${latest.expiresAt}` : "过期时间：按系统默认",
          ]
        : ["邀请已创建"],
      data: {
        brandId: invites.brandId,
        brandName: invites.brandName,
        latestInvite: latest,
      },
      links: [{ label: "打开团队协作", url: "/personal-center/team" }],
      resourceKind: "brand_invite",
      resultStatus: "COMPLETED",
    });
  }

  async revokeBrandInvite(
    headers: HeadersMap,
    options?: {
      inviteId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.team", "edit", auth);

    const inviteId = String(options?.inviteId || "").trim();
    if (!inviteId) {
      throw new BadRequestException("请提供 inviteId");
    }
    const invites = await this.brandsService.revokeBrandInvite(brandId, inviteId, auth.userId) as BrandInviteListRecord;
    const revoked = invites.items.find((item) => item.id === inviteId);

    return this.buildSummaryResponse({
      title: "品牌邀请已撤回",
      summary: revoked ? `已撤回邀请码 ${revoked.inviteCode}。` : "已撤回指定品牌邀请。",
      highlights: revoked
        ? [`角色：${revoked.role}`, `状态：${revoked.status}`, `邀请码：${revoked.inviteCode}`]
        : ["邀请已撤回"],
      data: {
        brandId: invites.brandId,
        brandName: invites.brandName,
        invite: revoked,
      },
      links: [{ label: "打开团队协作", url: "/personal-center/team" }],
      resourceKind: "brand_invite",
      resultStatus: "COMPLETED",
    });
  }

  async getBrandPermissionSettings(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.team", "view", auth);

    const settings = await this.brandsService.getBrandPermissionSettings(brandId, auth.userId);
    return this.buildSummaryResponse({
      title: "品牌权限模板",
      summary: `当前品牌“${settings.brandName}”的团队权限模板已加载，当前账号角色为 ${settings.currentUserRole}。`,
      highlights: [
        `当前角色：${settings.currentUserRole}`,
        `可管理成员：${settings.canManageMembers ? "是" : "否"}`,
        `可管理权限：${settings.canManagePermissions ? "是" : "否"}`,
        `权限分组数：${settings.permissionTree.length}`,
      ],
      data: settings,
      links: [{ label: "打开团队协作", url: "/personal-center/team" }],
      resourceKind: "brand_permission",
    });
  }

  async listMyBrandInvites(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const invites = await this.brandsService.listMyPendingBrandInvites(auth.userId);

    return this.buildSummaryResponse({
      title: "我的待处理品牌邀请",
      summary: invites.items.length ? `当前账号还有 ${invites.items.length} 条待处理品牌邀请。` : "当前账号没有待处理品牌邀请。",
      highlights: invites.items.length
        ? invites.items.slice(0, 5).map((item) => `${item.brandName}｜${item.role}｜${item.status}`)
        : ["待处理邀请：0"],
      data: invites,
      links: [{ label: "打开邀请通知", url: "/personal-center/invites" }],
      resourceKind: "brand_invite",
    });
  }

  async listMyBrandInviteNotifications(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const notifications = await this.brandsService.listMyBrandInviteNotifications(auth.userId);

    return this.buildSummaryResponse({
      title: "品牌邀请通知中心",
      summary: notifications.items.length
        ? `当前账号共有 ${notifications.items.length} 条邀请通知，其中 ${notifications.unreadCount} 条未读。`
        : "当前账号还没有邀请通知。",
      highlights: notifications.items.length
        ? notifications.items.slice(0, 5).map((item) => `${item.brandName}｜${item.title}${item.readAt ? "｜已读" : "｜未读"}`)
        : ["邀请通知：0"],
      data: notifications,
      links: [{ label: "打开邀请通知", url: "/personal-center/invites" }],
      resourceKind: "brand_invite_notification",
    });
  }

  async acceptMyBrandInvite(
    headers: HeadersMap,
    options?: {
      inviteId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const inviteId = String(options?.inviteId || "").trim();
    if (!inviteId) {
      throw new BadRequestException("请提供 inviteId");
    }

    const accepted = await this.brandsService.acceptBrandInvite(inviteId, auth.userId);
    return this.buildSummaryResponse({
      title: "品牌邀请已接受",
      summary: accepted?.brandName ? `已加入品牌“${accepted.brandName}”。` : "已接受该品牌邀请。",
      highlights: accepted
        ? [
            `品牌：${accepted.brandName || accepted.brandId}`,
            "状态：已接受",
          ]
        : ["邀请已接受"],
      data: accepted,
      links: [{ label: "打开团队协作", url: "/personal-center/team" }],
      resourceKind: "brand_invite",
      resultStatus: "COMPLETED",
    });
  }

  async getRecentTasksSummary(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      taskTypes?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const tasks = await this.loadTasks(auth);
    const filteredTasks = this.filterTasks(tasks, brandId, options?.timeRange, options?.taskTypes);
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((item) => item.taskStatus === "SUCCESS").length;
    const running = filteredTasks.filter((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED").length;
    const failed = filteredTasks.filter((item) => item.taskStatus === "FAILED").length;
    const topTaskTypes = this.buildTopCounts(filteredTasks.map((item) => item.taskType), 3);
    const topFailedTaskTypes = this.buildTopCounts(
      filteredTasks.filter((item) => item.taskStatus === "FAILED").map((item) => item.taskType),
      3,
    );
    const resolvedTimeRange = this.normalizeTimeRange(options?.timeRange);

    return this.buildSummaryResponse({
      title: `最近 ${resolvedTimeRange.label}任务摘要`,
      summary: `最近 ${resolvedTimeRange.label}共有 ${total} 个任务，${completed} 个已完成，${running} 个进行中，${failed} 个失败。`,
      highlights: [
        topTaskTypes.length ? `高频任务类型：${topTaskTypes.map((item) => `${item.label}(${item.count})`).join("、")}` : "最近暂无任务记录",
        failed ? `失败任务主要集中在：${topFailedTaskTypes.map((item) => `${item.label}(${item.count})`).join("、")}` : "最近没有失败任务",
      ],
      data: {
        counts: {
          total,
          completed,
          running,
          failed,
        },
        topTaskTypes,
        topFailedTaskTypes,
        recentTasks: filteredTasks.slice(0, 5).map((item) => ({
          id: item.id,
          taskType: item.taskType,
          taskTitle: item.taskTitle,
          taskStatus: item.taskStatus,
          createdAt: item.createdAt,
        })),
      },
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async getTaskDetail(
    headers: HeadersMap,
    options?: {
      taskId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const task = await this.findTaskById(auth, taskId);
    return this.buildSummaryResponse({
      title: "任务详情",
      summary: `任务“${task.taskTitle || task.id}”当前状态为 ${this.formatTaskStatus(task.taskStatus)}。`,
      highlights: [
        `任务类型：${task.taskType}`,
        `任务状态：${this.formatTaskStatus(task.taskStatus)}`,
        task.errorMessage ? `失败原因：${this.normalizeFailureReason(task.errorMessage)}` : "失败原因：无",
      ],
      data: task,
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async cancelTask(
    headers: HeadersMap,
    options?: {
      taskId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const task = await this.tasksService.cancelTask(taskId, auth) as Record<string, unknown>;
    return this.buildSummaryResponse({
      title: "任务已取消",
      summary: `已取消任务 ${taskId}。`,
      highlights: [
        `任务状态：${this.formatTaskStatus(this.readStringField(task, "taskStatus"))}`,
        `任务类型：${this.readStringField(task, "taskType") || "未知"}`,
      ],
      data: task,
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async retryTask(
    headers: HeadersMap,
    options?: {
      taskId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const task = await this.tasksService.retryTask(taskId, auth) as Record<string, unknown>;
    return this.buildSummaryResponse({
      title: "任务已重新排队",
      summary: `已将任务 ${taskId} 重新放回排队。`,
      highlights: [
        `任务状态：${this.formatTaskStatus(this.readStringField(task, "taskStatus"))}`,
        `任务类型：${this.readStringField(task, "taskType") || "未知"}`,
      ],
      data: task,
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async getFailedTasksSummary(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      taskTypes?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const tasks = await this.loadTasks(auth);
    const failedTasks = this
      .filterTasks(tasks, brandId, options?.timeRange, options?.taskTypes)
      .filter((item) => item.taskStatus === "FAILED");
    const resolvedTimeRange = this.normalizeTimeRange(options?.timeRange);
    const topReasons = this.buildTopCounts(
      failedTasks.map((item) => this.normalizeFailureReason(item.errorMessage)),
      3,
    );

    return this.buildSummaryResponse({
      title: `最近 ${resolvedTimeRange.label}失败任务摘要`,
      summary: failedTasks.length
        ? `最近 ${resolvedTimeRange.label}失败任务主要集中在 ${topReasons.map((item) => item.label).join("、")} 等问题。`
        : `最近 ${resolvedTimeRange.label}没有失败任务。`,
      highlights: failedTasks.length
        ? topReasons.map((item) => `${item.label}：${item.count} 次`)
        : ["失败任务数：0"],
      data: {
        failedCount: failedTasks.length,
        topReasons,
        items: failedTasks.slice(0, 10).map((item) => ({
          id: item.id,
          taskType: item.taskType,
          taskTitle: item.taskTitle,
          errorMessage: item.errorMessage ?? "未记录失败原因",
          createdAt: item.createdAt,
        })),
      },
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async getRecentKnowledgeFiles(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      knowledgeBaseId?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "view", auth);

    const knowledgeBases = await this.brandsService.listBusinessKnowledgeBases(brandId);
    const scopedKnowledgeBases = options?.knowledgeBaseId
      ? knowledgeBases.filter((item) => item.id === options.knowledgeBaseId)
      : knowledgeBases;
    const resolvedTimeRange = this.normalizeTimeRange(options?.timeRange);
    const allFiles = await Promise.all(
      scopedKnowledgeBases.map(async (knowledgeBase) => {
        const files = await this.brandsService.listBusinessKnowledgeBaseFiles(brandId, knowledgeBase.id);
        return files.map((file) => ({
          ...file,
          knowledgeBaseId: knowledgeBase.id,
          knowledgeBaseName: knowledgeBase.name,
        }));
      }),
    );
    const mergedFiles = allFiles
      .flat()
      .filter((item) => this.isAfterTimeRange(item.uploadedAt, resolvedTimeRange.since))
      .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime());
    const limit = this.normalizeLimit(options?.limit);
    const limitedFiles = mergedFiles.slice(0, limit);
    const completed = mergedFiles.filter((item) => item.status === "INDEXED").length;
    const syncing = mergedFiles.filter((item) => item.status === "PENDING").length;
    const failed = mergedFiles.filter((item) => item.status === "FAILED").length;

    return this.buildSummaryResponse({
      title: `最近 ${resolvedTimeRange.label}知识资料摘要`,
      summary: `最近 ${resolvedTimeRange.label}新增了 ${mergedFiles.length} 份资料，其中 ${completed} 份已完成处理，${syncing} 份处理中，${failed} 份失败。`,
      highlights: [
        `知识库数量：${scopedKnowledgeBases.length}`,
        mergedFiles.length ? `最近资料：${limitedFiles.map((item) => item.title).slice(0, 3).join("、")}` : "最近没有新增资料",
      ],
      data: {
        knowledgeBaseCount: scopedKnowledgeBases.length,
        counts: {
          total: mergedFiles.length,
          completed,
          syncing,
          failed,
        },
        items: limitedFiles.map((item) => ({
          id: item.id,
          title: item.title,
          knowledgeBaseId: item.knowledgeBaseId,
          knowledgeBaseName: item.knowledgeBaseName,
          status: item.status,
          chunkCount: item.chunkCount,
          uploadedAt: item.uploadedAt,
          updatedAt: item.updatedAt,
        })),
      },
      links: [{ label: "打开知识库", url: "/brand-growth/business-assets" }],
    });
  }

  async getSkillConfigSummary(
    headers: HeadersMap,
    options?: {
      skillKey?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const skills = await this.userSkillsService.listUserSkills({ ...auth, brandId });
    const normalizedSkillKey = String(options?.skillKey || "").trim().toLowerCase();
    const matchedSkills = normalizedSkillKey
      ? skills.filter((item) => this.matchesSkillKey(item, normalizedSkillKey))
      : skills;
    const customizedCount = matchedSkills.filter((item) => item.isCustomized).length;

    if (normalizedSkillKey && !matchedSkills.length) {
      return this.buildSummaryResponse({
        title: "技能配置摘要",
        summary: `当前品牌下没有找到与“${options?.skillKey}”匹配的技能配置。`,
        highlights: [`当前品牌技能数：${skills.length}`],
        data: {
          total: skills.length,
          matched: 0,
          items: [],
        },
        links: [{ label: "打开技能中心", url: "/skills" }],
      });
    }

    const items = matchedSkills.slice(0, 10).map((item) => ({
      id: item.id,
      name: item.effectiveSkill.name,
      slug: item.baseSkill.slug,
      category: item.effectiveSkill.category,
      status: item.effectiveSkill.status,
      provider: item.effectiveSkill.provider,
      defaultModel: item.effectiveSkill.defaultModel,
      isCustomized: item.isCustomized,
      lastResetAt: item.lastResetAt,
      promptCount: item.prompts.length,
    }));

    return this.buildSummaryResponse({
      title: "技能配置摘要",
      summary: normalizedSkillKey
        ? `${items[0]?.name || options?.skillKey} 当前${items[0]?.status === "ACTIVE" ? "已启用" : "未启用"}，${items[0]?.isCustomized ? "存在品牌级定制" : "沿用平台基线配置"}。`
        : `当前品牌共关联 ${matchedSkills.length} 个技能，其中 ${customizedCount} 个存在品牌级定制。`,
      highlights: items.length
        ? items.slice(0, 3).map((item) => `${item.name}：${item.isCustomized ? "已定制" : "基线配置"} / ${item.status}`)
        : ["暂无可用技能配置"],
      data: {
        total: matchedSkills.length,
        customizedCount,
        items,
      },
      links: [{ label: "打开技能中心", url: "/skills" }],
    });
  }

  async getSkillConfigDetail(
    headers: HeadersMap,
    options?: {
      skillId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const skillId = String(options?.skillId || "").trim();
    if (!skillId) {
      throw new BadRequestException("请提供 skillId");
    }

    const skill = await this.userSkillsService.getUserSkill(skillId, { ...auth, brandId });
    return this.buildSummaryResponse({
      title: `${skill.effectiveSkill.name} 技能配置详情`,
      summary: `${skill.effectiveSkill.name} 当前${skill.isCustomized ? "存在品牌级定制" : "沿用平台基线"}，共关联 ${skill.prompts.length} 条提示词。`,
      highlights: [
        `默认模型：${skill.effectiveSkill.defaultModel || "未设置"}`,
        `描述：${skill.effectiveSkill.description || "未设置"}`,
        `最近重置：${skill.lastResetAt || "暂无"}`,
        ...skill.prompts.slice(0, 3).map((item) =>
          `${item.effectivePrompt.name}：${item.isCustomized ? "已覆盖" : "基线"} / ${item.effectivePrompt.modelName}`),
      ],
      data: skill,
      links: [{ label: "打开技能中心", url: "/skills" }],
      resourceKind: "skill_config",
    });
  }

  async updateSkillConfig(
    headers: HeadersMap,
    options?: {
      skillId?: string;
      displayName?: string;
      defaultModel?: string;
      description?: string;
      promptOverrides?: Array<{
        promptId: string;
        content?: string;
        modelName?: string;
        temperature?: number;
        maxTokens?: number;
      }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAdminAccess(brandId, auth);

    const skillId = String(options?.skillId || "").trim();
    if (!skillId) {
      throw new BadRequestException("请提供 skillId");
    }

    const skill = await this.userSkillsService.updateUserSkill(
      skillId,
      {
        displayName: this.normalizeSafeInstruction(options?.displayName, "技能名称", true),
        defaultModel: this.normalizeOptionalString(options?.defaultModel),
        description: this.normalizeSafeInstruction(options?.description, "技能说明", true),
        promptOverrides: (options?.promptOverrides || [])
          .map((item) => ({
            promptId: String(item.promptId || "").trim(),
            content: this.normalizeSafeInstruction(item.content, `提示词 ${String(item.promptId || "").trim() || ""} 覆盖内容`, true),
            modelName: this.normalizeOptionalString(item.modelName),
            temperature: typeof item.temperature === "number" ? item.temperature : null,
            maxTokens: typeof item.maxTokens === "number" ? item.maxTokens : null,
          }))
          .filter((item) => item.promptId),
      },
      { ...auth, brandId },
    );

    return this.buildSummaryResponse({
      title: `${skill.effectiveSkill.name} 技能配置已更新`,
      summary: "品牌级技能配置与提示词覆盖已保存，后续网页生成会直接使用新的有效配置。",
      highlights: [
        `技能名称：${skill.effectiveSkill.name}`,
        `默认模型：${skill.effectiveSkill.defaultModel || "未设置"}`,
        `品牌定制：${skill.isCustomized ? "已启用" : "未启用"}`,
        `提示词数：${skill.prompts.length}`,
      ],
      data: skill,
      links: [{ label: "打开技能中心", url: "/skills" }],
      resultStatus: "COMPLETED",
      resourceKind: "skill_config",
      nextActions: [
        { label: "打开技能中心复核", action: "open_page", target: "/skills" },
        { label: "继续在对话中生成内容", action: "continue_in_chat", target: skill.id },
      ],
    });
  }

  async resetSkillToPlatformBaseline(
    headers: HeadersMap,
    options?: {
      skillId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAdminAccess(brandId, auth);

    const skillId = String(options?.skillId || "").trim();
    if (!skillId) {
      throw new BadRequestException("请提供 skillId");
    }

    const skill = await this.userSkillsService.resetUserSkill(skillId, { ...auth, brandId });
    return this.buildSummaryResponse({
      title: `${skill.effectiveSkill.name} 已恢复平台基线`,
      summary: "品牌级技能覆盖和提示词覆盖已清空，后续网页生成会重新使用平台默认配置。",
      highlights: [
        `技能名称：${skill.effectiveSkill.name}`,
        `默认模型：${skill.effectiveSkill.defaultModel || "未设置"}`,
        `品牌定制：${skill.isCustomized ? "仍有定制" : "已恢复基线"}`,
        `最近重置：${skill.lastResetAt || "刚刚完成"}`,
      ],
      data: skill,
      links: [{ label: "打开技能中心", url: "/skills" }],
      resultStatus: "COMPLETED",
      resourceKind: "skill_config",
      nextActions: [
        { label: "打开技能中心复核", action: "open_page", target: "/skills" },
        { label: "继续在对话中生成内容", action: "continue_in_chat", target: skill.id },
      ],
    });
  }

  async submitTaskResultFeedback(
    headers: HeadersMap,
    options?: {
      taskId?: string;
      rating?: string;
      adopted?: boolean;
      comment?: string;
      feedbackTags?: string[];
      skillId?: string;
      promptId?: string;
      promptVersion?: string;
      workId?: string;
      editedOutput?: Record<string, unknown>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const feedback = await this.feedbackService.submitTaskFeedback(taskId, {
      rating: String(options?.rating || "").trim(),
      adopted: typeof options?.adopted === "boolean" ? options.adopted : null,
      comment: this.normalizeOptionalString(options?.comment),
      feedbackTags: Array.isArray(options?.feedbackTags)
        ? options?.feedbackTags.map((item) => String(item || "").trim()).filter(Boolean)
        : [],
      skillId: this.normalizeOptionalString(options?.skillId),
      promptId: this.normalizeOptionalString(options?.promptId),
      promptVersion: this.normalizeOptionalString(options?.promptVersion),
      workId: this.normalizeOptionalString(options?.workId),
      editedOutput: options?.editedOutput && typeof options.editedOutput === "object" && !Array.isArray(options.editedOutput)
        ? options.editedOutput
        : null,
    }, auth);

    return this.buildSummaryResponse({
      title: "任务结果反馈已记录",
      summary: `已为任务 ${taskId} 记录结果反馈，后续可用于技能与提示词优化分析。`,
      highlights: [
        `反馈评级：${feedback.rating}`,
        `是否采纳：${feedback.adopted === true ? "已采纳" : feedback.adopted === false ? "未采纳" : "未说明"}`,
        feedback.feedbackTags.length ? `问题标签：${feedback.feedbackTags.join("、")}` : "问题标签：未填写",
        feedback.comment ? `反馈备注：${feedback.comment}` : "反馈备注：未填写",
      ],
      data: feedback,
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
      resultStatus: "COMPLETED",
      resourceKind: "feedback",
      nextActions: [
        { label: "查看反馈摘要", action: "continue_in_chat", target: "feedback_summary" },
      ],
    });
  }

  async getFeedbackSummary(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      skillId?: string;
      promptId?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const summary = await this.feedbackService.getFeedbackSummary({ ...auth, brandId }, {
      timeRange: options?.timeRange,
      skillId: this.normalizeOptionalString(options?.skillId) ?? undefined,
      promptId: this.normalizeOptionalString(options?.promptId) ?? undefined,
      limit: options?.limit,
    });

    return this.buildSummaryResponse({
      title: "生成结果反馈摘要",
      summary: summary.counts.total
        ? `最近 ${summary.timeRange} 共记录 ${summary.counts.total} 条反馈，其中正向 ${summary.counts.positive} 条，负向 ${summary.counts.negative} 条。`
        : `最近 ${summary.timeRange} 还没有生成结果反馈。`,
      highlights: summary.counts.total
        ? [
            `正向反馈：${summary.counts.positive}`,
            `中性反馈：${summary.counts.neutral}`,
            `负向反馈：${summary.counts.negative}`,
            summary.topTags.length
              ? `高频标签：${summary.topTags.map((item) => `${item.tag}(${item.count})`).join("、")}`
              : "高频标签：暂无",
          ]
        : ["反馈数：0"],
      data: summary,
      links: [{ label: "打开技能中心", url: "/skills" }],
      resourceKind: "feedback",
    });
  }

  async getFeedbackAnalysis(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      skillId?: string;
      promptId?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const analysis = await this.feedbackService.getFeedbackAnalysis({ ...auth, brandId }, {
      timeRange: options?.timeRange,
      skillId: this.normalizeOptionalString(options?.skillId) ?? undefined,
      promptId: this.normalizeOptionalString(options?.promptId) ?? undefined,
      limit: options?.limit,
    });

    return this.buildSummaryResponse({
      title: "生成结果反馈分析",
      summary: analysis.counts.total
        ? `最近 ${analysis.timeRange} 已形成 ${analysis.issuePatterns.length} 类高频问题画像，可用于下一步优化技能和提示词。`
        : `最近 ${analysis.timeRange} 还没有足够的反馈样本可供分析。`,
      highlights: analysis.counts.total
        ? [
            `总反馈：${analysis.counts.total}`,
            `负向反馈：${analysis.counts.negative}`,
            analysis.issuePatterns.length
              ? `高频问题：${analysis.issuePatterns.map((item) => `${item.tag}(${item.count})`).join("、")}`
              : "高频问题：暂无",
            analysis.topNegativeTaskTypes.length
              ? `负向任务类型：${analysis.topNegativeTaskTypes.map((item) => `${item.taskType}(${item.count})`).join("、")}`
              : "负向任务类型：暂无",
          ]
        : ["反馈样本不足"],
      data: analysis,
      links: [{ label: "打开技能中心", url: "/skills" }],
      resourceKind: "feedback",
    });
  }

  async getPromptOptimizationSuggestions(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      skillId?: string;
      promptId?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const result = await this.feedbackService.getPromptOptimizationSuggestions({ ...auth, brandId }, {
      timeRange: options?.timeRange,
      skillId: this.normalizeOptionalString(options?.skillId) ?? undefined,
      promptId: this.normalizeOptionalString(options?.promptId) ?? undefined,
      limit: options?.limit,
    });

    return this.buildSummaryResponse({
      title: "提示词优化建议",
      summary: result.suggestions.length
        ? `最近 ${result.timeRange} 已生成 ${result.suggestions.length} 条最小优化建议，可作为下一轮提示词升级输入。`
        : `最近 ${result.timeRange} 暂无可执行的提示词优化建议。`,
      highlights: result.suggestions.length
        ? result.suggestions.slice(0, 4).map((item) => `${item.priority}｜${item.title}`)
        : ["建议数：0"],
      data: result,
      links: [{ label: "打开技能中心", url: "/skills" }],
      resourceKind: "feedback",
      nextActions: result.suggestions.length
        ? [
            { label: "查看技能配置详情", action: "open_page", target: "/skills" },
            { label: "继续在对话中调整技能", action: "continue_in_chat", target: "skill_config" },
          ]
        : undefined,
    });
  }

  async getWechatArticleDrafts(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const drafts = await this.worksService.listWechatArticleDrafts(brandId);
    const items = drafts.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "公众号文章草稿",
      summary: items.length
        ? `当前品牌最近共有 ${drafts.items.length} 篇公众号草稿，下面返回最新 ${items.length} 篇。`
        : "当前品牌还没有公众号文章草稿。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.publishStatus || item.taskStatus || "待处理"}`)
        : ["草稿数：0"],
      data: {
        total: drafts.items.length,
        items,
      },
      links: [{ label: "打开公众号结果", url: "/wechat" }],
    });
  }

  async getWechatOfficialAccounts(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const accounts = await this.worksService.listWechatOfficialAccounts(brandId);
    return this.buildSummaryResponse({
      title: "公众号账号列表",
      summary: accounts.items.length
        ? `当前品牌已配置 ${accounts.items.length} 个公众号账号，可用于正式发布。`
        : "当前品牌还没有配置公众号账号。",
      highlights: accounts.items.length
        ? accounts.items.slice(0, 5).map((item) => `${item.accountName}｜${item.isDefault ? "默认账号" : "可选账号"}`)
        : ["公众号账号数：0"],
      data: accounts,
      links: [{ label: "打开公众号配置", url: "/wechat" }],
    });
  }

  async getWechatWorkflowSessions(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const sessions = await this.worksService.listWechatWorkflowSessions(brandId);
    const items = sessions.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "公众号工作流会话",
      summary: items.length
        ? `当前品牌最近共有 ${sessions.items.length} 个公众号工作流会话，下面返回最新 ${items.length} 个。`
        : "当前品牌还没有公众号工作流会话。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.status}`)
        : ["工作流会话数：0"],
      data: {
        total: sessions.items.length,
        items,
      },
      links: [{ label: "打开公众号工作流", url: "/wechat" }],
    });
  }

  async getWechatPublishHistory(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const history = await this.worksService.listWechatPublishHistory(brandId);
    const items = history.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "公众号发布历史",
      summary: items.length
        ? `当前品牌最近共有 ${history.items.length} 条公众号发布历史，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有公众号发布历史。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.workflowTitle}｜${item.status}`)
        : ["发布历史数：0"],
      data: {
        total: history.items.length,
        items,
      },
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async getWechatWorkflowPreferences(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const preference = await this.worksService.getWechatWorkflowPreferences(brandId);
    return this.buildSummaryResponse({
      title: "公众号工作流偏好",
      summary: preference.item.initialized
        ? "当前品牌已完成公众号工作流基础偏好配置。"
        : "当前品牌尚未完成公众号工作流基础偏好配置。",
      highlights: [
        `默认作者：${preference.item.defaultAuthor || "未设置"}`,
        `默认主题色：${preference.item.defaultThemeColor || "未设置"}`,
        `默认输入方式：${preference.item.defaultInputType || "未设置"}`,
      ],
      data: preference,
      links: [{ label: "打开公众号配置", url: "/wechat" }],
    });
  }

  async getWechatWorkflowSessionDetail(
    headers: HeadersMap,
    options?: {
      workflowId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const workflowId = String(options?.workflowId || "").trim();
    if (!workflowId) {
      throw new BadRequestException("请提供 workflowId");
    }

    const session = await this.worksService.getWechatWorkflowSession(brandId, workflowId);
    return this.buildSummaryResponse({
      title: "公众号工作流详情",
      summary: `公众号工作流“${session.item.title}”当前状态为 ${session.item.status}。`,
      highlights: [
        `当前步骤：${session.item.currentStep}`,
        `发布就绪：${session.item.publishConfig?.ready ? "是" : "否"}`,
        `账号：${session.item.accountName || "未指定"}`,
      ],
      data: session,
      links: [{ label: "打开公众号工作流", url: "/wechat" }],
    });
  }

  async checkWechatWorkflowPublishReadiness(
    headers: HeadersMap,
    options?: {
      workflowId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const workflowId = String(options?.workflowId || "").trim();
    if (!workflowId) {
      throw new BadRequestException("请提供 workflowId");
    }

    const session = await this.worksService.updateWechatWorkflowPublishConfirm(brandId, workflowId, {});
    return this.buildSummaryResponse({
      title: "公众号发布确认结果",
      summary: session.item.publishConfig?.ready
        ? `公众号工作流 ${workflowId} 已具备正式发布条件。`
        : `公众号工作流 ${workflowId} 还未具备正式发布条件。`,
      highlights: session.item.publishConfig?.checklist?.length
        ? session.item.publishConfig.checklist
        : ["暂无发布检查项"],
      data: session,
      links: [{ label: "打开公众号工作流", url: "/wechat" }],
    });
  }

  async getWechatPublishHistoryDetail(
    headers: HeadersMap,
    options?: {
      historyId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const historyId = String(options?.historyId || "").trim();
    if (!historyId) {
      throw new BadRequestException("请提供 historyId");
    }

    const history = await this.worksService.getWechatPublishHistoryItem(brandId, historyId);
    return this.buildSummaryResponse({
      title: "公众号发布历史详情",
      summary: `发布记录“${history.item.workflowTitle}”当前状态为 ${history.item.status}。`,
      highlights: [
        `工作流：${history.item.workflowTitle}`,
        `账号：${history.item.accountName || "未指定"}`,
        history.item.errorDetail ? `失败原因：${history.item.errorDetail}` : "失败原因：无",
      ],
      data: history,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async publishWechatArticle(
    headers: HeadersMap,
    options?: {
      draftId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const draftId = String(options?.draftId || "").trim();
    if (!draftId) {
      throw new BadRequestException("请提供 draftId");
    }

    const result = await this.publishingService.publishWechatArticleToOfficialAccount(brandId, draftId);
    return this.buildSummaryResponse({
      title: "公众号草稿已提交发布",
      summary: `已提交公众号草稿 ${draftId} 的正式发布。`,
      highlights: [
        `草稿：${draftId}`,
        `任务状态：${this.readNestedStringField(result as Record<string, unknown>, ["task", "taskStatus"]) || "未知"}`,
        `标题：${this.readNestedStringField(result as Record<string, unknown>, ["item", "title"]) || "未命名草稿"}`,
      ],
      data: result,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async createXiaohongshuMobileDraftSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertXiaohongshuPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createXiaohongshuMobileDraftSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const mobileUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "mobileUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在手机端打开接力页完成保存。";

    return this.buildSummaryResponse({
      title: "已创建小红书手机草稿接力",
      summary: `已为作品 ${workId} 创建手机扫码接力草稿会话，请在过期前打开接力页完成保存。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(mobileUrl ? [{ label: "打开手机接力页", url: mobileUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(mobileUrl ? [{ label: "打开手机接力页", action: "open_page" as const, target: mobileUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async createXiaohongshuDesktopDraftSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertXiaohongshuPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createXiaohongshuDesktopDraftSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const creatorUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "creatorUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在电脑端打开创作者中心并使用浏览器扩展接力。";

    return this.buildSummaryResponse({
      title: "已创建小红书电脑端草稿接力",
      summary: `已为作品 ${workId} 创建电脑端草稿接力，请在浏览器中打开创作者中心并完成自动填充。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(creatorUrl ? [{ label: "打开小红书创作者中心", url: creatorUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(creatorUrl ? [{ label: "打开创作者中心", action: "open_page" as const, target: creatorUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async getXiaohongshuMobileDraftSession(
    headers: HeadersMap,
    options?: {
      token?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const token = String(options?.token || "").trim();
    if (!token) {
      throw new BadRequestException("请提供 token");
    }

    const result = await this.publishingService.getXiaohongshuMobileDraftSession(token);
    const session = (result as Record<string, unknown>).session as Record<string, unknown>;
    const workId = this.readStringField(session, "workId");
    if (workId) {
      await this.assertXiaohongshuPublishPermission(brandId, workId, auth);
    }
    return this.buildPublishSessionSummary({
      data: result,
      platformLabel: "小红书",
      channelLabel: "手机草稿接力",
      workId,
      title: this.readStringField(session, "title"),
      accountName: this.readStringField(session, "accountName"),
      token: this.readStringField(session, "token"),
      status: this.readStringField(session, "status"),
      expiresAt: this.readStringField(session, "expiresAt"),
      completedAt: this.readStringField(session, "completedAt"),
      note: this.readStringField(session, "note"),
      accessHint: this.readStringField(session, "accessHint"),
      primaryUrl: this.readStringField(session, "mobileUrl"),
      primaryLabel: "打开手机接力页",
      fallbackPageUrl: "/personal-center/works",
    });
  }

  async getXiaohongshuDesktopDraftSession(
    headers: HeadersMap,
    options?: {
      token?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const token = String(options?.token || "").trim();
    if (!token) {
      throw new BadRequestException("请提供 token");
    }

    const result = await this.publishingService.getXiaohongshuDesktopDraftSession(token);
    const session = (result as Record<string, unknown>).session as Record<string, unknown>;
    const workId = this.readStringField(session, "workId");
    if (workId) {
      await this.assertXiaohongshuPublishPermission(brandId, workId, auth);
    }
    return this.buildPublishSessionSummary({
      data: result,
      platformLabel: "小红书",
      channelLabel: "电脑端草稿接力",
      workId,
      title: this.readStringField(session, "title"),
      accountName: this.readStringField(session, "accountName"),
      token: this.readStringField(session, "token"),
      status: this.readStringField(session, "status"),
      expiresAt: this.readStringField(session, "expiresAt"),
      completedAt: this.readStringField(session, "completedAt"),
      note: this.readStringField(session, "note"),
      accessHint: this.readStringField(session, "accessHint"),
      primaryUrl: this.readStringField(session, "creatorUrl"),
      primaryLabel: "打开小红书创作者中心",
      fallbackPageUrl: "/personal-center/works",
    });
  }

  async createDouyinMobilePublishSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertDouyinPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createDouyinMobilePublishSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const mobileUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "mobileUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在手机端打开接力页继续完成抖音发布。";

    return this.buildSummaryResponse({
      title: "已创建抖音手机发布接力",
      summary: `已为作品 ${workId} 创建手机发布接力会话，请在手机端继续完成抖音发布。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(mobileUrl ? [{ label: "打开手机发布页", url: mobileUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(mobileUrl ? [{ label: "打开手机发布页", action: "open_page" as const, target: mobileUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async createDouyinDesktopPublishSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertDouyinPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createDouyinDesktopPublishSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const creatorUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "creatorUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在电脑端打开抖音创作者中心并使用浏览器扩展接力。";

    return this.buildSummaryResponse({
      title: "已创建抖音电脑端发布接力",
      summary: `已为作品 ${workId} 创建电脑端发布接力，请在创作者中心完成自动填充后继续发布。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(creatorUrl ? [{ label: "打开抖音创作者中心", url: creatorUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(creatorUrl ? [{ label: "打开创作者中心", action: "open_page" as const, target: creatorUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async getDouyinMobilePublishSession(
    headers: HeadersMap,
    options?: {
      token?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const token = String(options?.token || "").trim();
    if (!token) {
      throw new BadRequestException("请提供 token");
    }

    const result = await this.publishingService.getDouyinMobilePublishSession(token);
    const session = (result as Record<string, unknown>).session as Record<string, unknown>;
    const workId = this.readStringField(session, "workId");
    if (workId) {
      await this.assertDouyinPublishPermission(brandId, workId, auth);
    }
    return this.buildPublishSessionSummary({
      data: result,
      platformLabel: "抖音",
      channelLabel: "手机发布接力",
      workId,
      title: this.readStringField(session, "title"),
      accountName: this.readStringField(session, "accountName"),
      token: this.readStringField(session, "token"),
      status: this.readStringField(session, "status"),
      expiresAt: this.readStringField(session, "expiresAt"),
      completedAt: this.readStringField(session, "completedAt"),
      note: this.readStringField(session, "note"),
      accessHint: this.readStringField(session, "accessHint"),
      primaryUrl: this.readStringField(session, "mobileUrl"),
      primaryLabel: "打开手机发布页",
      fallbackPageUrl: "/personal-center/works",
    });
  }

  async getDouyinDesktopPublishSession(
    headers: HeadersMap,
    options?: {
      token?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const token = String(options?.token || "").trim();
    if (!token) {
      throw new BadRequestException("请提供 token");
    }

    const result = await this.publishingService.getDouyinDesktopPublishSession(token);
    const session = (result as Record<string, unknown>).session as Record<string, unknown>;
    const workId = this.readStringField(session, "workId");
    if (workId) {
      await this.assertDouyinPublishPermission(brandId, workId, auth);
    }
    return this.buildPublishSessionSummary({
      data: result,
      platformLabel: "抖音",
      channelLabel: "电脑端发布接力",
      workId,
      title: this.readStringField(session, "title"),
      accountName: this.readStringField(session, "accountName"),
      token: this.readStringField(session, "token"),
      status: this.readStringField(session, "status"),
      expiresAt: this.readStringField(session, "expiresAt"),
      completedAt: this.readStringField(session, "completedAt"),
      note: this.readStringField(session, "note"),
      accessHint: this.readStringField(session, "accessHint"),
      primaryUrl: this.readStringField(session, "creatorUrl"),
      primaryLabel: "打开抖音创作者中心",
      fallbackPageUrl: "/personal-center/works",
    });
  }

  async publishWechatWorkflow(
    headers: HeadersMap,
    options?: {
      workflowId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const workflowId = String(options?.workflowId || "").trim();
    if (!workflowId) {
      throw new BadRequestException("请提供 workflowId");
    }

    const result = await this.publishingService.publishWechatWorkflowToOfficialAccount(brandId, workflowId);
    return this.buildSummaryResponse({
      title: "公众号工作流已提交发布",
      summary: `已提交公众号工作流 ${workflowId} 的正式发布。`,
      highlights: [
        `工作流：${workflowId}`,
        `任务状态：${this.readNestedStringField(result as Record<string, unknown>, ["task", "taskStatus"]) || "未知"}`,
        `标题：${this.readNestedStringField(result as Record<string, unknown>, ["item", "title"]) || "未命名工作流"}`,
      ],
      data: result,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async retryWechatPublishHistory(
    headers: HeadersMap,
    options?: {
      historyId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const historyId = String(options?.historyId || "").trim();
    if (!historyId) {
      throw new BadRequestException("请提供 historyId");
    }

    const result = await this.publishingService.retryWechatWorkflowPublishToOfficialAccount(brandId, historyId);
    return this.buildSummaryResponse({
      title: "公众号发布已重试",
      summary: `已重试公众号发布历史 ${historyId}。`,
      highlights: [
        `发布历史：${historyId}`,
        `任务状态：${this.readNestedStringField(result as Record<string, unknown>, ["task", "taskStatus"]) || "未知"}`,
        `标题：${this.readNestedStringField(result as Record<string, unknown>, ["item", "title"]) || "未命名发布项"}`,
      ],
      data: result,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async getDesignWorkspaceOptions(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);

    const workspace = await this.worksService.getDesignWorkspaceOptions(brandId);
    return this.buildSummaryResponse({
      title: "设计工作台可用选项",
      summary: `当前品牌支持 ${Object.keys(workspace.moduleOptions).length} 个设计模块，可直接在对话里确认模块、设计类型、产品、营销日历和模型 selectionKey 后发起任务。`,
      highlights: [
        `营销日历选项：${workspace.calendarOptions.length}`,
        `产品选项：${workspace.productOptions.length}`,
        `推荐模块：${Object.entries(workspace.moduleOptions).map(([key, value]) => `${key}(${value.types.length})`).join("、")}`,
        `图片模型支持从 moduleOptions.image.models 里读取 selectionKey，并可直接传给 create_design_work.modelSelection`,
      ],
      data: {
        brandId: workspace.brandId,
        brandName: workspace.brandName,
        brandProfileSummary: workspace.brandProfileSummary,
        calendarOptions: workspace.calendarOptions.slice(0, 20),
        productOptions: workspace.productOptions.slice(0, 20),
        brandOptions: workspace.brandOptions,
        moduleOptions: workspace.moduleOptions,
      },
      links: [{ label: "打开设计工作台", url: "/personal-center/works" }],
    });
  }

  async getRecentDesignWorks(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);

    const history = await this.worksService.listDesignHistory(brandId);
    const items = history.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "最近设计工作台结果",
      summary: items.length
        ? `当前品牌最近共有 ${history.items.length} 条设计记录，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有设计工作台生成记录。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.module}｜${this.formatTaskStatus(item.taskStatus)}`)
        : ["设计记录数：0"],
      data: {
        total: history.items.length,
        items,
      },
      links: [{ label: "打开设计工作台", url: "/personal-center/works" }],
    });
  }

  async createDesignWork(
    headers: HeadersMap,
    options?: {
      module?: string;
      designType?: string;
      title?: string;
      calendarItemId?: string;
      productId?: string;
      injectBrandProfile?: boolean;
      referenceImage?: {
        fileName?: string;
        contentType?: string;
        dataBase64?: string;
      };
      referenceImageUrl?: string;
      modelSelection?: string;
      spec?: string;
      additionalInstruction?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);

    const module = this.normalizeDesignModule(options?.module);
    if (!module) {
      throw new BadRequestException("请提供有效的设计模块：image、html、deck、video");
    }

    const result = await this.worksService.generateDesignWork(brandId, {
      module,
      designType: String(options?.designType || "").trim() || undefined,
      title: String(options?.title || "").trim() || undefined,
      calendarItemId: String(options?.calendarItemId || "").trim() || undefined,
      productId: String(options?.productId || "").trim() || undefined,
      injectBrandProfile: typeof options?.injectBrandProfile === "boolean" ? options.injectBrandProfile : undefined,
      referenceImage: options?.referenceImage?.dataBase64
        ? {
          fileName: String(options.referenceImage.fileName || "").trim() || "reference-image",
          contentType: String(options.referenceImage.contentType || "").trim() || "application/octet-stream",
          dataBase64: String(options.referenceImage.dataBase64 || "").trim(),
        }
        : undefined,
      referenceImageUrl: String(options?.referenceImageUrl || "").trim() || undefined,
      modelSelection: String(options?.modelSelection || "").trim() || undefined,
      spec: String(options?.spec || "").trim() || undefined,
      additionalInstruction: this.normalizeSafeInstruction(options?.additionalInstruction, "设计补充要求") || undefined,
    }, auth);

    return this.buildSummaryResponse({
      title: "设计任务已受理",
      summary: `已在网站设计工作台中创建 ${module} 设计任务。`,
      highlights: [
        `模块：${module}`,
        options?.designType ? `设计类型：${options.designType}` : "设计类型：按默认技能生成",
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
        options?.referenceImage?.dataBase64 ? "参考图：已上传参考图" : (options?.referenceImageUrl ? "参考图：已提供图片链接" : "参考图：未提供"),
      ],
      data: result,
      links: [{ label: "打开设计工作台", url: "/personal-center/works" }],
    });
  }

  async getXiaohongshuMarketingCalendarOptions(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "view", auth);

    const workspace = await this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
    const latest = workspace.latest;
    const items = (latest?.items || []).slice(0, this.normalizeLimit(options?.limit)).map((item) => ({
      id: item.id,
      date: item.date,
      topicName: item.topicName,
      productName: item.productName,
      noteType: item.noteType,
      targetAudience: item.targetAudience,
      contentGoal: item.contentGoal,
      expressionFocus: item.expressionFocus,
      topicContent: item.topicContent,
      noteKeywords: item.noteKeywords,
      titleDirections: item.titleDirections,
    }));

    return this.buildSummaryResponse({
      title: "小红书营销日历选题",
      summary: latest
        ? `当前最近一期小红书营销日历共有 ${latest.items.length} 个可选选题，可直接拿 item.id 作为 calendarItemId 发起创作。`
        : "当前品牌还没有可用的小红书营销日历，请先生成营销日历。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.date}｜${item.topicName}`)
        : ["暂无可用选题"],
      data: {
        latestReportId: latest?.id,
        latestReportTitle: latest?.title,
        generatedAt: latest?.generatedAt,
        total: latest?.items.length || 0,
        items,
      },
      links: [{ label: "打开小红书工作区", url: "/xiaohongshu" }],
    });
  }

  async getDouyinOriginalCopyOptions(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "view", auth);

    const workspace = await this.reportsService.getDouyinOriginalCopyWorkspace(brandId);
    return this.buildSummaryResponse({
      title: "抖音原创文案选项",
      summary: `当前品牌可用 ${workspace.topicOptions.length} 个选题、${workspace.calendarOptions.length} 个营销日历项，可在对话中选定文案类型后直接生成。`,
      highlights: [
        `选题库：${workspace.topicOptions.length}`,
        `营销日历：${workspace.calendarOptions.length}`,
        workspace.hasMarketingPlan ? `营销策划：已配置《${workspace.marketingPlanTitle || "抖音营销策划"}》` : "营销策划：未配置",
      ],
      data: {
        copyTypes: [
          { value: "VIEWPOINT", label: "聊观点" },
          { value: "STORY", label: "讲故事" },
          { value: "PROCESS", label: "晒过程" },
          { value: "KNOWLEDGE", label: "教知识" },
          { value: "PLOT_SALES", label: "剧情带货" },
          { value: "SEEDING", label: "种草类" },
          { value: "LOCAL_SALES", label: "同城带货" },
        ],
        calendarOptions: workspace.calendarOptions.slice(0, 20),
        topicOptions: workspace.topicOptions.slice(0, 30),
        hasMarketingPlan: workspace.hasMarketingPlan,
        marketingPlanTitle: workspace.marketingPlanTitle,
        latestTask: workspace.latestTask,
      },
      links: [{ label: "打开抖音原创文案", url: "/douyin" }],
    });
  }

  async getRecentDouyinOriginalCopies(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "view", auth);

    const workspace = await this.reportsService.getDouyinOriginalCopyWorkspace(brandId);
    const items = workspace.history.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "最近抖音原创文案结果",
      summary: items.length
        ? `当前品牌最近共有 ${workspace.history.length} 条抖音原创文案结果，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有抖音原创文案结果。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.copyTypeLabel}`)
        : ["原创文案数：0"],
      data: {
        total: workspace.history.length,
        latestTask: workspace.latestTask,
        items,
      },
      links: [{ label: "打开抖音原创文案", url: "/douyin" }],
    });
  }

  async createDouyinOriginalCopy(
    headers: HeadersMap,
    options?: {
      copyType?: string;
      topicId?: string;
      calendarItemId?: string;
      injectMarketingPlan?: boolean;
      userRequirement?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "edit", auth);

    const copyType = this.normalizeDouyinOriginalCopyType(options?.copyType);
    if (!copyType) {
      throw new BadRequestException("请提供有效的抖音原创文案类型");
    }

    const workspace = await this.reportsService.generateDouyinOriginalCopy(brandId, {
      copyType,
      topicId: String(options?.topicId || "").trim() || undefined,
      calendarItemId: String(options?.calendarItemId || "").trim() || undefined,
      injectMarketingPlan: typeof options?.injectMarketingPlan === "boolean" ? options.injectMarketingPlan : false,
      userRequirement: this.normalizeSafeInstruction(options?.userRequirement, "抖音原创补充要求") || undefined,
    });

    return this.buildSummaryResponse({
      title: "抖音原创文案任务已受理",
      summary: `已为当前品牌发起 ${copyType} 类型的抖音原创文案任务。`,
      highlights: [
        `文案类型：${copyType}`,
        options?.topicId ? `选题：${options.topicId}` : "选题：未指定",
        options?.calendarItemId ? `营销日历：${options.calendarItemId}` : "营销日历：未指定",
      ],
      data: {
        latestTask: workspace.latestTask,
        latest: workspace.latest,
      },
      links: [{ label: "打开抖音原创文案", url: "/douyin" }],
    });
  }

  async getDouyinRemixCopyOptions(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "view", auth);

    const workspace = await this.reportsService.getDouyinRemixCopyWorkspace(brandId);
    return this.buildSummaryResponse({
      title: "抖音二创文案选项",
      summary: `当前品牌可用 ${workspace.materialOptions.length} 条素材和 ${workspace.productOptions.length} 个产品，可在对话中确认后直接生成抖音二创文案。`,
      highlights: [
        `素材库：${workspace.materialOptions.length}`,
        `产品选项：${workspace.productOptions.length}`,
        workspace.hasMarketingPlan ? `营销策划：已配置《${workspace.marketingPlanTitle || "抖音营销策划"}》` : "营销策划：未配置",
      ],
      data: {
        materialOptions: workspace.materialOptions.slice(0, 30),
        productOptions: workspace.productOptions.slice(0, 20),
        hasMarketingPlan: workspace.hasMarketingPlan,
        marketingPlanTitle: workspace.marketingPlanTitle,
        latestTask: workspace.latestTask,
      },
      links: [{ label: "打开抖音二创文案", url: "/douyin" }],
    });
  }

  async getRecentDouyinRemixCopies(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "view", auth);

    const workspace = await this.reportsService.getDouyinRemixCopyWorkspace(brandId);
    const items = workspace.history.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "最近抖音二创文案结果",
      summary: items.length
        ? `当前品牌最近共有 ${workspace.history.length} 条抖音二创文案结果，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有抖音二创文案结果。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.sourceMaterialTitle}`)
        : ["二创文案数：0"],
      data: {
        total: workspace.history.length,
        latestTask: workspace.latestTask,
        items,
      },
      links: [{ label: "打开抖音二创文案", url: "/douyin" }],
    });
  }

  async createDouyinRemixCopy(
    headers: HeadersMap,
    options?: {
      materialId?: string;
      injectBrandProfile?: boolean;
      productId?: string;
      injectMarketingPlan?: boolean;
      userRequirement?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "edit", auth);

    const materialId = String(options?.materialId || "").trim();
    if (!materialId) {
      throw new BadRequestException("请提供 materialId");
    }

    const workspace = await this.reportsService.generateDouyinRemixCopy(brandId, {
      materialId,
      injectBrandProfile: typeof options?.injectBrandProfile === "boolean" ? options.injectBrandProfile : false,
      productId: String(options?.productId || "").trim() || undefined,
      injectMarketingPlan: typeof options?.injectMarketingPlan === "boolean" ? options.injectMarketingPlan : false,
      userRequirement: this.normalizeSafeInstruction(options?.userRequirement, "抖音二创补充要求") || undefined,
    });

    return this.buildSummaryResponse({
      title: "抖音二创文案任务已受理",
      summary: "已为当前品牌发起抖音二创文案任务。",
      highlights: [
        `素材：${materialId}`,
        typeof options?.injectBrandProfile === "boolean" ? `植入品牌资料：${options.injectBrandProfile ? "是" : "否"}` : "植入品牌资料：默认关闭",
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
      ],
      data: {
        latestTask: workspace.latestTask,
        latest: workspace.latest,
      },
      links: [{ label: "打开抖音二创文案", url: "/douyin" }],
    });
  }

  async getXiaohongshuMaterialLibraryItems(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "view", auth);

    const workspace = await this.collectorsService.getXiaohongshuWorkspace(brandId);
    const materials = workspace.benchmarkNotes
      .filter((item) => item.isInMaterialLibrary)
      .sort((left, right) => this.getTimestamp(right.materialAddedAt || right.collectedAt) - this.getTimestamp(left.materialAddedAt || left.collectedAt));
    const items = materials.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "小红书二创素材库",
      summary: items.length
        ? `当前品牌素材库中有 ${materials.length} 条可用于二创的对标作品。`
        : "当前品牌素材库里还没有可用于二创的作品，请先把对标作品加入素材库。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.nickname || "未命名作者"}`)
        : ["素材数：0"],
      data: {
        total: materials.length,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          nickname: item.nickname,
          noteUrl: item.noteUrl,
          sourceUrl: item.sourceUrl,
          noteType: item.noteType,
          likeCount: item.likeCount,
          collectCount: item.collectCount,
          commentCount: item.commentCount,
          materialAddedAt: item.materialAddedAt,
          collectedAt: item.collectedAt,
        })),
      },
      links: [{ label: "打开素材库", url: "/xiaohongshu" }],
    });
  }

  async getXiaohongshuOriginalReferenceTemplates(
    headers: HeadersMap,
    options?: {
      categoryId?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "view", auth);

    const templates = await this.worksService.listXiaohongshuOriginalReferenceTemplates();
    const filteredItems = templates.items
      .filter((item) => (options?.categoryId ? item.categoryId === options.categoryId : true))
      .slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "小红书原创参考模板",
      summary: filteredItems.length
        ? `当前返回 ${filteredItems.length} 个原创参考模板，可作为后续生成时的风格参考。`
        : options?.categoryId
          ? `未找到分类 ${options.categoryId} 下的参考模板。`
          : "当前没有可用的原创参考模板。",
      highlights: filteredItems.length
        ? filteredItems.slice(0, 5).map((item) => `${item.categoryLabel}｜${item.title}`)
        : ["模板数：0"],
      data: {
        generatedAt: templates.generatedAt,
        categories: templates.categories,
        total: options?.categoryId ? filteredItems.length : templates.items.length,
        items: filteredItems,
      },
      links: [{ label: "打开小红书工作区", url: "/xiaohongshu" }],
    });
  }

  async getRecentXiaohongshuOriginalWorks(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "view", auth);

    const workspace = await this.worksService.listXiaohongshuOriginalWorks(brandId);
    const items = workspace.items.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "最近小红书原创笔记结果",
      summary: items.length
        ? `当前品牌最近共有 ${workspace.items.length} 条原创笔记结果，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有原创笔记结果。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${this.formatTaskStatus(item.taskStatus)}`)
        : ["作品数：0"],
      data: {
        total: workspace.items.length,
        items: items.map((item) => ({
          id: item.id,
          taskId: item.taskId,
          title: item.title,
          taskStatus: item.taskStatus,
          accountRole: item.accountRole,
          productName: item.productName,
          customTopicName: item.customTopicName,
          calendarLabel: item.calendarLabel,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      },
      links: [{ label: "打开小红书工作区", url: "/xiaohongshu" }],
    });
  }

  async getUnifiedMaterialLibraryItems(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);

    const items = await this.collectorsService.listUnifiedMaterialLibraryItems(brandId);
    const limit = this.normalizeLimit(options?.limit);
    const sliced = items.slice(0, limit);

    return this.buildSummaryResponse({
      title: "统一素材库",
      summary: items.length
        ? `当前品牌统一素材库共有 ${items.length} 条素材，涵盖小红书、抖音和公众号。`
        : "当前品牌统一素材库还没有素材，请先把对标作品加入素材库。",
      highlights: sliced.length
        ? sliced.slice(0, 5).map((item) => `${item.platformLabel}｜${item.title}`)
        : ["素材数：0"],
      data: {
        total: items.length,
        items: sliced.map((item) => ({
          id: item.id,
          platform: item.platform,
          platformLabel: item.platformLabel,
          title: item.title,
          authorName: item.authorName,
          sourceKind: item.sourceKind,
          detailUrl: item.detailUrl,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          shareCount: item.shareCount,
          collectCount: item.collectCount,
          materialAddedAt: item.materialAddedAt,
          collectedAt: item.collectedAt,
        })),
      },
      links: [{ label: "打开素材库", url: "/brand-growth" }],
      resourceKind: "unified_material_library",
    });
  }

  async addDouyinWorkToMaterialLibrary(
    headers: HeadersMap,
    options?: {
      assetId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const result = await this.collectorsService.addDouyinBenchmarkWorkToMaterialLibrary(brandId, assetId);

    return this.buildSummaryResponse({
      title: "抖音素材已加入素材库",
      summary: `素材 ${assetId} 已加入统一素材库，可继续用于跨平台二创。`,
      highlights: [
        `素材 ID：${assetId}`,
        result.item?.title ? `素材标题：${result.item.title}` : "素材标题：未返回",
      ],
      data: result,
      links: [{ label: "打开素材库", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_material",
    });
  }

  async addWechatArticleToMaterialLibrary(
    headers: HeadersMap,
    options?: {
      assetId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const result = await this.collectorsService.addWechatBenchmarkArticleToMaterialLibrary(brandId, assetId);

    return this.buildSummaryResponse({
      title: "公众号素材已加入素材库",
      summary: `素材 ${assetId} 已加入统一素材库，可继续用于跨平台二创。`,
      highlights: [
        `素材 ID：${assetId}`,
        result.item?.title ? `素材标题：${result.item.title}` : "素材标题：未返回",
      ],
      data: result,
      links: [{ label: "打开素材库", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "wechat_material",
    });
  }

  async removeXiaohongshuNoteFromMaterialLibrary(
    headers: HeadersMap,
    options?: {
      assetId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const result = await this.collectorsService.removeBenchmarkNoteFromMaterialLibrary(brandId, assetId);

    return this.buildSummaryResponse({
      title: "小红书素材已从素材库移除",
      summary: `素材 ${assetId} 已从统一素材库中移除。`,
      highlights: [`素材 ID：${assetId}`],
      data: result,
      links: [{ label: "打开素材库", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_material",
    });
  }

  async removeDouyinWorkFromMaterialLibrary(
    headers: HeadersMap,
    options?: {
      assetId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const result = await this.collectorsService.removeDouyinBenchmarkWorkFromMaterialLibrary(brandId, assetId);

    return this.buildSummaryResponse({
      title: "抖音素材已从素材库移除",
      summary: `素材 ${assetId} 已从统一素材库中移除。`,
      highlights: [`素材 ID：${assetId}`],
      data: result,
      links: [{ label: "打开素材库", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_material",
    });
  }

  async getWechatCollectionWorkspace(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "view", auth);

    const [workspace, benchmarkWorkspace, searchWorkspace] = await Promise.all([
      this.collectorsService.getWechatMpWorkspace(brandId),
      this.collectorsService.getWechatMpBenchmarkWorkspace(brandId),
      this.collectorsService.getWechatSearchWorkspace(brandId),
    ]);
    const limit = this.normalizeLimit(options?.limit);

    return this.buildSummaryResponse({
      title: "公众号采集数据工作区",
      summary: `当前品牌公众号采集数据已包含 ${workspace.brandAccounts?.length || 0} 个品牌公众号、${workspace.articles?.length || 0} 条品牌文章、${benchmarkWorkspace.benchmarkArticles?.length || 0} 条对标文章和 ${searchWorkspace.items?.length || 0} 条微信搜一搜结果。`,
      highlights: [
        `品牌公众号：${workspace.brandAccounts?.length || 0}`,
        `品牌文章：${workspace.articles?.length || 0}`,
        `对标文章：${benchmarkWorkspace.benchmarkArticles?.length || 0}`,
        `搜一搜结果：${searchWorkspace.items?.length || 0}`,
      ],
      data: {
        brandAccounts: (workspace.brandAccounts || []).slice(0, limit),
        articles: (workspace.articles || []).slice(0, limit),
        benchmarkArticles: (benchmarkWorkspace.benchmarkArticles || []).slice(0, limit),
        searchItems: (searchWorkspace.items || []).slice(0, limit),
      },
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resourceKind: "wechat_collection",
    });
  }

  async syncWechatBrandAccounts(
    headers: HeadersMap,
    options?: {
      ghUsername?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "edit", auth);

    const ghUsername = this.normalizeSafeInstruction(options?.ghUsername, "公众号 gh_username");
    if (!ghUsername) {
      throw new BadRequestException("请提供 ghUsername");
    }
    const result = await this.collectorsService.syncWechatMpBrandAccount(brandId, ghUsername);

    return this.buildSummaryResponse({
      title: "品牌公众号已绑定",
      summary: `已绑定公众号 ${ghUsername}，当前品牌公众号采集工作区已更新。`,
      highlights: [
        `gh_username：${ghUsername}`,
        result.item?.id ? `账号 ID：${result.item.id}` : "账号 ID：未返回",
        result.item?.accountName ? `账号名称：${result.item.accountName}` : "账号名称：未返回",
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "wechat_collection",
    });
  }

  async fetchWechatBrandArticles(
    headers: HeadersMap,
    options?: {
      ghUsername?: string;
      offset?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "edit", auth);

    const ghUsername = this.normalizeSafeInstruction(options?.ghUsername, "公众号 gh_username");
    if (!ghUsername) {
      throw new BadRequestException("请提供 ghUsername");
    }
    const offset = this.normalizeSafeInstruction(options?.offset, "公众号文章翻页游标") || undefined;
    const result = await this.collectorsService.fetchWechatMpArticles(brandId, ghUsername, offset);

    return this.buildSummaryResponse({
      title: "公众号历史文章已抓取",
      summary: `已为公众号 ${ghUsername} 抓取 ${result.count} 篇历史文章${result.isEnd ? "，当前已到末页。" : "，还可继续翻页抓取。"}。`,
      highlights: [
        `gh_username：${ghUsername}`,
        `本次抓取：${result.count}`,
        result.nextOffset ? `下一页游标：${result.nextOffset}` : "下一页游标：无",
        `是否到末页：${result.isEnd ? "是" : "否"}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "wechat_collection",
      nextActions: result.isEnd
        ? [{ label: "打开品牌增长工作台", action: "open_page", target: "/brand-growth" }]
        : [{ label: "继续抓取下一页", action: "check_status", target: result.nextOffset || "" }],
    });
  }

  async syncWechatBenchmarkArticles(
    headers: HeadersMap,
    options?: {
      articleUrls?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "edit", auth);

    const articleUrls = this.normalizeStringArray(options?.articleUrls);
    if (!articleUrls.length) {
      throw new BadRequestException("请提供 articleUrls");
    }

    const results: Array<{ url: string; title?: string; success: boolean; error?: string }> = [];
    for (const url of articleUrls) {
      try {
        const result = await this.collectorsService.submitWechatMpBenchmarkArticle(brandId, url);
        results.push({ url, title: result.item?.title, success: true });
      } catch (error) {
        results.push({ url, success: false, error: error instanceof Error ? error.message : "同步失败" });
      }
    }
    const successCount = results.filter((item) => item.success).length;

    return this.buildSummaryResponse({
      title: "公众号对标文章已同步",
      summary: `已尝试同步 ${articleUrls.length} 篇对标文章，成功 ${successCount} 篇，失败 ${articleUrls.length - successCount} 篇。`,
      highlights: results.slice(0, 5).map((item) => `${item.success ? "✓" : "✗"} ${item.url}`),
      data: { results, successCount, totalCount: articleUrls.length },
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "wechat_collection",
    });
  }

  async syncWechatSearchArticles(
    headers: HeadersMap,
    options?: {
      searchKeyword?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "edit", auth);

    const searchKeyword = String(options?.searchKeyword || "").trim();
    if (!searchKeyword) {
      throw new BadRequestException("请提供 searchKeyword");
    }
    const result = await this.collectorsService.searchWechat(brandId, searchKeyword, "all", "default", "all", 0);

    return this.buildSummaryResponse({
      title: "微信搜一搜已同步",
      summary: `已根据关键词「${searchKeyword}」同步微信搜一搜数据，当前共 ${result.items?.length || 0} 条结果。`,
      highlights: (result.items || []).slice(0, 5).map((item) => item.title || item.url || "未命名"),
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "wechat_collection",
    });
  }

  async updateWechatArticleStats(
    headers: HeadersMap,
    options?: {
      articleUrl?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "edit", auth);

    const articleUrl = String(options?.articleUrl || "").trim();
    if (!articleUrl) {
      throw new BadRequestException("请提供 articleUrl");
    }
    const result = await this.collectorsService.updateWechatMpBenchmarkArticleStats(brandId, articleUrl);

    return this.buildSummaryResponse({
      title: "公众号文章数据已更新",
      summary: `文章「${result.item?.title || articleUrl}」的阅读量、点赞数、分享数、收藏数、评论数、喜欢数已更新。`,
      highlights: [
        `阅读量：${result.item?.readNum ?? "未返回"}`,
        `点赞数：${result.item?.likeCount ?? "未返回"}`,
        `分享数：${result.item?.shareCount ?? "未返回"}`,
      ],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "wechat_collection",
    });
  }

  async deleteXhsCollectedNote(
    headers: HeadersMap,
    options?: {
      assetId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const result = await this.collectorsService.deleteXhsCollectedNote(brandId, assetId);

    return this.buildSummaryResponse({
      title: "小红书采集作品已删除",
      summary: `作品 ${assetId} 已从采集数据中删除。`,
      highlights: [`已删除 ID：${assetId}`],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "xiaohongshu_collection",
    });
  }

  async deleteDouyinCollectedWork(
    headers: HeadersMap,
    options?: {
      assetId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.douyinCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const result = await this.collectorsService.deleteDouyinCollectedWork(brandId, assetId);

    return this.buildSummaryResponse({
      title: "抖音采集作品已删除",
      summary: `作品 ${assetId} 已从采集数据中删除。`,
      highlights: [`已删除 ID：${assetId}`],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "douyin_collection",
    });
  }

  async deleteWechatCollectedArticle(
    headers: HeadersMap,
    options?: {
      assetId?: string;
      kind?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.wechatMpCollection", "edit", auth);

    const assetId = String(options?.assetId || "").trim();
    if (!assetId) {
      throw new BadRequestException("请提供 assetId");
    }
    const kind = String(options?.kind || "").trim().toLowerCase();
    let result: { workspace: unknown };
    if (kind === "search") {
      result = await this.collectorsService.deleteWechatSearchItem(brandId, assetId);
    } else if (kind === "brand") {
      result = await this.collectorsService.deleteWechatMpArticle(brandId, assetId);
    } else {
      result = await this.collectorsService.deleteWechatMpBenchmarkArticle(brandId, assetId);
    }

    return this.buildSummaryResponse({
      title: "公众号采集文章已删除",
      summary: `文章 ${assetId} 已从采集数据中删除。`,
      highlights: [`已删除 ID：${assetId}`],
      data: result,
      links: [{ label: "打开品牌增长工作台", url: "/brand-growth" }],
      resultStatus: "COMPLETED",
      resourceKind: "wechat_collection",
    });
  }

  async getDouyinMaterialLibraryItems(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "view", auth);

    const workspace = await this.collectorsService.getDouyinWorkspace(brandId);
    const materials = [
      ...workspace.competitorWorks,
      ...workspace.benchmarkWorks,
      ...workspace.searchWorks,
      ...workspace.lowFanExplosiveWorks,
      ...workspace.highCompletionRateWorks,
      ...workspace.highLikeRateWorks,
    ]
      .filter((item) => item.isInMaterialLibrary)
      .sort((left, right) => this.getTimestamp(right.materialAddedAt || right.collectedAt) - this.getTimestamp(left.materialAddedAt || left.collectedAt));
    const items = materials.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "抖音二创素材库",
      summary: items.length
        ? `当前品牌素材库中有 ${materials.length} 条可用于二创的抖音素材。`
        : "当前品牌素材库里还没有可用于二创的抖音素材，请先把对标作品加入素材库。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.authorName || "未命名作者"}`)
        : ["素材数：0"],
      data: {
        total: materials.length,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          authorName: item.authorName,
          workUrl: item.workUrl,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          shareCount: item.shareCount,
          collectCount: item.collectCount,
          materialAddedAt: item.materialAddedAt,
          collectedAt: item.collectedAt,
        })),
      },
      links: [{ label: "打开素材库", url: "/brand-growth" }],
    });
  }

  async getOpenClawLobsterDiaries(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const workspace = await this.openClawLobsterDiaryService.listWorkspace(brandId, workspaceScope, options?.limit);
    const items = workspace.items.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: `${workspaceLabel}每日复盘`,
      summary: workspace.total
        ? `当前品牌 ${workspaceLabel} 板块共有 ${workspace.total} 篇每日复盘。`
        : `当前品牌 ${workspaceLabel} 板块还没有每日复盘，OpenClaw Agent 可先创建首篇复盘。`,
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.diaryDate}｜${item.title}`)
        : ["日记数：0"],
      data: {
        total: workspace.total,
        items,
      },
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_lobster_diary",
    });
  }

  async createOpenClawLobsterDiary(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      diaryDate?: string;
      title?: string;
      content?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);

    const item = await this.openClawLobsterDiaryService.createDiary({
      brandId,
      workspaceScope,
      createdByUserId: auth.userId,
      diaryDate: options?.diaryDate,
      title: options?.title,
      content: options?.content,
    });

    return this.buildSummaryResponse({
      title: `${workspaceLabel}每日复盘已创建`,
      summary: `已在 ${workspaceLabel} 板块创建 ${item.diaryDate} 的每日复盘《${item.title}》。`,
      highlights: [
        `日期：${item.diaryDate}`,
        `标题：${item.title}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_lobster_diary",
      resultStatus: "COMPLETED",
    });
  }

  async deleteOpenClawLobsterDiary(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      diaryId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const diaryId = String(options?.diaryId || "").trim();
    if (!diaryId) {
      throw new BadRequestException("请提供 diaryId");
    }

    const item = await this.openClawLobsterDiaryService.deleteDiary(brandId, workspaceScope, diaryId);

    return this.buildSummaryResponse({
      title: `${workspaceLabel}每日复盘已删除`,
      summary: `已从 ${workspaceLabel} 板块删除每日复盘《${item.title}》。`,
      highlights: [
        `日期：${item.diaryDate}`,
        `复盘 ID：${item.id}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_lobster_diary",
      resultStatus: "COMPLETED",
    });
  }

  async getOpenClawDailyPlans(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const workspace = await this.openClawDailyPlanService.listWorkspace(brandId, workspaceScope, options?.limit);
    const items = workspace.items.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: `${workspaceLabel}每日计划`,
      summary: workspace.total
        ? `当前品牌 ${workspaceLabel} 板块共有 ${workspace.total} 篇每日计划。`
        : `当前品牌 ${workspaceLabel} 板块还没有每日计划，OpenClaw Agent 可先创建首篇计划。`,
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.planDate}｜${item.title}`)
        : ["计划数：0"],
      data: {
        total: workspace.total,
        items,
      },
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_daily_plan",
    });
  }

  async createOpenClawDailyPlan(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      planDate?: string;
      title?: string;
      content?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);

    const item = await this.openClawDailyPlanService.createPlan({
      brandId,
      workspaceScope,
      createdByUserId: auth.userId,
      planDate: options?.planDate,
      title: options?.title,
      content: options?.content,
    });

    return this.buildSummaryResponse({
      title: `${workspaceLabel}每日计划已创建`,
      summary: `已在 ${workspaceLabel} 板块创建 ${item.planDate} 的每日计划《${item.title}》。`,
      highlights: [
        `日期：${item.planDate}`,
        `标题：${item.title}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_daily_plan",
      resultStatus: "COMPLETED",
    });
  }

  async deleteOpenClawDailyPlan(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      planId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const planId = String(options?.planId || "").trim();
    if (!planId) {
      throw new BadRequestException("请提供 planId");
    }

    const item = await this.openClawDailyPlanService.deletePlan(brandId, workspaceScope, planId);

    return this.buildSummaryResponse({
      title: `${workspaceLabel}每日计划已删除`,
      summary: `已从 ${workspaceLabel} 板块删除每日计划《${item.title}》。`,
      highlights: [
        `日期：${item.planDate}`,
        `计划 ID：${item.id}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_daily_plan",
      resultStatus: "COMPLETED",
    });
  }

  async getOpenClawCreativeMaterials(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const workspace = await this.openClawCreativeMaterialService.listWorkspace(brandId, workspaceScope, options?.limit);
    const items = workspace.items.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: `${workspaceLabel}创作素材`,
      summary: workspace.total
        ? `当前品牌 ${workspaceLabel} 板块共有 ${workspace.total} 条创作素材。`
        : `当前品牌 ${workspaceLabel} 板块还没有创作素材，OpenClaw 可先调用站内能力生成并保存首条素材。`,
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.materialType || "素材"}｜${item.title}`)
        : ["素材数：0"],
      data: {
        total: workspace.total,
        items,
      },
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_creative_material",
    });
  }

  async createVolcengineMusicTask(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      taskType?: string;
      title?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const taskType = this.normalizeVolcengineMusicTaskType(options?.taskType);
    if (!taskType) {
      throw new BadRequestException("请提供有效的 taskType：song 或 bgm");
    }

    const result = taskType === "song"
      ? await this.volcengineMusicService.createSongTask(brandId, options?.payload)
      : await this.volcengineMusicService.createBgmTask(brandId, options?.payload);
    const businessTitle = String(options?.title || "").trim()
      || this.deriveVolcengineMusicTaskTitle(taskType, options?.payload);

    return this.buildSummaryResponse({
      title: taskType === "song" ? "人声歌曲任务已受理" : "纯音乐任务已受理",
      summary: `已为当前品牌创建火山音乐${taskType === "song" ? "人声歌曲" : "纯音乐"}任务，请继续轮询任务结果。`,
      highlights: [
        `任务类型：${taskType === "song" ? "人声歌曲" : "纯音乐 BGM"}`,
        `任务 ID：${result.taskId}`,
        typeof result.predictedWaitTime === "number" ? `预计等待：${result.predictedWaitTime} 秒` : "预计等待：火山未返回",
        businessTitle ? `业务标题：${businessTitle}` : `服务板块：${workspaceLabel}`,
      ],
      data: {
        workspaceScope,
        title: businessTitle || undefined,
        ...result,
      },
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "volcengine_music_task",
      resultStatus: "IN_PROGRESS",
      nextActions: [
        { label: "继续查询任务结果", action: "check_status", target: result.taskId },
        { label: `打开${workspaceLabel}工作台`, action: "open_page", target: workspacePath },
      ],
    });
  }

  async getVolcengineMusicTask(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      taskId?: string;
      taskType?: string;
      saveToCreativeMaterial?: boolean;
      materialTitle?: string;
      materialDescription?: string;
      materialType?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }
    const taskType = this.normalizeVolcengineMusicTaskType(options?.taskType);
    const result = await this.volcengineMusicService.querySongTask(brandId, taskId);
    const statusLabel = this.getVolcengineMusicStatusLabel(result.status);
    const isSuccess = result.status === 2;
    const isFailed = result.status === 3;
    const shouldSave = options?.saveToCreativeMaterial === true && isSuccess && !!result.songDetail.audioUrl;
    let savedMaterial: Record<string, unknown> | undefined;

    if (options?.saveToCreativeMaterial === true) {
      await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    }

    if (shouldSave) {
      const defaultMaterialType = String(options?.materialType || "").trim()
        || (taskType === "bgm" ? "bgm" : "audio");
      const material = await this.openClawCreativeMaterialService.createMaterial({
        brandId,
        workspaceScope,
        createdByUserId: auth.userId,
        title: String(options?.materialTitle || "").trim()
          || this.deriveVolcengineMusicMaterialTitle(taskType, taskId, result.songDetail.prompt, result.songDetail.lyrics),
        description: String(options?.materialDescription || "").trim()
          || this.buildVolcengineMusicMaterialDescription(taskType, result),
        materialType: defaultMaterialType,
        fileUrl: result.songDetail.audioUrl,
        fileName: this.deriveVolcengineMusicFileName(taskType, taskId, result.songDetail.audioUrl),
        mimeType: this.inferAudioMimeType(result.songDetail.audioUrl),
        textContent: result.songDetail.lyrics,
      });
      savedMaterial = material as unknown as Record<string, unknown>;
    }

    return this.buildSummaryResponse({
      title: `火山音乐任务结果：${statusLabel}`,
      summary: isSuccess
        ? `任务 ${taskId} 已生成成功${savedMaterial ? "，并已沉淀到 OpenClaw 创作素材" : "。"}`
        : isFailed
          ? `任务 ${taskId} 已失败，请根据失败原因调整歌词、描述或时长后重试。`
          : `任务 ${taskId} 当前仍在处理中，可继续轮询状态。`,
      highlights: [
        `任务状态：${statusLabel}`,
        typeof result.progress === "number" ? `当前进度：${result.progress}%` : "当前进度：火山未返回",
        result.songDetail.duration ? `音频时长：${result.songDetail.duration.toFixed(2)} 秒` : "音频时长：待生成",
        result.songDetail.audioUrl ? "音频结果：已返回下载地址" : "音频结果：暂未返回",
        ...(result.failureReason?.message ? [`失败原因：${result.failureReason.message}`] : []),
        ...(savedMaterial?.id ? [`已保存素材：${String(savedMaterial.id)}`] : []),
      ],
      data: {
        workspaceScope,
        taskType: taskType || undefined,
        statusLabel,
        ...result,
        ...(savedMaterial ? { savedMaterial } : {}),
      },
      links: [
        ...(result.songDetail.audioUrl ? [{ label: "打开音频结果", url: result.songDetail.audioUrl }] : []),
        { label: `打开${workspaceLabel}工作台`, url: workspacePath },
      ],
      resourceKind: "volcengine_music_task",
      resultStatus: isSuccess ? "COMPLETED" : isFailed ? "ACTION_REQUIRED" : "IN_PROGRESS",
      nextActions: [
        ...(!isSuccess ? [{ label: "继续轮询任务", action: "check_status" as const, target: taskId }] : []),
        ...(savedMaterial?.id ? [{ label: "回到对话继续处理素材", action: "continue_in_chat" as const, target: String(savedMaterial.id) }] : []),
        { label: `打开${workspaceLabel}工作台`, action: "open_page" as const, target: workspacePath },
      ],
    });
  }

  async createOpenClawCreativeMaterial(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      title?: string;
      description?: string;
      materialType?: string;
      fileUrl?: string;
      fileName?: string;
      mimeType?: string;
      textContent?: string;
      upload?: {
        fileName?: string;
        contentType?: string;
        dataBase64?: string;
      };
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);

    const item = await this.openClawCreativeMaterialService.createMaterial({
      brandId,
      workspaceScope,
      createdByUserId: auth.userId,
      title: options?.title,
      description: options?.description,
      materialType: options?.materialType,
      fileUrl: options?.fileUrl,
      fileName: options?.fileName,
      mimeType: options?.mimeType,
      textContent: options?.textContent,
      upload: options?.upload,
    });

    return this.buildSummaryResponse({
      title: `${workspaceLabel}创作素材已保存`,
      summary: `已在 ${workspaceLabel} 板块保存创作素材《${item.title}》。`,
      highlights: [
        `素材类型：${item.materialType || "未标注"}`,
        `素材标题：${item.title}`,
        item.fileUrl ? `文件地址：${item.fileUrl}` : `文本长度：${String(item.textContent || "").length} 字`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_creative_material",
      resultStatus: "COMPLETED",
    });
  }

  async deleteOpenClawCreativeMaterial(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      materialId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const materialId = String(options?.materialId || "").trim();
    if (!materialId) {
      throw new BadRequestException("请提供 materialId");
    }

    const item = await this.openClawCreativeMaterialService.deleteMaterial(brandId, workspaceScope, materialId);

    return this.buildSummaryResponse({
      title: `${workspaceLabel}创作素材已删除`,
      summary: `已从 ${workspaceLabel} 板块删除创作素材《${item.title}》。`,
      highlights: [
        `素材类型：${item.materialType || "未标注"}`,
        `素材 ID：${item.id}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_creative_material",
      resultStatus: "COMPLETED",
    });
  }

  async getOpenClawVideoWorks(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const workspace = await this.openClawVideoWorkService.listWorkspace(brandId, workspaceScope, options?.limit);
    const items = workspace.items.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: `${workspaceLabel}视频作品`,
      summary: workspace.total
        ? `当前品牌 ${workspaceLabel} 板块共有 ${workspace.total} 条视频作品。`
        : `当前品牌 ${workspaceLabel} 板块还没有视频作品，OpenClaw 可先保存最终成片。`,
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.videoUrl ? "已存视频" : "缺少视频"}`)
        : ["作品数：0"],
      data: {
        total: workspace.total,
        items,
      },
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_video_work",
    });
  }

  async getOpenClawGeoVisibilityReports(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope || "geo");
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const workspace = await this.openClawGeoVisibilityReportService.listWorkspace(brandId, workspaceScope, options?.limit);
    const items = workspace.items.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: `${workspaceLabel}可见度诊断报告`,
      summary: workspace.total
        ? `当前品牌 ${workspaceLabel} 板块共有 ${workspace.total} 份 GEO 可见度诊断报告。`
        : `当前品牌 ${workspaceLabel} 板块还没有 GEO 可见度诊断报告，OpenClaw 可先保存首份 HTML 报告。`,
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜HTML ${item.htmlContent ? "已保存" : "缺失"}`)
        : ["报告数：0"],
      data: {
        total: workspace.total,
        items,
      },
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_geo_visibility_report",
    });
  }

  async createOpenClawGeoVisibilityReport(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      title?: string;
      description?: string;
      htmlContent?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope || "geo");
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);

    const item = await this.openClawGeoVisibilityReportService.createReport({
      brandId,
      workspaceScope,
      createdByUserId: auth.userId,
      title: options?.title,
      description: options?.description,
      htmlContent: options?.htmlContent,
    });

    return this.buildSummaryResponse({
      title: `${workspaceLabel}可见度诊断报告已保存`,
      summary: `已在 ${workspaceLabel} 板块保存 GEO 可见度诊断报告《${item.title}》。`,
      highlights: [
        `报告标题：${item.title}`,
        `HTML 长度：${String(item.htmlContent || "").length} 字符`,
        item.description ? `报告摘要：${item.description}` : "报告摘要：未填写",
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_geo_visibility_report",
      resultStatus: "COMPLETED",
    });
  }

  async deleteOpenClawGeoVisibilityReport(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      reportId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope || "geo");
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const reportId = String(options?.reportId || "").trim();
    if (!reportId) {
      throw new BadRequestException("请提供 reportId");
    }

    const item = await this.openClawGeoVisibilityReportService.deleteReport(brandId, workspaceScope, reportId);

    return this.buildSummaryResponse({
      title: `${workspaceLabel}可见度诊断报告已删除`,
      summary: `已从 ${workspaceLabel} 板块删除 GEO 可见度诊断报告《${item.title}》。`,
      highlights: [
        `报告标题：${item.title}`,
        `报告 ID：${item.id}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_geo_visibility_report",
      resultStatus: "COMPLETED",
    });
  }

  async createOpenClawVideoWork(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      title?: string;
      description?: string;
      scriptContent?: string;
      coverImageUrl?: string;
      videoUrl?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);

    const item = await this.openClawVideoWorkService.createVideoWork({
      brandId,
      workspaceScope,
      createdByUserId: auth.userId,
      title: options?.title,
      description: options?.description,
      scriptContent: options?.scriptContent,
      coverImageUrl: options?.coverImageUrl,
      videoUrl: options?.videoUrl,
    });

    return this.buildSummaryResponse({
      title: `${workspaceLabel}视频作品已保存`,
      summary: `已在 ${workspaceLabel} 板块保存视频作品《${item.title}》。`,
      highlights: [
        `作品标题：${item.title}`,
        `脚本长度：${String(item.scriptContent || "").length} 字`,
        `视频地址：${item.videoUrl}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_video_work",
      resultStatus: "COMPLETED",
    });
  }

  async deleteOpenClawVideoWork(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      workId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }

    const item = await this.openClawVideoWorkService.deleteVideoWork(brandId, workspaceScope, workId);

    return this.buildSummaryResponse({
      title: `${workspaceLabel}视频作品已删除`,
      summary: `已从 ${workspaceLabel} 板块删除视频作品《${item.title}》。`,
      highlights: [
        `作品标题：${item.title}`,
        `作品 ID：${item.id}`,
      ],
      data: item,
      links: [{ label: `打开${workspaceLabel}工作台`, url: workspacePath }],
      resourceKind: "openclaw_video_work",
      resultStatus: "COMPLETED",
    });
  }

  async createOpenClawVideoWorkDouyinDesktopPublishSession(
    headers: HeadersMap,
    options?: {
      workspaceScope?: string;
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspacePath = getOpenClawWorkspaceDashboardPath(workspaceScope);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }

    const item = await this.openClawVideoWorkService.getVideoWorkById(brandId, workspaceScope, workId);
    if (!item) {
      throw new BadRequestException("指定的视频作品不存在或已删除");
    }

    const result = await this.publishingService.createDouyinDesktopPublishSessionFromSource(brandId, {
      workId: item.id,
      workKind: "OPENCLAW_VIDEO",
      title: item.title,
      content: item.scriptContent || item.description,
      videoUrl: item.videoUrl,
      coverImageUrl: item.coverImageUrl,
      hashtags: [],
      sourceLabel: "OpenClaw 视频作品",
    }, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });

    const creatorUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "creatorUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || item.title || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在电脑端打开抖音创作者中心并使用浏览器扩展接力。";

    return this.buildSummaryResponse({
      title: "已创建 OpenClaw 视频作品抖音发布接力",
      summary: `已为 OpenClaw 视频作品《${item.title}》创建抖音电脑端发布会话。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(creatorUrl ? [{ label: "打开抖音创作者中心", url: creatorUrl }] : []),
        { label: "打开 OpenClaw 视频作品板块", url: workspacePath },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(creatorUrl ? [{ label: "打开创作者中心", action: "open_page" as const, target: creatorUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: item.id },
      ],
    });
  }

  async createBrandGrowthReport(
    headers: HeadersMap,
    options?: {
      goal?: string;
      timeRange?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "edit", auth);

    const workspace = await this.reportsService.generateGrowthReport(brandId);
    const latestTask = workspace.latestTask;

    return this.buildSummaryResponse({
      title: "品牌增长报告已受理",
      summary: latestTask
        ? `已为当前品牌发起品牌增长报告任务，当前状态为 ${this.formatTaskStatus(latestTask.taskStatus)}。`
        : "已为当前品牌发起品牌增长报告任务。",
      highlights: [
        options?.goal ? `目标：${options.goal}` : "默认按当前品牌上下文生成",
        options?.timeRange ? `时间范围：${options.timeRange}` : "时间范围：系统默认",
      ],
      data: {
        task: latestTask
          ? {
              id: latestTask.id,
              taskType: latestTask.taskType,
              taskTitle: latestTask.taskTitle,
              taskStatus: latestTask.taskStatus,
              phaseText: latestTask.phaseText,
              createdAt: latestTask.createdAt,
            }
          : undefined,
        latestReportId: workspace.latest?.id,
      },
      links: [{ label: "打开完整报告", url: "/brand-growth/reports" }],
    });
  }

  async getLatestBrandGrowthReportSummary(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "view", auth);

    const workspace = await this.reportsService.getGrowthReportWorkspace(brandId);
    const latestReport = workspace.latest;
    const latestTask = workspace.latestTask;

    if (!latestReport) {
      return this.buildSummaryResponse({
        title: "品牌增长报告最新摘要",
        summary: latestTask
          ? `当前品牌最近一次品牌增长报告任务状态为 ${this.formatTaskStatus(latestTask.taskStatus)}，暂未生成可读报告。`
          : "当前品牌还没有品牌增长报告。",
        highlights: latestTask
          ? [
              `最近任务：${latestTask.taskTitle}`,
              `任务状态：${this.formatTaskStatus(latestTask.taskStatus)}`,
              `历史报告数：${workspace.history.length}`,
            ]
          : ["历史报告数：0", "建议先发起一次品牌增长报告"],
        data: {
          historyCount: workspace.history.length,
          latestTask: latestTask
            ? {
                id: latestTask.id,
                taskType: latestTask.taskType,
                taskTitle: latestTask.taskTitle,
                taskStatus: latestTask.taskStatus,
                createdAt: latestTask.createdAt,
                updatedAt: latestTask.updatedAt,
              }
            : undefined,
          report: undefined,
        },
        links: [{ label: "打开完整报告", url: "/brand-growth/reports" }],
      });
    }

    return this.buildSummaryResponse({
      title: "品牌增长报告最新摘要",
      summary: latestReport.summary || `最近一份品牌增长报告为“${latestReport.title}”。`,
      highlights: [
        `生成时间：${latestReport.generatedAt}`,
        `分析覆盖：商品 ${latestReport.metrics.productCount} / 品牌内容 ${latestReport.metrics.brandNoteCount} / 竞品内容 ${latestReport.metrics.benchmarkNoteCount}`,
        latestReport.opportunities[0] ? `优先机会：${latestReport.opportunities[0]}` : "已生成可读摘要",
      ],
      data: {
        historyCount: workspace.history.length,
        report: {
          id: latestReport.id,
          title: latestReport.title,
          summary: latestReport.summary,
          generatedAt: latestReport.generatedAt,
          diagnosis: latestReport.diagnosis.slice(0, 3),
          opportunities: latestReport.opportunities.slice(0, 5),
          nextActions: latestReport.nextActions.slice(0, 5),
          metrics: latestReport.metrics,
        },
        latestTask: latestTask
          ? {
              id: latestTask.id,
              taskType: latestTask.taskType,
              taskTitle: latestTask.taskTitle,
              taskStatus: latestTask.taskStatus,
              phaseText: latestTask.phaseText,
              createdAt: latestTask.createdAt,
              updatedAt: latestTask.updatedAt,
            }
          : undefined,
      },
      links: [{ label: "打开完整报告", url: "/brand-growth/reports" }],
    });
  }

  async createHalfYearMarketingPlan(
    headers: HeadersMap,
    options?: {
      planningYear?: string;
      focus?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.halfYearMarketingPlan", "edit", auth);

    const workspace = await this.reportsService.generateAnnualMarketingPlan(brandId);
    const latestTask = workspace.latestTask;

    return this.buildSummaryResponse({
      title: "半年营销规划已受理",
      summary: latestTask
        ? `已为当前品牌发起半年营销规划任务，当前状态为 ${this.formatTaskStatus(latestTask.taskStatus)}。`
        : "已为当前品牌发起半年营销规划任务。",
      highlights: [
        options?.planningYear ? `规划年份：${options.planningYear}` : "规划年份：按系统默认周期生成",
        options?.focus ? `规划重点：${options.focus}` : "规划重点：基于品牌增长报告自动推导",
      ],
      data: {
        task: latestTask
          ? {
              id: latestTask.id,
              taskType: latestTask.taskType,
              taskTitle: latestTask.taskTitle,
              taskStatus: latestTask.taskStatus,
              phaseText: latestTask.phaseText,
              createdAt: latestTask.createdAt,
            }
          : undefined,
        latestPlanId: workspace.latest?.id,
        sourceReportId: workspace.latest?.sourceReportId,
      },
      links: [{ label: "打开半年营销规划", url: "/brand-growth/half-year-marketing-plan" }],
    });
  }

  async createKnowledgeBase(
    headers: HeadersMap,
    options?: {
      name?: string;
      description?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);

    const normalizedName = String(options?.name || "").trim() || "品牌知识库";
    const knowledgeBases = await this.brandsService.createBusinessKnowledgeBase(brandId, {
      name: normalizedName,
      description: String(options?.description || "").trim() || undefined,
    });
    const createdKnowledgeBase =
      [...knowledgeBases]
        .filter((item) => item.name === normalizedName)
        .sort((left, right) => this.getTimestamp(right.updatedAt) - this.getTimestamp(left.updatedAt))[0]
      ?? this.pickLatestKnowledgeBase(knowledgeBases);

    return this.buildSummaryResponse({
      title: "知识库已创建",
      summary: createdKnowledgeBase
        ? `已为当前品牌创建知识库“${createdKnowledgeBase.name}”。`
        : `已为当前品牌创建知识库“${normalizedName}”。`,
      highlights: [
        `知识库总数：${knowledgeBases.length}`,
        createdKnowledgeBase?.description ? `说明：${createdKnowledgeBase.description}` : "说明：未填写",
      ],
      data: {
        knowledgeBase: createdKnowledgeBase
          ? {
              id: createdKnowledgeBase.id,
              name: createdKnowledgeBase.name,
              description: createdKnowledgeBase.description,
              syncStatus: createdKnowledgeBase.syncStatus,
              documentCount: createdKnowledgeBase.documentCount,
              chunkCount: createdKnowledgeBase.chunkCount,
              updatedAt: createdKnowledgeBase.updatedAt,
            }
          : undefined,
        total: knowledgeBases.length,
      },
      links: [{ label: "打开知识库", url: "/brand-growth/business-assets" }],
    });
  }

  async uploadKnowledgeBaseFiles(
    headers: HeadersMap,
    options?: {
      knowledgeBaseId?: string;
      knowledgeBaseName?: string;
      items?: Array<{
        title?: string;
        description?: string;
        sourceName?: string;
        fileUrl?: string;
        priority?: number;
      }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);

    const knowledgeBases = await this.brandsService.listBusinessKnowledgeBases(brandId);
    const targetKnowledgeBase = this.resolveKnowledgeBaseTarget(
      knowledgeBases,
      options?.knowledgeBaseId,
      options?.knowledgeBaseName,
    );
    const normalizedItems = (options?.items ?? [])
      .map((item) => {
        const fileUrl = String(item.fileUrl || "").trim();
        if (!fileUrl) {
          return undefined;
        }
        const title = String(item.title || "").trim() || this.deriveKnowledgeFileTitle(fileUrl);
        return {
          title,
          description: String(item.description || "").trim() || undefined,
          sourceName: String(item.sourceName || "").trim() || undefined,
          fileUrl,
          priority: Number.isFinite(item.priority) ? Number(item.priority) : undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!normalizedItems.length) {
      throw new BadRequestException("请至少提供一份可上传的资料链接");
    }

    const beforeFiles = await this.brandsService.listBusinessKnowledgeBaseFiles(brandId, targetKnowledgeBase.id);
    const beforeFileIds = new Set(beforeFiles.map((item) => item.id));
    const files = await this.brandsService.createBusinessKnowledgeBaseFiles(brandId, targetKnowledgeBase.id, {
      items: normalizedItems,
    });
    const createdFiles = files.filter((item) => !beforeFileIds.has(item.id));
    const returnedFiles = createdFiles.length ? createdFiles : files.slice(0, normalizedItems.length);

    return this.buildSummaryResponse({
      title: "知识资料上传已受理",
      summary: `已向知识库“${targetKnowledgeBase.name}”提交 ${normalizedItems.length} 份资料。`,
      highlights: [
        `目标知识库：${targetKnowledgeBase.name}`,
        `本次资料数：${normalizedItems.length}`,
        returnedFiles.length ? `资料标题：${returnedFiles.map((item) => item.title).slice(0, 3).join("、")}` : "资料已提交，等待处理",
      ],
      data: {
        knowledgeBase: {
          id: targetKnowledgeBase.id,
          name: targetKnowledgeBase.name,
        },
        counts: {
          uploaded: normalizedItems.length,
          created: createdFiles.length,
          total: files.length,
        },
        items: returnedFiles.slice(0, 10).map((item) => ({
          id: item.id,
          title: item.title,
          sourceName: item.sourceName,
          fileUrl: item.fileUrl,
          status: item.status,
          chunkCount: item.chunkCount,
          uploadedAt: item.uploadedAt,
        })),
      },
      links: [{ label: "打开知识库", url: "/brand-growth/business-assets" }],
    });
  }

  async createXiaohongshuOriginalNote(
    headers: HeadersMap,
    options?: {
      calendarItemId?: string;
      customTopicName?: string;
      topic?: string;
      accountRole?: string;
      imageCount?: number;
      includeMarketingPlan?: boolean;
      additionalInstruction?: string;
      noteTitle?: string;
      noteContent?: string;
      styleHint?: string;
      productId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const access = await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "edit", auth);

    const result = await this.worksService.generateXiaohongshuOriginalNote(
      brandId,
      {
        calendarItemId: String(options?.calendarItemId || "").trim() || undefined,
        customTopicName:
          String(options?.customTopicName || options?.topic || "").trim()
          || (options?.noteContent ? String(options?.noteTitle || "").trim() || undefined : "品牌内容创作"),
        productId: options?.productId,
        accountRole: this.normalizeOriginalAccountRole(options?.accountRole),
        imageCount: this.normalizeImageCount(options?.imageCount),
        additionalInstruction: this.normalizeSafeInstruction(
          options?.additionalInstruction || options?.styleHint,
          "小红书原创补充要求",
        ) || undefined,
        noteTitle: String(options?.noteTitle || "").trim() || undefined,
        noteContent: String(options?.noteContent || "").trim() || undefined,
        includeMarketingPlan: typeof options?.includeMarketingPlan === "boolean" ? options.includeMarketingPlan : false,
      },
      auth,
      access.role,
    ) as Record<string, unknown>;

    return this.buildSummaryResponse({
      title: "小红书原创图文任务已受理",
      summary: "已为当前品牌发起小红书原创图文任务。",
      highlights: [
        options?.calendarItemId
          ? `营销日历选题：${options.calendarItemId}`
          : `自定义选题：${String(options?.customTopicName || options?.topic || "").trim() || String(options?.noteTitle || "").trim() || "品牌内容创作"}`,
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
        options?.accountRole ? `账号人设：${options.accountRole}` : "账号人设：系统默认",
        options?.additionalInstruction || options?.styleHint
          ? `补充要求：${String(options?.additionalInstruction || options?.styleHint || "").trim()}`
          : "补充要求：使用系统默认策略",
        options?.noteTitle ? `笔记标题：${String(options.noteTitle).trim()}` : "笔记标题：未指定",
        options?.noteContent
          ? "正文来源：使用外部直写内容，跳过原创文案技能"
          : "正文来源：使用原创文案技能生成",
      ],
      data: {
        taskId: this.readStringField(result, "taskId")
          || this.readNestedStringField(result, ["task", "id"])
          || this.readNestedStringField(result, ["item", "taskId"]),
        workId: this.readNestedStringField(result, ["item", "id"]),
        result,
      },
      links: [{ label: "打开作品结果", url: "/xiaohongshu" }],
    });
  }

  async createXiaohongshuRewriteNote(
    headers: HeadersMap,
    options?: {
      sourceMaterialId?: string;
      productId?: string;
      accountRole?: string;
      includeMarketingPlan?: boolean;
      additionalInstruction?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const access = await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "edit", auth);

    const sourceMaterialId = String(options?.sourceMaterialId || "").trim();
    if (!sourceMaterialId) {
      throw new BadRequestException("请提供 sourceMaterialId");
    }

    const result = await this.worksService.generateXiaohongshuRewriteNote(
      brandId,
      {
        sourceMaterialId,
        productId: options?.productId,
        accountRole: this.normalizeOriginalAccountRole(options?.accountRole),
        includeMarketingPlan: typeof options?.includeMarketingPlan === "boolean" ? options.includeMarketingPlan : false,
        additionalInstruction: this.normalizeSafeInstruction(options?.additionalInstruction, "小红书二创补充要求") || undefined,
      },
      auth,
      access.role,
    ) as Record<string, unknown>;

    return this.buildSummaryResponse({
      title: "小红书二创图文任务已受理",
      summary: "已为当前品牌发起小红书二创图文任务。",
      highlights: [
        `素材：${sourceMaterialId}`,
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
        options?.accountRole ? `账号人设：${options.accountRole}` : "账号人设：系统默认",
      ],
      data: {
        taskId: this.readStringField(result, "taskId")
          || this.readNestedStringField(result, ["task", "id"])
          || this.readNestedStringField(result, ["item", "taskId"]),
        workId: this.readNestedStringField(result, ["item", "id"]),
        result,
      },
      links: [{ label: "打开作品结果", url: "/xiaohongshu" }],
    });
  }

  async createWechatArticle(
    headers: HeadersMap,
    options?: {
      title?: string;
      summary?: string;
      content?: string;
      author?: string;
      styleHint?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const title = String(options?.title || "").trim() || "公众号文章草稿";
    const summary = String(options?.summary || "").trim() || "围绕品牌当前重点生成公众号文章摘要。";
    const content = [String(options?.content || "").trim(), String(options?.styleHint || "").trim()]
      .filter(Boolean)
      .join("\n\n") || "请围绕品牌当前重点生成公众号文章内容。";

    const result = await this.worksService.generateWechatArticleDraft(
      brandId,
      {
        title,
        summary,
        author: String(options?.author || "").trim() || undefined,
        content,
      },
      auth,
    ) as Record<string, unknown>;

    return this.buildSummaryResponse({
      title: "公众号文章任务已受理",
      summary: `已为当前品牌发起公众号文章生成任务，标题为“${title}”。`,
      highlights: [
        `标题：${title}`,
        options?.styleHint ? `补充要求：${options.styleHint}` : "补充要求：使用系统默认策略",
      ],
      data: {
        draftId: this.readStringField(result, "id"),
        taskId: this.readStringField(result, "taskId"),
        result,
      },
      links: [{ label: "打开公众号结果", url: "/wechat" }],
    });
  }

  async handleMcpRpcRequest(headers: HeadersMap, message?: Record<string, unknown>) {
    const method = String(message?.method || "").trim();
    const id = message?.id;
    if (!method) {
      return this.buildJsonRpcError(id, -32600, "Invalid Request");
    }

    if (method === "notifications/initialized") {
      return {};
    }

    if (method === "initialize") {
      return this.buildJsonRpcResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: OPENCLAW_MCP_SERVER_INFO,
      });
    }

    if (method === "ping") {
      return this.buildJsonRpcResult(id, {});
    }

    if (method === "tools/list") {
      return this.buildJsonRpcResult(id, {
        tools: OPENCLAW_MCP_TOOLS,
      });
    }

    if (method === "tools/call") {
      const params = (message?.params && typeof message.params === "object" && !Array.isArray(message.params))
        ? message.params as Record<string, unknown>
        : {};
      const toolName = String(params.name || "").trim();
      const toolArgs = this.readToolArguments(params.arguments ?? params.args);
      if (!toolName) {
        return this.buildToolErrorResult(id, "缺少工具名称");
      }
      try {
        const payload = await this.handleToolCall(headers, toolName, toolArgs);
        return this.buildJsonRpcResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(payload, null, 2),
            },
          ],
          isError: false,
        });
      } catch (error) {
        const details = error && typeof error === "object"
          ? {
              message: error instanceof Error ? error.message : String(error),
            }
          : undefined;
        return this.buildToolErrorResult(id, error instanceof Error ? error.message : "工具调用失败", details);
      }
    }

    return this.buildJsonRpcError(id, -32601, `Method not found: ${method}`);
  }

  private async requireAuth(headers: HeadersMap): Promise<RequestAuthContext> {
    const installAuth = await this.openClawInstallationService.resolveInstallToken(headers);
    const auth = installAuth ?? await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return auth;
  }

  private async requireCurrentBrandId(auth: RequestAuthContext) {
    if (auth.brandId) {
      return auth.brandId;
    }
    const brands = await this.authService.getBrands(auth);
    if (!brands.currentBrandId) {
      throw new UnauthorizedException("当前账号没有可用品牌");
    }
    return brands.currentBrandId;
  }

  private normalizeTimeRange(timeRange?: string) {
    const normalized = String(timeRange || "7d").trim().toLowerCase();
    const mapping: Record<string, number> = {
      "7d": 7,
      "14d": 14,
      "30d": 30,
      "90d": 90,
    };
    const days = mapping[normalized] ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return {
      raw: normalized,
      label: `${days} 天`,
      since,
    };
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit) || Number(limit) <= 0) {
      return 10;
    }
    return Math.min(50, Math.floor(Number(limit)));
  }

  private normalizePlatformType(platform?: string) {
    const normalized = String(platform || "").trim().toUpperCase();
    if (normalized === "XIAOHONGSHU" || normalized === "DOUYIN" || normalized === "VIDEO_CHANNEL" || normalized === "WECHAT_OA") {
      return normalized;
    }
    return undefined;
  }

  private normalizeDesignModule(module?: string): "image" | "html" | "deck" | "video" | undefined {
    const normalized = String(module || "").trim().toLowerCase();
    if (normalized === "image" || normalized === "html" || normalized === "deck" || normalized === "video") {
      return normalized;
    }
    return undefined;
  }

  private normalizeDouyinOriginalCopyType(value?: string) {
    const normalized = String(value || "").trim().toUpperCase();
    if (
      normalized === "VIEWPOINT"
      || normalized === "STORY"
      || normalized === "PROCESS"
      || normalized === "KNOWLEDGE"
      || normalized === "PLOT_SALES"
      || normalized === "SEEDING"
      || normalized === "LOCAL_SALES"
    ) {
      return normalized as "VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES";
    }
    return undefined;
  }

  private normalizeOriginalAccountRole(value?: string): "BRAND" | "STAFF" | "TALENT" | undefined {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "BRAND" || normalized === "STAFF" || normalized === "TALENT") {
      return normalized;
    }
    return undefined;
  }

  private normalizeImageCount(value?: number) {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.min(Math.max(Math.floor(Number(value)), 2), 10);
  }

  private filterTasks(tasks: TaskRecord[], brandId: string, timeRange?: string, taskTypes?: string[]) {
    const { since } = this.normalizeTimeRange(timeRange);
    const normalizedTaskTypes = new Set((taskTypes ?? []).map((item) => item.trim()).filter(Boolean));
    return tasks.filter((item) => {
      if (item.brandId !== brandId) {
        return false;
      }
      if (new Date(item.createdAt).getTime() < since.getTime()) {
        return false;
      }
      if (normalizedTaskTypes.size && !normalizedTaskTypes.has(item.taskType)) {
        return false;
      }
      return true;
    });
  }

  private buildTopCounts(items: string[], limit: number) {
    const counter = new Map<string, number>();
    for (const item of items.map((value) => value.trim()).filter(Boolean)) {
      counter.set(item, (counter.get(item) ?? 0) + 1);
    }
    return [...counter.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));
  }

  private normalizeFailureReason(errorMessage?: string) {
    const message = String(errorMessage || "").trim();
    if (!message) {
      return "未记录失败原因";
    }
    if (/timeout|超时/i.test(message)) {
      return "执行超时";
    }
    if (/权限|unauthorized|forbidden/i.test(message)) {
      return "权限不足";
    }
    if (/上传|文件|资料/i.test(message)) {
      return "资料或文件处理异常";
    }
    if (/image|图片|封面|配图/i.test(message)) {
      return "图片生成异常";
    }
    if (/publish|发布|公众号/i.test(message)) {
      return "发布链路异常";
    }
    return message.length > 32 ? `${message.slice(0, 32)}...` : message;
  }

  private isAfterTimeRange(value: string, since: Date) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    return timestamp >= since.getTime();
  }

  private normalizeWechatWorkflowImageUpload(input: unknown): GeneratedAssetUploadPayload | undefined {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return undefined;
    }
    const source = (
      input
      && typeof (input as Record<string, unknown>).upload === "object"
      && !Array.isArray((input as Record<string, unknown>).upload)
    )
      ? (input as { upload: Record<string, unknown> }).upload
      : input as Record<string, unknown>;
    const dataBase64 = typeof source.dataBase64 === "string" ? source.dataBase64.trim() : "";
    const tempFilePath = typeof source.tempFilePath === "string" ? source.tempFilePath.trim() : "";
    if (!dataBase64 && !tempFilePath) {
      return undefined;
    }
    return {
      fileName: typeof source.fileName === "string" ? source.fileName.trim() : undefined,
      contentType: typeof source.contentType === "string" ? source.contentType.trim() : undefined,
      dataBase64: dataBase64 || undefined,
      tempFilePath: tempFilePath || undefined,
    };
  }

  private buildWechatWorkflowInlineImageFileName(
    workflowId: string,
    role: "cover" | "body",
    index: number,
    upload?: GeneratedAssetUploadPayload,
  ) {
    const originalFileName = String(upload?.fileName || "").trim();
    if (originalFileName) {
      return originalFileName;
    }
    return `wechat-workflow-${workflowId}-${role}-${index + 1}.bin`;
  }

  private async getWechatWorkflowCreativeMaterialFileUrl(brandId: string, materialId: string) {
    const scopes = ["wechat", "brand_growth", "douyin", "xiaohongshu", "geo"];
    for (const scope of scopes) {
      const matched = await this.openClawCreativeMaterialService.getMaterialById(brandId, scope, materialId);
      if (matched?.fileUrl) {
        return matched.fileUrl;
      }
    }
    return undefined;
  }

  private async resolveWechatWorkflowImageSource(
    brandId: string,
    workflowId: string,
    input: unknown,
    role: "cover" | "body",
    index = 0,
  ) {
    if (typeof input === "string") {
      const directUrl = input.trim();
      return directUrl || undefined;
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return undefined;
    }
    const record = input as Record<string, unknown>;
    const directUrl = typeof record.fileUrl === "string"
      ? record.fileUrl.trim()
      : (typeof record.url === "string" ? record.url.trim() : "");
    if (directUrl) {
      return directUrl;
    }
    const materialId = typeof record.materialId === "string" ? record.materialId.trim() : "";
    if (materialId) {
      const materialFileUrl = await this.getWechatWorkflowCreativeMaterialFileUrl(brandId, materialId);
      if (!materialFileUrl) {
        throw new BadRequestException(`未找到可用的公众号图片素材：${materialId}`);
      }
      return materialFileUrl;
    }
    const upload = this.normalizeWechatWorkflowImageUpload(record);
    if (!upload) {
      return undefined;
    }
    const saved = await this.worksService.uploadGeneratedAsset(
      brandId,
      this.buildWechatWorkflowInlineImageFileName(workflowId, role, index, upload),
      upload,
    );
    return saved.url;
  }

  private async normalizeWechatWorkflowSetImagesPayload(
    brandId: string,
    workflowId: string,
    payload: Record<string, unknown>,
  ): Promise<Parameters<WorksService["setWechatWorkflowImages"]>[2]> {
    const directCoverImageUrl = typeof payload.coverImageUrl === "string" ? payload.coverImageUrl.trim() : "";
    const directBodyImageUrls = Array.isArray(payload.bodyImageUrls)
      ? payload.bodyImageUrls.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const coverImageUrl = await this.resolveWechatWorkflowImageSource(
      brandId,
      workflowId,
      payload.coverImage,
      "cover",
      0,
    );
    const bodyImages = Array.isArray(payload.bodyImages) ? payload.bodyImages : [];
    const normalizedBodyImages = (
      await Promise.all(
        bodyImages.map((item, index) =>
          this.resolveWechatWorkflowImageSource(brandId, workflowId, item, "body", index)),
      )
    ).filter((item): item is string => Boolean(item));
    return {
      ...(payload as Parameters<WorksService["setWechatWorkflowImages"]>[2]),
      coverImageUrl: coverImageUrl || directCoverImageUrl || undefined,
      bodyImageUrls: [...directBodyImageUrls, ...normalizedBodyImages],
    };
  }

  async manageWechatWorkflow(
    headers: HeadersMap,
    options?: {
      action?: string;
      workflowId?: string;
      draftId?: string;
      historyId?: string;
      limit?: number;
      payload?: Record<string, unknown>;
    },
  ) {
    const action = String(options?.action || "").trim().toLowerCase();
    const payload = options?.payload ?? {};
    if (!action) {
      throw new BadRequestException("请提供 action");
    }

    switch (action) {
      case "list_drafts":
        return this.getWechatArticleDrafts(headers, { limit: options?.limit });
      case "get_preferences":
        return this.getWechatWorkflowPreferences(headers);
      case "save_preferences": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        await this.authService.assertBrandPermission(brandId, "wechat.config", "edit", auth);
        const result = await this.worksService.saveWechatWorkflowPreferences(
          brandId,
          payload as Parameters<WorksService["saveWechatWorkflowPreferences"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "公众号工作流偏好已更新",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "list_accounts":
        return this.getWechatOfficialAccounts(headers);
      case "list_workflows":
        return this.getWechatWorkflowSessions(headers, { limit: options?.limit });
      case "get_workflow":
        return this.getWechatWorkflowSessionDetail(headers, { workflowId: options?.workflowId });
      case "create_workflow": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.createWechatWorkflow(
          brandId,
          payload as Parameters<WorksService["createWechatWorkflow"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "公众号工作流已创建",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "update_input": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.updateWechatWorkflowInput(
          brandId,
          workflowId,
          payload as Parameters<WorksService["updateWechatWorkflowInput"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "公众号工作流输入已更新",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "generate_article": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.generateWechatWorkflowArticle(brandId, workflowId, auth);
        return this.buildManagedOperationResponse({
          title: "公众号文章生成已触发",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "wechat",
        });
      }
      case "set_article":
      case "update_article": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.updateWechatWorkflowArticle(
          brandId,
          workflowId,
          payload as Parameters<WorksService["updateWechatWorkflowArticle"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "公众号文章内容已更新",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "generate_images": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.generateWechatWorkflowImages(
          brandId,
          workflowId,
          payload as Parameters<WorksService["generateWechatWorkflowImages"]>[2],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "公众号配图生成已触发",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "wechat",
        });
      }
      case "set_images": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const normalizedPayload = await this.normalizeWechatWorkflowSetImagesPayload(brandId, workflowId, payload);
        const result = await this.worksService.setWechatWorkflowImages(
          brandId,
          workflowId,
          normalizedPayload,
        );
        return this.buildManagedOperationResponse({
          title: "公众号图片已写入工作流",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "generate_html": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.generateWechatWorkflowHtml(
          brandId,
          workflowId,
          payload as Parameters<WorksService["generateWechatWorkflowHtml"]>[2],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "公众号 HTML 排版已生成",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "wechat",
        });
      }
      case "set_html": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.setWechatWorkflowHtml(
          brandId,
          workflowId,
          payload as Parameters<WorksService["setWechatWorkflowHtml"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "公众号 HTML 已写入工作流",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "update_html_style": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.updateWechatWorkflowHtmlStyle(
          brandId,
          workflowId,
          payload as Parameters<WorksService["updateWechatWorkflowHtmlStyle"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "公众号 HTML 样式已更新",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "update_publish_confirm": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.updateWechatWorkflowPublishConfirm(
          brandId,
          workflowId,
          payload as Parameters<WorksService["updateWechatWorkflowPublishConfirm"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "公众号发布确认已更新",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "check_publish":
        return this.checkWechatWorkflowPublishReadiness(headers, { workflowId: options?.workflowId });
      case "list_publish_history":
        return this.getWechatPublishHistory(headers, { limit: options?.limit });
      case "get_publish_history":
        return this.getWechatPublishHistoryDetail(headers, { historyId: options?.historyId });
      case "update_draft": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const draftId = String(options?.draftId || "").trim();
        if (!draftId) {
          throw new BadRequestException("请提供 draftId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.updateWechatArticleDraft(
          brandId,
          draftId,
          payload as Parameters<WorksService["updateWechatArticleDraft"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "公众号草稿已更新",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "publish_article":
        return this.publishWechatArticle(headers, { draftId: options?.draftId });
      case "publish_workflow":
        return this.publishWechatWorkflow(headers, { workflowId: options?.workflowId });
      case "delete_workflow": {
        const auth = await this.requireAuth(headers);
        const brandId = await this.requireCurrentBrandId(auth);
        const workflowId = String(options?.workflowId || "").trim();
        if (!workflowId) {
          throw new BadRequestException("请提供 workflowId");
        }
        await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
        const result = await this.worksService.deleteWechatWorkflow(brandId, workflowId);
        return this.buildManagedOperationResponse({
          title: "公众号工作流已删除",
          action,
          data: result,
          url: "/wechat",
          label: "打开公众号工作台",
          resourceKind: "wechat",
        });
      }
      case "retry_publish_history":
        return this.retryWechatPublishHistory(headers, { historyId: options?.historyId });
      default:
        throw new BadRequestException(`不支持的 manage_wechat_workflow action: ${action}`);
    }
  }

  async manageBrandLibrary(
    headers: HeadersMap,
    options?: {
      action?: string;
      productId?: string;
      knowledgeBaseId?: string;
      fileId?: string;
      limit?: number;
      platform?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const action = String(options?.action || "").trim().toLowerCase();
    const payload = options?.payload ?? {};
    if (!action) {
      throw new BadRequestException("请提供 action");
    }

    switch (action) {
      case "get_archive_summary":
        return this.getBrandArchiveSummary(headers);
      case "get_archive_survey":
        return this.getBrandArchiveSurvey(headers, { limit: options?.limit });
      case "get_competitor_accounts":
        return this.getBrandCompetitorAccounts(headers, {
          platform: options?.platform,
          limit: options?.limit,
        });
      case "get_industry_feeds":
        return this.getBrandIndustryFeeds(headers, { limit: options?.limit });
      case "get_business_assets":
        return this.getBrandBusinessAssets(headers, { limit: options?.limit });
      default:
        break;
    }

    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);

    switch (action) {
      case "update_background": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.background", "edit", auth);
        const result = await this.brandsService.updateBackground(
          brandId,
          payload as Parameters<BrandsService["updateBackground"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "品牌背景已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "brand_archive",
        });
      }
      case "create_product": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.products", "edit", auth);
        const result = await this.brandsService.createProduct(
          brandId,
          payload as Parameters<BrandsService["createProduct"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "产品资料已新增",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "brand_archive",
        });
      }
      case "update_product": {
        const productId = String(options?.productId || "").trim();
        if (!productId) {
          throw new BadRequestException("请提供 productId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.products", "edit", auth);
        const result = await this.brandsService.updateProduct(
          brandId,
          productId,
          payload as Parameters<BrandsService["updateProduct"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "产品资料已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "brand_archive",
        });
      }
      case "delete_product": {
        const productId = String(options?.productId || "").trim();
        if (!productId) {
          throw new BadRequestException("请提供 productId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.products", "edit", auth);
        const result = await this.brandsService.deleteProduct(brandId, productId);
        return this.buildManagedOperationResponse({
          title: "产品资料已删除",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "brand_archive",
        });
      }
      case "upsert_survey": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.survey", "edit", auth);
        const result = await this.brandsService.upsertSurvey(
          brandId,
          payload as Parameters<BrandsService["upsertSurvey"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "品牌建档问卷已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "brand_archive_survey",
        });
      }
      case "replace_platform_accounts": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);
        const result = await this.brandsService.replacePlatformAccounts(
          brandId,
          payload as Parameters<BrandsService["replacePlatformAccounts"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "品牌平台账号已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "brand_archive",
        });
      }
      case "replace_competitor_accounts": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);
        const result = await this.brandsService.replaceCompetitorAccounts(
          brandId,
          payload as Parameters<BrandsService["replaceCompetitorAccounts"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "竞品账号已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "competitor_account",
        });
      }
      case "replace_industry_feeds": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.industryFeeds", "edit", auth);
        const result = await this.brandsService.replaceIndustryFeeds(
          brandId,
          payload as Parameters<BrandsService["replaceIndustryFeeds"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "行业资料已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "industry_feed",
        });
      }
      case "replace_business_assets": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);
        const result = await this.brandsService.replaceBusinessAssets(
          brandId,
          payload as Parameters<BrandsService["replaceBusinessAssets"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "业务资产已更新",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "business_asset",
        });
      }
      case "list_knowledge_bases": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "view", auth);
        const result = await this.brandsService.listBusinessKnowledgeBases(brandId);
        return this.buildManagedOperationResponse({
          title: "业务知识库列表",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "create_knowledge_base": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);
        const result = await this.brandsService.createBusinessKnowledgeBase(
          brandId,
          payload as Parameters<BrandsService["createBusinessKnowledgeBase"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "业务知识库已创建",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "update_knowledge_base": {
        const knowledgeBaseId = String(options?.knowledgeBaseId || "").trim();
        if (!knowledgeBaseId) {
          throw new BadRequestException("请提供 knowledgeBaseId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);
        const result = await this.brandsService.updateBusinessKnowledgeBase(
          brandId,
          knowledgeBaseId,
          payload as Parameters<BrandsService["updateBusinessKnowledgeBase"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "业务知识库已更新",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "delete_knowledge_base": {
        const knowledgeBaseId = String(options?.knowledgeBaseId || "").trim();
        if (!knowledgeBaseId) {
          throw new BadRequestException("请提供 knowledgeBaseId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);
        const result = await this.brandsService.deleteBusinessKnowledgeBase(brandId, knowledgeBaseId);
        return this.buildManagedOperationResponse({
          title: "业务知识库已删除",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "list_knowledge_base_files": {
        const knowledgeBaseId = String(options?.knowledgeBaseId || "").trim();
        if (!knowledgeBaseId) {
          throw new BadRequestException("请提供 knowledgeBaseId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "view", auth);
        const result = await this.brandsService.listBusinessKnowledgeBaseFiles(brandId, knowledgeBaseId);
        return this.buildManagedOperationResponse({
          title: "知识库文件列表",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "create_knowledge_base_files": {
        const knowledgeBaseId = String(options?.knowledgeBaseId || "").trim();
        if (!knowledgeBaseId) {
          throw new BadRequestException("请提供 knowledgeBaseId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);
        const result = await this.brandsService.createBusinessKnowledgeBaseFiles(
          brandId,
          knowledgeBaseId,
          payload as Parameters<BrandsService["createBusinessKnowledgeBaseFiles"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "知识库文件已新增",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "get_knowledge_base_file": {
        const knowledgeBaseId = String(options?.knowledgeBaseId || "").trim();
        const fileId = String(options?.fileId || "").trim();
        if (!knowledgeBaseId || !fileId) {
          throw new BadRequestException("请提供 knowledgeBaseId 和 fileId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "view", auth);
        const result = await this.brandsService.getBusinessKnowledgeBaseFileDetail(brandId, knowledgeBaseId, fileId);
        return this.buildManagedOperationResponse({
          title: "知识库文件详情",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "delete_knowledge_base_file": {
        const knowledgeBaseId = String(options?.knowledgeBaseId || "").trim();
        const fileId = String(options?.fileId || "").trim();
        if (!knowledgeBaseId || !fileId) {
          throw new BadRequestException("请提供 knowledgeBaseId 和 fileId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);
        const result = await this.brandsService.deleteBusinessKnowledgeBaseFile(brandId, knowledgeBaseId, fileId);
        return this.buildManagedOperationResponse({
          title: "知识库文件已删除",
          action,
          data: result,
          url: "/brand-growth/business-assets",
          label: "打开业务资产",
          resourceKind: "knowledge_base",
        });
      }
      case "upsert_feishu_binding": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);
        const result = await this.brandsService.upsertFeishuBinding(
          brandId,
          payload as Parameters<BrandsService["upsertFeishuBinding"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "飞书绑定已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长工作台",
          resourceKind: "brand_archive",
        });
      }
      default:
        throw new BadRequestException(`不支持的 manage_brand_library action: ${action}`);
    }
  }

  async manageGrowthReports(
    headers: HeadersMap,
    options?: {
      action?: string;
      reportId?: string;
      selectedDate?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const action = String(options?.action || "").trim().toLowerCase();
    const payload = options?.payload ?? {};
    if (!action) {
      throw new BadRequestException("请提供 action");
    }

    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);

    switch (action) {
      case "get_growth_workspace": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "view", auth);
        const result = await this.reportsService.getGrowthReportWorkspace(brandId);
        return this.buildManagedOperationResponse({
          title: "品牌增长报告工作区",
          action,
          data: result,
          url: "/brand-growth/reports",
          label: "打开品牌增长报告",
          resourceKind: "report",
        });
      }
      case "generate_growth_report":
        return this.createBrandGrowthReport(headers);
      case "update_growth_report": {
        const reportId = String(options?.reportId || "").trim();
        if (!reportId) {
          throw new BadRequestException("请提供 reportId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "edit", auth);
        const result = await this.reportsService.updateGrowthReport(
          brandId,
          reportId,
          payload as Parameters<ReportsService["updateGrowthReport"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "品牌增长报告已更新",
          action,
          data: result,
          url: "/brand-growth/reports",
          label: "打开品牌增长报告",
          resourceKind: "report",
        });
      }
      case "get_visual_growth_workspace": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.visualGrowthReport", "view", auth);
        const result = await this.reportsService.getVisualGrowthReportWorkspace(brandId);
        return this.buildManagedOperationResponse({
          title: "可视化增长报告工作区",
          action,
          data: result,
          url: "/brand-growth/reports",
          label: "打开品牌增长报告",
          resourceKind: "report",
        });
      }
      case "generate_visual_growth_report": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.visualGrowthReport", "edit", auth);
        const result = await this.reportsService.generateVisualGrowthReport(brandId);
        return this.buildManagedOperationResponse({
          title: "可视化增长报告已触发",
          action,
          data: result,
          url: "/brand-growth/reports",
          label: "打开品牌增长报告",
          resultStatus: "IN_PROGRESS",
          resourceKind: "report",
        });
      }
      case "update_visual_growth_report": {
        const reportId = String(options?.reportId || "").trim();
        if (!reportId) {
          throw new BadRequestException("请提供 reportId");
        }
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.visualGrowthReport", "edit", auth);
        const result = await this.reportsService.updateVisualGrowthReport(
          brandId,
          reportId,
          payload as Parameters<ReportsService["updateVisualGrowthReport"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "可视化增长报告已更新",
          action,
          data: result,
          url: "/brand-growth/reports",
          label: "打开品牌增长报告",
          resourceKind: "report",
        });
      }
      case "get_half_year_workspace": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.halfYearMarketingPlan", "view", auth);
        const result = await this.reportsService.getAnnualMarketingPlanWorkspace(brandId);
        return this.buildManagedOperationResponse({
          title: "半年营销规划工作区",
          action,
          data: result,
          url: "/brand-growth/half-year-marketing-plan",
          label: "打开半年营销规划",
          resourceKind: "report",
        });
      }
      case "generate_half_year_marketing_plan":
        return this.createHalfYearMarketingPlan(headers, {
          planningYear: typeof payload.planningYear === "string" ? payload.planningYear : undefined,
          focus: typeof payload.focus === "string" ? payload.focus : undefined,
        });
      case "get_xiaohongshu_marketing_plan_workspace": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "view", auth);
        const result = await this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
        return this.buildManagedOperationResponse({
          title: "小红书营销策划工作区",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "report",
        });
      }
      case "generate_xiaohongshu_marketing_plan": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "edit", auth);
        const result = await this.reportsService.generateXiaohongshuMarketingPlan(
          brandId,
          payload as Parameters<ReportsService["generateXiaohongshuMarketingPlan"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "小红书营销策划已触发",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "report",
        });
      }
      case "update_xiaohongshu_marketing_plan": {
        const reportId = String(options?.reportId || "").trim();
        if (!reportId) {
          throw new BadRequestException("请提供 reportId");
        }
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "edit", auth);
        const result = await this.reportsService.updateXiaohongshuMarketingPlan(
          brandId,
          reportId,
          payload as Parameters<ReportsService["updateXiaohongshuMarketingPlan"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "小红书营销策划已更新",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "report",
        });
      }
      case "delete_xiaohongshu_marketing_plan": {
        const reportId = String(options?.reportId || "").trim();
        if (!reportId) {
          throw new BadRequestException("请提供 reportId");
        }
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "edit", auth);
        const result = await this.reportsService.deleteXiaohongshuMarketingPlan(brandId, reportId);
        return this.buildManagedOperationResponse({
          title: "小红书营销策划已删除",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "report",
        });
      }
      case "get_douyin_marketing_plan_workspace": {
        await this.authService.assertBrandPermission(brandId, "douyin.plan", "view", auth);
        const result = await this.reportsService.getDouyinMarketingPlanWorkspace(brandId);
        return this.buildManagedOperationResponse({
          title: "抖音营销策划工作区",
          action,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "report",
        });
      }
      case "generate_douyin_marketing_plan": {
        await this.authService.assertBrandPermission(brandId, "douyin.plan", "edit", auth);
        const result = await this.reportsService.generateDouyinMarketingPlan(
          brandId,
          payload as Parameters<ReportsService["generateDouyinMarketingPlan"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "抖音营销策划已触发",
          action,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "report",
        });
      }
      case "update_douyin_marketing_plan": {
        const reportId = String(options?.reportId || "").trim();
        if (!reportId) {
          throw new BadRequestException("请提供 reportId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.plan", "edit", auth);
        const result = await this.reportsService.updateDouyinMarketingPlan(
          brandId,
          reportId,
          payload as Parameters<ReportsService["updateDouyinMarketingPlan"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "抖音营销策划已更新",
          action,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "report",
        });
      }
      case "delete_douyin_marketing_plan": {
        const reportId = String(options?.reportId || "").trim();
        if (!reportId) {
          throw new BadRequestException("请提供 reportId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.plan", "edit", auth);
        const result = await this.reportsService.deleteDouyinMarketingPlan(brandId, reportId);
        return this.buildManagedOperationResponse({
          title: "抖音营销策划已删除",
          action,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "report",
        });
      }
      case "get_douyin_hot_topic_candidates_workspace": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
        const result = await this.reportsService.getDouyinHotTopicCandidatesWorkspace(
          brandId,
          String(options?.selectedDate || "").trim() || undefined,
        );
        return this.buildManagedOperationResponse({
          title: "选题库工作区",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长策略",
          resourceKind: "report",
        });
      }
      case "generate_douyin_hot_topic_candidates": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
        const result = await this.reportsService.generateDouyinHotTopicCandidates(
          brandId,
          String(options?.selectedDate || payload.selectedDate || "").trim() || undefined,
        );
        return this.buildManagedOperationResponse({
          title: "选题库热点选题已触发",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长策略",
          resultStatus: "IN_PROGRESS",
          resourceKind: "report",
        });
      }
      case "update_douyin_topic_library": {
        await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
        const result = await this.reportsService.updateDouyinTopicLibrary(
          brandId,
          payload as Parameters<ReportsService["updateDouyinTopicLibrary"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "选题库已更新",
          action,
          data: result,
          url: "/brand-growth",
          label: "打开品牌增长策略",
          resourceKind: "report",
        });
      }
      case "get_xiaohongshu_marketing_calendar_workspace": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.calendar", "view", auth);
        const result = await this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
        return this.buildManagedOperationResponse({
          title: "小红书营销日历工作区",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "report",
        });
      }
      case "generate_xiaohongshu_marketing_calendar": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.calendar", "edit", auth);
        const result = await this.reportsService.generateXiaohongshuMarketingCalendar(
          brandId,
          payload as Parameters<ReportsService["generateXiaohongshuMarketingCalendar"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "小红书营销日历已触发",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "report",
        });
      }
      case "update_xiaohongshu_marketing_calendar": {
        const reportId = String(options?.reportId || "").trim();
        if (!reportId) {
          throw new BadRequestException("请提供 reportId");
        }
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.calendar", "edit", auth);
        const result = await this.reportsService.updateXiaohongshuMarketingCalendar(
          brandId,
          reportId,
          payload as Parameters<ReportsService["updateXiaohongshuMarketingCalendar"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "小红书营销日历已更新",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "report",
        });
      }
      default:
        throw new BadRequestException(`不支持的 manage_growth_reports action: ${action}`);
    }
  }

  async manageXiaohongshuVideo(
    headers: HeadersMap,
    options?: {
      action?: string;
      workId?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const action = String(options?.action || "").trim().toLowerCase();
    const payload = options?.payload ?? {};
    if (!action) {
      throw new BadRequestException("请提供 action");
    }

    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);

    switch (action) {
      case "list_works": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "view", auth);
        const result = await this.worksService.listXiaohongshuVideoWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "小红书视频笔记列表",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "xiaohongshu",
        });
      }
      case "list_providers": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "view", auth);
        const result = await this.worksService.listXiaohongshuVideoProviderOptions();
        return this.buildManagedOperationResponse({
          title: "小红书视频模型选项",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "xiaohongshu",
        });
      }
      case "list_storyboard_image_providers": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "view", auth);
        const result = await this.worksService.listXiaohongshuVideoStoryboardImageOptions();
        return this.buildManagedOperationResponse({
          title: "小红书故事板生图模型选项",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "xiaohongshu",
        });
      }
      case "generate": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        const result = await this.worksService.generateXiaohongshuVideoNote(
          brandId,
          payload as Parameters<WorksService["generateXiaohongshuVideoNote"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "小红书视频笔记已触发",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "xiaohongshu",
        });
      }
      case "regenerate_storyboard": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        const result = await this.worksService.regenerateXiaohongshuVideoStoryboard(
          brandId,
          workId,
          payload as Parameters<WorksService["regenerateXiaohongshuVideoStoryboard"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "小红书故事板重生已触发",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "xiaohongshu",
        });
      }
      case "continue_video": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        const result = await this.worksService.continueXiaohongshuVideoGeneration(
          brandId,
          workId,
          payload as Parameters<WorksService["continueXiaohongshuVideoGeneration"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "小红书视频继续生成已触发",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "xiaohongshu",
        });
      }
      case "recover": {
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        const result = await this.worksService.recoverXiaohongshuVideoGeneration(
          brandId,
          payload as Parameters<WorksService["recoverXiaohongshuVideoGeneration"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "小红书视频找回已触发",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "xiaohongshu",
        });
      }
      case "update": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        const result = await this.worksService.updateXiaohongshuVideoNote(
          brandId,
          workId,
          payload as Parameters<WorksService["updateXiaohongshuVideoNote"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "小红书视频笔记已更新",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "xiaohongshu",
        });
      }
      case "delete": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        const result = await this.worksService.deleteXiaohongshuVideoNote(brandId, workId);
        return this.buildManagedOperationResponse({
          title: "小红书视频笔记已删除",
          action,
          data: result,
          url: "/xiaohongshu",
          label: "打开小红书工作区",
          resourceKind: "xiaohongshu",
        });
      }
      default:
        throw new BadRequestException(`不支持的 manage_xiaohongshu_video action: ${action}`);
    }
  }

  async manageDouyinVideoProduction(
    headers: HeadersMap,
    options?: {
      section?: string;
      action?: string;
      workId?: string;
      taskId?: string;
      voiceId?: string;
      templateId?: string;
      customPersonId?: string;
      appKey?: string;
      mediaAssetId?: string;
      limit?: number;
      page?: number;
      size?: number;
      sort?: string;
      tagIds?: number[];
      payload?: Record<string, unknown>;
    },
  ) {
    const section = String(options?.section || "").trim().toLowerCase();
    const action = String(options?.action || "").trim().toLowerCase();
    const payload = options?.payload ?? {};
    if (!section || !action) {
      throw new BadRequestException("请提供 section 和 action");
    }

    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const tagIds = Array.isArray(options?.tagIds)
      ? options?.tagIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
      : [];

    switch (`${section}:${action}`) {
      case "video:list_works": {
        await this.authService.assertBrandPermission(brandId, "douyin.video", "view", auth);
        const result = await this.worksService.listDouyinVideoWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "抖音视频列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "video:list_providers": {
        await this.authService.assertBrandPermission(brandId, "douyin.video", "view", auth);
        const result = await this.worksService.listDouyinVideoProviderOptions();
        return this.buildManagedOperationResponse({
          title: "抖音视频模型选项",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "video:list_storyboard_image_providers": {
        await this.authService.assertBrandPermission(brandId, "douyin.video", "view", auth);
        const result = await this.worksService.listDouyinVideoStoryboardImageOptions();
        return this.buildManagedOperationResponse({
          title: "抖音故事板生图模型选项",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "video:generate": {
        await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
        const result = await this.worksService.generateDouyinVideoNote(
          brandId,
          payload as Parameters<WorksService["generateDouyinVideoNote"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "抖音视频已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "video:regenerate_storyboard": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
        const result = await this.worksService.regenerateDouyinVideoStoryboard(
          brandId,
          workId,
          payload as Parameters<WorksService["regenerateDouyinVideoStoryboard"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "抖音故事板重生已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "video:continue_video": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
        const result = await this.worksService.continueDouyinVideoGeneration(
          brandId,
          workId,
          payload as Parameters<WorksService["continueDouyinVideoGeneration"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "抖音视频继续生成已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "video:recover": {
        await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
        const result = await this.worksService.recoverDouyinVideoGeneration(
          brandId,
          payload as Parameters<WorksService["recoverDouyinVideoGeneration"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "抖音视频找回已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "video:update": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
        const result = await this.worksService.updateDouyinVideoNote(
          brandId,
          workId,
          payload as Parameters<WorksService["updateDouyinVideoNote"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "抖音视频已更新",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "video:delete": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
        const result = await this.worksService.deleteDouyinVideoNote(brandId, workId);
        return this.buildManagedOperationResponse({
          title: "抖音视频已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "direct_video:list_works": {
        await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "view", auth);
        const result = await this.worksService.listDouyinDirectVideoWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "抖音直接生视频列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "direct_video:list_providers": {
        await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "view", auth);
        const result = await this.worksService.listDouyinDirectVideoProviderOptions();
        return this.buildManagedOperationResponse({
          title: "抖音直接生视频模型选项",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "direct_video:generate": {
        await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
        const result = await this.worksService.generateDouyinDirectVideo(
          brandId,
          payload as Parameters<WorksService["generateDouyinDirectVideo"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "抖音直接生视频已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "direct_video:continue_video": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
        const result = await this.worksService.continueDouyinDirectVideoGeneration(
          brandId,
          workId,
          payload as Parameters<WorksService["continueDouyinDirectVideoGeneration"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "抖音直接生视频继续生成已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "direct_video:recover": {
        await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
        const result = await this.worksService.recoverDouyinDirectVideoGeneration(
          brandId,
          payload as Parameters<WorksService["recoverDouyinDirectVideoGeneration"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "抖音直接生视频找回已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "direct_video:update": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
        const result = await this.worksService.updateDouyinDirectVideo(
          brandId,
          workId,
          payload as Parameters<WorksService["updateDouyinDirectVideo"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "抖音直接生视频已更新",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "direct_video:delete": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
        const result = await this.worksService.deleteDouyinDirectVideo(brandId, workId);
        return this.buildManagedOperationResponse({
          title: "抖音直接生视频已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "remix_short_video:list_works": {
        await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "view", auth);
        const result = await this.worksService.listDouyinRemixShortVideoWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "抖音混剪短视频列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "remix_short_video:generate": {
        await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "edit", auth);
        const result = await this.worksService.generateDouyinRemixShortVideo(
          brandId,
          payload as Parameters<WorksService["generateDouyinRemixShortVideo"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "抖音混剪短视频已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "remix_short_video:continue_video": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "edit", auth);
        const result = await this.worksService.continueDouyinRemixShortVideoGeneration(
          brandId,
          workId,
          payload as Parameters<WorksService["continueDouyinRemixShortVideoGeneration"]>[2],
        );
        return this.buildManagedOperationResponse({
          title: "抖音混剪短视频继续生成已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "remix_short_video:delete": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "edit", auth);
        const result = await this.worksService.deleteDouyinRemixShortVideo(brandId, workId);
        return this.buildManagedOperationResponse({
          title: "抖音混剪短视频已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开抖音工作台",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_template_tags": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinDigitalHumanTemplateTags(brandId);
        return this.buildManagedOperationResponse({
          title: "数字人模板标签列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_templates": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinDigitalHumanTemplates(brandId, {
          page: Number(options?.page || 1) || 1,
          size: Number(options?.size || 24) || 24,
          sort: String(options?.sort || "").trim() || undefined,
          tagIds,
        });
        return this.buildManagedOperationResponse({
          title: "数字人模板列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_voice_library": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinVoiceLibrary(brandId, {
          page: Number(options?.page || 1) || 1,
          size: Number(options?.size || 24) || 24,
        });
        return this.buildManagedOperationResponse({
          title: "数字人公共音色列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_custom_voices": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinCustomVoices(brandId, {
          page: Number(options?.page || 1) || 1,
          pageSize: Number(options?.size || 24) || 24,
        });
        return this.buildManagedOperationResponse({
          title: "我的数字人音色列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:create_custom_voice": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.createDouyinCustomVoice(
          brandId,
          payload as Parameters<WorksService["createDouyinCustomVoice"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "数字人自定义音色已提交",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "digital_human:delete_custom_voice": {
        const voiceId = String(options?.voiceId || "").trim();
        if (!voiceId) {
          throw new BadRequestException("请提供 voiceId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.deleteDouyinCustomVoice(brandId, voiceId, auth);
        return this.buildManagedOperationResponse({
          title: "数字人自定义音色已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:create_speech_task": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const speechPayload = {
          ...((payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>),
        } as Parameters<WorksService["createDouyinSpeechTask"]>[1];
        if (!String(speechPayload.audioManId || "").trim()) {
          speechPayload.audioManId = String(options?.voiceId || "").trim();
        }
        const result = await this.worksService.createDouyinSpeechTask(
          brandId,
          speechPayload,
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "数字人试听任务已提交",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "digital_human:get_speech_task": {
        const taskId = String(options?.taskId || "").trim();
        if (!taskId) {
          throw new BadRequestException("请提供 taskId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.getDouyinSpeechTaskDetail(brandId, taskId);
        return this.buildManagedOperationResponse({
          title: "数字人试听任务详情",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_video_works": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinDigitalHumanVideoWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "数字人作品列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_custom_persons": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinDigitalHumanCustomPersons(brandId);
        return this.buildManagedOperationResponse({
          title: "我的数字人列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:create_custom_person": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.createDouyinDigitalHumanCustomPerson(
          brandId,
          payload as Parameters<WorksService["createDouyinDigitalHumanCustomPerson"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "我的数字人创建已提交",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "digital_human:delete_custom_person": {
        const customPersonId = String(options?.customPersonId || "").trim();
        if (!customPersonId) {
          throw new BadRequestException("请提供 customPersonId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.deleteDouyinDigitalHumanCustomPerson(brandId, customPersonId, auth);
        return this.buildManagedOperationResponse({
          title: "我的数字人已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_favorites": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinDigitalHumanFavoriteTemplates(brandId, auth);
        return this.buildManagedOperationResponse({
          title: "数字人收藏模板列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:save_favorite": {
        const templateId = String(options?.templateId || payload.templateId || "").trim();
        if (!templateId) {
          throw new BadRequestException("请提供 templateId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.saveDouyinDigitalHumanFavoriteTemplate(brandId, templateId, auth);
        return this.buildManagedOperationResponse({
          title: "数字人模板已收藏",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:delete_favorite": {
        const templateId = String(options?.templateId || "").trim();
        if (!templateId) {
          throw new BadRequestException("请提供 templateId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.deleteDouyinDigitalHumanFavoriteTemplate(brandId, templateId, auth);
        return this.buildManagedOperationResponse({
          title: "数字人模板收藏已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:list_script_templates": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinDigitalHumanScriptTemplates(brandId, auth);
        return this.buildManagedOperationResponse({
          title: "数字人脚本模板列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:create_script_template": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.createDouyinDigitalHumanScriptTemplate(
          brandId,
          payload as Parameters<WorksService["createDouyinDigitalHumanScriptTemplate"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "数字人脚本模板已创建",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:update_script_template": {
        const templateId = String(options?.templateId || "").trim();
        if (!templateId) {
          throw new BadRequestException("请提供 templateId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.updateDouyinDigitalHumanScriptTemplate(
          brandId,
          templateId,
          payload as Parameters<WorksService["updateDouyinDigitalHumanScriptTemplate"]>[2],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "数字人脚本模板已更新",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:delete_script_template": {
        const templateId = String(options?.templateId || "").trim();
        if (!templateId) {
          throw new BadRequestException("请提供 templateId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.deleteDouyinDigitalHumanScriptTemplate(brandId, templateId, auth);
        return this.buildManagedOperationResponse({
          title: "数字人脚本模板已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:generate_script": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.generateDouyinDigitalHumanScript(
          brandId,
          payload as Parameters<WorksService["generateDouyinDigitalHumanScript"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "数字人口播脚本已生成",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "digital_human:generate_video": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.generateDouyinDigitalHumanVideo(
          brandId,
          payload as Parameters<WorksService["generateDouyinDigitalHumanVideo"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "数字人视频已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "digital_human:generate_complete_video": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.generateDouyinDigitalHumanCompleteVideo(
          brandId,
          payload as Parameters<WorksService["generateDouyinDigitalHumanCompleteVideo"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "数字人整片视频已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "digital_human:recover_video": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.recoverDouyinDigitalHumanVideo(
          brandId,
          payload as Parameters<WorksService["recoverDouyinDigitalHumanVideo"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "数字人视频找回已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "digital_human:delete_video": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.deleteDouyinDigitalHumanVideo(brandId, workId);
        return this.buildManagedOperationResponse({
          title: "数字人视频已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "lip_sync:list_works": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
        const result = await this.worksService.listDouyinLipSyncWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "数字人口型驱动列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "lip_sync:generate": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.generateDouyinLipSync(
          brandId,
          payload as Parameters<WorksService["generateDouyinLipSync"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "数字人口型驱动已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "lip_sync:recover": {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.recoverDouyinLipSync(
          brandId,
          payload as Parameters<WorksService["recoverDouyinLipSync"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "数字人口型驱动找回已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "lip_sync:delete": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        const result = await this.worksService.deleteDouyinLipSync(brandId, workId, auth);
        return this.buildManagedOperationResponse({
          title: "数字人口型驱动作品已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开数字人工作区",
          resourceKind: "douyin",
        });
      }
      case "runninghub:list_apps": {
        await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "view", auth);
        const result = await this.worksService.listDouyinRunningHubApps(brandId);
        return this.buildManagedOperationResponse({
          title: "RunningHub 应用列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开 RunningHub 工作台",
          resourceKind: "douyin",
        });
      }
      case "runninghub:get_app_detail": {
        const appKey = String(options?.appKey || "").trim();
        if (!appKey) {
          throw new BadRequestException("请提供 appKey");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "view", auth);
        const result = await this.worksService.getDouyinRunningHubAppDetail(brandId, appKey);
        return this.buildManagedOperationResponse({
          title: "RunningHub 应用详情",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开 RunningHub 工作台",
          resourceKind: "douyin",
        });
      }
      case "runninghub:list_works": {
        await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "view", auth);
        const result = await this.worksService.listDouyinRunningHubWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "RunningHub 作品列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开 RunningHub 工作台",
          resourceKind: "douyin",
        });
      }
      case "runninghub:generate": {
        const appKey = String(options?.appKey || "").trim();
        if (!appKey) {
          throw new BadRequestException("请提供 appKey");
        }
        const runningHubPayload = (payload && typeof payload === "object" ? payload : {}) as Parameters<WorksService["createDouyinRunningHubWork"]>[2];
        if (!Array.isArray(runningHubPayload.nodeInfoList) || !runningHubPayload.nodeInfoList.length) {
          throw new BadRequestException("RunningHub generate 前请先调用 section=runninghub action=get_app_detail 获取 nodeInfoList 模板，再回填 fieldValue 后提交 payload.nodeInfoList。");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "edit", auth);
        const result = await this.worksService.createDouyinRunningHubWork(
          brandId,
          appKey,
          runningHubPayload,
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "RunningHub 任务已触发",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开 RunningHub 工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "runninghub:delete": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "edit", auth);
        const result = await this.worksService.deleteDouyinRunningHubWork(brandId, workId, auth);
        return this.buildManagedOperationResponse({
          title: "RunningHub 作品已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开 RunningHub 工作台",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:list_works": {
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "view", auth);
        const result = await this.worksService.listDouyinAdPreAuditWorks(brandId);
        return this.buildManagedOperationResponse({
          title: "广告预审列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:get_config": {
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "view", auth);
        const result = await this.worksService.getDouyinAdPreAuditConfig(brandId);
        return this.buildManagedOperationResponse({
          title: "广告预审配置",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:save_config": {
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
        const result = await this.worksService.saveDouyinAdPreAuditConfig(
          brandId,
          payload as Parameters<WorksService["saveDouyinAdPreAuditConfig"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "广告预审配置已更新",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:list_media_assets": {
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "view", auth);
        const result = await this.worksService.listDouyinAdPreAuditMediaAssets(brandId);
        return this.buildManagedOperationResponse({
          title: "广告预审素材列表",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:create_upload": {
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
        const result = await this.worksService.createDouyinAdPreAuditUpload(
          brandId,
          payload as Parameters<WorksService["createDouyinAdPreAuditUpload"]>[1],
        );
        return this.buildManagedOperationResponse({
          title: "广告预审上传任务已创建",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:refresh_upload": {
        const mediaAssetId = String(options?.mediaAssetId || "").trim();
        if (!mediaAssetId) {
          throw new BadRequestException("请提供 mediaAssetId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
        const result = await this.worksService.refreshDouyinAdPreAuditUpload(brandId, mediaAssetId);
        return this.buildManagedOperationResponse({
          title: "广告预审上传状态已刷新",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:create": {
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
        const result = await this.worksService.createDouyinAdPreAudit(
          brandId,
          payload as Parameters<WorksService["createDouyinAdPreAudit"]>[1],
          auth,
        );
        return this.buildManagedOperationResponse({
          title: "广告预审任务已提交",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:refresh": {
        const taskId = String(options?.taskId || "").trim();
        if (!taskId) {
          throw new BadRequestException("请提供 taskId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
        const result = await this.worksService.refreshDouyinAdPreAudit(brandId, taskId);
        return this.buildManagedOperationResponse({
          title: "广告预审结果已刷新",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resultStatus: "IN_PROGRESS",
          resourceKind: "douyin",
        });
      }
      case "ad_preaudit:delete": {
        const workId = String(options?.workId || "").trim();
        if (!workId) {
          throw new BadRequestException("请提供 workId");
        }
        await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
        const result = await this.worksService.deleteDouyinAdPreAudit(brandId, workId);
        return this.buildManagedOperationResponse({
          title: "广告预审记录已删除",
          action: `${section}:${action}`,
          data: result,
          url: "/douyin",
          label: "打开广告预审工作台",
          resourceKind: "douyin",
        });
      }
      default:
        throw new BadRequestException(`不支持的 manage_douyin_video_production 操作: ${section}:${action}`);
    }
  }

  private buildManagedOperationResponse<TData>(payload: {
    title: string;
    action: string;
    data: TData;
    url: string;
    label: string;
    resultStatus?: OpenClawResultStatus;
    resourceKind?: string;
    highlights?: string[];
  }) {
    return this.buildSummaryResponse({
      title: payload.title,
      summary: `已执行动作 ${payload.action}。`,
      highlights: payload.highlights?.length ? payload.highlights : [`动作：${payload.action}`],
      data: payload.data,
      links: [{ label: payload.label, url: payload.url }],
      resultStatus: payload.resultStatus,
      resourceKind: payload.resourceKind,
    });
  }

  private buildSummaryResponse<TData>(payload: {
    title: string;
    summary: string;
    highlights: string[];
    data: TData;
    links: Array<{ label: string; url: string }>;
    resultStatus?: OpenClawResultStatus;
    resourceKind?: string;
    nextActions?: OpenClawNextAction[];
  }): OpenClawSummaryResponse<TData> {
    const entry = payload.links[0];
    const resource = this.buildResourceReference(payload.resourceKind, payload.data, entry?.url);
    const resultStatus = payload.resultStatus || this.inferResultStatus(payload.title, payload.summary, payload.highlights);
    const nextActions = payload.nextActions || this.buildNextActions(resultStatus, entry, resource);
    return {
      status: "success",
      title: payload.title,
      summary: payload.summary,
      highlights: payload.highlights,
      data: payload.data,
      links: payload.links,
      entry,
      resultStatus,
      resource,
      nextActions,
      allowed: true,
      requiresConfirmation: resultStatus === "ACTION_REQUIRED",
    };
  }

  private inferResultStatus(title: string, summary: string, highlights: string[]): OpenClawResultStatus {
    const text = [title, summary, ...highlights].join(" ").trim();
    if (/还未具备|未具备|缺少|请先|确认未完成|待确认|未完成/.test(text)) {
      return "ACTION_REQUIRED";
    }
    if (/已受理|已提交|排队|处理中|运行中|重新放回排队|重新排队|已提交发布/.test(text)) {
      return "IN_PROGRESS";
    }
    return "COMPLETED";
  }

  private buildResourceReference<TData>(
    resourceKind: string | undefined,
    data: TData,
    entryUrl?: string,
  ) {
    const relatedIds = this.collectCandidateIds(data);
    const primaryId = relatedIds[0];
    return {
      kind: resourceKind || this.inferResourceKind(entryUrl),
      primaryId,
      relatedIds,
    };
  }

  private inferResourceKind(entryUrl?: string) {
    const url = String(entryUrl || "").trim().toLowerCase();
    if (!url) {
      return "generic";
    }
    if (url.includes("/wechat")) {
      return "wechat";
    }
    if (url.includes("/xiaohongshu")) {
      return "xiaohongshu";
    }
    if (url.includes("/douyin")) {
      return "douyin";
    }
    if (url.includes("/personal-center/works")) {
      return "design_work";
    }
    if (url.includes("/brand-growth/business-assets")) {
      return "knowledge_base";
    }
    if (url.includes("/brand-growth/reports")) {
      return "report";
    }
    if (url.includes("/brand-growth/tasks")) {
      return "task";
    }
    if (url.includes("/skills")) {
      return "skill";
    }
    return "generic";
  }

  private buildNextActions(
    resultStatus: OpenClawResultStatus,
    entry: { label: string; url: string } | undefined,
    resource?: { kind: string; primaryId?: string; relatedIds: string[] },
  ): OpenClawNextAction[] {
    const actions: OpenClawNextAction[] = [];
    if (entry) {
      actions.push({
        label: entry.label,
        action: "open_page",
        target: entry.url,
      });
    }

    if (resultStatus === "IN_PROGRESS" && resource?.primaryId) {
      actions.push({
        label: "继续查看状态",
        action: "check_status",
        target: resource.primaryId,
      });
    }

    if (resultStatus === "ACTION_REQUIRED") {
      actions.push({
        label: "继续补充信息",
        action: "continue_in_chat",
        target: resource?.primaryId,
      });
      actions.push({
        label: "确认后再执行",
        action: "confirm",
        target: resource?.primaryId,
      });
    }

    if (resultStatus === "COMPLETED" && resource?.primaryId) {
      actions.push({
        label: "需要时可重试或继续",
        action: "retry",
        target: resource.primaryId,
      });
    }

    return actions;
  }

  private collectCandidateIds(value: unknown): string[] {
    const candidates = [
      this.readCandidateId(value, ["taskId"]),
      this.readCandidateId(value, ["workId"]),
      this.readCandidateId(value, ["draftId"]),
      this.readCandidateId(value, ["workflowId"]),
      this.readCandidateId(value, ["historyId"]),
      this.readCandidateId(value, ["reportId"]),
      this.readCandidateId(value, ["knowledgeBaseId"]),
      this.readCandidateId(value, ["item", "id"]),
      this.readCandidateId(value, ["task", "id"]),
      this.readCandidateId(value, ["item", "taskId"]),
      this.readCandidateId(value, ["latestTask", "id"]),
      this.readCandidateId(value, ["latest", "id"]),
      this.readCandidateId(value, ["id"]),
    ].filter((item): item is string => Boolean(item));
    return Array.from(new Set(candidates));
  }

  private readCandidateId(value: unknown, path: string[]): string | undefined {
    let current: unknown = value;
    for (const segment of path) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    const normalized = String(current || "").trim();
    return normalized || undefined;
  }

  private async loadTasks(auth: RequestAuthContext): Promise<TaskRecord[]> {
    return (await this.tasksService.listTasks(auth)) as unknown as TaskRecord[];
  }

  private async findTaskById(auth: RequestAuthContext, taskId: string) {
    const tasks = await this.loadTasks(auth);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new BadRequestException("未找到指定任务，或当前账号无权访问该任务");
    }
    return task;
  }

  private pickLatestKnowledgeBase(knowledgeBases: BrandBusinessKnowledgeBaseRecord[]) {
    return [...knowledgeBases].sort((left, right) => this.getTimestamp(right.updatedAt) - this.getTimestamp(left.updatedAt))[0];
  }

  private resolveKnowledgeBaseTarget(
    knowledgeBases: BrandBusinessKnowledgeBaseRecord[],
    knowledgeBaseId?: string,
    knowledgeBaseName?: string,
  ) {
    if (!knowledgeBases.length) {
      throw new BadRequestException("当前品牌下还没有知识库，请先创建知识库");
    }

    const normalizedId = String(knowledgeBaseId || "").trim();
    if (normalizedId) {
      const matchedById = knowledgeBases.find((item) => item.id === normalizedId);
      if (!matchedById) {
        throw new BadRequestException("未找到指定的知识库");
      }
      return matchedById;
    }

    const normalizedName = String(knowledgeBaseName || "").trim().toLowerCase();
    if (normalizedName) {
      const matchedByName = knowledgeBases.find((item) => item.name.trim().toLowerCase() === normalizedName);
      if (!matchedByName) {
        throw new BadRequestException("未找到指定名称的知识库");
      }
      return matchedByName;
    }

    if (knowledgeBases.length === 1) {
      return knowledgeBases[0];
    }

    throw new BadRequestException("当前品牌存在多个知识库，请补充 knowledgeBaseId 或 knowledgeBaseName");
  }

  private deriveKnowledgeFileTitle(fileUrl: string) {
    const normalizedUrl = String(fileUrl || "").trim();
    const fileName = normalizedUrl.split("?")[0]?.split("/").filter(Boolean).pop() || "";
    return fileName || "未命名资料";
  }

  private getTimestamp(value?: string) {
    const timestamp = new Date(String(value || "")).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private matchesSkillKey(
    skill: Awaited<ReturnType<UserSkillsService["listUserSkills"]>>[number],
    skillKey: string,
  ) {
    const candidates = [
      skill.id,
      skill.baseSkill.id,
      skill.baseSkill.slug,
      skill.baseSkill.name,
      skill.effectiveSkill.name,
    ];
    return candidates.some((item) => String(item || "").trim().toLowerCase() === skillKey);
  }

  private formatTaskStatus(status?: string) {
    switch (String(status || "").toUpperCase()) {
      case "QUEUED":
        return "排队中";
      case "RUNNING":
        return "执行中";
      case "SUCCESS":
        return "已完成";
      case "FAILED":
        return "失败";
      case "CANCELLED":
        return "已取消";
      default:
        return status || "未知";
    }
  }

  private normalizeVolcengineMusicTaskType(value: string | undefined) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "song" || normalized === "bgm") {
      return normalized as "song" | "bgm";
    }
    return undefined;
  }

  private deriveVolcengineMusicTaskTitle(taskType: "song" | "bgm", payload?: Record<string, unknown>) {
    const source = payload && typeof payload === "object" ? payload : {};
    const lyrics = this.readOptionalString((source as Record<string, unknown>).Lyrics)
      || this.readOptionalString((source as Record<string, unknown>).lyrics);
    const prompt = this.readOptionalString((source as Record<string, unknown>).Prompt)
      || this.readOptionalString((source as Record<string, unknown>).prompt)
      || this.readOptionalString((source as Record<string, unknown>).Text)
      || this.readOptionalString((source as Record<string, unknown>).text);
    const raw = lyrics || prompt || (taskType === "song" ? "人声歌曲任务" : "纯音乐任务");
    return raw.slice(0, 48);
  }

  private deriveVolcengineMusicMaterialTitle(
    taskType: "song" | "bgm" | undefined,
    taskId: string,
    prompt?: string,
    lyrics?: string,
  ) {
    const base = lyrics || prompt || (taskType === "bgm" ? "火山纯音乐" : "火山歌曲");
    return `${base.slice(0, 40)}_${taskId.slice(-6)}`;
  }

  private buildVolcengineMusicMaterialDescription(
    taskType: "song" | "bgm" | undefined,
    result: {
      status?: number;
      songDetail: {
        duration?: number;
        prompt?: string;
        genre?: string;
        mood?: string;
        lang?: string;
      };
    },
  ) {
    return [
      `来源：火山音乐${taskType === "bgm" ? "纯音乐" : "人声歌曲"}后付费接口`,
      `状态：${this.getVolcengineMusicStatusLabel(result.status)}`,
      typeof result.songDetail.duration === "number" ? `时长：${result.songDetail.duration.toFixed(2)} 秒` : "",
      result.songDetail.genre ? `曲风：${result.songDetail.genre}` : "",
      result.songDetail.mood ? `情绪：${result.songDetail.mood}` : "",
      result.songDetail.lang ? `语言：${result.songDetail.lang}` : "",
      result.songDetail.prompt ? `描述：${result.songDetail.prompt.slice(0, 120)}` : "",
    ].filter(Boolean).join("；");
  }

  private getVolcengineMusicStatusLabel(status?: number) {
    switch (status) {
      case 0:
        return "等待中";
      case 1:
        return "处理中";
      case 2:
        return "已完成";
      case 3:
        return "已失败";
      default:
        return "待确认";
    }
  }

  private deriveVolcengineMusicFileName(taskType: "song" | "bgm" | undefined, taskId: string, audioUrl?: string) {
    const extension = this.extractFileExtensionFromUrl(audioUrl) || "wav";
    return `${taskType === "bgm" ? "volcengine-bgm" : "volcengine-song"}-${taskId}.${extension}`;
  }

  private inferAudioMimeType(audioUrl?: string) {
    const extension = this.extractFileExtensionFromUrl(audioUrl);
    switch (extension) {
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "m4a":
        return "audio/mp4";
      case "flac":
        return "audio/flac";
      case "ogg":
        return "audio/ogg";
      default:
        return "audio/wav";
    }
  }

  private extractFileExtensionFromUrl(url?: string) {
    const normalized = String(url || "").trim();
    if (!normalized) {
      return undefined;
    }
    try {
      const pathname = new URL(normalized).pathname || "";
      const match = pathname.match(/\.([a-z0-9]+)$/i);
      return match?.[1]?.toLowerCase();
    } catch {
      const match = normalized.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
      return match?.[1]?.toLowerCase();
    }
  }

  private readStringField(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === "string" ? value : undefined;
  }

  private readNestedStringField(record: Record<string, unknown>, path: string[]) {
    let current: unknown = record;
    for (const key of path) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return typeof current === "string" ? current : undefined;
  }

  private readOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizeSafeInstruction(value: unknown, fieldLabel: string, strict = false) {
    return normalizeSafeText(value, { fieldLabel, strict });
  }

  private normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => this.normalizeSafeInstruction(item, "列表输入"))
      .filter((item): item is string => Boolean(item));
  }

  private normalizeXhsAccountEntries(
    value: Array<{ locator?: string; accountRole?: string }> | undefined,
  ): Array<{ locator: string; accountRole?: XhsAccountRole }> {
    const normalizedEntries: Array<{ locator: string; accountRole?: XhsAccountRole }> = [];
    for (const item of value ?? []) {
      const locator = this.normalizeSafeInstruction(item.locator, "小红书账号链接");
      if (!locator) {
        continue;
      }
      const normalizedEntry: { locator: string; accountRole?: XhsAccountRole } = { locator };
      const accountRole = this.normalizeOriginalAccountRole(item.accountRole);
      if (accountRole) {
        normalizedEntry.accountRole = accountRole;
      }
      normalizedEntries.push(normalizedEntry);
    }
    return normalizedEntries;
  }

  private buildXiaohongshuCollectionCounts(workspace: XhsCollectionWorkspace) {
    return {
      brandAccounts: workspace.brandAccounts.length,
      competitorAccounts: workspace.competitorAccounts.length,
      brandNotes: workspace.brandNotes.length,
      benchmarkNotes: workspace.benchmarkNotes.length,
      searchNotes: workspace.searchNotes.length,
      targetUsers: workspace.targetUsers.length,
    };
  }

  private buildDouyinCollectionCounts(workspace: DouyinCollectionWorkspace) {
    return {
      brandAccounts: workspace.brandAccounts.length,
      competitorAccounts: workspace.competitorAccounts.length,
      brandWorks: workspace.brandWorks.length,
      competitorWorks: workspace.competitorWorks.length,
      benchmarkWorks: workspace.benchmarkWorks.length,
      searchWorks: workspace.searchWorks.length,
      keywordRecommendations: workspace.keywordRecommendations.length,
      commentData: workspace.commentData.length,
      lowFanExplosiveWorks: workspace.lowFanExplosiveWorks.length,
      highCompletionRateWorks: workspace.highCompletionRateWorks.length,
      highLikeRateWorks: workspace.highLikeRateWorks.length,
      cityHotspots: workspace.cityHotspots.length,
    };
  }

  private normalizeDouyinContentTagSelection(options?: {
    primaryTagId?: number;
    secondaryTagId?: number;
  }) {
    const primaryTagId = typeof options?.primaryTagId === "number" && Number.isFinite(options.primaryTagId)
      ? Math.trunc(options.primaryTagId)
      : undefined;
    const secondaryTagId = typeof options?.secondaryTagId === "number" && Number.isFinite(options.secondaryTagId)
      ? Math.trunc(options.secondaryTagId)
      : undefined;
    if (!primaryTagId || !secondaryTagId) {
      return undefined;
    }
    return {
      primaryTagId,
      secondaryTagId,
    };
  }

  private scoreWebsiteFunctionIntentMatch(
    intent: string,
    item: OpenClawWebsiteFunctionCatalogItem,
    preferredDomain?: string | null,
  ) {
    const normalizedIntent = intent.toLowerCase();
    let score = 0;
    item.intentKeywords.forEach((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      if (normalizedIntent.includes(normalizedKeyword)) {
        score += normalizedKeyword.length >= 4 ? 3 : 2;
      }
    });
    if (normalizedIntent.includes(item.domainName.toLowerCase()) || normalizedIntent.includes(item.name.toLowerCase())) {
      score += 4;
    }
    if (preferredDomain && item.domainKey === preferredDomain) {
      score += 3;
    }
    if (/(发布|修改|恢复|重置|配置|删除|停用)/.test(normalizedIntent) && item.riskLevel === "high") {
      score += 1;
    }
    if (/(查看|总结|分析|概况|最近)/.test(normalizedIntent) && item.riskLevel === "low") {
      score += 1;
    }
    return score;
  }

  private hasProvidedExecutionInput(value: unknown) {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return true;
    }
    if (value && typeof value === "object") {
      return Object.keys(value).length > 0;
    }
    return false;
  }

  private buildWebsiteFunctionToolSequence(
    item: OpenClawWebsiteFunctionCatalogItem,
    status: "READY" | "NEED_INPUT" | "NEED_CONFIRMATION",
  ) {
    if (status === "NEED_INPUT") {
      return item.mcpTools.slice(0, Math.min(2, item.mcpTools.length));
    }
    if (status === "NEED_CONFIRMATION") {
      return item.mcpTools.slice(0, Math.min(3, item.mcpTools.length));
    }
    return item.mcpTools.slice(0, Math.min(4, item.mcpTools.length));
  }

  private buildPublishSessionSummary(payload: {
    data: Record<string, unknown>;
    platformLabel: string;
    channelLabel: string;
    workId?: string;
    title?: string;
    accountName?: string;
    token?: string;
    status?: string;
    expiresAt?: string;
    completedAt?: string;
    note?: string;
    accessHint?: string;
    primaryUrl?: string;
    primaryLabel: string;
    fallbackPageUrl: string;
  }) {
    const normalizedStatus = payload.status === "SUCCESS" || payload.status === "FAILED" || payload.status === "QUEUED"
      ? payload.status
      : "QUEUED";
    const resultStatus: OpenClawResultStatus = normalizedStatus === "SUCCESS"
      ? "COMPLETED"
      : normalizedStatus === "FAILED"
        ? "ACTION_REQUIRED"
        : "IN_PROGRESS";
    const summary = normalizedStatus === "SUCCESS"
      ? `${payload.platformLabel}${payload.channelLabel}已完成。`
      : normalizedStatus === "FAILED"
        ? `${payload.platformLabel}${payload.channelLabel}执行失败，请根据提示重新发起或手动处理。`
        : `${payload.platformLabel}${payload.channelLabel}仍在等待完成，请继续前往目标端处理。`;

    return this.buildSummaryResponse({
      title: `${payload.platformLabel}${payload.channelLabel}状态`,
      summary,
      highlights: [
        `状态：${normalizedStatus}`,
        `作品标题：${payload.title || "未命名作品"}`,
        `发布账号：${payload.accountName || "未指定账号"}`,
        `会话令牌：${payload.token || "未返回"}`,
        `过期时间：${payload.expiresAt || "未返回"}`,
        payload.completedAt ? `完成时间：${payload.completedAt}` : "完成时间：未完成",
        payload.note ? `结果备注：${payload.note}` : "结果备注：无",
        payload.accessHint || "可继续打开目标端完成处理。",
      ],
      data: payload.data,
      links: [
        ...(payload.primaryUrl ? [{ label: payload.primaryLabel, url: payload.primaryUrl }] : []),
        { label: "打开作品工作台", url: payload.fallbackPageUrl },
      ],
      resultStatus,
      resourceKind: "publish_session",
      nextActions: [
        ...(payload.primaryUrl && normalizedStatus !== "SUCCESS"
          ? [{ label: payload.primaryLabel, action: "open_page" as const, target: payload.primaryUrl }]
          : []),
        ...(payload.workId
          ? [{ label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: payload.workId }]
          : []),
      ],
    });
  }

  private async assertXiaohongshuPublishPermission(brandId: string, workId: string, auth: RequestAuthContext) {
    const work = await this.worksService.getXiaohongshuPublishableWork(brandId, workId);
    await this.authService.assertBrandPermission(
      brandId,
      work.workKind === "REWRITE" ? "xiaohongshu.remix" : "xiaohongshu.original",
      "edit",
      auth,
    );
    return work;
  }

  private async assertDouyinPublishPermission(brandId: string, workId: string, auth: RequestAuthContext) {
    const work = await this.worksService.getDouyinPublishableWork(brandId, workId);
    const permissionKey = work.workKind === "DIGITAL_HUMAN"
      ? "douyin.digitalHuman"
      : work.workKind === "VIDEO_DIRECT"
        ? "douyin.videoDirect"
        : "douyin.video";
    await this.authService.assertBrandPermission(brandId, permissionKey, "edit", auth);
    return work;
  }

  private readToolArguments(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private async handleToolCall(headers: HeadersMap, toolName: string, toolArgs: Record<string, unknown>) {
    switch (toolName) {
      case "get_website_function_catalog":
        return this.getWebsiteFunctionCatalog(headers, {
          domainKey: typeof toolArgs.domainKey === "string" ? toolArgs.domainKey : undefined,
          riskLevel: typeof toolArgs.riskLevel === "string" ? toolArgs.riskLevel : undefined,
        });
      case "get_website_function_detail":
        return this.getWebsiteFunctionDetail(headers, {
          functionKey: typeof toolArgs.functionKey === "string" ? toolArgs.functionKey : undefined,
        });
      case "route_website_function_by_intent":
        return this.routeWebsiteFunctionByIntent(headers, {
          intent: typeof toolArgs.intent === "string" ? toolArgs.intent : undefined,
          preferredDomain: typeof toolArgs.preferredDomain === "string" ? toolArgs.preferredDomain : undefined,
        });
      case "get_website_function_execution_plan":
        return this.getWebsiteFunctionExecutionPlan(headers, {
          functionKey: typeof toolArgs.functionKey === "string" ? toolArgs.functionKey : undefined,
          providedInputs: toolArgs.providedInputs && typeof toolArgs.providedInputs === "object" && !Array.isArray(toolArgs.providedInputs)
            ? toolArgs.providedInputs as Record<string, unknown>
            : undefined,
          confirmed: typeof toolArgs.confirmed === "boolean" ? toolArgs.confirmed : undefined,
        });
      case "get_current_brand_context":
        return this.getCurrentBrandContext(headers);
      case "get_task_detail":
        return this.getTaskDetail(headers, {
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
        });
      case "cancel_task":
        return this.cancelTask(headers, {
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
        });
      case "retry_task":
        return this.retryTask(headers, {
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
        });
      case "get_brand_products":
        return this.getBrandProducts(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_platform_accounts":
        return this.getPlatformAccounts(headers, {
          platform: typeof toolArgs.platform === "string" ? toolArgs.platform : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_brand_archive_summary":
        return this.getBrandArchiveSummary(headers);
      case "get_brand_archive_survey":
        return this.getBrandArchiveSurvey(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_brand_competitor_accounts":
        return this.getBrandCompetitorAccounts(headers, {
          platform: typeof toolArgs.platform === "string" ? toolArgs.platform : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_brand_industry_feeds":
        return this.getBrandIndustryFeeds(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_brand_business_assets":
        return this.getBrandBusinessAssets(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_xiaohongshu_collection_workspace":
        return this.getXiaohongshuCollectionWorkspace(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "sync_xiaohongshu_brand_accounts":
        return this.syncXiaohongshuBrandAccounts(headers, {
          accountLocators: Array.isArray(toolArgs.accountLocators)
            ? toolArgs.accountLocators.map((item) => String(item || ""))
            : undefined,
          accountEntries: Array.isArray(toolArgs.accountEntries)
            ? toolArgs.accountEntries.map((item) =>
                item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {})
              .map((item) => ({
                locator: typeof item.locator === "string" ? item.locator : undefined,
                accountRole: typeof item.accountRole === "string" ? item.accountRole : undefined,
              }))
            : undefined,
        });
      case "sync_xiaohongshu_competitor_accounts":
        return this.syncXiaohongshuCompetitorAccounts(headers, {
          accountLocators: Array.isArray(toolArgs.accountLocators)
            ? toolArgs.accountLocators.map((item) => String(item || ""))
            : undefined,
          accountEntries: Array.isArray(toolArgs.accountEntries)
            ? toolArgs.accountEntries.map((item) =>
                item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {})
              .map((item) => ({
                locator: typeof item.locator === "string" ? item.locator : undefined,
                accountRole: typeof item.accountRole === "string" ? item.accountRole : undefined,
              }))
            : undefined,
        });
      case "sync_xiaohongshu_brand_notes":
        return this.syncXiaohongshuBrandNotes(headers, {
          accountLocators: Array.isArray(toolArgs.accountLocators)
            ? toolArgs.accountLocators.map((item) => String(item || ""))
            : undefined,
        });
      case "sync_xiaohongshu_benchmark_notes":
        return this.syncXiaohongshuBenchmarkNotes(headers, {
          sourceUrls: Array.isArray(toolArgs.sourceUrls)
            ? toolArgs.sourceUrls.map((item) => String(item || ""))
            : undefined,
        });
      case "sync_xiaohongshu_search_notes":
        return this.syncXiaohongshuSearchNotes(headers, {
          keyword: typeof toolArgs.keyword === "string" ? toolArgs.keyword : undefined,
        });
      case "sync_xiaohongshu_target_users":
        return this.syncXiaohongshuTargetUsers(headers, {
          sourceUrls: Array.isArray(toolArgs.sourceUrls)
            ? toolArgs.sourceUrls.map((item) => String(item || ""))
            : undefined,
        });
      case "sync_xiaohongshu_feishu_workspace":
        return this.syncXiaohongshuFeishuWorkspace(headers);
      case "add_xiaohongshu_note_to_material_library":
        return this.addXiaohongshuNoteToMaterialLibrary(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
        });
      case "get_douyin_collection_workspace":
        return this.getDouyinCollectionWorkspace(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "sync_douyin_brand_accounts":
        return this.syncDouyinBrandAccounts(headers, {
          accountLocators: Array.isArray(toolArgs.accountLocators)
            ? toolArgs.accountLocators.map((item) => String(item || ""))
            : undefined,
          accountEntries: Array.isArray(toolArgs.accountEntries)
            ? toolArgs.accountEntries.map((item) =>
                item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {})
              .map((item) => ({
                locator: typeof item.locator === "string" ? item.locator : undefined,
                accountRole: typeof item.accountRole === "string" ? item.accountRole : undefined,
              }))
            : undefined,
        });
      case "sync_douyin_competitor_accounts":
        return this.syncDouyinCompetitorAccounts(headers, {
          accountLocators: Array.isArray(toolArgs.accountLocators)
            ? toolArgs.accountLocators.map((item) => String(item || ""))
            : undefined,
          accountEntries: Array.isArray(toolArgs.accountEntries)
            ? toolArgs.accountEntries.map((item) =>
                item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {})
              .map((item) => ({
                locator: typeof item.locator === "string" ? item.locator : undefined,
                accountRole: typeof item.accountRole === "string" ? item.accountRole : undefined,
              }))
            : undefined,
        });
      case "sync_douyin_benchmark_works":
        return this.syncDouyinBenchmarkWorks(headers, {
          benchmarkAwemeIds: Array.isArray(toolArgs.benchmarkAwemeIds)
            ? toolArgs.benchmarkAwemeIds.map((item) => String(item || ""))
            : undefined,
        });
      case "sync_douyin_search_works":
        return this.syncDouyinSearchWorks(headers, {
          searchKeyword: typeof toolArgs.searchKeyword === "string" ? toolArgs.searchKeyword : undefined,
          searchSortType: typeof toolArgs.searchSortType === "string" ? toolArgs.searchSortType : undefined,
          searchPublishTime: typeof toolArgs.searchPublishTime === "string" ? toolArgs.searchPublishTime : undefined,
          searchFilterDuration: typeof toolArgs.searchFilterDuration === "string" ? toolArgs.searchFilterDuration : undefined,
          searchContentType: typeof toolArgs.searchContentType === "string" ? toolArgs.searchContentType : undefined,
        });
      case "sync_douyin_comment_data":
        return this.syncDouyinCommentData(headers, {
          commentSourceUrls: Array.isArray(toolArgs.commentSourceUrls)
            ? toolArgs.commentSourceUrls.map((item) => String(item || ""))
            : undefined,
          commentPageRequests: Array.isArray(toolArgs.commentPageRequests)
            ? toolArgs.commentPageRequests.map((item) =>
                item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {})
              .map((item) => ({
                sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : undefined,
                cursor: typeof item.cursor === "string" ? item.cursor : undefined,
              }))
            : undefined,
        });
      case "sync_douyin_keyword_recommendations":
        return this.syncDouyinKeywordRecommendations(headers, {
          searchKeyword: typeof toolArgs.searchKeyword === "string" ? toolArgs.searchKeyword : undefined,
        });
      case "sync_douyin_low_fan_explosive_works":
        return this.syncDouyinLowFanExplosiveWorks(headers, {
          primaryTagId: typeof toolArgs.primaryTagId === "number" ? toolArgs.primaryTagId : undefined,
          secondaryTagId: typeof toolArgs.secondaryTagId === "number" ? toolArgs.secondaryTagId : undefined,
        });
      case "sync_douyin_high_completion_rate_works":
        return this.syncDouyinHighCompletionRateWorks(headers, {
          primaryTagId: typeof toolArgs.primaryTagId === "number" ? toolArgs.primaryTagId : undefined,
          secondaryTagId: typeof toolArgs.secondaryTagId === "number" ? toolArgs.secondaryTagId : undefined,
        });
      case "sync_douyin_high_like_rate_works":
        return this.syncDouyinHighLikeRateWorks(headers, {
          primaryTagId: typeof toolArgs.primaryTagId === "number" ? toolArgs.primaryTagId : undefined,
          secondaryTagId: typeof toolArgs.secondaryTagId === "number" ? toolArgs.secondaryTagId : undefined,
        });
      case "sync_douyin_city_hotspots":
        return this.syncDouyinCityHotspots(headers, {
          cityCode: typeof toolArgs.cityCode === "number" ? toolArgs.cityCode : undefined,
        });
      case "get_opportunity_insight_workspace":
        return this.getOpportunityInsightWorkspace(headers);
      case "generate_opportunity_insight_step_one":
        return this.generateOpportunityInsightStepOne(headers, {
          supplementInput: typeof toolArgs.supplementInput === "string" ? toolArgs.supplementInput : undefined,
        });
      case "generate_opportunity_insight_step_two":
        return this.generateOpportunityInsightStepTwo(headers, {
          supplementInput: typeof toolArgs.supplementInput === "string" ? toolArgs.supplementInput : undefined,
        });
      case "generate_opportunity_insight_step_three":
        return this.generateOpportunityInsightStepThree(headers, {
          supplementInput: typeof toolArgs.supplementInput === "string" ? toolArgs.supplementInput : undefined,
        });
      case "list_my_third_party_platforms":
        return this.listMyThirdPartyPlatforms(headers);
      case "check_my_third_party_platform_runtime_access":
        return this.checkMyThirdPartyPlatformRuntimeAccess(headers, {
          platformId: typeof toolArgs.platformId === "string" ? toolArgs.platformId : undefined,
          platformName: typeof toolArgs.platformName === "string" ? toolArgs.platformName : undefined,
          baseUrl: typeof toolArgs.baseUrl === "string" ? toolArgs.baseUrl : undefined,
        });
      case "update_my_third_party_platform_secret":
        return this.updateMyThirdPartyPlatformSecret(headers, {
          platformId: typeof toolArgs.platformId === "string" ? toolArgs.platformId : undefined,
          apiKey: typeof toolArgs.apiKey === "string" ? toolArgs.apiKey : undefined,
        });
      case "list_my_orders":
        return this.listMyOrders(headers, {
          status: typeof toolArgs.status === "string" ? toolArgs.status : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_personal_center_overview":
        return this.getPersonalCenterOverview(headers);
      case "list_brand_members":
        return this.listBrandMembers(headers);
      case "list_brand_invites":
        return this.listBrandInvites(headers);
      case "create_brand_invite_link":
        return this.createBrandInviteLink(headers, {
          role: typeof toolArgs.role === "string" ? toolArgs.role : undefined,
          note: typeof toolArgs.note === "string" ? toolArgs.note : undefined,
          expiresInDays: typeof toolArgs.expiresInDays === "number" ? toolArgs.expiresInDays : undefined,
        });
      case "revoke_brand_invite":
        return this.revokeBrandInvite(headers, {
          inviteId: typeof toolArgs.inviteId === "string" ? toolArgs.inviteId : undefined,
        });
      case "get_brand_permission_settings":
        return this.getBrandPermissionSettings(headers);
      case "list_my_brand_invites":
        return this.listMyBrandInvites(headers);
      case "list_my_brand_invite_notifications":
        return this.listMyBrandInviteNotifications(headers);
      case "accept_my_brand_invite":
        return this.acceptMyBrandInvite(headers, {
          inviteId: typeof toolArgs.inviteId === "string" ? toolArgs.inviteId : undefined,
        });
      case "get_recent_tasks_summary":
        return this.getRecentTasksSummary(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          taskTypes: Array.isArray(toolArgs.taskTypes)
            ? toolArgs.taskTypes.map((item) => String(item || "").trim()).filter(Boolean)
            : undefined,
        });
      case "get_failed_tasks_summary":
        return this.getFailedTasksSummary(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          taskTypes: Array.isArray(toolArgs.taskTypes)
            ? toolArgs.taskTypes.map((item) => String(item || "").trim()).filter(Boolean)
            : undefined,
        });
      case "get_recent_knowledge_files":
        return this.getRecentKnowledgeFiles(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          knowledgeBaseId: typeof toolArgs.knowledgeBaseId === "string" ? toolArgs.knowledgeBaseId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_skill_config_summary":
        return this.getSkillConfigSummary(headers, {
          skillKey: typeof toolArgs.skillKey === "string" ? toolArgs.skillKey : undefined,
        });
      case "get_skill_config_detail":
        return this.getSkillConfigDetail(headers, {
          skillId: typeof toolArgs.skillId === "string" ? toolArgs.skillId : undefined,
        });
      case "update_skill_config":
        return this.updateSkillConfig(headers, {
          skillId: typeof toolArgs.skillId === "string" ? toolArgs.skillId : undefined,
          displayName: typeof toolArgs.displayName === "string" ? toolArgs.displayName : undefined,
          defaultModel: typeof toolArgs.defaultModel === "string" ? toolArgs.defaultModel : undefined,
          description: typeof toolArgs.description === "string" ? toolArgs.description : undefined,
          promptOverrides: Array.isArray(toolArgs.promptOverrides)
            ? toolArgs.promptOverrides
              .map((item) =>
                item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {})
              .map((item) => ({
                promptId: typeof item.promptId === "string" ? item.promptId : "",
                content: typeof item.content === "string" ? item.content : undefined,
                modelName: typeof item.modelName === "string" ? item.modelName : undefined,
                temperature: typeof item.temperature === "number" ? item.temperature : undefined,
                maxTokens: typeof item.maxTokens === "number" ? item.maxTokens : undefined,
              }))
            : undefined,
        });
      case "reset_skill_to_platform_baseline":
        return this.resetSkillToPlatformBaseline(headers, {
          skillId: typeof toolArgs.skillId === "string" ? toolArgs.skillId : undefined,
        });
      case "submit_task_result_feedback":
        return this.submitTaskResultFeedback(headers, {
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
          rating: typeof toolArgs.rating === "string" ? toolArgs.rating : undefined,
          adopted: typeof toolArgs.adopted === "boolean" ? toolArgs.adopted : undefined,
          comment: typeof toolArgs.comment === "string" ? toolArgs.comment : undefined,
          feedbackTags: Array.isArray(toolArgs.feedbackTags)
            ? toolArgs.feedbackTags.map((item) => String(item || "").trim()).filter(Boolean)
            : undefined,
          skillId: typeof toolArgs.skillId === "string" ? toolArgs.skillId : undefined,
          promptId: typeof toolArgs.promptId === "string" ? toolArgs.promptId : undefined,
          promptVersion: typeof toolArgs.promptVersion === "string" ? toolArgs.promptVersion : undefined,
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          editedOutput: toolArgs.editedOutput && typeof toolArgs.editedOutput === "object" && !Array.isArray(toolArgs.editedOutput)
            ? toolArgs.editedOutput as Record<string, unknown>
            : undefined,
        });
      case "get_feedback_summary":
        return this.getFeedbackSummary(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          skillId: typeof toolArgs.skillId === "string" ? toolArgs.skillId : undefined,
          promptId: typeof toolArgs.promptId === "string" ? toolArgs.promptId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_feedback_analysis":
        return this.getFeedbackAnalysis(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          skillId: typeof toolArgs.skillId === "string" ? toolArgs.skillId : undefined,
          promptId: typeof toolArgs.promptId === "string" ? toolArgs.promptId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_prompt_optimization_suggestions":
        return this.getPromptOptimizationSuggestions(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          skillId: typeof toolArgs.skillId === "string" ? toolArgs.skillId : undefined,
          promptId: typeof toolArgs.promptId === "string" ? toolArgs.promptId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_wechat_article_drafts":
        return this.getWechatArticleDrafts(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_wechat_official_accounts":
        return this.getWechatOfficialAccounts(headers);
      case "get_wechat_workflow_sessions":
        return this.getWechatWorkflowSessions(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_wechat_publish_history":
        return this.getWechatPublishHistory(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_wechat_workflow_preferences":
        return this.getWechatWorkflowPreferences(headers);
      case "get_wechat_workflow_session_detail":
        return this.getWechatWorkflowSessionDetail(headers, {
          workflowId: typeof toolArgs.workflowId === "string" ? toolArgs.workflowId : undefined,
        });
      case "check_wechat_workflow_publish_readiness":
        return this.checkWechatWorkflowPublishReadiness(headers, {
          workflowId: typeof toolArgs.workflowId === "string" ? toolArgs.workflowId : undefined,
        });
      case "get_wechat_publish_history_detail":
        return this.getWechatPublishHistoryDetail(headers, {
          historyId: typeof toolArgs.historyId === "string" ? toolArgs.historyId : undefined,
        });
      case "publish_wechat_article":
        return this.publishWechatArticle(headers, {
          draftId: typeof toolArgs.draftId === "string" ? toolArgs.draftId : undefined,
        });
      case "create_xiaohongshu_mobile_draft_session":
        return this.createXiaohongshuMobileDraftSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "get_xiaohongshu_mobile_draft_session":
        return this.getXiaohongshuMobileDraftSession(headers, {
          token: typeof toolArgs.token === "string" ? toolArgs.token : undefined,
        });
      case "create_xiaohongshu_desktop_draft_session":
        return this.createXiaohongshuDesktopDraftSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "get_xiaohongshu_desktop_draft_session":
        return this.getXiaohongshuDesktopDraftSession(headers, {
          token: typeof toolArgs.token === "string" ? toolArgs.token : undefined,
        });
      case "create_douyin_mobile_publish_session":
        return this.createDouyinMobilePublishSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "get_douyin_mobile_publish_session":
        return this.getDouyinMobilePublishSession(headers, {
          token: typeof toolArgs.token === "string" ? toolArgs.token : undefined,
        });
      case "create_douyin_desktop_publish_session":
        return this.createDouyinDesktopPublishSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "get_douyin_desktop_publish_session":
        return this.getDouyinDesktopPublishSession(headers, {
          token: typeof toolArgs.token === "string" ? toolArgs.token : undefined,
        });
      case "publish_wechat_workflow":
        return this.publishWechatWorkflow(headers, {
          workflowId: typeof toolArgs.workflowId === "string" ? toolArgs.workflowId : undefined,
        });
      case "retry_wechat_publish_history":
        return this.retryWechatPublishHistory(headers, {
          historyId: typeof toolArgs.historyId === "string" ? toolArgs.historyId : undefined,
        });
      case "manage_wechat_workflow":
        return this.manageWechatWorkflow(headers, {
          action: typeof toolArgs.action === "string" ? toolArgs.action : undefined,
          workflowId: typeof toolArgs.workflowId === "string" ? toolArgs.workflowId : undefined,
          draftId: typeof toolArgs.draftId === "string" ? toolArgs.draftId : undefined,
          historyId: typeof toolArgs.historyId === "string" ? toolArgs.historyId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
          payload: toolArgs.payload && typeof toolArgs.payload === "object" && !Array.isArray(toolArgs.payload)
            ? toolArgs.payload as Record<string, unknown>
            : undefined,
        });
      case "manage_brand_library":
        return this.manageBrandLibrary(headers, {
          action: typeof toolArgs.action === "string" ? toolArgs.action : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          knowledgeBaseId: typeof toolArgs.knowledgeBaseId === "string" ? toolArgs.knowledgeBaseId : undefined,
          fileId: typeof toolArgs.fileId === "string" ? toolArgs.fileId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
          platform: typeof toolArgs.platform === "string" ? toolArgs.platform : undefined,
          payload: toolArgs.payload && typeof toolArgs.payload === "object" && !Array.isArray(toolArgs.payload)
            ? toolArgs.payload as Record<string, unknown>
            : undefined,
        });
      case "manage_growth_reports":
        return this.manageGrowthReports(headers, {
          action: typeof toolArgs.action === "string" ? toolArgs.action : undefined,
          reportId: typeof toolArgs.reportId === "string" ? toolArgs.reportId : undefined,
          selectedDate: typeof toolArgs.selectedDate === "string" ? toolArgs.selectedDate : undefined,
          payload: toolArgs.payload && typeof toolArgs.payload === "object" && !Array.isArray(toolArgs.payload)
            ? toolArgs.payload as Record<string, unknown>
            : undefined,
        });
      case "manage_xiaohongshu_video":
        return this.manageXiaohongshuVideo(headers, {
          action: typeof toolArgs.action === "string" ? toolArgs.action : undefined,
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          payload: toolArgs.payload && typeof toolArgs.payload === "object" && !Array.isArray(toolArgs.payload)
            ? toolArgs.payload as Record<string, unknown>
            : undefined,
        });
      case "manage_douyin_video_production":
        return this.manageDouyinVideoProduction(headers, {
          section: typeof toolArgs.section === "string" ? toolArgs.section : undefined,
          action: typeof toolArgs.action === "string" ? toolArgs.action : undefined,
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
          voiceId: typeof toolArgs.voiceId === "string" ? toolArgs.voiceId : undefined,
          templateId: typeof toolArgs.templateId === "string" ? toolArgs.templateId : undefined,
          customPersonId: typeof toolArgs.customPersonId === "string" ? toolArgs.customPersonId : undefined,
          appKey: typeof toolArgs.appKey === "string" ? toolArgs.appKey : undefined,
          mediaAssetId: typeof toolArgs.mediaAssetId === "string" ? toolArgs.mediaAssetId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
          page: typeof toolArgs.page === "number" ? toolArgs.page : undefined,
          size: typeof toolArgs.size === "number" ? toolArgs.size : undefined,
          sort: typeof toolArgs.sort === "string" ? toolArgs.sort : undefined,
          tagIds: Array.isArray(toolArgs.tagIds)
            ? toolArgs.tagIds.map((item) => Number(item)).filter((item) => Number.isFinite(item))
            : undefined,
          payload: toolArgs.payload && typeof toolArgs.payload === "object" && !Array.isArray(toolArgs.payload)
            ? toolArgs.payload as Record<string, unknown>
            : undefined,
        });
      case "get_design_workspace_options":
        return this.getDesignWorkspaceOptions(headers);
      case "get_recent_design_works":
        return this.getRecentDesignWorks(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_design_work":
        return this.createDesignWork(headers, {
          module: typeof toolArgs.module === "string" ? toolArgs.module : undefined,
          designType: typeof toolArgs.designType === "string" ? toolArgs.designType : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          calendarItemId: typeof toolArgs.calendarItemId === "string" ? toolArgs.calendarItemId : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          injectBrandProfile: typeof toolArgs.injectBrandProfile === "boolean" ? toolArgs.injectBrandProfile : undefined,
          referenceImage: toolArgs.referenceImage && typeof toolArgs.referenceImage === "object" && !Array.isArray(toolArgs.referenceImage)
            ? {
              fileName: typeof (toolArgs.referenceImage as Record<string, unknown>).fileName === "string"
                ? (toolArgs.referenceImage as Record<string, unknown>).fileName as string
                : undefined,
              contentType: typeof (toolArgs.referenceImage as Record<string, unknown>).contentType === "string"
                ? (toolArgs.referenceImage as Record<string, unknown>).contentType as string
                : undefined,
              dataBase64: typeof (toolArgs.referenceImage as Record<string, unknown>).dataBase64 === "string"
                ? (toolArgs.referenceImage as Record<string, unknown>).dataBase64 as string
                : undefined,
            }
            : undefined,
          referenceImageUrl: typeof toolArgs.referenceImageUrl === "string" ? toolArgs.referenceImageUrl : undefined,
          modelSelection: typeof toolArgs.modelSelection === "string" ? toolArgs.modelSelection : undefined,
          spec: typeof toolArgs.spec === "string" ? toolArgs.spec : undefined,
          additionalInstruction: typeof toolArgs.additionalInstruction === "string" ? toolArgs.additionalInstruction : undefined,
        });
      case "get_douyin_original_copy_options":
        return this.getDouyinOriginalCopyOptions(headers);
      case "get_recent_douyin_original_copies":
        return this.getRecentDouyinOriginalCopies(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_douyin_original_copy":
        return this.createDouyinOriginalCopy(headers, {
          copyType: typeof toolArgs.copyType === "string" ? toolArgs.copyType : undefined,
          topicId: typeof toolArgs.topicId === "string" ? toolArgs.topicId : undefined,
          calendarItemId: typeof toolArgs.calendarItemId === "string" ? toolArgs.calendarItemId : undefined,
          injectMarketingPlan: typeof toolArgs.injectMarketingPlan === "boolean" ? toolArgs.injectMarketingPlan : undefined,
          userRequirement: typeof toolArgs.userRequirement === "string" ? toolArgs.userRequirement : undefined,
        });
      case "get_douyin_remix_copy_options":
        return this.getDouyinRemixCopyOptions(headers);
      case "get_recent_douyin_remix_copies":
        return this.getRecentDouyinRemixCopies(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_douyin_remix_copy":
        return this.createDouyinRemixCopy(headers, {
          materialId: typeof toolArgs.materialId === "string" ? toolArgs.materialId : undefined,
          injectBrandProfile: typeof toolArgs.injectBrandProfile === "boolean" ? toolArgs.injectBrandProfile : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          injectMarketingPlan: typeof toolArgs.injectMarketingPlan === "boolean" ? toolArgs.injectMarketingPlan : undefined,
          userRequirement: typeof toolArgs.userRequirement === "string" ? toolArgs.userRequirement : undefined,
        });
      case "get_xiaohongshu_marketing_calendar_options":
        return this.getXiaohongshuMarketingCalendarOptions(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_xiaohongshu_material_library_items":
        return this.getXiaohongshuMaterialLibraryItems(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_xiaohongshu_original_reference_templates":
        return this.getXiaohongshuOriginalReferenceTemplates(headers, {
          categoryId: typeof toolArgs.categoryId === "string" ? toolArgs.categoryId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_recent_xiaohongshu_original_works":
        return this.getRecentXiaohongshuOriginalWorks(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_openclaw_lobster_diaries":
        return this.getOpenClawLobsterDiaries(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_openclaw_lobster_diary":
        return this.createOpenClawLobsterDiary(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          diaryDate: typeof toolArgs.diaryDate === "string" ? toolArgs.diaryDate : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          content: typeof toolArgs.content === "string" ? toolArgs.content : undefined,
        });
      case "delete_openclaw_lobster_diary":
        return this.deleteOpenClawLobsterDiary(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          diaryId: typeof toolArgs.diaryId === "string" ? toolArgs.diaryId : undefined,
        });
      case "get_openclaw_daily_plans":
        return this.getOpenClawDailyPlans(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_openclaw_daily_plan":
        return this.createOpenClawDailyPlan(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          planDate: typeof toolArgs.planDate === "string" ? toolArgs.planDate : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          content: typeof toolArgs.content === "string" ? toolArgs.content : undefined,
        });
      case "delete_openclaw_daily_plan":
        return this.deleteOpenClawDailyPlan(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          planId: typeof toolArgs.planId === "string" ? toolArgs.planId : undefined,
        });
      case "create_volcengine_music_task":
        return this.createVolcengineMusicTask(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          taskType: typeof toolArgs.taskType === "string" ? toolArgs.taskType : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          payload: toolArgs.payload && typeof toolArgs.payload === "object" && !Array.isArray(toolArgs.payload)
            ? toolArgs.payload as Record<string, unknown>
            : undefined,
        });
      case "get_volcengine_music_task":
        return this.getVolcengineMusicTask(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
          taskType: typeof toolArgs.taskType === "string" ? toolArgs.taskType : undefined,
          saveToCreativeMaterial: typeof toolArgs.saveToCreativeMaterial === "boolean" ? toolArgs.saveToCreativeMaterial : undefined,
          materialTitle: typeof toolArgs.materialTitle === "string" ? toolArgs.materialTitle : undefined,
          materialDescription: typeof toolArgs.materialDescription === "string" ? toolArgs.materialDescription : undefined,
          materialType: typeof toolArgs.materialType === "string" ? toolArgs.materialType : undefined,
        });
      case "get_openclaw_creative_materials":
        return this.getOpenClawCreativeMaterials(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_openclaw_creative_material":
        return this.createOpenClawCreativeMaterial(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          description: typeof toolArgs.description === "string" ? toolArgs.description : undefined,
          materialType: typeof toolArgs.materialType === "string" ? toolArgs.materialType : undefined,
          fileUrl: typeof toolArgs.fileUrl === "string" ? toolArgs.fileUrl : undefined,
          fileName: typeof toolArgs.fileName === "string" ? toolArgs.fileName : undefined,
          mimeType: typeof toolArgs.mimeType === "string" ? toolArgs.mimeType : undefined,
          textContent: typeof toolArgs.textContent === "string" ? toolArgs.textContent : undefined,
          upload: toolArgs.upload && typeof toolArgs.upload === "object" && !Array.isArray(toolArgs.upload)
            ? {
                fileName: typeof (toolArgs.upload as Record<string, unknown>).fileName === "string"
                  ? (toolArgs.upload as Record<string, unknown>).fileName as string
                  : undefined,
                contentType: typeof (toolArgs.upload as Record<string, unknown>).contentType === "string"
                  ? (toolArgs.upload as Record<string, unknown>).contentType as string
                  : undefined,
                dataBase64: typeof (toolArgs.upload as Record<string, unknown>).dataBase64 === "string"
                  ? (toolArgs.upload as Record<string, unknown>).dataBase64 as string
                  : undefined,
              }
            : undefined,
        });
      case "delete_openclaw_creative_material":
        return this.deleteOpenClawCreativeMaterial(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          materialId: typeof toolArgs.materialId === "string" ? toolArgs.materialId : undefined,
        });
      case "get_openclaw_video_works":
        return this.getOpenClawVideoWorks(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_openclaw_geo_visibility_reports":
        return this.getOpenClawGeoVisibilityReports(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_openclaw_geo_visibility_report":
        return this.createOpenClawGeoVisibilityReport(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          description: typeof toolArgs.description === "string" ? toolArgs.description : undefined,
          htmlContent: typeof toolArgs.htmlContent === "string" ? toolArgs.htmlContent : undefined,
        });
      case "delete_openclaw_geo_visibility_report":
        return this.deleteOpenClawGeoVisibilityReport(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          reportId: typeof toolArgs.reportId === "string" ? toolArgs.reportId : undefined,
        });
      case "create_openclaw_video_work":
        return this.createOpenClawVideoWork(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          description: typeof toolArgs.description === "string" ? toolArgs.description : undefined,
          scriptContent: typeof toolArgs.scriptContent === "string" ? toolArgs.scriptContent : undefined,
          coverImageUrl: typeof toolArgs.coverImageUrl === "string" ? toolArgs.coverImageUrl : undefined,
          videoUrl: typeof toolArgs.videoUrl === "string" ? toolArgs.videoUrl : undefined,
        });
      case "delete_openclaw_video_work":
        return this.deleteOpenClawVideoWork(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
        });
      case "create_openclaw_video_work_douyin_desktop_publish_session":
        return this.createOpenClawVideoWorkDouyinDesktopPublishSession(headers, {
          workspaceScope: typeof toolArgs.workspaceScope === "string" ? toolArgs.workspaceScope : undefined,
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "get_latest_brand_growth_report_summary":
        return this.getLatestBrandGrowthReportSummary(headers);
      case "create_brand_growth_report":
        return this.createBrandGrowthReport(headers, {
          goal: typeof toolArgs.goal === "string" ? toolArgs.goal : undefined,
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
        });
      case "create_half_year_marketing_plan":
        return this.createHalfYearMarketingPlan(headers, {
          planningYear: typeof toolArgs.planningYear === "string" ? toolArgs.planningYear : undefined,
          focus: typeof toolArgs.focus === "string" ? toolArgs.focus : undefined,
        });
      case "create_knowledge_base":
        return this.createKnowledgeBase(headers, {
          name: typeof toolArgs.name === "string" ? toolArgs.name : undefined,
          description: typeof toolArgs.description === "string" ? toolArgs.description : undefined,
        });
      case "upload_knowledge_base_files":
        return this.uploadKnowledgeBaseFiles(headers, {
          knowledgeBaseId: typeof toolArgs.knowledgeBaseId === "string" ? toolArgs.knowledgeBaseId : undefined,
          knowledgeBaseName: typeof toolArgs.knowledgeBaseName === "string" ? toolArgs.knowledgeBaseName : undefined,
          items: Array.isArray(toolArgs.items)
            ? toolArgs.items.map((item) => {
                const record = item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {};
                return {
                  title: typeof record.title === "string" ? record.title : undefined,
                  description: typeof record.description === "string" ? record.description : undefined,
                  sourceName: typeof record.sourceName === "string" ? record.sourceName : undefined,
                  fileUrl: typeof record.fileUrl === "string" ? record.fileUrl : undefined,
                  priority: typeof record.priority === "number" ? record.priority : undefined,
                };
              })
            : undefined,
        });
      case "create_xiaohongshu_original_note":
        return this.createXiaohongshuOriginalNote(headers, {
          calendarItemId: typeof toolArgs.calendarItemId === "string" ? toolArgs.calendarItemId : undefined,
          customTopicName: typeof toolArgs.customTopicName === "string" ? toolArgs.customTopicName : undefined,
          topic: typeof toolArgs.topic === "string" ? toolArgs.topic : undefined,
          accountRole: typeof toolArgs.accountRole === "string" ? toolArgs.accountRole : undefined,
          imageCount: typeof toolArgs.imageCount === "number" ? toolArgs.imageCount : undefined,
          includeMarketingPlan: typeof toolArgs.includeMarketingPlan === "boolean" ? toolArgs.includeMarketingPlan : undefined,
          additionalInstruction: typeof toolArgs.additionalInstruction === "string" ? toolArgs.additionalInstruction : undefined,
          noteTitle: typeof toolArgs.noteTitle === "string" ? toolArgs.noteTitle : undefined,
          noteContent: typeof toolArgs.noteContent === "string" ? toolArgs.noteContent : undefined,
          styleHint: typeof toolArgs.styleHint === "string" ? toolArgs.styleHint : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
        });
      case "create_xiaohongshu_rewrite_note":
        return this.createXiaohongshuRewriteNote(headers, {
          sourceMaterialId: typeof toolArgs.sourceMaterialId === "string" ? toolArgs.sourceMaterialId : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          accountRole: typeof toolArgs.accountRole === "string" ? toolArgs.accountRole : undefined,
          includeMarketingPlan: typeof toolArgs.includeMarketingPlan === "boolean" ? toolArgs.includeMarketingPlan : undefined,
          additionalInstruction: typeof toolArgs.additionalInstruction === "string" ? toolArgs.additionalInstruction : undefined,
        });
      case "create_wechat_article":
        return this.createWechatArticle(headers, {
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          summary: typeof toolArgs.summary === "string" ? toolArgs.summary : undefined,
          content: typeof toolArgs.content === "string" ? toolArgs.content : undefined,
          author: typeof toolArgs.author === "string" ? toolArgs.author : undefined,
          styleHint: typeof toolArgs.styleHint === "string" ? toolArgs.styleHint : undefined,
        });
      case "get_unified_material_library_items":
        return this.getUnifiedMaterialLibraryItems(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "add_douyin_work_to_material_library":
        return this.addDouyinWorkToMaterialLibrary(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
        });
      case "add_wechat_article_to_material_library":
        return this.addWechatArticleToMaterialLibrary(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
        });
      case "remove_xiaohongshu_note_from_material_library":
        return this.removeXiaohongshuNoteFromMaterialLibrary(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
        });
      case "remove_douyin_work_from_material_library":
        return this.removeDouyinWorkFromMaterialLibrary(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
        });
      case "get_wechat_collection_workspace":
        return this.getWechatCollectionWorkspace(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "sync_wechat_brand_accounts":
        return this.syncWechatBrandAccounts(headers, {
          ghUsername: typeof toolArgs.ghUsername === "string" ? toolArgs.ghUsername : undefined,
        });
      case "fetch_wechat_brand_articles":
        return this.fetchWechatBrandArticles(headers, {
          ghUsername: typeof toolArgs.ghUsername === "string" ? toolArgs.ghUsername : undefined,
          offset: typeof toolArgs.offset === "string" ? toolArgs.offset : undefined,
        });
      case "sync_wechat_benchmark_articles":
        return this.syncWechatBenchmarkArticles(headers, {
          articleUrls: Array.isArray(toolArgs.articleUrls)
            ? toolArgs.articleUrls.map((item) => String(item || ""))
            : undefined,
        });
      case "sync_wechat_search_articles":
        return this.syncWechatSearchArticles(headers, {
          searchKeyword: typeof toolArgs.searchKeyword === "string" ? toolArgs.searchKeyword : undefined,
        });
      case "update_wechat_article_stats":
        return this.updateWechatArticleStats(headers, {
          articleUrl: typeof toolArgs.articleUrl === "string" ? toolArgs.articleUrl : undefined,
        });
      case "delete_xhs_collected_note":
        return this.deleteXhsCollectedNote(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
        });
      case "delete_douyin_collected_work":
        return this.deleteDouyinCollectedWork(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
        });
      case "delete_wechat_collected_article":
        return this.deleteWechatCollectedArticle(headers, {
          assetId: typeof toolArgs.assetId === "string" ? toolArgs.assetId : undefined,
          kind: typeof toolArgs.kind === "string" ? toolArgs.kind : undefined,
        });
      case "get_douyin_material_library_items":
        return this.getDouyinMaterialLibraryItems(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      default:
        throw new BadRequestException(`未知工具：${toolName}`);
    }
  }

  private buildJsonRpcResult(id: unknown, result: Record<string, unknown>) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result,
    };
  }

  private buildJsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data }),
      },
    };
  }

  private buildToolErrorResult(id: unknown, message: string, details?: unknown) {
    return this.buildJsonRpcResult(id, {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            message,
            ...(details === undefined ? {} : { details }),
          }, null, 2),
        },
      ],
      isError: true,
    });
  }
}
