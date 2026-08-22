"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteOpenClawGeoContent,
  deleteOpenClawGeoVisibilityReport,
  getOpenClawGeoContentWorkspace,
  getOpenClawGeoVisibilityReportWorkspace,
  type OpenClawGeoContentType,
  type OpenClawGeoContentWorkspace,
  type OpenClawGeoVisibilityReportWorkspace,
} from "../../../services/openclaw";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { OpenClawGeoContentWorkspace as OpenClawGeoContentWorkspaceView } from "./openclaw-geo-content-workspace";
import { OpenClawGeoVisibilityWorkspace } from "./openclaw-geo-visibility-workspace";
import { ThirdPartyMediaDeliveryWorkspace } from "./third-party-media-delivery-workspace";

type GeoSectionKey =
  | "geoVisibilityReport"
  | "keywordResearch"
  | "siteDiagnosis"
  | "knowledgeBaseSetup"
  | "geoOptimizationPlan"
  | "selfMediaContent"
  | "thirdPartyMedia"
  | "brandWebsiteContent";

const geoSections: Array<{
  key: GeoSectionKey;
  label: string;
  description: string;
  contentType?: OpenClawGeoContentType;
}> = [
  {
    key: "geoVisibilityReport",
    label: "GEO可见度诊断",
    description: "这里汇总 OpenClaw 生成的 GEO 可见度诊断 HTML 报告，支持列表查看、HTML 预览和删除。",
  },
  {
    key: "keywordResearch",
    label: "关键词挖掘",
    description: "一次性生成内容，支持查看 HTML 结果，并展示 XLSX 文档的存储地址。",
    contentType: "keyword_research",
  },
  {
    key: "siteDiagnosis",
    label: "网站诊断",
    description: "一次性生成内容，支持查看 HTML 结果，并展示 DOCX 文档的存储地址。",
    contentType: "site_diagnosis",
  },
  {
    key: "knowledgeBaseSetup",
    label: "知识库搭建",
    description: "一次性生成内容，支持查看 HTML 结果，并展示 Markdown 文档的存储地址。",
    contentType: "knowledge_base_setup",
  },
  {
    key: "geoOptimizationPlan",
    label: "GEO优化方案",
    description: "一次性生成内容，支持查看 HTML 结果，并展示 DOCX 文档的存储地址。",
    contentType: "geo_optimization_plan",
  },
  {
    key: "selfMediaContent",
    label: "自媒体内容",
    description: "多次生成列表，支持查看 HTML 结果，并展示 DOCX 文档的存储地址。",
    contentType: "self_media_content",
  },
  {
    key: "thirdPartyMedia",
    label: "第三方媒体",
    description: "多次生成列表，支持查看 HTML 结果，并展示 DOCX 文档的存储地址。",
    contentType: "third_party_media",
  },
  {
    key: "brandWebsiteContent",
    label: "品牌网站",
    description: "多次生成列表，支持查看 HTML 结果，并展示 DOCX 文档的存储地址。",
    contentType: "brand_website_content",
  },
];

const emptyWorkspace: OpenClawGeoVisibilityReportWorkspace = {
  items: [],
  total: 0,
};

const emptyGeoContentWorkspace: OpenClawGeoContentWorkspace = {
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
  const [geoContentWorkspace, setGeoContentWorkspace] = useState<OpenClawGeoContentWorkspace>(emptyGeoContentWorkspace);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingReportId, setDeletingReportId] = useState("");
  const [deletingContentId, setDeletingContentId] = useState("");

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
      setGeoContentWorkspace(emptyGeoContentWorkspace);
      setIsLoading(false);
      setErrorMessage("当前还没有选中的品牌，无法加载 GEO 工作台。");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      if (currentSection.key === "geoVisibilityReport") {
        const nextWorkspace = await getOpenClawGeoVisibilityReportWorkspace(brandId, "geo");
        setWorkspace(nextWorkspace);
        setGeoContentWorkspace(emptyGeoContentWorkspace);
      } else if (currentSection.contentType) {
        const nextWorkspace = await getOpenClawGeoContentWorkspace(brandId, "geo", currentSection.contentType);
        setGeoContentWorkspace(nextWorkspace);
        setWorkspace(emptyWorkspace);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载 GEO 工作台失败。");
    } finally {
      setIsLoading(false);
    }
  }, [brandId, currentSection]);

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

  const handleDeleteContent = useCallback(async (contentId: string) => {
    if (!brandId || !currentSection.contentType) {
      setErrorMessage("当前还没有选中的品牌或内容板块，无法删除 GEO 内容。");
      return;
    }
    setDeletingContentId(contentId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawGeoContent(contentId, brandId, "geo", currentSection.contentType);
      setGeoContentWorkspace(response.workspace);
      setNotice(`${currentSection.label}内容已删除。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `删除${currentSection.label}失败。`);
    } finally {
      setDeletingContentId("");
    }
  }, [brandId, currentSection]);

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <aside className="strategy-level-panel strategy-level-panel--directory">
          <div className="strategy-directory-group">
            <div className="strategy-directory-group__title">GEO获客板块</div>
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
                <span className="archive-pill status-ready">GEO获客工作区</span>
                <span className={`archive-pill ${isLoading ? "status-in_progress" : "status-ready"}`}>{isLoading ? "加载中" : "已同步"}</span>
                {notice ? <span className="status-text success-text">{notice}</span> : null}
                {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
              </div>
            </div>
          </article>

          {currentSection.key === "geoVisibilityReport" ? (
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
          ) : (
            <>
              <OpenClawGeoContentWorkspaceView
                sectionLabel={currentSection.label}
                sectionDescription={currentSection.description}
                isLoading={isLoading}
                canDelete
                items={geoContentWorkspace.items}
                deletingContentId={deletingContentId}
                onRefresh={loadWorkspace}
                onDelete={handleDeleteContent}
                formatDateTime={formatDateTime}
              />
              {currentSection.key === "thirdPartyMedia" ? (
                <ThirdPartyMediaDeliveryWorkspace
                  brandId={brandId}
                  articles={geoContentWorkspace.items}
                  formatDateTime={formatDateTime}
                />
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
