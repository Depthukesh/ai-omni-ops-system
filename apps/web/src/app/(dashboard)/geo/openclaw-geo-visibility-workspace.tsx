"use client";

import { useMemo, useState } from "react";
import { type OpenClawGeoVisibilityReportRecord } from "../../../services/openclaw";

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawGeoVisibilityWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawGeoVisibilityReportRecord[];
  deletingReportId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (reportId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

export function OpenClawGeoVisibilityWorkspace(props: OpenClawGeoVisibilityWorkspaceProps) {
  const [selectedReport, setSelectedReport] = useState<OpenClawGeoVisibilityReportRecord | null>(null);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [props.items],
  );

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{props.sectionLabel}列表</strong>
            <p className="panel-subtext">{props.sectionDescription}</p>
          </div>
          <div className="strategy-inline-actions">
            <span className="archive-pill status-ready">仅 OpenClaw 可创建</span>
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              共 {sortedItems.length} 份
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">
            当前还没有 GEO 可见度诊断报告。请由 OpenClaw 生成 HTML 报告后再来此查看。
          </div>
        ) : (
          <div className="table-scroll-shell openclaw-record-table-shell">
            <table className="soft-table openclaw-record-table">
              <thead>
                <tr>
                  <th>报告标题</th>
                  <th>摘要</th>
                  <th>HTML 内容</th>
                  <th>生成时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.title}>{item.title || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.description}>{item.description || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.htmlContent ? "已保存 HTML 报告" : "未保存 HTML 报告"}>
                        {item.htmlContent ? "已保存 HTML 报告" : "-"}
                      </span>
                    </td>
                    <td>{props.formatDateTime(item.createdAt)}</td>
                    <td className="openclaw-record-table__action-cell">
                      <div className="openclaw-record-table__actions">
                        <button type="button" className="secondary-button" onClick={() => setSelectedReport(item)}>
                          查看
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onDelete(item.id)}
                          disabled={!props.canDelete || props.deletingReportId === item.id}
                        >
                          {props.deletingReportId === item.id ? "删除中..." : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {selectedReport ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedReport(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()} style={{ width: "min(1120px, 94vw)" }}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedReport.title || "GEO 可见度诊断报告"}</strong>
                <p>HTML 只读预览，可上下滚动查看完整页面</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedReport(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>生成时间：{props.formatDateTime(selectedReport.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedReport.updatedAt)}</span>
            </div>
            {selectedReport.description ? (
              <div className="openclaw-diary-dialog__content">
                <strong>报告摘要</strong>
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {selectedReport.description}
                </div>
              </div>
            ) : null}
            <div className="openclaw-diary-dialog__content">
              <iframe
                title={selectedReport.title || "GEO 可见度诊断报告"}
                srcDoc={selectedReport.htmlContent || "<html><body><p>暂无 HTML 内容</p></body></html>"}
                sandbox="allow-same-origin allow-scripts"
                style={{
                  width: "100%",
                  height: "70vh",
                  border: "1px solid rgba(148, 163, 184, 0.32)",
                  borderRadius: 20,
                  background: "#ffffff",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
