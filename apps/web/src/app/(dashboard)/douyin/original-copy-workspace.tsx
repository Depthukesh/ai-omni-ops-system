"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DouyinOriginalCopyType,
  type DouyinOriginalCopyRecord,
  type DouyinOriginalCopyTaskRecord,
} from "../../../services/reports";
import { type OptionalDateFormatter, type SelectOption } from "../xiaohongshu/shared-types";
import { DouyinOriginalCopyCreateModal } from "./original-copy-create-modal";

const ORIGINAL_COPY_PAGE_SIZE = 20;
const EMPTY_CALENDAR_VALUE = "__none__";
const EMPTY_TOPIC_VALUE = "__none__";

const COPY_TYPE_OPTIONS: SelectOption[] = [
  { value: "VIEWPOINT", label: "聊观点" },
  { value: "STORY", label: "讲故事" },
  { value: "PROCESS", label: "晒过程" },
  { value: "KNOWLEDGE", label: "教知识" },
  { value: "PLOT_SALES", label: "剧情带货" },
  { value: "SEEDING", label: "种草类" },
  { value: "LOCAL_SALES", label: "同城带货" },
];

const MARKETING_PLAN_OPTIONS: SelectOption[] = [
  { value: "yes", label: "植入营销策划方案" },
  { value: "no", label: "不植入营销策划方案" },
];

export interface DouyinOriginalCopyWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  history: DouyinOriginalCopyRecord[];
  latestTask?: DouyinOriginalCopyTaskRecord;
  calendarOptions: Array<{ id: string; label: string }>;
  topicOptions: Array<{ id: string; label: string }>;
  hasMarketingPlan: boolean;
  marketingPlanTitle?: string;
  onRefresh: () => void | Promise<void>;
  onCreate: (payload: {
    calendarItemId?: string;
    topicId?: string;
    injectMarketingPlan: boolean;
    copyType: DouyinOriginalCopyType;
    userRequirement?: string;
  }) => Promise<boolean>;
  onUpdate: (payload: {
    reportId: string;
    title?: string;
    content: string;
  }) => Promise<boolean>;
  onDelete: (reportId: string) => Promise<boolean>;
  formatDateTime: OptionalDateFormatter;
}

