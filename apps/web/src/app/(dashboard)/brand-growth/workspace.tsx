"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { getMe, switchBrand } from "../../../services/auth";
import {
  formatCalendarDate,
  formatCalendarListValue,
  formatCalendarMonthDay,
  formatCalendarOptionalValue,
  formatCalendarWeekday,
  getCalendarFestivalLabel,
} from "../xiaohongshu/calendar-helpers";
import {
  type DouyinCollectionCardKey,
  type XiaohongshuCollectionCardKey,
} from "./collection-workspace";
import {
  formatCount,
  formatDateLabel,
  formatDateTime,
  formatHotspotHeat,
  formatMetric,
  sortByCollectedAtDesc,
} from "./datetime-helpers";
import {
  type LibraryAssetModalDraft,
  type LibraryAssetTarget,
} from "./library-workspace";
import {
  buildVisualReportPreviewDocument,
  renderMarkdownToHtml,
} from "./markdown-render";
import type {
  BrandGrowthLibraryPageKey,
  MediaPreviewState,
} from "./shared-types";
import {
  getBrandArchiveStatusText,
  getReportTaskStatusText,
} from "./task-status-helpers";
import {
  addDouyinBenchmarkWorkToMaterialLibrary,
  addBenchmarkNoteToMaterialLibrary,
  getDouyinCollectionWorkspace,
  getXiaohongshuCollectionWorkspace,
  removeDouyinBenchmarkWorkFromMaterialLibrary,
  syncDouyinCollectionWorkspace,
  type DouyinSyncPayload,
  syncXiaohongshuFromFeishu,
  type DouyinCollectionWorkspace,
  type XhsCollectionWorkspace,
} from "../../../services/collectors";
import { API_BASE_URL } from "../../../services/http";
import {
  brandArchiveSeed,
  createBrandProduct,
  getCurrentUserProfile,
  deleteBrandProduct,
  DEMO_BRAND_ID,
  getBrandArchive,
  getBrandPermissionSettings,
  getFeishuAppConfig,
  getBrandFeishuBinding,
  getFeishuAuthStatus,
  replaceBrandAssets,
  replaceBrandSurvey,
  startFeishuAuth,
  type BrandArchiveBundle,
  type BrandArchiveStepKey,
  type BrandAsset,
  type BrandBackground,
  type BrandPermissionKey,
  type BrandPermissionSettingsRecord,
  type CurrentUserProfile,
  type FeishuAppConfigRecord,
  type FeishuAuthStatusRecord,
  type FeishuBindingRecord,
  type BrandProduct,
  normalizeBrandArchiveBundle,
  upsertFeishuAppConfig,
  upsertBrandFeishuBinding,
  uploadBrandAssetFile,
  uploadBrandProductImage,
  updateBrandBackground,
  updateBrandProduct,
} from "../../../services/brand-growth";
import {
  generateAnnualMarketingPlan,
  generateGrowthReport,
  generateVisualGrowthReport,
  getAnnualMarketingPlanWorkspace,
  getGrowthReportWorkspace,
  getXiaohongshuMarketingCalendarWorkspace,
  getXiaohongshuMarketingPlanWorkspace,
  getVisualGrowthReportWorkspace,
  generateXiaohongshuMarketingCalendar,
  updateGrowthReport,
  type AnnualMarketingPlanWorkspace,
  type GrowthReportWorkspace,
  type XiaohongshuMarketingCalendarItem,
  type XiaohongshuMarketingCalendarWorkspace,
  type XiaohongshuMarketingPlanWorkspace,
  type VisualGrowthReportWorkspace,
  updateXiaohongshuMarketingCalendar,
  xiaohongshuMarketingPlanSeed,
} from "../../../services/reports";
import {
  getDailyHotspotWorkspace,
  syncDailyHotspots,
  type DailyHotspotWorkspace,
} from "../../../services/daily-hotspots";
import { isAuthFailure } from "../personal-center/route-helpers";

const stepOrder: BrandArchiveStepKey[] = [
  "background",
  "products",
  "survey",
  "industryFeeds",
  "businessAssets",
];

type StrategySectionKey = "library" | "collection" | "report";
type StrategyPageKey =
  | BrandArchiveStepKey
  | "feishuCollection"
  | "xiaohongshuCollection"
  | "douyinCollection"
  | "dailyHotspot"
  | "growthReport"
  | "visualGrowthReport"
  | "annualMarketingPlan"
  | "xiaohongshuMarketingCalendar";
type BrandGrowthLoadScope = "library" | "collection" | "report";

const BrandGrowthLibraryWorkspace = dynamic(
  () => import("./library-workspace").then((module) => module.BrandGrowthLibraryWorkspace),
  { loading: () => <WorkspaceChunkFallback label="资料库" /> },
);

const BrandGrowthCollectionWorkspace = dynamic(
  () => import("./collection-workspace").then((module) => module.BrandGrowthCollectionWorkspace),
  { loading: () => <WorkspaceChunkFallback label="收集数据" /> },
);

const CalendarWorkspace = dynamic(
  () => import("../xiaohongshu/calendar-workspace").then((module) => module.CalendarWorkspace),
  { loading: () => <WorkspaceChunkFallback label="营销日历" /> },
);

const BrandGrowthReportWorkspace = dynamic(
  () => import("./report-workspace").then((module) => module.BrandGrowthReportWorkspace),
  { loading: () => <WorkspaceChunkFallback label="品牌增长报告" /> },
);

function WorkspaceChunkFallback({ label }: { label: string }) {
  return (
    <section className="strategy-workspace-shell" aria-live="polite">
      <div className="strategy-workspace-surface brand-growth-shell">
        <div className="brand-growth-panel stack gap-12">
          <p className="section-eyebrow">模块加载中</p>
          <h3>{label}正在准备</h3>
          <p className="section-subtitle">按需加载对应工作区资源，避免首屏下载全部板块脚本。</p>
        </div>
      </div>
    </section>
  );
}

const strategySections: Array<{
  key: StrategySectionKey;
  label: string;
  pages: Array<{ key: StrategyPageKey; label: string; description: string }>;
}> = [
  {
    key: "library",
    label: "品牌资料库",
    pages: [
      { key: "background", label: "品牌背景资料", description: "维护品牌基础信息、企业介绍和建档底座。" },
      { key: "products", label: "产品资料库", description: "沉淀品牌产品、价格与场景信息。" },
      { key: "survey", label: "品牌运营情况", description: "记录品牌人货场、运营诊断与核心问题。" },
      { key: "industryFeeds", label: "第三方数据", description: "归集行业报告、市场信息与评论洞察。" },
      { key: "businessAssets", label: "企业知识库", description: "归集经营报表、业务系统、门店资料与内部知识文档。" },
    ],
  },
  {
    key: "collection",
    label: "收集数据",
    pages: [
      { key: "feishuCollection", label: "飞书配置", description: "配置飞书应用、副本绑定与同步前置。" },
      { key: "xiaohongshuCollection", label: "小红书", description: "查看小红书同步结果并执行数据同步。" },
      { key: "douyinCollection", label: "抖音", description: "查看抖音采集结果并执行 Tikhub 数据同步。" },
      { key: "dailyHotspot", label: "每日热点", description: "查看热点主题、平台趋势和当天建议动作。" },
    ],
  },
  {
    key: "report",
    label: "品牌增长报告",
    pages: [
      { key: "growthReport", label: "生成品牌增长报告", description: "根据品牌资料与收集数据生成分析报告。" },
      { key: "visualGrowthReport", label: "品牌增长可视化报告", description: "输出图表化的品牌增长可视化结果。" },
      { key: "annualMarketingPlan", label: "半年营销规划", description: "形成未来半年节奏、战役安排与重点营销规划。" },
      { key: "xiaohongshuMarketingCalendar", label: "营销日历", description: "基于半年营销规划和小红书营销策划方案生成未来 7 天排期。" },
    ],
  },
];

const FEISHU_XHS_TEMPLATE_URL = "https://acn8dzidreuv.feishu.cn/base/Q4UNbUmY1acU9rsiYaAcobZwnte?from=from_copylink";
const strategyPagePermissionMap: Record<StrategyPageKey, BrandPermissionKey> = {
  background: "brandGrowth.library.background",
  products: "brandGrowth.library.products",
  survey: "brandGrowth.library.survey",
  platformAccounts: "brandGrowth.collection.xiaohongshuCollection",
  competitorAccounts: "brandGrowth.collection.xiaohongshuCollection",
  industryFeeds: "brandGrowth.library.industryFeeds",
  businessAssets: "brandGrowth.library.businessAssets",
  feishuCollection: "brandGrowth.collection.xiaohongshuCollection",
  xiaohongshuCollection: "brandGrowth.collection.xiaohongshuCollection",
  douyinCollection: "brandGrowth.collection.douyinCollection",
  dailyHotspot: "brandGrowth.collection.dailyHotspot",
  growthReport: "brandGrowth.report.growthReport",
  visualGrowthReport: "brandGrowth.report.visualGrowthReport",
  annualMarketingPlan: "brandGrowth.report.halfYearMarketingPlan",
  xiaohongshuMarketingCalendar: "xiaohongshu.calendar",
};

function cloneSeed(): BrandArchiveBundle {
  return JSON.parse(JSON.stringify(brandArchiveSeed)) as BrandArchiveBundle;
}

function getDefaultHotspotDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyArchiveBundle(): BrandArchiveBundle {
  const seed = cloneSeed();
  return normalizeBrandArchiveBundle({
    ...seed,
    brand: {
      ...seed.brand,
      brandName: "",
      industry: "",
      storeCount: 0,
      foundedYear: new Date().getFullYear(),
      brandDescription: "",
      enterpriseIntro: "",
    },
    products: [],
    survey: seed.survey.map((item) => ({
      ...item,
      value: "",
    })),
    platformAccounts: [],
    competitorAccounts: [],
    industryFeeds: [],
    businessAssets: [],
    steps: seed.steps.map((step) => ({
      ...step,
      status: "pending",
    })),
  });
}

function createEmptyCollectionWorkspace(): XhsCollectionWorkspace {
  return {
    brandAccounts: [],
    competitorAccounts: [],
    brandNotes: [],
    benchmarkNotes: [],
    targetUsers: [],
  };
}

function createEmptyDouyinCollectionWorkspace(): DouyinCollectionWorkspace {
  return {
    brandAccounts: [],
    competitorAccounts: [],
    brandWorks: [],
    benchmarkWorks: [],
    lowFanExplosiveWorks: [],
    highCompletionRateWorks: [],
    highLikeRateWorks: [],
    cityHotspots: [],
    contentTags: [],
    cityOptions: [],
  };
}

function createEmptyDailyHotspotWorkspace(): DailyHotspotWorkspace {
  const today = getDefaultHotspotDate();
  return {
    selectedDate: today,
    availableDates: [today],
    platforms: [],
  };
}

function createEmptyGrowthReportWorkspace(): GrowthReportWorkspace {
  return {
    latest: undefined,
    history: [],
    latestTask: undefined,
  };
}

function createEmptyVisualGrowthReportWorkspace(): VisualGrowthReportWorkspace {
  return {
    latest: undefined,
    history: [],
    latestTask: undefined,
  };
}

