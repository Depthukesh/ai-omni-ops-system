﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { changePassword, getMe, logout as logoutSession, readAuthSession, switchBrand, updateProfile, uploadProfileAvatar, type MeResponse } from "../../../../services/auth";
import { getLocalRuntimeSettings, updateLocalRuntimeSettings, type LocalRuntimeSettings } from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatCollaboratorRoleLabel, formatDateTime, isAuthFailure } from "../route-helpers";

type SecurityStatus = "SAFE" | "ATTENTION";

export default function PersonalCenterSecurityPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [systemRole, setSystemRole] = useState("USER");
  const [accountId, setAccountId] = useState("");
  const [accountNickname, setAccountNickname] = useState("");
  const [accountMobile, setAccountMobile] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [accountMembership, setAccountMembership] = useState("");
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [accessTokenPreview, setAccessTokenPreview] = useState("未记录");
  const [refreshTokenPreview, setRefreshTokenPreview] = useState("未记录");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingLocalRuntime, setIsSavingLocalRuntime] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "session">("session");
  const [localRuntimeSettings, setLocalRuntimeSettings] = useState<LocalRuntimeSettings | null>(null);
  const [localAppDataRootDraft, setLocalAppDataRootDraft] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmNextPassword, setConfirmNextPassword] = useState("");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/security"));
      return;
    }

    hydrateSessionSnapshot(session);
    void loadSecurityPage();
  }, [router]);

  function hydrateSessionSnapshot(session = readAuthSession()) {
    setHasAccessToken(Boolean(session?.accessToken));
    setHasRefreshToken(Boolean(session?.refreshToken));
    setAccessTokenPreview(maskToken(session?.accessToken));
    setRefreshTokenPreview(maskToken(session?.refreshToken));
    applyUserSnapshot(session?.user);
    hydrateProfileForm(session?.user);
  }

  function applyUserSnapshot(user?: MeResponse["user"]) {
    setSystemRole(user?.systemRole || "USER");
    setAccountId(user?.id || "");
    setAccountNickname(user?.nickname || "");
    setAccountMobile(user?.mobile || "");
    setAccountEmail(user?.email || "");
    setAccountAvatarUrl(user?.avatarUrl || "");
    setIsEmailVerified(Boolean(user?.emailVerified));
    setAccountMembership(user?.membership || "");
  }

  function hydrateProfileForm(user?: MeResponse["user"]) {
    setFormNickname(user?.nickname || "");
    setFormMobile(user?.mobile || "");
    setFormAvatarUrl(user?.avatarUrl || "");
  }

  async function loadSecurityPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const session = readAuthSession();
    hydrateSessionSnapshot(session);

    const meResult = await Promise.resolve(getMe()).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason }),
    );

    if (meResult.status === "rejected" && isAuthFailure(meResult.reason)) {
      await handleSessionExpired();
      return;
    }

    if (meResult.status === "fulfilled") {
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
      applyUserSnapshot(meResult.value.user);
      hydrateProfileForm(meResult.value.user);
      setDataSource("api");
    } else {
      setBrands(session?.brands || []);
      setCurrentBrandId(session?.currentBrandId || session?.brands?.[0]?.id || "");
      setDataSource("session");
      setErrorMessage("安全中心当前无法刷新账号信息，页面先展示浏览器中已保存的登录状态快照。");
    }

    const localRuntimeResult = await Promise.resolve(getLocalRuntimeSettings()).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason }),
    );

    if (localRuntimeResult.status === "fulfilled") {
      setLocalRuntimeSettings(localRuntimeResult.value);
      setLocalAppDataRootDraft(localRuntimeResult.value.configuredLocalAppRoot);
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
      hydrateSessionSnapshot(readAuthSession());
      setBrands(result.brands);
      setCurrentBrandId(result.currentBrandId || nextBrandId);
      setNotice("品牌工作区已切换，安全中心已刷新当前上下文。");
      await loadSecurityPage();
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
    router.replace(buildPersonalCenterLoginPath("/personal-center/security"));
  }

  async function handleAvatarUpload(file: File | null) {
    if (!file) {
      return;
    }
    setIsUploadingAvatar(true);
    setNotice("");
    setErrorMessage("");
    try {
      const uploaded = await uploadProfileAvatar(file);
      setFormAvatarUrl(uploaded.avatarUrl);
      setNotice("头像已上传到 OSS，保存账号资料后即可正式生效。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "头像上传失败";
      setErrorMessage(`头像上传失败：${message}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formNickname.trim()) {
      setErrorMessage("请输入用户名");
      return;
    }
    if (!/^1\d{10}$/.test(formMobile.trim())) {
      setErrorMessage("请输入正确的手机号");
      return;
    }
    if (formAvatarUrl.trim() && !/^https?:\/\/|^\//.test(formAvatarUrl.trim())) {
      setErrorMessage("头像地址需使用 http(s) 链接或站内路径");
      return;
    }

    setIsSavingProfile(true);
    setNotice("");
    setErrorMessage("");
    try {
      const updated = await updateProfile({
        nickname: formNickname.trim(),
        mobile: formMobile.trim(),
        avatarUrl: formAvatarUrl.trim() || undefined,
      });
      applyUserSnapshot(updated);
      hydrateProfileForm(updated);
      setDataSource("api");
      setNotice("账号资料已保存，个人中心已同步更新。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "保存账号资料失败";
      setErrorMessage(`保存失败：${message}`);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword) {
      setErrorMessage("请输入当前密码");
      return;
    }
    if (!nextPassword) {
      setErrorMessage("请输入新密码");
      return;
    }
    if (nextPassword.length < 6) {
      setErrorMessage("新密码至少 6 位");
      return;
    }
    if (nextPassword !== confirmNextPassword) {
      setErrorMessage("两次输入的新密码不一致");
      return;
    }
    if (currentPassword === nextPassword) {
      setErrorMessage("新密码不能与当前密码相同");
      return;
    }

    setIsChangingPassword(true);
    setNotice("");
    setErrorMessage("");
    try {
      await changePassword({
        currentPassword,
        nextPassword,
      });
      setCurrentPassword("");
      setNextPassword("");
      setConfirmNextPassword("");
      setNotice("密码已修改，请使用新密码进行后续登录。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "修改密码失败";
      setErrorMessage(`修改密码失败：${message}`);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleSaveLocalRuntime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!localRuntimeSettings?.supported) {
      return;
    }

    setIsSavingLocalRuntime(true);
    setNotice("");
    setErrorMessage("");
    try {
      const nextSettings = await updateLocalRuntimeSettings({
        localAppDataRoot: localAppDataRootDraft.trim() || null,
      });
      setLocalRuntimeSettings(nextSettings);
      setLocalAppDataRootDraft(nextSettings.configuredLocalAppRoot);
      setNotice(nextSettings.message);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "保存本地资料目录失败";
      setErrorMessage(`保存本地资料目录失败：${message}`);
    } finally {
      setIsSavingLocalRuntime(false);
    }
  }

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );
  const securityChecks = useMemo(
    () => [
      {
        label: "访问凭证状态",
        value: hasAccessToken ? "已保存" : "未保存",
        detail: "用于当前登录会话访问接口，页面会自动带上登录凭证。",
        status: hasAccessToken ? ("SAFE" as SecurityStatus) : ("ATTENTION" as SecurityStatus),
      },
      {
        label: "续期凭证状态",
        value: hasRefreshToken ? "已保存" : "未保存",
        detail: "当登录状态快过期时，前端会尝试自动续期，减少频繁重新登录。",
        status: hasRefreshToken ? ("SAFE" as SecurityStatus) : ("ATTENTION" as SecurityStatus),
      },
      {
        label: "当前品牌上下文",
        value: currentBrand?.brandName || "未绑定品牌",
        detail: "你当前查看和操作的个人中心内容，会跟随当前品牌工作区一起刷新。",
        status: currentBrand ? ("SAFE" as SecurityStatus) : ("ATTENTION" as SecurityStatus),
      },
      {
        label: "邮箱验证状态",
        value: isEmailVerified ? "已验证" : "未验证",
        detail: isEmailVerified ? "当前邮箱已经通过注册验证。" : "当前邮箱还未完成验证，后续需要补充邮箱改绑与再次验证流程。",
        status: isEmailVerified ? ("SAFE" as SecurityStatus) : ("ATTENTION" as SecurityStatus),
      },
    ],
    [currentBrand, hasAccessToken, hasRefreshToken, isEmailVerified],
  );
  const avatarFallback = (accountNickname || accountEmail || "U").trim().slice(0, 1).toUpperCase();
  const previewAvatarUrl = formAvatarUrl.trim() || accountAvatarUrl;

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>账号资料与安全设置</h2>
          <p className="panel-subtext">在这里统一维护账号资料、密码和当前登录状态，减少你在多个页面之间来回查找。</p>
        </div>
        <span>{securityChecks.filter((item) => item.status === "SAFE").length} 项正常</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
            {dataSource === "api" ? "账号接口 + 本地会话" : "仅本地会话"}
          </span>
          {isLoading ? <span className="status-text">正在加载安全中心数据...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadSecurityPage()} disabled={isLoading || isSwitchingBrand}>
          刷新安全状态
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
          {isLoggingOut ? "退出中..." : "退出当前登录态"}
        </button>
      </div>

      <div className="personal-context-banner">
        <div>
          <strong>账号资料、密码和登录状态都集中在这里维护</strong>
          <p>如果只是更新昵称、头像或手机号，先处理资料卡片；如果是担心账号安全，再优先检查密码和登录凭证状态。</p>
        </div>
        <div className="personal-context-actions">
          <Link href="/personal-center" className="secondary-button">
            返回个人中心概览
          </Link>
          <Link href="/login" className="secondary-button">
            回到登录页
          </Link>
        </div>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        {securityChecks.map((item) => (
          <article className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="personal-list">
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>编辑账号资料</strong>
              <p className="personal-meta">当前支持自助维护用户名、头像地址和手机号；邮箱暂时保持只读，避免误改后影响现有登录验证。</p>
            </div>
            <span className="archive-pill status-ready">可编辑</span>
          </div>
          <div className="profile-editor-layout">
            <div className="profile-avatar-panel">
              {previewAvatarUrl ? (
                <img className="profile-avatar-preview" src={previewAvatarUrl} alt={`${accountNickname || "用户"}头像`} />
              ) : (
                <div className="profile-avatar-fallback">{avatarFallback}</div>
              )}
              <div className="personal-actions personal-actions--tight" style={{ width: "100%" }}>
                <label className="secondary-button product-upload-trigger">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only-file-input"
                    onChange={(event) => {
                      void handleAvatarUpload(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  {isUploadingAvatar ? "头像上传中..." : "上传头像"}
                </label>
              </div>
              <div className="personal-grid">
                <div>
                  <span>账号 ID</span>
                  <strong>{accountId || "未记录"}</strong>
                </div>
                <div>
                  <span>系统角色</span>
                  <strong>{systemRole}</strong>
                </div>
                <div>
                  <span>邮箱</span>
                  <strong>{accountEmail || "未记录"}</strong>
                </div>
                <div>
                  <span>邮箱状态</span>
                  <strong>{isEmailVerified ? "已验证" : "未验证"}</strong>
                </div>
                <div>
                  <span>会员等级</span>
                  <strong>{accountMembership || "未记录"}</strong>
                </div>
                <div>
                  <span>当前品牌</span>
                  <strong>{currentBrand?.brandName || "未记录"}</strong>
                </div>
              </div>
            </div>
            <form className="form-grid two-column" onSubmit={handleSaveProfile}>
              <label className="field">
                <span>用户名</span>
                <input value={formNickname} onChange={(event) => setFormNickname(event.target.value)} placeholder="请输入用户名" maxLength={32} />
              </label>
              <label className="field">
                <span>手机号</span>
                <input value={formMobile} onChange={(event) => setFormMobile(event.target.value)} placeholder="请输入 11 位手机号" />
              </label>
              <label className="field field-full">
                <span>头像地址</span>
                <input value={formAvatarUrl} onChange={(event) => setFormAvatarUrl(event.target.value)} placeholder="支持 http(s) 链接或站内路径；留空则清除头像" />
              </label>
              <label className="field">
                <span>邮箱</span>
                <input value={accountEmail} disabled />
              </label>
              <label className="field">
                <span>邮箱改绑</span>
                <input value="当前未开放，后续可接邮箱再次验证流程" disabled />
              </label>
              <div className="personal-actions personal-actions--tight field-full">
                <button type="button" className="secondary-button" onClick={() => hydrateProfileForm(readAuthSession()?.user)} disabled={isSavingProfile}>
                  重置输入
                </button>
                <button type="submit" className="primary-button" disabled={isSavingProfile || isUploadingAvatar}>
                  {isSavingProfile ? "保存中..." : "保存账号资料"}
                </button>
              </div>
            </form>
          </div>
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>登录凭证状态</strong>
              <p className="personal-meta">这里只展示浏览器中是否已保存当前登录凭证，以及脱敏后的摘要，不会直接暴露完整内容。</p>
            </div>
            <span className="archive-pill status-in_progress">脱敏显示</span>
          </div>
          <div className="personal-grid">
            <div>
              <span>Access Token</span>
              <strong className="mono-text">{accessTokenPreview}</strong>
            </div>
            <div>
              <span>Refresh Token</span>
              <strong className="mono-text">{refreshTokenPreview}</strong>
            </div>
            <div>
              <span>自动续期</span>
              <strong>{hasRefreshToken ? "已启用自动续期" : "当前不可用"}</strong>
            </div>
            <div>
              <span>退出登录</span>
              <strong>退出后会同步清空当前浏览器里的登录状态</strong>
            </div>
          </div>
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>密码修改</strong>
              <p className="personal-meta">当前支持输入旧密码并设置新密码，适合作为个人中心安全设置的基础入口。</p>
            </div>
            <span className="archive-pill status-ready">已接入</span>
          </div>
          <form className="form-grid two-column" onSubmit={handleChangePassword}>
            <label className="field">
                <span>当前密码</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="请输入当前密码"
                autoComplete="current-password"
              />
            </label>
            <label className="field">
                <span>新密码</span>
              <input
                type="password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
            </label>
            <label className="field field-full">
                <span>确认新密码</span>
              <input
                type="password"
                value={confirmNextPassword}
                onChange={(event) => setConfirmNextPassword(event.target.value)}
                placeholder="请再次输入新密码"
                autoComplete="new-password"
              />
            </label>
            <div className="personal-actions personal-actions--tight field-full">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setCurrentPassword("");
                  setNextPassword("");
                  setConfirmNextPassword("");
                }}
                disabled={isChangingPassword}
              >
                  清空输入
              </button>
              <button type="submit" className="primary-button" disabled={isChangingPassword}>
                {isChangingPassword ? "修改中..." : "修改密码"}
              </button>
            </div>
          </form>
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>本地单机版注册与资料目录</strong>
              <p className="personal-meta">这里统一查看当前安装态的注册准入规则和资料目录设置。目录改动会在下次重启本地工作台时生效。</p>
            </div>
            <span className="archive-pill status-ready">安装态设置</span>
          </div>
          <div className="personal-grid">
            <div>
              <span>当前运行模式</span>
              <strong>{localRuntimeSettings?.runtimeMode || "未获取"}</strong>
            </div>
            <div>
              <span>注册准入</span>
              <strong>{localRuntimeSettings?.inviteCodeRequired ? "邀请码准入" : "开放注册"}</strong>
            </div>
            <div className="field-full">
              <span>当前资料目录</span>
              <strong className="mono-text">{localRuntimeSettings?.currentLocalAppRoot || "未获取"}</strong>
            </div>
            <div className="field-full">
              <span>下次启动将使用</span>
              <strong className="mono-text">{localRuntimeSettings?.configuredLocalAppRoot || "未获取"}</strong>
            </div>
            <div className="field-full">
              <span>设置文件</span>
              <strong className="mono-text">{localRuntimeSettings?.settingsFilePath || "未获取"}</strong>
            </div>
            <div>
              <span>数据库</span>
              <strong className="mono-text">{localRuntimeSettings?.paths.dbPath || "未获取"}</strong>
            </div>
            <div>
              <span>存储目录</span>
              <strong className="mono-text">{localRuntimeSettings?.paths.storageRoot || "未获取"}</strong>
            </div>
            <div>
              <span>日志目录</span>
              <strong className="mono-text">{localRuntimeSettings?.paths.logsRoot || "未获取"}</strong>
            </div>
            <div>
              <span>重启要求</span>
              <strong>{localRuntimeSettings?.restartRequired ? "需要重启生效" : "当前已生效"}</strong>
            </div>
          </div>
          {localRuntimeSettings?.supported ? (
            <form className="form-grid" onSubmit={handleSaveLocalRuntime} style={{ marginTop: 16 }}>
              <label className="field field-full">
                <span>本地资料目录</span>
                <input
                  value={localAppDataRootDraft}
                  onChange={(event) => setLocalAppDataRootDraft(event.target.value)}
                  placeholder="例如 D:\\AiOmniOpsData"
                />
              </label>
              <p className="field-hint">
                保存后不会立刻中断当前会话；下次重启本地工作台时，会把数据库、存储、日志、缓存和升级目录统一切到新根目录。
              </p>
              {localRuntimeSettings.pendingMigrationFrom ? (
                <p className="field-hint">待迁移旧目录：`{localRuntimeSettings.pendingMigrationFrom}`</p>
              ) : null}
              <div className="personal-actions personal-actions--tight field-full">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setLocalAppDataRootDraft(localRuntimeSettings.defaultLocalAppRoot)}
                  disabled={isSavingLocalRuntime}
                >
                  恢复默认目录
                </button>
                <button type="submit" className="primary-button" disabled={isSavingLocalRuntime}>
                  {isSavingLocalRuntime ? "保存中..." : "保存资料目录设置"}
                </button>
              </div>
            </form>
          ) : (
            <p className="field-hint">当前不是 local-single-user 安装态，这里只展示本地资料目录设置说明，不开放修改。</p>
          )}
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>下一阶段安全能力</strong>
              <p className="personal-meta">密码修改已经就绪，下面这些能力会在后续迭代里继续补齐。</p>
            </div>
            <span className="archive-pill status-paused">待扩展</span>
          </div>
          <div className="personal-grid">
            <div>
              <span>多端设备管理</span>
              <strong>未接入</strong>
            </div>
            <div>
              <span>会话列表</span>
              <strong>未接入</strong>
            </div>
            <div>
              <span>单端下线</span>
              <strong>未接入</strong>
            </div>
            <div>
              <span>邮箱改绑验证</span>
              <strong>未接入</strong>
            </div>
            <div className="field-full">
              <span>后续建议</span>
              <strong>优先补齐设备会话管理、单端下线和邮箱改绑验证，再把安全中心升级成更完整的账号中心。</strong>
            </div>
            <div className="field-full">
              <span>本次已验证</span>
              <strong>{formatDateTime(new Date().toISOString())} 前端安全页已通过构建验证并纳入个人中心二级路由。</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function maskToken(value?: string) {
  if (!value) {
    return "未记录";
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
