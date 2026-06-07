import { jsonRequest, request } from "./http";
import { orderSeed, type OrderRecord } from "./personal-center";

export type MembershipLevel = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

export type MembershipPlanRule = {
  id: string;
  membership: MembershipLevel;
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

export type BillingRules = {
  membershipPlans: MembershipPlanRule[];
  pointsPackages: PointsPackageRule[];
};

export type AdminUserRecord = {
  id: string;
  mobile: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  status: "ACTIVE" | "DISABLED";
  membership: MembershipLevel;
  systemRole: "USER" | "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
  emailVerified: boolean;
  pointsBalance: number;
  brandCount: number;
  taskCount: number;
  orderCount: number;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

export type AdminUserDetailRecord = AdminUserRecord & {
  brandItems: Array<{
    id: string;
    brandName: string;
    relation: "OWNER" | "MEMBER";
    role: string;
  }>;
};

export type DeleteAdminUserResult = {
  id: string;
  nickname: string;
  mobile: string;
};

export type GetAdminUsersQuery = {
  keyword?: string;
  membership?: "ALL" | MembershipLevel;
  status?: "ALL" | "ACTIVE" | "DISABLED";
  systemRole?: "ALL" | AdminUserRecord["systemRole"];
  emailVerified?: "ALL" | "VERIFIED" | "UNVERIFIED";
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

export type KnowledgeBaseFileMutationResult = {
  file: KnowledgeBaseFileRecord;
  knowledgeBase: KnowledgeBaseRecord;
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

export type KnowledgeBaseSyncMutationResult = KnowledgeBaseFileMutationResult & {
  run: KnowledgeBaseSyncRunRecord;
};

export type KnowledgeBaseRunMutationResult = {
  knowledgeBase: KnowledgeBaseRecord;
  run: KnowledgeBaseSyncRunRecord;
  file?: KnowledgeBaseFileRecord;
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

export type GetModuleDefinitionsQuery = {
  keyword?: string;
  moduleType?: "ALL" | ModuleDefinitionRecord["moduleType"];
  moduleStatus?: "ALL" | ModuleDefinitionRecord["moduleStatus"];
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
  moduleName?: string;
  moduleType?: string;
  entryRoute?: string;
  createdAt: string;
  updatedAt: string;
};

export type GetSkillPackageModulesQuery = {
  moduleKey?: string;
  packageKey?: string;
  bindingType?: "ALL" | SkillPackageModuleRecord["bindingType"];
  enabled?: boolean;
};

export type SkillAssetBindingRecord = {
  id: string;
  skillId?: string;
  skillSlug?: string;
  skillName?: string;
  promptId?: string;
  promptScene?: string;
  promptName?: string;
  bindingType?: "PRIMARY" | "SUPPLEMENTAL" | "FALLBACK";
  isPrimary?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  moduleKeys: string[];
  packageKeys: string[];
  packageNames: string[];
  remarks?: string;
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

export type ThirdPartyPlatformRecord = {
  id: string;
  name: string;
  providerType: "OPENAI" | "GEMINI" | "DOUBAO" | "CUSTOM";
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  baseUrl: string;
  tutorialUrl: string;
  modelIds: string[];
  defaultModel: string;
  remark: string;
  updatedAt: string;
};

const XHS_MARKETING_CALENDAR_PROMPT_SEED = `# 角色设定
你是一个专业的“营销Agent”，作为小红书营销工作流中的“日常运营指挥官”。你的核心职责是整合宏观的营销策略与当天的动态市场环境，为创作团队（或下游【创作Agent】）生成具有极强指导性和可落地性的未来7天的【营销日历】。

# 数据输入前提
在生成营销日历前，你必须调取并综合分析以下 6 项数据上下文：

## 静态策略与内容池（上游基础产出）
1. **【营销策划方案】**：确保期间的日记内容不偏离品牌整体营销战略与产品推广节奏。
2. **【半年营销规划】**：根据半年节日节点营销规划，制定接下来7天的内容计划。

## 动态反馈与即时数据（不定期更新）
3. **【素材库】**：根据不断更新的素材库里面，爆款笔记拆解，找出匹配的内容素材。
4. **【每日热点】**：结合小红书当日突发热点、热搜词进行借势融合。

## 从哪一天开始生成
5.如果营销日历数据库里面为空，则查看今天的日期，我们的营销日历从今天开始；如果营销日历数据库里面有数据库，则以最后一天日期的第二天为开始，比如营销日历里面最后一天日期，2026年5月10日，则从2026年5月11日开始生成营销日历

## 查看营销日历历史记录
6.在生成之前，还需要查看一下营销日历历史记录，避免出现生成重复的情况。

# 核心执行动作
综合以上 4 项数据，从中挑选、整合并生成 **每日1-3 个**最契合今日大盘趋势、热点或全年营销规划方向的选题，生成《营销日历》。

# 交付标准与输出结构
你的输出必须是一份结构化的《今日运营执行日报》，包含以下 5 大核心模块。请注意，针对你选出的 1-3 个选题，必须分别给出详尽说明：

日期、选题名称、植入产品（如不植入产品，则空着）、笔记类型、适合人群、内容目的、表达重点、选题内容、笔记关键词、封面形式、封面关键词、封面及配图说明、标题方向、正文结构
### 1. 日期
- 计划哪天创作，比如2026年5月10日

### 2. 选题名称
- 生成 **3-5 个**具体选题方向及切入场景，可供团队择优挑选的备选库。
- 简述选择这些选题的理由，例如顺应某项当日热点，或根据数据反馈进行针对性痛点补充。

### 3. 植入产品（如不植入产品，则空着）

### 4. 笔记类型
- 明确该选题的内容展现形式，如图文笔记、视频笔记。
- 明确内容的种草属性，如干货教程类、情绪共鸣类、好物合集类、单品测评类等。

### 5. 适合人群

### 6. 内容目的

### 7. 表达重点

### 8. 选题内容

### 9. 标题方向
- 结合【关键词矩阵】和【每日热点】，为该选题提供 1-3 个备选的爆款标题。
- 标题需具备小红书网感，如设置悬念、数字量化、痛点直击或带入具体场景。

### 10. 正文结构
- 提供该选题的正文结构大纲与撰写指南。
- 必须包含以下内容：
  - **黄金前三行**：如何用痛点或热点抓人眼球。
  - **核心中间段**：产品利益点或干货解决方案的自然植入逻辑。
  - **结尾引导**：采用提问、抛出话题等软性互动方式，严格避免违规导流词、站外引流、过度营销或强硬求链接，确保账号流量安全。
- 明确指出正文中必须埋入的 3-5 个核心关键词。

### 11. 封面形式

### 12. 封面关键词

### 13. 封面及配图说明
- 必须严格根据【营销策划方案】中的品牌调性、视觉风格、目标人群和内容策略，明确本篇内容的整体视觉方向。
- 需要明确输出本篇笔记所需的**配图张数**，并说明第 1 张为封面图，其余为内页配图。
- 明确整体配图风格细节，包括但不限于：主色调、画面氛围、排版方式、信息层级、视觉节奏、是否需要人物出镜、是否需要产品特写、是否强调场景化表达等。
- 详细描述封面的视觉风格、排版建议以及封面花字文案，确保封面风格与品牌调性一致，并具备小红书点击吸引力。
- 详细说明每一张内页配图的内容安排与画面重点，例如：产品特写图、痛点对比图、使用步骤图、场景展示图、结果展示图等。
- 所有配图说明必须足够具体，能够直接作为后续生成原创配图或二创配图的执行依据。

# 执行要求
- **极简且落地**：日报不是长篇分析报告，而是直接下发给【创作Agent】或人类写手的施工图纸，指令必须具体、清晰。
- **合规第一**：在正文与引导设计中，时刻保持对小红书平台规则的敬畏，确保文案不触发营销黑名单。
- **入库规范**：严格按照上述字段名称进行数据写入，确保数据结构完整、字段对应准确。`;

export const billingRulesSeed: BillingRules = {
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
};

export const adminOrderSeed: OrderRecord[] = orderSeed.map((item) => ({
  ...item,
  user: {
    nickname: "演示账号",
    mobile: "13800000000",
    membership: "PRO",
    pointsBalance: 14420,
  },
}));

export const adminUserSeed: AdminUserRecord[] = [
  {
    id: "usr_demo_001",
    mobile: "13800000000",
    email: "demo@ai-omni.local",
    nickname: "演示账号",
    avatarUrl: "",
    status: "ACTIVE",
    membership: "PRO",
    systemRole: "USER",
    emailVerified: true,
    pointsBalance: 14420,
    brandCount: 1,
    taskCount: 2,
    orderCount: 2,
    sessionCount: 1,
    createdAt: "2026-04-30T10:00:00.000Z",
    updatedAt: "2026-05-02T02:03:00.000Z",
    lastLoginAt: "2026-05-09T13:30:00.000Z",
  },
  {
    id: "usr_demo_002",
    mobile: "13900000001",
    email: "brand-owner@ai-omni.local",
    nickname: "品牌主理人",
    avatarUrl: "",
    status: "ACTIVE",
    membership: "BASIC",
    systemRole: "SUPER_ADMIN",
    emailVerified: true,
    pointsBalance: 3800,
    brandCount: 1,
    taskCount: 4,
    orderCount: 1,
    sessionCount: 1,
    createdAt: "2026-05-01T01:00:00.000Z",
    updatedAt: "2026-05-02T01:20:00.000Z",
    lastLoginAt: "2026-05-09T22:40:00.000Z",
  },
  {
    id: "usr_demo_003",
    mobile: "13700000002",
    email: "ops@ai-omni.local",
    nickname: "运营同学",
    avatarUrl: "",
    status: "DISABLED",
    membership: "FREE",
    systemRole: "SUPPORT_OPERATOR",
    emailVerified: false,
    pointsBalance: 200,
    brandCount: 0,
    taskCount: 1,
    orderCount: 0,
    sessionCount: 0,
    createdAt: "2026-05-01T06:30:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
    lastLoginAt: "",
  },
];

export const modelUsageSeed: ModelUsageRecord[] = [
  {
    id: "usage_gpt55",
    modelName: "gpt-5.5",
    provider: "OpenAI Proxy",
    taskCount: 12,
    successCount: 9,
    failedCount: 1,
    totalPointsCost: 2580,
    estimatedAmountYuan: 25.8,
    lastCalledAt: "2026-05-02T02:03:00.000Z",
  },
  {
    id: "usage_gpt54n",
    modelName: "gpt-5.4-nano",
    provider: "OpenAI Proxy",
    taskCount: 26,
    successCount: 24,
    failedCount: 1,
    totalPointsCost: 860,
    estimatedAmountYuan: 8.6,
    lastCalledAt: "2026-05-01T11:20:00.000Z",
  },
  {
    id: "usage_gemini25",
    modelName: "gemini-2.5-pro",
    provider: "Google Proxy",
    taskCount: 8,
    successCount: 7,
    failedCount: 0,
    totalPointsCost: 1320,
    estimatedAmountYuan: 13.2,
    lastCalledAt: "2026-05-01T18:45:00.000Z",
  },
];

export const skillConfigSeed: SkillConfigRecord[] = [
  {
    id: "skill_growth_analysis",
    name: "品牌全域增长分析",
    slug: "brand-omni-growth-analysis",
    category: "品牌增长",
    status: "ACTIVE",
    provider: "OpenAI Proxy",
    defaultModel: "gpt-5.5",
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
    provider: "OpenAI Proxy",
    defaultModel: "gpt-5.5",
    pointsCost: 280,
    description: "用于输出未来半年营销节点、活动主题和多平台协同规划。",
    updatedAt: "2026-05-02T01:20:00.000Z",
  },
  {
    id: "skill_xhs_plan",
    name: "小红书营销规划",
    slug: "xiaohongshu-brand-marketing-plan",
    category: "内容营销",
    status: "ACTIVE",
    provider: "OpenAI Proxy",
    defaultModel: "gpt-5.4-nano",
    pointsCost: 260,
    description: "用于输出小红书品牌规划、内容选题和种草策略。",
    updatedAt: "2026-05-01T18:45:00.000Z",
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
    status: "DRAFT",
    provider: "Google Proxy",
    defaultModel: "gemini-2.5-pro",
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
    provider: "OpenAI Proxy",
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
    provider: "OpenAI Proxy",
    defaultModel: "gpt-5.5",
    pointsCost: 160,
    description: "用于生成小红书原创笔记封面提示词与原创配图提示词。",
    updatedAt: "2026-05-06T09:00:00.000Z",
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
    description: "用于根据对标内容和二创文案生成全新的二创配图提示词。",
    updatedAt: "2026-05-07T15:40:00.000Z",
  },
  {
    id: "skill_xhs_video_note",
    name: "小红书视频笔记",
    slug: "short-video-api-studio",
    category: "内容生产",
    status: "ACTIVE",
    provider: "Video Pipeline",
    defaultModel: "doubao-seedance-2-0-260128",
    pointsCost: 240,
    description: "用于生成视频笔记文案、视频提示词并衔接第三方视频模型。",
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
    provider: "Right Codes 文生图",
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
    provider: "Right Codes 文生图",
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
    provider: "Video Pipeline",
    defaultModel: "doubao-seedance-2-0-260128",
    pointsCost: 240,
    description: "用于生成抖音 AI生视频（故事板）的剧本、故事板提示词并衔接第三方视频模型。",
    updatedAt: "2026-05-30T22:00:00.000Z",
  },
  {
    id: "skill_douyin_direct_video",
    name: "抖音AI生视频",
    slug: "douyin-direct-video-studio",
    category: "内容生产",
    status: "ACTIVE",
    provider: "Text to Prompt",
    defaultModel: "deepseek-v4-pro",
    pointsCost: 180,
    description: "用于生成可直接用于 Seedance 2.0 的抖音视频提示词，并衔接后续短视频生成。",
    updatedAt: "2026-05-30T23:20:00.000Z",
  },
  {
    id: "skill_douyin_digital_human_script",
    name: "抖音数字人口播脚本",
    slug: "douyin-digital-human-script-studio",
    category: "内容生产",
    status: "ACTIVE",
    provider: "Text to Script",
    defaultModel: "deepseek-v4-pro",
    pointsCost: 180,
    description: "用于生成适合抖音数字人口播视频的脚本文案。",
    updatedAt: "2026-05-30T23:40:00.000Z",
  },
];

export const promptTemplateSeed: PromptTemplateRecord[] = [
  {
    id: "prompt_growth_report",
    name: "品牌增长报告主提示词",
    scene: "品牌增长报告生成",
    version: "v1.3",
    status: "ACTIVE",
    modelName: "gpt-5.5",
    temperature: 0.6,
    maxTokens: 6000,
    content: "你是品牌全域增长顾问，需要基于品牌资料、行业资料和经营数据生成增长分析报告。",
    updatedAt: "2026-05-02T02:03:00.000Z",
  },
  {
    id: "prompt_annual_plan",
    name: "半年营销规划主提示词",
    scene: "半年营销规划生成",
    version: "v1.0",
    status: "ACTIVE",
    modelName: "gpt-5.5",
    temperature: 0.5,
    maxTokens: 4200,
    content: "你是半年营销规划顾问，需要基于品牌商家建档和品牌增长报告，输出覆盖未来半年关键节日与节气节点的营销规划 JSON；必须包含月份、节点、类型、日期、营销主题、平台、营销策略、产品，并体现多平台联动。",
    updatedAt: "2026-05-02T01:20:00.000Z",
  },
  {
    id: "prompt_xhs_plan",
    name: "小红书策划提示词",
    scene: "小红书营销规划",
    version: "v1.1",
    status: "ACTIVE",
    modelName: "gpt-5.4-nano",
    temperature: 0.7,
    maxTokens: 4000,
    content: "你是小红书品牌营销顾问，需要输出年度种草策略、内容支柱和月度排期建议。",
    updatedAt: "2026-05-01T18:45:00.000Z",
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
    content: XHS_MARKETING_CALENDAR_PROMPT_SEED,
    updatedAt: "2026-05-14T22:30:00.000Z",
  },
  {
    id: "prompt_visual_report",
    name: "可视化报告提示词",
    scene: "HTML 可视化报告生成",
    version: "v0.9",
    status: "DRAFT",
    modelName: "gemini-2.5-pro",
    temperature: 0.4,
    maxTokens: 5000,
    content: "你是数据可视化设计师，需要将结构化洞察转化为适合前端渲染的 HTML 报告。",
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
    content: "根据营销规划方案、营销日历选题、产品信息和用户附加要求，生成可直接发布的小红书原创标题、正文与标签。",
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
    content: "根据营销规划方案、营销日历、原创笔记正文、产品信息和用户要求生成封面提示词与原创配图提示词。",
    updatedAt: "2026-05-06T09:00:00.000Z",
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
    content: "根据对标作品、营销规划和用户要求，生成小红书二创标题、正文与标签。",
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
    content: "根据参考图风格和二创文案生成全新的二创配图提示词。",
    updatedAt: "2026-05-07T15:40:00.000Z",
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
    content:
      "基于公众号工作流文章能力生成结构化公众号文章内容：先综合营销节点、品牌资料、产品信息、主题色、作者和用户要求，输出标题、摘要、作者、正文纯文本 content；正文需包含导语、2-4 个主体章节、品牌/产品植入段和结尾行动建议，并为后续封面图与正文配图阶段提炼 coverImageBrief 与 bodyImageBriefs。禁止输出 browser 发布步骤，禁止省略摘要、作者和章节结构，禁止直接输出 htmlContent。",
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
    content:
      "基于公众号封面图工作流链路，为公众号封面图和头图生成高质量提示词。必须结合标题、摘要、品牌调性、营销节点、产品卖点和主题色，输出适合公众号封面图的主视觉 prompt、版式安全区说明、标题放置建议和 negativePrompt；强调编辑感、品牌一致性与可读性，禁止把封面做成满版小字海报，也不要混入正文配图任务。",
    updatedAt: "2026-06-06T12:00:00.000Z",
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
    content:
      "基于公众号长文配图工作流链路，为公众号正文插图、场景图和产品辅助图生成 prompt。需要读取文章章节结构、段落主题、品牌调性、产品卖点和主题色，输出 2-4 条 bodyImagePrompts，每条都要绑定 sectionTitle、imagePurpose、prompt 和 negativePrompt，保证与封面图风格统一、与正文阅读节奏匹配，禁止写成封面海报式大字主视觉。",
    updatedAt: "2026-06-06T12:00:00.000Z",
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
    content:
      "基于公众号 HTML 渲染工作流，把已确认的 title、summary、author、content、coverImageUrl、bodyImageUrls 和主题色渲染为最终可发布的公众号 HTML。必须输出单个 htmlContent JSON 字段，图片要自然植入正文对应位置，禁止附加营销日历资料、产品资料、品牌资料、原文链接、创作来源、素材说明或附录。",
    updatedAt: "2026-06-06T20:30:00.000Z",
  },
  {
    id: "prompt_wechat_api_publish",
    name: "公众号API发布提示词",
    scene: "公众号API发布",
    version: "v1.0",
    status: "ACTIVE",
    modelName: "wechat-official-account-api-publish",
    temperature: 0.2,
    maxTokens: 5000,
    content:
      "基于公众号 API 发布工作流整理公众号 draft/add 发布检查。必须按 EXTEND.md、多账号、API 凭证、封面图、标题、摘要、作者、评论策略和 IP 白名单顺序做校验，输出 ready、checklist、publishPayloadSummary、riskHints 和 retryAdvice；只允许 API-only，禁止 browser/CDP，且不得泄露 AppSecret。",
    updatedAt: "2026-06-06T12:00:00.000Z",
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
    content: "基于商业短片方法论生成视频笔记文案、结构化视频提示词、分段方案和短视频调用链。",
    updatedAt: "2026-05-06T09:10:00.000Z",
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
    content: "基于商业短片方法论生成抖音 AI 生视频（故事板）文案、结构化视频提示词、分段方案和短视频调用链。",
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
    content: "根据用户输入的选题、产品信息、营销规划和要求，生成抖音品牌宣传视频创意剧本。",
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
    content: "根据用户输入的选题、产品信息、营销规划和要求，生成抖音口播带货视频创意剧本。",
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
    content: "根据用户输入的选题、产品信息、营销规划和要求，生成抖音短剧带货视频创意剧本。",
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
    content: "根据素材库里的视频链接和拆解要求，生成抖音复刻视频剧情脚本。",
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
    content: "根据剧本、产品图和用户要求，生成抖音故事板提示词。",
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
    content: "根据用户输入的选题、产品、素材、参考图、营销策划和用户要求，生成可直接用于 Seedance 2.0 的抖音视频提示词。",
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
    content: "根据产品资料、营销目标、视频主题和用户要求，生成适合抖音数字人口播的短视频脚本。",
    updatedAt: "2026-05-30T23:40:00.000Z",
  },
];

export const knowledgeBaseSeed: KnowledgeBaseRecord[] = [
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
];

export const knowledgeBaseFileSeed: KnowledgeBaseFileRecord[] = [
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
];

export const knowledgeBaseSyncRunSeed: KnowledgeBaseSyncRunRecord[] = [
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
];

export const moduleDefinitionSeed: ModuleDefinitionRecord[] = [
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
];

export const skillPackageModuleSeed: SkillPackageModuleRecord[] = [
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
    moduleName: "公众号工作台",
    moduleType: "WORKBENCH",
    entryRoute: "/wechat",
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
    moduleName: "公众号工作台",
    moduleType: "WORKBENCH",
    entryRoute: "/wechat",
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
    moduleName: "公众号工作台",
    moduleType: "WORKBENCH",
    entryRoute: "/wechat",
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
    moduleName: "小红书工作台",
    moduleType: "WORKBENCH",
    entryRoute: "/xiaohongshu",
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
    moduleName: "抖音工作台",
    moduleType: "WORKBENCH",
    entryRoute: "/douyin",
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
    moduleName: "设计工作台",
    moduleType: "WORKBENCH",
    entryRoute: "/design",
    createdAt: "2026-06-07T10:20:00.000Z",
    updatedAt: "2026-06-07T10:20:00.000Z",
  },
];

export const skillAssetBindingSeed: SkillAssetBindingRecord[] = [
  {
    id: "sab_brand_growth_report",
    skillSlug: "brand-omni-growth-analysis",
    promptScene: "品牌增长报告生成",
    moduleKeys: ["brand-growth-workbench"],
    packageKeys: ["brand-growth-analysis"],
    packageNames: ["品牌增长分析能力包"],
    remarks: "品牌增长报告主技能归属于品牌增长工作台。",
  },
  {
    id: "sab_brand_visual_report",
    skillSlug: "article-visual-report-designer",
    promptScene: "HTML 可视化报告生成",
    moduleKeys: ["brand-growth-workbench", "design-workbench"],
    packageKeys: ["brand-growth-analysis", "design-web-prototype"],
    packageNames: ["品牌增长分析能力包", "网页原型设计能力包"],
    remarks: "可视化报告同时服务增长工作台与设计工作台。",
  },
  {
    id: "sab_annual_plan",
    skillSlug: "enterprise-annual-plan",
    promptScene: "半年营销规划生成",
    moduleKeys: ["brand-growth-workbench"],
    packageKeys: ["enterprise-annual-plan"],
    packageNames: ["半年营销规划能力包"],
  },
  {
    id: "sab_xhs_plan",
    skillSlug: "xiaohongshu-brand-marketing-plan",
    promptScene: "小红书营销规划",
    moduleKeys: ["xiaohongshu-workbench"],
    packageKeys: ["xiaohongshu-brand-marketing-plan"],
    packageNames: ["小红书营销规划能力包"],
  },
  {
    id: "sab_xhs_calendar",
    skillSlug: "xiaohongshu-marketing-calendar",
    promptScene: "小红书营销日历生成",
    moduleKeys: ["xiaohongshu-workbench"],
    packageKeys: ["xiaohongshu-brand-marketing-plan"],
    packageNames: ["小红书营销规划能力包"],
  },
  {
    id: "sab_xhs_original_copy",
    skillSlug: "original_copy",
    promptScene: "小红书原创笔记文案",
    moduleKeys: ["xiaohongshu-workbench"],
    packageKeys: ["xiaohongshu-content-original"],
    packageNames: ["小红书原创内容能力包"],
  },
  {
    id: "sab_xhs_original_image",
    skillSlug: "xhs-original-image-prompt",
    promptScene: "小红书原创笔记配图",
    moduleKeys: ["xiaohongshu-workbench"],
    packageKeys: ["xiaohongshu-content-original"],
    packageNames: ["小红书原创内容能力包"],
  },
  {
    id: "sab_xhs_rewrite_copy",
    skillSlug: "rewrite_copy",
    promptScene: "小红书二创笔记文案",
    moduleKeys: ["xiaohongshu-workbench"],
    packageKeys: ["xiaohongshu-content-rewrite"],
    packageNames: ["小红书二创内容能力包"],
  },
  {
    id: "sab_xhs_rewrite_image",
    skillSlug: "rewrite_image",
    promptScene: "小红书二创笔记配图",
    moduleKeys: ["xiaohongshu-workbench"],
    packageKeys: ["xiaohongshu-content-rewrite"],
    packageNames: ["小红书二创内容能力包"],
  },
  {
    id: "sab_xhs_video",
    skillSlug: "short-video-api-studio",
    moduleKeys: ["xiaohongshu-workbench"],
    packageKeys: ["xiaohongshu-video-production"],
    packageNames: ["小红书视频生产能力包"],
  },
  {
    id: "sab_wechat_article",
    skillSlug: "wechat-article-composer",
    promptScene: "公众号创作文章",
    moduleKeys: ["wechat-workbench"],
    packageKeys: ["wechat-article-generator"],
    packageNames: ["公众号文章生成能力包"],
  },
  {
    id: "sab_wechat_cover",
    skillSlug: "wechat-cover-image-designer",
    promptScene: "公众号封面图生成",
    moduleKeys: ["wechat-workbench"],
    packageKeys: ["wechat-image-designer"],
    packageNames: ["公众号配图生成能力包"],
  },
  {
    id: "sab_wechat_body",
    skillSlug: "wechat-body-image-designer",
    promptScene: "公众号正文配图生成",
    moduleKeys: ["wechat-workbench"],
    packageKeys: ["wechat-image-designer"],
    packageNames: ["公众号配图生成能力包"],
  },
  {
    id: "sab_wechat_html",
    skillSlug: "wechat-html-renderer",
    promptScene: "公众号HTML渲染",
    moduleKeys: ["wechat-workbench"],
    packageKeys: ["wechat-html-renderer"],
    packageNames: ["公众号 HTML 渲染能力包"],
  },
  {
    id: "sab_wechat_publish",
    skillSlug: "wechat-api-publisher",
    promptScene: "公众号API发布",
    moduleKeys: ["wechat-workbench"],
    packageKeys: ["wechat-publish-bridge"],
    packageNames: ["公众号 API 发布能力包"],
  },
  {
    id: "sab_douyin_storyboard",
    skillSlug: "douyin-video-storyboard-studio",
    moduleKeys: ["douyin-workbench"],
    packageKeys: ["tongcheng-brand-douyin-planning"],
    packageNames: ["抖音营销规划能力包"],
  },
  {
    id: "sab_douyin_direct_video",
    skillSlug: "douyin-direct-video-studio",
    moduleKeys: ["douyin-workbench"],
    packageKeys: ["douyin-video-production"],
    packageNames: ["抖音视频生产能力包"],
  },
  {
    id: "sab_douyin_digital_human",
    skillSlug: "douyin-digital-human-script-studio",
    promptScene: "抖音数字人-口播脚本",
    moduleKeys: ["douyin-workbench"],
    packageKeys: ["douyin-digital-human"],
    packageNames: ["抖音数字人能力包"],
  },
];

export const apiProviderSeed: ApiProviderRecord[] = [
  {
    id: "provider_openai",
    name: "OpenAI Proxy",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: "https://api.openai-proxy.local/v1",
    tutorialUrl: "https://platform.openai.com/docs/api-reference",
    modelWhitelist: ["gpt-5.5", "gpt-5.4-nano"],
    apiKey: "sk-proxy-demo-openai-001",
    defaultModel: "gpt-5.5",
    organization: "org-ai-omni-demo",
    project: "proj_brand_growth",
    timeoutMs: 120000,
    streamEnabled: true,
    customHeaders: {
      "OpenAI-Organization": "org-ai-omni-demo",
    },
    extraParams: {
      reasoning_effort: "medium",
    },
    remark: "统一承接 OpenAI 兼容模型调用，优先给品牌增长与小红书文案链路使用。",
    successRate: 99.2,
    requestCount24h: 428,
    totalCostYuan: 186.4,
    lastCalledAt: "2026-05-02T10:20:00.000Z",
    updatedAt: "2026-05-02T10:20:00.000Z",
  },
  {
    id: "provider_runtime_text_global_right_codes",
    name: "Right Codes · 文生文（可带图）",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: "https://www.right.codes/draw",
    tutorialUrl: "https://docs.right.codes/docs/rc_extension/draw/",
    modelWhitelist: [
      "gpt-5.3-codex",
      "gpt-5.4",
      "gpt-5.5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
    ],
    apiKey: "",
    defaultModel: "gpt-5.5",
    organization: "",
    project: "",
    timeoutMs: 180000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "text-global",
      completionPath: "/v1/chat/completions",
    },
    remark: "Right Codes 平台支持文生文与带图问答；技能中心同名模型会按 Provider 作用域区分。",
    successRate: 0,
    requestCount24h: 0,
    totalCostYuan: 0,
    lastCalledAt: "2026-05-14T13:36:00.000Z",
    updatedAt: "2026-05-14T13:36:00.000Z",
  },
  {
    id: "provider_gemini",
    name: "Google Gemini Proxy",
    providerType: "GEMINI",
    status: "ACTIVE",
    baseUrl: "https://api.gemini-proxy.local/v1beta",
    tutorialUrl: "https://ai.google.dev/gemini-api/docs",
    modelWhitelist: ["gemini-2.5-pro"],
    apiKey: "gm-proxy-demo-gemini-001",
    defaultModel: "gemini-2.5-pro",
    organization: "",
    project: "gemini-brand-lab",
    timeoutMs: 90000,
    streamEnabled: true,
    customHeaders: {},
    extraParams: {
      safetySettingsPreset: "default",
    },
    remark: "主要用于可视化报告和长文本结构化输出。",
    successRate: 97.6,
    requestCount24h: 96,
    totalCostYuan: 63.8,
    lastCalledAt: "2026-05-02T09:55:00.000Z",
    updatedAt: "2026-05-02T09:55:00.000Z",
  },
  {
    id: "provider_runtime_image_generation_right_codes",
    name: "Right Codes · 文生图/图生图",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: "https://www.right.codes/draw",
    tutorialUrl: "https://docs.right.codes/docs/rc_extension/draw/",
    modelWhitelist: ["gpt-image-2", "gpt-image-2-vip", "nano-banana-2"],
    apiKey: "",
    defaultModel: "gpt-image-2",
    organization: "",
    project: "",
    timeoutMs: 240000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      runtimeKey: "image-generation",
      completionPath: "/v1/images/generations",
      requestMode: "images-generations",
    },
    remark: "Right Codes 平台支持文生图与图生图；同名模型会在技能选择中按 Provider 作用域区分。",
    successRate: 0,
    requestCount24h: 0,
    totalCostYuan: 0,
    lastCalledAt: "2026-05-14T13:36:00.000Z",
    updatedAt: "2026-05-14T13:36:00.000Z",
  },
  {
    id: "provider_doubao",
    name: "火山方舟 Doubao",
    providerType: "DOUBAO",
    status: "DRAFT",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    tutorialUrl: "https://www.volcengine.com/docs/82379",
    modelWhitelist: ["doubao-pro-32k"],
    apiKey: "ark-demo-doubao-001",
    defaultModel: "doubao-pro-32k",
    organization: "",
    project: "cn-content-fallback",
    timeoutMs: 90000,
    streamEnabled: false,
    customHeaders: {},
    extraParams: {
      region: "cn-beijing",
    },
    remark: "预留国内模型链路，后续可用于低成本内容生成或兜底路由。",
    successRate: 93.4,
    requestCount24h: 21,
    totalCostYuan: 7.2,
    lastCalledAt: "2026-05-01T18:10:00.000Z",
    updatedAt: "2026-05-01T18:10:00.000Z",
  },
];

export async function getAdminOrders() {
  return request<OrderRecord[]>("/orders/admin/list");
}

export async function getBillingRules() {
  return request<BillingRules>("/admin/billing-rules");
}

export async function updateBillingRules(payload: BillingRules) {
  return jsonRequest<BillingRules>("/admin/billing-rules", "PATCH", payload);
}

export async function getAdminUsers(query: GetAdminUsersQuery = {}) {
  const searchParams = new URLSearchParams();
  if (query.keyword?.trim()) {
    searchParams.set("keyword", query.keyword.trim());
  }
  if (query.membership && query.membership !== "ALL") {
    searchParams.set("membership", query.membership);
  }
  if (query.status && query.status !== "ALL") {
    searchParams.set("status", query.status);
  }
  if (query.systemRole && query.systemRole !== "ALL") {
    searchParams.set("systemRole", query.systemRole);
  }
  if (query.emailVerified && query.emailVerified !== "ALL") {
    searchParams.set("emailVerified", query.emailVerified);
  }
  const suffix = searchParams.toString();
  return request<AdminUserRecord[]>(suffix ? `/admin/users?${suffix}` : "/admin/users");
}

export async function getAdminUserDetail(userId: string) {
  return request<AdminUserDetailRecord>(`/admin/users/${userId}`);
}

export async function updateAdminUser(
  userId: string,
  payload: {
    nickname?: string;
    mobile?: string;
    email?: string;
    avatarUrl?: string;
    status?: AdminUserRecord["status"];
    membership?: MembershipLevel;
    systemRole?: AdminUserRecord["systemRole"];
    pointsBalance?: number;
    emailVerified?: boolean;
    password?: string;
  },
) {
  return jsonRequest<AdminUserDetailRecord>(`/admin/users/${userId}`, "PATCH", payload);
}

export async function deleteAdminUser(userId: string) {
  return request<DeleteAdminUserResult>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function getModelUsage() {
  return request<ModelUsageRecord[]>("/admin/model-usage");
}

export async function getSkillConfigs() {
  return request<SkillConfigRecord[]>("/admin/skills");
}

export async function createSkillConfig(
  payload: Pick<SkillConfigRecord, "name" | "slug" | "category" | "status" | "provider" | "defaultModel" | "pointsCost" | "description">,
) {
  return jsonRequest<SkillConfigRecord>("/admin/skills", "POST", payload);
}

export async function updateSkillConfig(
  skillId: string,
  payload: Partial<Pick<SkillConfigRecord, "status" | "defaultModel" | "pointsCost" | "description">>,
) {
  return jsonRequest<SkillConfigRecord>(`/admin/skills/${skillId}`, "PATCH", payload);
}

export async function getPromptTemplates() {
  return request<PromptTemplateRecord[]>("/admin/prompts");
}

export async function createPromptTemplate(
  payload: Pick<PromptTemplateRecord, "name" | "scene" | "version" | "status" | "modelName" | "temperature" | "maxTokens" | "content">,
) {
  return jsonRequest<PromptTemplateRecord>("/admin/prompts", "POST", payload);
}

export async function getSkillPromptBindings() {
  return request<SkillAssetBindingRecord[]>("/admin/skill-prompt-bindings");
}

export async function getSkillPromptBindingsBySkill(skillSlug: string) {
  return request<SkillAssetBindingRecord[]>(`/admin/skill-prompt-bindings/by-skill/${encodeURIComponent(skillSlug)}`);
}

export async function createSkillPromptBinding(payload: {
  skillId?: string;
  skillSlug?: string;
  promptId?: string;
  promptScene?: string;
  bindingType?: "PRIMARY" | "SUPPLEMENTAL" | "FALLBACK";
  isPrimary?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  remarks?: string;
}) {
  return jsonRequest<SkillAssetBindingRecord>("/admin/skill-prompt-bindings", "POST", payload);
}

export async function updateSkillPromptBinding(
  id: string,
  payload: Partial<Pick<SkillAssetBindingRecord, "bindingType" | "isPrimary" | "sortOrder" | "enabled" | "remarks">>,
) {
  return jsonRequest<SkillAssetBindingRecord>(`/admin/skill-prompt-bindings/${id}`, "PATCH", payload);
}

export async function updatePromptTemplate(
  promptId: string,
  payload: Partial<Pick<PromptTemplateRecord, "status" | "modelName" | "temperature" | "maxTokens" | "content">>,
) {
  return jsonRequest<PromptTemplateRecord>(`/admin/prompts/${promptId}`, "PATCH", payload);
}

export async function getKnowledgeBases() {
  return request<KnowledgeBaseRecord[]>("/admin/knowledge-bases");
}

export async function updateKnowledgeBase(
  knowledgeBaseId: string,
  payload: Partial<Pick<KnowledgeBaseRecord, "status" | "syncStatus" | "sourceType" | "description">>,
) {
  return jsonRequest<KnowledgeBaseRecord>(`/admin/knowledge-bases/${knowledgeBaseId}`, "PATCH", payload);
}

export async function createKnowledgeBase(payload: {
  name: string;
  slug: string;
  sourceType: KnowledgeBaseRecord["sourceType"];
  description?: string;
}) {
  return jsonRequest<KnowledgeBaseRecord>("/admin/knowledge-bases", "POST", payload);
}

export async function archiveKnowledgeBase(knowledgeBaseId: string) {
  return jsonRequest<KnowledgeBaseRecord>(`/admin/knowledge-bases/${knowledgeBaseId}/archive`, "PATCH", {});
}

export async function deleteKnowledgeBase(knowledgeBaseId: string) {
  return request<KnowledgeBaseRecord>(`/admin/knowledge-bases/${knowledgeBaseId}`, {
    method: "DELETE",
  });
}

export async function getKnowledgeBaseFiles() {
  return request<KnowledgeBaseFileRecord[]>("/admin/knowledge-base-files");
}

export async function getKnowledgeBaseSyncRuns() {
  return request<KnowledgeBaseSyncRunRecord[]>("/admin/knowledge-base-files/sync-runs");
}

export async function createKnowledgeBaseFile(
  knowledgeBaseId: string,
  payload: {
    fileName: string;
    fileType: KnowledgeBaseFileRecord["fileType"];
    sourceName?: string;
    chunkCount?: number;
  },
) {
  return jsonRequest<KnowledgeBaseFileMutationResult>(`/admin/knowledge-bases/${knowledgeBaseId}/files`, "POST", payload);
}

export async function deleteKnowledgeBaseFile(fileId: string) {
  return request<KnowledgeBaseFileMutationResult>(`/admin/knowledge-base-files/${fileId}`, {
    method: "DELETE",
  });
}

export async function updateKnowledgeBaseFile(
  fileId: string,
  payload: {
    status: KnowledgeBaseFileRecord["status"];
  },
) {
  return jsonRequest<KnowledgeBaseFileMutationResult>(`/admin/knowledge-base-files/${fileId}`, "PATCH", payload);
}

export async function syncKnowledgeBaseFile(fileId: string) {
  return jsonRequest<KnowledgeBaseSyncMutationResult>(`/admin/knowledge-base-files/${fileId}/sync`, "POST", {});
}

export async function startKnowledgeBaseSync(knowledgeBaseId: string) {
  return jsonRequest<KnowledgeBaseRunMutationResult>(`/admin/knowledge-bases/${knowledgeBaseId}/sync`, "POST", {});
}

export async function completeKnowledgeBaseSyncRun(
  runId: string,
  payload: {
    result: "SUCCESS" | "FAILED";
    summary?: string;
    errorDetail?: string;
  },
) {
  return jsonRequest<KnowledgeBaseRunMutationResult>(`/admin/knowledge-bases/sync-runs/${runId}`, "PATCH", payload);
}

export async function getModuleDefinitions(query: GetModuleDefinitionsQuery = {}) {
  const searchParams = new URLSearchParams();
  if (query.keyword?.trim()) {
    searchParams.set("keyword", query.keyword.trim());
  }
  if (query.moduleType && query.moduleType !== "ALL") {
    searchParams.set("moduleType", query.moduleType);
  }
  if (query.moduleStatus && query.moduleStatus !== "ALL") {
    searchParams.set("moduleStatus", query.moduleStatus);
  }
  const suffix = searchParams.toString();
  return request<ModuleDefinitionRecord[]>(suffix ? `/admin/module-definitions?${suffix}` : "/admin/module-definitions");
}

export async function getModuleDefinition(moduleId: string) {
  return request<ModuleDefinitionRecord>(`/admin/module-definitions/${moduleId}`);
}

export async function createModuleDefinition(payload: Omit<ModuleDefinitionRecord, "id" | "createdAt" | "updatedAt">) {
  return jsonRequest<ModuleDefinitionRecord>("/admin/module-definitions", "POST", payload);
}

export async function updateModuleDefinition(
  moduleId: string,
  payload: Partial<Omit<ModuleDefinitionRecord, "id" | "createdAt" | "updatedAt">>,
) {
  return jsonRequest<ModuleDefinitionRecord>(`/admin/module-definitions/${moduleId}`, "PATCH", payload);
}

export async function archiveModuleDefinition(moduleId: string) {
  return jsonRequest<ModuleDefinitionRecord>(`/admin/module-definitions/${moduleId}/archive`, "PATCH", {});
}

export async function deleteModuleDefinition(moduleId: string) {
  return request<ModuleDefinitionRecord>(`/admin/module-definitions/${moduleId}`, {
    method: "DELETE",
  });
}

export async function getSkillPackageModules(query: GetSkillPackageModulesQuery = {}) {
  const searchParams = new URLSearchParams();
  if (query.moduleKey?.trim()) {
    searchParams.set("moduleKey", query.moduleKey.trim());
  }
  if (query.packageKey?.trim()) {
    searchParams.set("packageKey", query.packageKey.trim());
  }
  if (query.bindingType && query.bindingType !== "ALL") {
    searchParams.set("bindingType", query.bindingType);
  }
  if (typeof query.enabled === "boolean") {
    searchParams.set("enabled", String(query.enabled));
  }
  const suffix = searchParams.toString();
  return request<SkillPackageModuleRecord[]>(
    suffix ? `/admin/skill-package-modules?${suffix}` : "/admin/skill-package-modules",
  );
}

export async function getSkillPackageModule(id: string) {
  return request<SkillPackageModuleRecord>(`/admin/skill-package-modules/${id}`);
}

export async function getSkillPackageModulesByModule(moduleKey: string, enabled?: boolean) {
  const searchParams = new URLSearchParams();
  if (typeof enabled === "boolean") {
    searchParams.set("enabled", String(enabled));
  }
  const suffix = searchParams.toString();
  return request<SkillPackageModuleRecord[]>(
    suffix
      ? `/admin/skill-package-modules/by-module/${encodeURIComponent(moduleKey)}?${suffix}`
      : `/admin/skill-package-modules/by-module/${encodeURIComponent(moduleKey)}`,
  );
}

export async function getSkillPackageModulesByPackage(packageKey: string, enabled?: boolean) {
  const searchParams = new URLSearchParams();
  if (typeof enabled === "boolean") {
    searchParams.set("enabled", String(enabled));
  }
  const suffix = searchParams.toString();
  return request<SkillPackageModuleRecord[]>(
    suffix
      ? `/admin/skill-package-modules/by-package/${encodeURIComponent(packageKey)}?${suffix}`
      : `/admin/skill-package-modules/by-package/${encodeURIComponent(packageKey)}`,
  );
}

export async function createSkillPackageModule(
  payload: Omit<SkillPackageModuleRecord, "id" | "moduleName" | "moduleType" | "entryRoute" | "createdAt" | "updatedAt">,
) {
  return jsonRequest<SkillPackageModuleRecord>("/admin/skill-package-modules", "POST", payload);
}

export async function updateSkillPackageModule(
  id: string,
  payload: Partial<
    Omit<SkillPackageModuleRecord, "id" | "moduleName" | "moduleType" | "entryRoute" | "createdAt" | "updatedAt">
  >,
) {
  return jsonRequest<SkillPackageModuleRecord>(`/admin/skill-package-modules/${id}`, "PATCH", payload);
}

export async function deleteSkillPackageModule(id: string) {
  return request<SkillPackageModuleRecord>(`/admin/skill-package-modules/${id}`, {
    method: "DELETE",
  });
}

export async function getApiProviders() {
  return request<ApiProviderRecord[]>("/admin/api-providers");
}

export async function updateApiProvider(
  providerId: string,
  payload: Partial<
    Pick<
      ApiProviderRecord,
      | "status"
      | "baseUrl"
      | "tutorialUrl"
      | "modelWhitelist"
      | "apiKey"
      | "defaultModel"
      | "organization"
      | "project"
      | "timeoutMs"
      | "streamEnabled"
      | "customHeaders"
      | "extraParams"
      | "remark"
    >
  >,
) {
  return jsonRequest<ApiProviderRecord>(`/admin/api-providers/${providerId}`, "PATCH", payload);
}

export async function createApiProvider(payload: {
  name: string;
  providerType: ApiProviderRecord["providerType"];
  baseUrl: string;
  tutorialUrl?: string;
  modelWhitelist?: string[];
  apiKey?: string;
  defaultModel?: string;
  organization?: string;
  project?: string;
  timeoutMs?: number;
  streamEnabled?: boolean;
  customHeaders?: Record<string, string>;
  extraParams?: Record<string, unknown>;
  remark?: string;
}) {
  return jsonRequest<ApiProviderRecord>("/admin/api-providers", "POST", payload);
}

export async function archiveApiProvider(providerId: string) {
  return jsonRequest<ApiProviderRecord>(`/admin/api-providers/${providerId}/archive`, "PATCH", {});
}

export async function deleteApiProvider(providerId: string) {
  return request<ApiProviderRecord>(`/admin/api-providers/${providerId}`, {
    method: "DELETE",
  });
}

export async function getThirdPartyPlatforms() {
  return request<ThirdPartyPlatformRecord[]>("/admin/third-party-platforms");
}

export async function createThirdPartyPlatform(payload: {
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status?: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  tutorialUrl?: string;
  modelIds?: string[];
  defaultModel?: string;
  remark?: string;
}) {
  return jsonRequest<ThirdPartyPlatformRecord>("/admin/third-party-platforms", "POST", payload);
}

export async function updateThirdPartyPlatform(
  platformId: string,
  payload: Partial<
    Pick<
      ThirdPartyPlatformRecord,
      "name" | "providerType" | "status" | "baseUrl" | "tutorialUrl" | "modelIds" | "defaultModel" | "remark"
    >
  >,
) {
  return jsonRequest<ThirdPartyPlatformRecord>(`/admin/third-party-platforms/${platformId}`, "PATCH", payload);
}

export async function deleteThirdPartyPlatform(platformId: string) {
  return request<ThirdPartyPlatformRecord>(`/admin/third-party-platforms/${platformId}`, {
    method: "DELETE",
  });
}
