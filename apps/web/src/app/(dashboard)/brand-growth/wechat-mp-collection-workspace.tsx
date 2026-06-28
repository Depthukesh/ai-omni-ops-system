"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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
  readWechatMpArticleContent,
  wechatMpCollectionSeed,
} from "../../../services/collectors";

type WechatMpSubCardKey = "brandAccountData";

const WECHAT_MP_SUB_CARDS: Array<{ key: WechatMpSubCardKey; label: string }> = [
  { key: "brandAccountData", label: "品牌公众号数据" },
];

// 模块级复制提醒 toast（与抖音文案复制共用同一套浮动弹窗逻辑）
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
  const [readingArticleIds, setReadingArticleIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toastVisible = useCopyToastVisible();

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

  const handleCopyArticleContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      notifyCopyToast(true);
    } catch {
      window.alert("复制失败，请手动选中复制。");
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
          onCopyArticleContent={handleCopyArticleContent}
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

      <div className={`copy-toast ${toastVisible ? "is-visible" : ""}`} role="status" aria-live="polite">
        <span className="copy-toast__icon" aria-hidden="true">✓</span>
        <span className="copy-toast__text">已复制</span>
      </div>
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
  readingArticleIds: string[];
  canEdit: boolean;
  onOpenModal: () => void;
  onFetchArticles: (accountId: string, ghUsername: string) => void;
  onDelete: (accountId: string) => void;
  onReadArticle: (article: WechatMpArticleRecord) => void;
  onCopyArticleContent: (content: string) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
};

function BrandAccountDataPanel(props: BrandAccountDataPanelProps) {
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
            <p>展示已采集到的公众号文章，点击"读取文章"调用 GLM 网页阅读器获取正文内容，点击文章文字可自动复制。</p>
          </div>
        </div>
        {props.articles.length ? (
          <WechatMpArticleTable
            items={props.articles}
            readingIds={props.readingArticleIds}
            onReadArticle={props.onReadArticle}
            onCopyArticleContent={props.onCopyArticleContent}
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

function WechatMpArticleTable(props: {
  items: WechatMpArticleRecord[];
  readingIds: string[];
  onReadArticle: (article: WechatMpArticleRecord) => void;
  onCopyArticleContent: (content: string) => void;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  return (
    <div className="wechat-mp-article-table-shell">
      <table className="soft-table">
        <thead>
          <tr>
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
            return (
              <tr key={article.id}>
                <td>
                  <span className="note-data-link" title={article.digest || undefined}>{article.title || "-"}</span>
                </td>
                <td>
                  {article.url ? (
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="note-data-link">查看</a>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td className="wechat-mp-article-cell">
                  {hasContent ? (
                    <div
                      className="table-text-shell table-text-shell--copyable"
                      data-rows="2"
                      onClick={() => void props.onCopyArticleContent(article.articleContent || "")}
                      title="点击复制文章内容"
                      style={{ cursor: "pointer" }}
                    >
                      <button type="button" className="table-text-cell" data-rows={2}>
                        {article.articleContent}
                      </button>
                    </div>
                  ) : article.url ? (
                    <button
                      type="button"
                      className="note-inline-button"
                      onClick={() => void props.onReadArticle(article)}
                      disabled={isReading}
                    >
                      {isReading ? "读取中..." : "读取文章"}
                    </button>
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