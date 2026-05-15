export const BRAND_COLLABORATOR_ROLES = ["ADMIN", "STAFF", "TALENT"] as const;

export type BrandCollaboratorRole = (typeof BRAND_COLLABORATOR_ROLES)[number];
export type BrandPermissionAction = "view" | "edit";

export type BrandPermissionFlags = {
  view: boolean;
  edit: boolean;
};

export const BRAND_PERMISSION_KEYS = [
  "brandGrowth.library.background",
  "brandGrowth.library.products",
  "brandGrowth.library.survey",
  "brandGrowth.library.industryFeeds",
  "brandGrowth.library.businessAssets",
  "brandGrowth.collection.xiaohongshuCollection",
  "brandGrowth.collection.dailyHotspot",
  "brandGrowth.report.growthReport",
  "brandGrowth.report.visualGrowthReport",
  "brandGrowth.report.halfYearMarketingPlan",
  "xiaohongshu.plan",
  "xiaohongshu.assets",
  "xiaohongshu.calendar",
  "xiaohongshu.original",
  "xiaohongshu.remix",
  "xiaohongshu.video",
  "personalCenter.skills",
  "personalCenter.thirdPartyPlatforms",
  "personalCenter.tasks",
  "personalCenter.works",
  "personalCenter.team",
] as const;

export type BrandPermissionKey = (typeof BRAND_PERMISSION_KEYS)[number];

export type BrandPermissionMap = Record<BrandPermissionKey, BrandPermissionFlags>;
export type BrandPermissionConfig = Record<BrandCollaboratorRole, BrandPermissionMap>;

export const BRAND_PERMISSION_TREE = [
  {
    key: "brandGrowth",
    label: "品牌增长策略",
    groups: [
      {
        key: "brandGrowth.library",
        label: "品牌资料库",
        items: [
          { key: "brandGrowth.library.background", label: "品牌背景资料" },
          { key: "brandGrowth.library.products", label: "产品资料库" },
          { key: "brandGrowth.library.survey", label: "品牌运营情况" },
          { key: "brandGrowth.library.industryFeeds", label: "第三方数据" },
          { key: "brandGrowth.library.businessAssets", label: "企业经营数据" },
        ],
      },
      {
        key: "brandGrowth.collection",
        label: "收集数据",
        items: [
          { key: "brandGrowth.collection.xiaohongshuCollection", label: "小红书平台" },
          { key: "brandGrowth.collection.dailyHotspot", label: "每日热点" },
        ],
      },
      {
        key: "brandGrowth.report",
        label: "品牌增长报告",
        items: [
          { key: "brandGrowth.report.growthReport", label: "生成品牌增长报告" },
          { key: "brandGrowth.report.visualGrowthReport", label: "品牌增长可视化报告" },
          { key: "brandGrowth.report.halfYearMarketingPlan", label: "半年营销规划" },
        ],
      },
    ],
  },
  {
    key: "xiaohongshu",
    label: "小红书",
    groups: [
      {
        key: "xiaohongshu.workspace",
        label: "内容生产",
        items: [
          { key: "xiaohongshu.plan", label: "营销策划方案" },
          { key: "xiaohongshu.assets", label: "素材库" },
          { key: "xiaohongshu.calendar", label: "营销日历" },
          { key: "xiaohongshu.original", label: "原创笔记" },
          { key: "xiaohongshu.remix", label: "二创笔记" },
          { key: "xiaohongshu.video", label: "视频笔记" },
        ],
      },
    ],
  },
  {
    key: "personalCenter",
    label: "个人中心",
    groups: [
      {
        key: "personalCenter.workspace",
        label: "品牌协作",
        items: [
          { key: "personalCenter.skills", label: "技能中心" },
          { key: "personalCenter.thirdPartyPlatforms", label: "第三方接口配置" },
          { key: "personalCenter.tasks", label: "任务记录" },
          { key: "personalCenter.works", label: "我的作品" },
          { key: "personalCenter.team", label: "团队协作" },
        ],
      },
    ],
  },
] as const;

export function normalizeBrandCollaboratorRole(role?: string | null): BrandCollaboratorRole {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return "ADMIN";
    case "VIEWER":
    case "TALENT":
      return "TALENT";
    case "EDITOR":
    case "OPERATOR":
    case "STAFF":
    default:
      return "STAFF";
  }
}

export function createEmptyBrandPermissionMap(): BrandPermissionMap {
  return Object.fromEntries(
    BRAND_PERMISSION_KEYS.map((key) => [key, { view: false, edit: false }]),
  ) as BrandPermissionMap;
}

