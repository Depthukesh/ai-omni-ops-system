﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import {
  getMyThirdPartyPlatforms,
  updateMyThirdPartyPlatformSecret,
  type GetMyThirdPartyPlatformsResponse,
  type UserThirdPartyPlatformRecord,
} from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatCollaboratorRoleLabel, formatDateTime, isAuthFailure } from "../route-helpers";

type PlatformDraft = {
  apiKey: string;
  baseUrl: string;
  mobile: string;
  password: string;
};

const adminSystemRoles = new Set(["SUPER_ADMIN", "ADMIN_OPERATOR", "FINANCE_OPERATOR", "SUPPORT_OPERATOR"]);
const platformStatusLabelMap: Record<UserThirdPartyPlatformRecord["status"], string> = {
  ACTIVE: "启用中",
  DRAFT: "草稿",
  DISABLED: "已停用",
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : String(value || "");
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => normalizeString(item).trim()).filter(Boolean);
}

function normalizeDynamicStats(value: unknown): UserThirdPartyPlatformRecord["dynamicStats"] {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const status = record.status;
  if (status !== "ready" && status !== "partial" && status !== "missing_credential" && status !== "error") {
    return undefined;
  }
  return {
    status,
    templateCount: typeof record.templateCount === "number" ? record.templateCount : undefined,
    customPersonCount: typeof record.customPersonCount === "number" ? record.customPersonCount : undefined,
    tagCount: typeof record.tagCount === "number" ? record.tagCount : undefined,
    syncedAt: normalizeString(record.syncedAt || "").trim() || undefined,
    message: normalizeString(record.message || "").trim() || undefined,
  };
}

function normalizePlatformRecord(platform: unknown): UserThirdPartyPlatformRecord | null {
  if (!platform || typeof platform !== "object") {
    return null;
  }
  const record = platform as Record<string, unknown>;
  const id = normalizeString(record.id).trim();
  const name = normalizeString(record.name).trim();
  if (!id || !name) {
    return null;
  }
  const providerType = record.providerType;
  const status = record.status;
  return {
    id,
    name,
    providerType:
      providerType === "OPENAI" || providerType === "GEMINI" || providerType === "DOUBAO" || providerType === "CUSTOM"
        ? providerType
        : "CUSTOM",
    status: status === "ACTIVE" || status === "DISABLED" || status === "DRAFT" ? status : "DRAFT",
    baseUrl: normalizeString(record.baseUrl).trim(),
    websiteUrl: normalizeString(record.websiteUrl).trim() || normalizeString(record.baseUrl).trim(),
    tutorialUrl: normalizeString(record.tutorialUrl).trim(),
    modelIds: normalizeStringArray(record.modelIds),
    defaultModel: normalizeString(record.defaultModel).trim(),
    remark: normalizeString(record.remark).trim(),
    updatedAt: normalizeString(record.updatedAt).trim(),
    apiKey: normalizeString(record.apiKey),
    effectiveApiKeyMasked: normalizeString(record.effectiveApiKeyMasked).trim() || "未设置",
    dynamicStats: normalizeDynamicStats(record.dynamicStats),
  };
}

function normalizePlatformResponse(result: GetMyThirdPartyPlatformsResponse): GetMyThirdPartyPlatformsResponse {
  const platforms = Array.isArray(result?.platforms)
    ? result.platforms.map((item) => normalizePlatformRecord(item)).filter(Boolean) as UserThirdPartyPlatformRecord[]
    : [];
  return {
    brandId: normalizeString(result?.brandId).trim(),
    role: normalizeString(result?.role).trim(),
    canManage: Boolean(result?.canManage),
    platforms,
  };
}

function isChanjingPlatform(platform?: UserThirdPartyPlatformRecord) {
  const searchable = [platform?.name, platform?.baseUrl, platform?.tutorialUrl, platform?.remark].join(" ").toLowerCase();
  return searchable.includes("chanjing") || searchable.includes("蝉镜");
}

function isDuoyuanxPlatform(platform?: UserThirdPartyPlatformRecord) {
  const searchable = [platform?.name, platform?.baseUrl, platform?.tutorialUrl, platform?.remark].join(" ").toLowerCase();
  return searchable.includes("duoyuanx") || searchable.includes("多元探索");
}

