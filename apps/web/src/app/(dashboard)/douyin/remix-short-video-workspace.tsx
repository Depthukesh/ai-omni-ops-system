"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DouyinRemixShortVideoWorkRecord,
  type StoryboardImageModelOptionRecord,
  type VideoProviderOptionRecord,
} from "../../../services/works";
import { type NoteCreateModalCopy } from "../xiaohongshu/note-create-modal-copy";
import { NoteCreateModalShell } from "../xiaohongshu/note-create-modal-shell";
import {
  ComposeTaskStatusPanel,
  WorkspaceSectionHeader,
} from "../xiaohongshu/note-workspace-shared-panels";
import { type OptionalDateFormatter, type ProductOption } from "../xiaohongshu/shared-types";

const PAGE_SIZE = 12;
const NO_PRODUCT_OPTION = "__no_product__";
const YES_NO_OPTIONS = [
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
] as const;

const CREATE_MODAL_COPY: NoteCreateModalCopy = {
  title: "创建复刻视频",
  metaText: "提交后先完成 15 秒分段复刻分析与出图，再在工作区一键生成分段视频并自动拼接完整视频。",
};

export interface DouyinRemixShortVideoWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  items: DouyinRemixShortVideoWorkRecord[];
  materialOptions: Array<{ id: string; label: string; videoUrl?: string }>;
  productOptions: Array<{ id: string; label: string }>;
  videoProviderOptions: VideoProviderOptionRecord[];
  storyboardImageModelOptions: StoryboardImageModelOptionRecord[];
  hasMarketingPlan: boolean;
  marketingPlanTitle?: string;
  onRefresh: () => void | Promise<void>;
  onPreview: (item: DouyinRemixShortVideoWorkRecord) => void;
  onCreate: (payload: {
    sourceMaterialId?: string;
    injectBrandProfile?: boolean;
    productId?: string;
    includeMarketingPlan?: boolean;
    sourceVideoFile?: File | null;
    referenceImageFile?: File | null;
    videoProvider?: string;
    storyboardImageModel?: string;
    additionalInstruction?: string;
  }) => Promise<boolean>;
  onGenerateVideo: (payload: { workId: string }) => Promise<boolean>;
  onDelete: (workId: string) => Promise<boolean>;
  formatDateTime: OptionalDateFormatter;
}

