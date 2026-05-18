"use client";

import { type XiaohongshuVideoWorkRecord } from "../../../services/works";
import { type OptionalDateFormatter } from "./shared-types";

export interface VideoWorkspaceDetailPanelProps {
  selectedItem: XiaohongshuVideoWorkRecord;
  editingStoryboardPrompt: string;
  savingWorkId?: string;
  canRegenerateStoryboard: boolean;
  canGenerateVideo: boolean;
  onEditStoryboardPromptChange: (value: string) => void;
  onRegenerateStoryboard: () => void | Promise<void>;
  onGenerateVideo: () => void | Promise<void>;
  onPreview: (item: XiaohongshuVideoWorkRecord) => void;
  getOriginalTaskStatusClass: (status?: XiaohongshuVideoWorkRecord["taskStatus"]) => string;
  getOriginalTaskStatusText: (status?: XiaohongshuVideoWorkRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
}

export function VideoWorkspaceDetailPanel(props: VideoWorkspaceDetailPanelProps) {
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
          <textarea className="report-content-textarea" value={selectedItem.creativeScript || "当前阶段还没有创意剧本。"} readOnly />
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
            <img
              src={selectedItem.storyboardImageUrl}
              alt={`${selectedItem.title} 故事板`}
              style={{ width: "100%", borderRadius: 20, border: "1px solid #dfe5f2" }}
            />
          ) : (
            <div className="empty-state">当前阶段还没有故事板图片。</div>
          )}
        </div>
        <div className="report-editor-pane">
          <span>最终短视频</span>
          {selectedItem.videoUrl ? (
            <video controls preload="metadata" src={selectedItem.videoUrl} style={{ width: "100%", borderRadius: 20, background: "#0f1525" }} />
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
          disabled={!props.canRegenerateStoryboard || props.savingWorkId === selectedItem.id}
        >
          {props.savingWorkId === selectedItem.id && selectedItem.workflowStage === "GENERATING_STORYBOARD" ? "修改中..." : "修改"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void props.onGenerateVideo()}
          disabled={!props.canGenerateVideo || props.savingWorkId === selectedItem.id}
        >
          {selectedItem.videoUrl ? "重新生成短视频" : "生成短视频"}
        </button>
        <button type="button" className="secondary-button" onClick={() => props.onPreview(selectedItem)}>
          预览媒体
        </button>
      </div>
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
