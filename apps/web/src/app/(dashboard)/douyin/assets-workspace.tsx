"use client";

import { type DouyinCollectedWorkRecord } from "../../../services/collectors";
import { type MediaLightboxState, type MediaKind, type OptionalDateFormatter } from "../xiaohongshu/shared-types";
import { getPreviewIndex } from "../xiaohongshu/work-media-helpers";

type DouyinMaterialMediaItem = {
  type: MediaKind;
  previewUrl: string;
  label: string;
};

export interface DouyinAssetsWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  items: DouyinCollectedWorkRecord[];
  selectedMaterialId: string;
  previewIndexMap: Record<string, number>;
  onRefresh: () => void | Promise<void>;
  onSelectMaterial: (materialId: string) => void;
  onShiftPreview: (materialId: string, total: number, delta: number) => void;
  onOpenLightbox: (payload: MediaLightboxState) => void;
  formatDateTime: OptionalDateFormatter;
}

export function DouyinAssetsWorkspace(props: DouyinAssetsWorkspaceProps) {
  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
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
                    {item.materialAddedAt ? (
                      <span className="xhs-material-card-filehint">入库于 {props.formatDateTime(item.materialAddedAt)}</span>
                    ) : null}
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
                    <span className="xhs-material-card-author">{item.authorName || "未知作者"}</span>
                    <strong>{item.title}</strong>
                    <p>{item.workType || "抖音作品"} · {item.publishTimeText || props.formatDateTime(item.collectedAt)}</p>
                    <div className="xhs-material-card-metrics">
                      <span><strong>{formatCountValue(item.playCount)}</strong>播放</span>
                      <span><strong>{formatCountValue(item.likeCount)}</strong>点赞</span>
                      <span><strong>{formatCountValue(item.collectCount)}</strong>收藏</span>
                      <span><strong>{formatCountValue(item.commentCount)}</strong>评论</span>
                      <span><strong>{formatCountValue(item.shareCount)}</strong>分享</span>
                      <span><strong>{formatRatioValue(item.likeCollectRatio)}</strong>赞藏率</span>
                      <span><strong>{formatRatioValue(item.likeCommentRatio)}</strong>赞评率</span>
                      <span><strong>{formatRatioValue(item.shareRatio)}</strong>分享率</span>
                    </div>
                    <div className="xhs-material-card-actions">
                      {item.workUrl ? (
                        <a href={item.workUrl} target="_blank" rel="noreferrer" className="xhs-material-detail-button">
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
        <div className="note-empty-state">素材库里还没有抖音对标作品。请先到品牌增长策略 → 收集数据 → 抖音，把对标作品加入素材库。</div>
      )}
    </article>
  );
}

function getMaterialMediaItems(item?: DouyinCollectedWorkRecord): DouyinMaterialMediaItem[] {
  if (!item) {
    return [];
  }

  const items: DouyinMaterialMediaItem[] = [];
  if (item.videoUrl) {
    items.push({
      type: "VIDEO",
      previewUrl: item.videoUrl,
      label: "视频",
    });
  }

  for (const [index, url] of (item.imageList || []).entries()) {
    items.push({
      type: "IMAGE",
      previewUrl: url,
      label: `图片 ${index + 1}`,
    });
  }

  if (!items.length && item.coverUrl) {
    items.push({
      type: "IMAGE",
      previewUrl: item.coverUrl,
      label: "封面",
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
