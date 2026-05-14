import { SYSTEM_API_PROVIDER_SEEDS } from "./api-provider-catalog";

export type ThirdPartyPlatformRecord = {
  id: string;
  name: string;
  providerType: "OPENAI" | "GEMINI" | "DOUBAO" | "CUSTOM";
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  baseUrl: string;
  tutorialUrl: string;
  modelIds: string[];
  defaultModel: string;
  remark: string;
  updatedAt: string;
};

const PLATFORM_NAME_BY_HOST: Record<string, string> = {
  "hk-api.gptbest.vip": "柏拉图平台",
  "api.gptbest.vip": "柏拉图平台",
  "api.bltcy.ai": "柏拉图平台",
  "api.deepseek.com": "DeepSeek 平台",
  "ark.cn-beijing.volces.com": "火山方舟平台",
  "api.moonshot.cn": "Kimi 平台",
  "open.bigmodel.cn": "GLM 平台",
};

export const THIRD_PARTY_PLATFORM_SEEDS: ThirdPartyPlatformRecord[] = buildThirdPartyPlatformSeeds();

function buildThirdPartyPlatformSeeds() {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      providerType: ThirdPartyPlatformRecord["providerType"];
      status: ThirdPartyPlatformRecord["status"];
      baseUrl: string;
      tutorialUrl: string;
      modelIds: Set<string>;
      defaultModel: string;
      remark: string;
      updatedAt: string;
    }
  >();

  for (const item of SYSTEM_API_PROVIDER_SEEDS) {
    const key = normalizeBaseUrl(item.baseUrl);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        id: buildPlatformId(key),
        name: resolvePlatformName(item.baseUrl),
        providerType: item.providerType,
        status: item.status,
        baseUrl: item.baseUrl,
        tutorialUrl: item.tutorialUrl,
        modelIds: new Set(item.modelWhitelist),
        defaultModel: item.defaultModel,
        remark: item.remark,
        updatedAt: item.updatedAt,
      });
      continue;
    }

    item.modelWhitelist.forEach((model) => current.modelIds.add(model));
    if (!current.tutorialUrl && item.tutorialUrl) {
      current.tutorialUrl = item.tutorialUrl;
    }
    if (!current.defaultModel && item.defaultModel) {
      current.defaultModel = item.defaultModel;
    }
    if (!current.remark && item.remark) {
      current.remark = item.remark;
    }
    if (item.providerType !== current.providerType) {
      current.providerType = "CUSTOM";
    }
    if (statusWeight(item.status) > statusWeight(current.status)) {
      current.status = item.status;
    }
    if (String(item.updatedAt || "") > current.updatedAt) {
      current.updatedAt = item.updatedAt;
    }
  }

  return Array.from(groups.values())
    .map((item) => ({
      id: item.id,
      name: item.name,
      providerType: item.providerType,
      status: item.status,
      baseUrl: item.baseUrl,
      tutorialUrl: item.tutorialUrl,
      modelIds: Array.from(item.modelIds),
      defaultModel: item.defaultModel,
      remark: item.remark,
      updatedAt: item.updatedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

function normalizeBaseUrl(value: string) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return normalized.toLowerCase();
}

function buildPlatformId(baseUrl: string) {
  return `platform_${baseUrl.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()}`;
}

function resolvePlatformName(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    return PLATFORM_NAME_BY_HOST[url.host] || `${url.host} 平台`;
  } catch {
    return `${baseUrl || "未命名"} 平台`;
  }
}

function statusWeight(status: ThirdPartyPlatformRecord["status"]) {
  if (status === "ACTIVE") {
    return 3;
  }
  if (status === "DRAFT") {
    return 2;
  }
  return 1;
}
