"use client";

import { useEffect, useMemo, useState } from "react";
import { type UnifiedMaterialLibraryRecord } from "../../../services/collectors";
import { API_BASE_URL, requestBlobByUrl } from "../../../services/http";

type OptionalDateFormatter = (value?: string) => string;
type OptionalNumberFormatter = (value?: number) => string;

type MaterialPreviewState = {
  urls: string[];
  activeIndex: number;
  title: string;
};

export interface ReportMaterialLibraryWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  items: UnifiedMaterialLibraryRecord[];
  onRefresh: () => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}

function isProtectedMaterialSource(sourceUrl?: string) {
  if (!sourceUrl) {
    return false;
  }
  const normalized = sourceUrl.trim().toLowerCase();
  return normalized.startsWith("/")
    || normalized.startsWith(API_BASE_URL.toLowerCase())
    || normalized.includes("/api/collectors/")
    || normalized.includes("/api/brand-growth/");
}

function buildMaterialFileName(sourceUrl: string) {
  try {
    const resolved = new URL(sourceUrl, "https://local.invalid");
    return resolved.pathname.split("/").filter(Boolean).pop() || "asset";
  } catch {
    return "asset";
  }
}

function useMaterialGallery(sourceUrls: string[]) {
  const [items, setItems] = useState<Array<{ sourceUrl: string; objectUrl: string; fileName: string; isLoading: boolean; errorMessage: string }>>([]);

  useEffect(() => {
    if (!sourceUrls.length) {
      setItems([]);
      return;
    }

    let active = true;
    const createdObjectUrls: string[] = [];
    setItems(
      sourceUrls.map((sourceUrl) => ({
        sourceUrl,
        objectUrl: "",
        fileName: "",
        isLoading: true,
        errorMessage: "",
      })),
    );

    void Promise.allSettled(
      sourceUrls.map(async (sourceUrl) => {
        if (!isProtectedMaterialSource(sourceUrl)) {
          return {
            objectUrl: sourceUrl,
            fileName: buildMaterialFileName(sourceUrl),
            shouldRevoke: false,
          };
        }
        const response = await requestBlobByUrl(sourceUrl);
        const objectUrl = URL.createObjectURL(response.blob);
        return {
          objectUrl,
          fileName: response.fileName,
          shouldRevoke: true,
        };
      }),
    ).then((results) => {
      if (!active) {
        return;
      }
      setItems(
        results.map((result, index) => {
          const sourceUrl = sourceUrls[index] || "";
          if (result.status === "fulfilled") {
            if (result.value.shouldRevoke) {
              createdObjectUrls.push(result.value.objectUrl);
            }
            return {
              sourceUrl,
              objectUrl: result.value.objectUrl,
              fileName: result.value.fileName,
              isLoading: false,
              errorMessage: "",
            };
          }
          return {
            sourceUrl,
            objectUrl: "",
            fileName: "",
            isLoading: false,
            errorMessage: result.reason instanceof Error ? result.reason.message : "附件加载失败",
          };
        }),
      );
    });

    return () => {
      active = false;
      createdObjectUrls.forEach((item) => URL.revokeObjectURL(item));
    };
  }, [sourceUrls]);

  return items;
}

