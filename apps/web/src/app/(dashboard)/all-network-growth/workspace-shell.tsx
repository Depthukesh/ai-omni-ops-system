"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteOpenClawCommentLead,
  deleteOpenClawPlatformLead,
  getOpenClawCommentLeadWorkspace,
  type OpenClawCommentLeadWorkspace,
  getOpenClawPlatformLeadWorkspace,
  type OpenClawCommentLeadPlatform,
  type OpenClawPlatformLeadWorkspace,
} from "../../../services/openclaw";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { OpenClawCommentLeadWorkspace as OpenClawCommentLeadWorkspaceView } from "./openclaw-comment-lead-workspace";
import { OpenClawPlatformLeadWorkspace as OpenClawPlatformLeadWorkspaceView } from "./openclaw-platform-lead-workspace";

type AllNetworkGrowthSectionKey = "commentLead" | "platformLead";
type PlatformFilter = "all" | OpenClawCommentLeadPlatform;

const allNetworkGrowthSections: Array<{
  key: AllNetworkGrowthSectionKey;
  label: string;
  description: string;
}> = [
  {
    key: "commentLead",
    label: "评论获客",
    description: "统一收口小红书、抖音评论用户名单，按平台查看用户名、评论、入选理由、主页与入选时间。",
  },
  {
    key: "platformLead",
    label: "平台获客",
    description: "统一查看由 OpenClaw 写入的平台获客名单，固定展示名称、业务范围、入选理由、联系方式、地址与入选时间。",
  },
];

const emptyWorkspace: OpenClawCommentLeadWorkspace = {
  items: [],
  total: 0,
};

const emptyPlatformWorkspace: OpenClawPlatformLeadWorkspace = {
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

export function AllNetworkGrowthWorkspaceShell() {
  const [activeSection, setActiveSection] = useState<AllNetworkGrowthSectionKey>("commentLead");
  const [brandId, setBrandId] = useState("");
  const [commentWorkspace, setCommentWorkspace] = useState<OpenClawCommentLeadWorkspace>(emptyWorkspace);
  const [platformWorkspace, setPlatformWorkspace] = useState<OpenClawPlatformLeadWorkspace>(emptyPlatformWorkspace);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingCommentLeadId, setDeletingCommentLeadId] = useState("");
  const [deletingPlatformLeadId, setDeletingPlatformLeadId] = useState("");

  useEffect(() => {
    setBrandId(getStoredCurrentBrandId("") || "");
  }, []);

  const currentSection = useMemo(
    () => allNetworkGrowthSections.find((item) => item.key === activeSection) || allNetworkGrowthSections[0],
    [activeSection],
  );

  const loadWorkspace = useCallback(async () => {
    if (!brandId) {
      setCommentWorkspace(emptyWorkspace);
      setPlatformWorkspace(emptyPlatformWorkspace);
      setIsLoading(false);
      setErrorMessage("当前还没有选中的品牌，无法加载全网获客工作台。");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [nextCommentWorkspace, nextPlatformWorkspace] = await Promise.all([
        getOpenClawCommentLeadWorkspace(
          brandId,
          "all_network_growth",
          platformFilter === "all" ? undefined : platformFilter,
        ),
        getOpenClawPlatformLeadWorkspace(brandId, "all_network_growth"),
      ]);
      setCommentWorkspace(nextCommentWorkspace);
      setPlatformWorkspace(nextPlatformWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载全网获客工作台失败。");
    } finally {
      setIsLoading(false);
    }
  }, [brandId, platformFilter]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleDeleteLead = useCallback(async (leadId: string) => {
    if (!brandId) {
      setErrorMessage("当前还没有选中的品牌，无法删除评论获客记录。");
      return;
    }
    setDeletingCommentLeadId(leadId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawCommentLead(
        leadId,
        brandId,
        "all_network_growth",
        platformFilter === "all" ? undefined : platformFilter,
      );
      setCommentWorkspace(response.workspace);
      setNotice("评论获客记录已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除评论获客记录失败。");
    } finally {
      setDeletingCommentLeadId("");
    }
  }, [brandId, platformFilter]);

  const handleDeletePlatformLead = useCallback(async (leadId: string) => {
    if (!brandId) {
      setErrorMessage("当前还没有选中的品牌，无法删除平台获客记录。");
      return;
    }
    setDeletingPlatformLeadId(leadId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawPlatformLead(leadId, brandId, "all_network_growth");
      setPlatformWorkspace(response.workspace);
      setNotice("平台获客记录已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除平台获客记录失败。");
    } finally {
      setDeletingPlatformLeadId("");
    }
  }, [brandId]);

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <aside className="strategy-level-panel strategy-level-panel--directory">
          <div className="strategy-directory-group">
            <div className="strategy-directory-group__title">全网获客板块</div>
            <div className="strategy-level-button-list strategy-level-button-list--nested">
              {allNetworkGrowthSections.map((item) => (
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
                <span className="archive-pill status-ready">全网获客工作区</span>
                <span className="archive-pill status-ready">OpenClaw 真源</span>
                <span className={`archive-pill ${isLoading ? "status-in_progress" : "status-ready"}`}>{isLoading ? "加载中" : "已同步"}</span>
                {notice ? <span className="status-text success-text">{notice}</span> : null}
                {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
              </div>
            </div>
          </article>

          {activeSection === "commentLead" ? (
            <OpenClawCommentLeadWorkspaceView
              sectionLabel={currentSection.label}
              sectionDescription={currentSection.description}
              isLoading={isLoading}
              canDelete
              items={commentWorkspace.items}
              platformFilter={platformFilter}
              setPlatformFilter={setPlatformFilter}
              deletingLeadId={deletingCommentLeadId}
              onRefresh={loadWorkspace}
              onDelete={handleDeleteLead}
              formatDateTime={formatDateTime}
            />
          ) : (
            <OpenClawPlatformLeadWorkspaceView
              sectionLabel={currentSection.label}
              sectionDescription={currentSection.description}
              isLoading={isLoading}
              canDelete
              items={platformWorkspace.items}
              deletingLeadId={deletingPlatformLeadId}
              onRefresh={loadWorkspace}
              onDelete={handleDeletePlatformLead}
              formatDateTime={formatDateTime}
            />
          )}
        </div>
      </section>
    </main>
  );
}
