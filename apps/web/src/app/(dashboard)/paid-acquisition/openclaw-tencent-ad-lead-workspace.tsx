"use client";

import { useEffect, useMemo, useState } from "react";
import { type OpenClawTencentAdLeadRecord } from "../../../services/openclaw";
import { OpenClawCommentThread } from "../brand-growth/openclaw-comment-thread";

const PAGE_SIZE = 20;

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawTencentAdLeadWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawTencentAdLeadRecord[];
  deletingRecordId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (recordId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

function getContentPreview(content: string) {
  const normalized = String(content || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "-";
  }
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

export function OpenClawTencentAdLeadWorkspace(props: OpenClawTencentAdLeadWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] = useState<OpenClawTencentAdLeadRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => `${right.createdAt}${right.updatedAt}`.localeCompare(`${left.createdAt}${left.updatedAt}`)),
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
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{props.sectionLabel}列表</strong>
            <p className="panel-subtext">{props.sectionDescription}</p>
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              腾讯投流获客 · 共 {sortedItems.length} 条
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">当前还没有腾讯投流获客记录。请先由 OpenClaw 把首条内容写入这里。</div>
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
                      key={`tencent-ad-lead-page-${pageNumber}`}
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
                    <th>创建时间</th>
                    <th>留言</th>
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
                        <span className="openclaw-record-table__text" title={item.content}>{getContentPreview(item.content)}</span>
                      </td>
                      <td>{props.formatDateTime(item.createdAt)}</td>
                      <td>
                        <button type="button" className="note-inline-button" onClick={() => setSelectedRecord(item)}>
                          留言
                        </button>
                      </td>
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
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()} style={{ width: "min(1080px, 94vw)" }}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedRecord.title || "腾讯投流获客详情"}</strong>
                <p>创建时间 {props.formatDateTime(selectedRecord.createdAt)}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedRecord(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>创建时间：{props.formatDateTime(selectedRecord.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedRecord.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__content">
              <strong>内容</strong>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {selectedRecord.content || "-"}
              </div>
            </div>
            <OpenClawCommentThread
              brandId={selectedRecord.brandId}
              workspaceScope={selectedRecord.workspaceScope}
              resourceType="tencent_ad_lead"
              resourceId={selectedRecord.id}
              formatDateTime={props.formatDateTime}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
