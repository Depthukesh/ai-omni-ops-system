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

const plans = [
  {
    membership: "BASIC" as const,
    title: "基础会员",
    amountYuan: 199,
    description: "适合初步体验品牌建档、报告生成和个人中心管理。",
  },
  {
    membership: "PRO" as const,
    title: "专业会员",
    amountYuan: 699,
    description: "适合持续进行品牌增长分析、任务执行和作品沉淀。",
  },
  {
    membership: "ENTERPRISE" as const,
    title: "企业会员",
    amountYuan: 1999,
    description: "适合团队协同、长期增长与更高额度的全域运营场景。",
  },
];

export default function MembershipPurchasePage() {
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

  async function handleCreate(membership: "BASIC" | "PRO" | "ENTERPRISE", amountYuan: number) {
    setIsSubmitting(true);
    setNotice("");
    setErrorMessage("");

    try {
      const order = await createOrder({
        orderType: "MEMBERSHIP_PURCHASE",
        membership,
        amountYuan,
      });
      setPendingOrder(order);
      setNotice(`订单已创建：${order.orderNo}，当前状态 ${order.orderStatus}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "会员订单创建失败";
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
      setNotice(`支付完成：${paid.orderNo}，会员已更新为 ${paid.membership || "当前等级"}`);
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
          <span className="hero-badge">会员购买</span>
          <h1>创建会员订单并验证支付联动</h1>
          <p>这一页用于跑通会员购买动作：先创建 `PENDING` 订单，再点击模拟支付，查看会员等级是否自动更新。</p>
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
          <h2>会员方案</h2>
          <span>Membership Plans</span>
        </div>
        <div className="purchase-grid">
          {plans.map((plan) => (
            <article className="entity-card purchase-card" key={plan.membership}>
              <div className="entity-card-head">
                <div>
                  <strong>{plan.title}</strong>
                  <p className="personal-meta">{plan.description}</p>
                </div>
                <span className="archive-pill status-ready">{plan.membership}</span>
              </div>
              <div className="purchase-price">{plan.amountYuan} 元</div>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleCreate(plan.membership, plan.amountYuan)}
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
                <p className="personal-meta">{pendingOrder.membership || "会员订单"} · {pendingOrder.amountYuan} 元</p>
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
          <p className="empty-state">请先选择会员方案创建订单。</p>
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
