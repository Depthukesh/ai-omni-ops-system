import { SYSTEM_API_PROVIDER_SEEDS } from "./api-provider-catalog";
import { THIRD_PARTY_PLATFORM_SEEDS, type ThirdPartyPlatformRecord } from "./third-party-platform-catalog";
import { readPromptSourceBundle } from "./prompt-source-loader";

export type UserRecord = {
  id: string;
  mobile: string;
  email: string;
  emailVerifiedAt?: string;
  nickname: string;
  avatarUrl?: string;
  password: string;
  status: "ACTIVE" | "DISABLED";
  membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  systemRole?: "USER" | "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
  pointsBalance: number;
};

export type BrandRecord = {
  id: string;
  ownerUserId: string;
  brandName: string;
  industry: string;
  storeCount: number;
  foundedYear: number;
  brandDescription: string;
  enterpriseIntro: string;
};

export type ProductRecord = {
  id: string;
  brandId: string;
  productName: string;
  productType: string;
  price: number;
  productPositioning?: string;
  targetAudience?: string;
  painPoint?: string;
  usageScenario: string;
  differentiators?: string;
  marketPosition?: string;
  detailDescription?: string;
  imageUrl?: string;
};

export type PlatformAccountRecord = {
  id: string;
  brandId: string;
  platform: "XIAOHONGSHU" | "DOUYIN" | "VIDEO_CHANNEL" | "WECHAT_OA";
  accountName: string;
  accountLink: string;
};

export type SurveyAnswerRecord = {
  id: string;
  brandId: string;
  key: string;
  label: string;
  value: string;
};

export type AssetRecord = {
  id: string;
  brandId: string;
  category: "INDUSTRY_REPORT" | "BUSINESS_DATA" | "PLATFORM_EXPORT" | "GENERATED_REPORT" | "GENERATED_CONTENT";
  title: string;
  description: string;
  sourceName?: string;
  fileUrl?: string;
  metadataJson?: Record<string, unknown>;
};

