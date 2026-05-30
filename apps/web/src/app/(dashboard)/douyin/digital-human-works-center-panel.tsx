"use client";

import {
  type DigitalHumanFigureType,
  type DouyinDigitalHumanVideoWorkRecord,
} from "../../../services/works";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

type DigitalHumanEditorDiffEntry = {
  key: string;
  label: string;
  currentValue: string;
  selectedValue: string;
};

export interface DigitalHumanWorksCenterPanelProps {
  items: DouyinDigitalHumanVideoWorkRecord[];
  filteredWorks: DouyinDigitalHumanVideoWorkRecord[];
  pagedItems: DouyinDigitalHumanVideoWorkRecord[];
  selectedWork?: DouyinDigitalHumanVideoWorkRecord;
  selectedWorkId: string;
  selectedWorkIsRecoverable: boolean;
  workSearch: string;
  workStageFilter: string;
  page: number;
  pageCount: number;
  manualRecoverTaskId: string;
  editorDiffs: DigitalHumanEditorDiffEntry[];
  isSubmitting: boolean;
  canEdit: boolean;
  formatDateTime: OptionalDateFormatter;
  getStageLabel: (stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) => string;
  getStageClass: (stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) => string;
  getFigureTypeLabel: (type?: DigitalHumanFigureType) => string;
  onWorkSearchChange: (value: string) => void;
  onWorkStageFilterChange: (value: string) => void;
  onSelectWork: (workId: string) => void;
  onPageChange: (nextPage: number | ((current: number) => number)) => void;
  onManualRecoverTaskIdChange: (value: string) => void;
  onBackfillSelectedWork: () => void;
  onRecoverVideo: (payload: { workId?: string; providerTaskId?: string }) => Promise<boolean>;
  onRetrySelectedWork: () => Promise<void> | void;
  onPreview: (item: DouyinDigitalHumanVideoWorkRecord) => void;
  onDelete: (workId: string) => Promise<boolean>;
}

