import { getStoredCurrentBrandId } from "./auth-session";
import { request, jsonRequest } from "./http";

export type PlatformType = "XIAOHONGSHU" | "DOUYIN" | "VIDEO_CHANNEL" | "WECHAT_OA";
export type BrandCollaboratorRole = "ADMIN" | "STAFF" | "TALENT";
export type BrandPermissionAction = "view" | "edit";
export type BrandPermissionFlags = {
  view: boolean;
  edit: boolean;
};
export type BrandPermissionKey =
  | "brandGrowth.library.background"
  | "brandGrowth.library.products"
  | "brandGrowth.library.survey"
  | "brandGrowth.library.industryFeeds"
  | "brandGrowth.library.businessAssets"
  | "brandGrowth.collection.xiaohongshuCollection"
  | "brandGrowth.collection.douyinCollection"
  | "brandGrowth.collection.dailyHotspot"
  | "brandGrowth.report.growthReport"
  | "brandGrowth.report.visualGrowthReport"
  | "brandGrowth.report.halfYearMarketingPlan"
  | "xiaohongshu.plan"
  | "douyin.plan"
  | "xiaohongshu.assets"
  | "douyin.assets"
  | "xiaohongshu.calendar"
  | "douyin.hotTopics"
  | "douyin.topicLibrary"
  | "xiaohongshu.original"
  | "douyin.original"
  | "xiaohongshu.remix"
  | "douyin.remix"
  | "xiaohongshu.video"
  | "douyin.video"
  | "douyin.videoDirect"
  | "douyin.digitalHuman"
  | "wechat.config"
  | "wechat.original"
  | "personalCenter.skills"
  | "personalCenter.thirdPartyPlatforms"
  | "personalCenter.tasks"
  | "personalCenter.works"
  | "personalCenter.team";
export type BrandPermissionMap = Record<BrandPermissionKey, BrandPermissionFlags>;
export type BrandPermissionConfig = Record<BrandCollaboratorRole, BrandPermissionMap>;
export type BrandPermissionTreeNode = {
  key: string;
  label: string;
  groups: Array<{
    key: string;
    label: string;
    items: Array<{
      key: BrandPermissionKey;
      label: string;
    }>;
  }>;
};
export type BrandArchiveStepKey =
  | "background"
  | "products"
  | "survey"
  | "platformAccounts"
  | "competitorAccounts"
  | "industryFeeds"
  | "businessAssets";
export type BrandArchiveStatus = "ready" | "in_progress" | "pending";

export type BrandBackground = {
  id: string;
  brandName: string;
  industry: string;
  storeCount: number;
  foundedYear: number;
  brandDescription: string;
  enterpriseIntro: string;
};

export type BrandProduct = {
  id: string;
  productName: string;
  productType: string;
  price: number;
  productPositioning: string;
  targetAudience: string;
  painPoint: string;
  usageScenario: string;
  differentiators: string;
  marketPosition: string;
  detailDescription: string;
  imageUrl: string;
};

export type BrandSurveyAnswer = {
  id?: string;
  key: string;
  label: string;
  value: string;
};

export type BrandSurveyFieldDefinition = {
  key: string;
  label: string;
};

export type BrandSurveyGroupDefinition = {
  title: string;
  fields: BrandSurveyFieldDefinition[];
};

export type BrandSurveySectionDefinition = {
  title: string;
  fields?: BrandSurveyFieldDefinition[];
  groups?: BrandSurveyGroupDefinition[];
};

export type BrandAccount = {
  id?: string;
  platform: PlatformType;
  accountName: string;
  accountLink: string;
};

export type BrandAsset = {
  id?: string;
  title: string;
  description: string;
  sourceName?: string;
  fileUrl?: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  knowledgeBaseSlug?: string;
  bindingType?: "MODULE" | "SKILL_PACKAGE" | "SKILL";
  targetId?: string;
  targetKey?: string;
  targetName?: string;
  priority?: number;
  retrievalMode?: "HYBRID" | "VECTOR" | "FULL_TEXT";
  isRequired?: boolean;
  enabled?: boolean;
  defaultTopK?: number;
  recallMode?: "HYBRID" | "VECTOR" | "FULL_TEXT";
  rerankEnabled?: boolean;
  retrievalThreshold?: number;
};

