"use client";

import { useEffect, useMemo, useState } from "react";

import { getStoredCurrentBrandId } from "../../../../services/auth-session";
import {
  deleteOperationsPromptWork,
  generateOperationsPromptWork,
  getOperationsPromptCenterOptions,
  getOperationsPromptTemplateDetail,
  getOperationsPromptWorks,
  type OperationsPromptCenterOptionsRecord,
  type OperationsPromptTemplateCardRecord,
  type OperationsPromptTemplateDetailRecord,
  type OperationsPromptWorkRecord,
} from "../../../../services/design";

type OperationsPromptFilters = {
  businessStage: string;
  outputType: string;
  scenario: string;
  keyword: string;
};

type OperationsPromptFormState = {
  title: string;
  brandProfileMode: "inject" | "skip";
  productId: string;
  calendarItemId: string;
  userRequirement: string;
  prompt: string;
};

const PRODUCT_SKIP_OPTION = {
  id: "",
  label: "不植入产品",
  description: "仅使用提示词原文、用户要求和营销日历，不额外植入指定产品。",
};

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(/\//g, "/");
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试。";
}

async function copyText(value: string) {
  if (!value.trim()) {
    return;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  throw new Error("当前环境不支持复制，请手动复制。");
}

function createOperationsPromptFormState(
  detail: OperationsPromptTemplateDetailRecord,
  options: OperationsPromptCenterOptionsRecord | null,
): OperationsPromptFormState {
  return {
    title: `${detail.title}生成稿`,
    brandProfileMode: options?.brandOptions[0]?.value ?? "inject",
    productId: "",
    calendarItemId: "",
    userRequirement: "",
    prompt: detail.content,
  };
}

function buildPendingOperationsPromptWork(
  template: OperationsPromptTemplateDetailRecord,
  form: OperationsPromptFormState,
): OperationsPromptWorkRecord {
  const updatedAt = new Date().toISOString();
  return {
    id: `pending-${updatedAt}-${Math.random().toString(36).slice(2, 8)}`,
    taskStatus: "QUEUED",
    title: form.title.trim() || `${template.title}生成稿`,
    status: "排队中",
    updatedAt,
    summary: "作品已进入后台生成队列，可关闭当前弹窗并在作品中心查看进度。",
    tags: [
      template.businessStage,
      template.outputType,
      template.scenarioLabel,
      form.brandProfileMode === "inject" ? "植入品牌资料" : "不植入品牌资料",
    ].filter(Boolean),
    templateId: template.id,
    templateTitle: template.title,
    generatedText: "",
    promptSnapshot: form.prompt.trim(),
    userRequirement: form.userRequirement.trim(),
    usedBrandProfile: form.brandProfileMode === "inject",
    usedProductLabel: "",
    usedCalendarLabel: "",
  };
}

function getWorkStatusTone(status: string) {
  if (status.includes("失败")) {
    return "status-danger";
  }
  if (status.includes("完成")) {
    return "status-ready";
  }
  return "status-pending";
}

function PromptTemplateDialog({
  open,
  loading,
  options,
  detail,
  form,
  submitError,
  submitting,
  onClose,
  onChange,
  onResetPrompt,
  onCopyPrompt,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  options: OperationsPromptCenterOptionsRecord | null;
  detail: OperationsPromptTemplateDetailRecord | null;
  form: OperationsPromptFormState;
  submitError: string;
  submitting: boolean;
  onClose: () => void;
  onChange: (field: keyof OperationsPromptFormState, value: string) => void;
  onResetPrompt: () => void;
  onCopyPrompt: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const productOptions = [PRODUCT_SKIP_OPTION, ...(options?.productOptions ?? [])];

  return (
    <div className="design-v3-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="design-v3-dialog ops-prompt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ops-prompt-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-dialog__header">
          <div>
            <strong id="ops-prompt-dialog-title">{detail?.title || "运营提示词模板"}</strong>
            <p>提示词原文来自后台模板真源。本次可编辑，但不会覆盖后台原模板；下次打开会自动恢复为后台存储内容。</p>
            {detail ? (
              <div className="ops-prompt-tag-row" style={{ marginTop: 12 }}>
                {detail.tags.map((tag) => (
                  <span key={tag} className="archive-pill status-pending">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="ops-prompt-inline-actions">
            <button type="button" className="secondary-button" onClick={() => void onCopyPrompt()} disabled={loading || !detail}>
              复制 Prompt
            </button>
            <button type="button" className="design-v3-text-button" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>

        <div className="design-v3-dialog__body">
          {loading ? <div className="empty-state">模板内容加载中...</div> : null}
          {submitError ? (
            <div className="empty-state" style={{ marginBottom: 16 }}>
              {submitError}
            </div>
          ) : null}

          <div className="ops-prompt-dialog-summary">
            <div className="ops-prompt-summary-card">
              <span>品牌资料</span>
              <strong>{options?.brandProfileSummary ? "可同步品牌背景资料" : "当前暂无品牌摘要"}</strong>
              <p>生成时可选择是否同步品牌背景资料，不会强制植入。</p>
            </div>
            <div className="ops-prompt-summary-card">
              <span>模型顺序</span>
              <strong>{(options?.modelSequence ?? []).slice(0, 2).join(" / ") || "待加载"}</strong>
              <p>{(options?.modelSequence ?? []).join(" -> ")}</p>
            </div>
          </div>

          <div className="design-v3-form-grid">
            <label className="design-v3-field">
              <span>作品标题</span>
              <input type="text" value={form.title} onChange={(event) => onChange("title", event.target.value)} />
            </label>
            <label className="design-v3-field">
              <span>品牌资料</span>
              <select
                value={form.brandProfileMode}
                onChange={(event) => onChange("brandProfileMode", event.target.value as OperationsPromptFormState["brandProfileMode"])}
              >
                {(options?.brandOptions ?? []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>产品资料</span>
              <select value={form.productId} onChange={(event) => onChange("productId", event.target.value)}>
                {productOptions.map((item) => (
                  <option key={`${item.id || "skip"}-${item.label}`} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>每日营销日历</span>
              <select value={form.calendarItemId} onChange={(event) => onChange("calendarItemId", event.target.value)}>
                <option value="">不植入营销日历</option>
                {(options?.calendarOptions ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field design-v3-field--full">
              <span>用户要求</span>
              <textarea
                rows={4}
                value={form.userRequirement}
                onChange={(event) => onChange("userRequirement", event.target.value)}
                placeholder="请输入本次生成的补充要求，例如语气、结构、篇幅、转化目标或使用场景。"
              />
            </label>
            <label className="design-v3-field design-v3-field--full">
              <span>可编辑 Prompt</span>
              <textarea
                className="ops-prompt-textarea"
                rows={18}
                value={form.prompt}
                onChange={(event) => onChange("prompt", event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="design-v3-dialog__footer ops-prompt-dialog-footer">
          <button type="button" className="secondary-button" onClick={onResetPrompt} disabled={!detail}>
            重置提示词
          </button>
          <div className="ops-prompt-inline-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void onSubmit()}
              disabled={submitting || !detail || !form.prompt.trim()}
            >
              {submitting ? "提交中..." : "生成"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorksCenterDialog({
  open,
  works,
  loading,
  deletingWorkId,
  selectedWorkId,
  onClose,
  onSelect,
  onDelete,
  onCopyGenerated,
}: {
  open: boolean;
  works: OperationsPromptWorkRecord[];
  loading: boolean;
  deletingWorkId: string | null;
  selectedWorkId: string | null;
  onClose: () => void;
  onSelect: (workId: string) => void;
  onDelete: (workId: string) => void | Promise<void>;
  onCopyGenerated: (text: string) => void | Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const selectedWork = works.find((item) => item.id === selectedWorkId) ?? works[0] ?? null;

  return (
    <div className="design-v3-dialog-backdrop design-v3-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="design-v3-preview-dialog ops-works-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ops-works-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-preview-header">
          <div>
            <strong id="ops-works-dialog-title">作品中心</strong>
            <p className="ops-works-dialog-subtitle">查看所有运营提示词生成记录，可继续查看结果正文并删除历史作品。</p>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="ops-works-layout">
          <div className="ops-works-list">
            {loading ? <div className="empty-state">作品中心加载中...</div> : null}
            {!loading && works.length === 0 ? <div className="empty-state">当前还没有生成作品，先从模板卡片发起一次生成。</div> : null}
            {!loading
              ? works.map((work) => (
                <article
                  key={work.id}
                  className={`ops-work-list-card ${selectedWork?.id === work.id ? "is-selected" : ""}`}
                >
                  <button type="button" className="ops-work-list-main" onClick={() => onSelect(work.id)}>
                    <div className="ops-work-list-meta">
                      <span className={`archive-pill ${getWorkStatusTone(work.status)}`}>{work.status}</span>
                      <span>{work.updatedAt}</span>
                    </div>
                    <strong>{work.title}</strong>
                    <p>{work.summary}</p>
                    <div className="ops-prompt-tag-row">
                      {work.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="archive-pill status-pending">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                  <div className="ops-work-list-actions">
                    <button type="button" className="tiny-action-button is-primary" onClick={() => onSelect(work.id)}>
                      查看
                    </button>
                    <button
                      type="button"
                      className="ghost-danger-button"
                      onClick={() => void onDelete(work.id)}
                      disabled={deletingWorkId === work.id}
                    >
                      {deletingWorkId === work.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </article>
              ))
              : null}
          </div>

          <div className="ops-works-detail">
            {selectedWork ? (
              <>
                <div className="ops-works-detail-head">
                  <div>
                    <div className="ops-work-list-meta">
                      <span className={`archive-pill ${getWorkStatusTone(selectedWork.status)}`}>{selectedWork.status}</span>
                      {selectedWork.modelName ? <span>{selectedWork.modelName}</span> : null}
                      <span>{selectedWork.updatedAt}</span>
                    </div>
                    <strong>{selectedWork.title}</strong>
                    <p>{selectedWork.templateTitle}</p>
                  </div>
                  <div className="ops-prompt-inline-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void onCopyGenerated(selectedWork.generatedText || "")}
                      disabled={!selectedWork.generatedText}
                    >
                      复制内容
                    </button>
                  </div>
                </div>

                <div className="ops-prompt-tag-row">
                  {selectedWork.tags.map((tag) => (
                    <span key={tag} className="archive-pill status-pending">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="ops-work-detail-blocks">
                  <div className="ops-work-detail-block">
                    <span>执行摘要</span>
                    <p>{selectedWork.summary}</p>
                  </div>
                  <div className="ops-work-detail-block">
                    <span>上下文</span>
                    <p>
                      品牌资料：{selectedWork.usedBrandProfile ? "已植入" : "未植入"}
                      {" | "}
                      产品：{selectedWork.usedProductLabel || "不植入产品"}
                      {" | "}
                      营销日历：{selectedWork.usedCalendarLabel || "不植入营销日历"}
                    </p>
                  </div>
                  {selectedWork.userRequirement ? (
                    <div className="ops-work-detail-block">
                      <span>用户要求</span>
                      <pre>{selectedWork.userRequirement}</pre>
                    </div>
                  ) : null}
                  {selectedWork.promptSnapshot ? (
                    <div className="ops-work-detail-block">
                      <span>本次 Prompt 快照</span>
                      <pre>{selectedWork.promptSnapshot}</pre>
                    </div>
                  ) : null}
                  <div className="ops-work-detail-block is-output">
                    <span>生成结果</span>
                    <pre>{selectedWork.generatedText || "当前作品尚未返回正文，可稍后刷新后再看。"}</pre>
                  </div>
                  {selectedWork.errorDetail ? (
                    <div className="ops-work-detail-block is-error">
                      <span>失败原因</span>
                      <pre>{selectedWork.errorDetail}</pre>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="empty-state">请选择左侧作品查看详情。</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OperationsPromptCenter() {
  const brandId = getStoredCurrentBrandId();
  const [options, setOptions] = useState<OperationsPromptCenterOptionsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState<OperationsPromptFilters>({
    businessStage: "",
    outputType: "",
    scenario: "",
    keyword: "",
  });
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OperationsPromptTemplateDetailRecord | null>(null);
  const [form, setForm] = useState<OperationsPromptFormState>({
    title: "",
    brandProfileMode: "inject",
    productId: "",
    calendarItemId: "",
    userRequirement: "",
    prompt: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [worksDialogOpen, setWorksDialogOpen] = useState(false);
  const [works, setWorks] = useState<OperationsPromptWorkRecord[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [deletingWorkId, setDeletingWorkId] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  const filteredTemplates = useMemo(() => {
    const list = options?.templates ?? [];
    return list.filter((item) => {
      if (filters.businessStage && item.businessStage !== filters.businessStage) {
        return false;
      }
      if (filters.outputType && item.outputType !== filters.outputType) {
        return false;
      }
      if (filters.scenario && item.scenarioLabel !== filters.scenario) {
        return false;
      }
      if (filters.keyword) {
        const sample = [item.title, item.preview, item.tags.join(" ")].join(" ").toLowerCase();
        if (!sample.includes(filters.keyword.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [filters, options]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setWorksLoading(true);
      setLoadError("");

      try {
        const [nextOptions, nextWorks] = await Promise.all([
          getOperationsPromptCenterOptions(brandId),
          getOperationsPromptWorks(brandId),
        ]);
        if (cancelled) {
          return;
        }
        setOptions(nextOptions);
        setWorks(nextWorks.items);
        setSelectedWorkId(nextWorks.items[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(normalizeErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setWorksLoading(false);
        }
      }
    }

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  useEffect(() => {
    if (!copyFeedback) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopyFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

  const handleRefresh = async () => {
    setLoading(true);
    setWorksLoading(true);
    setLoadError("");
    try {
      const [nextOptions, nextWorks] = await Promise.all([
        getOperationsPromptCenterOptions(brandId),
        getOperationsPromptWorks(brandId),
      ]);
      setOptions(nextOptions);
      setWorks(nextWorks.items);
      setSelectedWorkId((current) => {
        if (current && nextWorks.items.some((item) => item.id === current)) {
          return current;
        }
        return nextWorks.items[0]?.id ?? null;
      });
    } catch (error) {
      setLoadError(normalizeErrorMessage(error));
    } finally {
      setLoading(false);
      setWorksLoading(false);
    }
  };

  const handleOpenTemplate = async (templateId: string) => {
    setDialogOpen(true);
    setDetailLoading(true);
    setSubmitError("");
    try {
      const detail = await getOperationsPromptTemplateDetail(templateId, brandId);
      setSelectedTemplate(detail);
      setForm(createOperationsPromptFormState(detail, options));
    } catch (error) {
      setSubmitError(normalizeErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseTemplateDialog = () => {
    setDialogOpen(false);
    setSelectedTemplate(null);
    setSubmitError("");
    setSubmitting(false);
  };

  const handleCopyTemplate = async (template: OperationsPromptTemplateCardRecord) => {
    try {
      const detail = await getOperationsPromptTemplateDetail(template.id, brandId);
      await copyText(detail.content);
      setCopyFeedback(`已复制：${template.title}`);
    } catch (error) {
      setLoadError(normalizeErrorMessage(error));
    }
  };

  const handleCopyCurrentPrompt = async () => {
    try {
      await copyText(form.prompt);
      setCopyFeedback("已复制当前 Prompt");
    } catch (error) {
      setSubmitError(normalizeErrorMessage(error));
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      return;
    }

    const pendingWork = buildPendingOperationsPromptWork(selectedTemplate, form);
    setWorks((current) => [pendingWork, ...current]);
    setSelectedWorkId(pendingWork.id);
    setSubmitting(true);
    setSubmitError("");

    try {
      const createdWork = await generateOperationsPromptWork(
        {
          templateId: selectedTemplate.id,
          title: form.title.trim() || undefined,
          injectBrandProfile: form.brandProfileMode === "inject",
          productId: form.productId || undefined,
          calendarItemId: form.calendarItemId || undefined,
          userRequirement: form.userRequirement.trim() || undefined,
          editedPrompt: form.prompt.trim(),
        },
        brandId,
      );
      setWorks((current) => [createdWork, ...current.filter((item) => item.id !== pendingWork.id)]);
      setSelectedWorkId(createdWork.id);
      setDialogOpen(false);
      setSelectedTemplate(null);
      setCopyFeedback("作品已提交到后台生成");
    } catch (error) {
      const message = normalizeErrorMessage(error);
      setSubmitError(message);
      setWorks((current) =>
        current.map((item) =>
          item.id === pendingWork.id
            ? {
                ...item,
                taskStatus: "FAILED",
                status: "执行失败",
                summary: message,
                errorDetail: message,
              }
            : item,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWork = async (workId: string) => {
    const previousWorks = works;
    const nextWorks = works.filter((item) => item.id !== workId);
    setDeletingWorkId(workId);
    setWorks(nextWorks);
    setSelectedWorkId((current) => {
      if (current && current !== workId) {
        return current;
      }
      return nextWorks[0]?.id ?? null;
    });
    try {
      await deleteOperationsPromptWork(workId, brandId);
    } catch (error) {
      setWorks(previousWorks);
      setSelectedWorkId(previousWorks[0]?.id ?? null);
      setLoadError(normalizeErrorMessage(error));
    } finally {
      setDeletingWorkId(null);
    }
  };

  const handleCopyGenerated = async (text: string) => {
    try {
      await copyText(text);
      setCopyFeedback("已复制生成内容");
    } catch (error) {
      setLoadError(normalizeErrorMessage(error));
    }
  };

  return (
    <>
      <article className="workspace-panel strategy-page-card ops-prompt-shell">
        <div className="ops-prompt-topbar">
          <div>
            <strong>运营提示词中心</strong>
            <p>Reading this as: 提示词模板工作台 for 运营同学，with a premium editorial utility language, leaning toward restrained cards + compact filters + clear modal hierarchy.</p>
          </div>
          <div className="ops-prompt-inline-actions">
            <button type="button" className="secondary-button" onClick={handleRefresh} disabled={loading}>
              {loading ? "刷新中..." : "刷新模板"}
            </button>
            <button type="button" className="primary-button" onClick={() => setWorksDialogOpen(true)}>
              作品中心
            </button>
          </div>
        </div>

        <div className="ops-prompt-hero">
          <div className="ops-prompt-hero-copy">
            <span>后台统一管理</span>
            <strong>{options?.templates.length ?? 0} 个提示词模板已接入</strong>
            <p>卡片只展示标题和预览，点击后可编辑 Prompt、选择是否同步品牌背景资料、产品资料和每日营销日历，再提交到后台异步生成。</p>
          </div>
          <div className="ops-prompt-hero-stats">
            <div className="ops-prompt-stat-card">
              <span>模型链路</span>
              <strong>{options?.modelSequence[0] || "待加载"}</strong>
              <p>{options?.modelSequence.join(" -> ") || "待加载"}</p>
            </div>
            <div className="ops-prompt-stat-card">
              <span>最近刷新</span>
              <strong>{formatTimestamp(new Date())}</strong>
              <p>可随时刷新模板与作品记录，前端不保存模板原文。</p>
            </div>
          </div>
        </div>

        <div className="ops-prompt-filters">
          <label className="design-v3-field">
            <span>经营阶段</span>
            <select value={filters.businessStage} onChange={(event) => setFilters((current) => ({ ...current, businessStage: event.target.value }))}>
              <option value="">全部</option>
              {(options?.filters.businessStages ?? []).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </label>
          <label className="design-v3-field">
            <span>输出类型</span>
            <select value={filters.outputType} onChange={(event) => setFilters((current) => ({ ...current, outputType: event.target.value }))}>
              <option value="">全部</option>
              {(options?.filters.outputTypes ?? []).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </label>
          <label className="design-v3-field">
            <span>场景标签</span>
            <select value={filters.scenario} onChange={(event) => setFilters((current) => ({ ...current, scenario: event.target.value }))}>
              <option value="">全部</option>
              {(options?.filters.scenarios ?? []).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </label>
          <label className="design-v3-field">
            <span>关键词</span>
            <input
              type="text"
              value={filters.keyword}
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
              placeholder="搜索标题、预览或标签"
            />
          </label>
        </div>

        {copyFeedback ? (
          <div className="ops-prompt-feedback">
            <span className="archive-pill status-ready">{copyFeedback}</span>
          </div>
        ) : null}

        {loadError ? <div className="empty-state">{loadError}</div> : null}
        {loading ? <div className="empty-state">提示词模板加载中...</div> : null}

        {!loading ? (
          <div className="ops-prompt-grid">
            {filteredTemplates.map((template) => (
              <article key={template.id} className="ops-prompt-card">
                <button type="button" className="ops-prompt-card-main" onClick={() => void handleOpenTemplate(template.id)}>
                  <div className="ops-prompt-card-head">
                    <span>{template.sourceCategory}</span>
                    <strong>{template.title}</strong>
                  </div>
                  <p>{template.preview}</p>
                  <div className="ops-prompt-tag-row">
                    {template.tags.map((tag) => (
                      <span key={tag} className="archive-pill status-pending">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
                <div className="ops-prompt-card-actions">
                  <button type="button" className="secondary-button" onClick={() => void handleCopyTemplate(template)}>
                    复制 Prompt
                  </button>
                  <button type="button" className="primary-button" onClick={() => void handleOpenTemplate(template.id)}>
                    生成
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && filteredTemplates.length === 0 ? (
          <div className="empty-state">当前筛选条件下没有匹配模板，换一个标签或关键词试试。</div>
        ) : null}
      </article>

      <PromptTemplateDialog
        open={dialogOpen}
        loading={detailLoading}
        options={options}
        detail={selectedTemplate}
        form={form}
        submitError={submitError}
        submitting={submitting}
        onClose={handleCloseTemplateDialog}
        onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
        onResetPrompt={() => {
          if (selectedTemplate) {
            setForm((current) => ({ ...current, prompt: selectedTemplate.content }));
          }
        }}
        onCopyPrompt={handleCopyCurrentPrompt}
        onSubmit={handleGenerate}
      />

      <WorksCenterDialog
        open={worksDialogOpen}
        works={works}
        loading={worksLoading}
        deletingWorkId={deletingWorkId}
        selectedWorkId={selectedWorkId}
        onClose={() => setWorksDialogOpen(false)}
        onSelect={setSelectedWorkId}
        onDelete={handleDeleteWork}
        onCopyGenerated={handleCopyGenerated}
      />
    </>
  );
}