export function DigitalHumanWorksCenterPanel(props: DigitalHumanWorksCenterPanelProps) {
  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>作品中心</strong>
          <p>展示最近生成的数字人视频作品，支持找回结果、删除记录和媒体预览。</p>
        </div>
      </div>

      <div className="personal-grid" style={{ marginBottom: 16 }}>
        <label className="field">
          <span>作品搜索</span>
          <input
            value={props.workSearch}
            onChange={(event) => props.onWorkSearchChange(event.target.value)}
            placeholder="搜索标题、数字人、音色或脚本内容"
          />
        </label>
        <label className="field">
          <span>状态筛选</span>
          <select value={props.workStageFilter} onChange={(event) => props.onWorkStageFilterChange(event.target.value)}>
            <option value="ALL">全部状态</option>
            <option value="RECOVERABLE">待找回</option>
            <option value="QUEUED">排队中</option>
            <option value="GENERATING">生成中</option>
            <option value="SUCCESS">已完成</option>
            <option value="FAILED">失败</option>
          </select>
        </label>
      </div>

      <div className="strategy-inline-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" className="secondary-button" onClick={() => props.onWorkStageFilterChange("ALL")}>
          查看全部
        </button>
        <button type="button" className="secondary-button" onClick={() => props.onWorkStageFilterChange("FAILED")}>
          只看失败
        </button>
        <button type="button" className="secondary-button" onClick={() => props.onWorkStageFilterChange("RECOVERABLE")}>
          只看待找回
        </button>
        <button type="button" className="secondary-button" onClick={() => props.onWorkStageFilterChange("SUCCESS")}>
          只看已完成
        </button>
        <button type="button" className="secondary-button" onClick={() => props.onWorkStageFilterChange("GENERATING")}>
          只看生成中
        </button>
        <button type="button" className="secondary-button" onClick={() => props.onWorkSearchChange("")}>
          清空搜索
        </button>
      </div>

      {!props.items.length ? (
        <div className="empty-state">当前还没有数字人作品，先从模板库选择模板并提交一条视频任务。</div>
      ) : !props.filteredWorks.length ? (
        <div className="empty-state">当前筛选条件下没有匹配作品，试试清空关键词或切换状态。</div>
      ) : (
        <>
          <div className="xhs-material-library">
            <div className="xhs-material-card-grid">
              {props.pagedItems.map((item) => (
                <article key={item.id} className="xhs-material-card">
                  <button
                    type="button"
                    className={`xhs-material-card-stage ${props.selectedWorkId === item.id ? "is-active" : ""}`}
                    onClick={() => props.onSelectWork(item.id)}
                  >
                    {item.coverImageUrl ? (
                      <img className="xhs-material-card-media" src={item.coverImageUrl} alt={item.title} />
                    ) : item.videoUrl ? (
                      <video className="xhs-material-card-media" src={item.videoUrl} muted preload="none" />
                    ) : (
                      <span className="xhs-material-card-empty">暂无封面</span>
                    )}
                    <span className={`xhs-material-card-badge ${props.getStageClass(item.stage)}`}>{props.getStageLabel(item.stage)}</span>
                  </button>
                  <div className="xhs-material-card-body">
                    <strong>{item.title}</strong>
                    <p>{item.personName} · {props.getFigureTypeLabel(item.figureType)}</p>
                    <p>{props.formatDateTime(item.createdAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {props.pageCount > 1 ? (
            <div className="pagination-bar">
              <button
                type="button"
                className="secondary-button"
                disabled={props.page <= 1}
                onClick={() => props.onPageChange((current) => Math.max(1, current - 1))}
              >
                上一页
              </button>
              <span className="panel-subtext">第 {props.page} / {props.pageCount} 页</span>
              <button
                type="button"
                className="secondary-button"
                disabled={props.page >= props.pageCount}
                onClick={() => props.onPageChange((current) => Math.min(props.pageCount, current + 1))}
              >
                下一页
              </button>
            </div>
          ) : null}

          {props.selectedWork && props.editorDiffs.length ? (
            <div className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
              <div className="report-editor-head">
                <div>
                  <strong>参数差异提示</strong>
                  <p>对比当前创建区与已选作品，方便确认是否已经完成必要修改。</p>
                </div>
              </div>
              <div className="xhs-material-card-grid">
                {props.editorDiffs.map((item) => (
                  <article key={item.key} className="entity-card personal-card">
                    <strong>{item.label}</strong>
                    <p className="panel-subtext">当前：{item.currentValue || "未填写"}</p>
                    <p className="panel-subtext">原作品：{item.selectedValue || "未填写"}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {props.selectedWork ? (
            <article className="light-data-panel report-editor-panel" style={{ marginTop: 20 }}>
              <div className="report-editor-head">
                <div>
                  <strong>{props.selectedWork.title}</strong>
                  <p>
                    {props.selectedWork.personName}
                    {" · "}
                    {props.getFigureTypeLabel(props.selectedWork.figureType)}
                    {props.selectedWork.audioName ? ` · ${props.selectedWork.audioName}` : ""}
                  </p>
                </div>
                <div className="report-editor-actions">
                  <span className={`archive-pill ${props.getStageClass(props.selectedWork.stage)}`}>{props.getStageLabel(props.selectedWork.stage)}</span>
                  {props.selectedWorkIsRecoverable ? <span className="archive-pill status-in_progress">待找回</span> : null}
                  {props.selectedWork.thirdPartyStatusLabel ? (
                    <span className="archive-pill status-pending">{props.selectedWork.thirdPartyStatusLabel}</span>
                  ) : null}
                  <span className="archive-pill status-pending">{props.formatDateTime(props.selectedWork.updatedAt)}</span>
                </div>
              </div>

              <div className="personal-grid">
                <div className="report-editor-pane field-full">
                  <span>口播脚本</span>
                  <textarea className="report-markdown-textarea composer-form-textarea" value={props.selectedWork.content} readOnly />
                </div>
                <div className="report-editor-pane">
                  <span>数字人封面</span>
                  {props.selectedWork.coverImageUrl ? (
                    <img src={props.selectedWork.coverImageUrl} alt={props.selectedWork.title} style={{ width: "100%", borderRadius: 20, border: "1px solid #dfe5f2" }} />
                  ) : (
                    <div className="empty-state">暂无封面。</div>
                  )}
                </div>
                <div className="report-editor-pane">
                  <span>最终视频</span>
                  {props.selectedWork.videoUrl ? (
                    <video controls preload="metadata" src={props.selectedWork.videoUrl} style={{ width: "100%", borderRadius: 20, background: "#0f1525" }} />
                  ) : (
                    <div className="empty-state">视频生成完成后这里会显示最终成片。</div>
                  )}
                </div>
              </div>

              {props.selectedWork.thirdPartyStatusDetail ? (
                <div className="report-inline-tip" style={{ marginTop: 16 }}>{props.selectedWork.thirdPartyStatusDetail}</div>
              ) : null}

              <div className="personal-grid" style={{ marginTop: 16 }}>
                <label className="field field-full">
                  <span>手动找回蝉镜任务 ID</span>
                  <input
                    value={props.manualRecoverTaskId}
                    onChange={(event) => props.onManualRecoverTaskIdChange(event.target.value)}
                    placeholder="可手动输入蝉镜任务 ID，用于补找回最终视频结果"
                    disabled={!props.canEdit || props.isSubmitting}
                  />
                  <small className="personal-meta">适用于已知蝉镜任务 ID，但当前作品未回填最终视频的场景。</small>
                </label>
              </div>

              <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={props.onBackfillSelectedWork}
                  disabled={props.isSubmitting}
                >
                  回填到创建区
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void props.onRecoverVideo({ workId: props.selectedWork?.id, providerTaskId: props.selectedWork?.providerTaskId })}
                  disabled={!props.canEdit || props.isSubmitting || !props.selectedWork.providerTaskId}
                >
                  找回视频结果
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void props.onRecoverVideo({ workId: props.selectedWork?.id, providerTaskId: props.manualRecoverTaskId.trim() || undefined })}
                  disabled={!props.canEdit || props.isSubmitting || !props.manualRecoverTaskId.trim()}
                >
                  按任务 ID 找回
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void props.onRetrySelectedWork()}
                  disabled={!props.canEdit || props.isSubmitting || props.selectedWork.stage !== "FAILED"}
                >
                  失败重试
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.selectedWork && props.onPreview(props.selectedWork)}
                  disabled={!props.selectedWork.videoUrl && !props.selectedWork.coverImageUrl}
                >
                  预览媒体
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => props.selectedWork && void props.onDelete(props.selectedWork.id)}
                  disabled={!props.canEdit || props.isSubmitting}
                >
                  删除
                </button>
              </div>
            </article>
          ) : null}
        </>
      )}
    </article>
  );
}
