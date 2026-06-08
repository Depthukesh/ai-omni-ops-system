"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

type MobileSessionPayload = {
  taskId: string;
  token: string;
  platform: "XIAOHONGSHU" | "DOUYIN";
  mode: "SAVE_DRAFT" | "PUBLISH_VIDEO";
  channel: "MOBILE_QR";
  status: "QUEUED" | "SUCCESS" | "FAILED";
  title: string;
  content: string;
  imageUrls?: string[];
  videoUrl?: string;
  coverImageUrl?: string;
  hashtags: string[];
  accountName?: string;
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
  openAppUrl: string;
  note?: string;
  accessHint?: string;
};

type MobileHandoffClientProps = {
  session: MobileSessionPayload;
  apiBaseUrl: string;
};

export function MobileHandoffClient({ session, apiBaseUrl }: MobileHandoffClientProps) {
  const [actionState, setActionState] = useState<"idle" | "preparing" | "success" | "error">("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [copiedState, setCopiedState] = useState<"idle" | "done" | "failed">("idle");
  const [openAppState, setOpenAppState] = useState<"idle" | "opening" | "failed">("idle");
  const [copyOpenState, setCopyOpenState] = useState<"idle" | "running" | "done" | "failed">("idle");

  const shareText = useMemo(() => buildShareText(session), [session]);
  const platformLabel = session.platform === "DOUYIN" ? "抖音" : "小红书";
  const primaryActionLabel = session.platform === "DOUYIN" ? "一键接力到抖音" : "一键保存到草稿箱";

  async function handleOneClickHandoff() {
    setActionState("preparing");
    setActionMessage(session.platform === "DOUYIN" ? "正在准备标题、正文和视频素材..." : "正在准备标题、正文和配图素材...");

    try {
      await tryCopyText(shareText);

      let files: File[] = [];
      let mediaDownloadFailed = false;
      try {
        files = await fetchMediaFiles(session);
      } catch {
        mediaDownloadFailed = true;
      }

      const shareSucceeded = await trySystemShare(session.title, shareText, files, session.openAppUrl);

      if (shareSucceeded) {
        await markCompleted(
          resolveApiBaseUrl(apiBaseUrl),
          session.token,
          "SUCCESS",
          session.platform === "DOUYIN"
            ? mediaDownloadFailed
              ? "手机浏览器未能直接下载视频，已退化为分享标题正文并准备打开抖音。"
              : "已从手机端发起系统分享，准备打开抖音完成发布。"
            : mediaDownloadFailed
              ? "手机浏览器未能直接下载配图，已退化为分享标题正文并准备打开小红书。"
              : "已从手机端发起系统分享，准备保存到小红书草稿箱。",
        );
        setActionState("success");
        setActionMessage(
          session.platform === "DOUYIN"
            ? mediaDownloadFailed
              ? "当前浏览器未能直接读取视频，已优先分享标题正文。请在抖音 App 里手动上传下方视频，再补充文案发布。"
              : "系统分享已唤起。请在分享面板中选择抖音，进入 App 后补充话题或定位后发布。"
            : mediaDownloadFailed
              ? "当前浏览器未能直接读取配图，已优先分享标题正文。请在分享面板中选择小红书，进入 App 后补选图片再保存草稿。"
              : "系统分享已唤起。请在分享面板中选择小红书，进入 App 后保存到草稿箱。",
        );
        return;
      }

      await tryOpenPlatformApp(session.platform, session.openAppUrl);
      await markCompleted(
        resolveApiBaseUrl(apiBaseUrl),
        session.token,
        "SUCCESS",
        session.platform === "DOUYIN"
          ? "当前浏览器不支持文件分享，已复制文案并尝试拉起抖音。"
          : "当前浏览器不支持文件分享，已复制文案并尝试拉起小红书。",
      );
      setActionState("success");
      setActionMessage(
        session.platform === "DOUYIN"
          ? "已复制标题正文，并尝试拉起抖音。请在 App 中上传下方视频后完成发布。"
          : "已复制标题正文，并尝试拉起小红书。请在 App 中选择图片后保存到草稿箱。",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "手机一键接力失败";
      setActionState("error");
      setActionMessage(message);
      await markCompleted(resolveApiBaseUrl(apiBaseUrl), session.token, "FAILED", message).catch(() => undefined);
    }
  }

  async function handleCopyText() {
    try {
      await tryCopyText(shareText);
      setCopiedState("done");
    } catch {
      setCopiedState("failed");
    }
  }

  async function handleOpenApp() {
    setOpenAppState("opening");
    try {
      await tryOpenPlatformApp(session.platform, session.openAppUrl);
      setOpenAppState("idle");
      setActionState("success");
      setActionMessage(`已尝试拉起${platformLabel} App。如果当前浏览器拦截了 Scheme，请点击右上角使用系统浏览器打开后重试。`);
    } catch (error) {
      setOpenAppState("failed");
      setActionState("error");
      setActionMessage(error instanceof Error ? error.message : `打开${platformLabel}失败`);
    }
  }

  async function handleCopyAndOpenApp() {
    setCopyOpenState("running");
    try {
      await tryCopyText(shareText);
      await tryOpenPlatformApp(session.platform, session.openAppUrl);
      setCopiedState("done");
      setCopyOpenState("done");
      setActionState("success");
      setActionMessage(
        session.platform === "DOUYIN"
          ? "已复制标题正文并打开抖音。现在去抖音新建作品，下载或分享下方视频后上传，再把文案粘贴进去即可。"
          : "已复制标题正文并打开小红书。现在去小红书新建图文，长按保存下方配图后上传，再把文案粘贴进去即可。",
      );
    } catch (error) {
      setCopyOpenState("failed");
      setActionState("error");
      setActionMessage(error instanceof Error ? error.message : `复制文案并打开${platformLabel}失败`);
    }
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>{session.platform === "DOUYIN" ? "一键接力到抖音" : "一键接力到小红书"}</h2>
      <p style={styles.description}>
        {session.platform === "DOUYIN"
          ? "点击下面按钮后，页面会优先调用手机系统分享，把标题、正文和视频一起交给抖音；如果当前浏览器不支持文件分享，则退化为复制文案并打开抖音 App。"
          : "点击下面按钮后，页面会优先调用手机系统分享，把标题、正文和配图一起交给小红书；如果当前浏览器不支持文件分享，则退化为复制文案并打开小红书 App。"}
      </p>
      <div style={styles.actionStack}>
        <button type="button" style={styles.primaryButton} onClick={() => void handleOneClickHandoff()} disabled={actionState === "preparing"}>
          {actionState === "preparing" ? "准备中..." : primaryActionLabel}
        </button>
        <button
          type="button"
          style={styles.secondaryAccentButton}
          onClick={() => void handleCopyAndOpenApp()}
          disabled={copyOpenState === "running"}
        >
          {copyOpenState === "running"
            ? "正在复制并打开..."
            : copyOpenState === "done"
              ? `已复制并打开${platformLabel}`
              : `复制文案并打开${platformLabel}`}
        </button>
        <button type="button" style={styles.secondaryButton} onClick={() => void handleCopyText()}>
          {copiedState === "done" ? "标题正文已复制" : copiedState === "failed" ? "复制失败，请手动复制" : "复制标题和正文"}
        </button>
        <button type="button" style={styles.linkButton} onClick={() => void handleOpenApp()} disabled={openAppState === "opening"}>
          {openAppState === "opening" ? `正在打开${platformLabel}...` : `仅打开${platformLabel}`}
        </button>
      </div>
      {actionMessage ? (
        <p style={actionState === "error" ? styles.errorText : styles.successText}>{actionMessage}</p>
      ) : (
        <p style={styles.helperText}>
          {session.platform === "DOUYIN"
            ? "推荐在手机浏览器中直接点“一键接力到抖音”，优先尝试系统分享视频到抖音。"
            : "推荐在手机浏览器中直接点“一键保存到草稿箱”，优先尝试系统分享到小红书。"}
        </p>
      )}
      <div style={styles.tipPanel}>
        <strong style={styles.tipTitle}>手机端最佳操作顺序</strong>
        <ol style={styles.tipList}>
          {session.platform === "DOUYIN" ? (
            <>
              <li>先点“复制文案并打开抖音”。</li>
              <li>进入抖音后新建视频作品。</li>
              <li>回到本页下载或分享下方视频，再上传到抖音。</li>
              <li>回到抖音粘贴标题正文，补充话题、定位后完成发布。</li>
            </>
          ) : (
            <>
              <li>先点“复制文案并打开小红书”。</li>
              <li>进入小红书后新建图文笔记。</li>
              <li>回到本页下方逐张长按保存图片，或点“查看原图”后保存。</li>
              <li>回到小红书粘贴标题正文，再保存到草稿箱。</li>
            </>
          )}
        </ol>
      </div>
    </section>
  );
}

function buildShareText(session: MobileSessionPayload) {
  const tags = session.hashtags.map((item) => (item.startsWith("#") ? item : `#${item}`)).join(" ");
  return [session.title, session.content, tags].filter(Boolean).join("\n\n").trim();
}

async function tryCopyText(value: string) {
  if (!value.trim()) {
    return;
  }
  if (!navigator.clipboard?.writeText) {
    throw new Error("当前浏览器不支持自动复制文案，请手动复制。");
  }
  await navigator.clipboard.writeText(value);
}

async function fetchMediaFiles(session: MobileSessionPayload) {
  if (session.platform === "DOUYIN") {
    return fetchVideoFiles(session.videoUrl ? [session.videoUrl] : [], session.title);
  }
  return fetchImageFiles(session.imageUrls || [], session.title);
}

async function fetchImageFiles(imageUrls: string[], title: string) {
  const files: File[] = [];
  for (let index = 0; index < imageUrls.length; index += 1) {
    const url = imageUrls[index];
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载配图失败：${response.status}`);
    }
    const blob = await response.blob();
    const extension = inferExtension(blob.type);
    files.push(new File([blob], `${sanitizeFileName(title)}-${index + 1}.${extension}`, { type: blob.type || "image/png" }));
  }
  return files;
}

async function fetchVideoFiles(videoUrls: string[], title: string) {
  const files: File[] = [];
  for (let index = 0; index < videoUrls.length; index += 1) {
    const url = videoUrls[index];
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载视频失败：${response.status}`);
    }
    const blob = await response.blob();
    const extension = inferVideoExtension(blob.type);
    files.push(new File([blob], `${sanitizeFileName(title)}-${index + 1}.${extension}`, { type: blob.type || "video/mp4" }));
  }
  return files;
}

