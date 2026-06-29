"use client";

import { type UnifiedMaterialLibraryRecord } from "../../../services/collectors";

type OptionalDateFormatter = (value?: string) => string;
type OptionalNumberFormatter = (value?: number) => string;

export interface ReportMaterialLibraryWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  items: UnifiedMaterialLibraryRecord[];
  onRefresh: () => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}

function renderImageCell(item: UnifiedMaterialLibraryRecord) {
  if (!item.imageUrls.length) {
    return <span className="table-cell-empty">-</span>;
  }

  const previewImages = item.imageUrls.slice(0, 3);
  const remainingCount = item.imageUrls.length - previewImages.length;

  return (
    <div className="report-material-library-images" title={`${item.imageUrls.length} 张图片`}>
      {previewImages.map((url, index) => (
        <a key={`${item.id}-image-${index}`} href={url} target="_blank" rel="noreferrer">
          <img className="report-material-library-image" src={url} alt={`${item.title}-图片-${index + 1}`} />
        </a>
      ))}
      {remainingCount > 0 ? <span className="report-material-library-image-more">+{remainingCount}</span> : null}
    </div>
  );
}

export function ReportMaterialLibraryWorkspace(props: ReportMaterialLibraryWorkspaceProps) {
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
                  <td className="table-cell-wide">{renderImageCell(item)}</td>
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
  );
}
