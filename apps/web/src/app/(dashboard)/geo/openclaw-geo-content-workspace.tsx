"use client";

import { useMemo, useState } from "react";
import { type OpenClawGeoContentRecord } from "../../../services/openclaw";

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawGeoContentWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawGeoContentRecord[];
  deletingContentId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (contentId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

function getAttachmentDisplayText(item: OpenClawGeoContentRecord) {
  if (item.attachmentFileName) {
    return `${item.attachmentLabel} · ${item.attachmentFileName}`;
  }
  if (item.attachmentStorageKey) {
    return `${item.attachmentLabel} · 已归档`;
  }
  return "-";
}

export function OpenClawGeoContentWorkspace(props: OpenClawGeoContentWorkspaceProps) {
  const [selectedContent, setSelectedContent] = useState<OpenClawGeoContentRecord | null>(null);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [props.items],
  );

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{props.sectionLabel}{sortedItems[0]?.generationMode === "multiple" ? "列表" : "内容列表"}</strong>
            <p className="panel-subtext">{props.sectionDescription}</p>
          </div>
          <div className="strategy-inline-actions">
            <span className="archive-pill status-ready">仅 OpenClaw 可创建</span>
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
            当前还没有 {props.sectionLabel}。请由 OpenClaw 保存对应 HTML 与附件后再来此查看。
          </div>
        ) : (
          <div className="table-scroll-shell openclaw-record-table-shell">
            <table className="soft-table openclaw-record-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>摘要</th>
                  <th>HTML 内容</th>
                  <th>非HTML产物</th>
                  <th>存储地址</th>
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
                      <span className="openclaw-record-table__text" title={item.htmlContent ? "已保存 HTML 内容" : "未保存 HTML 内容"}>
                        {item.htmlContent ? "已保存 HTML 内容" : "-"}
                      </span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={getAttachmentDisplayText(item)}>
                        {getAttachmentDisplayText(item)}
                      </span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.storageAddress || "-"}>{item.storageAddress || "-"}</span>
                    </td>
                    <td>{props.formatDateTime(item.createdAt)}</td>
                    <td className="openclaw-record-table__action-cell">
                      <div className="openclaw-record-table__actions">
                        <button type="button" className="secondary-button" onClick={() => setSelectedContent(item)}>
                          查看
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onDelete(item.id)}
                          disabled={!props.canDelete || props.deletingContentId === item.id}
                        >
                          {props.deletingContentId === item.id ? "删除中..." : "删除"}
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

      {selectedContent ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedContent(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()} style={{ width: "min(1120px, 94vw)" }}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedContent.title || props.sectionLabel}</strong>
                <p>{selectedContent.sectionLabel} · {selectedContent.generationMode === "multiple" ? "多次生成列表" : "一次性生成内容"}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedContent(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>生成时间：{props.formatDateTime(selectedContent.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedContent.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>非HTML产物：{getAttachmentDisplayText(selectedContent)}</span>
              <span>存储地址：{selectedContent.storageAddress || "当前记录未绑定附件副本"}</span>
            </div>
            {selectedContent.description ? (
              <div className="openclaw-diary-dialog__content">
                <strong>内容摘要</strong>
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {selectedContent.description}
                </div>
              </div>
            ) : null}
            <div className="openclaw-diary-dialog__content">
              <iframe
                title={selectedContent.title || props.sectionLabel}
                srcDoc={selectedContent.htmlContent || "<html><body><p>暂无 HTML 内容</p></body></html>"}
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
            {selectedContent.attachmentFileUrl ? (
              <div className="openclaw-diary-dialog__meta">
                <span>附件文件：{selectedContent.attachmentFileName || selectedContent.attachmentLabel}</span>
                {selectedContent.attachmentStorageKey ? <span>存储键：{selectedContent.attachmentStorageKey}</span> : null}
                <a href={selectedContent.attachmentFileUrl} target="_blank" rel="noreferrer" className="note-data-link">
                  打开附件
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
