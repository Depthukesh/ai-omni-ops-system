"use client";

import { Lunar, Solar } from "lunar-javascript";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { DEMO_BRAND_ID } from "../../../services/brand-growth";
import { type XhsCollectedNoteRecord } from "../../../services/collectors";
import { API_BASE_URL } from "../../../services/http";
import { type MediaRecord, type TaskRecord } from "../../../services/personal-center";
import {
  createXiaohongshuDesktopDraftSession,
  completeXiaohongshuMobileDraftSession,
  createXiaohongshuMobileDraftSession,
  type XiaohongshuDesktopDraftSession,
  type XiaohongshuMobileDraftSession,
} from "../../../services/publishing";
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
  deleteXiaohongshuOriginalWork,
  deleteXiaohongshuRewriteWork,
  generateXiaohongshuOriginalWork,
  generateXiaohongshuRewriteWork,
  getXiaohongshuOriginalWorks,
  getXiaohongshuRewriteWorks,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  updateXiaohongshuOriginalWork,
  updateXiaohongshuRewriteWork,
} from "../../../services/works";

type XiaohongshuSectionKey = "plan" | "assets" | "calendar" | "original" | "remix" | "video";
type PublishableWorkTarget = {
  id: string;
  workKind: "ORIGINAL" | "REWRITE";
  noteCategory: "原创" | "二创";
  title: string;
  sourceLabel: string;
};

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
const WEB_DESKTOP_PUBLISH_SOURCE = "ai-omni-ops-web";
const EXTENSION_DESKTOP_PUBLISH_SOURCE = "ai-omni-xhs-extension";

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
  const [isOriginalModalOpen, setIsOriginalModalOpen] = useState(false);
  const [originalCalendarValue, setOriginalCalendarValue] = useState("");
  const [originalCustomTopic, setOriginalCustomTopic] = useState("");
  const [originalProductValue, setOriginalProductValue] = useState(defaultProduct?.id || NO_PRODUCT_OPTION);
  const [originalImageCountValue, setOriginalImageCountValue] = useState(AUTO_IMAGE_COUNT_OPTION);
  const [originalAdditionalInstruction, setOriginalAdditionalInstruction] = useState("");
  const [coverReferenceFile, setCoverReferenceFile] = useState<File | null>(null);
  const [galleryReferenceFiles, setGalleryReferenceFiles] = useState<File[]>([]);
  const [editingOriginalWorkId, setEditingOriginalWorkId] = useState("");
  const [editingOriginalTitle, setEditingOriginalTitle] = useState("");
  const [editingOriginalContent, setEditingOriginalContent] = useState("");
  const [savingOriginalWorkId, setSavingOriginalWorkId] = useState("");
  const [deletingOriginalWorkId, setDeletingOriginalWorkId] = useState("");
  const [rewriteWorks, setRewriteWorks] = useState<XiaohongshuRewriteWorkRecord[]>([]);
  const [selectedRewriteWorkId, setSelectedRewriteWorkId] = useState("");
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteMaterialValue, setRewriteMaterialValue] = useState("");
  const [rewriteProductValue, setRewriteProductValue] = useState(defaultProduct?.id || NO_PRODUCT_OPTION);
  const [rewriteAdditionalInstruction, setRewriteAdditionalInstruction] = useState("");
  const [editingRewriteWorkId, setEditingRewriteWorkId] = useState("");
  const [editingRewriteTitle, setEditingRewriteTitle] = useState("");
  const [editingRewriteContent, setEditingRewriteContent] = useState("");
  const [savingRewriteWorkId, setSavingRewriteWorkId] = useState("");
  const [deletingRewriteWorkId, setDeletingRewriteWorkId] = useState("");
  const [isRewriteSubmitting, setIsRewriteSubmitting] = useState(false);
  const [rewriteSubmittingLabel, setRewriteSubmittingLabel] = useState("");
  const [publishingTarget, setPublishingTarget] = useState<PublishableWorkTarget | null>(null);
  const [publishingAccountValue, setPublishingAccountValue] = useState(defaultAccount?.id || "");
  const [isDesktopExtensionReady, setIsDesktopExtensionReady] = useState(false);
  const [isCreatingDesktopPublishSession, setIsCreatingDesktopPublishSession] = useState(false);
  const [activeDesktopPublishSession, setActiveDesktopPublishSession] = useState<XiaohongshuDesktopDraftSession | null>(null);
  const [isCreatingMobilePublishSession, setIsCreatingMobilePublishSession] = useState(false);
  const [activeMobilePublishSession, setActiveMobilePublishSession] = useState<XiaohongshuMobileDraftSession | null>(null);
  const [mobilePublishQrDataUrl, setMobilePublishQrDataUrl] = useState("");
  const [isCompletingMobilePublishSession, setIsCompletingMobilePublishSession] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialPreviewIndexMap, setMaterialPreviewIndexMap] = useState<Record<string, number>>({});
  const [materialLightbox, setMaterialLightbox] = useState<{ title: string; url: string; type: "IMAGE" | "VIDEO" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [isSavingMarketingPlan, setIsSavingMarketingPlan] = useState(false);
  const [isDeletingMarketingPlan, setIsDeletingMarketingPlan] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingMarketingPlan, setIsEditingMarketingPlan] = useState(false);
  const [marketingPlanDraft, setMarketingPlanDraft] = useState("");
  const [selectedCalendarItemId, setSelectedCalendarItemId] = useState("");
  const [isCalendarDetailOpen, setIsCalendarDetailOpen] = useState(false);
  const [activeCalendarMonth, setActiveCalendarMonth] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed" | "error" | "loading">("loading");

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

  useEffect(() => {
    if (!publishingAccountValue && defaultAccount?.id) {
      setPublishingAccountValue(defaultAccount.id);
    }
  }, [defaultAccount?.id, publishingAccountValue]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object" || payload.source !== EXTENSION_DESKTOP_PUBLISH_SOURCE) {
        return;
      }

      if (payload.type === "AI_OMNI_XHS_EXTENSION_PONG") {
        setIsDesktopExtensionReady(true);
        return;
      }

      if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_STARTED") {
        setNotice("电脑端发布扩展已接管本次发布，正在自动打开小红书创作者中心并写入草稿。");
        setErrorMessage("");
        return;
      }

      if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_PROGRESS") {
        const detail = typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : "电脑端发布扩展正在执行。";
        setNotice(detail);
        setErrorMessage("");
        return;
      }

      if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_SUCCESS") {
        setNotice("电脑端一键发布已完成，标题、正文和配图已自动写入小红书草稿箱。");
        setErrorMessage("");
        void loadWorkspace({ preserveMessages: true });
        return;
      }

      if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_FAILED") {
        const detail = typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : "请检查扩展日志和小红书创作者页是否已登录。";
        setErrorMessage(`电脑端一键发布失败：${detail}`);
        void loadWorkspace({ preserveMessages: true });
      }
    };

    window.addEventListener("message", handleMessage);
    window.postMessage({ source: WEB_DESKTOP_PUBLISH_SOURCE, type: "AI_OMNI_XHS_EXTENSION_PING" }, "*");
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!activeMobilePublishSession?.mobileUrl) {
      setMobilePublishQrDataUrl("");
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(activeMobilePublishSession.mobileUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    })
      .then((value: string) => {
        if (!cancelled) {
          setMobilePublishQrDataUrl(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMobilePublishQrDataUrl("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeMobilePublishSession?.mobileUrl]);

  useEffect(() => {
    const taskStatus = marketingPlanWorkspace.latestTask?.taskStatus;
    const isTaskActive = taskStatus === "QUEUED" || taskStatus === "RUNNING";
    if (!isTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshMarketingPlanWorkspace(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [marketingPlanWorkspace.latestTask?.taskStatus, marketingPlanWorkspace.latestTask?.updatedAt]);

  useEffect(() => {
    const taskStatus = calendarWorkspace.latestTask?.taskStatus;
    const isTaskActive = taskStatus === "QUEUED" || taskStatus === "RUNNING";
    if (!isTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshCalendarWorkspace(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [calendarWorkspace.latestTask?.taskStatus, calendarWorkspace.latestTask?.updatedAt]);

  useEffect(() => {
    const latestTask = workspace.tasks
      .filter((item) => item.taskType === "XHS_ORIGINAL_NOTE")
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
    const isTaskActive = latestTask?.taskStatus === "QUEUED" || latestTask?.taskStatus === "RUNNING";
    if (!isTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [workspace.tasks]);

  useEffect(() => {
    const latestTask = workspace.tasks
      .filter((item) => item.taskType === "XHS_REWRITE_NOTE")
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
    const isTaskActive = latestTask?.taskStatus === "QUEUED" || latestTask?.taskStatus === "RUNNING";
    if (!isTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [workspace.tasks]);

  useEffect(() => {
    const latestTask = workspace.tasks
      .filter((item) => item.taskType === "XHS_PUBLISH_MOBILE_DRAFT")
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
    const isTaskActive = latestTask?.taskStatus === "QUEUED" || latestTask?.taskStatus === "RUNNING";
    if (!isTaskActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [workspace.tasks]);

  async function loadWorkspace(options?: { preserveMessages?: boolean }) {
    setIsLoading(true);
    setDataSource("loading");
    if (!options?.preserveMessages) {
      setNotice("");
      setErrorMessage("");
    }

    const [workspaceResult, growthReportResult, annualPlanResult, marketingPlanResult, calendarResult, originalWorksResult, rewriteWorksResult] =
      await Promise.allSettled([
      getXiaohongshuWorkspace(),
      getGrowthReportWorkspace(),
      getAnnualMarketingPlanWorkspace(),
      getXiaohongshuMarketingPlanWorkspace(),
      getXiaohongshuMarketingCalendarWorkspace(),
      getXiaohongshuOriginalWorks(DEMO_BRAND_ID),
      getXiaohongshuRewriteWorks(DEMO_BRAND_ID),
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

  function openMaterialLightbox(item: XhsCollectedNoteRecord, index = 0) {
    const mediaItems = getMaterialMediaItems(item);
    const target = mediaItems[index];
    if (!target) {
      return;
    }
    setMaterialLightbox({
      title: `${item.title} · ${target.label}`,
      url: target.previewUrl,
      type: target.type,
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
  const originalTasks = useMemo(
    () =>
      workspace.tasks
        .filter((item) => item.taskType === "XHS_ORIGINAL_NOTE")
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [workspace.tasks],
  );
  const latestOriginalTask = originalTasks[0];
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
  const isMarketingPlanTaskActive = Boolean(
    latestMarketingPlanTask && (latestMarketingPlanTask.taskStatus === "QUEUED" || latestMarketingPlanTask.taskStatus === "RUNNING"),
  );
  const isCalendarTaskActive = Boolean(
    latestCalendarTask && (latestCalendarTask.taskStatus === "QUEUED" || latestCalendarTask.taskStatus === "RUNNING"),
  );
  const marketingPlanInlineError =
    latestMarketingPlanTask?.taskStatus === "FAILED" ? latestMarketingPlanTask.errorMessage?.trim() || "" : "";
  const calendarInlineError = latestCalendarTask?.taskStatus === "FAILED" ? latestCalendarTask.errorMessage?.trim() || "" : "";
  const topLevelErrorMessage =
    activeSection === "plan" && marketingPlanInlineError
      ? errorMessage.replace(`小红书营销策划方案生成失败：${marketingPlanInlineError}`, "").trim()
      : activeSection === "calendar"
        ? ""
        : errorMessage;
  const marketingPlanTaskStatusText = latestMarketingPlanTask
    ? latestMarketingPlanTask.taskStatus === "QUEUED"
      ? "排队中"
      : latestMarketingPlanTask.taskStatus === "RUNNING"
        ? latestMarketingPlanTask.phaseText || "生成中"
        : latestMarketingPlanTask.taskStatus === "SUCCESS"
          ? "已完成"
          : latestMarketingPlanTask.taskStatus === "FAILED"
            ? "生成失败"
            : latestMarketingPlanTask.taskStatus
    : "";
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
  const originalCalendarOptions = useMemo(
    () =>
      calendarAllItems.map((item) => ({
        value: item.id,
        label: `${item.date}｜${item.topicName}`,
      })),
    [calendarAllItems],
  );
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
  const calendarTaskStatusText = latestCalendarTask
    ? latestCalendarTask.taskStatus === "QUEUED"
      ? "排队中"
      : latestCalendarTask.taskStatus === "RUNNING"
        ? latestCalendarTask.phaseText || "生成中"
        : latestCalendarTask.taskStatus === "SUCCESS"
          ? "已完成"
          : latestCalendarTask.taskStatus === "FAILED"
            ? "生成失败"
            : latestCalendarTask.taskStatus
    : "";
  const isOriginalTaskActive = Boolean(
    latestOriginalTask && (latestOriginalTask.taskStatus === "QUEUED" || latestOriginalTask.taskStatus === "RUNNING"),
  );
  const originalInlineError = latestOriginalTask?.taskStatus === "FAILED" ? latestOriginalTask.errorMessage?.trim() || "" : "";
  const originalTaskStatusText = latestOriginalTask
    ? latestOriginalTask.taskStatus === "QUEUED"
      ? "排队中"
      : latestOriginalTask.taskStatus === "RUNNING"
        ? "创作中"
        : latestOriginalTask.taskStatus === "SUCCESS"
          ? "已完成"
          : latestOriginalTask.taskStatus === "FAILED"
            ? "创作失败"
            : latestOriginalTask.taskStatus
    : "";
  const rewriteTasks = useMemo(
    () =>
      workspace.tasks
        .filter((item) => item.taskType === "XHS_REWRITE_NOTE")
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [workspace.tasks],
  );
  const latestRewriteTask = rewriteTasks[0];
  const isRewriteTaskActive = Boolean(
    latestRewriteTask && (latestRewriteTask.taskStatus === "QUEUED" || latestRewriteTask.taskStatus === "RUNNING"),
  );
  const showRewriteSubmittingState = isRewriteSubmitting && !isRewriteTaskActive;
  const rewriteInlineError = latestRewriteTask?.taskStatus === "FAILED" ? latestRewriteTask.errorMessage?.trim() || "" : "";
  const rewriteTaskStatusText = latestRewriteTask
    ? latestRewriteTask.taskStatus === "QUEUED"
      ? "排队中"
      : latestRewriteTask.taskStatus === "RUNNING"
        ? "创作中"
        : latestRewriteTask.taskStatus === "SUCCESS"
          ? "已完成"
          : latestRewriteTask.taskStatus === "FAILED"
            ? "创作失败"
            : latestRewriteTask.taskStatus
    : "";
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
        : "小红书营销策划方案工作区";
  const heroDescription =
    activeSection === "original"
      ? "当前聚焦【原创笔记】主链路：选择营销日历选题与产品，生成图文内容和图片作品，并统一管理已完成作品。"
      : activeSection === "remix"
        ? "当前聚焦【二创笔记】主链路：从素材库选择作品，结合产品与用户要求生成差异化二创图文，并统一管理成品。"
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

  function resetOriginalComposer() {
    setOriginalCalendarValue(calendarAllItems[0]?.id || CUSTOM_TOPIC_OPTION);
    setOriginalCustomTopic("");
    setOriginalProductValue(workspace.archive.products[0]?.id || NO_PRODUCT_OPTION);
    setOriginalImageCountValue(AUTO_IMAGE_COUNT_OPTION);
    setOriginalAdditionalInstruction("");
    setCoverReferenceFile(null);
    setGalleryReferenceFiles([]);
  }

  function handleOpenOriginalModal() {
    resetOriginalComposer();
    setIsOriginalModalOpen(true);
  }

  function handleCloseOriginalModal() {
    setIsOriginalModalOpen(false);
  }

  async function handleCreateOriginalWork() {
    const isCustomTopic = originalCalendarValue === CUSTOM_TOPIC_OPTION;
    const customTopicName = originalCustomTopic.trim();

    if (isCustomTopic && !customTopicName) {
      setErrorMessage("请选择营销日历选题，或填写你自己的选题。");
      return;
    }

    if (!isCustomTopic && !originalCalendarValue) {
      setErrorMessage("请先选择一个营销日历选题。");
      return;
    }

    setIsPublishing(true);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await generateXiaohongshuOriginalWork(workspace.archive.brand.id || DEMO_BRAND_ID, {
        calendarItemId: isCustomTopic ? undefined : originalCalendarValue,
        customTopicName: isCustomTopic ? customTopicName : undefined,
        productId: originalProductValue === NO_PRODUCT_OPTION ? undefined : originalProductValue,
        imageCount: originalImageCountValue === AUTO_IMAGE_COUNT_OPTION ? undefined : Number(originalImageCountValue),
        additionalInstruction: originalAdditionalInstruction.trim() || undefined,
        coverReferenceFile,
        galleryReferenceFiles,
      });

      setOriginalWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      setSelectedOriginalWorkId(result.item.id);
      setIsOriginalModalOpen(false);
      setEditingOriginalWorkId("");
      setEditingOriginalTitle("");
      setEditingOriginalContent("");
      setNotice("原创笔记已创作完成，并已同步保存到“我的作品”。");
      resetOriginalComposer();
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创笔记创作失败";
      setErrorMessage(`创作失败：${message}`);
    } finally {
      setIsPublishing(false);
    }
  }

  function handleStartEditOriginalWork(item: XiaohongshuOriginalWorkRecord) {
    setSelectedOriginalWorkId(item.id);
    setEditingOriginalWorkId(item.id);
    setEditingOriginalTitle(item.title);
    setEditingOriginalContent(item.content);
  }

  function handleCancelEditOriginalWork() {
    setEditingOriginalWorkId("");
    setEditingOriginalTitle("");
    setEditingOriginalContent("");
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

  function resetRewriteComposer() {
    setRewriteMaterialValue(materialNotes[0]?.id || "");
    setRewriteProductValue(workspace.archive.products[0]?.id || NO_PRODUCT_OPTION);
    setRewriteAdditionalInstruction("");
  }

  function handleOpenRewriteModal() {
    resetRewriteComposer();
    setIsRewriteModalOpen(true);
  }

  function handleCloseRewriteModal() {
    setIsRewriteModalOpen(false);
  }

  async function handleCreateRewriteWork() {
    if (!rewriteMaterialValue) {
      setErrorMessage("请先从素材库里选择一个二创作品。");
      return;
    }

    setIsPublishing(true);
    setIsRewriteSubmitting(true);
    setRewriteSubmittingLabel(
      materialNotes.find((item) => item.id === rewriteMaterialValue)?.title || "二创笔记任务已提交",
    );
    setNotice("");
    setErrorMessage("");
    setIsRewriteModalOpen(false);

    try {
      const result = await generateXiaohongshuRewriteWork(workspace.archive.brand.id || DEMO_BRAND_ID, {
        sourceMaterialId: rewriteMaterialValue,
        productId: rewriteProductValue === NO_PRODUCT_OPTION ? undefined : rewriteProductValue,
        additionalInstruction: rewriteAdditionalInstruction.trim() || undefined,
      });

      setRewriteWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      setSelectedRewriteWorkId(result.item.id);
      setEditingRewriteWorkId("");
      setEditingRewriteTitle("");
      setEditingRewriteContent("");
      setNotice("二创笔记已创作完成，并已同步保存到“我的作品”。");
      resetRewriteComposer();
    } catch (error) {
      const message = error instanceof Error ? error.message : "二创笔记创作失败";
      setErrorMessage(`创作失败：${message}`);
    } finally {
      setIsRewriteSubmitting(false);
      setRewriteSubmittingLabel("");
      setIsPublishing(false);
    }
  }

  function handleStartEditRewriteWork(item: XiaohongshuRewriteWorkRecord) {
    setSelectedRewriteWorkId(item.id);
    setEditingRewriteWorkId(item.id);
    setEditingRewriteTitle(item.title);
    setEditingRewriteContent(item.content);
  }

  function handleCancelEditRewriteWork() {
    setEditingRewriteWorkId("");
    setEditingRewriteTitle("");
    setEditingRewriteContent("");
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

  function handleOpenPublishModal(target: PublishableWorkTarget) {
    setPublishingTarget(target);
    setPublishingAccountValue(defaultAccount?.id || workspace.archive.platformAccounts.find((item) => item.platform === "XIAOHONGSHU")?.id || "");
    setActiveDesktopPublishSession(null);
    setActiveMobilePublishSession(null);
    setMobilePublishQrDataUrl("");
    setNotice("");
    setErrorMessage("");
    void probeDesktopPublisher();
  }

  function handleClosePublishModal() {
    setPublishingTarget(null);
    setActiveDesktopPublishSession(null);
    setActiveMobilePublishSession(null);
    setMobilePublishQrDataUrl("");
    setIsCreatingDesktopPublishSession(false);
    setIsCreatingMobilePublishSession(false);
    setIsCompletingMobilePublishSession(false);
  }

  async function probeDesktopPublisher(timeoutMs = 1200) {
    if (typeof window === "undefined") {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      let finished = false;
      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timer);
      };
      const onMessage = (event: MessageEvent) => {
        const payload = event.data;
        if (!payload || typeof payload !== "object") {
          return;
        }
        if (payload.source === EXTENSION_DESKTOP_PUBLISH_SOURCE && payload.type === "AI_OMNI_XHS_EXTENSION_PONG") {
          finished = true;
          setIsDesktopExtensionReady(true);
          cleanup();
          resolve(true);
        }
      };
      const timer = window.setTimeout(() => {
        if (finished) {
          return;
        }
        setIsDesktopExtensionReady(false);
        cleanup();
        resolve(false);
      }, timeoutMs);

      window.addEventListener("message", onMessage);
      window.postMessage({ source: WEB_DESKTOP_PUBLISH_SOURCE, type: "AI_OMNI_XHS_EXTENSION_PING" }, "*");
    });
  }

  async function handleCreateDesktopPublishSession() {
    if (!publishingTarget) {
      return;
    }

    setIsCreatingDesktopPublishSession(true);
    setNotice("");
    setErrorMessage("");

    try {
      const installed = await probeDesktopPublisher();
      if (!installed) {
        throw new Error("未检测到电脑端发布扩展。请先在浏览器开发者模式加载 `apps/web/public/extensions/xhs-draft-publisher`。");
      }

      const result = await createXiaohongshuDesktopDraftSession(
        workspace.archive.brand.id || DEMO_BRAND_ID,
        publishingTarget.id,
        {
          accountId: publishingAccountValue || undefined,
        },
      );

      setActiveDesktopPublishSession(result.session);
      setNotice(`${publishingTarget.noteCategory}笔记的电脑端一键发布任务已创建，正在自动写入小红书草稿箱。`);
      window.postMessage(
        {
          source: WEB_DESKTOP_PUBLISH_SOURCE,
          type: "AI_OMNI_XHS_EXTENSION_START_DRAFT",
          payload: {
            apiBaseUrl: API_BASE_URL,
            session: result.session,
          },
        },
        "*",
      );
      await loadWorkspace({ preserveMessages: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "电脑端一键发布失败";
      setErrorMessage(`发布失败：${message}`);
    } finally {
      setIsCreatingDesktopPublishSession(false);
    }
  }

  async function handleCreateMobilePublishSession() {
    if (!publishingTarget) {
      return;
    }

    setIsCreatingMobilePublishSession(true);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await createXiaohongshuMobileDraftSession(
        workspace.archive.brand.id || DEMO_BRAND_ID,
        publishingTarget.id,
        {
          accountId: publishingAccountValue || undefined,
        },
      );
      setActiveMobilePublishSession(result.session);
      setNotice(`${publishingTarget.noteCategory}笔记的手机扫码接力二维码已生成。`);
      await loadWorkspace({ preserveMessages: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成手机接力二维码失败";
      setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsCreatingMobilePublishSession(false);
    }
  }

  async function handleCompleteMobilePublishSession() {
    if (!activeMobilePublishSession?.token) {
      return;
    }

    setIsCompletingMobilePublishSession(true);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await completeXiaohongshuMobileDraftSession(activeMobilePublishSession.token, {
        result: "SUCCESS",
        note: "已在手机端完成草稿接力",
      });
      setActiveMobilePublishSession(result.session);
      setNotice("已将本次手机接力保存草稿标记为完成。");
      await loadWorkspace({ preserveMessages: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新发布状态失败";
      setErrorMessage(`更新失败：${message}`);
    } finally {
      setIsCompletingMobilePublishSession(false);
    }
  }

  function renderSectionCard() {
    if (activeSection === "plan") {
      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{currentSection.label}</strong>
              <p className="panel-subtext">只保留 Markdown 编辑与预览，聚焦生成、编辑、保存这条主链路。</p>
            </div>
            <div className="strategy-inline-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void loadWorkspace()}
                disabled={isLoading || isPublishing || isSavingMarketingPlan || isDeletingMarketingPlan}
              >
                刷新数据
              </button>
              {latestMarketingPlan ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMarketingPlanDraft(latestMarketingPlan.reportMarkdown);
                    setIsEditingMarketingPlan(true);
                    setNotice("已进入编辑状态，可直接修改左侧 Markdown 内容。");
                  }}
                  disabled={isGenerating || isLoading || isDeletingMarketingPlan || isMarketingPlanTaskActive}
                >
                  编辑
                </button>
              ) : null}
              {latestMarketingPlan ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleDeleteMarketingPlan()}
                  disabled={isDeletingMarketingPlan || isGenerating || isLoading || isMarketingPlanTaskActive}
                >
                  {isDeletingMarketingPlan ? "删除中..." : "删除"}
                </button>
              ) : null}
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleGeneratePlan()}
                disabled={isGenerating || isLoading || !canGenerateMarketingPlan || isMarketingPlanTaskActive}
              >
                {isGenerating ? "提交中..." : isMarketingPlanTaskActive ? "后台生成中..." : latestMarketingPlan ? "重新生成" : "一键生成"}
              </button>
            </div>
          </div>

          <article className="light-data-panel report-editor-panel report-editor-panel--compact">
            <div className="report-editor-head">
              <div>
                <strong>{latestMarketingPlan?.title || "小红书营销策划方案"}</strong>
                <p>调用 `xiaohongshu-brand-marketing-plan` 技能生成 Markdown 长文，左侧编辑，右侧预览。</p>
              </div>
              <div className="report-editor-actions">
                <span className={`archive-pill ${canGenerateMarketingPlan ? "status-ready" : "status-in_progress"}`}>
                  {canGenerateMarketingPlan ? "已满足生成条件" : "等待前置输入"}
                </span>
                {latestMarketingPlanTask ? (
                  <span className={`archive-pill ${getTaskStatusClass(latestMarketingPlanTask.taskStatus)}`}>{marketingPlanTaskStatusText}</span>
                ) : null}
                {latestMarketingPlan?.generatedAt ? (
                  <span className="archive-pill status-ready">{formatDateTime(latestMarketingPlan.generatedAt)}</span>
                ) : null}
                {latestMarketingPlan?.modelName ? <span className="archive-pill status-pending">{latestMarketingPlan.modelName}</span> : null}
                {latestMarketingPlan ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleSaveMarketingPlan()}
                    disabled={isSavingMarketingPlan || isGenerating || isDeletingMarketingPlan || isMarketingPlanTaskActive}
                  >
                    {isSavingMarketingPlan ? "保存中..." : "保存报告"}
                  </button>
                ) : null}
              </div>
            </div>
            {!canGenerateMarketingPlan ? <div className="report-inline-tip">请先完成品牌增长报告与全年营销规划，再开始生成。</div> : null}
            {isMarketingPlanTaskActive ? (
              <div className="report-inline-tip">
                {latestMarketingPlanTask?.taskStatus === "QUEUED"
                  ? "正在排队生成，页面会自动刷新结果。"
                  : latestMarketingPlanTask?.phaseText
                    ? `${latestMarketingPlanTask.phaseText}${latestMarketingPlanTask.phaseIndex && latestMarketingPlanTask.phaseTotal ? `（${latestMarketingPlanTask.phaseIndex}/${latestMarketingPlanTask.phaseTotal}）` : ""}`
                    : "正在后台生成，完成后会自动刷新到编辑区。"}
              </div>
            ) : null}
            {marketingPlanInlineError ? (
              <div className="report-inline-tip report-inline-tip--error">{marketingPlanInlineError}</div>
            ) : null}

            {!latestMarketingPlan ? (
              <div className="empty-state">当前还没有小红书营销策划方案，点击右上角“一键生成”开始。</div>
            ) : (
              <div className="report-editor-grid">
                <label className="report-editor-pane">
                  <span>{isEditingMarketingPlan ? "Markdown 编辑器" : "Markdown 内容"}</span>
                  <textarea
                    className="report-markdown-textarea"
                    value={marketingPlanDraft}
                    onChange={(event) => {
                      setMarketingPlanDraft(event.target.value);
                      setIsEditingMarketingPlan(true);
                    }}
                    placeholder="这里显示并编辑小红书营销策划方案 Markdown 内容"
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
      );
    }

    if (activeSection === "assets") {
      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{currentSection.label}</strong>
              <p className="panel-subtext">{currentSection.description}</p>
            </div>
            <div className="strategy-inline-actions">
              <button type="button" className="secondary-button" onClick={() => void loadWorkspace()} disabled={isLoading || isPublishing}>
                刷新数据
              </button>
            </div>
          </div>

          {materialNotes.length ? (
            <div className="xhs-material-library">
              <div className="xhs-material-card-grid">
                {materialNotes.map((item) => {
                  const mediaItems = getMaterialMediaItems(item);
                  const previewIndex = getMaterialPreviewIndex(materialPreviewIndexMap, item.id, mediaItems.length);
                  const previewItem = mediaItems[previewIndex];

                  return (
                    <article key={item.id} className={`xhs-material-card ${selectedMaterialId === item.id ? "is-active" : ""}`}>
                      <button
                        type="button"
                        className="xhs-material-card-stage"
                        onClick={() => {
                          setSelectedMaterialId(item.id);
                          if (previewItem) {
                            openMaterialLightbox(item, previewIndex);
                          }
                        }}
                      >
                        {previewItem ? (
                          previewItem.type === "VIDEO" ? (
                            <video className="xhs-material-card-media" src={previewItem.previewUrl} muted preload="metadata" />
                          ) : (
                            <img className="xhs-material-card-media" src={previewItem.previewUrl} alt={item.title} />
                          )
                        ) : (
                          <span className="xhs-material-card-empty">暂无素材</span>
                        )}
                        <span className="xhs-material-card-badge">对标</span>
                      </button>
                      {mediaItems.length > 1 ? (
                        <div className="xhs-material-card-carousel">
                          <button type="button" className="note-page-button" onClick={() => shiftMaterialPreview(item.id, mediaItems.length, -1)}>
                            ‹
                          </button>
                          <span>{previewIndex + 1}/{mediaItems.length}</span>
                          <button type="button" className="note-page-button" onClick={() => shiftMaterialPreview(item.id, mediaItems.length, 1)}>
                            ›
                          </button>
                        </div>
                      ) : null}
                      <div className="xhs-material-card-body">
                        <span className="xhs-material-card-author">{item.nickname || "未知作者"}</span>
                        <strong>{item.title}</strong>
                        <p>{item.noteType || "笔记"} · {item.createdAtText || formatDateTime(item.collectedAt)}</p>
                        <div className="xhs-material-card-metrics">
                          <span><strong>{formatCountValue(item.likeCount)}</strong>点赞</span>
                          <span><strong>{formatCountValue(item.collectCount)}</strong>收藏</span>
                          <span><strong>{formatCountValue(item.commentCount)}</strong>评论</span>
                          <span><strong>{formatCountValue(item.shareCount)}</strong>分享</span>
                          <span><strong>{formatRatioValue(item.likeCollectRatio)}</strong>赞藏率</span>
                          <span><strong>{formatRatioValue(item.likeCommentRatio)}</strong>赞评率</span>
                          <span><strong>{formatRatioValue(item.shareRatio)}</strong>赞享率</span>
                        </div>
                        <div className="xhs-material-card-actions">
                          {(item.noteUrl || item.sourceUrl) ? (
                            <a href={item.noteUrl || item.sourceUrl} target="_blank" rel="noreferrer" className="xhs-material-detail-button">
                              查看详情
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="note-empty-state">素材库里还没有对标作品。请先到品牌增长策略 → 收集数据 → 小红书，把对标作品加入素材库。</div>
          )}
        </article>
      );
    }

    if (activeSection === "calendar") {
      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{currentSection.label}</strong>
              <p className="panel-subtext">{currentSection.description}</p>
            </div>
            <div className="strategy-inline-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshCalendarWorkspace()}
                disabled={isLoading || isPublishing || isGeneratingCalendar}
              >
                刷新结果
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleGenerateCalendar()}
                disabled={isLoading || isPublishing || isGeneratingCalendar || !canGenerateCalendar || isCalendarTaskActive}
              >
                {isGeneratingCalendar ? "提交中..." : isCalendarTaskActive ? "后台生成中..." : latestCalendar ? "生成接下来7天" : "一键生成"}
              </button>
            </div>
          </div>

          <article className="light-data-panel report-editor-panel report-editor-panel--compact">
            <div className="report-editor-head">
              <div>
                <strong>{latestCalendar?.title || "营销日历"}</strong>
                <p>按月查看营销日历；点击任一日期卡片后，在弹窗中查看当天的完整选题详情。</p>
              </div>
              <div className="report-editor-actions">
                <span className={`archive-pill ${canGenerateCalendar ? "status-ready" : "status-in_progress"}`}>
                  {canGenerateCalendar ? "已满足生成条件" : "等待前置输入"}
                </span>
                {latestCalendarTask ? (
                  <span className={`archive-pill ${getTaskStatusClass(latestCalendarTask.taskStatus)}`}>{calendarTaskStatusText}</span>
                ) : null}
                {latestCalendar?.generatedAt ? (
                  <span className="archive-pill status-ready">{formatDateTime(latestCalendar.generatedAt)}</span>
                ) : null}
              </div>
            </div>
            {!canGenerateCalendar ? <div className="report-inline-tip">请先完成品牌增长报告、全年营销规划和小红书营销策划方案，再开始生成营销日历。</div> : null}
            {isCalendarTaskActive ? (
              <div className="report-inline-tip">
                {latestCalendarTask?.taskStatus === "QUEUED"
                  ? "营销日历正在排队生成，页面会自动刷新结果。"
                  : latestCalendarTask?.phaseText
                    ? `${latestCalendarTask.phaseText}${latestCalendarTask.phaseIndex && latestCalendarTask.phaseTotal ? `（${latestCalendarTask.phaseIndex}/${latestCalendarTask.phaseTotal}）` : ""}`
                    : "营销日历正在后台生成，完成后会自动刷新到列表中。"}
              </div>
            ) : null}
            {calendarInlineError ? <div className="report-inline-tip report-inline-tip--error">{calendarInlineError}</div> : null}
            {!calendarAllItems.length ? (
              <div className="empty-state">当前还没有营销日历，点击右上角“一键生成”开始生成未来 7 天排期。</div>
            ) : (
              <div>
                <div className="calendar-month-toolbar">
                  <div>
                    <span>月历视图</span>
                    <strong>{formatCalendarMonthLabel(resolvedCalendarMonth)}</strong>
                  </div>
                  <div className="strategy-inline-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setActiveCalendarMonth(calendarMonthKeys[Math.max(activeCalendarMonthIndex - 1, 0)] || resolvedCalendarMonth)}
                      disabled={activeCalendarMonthIndex <= 0}
                    >
                      上个月
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        setActiveCalendarMonth(
                          calendarMonthKeys[Math.min(activeCalendarMonthIndex + 1, calendarMonthKeys.length - 1)] || resolvedCalendarMonth,
                        )
                      }
                      disabled={activeCalendarMonthIndex >= calendarMonthKeys.length - 1}
                    >
                      下个月
                    </button>
                  </div>
                </div>
                <div className="calendar-weekdays">
                  {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                  ))}
                </div>
                <div className="calendar-grid calendar-grid--month">
                  {calendarMonthMatrix.map((cell, index) =>
                    cell ? (
                      <article
                        className="entity-card personal-card calendar-card calendar-card--month calendar-card--interactive"
                        key={cell.date}
                        onClick={() => handleOpenCalendarDetail(cell.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenCalendarDetail(cell.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="calendar-card-date">
                          <strong>{formatCalendarDay(cell.date)}</strong>
                          <span>{formatCalendarWeekday(cell.date)}</span>
                        </div>
                        <div className="calendar-card-body">
                          <p className="calendar-card-festival">{getCalendarFestivalLabel(cell.date)}</p>
                          <p className="calendar-card-topic">{cell.topicName}</p>
                        </div>
                      </article>
                    ) : (
                      <div className="calendar-card calendar-card--empty" key={`empty-${index}`} />
                    ),
                  )}
                </div>
              </div>
            )}
          </article>
          {isCalendarDetailOpen && selectedCalendarItem ? (
            <div className="media-preview-overlay" onClick={() => setIsCalendarDetailOpen(false)}>
              <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="media-preview-close" onClick={() => setIsCalendarDetailOpen(false)}>
                  关闭
                </button>
                <article className="entity-card personal-card">
                  <div className="entity-card-head">
                    <div>
                      <strong>{selectedCalendarItem.topicName}</strong>
                      <p className="personal-meta">{formatCalendarDate(selectedCalendarItem.date)}</p>
                    </div>
                  </div>
                  <div className="personal-grid">
                    <div>
                      <span>日期</span>
                      <strong>{formatCalendarDate(selectedCalendarItem.date)}</strong>
                    </div>
                    <div>
                      <span>选题名称</span>
                      <strong>{selectedCalendarItem.topicName}</strong>
                    </div>
                    <div>
                      <span>植入产品</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.productName)}</strong>
                    </div>
                    <div>
                      <span>适合人群</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.targetAudience)}</strong>
                    </div>
                    <div>
                      <span>内容目的</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.contentGoal)}</strong>
                    </div>
                    <div>
                      <span>表达重点</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.expressionFocus)}</strong>
                    </div>
                    <div className="field-full">
                      <span>选题内容</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.topicContent)}</strong>
                    </div>
                    <div className="field-full">
                      <span>标题方向</span>
                      <strong>{formatCalendarListValue(selectedCalendarItem.titleDirections)}</strong>
                    </div>
                    <div className="field-full">
                      <span>正文结构</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.bodyStructure)}</strong>
                    </div>
                    <div>
                      <span>封面形式</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.coverFormat)}</strong>
                    </div>
                    <div>
                      <span>封面关键词</span>
                      <strong>{formatCalendarListValue(selectedCalendarItem.coverKeywords)}</strong>
                    </div>
                    <div className="field-full">
                      <span>封面及配图说明</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.imageBrief)}</strong>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ) : null}
        </article>
      );
    }

    if (activeSection === "original") {
      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{currentSection.label}</strong>
              <p className="panel-subtext">{currentSection.description}</p>
            </div>
            <div className="strategy-inline-actions">
              <button type="button" className="secondary-button" onClick={() => void loadWorkspace()} disabled={isLoading || isPublishing || isOriginalTaskActive}>
                刷新列表
              </button>
              <button type="button" className="primary-button" onClick={handleOpenOriginalModal} disabled={isPublishing || isOriginalTaskActive}>
                添加原创笔记
              </button>
            </div>
          </div>

          <article className="light-data-panel report-editor-panel report-editor-panel--compact">
            <div className="report-editor-head">
              <div>
                <strong>原创笔记创作状态</strong>
                <p>点击“一键创作”后，这里会持续显示原创笔记的排队、创作、失败和完成状态。</p>
              </div>
              <div className="report-editor-actions">
                <span className={`archive-pill ${originalTasks.length ? "status-ready" : "status-in_progress"}`}>
                  {originalTasks.length ? `累计 ${originalTasks.length} 条任务` : "暂无任务"}
                </span>
                {latestOriginalTask ? (
                  <span className={`archive-pill ${getTaskStatusClass(latestOriginalTask.taskStatus)}`}>{originalTaskStatusText}</span>
                ) : null}
                {latestOriginalTask?.updatedAt ? (
                  <span className="archive-pill status-pending">{formatDateTime(latestOriginalTask.updatedAt)}</span>
                ) : null}
              </div>
            </div>
            {isOriginalTaskActive ? (
              <div className="report-inline-tip">
                {latestOriginalTask?.taskStatus === "QUEUED"
                  ? "原创笔记任务已提交，正在排队。"
                  : `原创笔记正在生成中：${latestOriginalTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
              </div>
            ) : null}
            {originalInlineError ? <div className="report-inline-tip report-inline-tip--error">{originalInlineError}</div> : null}
          </article>
          <article className="light-data-panel report-editor-panel report-editor-panel--compact">
            <div className="report-editor-head">
              <div>
                <strong>原创笔记发布状态</strong>
                <p>优先走电脑端一键发布到草稿箱；若当前电脑没装扩展，再使用手机扫码接力作为备用方案。</p>
              </div>
              <div className="report-editor-actions">
                <span className={`archive-pill ${latestOriginalPublishTask ? getTaskStatusClass(latestOriginalPublishTask.taskStatus) : "status-in_progress"}`}>
                  {latestOriginalPublishTask ? getPublishTaskStatusText(latestOriginalPublishTask) : "暂无发布任务"}
                </span>
                {latestOriginalPublishTask?.updatedAt ? (
                  <span className="archive-pill status-pending">{formatDateTime(latestOriginalPublishTask.updatedAt)}</span>
                ) : null}
              </div>
            </div>
            {latestOriginalPublishTask ? (
              <div className="report-inline-tip">
                {getPublishTaskSummaryText(latestOriginalPublishTask, "原创")}
              </div>
            ) : null}
          </article>

          {!originalWorks.length ? (
            <div className="empty-state">当前还没有原创笔记，点击右上角“添加原创笔记”开始创作。</div>
          ) : (
            <div className="xhs-material-library">
              <div className="xhs-material-card-grid">
                {originalWorks.map((item) => {
                  const mediaUrls = getOriginalWorkMediaUrls(item);
                  const previewIndex = getMaterialPreviewIndex(materialPreviewIndexMap, item.id, mediaUrls.length);
                  const previewUrl = mediaUrls[previewIndex];
                  return (
                    <article key={item.id} className="xhs-material-card">
                      <button
                        type="button"
                        className="xhs-material-card-stage"
                        onClick={() => openOriginalWorkLightbox(item, previewIndex)}
                      >
                        {previewUrl ? (
                          <img className="xhs-material-card-media" src={previewUrl} alt={item.title} />
                        ) : (
                          <span className="xhs-material-card-empty">暂无封面</span>
                        )}
                        <span className="xhs-material-card-badge">原创</span>
                      </button>
                      {mediaUrls.length > 1 ? (
                        <div className="xhs-material-card-carousel">
                          <button type="button" className="note-page-button" onClick={() => shiftMaterialPreview(item.id, mediaUrls.length, -1)}>
                            ‹
                          </button>
                          <span>{previewIndex + 1}/{mediaUrls.length}</span>
                          <button type="button" className="note-page-button" onClick={() => shiftMaterialPreview(item.id, mediaUrls.length, 1)}>
                            ›
                          </button>
                        </div>
                      ) : null}
                      <div className="xhs-material-card-body">
                        <strong>{item.title}</strong>
                        <p>{item.calendarLabel || item.customTopicName || "自定义选题"}</p>
                        <p>{formatDateTime(item.createdAt)}</p>
                        <div className="xhs-material-card-actions">
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() =>
                              handleOpenPublishModal({
                                id: item.id,
                                workKind: "ORIGINAL",
                                noteCategory: "原创",
                                title: item.title,
                                sourceLabel: item.calendarLabel || item.customTopicName || "原创笔记",
                              })
                            }
                          >
                            {getWorkPublishTaskLabel(publishTaskMap[item.id])}
                          </button>
                          <button type="button" className="secondary-button" onClick={() => handleStartEditOriginalWork(item)}>
                            编辑
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void handleDeleteOriginalWork(item.id)}
                            disabled={deletingOriginalWorkId === item.id}
                          >
                            {deletingOriginalWorkId === item.id ? "删除中..." : "删除"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {originalEditingWork ? (
            <div className="media-preview-overlay" onClick={handleCancelEditOriginalWork}>
              <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="media-preview-close" onClick={handleCancelEditOriginalWork}>
                  关闭
                </button>
                <article className="entity-card personal-card">
                  <div className="entity-card-head">
                    <div>
                      <strong>编辑原创笔记</strong>
                      <p className="personal-meta">
                        {originalEditingWork.calendarLabel || originalEditingWork.customTopicName || "自定义选题"}
                        {originalEditingWork.productName ? ` · 产品：${originalEditingWork.productName}` : ""}
                      </p>
                    </div>
                    <div className="report-editor-actions">
                      <span className="archive-pill status-ready">{originalEditingWork.noteCategory}</span>
                      <span className="archive-pill status-pending">{originalEditingWork.noteType}</span>
                      <span className={`archive-pill ${getOriginalTaskStatusClass(originalEditingWork.taskStatus)}`}>
                        {getOriginalTaskStatusText(originalEditingWork.taskStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="personal-list">
                    <label className="report-editor-pane">
                      <span>标题</span>
                      <input
                        className="report-title-input"
                        value={editingOriginalTitle}
                        onChange={(event) => setEditingOriginalTitle(event.target.value)}
                        placeholder="请输入原创笔记标题"
                      />
                    </label>
                    <label className="report-editor-pane">
                      <span>正文</span>
                      <textarea
                        className="report-content-textarea"
                        value={editingOriginalContent}
                        onChange={(event) => setEditingOriginalContent(event.target.value)}
                        placeholder="请输入原创笔记正文"
                      />
                    </label>
                    <div className="strategy-inline-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleSaveOriginalWork()}
                        disabled={savingOriginalWorkId === originalEditingWork.id}
                      >
                        {savingOriginalWorkId === originalEditingWork.id ? "保存中..." : "保存"}
                      </button>
                      <button type="button" className="secondary-button" onClick={handleCancelEditOriginalWork}>
                        取消
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          {isOriginalModalOpen ? (
            <div className="media-preview-overlay" onClick={handleCloseOriginalModal}>
              <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="media-preview-close" onClick={handleCloseOriginalModal}>
                  关闭
                </button>
                <article className="entity-card personal-card">
                  <div className="entity-card-head">
                    <div>
                      <strong>添加原创笔记</strong>
                      <p className="personal-meta">选择营销日历选题、产品与参考图后，直接触发完整原创图文生成链路。</p>
                    </div>
                  </div>
                  <div className="personal-grid">
                    <label>
                      <span>营销日历</span>
                      <select value={originalCalendarValue} onChange={(event) => setOriginalCalendarValue(event.target.value)}>
                        {originalCalendarOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                        <option value={CUSTOM_TOPIC_OPTION}>自己有选题，不使用系统选题</option>
                      </select>
                    </label>
                    <label>
                      <span>产品</span>
                      <select value={originalProductValue} onChange={(event) => setOriginalProductValue(event.target.value)}>
                        {workspace.archive.products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.productName}
                          </option>
                        ))}
                        <option value={NO_PRODUCT_OPTION}>不植入产品</option>
                      </select>
                    </label>
                    {originalCalendarValue === CUSTOM_TOPIC_OPTION ? (
                      <label className="field-full">
                        <span>自定义选题</span>
                        <input
                          value={originalCustomTopic}
                          onChange={(event) => setOriginalCustomTopic(event.target.value)}
                          placeholder="请输入你的原创笔记选题"
                        />
                      </label>
                    ) : null}
                    <label>
                      <span>封面参考图</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setCoverReferenceFile(event.target.files?.[0] || null)}
                      />
                      <strong>{coverReferenceFile?.name || "未上传"}</strong>
                    </label>
                    <label>
                      <span>配图数量</span>
                      <select value={originalImageCountValue} onChange={(event) => setOriginalImageCountValue(event.target.value)}>
                        <option value={AUTO_IMAGE_COUNT_OPTION}>自由发挥</option>
                        {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => (
                          <option key={count} value={String(count)}>
                            {count}张
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-full">
                      <span>配图参考图</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => setGalleryReferenceFiles(Array.from(event.target.files || []))}
                      />
                      <strong>
                        {galleryReferenceFiles.length
                          ? galleryReferenceFiles.map((item) => item.name).join("、")
                          : "未上传"}
                      </strong>
                    </label>
                    <label className="field-full">
                      <span>用户要求</span>
                      <textarea
                        className="report-markdown-textarea"
                        value={originalAdditionalInstruction}
                        onChange={(event) => setOriginalAdditionalInstruction(event.target.value)}
                        placeholder="例如：更偏生活方式感、门店场景感更强、语气更克制。"
                      />
                    </label>
                  </div>
                  <div className="strategy-inline-actions">
                    <button type="button" className="primary-button" onClick={() => void handleCreateOriginalWork()} disabled={isPublishing}>
                      {isPublishing ? "创作中..." : "一键创作"}
                    </button>
                    <button type="button" className="secondary-button" onClick={handleCloseOriginalModal} disabled={isPublishing}>
                      取消
                    </button>
                  </div>
                </article>
              </div>
            </div>
          ) : null}
        </article>
      );
    }

    if (activeSection === "remix") {
      return (
        <article className="workspace-panel strategy-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{currentSection.label}</strong>
              <p className="panel-subtext">{currentSection.description}</p>
            </div>
            <div className="strategy-inline-actions">
              <button type="button" className="secondary-button" onClick={() => void loadWorkspace()} disabled={isLoading || isPublishing || isRewriteTaskActive}>
                刷新列表
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleOpenRewriteModal}
                disabled={isPublishing || isRewriteTaskActive || !materialNotes.length}
              >
                添加二创笔记
              </button>
            </div>
          </div>

          <article className="light-data-panel report-editor-panel report-editor-panel--compact">
            <div className="report-editor-head">
              <div>
                <strong>二创笔记创作状态</strong>
                <p>点击“一键创作”后，这里会持续显示二创笔记的排队、创作、失败和完成状态。</p>
              </div>
              <div className="report-editor-actions">
                <span className={`archive-pill ${rewriteTasks.length ? "status-ready" : "status-in_progress"}`}>
                  {rewriteTasks.length ? `累计 ${rewriteTasks.length} 条任务` : "暂无任务"}
                </span>
                {showRewriteSubmittingState ? (
                  <span className="archive-pill status-in_progress">创作中</span>
                ) : null}
                {latestRewriteTask ? (
                  <span className={`archive-pill ${getTaskStatusClass(latestRewriteTask.taskStatus)}`}>{rewriteTaskStatusText}</span>
                ) : null}
                {latestRewriteTask?.updatedAt ? (
                  <span className="archive-pill status-pending">{formatDateTime(latestRewriteTask.updatedAt)}</span>
                ) : null}
              </div>
            </div>
            {showRewriteSubmittingState ? (
              <div className="report-inline-tip">
                {`二创笔记已提交，正在生成中：${rewriteSubmittingLabel || "本次二创笔记"}，请稍候。`}
              </div>
            ) : null}
            {isRewriteTaskActive ? (
              <div className="report-inline-tip">
                {latestRewriteTask?.taskStatus === "QUEUED"
                  ? "二创笔记任务已提交，正在排队。"
                  : `二创笔记正在生成中：${latestRewriteTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
              </div>
            ) : null}
            {rewriteInlineError ? <div className="report-inline-tip report-inline-tip--error">{rewriteInlineError}</div> : null}
          </article>
          <article className="light-data-panel report-editor-panel report-editor-panel--compact">
            <div className="report-editor-head">
              <div>
                <strong>二创笔记发布状态</strong>
                <p>优先走电脑端一键发布到草稿箱；若当前电脑没装扩展，再使用手机扫码接力作为备用方案。</p>
              </div>
              <div className="report-editor-actions">
                <span className={`archive-pill ${latestRewritePublishTask ? getTaskStatusClass(latestRewritePublishTask.taskStatus) : "status-in_progress"}`}>
                  {latestRewritePublishTask ? getPublishTaskStatusText(latestRewritePublishTask) : "暂无发布任务"}
                </span>
                {latestRewritePublishTask?.updatedAt ? (
                  <span className="archive-pill status-pending">{formatDateTime(latestRewritePublishTask.updatedAt)}</span>
                ) : null}
              </div>
            </div>
            {latestRewritePublishTask ? (
              <div className="report-inline-tip">
                {getPublishTaskSummaryText(latestRewritePublishTask, "二创")}
              </div>
            ) : null}
          </article>

          {!rewriteWorks.length ? (
            <div className="empty-state">
              {materialNotes.length
                ? "当前还没有二创笔记，点击右上角“添加二创笔记”开始创作。"
                : "素材库里还没有可用作品。请先到“小红书 → 素材库”确认已有作品加入素材库，再开始二创。"}
            </div>
          ) : (
            <div className="xhs-material-library">
              <div className="xhs-material-card-grid">
                {rewriteWorks.map((item) => {
                  const mediaUrls = getRewriteWorkMediaUrls(item);
                  const previewIndex = getMaterialPreviewIndex(materialPreviewIndexMap, item.id, mediaUrls.length);
                  const previewUrl = mediaUrls[previewIndex];
                  return (
                    <article key={item.id} className="xhs-material-card">
                      <button
                        type="button"
                        className="xhs-material-card-stage"
                        onClick={() => openRewriteWorkLightbox(item, previewIndex)}
                      >
                        {previewUrl ? (
                          <img className="xhs-material-card-media" src={previewUrl} alt={item.title} />
                        ) : (
                          <span className="xhs-material-card-empty">暂无封面</span>
                        )}
                        <span className="xhs-material-card-badge">二创</span>
                      </button>
                      {mediaUrls.length > 1 ? (
                        <div className="xhs-material-card-carousel">
                          <button type="button" className="note-page-button" onClick={() => shiftMaterialPreview(item.id, mediaUrls.length, -1)}>
                            ‹
                          </button>
                          <span>{previewIndex + 1}/{mediaUrls.length}</span>
                          <button type="button" className="note-page-button" onClick={() => shiftMaterialPreview(item.id, mediaUrls.length, 1)}>
                            ›
                          </button>
                        </div>
                      ) : null}
                      <div className="xhs-material-card-body">
                        <strong>{item.title}</strong>
                        <p>{item.sourceMaterialTitle}</p>
                        <p>{formatDateTime(item.createdAt)}</p>
                        <div className="xhs-material-card-actions">
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() =>
                              handleOpenPublishModal({
                                id: item.id,
                                workKind: "REWRITE",
                                noteCategory: "二创",
                                title: item.title,
                                sourceLabel: item.sourceMaterialTitle,
                              })
                            }
                          >
                            {getWorkPublishTaskLabel(publishTaskMap[item.id])}
                          </button>
                          <button type="button" className="secondary-button" onClick={() => handleStartEditRewriteWork(item)}>
                            编辑
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void handleDeleteRewriteWork(item.id)}
                            disabled={deletingRewriteWorkId === item.id}
                          >
                            {deletingRewriteWorkId === item.id ? "删除中..." : "删除"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {rewriteEditingWork ? (
            <div className="media-preview-overlay" onClick={handleCancelEditRewriteWork}>
              <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="media-preview-close" onClick={handleCancelEditRewriteWork}>
                  关闭
                </button>
                <article className="entity-card personal-card">
                  <div className="entity-card-head">
                    <div>
                      <strong>编辑二创笔记</strong>
                      <p className="personal-meta">
                        {rewriteEditingWork.sourceMaterialTitle}
                        {rewriteEditingWork.productName ? ` · 产品：${rewriteEditingWork.productName}` : ""}
                      </p>
                    </div>
                    <div className="report-editor-actions">
                      <span className="archive-pill status-ready">{rewriteEditingWork.noteCategory}</span>
                      <span className="archive-pill status-pending">{rewriteEditingWork.noteType}</span>
                      <span className={`archive-pill ${getOriginalTaskStatusClass(rewriteEditingWork.taskStatus)}`}>
                        {getOriginalTaskStatusText(rewriteEditingWork.taskStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="personal-list">
                    <label className="report-editor-pane">
                      <span>标题</span>
                      <input
                        className="report-title-input"
                        value={editingRewriteTitle}
                        onChange={(event) => setEditingRewriteTitle(event.target.value)}
                        placeholder="请输入二创笔记标题"
                      />
                    </label>
                    <label className="report-editor-pane">
                      <span>正文</span>
                      <textarea
                        className="report-content-textarea"
                        value={editingRewriteContent}
                        onChange={(event) => setEditingRewriteContent(event.target.value)}
                        placeholder="请输入二创笔记正文"
                      />
                    </label>
                    <div className="strategy-inline-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleSaveRewriteWork()}
                        disabled={savingRewriteWorkId === rewriteEditingWork.id}
                      >
                        {savingRewriteWorkId === rewriteEditingWork.id ? "保存中..." : "保存"}
                      </button>
                      <button type="button" className="secondary-button" onClick={handleCancelEditRewriteWork}>
                        取消
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          {isRewriteModalOpen ? (
            <div className="media-preview-overlay" onClick={handleCloseRewriteModal}>
              <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="media-preview-close" onClick={handleCloseRewriteModal}>
                  关闭
                </button>
                <article className="entity-card personal-card">
                  <div className="entity-card-head">
                    <div>
                      <strong>添加二创笔记</strong>
                      <p className="personal-meta">从素材库选择参考作品，结合产品与用户要求，直接触发完整二创图文生成链路。</p>
                    </div>
                  </div>
                  <div className="personal-grid">
                    <label className="field-full">
                      <span>素材库</span>
                      <select value={rewriteMaterialValue} onChange={(event) => setRewriteMaterialValue(event.target.value)}>
                        {materialNotes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>产品</span>
                      <select value={rewriteProductValue} onChange={(event) => setRewriteProductValue(event.target.value)}>
                        {workspace.archive.products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.productName}
                          </option>
                        ))}
                        <option value={NO_PRODUCT_OPTION}>不植入产品</option>
                      </select>
                    </label>
                    <label className="field-full">
                      <span>用户要求</span>
                      <textarea
                        className="report-markdown-textarea"
                        value={rewriteAdditionalInstruction}
                        onChange={(event) => setRewriteAdditionalInstruction(event.target.value)}
                        placeholder="例如：保留原作品的爆点结构，但语气更像品牌官方账号，图片更高级一点。"
                      />
                    </label>
                  </div>
                  <div className="strategy-inline-actions">
                    <button type="button" className="primary-button" onClick={() => void handleCreateRewriteWork()} disabled={isPublishing || !materialNotes.length}>
                      {isPublishing ? "创作中..." : "一键创作"}
                    </button>
                    <button type="button" className="secondary-button" onClick={handleCloseRewriteModal} disabled={isPublishing}>
                      取消
                    </button>
                  </div>
                </article>
              </div>
            </div>
          ) : null}
        </article>
      );
    }

    return (
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{currentSection.label}</strong>
            <p className="panel-subtext">{currentSection.description}</p>
          </div>
          <span className="archive-pill status-ready">{noteDrafts.length} 组脚本</span>
        </div>

        <div className="personal-list">
          {noteDrafts.map((item, index) => (
            <article className="entity-card personal-card" key={item.id}>
              <div className="entity-card-head">
                <div>
                  <strong>视频笔记脚本 {index + 1}</strong>
                  <p className="personal-meta">{item.title}</p>
                </div>
                <button type="button" className="secondary-button" onClick={() => setSelectedNoteId(item.id)}>
                  查看关联文案
                </button>
              </div>
              <div className="personal-grid">
                <div>
                  <span>片头钩子</span>
                  <strong>{item.opening}</strong>
                </div>
                <div>
                  <span>目标动作</span>
                  <strong>{topicIdeas[index]?.cta || "点击主页 / 评论互动"}</strong>
                </div>
                <div className="field-full">
                  <span>镜头结构</span>
                  <strong>{item.outline.join(" / ")}</strong>
                </div>
                <div className="field-full">
                  <span>封面话术</span>
                  <strong>{publishedPreview.coverLine}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </article>
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
      {publishingTarget ? (
        <div className="media-preview-overlay" onClick={handleClosePublishModal}>
          <div className="media-preview-dialog calendar-detail-dialog publish-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={handleClosePublishModal}>
              关闭
            </button>
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>{publishingTarget.noteCategory}笔记发布</strong>
                  <p className="personal-meta">
                    {publishingTarget.title}
                    {publishingTarget.sourceLabel ? ` · ${publishingTarget.sourceLabel}` : ""}
                  </p>
                </div>
                <div className="report-editor-actions">
                  <span className="archive-pill status-ready">小红书</span>
                  <span className="archive-pill status-pending">保存草稿</span>
                  <span className={`archive-pill ${isDesktopExtensionReady ? "status-ready" : "status-in_progress"}`}>
                    {isDesktopExtensionReady ? "电脑端扩展已连接" : "等待电脑端扩展"}
                  </span>
                </div>
              </div>

              <div className="personal-list publish-dialog-stack">
                <label>
                  <span>发布账号</span>
                  <select value={publishingAccountValue} onChange={(event) => setPublishingAccountValue(event.target.value)}>
                    {workspace.archive.platformAccounts
                      .filter((item) => item.platform === "XIAOHONGSHU")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.accountName || item.accountLink}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="publish-dialog-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleCreateDesktopPublishSession()}
                    disabled={isCreatingDesktopPublishSession}
                  >
                    {isCreatingDesktopPublishSession ? "发布中..." : "电脑端一键发布到草稿箱"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleCreateMobilePublishSession()}
                    disabled={isCreatingMobilePublishSession}
                  >
                    {isCreatingMobilePublishSession ? "生成中..." : "生成手机扫码接力码"}
                  </button>
                  <div className="publish-dialog-hint">
                    电脑端一键发布会调用本地浏览器扩展，自动把标题、正文和配图写入小红书草稿箱。手机扫码接力保留为备用方案。
                  </div>
                  {!isDesktopExtensionReady ? (
                    <div className="publish-dialog-hint">
                      若当前按钮提示未检测到扩展，请先在 Chrome/Edge 的开发者模式里加载：
                      `apps/web/public/extensions/xhs-draft-publisher`
                    </div>
                  ) : null}
                </div>

                {activeDesktopPublishSession ? (
                  <div className="publish-qr-panel">
                    <div className="publish-qr-copy publish-qr-copy--single">
                      <strong>电脑端自动发布进行中</strong>
                      <p>扩展会自动打开小红书创作者中心，切到图文发布页，上传配图并填写标题、正文，然后保存到草稿箱。</p>
                      {notice ? <p className="publish-qr-meta">{notice}</p> : null}
                      {errorMessage ? <p className="publish-qr-meta publish-qr-meta--warn">{errorMessage}</p> : null}
                      <p className="publish-qr-meta">有效期至：{formatDateTime(activeDesktopPublishSession.expiresAt)}</p>
                      {activeDesktopPublishSession.accessHint ? (
                        <p className="publish-qr-meta publish-qr-meta--warn">{activeDesktopPublishSession.accessHint}</p>
                      ) : null}
                      <a className="xhs-material-detail-button" href={activeDesktopPublishSession.creatorUrl} target="_blank" rel="noreferrer">
                        手动打开小红书创作者页
                      </a>
                    </div>
                  </div>
                ) : null}

                {activeMobilePublishSession ? (
                  <div className="publish-qr-panel">
                    <div className="publish-qr-code">
                      {mobilePublishQrDataUrl ? (
                        <img src={mobilePublishQrDataUrl} alt="手机扫码接力二维码" />
                      ) : (
                        <div className="publish-qr-placeholder">二维码生成中</div>
                      )}
                    </div>
                    <div className="publish-qr-copy">
                      <strong>手机扫码接力保存草稿</strong>
                      <p>
                        用手机扫码后，会打开接力页，里面已准备好标题、正文和图片素材。你只需要在小红书 App
                        里粘贴并保存到草稿箱。
                      </p>
                      <p className="publish-qr-meta">会话有效期至：{formatDateTime(activeMobilePublishSession.expiresAt)}</p>
                      {activeMobilePublishSession.accessHint ? (
                        <p className="publish-qr-meta publish-qr-meta--warn">{activeMobilePublishSession.accessHint}</p>
                      ) : null}
                      <a className="xhs-material-detail-button" href={activeMobilePublishSession.mobileUrl} target="_blank" rel="noreferrer">
                        打开手机接力页
                      </a>
                      <div className="strategy-inline-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void handleCompleteMobilePublishSession()}
                          disabled={isCompletingMobilePublishSession}
                        >
                          {isCompletingMobilePublishSession ? "更新中..." : "我已在手机完成保存"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          </div>
        </div>
      ) : null}
      {materialLightbox ? (
        <div className="media-lightbox" role="dialog" aria-modal="true" onClick={() => setMaterialLightbox(null)}>
          <div className="media-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <div className="media-lightbox-head">
              <strong>{materialLightbox.title}</strong>
              <button type="button" className="media-preview-close" onClick={() => setMaterialLightbox(null)}>
                关闭
              </button>
            </div>
            <div className="media-lightbox-body">
              {materialLightbox.type === "VIDEO" ? (
                <video controls preload="metadata" className="xhs-material-lightbox-video" src={materialLightbox.url} />
              ) : (
                <img src={materialLightbox.url} alt={materialLightbox.title} className="media-lightbox-image" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() || "";
    if (isMarkdownTableRow(line) && isMarkdownTableDivider(nextLine)) {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      const headerCells = splitMarkdownTableRow(line);
      const bodyRows: string[][] = [];
      index += 2;
      while (index < lines.length) {
        const tableLine = lines[index].trim();
        if (!isMarkdownTableRow(tableLine)) {
          break;
        }
        bodyRows.push(splitMarkdownTableRow(tableLine));
        index += 1;
      }
      html.push(renderMarkdownTable(headerCells, bodyRows));
      continue;
    }

    if (line.startsWith(">")) {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteLine = lines[index].trim();
        if (!quoteLine.startsWith(">")) {
          break;
        }
        quoteLines.push(quoteLine.replace(/^>\s?/, ""));
        index += 1;
      }
      const quoteHtml = quoteLines
        .filter(Boolean)
        .map((item) => `<p>${renderInlineMarkdown(item)}</p>`)
        .join("");
      html.push(`<blockquote>${quoteHtml}</blockquote>`);
      continue;
    }

    if (line === "---" || line === "***") {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      html.push("<hr />");
      index += 1;
      continue;
    }

    const unorderedMatch = line.match(/^[-*+•]\s+(.+)$/);
    if (unorderedMatch) {
      if (listType !== "ul") {
        if (listType) {
          html.push(`</${listType}>`);
        }
        html.push("<ul>");
        listType = "ul";
      }
      html.push(renderMarkdownListItem(unorderedMatch[1], getMarkdownIndentLevel(rawLine)));
      index += 1;
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== "ol") {
        if (listType) {
          html.push(`</${listType}>`);
        }
        html.push("<ol>");
        listType = "ol";
      }
      html.push(renderMarkdownListItem(orderedMatch[1], getMarkdownIndentLevel(rawLine)));
      index += 1;
      continue;
    }

    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      index += 1;
      continue;
    }

    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    index += 1;
  }

  if (listType) {
    html.push(`</${listType}>`);
  }

  return `<section class="generated-report-markdown">${html.join("")}</section>`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCalendarDate(value?: string) {
  if (!value) {
    return "未排期";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatCalendarDay(value?: string) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
  }).format(new Date(value));
}

function formatCalendarWeekday(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
  })
    .format(new Date(value))
    .replace("周", "星期");
}

function getCalendarMonthKey(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCalendarMonthLabel(monthKey?: string) {
  if (!monthKey) {
    return "未排期";
  }

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) {
    return monthKey;
  }

  return `${year}年${month}月`;
}

function buildCalendarMonthMatrix(monthKey: string, items: XiaohongshuMarketingCalendarItem[]) {
  if (!monthKey) {
    return [];
  }

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) {
    return [];
  }

  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDate = new Map(items.map((item) => [item.date, item]));
  const cells: Array<XiaohongshuMarketingCalendarItem | null> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(byDate.get(date) || null);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getCalendarFestivalLabel(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const solarFestival = solar.getFestivals()[0];
  if (solarFestival) {
    return solarFestival;
  }

  const lunar = Lunar.fromDate(date);
  const lunarFestival = lunar.getFestivals()[0];
  if (lunarFestival) {
    return lunarFestival;
  }

  const jieQi = lunar.getJieQi();
  if (jieQi) {
    return jieQi;
  }

  return "";
}

function formatCalendarOptionalValue(value?: string) {
  const text = value?.trim();
  return text ? text : " ";
}

function formatCalendarListValue(value?: string[]) {
  const items = value?.map((item) => item.trim()).filter(Boolean) || [];
  return items.length ? items.join(" / ") : " ";
}

function getMatchedDraft(work: MediaRecord | undefined, drafts: XiaohongshuNoteDraft[]) {
  if (!work) {
    return undefined;
  }

  const baseTitle = getWorkBaseTitle(work.title);
  return drafts.find((item) => item.title === baseTitle || work.title.includes(item.title));
}

function getRelatedWorks(media: MediaRecord[], selectedWork?: MediaRecord) {
  if (!selectedWork) {
    return [];
  }

  if (selectedWork.taskId) {
    return media.filter((item) => item.taskId === selectedWork.taskId);
  }

  const baseTitle = getWorkBaseTitle(selectedWork.title);
  return media.filter((item) => getWorkBaseTitle(item.title) === baseTitle);
}

function getWorkBaseTitle(title: string) {
  return title.replace(/^小红书(?:笔记|封面图)\s*-\s*/, "");
}

function getTaskStatusClass(status?: TaskRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }

  if (status === "RUNNING" || status === "QUEUED") {
    return "status-in_progress";
  }

  return "status-pending";
}

function getOriginalTaskStatusClass(status?: XiaohongshuOriginalWorkRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }

  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "status-pending";
  }

  return "status-pending";
}

function getOriginalTaskStatusText(status?: XiaohongshuOriginalWorkRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "已完成";
  }

  if (status === "RUNNING") {
    return "生成中";
  }

  if (status === "QUEUED" || status === "PENDING") {
    return "排队中";
  }

  if (status === "FAILED") {
    return "失败";
  }

  if (status === "CANCELLED") {
    return "已取消";
  }

  return "状态未知";
}

function buildPublishTaskMap(tasks: TaskRecord[]) {
  const map: Record<string, TaskRecord> = {};
  for (const task of tasks) {
    const workId = readTaskWorkId(task);
    if (workId && !map[workId]) {
      map[workId] = task;
    }
  }
  return map;
}

function readTaskWorkId(task?: TaskRecord) {
  const inputJson = task?.inputJson;
  if (!inputJson || typeof inputJson !== "object" || Array.isArray(inputJson)) {
    return "";
  }
  return String(inputJson.workId ?? "").trim();
}

function readTaskWorkKind(task?: TaskRecord) {
  const inputJson = task?.inputJson;
  if (!inputJson || typeof inputJson !== "object" || Array.isArray(inputJson)) {
    return "";
  }
  return String(inputJson.workKind ?? "").trim();
}

function getPublishTaskStatusText(task?: TaskRecord) {
  if (!task) {
    return "暂无发布任务";
  }
  const desktop = isDesktopPublishTask(task);
  if (task.taskStatus === "SUCCESS") {
    return desktop ? "电脑端草稿已保存" : "手机接力已完成";
  }
  if (task.taskStatus === "FAILED" || task.taskStatus === "CANCELLED") {
    return desktop ? "电脑端发布失败" : "手机接力失败";
  }
  if (task.taskStatus === "RUNNING") {
    return desktop ? "电脑端发布中" : "接力进行中";
  }
  if (task.taskStatus === "QUEUED" || task.taskStatus === "PENDING") {
    return desktop ? "等待扩展执行" : "等待扫码接力";
  }
  return task.taskStatus;
}

function getWorkPublishTaskLabel(task?: TaskRecord) {
  if (!task) {
    return "一键发布";
  }
  const desktop = isDesktopPublishTask(task);
  if (task.taskStatus === "SUCCESS") {
    return "再次发布";
  }
  if (task.taskStatus === "FAILED" || task.taskStatus === "CANCELLED") {
    return "重新发布";
  }
  return desktop ? "继续发布" : "查看发布码";
}

function getPublishTaskSummaryText(task: TaskRecord, noteCategory: "原创" | "二创") {
  const desktop = isDesktopPublishTask(task);
  if (task.taskStatus === "SUCCESS") {
    return desktop
      ? `最近一次${noteCategory}笔记已由电脑端自动写入小红书草稿箱。`
      : `最近一次${noteCategory}笔记手机接力已标记为完成。`;
  }
  if (task.taskStatus === "FAILED" || task.taskStatus === "CANCELLED") {
    return desktop
      ? `最近一次${noteCategory}笔记电脑端一键发布失败：${task.errorMessage || "请检查扩展是否已安装，并确认当前浏览器已登录小红书创作者中心。"}`
      : `最近一次${noteCategory}笔记手机接力失败：${task.errorMessage || "请重新生成二维码后再试。"}`
  }
  return desktop
    ? `最近一次${noteCategory}笔记电脑端一键发布任务已创建，等待浏览器扩展自动写入草稿箱。`
    : `最近一次${noteCategory}笔记手机接力二维码已生成，等待手机扫码接力。`;
}

function isDesktopPublishTask(task?: TaskRecord) {
  return task?.taskType === "XHS_PUBLISH_DESKTOP_DRAFT";
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
  let html = escapeHtml(value);

  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br />");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  return html;
}

function isMarkdownTableRow(value: string) {
  return value.startsWith("|") && value.endsWith("|") && value.includes("|");
}

function isMarkdownTableDivider(value: string) {
  if (!isMarkdownTableRow(value)) {
    return false;
  }
  return splitMarkdownTableRow(value).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function splitMarkdownTableRow(value: string) {
  return value
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderMarkdownTable(headers: string[], rows: string[][]) {
  const headHtml = headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("");
  const bodyHtml = rows
    .map((row) => {
      const cells = headers.map((_, index) => `<td>${renderInlineMarkdown(row[index] || "")}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return [
    '<div class="generated-report-table-wrap">',
    '<table class="generated-report-table">',
    `<thead><tr>${headHtml}</tr></thead>`,
    `<tbody>${bodyHtml}</tbody>`,
    "</table>",
    "</div>",
  ].join("");
}

function getMarkdownIndentLevel(value: string) {
  const leadingSpaces = value.match(/^\s*/)?.[0].length || 0;
  return Math.max(0, Math.min(4, Math.floor(leadingSpaces / 2)));
}

function renderMarkdownListItem(content: string, indentLevel: number) {
  return `<li class="generated-report-list-item generated-report-list-item--level-${indentLevel}">${renderInlineMarkdown(content)}</li>`;
}

function buildCollectorMediaProxyUrl(sourceUrl?: string, download = false) {
  if (!sourceUrl) {
    return "";
  }

  try {
    const target = new URL(sourceUrl);
    if (target.hostname === "open.feishu.cn" || target.hostname === "open.larkoffice.com") {
      const params = new URLSearchParams({ sourceUrl });
      if (download) {
        params.set("download", "1");
      }
      return `${API_BASE_URL}/collectors/xiaohongshu/brands/${DEMO_BRAND_ID}/feishu-media?${params.toString()}`;
    }
  } catch {
    return sourceUrl;
  }

  return sourceUrl;
}

type XhsMaterialMediaItem = {
  type: "IMAGE" | "VIDEO";
  previewUrl: string;
  rawUrl: string;
  label: string;
};

function getMaterialMediaItems(item?: XhsCollectedNoteRecord): XhsMaterialMediaItem[] {
  if (!item) {
    return [];
  }

  const items: XhsMaterialMediaItem[] = [];
  if (item.videoUrl) {
    items.push({
      type: "VIDEO",
      previewUrl: buildCollectorMediaProxyUrl(item.videoUrl),
      rawUrl: item.videoUrl,
      label: "视频",
    });
  }

  for (const [index, url] of (item.imageList || []).entries()) {
    items.push({
      type: "IMAGE",
      previewUrl: buildCollectorMediaProxyUrl(url),
      rawUrl: url,
      label: `图片 ${index + 1}`,
    });
  }

  return items;
}

function getOriginalWorkMediaUrls(item?: XiaohongshuOriginalWorkRecord) {
  if (!item) {
    return [];
  }
  const urls = [item.coverImageUrl, ...item.imageUrls].filter((value): value is string => Boolean(value));
  return Array.from(new Set(urls));
}

function getRewriteWorkMediaUrls(item?: XiaohongshuRewriteWorkRecord) {
  if (!item) {
    return [];
  }
  const urls = [item.coverImageUrl, ...item.imageUrls].filter((value): value is string => Boolean(value));
  return Array.from(new Set(urls));
}

function getMaterialPreviewIndex(indexMap: Record<string, number>, noteId?: string, total = 0) {
  if (!noteId || total <= 0) {
    return 0;
  }
  const current = indexMap[noteId] ?? 0;
  return ((current % total) + total) % total;
}

function formatCountValue(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatRatioValue(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(1).replace(/\.0$/, "");
}

function buildPublishedPreview(params: {
  work?: MediaRecord;
  matchedDraft?: XiaohongshuNoteDraft;
  brandName: string;
  productName: string;
  goal: XiaohongshuGoal;
  tone: XiaohongshuTone;
  campaignBrief: string;
}) {
  const { work, matchedDraft, brandName, productName, goal, tone, campaignBrief } = params;
  const title = matchedDraft?.title || getWorkBaseTitle(work?.title || `${brandName}${productName}小红书作品`);

  return {
    title,
    summary:
      matchedDraft?.summary || `${brandName}围绕${productName}做了一份面向${goal}的小红书内容成果，风格偏${tone}。`,
    opening:
      matchedDraft?.opening || `如果你也在找适合${productName}的真实分享内容，这版成果可直接用于小红书图文排版与发布。`,
    outline:
      matchedDraft?.outline || [
        `开头先交代 ${productName} 的使用场景和适合人群，快速把用户带入真实消费语境。`,
        `中段拆解卖点、门店体验和转化理由，让内容既能种草也方便导流到店。`,
        `结尾补充评论区互动或私信动作，承接 ${goal} 的目标。`,
      ],
    hashtags: matchedDraft?.hashtags || [`#${brandName}`, `#${productName}`, "#小红书运营", `#${goal}`],
    coverLine: `${campaignBrief} 这张封面可直接搭配图文笔记使用，突出${productName}与${tone}风格。`,
    nextStep:
      work?.mediaType === "HTML"
        ? "下一步可把这篇 HTML 笔记拿去排版发布，再回到个人中心确认作品沉淀。"
        : "下一步可切换到笔记 HTML 预览，确认正文内容后再一起发布到小红书。",
  };
}
