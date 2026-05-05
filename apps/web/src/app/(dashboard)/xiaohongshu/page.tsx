"use client";

import { Lunar, Solar } from "lunar-javascript";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEMO_BRAND_ID } from "../../../services/brand-growth";
import { type XhsCollectedNoteRecord } from "../../../services/collectors";
import { API_BASE_URL } from "../../../services/http";
import { type MediaRecord, createMedia, createTask, type TaskRecord } from "../../../services/personal-center";
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

type XiaohongshuSectionKey = "plan" | "assets" | "calendar" | "original" | "remix" | "video";

const xiaohongshuSections: Array<{ key: XiaohongshuSectionKey; label: string; description: string }> = [
  { key: "plan", label: "营销策划方案", description: "围绕品牌、产品和目标快速生成小红书策划与选题方案。" },
  { key: "assets", label: "素材库", description: "沉淀已生成的笔记、封面、源文件与作品记录。" },
  { key: "calendar", label: "营销日历", description: "按周查看当前内容节奏、发布时间与主题排期。" },
  { key: "original", label: "原创笔记", description: "查看原创图文笔记草稿、正文结构与发布动作。" },
  { key: "remix", label: "二创笔记", description: "基于已有选题和作品延展二创版本与差异化角度。" },
  { key: "video", label: "视频笔记", description: "把现有主题整理成视频脚本、镜头结构和封面文案。" },
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

  async function loadWorkspace() {
    setIsLoading(true);
    setDataSource("loading");
    setNotice("");
    setErrorMessage("");

    const [workspaceResult, growthReportResult, annualPlanResult, marketingPlanResult, calendarResult] = await Promise.allSettled([
      getXiaohongshuWorkspace(),
      getGrowthReportWorkspace(),
      getAnnualMarketingPlanWorkspace(),
      getXiaohongshuMarketingPlanWorkspace(),
      getXiaohongshuMarketingCalendarWorkspace(),
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
  const selectedNote = noteDrafts.find((item) => item.id === selectedNoteId) || noteDrafts[0];

  const xhsTasks = useMemo(() => getXiaohongshuTasks(workspace.tasks), [workspace.tasks]);
  const xhsMedia = useMemo(() => getXiaohongshuMedia(workspace.media), [workspace.media]);
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

  async function handlePublish() {
    if (!selectedProduct || !selectedNote) {
      setErrorMessage("请先生成小红书笔记草稿。");
      return;
    }

    setIsPublishing(true);
    setNotice("");
    setErrorMessage("");

    const slug = `${Date.now()}`;

    try {
      const task = await createTask({
        brandId: workspace.archive.brand.id,
        taskType: "XHS_NOTE_GENERATION",
        taskTitle: `生成小红书笔记：${selectedNote.title}`,
        modelName: "gpt-5.5",
        pointsCost: 180,
      });

      const noteMedia = await createMedia({
        brandId: workspace.archive.brand.id,
        taskId: task.id,
        title: `小红书笔记 - ${selectedNote.title}`,
        mediaType: "HTML",
        storageKey: `works/${workspace.archive.brand.id}/xiaohongshu-note-${slug}.html`,
        sourceUrl: `https://oss.example.com/works/${workspace.archive.brand.id}/xiaohongshu-note-${slug}.html`,
        mimeType: "text/html",
      });

      const coverMedia = await createMedia({
        brandId: workspace.archive.brand.id,
        taskId: task.id,
        title: `小红书封面图 - ${selectedNote.title}`,
        mediaType: "IMAGE",
        storageKey: `works/${workspace.archive.brand.id}/xiaohongshu-cover-${slug}.png`,
        sourceUrl: `https://oss.example.com/works/${workspace.archive.brand.id}/xiaohongshu-cover-${slug}.png`,
        mimeType: "image/png",
      });

      setWorkspace((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
        media: [coverMedia, noteMedia, ...current.media],
      }));
      setSelectedWorkId(noteMedia.id);
      setNotice("已创建小红书任务，并同步产出到“我的作品”。");
    } catch (error) {
      if (dataSource === "seed") {
        const now = new Date().toISOString();
        const localTask: TaskRecord = {
          id: `tsk_local_${slug}`,
          userId: "usr_demo_001",
          brandId: workspace.archive.brand.id,
          taskType: "XHS_NOTE_GENERATION",
          taskTitle: `生成小红书笔记：${selectedNote.title}`,
          taskStatus: "QUEUED",
          modelName: "gpt-5.5",
          pointsCost: 180,
          createdAt: now,
          updatedAt: now,
        };

        const localWorks: MediaRecord[] = [
          {
            id: `med_local_cover_${slug}`,
            userId: "usr_demo_001",
            brandId: workspace.archive.brand.id,
            taskId: localTask.id,
            title: `小红书封面图 - ${selectedNote.title}`,
            mediaType: "IMAGE",
            storageKey: `works/${workspace.archive.brand.id}/xiaohongshu-cover-${slug}.png`,
            sourceUrl: `https://oss.example.com/works/${workspace.archive.brand.id}/xiaohongshu-cover-${slug}.png`,
            mimeType: "image/png",
            createdAt: now,
            updatedAt: now,
          },
          {
            id: `med_local_note_${slug}`,
            userId: "usr_demo_001",
            brandId: workspace.archive.brand.id,
            taskId: localTask.id,
            title: `小红书笔记 - ${selectedNote.title}`,
            mediaType: "HTML",
            storageKey: `works/${workspace.archive.brand.id}/xiaohongshu-note-${slug}.html`,
            sourceUrl: `https://oss.example.com/works/${workspace.archive.brand.id}/xiaohongshu-note-${slug}.html`,
            mimeType: "text/html",
            createdAt: now,
            updatedAt: now,
          },
        ];

        setWorkspace((current) => ({
          ...current,
          tasks: [localTask, ...current.tasks],
          media: [...localWorks, ...current.media],
        }));
        setSelectedWorkId(localWorks[1].id);
        setNotice("已在本地演示数据中创建小红书任务和作品。");
      } else {
        const message = error instanceof Error ? error.message : "小红书任务创建失败";
        setErrorMessage(`发布失败：${message}`);
      }
    } finally {
      setIsPublishing(false);
    }
  }

  function renderSectionCard() {
    const currentSection = xiaohongshuSections.find((item) => item.key === activeSection) ?? xiaohongshuSections[0];

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
              <button type="button" className="secondary-button" onClick={() => setActiveSection("plan")}>
                返回策划
              </button>
              <button type="button" className="primary-button" onClick={() => void handlePublish()} disabled={isPublishing || !selectedNote}>
                {isPublishing ? "发布中..." : "创建任务并产出作品"}
              </button>
            </div>
          </div>

          {selectedNote ? (
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>{selectedNote.title}</strong>
                  <p className="personal-meta">{selectedNote.summary}</p>
                </div>
                <span className="archive-pill status-ready">{goal}</span>
              </div>
              <div className="personal-list">
                <p>{selectedNote.opening}</p>
                {selectedNote.outline.map((item) => (
                  <div className="entity-card admin-rule-card" key={item}>
                    <strong>{item}</strong>
                  </div>
                ))}
                <div className="field-full">
                  <span>推荐话题</span>
                  <strong>{selectedNote.hashtags.join(" ")}</strong>
                </div>
              </div>
            </article>
          ) : null}

          <div className="personal-list">
            {noteDrafts.map((item) => (
              <article className="entity-card personal-card" key={item.id}>
                <div className="entity-card-head">
                  <div>
                    <strong>{item.title}</strong>
                    <p className="personal-meta">{item.summary}</p>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => setSelectedNoteId(item.id)}>
                    切换查看
                  </button>
                </div>
              </article>
            ))}
          </div>
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
            <span className="archive-pill status-in_progress">{noteDrafts.length} 个版本</span>
          </div>

          <div className="personal-list">
            {noteDrafts.map((item, index) => (
              <article className="entity-card personal-card" key={item.id}>
                <div className="entity-card-head">
                  <div>
                    <strong>二创版本 {index + 1} · {item.title}</strong>
                    <p className="personal-meta">基于原始主题延展出不同切角，适合做复投与多版本测试。</p>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => setSelectedNoteId(item.id)}>
                    作为当前草稿
                  </button>
                </div>
                <div className="personal-grid">
                  <div>
                    <span>切角方向</span>
                    <strong>{topicIdeas[index]?.angle || "体验测评 / 场景化改写"}</strong>
                  </div>
                  <div>
                    <span>承接动作</span>
                    <strong>{topicIdeas[index]?.cta || "评论互动"}</strong>
                  </div>
                  <div className="field-full">
                    <span>二创说明</span>
                    <strong>保留原始产品卖点，改写开头与中段结构，用于多版本内容测试与平台复投。</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
                <h1>小红书营销策划方案工作区</h1>
                <p>当前先聚焦【营销策划方案】主链路：读取品牌资料、小红书数据、品牌增长报告和全年营销规划，生成可编辑保存的 Markdown 方案。</p>
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
