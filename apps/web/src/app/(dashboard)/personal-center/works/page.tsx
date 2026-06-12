"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import { getXiaohongshuMedia } from "../../../../services/xiaohongshu";
import { getMedia, mediaSeed, type MediaRecord } from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatCollaboratorRoleLabel, formatDateTime, getBrandDisplayName, isAuthFailure } from "../route-helpers";

type MediaTypeFilter = "ALL" | MediaRecord["mediaType"];
type MediaScopeFilter = "ALL" | "XIAOHONGSHU" | "OTHER";

const mediaTypeFilters: Array<{ key: MediaTypeFilter; label: string }> = [
  { key: "ALL", label: "全部类型" },
  { key: "HTML", label: "HTML" },
  { key: "IMAGE", label: "图片" },
  { key: "VIDEO", label: "视频" },
  { key: "DOCUMENT", label: "文档" },
  { key: "ARCHIVE", label: "归档" },
];

const mediaScopeFilters: Array<{ key: MediaScopeFilter; label: string }> = [
  { key: "ALL", label: "全部作品" },
  { key: "XIAOHONGSHU", label: "小红书作品" },
  { key: "OTHER", label: "其他资产" },
];

export default function PersonalCenterWorksPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaRecord[]>(mediaSeed);
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("ALL");
  const [scopeFilter, setScopeFilter] = useState<MediaScopeFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed">("seed");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/works"));
      return;
    }

    void loadWorksPage();
  }, [router]);

  async function loadWorksPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [meResult, mediaResult] = await Promise.allSettled([getMe(), getMedia()]);

    if (meResult.status === "rejected" && isAuthFailure(meResult.reason)) {
      await handleSessionExpired();
      return;
    }

    if (meResult.status === "fulfilled") {
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
    } else {
      setBrands([]);
      setCurrentBrandId("");
    }

    if (mediaResult.status === "fulfilled") {
      setMedia(mediaResult.value);
      setDataSource(meResult.status === "fulfilled" ? "api" : "seed");
    } else {
      setMedia(mediaSeed);
      setDataSource("seed");
      setErrorMessage("作品接口暂时不可用，当前展示的是本地演示作品数据。");
    }

    setIsLoading(false);
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
      setNotice("品牌工作区已切换，作品中心已刷新当前上下文。");
      await loadWorksPage();
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
    router.replace(buildPersonalCenterLoginPath("/personal-center/works"));
  }

  const filteredMedia = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...media]
      .sort(sortByMediaCreatedAtDesc)
      .filter((item) => typeFilter === "ALL" || item.mediaType === typeFilter)
      .filter((item) => scopeFilter === "ALL" || getMediaScope(item) === scopeFilter)
      .filter((item) => matchesKeyword(item, keyword));
  }, [media, scopeFilter, search, typeFilter]);

  const xiaohongshuMedia = useMemo(() => getXiaohongshuMedia(filteredMedia), [filteredMedia]);
  const otherMedia = useMemo(() => filteredMedia.filter((item) => getMediaScope(item) === "OTHER"), [filteredMedia]);
  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );
  const summary = useMemo(
    () => ({
      total: filteredMedia.length,
      xiaohongshu: xiaohongshuMedia.length,
      html: filteredMedia.filter((item) => item.mediaType === "HTML").length,
      image: filteredMedia.filter((item) => item.mediaType === "IMAGE").length,
      latestCreatedAt: filteredMedia[0]?.createdAt,
    }),
    [filteredMedia, xiaohongshuMedia],
  );

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>作品中心</h2>
          <p className="panel-subtext">集中查看当前账号沉淀下来的 HTML、图片、视频与文档资产，并优先承接小红书作品回跳链路。</p>
        </div>
        <span>{summary.total} 个作品</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
            {dataSource === "api" ? "接口数据" : "演示数据"}
          </span>
          {isLoading ? <span className="status-text">正在加载作品中心数据...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadWorksPage()} disabled={isLoading || isSwitchingBrand}>
          刷新作品
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
                {item.brandName} 路 {formatCollaboratorRoleLabel(item.role)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={() => void handleLogout()} disabled={isLoggingOut || isSwitchingBrand}>
          {isLoggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <article className="metric-card">
          <span>当前品牌上下文</span>
          <strong>{getBrandDisplayName(currentBrand, currentBrandId)}</strong>
          <p>当前作品列表仍按登录账号过滤，品牌内作品共享与更细权限边界会继续扩展。</p>
        </article>
        <article className="metric-card">
          <span>小红书作品</span>
          <strong>{summary.xiaohongshu}</strong>
          <p>优先展示可直接回跳到小红书工作台继续编辑、预览和发布的作品资产。</p>
        </article>
        <article className="metric-card">
          <span>HTML / 图片</span>
          <strong>{summary.html} / {summary.image}</strong>
          <p>便于快速判断当前作品沉淀是以文稿页为主，还是以封面和配图为主。</p>
        </article>
        <article className="metric-card">
          <span>最近产出</span>
          <strong>{formatDateTime(summary.latestCreatedAt)}</strong>
          <p>基于当前筛选结果显示最近一条作品的创建时间。</p>
        </article>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16 }}>
        <Link href="/xiaohongshu" className="primary-button">
          去小红书工作台
        </Link>
        <Link href="/personal-center" className="secondary-button">
          返回个人中心概览
        </Link>
      </div>

      <div className="personal-toolbar" style={{ alignItems: "flex-end" }}>
        <label className="field personal-search">
          <span>搜索作品</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索作品名称、类型、任务 ID 或品牌 ID"
          />
        </label>
      </div>

      <div className="tab-switcher" aria-label="作品范围筛选" style={{ marginTop: 16 }}>
        {mediaScopeFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-button ${scopeFilter === item.key ? "is-active" : ""}`}
            onClick={() => setScopeFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="tab-switcher" aria-label="作品类型筛选" style={{ marginTop: 12 }}>
        {mediaTypeFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-button ${typeFilter === item.key ? "is-active" : ""}`}
            onClick={() => setTypeFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="personal-list" style={{ marginTop: 16 }}>
        {xiaohongshuMedia.length ? (
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>小红书作品专区</strong>
                <p className="personal-meta">优先承接从小红书工作台生成并沉淀到个人中心的图文、封面和其他作品资产。</p>
              </div>
              <span className="archive-pill status-ready">{xiaohongshuMedia.length} 个作品</span>
            </div>
            <div className="personal-list">
              {xiaohongshuMedia.map((item) => (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.title}</strong>
                      <p className="personal-meta">{getMediaTypeLabel(item.mediaType)} 路 {item.mimeType || "未记录 MIME"}</p>
                    </div>
                    <div className="personal-actions">
                      <span className="archive-pill status-ready">{item.mediaType}</span>
                      <Link href={`/xiaohongshu?workId=${encodeURIComponent(item.id)}`} className="secondary-button">
                        回到工作台
                      </Link>
                    </div>
                  </div>
                  <MediaMetaGrid item={item} />
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {otherMedia.length ? (
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>其他作品资产</strong>
                <p className="personal-meta">保留当前登录账号的其他 HTML、图片、视频与文档资产，便于后续扩展更多作品分类。</p>
              </div>
              <span className="archive-pill status-in_progress">{otherMedia.length} 个资产</span>
            </div>
            <div className="personal-list">
              {otherMedia.map((item) => (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.title}</strong>
                      <p className="personal-meta">{getMediaTypeLabel(item.mediaType)} 路 {item.mimeType || "未记录 MIME"}</p>
                    </div>
                    <div className="personal-actions">
                      <span className="archive-pill status-ready">{item.mediaType}</span>
                      {item.assetUrl ? (
                        <a href={item.assetUrl} target="_blank" rel="noreferrer" className="secondary-button">
                          打开作品
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <MediaMetaGrid item={item} />
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {!filteredMedia.length ? <div className="empty-canvas-box">暂无作品，请先到相关工作台生成或上传作品资产。</div> : null}
        {!filteredMedia.length ? <p className="empty-state">当前没有匹配的作品记录。</p> : null}
      </div>
    </section>
  );
}

function MediaMetaGrid({ item }: { item: MediaRecord }) {
  return (
    <div className="personal-grid">
      <div>
        <span>品牌 ID</span>
        <strong>{item.brandId || "未绑定品牌"}</strong>
      </div>
      <div>
        <span>关联任务</span>
        <strong>{item.taskId || "未绑定任务"}</strong>
      </div>
      <div>
        <span>创建时间</span>
        <strong>{formatDateTime(item.createdAt)}</strong>
      </div>
      <div>
        <span>最近更新时间</span>
        <strong>{formatDateTime(item.updatedAt)}</strong>
      </div>
      <div className="field-full">
        <span>访问入口</span>
        <strong>{item.assetUrl ? "站内安全入口已生成" : "暂未生成可直接打开的入口"}</strong>
      </div>
    </div>
  );
}

function sortByMediaCreatedAtDesc(a: MediaRecord, b: MediaRecord) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function matchesKeyword(item: MediaRecord, keyword: string) {
  if (!keyword) {
    return true;
  }

  return [
    item.title,
    item.mediaType,
    item.mimeType ?? "",
    item.taskId ?? "",
    item.brandId ?? "",
    item.scope,
  ].some((value) => value.toLowerCase().includes(keyword));
}

function getMediaScope(item: MediaRecord): MediaScopeFilter {
  return item.scope === "XIAOHONGSHU" || getXiaohongshuMedia([item]).length ? "XIAOHONGSHU" : "OTHER";
}

function getMediaTypeLabel(type: MediaRecord["mediaType"]) {
  if (type === "IMAGE") {
    return "图片";
  }
  if (type === "VIDEO") {
    return "视频";
  }
  if (type === "DOCUMENT") {
    return "文档";
  }
  if (type === "ARCHIVE") {
    return "归档";
  }
  return "HTML";
}

