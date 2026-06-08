"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { type PlatformAccount } from "../xiaohongshu/shared-types";
import {
  completeDouyinMobilePublishSession,
  createDouyinMobilePublishSession,
  type DouyinMobilePublishSession,
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
  const [isCreatingMobilePublishSession, setIsCreatingMobilePublishSession] = useState(false);
  const [activeMobilePublishSession, setActiveMobilePublishSession] = useState<DouyinMobilePublishSession | null>(null);
  const [mobilePublishQrDataUrl, setMobilePublishQrDataUrl] = useState("");
  const [isCompletingMobilePublishSession, setIsCompletingMobilePublishSession] = useState(false);

  useEffect(() => {
    if (!publishingAccountValue && options.defaultAccountId) {
      setPublishingAccountValue(options.defaultAccountId);
    }
  }, [options.defaultAccountId, publishingAccountValue]);

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

  function openPublishModal(target: DouyinPublishableWorkTarget) {
    setPublishingTarget(target);
    setPublishingAccountValue(options.defaultAccountId || options.platformAccounts.find((item) => item.platform === "DOUYIN")?.id || "");
    setActiveMobilePublishSession(null);
    setMobilePublishQrDataUrl("");
    options.setNotice("");
    options.setErrorMessage("");
  }

  function closePublishModal() {
    setPublishingTarget(null);
    setActiveMobilePublishSession(null);
    setMobilePublishQrDataUrl("");
    setIsCreatingMobilePublishSession(false);
    setIsCompletingMobilePublishSession(false);
  }

  async function createMobilePublishSession() {
    if (!publishingTarget) {
      return;
    }

    setIsCreatingMobilePublishSession(true);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await createDouyinMobilePublishSession(options.brandId, publishingTarget.id, {
        accountId: publishingAccountValue || undefined,
      });
      setActiveMobilePublishSession(result.session);
      options.setNotice(`抖音作品「${publishingTarget.title}」的手机接力二维码已生成。`);
      await options.onRefreshWorkspace();
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成抖音手机接力二维码失败";
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
      const result = await completeDouyinMobilePublishSession(activeMobilePublishSession.token, {
        result: "SUCCESS",
        note: "已在手机端完成抖音接力发布",
      });
      setActiveMobilePublishSession(result.session);
      options.setNotice("已将本次抖音手机接力发布标记为完成。");
      await options.onRefreshWorkspace();
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新抖音发布状态失败";
      options.setErrorMessage(`更新失败：${message}`);
    } finally {
      setIsCompletingMobilePublishSession(false);
    }
  }

  return {
    publishingTarget,
    publishingAccountValue,
    setPublishingAccountValue,
    isCreatingMobilePublishSession,
    activeMobilePublishSession,
    mobilePublishQrDataUrl,
    isCompletingMobilePublishSession,
    openPublishModal,
    closePublishModal,
    createMobilePublishSession,
    completeMobilePublishSession,
  };
}
