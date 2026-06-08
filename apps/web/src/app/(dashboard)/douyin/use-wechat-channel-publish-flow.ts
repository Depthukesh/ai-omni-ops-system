"use client";

import { useEffect, useMemo, useState } from "react";
import { type DouyinPublishableWorkTarget } from "./publish-types";
import {
  notifyWechatChannelExtensionStartPublish,
  probeWechatChannelPublisher,
  startWechatChannelPublisherBridge,
  type WechatChannelExtensionProbeResult,
  type WechatChannelPublishSession,
} from "./wechat-channel-publish-bridge";

function buildWechatChannelSession(target: DouyinPublishableWorkTarget): WechatChannelPublishSession {
  return {
    mode: "VIDEO",
    title: target.title,
    content: target.content?.trim() || `${target.sourceLabel || "抖音工作台"} 作品视频号 PoC 验证任务`,
    videoUrl: target.videoUrl,
    imageUrls: [],
  };
}

export function useWechatChannelPublishFlow() {
  const [publishingTarget, setPublishingTarget] = useState<DouyinPublishableWorkTarget | null>(null);
  const [isExtensionReady, setIsExtensionReady] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [probeResult, setProbeResult] = useState<WechatChannelExtensionProbeResult | null>(null);

  const activeSession = useMemo(
    () => (publishingTarget ? buildWechatChannelSession(publishingTarget) : null),
    [publishingTarget],
  );

  useEffect(() => {
    return startWechatChannelPublisherBridge({
      onReady: () => {
        setIsExtensionReady(true);
      },
      onProbeResult: (result) => {
        setProbeResult(result);
        setIsLaunching(false);
        setErrorMessage("");
        setNotice(
          result.ready
            ? `视频号 PoC 探测完成：已命中${result.pageKindLabel}页结构，上传控件 ${result.fileInputCount} 个。`
            : "视频号 PoC 已打开页面，但还没有命中稳定发布结构，请截图当前页面继续调整。",
        );
      },
      onPublishFailed: (note) => {
        setIsLaunching(false);
        setErrorMessage(note?.trim() || "视频号扩展执行失败，请检查扩展是否已加载并放开站点权限。");
      },
    });
  }, []);

  useEffect(() => {
    if (!publishingTarget || isExtensionReady) {
      return;
    }
    let cancelled = false;
    const probe = async () => {
      const installed = await probeWechatChannelPublisher({
        timeoutMs: 2400,
        onReady: () => {
          if (!cancelled) {
            setIsExtensionReady(true);
          }
        },
        onMissing: () => {
          if (!cancelled) {
            setIsExtensionReady(false);
          }
        },
      });
      if (!cancelled && installed) {
        setIsExtensionReady(true);
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
  }, [isExtensionReady, publishingTarget]);

  function openPublishModal(target: DouyinPublishableWorkTarget) {
    setPublishingTarget(target);
    setProbeResult(null);
    setNotice("");
    setErrorMessage("");
    setIsLaunching(false);
    void probeWechatChannelPublisher({
      timeoutMs: 2400,
      onReady: () => setIsExtensionReady(true),
      onMissing: () => setIsExtensionReady(false),
    });
  }

  function closePublishModal() {
    setPublishingTarget(null);
    setProbeResult(null);
    setNotice("");
    setErrorMessage("");
    setIsLaunching(false);
  }

  async function startPublishProbe() {
    if (!publishingTarget) {
      return;
    }

    setIsLaunching(true);
    setProbeResult(null);
    setNotice("");
    setErrorMessage("");

    try {
      const installed = await probeWechatChannelPublisher({
        timeoutMs: 2400,
        onReady: () => setIsExtensionReady(true),
        onMissing: () => setIsExtensionReady(false),
      });
      if (!installed) {
        setErrorMessage("未检测到视频号扩展，请先在 Chrome/Edge 中加载 wechat-channel-publisher 扩展后重试。");
        setIsLaunching(false);
        return;
      }
      setNotice("已打开视频号助手。请在打开的页面手动点击首页右侧“发表视频”，进入真正发布页后，扩展会自动继续探测并回传结果。");
      notifyWechatChannelExtensionStartPublish(buildWechatChannelSession(publishingTarget));
      setIsLaunching(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "视频号 PoC 启动失败。");
      setIsLaunching(false);
    }
  }

  return {
    publishingTarget,
    isExtensionReady,
    isLaunching,
    notice,
    errorMessage,
    probeResult,
    activeSession,
    openPublishModal,
    closePublishModal,
    startPublishProbe,
  };
}
