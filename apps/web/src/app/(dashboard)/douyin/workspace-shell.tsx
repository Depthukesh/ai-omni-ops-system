"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { getBrandPermissionSettings, DEMO_BRAND_ID, type BrandPermissionKey, type BrandPermissionSettingsRecord } from "../../../services/brand-growth";
import { douyinCollectionSeed, getDouyinCollectionWorkspace, type DouyinCollectionWorkspace } from "../../../services/collectors";
import {
  annualMarketingPlanSeed,
  deleteDouyinOriginalCopy,
  deleteDouyinRemixCopy,
  deleteDouyinMarketingPlan,
  douyinHotTopicCandidatesSeed,
  douyinMarketingPlanSeed,
  douyinOriginalCopySeed,
  douyinRemixCopySeed,
  generateDouyinHotTopicCandidates,
  generateDouyinMarketingPlan,
  generateDouyinOriginalCopy,
  generateDouyinRemixCopy,
  getAnnualMarketingPlanWorkspace,
  getDouyinHotTopicCandidatesWorkspace,
  getDouyinMarketingPlanWorkspace,
  getDouyinOriginalCopyWorkspace,
  getDouyinRemixCopyWorkspace,
  getGrowthReportWorkspace,
  growthReportSeed,
  updateDouyinTopicLibrary,
  updateDouyinOriginalCopy,
  updateDouyinRemixCopy,
  updateDouyinMarketingPlan,
  type DouyinHotTopicCandidatesWorkspace,
  type DouyinOriginalCopyWorkspace,
  type DouyinRemixCopyWorkspace,
  type DouyinTopicLibraryItem,
  type DouyinMarketingPlanTaskRecord,
  type DouyinMarketingPlanWorkspace,
} from "../../../services/reports";
import {
  deleteDouyinDigitalHumanVideoWork,
  continueDouyinDirectVideoGeneration,
  continueDouyinVideoGeneration,
  deleteDouyinDirectVideoWork,
  deleteDouyinVideoWork,
  generateDouyinDigitalHumanVideoWork,
  generateDouyinDirectVideoWork,
  generateDouyinVideoWork,
  getDouyinDigitalHumanTemplates,
  getDouyinDigitalHumanTemplateTags,
  getDouyinDigitalHumanVideoWorks,
  getDouyinDirectVideoProviders,
  getDouyinDirectVideoWorks,
  getDouyinVideoProviders,
  getDouyinVideoStoryboardImageProviders,
  getDouyinVideoWorks,
  recoverDouyinDigitalHumanVideo,
  recoverDouyinDirectVideoGeneration,
  recoverDouyinVideoGeneration,
  regenerateDouyinVideoStoryboard,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinDigitalHumanVideoWorkRecord,
  updateDouyinDirectVideoWork,
  updateDouyinVideoWork,
  type DouyinDirectVideoWorkRecord,
  type DouyinVideoWorkRecord,
  type StoryboardImageModelOptionRecord,
  type VideoProviderOptionRecord,
} from "../../../services/works";
import { MediaLightbox } from "../xiaohongshu/media-lightbox";
import { type MediaLightboxState } from "../xiaohongshu/shared-types";
import { DouyinAssetsWorkspace } from "./assets-workspace";
import { DouyinDigitalHumanWorkspace } from "./digital-human-workspace";
import { formatDateTime } from "../xiaohongshu/datetime-helpers";
import { renderMarkdownToHtml } from "../xiaohongshu/markdown-render";
import { DouyinHotTopicCandidatesWorkspace as DouyinHotTopicCandidatesWorkspacePanel } from "./hot-topic-candidates-workspace";
import { DouyinOriginalCopyWorkspace as DouyinOriginalCopyWorkspacePanel } from "./original-copy-workspace";
import { DouyinRemixCopyWorkspace as DouyinRemixCopyWorkspacePanel } from "./remix-copy-workspace";
import { DouyinTopicLibraryWorkspace } from "./topic-library-workspace";
import { DouyinDirectVideoWorkspace } from "./video-direct-workspace";
import { DouyinVideoStoryboardWorkspace } from "./video-storyboard-workspace";

type LoadState = "loading" | "api" | "seed";
type DouyinSectionKey =
  | "plan"
  | "assets"
  | "hotTopics"
  | "topicLibrary"
  | "originalCopy"
  | "remixCopy"
  | "video"
  | "videoDirect"
  | "digitalHuman";

const douyinSections: Array<{ key: DouyinSectionKey; label: string; description: string }> = [
  { key: "plan", label: "营销策划方案", description: "围绕品牌增长报告、半年营销规划和抖音采集数据生成可编辑的 Markdown 方案。" },
  { key: "assets", label: "素材库", description: "展示已经从品牌增长策略 → 收集数据 → 抖音加入素材库的对标作品，沿用卡片化素材浏览方式。" },
  { key: "hotTopics", label: "热点找选题", description: "按所选日期读取每日热点全部榜单和品牌背景资料，生成 3 个可勾选的抖音热点选题。" },
  { key: "topicLibrary", label: "选题库", description: "按品牌独立沉淀抖音选题，一行展示两条记录，超过 20 行自动分页。" },
  { key: "originalCopy", label: "原创文案", description: "基于选题库、营销日历和抖音营销策划方案，按不同文案类型生成品牌独立存储的原创文案。" },
  { key: "remixCopy", label: "二创文案", description: "基于素材库视频、品牌资料、产品资料和营销策划方案，提取视频文案后生成品牌独立存储的二创文案。" },
  { key: "video", label: "AI生视频（故事板）", description: "基于营销日历、抖音素材库、产品与营销策划方案，先生成剧本和故事板，再继续生成短视频。" },
  { key: "videoDirect", label: "AI生视频", description: "基于营销日历、抖音素材库、产品与营销策划方案直接生成 Seedance 2.0 生视频提示词，确认后继续生成短视频。" },
  { key: "digitalHuman", label: "数字人", description: "对接蝉镜 OpenAPI，支持公共模板库、数字人口播视频创建、结果找回和作品中心管理。" },
];

const douyinSectionPermissionMap: Record<DouyinSectionKey, BrandPermissionKey> = {
  plan: "douyin.plan",
  assets: "douyin.assets",
  hotTopics: "douyin.hotTopics",
  topicLibrary: "douyin.topicLibrary",
  originalCopy: "douyin.original",
  remixCopy: "douyin.remix",
  video: "douyin.video",
  videoDirect: "douyin.videoDirect",
  digitalHuman: "douyin.digitalHuman",
};

