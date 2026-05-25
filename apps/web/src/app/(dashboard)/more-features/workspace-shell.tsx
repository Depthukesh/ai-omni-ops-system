"use client";

import { useMemo, useState } from "react";

type MoreFeatureSectionKey = "design";

type MoreFeatureSection = {
  key: MoreFeatureSectionKey;
  label: string;
  description: string;
  summary: string;
};

const moreFeatureSections: MoreFeatureSection[] = [
  {
    key: "design",
    label: "设计",
    description: "为设计类工作流预留独立工作区，供并行 Agent 在这里继续开发。",
    summary: "当前先完成导航占位和分工边界，后续页面交互、素材调用和设计工具链可继续往这里扩展。",
  },
];

export function MoreFeaturesWorkspaceShell() {
  const [activeSection, setActiveSection] = useState<MoreFeatureSectionKey>("design");
  const activeConfig = useMemo(
    () => moreFeatureSections.find((item) => item.key === activeSection) ?? moreFeatureSections[0],
    [activeSection],
  );

  return (
    <main className="workspace-page workspace-page--strategy">
      <section className="workspace-card workspace-card--bleed strategy-page-card">
        <div className="strategy-layout xiaohongshu-layout">
          <aside className="strategy-level-panel strategy-level-panel--directory">
            <div className="strategy-level-button-list">
              {moreFeatureSections.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`strategy-level-button ${item.key === activeSection ? "is-active" : ""}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="strategy-content-panel xiaohongshu-content-panel">
            <section className="dashboard-hero xiaohongshu-hero">
              <div>
                <h1>更多功能工作区</h1>
                <p>这里用于承接独立扩展板块，当前先开放“设计”栏目，方便另一个 Agent 在不影响现有主链路的情况下继续开发。</p>
                <div className="workspace-toolbar top-toolbar">
                  <div className="workspace-status">
                    <span className="archive-pill status-ready">已开放入口</span>
                    <span className="archive-pill status-pending">独立扩展区</span>
                    <span className="status-text">当前只保留简洁导航和基础占位，便于继续接力开发。</span>
                  </div>
                </div>
              </div>
            </section>

            <article className="workspace-panel strategy-page-card">
              <div className="strategy-card-toolbar">
                <div>
                  <strong>{activeConfig.label}</strong>
                  <p>{activeConfig.summary}</p>
                </div>
                <div className="strategy-inline-actions">
                  <span className="archive-pill status-ready">已预留入口</span>
                </div>
              </div>

              <div className="card-grid">
                <article className="metric-card">
                  <span>当前状态</span>
                  <strong>设计板块已创建</strong>
                  <p>顶部主导航已新增“更多功能”，当前左侧菜单与其他工作区保持同一套简洁样式。</p>
                </article>
                <article className="metric-card">
                  <span>协作建议</span>
                  <strong>适合并行开发</strong>
                  <p>另一个 Agent 可以直接在这个路由下扩展设计工作流，而不必改动现有小红书、抖音和个人中心页面。</p>
                </article>
                <article className="metric-card">
                  <span>后续方向</span>
                  <strong>可继续细化</strong>
                  <p>可在此继续加入设计任务、素材输入、品牌规范、图像生成和结果资产管理等能力。</p>
                </article>
              </div>

              <article className="light-data-panel" style={{ marginTop: 18 }}>
                <div className="collection-result-head">
                  <div>
                    <h3>开发占位说明</h3>
                    <p>这个页面当前只保留结构化的入口，不预置复杂逻辑，便于另一个 Agent 在此独立接手设计板块开发。</p>
                  </div>
                </div>
                <div className="empty-state">
                  当前“设计”板块还未接入具体业务流程。另一个 Agent 可以从这里开始补充页面结构、数据流和功能实现。
                </div>
              </article>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
