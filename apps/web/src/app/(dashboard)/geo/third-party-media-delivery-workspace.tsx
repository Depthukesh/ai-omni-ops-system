"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createThirdPartyMediaDelivery,
  getThirdPartyMediaDeliveryResources,
  syncThirdPartyMediaDeliveryResources,
  type OpenClawGeoContentRecord,
  type ThirdPartyMediaDeliveryRecord,
  type ThirdPartyMediaDeliveryResourceRecord,
  type ThirdPartyMediaDeliveryResourceWorkspace,
} from "../../../services/openclaw";

type OptionalDateFormatter = (value?: string) => string;

type ThirdPartyMediaDeliveryWorkspaceProps = {
  brandId: string;
  articles: OpenClawGeoContentRecord[];
  formatDateTime: OptionalDateFormatter;
};

const emptyWorkspace: ThirdPartyMediaDeliveryResourceWorkspace = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  hasMore: false,
  cachedTotal: 0,
  searchKeyword: "",
  syncedAt: "",
  nextRemotePage: 1,
  remoteLastPage: 0,
  hasRemoteMore: true,
};

function getResourceText(value?: string) {
  return value?.trim() || "-";
}

function buildArticleOptionLabel(article: OpenClawGeoContentRecord) {
  const createdAtText = article.createdAt ? ` · ${new Date(article.createdAt).toLocaleDateString("zh-CN")}` : "";
  return `${article.title || "未命名文章"}${createdAtText}`;
}

