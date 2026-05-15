"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import { cancelTask, getTasks, retryTask, taskSeed, type TaskRecord } from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatCollaboratorRoleLabel, formatDateTime, isAuthFailure, personalTaskStatusClassMap } from "../route-helpers";

export default function PersonalCenterTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRecord[]>(taskSeed);
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingId, setIsRetryingId] = useState("");
  const [isCancellingId, setIsCancellingId] = useState("");
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed">("seed");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/tasks"));
      return;
    }

    void loadTasksPage();
  }, [router]);

  async function loadTasksPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [meResult, tasksResult] = await Promise.allSettled([getMe(), getTasks()]);

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

    if (tasksResult.status === "fulfilled") {
      setTasks(tasksResult.value);
      setDataSource(meResult.status === "fulfilled" ? "api" : "seed");
    } else {
      setTasks(taskSeed);
      setDataSource("seed");
      setErrorMessage("任务接口暂不可用，当前展示的是本地演示任务记录。");
    }

    setIsLoading(false);
  }

  async function handleRetry(taskId: string) {
    setIsRetryingId(taskId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await retryTask(taskId);
      setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)).sort(sortByUpdatedAtDesc));
      setNotice(`任务已重新排队：${updated.taskTitle}`);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "任务重试失败";
      setErrorMessage(`重试失败：${message}`);
    } finally {
      setIsRetryingId("");
    }
  }

  async function handleCancel(taskId: string) {
    setIsCancellingId(taskId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await cancelTask(taskId);
      setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)).sort(sortByUpdatedAtDesc));
      setNotice(`任务已取消：${updated.taskTitle}`);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "任务取消失败";
      setErrorMessage(`取消失败：${message}`);
    } finally {
      setIsCancellingId("");
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
      setNotice("品牌工作区已切换，正在刷新任务中心。");
      await loadTasksPage();
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
      router.replace("/?mode=login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "退出登录失败";
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSessionExpired() {
    await logoutSession();
    router.replace(buildPersonalCenterLoginPath("/personal-center/tasks"));
  }

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...tasks]
      .sort(sortByUpdatedAtDesc)
      .filter((item) =>
        !keyword
        || item.taskTitle.toLowerCase().includes(keyword)
        || item.taskType.toLowerCase().includes(keyword)
        || item.modelName.toLowerCase().includes(keyword)
        || (item.brandId ?? "").toLowerCase().includes(keyword),
      );
  }, [search, tasks]);

  const summary = useMemo(
    () => ({
      total: filteredTasks.length,
      running: filteredTasks.filter((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED").length,
      failed: filteredTasks.filter((item) => item.taskStatus === "FAILED").length,
      success: filteredTasks.filter((item) => item.taskStatus === "SUCCESS").length,
    }),
    [filteredTasks],
  );

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>任务中心</h2>
          <p className="panel-subtext">集中查看当前用户在当前品牌工作区下发起的所有大模型任务，并可对失败任务重新排队、对运行中任务手动取消。</p>
        </div>
        <span>{summary.total} 条任务</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
            {dataSource === "api" ? "接口数据" : "演示数据"}
          </span>
          {isLoading ? <span className="status-text">正在加载任务中心数据...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void loadTasksPage()}
          disabled={isLoading || Boolean(isRetryingId) || Boolean(isCancellingId)}
        >
          刷新任务
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
          <span>当前品牌</span>
          <strong>{currentBrand?.brandName || "未绑定品牌"}</strong>
          <p>当前任务列表会跟随品牌工作区切换刷新。</p>
        </article>
        <article className="metric-card">
          <span>运行中</span>
          <strong>{summary.running}</strong>
          <p>包含 `QUEUED` 与 `RUNNING` 两种状态。</p>
        </article>
        <article className="metric-card">
          <span>成功完成</span>
          <strong>{summary.success}</strong>
          <p>用于确认当前产出链路是否稳定收口。</p>
        </article>
        <article className="metric-card">
          <span>失败待重试</span>
          <strong>{summary.failed}</strong>
          <p>可直接在列表中重新排队，便于快速回收失败任务。</p>
        </article>
      </div>

      <div className="personal-toolbar">
        <label className="field personal-search">
          <span>搜索任务</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索任务名称、任务类型、模型名、品牌 ID"
          />
        </label>
        <Link href="/personal-center" className="secondary-button">
          返回个人中心概览
        </Link>
      </div>

      <div className="personal-list" style={{ marginTop: 16 }}>
        {filteredTasks.map((task) => (
          <article className="entity-card personal-card" key={task.id}>
            <div className="entity-card-head">
              <div>
                <strong>{task.taskTitle}</strong>
                <p className="personal-meta">{task.taskType} · {task.modelName || "未指定模型"}</p>
              </div>
              <span className={`archive-pill ${personalTaskStatusClassMap[task.taskStatus]}`}>{task.taskStatus}</span>
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
                disabled={Boolean(isRetryingId) || Boolean(isCancellingId) || (task.taskStatus !== "FAILED" && task.taskStatus !== "CANCELLED")}
              >
                {isRetryingId === task.id ? "重试中..." : "再次运行"}
              </button>
              {canCancelTask(task) ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleCancel(task.id)}
                  disabled={Boolean(isRetryingId) || Boolean(isCancellingId)}
                >
                  {isCancellingId === task.id ? "取消中..." : "取消任务"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!filteredTasks.length ? <p className="empty-state">当前没有匹配的任务记录。</p> : null}
      </div>
    </section>
  );
}

function sortByUpdatedAtDesc(a: TaskRecord, b: TaskRecord) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function canCancelTask(task: TaskRecord) {
  return task.taskStatus === "QUEUED" || task.taskStatus === "RUNNING";
}