function createEmptyAnnualMarketingPlanWorkspace(): AnnualMarketingPlanWorkspace {
  return {
    latest: undefined,
    history: [],
  };
}

function emptyProduct(): BrandProduct {
  return {
    id: `prd_local_${Math.random().toString(36).slice(2, 9)}`,
    productName: "",
    productType: "",
    price: 0,
    productPositioning: "",
    targetAudience: "",
    painPoint: "",
    usageScenario: "",
    differentiators: "",
    marketPosition: "",
    detailDescription: "",
    imageUrl: "",
  };
}

function emptyAsset(overrides: Partial<BrandAsset> = {}): BrandAsset {
  return {
    id: `ast_local_${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    description: "",
    sourceName: "",
    fileUrl: "",
    ...overrides,
  };
}

function inferAssetTitleFromFileUrl(fileUrl: string) {
  const normalized = String(fileUrl || "").trim();
  if (!normalized) {
    return "";
  }

  try {
    const fileName = decodeURIComponent(normalized.split("?")[0] || "")
      .split("/")
      .filter(Boolean)
      .pop();
    if (!fileName) {
      return normalized;
    }
    return fileName.replace(/\.[^.]+$/, "").trim() || fileName;
  } catch {
    return normalized;
  }
}

function parseOptionalNumericValue(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const normalized = String(value || "").trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildAssetFromDraft(draft: LibraryAssetModalDraft, fileUrl: string, current?: BrandAsset): BrandAsset {
  return {
    ...current,
    title: draft.title.trim() || inferAssetTitleFromFileUrl(fileUrl),
    description: draft.description.trim(),
    sourceName: draft.sourceName.trim() || (draft.file ? "本地文档" : current?.sourceName || ""),
    fileUrl,
    knowledgeBaseId: draft.knowledgeBaseId.trim() || undefined,
    knowledgeBaseName: draft.knowledgeBaseName.trim() || undefined,
    knowledgeBaseSlug: draft.knowledgeBaseSlug.trim() || undefined,
    bindingType: draft.targetId.trim() ? draft.bindingType : undefined,
    targetId: draft.targetId.trim() || undefined,
    targetKey: draft.targetKey.trim() || undefined,
    targetName: draft.targetName.trim() || undefined,
    priority: Number.isFinite(draft.priority) ? draft.priority : undefined,
    retrievalMode: draft.retrievalMode,
    isRequired: draft.isRequired,
    enabled: draft.enabled,
    defaultTopK: Number.isFinite(draft.defaultTopK) ? draft.defaultTopK : undefined,
    recallMode: draft.recallMode,
    rerankEnabled: draft.rerankEnabled,
    retrievalThreshold: parseOptionalNumericValue(draft.retrievalThreshold),
  };
}

function buildBrandAssetPayload(item: BrandAsset) {
  return {
    id: item.id?.includes("_local_") ? undefined : item.id,
    title: item.title,
    description: item.description,
    sourceName: item.sourceName,
    fileUrl: item.fileUrl,
    knowledgeBaseId: item.knowledgeBaseId,
    knowledgeBaseName: item.knowledgeBaseName,
    knowledgeBaseSlug: item.knowledgeBaseSlug,
    bindingType: item.bindingType,
    targetId: item.targetId,
    targetKey: item.targetKey,
    targetName: item.targetName,
    priority: item.priority,
    retrievalMode: item.retrievalMode,
    isRequired: item.isRequired,
    enabled: item.enabled,
    defaultTopK: item.defaultTopK,
    recallMode: item.recallMode,
    rerankEnabled: item.rerankEnabled,
    retrievalThreshold: item.retrievalThreshold,
  };
}

function createEmptyFeishuBindingForm() {
  return {
    wikiUrl: "",
  };
}

function createEmptyFeishuAppConfigForm() {
  return {
    appId: "",
    appSecret: "",
    redirectUri: "",
    scope: "",
  };
}

function createFeishuAppConfigFormFromRecord(config: FeishuAppConfigRecord | null) {
  if (!config) {
    return createEmptyFeishuAppConfigForm();
  }

  return {
    appId: config.appId,
    appSecret: "",
    redirectUri: config.redirectUri,
    scope: config.scope,
  };
}

function createFeishuBindingFormFromRecord(binding: FeishuBindingRecord | null) {
  if (!binding) {
    return createEmptyFeishuBindingForm();
  }

  return {
    wikiUrl: binding.wikiUrl,
  };
}

function getCompletion(bundle: BrandArchiveBundle) {
  const visibleSteps = bundle.steps.filter((step) => stepOrder.includes(step.key as BrandArchiveStepKey));
  const done = visibleSteps.filter((step) => step.status === "ready").length;
  return {
    done,
    total: visibleSteps.length,
    percentage: Math.round((done / Math.max(1, visibleSteps.length)) * 100),
  };
}

function isBrandArchiveStep(key: StrategyPageKey): key is BrandArchiveStepKey {
  return stepOrder.includes(key as BrandArchiveStepKey);
}

function isLibraryPageKey(key?: BrandArchiveStepKey): key is BrandGrowthLibraryPageKey {
  return key === "background" || key === "products" || key === "survey" || key === "industryFeeds" || key === "businessAssets";
}

function getLoadScopeByPage(key: StrategyPageKey): BrandGrowthLoadScope {
  if (isBrandArchiveStep(key)) {
    return "library";
  }
  if (key === "feishuCollection" || key === "xiaohongshuCollection" || key === "douyinCollection" || key === "dailyHotspot") {
    return "collection";
  }
  return "report";
}

type DouyinSyncForm = {
  brandAccountLinks: string;
  competitorAccountLinks: string;
  benchmarkAwemeIds: string;
  lowFanExplosiveWorks: {
    primaryTagId: string;
    secondaryTagId: string;
  };
  highCompletionRateWorks: {
    primaryTagId: string;
    secondaryTagId: string;
  };
  highLikeRateWorks: {
    primaryTagId: string;
    secondaryTagId: string;
  };
  cityHotspots: {
    cityCode: string;
  };
};

function createEmptyDouyinSyncForm(): DouyinSyncForm {
  return {
    brandAccountLinks: "",
    competitorAccountLinks: "",
    benchmarkAwemeIds: "",
    lowFanExplosiveWorks: {
      primaryTagId: "",
      secondaryTagId: "",
    },
    highCompletionRateWorks: {
      primaryTagId: "",
      secondaryTagId: "",
    },
    highLikeRateWorks: {
      primaryTagId: "",
      secondaryTagId: "",
    },
    cityHotspots: {
      cityCode: "",
    },
  };
}

function parseDouyinSyncLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parseOptionalNumericTagId(value: string) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : undefined;
}

export function BrandGrowthWorkspace() {
  const [archive, setArchive] = useState<BrandArchiveBundle>(createEmptyArchiveBundle);
  const [collectionWorkspace, setCollectionWorkspace] = useState<XhsCollectionWorkspace>(createEmptyCollectionWorkspace);
  const [douyinCollectionWorkspace, setDouyinCollectionWorkspace] = useState<DouyinCollectionWorkspace>(createEmptyDouyinCollectionWorkspace);
  const [dailyHotspotWorkspace, setDailyHotspotWorkspace] = useState<DailyHotspotWorkspace>(createEmptyDailyHotspotWorkspace);
  const [reportWorkspace, setReportWorkspace] = useState<GrowthReportWorkspace>(createEmptyGrowthReportWorkspace);
  const [visualReportWorkspace, setVisualReportWorkspace] = useState<VisualGrowthReportWorkspace>(createEmptyVisualGrowthReportWorkspace);
  const [annualMarketingPlanWorkspace, setAnnualMarketingPlanWorkspace] = useState<AnnualMarketingPlanWorkspace>(createEmptyAnnualMarketingPlanWorkspace);
  const [xiaohongshuMarketingPlanWorkspace, setXiaohongshuMarketingPlanWorkspace] =
    useState<XiaohongshuMarketingPlanWorkspace>(xiaohongshuMarketingPlanSeed);
  const [marketingCalendarWorkspace, setMarketingCalendarWorkspace] = useState<XiaohongshuMarketingCalendarWorkspace>({ history: [] });
  const [feishuBinding, setFeishuBinding] = useState<FeishuBindingRecord | null>(null);
  const [feishuAppConfig, setFeishuAppConfig] = useState<FeishuAppConfigRecord | null>(null);
  const [feishuAuthStatus, setFeishuAuthStatus] = useState<FeishuAuthStatusRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [activeBrandId, setActiveBrandId] = useState<string>(DEMO_BRAND_ID);
  const [currentBrandRole, setCurrentBrandRole] = useState("");
  const [brandPermissionSettings, setBrandPermissionSettings] = useState<BrandPermissionSettingsRecord | null>(null);
  const [hasOwnerAccess, setHasOwnerAccess] = useState(true);
  const [feishuBindingForm, setFeishuBindingForm] = useState(createEmptyFeishuBindingForm);
  const [feishuAppConfigForm, setFeishuAppConfigForm] = useState(createEmptyFeishuAppConfigForm);
  const [douyinSyncForm, setDouyinSyncForm] = useState<DouyinSyncForm>(createEmptyDouyinSyncForm);
  const [brandNotesPage, setBrandNotesPage] = useState(1);
  const [brandNotesPageSize, setBrandNotesPageSize] = useState(10);
  const [hotspotPage, setHotspotPage] = useState(1);
  const [hotspotPageSize, setHotspotPageSize] = useState(10);
  const [activeSection, setActiveSection] = useState<StrategySectionKey>("library");
  const [activePage, setActivePage] = useState<StrategyPageKey>("background");
  const [activeXhsCollectionCard, setActiveXhsCollectionCard] = useState<XiaohongshuCollectionCardKey>("brandAccount");
  const [activeDouyinCollectionCard, setActiveDouyinCollectionCard] = useState<DouyinCollectionCardKey>("brandAccount");
  const [selectedHotspotDate, setSelectedHotspotDate] = useState(getDefaultHotspotDate);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingFeishuAppConfig, setIsSavingFeishuAppConfig] = useState(false);
  const [isSavingFeishuBinding, setIsSavingFeishuBinding] = useState(false);
  const [isSyncingFeishuWorkspace, setIsSyncingFeishuWorkspace] = useState(false);
  const [isSyncingDouyinWorkspace, setIsSyncingDouyinWorkspace] = useState(false);
  const [isSyncingDailyHotspots, setIsSyncingDailyHotspots] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isGeneratingVisualReport, setIsGeneratingVisualReport] = useState(false);
  const [isGeneratingAnnualMarketingPlan, setIsGeneratingAnnualMarketingPlan] = useState(false);
  const [isGeneratingMarketingCalendar, setIsGeneratingMarketingCalendar] = useState(false);
  const [selectedCalendarItemId, setSelectedCalendarItemId] = useState("");
  const [isCalendarDetailOpen, setIsCalendarDetailOpen] = useState(false);
  const [isEditingCalendarItem, setIsEditingCalendarItem] = useState(false);
  const [isSavingCalendarItem, setIsSavingCalendarItem] = useState(false);
  const [calendarItemDraft, setCalendarItemDraft] = useState<XiaohongshuMarketingCalendarItem | null>(null);
  const [uploadingProductId, setUploadingProductId] = useState("");
  const [addingMaterialAssetId, setAddingMaterialAssetId] = useState("");
  const [notice, setNotice] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [reportMarkdownDraft, setReportMarkdownDraft] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "error" | "loading">("loading");
  const [removedProductIds, setRemovedProductIds] = useState<string[]>([]);
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewState | null>(null);
  const [loadedScopes, setLoadedScopes] = useState<Record<BrandGrowthLoadScope, boolean>>({
    library: false,
    collection: false,
    report: false,
  });
  const completion = useMemo(() => getCompletion(archive), [archive]);
  const visibleStrategySections = useMemo(() => {
    const permissionMap = brandPermissionSettings?.currentUserPermissions;
    if (!permissionMap) {
      return strategySections;
    }
    return strategySections
      .map((section) => ({
        ...section,
        pages: section.pages.filter((page) => permissionMap[strategyPagePermissionMap[page.key]]?.view),
      }))
      .filter((section) => section.pages.length > 0);
  }, [brandPermissionSettings]);
  const currentSection = visibleStrategySections.find((item) => item.key === activeSection) ?? visibleStrategySections[0] ?? strategySections[0];
  const currentPage = currentSection.pages.find((item) => item.key === activePage) ?? currentSection.pages[0];
  const activeBrandPage = isBrandArchiveStep(activePage) ? activePage : undefined;
  const activeStepMeta = activeBrandPage ? archive.steps.find((step) => step.key === activeBrandPage) : undefined;
  const hotspotBoards = dailyHotspotWorkspace.platforms;
  const hotspotAvailableDates = dailyHotspotWorkspace.availableDates;
  const activeHotspotRecord = hotspotBoards[0];
  const sortedHotspotItems = useMemo(
    () => [...(activeHotspotRecord?.items ?? [])].sort((left, right) => left.rank - right.rank),
    [activeHotspotRecord?.items],
  );
  const hotspotPageCount = Math.max(1, Math.ceil(sortedHotspotItems.length / hotspotPageSize));
  const paginatedHotspotItems = useMemo(() => {
    const startIndex = (hotspotPage - 1) * hotspotPageSize;
    return sortedHotspotItems.slice(startIndex, startIndex + hotspotPageSize);
  }, [hotspotPage, hotspotPageSize, sortedHotspotItems]);
  const sortedBrandAccounts = useMemo(
    () => sortByCollectedAtDesc(collectionWorkspace.brandAccounts),
    [collectionWorkspace.brandAccounts],
  );
  const sortedCompetitorAccounts = useMemo(
    () => sortByCollectedAtDesc(collectionWorkspace.competitorAccounts),
    [collectionWorkspace.competitorAccounts],
  );
  const sortedBrandNotes = useMemo(
    () => sortByCollectedAtDesc(collectionWorkspace.brandNotes),
    [collectionWorkspace.brandNotes],
  );
  const sortedBenchmarkNotes = useMemo(
    () => sortByCollectedAtDesc(collectionWorkspace.benchmarkNotes),
    [collectionWorkspace.benchmarkNotes],
  );
  const sortedDouyinBrandAccounts = useMemo(
    () => sortByCollectedAtDesc(douyinCollectionWorkspace.brandAccounts),
    [douyinCollectionWorkspace.brandAccounts],
  );
  const sortedDouyinCompetitorAccounts = useMemo(
    () => sortByCollectedAtDesc(douyinCollectionWorkspace.competitorAccounts),
    [douyinCollectionWorkspace.competitorAccounts],
  );
  const sortedDouyinBrandWorks = useMemo(
    () => sortByCollectedAtDesc(douyinCollectionWorkspace.brandWorks),
    [douyinCollectionWorkspace.brandWorks],
  );
  const sortedDouyinBenchmarkWorks = useMemo(
    () => sortByCollectedAtDesc(douyinCollectionWorkspace.benchmarkWorks),
    [douyinCollectionWorkspace.benchmarkWorks],
  );
  const sortedDouyinLowFanExplosiveWorks = useMemo(
    () => sortByCollectedAtDesc(douyinCollectionWorkspace.lowFanExplosiveWorks),
    [douyinCollectionWorkspace.lowFanExplosiveWorks],
  );
  const sortedDouyinHighCompletionRateWorks = useMemo(
    () => sortByCollectedAtDesc(douyinCollectionWorkspace.highCompletionRateWorks),
    [douyinCollectionWorkspace.highCompletionRateWorks],
  );
  const sortedDouyinHighLikeRateWorks = useMemo(
    () => sortByCollectedAtDesc(douyinCollectionWorkspace.highLikeRateWorks),
    [douyinCollectionWorkspace.highLikeRateWorks],
  );
  const sortedDouyinCityHotspots = useMemo(
    () => [...douyinCollectionWorkspace.cityHotspots].sort(
      (left, right) => left.rank - right.rank || Date.parse(right.collectedAt) - Date.parse(left.collectedAt),
    ),
    [douyinCollectionWorkspace.cityHotspots],
  );
  const brandNotesPageCount = Math.max(1, Math.ceil(sortedBrandNotes.length / brandNotesPageSize));
  const paginatedBrandNotes = useMemo(() => {
    const startIndex = (brandNotesPage - 1) * brandNotesPageSize;
    return sortedBrandNotes.slice(startIndex, startIndex + brandNotesPageSize);
  }, [brandNotesPage, brandNotesPageSize, sortedBrandNotes]);
  const canGenerateGrowthReport =
    collectionWorkspace.brandAccounts.length > 0
    && collectionWorkspace.competitorAccounts.length > 0
    && collectionWorkspace.brandNotes.length > 0
    && collectionWorkspace.benchmarkNotes.length > 0;
  const canGenerateVisualGrowthReport = Boolean(reportWorkspace.latest?.reportMarkdown?.trim());
  const canGenerateAnnualMarketingPlan = Boolean(reportWorkspace.latest?.reportMarkdown?.trim());
  const latestMarketingPlan = xiaohongshuMarketingPlanWorkspace.latest;
  const latestCalendar = marketingCalendarWorkspace.latest;
  const latestGrowthTask = reportWorkspace.latestTask;
  const latestVisualTask = visualReportWorkspace.latestTask;
  const latestAnnualMarketingTask = annualMarketingPlanWorkspace.latestTask;
  const latestCalendarTask = marketingCalendarWorkspace.latestTask;
  const isGrowthReportTaskActive = latestGrowthTask?.taskStatus === "QUEUED" || latestGrowthTask?.taskStatus === "RUNNING";
  const isVisualReportTaskActive = latestVisualTask?.taskStatus === "QUEUED" || latestVisualTask?.taskStatus === "RUNNING";
  const isAnnualMarketingPlanTaskActive =
    latestAnnualMarketingTask?.taskStatus === "QUEUED" || latestAnnualMarketingTask?.taskStatus === "RUNNING";
  const isMarketingCalendarTaskActive = latestCalendarTask?.taskStatus === "QUEUED" || latestCalendarTask?.taskStatus === "RUNNING";
  const canGenerateMarketingCalendar = Boolean(reportWorkspace.latest?.reportMarkdown?.trim() && annualMarketingPlanWorkspace.latest && latestMarketingPlan);
  const calendarTaskStatusText = getReportTaskStatusText(latestCalendarTask?.taskStatus);
  const calendarInlineError =
    latestCalendarTask?.taskStatus === "FAILED" && latestCalendarTask.errorMessage ? latestCalendarTask.errorMessage : "";
  const calendarAllItems = useMemo(
    () =>
      latestCalendar
        ? [latestCalendar, ...marketingCalendarWorkspace.history.filter((item) => item.id !== latestCalendar.id)].flatMap((item) => item.items)
        : marketingCalendarWorkspace.history.flatMap((item) => item.items),
    [latestCalendar, marketingCalendarWorkspace.history],
  );
  const selectedCalendarItem = calendarAllItems.find((item) => item.id === selectedCalendarItemId) || calendarAllItems[0];
  const canSyncFeishuWorkspace = Boolean(feishuBinding?.wikiUrl) && Boolean(feishuAuthStatus?.connected);
  const hasCurrentPageEditPermission = Boolean(brandPermissionSettings?.currentUserPermissions?.[strategyPagePermissionMap[currentPage.key]]?.edit);
  useEffect(() => {
    if (dailyHotspotWorkspace.selectedDate && dailyHotspotWorkspace.selectedDate !== selectedHotspotDate) {
      setSelectedHotspotDate(dailyHotspotWorkspace.selectedDate);
    }
  }, [dailyHotspotWorkspace.selectedDate, selectedHotspotDate]);

  useEffect(() => {
    if (!visibleStrategySections.length) {
      return;
    }
    if (!visibleStrategySections.some((section) => section.key === activeSection)) {
      setActiveSection(visibleStrategySections[0].key);
      setActivePage(visibleStrategySections[0].pages[0]?.key ?? "background");
      return;
    }
    const matchedSection = visibleStrategySections.find((section) => section.key === activeSection);
    if (matchedSection && !matchedSection.pages.some((page) => page.key === activePage)) {
      setActivePage(matchedSection.pages[0]?.key ?? "background");
    }
  }, [activePage, activeSection, visibleStrategySections]);

  useEffect(() => {
    void loadArchive({ targetPage: "background" });
  }, []);

  async function resolveActiveBrandId(fallbackBrandId: string, me?: Awaited<ReturnType<typeof getMe>> | null) {
    const resolvedMe = me ?? await getMe().catch(() => null);
    const storedBrandId = getStoredCurrentBrandId(fallbackBrandId) || "";
    const preferredNonDemoBrandId = resolvedMe?.brands?.find((item) => item.id && item.id !== DEMO_BRAND_ID)?.id || "";
    const directCandidate = resolvedMe?.currentBrandId || storedBrandId || fallbackBrandId;

    if (preferredNonDemoBrandId && directCandidate === DEMO_BRAND_ID) {
      const switched = await switchBrand(preferredNonDemoBrandId).catch(() => null);
      const switchedBrandId = switched?.currentBrandId || preferredNonDemoBrandId;
      if (switchedBrandId && switchedBrandId !== DEMO_BRAND_ID) {
        return switchedBrandId;
      }
    }

    if (directCandidate && directCandidate !== DEMO_BRAND_ID) {
      return directCandidate;
    }

    return preferredNonDemoBrandId || directCandidate || fallbackBrandId;
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("feishu_oauth");
    const oauthMessage = params.get("feishu_message");
    if (!oauthStatus) {
      return;
    }
    if (oauthStatus === "success") {
      setNotice(oauthMessage || "飞书账号连接成功。");
    } else {
      setErrorMessage(oauthMessage || "飞书账号连接失败。");
    }
    window.history.replaceState({}, "", window.location.pathname);
    void loadArchive({ targetPage: activePage, force: true });
  }, []);

  useEffect(() => {
    if (!brandPermissionSettings || !hasOwnerAccess || isHydrating) {
      return;
    }
    const targetScope = getLoadScopeByPage(activePage);
    if (loadedScopes[targetScope]) {
      return;
    }
    void loadArchive({ targetPage: activePage });
  }, [activePage, brandPermissionSettings, hasOwnerAccess, isHydrating, loadedScopes]);

  useEffect(() => {
    setBrandNotesPage(1);
  }, [brandNotesPageSize, collectionWorkspace.brandNotes.length]);

  useEffect(() => {
    setHotspotPage(1);
  }, [hotspotPageSize, selectedHotspotDate, activeHotspotRecord?.id, sortedHotspotItems.length]);

  useEffect(() => {
    if (brandNotesPage > brandNotesPageCount) {
      setBrandNotesPage(brandNotesPageCount);
    }
  }, [brandNotesPage, brandNotesPageCount]);

  useEffect(() => {
    if (hotspotPage > hotspotPageCount) {
      setHotspotPage(hotspotPageCount);
    }
  }, [hotspotPage, hotspotPageCount]);

  useEffect(() => {
    setReportMarkdownDraft(reportWorkspace.latest?.reportMarkdown || "");
  }, [reportWorkspace.latest?.id, reportWorkspace.latest?.reportMarkdown]);

  useEffect(() => {
    if (!isGrowthReportTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshGrowthReportWorkspace(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [isGrowthReportTaskActive, latestGrowthTask?.updatedAt]);

  useEffect(() => {
    if (!isVisualReportTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshVisualReportWorkspace(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [isVisualReportTaskActive, latestVisualTask?.updatedAt]);

  useEffect(() => {
    if (!isAnnualMarketingPlanTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshAnnualMarketingPlanWorkspace(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [isAnnualMarketingPlanTaskActive, latestAnnualMarketingTask?.updatedAt]);

  useEffect(() => {
    if (!isMarketingCalendarTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshMarketingCalendarWorkspace(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [isMarketingCalendarTaskActive, latestCalendarTask?.updatedAt]);

  useEffect(() => {
    if (!isCalendarDetailOpen || !selectedCalendarItem || isEditingCalendarItem) {
      return;
    }
    setCalendarItemDraft(cloneMarketingCalendarItem(selectedCalendarItem));
  }, [isCalendarDetailOpen, isEditingCalendarItem, selectedCalendarItem]);

  async function loadArchive(options?: { targetPage?: StrategyPageKey; force?: boolean }) {
    const targetPage = options?.targetPage ?? activePage;
    const targetScope = getLoadScopeByPage(targetPage);
    const force = options?.force === true;
    setIsHydrating(true);
    setErrorMessage("");
    setDataSource("loading");

    try {
      const me = await getMe().catch(() => null);
      const resolvedActiveBrandId = await resolveActiveBrandId(archive.brand.id, me);
      const permissionSettingsResult =
        !force && brandPermissionSettings && activeBrandId === resolvedActiveBrandId
          ? brandPermissionSettings
          : await getBrandPermissionSettings(resolvedActiveBrandId);
      const hasAnyBrandGrowthViewPermission = Object.entries(permissionSettingsResult.currentUserPermissions).some(
        ([key, flags]) => key.startsWith("brandGrowth.") && Boolean(flags.view),
      );
      setBrandPermissionSettings(permissionSettingsResult);
      setCurrentBrandRole(permissionSettingsResult.currentUserRole);
      if (!hasAnyBrandGrowthViewPermission) {
        setHasOwnerAccess(false);
        setDataSource("api");
        setNotice("");
        setErrorMessage("当前账号没有品牌增长策略的查看权限，请联系管理员开通对应板块后再进入。");
        return;
      }

      setHasOwnerAccess(true);
      setActiveBrandId(resolvedActiveBrandId);

      const partialFailures: string[] = [];
      if (targetScope === "library") {
        const archiveResult = await getBrandArchive(resolvedActiveBrandId);
        setArchive(normalizeBrandArchiveBundle(archiveResult));
        setRemovedProductIds([]);
        setLoadedScopes((current) => ({ ...current, library: true }));
      }

      if (targetScope === "collection") {
        const currentProfile = currentUser ?? await getCurrentUserProfile().catch(() => null);
        setCurrentUser(currentProfile);
        const [
          collectionResult,
          douyinCollectionResult,
          dailyHotspotResult,
          feishuBindingResult,
          feishuAppConfigResult,
          feishuAuthStatusResult,
        ] = await Promise.allSettled([
          getXiaohongshuCollectionWorkspace(resolvedActiveBrandId),
          getDouyinCollectionWorkspace(resolvedActiveBrandId),
          getDailyHotspotWorkspace(resolvedActiveBrandId),
          getBrandFeishuBinding(resolvedActiveBrandId),
          getFeishuAppConfig(currentProfile?.id),
          getFeishuAuthStatus(currentProfile?.id),
        ]);

        if (collectionResult.status === "fulfilled") {
          setCollectionWorkspace(collectionResult.value);
        } else {
          partialFailures.push("小红书收集数据");
        }

        if (douyinCollectionResult.status === "fulfilled") {
          setDouyinCollectionWorkspace(douyinCollectionResult.value);
        } else {
          partialFailures.push("抖音采集数据");
        }

        if (dailyHotspotResult.status === "fulfilled") {
          setDailyHotspotWorkspace(dailyHotspotResult.value);
          setSelectedHotspotDate(dailyHotspotResult.value.selectedDate || getDefaultHotspotDate());
        } else {
          partialFailures.push("每日热点");
        }

        if (feishuBindingResult.status === "fulfilled") {
          setFeishuBinding(feishuBindingResult.value);
          setFeishuBindingForm(createFeishuBindingFormFromRecord(feishuBindingResult.value));
        } else {
          partialFailures.push("飞书绑定");
        }

        if (feishuAppConfigResult.status === "fulfilled") {
          setFeishuAppConfig(feishuAppConfigResult.value);
          setFeishuAppConfigForm(createFeishuAppConfigFormFromRecord(feishuAppConfigResult.value));
        } else {
          partialFailures.push("飞书应用配置");
        }

        if (feishuAuthStatusResult.status === "fulfilled") {
          setFeishuAuthStatus(feishuAuthStatusResult.value);
        } else {
          partialFailures.push("飞书授权状态");
        }

        setLoadedScopes((current) => ({ ...current, collection: true }));
      }

      if (targetScope === "report") {
        const [
          collectionResult,
          reportResult,
          visualReportResult,
          annualMarketingPlanResult,
          xiaohongshuMarketingPlanResult,
          marketingCalendarResult,
        ] = await Promise.allSettled([
          getXiaohongshuCollectionWorkspace(resolvedActiveBrandId),
          getGrowthReportWorkspace(resolvedActiveBrandId),
          getVisualGrowthReportWorkspace(resolvedActiveBrandId),
          getAnnualMarketingPlanWorkspace(resolvedActiveBrandId),
          getXiaohongshuMarketingPlanWorkspace(resolvedActiveBrandId),
          getXiaohongshuMarketingCalendarWorkspace(resolvedActiveBrandId),
        ]);

        if (collectionResult.status === "fulfilled") {
          setCollectionWorkspace(collectionResult.value);
        } else {
          partialFailures.push("小红书收集数据");
        }

        if (reportResult.status === "fulfilled") {
          setReportWorkspace(reportResult.value);
        } else {
          partialFailures.push("品牌增长报告");
        }

        if (visualReportResult.status === "fulfilled") {
          setVisualReportWorkspace(visualReportResult.value);
        } else {
          partialFailures.push("可视化报告");
        }

        if (annualMarketingPlanResult.status === "fulfilled") {
          setAnnualMarketingPlanWorkspace(annualMarketingPlanResult.value);
        } else {
          partialFailures.push("半年营销规划");
        }

        if (xiaohongshuMarketingPlanResult.status === "fulfilled") {
          setXiaohongshuMarketingPlanWorkspace(xiaohongshuMarketingPlanResult.value);
        } else {
          partialFailures.push("小红书营销策划方案");
        }

        if (marketingCalendarResult.status === "fulfilled") {
          setMarketingCalendarWorkspace(marketingCalendarResult.value);
        } else {
          partialFailures.push("营销日历");
        }

        setLoadedScopes((current) => ({ ...current, report: true }));
      }

      setDataSource("api");
      if (partialFailures.length > 0) {
        setErrorMessage(`部分接口暂不可用：${partialFailures.join("、")}。页面保留已获取到的真实数据，不再回退到演示数据。`);
      }
    } catch (error) {
      setDataSource("error");
      const message = error instanceof Error ? error.message : "页面初始化失败";
      if (isAuthFailure(error)) {
        setErrorMessage("登录态已失效，请重新登录后再刷新当前页面。");
      } else if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("fetch failed")) {
        setErrorMessage("后端接口当前不可达，请检查站点 API 服务。页面不会再回退到演示数据。");
      } else {
        setErrorMessage(`页面初始化失败：${message}`);
      }
    } finally {
      setIsHydrating(false);
    }
  }

  async function refreshVisualReportWorkspace(silent = false) {
    try {
      const nextWorkspace = await getVisualGrowthReportWorkspace(archive.brand.id);
      setVisualReportWorkspace(nextWorkspace);
      if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
        setErrorMessage(`生成失败：${nextWorkspace.latestTask.errorMessage}`);
      }
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : "刷新失败";
        setErrorMessage(`刷新可视化报告失败：${message}`);
      }
    }
  }

  async function refreshGrowthReportWorkspace(silent = false) {
    try {
      const nextWorkspace = await getGrowthReportWorkspace(archive.brand.id);
      setReportWorkspace(nextWorkspace);
      if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
        setErrorMessage(`生成失败：${nextWorkspace.latestTask.errorMessage}`);
      }
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : "刷新失败";
        setErrorMessage(`刷新品牌增长报告失败：${message}`);
      }
    }
  }

  async function refreshAnnualMarketingPlanWorkspace(silent = false) {
    try {
      const nextWorkspace = await getAnnualMarketingPlanWorkspace(archive.brand.id);
      setAnnualMarketingPlanWorkspace(nextWorkspace);
      if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
        setErrorMessage(`生成失败：${nextWorkspace.latestTask.errorMessage}`);
      }
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : "刷新失败";
        setErrorMessage(`刷新半年营销规划失败：${message}`);
      }
    }
  }

  async function refreshMarketingCalendarWorkspace(silent = false) {
    try {
      const nextWorkspace = await getXiaohongshuMarketingCalendarWorkspace(archive.brand.id);
      setMarketingCalendarWorkspace(nextWorkspace);
      if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
        setErrorMessage(`生成失败：${nextWorkspace.latestTask.errorMessage}`);
      }
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : "刷新失败";
        setErrorMessage(`刷新营销日历失败：${message}`);
      }
    }
  }

function buildFeishuMediaProxyUrl(sourceUrl?: string, download = false, brandId?: string) {
  if (!sourceUrl) {
    return "";
  }

  try {
    const target = new URL(sourceUrl);
    const isFeishuHost = target.hostname === "open.feishu.cn"
      || target.hostname === "open.larkoffice.com"
      || target.hostname.endsWith(".feishu.cn")
      || target.hostname.endsWith(".larkoffice.com")
      || target.hostname.endsWith(".larksuite.com");
    if (isFeishuHost) {
      if (/\/open-apis\/drive\/v1\/medias\/batch_get_tmp_download_url/i.test(target.pathname)) {
        return "";
      }
      const params = new URLSearchParams({ sourceUrl });
      if (download) {
        params.set("download", "1");
      }
      const resolvedBrandId = brandId || getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID;
      return `${API_BASE_URL}/collectors/xiaohongshu/brands/${resolvedBrandId}/feishu-media?${params.toString()}`;
    }

    if (target.protocol === "http:" || target.protocol === "https:") {
      return sourceUrl;
    }
  } catch {
    return "";
  }

  return "";
}

  async function handleGenerateReport() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.report.growthReport"]?.edit) {
      setErrorMessage("当前账号没有生成品牌增长报告的编辑权限。");
      return;
    }
    if (!canGenerateGrowthReport) {
      setErrorMessage("请先完成小红书平台下 4 项收集数据后，再生成品牌增长报告。");
      return;
    }

    setIsGeneratingReport(true);
    clearMessages();

    try {
      const nextWorkspace = await generateGrowthReport(archive.brand.id);
      setReportWorkspace(nextWorkspace);
      setNotice("已提交品牌增长报告生成任务，正在后台生成。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleSaveReport() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.report.growthReport"]?.edit) {
      setErrorMessage("当前账号没有编辑品牌增长报告的权限。");
      return;
    }
    if (!reportWorkspace.latest?.id) {
      setErrorMessage("请先生成品牌增长报告，再进行保存。");
      return;
    }

    if (!reportMarkdownDraft.trim()) {
      setErrorMessage("报告内容不能为空。");
      return;
    }

    setIsSavingReport(true);
    clearMessages();

    try {
      const nextWorkspace = await updateGrowthReport(reportWorkspace.latest.id, reportMarkdownDraft);
      setReportWorkspace(nextWorkspace);
      setNotice("品牌增长报告已保存。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setIsSavingReport(false);
    }
  }

  async function handleGenerateVisualReport() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.report.visualGrowthReport"]?.edit) {
      setErrorMessage("当前账号没有生成可视化报告的编辑权限。");
      return;
    }
    if (!canGenerateVisualGrowthReport) {
      setErrorMessage("请先生成品牌增长报告，再生成品牌增长可视化报告。");
      return;
    }

    setIsGeneratingVisualReport(true);
    clearMessages();

    try {
      const nextWorkspace = await generateVisualGrowthReport(archive.brand.id);
      setVisualReportWorkspace(nextWorkspace);
      setNotice("已提交可视化报告生成任务，正在后台生成。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGeneratingVisualReport(false);
    }
  }

  async function handleGenerateAnnualMarketingPlan() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.report.halfYearMarketingPlan"]?.edit) {
      setErrorMessage("当前账号没有生成半年营销规划的编辑权限。");
      return;
    }
    if (!canGenerateAnnualMarketingPlan) {
      setErrorMessage("请先生成品牌增长报告，再生成半年营销规划。");
      return;
    }

    setIsGeneratingAnnualMarketingPlan(true);
    clearMessages();

    try {
      const nextWorkspace = await generateAnnualMarketingPlan(archive.brand.id);
      setAnnualMarketingPlanWorkspace(nextWorkspace);
      setNotice("已提交半年营销规划生成任务，正在后台生成。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGeneratingAnnualMarketingPlan(false);
    }
  }

  async function handleGenerateMarketingCalendar() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.calendar"]?.edit) {
      setErrorMessage("当前账号没有营销日历板块的编辑权限。");
      return;
    }
    if (!reportWorkspace.latest) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }
    if (!annualMarketingPlanWorkspace.latest) {
      setErrorMessage("请先生成半年营销规划。");
      return;
    }
    if (!latestMarketingPlan) {
      setErrorMessage("请先生成小红书营销策划方案。");
      return;
    }

    setIsGeneratingMarketingCalendar(true);
    clearMessages();

    try {
      const nextWorkspace = await generateXiaohongshuMarketingCalendar(archive.brand.id);
      setMarketingCalendarWorkspace(nextWorkspace);
      setNotice("已提交后台生成任务，正在生成接下来 7 天营销日历。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGeneratingMarketingCalendar(false);
    }
  }

  function handleOpenCalendarDetail(itemId: string) {
    setSelectedCalendarItemId(itemId);
    const item = calendarAllItems.find((entry) => entry.id === itemId);
    setCalendarItemDraft(item ? cloneMarketingCalendarItem(item) : null);
    setIsEditingCalendarItem(false);
    setIsCalendarDetailOpen(true);
  }

  function handleCloseCalendarDetail() {
    setIsCalendarDetailOpen(false);
    setIsEditingCalendarItem(false);
    setCalendarItemDraft(null);
  }

  function handleStartEditCalendarItem() {
    if (!selectedCalendarItem) {
      return;
    }
    setCalendarItemDraft(cloneMarketingCalendarItem(selectedCalendarItem));
    setIsEditingCalendarItem(true);
  }

  function handleCancelEditCalendarItem() {
    setCalendarItemDraft(selectedCalendarItem ? cloneMarketingCalendarItem(selectedCalendarItem) : null);
    setIsEditingCalendarItem(false);
  }

  function handleCalendarItemFieldChange(
    field:
      | "date"
      | "topicName"
      | "productName"
      | "noteType"
      | "targetAudience"
      | "contentGoal"
      | "expressionFocus"
      | "topicContent"
      | "bodyStructure"
      | "coverFormat"
      | "imageBrief",
    value: string,
  ) {
    setCalendarItemDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function handleCalendarItemListFieldChange(field: "noteKeywords" | "titleDirections" | "coverKeywords", value: string) {
    setCalendarItemDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        [field]: value
          .split(/\n|,|，/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
    });
  }

  async function handleSaveCalendarItem() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.calendar"]?.edit) {
      setErrorMessage("当前账号没有营销日历板块的编辑权限。");
      return;
    }
    if (!latestCalendar || !selectedCalendarItem || !calendarItemDraft) {
      setErrorMessage("当前还没有可保存的营销日历选题。");
      return;
    }

    const nextItems = latestCalendar.items.map((item) =>
      item.id === selectedCalendarItem.id || item.date === selectedCalendarItem.date
        ? normalizeEditableMarketingCalendarItem(calendarItemDraft)
        : item,
    );
    const hasMatchedItem = nextItems.some((item) => item.id === selectedCalendarItem.id || item.date === selectedCalendarItem.date);
    if (!hasMatchedItem) {
      setErrorMessage("当前只支持编辑最新一版营销日历中的选题。");
      return;
    }

    setIsSavingCalendarItem(true);
    clearMessages();
    try {
      const nextWorkspace = await updateXiaohongshuMarketingCalendar(latestCalendar.id, nextItems, latestCalendar.title, archive.brand.id);
      setMarketingCalendarWorkspace(nextWorkspace);
      const nextSelectedItem =
        nextWorkspace.latest?.items.find((item) => item.id === selectedCalendarItem.id || item.date === selectedCalendarItem.date)
        || normalizeEditableMarketingCalendarItem(calendarItemDraft);
      setSelectedCalendarItemId(nextSelectedItem.id);
      setCalendarItemDraft(cloneMarketingCalendarItem(nextSelectedItem));
      setIsEditingCalendarItem(false);
      setNotice("营销日历已保存。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setIsSavingCalendarItem(false);
    }
  }

  async function handleSyncDailyHotspotWorkspace(platformTitles?: string[]) {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.dailyHotspot"]?.edit) {
      setErrorMessage("当前账号没有同步每日热点的编辑权限。");
      return;
    }
    setIsSyncingDailyHotspots(true);
    clearMessages();

    try {
      const response = await syncDailyHotspots(platformTitles, archive.brand.id);
      setDailyHotspotWorkspace(response.workspace);
      setSelectedHotspotDate(response.workspace.selectedDate || getDefaultHotspotDate());
      setNotice(
        response.syncedCount
          ? `每日热点搜索完成，已更新热搜榜结果。`
          : "每日热点搜索已执行，但当前接口返回失败，请检查 API Key 权限或稍后重试。",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "搜索失败";
      setErrorMessage(`每日热点搜索失败：${message}`);
    } finally {
      setIsSyncingDailyHotspots(false);
    }
  }

  async function handleDailyHotspotDateChange(date: string) {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.dailyHotspot"]?.view) {
      setErrorMessage("当前账号没有查看每日热点的权限。");
      return;
    }
    setSelectedHotspotDate(date);
    setIsSyncingDailyHotspots(true);
    clearMessages();

    try {
      const workspace = await getDailyHotspotWorkspace(archive.brand.id, date);
      setDailyHotspotWorkspace(workspace);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取失败";
      setErrorMessage(`热点日期切换失败：${message}`);
    } finally {
      setIsSyncingDailyHotspots(false);
    }
  }

  async function handleSaveFeishuBinding() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.xiaohongshuCollection"]?.edit) {
      setErrorMessage("当前账号没有编辑小红书收集数据的权限。");
      return;
    }
    if (!feishuBindingForm.wikiUrl.trim()) {
      setErrorMessage("请先粘贴飞书副本链接。");
      return;
    }

    setIsSavingFeishuBinding(true);
    clearMessages();

    try {
      const nextBinding = await upsertBrandFeishuBinding(archive.brand.id, {
        wikiUrl: feishuBindingForm.wikiUrl.trim(),
        templateUrl: FEISHU_XHS_TEMPLATE_URL,
      });
      setFeishuBinding(nextBinding);
      setFeishuBindingForm(createFeishuBindingFormFromRecord(nextBinding));
      setNotice("飞书副本链接已保存，后续可直接从飞书同步。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "绑定失败";
      setErrorMessage(`飞书副本绑定失败：${message}`);
    } finally {
      setIsSavingFeishuBinding(false);
    }
  }

  async function handleSaveFeishuAppConfig() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.xiaohongshuCollection"]?.edit) {
      setErrorMessage("当前账号没有编辑小红书收集数据的权限。");
      return;
    }
    if (!feishuAppConfigForm.appId.trim() || !feishuAppConfigForm.appSecret.trim()) {
      setErrorMessage("请先填写当前用户自己的 App ID 和 App Secret。");
      return;
    }

    setIsSavingFeishuAppConfig(true);
    clearMessages();

    try {
      const nextConfig = await upsertFeishuAppConfig({
        appId: feishuAppConfigForm.appId.trim(),
        appSecret: feishuAppConfigForm.appSecret.trim(),
        redirectUri: feishuAppConfigForm.redirectUri.trim() || undefined,
        scope: feishuAppConfigForm.scope.trim() || undefined,
      }, currentUser?.id);
      setFeishuAppConfig(nextConfig);
      setFeishuAppConfigForm(createFeishuAppConfigFormFromRecord(nextConfig));
      const nextStatus = await getFeishuAuthStatus(currentUser?.id).catch(() => null);
      setFeishuAuthStatus(nextStatus);
      setNotice("已保存当前用户自己的飞书开放平台应用配置。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setErrorMessage(`飞书应用配置保存失败：${message}`);
    } finally {
      setIsSavingFeishuAppConfig(false);
    }
  }

  async function handleSyncFeishuWorkspace() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.xiaohongshuCollection"]?.edit) {
      setErrorMessage("当前账号没有同步小红书收集数据的编辑权限。");
      return;
    }
    if (!feishuBinding?.wikiUrl) {
      setErrorMessage("请先绑定飞书多维表格链接。");
      return;
    }
    if (!feishuAuthStatus?.connected) {
      setErrorMessage("请先连接当前用户自己的飞书账号，再执行同步。");
      return;
    }

    setIsSyncingFeishuWorkspace(true);
    clearMessages();

    try {
      const response = await syncXiaohongshuFromFeishu(activeBrandId || archive.brand.id);
      setCollectionWorkspace(response.workspace);
      await loadArchive();
      setCollectionWorkspace((current) => {
        if (!current.benchmarkNotes.length && response.workspace.benchmarkNotes.length) {
          return response.workspace;
        }
        return current;
      });
      const benchmarkTableName = response.matchedTables.benchmarkNotes?.tableName || "未命中";
      const benchmarkSyncedCount = response.syncBreakdown.benchmarkNotes;
      const benchmarkWorkspaceCount = response.workspaceCounts.benchmarkNotes;
      setNotice(
        `飞书同步完成，已更新 ${response.syncedCount} 条结果，命中 ${response.tableCount} 张数据表。对标作品表：${benchmarkTableName}；本次同步 ${benchmarkSyncedCount} 条；当前工作区 ${benchmarkWorkspaceCount} 条。`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步失败";
      setErrorMessage(`飞书同步失败：${message}`);
    } finally {
      setIsSyncingFeishuWorkspace(false);
    }
  }

  async function handleAddBenchmarkNoteToMaterial(assetId: string) {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.xiaohongshuCollection"]?.edit) {
      setErrorMessage("当前账号没有编辑小红书收集数据的权限。");
      return;
    }
    if (!assetId) {
      return;
    }

    setAddingMaterialAssetId(assetId);
    clearMessages();

    try {
      const response = await addBenchmarkNoteToMaterialLibrary(assetId, activeBrandId || archive.brand.id);
      setCollectionWorkspace(response.workspace);
      setNotice("已加入小红书素材库。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "加入素材库失败";
      setErrorMessage(`加入素材库失败：${message}`);
    } finally {
      setAddingMaterialAssetId("");
    }
  }

  async function handleToggleDouyinBenchmarkWorkMaterial(item: DouyinCollectionWorkspace["benchmarkWorks"][number]) {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.douyinCollection"]?.edit) {
      setErrorMessage("当前账号没有编辑抖音收集数据的权限。");
      return;
    }
    if (!item.id) {
      return;
    }

    setAddingMaterialAssetId(item.id);
    clearMessages();

    try {
      const response = item.isInMaterialLibrary
        ? await removeDouyinBenchmarkWorkFromMaterialLibrary(item.id, activeBrandId || archive.brand.id)
        : await addDouyinBenchmarkWorkToMaterialLibrary(item.id, activeBrandId || archive.brand.id);
      setDouyinCollectionWorkspace(response.workspace);
      setNotice(item.isInMaterialLibrary ? "已取消加入抖音素材库。" : "已加入抖音素材库。");
    } catch (error) {
      const message = error instanceof Error ? error.message : item.isInMaterialLibrary ? "取消加入素材库失败" : "加入素材库失败";
      setErrorMessage(item.isInMaterialLibrary ? `取消加入抖音素材库失败：${message}` : `加入抖音素材库失败：${message}`);
    } finally {
      setAddingMaterialAssetId("");
    }
  }

  async function handleSyncDouyinWorkspace() {
    if (!brandPermissionSettings?.currentUserPermissions["brandGrowth.collection.douyinCollection"]?.edit) {
      setErrorMessage("当前账号没有同步收集数据板块的编辑权限。");
      return;
    }

    setIsSyncingDouyinWorkspace(true);
    clearMessages();

    try {
      const payload: DouyinSyncPayload = {
        scope: activeDouyinCollectionCard,
      };
      if (activeDouyinCollectionCard === "brandAccount" || activeDouyinCollectionCard === "brandWorks") {
        payload.brandAccountLinks = parseDouyinSyncLines(douyinSyncForm.brandAccountLinks);
      }
      if (activeDouyinCollectionCard === "competitorAccount") {
        payload.competitorAccountLinks = parseDouyinSyncLines(douyinSyncForm.competitorAccountLinks);
      }
      if (activeDouyinCollectionCard === "benchmarkWorks") {
        payload.benchmarkAwemeIds = parseDouyinSyncLines(douyinSyncForm.benchmarkAwemeIds);
      }
      if (
        activeDouyinCollectionCard === "lowFanExplosiveWorks"
        || activeDouyinCollectionCard === "highCompletionRateWorks"
        || activeDouyinCollectionCard === "highLikeRateWorks"
      ) {
        const selection = douyinSyncForm[activeDouyinCollectionCard];
        const primaryTagId = parseOptionalNumericTagId(selection.primaryTagId);
        const secondaryTagId = parseOptionalNumericTagId(selection.secondaryTagId);
        if (!primaryTagId || !secondaryTagId) {
          setErrorMessage("请先选择一级分类和二级分类后再提交。");
          setIsSyncingDouyinWorkspace(false);
          return;
        }
        payload.contentTagSelection = {
          primaryTagId,
          secondaryTagId,
        };
      }
      if (activeDouyinCollectionCard === "cityHotspots") {
        const cityCode = parseOptionalNumericTagId(douyinSyncForm.cityHotspots.cityCode);
        if (!cityCode) {
          setErrorMessage("请先选择城市后再提交。");
          setIsSyncingDouyinWorkspace(false);
          return;
        }
        payload.cityCode = cityCode;
      }
      const response = await syncDouyinCollectionWorkspace(payload, activeBrandId || archive.brand.id);
      setDouyinCollectionWorkspace(response.workspace);
      const summary =
        `抖音同步完成：品牌账号 ${response.breakdown.brandAccounts} 条，竞品账号 ${response.breakdown.competitorAccounts} 条，` +
        `品牌作品 ${response.breakdown.brandWorks} 条，对标作品 ${response.breakdown.benchmarkWorks} 条，` +
        `低粉爆款榜 ${response.breakdown.lowFanExplosiveWorks} 条，高完播率榜 ${response.breakdown.highCompletionRateWorks} 条，` +
        `高点赞率榜 ${response.breakdown.highLikeRateWorks} 条，同城热点榜 ${response.breakdown.cityHotspots} 条。`;
      const warningText = response.warnings?.filter(Boolean).join("；");
      setNotice(warningText ? `${summary} 部分请求未完全成功：${warningText}` : summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步失败";
      setErrorMessage(`抖音同步失败：${message}`);
    } finally {
      setIsSyncingDouyinWorkspace(false);
    }
  }

  async function handleStartFeishuAuth() {
    clearMessages();

    try {
      const returnUrl = typeof window !== "undefined" ? `${window.location.origin}/brand-growth` : undefined;
      const response = await startFeishuAuth(currentUser?.id, returnUrl);
      if (!response.configured || !response.authorizeUrl) {
        setErrorMessage(response.message || "请先配置当前用户自己的飞书开放平台应用。");
        return;
      }
      if (typeof window !== "undefined") {
        window.location.href = response.authorizeUrl;
        return;
      }
      setNotice(response.message || "已生成飞书授权地址。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "发起授权失败";
      setErrorMessage(`连接飞书失败：${message}`);
    }
  }

  function updateBackground<K extends keyof BrandBackground>(key: K, value: BrandBackground[K]) {
    setArchive((current) => ({
      ...current,
      brand: { ...current.brand, [key]: value },
    }));
  }

  function updateProduct(index: number, key: keyof BrandProduct, value: string | number) {
    setArchive((current) => {
      const next = [...current.products];
      next[index] = { ...next[index], [key]: value };
      return { ...current, products: next };
    });
  }

  async function handleUploadProductImage(productId: string, file?: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("请上传图片格式文件。");
      return;
    }

    setUploadingProductId(productId);
    clearMessages();

    try {
      const uploaded = await uploadBrandProductImage(archive.brand.id, file);
      setArchive((current) => ({
        ...current,
        products: current.products.map((item) => (
          item.id === productId ? { ...item, imageUrl: uploaded.imageUrl } : item
        )),
      }));
      setNotice("产品图片上传成功，请继续保存页面。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      setErrorMessage(`产品图片上传失败：${message}`);
    } finally {
      setUploadingProductId("");
    }
  }

  function updateSurvey(key: string, value: string) {
    setArchive((current) => {
      const next = [...current.survey];
      const targetIndex = next.findIndex((item) => item.key === key);
      if (targetIndex < 0) {
        return current;
      }
      next[targetIndex] = { ...next[targetIndex], value };
      return { ...current, survey: next };
    });
  }

  function removeProduct(productId: string) {
    setArchive((current) => ({
      ...current,
      products: current.products.filter((item) => item.id !== productId),
    }));

    if (!productId.startsWith("prd_local_")) {
      setRemovedProductIds((current) => [...current, productId]);
    }
  }

  function clearMessages() {
    setNotice("");
    setErrorMessage("");
  }

  async function uploadAssetDraftFile(draft: LibraryAssetModalDraft) {
    if (!draft.file) {
      return draft.fileUrl.trim();
    }
    const uploaded = await uploadBrandAssetFile(archive.brand.id, draft.file);
    return uploaded.fileUrl;
  }

  async function persistBusinessAssets(nextItems: BrandAsset[], successMessage: string) {
    await replaceBrandAssets(
      archive.brand.id,
      "business-assets",
      nextItems.map((item) => buildBrandAssetPayload(item)),
    );
    await loadArchive();
    setNotice(successMessage);
  }

  async function handleCreateAssets(target: LibraryAssetTarget, drafts: LibraryAssetModalDraft[]) {
    clearMessages();

    try {
      const resolvedAssets = await Promise.all(
        drafts.map(async (draft) => {
          const fileUrl = await uploadAssetDraftFile(draft);
          return emptyAsset(buildAssetFromDraft(draft, fileUrl));
        }),
      );

      if (target === "businessAssets") {
        await persistBusinessAssets(
          [...archive.businessAssets, ...resolvedAssets],
          `已新增 ${resolvedAssets.length} 份资料，并开始同步知识库。`,
        );
        return;
      }

      setArchive((current) => ({
        ...current,
        [target]: [...current[target], ...resolvedAssets],
      }));
      setNotice(`已新增 ${resolvedAssets.length} 份资料，请继续保存页面。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "资料上传失败";
      setErrorMessage(`新增资料失败：${message}`);
      throw error;
    }
  }

  async function handleSaveAssetEdit(target: LibraryAssetTarget, index: number, draft: LibraryAssetModalDraft) {
    clearMessages();

    try {
      const fileUrl = draft.file ? await uploadAssetDraftFile(draft) : draft.fileUrl.trim();
      if (target === "businessAssets") {
        const nextItems = [...archive.businessAssets];
        nextItems[index] = buildAssetFromDraft(draft, fileUrl, nextItems[index]);
        await persistBusinessAssets(nextItems, "资料已更新，并重跑当前知识库容器同步。");
        return;
      }

      setArchive((current) => {
        const next = [...current[target]];
        next[index] = buildAssetFromDraft(draft, fileUrl, next[index]);
        return { ...current, [target]: next };
      });
      setNotice("资料已更新，请继续保存页面。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "资料更新失败";
      setErrorMessage(`资料更新失败：${message}`);
      throw error;
    }
  }

  function handleRemoveAsset(target: LibraryAssetTarget, index: number) {
    clearMessages();
    if (target === "businessAssets") {
      const nextItems = archive.businessAssets.filter((_, itemIndex) => itemIndex !== index);
      void persistBusinessAssets(nextItems, "资料已移除，并同步更新知识库容器。").catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "资料移除失败";
        setErrorMessage(`资料移除失败：${message}`);
      });
      return;
    }
    setArchive((current) => ({
      ...current,
      [target]: current[target].filter((_, itemIndex) => itemIndex !== index),
    }));
    setNotice("资料已移除，请继续保存页面。");
  }

  function switchSection(sectionKey: StrategySectionKey) {
    const targetSection = strategySections.find((item) => item.key === sectionKey) ?? strategySections[0];
    setActiveSection(targetSection.key);
    setActivePage(targetSection.pages[0]?.key ?? "background");
    setActiveXhsCollectionCard("brandAccount");
    setActiveDouyinCollectionCard("brandAccount");
  }

  function switchPage(pageKey: StrategyPageKey) {
    setActivePage(pageKey);
    if (pageKey !== "xiaohongshuCollection") {
      setActiveXhsCollectionCard("brandAccount");
    }
    if (pageKey !== "douyinCollection") {
      setActiveDouyinCollectionCard("brandAccount");
    }
  }

  async function saveActivePage() {
    if (!activeBrandPage) {
      return;
    }
    if (!brandPermissionSettings?.currentUserPermissions[strategyPagePermissionMap[activeBrandPage]]?.edit) {
      setErrorMessage("当前账号没有编辑当前页面的权限。");
      return;
    }

    setIsSaving(true);
    clearMessages();

    try {
      if (activeBrandPage === "background") {
        await updateBrandBackground(archive.brand.id, {
          brandName: archive.brand.brandName,
          industry: archive.brand.industry,
          storeCount: archive.brand.storeCount,
          foundedYear: archive.brand.foundedYear,
          brandDescription: archive.brand.brandDescription,
          enterpriseIntro: archive.brand.enterpriseIntro,
        });
      }

      if (activeBrandPage === "products") {
        for (const productId of removedProductIds) {
          await deleteBrandProduct(archive.brand.id, productId);
        }

        for (const product of archive.products) {
          const payload = {
            productName: product.productName,
            productType: product.productType,
            price: Number(product.price || 0),
            productPositioning: product.productPositioning,
            targetAudience: product.targetAudience,
            painPoint: product.painPoint,
            usageScenario: product.usageScenario,
            differentiators: product.differentiators,
            marketPosition: product.marketPosition,
            detailDescription: product.detailDescription,
            imageUrl: product.imageUrl,
          };

          if (product.id.startsWith("prd_local_")) {
            await createBrandProduct(archive.brand.id, payload);
          } else {
            await updateBrandProduct(archive.brand.id, product.id, payload);
          }
        }
      }

      if (activeBrandPage === "survey") {
        await replaceBrandSurvey(archive.brand.id, archive.survey.map((item) => ({
          key: item.key,
          label: item.label,
          value: item.value,
        })));
      }

      if (activeBrandPage === "industryFeeds" || activeBrandPage === "businessAssets") {
        await replaceBrandAssets(
          archive.brand.id,
          activeBrandPage === "industryFeeds" ? "industry-feeds" : "business-assets",
          archive[activeBrandPage].map((item) => buildBrandAssetPayload(item)),
        );
      }

      await loadArchive();
      const currentStepName = archive.steps.find((step) => step.key === activeBrandPage)?.name ?? "当前页面";
      const currentIndex = stepOrder.indexOf(activeBrandPage);
      const nextStep = currentIndex >= 0 ? stepOrder[currentIndex + 1] : undefined;
      if ((activeBrandPage === "products" || activeBrandPage === "survey") && nextStep) {
        switchPage(nextStep);
        setNotice(`已保存：${currentStepName}，已进入下一步`);
      } else {
        setNotice(`已保存：${currentStepName}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  function renderLibraryPage() {
    if (!isLibraryPageKey(activeBrandPage)) {
      return null;
    }

    return (
      <BrandGrowthLibraryWorkspace
        activeBrandPage={activeBrandPage}
        activeStepName={activeStepMeta?.name}
        activeStepStatus={activeStepMeta?.status ?? "pending"}
        archive={archive}
        statusText={getBrandArchiveStatusText}
        onUpdateBackground={updateBackground}
        onAddProduct={() => setArchive((current) => ({ ...current, products: [...current.products, emptyProduct()] }))}
        onUpdateProduct={updateProduct}
        onRemoveProduct={removeProduct}
        onUploadProductImage={handleUploadProductImage}
        uploadingProductId={uploadingProductId}
        onUpdateSurvey={updateSurvey}
        onCreateAssets={handleCreateAssets}
        onSaveAssetEdit={handleSaveAssetEdit}
        onRemoveAsset={handleRemoveAsset}
      />
    );
  }

  function renderCollectionPage() {
    return (
      <BrandGrowthCollectionWorkspace
        activePage={
          activePage === "dailyHotspot"
            ? "dailyHotspot"
            : activePage === "douyinCollection"
              ? "douyinCollection"
              : activePage === "xiaohongshuCollection"
                ? "xiaohongshuCollection"
                : "feishuCollection"
        }
        pageTitle={currentPage.label}
        pageDescription={currentPage.description}
        dataSource={dataSource}
        notice={notice}
        errorMessage={errorMessage}
        onRefreshData={() => void loadArchive()}
        templateUrl={FEISHU_XHS_TEMPLATE_URL}
        activeXhsCollectionCard={activeXhsCollectionCard}
        onXhsCollectionCardChange={setActiveXhsCollectionCard}
        activeDouyinCollectionCard={activeDouyinCollectionCard}
        onDouyinCollectionCardChange={setActiveDouyinCollectionCard}
        feishuBinding={feishuBinding}
        feishuAppConfig={feishuAppConfig}
        feishuAuthStatus={feishuAuthStatus}
        feishuBindingForm={feishuBindingForm}
        setFeishuBindingForm={setFeishuBindingForm}
        feishuAppConfigForm={feishuAppConfigForm}
        setFeishuAppConfigForm={setFeishuAppConfigForm}
        canSyncFeishuWorkspace={canSyncFeishuWorkspace}
        isHydrating={isHydrating}
        isSavingFeishuAppConfig={isSavingFeishuAppConfig}
        isSavingFeishuBinding={isSavingFeishuBinding}
        isSyncingFeishuWorkspace={isSyncingFeishuWorkspace}
        douyinWorkspace={douyinCollectionWorkspace}
        isSyncingDouyinWorkspace={isSyncingDouyinWorkspace}
        douyinSyncForm={douyinSyncForm}
        setDouyinSyncForm={setDouyinSyncForm}
        onSaveFeishuAppConfig={handleSaveFeishuAppConfig}
        onStartFeishuAuth={handleStartFeishuAuth}
        onSaveFeishuBinding={handleSaveFeishuBinding}
        onSyncFeishuWorkspace={handleSyncFeishuWorkspace}
        onSyncDouyinWorkspace={handleSyncDouyinWorkspace}
        sortedBrandAccounts={sortedBrandAccounts}
        sortedCompetitorAccounts={sortedCompetitorAccounts}
        sortedBrandNotes={sortedBrandNotes}
        sortedBenchmarkNotes={sortedBenchmarkNotes}
        sortedDouyinBrandAccounts={sortedDouyinBrandAccounts}
        sortedDouyinCompetitorAccounts={sortedDouyinCompetitorAccounts}
        sortedDouyinBrandWorks={sortedDouyinBrandWorks}
        sortedDouyinBenchmarkWorks={sortedDouyinBenchmarkWorks}
        sortedDouyinLowFanExplosiveWorks={sortedDouyinLowFanExplosiveWorks}
        sortedDouyinHighCompletionRateWorks={sortedDouyinHighCompletionRateWorks}
        sortedDouyinHighLikeRateWorks={sortedDouyinHighLikeRateWorks}
        sortedDouyinCityHotspots={sortedDouyinCityHotspots}
        brandNotesPage={brandNotesPage}
        setBrandNotesPage={setBrandNotesPage}
        brandNotesPageCount={brandNotesPageCount}
        brandNotesPageSize={brandNotesPageSize}
        setBrandNotesPageSize={setBrandNotesPageSize}
        paginatedBrandNotes={paginatedBrandNotes}
        addingMaterialAssetId={addingMaterialAssetId}
        onAddBenchmarkNoteToMaterial={handleAddBenchmarkNoteToMaterial}
        onAddDouyinBenchmarkWorkToMaterial={handleToggleDouyinBenchmarkWorkMaterial}
        onPreviewMedia={setMediaPreview}
        buildFeishuMediaProxyUrl={(sourceUrl, download) => buildFeishuMediaProxyUrl(sourceUrl, download, activeBrandId || archive.brand.id)}
        formatDateTime={formatDateTime}
        formatDateLabel={formatDateLabel}
        formatCount={formatCount}
        formatMetric={formatMetric}
        selectedHotspotDate={selectedHotspotDate}
        hotspotAvailableDates={hotspotAvailableDates}
        activeHotspotRecord={activeHotspotRecord}
        sortedHotspotItems={sortedHotspotItems}
        paginatedHotspotItems={paginatedHotspotItems}
        hotspotPage={hotspotPage}
        setHotspotPage={setHotspotPage}
        hotspotPageCount={hotspotPageCount}
        hotspotPageSize={hotspotPageSize}
        setHotspotPageSize={setHotspotPageSize}
        isSyncingDailyHotspots={isSyncingDailyHotspots}
        onDailyHotspotDateChange={handleDailyHotspotDateChange}
        onSyncDailyHotspots={handleSyncDailyHotspotWorkspace}
        formatHotspotHeat={formatHotspotHeat}
      />
    );
  }

  function renderReportPage() {
    if (activePage === "xiaohongshuMarketingCalendar") {
      return (
        <CalendarWorkspace
          sectionLabel={currentPage.label}
          sectionDescription={currentPage.description}
          isLoading={isHydrating}
          isPublishing={false}
          isGeneratingCalendar={isGeneratingMarketingCalendar}
          canGenerateCalendar={canGenerateMarketingCalendar}
          isCalendarTaskActive={isMarketingCalendarTaskActive}
          latestCalendar={latestCalendar}
          latestCalendarTask={latestCalendarTask}
          calendarTaskStatusText={calendarTaskStatusText}
          calendarInlineError={calendarInlineError}
          calendarAllItems={calendarAllItems}
          isCalendarDetailOpen={isCalendarDetailOpen}
          selectedCalendarItem={selectedCalendarItem}
          calendarItemDraft={calendarItemDraft}
          isEditingCalendarItem={isEditingCalendarItem}
          isSavingCalendarItem={isSavingCalendarItem}
          onRefresh={() => refreshMarketingCalendarWorkspace()}
          onGenerate={() => handleGenerateMarketingCalendar()}
          onOpenDetail={handleOpenCalendarDetail}
          onCloseDetail={handleCloseCalendarDetail}
          onStartEditDetail={handleStartEditCalendarItem}
          onCancelEditDetail={handleCancelEditCalendarItem}
          onSaveDetail={() => handleSaveCalendarItem()}
          onDetailFieldChange={handleCalendarItemFieldChange}
          onDetailListFieldChange={handleCalendarItemListFieldChange}
          getTaskStatusClass={getReportTaskStatusClass}
          formatDateTime={formatDateTime}
          formatCalendarMonthDay={formatCalendarMonthDay}
          formatCalendarWeekday={formatCalendarWeekday}
          getCalendarFestivalLabel={getCalendarFestivalLabel}
          formatCalendarDate={formatCalendarDate}
          formatCalendarOptionalValue={formatCalendarOptionalValue}
          formatCalendarListValue={formatCalendarListValue}
        />
      );
    }

    const latestReport = reportWorkspace.latest;
    const latestVisualReport = visualReportWorkspace.latest;
    const latestPlan = annualMarketingPlanWorkspace.latest;
    const previewHtml = renderMarkdownToHtml(reportMarkdownDraft || latestReport?.reportMarkdown || "");
    const previewDocument = buildVisualReportPreviewDocument(
      latestVisualReport?.title || "品牌增长可视化报告",
      latestVisualReport?.htmlBody || "",
    );
    const growthTaskStatusText = getReportTaskStatusText(latestGrowthTask?.taskStatus);
    const visualTaskStatusText = getReportTaskStatusText(latestVisualTask?.taskStatus);
    const annualTaskStatusText = getReportTaskStatusText(latestAnnualMarketingTask?.taskStatus);

    return (
      <BrandGrowthReportWorkspace
        activePage={activePage === "growthReport" ? "growthReport" : activePage === "visualGrowthReport" ? "visualGrowthReport" : "annualMarketingPlan"}
        reportWorkspace={reportWorkspace}
        visualReportWorkspace={visualReportWorkspace}
        annualMarketingPlanWorkspace={annualMarketingPlanWorkspace}
        reportMarkdownDraft={reportMarkdownDraft}
        onReportMarkdownDraftChange={setReportMarkdownDraft}
        previewHtml={previewHtml}
        previewDocument={previewDocument}
        growthTaskStatusText={growthTaskStatusText}
        visualTaskStatusText={visualTaskStatusText}
        annualTaskStatusText={annualTaskStatusText}
        previewRows={latestPlan?.items ?? []}
        isHydrating={isHydrating}
        isGeneratingReport={isGeneratingReport}
        isGeneratingVisualReport={isGeneratingVisualReport}
        isGrowthReportTaskActive={isGrowthReportTaskActive}
        isVisualReportTaskActive={isVisualReportTaskActive}
        isAnnualMarketingPlanTaskActive={isAnnualMarketingPlanTaskActive}
        onGenerateReport={handleGenerateReport}
        formatDateTime={formatDateTime}
      />
    );
  }

  function renderPrimaryAction() {
    if (activeBrandPage) {
      return (
        <button type="button" className="primary-button" onClick={() => void saveActivePage()} disabled={isSaving || isHydrating || !hasCurrentPageEditPermission}>
          {isSaving ? "保存中..." : activeBrandPage === "products" || activeBrandPage === "survey" ? "保存并下一步" : "保存页面"}
        </button>
      );
    }

    if (activePage === "feishuCollection") {
      return (
        <a href={FEISHU_XHS_TEMPLATE_URL} target="_blank" rel="noreferrer" className="primary-button">
          打开模板
        </a>
      );
    }

    if (activePage === "dailyHotspot") {
      return null;
    }

    if (activeSection === "collection") {
      return null;
    }

    if (activePage === "growthReport") {
      if (isGrowthReportTaskActive) {
        return (
          <button type="button" className="primary-button" disabled>
            {latestGrowthTask?.taskStatus === "QUEUED" ? "排队中..." : "生成中..."}
          </button>
        );
      }
      if (reportWorkspace.latest) {
        return (
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleSaveReport()}
            disabled={isSavingReport || isHydrating || !hasCurrentPageEditPermission}
          >
            {isSavingReport ? "保存中..." : "保存报告"}
          </button>
        );
      }
      return (
        <button
          type="button"
          className="primary-button"
          onClick={() => void handleGenerateReport()}
          disabled={isGeneratingReport || isHydrating || !canGenerateGrowthReport || !hasCurrentPageEditPermission}
        >
          {isGeneratingReport ? "生成中..." : "生成报告"}
        </button>
      );
    }

    if (activePage === "visualGrowthReport") {
      if (!reportWorkspace.latest) {
        return (
          <button type="button" className="primary-button" disabled>
            请先生成品牌增长报告
          </button>
        );
      }
      return (
        <button
          type="button"
          className="primary-button"
          onClick={() => void handleGenerateVisualReport()}
          disabled={isGeneratingVisualReport || isHydrating || !canGenerateVisualGrowthReport || isVisualReportTaskActive || !hasCurrentPageEditPermission}
        >
          {isGeneratingVisualReport ? "提交中..." : isVisualReportTaskActive ? "生成中..." : "生成可视化报告"}
        </button>
      );
    }

    if (activePage === "xiaohongshuMarketingCalendar") {
      return null;
    }

    if (!reportWorkspace.latest) {
      return (
        <button type="button" className="primary-button" disabled>
          请先生成品牌增长报告
        </button>
      );
    }

    return (
      <button
        type="button"
        className="primary-button"
        onClick={() => void handleGenerateAnnualMarketingPlan()}
        disabled={isGeneratingAnnualMarketingPlan || isHydrating || !canGenerateAnnualMarketingPlan || isAnnualMarketingPlanTaskActive || !hasCurrentPageEditPermission}
      >
        {isGeneratingAnnualMarketingPlan ? "提交中..." : isAnnualMarketingPlanTaskActive ? "生成中..." : "生成规划"}
      </button>
    );
  }

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <aside className="strategy-level-panel strategy-level-panel--directory">
          <div className="strategy-level-button-list">
            {visibleStrategySections.map((section) => (
              <button
                key={section.key}
                type="button"
                className={`strategy-level-button ${section.key === activeSection ? "is-active" : ""}`}
                onClick={() => switchSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>

        <aside className="strategy-level-panel strategy-level-panel--directory strategy-level-panel--tertiary">
          <div className="strategy-level-button-list">
            {currentSection.pages.map((page) => (
              <button
                key={page.key}
                type="button"
                className={`strategy-level-button ${page.key === activePage ? "is-active" : ""}`}
                onClick={() => switchPage(page.key)}
              >
                {page.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="strategy-content-panel">
        {!hasOwnerAccess ? (
          <article className="workspace-panel strategy-page-header">
            <div>
              <strong>当前无权限进入品牌增长策略</strong>
              <p>当前账号未获得品牌增长策略的查看权限；请联系管理员在团队权限设置中为对应板块勾选可见权限。</p>
            </div>
            <div className="strategy-page-header-actions">
              <div className="workspace-status">
                <span className="archive-pill status-pending">{currentBrandRole || "无团队角色"}</span>
                {!isHydrating && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
              </div>
              <div className="strategy-inline-actions">
                <a href="/xiaohongshu" className="primary-button">前往小红书</a>
                <a href="/personal-center" className="secondary-button">返回个人中心</a>
              </div>
            </div>
          </article>
        ) : activeSection === "collection" ? null : (
          <article className="workspace-panel strategy-page-header">
            <div>
              <strong>{currentPage.label}</strong>
              <p>{currentPage.description}</p>
            </div>
            <div className="strategy-page-header-actions">
              <div className="workspace-status">
                <span
                  className={`archive-pill ${
                    dataSource === "api" ? "status-ready" : dataSource === "loading" ? "status-in_progress" : "status-pending"
                  }`}
                >
                  {dataSource === "api" ? "接口数据" : dataSource === "loading" ? "加载中" : "接口异常"}
                </span>
                {isHydrating ? <span className="status-text">正在加载品牌增长策略数据...</span> : null}
                {!isHydrating && notice ? <span className="status-text success-text">{notice}</span> : null}
                {!isHydrating && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
              </div>
              <div className="strategy-inline-actions">
                <button type="button" className="secondary-button" onClick={() => void loadArchive()} disabled={isHydrating || isSaving}>
                  刷新数据
                </button>
                {renderPrimaryAction()}
              </div>
            </div>
          </article>
        )}

        {hasOwnerAccess ? (activeBrandPage ? renderLibraryPage() : activeSection === "collection" ? renderCollectionPage() : renderReportPage()) : null}
        </section>
      </section>
      {mediaPreview ? (
        <div className="media-preview-overlay" role="dialog" aria-modal="true" onClick={() => setMediaPreview(null)}>
          <div className="media-preview-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={() => setMediaPreview(null)}>
              关闭
            </button>
            <img src={mediaPreview.url} alt={mediaPreview.title} className="media-preview-image" />
            <div className="media-preview-footer">
              <span>{mediaPreview.title}</span>
              <a href={mediaPreview.url} target="_blank" rel="noreferrer" className="note-data-link">
                新窗口打开
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function cloneMarketingCalendarItem(item: XiaohongshuMarketingCalendarItem): XiaohongshuMarketingCalendarItem {
  return {
    ...item,
    noteKeywords: [...(item.noteKeywords || [])],
    titleDirections: [...(item.titleDirections || [])],
    coverKeywords: [...(item.coverKeywords || [])],
  };
}

function normalizeEditableMarketingCalendarItem(item: XiaohongshuMarketingCalendarItem): XiaohongshuMarketingCalendarItem {
  return {
    ...item,
    date: item.date.trim(),
    topicName: item.topicName.trim(),
    productName: item.productName?.trim() || "",
    noteType: item.noteType?.trim() || "",
    targetAudience: item.targetAudience?.trim() || "",
    contentGoal: item.contentGoal?.trim() || "",
    expressionFocus: item.expressionFocus?.trim() || "",
    topicContent: item.topicContent?.trim() || "",
    bodyStructure: item.bodyStructure?.trim() || "",
    coverFormat: item.coverFormat?.trim() || "",
    imageBrief: item.imageBrief?.trim() || "",
    noteKeywords: normalizeCalendarItemList(item.noteKeywords),
    titleDirections: normalizeCalendarItemList(item.titleDirections),
    coverKeywords: normalizeCalendarItemList(item.coverKeywords),
  };
}

function normalizeCalendarItemList(items?: string[]) {
  return (items || []).map((item) => item.trim()).filter(Boolean);
}

function getReportTaskStatusClass(status?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED") {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "FAILED" || status === "CANCELLED") {
    return "status-pending";
  }
  if (status === "QUEUED" || status === "RUNNING" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}
