"use client";

export type AsyncAction = () => void | Promise<void>;
export type ValueAction<T> = (value: T) => void | Promise<void>;
export type OptionalDateFormatter = (value?: string) => string;
export type OptionalNumberFormatter = (value?: number) => string;

export type FeishuBindingForm = {
  wikiUrl: string;
};

export type FeishuAppConfigForm = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scope: string;
};

export type MediaPreviewState = {
  url: string;
  title: string;
  type?: "IMAGE" | "VIDEO";
  downloadUrl?: string;
  downloadName?: string;
  galleryUrls?: string[];
  activeIndex?: number;
};

export type BrandGrowthLibraryPageKey =
  | "background"
  | "products"
  | "survey"
  | "industryFeeds"
  | "businessAssets";

export type BrandGrowthReportPageKey =
  | "growthReport"
  | "visualGrowthReport"
  | "annualMarketingPlan"
  | "xiaohongshuMarketingCalendar";
