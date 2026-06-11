"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBrandBusinessKnowledgeBase,
  createBrandBusinessKnowledgeBaseFiles,
  deleteBrandBusinessKnowledgeBase,
  deleteBrandBusinessKnowledgeBaseFile,
  getBrandBusinessKnowledgeBaseFileDetail,
  listBrandBusinessKnowledgeBindingTargets,
  listBrandBusinessKnowledgeInvocationRuns,
  listBrandBusinessKnowledgeBaseFiles,
  listBrandBusinessKnowledgeBases,
  type BrandBusinessKnowledgeBindingTargetRecord,
  type BrandBusinessKnowledgeBaseFileDetailRecord,
  type BrandBusinessKnowledgeBaseFileRecord,
  type BrandBusinessKnowledgeInvocationRecord,
  type BrandBusinessKnowledgeBaseRecord,
  updateBrandBusinessKnowledgeBase,
  uploadBrandAssetFile,
} from "../../../services/brand-growth";

type Props = {
  brandId: string;
};

type UploadDraft = {
  id: string;
  priority: string;
  file?: File | null;
  progress: "pending" | "uploading" | "processing" | "done" | "failed";
  message?: string;
};

type SettingsDraft = {
  name: string;
  description: string;
  bindingType: "MODULE" | "SKILL_PACKAGE" | "SKILL";
  targetId: string;
  targetKey: string;
  targetName: string;
  defaultTopK: string;
  recallMode: "HYBRID" | "VECTOR" | "FULL_TEXT";
  rerankEnabled: boolean;
  chunkSize: string;
  chunkOverlap: string;
  retrievalThreshold: string;
  retrievalMode: "HYBRID" | "VECTOR" | "FULL_TEXT";
  isRequired: boolean;
  enabled: boolean;
};

const BINDING_TYPE_OPTIONS: Array<{ value: SettingsDraft["bindingType"]; label: string; description: string }> = [
  { value: "MODULE", label: "模块", description: "给整个工作台或模块统一使用。" },
  { value: "SKILL_PACKAGE", label: "能力包", description: "给一组连续技能步骤统一使用。" },
  { value: "SKILL", label: "技能", description: "只给某个具体技能使用。" },
];

function createUploadDraft(file?: File): UploadDraft {
  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    priority: "",
    file: file ?? null,
    progress: "pending",
  };
}

