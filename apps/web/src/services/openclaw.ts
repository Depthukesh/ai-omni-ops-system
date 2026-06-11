import { jsonRequest, request } from "./http";

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
    cursor: string;
    claudeDesktop: string;
    mcpEndpoint: string;
  };
  skillGuide: {
    title: string;
    summary: string;
    examples: string[];
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