export function ThirdPartyMediaDeliveryWorkspace(props: ThirdPartyMediaDeliveryWorkspaceProps) {
  const [workspace, setWorkspace] = useState<ThirdPartyMediaDeliveryResourceWorkspace>(emptyWorkspace);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState("");
  const [submittingResourceId, setSubmittingResourceId] = useState("");
  const [selectedResource, setSelectedResource] = useState<ThirdPartyMediaDeliveryResourceRecord | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [latestDelivery, setLatestDelivery] = useState<ThirdPartyMediaDeliveryRecord | null>(null);

  const availableArticles = useMemo(
    () => props.articles
      .filter((item) => item.contentType === "third_party_media" && item.htmlContent.trim())
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [props.articles],
  );

  const selectedArticle = useMemo(
    () => availableArticles.find((item) => item.id === selectedArticleId) || availableArticles[0] || null,
    [availableArticles, selectedArticleId],
  );

  useEffect(() => {
    setSelectedArticleId((current) => {
      if (current && availableArticles.some((item) => item.id === current)) {
        return current;
      }
      return availableArticles[0]?.id || "";
    });
  }, [availableArticles]);

  useEffect(() => {
    if (!props.brandId) {
      setWorkspace(emptyWorkspace);
      setErrorMessage("当前还没有选中的品牌，无法加载第三方媒体投放列表。");
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage("");
    void getThirdPartyMediaDeliveryResources(props.brandId, {
      page,
      searchKeyword: appliedSearchKeyword,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setWorkspace(result);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setWorkspace(emptyWorkspace);
        setErrorMessage(error instanceof Error ? error.message : "加载第三方媒体投放列表失败。");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appliedSearchKeyword, page, props.brandId]);

  async function handleRefresh() {
    if (!props.brandId) {
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    setNotice("");
    try {
      const result = await syncThirdPartyMediaDeliveryResources(props.brandId, {
        page,
        searchKeyword: appliedSearchKeyword,
      });
      setWorkspace(result.workspace);
      setNotice(
        result.skipped
          ? `软文街媒体已同步到最后一页，当前直接使用已缓存的 ${result.workspace.cachedTotal} 家媒体。`
          : `已同步软文街第 ${result.remotePage} 页，新增 ${result.createdCount} 家、更新 ${result.updatedCount} 家；当前累计缓存 ${result.workspace.cachedTotal} 家媒体。`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "刷新第三方媒体投放列表失败。");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setPage(1);
    setAppliedSearchKeyword(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setAppliedSearchKeyword("");
    setPage(1);
    setNotice("");
  }

  async function handleSubmitDelivery() {
    if (!props.brandId || !selectedResource || !selectedArticle) {
      return;
    }
    setSubmittingResourceId(selectedResource.id);
    setErrorMessage("");
    setNotice("");
    try {
      const result = await createThirdPartyMediaDelivery(props.brandId, {
        articleId: selectedArticle.id,
        resourceId: selectedResource.id,
      });
      setLatestDelivery(result.delivery);
      setNotice(`已提交投放：${result.delivery.articleTitle} -> ${result.delivery.resourceName || selectedResource.name}`);
      setSelectedResource(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "提交投放失败。");
    } finally {
      setSubmittingResourceId("");
    }
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>第三方媒体投放</strong>
            <p className="panel-subtext">这里展示软文街当前可投放的媒体资源。点击“立即投放”后，可直接选择上方“第三方媒体”里已经生成的文章进行提交。</p>
          </div>
          <div className="strategy-inline-actions">
            <span className={`archive-pill ${availableArticles.length ? "status-ready" : "status-pending"}`}>
              可投放文章 {availableArticles.length} 篇
            </span>
            <span className={`archive-pill ${workspace.items.length ? "status-ready" : "status-pending"}`}>
              已缓存媒体 {workspace.cachedTotal} 家
            </span>
            <button type="button" className="secondary-button" onClick={() => void handleRefresh()} disabled={isLoading}>
              {isLoading ? "同步中..." : "刷新媒体"}
            </button>
          </div>
        </div>

        <form className="strategy-inline-actions" style={{ justifyContent: "space-between", marginBottom: 16 }} onSubmit={handleSearchSubmit}>
          <label className="field" style={{ flex: "1 1 320px", marginBottom: 0 }}>
            <span>搜索媒体</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="按媒体名称、平台、分类、地区搜索"
            />
          </label>
          <div className="openclaw-record-table__actions">
            <button type="submit" className="secondary-button" disabled={isLoading}>
              搜索媒体
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleClearSearch}
              disabled={isLoading || (!searchInput && !appliedSearchKeyword)}
            >
              清空搜索
            </button>
          </div>
        </form>

        {notice ? <div className="personal-inline-hint" style={{ marginBottom: 16 }}><strong>最新结果</strong>{notice}</div> : null}
        {errorMessage ? <div className="personal-inline-hint" style={{ marginBottom: 16, color: "var(--danger-text)" }}><strong>加载失败</strong>{errorMessage}</div> : null}

        {!availableArticles.length ? (
          <div className="note-empty-state" style={{ marginBottom: 16 }}>
            当前还没有可投放的第三方媒体文章。请先让 OpenClaw 在上方“第三方媒体”生成并保存 HTML 内容，再回来执行投放。
          </div>
        ) : null}

        {!workspace.items.length ? (
          <div className="note-empty-state">
            {isLoading
              ? "正在同步第三方媒体投放列表..."
              : appliedSearchKeyword
                ? "当前搜索条件下没有匹配的媒体，请换个关键词试试。"
                : workspace.cachedTotal
                  ? "当前页没有可展示的媒体资源，请切换页码或继续刷新媒体。"
                  : "当前还没有已缓存的媒体资源。请先点击“刷新媒体”，系统会按页增量同步软文街媒体列表并长期保存。"}
          </div>
        ) : (
          <>
            <div className="table-scroll-shell openclaw-record-table-shell">
              <table className="soft-table openclaw-record-table third-party-delivery-table">
                <thead>
                  <tr>
                    <th>媒体名称</th>
                    <th>平台</th>
                    <th>分类</th>
                    <th>地区</th>
                    <th>价格</th>
                    <th>刊发时效</th>
                    <th>成功率</th>
                    <th>收录率</th>
                    <th>案例</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.items.map((item) => (
                    <tr key={`${item.id}-${item.name}`}>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.name}>{getResourceText(item.name)}</span>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.platform}>{getResourceText(item.platform)}</span>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.taxonomy}>{getResourceText(item.taxonomy)}</span>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.area}>{getResourceText(item.area)}</span>
                      </td>
                      <td>{getResourceText(item.price)}</td>
                      <td>{getResourceText(item.publishTime)}</td>
                      <td>{getResourceText(item.successRate)}</td>
                      <td>{getResourceText(item.includeRate)}</td>
                      <td className="openclaw-record-table__action-cell">
                        {item.caseUrl ? (
                          <a href={item.caseUrl} target="_blank" rel="noreferrer" className="secondary-button">
                            查看案例
                          </a>
                        ) : (
                          <span className="status-text">暂无案例</span>
                        )}
                      </td>
                      <td className="openclaw-record-table__action-cell">
                        <div className="openclaw-record-table__actions">
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => setSelectedResource(item)}
                            disabled={!availableArticles.length}
                          >
                            立即投放
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="strategy-inline-actions" style={{ justifyContent: "space-between", marginTop: 16 }}>
              <span className="status-text">
                第 {workspace.page} / {Math.max(1, Math.ceil(Math.max(1, workspace.total) / workspace.pageSize))} 页 · 当前结果 {workspace.total} 家
                {workspace.cachedTotal ? ` · 已缓存 ${workspace.cachedTotal} 家` : ""}
                {workspace.hasRemoteMore ? ` · 下次刷新继续同步第 ${workspace.nextRemotePage} 页` : workspace.remoteLastPage ? " · 软文街已同步到最后一页" : ""}
                {workspace.syncedAt ? ` · 最近同步 ${props.formatDateTime(workspace.syncedAt)}` : ""}
              </span>
              <div className="openclaw-record-table__actions">
                <button type="button" className="secondary-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={isLoading || page <= 1}>
                  上一页
                </button>
                <button type="button" className="secondary-button" onClick={() => setPage((current) => current + 1)} disabled={isLoading || !workspace.hasMore}>
                  下一页
                </button>
              </div>
            </div>
          </>
        )}

        {latestDelivery ? (
          <div className="personal-inline-hint" style={{ marginTop: 16 }}>
            <strong>最近一次投放</strong>
            订单号：{latestDelivery.orderId || "平台未返回"}；文章：{latestDelivery.articleTitle}；媒体：{latestDelivery.resourceName || latestDelivery.resourceId}；提交时间：{props.formatDateTime(latestDelivery.createdAt)}
          </div>
        ) : null}
      </article>

      {selectedResource ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedResource(null)}>
          <div className="openclaw-diary-dialog third-party-delivery-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>立即投放</strong>
                <p>{selectedResource.name || "未命名媒体"} · {selectedResource.platform || "第三方媒体"}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedResource(null)} disabled={Boolean(submittingResourceId)}>
                关闭
              </button>
            </div>

            <div className="openclaw-diary-dialog__content">
              <div className="form-grid">
                <div className="third-party-delivery-dialog__section">
                  <strong>目标媒体</strong>
                  <div className="personal-grid" style={{ marginTop: 12 }}>
                    <div>
                      <span>媒体名称</span>
                      <strong>{getResourceText(selectedResource.name)}</strong>
                    </div>
                    <div>
                      <span>平台</span>
                      <strong>{getResourceText(selectedResource.platform)}</strong>
                    </div>
                    <div>
                      <span>分类</span>
                      <strong>{getResourceText(selectedResource.taxonomy)}</strong>
                    </div>
                    <div>
                      <span>地区</span>
                      <strong>{getResourceText(selectedResource.area)}</strong>
                    </div>
                    <div>
                      <span>价格</span>
                      <strong>{getResourceText(selectedResource.price)}</strong>
                    </div>
                    <div>
                      <span>收录率</span>
                      <strong>{getResourceText(selectedResource.includeRate)}</strong>
                    </div>
                  </div>
                </div>

                <div className="third-party-delivery-dialog__section">
                  <strong>选择第三方媒体文章</strong>
                  <label className="field" style={{ marginTop: 12 }}>
                    <span>文章</span>
                    <select value={selectedArticleId} onChange={(event) => setSelectedArticleId(event.target.value)}>
                      {availableArticles.map((article) => (
                        <option key={article.id} value={article.id}>
                          {buildArticleOptionLabel(article)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedArticle ? (
                    <div className="personal-inline-hint" style={{ marginTop: 12 }}>
                      <strong>{selectedArticle.title || "未命名文章"}</strong>
                      {selectedArticle.description || "当前文章没有摘要，系统将直接使用已保存的 HTML 内容进行投放。"}
                    </div>
                  ) : (
                    <div className="note-empty-state" style={{ marginTop: 12 }}>
                      当前没有可投放的文章。
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="openclaw-diary-dialog__meta" style={{ paddingBottom: 20 }}>
              <span>投放将直接复用 GEO「第三方媒体」里已保存的 HTML 内容。</span>
              <div className="openclaw-record-table__actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleSubmitDelivery()}
                  disabled={!selectedArticle || submittingResourceId === selectedResource.id}
                >
                  {submittingResourceId === selectedResource.id ? "投放中..." : "确认投放"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
