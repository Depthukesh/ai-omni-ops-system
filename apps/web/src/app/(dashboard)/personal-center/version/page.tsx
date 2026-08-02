"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, readAuthSession } from "../../../../services/auth";
import {
  applySystemUpdate,
  checkSystemUpdate,
  downloadSystemUpdate,
  getSystemUpdateStatus,
  type ApplySystemUpdateResult,
  type SystemUpdateStatus,
} from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatDateTime, isAuthFailure, shouldShowVersionWorkspace } from "../route-helpers";

const SYSTEM_UPDATE_STATUS_CACHE_KEY = "aiomniops-system-update-status-cache";

export default function PersonalCenterVersionPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SystemUpdateStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/version"));
      return;
    }

    void loadPage();
  }, [router]);

  useEffect(() => {
    const canRetry =
      Boolean(status?.supported)
      && (
        status?.phase === "APPLYING"
        || status?.phase === "DOWNLOADING"
        || (Boolean(errorMessage) && Boolean(status?.current.canApplyUpdate))
      );
    if (!canRetry) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadPage({ silent: true, keepFeedback: true });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [errorMessage, status?.current.canApplyUpdate, status?.phase, status?.supported]);

  async function loadPage(options?: { silent?: boolean; keepFeedback?: boolean }) {
    if (!options?.silent) {
      setIsLoading(true);
    }
    if (!options?.keepFeedback) {
      setNotice("");
      setErrorMessage("");
    }

    const [meResult, statusResult] = await Promise.allSettled([getMe(), getSystemUpdateStatus()]);

    if (
      (meResult.status === "rejected" && isAuthFailure(meResult.reason))
      || (statusResult.status === "rejected" && isAuthFailure(statusResult.reason))
    ) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/version"));
      return;
    }

    if (statusResult.status === "fulfilled") {
      if (!shouldShowVersionWorkspace(statusResult.value)) {
        router.replace("/personal-center");
        return;
      }
      setStatus(statusResult.value);
      writeCachedStatus(statusResult.value);
      if (options?.silent) {
        setErrorMessage("");
      }
    } else {
      const cachedStatus = readCachedStatus();
      if (cachedStatus && shouldShowVersionWorkspace(cachedStatus)) {
        setStatus(cachedStatus);
        setErrorMessage(resolveTransientLoadError(cachedStatus, statusResult.reason));
      } else {
        setStatus(null);
        setErrorMessage(statusResult.reason instanceof Error ? statusResult.reason.message : "版本信息加载失败");
      }
    }

    setIsLoading(false);
  }

  async function handleCheck() {
    setIsChecking(true);
    setNotice("");
    setErrorMessage("");
    try {
      const nextStatus = await checkSystemUpdate();
      setStatus(nextStatus);
      writeCachedStatus(nextStatus);
      setNotice(nextStatus.message || "已完成最新版本检查。");
    } catch (error) {
      if (isAuthFailure(error)) {
        router.replace(buildPersonalCenterLoginPath("/personal-center/version"));
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "检查更新失败");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    setNotice("");
    setErrorMessage("");
    try {
      const nextStatus = await downloadSystemUpdate();
      setStatus(nextStatus);
      writeCachedStatus(nextStatus);
      setNotice(nextStatus.message || "安装包已下载并校验完成。");
    } catch (error) {
      if (isAuthFailure(error)) {
        router.replace(buildPersonalCenterLoginPath("/personal-center/version"));
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "下载安装包失败");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleApply() {
    if (!status?.current.canApplyUpdate) {
      setErrorMessage(status?.current.applyBlockedReason || "当前环境不支持一键升级");
      return;
    }
    if (!window.confirm("升级会先停止当前本地工作台，再替换安装目录并自动重启。现在开始升级吗？")) {
      return;
    }

    setIsApplying(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await applySystemUpdate();
      applyPendingResult(result);
      setNotice(result.message || "升级进程已启动，当前工作台会自动关闭并重启。");
    } catch (error) {
      if (isAuthFailure(error)) {
        router.replace(buildPersonalCenterLoginPath("/personal-center/version"));
        return;
      }
      const errorText = error instanceof Error ? error.message : "执行升级失败";
      if (typeof errorText === "string" && errorText.includes("Failed to fetch")) {
        applyPendingResult({
          accepted: true,
          phase: "APPLYING",
          message: "升级进程可能已接管当前工作台，页面会自动重试最新状态。",
          updaterRunPath: "",
        });
        setNotice("升级进程可能已启动，当前连接已断开，页面会自动重试状态。");
        return;
      }
      setErrorMessage(errorText);
    } finally {
      setIsApplying(false);
    }
  }

  function applyPendingResult(result: ApplySystemUpdateResult) {
    setStatus((current) => {
      if (!current) {
        return current;
      }
      const nextStatus = {
        ...current,
        phase: result.phase,
        message: result.message,
      };
      writeCachedStatus(nextStatus);
      return nextStatus;
    });
  }

  const latestRelease = status?.latest || null;
  const currentBuild = status?.current || null;
  const isCurrentAlignedWithLatest =
    Boolean(currentBuild && latestRelease)
    && (
      (Boolean(currentBuild?.releaseTag) && currentBuild?.releaseTag === latestRelease?.tagName)
      || (!status?.updateAvailable && status?.phase === "SUCCEEDED")
    );
  const hasPreparedPackage =
    Boolean(status?.downloadedReleaseTag)
    && status?.downloadedReleaseTag === latestRelease?.tagName
    && status?.phase === "READY_TO_APPLY"
    && !isCurrentAlignedWithLatest;
  const canDownload =
    Boolean(status?.supported)
    && Boolean(currentBuild?.canApplyUpdate)
    && Boolean(latestRelease?.zipAsset)
    && Boolean(latestRelease?.checksumValue)
    && !isCurrentAlignedWithLatest
    && Boolean(status?.updateAvailable || hasPreparedPackage);
  const canApply =
    Boolean(status?.supported)
    && Boolean(currentBuild?.canApplyUpdate)
    && Boolean(latestRelease?.zipAsset)
    && Boolean(latestRelease?.checksumValue)
    && !isCurrentAlignedWithLatest
    && Boolean(status?.updateAvailable || hasPreparedPackage);

  const statusPillClass = resolveStatusPillClass(status?.phase);
  const currentPackageName = currentBuild?.releaseTag || currentBuild?.buildName || "未识别打包名称";
  const latestVersionNumber = latestRelease?.appVersion || currentBuild?.version || "-";
  const latestPackageName = latestRelease?.tagName || "未获取打包名称";
  const changeLogs = latestRelease?.changeLogs?.length
    ? latestRelease.changeLogs
    : latestRelease?.body?.trim()
      ? [
          {
            releaseTag: latestRelease.tagName,
            appVersion: latestRelease.appVersion,
            publishedAt: latestRelease.publishedAt,
            content: latestRelease.body.trim(),
          },
        ]
      : [];

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>版本与升级</h2>
          <p className="panel-subtext">这里统一查看当前版本、最新版本，并直接完成检查、下载和升级。</p>
        </div>
        <span>{status?.source?.label || "阿里云 OSS"}</span>
      </div>

      <div className="personal-actions personal-toolbar-cluster" style={{ marginBottom: 16 }}>
        <div className="workspace-status">
          <span className={`archive-pill ${statusPillClass}`}>{formatPhaseLabel(status?.phase)}</span>
          {isLoading ? <span className="status-text">正在加载版本与升级信息...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadPage()} disabled={isLoading || isChecking || isDownloading || isApplying}>
          刷新
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleCheck()} disabled={isLoading || isChecking || isDownloading || isApplying}>
          {isChecking ? "检查中..." : "检查更新"}
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleDownload()} disabled={!canDownload || isLoading || isChecking || isDownloading || isApplying}>
          {isDownloading ? "下载中..." : "预下载安装包"}
        </button>
        <button type="button" className="primary-button" onClick={() => void handleApply()} disabled={!canApply || isLoading || isChecking || isDownloading || isApplying}>
          {isApplying ? "升级中..." : "立即升级"}
        </button>
      </div>

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <article className="entity-card" style={{ padding: 20 }}>
          <div className="entity-card-head" style={{ marginBottom: 12 }}>
            <div>
              <strong>当前版本</strong>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 30, lineHeight: 1.1 }}>{currentBuild?.version || "-"}</strong>
            <p className="panel-subtext" style={{ margin: 0, wordBreak: "break-all" }}>
              {currentPackageName}
            </p>
            <span className="panel-subtext">{formatDateTime(currentBuild?.generatedAt || undefined)}</span>
          </div>
        </article>

        <article className="entity-card" style={{ padding: 20 }}>
          <div className="entity-card-head" style={{ marginBottom: 12 }}>
            <div>
              <strong>最新版本</strong>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 30, lineHeight: 1.1 }}>{latestVersionNumber}</strong>
            <p className="panel-subtext" style={{ margin: 0, wordBreak: "break-all" }}>
              {latestPackageName}
            </p>
            <span className="panel-subtext">{formatDateTime(latestRelease?.publishedAt)}</span>
          </div>
        </article>
      </div>

      <article className="entity-card">
        <div className="entity-card-head">
          <div>
            <strong>系统更新日志</strong>
          </div>
        </div>
        {changeLogs.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {changeLogs.map((item, index) => (
              <article
                key={`${item.releaseTag || "log"}-${item.publishedAt}-${index}`}
                style={{
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  background: "rgba(248, 250, 252, 0.9)",
                }}
              >
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{formatDateTime(item.publishedAt)}</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", lineHeight: 1.7 }}>
                  {item.content}
                </pre>
              </article>
            ))}
          </div>
        ) : (
          <p className="panel-subtext" style={{ margin: 0 }}>
            暂无系统更新日志
          </p>
        )}
      </article>
    </section>
  );
}

