"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  cancelOrder,
  getOrderById,
  getOrderStatus,
  orderSeed,
  payOrder,
  type OrderRecord,
} from "../../../../services/personal-center";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);
  const [dataSource, setDataSource] = useState<"api" | "seed">("api");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      return;
    }

    void loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !order || order.orderStatus !== "PENDING") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [orderId, order]);

  async function loadOrder() {
    if (!orderId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextOrder = await getOrderById(orderId);
      setOrder(nextOrder);
      setDataSource("api");
    } catch {
      const fallback = orderSeed.find((item) => item.id === orderId) ?? null;
      setOrder(fallback);
      setDataSource("seed");
      setErrorMessage("接口暂不可用，当前展示的是本地演示订单数据。");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshStatus() {
    if (!orderId) {
      return;
    }

    try {
      const status = await getOrderStatus(orderId);
      setOrder((current) => (current ? { ...current, ...status } : current));
      if (status.orderStatus !== "PENDING") {
        setNotice(`订单状态已更新为 ${status.orderStatus}`);
      }
    } catch {
      // ignore polling errors to avoid noisy UI
    }
  }

  async function handlePay() {
    if (!order) {
      return;
    }

    setIsOperating(true);
    setNotice("");
    setErrorMessage("");

    try {
      const paid = await payOrder(order.id);
      setOrder((current) => (current ? { ...current, ...paid } : paid));
      setNotice(`支付完成：${paid.orderNo}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "支付失败";
      setErrorMessage(`支付失败：${message}`);
    } finally {
      setIsOperating(false);
    }
  }

  async function handleCancel() {
    if (!order) {
      return;
    }

    setIsOperating(true);
    setNotice("");
    setErrorMessage("");

    try {
      const cancelled = await cancelOrder(order.id);
      setOrder((current) => (current ? { ...current, ...cancelled } : cancelled));
      setNotice(`订单已取消：${cancelled.orderNo}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "取消失败";
      setErrorMessage(`取消失败：${message}`);
    } finally {
      setIsOperating(false);
    }
  }

  const orderSummary = useMemo(() => {
    if (!order) {
      return [];
    }

    return [
      { label: "订单号", value: order.orderNo },
      { label: "订单类型", value: order.orderType },
      { label: "订单状态", value: order.orderStatus },
      { label: "支付金额", value: `${order.amountYuan} 元` },
      {
        label: order.orderType === "MEMBERSHIP_PURCHASE" ? "会员等级" : "充值点数",
        value: order.orderType === "MEMBERSHIP_PURCHASE" ? order.membership || "-" : `${order.pointsAmount || 0} 点`,
      },
      { label: "创建时间", value: formatDateTime(order.createdAt) },
      { label: "支付时间", value: order.paidAt ? formatDateTime(order.paidAt) : "未支付" },
      { label: "数据来源", value: dataSource === "api" ? "接口数据" : "演示数据" },
    ];
  }, [dataSource, order]);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <span className="hero-badge">订单详情</span>
          <h1>订单状态追踪、支付轮询与取消</h1>
          <p>该页面会在订单处于 `PENDING` 时自动轮询状态，支持手动模拟支付成功或取消订单。</p>
          <div className="workspace-toolbar top-toolbar">
            <div className="workspace-status">
              {notice ? <span className="status-text success-text">{notice}</span> : null}
              {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
            </div>
            <Link href="/personal-center" className="secondary-button">
              返回个人中心
            </Link>
          </div>
        </div>
      </section>

      <section className="panel personal-center-panel">
        <div className="panel-header">
          <h2>订单详情</h2>
          <span>Order Detail</span>
        </div>
        {isLoading ? (
          <p className="empty-state">订单加载中...</p>
        ) : !order ? (
          <p className="empty-state">未找到对应订单。</p>
        ) : (
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>{order.orderNo}</strong>
                <p className="personal-meta">
                  {order.user ? `${order.user.nickname} · ${order.user.mobile}` : "当前账户订单"} · {order.amountYuan} 元
                </p>
              </div>
              <span className={`archive-pill ${order.orderStatus === "PAID" ? "status-ready" : order.orderStatus === "CANCELLED" ? "status-paused" : "status-in_progress"}`}>
                {order.orderStatus}
              </span>
            </div>
            <div className="personal-grid">
              {orderSummary.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong className={item.label === "订单号" ? "mono-text" : undefined}>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="personal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void handlePay()}
                disabled={isOperating || order.orderStatus !== "PENDING"}
              >
                {isOperating && order.orderStatus === "PENDING" ? "处理中..." : "模拟支付成功"}
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleCancel()}
                disabled={isOperating || order.orderStatus !== "PENDING"}
              >
                取消订单
              </button>
              <button type="button" className="secondary-button" onClick={() => void refreshStatus()}>
                立即刷新状态
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