export type FeishuBindingRecord = {
  id: string;
  title: string;
  wikiUrl: string;
  wikiToken: string;
  host: string;
  tableId: string;
  viewId: string;
  baseToken: string;
  templateUrl: string;
  syncStatus: string;
  lastError: string;
  lastBoundAt: string;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
};

export type FeishuBindingPayload = {
  wikiUrl: string;
  title?: string;
  templateUrl?: string;
};

export type FeishuAuthStatusRecord = {
  configured: boolean;
  connected: boolean;
  userId: string;
  appId: string;
  redirectUri: string;
  scope: string;
  providerUserName: string;
  providerUserOpenId: string;
  expiresAt: string;
  message: string;
};

export type FeishuAuthStartRecord = {
  authorizeUrl: string;
  state: string;
  configured: boolean;
  message: string;
};

export type FeishuAppConfigRecord = {
  configured: boolean;
  userId: string;
  appId: string;
  appSecretMasked: string;
  redirectUri: string;
  scope: string;
  message: string;
  updatedAt: string;
};

export type FeishuAppConfigPayload = {
  appId: string;
  appSecret: string;
  redirectUri?: string;
  scope?: string;
};

export type CurrentUserProfile = {
  id: string;
  mobile: string;
  email: string;
  nickname: string;
  status: string;
  membership: string;
  systemRole?: string;
  pointsBalance: number;
};

export type BrandMemberRecord = {
  id: string;
  userId: string;
  nickname: string;
  mobile: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  isCurrentUser: boolean;
  isOwner: boolean;
};

export type BrandMemberListRecord = {
  brandId: string;
  brandName: string;
  currentUserRole: BrandCollaboratorRole;
  isCurrentUserOwner: boolean;
  canManageMembers: boolean;
  items: BrandMemberRecord[];
};

export type AddBrandMemberPayload = {
  account: string;
  role?: BrandCollaboratorRole;
};

export type UpdateBrandMemberPayload = {
  role?: BrandCollaboratorRole;
  status?: "ACTIVE" | "DISABLED" | "REMOVED";
};

export type BrandInviteRecord = {
  id: string;
  inviteAccount: string;
  inviteCode: string;
  inviteLink: string;
  inviteeUserId?: string;
  inviteeNickname?: string;
  inviteeMobile?: string;
  inviteeEmail?: string;
  role: string;
  status: string;
  note?: string;
  invitedByUserId: string;
  invitedByName: string;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
  isMatchedUser: boolean;
  isRead?: boolean;
  readAt?: string;
};

export type BrandInviteListRecord = {
  brandId: string;
  brandName: string;
  items: BrandInviteRecord[];
};

export type PendingBrandInviteListRecord = {
  items: Array<
    BrandInviteRecord & {
      brandId: string;
      brandName: string;
    }
  >;
};

export type MyBrandInviteHistoryListRecord = {
  items: Array<
    BrandInviteRecord & {
      brandId: string;
      brandName: string;
    }
  >;
};

export type AcceptBrandInviteByCodePayload = {
  inviteCode: string;
};

export type UpdateMyBrandInviteReadStatePayload = {
  inviteIds: string[];
  read?: boolean;
};

export type UpdateMyBrandInviteReadStateRecord = {
  inviteIds: string[];
  read: boolean;
  updatedCount: number;
};

export type BrandInviteNotificationRecord = {
  notificationId: string;
  title: string;
  summary: string;
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  brandId: string;
  brandName: string;
  invite: BrandInviteRecord;
};

export type BrandInviteNotificationListRecord = {
  unreadCount: number;
  items: BrandInviteNotificationRecord[];
};

export type UpdateMyBrandInviteNotificationReadStatePayload = {
  notificationIds: string[];
  read?: boolean;
};

export type UpdateMyBrandInviteNotificationReadStateRecord = {
  notificationIds: string[];
  read: boolean;
  updatedCount: number;
};

export type BrandRoleAuditLogRecord = {
  id: string;
  action: string;
  summary: string;
  operatorUserId: string;
  operatorName: string;
  targetUserId?: string;
  targetUserName?: string;
  targetInviteId?: string;
  createdAt: string;
};

