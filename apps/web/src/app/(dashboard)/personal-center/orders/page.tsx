"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import {
  getPersonalCenterCreativeMaterialWorkspace,
  type OpenClawCreativeMaterialCategory,
  type OpenClawCreativeMaterialRecord,
} from "../../../../services/openclaw";
import {
  getLocalRuntimeSettings,
  pickLocalMaterialLibraryBaseRoot,
  updateLocalRuntimeSettings,
  type LocalRuntimeSettings,
} from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatCollaboratorRoleLabel, formatDateTime, isAuthFailure } from "../route-helpers";

type MaterialCategoryFilter = OpenClawCreativeMaterialCategory;

const materialCategoryFilters: Array<{
  key: MaterialCategoryFilter;
  label: string;
  description: string;
}> = [
  { key: "text", label: "文本", description: "文案、脚本、正文类素材" },
  { key: "image", label: "图片", description: "封面图、海报、图片类素材" },
  { key: "audio", label: "语音", description: "语音、配乐、音频类素材" },
  { key: "video", label: "视频", description: "视频片段与成片素材" },
];

export default function PersonalCenterOrdersPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<OpenClawCreativeMaterialRecord[]>([]);
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [localRuntimeSettings, setLocalRuntimeSettings] = useState<LocalRuntimeSettings | null>(null);
  const [materialLibraryBaseRootDraft, setMaterialLibraryBaseRootDraft] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<MaterialCategoryFilter>("text");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingStorageSettings, setIsSavingStorageSettings] = useState(false);
  const [isPickingStorageFolder, setIsPickingStorageFolder] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/orders"));
      return;
    }

    void loadMaterialsPage();
  }, [router]);

  async function loadMaterialsPage(preferredBrandId?: string) {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    try {
      const me = await getMe();
      const nextBrandId = preferredBrandId || me.currentBrandId || me.brands[0]?.id || "";
      setBrands(me.brands);
      setCurrentBrandId(nextBrandId);

      const localRuntimeResult = await Promise.resolve(getLocalRuntimeSettings()).then(
        (value) => ({ status: "fulfilled" as const, value }),
        () => ({ status: "rejected" as const }),
      );
      if (localRuntimeResult.status === "fulfilled") {
        setLocalRuntimeSettings(localRuntimeResult.value);
        setMaterialLibraryBaseRootDraft(localRuntimeResult.value.materialLibrary.configuredBaseRoot);
      }

      if (!nextBrandId) {
        setMaterials([]);
        setIsLoading(false);
        return;
      }

      const workspace = await getPersonalCenterCreativeMaterialWorkspace(nextBrandId, 300);
      setMaterials([...workspace.items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "素材管理加载失败";
      setMaterials([]);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
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
      await loadMaterialsPage(result.currentBrandId || nextBrandId);
      setNotice("品牌工作区已切换，素材管理列表已更新。");
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
    router.replace(buildPersonalCenterLoginPath("/personal-center/orders"));
  }

  async function handlePickStorageFolder() {
    setIsPickingStorageFolder(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await pickLocalMaterialLibraryBaseRoot();
      if (result.canceled || !result.selectedPath) {
        setNotice("已取消选择素材存储目录。");
        return;
      }
      setMaterialLibraryBaseRootDraft(result.selectedPath);
      setNotice(`已选择素材存储目录：${result.selectedPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "选择素材存储目录失败";
      setErrorMessage(message);
    } finally {
      setIsPickingStorageFolder(false);
    }
  }

  async function handleSaveMaterialLibrarySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!localRuntimeSettings?.supported) {
      return;
    }

    setIsSavingStorageSettings(true);
    setNotice("");
    setErrorMessage("");
    try {
      const nextSettings = await updateLocalRuntimeSettings({
        materialLibraryBaseRoot: materialLibraryBaseRootDraft.trim() || null,
      });
      setLocalRuntimeSettings(nextSettings);
      setMaterialLibraryBaseRootDraft(nextSettings.materialLibrary.configuredBaseRoot);
      setNotice(nextSettings.message);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "保存素材存储目录失败";
      setErrorMessage(`保存素材存储目录失败：${message}`);
    } finally {
      setIsSavingStorageSettings(false);
    }
  }

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  const countsByCategory = useMemo(
    () => ({
      text: materials.filter((item) => item.materialCategory === "text").length,
      image: materials.filter((item) => item.materialCategory === "image").length,
      audio: materials.filter((item) => item.materialCategory === "audio").length,
      video: materials.filter((item) => item.materialCategory === "video").length,
    }),
    [materials],
  );

  const filteredMaterials = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return materials
      .filter((item) => item.materialCategory === activeCategory)
      .filter((item) => {
        if (!keyword) {
          return true;
        }
        const haystack = [
          item.title,
          item.materialType,
          item.materialTags.join(" "),
          item.sourceLabel,
          item.localFilePath || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      });
  }, [activeCategory, materials, search]);

  const activeCategoryMeta = materialCategoryFilters.find((item) => item.key === activeCategory) || materialCategoryFilters[0];

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>素材管理</h2>
          <p className="panel-subtext">统一聚合网站上传素材和 OpenClaw 入库素材，并按文本、图片、语音、视频四类紧凑展示。</p>
        </div>
        <span>{filteredMaterials.length} 条素材</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className="archive-pill status-ready">素材统一真源</span>
          {isLoading ? <span className="status-text">正在加载素材管理数据...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadMaterialsPage(currentBrandId)} disabled={isLoading || isSwitchingBrand}>
          刷新列表
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

      <div className="personal-context-banner">
        <div>
          <strong>{currentBrand?.brandName || "当前品牌"}素材总览</strong>
          <p>网站上传的素材会优先进入你设置的【素材库】目录；OpenClaw 上传到网站的素材不要求进入【素材库】，但会同步纳入这里的统一列表。</p>
        </div>
        <div className="personal-context-actions">
          <Link href="/personal-center" className="secondary-button">
            返回个人中心概览
          </Link>
        </div>
      </div>

      <div className="personal-list" style={{ marginBottom: 16 }}>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>本地存储设置</strong>
              <p className="personal-meta">点击选择文件夹后直接选存储地址即可。素材库和 GEO 等站内生成内容都会写到这里。</p>
            </div>
            <span className="archive-pill status-ready">本地版设置</span>
          </div>

          {localRuntimeSettings?.supported ? (
            <form className="form-grid" onSubmit={handleSaveMaterialLibrarySettings} style={{ marginTop: 16 }}>
              <label className="field field-full">
                <span>本地存储文件夹</span>
                <input
                  value={materialLibraryBaseRootDraft}
                  onChange={(event) => setMaterialLibraryBaseRootDraft(event.target.value)}
                  placeholder="例如 D:\\品牌素材"
                />
              </label>
              <div className="personal-actions personal-actions--tight field-full">
                <button type="button" className="secondary-button" onClick={() => void handlePickStorageFolder()} disabled={isPickingStorageFolder || isSavingStorageSettings}>
                  {isPickingStorageFolder ? "选择中..." : "选择文件夹"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMaterialLibraryBaseRootDraft(localRuntimeSettings.materialLibrary.defaultBaseRoot)}
                  disabled={isSavingStorageSettings}
                >
                  恢复默认目录
                </button>
                <button type="submit" className="primary-button" disabled={isSavingStorageSettings}>
                  {isSavingStorageSettings ? "保存中..." : "保存本地存储设置"}
                </button>
              </div>
            </form>
          ) : (
            <p className="field-hint" style={{ marginTop: 16 }}>当前不是 local-single-user 安装态，这里只展示素材库规则说明，不开放本地文件夹设置。</p>
          )}
        </article>
      </div>

      <div className="personal-split-layout personal-material-layout">
        <aside className="personal-split-sidebar personal-material-layout__sidebar">
          <div className="personal-material-nav">
            {materialCategoryFilters.map((item) => {
              const count = countsByCategory[item.key];
              const isActive = activeCategory === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`personal-material-nav__item ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(item.key)}
                >
                  <strong>{item.label}</strong>
                  <span>{count} 条</span>
                  <p>{item.description}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="personal-split-main">
          <div className="personal-toolbar personal-toolbar-cluster">
            <label className="field personal-search">
              <span>搜索素材</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索标题、标签、来源或本地路径"
              />
            </label>
            {search.trim() ? (
              <button type="button" className="secondary-button" onClick={() => setSearch("")}>
                清空搜索
              </button>
            ) : null}
          </div>

          <div className="personal-inline-hint" style={{ marginTop: 16 }}>
            <strong>当前分类：{activeCategoryMeta.label}</strong>
            <div>{activeCategoryMeta.description}，当前共 {filteredMaterials.length} 条。</div>
          </div>

          {filteredMaterials.length ? (
            <div className="table-scroll-shell personal-material-table-shell">
              <table className="soft-table personal-material-table">
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>素材标签</th>
                    <th>素材来源</th>
                    <th>入库时间</th>
                    <th>存储位置</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((item) => (
                    <tr key={item.id}>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.title}>
                          {item.title || "-"}
                        </span>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <div className="material-tag-list">
                          {item.materialTags.map((tag) => (
                            <span key={`${item.id}-${tag}`} className="material-tag-chip" title={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.sourceLabel}>
                          {item.sourceLabel}
                        </span>
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.localFilePath || "-"}>
                          {item.localFilePath || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-canvas-box" style={{ marginTop: 16 }}>
              <strong>{search.trim() ? "没有命中当前搜索条件的素材" : `当前还没有${activeCategoryMeta.label}素材`}</strong>
              <p>
                {search.trim()
                  ? "可以先清空搜索，或切换到其它分类继续查看。"
                  : "OpenClaw 上传到网站的素材会自动同步到这里。"}
              </p>
              {search.trim() ? (
                <div className="personal-actions">
                  <button type="button" className="secondary-button" onClick={() => setSearch("")}>
                    清空搜索
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
