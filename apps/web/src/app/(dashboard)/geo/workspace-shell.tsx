"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteOpenClawGeoVisibilityReport,
  getOpenClawGeoVisibilityReportWorkspace,
  type OpenClawGeoVisibilityReportWorkspace,
} from "../../../services/openclaw";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { OpenClawGeoVisibilityWorkspace } from "./openclaw-geo-visibility-workspace";

type GeoSectionKey = "geoVisibilityReport";

const geoSections: Array<{ key: GeoSectionKey; label: string; description: string }> = [
  {
    key: "geoVisibilityReport",
    label: "GEO可见度诊断",
    description: "这里汇总 OpenClaw 生成的 GEO 可见度诊断 HTML 报告，支持列表查看、HTML 预览和删除。",
  },
];

const emptyWorkspace: OpenClawGeoVisibilityReportWorkspace = {
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

export function GeoWorkspaceShell() {
  const [activeSection, setActiveSection] = useState<GeoSectionKey>("geoVisibilityReport");
  const [brandId, setBrandId] = useState("");
  const [workspace, setWorkspace] = useState<OpenClawGeoVisibilityReportWorkspace>(emptyWorkspace);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingReportId, setDeletingReportId] = useState("");

  useEffect(() => {
    setBrandId(getStoredCurrentBrandId("") || "");
  }, []);

  const currentSection = useMemo(
    () => geoSections.find((item) => item.key === activeSection) || geoSections[0],
    [activeSection],
  );

  const loadWorkspace = useCallback(async () => {
    if (!brandId) {
      setWorkspace(emptyWorkspace);
      setIsLoading(false);
      setErrorMessage("当前还没有选中的品牌，无法加载 GEO 工作台。");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const nextWorkspace = await getOpenClawGeoVisibilityReportWorkspace(brandId, "geo");
      setWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载 GEO 工作台失败。");
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleDeleteReport = useCallback(async (reportId: string) => {
    if (!brandId) {
      setErrorMessage("当前还没有选中的品牌，无法删除报告。");
      return;
    }
    setDeletingReportId(reportId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawGeoVisibilityReport(reportId, brandId, "geo");
      setWorkspace(response.workspace);
      setNotice("GEO 可见度诊断报告已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除 GEO 可见度诊断报告失败。");
    } finally {
      setDeletingReportId("");
    }
  }, [brandId]);

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <aside className="strategy-level-panel strategy-level-panel--directory">
          <div className="strategy-directory-group">
            <div className="strategy-directory-group__title">GEO板块</div>
            <div className="strategy-level-button-list strategy-level-button-list--nested">
              {geoSections.map((item) => (
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
                <span className="archive-pill status-ready">GEO 工作区</span>
                <span className={`archive-pill ${isLoading ? "status-in_progress" : "status-ready"}`}>{isLoading ? "加载中" : "已同步"}</span>
                {notice ? <span className="status-text success-text">{notice}</span> : null}
                {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
              </div>
            </div>
          </article>

          <OpenClawGeoVisibilityWorkspace
            sectionLabel={currentSection.label}
            sectionDescription={currentSection.description}
            isLoading={isLoading}
            canDelete
            items={workspace.items}
            deletingReportId={deletingReportId}
            onRefresh={loadWorkspace}
            onDelete={handleDeleteReport}
            formatDateTime={formatDateTime}
          />
        </div>
      </section>
    </main>
  );
}
