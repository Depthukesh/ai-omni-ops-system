import { jsonRequest, request, requestBlobByUrl } from "./http";
import { type DouyinDesktopPublishSession } from "./publishing";

export type OpenClawInstallTokenRecord = {
  id: string;
  brandId: string;
  createdByUserId: string;
  tokenName: string;
  tokenPreview: string;
  status: "ACTIVE" | "REVOKED";
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawInstallWorkspace = {
  brandId: string;
  brandName: string;
  role: string;
  canManage: boolean;
  mcpServerName: string;
  mcpUrl: string;
  activeToken?: OpenClawInstallTokenRecord;
  snippetTemplates: {
    openclaw: string;
    workbuddy: string;
    cursor: string;
    claudeDesktop: string;
    mcpEndpoint: string;
  };
  skillGuide: {
    title: string;
    summary: string;
    examples: string[];
  };
  skillInstall: {
    title: string;
    summary: string;
    status: "ready" | "beta";
    statusLabel: string;
    installTarget: string;
    steps: string[];
    fileName: string;
    downloadPath: string;
    githubTreeUrl: string;
    githubRef: string;
    githubPrompt: string;
    notes: string[];
  };
  relationshipGuide: {
    title: string;
    items: Array<{
      label: string;
      summary: string;
    }>;
  };
  deliveryChecklist: {
    title: string;
    summary: string;
    items: string[];
  };
  docs: Array<{
    label: string;
    url: string;
  }>;
};

export type RotateOpenClawInstallTokenResult = {
  token: string;
  record: OpenClawInstallTokenRecord;
  workspace: OpenClawInstallWorkspace;
};

export type RevealOpenClawInstallTokenResult = {
  tokenId: string;
  token: string;
};

export async function getOpenClawInstallationWorkspace() {
  return request<OpenClawInstallWorkspace>("/openclaw/installation-hub");
}

export async function rotateOpenClawInstallToken(payload?: {
  tokenName?: string;
  expiresInDays?: number;
}) {
  return jsonRequest<RotateOpenClawInstallTokenResult>("/openclaw/installation-hub/tokens/rotate", "POST", payload || {});
}

export async function revokeOpenClawInstallToken(tokenId: string) {
  return request<{ success: boolean; tokenId: string; workspace: OpenClawInstallWorkspace }>(`/openclaw/installation-hub/tokens/${tokenId}`, {
    method: "DELETE",
  });
}

export async function revealOpenClawInstallToken(tokenId: string) {
  return request<RevealOpenClawInstallTokenResult>(`/openclaw/installation-hub/tokens/${tokenId}/reveal`);
}

export async function downloadOpenClawSkillPackage(downloadPath: string) {
  return requestBlobByUrl(downloadPath);
}

export type OpenClawWorkspaceScope = "brand_growth" | "xiaohongshu" | "douyin" | "wechat" | "geo" | "all_network_growth";
export type OpenClawCommentResourceType = "creative_material" | "daily_plan" | "lobster_diary" | "strategy_optimization" | "video_work";
export type OpenClawCreativeMaterialCategory = "text" | "image" | "audio" | "video";
export type OpenClawCreativeMaterialSourceKind = "material_library_upload" | "openclaw_upload";
export const CONTENT_ACQUISITION_OPENCLAW_WORKSPACE_SCOPES = ["xiaohongshu", "douyin", "wechat"] as const;
export const PERSONAL_CENTER_OPENCLAW_WORKSPACE_SCOPES = ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo", "all_network_growth"] as const;

export type OpenClawCommentRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  resourceType: OpenClawCommentResourceType;
  resourceId: string;
  createdByUserId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCommentWorkspace = {
  items: OpenClawCommentRecord[];
  total: number;
};

export async function getOpenClawCommentWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  resourceType: OpenClawCommentResourceType,
  resourceId: string,
  limit?: number,
) {
  const query = new URLSearchParams({
    workspaceScope,
    resourceType,
    resourceId,
  });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawCommentWorkspace>(`/openclaw/brands/${brandId}/comments?${query.toString()}`);
}

export async function createOpenClawComment(
  brandId: string,
  payload: {
    workspaceScope: OpenClawWorkspaceScope;
    resourceType: OpenClawCommentResourceType;
    resourceId: string;
    content: string;
  },
) {
  return jsonRequest<{ item: OpenClawCommentRecord; workspace: OpenClawCommentWorkspace }>(
    `/openclaw/brands/${brandId}/comments`,
    "POST",
    payload,
  );
}

export type OpenClawLobsterDiaryRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  diaryDate: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawLobsterDiaryWorkspace = {
  items: OpenClawLobsterDiaryRecord[];
  total: number;
};

export async function getOpenClawLobsterDiaryWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawLobsterDiaryWorkspace>(`/openclaw/brands/${brandId}/lobster-diaries?${query.toString()}`);
}

export async function deleteOpenClawLobsterDiary(diaryId: string, brandId: string, workspaceScope: OpenClawWorkspaceScope) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: OpenClawLobsterDiaryRecord; workspace: OpenClawLobsterDiaryWorkspace }>(
    `/openclaw/brands/${brandId}/lobster-diaries/${diaryId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateOpenClawLobsterDiary(
  diaryId: string,
  brandId: string,
  payload: {
    workspaceScope: OpenClawWorkspaceScope;
    diaryDate?: string;
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: OpenClawLobsterDiaryRecord; workspace: OpenClawLobsterDiaryWorkspace }>(
    `/openclaw/brands/${brandId}/lobster-diaries/${diaryId}`,
    "PATCH",
    payload,
  );
}

export type OpenClawStrategyOptimizationRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  generatedAt: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawStrategyOptimizationWorkspace = {
  items: OpenClawStrategyOptimizationRecord[];
  total: number;
};

export async function getOpenClawStrategyOptimizationWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawStrategyOptimizationWorkspace>(`/openclaw/brands/${brandId}/strategy-optimizations?${query.toString()}`);
}

export async function deleteOpenClawStrategyOptimization(
  recordId: string,
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: OpenClawStrategyOptimizationRecord; workspace: OpenClawStrategyOptimizationWorkspace }>(
    `/openclaw/brands/${brandId}/strategy-optimizations/${recordId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateOpenClawStrategyOptimization(
  recordId: string,
  brandId: string,
  payload: {
    workspaceScope: OpenClawWorkspaceScope;
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: OpenClawStrategyOptimizationRecord; workspace: OpenClawStrategyOptimizationWorkspace }>(
    `/openclaw/brands/${brandId}/strategy-optimizations/${recordId}`,
    "PATCH",
    payload,
  );
}

export type OpenClawDailyPlanRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  planDate: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawDailyPlanWorkspace = {
  items: OpenClawDailyPlanRecord[];
  total: number;
};

export async function getOpenClawDailyPlanWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawDailyPlanWorkspace>(`/openclaw/brands/${brandId}/daily-plans?${query.toString()}`);
}

export async function deleteOpenClawDailyPlan(planId: string, brandId: string, workspaceScope: OpenClawWorkspaceScope) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: OpenClawDailyPlanRecord; workspace: OpenClawDailyPlanWorkspace }>(
    `/openclaw/brands/${brandId}/daily-plans/${planId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type OpenClawCreativeMaterialRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  sourceKind: OpenClawCreativeMaterialSourceKind;
  title: string;
  description: string;
  materialType: string;
  materialCategory: OpenClawCreativeMaterialCategory;
  materialTags: string[];
  sourceLabel: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  textContent?: string;
  storageKey?: string;
  localFilePath?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCreativeMaterialWorkspace = {
  items: OpenClawCreativeMaterialRecord[];
  total: number;
};

export async function getOpenClawCreativeMaterialWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawCreativeMaterialWorkspace>(`/openclaw/brands/${brandId}/creative-materials?${query.toString()}`);
}

export async function getContentAcquisitionCreativeMaterialWorkspace(brandId: string, limit?: number) {
  const scopes = [...CONTENT_ACQUISITION_OPENCLAW_WORKSPACE_SCOPES] as OpenClawWorkspaceScope[];
  const workspaces = await Promise.all(scopes.map((scope) => getOpenClawCreativeMaterialWorkspace(brandId, scope, limit)));
  const items = workspaces.flatMap((workspace) => workspace.items);
  return {
    items,
    total: items.length,
  } satisfies OpenClawCreativeMaterialWorkspace;
}

export async function getPersonalCenterCreativeMaterialWorkspace(brandId: string, limit?: number) {
  const scopes = [...PERSONAL_CENTER_OPENCLAW_WORKSPACE_SCOPES] as OpenClawWorkspaceScope[];
  const workspaces = await Promise.all(scopes.map((scope) => getOpenClawCreativeMaterialWorkspace(brandId, scope, limit)));
  const deduped = new Map<string, OpenClawCreativeMaterialRecord>();
  for (const workspace of workspaces) {
    for (const item of workspace.items) {
      deduped.set(item.id, item);
    }
  }
  const items = [...deduped.values()];
  return {
    items,
    total: items.length,
  } satisfies OpenClawCreativeMaterialWorkspace;
}

export async function createOpenClawCreativeMaterial(
  brandId: string,
  payload: {
    workspaceScope?: OpenClawWorkspaceScope;
    sourceKind?: OpenClawCreativeMaterialSourceKind;
    title: string;
    description?: string;
    materialType: string;
    materialTags?: string[];
    fileUrl?: string;
    fileName?: string;
    mimeType?: string;
    textContent?: string;
    upload?: {
      fileName?: string;
      contentType?: string;
      dataBase64?: string;
    };
  },
) {
  return jsonRequest<{ item: OpenClawCreativeMaterialRecord; workspace: OpenClawCreativeMaterialWorkspace }>(
    `/openclaw/brands/${brandId}/creative-materials`,
    "POST",
    payload,
  );
}

export async function deleteOpenClawCreativeMaterial(
  materialId: string,
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: OpenClawCreativeMaterialRecord; workspace: OpenClawCreativeMaterialWorkspace }>(
    `/openclaw/brands/${brandId}/creative-materials/${materialId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type OpenClawVideoWorkRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  scriptContent: string;
  coverImageUrl?: string;
  videoUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawVideoWorkWorkspace = {
  items: OpenClawVideoWorkRecord[];
  total: number;
};

export async function getOpenClawVideoWorkWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawVideoWorkWorkspace>(`/openclaw/brands/${brandId}/video-works?${query.toString()}`);
}

export async function deleteOpenClawVideoWork(
  workId: string,
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: OpenClawVideoWorkRecord; workspace: OpenClawVideoWorkWorkspace }>(
    `/openclaw/brands/${brandId}/video-works/${workId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function createOpenClawVideoWorkDouyinDesktopPublishSession(
  brandId: string,
  workId: string,
  workspaceScope: OpenClawWorkspaceScope,
  payload: { accountId?: string } = {},
) {
  const query = new URLSearchParams({ workspaceScope });
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: DouyinDesktopPublishSession }>(
    `/openclaw/brands/${brandId}/video-works/${workId}/douyin-desktop-publish-session?${query.toString()}`,
    "POST",
    payload,
  );
}

export type OpenClawGeoVisibilityReportRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawGeoVisibilityReportWorkspace = {
  items: OpenClawGeoVisibilityReportRecord[];
  total: number;
};

export type OpenClawGeoContentType =
  | "keyword_research"
  | "site_diagnosis"
  | "knowledge_base_setup"
  | "geo_optimization_plan"
  | "self_media_content"
  | "third_party_media"
  | "brand_website_content";

export type OpenClawGeoContentGenerationMode = "single" | "multiple";

export type OpenClawGeoContentRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  contentType: OpenClawGeoContentType;
  sectionLabel: string;
  generationMode: OpenClawGeoContentGenerationMode;
  title: string;
  description: string;
  htmlContent: string;
  attachmentLabel: string;
  attachmentFileUrl?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentStorageKey?: string;
  storageAddress?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawGeoContentWorkspace = {
  items: OpenClawGeoContentRecord[];
  total: number;
};

export type ThirdPartyMediaDeliveryResourceRecord = {
  id: string;
  sortType: string;
  platform: string;
  taxonomy: string;
  area: string;
  name: string;
  caseUrl?: string;
  price: string;
  publishTime: string;
  successRate: string;
  includeRate: string;
  isSelfMedia: boolean;
  raw: Record<string, unknown>;
};

export type ThirdPartyMediaDeliveryResourceWorkspace = {
  items: ThirdPartyMediaDeliveryResourceRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  syncedAt: string;
};

export type ThirdPartyMediaDeliveryRecord = {
  orderId: string;
  resourceId: string;
  resourceName: string;
  articleId: string;
  articleTitle: string;
  createdAt: string;
  raw: Record<string, unknown>;
};

export type OpenClawCommentLeadPlatform = "xiaohongshu" | "douyin";

export type OpenClawCommentLeadRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  sourcePlatform: OpenClawCommentLeadPlatform;
  sourcePlatformLabel: "小红书" | "抖音";
  sourceUrl: string;
  sourceCommentId?: string;
  userName: string;
  userComment: string;
  selectedReason: string;
  userProfileUrl: string;
  selectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCommentLeadWorkspace = {
  items: OpenClawCommentLeadRecord[];
  total: number;
};

export type OpenClawPlatformLeadRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  name: string;
  businessScope: string;
  selectedReason: string;
  contactInfo: string;
  address: string;
  selectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawPlatformLeadWorkspace = {
  items: OpenClawPlatformLeadRecord[];
  total: number;
};

export type CreateOpenClawPlatformLeadsResult = {
  items: OpenClawPlatformLeadRecord[];
  createdCount: number;
  updatedCount: number;
};

export type CreateOpenClawCommentLeadsResult = {
  items: OpenClawCommentLeadRecord[];
  createdCount: number;
  updatedCount: number;
  platformCounts: {
    xiaohongshu: number;
    douyin: number;
  };
};

export async function getOpenClawGeoVisibilityReportWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawGeoVisibilityReportWorkspace>(`/openclaw/brands/${brandId}/geo-visibility-reports?${query.toString()}`);
}

export async function deleteOpenClawGeoVisibilityReport(
  reportId: string,
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: OpenClawGeoVisibilityReportRecord; workspace: OpenClawGeoVisibilityReportWorkspace }>(
    `/openclaw/brands/${brandId}/geo-visibility-reports/${reportId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function getOpenClawGeoContentWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  contentType?: OpenClawGeoContentType,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (contentType) {
    query.set("contentType", contentType);
  }
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawGeoContentWorkspace>(`/openclaw/brands/${brandId}/geo-contents?${query.toString()}`);
}

export async function deleteOpenClawGeoContent(
  contentId: string,
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  contentType?: OpenClawGeoContentType,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (contentType) {
    query.set("contentType", contentType);
  }
  return request<{ item: OpenClawGeoContentRecord; workspace: OpenClawGeoContentWorkspace }>(
    `/openclaw/brands/${brandId}/geo-contents/${contentId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function getThirdPartyMediaDeliveryResources(brandId: string, page?: number) {
  const query = new URLSearchParams();
  if (typeof page === "number") {
    query.set("page", String(page));
  }
  return request<ThirdPartyMediaDeliveryResourceWorkspace>(
    `/openclaw/brands/${brandId}/third-party-media-delivery/resources${query.size ? `?${query.toString()}` : ""}`,
  );
}

export async function createThirdPartyMediaDelivery(
  brandId: string,
  payload: {
    articleId: string;
    resourceId: string;
  },
) {
  return jsonRequest<{ delivery: ThirdPartyMediaDeliveryRecord }>(
    `/openclaw/brands/${brandId}/third-party-media-delivery/deliveries`,
    "POST",
    payload,
  );
}

export async function getOpenClawCommentLeadWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  sourcePlatform?: OpenClawCommentLeadPlatform,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (sourcePlatform) {
    query.set("sourcePlatform", sourcePlatform);
  }
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawCommentLeadWorkspace>(`/openclaw/brands/${brandId}/comment-leads?${query.toString()}`);
}

export async function createOpenClawCommentLeads(
  brandId: string,
  payload: {
    workspaceScope?: OpenClawWorkspaceScope;
    sourcePlatforms?: OpenClawCommentLeadPlatform[];
    xiaohongshuSourceUrls?: string[];
    douyinSourceUrls?: string[];
    matchKeywords?: string[];
    syncCommentsFirst?: boolean;
  } = {},
) {
  return jsonRequest<{ result: CreateOpenClawCommentLeadsResult; workspace: OpenClawCommentLeadWorkspace }>(
    `/openclaw/brands/${brandId}/comment-leads`,
    "POST",
    payload,
  );
}

export async function deleteOpenClawCommentLead(
  leadId: string,
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  sourcePlatform?: OpenClawCommentLeadPlatform,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (sourcePlatform) {
    query.set("sourcePlatform", sourcePlatform);
  }
  return request<{ item: OpenClawCommentLeadRecord; workspace: OpenClawCommentLeadWorkspace }>(
    `/openclaw/brands/${brandId}/comment-leads/${leadId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function getOpenClawPlatformLeadWorkspace(
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<OpenClawPlatformLeadWorkspace>(`/openclaw/brands/${brandId}/platform-leads?${query.toString()}`);
}

export async function createOpenClawPlatformLeads(
  brandId: string,
  payload: {
    workspaceScope?: OpenClawWorkspaceScope;
    items: Array<{
      id?: string;
      name: string;
      businessScope: string;
      selectedReason: string;
      contactInfo: string;
      address: string;
      selectedAt?: string;
    }>;
  },
) {
  return jsonRequest<{ result: CreateOpenClawPlatformLeadsResult; workspace: OpenClawPlatformLeadWorkspace }>(
    `/openclaw/brands/${brandId}/platform-leads`,
    "POST",
    payload,
  );
}

export async function deleteOpenClawPlatformLead(
  leadId: string,
  brandId: string,
  workspaceScope: OpenClawWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: OpenClawPlatformLeadRecord; workspace: OpenClawPlatformLeadWorkspace }>(
    `/openclaw/brands/${brandId}/platform-leads/${leadId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}
