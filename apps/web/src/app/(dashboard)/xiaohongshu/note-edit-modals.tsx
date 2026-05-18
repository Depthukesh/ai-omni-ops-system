"use client";

import { type AsyncAction, type StringChangeHandler } from "./shared-types";
import { NoteTextEditModal, type NoteEditTaskStatus } from "./note-text-edit-modal";
import {
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
} from "../../../services/works";

export interface OriginalEditModalProps {
  item?: XiaohongshuOriginalWorkRecord;
  title: string;
  content: string;
  savingWorkId?: string;
  onClose: () => void;
  onSave: AsyncAction;
  onTitleChange: StringChangeHandler;
  onContentChange: StringChangeHandler;
  getTaskStatusClass: (status?: NoteEditTaskStatus) => string;
  getTaskStatusText: (status?: NoteEditTaskStatus) => string;
}

export function OriginalEditModal(props: OriginalEditModalProps) {
  if (!props.item) {
    return null;
  }

  return (
    <NoteTextEditModal
      open
      dialogTitle="编辑原创笔记"
      metaText={`${props.item.calendarLabel || props.item.customTopicName || "自定义选题"}${props.item.productName ? ` · 产品：${props.item.productName}` : ""}`}
      noteCategory={props.item.noteCategory}
      noteType={props.item.noteType}
      taskStatus={props.item.taskStatus}
      title={props.title}
      content={props.content}
      titlePlaceholder="请输入原创笔记标题"
      contentPlaceholder="请输入原创笔记正文"
      saving={props.savingWorkId === props.item.id}
      onClose={props.onClose}
      onSave={props.onSave}
      onTitleChange={props.onTitleChange}
      onContentChange={props.onContentChange}
      getTaskStatusClass={props.getTaskStatusClass}
      getTaskStatusText={props.getTaskStatusText}
    />
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
  getTaskStatusClass: (status?: NoteEditTaskStatus) => string;
  getTaskStatusText: (status?: NoteEditTaskStatus) => string;
}

export function RewriteEditModal(props: RewriteEditModalProps) {
  if (!props.item) {
    return null;
  }

  return (
    <NoteTextEditModal
      open
      dialogTitle="编辑二创笔记"
      metaText={`${props.item.sourceMaterialTitle}${props.item.productName ? ` · 产品：${props.item.productName}` : ""}`}
      noteCategory={props.item.noteCategory}
      noteType={props.item.noteType}
      taskStatus={props.item.taskStatus}
      title={props.title}
      content={props.content}
      titlePlaceholder="请输入二创笔记标题"
      contentPlaceholder="请输入二创笔记正文"
      saving={props.savingWorkId === props.item.id}
      onClose={props.onClose}
      onSave={props.onSave}
      onTitleChange={props.onTitleChange}
      onContentChange={props.onContentChange}
      getTaskStatusClass={props.getTaskStatusClass}
      getTaskStatusText={props.getTaskStatusText}
    />
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
  getTaskStatusClass: (status?: NoteEditTaskStatus) => string;
  getTaskStatusText: (status?: NoteEditTaskStatus) => string;
}

export function VideoEditModal(props: VideoEditModalProps) {
  if (!props.item) {
    return null;
  }

  return (
    <NoteTextEditModal
      open
      dialogTitle="编辑视频笔记"
      metaText={`${props.item.calendarLabel || props.item.customTopicName || "自定义选题"}${props.item.productName ? ` · 产品：${props.item.productName}` : ""}`}
      noteCategory={props.item.noteCategory}
      noteType={props.item.noteType}
      taskStatus={props.item.taskStatus}
      title={props.title}
      content={props.content}
      titlePlaceholder="请输入视频笔记标题"
      contentPlaceholder="请输入视频笔记正文"
      saving={props.savingWorkId === props.item.id}
      extraFields={
        <label className="report-editor-pane">
          <span>故事板提示词</span>
          <textarea
            className="report-markdown-textarea"
            value={props.storyboardPrompt}
            onChange={(event) => props.onStoryboardPromptChange(event.target.value)}
            placeholder="可选：调整故事板提示词"
          />
        </label>
      }
      onClose={props.onClose}
      onSave={props.onSave}
      onTitleChange={props.onTitleChange}
      onContentChange={props.onContentChange}
      getTaskStatusClass={props.getTaskStatusClass}
      getTaskStatusText={props.getTaskStatusText}
    />
  );
}