function MaterialImageCell(props: {
  item: UnifiedMaterialLibraryRecord;
  onPreview: (payload: MaterialPreviewState) => void;
}) {
  const galleryItems = useMaterialGallery(props.item.imageUrls);
  const previewItems = galleryItems.slice(0, 3);
  const previewableUrls = useMemo(() => galleryItems.map((item) => item.objectUrl).filter(Boolean), [galleryItems]);
  const remainingCount = props.item.imageUrls.length - previewItems.length;

  if (!props.item.imageUrls.length) {
    return <span className="table-cell-empty">-</span>;
  }

  return (
    <div className="report-material-library-images" title={`${props.item.imageUrls.length} 张图片`}>
      {previewItems.map((media, index) => (
        <button
          key={`${props.item.id}-image-${index}`}
          type="button"
          className="report-material-library-image-button"
          title={`${props.item.title}-图片-${index + 1}`}
          onClick={() => media.objectUrl && props.onPreview({
            urls: previewableUrls,
            activeIndex: previewableUrls.indexOf(media.objectUrl),
            title: props.item.title || "素材图片预览",
          })}
          disabled={!media.objectUrl}
        >
          {media.objectUrl ? (
            <img className="report-material-library-image" src={media.objectUrl} alt={`${props.item.title}-图片-${index + 1}`} />
          ) : (
            <span className="report-material-library-image-placeholder">{media.isLoading ? "加载中" : "不可用"}</span>
          )}
          {remainingCount > 0 && index === previewItems.length - 1 ? <span className="report-material-library-image-more">+{remainingCount}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ReportMaterialLibraryWorkspace(props: ReportMaterialLibraryWorkspaceProps) {
  const [preview, setPreview] = useState<MaterialPreviewState | null>(null);
  const activePreviewUrl = preview?.urls[preview.activeIndex] || "";

  return (
    <>
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

        {!props.items.length ? (
          <div className="note-empty-state">
            统一素材库里还没有内容。请先到品牌增长策略 → 收集数据，把小红书或抖音作品加入素材库。
          </div>
        ) : (
          <div className="table-scroll-shell report-material-library-table-shell">
            <table className="soft-table douyin-data-table report-material-library-table">
              <thead>
                <tr>
                  <th>平台类型</th>
                  <th>素材 ID</th>
                  <th>作者昵称</th>
                  <th>标题/文案</th>
                  <th>作品正文</th>
                  <th>发布时间</th>
                  <th>素材类型</th>
                  <th>图片</th>
                  <th>作品链接</th>
                  <th>视频下载地址</th>
                  <th>视频文案</th>
                  <th>点赞</th>
                  <th>评论</th>
                  <th>分享</th>
                  <th>收藏</th>
                  <th>播放</th>
                  <th>入库时间</th>
                  <th>采集时间</th>
                </tr>
              </thead>
              <tbody>
                {props.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.platformLabel}</td>
                    <td>{item.id}</td>
                    <td className="table-cell-wide">
                      <span className="wechat-mp-title-text" title={item.authorName}>{item.authorName || "-"}</span>
                    </td>
                    <td className="table-cell-wide wechat-mp-title-cell">
                      <span className="wechat-mp-title-text" title={item.description || item.title}>{item.title || "-"}</span>
                    </td>
                    <td className="table-cell-wide wechat-mp-title-cell report-material-library-text-cell">
                      <span className="wechat-mp-title-text" title={item.workContent}>{item.workContent || "-"}</span>
                    </td>
                    <td>{item.publishTimeText || "-"}</td>
                    <td>{item.sourceKind || item.mediaTypeLabel}</td>
                    <td className="table-cell-wide">
                      <MaterialImageCell item={item} onPreview={setPreview} />
                    </td>
                    <td>
                      {item.workUrl ? (
                        <a href={item.workUrl} target="_blank" rel="noreferrer" className="note-data-link">
                          打开作品
                        </a>
                      ) : "-"}
                    </td>
                    <td>
                      {item.videoDownloadUrl ? (
                        <a href={item.videoDownloadUrl} target="_blank" rel="noreferrer" className="note-data-link">
                          下载视频
                        </a>
                      ) : "-"}
                    </td>
                    <td className="table-cell-wide wechat-mp-title-cell report-material-library-text-cell">
                      <span className="wechat-mp-title-text" title={item.videoCopy}>{item.videoCopy || "-"}</span>
                    </td>
                    <td>{props.formatCount(item.likeCount)}</td>
                    <td>{props.formatCount(item.commentCount)}</td>
                    <td>{props.formatCount(item.shareCount)}</td>
                    <td>{props.formatCount(item.collectCount)}</td>
                    <td>{props.formatCount(item.playCount)}</td>
                    <td>{props.formatDateTime(item.materialAddedAt)}</td>
                    <td>{props.formatDateTime(item.collectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {preview && activePreviewUrl ? (
        <div className="media-preview-overlay" onClick={() => setPreview(null)}>
          <div className="media-preview-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={() => setPreview(null)}>
              关闭
            </button>
            <div className="media-preview-stage">
              <img src={activePreviewUrl} alt={preview.title} className="media-preview-image" />
            </div>
            <div className="media-preview-caption">
              <strong>{preview.title}</strong>
              <span>{preview.activeIndex + 1} / {preview.urls.length}</span>
            </div>
            {preview.urls.length > 1 ? (
              <div className="strategy-inline-actions" style={{ justifyContent: "center" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPreview((current) => current ? ({
                    ...current,
                    activeIndex: current.activeIndex === 0 ? current.urls.length - 1 : current.activeIndex - 1,
                  }) : current)}
                >
                  上一张
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPreview((current) => current ? ({
                    ...current,
                    activeIndex: current.activeIndex === current.urls.length - 1 ? 0 : current.activeIndex + 1,
                  }) : current)}
                >
                  下一张
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
