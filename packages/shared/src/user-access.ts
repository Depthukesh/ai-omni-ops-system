export const USER_ACCESS_FEATURE_KEYS = {
  BRAND_GROWTH: "brand-growth-workbench",
  XIAOHONGSHU: "xiaohongshu-workbench",
  DOUYIN: "douyin-workbench",
  WECHAT: "wechat-workbench",
  DESIGN: "design-workbench",
  PERSONAL_CENTER: "personal-center",
  OPENCLAW: "openclaw-center",
  ADMIN_CONSOLE: "admin-console",
} as const;

export type UserAccessFeatureKey =
  (typeof USER_ACCESS_FEATURE_KEYS)[keyof typeof USER_ACCESS_FEATURE_KEYS];

export const USER_ACCESS_FEATURE_OPTIONS: Array<{
  key: UserAccessFeatureKey;
  label: string;
  description: string;
}> = [
  {
    key: USER_ACCESS_FEATURE_KEYS.BRAND_GROWTH,
    label: "品牌增长",
    description: "品牌资料、采集、增长报告、营销规划与营销日历",
  },
  {
    key: USER_ACCESS_FEATURE_KEYS.XIAOHONGSHU,
    label: "小红书",
    description: "小红书工作台、原创、二创、视频与发布",
  },
  {
    key: USER_ACCESS_FEATURE_KEYS.DOUYIN,
    label: "抖音",
    description: "抖音热点、创作、视频、数字人、发布",
  },
  {
    key: USER_ACCESS_FEATURE_KEYS.WECHAT,
    label: "公众号",
    description: "公众号配置、创作、HTML 与发布",
  },
  {
    key: USER_ACCESS_FEATURE_KEYS.DESIGN,
    label: "设计",
    description: "图片、HTML、PPT、视频方案设计",
  },
  {
    key: USER_ACCESS_FEATURE_KEYS.PERSONAL_CENTER,
    label: "个人中心",
    description: "个人中心、任务、订单、作品、第三方接口与安全设置",
  },
  {
    key: USER_ACCESS_FEATURE_KEYS.OPENCLAW,
    label: "OpenClaw",
    description: "OpenClaw 安装中心与相关品牌工作流入口",
  },
  {
    key: USER_ACCESS_FEATURE_KEYS.ADMIN_CONSOLE,
    label: "后台管理",
    description: "后台管理台、用户管理、技能中心、知识库等后台能力",
  },
];

export const USER_ACCESS_FEATURE_KEY_SET = new Set<UserAccessFeatureKey>(
  USER_ACCESS_FEATURE_OPTIONS.map((item) => item.key),
);

export function normalizeUserAccessFeatureKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as UserAccessFeatureKey[];
  }

  const seen = new Set<UserAccessFeatureKey>();
  const normalized: UserAccessFeatureKey[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    if (!USER_ACCESS_FEATURE_KEY_SET.has(item as UserAccessFeatureKey)) {
      continue;
    }
    const key = item as UserAccessFeatureKey;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(key);
  }
  return normalized;
}

export function parseUserAccessFeatureKeysJson(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return [] as UserAccessFeatureKey[];
  }

  try {
    return normalizeUserAccessFeatureKeys(JSON.parse(value));
  } catch {
    return [] as UserAccessFeatureKey[];
  }
}

export function stringifyUserAccessFeatureKeys(value: readonly UserAccessFeatureKey[]) {
  return JSON.stringify(normalizeUserAccessFeatureKeys([...value]));
}
