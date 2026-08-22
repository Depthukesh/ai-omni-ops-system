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
        {!items.length && !isLoading ? (
          <div className="note-empty-state">当前还没有留言，欢迎在这里补充修改意见。</div>
        ) : null}
        {items.map((item) => (
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
