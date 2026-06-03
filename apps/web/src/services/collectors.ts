import { getStoredCurrentBrandId } from "./auth-session";
import { DEMO_BRAND_ID } from "./brand-growth";
import { jsonRequest, request } from "./http";

export type XhsCollectedAccountRecord = {
  id: string;
  kind: "XHS_BRAND_ACCOUNT" | "XHS_COMPETITOR_ACCOUNT";
  sourceAccountId: string;
  sourceAccountLink: string;
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
  syncStatus?: "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
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
  collectedAt: string;
  syncStatus: "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
  retryCount: number;
  nextRetryAt?: string;
  lastError?: string;
};

export type XhsCollectionWorkspace = {
  brandAccounts: XhsCollectedAccountRecord[];
  competitorAccounts: XhsCollectedAccountRecord[];
  brandNotes: XhsCollectedNoteRecord[];
  benchmarkNotes: XhsCollectedNoteRecord[];
  targetUsers: XhsCollectedTargetUserRecord[];
};

export type DouyinCollectedAccountRecord = {
  id: string;
  kind: "DOUYIN_BRAND_ACCOUNT" | "DOUYIN_COMPETITOR_ACCOUNT";
  sourceAccountId: string;
  sourceAccountLink?: string;
  accountLink?: string;
  externalUserId?: string;
  accountName: string;
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
  rawFields?: Record<string, unknown>;
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

export type DouyinCollectedWorkRecord = {
  id: string;
  kind:
    | "DOUYIN_BRAND_WORK"
    | "DOUYIN_BENCHMARK_WORK"
    | "DOUYIN_LOW_FAN_EXPLOSIVE_WORK"
    | "DOUYIN_HIGH_COMPLETION_RATE_WORK"
    | "DOUYIN_HIGH_LIKE_RATE_WORK";
  sourceAccountId: string;
  sourceAccountLink?: string;
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
  rawFields?: Record<string, unknown>;
  isInMaterialLibrary?: boolean;
  materialAddedAt?: string;
  billboardLabel?: string;
  primaryTagLabel?: string;
  secondaryTagLabel?: string;
  score?: number;
};
export type DouyinCityHotspotRecord = {
  id: string;
  kind: "DOUYIN_CITY_HOTSPOT";
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

export type DouyinCollectionWorkspace = {
  brandAccounts: DouyinCollectedAccountRecord[];
  competitorAccounts: DouyinCollectedAccountRecord[];
  brandWorks: DouyinCollectedWorkRecord[];
  benchmarkWorks: DouyinCollectedWorkRecord[];
  lowFanExplosiveWorks: DouyinCollectedWorkRecord[];
  highCompletionRateWorks: DouyinCollectedWorkRecord[];
  highLikeRateWorks: DouyinCollectedWorkRecord[];
  cityHotspots: DouyinCityHotspotRecord[];
  contentTags: DouyinContentTagOption[];
  cityOptions: DouyinCityOption[];
};

export type WechatArticleDetailRecord = {
  id: string;
  kind: "WECHAT_MP_ARTICLE_DETAIL";
  queryUrl: string;
  articleUrl: string;
  title: string;
  author?: string;
  htmlContent?: string;
  collectedAt: string;
};

export type WechatOfficialAccountRecord = {
  id: string;
  kind: "WECHAT_OFFICIAL_ACCOUNT";
  keyword: string;
  accountName: string;
  accountLink?: string;
  collectedAt: string;
};

export type WechatArticleSearchRecord = {
  id: string;
  kind: "WECHAT_ARTICLE_SEARCH";
  keyword: string;
  title: string;
  articleLink?: string;
  collectedAt: string;
};

export type WechatCollectionWorkspace = {
  articleDetails: WechatArticleDetailRecord[];
  officialAccounts: WechatOfficialAccountRecord[];
  articles: WechatArticleSearchRecord[];
};

export type DouyinSyncPayload = {
  scope?:
    | "brandAccount"
    | "competitorAccount"
    | "brandWorks"
    | "benchmarkWorks"
    | "lowFanExplosiveWorks"
    | "highCompletionRateWorks"
    | "highLikeRateWorks"
    | "cityHotspots";
  brandAccountLinks?: string[];
  competitorAccountLinks?: string[];
  benchmarkAwemeIds?: string[];
  contentTagSelection?: {
    primaryTagId?: number;
    secondaryTagId?: number;
  };
  cityCode?: number;
};

export type WechatSyncPayload = {
  scope?: "articleDetail" | "officialAccountSearch" | "articleSearch";
  articleDetailUrl?: string;
  officialAccountKeyword?: string;
  officialAccountOffset?: number;
  officialAccountSortType?: "_0" | "_2" | "_4";
  articleKeyword?: string;
  articleOffset?: number;
  articleSortType?: "_0" | "_2" | "_4";
};

export const xhsCollectionSeed: XhsCollectionWorkspace = {
  brandAccounts: [
    {
      id: "ast_demo_xhs_brand_account_001",
      kind: "XHS_BRAND_ACCOUNT",
      sourceAccountId: "acc_demo_001",
      sourceAccountLink: "https://www.xiaohongshu.com/user/profile/demo",
      accountName: "武汉仟吉烘焙",
      externalUserId: "xhs_brand_demo_001",
      postedCount: 18,
      likedCount: 3680,
      collectedCount: 920,
      avatar: "https://oss.example.com/avatar/qianji.png",
      description: "区域烘焙品牌官方账号",
      ipLocation: "湖北",
      followCount: 126,
      fanCount: 12680,
      collectedAt: "2026-05-02T09:10:00.000Z",
    },
  ],
  competitorAccounts: [
    {
      id: "ast_demo_xhs_competitor_account_001",
      kind: "XHS_COMPETITOR_ACCOUNT",
      sourceAccountId: "cmp_demo_001",
      sourceAccountLink: "https://www.xiaohongshu.com/user/profile/comp-a",
      accountName: "区域烘焙竞品A",
      externalUserId: "xhs_comp_demo_001",
      postedCount: 32,
      likedCount: 5820,
      collectedCount: 1430,
      avatar: "https://oss.example.com/avatar/comp-a.png",
      description: "区域竞品小红书账号",
      ipLocation: "上海",
      followCount: 215,
      fanCount: 28400,
      collectedAt: "2026-05-02T09:12:00.000Z",
    },
  ],
  brandNotes: [
    {
      id: "ast_demo_xhs_note_001",
      sourceAccountId: "acc_demo_001",
      noteId: "demo-note-001",
      title: "武汉仟吉爆浆提拉米苏值得买吗？",
      noteType: "nomal",
      nickname: "武汉仟吉烘焙",
      imageList: ["https://oss.example.com/demo/note-001-1.jpg", "https://oss.example.com/demo/note-001-2.jpg"],
      externalUserId: "xhs_brand_demo_001",
      noteUrl: "https://www.xiaohongshu.com/explore/demo-note-001",
      description: "门店新品种草向图文笔记",
      likeCount: 186,
      collectCount: 92,
      createdAtText: "2026-05-02 09:15:00",
      shareCount: 24,
      commentCount: 16,
      videoUrl: undefined,
      collectedAt: "2026-05-02T09:15:00.000Z",
    },
  ],
  benchmarkNotes: [],
  targetUsers: [],
};

export const douyinCollectionSeed: DouyinCollectionWorkspace = {
  brandAccounts: [
    {
      id: "ast_demo_douyin_brand_account_001",
      kind: "DOUYIN_BRAND_ACCOUNT",
      sourceAccountId: "MS4wLjABAAAA-brand-demo",
      externalUserId: "92163827336",
      accountName: "品牌抖音示例账号",
      username: "brand_demo",
      shortId: "BD2026",
      accountLink: "https://www.douyin.com/user/MS4wLjABAAAA-brand-demo",
      description: "品牌官方账号，日常发布新品、门店活动与短视频内容。",
      postedCount: 128,
      likedCount: 3480000,
      fanCount: 126000,
      followCount: 128,
      ipLocation: "湖北",
      enterpriseVerifyReason: "品牌官方账号",
      customVerify: "本地生活品牌",
      collectedAt: "2026-05-20T08:00:00.000Z",
    },
  ],
  competitorAccounts: [
    {
      id: "ast_demo_douyin_competitor_account_001",
      kind: "DOUYIN_COMPETITOR_ACCOUNT",
      sourceAccountId: "MS4wLjABAAAA-competitor-demo",
      externalUserId: "88210000123",
      accountName: "竞品抖音示例账号",
      username: "competitor_demo",
      shortId: "CP2026",
      accountLink: "https://www.douyin.com/user/MS4wLjABAAAA-competitor-demo",
      description: "区域竞品账号，内容重心偏活动引流与门店转化。",
      postedCount: 216,
      likedCount: 5210000,
      fanCount: 208000,
      followCount: 96,
      ipLocation: "上海",
      enterpriseVerifyReason: "企业认证",
      customVerify: "区域烘焙连锁",
      collectedAt: "2026-05-20T08:02:00.000Z",
    },
  ],
  brandWorks: [
    {
      id: "ast_demo_douyin_brand_work_001",
      kind: "DOUYIN_BRAND_WORK",
      sourceAccountId: "MS4wLjABAAAA-brand-demo",
      workId: "7592116912205630761",
      title: "新品上新图文示例",
      description: "围绕新品口味、门店场景和转化话术展开的图文作品。",
      workType: "图文",
      authorName: "品牌抖音示例账号",
      authorUniqueId: "brand_demo",
      externalUserId: "92163827336",
      workUrl: "https://www.douyin.com/note/7592116912205630761",
      hashtags: ["新品上新", "门店活动", "本地生活"],
      publishTimeText: "2026-05-20 00:31:28",
      musicTitle: "作品原声",
      musicAuthor: "品牌抖音示例账号",
      likeCount: 4567,
      playCount: 238961,
      shareCount: 69,
      commentCount: 128,
      collectCount: 245,
      downloadCount: 0,
      statsPatched: true,
      collectedAt: "2026-05-20T08:05:00.000Z",
    },
  ],
  benchmarkWorks: [
    {
      id: "ast_demo_douyin_benchmark_work_001",
      kind: "DOUYIN_BENCHMARK_WORK",
      sourceAccountId: "MS4wLjABAAAA-competitor-demo",
      workId: "7126745726494821640",
      title: "竞品爆款短视频示例",
      description: "竞品围绕节日热点制作的高播放视频，用于后续对标分析。",
      workType: "短视频",
      authorName: "竞品抖音示例账号",
      authorUniqueId: "competitor_demo",
      externalUserId: "88210000123",
      workUrl: "https://www.douyin.com/video/7126745726494821640",
      hashtags: ["节日营销", "门店爆款", "转化视频"],
      publishTimeText: "2026-05-20 00:18:31",
      durationMs: 32000,
      musicTitle: "热门 BGM",
      musicAuthor: "平台音乐库",
      likeCount: 36566,
      playCount: 1222750,
      shareCount: 8491,
      commentCount: 962,
      collectCount: 2215,
      downloadCount: 4515,
      likeCollectRatio: 16.51,
      likeCommentRatio: 38,
      shareRatio: 0.69,
      isExplosive: "是",
      followUpDecision: "待拆解脚本",
      statsPatched: true,
      collectedAt: "2026-05-20T08:08:00.000Z",
    },
  ],
  lowFanExplosiveWorks: [],
  highCompletionRateWorks: [],
  highLikeRateWorks: [],
  cityHotspots: [],
  contentTags: [],
  cityOptions: [],
};

export async function getDouyinCollectionWorkspace(brandId?: string) {
  return request<DouyinCollectionWorkspace>(`/collectors/douyin/brands/${resolveBrandId(brandId)}/workspace`);
}

export async function syncDouyinCollectionWorkspace(payload: DouyinSyncPayload = {}, brandId?: string) {
  return jsonRequest<{
    syncedCount: number;
    breakdown: {
      brandAccounts: number;
      competitorAccounts: number;
      brandWorks: number;
      benchmarkWorks: number;
      lowFanExplosiveWorks: number;
      highCompletionRateWorks: number;
      highLikeRateWorks: number;
      cityHotspots: number;
    };
    warnings?: string[];
    workspace: DouyinCollectionWorkspace;
  }>(
    `/collectors/douyin/brands/${resolveBrandId(brandId)}/sync`,
    "POST",
    payload,
  );
}

export async function getWechatCollectionWorkspace(brandId?: string) {
  return request<WechatCollectionWorkspace>(`/collectors/wechat/brands/${resolveBrandId(brandId)}/workspace`);
}

export async function syncWechatCollectionWorkspace(payload: WechatSyncPayload = {}, brandId?: string) {
  return jsonRequest<{
    syncedCount: number;
    breakdown: {
      articleDetails: number;
      officialAccounts: number;
      articles: number;
    };
    warnings?: string[];
    workspace: WechatCollectionWorkspace;
  }>(
    `/collectors/wechat/brands/${resolveBrandId(brandId)}/sync`,
    "POST",
    payload,
  );
}

export async function addDouyinBenchmarkWorkToMaterialLibrary(assetId: string, brandId?: string) {
  return jsonRequest<{ item: DouyinCollectedWorkRecord; workspace: DouyinCollectionWorkspace }>(
    `/collectors/douyin/brands/${resolveBrandId(brandId)}/material-library`,
    "POST",
    { assetId },
  );
}

export async function removeDouyinBenchmarkWorkFromMaterialLibrary(assetId: string, brandId?: string) {
  return jsonRequest<{ item: DouyinCollectedWorkRecord; workspace: DouyinCollectionWorkspace }>(
    `/collectors/douyin/brands/${resolveBrandId(brandId)}/material-library/${assetId}`,
    "DELETE",
    {},
  );
}

function resolveBrandId(brandId?: string) {
  return brandId || getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID;
}

export async function getXiaohongshuCollectionWorkspace(brandId?: string) {
  return request<XhsCollectionWorkspace>(`/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/workspace`);
}

export async function syncXiaohongshuBrandAccounts(brandId?: string) {
  return jsonRequest<{ syncedCount: number; workspace: XhsCollectionWorkspace }>(
    `/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/brand-accounts/sync`,
    "POST",
    {},
  );
}

export async function syncXiaohongshuCompetitorAccounts(brandId?: string) {
  return jsonRequest<{ syncedCount: number; workspace: XhsCollectionWorkspace }>(
    `/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/competitor-accounts/sync`,
    "POST",
    {},
  );
}

export async function syncXiaohongshuBrandNotes(brandId?: string) {
  return jsonRequest<{ syncedCount: number; workspace: XhsCollectionWorkspace }>(
    `/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/brand-notes/sync`,
    "POST",
    {},
  );
}

export async function syncXiaohongshuBenchmarkNotes(sourceUrls: string[], brandId?: string) {
  return jsonRequest<{ syncedCount: number; workspace: XhsCollectionWorkspace }>(
    `/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/benchmark-notes/sync`,
    "POST",
    { sourceUrls },
  );
}

export async function syncXiaohongshuTargetUsers(sourceUrls: string[], brandId?: string) {
  return jsonRequest<{ syncedCount: number; workspace: XhsCollectionWorkspace }>(
    `/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/target-users/sync`,
    "POST",
    { sourceUrls },
  );
}

export async function syncXiaohongshuFromFeishu(brandId?: string) {
  return jsonRequest<{
    syncedCount: number;
    tableCount: number;
    workspace: XhsCollectionWorkspace;
    matchedTables: {
      brandAccounts: { tableId: string; tableName: string } | null;
      competitorAccounts: { tableId: string; tableName: string } | null;
      brandNotes: { tableId: string; tableName: string } | null;
      benchmarkNotes: { tableId: string; tableName: string } | null;
      targetUsers: { tableId: string; tableName: string } | null;
    };
    syncBreakdown: {
      brandAccounts: number;
      competitorAccounts: number;
      brandNotes: number;
      benchmarkNotes: number;
      targetUsers: number;
    };
    workspaceCounts: {
      brandAccounts: number;
      competitorAccounts: number;
      brandNotes: number;
      benchmarkNotes: number;
      targetUsers: number;
    };
  }>(
    `/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/feishu-sync`,
    "POST",
    {},
  );
}

export async function addBenchmarkNoteToMaterialLibrary(assetId: string, brandId?: string) {
  return jsonRequest<{ item: XhsCollectedNoteRecord; workspace: XhsCollectionWorkspace }>(
    `/collectors/xiaohongshu/brands/${resolveBrandId(brandId)}/material-library`,
    "POST",
    { assetId },
  );
}
