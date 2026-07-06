"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { OptionalDateFormatter, OptionalNumberFormatter } from "./shared-types";
import type {
  WechatMpArticleRecord,
  WechatMpBenchmarkArticleRecord,
  WechatMpBenchmarkWorkspace,
  WechatMpBrandAccountRecord,
  WechatMpCollectionWorkspace,
  WechatSearchBusinessType,
  WechatSearchItemRecord,
  WechatSearchPublishTime,
  WechatSearchSortType,
  WechatSearchWorkspace,
} from "../../../services/collectors";
import {
  bindWechatMpBrandAccount,
  deleteWechatMpBrandAccount,
  deleteWechatMpArticle,
  deleteWechatMpBenchmarkArticle,
  deleteWechatSearchItem,
  fetchWechatMpArticles,
  getWechatMpBenchmarkWorkspace,
  getWechatSearchWorkspace,
  readWechatMpArticleContent,
  readWechatSearchItemContent,
  searchWechat,
  submitWechatMpBenchmarkArticle,
  updateWechatMpBenchmarkArticleStats,
  updateWechatSearchItemStats,
  wechatMpBenchmarkSeed,
  wechatMpCollectionSeed,
  wechatSearchSeed,
} from "../../../services/collectors";

type WechatMpSubCardKey = "brandAccountData" | "benchmarkWorks" | "wechatSearch";

const WECHAT_MP_SUB_CARDS: Array<{ key: WechatMpSubCardKey; label: string }> = [
  { key: "brandAccountData", label: "品牌公众号数据" },
  { key: "benchmarkWorks", label: "对标作品信息及数据" },
  { key: "wechatSearch", label: "微信搜一搜" },
];

// 模块级复制提醒 toast
let copyToastTimer: number | undefined;
let copyToastListeners: Array<(visible: boolean) => void> = [];
function notifyCopyToast(visible: boolean) {
  if (visible && copyToastTimer) {
    window.clearTimeout(copyToastTimer);
  }
  for (const listener of copyToastListeners) {
    try {
      listener(visible);
    } catch {
      // 忽略
    }
  }
  if (visible) {
    copyToastTimer = window.setTimeout(() => notifyCopyToast(false), 1600);
  }
}
function useCopyToastVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const listener = (next: boolean) => setVisible(next);
    copyToastListeners.push(listener);
    return () => {
      copyToastListeners = copyToastListeners.filter((fn) => fn !== listener);
    };
  }, []);
  return visible;
}

