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
  createKnowledgeBinding,
  deleteApiProvider,
  deleteThirdPartyPlatform,
  deleteKnowledgeBase,
  deleteKnowledgeBaseFile,
  deleteKnowledgeBinding,
  completeKnowledgeBaseSyncRun,
  createReferenceAsset,
  createScriptAsset,
  getAdminOrders,
  getApiProviders,
  getKnowledgeBindings,
  getKnowledgeBases,
  getKnowledgeBaseFileChunks,
  getKnowledgeBaseFileEmbeddings,
  getKnowledgeBaseFiles,
  getKnowledgeRetrievalConfigs,
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
  knowledgeBindingSeed,
  knowledgeRetrievalConfigSeed,
  knowledgeBaseSyncRunSeed,
  knowledgeBaseSeed,
  moduleDefinitionSeed,
  modelUsageSeed,
  promptTemplateSeed,
  runKnowledgeRetrievalTest,
  skillConfigSeed,
  skillAssetBindingSeed,
  skillPackageModuleSeed,
  skillPackageSeed,
  skillPackageSkillSeed,
  startKnowledgeBaseSync,
  syncKnowledgeBaseFile,
  updateApiProvider,
  updateKnowledgeBaseFile,
  updateKnowledgeBinding,
  updateKnowledgeRetrievalConfig,
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
  type KnowledgeBindingRecord,
  type KnowledgeBaseRecord,
  type KnowledgeChunkRecord,
  type KnowledgeEmbeddingRecord,
  type KnowledgeRetrievalConfigRecord,
  type KnowledgeBaseSyncMutationResult,
  type KnowledgeBaseRunMutationResult,
  type KnowledgeRetrievalTestResultRecord,
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
import { getBrandArchive, type BrandArchiveBundle } from "../../../services/brand-growth";
import { cancelOrder, payOrder, type OrderRecord } from "../../../services/personal-center";
import {
  getDouyinMarketingPlanWorkspace,
  getDouyinOriginalCopyWorkspace,
  getDouyinRemixCopyWorkspace,
  getXiaohongshuMarketingPlanWorkspace,
  getXiaohongshuMarketingCalendarWorkspace,
} from "../../../services/reports";
import { ModuleDefinitionsPanel } from "./module-definitions-panel";
import { UsersManagementPanel } from "./users-management-panel";

