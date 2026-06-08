"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DouyinDirectVideoWorkRecord,
  type VideoAspectRatio,
  type VideoNoteKind,
  type VideoProviderOptionRecord,
} from "../../../services/works";
import { type NoteCreateModalCopy } from "../xiaohongshu/note-create-modal-copy";
import { NoteCreateModalShell } from "../xiaohongshu/note-create-modal-shell";
import {
  ComposeTaskStatusPanel,
  WorkspaceSectionHeader,
} from "../xiaohongshu/note-workspace-shared-panels";
import { type OptionalDateFormatter, type ProductOption, type SelectOption } from "../xiaohongshu/shared-types";
import { VideoCreateBasicFields } from "../xiaohongshu/video-create-basic-fields";
import { type DouyinPublishableWorkTarget } from "./publish-types";

const PAGE_SIZE = 20;
const CUSTOM_TOPIC_OPTION = "__custom_topic__";
const NO_PRODUCT_OPTION = "__no_product__";
const ACCOUNT_ROLE_OPTIONS: SelectOption[] = [
  { value: "BRAND", label: "品牌号" },
  { value: "STAFF", label: "员工号" },
  { value: "TALENT", label: "达人号" },
];
const VIDEO_KIND_OPTIONS: Array<{ value: VideoNoteKind; label: string }> = [
  { value: "BRAND_PROMO", label: "品牌宣传视频" },
  { value: "SPOKEN_SELLING", label: "口播带货视频" },
  { value: "SKIT_SELLING", label: "短剧带货视频" },
  { value: "REMIX", label: "复刻视频" },
];
const YES_NO_OPTIONS: SelectOption[] = [
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];
const ASPECT_RATIO_OPTIONS: Array<{ value: VideoAspectRatio; label: string }> = [
  { value: "9:16", label: "9:16" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
];
const DURATION_OPTIONS = ["3", "5", "8", "10", "15"];
const CREATE_MODAL_COPY: NoteCreateModalCopy = {
  title: "创建 AI 生视频",
  metaText: "提交后先生成 Seedance 2.0 生视频提示词，确认并修改后再继续生成短视频。",
};

export interface DouyinDirectVideoWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  items: DouyinDirectVideoWorkRecord[];
  calendarOptions: Array<{ id: string; label: string }>;
  productOptions: Array<{ id: string; label: string }>;
  materialOptions: Array<{ id: string; label: string; videoUrl?: string }>;
  videoProviderOptions: VideoProviderOptionRecord[];
  hasMarketingPlan: boolean;
  marketingPlanTitle?: string;
  onRefresh: () => void | Promise<void>;
  onPreview: (item: DouyinDirectVideoWorkRecord) => void;
  onCreate: (payload: {
    calendarItemId?: string;
    customTopicName?: string;
    productId?: string;
    materialId?: string;
    accountRole?: "BRAND" | "STAFF" | "TALENT";
    referenceImageFile?: File | null;
    videoKind?: VideoNoteKind;
    additionalInstruction?: string;
    videoProvider?: string;
    customVideoModelName?: string;
    durationSec?: number;
    aspectRatio?: VideoAspectRatio;
    includeMarketingPlan?: boolean;
  }) => Promise<boolean>;
  onUpdate: (payload: {
    workId: string;
    title?: string;
    content?: string;
  }) => Promise<boolean>;
  onDelete: (workId: string) => Promise<boolean>;
  onGenerateVideo: (payload: {
    workId: string;
    customVideoModelName?: string;
  }) => Promise<boolean>;
  onRecoverVideo: (payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  }) => Promise<boolean>;
  onOpenPublishModal: (target: DouyinPublishableWorkTarget) => void;
  onOpenWechatChannelPublishModal: (target: DouyinPublishableWorkTarget) => void;
  formatDateTime: OptionalDateFormatter;
}

