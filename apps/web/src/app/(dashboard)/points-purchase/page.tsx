"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createOrder,
  getProfile,
  payOrder,
  profileSeed,
  type OrderRecord,
  type UserProfile,
} from "../../../services/personal-center";

const packages = [
  {
    pointsAmount: 1000,
    amountYuan: 10,
    title: "入门点数包",
    description: "适合少量生成任务和单次报告产出。",
  },
  {
    pointsAmount: 5000,
    amountYuan: 50,
    title: "常用点数包",
    description: "适合连续执行品牌增长分析与日常任务消耗。",
  },
  {
    pointsAmount: 20000,
    amountYuan: 180,
    title: "高频点数包",
    description: "适合高频任务执行和团队协作场景。",
  },
];

export default function PointsPurchasePage() {
  const [profile, setProfile] = useState<UserProfile>(profileSeed);
  const [pendingOrder, setPendingOrder] = useState<OrderRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void refreshProfile();
  }, []);

  async function refreshProfile() {
    try {
      setProfile(await getProfile());
    } catch {
      setProfile(profileSeed);
    }
  }

  async function handleCreate(pointsAmount: number, amountYuan: number) {
    setIsSubmitting(true);
    setNotice("");
    setErrorMessage("");

    try {
      const order = await createOrder({
        orderType: "POINTS_RECHARGE",
        pointsAmount,
        amountYuan,
      });
      setPendingOrder(order);
      setNotice(`订单已创建：${order.orderNo}，待支付后点数才会到账。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "充值订单创建失败";
      setErrorMessage(`下单失败：${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePay() {
    if (!pendingOrder) {
      return;
    }

    setIsPaying(true);
    setNotice("");
    setErrorMessage("");

    try {
      const paid = await payOrder(pendingOrder.id);
      setPendingOrder(paid);
      await refreshProfile();
      setNotice(`支付完成：${paid.orderNo}，点数已到账 ${paid.pointsAmount || 0}。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "支付失败";
      setErrorMessage(`支付失败：${message}`);
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <span className="hero-badge">点数购买</span>
          <h1>创建充值订单并验证点数到账联动</h1>
          <p>这一页用于跑通点数充值动作：先创建 `PENDING` 订单，再点击模拟支付，查看点数余额和点数流水是否自动更新。</p>
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
        <div className="hero-side-card">
          <h2>当前账户</h2>
          <ul>
            <li>昵称: {profile.nickname}</li>
            <li>当前会员: {profile.membership}</li>
            <li>当前点数: {profile.pointsBalance}</li>
          </ul>
        </div>
      </section>

      <section className="panel personal-center-panel">
        <div className="panel-header">
          <h2>充值套餐</h2>
          <span>Points Packages</span>
        </div>
        <div className="purchase-grid">
          {packages.map((item) => (
            <article className="entity-card purchase-card" key={item.pointsAmount}>
              <div className="entity-card-head">
                <div>
                  <strong>{item.title}</strong>
                  <p className="personal-meta">{item.description}</p>
                </div>
                <span className="archive-pill status-ready">{item.pointsAmount} 点</span>
              </div>
              <div className="purchase-price">{item.amountYuan} 元</div>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleCreate(item.pointsAmount, item.amountYuan)}
                disabled={isSubmitting || isPaying}
              >
                {isSubmitting ? "创建中..." : "创建订单"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel personal-center-panel">
        <div className="panel-header">
          <h2>当前订单</h2>
          <span>Current Order</span>
        </div>
        {pendingOrder ? (
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>{pendingOrder.orderNo}</strong>
                <p className="personal-meta">{pendingOrder.pointsAmount || 0} 点 · {pendingOrder.amountYuan} 元</p>
              </div>
              <span className={`archive-pill ${pendingOrder.orderStatus === "PAID" ? "status-ready" : "status-in_progress"}`}>
                {pendingOrder.orderStatus}
              </span>
            </div>
            <div className="personal-grid">
              <div>
                <span>订单状态</span>
                <strong>{pendingOrder.orderStatus}</strong>
              </div>
              <div>
                <span>支付时间</span>
                <strong>{pendingOrder.paidAt ? formatDateTime(pendingOrder.paidAt) : "未支付"}</strong>
              </div>
            </div>
            <div className="personal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void handlePay()}
                disabled={isPaying || pendingOrder.orderStatus === "PAID"}
              >
                {pendingOrder.orderStatus === "PAID" ? "已支付完成" : isPaying ? "支付中..." : "模拟支付成功"}
              </button>
              <Link href={`/orders/${pendingOrder.id}`} className="secondary-button">
                查看订单详情
              </Link>
            </div>
          </article>
        ) : (
          <p className="empty-state">请先选择充值套餐创建订单。</p>
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
