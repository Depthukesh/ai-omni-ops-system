"use client";

import { useMemo, useState } from "react";
import { DouyinWorkspaceShell, type DouyinSectionKey } from "../douyin/workspace-shell";
import { WechatWorkspaceShell, type WechatSectionKey } from "../wechat/workspace-shell";
import { XiaohongshuWorkspaceShell, type XiaohongshuSectionKey } from "./workspace-shell";

type ContentAcquisitionGroupKey = "xiaohongshu" | "douyin" | "wechat";

type ContentAcquisitionPage =
  | {
      key: string;
      group: "xiaohongshu";
      label: string;
      description: string;
      section: XiaohongshuSectionKey;
    }
  | {
      key: string;
      group: "douyin";
      label: string;
      description: string;
      section: DouyinSectionKey;
    }
  | {
      key: string;
      group: "wechat";
      label: string;
      description: string;
      section: WechatSectionKey;
    };

type ContentAcquisitionGroup = {
  key: ContentAcquisitionGroupKey;
  label: string;
  summary: string;
  pages: ContentAcquisitionPage[];
};

const contentAcquisitionGroups: ContentAcquisitionGroup[] = [
  {
    key: "xiaohongshu",
    label: "某书",
    summary: "把 OpenClaw 上传的 HTML 营销策划方案、素材、计划、复盘、策略优化和作品收口到同一组导航。",
    pages: [
      {
        key: "xiaohongshu-plan",
        group: "xiaohongshu",
        label: "营销策划方案",
        description: "查看 OpenClaw 在某书板块上传的 HTML 营销策划方案，并支持在方案下留言协作。",
        section: "openclawMarketingPlan",
      },
      {
        key: "xiaohongshu-marketing-calendar",
        group: "xiaohongshu",
        label: "营销日历",
        description: "查看某书视角的营销日历，只展示小红书相关选题，并支持 OpenClaw 与用户共同编辑。",
        section: "marketingCalendar",
      },
      {
        key: "xiaohongshu-openclaw-creative-materials",
        group: "xiaohongshu",
        label: "创作素材",
        description: "查看 OpenClaw 在某书板块生成并沉淀的素材，并支持用户在内容下留言。",
        section: "openclawCreativeMaterials",
      },
      {
        key: "xiaohongshu-openclaw-daily-plan",
        group: "xiaohongshu",
        label: "每日计划",
        description: "查看 OpenClaw 在某书板块生成的每日计划，并支持用户在内容下留言。",
        section: "openclawDailyPlan",
      },
      {
        key: "xiaohongshu-openclaw-lobster-diary",
        group: "xiaohongshu",
        label: "每周复盘",
        description: "查看 OpenClaw 在某书板块生成的每周复盘，点击查看后可直接修改并支持在内容下留言。",
        section: "openclawLobsterDiary",
      },
      {
        key: "xiaohongshu-openclaw-strategy-optimization",
        group: "xiaohongshu",
        label: "策略优化记录",
        description: "查看 OpenClaw 在某书板块根据每周复盘生成的策略优化记录，支持查看、编辑、留言和删除。",
        section: "openclawStrategyOptimization",
      },
      {
        key: "xiaohongshu-openclaw-video-works",
        group: "xiaohongshu",
        label: "作品列表",
        description: "查看 OpenClaw 在某书板块沉淀的作品列表，并支持用户在内容下留言。",
        section: "openclawVideoWorks",
      },
    ],
  },
  {
    key: "douyin",
    label: "某音/某号",
    summary: "把 OpenClaw 上传的 HTML 营销策划方案与数字人、RunningHub应用及其它内容板块统一纳入内容获客。",
    pages: [
      {
        key: "douyin-plan",
        group: "douyin",
        label: "营销策划方案",
        description: "查看 OpenClaw 在某音/某号板块上传的 HTML 营销策划方案，并支持在方案下留言协作。",
        section: "openclawMarketingPlan",
      },
      {
        key: "douyin-marketing-calendar",
        group: "douyin",
        label: "营销日历",
        description: "查看某音/某号视角的营销日历，只展示抖音相关选题，并支持 OpenClaw 与用户共同编辑。",
        section: "marketingCalendar",
      },
      {
        key: "douyin-digital-human",
        group: "douyin",
        label: "数字人",
        description: "复用原某音/某号数字人工作区。",
        section: "digitalHuman",
      },
      {
        key: "douyin-runninghub",
        group: "douyin",
        label: "RunningHub应用",
        description: "复用原某音/某号 RunningHub 应用工作区。",
        section: "runningHub",
      },
      {
        key: "douyin-openclaw-creative-materials",
        group: "douyin",
        label: "创作素材",
        description: "查看 OpenClaw 在某音/某号板块生成并沉淀的素材，并支持用户在内容下留言。",
        section: "openclawCreativeMaterials",
      },
      {
        key: "douyin-openclaw-daily-plan",
        group: "douyin",
        label: "每日计划",
        description: "查看 OpenClaw 在某音/某号板块生成的每日计划，并支持用户在内容下留言。",
        section: "openclawDailyPlan",
      },
      {
        key: "douyin-openclaw-lobster-diary",
        group: "douyin",
        label: "每周复盘",
        description: "查看 OpenClaw 在某音/某号板块生成的每周复盘，点击查看后可直接修改并支持在内容下留言。",
        section: "openclawLobsterDiary",
      },
      {
        key: "douyin-openclaw-strategy-optimization",
        group: "douyin",
        label: "策略优化记录",
        description: "查看 OpenClaw 在某音/某号板块根据每周复盘生成的策略优化记录，支持查看、编辑、留言和删除。",
        section: "openclawStrategyOptimization",
      },
      {
        key: "douyin-openclaw-video-works",
        group: "douyin",
        label: "作品列表",
        description: "查看 OpenClaw 在某音/某号板块沉淀的作品列表，并支持用户在内容下留言。",
        section: "openclawVideoWorks",
      },
    ],
  },
  {
    key: "wechat",
    label: "公众号",
    summary: "在公众号下新增独立营销策划方案入口，并把 OpenClaw 回填内容统一纳入同一结构。",
    pages: [
      {
        key: "wechat-openclaw-marketing-plan",
        group: "wechat",
        label: "营销策划方案",
        description: "查看 OpenClaw 在公众号板块上传的 HTML 营销策划方案，并支持在方案下留言协作。",
        section: "openclawMarketingPlan",
      },
      {
        key: "wechat-marketing-calendar",
        group: "wechat",
        label: "营销日历",
        description: "查看公众号视角的营销日历，只展示公众号相关选题，并支持 OpenClaw 与用户共同编辑。",
        section: "marketingCalendar",
      },
      {
        key: "wechat-setup",
        group: "wechat",
        label: "配置初始化",
        description: "复用原公众号配置初始化工作区。",
        section: "setup",
      },
      {
        key: "wechat-workflow",
        group: "wechat",
        label: "创作工作流",
        description: "复用原公众号创作工作流。",
        section: "workflow",
      },
      {
        key: "wechat-history",
        group: "wechat",
        label: "发布历史",
        description: "复用原公众号发布历史工作区。",
        section: "history",
      },
      {
        key: "wechat-openclaw-creative-materials",
        group: "wechat",
        label: "创作素材",
        description: "查看 OpenClaw 在公众号板块生成并沉淀的素材，并支持用户在内容下留言。",
        section: "openclawCreativeMaterials",
      },
      {
        key: "wechat-openclaw-daily-plan",
        group: "wechat",
        label: "每日计划",
        description: "查看 OpenClaw 在公众号板块生成的每日计划，并支持用户在内容下留言。",
        section: "openclawDailyPlan",
      },
      {
        key: "wechat-openclaw-lobster-diary",
        group: "wechat",
        label: "每周复盘",
        description: "查看 OpenClaw 在公众号板块生成的每周复盘，点击查看后可直接修改并支持在内容下留言。",
        section: "openclawLobsterDiary",
      },
      {
        key: "wechat-openclaw-strategy-optimization",
        group: "wechat",
        label: "策略优化记录",
        description: "查看 OpenClaw 在公众号板块根据每周复盘生成的策略优化记录，支持查看、编辑、留言和删除。",
        section: "openclawStrategyOptimization",
      },
      {
        key: "wechat-openclaw-video-works",
        group: "wechat",
        label: "作品列表",
        description: "查看 OpenClaw 在公众号板块沉淀的作品列表，并支持用户在内容下留言。",
        section: "openclawVideoWorks",
      },
    ],
  },
];

