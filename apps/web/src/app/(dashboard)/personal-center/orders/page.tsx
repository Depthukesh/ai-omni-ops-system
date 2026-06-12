"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import { getOrders, orderSeed, type OrderRecord } from "../../../../services/personal-center";
import {
  buildPersonalCenterLoginPath,
  formatCollaboratorRoleLabel,
  formatDateTime,
  isAuthFailure,
  personalOrderStatusClassMap,
} from "../route-helpers";

type OrderStatusFilter = "ALL" | OrderRecord["orderStatus"];
type OrderTypeFilter = "ALL" | "MEMBERSHIP_PURCHASE" | "POINTS_RECHARGE";

const orderStatusFilters: Array<{ key: OrderStatusFilter; label: string }> = [
  { key: "ALL", label: "全部状态" },
  { key: "PENDING", label: "待支付" },
  { key: "PAID", label: "已支付" },
  { key: "FAILED", label: "失败" },
  { key: "REFUNDED", label: "已退款" },
  { key: "CANCELLED", label: "已取消" },
];

const orderTypeFilters: Array<{ key: OrderTypeFilter; label: string }> = [
  { key: "ALL", label: "全部类型" },
  { key: "MEMBERSHIP_PURCHASE", label: "会员订单" },
  { key: "POINTS_RECHARGE", label: "点数充值" },
];