export type WechatMpCollectionWorkspaceProps = {
  pageTitle: string;
  pageDescription: string;
  isHydrating: boolean;
  canEdit: boolean;
  workspace: WechatMpCollectionWorkspace;
  setWorkspace: Dispatch<SetStateAction<WechatMpCollectionWorkspace>>;
  benchmarkWorkspace: WechatMpBenchmarkWorkspace;
  setBenchmarkWorkspace: Dispatch<SetStateAction<WechatMpBenchmarkWorkspace>>;
  searchWorkspace: WechatSearchWorkspace;
  setSearchWorkspace: Dispatch<SetStateAction<WechatSearchWorkspace>>;
  activeBrandId?: string;
  addingMaterialAssetId?: string;
  onAddBenchmarkArticleToMaterial: (articleId: string) => void | Promise<void>;
  onAddSearchItemToMaterial: (itemId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
};

export function WechatMpCollectionWorkspace(props: WechatMpCollectionWorkspaceProps) {
  const [activeCard, setActiveCard] = useState<WechatMpSubCardKey>("brandAccountData");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftGhUsername, setDraftGhUsername] = useState("");
  const [isBinding, setIsBinding] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | undefined>(undefined);
  const [fetchingAccountIds, setFetchingAccountIds] = useState<string[]>([]);
  const [articleOffsets, setArticleOffsets] = useState<Record<string, string | undefined>>({});
  const [hasMoreByAccount, setHasMoreByAccount] = useState<Record<string, boolean>>({});
  const [readingArticleIds, setReadingArticleIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toastVisible = useCopyToastVisible();

  // 对标作品状态
  const [benchmarkInputUrl, setBenchmarkInputUrl] = useState("");
  const [isSubmittingBenchmark, setIsSubmittingBenchmark] = useState(false);
  const [selectedBenchmarkIds, setSelectedBenchmarkIds] = useState<string[]>([]);
  const [updatingBenchmarkIds, setUpdatingBenchmarkIds] = useState<string[]>([]);
  const [isUpdatingBenchmark, setIsUpdatingBenchmark] = useState(false);
  const [isAddingBenchmark, setIsAddingBenchmark] = useState(false);
  const [isDeletingBenchmark, setIsDeletingBenchmark] = useState(false);

  // 微信搜一搜状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchBusinessType, setSearchBusinessType] = useState<WechatSearchBusinessType>("all");
  const [searchSort, setSearchSort] = useState<WechatSearchSortType>("default");
  const [searchPublishTime, setSearchPublishTime] = useState<WechatSearchPublishTime>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [selectedSearchIds, setSelectedSearchIds] = useState<string[]>([]);
  const [updatingSearchIds, setUpdatingSearchIds] = useState<string[]>([]);
  const [isUpdatingSearch, setIsUpdatingSearch] = useState(false);
  const [isAddingSearch, setIsAddingSearch] = useState(false);
  const [isDeletingSearch, setIsDeletingSearch] = useState(false);

  const showNotice = (type: "success" | "error", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3000);
  };

  const handleBind = async () => {
    const trimmed = draftGhUsername.trim();
    if (!trimmed) return;
    if (!/^gh_[A-Za-z0-9_]+$/.test(trimmed)) {
      showNotice("error", "gh_username 格式不正确，应以 gh_ 开头。");
      return;
    }
    setIsBinding(true);
    try {
      const result = await bindWechatMpBrandAccount(trimmed, props.activeBrandId);
      props.setWorkspace(result.workspace);
      setDraftGhUsername("");
      setIsModalOpen(false);
      showNotice("success", "账号绑定成功。");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "绑定失败，请稍后重试。");
    } finally {
      setIsBinding(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    setDeletingAccountId(accountId);
    try {
      const result = await deleteWechatMpBrandAccount(accountId, props.activeBrandId);
      props.setWorkspace(result.workspace);
      showNotice("success", "账号已删除。");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "删除失败。");
    } finally {
      setDeletingAccountId(undefined);
    }
  };

  const handleFetchArticles = async (accountId: string, ghUsername: string) => {
    setFetchingAccountIds((current) => [...current, accountId]);
    try {
      const offset = articleOffsets[accountId];
      const result = await fetchWechatMpArticles(ghUsername, offset, props.activeBrandId);
      props.setWorkspace(result.workspace);
      setArticleOffsets((current) => ({ ...current, [accountId]: result.nextOffset }));
      setHasMoreByAccount((current) => ({ ...current, [accountId]: !result.isEnd }));
      showNotice("success", `已获取 ${result.count} 篇文章。`);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "获取文章失败。");
    } finally {
      setFetchingAccountIds((current) => current.filter((id) => id !== accountId));
    }
  };

  const handleReadArticle = async (article: WechatMpArticleRecord) => {
    if (!article.url || readingArticleIds.includes(article.id)) return;
    setReadingArticleIds((current) => [...current, article.id]);
    try {
      const result = await readWechatMpArticleContent(article.url, props.activeBrandId);
      props.setWorkspace(result.workspace);
      showNotice("success", "文章内容已读取。");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "读取文章失败。");
    } finally {
      setReadingArticleIds((current) => current.filter((id) => id !== article.id));
    }
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      notifyCopyToast(true);
    } catch {
      window.alert("复制失败，请手动选中复制。");
    }
  };

  // 对标作品 handler
  const handleSubmitBenchmark = async () => {
    const trimmed = benchmarkInputUrl.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/mp\.weixin\.qq\.com\/s([/?].+)?$/.test(trimmed)) {
      showNotice("error", "文章链接格式不正确，需为 mp.weixin.qq.com/s/ 开头的链接。");
      return;
    }
    setIsSubmittingBenchmark(true);
    try {
      const result = await submitWechatMpBenchmarkArticle(trimmed, props.activeBrandId);
      props.setBenchmarkWorkspace(result.workspace);
      setBenchmarkInputUrl("");
      showNotice("success", "对标文章已读取并提交。");
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "提交失败。");
    } finally {
      setIsSubmittingBenchmark(false);
    }
  };

  const allBenchmarkIds = props.benchmarkWorkspace.benchmarkArticles.map((item) => item.id);
  const allBenchmarkSelected = allBenchmarkIds.length > 0 && allBenchmarkIds.every((id) => selectedBenchmarkIds.includes(id));

  const handleToggleBenchmark = (id: string, checked: boolean) => {
    setSelectedBenchmarkIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  };

  const handleSelectAllBenchmark = (checked: boolean) => {
    setSelectedBenchmarkIds(checked ? allBenchmarkIds : []);
  };

  const handleUpdateBenchmarkStats = async () => {
    const selected = props.benchmarkWorkspace.benchmarkArticles.filter((item) => selectedBenchmarkIds.includes(item.id));
    if (!selected.length) {
      showNotice("error", "请先勾选需要更新数据的文章。");
      return;
    }
    setIsUpdatingBenchmark(true);
    setUpdatingBenchmarkIds(selected.map((item) => item.id));
    let successCount = 0;
    let failCount = 0;
    for (const article of selected) {
      try {
        const result = await updateWechatMpBenchmarkArticleStats(article.url, props.activeBrandId);
        props.setBenchmarkWorkspace(result.workspace);
        successCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setUpdatingBenchmarkIds([]);
    setIsUpdatingBenchmark(false);
    if (failCount === 0) {
      showNotice("success", `已更新 ${successCount} 篇文章数据。`);
    } else {
      showNotice("error", `更新完成：成功 ${successCount} 篇，失败 ${failCount} 篇。`);
    }
  };

  const handleDeleteBenchmarkArticles = async () => {
    const selected = props.benchmarkWorkspace.benchmarkArticles.filter((item) => selectedBenchmarkIds.includes(item.id));
    if (!selected.length) {
      showNotice("error", "请先勾选需要删除的文章。");
      return;
    }
    setIsDeletingBenchmark(true);
    for (const article of selected) {
      try {
        const result = await deleteWechatMpBenchmarkArticle(article.id, props.activeBrandId);
        props.setBenchmarkWorkspace(result.workspace);
      } catch {
        // 静默继续
      }
    }
    setSelectedBenchmarkIds([]);
    setIsDeletingBenchmark(false);
    showNotice("success", "已删除勾选的文章。");
  };

  const handleAddBenchmarkArticlesToMaterial = async () => {
    const selected = props.benchmarkWorkspace.benchmarkArticles.filter((item) => selectedBenchmarkIds.includes(item.id));
    if (!selected.length) {
      showNotice("error", "请先勾选需要加入素材库的文章。");
      return;
    }
    const pendingItems = selected.filter((item) => !item.isInMaterialLibrary);
    if (!pendingItems.length) {
      showNotice("success", "勾选文章已在素材库中。");
      return;
    }
    setIsAddingBenchmark(true);
    try {
      for (const article of pendingItems) {
        await props.onAddBenchmarkArticleToMaterial(article.id);
      }
      showNotice("success", `已加入 ${pendingItems.length} 篇文章到素材库。`);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "加入素材库失败。");
    } finally {
      setIsAddingBenchmark(false);
    }
  };

  // 微信搜一搜 handler
  const handleSearchWechat = async (offset: number) => {
    const trimmed = searchKeyword.trim();
    if (!trimmed) {
      showNotice("error", "请输入搜索关键词。");
      return;
    }
    setIsSearching(true);
    try {
      const result = await searchWechat(trimmed, searchBusinessType, searchSort, searchPublishTime, offset, props.activeBrandId);
      props.setSearchWorkspace({ items: result.items });
      setSearchOffset(result.offset);
      setSearchHasMore(result.continueFlag);
      showNotice("success", `已获取 ${result.count} 条搜索结果。`);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "搜索失败。");
    } finally {
      setIsSearching(false);
    }
  };

  // 搜一搜勾选和更新数据
  const allSearchIds = props.searchWorkspace.items.map((item) => item.id);
  const allSearchSelected = allSearchIds.length > 0 && allSearchIds.every((id) => selectedSearchIds.includes(id));

  const handleToggleSearchItem = (id: string, checked: boolean) => {
    setSelectedSearchIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  };

  const handleSelectAllSearchItems = (checked: boolean) => {
    setSelectedSearchIds(checked ? allSearchIds : []);
  };

  const handleUpdateSearchItems = async () => {
    const selected = props.searchWorkspace.items.filter((item) => selectedSearchIds.includes(item.id));
    if (!selected.length) {
      showNotice("error", "请先勾选需要更新数据的文章。");
      return;
    }
    setIsUpdatingSearch(true);
    setUpdatingSearchIds(selected.map((item) => item.id));
    let successCount = 0;
    let failCount = 0;
    for (const item of selected) {
      if (!item.url) continue;
      try {
        // 1. GLM reader 读取正文
        const readResult = await readWechatSearchItemContent(item.url, props.activeBrandId);
        props.setSearchWorkspace(readResult.workspace);
        // 2. TikHub fetch_article_stats 更新指标
        const statsResult = await updateWechatSearchItemStats(item.url, props.activeBrandId);
        props.setSearchWorkspace(statsResult.workspace);
        successCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setUpdatingSearchIds([]);
    setIsUpdatingSearch(false);
    if (failCount === 0) {
      showNotice("success", `已更新 ${successCount} 篇文章。`);
    } else {
      showNotice("error", `更新完成：成功 ${successCount} 篇，失败 ${failCount} 篇。`);
    }
  };

  const handleDeleteSearchItems = async () => {
    const selected = props.searchWorkspace.items.filter((item) => selectedSearchIds.includes(item.id));
    if (!selected.length) {
      showNotice("error", "请先勾选需要删除的结果。");
      return;
    }
    setIsDeletingSearch(true);
    for (const item of selected) {
      try {
        const result = await deleteWechatSearchItem(item.id, props.activeBrandId);
        props.setSearchWorkspace(result.workspace);
      } catch {
        // 静默继续
      }
    }
    setSelectedSearchIds([]);
    setIsDeletingSearch(false);
    showNotice("success", "已删除勾选的结果。");
  };

  const handleAddSearchItemsToMaterial = async () => {
    const selected = props.searchWorkspace.items.filter((item) => selectedSearchIds.includes(item.id));
    if (!selected.length) {
      showNotice("error", "请先勾选需要加入素材库的结果。");
      return;
    }
    const pendingItems = selected.filter((item) => !item.isInMaterialLibrary);
    if (!pendingItems.length) {
      showNotice("success", "勾选结果已在素材库中。");
      return;
    }
    setIsAddingSearch(true);
    try {
      for (const item of pendingItems) {
        await props.onAddSearchItemToMaterial(item.id);
      }
      showNotice("success", `已加入 ${pendingItems.length} 条结果到素材库。`);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "加入素材库失败。");
    } finally {
      setIsAddingSearch(false);
    }
  };

  return (
    <div className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.pageTitle}</strong>
          <p>{props.pageDescription}</p>
        </div>
      </div>

      <div className="strategy-chip-row">
        {WECHAT_MP_SUB_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`filter-chip ${activeCard === card.key ? "is-active" : ""}`}
            onClick={() => setActiveCard(card.key)}
          >
            {card.label}
          </button>
        ))}
      </div>

      {notice ? (
        <div
          className="archive-pill"
          style={{
            background: notice.type === "error" ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
            color: notice.type === "error" ? "#dc2626" : "#059669",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {notice.text}
        </div>
      ) : null}

      {activeCard === "brandAccountData" ? (
        <BrandAccountDataPanel
          brandAccounts={props.workspace.brandAccounts}
          articles={props.workspace.articles}
          isHydrating={props.isHydrating}
          isBinding={isBinding}
          deletingAccountId={deletingAccountId}
          fetchingAccountIds={fetchingAccountIds}
          hasMoreByAccount={hasMoreByAccount}
          readingArticleIds={readingArticleIds}
          canEdit={props.canEdit}
          onOpenModal={() => setIsModalOpen(true)}
          onFetchArticles={handleFetchArticles}
          onDelete={handleDelete}
          onReadArticle={handleReadArticle}
          onCopyContent={handleCopyContent}
          formatDateTime={props.formatDateTime}
          formatCount={props.formatCount}
        />
      ) : null}

      {activeCard === "benchmarkWorks" ? (
        <BenchmarkWorkPanel
          articles={props.benchmarkWorkspace.benchmarkArticles}
          canEdit={props.canEdit}
          inputUrl={benchmarkInputUrl}
          onInputUrlChange={setBenchmarkInputUrl}
          onSubmit={handleSubmitBenchmark}
          isSubmitting={isSubmittingBenchmark}
          selectedIds={selectedBenchmarkIds}
          allSelected={allBenchmarkSelected}
          onToggle={handleToggleBenchmark}
          onSelectAll={handleSelectAllBenchmark}
          onUpdateStats={handleUpdateBenchmarkStats}
          isUpdating={isUpdatingBenchmark}
          updatingIds={updatingBenchmarkIds}
          onAddToMaterial={handleAddBenchmarkArticlesToMaterial}
          isAdding={isAddingBenchmark}
          addingMaterialAssetId={props.addingMaterialAssetId}
          onDelete={handleDeleteBenchmarkArticles}
          isDeleting={isDeletingBenchmark}
          onCopyContent={handleCopyContent}
          formatDateTime={props.formatDateTime}
          formatCount={props.formatCount}
        />
      ) : null}

      {activeCard === "wechatSearch" ? (
        <WechatSearchPanel
          items={props.searchWorkspace.items}
          canEdit={props.canEdit}
          keyword={searchKeyword}
          onKeywordChange={setSearchKeyword}
          businessType={searchBusinessType}
          onBusinessTypeChange={setSearchBusinessType}
          sort={searchSort}
          onSortChange={setSearchSort}
          publishTime={searchPublishTime}
          onPublishTimeChange={setSearchPublishTime}
          onSearch={() => void handleSearchWechat(0)}
          onNextPage={() => void handleSearchWechat(searchOffset)}
          isSearching={isSearching}
          hasMore={searchHasMore}
          selectedIds={selectedSearchIds}
          allSelected={allSearchSelected}
          onToggle={handleToggleSearchItem}
          onSelectAll={handleSelectAllSearchItems}
          onUpdateData={handleUpdateSearchItems}
          isUpdating={isUpdatingSearch}
          updatingIds={updatingSearchIds}
          onAddToMaterial={handleAddSearchItemsToMaterial}
          isAdding={isAddingSearch}
          addingMaterialAssetId={props.addingMaterialAssetId}
          onDelete={handleDeleteSearchItems}
          isDeleting={isDeletingSearch}
          onCopyContent={handleCopyContent}
          formatDateTime={props.formatDateTime}
          formatCount={props.formatCount}
        />
      ) : null}

      {isModalOpen ? (
        <div className="xhs-account-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsModalOpen(false)}>
          <div className="xhs-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="xhs-account-modal__head">
              <div>
                <strong>添加公众号账号</strong>
                <p>填入公众号 gh_username（以 gh_ 开头的公众号唯一标识），保存后进入账号绑定列表。</p>
              </div>
              <button type="button" className="xhs-account-modal__close" onClick={() => setIsModalOpen(false)}>关闭</button>
            </div>
            <label className="field">
              <span>gh_username</span>
              <input
                value={draftGhUsername}
                onChange={(event) => setDraftGhUsername(event.target.value)}
                placeholder="请输入公众号 gh_username，例如 gh_363b924965e9"
              />
            </label>
            <div className="xhs-account-modal__actions">
              <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>取消</button>
              <button type="button" className="primary-button" onClick={() => void handleBind()} disabled={!draftGhUsername.trim() || isBinding}>
                {isBinding ? "提交中..." : "提交"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`copy-toast ${toastVisible ? "is-visible" : ""}`} role="status" aria-live="polite">
        <span className="copy-toast__icon" aria-hidden="true">✓</span>
        <span className="copy-toast__text">已复制</span>
      </div>
    </div>
  );
}

// ─── 品牌公众号数据面板 ───

type BrandAccountDataPanelProps = {
  brandAccounts: WechatMpBrandAccountRecord[];
  articles: WechatMpArticleRecord[];
  isHydrating: boolean;
  isBinding: boolean;
  deletingAccountId?: string;
  fetchingAccountIds: string[];
  hasMoreByAccount: Record<string, boolean>;
  readingArticleIds: string[];
  canEdit: boolean;
  onOpenModal: () => void;
  onFetchArticles: (accountId: string, ghUsername: string) => void;
  onDelete: (accountId: string) => void;
  onReadArticle: (article: WechatMpArticleRecord) => void;
  onCopyContent: (content: string) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
};

function BrandAccountDataPanel(props: BrandAccountDataPanelProps) {
  const accountNameById = useMemo(
    () =>
      new Map(
        props.brandAccounts.map((account) => [
          account.id,
          account.accountName?.trim() || account.ghUsername,
        ]),
      ),
    [props.brandAccounts],
  );

  return (
    <>
      <article className="light-data-panel xhs-account-builder" style={{ marginBottom: 16 }}>
        <div className="collection-result-head">
          <div>
            <h3>品牌公众号数据</h3>
            <p>绑定公众号 gh_username 后，点击"提交"获取历史文章列表，支持翻页。文章内容通过 GLM 网页阅读器读取，点击文章内容可自动复制。</p>
          </div>
          {props.canEdit ? (
            <button type="button" className="secondary-button" onClick={props.onOpenModal} disabled={props.isBinding}>
              添加账号
            </button>
          ) : null}
        </div>
        {props.brandAccounts.length ? (
          <div className="xhs-account-entry-list">
            {props.brandAccounts.map((account) => {
              const isFetching = props.fetchingAccountIds.includes(account.id);
              const hasMore = props.hasMoreByAccount[account.id];
              const articleCount = props.articles.filter((article) => article.sourceAccountId === account.id).length;
              return (
                <div key={account.id} className="xhs-account-entry-row">
                  <div className="xhs-account-entry-row__body">
                    <div className="xhs-account-entry-row__meta">
                      <span className={`archive-pill ${articleCount > 0 ? "status-ready" : "status-pending"}`}>
                        {articleCount > 0 ? `已获取 ${articleCount} 篇` : "待提交"}
                      </span>
                      {hasMore ? <span className="archive-pill status-pending">可翻页</span> : null}
                    </div>
                    <strong>{account.accountName || account.ghUsername}</strong>
                    <strong>{account.ghUsername}</strong>
                  </div>
                  <div className="xhs-account-entry-row__actions">
                    <button type="button" className="primary-button" onClick={() => props.onFetchArticles(account.id, account.ghUsername)} disabled={props.isHydrating || isFetching}>
                      {isFetching ? "提交中..." : hasMore ? "获取下一页" : "提交"}
                    </button>
                    {props.canEdit ? (
                      <button type="button" className="note-inline-button" onClick={() => props.onDelete(account.id)} disabled={props.isHydrating || props.deletingAccountId === account.id}>
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="xhs-account-entry-empty">当前还没有添加公众号账号，请先点击右上角添加账号。</div>
        )}
      </article>

      <article className="light-data-panel">
        <div className="collection-result-head">
          <div>
            <h3>文章列表</h3>
            <p>展示已采集到的公众号文章，点击"读取文章"调用 GLM 网页阅读器获取正文内容，点击文章文字可自动复制。</p>
          </div>
        </div>
        {props.articles.length ? (
          <WechatMpArticleTable
            items={props.articles}
            accountNameById={accountNameById}
            readingIds={props.readingArticleIds}
            onReadArticle={props.onReadArticle}
            onCopyContent={props.onCopyContent}
            formatDateTime={props.formatDateTime}
            formatCount={props.formatCount}
          />
        ) : (
          <div className="note-empty-state">当前还没有采集到公众号文章，请先添加公众号账号并提交获取文章列表。</div>
        )}
      </article>
    </>
  );
}

// ─── 微信搜一搜面板 ───

const BUSINESS_TYPE_OPTIONS: Array<{ value: WechatSearchBusinessType; label: string }> = [
  { value: "all", label: "综合" },
  { value: "account", label: "公众号" },
  { value: "article", label: "文章" },
  { value: "video", label: "视频" },
  { value: "live_stream", label: "直播" },
  { value: "moments", label: "朋友圈" },
  { value: "news", label: "新闻" },
  { value: "book", label: "读书" },
  { value: "listen", label: "听书" },
  { value: "image", label: "图片" },
  { value: "encyclopedia", label: "百科" },
  { value: "weixin_index", label: "微信指数" },
];

const SORT_OPTIONS: Array<{ value: WechatSearchSortType; label: string }> = [
  { value: "default", label: "不限" },
  { value: "latest", label: "最新" },
  { value: "hot", label: "最热" },
];

const PUBLISH_TIME_OPTIONS: Array<{ value: WechatSearchPublishTime; label: string }> = [
  { value: "all", label: "不限" },
  { value: "day", label: "最近一天" },
  { value: "week", label: "最近七天" },
  { value: "half_year", label: "最近半年" },
];

type WechatSearchPanelProps = {
  items: WechatSearchItemRecord[];
  canEdit: boolean;
  keyword: string;
  onKeywordChange: (value: string) => void;
  businessType: WechatSearchBusinessType;
  onBusinessTypeChange: (value: WechatSearchBusinessType) => void;
  sort: WechatSearchSortType;
  onSortChange: (value: WechatSearchSortType) => void;
  publishTime: WechatSearchPublishTime;
  onPublishTimeChange: (value: WechatSearchPublishTime) => void;
  onSearch: () => void;
  onNextPage: () => void;
  isSearching: boolean;
  hasMore: boolean;
  selectedIds: string[];
  allSelected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onUpdateData: () => void;
  isUpdating: boolean;
  updatingIds: string[];
  onAddToMaterial: () => void;
  isAdding: boolean;
  addingMaterialAssetId?: string;
  onDelete: () => void;
  isDeleting: boolean;
  onCopyContent: (content: string) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
};

function WechatSearchPanel(props: WechatSearchPanelProps) {
  return (
    <>
      <article className="light-data-panel" style={{ marginBottom: 16 }}>
        <div className="collection-result-head">
          <div>
            <h3>微信搜一搜</h3>
            <p>输入关键词，选择搜索类型、排序和发布时间，提交后获取微信搜一搜结果。支持翻页获取更多结果。</p>
          </div>
          {props.canEdit ? (
            <button type="button" className="primary-button" onClick={props.onSearch} disabled={props.isSearching || !props.keyword.trim()}>
              {props.isSearching ? "搜索中..." : "搜索"}
            </button>
          ) : null}
        </div>
        <div className="stack gap-12" style={{ marginTop: 12 }}>
          <label className="field">
            <span>关键词</span>
            <input value={props.keyword} onChange={(event) => props.onKeywordChange(event.target.value)} placeholder="请输入搜索关键词" />
          </label>
          <div className="strategy-chip-row" style={{ flexWrap: "wrap" }}>
            <label className="field" style={{ minWidth: 160 }}>
              <span>搜索类型</span>
              <select value={props.businessType} onChange={(event) => props.onBusinessTypeChange(event.target.value as WechatSearchBusinessType)}>
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ minWidth: 120 }}>
              <span>排序</span>
              <select value={props.sort} onChange={(event) => props.onSortChange(event.target.value as WechatSearchSortType)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ minWidth: 140 }}>
              <span>发布时间</span>
              <select value={props.publishTime} onChange={(event) => props.onPublishTimeChange(event.target.value as WechatSearchPublishTime)}>
                {PUBLISH_TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </article>

      <article className="light-data-panel">
        <div className="collection-result-head">
          <div>
            <h3>搜索结果</h3>
            <p>勾选文章后点击"更新数据"批量读取文章正文并更新互动指标。点击文章内容可自动复制。</p>
          </div>
          <div className="xhs-account-entry-row__actions">
            {props.canEdit && props.items.length > 0 && props.hasMore ? (
              <button type="button" className="secondary-button" onClick={props.onNextPage} disabled={props.isSearching}>
                {props.isSearching ? "加载中..." : "下一页"}
              </button>
            ) : null}
            {props.canEdit && props.items.length > 0 ? (
              <button type="button" className="primary-button" onClick={props.onUpdateData} disabled={props.isUpdating || props.selectedIds.length === 0}>
                {props.isUpdating ? "更新中..." : "更新数据"}
              </button>
            ) : null}
            {props.canEdit && props.items.length > 0 ? (
              <button
                type="button"
                className="secondary-button"
                onClick={props.onAddToMaterial}
                disabled={props.isAdding || props.isDeleting || props.selectedIds.length === 0}
              >
                {props.isAdding ? "加入中..." : "加入素材库"}
              </button>
            ) : null}
            {props.canEdit && props.items.length > 0 ? (
              <button type="button" className="note-inline-button" onClick={props.onDelete} disabled={props.isDeleting || props.selectedIds.length === 0}>
                {props.isDeleting ? "删除中..." : "删除"}
              </button>
            ) : null}
          </div>
        </div>
        {props.items.length ? (
          <div className="wechat-mp-article-table-shell">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={props.allSelected} onChange={(event) => props.onSelectAll(event.target.checked)} />
                  </th>
                  <th>素材库</th>
                  <th>标题</th>
                  <th>链接</th>
                  <th className="table-cell-wide">文章</th>
                  <th>文章图片</th>
                  <th>发布时间</th>
                  <th>阅读量</th>
                  <th>点赞数</th>
                  <th>分享数</th>
                  <th>收藏数</th>
                  <th>评论数</th>
                  <th>喜欢数</th>
                </tr>
              </thead>
              <tbody>
                {props.items.map((item) => {
                  const isChecked = props.selectedIds.includes(item.id);
                  const isUpdating = props.updatingIds.includes(item.id);
                  const isAdding = props.addingMaterialAssetId === item.id && props.isAdding;
                  const hasContent = Boolean(item.articleContent?.trim());
                  const images = item.images || [];
                  return (
                    <tr key={item.id}>
                      <td>
                        <input type="checkbox" checked={isChecked} onChange={(event) => props.onToggle(item.id, event.target.checked)} />
                      </td>
                      <td>{item.isInMaterialLibrary ? "已加入" : isAdding ? "加入中..." : "-"}</td>
                      <td className="wechat-mp-title-cell">
                        <span className="wechat-mp-title-text" title={item.title}>{item.title || "-"}</span>
                      </td>
                      <td>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="note-data-link">查看</a> : <span>-</span>}</td>
                      <td className="wechat-mp-article-cell">
                        {hasContent ? (
                          <div className="table-text-shell table-text-shell--copyable" data-rows="2" onClick={() => void props.onCopyContent(item.articleContent || "")} title="点击复制文章内容" style={{ cursor: "pointer" }}>
                            <button type="button" className="table-text-cell" data-rows={2}>{item.articleContent}</button>
                          </div>
                        ) : <span>-</span>}
                      </td>
                      <td>
                        {images.length ? (
                          <div className="stack gap-4" style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {images.slice(0, 3).map((img, idx) => (
                              <img key={idx} src={img} alt={`${item.title}-${idx + 1}`} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} loading="lazy" />
                            ))}
                            {images.length > 3 ? <span style={{ fontSize: 12, color: "var(--site-hero-muted)" }}>+{images.length - 3}</span> : null}
                          </div>
                        ) : <span>-</span>}
                      </td>
                      <td>{props.formatDateTime(item.publishTime)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(item.readNum)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(item.likeCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(item.shareCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(item.collectCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(item.commentCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(item.starNum)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="note-empty-state">当前还没有搜索结果，请先输入关键词并搜索。</div>
        )}
      </article>
    </>
  );
}

function WechatMpArticleTable(props: {
  items: WechatMpArticleRecord[];
  accountNameById: Map<string, string>;
  readingIds: string[];
  onReadArticle: (article: WechatMpArticleRecord) => void;
  onCopyContent: (content: string) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  return (
    <div className="wechat-mp-article-table-shell">
      <table className="soft-table">
        <thead>
          <tr>
            <th>账号名称</th>
            <th>标题</th>
            <th>链接</th>
            <th className="table-cell-wide">文章</th>
            <th>封面图</th>
            <th>发布时间</th>
            <th>阅读量</th>
            <th>点赞数</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((article) => {
            const isReading = props.readingIds.includes(article.id);
            const hasContent = Boolean(article.articleContent?.trim());
            const accountName = props.accountNameById.get(article.sourceAccountId) || article.ghUsername || "-";
            return (
              <tr key={article.id}>
                <td>{accountName}</td>
                <td className="wechat-mp-title-cell">
                  <span className="wechat-mp-title-text" title={article.digest || undefined}>{article.title || "-"}</span>
                </td>
                <td>{article.url ? <a href={article.url} target="_blank" rel="noopener noreferrer" className="note-data-link">查看</a> : <span>-</span>}</td>
                <td className="wechat-mp-article-cell">
                  {hasContent ? (
                    <div className="table-text-shell table-text-shell--copyable" data-rows="2" onClick={() => void props.onCopyContent(article.articleContent || "")} title="点击复制文章内容" style={{ cursor: "pointer" }}>
                      <button type="button" className="table-text-cell" data-rows={2}>{article.articleContent}</button>
                    </div>
                  ) : article.url ? (
                    <button type="button" className="note-inline-button" onClick={() => void props.onReadArticle(article)} disabled={isReading}>
                      {isReading ? "读取中..." : "读取文章"}
                    </button>
                  ) : <span>-</span>}
                </td>
                <td>{article.cover ? <img src={article.cover} alt={article.title} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} loading="lazy" /> : <span>-</span>}</td>
                <td>{props.formatDateTime(article.createTime)}</td>
                <td>{props.formatCount(article.readNum)}</td>
                <td>{props.formatCount(article.likeCount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── 对标作品信息及数据面板 ───

type BenchmarkWorkPanelProps = {
  articles: WechatMpBenchmarkArticleRecord[];
  canEdit: boolean;
  inputUrl: string;
  onInputUrlChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  selectedIds: string[];
  allSelected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onUpdateStats: () => void;
  isUpdating: boolean;
  updatingIds: string[];
  onAddToMaterial: () => void;
  isAdding: boolean;
  addingMaterialAssetId?: string;
  onDelete: () => void;
  isDeleting: boolean;
  onCopyContent: (content: string) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
};

function BenchmarkWorkPanel(props: BenchmarkWorkPanelProps) {
  return (
    <>
      <article className="light-data-panel" style={{ marginBottom: 16 }}>
        <div className="collection-result-head">
          <div>
            <h3>对标作品链接</h3>
            <p>输入公众号文章链接，点击提交后调用 GLM 网页阅读器读取文章标题和正文。</p>
          </div>
          {props.canEdit ? (
            <button type="button" className="primary-button" onClick={() => void props.onSubmit()} disabled={props.isSubmitting || !props.inputUrl.trim()}>
              {props.isSubmitting ? "提交中..." : "提交"}
            </button>
          ) : null}
        </div>
        <label className="field">
          <textarea rows={3} value={props.inputUrl} onChange={(event) => props.onInputUrlChange(event.target.value)} placeholder="请输入公众号文章链接，例如 https://mp.weixin.qq.com/s/xxxxxx" />
        </label>
      </article>

      <article className="light-data-panel">
        <div className="collection-result-head">
          <div>
            <h3>对标作品信息及数据</h3>
            <p>勾选文章后点击"更新数据"批量获取阅读量、点赞数等互动指标。点击文章内容可自动复制。</p>
          </div>
          {props.canEdit && props.articles.length > 0 ? (
            <button type="button" className="primary-button" onClick={() => void props.onUpdateStats()} disabled={props.isUpdating || props.selectedIds.length === 0}>
              {props.isUpdating ? "更新中..." : "更新数据"}
            </button>
          ) : null}
          {props.canEdit && props.articles.length > 0 ? (
            <button
              type="button"
              className="secondary-button"
              onClick={props.onAddToMaterial}
              disabled={props.isAdding || props.isDeleting || props.selectedIds.length === 0}
            >
              {props.isAdding ? "加入中..." : "加入素材库"}
            </button>
          ) : null}
          {props.canEdit && props.articles.length > 0 ? (
            <button type="button" className="note-inline-button" onClick={props.onDelete} disabled={props.isDeleting || props.selectedIds.length === 0}>
              {props.isDeleting ? "删除中..." : "删除"}
            </button>
          ) : null}
        </div>
        {props.articles.length ? (
          <div className="wechat-mp-article-table-shell">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={props.allSelected} onChange={(event) => props.onSelectAll(event.target.checked)} />
                  </th>
                  <th>素材库</th>
                  <th>标题</th>
                  <th>链接</th>
                  <th className="table-cell-wide">文章</th>
                  <th>阅读量</th>
                  <th>点赞数</th>
                  <th>分享数</th>
                  <th>收藏数</th>
                  <th>评论数</th>
                  <th>喜欢数</th>
                </tr>
              </thead>
              <tbody>
                {props.articles.map((article) => {
                  const isChecked = props.selectedIds.includes(article.id);
                  const isUpdating = props.updatingIds.includes(article.id);
                  const isAdding = props.addingMaterialAssetId === article.id && props.isAdding;
                  const hasContent = Boolean(article.articleContent?.trim());
                  return (
                    <tr key={article.id}>
                      <td>
                        <input type="checkbox" checked={isChecked} onChange={(event) => props.onToggle(article.id, event.target.checked)} />
                      </td>
                      <td>{article.isInMaterialLibrary ? "已加入" : isAdding ? "加入中..." : "-"}</td>
                      <td className="wechat-mp-title-cell">
                        <span className="wechat-mp-title-text" title={article.title}>{article.title || "-"}</span>
                      </td>
                      <td>{article.url ? <a href={article.url} target="_blank" rel="noopener noreferrer" className="note-data-link">查看</a> : <span>-</span>}</td>
                      <td className="wechat-mp-article-cell">
                        {hasContent ? (
                          <div className="table-text-shell table-text-shell--copyable" data-rows="2" onClick={() => void props.onCopyContent(article.articleContent || "")} title="点击复制文章内容" style={{ cursor: "pointer" }}>
                            <button type="button" className="table-text-cell" data-rows={2}>{article.articleContent}</button>
                          </div>
                        ) : <span>-</span>}
                      </td>
                      <td>{isUpdating ? "..." : props.formatCount(article.readNum)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(article.likeCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(article.shareCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(article.collectCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(article.commentCount)}</td>
                      <td>{isUpdating ? "..." : props.formatCount(article.starNum)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="note-empty-state">当前还没有采集到对标文章，请先输入文章链接并提交。</div>
        )}
      </article>
    </>
  );
}