const allContentAcquisitionPages = contentAcquisitionGroups.flatMap((group) => group.pages);
const defaultContentAcquisitionPage = allContentAcquisitionPages[0]!;
const defaultContentAcquisitionGroup = contentAcquisitionGroups[0]!;

function createExpandedGroupsState() {
  return {
    xiaohongshu: true,
    douyin: true,
    wechat: true,
  } satisfies Record<ContentAcquisitionGroupKey, boolean>;
}

export function ContentAcquisitionWorkspace() {
  const [activePageKey, setActivePageKey] = useState(defaultContentAcquisitionPage.key);
  const [expandedGroups, setExpandedGroups] = useState(createExpandedGroupsState);

  const activePage = useMemo(
    () => allContentAcquisitionPages.find((item) => item.key === activePageKey) || defaultContentAcquisitionPage,
    [activePageKey],
  );
  const activeGroup = useMemo(
    () => contentAcquisitionGroups.find((group) => group.key === activePage.group) || defaultContentAcquisitionGroup,
    [activePage.group],
  );

  function toggleGroup(groupKey: ContentAcquisitionGroupKey) {
    setExpandedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  function handleSelectPage(page: ContentAcquisitionPage) {
    setActivePageKey(page.key);
    setExpandedGroups((current) => ({
      ...current,
      [page.group]: true,
    }));
  }

  function renderActiveWorkspace() {
    if (activePage.group === "xiaohongshu") {
      return <XiaohongshuWorkspaceShell embedded forcedSection={activePage.section} />;
    }
    if (activePage.group === "douyin") {
      return <DouyinWorkspaceShell embedded forcedSection={activePage.section} />;
    }
    return <WechatWorkspaceShell embedded forcedSection={activePage.section} />;
  }

  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <aside className="strategy-level-panel strategy-level-panel--directory strategy-level-panel--accordion">
          <div className="strategy-level-button-list strategy-level-button-list--accordion">
            {contentAcquisitionGroups.map((group) => {
              const isExpanded = expandedGroups[group.key];
              const isActive = group.key === activeGroup.key;
              return (
                <div
                  key={group.key}
                  className={`strategy-section-group ${isExpanded ? "is-expanded" : ""} ${isActive ? "is-active" : ""}`}
                >
                  <button
                    type="button"
                    className={`strategy-level-button strategy-level-button--section ${isActive ? "is-active" : ""}`}
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={isExpanded}
                  >
                    <span>{group.label}</span>
                    <span className={`strategy-level-chevron ${isExpanded ? "is-expanded" : ""}`} aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  <div className={`strategy-submenu ${isExpanded ? "is-expanded" : ""}`}>
                    <div className="strategy-level-button-list strategy-level-button-list--nested">
                      {group.pages.map((page) => (
                        <button
                          key={page.key}
                          type="button"
                          className={`strategy-level-button strategy-level-button--nested ${page.key === activePage.key ? "is-active" : ""}`}
                          onClick={() => handleSelectPage(page)}
                        >
                          {page.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="strategy-content-panel content-acquisition-stage">
          <article className="workspace-panel strategy-page-header">
            <div>
              <strong>内容获客</strong>
              <p>{activePage.description}</p>
            </div>
            <div className="strategy-page-header-actions">
              <div className="workspace-status">
                <span className="archive-pill status-ready">{activeGroup.label}</span>
                <span className="archive-pill status-ready">{activePage.label}</span>
                <span className="status-text">{activeGroup.summary}</span>
              </div>
            </div>
          </article>
          <div className="content-acquisition-stage__surface">
            {renderActiveWorkspace()}
          </div>
        </section>
      </section>
    </main>
  );
}
