"use client";

import { useEffect, useMemo, useState } from "react";
import { type OpenClawLobsterDiaryRecord } from "../../../services/openclaw";
import { OpenClawCommentThread } from "./openclaw-comment-thread";

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawLobsterDiaryWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  items: OpenClawLobsterDiaryRecord[];
  deletingDiaryId?: string;
  updatingDiaryId?: string;
  onRefresh: () => void | Promise<void>;
  onUpdate: (
    diaryId: string,
    payload: {
      diaryDate: string;
      title: string;
      content: string;
    },
  ) => OpenClawLobsterDiaryRecord | void | Promise<OpenClawLobsterDiaryRecord | void>;
  onDelete: (diaryId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

export function OpenClawLobsterDiaryWorkspace(props: OpenClawLobsterDiaryWorkspaceProps) {
  const [selectedDiary, setSelectedDiary] = useState<OpenClawLobsterDiaryRecord | null>(null);
  const [draftDiaryDate, setDraftDiaryDate] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveError, setSaveError] = useState("");

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => `${right.diaryDate}${right.createdAt}`.localeCompare(`${left.diaryDate}${left.createdAt}`)),
    [props.items],
  );

  useEffect(() => {
    if (!selectedDiary) {
      setDraftDiaryDate("");
      setDraftTitle("");
      setDraftContent("");
      setSaveError("");
      return;
    }
    setDraftDiaryDate(selectedDiary.diaryDate || "");
    setDraftTitle(selectedDiary.title || "");
    setDraftContent(selectedDiary.content || "");
    setSaveError("");
  }, [selectedDiary]);

  async function handleSave() {
    if (!selectedDiary || props.updatingDiaryId === selectedDiary.id) {
      return;
    }
    const diaryDate = draftDiaryDate.trim();
    const title = draftTitle.trim();
    const content = draftContent.trim();
    if (!diaryDate || !title || !content) {
      setSaveError("请先补齐日期、标题和复盘内容。");
      return;
    }

    setSaveError("");
    try {
      const result = await props.onUpdate(selectedDiary.id, {
        diaryDate,
        title,
        content,
      });
      setSelectedDiary(result || {
        ...selectedDiary,
        diaryDate,
        title,
        content,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存每周复盘失败");
    }
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>每周复盘列表</strong>
            <p className="panel-subtext">点击查看后可直接修改标题、日期与正文，并可继续在下方留言协作。</p>
          </div>
          <div className="strategy-inline-actions">
            <span className="archive-pill status-ready">仅 OpenClaw 可创建</span>
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              共 {sortedItems.length} 篇
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">
            当前还没有每周复盘。请由 OpenClaw Agent 创建后再来此查看。
          </div>
        ) : (
          <div className="table-scroll-shell openclaw-record-table-shell">
            <table className="soft-table openclaw-record-table">
              <colgroup>
                <col className="openclaw-record-table__col-date" />
                <col className="openclaw-record-table__col-title" />
                <col className="openclaw-record-table__col-content" />
                <col className="openclaw-record-table__col-created" />
                <col className="openclaw-record-table__col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>标题</th>
                  <th>内容</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.diaryDate || "-"}</td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.title}>{item.title || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.content}>{item.content || "-"}</span>
                    </td>
                    <td>{props.formatDateTime(item.createdAt)}</td>
                    <td className="openclaw-record-table__action-cell">
                      <div className="openclaw-record-table__actions">
                        <button type="button" className="secondary-button" onClick={() => setSelectedDiary(item)}>
                          查看
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onDelete(item.id)}
                          disabled={!props.canDelete || props.deletingDiaryId === item.id}
                        >
                          {props.deletingDiaryId === item.id ? "删除中..." : "删除"}
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

      {selectedDiary ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedDiary(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedDiary.title || "每周复盘"}</strong>
                <p>{selectedDiary.diaryDate} · {props.canEdit ? "可直接编辑并留言" : "可留言协作"}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {props.canEdit ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleSave()}
                    disabled={props.updatingDiaryId === selectedDiary.id}
                  >
                    {props.updatingDiaryId === selectedDiary.id ? "保存中..." : "保存修改"}
                  </button>
                ) : null}
                <button type="button" className="secondary-button" onClick={() => setSelectedDiary(null)}>
                  关闭
                </button>
              </div>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>创建时间：{props.formatDateTime(selectedDiary.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedDiary.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__content" style={{ display: "grid", gap: 12 }}>
              {saveError ? <div className="status-text error-text">{saveError}</div> : null}
              <label style={{ display: "grid", gap: 6 }}>
                <span className="panel-subtext">复盘日期</span>
                <input
                  value={draftDiaryDate}
                  onChange={(event) => setDraftDiaryDate(event.target.value)}
                  className="report-input"
                  placeholder="YYYY-MM-DD"
                  readOnly={!props.canEdit}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="panel-subtext">复盘标题</span>
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  className="report-input"
                  placeholder="请输入每周复盘标题"
                  readOnly={!props.canEdit}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="panel-subtext">{props.canEdit ? "复盘内容（可直接修改）" : "复盘内容"}</span>
                <textarea
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  rows={14}
                  className="report-textarea"
                  placeholder="这里展示每周复盘内容"
                  readOnly={!props.canEdit}
                />
              </label>
            </div>
            <OpenClawCommentThread
              brandId={selectedDiary.brandId}
              workspaceScope={selectedDiary.workspaceScope}
              resourceType="lobster_diary"
              resourceId={selectedDiary.id}
              formatDateTime={props.formatDateTime}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
