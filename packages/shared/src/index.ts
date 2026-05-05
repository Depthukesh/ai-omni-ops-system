export const APP_NAME = "AI全域运营系统";

export enum PlatformType {
  XIAOHONGSHU = "XIAOHONGSHU",
  DOUYIN = "DOUYIN",
  VIDEO_CHANNEL = "VIDEO_CHANNEL",
  WECHAT_OA = "WECHAT_OA",
}

export enum TaskStatus {
  PENDING = "PENDING",
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export type BrandArchiveStepKey =
  | "background"
  | "products"
  | "survey"
  | "platformAccounts"
  | "competitorAccounts"
  | "industryFeeds"
  | "businessAssets";

export type BrandArchiveStepStatus = "ready" | "in_progress" | "pending";

export type BrandBackground = {
  id: string;
  brandName: string;
  industry: string;
  storeCount: number;
  foundedYear: number;
  brandDescription: string;
  enterpriseIntro: string;
};

export type BrandProduct = {
  id: string;
  productName: string;
  productType: string;
  price: number;
  usageScenario: string;
};

export type BrandSurveyAnswer = {
  key: string;
  label: string;
  value: string;
};

export type BrandAccount = {
  id: string;
  platform: PlatformType;
  accountName: string;
  accountLink: string;
};

export type BrandAsset = {
  id: string;
  title: string;
  description: string;
  sourceName?: string;
  fileUrl?: string;
};

export type BrandArchiveBundle = {
  brand: BrandBackground;
  products: BrandProduct[];
  survey: BrandSurveyAnswer[];
  platformAccounts: BrandAccount[];
  competitorAccounts: BrandAccount[];
  industryFeeds: BrandAsset[];
  businessAssets: BrandAsset[];
  steps: Array<{
    key: BrandArchiveStepKey;
    name: string;
    status: BrandArchiveStepStatus;
    description: string;
  }>;
};
