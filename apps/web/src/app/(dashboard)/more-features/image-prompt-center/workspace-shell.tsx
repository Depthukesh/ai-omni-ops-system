"use client";

import { ImagePromptCenter } from "../design/image-prompt-center";
import { MoreFeaturesSectionSidebar } from "../section-sidebar";

interface ImagePromptWorkspaceShellProps {
  section: { label: string; description: string };
}

export function ImagePromptWorkspaceShell({ section }: ImagePromptWorkspaceShellProps) {
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
                <span className="archive-pill status-pending">异步图片生成</span>
                <span className="status-text">
                  生图提示词中心会从后台模板库读取图片与 Prompt，并把生成记录统一写入作品中心；前端不保存模板真源。
                </span>
              </div>
            </div>
          </article>

          <ImagePromptCenter />
        </div>
      </section>
    </main>
  );
}
