"use client";

import { useMemo, useState } from "react";
import { type OpenClawDailyPlanRecord } from "../../../services/openclaw";

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawDailyPlanWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: OpenClawDailyPlanRecord[];
  deletingPlanId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (planId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

export function OpenClawDailyPlanWorkspace(props: OpenClawDailyPlanWorkspaceProps) {
  const [selectedPlan, setSelectedPlan] = useState<OpenClawDailyPlanRecord | null>(null);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => `${right.planDate}${right.createdAt}`.localeCompare(`${left.planDate}${left.createdAt}`)),
    [props.items],
  );

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>每日计划列表</strong>
            <p className="panel-subtext">每条计划支持只读查看，打开后不可编辑。</p>
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
            当前还没有每日计划。请由 OpenClaw Agent 创建后再来此查看。
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
                    <td>{item.planDate || "-"}</td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.title}>{item.title || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.content}>{item.content || "-"}</span>
                    </td>
                    <td>{props.formatDateTime(item.createdAt)}</td>
                    <td className="openclaw-record-table__action-cell">
                      <div className="openclaw-record-table__actions">
                        <button type="button" className="secondary-button" onClick={() => setSelectedPlan(item)}>
                          查看
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onDelete(item.id)}
                          disabled={!props.canDelete || props.deletingPlanId === item.id}
                        >
                          {props.deletingPlanId === item.id ? "删除中..." : "删除"}
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

      {selectedPlan ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedPlan(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedPlan.title || "每日计划"}</strong>
                <p>{selectedPlan.planDate} · 只读查看</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedPlan(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>创建时间：{props.formatDateTime(selectedPlan.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedPlan.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__content">
              {selectedPlan.content || "暂无内容"}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
