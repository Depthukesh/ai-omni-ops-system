"use client";

import { type ReactNode } from "react";
import { type NoteCreateModalCopy } from "./note-create-modal-copy";
import { type AsyncAction } from "./shared-types";

export interface NoteCreateModalShellProps {
  open: boolean;
  copy: NoteCreateModalCopy;
  isPublishing: boolean;
  createDisabled?: boolean;
  createLabel?: string;
  children: ReactNode;
  onClose: () => void;
  onCreate: AsyncAction;
}

export function NoteCreateModalShell(props: NoteCreateModalShellProps) {
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
              <strong>{props.copy.title}</strong>
              <p className="personal-meta">{props.copy.metaText}</p>
            </div>
          </div>
          <div className="personal-grid">{props.children}</div>
          <div className="strategy-inline-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void props.onCreate()}
              disabled={props.isPublishing || props.createDisabled}
            >
              {props.isPublishing ? "提交中..." : props.createLabel || "一键创作"}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClose} disabled={props.isPublishing}>
              取消
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
