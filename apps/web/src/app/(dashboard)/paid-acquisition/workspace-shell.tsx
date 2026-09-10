"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteOpenClawTencentAdLead,
  getOpenClawCreatorMatchWorkspace,
  getOpenClawCreatorTrackingWorkspace,
  getOpenClawTencentAdLeadWorkspace,
  type OpenClawCreatorMatchWorkspace as OpenClawCreatorMatchWorkspaceRecord,
  type OpenClawCreatorTrackingWorkspace as OpenClawCreatorTrackingWorkspaceRecord,
  type OpenClawTencentAdLeadWorkspace as OpenClawTencentAdLeadWorkspaceRecord,
} from "../../../services/openclaw";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { OpenClawCreatorCooperationWorkspace } from "./openclaw-creator-cooperation-workspace";
import { OpenClawTencentAdLeadWorkspace } from "./openclaw-tencent-ad-lead-workspace";

type PaidAcquisitionSectionKey = "tencentAdLead" | "creatorCooperation";
type CreatorCooperationSectionKey = "creatorMatching" | "creatorTracking";

const paidAcquisitionSections: Array<{
  key: PaidAcquisitionSectionKey;
  label: string;
  description: string;
}> = [
  {
    key: "tencentAdLead",
    label: "腾讯投流获客",
    description: "统一查看由 OpenClaw 写入的腾讯投流获客内容，固定展示标题、内容、创建时间与留言入口。",
  },
  {
    key: "creatorCooperation",
    label: "达人合作",
    description: "统一承接达人匹配与达人跟踪两块工作区，由 OpenClaw 基于达人结果池生成候选并持续跟踪合作作品表现。",
  },
];

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

const emptyTencentWorkspace: OpenClawTencentAdLeadWorkspaceRecord = {
  items: [],
  total: 0,
};

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

