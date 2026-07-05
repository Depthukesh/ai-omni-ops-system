import { jsonRequest, request } from "./http";
import { type WechatArticleDraftRecord, type WechatWorkflowSessionRecord } from "./works";

export type XiaohongshuMobileDraftSession = {
  taskId: string;
  token: string;
  platform: "XIAOHONGSHU";
  mode: "SAVE_DRAFT";
  channel: "MOBILE_QR";
  status: "QUEUED" | "SUCCESS" | "FAILED";
  title: string;
  content: string;
  imageUrls: string[];
  coverImageUrl?: string;
  hashtags: string[];
  accountId?: string;
  accountName?: string;
  accountLink?: string;
  workId: string;
  workKind: "ORIGINAL" | "REWRITE";
  noteCategory: "原创" | "二创";
  noteType: "图文";
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
  apiBaseUrl: string;
  mobileUrl: string;
  openAppUrl: string;
  completedAt?: string;
  note?: string;
  accessHint?: string;
};

export type XiaohongshuDesktopDraftSession = {
  taskId: string;
  token: string;
  platform: "XIAOHONGSHU";
  mode: "SAVE_DRAFT";
  channel: "BROWSER_EXTENSION";
  status: "QUEUED" | "SUCCESS" | "FAILED";
  title: string;
  content: string;
  imageUrls: string[];
  coverImageUrl?: string;
  hashtags: string[];
  accountId?: string;
  accountName?: string;
  accountLink?: string;
  workId: string;
  workKind: "ORIGINAL" | "REWRITE";
  noteCategory: "原创" | "二创";
  noteType: "图文";
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
  creatorUrl: string;
  launchStrategy: "BROWSER_EXTENSION_AUTOFILL";
  completedAt?: string;
  note?: string;
  accessHint?: string;
};

export type DouyinMobilePublishSession = {
  taskId: string;
  token: string;
  platform: "DOUYIN";
  mode: "PUBLISH_VIDEO";
  channel: "MOBILE_QR";
  status: "QUEUED" | "SUCCESS" | "FAILED";
  title: string;
  content: string;
  videoUrl: string;
  coverImageUrl?: string;
  hashtags: string[];
  accountId?: string;
  accountName?: string;
  accountLink?: string;
  workId: string;
  workKind: "VIDEO_STORYBOARD" | "VIDEO_DIRECT" | "DIGITAL_HUMAN" | "OPENCLAW_VIDEO";
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
  apiBaseUrl: string;
  mobileUrl: string;
  openAppUrl: string;
  completedAt?: string;
  note?: string;
  accessHint?: string;
};

export type DouyinDesktopPublishSession = {
  taskId: string;
  token: string;
  platform: "DOUYIN";
  mode: "PREPARE_PUBLISH";
  channel: "BROWSER_EXTENSION";
  status: "QUEUED" | "SUCCESS" | "FAILED";
  title: string;
  content: string;
  videoUrl: string;
  coverImageUrl?: string;
  hashtags: string[];
  accountId?: string;
  accountName?: string;
  accountLink?: string;
  workId: string;
  workKind: "VIDEO_STORYBOARD" | "VIDEO_DIRECT" | "DIGITAL_HUMAN" | "OPENCLAW_VIDEO";
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
  creatorUrl: string;
  launchStrategy: "BROWSER_EXTENSION_AUTOFILL";
  completedAt?: string;
  note?: string;
  accessHint?: string;
};

export type WechatOfficialArticlePublishResult = {
  task: { id: string; taskStatus: string; taskTitle: string };
  item: WechatArticleDraftRecord;
};

export type WechatWorkflowPublishResult = {
  task: { id: string; taskStatus: string; taskTitle: string };
  item: WechatWorkflowSessionRecord;
  draft: WechatArticleDraftRecord;
};

export async function createXiaohongshuMobileDraftSession(
  brandId: string,
  workId: string,
  payload: { accountId?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: XiaohongshuMobileDraftSession }>(
    `/publishing/brands/${brandId}/xiaohongshu/works/${workId}/mobile-draft-session`,
    "POST",
    payload,
  );
}

