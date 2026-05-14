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
const PAGE_SIZE = 10;

export function OriginalReferenceTemplatePicker(props: OriginalReferenceTemplatePickerProps) {
  const [keyword, setKeyword] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [failedImageIds, setFailedImageIds] = useState<string[]>([]);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    setKeyword("");
    setActiveCategoryId(ALL_CATEGORY_ID);
    setSelectedIds([]);
    setCurrentPage(1);
    setFailedImageIds([]);
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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const pagedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategoryId, keyword]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
              {pagedItems.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`reference-template-card ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="reference-template-image-shell">
                      {failedImageIds.includes(item.id) ? (
                        <div className="reference-template-image-fallback">
                          <strong>模板预览加载失败</strong>
                          <span>该模板资源可能尚未同步完成，请先刷新模板或切换其他模板。</span>
                        </div>
                      ) : null}
                      <img
                        className={`reference-template-image ${failedImageIds.includes(item.id) ? "is-hidden" : ""}`}
                        src={item.assetUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={() =>
                          setFailedImageIds((current) => (current.includes(item.id) ? current : [...current, item.id]))
                        }
                      />
                      <div className={`reference-template-card-hint ${selected ? "is-selected" : ""}`}>
                        <span className="reference-template-card-hint-icon" aria-hidden="true">
                          <svg viewBox="0 0 20 20" focusable="false">
                            {selected ? (
                              <path
                                d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.25-3.25a1 1 0 1 1 1.414-1.414l2.543 2.543 6.543-6.543a1 1 0 0 1 1.414 0Z"
                                fill="currentColor"
                              />
                            ) : (
                              <>
                                <path
                                  d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z"
                                  fill="currentColor"
                                />
                                <path
                                  d="M10 1.75A8.25 8.25 0 1 0 18.25 10 8.259 8.259 0 0 0 10 1.75Zm0 15A6.75 6.75 0 1 1 16.75 10 6.758 6.758 0 0 1 10 16.75Z"
                                  fill="currentColor"
                                />
                              </>
                            )}
                          </svg>
                        </span>
                        <span>{selected ? "已选中" : props.multi ? "点击多选" : "点击选择"}</span>
                      </div>
                    </div>
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

          {filteredItems.length ? (
            <div className="reference-template-pagination">
              <div className="reference-template-pagination-summary">
                <span>
                  第 {currentPage} / {totalPages} 页
                </span>
                <span>每页 10 张</span>
                <span>当前筛选共 {filteredItems.length} 张</span>
              </div>
              <div className="reference-template-pagination-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                >
                  上一页
                </button>
                {visiblePageNumbers.map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    className={`reference-template-page-button ${pageNumber === currentPage ? "is-active" : ""}`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                </button>
              </div>
            </div>
          ) : null}

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