export type BrandRoleAuditLogListRecord = {
  brandId: string;
  brandName: string;
  items: BrandRoleAuditLogRecord[];
};

export type TransferBrandOwnerPayload = {
  memberId: string;
};

export type CreateBrandInvitePayload = {
  role?: BrandCollaboratorRole;
  note?: string;
  expiresInDays?: number;
};

export type BrandPermissionSettingsRecord = {
  brandId: string;
  brandName: string;
  currentUserRole: BrandCollaboratorRole;
  isCurrentUserOwner: boolean;
  canManageMembers: boolean;
  canManagePermissions: boolean;
  permissionConfig: BrandPermissionConfig;
  currentUserPermissions: BrandPermissionMap;
  permissionTree: BrandPermissionTreeNode[];
};

export type UpdateBrandPermissionSettingsPayload = {
  permissionConfig: BrandPermissionConfig;
};

export type BrandArchiveBundle = {
  brand: BrandBackground;
  products: BrandProduct[];
  survey: BrandSurveyAnswer[];
  platformAccounts: BrandAccount[];
  competitorAccounts: BrandAccount[];
  industryFeeds: BrandAsset[];
  businessAssets: BrandAsset[];
  steps: Array<{
    key: BrandArchiveStepKey;
    name: string;
    status: BrandArchiveStatus;
    description: string;
  }>;
};

export type BrandProductImageUploadRecord = {
  fileName: string;
  imageUrl: string;
};

export type BrandAssetFileUploadRecord = {
  fileName: string;
  fileUrl: string;
};

export const BRAND_SURVEY_SECTIONS: BrandSurveySectionDefinition[] = [
  {
    title: "业务流程",
    fields: [
      { key: "businessProcess", label: "业务流程" },
    ],
  },
  {
    title: "人",
    fields: [
      { key: "customerProfile", label: "客户画像" },
      { key: "customerSource", label: "客户来源" },
      { key: "customerRetention", label: "客户沉淀" },
    ],
  },
  {
    title: "货",
    fields: [
      { key: "productStructure", label: "产品结构" },
      { key: "productSellingPoints", label: "产品卖点" },
      { key: "supplyChain", label: "供应链" },
    ],
  },
  {
    title: "场",
    fields: [
      { key: "offlineSalesChannels", label: "线下销售渠道" },
      { key: "onlineSalesChannels", label: "线上销售渠道" },
      { key: "onlineMarketingChannels", label: "线上营销渠道" },
    ],
  },
  {
    title: "资",
    fields: [
      { key: "publicDomainOrg", label: "公域业务组织架构" },
      { key: "privateDomainOrg", label: "私域业务组织架构" },
      { key: "businessSystems", label: "业务系统" },
      { key: "businessBudget", label: "公域/私域业务预算" },
    ],
  },
  {
    title: "制度",
    fields: [
      { key: "businessPlanning", label: "公域/私域业务规划" },
      { key: "incentiveAssessment", label: "公域/私域激励考核" },
    ],
  },
  {
    title: "优劣势",
    fields: [
      { key: "brandStrengths", label: "品牌优势" },
      { key: "brandWeaknesses", label: "品牌劣势" },
    ],
  },
  {
    title: "业务诊断",
    groups: [
      {
        title: "商家痛点",
        fields: [
          { key: "merchantPainPointBusiness", label: "业务层面" },
          { key: "merchantPainPointService", label: "服务层面" },
        ],
      },
      {
        title: "商家需求",
        fields: [
          { key: "merchantNeedShortTerm", label: "短期需求" },
          { key: "merchantNeedLongTerm", label: "长期需求" },
        ],
      },
    ],
  },
  {
    title: "其他情况说明",
    fields: [
      { key: "otherNotes", label: "其他情况说明" },
    ],
  },
];

const BRAND_SURVEY_FIELDS: BrandSurveyFieldDefinition[] = BRAND_SURVEY_SECTIONS.flatMap((section) => [
  ...(section.fields ?? []),
  ...((section.groups ?? []).flatMap((group) => group.fields)),
]);

