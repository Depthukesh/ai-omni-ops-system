"use client";

import { useEffect, useMemo, useState } from "react";
import { type OpenClawMarketingPlanRecord } from "../../../services/openclaw";
import { OpenClawCommentThread } from "./openclaw-comment-thread";

type OptionalDateFormatter = (value?: string) => string;

const PAGE_SIZE = 20;

export interface OpenClawMarketingPlanWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawMarketingPlanRecord[];
  deletingRecordId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (recordId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

export function OpenClawMarketingPlanWorkspace(props: OpenClawMarketingPlanWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] = useState<OpenClawMarketingPlanRecord | null>(null);
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
  const previewUrl = useMemo(() => {
    if (!selectedRecord?.htmlContent) {
      return "";
    }
    return URL.createObjectURL(new Blob([selectedRecord.htmlContent], { type: "text/html;charset=utf-8" }));
  }, [selectedRecord]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openHtmlPreview(record: OpenClawMarketingPlanRecord) {
    setSelectedRecord(record);
  }

  function openHtmlInNewWindow() {
    if (!previewUrl) {
      return;
    }
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>营销策划方案列表</strong>
            <p className="panel-subtext">OpenClaw 可直接上传 HTML 营销策划方案，用户可点击查看 HTML 并在方案下留言协作。</p>
          </div>
          <div className="strategy-inline-actions">
            <span className="archive-pill status-ready">OpenClaw 上传 · HTML 查看</span>
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              共 {sortedItems.length} 条
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">当前还没有营销策划方案，等待 OpenClaw 上传首条 HTML 方案。</div>
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
                      key={`marketing-plan-page-${pageNumber}`}
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
                      <td>
                        <button type="button" className="secondary-button" onClick={() => openHtmlPreview(item)}>
                          查看 HTML
                        </button>
                      </td>
                      <td>{props.formatDateTime(item.createdAt)}</td>
                      <td>
                        <button type="button" className="note-inline-button" onClick={() => setSelectedRecord(item)}>
                          留言
                        </button>
                      </td>
                      <td className="openclaw-record-table__action-cell">
                        <div className="openclaw-record-table__actions">
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
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 1120 }}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedRecord.title || "营销策划方案"}</strong>
                <p>HTML 内容预览 · 创建于 {props.formatDateTime(selectedRecord.createdAt)}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="primary-button" onClick={openHtmlInNewWindow} disabled={!previewUrl}>
                  打开 HTML
                </button>
                <button type="button" className="secondary-button" onClick={() => setSelectedRecord(null)}>
                  关闭
                </button>
              </div>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>创建时间：{props.formatDateTime(selectedRecord.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedRecord.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__content" style={{ display: "grid", gap: 12 }}>
              <div className="panel-subtext">HTML 预览</div>
              {previewUrl ? (
                <iframe
                  title={`${selectedRecord.title || "营销策划方案"} HTML 预览`}
                  src={previewUrl}
                  style={{ width: "100%", minHeight: 520, border: "1px solid rgba(148, 163, 184, 0.28)", borderRadius: 16, background: "#fff" }}
                />
              ) : (
                <div className="note-empty-state">当前 HTML 内容为空，暂时无法预览。</div>
              )}
            </div>
            <OpenClawCommentThread
              brandId={selectedRecord.brandId}
              workspaceScope={selectedRecord.workspaceScope}
              resourceType="marketing_plan"
              resourceId={selectedRecord.id}
              formatDateTime={props.formatDateTime}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
