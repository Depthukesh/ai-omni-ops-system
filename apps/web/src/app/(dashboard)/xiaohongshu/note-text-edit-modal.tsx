"use client";

import { type ReactNode } from "react";
import { type AsyncAction, type StringChangeHandler } from "./shared-types";

export type NoteEditTaskStatus = "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" | undefined;

export interface NoteTextEditModalProps {
  open: boolean;
  dialogTitle: string;
  metaText: string;
  noteCategory: string;
  noteType: string;
  taskStatus?: NoteEditTaskStatus;
  title: string;
  content: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
  saving: boolean;
  extraFields?: ReactNode;
  onClose: () => void;
  onSave: AsyncAction;
  onTitleChange: StringChangeHandler;
  onContentChange: StringChangeHandler;
  getTaskStatusClass: (status?: NoteEditTaskStatus) => string;
  getTaskStatusText: (status?: NoteEditTaskStatus) => string;
}

export function NoteTextEditModal(props: NoteTextEditModalProps) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>{props.dialogTitle}</strong>
              <p className="personal-meta">{props.metaText}</p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">{props.noteCategory}</span>
              <span className="archive-pill status-pending">{props.noteType}</span>
              <span className={`archive-pill ${props.getTaskStatusClass(props.taskStatus)}`}>
                {props.getTaskStatusText(props.taskStatus)}
              </span>
            </div>
          </div>
          <div className="personal-list">
            <label className="report-editor-pane">
              <span>标题</span>
              <input
                className="report-title-input"
                value={props.title}
                onChange={(event) => props.onTitleChange(event.target.value)}
                placeholder={props.titlePlaceholder}
              />
            </label>
            <label className="report-editor-pane">
              <span>正文</span>
              <textarea
                className="report-content-textarea"
                value={props.content}
                onChange={(event) => props.onContentChange(event.target.value)}
                placeholder={props.contentPlaceholder}
              />
            </label>
            {props.extraFields}
            <div className="strategy-inline-actions">
              <button type="button" className="primary-button" onClick={() => void props.onSave()} disabled={props.saving}>
                {props.saving ? "保存中..." : "保存"}
              </button>
              <button type="button" className="secondary-button" onClick={props.onClose}>
                取消
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
