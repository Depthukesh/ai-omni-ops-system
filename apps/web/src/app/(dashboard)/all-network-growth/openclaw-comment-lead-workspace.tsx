"use client";

import { useEffect, useMemo, useState } from "react";
import { type OpenClawCommentLeadPlatform, type OpenClawCommentLeadRecord } from "../../../services/openclaw";

type PlatformFilter = "all" | OpenClawCommentLeadPlatform;
type OptionalDateFormatter = (value?: string) => string;
const PAGE_SIZE = 20;

export interface OpenClawCommentLeadWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawCommentLeadRecord[];
  platformFilter: PlatformFilter;
  setPlatformFilter: (value: PlatformFilter) => void;
  deletingLeadId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (leadId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

function renderPlatformLabel(filter: PlatformFilter) {
  if (filter === "xiaohongshu") {
    return "小红书";
  }
  if (filter === "douyin") {
    return "抖音";
  }
  return "全部平台";
}

export function OpenClawCommentLeadWorkspace(props: OpenClawCommentLeadWorkspaceProps) {
  const [selectedLead, setSelectedLead] = useState<OpenClawCommentLeadRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
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

  useEffect(() => {
    setCurrentPage(1);
  }, [props.platformFilter]);

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{props.sectionLabel}列表</strong>
            <p className="panel-subtext">{props.sectionDescription}</p>
          </div>
          <div className="strategy-inline-actions">
            <label className="field" style={{ minWidth: 160 }}>
              <span>来源平台</span>
              <select value={props.platformFilter} onChange={(event) => props.setPlatformFilter(event.target.value as PlatformFilter)}>
                <option value="all">全部平台</option>
                <option value="xiaohongshu">小红书</option>
                <option value="douyin">抖音</option>
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              {renderPlatformLabel(props.platformFilter)} · 共 {sortedItems.length} 条
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">
            当前还没有评论获客记录。请先由 OpenClaw 把品牌增长策略里的评论用户结果写入这里。
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
                      key={`comment-lead-page-${pageNumber}`}
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
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>用户评论</th>
                  <th>入选理由</th>
                  <th>用户主页</th>
                  <th>入选时间</th>
                  <th>来源平台</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.userName}>{item.userName || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.userComment || "-"}>{item.userComment || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.selectedReason || "-"}>{item.selectedReason || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <a href={item.userProfileUrl} target="_blank" rel="noreferrer" className="note-data-link" title={item.userProfileUrl}>
                        打开主页
                      </a>
                    </td>
                    <td>{props.formatDateTime(item.selectedAt)}</td>
                    <td>{item.sourcePlatformLabel}</td>
                    <td className="openclaw-record-table__action-cell">
                      <div className="openclaw-record-table__actions">
                        <button type="button" className="secondary-button" onClick={() => setSelectedLead(item)}>
                          查看
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onDelete(item.id)}
                          disabled={!props.canDelete || props.deletingLeadId === item.id}
                        >
                          {props.deletingLeadId === item.id ? "删除中..." : "删除"}
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

      {selectedLead ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedLead(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()} style={{ width: "min(980px, 94vw)" }}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedLead.userName || "评论获客详情"}</strong>
                <p>{selectedLead.sourcePlatformLabel} · 入选时间 {props.formatDateTime(selectedLead.selectedAt)}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedLead(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>来源平台：{selectedLead.sourcePlatformLabel}</span>
              <span>生成时间：{props.formatDateTime(selectedLead.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedLead.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__content">
              <strong>用户评论</strong>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {selectedLead.userComment || "-"}
              </div>
            </div>
            <div className="openclaw-diary-dialog__content">
              <strong>入选理由</strong>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {selectedLead.selectedReason || "-"}
              </div>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>用户主页：{selectedLead.userProfileUrl || "-"}</span>
              <a href={selectedLead.userProfileUrl} target="_blank" rel="noreferrer" className="note-data-link">
                打开主页
              </a>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>来源作品：{selectedLead.sourceUrl || "-"}</span>
              {selectedLead.sourceUrl ? (
                <a href={selectedLead.sourceUrl} target="_blank" rel="noreferrer" className="note-data-link">
                  打开来源
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
