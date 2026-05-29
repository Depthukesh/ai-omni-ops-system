"use client";

import { useEffect, useMemo, useState } from "react";
import { type DouyinTopicLibraryItem } from "../../../services/reports";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

const TOPIC_LIBRARY_ROWS_PER_PAGE = 20;
const TOPIC_LIBRARY_COLUMNS_PER_ROW = 2;
const TOPIC_LIBRARY_PAGE_SIZE = TOPIC_LIBRARY_ROWS_PER_PAGE * TOPIC_LIBRARY_COLUMNS_PER_ROW;

export interface DouyinTopicLibraryWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canEdit: boolean;
  items: DouyinTopicLibraryItem[];
  isSaving: boolean;
  onRefresh: () => void | Promise<void>;
  onAddManualTopic: (payload: { topicContent: string; topicDescription: string }) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

function chunkTopicLibraryRows(items: DouyinTopicLibraryItem[]) {
  const rows: Array<[DouyinTopicLibraryItem | undefined, DouyinTopicLibraryItem | undefined]> = [];
  for (let index = 0; index < items.length; index += TOPIC_LIBRARY_COLUMNS_PER_ROW) {
    rows.push([items[index], items[index + 1]]);
  }
  return rows;
}

export function DouyinTopicLibraryWorkspace(props: DouyinTopicLibraryWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [manualTopicContent, setManualTopicContent] = useState("");
  const [manualTopicDescription, setManualTopicDescription] = useState("");

  const pageCount = Math.max(1, Math.ceil(props.items.length / TOPIC_LIBRARY_PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * TOPIC_LIBRARY_PAGE_SIZE;
    return props.items.slice(startIndex, startIndex + TOPIC_LIBRARY_PAGE_SIZE);
  }, [page, props.items]);
  const rows = useMemo(() => chunkTopicLibraryRows(paginatedItems), [paginatedItems]);

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

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>抖音选题库</strong>
            <p className="panel-subtext" style={{ margin: 0 }}>
              当前品牌独立存储的选题沉淀页，每行展示两条记录，超过 20 行自动分页。
            </p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.items.length ? "status-ready" : "status-pending"}`}>共 {props.items.length} 条</span>
            <span className="archive-pill status-pending">每页 20 行</span>
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
          <div className="note-empty-state">当前品牌选题库还没有内容。请先从“热点找选题”勾选加入，或点击右上角“添加选题”手动补充。</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="soft-table douyin-data-table douyin-topic-library-table">
                <thead>
                  <tr>
                    <th colSpan={3}>记录 A</th>
                    <th colSpan={3}>记录 B</th>
                  </tr>
                  <tr>
                    <th>选题内容</th>
                    <th>选题说明</th>
                    <th>入选时间</th>
                    <th>选题内容</th>
                    <th>选题说明</th>
                    <th>入选时间</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([left, right], index) => (
                    <tr key={`${left?.id || "empty-left"}-${right?.id || "empty-right"}-${index}`}>
                      <td className="table-cell-wide">{left?.topicContent || "-"}</td>
                      <td className="table-cell-wide">{left?.topicDescription || "-"}</td>
                      <td>{left ? props.formatDateTime(left.selectedAt) : "-"}</td>
                      <td className="table-cell-wide">{right?.topicContent || "-"}</td>
                      <td className="table-cell-wide">{right?.topicDescription || "-"}</td>
                      <td>{right ? props.formatDateTime(right.selectedAt) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {props.items.length > TOPIC_LIBRARY_PAGE_SIZE ? (
              <div className="note-pagination-bar hotspot-pagination-bar">
                <div className="note-pagination-summary">
                  <span>第 {page} / {pageCount} 页</span>
                  <span>当前显示 {rows.length} 行</span>
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