export type TaskRecord = {
  id: string;
  userId: string;
  brandId?: string;
  taskType: string;
  taskTitle: string;
  taskStatus: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  modelName: string;
  pointsCost: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  inputJson?: Record<string, unknown>;
  outputJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MediaRecord = {
  id: string;
  userId: string;
  brandId?: string;
  taskId?: string;
  title: string;
  mediaType: "IMAGE" | "VIDEO" | "DOCUMENT" | "HTML";
  sourceUrl?: string;
  storageKey: string;
  mimeType?: string;
  fileSize?: number;
  metadataJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

export type PointLedgerRecord = {
  id: string;
  userId: string;
  changeType: string;
  pointsDelta: number;
  balanceAfter: number;
  description?: string;
  relatedTaskId?: string;
  createdAt: string;
};

export type MembershipOrderRecord = {
  id: string;
  userId: string;
  orderNo: string;
  orderType: string;
  orderStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  membership?: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  pointsAmount?: number;
  amountYuan: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MembershipPlanRule = {
  id: string;
  membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  title: string;
  amountYuan: number;
  pointsBonus: number;
  description: string;
};

export type PointsPackageRule = {
  id: string;
  title: string;
  pointsAmount: number;
  amountYuan: number;
  description: string;
};

export type BillingRulesRecord = {
  membershipPlans: MembershipPlanRule[];
  pointsPackages: PointsPackageRule[];
};

export type ModelUsageRecord = {
  id: string;
  modelName: string;
  provider: string;
  taskCount: number;
  successCount: number;
  failedCount: number;
  totalPointsCost: number;
  estimatedAmountYuan: number;
  lastCalledAt: string;
};

export type SkillConfigRecord = {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  provider: string;
  defaultModel: string;
  pointsCost: number;
  description: string;
  updatedAt: string;
};

export type PromptTemplateRecord = {
  id: string;
  name: string;
  scene: string;
  version: string;
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  modelName: string;
  temperature: number;
  maxTokens: number;
  content: string;
  updatedAt: string;
};

export type KnowledgeBaseRecord = {
  id: string;
  name: string;
  slug: string;
  sourceType: "MANUAL" | "FEISHU" | "NOTION" | "OSS";
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  syncStatus: "IDLE" | "SYNCING" | "FAILED" | "SUCCESS";
  documentCount: number;
  chunkCount: number;
  description: string;
  updatedAt: string;
};

export type KnowledgeBaseFileRecord = {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: "PDF" | "DOCX" | "XLSX" | "MD" | "LINK";
  sourceName: string;
  chunkCount: number;
  status: "PENDING" | "INDEXED" | "FAILED";
  uploadedAt: string;
};

export type KnowledgeBaseSyncRunRecord = {
  id: string;
  knowledgeBaseId: string;
  scope: "FILE" | "FULL";
  operator: string;
  fileId?: string;
  fileName?: string;
  result: "RUNNING" | "SUCCESS" | "FAILED";
  summary: string;
  errorDetail?: string;
  startedAt: string;
  completedAt?: string;
};

export type KnowledgeBindingRecord = {
  id: string;
  knowledgeBaseId: string;
  bindingType: "MODULE" | "SKILL_PACKAGE" | "SKILL" | "PROMPT" | "WORKFLOW_STEP";
  targetId: string;
  targetKey?: string;
  targetName?: string;
  priority: number;
  retrievalMode: "SEMANTIC" | "HYBRID" | "MANUAL";
  isRequired: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeRetrievalConfigRecord = {
  id: string;
  knowledgeBaseId: string;
  defaultTopK: number;
  recallMode: "SEMANTIC" | "HYBRID";
  rerankEnabled: boolean;
  rerankModelName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  retrievalThreshold?: number;
  createdAt: string;
  updatedAt: string;
};

export type ModuleDefinitionRecord = {
  id: string;
  moduleKey: string;
  moduleName: string;
  moduleType: "WORKBENCH" | "DOMAIN" | "PLATFORM_CORE" | "ADMIN_TOOL" | "EXTERNAL_BRIDGE";
  moduleStatus: "PLANNING" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  entryRoute: string;
  icon: string;
  sortOrder: number;
  description: string;
  requiredPermissions: string[];
  featureFlags: string[];
  isPlatformVisible: boolean;
  isBrandVisible: boolean;
  isAdminVisible: boolean;
  requiredCapabilities: string[];
  requiredProviders: string[];
  requiredTables: string[];
  requiredStorages: string[];
  requiredThirdPartyPlatforms: string[];
  taskTypes: string[];
  mediaTypes: string[];
  workflowTypes: string[];
  publishTargets: string[];
  defaultSkillPackages: string[];
  defaultKnowledgeSpaces: string[];
  defaultProviderPolicies: string[];
  phasePriority?: "P0" | "P1" | "P2";
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillPackageRecord = {
  id: string;
  packageKey: string;
  packageName: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  scope: "PLATFORM" | "BRAND" | "USER";
  moduleKeys: string[];
  workflowStepKeys: string[];
  tags: string[];
  currentVersionId?: string;
  defaultKnowledgeSpaceIds: string[];
  defaultProviderPolicyIds: string[];
  sortOrder: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillPackageModuleRecord = {
  id: string;
  packageId: string;
  packageKey: string;
  packageName: string;
  moduleKey: string;
  bindingType: "DEFAULT" | "OPTIONAL" | "SYSTEM_REQUIRED" | "EXPERIMENTAL";
  isDefault: boolean;
  sortOrder: number;
  enabled: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillPackageSkillRecord = {
  id: string;
  packageId: string;
  packageKey: string;
  packageName: string;
  skillId: string;
  skillSlug: string;
  bindingType: "DEFAULT" | "OPTIONAL" | "SYSTEM_REQUIRED" | "EXPERIMENTAL";
  isDefault: boolean;
  sortOrder: number;
  enabled: boolean;
  remarks?: string;
  skillName?: string;
  skillCategory?: string;
  skillStatus?: SkillConfigRecord["status"];
  skillProvider?: string;
  skillDefaultModel?: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillPackageKnowledgeSpaceRecord = {
  id: string;
  packageId: string;
  packageKey: string;
  packageName: string;
  knowledgeBaseId: string;
  relationType: "DEFAULT" | "OPTIONAL" | "BRAND_OVERRIDE" | "USER_OVERRIDE";
  priority: number;
  retrievalMode: "SEMANTIC" | "HYBRID" | "MANUAL";
  isRequired: boolean;
  enabled: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillPackageVersionRecord = {
  id: string;
  packageId: string;
  packageKey: string;
  versionNumber: string;
  changeLog?: string;
  sourceMode: "CURRENT_STATE" | "CLONE_FROM_VERSION";
  sourceVersionId?: string;
  isActive: boolean;
  snapshotJson: {
    promptCount: number;
    referenceCount: number;
    scriptCount: number;
    knowledgeBindingCount: number;
    providerBindingCount: number;
  };
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReferenceAssetRecord = {
  id: string;
  packageId: string;
  referenceKey: string;
  title: string;
  sourceType: "URL" | "FILE" | "DOC" | "MARKDOWN";
  sourceUri?: string;
  usageNote?: string;
  applicableScopes: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ScriptAssetRecord = {
  id: string;
  packageId: string;
  scriptKey: string;
  scriptName: string;
  runtime: "TS" | "JS" | "PYTHON" | "SHELL";
  entry?: string;
  argsSchema?: Record<string, unknown>;
  usageNote?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiProviderRecord = {
  id: string;
  name: string;
  providerType: "OPENAI" | "GEMINI" | "DOUBAO" | "CUSTOM";
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  baseUrl: string;
  tutorialUrl: string;
  modelWhitelist: string[];
  apiKey: string;
  defaultModel: string;
  organization: string;
  project: string;
  timeoutMs: number;
  streamEnabled: boolean;
  customHeaders: Record<string, string>;
  extraParams: Record<string, unknown>;
  remark: string;
  successRate: number;
  requestCount24h: number;
  totalCostYuan: number;
  lastCalledAt: string;
  updatedAt: string;
};

const DEMO_TIRAMISU_PRODUCT_IMAGE_URL =
  "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=realistic%20premium%20tiramisu%20cake%20product%20photo%2C%20bakery%20display%2C%20soft%20warm%20lighting%2C%20commercial%20food%20photography%2C%20clean%20background&image_size=portrait_4_3";
const DEMO_CROISSANT_PRODUCT_IMAGE_URL =
  "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=realistic%20freshly%20baked%20croissant%20product%20photo%2C%20bakery%20counter%2C%20golden%20layers%2C%20soft%20morning%20light%2C%20commercial%20food%20photography&image_size=portrait_4_3";
const DEMO_BRAND_ACCOUNT_AVATAR_URL =
  "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=realistic%20friendly%20female%20bakery%20brand%20manager%20avatar%2C%20asian%20young%20adult%2C%20soft%20studio%20lighting%2C%20clean%20background%2C%20professional%20headshot&image_size=square";
const DEMO_COMPETITOR_ACCOUNT_AVATAR_URL =
  "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=realistic%20stylish%20female%20brand%20founder%20avatar%2C%20asian%20young%20adult%2C%20soft%20studio%20lighting%2C%20neutral%20background%2C%20professional%20headshot&image_size=square";
const DEMO_NOTE_IMAGE_1_URL =
  "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=realistic%20bakery%20social%20post%20image%2C%20tiramisu%20cake%20close-up%2C%20cozy%20dessert%20table%2C%20warm%20lighting%2C%20lifestyle%20photography&image_size=portrait_4_3";
const DEMO_NOTE_IMAGE_2_URL =
  "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=realistic%20bakery%20social%20post%20image%2C%20cake%20slice%20and%20coffee%20scene%2C%20warm%20cafe%20light%2C%20lifestyle%20photography%2C%20clean%20composition&image_size=portrait_4_3";
const DEMO_BRAND_REPORT_FILE_URL = "/api/reports/brands/br_demo_001/assets/growth-report-latest.html";
const DEMO_BRAND_REPORT_SOURCE_URL = "/api/reports/brands/br_demo_001/assets/growth-report.html";
const DEMO_WORK_COVER_SOURCE_URL = DEMO_NOTE_IMAGE_1_URL;
const DEMO_INDUSTRY_REPORT_FILE_URL = "/api/brands/br_demo_001/asset-files/bakery-report.pdf";
const DEMO_BUSINESS_DATA_FILE_URL = "/api/brands/br_demo_001/asset-files/youzan-q1.xlsx";

const brandGrowthSkillContent = readPromptSourceBundle(
  "prompt_growth_report",
  "你是品牌全域增长顾问，需要基于品牌资料、行业资料和经营数据生成增长分析报告。",
).content;

const visualReportSkillContent = readPromptSourceBundle(
  "prompt_visual_report",
  "你是数据可视化设计师，需要将结构化洞察转化为适合前端渲染的 HTML 报告。",
).content;

const xiaohongshuPlanSkillContent = readPromptSourceBundle(
  "prompt_xhs_plan",
  "你是小红书品牌营销顾问，需要输出年度种草策略、内容支柱和月度排期建议。",
).content;
const douyinPlanSkillContent = readPromptSourceBundle(
  "prompt_douyin_plan",
  "你是抖音营销策划顾问，需要基于品牌资料、半年营销规划与抖音采集数据，输出完整的抖音营销策划方案。",
).content;
const douyinHotTopicCandidatesSkillContent = readPromptSourceBundle(
  "prompt_douyin_hot_topic_candidates",
  "你是抖音热点选题策划助手，需要基于指定日期的每日热点榜单与品牌背景资料，输出 3 个可直接展示的抖音热点选题。",
).content;
const douyinOriginalCopyViewpointSkillContent = readPromptSourceBundle(
  "prompt_douyin_original_copy_viewpoint",
  "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成聊观点类抖音原创文案。",
).content;
const douyinOriginalCopyStorySkillContent = readPromptSourceBundle(
  "prompt_douyin_original_copy_story",
  "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成讲故事类抖音原创文案。",
).content;
const douyinOriginalCopyProcessSkillContent = readPromptSourceBundle(
  "prompt_douyin_original_copy_process",
  "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成晒过程类抖音原创文案。",
).content;
const douyinOriginalCopyKnowledgeSkillContent = readPromptSourceBundle(
  "prompt_douyin_original_copy_knowledge",
  "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成教知识类抖音原创文案。",
).content;
const douyinOriginalCopyPlotSalesSkillContent = readPromptSourceBundle(
  "prompt_douyin_original_copy_plot_sales",
  "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成剧情带货类抖音原创文案。",
).content;
const douyinOriginalCopySeedingSkillContent = readPromptSourceBundle(
  "prompt_douyin_original_copy_seeding",
  "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成种草类抖音原创文案。",
).content;
const douyinOriginalCopyLocalSalesSkillContent = readPromptSourceBundle(
  "prompt_douyin_original_copy_local_sales",
  "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成同城带货类抖音原创文案。",
).content;
const douyinRemixCopyIntroSkillContent = readPromptSourceBundle(
  "prompt_douyin_remix_copy_intro",
  "根据提取出来的视频文案，拆解出适合复用的开头结构、钩子和表达方式。",
).content;
const douyinRemixCopyBodySkillContent = readPromptSourceBundle(
  "prompt_douyin_remix_copy_body",
  "根据提取出来的视频文案，拆解出适合复用的正文结构、论证顺序和关键卖点。",
).content;
const douyinRemixCopyOutroSkillContent = readPromptSourceBundle(
  "prompt_douyin_remix_copy_outro",
  "根据提取出来的视频文案，拆解出适合复用的结尾结构、行动引导和收束方式。",
).content;
const douyinRemixCopyFinalSkillContent = readPromptSourceBundle(
  "prompt_douyin_remix_copy_final",
  "根据拆解后的开头、正文、结尾内容，以及品牌资料、产品资料、营销策划资料和用户要求，生成抖音二创文案。",
).content;
const xiaohongshuCalendarSkillContent = readPromptSourceBundle(
  "prompt_xhs_calendar",
  "你是小红书营销日历规划助手，需要基于营销策划方案、半年营销规划、素材库、每日热点与历史营销日历，输出未来 7 天的结构化营销日历 JSON。",
).content;

const xiaohongshuOriginalCopySkillContent = readPromptSourceBundle(
  "prompt_xhs_original_copy",
  "根据营销规划方案、营销日历选题、产品信息和用户附加要求，生成可直接发布的小红书原创标题、正文与标签。",
).content;

const xiaohongshuOriginalNoteSkillContent = readPromptSourceBundle(
  "prompt_xhs_original_note",
  "根据营销规划方案、营销日历、原创笔记正文、产品信息和用户要求，生成封面提示词与原创配图提示词。",
).content;

const xiaohongshuOriginalImageGenerationSkillContent = readPromptSourceBundle(
  "prompt_xhs_original_image_generation",
  "根据原创配图提示词、参考图、产品图和排版要求，生成最终小红书原创成品图。",
).content;

const xiaohongshuRewriteNoteSkillContent = readPromptSourceBundle(
  "prompt_xhs_rewrite_note",
  "根据用户输入的小红书对标配图及二创文案，生成全新的二创配图提示词。",
).content;

const xiaohongshuRewriteImageGenerationSkillContent = readPromptSourceBundle(
  "prompt_xhs_rewrite_image_generation",
  "根据二创配图提示词、对标图、产品图和排版要求，生成最终小红书二创成品图。",
).content;

const xiaohongshuRewriteCopySkillContent = readPromptSourceBundle(
  "prompt_xhs_rewrite_copy",
  "根据对标作品、营销规划和用户要求，生成小红书二创笔记标题、正文与标签。",
).content;

const xiaohongshuVideoBrandScriptSkillContent = readPromptSourceBundle(
  "prompt_xhs_video_brand_script",
  "根据用户输入的选题、产品信息、营销规划和要求，生成品牌宣传视频创意剧本。",
).content;

const xiaohongshuVideoSpokenScriptSkillContent = readPromptSourceBundle(
  "prompt_xhs_video_spoken_script",
  "根据用户输入的选题、产品信息、营销规划和要求，生成口播带货视频创意剧本。",
).content;

const xiaohongshuVideoSkitScriptSkillContent = readPromptSourceBundle(
  "prompt_xhs_video_skit_script",
  "根据用户输入的选题、产品信息、营销规划和要求，生成短剧带货视频创意剧本。",
).content;

const xiaohongshuVideoRemixScriptSkillContent = readPromptSourceBundle(
  "prompt_xhs_video_remix_script",
  "根据素材库里的视频链接和拆解要求，生成复刻视频剧情脚本。",
).content;

const xiaohongshuVideoStoryboardSkillContent = readPromptSourceBundle(
  "prompt_xhs_video_storyboard",
  "根据剧本、产品图和用户要求，生成故事板提示词。",
).content;

const xiaohongshuVideoNoteSkillContent = readPromptSourceBundle(
  "prompt_xhs_video_note",
  "基于商业短片方法论生成视频笔记文案、结构化视频提示词、分段方案和短视频调用链。",
).content;
const wechatArticleComposeSkillContent = readPromptSourceBundle(
  "prompt_wechat_article_compose",
  "根据文章主题、营销日历、产品信息、品牌信息、主题颜色和用户要求，生成适合公众号工作流的结构化文章，包含标题、摘要、作者、正文纯文本段落，以及封面图和正文配图提示词。",
).content;
const wechatCoverImageComposeSkillContent = readPromptSourceBundle(
  "prompt_wechat_cover_image_compose",
  "根据公众号文章标题、摘要、主题色、品牌资料和营销节点，生成适合公众号封面图与头图的高质量提示词，补充版式、文案安全区与标题落点要求。",
).content;
const wechatBodyImageComposeSkillContent = readPromptSourceBundle(
  "prompt_wechat_body_image_compose",
  "根据公众号文章正文结构、段落主题、产品信息和品牌调性，生成正文插图、场景图与产品辅助图的提示词，要求适合公众号长文阅读节奏。",
).content;
const wechatHtmlRenderSkillContent = readPromptSourceBundle(
  "prompt_wechat_html_render",
  "根据已确认的公众号文章正文、封面图、正文配图和主题色，生成最终可发布的公众号 HTML，保持图片植入位置自然，禁止追加多余附录区块。",
).content;
const wechatApiPublishSkillContent = readPromptSourceBundle(
  "prompt_wechat_api_publish",
  "根据公众号文章稿、封面图、评论策略、账号配置和发布要求，整理适合公众号草稿箱 API 发布的参数清单、校验步骤与失败重试建议。",
).content;
const designWebPrototypeSkillContent = readPromptSourceBundle(
  "prompt_design_web_prototype",
  "你是 Open Design 风格的 HTML 原型设计师，需要基于品牌资料、营销日历、产品信息和用户要求生成一页式 HTML 原型，适合 landing、活动页和品牌展示页。",
).content;
const designDashboardSkillContent = readPromptSourceBundle(
  "prompt_design_dashboard",
  "你是 Open Design 风格的数据看板设计师，需要输出适合后台或经营分析场景的 HTML 数据看板结构，强调 KPI、图表区、筛选区和信息层级。",
).content;
const designSaasLandingSkillContent = readPromptSourceBundle(
  "prompt_design_saas_landing",
  "你是 Open Design 的 SaaS 落地页设计师，需要输出具备 hero、核心卖点、功能说明、价格方案、客户背书和 CTA 的完整营销落地页方案，强调转化链路和品牌可信度。",
).content;
const designEmailMarketingSkillContent = readPromptSourceBundle(
  "prompt_design_email_marketing",
  "你是 Open Design 的邮件营销页面设计师，需要输出适合 EDM 的单列页面结构，明确头图、主标题、卖点模块、行动按钮、规格表和兼容邮件客户端的降级策略。",
).content;
const designDocsPageSkillContent = readPromptSourceBundle(
  "prompt_design_docs_page",
  "你是 Open Design 的文档展示页设计师，需要生成说明页、帮助中心或知识页面结构，强调目录、导航、信息分层、示例区和可扫描阅读体验。",
).content;
const designBlogPostSkillContent = readPromptSourceBundle(
  "prompt_design_blog_post",
  "你是 Open Design 的长文章页面设计师，需要生成专题文章、博客长页或内容发布页方案，强调标题区、导语、章节节奏、引用块、图文穿插和滚动阅读体验。",
).content;
const designMobileOnboardingSkillContent = readPromptSourceBundle(
  "prompt_design_mobile_onboarding",
  "你是 Open Design 风格的移动端设计师，需要输出移动端 onboarding 或多屏原型方案，明确首屏、价值说明、登录/行动引导和组件层级。",
).content;
const designGamifiedAppSkillContent = readPromptSourceBundle(
  "prompt_design_gamified_app",
  "你是 Open Design 的游戏化体验设计师，需要输出任务闯关、积分激励、签到打卡或角色养成类页面方案，强调反馈循环、进度机制和高动机交互。",
).content;
const designSocialCarouselSkillContent = readPromptSourceBundle(
  "prompt_design_social_carousel",
  "你是 Open Design 风格的社媒设计师，需要生成适合 1080x1080 或竖版社媒传播的轮播图设计方案，强调系列感、封面冲击力和品牌记忆点。",
).content;
const designMagazinePosterSkillContent = readPromptSourceBundle(
  "prompt_design_magazine_poster",
  "你是 Open Design 风格的 editorial 海报设计师，需要生成杂志风海报或主视觉设计方案，强调版式节奏、字体层级、留白和主视觉冲击。",
).content;
const designMotionFramesSkillContent = readPromptSourceBundle(
  "prompt_design_motion_frames",
  "你是 Open Design 的 motion-frames 设计师，需要生成可延展为动画的关键帧视觉方案，明确主体运动、转场节奏、排版动态和适合首帧展示的构图。",
).content;
const designSpriteAnimationSkillContent = readPromptSourceBundle(
  "prompt_design_sprite_animation",
  "你是 Open Design 的 sprite-animation 设计师，需要生成像素风或 8-bit 循环动画首帧方案，强调角色姿态、像素图形语言、标题处理和复古游戏感。",
).content;
const designPitchDeckSkillContent = readPromptSourceBundle(
  "prompt_design_pitch_deck",
  "你是 Open Design 风格的 Deck 设计师，需要输出适合 Pitch Deck 或品牌提案的页面结构方案，明确封面、问题、方案、亮点、数据和收尾页。",
).content;
const designWeeklyUpdateSkillContent = readPromptSourceBundle(
  "prompt_design_weekly_update",
  "你是 Open Design 的周报 Deck 设计师，需要生成阶段周报与项目更新演示结构，突出本周进展、关键指标、风险阻塞、下周计划和负责人视角。",
).content;
const designSimpleDeckSkillContent = readPromptSourceBundle(
  "prompt_design_simple_deck",
  "你是 Open Design 的极简 Deck 设计师，需要输出少页面、高概括、单主题的演示结构，强调标题冲击、信息裁剪和简洁留白。",
).content;
const designVideoStoryboardSkillContent = readPromptSourceBundle(
  "prompt_design_video_storyboard",
  "你是 Open Design 风格的视频故事板设计师，需要基于品牌资料、营销日历、产品信息和用户要求输出镜头分段、画面说明、字幕/口播和节奏建议。",
).content;
const designMotionStoryboardSkillContent = readPromptSourceBundle(
  "prompt_design_motion_storyboard",
  "你是 Open Design 的动效脚本设计师，需要输出镜头转场、节奏节点、动态标题与运动图形说明，强调每一段的动画意图和视觉节奏。",
).content;
const openDesignCritiqueSkillContent = readPromptSourceBundle(
  "prompt_open_design_critique",
  "你是 Open Design 的 critique reviewer，需要以专业设计总监视角对当前方案做评审，输出结构问题、视觉层级问题、品牌一致性问题、可用性风险，以及可执行的修改建议。",
).content;
const openDesignTweaksSkillContent = readPromptSourceBundle(
  "prompt_open_design_tweaks",
  "你是 Open Design 的 tweaks 专家，需要在保持既有方向不大改的前提下，对页面进行定向微调，聚焦标题、层级、留白、按钮、图文比例和局部交互。",
).content;
const openDesignWireframeSketchSkillContent = readPromptSourceBundle(
  "prompt_open_design_wireframe_sketch",
  "你是 Open Design 的 wireframe-sketch 设计师，需要先忽略视觉装饰，输出低保真线框方案，明确模块顺序、信息优先级、关键组件和交互路径。",
).content;
const openDesignDesignBriefSkillContent = readPromptSourceBundle(
  "prompt_open_design_design_brief",
  "你是 Open Design 的 design-brief 策划师，需要根据用户需求整理设计目标、受众、使用场景、交付范围、风险约束、视觉方向和评审标准。",
).content;
const openDesignDatingWebSkillContent = readPromptSourceBundle(
  "prompt_open_design_dating_web",
  "你是 Open Design 的 dating-web 设计师，需要生成消费级关系产品官网或数据页面方案，强调 editorial 风格、情绪化内容展示和转化入口。",
).content;
const openDesignDigitalEguideSkillContent = readPromptSourceBundle(
  "prompt_open_design_digital_eguide",
  "你是 Open Design 的 digital-eguide 设计师，需要生成两页或多页电子指南方案，包含封面、目录预告、章节节奏、引用块和阅读型排版。",
).content;
const openDesignHatchPetSkillContent = readPromptSourceBundle(
  "prompt_open_design_hatch_pet",
  "你是 Open Design 的 hatch-pet 互动设计师，需要生成角色孵化、成长养成或 IP 活动页方案，强调阶段反馈、奖励机制和情绪价值。",
).content;
const openDesignAudioJingleSkillContent = readPromptSourceBundle(
  "prompt_open_design_audio_jingle",
  "你是 Open Design 的 audio-jingle 策划师，需要生成品牌短旋律 brief，包含情绪、节奏、乐器、声音记忆点、使用场景和交付建议。",
).content;
const openDesignPmSpecSkillContent = readPromptSourceBundle(
  "prompt_open_design_pm_spec",
  "你是 Open Design 的 pm-spec 策划师，需要输出产品规格说明，包含目标、用户、范围、功能模块、流程、异常场景、埋点和验收标准。",
).content;
const openDesignEngRunbookSkillContent = readPromptSourceBundle(
  "prompt_open_design_eng_runbook",
  "你是 Open Design 的 eng-runbook 工程师，需要生成上线 Runbook，覆盖准备事项、发布步骤、回滚方案、监控项、报警策略和职责分工。",
).content;
const openDesignFinanceReportSkillContent = readPromptSourceBundle(
  "prompt_open_design_finance_report",
  "你是 Open Design 的 finance-report 设计师，需要生成财务汇报页面方案，强调收入成本结构、趋势变化、关键结论和经营建议。",
).content;
const openDesignHrOnboardingSkillContent = readPromptSourceBundle(
  "prompt_open_design_hr_onboarding",
  "你是 Open Design 的 hr-onboarding 设计师，需要生成员工入职引导页面或资料包结构，覆盖欢迎页、流程说明、制度摘要、培训安排和联系人。",
).content;
const openDesignInvoiceSkillContent = readPromptSourceBundle(
  "prompt_open_design_invoice",
  "你是 Open Design 的 invoice 模板设计师，需要生成账单或发票页面结构，强调抬头信息、条目清单、金额汇总、税率和支付说明。",
).content;
const openDesignKanbanBoardSkillContent = readPromptSourceBundle(
  "prompt_open_design_kanban_board",
  "你是 Open Design 的 kanban-board 设计师，需要生成泳道式看板方案，明确状态分组、任务卡字段、优先级标识和团队协作信息。",
).content;
const openDesignTeamOkrsSkillContent = readPromptSourceBundle(
  "prompt_open_design_team_okrs",
  "你是 Open Design 的 team-okrs 设计师，需要生成目标管理页面，清晰展示 Objective、KR、负责人、进度状态和节奏回顾方式。",
).content;
const openDesignReplitDeckSkillContent = readPromptSourceBundle(
  "prompt_open_design_replit_deck",
  "你是 Open Design 的 replit-deck 设计师，需要输出现代创业产品演示 Deck 结构，强调问题、产品、演示亮点、商业模式与下一步。",
).content;
const openDesignHtmlPptCourseModuleSkillContent = readPromptSourceBundle(
  "prompt_open_design_html_ppt_course_module",
  "你是 Open Design 的 html-ppt-course-module 设计师，需要输出适合课程章节、培训模块和教学课件的 HTML/PPT 页面结构。",
).content;
const openDesignHtmlPptDirKeyNavMinimalSkillContent = readPromptSourceBundle(
  "prompt_open_design_html_ppt_dir_key_nav_minimal",
  "你是 Open Design 的 html-ppt-dir-key-nav-minimal 设计师，需要生成极简目录导航式 Deck，强调章节清晰、层级克制和键盘切换逻辑。",
).content;
const openDesignHtmlPptGraphifyDarkGraphSkillContent = readPromptSourceBundle(
  "prompt_open_design_html_ppt_graphify_dark_graph",
  "你是 Open Design 的 html-ppt-graphify-dark-graph 设计师，需要生成深色图表型 Deck，突出数据可视化、对比关系和科技感氛围。",
).content;
const openDesignHtmlPptHermesCyberTerminalSkillContent = readPromptSourceBundle(
  "prompt_open_design_html_ppt_hermes_cyber_terminal",
  "你是 Open Design 的 html-ppt-hermes-cyber-terminal 设计师，需要生成赛博终端风 Deck，强调命令行叙事、网格布局和高反差信息节奏。",
).content;
const openDesignHtmlPptKnowledgeArchBlueprintSkillContent = readPromptSourceBundle(
  "prompt_open_design_html_ppt_knowledge_arch_blueprint",
  "你是 Open Design 的 html-ppt-knowledge-arch-blueprint 设计师，需要生成知识架构蓝图 Deck，强调层次结构、关系网络、模块边界和演进路线。",
).content;

const douyinVideoBrandScriptSkillContent = readPromptSourceBundle(
  "prompt_douyin_video_brand_script",
  "根据用户输入的选题、产品信息、营销规划和要求，生成抖音品牌宣传视频创意剧本。",
).content;
const douyinVideoSpokenScriptSkillContent = readPromptSourceBundle(
  "prompt_douyin_video_spoken_script",
  "根据用户输入的选题、产品信息、营销规划和要求，生成抖音口播带货视频创意剧本。",
).content;

const douyinVideoSkitScriptSkillContent = readPromptSourceBundle(
  "prompt_douyin_video_skit_script",
  "根据用户输入的选题、产品信息、营销规划和要求，生成抖音短剧带货视频创意剧本。",
).content;

const douyinVideoRemixScriptSkillContent = readPromptSourceBundle(
  "prompt_douyin_video_remix_script",
  "根据素材库里的视频链接和拆解要求，生成抖音复刻视频剧情脚本。",
).content;

const douyinVideoStoryboardSkillContent = readPromptSourceBundle(
  "prompt_douyin_video_storyboard",
  "根据剧本、产品图和用户要求，生成抖音故事板提示词。",
).content;

const douyinVideoNoteSkillContent = readPromptSourceBundle(
  "prompt_douyin_video_note",
  "基于商业短片方法论生成抖音 AI 生视频（故事板）文案、结构化视频提示词、分段方案和短视频调用链。",
).content;

const douyinDirectVideoSkillContent = readPromptSourceBundle(
  "prompt_douyin_direct_video",
  "根据用户输入的选题、产品、素材、参考图、营销策划和用户要求，生成可直接用于 Seedance 2.0 的抖音视频提示词。",
).content;
const douyinDigitalHumanScriptSkillContent = readPromptSourceBundle(
  "prompt_douyin_digital_human_script",
  "根据产品资料、营销目标、视频主题和用户要求，生成适合抖音数字人口播的短视频脚本。",
).content;

export type MockDatabase = {
  users: UserRecord[];
  brands: BrandRecord[];
  products: ProductRecord[];
  platformAccounts: PlatformAccountRecord[];
  competitorAccounts: PlatformAccountRecord[];
  surveyAnswers: SurveyAnswerRecord[];
  assets: AssetRecord[];
  tasks: TaskRecord[];
  media: MediaRecord[];
  pointLedgers: PointLedgerRecord[];
  orders: MembershipOrderRecord[];
  billingRules: BillingRulesRecord;
  modelUsage: ModelUsageRecord[];
  skillConfigs: SkillConfigRecord[];
  promptTemplates: PromptTemplateRecord[];
  knowledgeBases: KnowledgeBaseRecord[];
  knowledgeBaseFiles: KnowledgeBaseFileRecord[];
  knowledgeBaseSyncRuns: KnowledgeBaseSyncRunRecord[];
  knowledgeRetrievalConfigs: KnowledgeRetrievalConfigRecord[];
  knowledgeBindings: KnowledgeBindingRecord[];
  skillPackages: SkillPackageRecord[];
  skillPackageVersions: SkillPackageVersionRecord[];
  referenceAssets: ReferenceAssetRecord[];
  scriptAssets: ScriptAssetRecord[];
  moduleDefinitions: ModuleDefinitionRecord[];
  skillPackageModules: SkillPackageModuleRecord[];
  skillPackageSkills: SkillPackageSkillRecord[];
  skillPackageKnowledgeSpaces: SkillPackageKnowledgeSpaceRecord[];
  apiProviders: ApiProviderRecord[];
  thirdPartyPlatforms: ThirdPartyPlatformRecord[];
  brandThirdPartyPlatformSecrets: Array<{
    id: string;
    brandId: string;
    platformId: string;
    apiKey: string;
    updatedAt: string;
  }>;
};

export const database: MockDatabase = {
  users: [
    {
      id: "usr_demo_001",
      mobile: "13800000000",
      email: "demo@ai-omni.local",
      emailVerifiedAt: "2026-05-08T00:00:00.000Z",
      nickname: "演示账号",
      avatarUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=clean%20minimal%20professional%20user%20avatar%20portrait%2C%20asian%20young%20adult%2C%20soft%20studio%20lighting%2C%20blue%20gray%20background%2C%20realistic%20headshot&image_size=square",
      password: "123456",
      status: "ACTIVE",
      membership: "PRO",
      systemRole: "SUPER_ADMIN",
      pointsBalance: 14420,
    },
  ],
  brands: [
    {
      id: "br_demo_001",
      ownerUserId: "usr_demo_001",
      brandName: "武汉仟吉",
      industry: "烘焙零售",
      storeCount: 180,
      foundedYear: 2000,
      brandDescription: "区域烘焙品牌，线下门店基础较强，线上全域增长空间明显。",
      enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与半年营销规划。",
    },
  ],
  products: [
    {
      id: "prd_demo_001",
      brandId: "br_demo_001",
      productName: "爆浆提拉米苏蛋糕",
      productType: "节日蛋糕",
      price: 198,
      productPositioning: "节日礼赠爆款蛋糕",
      targetAudience: "生日庆祝、家庭聚会、节日送礼人群",
      painPoint: "礼赠需要体面、口味要稳、包装需有仪式感",
      usageScenario: "生日庆祝与节日礼赠",
      differentiators: "爆浆口感、门店现制、节庆氛围强",
      marketPosition: "节日蛋糕核心引流款",
      detailDescription: "主打节日礼赠与庆生场景，强调颜值、口感和分享属性。",
      imageUrl: DEMO_TIRAMISU_PRODUCT_IMAGE_URL,
    },
    {
      id: "prd_demo_002",
      brandId: "br_demo_001",
      productName: "现烤牛角包",
      productType: "门店畅销",
      price: 12,
      productPositioning: "高频引流烘焙单品",
      targetAudience: "早餐、下午茶、上班通勤人群",
      painPoint: "需要高性价比、方便即食、稳定复购",
      usageScenario: "早餐与下午茶",
      differentiators: "现烤出炉、香气强、适合高频购买",
      marketPosition: "门店高频销量款",
      detailDescription: "适合作为门店高频到店产品，承担日常复购与连带销售任务。",
      imageUrl: DEMO_CROISSANT_PRODUCT_IMAGE_URL,
    },
  ],
  platformAccounts: [
    {
      id: "acc_demo_001",
      brandId: "br_demo_001",
      platform: "XIAOHONGSHU",
      accountName: "武汉仟吉烘焙",
      accountLink: "https://www.xiaohongshu.com/user/profile/demo",
    },
    {
      id: "acc_demo_002",
      brandId: "br_demo_001",
      platform: "WECHAT_OA",
      accountName: "武汉仟吉",
      accountLink: "qianji-official",
    },
  ],
  competitorAccounts: [
    {
      id: "cmp_demo_001",
      brandId: "br_demo_001",
      platform: "XIAOHONGSHU",
      accountName: "区域烘焙竞品A",
      accountLink: "https://www.xiaohongshu.com/user/profile/comp-a",
    },
  ],
  surveyAnswers: [
    {
      id: "sur_demo_001",
      brandId: "br_demo_001",
      key: "businessProcess",
      label: "3.1 业务流程",
      value: "当前以线下门店为主，线上私域承接与公域导流链路尚未完全打通。",
    },
    {
      id: "sur_demo_002",
      brandId: "br_demo_001",
      key: "customerProfile",
      label: "3.2.1 客户画像",
      value: "核心为城市家庭消费者、年轻白领、节庆礼赠人群，复购需求存在但精细化运营不足。",
    },
    {
      id: "sur_demo_003",
      brandId: "br_demo_001",
      key: "onlineMarketingChannels",
      label: "3.4.3 线上营销渠道",
      value: "公众号与门店活动较稳定，小红书等种草渠道内容供给不足。",
    },
    {
      id: "sur_demo_004",
      brandId: "br_demo_001",
      key: "merchantPainPointBusiness",
      label: "3.8.1.1 业务层面",
      value: "线上流量获取成本上升，会员沉淀与二次转化效率偏低。",
    },
    {
      id: "sur_demo_005",
      brandId: "br_demo_001",
      key: "merchantNeedShortTerm",
      label: "3.8.2.1 短期需求",
      value: "尽快形成可复制的内容种草、会员拉新、门店转化三位一体增长方案。",
    },
    {
      id: "sur_demo_006",
      brandId: "br_demo_001",
      key: "merchantNeedLongTerm",
      label: "3.8.2.2 长期需求",
      value: "沉淀全域品牌资产、数据资产与自动化运营能力，降低人工依赖。",
    },
  ],
  assets: [
    {
      id: "ast_demo_001",
      brandId: "br_demo_001",
      category: "INDUSTRY_REPORT",
      title: "烘焙品类市场分析",
      description: "包含品类规模、价格分布、场景需求与用户偏好。",
      sourceName: "蝉妈妈 AI 市场调研",
      fileUrl: DEMO_INDUSTRY_REPORT_FILE_URL,
    },
    {
      id: "ast_demo_002",
      brandId: "br_demo_001",
      category: "BUSINESS_DATA",
      title: "有赞商城季度经营明细",
      description: "用于分析订单结构、复购率、客单价与渠道转化差异。",
      sourceName: "有赞导出报表",
      fileUrl: DEMO_BUSINESS_DATA_FILE_URL,
    },
    {
      id: "ast_demo_xhs_brand_account_001",
      brandId: "br_demo_001",
      category: "PLATFORM_EXPORT",
      title: "武汉仟吉烘焙",
      description: "小红书品牌账号采集快照",
      sourceName: "小红书采集",
      metadataJson: {
        kind: "XHS_BRAND_ACCOUNT",
        sourceAccountId: "acc_demo_001",
        sourceAccountLink: "https://www.xiaohongshu.com/user/profile/demo",
        externalUserId: "xhs_brand_demo_001",
        postedCount: 18,
        likedCount: 3680,
        collectedCount: 920,
        avatar: DEMO_BRAND_ACCOUNT_AVATAR_URL,
        description: "区域烘焙品牌官方账号",
        ipLocation: "湖北",
        followCount: 126,
        fanCount: 12680,
        collectedAt: "2026-05-02T09:10:00.000Z",
        raw: {
          userid: "xhs_brand_demo_001",
          nickname: "武汉仟吉烘焙",
          posted: 18,
          liked: 3680,
          collected: 920,
          avatar: DEMO_BRAND_ACCOUNT_AVATAR_URL,
          desc: "区域烘焙品牌官方账号",
          ip_location: "湖北",
          follows: 126,
          fans: 12680,
        },
      },
    },
    {
      id: "ast_demo_xhs_competitor_account_001",
      brandId: "br_demo_001",
      category: "PLATFORM_EXPORT",
      title: "区域烘焙竞品A",
      description: "小红书竞品账号采集快照",
      sourceName: "小红书采集",
      metadataJson: {
        kind: "XHS_COMPETITOR_ACCOUNT",
        sourceAccountId: "cmp_demo_001",
        sourceAccountLink: "https://www.xiaohongshu.com/user/profile/comp-a",
        externalUserId: "xhs_comp_demo_001",
        postedCount: 32,
        likedCount: 5820,
        collectedCount: 1430,
        avatar: DEMO_COMPETITOR_ACCOUNT_AVATAR_URL,
        description: "区域竞品小红书账号",
        ipLocation: "上海",
        followCount: 215,
        fanCount: 28400,
        collectedAt: "2026-05-02T09:12:00.000Z",
        raw: {
          userid: "xhs_comp_demo_001",
          nickname: "区域烘焙竞品A",
          posted: 32,
          liked: 5820,
          collected: 1430,
          avatar: DEMO_COMPETITOR_ACCOUNT_AVATAR_URL,
          desc: "区域竞品小红书账号",
          ip_location: "上海",
          follows: 215,
          fans: 28400,
        },
      },
    },
    {
      id: "ast_demo_xhs_note_001",
      brandId: "br_demo_001",
      category: "PLATFORM_EXPORT",
      title: "武汉仟吉爆浆提拉米苏值得买吗？",
      description: "门店新品种草向图文笔记",
      sourceName: "小红书采集",
      fileUrl: "https://www.xiaohongshu.com/explore/demo-note-001",
      metadataJson: {
        kind: "XHS_BRAND_NOTE",
        sourceAccountId: "acc_demo_001",
        noteId: "demo-note-001",
        noteUrl: "https://www.xiaohongshu.com/explore/demo-note-001",
        noteType: "nomal",
        nickname: "武汉仟吉烘焙",
        imageList: [DEMO_NOTE_IMAGE_1_URL, DEMO_NOTE_IMAGE_2_URL],
        externalUserId: "xhs_brand_demo_001",
        likeCount: 186,
        collectCount: 92,
        createdAtText: "2026-05-02 09:15:00",
        shareCount: 24,
        commentCount: 16,
        videoUrl: undefined,
        collectedAt: "2026-05-02T09:15:00.000Z",
        raw: {
          title: "武汉仟吉爆浆提拉米苏值得买吗？",
          type: "nomal",
          nickname: "武汉仟吉烘焙",
          images_list: [DEMO_NOTE_IMAGE_1_URL, DEMO_NOTE_IMAGE_2_URL],
          userid: "xhs_brand_demo_001",
          likes: 186,
          collected_count: 92,
          create_time: "2026-05-02 09:15:00",
          comments_count: 16,
          share_count: 24,
          desc: "门店新品种草向图文笔记",
          video_download_url: undefined,
        },
      },
    },
    {
      id: "ast_demo_growth_report_001",
      brandId: "br_demo_001",
      category: "GENERATED_REPORT",
      title: "武汉仟吉品牌增长报告",
      description: "围绕品牌现状、内容采集和增长机会形成的首版品牌增长报告。",
      sourceName: "系统生成",
      fileUrl: DEMO_BRAND_REPORT_FILE_URL,
      metadataJson: {
        kind: "BRAND_GROWTH_REPORT",
        generatedAt: "2026-05-01T10:00:00.000Z",
        taskId: "tsk_demo_001",
        mediaId: "med_demo_001",
        summary: "品牌线下基础较强，但公域内容供给和会员转化链路仍有明显提升空间。",
        diagnosis: [
          "品牌产品力和门店覆盖具备基础优势，但线上内容资产积累不足。",
          "小红书账号与竞品差距主要体现在持续更新频率和互动运营。",
          "经营数据与行业报告说明节日礼赠和门店转化是近期增长重点。"
        ],
        opportunities: [
          "围绕节日礼赠场景做爆款产品种草内容矩阵。",
          "用门店日常与新品体验提升用户评论互动率。",
          "把品牌报告、营销日历和原创笔记串成标准内容生产链路。"
        ],
        nextActions: [
          "完成小红书账号和品牌作品的固定周期采集。",
          "生成首版小红书营销策划方案并同步到营销日历。",
          "围绕核心产品完成原创笔记首轮投放测试。"
        ],
        metrics: {
          productCount: 2,
          platformAccountCount: 2,
          competitorAccountCount: 1,
          brandNoteCount: 1
        },
        htmlContent: "<section><h1>武汉仟吉品牌增长报告</h1><p>品牌线下基础较强，但公域内容供给和会员转化链路仍有明显提升空间。</p><h2>核心诊断</h2><ul><li>品牌产品力和门店覆盖具备基础优势，但线上内容资产积累不足。</li><li>小红书账号与竞品差距主要体现在持续更新频率和互动运营。</li><li>经营数据与行业报告说明节日礼赠和门店转化是近期增长重点。</li></ul><h2>增长机会</h2><ul><li>围绕节日礼赠场景做爆款产品种草内容矩阵。</li><li>用门店日常与新品体验提升用户评论互动率。</li><li>把品牌报告、营销日历和原创笔记串成标准内容生产链路。</li></ul><h2>下一步动作</h2><ul><li>完成小红书账号和品牌作品的固定周期采集。</li><li>生成首版小红书营销策划方案并同步到营销日历。</li><li>围绕核心产品完成原创笔记首轮投放测试。</li></ul></section>"
      }
    },
  ],
  tasks: [
    {
      id: "tsk_demo_001",
      userId: "usr_demo_001",
      brandId: "br_demo_001",
      taskType: "BRAND_GROWTH_REPORT",
      taskTitle: "生成品牌增长报告",
      taskStatus: "SUCCESS",
      modelName: "gpt-5.5",
      pointsCost: 320,
      createdAt: "2026-05-01T09:20:00.000Z",
      updatedAt: "2026-05-01T09:25:00.000Z",
    },
    {
      id: "tsk_demo_002",
      userId: "usr_demo_001",
      brandId: "br_demo_001",
      taskType: "XHS_MARKETING_PLAN",
      taskTitle: "生成小红书营销策划方案",
      taskStatus: "RUNNING",
      modelName: "gpt-5.5",
      pointsCost: 260,
      createdAt: "2026-05-02T02:00:00.000Z",
      updatedAt: "2026-05-02T02:03:00.000Z",
    },
  ],
  media: [
    {
      id: "med_demo_001",
      userId: "usr_demo_001",
      brandId: "br_demo_001",
      taskId: "tsk_demo_001",
      title: "品牌增长可视化报告",
      mediaType: "HTML",
      storageKey: "reports/br_demo_001/growth-report.html",
      sourceUrl: DEMO_BRAND_REPORT_SOURCE_URL,
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-01T10:00:00.000Z",
      mimeType: "text/html",
    },
    {
      id: "med_demo_002",
      userId: "usr_demo_001",
      brandId: "br_demo_001",
      title: "爆浆提拉米苏封面图",
      mediaType: "IMAGE",
      storageKey: "works/br_demo_001/post-cover-001.png",
      sourceUrl: DEMO_WORK_COVER_SOURCE_URL,
      createdAt: "2026-05-02T03:10:00.000Z",
      updatedAt: "2026-05-02T03:10:00.000Z",
      mimeType: "image/png",
    },
  ],
  pointLedgers: [
    {
      id: "ptl_demo_001",
      userId: "usr_demo_001",
      changeType: "SYSTEM_GRANT",
      pointsDelta: 10000,
      balanceAfter: 10000,
      description: "新用户演示点数发放",
      createdAt: "2026-04-30T10:00:00.000Z",
    },
    {
      id: "ptl_demo_002",
      userId: "usr_demo_001",
      changeType: "TASK_CONSUME",
      pointsDelta: -320,
      balanceAfter: 9680,
      description: "生成品牌增长报告",
      relatedTaskId: "tsk_demo_001",
      createdAt: "2026-05-01T09:25:00.000Z",
    },
    {
      id: "ptl_demo_003",
      userId: "usr_demo_001",
      changeType: "POINTS_RECHARGE",
      pointsDelta: 5000,
      balanceAfter: 14680,
      description: "点数充值到账",
      createdAt: "2026-05-02T01:40:00.000Z",
    },
    {
      id: "ptl_demo_004",
      userId: "usr_demo_001",
      changeType: "TASK_CONSUME",
      pointsDelta: -260,
      balanceAfter: 14420,
      description: "生成小红书营销策划方案",
      relatedTaskId: "tsk_demo_002",
      createdAt: "2026-05-02T02:03:00.000Z",
    },
  ],
  orders: [
    {
      id: "ord_demo_001",
      userId: "usr_demo_001",
      orderNo: "MO202605010001",
      orderType: "MEMBERSHIP_PURCHASE",
      orderStatus: "PAID",
      membership: "PRO",
      amountYuan: 699,
      paidAt: "2026-05-01T08:50:00.000Z",
      createdAt: "2026-05-01T08:45:00.000Z",
      updatedAt: "2026-05-01T08:50:00.000Z",
    },
    {
      id: "ord_demo_002",
      userId: "usr_demo_001",
      orderNo: "PO202605020001",
      orderType: "POINTS_RECHARGE",
      orderStatus: "PAID",
      pointsAmount: 5000,
      amountYuan: 50,
      paidAt: "2026-05-02T01:40:00.000Z",
      createdAt: "2026-05-02T01:35:00.000Z",
      updatedAt: "2026-05-02T01:40:00.000Z",
    },
  ],
  billingRules: {
    membershipPlans: [
      {
        id: "plan_basic",
        membership: "BASIC",
        title: "基础会员",
        amountYuan: 199,
        pointsBonus: 1000,
        description: "适合初步体验品牌建档、报告生成和个人中心管理。",
      },
      {
        id: "plan_pro",
        membership: "PRO",
        title: "专业会员",
        amountYuan: 699,
        pointsBonus: 5000,
        description: "适合持续进行品牌增长分析、任务执行和作品沉淀。",
      },
      {
        id: "plan_enterprise",
        membership: "ENTERPRISE",
        title: "企业会员",
        amountYuan: 1999,
        pointsBonus: 20000,
        description: "适合团队协同、长期增长与更高额度的全域运营场景。",
      },
    ],
    pointsPackages: [
      {
        id: "pkg_1000",
        title: "入门点数包",
        pointsAmount: 1000,
        amountYuan: 10,
        description: "适合少量生成任务和单次报告产出。",
      },
      {
        id: "pkg_5000",
        title: "常用点数包",
        pointsAmount: 5000,
        amountYuan: 50,
        description: "适合连续执行品牌增长分析与日常任务消耗。",
      },
      {
        id: "pkg_20000",
        title: "高频点数包",
        pointsAmount: 20000,
        amountYuan: 180,
        description: "适合高频任务执行和团队协作场景。",
      },
    ],
  },
  modelUsage: [
    {
      id: "usage_gpt55",
      modelName: "gpt-5.5",
      provider: "全球文生文",
      taskCount: 2,
      successCount: 1,
      failedCount: 0,
      totalPointsCost: 580,
      estimatedAmountYuan: 5.8,
      lastCalledAt: "2026-05-02T02:03:00.000Z",
    },
    {
      id: "usage_gpt54n",
      modelName: "gpt-5.4-nano",
      provider: "全球文生文",
      taskCount: 1,
      successCount: 1,
      failedCount: 0,
      totalPointsCost: 80,
      estimatedAmountYuan: 0.8,
      lastCalledAt: "2026-05-01T11:20:00.000Z",
    },
  ],
  skillConfigs: [
    {
      id: "skill_growth_analysis",
      name: "品牌全域增长分析",
      slug: "brand-omni-growth-analysis",
      category: "品牌增长",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 320,
      description: "用于生成品牌诊断、增长机会和年度增长方向建议。",
      updatedAt: "2026-05-02T02:03:00.000Z",
    },
    {
      id: "skill_annual_plan",
      name: "半年营销规划",
      slug: "enterprise-annual-plan",
      category: "品牌增长",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 280,
      description: "用于输出未来半年营销节点、活动主题和多平台协同规划。",
      updatedAt: "2026-05-04T12:00:00.000Z",
    },
    {
      id: "skill_xhs_plan",
      name: "小红书营销规划",
      slug: "xiaohongshu-brand-marketing-plan",
      category: "内容营销",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "gpt-5.5",
      pointsCost: 260,
      description: "用于输出小红书品牌规划、内容选题和种草策略。",
      updatedAt: "2026-05-01T18:45:00.000Z",
    },
    {
      id: "skill_douyin_plan",
      name: "抖音营销策划方案",
      slug: "tongcheng-brand-douyin-planning",
      category: "内容营销",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 260,
      description: "用于基于品牌报告、半年营销规划和抖音采集数据生成抖音营销策划方案。",
      updatedAt: "2026-05-21T18:20:00.000Z",
    },
    {
      id: "skill_douyin_hot_topic_candidates",
      name: "抖音热点找选题",
      slug: "douyin-hot-topic-candidates",
      category: "内容营销",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 120,
      description: "用于基于指定日期的每日热点榜单和品牌背景资料生成 3 个抖音热点选题。",
      updatedAt: "2026-05-27T19:40:00.000Z",
    },
    {
      id: "skill_douyin_original_copy_viewpoint",
      name: "抖音原创文案-聊观点",
      slug: "douyin-original-copy-viewpoint",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成聊观点类抖音原创短视频文案。",
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "skill_douyin_original_copy_story",
      name: "抖音原创文案-讲故事",
      slug: "douyin-original-copy-story",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成讲故事类抖音原创短视频文案。",
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "skill_douyin_original_copy_process",
      name: "抖音原创文案-晒过程",
      slug: "douyin-original-copy-process",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成晒过程类抖音原创短视频文案。",
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "skill_douyin_original_copy_knowledge",
      name: "抖音原创文案-教知识",
      slug: "douyin-original-copy-knowledge",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成教知识类抖音原创短视频文案。",
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "skill_douyin_original_copy_plot_sales",
      name: "抖音原创文案-剧情带货",
      slug: "douyin-original-copy-plot-sales",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成剧情带货类抖音原创短视频文案。",
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "skill_douyin_original_copy_seeding",
      name: "抖音原创文案-种草类",
      slug: "douyin-original-copy-seeding",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成种草类抖音原创短视频文案。",
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "skill_douyin_original_copy_local_sales",
      name: "抖音原创文案-同城带货",
      slug: "douyin-original-copy-local-sales",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成同城带货类抖音原创短视频文案。",
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "skill_douyin_remix_copy_intro",
      name: "抖音二创文案-拆解开头",
      slug: "douyin-remix-copy-intro",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 100,
      description: "用于拆解素材视频文案中的开头结构、钩子和起势表达。",
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "skill_douyin_remix_copy_body",
      name: "抖音二创文案-拆解正文",
      slug: "douyin-remix-copy-body",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 100,
      description: "用于拆解素材视频文案中的正文结构、重点表达和转折节奏。",
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "skill_douyin_remix_copy_outro",
      name: "抖音二创文案-拆解结尾",
      slug: "douyin-remix-copy-outro",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 100,
      description: "用于拆解素材视频文案中的结尾收束、互动引导和转化动作。",
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "skill_douyin_remix_copy_final",
      name: "抖音二创文案-生成二创文案",
      slug: "douyin-remix-copy-final",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 180,
      description: "用于整合拆解结果、品牌资料、产品资料、营销策划资料和用户要求，生成最终抖音二创文案。",
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "skill_xhs_calendar",
      name: "小红书营销日历",
      slug: "xiaohongshu-marketing-calendar",
      category: "内容营销",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 180,
      description: "用于基于营销策划方案、半年规划、热点与历史记录生成未来 7 天营销日历。",
      updatedAt: "2026-05-14T22:30:00.000Z",
    },
    {
      id: "skill_article_report",
      name: "文章可视化报告",
      slug: "article-visual-report-designer",
      category: "可视化报告",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-flash",
      pointsCost: 180,
      description: "用于将长文转化为可视化信息报告页面。",
      updatedAt: "2026-05-01T11:20:00.000Z",
    },
    {
      id: "skill_xhs_original_copy",
      name: "小红书原创笔记文案",
      slug: "original_copy",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 140,
      description: "用于生成小红书原创笔记标题、正文与标签。",
      updatedAt: "2026-05-07T10:30:00.000Z",
    },
    {
      id: "skill_xhs_original_note",
      name: "小红书原创笔记配图",
      slug: "xhs-original-image-prompt",
      category: "内容生产",
      status: "ACTIVE",
      provider: "图像生成",
      defaultModel: "gpt-5.5",
      pointsCost: 160,
      description: "用于生成小红书原创笔记封面提示词与原创配图提示词。",
      updatedAt: "2026-05-06T09:00:00.000Z",
    },
    {
      id: "skill_xhs_original_image_generation",
      name: "小红书原创图片生成",
      slug: "xhs-original-image-generation",
      category: "内容生产",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 180,
      description: "用于控制原创封面图与内页配图的最终出图模型、参考图跟随策略与画面安全区约束。",
      updatedAt: "2026-05-15T16:20:00.000Z",
    },
    {
      id: "skill_xhs_rewrite_copy",
      name: "小红书二创笔记文案",
      slug: "rewrite_copy",
      category: "内容生产",
      status: "ACTIVE",
      provider: "OpenAI Proxy",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 160,
      description: "用于根据对标内容、营销规划和用户要求生成二创标题、正文与标签。",
      updatedAt: "2026-05-07T15:40:00.000Z",
    },
    {
      id: "skill_xhs_rewrite_note",
      name: "小红书二创笔记配图",
      slug: "rewrite_image",
      category: "内容生产",
      status: "ACTIVE",
      provider: "OpenAI Proxy",
      defaultModel: "gpt-5.5",
      pointsCost: 180,
      description: "用于根据对标内容与二创文案生成全新的二创配图提示词。",
      updatedAt: "2026-05-07T15:40:00.000Z",
    },
    {
      id: "skill_xhs_rewrite_image_generation",
      name: "小红书二创图片生成",
      slug: "rewrite_image_generation",
      category: "内容生产",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 200,
      description: "用于控制二创封面图与内页配图的最终出图模型、参考图跟随策略与画面安全区约束。",
      updatedAt: "2026-05-15T16:20:00.000Z",
    },
    {
      id: "skill_xhs_video_note",
      name: "小红书视频笔记",
      slug: "short-video-api-studio",
      category: "内容生产",
      status: "ACTIVE",
      provider: "视频生成 · Seedance",
      defaultModel: "doubao-seedance-2-0-260128",
      pointsCost: 240,
      description: "用于编排视频笔记的剧本、故事板提示词、故事板图片和短视频生成全流程。",
      updatedAt: "2026-05-06T09:10:00.000Z",
    },
    {
      id: "skill_wechat_article_compose",
      name: "公众号创作文章",
      slug: "wechat-article-composer",
      category: "内容生产",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "用于根据营销日历、产品信息、品牌信息和主题色生成结构化公众号文章正文与图片提示词。",
      updatedAt: "2026-06-03T11:00:00.000Z",
    },
    {
      id: "skill_wechat_cover_image_compose",
      name: "公众号封面图生成",
      slug: "wechat-cover-image-designer",
      category: "内容生产",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 180,
      description: "用于生成公众号工作流中的封面图、头图和发布主视觉。",
      updatedAt: "2026-06-05T22:40:00.000Z",
    },
    {
      id: "skill_wechat_body_image_compose",
      name: "公众号正文配图生成",
      slug: "wechat-body-image-designer",
      category: "内容生产",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 200,
      description: "用于生成公众号工作流中的正文插图、场景图和产品辅助图。",
      updatedAt: "2026-06-05T22:40:00.000Z",
    },
    {
      id: "skill_wechat_html_render",
      name: "公众号HTML渲染",
      slug: "wechat-html-renderer",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "provider_runtime_text_deepseek::deepseek-v4-pro",
      pointsCost: 160,
      description: "用于将公众号文章正文、封面图和正文配图渲染为最终可发布的公众号 HTML。",
      updatedAt: "2026-06-06T20:30:00.000Z",
    },
    {
      id: "skill_wechat_api_publish",
      name: "公众号API发布",
      slug: "wechat-api-publisher",
      category: "创作与发布",
      status: "ACTIVE",
      provider: "公众号官方 API",
      defaultModel: "wechat-official-account-api-publish",
      pointsCost: 60,
      description: "用于整理公众号 API 发布参数、校验项、草稿箱发布动作与重试建议。",
      updatedAt: "2026-06-05T22:40:00.000Z",
    },
    {
      id: "skill_douyin_video_note",
      name: "抖音AI生视频（故事板）",
      slug: "douyin-video-storyboard-studio",
      category: "内容生产",
      status: "ACTIVE",
      provider: "视频生成 · Seedance",
      defaultModel: "doubao-seedance-2-0-260128",
      pointsCost: 240,
      description: "用于编排抖音 AI生视频（故事板）的剧本、故事板提示词、故事板图片和短视频生成全流程。",
      updatedAt: "2026-05-30T22:00:00.000Z",
    },
    {
      id: "skill_douyin_direct_video",
      name: "抖音AI生视频",
      slug: "douyin-direct-video-studio",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 180,
      description: "用于根据选题、产品、素材和营销策划生成可直接用于 Seedance 2.0 的抖音视频提示词。",
      updatedAt: "2026-05-30T23:20:00.000Z",
    },
    {
      id: "skill_douyin_digital_human_script",
      name: "抖音数字人口播脚本",
      slug: "douyin-digital-human-script-studio",
      category: "内容生产",
      status: "ACTIVE",
      provider: "国内文生文 · DeepSeek",
      defaultModel: "deepseek-v4-pro",
      pointsCost: 180,
      description: "用于生成适合抖音数字人口播视频的脚本文案。",
      updatedAt: "2026-05-30T23:40:00.000Z",
    },
    {
      id: "skill_design_web_prototype",
      name: "设计工作台-HTML 原型设计",
      slug: "design-web-prototype",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 web-prototype 方向，用于生成活动页、品牌页和 landing page 的 HTML 原型。",
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "skill_design_dashboard",
      name: "设计工作台-数据看板设计",
      slug: "design-dashboard",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 dashboard 方向，用于生成经营分析、运营监控和 KPI 数据看板页面。",
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "skill_design_saas_landing",
      name: "设计工作台-SaaS 落地页设计",
      slug: "design-saas-landing",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 saas-landing 方向，用于生成功能卖点、价格方案和 CTA 完整的营销落地页。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_email_marketing",
      name: "设计工作台-邮件营销页设计",
      slug: "design-email-marketing",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 email-marketing 方向，用于生成新品发布、活动预热和促销邮件页面结构。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_docs_page",
      name: "设计工作台-文档展示页设计",
      slug: "design-docs-page",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 docs-page 方向，用于生成产品说明页、能力说明页和知识页。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_blog_post",
      name: "设计工作台-博客长页设计",
      slug: "design-blog-post",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 blog-post 方向，用于生成长图文博客页、专题页和内容发布页。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_mobile_onboarding",
      name: "设计工作台-移动端引导设计",
      slug: "design-mobile-onboarding",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 mobile onboarding / mobile app 方向，用于生成移动端引导流与多屏原型。",
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "skill_design_gamified_app",
      name: "设计工作台-游戏化活动页设计",
      slug: "design-gamified-app",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 gamified-app 方向，用于生成任务化、积分化、闯关式互动页面。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_social_carousel",
      name: "设计工作台-社媒轮播图设计",
      slug: "design-social-carousel",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 200,
      description: "对应 Open Design 的 social-carousel 方向，用于生成品牌社媒轮播图、方版卡片和传播视觉。",
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "skill_design_magazine_poster",
      name: "设计工作台-杂志风海报设计",
      slug: "design-magazine-poster",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 220,
      description: "对应 Open Design 的 magazine-poster / editorial 方向，用于生成杂志风海报、主视觉和封面图。",
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "skill_design_motion_frames",
      name: "设计工作台-动效首帧设计",
      slug: "design-motion-frames",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 220,
      description: "对应 Open Design 的 motion-frames 方向，用于生成动效海报首帧、动态标题视觉和可延展的动画关键帧。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_sprite_animation",
      name: "设计工作台-像素动画首帧设计",
      slug: "design-sprite-animation",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes · 文生图/图生图",
      defaultModel: "provider_runtime_image_generation_right_codes::gpt-image-2",
      pointsCost: 220,
      description: "对应 Open Design 的 sprite-animation 方向，用于生成像素风、8-bit 和循环动画首帧视觉。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_pitch_deck",
      name: "设计工作台-Pitch Deck 设计",
      slug: "design-pitch-deck",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 220,
      description: "对应 Open Design 的 guizang-ppt / deck 方向，用于生成品牌提案、Pitch Deck 和汇报结构。",
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "skill_design_weekly_update",
      name: "设计工作台-周报更新 Deck",
      slug: "design-weekly-update",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 weekly-update 方向，用于生成周报、阶段复盘和里程碑更新 deck。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_simple_deck",
      name: "设计工作台-极简 Deck",
      slug: "design-simple-deck",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 simple-deck 方向，用于生成极简汇报、产品概览和单主题演示稿。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_design_video_storyboard",
      name: "设计工作台-视频故事板设计",
      slug: "design-video-storyboard",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 200,
      description: "对应 Open Design 的 motion / storyboard 方向，用于生成视频故事板、镜头脚本和口播建议。",
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "skill_design_motion_storyboard",
      name: "设计工作台-动效脚本设计",
      slug: "design-motion-storyboard",
      category: "设计工作台",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 200,
      description: "对应 Open Design 的 motion-frames 延展方向，用于生成动态标题、节奏镜头和转场脚本。",
      updatedAt: "2026-06-04T00:20:00.000Z",
    },
    {
      id: "skill_open_design_critique",
      name: "Open Design-设计评审",
      slug: "critique",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 120,
      description: "对应 Open Design 的 critique skill，用于对现有方案进行结构化设计评审与修改建议输出。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_tweaks",
      name: "Open Design-定向微调",
      slug: "tweaks",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 120,
      description: "对应 Open Design 的 tweaks skill，用于在既有方向上进行局部微调和精修。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_wireframe_sketch",
      name: "Open Design-线框草图",
      slug: "wireframe-sketch",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 140,
      description: "对应 Open Design 的 wireframe-sketch skill，用于生成低保真线框、信息架构和模块布局。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_design_brief",
      name: "Open Design-设计简报",
      slug: "design-brief",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 120,
      description: "对应 Open Design 的 design-brief skill，用于整理目标、受众、约束和交付定义。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_dating_web",
      name: "Open Design-约会产品网页",
      slug: "dating-web",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 dating-web skill，用于生成偏 editorial 风格的消费级产品官网或数据页。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_digital_eguide",
      name: "Open Design-数字指南",
      slug: "digital-eguide",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 digital-eguide skill，用于生成电子指南、说明册与阅读型页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_hatch_pet",
      name: "Open Design-宠物孵化互动页",
      slug: "hatch-pet",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 hatch-pet skill，用于生成游戏化、IP 化的互动体验页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_audio_jingle",
      name: "Open Design-音频 Jingle",
      slug: "audio-jingle",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 100,
      description: "对应 Open Design 的 audio-jingle skill，用于生成品牌音频 brief、旋律方向和声音识别方案。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_pm_spec",
      name: "Open Design-PM 规格说明",
      slug: "pm-spec",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 pm-spec skill，用于输出产品规格说明、交互约束和验收标准。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_eng_runbook",
      name: "Open Design-工程 Runbook",
      slug: "eng-runbook",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 eng-runbook skill，用于输出上线发布、值守和回滚文档。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_finance_report",
      name: "Open Design-财务报告",
      slug: "finance-report",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 finance-report skill，用于生成财务简报、预算复盘和经营摘要页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_hr_onboarding",
      name: "Open Design-HR 入职引导",
      slug: "hr-onboarding",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 hr-onboarding skill，用于生成员工入职说明与培训引导页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_invoice",
      name: "Open Design-发票模板",
      slug: "invoice",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 120,
      description: "对应 Open Design 的 invoice skill，用于生成账单、发票和结算类页面模板。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_kanban_board",
      name: "Open Design-看板面板",
      slug: "kanban-board",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 kanban-board skill，用于生成任务看板、泳道与团队协作界面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_team_okrs",
      name: "Open Design-团队 OKR",
      slug: "team-okrs",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 team-okrs skill，用于生成目标拆解、关键结果和进展管理页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_replit_deck",
      name: "Open Design-Replit Deck",
      slug: "replit-deck",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 replit-deck skill，用于生成现代创业产品演示 Deck。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_html_ppt_course_module",
      name: "Open Design-课程模块 Deck",
      slug: "html-ppt-course-module",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 html-ppt-course-module skill，用于生成课程模块和培训课件页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_html_ppt_dir_key_nav_minimal",
      name: "Open Design-极简目录 Deck",
      slug: "html-ppt-dir-key-nav-minimal",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 160,
      description: "对应 Open Design 的 html-ppt-dir-key-nav-minimal skill，用于生成目录式极简 Deck 页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_html_ppt_graphify_dark_graph",
      name: "Open Design-深色图表 Deck",
      slug: "html-ppt-graphify-dark-graph",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 html-ppt-graphify-dark-graph skill，用于生成深色科技感图表演示页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_html_ppt_hermes_cyber_terminal",
      name: "Open Design-赛博终端 Deck",
      slug: "html-ppt-hermes-cyber-terminal",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 html-ppt-hermes-cyber-terminal skill，用于生成赛博终端风叙事演示页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "skill_open_design_html_ppt_knowledge_arch_blueprint",
      name: "Open Design-知识架构蓝图 Deck",
      slug: "html-ppt-knowledge-arch-blueprint",
      category: "Open Design",
      status: "ACTIVE",
      provider: "Right Codes 文生文",
      defaultModel: "provider_runtime_text_global::gpt-5.5",
      pointsCost: 180,
      description: "对应 Open Design 的 html-ppt-knowledge-arch-blueprint skill，用于生成知识架构与系统蓝图演示页面。",
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
  ],
  promptTemplates: [
    {
      id: "prompt_growth_report",
      name: "品牌增长报告主提示词",
      scene: "品牌增长报告生成",
      version: "v1.3",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.6,
      maxTokens: 6000,
      content: brandGrowthSkillContent,
      updatedAt: "2026-05-02T02:03:00.000Z",
    },
    {
      id: "prompt_xhs_plan",
      name: "小红书策划提示词",
      scene: "小红书营销规划",
      version: "v1.1",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.7,
      maxTokens: 12000,
      content: xiaohongshuPlanSkillContent,
      updatedAt: "2026-05-01T18:45:00.000Z",
    },
    {
      id: "prompt_douyin_plan",
      name: "抖音营销策划方案提示词",
      scene: "抖音营销策划方案",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.7,
      maxTokens: 12000,
      content: douyinPlanSkillContent,
      updatedAt: "2026-05-21T18:20:00.000Z",
    },
    {
      id: "prompt_douyin_hot_topic_candidates",
      name: "抖音热点找选题提示词",
      scene: "抖音热点找选题",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.5,
      maxTokens: 3200,
      content: douyinHotTopicCandidatesSkillContent,
      updatedAt: "2026-05-27T19:40:00.000Z",
    },
    {
      id: "prompt_douyin_original_copy_viewpoint",
      name: "抖音原创文案-聊观点提示词",
      scene: "抖音原创文案-聊观点",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 3200,
      content: douyinOriginalCopyViewpointSkillContent,
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_original_copy_story",
      name: "抖音原创文案-讲故事提示词",
      scene: "抖音原创文案-讲故事",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 3200,
      content: douyinOriginalCopyStorySkillContent,
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_original_copy_process",
      name: "抖音原创文案-晒过程提示词",
      scene: "抖音原创文案-晒过程",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 3200,
      content: douyinOriginalCopyProcessSkillContent,
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_original_copy_knowledge",
      name: "抖音原创文案-教知识提示词",
      scene: "抖音原创文案-教知识",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 3200,
      content: douyinOriginalCopyKnowledgeSkillContent,
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_original_copy_plot_sales",
      name: "抖音原创文案-剧情带货提示词",
      scene: "抖音原创文案-剧情带货",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 3200,
      content: douyinOriginalCopyPlotSalesSkillContent,
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_original_copy_seeding",
      name: "抖音原创文案-种草类提示词",
      scene: "抖音原创文案-种草类",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 3200,
      content: douyinOriginalCopySeedingSkillContent,
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_original_copy_local_sales",
      name: "抖音原创文案-同城带货提示词",
      scene: "抖音原创文案-同城带货",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 3200,
      content: douyinOriginalCopyLocalSalesSkillContent,
      updatedAt: "2026-05-30T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_remix_copy_intro",
      name: "抖音二创文案-拆解开头提示词",
      scene: "抖音二创文案-拆解开头",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.3,
      maxTokens: 2400,
      content: douyinRemixCopyIntroSkillContent,
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "prompt_douyin_remix_copy_body",
      name: "抖音二创文案-拆解正文提示词",
      scene: "抖音二创文案-拆解正文",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.3,
      maxTokens: 3200,
      content: douyinRemixCopyBodySkillContent,
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "prompt_douyin_remix_copy_outro",
      name: "抖音二创文案-拆解结尾提示词",
      scene: "抖音二创文案-拆解结尾",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.3,
      maxTokens: 2400,
      content: douyinRemixCopyOutroSkillContent,
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "prompt_douyin_remix_copy_final",
      name: "抖音二创文案-生成二创文案提示词",
      scene: "抖音二创文案-生成二创文案",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 4200,
      content: douyinRemixCopyFinalSkillContent,
      updatedAt: "2026-05-30T18:00:00.000Z",
    },
    {
      id: "prompt_xhs_calendar",
      name: "小红书营销日历提示词",
      scene: "小红书营销日历生成",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.6,
      maxTokens: 12000,
      content: xiaohongshuCalendarSkillContent,
      updatedAt: "2026-05-14T22:30:00.000Z",
    },
    {
      id: "prompt_visual_report",
      name: "可视化报告提示词",
      scene: "HTML 可视化报告生成",
      version: "v0.9",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.4,
      maxTokens: 3200,
      content: visualReportSkillContent,
      updatedAt: "2026-05-01T11:20:00.000Z",
    },
    {
      id: "prompt_xhs_original_copy",
      name: "小红书原创笔记文案提示词",
      scene: "小红书原创笔记文案",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.3,
      maxTokens: 2200,
      content: xiaohongshuOriginalCopySkillContent,
      updatedAt: "2026-05-07T10:30:00.000Z",
    },
    {
      id: "prompt_xhs_original_note",
      name: "小红书原创笔记配图提示词",
      scene: "小红书原创笔记配图",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.7,
      maxTokens: 6000,
      content: xiaohongshuOriginalNoteSkillContent,
      updatedAt: "2026-05-06T09:00:00.000Z",
    },
    {
      id: "prompt_xhs_original_image_generation",
      name: "小红书原创图片生成提示词",
      scene: "小红书原创图片生成",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.2,
      maxTokens: 4000,
      content: xiaohongshuOriginalImageGenerationSkillContent,
      updatedAt: "2026-05-15T16:20:00.000Z",
    },
    {
      id: "prompt_xhs_rewrite_copy",
      name: "小红书二创笔记文案提示词",
      scene: "小红书二创笔记文案",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.3,
      maxTokens: 3200,
      content: xiaohongshuRewriteCopySkillContent,
      updatedAt: "2026-05-07T15:40:00.000Z",
    },
    {
      id: "prompt_xhs_rewrite_note",
      name: "小红书二创笔记配图提示词",
      scene: "小红书二创笔记配图",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.7,
      maxTokens: 6000,
      content: xiaohongshuRewriteNoteSkillContent,
      updatedAt: "2026-05-07T15:40:00.000Z",
    },
    {
      id: "prompt_xhs_rewrite_image_generation",
      name: "小红书二创图片生成提示词",
      scene: "小红书二创图片生成",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.2,
      maxTokens: 4000,
      content: xiaohongshuRewriteImageGenerationSkillContent,
      updatedAt: "2026-05-15T16:20:00.000Z",
    },
    {
      id: "prompt_wechat_article_compose",
      name: "公众号创作文章提示词",
      scene: "公众号创作文章",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.4,
      maxTokens: 8000,
      content: wechatArticleComposeSkillContent,
      updatedAt: "2026-06-06T20:30:00.000Z",
    },
    {
      id: "prompt_wechat_cover_image_compose",
      name: "公众号封面图生成提示词",
      scene: "公众号封面图生成",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.3,
      maxTokens: 5000,
      content: wechatCoverImageComposeSkillContent,
      updatedAt: "2026-06-05T22:40:00.000Z",
    },
    {
      id: "prompt_wechat_body_image_compose",
      name: "公众号正文配图生成提示词",
      scene: "公众号正文配图生成",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.3,
      maxTokens: 5000,
      content: wechatBodyImageComposeSkillContent,
      updatedAt: "2026-06-05T22:40:00.000Z",
    },
    {
      id: "prompt_wechat_html_render",
      name: "公众号HTML渲染提示词",
      scene: "公众号HTML渲染",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_deepseek::deepseek-v4-pro",
      temperature: 0.2,
      maxTokens: 8000,
      content: wechatHtmlRenderSkillContent,
      updatedAt: "2026-06-06T20:30:00.000Z",
    },
    {
      id: "prompt_wechat_api_publish",
      name: "公众号API发布提示词",
      scene: "公众号API发布",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "wechat-official-account-api-publish",
      temperature: 0.1,
      maxTokens: 3000,
      content: wechatApiPublishSkillContent,
      updatedAt: "2026-06-05T22:40:00.000Z",
    },
    {
      id: "prompt_design_web_prototype",
      name: "设计工作台-HTML 原型设计提示词",
      scene: "设计工作台-HTML 原型设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.5,
      maxTokens: 8000,
      content: designWebPrototypeSkillContent,
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "prompt_design_dashboard",
      name: "设计工作台-数据看板设计提示词",
      scene: "设计工作台-数据看板设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.4,
      maxTokens: 8000,
      content: designDashboardSkillContent,
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "prompt_design_saas_landing",
      name: "设计工作台-SaaS 落地页设计提示词",
      scene: "设计工作台-SaaS 落地页设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 8000,
      content: designSaasLandingSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_email_marketing",
      name: "设计工作台-邮件营销页设计提示词",
      scene: "设计工作台-邮件营销页设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 7000,
      content: designEmailMarketingSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_docs_page",
      name: "设计工作台-文档展示页设计提示词",
      scene: "设计工作台-文档展示页设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.4,
      maxTokens: 7000,
      content: designDocsPageSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_blog_post",
      name: "设计工作台-博客长页设计提示词",
      scene: "设计工作台-博客长页设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 8000,
      content: designBlogPostSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_mobile_onboarding",
      name: "设计工作台-移动端引导设计提示词",
      scene: "设计工作台-移动端引导设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.5,
      maxTokens: 8000,
      content: designMobileOnboardingSkillContent,
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "prompt_design_gamified_app",
      name: "设计工作台-游戏化活动页设计提示词",
      scene: "设计工作台-游戏化活动页设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.5,
      maxTokens: 8000,
      content: designGamifiedAppSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_social_carousel",
      name: "设计工作台-社媒轮播图设计提示词",
      scene: "设计工作台-社媒轮播图设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.3,
      maxTokens: 5000,
      content: designSocialCarouselSkillContent,
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "prompt_design_magazine_poster",
      name: "设计工作台-杂志风海报设计提示词",
      scene: "设计工作台-杂志风海报设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.3,
      maxTokens: 5000,
      content: designMagazinePosterSkillContent,
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "prompt_design_motion_frames",
      name: "设计工作台-动效首帧设计提示词",
      scene: "设计工作台-动效首帧设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.3,
      maxTokens: 5000,
      content: designMotionFramesSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_sprite_animation",
      name: "设计工作台-像素动画首帧设计提示词",
      scene: "设计工作台-像素动画首帧设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_image_generation_right_codes::gpt-image-2",
      temperature: 0.3,
      maxTokens: 5000,
      content: designSpriteAnimationSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_pitch_deck",
      name: "设计工作台-Pitch Deck 设计提示词",
      scene: "设计工作台-Pitch Deck 设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.5,
      maxTokens: 9000,
      content: designPitchDeckSkillContent,
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "prompt_design_weekly_update",
      name: "设计工作台-周报更新 Deck 提示词",
      scene: "设计工作台-周报更新 Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 8000,
      content: designWeeklyUpdateSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_simple_deck",
      name: "设计工作台-极简 Deck 提示词",
      scene: "设计工作台-极简 Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.4,
      maxTokens: 7000,
      content: designSimpleDeckSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_design_video_storyboard",
      name: "设计工作台-视频故事板设计提示词",
      scene: "设计工作台-视频故事板设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.5,
      maxTokens: 8000,
      content: designVideoStoryboardSkillContent,
      updatedAt: "2026-06-03T23:30:00.000Z",
    },
    {
      id: "prompt_design_motion_storyboard",
      name: "设计工作台-动效脚本设计提示词",
      scene: "设计工作台-动效脚本设计",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 8000,
      content: designMotionStoryboardSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_critique",
      name: "Open Design-设计评审提示词",
      scene: "Open Design-设计评审",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.3,
      maxTokens: 5000,
      content: openDesignCritiqueSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_tweaks",
      name: "Open Design-定向微调提示词",
      scene: "Open Design-定向微调",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 5000,
      content: openDesignTweaksSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_wireframe_sketch",
      name: "Open Design-线框草图提示词",
      scene: "Open Design-线框草图",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.3,
      maxTokens: 5000,
      content: openDesignWireframeSketchSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_design_brief",
      name: "Open Design-设计简报提示词",
      scene: "Open Design-设计简报",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.3,
      maxTokens: 5000,
      content: openDesignDesignBriefSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_dating_web",
      name: "Open Design-约会产品网页提示词",
      scene: "Open Design-约会产品网页",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 7000,
      content: openDesignDatingWebSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_digital_eguide",
      name: "Open Design-数字指南提示词",
      scene: "Open Design-数字指南",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 7000,
      content: openDesignDigitalEguideSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_hatch_pet",
      name: "Open Design-宠物孵化互动页提示词",
      scene: "Open Design-宠物孵化互动页",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.5,
      maxTokens: 7000,
      content: openDesignHatchPetSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_audio_jingle",
      name: "Open Design-音频 Jingle 提示词",
      scene: "Open Design-音频 Jingle",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.4,
      maxTokens: 4000,
      content: openDesignAudioJingleSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_pm_spec",
      name: "Open Design-PM 规格说明提示词",
      scene: "Open Design-PM 规格说明",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.3,
      maxTokens: 7000,
      content: openDesignPmSpecSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_eng_runbook",
      name: "Open Design-工程 Runbook 提示词",
      scene: "Open Design-工程 Runbook",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.3,
      maxTokens: 7000,
      content: openDesignEngRunbookSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_finance_report",
      name: "Open Design-财务报告提示词",
      scene: "Open Design-财务报告",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 7000,
      content: openDesignFinanceReportSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_hr_onboarding",
      name: "Open Design-HR 入职引导提示词",
      scene: "Open Design-HR 入职引导",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 7000,
      content: openDesignHrOnboardingSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_invoice",
      name: "Open Design-发票模板提示词",
      scene: "Open Design-发票模板",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.2,
      maxTokens: 5000,
      content: openDesignInvoiceSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_kanban_board",
      name: "Open Design-看板面板提示词",
      scene: "Open Design-看板面板",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 6000,
      content: openDesignKanbanBoardSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_team_okrs",
      name: "Open Design-团队 OKR 提示词",
      scene: "Open Design-团队 OKR",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 6000,
      content: openDesignTeamOkrsSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_replit_deck",
      name: "Open Design-Replit Deck 提示词",
      scene: "Open Design-Replit Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 8000,
      content: openDesignReplitDeckSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_html_ppt_course_module",
      name: "Open Design-课程模块 Deck 提示词",
      scene: "Open Design-课程模块 Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.45,
      maxTokens: 8000,
      content: openDesignHtmlPptCourseModuleSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_html_ppt_dir_key_nav_minimal",
      name: "Open Design-极简目录 Deck 提示词",
      scene: "Open Design-极简目录 Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 7000,
      content: openDesignHtmlPptDirKeyNavMinimalSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_html_ppt_graphify_dark_graph",
      name: "Open Design-深色图表 Deck 提示词",
      scene: "Open Design-深色图表 Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 8000,
      content: openDesignHtmlPptGraphifyDarkGraphSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_html_ppt_hermes_cyber_terminal",
      name: "Open Design-赛博终端 Deck 提示词",
      scene: "Open Design-赛博终端 Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.4,
      maxTokens: 8000,
      content: openDesignHtmlPptHermesCyberTerminalSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_open_design_html_ppt_knowledge_arch_blueprint",
      name: "Open Design-知识架构蓝图 Deck 提示词",
      scene: "Open Design-知识架构蓝图 Deck",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "provider_runtime_text_global::gpt-5.5",
      temperature: 0.35,
      maxTokens: 8000,
      content: openDesignHtmlPptKnowledgeArchBlueprintSkillContent,
      updatedAt: "2026-06-04T12:30:00.000Z",
    },
    {
      id: "prompt_xhs_video_note",
      name: "小红书视频笔记提示词",
      scene: "小红书视频笔记",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "doubao-seedance-2-0-260128",
      temperature: 0.6,
      maxTokens: 5000,
      content: xiaohongshuVideoNoteSkillContent,
      updatedAt: "2026-05-06T09:10:00.000Z",
    },
    {
      id: "prompt_xhs_video_brand_script",
      name: "视频笔记-品牌宣传剧本提示词",
      scene: "视频笔记-品牌宣传剧本",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: xiaohongshuVideoBrandScriptSkillContent,
      updatedAt: "2026-05-17T10:00:00.000Z",
    },
    {
      id: "prompt_xhs_video_spoken_script",
      name: "视频笔记-口播带货剧本提示词",
      scene: "视频笔记-口播带货剧本",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: xiaohongshuVideoSpokenScriptSkillContent,
      updatedAt: "2026-05-17T10:00:00.000Z",
    },
    {
      id: "prompt_xhs_video_skit_script",
      name: "视频笔记-短剧带货剧本提示词",
      scene: "视频笔记-短剧带货剧本",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: xiaohongshuVideoSkitScriptSkillContent,
      updatedAt: "2026-05-17T10:00:00.000Z",
    },
    {
      id: "prompt_xhs_video_remix_script",
      name: "视频笔记-复刻视频拆解提示词",
      scene: "视频笔记-复刻视频拆解",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "doubao-seed-2-0-pro-260215",
      temperature: 0.2,
      maxTokens: 6000,
      content: xiaohongshuVideoRemixScriptSkillContent,
      updatedAt: "2026-05-17T10:00:00.000Z",
    },
    {
      id: "prompt_xhs_video_storyboard",
      name: "视频笔记-故事板提示词",
      scene: "视频笔记-故事板提示词",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.4,
      maxTokens: 8000,
      content: xiaohongshuVideoStoryboardSkillContent,
      updatedAt: "2026-05-17T10:00:00.000Z",
    },
    {
      id: "prompt_douyin_video_note",
      name: "抖音AI生视频（故事板）提示词",
      scene: "抖音AI生视频（故事板）",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "doubao-seedance-2-0-260128",
      temperature: 0.6,
      maxTokens: 5000,
      content: douyinVideoNoteSkillContent,
      updatedAt: "2026-05-30T22:00:00.000Z",
    },
    {
      id: "prompt_douyin_video_brand_script",
      name: "抖音AI生视频（故事板）-品牌宣传剧本提示词",
      scene: "抖音AI生视频（故事板）-品牌宣传剧本",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: douyinVideoBrandScriptSkillContent,
      updatedAt: "2026-05-30T22:00:00.000Z",
    },
    {
      id: "prompt_douyin_video_spoken_script",
      name: "抖音AI生视频（故事板）-口播带货剧本提示词",
      scene: "抖音AI生视频（故事板）-口播带货剧本",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: douyinVideoSpokenScriptSkillContent,
      updatedAt: "2026-05-30T22:00:00.000Z",
    },
    {
      id: "prompt_douyin_video_skit_script",
      name: "抖音AI生视频（故事板）-短剧带货剧本提示词",
      scene: "抖音AI生视频（故事板）-短剧带货剧本",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: douyinVideoSkitScriptSkillContent,
      updatedAt: "2026-05-30T22:00:00.000Z",
    },
    {
      id: "prompt_douyin_video_remix_script",
      name: "抖音AI生视频（故事板）-复刻视频拆解提示词",
      scene: "抖音AI生视频（故事板）-复刻视频拆解",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "doubao-seed-2-0-pro-260215",
      temperature: 0.2,
      maxTokens: 6000,
      content: douyinVideoRemixScriptSkillContent,
      updatedAt: "2026-05-30T22:00:00.000Z",
    },
    {
      id: "prompt_douyin_video_storyboard",
      name: "抖音AI生视频（故事板）-故事板提示词",
      scene: "抖音AI生视频（故事板）-故事板提示词",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.4,
      maxTokens: 8000,
      content: douyinVideoStoryboardSkillContent,
      updatedAt: "2026-05-30T22:00:00.000Z",
    },
    {
      id: "prompt_douyin_direct_video",
      name: "抖音AI生视频-Seedance提示词",
      scene: "抖音AI生视频-Seedance提示词",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: douyinDirectVideoSkillContent,
      updatedAt: "2026-05-30T23:20:00.000Z",
    },
    {
      id: "prompt_douyin_digital_human_script",
      name: "抖音数字人-口播脚本",
      scene: "抖音数字人-口播脚本",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "deepseek-v4-pro",
      temperature: 0.4,
      maxTokens: 6000,
      content: douyinDigitalHumanScriptSkillContent,
      updatedAt: "2026-05-30T23:40:00.000Z",
    },
    {
      id: "prompt_annual_marketing_plan",
      name: "半年营销规划提示词",
      scene: "半年营销规划生成",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.5,
      maxTokens: 4200,
      content:
        "你是半年营销规划顾问，需要基于品牌商家建档和品牌增长报告，输出覆盖未来半年关键节日与节气节点的营销规划 JSON；必须包含月份、节点、类型、日期、营销主题、平台、营销策略、产品，并体现多平台联动。",
      updatedAt: "2026-05-04T12:00:00.000Z",
    },
  ],
  knowledgeBases: [
    {
      id: "kb_brand_docs",
      name: "品牌资料知识库",
      slug: "brand-docs",
      sourceType: "MANUAL",
      status: "ACTIVE",
      syncStatus: "SUCCESS",
      documentCount: 18,
      chunkCount: 426,
      description: "沉淀品牌背景、产品资料、历史策略文档与调研材料。",
      updatedAt: "2026-05-02T09:30:00.000Z",
    },
    {
      id: "kb_feishu_ops",
      name: "飞书运营知识库",
      slug: "feishu-ops",
      sourceType: "FEISHU",
      status: "ACTIVE",
      syncStatus: "SYNCING",
      documentCount: 32,
      chunkCount: 1180,
      description: "同步飞书文档、会议纪要和 SOP，用于运营问答与任务辅助。",
      updatedAt: "2026-05-02T09:50:00.000Z",
    },
    {
      id: "kb_competitor_cases",
      name: "竞品案例知识库",
      slug: "competitor-cases",
      sourceType: "OSS",
      status: "DRAFT",
      syncStatus: "IDLE",
      documentCount: 7,
      chunkCount: 96,
      description: "收录竞品案例、拆解报告和营销活动归档。",
      updatedAt: "2026-05-01T16:20:00.000Z",
    },
  ],
  knowledgeBaseFiles: [
    {
      id: "kbf_brand_001",
      knowledgeBaseId: "kb_brand_docs",
      fileName: "品牌手册-v3.pdf",
      fileType: "PDF",
      sourceName: "品牌部上传",
      chunkCount: 120,
      status: "INDEXED",
      uploadedAt: "2026-05-01T11:00:00.000Z",
    },
    {
      id: "kbf_brand_002",
      knowledgeBaseId: "kb_brand_docs",
      fileName: "产品资料总表.xlsx",
      fileType: "XLSX",
      sourceName: "商品中心导出",
      chunkCount: 64,
      status: "INDEXED",
      uploadedAt: "2026-05-01T14:30:00.000Z",
    },
    {
      id: "kbf_feishu_001",
      knowledgeBaseId: "kb_feishu_ops",
      fileName: "5月运营周会纪要",
      fileType: "LINK",
      sourceName: "飞书云文档",
      chunkCount: 86,
      status: "INDEXED",
      uploadedAt: "2026-05-02T08:20:00.000Z",
    },
    {
      id: "kbf_comp_001",
      knowledgeBaseId: "kb_competitor_cases",
      fileName: "竞品618打法拆解.md",
      fileType: "MD",
      sourceName: "策略组整理",
      chunkCount: 22,
      status: "PENDING",
      uploadedAt: "2026-05-01T16:00:00.000Z",
    },
  ],
  knowledgeBaseSyncRuns: [
    {
      id: "kbsr_brand_001",
      knowledgeBaseId: "kb_brand_docs",
      scope: "FILE",
      operator: "系统任务",
      fileId: "kbf_brand_001",
      fileName: "品牌手册-v3.pdf",
      result: "SUCCESS",
      summary: "索引完成，写入 120 个分片。",
      startedAt: "2026-05-01T11:00:00.000Z",
      completedAt: "2026-05-01T11:02:30.000Z",
    },
    {
      id: "kbsr_feishu_001",
      knowledgeBaseId: "kb_feishu_ops",
      scope: "FILE",
      operator: "飞书同步器",
      fileId: "kbf_feishu_001",
      fileName: "5月运营周会纪要",
      result: "SUCCESS",
      summary: "同步飞书链接成功，更新 86 个分片。",
      startedAt: "2026-05-02T08:20:00.000Z",
      completedAt: "2026-05-02T08:21:40.000Z",
    },
    {
      id: "kbsr_comp_001",
      knowledgeBaseId: "kb_competitor_cases",
      scope: "FILE",
      operator: "后台管理员",
      fileId: "kbf_comp_001",
      fileName: "竞品618打法拆解.md",
      result: "FAILED",
      summary: "索引中断：Markdown 标题层级异常，待人工修正后重试。",
      errorDetail: "文档中存在多处缺失一级标题，切分器无法建立稳定目录结构。",
      startedAt: "2026-05-01T16:00:00.000Z",
      completedAt: "2026-05-01T16:01:10.000Z",
    },
    {
      id: "kbsr_feishu_full_001",
      knowledgeBaseId: "kb_feishu_ops",
      scope: "FULL",
      operator: "后台管理员",
      result: "RUNNING",
      summary: "全量同步进行中，正在扫描飞书文档增量变更。",
      startedAt: "2026-05-02T10:40:00.000Z",
    },
  ],
  knowledgeRetrievalConfigs: [
    {
      id: "kbrc_brand_docs",
      knowledgeBaseId: "kb_brand_docs",
      defaultTopK: 8,
      recallMode: "HYBRID",
      rerankEnabled: true,
      rerankModelName: "bge-reranker-v2-m3",
      chunkSize: 900,
      chunkOverlap: 120,
      retrievalThreshold: 0.68,
      createdAt: "2026-05-02T09:20:00.000Z",
      updatedAt: "2026-05-02T09:20:00.000Z",
    },
    {
      id: "kbrc_feishu_ops",
      knowledgeBaseId: "kb_feishu_ops",
      defaultTopK: 6,
      recallMode: "SEMANTIC",
      rerankEnabled: false,
      chunkSize: 700,
      chunkOverlap: 100,
      retrievalThreshold: 0.62,
      createdAt: "2026-05-02T09:25:00.000Z",
      updatedAt: "2026-05-02T09:25:00.000Z",
    },
    {
      id: "kbrc_competitor_cases",
      knowledgeBaseId: "kb_competitor_cases",
      defaultTopK: 12,
      recallMode: "HYBRID",
      rerankEnabled: true,
      rerankModelName: "bge-reranker-v2-m3",
      chunkSize: 1000,
      chunkOverlap: 160,
      retrievalThreshold: 0.74,
      createdAt: "2026-05-02T09:30:00.000Z",
      updatedAt: "2026-05-02T09:30:00.000Z",
    },
  ],
  knowledgeBindings: [
    {
      id: "kbb_brand_docs_module",
      knowledgeBaseId: "kb_brand_docs",
      bindingType: "MODULE",
      targetId: "wechat-workbench",
      targetKey: "wechat-workbench",
      targetName: "公众号工作台",
      priority: 10,
      retrievalMode: "HYBRID",
      isRequired: true,
      enabled: true,
      createdAt: "2026-05-02T09:40:00.000Z",
      updatedAt: "2026-05-02T09:40:00.000Z",
    },
    {
      id: "kbb_brand_docs_prompt",
      knowledgeBaseId: "kb_brand_docs",
      bindingType: "SKILL",
      targetId: "wechat-article-compose",
      targetKey: "wechat-article-compose",
      targetName: "公众号文章生成技能",
      priority: 20,
      retrievalMode: "SEMANTIC",
      isRequired: false,
      enabled: true,
      createdAt: "2026-05-02T09:45:00.000Z",
      updatedAt: "2026-05-02T09:45:00.000Z",
    },
    {
      id: "kbb_feishu_ops_workflow",
      knowledgeBaseId: "kb_feishu_ops",
      bindingType: "WORKFLOW_STEP",
      targetId: "wechat-article-generate-step",
      targetKey: "wechat-article-generate-step",
      targetName: "公众号文章生成步骤",
      priority: 30,
      retrievalMode: "HYBRID",
      isRequired: false,
      enabled: true,
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z",
    },
  ],
  skillPackages: [
    {
      id: "sp_brand_growth_analysis",
      packageKey: "brand-growth-analysis",
      packageName: "品牌增长分析能力包",
      description: "面向品牌全域增长分析、诊断与策略建议的基础能力包。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["brand-growth-workbench"],
      workflowStepKeys: ["brand-growth-analysis-step"],
      tags: ["analysis", "growth", "strategy"],
      currentVersionId: "spv_brand_growth_analysis_v1",
      defaultKnowledgeSpaceIds: ["kb_brand_docs"],
      defaultProviderPolicyIds: ["brand-text-provider-policy"],
      sortOrder: 10,
      remarks: "统一技能中心第一批平台能力包样例。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_enterprise_annual_plan",
      packageKey: "enterprise-annual-plan",
      packageName: "半年营销规划能力包",
      description: "用于半年营销规划、阶段动作拆解与策略路线输出。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["brand-growth-workbench"],
      workflowStepKeys: ["annual-marketing-plan-step"],
      tags: ["planning", "marketing", "campaign"],
      currentVersionId: "spv_enterprise_annual_plan_v1",
      defaultKnowledgeSpaceIds: ["kb_brand_docs"],
      defaultProviderPolicyIds: ["brand-text-provider-policy"],
      sortOrder: 20,
      remarks: "规划类能力包样例。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_xiaohongshu_brand_marketing_plan",
      packageKey: "xiaohongshu-brand-marketing-plan",
      packageName: "小红书营销规划能力包",
      description: "小红书选题、品牌策略与节奏规划的能力包。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["xiaohongshu-workbench"],
      workflowStepKeys: ["xiaohongshu-planning-step"],
      tags: ["xiaohongshu", "planning"],
      currentVersionId: "spv_xiaohongshu_brand_plan_v1",
      defaultKnowledgeSpaceIds: ["kb_brand_docs"],
      defaultProviderPolicyIds: ["brand-text-provider-policy"],
      sortOrder: 30,
      remarks: "小红书工作台默认能力包。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_tongcheng_brand_douyin_planning",
      packageKey: "tongcheng-brand-douyin-planning",
      packageName: "抖音营销规划能力包",
      description: "抖音品牌营销策划、内容规划与执行建议能力包。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["douyin-workbench"],
      workflowStepKeys: ["douyin-plan-step"],
      tags: ["douyin", "planning"],
      currentVersionId: "spv_douyin_plan_v1",
      defaultKnowledgeSpaceIds: ["kb_brand_docs", "kb_competitor_cases"],
      defaultProviderPolicyIds: ["brand-video-provider-policy"],
      sortOrder: 40,
      remarks: "抖音工作台默认策划能力包。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_wechat_article_generator",
      packageKey: "wechat-article-generator",
      packageName: "公众号文章生成能力包",
      description: "公众号文章创作、改写与结构化输出能力包。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["wechat-workbench"],
      workflowStepKeys: ["wechat-article-generate-step"],
      tags: ["wechat", "article", "copywriting"],
      currentVersionId: "spv_wechat_article_generator_v1",
      defaultKnowledgeSpaceIds: ["kb_brand_docs", "kb_feishu_ops"],
      defaultProviderPolicyIds: ["brand-wechat-provider-policy"],
      sortOrder: 50,
      remarks: "公众号工作台主文章能力包。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_wechat_image_designer",
      packageKey: "wechat-image-designer",
      packageName: "公众号配图生成能力包",
      description: "公众号封面图和正文配图生成能力包。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["wechat-workbench"],
      workflowStepKeys: ["wechat-image-generate-step"],
      tags: ["wechat", "image"],
      currentVersionId: "spv_wechat_image_designer_v1",
      defaultKnowledgeSpaceIds: ["kb_brand_docs"],
      defaultProviderPolicyIds: ["brand-wechat-provider-policy"],
      sortOrder: 60,
      remarks: "公众号配图能力包。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_wechat_html_renderer",
      packageKey: "wechat-html-renderer",
      packageName: "公众号 HTML 渲染能力包",
      description: "负责公众号 HTML 结构化排版与最终渲染输出。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["wechat-workbench"],
      workflowStepKeys: ["wechat-html-render-step"],
      tags: ["wechat", "html"],
      currentVersionId: "spv_wechat_html_renderer_v1",
      defaultKnowledgeSpaceIds: ["kb_feishu_ops"],
      defaultProviderPolicyIds: ["brand-wechat-provider-policy"],
      sortOrder: 70,
      remarks: "公众号 HTML 渲染能力包。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_wechat_publish_bridge",
      packageKey: "wechat-publish-bridge",
      packageName: "公众号 API 发布能力包",
      description: "负责公众号内容 API 发布、同步和回执管理。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["wechat-workbench"],
      workflowStepKeys: ["wechat-api-publish-step"],
      tags: ["wechat", "publish", "api"],
      currentVersionId: "spv_wechat_publish_bridge_v1",
      defaultKnowledgeSpaceIds: ["kb_feishu_ops"],
      defaultProviderPolicyIds: ["brand-wechat-provider-policy"],
      sortOrder: 80,
      remarks: "公众号发布桥接能力包。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "sp_design_web_prototype",
      packageKey: "design-web-prototype",
      packageName: "网页原型生成能力包",
      description: "用于网页原型、页面结构与设计稿生成。",
      status: "ACTIVE",
      scope: "PLATFORM",
      moduleKeys: ["design-workbench"],
      workflowStepKeys: ["design-web-prototype-step"],
      tags: ["design", "prototype", "web"],
      currentVersionId: "spv_design_web_prototype_v1",
      defaultKnowledgeSpaceIds: ["kb_brand_docs"],
      defaultProviderPolicyIds: ["brand-design-provider-policy"],
      sortOrder: 90,
      remarks: "设计工作台主能力包。",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
  ],
  skillPackageVersions: [
    {
      id: "spv_brand_growth_analysis_v1",
      packageId: "sp_brand_growth_analysis",
      packageKey: "brand-growth-analysis",
      versionNumber: "v1",
      changeLog: "初始化品牌增长分析能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 1,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 1,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_enterprise_annual_plan_v1",
      packageId: "sp_enterprise_annual_plan",
      packageKey: "enterprise-annual-plan",
      versionNumber: "v1",
      changeLog: "初始化半年营销规划能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 1,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 1,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_xiaohongshu_brand_plan_v1",
      packageId: "sp_xiaohongshu_brand_marketing_plan",
      packageKey: "xiaohongshu-brand-marketing-plan",
      versionNumber: "v1",
      changeLog: "初始化小红书营销规划能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 1,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 1,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_douyin_plan_v1",
      packageId: "sp_tongcheng_brand_douyin_planning",
      packageKey: "tongcheng-brand-douyin-planning",
      versionNumber: "v1",
      changeLog: "初始化抖音营销规划能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 8,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 2,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_wechat_article_generator_v1",
      packageId: "sp_wechat_article_generator",
      packageKey: "wechat-article-generator",
      versionNumber: "v1",
      changeLog: "初始化公众号文章生成能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 5,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 2,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_wechat_image_designer_v1",
      packageId: "sp_wechat_image_designer",
      packageKey: "wechat-image-designer",
      versionNumber: "v1",
      changeLog: "初始化公众号配图生成能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 1,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 1,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_wechat_html_renderer_v1",
      packageId: "sp_wechat_html_renderer",
      packageKey: "wechat-html-renderer",
      versionNumber: "v1",
      changeLog: "初始化公众号 HTML 渲染能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 1,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 1,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_wechat_publish_bridge_v1",
      packageId: "sp_wechat_publish_bridge",
      packageKey: "wechat-publish-bridge",
      versionNumber: "v1",
      changeLog: "初始化公众号 API 发布能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 1,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 1,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "spv_design_web_prototype_v1",
      packageId: "sp_design_web_prototype",
      packageKey: "design-web-prototype",
      versionNumber: "v1",
      changeLog: "初始化网页原型生成能力包版本。",
      sourceMode: "CURRENT_STATE",
      isActive: true,
      snapshotJson: {
        promptCount: 1,
        referenceCount: 0,
        scriptCount: 0,
        knowledgeBindingCount: 1,
        providerBindingCount: 1,
      },
      createdBy: "system",
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
  ],
  referenceAssets: [
    {
      id: "ref_brand_growth_strategy_template",
      packageId: "sp_brand_growth_analysis",
      referenceKey: "growth-analysis-template",
      title: "品牌增长分析报告模板",
      sourceType: "DOC",
      sourceUri: "https://example.local/docs/brand-growth-analysis-template",
      usageNote: "用于统一品牌增长分析报告的章节结构、指标口径和结论表达方式。",
      applicableScopes: ["overview", "report", "analysis"],
      sortOrder: 10,
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "ref_brand_growth_metric_dictionary",
      packageId: "sp_brand_growth_analysis",
      referenceKey: "growth-metric-dictionary",
      title: "增长指标口径字典",
      sourceType: "MARKDOWN",
      sourceUri: "https://example.local/docs/growth-metric-dictionary.md",
      usageNote: "生成报告前先统一曝光、转化、留资等核心指标定义，避免不同模块口径不一致。",
      applicableScopes: ["analysis", "metrics"],
      sortOrder: 20,
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "ref_wechat_article_style_guide",
      packageId: "sp_wechat_article_generator",
      referenceKey: "wechat-article-style-guide",
      title: "公众号文章排版与风格规范",
      sourceType: "DOC",
      sourceUri: "https://example.local/docs/wechat-article-style-guide",
      usageNote: "约束标题层级、分段节奏、金句样式和结尾 CTA 的输出风格。",
      applicableScopes: ["article", "layout", "wechat"],
      sortOrder: 10,
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "ref_wechat_compliance_checklist",
      packageId: "sp_wechat_article_generator",
      referenceKey: "wechat-compliance-checklist",
      title: "公众号内容合规检查清单",
      sourceType: "MARKDOWN",
      sourceUri: "https://example.local/docs/wechat-compliance-checklist.md",
      usageNote: "用于生成文章前后检查营销承诺、敏感词和外链策略是否符合发布要求。",
      applicableScopes: ["article", "publish", "compliance"],
      sortOrder: 20,
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
  ],
  scriptAssets: [
    {
      id: "script_brand_growth_outline_builder",
      packageId: "sp_brand_growth_analysis",
      scriptKey: "growth-outline-builder",
      scriptName: "增长分析提纲组装脚本",
      runtime: "TS",
      entry: "scripts/brand-growth/outline-builder.ts",
      argsSchema: {
        brandId: "string",
        reportPeriod: "string",
        metricsPreset: "string[]",
      },
      usageNote: "在生成品牌增长报告前统一组装章节提纲、指标口径和数据占位结构。",
      sortOrder: 10,
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
    {
      id: "script_wechat_html_post_processor",
      packageId: "sp_wechat_article_generator",
      scriptKey: "wechat-html-post-processor",
      scriptName: "公众号 HTML 后处理脚本",
      runtime: "JS",
      entry: "scripts/wechat/html-post-processor.js",
      argsSchema: {
        injectImageBlocks: "boolean",
        normalizeSpacing: "boolean",
      },
      usageNote: "用于文章生成后统一处理段间距、配图注入和公众号 HTML 兼容格式。",
      sortOrder: 10,
      createdAt: "2026-06-07T09:50:00.000Z",
      updatedAt: "2026-06-07T09:50:00.000Z",
    },
  ],
  moduleDefinitions: [
    {
      id: "module_brand_growth_workbench",
      moduleKey: "brand-growth-workbench",
      moduleName: "品牌增长工作台",
      moduleType: "WORKBENCH",
      moduleStatus: "ACTIVE",
      entryRoute: "/brand-growth",
      icon: "chart",
      sortOrder: 10,
      description: "用于品牌增长报告、半年营销规划和营销诊断。",
      requiredPermissions: ["brand:growth:read", "brand:growth:write"],
      featureFlags: ["brand-growth-workbench"],
      isPlatformVisible: true,
      isBrandVisible: true,
      isAdminVisible: true,
      requiredCapabilities: ["strategy-domain", "insight-domain"],
      requiredProviders: ["text"],
      requiredTables: ["BrandReport", "Task"],
      requiredStorages: [],
      requiredThirdPartyPlatforms: [],
      taskTypes: ["BRAND_GROWTH_REPORT_AI", "HALF_YEAR_PLAN_AI"],
      mediaTypes: [],
      workflowTypes: ["brand-growth-workflow"],
      publishTargets: [],
      defaultSkillPackages: ["brand-growth-analysis", "enterprise-annual-plan"],
      defaultKnowledgeSpaces: ["brand-docs"],
      defaultProviderPolicies: ["brand-text-provider-policy"],
      phasePriority: "P0",
      remarks: "第一阶段核心工作台样例。",
      createdAt: "2026-06-07T10:00:00.000Z",
      updatedAt: "2026-06-07T10:00:00.000Z",
    },
    {
      id: "module_xiaohongshu_workbench",
      moduleKey: "xiaohongshu-workbench",
      moduleName: "小红书工作台",
      moduleType: "WORKBENCH",
      moduleStatus: "ACTIVE",
      entryRoute: "/xiaohongshu",
      icon: "sparkles",
      sortOrder: 20,
      description: "用于小红书营销规划、内容生成和选题协作。",
      requiredPermissions: ["xiaohongshu:workspace:read", "xiaohongshu:workspace:write"],
      featureFlags: ["xiaohongshu-workbench"],
      isPlatformVisible: true,
      isBrandVisible: true,
      isAdminVisible: true,
      requiredCapabilities: ["copy-domain", "campaign-domain"],
      requiredProviders: ["text", "image"],
      requiredTables: ["Task", "Work"],
      requiredStorages: ["oss"],
      requiredThirdPartyPlatforms: ["xiaohongshu"],
      taskTypes: ["XHS_NOTE_AI", "XHS_CALENDAR_AI"],
      mediaTypes: ["xhs-cover-image"],
      workflowTypes: ["xiaohongshu-content-workflow"],
      publishTargets: ["xiaohongshu-api"],
      defaultSkillPackages: ["xiaohongshu-brand-marketing-plan"],
      defaultKnowledgeSpaces: ["brand-docs"],
      defaultProviderPolicies: ["brand-text-provider-policy"],
      phasePriority: "P0",
      remarks: "第一阶段核心工作台样例。",
      createdAt: "2026-06-07T10:00:00.000Z",
      updatedAt: "2026-06-07T10:00:00.000Z",
    },
    {
      id: "module_douyin_workbench",
      moduleKey: "douyin-workbench",
      moduleName: "抖音工作台",
      moduleType: "WORKBENCH",
      moduleStatus: "ACTIVE",
      entryRoute: "/douyin",
      icon: "video",
      sortOrder: 30,
      description: "用于抖音策划、原创文案、视频提示词与数字人脚本。",
      requiredPermissions: ["douyin:workspace:read", "douyin:workspace:write"],
      featureFlags: ["douyin-workbench"],
      isPlatformVisible: true,
      isBrandVisible: true,
      isAdminVisible: true,
      requiredCapabilities: ["copy-domain", "video-domain"],
      requiredProviders: ["text", "video"],
      requiredTables: ["Task", "Work"],
      requiredStorages: ["oss"],
      requiredThirdPartyPlatforms: ["douyin"],
      taskTypes: ["DOUYIN_PLAN_AI", "DOUYIN_COPY_AI", "DOUYIN_VIDEO_AI"],
      mediaTypes: ["douyin-video-script"],
      workflowTypes: ["douyin-content-workflow"],
      publishTargets: ["douyin-api"],
      defaultSkillPackages: ["tongcheng-brand-douyin-planning", "douyin-direct-video"],
      defaultKnowledgeSpaces: ["brand-docs", "competitor-cases"],
      defaultProviderPolicies: ["brand-video-provider-policy"],
      phasePriority: "P0",
      remarks: "第一阶段核心工作台样例。",
      createdAt: "2026-06-07T10:00:00.000Z",
      updatedAt: "2026-06-07T10:00:00.000Z",
    },
    {
      id: "module_wechat_workbench",
      moduleKey: "wechat-workbench",
      moduleName: "公众号工作台",
      moduleType: "WORKBENCH",
      moduleStatus: "ACTIVE",
      entryRoute: "/wechat",
      icon: "wechat",
      sortOrder: 40,
      description: "用于公众号文章、图片、HTML 和 API 发布工作流。",
      requiredPermissions: ["wechat:workspace:read", "wechat:workspace:write"],
      featureFlags: ["wechat-workbench"],
      isPlatformVisible: true,
      isBrandVisible: true,
      isAdminVisible: true,
      requiredCapabilities: ["copy-domain", "image-domain", "html-render-domain", "publish-domain"],
      requiredProviders: ["text", "image"],
      requiredTables: ["Task", "MediaAsset", "Work"],
      requiredStorages: ["oss"],
      requiredThirdPartyPlatforms: ["wechat-official-account"],
      taskTypes: ["WECHAT_ARTICLE_AI", "WECHAT_IMAGE_AI", "WECHAT_HTML_AI"],
      mediaTypes: ["wechat-cover", "wechat-body-image", "wechat-html"],
      workflowTypes: ["wechat-content-workflow"],
      publishTargets: ["wechat-api"],
      defaultSkillPackages: ["wechat-article-generator", "wechat-image-designer", "wechat-html-renderer"],
      defaultKnowledgeSpaces: ["brand-docs", "feishu-ops"],
      defaultProviderPolicies: ["brand-wechat-provider-policy"],
      phasePriority: "P0",
      remarks: "来自第一阶段模块注册样例。",
      createdAt: "2026-06-07T10:00:00.000Z",
      updatedAt: "2026-06-07T10:00:00.000Z",
    },
    {
      id: "module_design_workbench",
      moduleKey: "design-workbench",
      moduleName: "设计工作台",
      moduleType: "WORKBENCH",
      moduleStatus: "ACTIVE",
      entryRoute: "/design",
      icon: "palette",
      sortOrder: 50,
      description: "用于网页原型、数据看板、营销页面等设计生成任务。",
      requiredPermissions: ["design:workspace:read", "design:workspace:write"],
      featureFlags: ["design-workbench"],
      isPlatformVisible: true,
      isBrandVisible: true,
      isAdminVisible: true,
      requiredCapabilities: ["copy-domain", "image-domain"],
      requiredProviders: ["text", "image"],
      requiredTables: ["Task", "MediaAsset"],
      requiredStorages: ["oss"],
      requiredThirdPartyPlatforms: [],
      taskTypes: ["DESIGN_HTML_AI", "DESIGN_IMAGE_AI"],
      mediaTypes: ["design-preview-image", "design-html"],
      workflowTypes: ["design-workflow"],
      publishTargets: [],
      defaultSkillPackages: ["design-web-prototype", "design-dashboard"],
      defaultKnowledgeSpaces: ["brand-docs"],
      defaultProviderPolicies: ["brand-design-provider-policy"],
      phasePriority: "P0",
      remarks: "第一阶段核心工作台样例。",
      createdAt: "2026-06-07T10:00:00.000Z",
      updatedAt: "2026-06-07T10:00:00.000Z",
    },
  ],
  skillPackageModules: [
    {
      id: "spm_wechat_article_default",
      packageId: "sp_wechat_article_generator",
      packageKey: "wechat-article-generator",
      packageName: "公众号文章生成能力包",
      moduleKey: "wechat-workbench",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "公众号文章主生成能力包。",
      createdAt: "2026-06-07T10:20:00.000Z",
      updatedAt: "2026-06-07T10:20:00.000Z",
    },
    {
      id: "spm_wechat_image_default",
      packageId: "sp_wechat_image_designer",
      packageKey: "wechat-image-designer",
      packageName: "公众号配图生成能力包",
      moduleKey: "wechat-workbench",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 20,
      enabled: true,
      remarks: "公众号配图生成能力包。",
      createdAt: "2026-06-07T10:20:00.000Z",
      updatedAt: "2026-06-07T10:20:00.000Z",
    },
    {
      id: "spm_wechat_html_required",
      packageId: "sp_wechat_html_renderer",
      packageKey: "wechat-html-renderer",
      packageName: "公众号 HTML 渲染能力包",
      moduleKey: "wechat-workbench",
      bindingType: "SYSTEM_REQUIRED",
      isDefault: true,
      sortOrder: 30,
      enabled: true,
      remarks: "公众号工作流必需的 HTML 渲染能力。",
      createdAt: "2026-06-07T10:20:00.000Z",
      updatedAt: "2026-06-07T10:20:00.000Z",
    },
    {
      id: "spm_xhs_plan_default",
      packageId: "sp_xiaohongshu_brand_marketing_plan",
      packageKey: "xiaohongshu-brand-marketing-plan",
      packageName: "小红书营销规划能力包",
      moduleKey: "xiaohongshu-workbench",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "小红书工作台默认能力包。",
      createdAt: "2026-06-07T10:20:00.000Z",
      updatedAt: "2026-06-07T10:20:00.000Z",
    },
    {
      id: "spm_douyin_plan_default",
      packageId: "sp_tongcheng_brand_douyin_planning",
      packageKey: "tongcheng-brand-douyin-planning",
      packageName: "抖音营销规划能力包",
      moduleKey: "douyin-workbench",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "抖音工作台默认能力包。",
      createdAt: "2026-06-07T10:20:00.000Z",
      updatedAt: "2026-06-07T10:20:00.000Z",
    },
    {
      id: "spm_design_web_default",
      packageId: "sp_design_web_prototype",
      packageKey: "design-web-prototype",
      packageName: "网页原型设计能力包",
      moduleKey: "design-workbench",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "设计工作台默认原型能力。",
      createdAt: "2026-06-07T10:20:00.000Z",
      updatedAt: "2026-06-07T10:20:00.000Z",
    },
  ],
  skillPackageSkills: [
    {
      id: "sps_brand_growth_analysis_default",
      packageId: "sp_brand_growth_analysis",
      packageKey: "brand-growth-analysis",
      packageName: "品牌增长分析能力包",
      skillId: "skill_growth_analysis",
      skillSlug: "brand-omni-growth-analysis",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "品牌增长工作台主分析技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_annual_plan_default",
      packageId: "sp_enterprise_annual_plan",
      packageKey: "enterprise-annual-plan",
      packageName: "半年营销规划能力包",
      skillId: "skill_annual_plan",
      skillSlug: "enterprise-annual-plan",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "半年营销规划核心技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_xhs_plan_default",
      packageId: "sp_xiaohongshu_brand_marketing_plan",
      packageKey: "xiaohongshu-brand-marketing-plan",
      packageName: "小红书营销规划能力包",
      skillId: "skill_xhs_plan",
      skillSlug: "xiaohongshu-brand-marketing-plan",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "小红书营销规划主技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_wechat_article_default",
      packageId: "sp_wechat_article_generator",
      packageKey: "wechat-article-generator",
      packageName: "公众号文章生成能力包",
      skillId: "skill_wechat_article_composer",
      skillSlug: "wechat-article-composer",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "公众号创作文章主技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_wechat_cover_default",
      packageId: "sp_wechat_image_designer",
      packageKey: "wechat-image-designer",
      packageName: "公众号配图生成能力包",
      skillId: "skill_wechat_cover_image_designer",
      skillSlug: "wechat-cover-image-designer",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "公众号封面图生成技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_wechat_body_default",
      packageId: "sp_wechat_image_designer",
      packageKey: "wechat-image-designer",
      packageName: "公众号配图生成能力包",
      skillId: "skill_wechat_body_image_designer",
      skillSlug: "wechat-body-image-designer",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 20,
      enabled: true,
      remarks: "公众号正文配图生成技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_wechat_html_default",
      packageId: "sp_wechat_html_renderer",
      packageKey: "wechat-html-renderer",
      packageName: "公众号 HTML 渲染能力包",
      skillId: "skill_wechat_html_renderer",
      skillSlug: "wechat-html-renderer",
      bindingType: "SYSTEM_REQUIRED",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "公众号 HTML 渲染技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_wechat_publish_default",
      packageId: "sp_wechat_publish_bridge",
      packageKey: "wechat-publish-bridge",
      packageName: "公众号 API 发布能力包",
      skillId: "skill_wechat_api_publisher",
      skillSlug: "wechat-api-publisher",
      bindingType: "SYSTEM_REQUIRED",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "公众号 API 发布技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_douyin_plan_default",
      packageId: "sp_tongcheng_brand_douyin_planning",
      packageKey: "tongcheng-brand-douyin-planning",
      packageName: "抖音营销规划能力包",
      skillId: "skill_douyin_plan",
      skillSlug: "tongcheng-brand-douyin-planning",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "抖音营销规划主技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_douyin_storyboard_default",
      packageId: "sp_tongcheng_brand_douyin_planning",
      packageKey: "tongcheng-brand-douyin-planning",
      packageName: "抖音营销规划能力包",
      skillId: "skill_douyin_video_note",
      skillSlug: "douyin-video-storyboard-studio",
      bindingType: "OPTIONAL",
      isDefault: false,
      sortOrder: 20,
      enabled: true,
      remarks: "抖音故事板编排技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_douyin_direct_video_default",
      packageId: "sp_douyin_video_production",
      packageKey: "douyin-video-production",
      packageName: "抖音视频生产能力包",
      skillId: "skill_douyin_direct_video",
      skillSlug: "douyin-direct-video-studio",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "抖音视频提示词主技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
    {
      id: "sps_douyin_digital_human_default",
      packageId: "sp_douyin_digital_human",
      packageKey: "douyin-digital-human",
      packageName: "抖音数字人能力包",
      skillId: "skill_douyin_digital_human_script",
      skillSlug: "douyin-digital-human-script-studio",
      bindingType: "DEFAULT",
      isDefault: true,
      sortOrder: 10,
      enabled: true,
      remarks: "抖音数字人口播脚本技能。",
      createdAt: "2026-06-07T10:30:00.000Z",
      updatedAt: "2026-06-07T10:30:00.000Z",
    },
  ],
  skillPackageKnowledgeSpaces: [
    {
      id: "spks_brand_growth_docs_default",
      packageId: "sp_brand_growth_analysis",
      packageKey: "brand-growth-analysis",
      packageName: "品牌增长分析能力包",
      knowledgeBaseId: "kb_brand_docs",
      relationType: "DEFAULT",
      priority: 10,
      retrievalMode: "HYBRID",
      isRequired: true,
      enabled: true,
      remarks: "品牌资料与案例库作为默认知识空间。",
      createdAt: "2026-06-07T10:40:00.000Z",
      updatedAt: "2026-06-07T10:40:00.000Z",
    },
    {
      id: "spks_wechat_brand_docs_default",
      packageId: "sp_wechat_article_generator",
      packageKey: "wechat-article-generator",
      packageName: "公众号文章生成能力包",
      knowledgeBaseId: "kb_brand_docs",
      relationType: "DEFAULT",
      priority: 10,
      retrievalMode: "SEMANTIC",
      isRequired: true,
      enabled: true,
      remarks: "公众号文章生成默认引用品牌内容知识库。",
      createdAt: "2026-06-07T10:40:00.000Z",
      updatedAt: "2026-06-07T10:40:00.000Z",
    },
    {
      id: "spks_wechat_ops_optional",
      packageId: "sp_wechat_article_generator",
      packageKey: "wechat-article-generator",
      packageName: "公众号文章生成能力包",
      knowledgeBaseId: "kb_feishu_ops",
      relationType: "OPTIONAL",
      priority: 20,
      retrievalMode: "HYBRID",
      isRequired: false,
      enabled: true,
      remarks: "补充公众号运营规范与流程经验库。",
      createdAt: "2026-06-07T10:40:00.000Z",
      updatedAt: "2026-06-07T10:40:00.000Z",
    },
  ],
  apiProviders: SYSTEM_API_PROVIDER_SEEDS.map((item) => ({ ...item })),
  thirdPartyPlatforms: THIRD_PARTY_PLATFORM_SEEDS.map((item) => ({ ...item })),
  brandThirdPartyPlatformSecrets: [],
};

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}
