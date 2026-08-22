export const OPENCLAW_GEO_CONTENT_TYPES = [
  "keyword_research",
  "site_diagnosis",
  "knowledge_base_setup",
  "geo_optimization_plan",
  "self_media_content",
  "third_party_media",
  "brand_website_content",
] as const;

export type OpenClawGeoContentType = (typeof OPENCLAW_GEO_CONTENT_TYPES)[number];

export type OpenClawGeoContentGenerationMode = "single" | "multiple";

type OpenClawGeoContentCatalogItem = {
  type: OpenClawGeoContentType;
  label: string;
  summary: string;
  generationMode: OpenClawGeoContentGenerationMode;
  attachmentLabel: string;
};

const OPENCLAW_GEO_CONTENT_CATALOG: Record<OpenClawGeoContentType, OpenClawGeoContentCatalogItem> = {
  keyword_research: {
    type: "keyword_research",
    label: "关键词挖掘",
    summary: "一次性生成，支持 HTML 查看与 XLSX 存储地址回显。",
    generationMode: "single",
    attachmentLabel: "XLSX",
  },
  site_diagnosis: {
    type: "site_diagnosis",
    label: "网站诊断",
    summary: "一次性生成，支持 HTML 查看与 DOCX 存储地址回显。",
    generationMode: "single",
    attachmentLabel: "DOCX",
  },
  knowledge_base_setup: {
    type: "knowledge_base_setup",
    label: "知识库搭建",
    summary: "一次性生成，支持 HTML 查看与 Markdown 存储地址回显。",
    generationMode: "single",
    attachmentLabel: "Markdown",
  },
  geo_optimization_plan: {
    type: "geo_optimization_plan",
    label: "GEO优化方案",
    summary: "一次性生成，支持 HTML 查看与 DOCX 存储地址回显。",
    generationMode: "single",
    attachmentLabel: "DOCX",
  },
  self_media_content: {
    type: "self_media_content",
    label: "自媒体内容",
    summary: "多次生成列表，支持 HTML 查看与 DOCX 存储地址回显。",
    generationMode: "multiple",
    attachmentLabel: "DOCX",
  },
  third_party_media: {
    type: "third_party_media",
    label: "第三方媒体",
    summary: "多次生成列表，支持 HTML 查看与 DOCX 存储地址回显。",
    generationMode: "multiple",
    attachmentLabel: "DOCX",
  },
  brand_website_content: {
    type: "brand_website_content",
    label: "品牌网站",
    summary: "多次生成列表，支持 HTML 查看与 DOCX 存储地址回显。",
    generationMode: "multiple",
    attachmentLabel: "DOCX",
  },
};

export function isOpenClawGeoContentType(value: string | undefined): value is OpenClawGeoContentType {
  return OPENCLAW_GEO_CONTENT_TYPES.includes(String(value || "").trim() as OpenClawGeoContentType);
}

export function normalizeOpenClawGeoContentType(value: string | undefined): OpenClawGeoContentType {
  const normalized = String(value || "").trim() as OpenClawGeoContentType;
  if (!isOpenClawGeoContentType(normalized)) {
    throw new Error(`Unsupported OpenClaw GEO content type: ${String(value || "").trim()}`);
  }
  return normalized;
}

export function getOpenClawGeoContentCatalogItem(type: OpenClawGeoContentType) {
  return OPENCLAW_GEO_CONTENT_CATALOG[type];
}

export function getOpenClawGeoContentLabel(type: OpenClawGeoContentType) {
  return getOpenClawGeoContentCatalogItem(type).label;
}

export function getOpenClawGeoContentSummary(type: OpenClawGeoContentType) {
  return getOpenClawGeoContentCatalogItem(type).summary;
}

export function getOpenClawGeoContentGenerationMode(type: OpenClawGeoContentType) {
  return getOpenClawGeoContentCatalogItem(type).generationMode;
}

export function getOpenClawGeoContentAttachmentLabel(type: OpenClawGeoContentType) {
  return getOpenClawGeoContentCatalogItem(type).attachmentLabel;
}

export function listOpenClawGeoContentCatalog() {
  return OPENCLAW_GEO_CONTENT_TYPES.map((type) => getOpenClawGeoContentCatalogItem(type));
}
