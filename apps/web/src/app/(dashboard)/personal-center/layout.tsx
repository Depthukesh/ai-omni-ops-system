"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

  return (
    <div className="dashboard-shell">
      <section className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <div>
            <h2>个人中心工作区</h2>
            <p className="panel-subtext">从单页聚合态切到可扩展的二级路由，当前已拆出任务、订单、团队和邀请等独立工作区。</p>
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
        <div className="card-grid" style={{ marginTop: 16 }}>
          {routeItems.map((item) => {
            const isActive = item.href === "/personal-center" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <article key={item.href} className="metric-card">
                <span>{item.label}</span>
                <strong>{isActive ? "当前页" : "可进入"}</strong>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>
      {children}
    </div>
  );
}
