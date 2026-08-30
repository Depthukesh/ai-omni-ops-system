"use client";

import { useEffect, useState } from "react";
import {
  createOpenClawComment,
  getOpenClawCommentWorkspace,
  type OpenClawCommentRecord,
  type OpenClawCommentResourceType,
  type OpenClawWorkspaceScope,
} from "../../../services/openclaw";

type OptionalDateFormatter = (value?: string) => string;
const PAGE_SIZE = 20;

export interface OpenClawCommentThreadProps {
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  resourceType: OpenClawCommentResourceType;
  resourceId: string;
  formatDateTime: OptionalDateFormatter;
}

export function OpenClawCommentThread(props: OpenClawCommentThreadProps) {
  const [items, setItems] = useState<OpenClawCommentRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentRangeStart = items.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const currentRangeEnd = items.length ? Math.min(currentPage * PAGE_SIZE, items.length) : 0;
  const pagedItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    let disposed = false;

    async function loadComments() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const workspace = await getOpenClawCommentWorkspace(
          props.brandId,
          props.workspaceScope,
          props.resourceType,
          props.resourceId,
        );
        if (!disposed) {
          setItems(workspace.items);
        }
      } catch (error) {
        if (!disposed) {
          setItems([]);
          setErrorMessage(error instanceof Error ? error.message : "留言读取失败");
        }
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    }

    void loadComments();
    return () => {
      disposed = true;
    };
  }, [props.brandId, props.resourceId, props.resourceType, props.workspaceScope]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleSubmit() {
    const content = draft.trim();
    if (!content || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await createOpenClawComment(props.brandId, {
        workspaceScope: props.workspaceScope,
        resourceType: props.resourceType,
        resourceId: props.resourceId,
        content,
      });
      setItems(response.workspace.items);
      setCurrentPage(totalPages);
      setDraft("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "留言提交失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="openclaw-comment-thread">
      <div className="openclaw-comment-thread__head">
        <strong>留言区</strong>
        <span>{isLoading ? "正在加载..." : `共 ${items.length} 条`}</span>
      </div>
      <div className="openclaw-comment-thread__composer">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="对这条 OpenClaw 内容补充备注、修改意见或协作留言"
          className="openclaw-comment-thread__textarea"
        />
        <div className="openclaw-comment-thread__actions">
          {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
          <button
            type="button"
            className="secondary-button"
            disabled={isSubmitting || !draft.trim()}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "提交中..." : "提交留言"}
          </button>
        </div>
      </div>
      <div className="openclaw-comment-thread__list">
        {items.length ? (
          <div className="note-pagination-bar" style={{ marginBottom: 12 }}>
            <div className="note-pagination-summary">
              当前显示 {currentRangeStart}-{currentRangeEnd} 条，第 {currentPage}/{totalPages} 页，每页 {PAGE_SIZE} 条
            </div>
            <div className="note-pagination-actions">
              <button type="button" className="note-page-button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                .map((pageNumber) => (
                  <button
                    key={`${props.resourceId}-comment-page-${pageNumber}`}
                    type="button"
                    className={`note-page-button ${pageNumber === currentPage ? "is-active" : ""}`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              <button type="button" className="note-page-button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                下一页
              </button>
            </div>
          </div>
        ) : null}
        {!items.length && !isLoading ? (
          <div className="note-empty-state">当前还没有留言，欢迎在这里补充修改意见。</div>
        ) : null}
        {pagedItems.map((item) => (
          <article key={item.id} className="openclaw-comment-thread__item">
            <div className="openclaw-comment-thread__meta">
              <span>团队留言</span>
              <span>{props.formatDateTime(item.createdAt)}</span>
            </div>
            <div className="openclaw-comment-thread__content">{item.content}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
