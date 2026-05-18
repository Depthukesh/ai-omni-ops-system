"use client";

import { type XhsCollectedNoteRecord } from "../../../services/collectors";
import { useProtectedMediaAsset } from "../use-protected-media-asset";
import { ManagedImage } from "./managed-image";
import { type MediaKind, type MediaLightboxState, type OptionalDateFormatter } from "./shared-types";
import { useNearViewport } from "./use-near-viewport";
import { buildCollectorMediaProxyUrl, getPreviewIndex, isProtectedCollectorMediaUrl } from "./work-media-helpers";

type XhsMaterialMediaItem = {
  type: MediaKind;
  previewUrl: string;
  rawUrl: string;
  label: string;
};

function useMaterialPreviewAsset(sourceUrl?: string, enabled = true) {
  const isProtectedSource = Boolean(sourceUrl && isProtectedCollectorMediaUrl(sourceUrl));
  const protectedMedia = useProtectedMediaAsset(isProtectedSource ? sourceUrl : undefined, { enabled });

  if (!sourceUrl || !enabled) {
    return {
      displayUrl: "",
      downloadFileName: "",
      isLoading: false,
      errorMessage: "",
    };
  }

  if (!isProtectedSource) {
    return {
      displayUrl: sourceUrl,
      downloadFileName: "",
      isLoading: false,
      errorMessage: "",
    };
  }

  return {
    displayUrl: protectedMedia.objectUrl,
    downloadFileName: protectedMedia.fileName,
    isLoading: protectedMedia.isLoading,
    errorMessage: protectedMedia.errorMessage || "素材加载失败",
  };
}

function MaterialPreviewStage(props: {
  itemTitle: string;
  mediaItem?: XhsMaterialMediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onOpenLightbox: (payload: MediaLightboxState) => void;
}) {
  const { ref, isNearViewport } = useNearViewport<HTMLButtonElement>();
  const shouldLoadPreview = isNearViewport || props.isSelected;
  const media = useMaterialPreviewAsset(props.mediaItem?.previewUrl, shouldLoadPreview);

  return (
    <button
      ref={ref}
      type="button"
      className="xhs-material-card-stage"
      onClick={() => {
        props.onSelect();
        if (props.mediaItem && media.displayUrl) {
          props.onOpenLightbox({
            title: `${props.itemTitle} · ${props.mediaItem.label}`,
            url: media.displayUrl,
            type: props.mediaItem.type,
          });
        }
      }}
    >
      {props.mediaItem ? (
        media.displayUrl ? (
          props.mediaItem.type === "VIDEO" ? (
            <video className="xhs-material-card-media" src={media.displayUrl} muted preload="none" />
          ) : (
            <ManagedImage className="xhs-material-card-media" src={media.displayUrl} alt={props.itemTitle} />
          )
        ) : (
          <span className="xhs-material-card-empty">
            {media.errorMessage || (media.isLoading ? "素材加载中..." : shouldLoadPreview ? "素材暂不可用" : "滚动后加载")}
          </span>
        )
      ) : (
        <span className="xhs-material-card-empty">暂无素材</span>
      )}
      <span className="xhs-material-card-badge">对标</span>
      {media.downloadFileName ? (
        <span className="xhs-material-card-filehint">{media.downloadFileName}</span>
      ) : null}
      {props.isSelected ? <span className="sr-only">已选中</span> : null}
    </button>
  );
}

export interface AssetsWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  brandId: string;
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
              const mediaItems = getMaterialMediaItems(item, props.brandId);
              const previewIndex = getPreviewIndex(props.previewIndexMap, item.id, mediaItems.length);
              const previewItem = mediaItems[previewIndex];

              return (
                <article key={item.id} className={`xhs-material-card ${props.selectedMaterialId === item.id ? "is-active" : ""}`}>
                  <MaterialPreviewStage
                    itemTitle={item.title}
                    mediaItem={previewItem}
                    isSelected={props.selectedMaterialId === item.id}
                    onSelect={() => props.onSelectMaterial(item.id)}
                    onOpenLightbox={props.onOpenLightbox}
                  />
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

function getMaterialMediaItems(item?: XhsCollectedNoteRecord, brandId?: string): XhsMaterialMediaItem[] {
  if (!item) {
    return [];
  }

  const items: XhsMaterialMediaItem[] = [];
  if (item.videoUrl) {
    items.push({
      type: "VIDEO",
      previewUrl: buildCollectorMediaProxyUrl(item.videoUrl, false, brandId),
      rawUrl: item.videoUrl,
      label: "视频",
    });
  }

  for (const [index, url] of (item.imageList || []).entries()) {
    items.push({
      type: "IMAGE",
      previewUrl: buildCollectorMediaProxyUrl(url, false, brandId),
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
