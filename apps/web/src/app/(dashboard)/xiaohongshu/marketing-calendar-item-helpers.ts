"use client";

import { type XiaohongshuMarketingCalendarItem } from "../../../services/reports";

export type MarketingCalendarPlatformView = "all" | "xiaohongshu" | "douyin" | "wechat";

export function cloneMarketingCalendarItem(item: XiaohongshuMarketingCalendarItem): XiaohongshuMarketingCalendarItem {
  return {
    ...item,
    brandMarketing: { ...item.brandMarketing },
    xiaohongshu: {
      brandAccount: {
        ...item.xiaohongshu.brandAccount,
        noteKeywords: [...item.xiaohongshu.brandAccount.noteKeywords],
        coverKeywords: [...item.xiaohongshu.brandAccount.coverKeywords],
        titleSuggestions: [...item.xiaohongshu.brandAccount.titleSuggestions],
      },
      employeeAccount: {
        ...item.xiaohongshu.employeeAccount,
        noteKeywords: [...item.xiaohongshu.employeeAccount.noteKeywords],
        coverKeywords: [...item.xiaohongshu.employeeAccount.coverKeywords],
        titleSuggestions: [...item.xiaohongshu.employeeAccount.titleSuggestions],
      },
    },
    douyin: {
      brandAccount: {
        ...item.douyin.brandAccount,
        copyKeywords: [...item.douyin.brandAccount.copyKeywords],
        coverKeywords: [...item.douyin.brandAccount.coverKeywords],
        titleSuggestions: [...item.douyin.brandAccount.titleSuggestions],
      },
      ipAccount: {
        ...item.douyin.ipAccount,
        copyKeywords: [...item.douyin.ipAccount.copyKeywords],
        coverKeywords: [...item.douyin.ipAccount.coverKeywords],
        titleSuggestions: [...item.douyin.ipAccount.titleSuggestions],
      },
      employeeAccount: {
        ...item.douyin.employeeAccount,
        copyKeywords: [...item.douyin.employeeAccount.copyKeywords],
        coverKeywords: [...item.douyin.employeeAccount.coverKeywords],
        titleSuggestions: [...item.douyin.employeeAccount.titleSuggestions],
      },
    },
    moments: { ...item.moments },
  };
}