async function trySystemShare(title: string, text: string, files: File[], openAppUrl: string) {
  if (!navigator.share) {
    return false;
  }

  try {
    if (files.length && typeof navigator.canShare === "function" && navigator.canShare({ files })) {
      await navigator.share({
        title,
        text,
        files,
      });
      return true;
    }

    await navigator.share({
      title,
      text,
      url: openAppUrl,
    });
    return true;
  } catch (error) {
    if (shouldFallbackFromShareError(error)) {
      return false;
    }
    throw error;
  }
}

async function tryOpenPlatformApp(platform: MobileSessionPayload["platform"], openAppUrl: string) {
  const candidates = Array.from(new Set([openAppUrl, ...getPlatformAppCandidates(platform)].filter((item) => Boolean(item?.trim()))));

  if (!candidates.length) {
    throw new Error(`当前没有可用的${platform === "DOUYIN" ? "抖音" : "小红书"}拉起地址。`);
  }

  for (const candidate of candidates) {
    attemptOpenUrl(candidate);
    await sleep(500);
    if (document.hidden) {
      return;
    }
  }

  throw new Error(
    `当前浏览器未成功拉起${platform === "DOUYIN" ? "抖音" : "小红书"}。请尝试在系统浏览器中打开本页，或先复制文案后手动进入${platform === "DOUYIN" ? "抖音" : "小红书"}。`,
  );
}

