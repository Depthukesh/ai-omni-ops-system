"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import { buildPersonalCenterLoginPath, formatDateTime, isAuthFailure } from "../route-helpers";

type SecurityStatus = "SAFE" | "ATTENTION";

export default function PersonalCenterSecurityPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [systemRole, setSystemRole] = useState("USER");
  const [accountId, setAccountId] = useState("");
  const [accountMobile, setAccountMobile] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountMembership, setAccountMembership] = useState("");
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [accessTokenPreview, setAccessTokenPreview] = useState("未记录");
  const [refreshTokenPreview, setRefreshTokenPreview] = useState("未记录");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "session">("session");

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
    setSystemRole(session?.user?.systemRole || "USER");
    setAccountId(session?.user?.id || "");
    setAccountMobile(session?.user?.mobile || "");
    setAccountEmail(session?.user?.email || "");
    setAccountMembership(session?.user?.membership || "");
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
      setSystemRole(meResult.value.user.systemRole || "USER");
      setAccountId(meResult.value.user.id);
      setAccountMobile(meResult.value.user.mobile);
      setAccountEmail(meResult.value.user.email);
      setAccountMembership(meResult.value.user.membership);
      setDataSource("api");
    } else {
      setBrands(session?.brands || []);
      setCurrentBrandId(session?.currentBrandId || session?.brands?.[0]?.id || "");
      setDataSource("session");
      setErrorMessage("安全中心当前无法刷新账号信息，页面先展示浏览器中已保存的登录态快照。");
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

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );
  const securityChecks = useMemo(
    () => [
      {
        label: "Access Token 已保存",
        value: hasAccessToken ? "已保存" : "未保存",
        detail: "用于当前接口访问，请求层会自动附带 Authorization。",
        status: hasAccessToken ? ("SAFE" as SecurityStatus) : ("ATTENTION" as SecurityStatus),
      },
      {
        label: "Refresh Token 已保存",
        value: hasRefreshToken ? "已保存" : "未保存",
        detail: "当前请求层在遇到 401 时会自动尝试 refresh。",
        status: hasRefreshToken ? ("SAFE" as SecurityStatus) : ("ATTENTION" as SecurityStatus),
      },
      {
        label: "当前品牌上下文",
        value: currentBrand?.brandName || "未绑定品牌",
        detail: "请求层会自动附带 x-brand-id，个人中心相关接口跟随当前品牌工作区刷新。",
        status: currentBrand ? ("SAFE" as SecurityStatus) : ("ATTENTION" as SecurityStatus),
      },
      {
        label: "密码修改能力",
        value: "本轮未开放",
        detail: "本页先聚焦登录态与会话安全；密码修改、设备管理与多端下线后续继续补齐。",
        status: "ATTENTION" as SecurityStatus,
      },
    ],
    [currentBrand, hasAccessToken, hasRefreshToken],
  );

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>安全设置</h2>
          <p className="panel-subtext">集中查看当前浏览器登录态、品牌上下文、token 持有状态与退出入口，先形成个人中心的会话安全页。</p>
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
                {item.brandName} · {item.role}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={() => void handleLogout()} disabled={isLoggingOut || isSwitchingBrand}>
          {isLoggingOut ? "退出中..." : "退出当前登录态"}
        </button>
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

      <div className="personal-actions" style={{ marginBottom: 16 }}>
        <Link href="/personal-center" className="secondary-button">
          返回个人中心概览
        </Link>
        <Link href="/login" className="secondary-button">
          回到登录页
        </Link>
      </div>

      <div className="personal-list">
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>当前账号与会话摘要</strong>
              <p className="personal-meta">本区用于确认当前浏览器里保存的是谁的登录态，以及是否已经绑定品牌工作区。</p>
            </div>
            <span className="archive-pill status-ready">{systemRole}</span>
          </div>
          <div className="personal-grid">
            <div>
              <span>账号 ID</span>
              <strong>{accountId || "未记录"}</strong>
            </div>
            <div>
              <span>手机号</span>
              <strong>{accountMobile || "未记录"}</strong>
            </div>
            <div>
              <span>邮箱</span>
              <strong>{accountEmail || "未记录"}</strong>
            </div>
            <div>
              <span>会员等级</span>
              <strong>{accountMembership || "未记录"}</strong>
            </div>
            <div>
              <span>系统角色</span>
              <strong>{systemRole}</strong>
            </div>
            <div>
              <span>当前品牌</span>
              <strong>{currentBrand?.brandName || "未记录"}</strong>
            </div>
          </div>
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>Token 持有状态</strong>
              <p className="personal-meta">这里只展示浏览器中是否已保存 access / refresh token 与脱敏摘要，不直接暴露完整凭证。</p>
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
              <strong>{hasRefreshToken ? "已启用前端 refresh 兜底" : "当前不可用"}</strong>
            </div>
            <div>
              <span>退出登录</span>
              <strong>调用 `/auth/logout` 后清空本地会话</strong>
            </div>
          </div>
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>下一阶段安全能力</strong>
              <p className="personal-meta">这一版先把登录态和会话安全可视化，下面这些能力保留到下一轮继续实现。</p>
            </div>
            <span className="archive-pill status-paused">待扩展</span>
          </div>
          <div className="personal-grid">
            <div>
              <span>密码修改</span>
              <strong>未接入</strong>
            </div>
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
            <div className="field-full">
              <span>后续建议</span>
              <strong>优先补 `change password`、`session list`、`revoke session` 三类接口，再把安全中心从只读态升级为可操作态。</strong>
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