function isRuanwenjiePlatform(platform?: UserThirdPartyPlatformRecord) {
  const searchable = [platform?.name, platform?.baseUrl, platform?.tutorialUrl, platform?.remark].join(" ").toLowerCase();
  return searchable.includes("api.kol.cn") || searchable.includes("ruanwenjie") || searchable.includes("软文街");
}

function isVideoRemixPlatform(platform?: UserThirdPartyPlatformRecord) {
  const searchable = [platform?.id, platform?.name, platform?.baseUrl, platform?.tutorialUrl, platform?.remark].join(" ").toLowerCase();
  return searchable.includes("视频混剪") || searchable.includes("mixedcut") || searchable.includes("videoautocut");
}

function parseVideoRemixCredential(value: string, fallbackBaseUrl = "") {
  const normalized = normalizeString(value).trim();
  if (!normalized) {
    return {
      baseUrl: fallbackBaseUrl,
      apiKey: "",
    };
  }
  try {
    const parsed = JSON.parse(normalized) as Record<string, unknown>;
    return {
      baseUrl: normalizeString(parsed.baseUrl).trim() || fallbackBaseUrl,
      apiKey: normalizeString(parsed.apiKey).trim(),
    };
  } catch {
    return {
      baseUrl: fallbackBaseUrl,
      apiKey: normalized,
    };
  }
}

function parsePlatformDraft(platform: UserThirdPartyPlatformRecord): PlatformDraft {
  if (isVideoRemixPlatform(platform)) {
    const parsed = parseVideoRemixCredential(platform.apiKey, platform.baseUrl);
    return {
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      mobile: "",
      password: "",
    };
  }
  if (!isRuanwenjiePlatform(platform)) {
    return {
      apiKey: platform.apiKey,
      baseUrl: "",
      mobile: "",
      password: "",
    };
  }
  try {
    const parsed = JSON.parse(platform.apiKey) as Record<string, unknown>;
    return {
      apiKey: normalizeString(parsed.apiKey),
      baseUrl: "",
      mobile: normalizeString(parsed.mobile),
      password: normalizeString(parsed.password),
    };
  } catch {
    const parts = normalizeString(platform.apiKey)
      .split("::")
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      return {
        apiKey: parts[0] || "",
        baseUrl: "",
        mobile: parts[1] || "",
        password: parts[2] || "",
      };
    }
    return {
      apiKey: "",
      baseUrl: "",
      mobile: "",
      password: "",
    };
  }
}

function buildPlatformSecretPayload(platform: UserThirdPartyPlatformRecord, draft: PlatformDraft) {
  if (isVideoRemixPlatform(platform)) {
    const baseUrl = draft.baseUrl.trim();
    const apiKey = draft.apiKey.trim();
    if (!baseUrl && !apiKey) {
      return "";
    }
    return JSON.stringify({
      baseUrl,
      apiKey,
    });
  }
  if (!isRuanwenjiePlatform(platform)) {
    return draft.apiKey;
  }
  return JSON.stringify({
    apiKey: draft.apiKey.trim(),
    mobile: draft.mobile.trim(),
    password: draft.password.trim(),
    identity: "advertiser",
    captchaToken: "advertiser",
    captcha: "advertiser",
  });
}

function getConfiguredBadgeLabel(platform: UserThirdPartyPlatformRecord) {
  if (isVideoRemixPlatform(platform)) {
    return parseVideoRemixCredential(platform.apiKey, platform.baseUrl).baseUrl ? "已配置服务" : "未配置服务";
  }
  return isRuanwenjiePlatform(platform)
    ? (platform.apiKey ? "已配置凭证" : "未配置凭证")
    : (platform.apiKey ? "已配置 Key" : "未配置 Key");
}

function getPlatformMetricTitle(platform: UserThirdPartyPlatformRecord) {
  if (isVideoRemixPlatform(platform)) {
    return "接入方式";
  }
  return isChanjingPlatform(platform) ? "模板数" : "模型数";
}

function getPlatformMetricValue(platform: UserThirdPartyPlatformRecord) {
  if (isVideoRemixPlatform(platform)) {
    return "HTTP 服务";
  }
  if (isChanjingPlatform(platform)) {
    if (platform.dynamicStats?.status === "ready" || platform.dynamicStats?.status === "partial") {
      return String(platform.dynamicStats.templateCount ?? 0);
    }
    return "-";
  }
  return String(platform.modelIds.length);
}

