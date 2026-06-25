"use client";

import { useEffect, useMemo, useState } from "react";

import { getStoredCurrentBrandId } from "../../../../services/auth-session";
import {
  deleteImagePromptWork,
  generateImagePromptWork,
  getImagePromptCenterOptions,
  getImagePromptTemplateDetail,
  getImagePromptWorks,
  type ImagePromptCenterOptionsRecord,
  type ImagePromptTemplateCardRecord,
  type ImagePromptTemplateDetailRecord,
  type ImagePromptWorkRecord,
} from "../../../../services/design";

type ImagePromptFilters = {
  category: string;
  keyword: string;
};

type ImagePromptFormState = {
  title: string;
  brandProfileMode: "inject" | "skip";
  productId: string;
  calendarItemId: string;
  userRequirement: string;
  prompt: string;
  referenceImageFile: File | null;
  referenceImagePreviewUrl: string;
};

const PRODUCT_SKIP_OPTION = {
  id: "",
  label: "不植入产品",
  description: "仅使用当前 Prompt、用户要求、营销日历和参考图，不额外植入指定产品。",
};

const IMAGE_PROMPT_PAGE_SIZE = 30;

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

function revokeObjectUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function createImagePromptFormState(
  detail: ImagePromptTemplateDetailRecord,
  options: ImagePromptCenterOptionsRecord | null,
): ImagePromptFormState {
  return {
    title: `${detail.title}成图`,
    brandProfileMode: options?.brandOptions[0]?.value ?? "inject",
    productId: "",
    calendarItemId: "",
    userRequirement: "",
    prompt: detail.content,
    referenceImageFile: null,
    referenceImagePreviewUrl: detail.previewImageUrl || "",
  };
}

