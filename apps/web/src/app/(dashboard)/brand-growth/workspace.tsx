"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { getMe } from "../../../services/auth";
import {
  BrandGrowthCollectionWorkspace,
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
import { BrandGrowthLibraryWorkspace } from "./library-workspace";
import {
  buildVisualReportPreviewDocument,
  renderMarkdownToHtml,
} from "./markdown-render";
import { BrandGrowthReportWorkspace } from "./report-workspace";
import type {
  BrandGrowthLibraryPageKey,
  MediaPreviewState,
} from "./shared-types";
import {
  getBrandArchiveStatusText,
  getReportTaskStatusText,
} from "./task-status-helpers";
import {
  addBenchmarkNoteToMaterialLibrary,
  getXiaohongshuCollectionWorkspace,
  syncXiaohongshuFromFeishu,
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
  getVisualGrowthReportWorkspace,
  updateGrowthReport,
  type AnnualMarketingPlanWorkspace,
  type GrowthReportWorkspace,
  type VisualGrowthReportWorkspace,
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
  | "xiaohongshuCollection"
  | "dailyHotspot"
  | "growthReport"
  | "visualGrowthReport"
  | "annualMarketingPlan";

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
      { key: "businessAssets", label: "企业经营数据", description: "归集经营报表、业务系统和门店数据。" },
    ],
  },
  {
    key: "collection",
    label: "收集数据",
    pages: [
      { key: "xiaohongshuCollection", label: "小红书平台", description: "通过飞书多维表格填写主页链接、借助插件收集并同步小红书数据。" },
      { key: "dailyHotspot", label: "每日热点", description: "查看热点主题、平台趋势和当天建议动作。" },
    ],
  },
  {
    key: "report",
    label: "品牌增长报告",
    pages: [
      { key: "growthReport", label: "生成品牌增长报告", description: "根据品牌资料与收集数据生成分析报告。" },
      { key: "visualGrowthReport", label: "品牌增长可视化报告", description: "输出图表化的品牌增长可视化结果。" },
      { key: "annualMarketingPlan", label: "全年营销规划", description: "形成季度节奏、战役安排与年度规划。" },
    ],
  },
];

const FEISHU_XHS_TEMPLATE_URL = "https://my.feishu.cn/wiki/Zqv9wiSNIiwGxVkCYwpcHOFUnEd?from=from_copylink";

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

