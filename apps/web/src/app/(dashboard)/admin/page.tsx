"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiProviderSeed,
  archiveApiProvider,
  archiveKnowledgeBase,
  adminUserSeed,
  adminOrderSeed,
  billingRulesSeed,
  createApiProvider,
  createKnowledgeBase,
  createKnowledgeBaseFile,
  deleteApiProvider,
  deleteKnowledgeBase,
  deleteKnowledgeBaseFile,
  completeKnowledgeBaseSyncRun,
  getAdminOrders,
  getApiProviders,
  getKnowledgeBases,
  getKnowledgeBaseFiles,
  getKnowledgeBaseSyncRuns,
  getPromptTemplates,
  getAdminUsers,
  getBillingRules,
  getModelUsage,
  getSkillConfigs,
  knowledgeBaseFileSeed,
  knowledgeBaseSyncRunSeed,
  knowledgeBaseSeed,
  modelUsageSeed,
  promptTemplateSeed,
  skillConfigSeed,
  startKnowledgeBaseSync,
  syncKnowledgeBaseFile,
  updateApiProvider,
  updateKnowledgeBaseFile,
  updateKnowledgeBase,
  updatePromptTemplate,
  updateSkillConfig,
  updateBillingRules,
  type ApiProviderRecord,
  type AdminUserRecord,
  type BillingRules,
  type KnowledgeBaseFileMutationResult,
  type KnowledgeBaseFileRecord,
  type KnowledgeBaseRecord,
  type KnowledgeBaseSyncMutationResult,
  type KnowledgeBaseRunMutationResult,
  type KnowledgeBaseSyncRunRecord,
  type MembershipLevel,
  type MembershipPlanRule,
  type ModelUsageRecord,
  type PointsPackageRule,
  type PromptTemplateRecord,
  type SkillConfigRecord,
} from "../../../services/admin";
import { getMe, logout as logoutSession, readAuthSession } from "../../../services/auth";
import { cancelOrder, payOrder, type OrderRecord } from "../../../services/personal-center";
import { UsersManagementPanel } from "./users-management-panel";

type AdminTab = "dashboard" | "orders" | "rules" | "users" | "usage" | "assets" | "knowledge" | "providers";
type AdminSystemRole = "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
type SkillEditDraft = {
  status: SkillConfigRecord["status"];
  defaultModel: string;
  pointsCost: string;
  description: string;
};
type PromptEditDraft = {
  status: PromptTemplateRecord["status"];
  modelName: string;
  temperature: string;
  maxTokens: string;
  content: string;
};
type KnowledgeBaseEditDraft = {
  status: KnowledgeBaseRecord["status"];
  syncStatus: KnowledgeBaseRecord["syncStatus"];
  sourceType: KnowledgeBaseRecord["sourceType"];
  description: string;
};
type ApiProviderEditDraft = {
  status: ApiProviderRecord["status"];
  baseUrl: string;
  tutorialUrl: string;
  modelWhitelist: string;
  apiKey: string;
  defaultModel: string;
  organization: string;
  project: string;
  timeoutMs: string;
  streamEnabled: boolean;
  customHeadersJson: string;
  extraParamsJson: string;
  remark: string;
};
type CreateKnowledgeBaseDraft = {
  name: string;
  slug: string;
  sourceType: KnowledgeBaseRecord["sourceType"];
  description: string;
};
type CreateApiProviderDraft = {
  name: string;
  providerType: ApiProviderRecord["providerType"];
  baseUrl: string;
  tutorialUrl: string;
  modelWhitelist: string;
  apiKey: string;
  defaultModel: string;
  organization: string;
  project: string;
  timeoutMs: string;
  streamEnabled: boolean;
  customHeadersJson: string;
  extraParamsJson: string;
  remark: string;
};
type CreateKnowledgeBaseFileDraft = {
  fileName: string;
  fileType: KnowledgeBaseFileRecord["fileType"];
  sourceName: string;
  chunkCount: string;
};
type SyncRunEditDraft = {
  summary: string;
  errorDetail: string;
};
type SkillCenterLeafConfig = {
  id: string;
  label: string;
  description: string;
  skillSlug?: string;
  promptScene?: string;
};
type SkillCenterSectionConfig = {
  id: string;
  label: string;
  items: SkillCenterLeafConfig[];
};
type SkillCenterPrimaryConfig = {
  id: string;
  label: string;
  sections: SkillCenterSectionConfig[];
};

const tabs: Array<{ key: AdminTab; label: string; description: string; shortLabel: string }> = [
  { key: "dashboard", label: "仪表盘", shortLabel: "总览", description: "统一查看后台运营状态、模块规模和当前数据来源。" },
  { key: "orders", label: "订单管理", shortLabel: "订单", description: "查看会员购买和点数充值订单，支持后台支付与取消。" },
  { key: "rules", label: "会员与积分规则", shortLabel: "规则", description: "维护会员方案、点数包与价格规则。" },
  { key: "users", label: "用户管理", shortLabel: "用户", description: "调整会员等级、增减点数，并查看用户规模与活跃情况。" },
  { key: "usage", label: "模型消耗", shortLabel: "消耗", description: "查看模型任务量、点数成本、估算金额与最近调用时间。" },
  { key: "assets", label: "技能中心", shortLabel: "技能", description: "按业务板块维护技能配置、执行内容和保存策略。" },
  { key: "knowledge", label: "知识库管理", shortLabel: "知识", description: "维护知识库启停状态、数据源类型、同步状态与文档规模。" },
  { key: "providers", label: "接口供应商", shortLabel: "接口", description: "统一维护第三方接口名称、API 地址、教程文档链接、API Key 与模型白名单。" },
];

const ADMIN_ROLE_TAB_MATRIX: Record<AdminSystemRole, AdminTab[]> = {
  SUPER_ADMIN: ["dashboard", "orders", "rules", "users", "usage", "assets", "knowledge", "providers"],
  ADMIN_OPERATOR: ["dashboard", "orders", "users", "usage", "assets", "knowledge", "providers"],
  FINANCE_OPERATOR: ["dashboard", "orders", "rules"],
  SUPPORT_OPERATOR: ["dashboard", "orders", "users", "usage"],
};

