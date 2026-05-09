"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../services/auth";
import {
  getMyBrandInvites,
  type BrandInviteRecord,
} from "../../../services/brand-growth";
import {
  getPointLedgers,
  getOrders,
  getMedia,
  getTasks,
  mediaSeed,
  orderSeed,
  pointLedgerSeed,
  profileSeed,
  retryTask,
  taskSeed,
  type MediaRecord,
  type OrderRecord,
  type PointLedgerRecord,
  type TaskRecord,
  type UserProfile,
} from "../../../services/personal-center";

type PersonalTab = "profile" | "points" | "orders" | "recharge" | "tasks" | "works";

const tabs: Array<{ key: PersonalTab; label: string; description: string }> = [
  { key: "profile", label: "个人信息", description: "查看当前账号资料、我的会员等级与点数余额。" },
  { key: "points", label: "点数流水", description: "查看点数增减记录、余额变化与关联任务。" },
  { key: "orders", label: "会员订单", description: "查看会员购买订单、金额和支付状态。" },
  { key: "recharge", label: "充值明细", description: "查看点数充值订单、充值数量和支付时间。" },
  { key: "tasks", label: "任务记录", description: "查看各类大模型任务状态，并支持失败任务重试。" },
  { key: "works", label: "我的作品", description: "查看已经生成的 HTML、图片、视频等作品资产。" },
];

const personalReferenceTabs: Array<{ label: string; key: PersonalTab }> = [
  { label: "我的会员", key: "profile" },
  { label: "我的人设", key: "profile" },
  { label: "分销推广", key: "profile" },
  { label: "我的优惠券", key: "orders" },
  { label: "密码管理", key: "profile" },
  { label: "我的创作信息模板", key: "profile" },
  { label: "我的标题库", key: "works" },
  { label: "我的素材库", key: "works" },
  { label: "任务记录", key: "tasks" },
  { label: "发布记", key: "works" },
];

