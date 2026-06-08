"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DouyinVideoWorkRecord,
  type StoryboardImageModelOptionRecord,
  type VideoNoteKind,
  type VideoProviderOptionRecord,
} from "../../../services/works";
import { type NoteCreateModalCopy } from "../xiaohongshu/note-create-modal-copy";
import { NoteCreateModalShell } from "../xiaohongshu/note-create-modal-shell";
import { NoteTextEditModal } from "../xiaohongshu/note-text-edit-modal";
import {
  ComposeTaskStatusPanel,
  WorkspaceSectionHeader,
} from "../xiaohongshu/note-workspace-shared-panels";
import { type OptionalDateFormatter, type ProductOption, type SelectOption } from "../xiaohongshu/shared-types";
import { VideoCreateBasicFields } from "../xiaohongshu/video-create-basic-fields";
import { VideoWorkspaceDetailPanel } from "../xiaohongshu/video-workspace-detail-panel";
import { VideoWorkCardGrid } from "../xiaohongshu/work-card-grids";
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
const CREATE_MODAL_COPY: NoteCreateModalCopy = {
  title: "创建 AI 生视频（故事板）",
  metaText: "提交后先生成创意剧本和故事板，故事板确认后再继续生成短视频。",
};

export interface DouyinVideoStoryboardWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  items: DouyinVideoWorkRecord[];
  calendarOptions: Array<{ id: string; label: string }>;
  productOptions: Array<{ id: string; label: string }>;
  materialOptions: Array<{ id: string; label: string; videoUrl?: string }>;
  videoProviderOptions: VideoProviderOptionRecord[];
  storyboardImageModelOptions: StoryboardImageModelOptionRecord[];
  hasMarketingPlan: boolean;
  marketingPlanTitle?: string;
  onRefresh: () => void | Promise<void>;
  onPreview: (item: DouyinVideoWorkRecord) => void;
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
    storyboardImageModel?: string;
    durationSec?: number;
    includeMarketingPlan?: boolean;
  }) => Promise<boolean>;
  onUpdate: (payload: {
    workId: string;
    title?: string;
    content?: string;
    storyboardPrompt?: string;
  }) => Promise<boolean>;
  onDelete: (workId: string) => Promise<boolean>;
  onRegenerateStoryboard: (payload: {
    workId: string;
    storyboardPrompt?: string;
  }) => Promise<boolean>;
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

