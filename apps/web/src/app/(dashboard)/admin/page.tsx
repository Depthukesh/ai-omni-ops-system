"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SKILL_CENTER_TREE as DASHBOARD_SKILL_CENTER_TREE } from "../skill-center-config";
import {
  apiProviderSeed,
  archiveApiProvider,
  archiveKnowledgeBase,
  adminUserSeed,
  adminOrderSeed,
  billingRulesSeed,
  createApiProvider,
  createSkillPackageSkill,
  createSkillPromptBinding,
  createPromptTemplate,
  createSkillConfig,
  createThirdPartyPlatform,
  createKnowledgeBase,
  createKnowledgeBaseFile,
  deleteApiProvider,
  deleteThirdPartyPlatform,
  deleteKnowledgeBase,
  deleteKnowledgeBaseFile,
  completeKnowledgeBaseSyncRun,
  createReferenceAsset,
  createScriptAsset,
  getAdminOrders,
  getApiProviders,
  getKnowledgeBases,
  getKnowledgeBaseFiles,
  getKnowledgeBaseSyncRuns,
  getModuleDefinitions,
  getPromptTemplates,
  getAdminUsers,
  getBillingRules,
  getModelUsage,
  getSkillConfigs,
  installSkillConfig,
  getSkillPackage,
  getSkillPackages,
  getSkillPackageSkills,
  getSkillPromptBindings,
  getSkillPackageModules,
  getThirdPartyPlatforms,
  knowledgeBaseFileSeed,
  knowledgeBaseSyncRunSeed,
  knowledgeBaseSeed,
  moduleDefinitionSeed,
  modelUsageSeed,
  promptTemplateSeed,
  skillConfigSeed,
  skillAssetBindingSeed,
  skillPackageModuleSeed,
  skillPackageSeed,
  skillPackageSkillSeed,
  startKnowledgeBaseSync,
  syncKnowledgeBaseFile,
  updateApiProvider,
  updateKnowledgeBaseFile,
  updateKnowledgeBase,
  updatePromptTemplate,
  updateSkillConfig,
  updateBillingRules,
  updateThirdPartyPlatform,
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
  type ModuleDefinitionRecord,
  type PointsPackageRule,
  type PromptTemplateRecord,
  type SkillAssetBindingRecord,
  type SkillConfigRecord,
  type SkillPackageDetailRecord,
  type SkillPackageRecord,
  type SkillPackageModuleRecord,
  type SkillPackageSkillRecord,
  type ThirdPartyPlatformRecord,
} from "../../../services/admin";
import { getMe, logout as logoutSession, readAuthSession } from "../../../services/auth";
import { cancelOrder, payOrder, type OrderRecord } from "../../../services/personal-center";
import { ModuleDefinitionsPanel } from "./module-definitions-panel";
import { SkillPackageOverviewPanel } from "./skill-package-overview-panel";
import { UsersManagementPanel } from "./users-management-panel";

