import { SYSTEM_API_PROVIDER_SEEDS } from "./api-provider-catalog";

export type ThirdPartyPlatformRecord = {
  id: string;
  name: string;
  providerType: "OPENAI" | "GEMINI" | "DOUBAO" | "CUSTOM";
  status: "ACTIVE" | "DISABLED" | "DRAFT";
  baseUrl: string;
  websiteUrl: string;
  tutorialUrl: string;
  modelIds: string[];
  defaultModel: string;
  remark: string;
  updatedAt: string;
};

export const DECOMMISSIONED_PLATFORM_HOSTS = new Set([
  "hk-api.gptbest.vip",
  "api.gptbest.vip",
  "api.bltcy.ai",
  "openspeech.bytedance.com",
]);

export const DECOMMISSIONED_PLATFORM_IDS = new Set([
  "platform_http_127_0_0_1_5000_video_remix",
]);

const PLATFORM_NAME_BY_HOST: Record<string, string> = {
  "www.right.codes": "Right Codes 平台",
  "www.rightapi.ai": "Right Codes 平台",
  "api.xskill.ai": "APIZ / NEX AI 平台",
  "api.apiz.ai": "APIZ / NEX AI 平台",
  "api.deepseek.com": "DeepSeek 平台",
  "ark.cn-beijing.volces.com": "火山方舟平台",
  "open.volcengineapi.com": "火山音乐 OpenAPI",
  "api.moonshot.cn": "Kimi 平台",
  "open.bigmodel.cn": "GLM 平台",
  "api.tikhub.io": "Tikhub 平台",
  "api.stepfun.com": "StepFun 平台",
  "agent.mathmind.cn": "MathMind 平台",
  "api.mathmind.cn": "MathMind 平台",
  "www.runninghub.cn": "RunningHub 平台",
  "api.kol.cn": "软文街平台",
  "apihub.agnes-ai.com": "Agnes 平台",
  "duoyuanx.com": "多元探索平台",
};

export const THIRD_PARTY_PLATFORM_SEEDS: ThirdPartyPlatformRecord[] = buildThirdPartyPlatformSeeds();

export function isDecommissionedPlatformBaseUrl(baseUrl: string, platformId?: string) {
  if (platformId && DECOMMISSIONED_PLATFORM_IDS.has(String(platformId).trim())) {
    return true;
  }
  try {
    const url = new URL(String(baseUrl || "").trim());
    return DECOMMISSIONED_PLATFORM_HOSTS.has(url.host.toLowerCase());
  } catch {
    const normalized = String(baseUrl || "").trim().toLowerCase();
    return Array.from(DECOMMISSIONED_PLATFORM_HOSTS).some((host) => normalized.includes(host));
  }
}

