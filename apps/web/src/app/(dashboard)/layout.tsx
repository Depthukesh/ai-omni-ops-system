"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const primaryNavItems = [
  { href: "/brand-growth", label: "品牌增长策略" },
  { href: "/xiaohongshu", label: "小红书" },
  { href: "/admin", label: "抖音" },
  { href: "/admin", label: "视频号" },
  { href: "/admin", label: "公众号" },
  { href: "/admin", label: "私域" },
  { href: "/personal-center", label: "个人中心" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="dashboard-layout">
      <header className="dashboard-topbar">
        <Link href="/" className="dashboard-brand-pill">
          LOGO
        </Link>
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
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
