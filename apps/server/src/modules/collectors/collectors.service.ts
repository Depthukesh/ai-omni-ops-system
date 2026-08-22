import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory, Prisma } from "@prisma/client";
import { createId, database, type AssetRecord, type PlatformAccountRecord } from "../../common/mock-data";
import { getFeishuUserAppConfig, getFeishuUserIntegration, setFeishuUserIntegration } from "../../common/user-integrations";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";
import { SchedulerService } from "../scheduler/scheduler.service";
import { GlmOpenService } from "../third-party-platforms/glm-open.service";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";

const execFileAsync = promisify(execFile);

type CollectorAccountKind =
  | "XHS_BRAND_ACCOUNT"
  | "XHS_COMPETITOR_ACCOUNT"
  | "DOUYIN_BRAND_ACCOUNT"
  | "DOUYIN_COMPETITOR_ACCOUNT";
type DouyinWorkKind =
  | "DOUYIN_BRAND_WORK"
  | "DOUYIN_COMPETITOR_WORK"
  | "DOUYIN_BENCHMARK_WORK"
  | "DOUYIN_SEARCH_WORK"
  | "DOUYIN_LOW_FAN_EXPLOSIVE_WORK"
  | "DOUYIN_HIGH_COMPLETION_RATE_WORK"
  | "DOUYIN_HIGH_LIKE_RATE_WORK";
type DouyinKeywordRecommendationKind = "DOUYIN_KEYWORD_RECOMMENDATION";
type DouyinCommentKind = "DOUYIN_COMMENT";
type DouyinCityHotspotKind = "DOUYIN_CITY_HOTSPOT";
type XhsCommentKind = "XHS_NOTE_COMMENT";
type CollectorNoteKind =
  | "XHS_BRAND_NOTE"
  | "XHS_BENCHMARK_NOTE"
  | "XHS_SEARCH_NOTE";
type CollectorTargetKind = "XHS_TARGET_USER" | "DOUYIN_TARGET_USER";
type CollectorAssetKind =
  | CollectorAccountKind
  | CollectorNoteKind
  | XhsCommentKind
  | DouyinWorkKind
  | DouyinKeywordRecommendationKind
  | DouyinCommentKind
  | CollectorTargetKind
  | DouyinCityHotspotKind
  | "WECHAT_MP_BRAND_ACCOUNT"
  | "WECHAT_MP_ARTICLE"
  | "WECHAT_MP_BENCHMARK_ARTICLE"
  | "WECHAT_SEARCH_ITEM";
type CollectorSyncStatus = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
type DailyHotspotSyncStatus = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
type DouyinBillboardScopeKey =
  | "lowFanExplosiveWorks"
  | "highCompletionRateWorks"
  | "highLikeRateWorks";
type DouyinSearchScopeKey = "searchWorks";
type DouyinKeywordRecommendationScopeKey = "keywordRecommendations";
type DouyinCommentScopeKey = "commentData";
type DouyinCityHotspotScopeKey = "cityHotspots";
export type XhsAccountRole = "BRAND" | "STAFF" | "TALENT";

// 公众号采集类型定义
export type WechatMpBrandAccountRecord = {
  id: string;
  ghUsername: string;
  accountName: string;
  collectedAt: string;
};

export type WechatMpArticleRecord = {
  id: string;
  sourceAccountId: string;
  ghUsername?: string;
  appMsgId?: string;
  title: string;
  digest?: string;
  url: string;
  cover?: string;
  createTime?: string;
  updateTime?: string;
  idx?: number;
  readNum?: number;
  likeCount?: number;
  oldLikeCount?: number;
  shareCount?: number;
  collectCount?: number;
  commentCount?: number;
  starNum?: number;
  statsUpdatedAt?: string;
  articleContent?: string;
  contentReadAt?: string;
  collectedAt: string;
};

export type WechatMpCollectionWorkspace = {
  brandAccounts: WechatMpBrandAccountRecord[];
  articles: WechatMpArticleRecord[];
};

export type WechatMpArticleFetchResult = {
  isEnd: boolean;
  nextOffset?: string;
  count: number;
  articles: WechatMpArticleRecord[];
  workspace: WechatMpCollectionWorkspace;
};

export type WechatMpBenchmarkArticleRecord = {
  id: string;
  title: string;
  articleContent?: string;
  url: string;
  readNum?: number;
  likeCount?: number;
  shareCount?: number;
  collectCount?: number;
  commentCount?: number;
  starNum?: number;
  statsUpdatedAt?: string;
  contentReadAt?: string;
  isInMaterialLibrary?: boolean;
  materialAddedAt?: string;
  collectedAt: string;
};

export type WechatMpBenchmarkWorkspace = {
  benchmarkArticles: WechatMpBenchmarkArticleRecord[];
};

// 微信搜一搜类型
export type WechatSearchBusinessType =
  | "all" | "account" | "article" | "video" | "live_stream"
  | "moments" | "news" | "book" | "listen" | "image" | "encyclopedia" | "weixin_index";
export type WechatSearchSortType = "default" | "latest" | "hot";
export type WechatSearchPublishTime = "all" | "day" | "week" | "half_year";

export type WechatSearchItemRecord = {
  id: string;
  title: string;
  articleContent?: string;
  desc?: string;
  docId?: string;
  accTypeName?: string;
  url?: string;
  images?: string[];
  publishTime?: string;
  jumpInfoUserName?: string;
  jumpInfoNickName?: string;
  jumpInfoSignature?: string;
  readNum?: number;
  likeCount?: number;
  shareCount?: number;
  collectCount?: number;
  commentCount?: number;
  starNum?: number;
  statsUpdatedAt?: string;
  contentReadAt?: string;
  isInMaterialLibrary?: boolean;
  materialAddedAt?: string;
  collectedAt: string;
};

export type WechatSearchResult = {
  keyword: string;
  businessType: string;
  total?: number;
  continueFlag: boolean;
  offset: number;
  count: number;
  items: WechatSearchItemRecord[];
};

export type UnifiedMaterialLibraryItemRecord = {
  id: string;
  platform: "XIAOHONGSHU" | "DOUYIN" | "WECHAT_MP";
  platformLabel: "小红书" | "抖音" | "公众号";
  title: string;
  description?: string;
  detailUrl?: string;
  sourceUrl?: string;
  videoUrl?: string;
  imageList: string[];
  coverUrl?: string;
  authorName?: string;
  materialAddedAt?: string;
  collectedAt: string;
  publishTimeText?: string;
  sourceKind: string;
  noteType?: string;
  likeCount?: number;
  collectCount?: number;
  commentCount?: number;
  shareCount?: number;
  playCount?: number;
};
type XhsSyncAccountEntry = {
  locator: string;
  accountRole?: XhsAccountRole;
};
type XhsResolvedAccountRecord = PlatformAccountRecord & {
  accountRole?: XhsAccountRole;
};
type DouyinContentTagSelection = {
  primaryTagId?: number;
  secondaryTagId?: number;
};
type DouyinSyncInput = {
  scope?:
    | "brandAccount"
    | "competitorAccount"
    | "brandWorks"
    | "competitorWorks"
    | "benchmarkWorks"
    | DouyinSearchScopeKey
    | DouyinKeywordRecommendationScopeKey
    | DouyinCommentScopeKey
    | DouyinBillboardScopeKey
    | DouyinCityHotspotScopeKey;
  brandAccountLinks?: string[];
  competitorAccountLinks?: string[];
  brandAccountEntries?: XhsSyncAccountEntry[];
  competitorAccountEntries?: XhsSyncAccountEntry[];
  benchmarkAwemeIds?: string[];
  searchKeyword?: string;
  searchSortType?: string;
  searchPublishTime?: string;
  searchFilterDuration?: string;
  searchContentType?: string;
  commentSourceUrls?: string[];
  commentPageRequests?: Array<{
    sourceUrl: string;
    cursor?: string;
  }>;
  contentTagSelection?: DouyinContentTagSelection;
  cityCode?: number;
};
type CollectorTargetSyncInput = {
  sourceUrls?: string[];
  matchKeywords?: string[];
  syncCommentsFirst?: boolean;
};
type DouyinResolvedAccountRecord = PlatformAccountRecord & {
  accountRole?: XhsAccountRole;
};
type XhsSyncInput = {
  accountLocators?: string[];
  accountEntries?: XhsSyncAccountEntry[];
  sourceUrls?: string[];
  pageRequests?: Array<{
    sourceUrl: string;
    cursor?: string;
    index?: number;
  }>;
};
export type DouyinContentTagOption = {
  label: string;
  value: number;
  children: Array<{
    label: string;
    value: number;
  }>;
};
export type DouyinCityOption = {
  label: string;
  value: number;
};
export type DouyinCityHotspotTrendRecord = {
  datetime: string;
  hotScore?: number;
};
export type DouyinCityHotspotRecord = {
  id: string;
  kind: DouyinCityHotspotKind;
  cityCode: number;
  cityLabel: string;
  rank: number;
  rankDiff?: number;
  sentence: string;
  sentenceId?: string;
  createAtText?: string;
  hotScore?: number;
  videoCount?: number;
  sentenceTag?: number;
  trends: DouyinCityHotspotTrendRecord[];
  collectedAt: string;
};

type DailyHotspotConfig = {
  platformKey: string;
  title: string;
  boardType: string;
  description: string;
  sourceLink: string;
  path: string;
};

const DAILY_HOTSPOT_CONFIGS: DailyHotspotConfig[] = [
  {
    platformKey: "douyin-hot-search",
    title: "热搜榜",
    boardType: "热搜",
    description: "抖音站内综合热搜，适合查看当天大众传播话题。",
    sourceLink: "https://www.douyin.com/hot",
    path: "/api/v1/douyin/app/v3/fetch_hot_search_list",
  },
];

const FEISHU_BINDING_TITLE = "FEISHU_COPY_BINDING";

const FEISHU_TABLE_MATCHERS = {
  brandAccounts: ["品牌账号信息", "品牌账号", "品牌账号表", "鍝佺墝璐﹀彿淇℃伅"],
  competitorAccounts: ["竞品账号信息", "竞品账号", "竞品账号表", "绔炲搧璐﹀彿淇℃伅"],
  brandNotes: ["品牌作品信息及数据", "品牌作品", "品牌笔记", "品牌作品表", "鍝佺墝浣滃搧淇℃伅鍙婃暟鎹"],
  benchmarkNotes: ["对标作品信息及数据", "对标作品", "竞品作品", "对标作品表", "瀵规爣浣滃搧淇℃伅鍙婃暟鎹"],
  targetUsers: ["目标用户查找", "目标用户", "目标用户线索"],
} as const;

type FeishuBindingRecord = {
  id: string;
  wikiUrl: string;
  wikiToken: string;
  host: string;
  tableId: string;
  viewId: string;
  baseToken: string;
  templateUrl: string;
  syncStatus: CollectorSyncStatus;
  lastError: string;
  lastBoundAt: string;
  lastSyncAt: string;
};

type FeishuTableRecord = {
  tableId: string;
  tableName: string;
};

type FeishuRowRecord = {
  recordId: string;
  fields: Record<string, unknown>;
};

export type XhsCollectedAccountRecord = {
  id: string;
  kind: CollectorAccountKind;
  sourceAccountId: string;
  sourceAccountLink: string;
  accountRole?: XhsAccountRole;
  accountName: string;
  externalUserId?: string;
  postedCount?: number;
  likedCount?: number;
  collectedCount?: number;
  avatar?: string;
  description?: string;
  ipLocation?: string;
  followCount?: number;
  fanCount?: number;
  collectedAt: string;
};

export type XhsCollectedNoteRecord = {
  id: string;
  sourceAccountId: string;
  noteId: string;
  title: string;
  noteType?: string;
  nickname?: string;
  imageList?: string[];
  externalUserId?: string;
  noteUrl?: string;
  description?: string;
  likeCount?: number;
  collectCount?: number;
  createdAtText?: string;
  shareCount?: number;
  commentCount?: number;
  likeCollectRatio?: number;
  likeCommentRatio?: number;
  shareRatio?: number;
  isExplosive?: string;
  followUpDecision?: string;
  videoUrl?: string;
  collectedAt: string;
  sourceUrl?: string;
  syncStatus?: CollectorSyncStatus;
  retryCount?: number;
  nextRetryAt?: string;
  lastError?: string;
  isInMaterialLibrary?: boolean;
  materialAddedAt?: string;
  sourceTableId?: string;
  sourceRecordId?: string;
  rawFields?: Record<string, unknown>;
};

export type XhsCollectedTargetUserRecord = {
  id: string;
  sourceUrl: string;
  profileUrl?: string;
  userId?: string;
  nickname: string;
  noteTitle?: string;
  sourceCommentId?: string;
  commentText?: string;
  matchedKeyword?: string;
  collectedAt: string;
  syncStatus: CollectorSyncStatus;
  retryCount: number;
  nextRetryAt?: string;
  lastError?: string;
};

export type XhsCollectedCommentRecord = {
  id: string;
  kind: XhsCommentKind;
  noteId: string;
  noteUrl: string;
  sourceUrl: string;
  commentId: string;
  commentText: string;
  commentTime?: string;
  commentUserName?: string;
  commentUserId?: string;
  commentUserProfileUrl?: string;
  likeCount?: number;
  replyCount?: number;
  collectedAt: string;
};

type XhsCommentPageState = {
  sourceUrl: string;
  noteId: string;
  requestedCursor: string;
  requestedIndex: number;
  nextCursor: string;
  nextIndex: number;
  hasMore: boolean;
  fetchedCount: number;
};

type XhsCommentCollectionResult = {
  rows: XhsCollectedCommentRecord[];
  page: XhsCommentPageState;
};

export type XhsSubCommentRecord = {
  id: string;
  kind: "XHS_NOTE_SUB_COMMENT";
  noteId: string;
  noteUrl: string;
  sourceUrl: string;
  parentCommentId: string;
  commentId: string;
  commentText: string;
  commentTime?: string;
  commentUserName?: string;
  commentUserId?: string;
  likeCount?: number;
  collectedAt: string;
};

export type XhsSubCommentPageState = {
  parentCommentId: string;
  nextCursor: string;
  nextIndex: number;
  hasMore: boolean;
  fetchedCount: number;
};

export type XhsCollectionWorkspace = {
  brandAccounts: XhsCollectedAccountRecord[];
  competitorAccounts: XhsCollectedAccountRecord[];
  brandNotes: XhsCollectedNoteRecord[];
  benchmarkNotes: XhsCollectedNoteRecord[];
  searchNotes: XhsCollectedNoteRecord[];
  commentData: XhsCollectedCommentRecord[];
  targetUsers: XhsCollectedTargetUserRecord[];
};

export type DouyinCollectedAccountRecord = {
  id: string;
  kind: "DOUYIN_BRAND_ACCOUNT" | "DOUYIN_COMPETITOR_ACCOUNT";
  sourceAccountId: string;
  accountLink: string;
  sourceAccountLink: string;
  accountRole?: XhsAccountRole;
  accountName: string;
  externalUserId?: string;
  username?: string;
  shortId?: string;
  avatar?: string;
  description?: string;
  postedCount?: number;
  likedCount?: number;
  fanCount?: number;
  followCount?: number;
  ipLocation?: string;
  enterpriseVerifyReason?: string;
  customVerify?: string;
  collectedAt: string;
};

export type DouyinCollectedWorkRecord = {
  id: string;
  kind: DouyinWorkKind;
  sourceAccountId: string;
  sourceAccountLink: string;
  workId: string;
  title: string;
  description?: string;
  workType?: string;
  authorName?: string;
  authorUniqueId?: string;
  externalUserId?: string;
  workUrl?: string;
  coverUrl?: string;
  imageList?: string[];
  videoUrl?: string;
  hashtags?: string[];
  publishTimeText?: string;
  durationMs?: number;
  mediaType?: number;
  awemeType?: number;
  musicTitle?: string;
  musicAuthor?: string;
  likeCount?: number;
  playCount?: number;
  shareCount?: number;
  commentCount?: number;
  collectCount?: number;
  downloadCount?: number;
  recommendCount?: number;
  likeCollectRatio?: number;
  likeCommentRatio?: number;
  shareRatio?: number;
  isExplosive?: string;
  followUpDecision?: string;
  statsPatched?: boolean;
  authorFollowerCount?: number;
  authorLikedCount?: number;
  authorAvatar?: string;
  collectedAt: string;
  videoCacheStatus?: "PENDING" | "READY" | "FAILED" | "EXPIRED";
  videoCacheLastError?: string;
  transcript?: string;
  transcriptSource?: string;
  transcriptStatus?: "PENDING" | "SUCCESS" | "FAILED";
  transcriptLastError?: string;
  transcribedAt?: string;
  isInMaterialLibrary?: boolean;
  materialAddedAt?: string;
  billboardLabel?: string;
  primaryTagLabel?: string;
  secondaryTagLabel?: string;
  score?: number;
};

export type DouyinKeywordRecommendationRecord = {
  id: string;
  kind: DouyinKeywordRecommendationKind;
  searchKeyword: string;
  recommendedKeyword: string;
  searchTime?: string;
  collectedAt: string;
  queryId?: string;
  wordsSource?: string;
  position?: number;
};

export type DouyinCommentRecord = {
  id: string;
  kind: DouyinCommentKind;
  sourceWorkId: string;
  sourceWorkUrl: string;
  sourceSecUserId: string;
  commentId: string;
  commentText: string;
  commentTime?: string;
  commentUserName?: string;
  commentUserSecUserId: string;
  commentUserProfileUrl?: string;
  likeCount?: number;
  replyCount?: number;
  collectedAt: string;
};

export type DouyinCollectedTargetUserRecord = {
  id: string;
  sourceUrl: string;
  profileUrl?: string;
  secUserId?: string;
  nickname: string;
  workTitle?: string;
  sourceCommentId?: string;
  commentText?: string;
  matchedKeyword?: string;
  collectedAt: string;
  syncStatus: CollectorSyncStatus;
  retryCount: number;
  nextRetryAt?: string;
  lastError?: string;
};

type DouyinCommentPageState = {
  sourceUrl: string;
  sourceWorkId: string;
  requestedCursor: string;
  nextCursor: string;
  hasMore: boolean;
  fetchedCount: number;
};

type DouyinCommentCollectionResult = {
  rows: DouyinCommentRecord[];
  page: DouyinCommentPageState;
};

export type DouyinCollectionWorkspace = {
  brandAccounts: DouyinCollectedAccountRecord[];
  competitorAccounts: DouyinCollectedAccountRecord[];
  brandWorks: DouyinCollectedWorkRecord[];
  competitorWorks: DouyinCollectedWorkRecord[];
  benchmarkWorks: DouyinCollectedWorkRecord[];
  searchWorks: DouyinCollectedWorkRecord[];
  keywordRecommendations: DouyinKeywordRecommendationRecord[];
  commentData: DouyinCommentRecord[];
  targetUsers: DouyinCollectedTargetUserRecord[];
  lowFanExplosiveWorks: DouyinCollectedWorkRecord[];
  highCompletionRateWorks: DouyinCollectedWorkRecord[];
  highLikeRateWorks: DouyinCollectedWorkRecord[];
  cityHotspots: DouyinCityHotspotRecord[];
  contentTags: DouyinContentTagOption[];
  cityOptions: DouyinCityOption[];
};

type FeishuMatchedTableMap = {
  brandAccounts: FeishuTableRecord | null;
  competitorAccounts: FeishuTableRecord | null;
  brandNotes: FeishuTableRecord | null;
  benchmarkNotes: FeishuTableRecord | null;
  targetUsers: FeishuTableRecord | null;
};

type FeishuSyncBreakdown = {
  brandAccounts: number;
  competitorAccounts: number;
  brandNotes: number;
  benchmarkNotes: number;
  targetUsers: number;
};

export type DailyHotspotItemRecord = {
  id: string;
  rank: number;
  title: string;
  hot?: number;
  url?: string;
  mobileUrl?: string;
  timestamp?: number;
};

export type DailyHotspotPlatformRecord = {
  id: string;
  platformKey: string;
  title: string;
  snapshotDate: string;
  boardType?: string;
  description?: string;
  sourceLink?: string;
  total: number;
  updateTime?: string;
  fromCache?: boolean;
  collectedAt?: string;
  syncStatus: DailyHotspotSyncStatus;
  lastError?: string;
  items: DailyHotspotItemRecord[];
};

export type DailyHotspotWorkspace = {
  selectedDate: string;
  availableDates: string[];
  platforms: DailyHotspotPlatformRecord[];
};

type DouyinMetadataCacheKind = "DOUYIN_CONTENT_TAG_CACHE" | "DOUYIN_CITY_OPTION_CACHE";

@Injectable()
export class CollectorsService implements OnModuleInit, OnModuleDestroy {
  private static readonly DAILY_HOTSPOT_JOB_NAME = "collectors.daily-hotspots.sync";
  private static readonly DOUYIN_VIDEO_CACHE_CLEANUP_JOB_NAME = "collectors.douyin-video-cache.cleanup";
  private static readonly DOUYIN_VIDEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  private static readonly MATHMIND_API_BASE_URL = "https://api.mathmind.cn";
  private static readonly DOUYIN_TRANSCRIPT_POLL_INTERVAL_MS = 3000;
  private static readonly DOUYIN_TRANSCRIPT_POLL_MAX_ATTEMPTS = 40;
  private static readonly REMOTE_IMAGE_DOWNLOAD_TIMEOUT_MS = 90 * 1000;
  private static readonly REMOTE_VIDEO_DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
  private static readonly DOUYIN_CONTENT_TAG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly DOUYIN_CITY_OPTION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly DOUYIN_CONTENT_TAG_CACHE_ASSET_TITLE = "__douyin_content_tag_cache__";
  private static readonly DOUYIN_CITY_OPTION_CACHE_ASSET_TITLE = "__douyin_city_option_cache__";
  private static readonly DOUYIN_METADATA_CACHE_DESCRIPTION = "抖音采集元数据缓存，仅供服务端复用。";
  private static readonly DEFAULT_SYNC_CONCURRENCY = 2;
  private static readonly DEFAULT_SYNC_BATCH_LIMIT = 10;
  private static readonly DEFAULT_COMMENT_PAGE_REQUEST_LIMIT = 8;
  private static readonly DEFAULT_DAILY_HOTSPOT_PLATFORM_CONCURRENCY = 2;
  private static readonly DEFAULT_DAILY_HOTSPOT_BRAND_CONCURRENCY = 1;
  private readonly logger = new Logger(CollectorsService.name);
  private douyinVideoCacheQueue = Promise.resolve();
  private douyinTranscriptQueue = Promise.resolve();
  private douyinContentTagCache: { expiresAt: number; items: DouyinContentTagOption[] } | null = null;
  private douyinCityOptionCache: { expiresAt: number; items: DouyinCityOption[] } | null = null;
  private readonly collectorSyncConcurrency = this.readPositiveIntegerEnv(
    "COLLECTORS_SYNC_CONCURRENCY",
    CollectorsService.DEFAULT_SYNC_CONCURRENCY,
  );
  private readonly collectorSyncBatchLimit = this.readPositiveIntegerEnv(
    "COLLECTORS_SYNC_BATCH_LIMIT",
    CollectorsService.DEFAULT_SYNC_BATCH_LIMIT,
  );
  private readonly collectorCommentPageRequestLimit = this.readPositiveIntegerEnv(
    "COLLECTORS_COMMENT_PAGE_REQUEST_LIMIT",
    CollectorsService.DEFAULT_COMMENT_PAGE_REQUEST_LIMIT,
  );
  private readonly dailyHotspotPlatformConcurrency = this.readPositiveIntegerEnv(
    "COLLECTORS_DAILY_HOTSPOT_PLATFORM_CONCURRENCY",
    CollectorsService.DEFAULT_DAILY_HOTSPOT_PLATFORM_CONCURRENCY,
  );
  private readonly dailyHotspotBrandConcurrency = this.readPositiveIntegerEnv(
    "COLLECTORS_DAILY_HOTSPOT_BRAND_CONCURRENCY",
    CollectorsService.DEFAULT_DAILY_HOTSPOT_BRAND_CONCURRENCY,
  );
  private readonly globalDailyHotspotSyncEnabled = this.readBooleanEnv(
    "COLLECTORS_GLOBAL_DAILY_HOTSPOT_SYNC_ENABLED",
    false,
  );

  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(OssStorageService)
    private readonly ossStorageService: OssStorageService,
    @Inject(SchedulerService)
    private readonly schedulerService: SchedulerService,
    @Inject(ThirdPartyPlatformsService)
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
    @Inject(GlmOpenService)
    private readonly glmOpenService: GlmOpenService,
  ) {}

  private isProductionStartupThrottleEnabled(flagName: string) {
    const configured = String(process.env[flagName] || "").trim().toLowerCase();
    if (configured === "true" || configured === "1" || configured === "yes" || configured === "on") {
      return true;
    }
    if (configured === "false" || configured === "0" || configured === "no" || configured === "off") {
      return false;
    }
    return process.env.NODE_ENV !== "production";
  }

  private readPositiveIntegerEnv(name: string, fallback: number) {
    const raw = Number.parseInt(String(process.env[name] || "").trim(), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }

  private readBooleanEnv(name: string, fallback: boolean) {
    const normalized = String(process.env[name] || "").trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
    return fallback;
  }

  private limitCollectorBatch<T>(items: T[], maxCount: number, label: string) {
    if (items.length <= maxCount) {
      return items;
    }
    this.logger.warn(`[collector-throttle] ${label} truncated from ${items.length} to ${maxCount}`);
    return items.slice(0, maxCount);
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    if (!items.length) {
      return [];
    }
    const workers = Math.max(1, Math.min(concurrency, items.length));
    const results = new Array<R>(items.length);
    let cursor = 0;
    const runner = async () => {
      while (cursor < items.length) {
        const currentIndex = cursor;
        cursor += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    };
    await Promise.all(Array.from({ length: workers }, () => runner()));
    return results;
  }

  private async mapWithConcurrencySettled<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<Array<PromiseSettledResult<R>>> {
    return this.mapWithConcurrency(items, concurrency, async (item, index) => {
      try {
        return {
          status: "fulfilled",
          value: await mapper(item, index),
        } satisfies PromiseSettledResult<R>;
      } catch (error) {
        return {
          status: "rejected",
          reason: error,
        } satisfies PromiseSettledResult<R>;
      }
    });
  }

  onModuleInit() {
    const enableDailyHotspotStartupCatchUp = this.isProductionStartupThrottleEnabled("COLLECTORS_STARTUP_DAILY_HOTSPOT_CATCHUP");
    const enableVideoCacheCleanupStartupCatchUp = this.isProductionStartupThrottleEnabled("COLLECTORS_STARTUP_VIDEO_CACHE_CLEANUP_CATCHUP");
    const enableResumeDouyinVideoCaches = this.isProductionStartupThrottleEnabled("COLLECTORS_STARTUP_RESUME_DOUYIN_VIDEO_CACHE");
    const enableResumeDouyinTranscripts = this.isProductionStartupThrottleEnabled("COLLECTORS_STARTUP_RESUME_DOUYIN_TRANSCRIPTS");

    if (this.globalDailyHotspotSyncEnabled) {
      this.schedulerService.registerDailyJob({
        name: CollectorsService.DAILY_HOTSPOT_JOB_NAME,
        hour: 4,
        minute: 0,
        runOnStartupIfMissed: enableDailyHotspotStartupCatchUp,
        shouldRunOnStartup: () => this.shouldCatchUpDailyHotspotRun(),
        onTick: () => this.runDailyHotspotSyncJob(),
      });
    } else {
      this.logger.log("Skip registering global daily hotspot sync job; only brand-scoped manual sync is enabled.");
    }
    this.schedulerService.registerDailyJob({
      name: CollectorsService.DOUYIN_VIDEO_CACHE_CLEANUP_JOB_NAME,
      hour: 5,
      minute: 15,
      runOnStartupIfMissed: enableVideoCacheCleanupStartupCatchUp,
      onTick: () => this.cleanupExpiredDouyinVideoCaches(),
    });
    if (enableResumeDouyinVideoCaches) {
      void this.resumePendingDouyinVideoCaches();
    } else {
      this.logger.log("Skip resuming douyin video caches on startup in current environment.");
    }
    if (enableResumeDouyinTranscripts) {
      void this.resumePendingDouyinTranscriptExtractions();
    } else {
      this.logger.log("Skip resuming douyin transcript extractions on startup in current environment.");
    }
  }

  onModuleDestroy() {
    this.schedulerService.unregisterJob(CollectorsService.DAILY_HOTSPOT_JOB_NAME);
    this.schedulerService.unregisterJob(CollectorsService.DOUYIN_VIDEO_CACHE_CLEANUP_JOB_NAME);
  }

  async getXiaohongshuWorkspace(brandId: string): Promise<XhsCollectionWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      return this.getWorkspaceFromDatabase(brandId);
    }

    return this.getWorkspaceFromMock(brandId);
  }

  async getDouyinWorkspace(brandId: string): Promise<DouyinCollectionWorkspace> {
    const [contentTags, cityOptions] = await Promise.all([
      this.getDouyinContentTagsSafe(brandId),
      this.getDouyinCityOptionsSafe(brandId),
    ]);
    if (await this.prismaService.canUseDatabase()) {
      return this.buildDouyinWorkspaceFromAssets(await this.listCollectorAssets(brandId), contentTags, cityOptions);
    }

    return this.getDouyinWorkspaceFromMock(brandId, contentTags, cityOptions);
  }

  async listUnifiedMaterialLibraryItems(brandId: string): Promise<UnifiedMaterialLibraryItemRecord[]> {
    const [xhsWorkspace, douyinWorkspace, wechatBenchmarkWorkspace, wechatSearchWorkspace] = await Promise.all([
      this.getXiaohongshuWorkspace(brandId),
      this.getDouyinWorkspace(brandId),
      this.getWechatMpBenchmarkWorkspace(brandId),
      this.getWechatSearchWorkspace(brandId),
    ]);
    return [
      ...this.listXhsMaterialLibraryNotes(xhsWorkspace).map((item) => ({
        id: item.id,
        platform: "XIAOHONGSHU" as const,
        platformLabel: "小红书" as const,
        title: item.title,
        description: item.description || undefined,
        detailUrl: item.noteUrl || item.sourceUrl || undefined,
        sourceUrl: item.noteUrl || item.sourceUrl || undefined,
        videoUrl: item.videoUrl || undefined,
        imageList: item.imageList || [],
        coverUrl: item.imageList?.[0] || undefined,
        authorName: item.nickname || undefined,
        materialAddedAt: item.materialAddedAt || undefined,
        collectedAt: item.collectedAt,
        publishTimeText: item.createdAtText || undefined,
        sourceKind: item.noteType || (item.videoUrl ? "视频笔记" : "图文笔记"),
        noteType: item.noteType || undefined,
        likeCount: item.likeCount,
        collectCount: item.collectCount,
        commentCount: item.commentCount,
        shareCount: item.shareCount,
      })),
      ...this.listDouyinMaterialLibraryWorks(douyinWorkspace).map((item) => ({
        id: item.id,
        platform: "DOUYIN" as const,
        platformLabel: "抖音" as const,
        title: item.title,
        description: item.description || item.title,
        detailUrl: item.workUrl || undefined,
        sourceUrl: item.videoUrl || item.workUrl || undefined,
        videoUrl: item.videoUrl || undefined,
        imageList: item.imageList || [],
        coverUrl: item.coverUrl || item.imageList?.[0] || undefined,
        authorName: item.authorName || undefined,
        materialAddedAt: item.materialAddedAt || undefined,
        collectedAt: item.collectedAt,
        publishTimeText: item.publishTimeText || undefined,
        sourceKind: item.workType || "抖音作品",
        noteType: item.workType || undefined,
        likeCount: item.likeCount,
        collectCount: item.collectCount,
        commentCount: item.commentCount,
        shareCount: item.shareCount,
        playCount: item.playCount,
      })),
      ...this.listWechatMaterialLibraryItems(wechatBenchmarkWorkspace, wechatSearchWorkspace).map((item) => ({
        id: item.id,
        platform: "WECHAT_MP" as const,
        platformLabel: "公众号" as const,
        title: item.title,
        description: "desc" in item ? item.desc || undefined : undefined,
        detailUrl: item.url || undefined,
        sourceUrl: item.url || undefined,
        imageList: "images" in item ? item.images || [] : [],
        coverUrl: "images" in item ? item.images?.[0] || undefined : undefined,
        authorName: "jumpInfoNickName" in item ? item.jumpInfoNickName || undefined : undefined,
        materialAddedAt: item.materialAddedAt || undefined,
        collectedAt: item.collectedAt,
        publishTimeText: "publishTime" in item ? item.publishTime || undefined : undefined,
        sourceKind: "公众号文章",
        noteType: "公众号文章",
        likeCount: item.likeCount,
        collectCount: item.collectCount,
        commentCount: item.commentCount,
        shareCount: item.shareCount,
        playCount: item.readNum,
      })),
    ].sort((left, right) => this.resolveMaterialLibrarySortTime(right) - this.resolveMaterialLibrarySortTime(left));
  }

  async findUnifiedMaterialLibraryItem(brandId: string, materialId?: string | null) {
    const normalizedMaterialId = String(materialId || "").trim();
    if (!normalizedMaterialId) {
      return undefined;
    }
    const items = await this.listUnifiedMaterialLibraryItems(brandId);
    return items.find((item) => item.id === normalizedMaterialId);
  }

  async syncBrandAccounts(brandId: string, input: XhsSyncInput = {}) {
    const presetAccounts = await this.getConfiguredAccounts(brandId, "brand");
    const accounts = this.limitCollectorBatch(
      this.mergeXhsManualAccounts(presetAccounts, input.accountLocators, "brand", input.accountEntries),
      this.collectorSyncBatchLimit,
      "xhs brand accounts",
    );
    const collected = await this.mapWithConcurrency(
      accounts,
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreAccount(brandId, account, "XHS_BRAND_ACCOUNT"),
    );
    return {
      syncedCount: collected.length,
      items: collected,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncCompetitorAccounts(brandId: string, input: XhsSyncInput = {}) {
    const presetAccounts = await this.getConfiguredAccounts(brandId, "competitor");
    const accounts = this.limitCollectorBatch(
      this.mergeXhsManualAccounts(presetAccounts, input.accountLocators, "competitor", input.accountEntries),
      this.collectorSyncBatchLimit,
      "xhs competitor accounts",
    );
    const collected = await this.mapWithConcurrency(
      accounts,
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreAccount(brandId, account, "XHS_COMPETITOR_ACCOUNT"),
    );
    return {
      syncedCount: collected.length,
      items: collected,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncBrandNotes(brandId: string, input: XhsSyncInput = {}) {
    const presetAccounts = await this.getConfiguredAccounts(brandId, "brand");
    const accounts = this.limitCollectorBatch(
      this.mergeXhsManualAccounts(presetAccounts, input.accountLocators, "brand", input.accountEntries),
      this.collectorSyncBatchLimit,
      "xhs brand notes",
    );
    const rows = await this.mapWithConcurrency(
      accounts,
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreNotes(brandId, account),
    );
    await this.cleanupDuplicateCollectorAssets(brandId);
    return {
      syncedCount: rows.reduce((sum, items) => sum + items.length, 0),
      items: rows.flat(),
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncDouyinWorkspace(brandId: string, input: DouyinSyncInput = {}) {
    const [brandAccountPreset, competitorAccountPreset] = await Promise.all([
      this.getConfiguredAccounts(brandId, "brand", "DOUYIN"),
      this.getConfiguredAccounts(brandId, "competitor", "DOUYIN"),
    ]);
    const scope = input.scope;
    const contentTagSelection = input.contentTagSelection ?? {};
    const shouldSyncBrandAccounts = !scope || scope === "brandAccount" || scope === "brandWorks";
    const shouldSyncCompetitorAccounts = !scope || scope === "competitorAccount" || scope === "competitorWorks";
    const shouldSyncBrandWorks = !scope || scope === "brandWorks";
    const shouldSyncCompetitorWorks = !scope || scope === "competitorWorks";
    const shouldSyncBenchmarkWorks = !scope || scope === "benchmarkWorks";
    const shouldSyncSearchWorks = scope === "searchWorks";
    const shouldSyncKeywordRecommendations = scope === "keywordRecommendations";
    const shouldSyncCommentData = scope === "commentData";
    const shouldSyncLowFanExplosiveWorks = scope === "lowFanExplosiveWorks";
    const shouldSyncHighCompletionRateWorks = scope === "highCompletionRateWorks";
    const shouldSyncHighLikeRateWorks = scope === "highLikeRateWorks";
    const shouldSyncCityHotspots = scope === "cityHotspots";
    const brandAccounts = shouldSyncBrandAccounts || shouldSyncBrandWorks
      ? this.limitCollectorBatch(
          this.mergeDouyinManualAccounts(brandAccountPreset, input.brandAccountLinks, "brand", input.brandAccountEntries),
          this.collectorSyncBatchLimit,
          "douyin brand accounts",
        )
      : [];
    const competitorAccounts = shouldSyncCompetitorAccounts
      ? this.limitCollectorBatch(
          this.mergeDouyinManualAccounts(
            competitorAccountPreset,
            input.competitorAccountLinks,
            "competitor",
            input.competitorAccountEntries,
          ),
          this.collectorSyncBatchLimit,
          "douyin competitor accounts",
        )
      : [];

    const brandAccountRows = await this.mapWithConcurrency(
      shouldSyncBrandAccounts ? brandAccounts : [],
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreDouyinAccount(brandId, account, "DOUYIN_BRAND_ACCOUNT"),
    );
    const competitorAccountRows = await this.mapWithConcurrency(
      shouldSyncCompetitorAccounts ? competitorAccounts : [],
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreDouyinAccount(brandId, account, "DOUYIN_COMPETITOR_ACCOUNT"),
    );
    const brandWorkRows = await this.mapWithConcurrency(
      shouldSyncBrandWorks ? brandAccounts : [],
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreDouyinWorks(brandId, account, "DOUYIN_BRAND_WORK"),
    );
    const competitorWorkRows = await this.mapWithConcurrency(
      shouldSyncCompetitorWorks ? competitorAccounts : [],
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreDouyinWorks(brandId, account, "DOUYIN_COMPETITOR_WORK"),
    );
    const benchmarkWorkRows = await this.mapWithConcurrency(
      shouldSyncBenchmarkWorks ? competitorAccounts : [],
      this.collectorSyncConcurrency,
      (account) => this.collectAndStoreDouyinWorks(brandId, account, "DOUYIN_BENCHMARK_WORK"),
    );
    const manualBenchmarkResults = shouldSyncBenchmarkWorks
      ? await this.mapWithConcurrencySettled(
          this.limitCollectorBatch(
            (input.benchmarkAwemeIds ?? [])
              .map((item) => this.normalizeDouyinAwemeId(item))
              .filter(Boolean),
            this.collectorSyncBatchLimit,
            "douyin benchmark aweme ids",
          ),
          this.collectorSyncConcurrency,
          (awemeId) => this.collectAndStoreSingleDouyinBenchmarkWork(brandId, awemeId),
        )
      : [];
    const manualBenchmarkRows = manualBenchmarkResults
      .filter((item): item is PromiseFulfilledResult<DouyinCollectedWorkRecord> => item.status === "fulfilled")
      .map((item) => item.value);
    const benchmarkFailures = manualBenchmarkResults
      .filter((item): item is PromiseRejectedResult => item.status === "rejected")
      .map((item) => (item.reason instanceof Error ? item.reason.message : "对标作品采集失败"));
    const searchWorkRows = shouldSyncSearchWorks
      ? await this.collectAndStoreDouyinSearchWorks(brandId, input.searchKeyword, {
          sortType: input.searchSortType,
          publishTime: input.searchPublishTime,
          filterDuration: input.searchFilterDuration,
          contentType: input.searchContentType,
        })
      : [];
    const keywordRecommendationRows = shouldSyncKeywordRecommendations
      ? await this.collectAndStoreDouyinKeywordRecommendations(brandId, input.searchKeyword)
      : [];
    const commentPageRequests = shouldSyncCommentData
      ? this.normalizeDouyinCommentPageRequests(input)
      : [];
    const manualCommentResults = shouldSyncCommentData
      ? await this.mapWithConcurrencySettled(
          commentPageRequests,
          this.collectorSyncConcurrency,
          (request) => this.collectAndStoreSingleDouyinCommentData(brandId, request),
        )
      : [];
    const commentRows = manualCommentResults
      .filter((item): item is PromiseFulfilledResult<DouyinCommentCollectionResult> => item.status === "fulfilled")
      .flatMap((item) => item.value.rows);
    const commentPagination = manualCommentResults
      .filter((item): item is PromiseFulfilledResult<DouyinCommentCollectionResult> => item.status === "fulfilled")
      .map((item) => item.value.page);
    const commentFailures = manualCommentResults
      .filter((item): item is PromiseRejectedResult => item.status === "rejected")
      .map((item) => (item.reason instanceof Error ? item.reason.message : "评论数据采集失败"));
    const lowFanExplosiveRows = shouldSyncLowFanExplosiveWorks
      ? await this.collectAndStoreDouyinBillboardWorks(brandId, {
          kind: "DOUYIN_LOW_FAN_EXPLOSIVE_WORK",
          scope: "lowFanExplosiveWorks",
          label: "低粉爆款榜",
          path: "/api/v1/douyin/billboard/fetch_hot_total_low_fan_list",
          selection: contentTagSelection,
        })
      : [];
    const highCompletionRateRows = shouldSyncHighCompletionRateWorks
      ? await this.collectAndStoreDouyinBillboardWorks(brandId, {
          kind: "DOUYIN_HIGH_COMPLETION_RATE_WORK",
          scope: "highCompletionRateWorks",
          label: "高完播率榜",
          path: "/api/v1/douyin/billboard/fetch_hot_total_high_play_list",
          selection: contentTagSelection,
        })
      : [];
    const highLikeRateRows = shouldSyncHighLikeRateWorks
      ? await this.collectAndStoreDouyinBillboardWorks(brandId, {
          kind: "DOUYIN_HIGH_LIKE_RATE_WORK",
          scope: "highLikeRateWorks",
          label: "高点赞率榜",
          path: "/api/v1/douyin/billboard/fetch_hot_total_high_like_list",
          selection: contentTagSelection,
        })
      : [];
    const cityHotspotRows = shouldSyncCityHotspots
      ? await this.collectAndStoreDouyinCityHotspots(brandId, input.cityCode)
      : [];
    const billboardWarnings = [
      shouldSyncLowFanExplosiveWorks && !lowFanExplosiveRows.length ? "低粉爆款榜当前分类暂无返回结果" : "",
      shouldSyncHighCompletionRateWorks && !highCompletionRateRows.length ? "高完播率榜当前分类暂无返回结果" : "",
      shouldSyncHighLikeRateWorks && !highLikeRateRows.length ? "高点赞率榜当前分类暂无返回结果" : "",
      shouldSyncCityHotspots && !cityHotspotRows.length ? "同城热点榜当前城市暂无返回结果" : "",
    ].filter(Boolean);
    const benchmarkWorkCount =
      benchmarkWorkRows.reduce((sum, items) => sum + items.length, 0)
      + manualBenchmarkRows.length;
    await this.cleanupDuplicateCollectorAssets(brandId);

    return {
      syncedCount:
        brandAccountRows.length
        + competitorAccountRows.length
        + brandWorkRows.reduce((sum, items) => sum + items.length, 0)
        + competitorWorkRows.reduce((sum, items) => sum + items.length, 0)
        + benchmarkWorkCount
        + searchWorkRows.length
        + keywordRecommendationRows.length
        + commentRows.length
        + lowFanExplosiveRows.length
        + highCompletionRateRows.length
        + highLikeRateRows.length
        + cityHotspotRows.length,
      breakdown: {
        brandAccounts: brandAccountRows.length,
        competitorAccounts: competitorAccountRows.length,
        brandWorks: brandWorkRows.reduce((sum, items) => sum + items.length, 0),
        competitorWorks: competitorWorkRows.reduce((sum, items) => sum + items.length, 0),
        benchmarkWorks: benchmarkWorkCount,
        searchWorks: searchWorkRows.length,
        keywordRecommendations: keywordRecommendationRows.length,
        commentData: commentRows.length,
        lowFanExplosiveWorks: lowFanExplosiveRows.length,
        highCompletionRateWorks: highCompletionRateRows.length,
        highLikeRateWorks: highLikeRateRows.length,
        cityHotspots: cityHotspotRows.length,
      },
      commentPagination,
      warnings: [...benchmarkFailures, ...commentFailures, ...billboardWarnings],
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  async syncBenchmarkNotes(brandId: string, sourceUrls: string[]) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const rows = await this.mapWithConcurrency(
      this.limitCollectorBatch(sourceUrls.filter(Boolean), this.collectorSyncBatchLimit, "xhs benchmark notes"),
      this.collectorSyncConcurrency,
      (url) => this.collectAndStoreBenchmarkNote(brandId, url),
    );
    return {
      syncedCount: rows.filter((item) => item.syncStatus === "SUCCESS").length,
      items: rows,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncSearchNotes(brandId: string, keyword: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const rows = await this.collectAndStoreSearchNotes(brandId, keyword);
    return {
      syncedCount: rows.filter((item) => item.syncStatus === "SUCCESS").length,
      items: rows,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncXhsCommentData(brandId: string, input: XhsSyncInput = {}) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const pageRequests = this.normalizeXhsCommentPageRequests(input);
    const manualCommentResults = await this.mapWithConcurrencySettled(
      pageRequests,
      this.collectorSyncConcurrency,
      (request) => this.collectAndStoreSingleXhsCommentData(brandId, request),
    );
    const rows = manualCommentResults
      .filter((item): item is PromiseFulfilledResult<XhsCommentCollectionResult> => item.status === "fulfilled")
      .flatMap((item) => item.value.rows);
    const commentPagination = manualCommentResults
      .filter((item): item is PromiseFulfilledResult<XhsCommentCollectionResult> => item.status === "fulfilled")
      .map((item) => item.value.page);
    const warnings = manualCommentResults
      .filter((item): item is PromiseRejectedResult => item.status === "rejected")
      .map((item) => (item.reason instanceof Error ? item.reason.message : "小红书评论数据采集失败"));
    return {
      syncedCount: rows.length,
      commentPagination,
      warnings,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async getXhsSubComments(
    brandId: string,
    input: { sourceUrl?: string; commentId?: string; cursor?: string; index?: number } = {},
  ) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    return this.collectXhsSubComments(brandId, input);
  }

  async syncTargetUsers(brandId: string, input: CollectorTargetSyncInput | string[] = {}) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const normalizedInput = Array.isArray(input) ? { sourceUrls: input } : input;
    const sourceUrls = this.limitCollectorBatch(
      (normalizedInput.sourceUrls ?? [])
        .map((item) => this.normalizeXhsShareText(String(item || "").trim()))
        .filter(Boolean),
      this.collectorSyncBatchLimit,
      "xhs target users",
    );
    if (!sourceUrls.length) {
      throw new BadRequestException("请提供至少一条小红书作品链接或 note_id");
    }
    const matchKeywords = this.normalizeCommentMatchKeywords(normalizedInput.matchKeywords);
    if (normalizedInput.syncCommentsFirst) {
      await this.syncXhsCommentData(brandId, { sourceUrls });
    }
    const { rows, warnings } = await this.collectAndStoreTargetUsersFromComments(brandId, sourceUrls, matchKeywords);
    return {
      syncedCount: rows.filter((item) => item.syncStatus === "SUCCESS").length,
      items: rows,
      warnings,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncDouyinTargetUsers(brandId: string, input: CollectorTargetSyncInput = {}) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const sourceUrls = this.limitCollectorBatch(
      (input.sourceUrls ?? [])
        .map((item) => String(item || "").trim())
        .filter(Boolean),
      this.collectorSyncBatchLimit,
      "douyin target users",
    );
    if (!sourceUrls.length) {
      throw new BadRequestException("请提供至少一条抖音作品链接或 aweme_id");
    }
    const matchKeywords = this.normalizeCommentMatchKeywords(input.matchKeywords);
    if (input.syncCommentsFirst) {
      await this.syncDouyinWorkspace(brandId, {
        scope: "commentData",
        commentSourceUrls: sourceUrls,
      });
    }
    const { rows, warnings } = await this.collectAndStoreDouyinTargetUsersFromComments(brandId, sourceUrls, matchKeywords);
    return {
      syncedCount: rows.filter((item) => item.syncStatus === "SUCCESS").length,
      items: rows,
      warnings,
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  async addBenchmarkNoteToMaterialLibrary(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (kind !== "XHS_BENCHMARK_NOTE" && kind !== "XHS_SEARCH_NOTE") {
      throw new BadRequestException("仅支持将小红书作品加入素材库");
    }

    const materialAddedAt = this.readMetaString(meta, "materialAddedAt") || new Date().toISOString();
    await this.updateCollectorAssetMeta(brandId, assetId, {
      inMaterialLibrary: true,
      materialAddedAt,
    });

    return {
      item: {
        ...this.mapCollectedNote({
          ...asset,
          metadataJson: {
            ...meta,
            inMaterialLibrary: true,
            materialAddedAt,
          },
        }),
        isInMaterialLibrary: true,
        materialAddedAt,
      },
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async removeBenchmarkNoteFromMaterialLibrary(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (kind !== "XHS_BENCHMARK_NOTE" && kind !== "XHS_SEARCH_NOTE") {
      throw new BadRequestException("仅支持将小红书作品从素材库移除");
    }

    await this.updateCollectorAssetMeta(brandId, assetId, {
      inMaterialLibrary: false,
      materialAddedAt: null,
    });

    return {
      item: {
        ...this.mapCollectedNote({
          ...asset,
          metadataJson: {
            ...meta,
            inMaterialLibrary: false,
            materialAddedAt: null,
          },
        }),
        isInMaterialLibrary: false,
        materialAddedAt: undefined,
      },
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async deleteXhsCollectedNote(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const kind = this.readMetaString(this.asMeta(asset.metadataJson), "kind");
    if (kind !== "XHS_BENCHMARK_NOTE" && kind !== "XHS_SEARCH_NOTE") {
      throw new BadRequestException("仅支持删除小红书对标作品或搜索笔记");
    }
    await this.deleteCollectorAssetById(brandId, assetId);
    return {
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async addDouyinBenchmarkWorkToMaterialLibrary(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (!this.isDouyinMaterialLibrarySupportedKind(kind)) {
      throw new BadRequestException("仅支持将抖音竞品作品、对标作品、搜索作品或榜单作品加入素材库");
    }

    const materialAddedAt = this.readMetaString(meta, "materialAddedAt") || new Date().toISOString();
    await this.updateCollectorAssetMeta(brandId, assetId, {
      inMaterialLibrary: true,
      materialAddedAt,
    });

    return {
      item: {
        ...this.mapDouyinCollectedWork({
          ...asset,
          metadataJson: {
            ...meta,
            inMaterialLibrary: true,
            materialAddedAt,
          },
        }, kind),
        isInMaterialLibrary: true,
        materialAddedAt,
      },
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  async addWechatBenchmarkArticleToMaterialLibrary(brandId: string, articleId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.findWechatBenchmarkArticleAssetByArticleId(brandId, articleId);
    const meta = this.asMeta(asset.metadataJson);
    const materialAddedAt = this.readMetaString(meta, "materialAddedAt") || new Date().toISOString();
    await this.updateCollectorAssetMeta(brandId, asset.id, {
      inMaterialLibrary: true,
      materialAddedAt,
    });
    const workspace = await this.getWechatMpBenchmarkWorkspace(brandId);
    return {
      item: workspace.benchmarkArticles.find((item) => item.id === articleId) || {
        ...this.mapWechatMpBenchmarkArticle({
          ...asset,
          metadataJson: {
            ...meta,
            inMaterialLibrary: true,
            materialAddedAt,
          },
        }),
        isInMaterialLibrary: true,
        materialAddedAt,
      },
      workspace,
    };
  }

  async addWechatSearchItemToMaterialLibrary(brandId: string, itemId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.findWechatSearchItemAssetByItemId(brandId, itemId);
    const meta = this.asMeta(asset.metadataJson);
    const materialAddedAt = this.readMetaString(meta, "materialAddedAt") || new Date().toISOString();
    await this.updateCollectorAssetMeta(brandId, asset.id, {
      inMaterialLibrary: true,
      materialAddedAt,
    });
    const workspace = await this.getWechatSearchWorkspace(brandId);
    return {
      item: workspace.items.find((item) => item.id === itemId) || {
        ...this.mapWechatSearchItem({
          ...asset,
          metadataJson: {
            ...meta,
            inMaterialLibrary: true,
            materialAddedAt,
          },
        }),
        isInMaterialLibrary: true,
        materialAddedAt,
      },
      workspace,
    };
  }

  async removeDouyinBenchmarkWorkFromMaterialLibrary(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (!this.isDouyinMaterialLibrarySupportedKind(kind)) {
      throw new BadRequestException("仅支持将抖音竞品作品、对标作品、搜索作品或榜单作品移出素材库");
    }

    await this.updateCollectorAssetMeta(brandId, assetId, {
      inMaterialLibrary: false,
      materialAddedAt: "",
    });

    return {
      item: {
        ...this.mapDouyinCollectedWork(
          {
            ...asset,
            metadataJson: {
              ...meta,
              inMaterialLibrary: false,
              materialAddedAt: "",
            },
          },
          kind,
        ),
        isInMaterialLibrary: undefined,
        materialAddedAt: undefined,
      },
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  async deleteDouyinCollectedWork(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const kind = this.readMetaString(this.asMeta(asset.metadataJson), "kind");
    if (!this.isDouyinMaterialLibrarySupportedKind(kind)) {
      throw new BadRequestException("仅支持删除抖音竞品作品、对标作品、搜索作品或榜单作品");
    }
    await this.deleteCollectorAssetById(brandId, assetId);
    return {
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  async deleteDouyinBrandAccount(brandId: string, accountId: string): Promise<{ workspace: DouyinCollectionWorkspace }> {
    return this.deleteDouyinCollectedAccount(brandId, accountId, "DOUYIN_BRAND_ACCOUNT", ["DOUYIN_BRAND_WORK"]);
  }

  async deleteDouyinCompetitorAccount(brandId: string, accountId: string): Promise<{ workspace: DouyinCollectionWorkspace }> {
    return this.deleteDouyinCollectedAccount(
      brandId,
      accountId,
      "DOUYIN_COMPETITOR_ACCOUNT",
      ["DOUYIN_COMPETITOR_WORK", "DOUYIN_BENCHMARK_WORK"],
    );
  }

  async extractDouyinWorkTranscript(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (!this.isDouyinWorkKind(kind)) {
      throw new BadRequestException("仅支持对抖音作品提取视频文案");
    }
    const existingTranscript = this.readMetaString(meta, "transcript");
    if (existingTranscript) {
      return {
        item: this.mapDouyinCollectedWork(asset, kind),
        workspace: await this.getDouyinWorkspace(brandId),
      };
    }
    const transcriptSourceUrl = this.resolveDouyinTranscriptVideoUrl(asset, meta);
    if (!transcriptSourceUrl) {
      throw new BadRequestException("当前作品缺少可识别的视频地址，请先重新采集或等待视频缓存完成");
    }
    await this.updateCollectorAssetMeta(brandId, assetId, {
      transcriptStatus: "PENDING",
      transcriptLastError: "",
    });
    try {
      const result = await this.glmOpenService.extractVideoTranscript(brandId, transcriptSourceUrl, {
        userId: `douyin-${brandId}`,
      });
      await this.updateCollectorAssetMeta(brandId, assetId, {
        transcript: result.text,
        transcriptSource: result.model || "glm-5v-turbo",
        transcriptStatus: "SUCCESS",
        transcriptLastError: "",
        transcribedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "提取失败";
      await this.updateCollectorAssetMeta(brandId, assetId, {
        transcriptStatus: "FAILED",
        transcriptLastError: message,
      });
      throw error;
    }
    const updatedAsset = await this.getCollectorAssetById(brandId, assetId);
    return {
      item: this.mapDouyinCollectedWork(updatedAsset, kind),
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  private resolveDouyinTranscriptVideoUrl(asset: AssetRecord, meta: Record<string, unknown>) {
    return this.resolveDouyinVideoPlaybackUrl(asset, meta)
      || this.readMetaString(meta, "videoSourceUrl")
      || this.readMetaString(meta, "videoUrl")
      || "";

    const workUrl =
      this.normalizeDouyinShareUrl(this.readMetaString(meta, "workUrl"))
      || this.normalizeDouyinShareUrl(String(asset.fileUrl || ""))
      || this.readMetaString(meta, "workUrl")
      || String(asset.fileUrl || "").trim();
    if (workUrl) {
      return workUrl;
    }
    const workId = this.readMetaString(meta, "workId");
    const workType = this.readMetaString(meta, "workType") || "鐭棰?";
    return this.normalizeDouyinNoteUrl(workId, workType);
  }

  private async extractDouyinTranscriptByMathMind(brandId: string, videoUrl: string) {
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, [
      CollectorsService.MATHMIND_API_BASE_URL,
    ]);
    if (resolution.status === "brand-api-key-missing") {
      throw new ServiceUnavailableException(
        `褰撳墠鍝佺墝灏氭湭閰嶇疆绗笁鏂瑰钩鍙?${resolution.platform.name}鐨?API Key锛岃鍏堝埌涓汉涓績-绗笁鏂规帴鍙ｉ厤缃腑瀹屾垚璁剧疆`,
      );
    }

    const apiKey = String(resolution.status === "resolved" ? resolution.apiKeys[0] || "" : "").trim();
    if (!apiKey) {
      throw new ServiceUnavailableException("MathMind 骞冲彴鏈厤缃彲鐢?API Key锛屾殏鏃舵棤娉曟彁鍙栬棰戞枃妗?");
    }

    const requestJson = async (url: string, method: "GET" | "POST", body?: Record<string, unknown>) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      try {
        const response = await fetch(url, {
          method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        const rawText = await response.text();
        let payload: Record<string, unknown> | undefined;
        try {
          payload = rawText ? this.asMeta(JSON.parse(rawText)) : undefined;
        } catch {
          payload = undefined;
        }
        if (!response.ok) {
          const errorText = (
            this.readMetaString(payload || {}, "message")
            || this.readMetaString(payload || {}, "msg")
            || rawText
            || `${response.status} ${response.statusText}`
          ).slice(0, 240);
          throw new ServiceUnavailableException(
            errorText,
          );
        }
        return payload || {};
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new ServiceUnavailableException("MathMind 鎻愬彇瑙嗛鏂囨瓒呮椂锛岃绋嶅悗鍐嶈瘯");
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    };

    const extractResultText = (payload: Record<string, unknown>) => {
      const resultRecord = this.asMeta(payload.result) || this.asMeta(payload.data) || payload;
      const candidates = [
        this.readMetaString(resultRecord, "result"),
        this.readMetaString(resultRecord, "content"),
        this.readMetaString(resultRecord, "text"),
        this.readMetaString(resultRecord, "copy"),
        this.readMetaString(resultRecord, "transcript"),
        this.readMetaString(payload, "result"),
        this.readMetaString(payload, "content"),
        this.readMetaString(payload, "text"),
      ];
      return candidates.find((item) => item.trim())?.trim() || "";
    };

    const readTaskStatus = (payload: Record<string, unknown>) => {
      const resultRecord = this.asMeta(payload.data) || this.asMeta(payload.result) || payload;
      return (
        this.readMetaString(resultRecord, "status")
        || this.readMetaString(resultRecord, "state")
        || this.readMetaString(payload, "status")
        || this.readMetaString(payload, "state")
        || ""
      ).trim().toUpperCase();
    };

    const submitPayload = await requestJson(
      `${CollectorsService.MATHMIND_API_BASE_URL}/minimalist/api/video-audio/video2txtAsync`,
      "POST",
      { videoUrl },
    );
    const immediateResult = extractResultText(submitPayload);
    if (immediateResult) {
      return immediateResult;
    }

    const submitData = this.asMeta(submitPayload.data);
    const taskId = (this.readMetaString(submitData, "taskId") || this.readMetaString(submitPayload, "taskId")).trim();
    const statusUrl = (this.readMetaString(submitData, "statusUrl") || this.readMetaString(submitPayload, "statusUrl")).trim();
    if (!taskId && !statusUrl) {
      throw new ServiceUnavailableException("MathMind 鏈繑鍥炲彲鏌ヨ鐨勪换鍔?ID锛屾棤娉曠户缁彁鍙栬棰戞枃妗?");
    }

    const pollUrl = statusUrl
      ? (statusUrl.startsWith("http")
        ? statusUrl
        : `${CollectorsService.MATHMIND_API_BASE_URL}/${statusUrl.replace(/^\/+/, "")}`)
      : `${CollectorsService.MATHMIND_API_BASE_URL}/minimalist/api/task/${encodeURIComponent(taskId)}?timeout=50`;

    for (let attempt = 1; attempt <= CollectorsService.DOUYIN_TRANSCRIPT_POLL_MAX_ATTEMPTS; attempt += 1) {
      if (attempt > 1) {
        await new Promise((resolvePromise) =>
          setTimeout(resolvePromise, CollectorsService.DOUYIN_TRANSCRIPT_POLL_INTERVAL_MS)
        );
      }

      const pollPayload = await requestJson(pollUrl, "GET");
      const resultText = extractResultText(pollPayload);
      if (resultText) {
        return resultText;
      }

      const status = readTaskStatus(pollPayload);
      if (["FAILED", "ERROR", "CANCELLED", "TIMEOUT"].includes(status)) {
        throw new ServiceUnavailableException(
          this.readMetaString(this.asMeta(pollPayload.data), "message")
            || this.readMetaString(pollPayload, "message")
            || this.readMetaString(pollPayload, "msg")
            || "MathMind 鎻愬彇瑙嗛鏂囨澶辫触锛岃绋嶅悗鍐嶈瘯",
        );
      }
      if (["SUCCESS", "SUCCEEDED", "DONE", "FINISHED", "COMPLETED"].includes(status)) {
        throw new ServiceUnavailableException("MathMind 宸插畬鎴愪换鍔★紝浣嗘病鏈夎繑鍥炲彲鐢ㄧ殑瑙嗛鏂囨缁撴灉");
      }
    }

    throw new ServiceUnavailableException("MathMind 鎻愬彇瑙嗛鏂囨瓒呮椂锛岃绋嶅悗鍐嶈瘯");
  }

  async removeDouyinKeywordRecommendation(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (kind !== "DOUYIN_KEYWORD_RECOMMENDATION") {
      throw new BadRequestException("仅支持删除抖音关键词推荐结果");
    }

    await this.deleteCollectorAssetById(brandId, assetId);
    return {
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  private async deleteDouyinCollectedAccount(
    brandId: string,
    accountId: string,
    accountKind: "DOUYIN_BRAND_ACCOUNT" | "DOUYIN_COMPETITOR_ACCOUNT",
    relatedWorkKinds: readonly DouyinWorkKind[],
  ) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => asset.id === accountId);
    if (!target) {
      throw new NotFoundException("抖音账号记录不存在");
    }

    const targetMeta = this.asMeta(target.metadataJson);
    const targetKind = this.readMetaString(targetMeta, "kind");
    if (targetKind !== accountKind) {
      throw new BadRequestException("当前记录不是可删除的抖音账号");
    }

    const sourceAccountId = this.readMetaString(targetMeta, "sourceAccountId");
    const relatedAssetIds = assets
      .filter((asset) => {
        if (asset.id === target.id) {
          return true;
        }
        const meta = this.asMeta(asset.metadataJson);
        const kind = this.readMetaString(meta, "kind") as DouyinWorkKind;
        if (!relatedWorkKinds.includes(kind)) {
          return false;
        }
        return this.readMetaString(meta, "sourceAccountId") === sourceAccountId;
      })
      .map((asset) => asset.id);

    for (const assetId of relatedAssetIds) {
      await this.deleteCollectorAssetById(brandId, assetId);
    }

    return {
      workspace: await this.getDouyinWorkspace(brandId),
    };
  }

  async syncFeishuWorkspace(brandId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const binding = await this.getFeishuBinding(brandId);
    if (!binding) {
      throw new NotFoundException("请先在品牌增长策略中绑定飞书副本链接");
    }

    await this.updateFeishuBindingState(brandId, {
      syncStatus: "RUNNING",
      lastError: "",
    });

    try {
      const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
      const baseToken = await this.resolveFeishuBaseToken(binding, userAccessToken);
      const tables = await this.listFeishuTables(baseToken, userAccessToken);
      const matchedTables = await this.matchFeishuTables(baseToken, userAccessToken, tables, binding);
      await this.clearExistingXiaohongshuCollectorAssets(brandId);
      const tableCount = this.countUniqueMatchedTables(matchedTables);
      const syncBreakdown: FeishuSyncBreakdown = {
        brandAccounts: 0,
        competitorAccounts: 0,
        brandNotes: 0,
        benchmarkNotes: 0,
        targetUsers: 0,
      };
      let syncedCount = 0;

      if (matchedTables.brandAccounts) {
        syncBreakdown.brandAccounts = await this.syncFeishuAccountTable(brandId, baseToken, matchedTables.brandAccounts, "XHS_BRAND_ACCOUNT");
        syncedCount += syncBreakdown.brandAccounts;
      }
      if (matchedTables.competitorAccounts) {
        syncBreakdown.competitorAccounts = await this.syncFeishuAccountTable(brandId, baseToken, matchedTables.competitorAccounts, "XHS_COMPETITOR_ACCOUNT");
        syncedCount += syncBreakdown.competitorAccounts;
      }
      if (matchedTables.brandNotes) {
        syncBreakdown.brandNotes = await this.syncFeishuBrandNotesTable(brandId, baseToken, matchedTables.brandNotes);
        syncedCount += syncBreakdown.brandNotes;
      }
      if (matchedTables.benchmarkNotes) {
        syncBreakdown.benchmarkNotes = await this.syncFeishuBenchmarkNotesTable(brandId, baseToken, matchedTables.benchmarkNotes);
        syncedCount += syncBreakdown.benchmarkNotes;
      }
      if (matchedTables.targetUsers) {
        syncBreakdown.targetUsers = await this.syncFeishuTargetUsersTable(brandId, baseToken, matchedTables.targetUsers);
        syncedCount += syncBreakdown.targetUsers;
      }
      await this.cleanupDuplicateCollectorAssets(brandId);

      const lastSyncAt = new Date().toISOString();
      await this.updateFeishuBindingState(brandId, {
        baseToken,
        syncStatus: "SUCCESS",
        lastError: "",
        lastSyncAt,
      });

      const workspace = await this.getXiaohongshuWorkspace(brandId);
      return {
        syncedCount,
        tableCount,
        workspace,
        binding: await this.getFeishuBinding(brandId),
        matchedTables: this.serializeMatchedTables(matchedTables),
        syncBreakdown,
        workspaceCounts: this.buildWorkspaceCounts(workspace),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "飞书副本同步失败";
      await this.updateFeishuBindingState(brandId, {
        syncStatus: "FAILED",
        lastError: message,
      });
      throw new ServiceUnavailableException(`飞书副本同步失败：${message}`);
    }
  }

  async fetchFeishuMedia(brandId: string, sourceUrl: string) {
    if (!sourceUrl?.trim()) {
      throw new BadRequestException("缺少附件地址");
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(sourceUrl);
    } catch {
      throw new BadRequestException("附件地址无效");
    }

    const isAllowedHost = targetUrl.hostname === "open.feishu.cn"
      || targetUrl.hostname === "open.larkoffice.com"
      || targetUrl.hostname.endsWith(".feishu.cn")
      || targetUrl.hostname.endsWith(".larkoffice.com")
      || targetUrl.hostname.endsWith(".larksuite.com");
    const isAllowedPath = /\/open-apis\/drive\/v1\/medias\/[^/]+\/download/i.test(targetUrl.pathname)
      || /\/space\/api\/box\/stream\/download/i.test(targetUrl.pathname)
      || /\/media\/download/i.test(targetUrl.pathname);
    if (!isAllowedHost || !isAllowedPath) {
      throw new BadRequestException("当前只支持代理飞书附件下载地址");
    }

    let userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    let response = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });
    if (response.status === 401) {
      userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId, true);
      response = await fetch(targetUrl.toString(), {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });
    }

    if (response.status === 403) {
      throw new ForbiddenException("飞书附件下载权限不足，请在后台重新授权飞书账号以补齐文档与云空间下载权限");
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`飞书附件获取失败：${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const disposition = response.headers.get("content-disposition") || "";
    const fileName = this.extractFileNameFromDisposition(disposition)
      || this.extractFileNameFromMediaUrl(targetUrl.toString())
      || "feishu-media";

    return {
      buffer,
      contentType,
      fileName,
    };
  }

  async fetchXhsStoredMedia(brandId: string, fileName: string) {
    const safeFileName = this.sanitizeStoredFileName(fileName);
    const file = await this.ossStorageService.getObject(this.buildXhsNoteMediaStorageKey(brandId, safeFileName));
    if (!file) {
      throw new NotFoundException("作品媒体不存在");
    }
    return {
      ...file,
      fileName: safeFileName,
    };
  }

  async fetchDouyinStoredMedia(brandId: string, assetId: string) {
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (!this.isDouyinWorkKind(kind)) {
      throw new NotFoundException("对应采集记录不包含抖音视频");
    }
    const storageKey = this.readMetaString(meta, "videoStorageKey");
    const status = this.readMetaString(meta, "videoCacheStatus");
    if (!storageKey || status !== "READY" || this.isIsoDateExpired(this.readMetaString(meta, "videoCacheExpiresAt"))) {
      throw new NotFoundException("抖音视频预览不存在或已过期");
    }
    const file = await this.ossStorageService.getObject(storageKey);
    if (!file) {
      throw new NotFoundException("抖音视频预览不存在");
    }
    const storageFileName = storageKey.split("/").pop() || "";
    const safeFileName =
      this.sanitizeStoredFileName(storageFileName)
      || `${this.sanitizeStoredFileName(this.readMetaString(meta, "workId")) || asset.id}.mp4`;
    return {
      ...file,
      fileName: safeFileName,
    };
  }

  private async cacheXhsNoteMediaBundle(brandId: string, noteId: string, imageUrls: string[], videoUrl?: string) {
    const cachedImages: string[] = [];
    for (const [index, sourceUrl] of imageUrls.entries()) {
      try {
        cachedImages.push(await this.cacheXhsRemoteMedia(brandId, noteId, sourceUrl, "image", index));
      } catch (error) {
        const detail = error instanceof Error ? error.message : "未知错误";
        this.logger.warn(`小红书图片缓存失败：${noteId}#${index + 1} ${detail}`);
      }
    }

    let cachedVideoUrl = "";
    if (videoUrl) {
      try {
        cachedVideoUrl = await this.cacheXhsRemoteMedia(brandId, noteId, videoUrl, "video", 0);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "未知错误";
        this.logger.warn(`小红书视频缓存失败：${noteId} ${detail}`);
      }
    }

    return {
      imageList: cachedImages,
      videoUrl: cachedVideoUrl,
    };
  }

  private async cacheXhsRemoteMedia(
    brandId: string,
    noteId: string,
    sourceUrl: string,
    mediaType: "image" | "video",
    index: number,
  ) {
    const normalizedUrl = this.normalizeHttpUrl(sourceUrl);
    if (!normalizedUrl) {
      throw new BadRequestException("媒体地址无效");
    }
    const { buffer, response } = await this.downloadRemoteBuffer(normalizedUrl, {
      label: mediaType === "video" ? "小红书视频缓存" : "小红书图片缓存",
      timeoutMs:
        mediaType === "video"
          ? CollectorsService.REMOTE_VIDEO_DOWNLOAD_TIMEOUT_MS
          : CollectorsService.REMOTE_IMAGE_DOWNLOAD_TIMEOUT_MS,
      retryCount: mediaType === "video" ? 1 : 0,
    });
    const contentType = this.resolveXhsMediaContentType(
      response.headers.get("content-type") || "",
      normalizedUrl,
      mediaType,
    );
    const fileName = this.buildXhsNoteMediaFileName(noteId, mediaType, index, contentType, normalizedUrl);
    await this.ossStorageService.putObject(this.buildXhsNoteMediaStorageKey(brandId, fileName), buffer, contentType);
    return this.buildXhsNoteMediaAssetUrl(brandId, fileName);
  }

  async getDailyHotspotWorkspace(
    brandId: string,
    targetDate?: string,
    options?: { skipAutoCatchUp?: boolean; blockOnAutoCatchUp?: boolean },
  ): Promise<DailyHotspotWorkspace> {
    void options;
    return this.readDailyHotspotWorkspace(brandId, targetDate);
  }

  private async readDailyHotspotWorkspace(brandId: string, targetDate?: string): Promise<DailyHotspotWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: { updatedAt: "desc" },
      });

      return this.buildDailyHotspotWorkspace(
        assets.map((item) => ({
          id: item.id,
          brandId: item.brandId,
          category: "PLATFORM_EXPORT" as const,
          title: item.title,
          description: item.description ?? "",
          sourceName: "每日热点采集",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        })),
        targetDate,
      );
    }

    this.ensureBrandExistsInMock(brandId);
    const assets = database.assets.filter((item) => item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    return this.buildDailyHotspotWorkspace(assets, targetDate);
  }

  async syncDailyHotspots(brandId: string, platformTitles: string[] = []) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const targets = this.limitCollectorBatch(
      this.resolveDailyHotspotConfigs(platformTitles),
      this.collectorSyncBatchLimit,
      "daily hotspot platforms",
    );
    const results = await this.mapWithConcurrency(
      targets,
      this.dailyHotspotPlatformConcurrency,
      (config) => this.collectAndStoreDailyHotspotPlatform(brandId, config),
    );

    return {
      syncedCount: results.filter((item) => item.syncStatus === "SUCCESS").length,
      results,
      workspace: await this.getDailyHotspotWorkspace(brandId, undefined, { skipAutoCatchUp: true }),
    };
  }

  private async listCollectorAssets(brandId: string): Promise<AssetRecord[]> {
    await this.ensureBrandExistsInDatabase(brandId);
    const assets = await this.prismaService.businessAsset.findMany({
      where: {
        brandId,
        category: AssetCategory.PLATFORM_EXPORT,
      },
      orderBy: { updatedAt: "desc" },
    });

    return assets.map((item) => ({
      id: item.id,
      brandId: item.brandId,
      category: "PLATFORM_EXPORT" as const,
      title: item.title,
      description: item.description ?? "",
      sourceName: "平台采集",
      fileUrl: item.fileUrl ?? undefined,
      metadataJson: this.asMeta(item.metadataJson),
    }));
  }

  private async listAllCollectorAssets(): Promise<AssetRecord[]> {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: { updatedAt: "desc" },
      });
      return assets.map((item) => ({
        id: item.id,
        brandId: item.brandId,
        category: "PLATFORM_EXPORT" as const,
        title: item.title,
        description: item.description ?? "",
        sourceName: "平台采集",
        fileUrl: item.fileUrl ?? undefined,
        metadataJson: this.asMeta(item.metadataJson),
      }));
    }

    return database.assets.filter((item) => item.category === "PLATFORM_EXPORT");
  }

  private async getWorkspaceFromDatabase(brandId: string): Promise<XhsCollectionWorkspace> {
    return this.buildWorkspaceFromAssets(await this.listCollectorAssets(brandId));
  }

  private getWorkspaceFromMock(brandId: string): XhsCollectionWorkspace {
    this.ensureBrandExistsInMock(brandId);
    const assets = database.assets.filter((item) => item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    return this.buildWorkspaceFromAssets(assets);
  }

  private getDouyinWorkspaceFromMock(
    brandId: string,
    contentTags: DouyinContentTagOption[] = [],
    cityOptions: DouyinCityOption[] = [],
  ): DouyinCollectionWorkspace {
    this.ensureBrandExistsInMock(brandId);
    const assets = database.assets.filter((item) => item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    return this.buildDouyinWorkspaceFromAssets(assets, contentTags, cityOptions);
  }

  private buildWorkspaceFromAssets(assets: AssetRecord[]): XhsCollectionWorkspace {
    const brandAccounts = assets
      .filter((item) => item.metadataJson?.kind === "XHS_BRAND_ACCOUNT")
      .map((item) => this.mapCollectedAccount(item, "XHS_BRAND_ACCOUNT"));
    const competitorAccounts = assets
      .filter((item) => item.metadataJson?.kind === "XHS_COMPETITOR_ACCOUNT")
      .map((item) => this.mapCollectedAccount(item, "XHS_COMPETITOR_ACCOUNT"));
    const brandNotes = this.dedupeCollectorRecordsByContent(
      assets
        .filter((item) => item.metadataJson?.kind === "XHS_BRAND_NOTE")
        .map((item) => this.mapCollectedNote(item)),
    );
    const benchmarkNotes = assets
      .filter((item) => item.metadataJson?.kind === "XHS_BENCHMARK_NOTE")
      .map((item) => this.mapCollectedNote(item));
    const searchNotes = assets
      .filter((item) => item.metadataJson?.kind === "XHS_SEARCH_NOTE")
      .map((item) => this.mapCollectedNote(item));
    const commentData = assets
      .filter((item) => item.metadataJson?.kind === "XHS_NOTE_COMMENT")
      .map((item) => this.mapXhsComment(item));
    const targetUsers = assets
      .filter((item) => item.metadataJson?.kind === "XHS_TARGET_USER")
      .map((item) => this.mapCollectedTargetUser(item));

    return { brandAccounts, competitorAccounts, brandNotes, benchmarkNotes, searchNotes, commentData, targetUsers };
  }

  private listXhsMaterialLibraryNotes(workspace: XhsCollectionWorkspace) {
    const deduped = new Map<string, XhsCollectionWorkspace["benchmarkNotes"][number]>();
    [...workspace.benchmarkNotes, ...workspace.searchNotes]
      .filter((item) => item.isInMaterialLibrary)
      .forEach((item) => {
        if (!deduped.has(item.id)) {
          deduped.set(item.id, item);
        }
      });
    return Array.from(deduped.values());
  }

  private buildDouyinWorkspaceFromAssets(
    assets: AssetRecord[],
    contentTags: DouyinContentTagOption[] = [],
    cityOptions: DouyinCityOption[] = [],
  ): DouyinCollectionWorkspace {
    const brandAccounts = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_BRAND_ACCOUNT")
      .map((item) => this.mapDouyinCollectedAccount(item, "DOUYIN_BRAND_ACCOUNT"));
    const competitorAccounts = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_COMPETITOR_ACCOUNT")
      .map((item) => this.mapDouyinCollectedAccount(item, "DOUYIN_COMPETITOR_ACCOUNT"));
    const brandWorks = this.dedupeCollectorRecordsByContent(
      assets
        .filter((item) => item.metadataJson?.kind === "DOUYIN_BRAND_WORK")
        .map((item) => this.mapDouyinCollectedWork(item, "DOUYIN_BRAND_WORK")),
    );
    const competitorWorks = this.dedupeCollectorRecordsByContent(
      assets
        .filter((item) => item.metadataJson?.kind === "DOUYIN_COMPETITOR_WORK")
        .map((item) => this.mapDouyinCollectedWork(item, "DOUYIN_COMPETITOR_WORK")),
    );
    const benchmarkWorks = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_BENCHMARK_WORK")
      .map((item) => this.mapDouyinCollectedWork(item, "DOUYIN_BENCHMARK_WORK"));
    const searchWorks = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_SEARCH_WORK")
      .map((item) => this.mapDouyinCollectedWork(item, "DOUYIN_SEARCH_WORK"));
    const keywordRecommendations = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_KEYWORD_RECOMMENDATION")
      .map((item) => this.mapDouyinKeywordRecommendation(item));
    const commentData = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_COMMENT")
      .map((item) => this.mapDouyinComment(item));
    const targetUsers = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_TARGET_USER")
      .map((item) => this.mapDouyinTargetUser(item));
    const lowFanExplosiveWorks = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_LOW_FAN_EXPLOSIVE_WORK")
      .map((item) => this.mapDouyinCollectedWork(item, "DOUYIN_LOW_FAN_EXPLOSIVE_WORK"));
    const highCompletionRateWorks = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_HIGH_COMPLETION_RATE_WORK")
      .map((item) => this.mapDouyinCollectedWork(item, "DOUYIN_HIGH_COMPLETION_RATE_WORK"));
    const highLikeRateWorks = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_HIGH_LIKE_RATE_WORK")
      .map((item) => this.mapDouyinCollectedWork(item, "DOUYIN_HIGH_LIKE_RATE_WORK"));
    const cityHotspots = assets
      .filter((item) => item.metadataJson?.kind === "DOUYIN_CITY_HOTSPOT")
      .map((item) => this.mapDouyinCityHotspot(item))
      .sort((left, right) => left.rank - right.rank || Date.parse(right.collectedAt) - Date.parse(left.collectedAt));

    return {
      brandAccounts,
      competitorAccounts,
      brandWorks,
      competitorWorks,
      benchmarkWorks,
      searchWorks,
      keywordRecommendations,
      commentData,
      targetUsers,
      lowFanExplosiveWorks,
      highCompletionRateWorks,
      highLikeRateWorks,
      cityHotspots,
      contentTags,
      cityOptions,
    };
  }

  private listDouyinMaterialLibraryWorks(workspace: DouyinCollectionWorkspace) {
    const deduped = new Map<string, DouyinCollectionWorkspace["benchmarkWorks"][number]>();
    [
      ...workspace.competitorWorks,
      ...workspace.benchmarkWorks,
      ...workspace.searchWorks,
      ...workspace.lowFanExplosiveWorks,
      ...workspace.highCompletionRateWorks,
      ...workspace.highLikeRateWorks,
    ]
      .filter((item) => item.isInMaterialLibrary)
      .forEach((item) => {
        if (!deduped.has(item.id)) {
          deduped.set(item.id, item);
        }
      });
    return Array.from(deduped.values());
  }

  private listWechatMaterialLibraryItems(
    benchmarkWorkspace: WechatMpBenchmarkWorkspace,
    searchWorkspace: { items: WechatSearchItemRecord[] },
  ) {
    const deduped = new Map<string, WechatMpBenchmarkArticleRecord | WechatSearchItemRecord>();
    [...benchmarkWorkspace.benchmarkArticles, ...searchWorkspace.items]
      .filter((item) => item.isInMaterialLibrary)
      .forEach((item) => {
        if (!deduped.has(item.id)) {
          deduped.set(item.id, item);
        }
      });
    return Array.from(deduped.values());
  }

  private resolveMaterialLibrarySortTime(item: { materialAddedAt?: string; collectedAt: string }) {
    const timestamp = Date.parse(item.materialAddedAt || item.collectedAt || "");
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private mapCollectedAccount(asset: AssetRecord, kind: CollectorAccountKind): XhsCollectedAccountRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      kind,
      sourceAccountId: this.readMetaString(meta, "sourceAccountId"),
      sourceAccountLink: this.readMetaString(meta, "sourceAccountLink"),
      accountRole: this.normalizeXhsAccountRole(this.readMetaString(meta, "accountRole")),
      accountName: asset.title,
      externalUserId: this.readMetaString(meta, "externalUserId") || undefined,
      postedCount: this.readMetaNumber(meta, "postedCount"),
      likedCount: this.readMetaNumber(meta, "likedCount"),
      collectedCount: this.readMetaNumber(meta, "collectedCount"),
      avatar: this.readMetaString(meta, "avatar") || undefined,
      description: this.readMetaString(meta, "description") || undefined,
      ipLocation: this.readMetaString(meta, "ipLocation") || undefined,
      followCount: this.readMetaNumber(meta, "followCount"),
      fanCount: this.readMetaNumber(meta, "fanCount"),
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  private mapCollectedNote(asset: AssetRecord): XhsCollectedNoteRecord {
    const meta = this.asMeta(asset.metadataJson);
    const cachedImages = this.readMetaStringArray(meta, "imageList").filter((item) => !/batch_get_tmp_download_url/i.test(item));
    const sourceImages = this.readMetaStringArray(meta, "imageSourceList").filter((item) => !/batch_get_tmp_download_url/i.test(item));
    const cachedVideoUrl = this.readMetaString(meta, "videoUrl");
    const sourceVideoUrl = this.readMetaString(meta, "videoSourceUrl");
    return {
      id: asset.id,
      sourceAccountId: this.readMetaString(meta, "sourceAccountId"),
      noteId: this.readMetaString(meta, "noteId"),
      title: asset.title,
      noteType: this.readMetaString(meta, "noteType") || undefined,
      nickname: this.readMetaString(meta, "nickname")
        || this.readMetaString(meta, "authorName")
        || undefined,
      imageList: this.resolveCollectedXhsImages(cachedImages, sourceImages),
      externalUserId: this.readMetaString(meta, "externalUserId") || undefined,
      noteUrl: this.readMetaString(meta, "noteUrl") || asset.fileUrl,
      description: asset.description,
      likeCount: this.readMetaNumber(meta, "likeCount"),
      collectCount: this.readMetaNumber(meta, "collectCount"),
      createdAtText: this.readMetaString(meta, "createdAtText") || undefined,
      shareCount: this.readMetaNumber(meta, "shareCount"),
      commentCount: this.readMetaNumber(meta, "commentCount"),
      likeCollectRatio: this.readMetaNumber(meta, "likeCollectRatio"),
      likeCommentRatio: this.readMetaNumber(meta, "likeCommentRatio"),
      shareRatio: this.readMetaNumber(meta, "shareRatio"),
      isExplosive: this.readMetaString(meta, "isExplosive") || undefined,
      followUpDecision: this.readMetaString(meta, "followUpDecision") || undefined,
      videoUrl: (cachedVideoUrl || sourceVideoUrl) && !/batch_get_tmp_download_url/i.test(cachedVideoUrl || sourceVideoUrl)
        ? (cachedVideoUrl || sourceVideoUrl)
        : undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
      sourceUrl: this.readMetaString(meta, "sourceUrl") || undefined,
      syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "SUCCESS",
      retryCount: this.readMetaNumber(meta, "retryCount"),
      nextRetryAt: this.readMetaString(meta, "nextRetryAt") || undefined,
      lastError: this.readMetaString(meta, "lastError") || undefined,
      isInMaterialLibrary: this.readMetaBoolean(meta, "inMaterialLibrary") || undefined,
      materialAddedAt: this.readMetaString(meta, "materialAddedAt") || undefined,
      sourceTableId: this.readMetaString(meta, "sourceTableId") || undefined,
      sourceRecordId: this.readMetaString(meta, "sourceRecordId") || undefined,
      rawFields: this.asMeta(meta.rawFields),
    };
  }

  private resolveCollectedXhsImages(cachedImages: string[], sourceImages: string[]) {
    if (!sourceImages.length) {
      return cachedImages;
    }
    if (cachedImages.length === sourceImages.length) {
      return cachedImages;
    }
    return sourceImages;
  }

  private mapDouyinCollectedAccount(
    asset: AssetRecord,
    kind: "DOUYIN_BRAND_ACCOUNT" | "DOUYIN_COMPETITOR_ACCOUNT",
  ): DouyinCollectedAccountRecord {
    const meta = this.asMeta(asset.metadataJson);
    const accountLink = this.readMetaString(meta, "accountLink") || this.readMetaString(meta, "sourceAccountLink") || asset.fileUrl || "";
    return {
      id: asset.id,
      kind,
      sourceAccountId: this.readMetaString(meta, "sourceAccountId"),
      accountLink,
      sourceAccountLink: accountLink,
      accountRole: this.normalizeXhsAccountRole(this.readMetaString(meta, "accountRole")),
      accountName: asset.title,
      externalUserId: this.readMetaString(meta, "externalUserId") || undefined,
      username: this.readMetaString(meta, "username") || undefined,
      shortId: this.readMetaString(meta, "shortId") || undefined,
      avatar: this.readMetaString(meta, "avatar") || undefined,
      description: this.readMetaString(meta, "description") || undefined,
      postedCount: this.readMetaNumber(meta, "postedCount"),
      likedCount: this.readMetaNumber(meta, "likedCount"),
      fanCount: this.readMetaNumber(meta, "fanCount"),
      followCount: this.readMetaNumber(meta, "followCount"),
      ipLocation: this.readMetaString(meta, "ipLocation") || undefined,
      enterpriseVerifyReason: this.readMetaString(meta, "enterpriseVerifyReason") || undefined,
      customVerify: this.readMetaString(meta, "customVerify") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  private mapDouyinCollectedWork(
    asset: AssetRecord,
    kind: DouyinWorkKind,
  ): DouyinCollectedWorkRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      kind,
      sourceAccountId: this.readMetaString(meta, "sourceAccountId"),
      sourceAccountLink: this.readMetaString(meta, "sourceAccountLink"),
      workId: this.readMetaString(meta, "workId"),
      title: asset.title,
      description: asset.description || undefined,
      workType: this.readMetaString(meta, "workType") || undefined,
      authorName: this.readMetaString(meta, "authorName") || undefined,
      authorUniqueId: this.readMetaString(meta, "authorUniqueId") || undefined,
      externalUserId: this.readMetaString(meta, "externalUserId") || undefined,
      workUrl: this.readMetaString(meta, "workUrl") || asset.fileUrl,
      coverUrl: this.readMetaString(meta, "coverUrl") || undefined,
      imageList: this.readMetaStringArray(meta, "imageList"),
      videoUrl: this.resolveDouyinVideoPlaybackUrl(asset, meta),
      hashtags: this.readMetaStringArray(meta, "hashtags"),
      publishTimeText: this.readMetaString(meta, "publishTimeText") || undefined,
      durationMs: this.readMetaNumber(meta, "durationMs"),
      mediaType: this.readMetaNumber(meta, "mediaType"),
      awemeType: this.readMetaNumber(meta, "awemeType"),
      musicTitle: this.readMetaString(meta, "musicTitle") || undefined,
      musicAuthor: this.readMetaString(meta, "musicAuthor") || undefined,
      likeCount: this.readMetaNumber(meta, "likeCount"),
      playCount: this.readMetaNumber(meta, "playCount"),
      shareCount: this.readMetaNumber(meta, "shareCount"),
      commentCount: this.readMetaNumber(meta, "commentCount"),
      collectCount: this.readMetaNumber(meta, "collectCount"),
      downloadCount: this.readMetaNumber(meta, "downloadCount"),
      recommendCount: this.readMetaNumber(meta, "recommendCount"),
      likeCollectRatio: this.readMetaNumber(meta, "likeCollectRatio"),
      likeCommentRatio: this.readMetaNumber(meta, "likeCommentRatio"),
      shareRatio: this.readMetaNumber(meta, "shareRatio"),
      isExplosive: this.readMetaString(meta, "isExplosive") || undefined,
      followUpDecision: this.readMetaString(meta, "followUpDecision") || undefined,
      statsPatched: this.readMetaBoolean(meta, "statsPatched"),
      authorFollowerCount: this.readMetaNumber(meta, "authorFollowerCount"),
      authorLikedCount: this.readMetaNumber(meta, "authorLikedCount"),
      authorAvatar: this.readMetaString(meta, "authorAvatar") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
      videoCacheStatus: (this.readMetaString(meta, "videoCacheStatus") as DouyinCollectedWorkRecord["videoCacheStatus"]) || undefined,
      videoCacheLastError: this.readMetaString(meta, "videoCacheLastError") || undefined,
      transcript: this.readMetaString(meta, "transcript") || undefined,
      transcriptSource: this.readMetaString(meta, "transcriptSource") || undefined,
      transcriptStatus: (this.readMetaString(meta, "transcriptStatus") as DouyinCollectedWorkRecord["transcriptStatus"]) || undefined,
      transcriptLastError: this.readMetaString(meta, "transcriptLastError") || undefined,
      transcribedAt: this.readMetaString(meta, "transcribedAt") || undefined,
      isInMaterialLibrary: this.readMetaBoolean(meta, "inMaterialLibrary") || undefined,
      materialAddedAt: this.readMetaString(meta, "materialAddedAt") || undefined,
      billboardLabel: this.readMetaString(meta, "billboardLabel") || undefined,
      primaryTagLabel: this.readMetaString(meta, "primaryTagLabel") || undefined,
      secondaryTagLabel: this.readMetaString(meta, "secondaryTagLabel") || undefined,
      score: this.readMetaNumber(meta, "score"),
    };
  }

  private mapDouyinKeywordRecommendation(asset: AssetRecord): DouyinKeywordRecommendationRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      kind: "DOUYIN_KEYWORD_RECOMMENDATION",
      searchKeyword: this.readMetaString(meta, "searchKeyword"),
      recommendedKeyword: this.readMetaString(meta, "recommendedKeyword") || asset.title,
      searchTime: this.readMetaString(meta, "searchTime") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
      queryId: this.readMetaString(meta, "queryId") || undefined,
      wordsSource: this.readMetaString(meta, "wordsSource") || undefined,
      position: this.readMetaNumber(meta, "position"),
    };
  }

  private mapDouyinComment(asset: AssetRecord): DouyinCommentRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      kind: "DOUYIN_COMMENT",
      sourceWorkId: this.readMetaString(meta, "sourceWorkId"),
      sourceWorkUrl: this.readMetaString(meta, "sourceWorkUrl") || asset.fileUrl || "",
      sourceSecUserId: this.readMetaString(meta, "sourceSecUserId"),
      commentId: this.readMetaString(meta, "commentId"),
      commentText: this.readMetaString(meta, "commentText") || asset.title,
      commentTime: this.readMetaString(meta, "commentTime") || undefined,
      commentUserName: this.readMetaString(meta, "commentUserName") || undefined,
      commentUserSecUserId: this.readMetaString(meta, "commentUserSecUserId"),
      commentUserProfileUrl: this.readMetaString(meta, "commentUserProfileUrl") || undefined,
      likeCount: this.readMetaNumber(meta, "likeCount"),
      replyCount: this.readMetaNumber(meta, "replyCount"),
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  private mapDouyinCityHotspot(asset: AssetRecord): DouyinCityHotspotRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      kind: "DOUYIN_CITY_HOTSPOT",
      cityCode: this.readMetaNumber(meta, "cityCode") ?? 0,
      cityLabel: this.readMetaString(meta, "cityLabel") || "未知城市",
      rank: this.readMetaNumber(meta, "rank") ?? 0,
      rankDiff: this.readMetaNumber(meta, "rankDiff"),
      sentence: this.readMetaString(meta, "sentence") || asset.title,
      sentenceId: this.readMetaString(meta, "sentenceId") || undefined,
      createAtText: this.readMetaString(meta, "createAtText") || undefined,
      hotScore: this.readMetaNumber(meta, "hotScore"),
      videoCount: this.readMetaNumber(meta, "videoCount"),
      sentenceTag: this.readMetaNumber(meta, "sentenceTag"),
      trends: this.readMetaJsonArray(meta, "trends")
        .map((item) => {
          const record = this.asMeta(item);
          const datetime = this.readMetaString(record, "datetime");
          if (!datetime) {
            return null;
          }
          return {
            datetime,
            hotScore: this.readMetaNumber(record, "hotScore") ?? this.readMetaNumber(record, "hot_score"),
          } as DouyinCityHotspotTrendRecord;
        })
        .filter((item): item is DouyinCityHotspotTrendRecord => item !== null),
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  private resolveDouyinVideoPlaybackUrl(asset: AssetRecord, meta: Record<string, unknown>) {
    const status = this.readMetaString(meta, "videoCacheStatus");
    const storageKey = this.readMetaString(meta, "videoStorageKey");
    const expiresAt = this.readMetaString(meta, "videoCacheExpiresAt");
    if (status !== "READY") {
      return undefined;
    }
    if (!storageKey || this.isIsoDateExpired(expiresAt)) {
      return undefined;
    }
    if (this.ossStorageService.isUsingLocalFallback()) {
      return this.buildDouyinVideoAssetUrl(asset.brandId, asset.id);
    }
    if (!this.ossStorageService.isEnabled()) {
      return undefined;
    }
    try {
      return this.ossStorageService.getSignedReadUrl(storageKey, 3600);
    } catch {
      return undefined;
    }
  }

  private buildDouyinVideoCacheMetadata(metadata: Record<string, unknown>) {
    const sourceUrl = this.readMetaString(metadata, "videoUrl");
    if (!sourceUrl) {
      return metadata;
    }
    return {
      ...metadata,
      videoSourceUrl: sourceUrl,
      videoCacheStatus: "PENDING",
      videoCacheLastError: "",
      videoStorageKey: "",
      videoContentType: "",
      videoCachedAt: "",
      videoCacheExpiresAt: "",
    };
  }

  private async cacheDouyinVideoAsset(brandId: string, workId: string, sourceUrl: string) {
    const normalizedUrl = this.normalizeHttpUrl(sourceUrl);
    if (!normalizedUrl) {
      throw new BadRequestException("抖音视频地址无效");
    }
    try {
      const { buffer, response } = await this.downloadRemoteBuffer(normalizedUrl, {
        label: "抖音视频缓存",
        timeoutMs: CollectorsService.REMOTE_VIDEO_DOWNLOAD_TIMEOUT_MS,
        retryCount: 1,
      });
      const contentType = response.headers.get("content-type") || this.guessDouyinVideoContentType(normalizedUrl);
      const storageKey = this.buildDouyinVideoStorageKey(brandId, workId, contentType, normalizedUrl);
      await this.ossStorageService.putObject(storageKey, buffer, contentType);
      const cachedAt = new Date().toISOString();
      return {
        storageKey,
        contentType,
        cachedAt,
        expiresAt: new Date(Date.parse(cachedAt) + CollectorsService.DOUYIN_VIDEO_CACHE_TTL_MS).toISOString(),
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      throw new ServiceUnavailableException(`抖音视频缓存到 OSS 失败：${detail}`);
    }
  }

  private async downloadRemoteBuffer(
    url: string,
    options: {
      label: string;
      timeoutMs: number;
      retryCount?: number;
    },
  ) {
    const attempts = Math.max(1, (options.retryCount || 0) + 1);
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ServiceUnavailableException(`${options.label}失败：${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          buffer,
          response,
        };
      } catch (error) {
        lastError = error;
        if (attempt >= attempts) {
          break;
        }
        const detail = error instanceof Error ? error.message : "未知错误";
        this.logger.warn(`${options.label}重试 ${attempt}/${attempts - 1}：${detail}`);
      } finally {
        clearTimeout(timer);
      }
    }
    if (lastError instanceof ServiceUnavailableException) {
      throw lastError;
    }
    if (lastError instanceof Error && lastError.name === "AbortError") {
      throw new ServiceUnavailableException(`${options.label}超时，视频较大或源站响应较慢时更容易触发`);
    }
    const message = lastError instanceof Error ? lastError.message : "未知错误";
    throw new ServiceUnavailableException(`${options.label}失败：${message}`);
  }

  private enqueueDouyinVideoCache(asset: AssetRecord) {
    const meta = this.asMeta(asset.metadataJson);
    const sourceUrl = this.readMetaString(meta, "videoSourceUrl") || this.readMetaString(meta, "videoUrl");
    const workId = this.readMetaString(meta, "workId");
    const kind = this.readMetaString(meta, "kind");
    if (!sourceUrl || !workId || !this.isDouyinWorkKind(kind)) {
      return;
    }

    this.douyinVideoCacheQueue = this.douyinVideoCacheQueue
      .then(async () => {
        await this.updateCollectorAssetMeta(asset.brandId, asset.id, {
          videoCacheStatus: "PENDING",
          videoCacheLastError: "",
        });
        try {
          const cached = await this.cacheDouyinVideoAsset(asset.brandId, workId, sourceUrl);
          await this.updateCollectorAssetMeta(asset.brandId, asset.id, {
            videoCacheStatus: "READY",
            videoCacheLastError: "",
            videoStorageKey: cached.storageKey,
            videoContentType: cached.contentType,
            videoCachedAt: cached.cachedAt,
            videoCacheExpiresAt: cached.expiresAt,
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : "未知错误";
          await this.updateCollectorAssetMeta(asset.brandId, asset.id, {
            videoCacheStatus: "FAILED",
            videoCacheLastError: detail,
          });
        }
      })
      .catch(() => undefined);
  }

  private async resumePendingDouyinVideoCaches() {
    const assets = await this.listAllCollectorAssets();
    for (const asset of assets) {
      const meta = this.asMeta(asset.metadataJson);
      const kind = this.readMetaString(meta, "kind");
      const status = this.readMetaString(meta, "videoCacheStatus");
      const sourceUrl = this.readMetaString(meta, "videoSourceUrl") || this.readMetaString(meta, "videoUrl");
      if (
        this.isDouyinWorkKind(kind)
        && sourceUrl
        && (!this.readMetaString(meta, "videoStorageKey") || status === "PENDING")
        && status !== "EXPIRED"
      ) {
        this.enqueueDouyinVideoCache(asset);
      }
    }
  }

  private enqueueDouyinTranscriptExtraction(asset: AssetRecord) {
    if (!this.shouldAutoExtractDouyinTranscript(asset)) {
      return;
    }

    this.douyinTranscriptQueue = this.douyinTranscriptQueue
      .then(async () => {
        let latestAsset: AssetRecord;
        try {
          latestAsset = await this.getCollectorAssetById(asset.brandId, asset.id);
        } catch {
          return;
        }

        if (!this.shouldAutoExtractDouyinTranscript(latestAsset)) {
          return;
        }

        try {
          await this.extractDouyinWorkTranscript(latestAsset.brandId, latestAsset.id);
        } catch (error) {
          const detail = error instanceof Error ? error.message : "unknown error";
          this.logger.warn(`Auto extract douyin transcript failed for asset ${latestAsset.id}: ${detail}`);
        }
      })
      .catch(() => undefined);
  }

  private async resumePendingDouyinTranscriptExtractions() {
    const assets = await this.listAllCollectorAssets();
    for (const asset of assets) {
      if (this.shouldAutoExtractDouyinTranscript(asset)) {
        this.enqueueDouyinTranscriptExtraction(asset);
      }
    }
  }

  private shouldAutoExtractDouyinTranscript(asset: AssetRecord) {
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (kind !== "DOUYIN_COMPETITOR_WORK" && kind !== "DOUYIN_BENCHMARK_WORK") {
      return false;
    }
    if (this.readMetaString(meta, "transcript")) {
      return false;
    }
    const transcriptStatus = this.readMetaString(meta, "transcriptStatus");
    const transcriptSource = this.readMetaString(meta, "transcriptSource");
    if (transcriptStatus === "FAILED" && transcriptSource !== "mathmind-video-tools") {
      return false;
    }
    return Boolean(this.resolveDouyinTranscriptVideoUrl(asset, meta));
  }

  private async markDouyinTranscriptPending(asset: AssetRecord) {
    if (!this.shouldAutoExtractDouyinTranscript(asset)) {
      return asset;
    }
    const meta = this.asMeta(asset.metadataJson);
    if (this.readMetaString(meta, "transcriptStatus") === "PENDING") {
      return asset;
    }
    await this.updateCollectorAssetMeta(asset.brandId, asset.id, {
      transcriptStatus: "PENDING",
      transcriptLastError: "",
    });
    return this.getCollectorAssetById(asset.brandId, asset.id);
  }

  private async cleanupExpiredDouyinVideoCaches() {
    const assets = await this.listAllCollectorAssets();
    const expiredAssets = assets.filter((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      const kind = this.readMetaString(meta, "kind");
      const storageKey = this.readMetaString(meta, "videoStorageKey");
      return (
        this.isDouyinWorkKind(kind)
        && Boolean(storageKey)
        && this.isIsoDateExpired(this.readMetaString(meta, "videoCacheExpiresAt"))
      );
    });

    for (const asset of expiredAssets) {
      const meta = this.asMeta(asset.metadataJson);
      const storageKey = this.readMetaString(meta, "videoStorageKey");
      if (storageKey) {
        await this.ossStorageService.deleteObject(storageKey).catch(() => false);
      }
      await this.updateCollectorAssetMeta(asset.brandId, asset.id, {
        videoCacheStatus: "EXPIRED",
        videoCacheLastError: "",
        videoStorageKey: "",
        videoContentType: "",
        videoCachedAt: "",
        videoCacheExpiresAt: "",
      });
    }
  }

  private async getCollectorAssetById(brandId: string, assetId: string): Promise<AssetRecord> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: assetId,
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });

      if (!asset) {
        throw new NotFoundException("未找到对应的采集记录");
      }

      return {
        id: asset.id,
        brandId: asset.brandId,
        category: "PLATFORM_EXPORT",
        title: asset.title,
        description: asset.description ?? "",
        sourceName: "小红书采集",
        fileUrl: asset.fileUrl ?? undefined,
        metadataJson: this.asMeta(asset.metadataJson),
      };
    }

    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = database.assets.find((item) => item.id === assetId && item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    if (!asset) {
      throw new NotFoundException("未找到对应的采集记录");
    }
    return {
      ...asset,
      metadataJson: this.asMeta(asset.metadataJson),
    };
  }

  private async updateCollectorAssetMeta(brandId: string, assetId: string, patch: Record<string, unknown>) {
    if (await this.prismaService.canUseDatabase()) {
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: assetId,
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });

      if (!asset) {
        throw new NotFoundException("未找到对应的采集记录");
      }

      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          metadataJson: {
            ...this.asMeta(asset.metadataJson),
            ...patch,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const index = database.assets.findIndex((item) => item.id === assetId && item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    if (index < 0) {
      throw new NotFoundException("未找到对应的采集记录");
    }

    database.assets[index] = {
      ...database.assets[index],
      metadataJson: {
        ...this.asMeta(database.assets[index].metadataJson),
        ...patch,
      },
    };
  }

  private mapCollectedTargetUser(asset: AssetRecord): XhsCollectedTargetUserRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      sourceUrl: this.readMetaString(meta, "sourceUrl"),
      profileUrl: this.readMetaString(meta, "profileUrl") || undefined,
      userId: this.readMetaString(meta, "userId") || undefined,
      nickname: asset.title,
      noteTitle: this.readMetaString(meta, "noteTitle") || undefined,
      sourceCommentId: this.readMetaString(meta, "sourceCommentId") || undefined,
      commentText: this.readMetaString(meta, "commentText") || undefined,
      matchedKeyword: this.readMetaString(meta, "matchedKeyword") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
      syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "FAILED",
      retryCount: this.readMetaNumber(meta, "retryCount") ?? 0,
      nextRetryAt: this.readMetaString(meta, "nextRetryAt") || undefined,
      lastError: this.readMetaString(meta, "lastError") || undefined,
    };
  }

  private mapDouyinTargetUser(asset: AssetRecord): DouyinCollectedTargetUserRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      sourceUrl: this.readMetaString(meta, "sourceUrl"),
      profileUrl: this.readMetaString(meta, "profileUrl") || undefined,
      secUserId: this.readMetaString(meta, "secUserId") || undefined,
      nickname: asset.title,
      workTitle: this.readMetaString(meta, "workTitle") || undefined,
      sourceCommentId: this.readMetaString(meta, "sourceCommentId") || undefined,
      commentText: this.readMetaString(meta, "commentText") || undefined,
      matchedKeyword: this.readMetaString(meta, "matchedKeyword") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
      syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "FAILED",
      retryCount: this.readMetaNumber(meta, "retryCount") ?? 0,
      nextRetryAt: this.readMetaString(meta, "nextRetryAt") || undefined,
      lastError: this.readMetaString(meta, "lastError") || undefined,
    };
  }

  private mapXhsComment(asset: AssetRecord): XhsCollectedCommentRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      kind: "XHS_NOTE_COMMENT",
      noteId: this.readMetaString(meta, "noteId"),
      noteUrl: this.readMetaString(meta, "noteUrl") || asset.fileUrl || "",
      sourceUrl: this.readMetaString(meta, "sourceUrl") || asset.fileUrl || "",
      commentId: this.readMetaString(meta, "commentId"),
      commentText: this.readMetaString(meta, "commentText") || asset.title,
      commentTime: this.readMetaString(meta, "commentTime") || undefined,
      commentUserName: this.readMetaString(meta, "commentUserName") || undefined,
      commentUserId: this.readMetaString(meta, "commentUserId") || undefined,
      commentUserProfileUrl: this.readMetaString(meta, "commentUserProfileUrl") || undefined,
      likeCount: this.readMetaNumber(meta, "likeCount"),
      replyCount: this.readMetaNumber(meta, "replyCount"),
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  private mapXhsSubCommentItem(
    item: Record<string, unknown>,
    context: { parentCommentId: string; noteId: string; noteUrl: string; sourceUrl: string; fallbackIndex: number },
  ): XhsSubCommentRecord | null {
    const commentId =
      this.pickString(item, ["comment_id", "commentId", "id"])
      || `${context.parentCommentId}-${context.fallbackIndex + 1}`;
    const user = this.asMeta(item.user_info);
    const commentText = this.pickString(item, ["content", "text", "comment_content"]) || "";
    if (!commentId || !commentText) {
      return null;
    }
    return {
      id: `${context.parentCommentId}:${commentId}`,
      kind: "XHS_NOTE_SUB_COMMENT",
      noteId: context.noteId,
      noteUrl: context.noteUrl,
      sourceUrl: context.sourceUrl,
      parentCommentId: context.parentCommentId,
      commentId,
      commentText,
      commentTime:
        this.formatUnixTimestampText(this.pickNumber(item, ["create_time", "comment_time", "time"]))
        || this.pickString(item, ["create_time_text", "time", "create_time"]),
      commentUserName:
        this.pickString(user, ["nickname", "name"])
        || this.pickString(item, ["nickname", "user_name"])
        || undefined,
      commentUserId:
        this.pickString(user, ["user_id", "userid", "id"])
        || this.pickString(item, ["user_id", "userid"])
        || undefined,
      likeCount: this.pickNumber(item, ["like_count", "liked_count", "likes"]),
      collectedAt: new Date().toISOString(),
    };
  }

  private buildDailyHotspotWorkspace(assets: AssetRecord[], targetDate?: string): DailyHotspotWorkspace {
    const allowedPlatformKeys = new Set(DAILY_HOTSPOT_CONFIGS.map((item) => item.platformKey));
    const filteredAssets = assets.filter((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return (
        this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
        && allowedPlatformKeys.has(this.readMetaString(meta, "platformKey"))
      );
    });
    const availableDates = Array.from(
      new Set(
        filteredAssets
          .map((asset) => this.getDailyHotspotSnapshotDate(this.asMeta(asset.metadataJson)))
          .filter(Boolean),
      ),
    ).sort((left, right) => right.localeCompare(left));
    const selectedDate = availableDates.includes(targetDate ?? "") ? (targetDate as string) : (availableDates[0] ?? "");
    const latestByPlatform = new Map<string, AssetRecord>();

    for (const asset of filteredAssets) {
      const meta = this.asMeta(asset.metadataJson);
      if (selectedDate && this.getDailyHotspotSnapshotDate(meta) !== selectedDate) {
        continue;
      }

      const platformKey = this.readMetaString(meta, "platformKey");
      if (!platformKey || latestByPlatform.has(platformKey)) {
        continue;
      }
      latestByPlatform.set(platformKey, asset);
    }

    const platforms = Array.from(latestByPlatform.values()).map((item) => this.mapDailyHotspotPlatform(item));
    return { selectedDate, availableDates, platforms };
  }

  private mapDailyHotspotPlatform(asset: AssetRecord): DailyHotspotPlatformRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      platformKey: this.readMetaString(meta, "platformKey"),
      title: asset.title,
      snapshotDate: this.getDailyHotspotSnapshotDate(meta),
      boardType: this.readMetaString(meta, "boardType") || undefined,
      description: asset.description || undefined,
      sourceLink: this.readMetaString(meta, "sourceLink") || asset.fileUrl || undefined,
      total: this.readMetaNumber(meta, "total") ?? this.readMetaJsonArray(meta, "items").length,
      updateTime: this.readMetaString(meta, "updateTime") || undefined,
      fromCache: this.readMetaBoolean(meta, "fromCache"),
      collectedAt: this.readMetaString(meta, "collectedAt") || undefined,
      syncStatus: (this.readMetaString(meta, "syncStatus") as DailyHotspotSyncStatus) || "IDLE",
      lastError: this.readMetaString(meta, "lastError") || undefined,
      items: this.readMetaJsonArray(meta, "items")
        .map((item, index) => this.normalizeDailyHotspotItem(item, index + 1, this.readMetaString(meta, "platformKey")))
        .filter((item): item is DailyHotspotItemRecord => Boolean(item))
        .filter((item) => Boolean(item.hot !== undefined || item.timestamp !== undefined || item.url || item.mobileUrl))
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 20),
    };
  }

  private async getFeishuBinding(brandId: string): Promise<FeishuBindingRecord | null> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
        orderBy: { updatedAt: "desc" },
      });
      if (!asset) {
        return null;
      }

      const meta = this.asMeta(asset.metadataJson);
      return {
        id: asset.id,
        wikiUrl: asset.fileUrl ?? this.readMetaString(meta, "wikiUrl"),
        wikiToken: this.readMetaString(meta, "wikiToken"),
        host: this.readMetaString(meta, "host"),
        tableId: this.readMetaString(meta, "tableId"),
        viewId: this.readMetaString(meta, "viewId"),
        baseToken: this.readMetaString(meta, "baseToken"),
        templateUrl: this.readMetaString(meta, "templateUrl"),
        syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "IDLE",
        lastError: this.readMetaString(meta, "lastError"),
        lastBoundAt: this.readMetaString(meta, "lastBoundAt"),
        lastSyncAt: this.readMetaString(meta, "lastSyncAt"),
      };
    }

    const asset = database.assets.find((item) => item.brandId === brandId && item.title === FEISHU_BINDING_TITLE);
    if (!asset) {
      return null;
    }

    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      wikiUrl: asset.fileUrl ?? this.readMetaString(meta, "wikiUrl"),
      wikiToken: this.readMetaString(meta, "wikiToken"),
      host: this.readMetaString(meta, "host"),
      tableId: this.readMetaString(meta, "tableId"),
      viewId: this.readMetaString(meta, "viewId"),
      baseToken: this.readMetaString(meta, "baseToken"),
      templateUrl: this.readMetaString(meta, "templateUrl"),
      syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "IDLE",
      lastError: this.readMetaString(meta, "lastError"),
      lastBoundAt: this.readMetaString(meta, "lastBoundAt"),
      lastSyncAt: this.readMetaString(meta, "lastSyncAt"),
    };
  }

  private async updateFeishuBindingState(
    brandId: string,
    patch: Partial<Pick<FeishuBindingRecord, "baseToken" | "syncStatus" | "lastError" | "lastSyncAt">>,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
      });
      if (!asset) {
        return;
      }

      const meta = {
        ...this.asMeta(asset.metadataJson),
        ...(patch.baseToken === undefined ? {} : { baseToken: patch.baseToken }),
        ...(patch.syncStatus === undefined ? {} : { syncStatus: patch.syncStatus }),
        ...(patch.lastError === undefined ? {} : { lastError: patch.lastError }),
        ...(patch.lastSyncAt === undefined ? {} : { lastSyncAt: patch.lastSyncAt }),
      };

      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          metadataJson: meta as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const index = database.assets.findIndex((item) => item.brandId === brandId && item.title === FEISHU_BINDING_TITLE);
    if (index < 0) {
      return;
    }
    database.assets[index] = {
      ...database.assets[index],
      metadataJson: {
        ...this.asMeta(database.assets[index].metadataJson),
        ...(patch.baseToken === undefined ? {} : { baseToken: patch.baseToken }),
        ...(patch.syncStatus === undefined ? {} : { syncStatus: patch.syncStatus }),
        ...(patch.lastError === undefined ? {} : { lastError: patch.lastError }),
        ...(patch.lastSyncAt === undefined ? {} : { lastSyncAt: patch.lastSyncAt }),
      },
    };
  }

  private async resolveFeishuBaseToken(binding: FeishuBindingRecord, userAccessToken: string) {
    if (binding.baseToken) {
      return binding.baseToken;
    }

    const tokenFromWikiNode = await this.tryResolveBaseTokenFromWikiNode(binding, userAccessToken);
    if (tokenFromWikiNode) {
      return tokenFromWikiNode;
    }

    const tokenFromWikiPage = await this.tryResolveBaseTokenFromWikiPage(binding.wikiUrl);
    if (tokenFromWikiPage) {
      return tokenFromWikiPage;
    }

    throw new ServiceUnavailableException("当前链接尚未解析出 Base Token，请优先绑定飞书多维表格 base 链接，或确认当前授权用户对该飞书副本仍有访问权限。");
  }

  private async listFeishuTables(baseToken: string, userAccessToken: string): Promise<FeishuTableRecord[]> {
    const items = await this.fetchFeishuApiItems(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables?page_size=100`,
      userAccessToken,
    );
    return items
      .map((item) => ({
        tableId: this.readMetaString(item, "table_id") || this.readMetaString(item, "tableId") || this.readMetaString(item, "id"),
        tableName: this.readMetaString(item, "table_name") || this.readMetaString(item, "tableName") || this.readMetaString(item, "name"),
      }))
      .filter((item) => item.tableId && item.tableName);
  }

  private async matchFeishuTables(
    baseToken: string,
    userAccessToken: string,
    tables: FeishuTableRecord[],
    binding: FeishuBindingRecord,
  ) {
    const matchedByName = this.matchFeishuTablesByName(tables);

    const hasAllNamedMatches = Object.values(matchedByName).every(Boolean);
    if (hasAllNamedMatches) {
      return this.dedupeMatchedFeishuTables(matchedByName);
    }

    const matchedByContent = await this.classifyFeishuTablesByContent(baseToken, userAccessToken, tables, binding);
    if (Object.values(matchedByName).some(Boolean)) {
      return this.dedupeMatchedFeishuTables({
        brandAccounts: matchedByName.brandAccounts ?? matchedByContent.brandAccounts,
        competitorAccounts: matchedByName.competitorAccounts ?? matchedByContent.competitorAccounts,
        brandNotes: matchedByName.brandNotes ?? matchedByContent.brandNotes,
        benchmarkNotes: matchedByName.benchmarkNotes ?? matchedByContent.benchmarkNotes,
        targetUsers: matchedByName.targetUsers ?? matchedByContent.targetUsers,
      });
    }

    return this.dedupeMatchedFeishuTables(matchedByContent);
  }

  private dedupeMatchedFeishuTables(matchedTables: FeishuMatchedTableMap) {
    const usedTableIds = new Set<string>();
    const reserve = (table: FeishuTableRecord | null) => {
      if (!table?.tableId || usedTableIds.has(table.tableId)) {
        return null;
      }
      usedTableIds.add(table.tableId);
      return table;
    };

    return {
      brandAccounts: reserve(matchedTables.brandAccounts),
      competitorAccounts: reserve(matchedTables.competitorAccounts),
      brandNotes: reserve(matchedTables.brandNotes),
      benchmarkNotes: reserve(matchedTables.benchmarkNotes),
      targetUsers: reserve(matchedTables.targetUsers),
    };
  }

  private matchFeishuTablesByName(tables: FeishuTableRecord[]) {
    const remaining = [...tables];
    const pick = (keywords: readonly string[]) => {
      const best = this.findBestFeishuTableByKeywords(remaining, keywords);
      if (!best) {
        return null;
      }
      const index = remaining.findIndex((item) => item.tableId === best.tableId);
      if (index >= 0) {
        remaining.splice(index, 1);
      }
      return best;
    };

    return {
      brandAccounts: pick(FEISHU_TABLE_MATCHERS.brandAccounts),
      competitorAccounts: pick(FEISHU_TABLE_MATCHERS.competitorAccounts),
      brandNotes: pick(FEISHU_TABLE_MATCHERS.brandNotes),
      benchmarkNotes: pick(FEISHU_TABLE_MATCHERS.benchmarkNotes),
      targetUsers: pick(FEISHU_TABLE_MATCHERS.targetUsers),
    };
  }

  private findBestFeishuTableByKeywords(tables: FeishuTableRecord[], keywords: readonly string[]) {
    let bestTable: FeishuTableRecord | null = null;
    let bestScore = 0;

    for (const table of tables) {
      const score = this.scoreFeishuTableName(table.tableName, keywords);
      if (score > bestScore) {
        bestScore = score;
        bestTable = table;
      }
    }

    return bestTable;
  }

  private scoreFeishuTableName(tableName: string, keywords: readonly string[]) {
    const normalizedName = this.normalizeFieldKey(tableName);
    let bestScore = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = this.normalizeFieldKey(keyword);
      if (!normalizedKeyword) {
        continue;
      }
      if (normalizedName === normalizedKeyword) {
        bestScore = Math.max(bestScore, 1000 + normalizedKeyword.length);
        continue;
      }
      if (normalizedName.startsWith(normalizedKeyword) || normalizedName.endsWith(normalizedKeyword)) {
        bestScore = Math.max(bestScore, 700 + normalizedKeyword.length);
        continue;
      }
      if (normalizedName.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedName)) {
        bestScore = Math.max(bestScore, 400 + normalizedKeyword.length);
      }
    }

    return bestScore;
  }

  private countUniqueMatchedTables(matchedTables: FeishuMatchedTableMap) {
    return new Set(
      Object.values(matchedTables)
        .map((item) => item?.tableId || "")
        .filter(Boolean),
    ).size;
  }

  private serializeMatchedTables(matchedTables: FeishuMatchedTableMap) {
    return {
      brandAccounts: matchedTables.brandAccounts
        ? { tableId: matchedTables.brandAccounts.tableId, tableName: matchedTables.brandAccounts.tableName }
        : null,
      competitorAccounts: matchedTables.competitorAccounts
        ? { tableId: matchedTables.competitorAccounts.tableId, tableName: matchedTables.competitorAccounts.tableName }
        : null,
      brandNotes: matchedTables.brandNotes
        ? { tableId: matchedTables.brandNotes.tableId, tableName: matchedTables.brandNotes.tableName }
        : null,
      benchmarkNotes: matchedTables.benchmarkNotes
        ? { tableId: matchedTables.benchmarkNotes.tableId, tableName: matchedTables.benchmarkNotes.tableName }
        : null,
      targetUsers: matchedTables.targetUsers
        ? { tableId: matchedTables.targetUsers.tableId, tableName: matchedTables.targetUsers.tableName }
        : null,
    };
  }

  private buildWorkspaceCounts(workspace: XhsCollectionWorkspace) {
    return {
      brandAccounts: workspace.brandAccounts.length,
      competitorAccounts: workspace.competitorAccounts.length,
      brandNotes: workspace.brandNotes.length,
      benchmarkNotes: workspace.benchmarkNotes.length,
      targetUsers: workspace.targetUsers.length,
    };
  }

  private findFeishuTableByKeywords(tables: FeishuTableRecord[], keywords: readonly string[]) {
    const normalizedKeywords = keywords.map((item) => this.normalizeFieldKey(item));
    return (
      tables.find((item) => normalizedKeywords.includes(this.normalizeFieldKey(item.tableName)))
      ?? tables.find((item) => normalizedKeywords.some((keyword) => this.normalizeFieldKey(item.tableName).includes(keyword)))
      ?? null
    );
  }

  private async classifyFeishuTablesByContent(
    baseToken: string,
    userAccessToken: string,
    tables: FeishuTableRecord[],
    binding: FeishuBindingRecord,
  ) {
    const previews = await Promise.all(
      tables.map(async (table) => {
        const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
        return {
          table,
          rows,
          accountScore: this.scoreFeishuAccountTable(rows),
          noteScore: this.scoreFeishuNoteTable(rows),
          targetUserScore: this.scoreFeishuTargetUserTable(rows),
        };
      }),
    );

    const byTableId = new Map(previews.map((item) => [item.table.tableId, item]));
    const brandAccounts = (binding.tableId ? byTableId.get(binding.tableId)?.table : undefined) ?? null;
    const remaining = previews.filter((item) => item.table.tableId !== brandAccounts?.tableId);
    const accountTables = remaining.filter((item) => item.accountScore > 0).sort((a, b) => b.accountScore - a.accountScore);
    const noteTables = remaining.filter((item) => item.noteScore > 0).sort((a, b) => b.rows.length - a.rows.length);
    const targetUserTables = remaining
      .filter((item) => item.targetUserScore > 0)
      .sort((a, b) => b.targetUserScore - a.targetUserScore);

    return {
      brandAccounts,
      competitorAccounts: accountTables[0]?.table ?? null,
      brandNotes: noteTables[0]?.table ?? null,
      benchmarkNotes: noteTables[1]?.table ?? null,
      targetUsers: targetUserTables[0]?.table ?? null,
    };
  }

  private scoreFeishuAccountTable(rows: FeishuRowRecord[]) {
    if (!rows.length) {
      return 0;
    }

    let score = 0;
    for (const row of rows.slice(0, 10)) {
      const values = Object.values(row.fields).flatMap((item) => this.flattenFeishuValue(item));
      if (values.some((item) => item.includes("xiaohongshu.com/user/profile"))) {
        score += 5;
      }
      if (values.some((item) => /粉丝|关注|获赞|点赞/.test(item))) {
        score += 2;
      }
    }
    return score;
  }

  private scoreFeishuNoteTable(rows: FeishuRowRecord[]) {
    if (!rows.length) {
      return 0;
    }

    let score = 0;
    for (const row of rows.slice(0, 10)) {
      const values = Object.values(row.fields).flatMap((item) => this.flattenFeishuValue(item));
      if (values.some((item) => item.includes("xiaohongshu.com/explore") || item.includes("xiaohongshu.com/discovery/item"))) {
        score += 5;
      }
      if (values.some((item) => /点赞|评论|收藏|正文|标题/.test(item))) {
        score += 2;
      }
    }
    return score;
  }

  private scoreFeishuTargetUserTable(rows: FeishuRowRecord[]) {
    if (!rows.length) {
      return 0;
    }

    let score = 0;
    for (const row of rows.slice(0, 10)) {
      const values = Object.values(row.fields).flatMap((item) => this.flattenFeishuValue(item));
      if (values.some((item) => item.includes("线索") || item.includes("目标用户"))) {
        score += 4;
      }
      if (values.some((item) => item.includes("xiaohongshu.com/user/profile"))) {
        score += 2;
      }
    }
    return score;
  }

  private async listFeishuRecords(
    baseToken: string,
    userAccessToken: string,
    table: FeishuTableRecord,
    viewId?: string,
  ): Promise<FeishuRowRecord[]> {
    const rows: FeishuRowRecord[] = [];
    let pageToken = "";
    let hasMore = true;

    while (hasMore && rows.length < 500) {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(table.tableId)}/records`,
      );
      url.searchParams.set("page_size", "100");
      if (pageToken) {
        url.searchParams.set("page_token", pageToken);
      }
      if (viewId) {
        url.searchParams.set("view_id", viewId);
      }

      const payload = await this.fetchFeishuApi(url.toString(), userAccessToken);
      const dataMeta = this.asMeta(this.asMeta(payload).data);
      const items = this.extractItems(dataMeta.items);

      rows.push(
        ...items.map((item, index) => ({
          recordId:
            this.readMetaString(item, "record_id")
            || this.readMetaString(item, "recordId")
            || `${table.tableId}-${rows.length + index + 1}`,
          fields: this.asMeta(this.asMeta(item).fields),
        })),
      );

      hasMore = Boolean(dataMeta.has_more);
      pageToken = this.readMetaString(dataMeta, "page_token");
      if (!items.length) {
        break;
      }
    }

    return rows;
  }

  private mapFeishuTabularRow(row: unknown, fieldNames: string[], fieldIds: string[]) {
    if (!Array.isArray(row)) {
      return {};
    }

    return row.reduce<Record<string, unknown>>((accumulator, cell, index) => {
      const key = fieldNames[index] || fieldIds[index] || `field_${index + 1}`;
      accumulator[key] = cell;
      return accumulator;
    }, {});
  }

  private async getFeishuUserAccessTokenForBrand(brandId: string, forceRefresh = false): Promise<string> {
    const ownerUserId = await this.getBrandOwnerUserId(brandId);
    const canUseDatabase = await this.prismaService.canUseDatabase();
    const integration = canUseDatabase
      ? await this.prismaService.userFeishuIntegration.findUnique({
          where: { userId: ownerUserId },
          select: {
            appId: true,
            appSecret: true,
            redirectUri: true,
            accessToken: true,
            refreshToken: true,
            scope: true,
            providerUserOpenId: true,
            providerUserName: true,
            providerUserAvatar: true,
            expiresAt: true,
            refreshExpiresAt: true,
          },
        })
      : getFeishuUserIntegration(ownerUserId);
    if (canUseDatabase && !integration?.accessToken) {
      const fallbackIntegration = getFeishuUserIntegration(ownerUserId);
      if (fallbackIntegration?.accessToken && fallbackIntegration.refreshToken) {
        const fallbackConfig = getFeishuUserAppConfig(ownerUserId);
        await this.prismaService.userFeishuIntegration.upsert({
          where: { userId: ownerUserId },
          create: {
            userId: ownerUserId,
            appId: fallbackConfig?.appId || "",
            appSecret: fallbackConfig?.appSecret || "",
            redirectUri: fallbackConfig?.redirectUri || this.getDefaultFeishuRedirectUri(),
            scope: fallbackIntegration.scope || fallbackConfig?.scope || "",
            providerUserOpenId: fallbackIntegration.providerUserOpenId,
            providerUserName: fallbackIntegration.providerUserName,
            providerUserAvatar: fallbackIntegration.providerUserAvatar,
            accessToken: fallbackIntegration.accessToken,
            refreshToken: fallbackIntegration.refreshToken,
            expiresAt: fallbackIntegration.expiresAt ? new Date(fallbackIntegration.expiresAt) : null,
            refreshExpiresAt: fallbackIntegration.refreshExpiresAt ? new Date(fallbackIntegration.refreshExpiresAt) : null,
          },
          update: {
            providerUserOpenId: fallbackIntegration.providerUserOpenId,
            providerUserName: fallbackIntegration.providerUserName,
            providerUserAvatar: fallbackIntegration.providerUserAvatar,
            accessToken: fallbackIntegration.accessToken,
            refreshToken: fallbackIntegration.refreshToken,
            scope: fallbackIntegration.scope || fallbackConfig?.scope || "",
            expiresAt: fallbackIntegration.expiresAt ? new Date(fallbackIntegration.expiresAt) : null,
            refreshExpiresAt: fallbackIntegration.refreshExpiresAt ? new Date(fallbackIntegration.refreshExpiresAt) : null,
            appId: fallbackConfig?.appId || "",
            appSecret: fallbackConfig?.appSecret || "",
            redirectUri: fallbackConfig?.redirectUri || this.getDefaultFeishuRedirectUri(),
          },
        });
        return this.getFeishuUserAccessTokenForBrand(brandId, forceRefresh);
      }
    }
    if (!integration?.accessToken) {
      throw new ServiceUnavailableException("当前品牌所属用户尚未连接飞书账号，请先使用该用户完成飞书授权。");
    }

    const expiresAtMs = "expiresAt" in integration && integration.expiresAt
      ? new Date(integration.expiresAt).getTime()
      : 0;
    const shouldRefresh = forceRefresh || !expiresAtMs || expiresAtMs <= Date.now() + 60 * 1000;
    if (shouldRefresh && integration.refreshToken && "appId" in integration && integration.appId && "appSecret" in integration && integration.appSecret) {
      return this.refreshFeishuUserAccessToken(ownerUserId);
    }

    return integration.accessToken;
  }

  private async refreshFeishuUserAccessToken(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.userFeishuIntegration.findUnique({
        where: { userId },
      });
      if (!row?.refreshToken || !row.appId || !row.appSecret) {
        throw new ServiceUnavailableException("飞书授权已失效，请重新连接飞书。");
      }

      const tokenResponse = await fetch("https://open.feishu.cn/open-apis/authen/v2/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: row.refreshToken,
          client_id: row.appId,
          client_secret: row.appSecret,
        }),
      });
      const tokenPayload = await this.readJsonLikeResponse(tokenResponse);
      const tokenData = Object.keys(this.asMeta(tokenPayload.data)).length ? this.asMeta(tokenPayload.data) : tokenPayload;
      const accessToken = this.readMetaString(tokenData, "access_token");
      const refreshToken = this.readMetaString(tokenData, "refresh_token") || row.refreshToken;
      const scope = this.readMetaString(tokenData, "scope") || row.scope;
      const tokenCode = this.readMetaNumber(tokenPayload, "code");
      if (!tokenResponse.ok || tokenCode !== 0 || !accessToken) {
        const message = this.readMetaString(tokenPayload, "msg") || this.readMetaString(tokenPayload, "message") || "飞书 token 刷新失败";
        throw new ServiceUnavailableException(`${message}，请重新连接飞书。`);
      }

      const expiresIn = this.readMetaNumber(tokenData, "expires_in") ?? 0;
      const refreshExpiresIn = this.readMetaNumber(tokenData, "refresh_expires_in") ?? 0;
      await this.prismaService.userFeishuIntegration.update({
        where: { userId },
        data: {
          accessToken,
          refreshToken,
          scope,
          expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : row.expiresAt,
          refreshExpiresAt: refreshExpiresIn > 0 ? new Date(Date.now() + refreshExpiresIn * 1000) : row.refreshExpiresAt,
        },
      });
      return accessToken;
    }

    const integration = getFeishuUserIntegration(userId);
    const config = getFeishuUserAppConfig(userId);
    if (!integration?.refreshToken || !config?.appId || !config?.appSecret) {
      throw new ServiceUnavailableException("飞书授权已失效，请重新连接飞书。");
    }

    const tokenResponse = await fetch("https://open.feishu.cn/open-apis/authen/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken,
        client_id: config.appId,
        client_secret: config.appSecret,
      }),
    });
    const tokenPayload = await this.readJsonLikeResponse(tokenResponse);
    const tokenData = Object.keys(this.asMeta(tokenPayload.data)).length ? this.asMeta(tokenPayload.data) : tokenPayload;
    const accessToken = this.readMetaString(tokenData, "access_token");
    const refreshToken = this.readMetaString(tokenData, "refresh_token") || integration.refreshToken;
    const scope = this.readMetaString(tokenData, "scope") || integration.scope;
    const tokenCode = this.readMetaNumber(tokenPayload, "code");
    if (!tokenResponse.ok || tokenCode !== 0 || !accessToken) {
      const message = this.readMetaString(tokenPayload, "msg") || this.readMetaString(tokenPayload, "message") || "飞书 token 刷新失败";
      throw new ServiceUnavailableException(`${message}，请重新连接飞书。`);
    }

    const expiresIn = this.readMetaNumber(tokenData, "expires_in") ?? 0;
    const refreshExpiresIn = this.readMetaNumber(tokenData, "refresh_expires_in") ?? 0;
    setFeishuUserIntegration({
      ...integration,
      accessToken,
      refreshToken,
      scope,
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : integration.expiresAt,
      refreshExpiresAt: refreshExpiresIn > 0 ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString() : integration.refreshExpiresAt,
      updatedAt: new Date().toISOString(),
    });
    return accessToken;
  }

  private async getBrandOwnerUserId(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand?.ownerUserId) {
        throw new NotFoundException("品牌不存在");
      }
      return brand.ownerUserId;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand?.ownerUserId) {
      throw new NotFoundException("品牌不存在");
    }
    return brand.ownerUserId;
  }

  private async fetchFeishuApiItems(url: string, userAccessToken: string) {
    const payload = await this.fetchFeishuApi(url, userAccessToken);
    const dataMeta = this.asMeta(this.asMeta(payload).data);
    return this.extractItems(dataMeta.items).length ? this.extractItems(dataMeta.items) : this.extractItems(dataMeta.tables);
  }

  private getDefaultFeishuRedirectUri() {
    const configured = process.env.FEISHU_OAUTH_REDIRECT_URI?.trim();
    if (configured) {
      return configured;
    }
    const webBaseUrl = this.getDefaultWebBaseUrl();
    return `${webBaseUrl}/api/auth/feishu/oauth/callback`;
  }

  private getDefaultWebBaseUrl() {
    const candidates = [
      process.env.WEB_BASE_URL,
      process.env.WEB_PUBLIC_BASE_URL,
      process.env.NEXT_PUBLIC_WEB_BASE_URL,
    ];
    for (const candidate of candidates) {
      const normalized = this.normalizeWebBaseUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }
    return "https://17ai.site";
  }

  private normalizeWebBaseUrl(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return "";
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
      return process.env.NODE_ENV === "development" ? trimmed : "https://17ai.site";
    }
    return trimmed.replace(/\/$/, "");
  }

  private async fetchFeishuApi(url: string, userAccessToken: string) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });
    const payload = await this.readJsonLikeResponse(response);
    const meta = this.asMeta(payload);
    const code = this.readMetaNumber(meta, "code");
    if (!response.ok || code !== 0) {
      const message = this.readMetaString(meta, "msg")
        || this.readMetaString(meta, "message")
        || this.readMetaString(meta, "_rawText")
        || "飞书开放平台请求失败";
      throw new ServiceUnavailableException(this.normalizeUpstreamHtmlError(message, "飞书开放平台请求失败"));
    }
    return payload;
  }

  private async readJsonLikeResponse(response: Response) {
    const text = await response.text();
    if (!text.trim()) {
      return {} as Record<string, unknown>;
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { _rawText: text } as Record<string, unknown>;
    }
  }

  private normalizeUpstreamHtmlError(message: string, fallback: string) {
    const trimmed = message.trim();
    if (!trimmed) {
      return fallback;
    }
    if (/<html[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed) || /502 Bad Gateway/i.test(trimmed)) {
      return `${fallback}：上游服务暂时不可用（502 Bad Gateway），请稍后重试`;
    }
    return trimmed;
  }

  private async syncFeishuAccountTable(
    brandId: string,
    baseToken: string,
    table: FeishuTableRecord,
    kind: CollectorAccountKind,
  ) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const accountName = this.readFeishuFieldString(row.fields, ["账号名称", "账号名", "昵称", "品牌名称", "竞品名称", "名称", "显示名", "小红书号", "鏄电О", "灏忕孩涔﹀彿"]);
      const sourceAccountLink = this.readFeishuFieldUrl(
        row.fields,
        ["主页链接", "账号链接", "链接", "小红书主页链接", "品牌主页链接", "竞品主页链接", "灏忕孩涔︿富椤甸摼鎺"],
      );
      if (!accountName && !sourceAccountLink) {
        continue;
      }

      await this.upsertCollectorAsset({
        brandId,
        kind,
        matchValue: `feishu:${row.recordId}`,
        title: accountName || `飞书同步账号 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["简介", "描述"]),
        fileUrl: sourceAccountLink || undefined,
        metadata: {
          kind,
          sourceAccountId: `feishu:${row.recordId}`,
          sourceAccountLink,
          externalUserId: this.readFeishuFieldString(row.fields, ["外部用户ID", "用户ID", "user_id", "userid", "小红书号", "灏忕孩涔﹀彿"]),
          postedCount: this.readFeishuFieldNumber(row.fields, ["作品数", "笔记数", "发布数", "作品数量"]),
          likedCount: this.readFeishuFieldNumber(row.fields, ["获赞数", "总点赞", "点赞数", "获赞", "鑾疯禐鏁"]),
          collectedCount: this.readFeishuFieldNumber(row.fields, ["收藏数", "总收藏", "收藏"]),
          avatar: this.readFeishuFieldUrl(row.fields, ["头像", "头像链接", "澶村儚"]) || this.readFeishuFieldString(row.fields, ["头像", "头像链接", "澶村儚"]),
          description: this.readFeishuFieldString(row.fields, ["简介", "描述", "个人简介", "涓汉绠€浠"]),
          ipLocation: this.readFeishuFieldString(row.fields, ["IP属地", "地区", "IP灞炲湴"]),
          followCount: this.readFeishuFieldNumber(row.fields, ["关注数", "鍏虫敞鏁"]),
          fanCount: this.readFeishuFieldNumber(row.fields, ["粉丝数", "绮変笣鏁"]),
          collectedAt: new Date().toISOString(),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private async syncFeishuBrandNotesTable(brandId: string, baseToken: string, table: FeishuTableRecord) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const noteUrl = this.readFeishuFieldUrl(row.fields, ["笔记链接", "作品链接", "作品地址", "链接", "浣滃搧閾炬帴"]);
      const noteId = this.readFeishuFieldString(row.fields, ["笔记ID", "作品ID", "note_id"]) || this.extractNoteIdFromUrl(noteUrl) || row.recordId;
      const title = this.readFeishuFieldString(row.fields, ["标题", "作品标题", "笔记标题", "内容标题", "文案标题", "作品名称", "名称", "原文标题"])
        || this.findLikelyTitleInFields(row.fields)
        || this.readFeishuMediaNames(row.fields)[0]
        || "";
      const imageList = this.readFeishuFieldImageUrls(row.fields, ["配图或视频", "图片", "图片列表", "图片链接", "封面图", "图集", "附件", "作品图片", "作品封面", "配图", "封面"]);
      const videoUrl = this.readFeishuFieldVideoUrl(row.fields, ["配图或视频", "视频链接", "视频地址", "下载链接", "视频附件", "附件", "视频"]) || this.readFeishuVideoUrl(row.fields);
      if (!noteId && !title) {
        continue;
      }

      await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_BRAND_NOTE",
        matchValue: noteId,
        title: title || `飞书同步品牌作品 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["正文", "正文内容", "内容", "内容详情", "描述", "文案", "文案内容", "作品内容", "笔记内容", "笔记正文", "作品正文", "原文", "原文内容", "笔记文案"]),
        fileUrl: noteUrl || undefined,
        metadata: {
          kind: "XHS_BRAND_NOTE",
          sourceAccountId: this.readFeishuFieldString(row.fields, ["来源账号ID", "来源账号", "账号ID", "账号", "账号标识", "作者ID", "作品采集", "作品来源"]) || `feishu:${table.tableId}:${row.recordId}`,
          noteId,
          noteUrl,
          noteType: this.readFeishuFieldString(row.fields, ["类型", "笔记类型", "作品类型", "内容类型", "作品形式", "笔记形式", "内容形式", "图文/视频", "图文视频"]),
          nickname: this.readFeishuFieldString(row.fields, ["作者昵称", "博主昵称", "作者名称", "作者", "昵称", "账号昵称", "达人昵称", "博主", "博主名称", "创作者", "创作者昵称", "作品采集", "作品来源"]),
          imageList: imageList.length ? imageList : this.readFeishuImageUrls(row.fields),
          externalUserId: this.readFeishuFieldString(row.fields, ["作者ID", "用户ID", "用户 ID", "外部用户ID", "外部用户 ID", "小红书号", "博主ID", "创作者ID", "主页ID"]),
          likeCount: this.readFeishuFieldNumber(row.fields, ["点赞数", "点赞"]),
          collectCount: this.readFeishuFieldNumber(row.fields, ["收藏数", "收藏"]),
          createdAtText: this.readFeishuFieldString(row.fields, ["发布时间", "发布日期", "创建时间", "创建日期", "发布时间文本", "采集时间", "采集日期"]),
          shareCount: this.readFeishuFieldNumber(row.fields, ["分享数", "分享"]),
          commentCount: this.readFeishuFieldNumber(row.fields, ["评论数", "评论"]),
          videoUrl,
          collectedAt: new Date().toISOString(),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private async syncFeishuBenchmarkNotesTable(brandId: string, baseToken: string, table: FeishuTableRecord) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const sourceUrl = this.findFirstUrlInFields(row.fields, ["xiaohongshu.com/explore", "xiaohongshu.com/discovery/item"])
        || this.readFeishuFieldString(row.fields, ["来源链接", "笔记链接", "作品链接", "作品地址", "链接", "浣滃搧閾炬帴"]);
      const noteId = this.readFeishuFieldString(row.fields, ["笔记ID", "作品ID", "note_id"]) || this.extractNoteIdFromUrl(sourceUrl) || row.recordId;
      const title = this.readFeishuFieldString(row.fields, ["标题", "作品标题", "笔记标题", "内容标题", "文案标题", "作品名称", "名称", "原文标题"])
        || this.findLikelyTitleInFields(row.fields);
      const imageList = this.readFeishuFieldImageUrls(row.fields, ["配图或视频", "图片", "图片列表", "图片链接", "封面图", "图集", "附件", "作品图片", "作品封面", "配图", "封面"]);
      const videoUrl = this.readFeishuFieldVideoUrl(row.fields, ["配图或视频", "视频链接", "视频地址", "下载链接", "视频附件", "附件", "视频"]) || this.readFeishuVideoUrl(row.fields);
      if (!sourceUrl && !title) {
        continue;
      }

      await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_BENCHMARK_NOTE",
        matchValue: sourceUrl || noteId,
        title: title || `飞书同步对标作品 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["正文", "正文内容", "内容", "内容详情", "描述", "文案", "文案内容", "作品内容", "笔记内容", "笔记正文", "作品正文", "原文", "原文内容", "笔记文案"]),
        fileUrl: sourceUrl || undefined,
        metadata: {
          kind: "XHS_BENCHMARK_NOTE",
          sourceUrl,
          noteId,
          noteUrl: sourceUrl,
          noteType: this.readFeishuFieldString(row.fields, ["类型", "笔记类型", "作品类型", "内容类型", "作品形式", "笔记形式", "内容形式", "图文/视频", "图文视频"]),
          nickname: this.readFeishuFieldString(row.fields, ["作者昵称", "博主昵称", "作者名称", "昵称", "作者", "账号昵称", "达人昵称", "博主", "博主名称", "创作者", "创作者昵称", "作品采集", "作品来源"]),
          imageList: imageList.length ? imageList : this.readFeishuImageUrls(row.fields),
          likeCount: this.readFeishuFieldNumber(row.fields, ["点赞数", "点赞"]),
          collectCount: this.readFeishuFieldNumber(row.fields, ["收藏数", "收藏"]),
          shareCount: this.readFeishuFieldNumber(row.fields, ["分享数", "分享"]),
          commentCount: this.readFeishuFieldNumber(row.fields, ["评论数", "评论"]),
          likeCollectRatio: this.readFeishuFieldNumber(row.fields, ["赞藏率", "点赞收藏比", "璧炶棌鐜"]),
          likeCommentRatio: this.readFeishuFieldNumber(row.fields, ["赞评率", "点赞评论比", "璧炶瘎鐜"]),
          shareRatio: this.readFeishuFieldNumber(row.fields, ["分享率", "赞享率", "赞分享率", "点赞分享比", "分享率%", "璧炰韩鐜"]),
          isExplosive: this.readFeishuFieldStringStrict(row.fields, ["是否爆款", "是否为爆款", "爆款判断", "爆款", "是否爆文", "鏄惁鐖嗘"]),
          followUpDecision: this.readFeishuFieldStringStrict(row.fields, ["是否追投", "是否选用", "是否继续投放", "是否追加投放", "是否跟进", "是否跟投", "是否参考", "后续动作", "鏄惁杩芥姇"]),
          videoUrl,
          syncStatus: this.normalizeCollectorStatus(this.readFeishuFieldString(row.fields, ["状态", "同步状态"])) || "SUCCESS",
          retryCount: this.readFeishuFieldNumber(row.fields, ["重试次数"]),
          nextRetryAt: this.readFeishuFieldString(row.fields, ["下次重试时间"]),
          lastError: this.readFeishuFieldString(row.fields, ["错误原因", "失败原因"]),
          collectedAt: new Date().toISOString(),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private async syncFeishuTargetUsersTable(brandId: string, baseToken: string, table: FeishuTableRecord) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const nickname = this.readFeishuFieldString(row.fields, ["昵称", "用户昵称", "用户名"]);
      const sourceUrl = this.readFeishuFieldUrl(row.fields, ["来源链接", "笔记链接", "线索链接"]);
      if (!nickname && !sourceUrl) {
        continue;
      }

      await this.upsertTargetAsset({
        brandId,
        matchValue: sourceUrl || `feishu:${row.recordId}`,
        title: nickname || `飞书同步目标用户 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["备注", "说明"]),
        metadata: {
          kind: "XHS_TARGET_USER",
          sourceUrl,
          profileUrl: this.readFeishuFieldUrl(row.fields, ["主页链接", "用户主页链接"]),
          userId: this.readFeishuFieldString(row.fields, ["用户ID", "外部用户ID"]),
          noteTitle: this.readFeishuFieldString(row.fields, ["来源标题", "笔记标题"]),
          collectedAt: new Date().toISOString(),
          syncStatus: this.normalizeCollectorStatus(this.readFeishuFieldString(row.fields, ["状态", "同步状态"])) || "SUCCESS",
          retryCount: this.readFeishuFieldNumber(row.fields, ["重试次数"]) ?? 0,
          nextRetryAt: this.readFeishuFieldString(row.fields, ["下次重试时间"]),
          lastError: this.readFeishuFieldString(row.fields, ["错误原因", "失败原因"]),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private normalizeCollectorStatus(value: string): CollectorSyncStatus | undefined {
    const normalized = value.trim().toUpperCase();
    if (normalized === "IDLE" || normalized === "RUNNING" || normalized === "SUCCESS" || normalized === "FAILED") {
      return normalized;
    }
    return undefined;
  }

  private async tryResolveBaseTokenFromWikiNode(binding: FeishuBindingRecord, userAccessToken: string) {
    if (!binding.wikiToken) {
      return "";
    }

    try {
      const url = new URL("https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node");
      url.searchParams.set("token", binding.wikiToken);

      const payload = await this.fetchFeishuApi(url.toString(), userAccessToken);
      const dataMeta = this.asMeta(this.asMeta(payload).data);
      const nodeMeta = this.asMeta(dataMeta.node);
      const objType = this.readMetaString(nodeMeta, "obj_type") || this.readMetaString(nodeMeta, "objType");
      const objToken = this.readMetaString(nodeMeta, "obj_token") || this.readMetaString(nodeMeta, "objToken");

      if (objType === "bitable" && objToken) {
        return objToken;
      }
      return "";
    } catch {
      return "";
    }
  }

  private async tryResolveBaseTokenFromWikiPage(wikiUrl: string) {
    try {
      const response = await fetch(wikiUrl, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0",
        },
      });
      const html = await response.text();
      const bitableMatch = html.match(/space\/api\/bitable\/([A-Za-z0-9]+)\//);
      if (bitableMatch?.[1]) {
        return bitableMatch[1];
      }
      const metaMatch = html.match(/space\/api\/meta\/\?type=8&token=([A-Za-z0-9]+)/);
      if (metaMatch?.[1]) {
        return metaMatch[1];
      }
      return "";
    } catch {
      return "";
    }
  }

  private extractItems(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
  }

  private readFeishuFieldString(fields: Record<string, unknown>, aliases: string[]) {
    const value = this.findFeishuFieldValue(fields, aliases);
    return this.flattenFeishuValue(value)[0] ?? "";
  }

  private readFeishuFieldStringStrict(fields: Record<string, unknown>, aliases: string[]) {
    const value = this.findFeishuFieldValueExact(fields, aliases);
    return this.flattenFeishuValue(value)[0] ?? "";
  }

  private readFeishuFieldUrl(fields: Record<string, unknown>, aliases: string[]) {
    const value = this.findFeishuFieldValue(fields, aliases);
    const flattened = this.flattenFeishuValue(value);
    const urls = flattened.flatMap((item) => this.extractUrlsFromText(item));
    return urls[0] ?? flattened.find((item) => /^https?:\/\//i.test(item)) ?? "";
  }

  private readFeishuFieldNumber(fields: Record<string, unknown>, aliases: string[]) {
    const value = this.findFeishuFieldValue(fields, aliases);
    if (typeof value === "number") {
      return value;
    }
    const text = this.flattenFeishuValue(value)[0];
    if (!text) {
      return undefined;
    }
    const parsed = Number(text.replace(/,/g, ""));
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private readFeishuFieldStringArray(fields: Record<string, unknown>, aliases: string[]) {
    return this.flattenFeishuValue(this.findFeishuFieldValue(fields, aliases));
  }

  private readFeishuFieldUrls(fields: Record<string, unknown>, aliases: string[]) {
    return this.extractUrlsFromUnknown(this.findFeishuFieldValue(fields, aliases));
  }

  private readFeishuFieldImageUrls(fields: Record<string, unknown>, aliases: string[]) {
    return this.extractTypedUrlsFromUnknown(this.findFeishuFieldValue(fields, aliases), "image");
  }

  private readFeishuFieldVideoUrl(fields: Record<string, unknown>, aliases: string[]) {
    return this.extractTypedUrlsFromUnknown(this.findFeishuFieldValue(fields, aliases), "video")[0] ?? "";
  }

  private readFeishuMediaUrls(fields: Record<string, unknown>) {
    const urls = Object.values(fields)
      .flatMap((item) => this.extractFeishuMediaEntries(item))
      .map((item) => item.url)
      .filter(Boolean);
    return Array.from(new Set(urls));
  }

  private readFeishuImageUrls(fields: Record<string, unknown>) {
    return Array.from(new Set(
      Object.values(fields)
        .flatMap((item) => this.extractFeishuMediaEntries(item))
        .filter((item) => this.isImageMediaEntry(item))
        .map((item) => item.url)
        .filter(Boolean),
    ));
  }

  private readFeishuMediaNames(fields: Record<string, unknown>) {
    const names = Object.values(fields)
      .flatMap((item) => this.extractFeishuMediaEntries(item))
      .map((item) => item.name)
      .filter(Boolean);
    return Array.from(new Set(names));
  }

  private readFeishuVideoUrl(fields: Record<string, unknown>) {
    return this.extractFeishuMediaEntries(fields)
      .find((item) => this.isVideoMediaEntry(item))?.url ?? "";
  }

  private findFirstUrlInFields(fields: Record<string, unknown>, keywords: string[] = []) {
    const urls = Object.values(fields)
      .flatMap((item) => this.flattenFeishuValue(item))
      .flatMap((item) => this.extractUrlsFromText(item));
    return (
      urls.find((item) => keywords.some((keyword) => item.includes(keyword)))
      || urls[0]
      || ""
    );
  }

  private findLikelyTitleInFields(fields: Record<string, unknown>) {
    const candidates = Object.values(fields)
      .flatMap((item) => this.flattenFeishuValue(item))
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !/^https?:\/\//i.test(item))
      .filter((item) => !/\.(png|jpe?g|webp|gif|bmp|svg|mp4|mov|avi|mkv|m4v)$/i.test(item))
      .filter((item) => !/^\d{4}-\d{2}-\d{2}/.test(item))
      .filter((item) => !/^\d+(\.\d+)?$/.test(item))
      .filter((item) => item.length >= 4 && item.length <= 60);

    return candidates[0] ?? "";
  }

  private findFeishuFieldValue(fields: Record<string, unknown>, aliases: string[]) {
    const entries = Object.entries(fields);
    const normalizedAliases = aliases.map((item) => this.normalizeFieldKey(item));
    for (const alias of normalizedAliases) {
      const exact = entries.find(([key]) => this.normalizeFieldKey(key) === alias);
      if (exact) {
        return exact[1];
      }
    }
    for (const alias of normalizedAliases) {
      if (alias.length < 4) {
        continue;
      }
      const fuzzy = entries.find(([key]) => {
        const normalizedKey = this.normalizeFieldKey(key);
        if (normalizedKey.length < 4) {
          return false;
        }
        return normalizedKey.includes(alias) || alias.includes(normalizedKey);
      });
      if (fuzzy) {
        return fuzzy[1];
      }
    }
    return undefined;
  }

  private findFeishuFieldValueExact(fields: Record<string, unknown>, aliases: string[]) {
    const entries = Object.entries(fields);
    const normalizedAliases = aliases.map((item) => this.normalizeFieldKey(item));
    for (const alias of normalizedAliases) {
      const exact = entries.find(([key]) => this.normalizeFieldKey(key) === alias);
      if (exact) {
        return exact[1];
      }
    }
    return undefined;
  }

  private flattenFeishuValue(value: unknown): string[] {
    if (value === undefined || value === null) {
      return [];
    }
    if (typeof value === "string") {
      return value.trim() ? [value.trim()] : [];
    }
    if (typeof value === "number") {
      return [String(value)];
    }
    if (typeof value === "boolean") {
      return [value ? "true" : "false"];
    }
    if (Array.isArray(value)) {
      return Array.from(new Set(value.flatMap((item) => this.flattenFeishuValue(item)).filter(Boolean)));
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const preferredKeys = ["text", "link", "name", "url", "title", "value", "label", "email", "id", "token"];
      const preferredValues = preferredKeys.flatMap((key) => this.flattenFeishuValue(record[key]));
      if (preferredValues.length) {
        return Array.from(new Set(preferredValues));
      }
      return Array.from(new Set(Object.values(record).flatMap((item) => this.flattenFeishuValue(item)).filter(Boolean)));
    }
    return [];
  }

  private extractFeishuMediaEntries(value: unknown): Array<{ url: string; name: string; type: string }> {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractFeishuMediaEntries(item));
    }
    if (typeof value !== "object") {
      return [];
    }
    const record = value as Record<string, unknown>;
    const candidateUrls = [
      record.url,
      record.tmp_url,
      record.tmpUrl,
      record.download_url,
      record.downloadUrl,
      record.preview_url,
      record.previewUrl,
      record.file_url,
      record.fileUrl,
    ].filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item));
    const name = typeof record.name === "string"
      ? record.name
      : typeof record.file_name === "string"
        ? record.file_name
        : typeof record.fileName === "string"
          ? record.fileName
          : "";
    const type = typeof record.type === "string"
      ? record.type
      : typeof record.mime_type === "string"
        ? record.mime_type
        : typeof record.mimeType === "string"
          ? record.mimeType
          : typeof record.content_type === "string"
            ? record.content_type
            : typeof record.contentType === "string"
              ? record.contentType
              : "";
    const current = candidateUrls.map((url) => ({ url, name, type }));
    return current.concat(Object.values(record).flatMap((item) => this.extractFeishuMediaEntries(item)));
  }

  private extractUrlsFromUnknown(value: unknown) {
    const mediaUrls = this.extractFeishuMediaEntries(value).map((item) => item.url);
    const textUrls = this.flattenFeishuValue(value).flatMap((item) => this.extractUrlsFromText(item));
    return Array.from(new Set([...mediaUrls, ...textUrls].filter(Boolean)));
  }

  private extractTypedUrlsFromUnknown(value: unknown, mediaType: "image" | "video") {
    const mediaUrls = this.extractFeishuMediaEntries(value)
      .filter((item) => (mediaType === "image" ? this.isImageMediaEntry(item) : this.isVideoMediaEntry(item)))
      .map((item) => item.url);
    const textUrls = this.flattenFeishuValue(value)
      .flatMap((item) => this.extractUrlsFromText(item))
      .filter((item) => (mediaType === "image" ? this.isLikelyImageUrl(item) : this.isLikelyVideoUrl(item)));
    return Array.from(new Set([...mediaUrls, ...textUrls].filter(Boolean)));
  }

  private isVideoMediaEntry(item: { url: string; name: string; type: string }) {
    const type = item.type.toLowerCase();
    const target = `${item.name} ${item.url}`.toLowerCase();
    return type.startsWith("video/") || /\.(mp4|mov|m4v|avi|mkv|webm)(\?|$)/i.test(target);
  }

  private isImageMediaEntry(item: { url: string; name: string; type: string }) {
    const type = item.type.toLowerCase();
    const target = `${item.name} ${item.url}`.toLowerCase();
    return type.startsWith("image/") || this.isLikelyImageUrl(target);
  }

  private isLikelyImageUrl(url: string) {
    if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url)) {
      return true;
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const target = `${parsed.pathname}${parsed.search}`.toLowerCase();
      if (host.endsWith("rednotecdn.com") || host.endsWith("xhscdn.com")) {
        return /imageview2|imagemogr2|x-oss-process=image|format\/(png|jpe?g|webp|gif|bmp|svg)|redimage\/frame|\/spectrum\//i.test(target)
          || host.startsWith("sns-i");
      }
    } catch {
      return false;
    }
    return false;
  }

  private isLikelyVideoUrl(url: string) {
    if (/\.(mp4|mov|m4v|avi|mkv|webm)(\?|$)/i.test(url)) {
      return true;
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const target = `${parsed.pathname}${parsed.search}`.toLowerCase();
      if (host.endsWith("xhscdn.com") || host.endsWith("rednotecdn.com")) {
        return /video|stream|master|h264|h265|mp4|m3u8/i.test(target) || host.startsWith("sns-video");
      }
    } catch {
      return false;
    }
    return false;
  }

  private extractUrlsFromText(value: string) {
    const matches = value.match(/https?:\/\/[^\s)\]]+/gi);
    return matches ? Array.from(new Set(matches)) : [];
  }

  private extractFileNameFromDisposition(disposition: string) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    return plainMatch?.[1] ?? "";
  }

  private extractFileNameFromMediaUrl(sourceUrl: string) {
    try {
      const url = new URL(sourceUrl);
      const rawName = url.searchParams.get("file_name") || url.searchParams.get("filename") || url.searchParams.get("name") || "";
      if (rawName) {
        return rawName;
      }
      const tokenMatch = url.pathname.match(/\/medias\/([^/]+)\/download/i);
      if (!tokenMatch?.[1]) {
        return "";
      }
      const token = tokenMatch[1];
      const ext = this.guessFileExtensionFromUrl(sourceUrl);
      return ext ? `${token}${ext}` : token;
    } catch {
      return "";
    }
  }

  private guessFileExtensionFromUrl(sourceUrl: string) {
    try {
      const url = new URL(sourceUrl);
      const pathname = url.pathname.toLowerCase();
      const pathnameMatch = pathname.match(/\.(png|jpe?g|webp|gif|bmp|svg|mp4|mov|m4v|avi|mkv|webm)$/i);
      if (pathnameMatch?.[1]) {
        return `.${pathnameMatch[1]}`;
      }

      const queryCandidates = [
        url.searchParams.get("file_name"),
        url.searchParams.get("filename"),
        url.searchParams.get("name"),
      ].filter((item): item is string => Boolean(item));
      for (const candidate of queryCandidates) {
        const match = candidate.toLowerCase().match(/\.(png|jpe?g|webp|gif|bmp|svg|mp4|mov|m4v|avi|mkv|webm)$/i);
        if (match?.[1]) {
          return `.${match[1]}`;
        }
      }
      return "";
    } catch {
      return "";
    }
  }

  private sanitizeStoredFileName(value: string) {
    const normalized = String(value || "").split(/[\\/]/).pop() || "";
    return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  private buildXhsNoteMediaStorageKey(brandId: string, fileName: string) {
    return `collectors/xiaohongshu/${brandId}/note-media/${fileName}`;
  }

  private buildXhsNoteMediaAssetUrl(brandId: string, fileName: string) {
    return `/api/collectors/xiaohongshu/brands/${encodeURIComponent(brandId)}/media/${encodeURIComponent(fileName)}`;
  }

  private buildDouyinVideoAssetUrl(brandId: string, assetId: string) {
    return `/api/collectors/douyin/brands/${encodeURIComponent(brandId)}/media/${encodeURIComponent(assetId)}`;
  }

  private buildXhsNoteMediaFileName(
    noteId: string,
    mediaType: "image" | "video",
    index: number,
    contentType: string,
    sourceUrl: string,
  ) {
    const safeNoteId = this.sanitizeStoredFileName(noteId).replace(/\.[^.]+$/, "") || "xhs-note";
    const extension = this.resolveXhsMediaExtension(contentType, sourceUrl, mediaType);
    const suffix = mediaType === "image" ? `image-${index + 1}` : "video";
    return `xhs-${safeNoteId}-${suffix}-${createId("xhsmedia")}${extension}`;
  }

  private resolveXhsMediaContentType(contentType: string, sourceUrl: string, mediaType: "image" | "video") {
    const normalizedType = String(contentType || "").split(";")[0].trim().toLowerCase();
    if (normalizedType) {
      return normalizedType;
    }
    const guessedExtension = this.guessFileExtensionFromUrl(sourceUrl).toLowerCase();
    if (mediaType === "image") {
      if (guessedExtension === ".png") {
        return "image/png";
      }
      if (guessedExtension === ".gif") {
        return "image/gif";
      }
      if (guessedExtension === ".jpg" || guessedExtension === ".jpeg") {
        return "image/jpeg";
      }
      return "image/webp";
    }
    return "video/mp4";
  }

  private resolveXhsMediaExtension(contentType: string, sourceUrl: string, mediaType: "image" | "video") {
    const normalizedType = this.resolveXhsMediaContentType(contentType, sourceUrl, mediaType);
    if (normalizedType.includes("png")) {
      return ".png";
    }
    if (normalizedType.includes("gif")) {
      return ".gif";
    }
    if (normalizedType.includes("jpeg") || normalizedType.includes("jpg")) {
      return ".jpg";
    }
    if (normalizedType.includes("svg")) {
      return ".svg";
    }
    if (normalizedType.includes("webm")) {
      return ".webm";
    }
    if (normalizedType.includes("mov")) {
      return ".mov";
    }
    if (normalizedType.includes("mp4")) {
      return ".mp4";
    }
    const guessed = this.guessFileExtensionFromUrl(sourceUrl);
    if (guessed) {
      return guessed;
    }
    return mediaType === "image" ? ".webp" : ".mp4";
  }

  private normalizeFieldKey(value: string) {
    return value.replace(/\s+/g, "").replace(/[_-]/g, "").toLowerCase();
  }

  private async runLarkCliJson(args: string[]) {
    try {
      const cliHome = this.resolveLarkCliHomeDir();
      const env = {
        ...process.env,
        HOME: cliHome,
        USERPROFILE: cliHome,
      };
      const result = process.platform === "win32"
        ? await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-Command", `& '${this.resolveLarkCliCommand()}' ${args.map((item) => this.escapePowerShellArg(item)).join(" ")}`],
            {
              encoding: "buffer",
              env,
              maxBuffer: 8 * 1024 * 1024,
            },
          )
        : await execFileAsync(this.resolveLarkCliCommand(), args, {
            encoding: "buffer",
            env,
            maxBuffer: 8 * 1024 * 1024,
          });
      const text = this.decodeCliOutput(result.stdout);
      return text ? (JSON.parse(text) as unknown) : {};
    } catch (error) {
      const stdout = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stdout" in error ? (error as { stdout?: unknown }).stdout : undefined,
      );
      const stderr = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stderr" in error ? (error as { stderr?: unknown }).stderr : undefined,
      );
      const message = stderr.trim() || stdout.trim() || (error instanceof Error ? error.message : "lark-cli 执行失败");
      throw new ServiceUnavailableException(message);
    }
  }

  private decodeCliOutput(stdout: Buffer | string | null | undefined) {
    if (!stdout) {
      return "";
    }
    if (typeof stdout === "string") {
      return stdout.trim();
    }
    const utf8Text = stdout.toString("utf8").trim();

    if (process.platform === "win32") {
      if (!utf8Text.includes("�")) {
        return utf8Text;
      }
      try {
        const gbText = new TextDecoder("gb18030").decode(stdout).trim();
        return gbText || utf8Text;
      } catch {
        return utf8Text;
      }
    }

    return utf8Text;
  }

  private decodeUnknownCliStream(value: unknown) {
    if (!value) {
      return "";
    }
    if (Buffer.isBuffer(value) || typeof value === "string") {
      return this.decodeCliOutput(value);
    }
    return String(value);
  }

  private escapePowerShellArg(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
  }

  private resolveLarkCliCommand() {
    if (process.platform === "win32") {
      const appData = process.env.APPDATA || process.env.USERPROFILE;
      if (appData) {
        const baseDir = appData.endsWith("\\Roaming") ? `${appData}\\npm` : `${appData}\\Roaming\\npm`;
        return `${baseDir}\\lark-cli.cmd`;
      }
      return "lark-cli.cmd";
    }

    return "lark-cli";
  }

  private resolveLarkCliHomeDir() {
    const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "..", "..")];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, ".lark-cli", "config.json"))) {
        return candidate;
      }
    }

    const fromUserProfile = process.env.USERPROFILE ? resolve(process.env.USERPROFILE) : "";
    if (fromUserProfile && existsSync(join(fromUserProfile, ".lark-cli", "config.json"))) {
      return fromUserProfile;
    }

    return process.cwd();
  }

  private async collectAndStoreAccount(
    brandId: string,
    account: XhsResolvedAccountRecord,
    kind: CollectorAccountKind,
  ): Promise<XhsCollectedAccountRecord> {
    const userQuery = this.resolveXhsUserQuery(account.accountLink);
    if (!userQuery.userId && !userQuery.shareText) {
      throw new BadRequestException(`小红书账号链接或用户 ID 无效：${account.accountLink}`);
    }
    const raw = await this.fetchTikHub(
      "/api/v1/xiaohongshu/app_v2/get_user_info",
      {
        user_id: userQuery.userId,
        share_text: userQuery.shareText,
      },
      brandId,
    );

    const accountName = this.pickString(raw, ["nickname", "name"]) || account.accountName;
    const externalUserId =
      this.pickString(raw, ["user_id", "userid", "userId", "uid", "id"])
      || userQuery.userId
      || this.extractUserIdFromUrl(account.accountLink);
    const collectedAt = new Date().toISOString();
    const accountLink = this.normalizeXhsShareText(this.extractShareUrl(raw) || account.accountLink) || account.accountLink;

    const payload = {
      kind,
      sourceAccountId: account.id,
      sourceAccountLink: accountLink,
      accountRole: this.normalizeXhsAccountRole(account.accountRole) || "BRAND",
      externalUserId,
      postedCount: this.pickNumber(raw, ["posted", "note_count", "notes_count", "post_count"]),
      likedCount: this.pickNumber(raw, ["liked", "liked_count", "total_liked", "total_favorited"]),
      collectedCount: this.pickNumber(raw, ["collected", "collected_count", "collect_count"]),
      avatar: this.pickString(raw, ["avatar", "avatar_url", "image"]),
      description: this.pickString(raw, ["desc", "description", "bio"]),
      ipLocation: this.pickString(raw, ["ip_location"]),
      followCount: this.pickNumber(raw, ["follows", "follow_count", "following_count"]),
      fanCount: this.pickNumber(raw, ["fans", "fan_count", "follower_count"]),
      collectedAt,
      rawFields: this.asMeta(raw),
    };

    const asset = await this.upsertCollectorAsset({
      brandId,
      kind,
      matchValue: account.id,
      title: accountName,
      description: kind === "XHS_BRAND_ACCOUNT" ? "小红书品牌账号采集快照" : "小红书竞品账号采集快照",
      fileUrl: accountLink,
      metadata: payload,
    });

    return this.mapCollectedAccount(asset, kind);
  }

  private async collectAndStoreNotes(brandId: string, account: XhsResolvedAccountRecord): Promise<XhsCollectedNoteRecord[]> {
    const userQuery = this.resolveXhsUserQuery(account.accountLink);
    if (!userQuery.userId && !userQuery.shareText) {
      throw new BadRequestException(`小红书账号链接或用户 ID 无效：${account.accountLink}`);
    }
    const raw = await this.fetchTikHub(
      "/api/v1/xiaohongshu/app_v2/get_user_posted_notes",
      {
        user_id: userQuery.userId,
        share_text: userQuery.shareText,
        cursor: "",
      },
      brandId,
    );

    const noteItems = this.extractNoteItems(raw);
    const collectedAt = new Date().toISOString();
    const rows: XhsCollectedNoteRecord[] = [];

    for (const item of noteItems) {
      const noteId = this.pickString(item, ["note_id", "noteId", "id"]);
      if (!noteId) {
        continue;
      }

      const noteUrl =
        this.pickString(item, ["note_url", "noteUrl", "share_url", "shareUrl"])
        || this.extractShareUrl(item)
        || `https://www.xiaohongshu.com/explore/${noteId}`;
      const title = this.pickString(item, ["title", "name"]) || `小红书作品 ${noteId}`;
      const description = this.pickString(item, ["desc", "description", "content", "text"]) || "";
      const likeCount = this.pickNumber(item, ["likes", "liked_count", "like_count", "likedCount", "digg_count"]);
      const collectCount = this.pickNumber(item, ["collected_count", "collect_count", "collectedCount", "collect_num"]);
      const shareCount = this.pickNumber(item, ["share_count", "shareCount", "shared_count", "share_num"]);
      const commentCount = this.pickNumber(item, ["comments_count", "comment_count", "commentCount", "comment_num"]);
      const noteType = this.pickString(item, ["type", "note_type"]);
      const nickname = this.pickString(item, ["nickname", "user_name", "author_name"]);
      const imageList = this.extractXhsImageList(item);
      const externalUserId = this.pickString(item, ["userid", "user_id", "userId", "author_id"]);
      const createdAtText = this.pickString(item, ["create_time", "time", "publish_time"]);
      const videoUrl = this.extractXhsVideoUrl(item);
      const cachedMedia = await this.cacheXhsNoteMediaBundle(brandId, noteId, imageList, videoUrl);

      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_BRAND_NOTE",
        matchValue: noteId,
        title,
        description,
        fileUrl: noteUrl,
        metadata: {
          kind: "XHS_BRAND_NOTE",
          sourceAccountId: account.id,
          sourceAccountLink: account.accountLink,
          noteId,
          noteUrl,
          noteType,
          nickname,
          imageList: cachedMedia.imageList,
          imageSourceList: imageList,
          externalUserId,
          likeCount,
          collectCount,
          createdAtText,
          shareCount,
          commentCount,
          videoUrl: cachedMedia.videoUrl,
          videoSourceUrl: videoUrl,
          collectedAt,
          rawFields: this.asMeta(item),
        },
      });

      rows.push(this.mapCollectedNote(asset));
    }

    return rows;
  }

  private async collectAndStoreDouyinAccount(
    brandId: string,
    account: DouyinResolvedAccountRecord,
    kind: "DOUYIN_BRAND_ACCOUNT" | "DOUYIN_COMPETITOR_ACCOUNT",
  ): Promise<DouyinCollectedAccountRecord> {
    const secUserId = this.extractDouyinSecUserId(account.accountLink);
    if (!secUserId) {
      throw new BadRequestException(`抖音账号链接缺少 sec_user_id：${account.accountLink}`);
    }

    const raw = await this.fetchTikHub("/api/v1/douyin/app/v3/handler_user_profile", {
      sec_user_id: secUserId,
    }, brandId);
    const user = this.extractDouyinUser(raw);
    const accountName = this.pickString(user, ["nickname"]) || account.accountName;
    const collectedAt = new Date().toISOString();

    const payload = {
      kind,
      sourceAccountId: account.id,
      accountLink: this.normalizeDouyinShareUrl(this.extractShareUrl(user) || account.accountLink) || account.accountLink,
      sourceAccountLink: account.accountLink,
      accountRole: this.normalizeXhsAccountRole(account.accountRole) || "BRAND",
      secUserId,
      externalUserId: this.pickString(user, ["uid"]) || undefined,
      username: this.pickString(user, ["unique_id"]) || undefined,
      shortId: this.pickString(user, ["short_id"]) || undefined,
      avatar: this.extractFirstUrlFromObject(user, "avatar_300x300") || this.extractFirstUrlFromObject(user, "avatar_168x168") || undefined,
      description: this.pickString(user, ["signature"]) || undefined,
      postedCount: this.pickNumber(user, ["aweme_count"]),
      likedCount: this.pickNumber(user, ["total_favorited"]),
      fanCount: this.pickNumber(user, ["follower_count"]),
      followCount: this.pickNumber(user, ["following_count"]),
      ipLocation: this.pickString(user, ["ip_location"]) || undefined,
      enterpriseVerifyReason: this.pickString(user, ["enterprise_verify_reason"]) || undefined,
      customVerify: this.pickString(user, ["custom_verify"]) || undefined,
      collectedAt,
      rawFields: user,
    };

    const asset = await this.upsertCollectorAsset({
      brandId,
      kind,
      matchValue: account.id,
      title: accountName,
      description: kind === "DOUYIN_BRAND_ACCOUNT" ? "抖音品牌账号采集快照" : "抖音竞品账号采集快照",
      fileUrl: this.normalizeDouyinShareUrl(this.extractShareUrl(user) || account.accountLink) || account.accountLink,
      metadata: payload,
    });

    return this.mapDouyinCollectedAccount(asset, kind);
  }

  private async collectAndStoreDouyinWorks(
    brandId: string,
    account: DouyinResolvedAccountRecord,
    kind: "DOUYIN_BRAND_WORK" | "DOUYIN_COMPETITOR_WORK" | "DOUYIN_BENCHMARK_WORK",
  ): Promise<DouyinCollectedWorkRecord[]> {
    const secUserId = this.extractDouyinSecUserId(account.accountLink);
    if (!secUserId) {
      throw new BadRequestException(`抖音账号链接缺少 sec_user_id：${account.accountLink}`);
    }

    const raw = await this.fetchTikHub("/api/v1/douyin/app/v3/fetch_user_post_videos", {
      sec_user_id: secUserId,
      max_cursor: "0",
      count: "20",
    }, brandId);
    const awemeList = this.extractDouyinAwemeList(raw).slice(0, 12);
    const awemeIds = awemeList
      .map((item) => this.pickString(item, ["aweme_id"]))
      .filter(Boolean);
    const statisticsMap = awemeIds.length
      ? this.extractDouyinStatisticsMap(
          await this.fetchTikHub("/api/v1/douyin/app/v3/fetch_video_statistics", {
            aweme_ids: awemeIds.join(","),
          }, brandId),
        )
      : new Map<string, Record<string, unknown>>();
    const collectedAt = new Date().toISOString();
    const rows: DouyinCollectedWorkRecord[] = [];

    for (const aweme of awemeList) {
      const workId = this.pickString(aweme, ["aweme_id"]);
      if (!workId) {
        continue;
      }

      let detail = {} as Record<string, unknown>;
      if (kind === "DOUYIN_BENCHMARK_WORK") {
        try {
          const detailRaw = await this.fetchTikHub("/api/v1/douyin/app/v3/fetch_one_video_v3", { aweme_id: workId }, brandId);
          detail = this.extractDouyinAwemeDetail(detailRaw);
        } catch {
          detail = {};
        }
      }

      const statistics = statisticsMap.get(workId) ?? {};
      const detailStatistics = this.asMeta(detail.statistics);
      const detailAuthor = this.asMeta(detail.author);
      const detailMusic = this.asMeta(detail.music);
      const title = this.pickString(aweme, ["desc"]) || this.pickString(detail, ["desc"]) || `抖音作品 ${workId}`;
      const description = this.pickString(aweme, ["desc"]) || this.pickString(detail, ["desc"]) || "";
      const likeCount = this.pickNumber(statistics, ["digg_count"]) ?? this.pickNumber(aweme, ["digg_count", "diggCount"]);
      const playCount = this.pickNumber(statistics, ["play_count"]);
      const shareCount = this.pickNumber(statistics, ["share_count"]) ?? this.pickNumber(aweme, ["share_count"]);
      const commentCount = this.pickNumber(detailStatistics, ["comment_count"]) ?? this.pickNumber(aweme, ["comment_count"]);
      const collectCount = this.pickNumber(detailStatistics, ["collect_count"]) ?? this.pickNumber(aweme, ["collect_count"]);
      const downloadCount = this.pickNumber(statistics, ["download_count"]);
      const recommendCount = this.pickNumber(detailStatistics, ["recommend_count"]) ?? this.pickNumber(aweme, ["recommend_count"]);
      const workType = this.deriveDouyinWorkType(aweme, detail);
      const workUrl =
        this.normalizeDouyinShareUrl(this.extractShareUrl(aweme))
        || this.normalizeDouyinShareUrl(this.extractShareUrl(detail))
        || this.normalizeDouyinNoteUrl(workId, workType);
      const imageList = this.extractDouyinImageList(detail).length ? this.extractDouyinImageList(detail) : this.extractDouyinImageList(aweme);
      const videoSourceUrl =
        this.pickString(aweme, ["video_download_addr"])
        || this.extractDouyinVideoUrl(detail)
        || this.extractDouyinVideoUrl(aweme)
        || undefined;
      const metadata = this.buildDouyinVideoCacheMetadata({
        kind,
        sourceAccountId: account.id,
        sourceAccountLink: account.accountLink,
        workId,
        workUrl,
        workType,
        authorName: this.pickString(aweme, ["nickname"]) || this.pickString(detailAuthor, ["nickname"]) || account.accountName,
        authorUniqueId: this.pickString(aweme, ["unique_id"]) || this.pickString(detailAuthor, ["unique_id"]) || undefined,
        externalUserId: this.pickString(aweme, ["author_user_id", "uid"]) || this.pickString(detailAuthor, ["uid"]) || undefined,
        coverUrl: this.extractDouyinCoverUrl(detail) || this.extractDouyinCoverUrl(aweme) || undefined,
        imageList,
        videoUrl: videoSourceUrl,
        hashtags: this.extractDouyinHashtags(detail).length ? this.extractDouyinHashtags(detail) : this.extractDouyinHashtags(aweme),
        publishTimeText: this.formatUnixTimestampText(this.pickNumber(aweme, ["create_time"])),
        durationMs: this.pickNumber(this.asMeta(detail.video), ["duration"]) ?? this.pickNumber(aweme, ["duration"]),
        mediaType: this.pickNumber(aweme, ["media_type"]),
        awemeType: this.pickNumber(aweme, ["aweme_type"]) ?? this.pickNumber(detail, ["aweme_type"]),
        musicTitle: this.pickString(detailMusic, ["title"]) || undefined,
        musicAuthor: this.pickString(detailMusic, ["author"]) || undefined,
        likeCount,
        playCount,
        shareCount,
        commentCount,
        collectCount,
        downloadCount,
        recommendCount,
        likeCollectRatio: this.computeRatio(likeCount, collectCount),
        likeCommentRatio: this.computeRatio(likeCount, commentCount),
        shareRatio: this.computeRatio(shareCount, playCount),
        statsPatched: statisticsMap.has(workId),
        authorFollowerCount: this.pickNumber(detailAuthor, ["follower_count"]),
        authorLikedCount: this.pickNumber(detailAuthor, ["total_favorited"]),
        authorAvatar: this.extractFirstUrlFromObject(detailAuthor, "avatar_300x300") || undefined,
        collectedAt,
        rawFields: {
          aweme,
          detail,
          statistics,
        },
      });

      const asset = await this.upsertCollectorAsset({
        brandId,
        kind,
        matchValue: workId,
        title,
        description,
        fileUrl: workUrl,
        metadata,
      });

      const transcriptReadyAsset = await this.markDouyinTranscriptPending(asset);

      this.enqueueDouyinVideoCache(transcriptReadyAsset);
      this.enqueueDouyinTranscriptExtraction(transcriptReadyAsset);

      rows.push(this.mapDouyinCollectedWork(transcriptReadyAsset, kind));
    }

    return rows;
  }

  private async collectAndStoreDouyinBillboardWorks(
    brandId: string,
    config: {
      kind: "DOUYIN_LOW_FAN_EXPLOSIVE_WORK" | "DOUYIN_HIGH_COMPLETION_RATE_WORK" | "DOUYIN_HIGH_LIKE_RATE_WORK";
      scope: DouyinBillboardScopeKey;
      label: string;
      path: string;
      selection: DouyinContentTagSelection;
    },
  ): Promise<DouyinCollectedWorkRecord[]> {
    if (!config.selection.primaryTagId || !config.selection.secondaryTagId) {
      throw new BadRequestException(`请先选择${config.label}的一级分类和二级分类`);
    }

    const contentTags = await this.getDouyinContentTagsSafe(brandId);
    const tagLabels = this.resolveDouyinContentTagLabels(contentTags, config.selection);
    const raw = await this.fetchTikHubPost(
      config.path,
      {
        page: "1",
        page_size: 10,
        date_window: 24,
        tags: this.buildDouyinBillboardTags(config.selection),
      },
      brandId,
    );
    const items = this.extractDouyinBillboardItems(raw).slice(0, 20);
    const collectedAt = new Date().toISOString();
    const rows: DouyinCollectedWorkRecord[] = [];

    for (const item of items) {
      const workId = this.pickString(item, ["item_id"]);
      if (!workId) {
        continue;
      }
      const imageCount = this.pickNumber(item, ["image_cnt"]) ?? 0;
      const mediaType = this.pickNumber(item, ["media_type"]);
      const workType = imageCount > 0 || mediaType === 68 ? "图文" : "短视频";
      const directVideoUrl = this.pickString(item, ["item_url"]) || undefined;
      const metadata = this.buildDouyinVideoCacheMetadata({
        kind: config.kind,
        sourceAccountId: `${config.scope}:${config.selection.secondaryTagId}`,
        sourceAccountLink: "",
        workId,
        workUrl: this.normalizeDouyinNoteUrl(workId, workType),
        workType,
        authorName: this.pickString(item, ["nick_name"]) || undefined,
        coverUrl: this.pickString(item, ["item_cover_url"]) || undefined,
        videoUrl: workType === "图文" ? undefined : directVideoUrl,
        publishTimeText: this.formatUnixTimestampText(this.pickNumber(item, ["publish_time"])),
        durationMs: this.pickNumber(item, ["item_duration"]),
        mediaType,
        likeCount: this.pickNumber(item, ["like_cnt"]),
        playCount: this.pickNumber(item, ["play_cnt"]),
        authorFollowerCount: this.pickNumber(item, ["fans_cnt"]),
        authorAvatar: this.pickString(item, ["avatar_url"]) || undefined,
        billboardLabel: config.label,
        primaryTagLabel: tagLabels.primaryTagLabel,
        secondaryTagLabel: tagLabels.secondaryTagLabel,
        score: this.pickNumber(item, ["score"]),
        collectedAt,
        rawFields: item,
      });

      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: config.kind,
        matchValue: workId,
        title: this.pickString(item, ["item_title"]) || `抖音作品 ${workId}`,
        description: this.pickString(item, ["item_title"]) || "",
        fileUrl: this.normalizeDouyinNoteUrl(workId, workType),
        metadata,
      });

      this.enqueueDouyinVideoCache(asset);
      rows.push(this.mapDouyinCollectedWork(asset, config.kind));
    }

    return rows;
  }

  private async collectAndStoreDouyinCityHotspots(
    brandId: string,
    cityCode?: number,
  ): Promise<DouyinCityHotspotRecord[]> {
    if (!cityCode) {
      throw new BadRequestException("请先选择城市后再提交同城热点榜采集");
    }

    const cityOptions = await this.getDouyinCityOptionsSafe(brandId);
    const cityLabel = cityOptions.find((item) => item.value === cityCode)?.label || String(cityCode);
    const raw = await this.fetchTikHub(
      "/api/v1/douyin/billboard/fetch_hot_city_list",
      {
        page: "1",
        page_size: "20",
        order: "rank",
        city_code: String(cityCode),
      },
      brandId,
    );
    const items = this.extractDouyinCityHotspotItems(raw).slice(0, 20);
    const collectedAt = new Date().toISOString();
    const rows: DouyinCityHotspotRecord[] = [];

    for (const [index, item] of items.entries()) {
      const sentence = this.pickString(item, ["sentence", "title", "keyword", "word"]);
      if (!sentence) {
        continue;
      }
      const sentenceId =
        this.pickString(item, ["sentence_id", "id", "group_id"])
        || String(this.pickNumber(item, ["sentence_id", "id", "group_id"]) ?? "");
      const metadata = {
        kind: "DOUYIN_CITY_HOTSPOT" as const,
        cityCode,
        cityLabel,
        rank: this.pickNumber(item, ["rank", "position"]) ?? index + 1,
        rankDiff: this.pickNumber(item, ["rank_diff"]),
        sentence,
        sentenceId: sentenceId || undefined,
        createAtText: this.formatUnixTimestampText(this.pickNumber(item, ["create_at", "create_time"])),
        hotScore: this.pickNumber(item, ["hot_score", "hot_value"]),
        videoCount: this.pickNumber(item, ["video_count"]),
        sentenceTag: this.pickNumber(item, ["sentence_tag"]),
        trends: this.extractDouyinCityHotspotTrends(item),
        collectedAt,
        rawFields: item,
      };
      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "DOUYIN_CITY_HOTSPOT",
        matchValue: `${cityCode}:${sentenceId || sentence}`,
        title: sentence,
        description: `${cityLabel}同城热点`,
        fileUrl: "",
        metadata,
      });
      rows.push(this.mapDouyinCityHotspot(asset));
    }

    return rows;
  }

  private async collectAndStoreSingleDouyinBenchmarkWork(
    brandId: string,
    awemeId: string,
  ): Promise<DouyinCollectedWorkRecord> {
    const workId = this.normalizeDouyinAwemeId(awemeId);
    if (!workId) {
      throw new BadRequestException("对标作品 aweme_id 不能为空");
    }

    const detailRaw = await this.fetchTikHub("/api/v1/douyin/app/v3/fetch_one_video_v3", { aweme_id: workId }, brandId);
    const detail = this.extractDouyinAwemeDetail(detailRaw);
    let statisticsMap = new Map<string, Record<string, unknown>>();
    let statisticsPatchError = "";
    try {
      statisticsMap = this.extractDouyinStatisticsMap(
        await this.fetchTikHub("/api/v1/douyin/app/v3/fetch_video_statistics", { aweme_ids: workId }, brandId),
      );
    } catch (error) {
      statisticsPatchError = error instanceof Error ? error.message : "统计接口补丁失败";
    }
    const statistics = statisticsMap.get(workId) ?? {};
    const author = this.asMeta(detail.author);
    const detailStatistics = this.asMeta(detail.statistics);
    const detailMusic = this.asMeta(detail.music);
    const accountLink =
      this.normalizeDouyinShareUrl(this.extractShareUrl(author))
      || this.buildDouyinUserUrl(this.pickString(author, ["sec_uid"]))
      || "";
    const collectedAt = new Date().toISOString();
    const title = this.pickString(detail, ["desc"]) || `抖音作品 ${workId}`;
    const description = this.pickString(detail, ["desc"]) || "";
    const likeCount =
      this.pickNumber(statistics, ["digg_count"])
      ?? this.pickNumber(detailStatistics, ["digg_count"]);
    const commentCount = this.pickNumber(detailStatistics, ["comment_count"]);
    const shareCount =
      this.pickNumber(statistics, ["share_count"])
      ?? this.pickNumber(detailStatistics, ["share_count"]);
    const collectCount = this.pickNumber(detailStatistics, ["collect_count"]);
    const playCount = this.pickNumber(statistics, ["play_count"]);
    const downloadCount = this.pickNumber(statistics, ["download_count"]);
    const recommendCount = this.pickNumber(detailStatistics, ["recommend_count"]);
    const workType = this.deriveDouyinWorkType({}, detail);
    const workUrl =
      this.normalizeDouyinShareUrl(this.extractShareUrl(detail))
      || this.normalizeDouyinNoteUrl(workId, workType);
    const metadata = this.buildDouyinVideoCacheMetadata({
      kind: "DOUYIN_BENCHMARK_WORK",
      sourceAccountId: this.pickString(author, ["sec_uid"]) || workId,
      accountLink,
      sourceAccountLink: accountLink,
      workId,
      workUrl,
      workType,
      authorName: this.pickString(author, ["nickname"]) || undefined,
      authorUniqueId: this.pickString(author, ["unique_id"]) || undefined,
      externalUserId: this.pickString(author, ["uid"]) || undefined,
      coverUrl: this.extractDouyinCoverUrl(detail) || undefined,
      imageList: this.extractDouyinImageList(detail),
      videoUrl: this.extractDouyinVideoUrl(detail) || undefined,
      hashtags: this.extractDouyinHashtags(detail),
      publishTimeText: this.formatUnixTimestampText(this.pickNumber(detail, ["create_time"])),
      durationMs: this.pickNumber(this.asMeta(detail.video), ["duration"]),
      mediaType: this.pickNumber(detail, ["media_type"]),
      awemeType: this.pickNumber(detail, ["aweme_type"]),
      musicTitle: this.pickString(detailMusic, ["title"]) || undefined,
      musicAuthor: this.pickString(detailMusic, ["author"]) || undefined,
      likeCount,
      playCount,
      shareCount,
      commentCount,
      collectCount,
      downloadCount,
      recommendCount,
      likeCollectRatio: this.computeRatio(likeCount, collectCount),
      likeCommentRatio: this.computeRatio(likeCount, commentCount),
      shareRatio: this.computeRatio(shareCount, playCount),
      statsPatched: statisticsMap.has(workId),
      authorFollowerCount: this.pickNumber(author, ["follower_count"]),
      authorLikedCount: this.pickNumber(author, ["total_favorited"]),
      authorAvatar: this.extractFirstUrlFromObject(author, "avatar_300x300") || undefined,
      collectedAt,
      rawFields: {
        detail,
        statistics,
        statisticsPatchError: statisticsPatchError || undefined,
      },
    });

    const asset = await this.upsertCollectorAsset({
      brandId,
      kind: "DOUYIN_BENCHMARK_WORK",
      matchValue: workId,
      title,
      description,
      fileUrl: workUrl,
      metadata,
    });

    const transcriptReadyAsset = await this.markDouyinTranscriptPending(asset);

    this.enqueueDouyinVideoCache(transcriptReadyAsset);
    this.enqueueDouyinTranscriptExtraction(transcriptReadyAsset);

    return this.mapDouyinCollectedWork(transcriptReadyAsset, "DOUYIN_BENCHMARK_WORK");
  }

  private normalizeDouyinSearchSelectValue(value: string | undefined, allowedValues: string[], fallback: string) {
    const normalized = String(value || "").trim();
    return allowedValues.includes(normalized) ? normalized : fallback;
  }

  private async collectAndStoreDouyinSearchWorks(
    brandId: string,
    keyword?: string,
    options?: {
      sortType?: string;
      publishTime?: string;
      filterDuration?: string;
      contentType?: string;
    },
  ): Promise<DouyinCollectedWorkRecord[]> {
    const normalizedKeyword = String(keyword || "").trim();
    if (!normalizedKeyword) {
      throw new BadRequestException("请输入关键词后再提交抖音搜索。");
    }
    const sortType = this.normalizeDouyinSearchSelectValue(options?.sortType, ["0", "1", "2"], "0");
    const publishTime = this.normalizeDouyinSearchSelectValue(options?.publishTime, ["0", "1", "7", "180"], "0");
    const filterDuration = this.normalizeDouyinSearchSelectValue(options?.filterDuration, ["0", "0-1", "1-5", "5-10000"], "0");
    const contentType = this.normalizeDouyinSearchSelectValue(options?.contentType, ["0", "1", "2", "3"], "0");

    const raw = await this.fetchTikHubPost(
      "/api/v1/douyin/search/fetch_general_search_v1",
      {
        keyword: normalizedKeyword,
        cursor: 0,
        sort_type: sortType,
        publish_time: publishTime,
        filter_duration: filterDuration,
        content_type: contentType,
        search_id: "",
      },
      brandId,
    );
    const items = this.extractDouyinSearchResultItems(raw).slice(0, 20);
    const collectedAt = new Date().toISOString();
    const rows: DouyinCollectedWorkRecord[] = [];

    for (const item of items) {
      const aweme = this.asMeta(item.aweme_info);
      const author = this.asMeta(aweme.author);
      const statistics = this.asMeta(aweme.statistics);
      const music = this.asMeta(aweme.music);
      const workId = this.pickString(aweme, ["aweme_id"]);
      if (!workId) {
        continue;
      }

      const workType = this.deriveDouyinWorkType({}, aweme);
      const workUrl =
        this.normalizeDouyinShareUrl(this.pickString(aweme, ["share_url"]))
        || this.normalizeDouyinShareUrl(this.extractShareUrl(aweme))
        || this.normalizeDouyinNoteUrl(workId, workType);
      const metadata = this.buildDouyinVideoCacheMetadata({
        kind: "DOUYIN_SEARCH_WORK",
        sourceAccountId: normalizedKeyword,
        sourceAccountLink: "",
        workId,
        workUrl,
        workType,
        authorName: this.pickString(author, ["nickname"]) || undefined,
        authorUniqueId: this.pickString(author, ["unique_id"]) || undefined,
        externalUserId: this.pickString(author, ["uid"]) || undefined,
        coverUrl: this.extractDouyinCoverUrl(aweme) || undefined,
        imageList: this.extractDouyinImageList(aweme),
        videoUrl:
          this.extractFirstUrlFromObject(this.asMeta(aweme.video), "download_addr")
          || this.extractDouyinVideoUrl(aweme)
          || undefined,
        hashtags: this.extractDouyinHashtags(aweme),
        publishTimeText: this.formatUnixTimestampText(this.pickNumber(aweme, ["create_time"])),
        durationMs: this.pickNumber(this.asMeta(aweme.video), ["duration"]),
        mediaType: this.pickNumber(aweme, ["media_type"]),
        awemeType: this.pickNumber(aweme, ["aweme_type"]),
        musicTitle: this.pickString(music, ["title"]) || undefined,
        musicAuthor: this.pickString(music, ["author"]) || undefined,
        likeCount: this.pickNumber(statistics, ["digg_count"]),
        playCount: this.pickNumber(statistics, ["play_count"]),
        shareCount: this.pickNumber(statistics, ["share_count"]),
        commentCount: this.pickNumber(statistics, ["comment_count"]),
        collectCount: this.pickNumber(statistics, ["collect_count"]),
        recommendCount: this.pickNumber(statistics, ["recommend_count"]),
        likeCollectRatio: this.computeRatio(this.pickNumber(statistics, ["digg_count"]), this.pickNumber(statistics, ["collect_count"])),
        likeCommentRatio: this.computeRatio(this.pickNumber(statistics, ["digg_count"]), this.pickNumber(statistics, ["comment_count"])),
        shareRatio: this.computeRatio(this.pickNumber(statistics, ["share_count"]), this.pickNumber(statistics, ["play_count"])),
        authorFollowerCount: this.pickNumber(author, ["follower_count"]),
        authorLikedCount: this.pickNumber(author, ["total_favorited"]),
        authorAvatar: this.extractFirstUrlFromObject(author, "avatar_300x300") || this.extractFirstUrlFromObject(author, "avatar_medium") || undefined,
        collectedAt,
        rawFields: {
          keyword: normalizedKeyword,
          searchFilters: {
            sortType,
            publishTime,
            filterDuration,
            contentType,
          },
          item,
        },
      });
      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "DOUYIN_SEARCH_WORK",
        matchValue: workId,
        title: this.pickString(aweme, ["desc"]) || `抖音作品 ${workId}`,
        description: this.pickString(aweme, ["desc"]) || "",
        fileUrl: workUrl,
        metadata,
      });

      this.enqueueDouyinVideoCache(asset);
      rows.push(this.mapDouyinCollectedWork(asset, "DOUYIN_SEARCH_WORK"));
    }

    return rows;
  }

  private async collectAndStoreDouyinKeywordRecommendations(
    brandId: string,
    keyword?: string,
  ): Promise<DouyinKeywordRecommendationRecord[]> {
    const normalizedKeyword = String(keyword || "").trim();
    if (!normalizedKeyword) {
      throw new BadRequestException("请输入关键词后再提交关键词推荐。");
    }

    const raw = await this.fetchTikHubPost(
      "/api/v1/douyin/search/fetch_search_suggest",
      {
        keyword: normalizedKeyword,
      },
      brandId,
    );
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    const extra = this.asMeta(data.extra);
    const searchTime = this.formatUnixTimestampText(this.pickNumber(extra, ["now"])) || new Date().toISOString().replace("T", " ").slice(0, 19);
    const collectedAt = new Date().toISOString();
    const items = this.extractDouyinKeywordRecommendationItems(raw).slice(0, 20);
    const rows: DouyinKeywordRecommendationRecord[] = [];

    for (const [index, item] of items.entries()) {
      const wordRecord = this.asMeta(item.word_record);
      const queryRecord = this.asMeta(item.words_query_record);
      const recommendedKeyword =
        this.pickString(item, ["content"])
        || this.pickString(wordRecord, ["words_content"]);
      if (!recommendedKeyword) {
        continue;
      }

      const historyKey = `${normalizedKeyword}::${recommendedKeyword}::${collectedAt}::${index}`.toLowerCase();
      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "DOUYIN_KEYWORD_RECOMMENDATION",
        matchValue: historyKey,
        title: recommendedKeyword,
        description: `搜索关键词：${normalizedKeyword}`,
        metadata: {
          kind: "DOUYIN_KEYWORD_RECOMMENDATION",
          sourceAccountId: historyKey,
          searchKeyword: normalizedKeyword,
          recommendedKeyword,
          searchTime,
          collectedAt,
          queryId: this.pickString(queryRecord, ["query_id"]) || undefined,
          wordsSource: this.pickString(wordRecord, ["words_source"]) || this.pickString(queryRecord, ["words_source"]) || undefined,
          position: this.pickNumber(wordRecord, ["words_position"]),
          rawFields: {
            keyword: normalizedKeyword,
            item,
          },
        },
      });
      rows.push(this.mapDouyinKeywordRecommendation(asset));
    }

    return rows;
  }

  private async collectAndStoreSingleDouyinCommentData(
    brandId: string,
    request: { sourceUrl: string; cursor?: string },
  ): Promise<DouyinCommentCollectionResult> {
    const normalizedSourceUrl = String(request.sourceUrl || "").trim();
    const requestedCursor = String(request.cursor || "0").trim() || "0";
    if (!normalizedSourceUrl) {
      throw new BadRequestException("评论数据链接不能为空");
    }
    const sourceWorkId = this.normalizeDouyinAwemeId(normalizedSourceUrl);
    if (!sourceWorkId) {
      throw new BadRequestException(`评论数据链接缺少 aweme_id：${normalizedSourceUrl}`);
    }
    const sourceSecUserId = await this.resolveDouyinCommentSourceSecUserId(brandId, sourceWorkId, normalizedSourceUrl);
    if (!sourceSecUserId) {
      throw new BadRequestException(`评论数据结果缺少源作品作者 sec_user_id：${normalizedSourceUrl}`);
    }

    const raw = await this.fetchTikHub(
      "/api/v1/douyin/app/v3/fetch_video_comments",
      {
        aweme_id: sourceWorkId,
        cursor: requestedCursor,
        count: "20",
      },
      brandId,
    );
    const items = this.extractDouyinCommentItems(raw).slice(0, 20);
    const pageState = this.extractDouyinCommentPageState(raw, requestedCursor);
    const rows: DouyinCommentRecord[] = [];
    const sourceWorkUrl = this.normalizeDouyinShareUrl(normalizedSourceUrl) || this.normalizeDouyinNoteUrl(sourceWorkId, "短视频");
    const collectedAt = new Date().toISOString();

    for (const item of items) {
      const commentId = this.pickString(item, ["cid", "comment_id", "commentId"]);
      if (!commentId) {
        continue;
      }
      const user = this.asMeta(item.user);
      const commentUserSecUserId =
        this.pickString(user, ["sec_uid", "sec_user_id", "secUid"])
        || this.pickString(item, ["sec_uid", "sec_user_id", "secUid"]);
      if (!commentUserSecUserId) {
        continue;
      }
      const commentText = this.pickString(item, ["text", "comment_text", "content"]) || "";
      const metadata = {
        kind: "DOUYIN_COMMENT" as const,
        sourceAccountId: `${sourceWorkId}:${commentId}`,
        sourceWorkId,
        sourceWorkUrl,
        sourceSecUserId,
        commentId,
        commentText,
        commentTime: this.formatUnixTimestampText(this.pickNumber(item, ["create_time"])) || undefined,
        commentUserName:
          this.pickString(user, ["nickname", "nick_name", "user_name"])
          || this.pickString(item, ["nickname", "nick_name"])
          || undefined,
        commentUserSecUserId,
        commentUserProfileUrl: this.buildDouyinUserUrl(commentUserSecUserId),
        likeCount: this.pickNumber(item, ["digg_count", "like_count", "likeCount"]),
        replyCount: this.pickNumber(item, ["reply_comment_total", "reply_count", "replyCount"]),
        collectedAt,
        rawFields: {
          item,
        },
      };
      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "DOUYIN_COMMENT",
        matchValue: `${sourceWorkId}:${commentId}`,
        title: commentText || `抖音评论 ${commentId}`,
        description: `评论用户 sec_user_id：${commentUserSecUserId}`,
        fileUrl: sourceWorkUrl,
        metadata,
      });
      rows.push(this.mapDouyinComment(asset));
    }

    if (!rows.length) {
      throw new BadRequestException(`评论接口未返回包含 sec_user_id 的评论数据：${normalizedSourceUrl}`);
    }

    return {
      rows,
      page: {
        sourceUrl: normalizedSourceUrl,
        sourceWorkId,
        requestedCursor,
        nextCursor: pageState.nextCursor,
        hasMore: pageState.hasMore,
        fetchedCount: rows.length,
      },
    };
  }

  private normalizeDouyinCommentPageRequests(input: DouyinSyncInput) {
    const pageRequests = Array.isArray(input.commentPageRequests) ? input.commentPageRequests : [];
    if (pageRequests.length) {
      return this.limitCollectorBatch(
        pageRequests
          .map((item) => ({
            sourceUrl: String(item?.sourceUrl || "").trim(),
            cursor: String(item?.cursor || "0").trim() || "0",
          }))
          .filter((item) => Boolean(item.sourceUrl)),
        this.collectorCommentPageRequestLimit,
        "douyin comment page requests",
      );
    }
    return this.limitCollectorBatch(
      (input.commentSourceUrls ?? [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((sourceUrl) => ({
          sourceUrl,
          cursor: "0",
        })),
      this.collectorCommentPageRequestLimit,
      "douyin comment source urls",
    );
  }

  private async resolveDouyinCommentSourceSecUserId(
    brandId: string,
    workId: string,
    sourceUrl: string,
  ) {
    const directSecUserId = this.extractDouyinSecUserId(sourceUrl);
    if (directSecUserId) {
      return directSecUserId;
    }

    try {
      const detailRaw = await this.fetchTikHub("/api/v1/douyin/app/v3/fetch_one_video_v3", { aweme_id: workId }, brandId);
      const detail = this.extractDouyinAwemeDetail(detailRaw);
      const author = this.asMeta(detail.author);
      return this.pickString(author, ["sec_uid", "sec_user_id", "secUid"]) || "";
    } catch {
      return "";
    }
  }

  private extractDouyinCommentPageState(raw: unknown, fallbackCursor: string) {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    const nextCursor =
      this.readMetaString(data, "cursor")
      || this.readMetaString(data, "next_cursor")
      || this.readMetaString(data, "max_cursor")
      || this.readMetaString(payload, "cursor")
      || this.readMetaString(payload, "next_cursor")
      || this.readMetaString(payload, "max_cursor")
      || fallbackCursor;
    const hasMore =
      this.pickBoolean(data, ["has_more", "hasMore"])
      ?? this.pickBoolean(payload, ["has_more", "hasMore"])
      ?? false;
    return {
      nextCursor,
      hasMore,
    };
  }

  private async collectAndStoreSingleXhsCommentData(
    brandId: string,
    request: { sourceUrl: string; cursor?: string; index?: number },
  ): Promise<XhsCommentCollectionResult> {
    const normalizedSourceUrl = this.normalizeXhsShareText(String(request.sourceUrl || "").trim());
    const noteQuery = this.resolveXhsNoteQuery(normalizedSourceUrl);
    if (!noteQuery.noteId && !noteQuery.shareText) {
      throw new BadRequestException(`小红书作品链接或 note_id 无效：${request.sourceUrl}`);
    }

    const requestedCursor = String(request.cursor || "").trim();
    const requestedIndex = Number.isFinite(request.index) ? Number(request.index) : 0;
    const fallbackQuery = this.resolveXhsShareTextFallbackQuery(normalizedSourceUrl, noteQuery);
    let raw: unknown;
    try {
      raw = await this.fetchTikHub(
        "/api/v1/xiaohongshu/app_v2/get_note_comments",
        {
          note_id: noteQuery.noteId,
          share_text: noteQuery.shareText,
          cursor: requestedCursor,
          index: String(requestedIndex),
          sort_strategy: "default",
        },
        brandId,
      );
    } catch (error) {
      if (!fallbackQuery) {
        throw error;
      }
      raw = await this.fetchTikHub(
        "/api/v1/xiaohongshu/app_v2/get_note_comments",
        {
          note_id: fallbackQuery.noteId,
          share_text: fallbackQuery.shareText,
          cursor: requestedCursor,
          index: String(requestedIndex),
          sort_strategy: "default",
        },
        brandId,
      );
    }
    let items = this.extractXhsCommentItems(raw);
    if (!items.length && fallbackQuery) {
      raw = await this.fetchTikHub(
        "/api/v1/xiaohongshu/app_v2/get_note_comments",
        {
          note_id: fallbackQuery.noteId,
          share_text: fallbackQuery.shareText,
          cursor: requestedCursor,
          index: String(requestedIndex),
          sort_strategy: "default",
        },
        brandId,
      );
      items = this.extractXhsCommentItems(raw);
    }
    const pageState = this.extractXhsCommentPageState(raw, requestedCursor, requestedIndex);
    const noteId = this.pickString(raw, ["note_id", "noteId", "id"]) || noteQuery.noteId || this.extractNoteIdFromUrl(normalizedSourceUrl);
    const noteUrl =
      this.pickString(raw, ["note_url", "noteUrl", "share_url", "shareUrl"])
      || this.extractShareUrl(raw)
      || normalizedSourceUrl
      || (noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : request.sourceUrl);
    const rows: XhsCollectedCommentRecord[] = [];
    const collectedAt = new Date().toISOString();

    for (const item of items) {
      const commentId = this.pickString(item, ["comment_id", "commentId", "id"]);
      if (!commentId) {
        continue;
      }
      const user = this.asMeta(item.user_info);
      const commentText = this.pickString(item, ["content", "text", "comment_content"]) || "";
      const commentUserId =
        this.pickString(user, ["user_id", "userid", "id"])
        || this.pickString(item, ["user_id", "userid"])
        || undefined;
      const metadata = {
        kind: "XHS_NOTE_COMMENT" as const,
        sourceAccountId: `${noteId}:${commentId}`,
        noteId,
        noteUrl,
        sourceUrl: normalizedSourceUrl || noteUrl,
        commentId,
        commentText,
        commentTime:
          this.formatUnixTimestampText(this.pickNumber(item, ["create_time", "comment_time", "time"]))
          || this.pickString(item, ["create_time_text", "time", "create_time"]),
        commentUserName:
          this.pickString(user, ["nickname", "name"])
          || this.pickString(item, ["nickname", "user_name"])
          || undefined,
        commentUserId,
        commentUserProfileUrl: commentUserId ? this.buildXhsProfileUrl(commentUserId) : undefined,
        likeCount: this.pickNumber(item, ["like_count", "liked_count", "likes"]),
        replyCount: this.pickNumber(item, ["sub_comment_count", "reply_count", "replyCount"]),
        collectedAt,
        rawFields: item,
      };
      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_NOTE_COMMENT",
        matchValue: `${noteId}:${commentId}`,
        title: commentText || `小红书评论 ${commentId}`,
        description: metadata.commentUserName || "小红书评论采集",
        fileUrl: noteUrl,
        metadata,
      });
      rows.push(this.mapXhsComment(asset));
    }

    if (!rows.length) {
      throw new BadRequestException(`评论接口未返回有效评论数据：${request.sourceUrl}`);
    }

    return {
      rows,
      page: {
        sourceUrl: normalizedSourceUrl || noteUrl,
        noteId,
        requestedCursor,
        requestedIndex,
        nextCursor: pageState.nextCursor,
        nextIndex: pageState.nextIndex,
        hasMore: pageState.hasMore,
        fetchedCount: rows.length,
      },
    };
  }

  private normalizeXhsCommentPageRequests(input: XhsSyncInput) {
    const pageRequests = Array.isArray(input.pageRequests) ? input.pageRequests : [];
    if (pageRequests.length) {
      return this.limitCollectorBatch(
        pageRequests
          .map((item) => ({
            sourceUrl: this.normalizeXhsShareText(String(item?.sourceUrl || "").trim()),
            cursor: String(item?.cursor || "").trim(),
            index: Number.isFinite(item?.index) ? Number(item?.index) : 0,
          }))
          .filter((item) => Boolean(item.sourceUrl)),
        this.collectorCommentPageRequestLimit,
        "xhs comment page requests",
      );
    }

    return this.limitCollectorBatch(
      (input.sourceUrls ?? [])
        .map((item) => this.normalizeXhsShareText(String(item || "").trim()))
        .filter(Boolean)
        .map((sourceUrl) => ({
          sourceUrl,
          cursor: "",
          index: 0,
        })),
      this.collectorCommentPageRequestLimit,
      "xhs comment source urls",
    );
  }

  private extractXhsCommentPageState(raw: unknown, fallbackCursor: string, fallbackIndex: number) {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    const nested = this.asMeta(data.data);
    const cursorRecord = this.asMeta(nested.cursor);
    const nextCursor =
      this.readMetaString(nested, "cursor")
      || this.readMetaString(data, "cursor")
      || this.readMetaString(cursorRecord, "cursor")
      || fallbackCursor;
    const nextIndex =
      this.readMetaNumber(nested, "index")
      ?? this.readMetaNumber(data, "index")
      ?? this.readMetaNumber(cursorRecord, "index")
      ?? fallbackIndex;
    const hasMore =
      this.pickBoolean(nested, ["has_more", "hasMore"])
      ?? this.pickBoolean(data, ["has_more", "hasMore"])
      ?? (nextIndex > fallbackIndex)
      ?? Boolean(nextCursor && nextCursor !== fallbackCursor);
    return {
      nextCursor,
      nextIndex,
      hasMore,
    };
  }

  private async collectXhsSubComments(
    brandId: string,
    input: { sourceUrl?: string; commentId?: string; cursor?: string; index?: number },
  ) {
    const sourceUrl = this.normalizeXhsShareText(String(input.sourceUrl || "").trim());
    const commentId = String(input.commentId || "").trim();
    if (!commentId) {
      throw new BadRequestException("一级评论 ID 不能为空");
    }
    const noteQuery = this.resolveXhsNoteQuery(sourceUrl);
    if (!noteQuery.noteId && !noteQuery.shareText) {
      throw new BadRequestException(`小红书作品链接或 note_id 无效：${input.sourceUrl}`);
    }

    const requestedCursor = String(input.cursor || "").trim();
    const requestedIndex = Number.isFinite(input.index) ? Number(input.index) : 1;
    const fallbackQuery = this.resolveXhsShareTextFallbackQuery(sourceUrl, noteQuery);
    let raw: unknown;
    try {
      raw = await this.fetchTikHub(
        "/api/v1/xiaohongshu/app_v2/get_note_sub_comments",
        {
          note_id: noteQuery.noteId,
          share_text: noteQuery.shareText,
          comment_id: commentId,
          cursor: requestedCursor,
          index: String(requestedIndex),
        },
        brandId,
      );
    } catch (error) {
      if (!fallbackQuery) {
        throw error;
      }
      raw = await this.fetchTikHub(
        "/api/v1/xiaohongshu/app_v2/get_note_sub_comments",
        {
          note_id: fallbackQuery.noteId,
          share_text: fallbackQuery.shareText,
          comment_id: commentId,
          cursor: requestedCursor,
          index: String(requestedIndex),
        },
        brandId,
      );
    }
    const noteId = this.pickString(raw, ["note_id", "noteId", "id"]) || noteQuery.noteId || this.extractNoteIdFromUrl(sourceUrl);
    const noteUrl =
      this.pickString(raw, ["note_url", "noteUrl", "share_url", "shareUrl"])
      || this.extractShareUrl(raw)
      || sourceUrl
      || (noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : "");
    let items = this.extractXhsCommentItems(raw);
    if (!items.length && fallbackQuery) {
      raw = await this.fetchTikHub(
        "/api/v1/xiaohongshu/app_v2/get_note_sub_comments",
        {
          note_id: fallbackQuery.noteId,
          share_text: fallbackQuery.shareText,
          comment_id: commentId,
          cursor: requestedCursor,
          index: String(requestedIndex),
        },
        brandId,
      );
      items = this.extractXhsCommentItems(raw);
    }
    const pageState = this.extractXhsCommentPageState(raw, requestedCursor, requestedIndex);
    return {
      items: items
        .map((item, index) => this.mapXhsSubCommentItem(item, {
          parentCommentId: commentId,
          noteId,
          noteUrl,
          sourceUrl: sourceUrl || noteUrl,
          fallbackIndex: index,
        }))
        .filter((item): item is XhsSubCommentRecord => item !== null),
      pagination: {
        parentCommentId: commentId,
        nextCursor: pageState.nextCursor,
        nextIndex: pageState.nextIndex,
        hasMore: pageState.hasMore,
        fetchedCount: items.length,
      },
    };
  }

  private async collectAndStoreBenchmarkNote(brandId: string, sourceUrl: string): Promise<XhsCollectedNoteRecord> {
    const collectedAt = new Date().toISOString();
    const noteQuery = this.resolveXhsNoteQuery(sourceUrl);
    if (!noteQuery.noteId && !noteQuery.shareText) {
      throw new BadRequestException(`小红书作品链接或 note_id 无效：${sourceUrl}`);
    }
    const raw = await this.fetchTikHub(
      "/api/v1/xiaohongshu/app_v2/get_image_note_detail",
      {
        note_id: noteQuery.noteId,
        share_text: noteQuery.shareText,
      },
      brandId,
    );

    const noteId = this.pickString(raw, ["note_id", "noteId", "id"]) || noteQuery.noteId || this.extractNoteIdFromUrl(sourceUrl);
    const noteUrl =
      this.pickString(raw, ["note_url", "noteUrl", "share_url", "shareUrl"])
      || this.extractShareUrl(raw)
      || this.normalizeXhsShareText(sourceUrl)
      || (noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : sourceUrl);
    const title = this.pickString(raw, ["title", "name"]) || `小红书作品 ${noteId || sourceUrl}`;
    const description = this.pickString(raw, ["desc", "description", "content", "text"]) || "";
    const likeCount = this.pickNumber(raw, ["likes", "liked_count", "like_count", "likedCount", "digg_count"]);
    const collectCount = this.pickNumber(raw, ["collected_count", "collect_count", "collectedCount", "collect_num"]);
    const shareCount = this.pickNumber(raw, ["share_count", "shareCount", "shared_count", "share_num"]);
    const commentCount = this.pickNumber(raw, ["comments_count", "comment_count", "commentCount", "comment_num"]);
    const imageList = this.extractXhsImageList(raw);
    const videoUrl = this.extractXhsVideoUrl(raw);
    const noteType = this.pickString(raw, ["type", "note_type"]);
    const nickname = this.pickString(raw, ["nickname", "user_name", "author_name"]);
    const externalUserId = this.pickString(raw, ["userid", "user_id", "userId", "author_id"]);
    const createdAtText = this.pickString(raw, ["create_time", "time", "publish_time"]);
    const cachedMedia = await this.cacheXhsNoteMediaBundle(brandId, noteId || sourceUrl, imageList, videoUrl);

    const asset = await this.upsertCollectorAsset({
      brandId,
      kind: "XHS_BENCHMARK_NOTE",
      matchValue: noteId || sourceUrl,
      title,
      description,
      fileUrl: noteUrl,
      metadata: {
        kind: "XHS_BENCHMARK_NOTE",
        sourceUrl,
        sourceAccountId: externalUserId || "",
        noteId,
        noteUrl,
        noteType,
        nickname,
        imageList: cachedMedia.imageList,
        imageSourceList: imageList,
        externalUserId,
        likeCount,
        collectCount,
        createdAtText,
        shareCount,
        commentCount,
        likeCollectRatio: this.computeRatio(likeCount, collectCount),
        likeCommentRatio: this.computeRatio(likeCount, commentCount),
        shareRatio: this.computeRatio(shareCount, likeCount),
        videoUrl: cachedMedia.videoUrl,
        videoSourceUrl: videoUrl,
        collectedAt,
        syncStatus: "SUCCESS",
        retryCount: 0,
        nextRetryAt: "",
        lastError: "",
        rawFields: this.asMeta(raw),
      },
    });

    return this.mapCollectedNote(asset);
  }

  private async collectAndStoreSearchNotes(brandId: string, keyword: string): Promise<XhsCollectedNoteRecord[]> {
    const normalizedKeyword = String(keyword || "").trim();
    if (!normalizedKeyword) {
      throw new BadRequestException("搜索关键词不能为空");
    }

    const raw = await this.fetchTikHub(
      "/api/v1/xiaohongshu/app_v2/search_notes",
      {
        keyword: normalizedKeyword,
        page: "1",
        sort_type: "general",
        note_type: "不限",
        time_filter: "不限",
        source: "explore_feed",
        ai_mode: "0",
      },
      brandId,
    );

    const collectedAt = new Date().toISOString();
    const noteItems = this.extractNoteItems(raw);
    const rows: XhsCollectedNoteRecord[] = [];

    for (const item of noteItems) {
      const noteId = this.pickString(item, ["note_id", "noteId", "id"]);
      if (!noteId) {
        continue;
      }

      const noteUrl =
        this.pickString(item, ["note_url", "noteUrl", "share_url", "shareUrl"])
        || this.extractShareUrl(item)
        || `https://www.xiaohongshu.com/explore/${noteId}`;
      const title = this.pickString(item, ["title", "name"]) || `小红书搜索笔记 ${noteId}`;
      const description = this.pickString(item, ["desc", "description", "content", "text"]) || "";
      const likeCount = this.pickNumber(item, ["likes", "liked_count", "like_count", "likedCount", "digg_count"]);
      const collectCount = this.pickNumber(item, ["collected_count", "collect_count", "collectedCount", "collect_num"]);
      const shareCount = this.pickNumber(item, ["share_count", "shareCount", "shared_count", "share_num"]);
      const commentCount = this.pickNumber(item, ["comments_count", "comment_count", "commentCount", "comment_num"]);
      const noteType = this.pickString(item, ["type", "note_type"]);
      const nickname = this.pickString(item, ["nickname", "user_name", "author_name"]);
      const imageList = this.extractXhsImageList(item);
      const externalUserId = this.pickString(item, ["userid", "user_id", "userId", "author_id"]);
      const createdAtText = this.pickString(item, ["create_time", "time", "publish_time"]);
      const videoUrl = this.extractXhsVideoUrl(item);
      const cachedMedia = await this.cacheXhsNoteMediaBundle(brandId, noteId, imageList, videoUrl);

      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_SEARCH_NOTE",
        matchValue: noteId,
        title,
        description,
        fileUrl: noteUrl,
        metadata: {
          kind: "XHS_SEARCH_NOTE",
          sourceKeyword: normalizedKeyword,
          sourceAccountId: externalUserId || "",
          noteId,
          noteUrl,
          noteType,
          nickname,
          imageList: cachedMedia.imageList,
          imageSourceList: imageList,
          externalUserId,
          likeCount,
          collectCount,
          createdAtText,
          shareCount,
          commentCount,
          likeCollectRatio: this.computeRatio(likeCount, collectCount),
          likeCommentRatio: this.computeRatio(likeCount, commentCount),
          shareRatio: this.computeRatio(shareCount, likeCount),
          videoUrl: cachedMedia.videoUrl,
          videoSourceUrl: videoUrl,
          collectedAt,
          syncStatus: "SUCCESS",
          retryCount: 0,
          nextRetryAt: "",
          lastError: "",
          rawFields: this.asMeta(item),
        },
      });

      rows.push(this.mapCollectedNote(asset));
    }

    return rows;
  }

  private async collectAndStoreTargetUsersFromComments(
    brandId: string,
    sourceUrls: string[],
    matchKeywords: string[],
  ): Promise<{ rows: XhsCollectedTargetUserRecord[]; warnings: string[] }> {
    const assets = await this.listCollectorAssets(brandId);
    const noteTitleById = new Map<string, string>();
    for (const asset of assets) {
      const meta = this.asMeta(asset.metadataJson);
      const kind = this.readMetaString(meta, "kind");
      if (kind !== "XHS_BRAND_NOTE" && kind !== "XHS_BENCHMARK_NOTE" && kind !== "XHS_SEARCH_NOTE") {
        continue;
      }
      const noteId = this.readMetaString(meta, "noteId");
      if (noteId && !noteTitleById.has(noteId)) {
        noteTitleById.set(noteId, asset.title);
      }
    }

    const rows: XhsCollectedTargetUserRecord[] = [];
    const warnings: string[] = [];
    const emittedKeys = new Set<string>();

    for (const sourceUrl of sourceUrls) {
      const noteQuery = this.resolveXhsNoteQuery(sourceUrl);
      const noteId = noteQuery.noteId || this.extractNoteIdFromUrl(sourceUrl);
      const matchedComments = assets
        .filter((asset) => this.readMetaString(this.asMeta(asset.metadataJson), "kind") === "XHS_NOTE_COMMENT")
        .map((asset) => this.mapXhsComment(asset))
        .filter((item) =>
          (noteId && item.noteId === noteId)
          || item.sourceUrl === sourceUrl
          || item.noteUrl === sourceUrl,
        );

      if (!matchedComments.length) {
        warnings.push(`小红书作品 ${sourceUrl} 还没有可用于提取目标用户的评论数据`);
        continue;
      }

      const emittedBefore = rows.length;
      for (const comment of matchedComments) {
        const commentUserId = String(comment.commentUserId || "").trim();
        if (!commentUserId) {
          continue;
        }
        const matchedKeyword = this.matchCommentKeyword(
          [comment.commentText, comment.commentUserName, comment.commentUserId],
          matchKeywords,
        );
        if (matchKeywords.length && !matchedKeyword) {
          continue;
        }

        const identity = `${sourceUrl}:${commentUserId}`;
        if (emittedKeys.has(identity)) {
          continue;
        }

        const collectedAt = new Date().toISOString();
        const asset = await this.upsertTargetAsset({
          kind: "XHS_TARGET_USER",
          brandId,
          matchValue: identity,
          title: comment.commentUserName || `小红书用户 ${commentUserId}`,
          description: noteId ? `来自笔记 ${noteId} 的评论匹配` : "来自评论匹配",
          metadata: {
            kind: "XHS_TARGET_USER",
            sourceAccountId: identity,
            sourceUrl,
            profileUrl: comment.commentUserProfileUrl || this.buildXhsProfileUrl(commentUserId),
            userId: commentUserId,
            noteTitle: noteId ? noteTitleById.get(noteId) : undefined,
            sourceCommentId: comment.commentId,
            commentText: comment.commentText,
            matchedKeyword: matchedKeyword || undefined,
            collectedAt,
            syncStatus: "SUCCESS",
            retryCount: 0,
          },
        });
        rows.push(this.mapCollectedTargetUser(asset));
        emittedKeys.add(identity);
      }

      if (rows.length === emittedBefore) {
        warnings.push(
          matchKeywords.length
            ? `小红书作品 ${sourceUrl} 的评论里没有命中关键词的目标用户`
            : `小红书作品 ${sourceUrl} 的评论里没有可提取主页链接的用户`,
        );
      }
    }

    return { rows, warnings };
  }

  private async collectAndStoreDouyinTargetUsersFromComments(
    brandId: string,
    sourceUrls: string[],
    matchKeywords: string[],
  ): Promise<{ rows: DouyinCollectedTargetUserRecord[]; warnings: string[] }> {
    const assets = await this.listCollectorAssets(brandId);
    const workTitleById = new Map<string, string>();
    for (const asset of assets) {
      const meta = this.asMeta(asset.metadataJson);
      const kind = this.readMetaString(meta, "kind");
      if (
        kind !== "DOUYIN_BRAND_WORK"
        && kind !== "DOUYIN_COMPETITOR_WORK"
        && kind !== "DOUYIN_BENCHMARK_WORK"
        && kind !== "DOUYIN_SEARCH_WORK"
      ) {
        continue;
      }
      const workId = this.readMetaString(meta, "workId");
      if (workId && !workTitleById.has(workId)) {
        workTitleById.set(workId, asset.title);
      }
    }

    const rows: DouyinCollectedTargetUserRecord[] = [];
    const warnings: string[] = [];
    const emittedKeys = new Set<string>();

    for (const sourceUrl of sourceUrls) {
      const workId = this.normalizeDouyinAwemeId(sourceUrl);
      const matchedComments = assets
        .filter((asset) => this.readMetaString(this.asMeta(asset.metadataJson), "kind") === "DOUYIN_COMMENT")
        .map((asset) => this.mapDouyinComment(asset))
        .filter((item) =>
          (workId && item.sourceWorkId === workId)
          || item.sourceWorkUrl === sourceUrl,
        );

      if (!matchedComments.length) {
        warnings.push(`抖音作品 ${sourceUrl} 还没有可用于提取目标用户的评论数据`);
        continue;
      }

      const emittedBefore = rows.length;
      for (const comment of matchedComments) {
        const secUserId = String(comment.commentUserSecUserId || "").trim();
        if (!secUserId) {
          continue;
        }
        const matchedKeyword = this.matchCommentKeyword(
          [comment.commentText, comment.commentUserName, comment.commentUserSecUserId],
          matchKeywords,
        );
        if (matchKeywords.length && !matchedKeyword) {
          continue;
        }

        const identity = `${sourceUrl}:${secUserId}`;
        if (emittedKeys.has(identity)) {
          continue;
        }

        const collectedAt = new Date().toISOString();
        const asset = await this.upsertTargetAsset({
          kind: "DOUYIN_TARGET_USER",
          brandId,
          matchValue: identity,
          title: comment.commentUserName || `抖音用户 ${secUserId}`,
          description: workId ? `来自作品 ${workId} 的评论匹配` : "来自评论匹配",
          metadata: {
            kind: "DOUYIN_TARGET_USER",
            sourceAccountId: identity,
            sourceUrl,
            profileUrl: comment.commentUserProfileUrl || this.buildDouyinUserUrl(secUserId),
            secUserId,
            workTitle: workId ? workTitleById.get(workId) : undefined,
            sourceCommentId: comment.commentId,
            commentText: comment.commentText,
            matchedKeyword: matchedKeyword || undefined,
            collectedAt,
            syncStatus: "SUCCESS",
            retryCount: 0,
          },
        });
        rows.push(this.mapDouyinTargetUser(asset));
        emittedKeys.add(identity);
      }

      if (rows.length === emittedBefore) {
        warnings.push(
          matchKeywords.length
            ? `抖音作品 ${sourceUrl} 的评论里没有命中关键词的目标用户`
            : `抖音作品 ${sourceUrl} 的评论里没有可提取主页链接的用户`,
        );
      }
    }

    return { rows, warnings };
  }

  private normalizeCommentMatchKeywords(values?: string[]) {
    return Array.from(
      new Set(
        (values ?? [])
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
  }

  private matchCommentKeyword(fields: Array<string | undefined>, keywords: string[]) {
    if (!keywords.length) {
      return "";
    }
    const normalizedFields = fields
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (normalizedFields.some((field) => field.includes(normalizedKeyword))) {
        return keyword;
      }
    }
    return "";
  }

  private async collectAndStoreDailyHotspotPlatform(
    brandId: string,
    config: DailyHotspotConfig,
  ): Promise<DailyHotspotPlatformRecord> {
    const collectedAt = new Date().toISOString();
    const snapshotDate = this.getLocalDateString();

    try {
      const raw = await this.fetchTikHub(config.path, {}, brandId);
      const items = this.extractDailyHotspotItems(raw, config.platformKey)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 20);
      const updateTime = this.extractDailyHotspotUpdateTime(raw);
      const asset = await this.upsertDailyHotspotAsset({
        brandId,
        config,
        metadata: {
          kind: "DAILY_HOTSPOT_PLATFORM",
          platformKey: config.platformKey,
          snapshotDate,
          boardType: config.boardType,
          sourceLink: config.sourceLink,
          total: items.length,
          updateTime,
          fromCache: this.pickBoolean(raw, ["from_cache", "is_cache", "cache"]),
          collectedAt,
          syncStatus: "SUCCESS",
          lastError: undefined,
          items,
          raw,
        },
      });

      return this.mapDailyHotspotPlatform(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : "热点采集失败";
      const existing = await this.findDailyHotspotAsset(brandId, config.platformKey, snapshotDate);
      if (existing) {
        const meta = this.asMeta(existing.metadataJson);
        const existingStatus = (this.readMetaString(meta, "syncStatus") as DailyHotspotSyncStatus) || "IDLE";
        if (existingStatus === "SUCCESS") {
          this.logger.warn(`每日热点采集失败，保留既有成功快照: ${brandId} / ${config.platformKey} / ${snapshotDate} - ${message}`);
          return this.mapDailyHotspotPlatform(existing);
        }
      }
      const asset = await this.upsertDailyHotspotAsset({
        brandId,
        config,
        metadata: {
          kind: "DAILY_HOTSPOT_PLATFORM",
          platformKey: config.platformKey,
          snapshotDate,
          boardType: config.boardType,
          sourceLink: config.sourceLink,
          total: 0,
          updateTime: undefined,
          fromCache: false,
          collectedAt,
          syncStatus: "FAILED",
          lastError: message,
          items: [],
        },
      });

      return this.mapDailyHotspotPlatform(asset);
    }
  }

  private async upsertCollectorAsset(params: {
    brandId: string;
    kind: CollectorAssetKind;
    matchValue: string;
    title: string;
    description: string;
    fileUrl?: string;
    metadata: Record<string, unknown>;
  }): Promise<AssetRecord> {
    const { brandId, kind, matchValue, title, description, fileUrl, metadata } = params;
    const sourceTableId = this.readMetaString(metadata, "sourceTableId");
    const sourceRecordId = this.readMetaString(metadata, "sourceRecordId");

    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });

      const matchedItems = existing.filter((item) => {
        const meta = this.asMeta(item.metadataJson);
        if (
          sourceTableId
          && sourceRecordId
          && meta.kind === kind
          && this.readMetaString(meta, "sourceTableId") === sourceTableId
          && this.readMetaString(meta, "sourceRecordId") === sourceRecordId
        ) {
          return true;
        }
        if (kind === "XHS_BRAND_NOTE" || kind === "XHS_BENCHMARK_NOTE" || kind === "XHS_SEARCH_NOTE") {
          return meta.kind === kind && this.readMetaString(meta, "noteId") === matchValue;
        }
        if (this.isDouyinWorkKind(kind)) {
          return meta.kind === kind && this.readMetaString(meta, "workId") === matchValue;
        }
      if (kind === "XHS_TARGET_USER" || kind === "DOUYIN_TARGET_USER") {
        return this.isSameCollectorTargetAssetIdentity(meta, kind, matchValue, metadata);
        }
        if (this.isXhsAccountKind(kind)) {
          return this.isSameXhsAccountAssetIdentity(meta, item.fileUrl ?? undefined, kind, matchValue, fileUrl, metadata);
        }
        if (kind === "WECHAT_MP_ARTICLE") {
          return meta.kind === kind && this.readMetaString(meta, "articleId") === matchValue;
        }
        if (kind === "WECHAT_MP_BENCHMARK_ARTICLE") {
          return meta.kind === kind
            && (
              this.readMetaString(meta, "articleId") === matchValue
              || (Boolean(fileUrl) && (this.readMetaString(meta, "url") === fileUrl || item.fileUrl === fileUrl))
            );
        }
        if (kind === "WECHAT_SEARCH_ITEM") {
          return meta.kind === kind && this.readMetaString(meta, "itemId") === matchValue;
        }
        return meta.kind === kind && this.readMetaString(meta, "sourceAccountId") === matchValue;
      });
      const [matched, ...duplicateMatches] = matchedItems;

      if (duplicateMatches.length) {
        await this.prismaService.businessAsset.deleteMany({
          where: {
            id: { in: duplicateMatches.map((item) => item.id) },
          },
        });
      }

      if (matched) {
        const updated = await this.prismaService.businessAsset.update({
          where: { id: matched.id },
          data: {
            title,
            description,
            fileUrl,
            metadataJson: metadata as Prisma.InputJsonValue,
          },
        });

        return {
          id: updated.id,
          brandId: updated.brandId,
          category: "PLATFORM_EXPORT",
          title: updated.title,
          description: updated.description ?? "",
          sourceName: "小红书采集",
          fileUrl: updated.fileUrl ?? undefined,
          metadataJson: this.asMeta(updated.metadataJson),
        };
      }

      const created = await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
          title,
          description,
          fileUrl,
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });

      return {
        id: created.id,
        brandId: created.brandId,
        category: "PLATFORM_EXPORT",
        title: created.title,
        description: created.description ?? "",
        sourceName: "小红书采集",
        fileUrl: created.fileUrl ?? undefined,
        metadataJson: this.asMeta(created.metadataJson),
      };
    }

    const index = database.assets.findIndex((item) => {
      const meta = this.asMeta(item.metadataJson);
      if (
        sourceTableId
        && sourceRecordId
        && item.brandId === brandId
        && meta.kind === kind
        && this.readMetaString(meta, "sourceTableId") === sourceTableId
        && this.readMetaString(meta, "sourceRecordId") === sourceRecordId
      ) {
        return true;
      }
      if (kind === "XHS_BRAND_NOTE" || kind === "XHS_BENCHMARK_NOTE" || kind === "XHS_SEARCH_NOTE") {
        return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "noteId") === matchValue;
      }
      if (this.isDouyinWorkKind(kind)) {
        return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "workId") === matchValue;
      }
      if (kind === "XHS_TARGET_USER" || kind === "DOUYIN_TARGET_USER") {
        return item.brandId === brandId && this.isSameCollectorTargetAssetIdentity(meta, kind, matchValue, metadata);
      }
      if (this.isXhsAccountKind(kind)) {
        return item.brandId === brandId
          && this.isSameXhsAccountAssetIdentity(meta, item.fileUrl, kind, matchValue, fileUrl, metadata);
      }
      if (kind === "WECHAT_MP_ARTICLE") {
        return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "articleId") === matchValue;
      }
      if (kind === "WECHAT_MP_BENCHMARK_ARTICLE") {
        return item.brandId === brandId
          && meta.kind === kind
          && (
            this.readMetaString(meta, "articleId") === matchValue
            || (Boolean(fileUrl) && (this.readMetaString(meta, "url") === fileUrl || item.fileUrl === fileUrl))
          );
      }
      if (kind === "WECHAT_SEARCH_ITEM") {
        return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "itemId") === matchValue;
      }
      return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "sourceAccountId") === matchValue;
    });

    const asset: AssetRecord = {
      id: index >= 0 ? database.assets[index].id : createId("ast"),
      brandId,
      category: "PLATFORM_EXPORT",
      title,
      description,
      sourceName: "小红书采集",
      fileUrl,
      metadataJson: metadata,
    };

    if (index >= 0) {
      database.assets[index] = asset;
    } else {
      database.assets.unshift(asset);
    }

    return asset;
  }

  private async deleteCollectorAssetById(brandId: string, assetId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.businessAsset.deleteMany({
        where: {
          id: assetId,
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });
      return;
    }

    database.assets = database.assets.filter((item) => !(item.id === assetId && item.brandId === brandId && item.category === "PLATFORM_EXPORT"));
  }

  private async cleanupDuplicateCollectorAssets(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
      const duplicateIds = this.collectDuplicateCollectorAssetIds(
        assets.map((item) => ({
          id: item.id,
          brandId: item.brandId,
          category: "PLATFORM_EXPORT" as const,
          title: item.title,
          description: item.description ?? "",
          sourceName: "小红书采集",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        })),
      );
      if (duplicateIds.length) {
        await this.prismaService.businessAsset.deleteMany({
          where: {
            id: { in: duplicateIds },
          },
        });
      }
      return duplicateIds.length;
    }

    const duplicateIds = new Set(
      this.collectDuplicateCollectorAssetIds(
        database.assets.filter((item) => item.brandId === brandId && item.category === "PLATFORM_EXPORT"),
      ),
    );
    if (!duplicateIds.size) {
      return 0;
    }

    database.assets = database.assets.filter((item) => !duplicateIds.has(item.id));
    return duplicateIds.size;
  }

  private async clearExistingXiaohongshuCollectorAssets(brandId: string) {
    const collectorKinds = new Set<CollectorAssetKind | CollectorTargetKind>([
      "XHS_BRAND_ACCOUNT",
      "XHS_COMPETITOR_ACCOUNT",
      "XHS_BRAND_NOTE",
      "XHS_BENCHMARK_NOTE",
      "XHS_TARGET_USER",
    ]);

    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        select: {
          id: true,
          metadataJson: true,
        },
      });
      const assetIds = assets
        .filter((item) => collectorKinds.has(this.readMetaString(this.asMeta(item.metadataJson), "kind") as CollectorAssetKind | CollectorTargetKind))
        .map((item) => item.id);
      if (!assetIds.length) {
        return 0;
      }
      const result = await this.prismaService.businessAsset.deleteMany({
        where: {
          id: { in: assetIds },
        },
      });
      return result.count;
    }

    const initialSize = database.assets.length;
    database.assets = database.assets.filter((item) => {
      if (item.brandId !== brandId || item.category !== "PLATFORM_EXPORT") {
        return true;
      }
      const kind = this.readMetaString(this.asMeta(item.metadataJson), "kind");
      return !collectorKinds.has(kind as CollectorAssetKind | CollectorTargetKind);
    });
    return initialSize - database.assets.length;
  }

  private collectDuplicateCollectorAssetIds(assets: AssetRecord[]) {
    const seenKeys = new Set<string>();
    const duplicateIds: string[] = [];

    for (const asset of assets) {
      const duplicateKey = this.buildCollectorDuplicateKey(asset);
      if (!duplicateKey) {
        continue;
      }
      if (seenKeys.has(duplicateKey)) {
        duplicateIds.push(asset.id);
        continue;
      }
      seenKeys.add(duplicateKey);
    }

    duplicateIds.push(...this.collectLegacyBenchmarkAvatarAssetIds(assets));
    return duplicateIds;
  }

  private collectLegacyBenchmarkAvatarAssetIds(assets: AssetRecord[]) {
    const benchmarkAssets = assets.filter((asset) => {
      const kind = this.readMetaString(this.asMeta(asset.metadataJson), "kind");
      return kind === "XHS_BENCHMARK_NOTE" || kind === "XHS_SEARCH_NOTE";
    });
    const validTitles = new Set(
      benchmarkAssets
        .filter((asset) => this.isRealXiaohongshuNoteUrl(this.readBenchmarkAssetUrl(asset)))
        .map((asset) => asset.title.trim())
        .filter(Boolean),
    );

    return benchmarkAssets
      .filter((asset) => {
        const url = this.readBenchmarkAssetUrl(asset);
        const noteId = this.readMetaString(this.asMeta(asset.metadataJson), "noteId");
        return (
          validTitles.has(asset.title.trim())
          && (this.isAvatarCdnUrl(url) || (noteId.startsWith("rec") && !this.isRealXiaohongshuNoteUrl(url)))
        );
      })
      .map((asset) => asset.id);
  }

  private buildCollectorDuplicateKey(asset: AssetRecord) {
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (!kind) {
      return "";
    }

    const sourceTableId = this.readMetaString(meta, "sourceTableId");
    const sourceRecordId = this.readMetaString(meta, "sourceRecordId");
    if (sourceTableId && sourceRecordId) {
      return `${kind}:feishu:${sourceTableId}:${sourceRecordId}`;
    }

    if (kind === "XHS_BRAND_NOTE") {
      const normalizedContent = this.resolveCollectorContentDuplicateKey(asset.title, asset.description);
      if (normalizedContent) {
        return `${kind}:content:${normalizedContent}`;
      }
      const noteId = this.readMetaString(meta, "noteId");
      if (noteId) {
        return `${kind}:note:${noteId}`;
      }
    }

    if (kind === "XHS_BENCHMARK_NOTE" || kind === "XHS_SEARCH_NOTE") {
      const noteId = this.readMetaString(meta, "noteId");
      if (noteId) {
        return `${kind}:note:${noteId}`;
      }
    }

    if (kind === "XHS_TARGET_USER" || kind === "DOUYIN_TARGET_USER") {
      const sourceAccountId = this.readMetaString(meta, "sourceAccountId");
      if (sourceAccountId) {
        return `${kind}:target:${sourceAccountId}`;
      }
      const sourceUrl = this.readMetaString(meta, "sourceUrl");
      const userId = this.readMetaString(meta, "userId") || this.readMetaString(meta, "secUserId");
      if (sourceUrl || userId) {
        return `${kind}:target:${sourceUrl}:${userId}`;
      }
    }

    if (kind === "XHS_BRAND_ACCOUNT" || kind === "XHS_COMPETITOR_ACCOUNT") {
      const accountIdentityKeys = this.collectXhsAccountIdentityKeys(
        kind as CollectorAssetKind,
        this.readMetaString(meta, "sourceAccountId"),
        asset.fileUrl,
        meta,
      );
      if (accountIdentityKeys.length) {
        return `${kind}:account:${accountIdentityKeys[0]}`;
      }
    }

    if (kind === "DOUYIN_KEYWORD_RECOMMENDATION") {
      const sourceAccountId = this.readMetaString(meta, "sourceAccountId");
      if (sourceAccountId) {
        return `${kind}:keyword:${sourceAccountId}`;
      }
    }

    if (kind === "DOUYIN_BRAND_WORK" || kind === "DOUYIN_COMPETITOR_WORK") {
      const normalizedContent = this.resolveCollectorContentDuplicateKey(asset.title, asset.description);
      if (normalizedContent) {
        return `${kind}:content:${normalizedContent}`;
      }
      const workId = this.readMetaString(meta, "workId");
      if (workId) {
        return `${kind}:work:${workId}`;
      }
    }

    return "";
  }

  private dedupeCollectorRecordsByContent<T extends { id: string; title: string; description?: string }>(items: T[]) {
    const deduped = new Map<string, T>();
    for (const item of items) {
      const duplicateKey = this.resolveCollectorContentDuplicateKey(item.title, item.description) || item.id;
      if (!deduped.has(duplicateKey)) {
        deduped.set(duplicateKey, item);
      }
    }
    return Array.from(deduped.values());
  }

  private isXhsAccountKind(kind: CollectorAssetKind) {
    return kind === "XHS_BRAND_ACCOUNT" || kind === "XHS_COMPETITOR_ACCOUNT";
  }

  private normalizeCollectorTitle(title: string | undefined) {
    const normalized = String(title || "").trim().toLowerCase();
    return normalized || "";
  }

  private resolveCollectorContentDuplicateKey(title: string | undefined, description: string | undefined) {
    const normalizedDescription = this.normalizeCollectorTitle(description);
    if (normalizedDescription) {
      return normalizedDescription;
    }
    return this.normalizeCollectorTitle(title);
  }

  private isSameXhsAccountAssetIdentity(
    existingMeta: Record<string, unknown>,
    existingFileUrl: string | undefined,
    kind: CollectorAssetKind,
    matchValue: string,
    fileUrl: string | undefined,
    metadata: Record<string, unknown>,
  ) {
    if (!this.isXhsAccountKind(kind)) {
      return false;
    }
    if (this.readMetaString(existingMeta, "kind") !== kind) {
      return false;
    }
    const nextKeys = new Set(this.collectXhsAccountIdentityKeys(kind, matchValue, fileUrl, metadata));
    if (!nextKeys.size) {
      return false;
    }
    const existingKeys = this.collectXhsAccountIdentityKeys(
      kind,
      this.readMetaString(existingMeta, "sourceAccountId"),
      existingFileUrl,
      existingMeta,
    );
    return existingKeys.some((key) => nextKeys.has(key));
  }

  private collectXhsAccountIdentityKeys(
    kind: CollectorAssetKind,
    matchValue: string,
    fileUrl: string | undefined,
    metadata: Record<string, unknown>,
  ) {
    if (!this.isXhsAccountKind(kind)) {
      return [];
    }

    const keys = new Set<string>();
    const push = (prefix: string, value: string) => {
      const normalized = String(value || "").trim();
      if (!normalized) {
        return;
      }
      keys.add(`${prefix}:${normalized.toLowerCase()}`);
    };

    push("source", matchValue);
    push("source", this.readMetaString(metadata, "sourceAccountId"));

    const externalUserId = this.readMetaString(metadata, "externalUserId");
    push("user", externalUserId);

    const accountLink = this.readMetaString(metadata, "sourceAccountLink") || fileUrl || "";
    const normalizedLocator = this.normalizeXhsAccountLocator(accountLink);
    push("locator", normalizedLocator);

    const userIdFromLocator = this.extractUserIdFromUrl(normalizedLocator);
    push("user", userIdFromLocator);

    return [...keys];
  }

  private readBenchmarkAssetUrl(asset: AssetRecord) {
    const meta = this.asMeta(asset.metadataJson);
    return this.readMetaString(meta, "sourceUrl") || this.readMetaString(meta, "noteUrl") || asset.fileUrl || "";
  }

  private isRealXiaohongshuNoteUrl(value: string) {
    return /https?:\/\/www\.xiaohongshu\.com\/(explore|discovery\/item)\//i.test(value);
  }

  private isAvatarCdnUrl(value: string) {
    return /https?:\/\/sns-avatar[^/\s]*\.xhscdn\.com\//i.test(value);
  }

  private isSameCollectorTargetAssetIdentity(
    meta: Record<string, unknown>,
    kind: CollectorTargetKind,
    matchValue: string,
    metadata: Record<string, unknown>,
  ) {
    if (this.readMetaString(meta, "kind") !== kind) {
      return false;
    }
    const existingSourceAccountId = this.readMetaString(meta, "sourceAccountId");
    const incomingSourceAccountId = this.readMetaString(metadata, "sourceAccountId") || matchValue;
    if (existingSourceAccountId || incomingSourceAccountId) {
      return existingSourceAccountId === incomingSourceAccountId;
    }
    const existingComposite = [
      this.readMetaString(meta, "sourceUrl"),
      this.readMetaString(meta, "userId") || this.readMetaString(meta, "secUserId"),
    ].filter(Boolean).join(":");
    const incomingComposite = [
      this.readMetaString(metadata, "sourceUrl") || matchValue,
      this.readMetaString(metadata, "userId") || this.readMetaString(metadata, "secUserId"),
    ].filter(Boolean).join(":");
    return Boolean(existingComposite) && existingComposite === incomingComposite;
  }

  private async upsertTargetAsset(params: {
    kind?: CollectorTargetKind;
    brandId: string;
    matchValue: string;
    title: string;
    description: string;
    metadata: Record<string, unknown>;
  }): Promise<AssetRecord> {
    return this.upsertCollectorAsset({
      brandId: params.brandId,
      kind: params.kind ?? "XHS_TARGET_USER",
      matchValue: params.matchValue,
      title: params.title,
      description: params.description,
      metadata: params.metadata,
    });
  }

  private async upsertDailyHotspotAsset(params: {
    brandId: string;
    config: DailyHotspotConfig;
    metadata: Record<string, unknown>;
  }): Promise<AssetRecord> {
    const { brandId, config, metadata } = params;

    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });

      const matched = existing.find((item) => {
        const meta = this.asMeta(item.metadataJson);
        return (
          this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
          && this.readMetaString(meta, "platformKey") === config.platformKey
          && this.getDailyHotspotSnapshotDate(meta) === this.getDailyHotspotSnapshotDate(metadata)
        );
      });

      if (matched) {
        const updated = await this.prismaService.businessAsset.update({
          where: { id: matched.id },
          data: {
            title: config.title,
            description: config.description,
            fileUrl: config.sourceLink,
            metadataJson: metadata as Prisma.InputJsonValue,
          },
        });

        return {
          id: updated.id,
          brandId: updated.brandId,
          category: "PLATFORM_EXPORT",
          title: updated.title,
          description: updated.description ?? "",
          sourceName: "每日热点采集",
          fileUrl: updated.fileUrl ?? undefined,
          metadataJson: this.asMeta(updated.metadataJson),
        };
      }

      const created = await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
          title: config.title,
          description: config.description,
          fileUrl: config.sourceLink,
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });

      return {
        id: created.id,
        brandId: created.brandId,
        category: "PLATFORM_EXPORT",
        title: created.title,
        description: created.description ?? "",
        sourceName: "每日热点采集",
        fileUrl: created.fileUrl ?? undefined,
        metadataJson: this.asMeta(created.metadataJson),
      };
    }

    const index = database.assets.findIndex((item) => {
      const meta = this.asMeta(item.metadataJson);
      return (
        item.brandId === brandId
        && this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
        && this.readMetaString(meta, "platformKey") === config.platformKey
        && this.getDailyHotspotSnapshotDate(meta) === this.getDailyHotspotSnapshotDate(metadata)
      );
    });

    const asset: AssetRecord = {
      id: index >= 0 ? database.assets[index].id : createId("ast"),
      brandId,
      category: "PLATFORM_EXPORT",
      title: config.title,
      description: config.description,
      sourceName: "每日热点采集",
      fileUrl: config.sourceLink,
      metadataJson: metadata,
    };

    if (index >= 0) {
      database.assets[index] = asset;
    } else {
      database.assets.unshift(asset);
    }

    return asset;
  }

  private async findDailyHotspotAsset(brandId: string, platformKey: string, snapshotDate: string): Promise<AssetRecord | null> {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: { updatedAt: "desc" },
      });
      const matched = assets.find((item) => {
        const meta = this.asMeta(item.metadataJson);
        return (
          this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
          && this.readMetaString(meta, "platformKey") === platformKey
          && this.getDailyHotspotSnapshotDate(meta) === snapshotDate
        );
      });
      if (!matched) {
        return null;
      }
      return {
        id: matched.id,
        brandId: matched.brandId,
        category: "PLATFORM_EXPORT",
        title: matched.title,
        description: matched.description ?? "",
        sourceName: "每日热点采集",
        fileUrl: matched.fileUrl ?? undefined,
        metadataJson: this.asMeta(matched.metadataJson),
      };
    }

    const matched = database.assets.find((item) => {
      const meta = this.asMeta(item.metadataJson);
      return (
        item.brandId === brandId
        && item.category === "PLATFORM_EXPORT"
        && this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
        && this.readMetaString(meta, "platformKey") === platformKey
        && this.getDailyHotspotSnapshotDate(meta) === snapshotDate
      );
    });
    return matched ?? null;
  }

  private async getConfiguredAccounts(
    brandId: string,
    target: "brand" | "competitor",
    platform: "XIAOHONGSHU" | "DOUYIN" = "XIAOHONGSHU",
  ): Promise<PlatformAccountRecord[]> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);

      if (target === "brand") {
        const rows = await this.prismaService.platformAccount.findMany({
          where: { brandId, platform },
        });
        return rows.map((item) => ({
          id: item.id,
          brandId: item.brandId,
          platform: item.platform,
          accountName: item.accountName ?? item.username ?? "未命名账号",
          accountLink: item.accountLink,
          accountRole: this.normalizeXhsAccountRole(item.accountRole),
        }));
      }

      const rows = await this.prismaService.competitorAccount.findMany({
        where: { brandId, platform },
      });
      return rows.map((item) => ({
        id: item.id,
        brandId: item.brandId,
        platform: item.platform,
        accountName: item.accountName ?? item.username ?? "未命名竞品账号",
        accountLink: item.accountLink,
        accountRole: this.normalizeXhsAccountRole(item.accountRole),
      }));
    }

    this.ensureBrandExistsInMock(brandId);
    const source = target === "brand" ? database.platformAccounts : database.competitorAccounts;
    return source.filter((item) => item.brandId === brandId && item.platform === platform);
  }

  private mergeDouyinManualAccounts(
    presetAccounts: PlatformAccountRecord[],
    manualLinks: string[] | undefined,
    target: "brand" | "competitor",
    manualEntries?: XhsSyncAccountEntry[],
  ) {
    const results: DouyinResolvedAccountRecord[] = presetAccounts.map((item) => ({
      ...item,
      accountRole: target === "brand" ? this.normalizeXhsAccountRole(item.accountRole) || "BRAND" : this.normalizeXhsAccountRole(item.accountRole),
    }));
    const existingIndexByKey = new Map<string, number>();
    for (const [index, item] of results.entries()) {
      const normalizedLocator = this.normalizeDouyinAccountLocator(item.accountLink);
      if (normalizedLocator) {
        existingIndexByKey.set(normalizedLocator, index);
      }
    }

    const upsertManualAccount = (rawLocator: string, accountRole?: XhsAccountRole) => {
      const normalizedLink = this.normalizeDouyinAccountLocator(rawLocator);
      if (!normalizedLink) {
        return;
      }
      const matchedIndex = existingIndexByKey.get(normalizedLink);
      const normalizedRole = target === "brand" ? this.normalizeXhsAccountRole(accountRole) : undefined;
      const resolvedRole = target === "brand" ? normalizedRole || "BRAND" : undefined;
      if (typeof matchedIndex === "number") {
        const current = results[matchedIndex];
        results[matchedIndex] = {
          ...current,
          accountLink: normalizedLink,
          accountRole: normalizedRole ? resolvedRole : current.accountRole,
        };
        return;
      }
      existingIndexByKey.set(normalizedLink, results.length);
      results.push({
        id: this.buildManualDouyinAccountId(normalizedLink, target),
        brandId: "",
        platform: "DOUYIN",
        accountName: target === "brand" ? "手动输入品牌账号" : "手动输入竞品账号",
        accountLink: normalizedLink,
        accountRole: resolvedRole,
      });
    };

    for (const rawLink of manualLinks ?? []) {
      upsertManualAccount(rawLink);
    }
    for (const entry of manualEntries ?? []) {
      upsertManualAccount(entry.locator, entry.accountRole);
    }

    return results;
  }

  private mergeXhsManualAccounts(
    presetAccounts: PlatformAccountRecord[],
    manualLocators: string[] | undefined,
    target: "brand" | "competitor",
    manualEntries?: XhsSyncAccountEntry[],
  ) {
    const results: XhsResolvedAccountRecord[] = presetAccounts.map((item) => ({
      ...item,
      accountRole: target === "brand" ? this.normalizeXhsAccountRole(item.accountRole) || "BRAND" : this.normalizeXhsAccountRole(item.accountRole),
    }));
    const existingIndexByKey = new Map<string, number>();
    for (const [index, item] of results.entries()) {
      const normalizedLocator = this.normalizeXhsAccountLocator(item.accountLink);
      if (normalizedLocator) {
        existingIndexByKey.set(normalizedLocator, index);
      }
    }

    const upsertManualAccount = (rawLocator: string, accountRole?: XhsAccountRole) => {
      const normalizedLocator = this.normalizeXhsAccountLocator(rawLocator);
      if (!normalizedLocator) {
        return;
      }
      const resolvedRole = this.normalizeXhsAccountRole(accountRole) || "BRAND";
      const matchedIndex = existingIndexByKey.get(normalizedLocator);
      if (matchedIndex !== undefined) {
        results[matchedIndex] = {
          ...results[matchedIndex],
          accountLink: normalizedLocator,
          accountRole: resolvedRole,
        };
        return;
      }
      results.push({
        id: this.buildManualXhsAccountId(normalizedLocator, target),
        brandId: "",
        platform: "XIAOHONGSHU",
        accountName:
          target === "brand"
            ? resolvedRole === "STAFF"
              ? "手动输入员工号"
              : resolvedRole === "TALENT"
                ? "手动输入达人号"
                : "手动输入品牌号"
            : "手动输入竞品账号",
        accountLink: normalizedLocator,
        accountRole: resolvedRole,
      });
      existingIndexByKey.set(normalizedLocator, results.length - 1);
    };

    for (const rawLocator of manualLocators ?? []) {
      upsertManualAccount(rawLocator, "BRAND");
    }
    for (const entry of manualEntries ?? []) {
      upsertManualAccount(entry.locator, entry.accountRole);
    }

    return results;
  }

  private buildManualXhsAccountId(locator: string, target: "brand" | "competitor") {
    const compact = locator
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/i, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
    return `manual_xhs_${target}_${compact || "entry"}`;
  }

  private buildManualDouyinAccountId(locator: string, target: "brand" | "competitor") {
    const compact = locator
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/i, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
    return `manual_douyin_${target}_${compact || "entry"}`;
  }

  private normalizeXhsAccountRole(value?: string | null): XhsAccountRole | undefined {
    if (value === "BRAND" || value === "STAFF" || value === "TALENT") {
      return value;
    }
    return undefined;
  }

  private async fetchXhs(path: string, params: Record<string, string | undefined>) {
    const token = process.env.XHS_DATA_API_KEY;
    if (!token) {
      throw new ServiceUnavailableException("缺少 XHS_DATA_API_KEY，无法调用小红书采集接口");
    }

    const url = new URL(`https://www.zyunaigc.com${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`小红书采集接口请求失败: ${response.status}`);
    }

    const payload = (await response.json()) as {
      success?: boolean;
      message?: string;
      data?: unknown;
    };

    if (payload && typeof payload === "object" && payload.success === false) {
      throw new ServiceUnavailableException(payload.message || "小红书采集接口业务校验失败");
    }

    return payload?.data ?? payload;
  }

  private async fetchTikHub(path: string, params: Record<string, string | undefined> = {}, brandId?: string) {
    return this.requestTikHub(path, { method: "GET", params }, brandId);
  }

  private async fetchTikHubPost(path: string, body: Record<string, unknown>, brandId?: string) {
    return this.requestTikHub(path, { method: "POST", body }, brandId);
  }

  private async requestTikHub(
    path: string,
    options: {
      method?: "GET" | "POST";
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    } = {},
    brandId?: string,
  ) {
    const token = await this.resolveTikHubApiKey(brandId);
    if (!token) {
      throw new ServiceUnavailableException("未找到 Tikhub API Key，请先在个人中心填写 API Key，并在后台接口供应商中配置 Tikhub 平台基线。");
    }

    const url = new URL(`https://api.tikhub.io${path}`);
    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: options.method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
    });

    const payloadText = await response.text();
    let payload: unknown = payloadText;

    try {
      payload = payloadText ? JSON.parse(payloadText) : {};
    } catch {
      payload = payloadText;
    }

    if (!response.ok) {
      const hint = response.status === 403 ? "，请确认当前 API Key 是否已开通对应热点接口权限" : "";
      const payloadMessage =
        typeof payload === "string"
          ? payload.trim()
          : this.pickString(payload, ["message", "msg", "error", "detail", "message_zh"]);
      const requestId = this.pickString(payload, ["request_id", "requestId"]);
      this.logTikHubBillboardFailure({
        path,
        method: options.method || "GET",
        brandId,
        params: options.params,
        body: options.body,
        status: response.status,
        requestId,
        message: payloadMessage,
        payload,
      });
      const reason = payloadMessage ? `，原因：${payloadMessage}` : "";
      const requestIdHint = requestId ? `，request_id: ${requestId}` : "";
      throw new ServiceUnavailableException(`Tikhub 接口请求失败: ${response.status}${hint}${reason}${requestIdHint}`);
    }

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const code = this.pickNumber(payload, ["code"]);
      const message = this.pickString(payload, ["message", "msg", "message_zh"]);
      const requestId = this.pickString(payload, ["request_id", "requestId"]);
      if (typeof code === "number" && code !== 200) {
        this.logTikHubBillboardFailure({
          path,
          method: options.method || "GET",
          brandId,
          params: options.params,
          body: options.body,
          code,
          requestId,
          message,
          payload,
        });
        const requestIdHint = requestId ? `，request_id: ${requestId}` : "";
        throw new ServiceUnavailableException((message || `Tikhub 接口业务校验失败: ${code}`) + requestIdHint);
      }
      const nestedPayload = this.asMeta(this.asMeta(payload).data);
      const nestedCode = this.readMetaNumber(nestedPayload, "code");
      const nestedMessage =
        this.readMetaString(nestedPayload, "message")
        || this.readMetaString(nestedPayload, "msg")
        || this.readMetaString(nestedPayload, "message_zh");
      if (typeof nestedCode === "number" && nestedCode !== 0) {
        this.logTikHubBillboardFailure({
          path,
          method: options.method || "GET",
          brandId,
          params: options.params,
          body: options.body,
          code,
          nestedCode,
          requestId,
          message: nestedMessage || message,
          payload,
        });
        const requestIdHint = requestId ? `，request_id: ${requestId}` : "";
        throw new ServiceUnavailableException((nestedMessage || `Tikhub 接口业务校验失败: ${nestedCode}`) + requestIdHint);
      }
      return payload;
    }

    return payload;
  }

  private logTikHubBillboardFailure(input: {
    path: string;
    method: "GET" | "POST";
    brandId?: string;
    params?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
    status?: number;
    code?: number;
    nestedCode?: number;
    requestId?: string;
    message?: string;
    payload: unknown;
  }) {
    if (!input.path.includes("/api/v1/douyin/billboard/")) {
      return;
    }

    const payloadPreview = this.buildCompactJsonPreview(input.payload);
    const requestPreview = this.buildCompactJsonPreview({
      params: input.params,
      body: input.body,
    });
    this.logger.error(
      `[TikHub Billboard] request failed | path=${input.path} | method=${input.method} | brandId=${input.brandId ?? "-"} | status=${input.status ?? "-"} | code=${input.code ?? "-"} | nestedCode=${input.nestedCode ?? "-"} | requestId=${input.requestId ?? "-"} | message=${input.message ?? "-"} | request=${requestPreview} | payload=${payloadPreview}`,
    );
  }

  private buildCompactJsonPreview(value: unknown) {
    try {
      const serialized = JSON.stringify(value);
      if (!serialized) {
        return "";
      }
      return serialized.length > 1200 ? `${serialized.slice(0, 1200)}...(truncated)` : serialized;
    } catch {
      return String(value);
    }
  }

  private async getDouyinContentTagsSafe(brandId?: string) {
    try {
      return await this.getDouyinContentTags(brandId);
    } catch {
      return this.douyinContentTagCache?.items ?? [];
    }
  }

  private async getDouyinCityOptionsSafe(brandId?: string) {
    try {
      return await this.getDouyinCityOptions(brandId);
    } catch {
      return this.douyinCityOptionCache?.items ?? [];
    }
  }

  private async getDouyinContentTags(brandId?: string) {
    if (this.douyinContentTagCache && this.douyinContentTagCache.expiresAt > Date.now()) {
      return this.douyinContentTagCache.items;
    }

    const persisted = await this.readPersistedDouyinMetadataCache(
      CollectorsService.DOUYIN_CONTENT_TAG_CACHE_ASSET_TITLE,
      "DOUYIN_CONTENT_TAG_CACHE",
      (raw) => this.extractDouyinContentTags(raw),
    );
    if (persisted.length) {
      this.douyinContentTagCache = {
        items: persisted,
        expiresAt: Date.now() + CollectorsService.DOUYIN_CONTENT_TAG_CACHE_TTL_MS,
      };
      return persisted;
    }

    const raw = await this.fetchTikHub("/api/v1/douyin/billboard/fetch_content_tag", {}, brandId);
    const items = this.extractDouyinContentTags(raw);
    if (!items.length) {
      throw new ServiceUnavailableException("Tikhub 垂类内容标签返回为空");
    }
    this.douyinContentTagCache = {
      items,
      expiresAt: Date.now() + CollectorsService.DOUYIN_CONTENT_TAG_CACHE_TTL_MS,
    };
    await this.persistDouyinMetadataCache({
      brandId,
      title: CollectorsService.DOUYIN_CONTENT_TAG_CACHE_ASSET_TITLE,
      kind: "DOUYIN_CONTENT_TAG_CACHE",
      items,
      ttlMs: CollectorsService.DOUYIN_CONTENT_TAG_CACHE_TTL_MS,
    });
    return items;
  }

  private async getDouyinCityOptions(brandId?: string) {
    if (this.douyinCityOptionCache && this.douyinCityOptionCache.expiresAt > Date.now()) {
      return this.douyinCityOptionCache.items;
    }

    const persisted = await this.readPersistedDouyinMetadataCache(
      CollectorsService.DOUYIN_CITY_OPTION_CACHE_ASSET_TITLE,
      "DOUYIN_CITY_OPTION_CACHE",
      (raw) => this.extractDouyinCityOptions(raw),
    );
    if (persisted.length) {
      this.douyinCityOptionCache = {
        items: persisted,
        expiresAt: Date.now() + CollectorsService.DOUYIN_CITY_OPTION_CACHE_TTL_MS,
      };
      return persisted;
    }

    const raw = await this.fetchTikHub("/api/v1/douyin/billboard/fetch_city_list", {}, brandId);
    const items = this.extractDouyinCityOptions(raw);
    if (!items.length) {
      throw new ServiceUnavailableException("Tikhub 城市列表返回为空");
    }
    this.douyinCityOptionCache = {
      items,
      expiresAt: Date.now() + CollectorsService.DOUYIN_CITY_OPTION_CACHE_TTL_MS,
    };
    await this.persistDouyinMetadataCache({
      brandId,
      title: CollectorsService.DOUYIN_CITY_OPTION_CACHE_ASSET_TITLE,
      kind: "DOUYIN_CITY_OPTION_CACHE",
      items,
      ttlMs: CollectorsService.DOUYIN_CITY_OPTION_CACHE_TTL_MS,
    });
    return items;
  }

  private async readPersistedDouyinMetadataCache<T>(
    title: string,
    kind: DouyinMetadataCacheKind,
    extract: (raw: unknown) => T[],
  ): Promise<T[]> {
    const now = Date.now();
    if (await this.prismaService.canUseDatabase()) {
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          category: AssetCategory.PLATFORM_EXPORT,
          title,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
      if (!asset) {
        return [];
      }
      return this.extractFreshDouyinMetadataCacheItems(this.asMeta(asset.metadataJson), kind, now, extract);
    }

    const asset = [...database.assets]
      .reverse()
      .find((item) => item.category === "PLATFORM_EXPORT" && item.title === title);
    if (!asset) {
      return [];
    }
    return this.extractFreshDouyinMetadataCacheItems(this.asMeta(asset.metadataJson), kind, now, extract);
  }

  private extractFreshDouyinMetadataCacheItems<T>(
    meta: Record<string, unknown>,
    kind: DouyinMetadataCacheKind,
    now: number,
    extract: (raw: unknown) => T[],
  ): T[] {
    if (this.readMetaString(meta, "kind") !== kind) {
      return [];
    }
    const expiresAt = this.readMetaNumber(meta, "expiresAt");
    if (typeof expiresAt !== "number" || expiresAt <= now) {
      return [];
    }
    const items = extract(meta.items);
    return items.length ? items : [];
  }

  private async persistDouyinMetadataCache<T>(params: {
    brandId?: string;
    title: string;
    kind: DouyinMetadataCacheKind;
    items: T[];
    ttlMs: number;
  }) {
    const { brandId, title, kind, items, ttlMs } = params;
    if (!brandId || !items.length) {
      return;
    }

    const metadata = {
      kind,
      cachedAt: new Date().toISOString(),
      expiresAt: Date.now() + ttlMs,
      items,
    };

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const existing = await this.prismaService.businessAsset.findFirst({
        where: {
          category: AssetCategory.PLATFORM_EXPORT,
          title,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });

      if (existing) {
        await this.prismaService.businessAsset.update({
          where: { id: existing.id },
          data: {
            description: CollectorsService.DOUYIN_METADATA_CACHE_DESCRIPTION,
            metadataJson: metadata as Prisma.InputJsonValue,
          },
        });
        return;
      }

      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
          title,
          description: CollectorsService.DOUYIN_METADATA_CACHE_DESCRIPTION,
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });
      return;
    }

    this.ensureBrandExistsInMock(brandId);
    const existing = [...database.assets]
      .reverse()
      .find((item) => item.category === "PLATFORM_EXPORT" && item.title === title);
    if (existing) {
      existing.description = CollectorsService.DOUYIN_METADATA_CACHE_DESCRIPTION;
      existing.metadataJson = metadata as Record<string, unknown>;
      return;
    }

    database.assets.push({
      id: createId("asset"),
      brandId,
      category: "PLATFORM_EXPORT",
      title,
      description: CollectorsService.DOUYIN_METADATA_CACHE_DESCRIPTION,
      sourceName: "抖音采集缓存",
      metadataJson: metadata as Record<string, unknown>,
    });
  }

  private extractDouyinContentTags(raw: unknown): DouyinContentTagOption[] {
    const queue: unknown[] = [raw];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        const normalized = current
          .map((item) => {
            const meta = this.asMeta(item);
            const label = this.readMetaString(meta, "label");
            const value = this.readMetaNumber(meta, "value");
            const children = (Array.isArray(meta.children) ? meta.children : [])
              .map((child) => {
                const childMeta = this.asMeta(child);
                const childLabel = this.readMetaString(childMeta, "label");
                const childValue = this.readMetaNumber(childMeta, "value");
                if (!childLabel || typeof childValue !== "number") {
                  return null;
                }
                return {
                  label: childLabel,
                  value: childValue,
                };
              })
              .filter((item): item is { label: string; value: number } => Boolean(item));
            if (!label || typeof value !== "number" || !children.length) {
              return null;
            }
            return {
              label,
              value,
              children,
            };
          })
          .filter((item): item is DouyinContentTagOption => Boolean(item));
        if (normalized.length) {
          return normalized;
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        queue.push(...Object.values(current));
      }
    }

    return [];
  }

  private extractDouyinCityOptions(raw: unknown): DouyinCityOption[] {
    const queue: unknown[] = [raw];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        const normalized = current
          .map((item) => {
            const meta = this.asMeta(item);
            const label = this.readMetaString(meta, "label");
            const value = this.readMetaNumber(meta, "value");
            if (!label || typeof value !== "number") {
              return null;
            }
            return { label, value };
          })
          .filter((item): item is DouyinCityOption => Boolean(item));
        if (normalized.length) {
          return normalized;
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        queue.push(...Object.values(current));
      }
    }

    return [];
  }

  private resolveDouyinContentTagLabels(tags: DouyinContentTagOption[], selection: DouyinContentTagSelection) {
    const primaryTag = tags.find((item) => item.value === selection.primaryTagId);
    const secondaryTag = primaryTag?.children.find((item) => item.value === selection.secondaryTagId);
    return {
      primaryTagLabel: primaryTag?.label || "",
      secondaryTagLabel: secondaryTag?.label || "",
    };
  }

  private buildDouyinBillboardTags(selection: DouyinContentTagSelection) {
    if (!selection.primaryTagId || !selection.secondaryTagId) {
      return [];
    }
    return [
      {
        property1: String(selection.primaryTagId),
        property2: String(selection.secondaryTagId),
      },
    ];
  }

  private extractDouyinBillboardItems(raw: unknown) {
    const queue: unknown[] = [raw];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        if (current.some((item) => this.pickString(item, ["item_id"]) || this.pickString(item, ["item_title"]))) {
          return current.map((item) => this.asMeta(item));
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        queue.push(...Object.values(current));
      }
    }

    return [] as Record<string, unknown>[];
  }

  private extractDouyinCityHotspotItems(raw: unknown) {
    const queue: unknown[] = [raw];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        if (current.some((item) => this.pickString(item, ["sentence"]) || this.pickNumber(item, ["sentence_id"]) !== undefined)) {
          return current.map((item) => this.asMeta(item));
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        queue.push(...Object.values(current));
      }
    }

    return [] as Record<string, unknown>[];
  }

  private extractDouyinCityHotspotTrends(raw: unknown): DouyinCityHotspotTrendRecord[] {
    const payload = this.asMeta(raw);
    const list = Array.isArray(payload.trends) ? payload.trends : [];
    return list
      .map((item) => {
        const meta = this.asMeta(item);
        const datetime = this.readMetaString(meta, "datetime");
        if (!datetime) {
          return null;
        }
        return {
          datetime,
          hotScore: this.readMetaNumber(meta, "hot_score") ?? this.readMetaNumber(meta, "hotScore"),
        } as DouyinCityHotspotTrendRecord;
      })
      .filter((item): item is DouyinCityHotspotTrendRecord => item !== null);
  }

  private isDouyinWorkKind(kind: string): kind is DouyinWorkKind {
    return kind === "DOUYIN_BRAND_WORK"
      || kind === "DOUYIN_COMPETITOR_WORK"
      || kind === "DOUYIN_BENCHMARK_WORK"
      || kind === "DOUYIN_SEARCH_WORK"
      || kind === "DOUYIN_LOW_FAN_EXPLOSIVE_WORK"
      || kind === "DOUYIN_HIGH_COMPLETION_RATE_WORK"
      || kind === "DOUYIN_HIGH_LIKE_RATE_WORK";
  }

  private isDouyinMaterialLibrarySupportedKind(kind: string): kind is Exclude<DouyinWorkKind, "DOUYIN_BRAND_WORK"> {
    return kind === "DOUYIN_COMPETITOR_WORK"
      || kind === "DOUYIN_BENCHMARK_WORK"
      || kind === "DOUYIN_SEARCH_WORK"
      || kind === "DOUYIN_LOW_FAN_EXPLOSIVE_WORK"
      || kind === "DOUYIN_HIGH_COMPLETION_RATE_WORK"
      || kind === "DOUYIN_HIGH_LIKE_RATE_WORK";
  }

  private async resolveTikHubApiKey(brandId?: string) {
    if (brandId) {
      const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, ["https://api.tikhub.io"]);
      if (resolution.status === "resolved") {
        const resolvedKey = String(resolution.apiKeys[0] || "").trim();
        if (resolvedKey) {
          return resolvedKey;
        }
      }
    }

    const runtimeKey = String(process.env.TIKHUB_API_KEY || "").trim();
    if (runtimeKey) {
      return runtimeKey;
    }
    return "";
  }

  private extractNoteItems(raw: unknown): unknown[] {
    const queue: unknown[] = [raw];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        if (current.some((item) => this.pickString(item, ["note_id", "noteId", "title", "desc"]))) {
          return current;
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        for (const value of Object.values(current)) {
          queue.push(value);
        }
      }
    }

    return [];
  }

  private extractDailyHotspotItems(raw: unknown, platformKey: string): DailyHotspotItemRecord[] {
    const queue: unknown[] = [raw];
    let bestCandidates: DailyHotspotItemRecord[] = [];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        const signalCount = current.filter((item) => this.looksLikeDailyHotspotRawItem(item)).length;
        const candidates = current
          .map((item, index) => this.normalizeDailyHotspotItem(item, index + 1, platformKey))
          .filter((item): item is DailyHotspotItemRecord => Boolean(item));
        if (candidates.length && signalCount) {
          if (candidates.length > bestCandidates.length) {
            bestCandidates = candidates;
          }
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        for (const value of Object.values(current)) {
          queue.push(value);
        }
      }
    }

    return bestCandidates;
  }

  private looksLikeDailyHotspotRawItem(raw: unknown) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return false;
    }

    const record = raw as Record<string, unknown>;
    return Boolean(record.word || record.title || record.name)
      && (
        record.hot_value !== undefined
        || record.event_time !== undefined
        || record.position !== undefined
        || record.group_id !== undefined
        || record.sentence_id !== undefined
      );
  }

  private normalizeDailyHotspotItem(raw: unknown, fallbackRank: number, platformKey: string): DailyHotspotItemRecord | null {
    const title =
      this.pickString(raw, ["word", "sentence", "title", "name", "keyword", "display_word"])
      || this.pickString(raw, ["desc"]);
    if (!title) {
      return null;
    }

    const explicitRank = this.pickNumber(raw, ["position", "rank", "index", "hot_rank", "order", "num"]);
    const hotRaw = this.pickNumber(raw, ["hot_value", "hot", "hotness", "view_count", "aweme_cnt", "video_count"]);
    const hot = typeof hotRaw === "number" && hotRaw > 0 ? hotRaw : undefined;
    const url =
      this.pickString(raw, ["url", "link", "sentence_url", "share_url", "web_url"])
      || undefined;
    const mobileUrl =
      this.pickString(raw, ["app_url", "mobile_url", "schema"])
      || undefined;
    const timestamp =
      this.pickNumber(raw, ["event_time", "timestamp", "create_time", "update_time"])
      ?? undefined;
    if (explicitRank === undefined && hot === undefined && timestamp === undefined) {
      return null;
    }

    const rank = explicitRank ?? fallbackRank;
    const id =
      this.pickString(raw, ["word_id", "group_id", "sentence_id", "id"])
      || `${platformKey}-${rank}-${title}`;

    return {
      id,
      rank,
      title,
      hot,
      url,
      mobileUrl,
      timestamp: this.normalizeUnixTimestamp(timestamp),
    };
  }

  private extractDailyHotspotUpdateTime(raw: unknown) {
    const textValue =
      this.pickString(raw, ["update_time", "active_time", "refresh_time", "version", "time", "date"])
      || this.pickString(raw, ["message_time"]);
    if (textValue) {
      return textValue;
    }

    const timestamp = this.pickNumber(raw, ["time_stamp", "timestamp", "event_time", "update_timestamp"]);
    return typeof timestamp === "number" ? new Date(this.normalizeUnixTimestamp(timestamp) ?? timestamp).toISOString() : undefined;
  }

  private extractDouyinSecUserId(url: string) {
    const text = String(url || "").trim();
    if (!text) {
      return "";
    }
    if (/^MS4w/i.test(text)) {
      return text;
    }

    const extractFromCandidate = (candidate: string) => {
      const normalized = String(candidate || "").trim();
      if (!normalized) {
        return "";
      }
      const match = normalized.match(/\/(?:share\/)?user\/([^/?#]+)/i);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
      return "";
    };

    try {
      const parsed = new URL(text);
      const fromPath = extractFromCandidate(parsed.pathname);
      if (fromPath) {
        return fromPath;
      }
      const fromQuery =
        parsed.searchParams.get("sec_user_id")
        || parsed.searchParams.get("sec_uid")
        || parsed.searchParams.get("sec_id");
      if (fromQuery) {
        return decodeURIComponent(fromQuery);
      }
    } catch {
      // Ignore malformed URLs and fall back to regex matching below.
    }

    return extractFromCandidate(text);
  }

  private extractDouyinUser(raw: unknown) {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    return this.asMeta(data.user);
  }

  private extractDouyinAwemeList(raw: unknown): Record<string, unknown>[] {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    return Array.isArray(data.aweme_list)
      ? data.aweme_list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
  }

  private extractDouyinAwemeDetail(raw: unknown) {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    return this.asMeta(data.aweme_detail);
  }

  private extractDouyinSearchResultItems(raw: unknown): Record<string, unknown>[] {
    const payload = this.asMeta(raw);
    const data = Array.isArray(payload.data) ? payload.data : Array.isArray(this.asMeta(payload.data).data) ? this.asMeta(payload.data).data as unknown[] : [];
    return data
      .map((item) => this.asMeta(item))
      .filter((item) => {
        const aweme = this.asMeta(item.aweme_info);
        return Boolean(this.pickString(aweme, ["aweme_id"]));
      });
  }

  private extractDouyinKeywordRecommendationItems(raw: unknown): Record<string, unknown>[] {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    const list = Array.isArray(data.sug_list) ? data.sug_list : Array.isArray(payload.sug_list) ? payload.sug_list : [];
    return list
      .map((item) => this.asMeta(item))
      .filter((item) =>
        Boolean(
          this.pickString(item, ["content"])
          || this.pickString(this.asMeta(item.word_record), ["words_content"]),
        ));
  }

  private extractDouyinCommentItems(raw: unknown): Record<string, unknown>[] {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    const list = Array.isArray(data.comments)
      ? data.comments
      : Array.isArray(data.comment_list)
        ? data.comment_list
        : Array.isArray(payload.comments)
          ? payload.comments
          : Array.isArray(payload.comment_list)
            ? payload.comment_list
            : [];
    return list
      .map((item) => this.asMeta(item))
      .filter((item) => Boolean(this.pickString(item, ["cid", "comment_id", "commentId"])));
  }

  private extractXhsCommentItems(raw: unknown): Record<string, unknown>[] {
    const queue: unknown[] = [raw];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        const normalized = current
          .map((item) => this.asMeta(item))
          .filter((item) =>
            Boolean(
              this.pickString(item, ["comment_id", "commentId", "id"])
              || this.pickString(item, ["content", "text", "comment_content"]),
            ));
        if (normalized.length) {
          return normalized;
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        queue.push(...Object.values(current));
      }
    }

    return [];
  }

  private extractDouyinStatisticsMap(raw: unknown) {
    const payload = this.asMeta(raw);
    const data = this.asMeta(payload.data);
    const list = Array.isArray(data.statistics_list)
      ? data.statistics_list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
    const result = new Map<string, Record<string, unknown>>();
    for (const item of list) {
      const awemeId = this.pickString(item, ["aweme_id"]);
      if (awemeId) {
        result.set(awemeId, item);
      }
    }
    return result;
  }

  private extractFirstUrlFromObject(raw: unknown, key: string) {
    const payload = this.asMeta(raw);
    const target = this.asMeta(payload[key]);
    const list = Array.isArray(target.url_list) ? target.url_list : [];
    const first = list.find((item): item is string => typeof item === "string" && item.trim().length > 0);
    return first || "";
  }

  private extractShareUrl(raw: unknown) {
    const payload = this.asMeta(raw);
    const shareInfo = this.asMeta(payload.share_info);
    return this.pickString(shareInfo, ["share_url"]);
  }

  private extractDouyinImageList(raw: unknown) {
    const payload = this.asMeta(raw);
    const list = Array.isArray(payload.images) ? payload.images : [];
    return list
      .map((item) => {
        const record = this.asMeta(item);
        const urlList = Array.isArray(record.url_list) ? record.url_list : [];
        return urlList.find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) || "";
      })
      .filter(Boolean);
  }

  private extractDouyinCoverUrl(raw: unknown) {
    const payload = this.asMeta(raw);
    const video = this.asMeta(payload.video);
    return this.extractFirstUrlFromObject(video, "cover");
  }

  private extractDouyinVideoUrl(raw: unknown) {
    const payload = this.asMeta(raw);
    const video = this.asMeta(payload.video);
    const playAddr = this.asMeta(video.play_addr);
    const directList = Array.isArray(playAddr.url_list) ? playAddr.url_list : [];
    const directUrl = directList.find((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (directUrl) {
      return directUrl;
    }
    const bitRateList = Array.isArray(video.bit_rate) ? video.bit_rate : [];
    for (const bitRate of bitRateList) {
      const play = this.asMeta(this.asMeta(bitRate).play_addr);
      const list = Array.isArray(play.url_list) ? play.url_list : [];
      const matched = list.find((item): item is string => typeof item === "string" && item.trim().length > 0);
      if (matched) {
        return matched;
      }
    }
    return "";
  }

  private extractDouyinHashtags(raw: unknown) {
    const payload = this.asMeta(raw);
    const chaList = Array.isArray(payload.cha_list) ? payload.cha_list : [];
    const textExtra = Array.isArray(payload.text_extra) ? payload.text_extra : [];
    const values = [
      ...chaList.map((item) => this.pickString(item, ["cha_name"])),
      ...textExtra.map((item) => this.pickString(item, ["hashtag_name"])),
    ].filter(Boolean);
    return Array.from(new Set(values));
  }

  private extractXhsImageList(raw: unknown) {
    const payload = this.asMeta(raw);
    const imageCandidates = [
      ...this.extractXhsImageUrlsFromList(payload.images_list),
      ...this.extractXhsImageUrlsFromList(payload.image_list),
      ...this.extractXhsImageUrlsFromList(payload.images),
      ...this.extractUrlsFromUnknown(raw).filter((item) => this.isLikelyImageUrl(item)),
    ];
    return Array.from(new Set(imageCandidates.filter(Boolean))).slice(0, 12);
  }

  private extractXhsVideoUrl(raw: unknown) {
    const payload = this.asMeta(raw);
    const directCandidates = [
      this.pickString(payload, ["video_url", "videoUrl"]),
      this.pickString(this.asMeta(payload.video_info), ["master_url", "url", "video_url"]),
      this.pickString(this.asMeta(payload.video_info_v2), ["master_url", "url", "video_url"]),
    ].filter(Boolean);
    const nestedCandidates = this.extractUrlsFromUnknown([
      payload.video_info,
      payload.video_info_v2,
      payload.video,
      payload.note_card,
      raw,
    ]);
    return [...directCandidates, ...nestedCandidates].find((item) => this.isLikelyVideoUrl(item)) || "";
  }

  private extractXhsImageUrlsFromList(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => {
        const record = this.asMeta(item);
        return this.pickString(record, ["url_size_large", "url_default", "url_pre", "url", "original"]);
      })
      .filter((item): item is string => Boolean(item));
  }

  private deriveDouyinWorkType(raw: unknown, detail: unknown) {
    const imageCount = this.extractDouyinImageList(detail).length || this.extractDouyinImageList(raw).length;
    if (imageCount > 0) {
      return "图文";
    }
    const awemeType = this.pickNumber(raw, ["aweme_type"]) ?? this.pickNumber(detail, ["aweme_type"]);
    if (awemeType === 68) {
      return "图文";
    }
    return "短视频";
  }

  private normalizeDouyinShareUrl(value: string) {
    if (!value) {
      return "";
    }
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    if (/^www\./i.test(value) || /^iesdouyin\.com/i.test(value)) {
      return `https://${value}`;
    }
    return value;
  }

  private normalizeXhsShareText(value: string) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    if (/^https?:\/\//i.test(text)) {
      return text;
    }
    if (/^xhslink\.com/i.test(text) || /^www\.xiaohongshu\.com/i.test(text)) {
      return `https://${text}`;
    }
    return text;
  }

  private normalizeHttpUrl(value: string) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    if (/^https?:\/\//i.test(text)) {
      return text;
    }
    if (/^\/\//.test(text)) {
      return `https:${text}`;
    }
    return "";
  }

  private looksLikeHtml(value: string) {
    return /<[^>]+>/.test(String(value || ""));
  }

  private convertHtmlToPlainText(value: string) {
    const text = String(value || "");
    if (!text) {
      return "";
    }
    return this.normalizeWechatPlainText(
      text
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\s*\/p\s*>/gi, "\n")
        .replace(/<\s*\/div\s*>/gi, "\n")
        .replace(/<\s*\/li\s*>/gi, "\n")
        .replace(/<\s*\/h[1-6]\s*>/gi, "\n")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'"),
    );
  }

  private normalizeWechatPlainText(value: string) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  private normalizeDouyinAccountLocator(value: string) {
    const secUserId = this.extractDouyinSecUserId(String(value || "").trim());
    return this.buildDouyinUserUrl(secUserId);
  }

  private normalizeXhsAccountLocator(value: string) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    const userId = this.extractUserIdFromUrl(text);
    if (userId) {
      return this.buildXhsProfileUrl(userId);
    }
    if (/^[a-z0-9]{8,}$/i.test(text) && !/^https?:\/\//i.test(text)) {
      return `user_id:${text}`;
    }
    return this.normalizeXhsShareText(text);
  }

  private buildXhsProfileUrl(userId: string) {
    const normalized = String(userId || "").trim();
    return normalized ? `https://www.xiaohongshu.com/user/profile/${normalized}` : "";
  }

  private buildDouyinUserUrl(secUserId: string) {
    const normalized = String(secUserId || "").trim();
    return normalized ? `https://www.douyin.com/user/${normalized}` : "";
  }

  private normalizeDouyinAwemeId(value: string) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    const direct = text.match(/^\d{8,}$/);
    if (direct?.[0]) {
      return direct[0];
    }
    const urlMatch = text.match(/\/(?:video|note)\/(\d{8,})/i) || text.match(/aweme_id=(\d{8,})/i);
    return urlMatch?.[1] || "";
  }

  private resolveXhsUserQuery(value: string) {
    const normalized = this.normalizeXhsAccountLocator(value);
    if (!normalized) {
      return { userId: "", shareText: "" };
    }
    if (normalized.startsWith("user_id:")) {
      return {
        userId: normalized.slice("user_id:".length),
        shareText: "",
      };
    }
    const userId = this.extractUserIdFromUrl(normalized);
    return {
      userId,
      shareText: userId ? "" : normalized,
    };
  }

  private resolveXhsNoteQuery(value: string) {
    const normalized = this.normalizeXhsShareText(value);
    if (!normalized) {
      return { noteId: "", shareText: "" };
    }
    const noteId = this.extractNoteIdFromUrl(normalized);
    if (noteId) {
      return { noteId, shareText: "" };
    }
    if (/^[a-z0-9]{8,}$/i.test(normalized) && !/^https?:\/\//i.test(normalized)) {
      return { noteId: normalized, shareText: "" };
    }
    return { noteId: "", shareText: normalized };
  }

  private resolveXhsShareTextFallbackQuery(
    sourceUrl: string,
    noteQuery: { noteId: string; shareText: string },
  ) {
    if (!/^https?:\/\//i.test(sourceUrl) || !noteQuery.noteId || noteQuery.shareText) {
      return null;
    }
    return {
      noteId: "",
      shareText: sourceUrl,
    };
  }

  private normalizeDouyinNoteUrl(workId: string, workType: string) {
    if (!workId) {
      return "";
    }
    return workType === "图文"
      ? `https://www.douyin.com/note/${workId}`
      : `https://www.douyin.com/video/${workId}`;
  }

  private computeRatio(numerator?: number, denominator?: number) {
    if (typeof numerator !== "number" || typeof denominator !== "number" || denominator <= 0) {
      return undefined;
    }
    return Number((numerator / denominator).toFixed(4));
  }

  private formatUnixTimestampText(value?: number) {
    const normalized = this.normalizeUnixTimestamp(value);
    return normalized ? new Date(normalized).toISOString().replace("T", " ").slice(0, 19) : undefined;
  }

  private pickString(raw: unknown, keys: string[]): string {
    const value = this.pickDeepValue(raw, keys);
    return typeof value === "string" ? value : "";
  }

  private pickStringArray(raw: unknown, keys: string[]): string[] {
    const value = this.pickDeepValue(raw, keys);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private pickBoolean(raw: unknown, keys: string[]): boolean | undefined {
    const value = this.pickDeepValue(raw, keys);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
    }
    return undefined;
  }

  private pickNumber(raw: unknown, keys: string[]): number | undefined {
    const value = this.pickDeepValue(raw, keys);
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private pickDeepValue(raw: unknown, keys: string[]) {
    const targetKeys = new Set(keys);
    const queue: unknown[] = [raw];
    let visited = 0;

    while (queue.length && visited < 300) {
      visited += 1;
      const current = queue.shift();

      if (!current || typeof current !== "object") {
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      for (const [key, value] of Object.entries(current)) {
        if (targetKeys.has(key)) {
          return value;
        }
        queue.push(value);
      }
    }

    return undefined;
  }

  private extractUserIdFromUrl(url: string) {
    const match = url.match(/user\/profile\/([^/?#]+)/i);
    return match?.[1] ?? "";
  }

  private extractNoteIdFromUrl(url: string) {
    const match = url.match(/(?:explore|discovery\/item)\/([^/?#]+)/i);
    return match?.[1] ?? "";
  }

  private buildDouyinVideoStorageKey(brandId: string, workId: string, contentType: string, sourceUrl: string) {
    return `collectors/${brandId}/douyin/videos/${workId}${this.resolveDouyinVideoExtension(contentType, sourceUrl)}`;
  }

  private resolveDouyinVideoExtension(contentType: string, sourceUrl: string) {
    const normalizedType = String(contentType || "").trim().toLowerCase();
    if (normalizedType.includes("quicktime")) {
      return ".mov";
    }
    if (normalizedType.includes("webm")) {
      return ".webm";
    }
    if (normalizedType.includes("x-matroska")) {
      return ".mkv";
    }
    if (normalizedType.includes("mp4") || normalizedType.includes("mpeg4") || normalizedType.includes("video/")) {
      return ".mp4";
    }
    try {
      const extension = extname(new URL(sourceUrl).pathname);
      return extension || ".mp4";
    } catch {
      return ".mp4";
    }
  }

  private guessDouyinVideoContentType(sourceUrl: string) {
    const extension = this.resolveDouyinVideoExtension("", sourceUrl);
    switch (extension) {
      case ".mov":
        return "video/quicktime";
      case ".webm":
        return "video/webm";
      case ".mkv":
        return "video/x-matroska";
      default:
        return "video/mp4";
    }
  }

  private isIsoDateExpired(value: string) {
    if (!value) {
      return false;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && timestamp <= Date.now();
  }

  private asMeta(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private readMetaString(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return typeof value === "string" ? value : "";
  }

  private readMetaNumber(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return typeof value === "number" ? value : undefined;
  }

  private readMetaBoolean(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return typeof value === "boolean" ? value : undefined;
  }

  private readMetaStringArray(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private readMetaJsonArray(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return Array.isArray(value) ? value : [];
  }

  private getDailyHotspotSnapshotDate(meta: Record<string, unknown>) {
    const snapshotDate = this.readMetaString(meta, "snapshotDate");
    if (snapshotDate) {
      return snapshotDate;
    }

    const collectedAt = this.readMetaString(meta, "collectedAt");
    if (collectedAt) {
      return collectedAt.slice(0, 10);
    }

    const updateTime = this.readMetaString(meta, "updateTime");
    if (updateTime) {
      return updateTime.slice(0, 10);
    }

    return "";
  }

  private normalizeUnixTimestamp(value?: number) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return undefined;
    }

    return value >= 1e12 ? value : value * 1000;
  }

  private async ensureBrandExistsInDatabase(brandId: string) {
    const brand = await this.prismaService.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
  }

  private ensureBrandExistsInMock(brandId: string) {
    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
  }

  private ensureBrandExistsInMockOrDatabase(brandId: string) {
    const brand = database.brands.find((item) => item.id === brandId);
    if (brand) {
      return;
    }
  }

  private resolveDailyHotspotConfigs(platformTitles: string[]) {
    if (!platformTitles.length) {
      return DAILY_HOTSPOT_CONFIGS;
    }

    const normalizedTitles = platformTitles.map((item) => item.trim()).filter(Boolean);
    const matched = DAILY_HOTSPOT_CONFIGS.filter((item) =>
      normalizedTitles.some((title) => title === item.title || title === item.platformKey || title === item.boardType),
    );

    return matched.length ? matched : DAILY_HOTSPOT_CONFIGS;
  }

  private async runDailyHotspotSyncJob() {
    if (!process.env.TIKHUB_API_KEY) {
      console.warn("跳过每日热点定时采集：缺少 TIKHUB_API_KEY");
      return;
    }

    const brandIds = await this.getDailyHotspotBrandIds();
    await this.mapWithConcurrency(
      brandIds,
      this.dailyHotspotBrandConcurrency,
      async (brandId) => {
        try {
          await this.syncDailyHotspots(brandId, []);
        } catch (error) {
          const message = error instanceof Error ? error.message : "未知错误";
          console.error(`每日热点定时采集失败: ${brandId} - ${message}`);
        }
        return undefined;
      },
    );
  }

  private async shouldCatchUpDailyHotspotRun() {
    if (!process.env.TIKHUB_API_KEY) {
      return false;
    }

    const today = this.getLocalDateString();
    const brandIds = await this.getDailyHotspotBrandIds();
    if (!brandIds.length) {
      return false;
    }

    for (const brandId of brandIds) {
      const snapshots = await this.getDailyHotspotSnapshotStatuses(brandId);
      for (const config of DAILY_HOTSPOT_CONFIGS) {
        const matched = snapshots.find((item) => item.platformKey === config.platformKey && item.snapshotDate === today);
        if (!matched || matched.syncStatus !== "SUCCESS") {
          return true;
        }
      }
    }

    return false;
  }

  private async getDailyHotspotBrandIds() {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          category: AssetCategory.PLATFORM_EXPORT,
        },
        select: {
          brandId: true,
          metadataJson: true,
        },
      });
      const brandIds = new Set<string>();
      for (const asset of assets) {
        const meta = this.asMeta(asset.metadataJson);
        if (this.readMetaString(meta, "kind") !== "DAILY_HOTSPOT_PLATFORM") {
          continue;
        }
        if (!DAILY_HOTSPOT_CONFIGS.some((config) => config.platformKey === this.readMetaString(meta, "platformKey"))) {
          continue;
        }
        if (asset.brandId) {
          brandIds.add(asset.brandId);
        }
      }
      return Array.from(brandIds);
    }

    return Array.from(
      new Set(
        database.assets
          .filter((asset) => asset.category === "PLATFORM_EXPORT")
          .filter((asset) => {
            const meta = this.asMeta(asset.metadataJson);
            return (
              this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
              && DAILY_HOTSPOT_CONFIGS.some((config) => config.platformKey === this.readMetaString(meta, "platformKey"))
            );
          })
          .map((asset) => asset.brandId),
      ),
    );
  }

  private async getDailyHotspotSnapshotStatuses(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: { updatedAt: "desc" },
      });

      return assets
        .map((asset) => this.asMeta(asset.metadataJson))
        .filter((meta) => this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM")
        .map((meta) => ({
          platformKey: this.readMetaString(meta, "platformKey"),
          snapshotDate: this.getDailyHotspotSnapshotDate(meta),
          syncStatus: (this.readMetaString(meta, "syncStatus") as DailyHotspotSyncStatus) || "IDLE",
        }));
    }

    return database.assets
      .filter((asset) => asset.brandId === brandId && asset.category === "PLATFORM_EXPORT")
      .map((asset) => this.asMeta(asset.metadataJson))
      .filter((meta) => this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM")
      .map((meta) => ({
        platformKey: this.readMetaString(meta, "platformKey"),
        snapshotDate: this.getDailyHotspotSnapshotDate(meta),
        syncStatus: (this.readMetaString(meta, "syncStatus") as DailyHotspotSyncStatus) || "IDLE",
      }));
  }

  private getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // ─── 公众号采集（TikHub WeChat-Media-Platform-V2-API） ───

  async getWechatMpWorkspace(brandId: string): Promise<WechatMpCollectionWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.listCollectorAssets(brandId);
      const accountAssets = assets.filter((asset) => {
        const meta = this.asMeta(asset.metadataJson);
        return this.readMetaString(meta, "kind") === "WECHAT_MP_BRAND_ACCOUNT";
      });
      const articleAssets = assets.filter((asset) => {
        const meta = this.asMeta(asset.metadataJson);
        return this.readMetaString(meta, "kind") === "WECHAT_MP_ARTICLE";
      });
      return {
        brandAccounts: accountAssets.map((asset) => this.mapWechatMpBrandAccount(asset)),
        articles: articleAssets.map((asset) => this.mapWechatMpArticle(asset)),
      };
    }
    return { brandAccounts: [], articles: [] };
  }

  async syncWechatMpBrandAccount(brandId: string, ghUsername: string): Promise<{ item: WechatMpBrandAccountRecord; workspace: WechatMpCollectionWorkspace }> {
    const trimmed = String(ghUsername || "").trim();
    if (!/^gh_[A-Za-z0-9_]+$/.test(trimmed)) {
      throw new BadRequestException("gh_username 格式不正确，应以 gh_ 开头。");
    }
    const account: WechatMpBrandAccountRecord = {
      id: `wechat_mp_brand_${trimmed}`,
      ghUsername: trimmed,
      accountName: trimmed,
      collectedAt: new Date().toISOString(),
    };
    const asset = await this.upsertCollectorAsset({
      brandId,
      kind: "WECHAT_MP_BRAND_ACCOUNT" as CollectorAssetKind,
      matchValue: account.id,
      title: account.accountName,
      description: "微信公众号品牌账号绑定",
      fileUrl: undefined,
      metadata: {
        kind: "WECHAT_MP_BRAND_ACCOUNT",
        sourceAccountId: account.id,
        ghUsername: account.ghUsername,
        accountName: account.accountName,
        collectedAt: account.collectedAt,
      },
    });
    const item = this.mapWechatMpBrandAccount(asset);
    const workspace = await this.getWechatMpWorkspace(brandId);
    return { item, workspace };
  }

  async deleteWechatMpBrandAccount(brandId: string, accountId: string): Promise<{ workspace: WechatMpCollectionWorkspace }> {
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_BRAND_ACCOUNT" && this.readMetaString(meta, "sourceAccountId") === accountId;
    });
    if (target) {
      await this.deleteCollectorAssetById(brandId, target.id);
    }
    // 同时删除该账号下的文章
    const articleAssets = assets.filter((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_ARTICLE" && this.readMetaString(meta, "sourceAccountId") === accountId;
    });
    for (const article of articleAssets) {
      await this.deleteCollectorAssetById(brandId, article.id);
    }
    const workspace = await this.getWechatMpWorkspace(brandId);
    return { workspace };
  }

  async fetchWechatMpArticles(brandId: string, ghUsername: string, offset?: string): Promise<WechatMpArticleFetchResult> {
    const trimmed = String(ghUsername || "").trim();
    if (!/^gh_[A-Za-z0-9_]+$/.test(trimmed)) {
      throw new BadRequestException("gh_username 格式不正确，应以 gh_ 开头。");
    }
    const body: Record<string, unknown> = {
      username: trimmed,
      page_size: 20,
      raw: true,
    };
    if (offset) {
      body.offset = offset;
    }
    const raw = await this.fetchTikHubPost("/api/v1/wechat_mp/v2/fetch_account_articles", body, brandId);
    const data = this.asMeta(this.asMeta(raw).data);
    const isEnd = Boolean(this.readMetaNumber(data, "is_end"));
    const nextOffset = this.readMetaString(data, "next_offset") || undefined;
    const articlesRaw = (data.articles as unknown[] | undefined) || [];
    const articles: WechatMpArticleRecord[] = [];
    for (const articleRaw of articlesRaw) {
      const article = this.asMeta(articleRaw);
      // raw=true 时结构为 appMsg + baseInfo
      const appMsg = this.asMeta(article["appMsg"]);
      const appMsgBaseInfo = this.asMeta(appMsg["baseInfo"]);
      // detailInfo 是数组，取第一个元素
      const detailInfoArray = (appMsg["detailInfo"] as unknown[] | undefined) || [];
      const detailInfo = detailInfoArray.length ? this.asMeta(detailInfoArray[0]) : {};
      const baseInfo = this.asMeta(article["baseInfo"]);
      // 文章 URL：detailInfo.contentUrl
      const articleUrl =
        this.readMetaString(detailInfo, "contentUrl")
        || this.readMetaString(detailInfo, "url")
        || this.readMetaString(appMsgBaseInfo, "url")
        || this.readMetaString(article, "url")
        || "";
      // 文章 ID：baseInfo.msgId 或 appMsg.baseInfo.appMsgId
      const articleId =
        this.readMetaString(baseInfo, "msgId")
        || String(this.readMetaNumber(appMsgBaseInfo, "appMsgId") || "")
        || this.readMetaString(article, "app_msg_id")
        || articleUrl;
      if (!articleId) continue;
      // 时间戳：appMsg.baseInfo.createTime / updateTime
      const createTime = this.readMetaNumber(appMsgBaseInfo, "createTime") || this.readMetaNumber(baseInfo, "dateTime") || this.readMetaNumber(article, "create_time");
      const updateTime = this.readMetaNumber(appMsgBaseInfo, "updateTime") || this.readMetaNumber(baseInfo, "updateTime") || this.readMetaNumber(article, "update_time");
      // 标题
      const title =
        this.readMetaString(detailInfo, "title")
        || this.readMetaString(appMsgBaseInfo, "title")
        || this.readMetaString(article, "title")
        || "";
      // 摘要
      const digest =
        this.readMetaString(detailInfo, "digest")
        || this.readMetaString(detailInfo, "authorDesc")
        || this.readMetaString(appMsgBaseInfo, "digest")
        || this.readMetaString(article, "digest")
        || undefined;
      // 封面：detailInfo.coverImgUrl
      const cover =
        this.readMetaString(detailInfo, "coverImgUrl")
        || this.readMetaString(detailInfo, "coverImgUrl169")
        || this.readMetaString(detailInfo, "cover")
        || this.readMetaString(appMsgBaseInfo, "cover")
        || this.readMetaString(article, "cover")
        || undefined;
      // 阅读量和点赞数：fetch_account_articles 接口不返回这些字段，留空由 stats 接口补充
      articles.push({
        id: `wechat_mp_article_${articleId}`,
        sourceAccountId: `wechat_mp_brand_${trimmed}`,
        ghUsername: trimmed,
        appMsgId: String(this.readMetaNumber(appMsgBaseInfo, "appMsgId") || "") || this.readMetaString(baseInfo, "msgId") || this.readMetaString(article, "app_msg_id") || undefined,
        title,
        digest,
        url: articleUrl,
        cover,
        createTime: createTime ? new Date(createTime * 1000).toISOString() : undefined,
        updateTime: updateTime ? new Date(updateTime * 1000).toISOString() : undefined,
        idx: this.readMetaNumber(baseInfo, "idx") || this.readMetaNumber(article, "idx"),
        collectedAt: new Date().toISOString(),
      });
    }
    // 存储文章到 BusinessAsset
    for (const article of articles) {
      await this.upsertCollectorAsset({
        brandId,
        kind: "WECHAT_MP_ARTICLE" as CollectorAssetKind,
        matchValue: article.id,
        title: article.title,
        description: "微信公众号文章采集快照",
        fileUrl: article.url,
        metadata: {
          kind: "WECHAT_MP_ARTICLE",
          sourceAccountId: article.sourceAccountId,
          articleId: article.id,
          appMsgId: article.appMsgId,
          title: article.title,
          digest: article.digest,
          url: article.url,
          cover: article.cover,
          createTime: article.createTime,
          updateTime: article.updateTime,
          idx: article.idx,
          collectedAt: article.collectedAt,
        },
      });
    }
    // 自动补充每篇文章的阅读量和点赞数（调用 fetch_article_stats 接口）
    for (const article of articles) {
      if (!article.url) continue;
      try {
        const statsBody: Record<string, unknown> = { url: article.url, raw: false };
        const statsRaw = await this.fetchTikHubPost("/api/v1/wechat_mp/v2/fetch_article_stats", statsBody, brandId);
        const stats = this.extractWechatArticleStats(statsRaw);
        article.readNum = stats.readNum;
        article.likeCount = stats.likeCount;
        article.oldLikeCount = stats.oldLikeCount;
        article.shareCount = stats.shareCount;
        article.collectCount = stats.collectCount;
        article.commentCount = stats.commentCount;
        article.starNum = stats.starNum;
        article.statsUpdatedAt = new Date().toISOString();
        // 更新已存储的 metadata
        const statsAssets = await this.listCollectorAssets(brandId);
        const statsTarget = statsAssets.find((asset) => {
          const meta = this.asMeta(asset.metadataJson);
          return this.readMetaString(meta, "kind") === "WECHAT_MP_ARTICLE" && this.readMetaString(meta, "articleId") === article.id;
        });
        if (statsTarget) {
          const statsMeta = this.asMeta(statsTarget.metadataJson);
          await this.upsertCollectorAsset({
            brandId,
            kind: "WECHAT_MP_ARTICLE" as CollectorAssetKind,
            matchValue: article.id,
            title: article.title,
            description: statsTarget.description,
            fileUrl: article.url,
            metadata: {
              ...statsMeta,
              readNum: article.readNum,
              likeCount: article.likeCount,
              oldLikeCount: article.oldLikeCount,
              shareCount: article.shareCount,
              collectCount: article.collectCount,
              commentCount: article.commentCount,
              starNum: article.starNum,
              statsUpdatedAt: article.statsUpdatedAt,
            },
          });
        }
      } catch {
        // stats 接口失败不影响文章列表返回，静默跳过
      }
    }
    return {
      isEnd,
      nextOffset,
      count: articles.length,
      articles,
      workspace: await this.getWechatMpWorkspace(brandId),
    };
  }

  async updateWechatMpArticleStats(brandId: string, articleUrl: string): Promise<{ item: WechatMpArticleRecord; workspace: WechatMpCollectionWorkspace }> {
    const trimmedUrl = String(articleUrl || "").trim();
    if (!/^https?:\/\/mp\.weixin\.qq\.com\/s([/?].+)?$/.test(trimmedUrl)) {
      throw new BadRequestException("文章链接格式不正确，需为 mp.weixin.qq.com/s/ 开头的链接。");
    }
    const body: Record<string, unknown> = {
      url: trimmedUrl,
      raw: false,
    };
    const raw = await this.fetchTikHubPost("/api/v1/wechat_mp/v2/fetch_article_stats", body, brandId);
    const stats = this.extractWechatArticleStats(raw);
    // 找到对应的文章 asset 并更新
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_ARTICLE" && (this.readMetaString(meta, "url") === trimmedUrl || asset.fileUrl === trimmedUrl);
    });
    if (!target) {
      throw new NotFoundException("未找到对应的文章，请先采集文章列表。");
    }
    const meta = this.asMeta(target.metadataJson);
    const updatedMetadata = {
      ...meta,
      readNum: stats.readNum,
      likeCount: stats.likeCount,
      oldLikeCount: stats.oldLikeCount,
      shareCount: stats.shareCount,
      collectCount: stats.collectCount,
      commentCount: stats.commentCount,
      starNum: stats.starNum,
      statsUpdatedAt: new Date().toISOString(),
    };
    const updated = await this.upsertCollectorAsset({
      brandId,
      kind: "WECHAT_MP_ARTICLE" as CollectorAssetKind,
      matchValue: this.readMetaString(meta, "articleId") || target.id,
      title: target.title,
      description: target.description,
      fileUrl: trimmedUrl,
      metadata: updatedMetadata,
    });
    const item = this.mapWechatMpArticle(updated);
    const workspace = await this.getWechatMpWorkspace(brandId);
    return { item, workspace };
  }

  private mapWechatMpBrandAccount(asset: AssetRecord): WechatMpBrandAccountRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: this.readMetaString(meta, "sourceAccountId") || asset.id,
      ghUsername: this.readMetaString(meta, "ghUsername") || "",
      accountName: this.readMetaString(meta, "accountName") || asset.title,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  private mapWechatMpArticle(asset: AssetRecord): WechatMpArticleRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: this.readMetaString(meta, "articleId") || asset.id,
      sourceAccountId: this.readMetaString(meta, "sourceAccountId") || "",
      ghUsername: this.readMetaString(meta, "ghUsername") || undefined,
      appMsgId: this.readMetaString(meta, "appMsgId") || undefined,
      title: asset.title,
      digest: this.readMetaString(meta, "digest") || undefined,
      url: this.readMetaString(meta, "url") || asset.fileUrl || "",
      cover: this.readMetaString(meta, "cover") || undefined,
      createTime: this.readMetaString(meta, "createTime") || undefined,
      updateTime: this.readMetaString(meta, "updateTime") || undefined,
      idx: this.readMetaNumber(meta, "idx"),
      readNum: this.readMetaNumber(meta, "readNum"),
      likeCount: this.readMetaNumber(meta, "likeCount"),
      oldLikeCount: this.readMetaNumber(meta, "oldLikeCount"),
      shareCount: this.readMetaNumber(meta, "shareCount"),
      collectCount: this.readMetaNumber(meta, "collectCount"),
      commentCount: this.readMetaNumber(meta, "commentCount"),
      starNum: this.readMetaNumber(meta, "starNum"),
      statsUpdatedAt: this.readMetaString(meta, "statsUpdatedAt") || undefined,
      articleContent: this.readMetaString(meta, "articleContent") || undefined,
      contentReadAt: this.readMetaString(meta, "contentReadAt") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  async readWechatMpArticleContent(brandId: string, articleUrl: string): Promise<{ item: WechatMpArticleRecord; workspace: WechatMpCollectionWorkspace }> {
    const trimmedUrl = String(articleUrl || "").trim();
    if (!/^https?:\/\/mp\.weixin\.qq\.com\/s([/?].+)?$/.test(trimmedUrl)) {
      throw new BadRequestException("文章链接格式不正确，需为 mp.weixin.qq.com/s/ 开头的链接。");
    }
    // 调用 GLM reader 读取网页正文
    const readerResult = await this.glmOpenService.readWebpage(brandId, trimmedUrl, {
      userId: `wechat-mp-reader-${brandId}`,
    });
    const articleContent = [readerResult.title, readerResult.content].filter(Boolean).join("\n\n");
    // 找到对应文章 asset 并更新 articleContent
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_ARTICLE" && (this.readMetaString(meta, "url") === trimmedUrl || asset.fileUrl === trimmedUrl);
    });
    if (!target) {
      throw new NotFoundException("未找到对应的文章，请先采集文章列表。");
    }
    const meta = this.asMeta(target.metadataJson);
    const updatedMetadata = {
      ...meta,
      articleContent,
      contentReadAt: new Date().toISOString(),
    };
    const updated = await this.upsertCollectorAsset({
      brandId,
      kind: "WECHAT_MP_ARTICLE" as CollectorAssetKind,
      matchValue: this.readMetaString(meta, "articleId") || target.id,
      title: target.title,
      description: target.description,
      fileUrl: trimmedUrl,
      metadata: updatedMetadata,
    });
    const item = this.mapWechatMpArticle(updated);
    const workspace = await this.getWechatMpWorkspace(brandId);
    return { item, workspace };
  }

  // ─── 公众号对标作品 ───

  async getWechatMpBenchmarkWorkspace(brandId: string): Promise<WechatMpBenchmarkWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.listCollectorAssets(brandId);
      const benchmarkAssets = assets.filter((asset) => {
        const meta = this.asMeta(asset.metadataJson);
        return this.readMetaString(meta, "kind") === "WECHAT_MP_BENCHMARK_ARTICLE";
      });
      return {
        benchmarkArticles: benchmarkAssets.map((asset) => this.mapWechatMpBenchmarkArticle(asset)),
      };
    }
    return { benchmarkArticles: [] };
  }

  async submitWechatMpBenchmarkArticle(brandId: string, articleUrl: string): Promise<{ item: WechatMpBenchmarkArticleRecord; workspace: WechatMpBenchmarkWorkspace }> {
    const trimmedUrl = String(articleUrl || "").trim();
    if (!/^https?:\/\/mp\.weixin\.qq\.com\/s([/?].+)?$/.test(trimmedUrl)) {
      throw new BadRequestException("文章链接格式不正确，需为 mp.weixin.qq.com/s/ 开头的链接。");
    }
    // 调用 GLM reader 读取网页标题和正文
    const readerResult = await this.glmOpenService.readWebpage(brandId, trimmedUrl, {
      userId: `wechat-mp-benchmark-${brandId}`,
    });
    const title = readerResult.title || "未命名文章";
    const articleContent = [readerResult.title, readerResult.content].filter(Boolean).join("\n\n");
    const articleId = `wechat_mp_benchmark_${createHash("sha256").update(trimmedUrl).digest("hex").slice(0, 24)}`;
    const asset = await this.upsertCollectorAsset({
      brandId,
      kind: "WECHAT_MP_BENCHMARK_ARTICLE" as CollectorAssetKind,
      matchValue: articleId,
      title,
      description: "微信公众号对标文章采集快照",
      fileUrl: trimmedUrl,
      metadata: {
        kind: "WECHAT_MP_BENCHMARK_ARTICLE",
        articleId,
        title,
        url: trimmedUrl,
        articleContent,
        contentReadAt: new Date().toISOString(),
        collectedAt: new Date().toISOString(),
      },
    });
    const item = this.mapWechatMpBenchmarkArticle(asset);
    const workspace = await this.getWechatMpBenchmarkWorkspace(brandId);
    return { item, workspace };
  }

  async updateWechatMpBenchmarkArticleStats(brandId: string, articleUrl: string): Promise<{ item: WechatMpBenchmarkArticleRecord; workspace: WechatMpBenchmarkWorkspace }> {
    const trimmedUrl = String(articleUrl || "").trim();
    if (!/^https?:\/\/mp\.weixin\.qq\.com\/s([/?].+)?$/.test(trimmedUrl)) {
      throw new BadRequestException("文章链接格式不正确，需为 mp.weixin.qq.com/s/ 开头的链接。");
    }
    const body: Record<string, unknown> = {
      url: trimmedUrl,
      raw: false,
    };
    const raw = await this.fetchTikHubPost("/api/v1/wechat_mp/v2/fetch_article_stats", body, brandId);
    const stats = this.extractWechatArticleStats(raw);
    // 找到对应的对标文章 asset
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_BENCHMARK_ARTICLE" && (this.readMetaString(meta, "url") === trimmedUrl || asset.fileUrl === trimmedUrl);
    });
    if (!target) {
      throw new NotFoundException("未找到对应的对标文章，请先提交链接采集。");
    }
    const meta = this.asMeta(target.metadataJson);
    const updatedMetadata = {
      ...meta,
      readNum: stats.readNum,
      likeCount: stats.likeCount,
      shareCount: stats.shareCount,
      collectCount: stats.collectCount,
      commentCount: stats.commentCount,
      starNum: stats.starNum,
      statsUpdatedAt: new Date().toISOString(),
    };
    const updated = await this.upsertCollectorAsset({
      brandId,
      kind: "WECHAT_MP_BENCHMARK_ARTICLE" as CollectorAssetKind,
      matchValue: this.readMetaString(meta, "articleId") || target.id,
      title: target.title,
      description: target.description,
      fileUrl: trimmedUrl,
      metadata: updatedMetadata,
    });
    const item = this.mapWechatMpBenchmarkArticle(updated);
    const workspace = await this.getWechatMpBenchmarkWorkspace(brandId);
    return { item, workspace };
  }

  private mapWechatMpBenchmarkArticle(asset: AssetRecord): WechatMpBenchmarkArticleRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: this.readMetaString(meta, "articleId") || asset.id,
      title: asset.title,
      articleContent: this.readMetaString(meta, "articleContent") || undefined,
      url: this.readMetaString(meta, "url") || asset.fileUrl || "",
      readNum: this.readMetaNumber(meta, "readNum"),
      likeCount: this.readMetaNumber(meta, "likeCount"),
      shareCount: this.readMetaNumber(meta, "shareCount"),
      collectCount: this.readMetaNumber(meta, "collectCount"),
      commentCount: this.readMetaNumber(meta, "commentCount"),
      starNum: this.readMetaNumber(meta, "starNum"),
      statsUpdatedAt: this.readMetaString(meta, "statsUpdatedAt") || undefined,
      contentReadAt: this.readMetaString(meta, "contentReadAt") || undefined,
      isInMaterialLibrary: this.readMetaBoolean(meta, "inMaterialLibrary") || undefined,
      materialAddedAt: this.readMetaString(meta, "materialAddedAt") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  // ─── 微信搜一搜 ───

  async getWechatSearchWorkspace(brandId: string): Promise<{ items: WechatSearchItemRecord[] }> {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.listCollectorAssets(brandId);
      const searchAssets = assets.filter((asset) => {
        const meta = this.asMeta(asset.metadataJson);
        return this.readMetaString(meta, "kind") === "WECHAT_SEARCH_ITEM";
      });
      return { items: searchAssets.map((asset) => this.mapWechatSearchItem(asset)) };
    }
    return { items: [] };
  }

  async searchWechat(
    brandId: string,
    keyword: string,
    businessType: WechatSearchBusinessType,
    sort: WechatSearchSortType,
    publishTime: WechatSearchPublishTime,
    offset: number,
  ): Promise<WechatSearchResult> {
    const trimmedKeyword = String(keyword || "").trim();
    if (!trimmedKeyword) {
      throw new BadRequestException("搜索关键词不能为空。");
    }
    const body: Record<string, unknown> = {
      keyword: trimmedKeyword,
      business_type: businessType,
      sort,
      publish_time: publishTime,
      offset,
      raw: false,
    };
    const raw = await this.fetchTikHubPost("/api/v1/wechat_search/v2/fetch_search", body, brandId);
    const data = this.asMeta(this.asMeta(raw).data);
    const continueFlag = Boolean(this.readMetaNumber(data, "continue_flag") || this.readMetaString(data, "continue_flag"));
    const nextOffset = this.readMetaNumber(data, "offset") || 0;
    const totalCount = this.readMetaNumber(data, "total") || undefined;
    const itemsRaw = (data.items as unknown[] | undefined) || [];
    const items: WechatSearchItemRecord[] = [];
    for (const itemRaw of itemsRaw) {
      const item = this.asMeta(itemRaw);
      const jumpInfo = this.asMeta(item["jumpInfo"]);
      const docId = this.readMetaString(item, "docID") || this.readMetaString(item, "doc_id") || "";
      const itemId = `wechat_search_${docId || String(items.length)}`;
      const url = this.readMetaString(item, "doc_url") || this.readMetaString(item, "url") || this.readMetaString(jumpInfo, "url") || undefined;
      // 图片：image 字段可能是字符串或数组
      const imageRaw = item["image"];
      let images: string[] | undefined;
      if (Array.isArray(imageRaw)) {
        images = (imageRaw as unknown[]).map((img) => (typeof img === "string" ? img : this.readMetaString(this.asMeta(img), "url"))).filter(Boolean);
      } else if (typeof imageRaw === "string" && imageRaw) {
        images = [imageRaw];
      }
      // 发布时间：pubTime 是秒级时间戳
      const pubTime = this.readMetaNumber(item, "pubTime") || this.readMetaNumber(item, "pub_time") || this.readMetaNumber(item, "createTime");
      const publishTimeText = this.formatUnixTimestampText(pubTime);
      items.push({
        id: itemId,
        title: this.readMetaString(item, "title") || "",
        desc: this.readMetaString(item, "desc") || undefined,
        docId: docId || undefined,
        accTypeName: this.readMetaString(item, "accTypeName") || undefined,
        url,
        images,
        publishTime: publishTimeText,
        jumpInfoUserName: this.readMetaString(jumpInfo, "userName") || undefined,
        jumpInfoNickName: this.readMetaString(jumpInfo, "nickName") || undefined,
        jumpInfoSignature: this.readMetaString(jumpInfo, "signature") || undefined,
        collectedAt: new Date().toISOString(),
      });
    }
    // 存储搜索结果到 BusinessAsset
    for (const item of items) {
      await this.upsertCollectorAsset({
        brandId,
        kind: "WECHAT_SEARCH_ITEM" as CollectorAssetKind,
        matchValue: item.id,
        title: item.title,
        description: "微信搜一搜结果采集快照",
        fileUrl: item.url,
        metadata: {
          kind: "WECHAT_SEARCH_ITEM",
          itemId: item.id,
          title: item.title,
          desc: item.desc,
          docId: item.docId,
          accTypeName: item.accTypeName,
          url: item.url,
          images: item.images,
          publishTime: item.publishTime,
          jumpInfoUserName: item.jumpInfoUserName,
          jumpInfoNickName: item.jumpInfoNickName,
          jumpInfoSignature: item.jumpInfoSignature,
          readNum: item.readNum,
          likeCount: item.likeCount,
          shareCount: item.shareCount,
          collectCount: item.collectCount,
          commentCount: item.commentCount,
          starNum: item.starNum,
          statsUpdatedAt: item.statsUpdatedAt,
          articleContent: item.articleContent,
          contentReadAt: item.contentReadAt,
          collectedAt: item.collectedAt,
        },
      });
    }
    return {
      keyword: this.readMetaString(data, "keyword") || trimmedKeyword,
      businessType: this.readMetaString(data, "business_type") || businessType,
      total: totalCount,
      continueFlag,
      offset: nextOffset,
      count: items.length,
      items,
    };
  }

  private mapWechatSearchItem(asset: AssetRecord): WechatSearchItemRecord {
    const meta = this.asMeta(asset.metadataJson);
    const imagesRaw = meta["images"];
    let images: string[] | undefined;
    if (Array.isArray(imagesRaw)) {
      images = (imagesRaw as unknown[]).map((img) => (typeof img === "string" ? img : this.readMetaString(this.asMeta(img), "url"))).filter(Boolean);
    } else if (typeof imagesRaw === "string" && imagesRaw) {
      images = [imagesRaw];
    }
    return {
      id: this.readMetaString(meta, "itemId") || asset.id,
      title: asset.title,
      articleContent: this.readMetaString(meta, "articleContent") || undefined,
      desc: this.readMetaString(meta, "desc") || undefined,
      docId: this.readMetaString(meta, "docId") || undefined,
      accTypeName: this.readMetaString(meta, "accTypeName") || undefined,
      url: this.readMetaString(meta, "url") || asset.fileUrl || undefined,
      images,
      publishTime: this.readMetaString(meta, "publishTime") || undefined,
      jumpInfoUserName: this.readMetaString(meta, "jumpInfoUserName") || undefined,
      jumpInfoNickName: this.readMetaString(meta, "jumpInfoNickName") || undefined,
      jumpInfoSignature: this.readMetaString(meta, "jumpInfoSignature") || undefined,
      readNum: this.readMetaNumber(meta, "readNum"),
      likeCount: this.readMetaNumber(meta, "likeCount"),
      shareCount: this.readMetaNumber(meta, "shareCount"),
      collectCount: this.readMetaNumber(meta, "collectCount"),
      commentCount: this.readMetaNumber(meta, "commentCount"),
      starNum: this.readMetaNumber(meta, "starNum"),
      statsUpdatedAt: this.readMetaString(meta, "statsUpdatedAt") || undefined,
      contentReadAt: this.readMetaString(meta, "contentReadAt") || undefined,
      isInMaterialLibrary: this.readMetaBoolean(meta, "inMaterialLibrary") || undefined,
      materialAddedAt: this.readMetaString(meta, "materialAddedAt") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  async updateWechatSearchItemContent(brandId: string, articleUrl: string): Promise<{ item: WechatSearchItemRecord; workspace: { items: WechatSearchItemRecord[] } }> {
    const trimmedUrl = String(articleUrl || "").trim();
    if (!trimmedUrl) {
      throw new BadRequestException("文章链接不能为空。");
    }
    // 调用 GLM reader 读取正文
    const readerResult = await this.glmOpenService.readWebpage(brandId, trimmedUrl, {
      userId: `wechat-search-reader-${brandId}`,
    });
    const articleContent = [readerResult.title, readerResult.content].filter(Boolean).join("\n\n");
    // 找到对应的搜索结果 asset
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_SEARCH_ITEM" && (this.readMetaString(meta, "url") === trimmedUrl || asset.fileUrl === trimmedUrl);
    });
    if (!target) {
      throw new NotFoundException("未找到对应的搜索结果，请先搜索。");
    }
    const meta = this.asMeta(target.metadataJson);
    const updatedMetadata = {
      ...meta,
      articleContent,
      contentReadAt: new Date().toISOString(),
    };
    const updated = await this.upsertCollectorAsset({
      brandId,
      kind: "WECHAT_SEARCH_ITEM" as CollectorAssetKind,
      matchValue: this.readMetaString(meta, "itemId") || target.id,
      title: target.title,
      description: target.description,
      fileUrl: trimmedUrl,
      metadata: updatedMetadata,
    });
    const item = this.mapWechatSearchItem(updated);
    const workspace = await this.getWechatSearchWorkspace(brandId);
    return { item, workspace };
  }

  async updateWechatSearchItemStats(brandId: string, articleUrl: string): Promise<{ item: WechatSearchItemRecord; workspace: { items: WechatSearchItemRecord[] } }> {
    const trimmedUrl = String(articleUrl || "").trim();
    if (!trimmedUrl) {
      throw new BadRequestException("文章链接不能为空。");
    }
    const body: Record<string, unknown> = {
      url: trimmedUrl,
      raw: false,
    };
    const raw = await this.fetchTikHubPost("/api/v1/wechat_mp/v2/fetch_article_stats", body, brandId);
    const stats = this.extractWechatArticleStats(raw);
    // 找到对应的搜索结果 asset
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_SEARCH_ITEM" && (this.readMetaString(meta, "url") === trimmedUrl || asset.fileUrl === trimmedUrl);
    });
    if (!target) {
      throw new NotFoundException("未找到对应的搜索结果，请先搜索。");
    }
    const meta = this.asMeta(target.metadataJson);
    const updatedMetadata = {
      ...meta,
      readNum: stats.readNum,
      likeCount: stats.likeCount,
      shareCount: stats.shareCount,
      collectCount: stats.collectCount,
      commentCount: stats.commentCount,
      starNum: stats.starNum,
      statsUpdatedAt: new Date().toISOString(),
    };
    const updated = await this.upsertCollectorAsset({
      brandId,
      kind: "WECHAT_SEARCH_ITEM" as CollectorAssetKind,
      matchValue: this.readMetaString(meta, "itemId") || target.id,
      title: target.title,
      description: target.description,
      fileUrl: trimmedUrl,
      metadata: updatedMetadata,
    });
    const item = this.mapWechatSearchItem(updated);
    const workspace = await this.getWechatSearchWorkspace(brandId);
    return { item, workspace };
  }

  private extractWechatArticleStats(raw: unknown) {
    return {
      readNum: this.pickNumber(raw, ["read_num", "readNum", "read_count", "readCount", "int_page_read_count", "page_read_count"]),
      likeCount: this.pickNumber(raw, ["like_count", "likeCount", "like_num", "liked_count", "likedCount"]),
      oldLikeCount: this.pickNumber(raw, ["old_like_count", "oldLikeCount", "old_like_num"]),
      shareCount: this.pickNumber(raw, ["share_count", "shareCount", "shared_count", "share_num"]),
      collectCount: this.pickNumber(raw, ["collect_count", "collectCount", "collected_count", "collect_num"]),
      commentCount: this.pickNumber(raw, ["comment_count", "commentCount", "comments_count", "comment_num"]),
      starNum: this.pickNumber(raw, ["star_num", "starNum", "star_count", "favorite_count"]),
    };
  }

  // ─── 删除方法 ───

  async deleteWechatMpArticle(brandId: string, articleId: string): Promise<{ workspace: WechatMpCollectionWorkspace }> {
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_ARTICLE" && this.readMetaString(meta, "articleId") === articleId;
    });
    if (target) {
      await this.deleteCollectorAssetById(brandId, target.id);
    }
    const workspace = await this.getWechatMpWorkspace(brandId);
    return { workspace };
  }

  async deleteWechatMpBenchmarkArticle(brandId: string, articleId: string): Promise<{ workspace: WechatMpBenchmarkWorkspace }> {
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_BENCHMARK_ARTICLE" && this.readMetaString(meta, "articleId") === articleId;
    });
    if (target) {
      await this.deleteCollectorAssetById(brandId, target.id);
    }
    const workspace = await this.getWechatMpBenchmarkWorkspace(brandId);
    return { workspace };
  }

  async deleteWechatSearchItem(brandId: string, itemId: string): Promise<{ workspace: { items: WechatSearchItemRecord[] } }> {
    const assets = await this.listCollectorAssets(brandId);
    const target = assets.find((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_SEARCH_ITEM" && this.readMetaString(meta, "itemId") === itemId;
    });
    if (target) {
      await this.deleteCollectorAssetById(brandId, target.id);
    }
    const workspace = await this.getWechatSearchWorkspace(brandId);
    return { workspace };
  }

  private async findWechatBenchmarkArticleAssetByArticleId(brandId: string, articleId: string) {
    const assets = await this.listCollectorAssets(brandId);
    const asset = assets.find((candidate) => {
      const meta = this.asMeta(candidate.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_MP_BENCHMARK_ARTICLE"
        && this.readMetaString(meta, "articleId") === articleId;
    });
    if (!asset) {
      throw new NotFoundException("未找到对应的公众号对标文章。");
    }
    return asset;
  }

  private async findWechatSearchItemAssetByItemId(brandId: string, itemId: string) {
    const assets = await this.listCollectorAssets(brandId);
    const asset = assets.find((candidate) => {
      const meta = this.asMeta(candidate.metadataJson);
      return this.readMetaString(meta, "kind") === "WECHAT_SEARCH_ITEM"
        && this.readMetaString(meta, "itemId") === itemId;
    });
    if (!asset) {
      throw new NotFoundException("未找到对应的微信搜一搜结果。");
    }
    return asset;
  }
}
