"use client";

import { useEffect, useState } from "react";
import type { BrandGrowthLibraryPageKey } from "./shared-types";
import { BusinessKnowledgeWorkspace } from "./business-knowledge-workspace";
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
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  knowledgeBaseSlug: string;
  bindingType: "MODULE" | "SKILL_PACKAGE" | "SKILL";
  targetId: string;
  targetKey: string;
  targetName: string;
  priority: number;
  retrievalMode: "HYBRID" | "VECTOR" | "FULL_TEXT";
  isRequired: boolean;
  enabled: boolean;
  defaultTopK: number;
  recallMode: "HYBRID" | "VECTOR" | "FULL_TEXT";
  rerankEnabled: boolean;
  retrievalThreshold: string;
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
  onUploadProductImage: (productId: string, files?: File[] | null) => void | Promise<void>;
  uploadingProductId: string;
  onUpdateSurvey: (key: string, value: string) => void;
  onCreateAssets: (target: LibraryAssetTarget, drafts: LibraryAssetModalDraft[]) => void | Promise<void>;
  onSaveAssetEdit: (target: LibraryAssetTarget, index: number, draft: LibraryAssetModalDraft) => void | Promise<void>;
  onRemoveAsset: (target: LibraryAssetTarget, index: number) => void;
}

type LibraryBindingType = LibraryAssetModalDraft["bindingType"];
type RetrievalMode = LibraryAssetModalDraft["retrievalMode"];
type BindingTargetPreset = {
  bindingType: LibraryBindingType;
  label: string;
  targetId: string;
  targetKey: string;
  targetName: string;
  description: string;
};

const BINDING_TYPE_OPTIONS: Array<{ value: LibraryBindingType; label: string; description: string }> = [
  { value: "MODULE", label: "模块", description: "给整个工作台或模块统一使用。" },
  { value: "SKILL_PACKAGE", label: "能力包", description: "给一组连续技能步骤统一使用。" },
  { value: "SKILL", label: "技能", description: "只给某个具体技能使用。" },
];

const RETRIEVAL_MODE_OPTIONS: Array<{ value: RetrievalMode; label: string; description: string }> = [
  { value: "HYBRID", label: "混合检索", description: "优先推荐，兼顾语义和关键词召回。" },
  { value: "VECTOR", label: "向量检索", description: "更偏向语义相似内容。" },
  { value: "FULL_TEXT", label: "全文检索", description: "更适合强关键词、表格字段和制度名称。" },
];