async function markCompleted(apiBaseUrl: string, token: string, result: "SUCCESS" | "FAILED", note: string) {
  await fetch(`${apiBaseUrl.replace(/\/$/, "")}/publishing/mobile-sessions/${encodeURIComponent(token)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ result, note }),
  });
}

function resolveApiBaseUrl(apiBaseUrl: string) {
  const raw = String(apiBaseUrl || "").trim();
  if (raw && !/127\.0\.0\.1|localhost/.test(raw)) {
    return raw.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return raw || "http://127.0.0.1:3011/api";
}

function shouldFallbackFromShareError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("not allowed") ||
    normalized.includes("denied") ||
    normalized.includes("permission") ||
    normalized.includes("user agent") ||
    normalized.includes("current context") ||
    normalized.includes("aborterror") ||
    normalized.includes("notallowederror")
  );
}

function attemptOpenUrl(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 1200);
}

function sanitizeFileName(value: string) {
  return String(value || "xiaohongshu-note")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 40);
}

function inferExtension(mimeType: string) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
}

function inferVideoExtension(mimeType: string) {
  if (mimeType === "video/quicktime") {
    return "mov";
  }
  if (mimeType === "video/webm") {
    return "webm";
  }
  return "mp4";
}

function getPlatformAppCandidates(platform: MobileSessionPayload["platform"]) {
  if (platform === "DOUYIN") {
    return ["snssdk1128://feed", "snssdk1128://", "aweme://main", "aweme://"];
  }
  return ["xhsdiscover://home", "xhsdiscover://", "xiaohongshu://home", "xiaohongshu://"];
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const styles: Record<string, CSSProperties> = {
  card: {
    maxWidth: "820px",
    margin: "0 auto 16px",
    padding: "20px",
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e3e8f8",
    borderRadius: "24px",
    boxShadow: "0 18px 48px rgba(43, 61, 116, 0.10)",
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: "18px",
    lineHeight: 1.4,
    color: "#17233f",
  },
  description: {
    margin: 0,
    color: "#66738f",
    fontSize: "14px",
    lineHeight: 1.8,
  },
  actionStack: {
    display: "grid",
    gap: "10px",
    marginTop: "16px",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "48px",
    padding: "0 18px",
    borderRadius: "14px",
    border: "none",
    background: "#ff2f56",
    color: "#fff",
    fontWeight: 700,
    fontSize: "15px",
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "44px",
    padding: "0 18px",
    borderRadius: "14px",
    border: "1px solid #d7def2",
    background: "#fff",
    color: "#37445f",
    fontWeight: 700,
    fontSize: "14px",
  },
  secondaryAccentButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "44px",
    padding: "0 18px",
    borderRadius: "14px",
    border: "1px solid #ffd4dd",
    background: "#fff4f7",
    color: "#e33d63",
    fontWeight: 700,
    fontSize: "14px",
  },
  linkButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "44px",
    padding: "0 18px",
    borderRadius: "14px",
    border: "1px solid #d7def2",
    background: "#f7f9ff",
    color: "#5b6dff",
    fontWeight: 700,
    fontSize: "14px",
    textDecoration: "none",
  },
  helperText: {
    margin: "12px 0 0",
    color: "#66738f",
    fontSize: "13px",
    lineHeight: 1.8,
  },
  successText: {
    margin: "12px 0 0",
    color: "#1f8f55",
    fontSize: "13px",
    lineHeight: 1.8,
  },
  errorText: {
    margin: "12px 0 0",
    color: "#c84b31",
    fontSize: "13px",
    lineHeight: 1.8,
  },
  tipPanel: {
    marginTop: "14px",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid #e7ebf8",
    background: "#f8faff",
  },
  tipTitle: {
    display: "block",
    marginBottom: "8px",
    color: "#24314a",
    fontSize: "14px",
  },
  tipList: {
    margin: 0,
    paddingLeft: "18px",
    color: "#5c6884",
    fontSize: "13px",
    lineHeight: 1.9,
  },
};
