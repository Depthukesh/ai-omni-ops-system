"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, type MeResponse } from "../../../../services/auth";
import {
  acceptMyBrandInvite,
  getMyBrandInviteNotifications,
  updateMyBrandInviteNotificationReadState,
  type BrandInviteNotificationRecord,
  type BrandInviteRecord,
} from "../../../../services/brand-growth";
import {
  buildPersonalCenterLoginPath,
  emitBrandInviteReadStateChanged,
  formatCollaboratorRoleLabel,
  formatDateTime,
  isAuthFailure,
} from "../route-helpers";

type InviteHistoryItem = BrandInviteRecord & {
  brandId: string;
  brandName: string;
  notificationId: string;
  notificationTitle: string;
  notificationSummary: string;
  notificationActionUrl?: string;
  notificationReadAt?: string;
  notificationCreatedAt: string;
  notificationUpdatedAt: string;
};

type InviteStatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
type InviteSortKey = "CREATED_DESC" | "CREATED_ASC" | "EXPIRES_ASC" | "BRAND_ASC";

const inviteStatusFilters: Array<{ key: InviteStatusFilter; label: string }> = [
  { key: "ALL", label: "全部邀请" },
  { key: "PENDING", label: "待处理" },
  { key: "ACCEPTED", label: "已接受" },
  { key: "EXPIRED", label: "已过期" },
  { key: "REVOKED", label: "已撤回" },
];

const inviteSortOptions: Array<{ key: InviteSortKey; label: string }> = [
  { key: "CREATED_DESC", label: "按创建时间倒序" },
  { key: "CREATED_ASC", label: "按创建时间正序" },
  { key: "EXPIRES_ASC", label: "按过期时间升序" },
  { key: "BRAND_ASC", label: "按品牌名称排序" },
];

const INVITE_PAGE_SIZE = 8;

function normalizeInviteStatusFilter(value: string | null): InviteStatusFilter {
  if (inviteStatusFilters.some((item) => item.key === value)) {
    return value as InviteStatusFilter;
  }
  return "ALL";
}

function normalizeInviteSortKey(value: string | null): InviteSortKey {
  if (inviteSortOptions.some((item) => item.key === value)) {
    return value as InviteSortKey;
  }
  return "CREATED_DESC";
}

function normalizeInvitePage(value: string | null) {
  const pageNumber = Number(value);
  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return 1;
  }
  return Math.floor(pageNumber);
}

function normalizeUnreadOnlyFlag(value: string | null) {
  return value === "1" || value === "true";
}

function mapInviteNotificationToViewItem(item: BrandInviteNotificationRecord): InviteHistoryItem {
  return {
    ...item.invite,
    brandId: item.brandId,
    brandName: item.brandName,
    notificationId: item.notificationId,
    notificationTitle: item.title,
    notificationSummary: item.summary,
    notificationActionUrl: item.actionUrl,
    notificationReadAt: item.readAt,
    notificationCreatedAt: item.createdAt,
    notificationUpdatedAt: item.updatedAt,
    isRead: item.readAt != null || item.invite.isRead === true,
    readAt: item.readAt ?? item.invite.readAt,
  };
}

