import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  category: "INDUSTRY_REPORT" | "BUSINESS_DATA" | "PLATFORM_EXPORT" | "GENERATED_REPORT";
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

export type ApiProviderRecord = {
  id: string;
  name: string;
  providerType: "OPENAI" | "GEMINI" | "DOUBAO" | "CUSTOM";
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  baseUrl: string;
  tutorialUrl: string;
  modelWhitelist: string[];
  apiKey: string;
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

function readTextFromCandidates(candidates: string[], fallback: string) {
  for (const candidate of candidates) {
    try {
      const filePath = resolve(process.cwd(), candidate);
      if (!existsSync(filePath)) {
        continue;
      }
      const content = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
      if (content) {
        return content;
      }
    } catch {
      continue;
    }
  }
  return fallback;
}

const brandGrowthSkillContent = readTextFromCandidates(
  [
    "../../../../.trae/skills/brand-omni-growth-analysis/SKILL.md",
    "../../../.runtime/brand-omni-growth-analysis/brand-omni-growth-analysis/SKILL.md",
  ],
  "你是品牌全域增长顾问，需要基于品牌资料、行业资料和经营数据生成增长分析报告。",
);

const visualReportSkillContent = readTextFromCandidates(
  ["../../../提示词/article-visual-report-designer/SKILL.md"],
  "你是数据可视化设计师，需要将结构化洞察转化为适合前端渲染的 HTML 报告。",
);

const xiaohongshuPlanSkillContent = readTextFromCandidates(
  ["../../../提示词/_xhs-plan-skill/xiaohongshu-brand-marketing-plan/SKILL.md"],
  "你是小红书品牌营销顾问，需要输出年度种草策略、内容支柱和月度排期建议。",
);

const xiaohongshuOriginalCopySkillContent = readTextFromCandidates(
  [
    "../../../提示词/original_copy/original_copy/SKILL.md",
    "../提示词/original_copy/original_copy/SKILL.md",
  ],
  "根据营销规划方案、营销日历选题、产品信息和用户附加要求，生成可直接发布的小红书原创标题、正文与标签。",
);

const xiaohongshuOriginalNoteSkillContent = readTextFromCandidates(
  [
    "../../../提示词/original_image/SKILL.md",
    "../提示词/original_image/SKILL.md",
  ],
  "根据营销规划方案、营销日历、原创笔记正文、产品信息和用户要求，生成封面提示词与原创配图提示词。",
);

const xiaohongshuRewriteNoteSkillContent = readTextFromCandidates(
  [
    "../../../提示词/rewrite_image/SKILL.md",
    "../提示词/rewrite_image/SKILL.md",
  ],
  "根据用户输入的小红书对标配图及二创文案，生成全新的二创配图提示词。",
);

const xiaohongshuRewriteCopySkillContent = readTextFromCandidates(
  [
    "../../../提示词/rewrite_copy/SKILL.md",
    "../提示词/rewrite_copy/SKILL.md",
  ],
  "根据对标作品、营销规划和用户要求，生成小红书二创笔记标题、正文与标签。",
);

const xiaohongshuVideoNoteSkillContent = readTextFromCandidates(
  [
    "../../../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
    "../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
  ],
  "基于商业短片方法论生成视频笔记文案、结构化视频提示词、分段方案和短视频调用链。",
);

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
  apiProviders: ApiProviderRecord[];
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
      enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与年度营销规划。",
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
      provider: "OpenAI Proxy",
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
      provider: "OpenAI Proxy",
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
      provider: "OpenAI Proxy",
      defaultModel: "gpt-5.5",
      pointsCost: 320,
      description: "用于生成品牌诊断、增长机会和年度增长方向建议。",
      updatedAt: "2026-05-02T02:03:00.000Z",
    },
    {
      id: "skill_annual_plan",
      name: "全年营销规划",
      slug: "enterprise-annual-plan",
      category: "品牌增长",
      status: "ACTIVE",
      provider: "OpenAI Proxy",
      defaultModel: "gpt-5.5",
      pointsCost: 280,
      description: "用于输出全年营销节点、活动主题和多平台协同规划。",
      updatedAt: "2026-05-04T12:00:00.000Z",
    },
    {
      id: "skill_xhs_plan",
      name: "小红书营销规划",
      slug: "xiaohongshu-brand-marketing-plan",
      category: "内容营销",
      status: "ACTIVE",
      provider: "OpenAI Proxy",
      defaultModel: "gpt-5.5",
      pointsCost: 260,
      description: "用于输出小红书品牌规划、内容选题和种草策略。",
      updatedAt: "2026-05-01T18:45:00.000Z",
    },
    {
      id: "skill_article_report",
      name: "文章可视化报告",
      slug: "article-visual-report-designer",
      category: "可视化报告",
      status: "ACTIVE",
      provider: "OpenAI Proxy",
      defaultModel: "gpt-5.5",
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
      description: "用于根据对标内容与二创文案生成全新的二创配图提示词。",
      updatedAt: "2026-05-07T15:40:00.000Z",
    },
    {
      id: "skill_xhs_video_note",
      name: "小红书视频笔记",
      slug: "short-video-api-studio",
      category: "内容生产",
      status: "ACTIVE",
      provider: "Video Pipeline",
      defaultModel: "seedance",
      pointsCost: 240,
      description: "用于生成视频笔记文案、视频提示词并衔接第三方视频模型。",
      updatedAt: "2026-05-06T09:10:00.000Z",
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
      id: "prompt_xhs_video_note",
      name: "小红书视频笔记提示词",
      scene: "小红书视频笔记",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "seedance",
      temperature: 0.6,
      maxTokens: 5000,
      content: xiaohongshuVideoNoteSkillContent,
      updatedAt: "2026-05-06T09:10:00.000Z",
    },
    {
      id: "prompt_annual_marketing_plan",
      name: "全年营销规划提示词",
      scene: "全年营销规划生成",
      version: "v1.0",
      status: "ACTIVE",
      modelName: "gpt-5.5",
      temperature: 0.5,
      maxTokens: 4200,
      content:
        "你是全年营销规划顾问，需要基于品牌商家建档和品牌增长报告，输出覆盖全年节日与节气节点的营销规划 JSON；必须包含月份、节点、类型、日期、营销主题、平台、营销策略、产品，并体现多平台联动。",
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
  apiProviders: [
    {
      id: "provider_openai",
      name: "OpenAI Proxy",
      providerType: "OPENAI",
      status: "ACTIVE",
      baseUrl: "https://api.openai-proxy.local/v1",
      tutorialUrl: "https://platform.openai.com/docs/api-reference",
      modelWhitelist: ["gpt-5.5", "gpt-5.4-nano"],
      apiKey: "sk-proxy-demo-openai-001",
      remark: "统一承接 OpenAI 兼容模型调用，优先给品牌增长与小红书文案链路使用。",
      successRate: 99.2,
      requestCount24h: 428,
      totalCostYuan: 186.4,
      lastCalledAt: "2026-05-02T10:20:00.000Z",
      updatedAt: "2026-05-02T10:20:00.000Z",
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
      remark: "主要用于可视化报告和长文本结构化输出。",
      successRate: 97.6,
      requestCount24h: 96,
      totalCostYuan: 63.8,
      lastCalledAt: "2026-05-02T09:55:00.000Z",
      updatedAt: "2026-05-02T09:55:00.000Z",
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
      remark: "预留国内模型链路，后续可用于低成本内容生成或兜底路由。",
      successRate: 93.4,
      requestCount24h: 21,
      totalCostYuan: 7.2,
      lastCalledAt: "2026-05-01T18:10:00.000Z",
      updatedAt: "2026-05-01T18:10:00.000Z",
    },
  ],
};

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}
