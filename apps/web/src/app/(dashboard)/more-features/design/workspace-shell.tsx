"use client";

import { useEffect, useMemo, useState } from "react";

import { flattenSkillCenterLeaves } from "../../skill-center-config";
import { getStoredCurrentBrandId } from "../../../../services/auth-session";
import {
  type DesignGeneratedWorkRecord,
  type DesignModelOptionRecord,
  type DesignModuleKey,
  type DesignWorkspaceOptionsRecord,
  generateDesignWork,
  getDesignWorkspaceOptions,
} from "../../../../services/design";

type DesignWork = DesignGeneratedWorkRecord;

type DesignFormState = {
  title: string;
  skillSlug: string;
  calendarItemId: string;
  productId: string;
  brandProfileMode: "inject" | "skip";
  type: string;
  modelSelection: string;
  spec: string;
  prompt: string;
};

type StaticDesignModuleMeta = {
  key: DesignModuleKey;
  label: string;
  description: string;
  createLabel: string;
  modelLabel: string;
};

type DesignModuleMeta = StaticDesignModuleMeta & {
  types: string[];
  models: DesignModelOptionRecord[];
  skillLeaves: Array<{
    id: string;
    label: string;
    description: string;
    skillSlug?: string;
  }>;
};

const DESIGN_MODULES: DesignModuleKey[] = ["image", "html", "deck", "video"];

const DESIGN_MODULE_META_MAP: Record<DesignModuleKey, StaticDesignModuleMeta> = {
  image: {
    key: "image",
    label: "图片设计",
    description: "按 Open Design 的图片技能组织，当前聚焦社媒轮播图、杂志风海报、品牌封面图等静态视觉设计。",
    createLabel: "创建图片设计",
    modelLabel: "生图大模型",
  },
  html: {
    key: "html",
    label: "HTML 设计",
    description: "按 Open Design 的 HTML 技能组织，当前覆盖单页原型、数据看板、移动端引导和品牌展示页。",
    createLabel: "创建 HTML 设计",
    modelLabel: "页面生成引擎",
  },
  deck: {
    key: "deck",
    label: "PPT 设计",
    description: "按 Open Design 的 deck 技能组织，当前聚焦 Pitch Deck、品牌提案和周报汇报等演示稿设计。",
    createLabel: "创建 PPT 设计",
    modelLabel: "PPT 生成引擎",
  },
  video: {
    key: "video",
    label: "视频设计",
    description: "按 Open Design 的视频技能组织，当前聚焦视频故事板、分镜脚本和动效脚本方案。",
    createLabel: "创建视频设计",
    modelLabel: "视频生成引擎",
  },
};

const DESIGN_SKILL_SLUGS_BY_MODULE: Record<DesignModuleKey, string[]> = {
  image: ["design-social-carousel", "design-magazine-poster"],
  html: ["design-web-prototype", "design-dashboard", "design-mobile-onboarding"],
  deck: ["design-pitch-deck"],
  video: ["design-video-storyboard"],
};

const DESIGN_SKILL_LEAVES = flattenSkillCenterLeaves().filter((item) => item.primaryId === "design-workspace");

const PRODUCT_SKIP_OPTION = {
  id: "",
  label: "不植入产品",
  description: "仅使用营销日历、品牌资料与用户要求生成，不额外带入具体产品。",
};

const DESIGN_SPEC_PRESETS: Record<DesignModuleKey, string[]> = {
  image: ["1080x1920", "1242x1660", "1080x1080", "750x1334", "800x800"],
  html: ["PC 1440x1024", "H5 390x844", "落地页 1920x1080", "数据看板 1920x1080", "平板 1024x1366"],
  deck: ["16:9 标准版式", "4:3 传统版式", "宽屏提案版式", "10 页以内", "20 页以内"],
  video: ["9:16 竖版 1080x1920", "16:9 横版 1920x1080", "1:1 方版 1080x1080", "15 秒", "30 秒"],
};

function getDefaultSpec(moduleKey: DesignModuleKey) {
  return DESIGN_SPEC_PRESETS[moduleKey][0] ?? "";
}

