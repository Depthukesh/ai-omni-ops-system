"use client";

import { type TaskRecord } from "../../../services/personal-center";
import { type AsyncAction, type OptionalDateFormatter } from "./shared-types";

interface WorkspaceSectionHeaderProps {
  sectionLabel: string;
  sectionDescription: string;
  createLabel: string;
  refreshDisabled: boolean;
  createDisabled: boolean;
  onRefresh: AsyncAction;
  onOpenCreate: () => void;
}

export function WorkspaceSectionHeader(props: WorkspaceSectionHeaderProps) {
  return (
    <div className="strategy-card-toolbar">
      <div>
        <strong>{props.sectionLabel}</strong>
        <p className="panel-subtext">{props.sectionDescription}</p>
      </div>
      <div className="strategy-inline-actions">
        <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.refreshDisabled}>
          刷新列表
        </button>
        <button type="button" className="primary-button" onClick={props.onOpenCreate} disabled={props.createDisabled}>
          {props.createLabel}
        </button>
      </div>
    </div>
  );
}

interface ComposeTaskStatusPanelProps {
  title: string;
  description: string;
  taskCount: number;
  latestTask?: TaskRecord;
  taskStatusText: string;
  inlineError: string;
  isTaskActive: boolean;
  canCancelTask: boolean;
  isCancellingTask: boolean;
  showSubmittingState?: boolean;
  submittingText?: string;
  queuedText: string;
  runningText: string;
  cancelledText: string;
  getTaskStatusClass: (status?: TaskRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
  onCancelTask: AsyncAction;
}

export function ComposeTaskStatusPanel(props: ComposeTaskStatusPanelProps) {
  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact">
      <div className="report-editor-head">
        <div>
          <strong>{props.title}</strong>
          <p>{props.description}</p>
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
      {props.showSubmittingState && props.submittingText ? <div className="report-inline-tip">{props.submittingText}</div> : null}
      {props.isTaskActive ? (
        <div className="report-inline-tip">{props.latestTask?.taskStatus === "QUEUED" ? props.queuedText : props.runningText}</div>
      ) : null}
      {props.latestTask?.taskStatus === "CANCELLED" ? <div className="report-inline-tip">{props.cancelledText}</div> : null}
      {props.inlineError ? <div className="report-inline-tip report-inline-tip--error">{props.inlineError}</div> : null}
    </article>
  );
}

interface PublishTaskStatusPanelProps {
  title: string;
  description: string;
  noteCategory: "原创" | "二创";
  latestTask?: TaskRecord;
  getTaskStatusClass: (status?: TaskRecord["taskStatus"]) => string;
  getPublishTaskStatusText: (task?: TaskRecord) => string;
  getPublishTaskSummaryText: (task: TaskRecord, noteCategory: "原创" | "二创") => string;
  formatDateTime: OptionalDateFormatter;
}

export function PublishTaskStatusPanel(props: PublishTaskStatusPanelProps) {
  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact">
      <div className="report-editor-head">
        <div>
          <strong>{props.title}</strong>
          <p>{props.description}</p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${props.latestTask ? props.getTaskStatusClass(props.latestTask.taskStatus) : "status-in_progress"}`}>
            {props.latestTask ? props.getPublishTaskStatusText(props.latestTask) : "暂无发布任务"}
          </span>
          {props.latestTask?.updatedAt ? <span className="archive-pill status-pending">{props.formatDateTime(props.latestTask.updatedAt)}</span> : null}
        </div>
      </div>
      {props.latestTask ? <div className="report-inline-tip">{props.getPublishTaskSummaryText(props.latestTask, props.noteCategory)}</div> : null}
    </article>
  );
}
