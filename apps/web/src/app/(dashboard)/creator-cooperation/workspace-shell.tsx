"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getOpenClawCreatorMatchWorkspace,
  getOpenClawCreatorTrackingWorkspace,
  type OpenClawCreatorMatchWorkspace as OpenClawCreatorMatchWorkspaceRecord,
  type OpenClawCreatorTrackingWorkspace as OpenClawCreatorTrackingWorkspaceRecord,
} from "../../../services/openclaw";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { OpenClawCreatorCooperationWorkspace } from "./openclaw-creator-cooperation-workspace";

type CreatorCooperationSectionKey = "creatorMatching" | "creatorTracking";

const creatorCooperationSections: Array<{
  key: CreatorCooperationSectionKey;
  label: string;
  description: string;
}> = [
  {
    key: "creatorMatching",
    label: "达人匹配",
    description: "OpenClaw 从达人结果池筛出候选达人，补充推荐理由，并支持批量加入合作清单。",
  },
  {
    key: "creatorTracking",
    label: "达人跟踪",
    description: "按达人维度建档，持续管理合作作品数量、自动更新周期、结果评估与再次选择。",
  },
];

const emptyCreatorMatchWorkspace: OpenClawCreatorMatchWorkspaceRecord = {
  items: [],
  total: 0,
};

const emptyCreatorTrackingWorkspace: OpenClawCreatorTrackingWorkspaceRecord = {
  items: [],
  total: 0,
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CreatorCooperationWorkspaceShell() {
  const [activeSection, setActiveSection] = useState<CreatorCooperationSectionKey>("creatorMatching");
  const [brandId, setBrandId] = useState("");
  const [creatorMatchWorkspace, setCreatorMatchWorkspace] = useState<OpenClawCreatorMatchWorkspaceRecord>(emptyCreatorMatchWorkspace);
  const [creatorTrackingWorkspace, setCreatorTrackingWorkspace] = useState<OpenClawCreatorTrackingWorkspaceRecord>(emptyCreatorTrackingWorkspace);
  const [isLoadingCreatorMatching, setIsLoadingCreatorMatching] = useState(true);
  const [isLoadingCreatorTracking, setIsLoadingCreatorTracking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setBrandId(getStoredCurrentBrandId("") || "");
  }, []);

  const currentSection = useMemo(
    () => creatorCooperationSections.find((item) => item.key === activeSection) || creatorCooperationSections[0],
    [activeSection],
  );

  const loadCreatorMatchingWorkspace = useCallback(async () => {
    if (!brandId) {
      setCreatorMatchWorkspace(emptyCreatorMatchWorkspace);
      setIsLoadingCreatorMatching(false);
      setErrorMessage("当前还没有选中的品牌，无法加载达人匹配工作台。");
      return;
    }
    setIsLoadingCreatorMatching(true);
    try {
      const nextWorkspace = await getOpenClawCreatorMatchWorkspace(brandId, "creator_cooperation", 200);
      setCreatorMatchWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载达人匹配工作台失败。");
    } finally {
      setIsLoadingCreatorMatching(false);
    }
  }, [brandId]);

  const loadCreatorTrackingWorkspace = useCallback(async () => {
    if (!brandId) {
      setCreatorTrackingWorkspace(emptyCreatorTrackingWorkspace);
      setIsLoadingCreatorTracking(false);
      setErrorMessage("当前还没有选中的品牌，无法加载达人跟踪工作台。");
      return;
    }
    setIsLoadingCreatorTracking(true);
    try {
      const nextWorkspace = await getOpenClawCreatorTrackingWorkspace(brandId, "creator_cooperation", 200);
      setCreatorTrackingWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载达人跟踪工作台失败。");
    } finally {
      setIsLoadingCreatorTracking(false);
    }
  }, [brandId]);

  useEffect(() => {
    void Promise.all([loadCreatorMatchingWorkspace(), loadCreatorTrackingWorkspace()]);
  }, [loadCreatorMatchingWorkspace, loadCreatorTrackingWorkspace]);

  const isHeaderLoading = activeSection === "creatorMatching" ? isLoadingCreatorMatching : isLoadingCreatorTracking;

  return (
    <main className="archive-shell strategy-shell">
      <article className="workspace-panel strategy-page-header">
        <div>
          <strong>达人合作 · {currentSection.label}</strong>
          <p>{currentSection.description}</p>
        </div>
        <div className="strategy-page-header-actions">
          <div className="workspace-status">
            <span className="archive-pill status-ready">达人合作工作区</span>
            <span className="archive-pill status-ready">OpenClaw 真源</span>
            <span className={`archive-pill ${isHeaderLoading ? "status-in_progress" : "status-ready"}`}>{isHeaderLoading ? "加载中" : "已同步"}</span>
            {notice ? <span className="status-text success-text">{notice}</span> : null}
            {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
          </div>
        </div>
      </article>

      <OpenClawCreatorCooperationWorkspace
        brandId={brandId}
        workspaceScope="creator_cooperation"
        activeSection={activeSection}
        onChangeSection={setActiveSection}
        matchingWorkspace={creatorMatchWorkspace}
        trackingWorkspace={creatorTrackingWorkspace}
        isLoadingMatching={isLoadingCreatorMatching}
        isLoadingTracking={isLoadingCreatorTracking}
        onRefreshMatching={loadCreatorMatchingWorkspace}
        onRefreshTracking={loadCreatorTrackingWorkspace}
        formatDateTime={formatDateTime}
        onNotice={(message) => {
          setNotice(message);
          setErrorMessage("");
        }}
        onError={(message) => {
          setErrorMessage(message);
        }}
      />
    </main>
  );
}