export default function PersonalCenterInvitesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [inviteItems, setInviteItems] = useState<InviteHistoryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<InviteStatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<InviteSortKey>("CREATED_DESC");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hasSyncedUrlState, setHasSyncedUrlState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [isUpdatingReadState, setIsUpdatingReadState] = useState(false);
  const [acceptingInviteId, setAcceptingInviteId] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/invites"));
      return;
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setStatusFilter(normalizeInviteStatusFilter(params.get("status")));
      setSortKey(normalizeInviteSortKey(params.get("sort")));
      setSearchKeyword(params.get("keyword") ?? "");
      setCurrentPage(normalizeInvitePage(params.get("page")));
      setUnreadOnly(normalizeUnreadOnlyFlag(params.get("unread")));
      setHasSyncedUrlState(true);
    }

    void loadInviteCenter();
  }, [router]);

  async function loadInviteCenter() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    try {
      const [meResult, inviteResult] = await Promise.all([getMe(), getMyBrandInviteNotifications()]);
      setBrands(meResult.brands);
      setCurrentBrandId(meResult.currentBrandId || meResult.brands[0]?.id || "");
      setInviteItems(inviteResult.items.map(mapInviteNotificationToViewItem));
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setBrands([]);
      setCurrentBrandId("");
      setInviteItems([]);
      setErrorMessage(error instanceof Error ? error.message : "邀请通知中心加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    setAcceptingInviteId(inviteId);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await acceptMyBrandInvite(inviteId);
      setNotice(`你已接受品牌邀请，已加入 ${result.brandName}。`);
      await loadInviteCenter();
      emitBrandInviteReadStateChanged();
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "接受邀请失败");
    } finally {
      setAcceptingInviteId("");
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setNotice("");
    setErrorMessage("");
    try {
      await logoutSession();
      router.replace("/?mode=login");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "退出登录失败");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSessionExpired() {
    await logoutSession();
    router.replace(buildPersonalCenterLoginPath("/personal-center/invites"));
  }

  function handleResetFilters() {
    setStatusFilter("ALL");
    setSortKey("CREATED_DESC");
    setSearchKeyword("");
    setCurrentPage(1);
    setUnreadOnly(false);
    setNotice("已重置邀请通知中心的筛选条件。");
    setErrorMessage("");
  }

  function applyInviteReadState(inviteIds: string[], read: boolean) {
    const inviteIdSet = new Set(inviteIds);
    const now = new Date().toISOString();
    setInviteItems((current) =>
      current.map((item) =>
        inviteIdSet.has(item.id)
          ? {
              ...item,
              isRead: read,
              readAt: read ? now : undefined,
            }
          : item,
      ),
    );
  }

  function applyInviteReadStateByNotification(notificationIds: string[], read: boolean) {
    const notificationIdSet = new Set(notificationIds);
    const now = new Date().toISOString();
    setInviteItems((current) =>
      current.map((item) =>
        notificationIdSet.has(item.notificationId)
          ? {
              ...item,
              isRead: read,
              readAt: read ? now : undefined,
              notificationReadAt: read ? now : undefined,
            }
          : item,
      ),
    );
  }

  async function handleMarkInviteAsRead(inviteId: string) {
    setIsUpdatingReadState(true);
    setNotice("");
    setErrorMessage("");
    try {
      const targetItem = inviteItems.find((item) => item.id === inviteId);
      if (!targetItem) {
        throw new Error("邀请通知不存在");
      }
      const result = await updateMyBrandInviteNotificationReadState({
        notificationIds: [targetItem.notificationId],
        read: true,
      });
      applyInviteReadStateByNotification(result.notificationIds, true);
      emitBrandInviteReadStateChanged();
      setNotice("已将该邀请标记为已读。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "标记已读失败");
    } finally {
      setIsUpdatingReadState(false);
    }
  }

  async function handleMarkInviteAsUnread(inviteId: string) {
    setIsUpdatingReadState(true);
    setNotice("");
    setErrorMessage("");
    try {
      const targetItem = inviteItems.find((item) => item.id === inviteId);
      if (!targetItem) {
        throw new Error("邀请通知不存在");
      }
      const result = await updateMyBrandInviteNotificationReadState({
        notificationIds: [targetItem.notificationId],
        read: false,
      });
      applyInviteReadStateByNotification(result.notificationIds, false);
      emitBrandInviteReadStateChanged();
      setNotice("已将该邀请恢复为未读。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "恢复未读失败");
    } finally {
      setIsUpdatingReadState(false);
    }
  }

  async function handleMarkAllAsRead() {
    const allNotificationIds = inviteItems.map((item) => item.notificationId);
    if (!allNotificationIds.length) {
      return;
    }

    setIsUpdatingReadState(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await updateMyBrandInviteNotificationReadState({
        notificationIds: allNotificationIds,
        read: true,
      });
      applyInviteReadStateByNotification(result.notificationIds, true);
      emitBrandInviteReadStateChanged();
      setNotice("已将当前邀请记录全部标记为已读。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "全部标记已读失败");
    } finally {
      setIsUpdatingReadState(false);
    }
  }

  const pendingInvites = useMemo(
    () => inviteItems.filter((item) => item.status === "PENDING"),
    [inviteItems],
  );
  const acceptedInvites = useMemo(
    () => inviteItems.filter((item) => item.status === "ACCEPTED"),
    [inviteItems],
  );
  const expiredInvites = useMemo(
    () => inviteItems.filter((item) => item.status === "EXPIRED"),
    [inviteItems],
  );
  const revokedInvites = useMemo(
    () => inviteItems.filter((item) => item.status === "REVOKED"),
    [inviteItems],
  );

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  const unreadInviteIdSet = useMemo(
    () => new Set(inviteItems.filter((item) => item.isRead !== true).map((item) => item.id)),
    [inviteItems],
  );

  const filteredInviteItems = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return inviteItems.filter((item) => {
      const matchedStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchedUnread = !unreadOnly || unreadInviteIdSet.has(item.id);
      const matchedKeyword =
        !keyword
        || item.brandName.toLowerCase().includes(keyword)
        || item.role.toLowerCase().includes(keyword)
        || item.invitedByName.toLowerCase().includes(keyword)
        || item.inviteCode.toLowerCase().includes(keyword)
        || item.inviteAccount.toLowerCase().includes(keyword);
      return matchedStatus && matchedUnread && matchedKeyword;
    });
  }, [inviteItems, searchKeyword, statusFilter, unreadInviteIdSet, unreadOnly]);

  const filteredPendingInvites = useMemo(
    () => filteredInviteItems.filter((item) => item.status === "PENDING"),
    [filteredInviteItems],
  );
  const filteredAcceptedInvites = useMemo(() => filteredInviteItems.filter((item) => item.status === "ACCEPTED"), [filteredInviteItems]);
  const filteredExpiredInvites = useMemo(() => filteredInviteItems.filter((item) => item.status === "EXPIRED"), [filteredInviteItems]);
  const filteredRevokedInvites = useMemo(() => filteredInviteItems.filter((item) => item.status === "REVOKED"), [filteredInviteItems]);

  const sortedInviteItems = useMemo(() => {
    const items = [...filteredInviteItems];
    items.sort((left, right) => {
      if (sortKey === "CREATED_ASC") {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }
      if (sortKey === "EXPIRES_ASC") {
        const leftTime = left.expiresAt ? new Date(left.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.expiresAt ? new Date(right.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }
      if (sortKey === "BRAND_ASC") {
        return left.brandName.localeCompare(right.brandName, "zh-CN");
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
    return items;
  }, [filteredInviteItems, sortKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, sortKey, statusFilter, unreadOnly]);

  const totalPages = Math.max(1, Math.ceil(sortedInviteItems.length / INVITE_PAGE_SIZE));
  const pagedInviteItems = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * INVITE_PAGE_SIZE;
    return sortedInviteItems.slice(start, start + INVITE_PAGE_SIZE);
  }, [currentPage, sortedInviteItems, totalPages]);

  const unreadPendingCount = useMemo(
    () => filteredPendingInvites.filter((item) => unreadInviteIdSet.has(item.id)).length,
    [filteredPendingInvites, unreadInviteIdSet],
  );
  const unreadFilteredCount = useMemo(
    () => filteredInviteItems.filter((item) => unreadInviteIdSet.has(item.id)).length,
    [filteredInviteItems, unreadInviteIdSet],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!hasSyncedUrlState) {
      return;
    }

    const params = new URLSearchParams();
    if (statusFilter === "ALL") {
      params.delete("status");
    } else {
      params.set("status", statusFilter);
    }

    if (sortKey === "CREATED_DESC") {
      params.delete("sort");
    } else {
      params.set("sort", sortKey);
    }

    const trimmedKeyword = searchKeyword.trim();
    if (!trimmedKeyword) {
      params.delete("keyword");
    } else {
      params.set("keyword", trimmedKeyword);
    }

    if (currentPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(currentPage));
    }

    if (!unreadOnly) {
      params.delete("unread");
    } else {
      params.set("unread", "1");
    }

    const nextQuery = params.toString();
    const currentQuery = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [currentPage, hasSyncedUrlState, pathname, router, searchKeyword, sortKey, statusFilter, unreadOnly]);

  const sharableInviteUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }
    if (sortKey !== "CREATED_DESC") {
      params.set("sort", sortKey);
    }
    const trimmedKeyword = searchKeyword.trim();
    if (trimmedKeyword) {
      params.set("keyword", trimmedKeyword);
    }
    if (currentPage > 1) {
      params.set("page", String(currentPage));
    }
    if (unreadOnly) {
      params.set("unread", "1");
    }
    const query = params.toString();
    if (typeof window === "undefined") {
      return query ? `${pathname}?${query}` : pathname;
    }
    return `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;
  }, [currentPage, pathname, searchKeyword, sortKey, statusFilter, unreadOnly]);

  async function handleCopyCurrentViewLink() {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      setErrorMessage("当前环境不支持自动复制，请手动复制浏览器地址栏链接。");
      setNotice("");
      return;
    }

    setIsCopyingLink(true);
    setNotice("");
    setErrorMessage("");
    try {
      await navigator.clipboard.writeText(sharableInviteUrl);
      setNotice("已复制当前邀请通知筛选链接，可直接分享给他人。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "复制当前筛选链接失败");
    } finally {
      setIsCopyingLink(false);
    }
  }

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>邀请通知中心</h2>
          <p className="panel-subtext">统一查看待处理、已接受、已过期和已撤回的品牌邀请，并在这里完成邀请收口。</p>
        </div>
        <span>{filteredInviteItems.length} / {inviteItems.length} 条邀请记录</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          {isLoading ? <span className="status-text">正在加载邀请通知...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
          {!isLoading && !notice && !errorMessage && lastSyncedAt ? (
            <span className="status-text">最近同步：{formatDateTime(lastSyncedAt)}</span>
          ) : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadInviteCenter()} disabled={isLoading || Boolean(acceptingInviteId)}>
          刷新邀请
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleCopyCurrentViewLink()} disabled={isCopyingLink}>
          {isCopyingLink ? "复制中..." : "复制当前链接"}
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleMarkAllAsRead()} disabled={!inviteItems.length || isUpdatingReadState}>
          全部标记已读
        </button>
        <button type="button" className="secondary-button" onClick={handleResetFilters}>
          重置筛选
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleLogout()} disabled={isLoggingOut}>
          {isLoggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>

      <div className="personal-toolbar" style={{ marginBottom: 16 }}>
        <div className="tab-switcher">
          {inviteStatusFilters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`tab-button ${statusFilter === item.key ? "is-active" : ""}`}
              onClick={() => setStatusFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className={`tab-button ${unreadOnly ? "is-active" : ""}`}
            onClick={() => setUnreadOnly((current) => !current)}
          >
            只看未读
          </button>
        </div>
        <label className="field personal-search">
          <span>搜索邀请</span>
          <input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="搜索品牌、邀请对象、邀请人、角色或账号"
          />
        </label>
        <label className="field personal-search">
          <span>排序方式</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as InviteSortKey)}>
            {inviteSortOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <article className="metric-card">
          <span>当前品牌</span>
          <strong>{currentBrand?.brandName || "未绑定品牌"}</strong>
          <p>当前登录品牌不会限制你查看自己的跨品牌邀请历史。</p>
        </article>
        <article className="metric-card">
          <span>未读邀请</span>
          <strong>{unreadFilteredCount}</strong>
          <p>{unreadOnly ? "当前已开启只看未读筛选。" : "按当前筛选条件统计，便于优先处理最新邀请变化。"}</p>
        </article>
        <article className="metric-card">
          <span>待处理</span>
          <strong>{filteredPendingInvites.length}</strong>
          <p>其中未读待处理 {unreadPendingCount} 条，可直接在本页接受。</p>
        </article>
        <article className="metric-card">
          <span>已接受</span>
          <strong>{filteredAcceptedInvites.length}</strong>
          <p>用于确认你已经加入过哪些品牌工作区。</p>
        </article>
        <article className="metric-card">
          <span>已失效</span>
          <strong>{filteredExpiredInvites.length + filteredRevokedInvites.length}</strong>
          <p>包含过期和被撤回的邀请，方便回溯邀请状态。</p>
        </article>
      </div>

      <article className="light-data-panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h3>待处理邀请</h3>
            <p className="panel-subtext">这里的待处理邀请支持直接接受，接受后会自动加入对应品牌。</p>
          </div>
          <Link href="/personal-center/team" className="secondary-button">
            去团队协作页
          </Link>
        </div>
        <table className="soft-table">
          <thead>
            <tr>
              <th>品牌</th>
              <th>角色</th>
              <th>邀请人</th>
              <th>邀请对象</th>
              <th>过期时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredPendingInvites.map((item) => (
              <tr key={item.id}>
                <td>{item.brandName}</td>
                <td>{formatCollaboratorRoleLabel(item.role)}</td>
                <td>{item.invitedByName}</td>
                <td>{item.inviteAccount || "邀请链接"}</td>
                <td>{formatDateTime(item.expiresAt)}</td>
                <td>
                  <div className="table-action-row">
                    {unreadInviteIdSet.has(item.id) ? <span className="invite-read-badge is-unread">未读</span> : <span className="invite-read-badge is-read">已读</span>}
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleAcceptInvite(item.id)}
                      disabled={acceptingInviteId === item.id}
                    >
                      {acceptingInviteId === item.id ? "接受中..." : "接受邀请"}
                    </button>
                    {unreadInviteIdSet.has(item.id) ? (
                      <button type="button" className="secondary-button" onClick={() => void handleMarkInviteAsRead(item.id)} disabled={isUpdatingReadState}>
                        标记已读
                      </button>
                    ) : (
                      <button type="button" className="secondary-button" onClick={() => void handleMarkInviteAsUnread(item.id)} disabled={isUpdatingReadState}>
                        恢复未读
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filteredPendingInvites.length ? (
              <tr>
                <td colSpan={6}>当前没有待处理邀请</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>

      <article className="light-data-panel">
        <div className="panel-header">
          <div>
            <h3>邀请总览</h3>
            <p className="panel-subtext">统一查看筛选后的所有邀请记录，并按分页浏览历史状态变化。</p>
          </div>
          <span>
            第 {Math.min(currentPage, totalPages)} / {totalPages} 页
          </span>
        </div>

        {!pagedInviteItems.length ? (
          <div className="empty-state">
            <strong>当前筛选条件下没有邀请记录</strong>
            <p>{unreadOnly ? "你已开启只看未读筛选，可取消后查看全部邀请记录。" : "你可以切换状态、清空关键词，或点击“刷新邀请”重新拉取最新邀请数据。"}</p>
          </div>
        ) : (
          <>
            <table className="soft-table">
              <thead>
                <tr>
                  <th>品牌</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>邀请人</th>
                  <th>邀请对象</th>
                  <th>创建时间</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {pagedInviteItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.brandName}</td>
                    <td>{formatCollaboratorRoleLabel(item.role)}</td>
                    <td>
                      <div className="table-status-stack">
                        <span>{item.status}</span>
                        {unreadInviteIdSet.has(item.id) ? <span className="invite-read-badge is-unread">未读</span> : <span className="invite-read-badge is-read">已读</span>}
                      </div>
                    </td>
                    <td>{item.invitedByName}</td>
                    <td>{item.inviteAccount || "邀请链接"}</td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>{formatDateTime(item.revokedAt || item.expiresAt || item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="note-pagination-bar">
              <div className="note-pagination-summary">
                <span>待处理 {filteredPendingInvites.length}</span>
                <span>已接受 {filteredAcceptedInvites.length}</span>
                <span>已失效 {filteredExpiredInvites.length + filteredRevokedInvites.length}</span>
              </div>
              <div className="note-pagination-actions">
                <button
                  type="button"
                  className="note-page-button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                  .map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`note-page-button ${pageNumber === currentPage ? "is-active" : ""}`}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                <button
                  type="button"
                  className="note-page-button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
