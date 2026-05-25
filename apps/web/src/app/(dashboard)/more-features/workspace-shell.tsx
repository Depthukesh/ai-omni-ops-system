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
    <main className="archive-shell">
      <section className="archive-header">
        <span className="hero-badge">更多功能</span>
        <h1>更多功能工作区</h1>
        <p>这里用于承接独立扩展板块，当前已预留“设计”栏目，方便另一个 Agent 在不影响现有主链路的情况下继续开发。</p>
      </section>

      <div className="archive-layout">
        <aside className="archive-sidebar">
          {moreFeatureSections.map((item, index) => {
            const isActive = item.key === activeSection;
            return (
              <button
                key={item.key}
                type="button"
                className={`archive-step-card ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveSection(item.key)}
              >
                <div className="archive-step-top">
                  <span className="archive-step-index">{index + 1}</span>
                  <span className={`status-chip ${isActive ? "status-running" : "status-pending"}`}>
                    {isActive ? "当前" : "待开发"}
                  </span>
                </div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </button>
            );
          })}
        </aside>

        <section className="workspace-panel">
          <div className="workspace-toolbar">
            <div>
              <h2>{activeConfig.label}</h2>
              <p>{activeConfig.summary}</p>
            </div>
            <span className="status-chip status-ready">已预留入口</span>
          </div>

          <div className="card-grid">
            <article className="metric-card">
              <span>当前状态</span>
              <strong>设计板块已创建</strong>
              <p>顶部主导航已新增“更多功能”，左侧已新增“设计”板块入口。</p>
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
                <p>这个页面当前只搭好结构和分工入口，不预置复杂逻辑，便于另一个 Agent 在此独立接手设计板块开发。</p>
              </div>
            </div>
            <div className="empty-state">
              当前“设计”板块还未接入具体业务流程。另一个 Agent 可以从这里开始补充页面结构、数据流和功能实现。
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
