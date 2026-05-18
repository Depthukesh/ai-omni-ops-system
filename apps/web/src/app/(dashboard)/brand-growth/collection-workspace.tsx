"use client";

import { type Dispatch, type SetStateAction } from "react";
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
  XhsCollectedAccountRecord,
  XhsCollectedNoteRecord,
} from "../../../services/collectors";
import type {
  FeishuAppConfigRecord,
  FeishuAuthStatusRecord,
  FeishuBindingRecord,
} from "../../../services/brand-growth";
import type { DailyHotspotItem, DailyHotspotPlatformRecord } from "../../../services/daily-hotspots";
import { useProtectedMediaAsset } from "../use-protected-media-asset";

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

export interface BrandGrowthCollectionWorkspaceProps {
  activePage: "xiaohongshuCollection" | "dailyHotspot";
  templateUrl: string;
  activeXhsCollectionCard: XiaohongshuCollectionCardKey;
  onXhsCollectionCardChange: ValueAction<XiaohongshuCollectionCardKey>;
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
  onSaveFeishuAppConfig: AsyncAction;
  onStartFeishuAuth: AsyncAction;
  onSaveFeishuBinding: AsyncAction;
  onSyncFeishuWorkspace: AsyncAction;
  sortedBrandAccounts: XhsCollectedAccountRecord[];
  sortedCompetitorAccounts: XhsCollectedAccountRecord[];
  sortedBrandNotes: XhsCollectedNoteRecord[];
  sortedBenchmarkNotes: XhsCollectedNoteRecord[];
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

export function BrandGrowthCollectionWorkspace(props: BrandGrowthCollectionWorkspaceProps) {
  if (props.activePage === "xiaohongshuCollection") {
    return (
      <>
        <article className="workspace-panel strategy-page-card feishu-binding-panel">
          <div className="strategy-card-toolbar">
            <div>
              <strong>飞书多维表格收集入口</strong>
              <p>填写应用信息和飞书多维表格链接后，按顺序完成连接与同步即可。</p>
            </div>
            <a href={props.templateUrl} target="_blank" rel="noreferrer" className="secondary-button">
              打开飞书模板
            </a>
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
            <button
              type="button"
              className="secondary-button"
              onClick={() => void props.onSyncFeishuWorkspace()}
              disabled={props.isHydrating || props.isSyncingFeishuWorkspace || !props.canSyncFeishuWorkspace}
            >
              {props.isSyncingFeishuWorkspace ? "同步中..." : "从飞书同步"}
            </button>
          </div>
        </article>
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
        <article className="workspace-panel strategy-page-card strategy-collection-page-card">
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
      </>
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