export default function PersonalCenterPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PersonalTab>("profile");
  const [profile, setProfile] = useState<UserProfile>(profileSeed);
  const [pointLedgers, setPointLedgers] = useState<PointLedgerRecord[]>(pointLedgerSeed);
  const [orders, setOrders] = useState<OrderRecord[]>(orderSeed);
  const [tasks, setTasks] = useState<TaskRecord[]>(taskSeed);
  const [media, setMedia] = useState<MediaRecord[]>(mediaSeed);
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [myPendingInvites, setMyPendingInvites] = useState<Array<BrandInviteRecord & { brandId: string; brandName: string }>>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingId, setIsRetryingId] = useState<string>("");
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed">("seed");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildLoginPath());
      return;
    }

    void loadCenterData();
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && tabs.some((item) => item.key === tab)) {
      setActiveTab(tab as PersonalTab);
    }
  }, []);

  async function loadCenterData() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [meResult, pointLedgersResult, ordersResult, tasksResult, mediaResult, myInvitesResult] = await Promise.allSettled([
      getMe(),
      getPointLedgers(),
      getOrders(),
      getTasks(),
      getMedia(),
      getMyBrandInvites(),
    ]);

    if (meResult.status === "rejected" && isAuthFailure(meResult.reason)) {
      await handleSessionExpired();
      return;
    }

    const hasSeedFallback =
      meResult.status !== "fulfilled"
      || pointLedgersResult.status !== "fulfilled"
      || ordersResult.status !== "fulfilled"
      || tasksResult.status !== "fulfilled"
      || mediaResult.status !== "fulfilled";

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
    setDataSource(hasSeedFallback ? "seed" : "api");

    if (hasSeedFallback) {
      setErrorMessage(
        meResult.status === "fulfilled"
          ? "部分接口暂不可用，当前页面已混合展示真实账号信息与本地演示数据。"
          : "后端暂不可用，当前展示的是本地演示会员、点数、订单、任务与作品数据。",
      );
    }

    setIsLoading(false);
  }

  async function handleRetry(taskId: string) {
    setIsRetryingId(taskId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await retryTask(taskId);
      setTasks((current) =>
        current.map((item) => (item.id === taskId ? updated : item)).sort(sortByUpdatedAtDesc),
      );
      setNotice(`任务已重新排队：${updated.taskTitle}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "任务重试失败";
      setErrorMessage(`重试失败：${message}`);
    } finally {
      setIsRetryingId("");
    }
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
      setNotice("品牌工作区已切换，正在刷新个人中心数据。");
      await loadCenterData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "切换品牌失败";
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
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
    router.replace(buildLoginPath());
  }

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...tasks]
      .sort(sortByUpdatedAtDesc)
      .filter((item) =>
        !keyword
          || item.taskTitle.toLowerCase().includes(keyword)
          || item.taskType.toLowerCase().includes(keyword)
          || item.modelName.toLowerCase().includes(keyword),
      );
  }, [search, tasks]);

  const filteredMedia = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...media]
      .sort(sortByMediaCreatedAtDesc)
      .filter((item) =>
        !keyword
          || item.title.toLowerCase().includes(keyword)
          || item.mediaType.toLowerCase().includes(keyword)
          || item.storageKey.toLowerCase().includes(keyword),
      );
  }, [media, search]);

  const filteredXiaohongshuMedia = useMemo(() => filteredMedia.filter((item) => isXiaohongshuWork(item)), [filteredMedia]);
  const filteredOtherMedia = useMemo(() => filteredMedia.filter((item) => !isXiaohongshuWork(item)), [filteredMedia]);

  const filteredPointLedgers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...pointLedgers]
      .sort(sortByPointLedgerCreatedAtDesc)
      .filter((item) =>
        !keyword
          || item.changeType.toLowerCase().includes(keyword)
          || (item.description ?? "").toLowerCase().includes(keyword)
          || (item.relatedTaskId ?? "").toLowerCase().includes(keyword),
      );
  }, [pointLedgers, search]);

  const filteredMembershipOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...orders]
      .filter((item) => item.orderType === "MEMBERSHIP_PURCHASE")
      .sort(sortByOrderUpdatedAtDesc)
      .filter((item) =>
        !keyword
          || item.orderNo.toLowerCase().includes(keyword)
          || (item.membership ?? "").toLowerCase().includes(keyword)
          || item.orderStatus.toLowerCase().includes(keyword),
      );
  }, [orders, search]);

  const filteredRechargeOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...orders]
      .filter((item) => item.orderType === "POINTS_RECHARGE")
      .sort(sortByOrderUpdatedAtDesc)
      .filter((item) =>
        !keyword
          || item.orderNo.toLowerCase().includes(keyword)
          || item.orderStatus.toLowerCase().includes(keyword)
          || String(item.pointsAmount ?? "").includes(keyword),
      );
  }, [orders, search]);

  const summary = useMemo(
    () => ({
      membership: profile.membership,
      pointsBalance: profile.pointsBalance,
      pointLedgerCount: pointLedgers.length,
      membershipOrderCount: orders.filter((item) => item.orderType === "MEMBERSHIP_PURCHASE").length,
      rechargeOrderCount: orders.filter((item) => item.orderType === "POINTS_RECHARGE").length,
      runningTasks: tasks.filter((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED").length,
      pendingInviteCount: myPendingInvites.length,
    }),
    [myPendingInvites.length, orders, pointLedgers.length, profile.membership, profile.pointsBalance, tasks],
  );

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  return (
    <main className="dashboard-shell">
      <section className="personal-reference-header">
        <div className="personal-reference-header-top">
          <div className="personal-reference-title">个人信息</div>
          <div className="personal-actions">
            <div className="workspace-status">
              <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
                {dataSource === "api" ? "接口数据" : "演示数据"}
              </span>
              {isLoading ? <span className="status-text">正在加载个人中心数据...</span> : null}
              {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
              {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
            </div>
            <button type="button" className="secondary-button" onClick={() => void loadCenterData()} disabled={isLoading || Boolean(isRetryingId)}>
              刷新数据
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
                    {item.brandName} · {item.role}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut || isSwitchingBrand}
            >
              {isLoggingOut ? "退出中..." : "退出登录"}
            </button>
          </div>
        </div>
        <div className="personal-reference-divider" />
        <div className="personal-reference-profile">
          <div className="personal-reference-avatar" />
          <div className="personal-reference-info">
            <div className="personal-reference-pair">
              <span>用户昵称</span>
              <strong>{profile.nickname}</strong>
            </div>
            <div className="personal-reference-pair">
              <span>用户ID</span>
              <strong>{profile.id}</strong>
            </div>
          </div>
          <div className="personal-reference-info">
            <div className="personal-reference-pair">
              <span>手机号</span>
              <strong className="personal-reference-link">{profile.mobile}</strong>
            </div>
            <div className="personal-reference-pair">
              <span>邮箱账号</span>
              <strong className="personal-reference-link">{profile.email}</strong>
            </div>
          </div>
          <div className="personal-reference-info">
            <div className="personal-reference-pair">
              <span>会员等级</span>
              <strong>{profile.membership}</strong>
            </div>
            <div className="personal-reference-pair">
              <span>注册时间</span>
              <strong>{formatDateTime(orders[0]?.createdAt)}</strong>
            </div>
          </div>
          <div className="personal-reference-info">
            <div className="personal-reference-pair">
              <span>当前品牌</span>
              <strong>{currentBrand?.brandName || "未绑定品牌"}</strong>
            </div>
            <div className="personal-reference-pair">
              <span>协作权限</span>
              <strong>{currentBrand?.role || "未记录"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel personal-center-panel">
        <div className="personal-reference-tabs">
          {personalReferenceTabs.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              className={`personal-reference-tab ${isReferenceTabActive(activeTab, item.label, item.key) ? "is-active" : ""}`}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="personal-toolbar">
          <div className="tab-switcher" aria-label="功能标签">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tab-button ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="field personal-search">
            <span>搜索</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={getSearchPlaceholder(activeTab)}
            />
          </label>
        </div>

        <article className="workspace-panel personal-panel">
          <div className="panel-header">
            <div>
              <h2>{tabs.find((item) => item.key === activeTab)?.label}</h2>
              <p className="panel-subtext">{tabs.find((item) => item.key === activeTab)?.description}</p>
            </div>
            <span>{getTabCountLabel(activeTab, filteredPointLedgers.length, filteredMembershipOrders.length, filteredRechargeOrders.length, filteredTasks.length, filteredMedia.length)}</span>
          </div>

          {activeTab === "profile" ? (
            <div className="personal-list">
              <article className="member-stage-card">
                <div className="member-stage-top">
                  <div className="member-stage-meta">
                    <span className="member-stage-label">会员等级:</span>
                    <span className="member-stage-badge">{profile.membership}</span>
                    <span className="member-stage-days">
                      会员剩余天数: <strong>0</strong>
                    </span>
                    <span className="member-stage-subtext">(演示环境默认不计算到期日)</span>
                  </div>
                </div>
                <div className="member-stage-bottom">
                  <div className="member-stage-balance">
                    <div>
                      <span>剩余创作点数:</span>
                      <strong>{summary.pointsBalance} 点</strong>
                    </div>
                    <div className="member-stage-actions">
                      <Link href="/points-purchase" className="emerald-button">
                        增加点数
                      </Link>
                      <Link href="/membership-purchase" className="dark-button">
                        卡密兑换
                      </Link>
                    </div>
                  </div>
                </div>
              </article>

              {summary.pendingInviteCount ? (
                <article className="light-data-panel">
                  <div className="panel-header">
                    <div>
                      <h3>待处理品牌邀请</h3>
                      <p className="panel-subtext">你当前有 {summary.pendingInviteCount} 条待接受邀请，可直接进入团队页处理。</p>
                    </div>
                    <Link href="/personal-center/invites" className="secondary-button">
                      去邀请通知中心
                    </Link>
                  </div>
                  <table className="soft-table">
                    <thead>
                      <tr>
                        <th>品牌</th>
                        <th>角色</th>
                        <th>邀请人</th>
                        <th>过期时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myPendingInvites.slice(0, 5).map((item) => (
                        <tr key={item.id}>
                          <td>{item.brandName}</td>
                          <td>{item.role}</td>
                          <td>{item.invitedByName}</td>
                          <td>{formatDateTime(item.expiresAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ) : null}

              <article className="light-data-panel">
                <h3>我的点数明细变化:</h3>
                <table className="soft-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>变动类型</th>
                      <th>记录时间</th>
                      <th>点数变动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointLedgers.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.changeType}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td>{item.pointsDelta >= 0 ? `+${item.pointsDelta}` : item.pointsDelta}</td>
                      </tr>
                    ))}
                    {!pointLedgers.length ? (
                      <tr>
                        <td colSpan={4}>暂无数据</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </article>
            </div>
          ) : activeTab === "points" ? (
            <div className="personal-list">
              <div className="personal-actions">
                <Link href="/points-purchase" className="primary-button">
                  创建充值订单
                </Link>
              </div>
              {filteredPointLedgers.map((item) => (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.description || item.changeType}</strong>
                      <p className="personal-meta">{item.changeType} · {formatDateTime(item.createdAt)}</p>
                    </div>
                    <span className={`archive-pill ${item.pointsDelta >= 0 ? "status-ready" : "status-in_progress"}`}>
                      {item.pointsDelta >= 0 ? `+${item.pointsDelta}` : item.pointsDelta}
                    </span>
                  </div>
                  <div className="personal-grid">
                    <div>
                      <span>变动类型</span>
                      <strong>{item.changeType}</strong>
                    </div>
                    <div>
                      <span>变动后余额</span>
                      <strong>{item.balanceAfter}</strong>
                    </div>
                    <div>
                      <span>关联任务</span>
                      <strong>{item.relatedTaskId || "无"}</strong>
                    </div>
                    <div>
                      <span>记录时间</span>
                      <strong>{formatDateTime(item.createdAt)}</strong>
                    </div>
                  </div>
                </article>
              ))}
              {!filteredPointLedgers.length ? <p className="empty-state">当前没有匹配的点数流水记录。</p> : null}
            </div>
          ) : activeTab === "orders" ? (
            <div className="personal-list">
              <div className="personal-actions">
                <Link href="/membership-purchase" className="primary-button">
                  创建会员订单
                </Link>
              </div>
              {filteredMembershipOrders.map((item) => (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.membership || "会员订单"}</strong>
                      <p className="personal-meta">{item.orderNo} · {formatDateTime(item.createdAt)}</p>
                    </div>
                    <span className={`archive-pill ${item.orderStatus === "PAID" ? "status-ready" : "status-in_progress"}`}>
                      {item.orderStatus}
                    </span>
                  </div>
                  <div className="personal-grid">
                    <div>
                      <span>订单号</span>
                      <strong className="mono-text">{item.orderNo}</strong>
                    </div>
                    <div>
                      <span>会员等级</span>
                      <strong>{item.membership || "无"}</strong>
                    </div>
                    <div>
                      <span>支付金额</span>
                      <strong>{item.amountYuan} 元</strong>
                    </div>
                    <div>
                      <span>支付时间</span>
                      <strong>{formatDateTime(item.paidAt)}</strong>
                    </div>
                  </div>
                </article>
              ))}
              {!filteredMembershipOrders.length ? <p className="empty-state">当前没有匹配的会员订单记录。</p> : null}
            </div>
          ) : activeTab === "recharge" ? (
            <div className="personal-list">
              <div className="personal-actions">
                <Link href="/points-purchase" className="primary-button">
                  创建充值订单
                </Link>
              </div>
              {filteredRechargeOrders.map((item) => (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.pointsAmount || 0} 点充值</strong>
                      <p className="personal-meta">{item.orderNo} · {formatDateTime(item.createdAt)}</p>
                    </div>
                    <span className={`archive-pill ${item.orderStatus === "PAID" ? "status-ready" : "status-in_progress"}`}>
                      {item.orderStatus}
                    </span>
                  </div>
                  <div className="personal-grid">
                    <div>
                      <span>订单号</span>
                      <strong className="mono-text">{item.orderNo}</strong>
                    </div>
                    <div>
                      <span>充值点数</span>
                      <strong>{item.pointsAmount || 0}</strong>
                    </div>
                    <div>
                      <span>支付金额</span>
                      <strong>{item.amountYuan} 元</strong>
                    </div>
                    <div>
                      <span>支付时间</span>
                      <strong>{formatDateTime(item.paidAt)}</strong>
                    </div>
                  </div>
                </article>
              ))}
              {!filteredRechargeOrders.length ? <p className="empty-state">当前没有匹配的充值订单记录。</p> : null}
            </div>
          ) : activeTab === "tasks" ? (
            <div className="personal-list">
              {filteredTasks.map((task) => (
                <article className="entity-card personal-card" key={task.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{task.taskTitle}</strong>
                      <p className="personal-meta">{task.taskType} · {task.modelName || "未指定模型"}</p>
                    </div>
                    <span className={`archive-pill ${statusClassMap[task.taskStatus]}`}>{task.taskStatus}</span>
                  </div>
                  <div className="personal-grid">
                    <div>
                      <span>品牌 ID</span>
                      <strong>{task.brandId || "未绑定品牌"}</strong>
                    </div>
                    <div>
                      <span>积分消耗</span>
                      <strong>{task.pointsCost}</strong>
                    </div>
                    <div>
                      <span>创建时间</span>
                      <strong>{formatDateTime(task.createdAt)}</strong>
                    </div>
                    <div>
                      <span>最近更新时间</span>
                      <strong>{formatDateTime(task.updatedAt)}</strong>
                    </div>
                  </div>
                  <div className="personal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleRetry(task.id)}
                      disabled={Boolean(isRetryingId) || task.taskStatus === "RUNNING"}
                    >
                      {isRetryingId === task.id ? "重试中..." : "再次运行"}
                    </button>
                  </div>
                </article>
              ))}
              {!filteredTasks.length ? <p className="empty-state">当前没有匹配的任务记录。</p> : null}
            </div>
          ) : (
            <div className="personal-list">
              <div className="works-filter-toolbar">
                <strong>日期:</strong>
                <button type="button" className="filter-chip is-active">全部</button>
                <button type="button" className="filter-chip">今日</button>
                <button type="button" className="filter-chip">昨天</button>
                <button type="button" className="filter-chip">最近一周</button>
                <button type="button" className="filter-chip">指定日期</button>
              </div>

              <div className="works-action-toolbar">
                <button type="button" className="action-chip is-primary">新建分组</button>
                <button type="button" className="action-chip is-primary">管理分组</button>
                <button type="button" className="action-chip is-primary">上传图片</button>
              </div>

              <div className="personal-actions">
                <Link href="/xiaohongshu" className="primary-button">
                  去小红书工作台
                </Link>
              </div>

              {filteredXiaohongshuMedia.length ? (
                <>
                  <div className="card-grid">
                    <article className="metric-card">
                      <span>小红书作品</span>
                      <strong>{filteredXiaohongshuMedia.length}</strong>
                      <p>这里优先展示和小红书主链路直接相关的作品产出。</p>
                    </article>
                    <article className="metric-card">
                      <span>笔记 HTML</span>
                      <strong>{filteredXiaohongshuMedia.filter((item) => item.mediaType === "HTML").length}</strong>
                      <p>可继续进入小红书工作台确认正文、话题和发布内容。</p>
                    </article>
                    <article className="metric-card">
                      <span>封面素材</span>
                      <strong>{filteredXiaohongshuMedia.filter((item) => item.mediaType === "IMAGE").length}</strong>
                      <p>用于和图文笔记搭配展示，提高作品的完整度。</p>
                    </article>
                    <article className="metric-card">
                      <span>最近产出</span>
                      <strong>{formatDateTime(filteredXiaohongshuMedia[0]?.createdAt)}</strong>
                      <p>最新一条小红书作品已支持回跳到工作台做详情预览。</p>
                    </article>
                  </div>

                  <article className="entity-card personal-card">
                    <div className="entity-card-head">
                      <div>
                        <strong>小红书作品专区</strong>
                        <p className="personal-meta">这里优先承接“品牌增长策略 - 小红书 - 个人中心”的前台 MVP 闭环。</p>
                      </div>
                      <span className="archive-pill status-ready">已同步</span>
                    </div>
                    <div className="personal-list">
                      {filteredXiaohongshuMedia.map((item) => (
                        <article className="entity-card personal-card" key={item.id}>
                          <div className="entity-card-head">
                            <div>
                              <strong>{item.title}</strong>
                              <p className="personal-meta">{item.mediaType} · {item.mimeType || "未记录 MIME"}</p>
                            </div>
                            <div className="personal-actions">
                              <span className="archive-pill status-ready">{item.mediaType}</span>
                              <Link href={`/xiaohongshu?workId=${encodeURIComponent(item.id)}`} className="secondary-button">
                                预览作品
                              </Link>
                            </div>
                          </div>
                          <div className="personal-grid">
                            <div>
                              <span>品牌 ID</span>
                              <strong>{item.brandId || "未绑定品牌"}</strong>
                            </div>
                            <div>
                              <span>关联任务</span>
                              <strong>{item.taskId || "未绑定任务"}</strong>
                            </div>
                            <div className="field-full">
                              <span>存储路径</span>
                              <strong className="mono-text">{item.storageKey}</strong>
                            </div>
                            <div>
                              <span>创建时间</span>
                              <strong>{formatDateTime(item.createdAt)}</strong>
                            </div>
                            <div>
                              <span>源地址</span>
                              <strong className="mono-text">{item.sourceUrl || "无"}</strong>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                </>
              ) : null}

              {filteredOtherMedia.map((item) => (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.title}</strong>
                      <p className="personal-meta">{item.mediaType} · {item.mimeType || "未记录 MIME"}</p>
                    </div>
                    <div className="personal-actions">
                      <span className="archive-pill status-ready">{item.mediaType}</span>
                    </div>
                  </div>
                  <div className="personal-grid">
                    <div>
                      <span>品牌 ID</span>
                      <strong>{item.brandId || "未绑定品牌"}</strong>
                    </div>
                    <div>
                      <span>关联任务</span>
                      <strong>{item.taskId || "未绑定任务"}</strong>
                    </div>
                    <div className="field-full">
                      <span>存储路径</span>
                      <strong className="mono-text">{item.storageKey}</strong>
                    </div>
                    <div>
                      <span>创建时间</span>
                      <strong>{formatDateTime(item.createdAt)}</strong>
                    </div>
                    <div>
                      <span>源地址</span>
                      <strong className="mono-text">{item.sourceUrl || "无"}</strong>
                    </div>
                  </div>
                </article>
              ))}
              {!filteredMedia.length && activeTab === "works" ? <div className="empty-canvas-box">暂无素材，请上传图片</div> : null}
              {!filteredMedia.length ? <p className="empty-state">当前没有匹配的作品记录。</p> : null}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function sortByUpdatedAtDesc(a: TaskRecord, b: TaskRecord) {
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

function formatDateTime(value?: string) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const statusClassMap: Record<TaskRecord["taskStatus"], string> = {
  PENDING: "status-pending",
  QUEUED: "status-in_progress",
  RUNNING: "status-in_progress",
  SUCCESS: "status-ready",
  FAILED: "status-pending",
  CANCELLED: "status-pending",
};

function getSearchPlaceholder(activeTab: PersonalTab) {
  if (activeTab === "profile") {
    return "会员信息无需搜索";
  }

  if (activeTab === "points") {
    return "搜索变动类型、说明、关联任务";
  }

  if (activeTab === "orders") {
    return "搜索订单号、会员等级、订单状态";
  }

  if (activeTab === "recharge") {
    return "搜索订单号、充值点数、订单状态";
  }

  if (activeTab === "tasks") {
    return "搜索任务名称、任务类型、模型名";
  }

  return "搜索作品名称、类型、存储路径";
}

function getTabCountLabel(
  activeTab: PersonalTab,
  pointCount: number,
  orderCount: number,
  rechargeCount: number,
  taskCount: number,
  mediaCount: number,
) {
  if (activeTab === "profile") {
    return "1 个账号";
  }

  if (activeTab === "points") {
    return `${pointCount} 条流水`;
  }

  if (activeTab === "orders") {
    return `${orderCount} 笔订单`;
  }

  if (activeTab === "recharge") {
    return `${rechargeCount} 笔充值`;
  }

  if (activeTab === "tasks") {
    return `${taskCount} 条任务`;
  }

  return `${mediaCount} 个作品`;
}

function isReferenceTabActive(activeTab: PersonalTab, label: string, key: PersonalTab) {
  if (activeTab === "profile" && label === "我的会员") {
    return true;
  }

  if (activeTab === "tasks" && label === "任务记录") {
    return true;
  }

  if (activeTab === "works" && label === "我的素材库") {
    return true;
  }

  return activeTab === key && ["我的人设", "分销推广", "我的优惠券", "密码管理", "我的创作信息模板", "我的标题库", "发布记"].includes(label);
}

function isXiaohongshuWork(item: MediaRecord) {
  return item.title.includes("小红书") || item.storageKey.includes("xiaohongshu");
}

function isAuthFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return ["请先登录", "登录态", "访问凭证", "refresh token", "Unauthorized", "401"].some((keyword) => message.includes(keyword));
}

function buildLoginPath() {
  return `/login?next=${encodeURIComponent("/personal-center")}`;
}
