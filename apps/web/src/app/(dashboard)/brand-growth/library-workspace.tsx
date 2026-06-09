"use client";

import { useEffect, useState } from "react";
import type { BrandGrowthLibraryPageKey } from "./shared-types";
import { BRAND_SURVEY_SECTIONS } from "../../../services/brand-growth";
import type {
  BrandArchiveBundle,
  BrandAsset,
  BrandBackground,
  BrandProduct,
  BrandArchiveStatus,
} from "../../../services/brand-growth";

export type LibraryAssetTarget = "industryFeeds" | "businessAssets";
export type LibraryAssetModalDraft = {
  id: string;
  title: string;
  description: string;
  sourceName: string;
  fileUrl: string;
  file?: File | null;
  existingAssetId?: string;
};

export interface BrandGrowthLibraryWorkspaceProps {
  activeBrandPage: BrandGrowthLibraryPageKey;
  activeStepName?: string;
  activeStepStatus: BrandArchiveStatus;
  archive: BrandArchiveBundle;
  statusText: (status: BrandArchiveStatus) => string;
  onUpdateBackground: <K extends keyof BrandBackground>(key: K, value: BrandBackground[K]) => void;
  onAddProduct: () => void;
  onUpdateProduct: (index: number, key: keyof BrandProduct, value: string | number) => void;
  onRemoveProduct: (productId: string) => void;
  onUploadProductImage: (productId: string, file?: File | null) => void | Promise<void>;
  uploadingProductId: string;
  onUpdateSurvey: (key: string, value: string) => void;
  onCreateAssets: (target: LibraryAssetTarget, drafts: LibraryAssetModalDraft[]) => void | Promise<void>;
  onSaveAssetEdit: (target: LibraryAssetTarget, index: number, draft: LibraryAssetModalDraft) => void | Promise<void>;
  onRemoveAsset: (target: LibraryAssetTarget, index: number) => void;
}