function emptyAsset(): BrandAsset {
  return {
    id: `ast_local_${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    description: "",
    sourceName: "",
    fileUrl: "",
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

export function BrandGrowthWorkspace() {
  const [archive, setArchive] = useState<BrandArchiveBundle>(createEmptyArchiveBundle);
  const [collectionWorkspace, setCollectionWorkspace] = useState<XhsCollectionWorkspace>(createEmptyCollectionWorkspace);
  const [dailyHotspotWorkspace, setDailyHotspotWorkspace] = useState<DailyHotspotWorkspace>(createEmptyDailyHotspotWorkspace);
  const [reportWorkspace, setReportWorkspace] = useState<GrowthReportWorkspace>(createEmptyGrowthReportWorkspace);
  const [visualReportWorkspace, setVisualReportWorkspace] = useState<VisualGrowthReportWorkspace>(createEmptyVisualGrowthReportWorkspace);
  const [annualMarketingPlanWorkspace, setAnnualMarketingPlanWorkspace] = useState<AnnualMarketingPlanWorkspace>(createEmptyAnnualMarketingPlanWorkspace);
  const [feishuBinding, setFeishuBinding] = useState<FeishuBindingRecord | null>(null);
  const [feishuAppConfig, setFeishuAppConfig] = useState<FeishuAppConfigRecord | null>(null);
  const [feishuAuthStatus, setFeishuAuthStatus] = useState<FeishuAuthStatusRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [activeBrandId, setActiveBrandId] = useState<string>(DEMO_BRAND_ID);
  const [feishuBindingForm, setFeishuBindingForm] = useState(createEmptyFeishuBindingForm);
  const [feishuAppConfigForm, setFeishuAppConfigForm] = useState(createEmptyFeishuAppConfigForm);
  const [brandNotesPage, setBrandNotesPage] = useState(1);
  const [brandNotesPageSize, setBrandNotesPageSize] = useState(10);
  const [hotspotPage, setHotspotPage] = useState(1);
  const [hotspotPageSize, setHotspotPageSize] = useState(10);
  const [activeSection, setActiveSection] = useState<StrategySectionKey>("library");
  const [activePage, setActivePage] = useState<StrategyPageKey>("background");
  const [activeXhsCollectionCard, setActiveXhsCollectionCard] = useState<XiaohongshuCollectionCardKey>("brandAccount");
  const [selectedHotspotDate, setSelectedHotspotDate] = useState(getDefaultHotspotDate);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingFeishuAppConfig, setIsSavingFeishuAppConfig] = useState(false);
  const [isSavingFeishuBinding, setIsSavingFeishuBinding] = useState(false);
  const [isSyncingFeishuWorkspace, setIsSyncingFeishuWorkspace] = useState(false);
  const [isSyncingDailyHotspots, setIsSyncingDailyHotspots] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isGeneratingVisualReport, setIsGeneratingVisualReport] = useState(false);
  const [isGeneratingAnnualMarketingPlan, setIsGeneratingAnnualMarketingPlan] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState("");
  const [uploadingAssetKey, setUploadingAssetKey] = useState("");
  const [addingMaterialAssetId, setAddingMaterialAssetId] = useState("");
  const [notice, setNotice] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [reportMarkdownDraft, setReportMarkdownDraft] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "error" | "loading">("loading");
  const [removedProductIds, setRemovedProductIds] = useState<string[]>([]);
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewState | null>(null);
  const completion = useMemo(() => getCompletion(archive), [archive]);
  const currentSection = strategySections.find((item) => item.key === activeSection) ?? strategySections[0];
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
  const latestVisualTask = visualReportWorkspace.latestTask;
  const latestAnnualMarketingTask = annualMarketingPlanWorkspace.latestTask;
  const isVisualReportTaskActive = latestVisualTask?.taskStatus === "QUEUED" || latestVisualTask?.taskStatus === "RUNNING";
  const isAnnualMarketingPlanTaskActive =
    latestAnnualMarketingTask?.taskStatus === "QUEUED" || latestAnnualMarketingTask?.taskStatus === "RUNNING";
  const canSyncFeishuWorkspace = Boolean(feishuBinding?.wikiUrl) && Boolean(feishuAuthStatus?.connected);
  useEffect(() => {
    if (dailyHotspotWorkspace.selectedDate && dailyHotspotWorkspace.selectedDate !== selectedHotspotDate) {
      setSelectedHotspotDate(dailyHotspotWorkspace.selectedDate);
    }
  }, [dailyHotspotWorkspace.selectedDate, selectedHotspotDate]);

  useEffect(() => {
    void loadArchive();
  }, []);

  async function resolveActiveBrandId(fallbackBrandId: string) {
    const me = await getMe().catch(() => null);
    return me?.currentBrandId || me?.brands?.[0]?.id || getStoredCurrentBrandId(fallbackBrandId) || fallbackBrandId;
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
    void loadArchive();
  }, []);

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

  async function loadArchive() {
    setIsHydrating(true);
    setErrorMessage("");
    setDataSource("loading");

    try {
      const activeBrandId = await resolveActiveBrandId(archive.brand.id);
      setActiveBrandId(activeBrandId);
      const currentProfile = await getCurrentUserProfile().catch(() => null);
      const [
        archiveResult,
        collectionResult,
        dailyHotspotResult,
        reportResult,
        visualReportResult,
        annualMarketingPlanResult,
        feishuBindingResult,
        feishuAppConfigResult,
        feishuAuthStatusResult,
      ] = await Promise.allSettled([
        getBrandArchive(activeBrandId),
        getXiaohongshuCollectionWorkspace(activeBrandId),
        getDailyHotspotWorkspace(activeBrandId),
        getGrowthReportWorkspace(activeBrandId),
        getVisualGrowthReportWorkspace(activeBrandId),
        getAnnualMarketingPlanWorkspace(activeBrandId),
        getBrandFeishuBinding(activeBrandId),
        getFeishuAppConfig(currentProfile?.id),
        getFeishuAuthStatus(currentProfile?.id),
      ]);

      if (archiveResult.status !== "fulfilled") {
        throw archiveResult.reason;
      }

      const partialFailures: string[] = [];
      setCurrentUser(currentProfile);
      setArchive(normalizeBrandArchiveBundle(archiveResult.value));

      if (collectionResult.status === "fulfilled") {
        setCollectionWorkspace(collectionResult.value);
      } else {
        partialFailures.push("小红书收集数据");
      }

      if (dailyHotspotResult.status === "fulfilled") {
        setDailyHotspotWorkspace(dailyHotspotResult.value);
        setSelectedHotspotDate(dailyHotspotResult.value.selectedDate || getDefaultHotspotDate());
      } else {
        partialFailures.push("每日热点");
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
        partialFailures.push("全年营销规划");
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

      setDataSource("api");
      setRemovedProductIds([]);
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
        setErrorMessage(`刷新全年营销规划失败：${message}`);
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
    if (!canGenerateGrowthReport) {
      setErrorMessage("请先完成小红书平台下 4 项收集数据后，再生成品牌增长报告。");
      return;
    }

    setIsGeneratingReport(true);
    clearMessages();

    try {
      const nextWorkspace = await generateGrowthReport(archive.brand.id);
      setReportWorkspace(nextWorkspace);
      setNotice("品牌增长报告已生成，并已写入任务与产物记录。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleSaveReport() {
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
    if (!canGenerateAnnualMarketingPlan) {
      setErrorMessage("请先生成品牌增长报告，再生成全年营销规划。");
      return;
    }

    setIsGeneratingAnnualMarketingPlan(true);
    clearMessages();

    try {
      const nextWorkspace = await generateAnnualMarketingPlan(archive.brand.id);
      setAnnualMarketingPlanWorkspace(nextWorkspace);
      setNotice("已提交全年营销规划生成任务，正在后台生成。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGeneratingAnnualMarketingPlan(false);
    }
  }

  async function handleSyncDailyHotspotWorkspace(platformTitles?: string[]) {
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
      await loadArchive();
      setNotice(`飞书同步完成，已更新 ${response.syncedCount} 条结果，命中 ${response.tableCount} 张数据表。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步失败";
      setErrorMessage(`飞书同步失败：${message}`);
    } finally {
      setIsSyncingFeishuWorkspace(false);
    }
  }

  async function handleAddBenchmarkNoteToMaterial(assetId: string) {
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

  async function handleUploadAssetFile(
    target: "industryFeeds" | "businessAssets",
    assetId: string,
    file?: File | null,
  ) {
    if (!file) {
      return;
    }

    const uploadKey = `${target}:${assetId}`;
    setUploadingAssetKey(uploadKey);
    clearMessages();

    try {
      const uploaded = await uploadBrandAssetFile(archive.brand.id, file);
      setArchive((current) => ({
        ...current,
        [target]: current[target].map((item) => (
          item.id === assetId ? { ...item, fileUrl: uploaded.fileUrl } : item
        )),
      }));
      setNotice("文档上传成功，请继续保存页面。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      setErrorMessage(`文档上传失败：${message}`);
    } finally {
      setUploadingAssetKey("");
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

  function updateAsset(
    target: "industryFeeds" | "businessAssets",
    index: number,
    key: keyof BrandAsset,
    value: string,
  ) {
    setArchive((current) => {
      const next = [...current[target]];
      next[index] = { ...next[index], [key]: value };
      return { ...current, [target]: next };
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

  function switchSection(sectionKey: StrategySectionKey) {
    const targetSection = strategySections.find((item) => item.key === sectionKey) ?? strategySections[0];
    setActiveSection(targetSection.key);
    setActivePage(targetSection.pages[0]?.key ?? "background");
    setActiveXhsCollectionCard("brandAccount");
  }

  function switchPage(pageKey: StrategyPageKey) {
    setActivePage(pageKey);
    if (pageKey !== "xiaohongshuCollection") {
      setActiveXhsCollectionCard("brandAccount");
    }
  }

  async function saveActivePage() {
    if (!activeBrandPage) {
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
          archive[activeBrandPage].map((item) => ({
            id: item.id?.includes("_local_") ? undefined : item.id,
            title: item.title,
            description: item.description,
            sourceName: item.sourceName,
            fileUrl: item.fileUrl,
          })),
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
        onAddAsset={(target) =>
          setArchive((current) => ({
            ...current,
            [target]: [...current[target], emptyAsset()],
          }))
        }
        onUpdateAsset={updateAsset}
        onUploadAssetFile={handleUploadAssetFile}
        uploadingAssetKey={uploadingAssetKey}
      />
    );
  }

  function renderCollectionPage() {
    return (
      <BrandGrowthCollectionWorkspace
        activePage={activePage === "dailyHotspot" ? "dailyHotspot" : "xiaohongshuCollection"}
        templateUrl={FEISHU_XHS_TEMPLATE_URL}
        activeXhsCollectionCard={activeXhsCollectionCard}
        onXhsCollectionCardChange={setActiveXhsCollectionCard}
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
        onSaveFeishuAppConfig={handleSaveFeishuAppConfig}
        onStartFeishuAuth={handleStartFeishuAuth}
        onSaveFeishuBinding={handleSaveFeishuBinding}
        onSyncFeishuWorkspace={handleSyncFeishuWorkspace}
        sortedBrandAccounts={sortedBrandAccounts}
        sortedCompetitorAccounts={sortedCompetitorAccounts}
        sortedBrandNotes={sortedBrandNotes}
        sortedBenchmarkNotes={sortedBenchmarkNotes}
        brandNotesPage={brandNotesPage}
        setBrandNotesPage={setBrandNotesPage}
        brandNotesPageCount={brandNotesPageCount}
        brandNotesPageSize={brandNotesPageSize}
        setBrandNotesPageSize={setBrandNotesPageSize}
        paginatedBrandNotes={paginatedBrandNotes}
        addingMaterialAssetId={addingMaterialAssetId}
        onAddBenchmarkNoteToMaterial={handleAddBenchmarkNoteToMaterial}
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
    const latestReport = reportWorkspace.latest;
    const latestVisualReport = visualReportWorkspace.latest;
    const latestPlan = annualMarketingPlanWorkspace.latest;
    const previewHtml = renderMarkdownToHtml(reportMarkdownDraft || latestReport?.reportMarkdown || "");
    const previewDocument = buildVisualReportPreviewDocument(
      latestVisualReport?.title || "品牌增长可视化报告",
      latestVisualReport?.htmlBody || "",
    );
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
        visualTaskStatusText={visualTaskStatusText}
        annualTaskStatusText={annualTaskStatusText}
        previewRows={latestPlan?.items ?? []}
        isHydrating={isHydrating}
        isGeneratingReport={isGeneratingReport}
        isGeneratingVisualReport={isGeneratingVisualReport}
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
        <button type="button" className="primary-button" onClick={() => void saveActivePage()} disabled={isSaving || isHydrating}>
          {isSaving ? "保存中..." : activeBrandPage === "products" || activeBrandPage === "survey" ? "保存并下一步" : "保存页面"}
        </button>
      );
    }

    if (activePage === "xiaohongshuCollection") {
      return (
        <a href={FEISHU_XHS_TEMPLATE_URL} target="_blank" rel="noreferrer" className="primary-button">
          打开模板
        </a>
      );
    }

    if (activePage === "dailyHotspot") {
      return null;
    }

    if (activePage === "growthReport") {
      if (reportWorkspace.latest) {
        return (
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleSaveReport()}
            disabled={isSavingReport || isHydrating}
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
          disabled={isGeneratingReport || isHydrating || !canGenerateGrowthReport}
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
          disabled={isGeneratingVisualReport || isHydrating || !canGenerateVisualGrowthReport || isVisualReportTaskActive}
        >
          {isGeneratingVisualReport ? "提交中..." : isVisualReportTaskActive ? "生成中..." : "生成可视化报告"}
        </button>
      );
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
        disabled={isGeneratingAnnualMarketingPlan || isHydrating || !canGenerateAnnualMarketingPlan || isAnnualMarketingPlanTaskActive}
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
            {strategySections.map((section) => (
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

          {activeBrandPage ? renderLibraryPage() : activeSection === "collection" ? renderCollectionPage() : renderReportPage()}
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
