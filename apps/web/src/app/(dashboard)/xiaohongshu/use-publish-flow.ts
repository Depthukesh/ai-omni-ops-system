"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  buildDesktopCreatorLaunchUrl,
  notifyExtensionStartDraft,
  probeDesktopPublisher,
  startDesktopPublisherBridge,
} from "./desktop-publish-bridge";
import { type PublishableWorkTarget } from "./publish-types";
import { type PlatformAccount } from "./shared-types";
import {
  completeXiaohongshuMobileDraftSession,
  createXiaohongshuDesktopDraftSession,
  createXiaohongshuMobileDraftSession,
  type XiaohongshuDesktopDraftSession,
  type XiaohongshuMobileDraftSession,
} from "../../../services/publishing";

export function usePublishFlow(options: {
  brandId: string;
  defaultAccountId?: string;
  platformAccounts: PlatformAccount[];
  onRefreshWorkspace: (options?: { preserveMessages?: boolean }) => Promise<void>;
  setNotice: (value: string) => void;
  setErrorMessage: (value: string) => void;
}) {
  const [publishingTarget, setPublishingTarget] = useState<PublishableWorkTarget | null>(null);
  const [publishingAccountValue, setPublishingAccountValue] = useState(options.defaultAccountId || "");
  const [isDesktopExtensionReady, setIsDesktopExtensionReady] = useState(false);
  const [isCreatingDesktopPublishSession, setIsCreatingDesktopPublishSession] = useState(false);
  const [activeDesktopPublishSession, setActiveDesktopPublishSession] = useState<XiaohongshuDesktopDraftSession | null>(null);
  const [isCreatingMobilePublishSession, setIsCreatingMobilePublishSession] = useState(false);
  const [activeMobilePublishSession, setActiveMobilePublishSession] = useState<XiaohongshuMobileDraftSession | null>(null);
  const [mobilePublishQrDataUrl, setMobilePublishQrDataUrl] = useState("");
  const [isCompletingMobilePublishSession, setIsCompletingMobilePublishSession] = useState(false);

  useEffect(() => {
    if (!publishingAccountValue && options.defaultAccountId) {
      setPublishingAccountValue(options.defaultAccountId);
    }
  }, [options.defaultAccountId, publishingAccountValue]);

  useEffect(() => {
    return startDesktopPublisherBridge({
      onReady: () => {
        setIsDesktopExtensionReady(true);
      },
      onDraftStarted: () => {
        options.setNotice("电脑端发布扩展已接管本次发布，正在自动打开小红书创作者中心并写入草稿。");
        options.setErrorMessage("");
      },
      onDraftProgress: (note?: string) => {
        const detail = typeof note === "string" && note.trim() ? note.trim() : "电脑端发布扩展正在执行。";
        options.setNotice(detail);
        options.setErrorMessage("");
      },
      onDraftSuccess: () => {
        options.setNotice("电脑端一键发布已完成，标题、正文和配图已自动写入小红书草稿箱。");
        options.setErrorMessage("");
        void options.onRefreshWorkspace({ preserveMessages: true });
      },
      onDraftFailed: (note?: string) => {
        const detail = typeof note === "string" && note.trim() ? note.trim() : "请检查扩展日志和小红书创作者页是否已登录。";
        options.setErrorMessage(`电脑端一键发布失败：${detail}`);
        void options.onRefreshWorkspace({ preserveMessages: true });
      },
    });
  }, [options]);

  useEffect(() => {
    if (!activeMobilePublishSession?.mobileUrl) {
      setMobilePublishQrDataUrl("");
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(activeMobilePublishSession.mobileUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    })
      .then((value: string) => {
        if (!cancelled) {
          setMobilePublishQrDataUrl(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMobilePublishQrDataUrl("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeMobilePublishSession?.mobileUrl]);

  useEffect(() => {
    if (!publishingTarget || isDesktopExtensionReady) {
      return;
    }
    let cancelled = false;
    const probe = async () => {
      const installed = await probeDesktopPublisher({
        timeoutMs: 2400,
        onReady: () => {
          if (!cancelled) {
            setIsDesktopExtensionReady(true);
          }
        },
        onMissing: () => {
          if (!cancelled) {
            setIsDesktopExtensionReady(false);
          }
        },
      });
      if (!cancelled && installed) {
        setIsDesktopExtensionReady(true);
      }
    };
    void probe();
    const timer = window.setInterval(() => {
      void probe();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isDesktopExtensionReady, publishingTarget]);

  function openPublishModal(target: PublishableWorkTarget) {
    setPublishingTarget(target);
    setPublishingAccountValue(options.defaultAccountId || options.platformAccounts.find((item) => item.platform === "XIAOHONGSHU")?.id || "");
    setActiveDesktopPublishSession(null);
    setActiveMobilePublishSession(null);
    setMobilePublishQrDataUrl("");
    options.setNotice("");
    options.setErrorMessage("");
    void probeDesktopPublisher({
      timeoutMs: 2400,
      onReady: () => setIsDesktopExtensionReady(true),
      onMissing: () => setIsDesktopExtensionReady(false),
    });
  }

  function closePublishModal() {
    setPublishingTarget(null);
    setActiveDesktopPublishSession(null);
    setActiveMobilePublishSession(null);
    setMobilePublishQrDataUrl("");
    setIsCreatingDesktopPublishSession(false);
    setIsCreatingMobilePublishSession(false);
    setIsCompletingMobilePublishSession(false);
  }

  async function createDesktopPublishSession() {
    if (!publishingTarget) {
      return;
    }

    const creatorPopup = typeof window !== "undefined" ? window.open("", "_blank", "noopener") : null;
    setIsCreatingDesktopPublishSession(true);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await createXiaohongshuDesktopDraftSession(options.brandId, publishingTarget.id, {
        accountId: publishingAccountValue || undefined,
      });

      setActiveDesktopPublishSession(result.session);
      const creatorLaunchUrl = buildDesktopCreatorLaunchUrl(result.session);
      if (creatorPopup && !creatorPopup.closed) {
        creatorPopup.location.href = creatorLaunchUrl;
      } else if (typeof window !== "undefined") {
        window.open(creatorLaunchUrl, "_blank", "noopener");
      }

      const installed = await probeDesktopPublisher({
        timeoutMs: 2400,
        onReady: () => setIsDesktopExtensionReady(true),
        onMissing: () => setIsDesktopExtensionReady(false),
      });
      if (installed) {
        options.setNotice(`${publishingTarget.noteCategory}笔记的电脑端一键发布任务已创建，正在自动打开小红书创作者中心并写入草稿箱。`);
        notifyExtensionStartDraft(result.session);
      } else {
        options.setNotice("已直接打开小红书创作者页。若扩展已正常加载，页面会自动接管并写入草稿；若未自动执行，请先重载扩展后重试。");
      }
      await options.onRefreshWorkspace({ preserveMessages: true });
    } catch (error) {
      if (creatorPopup && !creatorPopup.closed) {
        creatorPopup.close();
      }
      const message = error instanceof Error ? error.message : "电脑端一键发布失败";
      options.setErrorMessage(`发布失败：${message}`);
    } finally {
      setIsCreatingDesktopPublishSession(false);
    }
  }

  async function createMobilePublishSession() {
    if (!publishingTarget) {
      return;
    }

    setIsCreatingMobilePublishSession(true);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await createXiaohongshuMobileDraftSession(options.brandId, publishingTarget.id, {
        accountId: publishingAccountValue || undefined,
      });
      setActiveMobilePublishSession(result.session);
      options.setNotice(`${publishingTarget.noteCategory}笔记的手机扫码接力二维码已生成。`);
      await options.onRefreshWorkspace({ preserveMessages: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成手机接力二维码失败";
      options.setErrorMessage(`生成失败：${message}`);
    } finally {
      setIsCreatingMobilePublishSession(false);
    }
  }

  async function completeMobilePublishSession() {
    if (!activeMobilePublishSession?.token) {
      return;
    }

    setIsCompletingMobilePublishSession(true);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await completeXiaohongshuMobileDraftSession(activeMobilePublishSession.token, {
        result: "SUCCESS",
        note: "已在手机端完成草稿接力",
      });
      setActiveMobilePublishSession(result.session);
      options.setNotice("已将本次手机接力保存草稿标记为完成。");
      await options.onRefreshWorkspace({ preserveMessages: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新发布状态失败";
      options.setErrorMessage(`更新失败：${message}`);
    } finally {
      setIsCompletingMobilePublishSession(false);
    }
  }

  return {
    publishingTarget,
    publishingAccountValue,
    setPublishingAccountValue,
    isDesktopExtensionReady,
    isCreatingDesktopPublishSession,
    activeDesktopPublishSession,
    isCreatingMobilePublishSession,
    activeMobilePublishSession,
    mobilePublishQrDataUrl,
    isCompletingMobilePublishSession,
    openPublishModal,
    closePublishModal,
    createDesktopPublishSession,
    createMobilePublishSession,
    completeMobilePublishSession,
  };
}
