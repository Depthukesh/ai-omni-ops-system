"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import {
  addBrandMember,
  acceptMyBrandInvite,
  acceptMyBrandInviteByCode,
  createBrandInvite,
  getBrandInvites,
  getBrandMembers,
  getBrandPermissionSettings,
  getBrandRoleAuditLogs,
  getMyBrandInvites,
  revokeBrandInvite,
  transferBrandOwner,
  updateBrandPermissionSettings,
  updateBrandMember,
  type BrandCollaboratorRole,
  type BrandInviteRecord,
  type BrandRoleAuditLogRecord,
  type BrandMemberRecord,
  type BrandPermissionKey,
  type BrandPermissionSettingsRecord,
} from "../../../../services/brand-growth";
import { buildPersonalCenterLoginPath, formatCollaboratorRoleLabel, formatDateTime, getBrandDisplayName, isAuthFailure } from "../route-helpers";

const roleLabelMap: Record<BrandCollaboratorRole, string> = {
  ADMIN: "管理员",
  STAFF: "员工",
  TALENT: "达人",
};

const memberStatusLabels: Record<string, string> = {
  ACTIVE: "正常",
  DISABLED: "停用",
  REMOVED: "移除",
};

export default function PersonalCenterTeamPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [members, setMembers] = useState<BrandMemberRecord[]>([]);
  const [invites, setInvites] = useState<BrandInviteRecord[]>([]);
  const [myPendingInvites, setMyPendingInvites] = useState<Array<BrandInviteRecord & { brandId: string; brandName: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<BrandRoleAuditLogRecord[]>([]);
  const [permissionSettings, setPermissionSettings] = useState<BrandPermissionSettingsRecord | null>(null);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<BrandCollaboratorRole | "">("");
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [inviteAccount, setInviteAccount] = useState("");
  const [inviteRole, setInviteRole] = useState<BrandCollaboratorRole>("STAFF");
  const [pendingInviteRole, setPendingInviteRole] = useState<BrandCollaboratorRole>("STAFF");
  const [pendingInviteNote, setPendingInviteNote] = useState("");
  const [pendingInviteExpiresInDays, setPendingInviteExpiresInDays] = useState("7");
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [memberStatusDrafts, setMemberStatusDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [isSubmittingPendingInvite, setIsSubmittingPendingInvite] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState("");
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState("");
  const [acceptingInviteId, setAcceptingInviteId] = useState("");
  const [isAcceptingInviteCode, setIsAcceptingInviteCode] = useState(false);
  const [copyingInviteId, setCopyingInviteId] = useState("");
  const [ownerTransferMemberId, setOwnerTransferMemberId] = useState("");
  const [isTransferringOwner, setIsTransferringOwner] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteCodeFromQuery, setInviteCodeFromQuery] = useState("");

  useEffect(() => {
    const currentInviteCode = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("inviteCode")?.trim().toUpperCase() ?? ""
      : "";
    setInviteCodeFromQuery(currentInviteCode);

    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      const nextPath = currentInviteCode
        ? `/personal-center/team?inviteCode=${encodeURIComponent(currentInviteCode)}`
        : "/personal-center/team";
      router.replace(buildPersonalCenterLoginPath(nextPath));
      return;
    }

    void loadTeamPage();
  }, [router]);

  async function loadTeamPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await getMe();
      const nextBrandId = result.currentBrandId || result.brands[0]?.id || "";
      setBrands(result.brands);
      setCurrentBrandId(nextBrandId);
      setUserName(result.user.nickname || result.user.mobile);
      setUserId(result.user.id);

      const myInviteResult = await getMyBrandInvites().catch(() => ({ items: [] }));
      setMyPendingInvites(myInviteResult.items);

      if (nextBrandId) {
        const [membersResult, permissionResult] = await Promise.all([
          getBrandMembers(nextBrandId),
          getBrandPermissionSettings(nextBrandId).catch(() => null),
        ]);
        syncMembersState(membersResult);
        setPermissionSettings(permissionResult);
        const [invitesResult, auditResult] = await Promise.all([
          membersResult.canManageMembers ? getBrandInvites(nextBrandId).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
          membersResult.canManageMembers
            ? getBrandRoleAuditLogs(nextBrandId).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
        ]);
        setInvites(invitesResult.items);
        setAuditLogs(auditResult.items);
      } else {
        setMembers([]);
        setInvites([]);
        setAuditLogs([]);
        setMyPendingInvites(myInviteResult.items);
        setCurrentUserRole("");
        setIsCurrentUserOwner(false);
        setCanManageMembers(false);
        setMemberRoleDrafts({});
        setMemberStatusDrafts({});
        setPermissionSettings(null);
      }
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setBrands([]);
      setMembers([]);
      setInvites([]);
      setAuditLogs([]);
      setMyPendingInvites([]);
      setCurrentBrandId("");
      setCurrentUserRole("");
      setIsCurrentUserOwner(false);
      setCanManageMembers(false);
      setPermissionSettings(null);
      setErrorMessage(error instanceof Error ? error.message : "团队协作页加载失败");
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
      setNotice("品牌工作区已切换，团队协作页已刷新到新的品牌上下文。");
      await loadTeamPage();
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
      router.replace("/?mode=login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "退出登录失败";
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSessionExpired() {
    await logoutSession();
    const nextPath = inviteCodeFromQuery
      ? `/personal-center/team?inviteCode=${encodeURIComponent(inviteCodeFromQuery)}`
      : "/personal-center/team";
    router.replace(buildPersonalCenterLoginPath(nextPath));
  }

  function syncMembersState(result: {
    items: BrandMemberRecord[];
    currentUserRole: BrandCollaboratorRole;
    isCurrentUserOwner: boolean;
    canManageMembers: boolean;
  }) {
    setMembers(result.items);
    setCurrentUserRole(result.currentUserRole);
    setIsCurrentUserOwner(result.isCurrentUserOwner);
    setCanManageMembers(result.canManageMembers);
    setMemberRoleDrafts(
      Object.fromEntries(result.items.map((item) => [item.id, item.role])),
    );
    setMemberStatusDrafts(
      Object.fromEntries(result.items.map((item) => [item.id, item.status])),
    );
  }

  async function handleAddMember() {
    if (!currentBrandId || !inviteAccount.trim()) {
      setErrorMessage("请输入要添加的成员账号");
      return;
    }

    setIsSubmittingInvite(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await addBrandMember(currentBrandId, {
        account: inviteAccount.trim(),
        role: inviteRole,
      });
      setInvites(result.items);
      setInviteAccount("");
      setInviteRole("STAFF");
      setNotice("已向该账号发出加入邀请，对方确认后才会加入团队。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "添加成员失败");
    } finally {
      setIsSubmittingInvite(false);
    }
  }

  async function handleSaveMember(memberId: string) {
    if (!currentBrandId) {
      return;
    }

    setSavingMemberId(memberId);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await updateBrandMember(currentBrandId, memberId, {
        role: memberRoleDrafts[memberId] as BrandCollaboratorRole | undefined,
        status: memberStatusDrafts[memberId] as "ACTIVE" | "DISABLED" | "REMOVED" | undefined,
      });
      syncMembersState(result);
      setNotice("成员角色或状态已更新。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "更新成员失败");
    } finally {
      setSavingMemberId("");
    }
  }

  async function handleCreateInvite() {
    if (!currentBrandId) {
      setErrorMessage("当前品牌未识别，暂无法创建邀请链接");
      return;
    }

    setIsSubmittingPendingInvite(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await createBrandInvite(currentBrandId, {
        role: pendingInviteRole,
        note: pendingInviteNote.trim() || undefined,
        expiresInDays: Number.parseInt(pendingInviteExpiresInDays, 10) || 7,
      });
      setInvites(result.items);
      setPendingInviteRole("STAFF");
      setPendingInviteNote("");
      setPendingInviteExpiresInDays("7");
      setNotice("邀请链接已生成，可直接发送给成员，对方确认后才会加入团队。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "创建邀请失败");
    } finally {
      setIsSubmittingPendingInvite(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!currentBrandId) {
      return;
    }

    setRevokingInviteId(inviteId);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await revokeBrandInvite(currentBrandId, inviteId);
      setInvites(result.items);
      setNotice("邀请已撤回。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "撤回邀请失败");
    } finally {
      setRevokingInviteId("");
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    setAcceptingInviteId(inviteId);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await acceptMyBrandInvite(inviteId);
      setNotice(`你已接受品牌邀请，已加入 ${result.brandName}。`);
      await loadTeamPage();
      if (result.brandId !== currentBrandId) {
        await handleBrandSwitch(result.brandId);
      }
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

  async function handleAcceptInviteCode() {
    const nextInviteCode = inviteCodeFromQuery.trim().toUpperCase();
    if (!nextInviteCode) {
      setErrorMessage("当前邀请链接无效，请重新打开邀请链接");
      return;
    }

    setIsAcceptingInviteCode(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await acceptMyBrandInviteByCode({ inviteCode: nextInviteCode });
      setNotice(`你已确认加入 ${result.brandName}。`);
      if (inviteCodeFromQuery) {
        router.replace("/personal-center/team");
      }
      await loadTeamPage();
      if (result.brandId !== currentBrandId) {
        await handleBrandSwitch(result.brandId);
      }
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "邀请链接加入失败");
    } finally {
      setIsAcceptingInviteCode(false);
    }
  }

  async function handleCopyInviteValue(inviteId: string, value: string, label: string) {
    if (!value) {
      return;
    }

    setCopyingInviteId(inviteId);
    setNotice("");
    setErrorMessage("");
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label}已复制，可直接发给成员。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `${label}复制失败`);
    } finally {
      setCopyingInviteId("");
    }
  }

  async function handleTransferOwner() {
    if (!currentBrandId || !ownerTransferMemberId) {
      setErrorMessage("请选择要接收主账号的成员");
      return;
    }

    setIsTransferringOwner(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await transferBrandOwner(currentBrandId, { memberId: ownerTransferMemberId });
      syncMembersState(result);
      setNotice("品牌主账号已转移，当前账号继续以管理员身份留在团队中。");
      const [inviteResult, auditResult] = await Promise.all([
        getBrandInvites(currentBrandId).catch(() => ({ items: [] })),
        getBrandRoleAuditLogs(currentBrandId).catch(() => ({ items: [] })),
      ]);
      setInvites(inviteResult.items);
      setAuditLogs(auditResult.items);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "主账号转移失败");
    } finally {
      setIsTransferringOwner(false);
    }
  }

  function handlePermissionToggle(
    role: Exclude<BrandCollaboratorRole, "ADMIN">,
    key: BrandPermissionKey,
    action: "view" | "edit",
    checked: boolean,
  ) {
    setPermissionSettings((current) => {
      if (!current) {
        return current;
      }

      const nextFlags = {
        ...current.permissionConfig[role][key],
        [action]: checked,
      };
      if (action === "view" && !checked) {
        nextFlags.edit = false;
      }
      if (action === "edit" && checked) {
        nextFlags.view = true;
      }

      return {
        ...current,
        permissionConfig: {
          ...current.permissionConfig,
          [role]: {
            ...current.permissionConfig[role],
            [key]: nextFlags,
          },
        },
      };
    });
  }

  async function handleSavePermissionSettings() {
    if (!currentBrandId || !permissionSettings?.canManagePermissions) {
      return;
    }

    setIsSavingPermissions(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await updateBrandPermissionSettings(currentBrandId, {
        permissionConfig: permissionSettings.permissionConfig,
      });
      setPermissionSettings(result);
      setNotice("员工和达人的权限模板已保存。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "权限模板保存失败");
    } finally {
      setIsSavingPermissions(false);
    }
  }

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );
  const ownerTransferCandidates = useMemo(
    () => members.filter((item) => !item.isOwner && !item.isCurrentUser && item.status === "ACTIVE"),
    [members],
  );

  useEffect(() => {
    setOwnerTransferMemberId((current) =>
      ownerTransferCandidates.some((item) => item.id === current) ? current : ownerTransferCandidates[0]?.id || "",
    );
  }, [ownerTransferCandidates]);

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>团队协作</h2>
          <p className="panel-subtext">当前团队角色已统一为管理员、员工、达人；管理员可管理成员并配置员工/达人在各板块的可见与编辑权限。</p>
        </div>
        <span>{brands.length} 个可访问品牌</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${errorMessage ? "status-pending" : "status-ready"}`}>
            {errorMessage ? "部分失败" : "成员接口已接入"}
          </span>
          {isLoading ? <span className="status-text">正在加载团队协作信息...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadTeamPage()} disabled={isLoading || isSwitchingBrand}>
          刷新信息
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
                {item.brandName} · {roleLabel(item.role)}
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
          <span>当前登录人</span>
          <strong>{userName || "未识别"}</strong>
          <p>{userId || "尚未获取到用户 ID"}</p>
        </article>
        <article className="metric-card">
          <span>当前品牌</span>
          <strong>{getBrandDisplayName(currentBrand, currentBrandId)}</strong>
          <p>{currentBrand?.industry || "行业待补充"}</p>
        </article>
        <article className="metric-card">
          <span>当前角色</span>
          <strong>{currentUserRole ? roleLabelMap[currentUserRole] : "未记录"}</strong>
          <p>团队协作角色已统一收口为管理员、员工、达人三类。</p>
        </article>
        <article className="metric-card">
          <span>成员管理权限</span>
          <strong>{canManageMembers ? "可管理" : "只读查看"}</strong>
          <p>{canManageMembers ? "当前管理员可继续邀请成员、调整角色并配置权限模板。" : "当前账号仅可查看团队与权限结果。"}</p>
        </article>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>我的待接受邀请</strong>
              <p className="personal-meta">当你的账号被邀请加入其他品牌时，可在这里直接接受。</p>
            </div>
            <span className={`archive-pill ${myPendingInvites.length ? "status-in_progress" : "status-ready"}`}>{myPendingInvites.length} 条</span>
          </div>
          <div className="personal-list">
            {myPendingInvites.length ? (
              myPendingInvites.map((item) => (
                <div key={item.id} style={{ display: "grid", gap: 6, padding: "10px 0", borderBottom: "1px solid rgba(148,163,184,0.18)" }}>
                  <strong>{item.brandName}</strong>
                  <span>邀请角色：{roleLabel(item.role)}</span>
                  <span>邀请账号：{item.inviteAccount}</span>
                  <span>邀请人：{item.invitedByName}</span>
                  <span>过期时间：{formatDateTime(item.expiresAt)}</span>
                  <div className="personal-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleAcceptInvite(item.id)}
                      disabled={acceptingInviteId === item.id}
                    >
                      {acceptingInviteId === item.id ? "接受中..." : "接受邀请"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>当前没有待你接受的品牌邀请。</p>
            )}
          </div>
        </article>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>当前阶段已可见内容</strong>
              <p className="personal-meta">当前团队协作页已切到“三角色 + 权限矩阵”的协作口径。</p>
            </div>
            <span className="archive-pill status-ready">P1</span>
          </div>
          <div className="personal-list">
            <p>当前品牌名称、行业和你的真实品牌角色已经可见。</p>
            <p>管理员拥有该品牌前端所有权限，并可继续邀请成员、调整角色和查看审计记录。</p>
            <p>员工和达人权限可按板块勾选设置，包含可见权限与编辑权限。</p>
          </div>
        </article>
        {inviteCodeFromQuery ? (
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>邀请链接加入品牌</strong>
              <p className="personal-meta">当前链接已携带邀请信息，确认后即可加入团队。</p>
            </div>
            <span className="archive-pill status-in_progress">待确认</span>
          </div>
          <div className="personal-actions" style={{ flexWrap: "wrap" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleAcceptInviteCode()}
              disabled={isAcceptingInviteCode}
            >
              {isAcceptingInviteCode ? "确认中..." : "同意加入团队"}
            </button>
          </div>
          <div className="personal-list">
            <p>点击确认后会写入品牌成员关系，并自动切到对应品牌工作区。</p>
            <p>当前已移除手动输入邀请码加入的入口。</p>
          </div>
        </article>
        ) : null}
      </div>

      {canManageMembers ? (
        <div className="card-grid" style={{ marginBottom: 16 }}>
          <article className="light-data-panel">
            <h3>直接添加成员</h3>
            <div className="personal-actions" style={{ flexWrap: "wrap" }}>
              <label className="field" style={{ minWidth: 240 }}>
                <span>成员账号</span>
                <input
                  value={inviteAccount}
                  onChange={(event) => setInviteAccount(event.target.value)}
                  placeholder="输入手机号 / 邮箱 / 昵称 / 用户 ID"
                />
              </label>
              <label className="field" style={{ minWidth: 180 }}>
                <span>初始角色</span>
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as BrandCollaboratorRole)}>
                  {buildAssignableRoleOptions(currentUserRole).map((item) => (
                    <option key={item} value={item}>
                      {roleLabelMap[item]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="primary-button" onClick={() => void handleAddMember()} disabled={isSubmittingInvite || isLoading}>
                {isSubmittingInvite ? "发送中..." : "发送加入邀请"}
              </button>
            </div>
            <p className="panel-subtext">适用于对方已经是平台注册用户的情况，系统会向对方发送邀请提醒，确认后才会加入当前品牌。</p>
          </article>

          <article className="light-data-panel">
            <h3>创建邀请链接</h3>
            <div className="personal-actions" style={{ flexWrap: "wrap" }}>
              <label className="field" style={{ minWidth: 160 }}>
                <span>邀请角色</span>
                <select
                  value={pendingInviteRole}
                  onChange={(event) => setPendingInviteRole(event.target.value as BrandCollaboratorRole)}
                >
                  {buildAssignableRoleOptions(currentUserRole).map((item) => (
                    <option key={item} value={item}>
                      {roleLabelMap[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ minWidth: 120 }}>
                <span>有效天数</span>
                <input value={pendingInviteExpiresInDays} onChange={(event) => setPendingInviteExpiresInDays(event.target.value)} placeholder="1-30" />
              </label>
            </div>
            <label className="field" style={{ marginTop: 12 }}>
              <span>邀请备注</span>
              <input
                value={pendingInviteNote}
                onChange={(event) => setPendingInviteNote(event.target.value)}
                placeholder="例如：负责品牌日常内容运营"
              />
            </label>
            <div className="personal-actions" style={{ marginTop: 12 }}>
              <button type="button" className="primary-button" onClick={() => void handleCreateInvite()} disabled={isSubmittingPendingInvite || isLoading}>
                {isSubmittingPendingInvite ? "生成中..." : "生成邀请链接"}
              </button>
            </div>
            <p className="panel-subtext">创建后只生成邀请链接，可直接复制发送；接收方点击链接并同意后，才会加入品牌团队。</p>
          </article>
        </div>
      ) : null}

      {isCurrentUserOwner ? (
        <article className="light-data-panel" style={{ marginBottom: 16 }}>
          <h3>品牌主账号转移</h3>
          <div className="personal-actions" style={{ flexWrap: "wrap" }}>
            <label className="field" style={{ minWidth: 260 }}>
              <span>接收成员</span>
              <select
                value={ownerTransferMemberId}
                onChange={(event) => setOwnerTransferMemberId(event.target.value)}
                disabled={!ownerTransferCandidates.length || isTransferringOwner}
              >
                {ownerTransferCandidates.length ? (
                  ownerTransferCandidates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nickname} · {roleLabel(item.role)}
                    </option>
                  ))
                ) : (
                  <option value="">暂无可转移成员</option>
                )}
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleTransferOwner()}
              disabled={!ownerTransferCandidates.length || !ownerTransferMemberId || isTransferringOwner}
            >
              {isTransferringOwner ? "转移中..." : "确认转移主账号"}
            </button>
          </div>
          <p className="panel-subtext">转移后，接收成员会成为品牌归属主账号；当前账号继续以管理员身份留在团队中，并写入审计日志。</p>
        </article>
      ) : null}

      {canManageMembers ? (
        <article className="light-data-panel" style={{ marginBottom: 16 }}>
          <h3>待处理邀请</h3>
          <table className="soft-table">
            <thead>
              <tr>
                <th>邀请对象</th>
                <th>邀请链接</th>
                <th>角色</th>
                <th>状态</th>
                <th>匹配用户</th>
                <th>邀请人</th>
                <th>创建时间</th>
                <th>过期时间</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((item) => (
                <tr key={item.id}>
                  <td>{item.inviteAccount}</td>
                  <td>
                    <div style={{ display: "grid", gap: 8 }}>
                      <a href={item.inviteLink} target="_blank" rel="noreferrer">
                        打开邀请链接
                      </a>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleCopyInviteValue(item.id, item.inviteLink, "邀请链接")}
                        disabled={copyingInviteId === item.id}
                      >
                        {copyingInviteId === item.id ? "复制中..." : "复制链接"}
                      </button>
                    </div>
                  </td>
                  <td>{roleLabel(item.role)}</td>
                  <td>{item.status}</td>
                  <td>{item.isMatchedUser ? (item.inviteeNickname || item.inviteeMobile || item.inviteeEmail || item.inviteeUserId) : "未匹配到现有用户"}</td>
                  <td>{item.invitedByName}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>{formatDateTime(item.expiresAt)}</td>
                  <td>{item.note || "无"}</td>
                  <td>
                    {item.status === "PENDING" ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleRevokeInvite(item.id)}
                        disabled={revokingInviteId === item.id}
                      >
                        {revokingInviteId === item.id ? "撤回中..." : "撤回"}
                      </button>
                    ) : (
                      <span>不可操作</span>
                    )}
                  </td>
                </tr>
              ))}
              {!invites.length ? (
                <tr>
                  <td colSpan={10}>当前品牌暂无待处理邀请</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      ) : null}

      {permissionSettings ? (
        <article className="light-data-panel" style={{ marginBottom: 16 }}>
          <div className="entity-card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>团队权限设置</h3>
              <p className="panel-subtext" style={{ marginTop: 8 }}>
                位置按需求放在“待处理邀请”和“当前品牌成员”之间。管理员默认拥有全部前端权限，以下仅配置员工与达人。
              </p>
            </div>
            <div className="personal-actions">
              <span className={`archive-pill ${permissionSettings.canManagePermissions ? "status-ready" : "status-paused"}`}>
                {permissionSettings.canManagePermissions ? "管理员可编辑" : "当前为只读"}
              </span>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSavePermissionSettings()}
                disabled={!permissionSettings.canManagePermissions || isSavingPermissions}
              >
                {isSavingPermissions ? "保存中..." : "保存权限设置"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {permissionSettings.permissionTree.map((section) => (
              <div key={section.key} className="entity-card personal-card">
                <div className="entity-card-head">
                  <div>
                    <strong>{section.label}</strong>
                    <p className="personal-meta">按项目配置员工和达人的可见权限、编辑权限。</p>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {section.groups.map((group) => (
                    <div key={group.key} style={{ display: "grid", gap: 8 }}>
                      <strong>{group.label}</strong>
                      <table className="soft-table">
                        <thead>
                          <tr>
                            <th>项目</th>
                            <th>员工可见</th>
                            <th>员工编辑</th>
                            <th>达人可见</th>
                            <th>达人编辑</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item) => (
                            <tr key={item.key}>
                              <td>{item.label}</td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={permissionSettings.permissionConfig.STAFF[item.key].view}
                                  onChange={(event) => handlePermissionToggle("STAFF", item.key, "view", event.target.checked)}
                                  disabled={!permissionSettings.canManagePermissions}
                                />
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={permissionSettings.permissionConfig.STAFF[item.key].edit}
                                  onChange={(event) => handlePermissionToggle("STAFF", item.key, "edit", event.target.checked)}
                                  disabled={!permissionSettings.canManagePermissions}
                                />
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={permissionSettings.permissionConfig.TALENT[item.key].view}
                                  onChange={(event) => handlePermissionToggle("TALENT", item.key, "view", event.target.checked)}
                                  disabled={!permissionSettings.canManagePermissions}
                                />
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={permissionSettings.permissionConfig.TALENT[item.key].edit}
                                  onChange={(event) => handlePermissionToggle("TALENT", item.key, "edit", event.target.checked)}
                                  disabled={!permissionSettings.canManagePermissions}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <article className="light-data-panel" style={{ marginBottom: 16 }}>
        <h3>当前品牌成员</h3>
        <table className="soft-table">
          <thead>
            <tr>
              <th>成员</th>
              <th>角色</th>
              <th>状态</th>
              <th>手机号</th>
              <th>邮箱</th>
              <th>加入时间</th>
              {canManageMembers ? <th>管理</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.nickname}
                  {item.isCurrentUser ? "（我）" : ""}
                  {item.isOwner ? " · 品牌主账号" : ""}
                </td>
                <td>{roleLabel(item.role)}</td>
                <td>{memberStatusLabels[item.status] || item.status}</td>
                <td>{item.mobile}</td>
                <td>{item.email || "未记录"}</td>
                <td>{formatDateTime(item.joinedAt)}</td>
                {canManageMembers ? (
                  <td>
                    {item.isOwner || item.isCurrentUser ? (
                      <span>当前版本不支持修改</span>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        <select
                          value={memberRoleDrafts[item.id] ?? item.role}
                          onChange={(event) => setMemberRoleDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                        >
                          {buildAssignableRoleOptions(currentUserRole).map((role) => (
                            <option key={role} value={role}>
                              {roleLabelMap[role]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={memberStatusDrafts[item.id] ?? item.status}
                          onChange={(event) => setMemberStatusDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                        >
                          {["ACTIVE", "DISABLED", "REMOVED"].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void handleSaveMember(item.id)}
                          disabled={savingMemberId === item.id}
                        >
                          {savingMemberId === item.id ? "保存中..." : "保存"}
                        </button>
                      </div>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
            {!members.length ? (
              <tr>
                <td colSpan={canManageMembers ? 7 : 6}>当前品牌暂无可展示的成员记录</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>

      {canManageMembers ? (
        <article className="light-data-panel" style={{ marginBottom: 16 }}>
          <h3>品牌成员审计日志</h3>
          <table className="soft-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>动作</th>
                <th>摘要</th>
                <th>操作人</th>
                <th>目标成员</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>{item.action}</td>
                  <td>{item.summary}</td>
                  <td>{item.operatorName}</td>
                  <td>{item.targetUserName || item.targetUserId || item.targetInviteId || "-"}</td>
                </tr>
              ))}
              {!auditLogs.length ? (
                <tr>
                  <td colSpan={5}>当前品牌暂无成员审计日志</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      ) : null}

      <div className="personal-actions">
        <Link href="/personal-center/tasks" className="primary-button">
          去任务中心
        </Link>
        <Link href="/personal-center" className="secondary-button">
          返回个人中心概览
        </Link>
      </div>
    </section>
  );
}

function buildAssignableRoleOptions(currentUserRole: BrandCollaboratorRole | "") {
  if (currentUserRole === "ADMIN") {
    return ["ADMIN", "STAFF", "TALENT"] as const;
  }
  return ["STAFF", "TALENT"] as const;
}

function roleLabel(role: string) {
  return formatCollaboratorRoleLabel(role);
}
