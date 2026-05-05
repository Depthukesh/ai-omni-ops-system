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
  status: "ACTIVE" | "DISABLED";
  membership: MembershipLevel;
  pointsBalance: number;
  brandCount: number;
  taskCount: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
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

export type ApiProviderRecord = {
  id: string;
  name: string;
  providerType: "OPENAI" | "GEMINI" | "DOUBAO" | "CUSTOM";
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  baseUrl: string;
  modelWhitelist: string[];
  maskedApiKey: string;
  successRate: number;
  requestCount24h: number;
  totalCostYuan: number;
  lastCalledAt: string;
  updatedAt: string;
};

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
    status: "ACTIVE",
    membership: "PRO",
    pointsBalance: 14420,
    brandCount: 1,
    taskCount: 2,
    orderCount: 2,
    createdAt: "2026-04-30T10:00:00.000Z",
    updatedAt: "2026-05-02T02:03:00.000Z",
  },
  {
    id: "usr_demo_002",
    mobile: "13900000001",
    email: "brand-owner@ai-omni.local",
    nickname: "品牌主理人",
    status: "ACTIVE",
    membership: "BASIC",
    pointsBalance: 3800,
    brandCount: 1,
    taskCount: 4,
    orderCount: 1,
    createdAt: "2026-05-01T01:00:00.000Z",
    updatedAt: "2026-05-02T01:20:00.000Z",
  },
  {
    id: "usr_demo_003",
    mobile: "13700000002",
    email: "ops@ai-omni.local",
    nickname: "运营同学",
    status: "DISABLED",
    membership: "FREE",
    pointsBalance: 200,
    brandCount: 0,
    taskCount: 1,
    orderCount: 0,
    createdAt: "2026-05-01T06:30:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
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

export const apiProviderSeed: ApiProviderRecord[] = [
  {
    id: "provider_openai",
    name: "OpenAI Proxy",
    providerType: "OPENAI",
    status: "ACTIVE",
    baseUrl: "https://api.openai-proxy.local/v1",
    modelWhitelist: ["gpt-5.5", "gpt-5.4-nano"],
    maskedApiKey: "sk-proxy-****8fd2",
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
    modelWhitelist: ["gemini-2.5-pro"],
    maskedApiKey: "gm-proxy-****9ce1",
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
    modelWhitelist: ["doubao-pro-32k"],
    maskedApiKey: "ark-****17ab",
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

export async function getAdminUsers() {
  return request<AdminUserRecord[]>("/admin/users");
}

export async function updateAdminUser(
  userId: string,
  payload: {
    membership?: MembershipLevel;
    pointsDelta?: number;
  },
) {
  return jsonRequest<AdminUserRecord>(`/admin/users/${userId}`, "PATCH", payload);
}

export async function getModelUsage() {
  return request<ModelUsageRecord[]>("/admin/model-usage");
}

export async function getSkillConfigs() {
  return request<SkillConfigRecord[]>("/admin/skills");
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

export async function getApiProviders() {
  return request<ApiProviderRecord[]>("/admin/api-providers");
}

export async function updateApiProvider(
  providerId: string,
  payload: Partial<Pick<ApiProviderRecord, "status" | "baseUrl" | "modelWhitelist" | "maskedApiKey">>,
) {
  return jsonRequest<ApiProviderRecord>(`/admin/api-providers/${providerId}`, "PATCH", payload);
}

export async function createApiProvider(payload: {
  name: string;
  providerType: ApiProviderRecord["providerType"];
  baseUrl: string;
  modelWhitelist?: string[];
  maskedApiKey?: string;
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
