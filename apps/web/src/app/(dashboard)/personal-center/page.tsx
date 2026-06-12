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
    <main className="dashboard-shell">
      <section className="panel personal-center-panel">
        <div className="panel-header">
          <div>
            <h2>个人中心概览</h2>
            <p className="panel-subtext">这里只保留最重要的账号摘要、今日待办和快捷入口，详细处理统一进入各自的独立工作区。</p>
          </div>
          <span>{summary.membership}</span>
        </div>

        <div className="personal-context-banner">
          <div>
            <strong>今天先处理需要动作的入口，不在首页展开长列表</strong>
            <p>如果有正在执行的任务，先看任务中心；如果要确认支付和到账，再去订单中心；账号资料和登录状态统一放在安全设置里维护。</p>
          </div>
          <div className="personal-context-actions">
            <Link href="/personal-center/tasks" className="primary-button">
              打开任务中心
            </Link>
            <Link href="/personal-center/orders" className="secondary-button">
              打开订单中心
            </Link>
          </div>
        </div>

        <div className="card-grid">
          <article className="metric-card">
            <span>会员等级</span>
            <strong>{summary.membership}</strong>
            <p>当前账号的会员身份与服务层级。</p>
          </article>
          <article className="metric-card">
            <span>剩余点数</span>
            <strong>{summary.pointsBalance}</strong>
            <p>创作点数只显示摘要，流水明细统一进入订单与点数相关工作区。</p>
          </article>
          <article className="metric-card">
            <span>进行中任务</span>
            <strong>{summary.runningTasks}</strong>
            <p>只在概览里提醒，不在根页展示任务长列表。</p>
          </article>
          <article className="metric-card">
            <span>作品资产</span>
            <strong>{summary.workCount}</strong>
            <p>其中小红书相关作品 {summary.xiaohongshuWorkCount} 份。</p>
          </article>
          <article className="metric-card">
            <span>待处理邀请</span>
            <strong>{summary.pendingInviteCount}</strong>
            <p>邀请通知已经独立拆页，概览只保留提醒。</p>
          </article>
          <article className="metric-card">
            <span>最近点数记录</span>
            <strong>{latestPointLedger ? formatDateTime(latestPointLedger.createdAt) : "未记录"}</strong>
            <p>{latestPointLedger?.description || "当前还没有可显示的点数变动记录。"}</p>
          </article>
        </div>

        <div className="personal-overview-action-grid">
          {primaryActions.map((item) => (
            <Link key={item.href} href={item.href} className="personal-overview-action-card">
              <span className="personal-overview-action-label">{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel personal-center-panel">
        <div className="panel-header">
          <div>
            <h2>关键信息</h2>
            <p className="panel-subtext">只保留账号、品牌和当前最需要处理的事项，避免把列表、表格和历史记录全部堆回首页。</p>
          </div>
        </div>

        <div className="personal-list">
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>账号与品牌</strong>
                <p className="personal-meta">确认当前是谁在使用系统、正在操作哪个品牌工作区。</p>
              </div>
              <span className="archive-pill status-ready">{formatCollaboratorRoleLabel(currentBrand?.role)}</span>
            </div>
            <div className="profile-summary-inline">
              {profile.avatarUrl ? (
                <img className="profile-summary-avatar" src={profile.avatarUrl} alt={`${profile.nickname || "用户"}头像`} />
              ) : (
                <div className="profile-summary-avatar profile-summary-avatar-fallback">
                  {(profile.nickname || profile.email || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="personal-actions personal-actions--tight" style={{ justifyContent: "flex-start" }}>
                <Link href="/personal-center/security" className="secondary-button">
                  编辑账号资料
                </Link>
                <Link href="/personal-center/team" className="secondary-button">
                  查看团队协作
                </Link>
              </div>
            </div>
            <div className="personal-grid">
              <div>
                <span>用户昵称</span>
                <strong>{profile.nickname}</strong>
              </div>
              <div>
                <span>用户 ID</span>
                <strong>{profile.id}</strong>
              </div>
              <div>
                <span>手机号</span>
                <strong>{profile.mobile}</strong>
              </div>
              <div>
                <span>邮箱</span>
                <strong>{profile.email}</strong>
              </div>
              <div>
                <span>当前品牌</span>
                <strong>{currentBrand?.brandName || "未绑定品牌"}</strong>
              </div>
              <div>
                <span>可访问品牌数</span>
                <strong>{brands.length || 0}</strong>
              </div>
            </div>
          </article>

          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>当前待办</strong>
                <p className="personal-meta">首页只显示下一步该去哪里处理，不在这里继续展开明细。</p>
              </div>
              <span className="archive-pill status-in_progress">{focusItems.length} 项关注</span>
            </div>
            <div className="personal-list" style={{ gap: 12 }}>
              {focusItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="light-data-panel"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.title}</strong>
                      <p className="personal-meta">{item.detail}</p>
                    </div>
                    <span className="archive-pill status-ready">{item.action}</span>
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>最近动态</strong>
                <p className="personal-meta">每类只保留一条最近记录，让首页更像概览，而不是历史中心。</p>
              </div>
            </div>
            <div className="personal-list" style={{ gap: 12 }}>
              <div className="light-data-panel">
                <div className="entity-card-head">
                  <div>
                    <strong>{latestTask?.taskTitle || "暂无任务"}</strong>
                    <p className="personal-meta">任务中心最近更新</p>
                  </div>
                  <span className={`archive-pill ${latestTask ? personalTaskStatusClassMap[latestTask.taskStatus] : "status-paused"}`}>
                    {latestTask ? formatTaskStatusLabel(latestTask.taskStatus) : "暂无"}
                  </span>
                </div>
                <p className="personal-meta">{latestTask ? `${latestTask.taskType} · ${formatDateTime(latestTask.updatedAt)}` : "去任务中心查看执行记录。"}</p>
              </div>

              <div className="light-data-panel">
                <div className="entity-card-head">
                  <div>
                    <strong>{latestOrder?.orderNo || "暂无订单"}</strong>
                    <p className="personal-meta">订单中心最近更新</p>
                  </div>
                  <span className={`archive-pill ${latestOrder ? personalOrderStatusClassMap[latestOrder.orderStatus] : "status-paused"}`}>
                    {latestOrder ? formatOrderStatusLabel(latestOrder.orderStatus) : "暂无"}
                  </span>
                </div>
                <p className="personal-meta">
                  {latestOrder
                    ? `${latestOrder.orderType === "MEMBERSHIP_PURCHASE" ? "会员订单" : "点数充值"} · ${formatDateTime(latestOrder.updatedAt)}`
                    : "去订单中心查看会员订单与充值记录。"}
                </p>
              </div>

              <div className="light-data-panel">
                <div className="entity-card-head">
                  <div>
                    <strong>{latestWork?.title || "暂无作品"}</strong>
                    <p className="personal-meta">作品中心最近产出</p>
                  </div>
                  <span className="archive-pill status-ready">{latestWork ? formatMediaTypeLabel(latestWork.mediaType) : "暂无"}</span>
                </div>
                <p className="personal-meta">
                  {latestWork ? `${formatDateTime(latestWork.createdAt)} · ${latestWork.title}` : "去作品中心查看当前账号沉淀的作品资产。"}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="panel personal-center-panel">
        <div className="panel-header">
          <div>
            <h2>快捷入口</h2>
            <p className="panel-subtext">从概览页直接进入具体工作区，首页不再承担所有业务细节。</p>
          </div>
        </div>
        <div className="card-grid">
          {workspaceLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article className="metric-card" style={{ height: "100%" }}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
              </article>
            </Link>
          ))}
        </div>
      </section>
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
