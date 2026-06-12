"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { readAuthSession } from "../../services/auth";
import { getMyBrandInvites, type BrandInviteRecord } from "../../services/brand-growth";
import { brandInviteReadStateChangedEvent, buildPersonalCenterLoginPath } from "./personal-center/route-helpers";

const primaryNavItems = [
  { href: "/brand-growth", label: "品牌增长策略", shortLabel: "策" },
  { href: "/xiaohongshu", label: "小红书", shortLabel: "红" },
  { href: "/douyin", label: "抖音", shortLabel: "抖" },
  { href: "/admin", label: "视频号", shortLabel: "视" },
  { href: "/wechat", label: "公众号", shortLabel: "公" },
  { href: "/admin", label: "私域", shortLabel: "私" },
  { href: "/more-features", label: "更多功能", shortLabel: "更" },
  { href: "/personal-center", label: "个人中心", shortLabel: "我" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hideTopbar = pathname === "/admin" || pathname.startsWith("/admin/");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [myPendingInvites, setMyPendingInvites] = useState<Array<BrandInviteRecord & { brandId: string; brandName: string }>>([]);
  const [dismissedInviteBanner, setDismissedInviteBanner] = useState(false);
  const [lastInviteSyncAt, setLastInviteSyncAt] = useState("");
  const [unreadPendingCount, setUnreadPendingCount] = useState(0);

  useEffect(() => {
    if (hideTopbar) {
      setIsAuthReady(true);
      return;
    }

    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      setIsAuthReady(false);
      router.replace(buildPersonalCenterLoginPath(pathname || "/personal-center"));
      return;
    }

    setIsAuthReady(true);
  }, [hideTopbar, pathname, router]);

  useEffect(() => {
    if (hideTopbar) {
      return;
    }

    let disposed = false;

    async function refreshInvites() {
      const session = readAuthSession();
      if (!session?.accessToken && !session?.refreshToken) {
        if (!disposed) {
          setMyPendingInvites([]);
          setLastInviteSyncAt("");
        }
        return;
      }

      const dismissedMarker = typeof window !== "undefined" ? window.sessionStorage.getItem("invite-banner-dismissed") : null;
      if (dismissedMarker === "1" && !disposed) {
        setDismissedInviteBanner(true);
      }

      try {
        const result = await getMyBrandInvites();
        if (disposed) {
          return;
        }
        setMyPendingInvites((previous) => {
          const previousSignature = previous.map((item) => `${item.id}:${item.status}`).join("|");
          const nextSignature = result.items.map((item) => `${item.id}:${item.status}`).join("|");
          if (previousSignature !== nextSignature && typeof window !== "undefined") {
            window.sessionStorage.removeItem("invite-banner-dismissed");
            setDismissedInviteBanner(false);
          }
          return result.items;
        });
        setUnreadPendingCount(result.items.filter((item) => item.isRead !== true).length);
        setLastInviteSyncAt(new Date().toISOString());
        if (!result.items.length && typeof window !== "undefined") {
          window.sessionStorage.removeItem("invite-banner-dismissed");
          setDismissedInviteBanner(false);
        }
      } catch {
        if (!disposed) {
          setMyPendingInvites([]);
          setUnreadPendingCount(0);
        }
      }
    }

    void refreshInvites();
    const timer = window.setInterval(() => {
      void refreshInvites();
    }, 60_000);
    const handleReadStateChanged = () => {
      void refreshInvites();
    };
    window.addEventListener(brandInviteReadStateChangedEvent, handleReadStateChanged);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener(brandInviteReadStateChangedEvent, handleReadStateChanged);
    };
  }, [hideTopbar, pathname]);

  const nextInviteHref = useMemo(() => {
    return myPendingInvites.length ? "/personal-center/invites" : "/personal-center/team";
  }, [myPendingInvites.length]);

  function handleDismissInviteBanner() {
    setDismissedInviteBanner(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("invite-banner-dismissed", "1");
    }
  }

  if (!hideTopbar && !isAuthReady) {
    return (
      <div className="dashboard-layout">
        <div className="dashboard-content">
          <div className="dashboard-shell">
            <section className="panel" style={{ marginTop: 24 }}>
              <div className="panel-header">
                <div>
                  <h2>正在校验登录状态</h2>
                  <p className="panel-subtext">前台工作台需要先完成统一账号登录，正在跳转到注册/登录入口。</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {hideTopbar ? null : (
        <>
          <header className="dashboard-topbar">
            <div className="dashboard-topbar-shell">
              <div className="dashboard-topbar-head">
                <Link href="/" className="dashboard-topbar-brand">
                  <span className="dashboard-topbar-brandmark">17</span>
                  <span className="dashboard-topbar-copy">
                    <strong>17ai.site</strong>
                    <span>品牌 / 门店全域运营工作台</span>
                  </span>
                </Link>
                <div className="dashboard-topbar-actions">
                  <Link href="/" className="dashboard-topbar-home-link">
                    返回首页
                  </Link>
                </div>
              </div>
              <nav className="dashboard-topnav" aria-label="主导航">
                {primaryNavItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={`${item.label}-${item.href}`}
                      href={item.href}
                      className={`dashboard-topnav-link ${isActive ? "is-active" : ""}`}
                    >
                      <span className="dashboard-topnav-badge">{item.shortLabel}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          {myPendingInvites.length && !dismissedInviteBanner ? (
            <div className="dashboard-notice-bar">
              <div className="dashboard-notice-bar-shell">
                <div className="dashboard-notice-copy">
                  <strong>你有 {myPendingInvites.length} 条待处理品牌邀请，其中未读 {unreadPendingCount} 条</strong>
                  <span>
                    最近一条来自 {myPendingInvites[0].brandName}，角色为 {myPendingInvites[0].role}。
                  </span>
                  {lastInviteSyncAt ? <span>自动刷新：{new Date(lastInviteSyncAt).toLocaleString("zh-CN")}</span> : null}
                </div>
                <div className="dashboard-notice-actions">
                  <Link href={nextInviteHref} className="primary-button">
                    立即处理邀请
                  </Link>
                  <button type="button" className="secondary-button" onClick={handleDismissInviteBanner}>
                    暂时收起
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