export async function getXiaohongshuMobileDraftSession(token: string) {
  return request<{ session: XiaohongshuMobileDraftSession }>(`/publishing/xiaohongshu/mobile-sessions/${token}`);
}

export async function createXiaohongshuDesktopDraftSession(
  brandId: string,
  workId: string,
  payload: { accountId?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: XiaohongshuDesktopDraftSession }>(
    `/publishing/brands/${brandId}/xiaohongshu/works/${workId}/desktop-draft-session`,
    "POST",
    payload,
  );
}

export async function getXiaohongshuDesktopDraftSession(token: string) {
  return request<{ session: XiaohongshuDesktopDraftSession }>(`/publishing/xiaohongshu/desktop-sessions/${token}`);
}

export async function completeXiaohongshuMobileDraftSession(
  token: string,
  payload: { result?: "SUCCESS" | "FAILED"; note?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: XiaohongshuMobileDraftSession }>(
    `/publishing/xiaohongshu/mobile-sessions/${token}/complete`,
    "POST",
    payload,
  );
}

export async function completeXiaohongshuDesktopDraftSession(
  token: string,
  payload: { result?: "SUCCESS" | "FAILED"; note?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: XiaohongshuDesktopDraftSession }>(
    `/publishing/xiaohongshu/desktop-sessions/${token}/complete`,
    "POST",
    payload,
  );
}

export async function createDouyinMobilePublishSession(
  brandId: string,
  workId: string,
  payload: { accountId?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: DouyinMobilePublishSession }>(
    `/publishing/brands/${brandId}/douyin/works/${workId}/mobile-publish-session`,
    "POST",
    payload,
  );
}

export async function getDouyinMobilePublishSession(token: string) {
  return request<{ session: DouyinMobilePublishSession }>(`/publishing/douyin/mobile-sessions/${token}`);
}

export async function createDouyinDesktopPublishSession(
  brandId: string,
  workId: string,
  payload: { accountId?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: DouyinDesktopPublishSession }>(
    `/publishing/brands/${brandId}/douyin/works/${workId}/desktop-publish-session`,
    "POST",
    payload,
  );
}

export async function getDouyinDesktopPublishSession(token: string) {
  return request<{ session: DouyinDesktopPublishSession }>(`/publishing/douyin/desktop-sessions/${token}`);
}

export async function completeDouyinMobilePublishSession(
  token: string,
  payload: { result?: "SUCCESS" | "FAILED"; note?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: DouyinMobilePublishSession }>(
    `/publishing/douyin/mobile-sessions/${token}/complete`,
    "POST",
    payload,
  );
}

export async function completeDouyinDesktopPublishSession(
  token: string,
  payload: { result?: "SUCCESS" | "FAILED"; note?: string } = {},
) {
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: DouyinDesktopPublishSession }>(
    `/publishing/douyin/desktop-sessions/${token}/complete`,
    "POST",
    payload,
  );
}

export async function publishWechatArticleToOfficialAccount(
  brandId: string,
  draftId: string,
  payload: { mode?: "PUBLISH_ARTICLE" } = {},
) {
  return jsonRequest<WechatOfficialArticlePublishResult>(
    `/publishing/brands/${brandId}/wechat/articles/${draftId}/publish`,
    "POST",
    payload,
  );
}

export async function publishWechatWorkflowToOfficialAccount(
  brandId: string,
  workflowId: string,
  payload: { mode?: "PUBLISH_WORKFLOW" } = {},
) {
  return jsonRequest<WechatWorkflowPublishResult>(
    `/publishing/brands/${brandId}/wechat/workflows/${workflowId}/publish`,
    "POST",
    payload,
  );
}

export async function retryWechatWorkflowPublishToOfficialAccount(
  brandId: string,
  historyId: string,
  payload: { mode?: "RETRY_PUBLISH_WORKFLOW" } = {},
) {
  return jsonRequest<WechatWorkflowPublishResult>(
    `/publishing/brands/${brandId}/wechat/publish-history/${historyId}/retry`,
    "POST",
    payload,
  );
}
