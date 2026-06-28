"use client";

import { useEffect, useMemo, useState } from "react";
import { type DouyinHotTopicCandidatesRecord, type DouyinHotTopicCandidatesTaskRecord, type DouyinTopicLibraryItem } from "../../../services/reports";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

const TOPIC_LIBRARY_PAGE_SIZE = 20;

export interface DouyinTopicLibraryWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canEdit: boolean;
  items: DouyinTopicLibraryItem[];
  isSaving: boolean;
  onRefresh: () => void | Promise<void>;
  onAddManualTopic: (payload: { topicContent: string; topicDescription: string }) => void | Promise<void>;
  onDeleteTopic: (topicId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
  hotTopicProps?: {
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
  };
}

function getHotTopicTaskStatusClass(status?: DouyinHotTopicCandidatesTaskRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getHotTopicTaskStatusText(task?: DouyinHotTopicCandidatesTaskRecord) {
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

export function DouyinTopicLibraryWorkspace(props: DouyinTopicLibraryWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [manualTopicContent, setManualTopicContent] = useState("");
  const [manualTopicDescription, setManualTopicDescription] = useState("");
  const [isHotTopicExpanded, setIsHotTopicExpanded] = useState(true);

  const hotProps = props.hotTopicProps;
  const isHotTopicTaskActive =
    hotProps?.latestTask?.taskStatus === "RUNNING"
    || hotProps?.latestTask?.taskStatus === "QUEUED"
    || hotProps?.latestTask?.taskStatus === "PENDING";
  const canAddSelectedTopics = useMemo(
    () => Boolean(hotProps?.selectedTopicIds.length && hotProps?.latest?.items?.length),
    [hotProps?.selectedTopicIds.length, hotProps?.latest?.items?.length],
  );

  const pageCount = Math.max(1, Math.ceil(props.items.length / TOPIC_LIBRARY_PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * TOPIC_LIBRARY_PAGE_SIZE;
    return props.items.slice(startIndex, startIndex + TOPIC_LIBRARY_PAGE_SIZE);
  }, [page, props.items]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [props.items.length]);

  async function handleManualSubmit() {
    const topicContent = manualTopicContent.trim();
    const topicDescription = manualTopicDescription.trim();
    if (!topicContent) {
      window.alert("请先填写选题内容。");
      return;
    }
    await props.onAddManualTopic({ topicContent, topicDescription });
    setManualTopicContent("");
    setManualTopicDescription("");
    setIsAddingTopic(false);
  }

  async function handleDeleteTopic(topicId: string) {
    if (!props.canEdit) {
      return;
    }
    const confirmed = window.confirm("确定删除这条选题吗？删除后会从当前品牌选题库移除。");
    if (!confirmed) {
      return;
    }
    await props.onDeleteTopic(topicId);
  }

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading || props.isSaving}>
            刷新数据
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsAddingTopic((current) => !current)}
            disabled={!props.canEdit || props.isSaving}
          >
            {isAddingTopic ? "收起添加" : "添加选题"}
          </button>
        </div>
      </div>

      {hotProps ? (
        <article className="light-data-panel report-editor-panel report-editor-panel--compact">
          <div className="report-editor-head">
            <div>
              <strong>热点找选题</strong>
              <p className="panel-subtext" style={{ margin: 0 }}>
                按所选日期读取每日热点全部榜单和品牌背景资料，生成 3 个可勾选的抖音热点选题，勾选后可加入下方选题库。
              </p>
            </div>
            <div className="report-editor-actions">
              {hotProps.latestTask ? (
                <span className={`archive-pill ${getHotTopicTaskStatusClass(hotProps.latestTask.taskStatus)}`}>{getHotTopicTaskStatusText(hotProps.latestTask)}</span>
              ) : null}
              {hotProps.latest?.generatedAt ? (
                <span className="archive-pill status-ready">{props.formatDateTime(hotProps.latest.generatedAt)}</span>
              ) : null}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsHotTopicExpanded((current) => !current)}
              >
                {isHotTopicExpanded ? "收起" : "展开"}
              </button>
            </div>
          </div>

          {isHotTopicExpanded ? (
            <>
              <div className="workspace-toolbar top-toolbar">
                <label className="workspace-status" style={{ gap: 8, alignItems: "center" }}>
                  <span className="status-text">热点日期</span>
                  <select
                    value={hotProps.selectedDate}
                    onChange={(event) => void hotProps.onDateChange(event.target.value)}
                    disabled={props.isLoading || !hotProps.availableDates.length}
                  >
                    {hotProps.availableDates.length ? null : <option value="">暂无可选日期</option>}
                    {hotProps.availableDates.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="strategy-inline-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void hotProps.onGenerate()}
                    disabled={!hotProps.canEdit || props.isLoading || !hotProps.selectedDate || !hotProps.availableDates.length || isHotTopicTaskActive}
                  >
                    {isHotTopicTaskActive ? "后台生成中..." : hotProps.latest ? "重新生成" : "一键生成"}
                  </button>
                </div>
              </div>

              {!hotProps.availableDates.length ? (
                <div className="note-empty-state">当前还没有可用热点日期。请先到品牌增长策略里的"每日热点"同步当天榜单。</div>
              ) : null}
              {isHotTopicTaskActive ? (
                <div className="report-inline-tip">
                  {hotProps.latestTask?.phaseText
                    ? `${hotProps.latestTask.phaseText}${hotProps.latestTask.phaseIndex && hotProps.latestTask.phaseTotal ? `（${hotProps.latestTask.phaseIndex}/${hotProps.latestTask.phaseTotal}）` : ""}`
                    : "正在后台生成热点选题，完成后会自动刷新结果。"}
                </div>
              ) : null}

              {hotProps.latest?.items?.length ? (
                <div className="xhs-material-library" style={{ display: "grid", gap: 12 }}>
                  <div className="xhs-material-card-grid">
                    {hotProps.latest.items.map((item, index) => {
                      const checked = hotProps.selectedTopicIds.includes(item.id);
                      return (
                        <label key={item.id} className="light-data-panel" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => hotProps.onToggleTopic(item.id, event.target.checked)}
                          />
                          <div style={{ display: "grid", gap: 8 }}>
                            <strong>{`选题 ${index + 1}`}</strong>
                            <div>{item.title}</div>
                            <p className="panel-subtext" style={{ margin: 0 }}>
                              {item.description || hotProps.latest?.summary || "该选题说明将在生成后展示。"}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="strategy-inline-actions" style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void hotProps.onAddSelectedTopics()}
                      disabled={!props.canEdit || hotProps.isSavingTopicLibrary || !canAddSelectedTopics}
                    >
                      加入选题库
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </article>
      ) : null}

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>抖音选题库</strong>
            <p className="panel-subtext" style={{ margin: 0 }}>
              当前品牌独立存储的选题沉淀页，一行展示一条记录，超过 20 条自动分页。
            </p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.items.length ? "status-ready" : "status-pending"}`}>共 {props.items.length} 条</span>
            <span className="archive-pill status-pending">每页 20 条</span>
            <span className={`archive-pill ${props.canEdit ? "status-ready" : "status-pending"}`}>
              {props.canEdit ? "当前板块可编辑" : "当前板块只读"}
            </span>
          </div>
        </div>

        {!props.canEdit ? <div className="report-inline-tip">当前账号只有查看权限，不能新增品牌选题。</div> : null}

        {isAddingTopic ? (
          <section className="light-data-panel" style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">选题内容</span>
              <input
                value={manualTopicContent}
                onChange={(event) => setManualTopicContent(event.target.value)}
                placeholder="请输入选题内容"
                disabled={props.isSaving}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">选题说明</span>
              <textarea
                value={manualTopicDescription}
                onChange={(event) => setManualTopicDescription(event.target.value)}
                placeholder="请输入选题说明"
                rows={3}
                disabled={props.isSaving}
              />
            </label>
            <div className="strategy-inline-actions" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="secondary-button" onClick={() => setIsAddingTopic(false)} disabled={props.isSaving}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={() => void handleManualSubmit()} disabled={!props.canEdit || props.isSaving}>
                保存选题
              </button>
            </div>
          </section>
        ) : null}

        {!props.items.length ? (
          <div className="note-empty-state">当前品牌选题库还没有内容。请先从上方"热点找选题"勾选加入，或点击右上角"添加选题"手动补充。</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="soft-table douyin-data-table douyin-topic-library-table">
                <thead>
                  <tr>
                    <th>选题内容</th>
                    <th>选题说明</th>
                    <th>入选时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="table-cell-wide">{item.topicContent || "-"}</td>
                      <td className="table-cell-wide">{item.topicDescription || "-"}</td>
                      <td>{props.formatDateTime(item.selectedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void handleDeleteTopic(item.id)}
                          disabled={!props.canEdit || props.isSaving}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {props.items.length > TOPIC_LIBRARY_PAGE_SIZE ? (
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
                      key={`topic-library-page-${currentPage}`}
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
          </>
        )}
      </article>
    </article>
  );
}
