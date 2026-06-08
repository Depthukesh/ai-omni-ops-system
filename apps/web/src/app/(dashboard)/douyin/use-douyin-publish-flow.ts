"use client";

import { useEffect, useState } from "react";
import {
  buildDesktopCreatorLaunchUrl,
  notifyExtensionStartDraft,
  probeDesktopPublisher,
  startDesktopPublisherBridge,
} from "./desktop-publish-bridge";
import { type PlatformAccount } from "../xiaohongshu/shared-types";
import {
  createDouyinDesktopPublishSession,
  type DouyinDesktopPublishSession,
} from "../../../services/publishing";
import { type DouyinPublishableWorkTarget } from "./publish-types";

export function useDouyinPublishFlow(options: {
  brandId: string;
  defaultAccountId?: string;
  platformAccounts: PlatformAccount[];
  onRefreshWorkspace: () => Promise<void>;
  setNotice: (value: string) => void;
  setErrorMessage: (value: string) => void;
}) {
  const [publishingTarget, setPublishingTarget] = useState<DouyinPublishableWorkTarget | null>(null);
  const [publishingAccountValue, setPublishingAccountValue] = useState(options.defaultAccountId || "");
  const [isDesktopExtensionReady, setIsDesktopExtensionReady] = useState(false);
  const [isCreatingDesktopPublishSession, setIsCreatingDesktopPublishSession] = useState(false);
  const [activeDesktopPublishSession, setActiveDesktopPublishSession] = useState<DouyinDesktopPublishSession | null>(null);

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
        options.setNotice("抖音电脑端发布扩展已接管本次任务，正在打开创作者中心并自动上传视频。");
        options.setErrorMessage("");
      },
      onDraftProgress: (note?: string) => {
        const detail = typeof note === "string" && note.trim() ? note.trim() : "抖音电脑端发布扩展正在执行。";
        options.setNotice(detail);
        options.setErrorMessage("");
      },
      onDraftSuccess: () => {
        options.setNotice("抖音电脑端辅助发布已准备完成，视频、标题和描述已自动写入创作者中心，请人工确认后点击发布。");
        options.setErrorMessage("");
        void options.onRefreshWorkspace();
      },
      onDraftFailed: (note?: string) => {
        const detail = typeof note === "string" && note.trim() ? note.trim() : "请检查扩展日志和抖音创作者中心登录状态。";
        options.setErrorMessage(`抖音电脑端辅助发布失败：${detail}`);
        void options.onRefreshWorkspace();
      },
    });
  }, [options]);

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

  function openPublishModal(target: DouyinPublishableWorkTarget) {
    setPublishingTarget(target);
    setPublishingAccountValue(options.defaultAccountId || options.platformAccounts.find((item) => item.platform === "DOUYIN")?.id || "");
    setActiveDesktopPublishSession(null);
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
    setIsCreatingDesktopPublishSession(false);
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
      const result = await createDouyinDesktopPublishSession(options.brandId, publishingTarget.id, {
        accountId: publishingAccountValue || undefined,
      });
      setActiveDesktopPublishSession(result.session);

      const installed = await probeDesktopPublisher({
        timeoutMs: 2400,
        onReady: () => setIsDesktopExtensionReady(true),
        onMissing: () => setIsDesktopExtensionReady(false),
      });
      if (installed) {
        if (creatorPopup && !creatorPopup.closed) {
          creatorPopup.close();
        }
        options.setNotice(`抖音作品「${publishingTarget.title}」的电脑端辅助发布任务已创建，正在自动上传视频并填写发布信息。`);
        notifyExtensionStartDraft(result.session);
      } else {
        const creatorLaunchUrl = buildDesktopCreatorLaunchUrl(result.session);
        if (creatorPopup && !creatorPopup.closed) {
          creatorPopup.location.href = creatorLaunchUrl;
        } else if (typeof window !== "undefined") {
          window.open(creatorLaunchUrl, "_blank", "noopener");
        }
        options.setNotice("已打开抖音创作者中心上传页。若扩展已正确安装，页面会自动接管并填写视频与描述；若未自动执行，请先刷新扩展后重试。");
      }
      await options.onRefreshWorkspace();
    } catch (error) {
      if (creatorPopup && !creatorPopup.closed) {
        creatorPopup.close();
      }
      const message = error instanceof Error ? error.message : "抖音电脑端辅助发布失败";
      options.setErrorMessage(`发布失败：${message}`);
    } finally {
      setIsCreatingDesktopPublishSession(false);
    }
  }

  return {
    publishingTarget,
    publishingAccountValue,
    setPublishingAccountValue,
    isDesktopExtensionReady,
    isCreatingDesktopPublishSession,
    activeDesktopPublishSession,
    openPublishModal,
    closePublishModal,
    createDesktopPublishSession,
  };
}
