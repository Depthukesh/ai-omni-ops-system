import { getStoredCurrentBrandId } from "./auth-session";
import { DEMO_BRAND_ID } from "./brand-growth";
import { jsonRequest, request } from "./http";

export type DailyHotspotSyncStatus = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";

export type DailyHotspotItem = {
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
  items: DailyHotspotItem[];
};

export type DailyHotspotWorkspace = {
  selectedDate: string;
  availableDates: string[];
  platforms: DailyHotspotPlatformRecord[];
};

export const dailyHotspotSeed: DailyHotspotWorkspace = {
  selectedDate: "2026-05-02",
  availableDates: ["2026-05-02", "2026-05-01", "2026-04-30"],
  platforms: [
    {
      id: "dailyhot_demo_hot_search",
      platformKey: "douyin-hot-search",
      title: "热搜榜",
      snapshotDate: "2026-05-02",
      boardType: "热搜",
      description: "抖音内容综合热搜。",
      sourceLink: "https://www.douyin.com/hot",
      total: 20,
      updateTime: "2026-05-02T04:00:00.000Z",
      fromCache: true,
      collectedAt: "2026-05-02T04:00:00.000Z",
      syncStatus: "SUCCESS",
      items: Array.from({ length: 20 }, (_, index) => ({
        id: `hot-search-${index + 1}`,
        rank: index + 1,
        title: `热搜示例话题 ${index + 1}`,
        hot: 1600000 - index * 42000,
        url: "https://www.douyin.com/hot",
        timestamp: 1777680000000 + index * 1800000,
      })),
    },
  ],
};

function resolveBrandId(brandId?: string) {
  return getStoredCurrentBrandId(brandId || DEMO_BRAND_ID) || DEMO_BRAND_ID;
}

export async function getDailyHotspotWorkspace(brandId?: string, date?: string) {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<DailyHotspotWorkspace>(`/collectors/daily-hotspots/brands/${resolveBrandId(brandId)}/workspace${suffix}`);
}

export async function syncDailyHotspots(platformTitles?: string[], brandId?: string) {
  return jsonRequest<{
    syncedCount: number;
    results: DailyHotspotPlatformRecord[];
    workspace: DailyHotspotWorkspace;
  }>(`/collectors/daily-hotspots/brands/${resolveBrandId(brandId)}/sync`, "POST", { platformTitles });
}
