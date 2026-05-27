"use client";

import { type DouyinHotTopicCandidatesRecord, type DouyinHotTopicCandidatesTaskRecord } from "../../../services/reports";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

export interface DouyinHotTopicCandidatesWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canEdit: boolean;
  availableDates: string[];
  selectedDate: string;
  latest?: DouyinHotTopicCandidatesRecord;
  latestTask?: DouyinHotTopicCandidatesTaskRecord;
  selectedTopicIds: string[];
  onRefresh: () => void | Promise<void>;
  onDateChange: (date: string) => void | Promise<void>;
  onGenerate: () => void | Promise<void>;
  onToggleTopic: (topicId: string, checked: boolean) => void;
  formatDateTime: OptionalDateFormatter;
}

function getTaskStatusClass(status?: DouyinHotTopicCandidatesTaskRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getTaskStatusText(task?: DouyinHotTopicCandidatesTaskRecord) {
  if (!task) {
    return "暂无任务";
  }
  if (task.taskStatus === "SUCCESS") {
    return "已完成";
  }
  if (task.taskStatus === "RUNNING") {
    return "生成中";
  }
  if (task.taskStatus === "QUEUED" || task.taskStatus === "PENDING") {
    return "排队中";
  }
  if (task.taskStatus === "FAILED") {
    return "失败";
  }
  if (task.taskStatus === "CANCELLED") {
    return "已取消";
  }
  return task.taskStatus;
}

export function DouyinHotTopicCandidatesWorkspace(props: DouyinHotTopicCandidatesWorkspaceProps) {
  const isTaskActive =
    props.latestTask?.taskStatus === "RUNNING"
    || props.latestTask?.taskStatus === "QUEUED"
    || props.latestTask?.taskStatus === "PENDING";

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
            刷新数据
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void props.onGenerate()}
            disabled={!props.canEdit || props.isLoading || !props.selectedDate || !props.availableDates.length || isTaskActive}
          >
            {isTaskActive ? "后台生成中..." : props.latest ? "重新生成" : "一键生成"}
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>{props.latest?.title || "热点找选题"}</strong>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.availableDates.length ? "status-ready" : "status-in_progress"}`}>
              {props.availableDates.length ? "已获取热点日期" : "等待每日热点"}
            </span>
            {props.latestTask ? (
              <span className={`archive-pill ${getTaskStatusClass(props.latestTask.taskStatus)}`}>{getTaskStatusText(props.latestTask)}</span>
            ) : null}
            {props.latest?.generatedAt ? (
              <span className="archive-pill status-ready">{props.formatDateTime(props.latest.generatedAt)}</span>
            ) : null}
            {props.latest?.modelName ? <span className="archive-pill status-pending">{props.latest.modelName}</span> : null}
          </div>
        </div>

        <div className="workspace-toolbar top-toolbar">
          <label className="workspace-status" style={{ gap: 8, alignItems: "center" }}>
            <span className="status-text">热点日期</span>
            <select
              value={props.selectedDate}
              onChange={(event) => void props.onDateChange(event.target.value)}
              disabled={props.isLoading || !props.availableDates.length}
            >
              {props.availableDates.length ? null : <option value="">暂无可选日期</option>}
              {props.availableDates.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!props.availableDates.length ? (
          <div className="note-empty-state">当前还没有可用热点日期。请先到品牌增长策略里的“每日热点”同步当天榜单。</div>
        ) : null}
        {props.availableDates.length && !props.selectedDate ? (
          <div className="report-inline-tip">请选择一个热点日期，再生成 3 个抖音热点选题。</div>
        ) : null}
        {isTaskActive ? (
          <div className="report-inline-tip">
            {props.latestTask?.phaseText
              ? `${props.latestTask.phaseText}${props.latestTask.phaseIndex && props.latestTask.phaseTotal ? `（${props.latestTask.phaseIndex}/${props.latestTask.phaseTotal}）` : ""}`
              : "正在后台生成热点选题，完成后会自动刷新结果。"}
          </div>
        ) : null}
        {!props.canEdit ? <div className="report-inline-tip">当前账号只有查看权限，不能重新生成热点选题。</div> : null}

        {props.latest?.summary ? (
          <div className="report-inline-tip">{props.latest.summary}</div>
        ) : null}

        {!props.latest?.items.length ? (
          <div className="note-empty-state">当前日期还没有生成结果，点击右上角“一键生成”开始。</div>
        ) : (
          <div className="xhs-material-library">
            <div className="xhs-material-card-grid">
              {props.latest.items.map((item, index) => {
                const checked = props.selectedTopicIds.includes(item.id);
                return (
                  <label key={item.id} className="light-data-panel" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => props.onToggleTopic(item.id, event.target.checked)}
                    />
                    <div style={{ display: "grid", gap: 8 }}>
                      <strong>{`选题 ${index + 1}`}</strong>
                      <div>{item.title}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </article>
  );
}
