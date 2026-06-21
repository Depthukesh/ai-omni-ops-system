"use client";

import { type XiaohongshuMarketingPlanRecord, type XiaohongshuMarketingPlanTaskRecord } from "../../../services/reports";
import { type AsyncAction, type OptionalDateFormatter, type StringChangeHandler } from "./shared-types";

export interface PlanWorkspaceProps {
  sectionLabel: string;
  canEditMarketingPlan: boolean;
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
  generateInputLabels: string[];
  isGenerateDialogOpen: boolean;
  marketingPlanUserRequirement: string;
  loadWorkspace: AsyncAction;
  onEnterEdit: () => void;
  onDelete: AsyncAction;
  onGenerate: AsyncAction;
  onCloseGenerateDialog: () => void;
  onSubmitGenerate: AsyncAction;
  onSave: AsyncAction;
  onChangeDraft: StringChangeHandler;
  onChangeMarketingPlanUserRequirement: StringChangeHandler;
  getTaskStatusClass: (status?: XiaohongshuMarketingPlanTaskRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
}

export function PlanWorkspace(props: PlanWorkspaceProps) {
  const {
    sectionLabel,
    canEditMarketingPlan,
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
    generateInputLabels,
    isGenerateDialogOpen,
    marketingPlanUserRequirement,
    loadWorkspace,
    onEnterEdit,
    onDelete,
    onGenerate,
    onCloseGenerateDialog,
    onSubmitGenerate,
    onSave,
    onChangeDraft,
    onChangeMarketingPlanUserRequirement,
    getTaskStatusClass,
    formatDateTime,
  } = props;

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{sectionLabel}</strong>
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
              disabled={!canEditMarketingPlan || isGenerating || isLoading || isDeletingMarketingPlan || isMarketingPlanTaskActive}
            >
              编辑
            </button>
          ) : null}
          {latestMarketingPlan ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void onDelete()}
              disabled={!canEditMarketingPlan || isDeletingMarketingPlan || isGenerating || isLoading || isMarketingPlanTaskActive}
            >
              {isDeletingMarketingPlan ? "删除中..." : "删除"}
            </button>
          ) : null}
          <button
            type="button"
            className="primary-button"
            onClick={() => void onGenerate()}
            disabled={!canEditMarketingPlan || isGenerating || isLoading || !canGenerateMarketingPlan || isMarketingPlanTaskActive}
          >
            {isGenerating ? "提交中..." : isMarketingPlanTaskActive ? "后台生成中..." : latestMarketingPlan ? "重新生成" : "一键生成"}
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>{latestMarketingPlan?.title || "小红书营销策划方案"}</strong>
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
            <span className={`archive-pill ${canEditMarketingPlan ? "status-ready" : "status-pending"}`}>
              {canEditMarketingPlan ? "当前板块可编辑" : "当前板块只读"}
            </span>
            {latestMarketingPlan ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void onSave()}
                disabled={!canEditMarketingPlan || isSavingMarketingPlan || isGenerating || isDeletingMarketingPlan || isMarketingPlanTaskActive}
              >
                {isSavingMarketingPlan ? "保存中..." : "保存报告"}
              </button>
            ) : null}
          </div>
        </div>
        {!canGenerateMarketingPlan ? (
          <div className="report-inline-tip">请先准备品牌背景资料、产品资料库、机会洞察总报告和品牌增长报告，再开始生成。</div>
        ) : null}
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
        {!canEditMarketingPlan ? <div className="report-inline-tip">当前账号只有查看权限，不能编辑、删除或重新生成该板块内容。</div> : null}

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
                readOnly={!canEditMarketingPlan}
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
      {isGenerateDialogOpen ? (
        <div className="media-preview-overlay" onClick={onCloseGenerateDialog}>
          <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={onCloseGenerateDialog} disabled={isGenerating}>
              关闭
            </button>
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>生成小红书营销策划方案</strong>
                  <p className="personal-meta">确认本次输入范围，并可补充本次生成要求。</p>
                </div>
              </div>
              <div className="personal-list">
                <article className="report-editor-pane">
                  <span>本次输入</span>
                  <div className="report-inline-tip">
                    {generateInputLabels.map((item, index) => `${index + 1}. ${item}`).join("；")}
                  </div>
                </article>
                <label className="report-editor-pane">
                  <span>用户要求</span>
                  <textarea
                    className="report-content-textarea"
                    value={marketingPlanUserRequirement}
                    onChange={(event) => onChangeMarketingPlanUserRequirement(event.target.value)}
                    placeholder="可选填写本次营销策划方案的补充要求，例如重点产品、内容风格、资源限制或阶段目标。"
                  />
                </label>
                <div className="strategy-inline-actions">
                  <button type="button" className="primary-button" onClick={() => void onSubmitGenerate()} disabled={isGenerating}>
                    {isGenerating ? "提交中..." : "提交"}
                  </button>
                  <button type="button" className="secondary-button" onClick={onCloseGenerateDialog} disabled={isGenerating}>
                    取消
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </article>
  );
}