function formatDateTime(value?: string) {
  if (!value) {
    return "未生成";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("zh-CN", { hour12: false });
}

function getSyncStatusLabel(status: BrandBusinessKnowledgeBaseRecord["syncStatus"]) {
  switch (status) {
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    case "SYNCING":
      return "同步中";
    default:
      return "待同步";
  }
}

function getFileStatusLabel(status: BrandBusinessKnowledgeBaseFileRecord["status"]) {
  switch (status) {
    case "INDEXED":
      return "已切片";
    case "FAILED":
      return "失败";
    default:
      return "处理中";
  }
}

function getInvocationStatusLabel(status: BrandBusinessKnowledgeInvocationRecord["status"]) {
  switch (status) {
    case "HIT":
      return "已命中";
    case "NO_HIT":
      return "未命中";
    case "FAILED":
      return "失败";
    default:
      return "未绑定";
  }
}

function getSourceModuleLabel(sourceModule: BrandBusinessKnowledgeInvocationRecord["sourceModule"]) {
  return sourceModule === "REPORTS" ? "作品链路" : "工作台";
}

function getBindingTargetValue(target: Pick<BrandBusinessKnowledgeBindingTargetRecord, "bindingType" | "targetId" | "targetKey">) {
  return `${target.bindingType}:${target.targetId}:${target.targetKey || ""}`;
}

function findBindingTarget(
  bindingTargets: BrandBusinessKnowledgeBindingTargetRecord[],
  bindingType: SettingsDraft["bindingType"],
  targetId?: string,
  targetKey?: string,
  targetName?: string,
) {
  return bindingTargets.find(
    (item) =>
      item.bindingType === bindingType
      && (
        item.targetId === targetId
        || (targetKey && item.targetKey === targetKey)
        || (targetName && item.targetName === targetName)
      ),
  );
}

function getBindingTargetOptions(
  bindingTargets: BrandBusinessKnowledgeBindingTargetRecord[],
  settingsDraft: SettingsDraft,
) {
  const options = bindingTargets.filter((item) => item.bindingType === settingsDraft.bindingType);
  const hasCurrent = options.some(
    (item) =>
      item.targetId === settingsDraft.targetId
      || (settingsDraft.targetKey && item.targetKey === settingsDraft.targetKey)
      || (settingsDraft.targetName && item.targetName === settingsDraft.targetName),
  );
  if (hasCurrent || !settingsDraft.targetId) {
    return options;
  }
  return [
    {
      bindingType: settingsDraft.bindingType,
      targetId: settingsDraft.targetId,
      targetKey: settingsDraft.targetKey,
      targetName: settingsDraft.targetName || settingsDraft.targetId,
      description: "当前已保存的接入对象，未命中预设列表。",
    },
    ...options,
  ];
}

function buildSettingsDraft(item: BrandBusinessKnowledgeBaseRecord): SettingsDraft {
  return {
    name: item.name,
    description: item.description || "",
    bindingType: item.bindingType,
    targetId: item.targetId,
    targetKey: item.targetKey ?? "",
    targetName: item.targetName ?? "",
    defaultTopK: String(item.defaultTopK ?? 8),
    recallMode: item.recallMode,
    rerankEnabled: item.rerankEnabled,
    chunkSize: item.chunkSize === undefined ? "800" : String(item.chunkSize),
    chunkOverlap: item.chunkOverlap === undefined ? "120" : String(item.chunkOverlap),
    retrievalThreshold: item.retrievalThreshold === undefined ? "" : String(item.retrievalThreshold),
    retrievalMode: item.retrievalMode,
    isRequired: item.isRequired,
    enabled: item.enabled,
  };
}

export function BusinessKnowledgeWorkspace({ brandId }: Props) {
  const [knowledgeBases, setKnowledgeBases] = useState<BrandBusinessKnowledgeBaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<BrandBusinessKnowledgeBaseRecord | null>(null);
  const [files, setFiles] = useState<BrandBusinessKnowledgeBaseFileRecord[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [bindingTargets, setBindingTargets] = useState<BrandBusinessKnowledgeBindingTargetRecord[]>([]);
  const [bindingTargetsLoading, setBindingTargetsLoading] = useState(false);
  const [isInvocationModalOpen, setIsInvocationModalOpen] = useState(false);
  const [invocationRuns, setInvocationRuns] = useState<BrandBusinessKnowledgeInvocationRecord[]>([]);
  const [invocationLoading, setInvocationLoading] = useState(false);

  const [fileDetail, setFileDetail] = useState<BrandBusinessKnowledgeBaseFileDetailRecord | null>(null);
  const [fileDetailLoading, setFileDetailLoading] = useState(false);

  async function loadKnowledgeBases() {
    setLoading(true);
    setError("");
    try {
      const data = await listBrandBusinessKnowledgeBases(brandId);
      setKnowledgeBases(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "知识库加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles(knowledgeBaseId: string) {
    setFilesLoading(true);
    try {
      const data = await listBrandBusinessKnowledgeBaseFiles(brandId, knowledgeBaseId);
      setFiles(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "资料列表加载失败");
    } finally {
      setFilesLoading(false);
    }
  }

  async function loadInvocationRuns() {
    setInvocationLoading(true);
    try {
      const data = await listBrandBusinessKnowledgeInvocationRuns(brandId);
      setInvocationRuns(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "调用记录加载失败");
    } finally {
      setInvocationLoading(false);
    }
  }

  async function loadBindingTargets() {
    setBindingTargetsLoading(true);
    try {
      const data = await listBrandBusinessKnowledgeBindingTargets(brandId);
      setBindingTargets(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "接入对象加载失败");
    } finally {
      setBindingTargetsLoading(false);
    }
  }

  useEffect(() => {
    void loadKnowledgeBases();
    void loadBindingTargets();
  }, [brandId]);

  useEffect(() => {
    if (!selectedKnowledgeBase) {
      setFiles([]);
      return;
    }
    void loadFiles(selectedKnowledgeBase.id);
  }, [brandId, selectedKnowledgeBase?.id]);

  const selectedKnowledgeBaseSummary = useMemo(
    () => knowledgeBases.find((item) => item.id === selectedKnowledgeBase?.id) || selectedKnowledgeBase,
    [knowledgeBases, selectedKnowledgeBase],
  );

  useEffect(() => {
    if (!selectedKnowledgeBaseSummary || isUploadModalOpen || !files.some((item) => item.status === "PENDING")) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadFiles(selectedKnowledgeBaseSummary.id);
      void loadKnowledgeBases();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [files, isUploadModalOpen, selectedKnowledgeBaseSummary]);

  useEffect(() => {
    if (!isInvocationModalOpen) {
      return;
    }
    void loadInvocationRuns();
  }, [brandId, isInvocationModalOpen]);

  async function handleCreateKnowledgeBase() {
    if (!createDraft.name.trim()) {
      setError("请先填写知识库名称");
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const nextKnowledgeBases = await createBrandBusinessKnowledgeBase(brandId, {
        name: createDraft.name.trim(),
        description: createDraft.description.trim(),
      });
      setKnowledgeBases(nextKnowledgeBases);
      setCreateDraft({ name: "", description: "" });
      setIsCreateModalOpen(false);
      setNotice("知识库已创建");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "知识库创建失败");
    } finally {
      setIsCreating(false);
    }
  }

  function handleAppendFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }
    const nextDrafts = Array.from(fileList).map((file) => createUploadDraft(file));
    setUploadDrafts((current) => [...current, ...nextDrafts]);
  }

  async function handleSubmitFiles() {
    if (!selectedKnowledgeBaseSummary) {
      return;
    }
    const validDrafts = uploadDrafts.filter((item) => item.file);
    if (!validDrafts.length) {
      setError("请先添加资料文件");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const payloadItems: Array<{
        title: string;
        sourceName?: string;
        fileUrl: string;
        priority?: number;
      }> = [];

      for (const draft of validDrafts) {
        setUploadDrafts((current) =>
          current.map((item) => (item.id === draft.id ? { ...item, progress: "uploading", message: "资料上传中" } : item)),
        );
        const uploaded = await uploadBrandAssetFile(brandId, draft.file!);
        payloadItems.push({
          title: draft.file!.name.replace(/\.[^.]+$/, ""),
          sourceName: "本地上传",
          fileUrl: uploaded.fileUrl,
          priority: draft.priority.trim() ? Number(draft.priority) : undefined,
        });
        setUploadDrafts((current) =>
          current.map((item) => (item.id === draft.id ? { ...item, progress: "processing", message: "正在切片处理中" } : item)),
        );
      }

      const nextFiles = await createBrandBusinessKnowledgeBaseFiles(brandId, selectedKnowledgeBaseSummary.id, {
        items: payloadItems,
      });
      setFiles(nextFiles);
      setUploadDrafts((current) => current.map((item) => ({ ...item, progress: "done", message: "资料已完成切片" })));
      const nextKnowledgeBases = await listBrandBusinessKnowledgeBases(brandId);
      setKnowledgeBases(nextKnowledgeBases);
      setIsUploadModalOpen(false);
      setUploadDrafts([]);
      setNotice(nextFiles.some((item) => item.status === "PENDING") ? "资料已添加，正在自动切片" : "资料已添加并完成切片");
    } catch (requestError) {
      setUploadDrafts((current) => current.map((item) => ({ ...item, progress: "failed", message: "资料处理失败" })));
      setError(requestError instanceof Error ? requestError.message : "资料添加失败");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveUploadDraft(draftId: string) {
    setUploadDrafts((current) => current.filter((item) => item.id !== draftId));
  }

  async function handleDeleteKnowledgeBase(knowledgeBase: BrandBusinessKnowledgeBaseRecord) {
    if (!window.confirm(`确认删除知识库“${knowledgeBase.name}”吗？`)) {
      return;
    }
    setError("");
    try {
      const nextKnowledgeBases = await deleteBrandBusinessKnowledgeBase(brandId, knowledgeBase.id);
      setKnowledgeBases(nextKnowledgeBases);
      if (selectedKnowledgeBase?.id === knowledgeBase.id) {
        setSelectedKnowledgeBase(null);
        setFiles([]);
      }
      setNotice("知识库已删除");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "知识库删除失败");
    }
  }

  async function handleDeleteFile(file: BrandBusinessKnowledgeBaseFileRecord) {
    if (!selectedKnowledgeBaseSummary || !window.confirm(`确认删除资料“${file.title}”吗？`)) {
      return;
    }
    setError("");
    try {
      const nextFiles = await deleteBrandBusinessKnowledgeBaseFile(brandId, selectedKnowledgeBaseSummary.id, file.id);
      setFiles(nextFiles);
      const nextKnowledgeBases = await listBrandBusinessKnowledgeBases(brandId);
      setKnowledgeBases(nextKnowledgeBases);
      setNotice("资料已删除");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "资料删除失败");
    }
  }

  async function handleOpenFileDetail(file: BrandBusinessKnowledgeBaseFileRecord) {
    if (!selectedKnowledgeBaseSummary) {
      return;
    }
    setFileDetailLoading(true);
    setError("");
    try {
      const detail = await getBrandBusinessKnowledgeBaseFileDetail(brandId, selectedKnowledgeBaseSummary.id, file.id);
      setFileDetail(detail);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "资料详情加载失败");
    } finally {
      setFileDetailLoading(false);
    }
  }

  async function handleSaveSettings() {
    if (!selectedKnowledgeBaseSummary || !settingsDraft) {
      return;
    }
    if (!settingsDraft.name.trim()) {
      setError("请先填写知识库名称");
      return;
    }
    setIsSavingSettings(true);
    setError("");
    try {
      const nextKnowledgeBases = await updateBrandBusinessKnowledgeBase(brandId, selectedKnowledgeBaseSummary.id, {
        name: settingsDraft.name.trim(),
        description: settingsDraft.description.trim(),
        bindingType: settingsDraft.bindingType,
        targetId: settingsDraft.targetId,
        targetKey: settingsDraft.targetKey || undefined,
        targetName: settingsDraft.targetName || undefined,
        defaultTopK: Math.max(1, Number(settingsDraft.defaultTopK) || 8),
        recallMode: settingsDraft.recallMode,
        rerankEnabled: settingsDraft.rerankEnabled,
        chunkSize: Math.max(200, Number(settingsDraft.chunkSize) || 800),
        chunkOverlap: Math.max(0, Number(settingsDraft.chunkOverlap) || 120),
        retrievalThreshold: settingsDraft.retrievalThreshold.trim()
          ? Number(settingsDraft.retrievalThreshold)
          : undefined,
        retrievalMode: settingsDraft.retrievalMode,
        isRequired: settingsDraft.isRequired,
        enabled: settingsDraft.enabled,
      });
      setKnowledgeBases(nextKnowledgeBases);
      const refreshed = nextKnowledgeBases.find((item) => item.id === selectedKnowledgeBaseSummary.id) || null;
      setSelectedKnowledgeBase(refreshed);
      setIsSettingsModalOpen(false);
      setNotice("知识库设置已保存");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "知识库设置保存失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>企业知识库</strong>
            <p>先创建知识库，再进入知识库添加资料和管理设置。</p>
          </div>
          <div className="business-kb-toolbar-actions">
            <button type="button" className="secondary-button" onClick={() => setIsInvocationModalOpen(true)}>
              调用记录
            </button>
            <button type="button" className="primary-button" onClick={() => setIsCreateModalOpen(true)}>
              新增知识库
            </button>
          </div>
        </div>

        {notice ? <p className="workspace-feedback is-success">{notice}</p> : null}
        {error ? <p className="workspace-feedback is-error">{error}</p> : null}

        {loading ? (
          <div className="empty-state">
            <strong>知识库加载中</strong>
            <p>正在读取企业知识库列表。</p>
          </div>
        ) : knowledgeBases.length ? (
          <div className="knowledge-content-card-grid">
            {knowledgeBases.map((item) => (
              <article key={item.id} className="knowledge-content-card business-kb-card">
                <button type="button" className="business-kb-card__open" onClick={() => setSelectedKnowledgeBase(item)}>
                  <div className="knowledge-content-card__head">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.description || "暂未填写简介"}</p>
                    </div>
                    <span className={`archive-pill ${item.syncStatus === "FAILED" ? "status-pending" : "status-ready"}`}>
                      {getSyncStatusLabel(item.syncStatus)}
                    </span>
                  </div>
                  <div className="business-kb-card__meta">
                    <span>资料 {item.documentCount} 份</span>
                    <span>切片 {item.chunkCount} 个</span>
                    <span>更新于 {formatDateTime(item.updatedAt)}</span>
                  </div>
                  <p className="business-kb-card__hint">点击查看资料列表、添加资料和知识库设置。</p>
                </button>
                <div className="knowledge-content-card__actions">
                  <button type="button" className="secondary-button" onClick={() => handleDeleteKnowledgeBase(item)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>还没有企业知识库</strong>
            <p>点击右上角“新增知识库”，先填写名称和简介即可创建。</p>
          </div>
        )}
      </article>

      {isCreateModalOpen ? (
        <div className="knowledge-asset-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsCreateModalOpen(false)}>
          <div className="knowledge-asset-modal business-kb-modal" onClick={(event) => event.stopPropagation()}>
            <div className="knowledge-asset-modal__head">
              <div>
                <strong>新增知识库</strong>
                <p>这里只需要填写知识库名称和简介。</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>知识库名称</span>
                <input value={createDraft.name} onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>知识库简介</span>
                <textarea value={createDraft.description} onChange={(event) => setCreateDraft((current) => ({ ...current, description: event.target.value }))} />
              </label>
            </div>
            <div className="knowledge-asset-modal__footer">
              <div className="knowledge-asset-modal__footer-actions">
                <button type="button" className="secondary-button" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
                  取消
                </button>
                <button type="button" className="primary-button" onClick={() => void handleCreateKnowledgeBase()} disabled={isCreating}>
                  {isCreating ? "创建中..." : "创建知识库"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedKnowledgeBaseSummary ? (
        <div className="knowledge-asset-modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedKnowledgeBase(null)}>
          <div className="knowledge-asset-modal business-kb-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="knowledge-asset-modal__head business-kb-detail-modal__head">
              <div>
                <strong>{selectedKnowledgeBaseSummary.name}</strong>
                <p>{selectedKnowledgeBaseSummary.description || "暂未填写简介"}</p>
              </div>
              <div className="strategy-inline-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setUploadDrafts([]);
                    setIsUploadModalOpen(true);
                  }}
                >
                  添加资料
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSettingsDraft(buildSettingsDraft(selectedKnowledgeBaseSummary));
                    setIsSettingsModalOpen(true);
                  }}
                >
                  知识库设置
                </button>
              </div>
            </div>
            {files.some((item) => item.status === "PENDING") ? (
              <p className="workspace-feedback">
                当前有资料正在自动切片，列表会持续刷新处理进度。
              </p>
            ) : null}

            {filesLoading ? (
              <div className="empty-state">
                <strong>资料加载中</strong>
                <p>正在读取知识库资料。</p>
              </div>
            ) : files.length ? (
              <div className="business-kb-file-list">
                {files.map((item) => (
                  <article key={item.id} className="business-kb-file-row">
                    <div className="business-kb-file-row__main">
                      <strong>{item.title}</strong>
                      <span>{item.description || "系统会按资料内容自动完成切片处理。"}</span>
                      <span>
                        切片 {item.chunkCount} 个，状态 {getFileStatusLabel(item.status)}
                        {item.priority ? `，优先级 ${item.priority}` : ""}
                      </span>
                    </div>
                    <div className="table-action-row">
                      <button type="button" className="secondary-button" onClick={() => void handleOpenFileDetail(item)}>
                        编辑
                      </button>
                      <button type="button" className="secondary-button" onClick={() => void handleDeleteFile(item)}>
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>还没有资料</strong>
                <p>点击右上角“添加资料”，上传后系统会自动完成切片处理。</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isUploadModalOpen && selectedKnowledgeBaseSummary ? (
        <div className="knowledge-asset-modal-overlay" role="dialog" aria-modal="true" onClick={() => !isUploading && setIsUploadModalOpen(false)}>
          <div className="knowledge-asset-modal business-kb-modal" onClick={(event) => event.stopPropagation()}>
            <div className="knowledge-asset-modal__head">
              <div>
                <strong>添加资料</strong>
                <p>这里只做资料添加，可一次上传多份文件；添加后系统会自动切片处理。</p>
              </div>
            </div>
            <div className="business-kb-upload-toolbar">
              <label className="secondary-button">
                选择文件
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(event) => {
                    handleAppendFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="knowledge-asset-modal__drafts">
              {uploadDrafts.length ? (
                uploadDrafts.map((draft) => (
                  <article key={draft.id} className="knowledge-draft-card">
                    <div className="business-kb-upload-row">
                      <div className="business-kb-upload-row__main">
                        <strong>{draft.file?.name || "尚未选择文件"}</strong>
                        <span>资料名称会自动使用文件名，系统会自动完成上传和切片。</span>
                      </div>
                      <div className="table-action-row">
                        <label className="field business-kb-upload-row__priority">
                          <span>优先级</span>
                          <input
                            type="number"
                            min={1}
                            value={draft.priority}
                            placeholder="可选"
                            onChange={(event) =>
                              setUploadDrafts((current) =>
                                current.map((item) => (item.id === draft.id ? { ...item, priority: event.target.value } : item)),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleRemoveUploadDraft(draft.id)}
                          disabled={isUploading}
                        >
                          移除
                        </button>
                      </div>
                    </div>
                    <div className="business-kb-upload-status">
                      <strong>{draft.progress === "processing" ? "切片处理中" : draft.progress === "uploading" ? "文件上传中" : "等待添加"}</strong>
                      <span>{draft.message || "选择完成后点击开始添加"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <strong>先选择要添加的资料</strong>
                  <p>支持一次选择多份文件，系统会逐份上传并自动切片。</p>
                </div>
              )}
            </div>
            <div className="knowledge-asset-modal__footer">
              <div className="knowledge-asset-modal__footer-actions">
                <button type="button" className="secondary-button" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>
                  取消
                </button>
                <button type="button" className="primary-button" onClick={() => void handleSubmitFiles()} disabled={isUploading}>
                  {isUploading ? "处理中..." : "开始添加"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isSettingsModalOpen && settingsDraft ? (
        <div className="knowledge-asset-modal-overlay" role="dialog" aria-modal="true" onClick={() => !isSavingSettings && setIsSettingsModalOpen(false)}>
          <div className="knowledge-asset-modal business-kb-modal" onClick={(event) => event.stopPropagation()}>
            <div className="knowledge-asset-modal__head">
              <div>
                <strong>知识库设置</strong>
                <p>这里只保留用户真正需要理解和填写的设置。</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>知识库名称</span>
                <input value={settingsDraft.name} onChange={(event) => setSettingsDraft((current) => current ? { ...current, name: event.target.value } : current)} />
              </label>
              <label className="field">
                <span>默认召回条数</span>
                <input
                  type="number"
                  min={1}
                  value={settingsDraft.defaultTopK}
                  onChange={(event) => setSettingsDraft((current) => current ? { ...current, defaultTopK: event.target.value } : current)}
                />
              </label>
              <label className="field field-full">
                <span>知识库简介</span>
                <textarea value={settingsDraft.description} onChange={(event) => setSettingsDraft((current) => current ? { ...current, description: event.target.value } : current)} />
              </label>
              <label className="field">
                <span>接入类型</span>
                <select
                  value={settingsDraft.bindingType}
                  disabled={bindingTargetsLoading}
                  onChange={(event) =>
                    setSettingsDraft((current) => {
                      if (!current) {
                        return current;
                      }
                      const nextBindingType = event.target.value as SettingsDraft["bindingType"];
                      const nextTarget = bindingTargets.find((item) => item.bindingType === nextBindingType);
                      return {
                        ...current,
                        bindingType: nextBindingType,
                        targetId: nextTarget?.targetId || "",
                        targetKey: nextTarget?.targetKey || "",
                        targetName: nextTarget?.targetName || "",
                      };
                    })
                  }
                >
                  {BINDING_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>接入对象</span>
                <select
                  value={getBindingTargetValue({
                    bindingType: settingsDraft.bindingType,
                    targetId: settingsDraft.targetId,
                    targetKey: settingsDraft.targetKey,
                  })}
                  disabled={bindingTargetsLoading}
                  onChange={(event) =>
                    setSettingsDraft((current) => {
                      if (!current) {
                        return current;
                      }
                      const nextTarget = getBindingTargetOptions(bindingTargets, current).find(
                        (item) => getBindingTargetValue(item) === event.target.value,
                      );
                      if (!nextTarget) {
                        return current;
                      }
                      return {
                        ...current,
                        bindingType: nextTarget.bindingType,
                        targetId: nextTarget.targetId,
                        targetKey: nextTarget.targetKey,
                        targetName: nextTarget.targetName,
                      };
                    })
                  }
                >
                  {getBindingTargetOptions(bindingTargets, settingsDraft).map((item) => (
                    <option key={getBindingTargetValue(item)} value={getBindingTargetValue(item)}>
                      {item.targetName}
                    </option>
                  ))}
                </select>
              </label>
              <p className="field-help field-full">
                {(bindingTargetsLoading ? undefined : findBindingTarget(
                  bindingTargets,
                  settingsDraft.bindingType,
                  settingsDraft.targetId,
                  settingsDraft.targetKey,
                  settingsDraft.targetName,
                ))?.description || (bindingTargetsLoading ? "正在读取系统里真实注册的模块、能力包和技能。" : "为知识库选择一个实际使用它的工作台、能力包或技能。")}
              </p>
              <label className="field">
                <span>切片长度</span>
                <input
                  type="number"
                  min={200}
                  value={settingsDraft.chunkSize}
                  onChange={(event) => setSettingsDraft((current) => current ? { ...current, chunkSize: event.target.value } : current)}
                />
              </label>
              <label className="field">
                <span>切片重叠</span>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.chunkOverlap}
                  onChange={(event) => setSettingsDraft((current) => current ? { ...current, chunkOverlap: event.target.value } : current)}
                />
              </label>
              <label className="field">
                <span>召回方式</span>
                <select value={settingsDraft.recallMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, recallMode: event.target.value as SettingsDraft["recallMode"] } : current)}>
                  <option value="HYBRID">混合检索</option>
                  <option value="VECTOR">向量检索</option>
                  <option value="FULL_TEXT">全文检索</option>
                </select>
              </label>
              <label className="field">
                <span>资料检索方式</span>
                <select value={settingsDraft.retrievalMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, retrievalMode: event.target.value as SettingsDraft["retrievalMode"] } : current)}>
                  <option value="HYBRID">混合检索</option>
                  <option value="VECTOR">向量检索</option>
                  <option value="FULL_TEXT">全文检索</option>
                </select>
              </label>
              <label className="field">
                <span>检索阈值</span>
                <input value={settingsDraft.retrievalThreshold} placeholder="可选" onChange={(event) => setSettingsDraft((current) => current ? { ...current, retrievalThreshold: event.target.value } : current)} />
              </label>
              <label className="field field-inline-toggle">
                <span>开启重排</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.rerankEnabled}
                  onChange={(event) => setSettingsDraft((current) => current ? { ...current, rerankEnabled: event.target.checked } : current)}
                />
              </label>
              <label className="field field-inline-toggle">
                <span>结果必带</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.isRequired}
                  onChange={(event) => setSettingsDraft((current) => current ? { ...current, isRequired: event.target.checked } : current)}
                />
              </label>
              <label className="field field-inline-toggle">
                <span>启用知识库</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.enabled}
                  onChange={(event) => setSettingsDraft((current) => current ? { ...current, enabled: event.target.checked } : current)}
                />
              </label>
            </div>
            <div className="knowledge-asset-modal__footer">
              <div className="knowledge-asset-modal__footer-actions">
                <button type="button" className="secondary-button" onClick={() => setIsSettingsModalOpen(false)} disabled={isSavingSettings}>
                  取消
                </button>
                <button type="button" className="primary-button" onClick={() => void handleSaveSettings()} disabled={isSavingSettings}>
                  {isSavingSettings ? "保存中..." : "保存设置"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isInvocationModalOpen ? (
        <div className="knowledge-asset-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsInvocationModalOpen(false)}>
          <div className="knowledge-asset-modal business-kb-modal" onClick={(event) => event.stopPropagation()}>
            <div className="knowledge-asset-modal__head">
              <div>
                <strong>调用记录</strong>
                <p>确认哪些工作台、能力包和技能实际调用了企业知识库。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => void loadInvocationRuns()} disabled={invocationLoading}>
                {invocationLoading ? "刷新中..." : "刷新记录"}
              </button>
            </div>
            {invocationLoading ? (
              <div className="empty-state">
                <strong>调用记录加载中</strong>
                <p>正在读取最近的知识库调用记录。</p>
              </div>
            ) : invocationRuns.length ? (
              <div className="business-kb-run-list">
                {invocationRuns.map((item) => (
                  <article key={item.id} className="business-kb-run-item">
                    <strong>{item.sceneLabel}</strong>
                    <span>
                      {formatDateTime(item.createdAt)} · {getSourceModuleLabel(item.sourceModule)} · {getInvocationStatusLabel(item.status)}
                    </span>
                    <span>
                      命中知识库 {item.matchedKnowledgeBaseNames.join(" / ") || "无"} · 命中片段 {item.hitCount} 个
                    </span>
                    <p>{item.summary || item.retrievalQuery || "暂无调用摘要"}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>还没有调用记录</strong>
                <p>当工作台、能力包或技能使用企业知识库后，会在这里看到最近调用记录。</p>
              </div>
            )}
            <div className="knowledge-asset-modal__footer">
              <div className="knowledge-asset-modal__footer-actions">
                <button type="button" className="primary-button" onClick={() => setIsInvocationModalOpen(false)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(fileDetail || fileDetailLoading) && selectedKnowledgeBaseSummary ? (
        <div className="knowledge-asset-modal-overlay" role="dialog" aria-modal="true" onClick={() => !fileDetailLoading && setFileDetail(null)}>
          <div className="knowledge-asset-modal business-kb-modal" onClick={(event) => event.stopPropagation()}>
            <div className="knowledge-asset-modal__head">
              <div>
                <strong>{fileDetail?.title ? `编辑资料 · ${fileDetail.title}` : "编辑资料"}</strong>
                <p>这里查看该资料的切片结果和处理记录。</p>
              </div>
            </div>
            {fileDetailLoading || !fileDetail ? (
              <div className="empty-state">
                <strong>资料详情加载中</strong>
                <p>正在读取切片结果。</p>
              </div>
            ) : (
              <div className="business-kb-detail-grid">
                <article className="reference-info-panel">
                  <div className="reference-info-head">
                    <div>
                      <strong>{fileDetail.title}</strong>
                      <p>{fileDetail.description || "暂无资料说明"}</p>
                    </div>
                  </div>
                  <div className="reference-info-grid">
                    <div>
                      <span>切片数量</span>
                      <strong>{fileDetail.chunkCount}</strong>
                    </div>
                    <div>
                      <span>处理状态</span>
                      <strong>{getFileStatusLabel(fileDetail.status)}</strong>
                    </div>
                    <div>
                      <span>最近处理</span>
                      <strong>{formatDateTime(fileDetail.lastSyncAt)}</strong>
                    </div>
                    <div>
                      <span>资料来源</span>
                      <strong>{fileDetail.sourceName || "未填写"}</strong>
                    </div>
                  </div>
                </article>
                <article className="reference-info-panel">
                  <div className="reference-info-head">
                    <div>
                      <strong>切片列表</strong>
                      <p>展示当前资料切成的知识片段。</p>
                    </div>
                  </div>
                  {fileDetail.chunks.length ? (
                    <div className="business-kb-chunk-list">
                      {fileDetail.chunks.map((chunk) => (
                        <article key={chunk.id} className="business-kb-chunk-item">
                          <strong>切片 {chunk.chunkIndex + 1}</strong>
                          <span>{chunk.charCount} 字 / {chunk.tokenCount} tokens</span>
                          <p>{chunk.content.slice(0, 240) || "暂无切片内容"}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-copy">当前还没有切片内容。</p>
                  )}
                </article>
                <article className="reference-info-panel">
                  <div className="reference-info-head">
                    <div>
                      <strong>处理记录</strong>
                      <p>展示最近的切片同步过程。</p>
                    </div>
                  </div>
                  {fileDetail.syncRuns.length ? (
                    <div className="business-kb-run-list">
                      {fileDetail.syncRuns.map((run) => (
                        <article key={run.id} className="business-kb-run-item">
                          <strong>{run.result}</strong>
                          <span>{run.summary}</span>
                          <span>{formatDateTime(run.completedAt || run.startedAt)}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-copy">当前还没有同步记录。</p>
                  )}
                </article>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
