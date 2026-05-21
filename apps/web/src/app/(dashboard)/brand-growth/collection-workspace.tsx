"use client";

import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type {
  AsyncAction,
  FeishuAppConfigForm,
  FeishuBindingForm,
  MediaPreviewState,
  OptionalDateFormatter,
  OptionalNumberFormatter,
  ValueAction,
} from "./shared-types";
import type {
  DouyinCollectedAccountRecord,
  DouyinCollectionWorkspace,
  DouyinCollectedWorkRecord,
  XhsCollectedAccountRecord,
  XhsCollectedNoteRecord,
} from "../../../services/collectors";
import type {
  FeishuAppConfigRecord,
  FeishuAuthStatusRecord,
  FeishuBindingRecord,
} from "../../../services/brand-growth";
import type { DailyHotspotItem, DailyHotspotPlatformRecord } from "../../../services/daily-hotspots";
import { requestBlobByUrl } from "../../../services/http";

export type XiaohongshuCollectionCardKey =
  | "brandAccount"
  | "competitorAccount"
  | "brandWorks"
  | "benchmarkWorks";

export const xiaohongshuCollectionCards: Array<{
  key: XiaohongshuCollectionCardKey;
  label: string;
}> = [
  { key: "brandAccount", label: "品牌账号信息" },
  { key: "competitorAccount", label: "竞品账号信息" },
  { key: "brandWorks", label: "品牌作品信息及数据" },
  { key: "benchmarkWorks", label: "对标作品信息及数据" },
];

export type DouyinCollectionCardKey =
  | "brandAccount"
  | "competitorAccount"
  | "brandWorks"
  | "benchmarkWorks";

export const douyinCollectionCards: Array<{
  key: DouyinCollectionCardKey;
  label: string;
}> = [
  { key: "brandAccount", label: "品牌账号信息" },
  { key: "competitorAccount", label: "竞品账号信息" },
  { key: "brandWorks", label: "品牌作品信息及数据" },
  { key: "benchmarkWorks", label: "对标作品信息及数据" },
];

type DouyinFieldPreviewRow = {
  field: string;
  label: string;
  source: string;
  path: string;
  required: "必需" | "可选";
  patch: "否" | "是";
};

