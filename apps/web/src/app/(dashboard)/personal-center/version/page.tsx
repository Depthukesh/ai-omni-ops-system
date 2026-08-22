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
  const updateSource = status?.source || null;
  const guideOnlyMode = updateSource?.executionMode === "guide-only";
  const updateGuide = latestRelease?.updateGuide || null;
  const isCurrentAlignedWithLatest =
    Boolean(currentBuild && latestRelease)
    && (
      (Boolean(currentBuild?.releaseTag) && currentBuild?.releaseTag === latestRelease?.tagName)
      || (Boolean(currentBuild?.version) && Boolean(latestRelease?.appVersion) && currentBuild?.version === latestRelease?.appVersion)
      || (!status?.updateAvailable && status?.phase === "SUCCEEDED")
    );
  const hasPreparedPackage =
    Boolean(status?.downloadedReleaseTag)
    && status?.downloadedReleaseTag === latestRelease?.tagName
    && status?.phase === "READY_TO_APPLY"
    && !isCurrentAlignedWithLatest;
  const updateFlowBusy = status?.phase === "DOWNLOADING" || status?.phase === "APPLYING";
  const canDownload =
    Boolean(status?.supported)
    && !guideOnlyMode
    && Boolean(currentBuild?.canApplyUpdate)
    && Boolean(latestRelease?.zipAsset)
    && Boolean(latestRelease?.checksumValue)
    && !isCurrentAlignedWithLatest
    && !updateFlowBusy
    && Boolean(status?.updateAvailable || hasPreparedPackage);
  const canApply =
    Boolean(status?.supported)
    && !guideOnlyMode
    && Boolean(currentBuild?.canApplyUpdate)
    && Boolean(latestRelease?.zipAsset)
    && Boolean(latestRelease?.checksumValue)
    && !isCurrentAlignedWithLatest
    && !updateFlowBusy
    && Boolean(status?.updateAvailable || hasPreparedPackage);

  const statusPillClass = resolveStatusPillClass(status?.phase);
  const currentPackageName = currentBuild?.releaseTag || currentBuild?.buildName || "未识别打包名称";
  const latestVersionNumber = latestRelease?.appVersion || currentBuild?.version || "-";
  const latestPackageName = latestRelease?.tagName || "未获取打包名称";
  const methodGuideSummary = guideOnlyMode
    ? latestRelease?.summary || (status?.updateAvailable
      ? "检测到 Docker 标准运行态新版本，请按下面的 git pull、容器重建和 Skill 同步步骤完成更新。"
      : "当前版本已同步；后续有新版本时，这里会继续展示 git pull、容器重建和 Skill 同步方法。")
    : status?.updateAvailable
      ? "建议先检查更新，再预下载安装包并执行一键升级。升级完成后，系统会自动重启本地工作台。"
      : "当前已经是最新版本；后续检测到新版本时，仍按“检查更新 -> 预下载安装包 -> 立即升级”完成更新。";
  const methodGuideCommands = guideOnlyMode
    ? (updateGuide?.commands.length
      ? updateGuide.commands
      : [
          "git pull",
          "docker compose -f docker/docker-compose.local-postgres-mixedcut.yml up -d --build server web",
          "若本次更新涉及 mixedcut，再执行：docker compose -f docker/docker-compose.local-postgres-mixedcut.yml --profile mixedcut up -d --build mixedcut",
          "若本次更新涉及 Skill ZIP，请从 OpenClaw 安装中心重新下载最新 skill-package.zip 并重新导入客户端",
        ])
    : [
        "点击“检查更新”读取最新发布信息。",
        "点击“预下载安装包”完成下载和 SHA256 校验。",
        "点击“立即升级”后，系统会自动停止当前本地工作台、替换安装目录并重启。",
        "等待页面恢复后，再回来确认当前版本号已经更新。",
      ];
  const methodGuideNotices = guideOnlyMode
    ? (updateGuide?.notices.length
      ? updateGuide.notices
      : [
          "Docker 标准运行态只负责通知和引导，不会直接替你升级容器。",
          "如果本次更新涉及 mixedcut 或 Skill ZIP，请按页面提示完成额外同步，避免主站与 OpenClaw 版本不一致。",
        ])
    : [
        "升级期间不要重复点击按钮；页面短暂断开通常表示升级进程已经接管。",
        "如果页面进入自动重试状态，等待本地工作台重启完成后再刷新确认即可。",
      ];
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
          <p className="panel-subtext">
            {guideOnlyMode
              ? "这里统一查看当前版本、远端更新清单，并按指引执行 git pull、重建容器和 Skill 包同步。"
              : "这里统一查看当前版本、最新版本，并直接完成检查、下载和升级。"}
          </p>
        </div>
        <span>{updateSource?.label || "更新源"}</span>
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
        {!guideOnlyMode ? (
          <>
            <button type="button" className="secondary-button" onClick={() => void handleDownload()} disabled={!canDownload || isLoading || isChecking || isDownloading || isApplying}>
              {isDownloading ? "下载中..." : "预下载安装包"}
            </button>
            <button type="button" className="primary-button" onClick={() => void handleApply()} disabled={!canApply || isLoading || isChecking || isDownloading || isApplying}>
              {status?.phase === "APPLYING" ? "升级进行中..." : isApplying ? "升级中..." : "立即升级"}
            </button>
          </>
        ) : null}
      </div>
      {status?.phase === "APPLYING" && !guideOnlyMode ? (
        <p className="panel-subtext" style={{ marginTop: -6, marginBottom: 16 }}>
          升级在后台静默执行，不会弹出 PowerShell 窗口；慢机器在“替换安装目录”阶段可能会更久，只要状态还在刷新就表示仍在继续，请不要重复点击。
        </p>
      ) : null}

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
            <span className="panel-subtext">
              {currentBuild?.runtimeMode === "local-single-user" ? "安装态自动升级" : "标准运行态更新指引"}
            </span>
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

      <article className="entity-card" style={{ marginBottom: 16 }}>
        <div className="entity-card-head">
          <div>
            <strong>{guideOnlyMode ? "Docker 更新方法" : "安装态更新方法"}</strong>
          </div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <p className="panel-subtext" style={{ margin: 0 }}>
            {methodGuideSummary}
          </p>

          {guideOnlyMode && updateGuide ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {updateGuide.requires.server ? <span className="archive-pill status-in_progress">需重建 server</span> : null}
              {updateGuide.requires.web ? <span className="archive-pill status-in_progress">需重建 web</span> : null}
              {updateGuide.requires.mixedcut ? <span className="archive-pill status-in_progress">需重建 mixedcut</span> : null}
              {updateGuide.requires.skillPackage ? <span className="archive-pill status-in_progress">需重导 Skill ZIP</span> : null}
              {updateGuide.requires.migration ? <span className="archive-pill status-pending">含数据迁移</span> : null}
              {!updateGuide.requires.server && !updateGuide.requires.web && !updateGuide.requires.mixedcut && !updateGuide.requires.skillPackage && !updateGuide.requires.migration ? (
                <span className="archive-pill status-paused">本次未声明额外动作</span>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 15 }}>建议操作步骤</strong>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.7 }}>
              {methodGuideCommands.map((item, index) => `${index + 1}. ${item}`).join("\n")}
            </pre>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 15 }}>更新提醒</strong>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              {methodGuideNotices.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          {guideOnlyMode && (updateGuide?.changeLogUrl || updateGuide?.skillPackageUrl) ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {updateGuide.changeLogUrl ? (
                <a href={updateGuide.changeLogUrl} target="_blank" rel="noreferrer" className="secondary-button" style={{ textDecoration: "none" }}>
                  查看更新说明
                </a>
              ) : null}
              {updateGuide.skillPackageUrl ? (
                <a href={updateGuide.skillPackageUrl} target="_blank" rel="noreferrer" className="secondary-button" style={{ textDecoration: "none" }}>
                  下载最新 Skill ZIP
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      <article className="entity-card">
        <div className="entity-card-head">
          <div>
            <strong>系统更新日志</strong>
          </div>
        </div>
        {changeLogs.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {changeLogs.map((item, index) => (
              <details
                key={`${item.releaseTag || "log"}-${item.publishedAt}-${index}`}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  background: "rgba(248, 250, 252, 0.9)",
                  overflow: "hidden",
                }}
                open={index === 0}
              >
                <summary
                  style={{
                    listStyle: "none",
                    cursor: "pointer",
                    padding: "14px 16px",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 13, color: "#64748b" }}>{formatDateTime(item.publishedAt)}</div>
                  <strong style={{ fontSize: 15, lineHeight: 1.4 }}>{formatChangeLogVersion(item)}</strong>
                  <div className="panel-subtext" style={{ wordBreak: "break-all" }}>
                    {item.releaseTag || "未记录打包名称"}
                  </div>
                </summary>
                <div style={{ padding: "0 16px 14px" }}>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", lineHeight: 1.7 }}>
                    {item.content}
                  </pre>
                </div>
              </details>
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
      return "已是最新";
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

function formatChangeLogVersion(item: NonNullable<SystemUpdateStatus["latest"]>["changeLogs"][number]) {
  const appVersion = String(item.appVersion || "").trim();
  if (appVersion) {
    return `版本号 ${appVersion}`;
  }
  return "版本号未记录";
}