export function BrandGrowthLibraryWorkspace(props: BrandGrowthLibraryWorkspaceProps) {
  if (props.activeBrandPage === "background") {
    return (
      <article className="workspace-panel strategy-page-card">
        <article className="reference-info-panel">
          <div className="reference-info-head">
            <div>
              <strong>{props.archive.brand.brandName || "品牌背景资料"}</strong>
              <p>这里用于维护品牌名称、行业、门店规模、品牌介绍和企业介绍。</p>
            </div>
            <span className="archive-pill status-ready">{props.activeStepName}</span>
          </div>
          <div className="reference-info-grid">
            <div>
              <span>行业</span>
              <strong>{props.archive.brand.industry || "未填写"}</strong>
            </div>
            <div>
              <span>门店数量</span>
              <strong>{props.archive.brand.storeCount}</strong>
            </div>
            <div>
              <span>品牌成立时间</span>
              <strong>{props.archive.brand.foundedYear}</strong>
            </div>
            <div>
              <span>当前状态</span>
              <strong>{props.statusText(props.activeStepStatus)}</strong>
            </div>
          </div>
        </article>
        <div className="form-grid two-column">
          <label className="field">
            <span>品牌名称</span>
            <input
              value={props.archive.brand.brandName}
              onChange={(event) => props.onUpdateBackground("brandName", event.target.value)}
            />
          </label>
          <label className="field">
            <span>行业</span>
            <input
              value={props.archive.brand.industry}
              onChange={(event) => props.onUpdateBackground("industry", event.target.value)}
            />
          </label>
          <label className="field">
            <span>门店数量</span>
            <input
              type="number"
              value={props.archive.brand.storeCount}
              onChange={(event) => props.onUpdateBackground("storeCount", Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>品牌成立时间</span>
            <input
              type="number"
              value={props.archive.brand.foundedYear}
              onChange={(event) => props.onUpdateBackground("foundedYear", Number(event.target.value))}
            />
          </label>
          <label className="field field-full">
            <span>品牌介绍</span>
            <textarea
              value={props.archive.brand.brandDescription}
              onChange={(event) => props.onUpdateBackground("brandDescription", event.target.value)}
            />
          </label>
          <label className="field field-full">
            <span>企业介绍</span>
            <textarea
              value={props.archive.brand.enterpriseIntro}
              onChange={(event) => props.onUpdateBackground("enterpriseIntro", event.target.value)}
            />
          </label>
        </div>
      </article>
    );
  }

  if (props.activeBrandPage === "products") {
    return (
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>产品资料库</strong>
            <p>每个产品单独成卡，字段自动换行，保证当前屏宽内可编辑。</p>
          </div>
          <button type="button" className="primary-button" onClick={props.onAddProduct}>
            新增产品
          </button>
        </div>
        <div className="product-library-grid">
          {props.archive.products.map((product, index) => (
            <div className="product-library-card" key={product.id}>
              <div className="entity-card-head compact-card-head">
                <div>
                  <strong>{product.productName || `产品 ${index + 1}`}</strong>
                  <p className="compact-meta-line">
                    {product.productType || "未填写类型"} · {product.price || 0} 元
                  </p>
                </div>
                <div className="compact-card-actions">
                  <button
                    type="button"
                    className="ghost-danger-button"
                    onClick={() => props.onRemoveProduct(product.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="form-grid two-column product-library-fields">
                <label className="field">
                  <span>产品名称</span>
                  <input
                    value={product.productName}
                    onChange={(event) => props.onUpdateProduct(index, "productName", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>产品类型</span>
                  <input
                    value={product.productType}
                    onChange={(event) => props.onUpdateProduct(index, "productType", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>价格</span>
                  <input
                    type="number"
                    value={product.price}
                    onChange={(event) => props.onUpdateProduct(index, "price", Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>产品定位</span>
                  <input
                    value={product.productPositioning}
                    onChange={(event) => props.onUpdateProduct(index, "productPositioning", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>目标人群</span>
                  <input
                    value={product.targetAudience}
                    onChange={(event) => props.onUpdateProduct(index, "targetAudience", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>解决痛点</span>
                  <input
                    value={product.painPoint}
                    onChange={(event) => props.onUpdateProduct(index, "painPoint", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>使用场景</span>
                  <input
                    value={product.usageScenario}
                    onChange={(event) => props.onUpdateProduct(index, "usageScenario", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>差异化优势</span>
                  <input
                    value={product.differentiators}
                    onChange={(event) => props.onUpdateProduct(index, "differentiators", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>市场地位</span>
                  <input
                    value={product.marketPosition}
                    onChange={(event) => props.onUpdateProduct(index, "marketPosition", event.target.value)}
                  />
                </label>
                <label className="field field-full">
                  <span>产品详细介绍</span>
                  <textarea
                    rows={4}
                    value={product.detailDescription}
                    onChange={(event) => props.onUpdateProduct(index, "detailDescription", event.target.value)}
                  />
                </label>
                <label className="field field-full">
                  <span>产品图片</span>
                  <div className="product-image-upload-row">
                    <label className="secondary-button product-upload-trigger">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only-file-input"
                        onChange={(event) => {
                          void props.onUploadProductImage(product.id, event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                      {props.uploadingProductId === product.id ? "上传中..." : "上传图片"}
                    </label>
                    {product.imageUrl ? (
                      <a href={product.imageUrl} target="_blank" rel="noreferrer" className="secondary-button">
                        查看原图
                      </a>
                    ) : null}
                  </div>
                  {product.imageUrl ? (
                    <div className="product-image-preview-shell">
                      <img
                        src={product.imageUrl}
                        alt={`${product.productName || `产品 ${index + 1}`} 图片`}
                        className="product-image-preview"
                      />
                    </div>
                  ) : (
                    <span className="field-hint">支持上传图片文件，上传后会自动回填并在保存时写入数据库。</span>
                  )}
                </label>
              </div>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (props.activeBrandPage === "survey") {
    return (
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>品牌运营情况</strong>
            <p>严格按既定调研参数填写，保存后写入数据库。</p>
          </div>
        </div>
        <div className="survey-section-list">
          {BRAND_SURVEY_SECTIONS.map((section) => (
            <section className="survey-section-card" key={section.title}>
              <div className="survey-section-title">{section.title}</div>
              {section.fields?.map((field) => {
                const answer = props.archive.survey.find((item) => item.key === field.key);
                return (
                  <label className="field" key={field.key}>
                    <span>{field.label}</span>
                    <textarea
                      value={answer?.value ?? ""}
                      onChange={(event) => props.onUpdateSurvey(field.key, event.target.value)}
                    />
                  </label>
                );
              })}
              {section.groups?.map((group) => (
                <div className="survey-subgroup" key={group.title}>
                  <div className="survey-subgroup-title">{group.title}</div>
                  {group.fields.map((field) => {
                    const answer = props.archive.survey.find((item) => item.key === field.key);
                    return (
                      <label className="field" key={field.key}>
                        <span>{field.label}</span>
                        <textarea
                          value={answer?.value ?? ""}
                          onChange={(event) => props.onUpdateSurvey(field.key, event.target.value)}
                        />
                      </label>
                    );
                  })}
                </div>
              ))}
            </section>
          ))}
        </div>
      </article>
    );
  }

  const assetTarget = props.activeBrandPage;
  const assetTitle = assetTarget === "industryFeeds" ? "第三方数据" : "企业知识库";
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalMode, setAssetModalMode] = useState<"create" | "edit">("create");
  const [assetModalDrafts, setAssetModalDrafts] = useState<LibraryAssetModalDraft[]>([]);
  const [editingAssetIndex, setEditingAssetIndex] = useState<number | null>(null);
  const [isSubmittingAssetModal, setIsSubmittingAssetModal] = useState(false);

  useEffect(() => {
    if (!isAssetModalOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmittingAssetModal) {
        handleCloseAssetModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAssetModalOpen, isSubmittingAssetModal]);

  function handleOpenCreateAssetModal() {
    setAssetModalMode("create");
    setEditingAssetIndex(null);
    setAssetModalDrafts([buildEmptyAssetModalDraft()]);
    setIsAssetModalOpen(true);
  }

  function handleOpenEditAssetModal(index: number) {
    const targetAsset = props.archive[assetTarget][index];
    if (!targetAsset) {
      return;
    }
    setAssetModalMode("edit");
    setEditingAssetIndex(index);
    setAssetModalDrafts([buildAssetModalDraftFromAsset(targetAsset)]);
    setIsAssetModalOpen(true);
  }

  function handleCloseAssetModal() {
    if (isSubmittingAssetModal) {
      return;
    }
    setIsAssetModalOpen(false);
    setAssetModalMode("create");
    setEditingAssetIndex(null);
    setAssetModalDrafts([]);
  }

  function handleAssetDraftChange(draftId: string, patch: Partial<LibraryAssetModalDraft>) {
    setAssetModalDrafts((current) =>
      current.map((item) => (item.id === draftId ? { ...item, ...patch } : item)),
    );
  }

  function handleAddEmptyAssetDraft() {
    setAssetModalDrafts((current) => [...current, buildEmptyAssetModalDraft()]);
  }

  function handleRemoveAssetDraft(draftId: string) {
    setAssetModalDrafts((current) => current.filter((item) => item.id !== draftId));
  }

  function handleAppendFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    const draftsFromFiles = Array.from(files).map((file) => buildAssetModalDraftFromFile(file));
    setAssetModalDrafts((current) => {
      if (assetModalMode === "edit") {
        const firstDraft = current[0] ?? buildEmptyAssetModalDraft();
        const [firstFile] = draftsFromFiles;
        return [
          {
            ...firstDraft,
            title: firstDraft.title.trim() ? firstDraft.title : firstFile.title,
            file: firstFile.file,
            fileUrl: "",
          },
        ];
      }

      const hasOnlyEmptyDraft =
        current.length === 1 &&
        !current[0]?.title.trim() &&
        !current[0]?.description.trim() &&
        !current[0]?.sourceName.trim() &&
        !current[0]?.fileUrl.trim() &&
        !current[0]?.file;

      return hasOnlyEmptyDraft ? draftsFromFiles : [...current, ...draftsFromFiles];
    });
  }

  async function handleSubmitAssetModal() {
    const validDrafts = assetModalDrafts.filter(
      (item) => item.title.trim() || item.description.trim() || item.sourceName.trim() || item.fileUrl.trim() || item.file,
    );

    if (!validDrafts.length) {
      return;
    }

    setIsSubmittingAssetModal(true);
    try {
      if (assetModalMode === "edit" && editingAssetIndex !== null) {
        await props.onSaveAssetEdit(assetTarget, editingAssetIndex, validDrafts[0]);
      } else {
        await props.onCreateAssets(assetTarget, validDrafts);
      }
      handleCloseAssetModal();
    } finally {
      setIsSubmittingAssetModal(false);
    }
  }

  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{assetTitle}</strong>
            <p>
              {assetTarget === "industryFeeds"
                ? "这里维护行业报告、市场资料与外部数据。"
                : "这里维护经营报表、业务系统、门店资料与内部知识文档，新增资料后会以卡片形式沉淀并可统一保存到知识库。"}
            </p>
          </div>
          <button type="button" className="primary-button" onClick={handleOpenCreateAssetModal}>
            新增资料
          </button>
        </div>

        {props.archive[assetTarget].length ? (
          <div className="knowledge-content-card-grid">
            {props.archive[assetTarget].map((asset, index) => (
              <article className="knowledge-content-card" key={asset.id ?? `${assetTarget}-${index}`}>
                <div className="knowledge-content-card__head">
                  <div>
                    <strong>{asset.title || `资料 ${index + 1}`}</strong>
                    <p>{asset.sourceName || "未填写来源"}</p>
                  </div>
                  <span className="archive-pill status-ready">{assetTarget === "businessAssets" ? "知识库" : "资料"}</span>
                </div>
                <div className="knowledge-content-card__meta">
                  <span>{asset.fileUrl ? extractFileName(asset.fileUrl) : "未关联文件"}</span>
                  <span>{assetTarget === "businessAssets" ? "保存页面后自动同步到知识库" : "保存页面后写入资料库"}</span>
                </div>
                <p className="knowledge-content-card__description">{asset.description || "暂无资料说明。"}</p>
                <div className="knowledge-content-card__actions">
                  {asset.fileUrl ? (
                    <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="secondary-button">
                      查看文件
                    </a>
                  ) : null}
                  <button type="button" className="secondary-button" onClick={() => handleOpenEditAssetModal(index)}>
                    编辑
                  </button>
                  <button type="button" className="ghost-danger-button" onClick={() => props.onRemoveAsset(assetTarget, index)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="knowledge-content-empty-state">
            <strong>还没有资料</strong>
            <p>点击右上角“新增资料”后可在弹窗中一次导入多个文档，并自动用文件名回填资料标题。</p>
          </div>
        )}
      </article>

      {isAssetModalOpen ? (
        <div className="knowledge-asset-modal-overlay" role="dialog" aria-modal="true" onClick={handleCloseAssetModal}>
          <div className="knowledge-asset-modal" onClick={(event) => event.stopPropagation()}>
            <div className="knowledge-asset-modal__head">
              <div>
                <strong>{assetModalMode === "edit" ? "编辑资料" : `新增${assetTitle}资料`}</strong>
                <p>
                  {assetModalMode === "edit"
                    ? "修改当前资料信息，保存后会回写到当前页面。"
                    : "支持一次添加多个文档，系统会自动使用文档名生成资料标题。"}
                </p>
              </div>
              <button type="button" className="media-preview-close" onClick={handleCloseAssetModal}>
                关闭
              </button>
            </div>

            <div className="knowledge-upload-choice-grid">
              <label className="knowledge-upload-choice knowledge-upload-choice--active product-upload-trigger">
                <input
                  type="file"
                  multiple={assetModalMode === "create"}
                  className="sr-only-file-input"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.ppt,.pptx,.txt,.md,.markdown,.zip"
                  onChange={(event) => {
                    handleAppendFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <strong>{assetModalMode === "edit" ? "替换文档" : "批量导入文档"}</strong>
                <span>支持 PDF、Word、Excel、CSV、TXT、Markdown、PPT、ZIP 等文件。</span>
                <em>{assetModalMode === "edit" ? "重新选择文件" : "点击选择多个文件"}</em>
              </label>
              <div className="knowledge-upload-choice">
                <strong>自动标题</strong>
                <span>系统会自动去掉扩展名后回填资料标题，你可以在保存前继续逐条修改。</span>
                <em>适合批量录入</em>
              </div>
            </div>

            <div className="knowledge-asset-modal__drafts">
              {assetModalDrafts.map((draft, index) => (
                <article className="knowledge-asset-draft-card" key={draft.id}>
                  <div className="knowledge-content-card__head">
                    <div>
                      <strong>{draft.title || `资料 ${index + 1}`}</strong>
                      <p>{draft.file ? draft.file.name : draft.fileUrl ? extractFileName(draft.fileUrl) : "未选择文件"}</p>
                    </div>
                    <div className="compact-card-actions">
                      {assetModalMode === "create" ? (
                        <button
                          type="button"
                          className="ghost-danger-button"
                          onClick={() => handleRemoveAssetDraft(draft.id)}
                          disabled={assetModalDrafts.length === 1}
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="form-grid two-column">
                    <label className="field">
                      <span>资料标题</span>
                      <input
                        value={draft.title}
                        onChange={(event) => handleAssetDraftChange(draft.id, { title: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>来源名称</span>
                      <input
                        value={draft.sourceName}
                        placeholder="例如 本地文档 / 门店系统 / 财务报表"
                        onChange={(event) => handleAssetDraftChange(draft.id, { sourceName: event.target.value })}
                      />
                    </label>
                    <label className="field field-full">
                      <span>资料说明</span>
                      <textarea
                        value={draft.description}
                        onChange={(event) => handleAssetDraftChange(draft.id, { description: event.target.value })}
                      />
                    </label>
                    <label className="field field-full">
                      <span>文件地址</span>
                      <input
                        value={draft.fileUrl}
                        placeholder={draft.file ? "保存时将自动上传并回填文件地址" : "可手动填写已存在的文件地址"}
                        onChange={(event) => handleAssetDraftChange(draft.id, { fileUrl: event.target.value })}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>

            <div className="knowledge-asset-modal__footer">
              {assetModalMode === "create" ? (
                <button type="button" className="secondary-button" onClick={handleAddEmptyAssetDraft}>
                  新增一条空白资料
                </button>
              ) : (
                <span className="personal-meta">如需替换文档，请重新选择文件；未替换时保留原链接。</span>
              )}
              <div className="knowledge-asset-modal__footer-actions">
                <button type="button" className="secondary-button" onClick={handleCloseAssetModal} disabled={isSubmittingAssetModal}>
                  取消
                </button>
                <button type="button" className="primary-button" onClick={() => void handleSubmitAssetModal()} disabled={isSubmittingAssetModal}>
                  {isSubmittingAssetModal
                    ? "保存中..."
                    : assetModalMode === "edit"
                      ? "保存资料"
                      : `添加 ${assetModalDrafts.filter((item) => item.title.trim() || item.file || item.fileUrl.trim()).length || 1} 份资料`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildEmptyAssetModalDraft(): LibraryAssetModalDraft {
  return {
    id: `asset_modal_${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    description: "",
    sourceName: "",
    fileUrl: "",
    file: null,
  };
}

function buildAssetModalDraftFromAsset(asset: BrandAsset): LibraryAssetModalDraft {
  return {
    id: `asset_modal_${asset.id || Math.random().toString(36).slice(2, 9)}`,
    title: asset.title,
    description: asset.description,
    sourceName: asset.sourceName || "",
    fileUrl: asset.fileUrl || "",
    file: null,
    existingAssetId: asset.id,
  };
}

function buildAssetModalDraftFromFile(file: File): LibraryAssetModalDraft {
  return {
    id: `asset_modal_${Math.random().toString(36).slice(2, 9)}`,
    title: inferAssetTitleFromFileName(file.name),
    description: "",
    sourceName: "本地文档",
    fileUrl: "",
    file,
  };
}

function inferAssetTitleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || fileName;
}

function extractFileName(fileUrl: string) {
  try {
    const normalized = decodeURIComponent(fileUrl.split("?")[0] || "");
    return normalized.split("/").filter(Boolean).pop() || fileUrl;
  } catch {
    return fileUrl;
  }
}
