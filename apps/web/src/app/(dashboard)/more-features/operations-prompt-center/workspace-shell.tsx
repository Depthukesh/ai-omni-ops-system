"use client";

import { MoreFeaturesSectionSidebar } from "../section-sidebar";
import { OperationsPromptCenter } from "../design/operations-prompt-center";

interface OperationsPromptWorkspaceShellProps {
  section: { label: string; description: string };
}

export function OperationsPromptWorkspaceShell({ section }: OperationsPromptWorkspaceShellProps) {
  return (
    <main className="archive-shell strategy-shell">
      <section className="strategy-layout">
        <MoreFeaturesSectionSidebar />

        <div className="strategy-content-panel">
          <article className="workspace-panel strategy-page-header">
            <div>
              <strong>{section.label}</strong>
              <p>{section.description}</p>
            </div>
            <div className="strategy-page-header-actions">
              <div className="workspace-status">
                <span className="archive-pill status-ready">后台模板真源</span>
                <span className="archive-pill status-pending">异步文本生成</span>
                <span className="status-text">
                  运营提示词中心会从后台模板库读取原始 Prompt，并把生成记录统一写入作品中心；前端不保存模板真源。
                </span>
              </div>
            </div>
          </article>

          <OperationsPromptCenter />
        </div>
      </section>
    </main>
  );
}