const BINDING_TARGET_PRESETS: BindingTargetPreset[] = [
  {
    bindingType: "MODULE",
    label: "品牌增长工作台",
    targetId: "brand-growth-workbench",
    targetKey: "brand-growth-workbench",
    targetName: "品牌增长工作台",
    description: "品牌增长报告、半年营销规划等默认都会读取这里绑定的企业知识。",
  },
  {
    bindingType: "MODULE",
    label: "小红书工作台",
    targetId: "xiaohongshu-workbench",
    targetKey: "xiaohongshu-workbench",
    targetName: "小红书工作台",
    description: "适合小红书营销规划、原创笔记、营销日历等场景。",
  },
  {
    bindingType: "MODULE",
    label: "抖音工作台",
    targetId: "douyin-workbench",
    targetKey: "douyin-workbench",
    targetName: "抖音工作台",
    description: "适合抖音营销规划、热点找选题、视频与数字人场景。",
  },
  {
    bindingType: "MODULE",
    label: "公众号工作台",
    targetId: "wechat-workbench",
    targetKey: "wechat-workbench",
    targetName: "公众号工作台",
    description: "适合公众号文章创作、排版和配图场景。",
  },
  {
    bindingType: "SKILL_PACKAGE",
    label: "品牌增长报告能力包",
    targetId: "brand-growth-analysis",
    targetKey: "brand-growth-analysis",
    targetName: "品牌增长报告能力包",
    description: "给品牌增长报告整条分析链路使用。",
  },
  {
    bindingType: "SKILL_PACKAGE",
    label: "半年营销规划能力包",
    targetId: "enterprise-annual-plan",
    targetKey: "enterprise-annual-plan",
    targetName: "半年营销规划能力包",
    description: "给半年营销规划整条链路使用。",
  },
  {
    bindingType: "SKILL_PACKAGE",
    label: "小红书营销规划能力包",
    targetId: "xiaohongshu-brand-marketing-plan",
    targetKey: "xiaohongshu-brand-marketing-plan",
    targetName: "小红书营销规划能力包",
    description: "给小红书营销策划方案与相关计划场景使用。",
  },
  {
    bindingType: "SKILL_PACKAGE",
    label: "抖音营销规划能力包",
    targetId: "tongcheng-brand-douyin-planning",
    targetKey: "tongcheng-brand-douyin-planning",
    targetName: "抖音营销规划能力包",
    description: "给抖音营销策划和热点类链路使用。",
  },
  {
    bindingType: "SKILL_PACKAGE",
    label: "公众号文章生成能力包",
    targetId: "wechat-article-generator",
    targetKey: "wechat-article-generator",
    targetName: "公众号文章生成能力包",
    description: "给公众号文章创作链路统一使用。",
  },
  {
    bindingType: "SKILL",
    label: "品牌增长报告",
    targetId: "brand-omni-growth-analysis",
    targetKey: "brand-omni-growth-analysis",
    targetName: "品牌增长报告",
    description: "只让品牌增长报告技能读取这份知识。",
  },
  {
    bindingType: "SKILL",
    label: "半年营销规划",
    targetId: "enterprise-annual-plan",
    targetKey: "enterprise-annual-plan",
    targetName: "半年营销规划",
    description: "只让半年营销规划技能读取这份知识。",
  },
  {
    bindingType: "SKILL",
    label: "小红书营销策划方案",
    targetId: "xiaohongshu-brand-marketing-plan",
    targetKey: "xiaohongshu-brand-marketing-plan",
    targetName: "小红书营销策划方案",
    description: "只让小红书营销策划方案技能读取这份知识。",
  },
  {
    bindingType: "SKILL",
    label: "抖音热点找选题",
    targetId: "douyin-hot-topic-candidates",
    targetKey: "douyin-hot-topic-candidates",
    targetName: "抖音热点找选题",
    description: "只让抖音热点找选题技能读取这份知识。",
  },
  {
    bindingType: "SKILL",
    label: "公众号文章创作",
    targetId: "wechat-article-composer",
    targetKey: "wechat-article-composer",
    targetName: "公众号文章创作",
    description: "只让公众号文章创作技能读取这份知识。",
  },
];

