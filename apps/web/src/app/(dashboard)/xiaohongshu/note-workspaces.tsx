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
  deletingWorkId?: string;
  editingWork?: XiaohongshuVideoWorkRecord;
  editingTitle: string;
  editingContent: string;
  editingVideoPrompt: string;
  savingWorkId?: string;
  isCreateModalOpen: boolean;
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  customVideoProviderOption: string;
  customVideoDurationOption: string;
  videoProviderOptions: VideoProviderOptionRecord[];
  products: ProductOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  referenceImageFile: File | null;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  durationValue: string;
  customDurationValue: string;
  injectMarketingPlanValue: string;
  outputPromptValue: string;
  additionalInstruction: string;
  onRefresh: AsyncAction;
  onCancelTask: AsyncAction;
  onOpenCreate: () => void;
  onPreview: (item: XiaohongshuVideoWorkRecord) => void;
  onEdit: (item: XiaohongshuVideoWorkRecord) => void;
  onDelete: (workId: string) => ReturnType<AsyncAction>;
  onCloseEdit: () => void;
  onSaveEdit: AsyncAction;
  onEditTitleChange: StringChangeHandler;
  onEditContentChange: StringChangeHandler;
  onEditVideoPromptChange: StringChangeHandler;
  onCloseCreate: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onReferenceImageFileChange: (file: File | null) => void;
  onCopyAdditionalInstructionChange: StringChangeHandler;
  onProviderChange: StringChangeHandler;
  onCustomProviderChange: StringChangeHandler;
  onCustomModelNameChange: StringChangeHandler;
  onDurationChange: StringChangeHandler;
  onCustomDurationChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onOutputPromptChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  getTaskStatusClass: (status?: TaskRecord["taskStatus"]) => string;
  getOriginalTaskStatusClass: (status?: XiaohongshuVideoWorkRecord["taskStatus"]) => string;
  getOriginalTaskStatusText: (status?: XiaohongshuVideoWorkRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
}

export function VideoWorkspace(props: VideoWorkspaceProps) {
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
        <VideoWorkCardGrid
          items={props.items}
          onPreview={props.onPreview}
          onEdit={props.onEdit}
          onDelete={(workId) => void props.onDelete(workId)}
          deletingWorkId={props.deletingWorkId}
          formatDateTime={props.formatDateTime}
        />
      )}

      <VideoEditModal
        item={props.editingWork}
        title={props.editingTitle}
        content={props.editingContent}
        videoPrompt={props.editingVideoPrompt}
        savingWorkId={props.savingWorkId}
        onClose={props.onCloseEdit}
        onSave={props.onSaveEdit}
        onTitleChange={props.onEditTitleChange}
        onContentChange={props.onEditContentChange}
        onVideoPromptChange={props.onEditVideoPromptChange}
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
        customVideoDurationOption={props.customVideoDurationOption}
        videoProviderOptions={props.videoProviderOptions}
        products={props.products}
        calendarValue={props.calendarValue}
        customTopic={props.customTopic}
        productValue={props.productValue}
        accountRoleValue={props.accountRoleValue}
        accountRoleOptions={props.accountRoleOptions}
        referenceImageFile={props.referenceImageFile}
        copyAdditionalInstruction={props.copyAdditionalInstruction}
        providerValue={props.providerValue}
        customProviderValue={props.customProviderValue}
        customModelName={props.customModelName}
        durationValue={props.durationValue}
        customDurationValue={props.customDurationValue}
        injectMarketingPlanValue={props.injectMarketingPlanValue}
        outputPromptValue={props.outputPromptValue}
        additionalInstruction={props.additionalInstruction}
        onClose={props.onCloseCreate}
        onCreate={props.onCreate}
        onCalendarChange={props.onCalendarChange}
        onProductChange={props.onProductChange}
        onAccountRoleChange={props.onAccountRoleChange}
        onCustomTopicChange={props.onCustomTopicChange}
        onReferenceImageFileChange={props.onReferenceImageFileChange}
        onCopyAdditionalInstructionChange={props.onCopyAdditionalInstructionChange}
        onProviderChange={props.onProviderChange}
        onCustomProviderChange={props.onCustomProviderChange}
        onCustomModelNameChange={props.onCustomModelNameChange}
        onDurationChange={props.onDurationChange}
        onCustomDurationChange={props.onCustomDurationChange}
        onInjectMarketingPlanChange={props.onInjectMarketingPlanChange}
        onOutputPromptChange={props.onOutputPromptChange}
        onAdditionalInstructionChange={props.onAdditionalInstructionChange}
      />
    </article>
  );
}