type AdminTab = "dashboard" | "orders" | "rules" | "users" | "usage" | "assets" | "modules" | "knowledge" | "providers";
type AdminSystemRole = "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
type KnowledgeWorkspaceSection = "overview" | "files" | "retrieval" | "bindings" | "history";
type SkillEditDraft = {
  status: SkillConfigRecord["status"];
  defaultModel: string;
  pointsCost: string;
  description: string;
  descriptionIntro: string;
  workflowSummary: string;
  inputSummary: string;
  outputSummary: string;
  databaseInputs: DatabaseInputConfig[];
  knowledgeInputs: KnowledgeInputConfig[];
  customInputs: CustomInputConfig[];
  referenceAssetKeys: string[];
  scriptAssetKeys: string[];
  hasReferenceAssetSelection: boolean;
  hasScriptAssetSelection: boolean;
};
type DatabaseInputConfig = {
  id: string;
  parameterType: "INJECT_TOGGLE" | "SELECT_CHOICE";
  parameterKey: string;
  parameterLabel: string;
  selectedValue: string;
  remarks: string;
};
type KnowledgeInputConfig = {
  id: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  targetContentId: string;
  targetContentLabel: string;
  remarks: string;
};
type KnowledgeContentOption = {
  value: string;
  label: string;
};
type CustomInputConfig = {
  id: string;
  inputType: "SELECT" | "TEXT" | "FILE";
  label: string;
  required: boolean;
  options: string[];
  placeholder: string;
  acceptedFileTypes: string;
  remarks: string;
};
type DatabaseInjectParameterOption = {
  value: string;
  label: string;
};
type DatabaseSelectParameterOption = {
  value: string;
  label: string;
  emptyLabel: string;
};
type DatabaseParameterSyncedOption = {
  value: string;
  label: string;
};
type DatabaseParameterSyncState = {
  brandArchive?: BrandArchiveBundle;
  injectCounts: Record<string, number>;
  selectOptions: Record<string, DatabaseParameterSyncedOption[]>;
  summary: string[];
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
type AssetsWorkspaceTab = "skillZone";
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
type KnowledgeBindingEditDraft = {
  targetKey: string;
  targetName: string;
  priority: string;
  retrievalMode: KnowledgeBindingRecord["retrievalMode"];
  isRequired: boolean;
  enabled: boolean;
};
type KnowledgeRetrievalConfigEditDraft = {
  defaultTopK: string;
  recallMode: KnowledgeRetrievalConfigRecord["recallMode"];
  rerankEnabled: boolean;
  rerankModelName: string;
  chunkSize: string;
  chunkOverlap: string;
  retrievalThreshold: string;
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
type KnowledgeFileDebugState = {
  chunks: KnowledgeChunkRecord[];
  embeddings: KnowledgeEmbeddingRecord[];
  isLoading: boolean;
  error: string;
  loadedAt?: string;
};
type KnowledgeRetrievalTestDraft = {
  query: string;
  topK: string;
};
type CreateKnowledgeBindingDraft = {
  bindingType: KnowledgeBindingRecord["bindingType"];
  targetId: string;
  targetKey: string;
  targetName: string;
  priority: string;
  retrievalMode: KnowledgeBindingRecord["retrievalMode"];
  isRequired: boolean;
  enabled: boolean;
};
type KnowledgeBindingTargetOption = {
  targetId: string;
  targetKey: string;
  targetName: string;
  description?: string;
};

function isBrandBridgeKnowledgeBase(knowledgeBase?: KnowledgeBaseRecord) {
  if (!knowledgeBase) {
    return false;
  }
  return (
    knowledgeBase.id.startsWith("kb_brand_business_assets_")
    || knowledgeBase.slug.startsWith("brand-business-assets-")
    || knowledgeBase.description.includes("鍓嶇鈥滀紒涓氱煡璇嗗簱鈥濋〉闈㈣嚜鍔ㄥ悓姝?)
  );
}

function getKnowledgeBaseContainerLabel(knowledgeBase: KnowledgeBaseRecord) {
  return isBrandBridgeKnowledgeBase(knowledgeBase) ? "鍓嶇浼佷笟鐭ヨ瘑搴撳鍣? : "鐙珛鐭ヨ瘑搴撳鍣?;
}

function getKnowledgeBindingDisplayName(binding: KnowledgeBindingRecord) {
  return binding.targetName || binding.targetKey || binding.targetId;
}

function getKnowledgeBaseStatusLabel(status: KnowledgeBaseRecord["status"]) {
  if (status === "ACTIVE") {
    return "鍚敤涓?;
  }
  if (status === "DISABLED") {
    return "宸插仠鐢?;
  }
  return "鑽夌";
}

function getKnowledgeSourceTypeLabel(sourceType: KnowledgeBaseRecord["sourceType"]) {
  if (sourceType === "FEISHU") {
    return "椋炰功";
  }
  if (sourceType === "NOTION") {
    return "Notion";
  }
  if (sourceType === "OSS") {
    return "瀵硅薄瀛樺偍";
  }
  return "鎵嬪姩缁存姢";
}

function getKnowledgeSyncStatusLabel(status: KnowledgeBaseRecord["syncStatus"]) {
  if (status === "SUCCESS") {
    return "鍚屾鎴愬姛";
  }
  if (status === "SYNCING") {
    return "鍚屾涓?;
  }
  if (status === "FAILED") {
    return "鍚屾澶辫触";
  }
  return "寰呭悓姝?;
}

function getKnowledgeRunResultLabel(result: KnowledgeBaseSyncRunRecord["result"]) {
  if (result === "SUCCESS") {
    return "鎴愬姛";
  }
  if (result === "FAILED") {
    return "澶辫触";
  }
  return "杩涜涓?;
}

function getKnowledgeBindingTypeLabel(bindingType: KnowledgeBindingRecord["bindingType"]) {
  if (bindingType === "SKILL_PACKAGE") {
    return "鑳藉姏鍖?;
  }
  if (bindingType === "PROMPT") {
    return "鎻愮ず璇?;
  }
  if (bindingType === "WORKFLOW_STEP") {
    return "宸ヤ綔娴佹楠?;
  }
  return "妯″潡";
}

function getKnowledgeRetrievalModeLabel(mode: KnowledgeBindingRecord["retrievalMode"] | KnowledgeRetrievalConfigRecord["recallMode"]) {
  if (mode === "SEMANTIC") {
    return "璇箟鍙洖";
  }
  if (mode === "MANUAL") {
    return "浜哄伐鎸囧畾";
  }
  return "娣峰悎鍙洖";
}

function getKnowledgeYesNoLabel(value: boolean) {
  return value ? "鏄? : "鍚?;
}

function getKnowledgeFileStatusLabel(status: KnowledgeBaseFileRecord["status"]) {
  if (status === "INDEXED") {
    return "宸插叆搴?;
  }
  if (status === "FAILED") {
    return "澶辫触";
  }
  return "寰呭悓姝?;
}

function buildKnowledgeFileDebugState(): KnowledgeFileDebugState {
  return {
    chunks: [],
    embeddings: [],
    isLoading: false,
    error: "",
  };
}

function buildKnowledgeRetrievalTestDraft(defaultTopK = 3): KnowledgeRetrievalTestDraft {
  return {
    query: "",
    topK: String(Math.max(1, defaultTopK || 3)),
  };
}

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
  { key: "dashboard", label: "浠〃鐩?, shortLabel: "鎬昏", description: "缁熶竴鏌ョ湅鍚庡彴杩愯惀鐘舵€併€佹ā鍧楄妯″拰褰撳墠鏁版嵁鏉ユ簮銆? },
  { key: "orders", label: "璁㈠崟绠＄悊", shortLabel: "璁㈠崟", description: "鏌ョ湅浼氬憳璐拱鍜岀偣鏁板厖鍊艰鍗曪紝鏀寔鍚庡彴鏀粯涓庡彇娑堛€? },
  { key: "rules", label: "浼氬憳涓庣Н鍒嗚鍒?, shortLabel: "瑙勫垯", description: "缁存姢浼氬憳鏂规銆佺偣鏁板寘涓庝环鏍艰鍒欍€? },
  { key: "users", label: "鐢ㄦ埛绠＄悊", shortLabel: "鐢ㄦ埛", description: "璋冩暣浼氬憳绛夌骇銆佸鍑忕偣鏁帮紝骞舵煡鐪嬬敤鎴疯妯′笌娲昏穬鎯呭喌銆? },
  { key: "usage", label: "妯″瀷娑堣€?, shortLabel: "娑堣€?, description: "鏌ョ湅妯″瀷浠诲姟閲忋€佺偣鏁版垚鏈€佷及绠楅噾棰濅笌鏈€杩戣皟鐢ㄦ椂闂淬€? },
  { key: "assets", label: "鎶€鑳戒腑蹇?, shortLabel: "鎶€鑳?, description: "鎸変笟鍔℃澘鍧楃淮鎶ゆ妧鑳介厤缃€佹墽琛屽唴瀹瑰拰淇濆瓨绛栫暐銆? },
  { key: "modules", label: "妯″潡娉ㄥ唽涓績", shortLabel: "妯″潡", description: "缁存姢妯″潡瀹氫箟銆佸叆鍙ｈ矾鐢便€佽兘鍔涗緷璧栧拰榛樿鑳藉姏鍖呮憳瑕併€? },
  { key: "knowledge", label: "鐭ヨ瘑搴撶鐞?, shortLabel: "鐭ヨ瘑", description: "缁存姢鐭ヨ瘑搴撳惎鍋滅姸鎬併€佹暟鎹簮绫诲瀷銆佸悓姝ョ姸鎬佷笌鏂囨。瑙勬ā銆? },
  {
    key: "providers",
    label: "鎺ュ彛渚涘簲鍟?,
    shortLabel: "鎺ュ彛",
    description: "鎸夊钩鍙扮淮鎶ょ涓夋柟鎺ュ彛閾炬帴銆佽鏄庢枃妗ｄ笌妯″瀷 ID锛屽墠鍙?Owner 鍐嶅～鍐欏綋鍓嶈处鍙风鏈?API Key銆?,
  },
];

const ADMIN_ROLE_TAB_MATRIX: Record<AdminSystemRole, AdminTab[]> = {
  SUPER_ADMIN: ["dashboard", "orders", "rules", "users", "usage", "assets", "modules", "knowledge", "providers"],
  ADMIN_OPERATOR: ["dashboard", "orders", "users", "usage", "assets", "modules", "knowledge", "providers"],
  FINANCE_OPERATOR: ["dashboard", "orders", "rules"],
  SUPPORT_OPERATOR: ["dashboard", "orders", "users", "usage"],
};

const DATABASE_INJECT_PARAMETER_OPTIONS: DatabaseInjectParameterOption[] = [
  { value: "brand_profile", label: "鍝佺墝璧勬枡" },
  { value: "product_library", label: "浜у搧璧勬枡" },
  { value: "marketing_plan", label: "钀ラ攢绛栧垝鏂规" },
];

const DATABASE_SELECT_PARAMETER_OPTIONS: DatabaseSelectParameterOption[] = [
  {
    value: "marketing_calendar",
    label: "钀ラ攢鏃ュ巻",
    emptyLabel: "涓嶆鍏ヨ惀閿€鏃ュ巻",
  },
  {
    value: "topic_library",
    label: "閫夐搴?,
    emptyLabel: "涓嶆鍏ラ€夐搴?,
  },
  {
    value: "material_library",
    label: "绱犳潗搴?,
    emptyLabel: "涓嶆鍏ョ礌鏉愬簱",
  },
];

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
  const [knowledgeBindings, setKnowledgeBindings] = useState<KnowledgeBindingRecord[]>(knowledgeBindingSeed);
  const [knowledgeRetrievalConfigs, setKnowledgeRetrievalConfigs] =
    useState<KnowledgeRetrievalConfigRecord[]>(knowledgeRetrievalConfigSeed);
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
  const [knowledgeRetrievalConfigDrafts, setKnowledgeRetrievalConfigDrafts] = useState<
    Record<string, KnowledgeRetrievalConfigEditDraft>
  >(buildKnowledgeRetrievalConfigDrafts(knowledgeRetrievalConfigSeed));
  const [knowledgeBindingDrafts, setKnowledgeBindingDrafts] = useState<Record<string, KnowledgeBindingEditDraft>>(
    buildKnowledgeBindingDrafts(knowledgeBindingSeed),
  );
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ApiProviderEditDraft>>(buildProviderDrafts(apiProviderSeed));
  const [platformDrafts, setPlatformDrafts] = useState<Record<string, ThirdPartyPlatformEditDraft>>({});
  const [newKnowledgeBase, setNewKnowledgeBase] = useState<CreateKnowledgeBaseDraft>(buildCreateKnowledgeBaseDraft());
  const [newKnowledgeBaseFileDrafts, setNewKnowledgeBaseFileDrafts] = useState<Record<string, CreateKnowledgeBaseFileDraft>>(
    buildKnowledgeBaseFileCreateDrafts(knowledgeBaseSeed),
  );
  const [newKnowledgeBindingDrafts, setNewKnowledgeBindingDrafts] = useState<Record<string, CreateKnowledgeBindingDraft>>(
    buildKnowledgeBindingCreateDrafts(knowledgeBaseSeed),
  );
  const [newProvider, setNewProvider] = useState<CreateApiProviderDraft>(buildCreateApiProviderDraft());
  const [newThirdPartyPlatform, setNewThirdPartyPlatform] = useState<CreateThirdPartyPlatformDraft>(
    buildCreateThirdPartyPlatformDraft(),
  );
  const [newSkill, setNewSkill] = useState<CreateSkillDraft>(buildCreateSkillDraft());
  const [installSkillDraft, setInstallSkillDraft] = useState<InstallSkillDraft>(buildInstallSkillDraft());
  const [newPrompt, setNewPrompt] = useState<CreatePromptDraft>(buildCreatePromptDraft());
  const [, setActiveAssetsWorkspaceTab] = useState<AssetsWorkspaceTab>("skillZone");
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
  const [updatingKnowledgeRetrievalBaseId, setUpdatingKnowledgeRetrievalBaseId] = useState("");
  const [updatingKnowledgeBindingId, setUpdatingKnowledgeBindingId] = useState("");
  const [updatingKnowledgeBaseSyncRunId, setUpdatingKnowledgeBaseSyncRunId] = useState("");
  const [updatingProviderId, setUpdatingProviderId] = useState("");
  const [isCreatingKnowledgeBase, setIsCreatingKnowledgeBase] = useState(false);
  const [creatingKnowledgeBindingForBaseId, setCreatingKnowledgeBindingForBaseId] = useState("");
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [isInstallingSkill, setIsInstallingSkill] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [loadingSkillAssetPackageId, setLoadingSkillAssetPackageId] = useState("");
  const [databaseParameterSync, setDatabaseParameterSync] = useState<DatabaseParameterSyncState>({
    injectCounts: {},
    selectOptions: {},
    summary: [],
  });
  const [isLoadingDatabaseParameters, setIsLoadingDatabaseParameters] = useState(false);
  const [knowledgeFileDebugStateMap, setKnowledgeFileDebugStateMap] = useState<Record<string, KnowledgeFileDebugState>>({});
  const [expandedKnowledgeFileId, setExpandedKnowledgeFileId] = useState("");
  const [expandedKnowledgeBridgeBaseIds, setExpandedKnowledgeBridgeBaseIds] = useState<Record<string, boolean>>({});
  const [selectedKnowledgeListFileId, setSelectedKnowledgeListFileId] = useState("");
  const [knowledgeRetrievalTestDrafts, setKnowledgeRetrievalTestDrafts] = useState<Record<string, KnowledgeRetrievalTestDraft>>({});
  const [knowledgeRetrievalTestResults, setKnowledgeRetrievalTestResults] = useState<
    Record<string, KnowledgeRetrievalTestResultRecord | undefined>
  >({});
  const [runningKnowledgeRetrievalBaseId, setRunningKnowledgeRetrievalBaseId] = useState("");
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [knowledgeWorkspaceSection, setKnowledgeWorkspaceSection] = useState<KnowledgeWorkspaceSection>("overview");
  const [selectedThirdPartyPlatformId, setSelectedThirdPartyPlatformId] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [knowledgeDataSource, setKnowledgeDataSource] = useState<"api" | "seed">("api");
  const [knowledgeLoadError, setKnowledgeLoadError] = useState("");
  const [skillAssetLoadError, setSkillAssetLoadError] = useState("");
  const [databaseParameterSyncError, setDatabaseParameterSyncError] = useState("");
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
        setErrorMessage("褰撳墠璐﹀彿涓嶆槸鍚庡彴绠＄悊鍛橈紝璇蜂娇鐢ㄥ悗鍙拌鑹茶处鍙风櫥褰曘€?);
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
      const message = error instanceof Error ? error.message : "閫€鍑虹櫥褰曞け璐?;
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function loadAdminData(role: AdminSystemRole = adminSystemRole as AdminSystemRole) {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");
    setKnowledgeLoadError("");
    setKnowledgeDataSource("api");

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
      knowledgeBindingsResult,
      knowledgeRetrievalConfigsResult,
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
      canReadKnowledge ? getKnowledgeBindings() : Promise.resolve([]),
      canReadKnowledge ? getKnowledgeRetrievalConfigs() : Promise.resolve([]),
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
    const knowledgeErrors: string[] = [];

    if (knowledgeBaseResult.status === "fulfilled") {
      setKnowledgeBases(knowledgeBaseResult.value);
      setKnowledgeBaseDrafts(buildKnowledgeBaseDrafts(knowledgeBaseResult.value));
      setNewKnowledgeBaseFileDrafts(buildKnowledgeBaseFileCreateDrafts(knowledgeBaseResult.value));
    } else {
      setKnowledgeBases([]);
      setKnowledgeBaseDrafts({});
      setNewKnowledgeBaseFileDrafts({});
      setSelectedKnowledgeBaseId("");
      setSelectedKnowledgeListFileId("");
      setKnowledgeDataSource("seed");
      knowledgeErrors.push(
        `鐭ヨ瘑搴撳鍣ㄦ帴鍙ｅけ璐ワ細${
          knowledgeBaseResult.reason instanceof Error ? knowledgeBaseResult.reason.message : "鏈煡閿欒"
        }`,
      );
    }

    if (knowledgeBaseFilesResult.status === "fulfilled") {
      setKnowledgeBaseFiles(knowledgeBaseFilesResult.value);
    } else {
      setKnowledgeBaseFiles([]);
      setKnowledgeDataSource("seed");
      knowledgeErrors.push(
        `鐭ヨ瘑搴撴枃浠舵帴鍙ｅけ璐ワ細${
          knowledgeBaseFilesResult.reason instanceof Error ? knowledgeBaseFilesResult.reason.message : "鏈煡閿欒"
        }`,
      );
    }

    if (knowledgeBindingsResult.status === "fulfilled") {
      setKnowledgeBindings(knowledgeBindingsResult.value);
      setKnowledgeBindingDrafts(buildKnowledgeBindingDrafts(knowledgeBindingsResult.value));
    } else {
      setKnowledgeBindings([]);
      setKnowledgeBindingDrafts({});
      setKnowledgeDataSource("seed");
      knowledgeErrors.push(
        `鐭ヨ瘑搴撴帴鍏ュ璞℃帴鍙ｅけ璐ワ細${
          knowledgeBindingsResult.reason instanceof Error ? knowledgeBindingsResult.reason.message : "鏈煡閿欒"
        }`,
      );
    }

    if (knowledgeRetrievalConfigsResult.status === "fulfilled") {
      setKnowledgeRetrievalConfigs(knowledgeRetrievalConfigsResult.value);
      setKnowledgeRetrievalConfigDrafts(buildKnowledgeRetrievalConfigDrafts(knowledgeRetrievalConfigsResult.value));
    } else {
      setKnowledgeRetrievalConfigs([]);
      setKnowledgeRetrievalConfigDrafts({});
      setKnowledgeDataSource("seed");
      knowledgeErrors.push(
        `鐭ヨ瘑妫€绱㈤厤缃帴鍙ｅけ璐ワ細${
          knowledgeRetrievalConfigsResult.reason instanceof Error ? knowledgeRetrievalConfigsResult.reason.message : "鏈煡閿欒"
        }`,
      );
    }

    if (knowledgeBaseSyncRunsResult.status === "fulfilled") {
      setKnowledgeBaseSyncRuns(knowledgeBaseSyncRunsResult.value);
      setKnowledgeBaseSyncRunDrafts(buildSyncRunDrafts(knowledgeBaseSyncRunsResult.value));
    } else {
      setKnowledgeBaseSyncRuns([]);
      setKnowledgeBaseSyncRunDrafts({});
      setKnowledgeDataSource("seed");
      knowledgeErrors.push(
        `鐭ヨ瘑鍚屾璁板綍鎺ュ彛澶辫触锛?{
          knowledgeBaseSyncRunsResult.reason instanceof Error ? knowledgeBaseSyncRunsResult.reason.message : "鏈煡閿欒"
        }`,
      );
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
      setErrorMessage("閮ㄥ垎鍚庡彴鎺ュ彛鏆備笉鍙敤锛屽綋鍓嶅凡鍥為€€鍒版湰鍦版紨绀烘暟鎹€?);
    } else {
      setDataSource("api");
    }

    if (knowledgeErrors.length) {
      setKnowledgeLoadError(knowledgeErrors.join("锛?));
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
      setNotice(action === "pay" ? `璁㈠崟宸叉敮浠橈細${updated.orderNo}` : `璁㈠崟宸插彇娑堬細${updated.orderNo}`);
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
        setNotice(action === "pay" ? "宸叉洿鏂版紨绀鸿鍗曚负宸叉敮浠樼姸鎬併€? : "宸叉洿鏂版紨绀鸿鍗曚负宸插彇娑堢姸鎬併€?);
        return;
      }

      const message = error instanceof Error ? error.message : "璁㈠崟鎿嶄綔澶辫触";
      setErrorMessage(`璁㈠崟鎿嶄綔澶辫触锛?{message}`);
    }
  }

  async function handleSaveRules() {
    setIsSavingRules(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextRules = await updateBillingRules(rules);
      setRules(nextRules);
      setNotice("浼氬憳涓庣Н鍒嗚鍒欏凡淇濆瓨銆?);
    } catch (error) {
      if (dataSource === "seed") {
        setNotice("鍚庡彴鎺ュ彛鏆備笉鍙敤锛屽綋鍓嶅凡淇濆瓨涓烘湰鍦版紨绀鸿鍒欍€?);
        return;
      }

      const message = error instanceof Error ? error.message : "瑙勫垯淇濆瓨澶辫触";
      setErrorMessage(`瑙勫垯淇濆瓨澶辫触锛?{message}`);
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
      setNotice(`鎶€鑳介厤缃凡鏇存柊锛?{updated.name}`);
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
        setNotice("鎶€鑳介厤缃凡鏇存柊鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鎶€鑳介厤缃繚瀛樺け璐?;
      setErrorMessage(`鎶€鑳介厤缃繚瀛樺け璐ワ細${message}`);
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
      setNotice(`鎻愮ず璇嶆ā鏉垮凡鏇存柊锛?{updated.name}`);
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
        setNotice("鎻愮ず璇嶆ā鏉垮凡鏇存柊鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鎻愮ず璇嶆ā鏉夸繚瀛樺け璐?;
      setErrorMessage(`鎻愮ず璇嶆ā鏉夸繚瀛樺け璐ワ細${message}`);
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

  function handleDatabaseInputChange(
    inputId: string,
    patch: Partial<DatabaseInputConfig>,
  ) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      databaseInputs: draft.databaseInputs.map((item) => {
        if (item.id !== inputId) {
          return item;
        }
        const next = {
          ...item,
          ...patch,
        };
        if (patch.parameterKey) {
          const meta = getDatabaseParameterMeta(next.parameterType, patch.parameterKey);
          next.parameterLabel = meta?.label || patch.parameterKey;
          const selectOptions = next.parameterType === "SELECT_CHOICE"
            ? getDatabaseSelectValueOptions(patch.parameterKey, databaseParameterSync)
            : [];
          if (next.parameterType === "SELECT_CHOICE" && !selectOptions.some((option) => option.value === next.selectedValue)) {
            next.selectedValue = selectOptions[0]?.value || "";
          }
        }
        return next;
      }),
    });
  }

  function handleAddDatabaseInput(parameterType: DatabaseInputConfig["parameterType"]) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      databaseInputs: [...draft.databaseInputs, buildDatabaseInputConfig(parameterType, databaseParameterSync)],
    });
  }

  function handleRemoveDatabaseInput(inputId: string) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      databaseInputs: draft.databaseInputs.filter((item) => item.id !== inputId),
    });
  }

  function handleApplyRecommendedDatabaseInputs() {
    if (!activeSkillConfig) {
      return;
    }
    handleSkillDraftChange(activeSkillConfig.id, {
      databaseInputs: buildRecommendedDatabaseInputs(databaseParameterSync),
    });
  }

  function handleClearDatabaseInputs() {
    if (!activeSkillConfig) {
      return;
    }
    handleSkillDraftChange(activeSkillConfig.id, {
      databaseInputs: [],
    });
  }

  function handleKnowledgeInputChange(
    inputId: string,
    patch: Partial<KnowledgeInputConfig>,
  ) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      knowledgeInputs: draft.knowledgeInputs.map((item) => {
        if (item.id !== inputId) {
          return item;
        }
        const next = { ...item, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, "knowledgeBaseId")) {
          const matched = knowledgeBases.find((entry) => entry.id === patch.knowledgeBaseId);
          next.knowledgeBaseName = matched?.name || "";
          const nextOptions = getKnowledgeContentOptions(patch.knowledgeBaseId || "", knowledgeBaseFiles);
          next.targetContentId = nextOptions[0]?.value || "";
          next.targetContentLabel = nextOptions[0]?.label || "";
        }
        if (Object.prototype.hasOwnProperty.call(patch, "targetContentId")) {
          const nextOptions = getKnowledgeContentOptions(next.knowledgeBaseId, knowledgeBaseFiles, patch.targetContentId, next.targetContentLabel);
          const matchedOption = nextOptions.find((entry) => entry.value === (patch.targetContentId || ""));
          next.targetContentLabel = matchedOption?.label || "";
        }
        return next;
      }),
    });
  }

  function handleAddKnowledgeInput() {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    const defaultKnowledgeBase = knowledgeBases.find((item) => item.status !== "DISABLED");
    handleSkillDraftChange(activeSkillConfig.id, {
      knowledgeInputs: [...draft.knowledgeInputs, buildKnowledgeInputConfig(defaultKnowledgeBase, knowledgeBaseFiles)],
    });
  }

  function handleRemoveKnowledgeInput(inputId: string) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      knowledgeInputs: draft.knowledgeInputs.filter((item) => item.id !== inputId),
    });
  }

  function handleClearKnowledgeInputs() {
    if (!activeSkillConfig) {
      return;
    }
    handleSkillDraftChange(activeSkillConfig.id, {
      knowledgeInputs: [],
    });
  }

  function handleCustomInputChange(
    inputId: string,
    patch: Partial<CustomInputConfig>,
  ) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      customInputs: draft.customInputs.map((item) => (item.id === inputId ? { ...item, ...patch } : item)),
    });
  }

  function handleAddCustomInput(inputType: CustomInputConfig["inputType"]) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      customInputs: [...draft.customInputs, buildCustomInputConfig(inputType)],
    });
  }

  function handleRemoveCustomInput(inputId: string) {
    if (!activeSkillConfig) {
      return;
    }
    const draft = activeSkillDraft || buildSkillDraft(activeSkillConfig);
    handleSkillDraftChange(activeSkillConfig.id, {
      customInputs: draft.customInputs.filter((item) => item.id !== inputId),
    });
  }

  function handleApplyRecommendedCustomInputs() {
    if (!activeSkillConfig) {
      return;
    }
    handleSkillDraftChange(activeSkillConfig.id, {
      customInputs: buildRecommendedCustomInputs(),
    });
  }

  function handleClearCustomInputs() {
    if (!activeSkillConfig) {
      return;
    }
    handleSkillDraftChange(activeSkillConfig.id, {
      customInputs: [],
    });
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
      setNotice(`鐭ヨ瘑搴撳凡鏇存柊锛?{updated.name}`);
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
        setNotice("鐭ヨ瘑搴撻厤缃凡鏇存柊鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撲繚瀛樺け璐?;
      setErrorMessage(`鐭ヨ瘑搴撲繚瀛樺け璐ワ細${message}`);
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

  function handleSelectKnowledgeBase(baseId: string) {
    setSelectedKnowledgeBaseId(baseId);
    setSelectedKnowledgeListFileId("");
  }

  function handleToggleKnowledgeBridgeFiles(baseId: string) {
    setExpandedKnowledgeBridgeBaseIds((current) => ({
      ...current,
      [baseId]: !current[baseId],
    }));
  }

  function handleSelectKnowledgeBridgeFile(knowledgeBaseId: string, fileId: string) {
    setSelectedKnowledgeBaseId(knowledgeBaseId);
    setKnowledgeWorkspaceSection("files");
    setSelectedKnowledgeListFileId(fileId);
    setExpandedKnowledgeFileId(fileId);
    setExpandedKnowledgeBridgeBaseIds((current) => ({
      ...current,
      [knowledgeBaseId]: true,
    }));
  }

  function handleKnowledgeRetrievalTestDraftChange(knowledgeBaseId: string, patch: Partial<KnowledgeRetrievalTestDraft>) {
    setKnowledgeRetrievalTestDrafts((current) => ({
      ...current,
      [knowledgeBaseId]: {
        ...(current[knowledgeBaseId] || buildKnowledgeRetrievalTestDraft()),
        ...patch,
      },
    }));
  }

  async function handleToggleKnowledgeFileDebug(file: KnowledgeBaseFileRecord) {
    const isExpanded = expandedKnowledgeFileId === file.id;
    if (isExpanded) {
      setExpandedKnowledgeFileId("");
      return;
    }

    setExpandedKnowledgeFileId(file.id);
    const currentState = knowledgeFileDebugStateMap[file.id];
    if (currentState && (currentState.chunks.length || currentState.embeddings.length || currentState.error)) {
      return;
    }

    setKnowledgeFileDebugStateMap((current) => ({
      ...current,
      [file.id]: {
        ...(current[file.id] || buildKnowledgeFileDebugState()),
        isLoading: true,
        error: "",
      },
    }));

    try {
      const [chunks, embeddings] = await Promise.all([
        getKnowledgeBaseFileChunks(file.id),
        getKnowledgeBaseFileEmbeddings(file.id),
      ]);
      setKnowledgeFileDebugStateMap((current) => ({
        ...current,
        [file.id]: {
          chunks,
          embeddings,
          isLoading: false,
          error: "",
          loadedAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      const message =
        dataSource === "seed"
          ? "褰撳墠鏄紨绀烘暟鎹紝鏆傛棤鐪熷疄鍒嗙墖涓?embedding 鏄庣粏銆?
          : error instanceof Error
            ? error.message
            : "璇诲彇鍒嗙墖涓?embedding 澶辫触";
      setKnowledgeFileDebugStateMap((current) => ({
        ...current,
        [file.id]: {
          ...(current[file.id] || buildKnowledgeFileDebugState()),
          isLoading: false,
          error: message,
        },
      }));
    }
  }

  async function handleRunKnowledgeRetrievalTest(knowledgeBaseId: string) {
    const selectedConfig = knowledgeRetrievalConfigs.find((item) => item.knowledgeBaseId === knowledgeBaseId);
    const draft = knowledgeRetrievalTestDrafts[knowledgeBaseId]
      || buildKnowledgeRetrievalTestDraft(selectedConfig?.defaultTopK || 3);
    if (!draft.query.trim()) {
      setErrorMessage("妫€绱㈡祴璇曢棶棰樹笉鑳戒负绌恒€?);
      return;
    }

    setRunningKnowledgeRetrievalBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await runKnowledgeRetrievalTest(knowledgeBaseId, {
        query: draft.query.trim(),
        topK: Math.max(1, Number(draft.topK || selectedConfig?.defaultTopK || 3)),
      });
      setKnowledgeRetrievalTestResults((current) => ({
        ...current,
        [knowledgeBaseId]: result,
      }));
      setNotice(
        result.hitCount
          ? `妫€绱㈡祴璇曞畬鎴愶紝鍛戒腑 ${result.hitCount} 鏉＄粨鏋溿€俙
          : "妫€绱㈡祴璇曞凡瀹屾垚锛屼絾褰撳墠闃堝€间笅娌℃湁鍛戒腑缁撴灉銆?,
      );
    } catch (error) {
      const message =
        dataSource === "seed"
          ? "褰撳墠鏄紨绀烘暟鎹紝鏃犳硶鎵ц鐪熷疄妫€绱㈡祴璇曘€?
          : error instanceof Error
            ? error.message
            : "妫€绱㈡祴璇曞け璐?;
      setErrorMessage(`妫€绱㈡祴璇曞け璐ワ細${message}`);
    } finally {
      setRunningKnowledgeRetrievalBaseId("");
    }
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
      setNotice(`鐭ヨ瘑搴撳凡褰掓。锛?{updated.name}`);
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
        setNotice("鐭ヨ瘑搴撳凡褰掓。鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撳綊妗ｅけ璐?;
      setErrorMessage(`鐭ヨ瘑搴撳綊妗ｅけ璐ワ細${message}`);
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
      setSelectedKnowledgeBaseId((current) => (current === knowledgeBaseId ? "" : current));
      setKnowledgeBaseFiles((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
      setKnowledgeRetrievalConfigs((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
      setKnowledgeBaseDrafts((current) => {
        const next = { ...current };
        delete next[knowledgeBaseId];
        return next;
      });
      setKnowledgeRetrievalConfigDrafts((current) => {
        const next = { ...current };
        delete next[knowledgeBaseId];
        return next;
      });
      setNewKnowledgeBaseFileDrafts((current) => {
        const next = { ...current };
        delete next[knowledgeBaseId];
        return next;
      });
      setNotice(`鐭ヨ瘑搴撳凡鍒犻櫎锛?{removed.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        setKnowledgeBases((current) => current.filter((item) => item.id !== knowledgeBaseId));
        setSelectedKnowledgeBaseId((current) => (current === knowledgeBaseId ? "" : current));
        setKnowledgeBaseFiles((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
        setKnowledgeRetrievalConfigs((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
        setKnowledgeBaseDrafts((current) => {
          const next = { ...current };
          delete next[knowledgeBaseId];
          return next;
        });
        setKnowledgeRetrievalConfigDrafts((current) => {
          const next = { ...current };
          delete next[knowledgeBaseId];
          return next;
        });
        setNewKnowledgeBaseFileDrafts((current) => {
          const next = { ...current };
          delete next[knowledgeBaseId];
          return next;
        });
        setNotice(`鐭ヨ瘑搴撳凡浠庢湰鍦版紨绀烘暟鎹垹闄わ細${removed?.name || knowledgeBaseId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撳垹闄ゅけ璐?;
      setErrorMessage(`鐭ヨ瘑搴撳垹闄ゅけ璐ワ細${message}`);
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
      setSelectedKnowledgeBaseId(created.id);
      setKnowledgeWorkspaceSection("overview");
      const defaultRetrievalConfig = buildDefaultKnowledgeRetrievalConfig(created.id);
      setKnowledgeBaseDrafts((current) => ({
        [created.id]: buildKnowledgeBaseDraft(created),
        ...current,
      }));
      setKnowledgeRetrievalConfigs((current) => [defaultRetrievalConfig, ...current]);
      setKnowledgeRetrievalConfigDrafts((current) => ({
        [created.id]: buildKnowledgeRetrievalConfigDraft(defaultRetrievalConfig),
        ...current,
      }));
      setNewKnowledgeBaseFileDrafts((current) => ({
        [created.id]: buildCreateKnowledgeBaseFileDraft(),
        ...current,
      }));
      setNewKnowledgeBase(buildCreateKnowledgeBaseDraft());
      setNotice(`鐭ヨ瘑搴撳凡鍒涘缓锛?{created.name}`);
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
        setSelectedKnowledgeBaseId(created.id);
        setKnowledgeWorkspaceSection("overview");
        const defaultRetrievalConfig = buildDefaultKnowledgeRetrievalConfig(created.id, createdAt);
        setKnowledgeBaseDrafts((current) => ({
          [created.id]: buildKnowledgeBaseDraft(created),
          ...current,
        }));
        setKnowledgeRetrievalConfigs((current) => [defaultRetrievalConfig, ...current]);
        setKnowledgeRetrievalConfigDrafts((current) => ({
          [created.id]: buildKnowledgeRetrievalConfigDraft(defaultRetrievalConfig),
          ...current,
        }));
        setNewKnowledgeBaseFileDrafts((current) => ({
          [created.id]: buildCreateKnowledgeBaseFileDraft(),
          ...current,
        }));
        setNewKnowledgeBase(buildCreateKnowledgeBaseDraft());
        setNotice("鐭ヨ瘑搴撳凡鍒涘缓鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撳垱寤哄け璐?;
      setErrorMessage(`鐭ヨ瘑搴撳垱寤哄け璐ワ細${message}`);
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
      setNotice(`鐭ヨ瘑搴撴枃浠跺凡鏂板锛?{result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const now = new Date().toISOString();
        const file: KnowledgeBaseFileRecord = {
          id: `kbf_local_${Date.now()}`,
          knowledgeBaseId,
          fileName: draft.fileName,
          fileType: draft.fileType,
          sourceName: draft.sourceName || "鍚庡彴鎵嬪姩褰曞叆",
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
        setNotice("鐭ヨ瘑搴撴枃浠跺凡鏂板鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撴枃浠舵柊澧炲け璐?;
      setErrorMessage(`鐭ヨ瘑搴撴枃浠舵柊澧炲け璐ワ細${message}`);
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
      setNotice(`鐭ヨ瘑搴撴枃浠跺凡鍒犻櫎锛?{result.file.fileName}`);
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
        setNotice(`鐭ヨ瘑搴撴枃浠跺凡浠庢湰鍦版紨绀烘暟鎹垹闄わ細${file?.fileName || fileId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撴枃浠跺垹闄ゅけ璐?;
      setErrorMessage(`鐭ヨ瘑搴撴枃浠跺垹闄ゅけ璐ワ細${message}`);
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
      setNotice(`鐭ヨ瘑搴撴枃浠剁姸鎬佸凡鏇存柊锛?{result.file.fileName}`);
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
        setNotice("鐭ヨ瘑搴撴枃浠剁姸鎬佸凡鏇存柊鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撴枃浠剁姸鎬佹洿鏂板け璐?;
      setErrorMessage(`鐭ヨ瘑搴撴枃浠剁姸鎬佹洿鏂板け璐ワ細${message}`);
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
      setNotice(`鐭ヨ瘑搴撴枃浠跺悓姝ュ凡瀹屾垚锛?{result.file.fileName}锛屽綋鍓嶅垎鐗?${result.file.chunkCount}`);
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
              operator: "鍚庡彴绠＄悊鍛?,
              fileId: nextFile.id,
              fileName: nextFile.fileName,
              result: "RUNNING",
              summary: "鏂囦欢鍚屾浠诲姟宸插垱寤猴紝绛夊緟绱㈠紩瀹屾垚銆?,
              startedAt,
            },
          };
          applyKnowledgeBaseFileMutation(result, "update");
          applyKnowledgeBaseSyncRun(result);
        }
        setNotice("鐭ヨ瘑搴撴枃浠跺悓姝ヤ换鍔″凡鍒涘缓鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撴枃浠跺悓姝ュけ璐?;
      setErrorMessage(`鐭ヨ瘑搴撴枃浠跺悓姝ュけ璐ワ細${message}`);
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
      setNotice(`鐭ヨ瘑搴撳叏閲忓悓姝ュ凡瀹屾垚锛?{result.knowledgeBase.name}锛屽綋鍓嶇疮璁″垎鐗?${result.knowledgeBase.chunkCount}`);
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
              operator: "鍚庡彴绠＄悊鍛?,
              result: "RUNNING",
              summary: "鍏ㄩ噺鍚屾浠诲姟宸插垱寤猴紝姝ｅ湪鎵弿鐭ヨ瘑搴撴枃浠躲€?,
              startedAt,
            },
          });
        }
        setNotice("鐭ヨ瘑搴撳叏閲忓悓姝ヤ换鍔″凡鍒涘缓鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑搴撳叏閲忓悓姝ュ垱寤哄け璐?;
      setErrorMessage(`鐭ヨ瘑搴撳叏閲忓悓姝ュ垱寤哄け璐ワ細${message}`);
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
      setNotice(`鍚屾璁板綍宸叉洿鏂颁负 ${result}銆俙);
    } catch (error) {
      if (dataSource === "seed") {
        const currentRun = knowledgeBaseSyncRuns.find((item) => item.id === runId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === currentRun?.knowledgeBaseId);
        if (currentRun && knowledgeBase) {
          const completedAt = new Date().toISOString();
          const updatedRun: KnowledgeBaseSyncRunRecord = {
            ...currentRun,
            result,
            summary: draft.summary || (result === "SUCCESS" ? "鍚屾浠诲姟鎵ц鎴愬姛銆? : "鍚屾浠诲姟鎵ц澶辫触锛岃鏌ョ湅澶辫触鍘熷洜銆?),
            errorDetail: result === "FAILED" ? draft.errorDetail || "鏈彁渚涘け璐ュ師鍥犮€? : undefined,
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
        setNotice(`鍚屾璁板綍宸叉洿鏂板埌鏈湴婕旂ず鏁版嵁锛?{result}`);
        return;
      }

      const message = error instanceof Error ? error.message : "鍚屾璁板綍鏇存柊澶辫触";
      setErrorMessage(`鍚屾璁板綍鏇存柊澶辫触锛?{message}`);
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
      setKnowledgeFileDebugStateMap((current) => {
        const next = { ...current };
        delete next[result.file.id];
        return next;
      });
      setExpandedKnowledgeFileId((current) => (current === result.file.id ? "" : current));
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

  function handleKnowledgeBindingDraftChange(bindingId: string, patch: Partial<KnowledgeBindingEditDraft>) {
    setKnowledgeBindingDrafts((current) => ({
      ...current,
      [bindingId]: {
        ...(current[bindingId] || buildKnowledgeBindingDraft(knowledgeBindingSeed[0])),
        ...patch,
      },
    }));
  }

  function handleCreateKnowledgeBindingDraftChange(
    knowledgeBaseId: string,
    patch: Partial<CreateKnowledgeBindingDraft>,
  ) {
    setNewKnowledgeBindingDrafts((current) => ({
      ...current,
      [knowledgeBaseId]: {
        ...(current[knowledgeBaseId] || buildCreateKnowledgeBindingDraft()),
        ...patch,
      },
    }));
  }

  function handleSelectKnowledgeBindingTarget(
    knowledgeBaseId: string,
    bindingType: KnowledgeBindingRecord["bindingType"],
    targetId: string,
  ) {
    const optionMap: Record<KnowledgeBindingRecord["bindingType"], KnowledgeBindingTargetOption[]> = {
      MODULE: modules.map((item) => ({
        targetId: item.moduleKey,
        targetKey: item.moduleKey,
        targetName: item.moduleName,
      })),
      SKILL_PACKAGE: skillPackages.map((item) => ({
        targetId: item.packageKey,
        targetKey: item.packageKey,
        targetName: item.packageName,
      })),
      PROMPT: prompts.map((item) => ({
        targetId: item.id,
        targetKey: item.id,
        targetName: item.name,
      })),
      WORKFLOW_STEP: Array.from(
        new Map(
          [...knowledgeBindings]
            .filter((item) => item.bindingType === "WORKFLOW_STEP" && item.targetId.trim())
            .map((item) => [
              item.targetId,
              {
                targetId: item.targetId,
                targetKey: item.targetKey || item.targetId,
                targetName: item.targetName || item.targetId,
              } satisfies KnowledgeBindingTargetOption,
            ]),
        ).values(),
      ),
    };

    const matched = optionMap[bindingType].find((item) => item.targetId === targetId);
    handleCreateKnowledgeBindingDraftChange(knowledgeBaseId, {
      targetId,
      targetKey: matched?.targetKey || targetId,
      targetName: matched?.targetName || targetId,
    });
  }

  function handleKnowledgeRetrievalConfigDraftChange(
    knowledgeBaseId: string,
    patch: Partial<KnowledgeRetrievalConfigEditDraft>,
  ) {
    setKnowledgeRetrievalConfigDrafts((current) => ({
      ...current,
      [knowledgeBaseId]: {
        ...(current[knowledgeBaseId] || buildKnowledgeRetrievalConfigDraft()),
        ...patch,
      },
    }));
  }

  async function handleSaveKnowledgeRetrievalConfig(knowledgeBaseId: string) {
    const draft = knowledgeRetrievalConfigDrafts[knowledgeBaseId] || buildKnowledgeRetrievalConfigDraft();
    setUpdatingKnowledgeRetrievalBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const payload = normalizeKnowledgeRetrievalConfigDraft(draft);
      const updated = await updateKnowledgeRetrievalConfig(knowledgeBaseId, payload);
      setKnowledgeRetrievalConfigs((current) => {
        const exists = current.some((item) => item.knowledgeBaseId === knowledgeBaseId);
        const next = exists
          ? current.map((item) => (item.knowledgeBaseId === knowledgeBaseId ? updated : item))
          : [updated, ...current];
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setKnowledgeRetrievalConfigDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildKnowledgeRetrievalConfigDraft(updated),
      }));
      setNotice(`鐭ヨ瘑妫€绱㈤厤缃凡鏇存柊锛?{knowledgeBases.find((item) => item.id === knowledgeBaseId)?.name || knowledgeBaseId}`);
    } catch (error) {
      if (dataSource === "seed") {
        try {
          const payload = normalizeKnowledgeRetrievalConfigDraft(draft);
          const currentRecord = knowledgeRetrievalConfigs.find((item) => item.knowledgeBaseId === knowledgeBaseId);
          const updatedAt = new Date().toISOString();
          const nextRecord: KnowledgeRetrievalConfigRecord = {
            ...(currentRecord || buildDefaultKnowledgeRetrievalConfig(knowledgeBaseId, updatedAt)),
            ...payload,
            updatedAt,
          };
          setKnowledgeRetrievalConfigs((current) => {
            const exists = current.some((item) => item.knowledgeBaseId === knowledgeBaseId);
            const next = exists
              ? current.map((item) => (item.knowledgeBaseId === knowledgeBaseId ? nextRecord : item))
              : [nextRecord, ...current];
            return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          });
          setKnowledgeRetrievalConfigDrafts((current) => ({
            ...current,
            [knowledgeBaseId]: buildKnowledgeRetrievalConfigDraft(nextRecord),
          }));
          setNotice("鐭ヨ瘑妫€绱㈤厤缃凡鏇存柊鍒版湰鍦版紨绀烘暟鎹€?);
          return;
        } catch (draftError) {
          const message = draftError instanceof Error ? draftError.message : "鐭ヨ瘑妫€绱㈤厤缃牎楠屽け璐?;
          setErrorMessage(`鐭ヨ瘑妫€绱㈤厤缃繚瀛樺け璐ワ細${message}`);
          return;
        }
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑妫€绱㈤厤缃繚瀛樺け璐?;
      setErrorMessage(`鐭ヨ瘑妫€绱㈤厤缃繚瀛樺け璐ワ細${message}`);
    } finally {
      setUpdatingKnowledgeRetrievalBaseId("");
    }
  }

  async function handleCreateKnowledgeBinding(knowledgeBaseId: string) {
    const draft = newKnowledgeBindingDrafts[knowledgeBaseId] || buildCreateKnowledgeBindingDraft();
    if (!draft.targetId.trim()) {
      setErrorMessage("鐭ヨ瘑缁戝畾鐩爣 ID 涓嶈兘涓虹┖銆?);
      return;
    }

    setCreatingKnowledgeBindingForBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const created = await createKnowledgeBinding({
        knowledgeBaseId,
        bindingType: draft.bindingType,
        targetId: draft.targetId.trim(),
        targetKey: draft.targetKey.trim() || undefined,
        targetName: draft.targetName.trim() || undefined,
        priority: Math.max(1, Number(draft.priority || 1)),
        retrievalMode: draft.retrievalMode,
        isRequired: draft.isRequired,
        enabled: draft.enabled,
      });
      setKnowledgeBindings((current) =>
        [...current, created].sort((a, b) => (a.priority === b.priority ? a.updatedAt.localeCompare(b.updatedAt) : a.priority - b.priority)),
      );
      setKnowledgeBindingDrafts((current) => ({
        ...current,
        [created.id]: buildKnowledgeBindingDraft(created),
      }));
      setNewKnowledgeBindingDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildCreateKnowledgeBindingDraft(),
      }));
      setNotice(`鐭ヨ瘑缁戝畾宸插垱寤猴細${created.targetName || created.targetId}`);
    } catch (error) {
      if (dataSource === "seed") {
        const now = new Date().toISOString();
        const knowledgeBase = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        const created: KnowledgeBindingRecord = {
          id: `kbb_local_${Date.now()}`,
          knowledgeBaseId,
          knowledgeBaseName: knowledgeBase?.name,
          knowledgeBaseSlug: knowledgeBase?.slug,
          bindingType: draft.bindingType,
          targetId: draft.targetId.trim(),
          targetKey: draft.targetKey.trim() || undefined,
          targetName: draft.targetName.trim() || undefined,
          priority: Math.max(1, Number(draft.priority || 1)),
          retrievalMode: draft.retrievalMode,
          isRequired: draft.isRequired,
          enabled: draft.enabled,
          createdAt: now,
          updatedAt: now,
        };
        setKnowledgeBindings((current) =>
          [...current, created].sort((a, b) => (a.priority === b.priority ? a.updatedAt.localeCompare(b.updatedAt) : a.priority - b.priority)),
        );
        setKnowledgeBindingDrafts((current) => ({
          ...current,
          [created.id]: buildKnowledgeBindingDraft(created),
        }));
        setNewKnowledgeBindingDrafts((current) => ({
          ...current,
          [knowledgeBaseId]: buildCreateKnowledgeBindingDraft(),
        }));
        setNotice("鐭ヨ瘑缁戝畾宸插垱寤哄埌鏈湴婕旂ず鏁版嵁銆?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑缁戝畾鍒涘缓澶辫触";
      setErrorMessage(`鐭ヨ瘑缁戝畾鍒涘缓澶辫触锛?{message}`);
    } finally {
      setCreatingKnowledgeBindingForBaseId("");
    }
  }

  async function handleSaveKnowledgeBinding(bindingId: string) {
    const draft = knowledgeBindingDrafts[bindingId];
    if (!draft) {
      return;
    }

    setUpdatingKnowledgeBindingId(bindingId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateKnowledgeBinding(bindingId, {
        targetKey: draft.targetKey.trim() || undefined,
        targetName: draft.targetName.trim() || undefined,
        priority: Math.max(1, Number(draft.priority || 1)),
        retrievalMode: draft.retrievalMode,
        isRequired: draft.isRequired,
        enabled: draft.enabled,
      });
      setKnowledgeBindings((current) =>
        current
          .map((item) => (item.id === bindingId ? updated : item))
          .sort((a, b) => (a.priority === b.priority ? a.updatedAt.localeCompare(b.updatedAt) : a.priority - b.priority)),
      );
      setKnowledgeBindingDrafts((current) => ({
        ...current,
        [bindingId]: buildKnowledgeBindingDraft(updated),
      }));
      setNotice(`鐭ヨ瘑缁戝畾宸叉洿鏂帮細${updated.targetName || updated.targetId}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setKnowledgeBindings((current) =>
          current
            .map((item) =>
              item.id === bindingId
                ? {
                    ...item,
                    targetKey: draft.targetKey.trim() || undefined,
                    targetName: draft.targetName.trim() || undefined,
                    priority: Math.max(1, Number(draft.priority || 1)),
                    retrievalMode: draft.retrievalMode,
                    isRequired: draft.isRequired,
                    enabled: draft.enabled,
                    updatedAt,
                  }
                : item,
            )
            .sort((a, b) => (a.priority === b.priority ? a.updatedAt.localeCompare(b.updatedAt) : a.priority - b.priority)),
        );
        setNotice("鐭ヨ瘑缁戝畾宸叉洿鏂板埌鏈湴婕旂ず鏁版嵁銆?);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑缁戝畾鏇存柊澶辫触";
      setErrorMessage(`鐭ヨ瘑缁戝畾鏇存柊澶辫触锛?{message}`);
    } finally {
      setUpdatingKnowledgeBindingId("");
    }
  }

  async function handleDeleteKnowledgeBinding(bindingId: string) {
    setUpdatingKnowledgeBindingId(bindingId);
    setNotice("");
    setErrorMessage("");

    try {
      const removed = await deleteKnowledgeBinding(bindingId);
      setKnowledgeBindings((current) => current.filter((item) => item.id !== bindingId));
      setKnowledgeBindingDrafts((current) => {
        const next = { ...current };
        delete next[bindingId];
        return next;
      });
      setNotice(`鐭ヨ瘑缁戝畾宸插垹闄わ細${removed.targetName || removed.targetId}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = knowledgeBindings.find((item) => item.id === bindingId);
        setKnowledgeBindings((current) => current.filter((item) => item.id !== bindingId));
        setKnowledgeBindingDrafts((current) => {
          const next = { ...current };
          delete next[bindingId];
          return next;
        });
        setNotice(`鐭ヨ瘑缁戝畾宸蹭粠鏈湴婕旂ず鏁版嵁鍒犻櫎锛?{removed?.targetName || removed?.targetId || bindingId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "鐭ヨ瘑缁戝畾鍒犻櫎澶辫触";
      setErrorMessage(`鐭ヨ瘑缁戝畾鍒犻櫎澶辫触锛?{message}`);
    } finally {
      setUpdatingKnowledgeBindingId("");
    }
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
      setNotice(`API Provider 宸叉洿鏂帮細${updated.name}`);
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
        setNotice("API Provider 閰嶇疆宸叉洿鏂板埌鏈湴婕旂ず鏁版嵁銆?);
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 淇濆瓨澶辫触";
      setErrorMessage(`API Provider 淇濆瓨澶辫触锛?{message}`);
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
      setNotice(`API Provider 宸插綊妗ｏ細${updated.name}`);
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
        setNotice("API Provider 宸插綊妗ｅ埌鏈湴婕旂ず鏁版嵁銆?);
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 褰掓。澶辫触";
      setErrorMessage(`API Provider 褰掓。澶辫触锛?{message}`);
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
      setNotice(`API Provider 宸插垹闄わ細${removed.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = providers.find((item) => item.id === providerId);
        setProviders((current) => current.filter((item) => item.id !== providerId));
        setProviderDrafts((current) => {
          const next = { ...current };
          delete next[providerId];
          return next;
        });
        setNotice(`API Provider 宸蹭粠鏈湴婕旂ず鏁版嵁鍒犻櫎锛?{removed?.name || providerId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 鍒犻櫎澶辫触";
      setErrorMessage(`API Provider 鍒犻櫎澶辫触锛?{message}`);
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
      setNotice(`API Provider 宸插垱寤猴細${created.name}`);
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
        setNotice("API Provider 宸插垱寤哄埌鏈湴婕旂ず鏁版嵁銆?);
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 鍒涘缓澶辫触";
      setErrorMessage(`API Provider 鍒涘缓澶辫触锛?{message}`);
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
      setNotice(`绗笁鏂瑰钩鍙板凡鏇存柊锛?{updated.name}`);
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
        setNotice("绗笁鏂瑰钩鍙板凡鏇存柊鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "绗笁鏂瑰钩鍙颁繚瀛樺け璐?;
      setErrorMessage(`绗笁鏂瑰钩鍙颁繚瀛樺け璐ワ細${message}`);
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
      setNotice(`绗笁鏂瑰钩鍙板凡鍒犻櫎锛?{removed.name}`);
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
        setNotice(`绗笁鏂瑰钩鍙板凡浠庢湰鍦版紨绀烘暟鎹垹闄わ細${removed?.name || platformId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "绗笁鏂瑰钩鍙板垹闄ゅけ璐?;
      setErrorMessage(`绗笁鏂瑰钩鍙板垹闄ゅけ璐ワ細${message}`);
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
      setNotice(`绗笁鏂瑰钩鍙板凡鍒涘缓锛?{created.name}`);
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
        setNotice("绗笁鏂瑰钩鍙板凡鍒涘缓鍒版湰鍦版紨绀烘暟鎹€?);
        return;
      }

      const message = error instanceof Error ? error.message : "绗笁鏂瑰钩鍙板垱寤哄け璐?;
      setErrorMessage(`绗笁鏂瑰钩鍙板垱寤哄け璐ワ細${message}`);
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
        <span className="archive-pill status-ready">{dataSource === "api" ? "鐪熷疄鎺ュ彛" : "婕旂ず鏁版嵁"}</span>
        <span className="status-text">{adminName ? `褰撳墠绠＄悊鍛橈細${adminName}` : "鍚庡彴韬唤宸查獙璇?}</span>
        <span className="status-text">褰撳墠鏍忕洰锛歿activeTabMeta.label}</span>
      </div>
      <div className="admin-console-actions">
        <button type="button" className="secondary-button" onClick={() => void loadAdminData()} disabled={isLoading || isLoggingOut}>
          {isLoading ? "鍒锋柊涓?.." : "鍒锋柊鍚庡彴鏁版嵁"}
        </button>
        <button type="button" className="ghost-danger-button" onClick={() => void handleLogout()} disabled={isLoggingOut || isLoading}>
          {isLoggingOut ? "閫€鍑轰腑..." : "閫€鍑虹櫥褰?}
        </button>
      </div>
    </div>
  );
  const overviewCards = [
    { label: "璁㈠崟姹?, value: summary.orderCount, detail: `${summary.pendingCount} 涓緟鏀粯 / ${summary.paidCount} 涓凡瀹屾垚` },
    { label: "骞冲彴鐢ㄦ埛", value: summary.userCount, detail: `鍏辫鐩?${summary.userCount} 涓彲杩愯惀璐︽埛` },
    { label: "妯″瀷璧勪骇", value: summary.modelCount, detail: `绱娑堣€?${summary.usagePoints} 鐐筦 },
    { label: "鐭ヨ瘑璧勪骇", value: summary.knowledgeBaseCount, detail: `鍏辩淮鎶?${summary.providerCount} 涓帴鍙ｄ緵搴斿晢` },
  ];
  const moduleHighlights = [
    { key: "orders" as const, count: summary.orderCount, note: `${summary.pendingCount} 涓鍗曞緟澶勭悊` },
    { key: "rules" as const, count: summary.planCount + summary.packageCount, note: `${summary.planCount} 涓細鍛樻柟妗?/ ${summary.packageCount} 涓偣鏁板寘` },
    { key: "users" as const, count: summary.userCount, note: `褰撳墠鍚庡彴鍙鐞?${summary.userCount} 涓敤鎴穈 },
    { key: "usage" as const, count: summary.modelCount, note: `绱妯″瀷鐐规暟 ${summary.usagePoints}` },
    { key: "assets" as const, count: summary.skillCount + summary.promptCount, note: `${summary.skillCount} 涓妧鑳?/ ${summary.promptCount} 濂楁彁绀鸿瘝` },
    { key: "knowledge" as const, count: summary.knowledgeBaseCount, note: `褰撳墠鍏辨湁 ${summary.knowledgeBaseCount} 涓煡璇嗗簱` },
    { key: "providers" as const, count: summary.providerCount, note: `鎺ュ彛渚涘簲鍟?${summary.providerCount} 涓猔 },
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
    { label: "璁㈠崟灞ョ害", value: summary.orderCount ? Math.round((summary.paidCount / summary.orderCount) * 100) : 0 },
    { label: "鐭ヨ瘑鍚屾", value: knowledgeBases.length ? Math.round((knowledgeBases.filter((item) => item.syncStatus === "SUCCESS").length / knowledgeBases.length) * 100) : 0 },
    { label: "鎺ュ彛鍋ュ悍", value: providers.length ? Math.round(providers.filter((item) => item.status === "ACTIVE").length / providers.length * 100) : 0 },
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
    (activeSkillPackageNames.length || activeSkillModules.length ? "宸插缓绔嬫妧鑳藉綊灞炴槧灏? : "鏆傛湭寤虹珛鎶€鑳藉綊灞炴槧灏?);
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
    ? `褰撳墠鎶€鑳借緭鍑哄皢缁х画浼犻€掔粰锛?{downstreamSkillNames.join(" -> ")}`
    : "褰撳墠鎶€鑳借緭鍑轰负鑳藉姏鍖呯粓鎬佽緭鍑猴紝鎴栬繘鍏ヤ汉宸ュ鏍?/ 鍙戝竷鐜妭銆?;
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
  const activeKnowledgeBaseRecords = knowledgeBases
    .filter((item) => item.status !== "DISABLED")
    .map((item) => ({ value: item.id, label: item.name, documentCount: item.documentCount }));
  const activeKnowledgeBaseOptions = activeKnowledgeBaseRecords.map((item) => ({ value: item.value, label: item.label }));
  const knowledgeBaseFileCountMap = knowledgeBaseFiles.reduce<Record<string, number>>((accumulator, item) => {
    if (item.status === "FAILED") {
      return accumulator;
    }
    accumulator[item.knowledgeBaseId] = (accumulator[item.knowledgeBaseId] || 0) + 1;
    return accumulator;
  }, {});
  const knowledgeBaseSyncSummary = activeKnowledgeBaseRecords
    .slice(0, 6)
    .map((item) => `${item.label} ${knowledgeBaseFileCountMap[item.value] || 0} 椤筦);
  const databaseInputSummary = (activeSkillDraft?.databaseInputs || [])
    .map((item) => {
      if (item.parameterType === "INJECT_TOGGLE") {
        return `${item.parameterLabel || item.parameterKey}锛?{item.selectedValue === "INJECT" ? "妞嶅叆" : "涓嶆鍏?}`;
      }
      const matchedOption = getDatabaseSelectValueOptions(item.parameterKey, databaseParameterSync)
        .find((option) => option.value === item.selectedValue);
      return `${item.parameterLabel || item.parameterKey}锛?{matchedOption?.label || "鏈€夋嫨"}`;
    })
    .join(" / ");
  const databaseParameterSyncSummary = databaseParameterSync.summary.join(" / ");
  const knowledgeInputSummary = (activeSkillDraft?.knowledgeInputs || [])
    .map((item) => `${item.knowledgeBaseName || "鏈€夋嫨鐭ヨ瘑搴?}锛?{item.targetContentLabel || "鏁村簱妫€绱?}`)
    .join(" / ");
  const customInputSummary = (activeSkillDraft?.customInputs || [])
    .map((item) => `${item.label || "鏈懡鍚嶅弬鏁?}锛?{item.inputType === "SELECT" ? "涓嬫媺" : item.inputType === "FILE" ? "涓婁紶" : "杈撳叆"}锛塦)
    .join(" / ");
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
          "鍐呭鐢熶骇",
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
  const skillCenterUpdatedAtLabel = skillCenterUpdatedAt ? formatDateTime(skillCenterUpdatedAt) : "鑷姩鏇存柊";
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
  const selectedKnowledgeBase = useMemo(
    () => knowledgeBases.find((item) => item.id === selectedKnowledgeBaseId) ?? knowledgeBases[0],
    [knowledgeBases, selectedKnowledgeBaseId],
  );
  const knowledgeWorkspaceSections: Array<{
    id: KnowledgeWorkspaceSection;
    label: string;
    description: string;
  }> = [
    { id: "overview", label: "鍩虹淇℃伅", description: "鏌ョ湅鎬昏銆佸惎鍋滅姸鎬佸拰璇存槑銆? },
    { id: "files", label: "璧勬枡涓婁紶", description: "涓婁紶璧勬枡骞惰Е鍙戝悓姝ャ€? },
    { id: "retrieval", label: "妫€绱㈤厤缃?, description: "缁存姢 TopK銆佸彫鍥炲拰閲嶆帓銆? },
    { id: "bindings", label: "鎺ュ叆瀵硅薄", description: "缁戝畾妯″潡銆佽兘鍔涘寘鍜屾彁绀鸿瘝銆? },
    { id: "history", label: "鍚屾璁板綍", description: "鍥炵湅鏈€杩戝悓姝ョ姸鎬佸拰鎽樿銆? },
  ];
  const selectedKnowledgeBaseDraft = selectedKnowledgeBase
    ? knowledgeBaseDrafts[selectedKnowledgeBase.id] || buildKnowledgeBaseDraft(selectedKnowledgeBase)
    : undefined;
  const selectedKnowledgeFileDraft = selectedKnowledgeBase
    ? newKnowledgeBaseFileDrafts[selectedKnowledgeBase.id] || buildCreateKnowledgeBaseFileDraft()
    : undefined;
  const selectedKnowledgeBindingCreateDraft = selectedKnowledgeBase
    ? newKnowledgeBindingDrafts[selectedKnowledgeBase.id] || buildCreateKnowledgeBindingDraft()
    : undefined;
  const knowledgeBindingTargetOptions = useMemo(() => {
    const workflowNameMap = new Map<string, string>();
    knowledgeBindings
      .filter((item) => item.bindingType === "WORKFLOW_STEP" && item.targetId.trim())
      .forEach((item) => {
        workflowNameMap.set(item.targetId, item.targetName || item.targetKey || item.targetId);
      });

    const workflowStepOptions = Array.from(
      new Map(
        skillPackages.flatMap((item) =>
          item.workflowStepKeys.map((workflowStepKey) => [
            workflowStepKey,
            {
              targetId: workflowStepKey,
              targetKey: workflowStepKey,
              targetName: workflowNameMap.get(workflowStepKey) || `${item.packageName}姝ラ`,
              description: `${item.packageName} 路 宸ヤ綔娴佹楠,
            } satisfies KnowledgeBindingTargetOption,
          ]),
        ),
      ).values(),
    );

    const optionMap: Record<KnowledgeBindingRecord["bindingType"], KnowledgeBindingTargetOption[]> = {
      MODULE: modules
        .filter((item) => item.moduleStatus !== "ARCHIVED")
        .map((item) => ({
          targetId: item.moduleKey,
          targetKey: item.moduleKey,
          targetName: item.moduleName,
          description: item.entryRoute || item.description,
        })),
      SKILL_PACKAGE: skillPackages
        .filter((item) => item.status !== "ARCHIVED")
        .map((item) => ({
          targetId: item.packageKey,
          targetKey: item.packageKey,
          targetName: item.packageName,
          description: item.description || `浣滅敤妯″潡锛?{item.moduleKeys.join(" / ") || "鏈缃?}`,
        })),
      PROMPT: prompts.map((item) => ({
        targetId: item.id,
        targetKey: item.id,
        targetName: item.name,
        description: item.scene ? `鍦烘櫙锛?{item.scene}` : `鐗堟湰锛?{item.version}`,
      })),
      WORKFLOW_STEP: workflowStepOptions,
    };

    if (!selectedKnowledgeBindingCreateDraft) {
      return optionMap;
    }

    const currentOptions = optionMap[selectedKnowledgeBindingCreateDraft.bindingType];
    if (
      selectedKnowledgeBindingCreateDraft.targetId.trim()
      && !currentOptions.some((item) => item.targetId === selectedKnowledgeBindingCreateDraft.targetId)
    ) {
      currentOptions.unshift({
        targetId: selectedKnowledgeBindingCreateDraft.targetId,
        targetKey: selectedKnowledgeBindingCreateDraft.targetKey,
        targetName: selectedKnowledgeBindingCreateDraft.targetName || selectedKnowledgeBindingCreateDraft.targetId,
        description: "褰撳墠宸插～鍐欑殑鑷畾涔夊璞?,
      });
    }

    return optionMap;
  }, [knowledgeBindings, modules, prompts, selectedKnowledgeBindingCreateDraft, skillPackages]);
  const selectedKnowledgeBindingTargetOptions = selectedKnowledgeBindingCreateDraft
    ? knowledgeBindingTargetOptions[selectedKnowledgeBindingCreateDraft.bindingType]
    : [];
  const selectedKnowledgeBindingTargetOption = selectedKnowledgeBindingCreateDraft
    ? selectedKnowledgeBindingTargetOptions.find((item) => item.targetId === selectedKnowledgeBindingCreateDraft.targetId)
    : undefined;
  const selectedKnowledgeRetrievalConfig = selectedKnowledgeBase
    ? knowledgeRetrievalConfigs.find((config) => config.knowledgeBaseId === selectedKnowledgeBase.id) ||
      buildDefaultKnowledgeRetrievalConfig(selectedKnowledgeBase.id)
    : undefined;
  const sortedKnowledgeBases = useMemo(
    () =>
      [...knowledgeBases].sort((a, b) => {
        const aBridge = isBrandBridgeKnowledgeBase(a) ? 1 : 0;
        const bBridge = isBrandBridgeKnowledgeBase(b) ? 1 : 0;
        if (aBridge !== bBridge) {
          return bBridge - aBridge;
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [knowledgeBases],
  );
  const selectedKnowledgeRetrievalDraft =
    selectedKnowledgeBase && selectedKnowledgeRetrievalConfig
      ? knowledgeRetrievalConfigDrafts[selectedKnowledgeBase.id] ||
        buildKnowledgeRetrievalConfigDraft(selectedKnowledgeRetrievalConfig)
      : undefined;
  const selectedKnowledgeFiles = selectedKnowledgeBase
    ? knowledgeBaseFiles.filter((file) => file.knowledgeBaseId === selectedKnowledgeBase.id)
    : [];
  const selectedKnowledgeBindings = selectedKnowledgeBase
    ? knowledgeBindings
        .filter((binding) => binding.knowledgeBaseId === selectedKnowledgeBase.id)
        .sort((a, b) => (a.priority === b.priority ? a.updatedAt.localeCompare(b.updatedAt) : a.priority - b.priority))
    : [];
  const selectedKnowledgeSyncRuns = selectedKnowledgeBase
    ? knowledgeBaseSyncRuns.filter((run) => run.knowledgeBaseId === selectedKnowledgeBase.id)
    : [];
  const selectedKnowledgeLatestSyncRun = selectedKnowledgeSyncRuns[0];
  const selectedKnowledgeHasRunningSyncRun = selectedKnowledgeSyncRuns.some((run) => run.result === "RUNNING");
  const selectedKnowledgeIsBrandBridge = isBrandBridgeKnowledgeBase(selectedKnowledgeBase);
  const selectedKnowledgeIndexedFileCount = selectedKnowledgeFiles.filter((file) => file.status === "INDEXED").length;
  const selectedKnowledgePendingFileCount = selectedKnowledgeFiles.filter((file) => file.status !== "INDEXED").length;
  const selectedKnowledgeThresholdHint =
    selectedKnowledgeRetrievalConfig?.retrievalThreshold == null
      ? "褰撳墠鏈缃槇鍊硷紝绯荤粺浼氭寜榛樿鍙洖瑙勫垯杩斿洖缁撴灉銆?
      : selectedKnowledgeRetrievalConfig.retrievalThreshold >= 0.7
        ? "褰撳墠闃堝€煎亸楂橈紝鏇撮€傚悎楂樼簿搴︾煡璇嗗簱锛涚煭璧勬枡搴撳彲鑳藉嚭鐜?0 鍛戒腑銆?
        : selectedKnowledgeRetrievalConfig.retrievalThreshold >= 0.55
          ? "褰撳墠闃堝€间腑绛夛紝閫傚悎甯歌浼佷笟璧勬枡搴撱€?
          : "褰撳墠闃堝€煎亸浣庯紝鍛戒腑浼氭洿瀹芥澗锛岄€傚悎鑱旇皟楠岃瘉涓庡皬鏍锋湰璧勬枡搴撱€?;
  const selectedKnowledgeSortedFiles = useMemo(
    () => [...selectedKnowledgeFiles].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [selectedKnowledgeFiles],
  );
  const selectedKnowledgePreviewFiles = selectedKnowledgeSortedFiles.slice(0, 4);
  const selectedKnowledgeMappedFiles = selectedKnowledgeSortedFiles.slice(0, 12);
  const selectedExpandedKnowledgeFile = selectedKnowledgeFiles.find((file) => file.id === expandedKnowledgeFileId);
  const selectedExpandedKnowledgeFileDebugState = selectedExpandedKnowledgeFile
    ? knowledgeFileDebugStateMap[selectedExpandedKnowledgeFile.id] || buildKnowledgeFileDebugState()
    : undefined;
  const selectedKnowledgeRetrievalTestDraft = selectedKnowledgeBase
    ? knowledgeRetrievalTestDrafts[selectedKnowledgeBase.id]
      || buildKnowledgeRetrievalTestDraft(selectedKnowledgeRetrievalConfig?.defaultTopK || 3)
    : undefined;
  const selectedKnowledgeRetrievalTestResult = selectedKnowledgeBase
    ? knowledgeRetrievalTestResults[selectedKnowledgeBase.id]
    : undefined;
  const selectedKnowledgeRetrievalSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if (!selectedKnowledgeFiles.length) {
      suggestions.push("褰撳墠鐭ヨ瘑搴撹繕娌℃湁璧勬枡锛屽厛鍘烩€滆祫鏂欎笂浼犫€濇柊澧炴枃妗ｏ紝鎴栦粠鍓嶇浼佷笟鐭ヨ瘑搴撴ˉ鎺ヨ祫鏂欍€?);
      return suggestions;
    }
    if (selectedKnowledgeBase.chunkCount <= 0) {
      suggestions.push("褰撳墠杩樻病鏈夌敓鎴愬垎鐗囷紝鍏堟墽琛屼竴娆″叏閲忓悓姝ワ紝鍐嶆煡鐪嬪垎鐗囧拰 embedding 鏄庣粏銆?);
    }
    if (!selectedKnowledgeIndexedFileCount) {
      suggestions.push("褰撳墠璧勬枡閮借繕鏈叆搴擄紝璇峰厛鎶婅祫鏂欏悓姝ュ埌 INDEXED 鐘舵€併€?);
    }
    if (selectedKnowledgePendingFileCount > 0) {
      suggestions.push(`杩樻湁 ${selectedKnowledgePendingFileCount} 浠借祫鏂欐湭瀹屾垚鍏ュ簱锛屾绱㈢粨鏋滃彲鑳戒笉瀹屾暣銆俙);
    }
    if (!selectedKnowledgeRetrievalTestResult) {
      suggestions.push("鍏堣繍琛屼竴娆℃绱㈡祴璇曪紝绯荤粺浼氭牴鎹懡涓儏鍐电粰鍑烘洿鍏蜂綋寤鸿銆?);
      return suggestions;
    }
    if (!selectedKnowledgeRetrievalTestResult.hitCount) {
      if ((selectedKnowledgeRetrievalConfig?.retrievalThreshold ?? 0.65) >= 0.65) {
        suggestions.push("褰撳墠鍛戒腑涓?0锛屼紭鍏堟妸妫€绱㈤槇鍊间复鏃堕檷鍒?0.4-0.55 鍐嶅娴嬨€?);
      }
      suggestions.push("濡傛灉闄嶄綆闃堝€煎悗浠嶇劧 0 鍛戒腑锛屽幓鈥滆祫鏂欎笂浼犫€濋噷灞曞紑鏂囦欢锛岀‘璁ゆ槸鍚﹀凡缁忕敓鎴愬垎鐗囧拰 embedding銆?);
      suggestions.push("娴嬭瘯闂灏介噺鍖呭惈璧勬枡涓殑鍘熻瘝锛屼緥濡備骇鍝佸悕銆佹笭閬撳悕銆佸搧鐗屽悕锛屼究浜庤仈璋冮獙璇併€?);
      return suggestions;
    }
    suggestions.push(`鏈宸插懡涓?${selectedKnowledgeRetrievalTestResult.hitCount} 鏉＄粨鏋滐紝鍙互缁х画寰皟闃堝€煎拰 TopK 瑙傚療鍙洖鍙樺寲銆俙);
    if ((selectedKnowledgeRetrievalConfig?.retrievalThreshold ?? 0) < 0.45) {
      suggestions.push("褰撳墠闃堝€艰緝浣庯紝鑱旇皟閫氳繃鍚庡缓璁洖璋冨埌 0.55 浠ヤ笂锛屽噺灏戜綆璐ㄩ噺鍙洖銆?);
    }
    if (selectedKnowledgeRetrievalTestResult.hitCount < selectedKnowledgeRetrievalTestResult.topK) {
      suggestions.push("褰撳墠杩斿洖缁撴灉灏戜簬 TopK锛岃鏄庡彲鍙洖鍐呭鏈夐檺锛屽悗缁彲浠ヨˉ鍏呮洿澶氳祫鏂欐垨閲嶆柊鍒囩墖銆?);
    }
    return suggestions;
  }, [
    selectedKnowledgeBase.chunkCount,
    selectedKnowledgeFiles.length,
    selectedKnowledgeIndexedFileCount,
    selectedKnowledgePendingFileCount,
    selectedKnowledgeRetrievalConfig?.retrievalThreshold,
    selectedKnowledgeRetrievalTestResult,
  ]);

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
        const message = error instanceof Error ? error.message : "璇诲彇鎵€灞炶兘鍔涘寘璧勪骇澶辫触";
        setSkillAssetLoadError(`鎵€灞炶兘鍔涘寘璧勪骇璇诲彇澶辫触锛?{message}`);
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
    if (dataSource !== "api" || activeTab !== "assets") {
      setIsLoadingDatabaseParameters(false);
      setDatabaseParameterSyncError("");
      return;
    }

    let cancelled = false;
    setIsLoadingDatabaseParameters(true);
    setDatabaseParameterSyncError("");

    void Promise.all([
      getBrandArchive(),
      getXiaohongshuMarketingCalendarWorkspace(),
      getDouyinOriginalCopyWorkspace(),
      getDouyinRemixCopyWorkspace(),
      getXiaohongshuMarketingPlanWorkspace(),
      getDouyinMarketingPlanWorkspace(),
    ])
      .then(([brandArchive, marketingCalendarWorkspace, topicWorkspace, materialWorkspace, xhsMarketingPlanWorkspace, douyinMarketingPlanWorkspace]) => {
        if (cancelled) {
          return;
        }
        const marketingCalendarOptions = marketingCalendarWorkspace.history
          .flatMap((record) => record.items.map((item) => ({
            value: item.id,
            label: `${item.date}锝?{item.topicName}`,
          })));
        const topicLibraryOptions = topicWorkspace.topicOptions.map((item) => ({
          value: item.id,
          label: item.topicContent,
        }));
        const materialLibraryOptions = materialWorkspace.materialOptions.map((item) => ({
          value: item.id,
          label: item.title,
        }));
        const marketingPlanCount =
          (xhsMarketingPlanWorkspace.latest ? 1 : 0)
          + (douyinMarketingPlanWorkspace.latest ? 1 : 0);

        setDatabaseParameterSync({
          brandArchive,
          injectCounts: {
            brand_profile: brandArchive.brand?.brandName ? 1 : 0,
            product_library: brandArchive.products.length,
            marketing_plan: marketingPlanCount,
          },
          selectOptions: {
            marketing_calendar: marketingCalendarOptions,
            topic_library: topicLibraryOptions,
            material_library: materialLibraryOptions,
          },
          summary: [
            `鍝佺墝璧勬枡 ${brandArchive.brand?.brandName ? 1 : 0} 椤筦,
            `浜у搧璧勬枡 ${brandArchive.products.length} 椤筦,
            `钀ラ攢绛栧垝鏂规 ${marketingPlanCount} 椤筦,
            `钀ラ攢鏃ュ巻 ${marketingCalendarOptions.length} 椤筦,
            `閫夐搴?${topicLibraryOptions.length} 椤筦,
            `绱犳潗搴?${materialLibraryOptions.length} 椤筦,
          ],
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "鏁版嵁搴撳弬鏁板悓姝ュけ璐?;
        setDatabaseParameterSync({
          injectCounts: {},
          selectOptions: {},
          summary: [],
        });
        setDatabaseParameterSyncError(`鏁版嵁搴撳弬鏁板悓姝ュけ璐ワ細${message}`);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDatabaseParameters(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, dataSource]);

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

  useEffect(() => {
    if (!knowledgeBases.length) {
      if (selectedKnowledgeBaseId) {
        setSelectedKnowledgeBaseId("");
      }
      return;
    }

    if (!knowledgeBases.find((item) => item.id === selectedKnowledgeBaseId)) {
      setSelectedKnowledgeBaseId(knowledgeBases[0]?.id || "");
    }
  }, [knowledgeBases, selectedKnowledgeBaseId]);

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
      console.error("鎸佷箙鍖栬兘鍔涘寘鎶€鑳藉叧绯诲け璐?, error);
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
      setNotice(`鎶€鑳藉凡鍒涘缓锛?{created.name}`);
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
        setNotice(`婕旂ず鎶€鑳藉凡鍒涘缓锛?{created.name}`);
        setActiveAssetsWorkspaceTab("skillZone");
        setIsCreateSkillModalOpen(false);
        setNewSkill(buildCreateSkillDraft());
        return;
      }
      const message = error instanceof Error ? error.message : "鍒涘缓鎶€鑳藉け璐?;
      setErrorMessage(`鍒涘缓鎶€鑳藉け璐ワ細${message}`);
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
        result.parsedOverview.stepSummaries.length ? `瑙ｆ瀽姝ラ ${result.parsedOverview.stepSummaries.length}` : "",
        result.parsedOverview.inputHints.length ? `杈撳叆瑕佺偣 ${result.parsedOverview.inputHints.length}` : "",
        result.parsedOverview.outputHints.length ? `杈撳嚭瑕佺偣 ${result.parsedOverview.outputHints.length}` : "",
      ].filter(Boolean).join("锛?);
      setNotice(
        `鎶€鑳藉凡瀹夎锛?{result.detectedSkillName}锛圧eferences ${result.referenceFileCount}锛孲cripts ${result.scriptFileCount}${result.initialPrompt ? "锛屽凡鐢熸垚鍒濆鎻愮ず璇? : ""}${parsedOverviewSummary ? `锛?{parsedOverviewSummary}` : ""}${installSkillDraft.packageKey !== "NONE" ? `锛屽凡瀵煎叆鑳藉姏鍖呰祫浜?${importedAssets.importedReferenceCount}/${result.referenceFileCount} References锛?{importedAssets.importedScriptCount}/${result.scriptFileCount} Scripts` : ""}锛塦,
      );
      setActiveAssetsWorkspaceTab("skillZone");
      setIsInstallSkillModalOpen(false);
      setInstallSkillDraft(buildInstallSkillDraft());
    } catch (error) {
      const message = error instanceof Error ? error.message : "瀹夎鎶€鑳藉け璐?;
      setErrorMessage(`瀹夎鎶€鑳藉け璐ワ細${message}`);
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
      setNotice(`鎻愮ず璇嶆ā鏉垮凡鍒涘缓锛?{created.name}`);
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
        setNotice(`婕旂ず鎻愮ず璇嶆ā鏉垮凡鍒涘缓锛?{created.name}`);
        setIsCreatePromptModalOpen(false);
        setNewPrompt(buildCreatePromptDraft(activeSkillConfig?.slug));
        return;
      }
      const message = error instanceof Error ? error.message : "鍒涘缓鎻愮ず璇嶆ā鏉垮け璐?;
      setErrorMessage(`鍒涘缓鎻愮ず璇嶆ā鏉垮け璐ワ細${message}`);
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
      const message = error instanceof Error ? error.message : "鎶€鑳芥彁绀鸿瘝缁戝畾淇濆瓨澶辫触";
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
              <h1>鍚庡彴绠＄悊鍙伴獙璇佷腑</h1>
              <p className="panel-subtext">姝ｅ湪妫€鏌ュ綋鍓嶇櫥褰曟€佷笌鍚庡彴瑙掕壊鏉冮檺鐭╅樀銆?/p>
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
              <h1>鍚庡彴绠＄悊鍙版殏涓嶅彲杩涘叆</h1>
              <p className="panel-subtext">{errorMessage}</p>
            </div>
          </div>
          <div className="personal-actions">
            <button type="button" className="primary-button" onClick={() => router.replace("/admin/login?next=/admin")}>
              鍘诲悗鍙扮櫥褰?            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell admin-console-shell">
      <section className="admin-console-stack">
        <nav className="admin-console-nav" aria-label="鍚庡彴瀵艰埅">
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
                    <strong>杩愯惀鑴夊啿</strong>
                    <p>鐢ㄦ渶鐭椂闂寸湅鍑哄悗鍙版槸鍚﹀湪鍋ュ悍杩愯浆銆?/p>
                  </div>
                  <span>鎬昏</span>
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
                    <strong>鏍忕洰閫熻</strong>
                    <p>姣忎釜鍚庡彴椤圭洰鍗曠嫭鎴愭爮鐩紝鏂逛究閫愬潡杩涘叆銆?/p>
                  </div>
                  <span>妯″潡</span>
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
                    <strong>浠婃棩鎽樿</strong>
                    <p>淇濈暀绠＄悊鍙板簲鏈夌殑鍟嗗姟鎰熷拰涓€鐪煎彲璇绘€с€?/p>
                  </div>
                  <span>鎽樿</span>
                </div>
                <div className="admin-summary-list">
                  <div>
                    <span>寰呮敮浠樿鍗?/span>
                    <strong>{summary.pendingCount}</strong>
                  </div>
                  <div>
                    <span>鍦ㄧ嚎鐭ヨ瘑搴?/span>
                    <strong>{knowledgeBases.filter((item) => item.status === "ACTIVE").length}</strong>
                  </div>
                  <div>
                    <span>鍚敤鎶€鑳?/span>
                    <strong>{skills.filter((item) => item.status === "ACTIVE").length}</strong>
                  </div>
                  <div>
                    <span>娲昏穬渚涘簲鍟?/span>
                    <strong>{providers.filter((item) => item.status === "ACTIVE").length}</strong>
                  </div>
                </div>
              </article>

              <article className="admin-dashboard-panel">
                <div className="admin-panel-heading">
                  <div>
                    <strong>鏈€杩戝姩鎬?/strong>
                    <p>鎶婄煡璇嗗簱鍚屾鍜屾ā鍨嬭皟鐢ㄧ殑鏈€鏂版儏鍐垫斁鍒伴椤点€?/p>
                  </div>
                  <span>鍔ㄦ€?/span>
                </div>
                <div className="admin-recent-feed">
                  <div>
                    <span>鏈€杩戝悓姝?/span>
                    <strong>{latestKnowledgeRun ? getSyncRunTitle(latestKnowledgeRun) : "鏆傛棤鍚屾璁板綍"}</strong>
                    <small>{latestKnowledgeRun ? formatDateTime(latestKnowledgeRun.startedAt) : "绛夐娆¤Е鍙戝悗灞曠ず"}</small>
                  </div>
                  <div>
                    <span>鏈€杩戞ā鍨嬭皟鐢?/span>
                    <strong>{usage[0]?.modelName || "鏆傛棤妯″瀷鏁版嵁"}</strong>
                    <small>{usage[0]?.lastCalledAt ? formatDateTime(usage[0].lastCalledAt) : "鏈褰?}</small>
                  </div>
                  <div>
                    <span>褰撳墠寤鸿</span>
                    <strong>{summary.pendingCount > 0 ? "浼樺厛澶勭悊寰呮敮浠樿鍗? : "缁х画鎵撶（鍚勬爮鐩粏鑺?}</strong>
                    <small>涓嬩竴杞彲缁х画琛ュ浘琛ㄣ€佺瓫閫夊拰鎵归噺鎿嶄綔銆?/small>
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
                      {(item.user?.nickname || "鏈煡鐢ㄦ埛")} 路 {(item.user?.mobile || "鏃犳墜鏈哄彿")} 路 {item.amountYuan} 鍏?                    </p>
                  </div>
                  <span className={`archive-pill ${item.orderStatus === "PAID" ? "status-ready" : item.orderStatus === "CANCELLED" ? "status-paused" : "status-in_progress"}`}>
                    {item.orderStatus}
                  </span>
                </div>
                <div className="personal-grid">
                  <div>
                    <span>璁㈠崟绫诲瀷</span>
                    <strong>{item.orderType}</strong>
                  </div>
                  <div>
                    <span>浼氬憳/鐐规暟</span>
                    <strong>{item.orderType === "MEMBERSHIP_PURCHASE" ? item.membership || "-" : `${item.pointsAmount || 0} 鐐筦}</strong>
                  </div>
                  <div>
                    <span>鍒涘缓鏃堕棿</span>
                    <strong>{formatDateTime(item.createdAt)}</strong>
                  </div>
                  <div>
                    <span>鏀粯鏃堕棿</span>
                    <strong>{item.paidAt ? formatDateTime(item.paidAt) : "鏈敮浠?}</strong>
                  </div>
                </div>
                <div className="personal-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleOrderAction(item.id, "pay")}
                    disabled={item.orderStatus !== "PENDING"}
                  >
                    鍚庡彴鏍囪鏀粯
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void handleOrderAction(item.id, "cancel")}
                    disabled={item.orderStatus !== "PENDING"}
                  >
                    鍙栨秷璁㈠崟
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
                      {item.provider} 路 鏈€杩戣皟鐢?{formatDateTime(item.lastCalledAt)}
                    </p>
                  </div>
                  <span className="archive-pill status-ready">{item.taskCount} 娆′换鍔?/span>
                </div>
                <div className="personal-grid">
                  <div>
                    <span>鎴愬姛浠诲姟</span>
                    <strong>{item.successCount}</strong>
                  </div>
                  <div>
                    <span>澶辫触浠诲姟</span>
                    <strong>{item.failedCount}</strong>
                  </div>
                  <div>
                    <span>鎬荤偣鏁版秷鑰?/span>
                    <strong>{item.totalPointsCost}</strong>
                  </div>
                  <div>
                    <span>浼扮畻閲戦</span>
                    <strong>{item.estimatedAmountYuan} 鍏?/strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "assets" ? (
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
                    <span className="admin-skill-card-kicker">鎶€鑳戒笓鍖?/span>
                    <span className="archive-pill status-ready">
                      {filteredSkillLeafCount} / {SKILL_CENTER_TREE.reduce((total, primary) => total + primary.sections.reduce((sum, section) => sum + section.items.length, 0), 0)} 椤?                    </span>
                  </div>
                  <div className="personal-actions" style={{ marginBottom: 16 }}>
                    <button type="button" className="secondary-button" onClick={handleOpenInstallSkillModal}>
                      瀹夎鎶€鑳?                    </button>
                    <button type="button" className="primary-button" onClick={handleOpenCreateSkillModal}>
                      鍒涘缓鎶€鑳?                    </button>
                    <button type="button" className="secondary-button" onClick={handleOpenCreatePromptModal}>
                      鍒涘缓鎻愮ず璇?                    </button>
                  </div>
                  <div className="admin-user-filter-grid" style={{ marginBottom: 16 }}>
                    <label>
                      <span>妯″潡绛涢€?/span>
                      <select value={skillModuleFilter} onChange={(event) => setSkillModuleFilter(event.target.value)}>
                        <option value="ALL">鍏ㄩ儴妯″潡</option>
                        {skillModuleFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>鑳藉姏鍖呯瓫閫?/span>
                      <select value={skillPackageFilter} onChange={(event) => setSkillPackageFilter(event.target.value)}>
                        <option value="ALL">鍏ㄩ儴鑳藉姏鍖?/option>
                        {skillPackageFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ gridColumn: "1 / -1" }}>
                      <span>鍏抽敭璇?/span>
                      <input
                        value={skillKeywordFilter}
                        placeholder="妯″潡 / 鑳藉姏鍖?/ 鎶€鑳?/ 鎻愮ず璇?
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
                      閲嶇疆绛涢€?                    </button>
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
                              <small>{primary.sections.length} 涓簩绾у垎绫?/small>
                            </span>
                            <span className={`admin-skill-primary-arrow${primaryExpanded ? " expanded" : ""}`}>鈱?/span>
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
                                      <small>{sectionExpanded ? "鏀惰捣" : `${section.items.length}`}</small>
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
                  {!filteredSkillTree.length ? <div className="admin-skill-empty">褰撳墠绛涢€夋潯浠朵笅娌℃湁鍖归厤鐨勬妧鑳介」銆?/div> : null}
                </aside>

                <section className="panel personal-center-panel admin-skill-center-panel">
                  {activeSkillLeaf ? (
                    <article className="entity-card admin-rule-card admin-skill-center-card admin-skill-form-card">
                      <div className="admin-skill-card-topline">
                        <span className="admin-skill-card-kicker">{activeSkillPrimary?.label || "鎶€鑳戒腑蹇?}</span>
                        <span className={`archive-pill ${getStatusClassName(skillCenterStatus)}`}>{getStatusLabel(skillCenterStatus)}</span>
                      </div>
                      <div className="admin-skill-card-header">
                        <div>
                          <strong>{activeSkillLeaf.label}</strong>
                          <p>{activeSkillLeaf.description || activeSkillSection?.label || "鎶€鑳藉垎绫?}</p>
                        </div>
                      </div>
                      <div className="personal-grid" style={{ marginBottom: 16 }}>
                        <SkillDimensionMetric label="褰撳墠鎶€鑳? value={activeSkillConfig?.name || skillCenterName} />
                        <SkillDimensionMetric label="鎵€鍦ㄨ兘鍔涘寘" value={activePrimarySkillRelation?.packageName || activeSkillPackageLabel} />
                        <SkillDimensionMetric label="椤哄簭浣嶇疆" value={activeSkillFlowIndex >= 0 ? `${activeSkillFlowIndex + 1} / ${activeSkillFlow.length}` : "-"} />
                        <SkillDimensionMetric label="鏇存柊鏃堕棿" value={skillCenterUpdatedAtLabel} />
                      </div>

                      <section className="entity-card" style={{ padding: 16, marginBottom: 16 }}>
                        <div className="entity-card-head">
                          <div>
                            <strong>杈撳叆椤?/strong>
                            <p className="personal-meta">鑱氬悎褰撳墠鎶€鑳戒緷璧栫殑鏁版嵁婧愩€佺郴缁熼璁鹃」銆佺敤鎴疯緭鍏ラ」銆佹ā鍨嬮€夋嫨鍜屼笂娓告妧鑳借緭鍑恒€?/p>
                          </div>
                        </div>
                        <div className="admin-skill-simple-grid">
                          <label className="admin-skill-field">
                            <span>鎵€灞炴ā鍧?/span>
                            <input value={activeSkillModuleLabel} readOnly />
                          </label>
                          <label className="admin-skill-field">
                            <span>鎵€灞炶兘鍔涘寘</span>
                            <input value={activePrimarySkillRelation?.packageName || activeSkillPackageLabel} readOnly />
                          </label>
                          <label className="admin-skill-field">
                            <span>鐘舵€?/span>
                            <select value={skillCenterStatus} onChange={(event) => handleSkillCenterStatusChange(event.target.value as SkillConfigRecord["status"])}>
                              <option value="ACTIVE">鍚敤涓?/option>
                              <option value="DRAFT">鑽夌</option>
                              <option value="DISABLED">鍋滅敤</option>
                            </select>
                          </label>
                          <label className="admin-skill-field">
                            <span>绗笁鏂规ā鍨?/span>
                            <select value={skillCenterModel} onChange={(event) => handleSkillCenterModelChange(event.target.value)}>
                              {(skillModelOptions.length ? skillModelOptions : [buildFallbackScopedModelOption(skillCenterModel || "gpt-5.4-nano")]).map((option) => (
                                <option value={option.value} key={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="admin-skill-field">
                            <span>鐐规暟鎴愭湰</span>
                            <input
                              type="number"
                              value={skillCenterPointsCost}
                              onChange={(event) => handleSkillCenterPointsCostChange(event.target.value)}
                              disabled={!activeSkillConfig}
                            />
                          </label>
                          <label className="admin-skill-field">
                            <span>鎻愮ず璇嶅満鏅?/span>
                            <input value={resolvedActivePromptScene || "-"} readOnly />
                          </label>
                          <div className="admin-skill-field admin-skill-field--full" style={{ display: "grid", gap: 12 }}>
                            <div className="entity-card" style={{ padding: 12 }}>
                              <div className="entity-card-head" style={{ marginBottom: 12 }}>
                                <div>
                                  <strong>鏁版嵁搴撳弬鏁?/strong>
                                  <p className="personal-meta">杩欓噷璇诲彇鐜版湁鏁版嵁搴撳唴瀹逛綔涓烘妧鑳借緭鍏ラ」锛屽苟鍖哄垎鈥滄鍏ュ弬鏁扳€濆拰鈥滀笅鎷夊弬鏁扳€濅袱绫汇€?/p>
                                </div>
                                <div className="personal-actions" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                                  <button type="button" className="secondary-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleApplyRecommendedDatabaseInputs()}>
                                    涓€閿ˉ榻愬父鐢ㄩ」
                                  </button>
                                  <button type="button" className="secondary-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleAddDatabaseInput("INJECT_TOGGLE")}>
                                    鏂板妞嶅叆鍙傛暟
                                  </button>
                                  <button type="button" className="secondary-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleAddDatabaseInput("SELECT_CHOICE")}>
                                    鏂板涓嬫媺鍙傛暟
                                  </button>
                                  <button type="button" className="ghost-danger-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleClearDatabaseInputs()}>
                                    娓呯┖
                                  </button>
                                </div>
                              </div>
                              <div className="personal-meta" style={{ marginBottom: 12 }}>
                                {databaseInputSummary || "褰撳墠杩樻病鏈夋暟鎹簱鍙傛暟鎽樿銆?}
                              </div>
                              <div className="personal-meta" style={{ marginBottom: 12 }}>
                                {isLoadingDatabaseParameters
                                  ? "姝ｅ湪鍚屾鏁版嵁搴撳弬鏁?.."
                                  : databaseParameterSyncSummary || "褰撳墠杩樻病鏈夊悓姝ュ埌鏁版嵁搴撳弬鏁版暟鎹€?}
                              </div>
                              {databaseParameterSyncError ? (
                                <div className="admin-skill-empty" style={{ marginTop: 0, marginBottom: 12 }}>
                                  {databaseParameterSyncError}
                                </div>
                              ) : null}
                              <div style={{ display: "grid", gap: 10 }}>
                                {activeSkillDraft?.databaseInputs.length ? activeSkillDraft.databaseInputs.map((item) => {
                                  const selectOptions = item.parameterType === "SELECT_CHOICE"
                                    ? getDatabaseSelectValueOptions(item.parameterKey, databaseParameterSync, item.selectedValue)
                                    : [
                                      { value: "INJECT", label: "妞嶅叆" },
                                      { value: "SKIP", label: `涓嶆鍏?{item.parameterLabel || "褰撳墠鏁版嵁搴撳弬鏁?}` },
                                    ];
                                  const injectCount = item.parameterType === "INJECT_TOGGLE"
                                    ? databaseParameterSync.injectCounts[item.parameterKey] || 0
                                    : 0;
                                  return (
                                    <div className="entity-card" style={{ padding: 12 }} key={item.id}>
                                      <div className="admin-skill-simple-grid">
                                        <label className="admin-skill-field">
                                          <span>鍙傛暟褰㈠紡</span>
                                          <input value={item.parameterType === "INJECT_TOGGLE" ? "妞嶅叆鍙傛暟" : "涓嬫媺鍙傛暟"} readOnly />
                                        </label>
                                        <label className="admin-skill-field">
                                          <span>鏁版嵁搴撳弬鏁?/span>
                                          <select
                                            value={item.parameterKey}
                                            onChange={(event) => handleDatabaseInputChange(item.id, { parameterKey: event.target.value })}
                                          >
                                            {(item.parameterType === "INJECT_TOGGLE" ? DATABASE_INJECT_PARAMETER_OPTIONS : DATABASE_SELECT_PARAMETER_OPTIONS).map((option) => (
                                              <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                          </select>
                                        </label>
                                        <label className="admin-skill-field">
                                          <span>涓嬫媺閫夋嫨鍊?/span>
                                          <select
                                            value={item.selectedValue}
                                            onChange={(event) => handleDatabaseInputChange(item.id, { selectedValue: event.target.value })}
                                          >
                                            {selectOptions.map((option) => (
                                              <option key={`${item.id}_${option.value || "empty"}`} value={option.value}>{option.label}</option>
                                            ))}
                                          </select>
                                        </label>
                                        <label className="admin-skill-field admin-skill-field--wide">
                                          <span>鏁版嵁搴撳悓姝?/span>
                                          <input
                                            value={
                                              item.parameterType === "INJECT_TOGGLE"
                                                ? `宸插悓姝?${injectCount} 椤规暟鎹簱鍐呭`
                                                : `宸插悓姝?${selectOptions.length ? Math.max(selectOptions.length - 1, 0) : 0} 涓彲閫夊€糮
                                            }
                                            readOnly
                                          />
                                        </label>
                                        <label className="admin-skill-field admin-skill-field--wide">
                                          <span>澶囨敞</span>
                                          <input
                                            value={item.remarks}
                                            placeholder="渚嬪锛氭鏂囬樁娈靛繀椤绘鍏ュ搧鐗岃祫鏂欙紱钀ラ攢鏃ュ巻浼樺厛璇诲彇鏈€杩戜竴鏈熴€?
                                            onChange={(event) => handleDatabaseInputChange(item.id, { remarks: event.target.value })}
                                          />
                                        </label>
                                      </div>
                                      <div className="personal-actions" style={{ marginTop: 12 }}>
                                        <button type="button" className="ghost-danger-button" onClick={() => handleRemoveDatabaseInput(item.id)}>
                                          鍒犻櫎鍙傛暟
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }) : (
                                  <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                                    杩樻病鏈夐厤缃暟鎹簱鍙傛暟銆傚彲娣诲姞鈥滃搧鐗岃祫鏂?/ 浜у搧璧勬枡 / 钀ラ攢绛栧垝鏂规鈥濈瓑妞嶅叆鍙傛暟锛屾垨鈥滆惀閿€鏃ュ巻 / 閫夐搴?/ 绱犳潗搴撯€濈瓑涓嬫媺鍙傛暟銆?                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="entity-card" style={{ padding: 12 }}>
                              <div className="entity-card-head" style={{ marginBottom: 12 }}>
                                <div>
                                  <strong>鐭ヨ瘑搴撳弬鏁?/strong>
                                  <p className="personal-meta">杩欓噷鐩存帴浣跨敤鐜版湁鐭ヨ瘑搴撲笌宸插悓姝ュ唴瀹逛綔涓烘妧鑳借緭鍏ラ」锛屾敮鎸佹寜鐭ヨ瘑搴撻€夋嫨鍜屾寜鍏蜂綋鍐呭閫夋嫨銆?/p>
                                </div>
                                <div className="personal-actions" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    style={{ whiteSpace: "nowrap" }}
                                    onClick={() => handleAddKnowledgeInput()}
                                    disabled={!activeKnowledgeBaseOptions.length}
                                  >
                                    鏂板鐭ヨ瘑搴撳弬鏁?                                  </button>
                                  <button type="button" className="ghost-danger-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleClearKnowledgeInputs()}>
                                    娓呯┖
                                  </button>
                                </div>
                              </div>
                              <div className="personal-meta" style={{ marginBottom: 12 }}>
                                {knowledgeInputSummary || "褰撳墠杩樻病鏈夌煡璇嗗簱鍙傛暟鎽樿銆?}
                              </div>
                              <div className="personal-meta" style={{ marginBottom: 12 }}>
                                {knowledgeBaseSyncSummary.length
                                  ? `宸插悓姝ョ煡璇嗗簱鍐呭锛?{knowledgeBaseSyncSummary.join(" / ")}`
                                  : "褰撳墠杩樻病鏈夊凡鍚屾鐨勭煡璇嗗簱鍐呭銆?}
                              </div>
                              <div style={{ display: "grid", gap: 10 }}>
                                {activeSkillDraft?.knowledgeInputs.length ? activeSkillDraft.knowledgeInputs.map((item) => {
                                  const contentOptions = getKnowledgeContentOptions(
                                    item.knowledgeBaseId,
                                    knowledgeBaseFiles,
                                    item.targetContentId,
                                    item.targetContentLabel,
                                  );
                                  return (
                                    <div className="entity-card" style={{ padding: 12 }} key={item.id}>
                                      <div className="admin-skill-simple-grid">
                                        <label className="admin-skill-field">
                                          <span>鐭ヨ瘑搴?/span>
                                          <select
                                            value={item.knowledgeBaseId}
                                            onChange={(event) => handleKnowledgeInputChange(item.id, { knowledgeBaseId: event.target.value })}
                                          >
                                            <option value="">璇烽€夋嫨鐭ヨ瘑搴?/option>
                                            {activeKnowledgeBaseOptions.map((option) => (
                                              <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                          </select>
                                        </label>
                                        <label className="admin-skill-field">
                                          <span>鍏蜂綋鍐呭</span>
                                          <select
                                            value={item.targetContentId}
                                            onChange={(event) => handleKnowledgeInputChange(item.id, { targetContentId: event.target.value })}
                                            disabled={!item.knowledgeBaseId}
                                          >
                                            {contentOptions.map((option) => (
                                              <option key={`${item.id}_${option.value || "all"}`} value={option.value}>{option.label}</option>
                                            ))}
                                          </select>
                                        </label>
                                        <label className="admin-skill-field">
                                          <span>鐭ヨ瘑搴撳悓姝?/span>
                                          <input
                                            value={`宸插悓姝?${knowledgeBaseFileCountMap[item.knowledgeBaseId] || 0} 椤瑰唴瀹筦}
                                            readOnly
                                          />
                                        </label>
                                        <label className="admin-skill-field admin-skill-field--wide">
                                          <span>澶囨敞</span>
                                          <input
                                            value={item.remarks}
                                            placeholder="渚嬪锛氫紭鍏堟绱㈠搧鐗?FAQ锛涘彧璇诲彇娲诲姩璧勬枡銆?
                                            onChange={(event) => handleKnowledgeInputChange(item.id, { remarks: event.target.value })}
                                          />
                                        </label>
                                      </div>
                                      <div className="personal-actions" style={{ marginTop: 12 }}>
                                        <button type="button" className="ghost-danger-button" onClick={() => handleRemoveKnowledgeInput(item.id)}>
                                          鍒犻櫎鍙傛暟
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }) : (
                                  <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                                    {activeKnowledgeBaseOptions.length
                                      ? `褰撳墠鍙€夌煡璇嗗簱锛?{activeKnowledgeBaseSummary.join(" / ")}銆傜幇鍦ㄥ彲浠ョ洿鎺ラ€夋嫨鐭ヨ瘑搴撳拰宸插悓姝ュ唴瀹广€俙
                                      : "褰撳墠杩樻病鏈夊彲鐢ㄧ煡璇嗗簱锛涚瓑鐭ヨ瘑搴撳垱寤哄苟鍚屾鍐呭鍚庯紝杩欓噷鍙洿鎺ヤ负鎶€鑳芥坊鍔犲鏉＄煡璇嗗簱杈撳叆銆?}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="entity-card" style={{ padding: 12 }}>
                              <div className="entity-card-head" style={{ marginBottom: 12 }}>
                                <div>
                                  <strong>鑷畾涔夎緭鍏ュ弬鏁?/strong>
                                  <p className="personal-meta">鏀寔澶氭潯鍒涘缓銆傚彲閰嶇疆涓嬫媺妗嗗弬鏁般€佹櫘閫氳緭鍏ユ鍙傛暟鍜屾枃浠朵笂浼犲弬鏁般€?/p>
                                </div>
                                <div className="personal-actions" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                                  <button type="button" className="secondary-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleApplyRecommendedCustomInputs()}>
                                    涓€閿ˉ榻愬父鐢ㄩ」
                                  </button>
                                  <button type="button" className="secondary-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleAddCustomInput("SELECT")}>
                                    鏂板涓嬫媺鍙傛暟
                                  </button>
                                  <button type="button" className="secondary-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleAddCustomInput("TEXT")}>
                                    鏂板杈撳叆妗?                                  </button>
                                  <button type="button" className="secondary-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleAddCustomInput("FILE")}>
                                    鏂板鏂囦欢鍙傛暟
                                  </button>
                                  <button type="button" className="ghost-danger-button" style={{ whiteSpace: "nowrap" }} onClick={() => handleClearCustomInputs()}>
                                    娓呯┖
                                  </button>
                                </div>
                              </div>
                              <div className="personal-meta" style={{ marginBottom: 12 }}>
                                {customInputSummary || "褰撳墠杩樻病鏈夎嚜瀹氫箟杈撳叆鍙傛暟鎽樿銆?}
                              </div>
                              <div style={{ display: "grid", gap: 10 }}>
                                {activeSkillDraft?.customInputs.length ? activeSkillDraft.customInputs.map((item) => (
                                  <div className="entity-card" style={{ padding: 12 }} key={item.id}>
                                    <div className="admin-skill-simple-grid">
                                      <label className="admin-skill-field">
                                        <span>鍙傛暟褰㈠紡</span>
                                        <input
                                          value={item.inputType === "SELECT" ? "涓嬫媺妗嗛€夋嫨" : item.inputType === "FILE" ? "鏂囦欢涓婁紶" : "杈撳叆妗?}
                                          readOnly
                                        />
                                      </label>
                                      <label className="admin-skill-field">
                                        <span>鍙傛暟鍚嶇О</span>
                                        <input
                                          value={item.label}
                                          placeholder="渚嬪锛氬墽鏈被鍨嬨€佺敤鎴疯姹傘€佸弬鑰冩枃浠?
                                          onChange={(event) => handleCustomInputChange(item.id, { label: event.target.value })}
                                        />
                                      </label>
                                      <label className="admin-skill-field">
                                        <span>鏄惁蹇呭～</span>
                                        <select
                                          value={item.required ? "YES" : "NO"}
                                          onChange={(event) => handleCustomInputChange(item.id, { required: event.target.value === "YES" })}
                                        >
                                          <option value="NO">闈炲繀濉?/option>
                                          <option value="YES">蹇呭～</option>
                                        </select>
                                      </label>
                                      {item.inputType === "SELECT" ? (
                                        <label className="admin-skill-field admin-skill-field--wide">
                                          <span>涓嬫媺閫夐」</span>
                                          <textarea
                                            value={item.options.join("\n")}
                                            placeholder="姣忚涓€涓€夐」锛屼緥濡傦細鍝佺墝瀹ｄ紶鍓ф湰"
                                            onChange={(event) => handleCustomInputChange(item.id, { options: splitLines(event.target.value) })}
                                          />
                                        </label>
                                      ) : null}
                                      {item.inputType === "TEXT" ? (
                                        <label className="admin-skill-field admin-skill-field--wide">
                                          <span>杈撳叆妗嗘彁绀?/span>
                                          <input
                                            value={item.placeholder}
                                            placeholder="渚嬪锛氳杈撳叆鏈鍐呭鍒涗綔瑕佹眰"
                                            onChange={(event) => handleCustomInputChange(item.id, { placeholder: event.target.value })}
                                          />
                                        </label>
                                      ) : null}
                                      {item.inputType === "FILE" ? (
                                        <label className="admin-skill-field admin-skill-field--wide">
                                          <span>鍏佽涓婁紶鏍煎紡</span>
                                          <input
                                            value={item.acceptedFileTypes}
                                            placeholder="渚嬪锛?pdf,.docx,image/*"
                                            onChange={(event) => handleCustomInputChange(item.id, { acceptedFileTypes: event.target.value })}
                                          />
                                        </label>
                                      ) : null}
                                      <label className="admin-skill-field admin-skill-field--wide">
                                        <span>澶囨敞</span>
                                        <input
                                          value={item.remarks}
                                          placeholder="渚嬪锛氭枃浠朵笂浼犲悗浣滀负鏁呬簨鏉垮弬鑰冨浘锛涙枃鏈緭鍏ョ敤浜庤ˉ鍏呭垱浣滆姹傘€?
                                          onChange={(event) => handleCustomInputChange(item.id, { remarks: event.target.value })}
                                        />
                                      </label>
                                    </div>
                                    <div className="personal-actions" style={{ marginTop: 12 }}>
                                      <button type="button" className="ghost-danger-button" onClick={() => handleRemoveCustomInput(item.id)}>
                                        鍒犻櫎鍙傛暟
                                      </button>
                                    </div>
                                  </div>
                                )) : (
                                  <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                                    杩樻病鏈夐厤缃嚜瀹氫箟杈撳叆鍙傛暟銆傚彲缁х画涓烘妧鑳藉鍔犱笅鎷夋閫夋嫨銆佽緭鍏ユ鎴栨枃浠朵笂浼犲弬鏁般€?                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>杈撳叆椤硅ˉ鍏呰鏄?/span>
                            <textarea
                              value={activeSkillDraft?.inputSummary || ""}
                              onChange={(event) => {
                                if (activeSkillConfig) {
                                  handleSkillDraftChange(activeSkillConfig.id, { inputSummary: event.target.value });
                                }
                              }}
                              placeholder="鐢ㄤ簬琛ュ厖璇ユ妧鑳界殑杈撳叆椤硅鍒欍€侀粯璁や紭鍏堢骇鍜岀壒娈婂鐞嗚鏄庛€?
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>涓婃父鎶€鑳借緭鍑?/span>
                            <input value={upstreamSkillNames.join(" -> ") || "褰撳墠鎶€鑳戒负棣栦釜姝ラ锛屾病鏈変笂娓告妧鑳借緭鍑?} readOnly />
                          </label>
                        </div>
                      </section>

                      <section className="entity-card" style={{ padding: 16, marginBottom: 16 }}>
                        <div className="entity-card-head">
                          <div>
                            <strong>鎻愮ず璇嶅強鍏朵粬鍏冪礌</strong>
                            <p className="personal-meta">杩欓噷缁存姢鎻愮ず璇嶇増鏈€佹ā鍨嬨€丷eferences 璧勪骇銆丼cripts 璧勪骇绛夋妧鑳芥墽琛岃绱犮€?/p>
                          </div>
                        </div>
                        <div className="admin-skill-simple-grid">
                          <label className="admin-skill-field">
                            <span>褰撳墠鎻愮ず璇?/span>
                            <input value={skillCenterName} readOnly />
                          </label>
                          <label className="admin-skill-field">
                            <span>鎵ц鎶€鑳?/span>
                            <input value={activeSkillConfig?.name || "-"} readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>References 鏉ユ簮</span>
                            <input
                              value={
                                activePrimarySkillRelation
                                  ? `${activeSkillAssetSourceLabel} / ${activeReferenceAssets.length} 椤?/ ${activeSkillDraft?.hasReferenceAssetSelection ? `宸查€?${effectiveReferenceAssetKeys.length} 椤筦 : "榛樿鍏ㄧ户鎵?}`
                                  : "褰撳墠鎶€鑳藉皻鏈粦瀹氳兘鍔涘寘锛屾殏鏃犲彲缁ф壙 References 璧勪骇"
                              }
                              readOnly
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>Scripts 鏉ユ簮</span>
                            <input
                              value={
                                activePrimarySkillRelation
                                  ? `${activeSkillAssetSourceLabel} / ${activeScriptAssets.length} 椤?/ ${activeSkillDraft?.hasScriptAssetSelection ? `宸查€?${effectiveScriptAssetKeys.length} 椤筦 : "榛樿鍏ㄧ户鎵?}`
                                  : "褰撳墠鎶€鑳藉皻鏈粦瀹氳兘鍔涘寘锛屾殏鏃犲彲缁ф壙 Scripts 璧勪骇"
                              }
                              readOnly
                            />
                          </label>
                        </div>
                        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                          {dataSource === "seed" ? (
                            <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                              褰撳墠涓烘湰鍦版紨绀烘暟鎹紝鎶€鑳界湡瀹炶祫浜т粛浠ヨ兘鍔涘寘璇︽儏椤电淮鎶わ紱鍒囨崲鍒版帴鍙ｆ暟鎹悗锛岃繖閲屼細鑷姩灞曠ず鎵€灞炶兘鍔涘寘鐨?References / Scripts銆?                            </div>
                          ) : null}
                          {!activePrimarySkillRelation ? (
                            <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                              褰撳墠鎶€鑳藉皻鏈粦瀹氳兘鍔涘寘锛屽洜姝よ繕娌℃湁鍙鐢ㄧ殑 References / Scripts 璧勪骇鏉ユ簮銆?                            </div>
                          ) : null}
                          {isLoadingActiveSkillAssets ? (
                            <div className="admin-skill-empty" style={{ marginTop: 0 }}>
                              姝ｅ湪璇诲彇鎵€灞炶兘鍔涘寘鐨勭湡瀹炶祫浜?..
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
                                title="References 璧勪骇"
                                summary={activeSkillDraft?.hasReferenceAssetSelection ? "褰撳墠鎶€鑳藉凡浠庢墍灞炶兘鍔涘寘璧勪骇涓€夋嫨瀛愰泦锛涗繚瀛樺悗浼氶殢鎶€鑳借鏄庝竴璧锋寔涔呭寲銆? : "褰撳墠鎶€鑳介粯璁ょ户鎵挎墍灞炶兘鍔涘寘涓殑鍏ㄩ儴 References 璧勪骇锛涘嬀閫夊悗鍙敹鍙ｄ负鎶€鑳界骇閫夋嫨銆?}
                                emptyText="鎵€灞炶兘鍔涘寘褰撳墠杩樻病鏈夊弬鑰冭祫鏂欒祫浜с€?
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
                                title="Scripts 璧勪骇"
                                summary={activeSkillDraft?.hasScriptAssetSelection ? "褰撳墠鎶€鑳藉凡浠庢墍灞炶兘鍔涘寘鑴氭湰涓€夋嫨瀛愰泦锛涗繚瀛樺悗浼氶殢鎶€鑳借鏄庝竴璧锋寔涔呭寲銆? : "褰撳墠鎶€鑳介粯璁ょ户鎵挎墍灞炶兘鍔涘寘涓殑鍏ㄩ儴 Scripts 璧勪骇锛涘嬀閫夊悗鍙敹鍙ｄ负鎶€鑳界骇閫夋嫨銆?}
                                emptyText="鎵€灞炶兘鍔涘寘褰撳墠杩樻病鏈夎剼鏈祫浜с€?
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
                          <span>鎻愮ず璇嶅唴瀹?/span>
                          <textarea
                            value={skillCenterPromptValue}
                            onChange={(event) => handleSkillCenterPromptChange(event.target.value)}
                            disabled={!activePromptConfig}
                            placeholder={activePromptConfig ? "姝ｅ湪鍔犺浇鎻愮ず璇?.." : "褰撳墠鎶€鑳介」灏氭湭缁戝畾鎻愮ず璇嶆ā鏉?}
                          />
                        </label>
                      </section>

                      <section className="entity-card" style={{ padding: 16 }}>
                        <div className="entity-card-head">
                          <div>
                            <strong>杈撳嚭</strong>
                            <p className="personal-meta">褰撳墠鎶€鑳借緭鍑轰細浣滀负鍚庣画鎶€鑳借緭鍏ワ紝鎴栫洿鎺ユ垚涓鸿兘鍔涘寘鏈€缁堜骇鍑恒€?/p>
                          </div>
                        </div>
                        <div className="admin-skill-simple-grid">
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>鎶€鑳介摼璺?/span>
                            <input value={activeSkillFlow.map((item) => item.skillName || item.skillSlug).join(" -> ") || "褰撳墠杩樻病鏈夐厤缃兘鍔涘寘鎶€鑳介摼璺?} readOnly />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>姝ラ鎽樿</span>
                            <textarea
                              value={activeSkillDraft?.workflowSummary || ""}
                              onChange={(event) => {
                                if (activeSkillConfig) {
                                  handleSkillDraftChange(activeSkillConfig.id, { workflowSummary: event.target.value });
                                }
                              }}
                              placeholder="渚嬪锛?. 鐢熸垚瑙嗛鍓ф湰 2. 鐢熸垚鏁呬簨鏉挎彁绀鸿瘝 3. 鐢熸垚鏁呬簨鏉垮浘鐗?4. 鐢熸垚鐭棰戙€?
                            />
                          </label>
                          <label className="admin-skill-field admin-skill-field--wide">
                            <span>涓嬫父杈撳嚭鍘诲悜</span>
                            <input value={activeOutputSummary} readOnly />
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
                          {isSavingSkillCenter ? "淇濆瓨涓?.." : "淇濆瓨褰撳墠鎻愮ず璇?}
                        </button>
                      </div>
                    </article>
                  ) : (
                    <div className="admin-skill-empty">璇峰厛浠庡乏渚ч€夋嫨涓€涓笁绾ф妧鑳介」銆?/div>
                  )}
                </section>
            {isCreateSkillModalOpen ? (
              <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseCreateSkillModal}>
                <div
                  className="entity-card admin-user-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="鍒涘缓鎶€鑳?
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-user-modal-topbar">
                    <div>
                      <span className="archive-pill status-ready">鎶€鑳藉垱寤?/span>
                      <strong>鍒涘缓鎶€鑳戒富鍔熻兘鍗曞厓</strong>
                      <p className="personal-meta">鎶€鑳芥槸涓昏鍔熻兘瀹炵幇鍗曞厓锛涘垱寤哄悗鍐嶇敱鑳藉姏鍖呮寜椤哄簭缁勫悎鎴愬畬鏁村姛鑳介摼璺€?/p>
                    </div>
                    <button type="button" className="secondary-button" onClick={handleCloseCreateSkillModal} disabled={isCreatingSkill}>
                      鍏抽棴
                    </button>
                  </div>
                  <div className="admin-skill-simple-grid">
                    <label className="admin-skill-field"><span>鎶€鑳藉悕绉?/span><input value={newSkill.name} placeholder="渚嬪锛氬叕浼楀彿鏂囩珷鐢熸垚" onChange={(event) => setNewSkill((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>鎶€鑳芥爣璇?/span><input value={newSkill.slug} placeholder="渚嬪锛歸echat-article-generator" onChange={(event) => setNewSkill((current) => ({ ...current, slug: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>鍒嗙被</span><select value={newSkill.category} onChange={(event) => setNewSkill((current) => ({ ...current, category: event.target.value }))}>{createSkillCategoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label className="admin-skill-field"><span>鐘舵€?/span><select value={newSkill.status} onChange={(event) => setNewSkill((current) => ({ ...current, status: event.target.value as SkillConfigRecord["status"] }))}><option value="ACTIVE">鍚敤涓?/option><option value="DRAFT">鑽夌</option><option value="DISABLED">鍋滅敤</option></select></label>
                    <label className="admin-skill-field"><span>渚涘簲鍟?/span><select value={newSkill.provider} onChange={(event) => setNewSkill((current) => ({ ...current, provider: event.target.value }))}><option value="">璇烽€夋嫨渚涘簲鍟?/option>{createSkillProviderOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>榛樿妯″瀷</span><select value={newSkill.defaultModel} onChange={(event) => setNewSkill((current) => ({ ...current, defaultModel: event.target.value }))}><option value="">璇烽€夋嫨妯″瀷</option>{createSkillModelOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>鐐规暟鎴愭湰</span><input type="number" value={newSkill.pointsCost} onChange={(event) => setNewSkill((current) => ({ ...current, pointsCost: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>鎵€灞炴ā鍧?/span><select value={newSkill.moduleKey} onChange={(event) => setNewSkill((current) => ({ ...current, moduleKey: event.target.value }))}><option value="NONE">鏆備笉缁戝畾</option>{skillModuleFilterOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>鎵€灞炶兘鍔涘寘</span><select value={newSkill.packageKey} onChange={(event) => setNewSkill((current) => ({ ...current, packageKey: event.target.value }))}><option value="NONE">鏆備笉缁戝畾</option>{skillPackageFilterOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label className="admin-skill-field"><span>鎻愮ず璇嶅満鏅?/span><select value={newSkill.promptScene} onChange={(event) => setNewSkill((current) => ({ ...current, promptScene: event.target.value }))}><option value="">绋嶅悗缁戝畾</option>{createSkillPromptSceneOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>鎶€鑳借鏄?/span><textarea value={newSkill.description} onChange={(event) => setNewSkill((current) => ({ ...current, description: event.target.value }))} /></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>褰掑睘璇存槑</span><textarea value={newSkill.bindingRemarks} onChange={(event) => setNewSkill((current) => ({ ...current, bindingRemarks: event.target.value }))} /></label>
                  </div>
                  <div className="personal-actions">
                    <button type="button" className="secondary-button" onClick={handleCloseCreateSkillModal} disabled={isCreatingSkill}>鍙栨秷</button>
                    <button type="button" className="primary-button" onClick={() => void handleCreateSkill()} disabled={isCreatingSkill || !newSkill.name.trim() || !newSkill.slug.trim() || !newSkill.category.trim() || !newSkill.provider.trim() || !newSkill.defaultModel.trim()}>
                      {isCreatingSkill ? "鍒涘缓涓?.." : "纭鍒涘缓"}
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
                  aria-label="瀹夎鎶€鑳?
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-user-modal-topbar">
                    <div>
                      <span className="archive-pill status-ready">鎶€鑳藉畨瑁?/span>
                      <strong>涓婁紶 zip 鎴?GitHub 閾炬帴瀹夎鎶€鑳?/strong>
                      <p className="personal-meta">鏈嶅姟绔細瑙ｆ瀽 `SKILL.md` 骞惰嚜鍔ㄥ垱寤烘妧鑳斤紝鍐嶆寜浣犵殑閫夋嫨鎸傚埌妯″潡銆佽兘鍔涘寘鍜屾彁绀鸿瘝鍦烘櫙銆?/p>
                    </div>
                    <button type="button" className="secondary-button" onClick={handleCloseInstallSkillModal} disabled={isInstallingSkill}>
                      鍏抽棴
                    </button>
                  </div>
                  <div className="admin-skill-simple-grid">
                    <label className="admin-skill-field">
                      <span>瀹夎鏉ユ簮</span>
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
                        <option value="GITHUB">GitHub 閾炬帴</option>
                        <option value="ZIP_UPLOAD">鎶€鑳藉帇缂╁寘</option>
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>鍒嗙被</span>
                      <select value={installSkillDraft.category} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, category: event.target.value }))}>
                        {createSkillCategoryOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>鐘舵€?/span>
                      <select value={installSkillDraft.status} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, status: event.target.value as SkillConfigRecord["status"] }))}>
                        <option value="ACTIVE">鍚敤涓?/option>
                        <option value="DRAFT">鑽夌</option>
                        <option value="DISABLED">鍋滅敤</option>
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>渚涘簲鍟?/span>
                      <select value={installSkillDraft.provider} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, provider: event.target.value }))}>
                        <option value="">璇烽€夋嫨渚涘簲鍟?/option>
                        {createSkillProviderOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>榛樿妯″瀷</span>
                      <select value={installSkillDraft.defaultModel} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, defaultModel: event.target.value }))}>
                        <option value="">璇烽€夋嫨妯″瀷</option>
                        {buildScopedModelOptions(providers, installSkillDraft.defaultModel).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>鐐规暟鎴愭湰</span>
                      <input type="number" value={installSkillDraft.pointsCost} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, pointsCost: event.target.value }))} />
                    </label>
                    {installSkillDraft.sourceType === "GITHUB" ? (
                      <label className="admin-skill-field admin-skill-field--full">
                        <span>GitHub 鎶€鑳界洰褰曢摼鎺?/span>
                        <input
                          value={installSkillDraft.githubUrl}
                          placeholder="渚嬪锛歨ttps://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-post-to-wechat"
                          onChange={(event) => setInstallSkillDraft((current) => ({ ...current, githubUrl: event.target.value }))}
                        />
                      </label>
                    ) : (
                      <label className="admin-skill-field admin-skill-field--full">
                        <span>鎶€鑳藉帇缂╁寘</span>
                        <input
                          type="file"
                          accept=".zip,application/zip,application/x-zip-compressed"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleInstallSkillArchiveChange(file);
                          }}
                        />
                        <small className="personal-meta">{installSkillDraft.archiveFileName || "璇蜂笂浼犲崟涓妧鑳界洰褰曞帇缂╁寘锛屽帇缂╁寘涓繀椤诲寘鍚?SKILL.md"}</small>
                      </label>
                    )}
                    <label className="admin-skill-field">
                      <span>鎵€灞炴ā鍧?/span>
                      <select value={installSkillDraft.moduleKey} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, moduleKey: event.target.value }))}>
                        <option value="NONE">鏆備笉缁戝畾</option>
                        {skillModuleFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>鎵€灞炶兘鍔涘寘</span>
                      <select value={installSkillDraft.packageKey} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, packageKey: event.target.value }))}>
                        <option value="NONE">鏆備笉缁戝畾</option>
                        {skillPackageFilterOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field">
                      <span>鎻愮ず璇嶅満鏅?/span>
                      <select value={installSkillDraft.promptScene} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, promptScene: event.target.value }))}>
                        <option value="">绋嶅悗缁戝畾</option>
                        {createSkillPromptSceneOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-skill-field admin-skill-field--full">
                      <span>瀹夎琛ュ厖璇存槑</span>
                      <textarea
                        value={installSkillDraft.descriptionPrefix}
                        placeholder="渚嬪锛氫粠 AI CODING / GitHub 瀵煎叆锛岀敤浜庡悗鍙版妧鑳戒腑蹇冭嚜鍔ㄥ畨瑁呫€?
                        onChange={(event) => setInstallSkillDraft((current) => ({ ...current, descriptionPrefix: event.target.value }))}
                      />
                    </label>
                    <label className="admin-skill-field admin-skill-field--full">
                      <span>褰掑睘璇存槑</span>
                      <textarea value={installSkillDraft.bindingRemarks} onChange={(event) => setInstallSkillDraft((current) => ({ ...current, bindingRemarks: event.target.value }))} />
                    </label>
                  </div>
                  <div className="personal-actions">
                    <button type="button" className="secondary-button" onClick={handleCloseInstallSkillModal} disabled={isInstallingSkill}>鍙栨秷</button>
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
                      {isInstallingSkill ? "瀹夎涓?.." : "寮€濮嬪畨瑁?}
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
                  aria-label="鍒涘缓鎻愮ず璇嶆ā鏉?
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-user-modal-topbar">
                    <div>
                      <span className="archive-pill status-ready">鎻愮ず璇嶅垱寤?/span>
                      <strong>鍒涘缓鎻愮ず璇嶅苟缁戝畾鎶€鑳?/strong>
                      <p className="personal-meta">鍒涘缓瀹屾垚鍚庯紝濡傛灉缁戝畾鍒版煇涓妧鑳斤紝浼氱珛鍗虫浛鎹㈣鎶€鑳藉綋鍓嶄娇鐢ㄧ殑鎻愮ず璇嶅満鏅€?/p>
                    </div>
                    <button type="button" className="secondary-button" onClick={handleCloseCreatePromptModal} disabled={isCreatingPrompt}>
                      鍏抽棴
                    </button>
                  </div>
                  <div className="admin-skill-simple-grid">
                    <label className="admin-skill-field"><span>鎻愮ず璇嶅悕绉?/span><input value={newPrompt.name} onChange={(event) => setNewPrompt((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>鎻愮ず璇嶅満鏅?/span><input value={newPrompt.scene} onChange={(event) => setNewPrompt((current) => ({ ...current, scene: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>鐗堟湰</span><input value={newPrompt.version} onChange={(event) => setNewPrompt((current) => ({ ...current, version: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>鐘舵€?/span><select value={newPrompt.status} onChange={(event) => setNewPrompt((current) => ({ ...current, status: event.target.value as PromptTemplateRecord["status"] }))}><option value="ACTIVE">鍚敤涓?/option><option value="DRAFT">鑽夌</option><option value="DISABLED">鍋滅敤</option></select></label>
                    <label className="admin-skill-field"><span>妯″瀷</span><input value={newPrompt.modelName} onChange={(event) => setNewPrompt((current) => ({ ...current, modelName: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>娓╁害</span><input type="number" value={newPrompt.temperature} onChange={(event) => setNewPrompt((current) => ({ ...current, temperature: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>鏈€澶?Tokens</span><input type="number" value={newPrompt.maxTokens} onChange={(event) => setNewPrompt((current) => ({ ...current, maxTokens: event.target.value }))} /></label>
                    <label className="admin-skill-field"><span>缁戝畾鎶€鑳?/span><select value={newPrompt.bindSkillSlug} onChange={(event) => setNewPrompt((current) => ({ ...current, bindSkillSlug: event.target.value }))}><option value="NONE">鏆備笉缁戝畾</option>{skills.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>鎻愮ず璇嶅唴瀹?/span><textarea value={newPrompt.content} onChange={(event) => setNewPrompt((current) => ({ ...current, content: event.target.value }))} /></label>
                    <label className="admin-skill-field admin-skill-field--full"><span>缁戝畾璇存槑</span><textarea value={newPrompt.bindingRemarks} onChange={(event) => setNewPrompt((current) => ({ ...current, bindingRemarks: event.target.value }))} /></label>
                  </div>
                  <div className="personal-actions">
                    <button type="button" className="secondary-button" onClick={handleCloseCreatePromptModal} disabled={isCreatingPrompt}>鍙栨秷</button>
                    <button type="button" className="primary-button" onClick={() => void handleCreatePrompt()} disabled={isCreatingPrompt || !newPrompt.name.trim() || !newPrompt.scene.trim() || !newPrompt.modelName.trim()}>
                      {isCreatingPrompt ? "鍒涘缓涓?.." : "纭鍒涘缓"}
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
            skillPackages={skillPackages}
        skillAssetBindings={skillAssetBindings}
            knowledgeBases={knowledgeBases}
            providers={providers}
            dataSource={dataSource}
            onModulesChange={setModules}
            onNotice={setNotice}
            onError={setErrorMessage}
          />
        ) : activeTab === "knowledge" ? (
          <div className="admin-provider-layout knowledge-admin-layout">
            <div className="admin-provider-stack">
              <article className="panel admin-provider-filter-card">
                <div className="admin-provider-filter-head">
                  <div>
                    <strong>鏂板缓鐭ヨ瘑搴?/strong>
                    <p>鍏堝垱寤虹煡璇嗙┖闂达紝鍐嶇户缁笂浼犺祫鏂欏拰鍋氭绱㈤厤缃€傚悓姝ョ姸鎬併€佸巻鍙插洖鎵у拰楂樼骇缁戝畾鏀逛负鍙充晶鍒嗘澘鍧楃淮鎶ゃ€?/p>
                  </div>
                  <span className="archive-pill status-in_progress">CREATE</span>
                </div>
                <div className="admin-provider-filter-grid">
                  <label className="admin-provider-field">
                    <span>鐭ヨ瘑搴撳悕绉?/span>
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
                  <label className="admin-provider-field">
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
                  <label className="admin-provider-field">
                    <span>鏁版嵁婧愮被鍨?/span>
                    <select
                      value={newKnowledgeBase.sourceType}
                      onChange={(event) =>
                        setNewKnowledgeBase((current) => ({
                          ...current,
                          sourceType: event.target.value as KnowledgeBaseRecord["sourceType"],
                        }))
                      }
                    >
                      <option value="MANUAL">鎵嬪姩缁存姢</option>
                      <option value="FEISHU">椋炰功</option>
                      <option value="NOTION">Notion</option>
                      <option value="OSS">瀵硅薄瀛樺偍</option>
                    </select>
                  </label>
                  <label className="admin-provider-field">
                    <span>鐭ヨ瘑搴撹鏄?/span>
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
                </div>
                <div className="admin-provider-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleCreateKnowledgeBase()}
                    disabled={isCreatingKnowledgeBase || !newKnowledgeBase.name.trim() || !newKnowledgeBase.slug.trim()}
                  >
                    {isCreatingKnowledgeBase ? "鍒涘缓涓?.." : "鏂板缓鐭ヨ瘑搴?}
                  </button>
                </div>
              </article>

              <article className="panel admin-provider-filter-card">
                <div className="admin-provider-filter-head">
                  <div>
                    <strong>鐭ヨ瘑搴撳垪琛?/strong>
                    <p>宸︿晶鎸夌煡璇嗗簱鍜屾澘鍧楀垏鎹紝鍙充晶鍙淮鎶ゅ綋鍓嶉」鐩唴瀹癸紝鍑忓皯鏃犲叧娌荤悊椤瑰共鎵般€?/p>
                  </div>
                  <div className="admin-provider-actions" style={{ gap: 8 }}>
                    <span className={`archive-pill ${knowledgeDataSource === "api" ? "status_success" : "status_warning"}`}>
                      {knowledgeDataSource === "api" ? "鐭ヨ瘑鎺ュ彛姝ｅ父" : "鐭ヨ瘑鎺ュ彛寮傚父"}
                    </span>
                    <span className="archive-pill status_success">{knowledgeBases.length}</span>
                  </div>
                </div>
                {knowledgeLoadError ? (
                  <div
                    style={{
                      marginBottom: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(217, 83, 79, 0.24)",
                      background: "rgba(217, 83, 79, 0.08)",
                      color: "#9f3a38",
                      padding: "12px 14px",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>褰撳墠鐭ヨ瘑搴撳垪琛ㄦ湭浣跨敤婕旂ず鐭ヨ瘑搴撳崰浣嶏紝涓嬮潰鏄疄闄呭け璐ユ帴鍙ｃ€?/strong>
                    <div style={{ marginTop: 4 }}>{knowledgeLoadError}</div>
                  </div>
                ) : null}
                <div className="knowledge-admin-list">
                  {sortedKnowledgeBases.length ? (
                    sortedKnowledgeBases.map((item) => {
                      const latestRun = knowledgeBaseSyncRuns.find((run) => run.knowledgeBaseId === item.id);
                      const itemFiles = knowledgeBaseFiles
                        .filter((file) => file.knowledgeBaseId === item.id)
                        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
                      const itemBindings = knowledgeBindings.filter((binding) => binding.knowledgeBaseId === item.id);
                      const isBridgeKnowledge = isBrandBridgeKnowledgeBase(item);
                      const latestFile = itemFiles[0];
                      const indexedFileCount = itemFiles.filter((file) => file.status === "INDEXED").length;
                      const pendingFileCount = itemFiles.length - indexedFileCount;
                      const previewFiles = itemFiles.slice(0, 2);
                      const previewListFiles =
                        expandedKnowledgeBridgeBaseIds[item.id] || itemFiles.length <= 3 ? itemFiles : itemFiles.slice(0, 3);
                      return (
                        <article key={item.id} className="admin-rules-stack">
                          <button
                            type="button"
                            className="knowledge-admin-list-item"
                            data-active={selectedKnowledgeBase?.id === item.id}
                            onClick={() => handleSelectKnowledgeBase(item.id)}
                          >
                            <div>
                              <strong>{item.name}</strong>
                              <p>
                                {getKnowledgeBaseContainerLabel(item)} 路 璧勬枡 {itemFiles.length} 路 鎺ュ叆瀵硅薄 {itemBindings.length}
                              </p>
                              {isBridgeKnowledge ? (
                                <p className="personal-meta">
                                  鍓嶇璧勬枡鍗?{itemFiles.length} 寮?路 宸插叆搴?{indexedFileCount} 寮?                                  {pendingFileCount > 0 ? ` 路 寰呭悓姝?${pendingFileCount} 寮燻 : ""}
                                </p>
                              ) : null}
                            </div>
                            <div className="knowledge-admin-list-tags">
                              <span className="knowledge-admin-list-tag">{getKnowledgeSourceTypeLabel(item.sourceType)}</span>
                              <span className="knowledge-admin-list-tag">{isBridgeKnowledge ? "鍓嶇妗ユ帴" : "鍚庡彴缁存姢"}</span>
                              {isBridgeKnowledge && previewFiles.length
                                ? previewFiles.map((file) => (
                                    <span className="knowledge-admin-list-tag" key={file.id}>
                                      {file.fileName}
                                    </span>
                                  ))
                                : null}
                            </div>
                            <span className={`archive-pill ${getStatusClassName(item.status)}`}>{getKnowledgeBaseStatusLabel(item.status)}</span>
                            <span className="knowledge-admin-list-meta">
                              {isBridgeKnowledge
                                ? `鏈€杩戣祫鏂欙細${latestFile ? latestFile.fileName : "绛夊緟鍓嶇淇濆瓨璧勬枡"}`
                                : `鏈€杩戝悓姝ワ細${latestRun ? getKnowledgeRunResultLabel(latestRun.result) : getKnowledgeSyncStatusLabel(item.syncStatus)}`}
                            </span>
                          </button>
                          {isBridgeKnowledge && itemFiles.length ? (
                            <div className="admin-rules-stack" style={{ marginTop: 8, paddingLeft: 12 }}>
                              {previewListFiles.map((file) => (
                                <button
                                  type="button"
                                  key={file.id}
                                  className="knowledge-admin-section-item"
                                  data-active={selectedKnowledgeListFileId === file.id}
                                  onClick={() => handleSelectKnowledgeBridgeFile(item.id, file.id)}
                                >
                                  <strong>{file.fileName}</strong>
                                  <span>
                                    {file.sourceName || "鏈～鍐欐潵婧?} 路 {getKnowledgeFileStatusLabel(file.status)} 路 鍒嗙墖 {file.chunkCount}
                                  </span>
                                </button>
                              ))}
                              {itemFiles.length > 3 ? (
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => handleToggleKnowledgeBridgeFiles(item.id)}
                                >
                                  {expandedKnowledgeBridgeBaseIds[item.id] ? "鏀惰捣鍓嶇璧勬枡" : `灞曞紑鍏ㄩ儴 ${itemFiles.length} 寮犺祫鏂欏崱`}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  ) : knowledgeLoadError ? (
                    <div className="admin-empty-state">
                      <strong>鐭ヨ瘑搴撴帴鍙ｅ姞杞藉け璐?/strong>
                      <p>褰撳墠宸插仠姝㈠洖閫€婕旂ず鐭ヨ瘑搴擄紝璇峰厛鎸変笂鏂规姤閿欎慨澶嶇湡瀹炴帴鍙ｏ紝鍐嶆煡鐪嬪墠绔ˉ鎺ュ鍣ㄣ€?/p>
                    </div>
                  ) : (
                    <p className="personal-meta">鏆傛棤鐭ヨ瘑搴擄紝鍏堝垱寤轰竴涓柊鐨勭煡璇嗙┖闂淬€?/p>
                  )}
                </div>
              </article>

              {selectedKnowledgeBase ? (
                <article className="panel admin-provider-filter-card">
                  <div className="admin-provider-filter-head">
                    <div>
                      <strong>褰撳墠鏉垮潡</strong>
                      <p>鎸夊乏渚ф澘鍧楀垏鎹㈠悗锛屽彸渚т粎灞曠ず褰撳墠鐭ヨ瘑搴撶殑褰撳墠鍐呭銆?/p>
                    </div>
                    <span className="archive-pill status_ready">{knowledgeWorkspaceSections.find((section) => section.id === knowledgeWorkspaceSection)?.label || "褰撳墠鏉垮潡"}</span>
                  </div>
                  <div className="knowledge-admin-section-list">
                    {knowledgeWorkspaceSections.map((section) => (
                      <button
                        type="button"
                        key={section.id}
                        className="knowledge-admin-section-item"
                        data-active={knowledgeWorkspaceSection === section.id}
                        onClick={() => setKnowledgeWorkspaceSection(section.id)}
                      >
                        <strong>{section.label}</strong>
                        <span>{section.description}</span>
                      </button>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>

            <section className="admin-provider-stack">
              {selectedKnowledgeBase && selectedKnowledgeBaseDraft ? (
                <article className="panel admin-provider-card knowledge-admin-card">
                  <div className="admin-provider-card-head">
                    <div>
                      <div className="admin-provider-title">
                        <strong>{selectedKnowledgeBase.name}</strong>
                        <span className="admin-provider-type">{getKnowledgeSourceTypeLabel(selectedKnowledgeBase.sourceType)}</span>
                      </div>
                      <p className="admin-provider-meta">
                        {selectedKnowledgeBase.slug} 路 鏇存柊鏃堕棿 {formatDateTime(selectedKnowledgeBase.updatedAt)}
                      </p>
                    </div>
                    <span className={`archive-pill ${getStatusClassName(selectedKnowledgeBase.status)}`}>
                      {getKnowledgeBaseStatusLabel(selectedKnowledgeBase.status)}
                    </span>
                  </div>

                  <div className="knowledge-admin-summary-grid">
                    <div className="knowledge-admin-summary-card">
                      <span>鍚屾鐘舵€?/span>
                      <strong>{getKnowledgeSyncStatusLabel(selectedKnowledgeBase.syncStatus)}</strong>
                    </div>
                    <div className="knowledge-admin-summary-card">
                      <span>{selectedKnowledgeIsBrandBridge ? "鍓嶇璧勬枡鏁? : "鏂囨。鏁?}</span>
                      <strong>{selectedKnowledgeFiles.length}</strong>
                    </div>
                    <div className="knowledge-admin-summary-card">
                      <span>{selectedKnowledgeIsBrandBridge ? "宸插叆搴撹祫鏂? : "鍒嗙墖鏁?}</span>
                      <strong>{selectedKnowledgeIsBrandBridge ? selectedKnowledgeIndexedFileCount : selectedKnowledgeBase.chunkCount}</strong>
                    </div>
                    <div className="knowledge-admin-summary-card">
                      <span>鏈€杩戝悓姝?/span>
                      <strong>{selectedKnowledgeLatestSyncRun ? getKnowledgeRunResultLabel(selectedKnowledgeLatestSyncRun.result) : "鏆傛棤璁板綍"}</strong>
                    </div>
                  </div>

                  {knowledgeWorkspaceSection === "overview" ? (
                    <div className="admin-provider-stack">
                      {selectedKnowledgeIsBrandBridge ? (
                        <article className="entity-card admin-rule-card knowledge-bridge-callout">
                          <div className="panel-header">
                            <h2>鍓嶇鏄犲皠璇存槑</h2>
                            <span>1 涓鍣?= 澶氭潯鍓嶇璧勬枡</span>
                          </div>
                          <p className="personal-meta">
                            褰撳墠鐭ヨ瘑搴撴槸鈥滀紒涓氱煡璇嗗簱鈥濆墠绔〉闈㈣嚜鍔ㄦˉ鎺ュ嚭鏉ョ殑缁熶竴瀹瑰櫒銆傚墠绔瘡鏂板涓€寮犺祫鏂欏崱锛屼笉浼氬湪鍚庡彴鏂板涓€涓煡璇嗗簱锛?                            鑰屾槸浣滀负璧勬枡鏂囦欢缁х画姹囨€诲埌杩欎釜瀹瑰櫒閲屻€?                          </p>
                          <div className="knowledge-bridge-chip-row">
                            <span className="knowledge-admin-list-tag">鍓嶇璧勬枡 {selectedKnowledgeFiles.length}</span>
                            <span className="knowledge-admin-list-tag">鎺ュ叆瀵硅薄 {selectedKnowledgeBindings.length}</span>
                            <span className="knowledge-admin-list-tag">
                              榛樿鎺ュ叆 {selectedKnowledgeBindings[0] ? getKnowledgeBindingDisplayName(selectedKnowledgeBindings[0]) : "寰呭垱寤?}
                            </span>
                          </div>
                          {selectedKnowledgePreviewFiles.length ? (
                            <div className="knowledge-bridge-preview-list">
                              {selectedKnowledgePreviewFiles.map((file) => (
                                <article className="knowledge-bridge-preview-card" key={file.id}>
                                  <strong>{file.fileName}</strong>
                                  <span>{file.sourceName || "鏈～鍐欐潵婧?}</span>
                                  <em>{formatDateTime(file.uploadedAt)}</em>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="personal-meta">鍓嶇杩樻病鏈夋ˉ鎺ヨ繘璧勬枡锛屽厛鍘烩€滀紒涓氱煡璇嗗簱鈥濋〉闈㈡柊澧炶祫鏂欏苟淇濆瓨椤甸潰銆?/p>
                          )}
                        </article>
                      ) : null}

                      {selectedKnowledgeIsBrandBridge ? (
                        <article className="entity-card admin-rule-card">
                          <div className="panel-header">
                            <h2>鍓嶇璧勬枡鍗＄墖娓呭崟</h2>
                            <span>{selectedKnowledgeFiles.length} 寮犺祫鏂欏崱</span>
                          </div>
                          <p className="personal-meta">
                            杩欓噷灞曠ず鐨勫氨鏄墠绔€滀紒涓氱煡璇嗗簱鈥濋〉闈㈠綋鍓嶆眹鎬诲埌杩欎釜鍚庡彴瀹瑰櫒鐨勮祫鏂欍€傝繖鏍蜂綘鍦ㄥ悗鍙扮湅鍒楄〃鏃讹紝灏辫兘鐩存帴鐭ラ亾鍓嶇鍒板簳淇濆瓨浜嗗摢浜涜祫鏂欍€?                          </p>
                          {selectedKnowledgeMappedFiles.length ? (
                            <div className="knowledge-bridge-preview-list">
                              {selectedKnowledgeMappedFiles.map((file) => (
                                <article className="knowledge-bridge-preview-card" key={file.id}>
                                  <strong>{file.fileName}</strong>
                                  <span>
                                    {file.sourceName || "鏈～鍐欐潵婧?} 路 {file.fileType} 路 {getKnowledgeFileStatusLabel(file.status)}
                                  </span>
                                  <em>
                                    {formatDateTime(file.uploadedAt)} 路 鍒嗙墖 {file.chunkCount}
                                  </em>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="personal-meta">褰撳墠杩樻病鏈変换浣曞墠绔祫鏂欏崱鍚屾杩涙潵銆?/p>
                          )}
                          {selectedKnowledgeFiles.length > selectedKnowledgeMappedFiles.length ? (
                            <p className="personal-meta">
                              褰撳墠浠呭睍绀烘渶杩?{selectedKnowledgeMappedFiles.length} 寮犺祫鏂欏崱锛屽叾浣欒祫鏂欏彲鍦ㄢ€滆祫鏂欎笂浼犫€濇澘鍧楃户缁煡鐪嬨€?                            </p>
                          ) : null}
                        </article>
                      ) : null}

                      <article className="entity-card admin-rule-card">
                        <div className="panel-header">
                          <h2>鍩虹淇℃伅</h2>
                          <span>{selectedKnowledgeBase.slug}</span>
                        </div>
                        <div className="admin-rule-grid">
                          <label>
                            <span>鍚敤鐘舵€?/span>
                            <select
                              value={selectedKnowledgeBaseDraft.status}
                              onChange={(event) =>
                                handleKnowledgeBaseDraftChange(selectedKnowledgeBase.id, {
                                  status: event.target.value as KnowledgeBaseRecord["status"],
                                })
                              }
                            >
                              <option value="ACTIVE">鍚敤涓?/option>
                              <option value="DRAFT">鑽夌</option>
                              <option value="DISABLED">宸插仠鐢?/option>
                            </select>
                          </label>
                          <label>
                            <span>鏁版嵁婧愮被鍨?/span>
                            <select
                              value={selectedKnowledgeBaseDraft.sourceType}
                              onChange={(event) =>
                                handleKnowledgeBaseDraftChange(selectedKnowledgeBase.id, {
                                  sourceType: event.target.value as KnowledgeBaseRecord["sourceType"],
                                })
                              }
                            >
                              <option value="MANUAL">鎵嬪姩缁存姢</option>
                              <option value="FEISHU">椋炰功</option>
                              <option value="NOTION">Notion</option>
                              <option value="OSS">瀵硅薄瀛樺偍</option>
                            </select>
                          </label>
                        </div>
                        <label className="admin-rule-description">
                          <span>鐭ヨ瘑搴撹鏄?/span>
                          <textarea
                            value={selectedKnowledgeBaseDraft.description}
                            onChange={(event) =>
                              handleKnowledgeBaseDraftChange(selectedKnowledgeBase.id, {
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="personal-actions">
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void handleSaveKnowledgeBase(selectedKnowledgeBase.id)}
                            disabled={updatingKnowledgeBaseId === selectedKnowledgeBase.id}
                          >
                            {updatingKnowledgeBaseId === selectedKnowledgeBase.id ? "淇濆瓨涓?.." : "淇濆瓨鍩虹淇℃伅"}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void handleArchiveKnowledgeBase(selectedKnowledgeBase.id)}
                            disabled={updatingKnowledgeBaseId === selectedKnowledgeBase.id || selectedKnowledgeBase.status === "DISABLED"}
                          >
                            褰掓。鐭ヨ瘑搴?                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => void handleDeleteKnowledgeBase(selectedKnowledgeBase.id)}
                            disabled={updatingKnowledgeBaseId === selectedKnowledgeBase.id}
                          >
                            鍒犻櫎鐭ヨ瘑搴?                          </button>
                        </div>
                      </article>

                      <article className="entity-card admin-rule-card">
                        <div className="panel-header">
                          <h2>鏈€杩戜竴娆″悓姝?/h2>
                          <span>
                            {selectedKnowledgeLatestSyncRun ? formatDateTime(selectedKnowledgeLatestSyncRun.startedAt) : "鏆傛棤璁板綍"}
                          </span>
                        </div>
                        {selectedKnowledgeLatestSyncRun ? (
                          <>
                            <div className="entity-card-head">
                              <div>
                                <strong>{getSyncRunTitle(selectedKnowledgeLatestSyncRun)}</strong>
                                <p className="personal-meta">{selectedKnowledgeLatestSyncRun.summary}</p>
                              </div>
                              <span
                                className={`archive-pill ${
                                  selectedKnowledgeLatestSyncRun.result === "SUCCESS"
                                    ? "status-ready"
                                    : selectedKnowledgeLatestSyncRun.result === "FAILED"
                                      ? "status-paused"
                                      : "status-in_progress"
                                }`}
                              >
                                {getKnowledgeRunResultLabel(selectedKnowledgeLatestSyncRun.result)}
                              </span>
                            </div>
                            <div className="personal-grid">
                              <div>
                                <span>寮€濮嬫椂闂?/span>
                                <strong>{formatDateTime(selectedKnowledgeLatestSyncRun.startedAt)}</strong>
                              </div>
                              <div>
                                <span>瀹屾垚鏃堕棿</span>
                                <strong>
                                  {selectedKnowledgeLatestSyncRun.completedAt
                                    ? formatDateTime(selectedKnowledgeLatestSyncRun.completedAt)
                                    : "杩涜涓?}
                                </strong>
                              </div>
                              <div>
                                <span>鎵ц浜?/span>
                                <strong>{selectedKnowledgeLatestSyncRun.operator}</strong>
                              </div>
                            </div>
                            {selectedKnowledgeLatestSyncRun.errorDetail ? (
                              <p className="personal-meta">澶辫触璇︽儏锛歿selectedKnowledgeLatestSyncRun.errorDetail}</p>
                            ) : null}
                          </>
                        ) : (
                          <p className="personal-meta">褰撳墠杩樻病鏈夊悓姝ヨ褰曪紝鍏堣繘鍏モ€滆祫鏂欎笂浼犫€濇澘鍧楀綍鍏ヨ祫鏂欍€?/p>
                        )}
                      </article>
                    </div>
                  ) : null}

                  {knowledgeWorkspaceSection === "files" && selectedKnowledgeFileDraft ? (
                    <div className="admin-provider-stack">
                      <article className="entity-card admin-rule-card">
                        <div className="panel-header">
                          <h2>璧勬枡涓婁紶</h2>
                          <span>{selectedKnowledgeFiles.length} 浠借祫鏂?/span>
                        </div>
                        <div className="knowledge-upload-choice-grid">
                          <label className="knowledge-upload-choice knowledge-upload-choice--active product-upload-trigger">
                            <input
                              type="file"
                              className="sr-only-file-input"
                              accept=".pdf,.doc,.docx,.xlsx,.xls,.md,.markdown,.txt,.csv,.ppt,.pptx"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                  return;
                                }
                                handleKnowledgeBaseFileDraftChange(
                                  selectedKnowledgeBase.id,
                                  buildKnowledgeBaseFileDraftFromFile(file),
                                );
                                event.currentTarget.value = "";
                              }}
                            />
                            <strong>鏈湴鏂囨。</strong>
                            <span>涓婁紶 PDF銆乄ord銆丒xcel銆丮arkdown 绛夎祫鏂欙紝鑷姩鍥炲～鏂囦欢鍚嶄笌绫诲瀷銆?/span>
                            <em>鐐瑰嚮涓婁紶</em>
                          </label>
                          <div className="knowledge-upload-choice">
                            <strong>鍓嶇妗ユ帴瀵煎叆</strong>
                            <span>鍓嶇鈥滀紒涓氱煡璇嗗簱鈥濋〉闈繚瀛樺悗浼氳嚜鍔ㄨ繘鍏ヨ繖涓鍣紝杩欓噷鍙礋璐ｈˉ鍏呰祫鏂欏拰鎵嬪姩鍚屾銆?/span>
                            <em>鑷姩鍚屾</em>
                          </div>
                        </div>
                        <div className="knowledge-upload-preview">
                          <strong>{selectedKnowledgeFileDraft.fileName || "灏氭湭閫夋嫨鏂囦欢"}</strong>
                          <p>
                            {selectedKnowledgeFileDraft.fileName
                              ? `${selectedKnowledgeFileDraft.fileType} 路 ${selectedKnowledgeFileDraft.sourceName || "鏈～鍐欐潵婧?}`
                              : "鏀寔鍏堥€夋嫨鏂囦欢锛屽啀鎸夐渶淇敼璧勬枡鍚嶇О鍜屾潵婧愯鏄庛€?}
                          </p>
                        </div>
                        <div className="admin-rule-grid">
                          <label>
                            <span>鏂囦欢鍚?/span>
                            <input
                              value={selectedKnowledgeFileDraft.fileName}
                              onChange={(event) =>
                                handleKnowledgeBaseFileDraftChange(selectedKnowledgeBase.id, {
                                  fileName: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>鏂囦欢绫诲瀷</span>
                            <select
                              value={selectedKnowledgeFileDraft.fileType}
                              onChange={(event) =>
                                handleKnowledgeBaseFileDraftChange(selectedKnowledgeBase.id, {
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
                          <label style={{ gridColumn: "span 2" }}>
                            <span>鏉ユ簮璇存槑</span>
                            <input
                              value={selectedKnowledgeFileDraft.sourceName}
                              onChange={(event) =>
                                handleKnowledgeBaseFileDraftChange(selectedKnowledgeBase.id, {
                                  sourceName: event.target.value,
                                })
                              }
                              placeholder="渚嬪 鍝佺墝閮ㄤ笂浼?/ 浼佷笟鐭ヨ瘑搴撴ˉ鎺?
                            />
                          </label>
                        </div>
                        <div className="personal-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void handleCreateKnowledgeBaseFile(selectedKnowledgeBase.id)}
                            disabled={
                              updatingKnowledgeBaseFileId === selectedKnowledgeBase.id || !selectedKnowledgeFileDraft.fileName.trim()
                            }
                          >
                            {updatingKnowledgeBaseFileId === selectedKnowledgeBase.id ? "鏂板涓?.." : "鏂板璧勬枡"}
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void handleStartKnowledgeBaseSync(selectedKnowledgeBase.id)}
                            disabled={updatingKnowledgeBaseId === selectedKnowledgeBase.id || selectedKnowledgeHasRunningSyncRun}
                          >
                            {updatingKnowledgeBaseId === selectedKnowledgeBase.id ? "鍚屾涓?.." : "瑙﹀彂鍏ㄩ噺鍚屾"}
                          </button>
                        </div>
                      </article>

                      <div className="admin-rules-stack">
                        {selectedKnowledgeFiles.length ? (
                          selectedKnowledgeSortedFiles.map((file) => (
                            <article
                              className="entity-card admin-rule-card"
                              key={file.id}
                              style={
                                selectedKnowledgeListFileId === file.id
                                  ? {
                                      borderColor: "rgba(91, 127, 255, 0.45)",
                                      boxShadow: "0 0 0 2px rgba(91, 127, 255, 0.14)",
                                    }
                                  : undefined
                              }
                            >
                              <div className="entity-card-head">
                                <div>
                                  <strong>{file.fileName}</strong>
                                  <p className="personal-meta">
                                    {file.fileType} 路 {file.sourceName} 路 鍒嗙墖 {file.chunkCount}
                                  </p>
                                </div>
                                <span
                                  className={`archive-pill ${
                                    file.status === "INDEXED"
                                      ? "status-ready"
                                      : file.status === "FAILED"
                                        ? "status-paused"
                                        : "status-in_progress"
                                  }`}
                                >
                                  {getKnowledgeFileStatusLabel(file.status)}
                                </span>
                              </div>
                              <div className="personal-actions">
                                <span className="personal-meta">
                                  涓婁紶鏃堕棿 {formatDateTime(file.uploadedAt)}
                                  {selectedKnowledgeListFileId === file.id ? " 路 褰撳墠浠庡乏渚ц祫鏂欏垪琛ㄥ畾浣? : ""}
                                </span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleToggleKnowledgeFileDebug(file)}
                                  disabled={selectedExpandedKnowledgeFileDebugState?.isLoading && expandedKnowledgeFileId === file.id}
                                >
                                  {expandedKnowledgeFileId === file.id
                                    ? "鏀惰捣鑱旇皟鏄庣粏"
                                    : file.status === "INDEXED"
                                      ? "鏌ョ湅鍒嗙墖 / 鍚戦噺"
                                      : "鏌ョ湅鑱旇皟鏄庣粏"}
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleSyncKnowledgeBaseFile(file.id)}
                                  disabled={updatingKnowledgeBaseFileId === file.id}
                                >
                                  {file.status === "FAILED" ? "閲嶈瘯鍚屾" : file.status === "INDEXED" ? "閲嶆柊鍚屾" : "瑙﹀彂鍚屾"}
                                </button>
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() => void handleDeleteKnowledgeBaseFile(file.id)}
                                  disabled={updatingKnowledgeBaseFileId === file.id}
                                >
                                  鍒犻櫎璧勬枡
                                </button>
                              </div>
                              {expandedKnowledgeFileId === file.id && selectedExpandedKnowledgeFileDebugState ? (
                                <div className="admin-provider-stack" style={{ marginTop: 12 }}>
                                  <div className="knowledge-admin-summary-grid">
                                    <div className="knowledge-admin-summary-card">
                                      <span>鍒嗙墖鏁?/span>
                                      <strong>{selectedExpandedKnowledgeFileDebugState.chunks.length}</strong>
                                    </div>
                                    <div className="knowledge-admin-summary-card">
                                      <span>Embedding 鏁?/span>
                                      <strong>{selectedExpandedKnowledgeFileDebugState.embeddings.length}</strong>
                                    </div>
                                    <div className="knowledge-admin-summary-card">
                                      <span>鏈€杩戣鍙?/span>
                                      <strong>
                                        {selectedExpandedKnowledgeFileDebugState.loadedAt
                                          ? formatDateTime(selectedExpandedKnowledgeFileDebugState.loadedAt)
                                          : "鏈鍙?}
                                      </strong>
                                    </div>
                                    <div className="knowledge-admin-summary-card">
                                      <span>鏂囦欢鐘舵€?/span>
                                      <strong>{getKnowledgeFileStatusLabel(file.status)}</strong>
                                    </div>
                                  </div>
                                  {selectedExpandedKnowledgeFileDebugState.isLoading ? (
                                    <p className="personal-meta">姝ｅ湪璇诲彇褰撳墠璧勬枡鐨勫垎鐗囦笌 embedding 鏄庣粏...</p>
                                  ) : selectedExpandedKnowledgeFileDebugState.error ? (
                                    <p className="personal-meta">鑱旇皟鏄庣粏璇诲彇澶辫触锛歿selectedExpandedKnowledgeFileDebugState.error}</p>
                                  ) : (
                                    <>
                                      <article className="entity-card admin-rule-card">
                                        <div className="panel-header">
                                          <h2>鍒嗙墖棰勮</h2>
                                          <span>{selectedExpandedKnowledgeFileDebugState.chunks.length} 鏉?/span>
                                        </div>
                                        {selectedExpandedKnowledgeFileDebugState.chunks.length ? (
                                          <div className="admin-rules-stack">
                                            {selectedExpandedKnowledgeFileDebugState.chunks.slice(0, 5).map((chunk) => (
                                              <article className="knowledge-bridge-preview-card" key={chunk.id}>
                                                <strong>Chunk #{chunk.chunkIndex}</strong>
                                                <span>
                                                  {chunk.tokenCount} tokens 路 {chunk.charCount} 瀛楃
                                                  {chunk.sourceLabel ? ` 路 ${chunk.sourceLabel}` : ""}
                                                </span>
                                                <pre
                                                  style={{
                                                    margin: 0,
                                                    whiteSpace: "pre-wrap",
                                                    fontFamily: "inherit",
                                                    fontSize: 13,
                                                    lineHeight: 1.6,
                                                  }}
                                                >
                                                  {chunk.content}
                                                </pre>
                                              </article>
                                            ))}
                                            {selectedExpandedKnowledgeFileDebugState.chunks.length > 5 ? (
                                              <p className="personal-meta">
                                                浠呭睍绀哄墠 5 鏉″垎鐗囷紝鍓╀綑 {selectedExpandedKnowledgeFileDebugState.chunks.length - 5} 鏉″彲缁х画鎸夐渶鎵╁睍銆?                                              </p>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <p className="personal-meta">褰撳墠璧勬枡杩樻病鏈夌敓鎴愬垎鐗囷紝閫氬父闇€瑕佸厛鎵ц鍚屾銆?/p>
                                        )}
                                      </article>
                                      <article className="entity-card admin-rule-card">
                                        <div className="panel-header">
                                          <h2>Embedding 鏄庣粏</h2>
                                          <span>{selectedExpandedKnowledgeFileDebugState.embeddings.length} 鏉?/span>
                                        </div>
                                        {selectedExpandedKnowledgeFileDebugState.embeddings.length ? (
                                          <div className="admin-rules-stack">
                                            {selectedExpandedKnowledgeFileDebugState.embeddings.slice(0, 5).map((embedding) => (
                                              <article className="knowledge-bridge-preview-card" key={embedding.id}>
                                                <strong>{embedding.modelName}</strong>
                                                <span>
                                                  {embedding.providerName} 路 {embedding.dimensions} 缁?                                                </span>
                                                <em>Chunk ID: {embedding.chunkId}</em>
                                              </article>
                                            ))}
                                            {selectedExpandedKnowledgeFileDebugState.embeddings.length > 5 ? (
                                              <p className="personal-meta">
                                                浠呭睍绀哄墠 5 鏉?embedding锛屽墿浣?{selectedExpandedKnowledgeFileDebugState.embeddings.length - 5} 鏉℃湭灞曞紑銆?                                              </p>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <p className="personal-meta">褰撳墠璧勬枡杩樻病鏈夌敓鎴?embedding锛岃鍏堢‘璁ゅ悓姝ュ凡鎴愬姛骞堕厤缃簡鍙敤鐨?embedding API Key銆?/p>
                                        )}
                                      </article>
                                    </>
                                  )}
                                </div>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <p className="personal-meta">鏆傛棤鐭ヨ瘑搴撹祫鏂欙紝鍏堜粠涓婃柟涓婁紶涓€浠芥枃妗ｏ紝鎴栦粠鍓嶇鈥滀紒涓氱煡璇嗗簱鈥濋〉闈㈣嚜鍔ㄦˉ鎺ャ€?/p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {knowledgeWorkspaceSection === "retrieval" &&
                  selectedKnowledgeRetrievalDraft &&
                  selectedKnowledgeRetrievalConfig ? (
                    <div className="admin-provider-stack">
                      <article className="entity-card admin-rule-card">
                        <div className="panel-header">
                          <h2>妫€绱㈤厤缃?/h2>
                          <span>鍙洖鏁伴噺 / 鍙洖鏂瑰紡 / 閲嶆帓</span>
                        </div>
                        <div className="personal-meta">
                          杩欓噷鏄€滅郴缁熶互鍚庢€庝箞鏌ヨ繖涓煡璇嗗簱鈥濈殑榛樿瑙勫垯銆備綘鍙互鎺у埗涓€娆℃煡澶氬皯鏉°€佷紭鍏堟寜璇箟杩樻槸娣峰悎鍙洖銆佹槸鍚﹀仛浜屾閲嶆帓锛?                          涓嶉渶瑕佸湪杩欓噷澶勭悊鍚屾缁嗚妭銆?                        </div>
                        <div className="admin-rule-grid">
                          <label>
                            <span>榛樿 TopK</span>
                            <input
                              type="number"
                              min="1"
                              value={selectedKnowledgeRetrievalDraft.defaultTopK}
                              onChange={(event) =>
                                handleKnowledgeRetrievalConfigDraftChange(selectedKnowledgeBase.id, {
                                  defaultTopK: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>鍙洖妯″紡</span>
                            <select
                              value={selectedKnowledgeRetrievalDraft.recallMode}
                              onChange={(event) =>
                                handleKnowledgeRetrievalConfigDraftChange(selectedKnowledgeBase.id, {
                                  recallMode: event.target.value as KnowledgeRetrievalConfigRecord["recallMode"],
                                })
                              }
                            >
                              <option value="SEMANTIC">璇箟鍙洖</option>
                              <option value="HYBRID">娣峰悎鍙洖</option>
                            </select>
                          </label>
                          <label>
                            <span>鍚敤閲嶆帓</span>
                            <select
                              value={selectedKnowledgeRetrievalDraft.rerankEnabled ? "YES" : "NO"}
                              onChange={(event) =>
                                handleKnowledgeRetrievalConfigDraftChange(selectedKnowledgeBase.id, {
                                  rerankEnabled: event.target.value === "YES",
                                })
                              }
                            >
                              <option value="NO">鍏抽棴</option>
                              <option value="YES">寮€鍚?/option>
                            </select>
                          </label>
                          <label>
                            <span>閲嶆帓妯″瀷</span>
                            <input
                              value={selectedKnowledgeRetrievalDraft.rerankModelName}
                              placeholder={selectedKnowledgeRetrievalDraft.rerankEnabled ? "渚嬪 bge-reranker-v2-m3" : "鍏抽棴閲嶆帓鏃跺彲鐣欑┖"}
                              onChange={(event) =>
                                handleKnowledgeRetrievalConfigDraftChange(selectedKnowledgeBase.id, {
                                  rerankModelName: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>鍒囩墖澶у皬</span>
                            <input
                              type="number"
                              min="1"
                              value={selectedKnowledgeRetrievalDraft.chunkSize}
                              onChange={(event) =>
                                handleKnowledgeRetrievalConfigDraftChange(selectedKnowledgeBase.id, {
                                  chunkSize: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>鍒囩墖閲嶅彔</span>
                            <input
                              type="number"
                              min="0"
                              value={selectedKnowledgeRetrievalDraft.chunkOverlap}
                              onChange={(event) =>
                                handleKnowledgeRetrievalConfigDraftChange(selectedKnowledgeBase.id, {
                                  chunkOverlap: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>妫€绱㈤槇鍊?/span>
                            <input
                              type="number"
                              min="0"
                              max="1"
                              step="0.01"
                              value={selectedKnowledgeRetrievalDraft.retrievalThreshold}
                              onChange={(event) =>
                                handleKnowledgeRetrievalConfigDraftChange(selectedKnowledgeBase.id, {
                                  retrievalThreshold: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="personal-actions">
                          <span className="personal-meta">涓婃鏇存柊鏃堕棿 {formatDateTime(selectedKnowledgeRetrievalConfig.updatedAt)}</span>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void handleSaveKnowledgeRetrievalConfig(selectedKnowledgeBase.id)}
                            disabled={updatingKnowledgeRetrievalBaseId === selectedKnowledgeBase.id}
                          >
                            {updatingKnowledgeRetrievalBaseId === selectedKnowledgeBase.id ? "淇濆瓨涓?.." : "淇濆瓨妫€绱㈤厤缃?}
                          </button>
                        </div>
                      </article>

                      {selectedKnowledgeRetrievalTestDraft ? (
                        <article className="entity-card admin-rule-card">
                          <div className="panel-header">
                            <h2>妫€绱㈣仈璋冩祴璇?/h2>
                            <span>鐩存帴楠岃瘉褰撳墠鐭ヨ瘑搴撹兘鍚﹀懡涓?/span>
                          </div>
                          <div className="personal-meta">
                            杩欓噷浼氱洿鎺ヨ皟鐢ㄥ悗鍙?`retrieval-test` 鎺ュ彛锛岃繑鍥炲懡涓殑鍒嗙墖銆佸垎鏁板拰鏉ユ簮銆傝嫢鍛戒腑涓?0锛岄€氬父瑕佺粨鍚堜笂鏂归槇鍊笺€?                            褰撳墠璧勬枡鐨勫垎鐗囨暟鍜?embedding 鏄惁鐢熸垚涓€璧风湅銆?                          </div>
                          <label className="admin-rule-description">
                            <span>娴嬭瘯闂</span>
                            <textarea
                              value={selectedKnowledgeRetrievalTestDraft.query}
                              onChange={(event) =>
                                handleKnowledgeRetrievalTestDraftChange(selectedKnowledgeBase.id, {
                                  query: event.target.value,
                                })
                              }
                              placeholder="渚嬪锛氭窐璐х尗鐨勬櫤鑳藉杺椋熷櫒鍜屾姈闊崇鑽夌瓥鐣ユ槸浠€涔堬紵"
                            />
                          </label>
                          <div className="admin-rule-grid">
                            <label>
                              <span>娴嬭瘯 TopK</span>
                              <input
                                type="number"
                                min="1"
                                value={selectedKnowledgeRetrievalTestDraft.topK}
                                onChange={(event) =>
                                  handleKnowledgeRetrievalTestDraftChange(selectedKnowledgeBase.id, {
                                    topK: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="knowledge-admin-summary-card">
                              <span>褰撳墠榛樿闃堝€?/span>
                              <strong>{selectedKnowledgeRetrievalConfig.retrievalThreshold ?? "鏈缃?}</strong>
                            </div>
                            <div className="knowledge-admin-summary-card">
                              <span>鍙洖鏂瑰紡</span>
                              <strong>{getKnowledgeRetrievalModeLabel(selectedKnowledgeRetrievalDraft.recallMode)}</strong>
                            </div>
                            <div className="knowledge-admin-summary-card">
                              <span>宸插叆搴撹祫鏂?/span>
                              <strong>{selectedKnowledgeIndexedFileCount} / {selectedKnowledgeFiles.length}</strong>
                            </div>
                          </div>
                          <p className="personal-meta">{selectedKnowledgeThresholdHint}</p>
                          <div className="personal-actions">
                            <span className="personal-meta">
                              褰撳墠璧勬枡 {selectedKnowledgeFiles.length} 浠斤紝绱鍒嗙墖 {selectedKnowledgeBase.chunkCount}
                            </span>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => void handleRunKnowledgeRetrievalTest(selectedKnowledgeBase.id)}
                              disabled={runningKnowledgeRetrievalBaseId === selectedKnowledgeBase.id}
                            >
                              {runningKnowledgeRetrievalBaseId === selectedKnowledgeBase.id ? "娴嬭瘯涓?.." : "杩愯妫€绱㈡祴璇?}
                            </button>
                          </div>
                          {selectedKnowledgeRetrievalTestResult ? (
                            <div className="admin-provider-stack" style={{ marginTop: 12 }}>
                              <div className="knowledge-admin-summary-grid">
                                <div className="knowledge-admin-summary-card">
                                  <span>鍛戒腑鏁?/span>
                                  <strong>{selectedKnowledgeRetrievalTestResult.hitCount}</strong>
                                </div>
                                <div className="knowledge-admin-summary-card">
                                  <span>杩斿洖 TopK</span>
                                  <strong>{selectedKnowledgeRetrievalTestResult.topK}</strong>
                                </div>
                                <div className="knowledge-admin-summary-card">
                                  <span>Embedding 妯″瀷</span>
                                  <strong>{selectedKnowledgeRetrievalTestResult.modelName || "鏈繑鍥?}</strong>
                                </div>
                                <div className="knowledge-admin-summary-card">
                                  <span>鏈€杩戦棶棰?/span>
                                  <strong>{selectedKnowledgeRetrievalTestResult.query}</strong>
                                </div>
                              </div>
                              {selectedKnowledgeRetrievalTestResult.hits.length ? (
                                <div className="admin-rules-stack">
                                  {selectedKnowledgeRetrievalTestResult.hits.map((hit) => (
                                    <article className="knowledge-bridge-preview-card" key={hit.chunkId}>
                                      <strong>
                                        {hit.fileName} 路 Chunk #{hit.chunkIndex}
                                      </strong>
                                      <span>
                                        鍒嗘暟 {hit.score.toFixed(4)}
                                        {hit.sourceLabel ? ` 路 ${hit.sourceLabel}` : ""}
                                      </span>
                                      <pre
                                        style={{
                                          margin: 0,
                                          whiteSpace: "pre-wrap",
                                          fontFamily: "inherit",
                                          fontSize: 13,
                                          lineHeight: 1.6,
                                        }}
                                      >
                                        {hit.content}
                                      </pre>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <p className="personal-meta">
                                  褰撳墠娌℃湁鍛戒腑缁撴灉銆備紭鍏堟鏌ユ绱㈤槇鍊兼槸鍚﹁繃楂樸€佽祫鏂欐槸鍚﹀凡鐢熸垚鍒嗙墖鍜?embedding銆?                                </p>
                              )}
                            </div>
                          ) : null}
                          <article className="entity-card admin-rule-card" style={{ marginTop: 12 }}>
                            <div className="panel-header">
                              <h2>鑱旇皟寤鸿</h2>
                              <span>鏍规嵁褰撳墠鐭ヨ瘑搴撶姸鎬佽嚜鍔ㄦ彁绀?/span>
                            </div>
                            <div className="admin-rules-stack">
                              {selectedKnowledgeRetrievalSuggestions.map((item) => (
                                <p className="personal-meta" key={item}>
                                  {item}
                                </p>
                              ))}
                            </div>
                          </article>
                        </article>
                      ) : null}
                    </div>
                  ) : null}

                  {knowledgeWorkspaceSection === "bindings" && selectedKnowledgeBindingCreateDraft ? (
                    <div className="admin-provider-stack">
                      <article className="entity-card admin-rule-card">
                        <div className="panel-header">
                          <h2>鎺ュ叆瀵硅薄</h2>
                          <span>{selectedKnowledgeBindings.length} 鏉＄粦瀹?/span>
                        </div>
                        <div className="personal-meta">
                          {selectedKnowledgeIsBrandBridge
                            ? "浼佷笟鐭ヨ瘑搴撴ˉ鎺ラ粯璁ゅ彧鑷姩缁存姢鈥滃搧鐗屽闀垮伐浣滃彴鈥濊繖涓€鏉℃帴鍏ュ璞°€傚墠绔柊澧炶祫鏂欎笉浼氳嚜鍔ㄦ柊澧炴帴鍏ュ璞★紱濡傞渶缁欐姤鍛娿€佹彁绀鸿瘝鎴栧叾浠栨ā鍧椾娇鐢紝璇峰湪杩欓噷鎵嬪姩琛ュ厖銆?
                            : "杩欓噷鍙繚鐣欌€滅粦瀹氬埌璋佲€濈殑娌荤悊鑳藉姏锛屼綘鍙互涓哄綋鍓嶇煡璇嗗簱缁х画琛ュ厖妯″潡銆佽兘鍔涘寘銆佹彁绀鸿瘝鎴栧伐浣滄祦姝ラ銆?}
                        </div>
                        <div className="admin-rule-grid">
                          <label>
                            <span>缁戝畾绫诲瀷</span>
                            <select
                              value={selectedKnowledgeBindingCreateDraft.bindingType}
                              onChange={(event) =>
                                handleCreateKnowledgeBindingDraftChange(selectedKnowledgeBase.id, {
                                  bindingType: event.target.value as KnowledgeBindingRecord["bindingType"],
                                  targetId: "",
                                  targetKey: "",
                                  targetName: "",
                                })
                              }
                            >
                              <option value="MODULE">妯″潡</option>
                              <option value="SKILL_PACKAGE">鑳藉姏鍖?/option>
                              <option value="PROMPT">鎻愮ず璇?/option>
                              <option value="WORKFLOW_STEP">宸ヤ綔娴佹楠?/option>
                            </select>
                          </label>
                          <label>
                            <span>鐩爣鍚嶇О</span>
                            <select
                              value={selectedKnowledgeBindingCreateDraft.targetId}
                              onChange={(event) =>
                                handleSelectKnowledgeBindingTarget(
                                  selectedKnowledgeBase.id,
                                  selectedKnowledgeBindingCreateDraft.bindingType,
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">璇烽€夋嫨鐩爣鍚嶇О</option>
                              {selectedKnowledgeBindingTargetOptions.map((option) => (
                                <option key={`${selectedKnowledgeBindingCreateDraft.bindingType}-${option.targetId}`} value={option.targetId}>
                                  {option.targetName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="personal-meta" style={{ gridColumn: "span 2" }}>
                            {selectedKnowledgeBindingTargetOption?.description
                              ? `瀵硅薄璇存槑锛?{selectedKnowledgeBindingTargetOption.description}`
                              : "鍏堥€夋嫨涓枃鐩爣鍚嶇О锛岀郴缁熶細鑷姩甯﹀嚭鐩爣 ID 鍜岀洰鏍?Key銆?}
                          </div>
                          <label>
                            <span>鐩爣 Key</span>
                            <input
                              readOnly
                              value={selectedKnowledgeBindingCreateDraft.targetKey}
                            />
                          </label>
                          <label>
                            <span>鐩爣 ID</span>
                            <input
                              readOnly
                              value={selectedKnowledgeBindingCreateDraft.targetId}
                            />
                          </label>
                          <label>
                            <span>浼樺厛绾?/span>
                            <input
                              type="number"
                              min="1"
                              value={selectedKnowledgeBindingCreateDraft.priority}
                              onChange={(event) =>
                                handleCreateKnowledgeBindingDraftChange(selectedKnowledgeBase.id, {
                                  priority: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>妫€绱㈡ā寮?/span>
                            <select
                              value={selectedKnowledgeBindingCreateDraft.retrievalMode}
                              onChange={(event) =>
                                handleCreateKnowledgeBindingDraftChange(selectedKnowledgeBase.id, {
                                  retrievalMode: event.target.value as KnowledgeBindingRecord["retrievalMode"],
                                })
                              }
                            >
                              <option value="SEMANTIC">璇箟鍙洖</option>
                              <option value="HYBRID">娣峰悎鍙洖</option>
                              <option value="MANUAL">浜哄伐鎸囧畾</option>
                            </select>
                          </label>
                        </div>
                        <div className="admin-rule-grid">
                          <label>
                            <span>蹇呴』鍛戒腑</span>
                            <select
                              value={selectedKnowledgeBindingCreateDraft.isRequired ? "YES" : "NO"}
                              onChange={(event) =>
                                handleCreateKnowledgeBindingDraftChange(selectedKnowledgeBase.id, {
                                  isRequired: event.target.value === "YES",
                                })
                              }
                            >
                              <option value="NO">鍚?/option>
                              <option value="YES">鏄?/option>
                            </select>
                          </label>
                          <label>
                            <span>鍚敤</span>
                            <select
                              value={selectedKnowledgeBindingCreateDraft.enabled ? "YES" : "NO"}
                              onChange={(event) =>
                                handleCreateKnowledgeBindingDraftChange(selectedKnowledgeBase.id, {
                                  enabled: event.target.value === "YES",
                                })
                              }
                            >
                              <option value="YES">鏄?/option>
                              <option value="NO">鍚?/option>
                            </select>
                          </label>
                        </div>
                        <div className="personal-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void handleCreateKnowledgeBinding(selectedKnowledgeBase.id)}
                            disabled={
                              creatingKnowledgeBindingForBaseId === selectedKnowledgeBase.id ||
                              !selectedKnowledgeBindingCreateDraft.targetId.trim()
                            }
                          >
                            {creatingKnowledgeBindingForBaseId === selectedKnowledgeBase.id ? "鍒涘缓涓?.." : "鏂板缁戝畾"}
                          </button>
                        </div>
                      </article>

                      <div className="admin-rules-stack">
                        {selectedKnowledgeBindings.length ? (
                          selectedKnowledgeBindings.map((binding) => {
                            const bindingDraft = knowledgeBindingDrafts[binding.id] || buildKnowledgeBindingDraft(binding);
                            return (
                              <article className="entity-card admin-rule-card" key={binding.id}>
                                <div className="entity-card-head">
                                  <div>
                                    <strong>{binding.targetName || binding.targetId}</strong>
                                    <p className="personal-meta">
                                      {getKnowledgeBindingTypeLabel(binding.bindingType)} 路 {binding.targetKey || "鏈缃?Key"} 路 浼樺厛绾?{binding.priority}
                                    </p>
                                  </div>
                                  <div className="knowledge-binding-card-badges">
                                    {selectedKnowledgeIsBrandBridge && binding.targetId === "brand-growth-workbench" ? (
                                      <span className="archive-pill status_ready">榛樿鎺ュ叆</span>
                                    ) : null}
                                    <span className={`archive-pill ${binding.enabled ? "status-ready" : "status-paused"}`}>
                                      {binding.enabled ? "宸插惎鐢? : "宸插仠鐢?}
                                    </span>
                                  </div>
                                </div>
                                <div className="admin-rule-grid">
                                  <label>
                                    <span>鐩爣 Key</span>
                                    <input
                                      value={bindingDraft.targetKey}
                                      onChange={(event) =>
                                        handleKnowledgeBindingDraftChange(binding.id, {
                                          targetKey: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label>
                                    <span>鐩爣鍚嶇О</span>
                                    <input
                                      value={bindingDraft.targetName}
                                      onChange={(event) =>
                                        handleKnowledgeBindingDraftChange(binding.id, {
                                          targetName: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label>
                                    <span>浼樺厛绾?/span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={bindingDraft.priority}
                                      onChange={(event) =>
                                        handleKnowledgeBindingDraftChange(binding.id, {
                                          priority: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label>
                                    <span>妫€绱㈡ā寮?/span>
                                    <select
                                      value={bindingDraft.retrievalMode}
                                      onChange={(event) =>
                                        handleKnowledgeBindingDraftChange(binding.id, {
                                          retrievalMode: event.target.value as KnowledgeBindingRecord["retrievalMode"],
                                        })
                                      }
                                    >
                                      <option value="SEMANTIC">璇箟鍙洖</option>
                                      <option value="HYBRID">娣峰悎鍙洖</option>
                                      <option value="MANUAL">浜哄伐鎸囧畾</option>
                                    </select>
                                  </label>
                                  <label>
                                    <span>蹇呴』鍛戒腑</span>
                                    <select
                                      value={bindingDraft.isRequired ? "YES" : "NO"}
                                      onChange={(event) =>
                                        handleKnowledgeBindingDraftChange(binding.id, {
                                          isRequired: event.target.value === "YES",
                                        })
                                      }
                                    >
                                      <option value="NO">鍚?/option>
                                      <option value="YES">鏄?/option>
                                    </select>
                                  </label>
                                  <label>
                                    <span>鍚敤</span>
                                    <select
                                      value={bindingDraft.enabled ? "YES" : "NO"}
                                      onChange={(event) =>
                                        handleKnowledgeBindingDraftChange(binding.id, {
                                          enabled: event.target.value === "YES",
                                        })
                                      }
                                    >
                                      <option value="YES">鏄?/option>
                                      <option value="NO">鍚?/option>
                                    </select>
                                  </label>
                                </div>
                                <div className="personal-actions">
                                  <span className="personal-meta">鏇存柊浜?{formatDateTime(binding.updatedAt)}</span>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => void handleSaveKnowledgeBinding(binding.id)}
                                    disabled={updatingKnowledgeBindingId === binding.id}
                                  >
                                    {updatingKnowledgeBindingId === binding.id ? "淇濆瓨涓?.." : "淇濆瓨缁戝畾"}
                                  </button>
                                  <button
                                    type="button"
                                    className="danger-button"
                                    onClick={() => void handleDeleteKnowledgeBinding(binding.id)}
                                    disabled={updatingKnowledgeBindingId === binding.id}
                                  >
                                    鍒犻櫎缁戝畾
                                  </button>
                                </div>
                              </article>
                            );
                          })
                        ) : (
                          <p className="personal-meta">鏆傛棤缁戝畾鍏崇郴锛屽厛鎶婄煡璇嗗簱缁戝畾鍒版ā鍧椼€佽兘鍔涘寘鎴栨彁绀鸿瘝銆?/p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {knowledgeWorkspaceSection === "history" ? (
                    <div className="admin-rules-stack">
                      {selectedKnowledgeSyncRuns.length ? (
                        selectedKnowledgeSyncRuns.slice(0, 8).map((run) => (
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
                                {getKnowledgeRunResultLabel(run.result)}
                              </span>
                            </div>
                            <div className="personal-grid">
                              <div>
                                <span>寮€濮嬫椂闂?/span>
                                <strong>{formatDateTime(run.startedAt)}</strong>
                              </div>
                              <div>
                                <span>瀹屾垚鏃堕棿</span>
                                <strong>{run.completedAt ? formatDateTime(run.completedAt) : "杩涜涓?}</strong>
                              </div>
                              <div>
                                <span>鎵ц浜?/span>
                                <strong>{run.operator}</strong>
                              </div>
                            </div>
                            {run.errorDetail ? <p className="personal-meta">澶辫触璇︽儏锛歿run.errorDetail}</p> : null}
                          </article>
                        ))
                      ) : (
                        <p className="personal-meta">鏆傛棤鍚屾璁板綍銆?/p>
                      )}
                    </div>
                  ) : null}
                </article>
              ) : (
                <article className="panel admin-provider-card">
                  <div className="admin-provider-card-head">
                    <div>
                      <strong>鐭ヨ瘑搴撹鎯?/strong>
                      <p className="admin-provider-meta">宸︿晶鍏堝垱寤烘垨閫夋嫨涓€涓煡璇嗗簱锛屽彸渚у啀杩涘叆瀵瑰簲鏉垮潡缁х画绠＄悊銆?/p>
                    </div>
                  </div>
                </article>
              )}
            </section>
          </div>
        ) : activeTab === "providers" ? (
          <div className="admin-provider-layout">
            <div className="admin-provider-stack">
              <article className="panel admin-provider-filter-card">
                <div className="admin-provider-filter-head">
                  <div>
                    <strong>骞冲彴鍒楄〃</strong>
                    <p>宸︿晶鎸夊钩鍙板垏鎹㈤」鐩紝鍙充晶缁存姢褰撳墠骞冲彴鐨勯摼鎺ャ€佹ā鍨?ID銆佽鏄庢枃妗ｄ笌澶囨敞锛涜繖閲屼笉鍐嶆彁渚涙柊寤哄叆鍙ｃ€?/p>
                  </div>
                  <span className="archive-pill status_success">
                    {providerInsights.filteredCount}/{thirdPartyPlatforms.length}
                  </span>
                </div>
                <div className="admin-provider-filter-grid">
                  <label className="admin-provider-field">
                    <span>鎼滅储骞冲彴</span>
                    <input
                      type="search"
                      name="admin-platform-search"
                      value={providerSearch}
                      placeholder="鎸夊钩鍙板悕銆佹ā鍨?ID銆丅ase URL銆佸娉ㄦ悳绱?
                      onChange={(event) => setProviderSearch(event.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="admin-provider-field">
                    <span>鐘舵€佺瓫閫?/span>
                    <select
                      value={providerStatusFilter}
                      onChange={(event) =>
                        setProviderStatusFilter(event.target.value as ApiProviderRecord["status"] | "ALL")
                      }
                    >
                      <option value="ALL">鍏ㄩ儴鐘舵€?/option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </label>
                  <label className="admin-provider-field">
                    <span>绫诲瀷绛涢€?/span>
                    <select
                      value={providerTypeFilter}
                      onChange={(event) =>
                        setProviderTypeFilter(event.target.value as ApiProviderRecord["providerType"] | "ALL")
                      }
                    >
                      <option value="ALL">鍏ㄩ儴绫诲瀷</option>
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
                  <span className="admin-provider-chip">鏁版嵁婧?{dataSource === "api" ? "API" : "SEED"}</span>
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
                            <p className="personal-meta">骞冲彴绫诲瀷锛歿item.providerType}</p>
                          </div>
                          <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                        </div>
                        <div className="personal-grid">
                          <div>
                            <span>骞冲彴绫诲瀷</span>
                            <strong>{item.providerType}</strong>
                          </div>
                          <div>
                            <span>妯″瀷鏁?/span>
                            <strong>{item.modelIds.length}</strong>
                          </div>
                          <div>
                            <span>榛樿妯″瀷</span>
                            <strong>{item.defaultModel || "-"}</strong>
                          </div>
                          <div>
                            <span>鏇存柊鏃堕棿</span>
                            <strong>{formatDateTime(item.updatedAt)}</strong>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-canvas-box">娌℃湁鍖归厤鐨勫钩鍙帮紝鍙皟鏁存悳绱㈡潯浠跺悗閲嶈瘯銆?/div>
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
                        鏇存柊浜?{formatDateTime(selectedThirdPartyPlatform.updatedAt)}
                      </p>
                    </div>
                    <span className={`archive-pill ${getStatusClassName(selectedThirdPartyPlatform.status)}`}>
                      {selectedThirdPartyPlatform.status}
                    </span>
                  </div>

                  <div className="admin-provider-metrics">
                    <div>
                      <span>妯″瀷鎬绘暟</span>
                      <strong>{selectedThirdPartyPlatform.modelIds.length}</strong>
                    </div>
                    <div>
                      <span>榛樿妯″瀷</span>
                      <strong>{selectedThirdPartyPlatform.defaultModel || "-"}</strong>
                    </div>
                    <div>
                      <span>璇存槑鏂囨。</span>
                      <strong>{selectedThirdPartyPlatform.tutorialUrl ? "宸查厤缃? : "鏈厤缃?}</strong>
                    </div>
                    <div>
                      <span>鏁版嵁婧?/span>
                      <strong>{dataSource === "api" ? "API" : "SEED"}</strong>
                    </div>
                  </div>

                  <div className="admin-provider-section">
                    <div className="admin-provider-section-head">
                      <strong>骞冲彴淇℃伅</strong>
                    </div>
                    <div className="admin-provider-grid">
                      <label className="admin-provider-field">
                        <span>骞冲彴鍚嶇О</span>
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
                        <span>Provider 绫诲瀷</span>
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
                        <span>鐘舵€?/span>
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
                        <span>绗笁鏂瑰钩鍙伴摼鎺?/span>
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
                        <span>璇存槑鏂囨。</span>
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
                      <strong>妯″瀷鏉垮潡</strong>
                    </div>
                    <div className="admin-provider-grid">
                      <label className="admin-provider-field">
                        <span>榛樿妯″瀷</span>
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
                              ? "璇烽€夋嫨榛樿妯″瀷"
                              : "璇峰厛濉啓妯″瀷 ID"}
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
                        <span>褰撳墠妯″瀷棰勮</span>
                        <div className="admin-provider-chip-row">
                          {parseThirdPartyPlatformModelIds(selectedThirdPartyPlatformDraft.modelIds).length ? (
                            parseThirdPartyPlatformModelIds(selectedThirdPartyPlatformDraft.modelIds).map((model) => (
                              <span key={model} className="admin-provider-chip">
                                {model}
                              </span>
                            ))
                          ) : (
                            <span className="admin-provider-chip">鏈厤缃ā鍨?/span>
                          )}
                        </div>
                      </div>
                    </div>
                    <label className="admin-provider-field admin-provider-field--full">
                      <span>澶фā鍨?ID锛堥€楀彿鍒嗛殧锛?/span>
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
                      <strong>琛ュ厖璇存槑</strong>
                    </div>
                    <label className="admin-provider-field admin-provider-field--full">
                      <span>澶囨敞</span>
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
                      鍓嶇鈥滀釜浜轰腑蹇?绗笁鏂规帴鍙ｉ厤缃€濅細鍚屾杩欓噷鐨勫钩鍙板熀绾匡紝鍙湁 Owner 鑳藉湪鍓嶅彴璁剧疆鑷繁鐨?API Key銆?                    </small>
                  </div>

                  <div className="admin-provider-actions">
                    {selectedThirdPartyPlatformDraft.baseUrl.trim() ? (
                      <a href={selectedThirdPartyPlatformDraft.baseUrl} target="_blank" rel="noreferrer" className="secondary-button">
                        绗笁鏂瑰钩鍙伴摼鎺?                      </a>
                    ) : null}
                    {selectedThirdPartyPlatformDraft.tutorialUrl.trim() ? (
                      <a href={selectedThirdPartyPlatformDraft.tutorialUrl} target="_blank" rel="noreferrer" className="secondary-button">
                        鎵撳紑璇存槑鏂囨。
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSaveThirdPartyPlatform(selectedThirdPartyPlatform.id)}
                      disabled={updatingProviderId === selectedThirdPartyPlatform.id}
                    >
                      {updatingProviderId === selectedThirdPartyPlatform.id ? "淇濆瓨涓?.." : "淇濆瓨骞冲彴閰嶇疆"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleDeleteThirdPartyPlatform(selectedThirdPartyPlatform.id)}
                      disabled={updatingProviderId === selectedThirdPartyPlatform.id}
                    >
                      鍒犻櫎骞冲彴
                    </button>
                  </div>
                </article>
              ) : (
                <article className="panel admin-provider-empty">
                  <strong>璇烽€夋嫨宸︿晶骞冲彴</strong>
                  <p>閫変腑鍚庡彲鍦ㄥ彸渚ф煡鐪嬪苟缁存姢骞冲彴閾炬帴銆佽鏄庢枃妗ｃ€佹ā鍨?ID 鍜岄粯璁ゆā鍨嬨€?/p>
                </article>
              )}
            </section>
          </div>
        ) : (
          <div className="admin-rules-layout">
            <section className="panel personal-center-panel">
              <div className="panel-header">
                <h2>浼氬憳鏂规</h2>
                <span>Membership Plans</span>
              </div>
              <div className="admin-rules-stack">
                {rules.membershipPlans.map((item, index) => (
                  <article className="entity-card admin-rule-card" key={item.id}>
                    <div className="admin-rule-grid">
                      <label>
                        <span>鏂规鍚嶇О</span>
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
                        <span>浼氬憳绛夌骇</span>
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
                        <span>浠锋牸</span>
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
                        <span>璧犻€佺偣鏁?/span>
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
                      <span>鏂规璇存槑</span>
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
                <h2>鐐规暟鍖?/h2>
                <span>Points Packages</span>
              </div>
              <div className="admin-rules-stack">
                {rules.pointsPackages.map((item, index) => (
                  <article className="entity-card admin-rule-card" key={item.id}>
                    <div className="admin-rule-grid">
                      <label>
                        <span>濂楅鍚嶇О</span>
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
                        <span>鐐规暟鏁伴噺</span>
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
                        <span>浠锋牸</span>
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
                      <span>濂楅璇存槑</span>
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
                {isSavingRules ? "淇濆瓨涓?.." : "淇濆瓨瑙勫垯"}
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
    databaseInputs: parsed.databaseInputs,
    knowledgeInputs: parsed.knowledgeInputs,
    customInputs: parsed.customInputs,
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
    databaseInputs: [] as DatabaseInputConfig[],
    knowledgeInputs: [] as KnowledgeInputConfig[],
    customInputs: [] as CustomInputConfig[],
    referenceAssetKeys: [] as string[],
    scriptAssetKeys: [] as string[],
    hasReferenceAssetSelection: false,
    hasScriptAssetSelection: false,
  };
  if (!source) {
    return sections;
  }

  const markers = [
    { key: "workflowSummary", title: "姝ラ鎽樿锛? },
    { key: "databaseInputs", title: "鏁版嵁搴撳弬鏁帮細" },
    { key: "knowledgeInputs", title: "鐭ヨ瘑搴撳弬鏁帮細" },
    { key: "customInputs", title: "鑷畾涔夎緭鍏ュ弬鏁帮細" },
    { key: "inputSummary", title: "杈撳叆瑕佺偣锛? },
    { key: "outputSummary", title: "杈撳嚭瑕佺偣锛? },
    { key: "referenceAssetKeys", title: "References 璧勪骇锛? },
    { key: "scriptAssetKeys", title: "Scripts 璧勪骇锛? },
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
    if (current.key === "databaseInputs") {
      sections.databaseInputs = parseSkillJsonSection(body, []).map(normalizeDatabaseInputConfig);
      continue;
    }
    if (current.key === "knowledgeInputs") {
      sections.knowledgeInputs = parseSkillJsonSection(body, []).map(normalizeKnowledgeInputConfig);
      continue;
    }
    if (current.key === "customInputs") {
      sections.customInputs = parseSkillJsonSection(body, []).map(normalizeCustomInputConfig);
      continue;
    }
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
    draft.workflowSummary.trim() ? `姝ラ鎽樿锛歕n${draft.workflowSummary.trim()}` : "",
    draft.databaseInputs.length ? `鏁版嵁搴撳弬鏁帮細\n${JSON.stringify(draft.databaseInputs, null, 2)}` : "",
    draft.knowledgeInputs.length ? `鐭ヨ瘑搴撳弬鏁帮細\n${JSON.stringify(draft.knowledgeInputs, null, 2)}` : "",
    draft.customInputs.length ? `鑷畾涔夎緭鍏ュ弬鏁帮細\n${JSON.stringify(draft.customInputs, null, 2)}` : "",
    draft.inputSummary.trim() ? `杈撳叆瑕佺偣锛歕n${draft.inputSummary.trim()}` : "",
    draft.outputSummary.trim() ? `杈撳嚭瑕佺偣锛歕n${draft.outputSummary.trim()}` : "",
    draft.hasReferenceAssetSelection ? `References 璧勪骇锛歕n${draft.referenceAssetKeys.join("\n")}` : "",
    draft.hasScriptAssetSelection ? `Scripts 璧勪骇锛歕n${draft.scriptAssetKeys.join("\n")}` : "",
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

function parseSkillJsonSection<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function createSkillInputConfigId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function getDatabaseParameterMeta(parameterType: DatabaseInputConfig["parameterType"], parameterKey: string) {
  if (parameterType === "INJECT_TOGGLE") {
    return DATABASE_INJECT_PARAMETER_OPTIONS.find((item) => item.value === parameterKey);
  }
  return DATABASE_SELECT_PARAMETER_OPTIONS.find((item) => item.value === parameterKey);
}

function getDatabaseSelectParameterMeta(parameterKey: string) {
  return DATABASE_SELECT_PARAMETER_OPTIONS.find((item) => item.value === parameterKey);
}

function getDatabaseSelectValueOptions(
  parameterKey: string,
  syncState: DatabaseParameterSyncState,
  currentValue?: string,
): DatabaseParameterSyncedOption[] {
  const meta = getDatabaseSelectParameterMeta(parameterKey);
  const synced = syncState.selectOptions[parameterKey] || [];
  const options = [
    { value: "", label: meta?.emptyLabel || "涓嶆鍏? },
    ...synced,
  ];
  if (currentValue && !options.some((item) => item.value === currentValue)) {
    return [...options, { value: currentValue, label: currentValue }];
  }
  return options;
}

function buildDatabaseInputConfig(
  parameterType: DatabaseInputConfig["parameterType"],
  syncState?: DatabaseParameterSyncState,
): DatabaseInputConfig {
  const defaultKey = parameterType === "INJECT_TOGGLE" ? DATABASE_INJECT_PARAMETER_OPTIONS[0]?.value || "" : DATABASE_SELECT_PARAMETER_OPTIONS[0]?.value || "";
  const meta = getDatabaseParameterMeta(parameterType, defaultKey);
  const selectOptions = parameterType === "SELECT_CHOICE" && syncState
    ? getDatabaseSelectValueOptions(defaultKey, syncState)
    : [];
  return {
    id: createSkillInputConfigId("db"),
    parameterType,
    parameterKey: meta?.value || "",
    parameterLabel: meta?.label || "",
    selectedValue: parameterType === "INJECT_TOGGLE" ? "INJECT" : selectOptions[0]?.value || "",
    remarks: "",
  };
}

function buildRecommendedDatabaseInputs(syncState?: DatabaseParameterSyncState): DatabaseInputConfig[] {
  const marketingCalendarOptions = getDatabaseSelectValueOptions("marketing_calendar", syncState || { injectCounts: {}, selectOptions: {}, summary: [] });
  const topicLibraryOptions = getDatabaseSelectValueOptions("topic_library", syncState || { injectCounts: {}, selectOptions: {}, summary: [] });
  const materialLibraryOptions = getDatabaseSelectValueOptions("material_library", syncState || { injectCounts: {}, selectOptions: {}, summary: [] });
  return [
    {
      ...buildDatabaseInputConfig("INJECT_TOGGLE", syncState),
      parameterKey: "brand_profile",
      parameterLabel: "鍝佺墝璧勬枡",
      selectedValue: "INJECT",
      remarks: "榛樿妞嶅叆鍝佺墝鑳屾櫙銆佸畾浣嶅拰鍙ｅ緞绾︽潫銆?,
    },
    {
      ...buildDatabaseInputConfig("INJECT_TOGGLE", syncState),
      parameterKey: "product_library",
      parameterLabel: "浜у搧璧勬枡",
      selectedValue: "INJECT",
      remarks: "鎸夊綋鍓嶅晢鍝佹睜鎻愪緵浜у搧鍗栫偣鍜屽崠璐т俊鎭€?,
    },
    {
      ...buildDatabaseInputConfig("INJECT_TOGGLE", syncState),
      parameterKey: "marketing_plan",
      parameterLabel: "钀ラ攢绛栧垝鏂规",
      selectedValue: "INJECT",
      remarks: "浼樺厛鍙傝€冨搧鐗屾棦鏈夎惀閿€鏂规鍜屾椿鍔ㄩ噸鐐广€?,
    },
    {
      ...buildDatabaseInputConfig("SELECT_CHOICE", syncState),
      parameterKey: "marketing_calendar",
      parameterLabel: "钀ラ攢鏃ュ巻",
      selectedValue: marketingCalendarOptions[1]?.value || "",
      remarks: "榛樿浠庡凡鍚屾鐨勮惀閿€鏃ュ巻鏁版嵁涓€夋嫨锛涙病鏈夋椂鍙垏鎹负涓嶆鍏ヨ惀閿€鏃ュ巻銆?,
    },
    {
      ...buildDatabaseInputConfig("SELECT_CHOICE", syncState),
      parameterKey: "topic_library",
      parameterLabel: "閫夐搴?,
      selectedValue: topicLibraryOptions[1]?.value || "",
      remarks: "榛樿浠庡凡鍚屾鐨勯€夐搴撲腑閫夋嫨鍏蜂綋鏉＄洰銆?,
    },
    {
      ...buildDatabaseInputConfig("SELECT_CHOICE", syncState),
      parameterKey: "material_library",
      parameterLabel: "绱犳潗搴?,
      selectedValue: materialLibraryOptions[1]?.value || "",
      remarks: "榛樿浠庡凡鍚屾鐨勭礌鏉愬簱涓€夋嫨鍏蜂綋绱犳潗鏉＄洰銆?,
    },
  ];
}

function normalizeDatabaseInputConfig(value: unknown): DatabaseInputConfig {
  const current = value && typeof value === "object" ? (value as Partial<DatabaseInputConfig>) : {};
  const parameterType = current.parameterType === "SELECT_CHOICE" ? "SELECT_CHOICE" : "INJECT_TOGGLE";
  const meta = getDatabaseParameterMeta(parameterType, String(current.parameterKey || ""));
  return {
    id: String(current.id || createSkillInputConfigId("db")),
    parameterType,
    parameterKey: String(current.parameterKey || meta?.value || ""),
    parameterLabel: String(current.parameterLabel || meta?.label || ""),
    selectedValue: String(
      current.selectedValue || (parameterType === "INJECT_TOGGLE" ? "INJECT" : ""),
    ),
    remarks: String(current.remarks || ""),
  };
}

function buildKnowledgeInputConfig(
  knowledgeBase?: KnowledgeBaseRecord,
  knowledgeBaseFiles?: KnowledgeBaseFileRecord[],
): KnowledgeInputConfig {
  const defaultOption = getKnowledgeContentOptions(knowledgeBase?.id || "", knowledgeBaseFiles || [])[0];
  return {
    id: createSkillInputConfigId("kb"),
    knowledgeBaseId: knowledgeBase?.id || "",
    knowledgeBaseName: knowledgeBase?.name || "",
    targetContentId: defaultOption?.value || "",
    targetContentLabel: defaultOption?.label || "",
    remarks: "",
  };
}

function getKnowledgeContentOptions(
  knowledgeBaseId: string,
  knowledgeBaseFiles: KnowledgeBaseFileRecord[],
  currentValue?: string,
  currentLabel?: string,
): KnowledgeContentOption[] {
  const synced = knowledgeBaseFiles
    .filter((item) => item.knowledgeBaseId === knowledgeBaseId && item.status !== "FAILED")
    .map((item) => ({
      value: item.id,
      label: item.fileName,
    }));
  const options = [
    { value: "", label: "涓嶆寚瀹氬叿浣撳唴瀹癸紙鏁村簱妫€绱級" },
    ...synced,
  ];
  if (currentValue && currentLabel && !options.some((item) => item.value === currentValue)) {
    return [...options, { value: currentValue, label: currentLabel }];
  }
  return options;
}

function normalizeKnowledgeInputConfig(value: unknown): KnowledgeInputConfig {
  const current = value && typeof value === "object" ? (value as Partial<KnowledgeInputConfig>) : {};
  return {
    id: String(current.id || createSkillInputConfigId("kb")),
    knowledgeBaseId: String(current.knowledgeBaseId || ""),
    knowledgeBaseName: String(current.knowledgeBaseName || ""),
    targetContentId: String(current.targetContentId || ""),
    targetContentLabel: String(current.targetContentLabel || ""),
    remarks: String(current.remarks || ""),
  };
}

function buildCustomInputConfig(inputType: CustomInputConfig["inputType"]): CustomInputConfig {
  return {
    id: createSkillInputConfigId("custom"),
    inputType,
    label: "",
    required: false,
    options: inputType === "SELECT" ? ["閫夐」 A", "閫夐」 B"] : [],
    placeholder: inputType === "TEXT" ? "璇疯緭鍏ュ唴瀹? : "",
    acceptedFileTypes: inputType === "FILE" ? ".pdf,.docx,.xlsx,.png,.jpg" : "",
    remarks: "",
  };
}

function buildRecommendedCustomInputs(): CustomInputConfig[] {
  return [
    {
      ...buildCustomInputConfig("SELECT"),
      label: "鎵ц妯″紡",
      required: true,
      options: ["鏍囧噯妯″紡", "蹇€熸ā寮?, "娣卞害妯″紡"],
      remarks: "鐢ㄤ簬鍒囨崲鎶€鑳芥墽琛屾繁搴﹀拰鐢熸垚绛栫暐銆?,
    },
    {
      ...buildCustomInputConfig("TEXT"),
      label: "鐢ㄦ埛瑕佹眰",
      required: true,
      placeholder: "璇疯緭鍏ユ湰娆′换鍔＄洰鏍囥€侀鏍笺€侀檺鍒舵潯浠剁瓑",
      remarks: "鐢辩敤鎴风洿鎺ヨˉ鍏呮湰娆℃妧鑳芥墽琛岃姹傘€?,
    },
    {
      ...buildCustomInputConfig("FILE"),
      label: "鍙傝€冩枃浠?,
      required: false,
      acceptedFileTypes: ".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg",
      remarks: "鏀寔涓婁紶鍙傝€冨浘銆佸弬鑰冩枃妗ｃ€佺礌鏉愬寘绛夋枃浠躲€?,
    },
  ];
}

function normalizeCustomInputConfig(value: unknown): CustomInputConfig {
  const current = value && typeof value === "object" ? (value as Partial<CustomInputConfig>) : {};
  const inputType = current.inputType === "SELECT" || current.inputType === "FILE" ? current.inputType : "TEXT";
  return {
    id: String(current.id || createSkillInputConfigId("custom")),
    inputType,
    label: String(current.label || ""),
    required: Boolean(current.required),
    options: Array.isArray(current.options) ? current.options.map((item) => String(item).trim()).filter(Boolean) : [],
    placeholder: String(current.placeholder || ""),
    acceptedFileTypes: String(current.acceptedFileTypes || ""),
    remarks: String(current.remarks || ""),
  };
}

function splitLines(value: string) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function buildKnowledgeBindingDraft(item: KnowledgeBindingRecord): KnowledgeBindingEditDraft {
  return {
    targetKey: item.targetKey || "",
    targetName: item.targetName || "",
    priority: String(item.priority || 1),
    retrievalMode: item.retrievalMode,
    isRequired: item.isRequired,
    enabled: item.enabled,
  };
}

function buildKnowledgeBindingDrafts(list: KnowledgeBindingRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildKnowledgeBindingDraft(item)])) as Record<
    string,
    KnowledgeBindingEditDraft
  >;
}

function buildDefaultKnowledgeRetrievalConfig(
  knowledgeBaseId: string,
  timestamp = new Date().toISOString(),
): KnowledgeRetrievalConfigRecord {
  return {
    id: `kbrc_local_${knowledgeBaseId}`,
    knowledgeBaseId,
    defaultTopK: 8,
    recallMode: "HYBRID",
    rerankEnabled: false,
    chunkSize: 800,
    chunkOverlap: 120,
    retrievalThreshold: 0.65,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildKnowledgeRetrievalConfigDraft(
  item: KnowledgeRetrievalConfigRecord = buildDefaultKnowledgeRetrievalConfig("kb_default"),
): KnowledgeRetrievalConfigEditDraft {
  return {
    defaultTopK: String(item.defaultTopK),
    recallMode: item.recallMode,
    rerankEnabled: item.rerankEnabled,
    rerankModelName: item.rerankModelName || "",
    chunkSize: item.chunkSize === undefined ? "" : String(item.chunkSize),
    chunkOverlap: item.chunkOverlap === undefined ? "" : String(item.chunkOverlap),
    retrievalThreshold: item.retrievalThreshold === undefined ? "" : String(item.retrievalThreshold),
  };
}

function buildKnowledgeRetrievalConfigDrafts(list: KnowledgeRetrievalConfigRecord[]) {
  return Object.fromEntries(list.map((item) => [item.knowledgeBaseId, buildKnowledgeRetrievalConfigDraft(item)])) as Record<
    string,
    KnowledgeRetrievalConfigEditDraft
  >;
}

function normalizeKnowledgeRetrievalConfigDraft(draft: KnowledgeRetrievalConfigEditDraft) {
  const parseInteger = (label: string, rawValue: string, allowZero = false) => {
    const normalized = Number(rawValue);
    if (!Number.isFinite(normalized) || normalized < 0 || (!allowZero && normalized <= 0)) {
      throw new Error(`${label}蹇呴』涓?{allowZero ? "闈炶礋鏁存暟" : "姝ｆ暣鏁?}`);
    }
    return Math.floor(normalized);
  };
  const parseThreshold = (rawValue: string) => {
    const normalized = Number(rawValue);
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
      throw new Error("妫€绱㈤槇鍊煎繀椤诲湪 0 鍒?1 涔嬮棿");
    }
    return normalized;
  };

  const chunkSize = draft.chunkSize.trim() ? parseInteger("鍒囩墖澶у皬", draft.chunkSize) : undefined;
  const chunkOverlap = draft.chunkOverlap.trim() ? parseInteger("鍒囩墖閲嶅彔", draft.chunkOverlap, true) : undefined;
  if (
    chunkSize !== undefined &&
    chunkOverlap !== undefined &&
    Number.isFinite(chunkSize) &&
    Number.isFinite(chunkOverlap) &&
    chunkOverlap >= chunkSize
  ) {
    throw new Error("鍒囩墖閲嶅彔蹇呴』灏忎簬鍒囩墖澶у皬");
  }

  return {
    defaultTopK: parseInteger("榛樿 TopK", draft.defaultTopK),
    recallMode: draft.recallMode,
    rerankEnabled: draft.rerankEnabled,
    rerankModelName: draft.rerankEnabled ? draft.rerankModelName.trim() || undefined : undefined,
    chunkSize,
    chunkOverlap,
    retrievalThreshold: draft.retrievalThreshold.trim() ? parseThreshold(draft.retrievalThreshold) : undefined,
  };
}

function buildCreateKnowledgeBindingDraft(): CreateKnowledgeBindingDraft {
  return {
    bindingType: "MODULE",
    targetId: "",
    targetKey: "",
    targetName: "",
    priority: "100",
    retrievalMode: "HYBRID",
    isRequired: false,
    enabled: true,
  };
}

function buildKnowledgeBindingCreateDrafts(list: KnowledgeBaseRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildCreateKnowledgeBindingDraft()])) as Record<
    string,
    CreateKnowledgeBindingDraft
  >;
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
          <p className="personal-meta">{props.summary || "褰撳墠灞曠ず鐨勬槸鎶€鑳芥墍灞炶兘鍔涘寘涓殑鐪熷疄璧勪骇锛屽悗缁啀涓嬫矇涓烘妧鑳界骇鐪熸簮瀵硅薄銆?}</p>
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
    props.item.applicableScopes.length ? `浣滅敤鍩燂細${props.item.applicableScopes.join(" / ")}` : "",
    Number.isFinite(props.item.sortOrder) ? `鎺掑簭锛?{props.item.sortOrder}` : "",
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
        <span className="personal-meta">{metaParts.join(" 路 ")}</span>
        <span className="personal-meta">{props.item.usageNote || props.item.sourceUri || "鏆傛棤浣跨敤璇存槑"}</span>
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
    props.item.entry ? `鍏ュ彛锛?{props.item.entry}` : "",
    Number.isFinite(props.item.sortOrder) ? `鎺掑簭锛?{props.item.sortOrder}` : "",
  ].filter(Boolean);
  const argsSummary =
    props.item.argsSchema && Object.keys(props.item.argsSchema).length
      ? `鍙傛暟瀛楁锛?{Object.keys(props.item.argsSchema).join(", ")}`
      : "鏆傛棤鍙傛暟 schema";

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
        <span className="personal-meta">{metaParts.join(" 路 ")}</span>
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
          <span className="archive-pill status-ready">鎶€鑳藉垱寤?/span>
          <h3>鍒涘缓鎶€鑳藉苟鐧昏褰掑睘</h3>
          <p>鎶婇珮棰戝瓧娈垫敼鎴愪笅鎷夐€夋嫨锛屼紭鍏堝畬鎴愭妧鑳芥湰浣撱€佹ā鍧楀綊灞炪€佽兘鍔涘寘褰掑睘鍜屾彁绀鸿瘝鍦烘櫙鐧昏銆?/p>
        </div>
        <div className="admin-user-filter-summary">
          <div>
            <span>渚涘簲鍟?/span>
            <strong>{props.providerOptions.length}</strong>
          </div>
          <div>
            <span>妯″瀷</span>
            <strong>{props.modelOptions.length}</strong>
          </div>
          <div>
            <span>鎻愮ず璇嶅満鏅?/span>
            <strong>{props.promptSceneOptions.length}</strong>
          </div>
        </div>
      </div>

      <div className="personal-meta" style={{ marginBottom: 16 }}>
        `References` 涓庣煡璇嗗簱鏂囦欢鐜板湪鏀寔閫夋嫨鏈湴鏂囦欢鍚庤嚜鍔ㄥ甫鍏ュ瓧娈碉紱杩欓噷鍏堟妸鎶€鑳藉垱寤哄繀濉」灏介噺鏀跺彛涓洪€夋嫨鍣ㄣ€?      </div>

      <div className="admin-skill-simple-grid">
        <label className="admin-skill-field">
          <span>鎶€鑳藉悕绉?/span>
          <input value={props.draft.name} placeholder="渚嬪锛氬叕浼楀彿鏂囩珷鐢熸垚" onChange={(event) => props.onChange("name", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>鎶€鑳芥爣璇?/span>
          <input value={props.draft.slug} placeholder="渚嬪锛歸echat-article-generator" onChange={(event) => props.onChange("slug", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>鍒嗙被</span>
          <select value={props.draft.category} onChange={(event) => props.onChange("category", event.target.value)}>
            {props.categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>鐘舵€?/span>
          <select value={props.draft.status} onChange={(event) => props.onChange("status", event.target.value as CreateSkillDraft["status"])}>
            <option value="ACTIVE">鍚敤涓?/option>
            <option value="DRAFT">鑽夌</option>
            <option value="DISABLED">鍋滅敤</option>
          </select>
        </label>
        <label className="admin-skill-field">
          <span>渚涘簲鍟?/span>
          <select value={props.draft.provider} onChange={(event) => props.onChange("provider", event.target.value)}>
            <option value="">璇烽€夋嫨渚涘簲鍟?/option>
            {props.providerOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>榛樿妯″瀷</span>
          <select value={props.draft.defaultModel} onChange={(event) => props.onChange("defaultModel", event.target.value)}>
            <option value="">璇烽€夋嫨妯″瀷</option>
            {props.modelOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>鐐规暟鎴愭湰</span>
          <input type="number" value={props.draft.pointsCost} onChange={(event) => props.onChange("pointsCost", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>鎵€灞炴ā鍧?/span>
          <select value={props.draft.moduleKey} onChange={(event) => props.onChange("moduleKey", event.target.value)}>
            <option value="NONE">鏆備笉缁戝畾</option>
            {props.moduleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>鎵€灞炶兘鍔涘寘</span>
          <select value={props.draft.packageKey} onChange={(event) => props.onChange("packageKey", event.target.value)}>
            <option value="NONE">鏆備笉缁戝畾</option>
            {props.packageOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field">
          <span>鎻愮ず璇嶅満鏅?/span>
          <select value={props.draft.promptScene} onChange={(event) => props.onChange("promptScene", event.target.value)}>
            <option value="">绋嶅悗缁戝畾</option>
            {props.promptSceneOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-skill-field admin-skill-field--full">
          <span>鎶€鑳借鏄?/span>
          <textarea value={props.draft.description} onChange={(event) => props.onChange("description", event.target.value)} />
        </label>
        <label className="admin-skill-field admin-skill-field--full">
          <span>褰掑睘璇存槑</span>
          <textarea value={props.draft.bindingRemarks} onChange={(event) => props.onChange("bindingRemarks", event.target.value)} />
        </label>
      </div>

      <div className="personal-actions">
        <button type="button" className="secondary-button" onClick={props.onCancel} disabled={props.isCreating}>
          杩斿洖鑳藉姏鍖呮憳瑕?        </button>
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
          {props.isCreating ? "鍒涘缓涓?.." : "纭鍒涘缓"}
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
    category: "鍐呭鐢熶骇",
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
    category: "鍐呭鐢熶骇",
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
    reader.onerror = () => reject(reader.error || new Error("璇诲彇鍘嬬缉鍖呭け璐?));
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
    return fallbackName.trim() || "绗笁鏂瑰钩鍙?;
  }
  try {
    const host = new URL(trimmed).host.toLowerCase();
    const hostNameMap: Record<string, string> = {
      "www.right.codes": "Right Codes 骞冲彴",
      "api.deepseek.com": "DeepSeek 骞冲彴",
      "ark.cn-beijing.volces.com": "鐏北鏂硅垷骞冲彴",
      "api.moonshot.cn": "Kimi 骞冲彴",
      "open.bigmodel.cn": "GLM 骞冲彴",
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
        label: `${modelName} 路 ${provider.name}`,
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
    label: `${modelName} 路 ${providerId}`,
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
    customHeaders: parseProviderJsonMap(draft.customHeadersJson, "鑷畾涔?Headers"),
    extraParams: parseProviderJsonObject(draft.extraParamsJson, "鎵╁睍鍙傛暟"),
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
    return "鏈厤缃?;
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
      throw new Error(`${label} 蹇呴』鏄?JSON 瀵硅薄`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `${label} 涓嶆槸鍚堟硶 JSON`);
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
    return "鐭ヨ瘑搴撳叏閲忓悓姝?;
  }
  return run.fileName || "鏂囦欢鍚屾浠诲姟";
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
    return "鍚敤涓?;
  }
  if (status === "DISABLED") {
    return "宸插仠鐢?;
  }
  return "鑽夌";
}

function getSkillPrimaryMark(primaryId: string, label: string) {
  if (primaryId === "brand-growth") {
    return "绛?;
  }
  if (primaryId === "xiaohongshu") {
    return "绾?;
  }
  if (primaryId === "douyin") {
    return "鎶?;
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
