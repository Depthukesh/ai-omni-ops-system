"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { USER_ACCESS_FEATURE_OPTIONS, type UserAccessFeatureKey } from "../../../../../../packages/shared/src/user-access";
import {
  deleteAdminUser,
  getAdminUserDetail,
  getAdminUsers,
  updateAdminUser,
  type AdminUserDetailRecord,
  type AdminUserRecord,
  type GetAdminUsersQuery,
  type MembershipLevel,
} from "../../../services/admin";

type UsersManagementPanelProps = {
  users: AdminUserRecord[];
  dataSource: "api" | "seed";
  onUsersChange: Dispatch<SetStateAction<AdminUserRecord[]>>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type UserFilters = {
  keyword: string;
  membership: "ALL" | MembershipLevel;
  status: "ALL" | "ACTIVE" | "DISABLED";
  systemRole: "ALL" | AdminUserRecord["systemRole"];
  emailVerified: "ALL" | "VERIFIED" | "UNVERIFIED";
};

type UserDetailDraft = {
  nickname: string;
  mobile: string;
  email: string;
  avatarUrl: string;
  membership: MembershipLevel;
  status: AdminUserRecord["status"];
  systemRole: AdminUserRecord["systemRole"];
  pointsBalance: string;
  accessExpiresAt: string;
  hasFullFeatureAccess: boolean;
  allowedFeatureKeys: UserAccessFeatureKey[];
  emailVerified: boolean;
  password: string;
};

const DEFAULT_FILTERS: UserFilters = {
  keyword: "",
  membership: "ALL",
  status: "ALL",
  systemRole: "ALL",
  emailVerified: "ALL",
};

const MEMBERSHIP_OPTIONS: MembershipLevel[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"];
const SYSTEM_ROLE_OPTIONS: AdminUserRecord["systemRole"][] = [
  "USER",
  "SUPER_ADMIN",
  "ADMIN_OPERATOR",
  "FINANCE_OPERATOR",
  "SUPPORT_OPERATOR",
];

export function UsersManagementPanel(props: UsersManagementPanelProps) {
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<AdminUserDetailRecord | null>(null);
  const [detailDraft, setDetailDraft] = useState<UserDetailDraft>(buildUserDetailDraft(null));
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRecord | null>(null);

  const visibleUsers = useMemo(() => {
    if (props.dataSource !== "seed") {
      return props.users;
    }
    return props.users.filter((item) => matchesLocalFilters(item, filters));
  }, [filters, props.dataSource, props.users]);

  useEffect(() => {
    if (!visibleUsers.length) {
      setSelectedUserId("");
      setSelectedDetail(null);
      setDetailDraft(buildUserDetailDraft(null));
      setIsDetailModalOpen(false);
      return;
    }

    if (selectedUserId && !visibleUsers.some((item) => item.id === selectedUserId)) {
      setSelectedUserId("");
      setSelectedDetail(null);
      setDetailDraft(buildUserDetailDraft(null));
      setIsDetailModalOpen(false);
    }
  }, [selectedUserId, visibleUsers]);

  useEffect(() => {
    if (!isDetailModalOpen || !selectedUserId) {
      return;
    }

    void loadUserDetail(selectedUserId);
  }, [isDetailModalOpen, selectedUserId]);

  useEffect(() => {
    if (!isDetailModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDetailModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDetailModalOpen]);

  async function loadUserDetail(userId: string) {
    const fallbackUser = props.users.find((item) => item.id === userId);
    setIsLoadingDetail(true);
    try {
      if (props.dataSource === "seed") {
        const detail = buildSeedUserDetail(fallbackUser);
        setSelectedDetail(detail);
        setDetailDraft(buildUserDetailDraft(detail));
        return;
      }

      const detail = await getAdminUserDetail(userId);
      setSelectedDetail(detail);
      setDetailDraft(buildUserDetailDraft(detail));
    } catch (error) {
      if (fallbackUser) {
        const detail = buildSeedUserDetail(fallbackUser);
        setSelectedDetail(detail);
        setDetailDraft(buildUserDetailDraft(detail));
      }
      const message = error instanceof Error ? error.message : "读取用户详情失败";
      props.onError(`读取用户详情失败：${message}`);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleApplyFilters() {
    setIsApplyingFilters(true);
    props.onNotice("");
    props.onError("");

    try {
      if (props.dataSource === "seed") {
        props.onNotice(`已按当前筛选条件收口演示数据，共 ${visibleUsers.length} 个用户。`);
        return;
      }

      const next = await getAdminUsers(toQuery(filters));
      props.onUsersChange(next);
      props.onNotice(`用户列表已刷新，共 ${next.length} 个账号。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "筛选用户失败";
      props.onError(`筛选用户失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      props.onNotice(`已重置筛选条件，共 ${props.users.length} 个演示账号。`);
      return;
    }

    setIsApplyingFilters(true);
    try {
      const next = await getAdminUsers();
      props.onUsersChange(next);
      props.onNotice(`已重置筛选条件，共 ${next.length} 个账号。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "重置筛选失败";
      props.onError(`重置筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleSaveUser() {
    if (!selectedUserId || !selectedDetail) {
      return;
    }

    setIsSavingDetail(true);
    props.onNotice("");
    props.onError("");

    const payload = {
      nickname: detailDraft.nickname.trim(),
      mobile: detailDraft.mobile.trim(),
      email: detailDraft.email.trim(),
      avatarUrl: detailDraft.avatarUrl.trim(),
      membership: detailDraft.membership,
      status: detailDraft.status,
      systemRole: detailDraft.systemRole,
      pointsBalance: Number(detailDraft.pointsBalance || 0),
      accessExpiresAt: detailDraft.accessExpiresAt ? new Date(detailDraft.accessExpiresAt).toISOString() : null,
      allowedFeatureKeys: detailDraft.hasFullFeatureAccess ? null : detailDraft.allowedFeatureKeys,
      emailVerified: detailDraft.emailVerified,
      password: detailDraft.password.trim() || undefined,
    };

    try {
      if (props.dataSource === "seed") {
        const updated = buildSeedUpdatedDetail(selectedDetail, payload);
        setSelectedDetail(updated);
        setDetailDraft(buildUserDetailDraft(updated));
        props.onUsersChange((current) => current.map((item) => (item.id === updated.id ? toListRecord(updated) : item)));
        props.onNotice(`演示用户已更新：${updated.nickname || updated.mobile}`);
        return;
      }

      const updated = await updateAdminUser(selectedUserId, payload);
      setSelectedDetail(updated);
      setDetailDraft(buildUserDetailDraft(updated));
      props.onUsersChange((current) => current.map((item) => (item.id === updated.id ? toListRecord(updated) : item)));
      props.onNotice(`用户资料已保存：${updated.nickname || updated.mobile}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存用户失败";
      props.onError(`保存用户失败：${message}`);
    } finally {
      setIsSavingDetail(false);
    }
  }

  function handleOpenUserDetail(userId: string) {
    setSelectedUserId(userId);
    setIsDetailModalOpen(true);
  }

  function handleCloseUserDetail() {
    setIsDetailModalOpen(false);
  }

  function handleAskDeleteUser(user: AdminUserRecord) {
    setDeleteTarget(user);
  }

  function handleCloseDeleteConfirm() {
    if (isDeletingUser) {
      return;
    }
    setDeleteTarget(null);
  }

  async function handleConfirmDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    setIsDeletingUser(true);
    props.onNotice("");
    props.onError("");

    try {
      if (props.dataSource === "seed") {
        props.onUsersChange((current) => current.filter((item) => item.id !== deleteTarget.id));
        if (selectedUserId === deleteTarget.id) {
          setSelectedUserId("");
          setSelectedDetail(null);
          setDetailDraft(buildUserDetailDraft(null));
          setIsDetailModalOpen(false);
        }
        props.onNotice(`演示账号已删除：${deleteTarget.nickname || deleteTarget.mobile}`);
        setDeleteTarget(null);
        return;
      }

      const deleted = await deleteAdminUser(deleteTarget.id);
      props.onUsersChange((current) => current.filter((item) => item.id !== deleteTarget.id));
      if (selectedUserId === deleteTarget.id) {
        setSelectedUserId("");
        setSelectedDetail(null);
        setDetailDraft(buildUserDetailDraft(null));
        setIsDetailModalOpen(false);
      }
      props.onNotice(`账号已删除：${deleted.nickname || deleted.mobile}`);
      setDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除用户失败";
      props.onError(`删除用户失败：${message}`);
    } finally {
      setIsDeletingUser(false);
    }
  }

  return (
    <div className="admin-user-management">
      <section className="entity-card admin-user-filter-card">
        <div className="admin-user-filter-head">
          <div>
            <span className="archive-pill status-ready">用户</span>
            <h3>用户管理</h3>
            <p>支持关键词筛选、角色筛选、会员筛选，并可点进单个用户查看和编辑账号信息。</p>
          </div>
          <div className="admin-user-filter-summary">
            <div>
              <span>当前结果</span>
              <strong>{visibleUsers.length}</strong>
            </div>
            <div>
              <span>管理员账号</span>
              <strong>{visibleUsers.filter((item) => item.systemRole !== "USER").length}</strong>
            </div>
            <div>
              <span>已验证邮箱</span>
              <strong>{visibleUsers.filter((item) => item.emailVerified).length}</strong>
            </div>
          </div>
        </div>

        <div className="admin-user-filter-grid">
          <label>
            <span>关键词</span>
            <input
              value={filters.keyword}
              placeholder="手机号 / 邮箱 / 用户名"
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            />
          </label>
          <label>
            <span>会员等级</span>
            <select
              value={filters.membership}
              onChange={(event) => setFilters((current) => ({ ...current, membership: event.target.value as UserFilters["membership"] }))}
            >
              <option value="ALL">全部</option>
              {MEMBERSHIP_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>账号状态</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as UserFilters["status"] }))}>
              <option value="ALL">全部</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </label>
          <label>
            <span>系统角色</span>
            <select
              value={filters.systemRole}
              onChange={(event) => setFilters((current) => ({ ...current, systemRole: event.target.value as UserFilters["systemRole"] }))}
            >
              <option value="ALL">全部</option>
              {SYSTEM_ROLE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>邮箱验证</span>
            <select
              value={filters.emailVerified}
              onChange={(event) => setFilters((current) => ({ ...current, emailVerified: event.target.value as UserFilters["emailVerified"] }))}
            >
              <option value="ALL">全部</option>
              <option value="VERIFIED">已验证</option>
              <option value="UNVERIFIED">未验证</option>
            </select>
          </label>
        </div>

        <div className="admin-user-filter-actions">
          <button type="button" className="primary-button" onClick={() => void handleApplyFilters()} disabled={isApplyingFilters}>
            {isApplyingFilters ? "筛选中..." : "筛选"}
          </button>
          <button type="button" className="secondary-button" onClick={() => void handleResetFilters()} disabled={isApplyingFilters}>
            重置
          </button>
        </div>
      </section>

      <section className="admin-user-layout">
        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>用户列表</strong>
              <p className="personal-meta">当前支持查看普通用户和管理员账号，并进入单账号详情编辑。</p>
            </div>
          </div>

          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>账号</th>
                  <th>积分</th>
                  <th>品牌</th>
                  <th>任务</th>
                  <th>订单</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.length ? (
                  visibleUsers.map((item) => (
                    <tr key={item.id} className={isDetailModalOpen && item.id === selectedUserId ? "is-active" : ""}>
                      <td>
                        <button type="button" className="admin-user-row-button" onClick={() => handleOpenUserDetail(item.id)}>
                          <span className="admin-user-row-title">{item.nickname || item.mobile}</span>
                          <span className="admin-user-row-meta">
                            {item.mobile} · {item.email || "未填写邮箱"} · {item.emailVerified ? "邮箱已验证" : "邮箱未验证"}
                          </span>
                        </button>
                      </td>
                      <td>{item.pointsBalance}</td>
                      <td>{item.brandCount}</td>
                      <td>{item.taskCount}</td>
                      <td>{item.orderCount}</td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                      <td className="admin-user-actions-cell">
                        <button type="button" className="secondary-button" onClick={() => handleOpenUserDetail(item.id)}>
                          查看详情
                        </button>
                        <button type="button" className="secondary-button" onClick={() => handleAskDeleteUser(item)}>
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-user-empty">当前筛选条件下没有匹配的用户。</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {isDetailModalOpen ? (
        <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseUserDetail}>
          <div
            className="entity-card admin-user-modal"
            role="dialog"
            aria-modal="true"
            aria-label="用户详情与编辑"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-user-modal-topbar">
              <div>
                <span className="archive-pill status-ready">账号详情</span>
                <strong>查看和编辑用户资料</strong>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseUserDetail}>
                关闭
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="admin-user-empty">正在加载用户详情...</div>
            ) : selectedDetail ? (
              <>
                <div className="admin-user-detail-head">
                  <div className="admin-user-avatar">
                    {selectedDetail.avatarUrl ? (
                      <img src={selectedDetail.avatarUrl} alt={`${selectedDetail.nickname || selectedDetail.mobile} avatar`} />
                    ) : (
                      <span>{(selectedDetail.nickname || selectedDetail.mobile).slice(0, 1)}</span>
                    )}
                  </div>
                  <div>
                    <strong>{selectedDetail.nickname || selectedDetail.mobile}</strong>
                    <p className="personal-meta">
                      {selectedDetail.systemRole} · {selectedDetail.status} · {selectedDetail.membership}
                    </p>
                  </div>
                </div>

                <div className="admin-user-metrics">
                  <div>
                    <span>当前积分</span>
                    <strong>{selectedDetail.pointsBalance}</strong>
                  </div>
                  <div>
                    <span>活跃会话</span>
                    <strong>{selectedDetail.sessionCount}</strong>
                  </div>
                  <div>
                    <span>品牌数</span>
                    <strong>{selectedDetail.brandCount}</strong>
                  </div>
                  <div>
                    <span>最近登录</span>
                    <strong>{selectedDetail.lastLoginAt ? formatDateTime(selectedDetail.lastLoginAt) : "未记录"}</strong>
                  </div>
                </div>

                <div className="admin-user-detail-form">
                  <label>
                    <span>用户名</span>
                    <input
                      value={detailDraft.nickname}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, nickname: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>手机号</span>
                    <input
                      value={detailDraft.mobile}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, mobile: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>邮箱</span>
                    <input
                      value={detailDraft.email}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>头像地址</span>
                    <input
                      value={detailDraft.avatarUrl}
                      placeholder="https://..."
                      onChange={(event) => setDetailDraft((current) => ({ ...current, avatarUrl: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>会员等级</span>
                    <select
                      value={detailDraft.membership}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, membership: event.target.value as MembershipLevel }))}
                    >
                      {MEMBERSHIP_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>账号状态</span>
                    <select
                      value={detailDraft.status}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value as AdminUserRecord["status"] }))}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </label>
                  <label>
                    <span>系统角色</span>
                    <select
                      value={detailDraft.systemRole}
                      onChange={(event) =>
                        setDetailDraft((current) => ({ ...current, systemRole: event.target.value as AdminUserRecord["systemRole"] }))
                      }
                    >
                      {SYSTEM_ROLE_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>积分余额</span>
                    <input
                      type="number"
                      min="0"
                      value={detailDraft.pointsBalance}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, pointsBalance: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>使用期限</span>
                    <input
                      type="datetime-local"
                      value={detailDraft.accessExpiresAt}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, accessExpiresAt: event.target.value }))}
                    />
                  </label>
                  <label className="admin-user-checkbox">
                    <input
                      type="checkbox"
                      checked={detailDraft.emailVerified}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, emailVerified: event.target.checked }))}
                    />
                    <span>邮箱已验证</span>
                  </label>
                  <label className="admin-user-checkbox">
                    <input
                      type="checkbox"
                      checked={detailDraft.hasFullFeatureAccess}
                      onChange={(event) =>
                        setDetailDraft((current) => ({
                          ...current,
                          hasFullFeatureAccess: event.target.checked,
                          allowedFeatureKeys: event.target.checked ? [] : current.allowedFeatureKeys,
                        }))
                      }
                    />
                    <span>不限制模块权限</span>
                  </label>
                  <div className="field field-full">
                    <span>可用模块权限</span>
                    <div className="admin-user-feature-grid">
                      {USER_ACCESS_FEATURE_OPTIONS.map((item) => {
                        const checked = detailDraft.hasFullFeatureAccess || detailDraft.allowedFeatureKeys.includes(item.key);
                        return (
                          <label key={item.key} className="admin-user-checkbox admin-user-feature-option">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={detailDraft.hasFullFeatureAccess}
                              onChange={(event) =>
                                setDetailDraft((current) => ({
                                  ...current,
                                  allowedFeatureKeys: event.target.checked
                                    ? [...new Set([...current.allowedFeatureKeys, item.key])]
                                    : current.allowedFeatureKeys.filter((featureKey) => featureKey !== item.key),
                                }))
                              }
                            />
                            <span>{item.label}</span>
                            <small>{item.description}</small>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <label>
                    <span>重置密码</span>
                    <input
                      type="password"
                      value={detailDraft.password}
                      placeholder="留空则不修改"
                      onChange={(event) => setDetailDraft((current) => ({ ...current, password: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="admin-user-brand-list">
                  <div className="entity-card-head">
                    <div>
                      <strong>关联品牌</strong>
                      <p className="personal-meta">可查看该账号拥有或加入的品牌关系。</p>
                    </div>
                  </div>
                  {selectedDetail.brandItems.length ? (
                    <ul>
                      {selectedDetail.brandItems.map((item) => (
                        <li key={`${item.relation}-${item.id}`}>
                          <strong>{item.brandName}</strong>
                          <span>
                            {item.relation} · {item.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="admin-user-empty compact">当前账号还没有关联品牌。</div>
                  )}
                </div>

                <div className="admin-user-detail-meta">
                  <span>创建于 {formatDateTime(selectedDetail.createdAt)}</span>
                  <span>更新于 {formatDateTime(selectedDetail.updatedAt)}</span>
                </div>

                <div className="personal-actions">
                  <button type="button" className="primary-button" onClick={() => void handleSaveUser()} disabled={isSavingDetail || isLoadingDetail}>
                    {isSavingDetail ? "保存中..." : "保存账号设置"}
                  </button>
                </div>
              </>
            ) : (
              <div className="admin-user-empty">当前用户详情读取失败，请关闭后重试。</div>
            )}
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseDeleteConfirm}>
          <div
            className="entity-card admin-user-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="确认删除用户"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-user-confirm-copy">
              <span className="archive-pill status-paused">删除确认</span>
              <strong>确认删除这个账号吗？</strong>
              <p>
                删除后将移除该账号及其相关登录数据，操作不可恢复。
                <br />
                账号：{deleteTarget.nickname || deleteTarget.mobile} / {deleteTarget.mobile}
              </p>
            </div>
            <div className="personal-actions">
              <button type="button" className="secondary-button" onClick={handleCloseDeleteConfirm} disabled={isDeletingUser}>
                取消
              </button>
              <button type="button" className="danger-button" onClick={() => void handleConfirmDeleteUser()} disabled={isDeletingUser}>
                {isDeletingUser ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toQuery(filters: UserFilters): GetAdminUsersQuery {
  return {
    keyword: filters.keyword || undefined,
    membership: filters.membership,
    status: filters.status,
    systemRole: filters.systemRole,
    emailVerified: filters.emailVerified,
  };
}

function buildUserDetailDraft(detail: AdminUserDetailRecord | null): UserDetailDraft {
  return {
    nickname: detail?.nickname ?? "",
    mobile: detail?.mobile ?? "",
    email: detail?.email ?? "",
    avatarUrl: detail?.avatarUrl ?? "",
    membership: detail?.membership ?? "FREE",
    status: detail?.status ?? "ACTIVE",
    systemRole: detail?.systemRole ?? "USER",
    pointsBalance: detail ? String(detail.pointsBalance) : "0",
    accessExpiresAt: detail?.accessExpiresAt ? toDateTimeLocalValue(detail.accessExpiresAt) : "",
    hasFullFeatureAccess: detail?.hasFullFeatureAccess ?? true,
    allowedFeatureKeys: detail?.allowedFeatureKeys ?? [],
    emailVerified: detail?.emailVerified ?? false,
    password: "",
  };
}

function buildSeedUserDetail(user: AdminUserRecord | undefined): AdminUserDetailRecord | null {
  if (!user) {
    return null;
  }

  return {
    ...user,
    brandItems: [],
  };
}

function buildSeedUpdatedDetail(
  current: AdminUserDetailRecord,
  payload: {
    nickname: string;
    mobile: string;
    email: string;
    avatarUrl: string;
    membership: MembershipLevel;
    status: AdminUserRecord["status"];
    systemRole: AdminUserRecord["systemRole"];
    pointsBalance: number;
    accessExpiresAt?: string | null;
    allowedFeatureKeys?: UserAccessFeatureKey[] | null;
    emailVerified: boolean;
    password?: string;
  },
): AdminUserDetailRecord {
  const emailChanged = payload.email !== current.email;

  return {
    ...current,
    nickname: payload.nickname,
    mobile: payload.mobile,
    email: payload.email,
    avatarUrl: payload.avatarUrl,
    membership: payload.membership,
    status: payload.status,
    systemRole: payload.systemRole,
    pointsBalance: payload.pointsBalance,
    accessExpiresAt: payload.accessExpiresAt ?? null,
    allowedFeatureKeys: payload.allowedFeatureKeys ?? [],
    hasFullFeatureAccess: payload.allowedFeatureKeys == null,
    emailVerified: emailChanged ? payload.emailVerified : payload.emailVerified,
    updatedAt: new Date().toISOString(),
  };
}

function toListRecord(detail: AdminUserDetailRecord): AdminUserRecord {
  return {
    id: detail.id,
    mobile: detail.mobile,
    email: detail.email,
    nickname: detail.nickname,
    avatarUrl: detail.avatarUrl,
    status: detail.status,
    membership: detail.membership,
    systemRole: detail.systemRole,
    emailVerified: detail.emailVerified,
    pointsBalance: detail.pointsBalance,
    accessExpiresAt: detail.accessExpiresAt,
    allowedFeatureKeys: detail.allowedFeatureKeys,
    hasFullFeatureAccess: detail.hasFullFeatureAccess,
    brandCount: detail.brandCount,
    taskCount: detail.taskCount,
    orderCount: detail.orderCount,
    sessionCount: detail.sessionCount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    lastLoginAt: detail.lastLoginAt,
  };
}

function matchesLocalFilters(item: AdminUserRecord, filters: UserFilters) {
  const keyword = filters.keyword.trim().toLowerCase();
  if (keyword) {
    const matched = [item.nickname, item.mobile, item.email].some((value) => value.toLowerCase().includes(keyword));
    if (!matched) {
      return false;
    }
  }

  if (filters.membership !== "ALL" && item.membership !== filters.membership) {
    return false;
  }

  if (filters.status !== "ALL" && item.status !== filters.status) {
    return false;
  }

  if (filters.systemRole !== "ALL" && item.systemRole !== filters.systemRole) {
    return false;
  }

  if (filters.emailVerified === "VERIFIED" && !item.emailVerified) {
    return false;
  }

  if (filters.emailVerified === "UNVERIFIED" && item.emailVerified) {
    return false;
  }

  return true;
}

function formatDateTime(value: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}