function getTaskStatusClass(status?: DouyinOriginalCopyTaskRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getTaskStatusText(task?: DouyinOriginalCopyTaskRecord) {
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

export function DouyinOriginalCopyWorkspace(props: DouyinOriginalCopyWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [calendarValue, setCalendarValue] = useState(EMPTY_CALENDAR_VALUE);
  const [topicValue, setTopicValue] = useState(EMPTY_TOPIC_VALUE);
  const [injectMarketingPlanValue, setInjectMarketingPlanValue] = useState("yes");
  const [copyTypeValue, setCopyTypeValue] = useState<DouyinOriginalCopyType>("VIEWPOINT");
  const [userRequirementValue, setUserRequirementValue] = useState("");
  const [editingReportId, setEditingReportId] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const calendarSelectOptions = useMemo<SelectOption[]>(
    () => [{ value: EMPTY_CALENDAR_VALUE, label: "不选择营销日历" }, ...props.calendarOptions.map((item) => ({ value: item.id, label: item.label }))],
    [props.calendarOptions],
  );
  const topicSelectOptions = useMemo<SelectOption[]>(
    () => [{ value: EMPTY_TOPIC_VALUE, label: "不选择选题" }, ...props.topicOptions.map((item) => ({ value: item.id, label: item.label }))],
    [props.topicOptions],
  );
  const pageCount = Math.max(1, Math.ceil(props.history.length / ORIGINAL_COPY_PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * ORIGINAL_COPY_PAGE_SIZE;
    return props.history.slice(startIndex, startIndex + ORIGINAL_COPY_PAGE_SIZE);
  }, [page, props.history]);
  const editingItem = useMemo(
    () => props.history.find((item) => item.id === editingReportId),
    [editingReportId, props.history],
  );

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [props.history.length]);

  useEffect(() => {
    if (!topicValue && topicSelectOptions[0]?.value) {
      setTopicValue(topicSelectOptions[0].value);
    }
  }, [topicSelectOptions, topicValue]);

  useEffect(() => {
    if (editingReportId && !editingItem) {
      setEditingReportId("");
    }
  }, [editingItem, editingReportId]);

  async function handleCreate() {
    const success = await props.onCreate({
      calendarItemId: calendarValue !== EMPTY_CALENDAR_VALUE ? calendarValue : undefined,
      topicId: topicValue !== EMPTY_TOPIC_VALUE ? topicValue : undefined,
      injectMarketingPlan: injectMarketingPlanValue === "yes",
      copyType: copyTypeValue,
      userRequirement: userRequirementValue.trim() || undefined,
    });
    if (success) {
      setIsCreateOpen(false);
      setUserRequirementValue("");
    }
  }

  function handleOpenEditor(item: DouyinOriginalCopyRecord) {
    setEditingReportId(item.id);
    setEditTitle(item.title);
    setEditContent(item.content);
  }

  async function handleUpdate() {
    if (!editingReportId) {
      return;
    }
    const success = await props.onUpdate({
      reportId: editingReportId,
      title: editTitle.trim() || undefined,
      content: editContent,
    });
    if (success) {
      setEditingReportId("");
    }
  }

  async function handleDelete(item: DouyinOriginalCopyRecord) {
    const confirmed = window.confirm(`确认删除「${item.title}」吗？删除后无法恢复。`);
    if (!confirmed) {
      return;
    }
    await props.onDelete(item.id);
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{props.sectionLabel}</strong>
            <p className="panel-subtext">{props.sectionDescription}</p>
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading || props.isSubmitting}>
              刷新数据
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setIsCreateOpen(true)}
              disabled={!props.canEdit || props.isSubmitting}
            >
              添加原创笔记
            </button>
          </div>
        </div>

        <article className="light-data-panel report-editor-panel report-editor-panel--compact">
          <div className="report-editor-head">
            <div>
              <strong>抖音原创文案</strong>
              <p className="panel-subtext" style={{ margin: 0 }}>
                结合品牌营销日历、选题库和营销策划方案，按不同文案类型生成品牌独立存储的原创文案。
              </p>
            </div>
            <div className="report-editor-actions">
              <span className={`archive-pill ${props.history.length ? "status-ready" : "status-pending"}`}>共 {props.history.length} 条</span>
              <span className={`archive-pill ${props.canEdit ? "status-ready" : "status-pending"}`}>
                {props.canEdit ? "当前板块可编辑" : "当前板块只读"}
              </span>
              <span className={`archive-pill ${getTaskStatusClass(props.latestTask?.taskStatus)}`}>
                {getTaskStatusText(props.latestTask)}
              </span>
            </div>
          </div>

          {!props.topicOptions.length ? (
            <div className="report-inline-tip">当前品牌选题库还没有内容，你仍可选择“不选择选题”继续生成原创文案。</div>
          ) : null}

          {props.latestTask?.phaseText ? (
            <div className="report-inline-tip">
              {props.latestTask.phaseText}
              {props.latestTask.modelName ? ` | 模型：${props.latestTask.modelName}` : ""}
            </div>
          ) : null}

          {!props.history.length ? (
            <div className="note-empty-state">当前品牌还没有原创文案。点击右上角“添加原创笔记”后，可按不同文案类型生成并沉淀结果。</div>
          ) : (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
              {paginatedItems.map((item) => (
                <article key={item.id} className="entity-card personal-card" style={{ display: "grid", gap: 12 }}>
                  <div className="entity-card-head">
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong>{item.title}</strong>
                      <p className="personal-meta" style={{ margin: 0 }}>
                        创作时间：{props.formatDateTime(item.generatedAt)}
                      </p>
                    </div>
                    <div className="report-editor-actions">
                      <span className="archive-pill status-ready">{item.copyTypeLabel}</span>
                      <span className={`archive-pill ${item.injectMarketingPlan ? "status-ready" : "status-pending"}`}>
                        {item.injectMarketingPlan ? "已植入方案" : "未植入方案"}
                      </span>
                    </div>
                  </div>

                  <p className="panel-subtext" style={{ margin: 0 }}>
                    {item.summary || `${item.copyTypeLabel}原创文案`}
                  </p>

                  <div className="report-inline-tip">
                    选题：{item.topicContent || "不选择选题"}
                    {item.calendarItemLabel ? ` | 营销日历：${item.calendarItemLabel}` : ""}
                    {item.marketingPlanTitle ? ` | 策划方案：${item.marketingPlanTitle}` : ""}
                  </div>
                  <div className="strategy-inline-actions" style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleOpenEditor(item)}
                      disabled={props.isSubmitting}
                    >
                      查看/编辑
                    </button>
                    <button
                      type="button"
                      className="note-inline-button"
                      onClick={() => void handleDelete(item)}
                      disabled={!props.canEdit || props.isSubmitting}
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {props.history.length > ORIGINAL_COPY_PAGE_SIZE ? (
            <div className="note-pagination-bar hotspot-pagination-bar">
              <div className="note-pagination-summary">
                <span>第 {page} / {pageCount} 页</span>
                <span>当前显示 {paginatedItems.length} 条</span>
              </div>
              <div className="note-pagination-actions">
                <button
                  type="button"
                  className="note-inline-button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  上一页
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((currentPage) => (
                  <button
                    key={`douyin-original-copy-page-${currentPage}`}
                    type="button"
                    className={`note-page-button ${currentPage === page ? "is-active" : ""}`}
                    onClick={() => setPage(currentPage)}
                  >
                    {currentPage}
                  </button>
                ))}
                <button
                  type="button"
                  className="note-inline-button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page === pageCount}
                >
                  下一页
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </article>

      <DouyinOriginalCopyCreateModal
        open={isCreateOpen}
        isPublishing={props.isSubmitting}
        calendarOptions={calendarSelectOptions}
        topicOptions={topicSelectOptions}
        marketingPlanOptions={MARKETING_PLAN_OPTIONS}
        copyTypeOptions={COPY_TYPE_OPTIONS}
        calendarValue={calendarValue}
        topicValue={topicValue}
        injectMarketingPlanValue={injectMarketingPlanValue}
        copyTypeValue={copyTypeValue}
        userRequirementValue={userRequirementValue}
        hasMarketingPlan={props.hasMarketingPlan}
        marketingPlanTitle={props.marketingPlanTitle}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
        onCalendarChange={setCalendarValue}
        onTopicChange={setTopicValue}
        onInjectMarketingPlanChange={setInjectMarketingPlanValue}
        onCopyTypeChange={(value) => setCopyTypeValue(value as DouyinOriginalCopyType)}
        onUserRequirementChange={setUserRequirementValue}
      />

      {editingItem ? (
        <div className="media-preview-overlay" onClick={() => !props.isSubmitting && setEditingReportId("")}>
          <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="media-preview-close"
              onClick={() => setEditingReportId("")}
              disabled={props.isSubmitting}
            >
              关闭
            </button>
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>查看/编辑原创文案</strong>
                  <p className="personal-meta">可直接修改标题和文案；点击取消返回作品区页面。</p>
                </div>
                <div className="report-editor-actions">
                  <span className="archive-pill status-ready">{editingItem.copyTypeLabel}</span>
                  <span className="archive-pill status-pending">{props.formatDateTime(editingItem.generatedAt)}</span>
                </div>
              </div>
              <div className="personal-list">
                <label className="report-editor-pane">
                  <span>标题</span>
                  <input
                    className="report-title-input"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="请输入作品标题"
                    disabled={props.isSubmitting}
                  />
                </label>
                <label className="report-editor-pane">
                  <span>文案内容</span>
                  <textarea
                    className="report-content-textarea"
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    placeholder="请输入或修改原创文案内容"
                    disabled={props.isSubmitting}
                  />
                </label>
                <div className="strategy-inline-actions">
                  <button type="button" className="primary-button" onClick={() => void handleUpdate()} disabled={props.isSubmitting}>
                    {props.isSubmitting ? "修改中..." : "修改"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setEditingReportId("")}
                    disabled={props.isSubmitting}
                  >
                    取消
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </>
  );
}
