"use client";

export interface DigitalHumanPlaceholderPanelProps {
  title: string;
  description: string;
  statusText: string;
  statusDescription: string;
  planDescription: string;
}

export function DigitalHumanPlaceholderPanel(props: DigitalHumanPlaceholderPanelProps) {
  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>{props.title}</strong>
          <p>{props.description}</p>
        </div>
      </div>
      <div className="strategy-grid">
        <div className="entity-card personal-card">
          <strong>当前状态</strong>
          <p className="personal-meta">{props.statusText}</p>
          <p className="panel-subtext">{props.statusDescription}</p>
        </div>
        <div className="entity-card personal-card">
          <strong>计划能力</strong>
          <p className="panel-subtext">{props.planDescription}</p>
        </div>
      </div>
    </article>
  );
}
