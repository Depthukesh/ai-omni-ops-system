"use client";

import {
  formatXiaohongshuAccountRoleLabel,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
} from "../../../services/works";
import { ManagedImage } from "./managed-image";
import { type OptionalDateFormatter } from "./shared-types";

export interface OriginalWorkCardGridProps {
  items: XiaohongshuOriginalWorkRecord[];
  previewIndexMap: Record<string, number>;
  onShiftPreview: (workId: string, total: number, delta: number) => void;
  onOpenLightbox: (item: XiaohongshuOriginalWorkRecord, index: number) => void;
  onPublish: (item: XiaohongshuOriginalWorkRecord) => void;
  getPublishLabel: (workId: string) => string;
  onEdit: (item: XiaohongshuOriginalWorkRecord) => void;
  onDelete: (workId: string) => void;
  deletingWorkId?: string;
  formatDateTime: OptionalDateFormatter;
}

export function OriginalWorkCardGrid(props: OriginalWorkCardGridProps) {
  return (
    <div className="xhs-material-library">
      <div className="xhs-material-card-grid">
        {props.items.map((item, index) => {
          const mediaUrls = getWorkMediaUrls(item.coverImageUrl, item.imageUrls);
          const previewIndex = getPreviewIndex(props.previewIndexMap, item.id, mediaUrls.length);
          const previewUrl = mediaUrls[previewIndex];
          const loadingMode = index < 3 ? "eager" : "lazy";
          return (
            <article key={item.id} className="xhs-material-card">
              <button
                type="button"
                className="xhs-material-card-stage"
                onClick={() => props.onOpenLightbox(item, previewIndex)}
              >
                {previewUrl ? (
                  <ManagedImage
                    className="xhs-material-card-media"
                    src={previewUrl}
                    alt={item.title}
                    loadingMode={loadingMode}
                  />
                ) : (
                  <span className="xhs-material-card-empty">暂无封面</span>
                )}
                <span className="xhs-material-card-badge xhs-material-card-badge--left">
                  {formatXiaohongshuAccountRoleLabel(item.accountRole)}
                </span>
                <span className="xhs-material-card-badge">原创</span>
              </button>
              {mediaUrls.length > 1 ? (
                <div className="xhs-material-card-carousel">
                  <button type="button" className="note-page-button" onClick={() => props.onShiftPreview(item.id, mediaUrls.length, -1)}>
                    ‹
                  </button>
                  <span>{previewIndex + 1}/{mediaUrls.length}</span>
                  <button type="button" className="note-page-button" onClick={() => props.onShiftPreview(item.id, mediaUrls.length, 1)}>
                    ›
                  </button>
                </div>
              ) : null}
              <div className="xhs-material-card-body">
                <strong>{item.title}</strong>
                <p>{item.calendarLabel || item.customTopicName || "自定义选题"}</p>
                <p>{props.formatDateTime(item.createdAt)}</p>
                <div className="xhs-material-card-actions">
                  <button type="button" className="primary-button" onClick={() => props.onPublish(item)}>
                    {props.getPublishLabel(item.id)}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onEdit(item)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => props.onDelete(item.id)}
                    disabled={props.deletingWorkId === item.id}
                  >
                    {props.deletingWorkId === item.id ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export interface RewriteWorkCardGridProps {
  items: XiaohongshuRewriteWorkRecord[];
  previewIndexMap: Record<string, number>;
  onShiftPreview: (workId: string, total: number, delta: number) => void;
  onOpenLightbox: (item: XiaohongshuRewriteWorkRecord, index: number) => void;
  onPublish: (item: XiaohongshuRewriteWorkRecord) => void;
  getPublishLabel: (workId: string) => string;
  onEdit: (item: XiaohongshuRewriteWorkRecord) => void;
  onDelete: (workId: string) => void;
  deletingWorkId?: string;
  formatDateTime: OptionalDateFormatter;
}

export function RewriteWorkCardGrid(props: RewriteWorkCardGridProps) {
  return (
    <div className="xhs-material-library">
      <div className="xhs-material-card-grid">
        {props.items.map((item, index) => {
          const mediaUrls = getWorkMediaUrls(item.coverImageUrl, item.imageUrls);
          const previewIndex = getPreviewIndex(props.previewIndexMap, item.id, mediaUrls.length);
          const previewUrl = mediaUrls[previewIndex];
          const loadingMode = index < 3 ? "eager" : "lazy";
          return (
            <article key={item.id} className="xhs-material-card">
              <button
                type="button"
                className="xhs-material-card-stage"
                onClick={() => props.onOpenLightbox(item, previewIndex)}
              >
                {previewUrl ? (
                  <ManagedImage
                    className="xhs-material-card-media"
                    src={previewUrl}
                    alt={item.title}
                    loadingMode={loadingMode}
                  />
                ) : (
                  <span className="xhs-material-card-empty">暂无封面</span>
                )}
                <span className="xhs-material-card-badge xhs-material-card-badge--left">
                  {formatXiaohongshuAccountRoleLabel(item.accountRole)}
                </span>
                <span className="xhs-material-card-badge">二创</span>
              </button>
              {mediaUrls.length > 1 ? (
                <div className="xhs-material-card-carousel">
                  <button type="button" className="note-page-button" onClick={() => props.onShiftPreview(item.id, mediaUrls.length, -1)}>
                    ‹
                  </button>
                  <span>{previewIndex + 1}/{mediaUrls.length}</span>
                  <button type="button" className="note-page-button" onClick={() => props.onShiftPreview(item.id, mediaUrls.length, 1)}>
                    ›
                  </button>
                </div>
              ) : null}
              <div className="xhs-material-card-body">
                <strong>{item.title}</strong>
                <p>{item.sourceMaterialTitle}</p>
                <p>{props.formatDateTime(item.createdAt)}</p>
                <div className="xhs-material-card-actions">
                  <button type="button" className="primary-button" onClick={() => props.onPublish(item)}>
                    {props.getPublishLabel(item.id)}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onEdit(item)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => props.onDelete(item.id)}
                    disabled={props.deletingWorkId === item.id}
                  >
                    {props.deletingWorkId === item.id ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export interface VideoWorkCardGridProps {
  items: XiaohongshuVideoWorkRecord[];
  selectedWorkId?: string;
  onSelect: (item: XiaohongshuVideoWorkRecord) => void;
  onPreview: (item: XiaohongshuVideoWorkRecord) => void;
  onEdit: (item: XiaohongshuVideoWorkRecord) => void;
  onDelete: (workId: string) => void;
  deletingWorkId?: string;
  formatDateTime: OptionalDateFormatter;
}

export function VideoWorkCardGrid(props: VideoWorkCardGridProps) {
  return (
    <div className="xhs-material-library">
      <div className="xhs-material-card-grid">
        {props.items.map((item, index) => {
          const previewImageUrl = item.storyboardImageUrl || item.coverImageUrl || "";
          const isActive = props.selectedWorkId === item.id;
          const loadingMode = index < 3 ? "eager" : "lazy";
          return (
            <article key={item.id} className="xhs-material-card">
              <button
                type="button"
                className={`xhs-material-card-stage ${isActive ? "is-active" : ""}`}
                onClick={() => props.onSelect(item)}
              >
                {previewImageUrl ? (
                  <ManagedImage
                    className="xhs-material-card-media"
                    src={previewImageUrl}
                    alt={item.title}
                    loadingMode={loadingMode}
                  />
                ) : item.videoUrl ? (
                  <video className="xhs-material-card-media" src={item.videoUrl} muted preload="none" />
                ) : (
                  <span className="xhs-material-card-empty">暂无封面</span>
                )}
                <span className="xhs-material-card-badge xhs-material-card-badge--left">
                  {formatXiaohongshuAccountRoleLabel(item.accountRole)}
                </span>
                <span className="xhs-material-card-badge">{getVideoWorkflowStageLabel(item.workflowStage)}</span>
              </button>
              <div className="xhs-material-card-body">
                <strong>{item.title}</strong>
                <p>{getVideoKindLabel(item.videoKind)} · {item.calendarLabel || item.customTopicName || "自定义选题"}</p>
                <p>{props.formatDateTime(item.createdAt)}</p>
                <div className="xhs-material-card-actions">
                  <button type="button" className="primary-button" onClick={() => props.onSelect(item)}>
                    {isActive ? "查看中" : "查看详情"}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onPreview(item)}>
                    预览媒体
                  </button>
                  <button type="button" className="secondary-button" onClick={() => props.onEdit(item)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => props.onDelete(item.id)}
                    disabled={props.deletingWorkId === item.id}
                  >
                    {props.deletingWorkId === item.id ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getWorkMediaUrls(coverImageUrl: string | undefined, imageUrls: string[]) {
  return Array.from(new Set([coverImageUrl, ...imageUrls].filter((item): item is string => Boolean(item))));
}

function getPreviewIndex(indexMap: Record<string, number>, noteId?: string, total = 0) {
  if (!noteId || total <= 0) {
    return 0;
  }
  const current = indexMap[noteId] ?? 0;
  return ((current % total) + total) % total;
}

function getVideoKindLabel(kind?: XiaohongshuVideoWorkRecord["videoKind"]) {
  switch (kind) {
    case "BRAND_PROMO":
      return "品牌宣传";
    case "SPOKEN_SELLING":
      return "口播带货";
    case "SKIT_SELLING":
      return "短剧带货";
    case "REMIX":
      return "复刻视频";
    default:
      return "视频";
  }
}

function getVideoWorkflowStageLabel(stage?: XiaohongshuVideoWorkRecord["workflowStage"]) {
  switch (stage) {
    case "QUEUED":
      return "排队中";
    case "GENERATING_SCRIPT":
      return "生成剧本";
    case "GENERATING_STORYBOARD":
      return "生成故事板";
    case "WAITING_VIDEO":
      return "待生成视频";
    case "GENERATING_VIDEO":
      return "生成视频";
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    default:
      return "视频";
  }
}
