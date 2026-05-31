"use client";

import {
  type DigitalHumanFigureType,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
} from "../../../services/works";

export interface DigitalHumanTemplateLibraryProps {
  templateCountLabel: string;
  workCountLabel: string;
  templateTagGroups: DigitalHumanTemplateTagGroupRecord[];
  activeTagId?: string;
  templateLoadError?: string;
  isTemplateLoading?: boolean;
  templateSearch: string;
  templateScopeFilter: "ALL" | "FAVORITES" | "RECENT";
  filteredTemplates: DigitalHumanTemplateRecord[];
  selectedTemplateId: string;
  selectedTemplate?: DigitalHumanTemplateRecord;
  selectedFigureType: DigitalHumanFigureType;
  selectedFigure?: DigitalHumanTemplateRecord["figures"][number];
  isSelectedTemplateFavorite: boolean;
  templatePageInfo?: DigitalHumanTemplatePageInfo;
  onTemplateTagChange: (tagId: string) => Promise<void>;
  onTemplateSearchChange: (value: string) => void;
  onTemplateScopeFilterChange: (value: "ALL" | "FAVORITES" | "RECENT") => void;
  onSelectedTemplateChange: (templateId: string) => void;
  onSelectedFigureTypeChange: (figureType: DigitalHumanFigureType) => void;
  onToggleFavoriteTemplate: (templateId: string, nextFavorite: boolean) => Promise<boolean>;
  onUseTemplate: () => void;
  getFigureTypeLabel: (type?: DigitalHumanFigureType) => string;
  onLoadMoreTemplates?: () => Promise<void>;
}

