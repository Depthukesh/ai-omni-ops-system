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
import { OriginalCreateModal, RewriteCreateModal, VideoCreateModal } from "./note-create-modals";
import { OriginalEditModal, RewriteEditModal, VideoEditModal } from "./note-edit-modals";
import {
  type AsyncAction,
  type OptionalDateFormatter,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import { ManagedImage } from "./managed-image";
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
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading || props.isPublishing || props.isTaskActive}>
            刷新列表
          </button>
          <button type="button" className="primary-button" onClick={props.onOpenCreate} disabled={props.isPublishing || props.isTaskActive}>
            添加原创笔记
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>原创笔记创作状态</strong>
            <p>点击“添加原创笔记”后，这里会展示最近一次原创笔记任务的状态，并在创作完成后自动刷新到最新结果。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.taskCount ? "status-ready" : "status-in_progress"}`}>
              {props.taskCount ? `累计 ${props.taskCount} 条任务` : "暂无任务"}
            </span>
            {props.latestTask ? (
              <span className={`archive-pill ${props.getTaskStatusClass(props.latestTask.taskStatus)}`}>{props.taskStatusText}</span>
            ) : null}
            {props.latestTask?.updatedAt ? (
              <span className="archive-pill status-pending">{props.formatDateTime(props.latestTask.updatedAt)}</span>
            ) : null}
            {props.canCancelTask ? (
              <button type="button" className="secondary-button" onClick={() => void props.onCancelTask()} disabled={props.isCancellingTask}>
                {props.isCancellingTask ? "取消中..." : "取消任务"}
              </button>
            ) : null}
          </div>
        </div>
        {props.isTaskActive ? (
          <div className="report-inline-tip">
            {props.latestTask?.taskStatus === "QUEUED"
              ? "原创笔记任务已提交，正在排队。"
              : `原创笔记正在生成中：${props.latestTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
          </div>
        ) : null}
        {props.latestTask?.taskStatus === "CANCELLED" ? (
          <div className="report-inline-tip">最近一次原创笔记任务已取消，本次创作流程已停止，你可以重新发起新的任务。</div>
        ) : null}
        {props.inlineError ? <div className="report-inline-tip report-inline-tip--error">{props.inlineError}</div> : null}
      </article>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>原创笔记发布状态</strong>
            <p>优先走电脑端一键发布到草稿箱；若当前电脑没装扩展，再使用手机扫码接力作为备用方案。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.latestPublishTask ? props.getTaskStatusClass(props.latestPublishTask.taskStatus) : "status-in_progress"}`}>
              {props.latestPublishTask ? props.getPublishTaskStatusText(props.latestPublishTask) : "暂无发布任务"}
            </span>
            {props.latestPublishTask?.updatedAt ? (
              <span className="archive-pill status-pending">{props.formatDateTime(props.latestPublishTask.updatedAt)}</span>
            ) : null}
          </div>
        </div>
        {props.latestPublishTask ? (
          <div className="report-inline-tip">{props.getPublishTaskSummaryText(props.latestPublishTask, "原创")}</div>
        ) : null}
      </article>

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

      <OriginalEditModal
        item={props.editingWork}
        title={props.editingTitle}
        content={props.editingContent}
        savingWorkId={props.savingWorkId}
        onClose={props.onCloseEdit}
        onSave={props.onSaveEdit}
        onTitleChange={props.onEditTitleChange}
        onContentChange={props.onEditContentChange}
        getTaskStatusClass={props.getOriginalTaskStatusClass}
        getTaskStatusText={props.getOriginalTaskStatusText}
      />

      <OriginalCreateModal
        open={props.isCreateModalOpen}
        isPublishing={props.isPublishing}
        calendarOptions={props.calendarOptions}
        customTopicOption={props.customTopicOption}
        noProductOption={props.noProductOption}
        autoImageCountOption={props.autoImageCountOption}
        products={props.products}
        calendarValue={props.calendarValue}
        customTopic={props.customTopic}
        productValue={props.productValue}
        accountRoleValue={props.accountRoleValue}
        accountRoleOptions={props.accountRoleOptions}
        imageCountValue={props.imageCountValue}
        injectMarketingPlanValue={props.injectMarketingPlanValue}
        additionalInstruction={props.additionalInstruction}
        coverReferenceFile={props.coverReferenceFile}
        galleryReferenceFiles={props.galleryReferenceFiles}
        referenceTemplateCategories={props.referenceTemplateCategories}
        referenceTemplateItems={props.referenceTemplateItems}
        isReferenceTemplatesLoading={props.isReferenceTemplatesLoading}
        referenceTemplatesError={props.referenceTemplatesError}
        onClose={props.onCloseCreate}
        onCreate={props.onCreate}
        onCalendarChange={props.onCalendarChange}
        onCustomTopicChange={props.onCustomTopicChange}
        onProductChange={props.onProductChange}
        onAccountRoleChange={props.onAccountRoleChange}
        onImageCountChange={props.onImageCountChange}
        onInjectMarketingPlanChange={props.onInjectMarketingPlanChange}
        onAdditionalInstructionChange={props.onAdditionalInstructionChange}
        onCoverReferenceFileChange={props.onCoverReferenceFileChange}
        onGalleryReferenceFilesChange={props.onGalleryReferenceFilesChange}
        onReloadReferenceTemplates={props.onReloadReferenceTemplates}
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
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void props.onRefresh()}
            disabled={props.isLoading || props.isPublishing || props.isTaskActive}
          >
            刷新列表
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={props.onOpenCreate}
            disabled={props.isPublishing || props.isTaskActive || !props.materialNotes.length}
          >
            添加二创笔记
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>二创笔记创作状态</strong>
            <p>点击“添加二创笔记”后，这里会展示最近一次二创任务的状态，并在创作完成后自动刷新到最新结果。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.taskCount ? "status-ready" : "status-in_progress"}`}>
              {props.taskCount ? `累计 ${props.taskCount} 条任务` : "暂无任务"}
            </span>
            {props.showSubmittingState ? <span className="archive-pill status-in_progress">创作中</span> : null}
            {props.latestTask ? (
              <span className={`archive-pill ${props.getTaskStatusClass(props.latestTask.taskStatus)}`}>{props.taskStatusText}</span>
            ) : null}
            {props.latestTask?.updatedAt ? (
              <span className="archive-pill status-pending">{props.formatDateTime(props.latestTask.updatedAt)}</span>
            ) : null}
            {props.canCancelTask ? (
              <button type="button" className="secondary-button" onClick={() => void props.onCancelTask()} disabled={props.isCancellingTask}>
                {props.isCancellingTask ? "取消中..." : "取消任务"}
              </button>
            ) : null}
          </div>
        </div>
        {props.showSubmittingState ? (
          <div className="report-inline-tip">{`二创笔记已提交，正在生成中：${props.submittingLabel || "本次二创笔记"}，请稍候。`}</div>
        ) : null}
        {props.isTaskActive ? (
          <div className="report-inline-tip">
            {props.latestTask?.taskStatus === "QUEUED"
              ? "二创笔记任务已提交，正在排队。"
              : `二创笔记正在生成中：${props.latestTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
          </div>
        ) : null}
        {props.latestTask?.taskStatus === "CANCELLED" ? (
          <div className="report-inline-tip">最近一次二创笔记任务已取消，本次创作流程已停止，你可以重新发起新的任务。</div>
        ) : null}
        {props.inlineError ? <div className="report-inline-tip report-inline-tip--error">{props.inlineError}</div> : null}
      </article>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>二创笔记发布状态</strong>
            <p>优先走电脑端一键发布到草稿箱；若当前电脑没装扩展，再使用手机扫码接力作为备用方案。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.latestPublishTask ? props.getTaskStatusClass(props.latestPublishTask.taskStatus) : "status-in_progress"}`}>
              {props.latestPublishTask ? props.getPublishTaskStatusText(props.latestPublishTask) : "暂无发布任务"}
            </span>
            {props.latestPublishTask?.updatedAt ? (
              <span className="archive-pill status-pending">{props.formatDateTime(props.latestPublishTask.updatedAt)}</span>
            ) : null}
          </div>
        </div>
        {props.latestPublishTask ? (
          <div className="report-inline-tip">{props.getPublishTaskSummaryText(props.latestPublishTask, "二创")}</div>
        ) : null}
      </article>

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

      <RewriteEditModal
        item={props.editingWork}
        title={props.editingTitle}
        content={props.editingContent}
        savingWorkId={props.savingWorkId}
        onClose={props.onCloseEdit}
        onSave={props.onSaveEdit}
        onTitleChange={props.onEditTitleChange}
        onContentChange={props.onEditContentChange}
        getTaskStatusClass={props.getOriginalTaskStatusClass}
        getTaskStatusText={props.getOriginalTaskStatusText}
      />

      <RewriteCreateModal
        open={props.isCreateModalOpen}
        isPublishing={props.isPublishing}
        noProductOption={props.noProductOption}
        materials={props.materialNotes}
        products={props.products}
        materialValue={props.materialValue}
        productValue={props.productValue}
        accountRoleValue={props.accountRoleValue}
        accountRoleOptions={props.accountRoleOptions}
        injectMarketingPlanValue={props.injectMarketingPlanValue}
        additionalInstruction={props.additionalInstruction}
        onClose={props.onCloseCreate}
        onCreate={props.onCreate}
        onMaterialChange={props.onMaterialChange}
        onProductChange={props.onProductChange}
        onAccountRoleChange={props.onAccountRoleChange}
        onInjectMarketingPlanChange={props.onInjectMarketingPlanChange}
        onAdditionalInstructionChange={props.onAdditionalInstructionChange}
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

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading || props.isPublishing || props.isTaskActive}>
            刷新列表
          </button>
          <button type="button" className="primary-button" onClick={props.onOpenCreate} disabled={props.isPublishing || props.isTaskActive}>
            添加视频笔记
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>视频笔记创作状态</strong>
            <p>点击“添加视频笔记”后，这里会展示最近一次视频任务的状态，并在创作完成后自动刷新到最新结果。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.taskCount ? "status-ready" : "status-in_progress"}`}>
              {props.taskCount ? `累计 ${props.taskCount} 条任务` : "暂无任务"}
            </span>
            {props.showSubmittingState ? <span className="archive-pill status-in_progress">创作中</span> : null}
            {props.latestTask ? (
              <span className={`archive-pill ${props.getTaskStatusClass(props.latestTask.taskStatus)}`}>{props.taskStatusText}</span>
            ) : null}
            {props.latestTask?.updatedAt ? (
              <span className="archive-pill status-pending">{props.formatDateTime(props.latestTask.updatedAt)}</span>
            ) : null}
            {props.canCancelTask ? (
              <button type="button" className="secondary-button" onClick={() => void props.onCancelTask()} disabled={props.isCancellingTask}>
                {props.isCancellingTask ? "取消中..." : "取消任务"}
              </button>
            ) : null}
          </div>
        </div>
        {props.showSubmittingState ? (
          <div className="report-inline-tip">{`视频笔记已提交，正在生成中：${props.submittingLabel || "本次视频笔记"}，请稍候。`}</div>
        ) : null}
        {props.isTaskActive ? (
          <div className="report-inline-tip">
            {props.latestTask?.taskStatus === "QUEUED"
              ? "视频笔记任务已提交，正在排队。"
              : `视频笔记正在生成中：${props.latestTask?.taskTitle || "正在创作"}，请稍候刷新查看结果。`}
          </div>
        ) : null}
        {props.latestTask?.taskStatus === "CANCELLED" ? (
          <div className="report-inline-tip">最近一次视频笔记任务已取消，本次创作流程已停止，你可以重新发起新的任务。</div>
        ) : null}
        {props.inlineError ? <div className="report-inline-tip report-inline-tip--error">{props.inlineError}</div> : null}
      </article>

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
            <article className="light-data-panel report-editor-panel" style={{ marginTop: 20 }}>
              <div className="report-editor-head">
                <div>
                  <strong>{selectedItem.title}</strong>
                  <p>
                    {getVideoKindLabel(selectedItem.videoKind)}
                    {" · "}
                    {selectedItem.calendarLabel || selectedItem.customTopicName || "自定义选题"}
                    {selectedItem.productName ? ` · 产品：${selectedItem.productName}` : ""}
                  </p>
                </div>
                <div className="report-editor-actions">
                  <span className={`archive-pill ${props.getOriginalTaskStatusClass(selectedItem.taskStatus)}`}>
                    {props.getOriginalTaskStatusText(selectedItem.taskStatus)}
                  </span>
                  <span className={`archive-pill ${getVideoStageClassName(selectedItem.workflowStage)}`}>
                    {getVideoStageLabel(selectedItem.workflowStage)}
                  </span>
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
                  <span>创意剧本</span>
                  <textarea
                    className="report-content-textarea"
                    value={selectedItem.creativeScript || "当前阶段还没有创意剧本。"}
                    readOnly
                  />
                </div>
                <div className="report-editor-pane field-full">
                  <span>故事板提示词</span>
                  <textarea
                    className="report-markdown-textarea composer-form-textarea"
                    value={props.editingStoryboardPrompt}
                    onChange={(event) => props.onEditStoryboardPromptChange(event.target.value)}
                    placeholder="故事板生成完成后，这里会出现可编辑的故事板提示词。"
                    disabled={!selectedItem.storyboardPrompt && !selectedItem.storyboardImageUrl}
                  />
                  <p className="panel-subtext">第 2 阶段完成后，可在这里改提示词并重新生成故事板图片。</p>
                </div>
                <div className="report-editor-pane">
                  <span>故事板图片</span>
                  {selectedItem.storyboardImageUrl ? (
                    <ManagedImage
                      src={selectedItem.storyboardImageUrl}
                      alt={`${selectedItem.title} 故事板`}
                      loadingMode="eager"
                      style={{ width: "100%", borderRadius: 20, border: "1px solid #dfe5f2" }}
                    />
                  ) : (
                    <div className="empty-state">当前阶段还没有故事板图片。</div>
                  )}
                </div>
                <div className="report-editor-pane">
                  <span>最终短视频</span>
                  {selectedItem.videoUrl ? (
                    <video
                      controls
                      preload="metadata"
                      src={selectedItem.videoUrl}
                      style={{ width: "100%", borderRadius: 20, background: "#0f1525" }}
                    />
                  ) : (
                    <div className="empty-state">第 3 阶段完成后，这里会显示最终短视频。</div>
                  )}
                </div>
              </div>

              {selectedItem.storyboardRevisions.length ? (
                <div className="report-editor-pane field-full" style={{ marginTop: 16 }}>
                  <span>故事板修改记录</span>
                  <div className="personal-list">
                    {selectedItem.storyboardRevisions
                      .slice()
                      .reverse()
                      .map((revision) => (
                        <div key={`${revision.taskId}-${revision.createdAt}`} className="entity-card personal-card">
                          <strong>{props.formatDateTime(revision.createdAt)}</strong>
                          <p className="personal-meta">故事板重生成记录</p>
                          <p>{revision.prompt}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void props.onRegenerateStoryboard()}
                  disabled={!canRegenerateStoryboard || props.savingWorkId === selectedItem.id}
                >
                  {props.savingWorkId === selectedItem.id && selectedItem.workflowStage === "GENERATING_STORYBOARD" ? "修改中..." : "修改"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void props.onGenerateVideo()}
                  disabled={!canGenerateVideo || props.savingWorkId === selectedItem.id}
                >
                  {selectedItem.videoUrl ? "重新生成短视频" : "生成短视频"}
                </button>
                <button type="button" className="secondary-button" onClick={() => props.onPreview(selectedItem)}>
                  预览媒体
                </button>
              </div>
            </article>
          ) : null}
        </>
      )}

      <VideoEditModal
        item={props.editingWork}
        title={props.editingTitle}
        content={props.editingContent}
        storyboardPrompt={props.editingStoryboardPrompt}
        savingWorkId={props.savingWorkId}
        onClose={props.onCloseEdit}
        onSave={props.onSaveEdit}
        onTitleChange={props.onEditTitleChange}
        onContentChange={props.onEditContentChange}
        onStoryboardPromptChange={props.onEditStoryboardPromptChange}
        getTaskStatusClass={props.getOriginalTaskStatusClass}
        getTaskStatusText={props.getOriginalTaskStatusText}
      />

      <VideoCreateModal
        open={props.isCreateModalOpen}
        isPublishing={props.isPublishing}
        calendarOptions={props.calendarOptions}
        customTopicOption={props.customTopicOption}
        noProductOption={props.noProductOption}
        customVideoProviderOption={props.customVideoProviderOption}
        videoProviderOptions={props.videoProviderOptions}
        products={props.products}
        materialNotes={props.materialNotes}
        calendarValue={props.calendarValue}
        customTopic={props.customTopic}
        productValue={props.productValue}
        materialValue={props.materialValue}
        accountRoleValue={props.accountRoleValue}
        accountRoleOptions={props.accountRoleOptions}
        referenceImageFile={props.referenceImageFile}
        videoKindValue={props.videoKindValue}
        copyAdditionalInstruction={props.copyAdditionalInstruction}
        providerValue={props.providerValue}
        customProviderValue={props.customProviderValue}
        customModelName={props.customModelName}
        durationValue={props.durationValue}
        injectMarketingPlanValue={props.injectMarketingPlanValue}
        additionalInstruction={props.additionalInstruction}
        onClose={props.onCloseCreate}
        onCreate={props.onCreate}
        onCalendarChange={props.onCalendarChange}
        onProductChange={props.onProductChange}
        onMaterialChange={props.onMaterialChange}
        onAccountRoleChange={props.onAccountRoleChange}
        onCustomTopicChange={props.onCustomTopicChange}
        onReferenceImageFileChange={props.onReferenceImageFileChange}
        onVideoKindChange={props.onVideoKindChange}
        onCopyAdditionalInstructionChange={props.onCopyAdditionalInstructionChange}
        onProviderChange={props.onProviderChange}
        onCustomProviderChange={props.onCustomProviderChange}
        onCustomModelNameChange={props.onCustomModelNameChange}
        onDurationChange={props.onDurationChange}
        onInjectMarketingPlanChange={props.onInjectMarketingPlanChange}
        onAdditionalInstructionChange={props.onAdditionalInstructionChange}
      />
    </article>
  );
}

function getVideoKindLabel(kind?: XiaohongshuVideoWorkRecord["videoKind"]) {
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
      return "视频笔记";
  }
}

function getVideoStageLabel(stage?: XiaohongshuVideoWorkRecord["workflowStage"]) {
  switch (stage) {
    case "QUEUED":
      return "已提交";
    case "GENERATING_SCRIPT":
      return "第 1 阶段：生成创意剧本";
    case "GENERATING_STORYBOARD":
      return "第 2 阶段：生成故事板";
    case "WAITING_VIDEO":
      return "等待生成短视频";
    case "GENERATING_VIDEO":
      return "第 3 阶段：生成短视频";
    case "SUCCESS":
      return "短视频已完成";
    case "FAILED":
      return "生成失败";
    default:
      return "处理中";
  }
}

function getVideoStageClassName(stage?: XiaohongshuVideoWorkRecord["workflowStage"]) {
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
