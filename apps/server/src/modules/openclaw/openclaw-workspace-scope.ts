export const OPENCLAW_WORKSPACE_SCOPES = ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo"] as const;

export type OpenClawWorkspaceScope = (typeof OPENCLAW_WORKSPACE_SCOPES)[number];

export const DEFAULT_OPENCLAW_WORKSPACE_SCOPE: OpenClawWorkspaceScope = "brand_growth";

export function normalizeOpenClawWorkspaceScope(value?: string): OpenClawWorkspaceScope {
  const normalized = String(value || "").trim().toLowerCase();
  if ((OPENCLAW_WORKSPACE_SCOPES as readonly string[]).includes(normalized)) {
    return normalized as OpenClawWorkspaceScope;
  }
  return DEFAULT_OPENCLAW_WORKSPACE_SCOPE;
}

export function getOpenClawWorkspaceDisplayName(scope: OpenClawWorkspaceScope) {
  switch (scope) {
    case "xiaohongshu":
      return "小红书";
    case "douyin":
      return "抖音";
    case "wechat":
      return "公众号";
    case "geo":
      return "GEO";
    case "brand_growth":
    default:
      return "品牌增长";
  }
}

export function getOpenClawWorkspaceDashboardPath(scope: OpenClawWorkspaceScope) {
  switch (scope) {
    case "xiaohongshu":
      return "/xiaohongshu";
    case "douyin":
      return "/douyin";
    case "wechat":
      return "/wechat";
    case "geo":
      return "/geo";
    case "brand_growth":
    default:
      return "/brand-growth";
  }
}