function getTaskStatusClass(status?: DouyinRemixShortVideoWorkRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getTaskStatusText(status?: DouyinRemixShortVideoWorkRecord["taskStatus"]) {
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
  return "暂无任务";
}

function getWorkflowStageLabel(stage?: DouyinRemixShortVideoWorkRecord["workflowStage"]) {
  switch (stage) {
    case "QUEUED":
      return "已入队";
    case "GENERATING_SCRIPT":
      return "生成复刻分析";
    case "GENERATING_STORYBOARD":
      return "生成角色卡与分镜图";
    case "WAITING_VIDEO":
      return "等待生成视频";
    case "GENERATING_VIDEO":
      return "生成并拼接视频";
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    default:
      return "待开始";
  }
}

function getProgressStepStatusClass(status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED") {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getProgressStepStatusText(status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED") {
  if (status === "SUCCESS") {
    return "已完成";
  }
  if (status === "RUNNING") {
    return "进行中";
  }
  if (status === "FAILED") {
    return "失败";
  }
  return "待执行";
}

export function DouyinRemixShortVideoWorkspace(props: DouyinRemixShortVideoWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState("");

  const [sourceMaterialId, setSourceMaterialId] = useState("");
  const [injectBrandProfileValue, setInjectBrandProfileValue] = useState("yes");
  const [productValue, setProductValue] = useState(NO_PRODUCT_OPTION);
  const [injectMarketingPlanValue, setInjectMarketingPlanValue] = useState(props.hasMarketingPlan ? "yes" : "no");
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [providerValue, setProviderValue] = useState("");
  const [storyboardImageModelValue, setStoryboardImageModelValue] = useState("");
  const [additionalInstruction, setAdditionalInstruction] = useState("");
  const materialOptions = useMemo(
    () => props.materialOptions.filter((item) => Boolean(item.videoUrl)),
    [props.materialOptions],
  );

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return props.items.slice(start, start + PAGE_SIZE);
  }, [page, props.items]);
  const pageCount = Math.max(1, Math.ceil(props.items.length / PAGE_SIZE));
  const selectedWork = useMemo(
    () => props.items.find((item) => item.id === selectedWorkId) || props.items[0],
    [props.items, selectedWorkId],
  );
  const latestTaskItem = useMemo(
    () => props.items.find((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING") || props.items[0],
    [props.items],
  );
  const productOptions = useMemo<ProductOption[]>(
    () => props.productOptions.map((item) => ({ id: item.id, productName: item.label })),
    [props.productOptions],
  );
  const createDisabled = !providerValue
    || !storyboardImageModelValue
    || (!sourceMaterialId && !sourceVideoFile)
    || (injectMarketingPlanValue === "yes" && !props.hasMarketingPlan);
  const createDisabledReason = useMemo(() => {
    if (!providerValue) {
      return "当前还没有可用的视频大模型，请先刷新页面或检查视频模型配置。";
    }
    if (!storyboardImageModelValue) {
      return "当前还没有可用的生图大模型，请先刷新页面或检查生图模型配置。";
    }
    if (!sourceMaterialId && !sourceVideoFile) {
      return "请先从抖音素材库选择一个短视频素材，或上传一个短视频文件。";
    }
    if (injectMarketingPlanValue === "yes" && !props.hasMarketingPlan) {
      return "当前品牌还没有抖音营销策划方案；请先生成方案，或将“是否植入营销策划方案”改为“否”。";
    }
    return "";
  }, [injectMarketingPlanValue, props.hasMarketingPlan, providerValue, sourceMaterialId, sourceVideoFile, storyboardImageModelValue]);
  const isTaskActive = latestTaskItem?.taskStatus === "RUNNING" || latestTaskItem?.taskStatus === "QUEUED" || latestTaskItem?.taskStatus === "PENDING";
  const isSelectedWorkGeneratingVideo = Boolean(
    selectedWork
    && (selectedWork.composeStatus === "RUNNING"
      || selectedWork.taskStatus === "RUNNING"
      || selectedWork.taskStatus === "QUEUED"
      || selectedWork.taskStatus === "PENDING"),
  );
  const selectedWorkMissingStoryboardCount = selectedWork
    ? selectedWork.remixSegments.filter((item) => !item.storyboardImageUrl).length
    : 0;
  const isSelectedWorkReadyForVideo = Boolean(
    selectedWork
    && selectedWork.remixSegments.length
    && selectedWorkMissingStoryboardCount === 0
    && (selectedWork.workflowStage === "WAITING_VIDEO" || selectedWork.composeStatus === "FAILED"),
  );
  const selectedWorkGenerateBlockedReason = !selectedWork
    ? "请先选择一个复刻作品。"
    : !selectedWork.remixSegments.length
      ? "第一阶段还没有生成出分段结果，请稍后刷新。"
      : selectedWorkMissingStoryboardCount > 0
        ? `第一阶段尚未完成，仍有 ${selectedWorkMissingStoryboardCount} 段缺少分镜图。`
        : selectedWork.workflowStage === "FAILED" && selectedWork.composeStatus !== "FAILED"
          ? (selectedWork.thirdPartyStatusDetail || selectedWork.composeError || "第一阶段执行失败，请先重新创建或排查第一阶段。")
          : "";

  useEffect(() => {
    if (!selectedWorkId && props.items[0]?.id) {
      setSelectedWorkId(props.items[0].id);
    }
  }, [props.items, selectedWorkId]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    if (!providerValue && props.videoProviderOptions[0]?.backendKey) {
      setProviderValue(props.videoProviderOptions[0].backendKey);
    }
  }, [props.videoProviderOptions, providerValue]);

  useEffect(() => {
    if (!storyboardImageModelValue && props.storyboardImageModelOptions[0]?.selectionKey) {
      setStoryboardImageModelValue(props.storyboardImageModelOptions[0].selectionKey);
    }
  }, [props.storyboardImageModelOptions, storyboardImageModelValue]);

  useEffect(() => {
    if (!props.hasMarketingPlan && injectMarketingPlanValue === "yes") {
      setInjectMarketingPlanValue("no");
    }
  }, [injectMarketingPlanValue, props.hasMarketingPlan]);

  async function handleCreate() {
    const success = await props.onCreate({
      sourceMaterialId: sourceMaterialId || undefined,
      injectBrandProfile: injectBrandProfileValue === "yes",
      productId: productValue !== NO_PRODUCT_OPTION ? productValue : undefined,
      includeMarketingPlan: injectMarketingPlanValue === "yes",
      sourceVideoFile,
      referenceImageFile,
      videoProvider: providerValue || undefined,
      storyboardImageModel: storyboardImageModelValue || undefined,
      additionalInstruction: additionalInstruction.trim() || undefined,
    });
    if (!success) {
      return;
    }
    setIsCreateOpen(false);
    setSourceMaterialId("");
    setInjectBrandProfileValue("yes");
    setProductValue(NO_PRODUCT_OPTION);
    setInjectMarketingPlanValue(props.hasMarketingPlan ? "yes" : "no");
    setSourceVideoFile(null);
    setReferenceImageFile(null);
    setAdditionalInstruction("");
  }

  async function handleGenerateVideo() {
    if (!selectedWork || !isSelectedWorkReadyForVideo) {
      return;
    }
    await props.onGenerateVideo({
      workId: selectedWork.id,
    });
  }

  async function handleDelete(workId: string) {
    if (typeof window !== "undefined" && !window.confirm("确认删除这条复刻短视频作品吗？删除后不可恢复。")) {
      return;
    }
    await props.onDelete(workId);
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <WorkspaceSectionHeader
          sectionLabel={props.sectionLabel}
          sectionDescription={props.sectionDescription}
          createLabel="创建复刻视频"
          refreshDisabled={props.isLoading || props.isSubmitting}
          createDisabled={!props.canEdit || props.isSubmitting}
          onRefresh={props.onRefresh}
          onOpenCreate={() => setIsCreateOpen(true)}
        />

        <ComposeTaskStatusPanel
          title="复刻短视频任务状态"
          description="第一阶段输出 15 秒分段的分析、角色卡、分镜脚本和分镜图；第二阶段按分镜图逐段生成视频并自动拼接完整视频。"
          taskCount={props.items.length}
          latestTask={latestTaskItem
            ? ({
              taskStatus: latestTaskItem.taskStatus,
              taskTitle: latestTaskItem.title,
              updatedAt: latestTaskItem.updatedAt,
            } as never)
            : undefined}
          taskStatusText={getTaskStatusText(latestTaskItem?.taskStatus)}
          inlineError={latestTaskItem?.taskStatus === "FAILED" ? latestTaskItem.thirdPartyStatusDetail || latestTaskItem.composeError || "最近一次复刻短视频任务失败，请刷新后重试。" : ""}
          isTaskActive={Boolean(isTaskActive)}
          canCancelTask={false}
          isCancellingTask={false}
          showSubmittingState={props.isSubmitting}
          submittingText="复刻短视频任务已提交，系统正在后台生成。"
          queuedText={latestTaskItem?.thirdPartyStatusDetail || "任务已提交，正在排队生成复刻分析与分镜图。"}
          runningText={
            latestTaskItem?.thirdPartyStatusLabel
              ? `${latestTaskItem.thirdPartyStatusLabel}${latestTaskItem.thirdPartyStatusDetail ? `：${latestTaskItem.thirdPartyStatusDetail}` : ""}`
              : "当前任务正在处理中，页面会自动刷新分段工作区和最终视频状态。"
          }
          cancelledText="最近一次任务已取消。"
          getTaskStatusClass={getTaskStatusClass as never}
          formatDateTime={props.formatDateTime}
          onCancelTask={async () => undefined}
        />

        {!props.items.length ? (
          <div className="empty-state">当前还没有复刻短视频作品，点击右上角“创建复刻视频”开始生成。</div>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            <article className="light-data-panel" style={{ padding: "16px" }}>
              <div className="strategy-card-toolbar">
                <div>
                  <strong>作品列表</strong>
                  <p className="text-xs text-slate-500 mt-2">按品牌独立保存复刻短视频工作区。</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", marginTop: "16px" }}>
                {pagedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`strategy-level-button strategy-level-button--section ${selectedWork?.id === item.id ? "is-active" : ""}`}
                    style={{ textAlign: "left", display: "grid", gap: "10px", width: "100%", padding: "14px 16px" }}
                  >
                    <button
                      type="button"
                      style={{ textAlign: "left", display: "block", width: "100%", background: "transparent", border: "none", padding: 0 }}
                      onClick={() => setSelectedWorkId(item.id)}
                    >
                      <strong style={{ display: "block", marginBottom: "6px" }}>{item.title}</strong>
                      <span className={`archive-pill ${getTaskStatusClass(item.taskStatus)}`}>{getTaskStatusText(item.taskStatus)}</span>
                      <p className="text-xs text-slate-500 mt-2">
                        {item.sourceDurationSec ? `源视频 ${item.sourceDurationSec}s` : "源视频时长待解析"} · {item.remixSegments.length} 段
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{props.formatDateTime(item.updatedAt)}</p>
                    </button>
                    <div className="strategy-inline-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={!props.canEdit || props.isSubmitting}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {props.items.length > PAGE_SIZE ? (
                <div className="note-pagination-bar hotspot-pagination-bar" style={{ marginTop: "16px" }}>
                  <div className="note-pagination-summary">
                    <span>第 {page} / {pageCount} 页</span>
                    <span>当前显示 {pagedItems.length} 条</span>
                  </div>
                  <div className="note-pagination-actions">
                    <button type="button" className="note-inline-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                      上一页
                    </button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((currentPage) => (
                      <button
                        key={`douyin-remix-short-video-page-${currentPage}`}
                        type="button"
                        className={`note-page-button ${currentPage === page ? "is-active" : ""}`}
                        onClick={() => setPage(currentPage)}
                      >
                        {currentPage}
                      </button>
                    ))}
                    <button type="button" className="note-inline-button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>
                      下一页
                    </button>
                  </div>
                </div>
              ) : null}
            </article>

            {selectedWork ? (
              <>
                <article className="light-data-panel" style={{ padding: "20px" }}>
                  <div className="strategy-card-toolbar">
                    <div>
                      <strong>作品复刻分镜包</strong>
                      <p className="text-xs text-slate-500 mt-2">
                        {selectedWork.title} · {selectedWork.sourceDurationSec ? `源视频时长 ${selectedWork.sourceDurationSec}s` : "源视频时长待解析"} · 每段 {selectedWork.segmentDurationSec || 15}s
                      </p>
                    </div>
                    <div className="strategy-inline-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => props.onPreview(selectedWork)}
                        disabled={!selectedWork.mergedVideoUrl && !selectedWork.videoUrl}
                      >
                        预览完整视频
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleGenerateVideo()}
                        disabled={!props.canEdit || props.isSubmitting || !isSelectedWorkReadyForVideo || isSelectedWorkGeneratingVideo}
                      >
                        {isSelectedWorkGeneratingVideo ? "拼接生成中..." : "一键生成视频"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleDelete(selectedWork.id)}
                        disabled={!props.canEdit || props.isSubmitting}
                      >
                        删除作品
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "8px", marginTop: "16px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <span className={`archive-pill ${getTaskStatusClass(selectedWork.taskStatus)}`}>{getTaskStatusText(selectedWork.taskStatus)}</span>
                      <span className="archive-pill status-pending">当前阶段：{getWorkflowStageLabel(selectedWork.workflowStage)}</span>
                      {selectedWork.analysisModel ? <span className="archive-pill status-pending">分析模型：{selectedWork.analysisModel}</span> : null}
                      {selectedWork.storyboardImageModel ? <span className="archive-pill status-pending">分镜图模型：{selectedWork.storyboardImageModel}</span> : null}
                    </div>
                    {selectedWork.sourceVideoUrl ? (
                      <p className="text-xs text-slate-500">
                        源视频：
                        <a href={selectedWork.sourceVideoUrl} target="_blank" rel="noreferrer">
                          {selectedWork.sourceVideoFileName || selectedWork.sourceVideoUrl}
                        </a>
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      品牌资料：{selectedWork.injectBrandProfile === false ? "不植入" : "植入"}
                      {" · "}
                      产品资料：{selectedWork.productName || "不植入"}
                      {" · "}
                      营销策划方案：{selectedWork.includeMarketingPlan ? "植入" : "不植入"}
                    </p>
                    {selectedWork.copyAdditionalInstruction || selectedWork.videoAdditionalInstruction ? (
                      <p className="text-xs text-slate-500">用户要求：{selectedWork.videoAdditionalInstruction || selectedWork.copyAdditionalInstruction}</p>
                    ) : null}
                    {selectedWorkGenerateBlockedReason ? (
                      <div className="report-inline-tip">
                        <strong>当前还不能执行第二步</strong>
                        <div style={{ marginTop: "6px" }}>{selectedWorkGenerateBlockedReason}</div>
                      </div>
                    ) : null}
                    {selectedWork.thirdPartyStatusLabel ? (
                      <div className="report-inline-tip">
                        <strong>{selectedWork.thirdPartyStatusLabel}</strong>
                        {selectedWork.thirdPartyStatusDetail ? <div style={{ marginTop: "6px" }}>{selectedWork.thirdPartyStatusDetail}</div> : null}
                      </div>
                    ) : null}
                    {selectedWork.progressSteps.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {selectedWork.progressSteps.map((step) => (
                          <span key={`${selectedWork.id}-${step.key}`} className={`archive-pill ${getProgressStepStatusClass(step.status)}`}>
                            {step.label} · {getProgressStepStatusText(step.status)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {selectedWork.videoProviderErrors?.length ? (
                      <details>
                        <summary className="text-xs text-slate-500" style={{ cursor: "pointer" }}>查看最近模型报错链路</summary>
                        <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                          {selectedWork.videoProviderErrors.map((item, index) => (
                            <p key={`${selectedWork.id}-provider-error-${index}`} className="text-xs text-slate-500" style={{ whiteSpace: "pre-wrap" }}>{item}</p>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    {selectedWork.composeError ? <p className="status-text error-text">{selectedWork.composeError}</p> : null}
                  </div>
                </article>

                <article className="light-data-panel" style={{ padding: "20px" }}>
                  <div className="strategy-card-toolbar">
                    <div>
                      <strong>复刻流程工作区</strong>
                      <p className="text-xs text-slate-500 mt-2">每个板块代表 15 秒内容，包含完整的复刻分析、角色卡、分镜脚本和质检结果。</p>
                    </div>
                  </div>

                  {!selectedWork.remixSegments.length ? (
                    <div className="empty-state">当前还没有分段结果，系统正在生成复刻分析。</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", marginTop: "18px" }}>
                      {selectedWork.remixSegments.map((segment) => (
                        <article key={`${selectedWork.id}-${segment.order}`} className="light-data-panel" style={{ padding: "16px", minHeight: "100%" }}>
                          <div className="strategy-card-toolbar">
                            <div>
                              <strong>{segment.segmentLabel}</strong>
                              <p className="text-xs text-slate-500 mt-2">{segment.startSec}s - {segment.endSec}s</p>
                            </div>
                            {segment.videoUrl ? <span className="archive-pill status-ready">已出视频</span> : <span className="archive-pill status-pending">待生视频</span>}
                          </div>

                          <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                            <section>
                              <strong>1. 视频分析报告</strong>
                              <p className="text-xs text-slate-500 mt-2" style={{ whiteSpace: "pre-wrap" }}>{segment.analysisReport || "待生成"}</p>
                            </section>
                            <section>
                              <strong>2. 角色卡文字版</strong>
                              <p className="text-xs text-slate-500 mt-2" style={{ whiteSpace: "pre-wrap" }}>{segment.roleCardText || "待生成"}</p>
                            </section>
                            <section>
                              <strong>3. 分镜脚本</strong>
                              <p className="text-xs text-slate-500 mt-2" style={{ whiteSpace: "pre-wrap" }}>{segment.storyboardScript || "待生成"}</p>
                            </section>
                            <section>
                              <strong>4. 角色卡图片版</strong>
                              {segment.roleImageUrl ? (
                                <a href={segment.roleImageUrl} target="_blank" rel="noreferrer">
                                  <img src={segment.roleImageUrl} alt={`${segment.segmentLabel} 角色卡`} style={{ width: "100%", borderRadius: "16px", marginTop: "8px" }} />
                                </a>
                              ) : (
                                <p className="text-xs text-slate-500 mt-2">待生成</p>
                              )}
                            </section>
                            <section>
                              <strong>5. 分镜图</strong>
                              {segment.storyboardImageUrl ? (
                                <a href={segment.storyboardImageUrl} target="_blank" rel="noreferrer">
                                  <img src={segment.storyboardImageUrl} alt={`${segment.segmentLabel} 分镜图`} style={{ width: "100%", borderRadius: "16px", marginTop: "8px" }} />
                                </a>
                              ) : (
                                <p className="text-xs text-slate-500 mt-2">待生成</p>
                              )}
                            </section>
                            <section>
                              <strong>6. 一致性质检结果</strong>
                              <p className="text-xs text-slate-500 mt-2" style={{ whiteSpace: "pre-wrap" }}>{segment.consistencyCheck || "待生成"}</p>
                            </section>
                            {(segment.videoUrl || segment.videoPrompt) ? (
                              <section>
                                <strong>视频输出</strong>
                                <div className="strategy-inline-actions" style={{ marginTop: "8px" }}>
                                  {segment.videoUrl ? (
                                    <a className="secondary-button" href={segment.videoUrl} target="_blank" rel="noreferrer">
                                      查看分段视频
                                    </a>
                                  ) : null}
                                  {segment.storyboardImageUrl ? (
                                    <a className="secondary-button" href={segment.storyboardImageUrl} target="_blank" rel="noreferrer">
                                      查看分镜图
                                    </a>
                                  ) : null}
                                </div>
                              </section>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>

                <article className="light-data-panel" style={{ padding: "20px" }}>
                  <div className="strategy-card-toolbar">
                    <div>
                      <strong>最终输出</strong>
                      <p className="text-xs text-slate-500 mt-2">输出每个分段短视频，以及按顺序拼接后的完整短视频。</p>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
                    {selectedWork.remixSegments.map((segment) => (
                      <div key={`${selectedWork.id}-video-${segment.order}`} className="strategy-card-toolbar">
                        <div>
                          <strong>{segment.segmentLabel}</strong>
                          <p className="text-xs text-slate-500 mt-2">{segment.videoUrl ? "分段视频已生成" : "分段视频待生成"}</p>
                        </div>
                        {segment.videoUrl ? (
                          <a className="secondary-button" href={segment.videoUrl} target="_blank" rel="noreferrer">
                            打开分段视频
                          </a>
                        ) : null}
                      </div>
                    ))}
                    <div className="strategy-card-toolbar">
                      <div>
                        <strong>拼接完整视频</strong>
                        <p className="text-xs text-slate-500 mt-2">{selectedWork.mergedVideoUrl || selectedWork.videoUrl ? "完整视频已生成" : "等待一键拼接"}</p>
                      </div>
                      {selectedWork.mergedVideoUrl || selectedWork.videoUrl ? (
                        <a
                          className="primary-button"
                          href={selectedWork.mergedVideoUrl || selectedWork.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          打开完整视频
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              </>
            ) : null}
          </div>
        )}
      </article>

      <NoteCreateModalShell
        open={isCreateOpen}
        copy={CREATE_MODAL_COPY}
        isPublishing={props.isSubmitting}
        createDisabled={createDisabled}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      >
        <label className="field-full">
          <span>素材库（同步抖音-素材库）</span>
          <select value={sourceMaterialId} onChange={(event) => setSourceMaterialId(event.target.value)}>
            <option value="">不植入素材库，改为上传短视频</option>
            {materialOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="panel-subtext">默认只展示已加入抖音素材库且带视频链接的素材；若不选，请至少上传一个短视频文件。</p>
        </label>
        <label>
          <span>是否植入品牌资料</span>
          <select value={injectBrandProfileValue} onChange={(event) => setInjectBrandProfileValue(event.target.value)}>
            {YES_NO_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>产品资料（可选不植入）</span>
          <select value={productValue} onChange={(event) => setProductValue(event.target.value)}>
            <option value={NO_PRODUCT_OPTION}>不植入产品</option>
            {productOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.productName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>是否植入营销策划方案</span>
          <select value={injectMarketingPlanValue} onChange={(event) => setInjectMarketingPlanValue(event.target.value)}>
            {YES_NO_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="panel-subtext">
            {props.hasMarketingPlan
              ? `当前可用方案：${props.marketingPlanTitle || "最新抖音营销策划方案"}`
              : "当前品牌还没有抖音营销策划方案，选择“是”时将无法提交。"}
          </p>
        </label>
        {createDisabledReason ? (
          <div className="field-full report-inline-tip">
            {createDisabledReason}
          </div>
        ) : null}
        <label className="field-full">
          <span>上传短视频</span>
          <input
            type="file"
            accept="video/*"
            onChange={(event) => setSourceVideoFile(event.target.files?.[0] || null)}
          />
          <strong>{sourceVideoFile?.name || "未上传"}</strong>
        </label>
        <label className="field-full">
          <span>上传产品图/参考图</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setReferenceImageFile(event.target.files?.[0] || null)}
          />
          <strong>{referenceImageFile?.name || "未上传"}</strong>
        </label>
        <label>
          <span>选择视频大模型</span>
          <select value={providerValue} onChange={(event) => setProviderValue(event.target.value)}>
            {props.videoProviderOptions.map((item) => (
              <option key={item.backendKey} value={item.backendKey}>
                {item.providerName ? `${item.label}（${item.providerName}）` : item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>选择生图大模型</span>
          <select value={storyboardImageModelValue} onChange={(event) => setStoryboardImageModelValue(event.target.value)}>
            {props.storyboardImageModelOptions.map((item) => (
              <option key={item.selectionKey} value={item.selectionKey}>
                {item.recommended ? `${item.label}（推荐）` : item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-full">
          <span>用户要求</span>
          <textarea
            className="report-markdown-textarea composer-form-textarea"
            value={additionalInstruction}
            onChange={(event) => setAdditionalInstruction(event.target.value)}
            placeholder="例如：尽量保留原视频节奏，但品牌露出更自然，人物质感统一，镜头动作更适合生成。"
          />
        </label>
      </NoteCreateModalShell>
    </>
  );
}