const SKILL_CENTER_TREE: SkillCenterPrimaryConfig[] = [
  {
    id: "brand-growth",
    label: "品牌增长策略",
    sections: [
      {
        id: "growth-report",
        label: "品牌增长报告",
        items: [
          {
            id: "growth-report-main",
            label: "品牌增长报告-生成品牌增长报告",
            description: "用于生成品牌全域增长分析报告。",
            skillSlug: "brand-omni-growth-analysis",
            promptScene: "品牌增长报告生成",
          },
          {
            id: "growth-report-visual",
            label: "品牌增长可视化报告-生成可视化报告",
            description: "用于把品牌增长报告转成前端可展示的可视化报告。",
            skillSlug: "article-visual-report-designer",
            promptScene: "HTML 可视化报告生成",
          },
        ],
      },
      {
        id: "annual-plan",
        label: "半年营销规划",
        items: [
          {
            id: "annual-plan-main",
            label: "半年营销规划-生成半年营销规划",
            description: "用于输出未来半年节奏、节点和多平台联动规划。",
            skillSlug: "enterprise-annual-plan",
            promptScene: "半年营销规划生成",
          },
        ],
      },
    ],
  },
  {
    id: "xiaohongshu",
    label: "小红书",
    sections: [
      {
        id: "xhs-planning",
        label: "营销规划",
        items: [
          {
            id: "xhs-plan-main",
            label: "小红书营销规划-生成营销规划",
            description: "用于输出小红书年度种草策略、内容支柱与排期建议。",
            skillSlug: "xiaohongshu-brand-marketing-plan",
            promptScene: "小红书营销规划",
          },
          {
            id: "xhs-calendar-main",
            label: "营销日历-生成7天营销日历",
            description: "对应前台营销日历工作区，基于营销策划方案、半年规划、热点与历史记录生成未来 7 天日历。",
            skillSlug: "xiaohongshu-marketing-calendar",
            promptScene: "小红书营销日历生成",
          },
        ],
      },
      {
        id: "xhs-content",
        label: "内容生产",
        items: [
          {
            id: "xhs-original-copy",
            label: "原创笔记-原创文案",
            description: "对应前台原创笔记工作台，生成可直接发布的标题、正文与标签。",
            skillSlug: "original_copy",
            promptScene: "小红书原创笔记文案",
          },
          {
            id: "xhs-original-image",
            label: "原创笔记-原创配图",
            description: "对应前台原创笔记工作台，生成封面提示词与多张配图提示词。",
            skillSlug: "xhs-original-image-prompt",
            promptScene: "小红书原创笔记配图",
          },
          {
            id: "xhs-rewrite-copy",
            label: "二创笔记-二创文案",
            description: "对应前台二创笔记工作台，生成二创标题、正文与标签。",
            skillSlug: "rewrite_copy",
            promptScene: "小红书二创笔记文案",
          },
          {
            id: "xhs-rewrite-note",
            label: "二创笔记-二创配图",
            description: "对应前台二创笔记工作台，生成参考图拆解后的二创配图提示词。",
            skillSlug: "rewrite_image",
            promptScene: "小红书二创笔记配图",
          },
          {
            id: "xhs-video-note",
            label: "视频笔记-视频创作",
            description: "对应前台视频笔记工作台，生成视频笔记文案、视频提示词与视频工作流配置。",
            skillSlug: "short-video-api-studio",
            promptScene: "小红书视频笔记",
          },
        ],
      },
    ],
  },
  {
    id: "douyin",
    label: "抖音",
    sections: [
      {
        id: "douyin-placeholder-section",
        label: "抖音技能",
        items: [
          {
            id: "douyin-placeholder",
            label: "抖音技能-待接入",
            description: "当前项目前台尚未接入抖音工作台，这里先预留一级/二级/三级分类结构。",
          },
        ],
      },
    ],
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [activeSkillPrimaryId, setActiveSkillPrimaryId] = useState(SKILL_CENTER_TREE[0]?.id || "");
  const [activeSkillSectionId, setActiveSkillSectionId] = useState(SKILL_CENTER_TREE[0]?.sections[0]?.id || "");
  const [activeSkillLeafId, setActiveSkillLeafId] = useState(SKILL_CENTER_TREE[0]?.sections[0]?.items[0]?.id || "");
  const [expandedSkillPrimaryId, setExpandedSkillPrimaryId] = useState(SKILL_CENTER_TREE[0]?.id || "");
  const [orders, setOrders] = useState<OrderRecord[]>(adminOrderSeed);
  const [rules, setRules] = useState<BillingRules>(billingRulesSeed);
  const [users, setUsers] = useState<AdminUserRecord[]>(adminUserSeed);
  const [usage, setUsage] = useState<ModelUsageRecord[]>(modelUsageSeed);
  const [skills, setSkills] = useState<SkillConfigRecord[]>(skillConfigSeed);
  const [prompts, setPrompts] = useState<PromptTemplateRecord[]>(promptTemplateSeed);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>(knowledgeBaseSeed);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFileRecord[]>(knowledgeBaseFileSeed);
  const [knowledgeBaseSyncRuns, setKnowledgeBaseSyncRuns] = useState<KnowledgeBaseSyncRunRecord[]>(knowledgeBaseSyncRunSeed);
  const [knowledgeBaseSyncRunDrafts, setKnowledgeBaseSyncRunDrafts] = useState<Record<string, SyncRunEditDraft>>(
    buildSyncRunDrafts(knowledgeBaseSyncRunSeed),
  );
  const [providers, setProviders] = useState<ApiProviderRecord[]>(apiProviderSeed);
  const [skillDrafts, setSkillDrafts] = useState<Record<string, SkillEditDraft>>(buildSkillDrafts(skillConfigSeed));
  const [promptDrafts, setPromptDrafts] = useState<Record<string, PromptEditDraft>>(buildPromptDrafts(promptTemplateSeed));
  const [knowledgeBaseDrafts, setKnowledgeBaseDrafts] = useState<Record<string, KnowledgeBaseEditDraft>>(
    buildKnowledgeBaseDrafts(knowledgeBaseSeed),
  );
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ApiProviderEditDraft>>(buildProviderDrafts(apiProviderSeed));
  const [newKnowledgeBase, setNewKnowledgeBase] = useState<CreateKnowledgeBaseDraft>(buildCreateKnowledgeBaseDraft());
  const [newKnowledgeBaseFileDrafts, setNewKnowledgeBaseFileDrafts] = useState<Record<string, CreateKnowledgeBaseFileDraft>>(
    buildKnowledgeBaseFileCreateDrafts(knowledgeBaseSeed),
  );
  const [newProvider, setNewProvider] = useState<CreateApiProviderDraft>(buildCreateApiProviderDraft());
  const [providerSearch, setProviderSearch] = useState("");
  const [providerStatusFilter, setProviderStatusFilter] = useState<ApiProviderRecord["status"] | "ALL">("ALL");
  const [providerTypeFilter, setProviderTypeFilter] = useState<ApiProviderRecord["providerType"] | "ALL">("ALL");
  const [createProviderSecretVisible, setCreateProviderSecretVisible] = useState(false);
  const [revealedProviderKeys, setRevealedProviderKeys] = useState<Record<string, boolean>>({});
  const [dataSource, setDataSource] = useState<"api" | "seed">("api");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [updatingSkillId, setUpdatingSkillId] = useState("");
  const [updatingPromptId, setUpdatingPromptId] = useState("");
  const [updatingKnowledgeBaseId, setUpdatingKnowledgeBaseId] = useState("");
  const [updatingKnowledgeBaseFileId, setUpdatingKnowledgeBaseFileId] = useState("");
  const [updatingKnowledgeBaseSyncRunId, setUpdatingKnowledgeBaseSyncRunId] = useState("");
  const [updatingProviderId, setUpdatingProviderId] = useState("");
  const [isCreatingKnowledgeBase, setIsCreatingKnowledgeBase] = useState(false);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminSystemRole, setAdminSystemRole] = useState<AdminSystemRole | "">("");

  useEffect(() => {
    void verifyAdminAccess();
  }, []);

  async function verifyAdminAccess() {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace("/admin/login?next=/admin");
      return;
    }

    try {
      const result = await getMe();
      const role = result.user.systemRole as AdminSystemRole;
      if (!ADMIN_ROLE_TAB_MATRIX[role]) {
        setErrorMessage("当前账号不是后台管理员，请使用后台角色账号登录。");
        setIsCheckingAccess(false);
        return;
      }
      setAdminSystemRole(role);
      setAdminName(result.user.nickname || result.user.mobile);
      await loadAdminData(role);
    } catch {
      await logoutSession();
      router.replace("/admin/login?next=/admin");
    }
  }

  async function loadAdminData(role: AdminSystemRole = adminSystemRole as AdminSystemRole) {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const allowedTabs = ADMIN_ROLE_TAB_MATRIX[role] ?? [];
    const canReadOrders = allowedTabs.includes("orders");
    const canReadRules = allowedTabs.includes("rules");
    const canReadUsers = allowedTabs.includes("users");
    const canReadUsage = allowedTabs.includes("usage");
    const canReadAssets = allowedTabs.includes("assets");
    const canReadKnowledge = allowedTabs.includes("knowledge");
    const canReadProviders = allowedTabs.includes("providers");

    const [
      orderResult,
      rulesResult,
      userResult,
      usageResult,
      skillResult,
      promptResult,
      knowledgeBaseResult,
      knowledgeBaseFilesResult,
      knowledgeBaseSyncRunsResult,
      providerResult,
    ] =
      await Promise.allSettled([
      canReadOrders ? getAdminOrders() : Promise.resolve([]),
      canReadRules ? getBillingRules() : Promise.resolve({ membershipPlans: [], pointsPackages: [] }),
      canReadUsers ? getAdminUsers() : Promise.resolve([]),
      canReadUsage ? getModelUsage() : Promise.resolve([]),
      canReadAssets ? getSkillConfigs() : Promise.resolve([]),
      canReadAssets ? getPromptTemplates() : Promise.resolve([]),
      canReadKnowledge ? getKnowledgeBases() : Promise.resolve([]),
      canReadKnowledge ? getKnowledgeBaseFiles() : Promise.resolve([]),
      canReadKnowledge ? getKnowledgeBaseSyncRuns() : Promise.resolve([]),
      canReadProviders ? getApiProviders() : Promise.resolve([]),
    ]);
    let usingSeed = false;

    if (orderResult.status === "fulfilled") {
      setOrders(orderResult.value);
    } else {
      setOrders(adminOrderSeed);
      usingSeed = true;
    }

    if (rulesResult.status === "fulfilled") {
      setRules(rulesResult.value);
    } else {
      setRules(billingRulesSeed);
      usingSeed = true;
    }

    if (userResult.status === "fulfilled") {
      setUsers(userResult.value);
    } else {
      setUsers(adminUserSeed);
      usingSeed = true;
    }

    if (usageResult.status === "fulfilled") {
      setUsage(usageResult.value);
    } else {
      setUsage(modelUsageSeed);
      usingSeed = true;
    }

    if (skillResult.status === "fulfilled") {
      setSkills(skillResult.value);
      setSkillDrafts(buildSkillDrafts(skillResult.value));
    } else {
      setSkills(skillConfigSeed);
      setSkillDrafts(buildSkillDrafts(skillConfigSeed));
      usingSeed = true;
    }

    if (promptResult.status === "fulfilled") {
      setPrompts(promptResult.value);
      setPromptDrafts(buildPromptDrafts(promptResult.value));
    } else {
      setPrompts(promptTemplateSeed);
      setPromptDrafts(buildPromptDrafts(promptTemplateSeed));
      usingSeed = true;
    }

    if (knowledgeBaseResult.status === "fulfilled") {
      setKnowledgeBases(knowledgeBaseResult.value);
      setKnowledgeBaseDrafts(buildKnowledgeBaseDrafts(knowledgeBaseResult.value));
      setNewKnowledgeBaseFileDrafts(buildKnowledgeBaseFileCreateDrafts(knowledgeBaseResult.value));
    } else {
      setKnowledgeBases(knowledgeBaseSeed);
      setKnowledgeBaseDrafts(buildKnowledgeBaseDrafts(knowledgeBaseSeed));
      setNewKnowledgeBaseFileDrafts(buildKnowledgeBaseFileCreateDrafts(knowledgeBaseSeed));
      usingSeed = true;
    }

    if (knowledgeBaseFilesResult.status === "fulfilled") {
      setKnowledgeBaseFiles(knowledgeBaseFilesResult.value);
    } else {
      setKnowledgeBaseFiles(knowledgeBaseFileSeed);
      usingSeed = true;
    }

    if (knowledgeBaseSyncRunsResult.status === "fulfilled") {
      setKnowledgeBaseSyncRuns(knowledgeBaseSyncRunsResult.value);
      setKnowledgeBaseSyncRunDrafts(buildSyncRunDrafts(knowledgeBaseSyncRunsResult.value));
    } else {
      setKnowledgeBaseSyncRuns(knowledgeBaseSyncRunSeed);
      setKnowledgeBaseSyncRunDrafts(buildSyncRunDrafts(knowledgeBaseSyncRunSeed));
      usingSeed = true;
    }

    if (providerResult.status === "fulfilled") {
      setProviders(providerResult.value);
      setProviderDrafts(buildProviderDrafts(providerResult.value));
    } else {
      setProviders(apiProviderSeed);
      setProviderDrafts(buildProviderDrafts(apiProviderSeed));
      usingSeed = true;
    }

    if (usingSeed) {
      setDataSource("seed");
      setErrorMessage("部分后台接口暂不可用，当前已回退到本地演示数据。");
    } else {
      setDataSource("api");
    }

    setIsLoading(false);
    setIsCheckingAccess(false);
  }

  async function handleOrderAction(orderId: string, action: "pay" | "cancel") {
    setNotice("");
    setErrorMessage("");

    try {
      const updated = action === "pay" ? await payOrder(orderId) : await cancelOrder(orderId);
      setOrders((current) =>
        current.map((item) => (item.id === orderId ? { ...item, ...updated } : item)),
      );
      setNotice(action === "pay" ? `订单已支付：${updated.orderNo}` : `订单已取消：${updated.orderNo}`);
    } catch (error) {
      if (dataSource === "seed") {
        setOrders((current) =>
          current.map((item) => {
            if (item.id !== orderId || item.orderStatus !== "PENDING") {
              return item;
            }

            const now = new Date().toISOString();
            return {
              ...item,
              orderStatus: action === "pay" ? "PAID" : "CANCELLED",
              paidAt: action === "pay" ? now : item.paidAt,
              updatedAt: now,
            };
          }),
        );
        setNotice(action === "pay" ? "已更新演示订单为已支付状态。" : "已更新演示订单为已取消状态。");
        return;
      }

      const message = error instanceof Error ? error.message : "订单操作失败";
      setErrorMessage(`订单操作失败：${message}`);
    }
  }

  async function handleSaveRules() {
    setIsSavingRules(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextRules = await updateBillingRules(rules);
      setRules(nextRules);
      setNotice("会员与积分规则已保存。");
    } catch (error) {
      if (dataSource === "seed") {
        setNotice("后台接口暂不可用，当前已保存为本地演示规则。");
        return;
      }

      const message = error instanceof Error ? error.message : "规则保存失败";
      setErrorMessage(`规则保存失败：${message}`);
    } finally {
      setIsSavingRules(false);
    }
  }

  async function handleSaveSkill(skillId: string) {
    const draft = skillDrafts[skillId];
    if (!draft) {
      return;
    }

    setUpdatingSkillId(skillId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateSkillConfig(skillId, {
        status: draft.status,
        defaultModel: draft.defaultModel,
        pointsCost: Number(draft.pointsCost || 0),
        description: draft.description,
      });

      setSkills((current) => current.map((item) => (item.id === skillId ? updated : item)));
      setSkillDrafts((current) => ({
        ...current,
        [skillId]: buildSkillDraft(updated),
      }));
      setNotice(`技能配置已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setSkills((current) =>
          current.map((item) =>
            item.id === skillId
              ? {
                  ...item,
                  status: draft.status,
                  defaultModel: draft.defaultModel,
                  pointsCost: Number(draft.pointsCost || 0),
                  description: draft.description,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("技能配置已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "技能配置保存失败";
      setErrorMessage(`技能配置保存失败：${message}`);
    } finally {
      setUpdatingSkillId("");
    }
  }

  async function handleSavePrompt(promptId: string) {
    const draft = promptDrafts[promptId];
    if (!draft) {
      return;
    }

    setUpdatingPromptId(promptId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updatePromptTemplate(promptId, {
        status: draft.status,
        modelName: draft.modelName,
        temperature: Number(draft.temperature || 0),
        maxTokens: Number(draft.maxTokens || 0),
        content: draft.content,
      });

      setPrompts((current) => current.map((item) => (item.id === promptId ? updated : item)));
      setPromptDrafts((current) => ({
        ...current,
        [promptId]: buildPromptDraft(updated),
      }));
      setNotice(`提示词模板已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setPrompts((current) =>
          current.map((item) =>
            item.id === promptId
              ? {
                  ...item,
                  status: draft.status,
                  modelName: draft.modelName,
                  temperature: Number(draft.temperature || 0),
                  maxTokens: Number(draft.maxTokens || 0),
                  content: draft.content,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("提示词模板已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "提示词模板保存失败";
      setErrorMessage(`提示词模板保存失败：${message}`);
    } finally {
      setUpdatingPromptId("");
    }
  }

  function handleSkillDraftChange(skillId: string, patch: Partial<SkillEditDraft>) {
    setSkillDrafts((current) => ({
      ...current,
      [skillId]: {
        ...(current[skillId] || buildSkillDraft(skillConfigSeed[0])),
        ...patch,
      },
    }));
  }

  function handlePromptDraftChange(promptId: string, patch: Partial<PromptEditDraft>) {
    setPromptDrafts((current) => ({
      ...current,
      [promptId]: {
        ...(current[promptId] || buildPromptDraft(promptTemplateSeed[0])),
        ...patch,
      },
    }));
  }

  function handleSkillCenterStatusChange(status: SkillConfigRecord["status"]) {
    if (activeSkillConfig) {
      handleSkillDraftChange(activeSkillConfig.id, { status });
    }
    if (activePromptConfig) {
      handlePromptDraftChange(activePromptConfig.id, { status });
    }
  }

  function handleSkillCenterModelChange(modelName: string) {
    if (activeSkillConfig) {
      handleSkillDraftChange(activeSkillConfig.id, { defaultModel: modelName });
    }
    if (activePromptConfig) {
      handlePromptDraftChange(activePromptConfig.id, { modelName });
    }
  }

  function handleSkillCenterPointsCostChange(pointsCost: string) {
    if (activeSkillConfig) {
      handleSkillDraftChange(activeSkillConfig.id, { pointsCost });
    }
  }

  function handleSkillCenterPromptChange(value: string) {
    if (activePromptConfig) {
      handlePromptDraftChange(activePromptConfig.id, { content: value });
      return;
    }
    if (activeSkillConfig) {
      handleSkillDraftChange(activeSkillConfig.id, { description: value });
    }
  }

  async function handleSaveSkillCenter() {
    if (activeSkillConfig) {
      await handleSaveSkill(activeSkillConfig.id);
    }
    if (activePromptConfig) {
      await handleSavePrompt(activePromptConfig.id);
    }
  }

  async function handleSaveKnowledgeBase(knowledgeBaseId: string) {
    const draft = knowledgeBaseDrafts[knowledgeBaseId];
    if (!draft) {
      return;
    }

    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateKnowledgeBase(knowledgeBaseId, {
        status: draft.status,
        syncStatus: draft.syncStatus,
        sourceType: draft.sourceType,
        description: draft.description,
      });

      setKnowledgeBases((current) => current.map((item) => (item.id === knowledgeBaseId ? updated : item)));
      setKnowledgeBaseDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildKnowledgeBaseDraft(updated),
      }));
      setNotice(`知识库已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setKnowledgeBases((current) =>
          current.map((item) =>
            item.id === knowledgeBaseId
              ? {
                  ...item,
                  status: draft.status,
                  syncStatus: draft.syncStatus,
                  sourceType: draft.sourceType,
                  description: draft.description,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("知识库配置已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库保存失败";
      setErrorMessage(`知识库保存失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  function handleKnowledgeBaseDraftChange(knowledgeBaseId: string, patch: Partial<KnowledgeBaseEditDraft>) {
    setKnowledgeBaseDrafts((current) => ({
      ...current,
      [knowledgeBaseId]: {
        ...(current[knowledgeBaseId] || buildKnowledgeBaseDraft(knowledgeBaseSeed[0])),
        ...patch,
      },
    }));
  }

  function handleKnowledgeBaseFileDraftChange(knowledgeBaseId: string, patch: Partial<CreateKnowledgeBaseFileDraft>) {
    setNewKnowledgeBaseFileDrafts((current) => ({
      ...current,
      [knowledgeBaseId]: {
        ...(current[knowledgeBaseId] || buildCreateKnowledgeBaseFileDraft()),
        ...patch,
      },
    }));
  }

  function handleSyncRunDraftChange(runId: string, patch: Partial<SyncRunEditDraft>) {
    setKnowledgeBaseSyncRunDrafts((current) => ({
      ...current,
      [runId]: {
        ...(current[runId] || buildSyncRunDraft()),
        ...patch,
      },
    }));
  }

  async function handleArchiveKnowledgeBase(knowledgeBaseId: string) {
    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await archiveKnowledgeBase(knowledgeBaseId);
      setKnowledgeBases((current) => current.map((item) => (item.id === knowledgeBaseId ? updated : item)));
      setKnowledgeBaseDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildKnowledgeBaseDraft(updated),
      }));
      setNotice(`知识库已归档：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setKnowledgeBases((current) =>
          current.map((item) =>
            item.id === knowledgeBaseId
              ? {
                  ...item,
                  status: "DISABLED",
                  updatedAt,
                }
              : item,
          ),
        );
        setKnowledgeBaseDrafts((current) => ({
          ...current,
          [knowledgeBaseId]: {
            ...(current[knowledgeBaseId] || buildKnowledgeBaseDraft(knowledgeBaseSeed[0])),
            status: "DISABLED",
          },
        }));
        setNotice("知识库已归档到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库归档失败";
      setErrorMessage(`知识库归档失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  async function handleDeleteKnowledgeBase(knowledgeBaseId: string) {
    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const removed = await deleteKnowledgeBase(knowledgeBaseId);
      setKnowledgeBases((current) => current.filter((item) => item.id !== knowledgeBaseId));
      setKnowledgeBaseFiles((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
      setKnowledgeBaseDrafts((current) => {
        const next = { ...current };
        delete next[knowledgeBaseId];
        return next;
      });
      setNewKnowledgeBaseFileDrafts((current) => {
        const next = { ...current };
        delete next[knowledgeBaseId];
        return next;
      });
      setNotice(`知识库已删除：${removed.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        setKnowledgeBases((current) => current.filter((item) => item.id !== knowledgeBaseId));
        setKnowledgeBaseFiles((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
        setKnowledgeBaseDrafts((current) => {
          const next = { ...current };
          delete next[knowledgeBaseId];
          return next;
        });
        setNewKnowledgeBaseFileDrafts((current) => {
          const next = { ...current };
          delete next[knowledgeBaseId];
          return next;
        });
        setNotice(`知识库已从本地演示数据删除：${removed?.name || knowledgeBaseId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "知识库删除失败";
      setErrorMessage(`知识库删除失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  async function handleCreateKnowledgeBase() {
    setIsCreatingKnowledgeBase(true);
    setNotice("");
    setErrorMessage("");

    try {
      const created = await createKnowledgeBase({
        name: newKnowledgeBase.name,
        slug: newKnowledgeBase.slug,
        sourceType: newKnowledgeBase.sourceType,
        description: newKnowledgeBase.description,
      });

      setKnowledgeBases((current) => [created, ...current]);
      setKnowledgeBaseDrafts((current) => ({
        [created.id]: buildKnowledgeBaseDraft(created),
        ...current,
      }));
      setNewKnowledgeBaseFileDrafts((current) => ({
        [created.id]: buildCreateKnowledgeBaseFileDraft(),
        ...current,
      }));
      setNewKnowledgeBase(buildCreateKnowledgeBaseDraft());
      setNotice(`知识库已创建：${created.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const createdAt = new Date().toISOString();
        const created: KnowledgeBaseRecord = {
          id: `kb_local_${Date.now()}`,
          name: newKnowledgeBase.name,
          slug: newKnowledgeBase.slug,
          sourceType: newKnowledgeBase.sourceType,
          status: "DRAFT",
          syncStatus: "IDLE",
          documentCount: 0,
          chunkCount: 0,
          description: newKnowledgeBase.description,
          updatedAt: createdAt,
        };
        setKnowledgeBases((current) => [created, ...current]);
        setKnowledgeBaseDrafts((current) => ({
          [created.id]: buildKnowledgeBaseDraft(created),
          ...current,
        }));
        setNewKnowledgeBaseFileDrafts((current) => ({
          [created.id]: buildCreateKnowledgeBaseFileDraft(),
          ...current,
        }));
        setNewKnowledgeBase(buildCreateKnowledgeBaseDraft());
        setNotice("知识库已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库创建失败";
      setErrorMessage(`知识库创建失败：${message}`);
    } finally {
      setIsCreatingKnowledgeBase(false);
    }
  }

  async function handleCreateKnowledgeBaseFile(knowledgeBaseId: string) {
    const draft = newKnowledgeBaseFileDrafts[knowledgeBaseId];
    if (!draft || !draft.fileName.trim()) {
      return;
    }

    setUpdatingKnowledgeBaseFileId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    const chunkCount = Number(draft.chunkCount || 0);

    try {
      const result = await createKnowledgeBaseFile(knowledgeBaseId, {
        fileName: draft.fileName,
        fileType: draft.fileType,
        sourceName: draft.sourceName,
        chunkCount,
      });
      applyKnowledgeBaseFileMutation(result, "create");
      setNewKnowledgeBaseFileDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildCreateKnowledgeBaseFileDraft(),
      }));
      setNotice(`知识库文件已新增：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const now = new Date().toISOString();
        const file: KnowledgeBaseFileRecord = {
          id: `kbf_local_${Date.now()}`,
          knowledgeBaseId,
          fileName: draft.fileName,
          fileType: draft.fileType,
          sourceName: draft.sourceName || "后台手动录入",
          chunkCount,
          status: chunkCount > 0 ? "INDEXED" : "PENDING",
          uploadedAt: now,
        };
        const knowledgeBase = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        if (knowledgeBase) {
          applyKnowledgeBaseFileMutation(
            {
              file,
              knowledgeBase: {
                ...knowledgeBase,
                documentCount: knowledgeBase.documentCount + 1,
                chunkCount: knowledgeBase.chunkCount + chunkCount,
                updatedAt: now,
              },
            },
            "create",
          );
        }
        setNewKnowledgeBaseFileDrafts((current) => ({
          ...current,
          [knowledgeBaseId]: buildCreateKnowledgeBaseFileDraft(),
        }));
        setNotice("知识库文件已新增到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件新增失败";
      setErrorMessage(`知识库文件新增失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleDeleteKnowledgeBaseFile(fileId: string) {
    setUpdatingKnowledgeBaseFileId(fileId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await deleteKnowledgeBaseFile(fileId);
      applyKnowledgeBaseFileMutation(result, "delete");
      setKnowledgeBaseSyncRuns((current) => current.filter((item) => item.fileId !== fileId));
      setNotice(`知识库文件已删除：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const file = knowledgeBaseFiles.find((item) => item.id === fileId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === file?.knowledgeBaseId);
        if (file && knowledgeBase) {
          applyKnowledgeBaseFileMutation(
            {
              file,
              knowledgeBase: {
                ...knowledgeBase,
                documentCount: Math.max(0, knowledgeBase.documentCount - 1),
                chunkCount: Math.max(0, knowledgeBase.chunkCount - file.chunkCount),
                updatedAt: new Date().toISOString(),
              },
            },
            "delete",
          );
        }
        setKnowledgeBaseSyncRuns((current) => current.filter((item) => item.fileId !== fileId));
        setNotice(`知识库文件已从本地演示数据删除：${file?.fileName || fileId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件删除失败";
      setErrorMessage(`知识库文件删除失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleUpdateKnowledgeBaseFileStatus(
    fileId: string,
    status: KnowledgeBaseFileRecord["status"],
  ) {
    setUpdatingKnowledgeBaseFileId(fileId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await updateKnowledgeBaseFile(fileId, { status });
      applyKnowledgeBaseFileMutation(result, "update");
      setNotice(`知识库文件状态已更新：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const file = knowledgeBaseFiles.find((item) => item.id === fileId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === file?.knowledgeBaseId);
        if (file && knowledgeBase) {
          const nextFile = { ...file, status };
          const relatedFiles = knowledgeBaseFiles
            .filter((item) => item.knowledgeBaseId === file.knowledgeBaseId)
            .map((item) => (item.id === fileId ? nextFile : item));
          applyKnowledgeBaseFileMutation(
            {
              file: nextFile,
              knowledgeBase: buildKnowledgeBaseSummary(knowledgeBase, relatedFiles),
            },
            "update",
          );
        }
        setNotice("知识库文件状态已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件状态更新失败";
      setErrorMessage(`知识库文件状态更新失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleSyncKnowledgeBaseFile(fileId: string) {
    setUpdatingKnowledgeBaseFileId(fileId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await syncKnowledgeBaseFile(fileId);
      applyKnowledgeBaseFileMutation(result, "update");
      applyKnowledgeBaseSyncRun(result);
      setNotice(`知识库文件同步任务已创建：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const file = knowledgeBaseFiles.find((item) => item.id === fileId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === file?.knowledgeBaseId);
        if (file && knowledgeBase) {
          const nextFile = { ...file, status: "PENDING" as const };
          const relatedFiles = knowledgeBaseFiles
            .filter((item) => item.knowledgeBaseId === file.knowledgeBaseId)
            .map((item) => (item.id === fileId ? nextFile : item));
          const startedAt = new Date().toISOString();
          const result: KnowledgeBaseSyncMutationResult = {
            file: nextFile,
            knowledgeBase: {
              ...buildKnowledgeBaseSummary(knowledgeBase, relatedFiles, startedAt),
              syncStatus: "SYNCING",
            },
            run: {
              id: `kbsr_local_${Date.now()}`,
              knowledgeBaseId: knowledgeBase.id,
              scope: "FILE",
              operator: "后台管理员",
              fileId: nextFile.id,
              fileName: nextFile.fileName,
              result: "RUNNING",
              summary: "文件同步任务已创建，等待索引完成。",
              startedAt,
            },
          };
          applyKnowledgeBaseFileMutation(result, "update");
          applyKnowledgeBaseSyncRun(result);
        }
        setNotice("知识库文件同步任务已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件同步失败";
      setErrorMessage(`知识库文件同步失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleStartKnowledgeBaseSync(knowledgeBaseId: string) {
    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await startKnowledgeBaseSync(knowledgeBaseId);
      applyKnowledgeBaseRunMutation(result);
      setNotice(`知识库全量同步任务已创建：${result.knowledgeBase.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const knowledgeBase = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        if (knowledgeBase) {
          const startedAt = new Date().toISOString();
          applyKnowledgeBaseRunMutation({
            knowledgeBase: {
              ...knowledgeBase,
              syncStatus: "SYNCING",
              updatedAt: startedAt,
            },
            run: {
              id: `kbsr_local_full_${Date.now()}`,
              knowledgeBaseId,
              scope: "FULL",
              operator: "后台管理员",
              result: "RUNNING",
              summary: "全量同步任务已创建，正在扫描知识库文件。",
              startedAt,
            },
          });
        }
        setNotice("知识库全量同步任务已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库全量同步创建失败";
      setErrorMessage(`知识库全量同步创建失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  async function handleCompleteKnowledgeBaseSyncRun(runId: string, result: "SUCCESS" | "FAILED") {
    const draft = knowledgeBaseSyncRunDrafts[runId] || buildSyncRunDraft();
    setUpdatingKnowledgeBaseSyncRunId(runId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await completeKnowledgeBaseSyncRun(runId, {
        result,
        summary: draft.summary,
        errorDetail: result === "FAILED" ? draft.errorDetail : undefined,
      });
      if (!updated.file && updated.run.scope === "FULL" && result === "SUCCESS") {
        setKnowledgeBaseFiles((current) =>
          current.map((item) =>
            item.knowledgeBaseId === updated.knowledgeBase.id && item.status !== "FAILED"
              ? {
                  ...item,
                  status: "INDEXED",
                }
              : item,
          ),
        );
      }
      applyKnowledgeBaseRunMutation(updated);
      setNotice(`同步记录已更新为 ${result}。`);
    } catch (error) {
      if (dataSource === "seed") {
        const currentRun = knowledgeBaseSyncRuns.find((item) => item.id === runId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === currentRun?.knowledgeBaseId);
        if (currentRun && knowledgeBase) {
          const completedAt = new Date().toISOString();
          const updatedRun: KnowledgeBaseSyncRunRecord = {
            ...currentRun,
            result,
            summary: draft.summary || (result === "SUCCESS" ? "同步任务执行成功。" : "同步任务执行失败，请查看失败原因。"),
            errorDetail: result === "FAILED" ? draft.errorDetail || "未提供失败原因。" : undefined,
            completedAt,
          };

          let updatedFile = currentRun.fileId
            ? knowledgeBaseFiles.find((item) => item.id === currentRun.fileId)
            : undefined;
          if (updatedFile) {
            updatedFile = {
              ...updatedFile,
              status: result === "SUCCESS" ? "INDEXED" : "FAILED",
            };
          }

          const relatedFiles = knowledgeBaseFiles
            .filter((item) => item.knowledgeBaseId === knowledgeBase.id)
            .map((item) =>
              updatedFile && item.id === updatedFile.id
                ? updatedFile
                : currentRun.scope === "FULL" && result === "SUCCESS" && item.status !== "FAILED"
                  ? { ...item, status: "INDEXED" as const }
                  : item,
            );

          applyKnowledgeBaseRunMutation({
            knowledgeBase: buildKnowledgeBaseSummary(knowledgeBase, relatedFiles, completedAt),
            run: updatedRun,
            file: updatedFile,
          });
        }
        setNotice(`同步记录已更新到本地演示数据：${result}`);
        return;
      }

      const message = error instanceof Error ? error.message : "同步记录更新失败";
      setErrorMessage(`同步记录更新失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseSyncRunId("");
    }
  }

  function applyKnowledgeBaseFileMutation(result: KnowledgeBaseFileMutationResult, mode: "create" | "delete" | "update") {
    setKnowledgeBases((current) => current.map((item) => (item.id === result.knowledgeBase.id ? result.knowledgeBase : item)));
    setKnowledgeBaseDrafts((current) => ({
      ...current,
      [result.knowledgeBase.id]: buildKnowledgeBaseDraft(result.knowledgeBase),
    }));
    if (mode === "create") {
      setKnowledgeBaseFiles((current) => [result.file, ...current]);
    } else if (mode === "update") {
      setKnowledgeBaseFiles((current) => current.map((item) => (item.id === result.file.id ? result.file : item)));
    } else {
      setKnowledgeBaseFiles((current) => current.filter((item) => item.id !== result.file.id));
    }
  }

  function applyKnowledgeBaseSyncRun(result: KnowledgeBaseSyncMutationResult) {
    setKnowledgeBaseSyncRuns((current) => [result.run, ...current]);
    setKnowledgeBaseSyncRunDrafts((current) => ({
      ...current,
      [result.run.id]: buildSyncRunDraft(result.run),
    }));
  }

  function applyKnowledgeBaseRunMutation(result: KnowledgeBaseRunMutationResult) {
    setKnowledgeBases((current) => current.map((item) => (item.id === result.knowledgeBase.id ? result.knowledgeBase : item)));
    setKnowledgeBaseDrafts((current) => ({
      ...current,
      [result.knowledgeBase.id]: buildKnowledgeBaseDraft(result.knowledgeBase),
    }));
    if (result.file) {
      setKnowledgeBaseFiles((current) => current.map((item) => (item.id === result.file?.id ? result.file : item)));
    }
    setKnowledgeBaseSyncRuns((current) => {
      const exists = current.some((item) => item.id === result.run.id);
      return exists ? current.map((item) => (item.id === result.run.id ? result.run : item)) : [result.run, ...current];
    });
    setKnowledgeBaseSyncRunDrafts((current) => ({
      ...current,
      [result.run.id]: buildSyncRunDraft(result.run),
    }));
  }

  async function handleSaveProvider(providerId: string) {
    const draft = providerDrafts[providerId];
    if (!draft) {
      return;
    }

    setUpdatingProviderId(providerId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateApiProvider(providerId, {
        status: draft.status,
        baseUrl: draft.baseUrl,
        tutorialUrl: draft.tutorialUrl,
        ...buildApiProviderPayload(draft),
      });

      setProviders((current) => current.map((item) => (item.id === providerId ? updated : item)));
      setProviderDrafts((current) => ({
        ...current,
        [providerId]: buildProviderDraft(updated),
      }));
      setNotice(`API Provider 已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        const providerPayload = buildApiProviderPayload(draft);
        setProviders((current) =>
          current.map((item) =>
            item.id === providerId
              ? {
                  ...item,
                  status: draft.status,
                  baseUrl: draft.baseUrl,
                  tutorialUrl: draft.tutorialUrl,
                  ...providerPayload,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("API Provider 配置已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 保存失败";
      setErrorMessage(`API Provider 保存失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  function handleProviderDraftChange(providerId: string, patch: Partial<ApiProviderEditDraft>) {
    setProviderDrafts((current) => ({
      ...current,
      [providerId]: {
        ...(current[providerId] || buildProviderDraft(apiProviderSeed[0])),
        ...patch,
      },
    }));
  }

  async function handleArchiveProvider(providerId: string) {
    setUpdatingProviderId(providerId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await archiveApiProvider(providerId);
      setProviders((current) => current.map((item) => (item.id === providerId ? updated : item)));
      setProviderDrafts((current) => ({
        ...current,
        [providerId]: buildProviderDraft(updated),
      }));
      setNotice(`API Provider 已归档：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setProviders((current) =>
          current.map((item) =>
            item.id === providerId
              ? {
                  ...item,
                  status: "DISABLED",
                  updatedAt,
                }
              : item,
          ),
        );
        setProviderDrafts((current) => ({
          ...current,
          [providerId]: {
            ...(current[providerId] || buildProviderDraft(apiProviderSeed[0])),
            status: "DISABLED",
          },
        }));
        setNotice("API Provider 已归档到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 归档失败";
      setErrorMessage(`API Provider 归档失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  async function handleDeleteProvider(providerId: string) {
    setUpdatingProviderId(providerId);
    setNotice("");
    setErrorMessage("");

    try {
      const removed = await deleteApiProvider(providerId);
      setProviders((current) => current.filter((item) => item.id !== providerId));
      setProviderDrafts((current) => {
        const next = { ...current };
        delete next[providerId];
        return next;
      });
      setNotice(`API Provider 已删除：${removed.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = providers.find((item) => item.id === providerId);
        setProviders((current) => current.filter((item) => item.id !== providerId));
        setProviderDrafts((current) => {
          const next = { ...current };
          delete next[providerId];
          return next;
        });
        setNotice(`API Provider 已从本地演示数据删除：${removed?.name || providerId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 删除失败";
      setErrorMessage(`API Provider 删除失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  async function handleCreateProvider() {
    setIsCreatingProvider(true);
    setNotice("");
    setErrorMessage("");

    try {
      const created = await createApiProvider({
        name: newProvider.name,
        providerType: newProvider.providerType,
        baseUrl: newProvider.baseUrl,
        tutorialUrl: newProvider.tutorialUrl,
        ...buildApiProviderPayload(newProvider),
      });

      setProviders((current) => [created, ...current]);
      setProviderDrafts((current) => ({
        [created.id]: buildProviderDraft(created),
        ...current,
      }));
      setNewProvider(buildCreateApiProviderDraft());
      setNotice(`API Provider 已创建：${created.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const createdAt = new Date().toISOString();
        const providerPayload = buildApiProviderPayload(newProvider);
        const created: ApiProviderRecord = {
          id: `provider_local_${Date.now()}`,
          name: newProvider.name,
          providerType: newProvider.providerType,
          status: "DRAFT",
          baseUrl: newProvider.baseUrl,
          tutorialUrl: newProvider.tutorialUrl,
          ...providerPayload,
          successRate: 0,
          requestCount24h: 0,
          totalCostYuan: 0,
          lastCalledAt: createdAt,
          updatedAt: createdAt,
        };
        setProviders((current) => [created, ...current]);
        setProviderDrafts((current) => ({
          [created.id]: buildProviderDraft(created),
          ...current,
        }));
        setNewProvider(buildCreateApiProviderDraft());
        setNotice("API Provider 已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 创建失败";
      setErrorMessage(`API Provider 创建失败：${message}`);
    } finally {
      setIsCreatingProvider(false);
    }
  }

  const summary = useMemo(
    () => ({
      orderCount: orders.length,
      pendingCount: orders.filter((item) => item.orderStatus === "PENDING").length,
      paidCount: orders.filter((item) => item.orderStatus === "PAID").length,
      userCount: users.length,
      planCount: rules.membershipPlans.length,
      packageCount: rules.pointsPackages.length,
      modelCount: usage.length,
      usagePoints: usage.reduce((total, item) => total + item.totalPointsCost, 0),
      skillCount: skills.length,
      promptCount: prompts.length,
      knowledgeBaseCount: knowledgeBases.length,
      providerCount: providers.length,
    }),
    [
      orders,
      rules.membershipPlans.length,
      rules.pointsPackages.length,
      users.length,
      usage,
      skills.length,
      prompts.length,
      knowledgeBases.length,
      providers.length,
    ],
  );
  const filteredProviders = useMemo(() => {
    const keyword = providerSearch.trim().toLowerCase();
    return providers.filter((item) => {
      if (providerStatusFilter !== "ALL" && item.status !== providerStatusFilter) {
        return false;
      }
      if (providerTypeFilter !== "ALL" && item.providerType !== providerTypeFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [
        item.name,
        item.providerType,
        item.baseUrl,
        item.defaultModel,
        item.remark,
        ...item.modelWhitelist,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [providerSearch, providerStatusFilter, providerTypeFilter, providers]);
  const providerInsights = useMemo(
    () => ({
      activeCount: providers.filter((item) => item.status === "ACTIVE").length,
      draftCount: providers.filter((item) => item.status === "DRAFT").length,
      disabledCount: providers.filter((item) => item.status === "DISABLED").length,
      filteredCount: filteredProviders.length,
    }),
    [filteredProviders.length, providers],
  );
  const createProviderModelOptions = useMemo(
    () => getProviderDefaultModelOptions(newProvider.modelWhitelist, newProvider.defaultModel),
    [newProvider.defaultModel, newProvider.modelWhitelist],
  );

  const accessibleTabs = tabs.filter((item) => {
    if (!adminSystemRole) {
      return item.key === "dashboard";
    }
    return ADMIN_ROLE_TAB_MATRIX[adminSystemRole].includes(item.key);
  });
  const resolvedActiveTab = accessibleTabs.some((item) => item.key === activeTab) ? activeTab : accessibleTabs[0]?.key || "dashboard";
  const activeTabMeta = accessibleTabs.find((item) => item.key === resolvedActiveTab) || accessibleTabs[0] || tabs[0];
  const overviewCards = [
    { label: "订单池", value: summary.orderCount, detail: `${summary.pendingCount} 个待支付 / ${summary.paidCount} 个已完成` },
    { label: "平台用户", value: summary.userCount, detail: `共覆盖 ${summary.userCount} 个可运营账户` },
    { label: "模型资产", value: summary.modelCount, detail: `累计消耗 ${summary.usagePoints} 点` },
    { label: "知识资产", value: summary.knowledgeBaseCount, detail: `共维护 ${summary.providerCount} 个接口供应商` },
  ];
  const moduleHighlights = [
    { key: "orders" as const, count: summary.orderCount, note: `${summary.pendingCount} 个订单待处理` },
    { key: "rules" as const, count: summary.planCount + summary.packageCount, note: `${summary.planCount} 个会员方案 / ${summary.packageCount} 个点数包` },
    { key: "users" as const, count: summary.userCount, note: `当前后台可管理 ${summary.userCount} 个用户` },
    { key: "usage" as const, count: summary.modelCount, note: `累计模型点数 ${summary.usagePoints}` },
    { key: "assets" as const, count: summary.skillCount + summary.promptCount, note: `${summary.skillCount} 个技能 / ${summary.promptCount} 套提示词` },
    { key: "knowledge" as const, count: summary.knowledgeBaseCount, note: `当前共有 ${summary.knowledgeBaseCount} 个知识库` },
    { key: "providers" as const, count: summary.providerCount, note: `接口供应商 ${summary.providerCount} 个` },
  ].filter((item) => accessibleTabs.some((tab) => tab.key === item.key));
  const operationPulse = [
    { label: "订单履约", value: summary.orderCount ? Math.round((summary.paidCount / summary.orderCount) * 100) : 0 },
    { label: "知识同步", value: knowledgeBases.length ? Math.round((knowledgeBases.filter((item) => item.syncStatus === "SUCCESS").length / knowledgeBases.length) * 100) : 0 },
    { label: "接口健康", value: providers.length ? Math.round(providers.filter((item) => item.status === "ACTIVE").length / providers.length * 100) : 0 },
  ];
  const latestKnowledgeRun = knowledgeBaseSyncRuns[0];
  const activeSkillPrimary = SKILL_CENTER_TREE.find((item) => item.id === activeSkillPrimaryId) || SKILL_CENTER_TREE[0];
  const activeSkillSection = activeSkillPrimary?.sections.find((item) => item.id === activeSkillSectionId) || activeSkillPrimary?.sections[0];
  const activeSkillLeaf = activeSkillSection?.items.find((item) => item.id === activeSkillLeafId) || activeSkillSection?.items[0];
  const activeSkillConfig = activeSkillLeaf?.skillSlug ? skills.find((item) => item.slug === activeSkillLeaf.skillSlug) : undefined;
  const activePromptConfig = activeSkillLeaf?.promptScene ? prompts.find((item) => item.scene === activeSkillLeaf.promptScene) : undefined;
  const activeSkillDraft = activeSkillConfig ? skillDrafts[activeSkillConfig.id] || buildSkillDraft(activeSkillConfig) : undefined;
  const activePromptDraft = activePromptConfig ? promptDrafts[activePromptConfig.id] || buildPromptDraft(activePromptConfig) : undefined;
  const skillModelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...providers.flatMap((item) => item.modelWhitelist),
            ...usage.map((item) => item.modelName),
            activeSkillDraft?.defaultModel,
            activePromptDraft?.modelName,
          ].filter(Boolean),
        ),
      ),
    [providers, usage, activePromptDraft?.modelName, activeSkillDraft?.defaultModel],
  );
  const skillCenterStatus = activeSkillDraft?.status || activePromptDraft?.status || "DRAFT";
  const skillCenterModel = activeSkillDraft?.defaultModel || activePromptDraft?.modelName || "";
  const skillCenterPointsCost = activeSkillDraft?.pointsCost || `${activeSkillConfig?.pointsCost || 180}`;
  const skillCenterUpdatedAt = activeSkillConfig?.updatedAt || activePromptConfig?.updatedAt;
  const skillCenterPromptValue = activePromptDraft?.content || activeSkillDraft?.description || activeSkillLeaf?.description || "";
  const skillCenterName = activeSkillConfig?.name || activeSkillLeaf?.label || activePromptConfig?.name || "-";
  const skillCenterUpdatedAtLabel = skillCenterUpdatedAt ? formatDateTime(skillCenterUpdatedAt) : "自动更新";
  const isSkillPrimaryExpanded = (primaryId: string) => expandedSkillPrimaryId === primaryId;
  const isAutoBundledPrompt = Boolean(activePromptConfig && skillCenterPromptValue.includes("## 自动聚合参考资料"));
  const isSavingSkillCenter =
    (activeSkillConfig ? updatingSkillId === activeSkillConfig.id : false) ||
    (activePromptConfig ? updatingPromptId === activePromptConfig.id : false);

  function handleSelectSkillPrimary(primaryId: string) {
    const nextPrimary = SKILL_CENTER_TREE.find((item) => item.id === primaryId);
    if (!nextPrimary) {
      return;
    }
    const nextSection = nextPrimary.sections[0];
    const nextLeaf = nextSection?.items[0];
    setActiveSkillPrimaryId(nextPrimary.id);
    setExpandedSkillPrimaryId(nextPrimary.id);
    setActiveSkillSectionId(nextSection?.id || "");
    setActiveSkillLeafId(nextLeaf?.id || "");
  }

  function handleSelectSkillSection(primaryId: string, sectionId: string) {
    const nextPrimary = SKILL_CENTER_TREE.find((item) => item.id === primaryId);
    const nextSection = nextPrimary?.sections.find((item) => item.id === sectionId);
    if (!nextPrimary || !nextSection) {
      return;
    }
    setActiveSkillPrimaryId(nextPrimary.id);
    setExpandedSkillPrimaryId(nextPrimary.id);
    setActiveSkillSectionId(nextSection.id);
    setActiveSkillLeafId(nextSection.items[0]?.id || "");
  }

  function handleSelectSkillLeaf(primaryId: string, sectionId: string, leafId: string) {
    setActiveSkillPrimaryId(primaryId);
    setExpandedSkillPrimaryId(primaryId);
    setActiveSkillSectionId(sectionId);
    setActiveSkillLeafId(leafId);
  }

  if (isCheckingAccess) {
    return (
      <main className="dashboard-shell admin-console-shell">
        <section className="panel" style={{ margin: 24 }}>
          <div className="panel-header">
            <div>
              <h1>后台管理台验证中</h1>
              <p className="panel-subtext">正在检查当前登录态与后台角色权限矩阵。</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage && !adminName) {
    return (
      <main className="dashboard-shell admin-console-shell">
        <section className="panel" style={{ margin: 24, maxWidth: 720 }}>
          <div className="panel-header">
            <div>
              <h1>后台管理台暂不可进入</h1>
              <p className="panel-subtext">{errorMessage}</p>
            </div>
          </div>
          <div className="personal-actions">
            <button type="button" className="primary-button" onClick={() => router.replace("/admin/login?next=/admin")}>
              去后台登录
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell admin-console-shell">
      <section className="admin-console-layout">
        <aside className="admin-console-sidebar">
          <div className="admin-sidebar-brand">
            <div>
              <span className="admin-sidebar-brand-kicker">AI 全域运营</span>
              <strong>后台导航</strong>
              <p>按栏目快速进入后台模块</p>
            </div>
          </div>
          <nav className="admin-sidebar-nav" aria-label="后台导航">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.key}
                className={`admin-sidebar-link ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="admin-sidebar-link-badge">{tab.shortLabel}</span>
                <span className="admin-sidebar-link-copy">
                  <strong>{tab.label}</strong>
                </span>
                <span className="admin-sidebar-link-arrow">{activeTab === tab.key ? "⌄" : "›"}</span>
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-foot">
            <span className={`status-pill ${dataSource === "api" ? "" : "status-pill-muted"}`}>{dataSource === "api" ? "接口数据" : "演示数据"}</span>
            <p>当前后台以简洁目录为主，后续继续补筛选和图表。</p>
          </div>
        </aside>

        <div className="admin-console-main">
          <section className="admin-console-hero">
            <div className="admin-console-hero-copy">
              <span className="hero-badge">后台运营中台</span>
              <h1>{activeTabMeta.label}</h1>
              <p>{activeTab === "dashboard" ? "先把后台做成真正的中文管理台：左侧栏目清晰，中间聚焦主任务，右侧总览帮助快速判断系统状态。" : activeTabMeta.description}</p>
            </div>
            <div className="admin-console-toolbar">
              <div className="admin-console-status-card">
                <span>当前数据源</span>
                <strong>{dataSource === "api" ? "实时接口" : "本地演示"}</strong>
                <p>{dataSource === "api" ? "当前页面读取接口结果，可直接用于后台联调。" : "接口异常时自动回退为演示数据，方便先看界面和流程。"}</p>
                <p>{adminName ? `当前管理员：${adminName}` : "当前管理员身份已验证"}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => void loadAdminData()}>
                {isLoading ? "刷新中..." : "刷新后台数据"}
              </button>
            </div>
          </section>

          {notice ? <div className="admin-console-message success">{notice}</div> : null}
          {errorMessage ? <div className="admin-console-message error">{errorMessage}</div> : null}

          {activeTab === "dashboard" ? (
            <div className="admin-dashboard-stack">
              <section className="admin-overview-grid">
                {overviewCards.map((item) => (
                  <article className="admin-overview-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </section>

              <section className="admin-dashboard-split">
                <article className="admin-dashboard-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <strong>运营脉冲</strong>
                      <p>用最短时间看出后台是否在健康运转。</p>
                    </div>
                    <span>总览</span>
                  </div>
                  <div className="admin-pulse-bars">
                    {operationPulse.map((item) => (
                      <div className="admin-pulse-item" key={item.label}>
                        <div className="admin-pulse-track">
                          <div className="admin-pulse-fill" style={{ width: `${item.value}%` }} />
                        </div>
                        <div className="admin-pulse-copy">
                          <span>{item.label}</span>
                          <strong>{item.value}%</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="admin-dashboard-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <strong>栏目速览</strong>
                      <p>每个后台项目单独成栏目，方便逐块进入。</p>
                    </div>
                    <span>模块</span>
                  </div>
                  <div className="admin-spotlight-list">
                    {moduleHighlights.map((item) => {
                      const tab = tabs.find((entry) => entry.key === item.key);
                      return (
                        <button
                          type="button"
                          key={item.key}
                          className="admin-spotlight-item"
                          onClick={() => setActiveTab(item.key)}
                        >
                          <span>{tab?.label}</span>
                          <strong>{item.count}</strong>
                          <small>{item.note}</small>
                        </button>
                      );
                    })}
                  </div>
                </article>
              </section>

              <section className="admin-dashboard-split">
                <article className="admin-dashboard-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <strong>今日摘要</strong>
                      <p>保留管理台应有的商务感和一眼可读性。</p>
                    </div>
                    <span>摘要</span>
                  </div>
                  <div className="admin-summary-list">
                    <div>
                      <span>待支付订单</span>
                      <strong>{summary.pendingCount}</strong>
                    </div>
                    <div>
                      <span>在线知识库</span>
                      <strong>{knowledgeBases.filter((item) => item.status === "ACTIVE").length}</strong>
                    </div>
                    <div>
                      <span>启用技能</span>
                      <strong>{skills.filter((item) => item.status === "ACTIVE").length}</strong>
                    </div>
                    <div>
                      <span>活跃供应商</span>
                      <strong>{providers.filter((item) => item.status === "ACTIVE").length}</strong>
                    </div>
                  </div>
                </article>

                <article className="admin-dashboard-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <strong>最近动态</strong>
                      <p>把知识库同步和模型调用的最新情况放到首页。</p>
                    </div>
                    <span>动态</span>
                  </div>
                  <div className="admin-recent-feed">
                    <div>
                      <span>最近同步</span>
                      <strong>{latestKnowledgeRun ? getSyncRunTitle(latestKnowledgeRun) : "暂无同步记录"}</strong>
                      <small>{latestKnowledgeRun ? formatDateTime(latestKnowledgeRun.startedAt) : "等首次触发后展示"}</small>
                    </div>
                    <div>
                      <span>最近模型调用</span>
                      <strong>{usage[0]?.modelName || "暂无模型数据"}</strong>
                      <small>{usage[0]?.lastCalledAt ? formatDateTime(usage[0].lastCalledAt) : "未记录"}</small>
                    </div>
                    <div>
                      <span>当前建议</span>
                      <strong>{summary.pendingCount > 0 ? "优先处理待支付订单" : "继续打磨各栏目细节"}</strong>
                      <small>下一轮可继续补图表、筛选和批量操作。</small>
                    </div>
                  </div>
                </article>
              </section>
            </div>
          ) : (
            <section className="panel personal-center-panel admin-module-panel">
              <div className="admin-module-heading">
                <div>
                  <span className="admin-module-tag">{activeTabMeta.shortLabel}</span>
                  <h2>{activeTabMeta.label}</h2>
                  <p>{activeTabMeta.description}</p>
                </div>
              </div>

        {activeTab === "orders" ? (
          <div className="personal-list">
            {orders.map((item) => (
              <article className="entity-card personal-card" key={item.id}>
                <div className="entity-card-head">
                  <div>
                    <strong>{item.orderNo}</strong>
                    <p className="personal-meta">
                      {(item.user?.nickname || "未知用户")} · {(item.user?.mobile || "无手机号")} · {item.amountYuan} 元
                    </p>
                  </div>
                  <span className={`archive-pill ${item.orderStatus === "PAID" ? "status-ready" : item.orderStatus === "CANCELLED" ? "status-paused" : "status-in_progress"}`}>
                    {item.orderStatus}
                  </span>
                </div>
                <div className="personal-grid">
                  <div>
                    <span>订单类型</span>
                    <strong>{item.orderType}</strong>
                  </div>
                  <div>
                    <span>会员/点数</span>
                    <strong>{item.orderType === "MEMBERSHIP_PURCHASE" ? item.membership || "-" : `${item.pointsAmount || 0} 点`}</strong>
                  </div>
                  <div>
                    <span>创建时间</span>
                    <strong>{formatDateTime(item.createdAt)}</strong>
                  </div>
                  <div>
                    <span>支付时间</span>
                    <strong>{item.paidAt ? formatDateTime(item.paidAt) : "未支付"}</strong>
                  </div>
                </div>
                <div className="personal-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleOrderAction(item.id, "pay")}
                    disabled={item.orderStatus !== "PENDING"}
                  >
                    后台标记支付
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void handleOrderAction(item.id, "cancel")}
                    disabled={item.orderStatus !== "PENDING"}
                  >
                    取消订单
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "users" ? (
          <UsersManagementPanel
            users={users}
            dataSource={dataSource}
            onUsersChange={setUsers}
            onNotice={setNotice}
            onError={setErrorMessage}
          />
        ) : activeTab === "usage" ? (
          <div className="personal-list">
            {usage.map((item) => (
              <article className="entity-card personal-card" key={item.id}>
                <div className="entity-card-head">
                  <div>
                    <strong>{item.modelName}</strong>
                    <p className="personal-meta">
                      {item.provider} · 最近调用 {formatDateTime(item.lastCalledAt)}
                    </p>
                  </div>
                  <span className="archive-pill status-ready">{item.taskCount} 次任务</span>
                </div>
                <div className="personal-grid">
                  <div>
                    <span>成功任务</span>
                    <strong>{item.successCount}</strong>
                  </div>
                  <div>
                    <span>失败任务</span>
                    <strong>{item.failedCount}</strong>
                  </div>
                  <div>
                    <span>总点数消耗</span>
                    <strong>{item.totalPointsCost}</strong>
                  </div>
                  <div>
                    <span>估算金额</span>
                    <strong>{item.estimatedAmountYuan} 元</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "assets" ? (
          <div className="admin-skill-center-layout">
            <aside className="panel personal-center-panel admin-skill-tree-card admin-skill-tree-card--polished admin-skill-tree-card--directory">
              <div className="admin-skill-card-topline">
                <span className="admin-skill-card-kicker">技能目录</span>
                <span className="archive-pill status-ready">
                  {skills.length} 技能 / {prompts.length} 提示词
                </span>
              </div>
              <div className="admin-skill-primary-list">
                {SKILL_CENTER_TREE.map((primary) => {
                  const primaryActive = activeSkillPrimaryId === primary.id;
                  const primaryExpanded = isSkillPrimaryExpanded(primary.id);

                  return (
                    <div
                      className={`entity-card admin-skill-primary-group${primaryExpanded ? " expanded" : ""}`}
                      key={primary.id}
                    >
                      <button
                        type="button"
                        className={`admin-skill-primary-button${primaryActive ? " active" : ""}`}
                        onClick={() => handleSelectSkillPrimary(primary.id)}
                      >
                        <span className="admin-skill-primary-mark">{primary.label.slice(0, 1)}</span>
                        <span className="admin-skill-primary-button-copy">
                          <strong>{primary.label}</strong>
                          <small>{primary.sections.length} 个二级分类</small>
                        </span>
                        <span className={`admin-skill-primary-arrow${primaryExpanded ? " expanded" : ""}`}>⌄</span>
                      </button>
                      {primaryExpanded ? (
                        <div className="admin-skill-tree-sections">
                          {primary.sections.map((section) => {
                            const sectionActive = primary.id === activeSkillPrimaryId && section.id === activeSkillSectionId;

                            return (
                              <div className="entity-card admin-skill-tree-section" key={section.id}>
                                <button
                                  type="button"
                                  className={`admin-skill-tree-section-button${sectionActive ? " active" : ""}`}
                                  onClick={() => handleSelectSkillSection(primary.id, section.id)}
                                >
                                  <span className="admin-skill-tree-section-label">{section.label}</span>
                                  <small>{section.items.length}</small>
                                </button>
                                <div className="admin-skill-tree-leaf-list">
                                  {section.items.map((leaf) => {
                                    const leafActive =
                                      primary.id === activeSkillPrimaryId &&
                                      section.id === activeSkillSectionId &&
                                      leaf.id === activeSkillLeafId;

                                    return (
                                      <button
                                        type="button"
                                        className={`admin-skill-tree-leaf-button${leafActive ? " active" : ""}`}
                                        key={leaf.id}
                                        onClick={() => handleSelectSkillLeaf(primary.id, section.id, leaf.id)}
                                      >
                                        <span className="admin-skill-tree-leaf-dot" />
                                        <strong>{leaf.label}</strong>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>
            <section className="panel personal-center-panel admin-skill-center-panel">
              {activeSkillLeaf ? (
                <article className="entity-card admin-rule-card admin-skill-center-card admin-skill-form-card">
                  <div className="admin-skill-card-topline">
                    <span className="admin-skill-card-kicker">{activeSkillPrimary?.label || "技能中心"}</span>
                    <span className={`archive-pill ${getStatusClassName(skillCenterStatus)}`}>{getStatusLabel(skillCenterStatus)}</span>
                  </div>
                  <div className="admin-skill-card-header">
                    <div>
                      <strong>{activeSkillLeaf.label}</strong>
                      <p>{activeSkillSection?.label || "技能分类"}</p>
                    </div>
                  </div>
                  <div className="admin-skill-simple-grid">
                    <label className="admin-skill-field">
                      <span>技能名称</span>
                      <input value={skillCenterName} readOnly />
                    </label>
                    <label className="admin-skill-field">
                      <span>状态</span>
                      <select value={skillCenterStatus} onChange={(event) => handleSkillCenterStatusChange(event.target.value as SkillConfigRecord["status"])}>
                        <option value="ACTIVE">启用中</option>
                        <option value="DRAFT">草稿</option>
                        <option value="DISABLED">停用</option>
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>默认模型</span>
                      <select value={skillCenterModel} onChange={(event) => handleSkillCenterModelChange(event.target.value)}>
                        {(skillModelOptions.length ? skillModelOptions : [skillCenterModel || "gpt-5.4-nano"]).map((model) => (
                          <option value={model} key={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>点数成本</span>
                      <input
                        type="number"
                        value={skillCenterPointsCost}
                        onChange={(event) => handleSkillCenterPointsCostChange(event.target.value)}
                        disabled={!activeSkillConfig}
                      />
                    </label>
                    <label className="admin-skill-field admin-skill-field--wide">
                      <span>更新时间</span>
                      <input value={skillCenterUpdatedAtLabel} readOnly />
                    </label>
                  </div>
                  <label className="admin-skill-field admin-skill-field--full">
                    <span>技能提示词</span>
                    <textarea
                      value={skillCenterPromptValue}
                      onChange={(event) => handleSkillCenterPromptChange(event.target.value)}
                      readOnly={isAutoBundledPrompt}
                    />
                  </label>
                  {isAutoBundledPrompt ? (
                    <p className="personal-meta">
                      当前内容自动聚合自 `SKILL.md` 与同目录参考资料；如需修改，请直接回到原始提示词目录维护。
                    </p>
                  ) : null}
                  <div className="admin-skill-form-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSaveSkillCenter()}
                      disabled={isSavingSkillCenter || (!activeSkillConfig && !activePromptConfig)}
                    >
                      {isSavingSkillCenter ? "保存中..." : "保存技能"}
                    </button>
                  </div>
                </article>
              ) : (
                <div className="admin-skill-empty">请先从右侧选择一个三级技能项。</div>
              )}
            </section>
          </div>
        ) : activeTab === "knowledge" ? (
          <div className="personal-list">
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>新建知识库</strong>
                  <p className="personal-meta">先创建知识库基础信息，后续再继续上传文件和配置同步。</p>
                </div>
                <span className="archive-pill status-in_progress">CREATE</span>
              </div>
              <div className="admin-rule-grid">
                <label>
                  <span>知识库名称</span>
                  <input
                    value={newKnowledgeBase.name}
                    onChange={(event) =>
                      setNewKnowledgeBase((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Slug</span>
                  <input
                    value={newKnowledgeBase.slug}
                    onChange={(event) =>
                      setNewKnowledgeBase((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>数据源类型</span>
                  <select
                    value={newKnowledgeBase.sourceType}
                    onChange={(event) =>
                      setNewKnowledgeBase((current) => ({
                        ...current,
                        sourceType: event.target.value as KnowledgeBaseRecord["sourceType"],
                      }))
                    }
                  >
                    <option value="MANUAL">MANUAL</option>
                    <option value="FEISHU">FEISHU</option>
                    <option value="NOTION">NOTION</option>
                    <option value="OSS">OSS</option>
                  </select>
                </label>
              </div>
              <label className="admin-rule-description">
                <span>知识库说明</span>
                <textarea
                  value={newKnowledgeBase.description}
                  onChange={(event) =>
                    setNewKnowledgeBase((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="personal-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleCreateKnowledgeBase()}
                  disabled={isCreatingKnowledgeBase || !newKnowledgeBase.name.trim() || !newKnowledgeBase.slug.trim()}
                >
                  {isCreatingKnowledgeBase ? "创建中..." : "新建知识库"}
                </button>
              </div>
            </article>
            {knowledgeBases.map((item) => {
              const draft = knowledgeBaseDrafts[item.id] || buildKnowledgeBaseDraft(item);
              const fileDraft = newKnowledgeBaseFileDrafts[item.id] || buildCreateKnowledgeBaseFileDraft();
              const files = knowledgeBaseFiles.filter((file) => file.knowledgeBaseId === item.id);
              const syncRuns = knowledgeBaseSyncRuns.filter((run) => run.knowledgeBaseId === item.id);
              const latestSyncRun = syncRuns[0];
              const hasRunningSyncRun = syncRuns.some((run) => run.result === "RUNNING");

              return (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="personal-meta">
                        {item.slug} · {item.sourceType} · 文档 {item.documentCount} 篇 · 分片 {item.chunkCount}
                      </p>
                    </div>
                    <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                  </div>

                  <div className="personal-grid">
                    <div>
                      <span>同步状态</span>
                      <strong>{item.syncStatus}</strong>
                    </div>
                    <div>
                      <span>数据源类型</span>
                      <strong>{item.sourceType}</strong>
                    </div>
                    <div>
                      <span>文档数</span>
                      <strong>{item.documentCount}</strong>
                    </div>
                    <div>
                      <span>分片数</span>
                      <strong>{item.chunkCount}</strong>
                    </div>
                    <div>
                      <span>更新时间</span>
                      <strong>{formatDateTime(item.updatedAt)}</strong>
                    </div>
                    <div>
                      <span>最近同步结果</span>
                      <strong>{latestSyncRun ? latestSyncRun.result : "NO_RUNS"}</strong>
                    </div>
                  </div>

                  <div className="admin-rules-stack">
                    <div className="panel-header">
                      <h2>最近一次同步</h2>
                      <span>{latestSyncRun ? formatDateTime(latestSyncRun.startedAt) : "暂无记录"}</span>
                    </div>
                    {latestSyncRun ? (
                      <article className="entity-card admin-rule-card">
                        <div className="entity-card-head">
                          <div>
                            <strong>{getSyncRunTitle(latestSyncRun)}</strong>
                            <p className="personal-meta">{latestSyncRun.summary}</p>
                          </div>
                          <span
                            className={`archive-pill ${
                              latestSyncRun.result === "SUCCESS"
                                ? "status-ready"
                                : latestSyncRun.result === "FAILED"
                                  ? "status-paused"
                                  : "status-in_progress"
                            }`}
                          >
                            {latestSyncRun.result}
                          </span>
                        </div>
                        <div className="personal-grid">
                          <div>
                            <span>开始时间</span>
                            <strong>{formatDateTime(latestSyncRun.startedAt)}</strong>
                          </div>
                          <div>
                            <span>完成时间</span>
                            <strong>{latestSyncRun.completedAt ? formatDateTime(latestSyncRun.completedAt) : "进行中"}</strong>
                          </div>
                          <div>
                            <span>执行人</span>
                            <strong>{latestSyncRun.operator}</strong>
                          </div>
                        </div>
                        {latestSyncRun.errorDetail ? (
                          <p className="personal-meta">失败详情：{latestSyncRun.errorDetail}</p>
                        ) : null}
                      </article>
                    ) : (
                      <p className="personal-meta">当前还没有同步记录，先触发一次文件同步。</p>
                    )}
                  </div>

                  <div className="admin-rules-stack">
                    <div className="admin-rule-grid">
                      <label>
                        <span>启用状态</span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            handleKnowledgeBaseDraftChange(item.id, {
                              status: event.target.value as KnowledgeBaseRecord["status"],
                            })
                          }
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                      </label>
                      <label>
                        <span>同步状态</span>
                        <select
                          value={draft.syncStatus}
                          onChange={(event) =>
                            handleKnowledgeBaseDraftChange(item.id, {
                              syncStatus: event.target.value as KnowledgeBaseRecord["syncStatus"],
                            })
                          }
                        >
                          <option value="IDLE">IDLE</option>
                          <option value="SYNCING">SYNCING</option>
                          <option value="FAILED">FAILED</option>
                          <option value="SUCCESS">SUCCESS</option>
                        </select>
                      </label>
                      <label>
                        <span>数据源类型</span>
                        <select
                          value={draft.sourceType}
                          onChange={(event) =>
                            handleKnowledgeBaseDraftChange(item.id, {
                              sourceType: event.target.value as KnowledgeBaseRecord["sourceType"],
                            })
                          }
                        >
                          <option value="MANUAL">MANUAL</option>
                          <option value="FEISHU">FEISHU</option>
                          <option value="NOTION">NOTION</option>
                          <option value="OSS">OSS</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <label className="admin-rule-description">
                    <span>知识库说明</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) =>
                        handleKnowledgeBaseDraftChange(item.id, {
                          description: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="admin-rules-stack">
                    <div className="panel-header">
                      <h2>知识库文件</h2>
                      <span>{files.length} Files</span>
                    </div>
                    <div className="personal-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleStartKnowledgeBaseSync(item.id)}
                        disabled={updatingKnowledgeBaseId === item.id || hasRunningSyncRun}
                      >
                        {updatingKnowledgeBaseId === item.id ? "同步中..." : "触发全量同步"}
                      </button>
                    </div>
                    <div className="admin-rule-grid">
                      <label>
                        <span>文件名</span>
                        <input
                          value={fileDraft.fileName}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              fileName: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>文件类型</span>
                        <select
                          value={fileDraft.fileType}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              fileType: event.target.value as KnowledgeBaseFileRecord["fileType"],
                            })
                          }
                        >
                          <option value="PDF">PDF</option>
                          <option value="DOCX">DOCX</option>
                          <option value="XLSX">XLSX</option>
                          <option value="MD">MD</option>
                          <option value="LINK">LINK</option>
                        </select>
                      </label>
                      <label>
                        <span>来源</span>
                        <input
                          value={fileDraft.sourceName}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              sourceName: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>分片数</span>
                        <input
                          type="number"
                          value={fileDraft.chunkCount}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              chunkCount: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="personal-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleCreateKnowledgeBaseFile(item.id)}
                        disabled={updatingKnowledgeBaseFileId === item.id || !fileDraft.fileName.trim()}
                      >
                        {updatingKnowledgeBaseFileId === item.id ? "新增中..." : "新增文件"}
                      </button>
                    </div>
                    <div className="admin-rules-stack">
                      {files.length ? (
                        files.map((file) => (
                          <article className="entity-card admin-rule-card" key={file.id}>
                            <div className="entity-card-head">
                              <div>
                                <strong>{file.fileName}</strong>
                                <p className="personal-meta">
                                  {file.fileType} · {file.sourceName} · 分片 {file.chunkCount}
                                </p>
                              </div>
                              <span className={`archive-pill ${file.status === "INDEXED" ? "status-ready" : file.status === "FAILED" ? "status-paused" : "status-in_progress"}`}>
                                {file.status}
                              </span>
                            </div>
                            <div className="admin-rule-grid">
                              <label>
                                <span>文件状态</span>
                                <select
                                  value={file.status}
                                  onChange={(event) =>
                                    void handleUpdateKnowledgeBaseFileStatus(
                                      file.id,
                                      event.target.value as KnowledgeBaseFileRecord["status"],
                                    )
                                  }
                                  disabled={updatingKnowledgeBaseFileId === file.id}
                                >
                                  <option value="PENDING">PENDING</option>
                                  <option value="INDEXED">INDEXED</option>
                                  <option value="FAILED">FAILED</option>
                                </select>
                              </label>
                              <label>
                                <span>同步动作</span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleSyncKnowledgeBaseFile(file.id)}
                                  disabled={updatingKnowledgeBaseFileId === file.id || file.status === "INDEXED"}
                                >
                                  {file.status === "FAILED" ? "重试同步" : "触发同步"}
                                </button>
                              </label>
                            </div>
                            <div className="personal-actions">
                              <span className="personal-meta">上传时间 {formatDateTime(file.uploadedAt)}</span>
                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => void handleDeleteKnowledgeBaseFile(file.id)}
                                disabled={updatingKnowledgeBaseFileId === file.id}
                              >
                                删除文件
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="personal-meta">暂无知识库文件，先从上方录入一条文件信息。</p>
                      )}
                    </div>
                  </div>

                  <div className="admin-rules-stack">
                    <div className="panel-header">
                      <h2>同步记录</h2>
                      <span>{syncRuns.length} Runs</span>
                    </div>
                    {syncRuns.length ? (
                      syncRuns.slice(0, 5).map((run) => {
                        const runDraft = knowledgeBaseSyncRunDrafts[run.id] || buildSyncRunDraft(run);

                        return (
                          <article className="entity-card admin-rule-card" key={run.id}>
                          <div className="entity-card-head">
                            <div>
                              <strong>{getSyncRunTitle(run)}</strong>
                              <p className="personal-meta">{run.summary}</p>
                            </div>
                            <span
                              className={`archive-pill ${
                                run.result === "SUCCESS"
                                  ? "status-ready"
                                  : run.result === "FAILED"
                                    ? "status-paused"
                                    : "status-in_progress"
                              }`}
                            >
                              {run.result}
                            </span>
                          </div>
                          <div className="personal-grid">
                            <div>
                              <span>开始时间</span>
                              <strong>{formatDateTime(run.startedAt)}</strong>
                            </div>
                            <div>
                              <span>完成时间</span>
                              <strong>{run.completedAt ? formatDateTime(run.completedAt) : "进行中"}</strong>
                            </div>
                            <div>
                              <span>执行人</span>
                              <strong>{run.operator}</strong>
                            </div>
                          </div>
                          {run.result === "RUNNING" ? (
                            <>
                              <div className="admin-rule-grid">
                                <label>
                                  <span>成功摘要</span>
                                  <input
                                    value={runDraft.summary}
                                    onChange={(event) =>
                                      handleSyncRunDraftChange(run.id, {
                                        summary: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              <label className="admin-rule-description">
                                <span>失败原因详情</span>
                                <textarea
                                  value={runDraft.errorDetail}
                                  onChange={(event) =>
                                    handleSyncRunDraftChange(run.id, {
                                      errorDetail: event.target.value,
                                    })
                                  }
                                />
                              </label>
                              <div className="personal-actions">
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleCompleteKnowledgeBaseSyncRun(run.id, "SUCCESS")}
                                  disabled={updatingKnowledgeBaseSyncRunId === run.id}
                                >
                                  标记成功
                                </button>
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() => void handleCompleteKnowledgeBaseSyncRun(run.id, "FAILED")}
                                  disabled={updatingKnowledgeBaseSyncRunId === run.id}
                                >
                                  标记失败
                                </button>
                              </div>
                            </>
                          ) : run.errorDetail ? (
                            <p className="personal-meta">失败详情：{run.errorDetail}</p>
                          ) : null}
                          </article>
                        );
                      })
                    ) : (
                      <p className="personal-meta">暂无同步记录。</p>
                    )}
                  </div>

                  <div className="personal-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSaveKnowledgeBase(item.id)}
                      disabled={updatingKnowledgeBaseId === item.id}
                    >
                      {updatingKnowledgeBaseId === item.id ? "保存中..." : "保存知识库配置"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleArchiveKnowledgeBase(item.id)}
                      disabled={updatingKnowledgeBaseId === item.id || item.status === "DISABLED"}
                    >
                      归档知识库
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleDeleteKnowledgeBase(item.id)}
                      disabled={updatingKnowledgeBaseId === item.id}
                    >
                      删除知识库
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : activeTab === "providers" ? (
          <div className="admin-provider-layout">
            <section className="panel admin-provider-form">
              <div className="admin-provider-form-head">
                <div>
                  <span className="admin-provider-kicker">API Provider</span>
                  <h2>新增接口供应商</h2>
                  <p>集中维护第三方接口的连接信息、鉴权密钥与模型白名单，所有业务链路从这里同步。</p>
                </div>
                <span className="archive-pill status-in_progress">CREATE</span>
              </div>

              <div className="admin-provider-group">
                <h3>基础信息</h3>
                <div className="admin-provider-grid">
                  <label className="admin-provider-field">
                    <span>Provider 名称</span>
                    <input
                      value={newProvider.name}
                      onChange={(event) =>
                        setNewProvider((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-provider-field">
                    <span>Provider 类型</span>
                    <select
                      value={newProvider.providerType}
                      onChange={(event) =>
                        setNewProvider((current) => ({
                          ...current,
                          providerType: event.target.value as ApiProviderRecord["providerType"],
                        }))
                      }
                    >
                      <option value="OPENAI">OPENAI</option>
                      <option value="GEMINI">GEMINI</option>
                      <option value="DOUBAO">DOUBAO</option>
                      <option value="CUSTOM">CUSTOM</option>
                    </select>
                  </label>
                  <label className="admin-provider-field admin-provider-field--wide">
                    <span>Base URL</span>
                    <input
                      value={newProvider.baseUrl}
                      onChange={(event) =>
                        setNewProvider((current) => ({
                          ...current,
                          baseUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-provider-field admin-provider-field--wide">
                    <span>教程文档链接</span>
                    <input
                      value={newProvider.tutorialUrl}
                      onChange={(event) =>
                        setNewProvider((current) => ({
                          ...current,
                          tutorialUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="admin-provider-group">
                <h3>鉴权与默认值</h3>
                <div className="admin-provider-grid">
                  <label className="admin-provider-field admin-provider-field--wide">
                    <div className="admin-provider-field-topline">
                      <span>API Key</span>
                      <button
                        type="button"
                        className="secondary-button admin-provider-inline-button"
                        onClick={() => setCreateProviderSecretVisible((current) => !current)}
                      >
                        {createProviderSecretVisible ? "隐藏" : "显示"}
                      </button>
                    </div>
                    <div className="admin-provider-secret-input">
                      <input
                        type={createProviderSecretVisible ? "text" : "password"}
                        value={newProvider.apiKey}
                        onChange={(event) =>
                          setNewProvider((current) => ({
                            ...current,
                            apiKey: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <small className="admin-provider-hint">
                      当前预览: {maskProviderSecret(newProvider.apiKey)}
                    </small>
                  </label>
                  <label className="admin-provider-field">
                    <span>默认模型</span>
                    <select
                      value={newProvider.defaultModel}
                      onChange={(event) =>
                        setNewProvider((current) => ({
                          ...current,
                          defaultModel: event.target.value,
                        }))
                      }
                      disabled={!createProviderModelOptions.length}
                    >
                      <option value="">{createProviderModelOptions.length ? "请选择默认模型" : "请先填写模型白名单"}</option>
                      {createProviderModelOptions.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                    <small className="admin-provider-hint">默认模型从可用模型列表中选择，避免手填出错。</small>
                  </label>
                  <label className="admin-provider-field">
                    <span>备注</span>
                    <input
                      value={newProvider.remark}
                      onChange={(event) =>
                        setNewProvider((current) => ({
                          ...current,
                          remark: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="admin-provider-group">
                <div className="admin-provider-section-head">
                  <strong>模型配置</strong>
                </div>
                <label className="admin-provider-field admin-provider-field--full">
                  <span>模型白名单（逗号分隔）</span>
                  <textarea
                    value={newProvider.modelWhitelist}
                    onChange={(event) =>
                      setNewProvider((current) => {
                        const nextWhitelist = event.target.value;
                        return {
                          ...current,
                          modelWhitelist: nextWhitelist,
                          defaultModel: resolveProviderDefaultModel(nextWhitelist, current.defaultModel),
                        };
                      })
                    }
                  />
                </label>
                <small className="admin-provider-hint">填写所有可调用模型，默认模型下拉会自动同步这份列表。</small>
              </div>

              <div className="admin-provider-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleCreateProvider()}
                  disabled={isCreatingProvider || !newProvider.name.trim() || !newProvider.baseUrl.trim()}
                >
                  {isCreatingProvider ? "创建中..." : "新建 Provider"}
                </button>
              </div>
            </section>

            <section className="admin-provider-stack">
              <article className="panel admin-provider-filter-card">
                <div className="admin-provider-filter-head">
                  <div>
                    <strong>接口供应商列表</strong>
                    <p>支持按名称、模型、URL、备注搜索，并可按状态和类型快速收敛结果。</p>
                  </div>
                  <span className="archive-pill status_success">
                    {providerInsights.filteredCount}/{providers.length}
                  </span>
                </div>
                <div className="admin-provider-filter-grid">
                  <label className="admin-provider-field admin-provider-field--wide">
                    <span>搜索供应商</span>
                    <input
                      value={providerSearch}
                      placeholder="按 Provider 名称、模型、Base URL、备注搜索"
                      onChange={(event) => setProviderSearch(event.target.value)}
                    />
                  </label>
                  <label className="admin-provider-field">
                    <span>状态筛选</span>
                    <select
                      value={providerStatusFilter}
                      onChange={(event) =>
                        setProviderStatusFilter(event.target.value as ApiProviderRecord["status"] | "ALL")
                      }
                    >
                      <option value="ALL">全部状态</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </label>
                  <label className="admin-provider-field">
                    <span>类型筛选</span>
                    <select
                      value={providerTypeFilter}
                      onChange={(event) =>
                        setProviderTypeFilter(event.target.value as ApiProviderRecord["providerType"] | "ALL")
                      }
                    >
                      <option value="ALL">全部类型</option>
                      <option value="OPENAI">OPENAI</option>
                      <option value="GEMINI">GEMINI</option>
                      <option value="DOUBAO">DOUBAO</option>
                      <option value="CUSTOM">CUSTOM</option>
                    </select>
                  </label>
                </div>
                <div className="admin-provider-chip-row">
                  <span className="admin-provider-chip is-active">ACTIVE {providerInsights.activeCount}</span>
                  <span className="admin-provider-chip">DRAFT {providerInsights.draftCount}</span>
                  <span className="admin-provider-chip">DISABLED {providerInsights.disabledCount}</span>
                  <span className="admin-provider-chip">数据源 {dataSource === "api" ? "API" : "SEED"}</span>
                </div>
              </article>

              {filteredProviders.length ? filteredProviders.map((item) => {
                const draft = providerDrafts[item.id] || buildProviderDraft(item);
                const isSecretVisible = Boolean(revealedProviderKeys[item.id]);
                const modelOptions = getProviderDefaultModelOptions(draft.modelWhitelist, draft.defaultModel);

                return (
                  <article className="panel admin-provider-card" key={item.id}>
                    <div className="admin-provider-card-head">
                      <div>
                        <div className="admin-provider-title">
                          <strong>{item.name}</strong>
                          <span className="admin-provider-type">{item.providerType}</span>
                        </div>
                        <p className="admin-provider-meta">
                          近 24h {item.requestCount24h} 次 · 成功率 {item.successRate}% · 更新 {formatDateTime(item.updatedAt)}
                        </p>
                      </div>
                      <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                    </div>

                    <div className="admin-provider-metrics">
                      <div>
                        <span>最近调用</span>
                        <strong>{formatDateTime(item.lastCalledAt)}</strong>
                      </div>
                      <div>
                        <span>累计成本</span>
                        <strong>{item.totalCostYuan} 元</strong>
                      </div>
                      <div>
                        <span>模型白名单</span>
                        <strong>{item.modelWhitelist.length} 个</strong>
                      </div>
                      <div>
                        <span>默认模型</span>
                        <strong>{item.defaultModel || "-"}</strong>
                      </div>
                    </div>

                    <div className="admin-provider-section">
                      <div className="admin-provider-section-head">
                        <strong>连接配置</strong>
                      </div>
                      <div className="admin-provider-grid">
                        <label className="admin-provider-field">
                          <span>状态</span>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              handleProviderDraftChange(item.id, {
                                status: event.target.value as ApiProviderRecord["status"],
                              })
                            }
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>
                        </label>
                        <label className="admin-provider-field admin-provider-field--wide">
                          <span>Base URL</span>
                          <input
                            value={draft.baseUrl}
                            onChange={(event) =>
                              handleProviderDraftChange(item.id, {
                                baseUrl: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="admin-provider-field admin-provider-field--wide">
                          <span>教程文档链接</span>
                          <input
                            value={draft.tutorialUrl}
                            onChange={(event) =>
                              handleProviderDraftChange(item.id, {
                                tutorialUrl: event.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="admin-provider-section">
                      <div className="admin-provider-section-head">
                        <strong>鉴权与默认值</strong>
                      </div>
                      <div className="admin-provider-grid">
                        <label className="admin-provider-field admin-provider-field--wide">
                          <div className="admin-provider-field-topline">
                            <span>API Key</span>
                            <button
                              type="button"
                              className="secondary-button admin-provider-inline-button"
                              onClick={() =>
                                setRevealedProviderKeys((current) => ({
                                  ...current,
                                  [item.id]: !current[item.id],
                                }))
                              }
                            >
                              {isSecretVisible ? "隐藏" : "显示"}
                            </button>
                          </div>
                          <div className="admin-provider-secret-input">
                            <input
                              type={isSecretVisible ? "text" : "password"}
                              value={draft.apiKey}
                              onChange={(event) =>
                                handleProviderDraftChange(item.id, {
                                  apiKey: event.target.value,
                                })
                              }
                            />
                          </div>
                          <small className="admin-provider-hint">
                            当前预览: {maskProviderSecret(draft.apiKey)}
                          </small>
                        </label>
                        <label className="admin-provider-field">
                          <span>默认模型</span>
                          <select
                            value={draft.defaultModel}
                            onChange={(event) =>
                              handleProviderDraftChange(item.id, {
                                defaultModel: event.target.value,
                              })
                            }
                            disabled={!modelOptions.length}
                          >
                            <option value="">{modelOptions.length ? "请选择默认模型" : "请先填写模型白名单"}</option>
                            {modelOptions.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                          <small className="admin-provider-hint">默认模型从可用模型列表中选择。</small>
                        </label>
                        <label className="admin-provider-field">
                          <span>备注</span>
                          <input
                            value={draft.remark}
                            onChange={(event) =>
                              handleProviderDraftChange(item.id, {
                                remark: event.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="admin-provider-section">
                      <div className="admin-provider-section-head">
                        <strong>模型配置</strong>
                      </div>
                      <label className="admin-provider-field admin-provider-field--full">
                        <span>模型白名单（逗号分隔）</span>
                        <textarea
                          value={draft.modelWhitelist}
                          onChange={(event) =>
                            handleProviderDraftChange(item.id, {
                              modelWhitelist: event.target.value,
                              defaultModel: resolveProviderDefaultModel(event.target.value, draft.defaultModel),
                            })
                          }
                        />
                      </label>
                      <small className="admin-provider-hint">只展示用户需要维护的模型配置，其他运行参数继续按原值保留。</small>
                    </div>

                    <div className="admin-provider-actions">
                      {draft.tutorialUrl.trim() ? (
                        <a href={draft.tutorialUrl} target="_blank" rel="noreferrer" className="secondary-button">
                          打开教程文档
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleSaveProvider(item.id)}
                        disabled={updatingProviderId === item.id}
                      >
                        {updatingProviderId === item.id ? "保存中..." : "保存 Provider 配置"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleArchiveProvider(item.id)}
                        disabled={updatingProviderId === item.id || item.status === "DISABLED"}
                      >
                        归档 Provider
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => void handleDeleteProvider(item.id)}
                        disabled={updatingProviderId === item.id}
                      >
                        删除 Provider
                      </button>
                    </div>
                  </article>
                );
              }) : (
                <article className="panel admin-provider-empty">
                  <strong>没有匹配的接口供应商</strong>
                  <p>可以清空搜索词或切回“全部状态 / 全部类型”，也可以直接在左侧创建新的 Provider。</p>
                </article>
              )}
            </section>
          </div>
        ) : (
          <div className="admin-rules-layout">
            <section className="panel personal-center-panel">
              <div className="panel-header">
                <h2>会员方案</h2>
                <span>Membership Plans</span>
              </div>
              <div className="admin-rules-stack">
                {rules.membershipPlans.map((item, index) => (
                  <article className="entity-card admin-rule-card" key={item.id}>
                    <div className="admin-rule-grid">
                      <label>
                        <span>方案名称</span>
                        <input
                          value={item.title}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                title: event.target.value,
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>会员等级</span>
                        <select
                          value={item.membership}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                membership: event.target.value as MembershipPlanRule["membership"],
                              }),
                            }))
                          }
                        >
                          <option value="FREE">FREE</option>
                          <option value="BASIC">BASIC</option>
                          <option value="PRO">PRO</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                      </label>
                      <label>
                        <span>价格</span>
                        <input
                          type="number"
                          value={item.amountYuan}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                amountYuan: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>赠送点数</span>
                        <input
                          type="number"
                          value={item.pointsBonus}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                pointsBonus: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className="admin-rule-description">
                      <span>方案说明</span>
                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          setRules((current) => ({
                            ...current,
                            membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                              ...item,
                              description: event.target.value,
                            }),
                          }))
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel personal-center-panel">
              <div className="panel-header">
                <h2>点数包</h2>
                <span>Points Packages</span>
              </div>
              <div className="admin-rules-stack">
                {rules.pointsPackages.map((item, index) => (
                  <article className="entity-card admin-rule-card" key={item.id}>
                    <div className="admin-rule-grid">
                      <label>
                        <span>套餐名称</span>
                        <input
                          value={item.title}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                                ...item,
                                title: event.target.value,
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>点数数量</span>
                        <input
                          type="number"
                          value={item.pointsAmount}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                                ...item,
                                pointsAmount: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>价格</span>
                        <input
                          type="number"
                          value={item.amountYuan}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                                ...item,
                                amountYuan: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className="admin-rule-description">
                      <span>套餐说明</span>
                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          setRules((current) => ({
                            ...current,
                            pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                              ...item,
                              description: event.target.value,
                            }),
                          }))
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>

            <div className="personal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveRules()}
                disabled={isSavingRules}
              >
                {isSavingRules ? "保存中..." : "保存规则"}
              </button>
            </div>
          </div>
        )}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function updateMembershipPlan(list: MembershipPlanRule[], index: number, nextItem: MembershipPlanRule) {
  return list.map((item, currentIndex) => (currentIndex === index ? nextItem : item));
}

function updatePointsPackage(list: PointsPackageRule[], index: number, nextItem: PointsPackageRule) {
  return list.map((item, currentIndex) => (currentIndex === index ? nextItem : item));
}

function buildSkillDraft(item: SkillConfigRecord): SkillEditDraft {
  return {
    status: item.status,
    defaultModel: item.defaultModel,
    pointsCost: String(item.pointsCost),
    description: item.description,
  };
}

function buildSkillDrafts(list: SkillConfigRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildSkillDraft(item)])) as Record<string, SkillEditDraft>;
}

function buildPromptDraft(item: PromptTemplateRecord): PromptEditDraft {
  return {
    status: item.status,
    modelName: item.modelName,
    temperature: String(item.temperature),
    maxTokens: String(item.maxTokens),
    content: item.content,
  };
}

function buildPromptDrafts(list: PromptTemplateRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildPromptDraft(item)])) as Record<string, PromptEditDraft>;
}

function groupItemsByLabel<T>(items: T[], getLabel: (item: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const label = getLabel(item);
    const current = grouped.get(label) || [];
    current.push(item);
    grouped.set(label, current);
  }

  return Array.from(grouped.entries());
}

function buildKnowledgeBaseDraft(item: KnowledgeBaseRecord): KnowledgeBaseEditDraft {
  return {
    status: item.status,
    syncStatus: item.syncStatus,
    sourceType: item.sourceType,
    description: item.description,
  };
}

function buildKnowledgeBaseDrafts(list: KnowledgeBaseRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildKnowledgeBaseDraft(item)])) as Record<
    string,
    KnowledgeBaseEditDraft
  >;
}

function buildProviderDraft(item: ApiProviderRecord): ApiProviderEditDraft {
  return {
    status: item.status,
    baseUrl: item.baseUrl,
    tutorialUrl: item.tutorialUrl,
    modelWhitelist: item.modelWhitelist.join(", "),
    apiKey: item.apiKey,
    defaultModel: item.defaultModel,
    organization: item.organization,
    project: item.project,
    timeoutMs: String(item.timeoutMs || 60000),
    streamEnabled: item.streamEnabled,
    customHeadersJson: JSON.stringify(item.customHeaders || {}, null, 2),
    extraParamsJson: JSON.stringify(item.extraParams || {}, null, 2),
    remark: item.remark,
  };
}

function buildProviderDrafts(list: ApiProviderRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildProviderDraft(item)])) as Record<
    string,
    ApiProviderEditDraft
  >;
}

function buildCreateKnowledgeBaseDraft(): CreateKnowledgeBaseDraft {
  return {
    name: "",
    slug: "",
    sourceType: "MANUAL",
    description: "",
  };
}

function buildCreateApiProviderDraft(): CreateApiProviderDraft {
  return {
    name: "",
    providerType: "OPENAI",
    baseUrl: "",
    tutorialUrl: "",
    modelWhitelist: "",
    apiKey: "",
    defaultModel: "",
    organization: "",
    project: "",
    timeoutMs: "60000",
    streamEnabled: true,
    customHeadersJson: "{}",
    extraParamsJson: "{}",
    remark: "",
  };
}

function buildApiProviderPayload(
  draft: Pick<
    CreateApiProviderDraft,
    | "modelWhitelist"
    | "apiKey"
    | "defaultModel"
    | "organization"
    | "project"
    | "timeoutMs"
    | "streamEnabled"
    | "customHeadersJson"
    | "extraParamsJson"
    | "remark"
  >,
) {
  return {
    modelWhitelist: draft.modelWhitelist
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    apiKey: draft.apiKey.trim(),
    defaultModel: draft.defaultModel.trim(),
    organization: draft.organization.trim(),
    project: draft.project.trim(),
    timeoutMs: Math.max(0, Number(draft.timeoutMs || 0)),
    streamEnabled: draft.streamEnabled,
    customHeaders: parseProviderJsonMap(draft.customHeadersJson, "自定义 Headers"),
    extraParams: parseProviderJsonObject(draft.extraParamsJson, "扩展参数"),
    remark: draft.remark.trim(),
  };
}

function parseProviderModelWhitelist(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getProviderDefaultModelOptions(modelWhitelist: string, currentDefaultModel: string) {
  return Array.from(new Set([...parseProviderModelWhitelist(modelWhitelist), currentDefaultModel.trim()].filter(Boolean)));
}

function resolveProviderDefaultModel(modelWhitelist: string, currentDefaultModel: string) {
  const options = parseProviderModelWhitelist(modelWhitelist);
  const normalizedCurrent = currentDefaultModel.trim();
  if (!options.length) {
    return normalizedCurrent;
  }
  if (normalizedCurrent && options.includes(normalizedCurrent)) {
    return normalizedCurrent;
  }
  return options[0] || "";
}

function maskProviderSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "未配置";
  }
  if (trimmed.length <= 6) {
    return "*".repeat(trimmed.length);
  }
  return `${trimmed.slice(0, 3)}${"*".repeat(Math.min(12, trimmed.length - 6))}${trimmed.slice(-3)}`;
}

function parseProviderJsonMap(value: string, label: string): Record<string, string> {
  const parsed = parseProviderJsonObject(value, label);
  return Object.fromEntries(
    Object.entries(parsed).map(([key, item]) => [key, typeof item === "string" ? item : JSON.stringify(item)]),
  );
}

function parseProviderJsonObject(value: string, label: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} 必须是 JSON 对象`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `${label} 不是合法 JSON`);
  }
}

function buildCreateKnowledgeBaseFileDraft(): CreateKnowledgeBaseFileDraft {
  return {
    fileName: "",
    fileType: "PDF",
    sourceName: "",
    chunkCount: "0",
  };
}

function buildKnowledgeBaseFileCreateDrafts(list: KnowledgeBaseRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildCreateKnowledgeBaseFileDraft()])) as Record<
    string,
    CreateKnowledgeBaseFileDraft
  >;
}

function buildSyncRunDraft(run?: KnowledgeBaseSyncRunRecord): SyncRunEditDraft {
  return {
    summary: run?.summary || "",
    errorDetail: run?.errorDetail || "",
  };
}

function buildSyncRunDrafts(list: KnowledgeBaseSyncRunRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildSyncRunDraft(item)])) as Record<string, SyncRunEditDraft>;
}

function getSyncRunTitle(run: KnowledgeBaseSyncRunRecord) {
  if (run.scope === "FULL") {
    return "知识库全量同步";
  }
  return run.fileName || "文件同步任务";
}

function deriveKnowledgeBaseSyncStatus(files: KnowledgeBaseFileRecord[]): KnowledgeBaseRecord["syncStatus"] {
  if (!files.length) {
    return "IDLE";
  }
  if (files.some((item) => item.status === "FAILED")) {
    return "FAILED";
  }
  if (files.every((item) => item.status === "INDEXED")) {
    return "SUCCESS";
  }
  if (files.some((item) => item.status === "PENDING")) {
    return "IDLE";
  }
  return "SYNCING";
}

function buildKnowledgeBaseSummary(
  knowledgeBase: KnowledgeBaseRecord,
  files: KnowledgeBaseFileRecord[],
  updatedAt = new Date().toISOString(),
): KnowledgeBaseRecord {
  return {
    ...knowledgeBase,
    documentCount: files.length,
    chunkCount: files.reduce((sum, item) => sum + item.chunkCount, 0),
    syncStatus: deriveKnowledgeBaseSyncStatus(files),
    updatedAt,
  };
}

function getStatusClassName(status: "ACTIVE" | "DISABLED" | "DRAFT") {
  if (status === "ACTIVE") {
    return "status-ready";
  }
  if (status === "DISABLED") {
    return "status-paused";
  }
  return "status-in_progress";
}

function getStatusLabel(status: "ACTIVE" | "DISABLED" | "DRAFT") {
  if (status === "ACTIVE") {
    return "启用中";
  }
  if (status === "DISABLED") {
    return "已停用";
  }
  return "草稿";
}

function getSkillPrimaryMark(primaryId: string, label: string) {
  if (primaryId === "brand-growth") {
    return "策";
  }
  if (primaryId === "xiaohongshu") {
    return "红";
  }
  if (primaryId === "douyin") {
    return "抖";
  }
  return label.slice(0, 1);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
