"use client";

import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { DEMO_BRAND_ID } from "../../../services/brand-growth";
import { API_BASE_URL } from "../../../services/http";
import {
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
} from "../../../services/works";

export function buildCollectorMediaProxyUrl(sourceUrl?: string, download = false, brandId?: string) {
  if (!sourceUrl) {
    return "";
  }

  try {
    const target = new URL(sourceUrl);
    const isFeishuHost = target.hostname === "open.feishu.cn"
      || target.hostname === "open.larkoffice.com"
      || target.hostname.endsWith(".feishu.cn")
      || target.hostname.endsWith(".larkoffice.com")
      || target.hostname.endsWith(".larksuite.com");
    if (isFeishuHost) {
      const params = new URLSearchParams({ sourceUrl });
      if (download) {
        params.set("download", "1");
      }
      const resolvedBrandId = getStoredCurrentBrandId(brandId || DEMO_BRAND_ID) || DEMO_BRAND_ID;
      return `${API_BASE_URL}/collectors/xiaohongshu/brands/${resolvedBrandId}/feishu-media?${params.toString()}`;
    }

    if (target.protocol === "http:" || target.protocol === "https:") {
      return sourceUrl;
    }
  } catch {
    return "";
  }

  return "";
}

export function getPreviewIndex(indexMap: Record<string, number>, itemId?: string, total = 0) {
  if (!itemId || total <= 0) {
    return 0;
  }

  const current = indexMap[itemId] ?? 0;
  return ((current % total) + total) % total;
}

export function getWorkMediaUrls(coverImageUrl?: string, imageUrls: string[] = []) {
  return Array.from(new Set([coverImageUrl, ...imageUrls].filter((item): item is string => Boolean(item))));
}

export function getOriginalWorkMediaUrls(item?: XiaohongshuOriginalWorkRecord) {
  if (!item) {
    return [];
  }

  return getWorkMediaUrls(item.coverImageUrl, item.imageUrls);
}

export function getRewriteWorkMediaUrls(item?: XiaohongshuRewriteWorkRecord) {
  if (!item) {
    return [];
  }

  return getWorkMediaUrls(item.coverImageUrl, item.imageUrls);
}
