"use client";

import { useEffect, useMemo, useState } from "react";
import { type OpenClawStrategyOptimizationRecord } from "../../../services/openclaw";
import { OpenClawCommentThread } from "./openclaw-comment-thread";

type OptionalDateFormatter = (value?: string) => string;

const PAGE_SIZE = 20;

export interface OpenClawStrategyOptimizationWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  items: OpenClawStrategyOptimizationRecord[];
  deletingRecordId?: string;
  updatingRecordId?: string;
  onRefresh: () => void | Promise<void>;
  onUpdate: (
    recordId: string,
    payload: {
      title: string;
      content: string;
    },
  ) => OpenClawStrategyOptimizationRecord | void | Promise<OpenClawStrategyOptimizationRecord | void>;
  onDelete: (recordId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

export function OpenClawStrategyOptimizationWorkspace(props: OpenClawStrategyOptimizationWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] = useState<OpenClawStrategyOptimizationRecord | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveError, setSaveError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => `${right.generatedAt}${right.createdAt}`.localeCompare(`${left.generatedAt}${left.createdAt}`)),
    [props.items],
  );
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const currentRangeStart = sortedItems.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const currentRangeEnd = sortedItems.length ? Math.min(currentPage * PAGE_SIZE, sortedItems.length) : 0;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedItems]);

  useEffect(() => {
    if (!selectedRecord) {
      setDraftTitle("");
      setDraftContent("");
      setSaveError("");
      return;
    }
    setDraftTitle(selectedRecord.title || "");
    setDraftContent(selectedRecord.content || "");
    setSaveError("");
  }, [selectedRecord]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleSave() {
    if (!selectedRecord || props.updatingRecordId === selectedRecord.id) {
      return;
    }
    const title = draftTitle.trim();
    const content = draftContent.trim();
    if (!title || !content) {
      setSaveError("请先补齐标题和策略优化内容。");
      return;
    }

    setSaveError("");
    try {
      const result = await props.onUpdate(selectedRecord.id, { title, content });
      setSelectedRecord(result || {
        ...selectedRecord,
        title,
        content,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存策略优化记录失败");
    }
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>策略优化记录列表</strong>
            <p className="panel-subtext">OpenClaw 每周复盘后可在这里生成策略优化记录，用户点击查看后也可直接编辑并留言。</p>
          </div>
          <div className="strategy-inline-actions">
            <span className="archive-pill status-ready">OpenClaw 创建 · 人机共维</span>
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              共 {sortedItems.length} 条
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">
            当前还没有策略优化记录。请由 OpenClaw 在每周复盘后生成，或等待团队后续维护。
          </div>
        ) : (
          <>
            <div className="note-pagination-bar" style={{ marginBottom: 12 }}>
              <div className="note-pagination-summary">
                当前显示 {currentRangeStart}-{currentRangeEnd} 条，第 {currentPage}/{totalPages} 页，每页 {PAGE_SIZE} 条
              </div>
              <div className="note-pagination-actions">
                <button type="button" className="note-page-button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                  .map((pageNumber) => (
                    <button
                      key={`strategy-optimization-page-${pageNumber}`}
                      type="button"
                      className={`note-page-button ${pageNumber === currentPage ? "is-active" : ""}`}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                <button type="button" className="note-page-button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                  下一页
                </button>
              </div>
            </div>

            <div className="table-scroll-shell openclaw-record-table-shell">
              <table className="soft-table openclaw-record-table">
                <colgroup>
                  <col className="openclaw-record-table__col-title" />
                  <col className="openclaw-record-table__col-content" />
                  <col className="openclaw-record-table__col-created" />
                  <col className="openclaw-record-table__col-created" />
                  <col className="openclaw-record-table__col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>内容</th>
                    <th>生成时间</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.title}>{item.title || "-"}</span>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.content}>{item.content || "-"}</span>
                      </td>
                      <td>{props.formatDateTime(item.generatedAt)}</td>
                      <td>{props.formatDateTime(item.updatedAt)}</td>
                      <td className="openclaw-record-table__action-cell">
                        <div className="openclaw-record-table__actions">
                          <button type="button" className="secondary-button" onClick={() => setSelectedRecord(item)}>
                            查看
                          </button>
                          <button
                            type="button"
                            className="note-inline-button"
                            onClick={() => void props.onDelete(item.id)}
                            disabled={!props.canDelete || props.deletingRecordId === item.id}
                          >
                            {props.deletingRecordId === item.id ? "删除中..." : "删除"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>

      {selectedRecord ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedRecord.title || "策略优化记录"}</strong>
                <p>{props.canEdit ? "可直接编辑并留言" : "可留言协作"} · 生成于 {props.formatDateTime(selectedRecord.generatedAt)}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {props.canEdit ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleSave()}
                    disabled={props.updatingRecordId === selectedRecord.id}
                  >
                    {props.updatingRecordId === selectedRecord.id ? "保存中..." : "保存修改"}
                  </button>
                ) : null}
                <button type="button" className="secondary-button" onClick={() => setSelectedRecord(null)}>
                  关闭
                </button>
              </div>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>生成时间：{props.formatDateTime(selectedRecord.generatedAt)}</span>
              <span>创建时间：{props.formatDateTime(selectedRecord.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedRecord.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__content" style={{ display: "grid", gap: 12 }}>
              {saveError ? <div className="status-text error-text">{saveError}</div> : null}
              <label style={{ display: "grid", gap: 6 }}>
                <span className="panel-subtext">优化标题</span>
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  className="report-input"
                  placeholder="请输入策略优化标题"
                  readOnly={!props.canEdit}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="panel-subtext">{props.canEdit ? "优化内容（可直接修改）" : "优化内容"}</span>
                <textarea
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  rows={14}
                  className="report-textarea"
                  placeholder="这里展示策略优化记录内容"
                  readOnly={!props.canEdit}
                />
              </label>
            </div>
            <OpenClawCommentThread
              brandId={selectedRecord.brandId}
              workspaceScope={selectedRecord.workspaceScope}
              resourceType="strategy_optimization"
              resourceId={selectedRecord.id}
              formatDateTime={props.formatDateTime}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
