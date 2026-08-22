"use client";

import { useMemo, useState } from "react";
import { type OpenClawVideoWorkRecord } from "../../../services/openclaw";
import { type DouyinPublishableWorkTarget } from "../douyin/publish-types";
import { OpenClawCommentThread } from "./openclaw-comment-thread";

type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawVideoWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  canPublish: boolean;
  items: OpenClawVideoWorkRecord[];
  deletingWorkId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (workId: string) => void | Promise<void>;
  onPublish: (target: DouyinPublishableWorkTarget) => void;
  onWechatChannelPublish: (target: DouyinPublishableWorkTarget) => void;
  formatDateTime: OptionalDateFormatter;
}

function buildPublishTarget(item: OpenClawVideoWorkRecord): DouyinPublishableWorkTarget {
  return {
    id: item.id,
    workKind: "OPENCLAW_VIDEO",
    title: item.title,
    sourceLabel: "OpenClaw 视频作品",
    content: item.scriptContent || item.description,
    videoUrl: item.videoUrl,
  };
}

export function OpenClawVideoWorkspace(props: OpenClawVideoWorkspaceProps) {
  const [selectedWork, setSelectedWork] = useState<OpenClawVideoWorkRecord | null>(null);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [props.items],
  );

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>视频作品列表</strong>
            <p className="panel-subtext">这里存放 OpenClaw 最终整合生成的成片，可继续查看、删除，或接入抖音与视频号发布插件。</p>
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
            当前还没有视频作品。请由 OpenClaw 生成最终成片后再来此查看。
          </div>
        ) : (
          <div className="table-scroll-shell openclaw-record-table-shell">
            <table className="soft-table openclaw-record-table openclaw-video-table">
              <colgroup>
                <col className="openclaw-video-table__col-title" />
                <col className="openclaw-video-table__col-description" />
                <col className="openclaw-video-table__col-script" />
                <col className="openclaw-video-table__col-cover" />
                <col className="openclaw-video-table__col-video" />
                <col className="openclaw-video-table__col-created" />
                <col className="openclaw-video-table__col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>作品标题</th>
                  <th>作品描述</th>
                  <th>视频文案/脚本</th>
                  <th>作品封面</th>
                  <th>作品视频</th>
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
                      <span className="openclaw-record-table__text" title={item.scriptContent}>{item.scriptContent || "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.coverImageUrl || "-"}>{item.coverImageUrl ? "已上传封面" : "-"}</span>
                    </td>
                    <td className="openclaw-record-table__text-cell">
                      <span className="openclaw-record-table__text" title={item.videoUrl}>{item.videoUrl ? "已上传视频" : "-"}</span>
                    </td>
                    <td>{props.formatDateTime(item.createdAt)}</td>
                    <td className="openclaw-record-table__action-cell">
                      <div className="openclaw-record-table__actions">
                        <button type="button" className="secondary-button" onClick={() => setSelectedWork(item)}>
                          查看
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => props.onPublish(buildPublishTarget(item))}
                          disabled={!props.canPublish || !item.videoUrl}
                        >
                          发布到抖音
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => props.onWechatChannelPublish(buildPublishTarget(item))}
                          disabled={!props.canPublish || !item.videoUrl}
                        >
                          发布视频号
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onDelete(item.id)}
                          disabled={!props.canDelete || props.deletingWorkId === item.id}
                        >
                          {props.deletingWorkId === item.id ? "删除中..." : "删除"}
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

      {selectedWork ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedWork(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedWork.title || "视频作品"}</strong>
                <p>只读查看 · OpenClaw 最终成片</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedWork(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>生成时间：{props.formatDateTime(selectedWork.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedWork.updatedAt)}</span>
            </div>
            {selectedWork.coverImageUrl ? (
              <div className="openclaw-diary-dialog__content">
                <img src={selectedWork.coverImageUrl} alt={`${selectedWork.title} 封面`} className="media-preview-image" />
              </div>
            ) : null}
            {selectedWork.videoUrl ? (
              <div className="openclaw-diary-dialog__content">
                <video controls preload="metadata" className="xhs-material-lightbox-video" src={selectedWork.videoUrl} />
              </div>
            ) : null}
            <div className="openclaw-diary-dialog__content">
              <strong>作品描述</strong>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {selectedWork.description || "暂无描述"}
              </div>
            </div>
            <div className="openclaw-diary-dialog__content">
              <strong>视频文案 / 脚本</strong>
              <pre style={{ marginTop: 8, marginBottom: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                {selectedWork.scriptContent || "暂无脚本"}
              </pre>
            </div>
            <div className="openclaw-diary-dialog__meta">
              {selectedWork.videoUrl ? (
                <a href={selectedWork.videoUrl} target="_blank" rel="noreferrer" className="note-data-link">
                  新窗口打开视频
                </a>
              ) : null}
              {selectedWork.coverImageUrl ? (
                <a href={selectedWork.coverImageUrl} target="_blank" rel="noreferrer" className="note-data-link">
                  新窗口打开封面
                </a>
              ) : null}
            </div>
            <OpenClawCommentThread
              brandId={selectedWork.brandId}
              workspaceScope={selectedWork.workspaceScope}
              resourceType="video_work"
              resourceId={selectedWork.id}
              formatDateTime={props.formatDateTime}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
