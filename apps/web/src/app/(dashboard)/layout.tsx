"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const primaryNavItems = [
  { href: "/brand-growth", label: "品牌增长策略", shortLabel: "策" },
  { href: "/xiaohongshu", label: "小红书", shortLabel: "红" },
  { href: "/admin", label: "抖音", shortLabel: "抖" },
  { href: "/admin", label: "视频号", shortLabel: "视" },
  { href: "/admin", label: "公众号", shortLabel: "公" },
  { href: "/admin", label: "私域", shortLabel: "私" },
  { href: "/personal-center", label: "个人中心", shortLabel: "我" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideTopbar = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <div className="dashboard-layout">
      {hideTopbar ? null : (
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-shell">
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
      )}
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
