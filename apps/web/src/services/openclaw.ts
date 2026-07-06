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

export type OpenClawWorkspaceScope = "brand_growth" | "xiaohongshu" | "douyin" | "wechat" | "geo";

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
  title: string;
  description: string;
  materialType: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  textContent?: string;
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