function getPlatformDefaultLabel(platform: UserThirdPartyPlatformRecord) {
  if (isVideoRemixPlatform(platform)) {
    return "服务入口";
  }
  return isChanjingPlatform(platform) ? "定制数字人数" : "默认模型";
}

function getPlatformDefaultValue(platform: UserThirdPartyPlatformRecord) {
  if (isVideoRemixPlatform(platform)) {
    return parseVideoRemixCredential(platform.apiKey, platform.baseUrl).baseUrl || platform.baseUrl || "-";
  }
  if (isChanjingPlatform(platform)) {
    if (platform.dynamicStats?.status === "ready" || platform.dynamicStats?.status === "partial") {
      return String(platform.dynamicStats.customPersonCount ?? 0);
    }
    if (platform.dynamicStats?.status === "missing_credential") {
      return "待配置凭证";
    }
    return platform.dynamicStats?.message || "-";
  }
  return platform.defaultModel || "-";
}

function getChanjingStatsSummary(platform: UserThirdPartyPlatformRecord) {
  if (!isChanjingPlatform(platform)) {
    return "";
  }
  if (platform.dynamicStats?.status === "ready") {
    return `标签 ${platform.dynamicStats.tagCount ?? 0} 个，已同步真实模板与定制数字人统计。`;
  }
  if (platform.dynamicStats?.status === "partial") {
    const tagText = typeof platform.dynamicStats.tagCount === "number"
      ? `标签 ${platform.dynamicStats.tagCount} 个`
      : "标签统计暂不可用";
    return `${tagText}，模板与定制数字人数已同步。${platform.dynamicStats.message ? ` ${platform.dynamicStats.message}` : ""}`;
  }
  if (platform.dynamicStats?.status === "missing_credential") {
    return "当前还未配置蝉镜凭证，暂时无法同步模板与形象统计。";
  }
  if (platform.dynamicStats?.status === "error") {
    return platform.dynamicStats.message || "蝉镜统计同步失败";
  }
  return "蝉镜统计尚未同步";
}

function getDuoyuanxSummary(platform: UserThirdPartyPlatformRecord) {
  if (!isDuoyuanxPlatform(platform)) {
    return "";
  }
  const families = ["文本", "图像", "视频", "音频", "音乐"];
  return `当前展示的是多元探索统一网关能力，已预装 ${families.join(" / ")} 模型家族；配置同一份平台 Key 后，可按供应商作用域分别启用。`;
}

function getVideoRemixSummary(platform: UserThirdPartyPlatformRecord) {
  if (!isVideoRemixPlatform(platform)) {
    return "";
  }
  const parsed = parseVideoRemixCredential(platform.apiKey, platform.baseUrl);
  return parsed.baseUrl
    ? `当前品牌已绑定视频混剪服务地址 ${parsed.baseUrl}，后续工作台可以直接复用这份配置去对接 mixedcut HTTP 接口。`
    : "视频混剪建议以独立 Docker 或本地 Python 服务运行；先在这里保存服务地址，内容获客里的“视频混剪”板块会复用这份品牌共享配置。";
}

