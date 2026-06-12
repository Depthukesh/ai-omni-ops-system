"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, readAuthSession, type MeResponse } from "../../../services/auth";
import { getMyBrandInvites, type BrandInviteRecord } from "../../../services/brand-growth";
import {
  getMedia,
  getOrders,
  getPointLedgers,
  getTasks,
  mediaSeed,
  orderSeed,
  pointLedgerSeed,
  profileSeed,
  taskSeed,
  type MediaRecord,
  type OrderRecord,
  type PointLedgerRecord,
  type TaskRecord,
  type UserProfile,
} from "../../../services/personal-center";
import {
  buildPersonalCenterLoginPath,
  formatCollaboratorRoleLabel,
  formatDateTime,
  isAuthFailure,
  personalOrderStatusClassMap,
  personalTaskStatusClassMap,
} from "./route-helpers";

type PendingInvite = BrandInviteRecord & {
  brandId: string;
  brandName: string;
};

export default function PersonalCenterPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(profileSeed);
  const [pointLedgers, setPointLedgers] = useState<PointLedgerRecord[]>(pointLedgerSeed);
  const [orders, setOrders] = useState<OrderRecord[]>(orderSeed);
  const [tasks, setTasks] = useState<TaskRecord[]>(taskSeed);
  const [media, setMedia] = useState<MediaRecord[]>(mediaSeed);
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [myPendingInvites, setMyPendingInvites] = useState<PendingInvite[]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center"));
      return;
    }

    void loadOverviewData();
  }, [router]);

  async function loadOverviewData() {
    setIsLoading(true);

    const [meResult, pointLedgersResult, ordersResult, tasksResult, mediaResult, myInvitesResult] = await Promise.allSettled([
      getMe(),
      getPointLedgers(),
      getOrders(),
      getTasks(),
      getMedia(),
      getMyBrandInvites(),
    ]);

    if (meResult.status === "rejected" && isAuthFailure(meResult.reason)) {
      router.replace(buildPersonalCenterLoginPath("/personal-center"));
      return;
    }

    if (meResult.status === "fulfilled") {
      setProfile(meResult.value.user);
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
    } else {
      setProfile(profileSeed);
      setBrands([]);
      setCurrentBrandId("");
    }

    setPointLedgers(pointLedgersResult.status === "fulfilled" ? pointLedgersResult.value : pointLedgerSeed);
    setOrders(ordersResult.status === "fulfilled" ? ordersResult.value : orderSeed);
    setTasks(tasksResult.status === "fulfilled" ? tasksResult.value : taskSeed);
    setMedia(mediaResult.status === "fulfilled" ? mediaResult.value : mediaSeed);
    setMyPendingInvites(myInvitesResult.status === "fulfilled" ? myInvitesResult.value.items : []);

    setIsLoading(false);
  }

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  const summary = useMemo(
    () => ({
      membership: profile.membership,
      pointsBalance: profile.pointsBalance,
      membershipOrderCount: orders.filter((item) => item.orderType === "MEMBERSHIP_PURCHASE").length,
      rechargeOrderCount: orders.filter((item) => item.orderType === "POINTS_RECHARGE").length,
      runningTasks: tasks.filter((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED").length,
      workCount: media.length,
      xiaohongshuWorkCount: media.filter(isXiaohongshuWork).length,
      pendingInviteCount: myPendingInvites.length,
    }),
    [media, myPendingInvites.length, orders, profile.membership, profile.pointsBalance, tasks],
  );

  const latestTask = useMemo(() => [...tasks].sort(sortByTaskUpdatedAtDesc)[0], [tasks]);
  const latestOrder = useMemo(() => [...orders].sort(sortByOrderUpdatedAtDesc)[0], [orders]);
  const latestWork = useMemo(() => [...media].sort(sortByMediaCreatedAtDesc)[0], [media]);
  const latestPointLedger = useMemo(() => [...pointLedgers].sort(sortByPointLedgerCreatedAtDesc)[0], [pointLedgers]);
  const totalOrderCount = summary.membershipOrderCount + summary.rechargeOrderCount;
  const overviewPills = useMemo(
    () => [
      {
        label: "当前品牌",
        value: currentBrand?.brandName || "未绑定品牌",
        detail: currentBrand ? formatCollaboratorRoleLabel(currentBrand.role) : "可先绑定品牌工作区",
      },
      {
        label: "可访问品牌",
        value: `${brands.length || 0}`,
        detail: "当前账号可切换的协作空间数量",
      },
      {
        label: "最近点数记录",
        value: latestPointLedger ? formatDateTime(latestPointLedger.createdAt) : "未记录",
        detail: latestPointLedger?.description || "当前还没有新的点数变动记录。",
      },
    ],
    [brands.length, currentBrand, latestPointLedger],
  );

  const focusItems = useMemo(
    () =>
      [
        summary.pendingInviteCount
          ? {
              title: `${summary.pendingInviteCount} 条待处理邀请`,
              detail: "前往邀请通知处理待接受的品牌邀请，避免遗漏团队协作消息。",
              href: "/personal-center/invites",
              action: "查看邀请",
            }
          : null,
        summary.runningTasks
          ? {
              title: `${summary.runningTasks} 个任务正在执行`,
              detail: "任务详情与失败重试已统一收口到任务中心，概览页只保留提醒。",
              href: "/personal-center/tasks",
              action: "查看任务",
            }
          : null,
        summary.workCount
          ? {
              title: `${summary.workCount} 份作品资产可继续处理`,
              detail: "作品中心统一管理图片、视频、文档等资产，并支持回到对应工作台继续处理。",
              href: "/personal-center/works",
              action: "查看作品",
            }
          : null,
        totalOrderCount
          ? {
              title: `${totalOrderCount} 笔订单与充值待核对`,
              detail: "订单中心已经统一收口支付状态、会员购买和点数充值，适合先确认最近是否到账。",
              href: "/personal-center/orders",
              action: "查看订单",
            }
          : null,
        {
          title: "账号安全与登录态",
          detail: "安全设置页已独立，可查看登录状态、当前品牌信息和退出登录入口。",
          href: "/personal-center/security",
          action: "打开安全设置",
        },
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [summary.pendingInviteCount, summary.runningTasks, summary.workCount, totalOrderCount],
  );

  const primaryActions = useMemo(
    () => [
      {
        href: summary.runningTasks ? "/personal-center/tasks" : "/personal-center/works",
        label: summary.runningTasks ? "查看进行中任务" : "去作品中心",
        value: summary.runningTasks ? `${summary.runningTasks} 个任务待跟进` : `${summary.workCount} 份作品可继续处理`,
        description: summary.runningTasks
          ? "优先确认排队中和执行中的任务是否需要人工介入。"
          : "如果当前没有运行中的任务，可以直接回到作品中心继续处理内容。",
      },
      {
        href: "/personal-center/orders",
        label: "核对订单与充值",
        value: totalOrderCount ? `${totalOrderCount} 笔记录` : "暂无新订单",
        description: totalOrderCount
          ? "会员购买和点数充值都已经合并到一个入口，不需要来回切换。"
          : "后续创建会员订单或点数充值后，会在这里统一回看支付状态。",
      },
      {
        href: "/personal-center/security",
        label: "维护账号资料",
        value: currentBrand?.brandName || "未绑定品牌",
        description: "昵称、头像、手机号和登录状态都统一放在安全设置里维护。",
      },
    ],
    [currentBrand?.brandName, summary.runningTasks, summary.workCount, totalOrderCount],
  );

  const workspaceLinks = useMemo(
    () => [
      {
        href: "/personal-center/orders",
        label: "订单中心",
        value: `${summary.membershipOrderCount + summary.rechargeOrderCount} 条`,
        description: "去核对支付状态、会员开通结果和点数到账情况。",
      },
      {
        href: "/personal-center/works",
        label: "作品中心",
        value: `${summary.workCount} 份`,
        description: "继续处理已生成的图片、视频、文档和归档内容。",
      },
      {
        href: "/personal-center/tasks",
        label: "任务中心",
        value: `${summary.runningTasks} 进行中`,
        description: "先确认执行进度，再决定是否重试或取消。",
      },
      {
        href: "/personal-center/skills",
        label: "技能中心",
        value: "平台技能",
        description: "去查看品牌当前可用的技能版本和提示词配置。",
      },
      {
        href: "/personal-center/third-party-platforms",
        label: "第三方接口配置",
        value: "平台同步",
        description: "去维护平台连接、模型 ID 和品牌共享 API Key。",
      },
      {
        href: "/personal-center/team",
        label: "团队协作",
        value: `${brands.length || 0} 个品牌`,
        description: "去处理成员、角色、邀请和品牌协作关系。",
      },
      {
        href: "/personal-center/security",
        label: "安全设置",
        value: "登录态",
        description: "去维护账号资料、密码和当前登录状态。",
      },
    ],
    [brands.length, summary.membershipOrderCount, summary.rechargeOrderCount, summary.runningTasks, summary.workCount],
  );

  return (
    <main className="dashboard-shell personal-center-shell">
      <div className="bento-container">
        <div className="bento-grid">
          
          {/* Account Identity (Hero Cell) */}
          <article className="bento-cell bento-cell-glass bento-cell--col-8 bento-cell--row-2">
            <span className="bento-eyebrow">Personal Center</span>
            <div className="bento-profile-wrap">
              {profile.avatarUrl ? (
                <img className="bento-avatar" src={profile.avatarUrl} alt={`${profile.nickname || "User"} Avatar`} />
              ) : (
                <div className="bento-avatar">
                  {(profile.nickname || profile.email || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="bento-title">{profile.nickname || "Current Account"}</h2>
                <p className="bento-desc">{currentBrand?.brandName || "No Workspace Linked"}</p>
              </div>
            </div>
            
            <p className="bento-desc" style={{ maxWidth: '65ch' }}>
              Welcome back. Manage your tasks, orders, and creative assets here. Detailed workflows are accessible via dedicated workspaces below.
            </p>
            
            <div className="bento-action-area">
              <Link href="/personal-center/tasks" className="primary-button">
                Open Task Center
              </Link>
              <Link href="/personal-center/security" className="secondary-button">
                Account Security
              </Link>
            </div>
          </article>

          {/* Membership Status */}
          <article className="bento-cell bento-cell--col-4">
            <span className="bento-eyebrow">Membership</span>
            <h3 className="bento-title">{summary.membership}</h3>
            <div className="bento-value bento-value-small">{summary.pointsBalance}</div>
            <p className="bento-desc">Remaining Points</p>
          </article>

          {/* Running Tasks */}
          <article className="bento-cell bento-cell--col-4">
            <Link href="/personal-center/tasks" className="bento-link">
              <span className="bento-eyebrow">Execution</span>
              <h3 className="bento-title">Active Tasks</h3>
              <div className="bento-value">{summary.runningTasks}</div>
              <p className="bento-desc">In queue or running</p>
            </Link>
          </article>

          {/* Creative Assets */}
          <article className="bento-cell bento-cell--col-6">
            <Link href="/personal-center/works" className="bento-link">
              <span className="bento-eyebrow">Assets</span>
              <h3 className="bento-title">Media & Works</h3>
              <div className="bento-value bento-value-small">{summary.workCount}</div>
              <p className="bento-desc">Generated images, videos, and documents ready for export.</p>
            </Link>
          </article>

          {/* Orders & Recharge */}
          <article className="bento-cell bento-cell--col-6">
            <Link href="/personal-center/orders" className="bento-link">
              <span className="bento-eyebrow">Billing</span>
              <h3 className="bento-title">Orders & Recharge</h3>
              <div className="bento-value bento-value-small">{totalOrderCount}</div>
              <p className="bento-desc">Check payment status and top-up records.</p>
            </Link>
          </article>

          {/* Team Collaboration */}
          <article className="bento-cell bento-cell--col-4">
            <Link href="/personal-center/team" className="bento-link">
              <span className="bento-eyebrow">Network</span>
              <h3 className="bento-title">Collaboration</h3>
              <div className="bento-value">{brands.length || 0}</div>
              <p className="bento-desc">Accessible workspaces</p>
            </Link>
          </article>

          {/* Pending Invites */}
          <article className="bento-cell bento-cell--col-4">
            <Link href="/personal-center/invites" className="bento-link">
              <span className="bento-eyebrow">Notifications</span>
              <h3 className="bento-title">Pending Invites</h3>
              <div className="bento-value">{summary.pendingInviteCount}</div>
              <p className="bento-desc">Awaiting your response</p>
            </Link>
          </article>

          {/* Platform Settings */}
          <article className="bento-cell bento-cell--col-4">
            <Link href="/personal-center/third-party-platforms" className="bento-link">
              <span className="bento-eyebrow">Integrations</span>
              <h3 className="bento-title">Platform API</h3>
              <p className="bento-desc" style={{ marginTop: 'auto' }}>Configure third-party models and sync keys.</p>
            </Link>
          </article>

        </div>
      </div>
    </main>
  );
}

function sortByTaskUpdatedAtDesc(a: TaskRecord, b: TaskRecord) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function sortByMediaCreatedAtDesc(a: MediaRecord, b: MediaRecord) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function sortByPointLedgerCreatedAtDesc(a: PointLedgerRecord, b: PointLedgerRecord) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function sortByOrderUpdatedAtDesc(a: OrderRecord, b: OrderRecord) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function isXiaohongshuWork(item: MediaRecord) {
  return item.scope === "XIAOHONGSHU" || item.title.toLowerCase().includes("小红书");
}

function formatTaskStatusLabel(status: TaskRecord["taskStatus"]) {
  switch (status) {
    case "PENDING":
      return "待启动";
    case "QUEUED":
      return "排队中";
    case "RUNNING":
      return "执行中";
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "执行失败";
    case "CANCELLED":
      return "已取消";
    default:
      return status;
  }
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

function formatMediaTypeLabel(mediaType: MediaRecord["mediaType"]) {
  switch (mediaType) {
    case "HTML":
      return "HTML";
    case "IMAGE":
      return "图片";
    case "VIDEO":
      return "视频";
    case "DOCUMENT":
      return "文档";
    case "ARCHIVE":
      return "归档";
    default:
      return mediaType;
  }
}
