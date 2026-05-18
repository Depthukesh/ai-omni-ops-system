"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatCalendarDate,
  formatCalendarListValue,
  formatCalendarMonthDay,
  formatCalendarOptionalValue,
  formatCalendarWeekday,
  getCalendarFestivalLabel,
} from "./calendar-helpers";
import { formatDateTime } from "./datetime-helpers";
import { buildPublishedPreview } from "./preview-builders";
import {
  getPublishTaskStatusText,
  getPublishTaskSummaryText,
  getTaskStatusClass,
  getWorkPublishTaskLabel,
  getWorkTaskStatusClass,
  getWorkTaskStatusText,
} from "./publish-status-helpers";
import { type PublishableWorkTarget } from "./publish-types";
import { getComposeTaskStatusText, getPhaseTaskStatusText } from "./task-status-text-helpers";
import { findLatestTaskByTypes, isTaskActive, useDelayedTaskPolling } from "./task-polling";
import { useNoteComposerForms } from "./use-note-composer-forms";
import { usePublishFlow } from "./use-publish-flow";
import { useWorkComposerActions } from "./use-work-composer-actions";
import { useWorkEditors } from "./use-work-editors";
import { useWorkMutationActions } from "./use-work-mutation-actions";
import { useWorkspaceSelectionSync } from "./use-workspace-selection-sync";
import { AssetsWorkspace } from "./assets-workspace";
import { CalendarWorkspace } from "./calendar-workspace";
import { renderMarkdownToHtml } from "./markdown-render";
import { MediaLightbox } from "./media-lightbox";
import { OriginalWorkspace, RewriteWorkspace, VideoWorkspace } from "./note-workspaces";
import { PlanWorkspace } from "./plan-workspace";
import { PublishModal } from "./publish-modal";
import { type MediaLightboxState } from "./shared-types";
import {
  buildCollectorMediaProxyUrl,
  getOriginalWorkMediaUrls,
  getPreviewIndex as getMaterialPreviewIndex,
  getRewriteWorkMediaUrls,
} from "./work-media-helpers";
import {
  buildPublishTaskMap,
  getMatchedDraft,
  getRelatedWorks,
  getWorkBaseTitle,
  readTaskWorkKind,
} from "./work-task-helpers";
import { cancelTask, type MediaRecord, type TaskRecord } from "../../../services/personal-center";
import { getMe } from "../../../services/auth";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import {
  getBrandPermissionSettings,
  type BrandPermissionKey,
  type BrandPermissionSettingsRecord,
} from "../../../services/brand-growth";
import {
  annualMarketingPlanSeed,
  deleteXiaohongshuMarketingPlan,
  generateXiaohongshuMarketingCalendar,
  generateXiaohongshuMarketingPlan,
  getAnnualMarketingPlanWorkspace,
  getGrowthReportWorkspace,
  getXiaohongshuMarketingCalendarWorkspace,
  type XiaohongshuMarketingCalendarItem,
  type XiaohongshuMarketingCalendarWorkspace,
  getXiaohongshuMarketingPlanWorkspace,
  growthReportSeed,
  updateXiaohongshuMarketingCalendar,
  updateXiaohongshuMarketingPlan,
  xiaohongshuMarketingPlanSeed,
} from "../../../services/reports";
import {
  buildXiaohongshuPlan,
  getDefaultProduct,
  getDefaultXiaohongshuAccount,
  getXiaohongshuMedia,
  getXiaohongshuTasks,
  getXiaohongshuWorkspace,
  getXiaohongshuWorkspaceSeed,
  type XiaohongshuGoal,
  type XiaohongshuNoteDraft,
  type XiaohongshuTone,
} from "../../../services/xiaohongshu";
import {
  formatXiaohongshuAccountRoleLabel,
  type XiaohongshuAccountRole,
  getXiaohongshuVideoProviders,
  getXiaohongshuVideoWorks,
  getXiaohongshuOriginalReferenceTemplates,
  getXiaohongshuOriginalWorks,
  getXiaohongshuRewriteWorks,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { formatCollaboratorRoleLabel } from "../personal-center/route-helpers";

type XiaohongshuSectionKey = "plan" | "assets" | "calendar" | "original" | "remix" | "video";
const xiaohongshuSections: Array<{ key: XiaohongshuSectionKey; label: string; description: string }> = [
  { key: "plan", label: "营销策划方案", description: "围绕品牌、产品和目标快速生成小红书策划与选题方案。" },
  { key: "assets", label: "素材库", description: "沉淀已生成的笔记、封面、源文件与作品记录。" },
  { key: "calendar", label: "营销日历", description: "按周查看当前内容节奏、发布时间与主题排期。" },
  { key: "original", label: "原创笔记", description: "统一管理原创图文笔记成品，支持新增、编辑、删除与查看配图结果。" },
  { key: "remix", label: "二创笔记", description: "基于已有选题和作品延展二创版本与差异化角度。" },
  { key: "video", label: "视频笔记", description: "把现有主题整理成视频脚本、镜头结构和封面文案。" },
];
const xiaohongshuSectionPermissionMap: Record<XiaohongshuSectionKey, BrandPermissionKey> = {
  plan: "xiaohongshu.plan",
  assets: "xiaohongshu.assets",
  calendar: "xiaohongshu.calendar",
  original: "xiaohongshu.original",
  remix: "xiaohongshu.remix",
  video: "xiaohongshu.video",
};
const originalAccountRoleOptionsByBrandRole: Record<string, XiaohongshuAccountRole[]> = {
  ADMIN: ["BRAND", "STAFF", "TALENT"],
  STAFF: ["STAFF"],
  TALENT: ["TALENT"],
};

const CUSTOM_TOPIC_OPTION = "__CUSTOM__";
const NO_PRODUCT_OPTION = "__NO_PRODUCT__";
const AUTO_IMAGE_COUNT_OPTION = "__AUTO__";
const DEFAULT_VIDEO_PROVIDER_OPTIONS: VideoProviderOptionRecord[] = [
  {
    backendKey: "volcengine_seedance_20",
    label: "Seedance 2.0",
    defaultModel: "doubao-seedance-2-0-260128",
    recommended: true,
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    displayOrder: 10,
  },
];

export default function XiaohongshuPage() {
  const seedWorkspace = useMemo(() => getXiaohongshuWorkspaceSeed(), []);
  const defaultProduct = useMemo(() => getDefaultProduct(seedWorkspace.archive.products), [seedWorkspace.archive.products]);
  const defaultAccount = useMemo(
    () => getDefaultXiaohongshuAccount(seedWorkspace.archive.platformAccounts),
    [seedWorkspace.archive.platformAccounts],
  );
  const defaultPlan = useMemo(
    () =>
      buildXiaohongshuPlan({
        brandName: seedWorkspace.archive.brand.brandName,
        productName: defaultProduct?.productName || "主推产品",
        usageScenario: defaultProduct?.usageScenario || "日常消费",
        goal: "种草曝光",
        tone: "生活方式",
      }),
    [defaultProduct, seedWorkspace.archive.brand.brandName],
  );

  const [workspace, setWorkspace] = useState(seedWorkspace);
  const [growthReportWorkspace, setGrowthReportWorkspace] = useState(growthReportSeed);
  const [annualPlanWorkspace, setAnnualPlanWorkspace] = useState(annualMarketingPlanSeed);
  const [marketingPlanWorkspace, setMarketingPlanWorkspace] = useState(xiaohongshuMarketingPlanSeed);
  const [calendarWorkspace, setCalendarWorkspace] = useState<XiaohongshuMarketingCalendarWorkspace>({ history: [] });
  const [activeSection, setActiveSection] = useState<XiaohongshuSectionKey>("plan");
  const [selectedProductId, setSelectedProductId] = useState(defaultProduct?.id || "");
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount?.id || "");
  const [goal, setGoal] = useState<XiaohongshuGoal>("种草曝光");
  const [tone, setTone] = useState<XiaohongshuTone>("生活方式");
  const [campaignBrief, setCampaignBrief] = useState("围绕门店主推产品做一轮小红书种草，沉淀可复用笔记与封面素材。");
  const [topicIdeas, setTopicIdeas] = useState(defaultPlan.topicIdeas);
  const [noteDrafts, setNoteDrafts] = useState(defaultPlan.noteDrafts);
  const [selectedNoteId, setSelectedNoteId] = useState(defaultPlan.noteDrafts[0]?.id || "");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [originalWorks, setOriginalWorks] = useState<XiaohongshuOriginalWorkRecord[]>([]);
  const [selectedOriginalWorkId, setSelectedOriginalWorkId] = useState("");
  const [deletingOriginalWorkId, setDeletingOriginalWorkId] = useState("");
  const [rewriteWorks, setRewriteWorks] = useState<XiaohongshuRewriteWorkRecord[]>([]);
  const [selectedRewriteWorkId, setSelectedRewriteWorkId] = useState("");
  const [deletingRewriteWorkId, setDeletingRewriteWorkId] = useState("");
  const [videoWorks, setVideoWorks] = useState<XiaohongshuVideoWorkRecord[]>([]);
  const [videoProviderOptions, setVideoProviderOptions] = useState<VideoProviderOptionRecord[]>(DEFAULT_VIDEO_PROVIDER_OPTIONS);
  const [originalReferenceTemplateCategories, setOriginalReferenceTemplateCategories] = useState<
    XhsOriginalReferenceTemplateCategoryRecord[]
  >([]);
  const [originalReferenceTemplateItems, setOriginalReferenceTemplateItems] = useState<XhsOriginalReferenceTemplateRecord[]>([]);
  const [isLoadingOriginalReferenceTemplates, setIsLoadingOriginalReferenceTemplates] = useState(false);
  const [originalReferenceTemplatesError, setOriginalReferenceTemplatesError] = useState("");
  const [selectedVideoWorkId, setSelectedVideoWorkId] = useState("");
  const [deletingVideoWorkId, setDeletingVideoWorkId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialPreviewIndexMap, setMaterialPreviewIndexMap] = useState<Record<string, number>>({});
  const [materialLightbox, setMaterialLightbox] = useState<MediaLightboxState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [brandPermissionSettings, setBrandPermissionSettings] = useState<BrandPermissionSettingsRecord | null>(null);
  const [currentBrandRole, setCurrentBrandRole] = useState("STAFF");
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [isSavingMarketingPlan, setIsSavingMarketingPlan] = useState(false);
  const [isDeletingMarketingPlan, setIsDeletingMarketingPlan] = useState(false);
  const [isEditingMarketingPlan, setIsEditingMarketingPlan] = useState(false);
  const [marketingPlanDraft, setMarketingPlanDraft] = useState("");
  const [selectedCalendarItemId, setSelectedCalendarItemId] = useState("");
  const [isCalendarDetailOpen, setIsCalendarDetailOpen] = useState(false);
  const [isEditingCalendarItem, setIsEditingCalendarItem] = useState(false);
  const [isSavingCalendarItem, setIsSavingCalendarItem] = useState(false);
  const [calendarItemDraft, setCalendarItemDraft] = useState<XiaohongshuMarketingCalendarItem | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed" | "error" | "loading">("loading");
  const [isCancellingTaskId, setIsCancellingTaskId] = useState("");

  const composerForms = useNoteComposerForms({
    defaultProductId: defaultProduct?.id,
    noProductOption: NO_PRODUCT_OPTION,
    autoImageCountOption: AUTO_IMAGE_COUNT_OPTION,
    customTopicOption: CUSTOM_TOPIC_OPTION,
    defaultOriginalAccountRoleValue: currentBrandRole === "TALENT" ? "TALENT" : currentBrandRole === "STAFF" ? "STAFF" : "BRAND",
    availableOriginalAccountRoleValues: originalAccountRoleOptionsByBrandRole[currentBrandRole] || ["BRAND"],
    defaultRewriteAccountRoleValue: currentBrandRole === "TALENT" ? "TALENT" : currentBrandRole === "STAFF" ? "STAFF" : "BRAND",
    availableRewriteAccountRoleValues: originalAccountRoleOptionsByBrandRole[currentBrandRole] || ["BRAND"],
    defaultVideoAccountRoleValue: currentBrandRole === "TALENT" ? "TALENT" : currentBrandRole === "STAFF" ? "STAFF" : "BRAND",
    availableVideoAccountRoleValues: originalAccountRoleOptionsByBrandRole[currentBrandRole] || ["BRAND"],
    defaultVideoProviderValue: videoProviderOptions.find((item) => item.recommended)?.backendKey || videoProviderOptions[0]?.backendKey,
    availableVideoProviderValues: videoProviderOptions.map((item) => item.backendKey),
  });

  const {
    isOriginalModalOpen,
    originalCalendarValue,
    originalCustomTopic,
    originalProductValue,
    originalAccountRoleValue,
    originalImageCountValue,
    originalInjectMarketingPlanValue,
    originalAdditionalInstruction,
    coverReferenceFile,
    galleryReferenceFiles,
    isRewriteModalOpen,
    rewriteMaterialValue,
    rewriteProductValue,
    rewriteAccountRoleValue,
    rewriteInjectMarketingPlanValue,
    rewriteAdditionalInstruction,
    isVideoModalOpen,
    videoCalendarValue,
    videoCustomTopic,
    videoProductValue,
    videoMaterialValue,
    videoAccountRoleValue,
    videoReferenceImageFile,
    videoKindValue,
    videoCopyAdditionalInstruction,
    videoProviderValue,
    videoCustomProviderValue,
    videoCustomModelName,
    videoDurationValue,
    videoInjectMarketingPlanValue,
    videoAdditionalInstruction,
    customVideoProviderOption,
    setOriginalCalendarValue,
    setOriginalCustomTopic,
    setOriginalProductValue,
    setOriginalAccountRoleValue,
    setOriginalImageCountValue,
    setOriginalInjectMarketingPlanValue,
    setOriginalAdditionalInstruction,
    setCoverReferenceFile,
    setGalleryReferenceFiles,
    setRewriteMaterialValue,
    setRewriteProductValue,
    setRewriteAccountRoleValue,
    setRewriteInjectMarketingPlanValue,
    setRewriteAdditionalInstruction,
    setVideoCalendarValue,
    setVideoCustomTopic,
    setVideoProductValue,
    setVideoMaterialValue,
    setVideoAccountRoleValue,
    setVideoReferenceImageFile,
    setVideoKindValue,
    setVideoCopyAdditionalInstruction,
    setVideoProviderValue,
    setVideoCustomProviderValue,
    setVideoCustomModelName,
    setVideoDurationValue,
    setVideoInjectMarketingPlanValue,
    setVideoAdditionalInstruction,
    resetOriginalComposer,
    openOriginalModal,
    closeOriginalModal,
    resetRewriteComposer,
    openRewriteModal,
    closeRewriteModal,
    resetVideoComposer,
    openVideoModal,
    closeVideoModal,
  } = composerForms;

  const workEditors = useWorkEditors();
  const {
    editingOriginalWorkId,
    editingOriginalTitle,
    editingOriginalContent,
    savingOriginalWorkId,
    editingRewriteWorkId,
    editingRewriteTitle,
    editingRewriteContent,
    savingRewriteWorkId,
    editingVideoWorkId,
    editingVideoTitle,
    editingVideoContent,
    editingVideoStoryboardPrompt,
    savingVideoWorkId,
    setEditingOriginalTitle,
    setEditingOriginalContent,
    setSavingOriginalWorkId,
    setEditingRewriteTitle,
    setEditingRewriteContent,
    setSavingRewriteWorkId,
    setEditingVideoTitle,
    setEditingVideoContent,
    setEditingVideoStoryboardPrompt,
    setSavingVideoWorkId,
    startEditOriginalWork,
    cancelEditOriginalWork: handleCancelEditOriginalWork,
    startEditRewriteWork,
    cancelEditRewriteWork: handleCancelEditRewriteWork,
    startEditVideoWork,
    cancelEditVideoWork: handleCancelEditVideoWork,
  } = workEditors;

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    const latestPlan = marketingPlanWorkspace.latest;
    setMarketingPlanDraft(latestPlan?.reportMarkdown || "");
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.generatedAt]);

  useEffect(() => {
    setEditingVideoStoryboardPrompt(videoSelectedWork?.storyboardPrompt || "");
  }, [setEditingVideoStoryboardPrompt, selectedVideoWorkId]);

  const visibleSections = useMemo(() => {
    const permissionMap = brandPermissionSettings?.currentUserPermissions;
    if (!permissionMap) {
      return xiaohongshuSections;
    }
    return xiaohongshuSections.filter((item) => permissionMap[xiaohongshuSectionPermissionMap[item.key]]?.view);
  }, [brandPermissionSettings]);

  const originalAccountRoleOptions = useMemo(() => {
    const values = originalAccountRoleOptionsByBrandRole[currentBrandRole] || ["BRAND"];
    return values.map((value) => ({
      value,
      label: formatXiaohongshuAccountRoleLabel(value),
    }));
  }, [currentBrandRole]);

  useEffect(() => {
    if (!visibleSections.length) {
      return;
    }
    if (!visibleSections.some((item) => item.key === activeSection)) {
      setActiveSection(visibleSections[0].key);
    }
  }, [activeSection, visibleSections]);

  const pollingOriginalTask = findLatestTaskByTypes(workspace.tasks, "XHS_ORIGINAL_NOTE");
  const pollingRewriteTask = findLatestTaskByTypes(workspace.tasks, "XHS_REWRITE_NOTE");
  const pollingVideoTask = findLatestTaskByTypes(workspace.tasks, "XHS_VIDEO_NOTE");
  const pollingPublishTask = findLatestTaskByTypes(workspace.tasks, ["XHS_PUBLISH_MOBILE_DRAFT", "XHS_PUBLISH_DESKTOP_DRAFT"]);

  useDelayedTaskPolling({
    active: isTaskActive(marketingPlanWorkspace.latestTask?.taskStatus),
    updatedAt: marketingPlanWorkspace.latestTask?.updatedAt,
    onPoll: () => refreshMarketingPlanWorkspace(true),
  });

  useDelayedTaskPolling({
    active: isTaskActive(calendarWorkspace.latestTask?.taskStatus),
    updatedAt: calendarWorkspace.latestTask?.updatedAt,
    onPoll: () => refreshCalendarWorkspace(true),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingOriginalTask?.taskStatus),
    updatedAt: pollingOriginalTask?.updatedAt,
    onPoll: () => loadWorkspace(),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingRewriteTask?.taskStatus),
    updatedAt: pollingRewriteTask?.updatedAt,
    onPoll: () => loadWorkspace(),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingVideoTask?.taskStatus),
    updatedAt: pollingVideoTask?.updatedAt,
    onPoll: () => loadWorkspace(),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingPublishTask?.taskStatus),
    updatedAt: pollingPublishTask?.updatedAt,
    onPoll: () => loadWorkspace(),
  });

  async function resolveActiveBrandId(fallbackBrandId: string) {
    const me = await getMe().catch(() => null);
    return me?.currentBrandId || me?.brands?.[0]?.id || getStoredCurrentBrandId(fallbackBrandId) || fallbackBrandId;
  }

  async function loadWorkspace(options?: { preserveMessages?: boolean }) {
    const activeBrandId = await resolveActiveBrandId(workspace.archive.brand.id);
    setIsLoading(true);
    setDataSource("loading");
    setIsLoadingOriginalReferenceTemplates(true);
    setOriginalReferenceTemplatesError("");
    if (!options?.preserveMessages) {
      setNotice("");
      setErrorMessage("");
    }

    const permissionSettingsResult = await getBrandPermissionSettings(activeBrandId);
    const permissionMap = permissionSettingsResult.currentUserPermissions;
    const hasAnyXiaohongshuViewPermission = Object.entries(permissionMap).some(
      ([key, flags]) => key.startsWith("xiaohongshu.") && Boolean(flags.view),
    );
    setBrandPermissionSettings(permissionSettingsResult);
    setCurrentBrandRole(permissionSettingsResult.currentUserRole);

    if (!hasAnyXiaohongshuViewPermission) {
      setHasWorkspaceAccess(false);
      setDataSource("api");
      setIsLoading(false);
      setIsLoadingOriginalReferenceTemplates(false);
      setErrorMessage("当前账号没有小红书板块的查看权限，请联系管理员在团队权限设置中开启对应板块后再进入。");
      return;
    }

    setHasWorkspaceAccess(true);
    const canViewPlan = Boolean(permissionMap["xiaohongshu.plan"]?.view);
    const canViewCalendar = Boolean(permissionMap["xiaohongshu.calendar"]?.view);
    const canViewOriginal = Boolean(permissionMap["xiaohongshu.original"]?.view);
    const canViewRemix = Boolean(permissionMap["xiaohongshu.remix"]?.view);
    const canViewVideo = Boolean(permissionMap["xiaohongshu.video"]?.view);
    const shouldFetchMarketingPlan = canViewPlan || canViewCalendar || canViewOriginal || canViewRemix || canViewVideo;
    const shouldFetchCalendar = canViewCalendar || canViewOriginal || canViewVideo;

    const [
      workspaceResult,
      growthReportResult,
      annualPlanResult,
      marketingPlanResult,
      calendarResult,
      originalWorksResult,
      rewriteWorksResult,
      videoWorksResult,
      videoProvidersResult,
      referenceTemplatesResult,
    ] =
      await Promise.allSettled([
      getXiaohongshuWorkspace(),
      getGrowthReportWorkspace(),
      getAnnualMarketingPlanWorkspace(),
      shouldFetchMarketingPlan ? getXiaohongshuMarketingPlanWorkspace() : Promise.resolve(xiaohongshuMarketingPlanSeed),
      shouldFetchCalendar ? getXiaohongshuMarketingCalendarWorkspace() : Promise.resolve({ history: [] } as XiaohongshuMarketingCalendarWorkspace),
      canViewOriginal ? getXiaohongshuOriginalWorks(activeBrandId) : Promise.resolve({ items: [] as XiaohongshuOriginalWorkRecord[] }),
      canViewRemix ? getXiaohongshuRewriteWorks(activeBrandId) : Promise.resolve({ items: [] as XiaohongshuRewriteWorkRecord[] }),
      canViewVideo ? getXiaohongshuVideoWorks(activeBrandId) : Promise.resolve({ items: [] as XiaohongshuVideoWorkRecord[] }),
      canViewVideo ? getXiaohongshuVideoProviders(activeBrandId) : Promise.resolve({ items: DEFAULT_VIDEO_PROVIDER_OPTIONS }),
      canViewOriginal
        ? getXiaohongshuOriginalReferenceTemplates()
        : Promise.resolve({ categories: [] as XhsOriginalReferenceTemplateCategoryRecord[], items: [] as XhsOriginalReferenceTemplateRecord[] }),
    ]);

    const messages: string[] = [];

    if (workspaceResult.status === "fulfilled") {
      const data = workspaceResult.value;
      setWorkspace(data);
      setDataSource("api");
      const nextProduct = getDefaultProduct(data.archive.products);
      const nextAccount = getDefaultXiaohongshuAccount(data.archive.platformAccounts);
      setSelectedProductId(nextProduct?.id || "");
      setSelectedAccountId(nextAccount?.id || "");

      const nextPlan = buildXiaohongshuPlan({
        brandName: data.archive.brand.brandName,
        productName: nextProduct?.productName || "主推产品",
        usageScenario: nextProduct?.usageScenario || "日常消费",
        goal,
        tone,
      });
      setTopicIdeas(nextPlan.topicIdeas);
      setNoteDrafts(nextPlan.noteDrafts);
      setSelectedNoteId(nextPlan.noteDrafts[0]?.id || "");
    } else {
      messages.push("小红书工作台接口暂不可用。页面保留当前数据，不再回退到演示数据。");
    }

    if (growthReportResult.status === "fulfilled") {
      setGrowthReportWorkspace(growthReportResult.value);
    } else {
      messages.push("品牌增长报告读取失败。");
    }

    if (annualPlanResult.status === "fulfilled") {
      setAnnualPlanWorkspace(annualPlanResult.value);
    } else {
      messages.push("半年营销规划读取失败。");
    }

    if (marketingPlanResult.status === "fulfilled") {
      setMarketingPlanWorkspace(marketingPlanResult.value);
      if (marketingPlanResult.value.latestTask?.taskStatus === "FAILED" && marketingPlanResult.value.latestTask.errorMessage) {
        messages.push(`小红书营销策划方案生成失败：${marketingPlanResult.value.latestTask.errorMessage}`);
      }
    } else {
      messages.push("小红书营销策划方案读取失败。");
    }

    if (calendarResult.status === "fulfilled") {
      setCalendarWorkspace(calendarResult.value);
      if (calendarResult.value.latestTask?.taskStatus === "FAILED" && calendarResult.value.latestTask.errorMessage) {
        messages.push(`营销日历生成失败：${calendarResult.value.latestTask.errorMessage}`);
      }
    } else {
      messages.push("营销日历读取失败。");
    }

    if (originalWorksResult.status === "fulfilled") {
      setOriginalWorks(originalWorksResult.value.items);
    } else {
      messages.push("原创笔记作品读取失败。");
    }

    if (rewriteWorksResult.status === "fulfilled") {
      setRewriteWorks(rewriteWorksResult.value.items);
    } else {
      messages.push("二创笔记作品读取失败。");
    }

    if (videoWorksResult.status === "fulfilled") {
      setVideoWorks(videoWorksResult.value.items);
    } else {
      messages.push("视频笔记作品读取失败。");
    }

    if (videoProvidersResult.status === "fulfilled" && videoProvidersResult.value.items.length) {
      setVideoProviderOptions(videoProvidersResult.value.items);
    } else if (videoProvidersResult.status === "rejected") {
      messages.push("视频模型选项读取失败，已保留当前默认配置。");
    }

    if (referenceTemplatesResult.status === "fulfilled") {
      setOriginalReferenceTemplateCategories(referenceTemplatesResult.value.categories);
      setOriginalReferenceTemplateItems(referenceTemplatesResult.value.items);
    } else {
      setOriginalReferenceTemplatesError("原创参考模板读取失败，请稍后重试。");
      messages.push("原创参考模板读取失败。");
    }

    if (workspaceResult.status === "fulfilled") {
      setDataSource("api");
    } else if (messages.length) {
      setDataSource("error");
    }

    if (messages.length) {
      setErrorMessage(messages.join(" "));
    }
    setIsLoading(false);
    setIsLoadingOriginalReferenceTemplates(false);
  }

  async function reloadOriginalReferenceTemplates() {
    setIsLoadingOriginalReferenceTemplates(true);
    setOriginalReferenceTemplatesError("");
    try {
      const result = await getXiaohongshuOriginalReferenceTemplates();
      setOriginalReferenceTemplateCategories(result.categories);
      setOriginalReferenceTemplateItems(result.items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创参考模板读取失败";
      setOriginalReferenceTemplatesError(message);
    } finally {
      setIsLoadingOriginalReferenceTemplates(false);
    }
  }

  const {
    publishingTarget,
    publishingAccountValue,
    setPublishingAccountValue,
    isDesktopExtensionReady,
    isCreatingDesktopPublishSession,
    activeDesktopPublishSession,
    isCreatingMobilePublishSession,
    activeMobilePublishSession,
    mobilePublishQrDataUrl,
    isCompletingMobilePublishSession,
    openPublishModal: handleOpenPublishModal,
    closePublishModal: handleClosePublishModal,
    createDesktopPublishSession: handleCreateDesktopPublishSession,
    createMobilePublishSession: handleCreateMobilePublishSession,
    completeMobilePublishSession: handleCompleteMobilePublishSession,
  } = usePublishFlow({
    brandId: getStoredCurrentBrandId(workspace.archive.brand.id) || workspace.archive.brand.id,
    defaultAccountId: defaultAccount?.id,
    platformAccounts: workspace.archive.platformAccounts,
    onRefreshWorkspace: loadWorkspace,
    setNotice,
    setErrorMessage,
  });

  function setMaterialPreviewIndex(noteId: string, nextIndex: number, total: number) {
    if (!noteId || total <= 0) {
      return;
    }
    setMaterialPreviewIndexMap((current) => ({
      ...current,
      [noteId]: ((nextIndex % total) + total) % total,
    }));
  }

  function shiftMaterialPreview(noteId: string, total: number, delta: number) {
    if (!noteId || total <= 1) {
      return;
    }
    const currentIndex = getMaterialPreviewIndex(materialPreviewIndexMap, noteId, total);
    setMaterialPreviewIndex(noteId, currentIndex + delta, total);
  }

  function openMaterialLightbox(payload: { title: string; url: string; type: "IMAGE" | "VIDEO" }) {
    if (!payload.url) {
      return;
    }
    setMaterialLightbox({
      title: payload.title,
      url: payload.url,
      type: payload.type,
    });
  }

  async function refreshMarketingPlanWorkspace(silent = false) {
    try {
      const nextWorkspace = await getXiaohongshuMarketingPlanWorkspace();
      setMarketingPlanWorkspace(nextWorkspace);
      if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
        setErrorMessage(`小红书营销策划方案生成失败：${nextWorkspace.latestTask.errorMessage}`);
      }
      if (nextWorkspace.latestTask?.taskStatus === "SUCCESS") {
        setNotice("小红书营销策划方案已生成完成，可继续编辑和保存。");
      }
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : "刷新失败";
        setErrorMessage(`刷新小红书营销策划方案失败：${message}`);
      }
    }
  }

  async function refreshCalendarWorkspace(silent = false) {
    try {
      const nextWorkspace = await getXiaohongshuMarketingCalendarWorkspace();
      setCalendarWorkspace(nextWorkspace);
      if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
        setErrorMessage(`营销日历生成失败：${nextWorkspace.latestTask.errorMessage}`);
      }
      if (nextWorkspace.latestTask?.taskStatus === "SUCCESS") {
        setNotice("营销日历已生成完成，可按月份翻页查看，并继续生成接下来 7 天内容安排。");
      }
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : "刷新失败";
        setErrorMessage(`刷新营销日历失败：${message}`);
      }
    }
  }

  const selectedProduct = workspace.archive.products.find((item) => item.id === selectedProductId) || workspace.archive.products[0];
  const currentSection = visibleSections.find((item) => item.key === activeSection) ?? visibleSections[0] ?? xiaohongshuSections[0];
  const hasCurrentSectionEditPermission = Boolean(
    brandPermissionSettings?.currentUserPermissions?.[xiaohongshuSectionPermissionMap[currentSection.key]]?.edit,
  );

  const xhsTasks = useMemo(() => getXiaohongshuTasks(workspace.tasks), [workspace.tasks]);
  const xhsMedia = useMemo(() => getXiaohongshuMedia(workspace.media), [workspace.media]);
  const originalTaskCount = useMemo(() => workspace.tasks.filter((item) => item.taskType === "XHS_ORIGINAL_NOTE").length, [workspace.tasks]);
  const latestOriginalTask = useMemo(() => findLatestTaskByTypes(workspace.tasks, "XHS_ORIGINAL_NOTE"), [workspace.tasks]);
  const materialNotes = useMemo(() => workspace.materialNotes, [workspace.materialNotes]);
  const selectedWork = xhsMedia.find((item) => item.id === selectedWorkId) || xhsMedia[0];
  const selectedWorkTask = workspace.tasks.find((item) => item.id === selectedWork?.taskId);
  const selectedWorkDraft = useMemo(() => getMatchedDraft(selectedWork, noteDrafts), [noteDrafts, selectedWork]);
  const relatedWorks = useMemo(() => getRelatedWorks(xhsMedia, selectedWork), [selectedWork, xhsMedia]);
  const latestGrowthReport = growthReportWorkspace.latest;
  const latestAnnualPlan = annualPlanWorkspace.latest;
  const latestMarketingPlan = marketingPlanWorkspace.latest;
  const latestMarketingPlanTask = marketingPlanWorkspace.latestTask;
  const latestCalendar = calendarWorkspace.latest;
  const latestCalendarTask = calendarWorkspace.latestTask;
  const canGenerateMarketingPlan = Boolean(latestGrowthReport && latestAnnualPlan);
  const canGenerateCalendar = Boolean(latestGrowthReport && latestAnnualPlan && latestMarketingPlan);
  const isMarketingPlanTaskActive = Boolean(latestMarketingPlanTask && isTaskActive(latestMarketingPlanTask.taskStatus));
  const isCalendarTaskActive = Boolean(latestCalendarTask && isTaskActive(latestCalendarTask.taskStatus));
  const marketingPlanInlineError =
    latestMarketingPlanTask?.taskStatus === "FAILED" ? latestMarketingPlanTask.errorMessage?.trim() || "" : "";
  const calendarInlineError = latestCalendarTask?.taskStatus === "FAILED" ? latestCalendarTask.errorMessage?.trim() || "" : "";
  const topLevelErrorMessage =
    activeSection === "plan" && marketingPlanInlineError
      ? errorMessage.replace(`小红书营销策划方案生成失败：${marketingPlanInlineError}`, "").trim()
      : activeSection === "calendar"
        ? ""
        : errorMessage;
  const marketingPlanTaskStatusText = getPhaseTaskStatusText(latestMarketingPlanTask);
  const marketingPlanPreviewHtml = useMemo(
    () => renderMarkdownToHtml(marketingPlanDraft || latestMarketingPlan?.reportMarkdown || ""),
    [latestMarketingPlan?.reportMarkdown, marketingPlanDraft],
  );
  const calendarItems = latestCalendar?.items || [];
  const calendarAllItems = useMemo(() => {
    const records = latestCalendar
      ? [latestCalendar, ...calendarWorkspace.history.filter((item) => item.id !== latestCalendar.id)]
      : calendarWorkspace.history;
    const byDate = new Map<string, XiaohongshuMarketingCalendarItem>();

    for (const record of records) {
      for (const item of record.items) {
        if (!item.date) {
          continue;
        }
        if (!byDate.has(item.date)) {
          byDate.set(item.date, item);
        }
      }
    }

    return Array.from(byDate.values()).sort((left, right) => left.date.localeCompare(right.date));
  }, [calendarWorkspace.history, latestCalendar]);
  const originalSelectedWork = originalWorks.find((item) => item.id === selectedOriginalWorkId) || originalWorks[0];
  const originalEditingWork = originalWorks.find((item) => item.id === editingOriginalWorkId);
  const rewriteSelectedWork = rewriteWorks.find((item) => item.id === selectedRewriteWorkId) || rewriteWorks[0];
  const rewriteEditingWork = rewriteWorks.find((item) => item.id === editingRewriteWorkId);
  const videoSelectedWork = videoWorks.find((item) => item.id === selectedVideoWorkId) || videoWorks[0];
  const videoEditingWork = videoWorks.find((item) => item.id === editingVideoWorkId);
  const originalCalendarOptions = useMemo(
    () =>
      calendarAllItems.map((item) => ({
        value: item.id,
        label: `${item.date}｜${item.topicName}`,
      })),
    [calendarAllItems],
  );
  const {
    isPublishing,
    isRewriteSubmitting,
    rewriteSubmittingLabel,
    isVideoSubmitting,
    videoSubmittingLabel,
    createOriginalWork: handleCreateOriginalWork,
    createRewriteWork: handleCreateRewriteWork,
    createVideoWork: handleCreateVideoWork,
  } = useWorkComposerActions({
    brandId: getStoredCurrentBrandId(workspace.archive.brand.id) || workspace.archive.brand.id,
    calendarItems: calendarAllItems,
    products: workspace.archive.products,
    materialNotes,
    noProductOption: NO_PRODUCT_OPTION,
    customTopicOption: CUSTOM_TOPIC_OPTION,
    customVideoProviderOption,
    autoImageCountOption: AUTO_IMAGE_COUNT_OPTION,
    setNotice,
    setErrorMessage,
    onRefreshWorkspace: () => loadWorkspace({ preserveMessages: true }),
    original: {
      calendarValue: originalCalendarValue,
      customTopic: originalCustomTopic,
      productValue: originalProductValue,
      accountRoleValue: originalAccountRoleValue,
      imageCountValue: originalImageCountValue,
      injectMarketingPlanValue: originalInjectMarketingPlanValue,
      additionalInstruction: originalAdditionalInstruction,
      coverReferenceFile,
      galleryReferenceFiles,
      closeModal: closeOriginalModal,
      resetComposer: resetOriginalComposer,
      cancelEdit: handleCancelEditOriginalWork,
      setWorks: setOriginalWorks,
      setSelectedWorkId: setSelectedOriginalWorkId,
    },
    rewrite: {
      materialValue: rewriteMaterialValue,
      productValue: rewriteProductValue,
      accountRoleValue: rewriteAccountRoleValue,
      injectMarketingPlanValue: rewriteInjectMarketingPlanValue,
      additionalInstruction: rewriteAdditionalInstruction,
      closeModal: closeRewriteModal,
      resetComposer: resetRewriteComposer,
      cancelEdit: handleCancelEditRewriteWork,
      setWorks: setRewriteWorks,
      setSelectedWorkId: setSelectedRewriteWorkId,
    },
    video: {
      calendarValue: videoCalendarValue,
      customTopic: videoCustomTopic,
      productValue: videoProductValue,
      materialValue: videoMaterialValue,
      accountRoleValue: videoAccountRoleValue,
      referenceImageFile: videoReferenceImageFile,
      videoKindValue: videoKindValue,
      copyAdditionalInstruction: videoCopyAdditionalInstruction,
      providerValue: videoProviderValue,
      customProviderValue: videoCustomProviderValue,
      customModelName: videoCustomModelName,
      durationValue: videoDurationValue,
      injectMarketingPlanValue: videoInjectMarketingPlanValue,
      additionalInstruction: videoAdditionalInstruction,
      closeModal: closeVideoModal,
      resetComposer: resetVideoComposer,
      cancelEdit: handleCancelEditVideoWork,
      setWorks: setVideoWorks,
      setSelectedWorkId: setSelectedVideoWorkId,
    },
  });
  const {
    saveOriginalWork: handleSaveOriginalWork,
    deleteOriginalWork: handleDeleteOriginalWork,
    saveRewriteWork: handleSaveRewriteWork,
    deleteRewriteWork: handleDeleteRewriteWork,
    saveVideoWork: handleSaveVideoWork,
    deleteVideoWork: handleDeleteVideoWork,
    regenerateVideoStoryboard: handleRegenerateVideoStoryboard,
    generateVideoFromStoryboard: handleGenerateVideoFromStoryboard,
  } = useWorkMutationActions({
    brandId: getStoredCurrentBrandId(workspace.archive.brand.id) || workspace.archive.brand.id,
    setNotice,
    setErrorMessage,
    original: {
      works: originalWorks,
      setWorks: setOriginalWorks,
      selectedWorkId: selectedOriginalWorkId,
      setSelectedWorkId: setSelectedOriginalWorkId,
      deletingWorkId: deletingOriginalWorkId,
      setDeletingWorkId: setDeletingOriginalWorkId,
      editingWorkId: editingOriginalWorkId,
      editingTitle: editingOriginalTitle,
      editingContent: editingOriginalContent,
      setSavingWorkId: setSavingOriginalWorkId,
      cancelEdit: handleCancelEditOriginalWork,
    },
    rewrite: {
      works: rewriteWorks,
      setWorks: setRewriteWorks,
      selectedWorkId: selectedRewriteWorkId,
      setSelectedWorkId: setSelectedRewriteWorkId,
      deletingWorkId: deletingRewriteWorkId,
      setDeletingWorkId: setDeletingRewriteWorkId,
      editingWorkId: editingRewriteWorkId,
      editingTitle: editingRewriteTitle,
      editingContent: editingRewriteContent,
      setSavingWorkId: setSavingRewriteWorkId,
      cancelEdit: handleCancelEditRewriteWork,
    },
    video: {
      works: videoWorks,
      setWorks: setVideoWorks,
      selectedWorkId: selectedVideoWorkId,
      setSelectedWorkId: setSelectedVideoWorkId,
      deletingWorkId: deletingVideoWorkId,
      setDeletingWorkId: setDeletingVideoWorkId,
      editingWorkId: editingVideoWorkId,
      editingTitle: editingVideoTitle,
      editingContent: editingVideoContent,
      editingStoryboardPrompt: editingVideoStoryboardPrompt,
      setSavingWorkId: setSavingVideoWorkId,
      setEditingStoryboardPrompt: setEditingVideoStoryboardPrompt,
      cancelEdit: handleCancelEditVideoWork,
    },
  });
  const selectedCalendarItem = calendarAllItems.find((item) => item.id === selectedCalendarItemId) || calendarAllItems[0];
  useEffect(() => {
    if (!isCalendarDetailOpen || !selectedCalendarItem || isEditingCalendarItem) {
      return;
    }
    setCalendarItemDraft(cloneMarketingCalendarItem(selectedCalendarItem));
  }, [isCalendarDetailOpen, isEditingCalendarItem, selectedCalendarItem]);
  const calendarTaskStatusText = getPhaseTaskStatusText(latestCalendarTask);
  const isOriginalTaskActive = Boolean(latestOriginalTask && isTaskActive(latestOriginalTask.taskStatus));
  const originalInlineError = latestOriginalTask?.taskStatus === "FAILED" ? latestOriginalTask.errorMessage?.trim() || "" : "";
  const originalTaskStatusText = getComposeTaskStatusText(latestOriginalTask);
  const rewriteTaskCount = useMemo(() => workspace.tasks.filter((item) => item.taskType === "XHS_REWRITE_NOTE").length, [workspace.tasks]);
  const latestRewriteTask = useMemo(() => findLatestTaskByTypes(workspace.tasks, "XHS_REWRITE_NOTE"), [workspace.tasks]);
  const isRewriteTaskActive = Boolean(latestRewriteTask && isTaskActive(latestRewriteTask.taskStatus));
  const showRewriteSubmittingState = isRewriteSubmitting && !isRewriteTaskActive;
  const rewriteInlineError = latestRewriteTask?.taskStatus === "FAILED" ? latestRewriteTask.errorMessage?.trim() || "" : "";
  const rewriteTaskStatusText = getComposeTaskStatusText(latestRewriteTask);
  const videoTaskCount = useMemo(() => workspace.tasks.filter((item) => item.taskType === "XHS_VIDEO_NOTE").length, [workspace.tasks]);
  const latestVideoTask = useMemo(() => findLatestTaskByTypes(workspace.tasks, "XHS_VIDEO_NOTE"), [workspace.tasks]);
  const isVideoTaskActive = Boolean(latestVideoTask && isTaskActive(latestVideoTask.taskStatus));
  const showVideoSubmittingState = isVideoSubmitting && !isVideoTaskActive;
  const videoInlineError = latestVideoTask?.taskStatus === "FAILED" ? latestVideoTask.errorMessage?.trim() || "" : "";
  const videoTaskStatusText = getComposeTaskStatusText(latestVideoTask);
  const isCancellingOriginalTask = isCancellingTaskId === latestOriginalTask?.id;
  const isCancellingRewriteTask = isCancellingTaskId === latestRewriteTask?.id;
  const isCancellingVideoTask = isCancellingTaskId === latestVideoTask?.id;
  const mobilePublishTasks = useMemo(
    () =>
      workspace.tasks
        .filter((item) => item.taskType === "XHS_PUBLISH_MOBILE_DRAFT" || item.taskType === "XHS_PUBLISH_DESKTOP_DRAFT")
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [workspace.tasks],
  );
  const latestOriginalPublishTask = mobilePublishTasks.find((item) => readTaskWorkKind(item) === "ORIGINAL");
  const latestRewritePublishTask = mobilePublishTasks.find((item) => readTaskWorkKind(item) === "REWRITE");
  const publishTaskMap = useMemo(() => buildPublishTaskMap(mobilePublishTasks), [mobilePublishTasks]);
  const heroTitle =
    activeSection === "original"
      ? "原创笔记工作区"
      : activeSection === "remix"
        ? "二创笔记工作区"
        : activeSection === "video"
          ? "视频笔记工作区"
        : "小红书营销策划方案工作区";
  const heroDescription =
    activeSection === "original"
      ? "当前聚焦【原创笔记】主链路：选择营销日历选题与产品，生成图文内容和图片作品，并统一管理已完成作品。"
      : activeSection === "remix"
        ? "当前聚焦【二创笔记】主链路：从素材库选择作品，结合产品与用户要求生成差异化二创图文，并统一管理成品。"
        : activeSection === "video"
          ? "当前聚焦【视频笔记】主链路：先生成创意剧本与故事板，确认后再继续生成短视频，并支持离开页面后回来查看阶段状态。"
        : "当前先聚焦【营销策划方案】主链路：读取品牌资料、小红书数据、品牌增长报告和半年营销规划，生成可编辑保存的 Markdown 方案。";

  async function handleCancelComposeTask(task: TaskRecord | undefined, label: "原创笔记" | "二创笔记" | "视频笔记") {
    if (!task || !isTaskActive(task.taskStatus)) {
      return;
    }

    setIsCancellingTaskId(task.id);
    setNotice("");
    setErrorMessage("");
    try {
      await cancelTask(task.id);
      await loadWorkspace({ preserveMessages: true });
      setNotice(`${label}任务已取消，当前工作区状态已刷新。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "取消任务失败";
      setErrorMessage(`取消失败：${message}`);
    } finally {
      setIsCancellingTaskId("");
    }
  }

  const publishedPreview = useMemo(
    () =>
      buildPublishedPreview({
        work: selectedWork,
        matchedDraft: selectedWorkDraft,
        brandName: workspace.archive.brand.brandName,
        productName: selectedProduct?.productName || "主推产品",
        goal,
        tone,
        campaignBrief,
      }),
    [campaignBrief, goal, selectedProduct?.productName, selectedWork, selectedWorkDraft, tone, workspace.archive.brand.brandName],
  );
  useWorkspaceSelectionSync({
    products: workspace.archive.products,
    platformAccounts: workspace.archive.platformAccounts,
    media: workspace.media,
    xhsMedia,
    setSelectedProductId,
    setSelectedAccountId,
    selectedWorkId,
    setSelectedWorkId,
    originalWorks,
    selectedOriginalWorkId,
    setSelectedOriginalWorkId,
    rewriteWorks,
    selectedRewriteWorkId,
    setSelectedRewriteWorkId,
    videoWorks,
    selectedVideoWorkId,
    setSelectedVideoWorkId,
    noProductOption: NO_PRODUCT_OPTION,
    customTopicOption: CUSTOM_TOPIC_OPTION,
    originalProductValue,
    setOriginalProductValue,
    originalCalendarValue,
    setOriginalCalendarValue,
    rewriteProductValue,
    setRewriteProductValue,
    materialNotes,
    selectedMaterialId,
    setSelectedMaterialId,
    rewriteMaterialValue,
    setRewriteMaterialValue,
    videoProductValue,
    setVideoProductValue,
    videoCalendarValue,
    setVideoCalendarValue,
    calendarAllItems,
    selectedCalendarItemId,
    setSelectedCalendarItemId,
    activeCalendarMonth: "",
    setActiveCalendarMonth: () => "",
    calendarMonthKeys: [],
  });

  async function handleGeneratePlan() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.plan"]?.edit) {
      setErrorMessage("当前账号没有营销策划方案板块的编辑权限。");
      return;
    }
    if (!growthReportWorkspace.latest) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }

    if (!annualPlanWorkspace.latest) {
      setErrorMessage("请先生成半年营销规划。");
      return;
    }

    setIsGenerating(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextWorkspace = await generateXiaohongshuMarketingPlan();
      setMarketingPlanWorkspace(nextWorkspace);
      setIsEditingMarketingPlan(false);
      setNotice("已提交后台生成任务，正在生成小红书营销策划方案。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "小红书营销策划方案生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveMarketingPlan() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.plan"]?.edit) {
      setErrorMessage("当前账号没有营销策划方案板块的编辑权限。");
      return;
    }
    const latestPlan = marketingPlanWorkspace.latest;
    if (!latestPlan) {
      setErrorMessage("当前还没有可保存的小红书营销策划方案。");
      return;
    }

    const nextMarkdown = marketingPlanDraft.trim();
    if (!nextMarkdown) {
      setErrorMessage("小红书营销策划方案内容不能为空。");
      return;
    }

    setIsSavingMarketingPlan(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextWorkspace = await updateXiaohongshuMarketingPlan(latestPlan.id, nextMarkdown, latestPlan.title);
      setMarketingPlanWorkspace(nextWorkspace);
      setIsEditingMarketingPlan(false);
      setNotice("小红书营销策划方案已保存。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setIsSavingMarketingPlan(false);
    }
  }

  async function handleGenerateCalendar() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.calendar"]?.edit) {
      setErrorMessage("当前账号没有营销日历板块的编辑权限。");
      return;
    }
    if (!latestGrowthReport) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }

    if (!latestAnnualPlan) {
      setErrorMessage("请先生成半年营销规划。");
      return;
    }

    if (!latestMarketingPlan) {
      setErrorMessage("请先生成小红书营销策划方案。");
      return;
    }

    setIsGeneratingCalendar(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextWorkspace = await generateXiaohongshuMarketingCalendar();
      setCalendarWorkspace(nextWorkspace);
      setNotice("已提交后台生成任务，正在生成接下来 7 天营销日历。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "营销日历生成失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsGeneratingCalendar(false);
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

  function handleCalendarItemListFieldChange(
    field: "noteKeywords" | "titleDirections" | "coverKeywords",
    value: string,
  ) {
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
    setNotice("");
    setErrorMessage("");
    try {
      const nextWorkspace = await updateXiaohongshuMarketingCalendar(latestCalendar.id, nextItems, latestCalendar.title);
      setCalendarWorkspace(nextWorkspace);
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

  async function handleDeleteMarketingPlan() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.plan"]?.edit) {
      setErrorMessage("当前账号没有营销策划方案板块的编辑权限。");
      return;
    }
    const latestPlan = marketingPlanWorkspace.latest;
    if (!latestPlan) {
      return;
    }

    setIsDeletingMarketingPlan(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextWorkspace = await deleteXiaohongshuMarketingPlan(latestPlan.id);
      setMarketingPlanWorkspace(nextWorkspace);
      setMarketingPlanDraft("");
      setIsEditingMarketingPlan(false);
      setNotice("小红书营销策划方案已删除。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      setErrorMessage(`删除失败：${message}`);
    } finally {
      setIsDeletingMarketingPlan(false);
    }
  }

  function handleOpenOriginalModal() {
    openOriginalModal(calendarAllItems, workspace.archive.products);
  }

  function handleCloseOriginalModal() {
    closeOriginalModal();
  }

  function handleStartEditOriginalWork(item: XiaohongshuOriginalWorkRecord) {
    startEditOriginalWork(item, setSelectedOriginalWorkId);
  }

  function openOriginalWorkLightbox(item: XiaohongshuOriginalWorkRecord, index: number) {
    const mediaUrls = getOriginalWorkMediaUrls(item);
    const targetUrl = mediaUrls[index];
    if (!targetUrl) {
      return;
    }
    setMaterialLightbox({
      title: `${item.title} · 图片 ${index + 1}`,
      url: targetUrl,
      type: "IMAGE",
    });
  }

  function handleOpenRewriteModal() {
    openRewriteModal(materialNotes, workspace.archive.products);
  }

  function handleCloseRewriteModal() {
    closeRewriteModal();
  }

  function handleStartEditRewriteWork(item: XiaohongshuRewriteWorkRecord) {
    startEditRewriteWork(item, setSelectedRewriteWorkId);
  }

  function openRewriteWorkLightbox(item: XiaohongshuRewriteWorkRecord, index: number) {
    const mediaUrls = getRewriteWorkMediaUrls(item);
    const targetUrl = mediaUrls[index];
    if (!targetUrl) {
      return;
    }
    setMaterialLightbox({
      title: `${item.title} · 图片 ${index + 1}`,
      url: targetUrl,
      type: "IMAGE",
    });
  }

  function handleOpenVideoModal() {
    openVideoModal(calendarAllItems, workspace.archive.products);
  }

  function handleCloseVideoModal() {
    closeVideoModal();
  }

  function handleStartEditVideoWork(item: XiaohongshuVideoWorkRecord) {
    startEditVideoWork(item, setSelectedVideoWorkId);
  }

  function handleSelectVideoWork(item: XiaohongshuVideoWorkRecord) {
    setSelectedVideoWorkId(item.id);
    setEditingVideoStoryboardPrompt(item.storyboardPrompt || "");
  }

  function openVideoWorkLightbox(item: XiaohongshuVideoWorkRecord) {
    if (item.videoUrl) {
      setMaterialLightbox({
        title: `${item.title} · 视频`,
        url: item.videoUrl,
        type: "VIDEO",
      });
      return;
    }
    if (item.coverImageUrl) {
      setMaterialLightbox({
        title: `${item.title} · 封面`,
        url: item.coverImageUrl,
        type: "IMAGE",
      });
    }
  }

  function renderSectionCard() {
    if (activeSection === "plan") {
      return (
        <PlanWorkspace
          sectionLabel={currentSection.label}
          canEditMarketingPlan={Boolean(brandPermissionSettings?.currentUserPermissions["xiaohongshu.plan"]?.edit)}
          isLoading={isLoading}
          isPublishing={isPublishing}
          isSavingMarketingPlan={isSavingMarketingPlan}
          isDeletingMarketingPlan={isDeletingMarketingPlan}
          isGenerating={isGenerating}
          latestMarketingPlan={latestMarketingPlan}
          latestMarketingPlanTask={latestMarketingPlanTask}
          canGenerateMarketingPlan={canGenerateMarketingPlan}
          isMarketingPlanTaskActive={isMarketingPlanTaskActive}
          marketingPlanTaskStatusText={marketingPlanTaskStatusText}
          marketingPlanInlineError={marketingPlanInlineError}
          isEditingMarketingPlan={isEditingMarketingPlan}
          marketingPlanDraft={marketingPlanDraft}
          marketingPlanPreviewHtml={marketingPlanPreviewHtml}
          loadWorkspace={() => loadWorkspace()}
          onEnterEdit={() => {
            if (!latestMarketingPlan) {
              return;
            }
            setMarketingPlanDraft(latestMarketingPlan.reportMarkdown);
            setIsEditingMarketingPlan(true);
            setNotice("已进入编辑状态，可直接修改左侧 Markdown 内容。");
          }}
          onDelete={() => handleDeleteMarketingPlan()}
          onGenerate={() => handleGeneratePlan()}
          onSave={() => handleSaveMarketingPlan()}
          onChangeDraft={(value) => {
            setMarketingPlanDraft(value);
            setIsEditingMarketingPlan(true);
          }}
          getTaskStatusClass={getTaskStatusClass}
          formatDateTime={formatDateTime}
        />
      );
    }

    if (activeSection === "assets") {
      return (
        <AssetsWorkspace
          sectionLabel={currentSection.label}
          sectionDescription={currentSection.description}
          brandId={workspace.archive.brand.id}
          isLoading={isLoading}
          isPublishing={isPublishing}
          items={materialNotes}
          selectedMaterialId={selectedMaterialId}
          previewIndexMap={materialPreviewIndexMap}
          onRefresh={() => loadWorkspace()}
          onSelectMaterial={setSelectedMaterialId}
          onShiftPreview={shiftMaterialPreview}
          onOpenLightbox={openMaterialLightbox}
          formatDateTime={formatDateTime}
        />
      );
    }

    if (activeSection === "calendar") {
      return (
        <CalendarWorkspace
          sectionLabel={currentSection.label}
          sectionDescription={currentSection.description}
          isLoading={isLoading}
          isPublishing={isPublishing}
          isGeneratingCalendar={isGeneratingCalendar}
          canGenerateCalendar={canGenerateCalendar}
          isCalendarTaskActive={isCalendarTaskActive}
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
          onRefresh={() => refreshCalendarWorkspace()}
          onGenerate={() => handleGenerateCalendar()}
          onOpenDetail={handleOpenCalendarDetail}
          onCloseDetail={handleCloseCalendarDetail}
          onStartEditDetail={handleStartEditCalendarItem}
          onCancelEditDetail={handleCancelEditCalendarItem}
          onSaveDetail={() => handleSaveCalendarItem()}
          onDetailFieldChange={handleCalendarItemFieldChange}
          onDetailListFieldChange={handleCalendarItemListFieldChange}
          getTaskStatusClass={getTaskStatusClass}
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

    if (activeSection === "original") {
      return (
        <OriginalWorkspace
          sectionLabel={currentSection.label}
          sectionDescription={currentSection.description}
          isLoading={isLoading}
          isPublishing={isPublishing}
          isTaskActive={isOriginalTaskActive}
          taskCount={originalTaskCount}
          latestTask={latestOriginalTask}
          taskStatusText={originalTaskStatusText}
          inlineError={originalInlineError}
          isCancellingTask={isCancellingOriginalTask}
          canCancelTask={isTaskActive(latestOriginalTask?.taskStatus)}
          latestPublishTask={latestOriginalPublishTask}
          items={originalWorks}
          previewIndexMap={materialPreviewIndexMap}
          deletingWorkId={deletingOriginalWorkId}
          editingWork={originalEditingWork}
          editingTitle={editingOriginalTitle}
          editingContent={editingOriginalContent}
          savingWorkId={savingOriginalWorkId}
          isCreateModalOpen={isOriginalModalOpen}
          calendarOptions={originalCalendarOptions}
          customTopicOption={CUSTOM_TOPIC_OPTION}
          noProductOption={NO_PRODUCT_OPTION}
          autoImageCountOption={AUTO_IMAGE_COUNT_OPTION}
          products={workspace.archive.products}
          calendarValue={originalCalendarValue}
          customTopic={originalCustomTopic}
          productValue={originalProductValue}
          accountRoleValue={originalAccountRoleValue}
          accountRoleOptions={originalAccountRoleOptions}
          imageCountValue={originalImageCountValue}
          injectMarketingPlanValue={originalInjectMarketingPlanValue}
          additionalInstruction={originalAdditionalInstruction}
          coverReferenceFile={coverReferenceFile}
          galleryReferenceFiles={galleryReferenceFiles}
          referenceTemplateCategories={originalReferenceTemplateCategories}
          referenceTemplateItems={originalReferenceTemplateItems}
          isReferenceTemplatesLoading={isLoadingOriginalReferenceTemplates}
          referenceTemplatesError={originalReferenceTemplatesError}
          onRefresh={() => loadWorkspace()}
          onCancelTask={() => handleCancelComposeTask(latestOriginalTask, "原创笔记")}
          onOpenCreate={handleOpenOriginalModal}
          onShiftPreview={shiftMaterialPreview}
          onOpenLightbox={openOriginalWorkLightbox}
          onPublish={(item) =>
            handleOpenPublishModal({
              id: item.id,
              workKind: "ORIGINAL",
              noteCategory: "原创",
              title: item.title,
              sourceLabel: item.calendarLabel || item.customTopicName || "原创笔记",
            })
          }
          getPublishLabel={(workId) => getWorkPublishTaskLabel(publishTaskMap[workId])}
          onEdit={handleStartEditOriginalWork}
          onDelete={(workId) => void handleDeleteOriginalWork(workId)}
          onCloseEdit={handleCancelEditOriginalWork}
          onSaveEdit={handleSaveOriginalWork}
          onEditTitleChange={setEditingOriginalTitle}
          onEditContentChange={setEditingOriginalContent}
          onCloseCreate={handleCloseOriginalModal}
          onCreate={handleCreateOriginalWork}
          onCalendarChange={setOriginalCalendarValue}
          onCustomTopicChange={setOriginalCustomTopic}
          onProductChange={setOriginalProductValue}
          onAccountRoleChange={setOriginalAccountRoleValue}
          onImageCountChange={setOriginalImageCountValue}
          onInjectMarketingPlanChange={setOriginalInjectMarketingPlanValue}
          onAdditionalInstructionChange={setOriginalAdditionalInstruction}
          onCoverReferenceFileChange={setCoverReferenceFile}
          onGalleryReferenceFilesChange={setGalleryReferenceFiles}
          onReloadReferenceTemplates={reloadOriginalReferenceTemplates}
          getTaskStatusClass={getTaskStatusClass}
          getOriginalTaskStatusClass={getWorkTaskStatusClass}
          getOriginalTaskStatusText={getWorkTaskStatusText}
          getPublishTaskStatusText={getPublishTaskStatusText}
          getPublishTaskSummaryText={getPublishTaskSummaryText}
          formatDateTime={formatDateTime}
        />
      );
    }

    if (activeSection === "remix") {
      return (
        <RewriteWorkspace
          sectionLabel={currentSection.label}
          sectionDescription={currentSection.description}
          isLoading={isLoading}
          isPublishing={isPublishing}
          isTaskActive={isRewriteTaskActive}
          taskCount={rewriteTaskCount}
          showSubmittingState={showRewriteSubmittingState}
          submittingLabel={rewriteSubmittingLabel}
          latestTask={latestRewriteTask}
          taskStatusText={rewriteTaskStatusText}
          inlineError={rewriteInlineError}
          isCancellingTask={isCancellingRewriteTask}
          canCancelTask={isTaskActive(latestRewriteTask?.taskStatus)}
          latestPublishTask={latestRewritePublishTask}
          items={rewriteWorks}
          materialNotes={materialNotes}
          previewIndexMap={materialPreviewIndexMap}
          deletingWorkId={deletingRewriteWorkId}
          editingWork={rewriteEditingWork}
          editingTitle={editingRewriteTitle}
          editingContent={editingRewriteContent}
          savingWorkId={savingRewriteWorkId}
          isCreateModalOpen={isRewriteModalOpen}
          noProductOption={NO_PRODUCT_OPTION}
          products={workspace.archive.products}
          materialValue={rewriteMaterialValue}
          productValue={rewriteProductValue}
          accountRoleValue={rewriteAccountRoleValue}
          accountRoleOptions={originalAccountRoleOptions}
          injectMarketingPlanValue={rewriteInjectMarketingPlanValue}
          additionalInstruction={rewriteAdditionalInstruction}
          onRefresh={() => loadWorkspace()}
          onCancelTask={() => handleCancelComposeTask(latestRewriteTask, "二创笔记")}
          onOpenCreate={handleOpenRewriteModal}
          onShiftPreview={shiftMaterialPreview}
          onOpenLightbox={openRewriteWorkLightbox}
          onPublish={(item) =>
            handleOpenPublishModal({
              id: item.id,
              workKind: "REWRITE",
              noteCategory: "二创",
              title: item.title,
              sourceLabel: item.sourceMaterialTitle,
            })
          }
          getPublishLabel={(workId) => getWorkPublishTaskLabel(publishTaskMap[workId])}
          onEdit={handleStartEditRewriteWork}
          onDelete={(workId) => void handleDeleteRewriteWork(workId)}
          onCloseEdit={handleCancelEditRewriteWork}
          onSaveEdit={handleSaveRewriteWork}
          onEditTitleChange={setEditingRewriteTitle}
          onEditContentChange={setEditingRewriteContent}
          onCloseCreate={handleCloseRewriteModal}
          onCreate={handleCreateRewriteWork}
          onMaterialChange={setRewriteMaterialValue}
          onProductChange={setRewriteProductValue}
          onAccountRoleChange={setRewriteAccountRoleValue}
          onInjectMarketingPlanChange={setRewriteInjectMarketingPlanValue}
          onAdditionalInstructionChange={setRewriteAdditionalInstruction}
          getTaskStatusClass={getTaskStatusClass}
          getOriginalTaskStatusClass={getWorkTaskStatusClass}
          getOriginalTaskStatusText={getWorkTaskStatusText}
          getPublishTaskStatusText={getPublishTaskStatusText}
          getPublishTaskSummaryText={getPublishTaskSummaryText}
          formatDateTime={formatDateTime}
        />
      );
    }

    return (
      <VideoWorkspace
        sectionLabel={currentSection.label}
        sectionDescription={currentSection.description}
        isLoading={isLoading}
        isPublishing={isPublishing}
        isTaskActive={isVideoTaskActive}
        taskCount={videoTaskCount}
        showSubmittingState={showVideoSubmittingState}
        submittingLabel={videoSubmittingLabel}
        latestTask={latestVideoTask}
        taskStatusText={videoTaskStatusText}
        inlineError={videoInlineError}
        isCancellingTask={isCancellingVideoTask}
        canCancelTask={isTaskActive(latestVideoTask?.taskStatus)}
        items={videoWorks}
        materialNotes={materialNotes}
        selectedWork={videoSelectedWork}
        deletingWorkId={deletingVideoWorkId}
        editingWork={videoEditingWork}
        editingTitle={editingVideoTitle}
        editingContent={editingVideoContent}
        editingStoryboardPrompt={editingVideoStoryboardPrompt}
        savingWorkId={savingVideoWorkId}
        isCreateModalOpen={isVideoModalOpen}
        calendarOptions={originalCalendarOptions}
        customTopicOption={CUSTOM_TOPIC_OPTION}
        noProductOption={NO_PRODUCT_OPTION}
        customVideoProviderOption={customVideoProviderOption}
        videoProviderOptions={videoProviderOptions}
        products={workspace.archive.products}
        calendarValue={videoCalendarValue}
        customTopic={videoCustomTopic}
        productValue={videoProductValue}
        materialValue={videoMaterialValue}
        accountRoleValue={videoAccountRoleValue}
        accountRoleOptions={originalAccountRoleOptions}
        referenceImageFile={videoReferenceImageFile}
        videoKindValue={videoKindValue}
        copyAdditionalInstruction={videoCopyAdditionalInstruction}
        providerValue={videoProviderValue}
        customProviderValue={videoCustomProviderValue}
        customModelName={videoCustomModelName}
        durationValue={videoDurationValue}
        injectMarketingPlanValue={videoInjectMarketingPlanValue}
        additionalInstruction={videoAdditionalInstruction}
        onRefresh={() => loadWorkspace()}
        onCancelTask={() => handleCancelComposeTask(latestVideoTask, "视频笔记")}
        onOpenCreate={handleOpenVideoModal}
        onSelectWork={handleSelectVideoWork}
        onPreview={openVideoWorkLightbox}
        onEdit={handleStartEditVideoWork}
        onDelete={(workId) => void handleDeleteVideoWork(workId)}
        onRegenerateStoryboard={() => {
          if (!videoSelectedWork) {
            return Promise.resolve();
          }
          return handleRegenerateVideoStoryboard(videoSelectedWork.id, editingVideoStoryboardPrompt);
        }}
        onGenerateVideo={() => {
          if (!videoSelectedWork) {
            return Promise.resolve();
          }
          return handleGenerateVideoFromStoryboard(videoSelectedWork.id, videoCustomModelName);
        }}
        onCloseEdit={handleCancelEditVideoWork}
        onSaveEdit={handleSaveVideoWork}
        onEditTitleChange={setEditingVideoTitle}
        onEditContentChange={setEditingVideoContent}
        onEditStoryboardPromptChange={setEditingVideoStoryboardPrompt}
        onCloseCreate={handleCloseVideoModal}
        onCreate={handleCreateVideoWork}
        onCalendarChange={setVideoCalendarValue}
        onProductChange={(value) => {
          setVideoProductValue(value);
          if (value !== NO_PRODUCT_OPTION && videoReferenceImageFile) {
            setVideoReferenceImageFile(null);
          }
        }}
        onMaterialChange={setVideoMaterialValue}
        onAccountRoleChange={setVideoAccountRoleValue}
        onCustomTopicChange={setVideoCustomTopic}
        onReferenceImageFileChange={(file) => {
          setVideoReferenceImageFile(file);
          if (file) {
            setVideoProductValue(NO_PRODUCT_OPTION);
          }
        }}
        onVideoKindChange={(value) => {
          setVideoKindValue(value);
          if (value !== "REMIX") {
            setVideoMaterialValue("");
          }
        }}
        onCopyAdditionalInstructionChange={setVideoCopyAdditionalInstruction}
        onProviderChange={setVideoProviderValue}
        onCustomProviderChange={setVideoCustomProviderValue}
        onCustomModelNameChange={setVideoCustomModelName}
        onDurationChange={setVideoDurationValue}
        onInjectMarketingPlanChange={setVideoInjectMarketingPlanValue}
        onAdditionalInstructionChange={setVideoAdditionalInstruction}
        getTaskStatusClass={getTaskStatusClass}
        getOriginalTaskStatusClass={getWorkTaskStatusClass}
        getOriginalTaskStatusText={getWorkTaskStatusText}
        formatDateTime={formatDateTime}
      />
    );
  }

  return (
    <main className="dashboard-shell">
      <section className="strategy-shell">
        <div className="strategy-layout xiaohongshu-layout">
          {!hasWorkspaceAccess ? (
            <div className="strategy-content-panel xiaohongshu-content-panel">
              <section className="dashboard-hero xiaohongshu-hero">
                <div>
                  <h1>当前无权限进入小红书工作区</h1>
                  <p>当前账号未获得小红书板块的查看权限，请联系管理员在团队权限设置中为对应板块勾选可见权限。</p>
                  <div className="workspace-toolbar top-toolbar">
                    <div className="workspace-status">
                      <span className="archive-pill status-pending">{formatCollaboratorRoleLabel(currentBrandRole)}</span>
                      <span className="status-text error-text">当前账号没有小红书板块的查看权限，请联系管理员开通后再进入。</span>
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
                    <span className={`archive-pill ${hasCurrentSectionEditPermission ? "status-ready" : "status-pending"}`}>
                      {hasCurrentSectionEditPermission ? "当前板块可编辑" : "当前板块只读"}
                    </span>
                    <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
                      {dataSource === "api"
                        ? "接口数据"
                        : dataSource === "seed"
                          ? "演示数据"
                          : dataSource === "loading"
                            ? "加载中"
                            : "接口异常"}
                    </span>
                    {isLoading ? <span className="status-text">正在加载小红书工作台...</span> : null}
                    {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
                    {!isLoading && topLevelErrorMessage ? <span className="status-text error-text">{topLevelErrorMessage}</span> : null}
                  </div>
                  <div className="personal-actions">
                    <button type="button" className="secondary-button" onClick={() => void loadWorkspace()} disabled={isLoading || isPublishing}>
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
            {renderSectionCard()}
          </div>
            </>
          )}
        </div>
      </section>
      <PublishModal
        publishTarget={publishingTarget}
        platformAccounts={workspace.archive.platformAccounts}
        publishingAccountValue={publishingAccountValue}
        isDesktopExtensionReady={isDesktopExtensionReady}
        isCreatingDesktopPublishSession={isCreatingDesktopPublishSession}
        activeDesktopPublishSession={activeDesktopPublishSession}
        isCreatingMobilePublishSession={isCreatingMobilePublishSession}
        activeMobilePublishSession={activeMobilePublishSession}
        mobilePublishQrDataUrl={mobilePublishQrDataUrl}
        isCompletingMobilePublishSession={isCompletingMobilePublishSession}
        notice={notice}
        errorMessage={errorMessage}
        onClose={handleClosePublishModal}
        onAccountChange={setPublishingAccountValue}
        onCreateDesktopSession={handleCreateDesktopPublishSession}
        onCreateMobileSession={handleCreateMobilePublishSession}
        onCompleteMobileSession={handleCompleteMobilePublishSession}
        formatDateTime={formatDateTime}
      />
      <MediaLightbox state={materialLightbox} onClose={() => setMaterialLightbox(null)} />
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