type AdminTab = "dashboard" | "orders" | "rules" | "users" | "usage" | "assets" | "modules" | "knowledge" | "providers";
type AdminSystemRole = "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
type SkillEditDraft = {
  status: SkillConfigRecord["status"];
  defaultModel: string;
  pointsCost: string;
  description: string;
  descriptionIntro: string;
  workflowSummary: string;
  inputSummary: string;
  outputSummary: string;
  referenceAssetKeys: string[];
  scriptAssetKeys: string[];
  hasReferenceAssetSelection: boolean;
  hasScriptAssetSelection: boolean;
};
type PromptEditDraft = {
  status: PromptTemplateRecord["status"];
  modelName: string;
  temperature: string;
  maxTokens: string;
  content: string;
};
type CreateSkillDraft = {
  name: string;
  slug: string;
  category: string;
  status: SkillConfigRecord["status"];
  provider: string;
  defaultModel: string;
  pointsCost: string;
  description: string;
  moduleKey: "NONE" | string;
  packageKey: "NONE" | string;
  promptScene: string;
  bindingRemarks: string;
};
type InstallSkillDraft = {
  sourceType: "GITHUB" | "ZIP_UPLOAD";
  githubUrl: string;
  archiveFileName: string;
  archiveBase64: string;
  category: string;
  status: SkillConfigRecord["status"];
  provider: string;
  defaultModel: string;
  pointsCost: string;
  descriptionPrefix: string;
  moduleKey: "NONE" | string;
  packageKey: "NONE" | string;
  promptScene: string;
  bindingRemarks: string;
};
type AssetsWorkspaceTab = "overview" | "skillZone";
type CreatePromptDraft = {
  name: string;
  scene: string;
  version: string;
  status: PromptTemplateRecord["status"];
  modelName: string;
  temperature: string;
  maxTokens: string;
  content: string;
  bindSkillSlug: "NONE" | string;
  bindingRemarks: string;
};
type KnowledgeBaseEditDraft = {
  status: KnowledgeBaseRecord["status"];
  syncStatus: KnowledgeBaseRecord["syncStatus"];
  sourceType: KnowledgeBaseRecord["sourceType"];
  description: string;
};
type ScopedModelOption = {
  value: string;
  label: string;
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
type ThirdPartyPlatformEditDraft = {
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  tutorialUrl: string;
  modelIds: string;
  defaultModel: string;
  remark: string;
};
type CreateThirdPartyPlatformDraft = {
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  tutorialUrl: string;
  modelIds: string;
  defaultModel: string;
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
  { key: "modules", label: "模块注册中心", shortLabel: "模块", description: "维护模块定义、入口路由、能力依赖和默认能力包摘要。" },
  { key: "knowledge", label: "知识库管理", shortLabel: "知识", description: "维护知识库启停状态、数据源类型、同步状态与文档规模。" },
  {
    key: "providers",
    label: "接口供应商",
    shortLabel: "接口",
    description: "按平台维护第三方接口链接、说明文档与模型 ID，前台 Owner 再填写当前账号私有 API Key。",
  },
];

const ADMIN_ROLE_TAB_MATRIX: Record<AdminSystemRole, AdminTab[]> = {
  SUPER_ADMIN: ["dashboard", "orders", "rules", "users", "usage", "assets", "modules", "knowledge", "providers"],
  ADMIN_OPERATOR: ["dashboard", "orders", "users", "usage", "assets", "modules", "knowledge", "providers"],
  FINANCE_OPERATOR: ["dashboard", "orders", "rules"],
  SUPPORT_OPERATOR: ["dashboard", "orders", "users", "usage"],
};

const SKILL_CENTER_TREE: SkillCenterPrimaryConfig[] = DASHBOARD_SKILL_CENTER_TREE;

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [activeSkillPrimaryId, setActiveSkillPrimaryId] = useState(SKILL_CENTER_TREE[0]?.id || "");
  const [activeSkillSectionId, setActiveSkillSectionId] = useState(SKILL_CENTER_TREE[0]?.sections[0]?.id || "");
  const [activeSkillLeafId, setActiveSkillLeafId] = useState(SKILL_CENTER_TREE[0]?.sections[0]?.items[0]?.id || "");
  const [skillModuleFilter, setSkillModuleFilter] = useState<"ALL" | string>("ALL");
  const [skillPackageFilter, setSkillPackageFilter] = useState<"ALL" | string>("ALL");
  const [skillKeywordFilter, setSkillKeywordFilter] = useState("");
  const [collapsedSkillPrimaryMap, setCollapsedSkillPrimaryMap] = useState<Record<string, boolean>>({});
  const [collapsedSkillSectionMap, setCollapsedSkillSectionMap] = useState<Record<string, boolean>>({});
  const [orders, setOrders] = useState<OrderRecord[]>(adminOrderSeed);
  const [rules, setRules] = useState<BillingRules>(billingRulesSeed);
  const [users, setUsers] = useState<AdminUserRecord[]>(adminUserSeed);
  const [usage, setUsage] = useState<ModelUsageRecord[]>(modelUsageSeed);
  const [skills, setSkills] = useState<SkillConfigRecord[]>(skillConfigSeed);
  const [prompts, setPrompts] = useState<PromptTemplateRecord[]>(promptTemplateSeed);
  const [modules, setModules] = useState<ModuleDefinitionRecord[]>(moduleDefinitionSeed);
  const [skillPackages, setSkillPackages] = useState<SkillPackageRecord[]>(skillPackageSeed);
  const [skillPackageModules, setSkillPackageModules] = useState<SkillPackageModuleRecord[]>(skillPackageModuleSeed);
  const [skillPackageSkills, setSkillPackageSkills] = useState<SkillPackageSkillRecord[]>(skillPackageSkillSeed);
  const [skillAssetBindings, setSkillAssetBindings] = useState<SkillAssetBindingRecord[]>(skillAssetBindingSeed);
  const [skillPackageDetailMap, setSkillPackageDetailMap] = useState<Record<string, SkillPackageDetailRecord>>({});
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>(knowledgeBaseSeed);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFileRecord[]>(knowledgeBaseFileSeed);
  const [knowledgeBaseSyncRuns, setKnowledgeBaseSyncRuns] = useState<KnowledgeBaseSyncRunRecord[]>(knowledgeBaseSyncRunSeed);
  const [knowledgeBaseSyncRunDrafts, setKnowledgeBaseSyncRunDrafts] = useState<Record<string, SyncRunEditDraft>>(
    buildSyncRunDrafts(knowledgeBaseSyncRunSeed),
  );
  const [providers, setProviders] = useState<ApiProviderRecord[]>(apiProviderSeed);
  const [thirdPartyPlatforms, setThirdPartyPlatforms] = useState<ThirdPartyPlatformRecord[]>([]);
  const [skillDrafts, setSkillDrafts] = useState<Record<string, SkillEditDraft>>(buildSkillDrafts(skillConfigSeed));
  const [promptDrafts, setPromptDrafts] = useState<Record<string, PromptEditDraft>>(buildPromptDrafts(promptTemplateSeed));
  const [knowledgeBaseDrafts, setKnowledgeBaseDrafts] = useState<Record<string, KnowledgeBaseEditDraft>>(
    buildKnowledgeBaseDrafts(knowledgeBaseSeed),
  );
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ApiProviderEditDraft>>(buildProviderDrafts(apiProviderSeed));
  const [platformDrafts, setPlatformDrafts] = useState<Record<string, ThirdPartyPlatformEditDraft>>({});
  const [newKnowledgeBase, setNewKnowledgeBase] = useState<CreateKnowledgeBaseDraft>(buildCreateKnowledgeBaseDraft());
  const [newKnowledgeBaseFileDrafts, setNewKnowledgeBaseFileDrafts] = useState<Record<string, CreateKnowledgeBaseFileDraft>>(
    buildKnowledgeBaseFileCreateDrafts(knowledgeBaseSeed),
  );
  const [newProvider, setNewProvider] = useState<CreateApiProviderDraft>(buildCreateApiProviderDraft());
  const [newThirdPartyPlatform, setNewThirdPartyPlatform] = useState<CreateThirdPartyPlatformDraft>(
    buildCreateThirdPartyPlatformDraft(),
  );
  const [newSkill, setNewSkill] = useState<CreateSkillDraft>(buildCreateSkillDraft());
  const [installSkillDraft, setInstallSkillDraft] = useState<InstallSkillDraft>(buildInstallSkillDraft());
  const [newPrompt, setNewPrompt] = useState<CreatePromptDraft>(buildCreatePromptDraft());
  const [activeAssetsWorkspaceTab, setActiveAssetsWorkspaceTab] = useState<AssetsWorkspaceTab>("overview");
  const [isCreateSkillModalOpen, setIsCreateSkillModalOpen] = useState(false);
  const [isInstallSkillModalOpen, setIsInstallSkillModalOpen] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const [providerStatusFilter, setProviderStatusFilter] = useState<ApiProviderRecord["status"] | "ALL">("ALL");
  const [providerTypeFilter, setProviderTypeFilter] = useState<ApiProviderRecord["providerType"] | "ALL">("ALL");
  const [createProviderSecretVisible, setCreateProviderSecretVisible] = useState(false);
  const [revealedProviderKeys, setRevealedProviderKeys] = useState<Record<string, boolean>>({});
  const [isCreatePromptModalOpen, setIsCreatePromptModalOpen] = useState(false);
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
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [isInstallingSkill, setIsInstallingSkill] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [loadingSkillAssetPackageId, setLoadingSkillAssetPackageId] = useState("");
  const [selectedThirdPartyPlatformId, setSelectedThirdPartyPlatformId] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [skillAssetLoadError, setSkillAssetLoadError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  async function handleLogout() {
    setNotice("");
    setErrorMessage("");
    setIsLoggingOut(true);
    try {
      await logoutSession();
      router.replace("/admin/login?next=/admin");
    } catch (error) {
      const message = error instanceof Error ? error.message : "退出登录失败";
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
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
    const canReadModules = allowedTabs.includes("modules");
    const canReadKnowledge = allowedTabs.includes("knowledge");
    const canReadProviders = allowedTabs.includes("providers");

    const [
      orderResult,
      rulesResult,
      userResult,
      usageResult,
      skillResult,
      promptResult,
      skillPackageResult,
      skillPromptBindingResult,
      moduleDefinitionResult,
      skillPackageModuleResult,
      skillPackageSkillResult,
      knowledgeBaseResult,
      knowledgeBaseFilesResult,
      knowledgeBaseSyncRunsResult,
      providerResult,
      thirdPartyPlatformResult,
    ] =
      await Promise.allSettled([
      canReadOrders ? getAdminOrders() : Promise.resolve([]),
      canReadRules ? getBillingRules() : Promise.resolve({ membershipPlans: [], pointsPackages: [] }),
      canReadUsers ? getAdminUsers() : Promise.resolve([]),
      canReadUsage ? getModelUsage() : Promise.resolve([]),
      canReadAssets ? getSkillConfigs() : Promise.resolve([]),
      canReadAssets ? getPromptTemplates() : Promise.resolve([]),
      canReadAssets ? getSkillPackages() : Promise.resolve([]),
      canReadAssets ? getSkillPromptBindings() : Promise.resolve([]),
      canReadModules ? getModuleDefinitions() : Promise.resolve([]),
      canReadAssets ? getSkillPackageModules() : Promise.resolve([]),
      canReadAssets ? getSkillPackageSkills() : Promise.resolve([]),
      canReadKnowledge ? getKnowledgeBases() : Promise.resolve([]),
      canReadKnowledge ? getKnowledgeBaseFiles() : Promise.resolve([]),
      canReadKnowledge ? getKnowledgeBaseSyncRuns() : Promise.resolve([]),
      canReadProviders ? getApiProviders() : Promise.resolve([]),
      canReadProviders ? getThirdPartyPlatforms() : Promise.resolve([]),
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

    if (skillPackageResult.status === "fulfilled") {
      setSkillPackages(skillPackageResult.value);
    } else {
      setSkillPackages(skillPackageSeed);
      usingSeed = true;
    }

    if (moduleDefinitionResult.status === "fulfilled") {
      setModules(moduleDefinitionResult.value);
    } else {
      setModules(moduleDefinitionSeed);
      usingSeed = true;
    }

    if (skillPackageModuleResult.status === "fulfilled") {
      setSkillPackageModules(skillPackageModuleResult.value);
    } else {
      setSkillPackageModules(skillPackageModuleSeed);
      usingSeed = true;
    }
    const resolvedSkillPackageModules =
      skillPackageModuleResult.status === "fulfilled" ? skillPackageModuleResult.value : skillPackageModuleSeed;
    const resolvedSkillPackageSkills =
      skillPackageSkillResult.status === "fulfilled" ? skillPackageSkillResult.value : skillPackageSkillSeed;
    if (skillPackageSkillResult.status === "fulfilled") {
      setSkillPackageSkills(skillPackageSkillResult.value);
    } else {
      setSkillPackageSkills(skillPackageSkillSeed);
      usingSeed = true;
    }
    if (skillPromptBindingResult.status === "fulfilled") {
      setSkillAssetBindings(
        mergeSkillAssetBindings(skillPromptBindingResult.value, resolvedSkillPackageSkills, resolvedSkillPackageModules),
      );
    } else {
      setSkillAssetBindings(
        mergeSkillAssetBindings(skillAssetBindingSeed, resolvedSkillPackageSkills, resolvedSkillPackageModules),
      );
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

    if (thirdPartyPlatformResult.status === "fulfilled") {
      setThirdPartyPlatforms(thirdPartyPlatformResult.value);
      setPlatformDrafts(buildThirdPartyPlatformDrafts(thirdPartyPlatformResult.value));
      setSelectedThirdPartyPlatformId((current) => current || thirdPartyPlatformResult.value[0]?.id || "");
    } else {
      const fallbackPlatforms = buildThirdPartyPlatformsFromProviders(
        providerResult.status === "fulfilled" ? providerResult.value : apiProviderSeed,
      );
      setThirdPartyPlatforms(fallbackPlatforms);
      setPlatformDrafts(buildThirdPartyPlatformDrafts(fallbackPlatforms));
      setSelectedThirdPartyPlatformId((current) => current || fallbackPlatforms[0]?.id || "");
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
    const nextDescription = composeSkillDescription(draft);

    setUpdatingSkillId(skillId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateSkillConfig(skillId, {
        status: draft.status,
        defaultModel: draft.defaultModel,
        pointsCost: Number(draft.pointsCost || 0),
        description: nextDescription,
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
                  description: nextDescription,
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
    }
  }

  function handleToggleInheritedReference(referenceKey: string, checked: boolean) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    const currentKeys = draft.hasReferenceAssetSelection
      ? draft.referenceAssetKeys
      : activeReferenceAssets.map((item) => item.referenceKey);
    const nextKeys = checked
      ? Array.from(new Set([...currentKeys, referenceKey]))
      : currentKeys.filter((item) => item !== referenceKey);
    handleSkillDraftChange(activeSkillConfig.id, {
      referenceAssetKeys: nextKeys,
      hasReferenceAssetSelection: true,
    });
  }

  function handleToggleInheritedScript(scriptKey: string, checked: boolean) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    const currentKeys = draft.hasScriptAssetSelection
      ? draft.scriptAssetKeys
      : activeScriptAssets.map((item) => item.scriptKey);
    const nextKeys = checked
      ? Array.from(new Set([...currentKeys, scriptKey]))
      : currentKeys.filter((item) => item !== scriptKey);
    handleSkillDraftChange(activeSkillConfig.id, {
      scriptAssetKeys: nextKeys,
      hasScriptAssetSelection: true,
    });
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

  function handlePlatformDraftChange(platformId: string, patch: Partial<ThirdPartyPlatformEditDraft>) {
    const base = thirdPartyPlatforms.find((item) => item.id === platformId);
    if (!base) {
      return;
    }
    setPlatformDrafts((current) => ({
      ...current,
      [platformId]: {
        ...(current[platformId] || buildThirdPartyPlatformDraft(base)),
        ...patch,
      },
    }));
  }

  async function handleSaveThirdPartyPlatform(platformId: string) {
    const currentPlatform = thirdPartyPlatforms.find((item) => item.id === platformId);
    const draft = platformDrafts[platformId];
    if (!currentPlatform || !draft) {
      return;
    }

    setUpdatingProviderId(platformId);
    setNotice("");
    setErrorMessage("");

    const payload = buildThirdPartyPlatformPayload(draft);

    try {
      const updated = await updateThirdPartyPlatform(platformId, payload);
      setThirdPartyPlatforms((current) => current.map((item) => (item.id === platformId ? updated : item)));
      setPlatformDrafts((current) => ({
        ...current,
        [platformId]: buildThirdPartyPlatformDraft(updated),
      }));
      setNotice(`第三方平台已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        const updated: ThirdPartyPlatformRecord = {
          ...currentPlatform,
          ...payload,
          updatedAt,
        };
        setThirdPartyPlatforms((current) => current.map((item) => (item.id === platformId ? updated : item)));
        setPlatformDrafts((current) => ({
          ...current,
          [platformId]: buildThirdPartyPlatformDraft(updated),
        }));
        setNotice("第三方平台已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "第三方平台保存失败";
      setErrorMessage(`第三方平台保存失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  async function handleDeleteThirdPartyPlatform(platformId: string) {
    setUpdatingProviderId(platformId);
    setNotice("");
    setErrorMessage("");

    try {
      const removed = await deleteThirdPartyPlatform(platformId);
      setThirdPartyPlatforms((current) => current.filter((item) => item.id !== platformId));
      setPlatformDrafts((current) => {
        const next = { ...current };
        delete next[platformId];
        return next;
      });
      setSelectedThirdPartyPlatformId((current) => (current === platformId ? "" : current));
      setNotice(`第三方平台已删除：${removed.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = thirdPartyPlatforms.find((item) => item.id === platformId);
        setThirdPartyPlatforms((current) => current.filter((item) => item.id !== platformId));
        setPlatformDrafts((current) => {
          const next = { ...current };
          delete next[platformId];
          return next;
        });
        setSelectedThirdPartyPlatformId((current) => (current === platformId ? "" : current));
        setNotice(`第三方平台已从本地演示数据删除：${removed?.name || platformId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "第三方平台删除失败";
      setErrorMessage(`第三方平台删除失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  async function handleCreateThirdPartyPlatform() {
    setIsCreatingProvider(true);
    setNotice("");
    setErrorMessage("");

    const payload = buildThirdPartyPlatformPayload(newThirdPartyPlatform);

    try {
      const created = await createThirdPartyPlatform(payload);
      setThirdPartyPlatforms((current) => [created, ...current]);
      setPlatformDrafts((current) => ({
        [created.id]: buildThirdPartyPlatformDraft(created),
        ...current,
      }));
      setSelectedThirdPartyPlatformId(created.id);
      setNewThirdPartyPlatform(buildCreateThirdPartyPlatformDraft());
      setNotice(`第三方平台已创建：${created.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const createdAt = new Date().toISOString();
        const created: ThirdPartyPlatformRecord = {
          id: `third_party_platform_local_${Date.now()}`,
          ...payload,
          updatedAt: createdAt,
        };
        setThirdPartyPlatforms((current) => [created, ...current]);
        setPlatformDrafts((current) => ({
          [created.id]: buildThirdPartyPlatformDraft(created),
          ...current,
        }));
        setSelectedThirdPartyPlatformId(created.id);
        setNewThirdPartyPlatform(buildCreateThirdPartyPlatformDraft());
        setNotice("第三方平台已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "第三方平台创建失败";
      setErrorMessage(`第三方平台创建失败：${message}`);
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
      providerCount: thirdPartyPlatforms.length,
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
      thirdPartyPlatforms.length,
    ],
  );
  const filteredThirdPartyPlatforms = useMemo(() => {
    const keyword = providerSearch.trim().toLowerCase();
    return thirdPartyPlatforms.filter((item) => {
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
        ...item.modelIds,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [providerSearch, providerStatusFilter, providerTypeFilter, thirdPartyPlatforms]);
  const providerInsights = useMemo(
    () => ({
      activeCount: thirdPartyPlatforms.filter((item) => item.status === "ACTIVE").length,
      draftCount: thirdPartyPlatforms.filter((item) => item.status === "DRAFT").length,
      disabledCount: thirdPartyPlatforms.filter((item) => item.status === "DISABLED").length,
      filteredCount: filteredThirdPartyPlatforms.length,
    }),
    [filteredThirdPartyPlatforms.length, thirdPartyPlatforms],
  );
  const createThirdPartyPlatformModelOptions = useMemo(
    () => getThirdPartyPlatformDefaultModelOptions(newThirdPartyPlatform.modelIds, newThirdPartyPlatform.defaultModel),
    [newThirdPartyPlatform.defaultModel, newThirdPartyPlatform.modelIds],
  );

  const accessibleTabs = tabs.filter((item) => {
    if (!adminSystemRole) {
      return item.key === "dashboard";
    }
    return ADMIN_ROLE_TAB_MATRIX[adminSystemRole].includes(item.key);
  });
  const resolvedActiveTab = accessibleTabs.some((item) => item.key === activeTab) ? activeTab : accessibleTabs[0]?.key || "dashboard";
  const activeTabMeta = accessibleTabs.find((item) => item.key === resolvedActiveTab) || accessibleTabs[0] || tabs[0];
  const adminPanelTools = (
    <div className="admin-panel-tools">
      <div className="workspace-status">
        <span className="archive-pill status-ready">{dataSource === "api" ? "真实接口" : "演示数据"}</span>
        <span className="status-text">{adminName ? `当前管理员：${adminName}` : "后台身份已验证"}</span>
        <span className="status-text">当前栏目：{activeTabMeta.label}</span>
      </div>
      <div className="admin-console-actions">
        <button type="button" className="secondary-button" onClick={() => void loadAdminData()} disabled={isLoading || isLoggingOut}>
          {isLoading ? "刷新中..." : "刷新后台数据"}
        </button>
        <button type="button" className="ghost-danger-button" onClick={() => void handleLogout()} disabled={isLoggingOut || isLoading}>
          {isLoggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>
    </div>
  );
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
  const skillModuleFilterOptions = useMemo(
    () =>
      modules.map((item) => ({
        value: item.moduleKey,
        label: item.moduleName,
      })),
    [modules],
  );
  const skillPackageFilterOptions = useMemo(() => {
    const packageMap = new Map<string, { label: string; packageId: string }>();
    skillPackageModules.forEach((item) => {
      packageMap.set(item.packageKey, {
        label: item.packageName,
        packageId: item.packageId,
      });
    });
    skillPackageSkills.forEach((item) => {
      packageMap.set(item.packageKey, {
        label: item.packageName,
        packageId: item.packageId,
      });
    });
    skillAssetBindingSeed.forEach((item) => {
      item.packageKeys.forEach((packageKey, index) => {
        if (!packageMap.has(packageKey)) {
          packageMap.set(packageKey, {
            label: item.packageNames[index] || packageKey,
            packageId: buildPackageIdFromKey(packageKey),
          });
        }
      });
    });
    return Array.from(packageMap.entries())
      .map(([value, meta]) => ({ value, label: meta.label, packageId: meta.packageId }))
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
  }, [skillPackageModules, skillPackageSkills]);
  const filteredSkillTree = useMemo(
    () =>
      SKILL_CENTER_TREE.map((primary) => ({
        ...primary,
        sections: primary.sections
          .map((section) => ({
            ...section,
            items: section.items.filter((leaf) => {
              const bindings = skillAssetBindings.filter(
                (item) =>
                  (leaf.skillSlug && item.skillSlug === leaf.skillSlug) ||
                  (leaf.promptScene && item.promptScene === leaf.promptScene),
              );
              const keyword = skillKeywordFilter.trim().toLowerCase();
              const keywordMatched = !keyword
                || [
                  leaf.label,
                  leaf.description,
                  leaf.skillSlug,
                  leaf.promptScene,
                  ...bindings.flatMap((item) => [...item.moduleKeys, ...item.packageKeys, ...item.packageNames]),
                ]
                  .join(" ")
                  .toLowerCase()
                  .includes(keyword);
              const moduleMatched =
                skillModuleFilter === "ALL" || bindings.some((item) => item.moduleKeys.includes(skillModuleFilter));
              const packageMatched =
                skillPackageFilter === "ALL" || bindings.some((item) => item.packageKeys.includes(skillPackageFilter));
              return keywordMatched && moduleMatched && packageMatched;
            }),
          }))
          .filter((section) => section.items.length > 0),
      })).filter((primary) => primary.sections.length > 0),
    [skillAssetBindings, skillKeywordFilter, skillModuleFilter, skillPackageFilter, skillPackageModules],
  );
  const filteredSkillLeafCount = useMemo(
    () => filteredSkillTree.reduce((total, primary) => total + primary.sections.reduce((sum, section) => sum + section.items.length, 0), 0),
    [filteredSkillTree],
  );
  const operationPulse = [
    { label: "订单履约", value: summary.orderCount ? Math.round((summary.paidCount / summary.orderCount) * 100) : 0 },
    { label: "知识同步", value: knowledgeBases.length ? Math.round((knowledgeBases.filter((item) => item.syncStatus === "SUCCESS").length / knowledgeBases.length) * 100) : 0 },
    { label: "接口健康", value: providers.length ? Math.round(providers.filter((item) => item.status === "ACTIVE").length / providers.length * 100) : 0 },
  ];
  const latestKnowledgeRun = knowledgeBaseSyncRuns[0];
  const activeSkillPrimary = filteredSkillTree.find((item) => item.id === activeSkillPrimaryId) || filteredSkillTree[0];
  const activeSkillSection = activeSkillPrimary?.sections.find((item) => item.id === activeSkillSectionId) || activeSkillPrimary?.sections[0];
  const activeSkillLeaf = activeSkillSection?.items.find((item) => item.id === activeSkillLeafId) || activeSkillSection?.items[0];
  const activeSkillBindings = skillAssetBindings.filter(
    (item) =>
      (activeSkillLeaf?.skillSlug && item.skillSlug === activeSkillLeaf.skillSlug) ||
      (activeSkillLeaf?.promptScene && item.promptScene === activeSkillLeaf.promptScene),
  );
  const activeExactPromptBinding = activeSkillBindings.find((item) => item.promptScene === activeSkillLeaf?.promptScene);
  const activePrimaryPromptBinding = activeSkillBindings.find((item) => item.isPrimary) || activeSkillBindings[0];
  const resolvedActivePromptScene = activeExactPromptBinding?.promptScene || activePrimaryPromptBinding?.promptScene || activeSkillLeaf?.promptScene;
  const activeSkillConfig = activeSkillLeaf?.skillSlug ? skills.find((item) => item.slug === activeSkillLeaf.skillSlug) : undefined;
  const activePromptConfig = resolvedActivePromptScene ? prompts.find((item) => item.scene === resolvedActivePromptScene) : undefined;
  const activeSkillDraft = activeSkillConfig ? skillDrafts[activeSkillConfig.id] || buildSkillDraft(activeSkillConfig) : undefined;
  const activePromptDraft = activePromptConfig ? promptDrafts[activePromptConfig.id] || buildPromptDraft(activePromptConfig) : undefined;
  const activeSkillModuleKeys = Array.from(new Set(activeSkillBindings.flatMap((item) => item.moduleKeys)));
  const activeSkillPackageKeys = Array.from(new Set(activeSkillBindings.flatMap((item) => item.packageKeys)));
  const activeSkillModules = modules.filter((item) => activeSkillModuleKeys.includes(item.moduleKey));
  const activeSkillModuleLabel = activeSkillModules.length
    ? activeSkillModules.map((item) => item.moduleName).join(" / ")
    : activeSkillModuleKeys.length
      ? activeSkillModuleKeys.join(" / ")
      : "-";
  const activeSkillPackageNames = Array.from(
    new Set([
      ...skillPackageSkills.filter((item) => activeSkillPackageKeys.includes(item.packageKey)).map((item) => item.packageName),
      ...skillPackageModules.filter((item) => activeSkillPackageKeys.includes(item.packageKey)).map((item) => item.packageName),
      ...activeSkillBindings.flatMap((item) => item.packageNames),
    ]),
  );
  const activeSkillPackageLabel = activeSkillPackageNames.length ? activeSkillPackageNames.join(" / ") : "-";
  const activeSkillBindingLabel =
    activeSkillBindings[0]?.remarks ||
    (activeSkillPackageNames.length || activeSkillModules.length ? "已建立技能归属映射" : "暂未建立技能归属映射");
  const activeSkillRelations = activeSkillConfig
    ? skillPackageSkills.filter((item) => item.skillSlug === activeSkillConfig.slug && item.enabled)
    : [];
  const activePrimarySkillRelation =
    activeSkillRelations.find((item) => activeSkillPackageKeys.includes(item.packageKey))
    || activeSkillRelations[0];
  const activeSkillPackageDetail = activePrimarySkillRelation
    ? skillPackageDetailMap[activePrimarySkillRelation.packageId]
    : undefined;
  const activeSkillFlow = activePrimarySkillRelation
    ? skillPackageSkills
      .filter((item) => item.packageKey === activePrimarySkillRelation.packageKey && item.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder)
    : [];
  const activeSkillFlowIndex = activePrimarySkillRelation
    ? activeSkillFlow.findIndex((item) => item.id === activePrimarySkillRelation.id)
    : -1;
  const upstreamSkillNames = activeSkillFlowIndex > 0
    ? activeSkillFlow.slice(0, activeSkillFlowIndex).map((item) => item.skillName || item.skillSlug)
    : [];
  const downstreamSkillNames =
    activeSkillFlowIndex >= 0
      ? activeSkillFlow.slice(activeSkillFlowIndex + 1).map((item) => item.skillName || item.skillSlug)
      : [];
  const activeOutputSummary = downstreamSkillNames.length
    ? `当前技能输出将继续传递给：${downstreamSkillNames.join(" -> ")}`
    : "当前技能输出为能力包终态输出，或进入人工审核 / 发布环节。";
  const activeReferenceAssets = activeSkillPackageDetail?.references || [];
  const activeScriptAssets = activeSkillPackageDetail?.scripts || [];
  const effectiveReferenceAssetKeys =
    activeSkillDraft?.hasReferenceAssetSelection
      ? activeSkillDraft.referenceAssetKeys
      : activeReferenceAssets.map((item) => item.referenceKey);
  const effectiveScriptAssetKeys =
    activeSkillDraft?.hasScriptAssetSelection
      ? activeSkillDraft.scriptAssetKeys
      : activeScriptAssets.map((item) => item.scriptKey);
  const activeSkillAssetSourceLabel = activePrimarySkillRelation?.packageName || activeSkillPackageLabel;
  const isLoadingActiveSkillAssets = !!activePrimarySkillRelation?.packageId && loadingSkillAssetPackageId === activePrimarySkillRelation.packageId;
  const activeKnowledgeBaseSummary = knowledgeBases.filter((item) => item.status === "ACTIVE").slice(0, 6).map((item) => item.name);
  const skillModelOptions = useMemo(
    () =>
      buildScopedModelOptions(
        providers,
        ...usage.map((item) => item.modelName),
        activeSkillDraft?.defaultModel,
        activePromptDraft?.modelName,
      ),
    [providers, usage, activePromptDraft?.modelName, activeSkillDraft?.defaultModel],
  );
  const createSkillProviderOptions = useMemo(
    () =>
      Array.from(new Set(providers.map((item) => item.name).filter(Boolean)))
        .map((name) => ({ value: name, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    [providers],
  );
  const createSkillModelOptions = useMemo(
    () => buildScopedModelOptions(providers, ...usage.map((item) => item.modelName), newSkill.defaultModel),
    [providers, usage, newSkill.defaultModel],
  );
  const createSkillCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          "内容生产",
          ...skills.map((item) => item.category),
          ...SKILL_CENTER_TREE.map((item) => item.label),
          ...SKILL_CENTER_TREE.flatMap((item) => item.sections.map((section) => section.label)),
        ].filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [skills],
  );
  const createSkillPromptSceneOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...prompts.map((item) => item.scene),
          ...SKILL_CENTER_TREE.flatMap((item) => item.sections.flatMap((section) => section.items.map((leaf) => leaf.promptScene || ""))),
          newSkill.promptScene,
        ].filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [newSkill.promptScene, prompts],
  );
  const skillCenterStatus = activePromptDraft?.status || activeSkillDraft?.status || "DRAFT";
  const skillCenterModel = activePromptDraft?.modelName || activeSkillDraft?.defaultModel || "";
  const skillCenterPointsCost = activeSkillDraft?.pointsCost || `${activeSkillConfig?.pointsCost || 180}`;
  const skillCenterUpdatedAt = activePromptConfig?.updatedAt || activeSkillConfig?.updatedAt;
  const skillCenterPromptValue = activePromptDraft?.content || "";
  const skillCenterName = activeSkillLeaf?.label || activePromptConfig?.name || activeSkillConfig?.name || "-";
  const skillCenterUpdatedAtLabel = skillCenterUpdatedAt ? formatDateTime(skillCenterUpdatedAt) : "自动更新";
  const isSkillPrimaryExpanded = (primaryId: string) => !collapsedSkillPrimaryMap[primaryId];
  const isSkillSectionExpanded = (primaryId: string, sectionId: string) =>
    !collapsedSkillSectionMap[buildAdminSkillSectionCollapseKey(primaryId, sectionId)];
  const isSavingSkillCenter =
    (activeSkillConfig ? updatingSkillId === activeSkillConfig.id : false) ||
    (activePromptConfig ? updatingPromptId === activePromptConfig.id : false);
  const selectedThirdPartyPlatform = useMemo(
    () =>
      thirdPartyPlatforms.find((item) => item.id === selectedThirdPartyPlatformId)
      ?? filteredThirdPartyPlatforms[0]
      ?? thirdPartyPlatforms[0],
    [filteredThirdPartyPlatforms, selectedThirdPartyPlatformId, thirdPartyPlatforms],
  );
  const selectedThirdPartyPlatformDraft = selectedThirdPartyPlatform
    ? platformDrafts[selectedThirdPartyPlatform.id] || buildThirdPartyPlatformDraft(selectedThirdPartyPlatform)
    : undefined;

  useEffect(() => {
    const nextPrimary = filteredSkillTree[0];
    const nextSection = nextPrimary?.sections[0];
    const nextLeaf = nextSection?.items[0];

    if (!nextPrimary || !nextSection || !nextLeaf) {
      setActiveSkillPrimaryId("");
      setActiveSkillSectionId("");
      setActiveSkillLeafId("");
      return;
    }

    const primaryExists = filteredSkillTree.some((item) => item.id === activeSkillPrimaryId);
    const sectionExists = nextPrimary.sections.some((item) => item.id === activeSkillSectionId);
    const leafExists = nextSection.items.some((item) => item.id === activeSkillLeafId);

    if (!primaryExists) {
      setActiveSkillPrimaryId(nextPrimary.id);
      setActiveSkillSectionId(nextSection.id);
      setActiveSkillLeafId(nextLeaf.id);
      return;
    }

    const currentPrimary = filteredSkillTree.find((item) => item.id === activeSkillPrimaryId) || nextPrimary;
    const currentSection = currentPrimary.sections.find((item) => item.id === activeSkillSectionId) || currentPrimary.sections[0];
    const currentLeaf = currentSection?.items.find((item) => item.id === activeSkillLeafId) || currentSection?.items[0];

    if (!sectionExists || !leafExists || !currentSection || !currentLeaf) {
      setActiveSkillPrimaryId(currentPrimary.id);
      setActiveSkillSectionId(currentSection?.id || nextSection.id);
      setActiveSkillLeafId(currentLeaf?.id || nextLeaf.id);
    }
  }, [activeSkillLeafId, activeSkillPrimaryId, activeSkillSectionId, filteredSkillTree]);

  useEffect(() => {
    if (dataSource !== "api") {
      setLoadingSkillAssetPackageId("");
      setSkillAssetLoadError("");
      return;
    }
    const packageId = activePrimarySkillRelation?.packageId;
    if (!packageId) {
      setLoadingSkillAssetPackageId("");
      setSkillAssetLoadError("");
      return;
    }
    if (skillPackageDetailMap[packageId] || loadingSkillAssetPackageId === packageId) {
      return;
    }

    let cancelled = false;
    setLoadingSkillAssetPackageId(packageId);
    setSkillAssetLoadError("");

    void getSkillPackage(packageId, {
      includeReferences: true,
      includeScripts: true,
    })
      .then((detail) => {
        if (cancelled) {
          return;
        }
        setSkillPackageDetailMap((current) => ({
          ...current,
          [packageId]: detail,
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "读取所属能力包资产失败";
        setSkillAssetLoadError(`所属能力包资产读取失败：${message}`);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSkillAssetPackageId((current) => (current === packageId ? "" : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activePrimarySkillRelation?.packageId, dataSource, loadingSkillAssetPackageId, skillPackageDetailMap]);

  useEffect(() => {
    if (!isCreateSkillModalOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCreatingSkill) {
        handleCloseCreateSkillModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateSkillModalOpen, isCreatingSkill]);

  useEffect(() => {
    if (!isInstallSkillModalOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isInstallingSkill) {
        handleCloseInstallSkillModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInstallSkillModalOpen, isInstallingSkill]);

  useEffect(() => {
    if (!isCreatePromptModalOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCreatingPrompt) {
        handleCloseCreatePromptModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreatePromptModalOpen, isCreatingPrompt]);

  useEffect(() => {
    if (!filteredThirdPartyPlatforms.length) {
      return;
    }
    if (!filteredThirdPartyPlatforms.find((item) => item.id === selectedThirdPartyPlatformId)) {
      setSelectedThirdPartyPlatformId(filteredThirdPartyPlatforms[0]?.id || "");
    }
  }, [filteredThirdPartyPlatforms, selectedThirdPartyPlatformId]);

  function handleSelectSkillPrimary(primaryId: string) {
    const nextPrimary = filteredSkillTree.find((item) => item.id === primaryId);
    if (!nextPrimary) {
      return;
    }
    const nextSection = nextPrimary.sections[0];
    const nextLeaf = nextSection?.items[0];
    setActiveSkillPrimaryId(nextPrimary.id);
    setCollapsedSkillPrimaryMap((current) => ({
      ...current,
      [nextPrimary.id]: false,
    }));
    if (nextSection) {
      setCollapsedSkillSectionMap((current) => ({
        ...current,
        [buildAdminSkillSectionCollapseKey(nextPrimary.id, nextSection.id)]: false,
      }));
    }
    setActiveSkillSectionId(nextSection?.id || "");
    setActiveSkillLeafId(nextLeaf?.id || "");
  }

  function handleSelectSkillSection(primaryId: string, sectionId: string) {
    const nextPrimary = filteredSkillTree.find((item) => item.id === primaryId);
    const nextSection = nextPrimary?.sections.find((item) => item.id === sectionId);
    if (!nextPrimary || !nextSection) {
      return;
    }
    setActiveSkillPrimaryId(nextPrimary.id);
    setCollapsedSkillPrimaryMap((current) => ({
      ...current,
      [nextPrimary.id]: false,
    }));
    setCollapsedSkillSectionMap((current) => ({
      ...current,
      [buildAdminSkillSectionCollapseKey(nextPrimary.id, nextSection.id)]: false,
    }));
    setActiveSkillSectionId(nextSection.id);
    setActiveSkillLeafId(nextSection.items[0]?.id || "");
  }

  function handleSelectSkillLeaf(primaryId: string, sectionId: string, leafId: string) {
    setActiveSkillPrimaryId(primaryId);
    setCollapsedSkillPrimaryMap((current) => ({
      ...current,
      [primaryId]: false,
    }));
    setCollapsedSkillSectionMap((current) => ({
      ...current,
      [buildAdminSkillSectionCollapseKey(primaryId, sectionId)]: false,
    }));
    setActiveSkillSectionId(sectionId);
    setActiveSkillLeafId(leafId);
  }

  function handleToggleSkillPrimary(primaryId: string) {
    setCollapsedSkillPrimaryMap((current) => ({
      ...current,
      [primaryId]: !current[primaryId],
    }));
  }

  function handleToggleSkillSection(primaryId: string, sectionId: string) {
    const key = buildAdminSkillSectionCollapseKey(primaryId, sectionId);
    setCollapsedSkillSectionMap((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleOpenCreateSkillModal() {
    setActiveAssetsWorkspaceTab("skillZone");
    setNewSkill(buildCreateSkillDraft());
    setIsCreateSkillModalOpen(true);
  }

  function handleCloseCreateSkillModal() {
    if (isCreatingSkill) {
      return;
    }
    setIsCreateSkillModalOpen(false);
    setNewSkill(buildCreateSkillDraft());
  }

  function handleOpenInstallSkillModal() {
    setActiveAssetsWorkspaceTab("skillZone");
    setInstallSkillDraft(buildInstallSkillDraft());
    setIsInstallSkillModalOpen(true);
  }

  function handleCloseInstallSkillModal() {
    if (isInstallingSkill) {
      return;
    }
    setIsInstallSkillModalOpen(false);
    setInstallSkillDraft(buildInstallSkillDraft());
  }

  function handleOpenCreatePromptModal() {
    setNewPrompt(buildCreatePromptDraft(activeSkillConfig?.slug));
    setIsCreatePromptModalOpen(true);
  }

  function handleCloseCreatePromptModal() {
    if (isCreatingPrompt) {
      return;
    }
    setIsCreatePromptModalOpen(false);
    setNewPrompt(buildCreatePromptDraft(activeSkillConfig?.slug));
  }

  function upsertSkillPackageSkillState(saved: SkillPackageSkillRecord) {
    setSkillPackageSkills((current) => [
      saved,
      ...current.filter(
        (item) =>
          item.id !== saved.id
          && !(item.skillId === saved.skillId && item.packageKey === saved.packageKey && item.bindingType === saved.bindingType),
      ),
    ]);
  }

  async function persistSkillPackageBinding(payload: {
    packageId: string;
    packageKey: string;
    packageName: string;
    skillId: string;
    skillSlug: string;
    bindingType?: SkillPackageSkillRecord["bindingType"];
    isDefault?: boolean;
    sortOrder?: number;
    enabled?: boolean;
    remarks?: string;
  }) {
    try {
      const saved = await createSkillPackageSkill({
        ...payload,
        bindingType: payload.bindingType || "DEFAULT",
        isDefault: payload.isDefault ?? true,
        sortOrder: payload.sortOrder ?? 100,
        enabled: payload.enabled ?? true,
      });
      upsertSkillPackageSkillState(saved);
      return saved;
    } catch (error) {
      if (dataSource === "seed") {
        const skillMeta = skills.find((item) => item.id === payload.skillId || item.slug === payload.skillSlug);
        const saved: SkillPackageSkillRecord = {
          id: `sps_local_${Date.now()}`,
          packageId: payload.packageId,
          packageKey: payload.packageKey,
          packageName: payload.packageName,
          skillId: payload.skillId,
          skillSlug: payload.skillSlug,
          bindingType: payload.bindingType || "DEFAULT",
          isDefault: payload.isDefault ?? true,
          sortOrder: payload.sortOrder ?? 100,
          enabled: payload.enabled ?? true,
          remarks: payload.remarks,
          skillName: skillMeta?.name,
          skillCategory: skillMeta?.category,
          skillStatus: skillMeta?.status,
          skillProvider: skillMeta?.provider,
          skillDefaultModel: skillMeta?.defaultModel,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        upsertSkillPackageSkillState(saved);
        return saved;
      }
      console.error("持久化能力包技能关系失败", error);
      return undefined;
    }
  }

  async function handleCreateSkill() {
    setIsCreatingSkill(true);
    setNotice("");
    setErrorMessage("");
    const requestedPromptScene = newSkill.promptScene.trim();
    const payload = {
      name: newSkill.name.trim(),
      slug: newSkill.slug.trim().toLowerCase(),
      category: newSkill.category.trim(),
      status: newSkill.status,
      provider: newSkill.provider.trim(),
      defaultModel: newSkill.defaultModel.trim(),
      pointsCost: Number(newSkill.pointsCost || 0),
      description: newSkill.description.trim(),
    };

    try {
      const created = await createSkillConfig(payload);
      setSkills((current) => [created, ...current]);
      setSkillDrafts((current) => ({ [created.id]: buildSkillDraft(created), ...current }));
      await upsertSkillAssetBinding(created, requestedPromptScene);
      setNotice(`技能已创建：${created.name}`);
      setActiveAssetsWorkspaceTab("skillZone");
      setIsCreateSkillModalOpen(false);
      setNewSkill(buildCreateSkillDraft());
      return;
    } catch (error) {
      if (dataSource === "seed") {
        const created: SkillConfigRecord = {
          id: `skill_local_${Date.now()}`,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        setSkills((current) => [created, ...current]);
        setSkillDrafts((current) => ({ [created.id]: buildSkillDraft(created), ...current }));
        await upsertSkillAssetBinding(created, requestedPromptScene);
        setNotice(`演示技能已创建：${created.name}`);
        setActiveAssetsWorkspaceTab("skillZone");
        setIsCreateSkillModalOpen(false);
        setNewSkill(buildCreateSkillDraft());
        return;
      }
      const message = error instanceof Error ? error.message : "创建技能失败";
      setErrorMessage(`创建技能失败：${message}`);
    } finally {
      setIsCreatingSkill(false);
    }
  }

  async function handleInstallSkillArchiveChange(file?: File | null) {
    if (!file) {
      setInstallSkillDraft((current) => ({
        ...current,
        archiveFileName: "",
        archiveBase64: "",
      }));
      return;
    }
    const base64 = await readFileAsBase64(file);
    setInstallSkillDraft((current) => ({
      ...current,
      archiveFileName: file.name,
      archiveBase64: base64,
    }));
  }

  async function handleInstallSkill() {
    setIsInstallingSkill(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await installSkillConfig({
        sourceType: installSkillDraft.sourceType,
        githubUrl: installSkillDraft.sourceType === "GITHUB" ? installSkillDraft.githubUrl.trim() : undefined,
        archiveFileName: installSkillDraft.sourceType === "ZIP_UPLOAD" ? installSkillDraft.archiveFileName : undefined,
        archiveBase64: installSkillDraft.sourceType === "ZIP_UPLOAD" ? installSkillDraft.archiveBase64 : undefined,
        category: installSkillDraft.category.trim(),
        provider: installSkillDraft.provider.trim(),
        defaultModel: installSkillDraft.defaultModel.trim(),
        status: installSkillDraft.status,
        pointsCost: Number(installSkillDraft.pointsCost || 0),
        descriptionPrefix: installSkillDraft.descriptionPrefix.trim() || undefined,
      });
      setSkills((current) => [result.skill, ...current]);
      setSkillDrafts((current) => ({ [result.skill.id]: buildSkillDraft(result.skill), ...current }));
      if (result.initialPrompt) {
        setPrompts((current) => [result.initialPrompt!, ...current.filter((item) => item.id !== result.initialPrompt!.id)]);
        setPromptDrafts((current) => ({ [result.initialPrompt!.id]: buildPromptDraft(result.initialPrompt!), ...current }));
      }
      const resolvedPromptScene = installSkillDraft.promptScene.trim() || result.initialPrompt?.scene || undefined;
      await upsertSkillAssetBinding(result.skill, resolvedPromptScene, {
        moduleKey: installSkillDraft.moduleKey,
        packageKey: installSkillDraft.packageKey,
        bindingRemarks: installSkillDraft.bindingRemarks,
      });
      const importedAssets = await importInstalledAssetsToPackage(installSkillDraft.packageKey, result);
      const parsedOverviewSummary = [
        result.parsedOverview.stepSummaries.length ? `解析步骤 ${result.parsedOverview.stepSummaries.length}` : "",
        result.parsedOverview.inputHints.length ? `输入要点 ${result.parsedOverview.inputHints.length}` : "",
        result.parsedOverview.outputHints.length ? `输出要点 ${result.parsedOverview.outputHints.length}` : "",
      ].filter(Boolean).join("，");
      setNotice(
        `技能已安装：${result.detectedSkillName}（References ${result.referenceFileCount}，Scripts ${result.scriptFileCount}${result.initialPrompt ? "，已生成初始提示词" : ""}${parsedOverviewSummary ? `，${parsedOverviewSummary}` : ""}${installSkillDraft.packageKey !== "NONE" ? `，已导入能力包资产 ${importedAssets.importedReferenceCount}/${result.referenceFileCount} References，${importedAssets.importedScriptCount}/${result.scriptFileCount} Scripts` : ""}）`,
      );
      setActiveAssetsWorkspaceTab("skillZone");
      setIsInstallSkillModalOpen(false);
      setInstallSkillDraft(buildInstallSkillDraft());
    } catch (error) {
      const message = error instanceof Error ? error.message : "安装技能失败";
      setErrorMessage(`安装技能失败：${message}`);
    } finally {
      setIsInstallingSkill(false);
    }
  }

  async function upsertSkillAssetBinding(
    created: SkillConfigRecord,
    promptSceneOverride?: string,
    bindingOptions?: {
      moduleKey: "NONE" | string;
      packageKey: "NONE" | string;
      bindingRemarks: string;
    },
  ) {
    const resolvedBinding = bindingOptions || {
      moduleKey: newSkill.moduleKey,
      packageKey: newSkill.packageKey,
      bindingRemarks: newSkill.bindingRemarks,
    };
    const packageMeta = skillPackageFilterOptions.find((item) => item.value === resolvedBinding.packageKey);
    const existingPrompt = promptSceneOverride ? prompts.find((item) => item.scene === promptSceneOverride) : undefined;
    const nextBinding = mergeSkillAssetBindingRecord(skillAssetBindings, {
      id: `sab_${created.slug}`,
      skillId: created.id,
      skillSlug: created.slug,
      skillName: created.name,
      promptId: existingPrompt?.id,
      promptScene: promptSceneOverride || undefined,
      promptName: existingPrompt?.name,
      bindingType: "PRIMARY",
      isPrimary: true,
      sortOrder: 100,
      enabled: true,
      moduleKeys: resolvedBinding.moduleKey !== "NONE" ? [resolvedBinding.moduleKey] : [],
      packageKeys: resolvedBinding.packageKey !== "NONE" ? [resolvedBinding.packageKey] : [],
      packageNames: resolvedBinding.packageKey !== "NONE" ? [packageMeta?.label || resolvedBinding.packageKey] : [],
      remarks: resolvedBinding.bindingRemarks.trim() || undefined,
    });
    setSkillAssetBindings((current) => [
      nextBinding,
      ...current.filter((item) => item.skillSlug !== created.slug),
    ]);
    if (resolvedBinding.packageKey !== "NONE") {
      await persistSkillPackageBinding({
        packageId: packageMeta?.packageId || buildPackageIdFromKey(resolvedBinding.packageKey),
        packageKey: resolvedBinding.packageKey,
        packageName: packageMeta?.label || resolvedBinding.packageKey,
        skillId: created.id,
        skillSlug: created.slug,
        bindingType: "DEFAULT",
        isDefault: true,
        sortOrder: 100,
        enabled: true,
        remarks: resolvedBinding.bindingRemarks.trim() || undefined,
      });
    }
    if (existingPrompt) {
      await persistSkillPromptBinding({
        skillId: created.id,
        skillSlug: created.slug,
        promptId: existingPrompt.id,
        promptScene: existingPrompt.scene,
        bindingType: "PRIMARY",
        isPrimary: true,
        sortOrder: 100,
        enabled: true,
        remarks: resolvedBinding.bindingRemarks.trim() || undefined,
      });
    }
  }

  async function importInstalledAssetsToPackage(
    packageKey: string,
    result: Awaited<ReturnType<typeof installSkillConfig>>,
  ) {
    if (packageKey === "NONE") {
      return {
        importedReferenceCount: 0,
        importedScriptCount: 0,
      };
    }
    const packageMeta = skillPackageFilterOptions.find((item) => item.value === packageKey);
    const packageId = packageMeta?.packageId || buildPackageIdFromKey(packageKey);
    let importedReferenceCount = 0;
    let importedScriptCount = 0;

    for (const reference of result.references) {
      try {
        await createReferenceAsset(packageId, {
          referenceKey: reference.referenceKey,
          title: reference.title,
          sourceType: reference.sourceType,
          sourceUri: reference.sourceUri,
          usageNote: reference.usageNote,
          applicableScopes: reference.applicableScopes,
          sortOrder: reference.sortOrder,
        });
        importedReferenceCount += 1;
      } catch {
        // Duplicate keys or package state issues should not break the whole install flow.
      }
    }

    for (const script of result.scripts) {
      try {
        await createScriptAsset(packageId, {
          scriptKey: script.scriptKey,
          scriptName: script.scriptName,
          runtime: script.runtime,
          entry: script.entry,
          usageNote: script.usageNote,
          sortOrder: script.sortOrder,
        });
        importedScriptCount += 1;
      } catch {
        // Duplicate keys or package state issues should not break the whole install flow.
      }
    }

    return {
      importedReferenceCount,
      importedScriptCount,
    };
  }

  async function handleCreatePrompt() {
    setIsCreatingPrompt(true);
    setNotice("");
    setErrorMessage("");
    const payload = {
      name: newPrompt.name.trim(),
      scene: newPrompt.scene.trim(),
      version: newPrompt.version.trim() || "v1.0",
      status: newPrompt.status,
      modelName: newPrompt.modelName.trim(),
      temperature: Number(newPrompt.temperature || 0.7),
      maxTokens: Number(newPrompt.maxTokens || 4000),
      content: newPrompt.content,
    };

    try {
      const created = await createPromptTemplate(payload);
      setPrompts((current) => [created, ...current]);
      setPromptDrafts((current) => ({ [created.id]: buildPromptDraft(created), ...current }));
      if (newPrompt.bindSkillSlug !== "NONE") {
        await upsertPromptBinding(newPrompt.bindSkillSlug, created.id, created.scene, created.name, newPrompt.bindingRemarks);
      }
      setNotice(`提示词模板已创建：${created.name}`);
      setIsCreatePromptModalOpen(false);
      setNewPrompt(buildCreatePromptDraft(activeSkillConfig?.slug));
      return;
    } catch (error) {
      if (dataSource === "seed") {
        const created: PromptTemplateRecord = {
          id: `prompt_local_${Date.now()}`,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        setPrompts((current) => [created, ...current]);
        setPromptDrafts((current) => ({ [created.id]: buildPromptDraft(created), ...current }));
        if (newPrompt.bindSkillSlug !== "NONE") {
          await upsertPromptBinding(newPrompt.bindSkillSlug, created.id, created.scene, created.name, newPrompt.bindingRemarks);
        }
        setNotice(`演示提示词模板已创建：${created.name}`);
        setIsCreatePromptModalOpen(false);
        setNewPrompt(buildCreatePromptDraft(activeSkillConfig?.slug));
        return;
      }
      const message = error instanceof Error ? error.message : "创建提示词模板失败";
      setErrorMessage(`创建提示词模板失败：${message}`);
    } finally {
      setIsCreatingPrompt(false);
    }
  }

  async function upsertPromptBinding(skillSlug: string, promptId: string, promptScene: string, promptName: string, remarks: string) {
    setSkillAssetBindings((current) => {
      const existed = current.find((item) => item.skillSlug === skillSlug);
      if (!existed) {
        return [
          {
            id: `sab_${skillSlug}_prompt`,
            promptId,
            skillSlug,
            promptScene,
            promptName,
            bindingType: "PRIMARY",
            isPrimary: true,
            sortOrder: 100,
            enabled: true,
            moduleKeys: [],
            packageKeys: [],
            packageNames: [],
            remarks: remarks.trim() || undefined,
          },
          ...current,
        ];
      }
      return current.map((item) =>
        item.skillSlug === skillSlug
          ? {
              ...item,
              promptId,
              promptScene,
              promptName,
              bindingType: "PRIMARY",
              isPrimary: true,
              sortOrder: item.sortOrder ?? 100,
              enabled: true,
              remarks: remarks.trim() || item.remarks,
            }
          : item,
      );
    });
    const skill = skills.find((item) => item.slug === skillSlug);
    if (!skill) {
      return;
    }
    await persistSkillPromptBinding({
      skillId: skill.id,
      skillSlug,
      promptId,
      promptScene,
      bindingType: "PRIMARY",
      isPrimary: true,
      sortOrder: 100,
      enabled: true,
      remarks: remarks.trim() || undefined,
    });
  }

  async function persistSkillPromptBinding(payload: {
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
    try {
      const saved = await createSkillPromptBinding(payload);
      setSkillAssetBindings((current) => [
        mergeSkillAssetBindingRecord(current, saved, skillPackageSkills, skillPackageModules),
        ...current.filter((item) => item.id !== saved.id && !(item.skillSlug === saved.skillSlug && item.promptId === saved.promptId)),
      ]);
      return saved;
    } catch (error) {
      if (dataSource === "seed") {
        return undefined;
      }
      const message = error instanceof Error ? error.message : "技能提示词绑定保存失败";
      setErrorMessage(message);
      return undefined;
    }
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
      <section className="admin-console-stack">
        <nav className="admin-console-nav" aria-label="后台导航">
          {accessibleTabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={`admin-console-tab ${resolvedActiveTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="admin-console-tab-title">{tab.label}</span>
            </button>
          ))}
        </nav>

        {notice ? <div className="admin-console-message success">{notice}</div> : null}
        {errorMessage ? <div className="admin-console-message error">{errorMessage}</div> : null}

        {activeTab === "dashboard" ? (
          <div className="admin-dashboard-stack">
            <section className="panel personal-center-panel admin-module-panel">
              <div className="admin-module-heading">
                <div>
                  <span className="admin-module-tag">{activeTabMeta.shortLabel}</span>
                  <h2>{activeTabMeta.label}</h2>
                </div>
                {adminPanelTools}
              </div>
            </section>
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
              {adminPanelTools}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px minmax(0, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <aside className="panel personal-center-panel admin-skill-tree-card admin-skill-tree-card--polished">
              <div className="admin-skill-card-topline">
                <span className="admin-skill-card-kicker">菜单</span>
                <span className="archive-pill status-ready">2 个板块</span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <button
                  type="button"
                  className={`admin-skill-primary-button${activeAssetsWorkspaceTab === "overview" ? " active" : ""}`}
                  onClick={() => setActiveAssetsWorkspaceTab("overview")}
                >
                  <span className="admin-skill-primary-mark">摘</span>
                  <span className="admin-skill-primary-button-copy">
                    <strong>能力包摘要</strong>
                    <small>仅查看能力包摘要</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`admin-skill-primary-button${activeAssetsWorkspaceTab === "skillZone" ? " active" : ""}`}
                  onClick={() => setActiveAssetsWorkspaceTab("skillZone")}
                >
                  <span className="admin-skill-primary-mark">技</span>
                  <span className="admin-skill-primary-button-copy">
                    <strong>技能专区</strong>
                    <small>技能目录与技能呈现</small>
                  </span>
                </button>
              </div>
            </aside>

            {activeAssetsWorkspaceTab === "overview" ? (
              <div>
                <SkillPackageOverviewPanel packages={skillPackages} modules={modules} skillPackageSkills={skillPackageSkills} />
              </div>
            ) : (
              <div
                className="admin-skill-center-layout"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(320px, 360px) minmax(0, 1fr)",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <aside className="panel personal-center-panel admin-skill-tree-card admin-skill-tree-card--polished admin-skill-tree-card--directory">
                  <div className="admin-skill-card-topline">
                    <span className="admin-skill-card-kicker">技能专区</span>
                    <span className="archive-pill status-ready">
                      {filteredSkillLeafCount} / {SKILL_CENTER_TREE.reduce((total, primary) => total + primary.sections.reduce((sum, section) => sum + section.items.length, 0), 0)} 项
                    </span>
                  </div>
                  <div className="personal-actions" style={{ marginBottom: 16 }}>
                    <button type="button" className="secondary-button" onClick={handleOpenInstallSkillModal}>
                      安装技能
                    </button>
                    <button type="button" className="primary-button" onClick={handleOpenCreateSkillModal}>
                      创建技能
                    </button>
                    <button type="button" className="secondary-button" onClick={handleOpenCreatePromptModal}>
                      创建提示词
                    </button>
                  </div>
                  <div className="admin-user-filter-grid" style={{ marginBottom: 16 }}>
                    <label>
                      <span>模块筛选</span>
                      <select value={skillModuleFilter} onChange={(event) => setSkillModuleFilter(event.target.value)}>
                        <option value="ALL">全部模块</option>
                        {skillModuleFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>能力包筛选</span>
                      <select value={skillPackageFilter} onChange={(event) => setSkillPackageFilter(event.target.value)}>
                        <option value="ALL">全部能力包</option>
                        {skillPackageFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ gridColumn: "1 / -1" }}>
                      <span>关键词</span>
                      <input
                        value={skillKeywordFilter}
                        placeholder="模块 / 能力包 / 技能 / 提示词"
                        onChange={(event) => setSkillKeywordFilter(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="personal-actions" style={{ marginBottom: 16 }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setSkillModuleFilter("ALL");
                        setSkillPackageFilter("ALL");
                        setSkillKeywordFilter("");
                      }}
                    >
                      重置筛选
                    </button>
                  </div>
                  <div className="admin-skill-primary-list">
                    {filteredSkillTree.map((primary) => {
                      const primaryActive = activeSkillPrimaryId === primary.id;
                      const primaryExpanded = isSkillPrimaryExpanded(primary.id);

                      return (
                        <div className={`entity-card admin-skill-primary-group${primaryExpanded ? " expanded" : ""}`} key={primary.id}>
                          <button
                            type="button"
                            className={`admin-skill-primary-button${primaryActive ? " active" : ""}`}
                            onClick={() => handleToggleSkillPrimary(primary.id)}
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
                                const sectionExpanded = isSkillSectionExpanded(primary.id, section.id);

                                return (
                                  <div className="entity-card admin-skill-tree-section" key={section.id}>
                                    <button
                                      type="button"
                                      className={`admin-skill-tree-section-button${sectionActive ? " active" : ""}`}
                                      onClick={() => handleToggleSkillSection(primary.id, section.id)}
                                    >
                                      <span className="admin-skill-tree-section-label">{section.label}</span>
                                      <small>{sectionExpanded ? "收起" : `${section.items.length}`}</small>
                                    </button>
                                    {sectionExpanded ? (
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
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {!filteredSkillTree.length ? <div className="admin-skill-empty">当前筛选条件下没有匹配的技能项。</div> : null}
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
                          <p>{activeSkillLeaf.description || activeSkillSection?.label || "技能分类"}</p>
                        </div>
                      </div>
                      <div className="personal-grid" style={{ marginBottom: 16 }}>
                        <SkillDimensionMetric label="当前技能" value={activeSkillConfig?.name || skillCenterName} />
                        <SkillDimensionMetric label="所在能力包" value={activePrimarySkillRelation?.packageName || activeSkillPackageLabel} />
                        <SkillDimensionMetric label="顺序位置" value={activeSkillFlowIndex >= 0 ? `${activeSkillFlowIndex + 1} / ${activeSkillFlow.length}` : "-"} />
                        <SkillDimensionMetric label="更新时间" value={skillCenterUpdatedAtLabel} />
                      </div>

                      <section className="entity-card" style={{ padding: 16, marginBottom: 16 }}>
                        <div className="entity-card-head">
                          <div>
                            <strong>输入项</strong>
                            <p className="personal-meta">聚合当前技能依赖的数据源、系统预设项、用户输入项、模型选择和上游技能输出。</p>
                          </div>
                        </div>
                        <div className="admin-skill-simple-grid">
                          <label className="admin-skill-field">
                            <span>所属模块</span>
                            <input value={activeSkillModuleLabel} readOnly />
                          </label>
                          <label className="admin-skill-field">
                            <span>所属能力包</span>
                            <input value={activePrimarySkillRelation?.packageName || activeSkillPackageLabel} readOnly />
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
                            <span>第三方模型</span>
                            <select value={skillCenterModel} onChange={(event) => handleSkillCenterModelChange(event.target.value)}>
                              {(skillModelOptions.length ? skillModelOptions : [buildFallbackScopedModelOption(skillCenterModel || "gpt-5.4-nano")]).map((option) => (
                                <option value={option.value} key={option.value}>
                                  {option.label}
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
                          <label className="admin-skill-field">
                            <span>提示词场景</span>
                            <input value={resolvedActivePromptScene || "-"} readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>数据库 / 知识库输入</span>
                            <input value={activeKnowledgeBaseSummary.join(" / ") || "知识库完成后在这里按技能选择；当前 first pass 先读取系统已启用知识库"} readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>输入项草稿</span>
                            <textarea
                              value={activeSkillDraft?.inputSummary || ""}
                              onChange={(event) => {
                                if (activeSkillConfig) {
                                  handleSkillDraftChange(activeSkillConfig.id, { inputSummary: event.target.value });
                                }
                              }}
                              placeholder="例如：品牌信息、营销日历、产品库、素材库、用户上传参考图、模型选择等。"
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>系统预设项</span>
                            <input value="账号角色 / 时长 / 风格 / 平台 / 任务模式（当前先以技能说明和分类继承）" readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>用户输入项</span>
                            <input value="用户要求 / 上传素材 / 参考图 / 参考文档（当前先由前台工作流和上传入口承接）" readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>上游技能输出</span>
                            <input value={upstreamSkillNames.join(" -> ") || "当前技能为首个步骤，没有上游技能输出"} readOnly />
                          </label>
                        </div>
                      </section>

                      <section className="entity-card" style={{ padding: 16, marginBottom: 16 }}>
                        <div className="entity-card-head">
                          <div>
                            <strong>提示词及其他元素</strong>
                            <p className="personal-meta">这里维护提示词版本、模型、References 资产、Scripts 资产等技能执行要素。</p>
                          </div>
                        </div>
                        <div className="admin-skill-simple-grid">
                          <label className="admin-skill-field">
                            <span>当前提示词</span>
                            <input value={skillCenterName} readOnly />
                          </label>
                          <label className="admin-skill-field">
                            <span>执行技能</span>
                            <input value={activeSkillConfig?.name || "-"} readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>References 来源</span>
                            <input
                              value={
                                activePrimarySkillRelation
                                  ? `${activeSkillAssetSourceLabel} / ${activeReferenceAssets.length} 项 / ${activeSkillDraft?.hasReferenceAssetSelection ? `已选 ${effectiveReferenceAssetKeys.length} 项` : "默认全继承"}`
                                  : "当前技能尚未绑定能力包，暂无可继承 References 资产"
                              }
                              readOnly
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>Scripts 来源</span>
                            <input
                              value={
                                activePrimarySkillRelation
                                  ? `${activeSkillAssetSourceLabel} / ${activeScriptAssets.length} 项 / ${activeSkillDraft?.hasScriptAssetSelection ? `已选 ${effectiveScriptAssetKeys.length} 项` : "默认全继承"}`
                                  : "当前技能尚未绑定能力包，暂无可继承 Scripts 资产"
                              }
                              readOnly
                            />
                          </label>
                        </div>
                        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                          {dataSource === "seed" ? (
                            <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                              当前为本地演示数据，技能真实资产仍以能力包详情页维护；切换到接口数据后，这里会自动展示所属能力包的 References / Scripts。
                            </div>
                          ) : null}
                          {!activePrimarySkillRelation ? (
                            <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                              当前技能尚未绑定能力包，因此还没有可复用的 References / Scripts 资产来源。
                            </div>
                          ) : null}
                          {isLoadingActiveSkillAssets ? (
                            <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                              正在读取所属能力包的真实资产...
                            </div>
                          ) : null}
                          {!isLoadingActiveSkillAssets && skillAssetLoadError ? (
                            <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                              {skillAssetLoadError}
                            </div>
                          ) : null}
                          {activePrimarySkillRelation && dataSource === "api" && !isLoadingActiveSkillAssets && !skillAssetLoadError ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                              <SkillAssetListCard
                                title="References 资产"
                                summary={activeSkillDraft?.hasReferenceAssetSelection ? "当前技能已从所属能力包资产中选择子集；保存后会随技能说明一起持久化。" : "当前技能默认继承所属能力包中的全部 References 资产；勾选后可收口为技能级选择。"}
                                emptyText="所属能力包当前还没有参考资料资产。"
                                items={activeReferenceAssets.map((item) => (
                                  <SkillReferenceAssetItem
                                    key={item.id}
                                    item={item}
                                    checked={effectiveReferenceAssetKeys.includes(item.referenceKey)}
                                    onChange={(checked) => handleToggleInheritedReference(item.referenceKey, checked)}
                                  />
                                ))}
                              />
                              <SkillAssetListCard
                                title="Scripts 资产"
                                summary={activeSkillDraft?.hasScriptAssetSelection ? "当前技能已从所属能力包脚本中选择子集；保存后会随技能说明一起持久化。" : "当前技能默认继承所属能力包中的全部 Scripts 资产；勾选后可收口为技能级选择。"}
                                emptyText="所属能力包当前还没有脚本资产。"
                                items={activeScriptAssets.map((item) => (
                                  <SkillScriptAssetItem
                                    key={item.id}
                                    item={item}
                                    checked={effectiveScriptAssetKeys.includes(item.scriptKey)}
                                    onChange={(checked) => handleToggleInheritedScript(item.scriptKey, checked)}
                                  />
                                ))}
                              />
                            </div>
                          ) : null}
                        </div>
                        <label className="admin-skill-field admin-skill-field--full">
                          <span>提示词内容</span>
                          <textarea
                            value={skillCenterPromptValue}
                            onChange={(event) => handleSkillCenterPromptChange(event.target.value)}
                            disabled={!activePromptConfig}
                            placeholder={activePromptConfig ? "正在加载提示词..." : "当前技能项尚未绑定提示词模板"}
                          />
                        </label>
                      </section>

                      <section className="entity-card" style={{ padding: 16 }}>
                        <div className="entity-card-head">
                          <div>
                            <strong>输出</strong>
                            <p className="personal-meta">当前技能输出会作为后续技能输入，或直接成为能力包最终产出。</p>
                          </div>
                        </div>
                        <div className="admin-skill-simple-grid">
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>技能链路</span>
                            <input value={activeSkillFlow.map((item) => item.skillName || item.skillSlug).join(" -> ") || "当前还没有配置能力包技能链路"} readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>步骤摘要</span>
                            <textarea
                              value={activeSkillDraft?.workflowSummary || ""}
                              onChange={(event) => {
                                if (activeSkillConfig) {
                                  handleSkillDraftChange(activeSkillConfig.id, { workflowSummary: event.target.value });
                                }
                              }}
                              placeholder="例如：1. 生成视频剧本 2. 生成故事板提示词 3. 生成故事板图片 4. 生成短视频。"
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>下游输出去向</span>
                            <input value={activeOutputSummary} readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>输出项草稿</span>
                            <textarea
                              value={activeSkillDraft?.outputSummary || ""}
                              onChange={(event) => {
                                if (activeSkillConfig) {
                                  handleSkillDraftChange(activeSkillConfig.id, { outputSummary: event.target.value });
                                }
                              }}
                              placeholder="例如：输出视频剧本、故事板提示词、故事板图片、短视频成片等。"
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>技能说明前言</span>
                            <textarea
                              value={activeSkillDraft?.descriptionIntro || ""}
                              onChange={(event) => {
                                if (activeSkillConfig) {
                                  handleSkillDraftChange(activeSkillConfig.id, { descriptionIntro: event.target.value });
                                }
                              }}
                              placeholder="用于补充技能定位、来源和通用说明。"
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>归属说明</span>
                            <input value={activeSkillBindingLabel} readOnly />
                          </label>
                        </div>
                      </section>
                      <div className="admin-skill-form-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleSaveSkillCenter()}
                          disabled={isSavingSkillCenter || (!activeSkillConfig && !activePromptConfig)}
                        >
                          {isSavingSkillCenter ? "保存中..." : "保存当前提示词"}
                        </button>
                      </div>
                    </article>
                  ) : (
                    <div className="admin-skill-empty">请先从左侧选择一个三级技能项。</div>
                  )}
                </section>
              </div>
            )}
            {isCreateSkillModalOpen ? (
              <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseCreateSkillModal}>
                <div
                  className="entity-card admin-user-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="创建技能"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-user-modal-topbar">
                    <div>
                      <span className="archive-pill status-ready">技能创建</span>
                      <strong>创建技能主功能单元</strong>
                      <p className="personal-meta">技能是主要功能实现单元；创建后再由能力包按顺序组合成完整功能链路。</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={handleCloseCreateSkillModal} disabled={isCreatingSkill}>
                      关闭
                    </button>
                  </div>
                  <div className="admin-skill-simple-grid">
                    <label className="admin-skill-field"><span>技能名称</span><input value={newSkill.name} placeholder="例如：公众号文章生成" onChange={(event) => setNewSkill((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>技能标识</span><input value={newSkill.slug} placeholder="例如：wechat-article-generator" onChange={(event) => setNewSkill((current) => ({ ...current, slug: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>分类</span><select value={newSkill.category} onChange={(event) => setNewSkill((current) => ({ ...current, category: event.target.value }))}>{createSkillCategoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label className="admin-skill-field"><span>状态</span><select value={newSkill.status} onChange={(event) => setNewSkill((current) => ({ ...current, status: event.target.value as SkillConfigRecord["status"] }))}><option value="ACTIVE">启用中</option><option value="DRAFT">草稿</option><option value="DISABLED">停用</option></select></label>
                    <label className="admin-skill-field"><span>供应商</span><select value={newSkill.provider} onChange={(event) => setNewSkill((current) => ({ ...current, provider: event.target.value }))}><option value="">请选择供应商</option>{createSkillProviderOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>默认模型</span><select value={newSkill.defaultModel} onChange={(event) => setNewSkill((current) => ({ ...current, defaultModel: event.target.value }))}><option value="">请选择模型</option>{createSkillModelOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>点数成本</span><input type="number" value={newSkill.pointsCost} onChange={(event) => setNewSkill((current) => ({ ...current, pointsCost: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>所属模块</span><select value={newSkill.moduleKey} onChange={(event) => setNewSkill((current) => ({ ...current, moduleKey: event.target.value }))}><option value="NONE">暂不绑定</option>{skillModuleFilterOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>所属能力包</span><select value={newSkill.packageKey} onChange={(event) => setNewSkill((current) => ({ ...current, packageKey: event.target.value }))}><option value="NONE">暂不绑定</option>{skillPackageFilterOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>提示词场景</span><select value={newSkill.promptScene} onChange={(event) => setNewSkill((current) => ({ ...current, promptScene: event.target.value }))}><option value="">稍后绑定</option>{createSkillPromptSceneOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>技能说明</span><textarea value={newSkill.description} onChange={(event) => setNewSkill((current) => ({ ...current, description: event.target.value }))} /></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>归属说明</span><textarea value={newSkill.bindingRemarks} onChange={(event) => setNewSkill((current) => ({ ...current, bindingRemarks: event.target.value }))} /></label>
                  </div>
                  <div className="personal-actions">
                    <button type="button" className="secondary-button" onClick={handleCloseCreateSkillModal} disabled={isCreatingSkill}>取消</button>
                    <button type="button" className="primary-button" onClick={() => void handleCreateSkill()} disabled={isCreatingSkill || !newSkill.name.trim() || !newSkill.slug.trim() || !newSkill.category.trim() || !newSkill.provider.trim() || !newSkill.defaultModel.trim()}>
                      {isCreatingSkill ? "创建中..." : "确认创建"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {isInstallSkillModalOpen ? (
              <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseInstallSkillModal}>
                <div
                  className="entity-card admin-user-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="安装技能"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-user-modal-topbar">
                    <div>
                      <span className="archive-pill status-ready">技能安装</span>
                      <strong>上传 zip 或 GitHub 链接安装技能</strong>
                      <p className="personal-meta">服务端会解析 `SKILL.md` 并自动创建技能，再按你的选择挂到模块、能力包和提示词场景。</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={handleCloseInstallSkillModal} disabled={isInstallingSkill}>
                      关闭
                    </button>
                  </div>
                  <div className="admin-skill-simple-grid">
                    <label className="admin-skill-field">
                      <span>安装来源</span>
                      <select
                        value={installSkillDraft.sourceType}
                        onChange={(event) =>
                          setInstallSkillDraft((current) => ({
                            ...current,
                            sourceType: event.target.value as InstallSkillDraft["sourceType"],
                            githubUrl: "",
                            archiveFileName: "",
                            archiveBase64: "",
                          }))
                        }
                      >
                        <option value="GITHUB">GitHub 链接</option>
                        <option value="ZIP_UPLOAD">技能压缩包</option>
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>分类</span>
                      <select value={installSkillDraft.category} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, category: event.target.value }))}>
                        {createSkillCategoryOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>状态</span>
                      <select value={installSkillDraft.status} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, status: event.target.value as SkillConfigRecord["status"] }))}>
                        <option value="ACTIVE">启用中</option>
                        <option value="DRAFT">草稿</option>
                        <option value="DISABLED">停用</option>
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>供应商</span>
                      <select value={installSkillDraft.provider} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, provider: event.target.value }))}>
                        <option value="">请选择供应商</option>
                        {createSkillProviderOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>默认模型</span>
                      <select value={installSkillDraft.defaultModel} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, defaultModel: event.target.value }))}>
                        <option value="">请选择模型</option>
                        {buildScopedModelOptions(providers, installSkillDraft.defaultModel).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>点数成本</span>
                      <input type="number" value={installSkillDraft.pointsCost} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, pointsCost: event.target.value }))} />
                    </label>
                    {installSkillDraft.sourceType === "GITHUB" ? (
                      <label className="admin-skill-field admin-skill-field--full">
                        <span>GitHub 技能目录链接</span>
                        <input
                          value={installSkillDraft.githubUrl}
                          placeholder="例如：https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-post-to-wechat"
                          onChange={(event) => setInstallSkillDraft((current) => ({ ...current, githubUrl: event.target.value }))}
                        />
                      </label>
                    ) : (
                      <label className="admin-skill-field admin-skill-field--full">
                        <span>技能压缩包</span>
                        <input
                          type="file"
                          accept=".zip,application/zip,application/x-zip-compressed"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleInstallSkillArchiveChange(file);
                          }}
                        />
                        <small className="personal-meta">{installSkillDraft.archiveFileName || "请上传单个技能目录压缩包，压缩包中必须包含 SKILL.md"}</small>
                      </label>
                    )}
                    <label className="admin-skill-field">
                      <span>所属模块</span>
                      <select value={installSkillDraft.moduleKey} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, moduleKey: event.target.value }))}>
                        <option value="NONE">暂不绑定</option>
                        {skillModuleFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>所属能力包</span>
                      <select value={installSkillDraft.packageKey} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, packageKey: event.target.value }))}>
                        <option value="NONE">暂不绑定</option>
                        {skillPackageFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>提示词场景</span>
                      <select value={installSkillDraft.promptScene} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, promptScene: event.target.value }))}>
                        <option value="">稍后绑定</option>
                        {createSkillPromptSceneOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field admin-skill-field--full">
                      <span>安装补充说明</span>
                      <textarea
                        value={installSkillDraft.descriptionPrefix}
                        placeholder="例如：从 AI CODING / GitHub 导入，用于后台技能中心自动安装。"
                        onChange={(event) => setInstallSkillDraft((current) => ({ ...current, descriptionPrefix: event.target.value }))}
                      />
                    </label>
                    <label className="admin-skill-field admin-skill-field--full">
                      <span>归属说明</span>
                      <textarea value={installSkillDraft.bindingRemarks} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, bindingRemarks: event.target.value }))} />
                    </label>
                  </div>
                  <div className="personal-actions">
                    <button type="button" className="secondary-button" onClick={handleCloseInstallSkillModal} disabled={isInstallingSkill}>取消</button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleInstallSkill()}
                      disabled={
                        isInstallingSkill
                        || !installSkillDraft.provider.trim()
                        || !installSkillDraft.defaultModel.trim()
                        || (installSkillDraft.sourceType === "GITHUB" && !installSkillDraft.githubUrl.trim())
                        || (installSkillDraft.sourceType === "ZIP_UPLOAD" && !installSkillDraft.archiveBase64.trim())
                      }
                    >
                      {isInstallingSkill ? "安装中..." : "开始安装"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {isCreatePromptModalOpen ? (
              <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseCreatePromptModal}>
                <div
                  className="entity-card admin-user-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="创建提示词模板"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-user-modal-topbar">
                    <div>
                      <span className="archive-pill status-ready">提示词创建</span>
                      <strong>创建提示词并绑定技能</strong>
                      <p className="personal-meta">创建完成后，如果绑定到某个技能，会立即替换该技能当前使用的提示词场景。</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={handleCloseCreatePromptModal} disabled={isCreatingPrompt}>
                      关闭
                    </button>
                  </div>
                  <div className="admin-skill-simple-grid">
                    <label className="admin-skill-field"><span>提示词名称</span><input value={newPrompt.name} onChange={(event) => setNewPrompt((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>提示词场景</span><input value={newPrompt.scene} onChange={(event) => setNewPrompt((current) => ({ ...current, scene: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>版本</span><input value={newPrompt.version} onChange={(event) => setNewPrompt((current) => ({ ...current, version: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>状态</span><select value={newPrompt.status} onChange={(event) => setNewPrompt((current) => ({ ...current, status: event.target.value as PromptTemplateRecord["status"] }))}><option value="ACTIVE">启用中</option><option value="DRAFT">草稿</option><option value="DISABLED">停用</option></select></label>
                    <label className="admin-skill-field"><span>模型</span><input value={newPrompt.modelName} onChange={(event) => setNewPrompt((current) => ({ ...current, modelName: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>温度</span><input type="number" value={newPrompt.temperature} onChange={(event) => setNewPrompt((current) => ({ ...current, temperature: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>最大 Tokens</span><input type="number" value={newPrompt.maxTokens} onChange={(event) => setNewPrompt((current) => ({ ...current, maxTokens: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>绑定技能</span><select value={newPrompt.bindSkillSlug} onChange={(event) => setNewPrompt((current) => ({ ...current, bindSkillSlug: event.target.value }))}><option value="NONE">暂不绑定</option>{skills.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>提示词内容</span><textarea value={newPrompt.content} onChange={(event) => setNewPrompt((current) => ({ ...current, content: event.target.value }))} /></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>绑定说明</span><textarea value={newPrompt.bindingRemarks} onChange={(event) => setNewPrompt((current) => ({ ...current, bindingRemarks: event.target.value }))} /></label>
                  </div>
                  <div className="personal-actions">
                    <button type="button" className="secondary-button" onClick={handleCloseCreatePromptModal} disabled={isCreatingPrompt}>取消</button>
                    <button type="button" className="primary-button" onClick={() => void handleCreatePrompt()} disabled={isCreatingPrompt || !newPrompt.name.trim() || !newPrompt.scene.trim() || !newPrompt.modelName.trim()}>
                      {isCreatingPrompt ? "创建中..." : "确认创建"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : activeTab === "modules" ? (
          <ModuleDefinitionsPanel
            modules={modules}
            skills={skills}
            dataSource={dataSource}
            onModulesChange={setModules}
            onNotice={setNotice}
            onError={setErrorMessage}
          />
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
                    <div className="personal-meta">支持先选择本地文件，自动带入文件名、类型和来源；当前阶段会先登记文件元数据。</div>
                    <div className="admin-rule-grid">
                      <label style={{ gridColumn: "span 2" }}>
                        <span>选择文件</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xlsx,.xls,.md,.markdown,.txt,.csv,.ppt,.pptx"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              return;
                            }
                            handleKnowledgeBaseFileDraftChange(item.id, buildKnowledgeBaseFileDraftFromFile(file));
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
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
            <div className="admin-provider-stack">
              <article className="panel admin-provider-filter-card">
                <div className="admin-provider-filter-head">
                  <div>
                    <strong>平台列表</strong>
                    <p>左侧按平台切换项目，右侧维护当前平台的链接、模型 ID、说明文档与备注；这里不再提供新建入口。</p>
                  </div>
                  <span className="archive-pill status_success">
                    {providerInsights.filteredCount}/{thirdPartyPlatforms.length}
                  </span>
                </div>
                <div className="admin-provider-filter-grid">
                  <label className="admin-provider-field">
                    <span>搜索平台</span>
                    <input
                      type="search"
                      name="admin-platform-search"
                      value={providerSearch}
                      placeholder="按平台名、模型 ID、Base URL、备注搜索"
                      onChange={(event) => setProviderSearch(event.target.value)}
                      autoComplete="off"
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
                <div className="personal-list" style={{ marginTop: 16 }}>
                  {filteredThirdPartyPlatforms.length ? (
                    filteredThirdPartyPlatforms.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="entity-card personal-card"
                        onClick={() => setSelectedThirdPartyPlatformId(item.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: item.id === selectedThirdPartyPlatform?.id ? "1px solid rgba(30, 64, 175, 0.45)" : undefined,
                          background: item.id === selectedThirdPartyPlatform?.id ? "rgba(239, 246, 255, 0.8)" : undefined,
                        }}
                      >
                        <div className="entity-card-head">
                          <div>
                            <strong>{item.name}</strong>
                            <p className="personal-meta">平台类型：{item.providerType}</p>
                          </div>
                          <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                        </div>
                        <div className="personal-grid">
                          <div>
                            <span>平台类型</span>
                            <strong>{item.providerType}</strong>
                          </div>
                          <div>
                            <span>模型数</span>
                            <strong>{item.modelIds.length}</strong>
                          </div>
                          <div>
                            <span>默认模型</span>
                            <strong>{item.defaultModel || "-"}</strong>
                          </div>
                          <div>
                            <span>更新时间</span>
                            <strong>{formatDateTime(item.updatedAt)}</strong>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-canvas-box">没有匹配的平台，可调整搜索条件后重试。</div>
                  )}
                </div>
              </article>
            </div>

            <section className="admin-provider-stack">
              {selectedThirdPartyPlatform && selectedThirdPartyPlatformDraft ? (
                <article className="panel admin-provider-card">
                  <div className="admin-provider-card-head">
                    <div>
                      <div className="admin-provider-title">
                        <strong>{selectedThirdPartyPlatform.name}</strong>
                        <span className="admin-provider-type">{selectedThirdPartyPlatform.providerType}</span>
                      </div>
                      <p className="admin-provider-meta">
                        更新于 {formatDateTime(selectedThirdPartyPlatform.updatedAt)}
                      </p>
                    </div>
                    <span className={`archive-pill ${getStatusClassName(selectedThirdPartyPlatform.status)}`}>
                      {selectedThirdPartyPlatform.status}
                    </span>
                  </div>

                  <div className="admin-provider-metrics">
                    <div>
                      <span>模型总数</span>
                      <strong>{selectedThirdPartyPlatform.modelIds.length}</strong>
                    </div>
                    <div>
                      <span>默认模型</span>
                      <strong>{selectedThirdPartyPlatform.defaultModel || "-"}</strong>
                    </div>
                    <div>
                      <span>说明文档</span>
                      <strong>{selectedThirdPartyPlatform.tutorialUrl ? "已配置" : "未配置"}</strong>
                    </div>
                    <div>
                      <span>数据源</span>
                      <strong>{dataSource === "api" ? "API" : "SEED"}</strong>
                    </div>
                  </div>

                  <div className="admin-provider-section">
                    <div className="admin-provider-section-head">
                      <strong>平台信息</strong>
                    </div>
                    <div className="admin-provider-grid">
                      <label className="admin-provider-field">
                        <span>平台名称</span>
                        <input
                          value={selectedThirdPartyPlatformDraft.name}
                          onChange={(event) =>
                            handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                              name: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="admin-provider-field">
                        <span>Provider 类型</span>
                        <select
                          value={selectedThirdPartyPlatformDraft.providerType}
                          onChange={(event) =>
                            handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                              providerType: event.target.value as ThirdPartyPlatformRecord["providerType"],
                            })
                          }
                        >
                          <option value="OPENAI">OPENAI</option>
                          <option value="GEMINI">GEMINI</option>
                          <option value="DOUBAO">DOUBAO</option>
                          <option value="CUSTOM">CUSTOM</option>
                        </select>
                      </label>
                      <label className="admin-provider-field">
                        <span>状态</span>
                        <select
                          value={selectedThirdPartyPlatformDraft.status}
                          onChange={(event) =>
                            handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                              status: event.target.value as ThirdPartyPlatformRecord["status"],
                            })
                          }
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                      </label>
                      <label className="admin-provider-field admin-provider-field--wide">
                        <span>第三方平台链接</span>
                        <input
                          value={selectedThirdPartyPlatformDraft.baseUrl}
                          onChange={(event) =>
                            handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                              baseUrl: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="admin-provider-field admin-provider-field--wide">
                        <span>说明文档</span>
                        <input
                          value={selectedThirdPartyPlatformDraft.tutorialUrl}
                          onChange={(event) =>
                            handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                              tutorialUrl: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="admin-provider-section">
                    <div className="admin-provider-section-head">
                      <strong>模型板块</strong>
                    </div>
                    <div className="admin-provider-grid">
                      <label className="admin-provider-field">
                        <span>默认模型</span>
                        <select
                          value={selectedThirdPartyPlatformDraft.defaultModel}
                          onChange={(event) =>
                            handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                              defaultModel: event.target.value,
                            })
                          }
                          disabled={!getThirdPartyPlatformDefaultModelOptions(
                            selectedThirdPartyPlatformDraft.modelIds,
                            selectedThirdPartyPlatformDraft.defaultModel,
                          ).length}
                        >
                          <option value="">
                            {getThirdPartyPlatformDefaultModelOptions(
                              selectedThirdPartyPlatformDraft.modelIds,
                              selectedThirdPartyPlatformDraft.defaultModel,
                            ).length
                              ? "请选择默认模型"
                              : "请先填写模型 ID"}
                          </option>
                          {getThirdPartyPlatformDefaultModelOptions(
                            selectedThirdPartyPlatformDraft.modelIds,
                            selectedThirdPartyPlatformDraft.defaultModel,
                          ).map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="admin-provider-field">
                        <span>当前模型预览</span>
                        <div className="admin-provider-chip-row">
                          {parseThirdPartyPlatformModelIds(selectedThirdPartyPlatformDraft.modelIds).length ? (
                            parseThirdPartyPlatformModelIds(selectedThirdPartyPlatformDraft.modelIds).map((model) => (
                              <span key={model} className="admin-provider-chip">
                                {model}
                              </span>
                            ))
                          ) : (
                            <span className="admin-provider-chip">未配置模型</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <label className="admin-provider-field admin-provider-field--full">
                      <span>大模型 ID（逗号分隔）</span>
                      <textarea
                        value={selectedThirdPartyPlatformDraft.modelIds}
                        onChange={(event) =>
                          handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                            modelIds: event.target.value,
                            defaultModel: resolveThirdPartyPlatformDefaultModel(
                              event.target.value,
                              selectedThirdPartyPlatformDraft.defaultModel,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="admin-provider-section">
                    <div className="admin-provider-section-head">
                      <strong>补充说明</strong>
                    </div>
                    <label className="admin-provider-field admin-provider-field--full">
                      <span>备注</span>
                      <textarea
                        value={selectedThirdPartyPlatformDraft.remark}
                        onChange={(event) =>
                          handlePlatformDraftChange(selectedThirdPartyPlatform.id, {
                            remark: event.target.value,
                          })
                        }
                      />
                    </label>
                    <small className="admin-provider-hint">
                      前端“个人中心-第三方接口配置”会同步这里的平台基线，只有 Owner 能在前台设置自己的 API Key。
                    </small>
                  </div>

                  <div className="admin-provider-actions">
                    {selectedThirdPartyPlatformDraft.baseUrl.trim() ? (
                      <a href={selectedThirdPartyPlatformDraft.baseUrl} target="_blank" rel="noreferrer" className="secondary-button">
                        第三方平台链接
                      </a>
                    ) : null}
                    {selectedThirdPartyPlatformDraft.tutorialUrl.trim() ? (
                      <a href={selectedThirdPartyPlatformDraft.tutorialUrl} target="_blank" rel="noreferrer" className="secondary-button">
                        打开说明文档
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSaveThirdPartyPlatform(selectedThirdPartyPlatform.id)}
                      disabled={updatingProviderId === selectedThirdPartyPlatform.id}
                    >
                      {updatingProviderId === selectedThirdPartyPlatform.id ? "保存中..." : "保存平台配置"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleDeleteThirdPartyPlatform(selectedThirdPartyPlatform.id)}
                      disabled={updatingProviderId === selectedThirdPartyPlatform.id}
                    >
                      删除平台
                    </button>
                  </div>
                </article>
              ) : (
                <article className="panel admin-provider-empty">
                  <strong>请选择左侧平台</strong>
                  <p>选中后可在右侧查看并维护平台链接、说明文档、模型 ID 和默认模型。</p>
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
  const parsed = parseSkillDescription(item.description);
  return {
    status: item.status,
    defaultModel: item.defaultModel,
    pointsCost: String(item.pointsCost),
    description: item.description,
    descriptionIntro: parsed.descriptionIntro,
    workflowSummary: parsed.workflowSummary,
    inputSummary: parsed.inputSummary,
    outputSummary: parsed.outputSummary,
    referenceAssetKeys: parsed.referenceAssetKeys,
    scriptAssetKeys: parsed.scriptAssetKeys,
    hasReferenceAssetSelection: parsed.hasReferenceAssetSelection,
    hasScriptAssetSelection: parsed.hasScriptAssetSelection,
  };
}

function buildSkillDrafts(list: SkillConfigRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildSkillDraft(item)])) as Record<string, SkillEditDraft>;
}

function parseSkillDescription(description: string) {
  const source = String(description || "").trim();
  const sections = {
    descriptionIntro: source,
    workflowSummary: "",
    inputSummary: "",
    outputSummary: "",
    referenceAssetKeys: [] as string[],
    scriptAssetKeys: [] as string[],
    hasReferenceAssetSelection: false,
    hasScriptAssetSelection: false,
  };
  if (!source) {
    return sections;
  }

  const markers = [
    { key: "workflowSummary", title: "步骤摘要：" },
    { key: "inputSummary", title: "输入要点：" },
    { key: "outputSummary", title: "输出要点：" },
    { key: "referenceAssetKeys", title: "References 资产：" },
    { key: "scriptAssetKeys", title: "Scripts 资产：" },
  ] as const;

  const positions = markers
    .map((item) => ({ ...item, index: source.indexOf(item.title) }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index);

  if (!positions.length) {
    return sections;
  }

  sections.descriptionIntro = source.slice(0, positions[0].index).trim();
  for (let index = 0; index < positions.length; index += 1) {
    const current = positions[index];
    const next = positions[index + 1];
    const body = source
      .slice(current.index + current.title.length, next?.index ?? source.length)
      .trim();
    if (current.key === "referenceAssetKeys" || current.key === "scriptAssetKeys") {
      const values = splitSkillAssetKeyLines(body);
      sections[current.key] = values;
      if (current.key === "referenceAssetKeys") {
        sections.hasReferenceAssetSelection = true;
      }
      if (current.key === "scriptAssetKeys") {
        sections.hasScriptAssetSelection = true;
      }
      continue;
    }
    sections[current.key] = normalizeSkillSectionBody(body);
  }
  return sections;
}

function composeSkillDescription(draft: SkillEditDraft) {
  const blocks = [
    draft.descriptionIntro.trim(),
    draft.workflowSummary.trim() ? `步骤摘要：\n${draft.workflowSummary.trim()}` : "",
    draft.inputSummary.trim() ? `输入要点：\n${draft.inputSummary.trim()}` : "",
    draft.outputSummary.trim() ? `输出要点：\n${draft.outputSummary.trim()}` : "",
    draft.hasReferenceAssetSelection ? `References 资产：\n${draft.referenceAssetKeys.join("\n")}` : "",
    draft.hasScriptAssetSelection ? `Scripts 资产：\n${draft.scriptAssetKeys.join("\n")}` : "",
  ].filter(Boolean);
  return blocks.join("\n\n");
}

function normalizeSkillSectionBody(value: string) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function splitSkillAssetKeyLines(value: string) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );
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

function SkillDimensionMetric(props: { label: string; value: string }) {
  return (
    <div>
      <span>{props.label}</span>
      <strong>{props.value || "-"}</strong>
    </div>
  );
}

function SkillAssetListCard(props: {
  title: string;
  summary?: string;
  emptyText: string;
  items: ReactNode[];
}) {
  return (
    <section className="entity-card" style={{ padding: 12 }}>
      <div className="entity-card-head" style={{ marginBottom: 12 }}>
        <div>
          <strong>{props.title}</strong>
          <p className="personal-meta">{props.summary || "当前展示的是技能所属能力包中的真实资产，后续再下沉为技能级真源对象。"}</p>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {props.items.length ? props.items : <div className="admin-skill-empty" style={{ marginTop: 0 }}>{props.emptyText}</div>}
      </div>
    </section>
  );
}

function SkillReferenceAssetItem(props: {
  item: NonNullable<SkillPackageDetailRecord["references"]>[number];
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const metaParts = [
    props.item.referenceKey,
    props.item.sourceType,
    props.item.applicableScopes.length ? `作用域：${props.item.applicableScopes.join(" / ")}` : "",
    Number.isFinite(props.item.sortOrder) ? `排序：${props.item.sortOrder}` : "",
  ].filter(Boolean);

  return (
    <div className="entity-card" style={{ padding: 12 }}>
      <label style={{ display: "grid", gap: 6, cursor: props.onChange ? "pointer" : "default" }}>
        {props.onChange ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(props.checked)}
              onChange={(event) => props.onChange?.(event.target.checked)}
            />
            <strong>{props.item.title}</strong>
          </span>
        ) : (
          <strong>{props.item.title}</strong>
        )}
        <span className="personal-meta">{metaParts.join(" · ")}</span>
        <span className="personal-meta">{props.item.usageNote || props.item.sourceUri || "暂无使用说明"}</span>
      </label>
    </div>
  );
}

function SkillScriptAssetItem(props: {
  item: NonNullable<SkillPackageDetailRecord["scripts"]>[number];
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const metaParts = [
    props.item.scriptKey,
    props.item.runtime,
    props.item.entry ? `入口：${props.item.entry}` : "",
    Number.isFinite(props.item.sortOrder) ? `排序：${props.item.sortOrder}` : "",
  ].filter(Boolean);
  const argsSummary =
    props.item.argsSchema && Object.keys(props.item.argsSchema).length
      ? `参数字段：${Object.keys(props.item.argsSchema).join(", ")}`
      : "暂无参数 schema";

  return (
    <div className="entity-card" style={{ padding: 12 }}>
      <label style={{ display: "grid", gap: 6, cursor: props.onChange ? "pointer" : "default" }}>
        {props.onChange ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(props.checked)}
              onChange={(event) => props.onChange?.(event.target.checked)}
            />
            <strong>{props.item.scriptName}</strong>
          </span>
        ) : (
          <strong>{props.item.scriptName}</strong>
        )}
        <span className="personal-meta">{metaParts.join(" · ")}</span>
        <span className="personal-meta">{props.item.usageNote || argsSummary}</span>
      </label>
    </div>
  );
}

type CreateSkillWorkspaceProps = {
  draft: CreateSkillDraft;
  isCreating: boolean;
  moduleOptions: Array<{ value: string; label: string }>;
  packageOptions: Array<{ value: string; label: string }>;
  providerOptions: Array<{ value: string; label: string }>;
  modelOptions: ScopedModelOption[];
  categoryOptions: string[];
  promptSceneOptions: string[];
  onChange: <K extends keyof CreateSkillDraft>(field: K, value: CreateSkillDraft[K]) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

function CreateSkillWorkspace(props: CreateSkillWorkspaceProps) {
  return (
    <section className="entity-card admin-user-filter-card">
      <div className="admin-user-filter-head">
        <div>
          <span className="archive-pill status-ready">技能创建</span>
          <h3>创建技能并登记归属</h3>
          <p>把高频字段改成下拉选择，优先完成技能本体、模块归属、能力包归属和提示词场景登记。</p>
        </div>
        <div className="admin-user-filter-summary">
          <div>
            <span>供应商</span>
            <strong>{props.providerOptions.length}</strong>
          </div>
          <div>
            <span>模型</span>
            <strong>{props.modelOptions.length}</strong>
          </div>
          <div>
            <span>提示词场景</span>
            <strong>{props.promptSceneOptions.length}</strong>
          </div>
        </div>
      </div>

      <div className="personal-meta" style={{ marginBottom: 16 }}>
        `References` 与知识库文件现在支持选择本地文件后自动带入字段；这里先把技能创建必填项尽量收口为选择器。
      </div>

      <div className="admin-skill-simple-grid">
        <label className="admin-skill-field">
          <span>技能名称</span>
          <input value={props.draft.name} placeholder="例如：公众号文章生成" onChange={(event) => props.onChange("name", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>技能标识</span>
          <input value={props.draft.slug} placeholder="例如：wechat-article-generator" onChange={(event) => props.onChange("slug", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>分类</span>
          <select value={props.draft.category} onChange={(event) => props.onChange("category", event.target.value)}>
            {props.categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>状态</span>
          <select value={props.draft.status} onChange={(event) => props.onChange("status", event.target.value as CreateSkillDraft["status"])}>
            <option value="ACTIVE">启用中</option>
            <option value="DRAFT">草稿</option>
            <option value="DISABLED">停用</option>
          </select>
        </label>
        <label className="admin-skill-field">
          <span>供应商</span>
          <select value={props.draft.provider} onChange={(event) => props.onChange("provider", event.target.value)}>
            <option value="">请选择供应商</option>
            {props.providerOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>默认模型</span>
          <select value={props.draft.defaultModel} onChange={(event) => props.onChange("defaultModel", event.target.value)}>
            <option value="">请选择模型</option>
            {props.modelOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>点数成本</span>
          <input type="number" value={props.draft.pointsCost} onChange={(event) => props.onChange("pointsCost", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>所属模块</span>
          <select value={props.draft.moduleKey} onChange={(event) => props.onChange("moduleKey", event.target.value)}>
            <option value="NONE">暂不绑定</option>
            {props.moduleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>所属能力包</span>
          <select value={props.draft.packageKey} onChange={(event) => props.onChange("packageKey", event.target.value)}>
            <option value="NONE">暂不绑定</option>
            {props.packageOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>提示词场景</span>
          <select value={props.draft.promptScene} onChange={(event) => props.onChange("promptScene", event.target.value)}>
            <option value="">稍后绑定</option>
            {props.promptSceneOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field admin-skill-field--full">
          <span>技能说明</span>
          <textarea value={props.draft.description} onChange={(event) => props.onChange("description", event.target.value)} />
        </label>
        <label className="admin-skill-field admin-skill-field--full">
          <span>归属说明</span>
          <textarea value={props.draft.bindingRemarks} onChange={(event) => props.onChange("bindingRemarks", event.target.value)} />
        </label>
      </div>

      <div className="personal-actions">
        <button type="button" className="secondary-button" onClick={props.onCancel} disabled={props.isCreating}>
          返回能力包摘要
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={props.onSubmit}
          disabled={
            props.isCreating
            || !props.draft.name.trim()
            || !props.draft.slug.trim()
            || !props.draft.category.trim()
            || !props.draft.provider.trim()
            || !props.draft.defaultModel.trim()
          }
        >
          {props.isCreating ? "创建中..." : "确认创建"}
        </button>
      </div>
    </section>
  );
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

function buildCreateSkillDraft(): CreateSkillDraft {
  return {
    name: "",
    slug: "",
    category: "内容生产",
    status: "DRAFT",
    provider: "",
    defaultModel: "",
    pointsCost: "120",
    description: "",
    moduleKey: "NONE",
    packageKey: "NONE",
    promptScene: "",
    bindingRemarks: "",
  };
}

function buildInstallSkillDraft(): InstallSkillDraft {
  return {
    sourceType: "GITHUB",
    githubUrl: "",
    archiveFileName: "",
    archiveBase64: "",
    category: "内容生产",
    status: "DRAFT",
    provider: "",
    defaultModel: "",
    pointsCost: "120",
    descriptionPrefix: "",
    moduleKey: "NONE",
    packageKey: "NONE",
    promptScene: "",
    bindingRemarks: "",
  };
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolvePromise, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const [, base64 = ""] = raw.split(",");
      resolvePromise(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("读取压缩包失败"));
    reader.readAsDataURL(file);
  });
}

function buildCreatePromptDraft(bindSkillSlug: string | undefined = undefined): CreatePromptDraft {
  return {
    name: "",
    scene: "",
    version: "v1.0",
    status: "DRAFT",
    modelName: "",
    temperature: "0.7",
    maxTokens: "4000",
    content: "",
    bindSkillSlug: bindSkillSlug || "NONE",
    bindingRemarks: "",
  };
}

function buildPackageIdFromKey(packageKey: string) {
  return `sp_${String(packageKey || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")}`;
}

function mergeSkillAssetBindings(
  records: SkillAssetBindingRecord[],
  skillPackageSkills: SkillPackageSkillRecord[] = [],
  skillPackageModules: SkillPackageModuleRecord[] = [],
) {
  return records.map((item) =>
    mergeSkillAssetBindingRecord(skillAssetBindingSeed, item, skillPackageSkills, skillPackageModules),
  );
}

function mergeSkillAssetBindingRecord(
  existingList: SkillAssetBindingRecord[],
  incoming: SkillAssetBindingRecord,
  skillPackageSkills: SkillPackageSkillRecord[] = [],
  skillPackageModules: SkillPackageModuleRecord[] = [],
): SkillAssetBindingRecord {
  const matched =
    existingList.find((item) => incoming.id && item.id === incoming.id)
    || existingList.find((item) => incoming.skillSlug && item.skillSlug === incoming.skillSlug)
    || skillAssetBindingSeed.find((item) => incoming.skillSlug && item.skillSlug === incoming.skillSlug)
    || skillAssetBindingSeed.find((item) => incoming.promptScene && item.promptScene === incoming.promptScene);
  const resolvedSkillSlug = incoming.skillSlug || matched?.skillSlug;
  const relatedPackageBindings = resolvedSkillSlug
    ? skillPackageSkills.filter((item) => item.skillSlug === resolvedSkillSlug && item.enabled)
    : [];
  const packageNameMap = new Map<string, string>();
  matched?.packageKeys?.forEach((packageKey, index) => {
    packageNameMap.set(packageKey, matched.packageNames[index] || packageKey);
  });
  incoming.packageKeys?.forEach((packageKey, index) => {
    packageNameMap.set(packageKey, incoming.packageNames?.[index] || packageKey);
  });
  relatedPackageBindings.forEach((item) => {
    packageNameMap.set(item.packageKey, item.packageName);
  });
  const resolvedPackageKeys = Array.from(
    new Set([
      ...(incoming.packageKeys || []),
      ...relatedPackageBindings.map((item) => item.packageKey),
      ...(matched?.packageKeys || []),
    ]),
  );
  const derivedModuleKeys = relatedPackageBindings.flatMap((item) =>
    skillPackageModules
      .filter((relation) => relation.packageKey === item.packageKey && relation.enabled)
      .map((relation) => relation.moduleKey),
  );
  const resolvedModuleKeys = Array.from(
    new Set([...(incoming.moduleKeys || []), ...derivedModuleKeys, ...(matched?.moduleKeys || [])]),
  );

  return {
    id: incoming.id || matched?.id || `sab_${incoming.skillSlug || incoming.promptScene || Date.now()}`,
    skillId: incoming.skillId || matched?.skillId,
    skillSlug: incoming.skillSlug || matched?.skillSlug,
    skillName: incoming.skillName || matched?.skillName,
    promptId: incoming.promptId || matched?.promptId,
    promptScene: incoming.promptScene || matched?.promptScene,
    promptName: incoming.promptName || matched?.promptName,
    bindingType: incoming.bindingType || matched?.bindingType || "PRIMARY",
    isPrimary: incoming.isPrimary ?? matched?.isPrimary ?? true,
    sortOrder: incoming.sortOrder ?? matched?.sortOrder ?? 100,
    enabled: incoming.enabled ?? matched?.enabled ?? true,
    moduleKeys: resolvedModuleKeys,
    packageKeys: resolvedPackageKeys,
    packageNames: resolvedPackageKeys.map((packageKey) => packageNameMap.get(packageKey) || packageKey),
    remarks: incoming.remarks ?? matched?.remarks,
  };
}

function buildThirdPartyPlatformDraft(item: ThirdPartyPlatformRecord): ThirdPartyPlatformEditDraft {
  return {
    name: item.name,
    providerType: item.providerType,
    status: item.status,
    baseUrl: item.baseUrl,
    tutorialUrl: item.tutorialUrl,
    modelIds: item.modelIds.join(", "),
    defaultModel: item.defaultModel,
    remark: item.remark,
  };
}

function buildThirdPartyPlatformDrafts(list: ThirdPartyPlatformRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildThirdPartyPlatformDraft(item)])) as Record<
    string,
    ThirdPartyPlatformEditDraft
  >;
}

function buildCreateThirdPartyPlatformDraft(): CreateThirdPartyPlatformDraft {
  return {
    name: "",
    providerType: "OPENAI",
    status: "DRAFT",
    baseUrl: "",
    tutorialUrl: "",
    modelIds: "",
    defaultModel: "",
    remark: "",
  };
}

function buildThirdPartyPlatformPayload(
  draft: Pick<
    CreateThirdPartyPlatformDraft,
    "name" | "providerType" | "status" | "baseUrl" | "tutorialUrl" | "modelIds" | "defaultModel" | "remark"
  >,
) {
  const modelIds = parseThirdPartyPlatformModelIds(draft.modelIds);
  return {
    name: draft.name.trim(),
    providerType: draft.providerType,
    status: draft.status,
    baseUrl: draft.baseUrl.trim(),
    tutorialUrl: draft.tutorialUrl.trim(),
    modelIds,
    defaultModel: resolveThirdPartyPlatformDefaultModel(draft.modelIds, draft.defaultModel),
    remark: draft.remark.trim(),
  };
}

function parseThirdPartyPlatformModelIds(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getThirdPartyPlatformDefaultModelOptions(modelIds: string, currentDefaultModel: string) {
  return Array.from(new Set([...parseThirdPartyPlatformModelIds(modelIds), currentDefaultModel.trim()].filter(Boolean)));
}

function resolveThirdPartyPlatformDefaultModel(modelIds: string, currentDefaultModel: string) {
  const options = parseThirdPartyPlatformModelIds(modelIds);
  const normalizedCurrent = currentDefaultModel.trim();
  if (!options.length) {
    return normalizedCurrent;
  }
  if (normalizedCurrent && options.includes(normalizedCurrent)) {
    return normalizedCurrent;
  }
  return options[0] || "";
}

function buildThirdPartyPlatformsFromProviders(list: ApiProviderRecord[]): ThirdPartyPlatformRecord[] {
  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      providerType: ThirdPartyPlatformRecord["providerType"];
      statuses: Set<ThirdPartyPlatformRecord["status"]>;
      baseUrl: string;
      tutorialUrl: string;
      modelIds: Set<string>;
      defaultModel: string;
      remark: string;
      updatedAt: string;
    }
  >();

  for (const item of list) {
    const normalizedBaseUrl = normalizeThirdPartyPlatformBaseUrl(item.baseUrl);
    const key = normalizedBaseUrl || item.id;
    const current = grouped.get(key);
    if (current) {
      current.statuses.add(item.status);
      item.modelWhitelist.forEach((model) => current.modelIds.add(model));
      if (!current.defaultModel && item.defaultModel.trim()) {
        current.defaultModel = item.defaultModel.trim();
      }
      if (!current.tutorialUrl && item.tutorialUrl.trim()) {
        current.tutorialUrl = item.tutorialUrl.trim();
      }
      if (!current.remark && item.remark.trim()) {
        current.remark = item.remark.trim();
      }
      if (new Date(item.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
        current.updatedAt = item.updatedAt;
      }
      continue;
    }

    grouped.set(key, {
      id: `third_party_platform_fallback_${grouped.size + 1}`,
      name: resolveThirdPartyPlatformName(item.baseUrl, item.name),
      providerType: item.providerType,
      statuses: new Set([item.status]),
      baseUrl: item.baseUrl.trim(),
      tutorialUrl: item.tutorialUrl.trim(),
      modelIds: new Set(item.modelWhitelist.map((model) => model.trim()).filter(Boolean)),
      defaultModel: item.defaultModel.trim(),
      remark: item.remark.trim(),
      updatedAt: item.updatedAt,
    });
  }

  return Array.from(grouped.values())
    .map<ThirdPartyPlatformRecord>((item) => {
      const modelIds = Array.from(item.modelIds);
      const defaultModel = modelIds.includes(item.defaultModel) ? item.defaultModel : modelIds[0] || "";
      return {
        id: item.id,
        name: item.name,
        providerType: item.providerType,
        status: resolveThirdPartyPlatformStatus(item.statuses),
        baseUrl: item.baseUrl,
        tutorialUrl: item.tutorialUrl,
        modelIds,
        defaultModel,
        remark: item.remark,
        updatedAt: item.updatedAt,
      };
    })
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function normalizeThirdPartyPlatformBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "").toLowerCase();
}

function resolveThirdPartyPlatformName(baseUrl: string, fallbackName: string) {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return fallbackName.trim() || "第三方平台";
  }
  try {
    const host = new URL(trimmed).host.toLowerCase();
    const hostNameMap: Record<string, string> = {
      "www.right.codes": "Right Codes 平台",
      "api.deepseek.com": "DeepSeek 平台",
      "ark.cn-beijing.volces.com": "火山方舟平台",
      "api.moonshot.cn": "Kimi 平台",
      "open.bigmodel.cn": "GLM 平台",
    };
    return hostNameMap[host] || fallbackName.trim() || host;
  } catch {
    return fallbackName.trim() || trimmed;
  }
}

function resolveThirdPartyPlatformStatus(
  statuses: Set<ThirdPartyPlatformRecord["status"]>,
): ThirdPartyPlatformRecord["status"] {
  if (statuses.has("ACTIVE")) {
    return "ACTIVE";
  }
  if (statuses.has("DRAFT")) {
    return "DRAFT";
  }
  return "DISABLED";
}

function buildScopedModelOptions(providers: ApiProviderRecord[], ...extraValues: Array<string | undefined>): ScopedModelOption[] {
  const optionsByValue = new Map<string, ScopedModelOption>();
  for (const provider of providers) {
    const models = Array.from(
      new Set([provider.defaultModel, ...provider.modelWhitelist].map((item) => String(item || "").trim()).filter(Boolean)),
    );
    for (const modelName of models) {
      const value = `${provider.id}::${modelName}`;
      optionsByValue.set(value, {
        value,
        label: `${modelName} · ${provider.name}`,
      });
    }
  }
  for (const rawValue of extraValues) {
    const value = String(rawValue || "").trim();
    if (!value || optionsByValue.has(value)) {
      continue;
    }
    optionsByValue.set(value, buildFallbackScopedModelOption(value));
  }
  return Array.from(optionsByValue.values()).sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
}

function buildFallbackScopedModelOption(value: string): ScopedModelOption {
  const normalized = String(value || "").trim();
  const separatorIndex = normalized.indexOf("::");
  if (separatorIndex <= 0) {
    return {
      value: normalized,
      label: normalized,
    };
  }
  const providerId = normalized.slice(0, separatorIndex).trim();
  const modelName = normalized.slice(separatorIndex + 2).trim();
  return {
    value: normalized,
    label: `${modelName} · ${providerId}`,
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

function buildKnowledgeBaseFileDraftFromFile(file: File): Partial<CreateKnowledgeBaseFileDraft> {
  return {
    fileName: file.name,
    fileType: inferKnowledgeBaseFileType(file.name),
    sourceName: "LOCAL_UPLOAD",
  };
}

function inferKnowledgeBaseFileType(fileName: string): KnowledgeBaseFileRecord["fileType"] {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".doc") || normalized.endsWith(".docx")) {
    return "DOCX";
  }
  if (normalized.endsWith(".xls") || normalized.endsWith(".xlsx") || normalized.endsWith(".csv")) {
    return "XLSX";
  }
  if (normalized.endsWith(".md") || normalized.endsWith(".markdown") || normalized.endsWith(".txt")) {
    return "MD";
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return "LINK";
  }
  return "PDF";
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

function buildAdminSkillSectionCollapseKey(primaryId: string, sectionId: string) {
  return `${primaryId}::${sectionId}`;
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
