"use client";

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

function getPlatformMetricTitle(platform: UserThirdPartyPlatformRecord) {
  return isChanjingPlatform(platform) ? "模板数" : "模型数";
}

function getPlatformMetricValue(platform: UserThirdPartyPlatformRecord) {
  if (isChanjingPlatform(platform)) {
    if (platform.dynamicStats?.status === "ready" || platform.dynamicStats?.status === "partial") {
      return String(platform.dynamicStats.templateCount ?? 0);
    }
    return "-";
  }
  return String(platform.modelIds.length);
}

function getPlatformDefaultLabel(platform: UserThirdPartyPlatformRecord) {
  return isChanjingPlatform(platform) ? "定制数字人数" : "默认模型";
}

function getPlatformDefaultValue(platform: UserThirdPartyPlatformRecord) {
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
      return [item.name, item.baseUrl, item.defaultModel, item.modelIds.join(" "), item.remark]
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
  const isDirty = selectedPlatform && selectedDraft ? selectedDraft.apiKey !== selectedPlatform.apiKey : false;
  const selectedPlatformIsChanjing = isChanjingPlatform(selectedPlatform);

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
          {
            apiKey: item.apiKey,
          },
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

    setSavingPlatformId(platformId);
    setNotice("");
    setErrorMessage("");
    try {
      const updated = await updateMyThirdPartyPlatformSecret(platformId, { apiKey: draft.apiKey });
      setPlatforms((current) => current.map((item) => (item.id === platformId ? updated : item)));
      setDrafts((current) => ({
        ...current,
        [platformId]: {
          apiKey: updated.apiKey,
        },
      }));
      setNotice(`已保存「${updated.name}」的品牌共享 API Key。`);
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
          <p className="panel-subtext">按平台查看第三方平台链接、大模型 ID 和说明文档；拥有该板块编辑权限的成员才可以维护品牌共享 API Key。</p>
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)", gap: 16, marginTop: 16 }}>
        <div className="personal-list">
          {filteredPlatforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className="entity-card personal-card"
              onClick={() => setSelectedPlatformId(platform.id)}
              style={{
                width: "100%",
                textAlign: "left",
                border: platform.id === selectedPlatform?.id ? "1px solid rgba(30, 64, 175, 0.45)" : undefined,
                background: platform.id === selectedPlatform?.id ? "rgba(239, 246, 255, 0.8)" : undefined,
              }}
            >
              <div className="entity-card-head">
                <div>
                  <strong>{platform.name}</strong>
                  <p className="personal-meta">平台类型：{platform.providerType}</p>
                </div>
                <span className={`archive-pill ${platform.apiKey ? "status-in_progress" : "status-ready"}`}>
                  {platform.apiKey ? "已配置 Key" : "未配置 Key"}
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
            </button>
          ))}
          {!filteredPlatforms.length ? <div className="empty-canvas-box">暂无匹配平台，请调整搜索词。</div> : null}
        </div>

        {selectedPlatform && selectedDraft ? (
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>{selectedPlatform.name}</strong>
                <p className="personal-meta">平台类型：{selectedPlatform.providerType}</p>
              </div>
              <span className={`archive-pill ${selectedPlatform.status === "ACTIVE" ? "status-ready" : selectedPlatform.status === "DRAFT" ? "status-in_progress" : "status-paused"}`}>
                {platformStatusLabelMap[selectedPlatform.status]}
              </span>
            </div>

            <div className="personal-actions" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSavePlatform(selectedPlatform.id)}
                disabled={!canManage || !isDirty || savingPlatformId === selectedPlatform.id}
              >
                {savingPlatformId === selectedPlatform.id ? "保存中..." : "保存品牌共享 API Key"}
              </button>
            </div>

            {!canManage ? (
              <div className="empty-canvas-box" style={{ marginBottom: 16 }}>
                当前角色没有第三方接口配置的编辑权限，只能查看平台基线与已脱敏的品牌共享 Key。
              </div>
            ) : null}

            <div className="personal-grid" style={{ marginBottom: 16 }}>
              <div>
                <span>第三方平台链接</span>
                {selectedPlatform.baseUrl ? (
                  <a href={selectedPlatform.baseUrl} target="_blank" rel="noreferrer" className="secondary-button" style={{ width: "fit-content", marginTop: 8 }}>
                    打开第三方平台
                  </a>
                ) : (
                  <strong>-</strong>
                )}
              </div>
              <div>
                <span>{getPlatformDefaultLabel(selectedPlatform)}</span>
                <strong>{getPlatformDefaultValue(selectedPlatform)}</strong>
              </div>
              <div>
                <span>当前品牌 API Key</span>
                <strong>{selectedPlatform.effectiveApiKeyMasked}</strong>
              </div>
              <div>
                <span>最近更新时间</span>
                <strong>{formatDateTime(selectedPlatform.updatedAt)}</strong>
              </div>
            </div>
            {selectedPlatformIsChanjing ? (
              <div className="empty-canvas-box" style={{ marginBottom: 16 }}>
                {getChanjingStatsSummary(selectedPlatform)}
              </div>
            ) : null}

            <div className="personal-list">
              <label className="field">
                <span>{selectedPlatformIsChanjing ? "蝉镜凭证" : "API Key"}</span>
                <input
                  type="password"
                  value={selectedDraft.apiKey}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [selectedPlatform.id]: {
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
                    : "该字段是当前品牌共享值，同品牌下有编辑权限的管理员维护的是同一份 Key，不会影响后台平台基线。"}
                </small>
              </label>

              <div className="field">
                <span>{selectedPlatformIsChanjing ? "动态统计" : "大模型 ID"}</span>
                <div className="admin-provider-chip-row" style={{ marginTop: 8 }}>
                  {selectedPlatformIsChanjing ? (
                    <>
                      <span className="admin-provider-chip">模板 {selectedPlatform.dynamicStats?.templateCount ?? "-"}</span>
                      <span className="admin-provider-chip">数字人 {selectedPlatform.dynamicStats?.customPersonCount ?? "-"}</span>
                      <span className="admin-provider-chip">标签 {selectedPlatform.dynamicStats?.tagCount ?? "-"}</span>
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
                {selectedPlatform.tutorialUrl ? (
                  <a href={selectedPlatform.tutorialUrl} target="_blank" rel="noreferrer" className="secondary-button" style={{ width: "fit-content" }}>
                    打开说明文档
                  </a>
                ) : (
                  <div className="personal-meta">未配置说明文档</div>
                )}
              </div>

              <label className="field">
                <span>备注</span>
                <textarea value={selectedPlatform.remark} rows={4} disabled />
              </label>
            </div>
          </article>
        ) : (
          <div className="empty-canvas-box">
            {search.trim() ? "暂无匹配平台，请先清空搜索词后再查看配置详情。" : "请选择左侧平台查看配置详情。"}
          </div>
        )}
      </div>
    </section>
  );
}

