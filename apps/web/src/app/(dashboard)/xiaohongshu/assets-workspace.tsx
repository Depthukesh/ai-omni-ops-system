"use client";

import { type XhsCollectedNoteRecord } from "../../../services/collectors";
import { type MediaKind, type MediaLightboxState, type OptionalDateFormatter } from "./shared-types";
import { buildCollectorMediaProxyUrl, getPreviewIndex } from "./work-media-helpers";

type XhsMaterialMediaItem = {
  type: MediaKind;
  previewUrl: string;
  rawUrl: string;
  label: string;
};

export interface AssetsWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isPublishing: boolean;
  items: XhsCollectedNoteRecord[];
  selectedMaterialId: string;
  previewIndexMap: Record<string, number>;
  onRefresh: () => void | Promise<void>;
  onSelectMaterial: (materialId: string) => void;
  onShiftPreview: (noteId: string, total: number, delta: number) => void;
  onOpenLightbox: (payload: MediaLightboxState) => void;
  formatDateTime: OptionalDateFormatter;
}

export function AssetsWorkspace(props: AssetsWorkspaceProps) {
  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading || props.isPublishing}>
            刷新数据
          </button>
        </div>
      </div>

      {props.items.length ? (
        <div className="xhs-material-library">
          <div className="xhs-material-card-grid">
            {props.items.map((item) => {
              const mediaItems = getMaterialMediaItems(item);
              const previewIndex = getPreviewIndex(props.previewIndexMap, item.id, mediaItems.length);
              const previewItem = mediaItems[previewIndex];

              return (
                <article key={item.id} className={`xhs-material-card ${props.selectedMaterialId === item.id ? "is-active" : ""}`}>
                  <button
                    type="button"
                    className="xhs-material-card-stage"
                    onClick={() => {
                      props.onSelectMaterial(item.id);
                      if (previewItem) {
                        props.onOpenLightbox({
                          title: `${item.title} · ${previewItem.label}`,
                          url: previewItem.previewUrl,
                          type: previewItem.type,
                        });
                      }
                    }}
                  >
                    {previewItem ? (
                      previewItem.type === "VIDEO" ? (
                        <video className="xhs-material-card-media" src={previewItem.previewUrl} muted preload="metadata" />
                      ) : (
                        <img className="xhs-material-card-media" src={previewItem.previewUrl} alt={item.title} />
                      )
                    ) : (
                      <span className="xhs-material-card-empty">暂无素材</span>
                    )}
                    <span className="xhs-material-card-badge">对标</span>
                  </button>
                  {mediaItems.length > 1 ? (
                    <div className="xhs-material-card-carousel">
                      <button type="button" className="note-page-button" onClick={() => props.onShiftPreview(item.id, mediaItems.length, -1)}>
                        ‹
                      </button>
                      <span>{previewIndex + 1}/{mediaItems.length}</span>
                      <button type="button" className="note-page-button" onClick={() => props.onShiftPreview(item.id, mediaItems.length, 1)}>
                        ›
                      </button>
                    </div>
                  ) : null}
                  <div className="xhs-material-card-body">
                    <span className="xhs-material-card-author">{item.nickname || "未知作者"}</span>
                    <strong>{item.title}</strong>
                    <p>{item.noteType || "笔记"} · {item.createdAtText || props.formatDateTime(item.collectedAt)}</p>
                    <div className="xhs-material-card-metrics">
                      <span><strong>{formatCountValue(item.likeCount)}</strong>点赞</span>
                      <span><strong>{formatCountValue(item.collectCount)}</strong>收藏</span>
                      <span><strong>{formatCountValue(item.commentCount)}</strong>评论</span>
                      <span><strong>{formatCountValue(item.shareCount)}</strong>分享</span>
                      <span><strong>{formatRatioValue(item.likeCollectRatio)}</strong>赞藏率</span>
                      <span><strong>{formatRatioValue(item.likeCommentRatio)}</strong>赞评率</span>
                      <span><strong>{formatRatioValue(item.shareRatio)}</strong>赞享率</span>
                    </div>
                    <div className="xhs-material-card-actions">
                      {(item.noteUrl || item.sourceUrl) ? (
                        <a href={item.noteUrl || item.sourceUrl} target="_blank" rel="noreferrer" className="xhs-material-detail-button">
                          查看详情
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="note-empty-state">素材库里还没有对标作品。请先到品牌增长策略 → 收集数据 → 小红书，把对标作品加入素材库。</div>
      )}
    </article>
  );
}

function getMaterialMediaItems(item?: XhsCollectedNoteRecord): XhsMaterialMediaItem[] {
  if (!item) {
    return [];
  }

  const items: XhsMaterialMediaItem[] = [];
  if (item.videoUrl) {
    items.push({
      type: "VIDEO",
      previewUrl: buildCollectorMediaProxyUrl(item.videoUrl),
      rawUrl: item.videoUrl,
      label: "视频",
    });
  }

  for (const [index, url] of (item.imageList || []).entries()) {
    items.push({
      type: "IMAGE",
      previewUrl: buildCollectorMediaProxyUrl(url),
      rawUrl: url,
      label: `图片 ${index + 1}`,
    });
  }

  return items;
}

function formatCountValue(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatRatioValue(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(1).replace(/\.0$/, "");
}
