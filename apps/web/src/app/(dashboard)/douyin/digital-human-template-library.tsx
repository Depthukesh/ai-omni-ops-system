"use client";

import { useEffect, useMemo, useState } from "react";
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
  templateTagLoadError?: string;
  isTemplateLoading?: boolean;
  templateSearch: string;
  templateScopeFilter: "ALL" | "FAVORITES" | "RECENT";
  filteredTemplates: DigitalHumanTemplateRecord[];
  favoriteTemplateIds: string[];
  templatePageInfo?: DigitalHumanTemplatePageInfo;
  onTemplateTagChange: (tagId: string) => Promise<void>;
  onTemplateSearchChange: (value: string) => void;
  onTemplateScopeFilterChange: (value: "ALL" | "FAVORITES" | "RECENT") => void;
  onSelectedTemplateChange: (templateId: string) => void;
  onSelectedFigureTypeChange: (figureType: DigitalHumanFigureType) => void;
  onToggleFavoriteTemplate: (templateId: string, nextFavorite: boolean) => Promise<boolean>;
  onUseTemplate: (payload?: { templateId: string; figureType?: DigitalHumanFigureType }) => void;
  getFigureTypeLabel: (type?: DigitalHumanFigureType) => string;
  onTemplatePageChange?: (page: number) => Promise<void>;
}

