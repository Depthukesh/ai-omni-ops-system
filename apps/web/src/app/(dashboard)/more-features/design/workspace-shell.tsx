"use client";

import { useEffect, useMemo, useState } from "react";

import { MoreFeaturesSectionSidebar } from "../section-sidebar";
import { getStoredCurrentBrandId } from "../../../../services/auth-session";
import {
  deleteDesignHistoryWork,
  type DesignGeneratedWorkRecord,
  type DesignModuleKey,
  getDesignWorkspaceHistory,
} from "../../../../services/design";

type DesignWork = DesignGeneratedWorkRecord;

type DesignModuleMeta = {
  key: DesignModuleKey;
  label: string;
  description: string;
};

const DESIGN_MODULES: DesignModuleKey[] = ["image"];

const DESIGN_MODULE_META_MAP: Record<DesignModuleKey, DesignModuleMeta> = {
  image: {
    key: "image",
    label: "图片设计",
    description: "当前仅承接 OpenClaw 触发的自由生图结果回看，不再提供站内手动创建设计入口。",
  },
  html: {
    key: "html",
    label: "HTML 设计",
    description: "当前用户侧不再开放。",
  },
  deck: {
    key: "deck",
    label: "PPT 设计",
    description: "当前用户侧不再开放。",
  },
  video: {
    key: "video",
    label: "视频设计",
    description: "当前用户侧不再开放。",
  },
};

const DESIGN_WORKS_PER_PAGE = 21;

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(/\//g, "/");
}

function createEmptyWorksByModule(): Record<DesignModuleKey, DesignWork[]> {
  return {
    image: [],
    html: [],
    deck: [],
    video: [],
  };
}

function createInitialSelectedByModule(): Record<DesignModuleKey, string | null> {
  return {
    image: null,
    html: null,
    deck: null,
    video: null,
  };
}

function groupWorksByModule(works: DesignWork[]) {
  const grouped = createEmptyWorksByModule();
  for (const work of works) {
    grouped[work.module] = [...grouped[work.module], work];
  }
  return grouped;
}

