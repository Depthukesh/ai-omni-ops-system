"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addBenchmarkNoteToMaterialLibrary,
  getXiaohongshuCollectionWorkspace,
  syncXiaohongshuFromFeishu,
  type XhsCollectionWorkspace,
} from "../../../services/collectors";
import { API_BASE_URL } from "../../../services/http";
import {
  BRAND_SURVEY_SECTIONS,
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
  type BrandSurveyAnswer,
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
type XiaohongshuCollectionCardKey = "brandAccount" | "competitorAccount" | "brandWorks" | "benchmarkWorks";
type MediaPreviewState = {
  url: string;
  title: string;
};

const xiaohongshuCollectionCards: Array<{ key: XiaohongshuCollectionCardKey; label: string }> = [
  { key: "brandAccount", label: "品牌账号信息" },
  { key: "competitorAccount", label: "竞品账号信息" },
  { key: "brandWorks", label: "品牌作品信息及数据" },
  { key: "benchmarkWorks", label: "对标作品信息及数据" },
];

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

function statusText(status: BrandArchiveBundle["steps"][number]["status"]) {
  if (status === "ready") return "已完成";
  if (status === "in_progress") return "进行中";
  return "待开始";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

function formatDateLabel(value?: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function formatCount(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }
  return value.toLocaleString("zh-CN");
}

function formatMetric(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value: string) {
  const escaped = escapeHtml(value);

  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  const codeLines: string[] = [];

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  function closeCodeBlock() {
    if (inCodeBlock) {
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      codeLines.length = 0;
      inCodeBlock = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      closeList();
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmedLine) {
      closeList();
      continue;
    }

    const unorderedListMatch = trimmedLine.match(/^[-*]\s+(.*)$/);
    if (unorderedListMatch) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${renderInlineMarkdown(unorderedListMatch[1])}</li>`);
      continue;
    }

    const orderedListMatch = trimmedLine.match(/^\d+\.\s+(.*)$/);
    if (orderedListMatch) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${renderInlineMarkdown(orderedListMatch[1])}</li>`);
      continue;
    }

    closeList();

    const headingMatch = trimmedLine.match(/^(#{1,6})\s*(.+)$/);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length);
      const content = renderInlineMarkdown(headingMatch[2]);
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const blockquoteMatch = trimmedLine.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      html.push(`<blockquote><p>${renderInlineMarkdown(blockquoteMatch[1])}</p></blockquote>`);
      continue;
    }

    if (trimmedLine === "---" || trimmedLine === "***") {
      html.push("<hr />");
      continue;
    }

    html.push(`<p>${renderInlineMarkdown(trimmedLine)}</p>`);
  }

  closeList();
  closeCodeBlock();

  return `<section class="generated-report-markdown">${html.join("")}</section>`;
}

function buildVisualReportPreviewDocument(title: string, htmlBody: string) {
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>html,body{margin:0;padding:0;background:#f5f7fb;font-family:"PingFang SC","Microsoft YaHei",sans-serif;}*{box-sizing:border-box;}</style>',
    "</head>",
    `<body>${htmlBody}</body>`,
    "</html>",
  ].join("");
}

function sortByCollectedAtDesc<T extends { collectedAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.collectedAt ? new Date(left.collectedAt).getTime() : 0;
    const rightTime = right.collectedAt ? new Date(right.collectedAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function getPreviewImageUrl(url?: string) {
  if (!url) {
    return "";
  }

  // Rednote image links often default to HEIF, which many desktop browsers do not preview reliably.
  return url.replace("format/heif", "format/jpg");
}

function formatHotspotHeat(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "接口未返回";
  }

  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)} 亿`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)} 万`;
  }

  return value.toLocaleString("zh-CN");
}

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
        getBrandArchive(DEMO_BRAND_ID),
        getXiaohongshuCollectionWorkspace(DEMO_BRAND_ID),
        getDailyHotspotWorkspace(DEMO_BRAND_ID),
        getGrowthReportWorkspace(DEMO_BRAND_ID),
        getVisualGrowthReportWorkspace(DEMO_BRAND_ID),
        getAnnualMarketingPlanWorkspace(DEMO_BRAND_ID),
        getBrandFeishuBinding(DEMO_BRAND_ID),
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
    } catch {
      setDataSource("error");
      setErrorMessage("后端暂不可用，请检查 3011 服务。页面不会再回退到演示数据。");
    } finally {
      setIsHydrating(false);
    }
  }

  async function refreshVisualReportWorkspace(silent = false) {
    try {
      const nextWorkspace = await getVisualGrowthReportWorkspace(DEMO_BRAND_ID);
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
      const nextWorkspace = await getAnnualMarketingPlanWorkspace(DEMO_BRAND_ID);
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

function buildFeishuMediaProxyUrl(sourceUrl?: string, download = false) {
  if (!sourceUrl) {
    return "";
  }
  const params = new URLSearchParams({ sourceUrl });
  if (download) {
    params.set("download", "1");
  }
  return `${API_BASE_URL}/collectors/xiaohongshu/brands/${DEMO_BRAND_ID}/feishu-media?${params.toString()}`;
}

  async function handleGenerateReport() {
    if (!canGenerateGrowthReport) {
      setErrorMessage("请先完成小红书平台下 4 项收集数据后，再生成品牌增长报告。");
      return;
    }

    setIsGeneratingReport(true);
    clearMessages();

    try {
      const nextWorkspace = await generateGrowthReport(DEMO_BRAND_ID);
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
      const nextWorkspace = await generateVisualGrowthReport(DEMO_BRAND_ID);
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
      const nextWorkspace = await generateAnnualMarketingPlan(DEMO_BRAND_ID);
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
      const response = await syncDailyHotspots(platformTitles, DEMO_BRAND_ID);
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
      const workspace = await getDailyHotspotWorkspace(DEMO_BRAND_ID, date);
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
      const nextBinding = await upsertBrandFeishuBinding(DEMO_BRAND_ID, {
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
      const response = await syncXiaohongshuFromFeishu(DEMO_BRAND_ID);
      setCollectionWorkspace(response.workspace);
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
      const response = await addBenchmarkNoteToMaterialLibrary(assetId, DEMO_BRAND_ID);
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
    setNotice("正在跳转飞书授权，请使用当前用户自己的飞书应用和飞书账号完成连接...");

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
      const uploaded = await uploadBrandProductImage(DEMO_BRAND_ID, file);
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
      const uploaded = await uploadBrandAssetFile(DEMO_BRAND_ID, file);
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
        await updateBrandBackground(DEMO_BRAND_ID, {
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
          await deleteBrandProduct(DEMO_BRAND_ID, productId);
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
            await createBrandProduct(DEMO_BRAND_ID, payload);
          } else {
            await updateBrandProduct(DEMO_BRAND_ID, product.id, payload);
          }
        }
      }

      if (activeBrandPage === "survey") {
        await replaceBrandSurvey(DEMO_BRAND_ID, archive.survey.map((item) => ({
          key: item.key,
          label: item.label,
          value: item.value,
        })));
      }

      if (activeBrandPage === "industryFeeds" || activeBrandPage === "businessAssets") {
        await replaceBrandAssets(
          DEMO_BRAND_ID,
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
    if (activeBrandPage === "background") {
      return (
        <article className="workspace-panel strategy-page-card">
          <article className="reference-info-panel">
            <div className="reference-info-head">
              <div>
                <strong>{archive.brand.brandName || "品牌背景资料"}</strong>
                <p>这里用于维护品牌名称、行业、门店规模、品牌介绍和企业介绍。</p>
              </div>
              <span className="archive-pill status-ready">{activeStepMeta?.name}</span>
            </div>
            <div className="reference-info-grid">
              <div>
                <span>行业</span>
                <strong>{archive.brand.industry || "未填写"}</strong>
              </div>
              <div>
                <span>门店数量</span>
                <strong>{archive.brand.storeCount}</strong>
              </div>
              <div>
                <span>品牌成立时间</span>
                <strong>{archive.brand.foundedYear}</strong>
              </div>
              <div>
                <span>当前状态</span>
                <strong>{statusText(activeStepMeta?.status ?? "pending")}</strong>
              </div>
            </div>
          </article>
          <div className="form-grid two-column">
            <label className="field">
              <span>品牌名称</span>
              <input value={archive.brand.brandName} onChange={(e) => updateBackground("brandName", e.target.value)} />
            </label>
            <label className="field">
              <span>行业</span>
              <input value={archive.brand.industry} onChange={(e) => updateBackground("industry", e.target.value)} />
            </label>
            <label className="field">
              <span>门店数量</span>
              <input type="number" value={archive.brand.storeCount} onChange={(e) => updateBackground("storeCount", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>品牌成立时间</span>
              <input type="number" value={archive.brand.foundedYear} onChange={(e) => updateBackground("foundedYear", Number(e.target.value))} />
            </label>
            <label className="field field-full">
              <span>品牌介绍</span>
              <textarea value={archive.brand.brandDescription} onChange={(e) => updateBackground("brandDescription", e.target.value)} />
            </label>
            <label className="field field-full">
              <span>企业介绍</span>
              <textarea value={archive.brand.enterpriseIntro} onChange={(e) => updateBackground("enterpriseIntro", e.target.value)} />
            </label>
          </div>
        </article>
      );
    }

    if (activeBrandPage === "products") {
      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>产品资料库</strong>
              <p>每个产品单独成卡，字段自动换行，保证当前屏宽内可编辑。</p>
            </div>
            <button type="button" className="primary-button" onClick={() => setArchive((current) => ({ ...current, products: [...current.products, emptyProduct()] }))}>
              新增产品
            </button>
          </div>
          <div className="product-library-grid">
            {archive.products.map((product, index) => (
              <div className="product-library-card" key={product.id}>
                <div className="entity-card-head compact-card-head">
                  <div>
                    <strong>{product.productName || `产品 ${index + 1}`}</strong>
                    <p className="compact-meta-line">
                      {product.productType || "未填写类型"} · {product.price || 0} 元
                    </p>
                  </div>
                  <div className="compact-card-actions">
                    <button type="button" className="ghost-danger-button" onClick={() => removeProduct(product.id)}>
                      删除
                    </button>
                  </div>
                </div>
                <div className="form-grid two-column product-library-fields">
                  <label className="field">
                    <span>产品名称</span>
                    <input value={product.productName} onChange={(e) => updateProduct(index, "productName", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>产品类型</span>
                    <input value={product.productType} onChange={(e) => updateProduct(index, "productType", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>价格</span>
                    <input type="number" value={product.price} onChange={(e) => updateProduct(index, "price", Number(e.target.value))} />
                  </label>
                  <label className="field">
                    <span>产品定位</span>
                    <input value={product.productPositioning} onChange={(e) => updateProduct(index, "productPositioning", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>目标人群</span>
                    <input value={product.targetAudience} onChange={(e) => updateProduct(index, "targetAudience", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>解决痛点</span>
                    <input value={product.painPoint} onChange={(e) => updateProduct(index, "painPoint", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>使用场景</span>
                    <input value={product.usageScenario} onChange={(e) => updateProduct(index, "usageScenario", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>差异化优势</span>
                    <input value={product.differentiators} onChange={(e) => updateProduct(index, "differentiators", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>市场地位</span>
                    <input value={product.marketPosition} onChange={(e) => updateProduct(index, "marketPosition", e.target.value)} />
                  </label>
                  <label className="field field-full">
                    <span>产品详细介绍</span>
                    <textarea rows={4} value={product.detailDescription} onChange={(e) => updateProduct(index, "detailDescription", e.target.value)} />
                  </label>
                  <label className="field field-full">
                    <span>产品图片</span>
                    <div className="product-image-upload-row">
                      <label className="secondary-button product-upload-trigger">
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only-file-input"
                          onChange={(event) => {
                            void handleUploadProductImage(product.id, event.target.files?.[0] ?? null);
                            event.currentTarget.value = "";
                          }}
                        />
                        {uploadingProductId === product.id ? "上传中..." : "上传图片"}
                      </label>
                      {product.imageUrl ? (
                        <a href={product.imageUrl} target="_blank" rel="noreferrer" className="secondary-button">
                          查看原图
                        </a>
                      ) : null}
                    </div>
                    {product.imageUrl ? (
                      <div className="product-image-preview-shell">
                        <img src={product.imageUrl} alt={`${product.productName || `产品 ${index + 1}`} 图片`} className="product-image-preview" />
                      </div>
                    ) : (
                      <span className="field-hint">支持上传图片文件，上传后会自动回填并在保存时写入数据库。</span>
                    )}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </article>
      );
    }

    if (activeBrandPage === "survey") {
      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>品牌运营情况</strong>
              <p>严格按既定调研参数填写，保存后写入数据库。</p>
            </div>
          </div>
          <div className="survey-section-list">
            {BRAND_SURVEY_SECTIONS.map((section) => (
              <section className="survey-section-card" key={section.title}>
                <div className="survey-section-title">{section.title}</div>
                {section.fields?.map((field) => {
                  const answer = archive.survey.find((item) => item.key === field.key);
                  return (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <textarea value={answer?.value ?? ""} onChange={(e) => updateSurvey(field.key, e.target.value)} />
                    </label>
                  );
                })}
                {section.groups?.map((group) => (
                  <div className="survey-subgroup" key={group.title}>
                    <div className="survey-subgroup-title">{group.title}</div>
                    {group.fields.map((field) => {
                      const answer = archive.survey.find((item) => item.key === field.key);
                      return (
                        <label className="field" key={field.key}>
                          <span>{field.label}</span>
                          <textarea value={answer?.value ?? ""} onChange={(e) => updateSurvey(field.key, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </article>
      );
    }

    if (activeBrandPage === "industryFeeds" || activeBrandPage === "businessAssets") {
      const assetTarget = activeBrandPage;
      const assetTitle = activeBrandPage === "industryFeeds" ? "第三方数据" : "企业经营数据";

      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{assetTitle}</strong>
              <p>{activeBrandPage === "industryFeeds" ? "这里维护行业报告、市场资料与外部数据。" : "这里维护经营报表、业务系统和门店经营数据。"}</p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setArchive((current) => ({
                  ...current,
                  [assetTarget]: [...current[assetTarget], emptyAsset()],
                }))
              }
            >
              新增资料
            </button>
          </div>
          <div className="entity-list">
            {archive[assetTarget].map((asset, index) => (
              <div className="entity-card compact-entity-card" key={asset.id ?? `${assetTarget}-${index}`}>
                <div className="entity-card-head compact-card-head">
                  <div>
                    <strong>{asset.title || `资料 ${index + 1}`}</strong>
                    <p className="compact-meta-line">{asset.sourceName || "未填写来源"} · {asset.fileUrl || "未填写文件地址"}</p>
                  </div>
                </div>
                <div className="form-grid two-column">
                  <label className="field">
                    <span>资料标题</span>
                    <input value={asset.title} onChange={(e) => updateAsset(assetTarget, index, "title", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>来源名称</span>
                    <input value={asset.sourceName ?? ""} onChange={(e) => updateAsset(assetTarget, index, "sourceName", e.target.value)} />
                  </label>
                  <label className="field field-full">
                    <span>资料说明</span>
                    <textarea value={asset.description} onChange={(e) => updateAsset(assetTarget, index, "description", e.target.value)} />
                  </label>
                  <label className="field field-full">
                    <span>文件地址</span>
                    <div className="asset-file-upload-row">
                      <label className="secondary-button product-upload-trigger">
                        <input
                          type="file"
                          className="sr-only-file-input"
                          onChange={(event) => {
                            void handleUploadAssetFile(assetTarget, asset.id ?? `${assetTarget}-${index}`, event.target.files?.[0] ?? null);
                            event.currentTarget.value = "";
                          }}
                        />
                        {uploadingAssetKey === `${assetTarget}:${asset.id ?? `${assetTarget}-${index}`}` ? "上传中..." : "上传文档"}
                      </label>
                      {asset.fileUrl ? (
                        <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="secondary-button">
                          查看文件
                        </a>
                      ) : null}
                    </div>
                    <input value={asset.fileUrl ?? ""} onChange={(e) => updateAsset(assetTarget, index, "fileUrl", e.target.value)} />
                    <span className="field-hint">支持上传 PDF、Word、Excel、PPT、CSV、TXT、ZIP 等文档，上传后会自动回填文件地址。</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </article>
      );
    }

    return null;
  }

  function renderCollectionPage() {
    if (activePage === "xiaohongshuCollection") {
      return (
        <>
          <article className="workspace-panel strategy-page-card feishu-binding-panel">
            <div className="strategy-card-toolbar">
              <div>
                <strong>飞书多维表格收集入口</strong>
                <p>填写应用信息和飞书多维表格链接后，按顺序完成连接与同步即可。</p>
              </div>
              <a href={FEISHU_XHS_TEMPLATE_URL} target="_blank" rel="noreferrer" className="secondary-button">
                打开飞书模板
              </a>
            </div>
            <div className="feishu-compact-steps">
              <span>01 配置应用</span>
              <span>02 连接飞书</span>
              <span>03 绑定副本</span>
              <span>04 同步数据</span>
            </div>
            <div className="form-grid two-column">
              <label className="field">
                <span>App ID</span>
                <input
                  value={feishuAppConfigForm.appId}
                  onChange={(event) => setFeishuAppConfigForm((current) => ({ ...current, appId: event.target.value }))}
                  placeholder="请输入当前用户自己的飞书 App ID"
                />
              </label>
              <label className="field">
                <span>App Secret</span>
                <input
                  type="password"
                  value={feishuAppConfigForm.appSecret}
                  onChange={(event) => setFeishuAppConfigForm((current) => ({ ...current, appSecret: event.target.value }))}
                  placeholder={feishuAppConfig?.appSecretMasked || "请输入当前用户自己的飞书 App Secret"}
                />
              </label>
              <label className="field field-full">
                <span>授权回调地址</span>
                <input
                  value={feishuAppConfigForm.redirectUri}
                  onChange={(event) => setFeishuAppConfigForm((current) => ({ ...current, redirectUri: event.target.value }))}
                  placeholder="例如 http://localhost:3011/api/auth/feishu/oauth/callback"
                />
              </label>
              <label className="field field-full">
                <span>授权 Scope</span>
                <input
                  value={feishuAppConfigForm.scope}
                  onChange={(event) => setFeishuAppConfigForm((current) => ({ ...current, scope: event.target.value }))}
                  placeholder="默认会自动填入读取 Base/Wiki 所需 scope"
                />
              </label>
              <label className="field field-full">
                <span>飞书多维表格链接</span>
                <input
                  value={feishuBindingForm.wikiUrl}
                  onChange={(event) => setFeishuBindingForm((current) => ({ ...current, wikiUrl: event.target.value }))}
                  placeholder="粘贴飞书 wiki 或多维表格副本链接，例如 https://.../wiki/... 或 https://.../base/..."
                />
              </label>
            </div>
            <div className="feishu-binding-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveFeishuAppConfig()}
                disabled={isHydrating || isSavingFeishuAppConfig}
              >
                {isSavingFeishuAppConfig ? "保存中..." : "保存应用配置"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleStartFeishuAuth()}
              >
                {feishuAuthStatus?.connected ? "更换飞书账号" : "连接飞书"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleSaveFeishuBinding()}
                disabled={isHydrating || isSavingFeishuBinding}
              >
                {isSavingFeishuBinding ? "绑定中..." : "保存绑定"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleSyncFeishuWorkspace()}
                disabled={isHydrating || isSyncingFeishuWorkspace || !canSyncFeishuWorkspace}
              >
                {isSyncingFeishuWorkspace ? "同步中..." : "从飞书同步"}
              </button>
            </div>
          </article>
          <div className="strategy-chip-row">
            {xiaohongshuCollectionCards.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`filter-chip ${activeXhsCollectionCard === item.key ? "is-active" : ""}`}
                onClick={() => setActiveXhsCollectionCard(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <article className="workspace-panel strategy-page-card strategy-collection-page-card">
            {activeXhsCollectionCard === "brandAccount" ? (
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>品牌账号信息</h3>
                    <p>直接展示飞书多维表格同步回来的品牌账号结果。</p>
                  </div>
                  <span className={`archive-pill ${sortedBrandAccounts.length ? "status-ready" : "status-pending"}`}>
                    已同步 {sortedBrandAccounts.length} 条
                  </span>
                </div>
                <div className="collection-card-list">
                  {sortedBrandAccounts.length ? (
                    sortedBrandAccounts.map((item) => (
                      <article key={item.id} className="collection-sync-card">
                        <div className="collection-sync-head">
                          <div className="collection-sync-title">
                            <strong>{item.accountName || "-"}</strong>
                            <span>{item.sourceAccountLink ? <a href={item.sourceAccountLink} target="_blank" rel="noreferrer">{item.sourceAccountLink}</a> : "未提供主页链接"}</span>
                          </div>
                          <span className="collection-sync-time">{formatDateTime(item.collectedAt)}</span>
                        </div>
                        <div className="collection-sync-grid">
                          <div className="collection-sync-item">
                            <span>外部用户 ID</span>
                            <strong className="collection-sync-code">{item.externalUserId || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>作品数</span>
                            <strong>{formatCount(item.postedCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>粉丝数</span>
                            <strong>{formatCount(item.fanCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>获赞数</span>
                            <strong>{formatCount(item.likedCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>收藏数</span>
                            <strong>{formatCount(item.collectedCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>IP 属地</span>
                            <strong>{item.ipLocation || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>关注数</span>
                            <strong>{formatCount(item.followCount)}</strong>
                          </div>
                          <div className="collection-sync-item collection-sync-item--full">
                            <span>账号简介</span>
                            <strong>{item.description || "未提供简介"}</strong>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="note-empty-state">当前还没有同步到品牌账号结果。</div>
                  )}
                </div>
              </article>
            ) : null}

            {activeXhsCollectionCard === "competitorAccount" ? (
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>竞品账号信息</h3>
                    <p>直接展示飞书多维表格同步回来的竞品账号结果。</p>
                  </div>
                  <span className={`archive-pill ${sortedCompetitorAccounts.length ? "status-ready" : "status-pending"}`}>
                    已同步 {sortedCompetitorAccounts.length} 条
                  </span>
                </div>
                <div className="collection-card-list">
                  {sortedCompetitorAccounts.length ? (
                    sortedCompetitorAccounts.map((item) => (
                      <article key={item.id} className="collection-sync-card">
                        <div className="collection-sync-head">
                          <div className="collection-sync-title">
                            <strong>{item.accountName || "-"}</strong>
                            <span>{item.sourceAccountLink ? <a href={item.sourceAccountLink} target="_blank" rel="noreferrer">{item.sourceAccountLink}</a> : "未提供主页链接"}</span>
                          </div>
                          <span className="collection-sync-time">{formatDateTime(item.collectedAt)}</span>
                        </div>
                        <div className="collection-sync-grid">
                          <div className="collection-sync-item">
                            <span>外部用户 ID</span>
                            <strong className="collection-sync-code">{item.externalUserId || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>作品数</span>
                            <strong>{formatCount(item.postedCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>粉丝数</span>
                            <strong>{formatCount(item.fanCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>获赞数</span>
                            <strong>{formatCount(item.likedCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>收藏数</span>
                            <strong>{formatCount(item.collectedCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>IP 属地</span>
                            <strong>{item.ipLocation || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>关注数</span>
                            <strong>{formatCount(item.followCount)}</strong>
                          </div>
                          <div className="collection-sync-item collection-sync-item--full">
                            <span>账号简介</span>
                            <strong>{item.description || "未提供简介"}</strong>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="note-empty-state">当前还没有同步到竞品账号结果。</div>
                  )}
                </div>
              </article>
            ) : null}

            {activeXhsCollectionCard === "brandWorks" ? (
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>品牌作品信息及数据</h3>
                    <p>直接展示飞书多维表格同步回来的品牌作品内容。</p>
                  </div>
                  <span className={`archive-pill ${sortedBrandNotes.length ? "status-ready" : "status-pending"}`}>
                    已同步 {sortedBrandNotes.length} 条
                  </span>
                </div>
                <div className="note-results-list">
                  {sortedBrandNotes.length ? (
                    paginatedBrandNotes.map((item) => (
                      <article key={item.id} className="note-result-card">
                        <div className="note-result-top">
                          <div className="note-result-title-block">
                            <div className="note-title-meta">
                              <span className={`note-type-badge ${item.noteType === "video" ? "is-video" : "is-normal"}`}>
                                {item.noteType || "-"}
                              </span>
                              <span className="note-id-text">{item.noteId}</span>
                            </div>
                            <strong>{item.title}</strong>
                          </div>
                          <div className="note-result-summary-grid">
                            <div className="note-summary-item">
                              <span>作者</span>
                              <strong>{item.nickname || "-"}</strong>
                            </div>
                            <div className="note-summary-item">
                              <span>用户 ID</span>
                              <strong className="note-summary-code">{item.externalUserId || "-"}</strong>
                            </div>
                            <div className="note-summary-item">
                              <span>创建时间</span>
                              <strong>{item.createdAtText || "-"}</strong>
                            </div>
                            <div className="note-summary-item">
                              <span>来源账号</span>
                              <strong className="note-summary-code">{item.sourceAccountId}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="note-result-middle">
                          <div className="note-metric-grid note-metric-grid--compact">
                            <div>
                              <span>点赞</span>
                              <strong>{item.likeCount ?? 0}</strong>
                            </div>
                            <div>
                              <span>收藏</span>
                              <strong>{item.collectCount ?? 0}</strong>
                            </div>
                            <div>
                              <span>分享</span>
                              <strong>{item.shareCount ?? 0}</strong>
                            </div>
                            <div>
                              <span>评论</span>
                              <strong>{item.commentCount ?? 0}</strong>
                            </div>
                          </div>
                          <div className="note-description-panel">
                            <span className="note-panel-label">正文</span>
                            <div className="note-description-inline">{item.description || "暂无正文内容"}</div>
                          </div>
                        </div>
                        <div className="note-result-bottom">
                          <div className="note-media-panel">
                            <span className="note-panel-label">附件</span>
                            {item.imageList?.length ? (
                              <div className="note-image-grid">
                                {item.imageList.map((mediaUrl, index) => {
                                  const previewUrl = buildFeishuMediaProxyUrl(mediaUrl);
                                  const downloadUrl = buildFeishuMediaProxyUrl(mediaUrl, true);
                                  return (
                                  <div key={`${item.id}-image-${index}`} className="note-image-card">
                                    <button
                                      type="button"
                                      className="note-image-thumb"
                                      title={`查看附件 ${index + 1}`}
                                      onClick={() => setMediaPreview({ url: previewUrl, title: `${item.title}-附件-${index + 1}` })}
                                    >
                                      <img src={previewUrl} alt={`${item.title}-附件-${index + 1}`} />
                                    </button>
                                    <a href={downloadUrl} className="note-data-link">
                                      下载附件
                                    </a>
                                  </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="note-empty-media">暂无附件</div>
                            )}
                            {item.videoUrl ? (
                              <div className="note-video-shell">
                                <video
                                  controls
                                  preload="metadata"
                                  className="note-video-player"
                                  src={buildFeishuMediaProxyUrl(item.videoUrl)}
                                />
                              </div>
                            ) : null}
                            <div className="note-media-actions">
                              {item.videoUrl ? (
                                <a href={buildFeishuMediaProxyUrl(item.videoUrl)} target="_blank" rel="noreferrer" className="note-data-link">
                                  查看视频附件
                                </a>
                              ) : null}
                              {item.videoUrl ? (
                                <a href={buildFeishuMediaProxyUrl(item.videoUrl, true)} className="note-data-link">
                                  下载视频附件
                                </a>
                              ) : null}
                              {item.noteUrl ? (
                                <a href={item.noteUrl} target="_blank" rel="noreferrer" className="note-data-link">
                                  查看作品链接
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="note-empty-state">当前还没有同步到品牌作品结果，先在飞书副本里执行插件收集，再回到本站查看。</div>
                  )}
                </div>
                {sortedBrandNotes.length ? (
                  <div className="note-pagination-bar">
                    <div className="note-pagination-summary">
                      <span>共 {sortedBrandNotes.length} 条</span>
                      <span>第 {brandNotesPage} / {brandNotesPageCount} 页</span>
                    </div>
                    <div className="note-pagination-actions">
                      <button
                        type="button"
                        className="note-inline-button"
                        onClick={() => setBrandNotesPage((current) => Math.max(1, current - 1))}
                        disabled={brandNotesPage === 1}
                      >
                        上一页
                      </button>
                      {Array.from({ length: brandNotesPageCount }, (_, index) => index + 1).map((page) => (
                        <button
                          key={`brand-note-page-${page}`}
                          type="button"
                          className={`note-page-button ${page === brandNotesPage ? "is-active" : ""}`}
                          onClick={() => setBrandNotesPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="note-inline-button"
                        onClick={() => setBrandNotesPage((current) => Math.min(brandNotesPageCount, current + 1))}
                        disabled={brandNotesPage === brandNotesPageCount}
                      >
                        下一页
                      </button>
                      <label className="note-page-size-picker">
                        <span>每页</span>
                        <select value={brandNotesPageSize} onChange={(event) => setBrandNotesPageSize(Number(event.target.value))}>
                          {[10, 20, 30, 50].map((size) => (
                            <option key={`page-size-${size}`} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <span>个</span>
                      </label>
                    </div>
                  </div>
                ) : null}
              </article>
            ) : null}

            {activeXhsCollectionCard === "benchmarkWorks" ? (
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>对标作品信息及数据</h3>
                    <p>直接展示飞书多维表格同步回来的对标作品内容。</p>
                  </div>
                  <span className={`archive-pill ${sortedBenchmarkNotes.length ? "status-ready" : "status-pending"}`}>
                    已同步 {sortedBenchmarkNotes.length} 条
                  </span>
                </div>
                <div className="collection-card-list">
                  {sortedBenchmarkNotes.length ? (
                    sortedBenchmarkNotes.map((item) => (
                      <article key={item.id} className="collection-sync-card">
                        <div className="collection-sync-head">
                          <div className="collection-sync-title">
                            <strong>{item.title || "-"}</strong>
                            <span>{item.sourceUrl || item.noteUrl ? <a href={item.sourceUrl || item.noteUrl} target="_blank" rel="noreferrer">{item.sourceUrl || item.noteUrl}</a> : "未提供来源链接"}</span>
                          </div>
                          <div className="collection-sync-actions">
                            <span className="collection-sync-time">{formatDateTime(item.collectedAt)}</span>
                            <button
                              type="button"
                              className={`secondary-button ${item.isInMaterialLibrary ? "is-disabled" : ""}`}
                              onClick={() => void handleAddBenchmarkNoteToMaterial(item.id)}
                              disabled={addingMaterialAssetId === item.id || Boolean(item.isInMaterialLibrary)}
                            >
                              {item.isInMaterialLibrary ? "已加入素材库" : addingMaterialAssetId === item.id ? "加入中..." : "加入素材库"}
                            </button>
                          </div>
                        </div>
                        <div className="collection-sync-grid">
                          <div className="collection-sync-item">
                            <span>作者</span>
                            <strong>{item.nickname || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>笔记类型</span>
                            <strong>{item.noteType || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>赞藏率</span>
                            <strong>{formatMetric(item.likeCollectRatio)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>赞评率</span>
                            <strong>{formatMetric(item.likeCommentRatio)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>分享率</span>
                            <strong>{formatMetric(item.shareRatio)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>是否爆款</span>
                            <strong>{item.isExplosive || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>是否选用</span>
                            <strong>{item.followUpDecision || "-"}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>点赞</span>
                            <strong>{formatCount(item.likeCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>收藏</span>
                            <strong>{formatCount(item.collectCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>评论</span>
                            <strong>{formatCount(item.commentCount)}</strong>
                          </div>
                          <div className="collection-sync-item">
                            <span>分享</span>
                            <strong>{formatCount(item.shareCount)}</strong>
                          </div>
                          <div className="collection-sync-item collection-sync-item--full">
                            <span>正文</span>
                            <strong>{item.description || "暂无正文内容"}</strong>
                          </div>
                        </div>
                        <div className="note-result-bottom">
                          <div className="note-media-panel">
                            <span className="note-panel-label">附件</span>
                            {item.imageList?.length ? (
                              <div className="note-image-grid">
                                {item.imageList.map((mediaUrl, index) => {
                                  const previewUrl = buildFeishuMediaProxyUrl(mediaUrl);
                                  const downloadUrl = buildFeishuMediaProxyUrl(mediaUrl, true);
                                  return (
                                  <div key={`${item.id}-benchmark-image-${index}`} className="note-image-card">
                                    <button
                                      type="button"
                                      className="note-image-thumb"
                                      title={`查看附件 ${index + 1}`}
                                      onClick={() => setMediaPreview({ url: previewUrl, title: `${item.title}-附件-${index + 1}` })}
                                    >
                                      <img src={previewUrl} alt={`${item.title}-附件-${index + 1}`} />
                                    </button>
                                    <a href={downloadUrl} className="note-data-link">
                                      下载附件
                                    </a>
                                  </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="note-empty-media">暂无附件</div>
                            )}
                            {item.videoUrl ? (
                              <div className="note-video-shell">
                                <video
                                  controls
                                  preload="metadata"
                                  className="note-video-player"
                                  src={buildFeishuMediaProxyUrl(item.videoUrl)}
                                />
                              </div>
                            ) : null}
                            <div className="note-media-actions">
                              {item.videoUrl ? (
                                <a href={buildFeishuMediaProxyUrl(item.videoUrl)} target="_blank" rel="noreferrer" className="note-data-link">
                                  查看视频附件
                                </a>
                              ) : null}
                              {item.videoUrl ? (
                                <a href={buildFeishuMediaProxyUrl(item.videoUrl, true)} className="note-data-link">
                                  下载视频附件
                                </a>
                              ) : null}
                              {(item.sourceUrl || item.noteUrl) ? (
                                <a href={item.sourceUrl || item.noteUrl} target="_blank" rel="noreferrer" className="note-data-link">
                                  查看作品链接
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="note-empty-state">当前还没有同步到对标作品结果。</div>
                  )}
                </div>
              </article>
            ) : null}
          </article>
        </>
      );
    }

    return (
      <article className="workspace-panel strategy-page-card hotspot-page-card">
        <article className="light-data-panel hotspot-overview-panel">
          <div className="hotspot-panel-head">
            <div className="hotspot-panel-copy">
              <h3>{activeHotspotRecord?.title || "热搜榜"}</h3>
              <p>{activeHotspotRecord?.description || "这里展示每日热点搜索结果。"}</p>
              <span className="hotspot-auto-tip">每天 4:00 自动更新当天热搜榜</span>
            </div>
            <div className="hotspot-panel-actions">
              <label className="hotspot-date-picker">
                <span>查看日期</span>
                <select
                  value={selectedHotspotDate}
                  onChange={(event) => void handleDailyHotspotDateChange(event.target.value)}
                  disabled={isSyncingDailyHotspots || !hotspotAvailableDates.length}
                >
                  {hotspotAvailableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDateLabel(date)}
                    </option>
                  ))}
                </select>
              </label>
              <span className={`archive-pill ${activeHotspotRecord?.syncStatus === "SUCCESS" ? "status-ready" : activeHotspotRecord?.syncStatus === "FAILED" ? "status-pending" : "status-in_progress"}`}>
                {activeHotspotRecord?.syncStatus || "IDLE"}
              </span>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSyncDailyHotspotWorkspace(activeHotspotRecord ? [activeHotspotRecord.title] : undefined)}
                disabled={isSyncingDailyHotspots}
              >
                {isSyncingDailyHotspots ? "搜索中..." : "手动搜索"}
              </button>
            </div>
          </div>

          {activeHotspotRecord?.lastError ? (
            <div className="hotspot-error-banner">
              <strong>最近一次搜索失败</strong>
              <p>{activeHotspotRecord.lastError}</p>
            </div>
          ) : null}
        </article>

        <article className="light-data-panel">
          <div className="hotspot-list-head">
            <h3>热点榜单</h3>
            <div className="hotspot-list-tools">
              <span className="archive-pill status-ready">
                共 {sortedHotspotItems.length} 条
              </span>
              <label className="note-page-size-picker hotspot-page-size-picker">
                <span>每页</span>
                <select value={hotspotPageSize} onChange={(event) => setHotspotPageSize(Number(event.target.value))}>
                  {[10, 20].map((size) => (
                    <option key={`hotspot-page-size-${size}`} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>条</span>
              </label>
            </div>
          </div>
          <div className="hotspot-ranking-list">
            {sortedHotspotItems.length ? (
              paginatedHotspotItems.map((item) => (
                  <article key={item.id} className="hotspot-ranking-card">
                    <div className="hotspot-ranking-rank">#{item.rank}</div>
                    <div className="hotspot-ranking-body">
                      <strong>{item.title}</strong>
                      <div className="hotspot-ranking-meta">
                        <span>热度 {formatHotspotHeat(item.hot)}</span>
                        <span>时间 {formatDateTime(item.timestamp ? new Date(item.timestamp).toISOString() : activeHotspotRecord?.updateTime || activeHotspotRecord?.collectedAt)}</span>
                      </div>
                    </div>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="table-link-pill">
                        查看源链接
                      </a>
                    ) : (
                      <span className="archive-pill status-pending">无直达链接</span>
                    )}
                  </article>
                ))
            ) : (
              <div className="empty-state">当前榜单还没有可展示的热点条目。若刚执行过搜索但仍为空，通常表示接口权限不足或返回结构为空。</div>
            )}
          </div>
          {sortedHotspotItems.length ? (
            <div className="note-pagination-bar hotspot-pagination-bar">
              <div className="note-pagination-summary">
                <span>第 {hotspotPage} / {hotspotPageCount} 页</span>
                <span>当前显示 {paginatedHotspotItems.length} 条</span>
              </div>
              <div className="note-pagination-actions">
                <button
                  type="button"
                  className="note-inline-button"
                  onClick={() => setHotspotPage((current) => Math.max(1, current - 1))}
                  disabled={hotspotPage === 1}
                >
                  上一页
                </button>
                {Array.from({ length: hotspotPageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    key={`hotspot-page-${page}`}
                    type="button"
                    className={`note-page-button ${page === hotspotPage ? "is-active" : ""}`}
                    onClick={() => setHotspotPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="note-inline-button"
                  onClick={() => setHotspotPage((current) => Math.min(hotspotPageCount, current + 1))}
                  disabled={hotspotPage === hotspotPageCount}
                >
                  下一页
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </article>
    );
  }

  function renderReportPage() {
    if (activePage === "growthReport") {
      const latestReport = reportWorkspace.latest;
      const previewHtml = renderMarkdownToHtml(reportMarkdownDraft || latestReport?.reportMarkdown || "");
      return (
        <article className="workspace-panel strategy-page-card">
          {latestReport ? (
            <article className="light-data-panel report-editor-panel">
              <div className="report-editor-head">
                <div>
                  <strong>{latestReport.title}</strong>
                  <p>Markdown 格式，可直接修改并保存这份品牌增长报告。</p>
                </div>
                <div className="report-editor-actions">
                  <span className="archive-pill status-ready">{formatDateTime(latestReport.generatedAt)}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleGenerateReport()}
                    disabled={isGeneratingReport || isHydrating}
                  >
                    {isGeneratingReport ? "重新生成中..." : "重新生成"}
                  </button>
                </div>
              </div>
              <div className="report-editor-grid">
                <label className="report-editor-pane">
                  <span>Markdown 编辑器</span>
                  <textarea
                    className="report-markdown-textarea"
                    value={reportMarkdownDraft}
                    onChange={(event) => setReportMarkdownDraft(event.target.value)}
                    placeholder="这里显示并编辑品牌增长报告 Markdown 内容"
                  />
                </label>
                <article className="report-editor-pane">
                  <span>预览</span>
                  <div className="generated-report-html" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </article>
              </div>
            </article>
          ) : (
            <article className="light-data-panel">
              <h3>当前还没有品牌增长报告</h3>
              <p>点击右上角“生成报告”后，会在这里生成并进入 Markdown 编辑状态。</p>
            </article>
          )}
        </article>
      );
    }

    if (activePage === "visualGrowthReport") {
      const sourceReport = reportWorkspace.latest;
      const latestVisualReport = visualReportWorkspace.latest;
      const previewDocument = buildVisualReportPreviewDocument(
        latestVisualReport?.title || "品牌增长可视化报告",
        latestVisualReport?.htmlBody || "",
      );
      const visualTaskStatusText = latestVisualTask?.taskStatus === "QUEUED"
        ? "排队中"
        : latestVisualTask?.taskStatus === "RUNNING"
          ? "生成中"
          : latestVisualTask?.taskStatus === "FAILED"
            ? "生成失败"
            : latestVisualTask?.taskStatus === "SUCCESS"
              ? "已完成"
              : "";
      return (
        <article className="workspace-panel strategy-page-card">
          {!sourceReport ? (
            <article className="light-data-panel">
              <h3>请先生成品牌增长报告</h3>
              <p>当前可视化报告的输入来源是【品牌增长报告】，生成完成后才能继续生成这一板块。</p>
            </article>
          ) : isVisualReportTaskActive && !latestVisualReport ? (
            <article className="light-data-panel">
              <h3>品牌增长可视化报告{latestVisualTask?.taskStatus === "QUEUED" ? "排队中" : "生成中"}</h3>
              <p>
                当前任务已提交，正在后台调用模型生成。{latestVisualTask?.sourceReportTitle ? `输入来源：${latestVisualTask.sourceReportTitle}。` : ""}
              </p>
            </article>
          ) : latestVisualReport ? (
            <article className="light-data-panel report-editor-panel">
              <div className="report-editor-head">
                <div>
                  <strong>{latestVisualReport.title}</strong>
                  <p>调用 article-visual-report-designer，将品牌增长报告转成嵌入式可视化 HTML 报告。</p>
                </div>
                <div className="report-editor-actions">
                  <span className="archive-pill status-ready">{formatDateTime(latestVisualReport.generatedAt)}</span>
                  {visualTaskStatusText ? <span className="archive-pill status-pending">{visualTaskStatusText}</span> : null}
                </div>
              </div>
              <div className="visual-report-source-card">
                <span>输入来源</span>
                <strong>{latestVisualReport.sourceReportTitle || sourceReport.title}</strong>
                <p>{sourceReport.summary}</p>
              </div>
              {latestVisualTask?.taskStatus === "FAILED" && latestVisualTask.errorMessage ? (
                <div className="visual-report-source-card">
                  <span>最近失败原因</span>
                  <strong>{latestVisualTask.errorMessage}</strong>
                  <p>请检查外部模型接口可用性，或重新点击生成可视化报告。</p>
                </div>
              ) : null}
              {isVisualReportTaskActive ? (
                <div className="visual-report-source-card">
                  <span>当前任务状态</span>
                  <strong>{latestVisualTask?.taskStatus === "QUEUED" ? "排队中" : "后台生成中"}</strong>
                  <p>页面会自动刷新结果，无需停留在当前接口请求中等待。</p>
                </div>
              ) : null}
              <article className="report-editor-pane">
                <span>可视化报告</span>
                <iframe
                  title="品牌增长可视化报告预览"
                  className="visual-report-preview-frame visual-report-preview-frame--single"
                  srcDoc={previewDocument}
                />
              </article>
            </article>
          ) : (
            <article className="light-data-panel">
              <h3>当前还没有品牌增长可视化报告</h3>
              <p>点击右上角“生成可视化报告”后，会调用 article-visual-report-designer 生成可直接预览的 HTML 报告。</p>
            </article>
          )}
        </article>
      );
    }

    const sourceReport = reportWorkspace.latest;
    const latestPlan = annualMarketingPlanWorkspace.latest;
    const annualTaskStatusText = latestAnnualMarketingTask?.taskStatus === "QUEUED"
      ? "排队中"
      : latestAnnualMarketingTask?.taskStatus === "RUNNING"
        ? "生成中"
        : latestAnnualMarketingTask?.taskStatus === "FAILED"
          ? "生成失败"
          : latestAnnualMarketingTask?.taskStatus === "SUCCESS"
            ? "已完成"
            : "";
    const previewRows = latestPlan?.items ?? [];

    return (
      <article className="workspace-panel strategy-page-card">
        {!sourceReport ? (
          <article className="light-data-panel">
            <h3>请先生成品牌增长报告</h3>
            <p>当前全年营销规划的输入来源是【品牌增长报告】和【品牌商家建档】，需要先完成报告生成后才能继续。</p>
          </article>
        ) : isAnnualMarketingPlanTaskActive && !latestPlan ? (
          <article className="light-data-panel">
            <h3>全年营销规划{latestAnnualMarketingTask?.taskStatus === "QUEUED" ? "排队中" : "生成中"}</h3>
            <p>
              当前任务已提交，正在后台调用模型生成。{latestAnnualMarketingTask?.sourceReportTitle ? `输入来源：${latestAnnualMarketingTask.sourceReportTitle}。` : ""}
            </p>
          </article>
        ) : latestPlan ? (
          <article className="light-data-panel report-editor-panel">
            <div className="report-editor-head">
              <div>
                <strong>{latestPlan.title}</strong>
                <p>大模型先输出结构化 JSON，再由后端渲染为年度营销规划 HTML 表格。</p>
              </div>
              <div className="report-editor-actions">
                <span className="archive-pill status-ready">{formatDateTime(latestPlan.generatedAt)}</span>
                <span className="archive-pill status-pending">{latestPlan.planningYear || "年度未识别"}</span>
                {annualTaskStatusText ? <span className="archive-pill status-pending">{annualTaskStatusText}</span> : null}
              </div>
            </div>
            <div className="visual-report-source-card">
              <span>输入来源</span>
              <strong>{latestPlan.sourceReportTitle || sourceReport.title}</strong>
              <p>{latestPlan.summary}</p>
            </div>
            {latestAnnualMarketingTask?.taskStatus === "FAILED" && latestAnnualMarketingTask.errorMessage ? (
              <div className="visual-report-source-card">
                <span>最近失败原因</span>
                <strong>{latestAnnualMarketingTask.errorMessage}</strong>
                <p>请检查外部模型接口可用性，或重新点击生成规划。</p>
              </div>
            ) : null}
            {isAnnualMarketingPlanTaskActive ? (
              <div className="visual-report-source-card">
                <span>当前任务状态</span>
                <strong>{latestAnnualMarketingTask?.taskStatus === "QUEUED" ? "排队中" : "后台生成中"}</strong>
                <p>页面会自动刷新结果，无需停留在当前接口请求中等待。</p>
              </div>
            ) : null}
            {latestPlan.planningFocus.length ? (
              <div className="strategy-chip-row">
                {latestPlan.planningFocus.map((item, index) => (
                  <span key={`annual-focus-${index}`} className="filter-chip is-active">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="card-grid">
              <article className="metric-card">
                <span>规划年份</span>
                <strong>{latestPlan.planningYear || "未识别"}</strong>
                <p>按品牌增长报告的当前输入，输出对应年度的营销排期。</p>
              </article>
              <article className="metric-card">
                <span>规划条目</span>
                <strong>{latestPlan.items.length}</strong>
                <p>覆盖节日、节气与重点营销节点，便于后续拆解月度执行。</p>
              </article>
              <article className="metric-card">
                <span>平台矩阵</span>
                <strong>5 类</strong>
                <p>小红书、抖音、视频号、私域与线下门店统一联动。</p>
              </article>
            </div>
            <article className="light-data-panel" style={{ padding: 0, background: "transparent", border: "none", boxShadow: "none" }}>
              <div className="hotspot-list-head">
                <h3>规划条目预览</h3>
                <span className="archive-pill status-ready">共 {previewRows.length} 条</span>
              </div>
              {previewRows.length ? (
                <div className="hotspot-ranking-list">
                  {previewRows.map((item, index) => (
                    <article key={`${item.month}-${item.node}-${index}`} className="hotspot-ranking-card">
                      <div className="hotspot-ranking-rank">{item.month}</div>
                      <div className="hotspot-ranking-body">
                        <strong>{item.node} · {item.marketingTheme}</strong>
                        <div className="hotspot-ranking-meta">
                          <span>{item.type}</span>
                          <span>{item.date}</span>
                          <span>{item.platforms.join("、")}</span>
                        </div>
                        <div className="note-description-inline">{item.strategy}</div>
                      </div>
                      <span className="archive-pill status-pending">{item.products.join("、") || "产品待定"}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">当前规划结果还没有可展示的条目。</div>
              )}
            </article>
          </article>
        ) : (
          <article className="light-data-panel">
            <h3>当前还没有全年营销规划</h3>
            <p>点击右上角“生成规划”后，会根据【品牌商家建档】和【品牌增长报告】生成 JSON，再由后端渲染成 HTML 规划表。</p>
          </article>
        )}
      </article>
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
        <aside className="strategy-level-panel">
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
        </aside>

        <aside className="strategy-level-panel strategy-level-panel--tertiary">
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