export function DigitalHumanTemplateLibrary(props: DigitalHumanTemplateLibraryProps) {
  const hasTemplates = props.filteredTemplates.length > 0;
  const [previewTemplateId, setPreviewTemplateId] = useState("");
  const [previewFigureType, setPreviewFigureType] = useState<DigitalHumanFigureType>("sit_body");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const scopeOptions: Array<{ value: "ALL" | "FAVORITES" | "RECENT"; label: string; helper: string }> = [
    { value: "ALL", label: "推荐浏览", helper: "按当前模板墙浏览全部模板" },
    { value: "FAVORITES", label: "我的收藏", helper: "只看已收藏模板" },
    { value: "RECENT", label: "最近使用", helper: "只看最近使用模板" },
  ];
  const tagOptions = props.templateTagGroups.flatMap((group) =>
    group.tagList.map((tag) => ({
      key: String(tag.id),
      label: tag.name,
      helper: group.name,
    })),
  );
  const isTemplateFailure = Boolean(props.templateLoadError);
  const activeLocalTag = !props.activeTagId && props.templateSearch.trim();
  const previewTemplate = useMemo(
    () => props.filteredTemplates.find((item) => item.id === previewTemplateId),
    [previewTemplateId, props.filteredTemplates],
  );
  const previewFigure = useMemo(
    () => previewTemplate?.figures.find((item) => item.type === previewFigureType) || previewTemplate?.figures[0],
    [previewFigureType, previewTemplate],
  );
  const isPreviewFavorite = Boolean(previewTemplate?.id && props.favoriteTemplateIds.includes(previewTemplate.id));
  const pageNumbers = useMemo(
    () => Array.from({ length: props.templatePageInfo?.totalPage || 0 }, (_, index) => index + 1),
    [props.templatePageInfo?.totalPage],
  );
  const shouldShowPagination = Boolean(
    props.onTemplatePageChange
    && props.templatePageInfo
    && props.templatePageInfo.totalPage > 1
    && props.templateScopeFilter === "ALL"
    && !activeLocalTag,
  );

  useEffect(() => {
    if (!previewTemplateId && props.filteredTemplates[0]?.id) {
      setPreviewTemplateId(props.filteredTemplates[0].id);
      setPreviewFigureType(props.filteredTemplates[0].figures[0]?.type || "sit_body");
    }
  }, [previewTemplateId, props.filteredTemplates]);

  useEffect(() => {
    if (!previewTemplateId) {
      return;
    }
    const nextTemplate = props.filteredTemplates.find((item) => item.id === previewTemplateId);
    if (!nextTemplate) {
      setPreviewTemplateId("");
      setPreviewFigureType("sit_body");
      return;
    }
    if (!nextTemplate.figures.some((item) => item.type === previewFigureType)) {
      setPreviewFigureType(nextTemplate.figures[0]?.type || "sit_body");
    }
  }, [previewFigureType, previewTemplateId, props.filteredTemplates]);

  const openTemplateModal = (template: DigitalHumanTemplateRecord, figureType?: DigitalHumanFigureType) => {
    props.onSelectedTemplateChange(template.id);
    setPreviewTemplateId(template.id);
    const nextFigureType = figureType || template.figures[0]?.type || "sit_body";
    setPreviewFigureType(nextFigureType);
    props.onSelectedFigureTypeChange(nextFigureType);
    setIsPreviewOpen(true);
  };

  const handleUseTemplate = (template: DigitalHumanTemplateRecord, figureType?: DigitalHumanFigureType) => {
    const nextFigureType = figureType || template.figures[0]?.type || "sit_body";
    props.onSelectedTemplateChange(template.id);
    props.onSelectedFigureTypeChange(nextFigureType);
    props.onUseTemplate({
      templateId: template.id,
      figureType: nextFigureType,
    });
  };

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

      {isTemplateFailure ? (
        <div className="empty-state" style={{ marginTop: 12, borderColor: "#fecaca", background: "#fff1f2", color: "#9f1239" }}>
          {hasTemplates ? `模板已加载，但模板接口最近一次刷新失败：${props.templateLoadError}` : `模板加载失败：${props.templateLoadError}`}
        </div>
      ) : null}

      {props.templateTagLoadError ? (
        <div className="empty-state" style={{ marginTop: 12, borderColor: "#fed7aa", background: "#fff7ed", color: "#9a3412" }}>
          模板标签读取失败：{props.templateTagLoadError}
        </div>
      ) : null}

      {tagOptions.length ? (
        <div className="strategy-chip-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`filter-chip ${!props.activeTagId && !activeLocalTag ? "is-active" : ""}`}
            onClick={() => {
              void props.onTemplateTagChange("");
            }}
            disabled={props.isTemplateLoading}
          >
            全部标签
          </button>
          {tagOptions.map((tag) => {
            const isActive = props.activeTagId === tag.key;
            return (
              <button
                key={tag.key}
                type="button"
                className={`filter-chip ${isActive ? "is-active" : ""}`}
                title={tag.helper}
                onClick={() => {
                  void props.onTemplateTagChange(tag.key);
                }}
                disabled={props.isTemplateLoading}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="digital-human-template-filters">
        <div className="digital-human-template-toolbar">
          <div className="digital-human-template-toolbar__group">
            {scopeOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`filter-chip ${props.templateScopeFilter === item.value ? "is-active" : ""}`}
                title={item.helper}
                onClick={() => props.onTemplateScopeFilterChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="digital-human-template-search">
            <input
              value={props.templateSearch}
              onChange={(event) => props.onTemplateSearchChange(event.target.value)}
              placeholder="按名称、音色或标签搜索"
            />
          </div>
        </div>
      </div>

      <div className="digital-human-template-wall">
        {props.filteredTemplates.length ? (
          props.filteredTemplates.map((item) => {
            const previewFigure = item.figures[0];
            const isActive = item.id === previewTemplateId;
            return (
              <article
                key={item.id}
                className={`digital-human-template-card ${isActive ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="digital-human-template-card__media"
                  onClick={() => openTemplateModal(item)}
                >
                  {previewFigure?.cover ? (
                    <img src={previewFigure.cover} alt={item.name} />
                  ) : (
                    <div className="digital-human-template-card__empty">暂无封面</div>
                  )}
                  <span className="digital-human-template-card__badge">
                    {previewFigure ? props.getFigureTypeLabel(previewFigure.type) : "模板"}
                  </span>
                  <span className="digital-human-template-card__hover-mask" />
                  <span className="digital-human-template-card__hover-actions">
                    <span
                      className="digital-human-template-card__create-button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleUseTemplate(item, previewFigure?.type);
                      }}
                    >
                      创建视频
                    </span>
                  </span>
                </button>
                <div className="digital-human-template-card__body">
                  <div className="digital-human-template-card__title-row">
                    <strong>{item.name}</strong>
                    {isActive ? <span className="archive-pill status-ready">已预览</span> : null}
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
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            {props.templateLoadError ? "模板接口异常时可先检查上方提示；若已恢复，请刷新后重新选择。" : "当前筛选下暂无模板，试试切回推荐浏览、清空关键词或更换标签。"}
          </div>
        )}
      </div>

      {shouldShowPagination ? (
        <div className="digital-human-template-pagination">
          <span className="panel-subtext">
            共 {props.templatePageInfo?.totalCount || 0} 人物，每页 24 个
          </span>
          <div className="digital-human-template-pagination__buttons">
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`filter-chip ${props.templatePageInfo?.page === pageNumber ? "is-active" : ""}`}
                disabled={props.isTemplateLoading || props.templatePageInfo?.page === pageNumber}
                onClick={() => void props.onTemplatePageChange?.(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {previewTemplate && isPreviewOpen ? (
        <div
          className="digital-human-template-modal-overlay"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="digital-human-template-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="digital-human-template-modal__close"
              onClick={() => setIsPreviewOpen(false)}
            >
              关闭
            </button>
            <div className="digital-human-template-modal__layout">
              <div className="digital-human-template-modal__preview">
                {previewFigure?.previewVideoUrl ? (
                  <video
                    controls
                    preload="metadata"
                    src={previewFigure.previewVideoUrl}
                    poster={previewFigure.cover}
                  />
                ) : previewFigure?.cover ? (
                  <img src={previewFigure.cover} alt={previewTemplate.name} />
                ) : (
                  <div className="digital-human-template-card__empty">暂无预览</div>
                )}
                <button
                  type="button"
                  className="primary-button digital-human-template-modal__create"
                  onClick={() => handleUseTemplate(previewTemplate, previewFigure?.type)}
                >
                  创建视频
                </button>
              </div>
              <div className="digital-human-template-modal__content">
                <div className="digital-human-template-modal__header">
                  <div>
                    <strong>{previewTemplate.name}</strong>
                    <p>
                      {previewTemplate.audioName ? `默认音色：${previewTemplate.audioName}` : "暂无默认音色信息"}
                    </p>
                    {previewTemplate.audioPreview ? (
                      <audio
                        controls
                        preload="none"
                        src={previewTemplate.audioPreview}
                        style={{ width: "100%", marginTop: 12 }}
                      />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void props.onToggleFavoriteTemplate(previewTemplate.id, !isPreviewFavorite)}
                  >
                    {isPreviewFavorite ? "取消收藏" : "收藏模板"}
                  </button>
                </div>
                <div className="digital-human-template-modal__meta">
                  <span className="action-chip">{previewTemplate.figures.length} 个造型</span>
                  {previewTemplate.tagNames.slice(0, 6).map((tag) => (
                    <span key={`${previewTemplate.id}-${tag}`} className="action-chip">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="digital-human-template-modal__figure-grid">
                  {previewTemplate.figures.map((figure, index) => (
                    <button
                      key={`${previewTemplate.id}-${figure.type}-${index}`}
                      type="button"
                      className={`digital-human-template-modal__figure-card ${previewFigure?.type === figure.type ? "is-active" : ""}`}
                      onClick={() => {
                        setPreviewFigureType(figure.type);
                        props.onSelectedTemplateChange(previewTemplate.id);
                        props.onSelectedFigureTypeChange(figure.type);
                      }}
                    >
                      {figure.cover ? (
                        <img src={figure.cover} alt={`${previewTemplate.name}-${props.getFigureTypeLabel(figure.type)}`} />
                      ) : (
                        <div className="digital-human-template-card__empty">暂无封面</div>
                      )}
                      <span>{props.getFigureTypeLabel(figure.type)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
