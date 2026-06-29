import { jsonRequest, request, requestBlobByUrl } from "./http";

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

export type OpenClawLobsterDiaryRecord = {
  id: string;
  brandId: string;
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

export async function getOpenClawLobsterDiaryWorkspace(brandId: string, limit?: number) {
  const query = typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : "";
  return request<OpenClawLobsterDiaryWorkspace>(`/openclaw/brands/${brandId}/lobster-diaries${query}`);
}

export async function deleteOpenClawLobsterDiary(diaryId: string, brandId: string) {
  return request<{ item: OpenClawLobsterDiaryRecord; workspace: OpenClawLobsterDiaryWorkspace }>(
    `/openclaw/brands/${brandId}/lobster-diaries/${diaryId}`,
    {
      method: "DELETE",
    },
  );
}