export default function PersonalCenterThirdPartyPlatformsPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<UserThirdPartyPlatformRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PlatformDraft>>({});
  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [systemRole, setSystemRole] = useState<string>("USER");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savingPlatformId, setSavingPlatformId] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/third-party-platforms"));
      return;
    }

    setSystemRole(session.user?.systemRole || "USER");
    void loadPage();
  }, [router]);

  useEffect(() => {
    if (!selectedPlatformId && platforms.length) {
      setSelectedPlatformId(platforms[0].id);
    }
  }, [platforms, selectedPlatformId]);

  const filteredPlatforms = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return platforms.filter((item) => {
      if (!keyword) {
        return true;
      }
      return [item.name, item.baseUrl, item.websiteUrl, item.defaultModel, item.modelIds.join(" "), item.remark]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [platforms, search]);

  useEffect(() => {
    if (!filteredPlatforms.length) {
      return;
    }
    if (!filteredPlatforms.find((item) => item.id === selectedPlatformId)) {
      setSelectedPlatformId(filteredPlatforms[0]?.id || "");
    }
  }, [filteredPlatforms, selectedPlatformId]);

  useEffect(() => {
    const normalizedKeyword = search.trim();
    if (!normalizedKeyword || filteredPlatforms.length || !platforms.length) {
      return;
    }
    if (/^\d{6,}$/.test(normalizedKeyword)) {
      setSearch("");
    }
  }, [filteredPlatforms.length, platforms.length, search]);

  const selectedPlatform = useMemo(
    () =>
      platforms.find((item) => item.id === selectedPlatformId)
      ?? filteredPlatforms[0]
      ?? platforms[0],
    [filteredPlatforms, platforms, selectedPlatformId],
  );
  const selectedDraft = selectedPlatform ? drafts[selectedPlatform.id] : undefined;
  const serializedSelectedDraft = selectedPlatform && selectedDraft ? buildPlatformSecretPayload(selectedPlatform, selectedDraft) : "";
  const isDirty = selectedPlatform && selectedDraft ? serializedSelectedDraft !== selectedPlatform.apiKey : false;
  const selectedPlatformIsChanjing = isChanjingPlatform(selectedPlatform);
  const selectedPlatformIsRuanwenjie = isRuanwenjiePlatform(selectedPlatform);
  const selectedPlatformIsVideoRemix = isVideoRemixPlatform(selectedPlatform);
  const selectedPlatformLaunchUrl = selectedPlatformIsVideoRemix
    ? (selectedDraft?.baseUrl || selectedPlatform?.baseUrl || "")
    : (selectedPlatform?.websiteUrl || "");

  async function loadPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [meResult, platformResult] = await Promise.allSettled([getMe(), getMyThirdPartyPlatforms()]);

    if (
      (meResult.status === "rejected" && isAuthFailure(meResult.reason))
      || (platformResult.status === "rejected" && isAuthFailure(platformResult.reason))
    ) {
      await handleSessionExpired();
      return;
    }

    if (meResult.status === "fulfilled") {
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
      setSystemRole(meResult.value.user.systemRole || "USER");
    } else {
      setBrands([]);
      setCurrentBrandId("");
    }

    if (platformResult.status === "fulfilled") {
      applyPlatformResponse(platformResult.value);
    } else {
      setPlatforms([]);
      setDrafts({});
      setSelectedPlatformId("");
      setRole("");
      setCanManage(false);
      setErrorMessage(platformResult.reason instanceof Error ? platformResult.reason.message : "第三方接口配置加载失败");
    }

    setIsLoading(false);
  }

  function applyPlatformResponse(result: GetMyThirdPartyPlatformsResponse) {
    const normalized = normalizePlatformResponse(result);
    setPlatforms(normalized.platforms);
    setDrafts(
      Object.fromEntries(
        normalized.platforms.map((item) => [
          item.id,
          parsePlatformDraft(item),
        ]),
      ) as Record<string, PlatformDraft>,
    );
    setSearch("");
    setSelectedPlatformId((current) => current || normalized.platforms[0]?.id || "");
    setRole(normalized.role || "");
    setCanManage(Boolean(normalized.canManage));
  }

  async function handleBrandSwitch(nextBrandId: string) {
    if (!nextBrandId || nextBrandId === currentBrandId) {
      return;
    }

    setIsSwitchingBrand(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await switchBrand(nextBrandId);
      setBrands(result.brands);
      setCurrentBrandId(result.currentBrandId || nextBrandId);
      await loadPage();
      setNotice("品牌工作区已切换，第三方接口配置已同步刷新。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "切换品牌失败";
      setErrorMessage(`切换品牌失败：${message}`);
    } finally {
      setIsSwitchingBrand(false);
    }
  }

  async function handleSavePlatform(platformId: string) {
    const platform = platforms.find((item) => item.id === platformId);
    const draft = drafts[platformId];
    if (!platform || !draft || !canManage) {
      return;
    }
    if (isRuanwenjiePlatform(platform) && (!draft.apiKey.trim() || !draft.mobile.trim() || !draft.password.trim())) {
      setErrorMessage("保存失败：软文街需要同时填写 API Key、登录账号和登录密码。");
      return;
    }

    setSavingPlatformId(platformId);
    setNotice("");
    setErrorMessage("");
    try {
      const updated = await updateMyThirdPartyPlatformSecret(platformId, {
        apiKey: buildPlatformSecretPayload(platform, draft),
      });
      setPlatforms((current) => current.map((item) => (item.id === platformId ? updated : item)));
      setDrafts((current) => ({
        ...current,
        [platformId]: parsePlatformDraft(updated),
      }));
      setNotice(`已保存「${updated.name}」的品牌共享配置。`);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "保存失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setSavingPlatformId("");
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setNotice("");
    setErrorMessage("");
    try {
      await logoutSession();
      router.replace("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "退出登录失败";
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSessionExpired() {
    await logoutSession();
    router.replace(buildPersonalCenterLoginPath("/personal-center/third-party-platforms"));
  }

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>第三方平台配置</h2>
          <p className="panel-subtext">按平台查看第三方平台链接、大模型 ID 和说明文档；拥有该板块编辑权限的成员才可以维护品牌共享 API Key，并同步给当前品牌工作区使用。</p>
        </div>
        <span>{search.trim() ? `${filteredPlatforms.length}/${platforms.length}` : platforms.length} 个平台</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${canManage ? "status-ready" : "status-paused"}`}>
            {formatCollaboratorRoleLabel(role) || "未识别角色"}
          </span>
          {isLoading ? <span className="status-text">正在加载第三方接口配置...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadPage()} disabled={isLoading || isSwitchingBrand}>
          刷新配置
        </button>
        <label className="field" style={{ minWidth: 220 }}>
          <span>当前品牌</span>
          <select
            value={currentBrandId}
            onChange={(event) => void handleBrandSwitch(event.target.value)}
            disabled={!brands.length || isLoading || isSwitchingBrand || isLoggingOut}
          >
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.brandName} · {formatCollaboratorRoleLabel(item.role)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={() => void handleLogout()} disabled={isLoggingOut || isSwitchingBrand}>
          {isLoggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/personal-center" className="secondary-button">
          返回个人中心概览
        </Link>
        <Link href="/personal-center/third-party-platforms/video-remix" className="secondary-button">
          视频混剪设置
        </Link>
        {adminSystemRoles.has(systemRole) ? (
          <Link href="/admin" className="primary-button">
            去后台接口供应商
          </Link>
        ) : null}
      </div>

      <div className="personal-toolbar" style={{ alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <label className="field personal-search" style={{ minWidth: 280 }}>
          <span>搜索平台</span>
          <input
            type="search"
            name="platform-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索平台名称、Base URL、模型 ID、备注"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        {search.trim() ? (
          <button type="button" className="secondary-button" onClick={() => setSearch("")}>
            清空搜索
          </button>
        ) : null}
        <div className="workspace-status">
          <span className="status-text">当前品牌：{currentBrand?.brandName || "未绑定品牌"}</span>
          <span className="status-text">{canManage ? "当前角色可维护品牌共享 API Key" : "当前角色仅可查看平台基线"}</span>
        </div>
      </div>

      <div className="personal-split-layout" style={{ gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)" }}>
        <div className="personal-list personal-split-sidebar">
          {filteredPlatforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className={`entity-card personal-card personal-platform-card ${platform.id === selectedPlatform?.id ? "is-selected" : ""}`}
              onClick={() => setSelectedPlatformId(platform.id)}
              style={{ width: "100%", textAlign: "left" }}
            >
              <div className="entity-card-head">
                <div>
                  <strong>{platform.name}</strong>
                  <p className="personal-meta">平台类型：{platform.providerType}</p>
                </div>
                <span className={`archive-pill ${platform.apiKey ? "status-in_progress" : "status-ready"}`}>
                  {getConfiguredBadgeLabel(platform)}
                </span>
              </div>
              <div className="personal-grid">
                <div>
                  <span>{getPlatformMetricTitle(platform)}</span>
                  <strong>{getPlatformMetricValue(platform)}</strong>
                </div>
                <div>
                  <span>{getPlatformDefaultLabel(platform)}</span>
                  <strong>{getPlatformDefaultValue(platform)}</strong>
                </div>
                <div>
                  <span>平台类型</span>
                  <strong>{platform.providerType}</strong>
                </div>
                <div>
                  <span>最近同步</span>
                  <strong>{formatDateTime(platform.updatedAt)}</strong>
                </div>
              </div>
              {isChanjingPlatform(platform) ? <p className="panel-subtext" style={{ marginTop: 12 }}>{getChanjingStatsSummary(platform)}</p> : null}
              {isDuoyuanxPlatform(platform) ? <p className="panel-subtext" style={{ marginTop: 12 }}>{getDuoyuanxSummary(platform)}</p> : null}
              {isVideoRemixPlatform(platform) ? <p className="panel-subtext" style={{ marginTop: 12 }}>{getVideoRemixSummary(platform)}</p> : null}
            </button>
          ))}
          {!filteredPlatforms.length ? (
            <div className="empty-canvas-box">
              <strong>没有找到匹配的平台</strong>
              <p>{search.trim() ? "可以先清空搜索词，再从左侧平台清单里重新选择。" : "当前品牌暂时没有可展示的第三方平台配置，请稍后刷新后再试。"}</p>
              <div className="personal-actions">
                {search.trim() ? (
                  <button type="button" className="secondary-button" onClick={() => setSearch("")}>
                    清空搜索词
                  </button>
                ) : (
                  <button type="button" className="secondary-button" onClick={() => void loadPage()} disabled={isLoading || isSwitchingBrand}>
                    重新刷新
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {selectedPlatform && selectedDraft ? (
          <article className="entity-card personal-card personal-split-main">
            <div className="entity-card-head">
              <div>
                <strong>{selectedPlatform.name}</strong>
                <p className="personal-meta">平台类型：{selectedPlatform.providerType}</p>
              </div>
              <span className={`archive-pill ${selectedPlatform.status === "ACTIVE" ? "status-ready" : selectedPlatform.status === "DRAFT" ? "status-in_progress" : "status-paused"}`}>
                {platformStatusLabelMap[selectedPlatform.status]}
              </span>
            </div>

            <div className="personal-context-banner">
              <div>
                <strong>当前正在维护「{selectedPlatform.name}」的品牌共享配置</strong>
                <p>
                  {canManage
                    ? isDirty
                      ? "当前品牌共享配置已有未保存修改。确认无误后保存，当前品牌下具备权限的成员会共用这份配置。"
                      : "可以在这里校验当前品牌的共享配置、默认模型和说明文档，再按需更新。"
                    : "当前角色只有查看权限。你仍可核对平台基线、说明文档与已脱敏的品牌共享 Key。"}
                </p>
              </div>
              <div className="personal-context-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleSavePlatform(selectedPlatform.id)}
                  disabled={!canManage || !isDirty || savingPlatformId === selectedPlatform.id}
                >
                  {savingPlatformId === selectedPlatform.id
                    ? "保存中..."
                    : selectedPlatformIsRuanwenjie
                      ? "保存品牌共享投放凭证"
                      : selectedPlatformIsVideoRemix
                        ? "保存视频混剪服务配置"
                        : "保存品牌共享 API Key"}
                </button>
                {selectedPlatformLaunchUrl ? (
                  <a href={selectedPlatformLaunchUrl} target="_blank" rel="noreferrer" className="secondary-button">
                    {selectedPlatformIsVideoRemix ? "打开混剪服务" : "打开第三方平台"}
                  </a>
                ) : null}
                {selectedPlatform.tutorialUrl ? (
                  <a href={selectedPlatform.tutorialUrl} target="_blank" rel="noreferrer" className="secondary-button">
                    打开说明文档
                  </a>
                ) : null}
              </div>
            </div>

            {!canManage ? (
              <div className="personal-inline-hint" style={{ marginBottom: 16 }}>
                <strong>当前为只读模式</strong>
                当前角色没有第三方接口配置的编辑权限，只能查看平台基线与已脱敏的品牌共享 Key。如需更新，请联系当前品牌管理员处理。
              </div>
            ) : null}

            <div className="personal-grid" style={{ marginBottom: 16 }}>
              <div>
                <span>API 接口地址</span>
                <strong style={{ wordBreak: "break-all" }}>{selectedPlatform.baseUrl || "-"}</strong>
              </div>
              <div>
                <span>平台官网地址</span>
                <strong style={{ wordBreak: "break-all" }}>{selectedPlatform.websiteUrl || "未配置平台官网地址"}</strong>
              </div>
              <div>
                <span>{getPlatformDefaultLabel(selectedPlatform)}</span>
                <strong style={{ wordBreak: "break-all" }}>{getPlatformDefaultValue(selectedPlatform)}</strong>
              </div>
              <div>
                <span>{selectedPlatformIsVideoRemix ? "当前品牌服务鉴权" : selectedPlatformIsRuanwenjie ? "当前品牌投放凭证" : "当前品牌 API Key"}</span>
                <strong>{selectedPlatformIsVideoRemix ? (selectedDraft.apiKey ? "已配置 API Key" : "未配置 API Key") : selectedPlatform.effectiveApiKeyMasked}</strong>
              </div>
              <div>
                <span>最近更新时间</span>
                <strong>{formatDateTime(selectedPlatform.updatedAt)}</strong>
              </div>
            </div>
            {selectedPlatformIsChanjing ? (
              <div className="personal-inline-hint" style={{ marginBottom: 16 }}>
                <strong>蝉镜同步摘要</strong>
                {getChanjingStatsSummary(selectedPlatform)}
              </div>
            ) : null}
            {isDuoyuanxPlatform(selectedPlatform) ? (
              <div className="personal-inline-hint" style={{ marginBottom: 16 }}>
                <strong>统一网关说明</strong>
                {getDuoyuanxSummary(selectedPlatform)}
              </div>
            ) : null}
            {selectedPlatformIsVideoRemix ? (
              <div className="personal-inline-hint" style={{ marginBottom: 16 }}>
                <strong>视频混剪接入说明</strong>
                {getVideoRemixSummary(selectedPlatform)}
              </div>
            ) : null}

            <div className="personal-list">
              {selectedPlatformIsVideoRemix ? (
                <>
                  <div className="form-grid two-column">
                    <label className="field">
                      <span>服务地址</span>
                      <input
                        type="text"
                        value={selectedDraft.baseUrl}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [selectedPlatform.id]: {
                              ...current[selectedPlatform.id],
                              baseUrl: event.target.value,
                            },
                          }))
                        }
                        disabled={!canManage}
                        placeholder="例如 http://127.0.0.1:5000"
                      />
                    </label>
                    <label className="field">
                      <span>API Key（可选）</span>
                      <input
                        type="password"
                        value={selectedDraft.apiKey}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [selectedPlatform.id]: {
                              ...current[selectedPlatform.id],
                              apiKey: event.target.value,
                            },
                          }))
                        }
                        disabled={!canManage}
                        placeholder="如果视频混剪服务前面挂了鉴权网关，可在这里填写"
                      />
                    </label>
                  </div>
                  <div className="personal-inline-hint" style={{ marginBottom: 16 }}>
                    <strong>推荐填写方式</strong>
                    优先把 mixedcut 独立部署在 Docker 或本地 Python 服务上，然后把工作台实际可访问的 HTTP 地址填到这里；如果没有额外鉴权，API Key 可以留空。
                  </div>
                </>
              ) : selectedPlatformIsRuanwenjie ? (
                <>
                  <div className="form-grid two-column">
                    <label className="field">
                      <span>软文街 API Key</span>
                      <input
                        type="password"
                        value={selectedDraft.apiKey}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [selectedPlatform.id]: {
                              ...current[selectedPlatform.id],
                              apiKey: event.target.value,
                            },
                          }))
                        }
                        disabled={!canManage}
                        placeholder="填写软文街 API Key"
                      />
                    </label>
                    <label className="field">
                      <span>登录账号</span>
                      <input
                        type="text"
                        value={selectedDraft.mobile}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [selectedPlatform.id]: {
                              ...current[selectedPlatform.id],
                              mobile: event.target.value,
                            },
                          }))
                        }
                        disabled={!canManage}
                        placeholder="填写软文街登录账号"
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>登录密码</span>
                    <input
                      type="password"
                      value={selectedDraft.password}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [selectedPlatform.id]: {
                            ...current[selectedPlatform.id],
                            password: event.target.value,
                          },
                        }))
                      }
                      disabled={!canManage}
                      placeholder="填写软文街登录密码"
                    />
                    <small className="personal-meta">
                      软文街会复用这三项品牌共享凭证获取 token；文档里的 `identity / captcha_token / captcha` 将按示例固定补成 `advertiser`，不需要你额外填写。
                    </small>
                  </label>
                </>
              ) : (
                <label className="field">
                  <span>{selectedPlatformIsChanjing ? "蝉镜凭证" : "API Key"}</span>
                  <input
                    type="password"
                    value={selectedDraft.apiKey}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [selectedPlatform.id]: {
                          ...current[selectedPlatform.id],
                          apiKey: event.target.value,
                        },
                      }))
                    }
                    disabled={!canManage}
                    placeholder={selectedPlatformIsChanjing ? "按 appId::secretKey 格式填写蝉镜凭证" : "填写当前品牌在该平台使用的共享 API Key"}
                  />
                  <small className="personal-meta">
                    {selectedPlatformIsChanjing
                      ? "蝉镜平台当前复用单字段存储，请填写 `appId::secretKey`；系统会在服务端自动换取 access_token，不需要手动填写 token。"
                      : isDuoyuanxPlatform(selectedPlatform)
                        ? "多元探索是统一网关型平台，当前品牌只需要维护一份平台 Key；后台的文本、图像、视频、音频、音乐供应商会共用这份品牌共享 Key。"
                        : "该字段是当前品牌共享值，同品牌下有编辑权限的管理员维护的是同一份 Key，不会影响后台平台基线。"}
                  </small>
                </label>
              )}

              <div className="field">
                <span>{selectedPlatformIsChanjing ? "动态统计" : selectedPlatformIsRuanwenjie ? "投放说明" : selectedPlatformIsVideoRemix ? "能力说明" : "大模型 ID"}</span>
                <div className="admin-provider-chip-row" style={{ marginTop: 8 }}>
                  {selectedPlatformIsChanjing ? (
                    <>
                      <span className="admin-provider-chip">模板 {selectedPlatform.dynamicStats?.templateCount ?? "-"}</span>
                      <span className="admin-provider-chip">数字人 {selectedPlatform.dynamicStats?.customPersonCount ?? "-"}</span>
                      <span className="admin-provider-chip">标签 {selectedPlatform.dynamicStats?.tagCount ?? "-"}</span>
                    </>
                  ) : selectedPlatformIsRuanwenjie ? (
                    <>
                      <span className="admin-provider-chip">拉媒体列表</span>
                      <span className="admin-provider-chip">选 GEO 文章</span>
                      <span className="admin-provider-chip">提交投放订单</span>
                    </>
                  ) : selectedPlatformIsVideoRemix ? (
                    <>
                      <span className="admin-provider-chip">上传素材</span>
                      <span className="admin-provider-chip">发起混剪</span>
                      <span className="admin-provider-chip">轮询进度</span>
                      <span className="admin-provider-chip">导出剪映草稿</span>
                    </>
                  ) : selectedPlatform.modelIds.length ? (
                    selectedPlatform.modelIds.map((model) => (
                      <span key={model} className="admin-provider-chip">
                        {model}
                      </span>
                    ))
                  ) : (
                    <span className="admin-provider-chip">未配置模型</span>
                  )}
                </div>
              </div>

              <div className="field">
                <span>说明文档</span>
                <strong style={{ wordBreak: "break-all" }}>{selectedPlatform.tutorialUrl || "未配置说明文档"}</strong>
              </div>

              <label className="field">
                <span>备注</span>
                <textarea value={selectedPlatform.remark} rows={4} disabled />
              </label>
            </div>
          </article>
        ) : (
          <div className="empty-canvas-box">
            <strong>{search.trim() ? "当前搜索结果为空" : "请选择左侧平台查看配置详情"}</strong>
            <p>{search.trim() ? "可以先清空搜索词，再从平台清单里重新选择需要维护的平台。" : "进入右侧详情后即可核对共享 Key、说明文档和当前品牌的同步状态。"}</p>
            <div className="personal-actions">
              {search.trim() ? (
                <button type="button" className="secondary-button" onClick={() => setSearch("")}>
                  清空搜索词
                </button>
              ) : (
                <Link href="/personal-center" className="secondary-button">
                  返回个人中心概览
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