function getTaskStatusClass(status?: DouyinDirectVideoWorkRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getTaskStatusText(status?: DouyinDirectVideoWorkRecord["taskStatus"]) {
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

function getWorkflowStageLabel(stage?: DouyinDirectVideoWorkRecord["workflowStage"]) {
  switch (stage) {
    case "QUEUED":
      return "排队中";
    case "GENERATING_SCRIPT":
      return "生成提示词";
    case "WAITING_VIDEO":
      return "待生成视频";
    case "GENERATING_VIDEO":
      return "生成视频";
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    default:
      return "处理中";
  }
}

function getWorkflowStageClass(stage?: DouyinDirectVideoWorkRecord["workflowStage"]) {
  switch (stage) {
    case "WAITING_VIDEO":
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

function getProgressStatusLabel(status?: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED") {
  switch (status) {
    case "RUNNING":
      return "进行中";
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    default:
      return "待执行";
  }
}

function getVideoKindLabel(kind?: DouyinDirectVideoWorkRecord["videoKind"]) {
  switch (kind) {
    case "BRAND_PROMO":
      return "品牌宣传视频";
    case "SPOKEN_SELLING":
      return "口播带货视频";
    case "SKIT_SELLING":
      return "短剧带货视频";
    case "REMIX":
      return "复刻视频";
    default:
      return "AI 生视频";
  }
}

function getCreateDisabled(params: {
  calendarValue: string;
  customTopic: string;
  videoKindValue: string;
  materialValue: string;
  providerValue: string;
  aspectRatioValue: string;
  injectMarketingPlanValue: string;
  hasMarketingPlan: boolean;
}) {
  if (!params.calendarValue) {
    return true;
  }
  if (params.calendarValue === CUSTOM_TOPIC_OPTION && !params.customTopic.trim()) {
    return true;
  }
  if (params.videoKindValue === "REMIX" && !params.materialValue) {
    return true;
  }
  if (!params.providerValue || !params.aspectRatioValue) {
    return true;
  }
  if (params.injectMarketingPlanValue === "yes" && !params.hasMarketingPlan) {
    return true;
  }
  return false;
}

function DirectVideoWorkCardGrid(props: {
  items: DouyinDirectVideoWorkRecord[];
  selectedWorkId?: string;
  deletingWorkId?: string;
  onSelect: (item: DouyinDirectVideoWorkRecord) => void;
  onPreview: (item: DouyinDirectVideoWorkRecord) => void;
  onPublish: (item: DouyinDirectVideoWorkRecord) => void;
  onWechatChannelPublish: (item: DouyinDirectVideoWorkRecord) => void;
  onDelete: (workId: string) => void;
  formatDateTime: OptionalDateFormatter;
}) {
  return (
    <div className="xhs-material-library">
      <div className="xhs-material-card-grid">
        {props.items.map((item) => {
          const previewImageUrl = item.coverImageUrl || item.referenceImageUrl || "";
          const isActive = props.selectedWorkId === item.id;
          return (
            <article key={item.id} className="xhs-material-card">
              <button
                type="button"
                className={`xhs-material-card-stage ${isActive ? "is-active" : ""}`}
                onClick={() => props.onSelect(item)}
              >
                {previewImageUrl ? (
                  <img className="xhs-material-card-media" src={previewImageUrl} alt={item.title} />
                ) : item.videoUrl ? (
                  <video className="xhs-material-card-media" src={item.videoUrl} muted preload="none" />
                ) : (
                  <span className="xhs-material-card-empty">暂无封面</span>
                )}
                <span className="xhs-material-card-badge xhs-material-card-badge--left">{item.accountRole === "STAFF" ? "员工号" : item.accountRole === "TALENT" ? "达人号" : "品牌号"}</span>
                <span className="xhs-material-card-badge">{getWorkflowStageLabel(item.workflowStage)}</span>
              </button>
              <div className="xhs-material-card-body">
                <strong>{item.title}</strong>
                <p>{getVideoKindLabel(item.videoKind)} · {item.calendarLabel || item.customTopicName || "自定义选题"}</p>
                <p>{props.formatDateTime(item.createdAt)}</p>
                <div className="xhs-material-card-actions">
                  <button type="button" className="primary-button" onClick={() => props.onSelect(item)}>
                    {isActive ? "查看中" : "查看详情"}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onPublish(item)}>
                    发布到抖音
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onWechatChannelPublish(item)}>
                    发布到视频号
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onPreview(item)}>
                    预览媒体
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => props.onDelete(item.id)}
                    disabled={props.deletingWorkId === item.id}
                  >
                    {props.deletingWorkId === item.id ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DirectVideoDetailPanel(props: {
  selectedItem: DouyinDirectVideoWorkRecord;
  editingPrompt: string;
  savingWorkId?: string;
  canUpdatePrompt: boolean;
  canGenerateVideo: boolean;
  canRecoverVideo: boolean;
  onEditPromptChange: (value: string) => void;
  onUpdatePrompt: () => void | Promise<void>;
  onGenerateVideo: () => void | Promise<void>;
  onRecoverVideo: () => void | Promise<void>;
  onPreview: (item: DouyinDirectVideoWorkRecord) => void;
  onPublish: () => void;
  onWechatChannelPublish: () => void;
  formatDateTime: OptionalDateFormatter;
}) {
  const { selectedItem } = props;

  return (
    <article className="light-data-panel report-editor-panel" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>{selectedItem.title}</strong>
          <p>
            {getVideoKindLabel(selectedItem.videoKind)}
            {" · "}
            {selectedItem.calendarLabel || selectedItem.customTopicName || "自定义选题"}
            {selectedItem.productName ? ` · 产品：${selectedItem.productName}` : ""}
            {selectedItem.requestedAspectRatio ? ` · 比例：${selectedItem.requestedAspectRatio}` : ""}
            {selectedItem.requestedDurationSec ? ` · 时长：${selectedItem.requestedDurationSec}s` : ""}
          </p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${getTaskStatusClass(selectedItem.taskStatus)}`}>{getTaskStatusText(selectedItem.taskStatus)}</span>
          <span className={`archive-pill ${getWorkflowStageClass(selectedItem.workflowStage)}`}>{getWorkflowStageLabel(selectedItem.workflowStage)}</span>
          <span className="archive-pill status-pending">{props.formatDateTime(selectedItem.updatedAt)}</span>
        </div>
      </div>

      {selectedItem.progressSteps.length ? (
        <div className="personal-grid" style={{ marginBottom: 16 }}>
          {selectedItem.progressSteps.map((step) => (
            <div key={step.key} className="entity-card personal-card">
              <strong>{step.label}</strong>
              <p className="personal-meta">{getProgressStatusLabel(step.status)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="personal-grid">
        <div className="report-editor-pane field-full">
          <span>生视频提示词</span>
          <textarea
            className="report-markdown-textarea composer-form-textarea"
            value={props.editingPrompt}
            onChange={(event) => props.onEditPromptChange(event.target.value)}
            placeholder="提示词生成完成后，这里会出现可编辑的 Seedance 2.0 生视频提示词。"
          />
          <p className="panel-subtext">你可以直接修改这里的提示词，点击“修改”后再继续生成短视频。</p>
        </div>
        <div className="report-editor-pane">
          <span>参考图/封面</span>
          {selectedItem.coverImageUrl || selectedItem.referenceImageUrl ? (
            <img
              src={selectedItem.coverImageUrl || selectedItem.referenceImageUrl}
              alt={`${selectedItem.title} 参考图`}
              style={{ width: "100%", borderRadius: 20, border: "1px solid #dfe5f2" }}
            />
          ) : (
            <div className="empty-state">当前未上传参考图，也没有产品图封面。</div>
          )}
        </div>
        <div className="report-editor-pane">
          <span>最终短视频</span>
          {selectedItem.videoUrl ? (
            <video controls preload="metadata" src={selectedItem.videoUrl} style={{ width: "100%", borderRadius: 20, background: "#0f1525" }} />
          ) : (
            <div className="empty-state">点击“生成短视频”后，这里会显示最终短视频。</div>
          )}
        </div>
      </div>

      <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="primary-button"
          onClick={() => void props.onUpdatePrompt()}
          disabled={!props.canUpdatePrompt || props.savingWorkId === selectedItem.id}
        >
          {props.savingWorkId === selectedItem.id && selectedItem.workflowStage === "WAITING_VIDEO" ? "修改中..." : "修改"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void props.onGenerateVideo()}
          disabled={!props.canGenerateVideo || props.savingWorkId === selectedItem.id}
        >
          {selectedItem.videoUrl ? "重新生成短视频" : "生成短视频"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void props.onRecoverVideo()}
          disabled={!props.canRecoverVideo || props.savingWorkId === selectedItem.id}
        >
          {props.savingWorkId === selectedItem.id && !selectedItem.videoUrl ? "找回中..." : "找回视频结果"}
        </button>
        <button type="button" className="secondary-button" onClick={() => props.onPreview(selectedItem)}>
          预览媒体
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={props.onPublish}
          disabled={!selectedItem.videoUrl}
        >
          发布到抖音
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={props.onWechatChannelPublish}
          disabled={!selectedItem.videoUrl}
        >
          发布到视频号
        </button>
      </div>
    </article>
  );
}

export function DouyinDirectVideoWorkspace(props: DouyinDirectVideoWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [editingPrompt, setEditingPrompt] = useState("");

  const [calendarValue, setCalendarValue] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [productValue, setProductValue] = useState(NO_PRODUCT_OPTION);
  const [materialValue, setMaterialValue] = useState("");
  const [accountRoleValue, setAccountRoleValue] = useState("BRAND");
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [videoKindValue, setVideoKindValue] = useState<VideoNoteKind>("BRAND_PROMO");
  const [providerValue, setProviderValue] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [durationValue, setDurationValue] = useState("10");
  const [aspectRatioValue, setAspectRatioValue] = useState<VideoAspectRatio>("9:16");
  const [injectMarketingPlanValue, setInjectMarketingPlanValue] = useState("yes");
  const [additionalInstruction, setAdditionalInstruction] = useState("");

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
  const materialNotes = useMemo(
    () => props.materialOptions.map((item) => ({ id: item.id, title: item.label, videoUrl: item.videoUrl })),
    [props.materialOptions],
  );
  const productOptions = useMemo<ProductOption[]>(
    () => props.productOptions.map((item) => ({ id: item.id, productName: item.label })),
    [props.productOptions],
  );
  const calendarSelectOptions = useMemo<SelectOption[]>(
    () => props.calendarOptions.map((item) => ({ value: item.id, label: item.label })),
    [props.calendarOptions],
  );
  const isTaskActive = latestTaskItem?.taskStatus === "RUNNING" || latestTaskItem?.taskStatus === "QUEUED" || latestTaskItem?.taskStatus === "PENDING";
  const createDisabled = getCreateDisabled({
    calendarValue,
    customTopic,
    videoKindValue,
    materialValue,
    providerValue,
    aspectRatioValue,
    injectMarketingPlanValue,
    hasMarketingPlan: props.hasMarketingPlan,
  });

  useEffect(() => {
    if (!selectedWorkId && props.items[0]?.id) {
      setSelectedWorkId(props.items[0].id);
    }
  }, [props.items, selectedWorkId]);

  useEffect(() => {
    if (selectedWork?.id) {
      setEditingPrompt(selectedWork.content || "");
    }
  }, [selectedWork?.id, selectedWork?.content]);

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
    if (!calendarValue && props.calendarOptions[0]?.id) {
      setCalendarValue(props.calendarOptions[0].id);
    }
  }, [calendarValue, props.calendarOptions]);

  async function handleCreate() {
    const success = await props.onCreate({
      calendarItemId: calendarValue !== CUSTOM_TOPIC_OPTION ? calendarValue : undefined,
      customTopicName: calendarValue === CUSTOM_TOPIC_OPTION ? customTopic.trim() || undefined : undefined,
      productId: productValue !== NO_PRODUCT_OPTION ? productValue : undefined,
      materialId: materialValue || undefined,
      accountRole: accountRoleValue as "BRAND" | "STAFF" | "TALENT",
      referenceImageFile,
      videoKind: videoKindValue,
      additionalInstruction: additionalInstruction.trim() || undefined,
      videoProvider: providerValue || undefined,
      customVideoModelName: customModelName.trim() || undefined,
      durationSec: Number(durationValue || 10),
      aspectRatio: aspectRatioValue,
      includeMarketingPlan: injectMarketingPlanValue === "yes",
    });
    if (!success) {
      return;
    }
    setIsCreateOpen(false);
    setCustomTopic("");
    setProductValue(NO_PRODUCT_OPTION);
    setMaterialValue("");
    setReferenceImageFile(null);
    setVideoKindValue("BRAND_PROMO");
    setCustomModelName("");
    setDurationValue("10");
    setAspectRatioValue("9:16");
    setInjectMarketingPlanValue("yes");
    setAdditionalInstruction("");
  }

  async function handleDelete(workId: string) {
    const target = props.items.find((item) => item.id === workId);
    if (!target) {
      return;
    }
    if (!window.confirm(`确认删除「${target.title}」吗？删除后无法恢复。`)) {
      return;
    }
    await props.onDelete(workId);
  }

  async function handleUpdatePrompt() {
    if (!selectedWork) {
      return;
    }
    await props.onUpdate({
      workId: selectedWork.id,
      title: selectedWork.title,
      content: editingPrompt,
    });
  }

  async function handleGenerateVideo() {
    if (!selectedWork) {
      return;
    }
    await props.onGenerateVideo({
      workId: selectedWork.id,
      customVideoModelName: customModelName.trim() || undefined,
    });
  }

  async function handleRecoverVideo() {
    if (!selectedWork?.providerTaskId) {
      return;
    }
    await props.onRecoverVideo({
      workId: selectedWork.id,
      providerTaskId: selectedWork.providerTaskId,
      requestedVideoProvider: selectedWork.resolvedVideoProvider || selectedWork.requestedVideoProvider,
    });
  }

  function openPublishModal(item: DouyinDirectVideoWorkRecord) {
    props.onOpenPublishModal({
      id: item.id,
      workKind: "VIDEO_DIRECT",
      title: item.title,
      sourceLabel: item.calendarLabel || item.customTopicName || "AI生视频",
      content: item.content,
      videoUrl: item.videoUrl,
    });
  }

  function openWechatChannelPublishModal(item: DouyinDirectVideoWorkRecord) {
    props.onOpenWechatChannelPublishModal({
      id: item.id,
      workKind: "VIDEO_DIRECT",
      title: item.title,
      sourceLabel: item.calendarLabel || item.customTopicName || "AI生视频",
      content: item.content,
      videoUrl: item.videoUrl,
    });
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <WorkspaceSectionHeader
          sectionLabel={props.sectionLabel}
          sectionDescription={props.sectionDescription}
          createLabel="创建 AI 生视频"
          refreshDisabled={props.isLoading || props.isSubmitting}
          createDisabled={!props.canEdit || props.isSubmitting}
          onRefresh={props.onRefresh}
          onOpenCreate={() => setIsCreateOpen(true)}
        />

        <ComposeTaskStatusPanel
          title="AI 生视频任务状态"
          description="提交后先生成 Seedance 2.0 生视频提示词，确认提示词后再继续生成短视频，并支持根据第三方任务结果找回最终视频。"
          taskCount={props.items.length}
          latestTask={latestTaskItem
            ? ({
              taskStatus: latestTaskItem.taskStatus,
              taskTitle: latestTaskItem.title,
              updatedAt: latestTaskItem.updatedAt,
            } as never)
            : undefined}
          taskStatusText={getTaskStatusText(latestTaskItem?.taskStatus)}
          inlineError={latestTaskItem?.taskStatus === "FAILED" ? latestTaskItem.thirdPartyStatusDetail || "最近一次 AI 生视频任务失败，请检查提示词或重新生成。" : ""}
          isTaskActive={Boolean(isTaskActive)}
          canCancelTask={false}
          isCancellingTask={false}
          showSubmittingState={props.isSubmitting}
          submittingText="AI 生视频任务已提交，系统正在后台生成。"
          queuedText="任务已提交，正在排队生成生视频提示词。"
          runningText="当前任务正在处理中，页面会自动刷新出最新的提示词和短视频状态。"
          cancelledText="最近一次视频任务已取消。"
          getTaskStatusClass={getTaskStatusClass as never}
          formatDateTime={props.formatDateTime}
          onCancelTask={async () => undefined}
        />

        {!props.items.length ? (
          <div className="empty-state">当前还没有 AI 生视频作品，点击右上角“创建 AI 生视频”开始生成。</div>
        ) : (
          <DirectVideoWorkCardGrid
            items={pagedItems}
            selectedWorkId={selectedWork?.id}
            deletingWorkId={props.isSubmitting ? selectedWork?.id : undefined}
            onSelect={(item) => setSelectedWorkId(item.id)}
            onPreview={props.onPreview}
            onPublish={openPublishModal}
            onWechatChannelPublish={openWechatChannelPublishModal}
            onDelete={(workId) => void handleDelete(workId)}
            formatDateTime={props.formatDateTime}
          />
        )}

        {selectedWork ? (
          <DirectVideoDetailPanel
            selectedItem={selectedWork}
            editingPrompt={editingPrompt}
            savingWorkId={props.isSubmitting ? selectedWork.id : undefined}
            canUpdatePrompt={props.canEdit && !props.isSubmitting && Boolean(editingPrompt.trim())}
            canGenerateVideo={props.canEdit && !props.isSubmitting && Boolean(selectedWork.content?.trim())}
            canRecoverVideo={props.canEdit && !props.isSubmitting && Boolean(selectedWork.providerTaskId)}
            onEditPromptChange={setEditingPrompt}
            onUpdatePrompt={handleUpdatePrompt}
            onGenerateVideo={handleGenerateVideo}
            onRecoverVideo={handleRecoverVideo}
            onPreview={props.onPreview}
            onPublish={() => openPublishModal(selectedWork)}
            onWechatChannelPublish={() => openWechatChannelPublishModal(selectedWork)}
            formatDateTime={props.formatDateTime}
          />
        ) : null}

        {props.items.length > PAGE_SIZE ? (
          <div className="note-pagination-bar hotspot-pagination-bar">
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
                  key={`douyin-direct-video-page-${currentPage}`}
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

      <NoteCreateModalShell
        open={isCreateOpen}
        copy={CREATE_MODAL_COPY}
        isPublishing={props.isSubmitting}
        createDisabled={createDisabled}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      >
        <VideoCreateBasicFields
          calendarOptions={calendarSelectOptions}
          customTopicOption={CUSTOM_TOPIC_OPTION}
          noProductOption={NO_PRODUCT_OPTION}
          products={productOptions}
          calendarValue={calendarValue}
          customTopic={customTopic}
          productValue={productValue}
          accountRoleValue={accountRoleValue}
          accountRoleOptions={ACCOUNT_ROLE_OPTIONS}
          onCalendarChange={setCalendarValue}
          onProductChange={setProductValue}
          onAccountRoleChange={setAccountRoleValue}
          onCustomTopicChange={setCustomTopic}
        />
        <label>
          <span>视频类型</span>
          <select value={videoKindValue} onChange={(event) => setVideoKindValue(event.target.value as VideoNoteKind)}>
            {VIDEO_KIND_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>素材库（抖音区素材库）</span>
          <select value={materialValue} onChange={(event) => setMaterialValue(event.target.value)}>
            <option value="">不添加素材</option>
            {materialNotes
              .filter((item) => Boolean(item.videoUrl))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </select>
          <p className="panel-subtext">
            {videoKindValue === "REMIX" ? "复刻视频必须选择一个抖音视频素材。" : "可选：默认只展示已加入抖音素材库的视频素材。"}
          </p>
        </label>
        <label className="field-full">
          <span>上传产品图/参考图</span>
          <input
            type="file"
            accept="image/*"
            disabled={productValue !== NO_PRODUCT_OPTION}
            onChange={(event) => setReferenceImageFile(event.target.files?.[0] || null)}
          />
          <strong>{referenceImageFile?.name || "未上传"}</strong>
          <p className="panel-subtext">
            {productValue !== NO_PRODUCT_OPTION ? "已选择产品，若要上传参考图，请先切换为“不植入产品”。" : "参考图与产品不可同时选择。"}
          </p>
        </label>
        <label>
          <span>视频大模型</span>
          <select value={providerValue} onChange={(event) => setProviderValue(event.target.value)}>
            {props.videoProviderOptions.map((item) => (
              <option key={item.backendKey} value={item.backendKey}>
                {item.providerName ? `${item.label}（${item.providerName}）` : item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>视频时长</span>
          <select value={durationValue} onChange={(event) => setDurationValue(event.target.value)}>
            {DURATION_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}s
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>视频尺寸比例</span>
          <select value={aspectRatioValue} onChange={(event) => setAspectRatioValue(event.target.value as VideoAspectRatio)}>
            {ASPECT_RATIO_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>植入营销策划方案</span>
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
        <label>
          <span>自定义模型名</span>
          <input
            value={customModelName}
            onChange={(event) => setCustomModelName(event.target.value)}
            placeholder="可选：手动输入该后端的具体 model"
          />
        </label>
        <label className="field-full">
          <span>用户要求</span>
          <textarea
            className="report-markdown-textarea composer-form-textarea"
            value={additionalInstruction}
            onChange={(event) => setAdditionalInstruction(event.target.value)}
            placeholder="例如：镜头更聚焦产品细节、节奏更快、突出抖音感和真实生活化表达。"
          />
        </label>
      </NoteCreateModalShell>
    </>
  );
}