function getWorkId(work: DesignWork) {
  return work.id;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function getWorkStatusTone(status: string) {
  if (status.includes("失败")) {
    return "status-danger";
  }
  if (status.includes("完成") || status.includes("成功")) {
    return "status-ready";
  }
  return "status-pending";
}

function resolvePreviewAspectRatio(spec?: string) {
  const match = String(spec || "").match(/(\d{3,5})\s*[xX*]\s*(\d{3,5})/);
  if (!match) {
    return undefined;
  }
  return `${match[1]} / ${match[2]}`;
}

function renderWorkPreview(module: DesignModuleMeta, work: DesignWork, showImagePreview: boolean) {
  if (module.key === "image" && work.assetUrl && showImagePreview) {
    return (
      <img
        src={work.assetUrl}
        alt={work.title}
        className="design-v3-card-media design-v3-card-media--image"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className="design-v3-card-placeholder">
      <span>{work.skillLabel || module.label}</span>
      <strong>{work.tags[0] ?? work.title}</strong>
      <p>
        {module.key === "image" && work.assetUrl
          ? (showImagePreview
            ? "当前缩略图已按需加载。"
            : "列表默认不自动加载成品图，点击下方“加载图”时再单独请求，避免首屏占用过多内存。")
          : work.summary}
      </p>
    </div>
  );
}

function getDesignLoadedPreviewStorageKey(moduleKey: DesignModuleKey) {
  return `design-workspace-loaded-previews:${moduleKey}`;
}

function readLoadedImagePreviewIds(moduleKey: DesignModuleKey) {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(getDesignLoadedPreviewStorageKey(moduleKey));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function writeLoadedImagePreviewIds(moduleKey: DesignModuleKey, workIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(getDesignLoadedPreviewStorageKey(moduleKey), JSON.stringify(workIds));
  } catch {
    // Ignore sessionStorage write failures and fall back to in-memory state only.
  }
}

function isHtmlPreviewWork(work: DesignWork | null) {
  if (!work) {
    return false;
  }

  if (work.module === "html" || Boolean(work.htmlContent)) {
    return true;
  }

  return /\.html(?:[?#].*)?$/i.test(work.assetUrl ?? "");
}

function DesignPreviewDialog({
  work,
  onClose,
}: {
  work: DesignWork | null;
  onClose: () => void;
}) {
  if (!work || (!work.assetUrl && !work.htmlContent)) {
    return null;
  }

  const isHtml = isHtmlPreviewWork(work);
  const canOpenAsset = Boolean(work.assetUrl);

  return (
    <div className="design-v3-dialog-backdrop design-v3-preview-backdrop" onClick={onClose}>
      <div
        className="design-v3-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={work.title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-preview-header">
          <strong>{work.title}</strong>
          <div className="design-v3-preview-header-actions">
            {canOpenAsset ? (
              <a href={work.assetUrl} target="_blank" rel="noreferrer" className="secondary-button">
                站内打开
              </a>
            ) : null}
            <button type="button" className="secondary-button" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
        <div className="design-v3-preview-body">
          {isHtml ? (
            <iframe
              title={`${work.title} 预览`}
              srcDoc={work.htmlContent}
              src={work.htmlContent ? undefined : work.assetUrl}
              className="design-v3-preview-iframe"
            />
          ) : work.module === "image" && work.assetUrl ? (
            <img src={work.assetUrl} alt={work.title} className="design-v3-preview-image" />
          ) : (
            <div className="design-v3-preview-empty">
              <p>当前资源暂不支持站内弹窗预览，请直接打开原始资源查看。</p>
              {canOpenAsset ? (
                <a href={work.assetUrl} target="_blank" rel="noreferrer" className="primary-button">
                  打开资源
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleWorks({
  module,
  works,
  selectedWorkId,
  onDeleteWork,
  deletingWorkId,
  onViewWork,
}: {
  module: DesignModuleMeta;
  works: DesignWork[];
  selectedWorkId: string | null;
  onDeleteWork: (workId: string) => void | Promise<void>;
  deletingWorkId: string | null;
  onViewWork: (work: DesignWork) => void;
}) {
  const [page, setPage] = useState(1);
  const [loadedImagePreviewIds, setLoadedImagePreviewIds] = useState<string[]>(() => readLoadedImagePreviewIds(module.key));
  const totalPages = Math.max(1, Math.ceil(works.length / DESIGN_WORKS_PER_PAGE));
  const visibleWorks = useMemo(() => {
    const startIndex = (page - 1) * DESIGN_WORKS_PER_PAGE;
    return works.slice(startIndex, startIndex + DESIGN_WORKS_PER_PAGE);
  }, [page, works]);

  useEffect(() => {
    setPage(1);
  }, [module.key]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setLoadedImagePreviewIds((current) => {
      const availableWorkIds = new Set(works.map((item) => getWorkId(item)));
      const persistedIds = readLoadedImagePreviewIds(module.key);
      const nextIds = Array.from(new Set([...current, ...persistedIds])).filter((item) => availableWorkIds.has(item));
      writeLoadedImagePreviewIds(module.key, nextIds);
      return nextIds;
    });
  }, [module.key, works]);

  useEffect(() => {
    writeLoadedImagePreviewIds(module.key, loadedImagePreviewIds);
  }, [loadedImagePreviewIds, module.key]);

  const toggleImagePreview = (workId: string) => {
    setLoadedImagePreviewIds((current) =>
      current.includes(workId) ? current.filter((item) => item !== workId) : [...current, workId]);
  };

  return (
    <section className="design-v3-works">
      <div className="collection-result-head">
        <div>
          <h3>作品结果</h3>
          <p>这里只承接 OpenClaw 已触发的生图结果，用户不在这里手动创建任务。</p>
        </div>
        <div className="design-v3-work-head-actions">
          <span className="archive-pill status-ready">共 {works.length} 个</span>
          {works.length > 0 ? (
            <span className="archive-pill status-pending">第 {page} / {totalPages} 页</span>
          ) : null}
        </div>
      </div>

      <div className="design-v3-work-grid">
        {visibleWorks.map((work) => {
          const workId = getWorkId(work);
          const showImagePreview = module.key === "image" && loadedImagePreviewIds.includes(workId);

          return (
            <article
              key={`${module.key}-${workId}`}
              className={`design-v3-work-card ${selectedWorkId === workId ? "is-selected" : ""}`}
            >
              <button
                type="button"
                className="design-v3-work-preview design-v3-work-preview-button"
                style={module.key === "image" ? { aspectRatio: resolvePreviewAspectRatio(work.spec) || "4 / 5" } : undefined}
                onClick={() => onViewWork(work)}
              >
                {renderWorkPreview(module, work, showImagePreview)}
                <div className="design-v3-work-floating-tags">
                  <span className="archive-pill status-pending">{module.label}</span>
                  <span className={`archive-pill ${getWorkStatusTone(work.status)}`}>{work.status}</span>
                </div>
              </button>
              <div className="design-v3-work-body">
                <div className="design-v3-work-meta">
                  <span>{work.updatedAt}</span>
                  {work.skillLabel ? <span>{work.skillLabel}</span> : null}
                </div>
                <strong className="design-v3-work-title">{work.title}</strong>
                <p>{work.summary}</p>
                <div className="design-v3-work-tags">
                  {work.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="archive-pill status-pending">
                      {tag}
                    </span>
                  ))}
                </div>
                {work.errorDetail ? <div className="design-v3-work-error">{work.errorDetail}</div> : null}
                <div className="design-v3-work-actions">
                  {module.key === "image" && work.assetUrl ? (
                    <button
                      type="button"
                      className="tiny-action-button"
                      onClick={() => toggleImagePreview(workId)}
                    >
                      {showImagePreview ? "隐藏图" : "加载图"}
                    </button>
                  ) : null}
                  <button type="button" className="tiny-action-button is-primary" onClick={() => onViewWork(work)}>
                    查看
                  </button>
                  <button
                    type="button"
                    className="ghost-danger-button"
                    onClick={() => void onDeleteWork(workId)}
                    disabled={deletingWorkId === workId}
                  >
                    {deletingWorkId === workId ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="design-v3-pagination">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            上一页
          </button>
          <span className="design-v3-pagination-text">
            当前第 {page} 页，每页 21 个，按一行 3 个排版
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </button>
        </div>
      ) : null}

      {works.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 16 }}>
          当前还没有 OpenClaw 生图记录；后续由 OpenClaw 调用后会在这里统一回看结果。
        </div>
      ) : null}
    </section>
  );
}

interface DesignWorkspaceShellProps {
  section: { label: string; description: string };
}

export function DesignWorkspaceShell({ section }: DesignWorkspaceShellProps) {
  const brandId = getStoredCurrentBrandId();
  const [activeModule, setActiveModule] = useState<DesignModuleKey>("image");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [worksByModule, setWorksByModule] = useState<Record<DesignModuleKey, DesignWork[]>>(createEmptyWorksByModule);
  const [selectedWorkByModule, setSelectedWorkByModule] = useState<Record<DesignModuleKey, string | null>>(createInitialSelectedByModule);
  const [deletingWorkId, setDeletingWorkId] = useState<string | null>(null);
  const [previewWork, setPreviewWork] = useState<DesignWork | null>(null);
  const [lastRefreshText, setLastRefreshText] = useState("尚未刷新");

  const applyHistorySnapshot = (historyWorks: DesignWork[]) => {
    const groupedWorks = groupWorksByModule(historyWorks);
    setWorksByModule(groupedWorks);
    setSelectedWorkByModule((current) => ({
      ...current,
      image: groupedWorks.image.some((item) => getWorkId(item) === current.image)
        ? current.image
        : (groupedWorks.image[0] ? getWorkId(groupedWorks.image[0]) : null),
    }));
  };

  const activeMeta = DESIGN_MODULE_META_MAP[activeModule];
  const activeWorks = worksByModule[activeModule] ?? [];

  useEffect(() => {
    let cancelled = false;

    async function loadInitialHistory() {
      setLoadingHistory(true);
      setLoadError("");
      setActionError("");

      try {
        const history = await getDesignWorkspaceHistory(brandId);
        if (cancelled) {
          return;
        }
        applyHistorySnapshot(history.items);
        setLastRefreshText(formatTimestamp(new Date()));
      } catch (error) {
        if (!cancelled) {
          setLoadError(normalizeErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    }

    void loadInitialHistory();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const handleModuleChange = (moduleKey: DesignModuleKey) => {
    setActiveModule(moduleKey);
    setPreviewWork(null);
    setActionError("");
  };

  const handleRefresh = async () => {
    setLoadingHistory(true);
    setLoadError("");
    setActionError("");

    try {
      const history = await getDesignWorkspaceHistory(brandId);
      applyHistorySnapshot(history.items);
      setLastRefreshText(formatTimestamp(new Date()));
    } catch (error) {
      setLoadError(normalizeErrorMessage(error));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewWork = (work: DesignWork) => {
    setSelectedWorkByModule((current) => ({ ...current, [activeModule]: getWorkId(work) }));
    if (work.assetUrl || work.htmlContent) {
      setPreviewWork(work);
    }
  };

  const handleDeleteWork = async (workId: string) => {
    const previousWorks = activeWorks;
    const nextWorks = previousWorks.filter((work) => getWorkId(work) !== workId);

    setActionError("");
    setDeletingWorkId(workId);
    if (previewWork && getWorkId(previewWork) === workId) {
      setPreviewWork(null);
    }
    setWorksByModule((current) => ({
      ...current,
      [activeModule]: nextWorks,
    }));
    setSelectedWorkByModule((current) => ({
      ...current,
      [activeModule]: nextWorks[0] ? getWorkId(nextWorks[0]) : null,
    }));

    try {
      await deleteDesignHistoryWork(workId, brandId);
      const history = await getDesignWorkspaceHistory(brandId);
      applyHistorySnapshot(history.items);
      setLastRefreshText(formatTimestamp(new Date()));
    } catch (error) {
      setActionError(normalizeErrorMessage(error));
      setWorksByModule((current) => ({
        ...current,
        [activeModule]: previousWorks,
      }));
      setSelectedWorkByModule((current) => ({
        ...current,
        [activeModule]: previousWorks[0] ? getWorkId(previousWorks[0]) : null,
      }));
    } finally {
      setDeletingWorkId(null);
    }
  };

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <MoreFeaturesSectionSidebar />

        <div className="strategy-content-panel">
          <article className="workspace-panel strategy-page-header">
            <div>
              <strong>{section.label}</strong>
              <p>{section.description}</p>
            </div>
            <div className="strategy-page-header-actions">
              <div className="workspace-status">
                <span className="archive-pill status-ready">真实数据驱动</span>
                <span className="status-text">
                  当前页面只承接 OpenClaw 触发的图片生成结果回看；系统不再在这里向用户暴露提示词中心、技能模板或手动创建设计入口。
                </span>
              </div>
              <div className="strategy-inline-actions">
                <button type="button" className="secondary-button" onClick={handleRefresh} disabled={loadingHistory}>
                  {loadingHistory ? "刷新中..." : "刷新数据"}
                </button>
              </div>
            </div>
          </article>

          <article className="workspace-panel strategy-page-card">
            <div className="design-v3-tab-row" aria-label="设计子板块切换">
              {DESIGN_MODULES.map((moduleKey) => {
                const tabMeta = DESIGN_MODULE_META_MAP[moduleKey];
                return (
                  <button
                    key={moduleKey}
                    type="button"
                    className={`design-v3-tab ${moduleKey === activeModule ? "is-active" : ""}`}
                    onClick={() => handleModuleChange(moduleKey)}
                  >
                    {tabMeta.label}
                  </button>
                );
              })}
            </div>

            <div className="design-v3-module-head">
              <div>
                <strong>{activeMeta.label}</strong>
                <p>{activeMeta.description}</p>
              </div>
              <div className="design-v3-module-actions">
                <span className="archive-pill status-pending">最近刷新：{lastRefreshText}</span>
                <button type="button" className="secondary-button" onClick={handleRefresh} disabled={loadingHistory}>
                  {loadingHistory ? "刷新中..." : "刷新列表"}
                </button>
              </div>
            </div>

            {loadError ? (
              <div className="empty-state" style={{ marginBottom: 16 }}>
                {loadError}
              </div>
            ) : null}

            {actionError ? (
              <div className="empty-state" style={{ marginBottom: 16 }}>
                {actionError}
              </div>
            ) : null}

            <ModuleWorks
              module={activeMeta}
              works={activeWorks}
              selectedWorkId={selectedWorkByModule[activeModule]}
              onDeleteWork={handleDeleteWork}
              deletingWorkId={deletingWorkId}
              onViewWork={handleViewWork}
            />
          </article>
        </div>
      </section>
      <DesignPreviewDialog work={previewWork} onClose={() => setPreviewWork(null)} />
    </main>
  );
}
