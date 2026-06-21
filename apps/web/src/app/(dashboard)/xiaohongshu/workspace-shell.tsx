"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatCalendarDate,
  formatCalendarListValue,
  formatCalendarMonthDay,
  formatCalendarOptionalValue,
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
import { NoteWorkspaceSectionContainers } from "./note-workspace-section-containers";
import { isTaskActive } from "./task-polling";
import { useNoteComposerForms } from "./use-note-composer-forms";
import { usePublishFlow } from "./use-publish-flow";
import { useXiaohongshuWorkspaceLoader } from "./use-xiaohongshu-workspace-loader";
import { useXiaohongshuWorkspaceTasks } from "./use-xiaohongshu-workspace-tasks";
import { useWorkComposerActions } from "./use-work-composer-actions";
import { useWorkEditors } from "./use-work-editors";
import { useWorkMutationActions } from "./use-work-mutation-actions";
import { useWorkspaceSelectionSync } from "./use-workspace-selection-sync";
import { AssetsWorkspace } from "./assets-workspace";
import { renderMarkdownToHtml } from "./markdown-render";
import { MediaLightbox } from "./media-lightbox";
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
  getMatchedDraft,
  getRelatedWorks,
} from "./work-task-helpers";
import { cancelTask, type MediaRecord, type TaskRecord } from "../../../services/personal-center";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { type BrandPermissionKey, type BrandPermissionSettingsRecord } from "../../../services/brand-growth";
import {
  annualMarketingPlanSeed,
  deleteXiaohongshuMarketingPlan,
  generateXiaohongshuMarketingCalendar,
  generateXiaohongshuMarketingPlan,
  type XiaohongshuMarketingCalendarItem,
  type XiaohongshuMarketingCalendarWorkspace,
  growthReportSeed,
  opportunityInsightSeed,
  updateXiaohongshuMarketingCalendar,
  updateXiaohongshuMarketingPlan,
  xiaohongshuMarketingPlanSeed,
} from "../../../services/reports";
import {
  buildXiaohongshuPlan,
  getDefaultProduct,
  getDefaultXiaohongshuAccount,
  getXiaohongshuMedia,
  getXiaohongshuWorkspaceSeed,
  type XiaohongshuGoal,
  type XiaohongshuNoteDraft,
  type XiaohongshuTone,
} from "../../../services/xiaohongshu";
import {
  formatXiaohongshuAccountRoleLabel,
  type XiaohongshuAccountRole,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
  type StoryboardImageModelOptionRecord,
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { formatCollaboratorRoleLabel } from "../personal-center/route-helpers";

type XiaohongshuSectionKey = "plan" | "assets" | "original" | "remix" | "video";
const MARKETING_PLAN_REQUIRED_INPUTS = ["品牌背景资料", "产品资料库", "机会洞察总报告", "品牌增长报告"] as const;
const xiaohongshuSections: Array<{ key: XiaohongshuSectionKey; label: string; description: string }> = [
  { key: "plan", label: "营销策划方案", description: "围绕品牌背景资料、产品资料库、机会洞察总报告和品牌增长报告生成小红书策划与选题方案。" },
  { key: "assets", label: "素材库", description: "沉淀已生成的笔记、封面、源文件与作品记录。" },
  { key: "original", label: "原创笔记", description: "统一管理原创图文笔记成品，支持新增、编辑、删除与查看配图结果。" },
  { key: "remix", label: "二创笔记", description: "基于已有选题和作品延展二创版本与差异化角度。" },
  { key: "video", label: "视频笔记", description: "把现有主题整理成视频脚本、镜头结构和封面文案。" },
];
const xiaohongshuSectionPermissionMap: Record<XiaohongshuSectionKey, BrandPermissionKey> = {
  plan: "xiaohongshu.plan",
  assets: "xiaohongshu.assets",
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
const DEFAULT_STORYBOARD_IMAGE_MODEL_OPTIONS: StoryboardImageModelOptionRecord[] = [];

function resolveMarketingCalendarTopic(item?: XiaohongshuMarketingCalendarItem | null) {
  return (
    item?.topicName
    || item?.brandMarketing?.theme
    || item?.xiaohongshu?.brandAccount?.topic
    || item?.douyin?.brandAccount?.topic
    || item?.moments?.topic
    || "未命名主题"
  ).trim();
}

export function XiaohongshuWorkspaceShell() {
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
  const [opportunityInsightWorkspace, setOpportunityInsightWorkspace] = useState(opportunityInsightSeed);
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
  const [storyboardImageModelOptions, setStoryboardImageModelOptions] = useState<StoryboardImageModelOptionRecord[]>(
    DEFAULT_STORYBOARD_IMAGE_MODEL_OPTIONS,
  );
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
  const [isMarketingPlanGenerateDialogOpen, setIsMarketingPlanGenerateDialogOpen] = useState(false);
  const [marketingPlanUserRequirement, setMarketingPlanUserRequirement] = useState("");
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
    defaultStoryboardImageModelValue:
      storyboardImageModelOptions.find((item) => item.recommended)?.selectionKey || storyboardImageModelOptions[0]?.selectionKey,
    availableStoryboardImageModelValues: storyboardImageModelOptions.map((item) => item.selectionKey),
  });

  const {
    isOriginalModalOpen,
    originalCalendarValue,
    originalCustomTopic,
    originalProductValue,
    originalAccountRoleValue,
    originalNoteModeValue,
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
    videoStoryboardImageModelValue,
    videoDurationValue,
    videoInjectMarketingPlanValue,
    videoAdditionalInstruction,
    customVideoProviderOption,
    setOriginalCalendarValue,
    setOriginalCustomTopic,
    setOriginalProductValue,
    setOriginalAccountRoleValue,
    setOriginalNoteModeValue,
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
    setVideoStoryboardImageModelValue,
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

  const {
    loadWorkspace,
    reloadOriginalReferenceTemplates,
    refreshMarketingPlanWorkspace,
    refreshCalendarWorkspace,
  } = useXiaohongshuWorkspaceLoader({
    fallbackBrandId: workspace.archive.brand.id,
    goal,
    tone,
    setWorkspace,
    setGrowthReportWorkspace,
    setAnnualPlanWorkspace,
    setOpportunityInsightWorkspace,
    setMarketingPlanWorkspace,
    setCalendarWorkspace,
    setSelectedProductId,
    setSelectedAccountId,
    setTopicIdeas,
    setNoteDrafts,
    setSelectedNoteId,
    setOriginalWorks,
    setRewriteWorks,
    setVideoWorks,
    setVideoProviderOptions,
    setStoryboardImageModelOptions,
    setOriginalReferenceTemplateCategories,
    setOriginalReferenceTemplateItems,
    setIsLoadingOriginalReferenceTemplates,
    setOriginalReferenceTemplatesError,
    setIsLoading,
    setBrandPermissionSettings,
    setCurrentBrandRole,
    setHasWorkspaceAccess,
    setNotice,
    setErrorMessage,
    setDataSource,
  });
  const currentDefaultAccount = useMemo(
    () => getDefaultXiaohongshuAccount(workspace.archive.platformAccounts),
    [workspace.archive.platformAccounts],
  );
  const selectedProduct = workspace.archive.products.find((item) => item.id === selectedProductId) || workspace.archive.products[0];
  const videoSelectedWork = videoWorks.find((item) => item.id === selectedVideoWorkId);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    const latestPlan = marketingPlanWorkspace.latest;
    setMarketingPlanDraft(latestPlan?.reportMarkdown || "");
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.generatedAt]);

  useEffect(() => {
    if (editingVideoWorkId && editingVideoWorkId !== videoSelectedWork?.id) {
      return;
    }
    setEditingVideoStoryboardPrompt(videoSelectedWork?.storyboardPrompt || "");
  }, [
    editingVideoWorkId,
    setEditingVideoStoryboardPrompt,
    videoSelectedWork?.id,
    videoSelectedWork?.storyboardPrompt,
  ]);

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
    defaultAccountId: currentDefaultAccount?.id,
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


  const currentSection = visibleSections.find((item) => item.key === activeSection) ?? visibleSections[0] ?? xiaohongshuSections[0];
  const hasCurrentSectionEditPermission = Boolean(
    brandPermissionSettings?.currentUserPermissions?.[xiaohongshuSectionPermissionMap[currentSection.key]]?.edit,
  );

  const xhsMedia = useMemo(() => getXiaohongshuMedia(workspace.media), [workspace.media]);
  const materialNotes = useMemo(() => workspace.materialNotes, [workspace.materialNotes]);
  const selectedWork = xhsMedia.find((item) => item.id === selectedWorkId) || xhsMedia[0];
  const selectedWorkDraft = useMemo(() => getMatchedDraft(selectedWork, noteDrafts), [noteDrafts, selectedWork]);
  const relatedWorks = useMemo(() => getRelatedWorks(xhsMedia, selectedWork), [selectedWork, xhsMedia]);
  const latestGrowthReport = growthReportWorkspace.latest;
  const latestAnnualPlan = annualPlanWorkspace.latest;
  const latestOpportunityReport = opportunityInsightWorkspace.finalOpportunityReport;
  const latestMarketingPlan = marketingPlanWorkspace.latest;
  const latestMarketingPlanTask = marketingPlanWorkspace.latestTask;
  const latestCalendar = calendarWorkspace.latest;
  const latestCalendarTask = calendarWorkspace.latestTask;
  const hasMarketingPlanBrandBackground = Boolean(
    workspace.archive.brand.brandName?.trim()
    || workspace.archive.brand.brandDescription?.trim()
    || workspace.archive.brand.enterpriseIntro?.trim(),
  );
  const hasMarketingPlanProductLibrary = workspace.archive.products.length > 0;
  const canGenerateMarketingPlan = Boolean(
    latestGrowthReport
    && latestOpportunityReport?.htmlDocument?.trim()
    && hasMarketingPlanBrandBackground
    && hasMarketingPlanProductLibrary,
  );
  const canGenerateCalendar = Boolean(latestGrowthReport && latestAnnualPlan && latestMarketingPlan);
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
  const videoEditingWork = videoWorks.find((item) => item.id === editingVideoWorkId);
  const originalCalendarOptions = useMemo(
    () =>
      calendarAllItems.map((item) => ({
        value: item.id,
        label: `${item.date}｜${resolveMarketingCalendarTopic(item)}`,
      })),
    [calendarAllItems],
  );
  const workComposerActions = useWorkComposerActions({
    brandId: getStoredCurrentBrandId(workspace.archive.brand.id) || workspace.archive.brand.id,
    calendarItems: calendarAllItems,
    products: workspace.archive.products,
    materialNotes,
    videoProviderOptions,
    storyboardImageModelOptions,
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
      noteModeValue: originalNoteModeValue,
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
      storyboardImageModelValue: videoStoryboardImageModelValue,
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
    isPublishing,
    isRewriteSubmitting,
    rewriteSubmittingLabel,
    isVideoSubmitting,
    videoSubmittingLabel,
    createOriginalWork: handleCreateOriginalWork,
    createRewriteWork: handleCreateRewriteWork,
    createVideoWork: handleCreateVideoWork,
  } = workComposerActions;
  const workspaceTasks = useXiaohongshuWorkspaceTasks({
    tasks: workspace.tasks,
    marketingPlanTask: latestMarketingPlanTask,
    calendarTask: latestCalendarTask,
    isRewriteSubmitting,
    isVideoSubmitting,
    isCancellingTaskId,
    loadWorkspace,
    refreshMarketingPlanWorkspace,
    refreshCalendarWorkspace,
  });
  const {
    originalTaskCount,
    latestOriginalTask,
    isOriginalTaskActive,
    originalInlineError,
    originalTaskStatusText,
    canCancelOriginalTask,
    isCancellingOriginalTask,
    rewriteTaskCount,
    latestRewriteTask,
    isRewriteTaskActive,
    showRewriteSubmittingState,
    rewriteInlineError,
    rewriteTaskStatusText,
    canCancelRewriteTask,
    isCancellingRewriteTask,
    videoTaskCount,
    latestVideoTask,
    isVideoTaskActive,
    showVideoSubmittingState,
    videoInlineError,
    videoTaskStatusText,
    canCancelVideoTask,
    isCancellingVideoTask,
    latestOriginalPublishTask,
    latestRewritePublishTask,
    publishTaskMap,
    isMarketingPlanTaskActive,
    marketingPlanInlineError,
    marketingPlanTaskStatusText,
    isCalendarTaskActive,
    calendarInlineError,
    calendarTaskStatusText,
  } = workspaceTasks;
  const topLevelErrorMessage =
    activeSection === "plan" && marketingPlanInlineError
      ? errorMessage.replace(`小红书营销策划方案生成失败：${marketingPlanInlineError}`, "").trim()
      : errorMessage;
  const workMutationActions = useWorkMutationActions({
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
  const {
    saveOriginalWork: handleSaveOriginalWork,
    deleteOriginalWork: handleDeleteOriginalWork,
    saveRewriteWork: handleSaveRewriteWork,
    deleteRewriteWork: handleDeleteRewriteWork,
    saveVideoWork: handleSaveVideoWork,
    deleteVideoWork: handleDeleteVideoWork,
    regenerateVideoStoryboard: handleRegenerateVideoStoryboard,
    generateVideoFromStoryboard: handleGenerateVideoFromStoryboard,
  } = workMutationActions;
  const selectedCalendarItem = calendarAllItems.find((item) => item.id === selectedCalendarItemId) || calendarAllItems[0];
  useEffect(() => {
    if (!isCalendarDetailOpen || !selectedCalendarItem || isEditingCalendarItem) {
      return;
    }
    setCalendarItemDraft(cloneMarketingCalendarItem(selectedCalendarItem));
  }, [isCalendarDetailOpen, isEditingCalendarItem, selectedCalendarItem]);
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
        : "当前先聚焦【营销策划方案】主链路：读取品牌背景资料、产品资料库、机会洞察总报告和品牌增长报告，生成可编辑保存的 Markdown 方案。";

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

  function handleOpenGeneratePlanDialog() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.plan"]?.edit) {
      setErrorMessage("当前账号没有营销策划方案板块的编辑权限。");
      return;
    }
    if (!growthReportWorkspace.latest) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }
    if (!latestOpportunityReport?.htmlDocument?.trim()) {
      setErrorMessage("请先生成机会洞察总报告。");
      return;
    }
    if (!hasMarketingPlanBrandBackground) {
      setErrorMessage("请先完善品牌背景资料。");
      return;
    }
    if (!hasMarketingPlanProductLibrary) {
      setErrorMessage("请先完善产品资料库。");
      return;
    }
    setErrorMessage("");
    setNotice("");
    setIsMarketingPlanGenerateDialogOpen(true);
  }

  function handleCloseGeneratePlanDialog() {
    if (isGenerating) {
      return;
    }
    setIsMarketingPlanGenerateDialogOpen(false);
  }

  async function handleGeneratePlan() {
    if (!brandPermissionSettings?.currentUserPermissions["xiaohongshu.plan"]?.edit) {
      setErrorMessage("当前账号没有营销策划方案板块的编辑权限。");
      return;
    }
    if (!growthReportWorkspace.latest) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }
    if (!latestOpportunityReport?.htmlDocument?.trim()) {
      setErrorMessage("请先生成机会洞察总报告。");
      return;
    }
    if (!hasMarketingPlanBrandBackground) {
      setErrorMessage("请先完善品牌背景资料。");
      return;
    }
    if (!hasMarketingPlanProductLibrary) {
      setErrorMessage("请先完善产品资料库。");
      return;
    }

    setIsGenerating(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextWorkspace = await generateXiaohongshuMarketingPlan({
        userRequirement: marketingPlanUserRequirement,
      });
      setMarketingPlanWorkspace(nextWorkspace);
      setIsEditingMarketingPlan(false);
      setIsMarketingPlanGenerateDialogOpen(false);
      setMarketingPlanUserRequirement("");
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
          onGenerate={() => handleOpenGeneratePlanDialog()}
          onSave={() => handleSaveMarketingPlan()}
          onChangeDraft={(value) => {
            setMarketingPlanDraft(value);
            setIsEditingMarketingPlan(true);
          }}
          generateInputLabels={[...MARKETING_PLAN_REQUIRED_INPUTS]}
          isGenerateDialogOpen={isMarketingPlanGenerateDialogOpen}
          marketingPlanUserRequirement={marketingPlanUserRequirement}
          onCloseGenerateDialog={handleCloseGeneratePlanDialog}
          onSubmitGenerate={() => handleGeneratePlan()}
          onChangeMarketingPlanUserRequirement={setMarketingPlanUserRequirement}
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

    return (
      <NoteWorkspaceSectionContainers
        activeSection={activeSection === "original" || activeSection === "remix" ? activeSection : "video"}
        currentSection={currentSection}
        isLoading={isLoading}
        products={workspace.archive.products}
        materialNotes={materialNotes}
        calendarAllItems={calendarAllItems.map((item) => ({
          ...item,
          topicName: resolveMarketingCalendarTopic(item),
        }))}
        originalAccountRoleOptions={originalAccountRoleOptions}
        originalWorks={originalWorks}
        rewriteWorks={rewriteWorks}
        videoWorks={videoWorks}
        selectedVideoWorkId={selectedVideoWorkId}
        setSelectedVideoWorkId={setSelectedVideoWorkId}
        previewIndexMap={materialPreviewIndexMap}
        deletingOriginalWorkId={deletingOriginalWorkId}
        deletingRewriteWorkId={deletingRewriteWorkId}
        deletingVideoWorkId={deletingVideoWorkId}
        originalReferenceTemplateCategories={originalReferenceTemplateCategories}
        originalReferenceTemplateItems={originalReferenceTemplateItems}
        isLoadingOriginalReferenceTemplates={isLoadingOriginalReferenceTemplates}
        originalReferenceTemplatesError={originalReferenceTemplatesError}
        videoProviderOptions={videoProviderOptions}
        storyboardImageModelOptions={storyboardImageModelOptions}
        noProductOption={NO_PRODUCT_OPTION}
        autoImageCountOption={AUTO_IMAGE_COUNT_OPTION}
        customTopicOption={CUSTOM_TOPIC_OPTION}
        composerForms={composerForms}
        workEditors={workEditors}
        workComposerActions={workComposerActions}
        workMutationActions={workMutationActions}
        workspaceTasks={workspaceTasks}
        shiftMaterialPreview={shiftMaterialPreview}
        openOriginalWorkLightbox={openOriginalWorkLightbox}
        openRewriteWorkLightbox={openRewriteWorkLightbox}
        openVideoWorkLightbox={openVideoWorkLightbox}
        loadWorkspace={loadWorkspace}
        reloadOriginalReferenceTemplates={reloadOriginalReferenceTemplates}
        handleCancelComposeTask={handleCancelComposeTask}
        handleOpenPublishModal={handleOpenPublishModal}
        getTaskStatusClass={getTaskStatusClass}
        getOriginalTaskStatusClass={getWorkTaskStatusClass}
        getOriginalTaskStatusText={getWorkTaskStatusText}
        getPublishTaskStatusText={getPublishTaskStatusText}
        getPublishTaskSummaryText={getPublishTaskSummaryText}
        getWorkPublishTaskLabel={getWorkPublishTaskLabel}
        formatDateTime={formatDateTime}
      />
    );
  }

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
          {!hasWorkspaceAccess ? (
            <div className="strategy-content-panel">
              <article className="workspace-panel strategy-page-header">
                <div>
                  <strong>当前无权限进入小红书工作区</strong>
                  <p>当前账号未获得小红书板块的查看权限，请联系管理员在团队权限设置中为对应板块勾选可见权限。</p>
                </div>
                <div className="strategy-page-header-actions">
                  <div className="workspace-status">
                    <span className="archive-pill status-pending">{formatCollaboratorRoleLabel(currentBrandRole)}</span>
                    <span className="status-text error-text">当前账号没有小红书板块的查看权限，请联系管理员开通后再进入。</span>
                  </div>
                </div>
              </article>
            </div>
          ) : (
            <>
          <aside className="strategy-level-panel strategy-level-panel--directory">
            <div className="strategy-level-button-list">
              {visibleSections.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`strategy-level-button strategy-level-button--section ${item.key === activeSection ? "is-active" : ""}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="strategy-content-panel">
            <article className="workspace-panel strategy-page-header">
              <div>
                <strong>{heroTitle}</strong>
                <p>{heroDescription}</p>
              </div>
              <div className="strategy-page-header-actions">
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
                <div className="strategy-inline-actions">
                  <button type="button" className="secondary-button" onClick={() => void loadWorkspace()} disabled={isLoading || isPublishing}>
                    刷新数据
                  </button>
                </div>
              </div>
            </article>
            {renderSectionCard()}
          </div>
            </>
          )}
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
    topicName: resolveMarketingCalendarTopic(item),
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