function buildPendingImagePromptWork(
  template: ImagePromptTemplateDetailRecord,
  form: ImagePromptFormState,
): ImagePromptWorkRecord {
  const createdAt = new Date().toISOString();
  return {
    id: `pending-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    taskStatus: "QUEUED",
    title: form.title.trim() || `${template.title}成图`,
    status: "排队中",
    createdAt,
    updatedAt: createdAt,
    summary: "作品已进入后台生成队列，可关闭当前弹窗并在作品中心查看进度。",
    tags: [template.categoryLabel, ...template.tags].filter(Boolean).slice(0, 8),
    templateId: template.id,
    templateTitle: template.title,
    assetUrl: "",
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

function ImagePromptDialog({
  open,
  loading,
  options,
  detail,
  form,
  submitError,
  submitting,
  onClose,
  onChange,
  onFileChange,
  onResetPrompt,
  onCopyPrompt,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  options: ImagePromptCenterOptionsRecord | null;
  detail: ImagePromptTemplateDetailRecord | null;
  form: ImagePromptFormState;
  submitError: string;
  submitting: boolean;
  onClose: () => void;
  onChange: (field: keyof Omit<ImagePromptFormState, "referenceImageFile">, value: string) => void;
  onFileChange: (file: File | null) => void;
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
        aria-labelledby="image-prompt-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-dialog__header">
          <div>
            <strong id="image-prompt-dialog-title">{detail?.title || "生图提示词模板"}</strong>
            <p>支持同步品牌资料、产品资料、每日营销日历，并可上传参考图后直接调用 Right Codes gpt-image-2 生成图片。</p>
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
              <p>可按需决定是否在当前图片 Prompt 中植入品牌背景与行业信息。</p>
            </div>
            <div className="ops-prompt-summary-card">
              <span>生图模型</span>
              <strong>{options?.modelLabel || "待加载"}</strong>
              <p>点击生成后直接进入后台生图队列，并产出单张成图。</p>
            </div>
          </div>

          <div className="design-v3-form-grid">
            <label className="design-v3-field">
              <span>标题</span>
              <input type="text" value={form.title} onChange={(event) => onChange("title", event.target.value)} />
            </label>
            <label className="design-v3-field">
              <span>品牌资料</span>
              <select
                value={form.brandProfileMode}
                onChange={(event) => onChange("brandProfileMode", event.target.value as ImagePromptFormState["brandProfileMode"])}
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
                placeholder="请输入本次生图的补充要求，例如画面风格、构图、材质、镜头、文案氛围或出图限制。"
              />
            </label>
            <label className="design-v3-field design-v3-field--full">
              <span>上传图片</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onFileChange(event.target.files?.[0] || null)}
              />
            </label>
            <div className="design-v3-field design-v3-field--full">
              <span>预览图片</span>
              <div className="image-prompt-preview-grid">
                <div className="image-prompt-preview-card">
                  <strong>模板预览</strong>
                  {detail?.previewImageUrl ? <img src={detail.previewImageUrl} alt={detail.title} /> : <div className="empty-state">当前模板暂无预览图</div>}
                </div>
                <div className="image-prompt-preview-card">
                  <strong>参考图预览</strong>
                  {form.referenceImagePreviewUrl ? <img src={form.referenceImagePreviewUrl} alt="上传参考图预览" /> : <div className="empty-state">上传后会在此显示预览</div>}
                </div>
              </div>
            </div>
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

function ImageWorksCenterDialog({
  open,
  works,
  loading,
  deletingWorkId,
  selectedWorkId,
  onClose,
  onSelect,
  onDelete,
}: {
  open: boolean;
  works: ImagePromptWorkRecord[];
  loading: boolean;
  deletingWorkId: string | null;
  selectedWorkId: string | null;
  onClose: () => void;
  onSelect: (workId: string) => void;
  onDelete: (workId: string) => void | Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const selectedWork = works.find((item) => item.id === selectedWorkId) ?? null;

  return (
    <div className="design-v3-dialog-backdrop design-v3-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="design-v3-preview-dialog ops-works-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-works-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-preview-header">
          <div>
            <strong id="image-works-dialog-title">作品中心</strong>
            <p className="ops-works-dialog-subtitle">查看所有生图记录，可预览最终图片并删除历史作品。</p>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="ops-works-dialog__body">
          <div className="ops-works-dialog__summary">
            <div className="ops-works-dialog__summary-card">
              <span>作品总数</span>
              <strong>{works.length}</strong>
            </div>
            <div className="ops-works-dialog__summary-card">
              <span>当前查看</span>
              <strong>{selectedWork ? selectedWork.title : "未选择作品"}</strong>
            </div>
          </div>

          <div className="ops-works-table-shell">
            {loading ? <div className="empty-state">作品中心加载中...</div> : null}
            {!loading && works.length === 0 ? <div className="empty-state">当前还没有生成作品，先从模板卡片发起一次生成。</div> : null}
            {!loading && works.length > 0 ? (
              <>
                <div className="ops-works-table ops-works-table--head" role="presentation">
                  <span>标题</span>
                  <span>提示词名称</span>
                  <span>创建时间</span>
                  <span>生成状态</span>
                  <span>查看</span>
                  <span>删除</span>
                </div>
                <div className="ops-works-table-body">
                  {works.map((work) => (
                    <article
                      key={work.id}
                      className={`ops-works-row ${selectedWork?.id === work.id ? "is-selected" : ""}`}
                    >
                      <div className="ops-works-cell">
                        <strong>{work.title}</strong>
                      </div>
                      <div className="ops-works-cell">
                        <span>{work.templateTitle}</span>
                      </div>
                      <div className="ops-works-cell">
                        <span>{formatTimestamp(new Date(work.createdAt || work.updatedAt))}</span>
                      </div>
                      <div className="ops-works-cell">
                        <span className={`archive-pill ${getWorkStatusTone(work.status)}`}>{work.status}</span>
                      </div>
                      <div className="ops-works-cell">
                        <button type="button" className="tiny-action-button is-primary" onClick={() => onSelect(work.id)}>
                          查看
                        </button>
                      </div>
                      <div className="ops-works-cell">
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
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {selectedWork ? (
            <div className="ops-works-detail-panel">
              <div className="ops-works-detail-panel-head">
                <div>
                  <strong>{selectedWork.title}</strong>
                  <p>
                    {selectedWork.templateTitle}
                    {" | "}
                    创建于 {formatTimestamp(new Date(selectedWork.createdAt || selectedWork.updatedAt))}
                  </p>
                </div>
              </div>
              <div className="ops-work-detail-block is-output">
                <span>生成图片预览</span>
                {selectedWork.assetUrl ? (
                  <div className="image-prompt-work-preview">
                    <img src={selectedWork.assetUrl} alt={selectedWork.title} />
                  </div>
                ) : (
                  <pre>{selectedWork.errorDetail || "当前作品尚未返回图片，可稍后刷新后再看。"}</pre>
                )}
              </div>
              <div className="ops-work-detail-block">
                <span>Prompt 快照</span>
                <pre>{selectedWork.promptSnapshot || "当前未记录 Prompt 快照。"}</pre>
              </div>
            </div>
          ) : null}
          {!loading && works.length > 0 && !selectedWork ? (
            <div className="empty-state">点击列表里的查看按钮，即可在下方查看生成图片。</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ImagePromptCenter() {
  const brandId = getStoredCurrentBrandId();
  const [options, setOptions] = useState<ImagePromptCenterOptionsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState<ImagePromptFilters>({
    category: "",
    keyword: "",
  });
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ImagePromptTemplateDetailRecord | null>(null);
  const [form, setForm] = useState<ImagePromptFormState>({
    title: "",
    brandProfileMode: "inject",
    productId: "",
    calendarItemId: "",
    userRequirement: "",
    prompt: "",
    referenceImageFile: null,
    referenceImagePreviewUrl: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [worksDialogOpen, setWorksDialogOpen] = useState(false);
  const [works, setWorks] = useState<ImagePromptWorkRecord[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [deletingWorkId, setDeletingWorkId] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTemplates = useMemo(() => {
    const list = options?.templates ?? [];
    return list.filter((item) => {
      if (filters.category && item.categoryLabel !== filters.category) {
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

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / IMAGE_PROMPT_PAGE_SIZE));
  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * IMAGE_PROMPT_PAGE_SIZE;
    return filteredTemplates.slice(startIndex, startIndex + IMAGE_PROMPT_PAGE_SIZE);
  }, [currentPage, filteredTemplates]);
  const currentRangeStart = filteredTemplates.length ? (currentPage - 1) * IMAGE_PROMPT_PAGE_SIZE + 1 : 0;
  const currentRangeEnd = filteredTemplates.length ? Math.min(currentPage * IMAGE_PROMPT_PAGE_SIZE, filteredTemplates.length) : 0;

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setWorksLoading(true);
      setLoadError("");

      try {
        const [nextOptions, nextWorks] = await Promise.all([
          getImagePromptCenterOptions(brandId),
          getImagePromptWorks(brandId),
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

  useEffect(() => {
    return () => {
      revokeObjectUrl(form.referenceImagePreviewUrl);
    };
  }, [form.referenceImagePreviewUrl]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.category, filters.keyword]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const updateReferenceFile = (file: File | null, fallbackUrl = selectedTemplate?.previewImageUrl || "") => {
    setForm((current) => {
      revokeObjectUrl(current.referenceImagePreviewUrl);
      return {
        ...current,
        referenceImageFile: file,
        referenceImagePreviewUrl: file ? URL.createObjectURL(file) : fallbackUrl,
      };
    });
  };

  const handleRefresh = async () => {
    setLoading(true);
    setWorksLoading(true);
    setLoadError("");
    try {
      const [nextOptions, nextWorks] = await Promise.all([
        getImagePromptCenterOptions(brandId),
        getImagePromptWorks(brandId),
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
      const detail = await getImagePromptTemplateDetail(templateId, brandId);
      setSelectedTemplate(detail);
      setForm(createImagePromptFormState(detail, options));
    } catch (error) {
      setSubmitError(normalizeErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseTemplateDialog = () => {
    revokeObjectUrl(form.referenceImagePreviewUrl);
    setDialogOpen(false);
    setSelectedTemplate(null);
    setSubmitError("");
    setSubmitting(false);
    setForm({
      title: "",
      brandProfileMode: "inject",
      productId: "",
      calendarItemId: "",
      userRequirement: "",
      prompt: "",
      referenceImageFile: null,
      referenceImagePreviewUrl: "",
    });
  };

  const handleCopyTemplate = async (template: ImagePromptTemplateCardRecord) => {
    try {
      const detail = await getImagePromptTemplateDetail(template.id, brandId);
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

    const pendingWork = buildPendingImagePromptWork(selectedTemplate, form);
    setWorks((current) => [pendingWork, ...current]);
    setSelectedWorkId(pendingWork.id);
    setSubmitting(true);
    setSubmitError("");

    try {
      const createdWork = await generateImagePromptWork(
        {
          templateId: selectedTemplate.id,
          title: form.title.trim() || undefined,
          injectBrandProfile: form.brandProfileMode === "inject",
          productId: form.productId || undefined,
          calendarItemId: form.calendarItemId || undefined,
          userRequirement: form.userRequirement.trim() || undefined,
          editedPrompt: form.prompt.trim() || undefined,
          referenceImageFile: form.referenceImageFile,
        },
        brandId,
      );
      setWorks((current) => [createdWork, ...current.filter((item) => item.id !== pendingWork.id)]);
      setSelectedWorkId(createdWork.id);
      handleCloseTemplateDialog();
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
                status: "生成失败",
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
      await deleteImagePromptWork(workId, brandId);
    } catch (error) {
      setWorks(previousWorks);
      setSelectedWorkId(previousWorks[0]?.id ?? null);
      setLoadError(normalizeErrorMessage(error));
    } finally {
      setDeletingWorkId(null);
    }
  };

  return (
    <>
      <article className="workspace-panel strategy-page-card ops-prompt-shell">
        <div className="ops-prompt-topbar">
          <div>
            <strong>生图提示词中心</strong>
            <p>后台统一管理图像 Prompt 与模板预览图，支持可编辑 Prompt、参考图上传与异步生图。</p>
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
            <strong>{options?.templates.length ?? 0} 个生图模板已接入</strong>
            <p>卡片展示标题、图片与分类标签，点击后可补充品牌资料、产品资料、营销日历、用户要求和参考图，再提交后台生成。</p>
          </div>
          <div className="ops-prompt-hero-stats">
            <div className="ops-prompt-stat-card">
              <span>模型链路</span>
              <strong>{options?.modelLabel || "待加载"}</strong>
              <p>生成时直接固定调用 Right Codes gpt-image-2。</p>
            </div>
            <div className="ops-prompt-stat-card">
              <span>最近刷新</span>
              <strong>{formatTimestamp(new Date())}</strong>
              <p>模板真源与作品记录都可随时刷新，前端不保存原始模板内容。</p>
            </div>
          </div>
        </div>

        <div className="ops-prompt-filters">
          <label className="design-v3-field">
            <span>分类标签</span>
            <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
              <option value="">全部</option>
              {(options?.filters.categories ?? []).map((item) => (
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

        {!loading && filteredTemplates.length > 0 ? (
          <div className="ops-prompt-pagination-bar">
            <div className="ops-prompt-pagination-summary">
              <strong>共 {filteredTemplates.length} 条模板</strong>
              <span>
                当前显示 {currentRangeStart}-{currentRangeEnd} 条，第 {currentPage}/{totalPages} 页，每页 30 条
              </span>
            </div>
            <div className="ops-prompt-pagination-buttons">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={`ops-prompt-page-button${page === currentPage ? " is-active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          </div>
        ) : null}

        {copyFeedback ? (
          <div className="ops-prompt-feedback">
            <span className="archive-pill status-ready">{copyFeedback}</span>
          </div>
        ) : null}

        {loadError ? <div className="empty-state">{loadError}</div> : null}
        {loading ? <div className="empty-state">生图模板加载中...</div> : null}

        {!loading ? (
          <div className="ops-prompt-grid">
            {paginatedTemplates.map((template) => (
              <article key={template.id} className="ops-prompt-card image-prompt-card">
                <button type="button" className="ops-prompt-card-main" onClick={() => void handleOpenTemplate(template.id)}>
                  <div className="image-prompt-card-preview">
                    {template.previewImageUrl ? <img src={template.previewImageUrl} alt={template.title} /> : <div className="empty-state">暂无预览图</div>}
                  </div>
                  <div className="ops-prompt-card-head">
                    <span>{template.sourceCategory}</span>
                    <strong>{template.title}</strong>
                  </div>
                  <p>{template.preview}</p>
                  <div className="ops-prompt-tag-row">
                    {[template.categoryLabel, ...template.tags].filter(Boolean).slice(0, 6).map((tag) => (
                      <span key={`${template.id}-${tag}`} className="archive-pill status-pending">
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

        {!loading && filteredTemplates.length > 0 ? (
          <div className="ops-prompt-pagination-bar is-footer">
            <div className="ops-prompt-pagination-summary">
              <strong>翻页浏览</strong>
              <span>点击页码可快速跳转，避免一次性拉取过长列表。</span>
            </div>
            <div className="ops-prompt-pagination-buttons">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  type="button"
                  key={`footer-${page}`}
                  className={`ops-prompt-page-button${page === currentPage ? " is-active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          </div>
        ) : null}
      </article>

      <ImagePromptDialog
        open={dialogOpen}
        loading={detailLoading}
        options={options}
        detail={selectedTemplate}
        form={form}
        submitError={submitError}
        submitting={submitting}
        onClose={handleCloseTemplateDialog}
        onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
        onFileChange={(file) => updateReferenceFile(file)}
        onResetPrompt={() => {
          if (selectedTemplate) {
            updateReferenceFile(null, selectedTemplate.previewImageUrl || "");
            setForm((current) => ({ ...current, prompt: selectedTemplate.content }));
          }
        }}
        onCopyPrompt={handleCopyCurrentPrompt}
        onSubmit={handleGenerate}
      />

      <ImageWorksCenterDialog
        open={worksDialogOpen}
        works={works}
        loading={worksLoading}
        deletingWorkId={deletingWorkId}
        selectedWorkId={selectedWorkId}
        onClose={() => setWorksDialogOpen(false)}
        onSelect={setSelectedWorkId}
        onDelete={handleDeleteWork}
      />
    </>
  );
}
