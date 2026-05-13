"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";

type OriginalReferenceTemplatePickerProps = {
  open: boolean;
  multi: boolean;
  title: string;
  description: string;
  categories: XhsOriginalReferenceTemplateCategoryRecord[];
  items: XhsOriginalReferenceTemplateRecord[];
  isLoading: boolean;
  errorMessage: string;
  isSubmitting: boolean;
  onClose: () => void;
  onReload: () => void | Promise<void>;
  onConfirm: (items: XhsOriginalReferenceTemplateRecord[]) => void | Promise<void>;
};

const ALL_CATEGORY_ID = "__all__";

export function OriginalReferenceTemplatePicker(props: OriginalReferenceTemplatePickerProps) {
  const [keyword, setKeyword] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    setKeyword("");
    setActiveCategoryId(ALL_CATEGORY_ID);
    setSelectedIds([]);
  }, [props.open]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return props.items.filter((item) => {
      if (activeCategoryId !== ALL_CATEGORY_ID && item.categoryId !== activeCategoryId) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      return [
        item.title,
        item.categoryLabel,
        item.sourcePath,
      ].some((field) => field.toLowerCase().includes(normalizedKeyword));
    });
  }, [activeCategoryId, keyword, props.items]);

  const selectedItems = useMemo(
    () => props.items.filter((item) => selectedIds.includes(item.id)),
    [props.items, selectedIds],
  );

  function toggleSelect(templateId: string) {
    setSelectedIds((current) => {
      if (props.multi) {
        return current.includes(templateId) ? current.filter((item) => item !== templateId) : [...current, templateId];
      }
      return current[0] === templateId ? [] : [templateId];
    });
  }

  if (!props.open) {
    return null;
  }

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div
        className="media-preview-dialog calendar-detail-dialog reference-template-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="media-preview-close" onClick={props.onClose} disabled={props.isSubmitting}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head reference-template-head">
            <div>
              <strong>{props.title}</strong>
              <p className="personal-meta">{props.description}</p>
            </div>
            <div className="reference-template-summary">
              <span className="archive-pill status-ready">{props.items.length} 张模板</span>
              <span className={`archive-pill ${selectedItems.length ? "status-pending" : "status-in_progress"}`}>
                {selectedItems.length ? `已选 ${selectedItems.length} 张` : "未选择"}
              </span>
            </div>
          </div>

          <div className="reference-template-toolbar">
            <div className="reference-template-search">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索模板名称、分类或来源路径"
              />
            </div>
            <button type="button" className="secondary-button" onClick={() => void props.onReload()} disabled={props.isLoading}>
              {props.isLoading ? "刷新中..." : "刷新模板"}
            </button>
          </div>

          <div className="reference-template-categories">
            <button
              type="button"
              className={`reference-template-chip ${activeCategoryId === ALL_CATEGORY_ID ? "is-active" : ""}`}
              onClick={() => setActiveCategoryId(ALL_CATEGORY_ID)}
            >
              全部
            </button>
            {props.categories.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`reference-template-chip ${activeCategoryId === item.id ? "is-active" : ""}`}
                onClick={() => setActiveCategoryId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {props.errorMessage ? <div className="report-inline-tip report-inline-tip--error">{props.errorMessage}</div> : null}

          {props.isLoading ? (
            <div className="note-empty-state">模板库加载中，请稍候...</div>
          ) : filteredItems.length ? (
            <div className="reference-template-grid">
              {filteredItems.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`reference-template-card ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <img className="reference-template-image" src={item.assetUrl} alt={item.title} loading="lazy" />
                    <div className="reference-template-card-body">
                      <strong>{item.title}</strong>
                      <p>{item.categoryLabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="note-empty-state">当前筛选条件下没有可用模板。</div>
          )}

          <div className="strategy-inline-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void props.onConfirm(selectedItems)}
              disabled={!selectedItems.length || props.isSubmitting}
            >
              {props.isSubmitting ? "应用中..." : props.multi ? "使用所选模板" : "使用这张模板"}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClose} disabled={props.isSubmitting}>
              取消
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