function getTaskStatusClass(status?: DouyinVideoWorkRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getTaskStatusText(status?: DouyinVideoWorkRecord["taskStatus"]) {
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

function getCreateDisabled(params: {
  calendarValue: string;
  customTopic: string;
  videoKindValue: string;
  materialValue: string;
  providerValue: string;
  storyboardImageModelValue: string;
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
  if (!params.providerValue || !params.storyboardImageModelValue) {
    return true;
  }
  if (params.injectMarketingPlanValue === "yes" && !params.hasMarketingPlan) {
    return true;
  }
  return false;
}

export function DouyinVideoStoryboardWorkspace(props: DouyinVideoStoryboardWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [editingWorkId, setEditingWorkId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editingStoryboardPrompt, setEditingStoryboardPrompt] = useState("");

  const [calendarValue, setCalendarValue] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [productValue, setProductValue] = useState(NO_PRODUCT_OPTION);
  const [materialValue, setMaterialValue] = useState("");
  const [accountRoleValue, setAccountRoleValue] = useState("BRAND");
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [videoKindValue, setVideoKindValue] = useState<VideoNoteKind>("BRAND_PROMO");
  const [providerValue, setProviderValue] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [storyboardImageModelValue, setStoryboardImageModelValue] = useState("");
  const [durationValue, setDurationValue] = useState("10");
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
    storyboardImageModelValue,
    injectMarketingPlanValue,
    hasMarketingPlan: props.hasMarketingPlan,
  });

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
      storyboardImageModel: storyboardImageModelValue || undefined,
      durationSec: Number(durationValue || 10),
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
    setInjectMarketingPlanValue("yes");
    setAdditionalInstruction("");
  }

  function openEditor(item: DouyinVideoWorkRecord) {
    setEditingWorkId(item.id);
    setEditingTitle(item.title);
    setEditingContent(item.content);
    setEditingStoryboardPrompt(item.storyboardPrompt || "");
  }

  async function handleSaveEdit() {
    if (!editingWorkId) {
      return;
    }
    const success = await props.onUpdate({
      workId: editingWorkId,
      title: editingTitle.trim() || undefined,
      content: editingContent,
      storyboardPrompt: editingStoryboardPrompt.trim() || undefined,
    });
    if (success) {
      setEditingWorkId("");
    }
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

  async function handleRegenerateStoryboard() {
    if (!selectedWork) {
      return;
    }
    await props.onRegenerateStoryboard({
      workId: selectedWork.id,
      storyboardPrompt: editingStoryboardPrompt.trim() || selectedWork.storyboardPrompt || undefined,
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

  function openPublishModal(item: DouyinVideoWorkRecord) {
    props.onOpenPublishModal({
      id: item.id,
      workKind: "VIDEO_STORYBOARD",
      title: item.title,
      sourceLabel: item.calendarLabel || item.customTopicName || "AI生视频（故事板）",
      content: item.content,
      videoUrl: item.videoUrl,
    });
  }

  function openWechatChannelPublishModal(item: DouyinVideoWorkRecord) {
    props.onOpenWechatChannelPublishModal({
      id: item.id,
      workKind: "VIDEO_STORYBOARD",
      title: item.title,
      sourceLabel: item.calendarLabel || item.customTopicName || "AI生视频（故事板）",
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
          createLabel="创建 AI 生视频（故事板）"
          refreshDisabled={props.isLoading || props.isSubmitting}
          createDisabled={!props.canEdit || props.isSubmitting}
          onRefresh={props.onRefresh}
          onOpenCreate={() => setIsCreateOpen(true)}
        />

        <ComposeTaskStatusPanel
          title="AI 生视频（故事板）任务状态"
          description="提交后先生成创意剧本和故事板，故事板确认后再继续生成短视频，并支持根据第三方任务结果找回最终视频。"
          taskCount={props.items.length}
          latestTask={latestTaskItem
            ? ({
              taskStatus: latestTaskItem.taskStatus,
              taskTitle: latestTaskItem.title,
              updatedAt: latestTaskItem.updatedAt,
            } as never)
            : undefined}
          taskStatusText={getTaskStatusText(latestTaskItem?.taskStatus)}
          inlineError={latestTaskItem?.taskStatus === "FAILED" ? latestTaskItem.thirdPartyStatusDetail || "最近一次视频任务失败，请检查故事板或重新生成。" : ""}
          isTaskActive={Boolean(isTaskActive)}
          canCancelTask={false}
          isCancellingTask={false}
          showSubmittingState={props.isSubmitting}
          submittingText="AI 生视频（故事板）任务已提交，系统正在后台生成。"
          queuedText="任务已提交，正在排队生成创意剧本与故事板。"
          runningText="当前任务正在处理中，页面会自动刷新出最新的剧本、故事板和视频状态。"
          cancelledText="最近一次视频任务已取消。"
          getTaskStatusClass={getTaskStatusClass as never}
          formatDateTime={props.formatDateTime}
          onCancelTask={async () => undefined}
        />

        {!props.items.length ? (
          <div className="empty-state">当前还没有 AI 生视频（故事板）作品，点击右上角“创建 AI 生视频（故事板）”开始生成。</div>
        ) : (
          <VideoWorkCardGrid
            items={pagedItems}
            selectedWorkId={selectedWork?.id}
            deletingWorkId={props.isSubmitting ? editingWorkId || selectedWork?.id : undefined}
            onSelect={(item) => {
              setSelectedWorkId(item.id);
              setEditingStoryboardPrompt(item.storyboardPrompt || "");
            }}
            onPreview={props.onPreview}
            onPublish={openPublishModal}
            getPublishLabel={() => "发布到抖音"}
            onSecondaryPublish={openWechatChannelPublishModal}
            getSecondaryPublishLabel={() => "发布到视频号"}
            onEdit={openEditor}
            onDelete={(workId) => void handleDelete(workId)}
            formatDateTime={props.formatDateTime}
          />
        )}

        {selectedWork ? (
          <VideoWorkspaceDetailPanel
            selectedItem={selectedWork}
            editingStoryboardPrompt={editingStoryboardPrompt}
            savingWorkId={props.isSubmitting ? selectedWork.id : undefined}
            canRegenerateStoryboard={props.canEdit && !props.isSubmitting}
            canGenerateVideo={props.canEdit && !props.isSubmitting && Boolean(selectedWork.storyboardPrompt && selectedWork.storyboardImageUrl)}
            canRecoverVideo={props.canEdit && !props.isSubmitting && Boolean(selectedWork.providerTaskId)}
            onEditStoryboardPromptChange={setEditingStoryboardPrompt}
            onRegenerateStoryboard={handleRegenerateStoryboard}
            onGenerateVideo={handleGenerateVideo}
            onRecoverVideo={() => handleRecoverVideo()}
            onPreview={props.onPreview}
            extraActions={(
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => openPublishModal(selectedWork)}
                  disabled={!selectedWork.videoUrl}
                >
                  发布到抖音
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => openWechatChannelPublishModal(selectedWork)}
                  disabled={!selectedWork.videoUrl}
                >
                  发布到视频号
                </button>
              </>
            )}
            getOriginalTaskStatusClass={getTaskStatusClass}
            getOriginalTaskStatusText={getTaskStatusText}
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
                  key={`douyin-video-page-${currentPage}`}
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
          <span>故事板生图大模型</span>
          <select value={storyboardImageModelValue} onChange={(event) => setStoryboardImageModelValue(event.target.value)}>
            {props.storyboardImageModelOptions.map((item) => (
              <option key={item.selectionKey} value={item.selectionKey}>
                {item.recommended ? `${item.label}（推荐）` : item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>视频时长</span>
          <select value={durationValue} onChange={(event) => setDurationValue(event.target.value)}>
            <option value="10">10s</option>
            <option value="15">15s</option>
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
            placeholder="例如：节奏更快、口播更像抖音、镜头更聚焦产品使用瞬间。"
          />
        </label>
      </NoteCreateModalShell>

      <NoteTextEditModal
        open={Boolean(editingWorkId)}
        dialogTitle="编辑 AI 生视频（故事板）"
        metaText={`${props.items.find((item) => item.id === editingWorkId)?.calendarLabel || props.items.find((item) => item.id === editingWorkId)?.customTopicName || "自定义选题"}${props.items.find((item) => item.id === editingWorkId)?.productName ? ` · 产品：${props.items.find((item) => item.id === editingWorkId)?.productName}` : ""}`}
        noteCategory="原创"
        noteType="视频"
        taskStatus={props.items.find((item) => item.id === editingWorkId)?.taskStatus}
        title={editingTitle}
        content={editingContent}
        titlePlaceholder="请输入 AI 生视频（故事板）标题"
        contentPlaceholder="请输入 AI 生视频（故事板）正文"
        saving={props.isSubmitting}
        extraFields={
          <label className="report-editor-pane">
            <span>故事板提示词</span>
            <textarea
              className="report-markdown-textarea"
              value={editingStoryboardPrompt}
              onChange={(event) => setEditingStoryboardPrompt(event.target.value)}
              placeholder="可选：调整故事板提示词"
            />
          </label>
        }
        onClose={() => setEditingWorkId("")}
        onSave={handleSaveEdit}
        onTitleChange={setEditingTitle}
        onContentChange={setEditingContent}
        getTaskStatusClass={getTaskStatusClass}
        getTaskStatusText={getTaskStatusText}
      />
    </>
  );
}