function getDefaultModelSelection(models: DesignModelOptionRecord[]) {
  return models.find((item) => item.recommended)?.selectionKey ?? models[0]?.selectionKey ?? "";
}

function createDefaultFormState(moduleKey: DesignModuleKey, options?: DesignWorkspaceOptionsRecord | null): DesignFormState {
  const moduleOptions = options?.moduleOptions[moduleKey];
  const moduleLabel = DESIGN_MODULE_META_MAP[moduleKey].label;
  const defaultSkillSlug = DESIGN_SKILL_SLUGS_BY_MODULE[moduleKey][0] ?? "";

  return {
    title: `${moduleOptions?.types[0] ?? moduleLabel}方案`,
    skillSlug: defaultSkillSlug,
    calendarItemId: options?.calendarOptions[0]?.id ?? "",
    productId: "",
    brandProfileMode: options?.brandOptions[0]?.value ?? "inject",
    type: moduleOptions?.types[0] ?? "",
    modelSelection: getDefaultModelSelection(moduleOptions?.models ?? []),
    spec: getDefaultSpec(moduleKey),
    prompt: `请结合当前品牌营销日历、品牌资料、产品信息和用户要求，生成一版可继续迭代的${moduleLabel}方案。`,
  };
}

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

function buildPendingDesignWork(params: {
  module: DesignModuleKey;
  title: string;
  designType: string;
  skillLabel: string;
  productLabel: string;
}) {
  const updatedAt = new Date().toISOString();
  return {
    id: `pending-${updatedAt}-${Math.random().toString(36).slice(2, 8)}`,
    taskStatus: "RUNNING" as const,
    module: params.module,
    skillLabel: params.skillLabel,
    title: params.title,
    status: "执行中",
    updatedAt,
    summary: `正在调用 ${params.skillLabel}，生成${params.designType}，请等待本次任务返回。`,
    tags: [params.skillLabel, params.designType, params.productLabel || "不植入产品", "执行中"],
  };
}

function createEmptyWorksByModule() {
  return DESIGN_MODULES.reduce<Record<DesignModuleKey, DesignWork[]>>((accumulator, moduleKey) => {
    accumulator[moduleKey] = [];
    return accumulator;
  }, {} as Record<DesignModuleKey, DesignWork[]>);
}

function createInitialRefreshByModule() {
  return DESIGN_MODULES.reduce<Record<DesignModuleKey, string>>((accumulator, moduleKey) => {
    accumulator[moduleKey] = "尚未刷新";
    return accumulator;
  }, {} as Record<DesignModuleKey, string>);
}

function createInitialSelectedByModule() {
  return DESIGN_MODULES.reduce<Record<DesignModuleKey, string | null>>((accumulator, moduleKey) => {
    accumulator[moduleKey] = null;
    return accumulator;
  }, {} as Record<DesignModuleKey, string | null>);
}