export function PaidAcquisitionWorkspaceShell() {
  const [activeSection, setActiveSection] = useState<PaidAcquisitionSectionKey>("tencentAdLead");
  const [creatorSection, setCreatorSection] = useState<CreatorCooperationSectionKey>("creatorMatching");
  const [brandId, setBrandId] = useState("");
  const [tencentWorkspace, setTencentWorkspace] = useState<OpenClawTencentAdLeadWorkspaceRecord>(emptyTencentWorkspace);
  const [creatorMatchWorkspace, setCreatorMatchWorkspace] = useState<OpenClawCreatorMatchWorkspaceRecord>(emptyCreatorMatchWorkspace);
  const [creatorTrackingWorkspace, setCreatorTrackingWorkspace] = useState<OpenClawCreatorTrackingWorkspaceRecord>(emptyCreatorTrackingWorkspace);
  const [isLoadingTencent, setIsLoadingTencent] = useState(true);
  const [isLoadingCreatorMatching, setIsLoadingCreatorMatching] = useState(true);
  const [isLoadingCreatorTracking, setIsLoadingCreatorTracking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingRecordId, setDeletingRecordId] = useState("");

  useEffect(() => {
    setBrandId(getStoredCurrentBrandId("") || "");
  }, []);

  const currentSection = useMemo(
    () => paidAcquisitionSections.find((item) => item.key === activeSection) || paidAcquisitionSections[0],
    [activeSection],
  );

  const currentCreatorSection = useMemo(
    () => creatorCooperationSections.find((item) => item.key === creatorSection) || creatorCooperationSections[0],
    [creatorSection],
  );

  const loadTencentWorkspace = useCallback(async () => {
    if (!brandId) {
      setTencentWorkspace(emptyTencentWorkspace);
      setIsLoadingTencent(false);
      setErrorMessage("当前还没有选中的品牌，无法加载投流获客工作台。");
      return;
    }
    setIsLoadingTencent(true);
    try {
      const nextWorkspace = await getOpenClawTencentAdLeadWorkspace(brandId, "paid_acquisition");
      setTencentWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载腾讯投流获客工作台失败。");
    } finally {
      setIsLoadingTencent(false);
    }
  }, [brandId]);

  const loadCreatorMatchingWorkspace = useCallback(async () => {
    if (!brandId) {
      setCreatorMatchWorkspace(emptyCreatorMatchWorkspace);
      setIsLoadingCreatorMatching(false);
      setErrorMessage("当前还没有选中的品牌，无法加载达人匹配工作台。");
      return;
    }
    setIsLoadingCreatorMatching(true);
    try {
      const nextWorkspace = await getOpenClawCreatorMatchWorkspace(brandId, "paid_acquisition", 200);
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
      const nextWorkspace = await getOpenClawCreatorTrackingWorkspace(brandId, "paid_acquisition", 200);
      setCreatorTrackingWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载达人跟踪工作台失败。");
    } finally {
      setIsLoadingCreatorTracking(false);
    }
  }, [brandId]);

  useEffect(() => {
    void Promise.all([
      loadTencentWorkspace(),
      loadCreatorMatchingWorkspace(),
      loadCreatorTrackingWorkspace(),
    ]);
  }, [loadTencentWorkspace, loadCreatorMatchingWorkspace, loadCreatorTrackingWorkspace]);

  const handleDeleteRecord = useCallback(async (recordId: string) => {
    if (!brandId) {
      setErrorMessage("当前还没有选中的品牌，无法删除腾讯投流获客记录。");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("确认删除这条腾讯投流获客记录吗？")) {
      return;
    }
    setDeletingRecordId(recordId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawTencentAdLead(recordId, brandId, "paid_acquisition");
      setTencentWorkspace(response.workspace);
      setNotice("腾讯投流获客记录已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除腾讯投流获客记录失败。");
    } finally {
      setDeletingRecordId("");
    }
  }, [brandId]);

  const headerTitle = activeSection === "creatorCooperation" ? `${currentSection.label} · ${currentCreatorSection.label}` : currentSection.label;
  const headerDescription = activeSection === "creatorCooperation" ? currentCreatorSection.description : currentSection.description;
  const isHeaderLoading = activeSection === "tencentAdLead"
    ? isLoadingTencent
    : (creatorSection === "creatorMatching" ? isLoadingCreatorMatching : isLoadingCreatorTracking);

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <aside className="strategy-level-panel strategy-level-panel--directory">
          <div className="strategy-directory-group">
            <div className="strategy-directory-group__title">投流获客板块</div>
            <div className="strategy-level-button-list strategy-level-button-list--nested">
              {paidAcquisitionSections.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`strategy-level-button strategy-level-button--nested ${item.key === activeSection ? "is-active" : ""}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {activeSection === "creatorCooperation" ? (
            <div className="strategy-directory-group" style={{ marginTop: 16 }}>
              <div className="strategy-directory-group__title">达人合作子板块</div>
              <div className="strategy-level-button-list strategy-level-button-list--nested">
                {creatorCooperationSections.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`strategy-level-button strategy-level-button--nested ${item.key === creatorSection ? "is-active" : ""}`}
                    onClick={() => setCreatorSection(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <div className="strategy-content-panel">
          <article className="workspace-panel strategy-page-header">
            <div>
              <strong>{headerTitle}</strong>
              <p>{headerDescription}</p>
            </div>
            <div className="strategy-page-header-actions">
              <div className="workspace-status">
                <span className="archive-pill status-ready">投流获客工作区</span>
                <span className="archive-pill status-ready">OpenClaw 真源</span>
                <span className={`archive-pill ${isHeaderLoading ? "status-in_progress" : "status-ready"}`}>{isHeaderLoading ? "加载中" : "已同步"}</span>
                {notice ? <span className="status-text success-text">{notice}</span> : null}
                {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
              </div>
            </div>
          </article>

          {activeSection === "tencentAdLead" ? (
            <OpenClawTencentAdLeadWorkspace
              sectionLabel={currentSection.label}
              sectionDescription={currentSection.description}
              isLoading={isLoadingTencent}
              canDelete
              items={tencentWorkspace.items}
              deletingRecordId={deletingRecordId}
              onRefresh={loadTencentWorkspace}
              onDelete={handleDeleteRecord}
              formatDateTime={formatDateTime}
            />
          ) : (
            <OpenClawCreatorCooperationWorkspace
              brandId={brandId}
              activeSection={creatorSection}
              onChangeSection={setCreatorSection}
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
          )}
        </div>
      </section>
    </main>
  );
}