export function createDefaultBrandSurveyAnswers(initialValues?: Record<string, string>): BrandSurveyAnswer[] {
  return BRAND_SURVEY_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: initialValues?.[field.key] ?? "",
  }));
}

export function normalizeBrandSurveyAnswers(answers: BrandSurveyAnswer[]): BrandSurveyAnswer[] {
  const answerMap = new Map(answers.map((item) => [item.key, item]));
  return BRAND_SURVEY_FIELDS.map((field, index) => {
    const current = answerMap.get(field.key);
    return {
      id: current?.id ?? `sur_tpl_${index + 1}`,
      key: field.key,
      label: field.label,
      value: current?.value ?? "",
    };
  });
}

export function normalizeBrandArchiveBundle(bundle: BrandArchiveBundle): BrandArchiveBundle {
  return {
    ...bundle,
    products: bundle.products.map((item) => ({
      id: item.id,
      productName: item.productName ?? "",
      productType: item.productType ?? "",
      price: item.price ?? 0,
      productPositioning: item.productPositioning ?? "",
      targetAudience: item.targetAudience ?? "",
      painPoint: item.painPoint ?? "",
      usageScenario: item.usageScenario ?? "",
      differentiators: item.differentiators ?? "",
      marketPosition: item.marketPosition ?? "",
      detailDescription: item.detailDescription ?? "",
      imageUrl: item.imageUrl ?? "",
    })),
    survey: normalizeBrandSurveyAnswers(bundle.survey),
  };
}

export const DEMO_BRAND_ID = "br_demo_001";

function resolveBrandId(brandId?: string) {
  return brandId || getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID;
}

export const brandArchiveSeed: BrandArchiveBundle = {
  brand: {
    id: DEMO_BRAND_ID,
    brandName: "武汉仟吉",
    industry: "烘焙零售",
    storeCount: 180,
    foundedYear: 2000,
    brandDescription: "区域烘焙品牌，线下门店基础较强，线上全域增长空间明显。",
    enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与半年营销规划。",
  },
  products: [
    {
      id: "prd_demo_001",
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
      imageUrl: "https://oss.example.com/products/tiramisu-cake.jpg",
    },
    {
      id: "prd_demo_002",
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
      imageUrl: "https://oss.example.com/products/croissant.jpg",
    },
  ],
  survey: createDefaultBrandSurveyAnswers({
    businessProcess: "当前以线下门店为主，线上私域承接与公域导流链路尚未完全打通。",
    customerProfile: "核心为城市家庭消费者、年轻白领、节庆礼赠人群，复购需求存在但精细化运营不足。",
    onlineMarketingChannels: "公众号与门店活动较稳定，小红书等种草渠道内容供给不足。",
    merchantPainPointBusiness: "线上流量获取成本上升，会员沉淀与二次转化效率偏低。",
    merchantNeedShortTerm: "尽快形成可复制的内容种草、会员拉新、门店转化三位一体增长方案。",
    merchantNeedLongTerm: "沉淀全域品牌资产、数据资产与自动化运营能力，降低人工依赖。",
  }),
  platformAccounts: [
    {
      id: "acc_demo_001",
      platform: "XIAOHONGSHU",
      accountName: "武汉仟吉烘焙",
      accountLink: "https://www.xiaohongshu.com/user/profile/demo",
    },
    {
      id: "acc_demo_002",
      platform: "WECHAT_OA",
      accountName: "武汉仟吉",
      accountLink: "qianji-official",
    },
  ],
  competitorAccounts: [
    {
      id: "cmp_demo_001",
      platform: "XIAOHONGSHU",
      accountName: "区域烘焙竞品A",
      accountLink: "https://www.xiaohongshu.com/user/profile/comp-a",
    },
  ],
  industryFeeds: [
    {
      id: "ast_demo_001",
      title: "烘焙品类市场分析",
      description: "包含品类规模、价格分布、场景需求与用户偏好。",
      sourceName: "蝉妈妈 AI 市场调研",
      fileUrl: "https://oss.example.com/industry/bakery-report.pdf",
    },
  ],
  businessAssets: [
    {
      id: "ast_demo_002",
      title: "有赞商城季度经营明细",
      description: "用于分析订单结构、复购率、客单价与渠道转化差异。",
      sourceName: "有赞导出报表",
      fileUrl: "https://oss.example.com/business/youzan-q1.xlsx",
    },
  ],
  steps: [
    { key: "background", name: "品牌背景资料", status: "ready", description: "品牌名称、行业、门店数量与品牌介绍。" },
    { key: "products", name: "产品资料库", status: "ready", description: "一行一个产品，沉淀价格、定位和使用场景。" },
    { key: "survey", name: "品牌运营情况调研", status: "in_progress", description: "围绕人货场资制度与业务诊断做结构化填写。" },
    { key: "platformAccounts", name: "品牌平台账号", status: "ready", description: "品牌自有账号，用于自动采集。" },
    { key: "competitorAccounts", name: "竞品平台账号", status: "ready", description: "竞品账号，用于对标分析和素材来源。" },
    { key: "industryFeeds", name: "第三方数据投喂", status: "ready", description: "行业报告、市场分析等外部输入。" },
    { key: "businessAssets", name: "企业经营数据投喂", status: "ready", description: "有赞、抖店等经营明细与报表。" },
  ],
};

