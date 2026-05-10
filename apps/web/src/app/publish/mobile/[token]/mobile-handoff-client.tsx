"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

type MobileSessionPayload = {
  taskId: string;
  token: string;
  status: "QUEUED" | "SUCCESS" | "FAILED";
  title: string;
  content: string;
  imageUrls: string[];
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

  async function handleOneClickHandoff() {
    setActionState("preparing");
    setActionMessage("正在准备标题、正文和配图素材...");

    try {
      await tryCopyText(shareText);

      let files: File[] = [];
      let imageDownloadFailed = false;
      try {
        files = await fetchImageFiles(session.imageUrls, session.title);
      } catch {
        imageDownloadFailed = true;
      }

      const shareSucceeded = await trySystemShare(session.title, shareText, files, session.openAppUrl);

      if (shareSucceeded) {
        await markCompleted(
          resolveApiBaseUrl(apiBaseUrl),
          session.token,
          "SUCCESS",
          imageDownloadFailed
            ? "手机浏览器未能直接下载配图，已退化为分享标题正文并准备打开小红书。"
            : "已从手机端发起系统分享，准备保存到小红书草稿箱。",
        );
        setActionState("success");
        setActionMessage(
          imageDownloadFailed
            ? "当前浏览器未能直接读取配图，已优先分享标题正文。请在分享面板中选择小红书，进入 App 后补选图片再保存草稿。"
            : "系统分享已唤起。请在分享面板中选择小红书，进入 App 后保存到草稿箱。",
        );
        return;
      }

      await tryOpenXiaohongshuApp(session.openAppUrl);
      await markCompleted(resolveApiBaseUrl(apiBaseUrl), session.token, "SUCCESS", "当前浏览器不支持文件分享，已复制文案并尝试拉起小红书。");
      setActionState("success");
      setActionMessage("已复制标题正文，并尝试拉起小红书。请在 App 中选择图片后保存到草稿箱。");
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
      await tryOpenXiaohongshuApp(session.openAppUrl);
      setOpenAppState("idle");
      setActionState("success");
      setActionMessage("已尝试拉起小红书 App。如果当前浏览器拦截了 Scheme，请点击右上角使用系统浏览器打开后重试。");
    } catch (error) {
      setOpenAppState("failed");
      setActionState("error");
      setActionMessage(error instanceof Error ? error.message : "打开小红书失败");
    }
  }

  async function handleCopyAndOpenApp() {
    setCopyOpenState("running");
    try {
      await tryCopyText(shareText);
      await tryOpenXiaohongshuApp(session.openAppUrl);
      setCopiedState("done");
      setCopyOpenState("done");
      setActionState("success");
      setActionMessage("已复制标题正文并打开小红书。现在去小红书新建图文，长按保存下方配图后上传，再把文案粘贴进去即可。");
    } catch (error) {
      setCopyOpenState("failed");
      setActionState("error");
      setActionMessage(error instanceof Error ? error.message : "复制文案并打开小红书失败");
    }
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>一键接力到小红书</h2>
      <p style={styles.description}>
        点击下面按钮后，页面会优先调用手机系统分享，把标题、正文和配图一起交给小红书；如果当前浏览器不支持文件分享，则退化为复制文案并打开小红书 App。
      </p>
      <div style={styles.actionStack}>
        <button type="button" style={styles.primaryButton} onClick={() => void handleOneClickHandoff()} disabled={actionState === "preparing"}>
          {actionState === "preparing" ? "准备中..." : "一键保存到草稿箱"}
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
              ? "已复制并打开小红书"
              : "复制文案并打开小红书"}
        </button>
        <button type="button" style={styles.secondaryButton} onClick={() => void handleCopyText()}>
          {copiedState === "done" ? "标题正文已复制" : copiedState === "failed" ? "复制失败，请手动复制" : "复制标题和正文"}
        </button>
        <button type="button" style={styles.linkButton} onClick={() => void handleOpenApp()} disabled={openAppState === "opening"}>
          {openAppState === "opening" ? "正在打开小红书..." : "仅打开小红书"}
        </button>
      </div>
      {actionMessage ? (
        <p style={actionState === "error" ? styles.errorText : styles.successText}>{actionMessage}</p>
      ) : (
        <p style={styles.helperText}>推荐在手机浏览器中直接点“一键保存到草稿箱”，优先尝试系统分享到小红书。</p>
      )}
      <div style={styles.tipPanel}>
        <strong style={styles.tipTitle}>手机端最佳操作顺序</strong>
        <ol style={styles.tipList}>
          <li>先点“复制文案并打开小红书”。</li>
          <li>进入小红书后新建图文笔记。</li>
          <li>回到本页下方逐张长按保存图片，或点“查看原图”后保存。</li>
          <li>回到小红书粘贴标题正文，再保存到草稿箱。</li>
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

async function tryOpenXiaohongshuApp(openAppUrl: string) {
  const candidates = Array.from(
    new Set(
      [openAppUrl, "xhsdiscover://home", "xhsdiscover://", "xiaohongshu://home", "xiaohongshu://"].filter((item) => Boolean(item?.trim())),
    ),
  );

  if (!candidates.length) {
    throw new Error("当前没有可用的小红书拉起地址。");
  }

  for (const candidate of candidates) {
    attemptOpenUrl(candidate);
    await sleep(500);
    if (document.hidden) {
      return;
    }
  }

  throw new Error("当前浏览器未成功拉起小红书。请尝试在系统浏览器中打开本页，或先复制文案后手动进入小红书。");
}

async function markCompleted(apiBaseUrl: string, token: string, result: "SUCCESS" | "FAILED", note: string) {
  await fetch(`${apiBaseUrl.replace(/\/$/, "")}/publishing/xiaohongshu/mobile-sessions/${encodeURIComponent(token)}/complete`, {
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
