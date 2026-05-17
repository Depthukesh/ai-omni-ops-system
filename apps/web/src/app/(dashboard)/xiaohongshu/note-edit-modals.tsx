"use client";

import { type AsyncAction, type StringChangeHandler } from "./shared-types";
import {
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
} from "../../../services/works";

type TaskStatus = "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" | undefined;

export interface OriginalEditModalProps {
  item?: XiaohongshuOriginalWorkRecord;
  title: string;
  content: string;
  savingWorkId?: string;
  onClose: () => void;
  onSave: AsyncAction;
  onTitleChange: StringChangeHandler;
  onContentChange: StringChangeHandler;
  getTaskStatusClass: (status?: TaskStatus) => string;
  getTaskStatusText: (status?: TaskStatus) => string;
}

export function OriginalEditModal(props: OriginalEditModalProps) {
  if (!props.item) {
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
              <strong>编辑原创笔记</strong>
              <p className="personal-meta">
                {props.item.calendarLabel || props.item.customTopicName || "自定义选题"}
                {props.item.productName ? ` · 产品：${props.item.productName}` : ""}
              </p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">{props.item.noteCategory}</span>
              <span className="archive-pill status-pending">{props.item.noteType}</span>
              <span className={`archive-pill ${props.getTaskStatusClass(props.item.taskStatus)}`}>
                {props.getTaskStatusText(props.item.taskStatus)}
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
                placeholder="请输入原创笔记标题"
              />
            </label>
            <label className="report-editor-pane">
              <span>正文</span>
              <textarea
                className="report-content-textarea"
                value={props.content}
                onChange={(event) => props.onContentChange(event.target.value)}
                placeholder="请输入原创笔记正文"
              />
            </label>
            <div className="strategy-inline-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void props.onSave()}
                disabled={props.savingWorkId === props.item.id}
              >
                {props.savingWorkId === props.item.id ? "保存中..." : "保存"}
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

export interface RewriteEditModalProps {
  item?: XiaohongshuRewriteWorkRecord;
  title: string;
  content: string;
  savingWorkId?: string;
  onClose: () => void;
  onSave: AsyncAction;
  onTitleChange: StringChangeHandler;
  onContentChange: StringChangeHandler;
  getTaskStatusClass: (status?: TaskStatus) => string;
  getTaskStatusText: (status?: TaskStatus) => string;
}

export function RewriteEditModal(props: RewriteEditModalProps) {
  if (!props.item) {
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
              <strong>编辑二创笔记</strong>
              <p className="personal-meta">
                {props.item.sourceMaterialTitle}
                {props.item.productName ? ` · 产品：${props.item.productName}` : ""}
              </p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">{props.item.noteCategory}</span>
              <span className="archive-pill status-pending">{props.item.noteType}</span>
              <span className={`archive-pill ${props.getTaskStatusClass(props.item.taskStatus)}`}>
                {props.getTaskStatusText(props.item.taskStatus)}
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
                placeholder="请输入二创笔记标题"
              />
            </label>
            <label className="report-editor-pane">
              <span>正文</span>
              <textarea
                className="report-content-textarea"
                value={props.content}
                onChange={(event) => props.onContentChange(event.target.value)}
                placeholder="请输入二创笔记正文"
              />
            </label>
            <div className="strategy-inline-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void props.onSave()}
                disabled={props.savingWorkId === props.item.id}
              >
                {props.savingWorkId === props.item.id ? "保存中..." : "保存"}
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

export interface VideoEditModalProps {
  item?: XiaohongshuVideoWorkRecord;
  title: string;
  content: string;
  storyboardPrompt: string;
  savingWorkId?: string;
  onClose: () => void;
  onSave: AsyncAction;
  onTitleChange: StringChangeHandler;
  onContentChange: StringChangeHandler;
  onStoryboardPromptChange: StringChangeHandler;
  getTaskStatusClass: (status?: TaskStatus) => string;
  getTaskStatusText: (status?: TaskStatus) => string;
}

export function VideoEditModal(props: VideoEditModalProps) {
  if (!props.item) {
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
              <strong>编辑视频笔记</strong>
              <p className="personal-meta">
                {props.item.calendarLabel || props.item.customTopicName || "自定义选题"}
                {props.item.productName ? ` · 产品：${props.item.productName}` : ""}
              </p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">{props.item.noteCategory}</span>
              <span className="archive-pill status-pending">{props.item.noteType}</span>
              <span className={`archive-pill ${props.getTaskStatusClass(props.item.taskStatus)}`}>
                {props.getTaskStatusText(props.item.taskStatus)}
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
                placeholder="请输入视频笔记标题"
              />
            </label>
            <label className="report-editor-pane">
              <span>正文</span>
              <textarea
                className="report-content-textarea"
                value={props.content}
                onChange={(event) => props.onContentChange(event.target.value)}
                placeholder="请输入视频笔记正文"
              />
            </label>
            <label className="report-editor-pane">
              <span>故事板提示词</span>
              <textarea
                className="report-markdown-textarea"
                value={props.storyboardPrompt}
                onChange={(event) => props.onStoryboardPromptChange(event.target.value)}
                placeholder="可选：调整故事板提示词"
              />
            </label>
            <div className="strategy-inline-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void props.onSave()}
                disabled={props.savingWorkId === props.item.id}
              >
                {props.savingWorkId === props.item.id ? "保存中..." : "保存"}
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