export async function getBrandArchive(brandId?: string) {
  return request<BrandArchiveBundle>(`/brands/${resolveBrandId(brandId)}/archive`);
}

export async function getBrandMembers(brandId: string) {
  return request<BrandMemberListRecord>(`/brands/${brandId}/members`);
}

export async function addBrandMember(brandId: string, payload: AddBrandMemberPayload) {
  return request<BrandInviteListRecord>(`/brands/${brandId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBrandMember(brandId: string, memberId: string, payload: UpdateBrandMemberPayload) {
  return request<BrandMemberListRecord>(`/brands/${brandId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getBrandInvites(brandId: string) {
  return request<BrandInviteListRecord>(`/brands/${brandId}/invites`);
}

export async function createBrandInvite(brandId: string, payload: CreateBrandInvitePayload) {
  return request<BrandInviteListRecord>(`/brands/${brandId}/invites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getBrandPermissionSettings(brandId: string) {
  return request<BrandPermissionSettingsRecord>(`/brands/${brandId}/member-permissions`);
}

export async function updateBrandPermissionSettings(brandId: string, payload: UpdateBrandPermissionSettingsPayload) {
  return request<BrandPermissionSettingsRecord>(`/brands/${brandId}/member-permissions`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function revokeBrandInvite(brandId: string, inviteId: string) {
  return request<BrandInviteListRecord>(`/brands/${brandId}/invites/${inviteId}/revoke`, {
    method: "PATCH",
  });
}

export async function getMyBrandInvites() {
  return request<PendingBrandInviteListRecord>("/brands/me/invites");
}

export async function getMyBrandInviteHistory() {
  return request<MyBrandInviteHistoryListRecord>("/brands/me/invites/history");
}

export async function getMyBrandInviteNotifications() {
  return request<BrandInviteNotificationListRecord>("/brands/me/invite-notifications");
}

export async function acceptMyBrandInvite(inviteId: string) {
  return request<{ brandId: string; brandName: string; accepted: boolean }>(`/brands/me/invites/${inviteId}/accept`, {
    method: "PATCH",
  });
}

export async function acceptMyBrandInviteByCode(payload: AcceptBrandInviteByCodePayload) {
  return request<{ brandId: string; brandName: string; accepted: boolean }>("/brands/me/invites/accept-by-code", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateMyBrandInviteReadState(payload: UpdateMyBrandInviteReadStatePayload) {
  return request<UpdateMyBrandInviteReadStateRecord>("/brands/me/invites/read-state", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateMyBrandInviteNotificationReadState(payload: UpdateMyBrandInviteNotificationReadStatePayload) {
  return request<UpdateMyBrandInviteNotificationReadStateRecord>("/brands/me/invite-notifications/read-state", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getBrandRoleAuditLogs(brandId: string) {
  return request<BrandRoleAuditLogListRecord>(`/brands/${brandId}/role-audit-logs`);
}

export async function transferBrandOwner(brandId: string, payload: TransferBrandOwnerPayload) {
  return request<BrandMemberListRecord>(`/brands/${brandId}/transfer-owner`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateBrandBackground(brandId: string | undefined, payload: Partial<BrandBackground>) {
  return jsonRequest<BrandBackground>(`/brands/${resolveBrandId(brandId)}/background`, "PATCH", payload);
}

export async function createBrandProduct(
  brandId: string | undefined,
  payload: Omit<BrandProduct, "id">,
) {
  return jsonRequest<BrandProduct>(`/brands/${resolveBrandId(brandId)}/products`, "POST", payload);
}

export async function updateBrandProduct(
  brandId: string | undefined,
  productId: string,
  payload: Omit<BrandProduct, "id">,
) {
  return jsonRequest<BrandProduct>(`/brands/${resolveBrandId(brandId)}/products/${productId}`, "PATCH", payload);
}

export async function deleteBrandProduct(brandId: string | undefined, productId: string) {
  return request<BrandProduct>(`/brands/${resolveBrandId(brandId)}/products/${productId}`, {
    method: "DELETE",
  });
}

export async function replaceBrandSurvey(brandId: string | undefined, answers: BrandSurveyAnswer[]) {
  return jsonRequest<BrandSurveyAnswer[]>(`/brands/${resolveBrandId(brandId)}/survey`, "PATCH", { answers });
}

export async function replaceBrandAccounts(
  brandId: string | undefined,
  route: "platform-accounts" | "competitor-accounts",
  accounts: BrandAccount[],
) {
  return jsonRequest<BrandAccount[]>(`/brands/${resolveBrandId(brandId)}/${route}`, "PATCH", { accounts });
}

export async function replaceBrandAssets(
  brandId: string | undefined,
  route: "industry-feeds" | "business-assets",
  items: BrandAsset[],
) {
  return jsonRequest<BrandAsset[]>(`/brands/${resolveBrandId(brandId)}/${route}`, "PATCH", { items });
}

export async function uploadBrandProductImage(brandId: string | undefined, file: File): Promise<BrandProductImageUploadRecord> {
  const dataBase64 = await readFileAsBase64(file);
  return jsonRequest<BrandProductImageUploadRecord>(`/brands/${resolveBrandId(brandId)}/product-images`, "POST", {
    fileName: file.name,
    contentType: file.type || "image/jpeg",
    dataBase64,
  });
}

export async function uploadBrandAssetFile(brandId: string | undefined, file: File): Promise<BrandAssetFileUploadRecord> {
  const dataBase64 = await readFileAsBase64(file);
  return jsonRequest<BrandAssetFileUploadRecord>(`/brands/${resolveBrandId(brandId)}/asset-files`, "POST", {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    dataBase64,
  });
}

export async function getBrandFeishuBinding(brandId?: string) {
  return request<FeishuBindingRecord | null>(`/brands/${resolveBrandId(brandId)}/feishu-binding`);
}

export async function upsertBrandFeishuBinding(brandId: string | undefined, payload: FeishuBindingPayload) {
  return jsonRequest<FeishuBindingRecord>(`/brands/${resolveBrandId(brandId)}/feishu-binding`, "PATCH", payload);
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

export async function getCurrentUserProfile() {
  return request<CurrentUserProfile>("/auth/profile");
}

export async function getFeishuAuthStatus(userId?: string) {
  const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return request<FeishuAuthStatusRecord>(`/auth/feishu/oauth/status${suffix}`);
}

export async function getFeishuAppConfig(userId?: string) {
  const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return request<FeishuAppConfigRecord>(`/auth/feishu/app-config${suffix}`);
}

export async function upsertFeishuAppConfig(payload: FeishuAppConfigPayload, userId?: string) {
  const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return jsonRequest<FeishuAppConfigRecord>(`/auth/feishu/app-config${suffix}`, "POST", payload);
}

export async function startFeishuAuth(userId?: string, returnUrl?: string) {
  const params = new URLSearchParams();
  if (userId) {
    params.set("userId", userId);
  }
  if (returnUrl) {
    params.set("returnUrl", returnUrl);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<FeishuAuthStartRecord>(`/auth/feishu/oauth/start${suffix}`);
}
