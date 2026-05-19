"use client";

import { type TaskRecord } from "../../../services/personal-center";
import { type XhsCollectedNoteRecord } from "../../../services/collectors";
import {
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { ComposeTaskStatusPanel, PublishTaskStatusPanel, WorkspaceSectionHeader } from "./note-workspace-shared-panels";
import { VideoWorkspaceDetailPanel } from "./video-workspace-detail-panel";
import { OriginalWorkspaceModals, RewriteWorkspaceModals } from "./note-workspace-modals";
import { VideoWorkspaceModals } from "./video-workspace-modals";
import {
  type AsyncAction,
  type OptionalDateFormatter,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import { OriginalWorkCardGrid, RewriteWorkCardGrid, VideoWorkCardGrid } from "./work-card-grids";

export interface OriginalWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isPublishing: boolean;
  isTaskActive: boolean;
  taskCount: number;
  latestTask?: TaskRecord;
  taskStatusText: string;
  inlineError: string;
  isCancellingTask: boolean;
  canCancelTask: boolean;
  latestPublishTask?: TaskRecord;
  items: XiaohongshuOriginalWorkRecord[];
  previewIndexMap: Record<string, number>;
  deletingWorkId?: string;
  editingWork?: XiaohongshuOriginalWorkRecord;
  editingTitle: string;
  editingContent: string;
  savingWorkId?: string;
  isCreateModalOpen: boolean;
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  autoImageCountOption: string;
  products: ProductOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  imageCountValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  coverReferenceFile: File | null;
  galleryReferenceFiles: File[];
  referenceTemplateCategories: XhsOriginalReferenceTemplateCategoryRecord[];
  referenceTemplateItems: XhsOriginalReferenceTemplateRecord[];
  isReferenceTemplatesLoading: boolean;
  referenceTemplatesError: string;
  onRefresh: AsyncAction;
  onCancelTask: AsyncAction;
  onOpenCreate: () => void;
  onShiftPreview: (workId: string, total: number, delta: number) => void;
  onOpenLightbox: (item: XiaohongshuOriginalWorkRecord, index: number) => void;
  onPublish: (item: XiaohongshuOriginalWorkRecord) => void;
  getPublishLabel: (workId: string) => string;
  onEdit: (item: XiaohongshuOriginalWorkRecord) => void;
  onDelete: (workId: string) => ReturnType<AsyncAction>;
  onCloseEdit: () => void;
  onSaveEdit: AsyncAction;
  onEditTitleChange: StringChangeHandler;
  onEditContentChange: StringChangeHandler;
  onCloseCreate: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onImageCountChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  onCoverReferenceFileChange: (file: File | null) => void;
  onGalleryReferenceFilesChange: (files: File[]) => void;
  onReloadReferenceTemplates: AsyncAction;
  getTaskStatusClass: (status?: TaskRecord["taskStatus"]) => string;
  getOriginalTaskStatusClass: (status?: XiaohongshuOriginalWorkRecord["taskStatus"]) => string;
  getOriginalTaskStatusText: (status?: XiaohongshuOriginalWorkRecord["taskStatus"]) => string;
  getPublishTaskStatusText: (task?: TaskRecord) => string;
  getPublishTaskSummaryText: (task: TaskRecord, noteCategory: "原创" | "二创") => string;
  formatDateTime: OptionalDateFormatter;
}

export function OriginalWorkspace(props: OriginalWorkspaceProps) {
  return (
    <article className="workspace-panel strategy-page-card">
      <WorkspaceSectionHeader
        sectionLabel={props.sectionLabel}
        sectionDescription={props.sectionDescription}
        createLabel="添加原创笔记"
        refreshDisabled={props.isLoading || props.isPublishing || props.isTaskActive}
        createDisabled={props.isPublishing || props.isTaskActive}
        onRefresh={props.onRefresh}
        onOpenCreate={props.onOpenCreate}
      />

      <ComposeTaskStatusPanel
        title="原创笔记创作状态"
        description="点击“添加原创笔记”后，这里会展示最近一次原创笔记任务的状态，并在创作完成后自动刷新到最新结果。"
        taskCount={props.taskCount}
        latestTask={props.latestTask}
        taskStatusText={props.taskStatusText}
        inlineError={props.inlineError}
        isTaskActive={props.isTaskActive}
        canCancelTask={props.canCancelTask}
        isCancellingTask={props.isCancellingTask}
        queuedText="原创笔记任务已提交，正在排队。"
        runningText={`原创笔记正在生成中：${props.latestTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
        cancelledText="最近一次原创笔记任务已取消，本次创作流程已停止，你可以重新发起新的任务。"
        getTaskStatusClass={props.getTaskStatusClass}
        formatDateTime={props.formatDateTime}
        onCancelTask={props.onCancelTask}
      />

      <PublishTaskStatusPanel
        title="原创笔记发布状态"
        description="优先走电脑端一键发布到草稿箱；若当前电脑没装扩展，再使用手机扫码接力作为备用方案。"
        noteCategory="原创"
        latestTask={props.latestPublishTask}
        getTaskStatusClass={props.getTaskStatusClass}
        getPublishTaskStatusText={props.getPublishTaskStatusText}
        getPublishTaskSummaryText={props.getPublishTaskSummaryText}
        formatDateTime={props.formatDateTime}
      />

      {!props.items.length ? (
        <div className="empty-state">当前还没有原创笔记，点击右上角“添加原创笔记”开始创作。</div>
      ) : (
        <OriginalWorkCardGrid
          items={props.items}
          previewIndexMap={props.previewIndexMap}
          onShiftPreview={props.onShiftPreview}
          onOpenLightbox={props.onOpenLightbox}
          onPublish={props.onPublish}
          getPublishLabel={props.getPublishLabel}
          onEdit={props.onEdit}
          onDelete={(workId) => void props.onDelete(workId)}
          deletingWorkId={props.deletingWorkId}
          formatDateTime={props.formatDateTime}
        />
      )}

      <OriginalWorkspaceModals
        editModalProps={{
          item: props.editingWork,
          title: props.editingTitle,
          content: props.editingContent,
          savingWorkId: props.savingWorkId,
          onClose: props.onCloseEdit,
          onSave: props.onSaveEdit,
          onTitleChange: props.onEditTitleChange,
          onContentChange: props.onEditContentChange,
          getTaskStatusClass: props.getOriginalTaskStatusClass,
          getTaskStatusText: props.getOriginalTaskStatusText,
        }}
        createModalProps={{
          open: props.isCreateModalOpen,
          isPublishing: props.isPublishing,
          calendarOptions: props.calendarOptions,
          customTopicOption: props.customTopicOption,
          noProductOption: props.noProductOption,
          autoImageCountOption: props.autoImageCountOption,
          products: props.products,
          calendarValue: props.calendarValue,
          customTopic: props.customTopic,
          productValue: props.productValue,
          accountRoleValue: props.accountRoleValue,
          accountRoleOptions: props.accountRoleOptions,
          imageCountValue: props.imageCountValue,
          injectMarketingPlanValue: props.injectMarketingPlanValue,
          additionalInstruction: props.additionalInstruction,
          coverReferenceFile: props.coverReferenceFile,
          galleryReferenceFiles: props.galleryReferenceFiles,
          referenceTemplateCategories: props.referenceTemplateCategories,
          referenceTemplateItems: props.referenceTemplateItems,
          isReferenceTemplatesLoading: props.isReferenceTemplatesLoading,
          referenceTemplatesError: props.referenceTemplatesError,
          onClose: props.onCloseCreate,
          onCreate: props.onCreate,
          onCalendarChange: props.onCalendarChange,
          onCustomTopicChange: props.onCustomTopicChange,
          onProductChange: props.onProductChange,
          onAccountRoleChange: props.onAccountRoleChange,
          onImageCountChange: props.onImageCountChange,
          onInjectMarketingPlanChange: props.onInjectMarketingPlanChange,
          onAdditionalInstructionChange: props.onAdditionalInstructionChange,
          onCoverReferenceFileChange: props.onCoverReferenceFileChange,
          onGalleryReferenceFilesChange: props.onGalleryReferenceFilesChange,
          onReloadReferenceTemplates: props.onReloadReferenceTemplates,
        }}
      />
    </article>
  );
}

export interface RewriteWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isPublishing: boolean;
  isTaskActive: boolean;
  taskCount: number;
  showSubmittingState: boolean;
  submittingLabel: string;
  latestTask?: TaskRecord;
  taskStatusText: string;
  inlineError: string;
  isCancellingTask: boolean;
  canCancelTask: boolean;
  latestPublishTask?: TaskRecord;
  items: XiaohongshuRewriteWorkRecord[];
  materialNotes: XhsCollectedNoteRecord[];
  previewIndexMap: Record<string, number>;
  deletingWorkId?: string;
  editingWork?: XiaohongshuRewriteWorkRecord;
  editingTitle: string;
  editingContent: string;
  savingWorkId?: string;
  isCreateModalOpen: boolean;
  noProductOption: string;
  products: ProductOption[];
  materialValue: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onRefresh: AsyncAction;
  onCancelTask: AsyncAction;
  onOpenCreate: () => void;
  onShiftPreview: (workId: string, total: number, delta: number) => void;
  onOpenLightbox: (item: XiaohongshuRewriteWorkRecord, index: number) => void;
  onPublish: (item: XiaohongshuRewriteWorkRecord) => void;
  getPublishLabel: (workId: string) => string;
  onEdit: (item: XiaohongshuRewriteWorkRecord) => void;
  onDelete: (workId: string) => ReturnType<AsyncAction>;
  onCloseEdit: () => void;
  onSaveEdit: AsyncAction;
  onEditTitleChange: StringChangeHandler;
  onEditContentChange: StringChangeHandler;
  onCloseCreate: () => void;
  onCreate: AsyncAction;
  onMaterialChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  getTaskStatusClass: (status?: TaskRecord["taskStatus"]) => string;
  getOriginalTaskStatusClass: (status?: XiaohongshuRewriteWorkRecord["taskStatus"]) => string;
  getOriginalTaskStatusText: (status?: XiaohongshuRewriteWorkRecord["taskStatus"]) => string;
  getPublishTaskStatusText: (task?: TaskRecord) => string;
  getPublishTaskSummaryText: (task: TaskRecord, noteCategory: "原创" | "二创") => string;
  formatDateTime: OptionalDateFormatter;
}

export function RewriteWorkspace(props: RewriteWorkspaceProps) {
  return (
    <article className="workspace-panel strategy-page-card">
      <WorkspaceSectionHeader
        sectionLabel={props.sectionLabel}
        sectionDescription={props.sectionDescription}
        createLabel="添加二创笔记"
        refreshDisabled={props.isLoading || props.isPublishing || props.isTaskActive}
        createDisabled={props.isPublishing || props.isTaskActive || !props.materialNotes.length}
        onRefresh={props.onRefresh}
        onOpenCreate={props.onOpenCreate}
      />

      <ComposeTaskStatusPanel
        title="二创笔记创作状态"
        description="点击“添加二创笔记”后，这里会展示最近一次二创任务的状态，并在创作完成后自动刷新到最新结果。"
        taskCount={props.taskCount}
        latestTask={props.latestTask}
        taskStatusText={props.taskStatusText}
        inlineError={props.inlineError}
        isTaskActive={props.isTaskActive}
        canCancelTask={props.canCancelTask}
        isCancellingTask={props.isCancellingTask}
        showSubmittingState={props.showSubmittingState}
        submittingText={`二创笔记已提交，正在生成中：${props.submittingLabel || "本次二创笔记"}，请稍候。`}
        queuedText="二创笔记任务已提交，正在排队。"
        runningText={`二创笔记正在生成中：${props.latestTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
        cancelledText="最近一次二创笔记任务已取消，本次创作流程已停止，你可以重新发起新的任务。"
        getTaskStatusClass={props.getTaskStatusClass}
        formatDateTime={props.formatDateTime}
        onCancelTask={props.onCancelTask}
      />

      <PublishTaskStatusPanel
        title="二创笔记发布状态"
        description="优先走电脑端一键发布到草稿箱；若当前电脑没装扩展，再使用手机扫码接力作为备用方案。"
        noteCategory="二创"
        latestTask={props.latestPublishTask}
        getTaskStatusClass={props.getTaskStatusClass}
        getPublishTaskStatusText={props.getPublishTaskStatusText}
        getPublishTaskSummaryText={props.getPublishTaskSummaryText}
        formatDateTime={props.formatDateTime}
      />

      {!props.items.length ? (
        <div className="empty-state">
          {props.materialNotes.length
            ? "当前还没有二创笔记，点击右上角“添加二创笔记”开始创作。"
            : "素材库里还没有可用作品。请先到“小红书 → 素材库”确认已有作品加入素材库，再开始二创。"}
        </div>
      ) : (
        <RewriteWorkCardGrid
          items={props.items}
          previewIndexMap={props.previewIndexMap}
          onShiftPreview={props.onShiftPreview}
          onOpenLightbox={props.onOpenLightbox}
          onPublish={props.onPublish}
          getPublishLabel={props.getPublishLabel}
          onEdit={props.onEdit}
          onDelete={(workId) => void props.onDelete(workId)}
          deletingWorkId={props.deletingWorkId}
          formatDateTime={props.formatDateTime}
        />
      )}

      <RewriteWorkspaceModals
        editModalProps={{
          item: props.editingWork,
          title: props.editingTitle,
          content: props.editingContent,
          savingWorkId: props.savingWorkId,
          onClose: props.onCloseEdit,
          onSave: props.onSaveEdit,
          onTitleChange: props.onEditTitleChange,
          onContentChange: props.onEditContentChange,
          getTaskStatusClass: props.getOriginalTaskStatusClass,
          getTaskStatusText: props.getOriginalTaskStatusText,
        }}
        createModalProps={{
          open: props.isCreateModalOpen,
          isPublishing: props.isPublishing,
          noProductOption: props.noProductOption,
          materials: props.materialNotes,
          products: props.products,
          materialValue: props.materialValue,
          productValue: props.productValue,
          accountRoleValue: props.accountRoleValue,
          accountRoleOptions: props.accountRoleOptions,
          injectMarketingPlanValue: props.injectMarketingPlanValue,
          additionalInstruction: props.additionalInstruction,
          onClose: props.onCloseCreate,
          onCreate: props.onCreate,
          onMaterialChange: props.onMaterialChange,
          onProductChange: props.onProductChange,
          onAccountRoleChange: props.onAccountRoleChange,
          onInjectMarketingPlanChange: props.onInjectMarketingPlanChange,
          onAdditionalInstructionChange: props.onAdditionalInstructionChange,
        }}
      />
    </article>
  );
}

export interface VideoWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isPublishing: boolean;
  isTaskActive: boolean;
  taskCount: number;
  showSubmittingState: boolean;
  submittingLabel: string;
  latestTask?: TaskRecord;
  taskStatusText: string;
  inlineError: string;
  isCancellingTask: boolean;
  canCancelTask: boolean;
  items: XiaohongshuVideoWorkRecord[];
  materialNotes: XhsCollectedNoteRecord[];
  selectedWork?: XiaohongshuVideoWorkRecord;
  deletingWorkId?: string;
  editingWork?: XiaohongshuVideoWorkRecord;
  editingTitle: string;
  editingContent: string;
  editingStoryboardPrompt: string;
  savingWorkId?: string;
  isCreateModalOpen: boolean;
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  customVideoProviderOption: string;
  videoProviderOptions: VideoProviderOptionRecord[];
  products: ProductOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  materialValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  referenceImageFile: File | null;
  videoKindValue: string;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  durationValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onRefresh: AsyncAction;
  onCancelTask: AsyncAction;
  onOpenCreate: () => void;
  onSelectWork: (item: XiaohongshuVideoWorkRecord) => void;
  onPreview: (item: XiaohongshuVideoWorkRecord) => void;
  onEdit: (item: XiaohongshuVideoWorkRecord) => void;
  onDelete: (workId: string) => ReturnType<AsyncAction>;
  onRegenerateStoryboard: AsyncAction;
  onGenerateVideo: AsyncAction;
  onRecoverVideo: (item: XiaohongshuVideoWorkRecord) => ReturnType<AsyncAction>;
  onCloseEdit: () => void;
  onSaveEdit: AsyncAction;
  onEditTitleChange: StringChangeHandler;
  onEditContentChange: StringChangeHandler;
  onEditStoryboardPromptChange: StringChangeHandler;
  onCloseCreate: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onMaterialChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onReferenceImageFileChange: (file: File | null) => void;
  onVideoKindChange: StringChangeHandler;
  onCopyAdditionalInstructionChange: StringChangeHandler;
  onProviderChange: StringChangeHandler;
  onCustomProviderChange: StringChangeHandler;
  onCustomModelNameChange: StringChangeHandler;
  onDurationChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  getTaskStatusClass: (status?: TaskRecord["taskStatus"]) => string;
  getOriginalTaskStatusClass: (status?: XiaohongshuVideoWorkRecord["taskStatus"]) => string;
  getOriginalTaskStatusText: (status?: XiaohongshuVideoWorkRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
}

export function VideoWorkspace(props: VideoWorkspaceProps) {
  const selectedItem = props.selectedWork;
  const canRegenerateStoryboard = Boolean(
    selectedItem?.storyboardPrompt
      && selectedItem.workflowStage !== "QUEUED"
      && selectedItem.workflowStage !== "GENERATING_SCRIPT"
      && selectedItem.workflowStage !== "GENERATING_STORYBOARD",
  );
  const canGenerateVideo = Boolean(
    selectedItem?.storyboardPrompt
      && selectedItem.storyboardImageUrl
      && selectedItem.workflowStage !== "QUEUED"
      && selectedItem.workflowStage !== "GENERATING_SCRIPT"
      && selectedItem.workflowStage !== "GENERATING_STORYBOARD"
      && selectedItem.workflowStage !== "GENERATING_VIDEO",
  );
  const canRecoverVideo = Boolean(
    selectedItem?.providerTaskId
      && !selectedItem.videoUrl
      && (selectedItem.workflowStage === "FAILED"
        || selectedItem.workflowStage === "GENERATING_VIDEO"
        || selectedItem.workflowStage === "WAITING_VIDEO"),
  );

  return (
    <article className="workspace-panel strategy-page-card">
      <WorkspaceSectionHeader
        sectionLabel={props.sectionLabel}
        sectionDescription={props.sectionDescription}
        createLabel="添加视频笔记"
        refreshDisabled={props.isLoading || props.isPublishing || props.isTaskActive}
        createDisabled={props.isPublishing || props.isTaskActive}
        onRefresh={props.onRefresh}
        onOpenCreate={props.onOpenCreate}
      />

      <ComposeTaskStatusPanel
        title="视频笔记创作状态"
        description="点击“添加视频笔记”后，这里会展示最近一次视频任务的状态，并在创作完成后自动刷新到最新结果。"
        taskCount={props.taskCount}
        latestTask={props.latestTask}
        taskStatusText={props.taskStatusText}
        inlineError={props.inlineError}
        isTaskActive={props.isTaskActive}
        canCancelTask={props.canCancelTask}
        isCancellingTask={props.isCancellingTask}
        showSubmittingState={props.showSubmittingState}
        submittingText={`视频笔记已提交，正在生成中：${props.submittingLabel || "本次视频笔记"}，请稍候。`}
        queuedText="视频笔记任务已提交，正在排队。"
        runningText={`视频笔记正在生成中：${props.latestTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
        cancelledText="最近一次视频笔记任务已取消，本次创作流程已停止，你可以重新发起新的任务。"
        getTaskStatusClass={props.getTaskStatusClass}
        formatDateTime={props.formatDateTime}
        onCancelTask={props.onCancelTask}
      />

      {!props.items.length ? (
        <div className="empty-state">当前还没有视频笔记，点击右上角“添加视频笔记”开始创作。</div>
      ) : (
        <>
          <VideoWorkCardGrid
            items={props.items}
            selectedWorkId={selectedItem?.id}
            onSelect={props.onSelectWork}
            onPreview={props.onPreview}
            onEdit={props.onEdit}
            onDelete={(workId) => void props.onDelete(workId)}
            deletingWorkId={props.deletingWorkId}
            formatDateTime={props.formatDateTime}
          />
          {selectedItem ? (
            <VideoWorkspaceDetailPanel
              selectedItem={selectedItem}
              editingStoryboardPrompt={props.editingStoryboardPrompt}
              savingWorkId={props.savingWorkId}
              canRegenerateStoryboard={canRegenerateStoryboard}
              canGenerateVideo={canGenerateVideo}
              canRecoverVideo={canRecoverVideo}
              onEditStoryboardPromptChange={props.onEditStoryboardPromptChange}
              onRegenerateStoryboard={props.onRegenerateStoryboard}
              onGenerateVideo={props.onGenerateVideo}
              onRecoverVideo={props.onRecoverVideo}
              onPreview={props.onPreview}
              getOriginalTaskStatusClass={props.getOriginalTaskStatusClass}
              getOriginalTaskStatusText={props.getOriginalTaskStatusText}
              formatDateTime={props.formatDateTime}
            />
          ) : null}
        </>
      )}

      <VideoWorkspaceModals
        editModalProps={{
          item: props.editingWork,
          title: props.editingTitle,
          content: props.editingContent,
          storyboardPrompt: props.editingStoryboardPrompt,
          savingWorkId: props.savingWorkId,
          onClose: props.onCloseEdit,
          onSave: props.onSaveEdit,
          onTitleChange: props.onEditTitleChange,
          onContentChange: props.onEditContentChange,
          onStoryboardPromptChange: props.onEditStoryboardPromptChange,
          getTaskStatusClass: props.getOriginalTaskStatusClass,
          getTaskStatusText: props.getOriginalTaskStatusText,
        }}
        createModalProps={{
          open: props.isCreateModalOpen,
          isPublishing: props.isPublishing,
          calendarOptions: props.calendarOptions,
          customTopicOption: props.customTopicOption,
          noProductOption: props.noProductOption,
          customVideoProviderOption: props.customVideoProviderOption,
          videoProviderOptions: props.videoProviderOptions,
          products: props.products,
          materialNotes: props.materialNotes,
          calendarValue: props.calendarValue,
          customTopic: props.customTopic,
          productValue: props.productValue,
          materialValue: props.materialValue,
          accountRoleValue: props.accountRoleValue,
          accountRoleOptions: props.accountRoleOptions,
          referenceImageFile: props.referenceImageFile,
          videoKindValue: props.videoKindValue,
          copyAdditionalInstruction: props.copyAdditionalInstruction,
          providerValue: props.providerValue,
          customProviderValue: props.customProviderValue,
          customModelName: props.customModelName,
          durationValue: props.durationValue,
          injectMarketingPlanValue: props.injectMarketingPlanValue,
          additionalInstruction: props.additionalInstruction,
          onClose: props.onCloseCreate,
          onCreate: props.onCreate,
          onCalendarChange: props.onCalendarChange,
          onProductChange: props.onProductChange,
          onMaterialChange: props.onMaterialChange,
          onAccountRoleChange: props.onAccountRoleChange,
          onCustomTopicChange: props.onCustomTopicChange,
          onReferenceImageFileChange: props.onReferenceImageFileChange,
          onVideoKindChange: props.onVideoKindChange,
          onCopyAdditionalInstructionChange: props.onCopyAdditionalInstructionChange,
          onProviderChange: props.onProviderChange,
          onCustomProviderChange: props.onCustomProviderChange,
          onCustomModelNameChange: props.onCustomModelNameChange,
          onDurationChange: props.onDurationChange,
          onInjectMarketingPlanChange: props.onInjectMarketingPlanChange,
          onAdditionalInstructionChange: props.onAdditionalInstructionChange,
        }}
      />
    </article>
  );
}