function getWorkId(work: DesignWork) {
  return work.id;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

interface DesignWorkspaceShellProps {
  section: { label: string; description: string };
}

function DesignCreateDialog({
  module,
  open,
  loadingOptions,
  options,
  form,
  referenceFileName,
  submitting,
  submitError,
  onClose,
  onChange,
  onReferenceChange,
  onSubmit,
}: {
  module: DesignModuleMeta;
  open: boolean;
  loadingOptions: boolean;
  options: DesignWorkspaceOptionsRecord | null;
  form: DesignFormState;
  referenceFileName: string;
  submitting: boolean;
  submitError: string;
  onClose: () => void;
  onChange: (field: keyof DesignFormState, value: string) => void;
  onReferenceChange: (file: File | null) => void;
  onSubmit: () => void;
}) {
  const productOptions = useMemo(
    () => [PRODUCT_SKIP_OPTION, ...(options?.productOptions ?? [])],
    [options],
  );
  const specOptions = DESIGN_SPEC_PRESETS[module.key] ?? [];

  if (!open) {
    return null;
  }

  return (
    <div className="design-v3-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="design-v3-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-v3-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-dialog__header">
          <div>
            <strong id="design-v3-dialog-title">{module.createLabel}</strong>
            <p>选项来自当前品牌档案、营销日历和第三方模型配置，提交后直接调用真实生成链路。</p>
            {module.skillLeaves.length ? (
              <p style={{ marginTop: 6, color: "rgba(83, 88, 120, 0.82)" }}>
                当前模块对应技能：{module.skillLeaves.map((item) => item.label).join(" / ")}
              </p>
            ) : null}
          </div>
          <button type="button" className="design-v3-text-button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="design-v3-dialog__body">
          {submitError ? (
            <div className="empty-state" style={{ marginBottom: 16 }}>
              {submitError}
            </div>
          ) : null}

          <div className="design-v3-form-grid">
            <label className="design-v3-field">
              <span>作品名称</span>
              <input type="text" value={form.title} onChange={(event) => onChange("title", event.target.value)} />
            </label>
            <label className="design-v3-field">
              <span>营销日历</span>
              <select
                value={form.calendarItemId}
                onChange={(event) => onChange("calendarItemId", event.target.value)}
                disabled={loadingOptions}
              >
                <option value="">不指定营销日历</option>
                {(options?.calendarOptions ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>产品</span>
              <select value={form.productId} onChange={(event) => onChange("productId", event.target.value)} disabled={loadingOptions}>
                {productOptions.map((item) => (
                  <option key={`${item.id || "skip-product"}-${item.label}`} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>品牌资料</span>
              <select
                value={form.brandProfileMode}
                onChange={(event) => onChange("brandProfileMode", event.target.value as DesignFormState["brandProfileMode"])}
                disabled={loadingOptions}
              >
                {(options?.brandOptions ?? []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>设计技能</span>
              <select value={form.skillSlug} onChange={(event) => onChange("skillSlug", event.target.value)} disabled={loadingOptions}>
                {module.skillLeaves.map((item) => (
                  <option key={item.id} value={item.skillSlug}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>类型</span>
              <select value={form.type} onChange={(event) => onChange("type", event.target.value)} disabled={loadingOptions}>
                {module.types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field design-v3-field--full">
              <span>上传参考图</span>
              <div className="design-v3-upload-box">
                <strong>选择文件</strong>
                <p>{referenceFileName ? `当前文件：${referenceFileName}` : "支持上传品牌参考图、版式示意图或竞品参考图，可为空。"}</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onReferenceChange(event.target.files?.[0] ?? null)}
                />
              </div>
            </label>
            <label className="design-v3-field">
              <span>{module.modelLabel}</span>
              <select
                value={form.modelSelection}
                onChange={(event) => onChange("modelSelection", event.target.value)}
                disabled={loadingOptions}
              >
                {module.models.map((item) => (
                  <option key={item.selectionKey} value={item.selectionKey}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>作品规格</span>
              <select value={form.spec} onChange={(event) => onChange("spec", event.target.value)}>
                {specOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field design-v3-field--full">
              <span>用户要求</span>
              <textarea rows={5} value={form.prompt} onChange={(event) => onChange("prompt", event.target.value)} />
            </label>
          </div>
        </div>

        <div className="design-v3-dialog__footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onSubmit}
            disabled={loadingOptions || submitting || !form.title.trim() || !form.type.trim() || !form.prompt.trim() || !form.modelSelection}
          >
            {submitting ? "创建中..." : "提交创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModuleStatusCard({
  module,
  works,
  lastCreatedWork,
  lastRefreshedAt,
  brandName,
  brandProfileSummary,
}: {
  module: DesignModuleMeta;
  works: DesignWork[];
  lastCreatedWork: DesignWork | null;
  lastRefreshedAt: string;
  brandName: string;
  brandProfileSummary: string;
}) {
  return (
    <article className="design-v3-status-card">
      <div>
        <h3>{module.label}任务状态</h3>
        <p>
          {module.description} 当前品牌为“{brandName}”，弹窗中的营销日历、产品和模型列表均来自真实接口。
          {lastCreatedWork ? ` 最近一次创建为“${lastCreatedWork.title}”。` : ""}
        </p>
      </div>
      <div className="design-v3-status-pills">
        <span className="archive-pill status-ready">累计 {works.length} 个作品</span>
        <span className="archive-pill status-ready">最近刷新 {lastRefreshedAt}</span>
        <span className="archive-pill status-pending">模型 {module.models.length} 个</span>
        <span className="archive-pill status-pending">技能 {module.skillLeaves.length} 个</span>
        <span className="archive-pill status-pending">支持品牌资料植入</span>
      </div>
      {module.skillLeaves.length ? (
        <div className="design-v3-work-tags" style={{ marginTop: 12 }}>
          {module.skillLeaves.map((item) => (
            <span key={item.id} className="archive-pill status-pending" title={item.description}>
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
      {brandProfileSummary ? (
        <p style={{ marginTop: 12, color: "rgba(83, 88, 120, 0.88)" }}>
          品牌资料摘要：{brandProfileSummary}
        </p>
      ) : null}
    </article>
  );
}

function ModuleWorks({
  module,
  works,
  selectedWorkId,
  selectedWork,
  onSelectWork,
  onCompleteWork,
  onDeleteWork,
}: {
  module: DesignModuleMeta;
  works: DesignWork[];
  selectedWorkId: string | null;
  selectedWork: DesignWork | null;
  onSelectWork: (workId: string) => void;
  onCompleteWork: (workId: string) => void;
  onDeleteWork: (workId: string) => void;
}) {
  return (
    <section className="design-v3-works">
      <div className="collection-result-head">
        <div>
          <h3>作品结果</h3>
          <p>创建动作已接真实生成接口；当前列表展示本次会话内生成的结果，并保留查看详情、标记完成和删除操作。</p>
        </div>
        <span className="archive-pill status-ready">已展示 {works.length} 个</span>
      </div>

      <div className="design-v3-work-grid">
        {works.map((work) => (
          <article
            key={`${module.key}-${getWorkId(work)}`}
            className={`design-v3-work-card ${selectedWorkId === getWorkId(work) ? "is-selected" : ""}`}
          >
            <div className="design-v3-work-thumb">
              <span>{module.label}</span>
              <strong>{work.tags[0] ?? module.label}</strong>
            </div>
            <div className="design-v3-work-body">
              <div className="design-v3-work-head">
                <strong>{work.title}</strong>
                <span>{work.updatedAt}</span>
              </div>
              <p>{work.summary}</p>
              <div className="design-v3-work-tags">
                {work.tags.map((tag) => (
                  <span key={tag} className="archive-pill status-pending">
                    {tag}
                  </span>
                ))}
                <span className="archive-pill status-ready">{work.status}</span>
              </div>
              <div className="design-v3-work-actions">
                <button type="button" className="tiny-action-button is-primary" onClick={() => onSelectWork(getWorkId(work))}>
                  查看详情
                </button>
                <button type="button" className="tiny-action-button" onClick={() => onCompleteWork(getWorkId(work))}>
                  标记完成
                </button>
                <button type="button" className="ghost-danger-button" onClick={() => onDeleteWork(getWorkId(work))}>
                  删除
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {works.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 16 }}>
          当前模块暂无作品，点击右上角“{module.createLabel}”后会直接调用后端生成链路。
        </div>
      ) : null}

      {selectedWork ? (
        <article className="workspace-panel strategy-page-card" style={{ marginTop: 16 }}>
          <div className="collection-result-head">
            <div>
              <h3>当前作品详情</h3>
              <p>这里展示当前选中作品的摘要、标签和产物入口，HTML 结果可直接在当前页预览。</p>
            </div>
            <span className="archive-pill status-ready">{selectedWork.status}</span>
          </div>

          <div className="collection-sync-grid" style={{ marginTop: 16 }}>
            <div className="collection-sync-item">
              <span>作品名称</span>
              <strong>{selectedWork.title}</strong>
            </div>
            <div className="collection-sync-item">
              <span>最近更新时间</span>
              <strong>{selectedWork.updatedAt}</strong>
            </div>
            <div className="collection-sync-item">
              <span>当前类型</span>
              <strong>{selectedWork.tags[0] ?? module.label}</strong>
            </div>
            {selectedWork.skillLabel ? (
              <div className="collection-sync-item">
                <span>设计技能</span>
                <strong>{selectedWork.skillLabel}</strong>
              </div>
            ) : null}
            <div className="collection-sync-item">
              <span>当前模块</span>
              <strong>{module.label}</strong>
            </div>
            {selectedWork.taskId ? (
              <div className="collection-sync-item">
                <span>任务 ID</span>
                <strong>{selectedWork.taskId}</strong>
              </div>
            ) : null}
            {selectedWork.taskStatus ? (
              <div className="collection-sync-item">
                <span>任务状态</span>
                <strong>{selectedWork.taskStatus}</strong>
              </div>
            ) : null}
            <div className="collection-sync-item collection-sync-item--full">
              <span>作品摘要</span>
              <strong>{selectedWork.summary}</strong>
            </div>
            <div className="collection-sync-item collection-sync-item--full">
              <span>标签</span>
              <strong>{selectedWork.tags.join(" / ")}</strong>
            </div>
            {selectedWork.assetUrl ? (
              <div className="collection-sync-item collection-sync-item--full">
                <span>产物地址</span>
                <strong>
                  <a href={selectedWork.assetUrl} target="_blank" rel="noreferrer">
                    打开生成结果
                  </a>
                </strong>
              </div>
            ) : null}
            {selectedWork.htmlContent ? (
              <div className="collection-sync-item collection-sync-item--full">
                <span>HTML 预览</span>
                <div style={{ marginTop: 12, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(110, 118, 160, 0.18)" }}>
                  <iframe
                    title={`${selectedWork.title} HTML 预览`}
                    srcDoc={selectedWork.htmlContent}
                    style={{ width: "100%", minHeight: 420, border: "none", background: "#fff" }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </article>
      ) : null}
    </section>
  );
}

export function DesignWorkspaceShell({ section }: DesignWorkspaceShellProps) {
  const brandId = getStoredCurrentBrandId();
  const [activeModule, setActiveModule] = useState<DesignModuleKey>("image");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [options, setOptions] = useState<DesignWorkspaceOptionsRecord | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [worksByModule, setWorksByModule] = useState<Record<DesignModuleKey, DesignWork[]>>(createEmptyWorksByModule);
  const [lastRefreshByModule, setLastRefreshByModule] = useState<Record<DesignModuleKey, string>>(createInitialRefreshByModule);
  const [lastCreatedByModule, setLastCreatedByModule] = useState<Record<DesignModuleKey, DesignWork | null>>({
    image: null,
    html: null,
    deck: null,
    video: null,
  });
  const [selectedWorkByModule, setSelectedWorkByModule] = useState<Record<DesignModuleKey, string | null>>(createInitialSelectedByModule);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<DesignFormState>(() => createDefaultFormState("image"));

  const activeMeta = useMemo<DesignModuleMeta>(() => {
    const staticMeta = DESIGN_MODULE_META_MAP[activeModule];
    const moduleOptions = options?.moduleOptions[activeModule];
    const allowedSkillSlugs = new Set(DESIGN_SKILL_SLUGS_BY_MODULE[activeModule]);

    return {
      ...staticMeta,
      types: moduleOptions?.types ?? [],
      models: moduleOptions?.models ?? [],
      skillLeaves: DESIGN_SKILL_LEAVES.filter((item) => allowedSkillSlugs.has(item.skillSlug || "")).map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        skillSlug: item.skillSlug,
      })),
    };
  }, [activeModule, options]);

  const activeWorks = worksByModule[activeModule] ?? [];
  const selectedWork =
    activeWorks.find((item) => getWorkId(item) === selectedWorkByModule[activeModule]) ?? activeWorks[0] ?? null;
  const referenceFileName = referenceFile?.name ?? "";

  useEffect(() => {
    setForm(createDefaultFormState(activeModule, options));
    setReferenceFile(null);
    setSubmitError("");
  }, [activeModule, options]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialOptions() {
      setLoadingOptions(true);
      setLoadError("");

      try {
        const nextOptions = await getDesignWorkspaceOptions(brandId);
        if (cancelled) {
          return;
        }

        const refreshedAt = formatTimestamp(new Date());
        setOptions(nextOptions);
        setLastRefreshByModule((current) => ({ ...current, image: refreshedAt }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadError(normalizeErrorMessage(error));
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadInitialOptions();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const handleOpenDialog = () => {
    if (loadingOptions || !options) {
      return;
    }

    setForm(createDefaultFormState(activeModule, options));
    setReferenceFile(null);
    setSubmitError("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleModuleChange = (moduleKey: DesignModuleKey) => {
    setActiveModule(moduleKey);
    setDialogOpen(false);
    setReferenceFile(null);
    setSubmitting(false);
    setSubmitError("");
  };

  const handleFormChange = (field: keyof DesignFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRefresh = async () => {
    setLoadingOptions(true);
    setLoadError("");

    try {
      const nextOptions = await getDesignWorkspaceOptions(brandId);
      const refreshedAt = formatTimestamp(new Date());
      setOptions(nextOptions);
      setLastRefreshByModule((current) => ({ ...current, [activeModule]: refreshedAt }));
    } catch (error) {
      setLoadError(normalizeErrorMessage(error));
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSubmit = async () => {
    const selectedSkill = activeMeta.skillLeaves.find((item) => item.skillSlug === form.skillSlug) ?? activeMeta.skillLeaves[0];
    const selectedProductLabel =
      (options?.productOptions ?? []).find((item) => item.id === form.productId)?.label
      || PRODUCT_SKIP_OPTION.label;
    const pendingWork = buildPendingDesignWork({
      module: activeModule,
      title: form.title.trim(),
      designType: form.type,
      skillLabel: selectedSkill?.label || activeMeta.label,
      productLabel: selectedProductLabel,
    });

    setWorksByModule((current) => ({
      ...current,
      [activeModule]: [pendingWork, ...(current[activeModule] ?? [])],
    }));
    setSelectedWorkByModule((current) => ({ ...current, [activeModule]: getWorkId(pendingWork) }));
    setLastRefreshByModule((current) => ({ ...current, [activeModule]: formatTimestamp(new Date()) }));
    setSubmitting(true);
    setSubmitError("");

    try {
      const createdWork = await generateDesignWork(
        {
          module: activeModule,
          skillSlug: form.skillSlug || selectedSkill?.skillSlug,
          title: form.title.trim(),
          calendarItemId: form.calendarItemId || undefined,
          productId: form.productId || undefined,
          injectBrandProfile: form.brandProfileMode === "inject",
          designType: form.type,
          referenceImageFile: referenceFile,
          modelSelection: form.modelSelection,
          spec: form.spec.trim(),
          additionalInstruction: form.prompt.trim(),
        },
        brandId,
      );

      setWorksByModule((current) => ({
        ...current,
        [activeModule]: (current[activeModule] ?? []).map((item) => (
          getWorkId(item) === getWorkId(pendingWork) ? createdWork : item
        )),
      }));
      setLastCreatedByModule((current) => ({ ...current, [activeModule]: createdWork }));
      setLastRefreshByModule((current) => ({ ...current, [activeModule]: createdWork.updatedAt }));
      setSelectedWorkByModule((current) => ({ ...current, [activeModule]: getWorkId(createdWork) }));
      setDialogOpen(false);
      setReferenceFile(null);
      setForm(createDefaultFormState(activeModule, options));
    } catch (error) {
      const message = normalizeErrorMessage(error);
      setSubmitError(message);
      setWorksByModule((current) => ({
        ...current,
        [activeModule]: (current[activeModule] ?? []).map((item) => (
          getWorkId(item) === getWorkId(pendingWork)
            ? {
                ...item,
                taskStatus: "FAILED",
                status: "执行失败",
                summary: message,
                tags: [selectedSkill?.label || activeMeta.label, form.type, selectedProductLabel, "失败"],
                updatedAt: new Date().toISOString(),
              }
            : item
        )),
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectWork = (workId: string) => {
    setSelectedWorkByModule((current) => ({ ...current, [activeModule]: workId }));
  };

  const handleCompleteWork = (workId: string) => {
    const completedAt = formatTimestamp(new Date());

    setWorksByModule((current) => ({
      ...current,
      [activeModule]: (current[activeModule] ?? []).map((work) =>
        getWorkId(work) === workId
          ? {
              ...work,
              status: "已完成",
              updatedAt: completedAt,
            }
          : work,
      ),
    }));
    setLastRefreshByModule((current) => ({ ...current, [activeModule]: completedAt }));
  };

  const handleDeleteWork = (workId: string) => {
    const nextWorks = activeWorks.filter((work) => getWorkId(work) !== workId);

    setWorksByModule((current) => ({
      ...current,
      [activeModule]: nextWorks,
    }));
    setSelectedWorkByModule((current) => ({
      ...current,
      [activeModule]: nextWorks[0] ? getWorkId(nextWorks[0]) : null,
    }));
    setLastRefreshByModule((current) => ({ ...current, [activeModule]: formatTimestamp(new Date()) }));
  };

  return (
    <>
      <div className="design-v3-shell">
        <section className="dashboard-hero xiaohongshu-hero">
          <div>
            <h1>{section.label}</h1>
            <p>{section.description}</p>
            <div className="workspace-toolbar top-toolbar">
              <div className="workspace-status">
                <span className="archive-pill status-ready">真实数据驱动</span>
                <span className="archive-pill status-pending">第三方模型配置</span>
                <span className="status-text">
                  当前设计模块会读取品牌档案、营销日历和后台启用的运行时模型；创建时直接调用后端生成接口。
                </span>
              </div>
              <div className="personal-actions">
                <button type="button" className="secondary-button" onClick={handleRefresh} disabled={loadingOptions}>
                  {loadingOptions ? "刷新中..." : "刷新数据"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <article className="workspace-panel strategy-page-card">
          <div className="design-v3-tab-row">
            {DESIGN_MODULES.map((moduleKey) => {
              const tabMeta = DESIGN_MODULE_META_MAP[moduleKey];
              return (
                <button
                  key={moduleKey}
                  type="button"
                  className={`design-v3-tab ${moduleKey === activeModule ? "is-active" : ""}`}
                  onClick={() => handleModuleChange(moduleKey)}
                >
                  {tabMeta.label}
                </button>
              );
            })}
          </div>

          <div className="design-v3-module-head">
            <div>
              <strong>{activeMeta.label}</strong>
              <p>{activeMeta.description}</p>
            </div>
            <div className="design-v3-module-actions">
              <button type="button" className="secondary-button" onClick={handleRefresh} disabled={loadingOptions}>
                {loadingOptions ? "刷新中..." : "刷新列表"}
              </button>
              <button type="button" className="primary-button" onClick={handleOpenDialog} disabled={loadingOptions || !options}>
                {activeMeta.createLabel}
              </button>
            </div>
          </div>

          {loadError ? (
            <div className="empty-state" style={{ marginBottom: 16 }}>
              {loadError}
            </div>
          ) : null}

          <ModuleStatusCard
            module={activeMeta}
            works={activeWorks}
            lastCreatedWork={lastCreatedByModule[activeModule]}
            lastRefreshedAt={lastRefreshByModule[activeModule]}
            brandName={options?.brandName ?? "当前品牌"}
            brandProfileSummary={options?.brandProfileSummary ?? ""}
          />
          <ModuleWorks
            module={activeMeta}
            works={activeWorks}
            selectedWorkId={selectedWorkByModule[activeModule]}
            selectedWork={selectedWork}
            onSelectWork={handleSelectWork}
            onCompleteWork={handleCompleteWork}
            onDeleteWork={handleDeleteWork}
          />
        </article>
      </div>

      <DesignCreateDialog
        module={activeMeta}
        open={dialogOpen}
        loadingOptions={loadingOptions}
        options={options}
        form={form}
        referenceFileName={referenceFileName}
        submitting={submitting}
        submitError={submitError}
        onClose={handleCloseDialog}
        onChange={handleFormChange}
        onReferenceChange={setReferenceFile}
        onSubmit={handleSubmit}
      />
    </>
  );
}