function getTaskStatusClass(status?: DouyinMarketingPlanTaskRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getTaskStatusText(task?: DouyinMarketingPlanTaskRecord) {
  if (!task) {
    return "暂无任务";
  }
  if (task.taskStatus === "SUCCESS") {
    return "已完成";
  }
  if (task.taskStatus === "RUNNING") {
    return "生成中";
  }
  if (task.taskStatus === "QUEUED" || task.taskStatus === "PENDING") {
    return "排队中";
  }
  if (task.taskStatus === "FAILED") {
    return "失败";
  }
  if (task.taskStatus === "CANCELLED") {
    return "已取消";
  }
  return task.taskStatus;
}

export function DouyinWorkspaceShell() {
  const activeBrandId = useMemo(() => getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID, []);
  const [isLoading, setIsLoading] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [activeSection, setActiveSection] = useState<DouyinSectionKey>("plan");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [brandPermissionSettings, setBrandPermissionSettings] = useState<BrandPermissionSettingsRecord | null>(null);
  const [collectionWorkspace, setCollectionWorkspace] = useState<DouyinCollectionWorkspace>(douyinCollectionSeed);
  const [growthReportWorkspace, setGrowthReportWorkspace] = useState(growthReportSeed);
  const [annualPlanWorkspace, setAnnualPlanWorkspace] = useState(annualMarketingPlanSeed);
  const [marketingPlanWorkspace, setMarketingPlanWorkspace] = useState<DouyinMarketingPlanWorkspace>(douyinMarketingPlanSeed);
  const [hotTopicWorkspace, setHotTopicWorkspace] = useState<DouyinHotTopicCandidatesWorkspace>(douyinHotTopicCandidatesSeed);
  const [originalCopyWorkspace, setOriginalCopyWorkspace] = useState<DouyinOriginalCopyWorkspace>(douyinOriginalCopySeed);
  const [remixCopyWorkspace, setRemixCopyWorkspace] = useState<DouyinRemixCopyWorkspace>(douyinRemixCopySeed);
  const [videoWorks, setVideoWorks] = useState<DouyinVideoWorkRecord[]>([]);
  const [videoProviderOptions, setVideoProviderOptions] = useState<VideoProviderOptionRecord[]>([]);
  const [storyboardImageModelOptions, setStoryboardImageModelOptions] = useState<StoryboardImageModelOptionRecord[]>([]);
  const [directVideoWorks, setDirectVideoWorks] = useState<DouyinDirectVideoWorkRecord[]>([]);
  const [directVideoProviderOptions, setDirectVideoProviderOptions] = useState<VideoProviderOptionRecord[]>([]);
  const [digitalHumanWorks, setDigitalHumanWorks] = useState<DouyinDigitalHumanVideoWorkRecord[]>([]);
  const [digitalHumanTemplates, setDigitalHumanTemplates] = useState<DigitalHumanTemplateRecord[]>([]);
  const [digitalHumanTemplateTags, setDigitalHumanTemplateTags] = useState<DigitalHumanTemplateTagGroupRecord[]>([]);
  const [digitalHumanTemplatePageInfo, setDigitalHumanTemplatePageInfo] = useState<DigitalHumanTemplatePageInfo | undefined>(undefined);
  const [digitalHumanTemplateTagId, setDigitalHumanTemplateTagId] = useState("");
  const [isDigitalHumanTemplateLoading, setIsDigitalHumanTemplateLoading] = useState(false);
  const [marketingPlanDraft, setMarketingPlanDraft] = useState("");
  const [selectedHotTopicDate, setSelectedHotTopicDate] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingHotTopics, setIsGeneratingHotTopics] = useState(false);
  const [isSubmittingOriginalCopy, setIsSubmittingOriginalCopy] = useState(false);
  const [isSubmittingRemixCopy, setIsSubmittingRemixCopy] = useState(false);
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const [isSubmittingDirectVideo, setIsSubmittingDirectVideo] = useState(false);
  const [isSubmittingDigitalHuman, setIsSubmittingDigitalHuman] = useState(false);
  const [isSavingTopicLibrary, setIsSavingTopicLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialPreviewIndexMap, setMaterialPreviewIndexMap] = useState<Record<string, number>>({});
  const [materialLightbox, setMaterialLightbox] = useState<MediaLightboxState | null>(null);

  const latestMarketingPlan = marketingPlanWorkspace.latest;
  const latestTask = marketingPlanWorkspace.latestTask;
  const isTaskActive = latestTask?.taskStatus === "RUNNING" || latestTask?.taskStatus === "QUEUED" || latestTask?.taskStatus === "PENDING";
  const latestHotTopicResult = hotTopicWorkspace.latest;
  const latestHotTopicTask = hotTopicWorkspace.latestTask;
  const isHotTopicTaskActive =
    latestHotTopicTask?.taskStatus === "RUNNING"
    || latestHotTopicTask?.taskStatus === "QUEUED"
    || latestHotTopicTask?.taskStatus === "PENDING";
  const latestOriginalCopyTask = originalCopyWorkspace.latestTask;
  const isOriginalCopyTaskActive =
    latestOriginalCopyTask?.taskStatus === "RUNNING"
    || latestOriginalCopyTask?.taskStatus === "QUEUED"
    || latestOriginalCopyTask?.taskStatus === "PENDING";
  const latestRemixCopyTask = remixCopyWorkspace.latestTask;
  const isRemixCopyTaskActive =
    latestRemixCopyTask?.taskStatus === "RUNNING"
    || latestRemixCopyTask?.taskStatus === "QUEUED"
    || latestRemixCopyTask?.taskStatus === "PENDING";
  const isVideoTaskActive = videoWorks.some((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING");
  const isDirectVideoTaskActive = directVideoWorks.some((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING");
  const isDigitalHumanTaskActive = digitalHumanWorks.some((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING");
  const permissionMap = brandPermissionSettings?.currentUserPermissions;
  const visibleSections = useMemo(
    () =>
      brandPermissionSettings
        ? douyinSections.filter((item) => Boolean(permissionMap?.[douyinSectionPermissionMap[item.key]]?.view))
        : douyinSections,
    [brandPermissionSettings, permissionMap],
  );
  const hasWorkspaceAccess = visibleSections.length > 0;
  const canEditMarketingPlan = brandPermissionSettings ? (permissionMap?.["douyin.plan"]?.edit ?? false) : true;
  const canEditHotTopics = brandPermissionSettings ? (permissionMap?.["douyin.hotTopics"]?.edit ?? false) : true;
  const canEditTopicLibrary = brandPermissionSettings ? (permissionMap?.["douyin.topicLibrary"]?.edit ?? false) : true;
  const canViewTopicLibrary = brandPermissionSettings ? (permissionMap?.["douyin.topicLibrary"]?.view ?? false) : true;
  const canEditOriginalCopy = brandPermissionSettings ? (permissionMap?.["douyin.original"]?.edit ?? false) : true;
  const canEditRemixCopy = brandPermissionSettings ? (permissionMap?.["douyin.remix"]?.edit ?? false) : true;
  const canEditVideo = brandPermissionSettings ? (permissionMap?.["douyin.video"]?.edit ?? false) : true;
  const canEditDirectVideo = brandPermissionSettings ? (permissionMap?.["douyin.videoDirect"]?.edit ?? false) : true;
  const canEditDigitalHuman = brandPermissionSettings ? (permissionMap?.["douyin.digitalHuman"]?.edit ?? false) : true;
  const canEditCurrentSection = brandPermissionSettings
    ? Boolean(permissionMap?.[douyinSectionPermissionMap[activeSection]]?.edit)
    : true;
  const materialWorks = useMemo(
    () => [
      ...collectionWorkspace.benchmarkWorks,
      ...collectionWorkspace.lowFanExplosiveWorks,
      ...collectionWorkspace.highCompletionRateWorks,
      ...collectionWorkspace.highLikeRateWorks,
    ].filter((item) => item.isInMaterialLibrary),
    [
      collectionWorkspace.benchmarkWorks,
      collectionWorkspace.lowFanExplosiveWorks,
      collectionWorkspace.highCompletionRateWorks,
      collectionWorkspace.highLikeRateWorks,
    ],
  );
  const canGenerateMarketingPlan = Boolean(
    growthReportWorkspace.latest
    && annualPlanWorkspace.latest
    && (collectionWorkspace.brandAccounts.length || collectionWorkspace.competitorAccounts.length || collectionWorkspace.brandWorks.length || collectionWorkspace.benchmarkWorks.length),
  );
  const currentSection = visibleSections.find((item) => item.key === activeSection) ?? visibleSections[0] ?? douyinSections[0];
  const heroTitle = "抖音工作台";
  const heroDescription = "当前开放营销策划方案、素材库、热点找选题、选题库、原创文案、二创文案、AI 生视频（故事板）、AI 生视频和数字人，可直接复用品牌增长策略里沉淀的抖音对标作品、每日热点与品牌资料。";
  const videoMarketingPlanTitle = marketingPlanWorkspace.latest?.title || originalCopyWorkspace.marketingPlanTitle || remixCopyWorkspace.marketingPlanTitle;
  const hasVideoMarketingPlan = Boolean(marketingPlanWorkspace.latest || originalCopyWorkspace.hasMarketingPlan || remixCopyWorkspace.hasMarketingPlan);

  const marketingPlanPreviewHtml = useMemo(
    () => renderMarkdownToHtml(marketingPlanDraft || latestMarketingPlan?.reportMarkdown || ""),
    [latestMarketingPlan?.reportMarkdown, marketingPlanDraft],
  );

  const refreshMarketingPlanWorkspace = useCallback(async () => {
    const nextWorkspace = await getDouyinMarketingPlanWorkspace(activeBrandId);
    setMarketingPlanWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId]);

  const refreshHotTopicWorkspace = useCallback(async (date?: string) => {
    const nextWorkspace = await getDouyinHotTopicCandidatesWorkspace(activeBrandId, date || selectedHotTopicDate || undefined);
    setHotTopicWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId, selectedHotTopicDate]);

  const refreshOriginalCopyWorkspace = useCallback(async () => {
    const nextWorkspace = await getDouyinOriginalCopyWorkspace(activeBrandId);
    setOriginalCopyWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId]);

  const refreshRemixCopyWorkspace = useCallback(async () => {
    const nextWorkspace = await getDouyinRemixCopyWorkspace(activeBrandId);
    setRemixCopyWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId]);

  const refreshVideoWorkspace = useCallback(async () => {
    const [items, providers, storyboardModels] = await Promise.all([
      getDouyinVideoWorks(activeBrandId),
      getDouyinVideoProviders(activeBrandId),
      getDouyinVideoStoryboardImageProviders(activeBrandId),
    ]);
    setVideoWorks(items.items || []);
    setVideoProviderOptions(providers.items || []);
    setStoryboardImageModelOptions(storyboardModels.items || []);
    return items.items || [];
  }, [activeBrandId]);

  const refreshDirectVideoWorkspace = useCallback(async () => {
    const [items, providers] = await Promise.all([
      getDouyinDirectVideoWorks(activeBrandId),
      getDouyinDirectVideoProviders(activeBrandId),
    ]);
    setDirectVideoWorks(items.items || []);
    setDirectVideoProviderOptions(providers.items || []);
    return items.items || [];
  }, [activeBrandId]);

  const loadDigitalHumanTemplates = useCallback(async (
    options?: {
      page?: number;
      size?: number;
      tagId?: string;
    },
    append?: boolean,
  ) => {
    const nextPage = Math.max(1, options?.page || 1);
    const nextSize = Math.max(1, options?.size || digitalHumanTemplatePageInfo?.size || 24);
    const nextTagId = options?.tagId ?? digitalHumanTemplateTagId;
    setIsDigitalHumanTemplateLoading(true);
    try {
      const templates = await getDouyinDigitalHumanTemplates(activeBrandId, {
        page: nextPage,
        size: nextSize,
        sort: "hot_desc",
        tagIds: nextTagId ? [Number(nextTagId)] : [],
      });
      setDigitalHumanTemplateTagId(nextTagId);
      setDigitalHumanTemplatePageInfo(templates.pageInfo);
      setDigitalHumanTemplates((current) => {
        if (!append) {
          return templates.list || [];
        }
        const merged = [...current, ...(templates.list || [])];
        return merged.filter((item, index) => merged.findIndex((entry) => entry.id === item.id) === index);
      });
      return templates.list || [];
    } finally {
      setIsDigitalHumanTemplateLoading(false);
    }
  }, [activeBrandId, digitalHumanTemplatePageInfo?.size, digitalHumanTemplateTagId]);

  const refreshDigitalHumanWorkspace = useCallback(async () => {
    const [items, tagGroups] = await Promise.all([
      getDouyinDigitalHumanVideoWorks(activeBrandId),
      getDouyinDigitalHumanTemplateTags(activeBrandId),
    ]);
    setDigitalHumanWorks(items.items || []);
    setDigitalHumanTemplateTags(tagGroups.list || []);
    await loadDigitalHumanTemplates({
      page: 1,
      size: digitalHumanTemplatePageInfo?.size || 24,
      tagId: digitalHumanTemplateTagId,
    });
    return items.items || [];
  }, [activeBrandId, digitalHumanTemplatePageInfo?.size, digitalHumanTemplateTagId, loadDigitalHumanTemplates]);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setNotice("");

    const [permissionResult, collectionResult, growthResult, annualResult] = await Promise.allSettled([
      getBrandPermissionSettings(activeBrandId),
      getDouyinCollectionWorkspace(activeBrandId),
      getGrowthReportWorkspace(activeBrandId),
      getAnnualMarketingPlanWorkspace(activeBrandId),
    ]);

    let hasFallback = false;
    const resolvedPermissionSettings = permissionResult.status === "fulfilled" ? permissionResult.value : null;
    if (permissionResult.status === "fulfilled") {
      setBrandPermissionSettings(permissionResult.value);
    } else {
      hasFallback = true;
      setBrandPermissionSettings(null);
    }

    const canViewSection = (sectionKey: DouyinSectionKey) =>
      !resolvedPermissionSettings || Boolean(resolvedPermissionSettings.currentUserPermissions?.[douyinSectionPermissionMap[sectionKey]]?.view);

    const [planResult, hotTopicResult, originalCopyResult, remixCopyResult, videoResult, videoProvidersResult, storyboardModelsResult, directVideoResult, directVideoProvidersResult, digitalHumanResult, digitalHumanTemplatesResult, digitalHumanTagGroupsResult] = await Promise.allSettled([
      canViewSection("plan") ? getDouyinMarketingPlanWorkspace(activeBrandId) : Promise.resolve(douyinMarketingPlanSeed),
      canViewSection("hotTopics") || canViewSection("topicLibrary")
        ? getDouyinHotTopicCandidatesWorkspace(activeBrandId)
        : Promise.resolve(douyinHotTopicCandidatesSeed),
      canViewSection("originalCopy") || canViewSection("video")
        ? getDouyinOriginalCopyWorkspace(activeBrandId)
        : Promise.resolve(douyinOriginalCopySeed),
      canViewSection("remixCopy") || canViewSection("video")
        ? getDouyinRemixCopyWorkspace(activeBrandId)
        : Promise.resolve(douyinRemixCopySeed),
      canViewSection("video") ? getDouyinVideoWorks(activeBrandId) : Promise.resolve({ items: [] }),
      canViewSection("video") ? getDouyinVideoProviders(activeBrandId) : Promise.resolve({ items: [] }),
      canViewSection("video") ? getDouyinVideoStoryboardImageProviders(activeBrandId) : Promise.resolve({ items: [] }),
      canViewSection("videoDirect") ? getDouyinDirectVideoWorks(activeBrandId) : Promise.resolve({ items: [] }),
      canViewSection("videoDirect") ? getDouyinDirectVideoProviders(activeBrandId) : Promise.resolve({ items: [] }),
      canViewSection("digitalHuman") ? getDouyinDigitalHumanVideoWorks(activeBrandId) : Promise.resolve({ items: [] }),
      canViewSection("digitalHuman")
        ? getDouyinDigitalHumanTemplates(activeBrandId, { page: 1, size: 24, sort: "hot_desc", tagIds: digitalHumanTemplateTagId ? [Number(digitalHumanTemplateTagId)] : [] })
        : Promise.resolve({ list: [], pageInfo: undefined }),
      canViewSection("digitalHuman") ? getDouyinDigitalHumanTemplateTags(activeBrandId) : Promise.resolve({ list: [] }),
    ]);

    if (collectionResult.status === "fulfilled") {
      setCollectionWorkspace(collectionResult.value);
    } else {
      hasFallback = true;
      setCollectionWorkspace(douyinCollectionSeed);
    }

    if (growthResult.status === "fulfilled") {
      setGrowthReportWorkspace(growthResult.value);
    } else {
      hasFallback = true;
      setGrowthReportWorkspace(growthReportSeed);
    }

    if (annualResult.status === "fulfilled") {
      setAnnualPlanWorkspace(annualResult.value);
    } else {
      hasFallback = true;
      setAnnualPlanWorkspace(annualMarketingPlanSeed);
    }

    if (planResult.status === "fulfilled") {
      setMarketingPlanWorkspace(planResult.value);
    } else {
      hasFallback = true;
      setMarketingPlanWorkspace(douyinMarketingPlanSeed);
    }

    if (hotTopicResult.status === "fulfilled") {
      setHotTopicWorkspace(hotTopicResult.value);
      setSelectedHotTopicDate(hotTopicResult.value.selectedDate || hotTopicResult.value.availableDates[0] || "");
    } else {
      hasFallback = true;
      setHotTopicWorkspace(douyinHotTopicCandidatesSeed);
      setSelectedHotTopicDate("");
    }

    if (originalCopyResult.status === "fulfilled") {
      setOriginalCopyWorkspace(originalCopyResult.value);
    } else {
      hasFallback = true;
      setOriginalCopyWorkspace(douyinOriginalCopySeed);
    }

    if (remixCopyResult.status === "fulfilled") {
      setRemixCopyWorkspace(remixCopyResult.value);
    } else {
      hasFallback = true;
      setRemixCopyWorkspace(douyinRemixCopySeed);
    }

    if (videoResult.status === "fulfilled") {
      setVideoWorks(videoResult.value.items || []);
    } else {
      hasFallback = true;
      setVideoWorks([]);
    }

    if (videoProvidersResult.status === "fulfilled") {
      setVideoProviderOptions(videoProvidersResult.value.items || []);
    } else {
      hasFallback = true;
      setVideoProviderOptions([]);
    }

    if (storyboardModelsResult.status === "fulfilled") {
      setStoryboardImageModelOptions(storyboardModelsResult.value.items || []);
    } else {
      hasFallback = true;
      setStoryboardImageModelOptions([]);
    }

    if (directVideoResult.status === "fulfilled") {
      setDirectVideoWorks(directVideoResult.value.items || []);
    } else {
      hasFallback = true;
      setDirectVideoWorks([]);
    }

    if (directVideoProvidersResult.status === "fulfilled") {
      setDirectVideoProviderOptions(directVideoProvidersResult.value.items || []);
    } else {
      hasFallback = true;
      setDirectVideoProviderOptions([]);
    }

    if (digitalHumanResult.status === "fulfilled") {
      setDigitalHumanWorks(digitalHumanResult.value.items || []);
    } else {
      hasFallback = true;
      setDigitalHumanWorks([]);
    }

    if (digitalHumanTemplatesResult.status === "fulfilled") {
      setDigitalHumanTemplates(digitalHumanTemplatesResult.value.list || []);
      setDigitalHumanTemplatePageInfo(digitalHumanTemplatesResult.value.pageInfo);
    } else {
      hasFallback = true;
      setDigitalHumanTemplates([]);
      setDigitalHumanTemplatePageInfo(undefined);
    }

    if (digitalHumanTagGroupsResult.status === "fulfilled") {
      setDigitalHumanTemplateTags(digitalHumanTagGroupsResult.value.list || []);
    } else {
      hasFallback = true;
      setDigitalHumanTemplateTags([]);
    }

    setLoadState(hasFallback ? "seed" : "api");
    if (hasFallback) {
      setErrorMessage("部分抖音工作台数据读取失败，当前显示本地示例/已缓存内容。");
    }
    setIsLoading(false);
  }, [activeBrandId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!visibleSections.length) {
      return;
    }
    if (!visibleSections.some((item) => item.key === activeSection)) {
      setActiveSection(visibleSections[0].key);
    }
  }, [activeSection, visibleSections]);

  useEffect(() => {
    setMarketingPlanDraft(marketingPlanWorkspace.latest?.reportMarkdown || "");
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.generatedAt]);

  useEffect(() => {
    if (hotTopicWorkspace.selectedDate && hotTopicWorkspace.selectedDate !== selectedHotTopicDate) {
      setSelectedHotTopicDate(hotTopicWorkspace.selectedDate);
    }
    if (!selectedHotTopicDate && hotTopicWorkspace.availableDates.length) {
      setSelectedHotTopicDate(hotTopicWorkspace.selectedDate || hotTopicWorkspace.availableDates[0] || "");
    }
  }, [hotTopicWorkspace.availableDates, hotTopicWorkspace.selectedDate, selectedHotTopicDate]);

  useEffect(() => {
    setSelectedTopicIds(
      (latestHotTopicResult?.items || [])
        .filter((item) => item.checked)
        .map((item) => item.id),
    );
  }, [latestHotTopicResult?.id, latestHotTopicResult?.generatedAt, latestHotTopicResult?.items]);

  useEffect(() => {
    if (!materialWorks.length) {
      setSelectedMaterialId("");
      return;
    }
    if (!materialWorks.some((item) => item.id === selectedMaterialId)) {
      setSelectedMaterialId(materialWorks[0]?.id || "");
    }
  }, [materialWorks, selectedMaterialId]);

  useEffect(() => {
    if (!isTaskActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshMarketingPlanWorkspace().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isTaskActive, refreshMarketingPlanWorkspace]);

  useEffect(() => {
    if (!isHotTopicTaskActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshHotTopicWorkspace(selectedHotTopicDate).catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isHotTopicTaskActive, refreshHotTopicWorkspace, selectedHotTopicDate]);

  useEffect(() => {
    if (!isOriginalCopyTaskActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshOriginalCopyWorkspace().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isOriginalCopyTaskActive, refreshOriginalCopyWorkspace]);

  useEffect(() => {
    if (!isRemixCopyTaskActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshRemixCopyWorkspace().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isRemixCopyTaskActive, refreshRemixCopyWorkspace]);

  useEffect(() => {
    if (!isVideoTaskActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshVideoWorkspace().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isVideoTaskActive, refreshVideoWorkspace]);

  useEffect(() => {
    if (!isDirectVideoTaskActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshDirectVideoWorkspace().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isDirectVideoTaskActive, refreshDirectVideoWorkspace]);

  useEffect(() => {
    if (!isDigitalHumanTaskActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshDigitalHumanWorkspace().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isDigitalHumanTaskActive, refreshDigitalHumanWorkspace]);

  useEffect(() => {
    if (!isTaskActive && !isHotTopicTaskActive && !isOriginalCopyTaskActive && !isRemixCopyTaskActive && !isVideoTaskActive && !isDirectVideoTaskActive && !isDigitalHumanTaskActive && notice.includes("任务已提交")) {
      setNotice("");
    }
  }, [isDigitalHumanTaskActive, isDirectVideoTaskActive, isHotTopicTaskActive, isOriginalCopyTaskActive, isRemixCopyTaskActive, isTaskActive, isVideoTaskActive, notice]);

  useEffect(() => {
    setOriginalCopyWorkspace((current) => ({
      ...current,
      topicOptions: hotTopicWorkspace.topicLibrary || [],
    }));
  }, [hotTopicWorkspace.topicLibrary]);

  useEffect(() => {
    setOriginalCopyWorkspace((current) => ({
      ...current,
      hasMarketingPlan: Boolean(marketingPlanWorkspace.latest),
      marketingPlanTitle: marketingPlanWorkspace.latest?.title,
    }));
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.title]);

  useEffect(() => {
    setRemixCopyWorkspace((current) => ({
      ...current,
      hasMarketingPlan: Boolean(marketingPlanWorkspace.latest),
      marketingPlanTitle: marketingPlanWorkspace.latest?.title,
    }));
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.title]);

  const handleGenerate = useCallback(async () => {
    if (!canEditMarketingPlan) {
      setErrorMessage("当前账号只有查看权限，不能生成抖音营销策划方案。");
      return;
    }
    if (!canGenerateMarketingPlan) {
      setErrorMessage("请先准备品牌增长报告、半年营销规划和抖音采集数据，再开始生成。");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinMarketingPlan(activeBrandId);
      setMarketingPlanWorkspace(nextWorkspace);
      setNotice("抖音营销策划方案任务已提交，系统正在后台生成。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "抖音营销策划方案提交失败。");
    } finally {
      setIsGenerating(false);
    }
  }, [activeBrandId, canEditMarketingPlan, canGenerateMarketingPlan]);

  const handleSave = useCallback(async () => {
    if (!latestMarketingPlan) {
      return;
    }
    if (!canEditMarketingPlan) {
      setErrorMessage("当前账号只有查看权限，不能保存抖音营销策划方案。");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinMarketingPlan(
        latestMarketingPlan.id,
        marketingPlanDraft,
        latestMarketingPlan.title,
        activeBrandId,
      );
      setMarketingPlanWorkspace(nextWorkspace);
      setNotice("抖音营销策划方案已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "抖音营销策划方案保存失败。");
    } finally {
      setIsSaving(false);
    }
  }, [activeBrandId, canEditMarketingPlan, latestMarketingPlan, marketingPlanDraft]);

  const handleDelete = useCallback(async () => {
    if (!latestMarketingPlan) {
      return;
    }
    if (!canEditMarketingPlan) {
      setErrorMessage("当前账号只有查看权限，不能删除抖音营销策划方案。");
      return;
    }
    if (!window.confirm(`确认删除「${latestMarketingPlan.title}」吗？`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await deleteDouyinMarketingPlan(latestMarketingPlan.id, activeBrandId);
      setMarketingPlanWorkspace(nextWorkspace);
      setNotice("抖音营销策划方案已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "抖音营销策划方案删除失败。");
    } finally {
      setIsDeleting(false);
    }
  }, [activeBrandId, canEditMarketingPlan, latestMarketingPlan]);

  const handleHotTopicDateChange = useCallback(async (date: string) => {
    setSelectedHotTopicDate(date);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await getDouyinHotTopicCandidatesWorkspace(activeBrandId, date);
      setHotTopicWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "热点日期切换失败。");
    }
  }, [activeBrandId]);

  const handleGenerateHotTopics = useCallback(async () => {
    if (!canEditHotTopics) {
      setErrorMessage("当前账号只有查看权限，不能生成热点找选题。");
      return;
    }
    if (!selectedHotTopicDate) {
      setErrorMessage("请先选择一个热点日期。");
      return;
    }

    setIsGeneratingHotTopics(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinHotTopicCandidates(selectedHotTopicDate, activeBrandId);
      setHotTopicWorkspace(nextWorkspace);
      setNotice("热点找选题任务已提交，系统正在后台生成。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "热点找选题提交失败。");
    } finally {
      setIsGeneratingHotTopics(false);
    }
  }, [activeBrandId, canEditHotTopics, selectedHotTopicDate]);

  const handleToggleTopic = useCallback((topicId: string, checked: boolean) => {
    setSelectedTopicIds((current) => {
      if (checked) {
        return current.includes(topicId) ? current : [...current, topicId];
      }
      return current.filter((item) => item !== topicId);
    });
  }, []);

  const saveTopicLibrary = useCallback(async (items: DouyinTopicLibraryItem[], noticeText: string) => {
    setIsSavingTopicLibrary(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinTopicLibrary(items, activeBrandId);
      setHotTopicWorkspace(nextWorkspace);
      setOriginalCopyWorkspace((current) => ({
        ...current,
        topicOptions: nextWorkspace.topicLibrary || [],
      }));
      setNotice(noticeText);
      return nextWorkspace;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "选题库保存失败。");
      return undefined;
    } finally {
      setIsSavingTopicLibrary(false);
    }
  }, [activeBrandId]);

  const handleAddSelectedTopics = useCallback(async () => {
    if (!canEditTopicLibrary) {
      setErrorMessage("当前账号只有查看权限，不能写入选题库。");
      return;
    }
    if (!latestHotTopicResult?.items?.length || !selectedTopicIds.length) {
      setErrorMessage("请先勾选至少一个热点选题。");
      return;
    }
    const existing = hotTopicWorkspace.topicLibrary || [];
    const existingKeys = new Set(existing.map((item) => item.topicContent.trim().toLowerCase()));
    const nextItems = [...existing];
    let addedCount = 0;
    for (const item of latestHotTopicResult.items) {
      if (!selectedTopicIds.includes(item.id)) {
        continue;
      }
      const dedupeKey = item.title.trim().toLowerCase();
      if (!dedupeKey || existingKeys.has(dedupeKey)) {
        continue;
      }
      existingKeys.add(dedupeKey);
      addedCount += 1;
      nextItems.unshift({
        id: `topic-library-${item.id}`,
        topicContent: item.title,
        topicDescription: item.description?.trim() || latestHotTopicResult.summary || `来自 ${selectedHotTopicDate} 热点找选题结果`,
        selectedAt: new Date().toISOString(),
        source: "GENERATED",
        sourceDate: selectedHotTopicDate || undefined,
      });
    }
    if (!addedCount) {
      setNotice("勾选选题已在当前品牌选题库中，无需重复加入。");
      return;
    }
    const nextWorkspace = await saveTopicLibrary(nextItems, `已加入 ${addedCount} 条选题到当前品牌选题库。`);
    if (nextWorkspace) {
      setSelectedTopicIds([]);
    }
  }, [
    canEditTopicLibrary,
    hotTopicWorkspace.topicLibrary,
    latestHotTopicResult,
    saveTopicLibrary,
    selectedHotTopicDate,
    selectedTopicIds,
  ]);

  const handleAddManualTopic = useCallback(async (payload: { topicContent: string; topicDescription: string }) => {
    if (!canEditTopicLibrary) {
      setErrorMessage("当前账号只有查看权限，不能写入选题库。");
      return;
    }
    const topicContent = payload.topicContent.trim();
    if (!topicContent) {
      setErrorMessage("请输入选题内容。");
      return;
    }
    const existing = hotTopicWorkspace.topicLibrary || [];
    const exists = existing.some((item) => item.topicContent.trim().toLowerCase() === topicContent.toLowerCase());
    if (exists) {
      setNotice("相同选题已存在于当前品牌选题库中。");
      return;
    }
    await saveTopicLibrary([
      {
        id: `topic-library-manual-${Date.now()}`,
        topicContent,
        topicDescription: payload.topicDescription.trim() || "手动添加选题",
        selectedAt: new Date().toISOString(),
        source: "MANUAL",
      },
      ...existing,
    ], "选题已添加到当前品牌选题库。");
  }, [canEditTopicLibrary, hotTopicWorkspace.topicLibrary, saveTopicLibrary]);

  const handleDeleteTopic = useCallback(async (topicId: string) => {
    if (!canEditTopicLibrary) {
      setErrorMessage("当前账号只有查看权限，不能修改选题库。");
      return;
    }
    const existing = hotTopicWorkspace.topicLibrary || [];
    const nextItems = existing.filter((item) => item.id !== topicId);
    if (nextItems.length === existing.length) {
      setNotice("目标选题不存在或已删除。");
      return;
    }
    await saveTopicLibrary(nextItems, "选题已从当前品牌选题库删除。");
  }, [canEditTopicLibrary, hotTopicWorkspace.topicLibrary, saveTopicLibrary]);

  const handleCreateOriginalCopy = useCallback(async (payload: {
    calendarItemId?: string;
    topicId?: string;
    injectMarketingPlan: boolean;
    copyType: "VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES";
    userRequirement?: string;
  }) => {
    if (!canEditOriginalCopy) {
      setErrorMessage("当前账号只有查看权限，不能生成原创文案。");
      return false;
    }

    setIsSubmittingOriginalCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinOriginalCopy(payload, activeBrandId);
      setOriginalCopyWorkspace(nextWorkspace);
      setNotice("原创文案任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "原创文案提交失败。");
      return false;
    } finally {
      setIsSubmittingOriginalCopy(false);
    }
  }, [activeBrandId, canEditOriginalCopy]);

  const handleUpdateOriginalCopy = useCallback(async (payload: {
    reportId: string;
    title?: string;
    content: string;
  }) => {
    if (!canEditOriginalCopy) {
      setErrorMessage("当前账号只有查看权限，不能修改原创文案。");
      return false;
    }

    setIsSubmittingOriginalCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinOriginalCopy(payload.reportId, {
        title: payload.title,
        content: payload.content,
      }, activeBrandId);
      setOriginalCopyWorkspace(nextWorkspace);
      setNotice("原创文案已修改。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "原创文案修改失败。");
      return false;
    } finally {
      setIsSubmittingOriginalCopy(false);
    }
  }, [activeBrandId, canEditOriginalCopy]);

  const handleDeleteOriginalCopy = useCallback(async (reportId: string) => {
    if (!canEditOriginalCopy) {
      setErrorMessage("当前账号只有查看权限，不能删除原创文案。");
      return false;
    }

    setIsSubmittingOriginalCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await deleteDouyinOriginalCopy(reportId, activeBrandId);
      setOriginalCopyWorkspace(nextWorkspace);
      setNotice("原创文案已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "原创文案删除失败。");
      return false;
    } finally {
      setIsSubmittingOriginalCopy(false);
    }
  }, [activeBrandId, canEditOriginalCopy]);

  const handleCreateRemixCopy = useCallback(async (payload: {
    materialId: string;
    injectBrandProfile: boolean;
    productId?: string;
    injectMarketingPlan: boolean;
    userRequirement?: string;
  }) => {
    if (!canEditRemixCopy) {
      setErrorMessage("当前账号只有查看权限，不能生成二创文案。");
      return false;
    }

    setIsSubmittingRemixCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinRemixCopy(payload, activeBrandId);
      setRemixCopyWorkspace(nextWorkspace);
      setNotice("二创文案任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "二创文案提交失败。");
      return false;
    } finally {
      setIsSubmittingRemixCopy(false);
    }
  }, [activeBrandId, canEditRemixCopy]);

  const handleUpdateRemixCopy = useCallback(async (payload: {
    reportId: string;
    title?: string;
    content: string;
  }) => {
    if (!canEditRemixCopy) {
      setErrorMessage("当前账号只有查看权限，不能修改二创文案。");
      return false;
    }

    setIsSubmittingRemixCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinRemixCopy(payload.reportId, {
        title: payload.title,
        content: payload.content,
      }, activeBrandId);
      setRemixCopyWorkspace(nextWorkspace);
      setNotice("二创文案已修改。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "二创文案修改失败。");
      return false;
    } finally {
      setIsSubmittingRemixCopy(false);
    }
  }, [activeBrandId, canEditRemixCopy]);

  const handleDeleteRemixCopy = useCallback(async (reportId: string) => {
    if (!canEditRemixCopy) {
      setErrorMessage("当前账号只有查看权限，不能删除二创文案。");
      return false;
    }

    setIsSubmittingRemixCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await deleteDouyinRemixCopy(reportId, activeBrandId);
      setRemixCopyWorkspace(nextWorkspace);
      setNotice("二创文案已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "二创文案删除失败。");
      return false;
    } finally {
      setIsSubmittingRemixCopy(false);
    }
  }, [activeBrandId, canEditRemixCopy]);

  const handleCreateVideo = useCallback(async (payload: Parameters<typeof generateDouyinVideoWork>[1]) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成 AI 生视频（故事板）。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinVideoWork(activeBrandId, payload);
      await refreshVideoWorkspace();
      setNotice("AI 生视频（故事板）任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频（故事板）提交失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleUpdateVideo = useCallback(async (payload: {
    workId: string;
    title?: string;
    content?: string;
    storyboardPrompt?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能修改 AI 生视频（故事板）。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await updateDouyinVideoWork(activeBrandId, payload.workId, payload);
      await refreshVideoWorkspace();
      setNotice("AI 生视频（故事板）已更新。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频（故事板）更新失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleDeleteVideo = useCallback(async (workId: string) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能删除 AI 生视频（故事板）。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinVideoWork(activeBrandId, workId);
      await refreshVideoWorkspace();
      setNotice("AI 生视频（故事板）已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频（故事板）删除失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleRegenerateVideoStoryboard = useCallback(async (payload: {
    workId: string;
    storyboardPrompt?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能修改故事板。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await regenerateDouyinVideoStoryboard(activeBrandId, payload.workId, { storyboardPrompt: payload.storyboardPrompt });
      await refreshVideoWorkspace();
      setNotice("故事板重生成任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "故事板重生成失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleGenerateVideo = useCallback(async (payload: {
    workId: string;
    customVideoModelName?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成短视频。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await continueDouyinVideoGeneration(activeBrandId, payload.workId, { customVideoModelName: payload.customVideoModelName });
      await refreshVideoWorkspace();
      setNotice("短视频生成任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "短视频生成失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleRecoverVideo = useCallback(async (payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能找回视频结果。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await recoverDouyinVideoGeneration(activeBrandId, payload);
      await refreshVideoWorkspace();
      setNotice("视频结果找回完成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "找回视频结果失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleCreateDirectVideo = useCallback(async (payload: Parameters<typeof generateDouyinDirectVideoWork>[1]) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成 AI 生视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinDirectVideoWork(activeBrandId, payload);
      await refreshDirectVideoWorkspace();
      setNotice("AI 生视频任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频提交失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleUpdateDirectVideo = useCallback(async (payload: {
    workId: string;
    title?: string;
    content?: string;
  }) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能修改 AI 生视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await updateDouyinDirectVideoWork(activeBrandId, payload.workId, payload);
      await refreshDirectVideoWorkspace();
      setNotice("AI 生视频提示词已更新。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频提示词更新失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleDeleteDirectVideo = useCallback(async (workId: string) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能删除 AI 生视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinDirectVideoWork(activeBrandId, workId);
      await refreshDirectVideoWorkspace();
      setNotice("AI 生视频已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频删除失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleGenerateDirectVideo = useCallback(async (payload: {
    workId: string;
    customVideoModelName?: string;
  }) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成短视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await continueDouyinDirectVideoGeneration(activeBrandId, payload.workId, { customVideoModelName: payload.customVideoModelName });
      await refreshDirectVideoWorkspace();
      setNotice("短视频生成任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "短视频生成失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleRecoverDirectVideo = useCallback(async (payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  }) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能找回视频结果。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await recoverDouyinDirectVideoGeneration(activeBrandId, payload);
      await refreshDirectVideoWorkspace();
      setNotice("视频结果找回完成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "找回视频结果失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleCreateDigitalHuman = useCallback(async (payload: Parameters<typeof generateDouyinDigitalHumanVideoWork>[1]) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能生成数字人视频。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinDigitalHumanVideoWork(activeBrandId, payload);
      await refreshDigitalHumanWorkspace();
      setNotice("数字人视频任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人视频提交失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleRecoverDigitalHuman = useCallback(async (payload: {
    workId?: string;
    providerTaskId?: string;
  }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能找回数字人视频结果。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await recoverDouyinDigitalHumanVideo(activeBrandId, payload);
      await refreshDigitalHumanWorkspace();
      setNotice("数字人视频结果找回完成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "找回数字人视频结果失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleDeleteDigitalHuman = useCallback(async (workId: string) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能删除数字人作品。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinDigitalHumanVideoWork(activeBrandId, workId);
      await refreshDigitalHumanWorkspace();
      setNotice("数字人作品已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人作品删除失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleDigitalHumanTemplateTagChange = useCallback(async (tagId: string) => {
    setErrorMessage("");
    setNotice("");
    try {
      await loadDigitalHumanTemplates({
        page: 1,
        size: digitalHumanTemplatePageInfo?.size || 24,
        tagId,
      });
      setNotice(tagId ? "数字人模板已按标签筛选。" : "已恢复全部数字人模板。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人模板刷新失败。");
    }
  }, [digitalHumanTemplatePageInfo?.size, loadDigitalHumanTemplates]);

  const handleLoadMoreDigitalHumanTemplates = useCallback(async () => {
    if (!digitalHumanTemplatePageInfo || digitalHumanTemplatePageInfo.page >= digitalHumanTemplatePageInfo.totalPage) {
      return;
    }
    setErrorMessage("");
    setNotice("");
    try {
      await loadDigitalHumanTemplates({
        page: digitalHumanTemplatePageInfo.page + 1,
        size: digitalHumanTemplatePageInfo.size,
        tagId: digitalHumanTemplateTagId,
      }, true);
      setNotice("已加载更多数字人模板。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载更多数字人模板失败。");
    }
  }, [digitalHumanTemplatePageInfo, digitalHumanTemplateTagId, loadDigitalHumanTemplates]);

  const openGeneratedVideoPreview = useCallback((item: DouyinVideoWorkRecord | DouyinDirectVideoWorkRecord | DouyinDigitalHumanVideoWorkRecord) => {
    if (item.videoUrl) {
      setMaterialLightbox({
        title: item.title,
        url: item.videoUrl,
        type: "VIDEO",
      });
      return;
    }
    const storyboardImageUrl = "storyboardImageUrl" in item ? item.storyboardImageUrl : undefined;
    const referenceImageUrl = "referenceImageUrl" in item ? item.referenceImageUrl : undefined;
    if (storyboardImageUrl || item.coverImageUrl || referenceImageUrl) {
      setMaterialLightbox({
        title: storyboardImageUrl ? `${item.title} 故事板` : `${item.title} 参考图`,
        url: storyboardImageUrl || item.coverImageUrl || referenceImageUrl || "",
        type: "IMAGE",
      });
    }
  }, []);

  const shiftMaterialPreview = useCallback((materialId: string, total: number, delta: number) => {
    if (!materialId || total <= 0) {
      return;
    }
    setMaterialPreviewIndexMap((current) => {
      const nextIndex = ((current[materialId] ?? 0) + delta + total) % total;
      return {
        ...current,
        [materialId]: nextIndex,
      };
    });
  }, []);

  const openMaterialLightbox = useCallback((payload: MediaLightboxState) => {
    setMaterialLightbox(payload);
  }, []);

  return (
    <main className="workspace-page workspace-page--strategy">
      <section className="workspace-card workspace-card--bleed strategy-page-card">
        <div className="strategy-layout xiaohongshu-layout">
          {!hasWorkspaceAccess ? (
            <div className="strategy-content-panel xiaohongshu-content-panel">
              <section className="dashboard-hero xiaohongshu-hero">
                <div>
                  <h1>当前无权限进入抖音工作区</h1>
                  <p>当前账号未获得抖音板块的查看权限，请联系管理员在团队权限设置中为对应板块勾选可见权限。</p>
                  <div className="workspace-toolbar top-toolbar">
                    <div className="workspace-status">
                      <span className="archive-pill status-pending">当前板块只读</span>
                      <span className="status-text error-text">当前账号没有抖音板块的查看权限，请联系管理员开通后再进入。</span>
                    </div>
                    <div className="personal-actions">
                      <Link href="/brand-growth" className="secondary-button">
                        前往品牌增长策略
                      </Link>
                      <Link href="/personal-center" className="primary-button">
                        返回个人中心
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <>
              <aside className="strategy-level-panel strategy-level-panel--directory">
                <div className="strategy-level-button-list">
                  {visibleSections.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`strategy-level-button ${item.key === activeSection ? "is-active" : ""}`}
                      onClick={() => setActiveSection(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="strategy-content-panel xiaohongshu-content-panel">
                <section className="dashboard-hero xiaohongshu-hero">
                  <div>
                    <h1>{heroTitle}</h1>
                    <p>{heroDescription}</p>
                    <div className="workspace-toolbar top-toolbar">
                      <div className="workspace-status">
                        <span className={`archive-pill ${canEditCurrentSection ? "status-ready" : "status-pending"}`}>
                          {canEditCurrentSection ? "当前板块可编辑" : "当前板块只读"}
                        </span>
                        <span className={`archive-pill ${loadState === "api" ? "status-ready" : "status-in_progress"}`}>
                          {loadState === "api" ? "接口数据" : loadState === "seed" ? "演示数据" : "加载中"}
                        </span>
                        {isLoading ? <span className="status-text">正在加载抖音工作台...</span> : null}
                        {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
                        {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
                      </div>
                      <div className="personal-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void loadWorkspace()}
                          disabled={isLoading || isGenerating || isGeneratingHotTopics || isSubmittingOriginalCopy || isSubmittingRemixCopy || isSubmittingVideo || isSubmittingDirectVideo || isSubmittingDigitalHuman || isSaving || isDeleting}
                        >
                          刷新数据
                        </button>
                        <Link href="/brand-growth" className="secondary-button">
                          回到品牌增长策略
                        </Link>
                        <Link href="/personal-center" className="primary-button">
                          查看个人中心
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                {activeSection === "assets" ? (
                  <DouyinAssetsWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    items={materialWorks}
                    selectedMaterialId={selectedMaterialId}
                    previewIndexMap={materialPreviewIndexMap}
                    onRefresh={() => loadWorkspace()}
                    onSelectMaterial={setSelectedMaterialId}
                    onShiftPreview={shiftMaterialPreview}
                    onOpenLightbox={openMaterialLightbox}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "hotTopics" ? (
                  <DouyinHotTopicCandidatesWorkspacePanel
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading || isGeneratingHotTopics}
                    canEdit={canEditHotTopics}
                    canEditTopicLibrary={canEditTopicLibrary}
                    canViewTopicLibrary={canViewTopicLibrary}
                    availableDates={hotTopicWorkspace.availableDates}
                    selectedDate={selectedHotTopicDate}
                    latest={latestHotTopicResult}
                    latestTask={latestHotTopicTask}
                    selectedTopicIds={selectedTopicIds}
                    isSavingTopicLibrary={isSavingTopicLibrary}
                    onRefresh={async () => {
                      await refreshHotTopicWorkspace(selectedHotTopicDate);
                    }}
                    onDateChange={handleHotTopicDateChange}
                    onGenerate={handleGenerateHotTopics}
                    onToggleTopic={handleToggleTopic}
                    onAddSelectedTopics={handleAddSelectedTopics}
                    onOpenTopicLibrary={canViewTopicLibrary ? () => setActiveSection("topicLibrary") : undefined}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "topicLibrary" ? (
                  <DouyinTopicLibraryWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canEdit={canEditTopicLibrary}
                    items={hotTopicWorkspace.topicLibrary || []}
                    isSaving={isSavingTopicLibrary}
                    onRefresh={async () => {
                      await refreshHotTopicWorkspace();
                    }}
                    onAddManualTopic={handleAddManualTopic}
                    onDeleteTopic={handleDeleteTopic}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "originalCopy" ? (
                  <DouyinOriginalCopyWorkspacePanel
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingOriginalCopy}
                    canEdit={canEditOriginalCopy}
                    history={originalCopyWorkspace.history}
                    latestTask={originalCopyWorkspace.latestTask}
                    calendarOptions={originalCopyWorkspace.calendarOptions.map((item) => ({ id: item.id, label: item.label }))}
                    topicOptions={originalCopyWorkspace.topicOptions.map((item) => ({ id: item.id, label: item.topicContent }))}
                    hasMarketingPlan={originalCopyWorkspace.hasMarketingPlan}
                    marketingPlanTitle={originalCopyWorkspace.marketingPlanTitle}
                    onRefresh={async () => {
                      await refreshOriginalCopyWorkspace();
                    }}
                    onCreate={handleCreateOriginalCopy}
                    onUpdate={handleUpdateOriginalCopy}
                    onDelete={handleDeleteOriginalCopy}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "remixCopy" ? (
                  <DouyinRemixCopyWorkspacePanel
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingRemixCopy}
                    canEdit={canEditRemixCopy}
                    history={remixCopyWorkspace.history}
                    latestTask={remixCopyWorkspace.latestTask}
                    materialOptions={remixCopyWorkspace.materialOptions.map((item) => ({ id: item.id, label: item.title }))}
                    productOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    hasMarketingPlan={remixCopyWorkspace.hasMarketingPlan}
                    marketingPlanTitle={remixCopyWorkspace.marketingPlanTitle}
                    onRefresh={async () => {
                      await refreshRemixCopyWorkspace();
                    }}
                    onCreate={handleCreateRemixCopy}
                    onUpdate={handleUpdateRemixCopy}
                    onDelete={handleDeleteRemixCopy}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "video" ? (
                  <DouyinVideoStoryboardWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingVideo}
                    canEdit={canEditVideo}
                    items={videoWorks}
                    calendarOptions={originalCopyWorkspace.calendarOptions.map((item) => ({ id: item.id, label: item.label }))}
                    productOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    materialOptions={materialWorks.map((item) => ({ id: item.id, label: item.title, videoUrl: item.videoUrl }))}
                    videoProviderOptions={videoProviderOptions}
                    storyboardImageModelOptions={storyboardImageModelOptions}
                    hasMarketingPlan={hasVideoMarketingPlan}
                    marketingPlanTitle={videoMarketingPlanTitle}
                    onRefresh={async () => {
                      await refreshVideoWorkspace();
                    }}
                    onPreview={openGeneratedVideoPreview}
                    onCreate={handleCreateVideo}
                    onUpdate={handleUpdateVideo}
                    onDelete={handleDeleteVideo}
                    onRegenerateStoryboard={handleRegenerateVideoStoryboard}
                    onGenerateVideo={handleGenerateVideo}
                    onRecoverVideo={handleRecoverVideo}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "videoDirect" ? (
                  <DouyinDirectVideoWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingDirectVideo}
                    canEdit={canEditDirectVideo}
                    items={directVideoWorks}
                    calendarOptions={originalCopyWorkspace.calendarOptions.map((item) => ({ id: item.id, label: item.label }))}
                    productOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    materialOptions={materialWorks.map((item) => ({ id: item.id, label: item.title, videoUrl: item.videoUrl }))}
                    videoProviderOptions={directVideoProviderOptions}
                    hasMarketingPlan={hasVideoMarketingPlan}
                    marketingPlanTitle={videoMarketingPlanTitle}
                    onRefresh={async () => {
                      await refreshDirectVideoWorkspace();
                    }}
                    onPreview={openGeneratedVideoPreview}
                    onCreate={handleCreateDirectVideo}
                    onUpdate={handleUpdateDirectVideo}
                    onDelete={handleDeleteDirectVideo}
                    onGenerateVideo={handleGenerateDirectVideo}
                    onRecoverVideo={handleRecoverDirectVideo}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "digitalHuman" ? (
                  <DouyinDigitalHumanWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingDigitalHuman}
                    canEdit={canEditDigitalHuman}
                    items={digitalHumanWorks}
                    templateTagGroups={digitalHumanTemplateTags}
                    templates={digitalHumanTemplates}
                    templatePageInfo={digitalHumanTemplatePageInfo}
                    activeTagId={digitalHumanTemplateTagId}
                    isTemplateLoading={isDigitalHumanTemplateLoading}
                    onRefresh={async () => {
                      await refreshDigitalHumanWorkspace();
                    }}
                    onTemplateTagChange={handleDigitalHumanTemplateTagChange}
                    onLoadMoreTemplates={handleLoadMoreDigitalHumanTemplates}
                    onPreview={openGeneratedVideoPreview}
                    onCreate={handleCreateDigitalHuman}
                    onRecoverVideo={handleRecoverDigitalHuman}
                    onDelete={handleDeleteDigitalHuman}
                    formatDateTime={formatDateTime}
                  />
                ) : (
                <article className="workspace-panel strategy-page-card">
                  <div className="strategy-card-toolbar">
                    <div>
                      <strong>{currentSection.label}</strong>
                      <p className="text-xs text-slate-500 mt-2">{currentSection.description}</p>
                    </div>
                    <div className="strategy-inline-actions">
                      {latestMarketingPlan ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void handleDelete()}
                          disabled={!canEditMarketingPlan || isDeleting || isGenerating || isTaskActive}
                        >
                          {isDeleting ? "删除中..." : "删除"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleGenerate()}
                        disabled={!canEditMarketingPlan || isGenerating || !canGenerateMarketingPlan || isTaskActive}
                      >
                        {isGenerating ? "提交中..." : isTaskActive ? "后台生成中..." : latestMarketingPlan ? "重新生成" : "一键生成"}
                      </button>
                    </div>
                  </div>

                  <article className="light-data-panel report-editor-panel report-editor-panel--compact">
                    <div className="report-editor-head">
                      <div>
                        <strong>{latestMarketingPlan?.title || "抖音营销策划方案"}</strong>
                      </div>
                      <div className="report-editor-actions">
                        <span className={`archive-pill ${canGenerateMarketingPlan ? "status-ready" : "status-in_progress"}`}>
                          {canGenerateMarketingPlan ? "已满足生成条件" : "等待前置输入"}
                        </span>
                        {latestTask ? (
                          <span className={`archive-pill ${getTaskStatusClass(latestTask.taskStatus)}`}>{getTaskStatusText(latestTask)}</span>
                        ) : null}
                        {latestMarketingPlan?.generatedAt ? (
                          <span className="archive-pill status-ready">{formatDateTime(latestMarketingPlan.generatedAt)}</span>
                        ) : null}
                        {latestMarketingPlan?.modelName ? <span className="archive-pill status-pending">{latestMarketingPlan.modelName}</span> : null}
                        <span className={`archive-pill ${canEditMarketingPlan ? "status-ready" : "status-pending"}`}>
                          {canEditCurrentSection ? "当前板块可编辑" : "当前板块只读"}
                        </span>
                        {latestMarketingPlan ? (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void handleSave()}
                            disabled={!canEditMarketingPlan || isSaving || isGenerating || isDeleting || isTaskActive}
                          >
                            {isSaving ? "保存中..." : "保存报告"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {!canGenerateMarketingPlan ? <div className="report-inline-tip">请先完成品牌增长报告、半年营销规划，并确保抖音采集页已有账号或作品数据。</div> : null}
                    {isTaskActive ? (
                      <div className="report-inline-tip">
                        {latestTask?.taskStatus === "QUEUED"
                          ? "正在排队生成，页面会自动刷新结果。"
                          : latestTask?.phaseText
                            ? `${latestTask.phaseText}${latestTask.phaseIndex && latestTask.phaseTotal ? `（${latestTask.phaseIndex}/${latestTask.phaseTotal}）` : ""}`
                            : "正在后台生成，完成后会自动刷新到编辑区。"}
                      </div>
                    ) : null}
                    {!canEditMarketingPlan ? <div className="report-inline-tip">当前账号只有查看权限，不能编辑、删除或重新生成该板块内容。</div> : null}

                    {!latestMarketingPlan ? (
                      <div className="empty-state">当前还没有抖音营销策划方案，点击右上角“一键生成”开始。</div>
                    ) : (
                      <div className="report-editor-grid">
                        <label className="report-editor-pane">
                          <span>Markdown 内容</span>
                          <textarea
                            className="report-markdown-textarea"
                            value={marketingPlanDraft}
                            onChange={(event) => setMarketingPlanDraft(event.target.value)}
                            readOnly={!canEditMarketingPlan}
                            placeholder="这里显示并编辑抖音营销策划方案 Markdown 内容"
                          />
                        </label>
                        <article className="report-editor-pane">
                          <span>预览</span>
                          <div className="generated-report-html" dangerouslySetInnerHTML={{ __html: marketingPlanPreviewHtml }} />
                        </article>
                      </div>
                    )}
                  </article>
                </article>
                )}
                <MediaLightbox state={materialLightbox} onClose={() => setMaterialLightbox(null)} />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
