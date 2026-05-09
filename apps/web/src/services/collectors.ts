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

function resolveBrandId(brandId?: string) {
  return getStoredCurrentBrandId(brandId || DEMO_BRAND_ID) || DEMO_BRAND_ID;
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
  return jsonRequest<{ syncedCount: number; tableCount: number; workspace: XhsCollectionWorkspace }>(
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