export default function PersonalCenterOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRecord[]>(orderSeed);
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed">("seed");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/orders"));
      return;
    }

    void loadOrdersPage();
  }, [router]);

  async function loadOrdersPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [meResult, ordersResult] = await Promise.allSettled([getMe(), getOrders()]);

    if (meResult.status === "rejected" && isAuthFailure(meResult.reason)) {
      await handleSessionExpired();
      return;
    }

    if (meResult.status === "fulfilled") {
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
    } else {
      setBrands([]);
      setCurrentBrandId("");
    }

    if (ordersResult.status === "fulfilled") {
      setOrders(ordersResult.value);
      setDataSource(meResult.status === "fulfilled" ? "api" : "seed");
    } else {
      setOrders(orderSeed);
      setDataSource("seed");
      setErrorMessage("订单接口暂时不可用，当前展示的是本地演示订单数据。");
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
      setNotice("品牌工作区已切换，订单中心已刷新当前上下文。");
      await loadOrdersPage();
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
    router.replace(buildPersonalCenterLoginPath("/personal-center/orders"));
  }

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...orders]
      .sort(sortByOrderUpdatedAtDesc)
      .filter((item) => statusFilter === "ALL" || item.orderStatus === statusFilter)
      .filter((item) => typeFilter === "ALL" || item.orderType === typeFilter)
      .filter((item) =>
        !keyword
          || item.orderNo.toLowerCase().includes(keyword)
          || item.orderType.toLowerCase().includes(keyword)
          || item.orderStatus.toLowerCase().includes(keyword)
          || (item.membership ?? "").toLowerCase().includes(keyword)
          || String(item.pointsAmount ?? "").includes(keyword),
      );
  }, [orders, search, statusFilter, typeFilter]);

  const summary = useMemo(
    () => ({
      total: filteredOrders.length,
      paid: filteredOrders.filter((item) => item.orderStatus === "PAID").length,
      pending: filteredOrders.filter((item) => item.orderStatus === "PENDING").length,
      membershipOrders: filteredOrders.filter((item) => item.orderType === "MEMBERSHIP_PURCHASE").length,
      rechargeOrders: filteredOrders.filter((item) => item.orderType === "POINTS_RECHARGE").length,
      totalAmount: filteredOrders.reduce((sum, item) => sum + item.amountYuan, 0),
    }),
    [filteredOrders],
  );

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>订单中心</h2>
          <p className="panel-subtext">集中查看当前账号的会员订单与点数充值记录，方便你核对消费、补单进度和最近的充值情况。</p>
        </div>
        <span>{summary.total} 笔订单</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
            {dataSource === "api" ? "接口数据" : "演示数据"}
          </span>
          {isLoading ? <span className="status-text">正在加载订单中心数据...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadOrdersPage()} disabled={isLoading || isSwitchingBrand}>
          刷新订单
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
          {isLoggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <article className="metric-card">
          <span>当前品牌上下文</span>
          <strong>{currentBrand?.brandName || "未绑定品牌"}</strong>
          <p>当前订单列表按登录账号过滤，品牌维度的更细归属会在后续账单域继续补齐。</p>
        </article>
        <article className="metric-card">
          <span>已支付</span>
          <strong>{summary.paid}</strong>
          <p>包含会员购买成功和点数到账的订单。</p>
        </article>
        <article className="metric-card">
          <span>待支付</span>
          <strong>{summary.pending}</strong>
          <p>可继续进入订单详情页查看状态或模拟支付。</p>
        </article>
        <article className="metric-card">
          <span>筛选金额汇总</span>
          <strong>{summary.totalAmount.toFixed(2)} 元</strong>
          <p>按当前筛选条件汇总，便于快速查看最近消费情况。</p>
        </article>
      </div>

      <div className="personal-context-banner">
        <div>
          <strong>先筛状态，再按订单类型缩小范围</strong>
          <p>如果只是确认是否到账，优先看“已支付”和“待支付”；如果要排查会员开通或点数补充，再切到对应订单类型查看。</p>
        </div>
        <div className="personal-context-actions">
          <Link href="/membership-purchase" className="primary-button">
            创建会员订单
          </Link>
          <Link href="/points-purchase" className="secondary-button">
            创建充值订单
          </Link>
        </div>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16 }}>
        <Link href="/personal-center" className="secondary-button">
          返回个人中心概览
        </Link>
      </div>

      <div className="personal-toolbar" style={{ alignItems: "flex-end" }}>
        <label className="field personal-search">
          <span>搜索订单</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索订单号、订单类型、状态、会员等级或充值点数"
          />
        </label>
        {search.trim() ? (
          <button type="button" className="secondary-button" onClick={() => setSearch("")}>
            清空搜索
          </button>
        ) : null}
      </div>

      <div className="tab-switcher" aria-label="订单状态筛选" style={{ marginTop: 16 }}>
        {orderStatusFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-button ${statusFilter === item.key ? "is-active" : ""}`}
            onClick={() => setStatusFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="tab-switcher" aria-label="订单类型筛选" style={{ marginTop: 12 }}>
        {orderTypeFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-button ${typeFilter === item.key ? "is-active" : ""}`}
            onClick={() => setTypeFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card-grid" style={{ marginTop: 16 }}>
        <article className="metric-card">
          <span>会员订单</span>
          <strong>{summary.membershipOrders}</strong>
          <p>当前筛选结果中属于会员购买的订单数。</p>
        </article>
        <article className="metric-card">
          <span>点数充值</span>
          <strong>{summary.rechargeOrders}</strong>
          <p>当前筛选结果中属于点数充值的订单数。</p>
        </article>
        <article className="metric-card">
          <span>最近一笔订单</span>
          <strong>{filteredOrders[0] ? formatDateTime(filteredOrders[0].createdAt) : "暂无记录"}</strong>
          <p>按更新时间倒序展示，方便快速定位最近一次购买或充值。</p>
        </article>
        <article className="metric-card">
          <span>当前筛选结果</span>
          <strong>{summary.total}</strong>
          <p>可配合状态、类型和关键词快速缩小范围。</p>
        </article>
      </div>

      <div className="personal-list" style={{ marginTop: 16 }}>
        {filteredOrders.map((item) => (
          <article className="entity-card personal-card" key={item.id}>
            <div className="entity-card-head">
              <div>
                <strong>{item.orderType === "MEMBERSHIP_PURCHASE" ? `${item.membership || "会员"} 会员订单` : `${item.pointsAmount || 0} 点充值订单`}</strong>
                <p className="personal-meta">
                  {item.orderNo} · {item.orderType === "MEMBERSHIP_PURCHASE" ? "会员购买" : "点数充值"}
                </p>
              </div>
              <span className={`archive-pill ${personalOrderStatusClassMap[item.orderStatus]}`}>{formatOrderStatusLabel(item.orderStatus)}</span>
            </div>
            <div className="personal-grid">
              <div>
                <span>订单号</span>
                <strong className="mono-text">{item.orderNo}</strong>
              </div>
              <div>
                <span>支付金额</span>
                <strong>{item.amountYuan} 元</strong>
              </div>
              <div>
                <span>{item.orderType === "MEMBERSHIP_PURCHASE" ? "会员等级" : "充值点数"}</span>
                <strong>{item.orderType === "MEMBERSHIP_PURCHASE" ? item.membership || "未记录" : `${item.pointsAmount || 0} 点`}</strong>
              </div>
              <div>
                <span>订单状态</span>
                <strong>{formatOrderStatusLabel(item.orderStatus)}</strong>
              </div>
              <div>
                <span>创建时间</span>
                <strong>{formatDateTime(item.createdAt)}</strong>
              </div>
              <div>
                <span>支付时间</span>
                <strong>{item.paidAt ? formatDateTime(item.paidAt) : "未支付"}</strong>
              </div>
            </div>
            <div className="personal-actions">
              <Link href={`/orders/${encodeURIComponent(item.id)}`} className="secondary-button">
                查看订单详情
              </Link>
            </div>
          </article>
        ))}
        {!filteredOrders.length ? (
          <div className="empty-canvas-box">
            <strong>{search.trim() || statusFilter !== "ALL" || typeFilter !== "ALL" ? "当前筛选条件下没有订单" : "当前还没有可展示的订单记录"}</strong>
            <p>
              {search.trim() || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "可以先清空搜索词，或把状态和类型切回“全部”后重新查看。"
                : "你可以先创建会员订单或点数充值订单，后续支付状态和到账结果都会回到这里统一查看。"}
            </p>
            <div className="personal-actions">
              {search.trim() || statusFilter !== "ALL" || typeFilter !== "ALL" ? (
                <>
                  <button type="button" className="secondary-button" onClick={() => setSearch("")}>
                    清空搜索
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setTypeFilter("ALL");
                    }}
                  >
                    查看全部订单
                  </button>
                </>
              ) : (
                <Link href="/membership-purchase" className="primary-button">
                  去创建会员订单
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function sortByOrderUpdatedAtDesc(a: OrderRecord, b: OrderRecord) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function formatOrderStatusLabel(status: OrderRecord["orderStatus"]) {
  switch (status) {
    case "PENDING":
      return "待支付";
    case "PAID":
      return "已支付";
    case "FAILED":
      return "支付失败";
    case "REFUNDED":
      return "已退款";
    case "CANCELLED":
      return "已取消";
    default:
      return status;
  }
}

