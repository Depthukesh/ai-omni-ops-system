"use client";

import { useMemo } from "react";
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
  isSavingTopicLibrary: boolean;
  onRefresh: () => void | Promise<void>;
  onDateChange: (date: string) => void | Promise<void>;
  onGenerate: () => void | Promise<void>;
  onToggleTopic: (topicId: string, checked: boolean) => void;
  onAddSelectedTopics: () => void | Promise<void>;
  onOpenTopicLibrary: () => void;
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
  const canAddSelectedTopics = useMemo(
    () => Boolean(props.selectedTopicIds.length && props.latest?.items?.length),
    [props.latest?.items?.length, props.selectedTopicIds.length],
  );

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
          <div className="xhs-material-library" style={{ display: "grid", gap: 16 }}>
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
            {props.latest.reportContent ? (
              <section className="light-data-panel" style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>完整分析报告</strong>
                  <p className="panel-subtext" style={{ margin: 0 }}>
                    这里展示第一阶段按提示词生成的完整分析结果，便于和下方页面提取的 3 个选题一起查看。
                  </p>
                </div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.8,
                    color: "var(--text-primary, #1f2937)",
                    fontSize: 14,
                  }}
                >
                  {props.latest.reportContent}
                </div>
              </section>
            ) : null}

            <section className="light-data-panel" style={{ display: "grid", gap: 16 }}>
              <div className="strategy-card-toolbar" style={{ padding: 0 }}>
                <div>
                  <strong>选题库</strong>
                  <p className="panel-subtext" style={{ margin: 0 }}>
                    当前品牌独立存储的抖音选题库，可把上方勾选选题加入库中，也可手动补充。
                  </p>
                </div>
                <div className="strategy-inline-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void props.onAddSelectedTopics()}
                    disabled={!props.canEdit || props.isSavingTopicLibrary || !canAddSelectedTopics}
                  >
                    加入选题库
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={props.onOpenTopicLibrary}
                  >
                    查看选题库
                  </button>
                </div>
              </div>
              <div className="note-empty-state">选题库已拆到独立页面。可先勾选上方生成结果加入选题库，再点击“查看选题库”统一查看和手动维护。</div>
            </section>
          </div>
        )}
      </article>
    </article>
  );
}
