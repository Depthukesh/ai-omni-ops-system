"use client";

import { useMemo, useState } from "react";
import { type OpenClawLobsterDiaryRecord } from "../../../services/openclaw";

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawLobsterDiaryWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawLobsterDiaryRecord[];
  deletingDiaryId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (diaryId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

export function OpenClawLobsterDiaryWorkspace(props: OpenClawLobsterDiaryWorkspaceProps) {
  const [selectedDiary, setSelectedDiary] = useState<OpenClawLobsterDiaryRecord | null>(null);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => `${right.diaryDate}${right.createdAt}`.localeCompare(`${left.diaryDate}${left.createdAt}`)),
    [props.items],
  );

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{props.sectionLabel}</strong>
            <p className="panel-subtext">{props.sectionDescription}</p>
          </div>
          <div className="strategy-inline-actions">
            <span className="archive-pill status-ready">仅 OpenClaw 可创建</span>
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
          </div>
        </div>

        <div className="brand-growth-panel stack gap-12">
          <p className="section-eyebrow">OpenClaw 专区</p>
          <h3>龙虾日记工作区</h3>
          <p className="panel-subtext">
            页面只提供查看与删除能力，不提供手动新建入口。日记由 OpenClaw Agent 提交 `日期 / 标题 / 内容` 后自动出现在下方列表。
          </p>
        </div>
      </article>

      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>龙虾日记列表</strong>
            <p className="panel-subtext">每条日记支持只读查看，打开后不可编辑。</p>
          </div>
          <div className="strategy-inline-actions">
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              共 {sortedItems.length} 篇
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">
            当前还没有龙虾日记。请由 OpenClaw Agent 创建后再来此查看。
          </div>
        ) : (
          <div className="table-scroll-shell">
            <table className="soft-table douyin-data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>标题</th>
                  <th>内容</th>
                  <th>创建时间</th>
                  <th>查看</th>
                  <th>删除</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.diaryDate || "-"}</td>
                    <td className="table-cell-wide wechat-mp-title-cell">
                      <span className="wechat-mp-title-text" title={item.title}>{item.title || "-"}</span>
                    </td>
                    <td className="table-cell-wide wechat-mp-title-cell">
                      <span className="wechat-mp-title-text" title={item.content}>{item.content || "-"}</span>
                    </td>
                    <td>{props.formatDateTime(item.createdAt)}</td>
                    <td>
                      <button type="button" className="secondary-button" onClick={() => setSelectedDiary(item)}>
                        查看
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="note-inline-button"
                        onClick={() => void props.onDelete(item.id)}
                        disabled={!props.canDelete || props.deletingDiaryId === item.id}
                      >
                        {props.deletingDiaryId === item.id ? "删除中..." : "删除"}
                      </button>
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
                <strong>{selectedDiary.title || "龙虾日记"}</strong>
                <p>{selectedDiary.diaryDate} · 只读查看</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedDiary(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>创建时间：{props.formatDateTime(selectedDiary.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedDiary.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__content">
              {selectedDiary.content || "暂无内容"}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
