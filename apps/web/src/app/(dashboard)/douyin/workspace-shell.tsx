"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { getBrandPermissionSettings, DEMO_BRAND_ID, type BrandPermissionSettingsRecord } from "../../../services/brand-growth";
import { douyinCollectionSeed, getDouyinCollectionWorkspace, type DouyinCollectionWorkspace } from "../../../services/collectors";
import {
  annualMarketingPlanSeed,
  deleteDouyinMarketingPlan,
  douyinHotTopicCandidatesSeed,
  douyinMarketingPlanSeed,
  generateDouyinHotTopicCandidates,
  generateDouyinMarketingPlan,
  getAnnualMarketingPlanWorkspace,
  getDouyinHotTopicCandidatesWorkspace,
  getDouyinMarketingPlanWorkspace,
  getGrowthReportWorkspace,
  growthReportSeed,
  updateDouyinTopicLibrary,
  updateDouyinMarketingPlan,
  type DouyinHotTopicCandidatesWorkspace,
  type DouyinTopicLibraryItem,
  type DouyinMarketingPlanTaskRecord,
  type DouyinMarketingPlanWorkspace,
} from "../../../services/reports";
import { MediaLightbox } from "../xiaohongshu/media-lightbox";
import { type MediaLightboxState } from "../xiaohongshu/shared-types";
import { DouyinAssetsWorkspace } from "./assets-workspace";
import { formatDateTime } from "../xiaohongshu/datetime-helpers";
import { renderMarkdownToHtml } from "../xiaohongshu/markdown-render";
import { DouyinHotTopicCandidatesWorkspace as DouyinHotTopicCandidatesWorkspacePanel } from "./hot-topic-candidates-workspace";
import { DouyinTopicLibraryWorkspace } from "./topic-library-workspace";

type LoadState = "loading" | "api" | "seed";
type DouyinSectionKey = "plan" | "assets" | "hotTopics" | "topicLibrary";

const douyinSections: Array<{ key: DouyinSectionKey; label: string; description: string }> = [
  { key: "plan", label: "营销策划方案", description: "围绕品牌增长报告、半年营销规划和抖音采集数据生成可编辑的 Markdown 方案。" },
  { key: "assets", label: "素材库", description: "展示已经从品牌增长策略 → 收集数据 → 抖音加入素材库的对标作品，沿用卡片化素材浏览方式。" },
  { key: "hotTopics", label: "热点找选题", description: "按所选日期读取每日热点全部榜单和品牌背景资料，生成 3 个可勾选的抖音热点选题。" },
  { key: "topicLibrary", label: "选题库", description: "按品牌独立沉淀抖音选题，一行展示两条记录，超过 20 行自动分页。" },
];

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
  const [marketingPlanDraft, setMarketingPlanDraft] = useState("");
  const [selectedHotTopicDate, setSelectedHotTopicDate] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingHotTopics, setIsGeneratingHotTopics] = useState(false);
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
  const permissionEntry = brandPermissionSettings?.currentUserPermissions?.["douyin.plan"];
  const hasWorkspaceAccess = permissionEntry?.view ?? true;
  const canEditMarketingPlan = permissionEntry?.edit ?? true;
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
  const currentSection = douyinSections.find((item) => item.key === activeSection) ?? douyinSections[0];
  const heroTitle = "抖音工作台";
  const heroDescription = "当前开放营销策划方案、素材库、热点找选题和选题库，可直接复用品牌增长策略里沉淀的抖音对标作品与每日热点。";

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

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setNotice("");

    const [permissionResult, collectionResult, growthResult, annualResult, planResult, hotTopicResult] = await Promise.allSettled([
      getBrandPermissionSettings(activeBrandId),
      getDouyinCollectionWorkspace(activeBrandId),
      getGrowthReportWorkspace(activeBrandId),
      getAnnualMarketingPlanWorkspace(activeBrandId),
      getDouyinMarketingPlanWorkspace(activeBrandId),
      getDouyinHotTopicCandidatesWorkspace(activeBrandId),
    ]);

    let hasFallback = false;
    if (permissionResult.status === "fulfilled") {
      setBrandPermissionSettings(permissionResult.value);
    } else {
      hasFallback = true;
      setBrandPermissionSettings(null);
    }

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
    if (!isTaskActive && !isHotTopicTaskActive && notice.includes("任务已提交")) {
      setNotice("");
    }
  }, [isHotTopicTaskActive, isTaskActive, notice]);

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
    if (!canEditMarketingPlan) {
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
  }, [activeBrandId, canEditMarketingPlan, selectedHotTopicDate]);

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
    if (!canEditMarketingPlan) {
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
        topicDescription: latestHotTopicResult.summary || `来自 ${selectedHotTopicDate} 热点找选题结果`,
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
    canEditMarketingPlan,
    hotTopicWorkspace.topicLibrary,
    latestHotTopicResult,
    saveTopicLibrary,
    selectedHotTopicDate,
    selectedTopicIds,
  ]);

  const handleAddManualTopic = useCallback(async (payload: { topicContent: string; topicDescription: string }) => {
    if (!canEditMarketingPlan) {
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
  }, [canEditMarketingPlan, hotTopicWorkspace.topicLibrary, saveTopicLibrary]);

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
                  {douyinSections.map((item) => (
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
                        <span className={`archive-pill ${canEditMarketingPlan ? "status-ready" : "status-pending"}`}>
                          {canEditMarketingPlan ? "当前板块可编辑" : "当前板块只读"}
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
                          disabled={isLoading || isGenerating || isGeneratingHotTopics || isSaving || isDeleting}
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
                    canEdit={canEditMarketingPlan}
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
                    onOpenTopicLibrary={() => setActiveSection("topicLibrary")}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "topicLibrary" ? (
                  <DouyinTopicLibraryWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canEdit={canEditMarketingPlan}
                    items={hotTopicWorkspace.topicLibrary || []}
                    isSaving={isSavingTopicLibrary}
                    onRefresh={async () => {
                      await refreshHotTopicWorkspace();
                    }}
                    onAddManualTopic={handleAddManualTopic}
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
                          {canEditMarketingPlan ? "当前板块可编辑" : "当前板块只读"}
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
