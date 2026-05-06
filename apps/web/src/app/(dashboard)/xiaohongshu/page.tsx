"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildCalendarMonthMatrix,
  formatCalendarDate,
  formatCalendarDay,
  formatCalendarListValue,
  formatCalendarMonthLabel,
  formatCalendarOptionalValue,
  formatCalendarWeekday,
  getCalendarFestivalLabel,
  getCalendarMonthKey,
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
import { DEMO_BRAND_ID } from "../../../services/brand-growth";
import { type MediaRecord, type TaskRecord } from "../../../services/personal-center";
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
  deleteXiaohongshuVideoWork,
  deleteXiaohongshuOriginalWork,
  deleteXiaohongshuRewriteWork,
  getXiaohongshuVideoWorks,
  getXiaohongshuOriginalWorks,
  getXiaohongshuRewriteWorks,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
  updateXiaohongshuVideoWork,
  updateXiaohongshuOriginalWork,
  updateXiaohongshuRewriteWork,
} from "../../../services/works";

type XiaohongshuSectionKey = "plan" | "assets" | "calendar" | "original" | "remix" | "video";
const xiaohongshuSections: Array<{ key: XiaohongshuSectionKey; label: string; description: string }> = [
  { key: "plan", label: "营销策划方案", description: "围绕品牌、产品和目标快速生成小红书策划与选题方案。" },
  { key: "assets", label: "素材库", description: "沉淀已生成的笔记、封面、源文件与作品记录。" },
  { key: "calendar", label: "营销日历", description: "按周查看当前内容节奏、发布时间与主题排期。" },
  { key: "original", label: "原创笔记", description: "统一管理原创图文笔记成品，支持新增、编辑、删除与查看配图结果。" },
  { key: "remix", label: "二创笔记", description: "基于已有选题和作品延展二创版本与差异化角度。" },
  { key: "video", label: "视频笔记", description: "把现有主题整理成视频脚本、镜头结构和封面文案。" },
];