const douyinFieldPreviewMap: Record<DouyinCollectionCardKey, DouyinFieldPreviewRow[]> = {
  brandAccount: [
    { field: "sourceAccountId", label: "账号抓取主键", source: "获取指定用户的信息", path: "data.user.sec_uid", required: "必需", patch: "否" },
    { field: "externalUserId", label: "抖音内部用户 ID", source: "获取指定用户的信息", path: "data.user.uid", required: "必需", patch: "否" },
    { field: "accountName", label: "用户昵称", source: "获取指定用户的信息", path: "data.user.nickname", required: "必需", patch: "否" },
    { field: "username", label: "抖音号", source: "获取指定用户的信息", path: "data.user.unique_id", required: "可选", patch: "否" },
    { field: "description", label: "个人签名/简介", source: "获取指定用户的信息", path: "data.user.signature", required: "可选", patch: "否" },
    { field: "avatar", label: "头像 300 尺寸", source: "获取指定用户的信息", path: "data.user.avatar_300x300.url_list[0]", required: "可选", patch: "否" },
    { field: "fanCount", label: "粉丝数", source: "获取指定用户的信息", path: "data.user.follower_count", required: "必需", patch: "否" },
    { field: "followCount", label: "关注数", source: "获取指定用户的信息", path: "data.user.following_count", required: "可选", patch: "否" },
    { field: "likedCount", label: "获赞总数", source: "获取指定用户的信息", path: "data.user.total_favorited", required: "可选", patch: "否" },
    { field: "postedCount", label: "作品数", source: "获取指定用户的信息", path: "data.user.aweme_count", required: "可选", patch: "否" },
  ],
  competitorAccount: [
    { field: "sourceAccountId", label: "账号抓取主键", source: "获取指定用户的信息", path: "data.user.sec_uid", required: "必需", patch: "否" },
    { field: "externalUserId", label: "抖音内部用户 ID", source: "获取指定用户的信息", path: "data.user.uid", required: "必需", patch: "否" },
    { field: "accountName", label: "用户昵称", source: "获取指定用户的信息", path: "data.user.nickname", required: "必需", patch: "否" },
    { field: "username", label: "抖音号", source: "获取指定用户的信息", path: "data.user.unique_id", required: "可选", patch: "否" },
    { field: "description", label: "账号简介", source: "获取指定用户的信息", path: "data.user.signature", required: "可选", patch: "否" },
    { field: "avatar", label: "头像 300 尺寸", source: "获取指定用户的信息", path: "data.user.avatar_300x300.url_list[0]", required: "可选", patch: "否" },
    { field: "followCount", label: "关注数", source: "获取指定用户的信息", path: "data.user.following_count", required: "可选", patch: "否" },
    { field: "fanCount", label: "粉丝数", source: "获取指定用户的信息", path: "data.user.follower_count", required: "必需", patch: "否" },
    { field: "likedCount", label: "获赞总数", source: "获取指定用户的信息", path: "data.user.total_favorited", required: "可选", patch: "否" },
    { field: "postedCount", label: "作品数", source: "获取指定用户的信息", path: "data.user.aweme_count", required: "可选", patch: "否" },
  ],
  brandWorks: [
    { field: "workId", label: "作品主键", source: "获取用户主页作品数据", path: "data.aweme_list[].aweme_id", required: "必需", patch: "否" },
    { field: "description", label: "作品描述/文案", source: "获取用户主页作品数据", path: "data.aweme_list[].desc", required: "必需", patch: "否" },
    { field: "publishTimeText", label: "发布时间戳", source: "获取用户主页作品数据", path: "data.aweme_list[].create_time", required: "可选", patch: "否" },
    { field: "mediaType", label: "媒体类型", source: "获取用户主页作品数据", path: "data.aweme_list[].media_type", required: "可选", patch: "否" },
    { field: "durationMs", label: "视频时长(毫秒)", source: "获取用户主页作品数据", path: "data.aweme_list[].duration", required: "可选", patch: "否" },
    { field: "likeCount", label: "点赞数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.digg_count", required: "可选", patch: "否" },
    { field: "commentCount", label: "评论数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.comment_count", required: "可选", patch: "否" },
    { field: "shareCount", label: "分享数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.share_count", required: "可选", patch: "否" },
    { field: "collectCount", label: "收藏数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.collect_count", required: "可选", patch: "否" },
    { field: "recommendCount", label: "推荐数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.recommend_count", required: "可选", patch: "否" },
    { field: "imageList", label: "图文列表", source: "获取用户主页作品数据", path: "data.aweme_list[].images", required: "可选", patch: "否" },
    { field: "awemeType", label: "作品类型", source: "获取用户主页作品数据", path: "data.aweme_list[].aweme_type", required: "可选", patch: "否" },
    { field: "videoUrl", label: "视频下载地址", source: "获取用户主页作品数据", path: "data.aweme_list[].video_download_addr", required: "可选", patch: "否" },
  ],
  benchmarkWorks: [
    { field: "description", label: "作品描述", source: "获取单个作品数据 V3", path: "data.aweme_detail.desc", required: "必需", patch: "否" },
    { field: "durationMs", label: "作品时长", source: "获取单个作品数据 V3", path: "data.aweme_detail.video.duration", required: "可选", patch: "否" },
    { field: "coverUrl", label: "视频封面", source: "获取单个作品数据 V3", path: "data.aweme_detail.video.cover.url_list[0]", required: "可选", patch: "否" },
    { field: "videoUrl", label: "视频播放地址", source: "获取单个作品数据 V3", path: "data.aweme_detail.video.play_addr.url_list[0]", required: "可选", patch: "否" },
    { field: "authorName", label: "作者昵称", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.nickname", required: "可选", patch: "否" },
    { field: "authorUniqueId", label: "作者抖音号", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.unique_id", required: "可选", patch: "否" },
    { field: "authorFollowerCount", label: "作者粉丝数", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.follower_count", required: "可选", patch: "否" },
    { field: "authorLikedCount", label: "作者总获赞", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.total_favorited", required: "可选", patch: "否" },
    { field: "authorAvatar", label: "作者头像", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.avatar_300x300.url_list[0]", required: "可选", patch: "否" },
    { field: "playCount", label: "播放量", source: "获取作品的统计数据", path: "data.statistics_list[].play_count", required: "必需", patch: "是" },
    { field: "likeCount", label: "点赞数", source: "获取单个作品数据 V3 / 统计数据", path: "data.aweme_detail.statistics.digg_count / data.statistics_list[].digg_count", required: "可选", patch: "是" },
    { field: "shareCount", label: "分享数", source: "获取单个作品数据 V3 / 统计数据", path: "data.aweme_detail.statistics.share_count / data.statistics_list[].share_count", required: "可选", patch: "是" },
    { field: "downloadCount", label: "下载数", source: "获取作品的统计数据", path: "data.statistics_list[].download_count", required: "可选", patch: "是" },
    { field: "commentCount", label: "评论数", source: "获取单个作品数据 V3", path: "data.aweme_detail.statistics.comment_count", required: "可选", patch: "否" },
  ],
};

export interface BrandGrowthCollectionWorkspaceProps {
  activePage: "feishuCollection" | "xiaohongshuCollection" | "douyinCollection" | "dailyHotspot";
  templateUrl: string;
  activeXhsCollectionCard: XiaohongshuCollectionCardKey;
  onXhsCollectionCardChange: ValueAction<XiaohongshuCollectionCardKey>;
  activeDouyinCollectionCard: DouyinCollectionCardKey;
  onDouyinCollectionCardChange: ValueAction<DouyinCollectionCardKey>;
  feishuBinding: FeishuBindingRecord | null;
  feishuAppConfig: FeishuAppConfigRecord | null;
  feishuAuthStatus: FeishuAuthStatusRecord | null;
  feishuBindingForm: FeishuBindingForm;
  setFeishuBindingForm: Dispatch<SetStateAction<FeishuBindingForm>>;
  feishuAppConfigForm: FeishuAppConfigForm;
  setFeishuAppConfigForm: Dispatch<SetStateAction<FeishuAppConfigForm>>;
  canSyncFeishuWorkspace: boolean;
  isHydrating: boolean;
  isSavingFeishuAppConfig: boolean;
  isSavingFeishuBinding: boolean;
  isSyncingFeishuWorkspace: boolean;
  douyinWorkspace: DouyinCollectionWorkspace;
  isSyncingDouyinWorkspace: boolean;
  douyinSyncForm: {
    brandAccountLinks: string;
    competitorAccountLinks: string;
    benchmarkAwemeIds: string;
  };
  setDouyinSyncForm: Dispatch<SetStateAction<{
    brandAccountLinks: string;
    competitorAccountLinks: string;
    benchmarkAwemeIds: string;
  }>>;
  onSaveFeishuAppConfig: AsyncAction;
  onStartFeishuAuth: AsyncAction;
  onSaveFeishuBinding: AsyncAction;
  onSyncFeishuWorkspace: AsyncAction;
  onSyncDouyinWorkspace: AsyncAction;
  sortedBrandAccounts: XhsCollectedAccountRecord[];
  sortedCompetitorAccounts: XhsCollectedAccountRecord[];
  sortedBrandNotes: XhsCollectedNoteRecord[];
  sortedBenchmarkNotes: XhsCollectedNoteRecord[];
  sortedDouyinBrandAccounts: DouyinCollectedAccountRecord[];
  sortedDouyinCompetitorAccounts: DouyinCollectedAccountRecord[];
  sortedDouyinBrandWorks: DouyinCollectedWorkRecord[];
  sortedDouyinBenchmarkWorks: DouyinCollectedWorkRecord[];
  brandNotesPage: number;
  setBrandNotesPage: Dispatch<SetStateAction<number>>;
  brandNotesPageCount: number;
  brandNotesPageSize: number;
  setBrandNotesPageSize: Dispatch<SetStateAction<number>>;
  paginatedBrandNotes: XhsCollectedNoteRecord[];
  addingMaterialAssetId: string;
  onAddBenchmarkNoteToMaterial: ValueAction<string>;
  onPreviewMedia: ValueAction<MediaPreviewState>;
  buildFeishuMediaProxyUrl: (sourceUrl?: string, download?: boolean) => string;
  formatDateTime: OptionalDateFormatter;
  formatDateLabel: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  formatMetric: OptionalNumberFormatter;
  selectedHotspotDate: string;
  hotspotAvailableDates: string[];
  activeHotspotRecord?: DailyHotspotPlatformRecord;
  sortedHotspotItems: DailyHotspotItem[];
  paginatedHotspotItems: DailyHotspotItem[];
  hotspotPage: number;
  setHotspotPage: Dispatch<SetStateAction<number>>;
  hotspotPageCount: number;
  hotspotPageSize: number;
  setHotspotPageSize: Dispatch<SetStateAction<number>>;
  isSyncingDailyHotspots: boolean;
  onDailyHotspotDateChange: ValueAction<string>;
  onSyncDailyHotspots: (platformTitles?: string[]) => void | Promise<void>;
  formatHotspotHeat: OptionalNumberFormatter;
}

function useProtectedMediaAsset(sourceUrl?: string) {
  const [objectUrl, setObjectUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sourceUrl) {
      setObjectUrl("");
      setFileName("");
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    let active = true;
    let currentObjectUrl = "";
    setIsLoading(true);
    setErrorMessage("");

    void requestBlobByUrl(sourceUrl)
      .then(({ blob, fileName: resolvedFileName }) => {
        if (!active) {
          return;
        }
        currentObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(currentObjectUrl);
        setFileName(resolvedFileName);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setObjectUrl("");
        setFileName("");
        setErrorMessage(error instanceof Error ? error.message : "附件加载失败");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [sourceUrl]);

  return {
    objectUrl,
    fileName,
    isLoading,
    errorMessage,
  };
}

function ProtectedImageCard(props: {
  sourceUrl: string;
  title: string;
  onPreviewMedia: ValueAction<MediaPreviewState>;
}) {
  const media = useProtectedMediaAsset(props.sourceUrl);

  if (media.errorMessage) {
    return <div className="note-empty-media">{media.errorMessage}</div>;
  }

  return (
    <div className="note-image-card">
      <button
        type="button"
        className="note-image-thumb"
        title={props.title}
        onClick={() => media.objectUrl && props.onPreviewMedia({ url: media.objectUrl, title: props.title })}
        disabled={!media.objectUrl}
      >
        {media.objectUrl ? <img src={media.objectUrl} alt={props.title} /> : <span>{media.isLoading ? "附件加载中..." : "附件暂不可用"}</span>}
      </button>
      {media.objectUrl ? (
        <a href={media.objectUrl} download={media.fileName || undefined} className="note-data-link">
          下载附件
        </a>
      ) : (
        <span className="note-data-link">{media.isLoading ? "准备下载..." : "下载不可用"}</span>
      )}
    </div>
  );
}

function ProtectedVideoPanel(props: {
  sourceUrl?: string;
}) {
  const media = useProtectedMediaAsset(props.sourceUrl);

  if (!props.sourceUrl) {
    return null;
  }

  return (
    <>
      {media.objectUrl ? (
        <div className="note-video-shell">
          <video
            controls
            preload="metadata"
            className="note-video-player"
            src={media.objectUrl}
          />
        </div>
      ) : media.errorMessage ? (
        <div className="note-empty-media">{media.errorMessage}</div>
      ) : (
        <div className="note-empty-media">视频加载中...</div>
      )}
      <div className="note-media-actions">
        {media.objectUrl ? (
          <a
            href={media.objectUrl}
            target="_blank"
            rel="noreferrer"
            className="note-data-link"
          >
            查看视频附件
          </a>
        ) : null}
        {media.objectUrl ? (
          <a href={media.objectUrl} download={media.fileName || undefined} className="note-data-link">
            下载视频附件
          </a>
        ) : null}
      </div>
    </>
  );
}

function DouyinFieldPreviewTable(props: {
  rows: DouyinFieldPreviewRow[];
}) {
  return (
    <div className="collection-field-preview">
      <table className="soft-table compact-table">
        <thead>
          <tr>
            <th>字段</th>
            <th>含义</th>
            <th>来源接口</th>
            <th>原始路径</th>
            <th>必需</th>
            <th>统计补丁</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={`${row.field}-${row.path}`}>
              <td><code>{row.field}</code></td>
              <td>{row.label}</td>
              <td>{row.source}</td>
              <td><code>{row.path}</code></td>
              <td>{row.required}</td>
              <td>{row.patch}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DouyinAccountPreviewCard(props: {
  item: DouyinCollectedAccountRecord;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  const item = props.item;
  return (
    <article className="collection-sync-card">
      <div className="collection-sync-head">
        <div className="collection-sync-title">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.accountName || "抖音头像"}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : null}
            <div>
              <strong>{item.accountName || "-"}</strong>
              <div className="personal-meta">{item.username || item.shortId || "未提供抖音号"}</div>
            </div>
          </div>
          <span>
            {item.accountLink ? (
              <a href={item.accountLink} target="_blank" rel="noreferrer">
                {item.accountLink}
              </a>
            ) : (
              "未提供主页链接"
            )}
          </span>
        </div>
        <span className="collection-sync-time">{props.formatDateTime(item.collectedAt)}</span>
      </div>
      <div className="collection-sync-grid">
        <div className="collection-sync-item">
          <span>sec_uid</span>
          <strong className="collection-sync-code">{item.sourceAccountId}</strong>
        </div>
        <div className="collection-sync-item">
          <span>用户 ID</span>
          <strong className="collection-sync-code">{item.externalUserId || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>抖音号</span>
          <strong>{item.username || item.shortId || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作品数</span>
          <strong>{props.formatCount(item.postedCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>粉丝数</span>
          <strong>{props.formatCount(item.fanCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>获赞数</span>
          <strong>{props.formatCount(item.likedCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>关注数</span>
          <strong>{props.formatCount(item.followCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>IP 属地</span>
          <strong>{item.ipLocation || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>认证信息</span>
          <strong>{item.enterpriseVerifyReason || item.customVerify || "-"}</strong>
        </div>
        <div className="collection-sync-item collection-sync-item--full">
          <span>账号简介</span>
          <strong>{item.description || "未提供简介"}</strong>
        </div>
      </div>
    </article>
  );
}

function DouyinWorkPreviewCard(props: {
  item: DouyinCollectedWorkRecord;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  formatMetric: OptionalNumberFormatter;
}) {
  const item = props.item;
  const hashtagText = item.hashtags?.length ? item.hashtags.join(" / ") : "无";
  return (
    <article className="collection-sync-card">
      <div className="collection-sync-head">
        <div className="collection-sync-title">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {item.authorAvatar ? (
              <img
                src={item.authorAvatar}
                alt={item.authorName || "作者头像"}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : null}
            <div>
              <strong>{item.title || "-"}</strong>
              <div className="personal-meta">{item.authorName || "-"}</div>
            </div>
          </div>
          <span>
            {item.workUrl ? (
              <a href={item.workUrl} target="_blank" rel="noreferrer">
                {item.workUrl}
              </a>
            ) : (
              "未提供作品链接"
            )}
          </span>
        </div>
        <div className="collection-sync-actions">
          <span className="collection-sync-time">{props.formatDateTime(item.collectedAt)}</span>
          {item.statsPatched ? <span className="archive-pill status-ready">统计已补丁</span> : null}
        </div>
      </div>
      <div className="collection-sync-grid">
        <div className="collection-sync-item">
          <span>作品 ID</span>
          <strong className="collection-sync-code">{item.workId}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作品类型</span>
          <strong>{item.workType || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>媒体类型</span>
          <strong>{item.mediaType ?? "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者</span>
          <strong>{item.authorName || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者抖音号</span>
          <strong>{item.authorUniqueId || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>发布时间</span>
          <strong>{item.publishTimeText || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>时长</span>
          <strong>{item.durationMs ?? "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>播放</span>
          <strong>{props.formatCount(item.playCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>点赞</span>
          <strong>{props.formatCount(item.likeCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>评论</span>
          <strong>{props.formatCount(item.commentCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>收藏</span>
          <strong>{props.formatCount(item.collectCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>分享</span>
          <strong>{props.formatCount(item.shareCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>下载</span>
          <strong>{props.formatCount(item.downloadCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>推荐</span>
          <strong>{props.formatCount(item.recommendCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>赞藏率</span>
          <strong>{props.formatMetric(item.likeCollectRatio)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>分享率</span>
          <strong>{props.formatMetric(item.shareRatio)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>配乐</span>
          <strong>{item.musicTitle || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者粉丝</span>
          <strong>{props.formatCount(item.authorFollowerCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者总获赞</span>
          <strong>{props.formatCount(item.authorLikedCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>爆款判断</span>
          <strong>{item.isExplosive || "-"}</strong>
        </div>
        <div className="collection-sync-item collection-sync-item--full">
          <span>话题标签</span>
          <strong>{hashtagText}</strong>
        </div>
        <div className="collection-sync-item collection-sync-item--full">
          <span>正文摘要</span>
          <strong>{item.description || "暂无正文内容"}</strong>
        </div>
        {item.coverUrl ? (
          <div className="collection-sync-item collection-sync-item--full">
            <span>封面</span>
            <a href={item.coverUrl} target="_blank" rel="noreferrer" className="note-data-link">
              查看封面
            </a>
          </div>
        ) : null}
        {item.videoUrl ? (
          <div className="collection-sync-item collection-sync-item--full">
            <span>视频地址</span>
            <a href={item.videoUrl} target="_blank" rel="noreferrer" className="note-data-link">
              打开视频
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DouyinSubmitPanel(props: {
  title: string;
  helperText: string;
  value: string;
  placeholder: string;
  docs: Array<{ label: string; href: string }>;
  isSubmitting: boolean;
  onChange: ValueAction<string>;
  onSubmit: AsyncAction;
}) {
  return (
    <article className="light-data-panel" style={{ marginBottom: 16 }}>
      <div className="collection-result-head">
        <div>
          <h3>{props.title}</h3>
          <p>{props.helperText}</p>
        </div>
        <button type="button" className="primary-button" onClick={() => void props.onSubmit()} disabled={props.isSubmitting}>
          {props.isSubmitting ? "提交中..." : "提交"}
        </button>
      </div>
      <div className="strategy-chip-row" style={{ marginBottom: 12 }}>
        {props.docs.map((item) => (
          <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="secondary-button">
            {item.label}
          </a>
        ))}
      </div>
      <label className="field">
        <span>{props.title}</span>
        <textarea
          rows={4}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
        />
      </label>
    </article>
  );
}

function ScrollableTableShell(props: {
  children: ReactNode;
}) {
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const contentNode = contentRef.current;
    if (!contentNode) {
      return;
    }

    const syncWidth = () => {
      setScrollWidth(contentNode.scrollWidth);
    };

    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(contentNode);
    return () => observer.disconnect();
  }, []);

  const syncScroll = (source: "top" | "bottom") => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) {
      return;
    }
    if (source === "top") {
      bottom.scrollLeft = top.scrollLeft;
      return;
    }
    top.scrollLeft = bottom.scrollLeft;
  };

  return (
    <div className="table-scroll-shell">
      <div className="table-scrollbar-top" ref={topScrollRef} onScroll={() => syncScroll("top")}>
        <div style={{ width: `${scrollWidth}px` }} />
      </div>
      <div className="table-scrollbar-body" ref={bottomScrollRef} onScroll={() => syncScroll("bottom")}>
        <div ref={contentRef}>
          {props.children}
        </div>
      </div>
    </div>
  );
}

function ExpandableTextCell(props: {
  value?: string;
  emptyText?: string;
  compactRows?: 2 | 3;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = String(props.value || "").trim();
  if (!text) {
    return <span className="table-cell-empty">{props.emptyText || "-"}</span>;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  if (expanded) {
    return (
      <div className="table-text-cell is-expanded" data-rows={props.compactRows || 2}>
        <div className="table-text-actions">
          <button type="button" className="table-mini-button" onClick={() => void handleCopy()}>
            {copied ? "已复制" : "复制"}
          </button>
          <button type="button" className="table-mini-button" onClick={() => setExpanded(false)}>
            收起
          </button>
        </div>
        <div className="table-text-content">{text}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="table-text-cell"
      data-rows={props.compactRows || 2}
      onClick={() => setExpanded(true)}
      title="点击展开查看"
    >
      {text}
    </button>
  );
}

function AvatarPreviewLink(props: {
  src?: string;
  alt: string;
}) {
  if (!props.src) {
    return <span className="table-cell-empty">-</span>;
  }

  return (
    <a href={props.src} target="_blank" rel="noreferrer" className="table-avatar-link" title="点击查看原图">
      <img src={props.src} alt={props.alt} className="table-avatar-thumb" />
      <span>预览</span>
    </a>
  );
}

function DouyinAccountTable(props: {
  items: DouyinCollectedAccountRecord[];
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  return (
    <ScrollableTableShell>
      <table className="soft-table douyin-data-table">
        <thead>
          <tr>
            <th>昵称</th>
            <th>抖音号</th>
            <th>简介</th>
            <th>头像</th>
            <th>粉丝数</th>
            <th>关注数</th>
            <th>作品数</th>
            <th>总获赞</th>
            <th>主页链接</th>
            <th>采集时间</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td>{item.accountName || "-"}</td>
              <td>{item.username || item.shortId || "-"}</td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.description} emptyText="未提供简介" compactRows={2} />
              </td>
              <td>
                <AvatarPreviewLink src={item.avatar} alt={`${item.accountName || "抖音账号"}头像`} />
              </td>
              <td>{props.formatCount(item.fanCount)}</td>
              <td>{props.formatCount(item.followCount)}</td>
              <td>{props.formatCount(item.postedCount)}</td>
              <td>{props.formatCount(item.likedCount)}</td>
              <td>
                {item.accountLink ? (
                  <a href={item.accountLink} target="_blank" rel="noreferrer" className="note-data-link">
                    打开主页
                  </a>
                ) : "-"}
              </td>
              <td>{props.formatDateTime(item.collectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableShell>
  );
}

function DouyinBrandWorksTable(props: {
  items: DouyinCollectedWorkRecord[];
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  return (
    <ScrollableTableShell>
      <table className="soft-table douyin-data-table">
        <thead>
          <tr>
            <th>作品 ID</th>
            <th>作品描述/文案</th>
            <th>发布时间</th>
            <th>媒体类型</th>
            <th>时长(毫秒)</th>
            <th>点赞</th>
            <th>评论</th>
            <th>分享</th>
            <th>收藏</th>
            <th>推荐</th>
            <th>图文列表</th>
            <th>作品类型</th>
            <th>视频下载地址</th>
            <th>采集时间</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td><code>{item.workId}</code></td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.description || item.title} emptyText="暂无作品描述" compactRows={2} />
              </td>
              <td>{item.publishTimeText || "-"}</td>
              <td>{item.mediaType ?? "-"}</td>
              <td>{item.durationMs ?? "-"}</td>
              <td>{props.formatCount(item.likeCount)}</td>
              <td>{props.formatCount(item.commentCount)}</td>
              <td>{props.formatCount(item.shareCount)}</td>
              <td>{props.formatCount(item.collectCount)}</td>
              <td>{props.formatCount(item.recommendCount)}</td>
              <td>{item.imageList?.length ? `${item.imageList.length} 张` : "-"}</td>
              <td>{(item.awemeType ?? item.workType) || "-"}</td>
              <td>
                {item.videoUrl ? (
                  <a href={item.videoUrl} target="_blank" rel="noreferrer" className="note-data-link">
                    打开视频
                  </a>
                ) : "-"}
              </td>
              <td>{props.formatDateTime(item.collectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableShell>
  );
}

function DouyinBenchmarkWorksTable(props: {
  items: DouyinCollectedWorkRecord[];
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  return (
    <ScrollableTableShell>
      <table className="soft-table douyin-data-table">
        <thead>
          <tr>
            <th>作品 ID</th>
            <th>作品描述</th>
            <th>作品时长</th>
            <th>视频封面</th>
            <th>视频播放地址</th>
            <th>作品点赞数</th>
            <th>作品评论数</th>
            <th>作品分享数</th>
            <th>作品收藏数</th>
            <th>作者昵称</th>
            <th>作者抖音号</th>
            <th>作者粉丝数</th>
            <th>作者总获赞</th>
            <th>作者头像</th>
            <th>播放量</th>
            <th>采集时间</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td><code>{item.workId}</code></td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.description || item.title} emptyText="暂无作品描述" compactRows={2} />
              </td>
              <td>{item.durationMs ?? "-"}</td>
              <td>
                <AvatarPreviewLink src={item.coverUrl} alt={`${item.title || item.workId}封面`} />
              </td>
              <td>
                {item.videoUrl ? (
                  <a href={item.videoUrl} target="_blank" rel="noreferrer" className="note-data-link">
                    打开视频
                  </a>
                ) : "-"}
              </td>
              <td>{props.formatCount(item.likeCount)}</td>
              <td>{props.formatCount(item.commentCount)}</td>
              <td>{props.formatCount(item.shareCount)}</td>
              <td>{props.formatCount(item.collectCount)}</td>
              <td>{item.authorName || "-"}</td>
              <td>{item.authorUniqueId || "-"}</td>
              <td>{props.formatCount(item.authorFollowerCount)}</td>
              <td>{props.formatCount(item.authorLikedCount)}</td>
              <td>
                <AvatarPreviewLink src={item.authorAvatar} alt={`${item.authorName || "作者"}头像`} />
              </td>
              <td>{props.formatCount(item.playCount)}</td>
              <td>{props.formatDateTime(item.collectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableShell>
  );
}

export function BrandGrowthCollectionWorkspace(props: BrandGrowthCollectionWorkspaceProps) {
  if (props.activePage !== "dailyHotspot") {
    const xiaohongshuSyncedCount =
      props.sortedBrandAccounts.length +
      props.sortedCompetitorAccounts.length +
      props.sortedBrandNotes.length +
      props.sortedBenchmarkNotes.length;
    const douyinSyncedCount =
      props.sortedDouyinBrandAccounts.length +
      props.sortedDouyinCompetitorAccounts.length +
      props.sortedDouyinBrandWorks.length +
      props.sortedDouyinBenchmarkWorks.length;
    const feishuConfigReady = Boolean(props.feishuAppConfig?.appId || props.feishuAppConfigForm.appId.trim());
    const feishuBindingReady = Boolean(props.feishuBinding?.wikiUrl || props.feishuBindingForm.wikiUrl.trim());
    const douyinPreviewItems =
      props.activeDouyinCollectionCard === "brandAccount"
        ? props.sortedDouyinBrandAccounts
        : props.activeDouyinCollectionCard === "competitorAccount"
          ? props.sortedDouyinCompetitorAccounts
          : props.activeDouyinCollectionCard === "brandWorks"
            ? props.sortedDouyinBrandWorks
            : props.sortedDouyinBenchmarkWorks;

    return (
      <div className="strategy-collection-stack">
        {props.activePage === "feishuCollection" ? (
          <article className="workspace-panel strategy-page-card feishu-binding-panel">
          <div className="strategy-card-toolbar">
            <div>
              <strong>飞书配置</strong>
              <p>当前页面只负责飞书应用配置、副本绑定和同步前置设置。</p>
            </div>
            <a href={props.templateUrl} target="_blank" rel="noreferrer" className="secondary-button">
              打开飞书模板
            </a>
          </div>
          <div className="strategy-chip-row">
            <span className={`archive-pill ${feishuConfigReady ? "status-ready" : "status-pending"}`}>
              {feishuConfigReady ? "应用已配置" : "待配置应用"}
            </span>
            <span className={`archive-pill ${props.feishuAuthStatus?.connected ? "status-ready" : "status-pending"}`}>
              {props.feishuAuthStatus?.connected ? "飞书已连接" : "待连接飞书"}
            </span>
            <span className={`archive-pill ${feishuBindingReady ? "status-ready" : "status-pending"}`}>
              {feishuBindingReady ? "副本已绑定" : "待绑定副本"}
            </span>
            <span className={`archive-pill ${props.canSyncFeishuWorkspace ? "status-ready" : "status-pending"}`}>
              {props.canSyncFeishuWorkspace ? "可执行同步" : "待完成同步前置"}
            </span>
          </div>
          <div className="feishu-compact-steps">
            <span>01 配置应用</span>
            <span>02 连接飞书</span>
            <span>03 绑定副本</span>
            <span>04 同步数据</span>
          </div>
          <div className="form-grid two-column">
            <label className="field">
              <span>App ID</span>
              <input
                value={props.feishuAppConfigForm.appId}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, appId: event.target.value }))
                }
                placeholder="请输入当前用户自己的飞书 App ID"
              />
            </label>
            <label className="field">
              <span>App Secret</span>
              <input
                type="password"
                value={props.feishuAppConfigForm.appSecret}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, appSecret: event.target.value }))
                }
                placeholder={props.feishuAppConfig?.appSecretMasked || "请输入当前用户自己的飞书 App Secret"}
              />
            </label>
            <label className="field field-full">
              <span>授权回调地址</span>
              <input
                value={props.feishuAppConfigForm.redirectUri}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, redirectUri: event.target.value }))
                }
                placeholder="例如 https://17ai.site/api/auth/feishu/oauth/callback"
              />
            </label>
            <label className="field field-full">
              <span>授权 Scope</span>
              <input
                value={props.feishuAppConfigForm.scope}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, scope: event.target.value }))
                }
                placeholder="默认会自动填入读取 Base/Wiki 所需 scope"
              />
            </label>
            <label className="field field-full">
              <span>飞书多维表格链接</span>
              <input
                value={props.feishuBindingForm.wikiUrl}
                onChange={(event) =>
                  props.setFeishuBindingForm((current) => ({ ...current, wikiUrl: event.target.value }))
                }
                placeholder="粘贴飞书 wiki 或多维表格副本链接，例如 https://.../wiki/... 或 https://.../base/..."
              />
            </label>
          </div>
          <div className="feishu-binding-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void props.onSaveFeishuAppConfig()}
              disabled={props.isHydrating || props.isSavingFeishuAppConfig}
            >
              {props.isSavingFeishuAppConfig ? "保存中..." : "保存应用配置"}
            </button>
            <button type="button" className="secondary-button" onClick={() => void props.onStartFeishuAuth()}>
              {props.feishuAuthStatus?.connected ? "更换飞书账号" : "连接飞书"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void props.onSaveFeishuBinding()}
              disabled={props.isHydrating || props.isSavingFeishuBinding}
            >
              {props.isSavingFeishuBinding ? "绑定中..." : "保存绑定"}
            </button>
          </div>
          </article>
        ) : null}

        {props.activePage === "xiaohongshuCollection" ? (
          <article className="workspace-panel strategy-page-card strategy-collection-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>小红书</strong>
              <p>小红书板块只保留同步入口与结果展示，飞书应用和副本绑定已移动到独立飞书配置板块。</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void props.onSyncFeishuWorkspace()}
              disabled={props.isHydrating || props.isSyncingFeishuWorkspace || !props.canSyncFeishuWorkspace}
            >
              {props.isSyncingFeishuWorkspace ? "同步中..." : "同步数据"}
            </button>
          </div>
          <div className="strategy-chip-row">
            <span className={`archive-pill ${xiaohongshuSyncedCount ? "status-ready" : "status-pending"}`}>
              已同步 {xiaohongshuSyncedCount} 条
            </span>
            <span className={`archive-pill ${props.canSyncFeishuWorkspace ? "status-ready" : "status-pending"}`}>
              {props.canSyncFeishuWorkspace ? "可重新同步" : "需先完成飞书配置"}
            </span>
          </div>
          <div className="strategy-chip-row">
            {xiaohongshuCollectionCards.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`filter-chip ${props.activeXhsCollectionCard === item.key ? "is-active" : ""}`}
                onClick={() => props.onXhsCollectionCardChange(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {props.activeXhsCollectionCard === "brandAccount" ? (
            <article className="light-data-panel">
              <div className="collection-result-head">
                <div>
                  <h3>品牌账号信息</h3>
                  <p>直接展示飞书多维表格同步回来的品牌账号结果。</p>
                </div>
                <span className={`archive-pill ${props.sortedBrandAccounts.length ? "status-ready" : "status-pending"}`}>
                  已同步 {props.sortedBrandAccounts.length} 条
                </span>
              </div>
              <div className="collection-card-list">
                {props.sortedBrandAccounts.length ? (
                  props.sortedBrandAccounts.map((item) => (
                    <article key={item.id} className="collection-sync-card">
                      <div className="collection-sync-head">
                        <div className="collection-sync-title">
                          <strong>{item.accountName || "-"}</strong>
                          <span>
                            {item.sourceAccountLink ? (
                              <a href={item.sourceAccountLink} target="_blank" rel="noreferrer">
                                {item.sourceAccountLink}
                              </a>
                            ) : (
                              "未提供主页链接"
                            )}
                          </span>
                        </div>
                        <span className="collection-sync-time">{props.formatDateTime(item.collectedAt)}</span>
                      </div>
                      <div className="collection-sync-grid">
                        <div className="collection-sync-item">
                          <span>外部用户 ID</span>
                          <strong className="collection-sync-code">{item.externalUserId || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>作品数</span>
                          <strong>{props.formatCount(item.postedCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>粉丝数</span>
                          <strong>{props.formatCount(item.fanCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>获赞数</span>
                          <strong>{props.formatCount(item.likedCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>收藏数</span>
                          <strong>{props.formatCount(item.collectedCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>IP 属地</span>
                          <strong>{item.ipLocation || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>关注数</span>
                          <strong>{props.formatCount(item.followCount)}</strong>
                        </div>
                        <div className="collection-sync-item collection-sync-item--full">
                          <span>账号简介</span>
                          <strong>{item.description || "未提供简介"}</strong>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="note-empty-state">当前还没有同步到品牌账号结果。</div>
                )}
              </div>
            </article>
          ) : null}

          {props.activeXhsCollectionCard === "competitorAccount" ? (
            <article className="light-data-panel">
              <div className="collection-result-head">
                <div>
                  <h3>竞品账号信息</h3>
                  <p>直接展示飞书多维表格同步回来的竞品账号结果。</p>
                </div>
                <span className={`archive-pill ${props.sortedCompetitorAccounts.length ? "status-ready" : "status-pending"}`}>
                  已同步 {props.sortedCompetitorAccounts.length} 条
                </span>
              </div>
              <div className="collection-card-list">
                {props.sortedCompetitorAccounts.length ? (
                  props.sortedCompetitorAccounts.map((item) => (
                    <article key={item.id} className="collection-sync-card">
                      <div className="collection-sync-head">
                        <div className="collection-sync-title">
                          <strong>{item.accountName || "-"}</strong>
                          <span>
                            {item.sourceAccountLink ? (
                              <a href={item.sourceAccountLink} target="_blank" rel="noreferrer">
                                {item.sourceAccountLink}
                              </a>
                            ) : (
                              "未提供主页链接"
                            )}
                          </span>
                        </div>
                        <span className="collection-sync-time">{props.formatDateTime(item.collectedAt)}</span>
                      </div>
                      <div className="collection-sync-grid">
                        <div className="collection-sync-item">
                          <span>外部用户 ID</span>
                          <strong className="collection-sync-code">{item.externalUserId || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>作品数</span>
                          <strong>{props.formatCount(item.postedCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>粉丝数</span>
                          <strong>{props.formatCount(item.fanCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>获赞数</span>
                          <strong>{props.formatCount(item.likedCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>收藏数</span>
                          <strong>{props.formatCount(item.collectedCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>IP 属地</span>
                          <strong>{item.ipLocation || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>关注数</span>
                          <strong>{props.formatCount(item.followCount)}</strong>
                        </div>
                        <div className="collection-sync-item collection-sync-item--full">
                          <span>账号简介</span>
                          <strong>{item.description || "未提供简介"}</strong>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="note-empty-state">当前还没有同步到竞品账号结果。</div>
                )}
              </div>
            </article>
          ) : null}

          {props.activeXhsCollectionCard === "brandWorks" ? (
            <article className="light-data-panel">
              <div className="collection-result-head">
                <div>
                  <h3>品牌作品信息及数据</h3>
                  <p>直接展示飞书多维表格同步回来的品牌作品内容。</p>
                </div>
                <span className={`archive-pill ${props.sortedBrandNotes.length ? "status-ready" : "status-pending"}`}>
                  已同步 {props.sortedBrandNotes.length} 条
                </span>
              </div>
              <div className="note-results-list">
                {props.sortedBrandNotes.length ? (
                  props.paginatedBrandNotes.map((item) => (
                    <article key={item.id} className="note-result-card">
                      <div className="note-result-top">
                        <div className="note-result-title-block">
                          <div className="note-title-meta">
                            <span className={`note-type-badge ${item.noteType === "video" ? "is-video" : "is-normal"}`}>
                              {item.noteType || "-"}
                            </span>
                            <span className="note-id-text">{item.noteId}</span>
                          </div>
                          <strong>{item.title}</strong>
                        </div>
                        <div className="note-result-summary-grid">
                          <div className="note-summary-item">
                            <span>作者</span>
                            <strong>{item.nickname || "-"}</strong>
                          </div>
                          <div className="note-summary-item">
                            <span>用户 ID</span>
                            <strong className="note-summary-code">{item.externalUserId || "-"}</strong>
                          </div>
                          <div className="note-summary-item">
                            <span>创建时间</span>
                            <strong>{item.createdAtText || "-"}</strong>
                          </div>
                          <div className="note-summary-item">
                            <span>来源账号</span>
                            <strong className="note-summary-code">{item.sourceAccountId}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="note-result-middle">
                        <div className="note-metric-grid note-metric-grid--compact">
                          <div>
                            <span>点赞</span>
                            <strong>{item.likeCount ?? 0}</strong>
                          </div>
                          <div>
                            <span>收藏</span>
                            <strong>{item.collectCount ?? 0}</strong>
                          </div>
                          <div>
                            <span>分享</span>
                            <strong>{item.shareCount ?? 0}</strong>
                          </div>
                          <div>
                            <span>评论</span>
                            <strong>{item.commentCount ?? 0}</strong>
                          </div>
                        </div>
                        <div className="note-description-panel">
                          <span className="note-panel-label">正文</span>
                          <div className="note-description-inline">{item.description || "暂无正文内容"}</div>
                        </div>
                      </div>
                      <div className="note-result-bottom">
                        <div className="note-media-panel">
                          <span className="note-panel-label">附件</span>
                          {item.imageList?.length ? (
                            <div className="note-image-grid">
                              {item.imageList.map((mediaUrl, index) => {
                                const previewUrl = props.buildFeishuMediaProxyUrl(mediaUrl);
                                if (!previewUrl) {
                                  return null;
                                }
                                return (
                                  <ProtectedImageCard
                                    key={`${item.id}-image-${index}`}
                                    sourceUrl={previewUrl}
                                    title={`${item.title}-附件-${index + 1}`}
                                    onPreviewMedia={props.onPreviewMedia}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="note-empty-media">暂无附件</div>
                          )}
                          <ProtectedVideoPanel sourceUrl={props.buildFeishuMediaProxyUrl(item.videoUrl)} />
                          <div className="note-media-actions">
                            {item.noteUrl ? (
                              <a href={item.noteUrl} target="_blank" rel="noreferrer" className="note-data-link">
                                查看作品链接
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="note-empty-state">
                    当前还没有同步到品牌作品结果，先在飞书副本里执行插件收集，再回到本站查看。
                  </div>
                )}
              </div>
              {props.sortedBrandNotes.length ? (
                <div className="note-pagination-bar">
                  <div className="note-pagination-summary">
                    <span>共 {props.sortedBrandNotes.length} 条</span>
                    <span>
                      第 {props.brandNotesPage} / {props.brandNotesPageCount} 页
                    </span>
                  </div>
                  <div className="note-pagination-actions">
                    <button
                      type="button"
                      className="note-inline-button"
                      onClick={() => props.setBrandNotesPage((current) => Math.max(1, current - 1))}
                      disabled={props.brandNotesPage === 1}
                    >
                      上一页
                    </button>
                    {Array.from({ length: props.brandNotesPageCount }, (_, index) => index + 1).map((page) => (
                      <button
                        key={`brand-note-page-${page}`}
                        type="button"
                        className={`note-page-button ${page === props.brandNotesPage ? "is-active" : ""}`}
                        onClick={() => props.setBrandNotesPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="note-inline-button"
                      onClick={() =>
                        props.setBrandNotesPage((current) => Math.min(props.brandNotesPageCount, current + 1))
                      }
                      disabled={props.brandNotesPage === props.brandNotesPageCount}
                    >
                      下一页
                    </button>
                    <label className="note-page-size-picker">
                      <span>每页</span>
                      <select
                        value={props.brandNotesPageSize}
                        onChange={(event) => props.setBrandNotesPageSize(Number(event.target.value))}
                      >
                        {[10, 20, 30, 50].map((size) => (
                          <option key={`page-size-${size}`} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <span>个</span>
                    </label>
                  </div>
                </div>
              ) : null}
            </article>
          ) : null}

          {props.activeXhsCollectionCard === "benchmarkWorks" ? (
            <article className="light-data-panel">
              <div className="collection-result-head">
                <div>
                  <h3>对标作品信息及数据</h3>
                  <p>直接展示飞书多维表格同步回来的对标作品内容。</p>
                </div>
                <span className={`archive-pill ${props.sortedBenchmarkNotes.length ? "status-ready" : "status-pending"}`}>
                  已同步 {props.sortedBenchmarkNotes.length} 条
                </span>
              </div>
              <div className="collection-card-list">
                {props.sortedBenchmarkNotes.length ? (
                  props.sortedBenchmarkNotes.map((item) => (
                    <article key={item.id} className="collection-sync-card">
                      <div className="collection-sync-head">
                        <div className="collection-sync-title">
                          <strong>{item.title || "-"}</strong>
                          <span>
                            {item.sourceUrl || item.noteUrl ? (
                              <a href={item.sourceUrl || item.noteUrl} target="_blank" rel="noreferrer">
                                {item.sourceUrl || item.noteUrl}
                              </a>
                            ) : (
                              "未提供来源链接"
                            )}
                          </span>
                        </div>
                        <div className="collection-sync-actions">
                          <span className="collection-sync-time">{props.formatDateTime(item.collectedAt)}</span>
                          <button
                            type="button"
                            className={`secondary-button ${item.isInMaterialLibrary ? "is-disabled" : ""}`}
                            onClick={() => void props.onAddBenchmarkNoteToMaterial(item.id)}
                            disabled={props.addingMaterialAssetId === item.id || Boolean(item.isInMaterialLibrary)}
                          >
                            {item.isInMaterialLibrary
                              ? "已加入素材库"
                              : props.addingMaterialAssetId === item.id
                                ? "加入中..."
                                : "加入素材库"}
                          </button>
                        </div>
                      </div>
                      <div className="collection-sync-grid">
                        <div className="collection-sync-item">
                          <span>作者</span>
                          <strong>{item.nickname || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>笔记类型</span>
                          <strong>{item.noteType || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>赞藏率</span>
                          <strong>{props.formatMetric(item.likeCollectRatio)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>赞评率</span>
                          <strong>{props.formatMetric(item.likeCommentRatio)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>分享率</span>
                          <strong>{props.formatMetric(item.shareRatio)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>是否爆款</span>
                          <strong>{item.isExplosive || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>是否选用</span>
                          <strong>{item.followUpDecision || "-"}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>点赞</span>
                          <strong>{props.formatCount(item.likeCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>收藏</span>
                          <strong>{props.formatCount(item.collectCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>评论</span>
                          <strong>{props.formatCount(item.commentCount)}</strong>
                        </div>
                        <div className="collection-sync-item">
                          <span>分享</span>
                          <strong>{props.formatCount(item.shareCount)}</strong>
                        </div>
                        <div className="collection-sync-item collection-sync-item--full">
                          <span>正文</span>
                          <strong>{item.description || "暂无正文内容"}</strong>
                        </div>
                      </div>
                      <div className="note-result-bottom">
                        <div className="note-media-panel">
                          <span className="note-panel-label">附件</span>
                          {item.imageList?.length ? (
                            <div className="note-image-grid">
                              {item.imageList.map((mediaUrl, index) => {
                                const previewUrl = props.buildFeishuMediaProxyUrl(mediaUrl);
                                if (!previewUrl) {
                                  return null;
                                }
                                return (
                                  <ProtectedImageCard
                                    key={`${item.id}-benchmark-image-${index}`}
                                    sourceUrl={previewUrl}
                                    title={`${item.title}-附件-${index + 1}`}
                                    onPreviewMedia={props.onPreviewMedia}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="note-empty-media">暂无附件</div>
                          )}
                          <ProtectedVideoPanel sourceUrl={props.buildFeishuMediaProxyUrl(item.videoUrl)} />
                          <div className="note-media-actions">
                            {item.sourceUrl || item.noteUrl ? (
                              <a
                                href={item.sourceUrl || item.noteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="note-data-link"
                              >
                                查看作品链接
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="note-empty-state">当前还没有同步到对标作品结果。</div>
                )}
              </div>
            </article>
          ) : null}
          </article>
        ) : null}

        {props.activePage === "douyinCollection" ? (
          <article className="workspace-panel strategy-page-card strategy-collection-page-card">
            <div className="strategy-card-toolbar">
              <div>
                <strong>抖音</strong>
                <p>抖音板块通过 Tikhub 第三方接口直连获取数据。四个分组分别录入并提交，结果直接按表格展示。</p>
              </div>
            </div>
            <div className="strategy-chip-row">
              <span className="archive-pill status-ready">数据源：Tikhub</span>
              <span className="archive-pill status-ready">字段甄别：已完成</span>
              <span className="archive-pill status-ready">播放量：统计接口补丁</span>
              <span className={`archive-pill ${douyinSyncedCount ? "status-ready" : "status-pending"}`}>
                已同步 {douyinSyncedCount} 条
              </span>
            </div>
            <div className="strategy-chip-row">
              {douyinCollectionCards.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`filter-chip ${props.activeDouyinCollectionCard === item.key ? "is-active" : ""}`}
                  onClick={() => props.onDouyinCollectionCardChange(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {props.activeDouyinCollectionCard === "brandAccount" ? (
              <>
                <DouyinSubmitPanel
                  title="品牌抖音主页链接 / sec_user_id"
                  helperText="录入品牌抖音主页链接或 sec_user_id，提交后调用【获取指定用户的信息】采集品牌账号信息。"
                  value={props.douyinSyncForm.brandAccountLinks}
                  onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, brandAccountLinks: value }))}
                  placeholder="每行一个，支持 https://www.douyin.com/user/... 或直接粘贴 sec_user_id"
                  docs={[{ label: "查看账号信息文档", href: "https://docs.tikhub.io/186826222e0" }]}
                  isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                  onSubmit={props.onSyncDouyinWorkspace}
                />
                <article className="light-data-panel">
                  <div className="collection-result-head">
                    <div>
                      <h3>品牌账号信息</h3>
                      <p>结果以表格呈现 `nickname`、`unique_id`、`signature`、`avatar_300x300`、`follower_count`、`following_count`、`aweme_count`、`total_favorited`。</p>
                    </div>
                  </div>
                  {douyinPreviewItems.length ? (
                    <DouyinAccountTable
                      items={douyinPreviewItems as DouyinCollectedAccountRecord[]}
                      formatDateTime={props.formatDateTime}
                      formatCount={props.formatCount}
                    />
                  ) : (
                    <div className="note-empty-state">当前还没有采集到品牌账号信息，请先输入品牌抖音主页链接或 sec_user_id 并提交。</div>
                  )}
                </article>
              </>
            ) : null}
            {props.activeDouyinCollectionCard === "competitorAccount" ? (
              <>
                <DouyinSubmitPanel
                  title="竞品抖音主页链接 / sec_user_id"
                  helperText="录入竞品抖音主页链接或 sec_user_id，提交后调用【获取指定用户的信息】采集竞品账号信息。"
                  value={props.douyinSyncForm.competitorAccountLinks}
                  onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, competitorAccountLinks: value }))}
                  placeholder="每行一个，支持 https://www.douyin.com/user/... 或直接粘贴 sec_user_id"
                  docs={[{ label: "查看账号信息文档", href: "https://docs.tikhub.io/186826222e0" }]}
                  isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                  onSubmit={props.onSyncDouyinWorkspace}
                />
                <article className="light-data-panel">
                  <div className="collection-result-head">
                    <div>
                      <h3>竞品账号信息</h3>
                      <p>结果以表格呈现 `nickname`、`unique_id`、`signature`、`avatar_300x300`、`follower_count`、`following_count`、`aweme_count`、`total_favorited`。</p>
                    </div>
                  </div>
                  {douyinPreviewItems.length ? (
                    <DouyinAccountTable
                      items={douyinPreviewItems as DouyinCollectedAccountRecord[]}
                      formatDateTime={props.formatDateTime}
                      formatCount={props.formatCount}
                    />
                  ) : (
                    <div className="note-empty-state">当前还没有采集到竞品账号信息，请先输入竞品主页链接或 sec_user_id 并提交。</div>
                  )}
                </article>
              </>
            ) : null}
            {props.activeDouyinCollectionCard === "brandWorks" ? (
              <>
                <DouyinSubmitPanel
                  title="品牌抖音主页链接 / sec_user_id"
                  helperText="录入品牌抖音主页链接或 sec_user_id，提交后调用【获取用户主页作品数据】采集品牌作品信息及数据。"
                  value={props.douyinSyncForm.brandAccountLinks}
                  onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, brandAccountLinks: value }))}
                  placeholder="每行一个，支持 https://www.douyin.com/user/... 或直接粘贴 sec_user_id"
                  docs={[{ label: "查看主页作品文档", href: "https://docs.tikhub.io/186826223e0" }]}
                  isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                  onSubmit={props.onSyncDouyinWorkspace}
                />
                <article className="light-data-panel">
                  <div className="collection-result-head">
                    <div>
                      <h3>品牌作品信息及数据</h3>
                      <p>结果以表格呈现 `aweme_id`、`desc`、`create_time`、`media_type`、`duration`、`statistics`、`images`、`aweme_type`、`video_download_addr`。</p>
                    </div>
                  </div>
                  {douyinPreviewItems.length ? (
                    <DouyinBrandWorksTable
                      items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                      formatDateTime={props.formatDateTime}
                      formatCount={props.formatCount}
                    />
                  ) : (
                    <div className="note-empty-state">当前还没有采集到品牌作品信息，请先输入品牌主页链接或 sec_user_id 并提交。</div>
                  )}
                </article>
              </>
            ) : null}
            {props.activeDouyinCollectionCard === "benchmarkWorks" ? (
              <>
                <DouyinSubmitPanel
                  title="对标作品 aweme_id / 作品链接"
                  helperText="录入对标作品 aweme_id 或作品链接，提交后组合【获取单个作品数据 V3】和【根据视频 ID 获取作品统计数据】补齐播放量。"
                  value={props.douyinSyncForm.benchmarkAwemeIds}
                  onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, benchmarkAwemeIds: value }))}
                  placeholder="每行一个，支持 aweme_id、/video/xxx、/note/xxx 链接"
                  docs={[
                    { label: "查看单作品文档", href: "https://docs.tikhub.io/406098636e0" },
                    { label: "查看统计文档", href: "https://docs.tikhub.io/186826221e0" },
                  ]}
                  isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                  onSubmit={props.onSyncDouyinWorkspace}
                />
                <article className="light-data-panel">
                  <div className="collection-result-head">
                    <div>
                      <h3>对标作品信息及数据</h3>
                      <p>结果以表格呈现 `desc`、`video.duration`、`video.cover.url_list`、`video.play_addr.url_list`、`author.nickname`、`author.unique_id`、`author.follower_count`、`author.total_favorited`、`author.avatar_300x300.url_list`、`digg_count`、`comment_count`、`share_count`、`collect_count`，以及统计接口补齐的 `play_count`。</p>
                    </div>
                  </div>
                  {douyinPreviewItems.length ? (
                    <DouyinBenchmarkWorksTable
                      items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                      formatDateTime={props.formatDateTime}
                      formatCount={props.formatCount}
                    />
                  ) : (
                    <div className="note-empty-state">当前还没有采集到对标作品信息，请先输入 aweme_id 或作品链接并提交。</div>
                  )}
                </article>
              </>
            ) : null}
          </article>
        ) : null}
      </div>
    );
  }

  return (
    <article className="workspace-panel strategy-page-card hotspot-page-card">
      <article className="light-data-panel hotspot-overview-panel">
        <div className="hotspot-panel-head">
          <div className="hotspot-panel-copy">
            <h3>{props.activeHotspotRecord?.title || "热搜榜"}</h3>
            <p>{props.activeHotspotRecord?.description || "这里展示每日热点搜索结果。"}</p>
            <span className="hotspot-auto-tip">每天 4:00 自动更新当天热搜榜</span>
          </div>
          <div className="hotspot-panel-actions">
            <label className="hotspot-date-picker">
              <span>查看日期</span>
              <select
                value={props.selectedHotspotDate}
                onChange={(event) => void props.onDailyHotspotDateChange(event.target.value)}
                disabled={props.isSyncingDailyHotspots || !props.hotspotAvailableDates.length}
              >
                {props.hotspotAvailableDates.map((date) => (
                  <option key={date} value={date}>
                    {props.formatDateLabel(date)}
                  </option>
                ))}
              </select>
            </label>
            <span
              className={`archive-pill ${
                props.activeHotspotRecord?.syncStatus === "SUCCESS"
                  ? "status-ready"
                  : props.activeHotspotRecord?.syncStatus === "FAILED"
                    ? "status-pending"
                    : "status-in_progress"
              }`}
            >
              {props.activeHotspotRecord?.syncStatus || "IDLE"}
            </span>
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                void props.onSyncDailyHotspots(props.activeHotspotRecord ? [props.activeHotspotRecord.title] : undefined)
              }
              disabled={props.isSyncingDailyHotspots}
            >
              {props.isSyncingDailyHotspots ? "搜索中..." : "手动搜索"}
            </button>
          </div>
        </div>

        {props.activeHotspotRecord?.lastError ? (
          <div className="hotspot-error-banner">
            <strong>最近一次搜索失败</strong>
            <p>{props.activeHotspotRecord.lastError}</p>
          </div>
        ) : null}
      </article>

      <article className="light-data-panel">
        <div className="hotspot-list-head">
          <h3>热点榜单</h3>
          <div className="hotspot-list-tools">
            <span className="archive-pill status-ready">共 {props.sortedHotspotItems.length} 条</span>
            <label className="note-page-size-picker hotspot-page-size-picker">
              <span>每页</span>
              <select
                value={props.hotspotPageSize}
                onChange={(event) => props.setHotspotPageSize(Number(event.target.value))}
              >
                {[10, 20].map((size) => (
                  <option key={`hotspot-page-size-${size}`} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>条</span>
            </label>
          </div>
        </div>
        <div className="hotspot-ranking-list">
          {props.sortedHotspotItems.length ? (
            props.paginatedHotspotItems.map((item) => (
              <article key={item.id} className="hotspot-ranking-card">
                <div className="hotspot-ranking-rank">#{item.rank}</div>
                <div className="hotspot-ranking-body">
                  <strong>{item.title}</strong>
                  <div className="hotspot-ranking-meta">
                    <span>热度 {props.formatHotspotHeat(item.hot)}</span>
                    <span>
                      时间{" "}
                      {props.formatDateTime(
                        item.timestamp
                          ? new Date(item.timestamp).toISOString()
                          : props.activeHotspotRecord?.updateTime || props.activeHotspotRecord?.collectedAt,
                      )}
                    </span>
                  </div>
                </div>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="table-link-pill">
                    查看源链接
                  </a>
                ) : (
                  <span className="archive-pill status-pending">无直达链接</span>
                )}
              </article>
            ))
          ) : (
            <div className="empty-state">
              当前榜单还没有可展示的热点条目。若刚执行过搜索但仍为空，通常表示接口权限不足或返回结构为空。
            </div>
          )}
        </div>
        {props.sortedHotspotItems.length ? (
          <div className="note-pagination-bar hotspot-pagination-bar">
            <div className="note-pagination-summary">
              <span>
                第 {props.hotspotPage} / {props.hotspotPageCount} 页
              </span>
              <span>当前显示 {props.paginatedHotspotItems.length} 条</span>
            </div>
            <div className="note-pagination-actions">
              <button
                type="button"
                className="note-inline-button"
                onClick={() => props.setHotspotPage((current) => Math.max(1, current - 1))}
                disabled={props.hotspotPage === 1}
              >
                上一页
              </button>
              {Array.from({ length: props.hotspotPageCount }, (_, index) => index + 1).map((page) => (
                <button
                  key={`hotspot-page-${page}`}
                  type="button"
                  className={`note-page-button ${page === props.hotspotPage ? "is-active" : ""}`}
                  onClick={() => props.setHotspotPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="note-inline-button"
                onClick={() => props.setHotspotPage((current) => Math.min(props.hotspotPageCount, current + 1))}
                disabled={props.hotspotPage === props.hotspotPageCount}
              >
                下一页
              </button>
            </div>
          </div>
        ) : null}
      </article>
    </article>
  );
}
