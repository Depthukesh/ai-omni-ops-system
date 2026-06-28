"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { OptionalDateFormatter, OptionalNumberFormatter } from "./shared-types";
import type {
  WechatMpArticleRecord,
  WechatMpBrandAccountRecord,
  WechatMpCollectionWorkspace,
} from "../../../services/collectors";
import {
  bindWechatMpBrandAccount,
  deleteWechatMpBrandAccount,
  fetchWechatMpArticles,
  getWechatMpCollectionWorkspace,
  updateWechatMpArticleStats,
  wechatMpCollectionSeed,
} from "../../../services/collectors";

type WechatMpSubCardKey = "brandAccountData";

const WECHAT_MP_SUB_CARDS: Array<{ key: WechatMpSubCardKey; label: string }> = [
  { key: "brandAccountData", label: "品牌公众号数据" },
];

export type WechatMpCollectionWorkspaceProps = {
  pageTitle: string;
  pageDescription: string;
  isHydrating: boolean;
  canEdit: boolean;
  workspace: WechatMpCollectionWorkspace;
  setWorkspace: Dispatch<SetStateAction<WechatMpCollectionWorkspace>>;
  activeBrandId?: string;
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
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [updatingArticleIds, setUpdatingArticleIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setSelectedArticleIds((current) => current.filter((id) => !result.workspace.articles.some((article) => article.id === id)));
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

  const handleToggleArticle = (articleId: string, checked: boolean) => {
    setSelectedArticleIds((current) =>
      checked ? [...current, articleId] : current.filter((id) => id !== articleId),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedArticleIds(props.workspace.articles.map((article) => article.id));
    } else {
      setSelectedArticleIds([]);
    }
  };

  const handleUpdateSelected = async () => {
    const selected = props.workspace.articles.filter((article) => selectedArticleIds.includes(article.id));
    if (!selected.length) {
      showNotice("error", "请先勾选需要更新数据的文章。");
      return;
    }
    setUpdatingArticleIds(selected.map((article) => article.id));
    let successCount = 0;
    let failCount = 0;
    for (const article of selected) {
      try {
        const result = await updateWechatMpArticleStats(article.url, props.activeBrandId);
        props.setWorkspace(result.workspace);
        successCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setUpdatingArticleIds([]);
    if (failCount === 0) {
      showNotice("success", `已更新 ${successCount} 篇文章数据。`);
    } else {
      showNotice("error", `更新完成：成功 ${successCount} 篇，失败 ${failCount} 篇。`);
    }
  };

  const currentPage = WECHAT_MP_SUB_CARDS.find((item) => item.key === activeCard);
  const allArticleIds = props.workspace.articles.map((article) => article.id);
  const allSelected = allArticleIds.length > 0 && allArticleIds.every((id) => selectedArticleIds.includes(id));

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
          canEdit={props.canEdit}
          onOpenModal={() => setIsModalOpen(true)}
          onFetchArticles={handleFetchArticles}
          onDelete={handleDelete}
          formatDateTime={props.formatDateTime}
          formatCount={props.formatCount}
          selectedArticleIds={selectedArticleIds}
          allSelected={allSelected}
          onToggleArticle={handleToggleArticle}
          onSelectAll={handleSelectAll}
          onUpdateSelected={handleUpdateSelected}
          updatingArticleIds={updatingArticleIds}
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
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleBind()}
                disabled={!draftGhUsername.trim() || isBinding}
              >
                {isBinding ? "提交中..." : "提交"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type BrandAccountDataPanelProps = {
  brandAccounts: WechatMpBrandAccountRecord[];
  articles: WechatMpArticleRecord[];
  isHydrating: boolean;
  isBinding: boolean;
  deletingAccountId?: string;
  fetchingAccountIds: string[];
  hasMoreByAccount: Record<string, boolean>;
  canEdit: boolean;
  onOpenModal: () => void;
  onFetchArticles: (accountId: string, ghUsername: string) => void;
  onDelete: (accountId: string) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  selectedArticleIds: string[];
  allSelected: boolean;
  onToggleArticle: (articleId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onUpdateSelected: () => void;
  updatingArticleIds: string[];
};

function BrandAccountDataPanel(props: BrandAccountDataPanelProps) {
  return (
    <>
      <article className="light-data-panel xhs-account-builder" style={{ marginBottom: 16 }}>
        <div className="collection-result-head">
          <div>
            <h3>品牌公众号数据</h3>
            <p>绑定公众号 gh_username 后，点击"提交"获取历史文章列表，支持翻页和勾选文章更新互动数据。</p>
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
                    <strong>{account.ghUsername}</strong>
                  </div>
                  <div className="xhs-account-entry-row__actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => props.onFetchArticles(account.id, account.ghUsername)}
                      disabled={props.isHydrating || isFetching}
                    >
                      {isFetching ? "提交中..." : hasMore ? "获取下一页" : "提交"}
                    </button>
                    {props.canEdit ? (
                      <button
                        type="button"
                        className="note-inline-button"
                        onClick={() => props.onDelete(account.id)}
                        disabled={props.isHydrating || props.deletingAccountId === account.id}
                      >
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
            <p>展示已采集到的公众号文章，勾选后点击"更新数据"批量获取阅读量、点赞数等互动指标。</p>
          </div>
          {props.canEdit && props.articles.length > 0 ? (
            <button
              type="button"
              className="primary-button"
              onClick={props.onUpdateSelected}
              disabled={props.updatingArticleIds.length > 0 || props.selectedArticleIds.length === 0}
            >
              {props.updatingArticleIds.length > 0 ? "更新中..." : "更新数据"}
            </button>
          ) : null}
        </div>
        {props.articles.length ? (
          <WechatMpArticleTable
            items={props.articles}
            selectedIds={props.selectedArticleIds}
            allSelected={props.allSelected}
            onToggle={props.onToggleArticle}
            onSelectAll={props.onSelectAll}
            formatDateTime={props.formatDateTime}
            formatCount={props.formatCount}
            updatingIds={props.updatingArticleIds}
          />
        ) : (
          <div className="note-empty-state">当前还没有采集到公众号文章，请先添加公众号账号并提交获取文章列表。</div>
        )}
      </article>
    </>
  );
}

function WechatMpArticleTable(props: {
  items: WechatMpArticleRecord[];
  selectedIds: string[];
  allSelected: boolean;
  onToggle: (articleId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  updatingIds: string[];
}) {
  return (
    <div className="table-scroll-shell">
      <table className="soft-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={props.allSelected}
                onChange={(event) => props.onSelectAll(event.target.checked)}
              />
            </th>
            <th>标题</th>
            <th>链接</th>
            <th>文章</th>
            <th>封面图</th>
            <th>发布时间</th>
            <th>阅读量</th>
            <th>点赞数</th>
            <th>在看数</th>
            <th>分享数</th>
            <th>收藏数</th>
            <th>评论数</th>
            <th>喜欢数</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((article) => {
            const isChecked = props.selectedIds.includes(article.id);
            const isUpdating = props.updatingIds.includes(article.id);
            return (
              <tr key={article.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => props.onToggle(article.id, event.target.checked)}
                  />
                </td>
                <td className="table-cell-wide">
                  <span className="note-data-link" title={article.digest || undefined}>{article.title || "-"}</span>
                </td>
                <td>
                  {article.url ? (
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="note-data-link">查看</a>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>
                  {article.url ? (
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="note-data-link">正文</a>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>
                  {article.cover ? (
                    <img src={article.cover} alt={article.title} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} loading="lazy" />
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>{props.formatDateTime(article.createTime)}</td>
                <td>{isUpdating ? "..." : props.formatCount(article.readNum)}</td>
                <td>{isUpdating ? "..." : props.formatCount(article.likeCount)}</td>
                <td>{isUpdating ? "..." : props.formatCount(article.oldLikeCount)}</td>
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
  );
}