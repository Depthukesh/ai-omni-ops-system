"use client";

import { useMemo, useState } from "react";
import { type OpenClawCreativeMaterialRecord } from "../../../services/openclaw";

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawCreativeMaterialWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawCreativeMaterialRecord[];
  deletingMaterialId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (materialId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

type PreviewKind = "image" | "video" | "audio" | "text" | "file";

function getPreviewKind(item: OpenClawCreativeMaterialRecord): PreviewKind {
  const normalizedMimeType = String(item.mimeType || "").toLowerCase();
  const normalizedType = String(item.materialType || "").toLowerCase();
  const normalizedUrl = String(item.fileUrl || "").toLowerCase();

  if (normalizedMimeType.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(normalizedUrl)) {
    return "image";
  }
  if (normalizedMimeType.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi)$/.test(normalizedUrl)) {
    return "video";
  }
  if (normalizedMimeType.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(normalizedUrl)) {
    return "audio";
  }
  if (item.textContent || normalizedType === "text" || normalizedType === "script" || normalizedType === "copy") {
    return "text";
  }
  return "file";
}

function getMaterialFileLabel(item: OpenClawCreativeMaterialRecord) {
  if (item.fileName) {
    return item.fileName;
  }
  if (item.fileUrl) {
    try {
      const url = new URL(item.fileUrl);
      return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || item.fileUrl);
    } catch {
      return item.fileUrl;
    }
  }
  if (item.textContent) {
    return `文本内容 ${item.textContent.length} 字`;
  }
  return "-";
}

export function OpenClawCreativeMaterialWorkspace(props: OpenClawCreativeMaterialWorkspaceProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<OpenClawCreativeMaterialRecord | null>(null);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [props.items],
  );

  const previewKind = selectedMaterial ? getPreviewKind(selectedMaterial) : "file";

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>创作素材列表</strong>
            <p className="panel-subtext">OpenClaw 调用站内第三方平台能力后，可把文本、图片、视频、语音和 BGM 等结果统一保存到这里。</p>
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
            当前还没有创作素材。请由 OpenClaw 生成并保存素材后再来此查看。
          </div>
        ) : (
          <div className="table-scroll-shell openclaw-record-table-shell">
            <table className="soft-table openclaw-record-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>描述</th>
                  <th>素材类型</th>
                  <th>素材文件</th>
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
                    <td>{item.materialType || "-"}</td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={getMaterialFileLabel(item)}>{getMaterialFileLabel(item)}</span>
                    </td>
                    <td>{props.formatDateTime(item.createdAt)}</td>
                    <td className="openclaw-record-table__action-cell">
                      <div className="openclaw-record-table__actions">
                        <button type="button" className="secondary-button" onClick={() => setSelectedMaterial(item)}>
                          查看
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onDelete(item.id)}
                          disabled={!props.canDelete || props.deletingMaterialId === item.id}
                        >
                          {props.deletingMaterialId === item.id ? "删除中..." : "删除"}
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

      {selectedMaterial ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedMaterial(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedMaterial.title || "创作素材"}</strong>
                <p>{selectedMaterial.materialType || "未标注类型"} · 只读查看</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedMaterial(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>生成时间：{props.formatDateTime(selectedMaterial.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedMaterial.updatedAt)}</span>
            </div>
            {selectedMaterial.description ? (
              <div className="openclaw-diary-dialog__content">{selectedMaterial.description}</div>
            ) : null}
            <div className="openclaw-diary-dialog__content">
              {previewKind === "image" && selectedMaterial.fileUrl ? (
                <img src={selectedMaterial.fileUrl} alt={selectedMaterial.title} className="media-preview-image" />
              ) : previewKind === "video" && selectedMaterial.fileUrl ? (
                <video controls preload="metadata" className="xhs-material-lightbox-video" src={selectedMaterial.fileUrl} />
              ) : previewKind === "audio" && selectedMaterial.fileUrl ? (
                <audio controls preload="metadata" src={selectedMaterial.fileUrl} style={{ width: "100%" }} />
              ) : previewKind === "text" ? (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                  {selectedMaterial.textContent || "暂无文本内容"}
                </pre>
              ) : (
                <div>
                  当前素材暂不支持站内预览。
                  {selectedMaterial.fileUrl ? (
                    <div style={{ marginTop: 12 }}>
                      <a href={selectedMaterial.fileUrl} target="_blank" rel="noreferrer" className="xhs-material-detail-button">
                        打开素材文件
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {selectedMaterial.fileUrl ? (
              <div className="openclaw-diary-dialog__meta">
                <span>文件：{getMaterialFileLabel(selectedMaterial)}</span>
                <a href={selectedMaterial.fileUrl} target="_blank" rel="noreferrer" className="note-data-link">
                  新窗口打开
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
