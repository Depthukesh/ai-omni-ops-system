"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  async function loadPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

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
    } else {
      setStatus(null);
      setErrorMessage(statusResult.reason instanceof Error ? statusResult.reason.message : "版本信息加载失败");
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
      setErrorMessage(error instanceof Error ? error.message : "执行升级失败");
    } finally {
      setIsApplying(false);
    }
  }

  function applyPendingResult(result: ApplySystemUpdateResult) {
    setStatus((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        phase: result.phase,
        message: result.message,
      };
    });
  }

  const latestRelease = status?.latest || null;
  const currentBuild = status?.current || null;
  const hasPreparedPackage =
    Boolean(status?.downloadedReleaseTag)
    && status?.downloadedReleaseTag === latestRelease?.tagName
    && status?.phase === "READY_TO_APPLY";
  const canDownload =
    Boolean(status?.supported)
    && Boolean(currentBuild?.canApplyUpdate)
    && Boolean(latestRelease?.zipAsset)
    && Boolean(latestRelease?.checksumValue)
    && Boolean(status?.updateAvailable || hasPreparedPackage);
  const canApply =
    Boolean(status?.supported)
    && Boolean(currentBuild?.canApplyUpdate)
    && Boolean(latestRelease?.zipAsset)
    && Boolean(latestRelease?.checksumValue)
    && Boolean(status?.updateAvailable || hasPreparedPackage);

  const summaryCards = useMemo(
    () => [
      {
        label: "当前版本",
        value: currentBuild?.version || "-",
        detail: currentBuild?.buildName || "未识别发布包信息",
      },
      {
        label: "当前构建时间",
        value: formatDateTime(currentBuild?.generatedAt || undefined),
        detail: currentBuild?.generatedAt ? "来自安装包 manifest" : "当前环境尚未携带 release manifest",
      },
      {
        label: "最新 Release",
        value: latestRelease?.tagName || "未获取",
        detail: latestRelease ? formatDateTime(latestRelease.publishedAt) : "当前还没拿到 GitHub 最新发布信息",
      },
      {
        label: "升级状态",
        value: formatPhaseLabel(status?.phase),
        detail: status?.message || "当前没有新的升级状态",
      },
    ],
    [currentBuild?.buildName, currentBuild?.generatedAt, currentBuild?.version, latestRelease, status?.message, status?.phase],
  );

  const statusPillClass = useMemo(() => {
    switch (status?.phase) {
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
  }, [status?.phase]);

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>版本与升级</h2>
          <p className="panel-subtext">当前页专门承接 local-single-user 的版本检查、安装包预下载和一键升级，不再要求用户手工去 GitHub 解压覆盖。</p>
        </div>
        <span>{status?.githubRepo.owner || "allentry"}/{status?.githubRepo.repo || "local-ai-omni-ops-system"}</span>
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
        {summaryCards.map((item) => (
          <article key={item.label} className="metric-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="personal-context-banner">
        <div>
          <strong>{resolveRecommendation(status)}</strong>
          <p>
            当前升级源默认直接读取 GitHub Releases。点击“立即升级”后，系统会在后台下载或复用已校验的安装包，停止旧进程，替换安装目录，再自动重启本地工作台。
          </p>
        </div>
        <div className="personal-context-actions">
          <Link href="/personal-center" className="secondary-button">
            返回个人中心概览
          </Link>
          {latestRelease?.htmlUrl ? (
            <a href={latestRelease.htmlUrl} target="_blank" rel="noreferrer" className="secondary-button">
              打开 GitHub Release
            </a>
          ) : null}
        </div>
      </div>

      <div className="card-grid" style={{ marginTop: 16, marginBottom: 16 }}>
        <article className="entity-card">
          <div className="entity-card-head">
            <div>
              <strong>当前安装态</strong>
              <p className="panel-subtext">这里展示当前运行时是否具备自动升级所需的安装目录和发布包元信息。</p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>运行模式</dt>
              <dd>{currentBuild?.runtimeMode || "-"}</dd>
            </div>
            <div>
              <dt>安装目录</dt>
              <dd style={{ wordBreak: "break-all" }}>{currentBuild?.installRoot || "当前不是安装态"}</dd>
            </div>
            <div>
              <dt>是否可一键升级</dt>
              <dd>{currentBuild?.canApplyUpdate ? "可以" : "暂不支持"}</dd>
            </div>
            <div>
              <dt>阻塞原因</dt>
              <dd>{currentBuild?.applyBlockedReason || "当前环境满足升级前置条件"}</dd>
            </div>
          </dl>
        </article>

        <article className="entity-card">
          <div className="entity-card-head">
            <div>
              <strong>最新发布信息</strong>
              <p className="panel-subtext">默认读取 GitHub 最新 Release，并优先识别标准安装包与对应 SHA256 校验文件。</p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Release 标题</dt>
              <dd>{latestRelease?.name || "未获取"}</dd>
            </div>
            <div>
              <dt>安装包</dt>
              <dd>{latestRelease?.zipAsset?.name || "未找到安装包资源"}</dd>
            </div>
            <div>
              <dt>安装包大小</dt>
              <dd>{formatBytes(latestRelease?.zipAsset?.size)}</dd>
            </div>
            <div>
              <dt>SHA256</dt>
              <dd style={{ wordBreak: "break-all" }}>{latestRelease?.checksumValue || "未获取到校验值"}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="entity-card">
        <div className="entity-card-head">
          <div>
            <strong>升级说明</strong>
            <p className="panel-subtext">预下载只会把安装包落到本地 `updates` 目录，并完成 SHA256 校验；真正替换安装目录只会在点击“立即升级”后发生。</p>
          </div>
        </div>
        <ul className="entity-card-list">
          <li>预下载完成后，会把状态切到“已准备安装”，此时再次点击“立即升级”会直接进入安装阶段。</li>
          <li>升级时会优先停止当前 launcher、API、worker 和 Web 进程，再执行安装脚本覆盖安装目录。</li>
          <li>升级完成后会自动重新拉起 `start-local-single-user.cmd`，无需用户手工回到 GitHub 重新解压。</li>
          <li>如果当前运行的是源码开发态，而不是安装态发布包，页面仍可检查新版本，但不会允许直接一键升级。</li>
        </ul>
      </article>

      {latestRelease?.body?.trim() ? (
        <article className="entity-card" style={{ marginTop: 16 }}>
          <div className="entity-card-head">
            <div>
              <strong>Release 说明</strong>
              <p className="panel-subtext">下面展示的是 GitHub 最新 Release 原始说明，便于在升级前快速确认本次更新内容。</p>
            </div>
          </div>
          <details>
            <summary style={{ cursor: "pointer" }}>展开查看最新 Release 说明</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 12 }}>{latestRelease.body}</pre>
          </details>
        </article>
      ) : null}
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

function resolveRecommendation(status: SystemUpdateStatus | null) {
  if (!status) {
    return "先刷新当前页，确认最新 Release 与当前安装态信息。";
  }
  if (!status.supported) {
    return "当前环境不是 local-single-user 安装态，先检查版本信息，升级仍建议走正式安装包。";
  }
  if (!status.current.canApplyUpdate) {
    return status.current.applyBlockedReason || "当前环境暂不满足一键升级条件。";
  }
  if (status.phase === "READY_TO_APPLY") {
    return "安装包已经校验完成，可以直接点击“立即升级”。";
  }
  if (status.updateAvailable) {
    return "已经检测到新版本，建议先预下载校验，再在方便的时点一键升级。";
  }
  return "当前安装态已经和最新 Release 对齐，可继续正常使用。";
}

function formatBytes(value?: number | null) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return "未记录";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