export function BrandGrowthLibraryWorkspace(props: BrandGrowthLibraryWorkspaceProps) {
  if (props.activeBrandPage === "businessAssets") {
    return <BusinessKnowledgeWorkspace brandId={props.archive.brand.id} />;
  }

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
                        multiple
                        className="sr-only-file-input"
                        onChange={(event) => {
                          void props.onUploadProductImage(product.id, Array.from(event.target.files || []));
                          event.currentTarget.value = "";
                        }}
                      />
                      {props.uploadingProductId === product.id ? "上传中..." : "上传图片"}
                    </label>
                    {product.imageUrls.length ? (
                      <a href={product.imageUrls[0]} target="_blank" rel="noreferrer" className="secondary-button">
                        查看首图
                      </a>
                    ) : null}
                  </div>
                  {product.imageUrls.length ? (
                    <div className="product-image-preview-grid">
                      {product.imageUrls.map((imageUrl, imageIndex) => (
                        <div className="product-image-preview-shell" key={`${product.id}-${imageIndex}`}>
                          <img
                            src={imageUrl}
                            alt={`${product.productName || `产品 ${index + 1}`} 图片 ${imageIndex + 1}`}
                            className="product-image-preview"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="field-hint">支持一次选择多张图片，上传后会自动追加到当前产品并在保存时写入数据库。</span>
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

  const assetTarget: LibraryAssetTarget = "industryFeeds";
  const assetTitle = "第三方数据";
  const isBusinessAssetsPage = false;
  const businessKnowledgeSummaries: Array<ReturnType<typeof collectBusinessAssetKnowledgeSummaries>[number]> = [];
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
    setAssetModalDrafts([buildEmptyAssetModalDraft(isBusinessAssetsPage)]);
    setIsAssetModalOpen(true);
  }

  function handleOpenEditAssetModal(index: number) {
    const targetAsset = props.archive[assetTarget][index];
    if (!targetAsset) {
      return;
    }
    setAssetModalMode("edit");
    setEditingAssetIndex(index);
    setAssetModalDrafts([buildAssetModalDraftFromAsset(targetAsset, isBusinessAssetsPage)]);
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

  function handleBindingTypeChange(draftId: string, bindingType: LibraryBindingType) {
    const preset = getBindingTargetPresets(bindingType)[0];
    handleAssetDraftChange(draftId, {
      bindingType,
      targetId: preset?.targetId || "",
      targetKey: preset?.targetKey || "",
      targetName: preset?.targetName || "",
    });
  }

  function handleBindingTargetPresetChange(draftId: string, bindingType: LibraryBindingType, targetId: string) {
    const preset = getBindingTargetPresets(bindingType).find((item) => item.targetId === targetId);
    handleAssetDraftChange(draftId, {
      targetId: preset?.targetId || "",
      targetKey: preset?.targetKey || "",
      targetName: preset?.targetName || "",
    });
  }

  function handleAddEmptyAssetDraft() {
    setAssetModalDrafts((current) => [...current, buildEmptyAssetModalDraft(isBusinessAssetsPage)]);
  }

  function handleRemoveAssetDraft(draftId: string) {
    setAssetModalDrafts((current) => current.filter((item) => item.id !== draftId));
  }

  function handleAppendFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    const draftsFromFiles = Array.from(files).map((file) => buildAssetModalDraftFromFile(file, isBusinessAssetsPage));
    setAssetModalDrafts((current) => {
      if (assetModalMode === "edit") {
        const firstDraft = current[0] ?? buildEmptyAssetModalDraft(isBusinessAssetsPage);
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
              这里维护行业报告、市场资料与外部数据。
            </p>
          </div>
          <button type="button" className="primary-button" onClick={handleOpenCreateAssetModal}>
            新增资料
          </button>
        </div>

        {isBusinessAssetsPage ? (
          <article className="knowledge-mapping-callout">
            <div className="knowledge-mapping-callout__head">
              <strong>后台知识库容器</strong>
              <span className="archive-pill status-ready">{businessKnowledgeSummaries.length || 1} 个容器</span>
            </div>
            <p>
              每份资料都可以指定自己的知识库容器、接入对象和检索策略。保存后会按容器分组，自动同步成多个后台知识库。
            </p>
            <div className="knowledge-mapping-callout__grid">
              {businessKnowledgeSummaries.map((summary) => (
                <div key={summary.knowledgeBaseId}>
                  <span>知识库名称</span>
                  <strong>{summary.knowledgeBaseName}</strong>
                  <p className="personal-meta">{summary.fileCount} 份资料 · {summary.targetNames.join("、")}</p>
                  <p className="personal-meta">{summary.retrievalSummary}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {props.archive[assetTarget].length ? (
          <div className="knowledge-content-card-grid">
            {props.archive[assetTarget].map((asset, index) => (
              <article className="knowledge-content-card" key={asset.id ?? `${assetTarget}-${index}`}>
                <div className="knowledge-content-card__head">
                  <div>
                    <strong>{asset.title || `资料 ${index + 1}`}</strong>
                    <p>{asset.sourceName || "未填写来源"}</p>
                  </div>
                  <span className="archive-pill status-ready">资料</span>
                </div>
                <div className="knowledge-content-card__meta">
                  <span>{asset.fileUrl ? extractFileName(asset.fileUrl) : "未关联文件"}</span>
                  <span>{isBusinessAssetsPage ? "上传后立即自动同步到知识库" : "保存页面后写入资料库"}</span>
                </div>
                {isBusinessAssetsPage ? (
                  <div className="knowledge-content-card__mapping">
                    <span>{describeBindingType(asset.bindingType)} · {formatAssetTargetName(asset)}</span>
                    <strong>{formatAssetKnowledgeBaseName(props.archive.brand.id, props.archive.brand.brandName, asset)}</strong>
                    <p className="personal-meta">{formatRetrievalSummary(asset)}</p>
                  </div>
                ) : null}
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
            <p>
              {isBusinessAssetsPage
                ? "点击右上角“新增资料”后可一次导入多个文档，并在弹窗里直接配置知识库容器、接入对象和检索参数。"
                : "点击右上角“新增资料”后可在弹窗中一次导入多个文档，并自动用文件名回填资料标题。"}
            </p>
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
                    ? isBusinessAssetsPage
                      ? "修改后会立即回写企业知识库，并重跑当前容器的后台同步。"
                      : "修改当前资料信息，保存后会回写到当前页面。"
                    : isBusinessAssetsPage
                      ? "支持一次添加多个文档，上传时就能配置知识库容器、接入对象和检索参数。"
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
                    {isBusinessAssetsPage ? (
                      <>
                        <label className="field">
                          <span>知识库容器名称</span>
                          <input
                            value={draft.knowledgeBaseName}
                            placeholder="例如 门店经营资料 / 小红书内容素材 / 内部制度库"
                            onChange={(event) => handleAssetDraftChange(draft.id, { knowledgeBaseName: event.target.value })}
                          />
                          <span className="field-hint">同名资料会自动归并到同一个后台知识库容器。</span>
                        </label>
                        <label className="field">
                          <span>知识库 Slug</span>
                          <input
                            value={draft.knowledgeBaseSlug}
                            placeholder="可选，不填时会根据容器名称自动生成"
                            onChange={(event) => handleAssetDraftChange(draft.id, { knowledgeBaseSlug: event.target.value })}
                          />
                          <span className="field-hint">主要用于后台唯一标识，不懂可以留空。</span>
                        </label>
                        <label className="field">
                          <span>接入类型</span>
                          <select
                            value={draft.bindingType}
                            onChange={(event) => handleBindingTypeChange(draft.id, event.target.value as LibraryBindingType)}
                          >
                            {BINDING_TYPE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <span className="field-hint">
                            {BINDING_TYPE_OPTIONS.find((item) => item.value === draft.bindingType)?.description}
                          </span>
                        </label>
                        <label className="field">
                          <span>接入对象</span>
                          <select
                            value={draft.targetId}
                            onChange={(event) => handleBindingTargetPresetChange(draft.id, draft.bindingType, event.target.value)}
                          >
                            <option value="">请选择接入对象</option>
                            {buildBindingTargetOptions(draft.bindingType, draft.targetId, draft.targetName).map((item) => (
                              <option key={`${item.bindingType}-${item.targetId}`} value={item.targetId}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <span className="field-hint">
                            {buildBindingTargetOptions(draft.bindingType, draft.targetId, draft.targetName)
                              .find((item) => item.targetId === draft.targetId)?.description || "选择后会自动回填目标名称、ID 和 KEY。"}
                          </span>
                        </label>
                        <label className="field">
                          <span>目标名称</span>
                          <input
                            value={draft.targetName}
                            placeholder="下拉选择后会自动回填"
                            onChange={(event) => handleAssetDraftChange(draft.id, { targetName: event.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>目标 ID</span>
                          <input
                            value={draft.targetId}
                            placeholder="例如 brand-growth-workbench"
                            onChange={(event) => handleAssetDraftChange(draft.id, { targetId: event.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>目标 KEY</span>
                          <input
                            value={draft.targetKey}
                            placeholder="一般与目标 ID 保持一致"
                            onChange={(event) => handleAssetDraftChange(draft.id, { targetKey: event.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>优先级</span>
                          <input
                            type="number"
                            min={1}
                            value={draft.priority}
                            onChange={(event) => handleAssetDraftChange(draft.id, { priority: Math.max(1, Number(event.target.value) || 1) })}
                          />
                          <span className="field-hint">数字越大越靠后；常用 1、10、100 这类层级。</span>
                        </label>
                        <label className="field">
                          <span>绑定检索方式</span>
                          <select
                            value={draft.retrievalMode}
                            onChange={(event) => handleAssetDraftChange(draft.id, { retrievalMode: event.target.value as RetrievalMode })}
                          >
                            {RETRIEVAL_MODE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <span className="field-hint">
                            {RETRIEVAL_MODE_OPTIONS.find((item) => item.value === draft.retrievalMode)?.description}
                          </span>
                        </label>
                        <label className="field">
                          <span>默认 TopK</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={draft.defaultTopK}
                            onChange={(event) => handleAssetDraftChange(draft.id, { defaultTopK: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })}
                          />
                          <span className="field-hint">每次检索默认取前几条片段，通常 5 到 10 比较稳。</span>
                        </label>
                        <label className="field">
                          <span>召回模式</span>
                          <select
                            value={draft.recallMode}
                            onChange={(event) => handleAssetDraftChange(draft.id, { recallMode: event.target.value as RetrievalMode })}
                          >
                            {RETRIEVAL_MODE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <span className="field-hint">这是知识库默认召回策略，会影响大部分运行时检索行为。</span>
                        </label>
                        <label className="field">
                          <span>是否开启重排</span>
                          <select
                            value={draft.rerankEnabled ? "true" : "false"}
                            onChange={(event) => handleAssetDraftChange(draft.id, { rerankEnabled: event.target.value === "true" })}
                          >
                            <option value="false">关闭</option>
                            <option value="true">开启</option>
                          </select>
                          <span className="field-hint">开启后会对召回结果再做一次相关性排序，通常更稳但会更慢。</span>
                        </label>
                        <label className="field">
                          <span>检索阈值</span>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step="0.05"
                            value={draft.retrievalThreshold}
                            placeholder="可选，例如 0.45"
                            onChange={(event) => handleAssetDraftChange(draft.id, { retrievalThreshold: event.target.value })}
                          />
                          <span className="field-hint">越高越严格，命中更少但更准；不确定时可先留空。</span>
                        </label>
                        <label className="field">
                          <span>是否必带</span>
                          <select
                            value={draft.isRequired ? "true" : "false"}
                            onChange={(event) => handleAssetDraftChange(draft.id, { isRequired: event.target.value === "true" })}
                          >
                            <option value="false">否</option>
                            <option value="true">是</option>
                          </select>
                          <span className="field-hint">开启后即使召回失败，也会在运行日志里提示这份知识缺失。</span>
                        </label>
                        <label className="field">
                          <span>是否启用</span>
                          <select
                            value={draft.enabled ? "true" : "false"}
                            onChange={(event) => handleAssetDraftChange(draft.id, { enabled: event.target.value === "true" })}
                          >
                            <option value="true">启用</option>
                            <option value="false">停用</option>
                          </select>
                          <span className="field-hint">停用后资料仍保留在容器里，但运行时不会参与检索。</span>
                        </label>
                      </>
                    ) : null}
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
                <span className="personal-meta">
                  {isBusinessAssetsPage
                    ? "如需替换文档，请重新选择文件；保存后会立即重跑当前知识库容器同步。"
                    : "如需替换文档，请重新选择文件；未替换时保留原链接。"}
                </span>
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

function buildEmptyAssetModalDraft(isBusinessAsset = false): LibraryAssetModalDraft {
  return {
    id: `asset_modal_${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    description: "",
    sourceName: "",
    fileUrl: "",
    ...buildDefaultKnowledgeDraftConfig(isBusinessAsset),
    file: null,
  };
}

function buildAssetModalDraftFromAsset(asset: BrandAsset, isBusinessAsset = false): LibraryAssetModalDraft {
  const defaults = buildDefaultKnowledgeDraftConfig(isBusinessAsset);
  return {
    id: `asset_modal_${asset.id || Math.random().toString(36).slice(2, 9)}`,
    title: asset.title,
    description: asset.description,
    sourceName: asset.sourceName || "",
    fileUrl: asset.fileUrl || "",
    knowledgeBaseId: asset.knowledgeBaseId || defaults.knowledgeBaseId,
    knowledgeBaseName: asset.knowledgeBaseName || defaults.knowledgeBaseName,
    knowledgeBaseSlug: asset.knowledgeBaseSlug || defaults.knowledgeBaseSlug,
    bindingType: asset.bindingType || defaults.bindingType,
    targetId: asset.targetId || defaults.targetId,
    targetKey: asset.targetKey || defaults.targetKey,
    targetName: asset.targetName || defaults.targetName,
    priority: asset.priority ?? defaults.priority,
    retrievalMode: asset.retrievalMode || defaults.retrievalMode,
    isRequired: asset.isRequired ?? defaults.isRequired,
    enabled: asset.enabled ?? defaults.enabled,
    defaultTopK: asset.defaultTopK ?? defaults.defaultTopK,
    recallMode: asset.recallMode || defaults.recallMode,
    rerankEnabled: asset.rerankEnabled ?? defaults.rerankEnabled,
    retrievalThreshold:
      typeof asset.retrievalThreshold === "number" && Number.isFinite(asset.retrievalThreshold)
        ? String(asset.retrievalThreshold)
        : defaults.retrievalThreshold,
    file: null,
    existingAssetId: asset.id,
  };
}

function buildAssetModalDraftFromFile(file: File, isBusinessAsset = false): LibraryAssetModalDraft {
  return {
    id: `asset_modal_${Math.random().toString(36).slice(2, 9)}`,
    title: inferAssetTitleFromFileName(file.name),
    description: "",
    sourceName: "本地文档",
    fileUrl: "",
    ...buildDefaultKnowledgeDraftConfig(isBusinessAsset),
    file,
  };
}

function buildDefaultKnowledgeDraftConfig(isBusinessAsset: boolean): Omit<LibraryAssetModalDraft, "id" | "title" | "description" | "sourceName" | "fileUrl" | "file" | "existingAssetId"> {
  if (!isBusinessAsset) {
    return {
      knowledgeBaseId: "",
      knowledgeBaseName: "",
      knowledgeBaseSlug: "",
      bindingType: "MODULE",
      targetId: "",
      targetKey: "",
      targetName: "",
      priority: 100,
      retrievalMode: "HYBRID",
      isRequired: false,
      enabled: true,
      defaultTopK: 8,
      recallMode: "HYBRID",
      rerankEnabled: false,
      retrievalThreshold: "",
    };
  }

  const preset = getBindingTargetPresets("MODULE")[0];
  return {
    knowledgeBaseId: "",
    knowledgeBaseName: "",
    knowledgeBaseSlug: "",
    bindingType: "MODULE",
    targetId: preset?.targetId || "",
    targetKey: preset?.targetKey || "",
    targetName: preset?.targetName || "",
    priority: 1,
    retrievalMode: "HYBRID",
    isRequired: false,
    enabled: true,
    defaultTopK: 8,
    recallMode: "HYBRID",
    rerankEnabled: false,
    retrievalThreshold: "",
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

function getBindingTargetPresets(bindingType: LibraryBindingType) {
  return BINDING_TARGET_PRESETS.filter((item) => item.bindingType === bindingType);
}

function buildBindingTargetOptions(bindingType: LibraryBindingType, currentTargetId: string, currentTargetName: string) {
  const presets = getBindingTargetPresets(bindingType);
  if (!currentTargetId || presets.some((item) => item.targetId === currentTargetId)) {
    return presets;
  }
  return [
    {
      bindingType,
      label: `${currentTargetName || "当前自定义目标"}（当前值）`,
      targetId: currentTargetId,
      targetKey: currentTargetId,
      targetName: currentTargetName || currentTargetId,
      description: "保留当前已配置的自定义目标。",
    },
    ...presets,
  ];
}

function describeBindingType(bindingType?: BrandAsset["bindingType"]) {
  return BINDING_TYPE_OPTIONS.find((item) => item.value === bindingType)?.label || "模块";
}

function describeRetrievalMode(mode?: BrandAsset["retrievalMode"]) {
  return RETRIEVAL_MODE_OPTIONS.find((item) => item.value === mode)?.label || "混合检索";
}

function formatAssetKnowledgeBaseName(brandId: string, brandName: string, asset: BrandAsset) {
  return asset.knowledgeBaseName || buildBusinessAssetsKnowledgeBaseName(brandName);
}

function formatAssetTargetName(asset: BrandAsset) {
  return asset.targetName || asset.targetId || "品牌增长工作台";
}

function formatRetrievalSummary(asset: BrandAsset) {
  const topK = Math.max(1, Number(asset.defaultTopK || 8));
  const recallMode = describeRetrievalMode(asset.recallMode);
  const threshold =
    typeof asset.retrievalThreshold === "number" && Number.isFinite(asset.retrievalThreshold)
      ? `，阈值 ${asset.retrievalThreshold}`
      : "";
  return `${recallMode} · TopK ${topK}${asset.rerankEnabled ? " · 开启重排" : " · 不重排"}${threshold}`;
}

function collectBusinessAssetKnowledgeSummaries(brandId: string, brandName: string, assets: BrandAsset[]) {
  const groups = new Map<string, {
    knowledgeBaseId: string;
    knowledgeBaseName: string;
    knowledgeBaseSlug: string;
    fileCount: number;
    targetNames: Set<string>;
    retrievalSummary: string;
  }>();

  for (const asset of assets) {
    const knowledgeBaseId = asset.knowledgeBaseId || buildBusinessAssetsKnowledgeBaseId(brandId);
    const knowledgeBaseName = asset.knowledgeBaseName || buildBusinessAssetsKnowledgeBaseName(brandName);
    const knowledgeBaseSlug = asset.knowledgeBaseSlug || buildBusinessAssetsKnowledgeBaseSlug(brandId);
    const existing = groups.get(knowledgeBaseId);
    if (existing) {
      existing.fileCount += 1;
      existing.targetNames.add(formatAssetTargetName(asset));
      continue;
    }
    groups.set(knowledgeBaseId, {
      knowledgeBaseId,
      knowledgeBaseName,
      knowledgeBaseSlug,
      fileCount: 1,
      targetNames: new Set([formatAssetTargetName(asset)]),
      retrievalSummary: formatRetrievalSummary(asset),
    });
  }

  return Array.from(groups.values()).map((item) => ({
    ...item,
    targetNames: Array.from(item.targetNames),
  }));
}

function buildBusinessAssetsKnowledgeBaseId(brandId: string) {
  return `kb_brand_business_assets_${brandId}`;
}

function buildBusinessAssetsKnowledgeBaseSlug(brandId: string) {
  return `brand-business-assets-${brandId}`;
}

function buildBusinessAssetsKnowledgeBaseName(brandName: string) {
  return `${brandName || "当前品牌"}企业知识库`;
}