export function createEmptyMarketingCalendarItem(date: string): XiaohongshuMarketingCalendarItem {
  const normalizedDate = date.trim();
  const id = normalizedDate ? `cal_manual_${normalizedDate.replace(/-/g, "")}` : `cal_manual_${Date.now()}`;
  return {
    id,
    date: normalizedDate,
    festivalOrSolarTerm: "",
    brandMarketing: {
      theme: "",
      description: "",
    },
    xiaohongshu: {
      brandAccount: {
        topic: "",
        description: "",
        contentType: "",
        noteKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
      employeeAccount: {
        topic: "",
        description: "",
        contentType: "",
        noteKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
    },
    douyin: {
      brandAccount: {
        topic: "",
        description: "",
        contentType: "",
        presentationFormat: "",
        copyKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
      ipAccount: {
        topic: "",
        description: "",
        contentType: "",
        presentationFormat: "",
        copyKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
      employeeAccount: {
        topic: "",
        description: "",
        contentType: "",
        presentationFormat: "",
        copyKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
    },
    moments: {
      topic: "",
      description: "",
      presentationFormat: "",
    },
  };
}

export function normalizeEditableMarketingCalendarItem(item: XiaohongshuMarketingCalendarItem): XiaohongshuMarketingCalendarItem {
  return {
    ...item,
    date: item.date.trim(),
    festivalOrSolarTerm: item.festivalOrSolarTerm?.trim() || "",
    brandMarketing: {
      theme: item.brandMarketing.theme.trim(),
      description: item.brandMarketing.description.trim(),
    },
    xiaohongshu: {
      brandAccount: {
        topic: item.xiaohongshu.brandAccount.topic.trim(),
        description: item.xiaohongshu.brandAccount.description.trim(),
        contentType: item.xiaohongshu.brandAccount.contentType.trim(),
        noteKeywords: normalizeCalendarItemList(item.xiaohongshu.brandAccount.noteKeywords),
        coverKeywords: normalizeCalendarItemList(item.xiaohongshu.brandAccount.coverKeywords),
        titleSuggestions: normalizeCalendarItemList(item.xiaohongshu.brandAccount.titleSuggestions),
        expectedPerformance: item.xiaohongshu.brandAccount.expectedPerformance.trim(),
      },
      employeeAccount: {
        topic: item.xiaohongshu.employeeAccount.topic.trim(),
        description: item.xiaohongshu.employeeAccount.description.trim(),
        contentType: item.xiaohongshu.employeeAccount.contentType.trim(),
        noteKeywords: normalizeCalendarItemList(item.xiaohongshu.employeeAccount.noteKeywords),
        coverKeywords: normalizeCalendarItemList(item.xiaohongshu.employeeAccount.coverKeywords),
        titleSuggestions: normalizeCalendarItemList(item.xiaohongshu.employeeAccount.titleSuggestions),
        expectedPerformance: item.xiaohongshu.employeeAccount.expectedPerformance.trim(),
      },
    },
    douyin: {
      brandAccount: {
        topic: item.douyin.brandAccount.topic.trim(),
        description: item.douyin.brandAccount.description.trim(),
        contentType: item.douyin.brandAccount.contentType.trim(),
        presentationFormat: item.douyin.brandAccount.presentationFormat.trim(),
        copyKeywords: normalizeCalendarItemList(item.douyin.brandAccount.copyKeywords),
        coverKeywords: normalizeCalendarItemList(item.douyin.brandAccount.coverKeywords),
        titleSuggestions: normalizeCalendarItemList(item.douyin.brandAccount.titleSuggestions),
        expectedPerformance: item.douyin.brandAccount.expectedPerformance.trim(),
      },
      ipAccount: {
        topic: item.douyin.ipAccount.topic.trim(),
        description: item.douyin.ipAccount.description.trim(),
        contentType: item.douyin.ipAccount.contentType.trim(),
        presentationFormat: item.douyin.ipAccount.presentationFormat.trim(),
        copyKeywords: normalizeCalendarItemList(item.douyin.ipAccount.copyKeywords),
        coverKeywords: normalizeCalendarItemList(item.douyin.ipAccount.coverKeywords),
        titleSuggestions: normalizeCalendarItemList(item.douyin.ipAccount.titleSuggestions),
        expectedPerformance: item.douyin.ipAccount.expectedPerformance.trim(),
      },
      employeeAccount: {
        topic: item.douyin.employeeAccount.topic.trim(),
        description: item.douyin.employeeAccount.description.trim(),
        contentType: item.douyin.employeeAccount.contentType.trim(),
        presentationFormat: item.douyin.employeeAccount.presentationFormat.trim(),
        copyKeywords: normalizeCalendarItemList(item.douyin.employeeAccount.copyKeywords),
        coverKeywords: normalizeCalendarItemList(item.douyin.employeeAccount.coverKeywords),
        titleSuggestions: normalizeCalendarItemList(item.douyin.employeeAccount.titleSuggestions),
        expectedPerformance: item.douyin.employeeAccount.expectedPerformance.trim(),
      },
    },
    moments: {
      topic: item.moments.topic.trim(),
      description: item.moments.description.trim(),
      presentationFormat: item.moments.presentationFormat.trim(),
    },
  };
}

export function updateMarketingCalendarItemByPath(
  item: XiaohongshuMarketingCalendarItem,
  path: string,
  value: string | string[],
): XiaohongshuMarketingCalendarItem {
  const nextItem = cloneMarketingCalendarItem(item);
  const segments = path.split(".").filter(Boolean);
  if (!segments.length) {
    return nextItem;
  }
  let current: Record<string, unknown> = nextItem as unknown as Record<string, unknown>;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    current[segment] = { ...(current[segment] as Record<string, unknown>) };
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
  return nextItem;
}

export function resolveMarketingCalendarTopic(
  item?: XiaohongshuMarketingCalendarItem | null,
  platformView: MarketingCalendarPlatformView = "all",
) {
  if (!item) {
    return "未命名主题";
  }
  if (platformView === "xiaohongshu") {
    return (
      item.xiaohongshu.brandAccount.topic
      || item.xiaohongshu.employeeAccount.topic
      || item.brandMarketing.theme
      || "未命名主题"
    ).trim();
  }
  if (platformView === "douyin") {
    return (
      item.douyin.brandAccount.topic
      || item.douyin.ipAccount.topic
      || item.douyin.employeeAccount.topic
      || item.brandMarketing.theme
      || "未命名主题"
    ).trim();
  }
  if (platformView === "wechat") {
    return (
      item.moments.topic
      || item.brandMarketing.theme
      || "未命名主题"
    ).trim();
  }
  return (
    item.topicName
    || item.brandMarketing.theme
    || item.xiaohongshu.brandAccount.topic
    || item.douyin.brandAccount.topic
    || item.moments.topic
    || "未命名主题"
  ).trim();
}

function normalizeCalendarItemList(items?: string[]) {
  return (items || []).map((item) => item.trim()).filter(Boolean);
}
