"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteOpenClawTencentAdLead,
  getOpenClawTencentAdLeadWorkspace,
  type OpenClawTencentAdLeadWorkspace as OpenClawTencentAdLeadWorkspaceRecord,
} from "../../../services/openclaw";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { OpenClawTencentAdLeadWorkspace } from "./openclaw-tencent-ad-lead-workspace";

type PaidAcquisitionSectionKey = "tencentAdLead";

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
];

const emptyWorkspace: OpenClawTencentAdLeadWorkspaceRecord = {
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
  const [brandId, setBrandId] = useState("");
  const [workspace, setWorkspace] = useState<OpenClawTencentAdLeadWorkspaceRecord>(emptyWorkspace);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadWorkspace = useCallback(async () => {
    if (!brandId) {
      setWorkspace(emptyWorkspace);
      setIsLoading(false);
      setErrorMessage("当前还没有选中的品牌，无法加载投流获客工作台。");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const nextWorkspace = await getOpenClawTencentAdLeadWorkspace(brandId, "paid_acquisition");
      setWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载投流获客工作台失败。");
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

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
      setWorkspace(response.workspace);
      setNotice("腾讯投流获客记录已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除腾讯投流获客记录失败。");
    } finally {
      setDeletingRecordId("");
    }
  }, [brandId]);

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
        </aside>

        <div className="strategy-content-panel">
          <article className="workspace-panel strategy-page-header">
            <div>
              <strong>{currentSection.label}</strong>
              <p>{currentSection.description}</p>
            </div>
            <div className="strategy-page-header-actions">
              <div className="workspace-status">
                <span className="archive-pill status-ready">投流获客工作区</span>
                <span className="archive-pill status-ready">OpenClaw 真源</span>
                <span className={`archive-pill ${isLoading ? "status-in_progress" : "status-ready"}`}>{isLoading ? "加载中" : "已同步"}</span>
                {notice ? <span className="status-text success-text">{notice}</span> : null}
                {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
              </div>
            </div>
          </article>

          <OpenClawTencentAdLeadWorkspace
            sectionLabel={currentSection.label}
            sectionDescription={currentSection.description}
            isLoading={isLoading}
            canDelete
            items={workspace.items}
            deletingRecordId={deletingRecordId}
            onRefresh={loadWorkspace}
            onDelete={handleDeleteRecord}
            formatDateTime={formatDateTime}
          />
        </div>
      </section>
    </main>
  );
}