function formatPhaseLabel(phase?: string | null) {
  switch (phase) {
    case "AVAILABLE":
      return "检测到新版本";
    case "DOWNLOADING":
      return "正在下载";
    case "READY_TO_APPLY":
      return "已准备安装";
    case "APPLYING":
      return "升级进行中";
    case "SUCCEEDED":
      return "升级成功";
    case "FAILED":
      return "升级失败";
    case "UNSUPPORTED":
      return "当前环境不支持";
    default:
      return "已是最新";
  }
}

function resolveStatusPillClass(phase?: string | null) {
  switch (phase) {
    case "READY_TO_APPLY":
    case "SUCCEEDED":
      return "status-ready";
    case "AVAILABLE":
    case "DOWNLOADING":
    case "APPLYING":
      return "status-in_progress";
    case "FAILED":
    case "UNSUPPORTED":
      return "status-pending";
    default:
      return "status-paused";
  }
}

function readCachedStatus() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(SYSTEM_UPDATE_STATUS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SystemUpdateStatus;
  } catch {
    return null;
  }
}

function writeCachedStatus(status: SystemUpdateStatus) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SYSTEM_UPDATE_STATUS_CACHE_KEY, JSON.stringify(status));
  } catch {
    // Ignore cache write failures; page can still rely on live API.
  }
}

function resolveTransientLoadError(status: SystemUpdateStatus, error: unknown) {
  if (status.phase === "APPLYING") {
    return "本地工作台正在重启，已先展示最近一次升级状态，页面会自动重试。";
  }
  if (status.phase === "DOWNLOADING") {
    return "安装包仍在后台下载，已先展示最近一次升级状态，页面会自动重试。";
  }
  return error instanceof Error ? error.message : "版本信息暂时不可达，已先展示最近一次记录。";
}