function createFullBrandPermissionMap(): BrandPermissionMap {
  return Object.fromEntries(
    BRAND_PERMISSION_KEYS.map((key) => [key, { view: true, edit: true }]),
  ) as BrandPermissionMap;
}

function withPermissions(
  base: BrandPermissionMap,
  updates: Partial<Record<BrandPermissionKey, Partial<BrandPermissionFlags>>>,
): BrandPermissionMap {
  const next = createEmptyBrandPermissionMap();
  for (const key of BRAND_PERMISSION_KEYS) {
    next[key] = {
      view: base[key].view,
      edit: base[key].edit,
    };
  }
  for (const key of Object.keys(updates) as BrandPermissionKey[]) {
    next[key] = {
      view: updates[key]?.view ?? next[key].view,
      edit: updates[key]?.edit ?? next[key].edit,
    };
  }
  return next;
}

export function buildDefaultBrandPermissionConfig(): BrandPermissionConfig {
  const admin = createFullBrandPermissionMap();
  const empty = createEmptyBrandPermissionMap();

  const staff = withPermissions(empty, {
    "xiaohongshu.plan": { view: true, edit: true },
    "xiaohongshu.assets": { view: true, edit: true },
    "xiaohongshu.calendar": { view: true, edit: true },
    "xiaohongshu.original": { view: true, edit: true },
    "xiaohongshu.remix": { view: true, edit: true },
    "xiaohongshu.video": { view: true, edit: true },
    "personalCenter.skills": { view: true, edit: true },
    "personalCenter.tasks": { view: true, edit: true },
    "personalCenter.works": { view: true, edit: true },
    "personalCenter.thirdPartyPlatforms": { view: true, edit: false },
    "personalCenter.team": { view: true, edit: false },
  });

  const talent = withPermissions(empty, {
    "xiaohongshu.plan": { view: true, edit: true },
    "xiaohongshu.assets": { view: true, edit: true },
    "xiaohongshu.calendar": { view: true, edit: true },
    "xiaohongshu.original": { view: true, edit: true },
    "xiaohongshu.remix": { view: true, edit: true },
    "xiaohongshu.video": { view: true, edit: true },
    "personalCenter.tasks": { view: true, edit: false },
    "personalCenter.works": { view: true, edit: false },
    "personalCenter.team": { view: true, edit: false },
  });

  return {
    ADMIN: admin,
    STAFF: staff,
    TALENT: talent,
  };
}

export function normalizeBrandPermissionMap(input: unknown, fallback?: BrandPermissionMap): BrandPermissionMap {
  const base = fallback ?? createEmptyBrandPermissionMap();
  const record = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};

  const next = createEmptyBrandPermissionMap();
  for (const key of BRAND_PERMISSION_KEYS) {
    const rawFlags = record[key];
    const flags = rawFlags && typeof rawFlags === "object" && !Array.isArray(rawFlags)
      ? (rawFlags as Record<string, unknown>)
      : {};
    next[key] = {
      view: typeof flags.view === "boolean" ? flags.view : base[key].view,
      edit: typeof flags.edit === "boolean" ? flags.edit : base[key].edit,
    };
  }
  return next;
}

export function normalizeBrandPermissionConfig(input: unknown): BrandPermissionConfig {
  const defaults = buildDefaultBrandPermissionConfig();
  const record = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};

  return {
    ADMIN: normalizeBrandPermissionMap(record.ADMIN, defaults.ADMIN),
    STAFF: normalizeBrandPermissionMap(record.STAFF, defaults.STAFF),
    TALENT: normalizeBrandPermissionMap(record.TALENT, defaults.TALENT),
  };
}

export function getBrandRolePermissionMap(
  role: string | null | undefined,
  config: BrandPermissionConfig,
): BrandPermissionMap {
  const normalizedRole = normalizeBrandCollaboratorRole(role);
  if (normalizedRole === "ADMIN") {
    return createFullBrandPermissionMap();
  }
  return normalizeBrandPermissionMap(config[normalizedRole], buildDefaultBrandPermissionConfig()[normalizedRole]);
}

export function hasBrandPermission(
  role: string | null | undefined,
  config: BrandPermissionConfig,
  key: BrandPermissionKey,
  action: BrandPermissionAction,
): boolean {
  if (normalizeBrandCollaboratorRole(role) === "ADMIN") {
    return true;
  }
  const permissionMap = getBrandRolePermissionMap(role, config);
  return Boolean(permissionMap[key]?.[action]);
}