export function DigitalHumanTemplateLibrary(props: DigitalHumanTemplateLibraryProps) {
  const hasTemplates = props.filteredTemplates.length > 0;
  const tagOptions = props.templateTagGroups.length
    ? props.templateTagGroups.flatMap((group) =>
        group.tagList.map((tag) => ({
          key: String(tag.id),
          label: tag.name,
          helper: group.name,
          mode: "remote" as const,
        })),
      )
    : Array.from(
        new Map(
          props.filteredTemplates
            .flatMap((item) => item.tagNames)
            .filter((item) => item.trim())
            .map((item) => [
              item.trim().toLowerCase(),
              {
                key: item.trim(),
                label: item.trim(),
                helper: "本地筛选",
                mode: "local" as const,
              },
            ]),
        ).values(),
      );
  const isTagOnlyFailure = Boolean(props.templateLoadError) && hasTemplates;
  const activeLocalTag = !props.activeTagId && props.templateSearch.trim();

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>模板库</strong>
          <p>先筛选、预览和确认数字人模板，再带入数字人视频创建流程。</p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${props.filteredTemplates.length ? "status-ready" : "status-in_progress"}`}>{props.templateCountLabel}</span>
          <span className="archive-pill status-ready">{props.workCountLabel}</span>
        </div>
      </div>

      {props.templateLoadError ? (
        <div className="empty-state" style={{ marginTop: 12, borderColor: "#fecaca", background: "#fff1f2", color: "#9f1239" }}>
          {isTagOnlyFailure ? `模板已加载，标签接口异常：${props.templateLoadError}` : `模板加载失败：${props.templateLoadError}`}
        </div>
      ) : null}

      {tagOptions.length ? (
        <div className="strategy-chip-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`filter-chip ${!props.activeTagId && !activeLocalTag ? "is-active" : ""}`}
            onClick={() => {
              if (!props.templateTagGroups.length) {
                props.onTemplateSearchChange("");
                return;
              }
              void props.onTemplateTagChange("");
            }}
            disabled={props.isTemplateLoading}
          >
            全部标签
          </button>
          {tagOptions.map((tag) => {
            const isActive = tag.mode === "remote"
              ? props.activeTagId === tag.key
              : activeLocalTag === tag.label;
            return (
              <button
                key={`${tag.mode}-${tag.key}`}
                type="button"
                className={`filter-chip ${isActive ? "is-active" : ""}`}
                title={tag.helper}
                onClick={() => {
                  if (tag.mode === "remote") {
                    void props.onTemplateTagChange(tag.key);
                    return;
                  }
                  props.onTemplateSearchChange(tag.label);
                }}
                disabled={props.isTemplateLoading}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {isTagOnlyFailure ? (
        <div className="report-inline-tip report-inline-tip--error" style={{ marginBottom: 16 }}>
          当前已回退为模板直出浏览。
          {props.templateTagGroups.length ? "你仍可继续选模板和形象类型，标签筛选稍后再恢复。" : "由于标签接口异常，顶部标签已切换为本地关键词筛选。"}
        </div>
      ) : null}

      <div className="personal-grid">
        <label className="field">
          <span>模板搜索</span>
          <input
            value={props.templateSearch}
            onChange={(event) => props.onTemplateSearchChange(event.target.value)}
            placeholder="搜索模板名、音色或标签"
          />
        </label>
        <label className="field">
          <span>模板范围</span>
          <select value={props.templateScopeFilter} onChange={(event) => props.onTemplateScopeFilterChange(event.target.value as "ALL" | "FAVORITES" | "RECENT")}>
            <option value="ALL">全部模板</option>
            <option value="FAVORITES">仅看收藏</option>
            <option value="RECENT">最近使用</option>
          </select>
        </label>
        <label className="field">
          <span>形象类型</span>
          <select value={props.selectedFigureType} onChange={(event) => props.onSelectedFigureTypeChange(event.target.value as DigitalHumanFigureType)}>
            {(props.selectedTemplate?.figures || []).length ? (
              (props.selectedTemplate?.figures || []).map((item) => (
                <option key={item.type} value={item.type}>
                  {props.getFigureTypeLabel(item.type)}
                </option>
              ))
            ) : (
              <option value="">
                {props.templateLoadError ? "模板未加载成功，暂无形象类型" : "请先选择模板"}
              </option>
            )}
          </select>
        </label>
      </div>

      <div className="digital-human-template-wall">
        {props.filteredTemplates.length ? (
          props.filteredTemplates.map((item) => {
            const previewFigure = item.figures[0];
            const isActive = item.id === props.selectedTemplate?.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`digital-human-template-card ${isActive ? "is-active" : ""}`}
                onClick={() => props.onSelectedTemplateChange(item.id)}
              >
                <div className="digital-human-template-card__media">
                  {previewFigure?.cover ? (
                    <img src={previewFigure.cover} alt={item.name} />
                  ) : (
                    <div className="digital-human-template-card__empty">暂无封面</div>
                  )}
                  <span className="digital-human-template-card__badge">
                    {previewFigure ? props.getFigureTypeLabel(previewFigure.type) : "模板"}
                  </span>
                </div>
                <div className="digital-human-template-card__body">
                  <div className="digital-human-template-card__title-row">
                    <strong>{item.name}</strong>
                    {item.id === props.selectedTemplate?.id ? <span className="archive-pill status-ready">当前选中</span> : null}
                  </div>
                  <p>{item.audioName ? `默认音色：${item.audioName}` : "暂无默认音色信息"}</p>
                  <div className="digital-human-template-card__tags">
                    {item.tagNames.length
                      ? item.tagNames.slice(0, 5).map((tag) => (
                          <span key={`${item.id}-${tag}`}>{tag}</span>
                        ))
                      : <span>暂无标签</span>}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="empty-state">
            {props.templateLoadError ? "模板接口异常时可先检查上方提示；若已恢复，请刷新后重新选择。" : "当前筛选下暂无模板，试试清空关键词或切换模板范围。"}
          </div>
        )}
      </div>

      <div className="personal-grid" style={{ marginTop: 16 }}>
        <div className="entity-card personal-card">
          <strong>{props.selectedTemplate?.name || "未选择模板"}</strong>
          <p className="personal-meta">
            {props.selectedTemplate?.audioName ? `默认音色：${props.selectedTemplate.audioName}` : "请选择模板"}
          </p>
          <p className="panel-subtext">{props.selectedTemplate?.tagNames?.join(" / ") || "支持按标签筛选蝉镜公共数字人模板。"}</p>
          {props.selectedTemplate?.audioPreview ? (
            <audio controls preload="none" src={props.selectedTemplate.audioPreview} style={{ width: "100%", marginTop: 12 }} />
          ) : (
            <p className="panel-subtext" style={{ marginTop: 12 }}>当前模板暂无音色试听链接。</p>
          )}
          {props.selectedTemplate?.id ? (
            <div className="strategy-inline-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void props.onToggleFavoriteTemplate(props.selectedTemplate!.id, !props.isSelectedTemplateFavorite)}
              >
                {props.isSelectedTemplateFavorite ? "取消收藏" : "收藏模板"}
              </button>
              <button type="button" className="primary-button" onClick={props.onUseTemplate}>
                用当前模板创建视频
              </button>
            </div>
          ) : null}
        </div>
        <div className="entity-card personal-card">
          <strong>{props.selectedFigure ? props.getFigureTypeLabel(props.selectedFigure.type) : "形象预览"}</strong>
          <p className="personal-meta">
            {props.selectedFigure ? `${props.selectedFigure.width} x ${props.selectedFigure.height}` : "待选择"}
          </p>
          {props.selectedFigure?.cover ? (
            <img src={props.selectedFigure.cover} alt={props.selectedTemplate?.name || "数字人模板"} style={{ width: "100%", borderRadius: 16, marginTop: 12 }} />
          ) : (
            <p className="panel-subtext">当前模板暂无封面图。</p>
          )}
          {props.selectedFigure?.previewVideoUrl ? (
            <video controls preload="metadata" src={props.selectedFigure.previewVideoUrl} style={{ width: "100%", borderRadius: 16, marginTop: 12, background: "#0f1525" }} />
          ) : null}
        </div>
        <div className="entity-card personal-card">
          <strong>配置提醒</strong>
          <p className="panel-subtext">请先在个人中心的第三方平台里配置蝉镜凭证，格式为 `appId::secretKey`。</p>
          <p className="panel-subtext">模板、作品列表和找回动作都会直接走蝉镜 OpenAPI。</p>
          <p className="panel-subtext">如果模板较多，可先按标签筛选，再用关键词搜索模板名、音色或标签。</p>
          <p className="panel-subtext">常用模板可加入收藏，最近点过的模板会自动进入“最近使用”。</p>
        </div>
      </div>

      {props.onLoadMoreTemplates && props.templatePageInfo && props.templatePageInfo.page < props.templatePageInfo.totalPage ? (
        <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void props.onLoadMoreTemplates?.()}
            disabled={props.isTemplateLoading}
          >
            {props.isTemplateLoading ? "加载中..." : "继续加载模板"}
          </button>
          <span className="panel-subtext">
            当前第 {props.templatePageInfo.page}/{props.templatePageInfo.totalPage} 页，每页 {props.templatePageInfo.size} 条
          </span>
        </div>
      ) : null}
    </article>
  );
}