const CUSTOM_TOPIC_OPTION = "__CUSTOM__";
const NO_PRODUCT_OPTION = "__NO_PRODUCT__";
const AUTO_IMAGE_COUNT_OPTION = "__AUTO__";

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
  const [selectedVideoWorkId, setSelectedVideoWorkId] = useState("");
  const [deletingVideoWorkId, setDeletingVideoWorkId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialPreviewIndexMap, setMaterialPreviewIndexMap] = useState<Record<string, number>>({});
  const [materialLightbox, setMaterialLightbox] = useState<MediaLightboxState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [isSavingMarketingPlan, setIsSavingMarketingPlan] = useState(false);
  const [isDeletingMarketingPlan, setIsDeletingMarketingPlan] = useState(false);
  const [isEditingMarketingPlan, setIsEditingMarketingPlan] = useState(false);
  const [marketingPlanDraft, setMarketingPlanDraft] = useState("");
  const [selectedCalendarItemId, setSelectedCalendarItemId] = useState("");
  const [isCalendarDetailOpen, setIsCalendarDetailOpen] = useState(false);
  const [activeCalendarMonth, setActiveCalendarMonth] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed" | "error" | "loading">("loading");

  const composerForms = useNoteComposerForms({
    defaultProductId: defaultProduct?.id,
    noProductOption: NO_PRODUCT_OPTION,
    autoImageCountOption: AUTO_IMAGE_COUNT_OPTION,
    customTopicOption: CUSTOM_TOPIC_OPTION,
  });

  const {
    isOriginalModalOpen,
    originalCalendarValue,
    originalCustomTopic,
    originalProductValue,
    originalImageCountValue,
    originalAdditionalInstruction,
    coverReferenceFile,
    galleryReferenceFiles,
    isRewriteModalOpen,
    rewriteMaterialValue,
    rewriteProductValue,
    rewriteAdditionalInstruction,
    isVideoModalOpen,
    videoCalendarValue,
    videoCustomTopic,
    videoProductValue,
    videoReferenceImageFile,
    videoCopyAdditionalInstruction,
    videoProviderValue,
    videoCustomModelName,
    videoDurationValue,
    videoOutputPromptValue,
    videoAdditionalInstruction,
    setOriginalCalendarValue,
    setOriginalCustomTopic,
    setOriginalProductValue,
    setOriginalImageCountValue,
    setOriginalAdditionalInstruction,
    setCoverReferenceFile,
    setGalleryReferenceFiles,
    setRewriteMaterialValue,
    setRewriteProductValue,
    setRewriteAdditionalInstruction,
    setVideoCalendarValue,
    setVideoCustomTopic,
    setVideoProductValue,
    setVideoReferenceImageFile,
    setVideoCopyAdditionalInstruction,
    setVideoProviderValue,
    setVideoCustomModelName,
    setVideoDurationValue,
    setVideoOutputPromptValue,
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
    editingVideoPrompt,
    savingVideoWorkId,
    setEditingOriginalTitle,
    setEditingOriginalContent,
    setSavingOriginalWorkId,
    setEditingRewriteTitle,
    setEditingRewriteContent,
    setSavingRewriteWorkId,
    setEditingVideoTitle,
    setEditingVideoContent,
    setEditingVideoPrompt,
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
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("productId");
    const accountId = params.get("accountId");
    const workId = params.get("workId");

    if (productId && workspace.archive.products.some((item) => item.id === productId)) {
      setSelectedProductId(productId);
    }

    if (accountId && workspace.archive.platformAccounts.some((item) => item.id === accountId)) {
      setSelectedAccountId(accountId);
    }

    if (workId && workspace.media.some((item) => item.id === workId)) {
      setSelectedWorkId(workId);
    }
  }, [workspace.archive.platformAccounts, workspace.archive.products, workspace.media]);

  useEffect(() => {
    const latestPlan = marketingPlanWorkspace.latest;
    setMarketingPlanDraft(latestPlan?.reportMarkdown || "");
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.generatedAt]);

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

  async function loadWorkspace(options?: { preserveMessages?: boolean }) {
    setIsLoading(true);
    setDataSource("loading");
    if (!options?.preserveMessages) {
      setNotice("");
      setErrorMessage("");
    }

    const [workspaceResult, growthReportResult, annualPlanResult, marketingPlanResult, calendarResult, originalWorksResult, rewriteWorksResult, videoWorksResult] =
      await Promise.allSettled([
      getXiaohongshuWorkspace(),
      getGrowthReportWorkspace(),
      getAnnualMarketingPlanWorkspace(),
      getXiaohongshuMarketingPlanWorkspace(),
      getXiaohongshuMarketingCalendarWorkspace(),
      getXiaohongshuOriginalWorks(DEMO_BRAND_ID),
      getXiaohongshuRewriteWorks(DEMO_BRAND_ID),
      getXiaohongshuVideoWorks(DEMO_BRAND_ID),
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
      messages.push("全年营销规划读取失败。");
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

    if (workspaceResult.status === "fulfilled") {
      setDataSource("api");
    } else if (messages.length) {
      setDataSource("error");
    }

    if (messages.length) {
      setErrorMessage(messages.join(" "));
    }
    setIsLoading(false);
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
    brandId: workspace.archive.brand.id || DEMO_BRAND_ID,
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
  const currentSection = xiaohongshuSections.find((item) => item.key === activeSection) ?? xiaohongshuSections[0];

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
    brandId: workspace.archive.brand.id,
    calendarItems: calendarAllItems,
    products: workspace.archive.products,
    materialNotes,
    noProductOption: NO_PRODUCT_OPTION,
    customTopicOption: CUSTOM_TOPIC_OPTION,
    autoImageCountOption: AUTO_IMAGE_COUNT_OPTION,
    setNotice,
    setErrorMessage,
    original: {
      calendarValue: originalCalendarValue,
      customTopic: originalCustomTopic,
      productValue: originalProductValue,
      imageCountValue: originalImageCountValue,
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
      referenceImageFile: videoReferenceImageFile,
      copyAdditionalInstruction: videoCopyAdditionalInstruction,
      providerValue: videoProviderValue,
      customModelName: videoCustomModelName,
      durationValue: videoDurationValue,
      outputPromptValue: videoOutputPromptValue,
      additionalInstruction: videoAdditionalInstruction,
      closeModal: closeVideoModal,
      resetComposer: resetVideoComposer,
      cancelEdit: handleCancelEditVideoWork,
      setWorks: setVideoWorks,
      setSelectedWorkId: setSelectedVideoWorkId,
    },
  });
  const selectedCalendarItem = calendarAllItems.find((item) => item.id === selectedCalendarItemId) || calendarAllItems[0];
  const calendarMonthKeys = useMemo(() => {
    const values = new Set<string>();
    for (const item of calendarAllItems) {
      values.add(getCalendarMonthKey(item.date));
    }
    return Array.from(values).filter(Boolean).sort();
  }, [calendarAllItems]);
  const activeCalendarMonthIndex = Math.max(calendarMonthKeys.indexOf(activeCalendarMonth), 0);
  const resolvedCalendarMonth = calendarMonthKeys[activeCalendarMonthIndex] || "";
  const currentMonthItems = useMemo(
    () => calendarAllItems.filter((item) => getCalendarMonthKey(item.date) === resolvedCalendarMonth),
    [calendarAllItems, resolvedCalendarMonth],
  );
  const calendarMonthMatrix = useMemo(() => buildCalendarMonthMatrix(resolvedCalendarMonth, currentMonthItems), [currentMonthItems, resolvedCalendarMonth]);
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
          ? "当前聚焦【视频笔记】主链路：选择营销日历选题、产品或参考图，生成视频笔记文案、短视频提示词与成片，并统一管理成品。"
        : "当前先聚焦【营销策划方案】主链路：读取品牌资料、小红书数据、品牌增长报告和全年营销规划，生成可编辑保存的 Markdown 方案。";
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
  useEffect(() => {
    if (!selectedWorkId && xhsMedia[0]) {
      setSelectedWorkId(xhsMedia[0].id);
    }
  }, [selectedWorkId, xhsMedia]);

  useEffect(() => {
    if (!selectedOriginalWorkId && originalWorks[0]) {
      setSelectedOriginalWorkId(originalWorks[0].id);
    }
  }, [originalWorks, selectedOriginalWorkId]);

  useEffect(() => {
    if (!selectedRewriteWorkId && rewriteWorks[0]) {
      setSelectedRewriteWorkId(rewriteWorks[0].id);
    }
  }, [rewriteWorks, selectedRewriteWorkId]);

  useEffect(() => {
    if (!selectedVideoWorkId && videoWorks[0]) {
      setSelectedVideoWorkId(videoWorks[0].id);
    }
  }, [selectedVideoWorkId, videoWorks]);

  useEffect(() => {
    if (!originalProductValue || originalProductValue === NO_PRODUCT_OPTION) {
      return;
    }
    if (!workspace.archive.products.some((item) => item.id === originalProductValue)) {
      setOriginalProductValue(workspace.archive.products[0]?.id || NO_PRODUCT_OPTION);
    }
  }, [originalProductValue, workspace.archive.products]);

  useEffect(() => {
    if (originalCalendarValue === CUSTOM_TOPIC_OPTION) {
      return;
    }
    if (!originalCalendarValue || !calendarAllItems.some((item) => item.id === originalCalendarValue)) {
      setOriginalCalendarValue(calendarAllItems[0]?.id || CUSTOM_TOPIC_OPTION);
    }
  }, [calendarAllItems, originalCalendarValue]);

  useEffect(() => {
    if (!rewriteProductValue || rewriteProductValue === NO_PRODUCT_OPTION) {
      return;
    }
    if (!workspace.archive.products.some((item) => item.id === rewriteProductValue)) {
      setRewriteProductValue(workspace.archive.products[0]?.id || NO_PRODUCT_OPTION);
    }
  }, [rewriteProductValue, workspace.archive.products]);

  useEffect(() => {
    if (!materialNotes.length) {
      if (selectedMaterialId) {
        setSelectedMaterialId("");
      }
      return;
    }

    if (!selectedMaterialId || !materialNotes.some((item) => item.id === selectedMaterialId)) {
      setSelectedMaterialId(materialNotes[0].id);
    }
  }, [materialNotes, selectedMaterialId]);

  useEffect(() => {
    if (!materialNotes.length) {
      if (rewriteMaterialValue) {
        setRewriteMaterialValue("");
      }
      return;
    }

    if (!rewriteMaterialValue || !materialNotes.some((item) => item.id === rewriteMaterialValue)) {
      setRewriteMaterialValue(materialNotes[0].id);
    }
  }, [materialNotes, rewriteMaterialValue]);

  useEffect(() => {
    if (!workspace.archive.products.length) {
      setVideoProductValue(NO_PRODUCT_OPTION);
      return;
    }
    if (videoProductValue !== NO_PRODUCT_OPTION && !workspace.archive.products.some((item) => item.id === videoProductValue)) {
      setVideoProductValue(workspace.archive.products[0]?.id || NO_PRODUCT_OPTION);
    }
  }, [videoProductValue, workspace.archive.products]);

  useEffect(() => {
    if (videoCalendarValue === CUSTOM_TOPIC_OPTION) {
      return;
    }
    if (!videoCalendarValue || !calendarAllItems.some((item) => item.id === videoCalendarValue)) {
      setVideoCalendarValue(calendarAllItems[0]?.id || CUSTOM_TOPIC_OPTION);
    }
  }, [calendarAllItems, videoCalendarValue]);

  useEffect(() => {
    if (!calendarAllItems.length) {
      if (selectedCalendarItemId) {
        setSelectedCalendarItemId("");
      }
      return;
    }

    if (!selectedCalendarItemId || !calendarAllItems.some((item) => item.id === selectedCalendarItemId)) {
      setSelectedCalendarItemId(calendarAllItems[0].id);
    }
  }, [calendarAllItems, selectedCalendarItemId]);

  useEffect(() => {
    if (!calendarMonthKeys.length) {
      if (activeCalendarMonth) {
        setActiveCalendarMonth("");
      }
      return;
    }

    if (!activeCalendarMonth || !calendarMonthKeys.includes(activeCalendarMonth)) {
      setActiveCalendarMonth(calendarMonthKeys[calendarMonthKeys.length - 1]);
    }
  }, [activeCalendarMonth, calendarMonthKeys]);

  async function handleGeneratePlan() {
    if (!growthReportWorkspace.latest) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }

    if (!annualPlanWorkspace.latest) {
      setErrorMessage("请先生成全年营销规划。");
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
    if (!latestGrowthReport) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }

    if (!latestAnnualPlan) {
      setErrorMessage("请先生成全年营销规划。");
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
    setIsCalendarDetailOpen(true);
  }

  async function handleDeleteMarketingPlan() {
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

  async function handleSaveOriginalWork() {
    if (!editingOriginalWorkId) {
      return;
    }

    const title = editingOriginalTitle.trim();
    const content = editingOriginalContent.trim();
    if (!title || !content) {
      setErrorMessage("标题和正文不能为空。");
      return;
    }

    setSavingOriginalWorkId(editingOriginalWorkId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await updateXiaohongshuOriginalWork(workspace.archive.brand.id || DEMO_BRAND_ID, editingOriginalWorkId, {
        title,
        content,
      });
      setOriginalWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      setSelectedOriginalWorkId(result.item.id);
      handleCancelEditOriginalWork();
      setNotice("原创笔记已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创笔记更新失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setSavingOriginalWorkId("");
    }
  }

  async function handleDeleteOriginalWork(workId: string) {
    setDeletingOriginalWorkId(workId);
    setNotice("");
    setErrorMessage("");

    try {
      await deleteXiaohongshuOriginalWork(workspace.archive.brand.id || DEMO_BRAND_ID, workId);
      const remainingItems = originalWorks.filter((item) => item.id !== workId);
      setOriginalWorks(remainingItems);
      if (selectedOriginalWorkId === workId) {
        setSelectedOriginalWorkId(remainingItems[0]?.id || "");
      }
      if (editingOriginalWorkId === workId) {
        handleCancelEditOriginalWork();
      }
      setNotice("原创笔记已删除。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创笔记删除失败";
      setErrorMessage(`删除失败：${message}`);
    } finally {
      setDeletingOriginalWorkId("");
    }
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

  async function handleSaveRewriteWork() {
    if (!editingRewriteWorkId) {
      return;
    }

    const title = editingRewriteTitle.trim();
    const content = editingRewriteContent.trim();
    if (!title || !content) {
      setErrorMessage("标题和正文不能为空。");
      return;
    }

    setSavingRewriteWorkId(editingRewriteWorkId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await updateXiaohongshuRewriteWork(workspace.archive.brand.id || DEMO_BRAND_ID, editingRewriteWorkId, {
        title,
        content,
      });
      setRewriteWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      setSelectedRewriteWorkId(result.item.id);
      handleCancelEditRewriteWork();
      setNotice("二创笔记已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "二创笔记更新失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setSavingRewriteWorkId("");
    }
  }

  async function handleDeleteRewriteWork(workId: string) {
    setDeletingRewriteWorkId(workId);
    setNotice("");
    setErrorMessage("");

    try {
      await deleteXiaohongshuRewriteWork(workspace.archive.brand.id || DEMO_BRAND_ID, workId);
      const remainingItems = rewriteWorks.filter((item) => item.id !== workId);
      setRewriteWorks(remainingItems);
      if (selectedRewriteWorkId === workId) {
        setSelectedRewriteWorkId(remainingItems[0]?.id || "");
      }
      if (editingRewriteWorkId === workId) {
        handleCancelEditRewriteWork();
      }
      setNotice("二创笔记已删除。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "二创笔记删除失败";
      setErrorMessage(`删除失败：${message}`);
    } finally {
      setDeletingRewriteWorkId("");
    }
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

  async function handleSaveVideoWork() {
    if (!editingVideoWorkId) {
      return;
    }

    const title = editingVideoTitle.trim();
    const content = editingVideoContent.trim();
    if (!title || !content) {
      setErrorMessage("标题和正文不能为空。");
      return;
    }

    setSavingVideoWorkId(editingVideoWorkId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await updateXiaohongshuVideoWork(workspace.archive.brand.id || DEMO_BRAND_ID, editingVideoWorkId, {
        title,
        content,
        videoPrompt: editingVideoPrompt.trim() || undefined,
      });
      setVideoWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      setSelectedVideoWorkId(result.item.id);
      handleCancelEditVideoWork();
      setNotice("视频笔记已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频笔记更新失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setSavingVideoWorkId("");
    }
  }

  async function handleDeleteVideoWork(workId: string) {
    setDeletingVideoWorkId(workId);
    setNotice("");
    setErrorMessage("");

    try {
      await deleteXiaohongshuVideoWork(workspace.archive.brand.id || DEMO_BRAND_ID, workId);
      const remainingItems = videoWorks.filter((item) => item.id !== workId);
      setVideoWorks(remainingItems);
      if (selectedVideoWorkId === workId) {
        setSelectedVideoWorkId(remainingItems[0]?.id || "");
      }
      if (editingVideoWorkId === workId) {
        handleCancelEditVideoWork();
      }
      setNotice("视频笔记已删除。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频笔记删除失败";
      setErrorMessage(`删除失败：${message}`);
    } finally {
      setDeletingVideoWorkId("");
    }
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
          resolvedCalendarMonth={resolvedCalendarMonth}
          activeCalendarMonthIndex={activeCalendarMonthIndex}
          calendarMonthKeys={calendarMonthKeys}
          calendarMonthMatrix={calendarMonthMatrix}
          isCalendarDetailOpen={isCalendarDetailOpen}
          selectedCalendarItem={selectedCalendarItem}
          onRefresh={() => refreshCalendarWorkspace()}
          onGenerate={() => handleGenerateCalendar()}
          onPrevMonth={() => setActiveCalendarMonth(calendarMonthKeys[Math.max(activeCalendarMonthIndex - 1, 0)] || resolvedCalendarMonth)}
          onNextMonth={() =>
            setActiveCalendarMonth(
              calendarMonthKeys[Math.min(activeCalendarMonthIndex + 1, calendarMonthKeys.length - 1)] || resolvedCalendarMonth,
            )
          }
          onOpenDetail={handleOpenCalendarDetail}
          onCloseDetail={() => setIsCalendarDetailOpen(false)}
          getTaskStatusClass={getTaskStatusClass}
          formatDateTime={formatDateTime}
          formatCalendarMonthLabel={formatCalendarMonthLabel}
          formatCalendarDay={formatCalendarDay}
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
          imageCountValue={originalImageCountValue}
          additionalInstruction={originalAdditionalInstruction}
          coverReferenceFile={coverReferenceFile}
          galleryReferenceFiles={galleryReferenceFiles}
          onRefresh={() => loadWorkspace()}
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
          onImageCountChange={setOriginalImageCountValue}
          onAdditionalInstructionChange={setOriginalAdditionalInstruction}
          onCoverReferenceFileChange={setCoverReferenceFile}
          onGalleryReferenceFilesChange={setGalleryReferenceFiles}
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
          additionalInstruction={rewriteAdditionalInstruction}
          onRefresh={() => loadWorkspace()}
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
        items={videoWorks}
        deletingWorkId={deletingVideoWorkId}
        editingWork={videoEditingWork}
        editingTitle={editingVideoTitle}
        editingContent={editingVideoContent}
        editingVideoPrompt={editingVideoPrompt}
        savingWorkId={savingVideoWorkId}
        isCreateModalOpen={isVideoModalOpen}
        calendarOptions={originalCalendarOptions}
        customTopicOption={CUSTOM_TOPIC_OPTION}
        noProductOption={NO_PRODUCT_OPTION}
        products={workspace.archive.products}
        calendarValue={videoCalendarValue}
        customTopic={videoCustomTopic}
        productValue={videoProductValue}
        referenceImageFile={videoReferenceImageFile}
        copyAdditionalInstruction={videoCopyAdditionalInstruction}
        providerValue={videoProviderValue}
        customModelName={videoCustomModelName}
        durationValue={videoDurationValue}
        outputPromptValue={videoOutputPromptValue}
        additionalInstruction={videoAdditionalInstruction}
        onRefresh={() => loadWorkspace()}
        onOpenCreate={handleOpenVideoModal}
        onPreview={openVideoWorkLightbox}
        onEdit={handleStartEditVideoWork}
        onDelete={(workId) => void handleDeleteVideoWork(workId)}
        onCloseEdit={handleCancelEditVideoWork}
        onSaveEdit={handleSaveVideoWork}
        onEditTitleChange={setEditingVideoTitle}
        onEditContentChange={setEditingVideoContent}
        onEditVideoPromptChange={setEditingVideoPrompt}
        onCloseCreate={handleCloseVideoModal}
        onCreate={handleCreateVideoWork}
        onCalendarChange={setVideoCalendarValue}
        onProductChange={(value) => {
          setVideoProductValue(value);
          if (value !== NO_PRODUCT_OPTION && videoReferenceImageFile) {
            setVideoReferenceImageFile(null);
          }
        }}
        onCustomTopicChange={setVideoCustomTopic}
        onReferenceImageFileChange={(file) => {
          setVideoReferenceImageFile(file);
          if (file) {
            setVideoProductValue(NO_PRODUCT_OPTION);
          }
        }}
        onCopyAdditionalInstructionChange={setVideoCopyAdditionalInstruction}
        onProviderChange={setVideoProviderValue}
        onCustomModelNameChange={setVideoCustomModelName}
        onDurationChange={setVideoDurationValue}
        onOutputPromptChange={setVideoOutputPromptValue}
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
          <aside className="strategy-level-panel">
            {xiaohongshuSections.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`strategy-level-button ${item.key === activeSection ? "is-active" : ""}`}
                onClick={() => setActiveSection(item.key)}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <div className="strategy-content-panel xiaohongshu-content-panel">
            <section className="dashboard-hero xiaohongshu-hero">
              <div>
                <span className="hero-badge">小红书工作台</span>
                <h1>{heroTitle}</h1>
                <p>{heroDescription}</p>
                <div className="workspace-toolbar top-toolbar">
                  <div className="workspace-status">
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

