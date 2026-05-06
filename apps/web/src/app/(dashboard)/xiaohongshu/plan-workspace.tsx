"use client";

import { type XiaohongshuMarketingPlanRecord, type XiaohongshuMarketingPlanTaskRecord } from "../../../services/reports";
import { type AsyncAction, type OptionalDateFormatter, type StringChangeHandler } from "./shared-types";

export interface PlanWorkspaceProps {
  sectionLabel: string;
  isLoading: boolean;
  isPublishing: boolean;
  isSavingMarketingPlan: boolean;
  isDeletingMarketingPlan: boolean;
  isGenerating: boolean;
  latestMarketingPlan?: XiaohongshuMarketingPlanRecord;
  latestMarketingPlanTask?: XiaohongshuMarketingPlanTaskRecord;
  canGenerateMarketingPlan: boolean;
  isMarketingPlanTaskActive: boolean;
  marketingPlanTaskStatusText: string;
  marketingPlanInlineError: string;
  isEditingMarketingPlan: boolean;
  marketingPlanDraft: string;
  marketingPlanPreviewHtml: string;
  loadWorkspace: AsyncAction;
  onEnterEdit: () => void;
  onDelete: AsyncAction;
  onGenerate: AsyncAction;
  onSave: AsyncAction;
  onChangeDraft: StringChangeHandler;
  getTaskStatusClass: (status?: XiaohongshuMarketingPlanTaskRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
}

export function PlanWorkspace(props: PlanWorkspaceProps) {
  const {
    sectionLabel,
    isLoading,
    isPublishing,
    isSavingMarketingPlan,
    isDeletingMarketingPlan,
    isGenerating,
    latestMarketingPlan,
    latestMarketingPlanTask,
    canGenerateMarketingPlan,
    isMarketingPlanTaskActive,
    marketingPlanTaskStatusText,
    marketingPlanInlineError,
    isEditingMarketingPlan,
    marketingPlanDraft,
    marketingPlanPreviewHtml,
    loadWorkspace,
    onEnterEdit,
    onDelete,
    onGenerate,
    onSave,
    onChangeDraft,
    getTaskStatusClass,
    formatDateTime,
  } = props;

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{sectionLabel}</strong>
          <p className="panel-subtext">只保留 Markdown 编辑与预览，聚焦生成、编辑、保存这条主链路。</p>
        </div>
        <div className="strategy-inline-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadWorkspace()}
            disabled={isLoading || isPublishing || isSavingMarketingPlan || isDeletingMarketingPlan}
          >
            刷新数据
          </button>
          {latestMarketingPlan ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onEnterEdit}
              disabled={isGenerating || isLoading || isDeletingMarketingPlan || isMarketingPlanTaskActive}
            >
              编辑
            </button>
          ) : null}
          {latestMarketingPlan ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void onDelete()}
              disabled={isDeletingMarketingPlan || isGenerating || isLoading || isMarketingPlanTaskActive}
            >
              {isDeletingMarketingPlan ? "删除中..." : "删除"}
            </button>
          ) : null}
          <button
            type="button"
            className="primary-button"
            onClick={() => void onGenerate()}
            disabled={isGenerating || isLoading || !canGenerateMarketingPlan || isMarketingPlanTaskActive}
          >
            {isGenerating ? "提交中..." : isMarketingPlanTaskActive ? "后台生成中..." : latestMarketingPlan ? "重新生成" : "一键生成"}
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>{latestMarketingPlan?.title || "小红书营销策划方案"}</strong>
            <p>调用 `xiaohongshu-brand-marketing-plan` 技能生成 Markdown 长文，左侧编辑，右侧预览。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${canGenerateMarketingPlan ? "status-ready" : "status-in_progress"}`}>
              {canGenerateMarketingPlan ? "已满足生成条件" : "等待前置输入"}
            </span>
            {latestMarketingPlanTask ? (
              <span className={`archive-pill ${getTaskStatusClass(latestMarketingPlanTask.taskStatus)}`}>{marketingPlanTaskStatusText}</span>
            ) : null}
            {latestMarketingPlan?.generatedAt ? (
              <span className="archive-pill status-ready">{formatDateTime(latestMarketingPlan.generatedAt)}</span>
            ) : null}
            {latestMarketingPlan?.modelName ? <span className="archive-pill status-pending">{latestMarketingPlan.modelName}</span> : null}
            {latestMarketingPlan ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void onSave()}
                disabled={isSavingMarketingPlan || isGenerating || isDeletingMarketingPlan || isMarketingPlanTaskActive}
              >
                {isSavingMarketingPlan ? "保存中..." : "保存报告"}
              </button>
            ) : null}
          </div>
        </div>
        {!canGenerateMarketingPlan ? <div className="report-inline-tip">请先完成品牌增长报告与全年营销规划，再开始生成。</div> : null}
        {isMarketingPlanTaskActive ? (
          <div className="report-inline-tip">
            {latestMarketingPlanTask?.taskStatus === "QUEUED"
              ? "正在排队生成，页面会自动刷新结果。"
              : latestMarketingPlanTask?.phaseText
                ? `${latestMarketingPlanTask.phaseText}${latestMarketingPlanTask.phaseIndex && latestMarketingPlanTask.phaseTotal ? `（${latestMarketingPlanTask.phaseIndex}/${latestMarketingPlanTask.phaseTotal}）` : ""}`
                : "正在后台生成，完成后会自动刷新到编辑区。"}
          </div>
        ) : null}
        {marketingPlanInlineError ? (
          <div className="report-inline-tip report-inline-tip--error">{marketingPlanInlineError}</div>
        ) : null}

        {!latestMarketingPlan ? (
          <div className="empty-state">当前还没有小红书营销策划方案，点击右上角“一键生成”开始。</div>
        ) : (
          <div className="report-editor-grid">
            <label className="report-editor-pane">
              <span>{isEditingMarketingPlan ? "Markdown 编辑器" : "Markdown 内容"}</span>
              <textarea
                className="report-markdown-textarea"
                value={marketingPlanDraft}
                onChange={(event) => onChangeDraft(event.target.value)}
                placeholder="这里显示并编辑小红书营销策划方案 Markdown 内容"
              />
            </label>
            <article className="report-editor-pane">
              <span>预览</span>
              <div className="generated-report-html" dangerouslySetInnerHTML={{ __html: marketingPlanPreviewHtml }} />
            </article>
          </div>
        )}
      </article>
    </article>
  );
}
