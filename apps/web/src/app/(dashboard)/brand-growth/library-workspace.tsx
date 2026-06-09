"use client";

import type { BrandGrowthLibraryPageKey } from "./shared-types";
import { BRAND_SURVEY_SECTIONS } from "../../../services/brand-growth";
import type {
  BrandArchiveBundle,
  BrandAsset,
  BrandBackground,
  BrandProduct,
  BrandArchiveStatus,
} from "../../../services/brand-growth";

type LibraryAssetTarget = "industryFeeds" | "businessAssets";

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
  onAddAsset: (target: LibraryAssetTarget) => void;
  onUpdateAsset: (target: LibraryAssetTarget, index: number, key: keyof BrandAsset, value: string) => void;
  onUploadAssetFile: (target: LibraryAssetTarget, assetId: string, file?: File | null) => void | Promise<void>;
  uploadingAssetKey: string;
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
  const assetTitle = assetTarget === "industryFeeds" ? "第三方数据" : "企业经营数据";

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{assetTitle}</strong>
          <p>
            {assetTarget === "industryFeeds"
              ? "这里维护行业报告、市场资料与外部数据。"
              : "这里维护经营报表、业务系统和门店经营数据，保存页面后会自动同步到知识库。"}
          </p>
        </div>
        <button type="button" className="primary-button" onClick={() => props.onAddAsset(assetTarget)}>
          新增资料
        </button>
      </div>
      <div className="entity-list">
        {props.archive[assetTarget].map((asset, index) => (
          <div className="entity-card compact-entity-card" key={asset.id ?? `${assetTarget}-${index}`}>
            <div className="entity-card-head compact-card-head">
              <div>
                <strong>{asset.title || `资料 ${index + 1}`}</strong>
                <p className="compact-meta-line">
                  {asset.sourceName || "未填写来源"} · {asset.fileUrl || "未填写文件地址"}
                </p>
              </div>
            </div>
            <div className="form-grid two-column">
              <label className="field">
                <span>资料标题</span>
                <input
                  value={asset.title}
                  onChange={(event) => props.onUpdateAsset(assetTarget, index, "title", event.target.value)}
                />
              </label>
              <label className="field">
                <span>来源名称</span>
                <input
                  value={asset.sourceName ?? ""}
                  onChange={(event) => props.onUpdateAsset(assetTarget, index, "sourceName", event.target.value)}
                />
              </label>
              <label className="field field-full">
                <span>资料说明</span>
                <textarea
                  value={asset.description}
                  onChange={(event) => props.onUpdateAsset(assetTarget, index, "description", event.target.value)}
                />
              </label>
              <label className="field field-full">
                <span>文件地址</span>
                {assetTarget === "businessAssets" ? (
                  <div className="brand-asset-upload-grid">
                    <label className="brand-asset-upload-card product-upload-trigger">
                      <input
                        type="file"
                        className="sr-only-file-input"
                        onChange={(event) => {
                          void props.onUploadAssetFile(
                            assetTarget,
                            asset.id ?? `${assetTarget}-${index}`,
                            event.target.files?.[0] ?? null,
                          );
                          event.currentTarget.value = "";
                        }}
                      />
                      <span className="brand-asset-upload-card__title">本地文档</span>
                      <span className="brand-asset-upload-card__desc">
                        上传 PDF、Word、Excel、CSV、TXT 等文档，保存页面后自动进入企业经营数据知识库。
                      </span>
                      <span className="brand-asset-upload-card__action">
                        {props.uploadingAssetKey === `${assetTarget}:${asset.id ?? `${assetTarget}-${index}`}`
                          ? "上传中..."
                          : "点击上传"}
                      </span>
                    </label>
                    <div className="brand-asset-upload-card brand-asset-upload-card--info">
                      <span className="brand-asset-upload-card__title">知识库同步</span>
                      <span className="brand-asset-upload-card__desc">
                        当前资料保存后会自动桥接到后台知识库，方便后续统一同步、检索和治理。
                      </span>
                      <span className="brand-asset-upload-card__meta">目标板块：企业经营数据知识库</span>
                    </div>
                  </div>
                ) : null}
                <div className="asset-file-upload-row">
                  <label className="secondary-button product-upload-trigger">
                    <input
                      type="file"
                      className="sr-only-file-input"
                      onChange={(event) => {
                        void props.onUploadAssetFile(
                          assetTarget,
                          asset.id ?? `${assetTarget}-${index}`,
                          event.target.files?.[0] ?? null,
                        );
                        event.currentTarget.value = "";
                      }}
                    />
                    {props.uploadingAssetKey === `${assetTarget}:${asset.id ?? `${assetTarget}-${index}`}`
                      ? "上传中..."
                      : "上传文档"}
                  </label>
                  {asset.fileUrl ? (
                    <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="secondary-button">
                      查看文件
                    </a>
                  ) : null}
                </div>
                <input
                  value={asset.fileUrl ?? ""}
                  onChange={(event) => props.onUpdateAsset(assetTarget, index, "fileUrl", event.target.value)}
                />
                {asset.fileUrl ? (
                  <div className="brand-asset-upload-preview">
                    <strong>{extractFileName(asset.fileUrl)}</strong>
                    <span>{assetTarget === "businessAssets" ? "保存页面后自动同步到知识库。" : "当前资料已关联文件地址。"}</span>
                  </div>
                ) : null}
                <span className="field-hint">
                  支持上传 PDF、Word、Excel、PPT、CSV、TXT、ZIP 等文档，上传后会自动回填文件地址。
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function extractFileName(fileUrl: string) {
  try {
    const normalized = decodeURIComponent(fileUrl.split("?")[0] || "");
    return normalized.split("/").filter(Boolean).pop() || fileUrl;
  } catch {
    return fileUrl;
  }
}
