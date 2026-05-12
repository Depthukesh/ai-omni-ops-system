"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../services/auth";
import { buildPersonalCenterLoginPath, getBrandDisplayName, isAuthFailure } from "./route-helpers";

const routeItems = [
  {
    href: "/personal-center",
    label: "概览",
    description: "查看个人信息、订单、点数与作品总览",
  },
  {
    href: "/personal-center/tasks",
    label: "任务中心",
    description: "查看当前用户的所有大模型任务与执行状态",
  },
  {
    href: "/personal-center/orders",
    label: "订单中心",
    description: "查看会员订单、点数充值记录和当前订单状态",
  },
  {
    href: "/personal-center/works",
    label: "作品中心",
    description: "查看当前用户沉淀的作品资产，并回跳到相关工作台继续处理",
  },
  {
    href: "/personal-center/skills",
    label: "技能中心",
    description: "查看当前账号可使用的平台技能基线，并为后续个人覆盖层预留入口",
  },
  {
    href: "/personal-center/security",
    label: "安全设置",
    description: "查看当前浏览器登录态、品牌上下文与退出入口，并为后续密码与会话管理预留位置",
  },
  {
    href: "/personal-center/team",
    label: "团队协作",
    description: "查看当前品牌、协作角色和品牌成员管理入口",
  },
  {
    href: "/personal-center/invites",
    label: "邀请通知",
    description: "统一查看待处理、已接受、已过期和已撤回的品牌邀请",
  },
];

export default function PersonalCenterLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "session">("session");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath(pathname || "/personal-center"));
      return;
    }

    void loadWorkspaceAccount();
  }, [pathname, router]);

  async function loadWorkspaceAccount() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const session = readAuthSession();
    const meResult = await Promise.resolve(getMe()).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason }),
    );

    if (meResult.status === "rejected" && isAuthFailure(meResult.reason)) {
      await logoutSession();
      router.replace(buildPersonalCenterLoginPath(pathname || "/personal-center"));
      return;
    }

    if (meResult.status === "fulfilled") {
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
      setDataSource("api");
    } else {
      setBrands(session?.brands || []);
      setCurrentBrandId(session?.currentBrandId || session?.brands?.[0]?.id || "");
      setDataSource("session");
      setErrorMessage("账号信息暂时未从接口刷新，当前展示浏览器中已保存的登录态。");
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
      setBrands(result.brands);
      setCurrentBrandId(result.currentBrandId || nextBrandId);
      setNotice("品牌工作区已切换。");
      window.location.assign(pathname || "/personal-center");
    } catch (error) {
      if (isAuthFailure(error)) {
        await logoutSession();
        router.replace(buildPersonalCenterLoginPath(pathname || "/personal-center"));
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

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  return (
    <div className="dashboard-shell">
      <section className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <div>
            <h2>个人中心工作区</h2>
            <p className="panel-subtext">从单页聚合态切到可扩展的二级路由，当前已拆出任务、订单、作品、技能、安全、团队和邀请等独立工作区。</p>
          </div>
          <div className="personal-center-workspace-meta">
            <div className="workspace-status">
              <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
                {dataSource === "api" ? "接口数据" : "本地登录态"}
              </span>
              {isLoading ? <span className="status-text">正在加载账号信息...</span> : null}
              {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
              {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
            </div>
            <div className="personal-actions personal-actions--tight">
              <button type="button" className="secondary-button" onClick={() => void loadWorkspaceAccount()} disabled={isLoading || isSwitchingBrand}>
                刷新
              </button>
              <label className="field personal-center-workspace-field">
                <span>当前品牌</span>
                <select
                  value={currentBrandId}
                  onChange={(event) => void handleBrandSwitch(event.target.value)}
                  disabled={!brands.length || isLoading || isSwitchingBrand || isLoggingOut}
                >
                  {brands.length ? (
                    brands.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.brandName} · {item.role}
                      </option>
                    ))
                  ) : (
                    <option value="">{getBrandDisplayName(currentBrand, currentBrandId)}</option>
                  )}
                </select>
              </label>
              <button type="button" className="secondary-button" onClick={() => void handleLogout()} disabled={isLoggingOut || isSwitchingBrand}>
                {isLoggingOut ? "退出中..." : "退出登录"}
              </button>
            </div>
          </div>
        </div>
        <div className="tab-switcher" aria-label="个人中心二级导航">
          {routeItems.map((item) => {
            const isActive = item.href === "/personal-center" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`tab-button ${isActive ? "is-active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>
      {children}
    </div>
  );
}