function buildThirdPartyPlatformSeeds() {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      providerType: ThirdPartyPlatformRecord["providerType"];
      status: ThirdPartyPlatformRecord["status"];
      baseUrl: string;
      websiteUrl: string;
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
        websiteUrl: resolvePlatformWebsiteUrl(item.baseUrl),
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
    if (!current.websiteUrl) {
      current.websiteUrl = resolvePlatformWebsiteUrl(item.baseUrl);
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
      if (item.defaultModel) {
        current.defaultModel = item.defaultModel;
      }
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
      websiteUrl: item.websiteUrl,
      tutorialUrl: item.tutorialUrl,
      modelIds: Array.from(item.modelIds),
      defaultModel: item.defaultModel,
      remark: item.remark,
      updatedAt: item.updatedAt,
    }))
    .concat([
      {
        id: "platform_https_api_tikhub_io",
        name: "Tikhub 平台",
        providerType: "CUSTOM" as const,
        status: "ACTIVE" as const,
        baseUrl: "https://api.tikhub.io",
        websiteUrl: "https://www.tikhub.io",
        tutorialUrl: "https://docs.tikhub.io/186826222e0",
        modelIds: [],
        defaultModel: "",
        remark: "用于抖音数据采集。用户需要在个人中心按品牌填写自己的 Tikhub API Key，后台维护平台链接与文档入口。",
        updatedAt: "2026-05-21T00:00:00.000Z",
      },
      {
        id: "platform_https_open_api_chanjing_cc",
        name: "蝉镜 OpenAPI",
        providerType: "CUSTOM" as const,
        status: "ACTIVE" as const,
        baseUrl: "https://open-api.chanjing.cc",
        websiteUrl: "https://www.chanjing.cc",
        tutorialUrl: "https://doc.chanjing.cc/api/open-api-common-knowledge.html",
        modelIds: [],
        defaultModel: "",
        remark: "用于抖音数字人模板库与数字人视频合成。当前品牌 Owner 请在个人中心按 `appId::secretKey` 形式填写凭证。",
        updatedAt: "2026-05-30T00:00:00.000Z",
      },
      {
        id: "platform_https_vod_volcengineapi_com",
        name: "火山引擎 VOD OpenAPI",
        providerType: "CUSTOM" as const,
        status: "ACTIVE" as const,
        baseUrl: "https://vod.volcengineapi.com",
        websiteUrl: "https://console.volcengine.com/vod",
        tutorialUrl: "https://www.volcengine.com/docs/4/1511923?lang=zh",
        modelIds: [],
        defaultModel: "",
        remark: "用于抖音广告预审。当前品牌 Owner 请在个人中心按 `accessKeyId::secretAccessKey` 形式填写凭证；如需自定义地域，可追加 `::cn-north-1`。",
        updatedAt: "2026-06-16T00:00:00.000Z",
      },
      {
        id: "platform_https_open_volcengineapi_com",
        name: "火山音乐 OpenAPI",
        providerType: "CUSTOM" as const,
        status: "ACTIVE" as const,
        baseUrl: "https://open.volcengineapi.com",
        websiteUrl: "https://www.volcengine.com/docs/84992/1404668?lang=zh",
        tutorialUrl: "https://docs.volcengine.com/docs/84992/1967910?lang=zh",
        modelIds: [],
        defaultModel: "",
        remark: "用于火山方舟人声歌曲与纯音乐生成。当前品牌 Owner 请在个人中心按 `accessKeyId::secretAccessKey` 形式填写凭证；如需自定义地域、Host 或 Service，可追加 `::cn-beijing::open.volcengineapi.com::imagination`。",
        updatedAt: "2026-07-11T00:00:00.000Z",
      },
      {
        id: "platform_https_www_runninghub_cn",
        name: "RunningHub 平台",
        providerType: "CUSTOM" as const,
        status: "ACTIVE" as const,
        baseUrl: "https://www.runninghub.cn",
        websiteUrl: "https://www.runninghub.cn",
        tutorialUrl: "https://www.runninghub.cn/runninghub-api-doc-cn/api-425749010",
        modelIds: [],
        defaultModel: "",
        remark: "用于抖音 RunningHub 应用工作台。当前品牌 Owner 请在个人中心填写 RunningHub API Key，后续即可调用 AI 应用任务、查询结果并查看作品中心历史记录。",
        updatedAt: "2026-06-25T00:00:00.000Z",
      },
      {
        id: "platform_https_api_kol_cn",
        name: "软文街平台",
        providerType: "CUSTOM" as const,
        status: "ACTIVE" as const,
        baseUrl: "https://api.kol.cn",
        websiteUrl: "https://www.ruanwenjie.com",
        tutorialUrl: "",
        modelIds: [],
        defaultModel: "",
        remark: "用于 GEO 第三方媒体投放。当前品牌 Owner 请在个人中心填写软文街 API Key、登录账号和登录密码；identity / captcha_token / captcha 将按文档示例默认补成 advertiser。",
        updatedAt: "2026-08-16T00:00:00.000Z",
      },
    ])
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

export function resolvePlatformWebsiteUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    const host = url.host.toLowerCase();
    const websiteByHost: Record<string, string> = {
      "api.xskill.ai": "https://www.xskill.ai",
      "api.apiz.ai": "https://www.xskill.ai",
      "api.deepseek.com": "https://platform.deepseek.com",
      "api.moonshot.cn": "https://platform.moonshot.cn",
      "open.bigmodel.cn": "https://open.bigmodel.cn",
      "api.tikhub.io": "https://www.tikhub.io",
      "api.stepfun.com": "https://platform.stepfun.com",
      "ark.cn-beijing.volces.com": "https://www.volcengine.com/product/ark",
      "open.volcengineapi.com": "https://www.volcengine.com/docs/84992/1404668?lang=zh",
      "vod.volcengineapi.com": "https://console.volcengine.com/vod",
      "open-api.chanjing.cc": "https://www.chanjing.cc",
      "www.runninghub.cn": "https://www.runninghub.cn",
      "api.kol.cn": "https://www.ruanwenjie.com",
      "apihub.agnes-ai.com": "https://agnes-ai.com/zh-Hans",
      "www.right.codes": "https://www.rightapi.ai",
      "www.rightapi.ai": "https://www.rightapi.ai",
      "agent.mathmind.cn": "https://agent.mathmind.cn",
      "api.mathmind.cn": "https://agent.mathmind.cn",
      "duoyuanx.com": "https://duoyuanx.com",
    };
    return websiteByHost[host] || `${url.protocol}//${url.host}`;
  } catch {
    return String(baseUrl || "").trim();
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
