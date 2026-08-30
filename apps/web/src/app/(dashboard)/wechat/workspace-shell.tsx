"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { DEMO_BRAND_ID, getBrandArchive, type BrandArchiveBundle, type BrandProduct } from "../../../services/brand-growth";
import {
  deleteOpenClawCreativeMaterial,
  deleteOpenClawDailyPlan,
  deleteOpenClawLobsterDiary,
  deleteOpenClawVideoWork,
  getOpenClawCreativeMaterialWorkspace,
  getOpenClawDailyPlanWorkspace,
  getOpenClawLobsterDiaryWorkspace,
  getOpenClawVideoWorkWorkspace,
  updateOpenClawLobsterDiary,
  type OpenClawCreativeMaterialWorkspace as OpenClawCreativeMaterialWorkspaceRecord,
  type OpenClawDailyPlanWorkspace as OpenClawDailyPlanWorkspaceRecord,
  type OpenClawLobsterDiaryWorkspace as OpenClawLobsterDiaryWorkspaceRecord,
  type OpenClawVideoWorkWorkspace as OpenClawVideoWorkWorkspaceRecord,
} from "../../../services/openclaw";
import {
  publishWechatArticleToOfficialAccount,
  publishWechatWorkflowToOfficialAccount,
  retryWechatWorkflowPublishToOfficialAccount,
} from "../../../services/publishing";
import {
  getXiaohongshuMarketingCalendarWorkspace,
  type XiaohongshuMarketingCalendarItem,
  type XiaohongshuMarketingCalendarWorkspace,
} from "../../../services/reports";
import {
  createWechatWorkflow,
  deleteWechatWorkflow,
  type WechatHtmlStyleConfig,
  type WechatHtmlStyleType,
  generateWechatWorkflowImages,
  generateWechatWorkflowArticle,
  generateWechatWorkflowHtml,
  getWechatAccountConfig,
  getWechatArticleDrafts,
  getWechatOfficialAccounts,
  getWechatPublishHistory,
  getWechatWorkflowPreferences,
  getWechatWorkflowSessions,
  saveWechatAccountConfig,
  saveWechatWorkflowPreferences,
  updateWechatWorkflowArticle,
  updateWechatWorkflowInput,
  updateWechatWorkflowHtmlStyle,
  updateWechatWorkflowPublishConfirm,
  type WechatAccountConfigRecord,
  type WechatArticleDraftRecord,
  type WechatBodyImageSize,
  type WechatCommentMode,
  type WechatImageMode,
  type WechatOfficialAccountRecord,
  type WechatPublishHistoryRecord,
  type WechatWorkflowInputType,
  type WechatWorkflowPreferenceRecord,
  type WechatWorkflowSessionRecord,
  type WechatWorkflowStep,
} from "../../../services/works";
import { OpenClawCreativeMaterialWorkspace } from "../brand-growth/openclaw-creative-material-workspace";
import { OpenClawDailyPlanWorkspace } from "../brand-growth/openclaw-daily-plan-workspace";
import { OpenClawLobsterDiaryWorkspace } from "../brand-growth/openclaw-lobster-diary-workspace";
import { OpenClawVideoWorkspace } from "../brand-growth/openclaw-video-workspace";

export type WechatSectionKey =
  | "setup"
  | "workflow"
  | "history"
  | "openclawCreativeMaterials"
  | "openclawDailyPlan"
  | "openclawLobsterDiary"
  | "openclawVideoWorks";

export interface WechatWorkspaceShellProps {
  embedded?: boolean;
  forcedSection?: WechatSectionKey;
}

type ThemeOption = { label: string; color: string };
const NO_PRODUCT_VALUE = "__no_product__";

const WECHAT_HTML_STYLE_OPTIONS: Array<{ value: WechatHtmlStyleType; label: string }> = [
  { value: "general", label: "通用排版" },
  { value: "minimal", label: "极简排版" },
  { value: "space", label: "空间艺术排版" },
  { value: "notice", label: "通知类排版" },
];

function createDefaultWechatHtmlStyleConfig(): WechatHtmlStyleConfig {
  return { styleType: "general" };
}
const wechatPrimarySections: Array<{ key: WechatSectionKey; label: string; description: string }> = [
  { key: "setup", label: "配置初始化", description: "完成公众号 API 凭据、默认账号和发布基础设置。" },
  { key: "workflow", label: "创作工作流", description: "围绕营销日历、品牌资料和模型配置推进完整的公众号内容生产链路。" },
  { key: "history", label: "发布历史", description: "查看已发布记录、结果状态和失败重试入口。" },
];
const wechatOpenClawSections: Array<{ key: WechatSectionKey; label: string; description: string }> = [
  { key: "openclawCreativeMaterials", label: "创作素材", description: "展示由 OpenClaw 调用站内第三方平台能力后生成并保存的文本、图片、视频、语音和 BGM 等素材。" },
  { key: "openclawDailyPlan", label: "每日计划", description: "展示由 OpenClaw Agent 创建的每日计划记录，页面只支持查看与删除。" },
  { key: "openclawLobsterDiary", label: "每周复盘", description: "展示由 OpenClaw Agent 创建的每周复盘记录，支持查看后直接编辑并在内容下留言。" },
  { key: "openclawVideoWorks", label: "作品列表", description: "展示由 OpenClaw 最终整合生成的成片与作品记录，可查看、删除并继续发布。" },
];
const wechatSections = [...wechatPrimarySections, ...wechatOpenClawSections];

function isWechatOpenClawSection(sectionKey: WechatSectionKey) {
  return sectionKey === "openclawCreativeMaterials"
    || sectionKey === "openclawDailyPlan"
    || sectionKey === "openclawLobsterDiary"
    || sectionKey === "openclawVideoWorks";
}

const themeOptions: ThemeOption[] = [
  { label: "墨绿", color: "#25554a" },
  { label: "琥珀", color: "#8f6237" },
  { label: "雾蓝", color: "#3a4e73" },
  { label: "紫灰", color: "#7d5c8e" },
  { label: "金棕", color: "#b1874d" },
];

const imageModeOptions: Array<{ value: WechatImageMode; label: string }> = [
  { value: "cover-and-body", label: "头图 + 文中配图" },
  { value: "cover-only", label: "只生成头图" },
  { value: "body-only", label: "只生成文中配图" },
];

const imageModelOptions: Array<{ value: string; label: string }> = [
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-2-vip", label: "GPT Image 2 (VIP)" },
  { value: "nano-banana-2", label: "Nano Banana 2" },
  { value: "nano-banana-pro-2k", label: "Nano Banana Pro 2K" },
  { value: "nano-banana-pro-4k", label: "Nano Banana Pro 4K" },
];

const inputTypeOptions: Array<{ value: WechatWorkflowInputType; label: string; description: string }> = [
  { value: "calendar", label: "营销日历派生", description: "从品牌增长报告下的营销日历进入内容创作。" },
  { value: "plain-text", label: "纯文本创作", description: "直接输入创作意图或素材摘要。" },
  { value: "markdown", label: "Markdown", description: "后续将走 Markdown 转公众号 HTML 链路。" },
  { value: "html", label: "HTML", description: "适合已有排版稿导入。" },
];

const commentModeOptions: Array<{ value: WechatCommentMode; label: string }> = [
  { value: "open", label: "开放评论" },
  { value: "fans", label: "仅粉丝评论" },
  { value: "close", label: "关闭评论" },
];

const workflowSteps: Array<{ key: WechatWorkflowStep; label: string; description: string }> = [
  { key: "input", label: "1. 输入", description: "选择输入来源、资料与账号。" },
  { key: "article", label: "2. 文章", description: "生成并编辑标题、摘要与正文。" },
  { key: "image", label: "3. 生图", description: "调用封面图与正文配图技能对应的第三方模型生成图片。" },
  { key: "html", label: "4. HTML", description: "使用独立 HTML 技能渲染最终公众号排版。" },
  { key: "publish", label: "5. 发布确认", description: "固定 API 模式，校验凭证、封面与 HTML。" },
  { key: "result", label: "6. 结果", description: "展示发布结果、media_id 与重试。" },
];

function buildWhitelistText(ips: string[]) {
  return ips.join("\n");
}

function parseWhitelistText(value: string) {
  return value
    .split(/[\n,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasWechatMaskedSecret(value?: string | null) {
  return Boolean(String(value || "").trim());
}

function isWechatChecklistItemReady(item: string) {
  const normalized = String(item || "").trim();
  if (!normalized) {
    return false;
  }
  return !/^(缺少|未填写|未绑定|未配置|请先)/.test(normalized);
}

function resolveMarketingCalendarTopic(item?: XiaohongshuMarketingCalendarItem | null) {
  return (
    item?.topicName
    || item?.brandMarketing?.theme
    || item?.xiaohongshu?.brandAccount?.topic
    || item?.douyin?.brandAccount?.topic
    || item?.moments?.topic
    || "未命名主题"
  ).trim();
}

function buildWorkflowTitle(calendarItem?: XiaohongshuMarketingCalendarItem, product?: BrandProduct) {
  const topic = calendarItem ? resolveMarketingCalendarTopic(calendarItem) : "公众号创作工作流";
  return product && product.id !== NO_PRODUCT_VALUE ? `${topic}：${product.productName}内容策划` : `${topic}：品牌内容策划`;
}

function buildWorkflowContent(params: {
  inputType: WechatWorkflowInputType;
  calendarItem?: XiaohongshuMarketingCalendarItem;
  product?: BrandProduct;
  injectBrandProfile: boolean;
  instruction: string;
}) {
  const { inputType, calendarItem, product, injectBrandProfile, instruction } = params;
  const inputLabel = inputTypeOptions.find((item) => item.value === inputType)?.label || inputType;
  const sections = [
    `输入来源：${inputLabel}`,
    calendarItem ? `营销日历：${calendarItem.date} · ${resolveMarketingCalendarTopic(calendarItem)}` : "营销日历：本次不强依赖营销日历，由自定义创作意图驱动。",
    product && product.id !== NO_PRODUCT_VALUE
      ? `产品资料：${product.productName}，定位 ${product.productPositioning}，适用场景 ${product.usageScenario}。`
      : "产品资料：本次不植入具体产品。",
    injectBrandProfile ? "品牌资料：需要植入品牌故事、服务承诺与品牌语气。" : "品牌资料：本次不强制植入品牌资料。",
    instruction || "请先输出适合公众号 API 发布链路的文章结构草稿。",
  ];
  return sections.join("\n\n");
}

function resolveCurrentStepIndex(step: WechatWorkflowStep) {
  const index = workflowSteps.findIndex((item) => item.key === step);
  return index === -1 ? 0 : index;
}

type WechatPreviewImageSources = {
  coverImageUrl?: string;
  bodyImageUrls: string[];
  bodyImageAspectRatio?: string;
};

function resolveWechatBodyImageAspectRatio(size?: WechatBodyImageSize) {
  switch (size) {
    case "landscape-16-9":
      return "16 / 9";
    case "square-1-1":
      return "1 / 1";
    case "portrait-4-3":
      return "3 / 4";
    default:
      return "4 / 3";
  }
}

function replaceWechatImageTag(tag: string, url: string, alt: string) {
  let nextTag = tag;
  if (/\bsrc\s*=/i.test(nextTag)) {
    nextTag = nextTag.replace(/\bsrc\s*=\s*(['"])(.*?)\1/i, `src="${url}"`);
  } else {
    nextTag = nextTag.replace(/<img\b/i, `<img src="${url}"`);
  }
  if (/\balt\s*=/i.test(nextTag)) {
    nextTag = nextTag.replace(/\balt\s*=\s*(['"])(.*?)\1/i, `alt="${alt}"`);
  } else {
    nextTag = nextTag.replace(/<img\b/i, `<img alt="${alt}"`);
  }
  return nextTag;
}

function normalizeWechatHtmlInlineStyle(attrs: string, transform: (style: string) => string) {
  const rawAttrs = String(attrs || "");
  if (/\bstyle\s*=\s*"/i.test(rawAttrs)) {
    return rawAttrs.replace(/\bstyle\s*=\s*"([^"]*)"/i, (_match, style) => ` style="${transform(style)}"`);
  }
  if (/\bstyle\s*=\s*'/i.test(rawAttrs)) {
    return rawAttrs.replace(/\bstyle\s*=\s*'([^']*)'/i, (_match, style) => ` style="${transform(style)}"`);
  }
  const trimmed = rawAttrs.trimEnd();
  return `${trimmed}${trimmed ? " " : ""}style="${transform("")}"`;
}

function normalizeWechatHtmlSpacing(htmlContent: string) {
  let normalized = String(htmlContent || "").trim();
  if (!normalized) {
    return normalized;
  }
  normalized = normalized
    .replace(/<(p|div|section|figure|figcaption)[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/\1>/gi, "")
    .replace(/\bmin-height\s*:\s*\d+px/gi, "min-height:auto");
  normalized = normalized.replace(/<figure\b([^>]*)>/gi, (_match, attrs) => {
    const nextAttrs = normalizeWechatHtmlInlineStyle(attrs, (style) => {
      const parts = String(style || "")
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !/^margin\s*:/i.test(item))
        .filter((item) => !/^margin-top\s*:/i.test(item))
        .filter((item) => !/^margin-bottom\s*:/i.test(item))
        .filter((item) => !/^min-height\s*:/i.test(item));
      if (!parts.some((item) => /^margin\s*:/i.test(item) || /^margin-top\s*:/i.test(item) || /^margin-bottom\s*:/i.test(item))) {
        parts.push("margin:14px 0");
      }
      return parts.join(";");
    });
    return `<figure${nextAttrs}>`;
  });
  normalized = normalized.replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
    const nextAttrs = normalizeWechatHtmlInlineStyle(attrs, (style) => {
      const parts = String(style || "")
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !/^margin\s*:/i.test(item))
        .filter((item) => !/^margin-top\s*:/i.test(item))
        .filter((item) => !/^margin-bottom\s*:/i.test(item))
        .filter((item) => !/^display\s*:/i.test(item))
        .filter((item) => !/^height\s*:/i.test(item));
      parts.push("display:block");
      parts.push("margin:0 auto");
      parts.push("height:auto");
      if (!parts.some((item) => /^max-width\s*:/i.test(item))) {
        parts.push("max-width:100%");
      }
      return parts.join(";");
    });
    return `<img${nextAttrs}>`;
  });
  return normalized
    .replace(/\n{3,}/g, "\n\n")
    .replace(/>\s+</g, "><")
    .trim();
}

function buildWechatGeneratedImageFigure(params: {
  url: string;
  alt: string;
  aspectRatio?: string;
}) {
  return `<figure data-wechat-generated-image="true" style="margin:14px 0;"><img src="${params.url}" alt="${params.alt}" style="display:block;width:100%;max-width:720px;height:auto;margin:0 auto;border-radius:20px;border:1px solid #e8edf7;background:#fff;box-shadow:0 10px 28px rgba(37,51,90,0.08);" /></figure>`;
}

function injectWechatCoverImageBlock(htmlContent: string, coverBlock: string) {
  if (!coverBlock) {
    return htmlContent;
  }
  if (/<\/h1>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/h1>/i, `</h1>${coverBlock}`);
  }
  if (/<main\b[^>]*>/i.test(htmlContent)) {
    return htmlContent.replace(/<main\b[^>]*>/i, (match) => `${match}${coverBlock}`);
  }
  if (/<body\b[^>]*>/i.test(htmlContent)) {
    return htmlContent.replace(/<body\b[^>]*>/i, (match) => `${match}${coverBlock}`);
  }
  return `${coverBlock}${htmlContent}`;
}

function appendWechatGeneratedImageBlocks(htmlContent: string, blocksHtml: string) {
  if (!blocksHtml) {
    return htmlContent;
  }
  if (/<\/main>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/main>/i, `${blocksHtml}</main>`);
  }
  if (/<\/body>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/body>/i, `${blocksHtml}</body>`);
  }
  return `${htmlContent}${blocksHtml}`;
}

function injectWechatBodyImageBlocks(htmlContent: string, bodyBlocks: string[]) {
  if (!bodyBlocks.length) {
    return htmlContent;
  }
  const paragraphCount = (htmlContent.match(/<\/p>/gi) || []).length;
  if (paragraphCount > 0) {
    const slots = new Map<number, string[]>();
    bodyBlocks.forEach((block, index) => {
      const slot = Math.min(
        paragraphCount,
        Math.max(1, Math.round(((index + 1) * (paragraphCount + 1)) / (bodyBlocks.length + 1))),
      );
      const items = slots.get(slot) || [];
      items.push(block);
      slots.set(slot, items);
    });

    let paragraphIndex = 0;
    return htmlContent.replace(/<\/p>/gi, (tag) => {
      paragraphIndex += 1;
      const inserts = slots.get(paragraphIndex);
      return inserts?.length ? `${tag}${inserts.join("")}` : tag;
    });
  }

  const sectionCount = (htmlContent.match(/<\/section>/gi) || []).length;
  if (sectionCount > 0) {
    const slots = new Map<number, string[]>();
    bodyBlocks.forEach((block, index) => {
      const slot = Math.min(
        sectionCount,
        Math.max(1, Math.round(((index + 1) * (sectionCount + 1)) / (bodyBlocks.length + 1))),
      );
      const items = slots.get(slot) || [];
      items.push(block);
      slots.set(slot, items);
    });

    let sectionIndex = 0;
    return htmlContent.replace(/<\/section>/gi, (tag) => {
      sectionIndex += 1;
      const inserts = slots.get(sectionIndex);
      return inserts?.length ? `${tag}${inserts.join("")}` : tag;
    });
  }

  return appendWechatGeneratedImageBlocks(htmlContent, bodyBlocks.join(""));
}

function injectWechatGeneratedImageBlocks(htmlContent: string, sources: WechatPreviewImageSources) {
  let nextHtml = String(htmlContent || "").trim();
  if (!nextHtml) {
    return nextHtml;
  }
  const bodyImageAspectRatio = sources.bodyImageAspectRatio || resolveWechatBodyImageAspectRatio();
  if (sources.coverImageUrl) {
    nextHtml = injectWechatCoverImageBlock(nextHtml, buildWechatGeneratedImageFigure({
      url: sources.coverImageUrl,
      alt: "公众号封面图",
    }));
  }
  if (sources.bodyImageUrls.length) {
    nextHtml = injectWechatBodyImageBlocks(
      nextHtml,
      sources.bodyImageUrls.map((imageUrl, index) => buildWechatGeneratedImageFigure({
        url: imageUrl,
        alt: `公众号正文配图${index + 1}`,
        aspectRatio: bodyImageAspectRatio,
      })),
    );
  }
  return nextHtml;
}

function injectWechatImagesIntoHtml(htmlContent: string, sources: WechatPreviewImageSources) {
  const normalizedHtml = String(htmlContent || "").trim();
  if (!normalizedHtml) {
    return normalizedHtml;
  }
  const imageQueue = [String(sources.coverImageUrl || "").trim(), ...sources.bodyImageUrls.map((item) => String(item || "").trim())].filter(Boolean);
  if (!imageQueue.length) {
    return normalizedHtml;
  }
  let cursor = 0;
  const replacedHtml = normalizedHtml.replace(/<img\b[^>]*>/gi, (tag) => {
    const nextUrl = imageQueue[cursor];
    if (!nextUrl) {
      return tag;
    }
    const alt = cursor === 0 ? "公众号封面图" : `公众号正文配图${cursor}`;
    cursor += 1;
    return replaceWechatImageTag(tag, nextUrl, alt);
  });
  const remaining = imageQueue.slice(cursor);
  if (!remaining.length) {
    return normalizeWechatHtmlSpacing(replacedHtml);
  }
  return normalizeWechatHtmlSpacing(injectWechatGeneratedImageBlocks(replacedHtml, {
    coverImageUrl: cursor === 0 ? imageQueue[0] : undefined,
    bodyImageUrls: cursor === 0 ? imageQueue.slice(1) : remaining,
    bodyImageAspectRatio: sources.bodyImageAspectRatio,
  }));
}

function resolveWorkflowPreviewImageSources(workflow: WechatWorkflowSessionRecord): WechatPreviewImageSources {
  return {
    coverImageUrl: workflow.imageBundle?.coverImageUrl,
    bodyImageUrls: workflow.imageBundle?.bodyImageUrls || [],
    bodyImageAspectRatio: resolveWechatBodyImageAspectRatio(workflow.bodyImageSize),
  };
}

function resolveDraftPreviewImageSources(draft: WechatArticleDraftRecord): WechatPreviewImageSources {
  const coverTask = draft.imageTasks?.find((item) => item.kind === "cover");
  const bodyTask = draft.imageTasks?.find((item) => item.kind === "body");
  return {
    coverImageUrl: coverTask?.generatedImageUrls[0],
    bodyImageUrls: bodyTask?.generatedImageUrls || [],
    bodyImageAspectRatio: resolveWechatBodyImageAspectRatio(),
  };
}

function resolveDraftPreviewCoverUrl(draft: WechatArticleDraftRecord) {
  const sources = resolveDraftPreviewImageSources(draft);
  return sources.coverImageUrl || sources.bodyImageUrls[0] || "";
}

function formatWechatHistoryTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WechatWorkspaceShell(props: WechatWorkspaceShellProps) {
  const [activeSection, setActiveSection] = useState<WechatSectionKey>(props.forcedSection || "workflow");
  const [brandId] = useState(() => getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID);
  const [archive, setArchive] = useState<BrandArchiveBundle | null>(null);
  const [calendarWorkspace, setCalendarWorkspace] = useState<XiaohongshuMarketingCalendarWorkspace>({ history: [] });
  const [config, setConfig] = useState<WechatAccountConfigRecord | null>(null);
  const [preferences, setPreferences] = useState<WechatWorkflowPreferenceRecord | null>(null);
  const [accounts, setAccounts] = useState<WechatOfficialAccountRecord[]>([]);
  const [sessions, setSessions] = useState<WechatWorkflowSessionRecord[]>([]);
  const [drafts, setDrafts] = useState<WechatArticleDraftRecord[]>([]);
  const [publishHistory, setPublishHistory] = useState<WechatPublishHistoryRecord[]>([]);
  const [openClawCreativeMaterialWorkspace, setOpenClawCreativeMaterialWorkspace] =
    useState<OpenClawCreativeMaterialWorkspaceRecord>({ items: [], total: 0 });
  const [openClawDailyPlanWorkspace, setOpenClawDailyPlanWorkspace] = useState<OpenClawDailyPlanWorkspaceRecord>({ items: [], total: 0 });
  const [openClawLobsterDiaryWorkspace, setOpenClawLobsterDiaryWorkspace] = useState<OpenClawLobsterDiaryWorkspaceRecord>({ items: [], total: 0 });
  const [openClawVideoWorkWorkspace, setOpenClawVideoWorkWorkspace] =
    useState<OpenClawVideoWorkWorkspaceRecord>({ items: [], total: 0 });
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isSavingWorkflowInput, setIsSavingWorkflowInput] = useState(false);
  const [isGeneratingWorkflowArticle, setIsGeneratingWorkflowArticle] = useState(false);
  const [isSavingWorkflowArticle, setIsSavingWorkflowArticle] = useState(false);
  const [isGeneratingWorkflowImages, setIsGeneratingWorkflowImages] = useState(false);
  const [isGeneratingWorkflowHtml, setIsGeneratingWorkflowHtml] = useState(false);
  const [isSavingHtmlStyleConfig, setIsSavingHtmlStyleConfig] = useState(false);
  const [isSavingPublishConfirm, setIsSavingPublishConfirm] = useState(false);
  const [isPublishingWorkflow, setIsPublishingWorkflow] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState("");
  const [deletingOpenClawCreativeMaterialId, setDeletingOpenClawCreativeMaterialId] = useState("");
  const [deletingOpenClawDailyPlanId, setDeletingOpenClawDailyPlanId] = useState("");
  const [deletingOpenClawDiaryId, setDeletingOpenClawDiaryId] = useState("");
  const [updatingOpenClawDiaryId, setUpdatingOpenClawDiaryId] = useState("");
  const [deletingOpenClawVideoWorkId, setDeletingOpenClawVideoWorkId] = useState("");
  const [retryingPublishHistoryId, setRetryingPublishHistoryId] = useState("");
  const [publishingDraftId, setPublishingDraftId] = useState("");
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [whitelistText, setWhitelistText] = useState("");
  const [defaultAuthor, setDefaultAuthor] = useState("品牌内容中心");
  const [defaultTheme, setDefaultTheme] = useState(themeOptions[0]?.color ?? "#25554a");
  const [defaultCommentMode, setDefaultCommentMode] = useState<WechatCommentMode>("open");
  const [defaultInputType, setDefaultInputType] = useState<WechatWorkflowInputType>("calendar");
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [fanCommentsOnly, setFanCommentsOnly] = useState(false);

  const [createInputType, setCreateInputType] = useState<WechatWorkflowInputType>("calendar");
  const [createAccountId, setCreateAccountId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createCalendarId, setCreateCalendarId] = useState("");
  const [createProductId, setCreateProductId] = useState(NO_PRODUCT_VALUE);
  const [createInjectBrandProfile, setCreateInjectBrandProfile] = useState(true);
  const [createThemeColor, setCreateThemeColor] = useState(themeOptions[0]?.color ?? "#25554a");
  const [createImageMode, setCreateImageMode] = useState<WechatImageMode>("cover-and-body");
  const [createInstruction, setCreateInstruction] = useState("");

  const [workflowInputType, setWorkflowInputType] = useState<WechatWorkflowInputType>("calendar");
  const [workflowAccountId, setWorkflowAccountId] = useState("");
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [workflowCalendarId, setWorkflowCalendarId] = useState("");
  const [workflowProductId, setWorkflowProductId] = useState(NO_PRODUCT_VALUE);
  const [workflowInjectBrandProfile, setWorkflowInjectBrandProfile] = useState(false);
  const [workflowThemeColor, setWorkflowThemeColor] = useState(themeOptions[0]?.color ?? "#25554a");
  const [workflowImageMode, setWorkflowImageMode] = useState<WechatImageMode>("cover-and-body");
  const [preferredImageModel, setPreferredImageModel] = useState("gpt-image-2");
  const [workflowInstruction, setWorkflowInstruction] = useState("");

  const [articleTitle, setArticleTitle] = useState("");
  const [articleSummary, setArticleSummary] = useState("");
  const [articleAuthor, setArticleAuthor] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articleCommentMode, setArticleCommentMode] = useState<WechatCommentMode>("open");
  const [publishCoverImageUrl, setPublishCoverImageUrl] = useState("");
  const [publishFanCommentsOnly, setPublishFanCommentsOnly] = useState(false);
  const [htmlStyleConfig, setHtmlStyleConfig] = useState<WechatHtmlStyleConfig>(createDefaultWechatHtmlStyleConfig);

  const calendarItems = useMemo(() => {
    const merged = [
      ...(calendarWorkspace.latest?.items || []),
      ...calendarWorkspace.history.flatMap((item) => item.items),
    ];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }, [calendarWorkspace]);

  const products = archive?.products || [];
  const visiblePrimarySections = useMemo(
    () => wechatSections.filter((item) => !isWechatOpenClawSection(item.key)),
    [],
  );
  const visibleOpenClawSections = useMemo(
    () => wechatSections.filter((item) => isWechatOpenClawSection(item.key)),
    [],
  );
  const currentSection = useMemo(
    () => wechatSections.find((item) => item.key === activeSection) ?? wechatSections[0],
    [activeSection],
  );
  const heroTitle =
    activeSection === "openclawCreativeMaterials" || activeSection === "openclawDailyPlan" || activeSection === "openclawLobsterDiary" || activeSection === "openclawVideoWorks"
      ? "OpenClaw板块"
      : currentSection.label;
  const heroDescription =
    activeSection === "openclawCreativeMaterials"
      ? "当前展示由 OpenClaw 在公众号板块下沉淀的创作素材，可预览内容并在素材下直接留言。"
      : activeSection === "openclawDailyPlan"
      ? "当前展示由 OpenClaw Agent 在公众号板块下创建的每日计划记录，可只读查看并手动删除。"
      : activeSection === "openclawLobsterDiary"
        ? "当前展示由 OpenClaw Agent 在公众号板块下创建的每周复盘记录，点击查看后可直接编辑并在下方留言。"
        : activeSection === "openclawVideoWorks"
          ? "当前展示由 OpenClaw 在公众号板块下汇总的作品列表，可查看作品详情、删除，并在内容下直接留言。"
        : currentSection.description;
  const selectedWorkflow = useMemo(
    () => sessions.find((item) => item.id === selectedWorkflowId) || null,
    [sessions, selectedWorkflowId],
  );
  const hasRunningWechatImageTask = useMemo(
    () => sessions.some((item) => item.imageBundle?.status === "RUNNING"),
    [sessions],
  );
  const draftWhitelistIps = useMemo(() => parseWhitelistText(whitelistText), [whitelistText]);
  const setupRequirementItems = useMemo(() => {
    const hasAppId = Boolean(String(appId || "").trim() || config?.appId);
    const hasAppSecret = Boolean(String(appSecret || "").trim()) || hasWechatMaskedSecret(config?.appSecretMasked);
    const hasWhitelist = draftWhitelistIps.length > 0 || Boolean(config?.whitelistIps?.length);
    return [
      { key: "appId", label: "AppID", ready: hasAppId },
      { key: "appSecret", label: "AppSecret", ready: hasAppSecret },
      { key: "whitelist", label: "IP 白名单", ready: hasWhitelist },
      { key: "account", label: "默认公众号账号", ready: accounts.length > 0 },
    ];
  }, [accounts.length, appId, appSecret, config?.appId, config?.appSecretMasked, config?.whitelistIps, draftWhitelistIps]);
  const missingSetupRequirementLabels = useMemo(
    () => setupRequirementItems.filter((item) => !item.ready).map((item) => item.label),
    [setupRequirementItems],
  );
  const publishChecklistItems = useMemo(
    () =>
      (selectedWorkflow?.publishConfig?.checklist || []).map((item) => ({
        label: item,
        ready: isWechatChecklistItemReady(item),
      })),
    [selectedWorkflow],
  );
  const missingPublishChecklistLabels = useMemo(
    () => publishChecklistItems.filter((item) => !item.ready).map((item) => item.label),
    [publishChecklistItems],
  );

  async function reloadPublishHistory(nextBrandId: string) {
    const response = await getWechatPublishHistory(nextBrandId);
    setPublishHistory(response.items);
    return response.items;
  }

  async function refreshOpenClawWorkspaces(options?: { showNotice?: boolean }) {
    setErrorMessage("");
    const [creativeMaterialResult, dailyPlanResult, diaryResult, videoWorkResult] = await Promise.allSettled([
      getOpenClawCreativeMaterialWorkspace(brandId, "wechat"),
      getOpenClawDailyPlanWorkspace(brandId, "wechat"),
      getOpenClawLobsterDiaryWorkspace(brandId, "wechat"),
      getOpenClawVideoWorkWorkspace(brandId, "wechat"),
    ]);
    const failedLabels: string[] = [];

    if (creativeMaterialResult.status === "fulfilled") {
      setOpenClawCreativeMaterialWorkspace(creativeMaterialResult.value);
    } else {
      failedLabels.push("创作素材");
      setOpenClawCreativeMaterialWorkspace({ items: [], total: 0 });
    }

    if (dailyPlanResult.status === "fulfilled") {
      setOpenClawDailyPlanWorkspace(dailyPlanResult.value);
    } else {
      failedLabels.push("每日计划");
      setOpenClawDailyPlanWorkspace({ items: [], total: 0 });
    }

    if (diaryResult.status === "fulfilled") {
      setOpenClawLobsterDiaryWorkspace(diaryResult.value);
    } else {
      failedLabels.push("每周复盘");
      setOpenClawLobsterDiaryWorkspace({ items: [], total: 0 });
    }

    if (videoWorkResult.status === "fulfilled") {
      setOpenClawVideoWorkWorkspace(videoWorkResult.value);
    } else {
      failedLabels.push("作品列表");
      setOpenClawVideoWorkWorkspace({ items: [], total: 0 });
    }

    if (failedLabels.length) {
      setErrorMessage(`OpenClaw 板块刷新失败：${failedLabels.join("、")}。`);
      return;
    }

    if (options?.showNotice) {
      setNotice("OpenClaw 数据已刷新。");
    }
  }

  useEffect(() => {
    if (props.forcedSection && props.forcedSection !== activeSection) {
      setActiveSection(props.forcedSection);
    }
  }, [activeSection, props.forcedSection]);

  useEffect(() => {
    let disposed = false;

    async function loadWorkspace() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [
          archiveResult,
          calendarResult,
          configResult,
          preferencesResult,
          accountsResult,
          sessionsResult,
          draftsResult,
          historyResult,
          openClawCreativeMaterialResult,
          openClawDailyPlanResult,
          openClawLobsterDiaryResult,
          openClawVideoWorkResult,
        ] =
          await Promise.allSettled([
            getBrandArchive(brandId),
            getXiaohongshuMarketingCalendarWorkspace(brandId),
            getWechatAccountConfig(brandId),
            getWechatWorkflowPreferences(brandId),
            getWechatOfficialAccounts(brandId),
            getWechatWorkflowSessions(brandId),
            getWechatArticleDrafts(brandId),
            getWechatPublishHistory(brandId),
            getOpenClawCreativeMaterialWorkspace(brandId, "wechat"),
            getOpenClawDailyPlanWorkspace(brandId, "wechat"),
            getOpenClawLobsterDiaryWorkspace(brandId, "wechat"),
            getOpenClawVideoWorkWorkspace(brandId, "wechat"),
          ]);

        if (disposed) {
          return;
        }

        if (configResult.status !== "fulfilled") {
          throw configResult.reason;
        }
        if (preferencesResult.status !== "fulfilled") {
          throw preferencesResult.reason;
        }
        if (accountsResult.status !== "fulfilled") {
          throw accountsResult.reason;
        }
        if (sessionsResult.status !== "fulfilled") {
          throw sessionsResult.reason;
        }
        if (draftsResult.status !== "fulfilled") {
          throw draftsResult.reason;
        }
        if (historyResult.status !== "fulfilled") {
          throw historyResult.reason;
        }

        setArchive(archiveResult.status === "fulfilled" ? archiveResult.value : null);
        setCalendarWorkspace(calendarResult.status === "fulfilled" ? calendarResult.value : { history: [] });
        setConfig(configResult.value.item);
        setPreferences(preferencesResult.value.item);
        setAccounts(accountsResult.value.items);
        setSessions(sessionsResult.value.items);
        setDrafts(draftsResult.value.items);
        setPublishHistory(historyResult.value.items);
        setOpenClawCreativeMaterialWorkspace(
          openClawCreativeMaterialResult.status === "fulfilled" ? openClawCreativeMaterialResult.value : { items: [], total: 0 },
        );
        setOpenClawDailyPlanWorkspace(
          openClawDailyPlanResult.status === "fulfilled" ? openClawDailyPlanResult.value : { items: [], total: 0 },
        );
        setOpenClawLobsterDiaryWorkspace(
          openClawLobsterDiaryResult.status === "fulfilled" ? openClawLobsterDiaryResult.value : { items: [], total: 0 },
        );
        setOpenClawVideoWorkWorkspace(
          openClawVideoWorkResult.status === "fulfilled" ? openClawVideoWorkResult.value : { items: [], total: 0 },
        );

        setAppId(configResult.value.item.appId || "");
        setAppSecret("");
        setWhitelistText(buildWhitelistText(configResult.value.item.whitelistIps || []));
        setDefaultAuthor(preferencesResult.value.item.defaultAuthor || "品牌内容中心");
        setDefaultTheme(preferencesResult.value.item.defaultThemeColor || themeOptions[0]?.color || "#25554a");
        setDefaultCommentMode(preferencesResult.value.item.commentMode || "open");
        setDefaultInputType(preferencesResult.value.item.defaultInputType || "calendar");
        setDefaultAccountId(
          preferencesResult.value.item.defaultAccountId || accountsResult.value.items.find((item) => item.isDefault)?.id || "",
        );
        setFanCommentsOnly(preferencesResult.value.item.fanCommentsOnly);
        setCreateInputType(preferencesResult.value.item.defaultInputType || "calendar");
        setCreateThemeColor(preferencesResult.value.item.defaultThemeColor || themeOptions[0]?.color || "#25554a");
        setCreateAccountId(
          preferencesResult.value.item.defaultAccountId || accountsResult.value.items.find((item) => item.isDefault)?.id || "",
        );
      } catch (error) {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : "公众号工作台加载失败。");
        }
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      disposed = true;
    };
  }, [brandId]);

  useEffect(() => {
    if (!hasRunningWechatImageTask) {
      return undefined;
    }
    let disposed = false;
    const refresh = async () => {
      try {
        const response = await getWechatWorkflowSessions(brandId);
        if (!disposed) {
          setSessions(response.items);
        }
      } catch {
        // Ignore polling noise and keep the current UI state.
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [brandId, hasRunningWechatImageTask]);

  useEffect(() => {
    if (!selectedWorkflowId && sessions[0]?.id) {
      setSelectedWorkflowId(sessions[0].id);
    }
  }, [sessions, selectedWorkflowId]);

  useEffect(() => {
    if (!createProductId) {
      setCreateProductId(NO_PRODUCT_VALUE);
    }
  }, [createProductId]);

  useEffect(() => {
    if (!createTitle) {
      const calendarItem = calendarItems.find((item) => item.id === createCalendarId);
      const product = products.find((item) => item.id === createProductId);
      setCreateTitle(buildWorkflowTitle(calendarItem, product));
    }
  }, [calendarItems, createCalendarId, createProductId, createTitle, products]);

  useEffect(() => {
    if (!selectedWorkflow) {
      return;
    }
    const marketingLabel = selectedWorkflow.selectedMarketingLabels[0];
    const productLabel = selectedWorkflow.selectedProductLabels[0];
    setWorkflowInputType(selectedWorkflow.inputType);
    setWorkflowAccountId(selectedWorkflow.accountId || accounts.find((item) => item.isDefault)?.id || "");
    setWorkflowTitle(selectedWorkflow.title);
    setWorkflowCalendarId(calendarItems.find((item) => item.topicName === marketingLabel)?.id || "");
    setWorkflowProductId(products.find((item) => item.productName === productLabel)?.id || NO_PRODUCT_VALUE);
    setWorkflowInjectBrandProfile(selectedWorkflow.injectBrandProfile);
    setWorkflowThemeColor(selectedWorkflow.themeColor);
    setWorkflowImageMode(selectedWorkflow.imageMode);
    setWorkflowInstruction(selectedWorkflow.inputContent || selectedWorkflow.content);
    setArticleTitle(selectedWorkflow.title);
    setArticleSummary(selectedWorkflow.summary);
    setArticleAuthor(selectedWorkflow.author);
    setArticleContent(selectedWorkflow.content);
    setArticleCommentMode(selectedWorkflow.commentMode);
    setPublishCoverImageUrl(selectedWorkflow.publishConfig?.coverImageUrl || selectedWorkflow.imageBundle?.coverImageUrl || "");
    setPublishFanCommentsOnly(selectedWorkflow.publishConfig?.fanCommentsOnly || false);
    setHtmlStyleConfig(
      selectedWorkflow.htmlStyleConfig?.styleType
        ? selectedWorkflow.htmlStyleConfig
        : createDefaultWechatHtmlStyleConfig()
    );
  }, [accounts, calendarItems, products, selectedWorkflow]);

  useEffect(() => {
    if (!previewImage) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage]);

  function openHtmlPreview(htmlContent: string) {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function openWorkflowPreview(workflow: WechatWorkflowSessionRecord) {
    openHtmlPreview(injectWechatImagesIntoHtml(workflow.htmlContent, resolveWorkflowPreviewImageSources(workflow)));
  }

  function openDraftPreview(draft: WechatArticleDraftRecord) {
    openHtmlPreview(injectWechatImagesIntoHtml(draft.htmlContent, resolveDraftPreviewImageSources(draft)));
  }

  function handleOpenPublishHistoryHtml(item: WechatPublishHistoryRecord) {
    const workflow = sessions.find((entry) => entry.id === item.workflowId);
    if (!workflow?.htmlContent) {
      setErrorMessage("当前未找到对应工作流的 HTML 记录，请先回到创作工作流中打开该作品。");
      return;
    }
    openWorkflowPreview(workflow);
  }

  function handleOpenImagePreview(url?: string, alt = "预览图片") {
    if (!url) {
      return;
    }
    setPreviewImage({ url, alt });
  }

  function upsertSession(item: WechatWorkflowSessionRecord) {
    setSessions((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
    setSelectedWorkflowId(item.id);
  }

  async function handleSaveConfig() {
    setIsSavingConfig(true);
    setErrorMessage("");
    try {
      const response = await saveWechatAccountConfig(brandId, {
        appId,
        appSecret,
        whitelistIps: parseWhitelistText(whitelistText),
        defaultAuthor,
        defaultThemeColor: defaultTheme,
        commentMode: defaultCommentMode,
      });
      const accountsResponse = await getWechatOfficialAccounts(brandId);
      setConfig(response.item);
      setAccounts(accountsResponse.items);
      setAppSecret("");
      setWhitelistText(buildWhitelistText(response.item.whitelistIps));
      setNotice("公众号 API 配置已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存公众号配置失败。");
    } finally {
      setIsSavingConfig(false);
    }
  }

  async function handleSavePreferences() {
    setIsSavingPreferences(true);
    setErrorMessage("");
    try {
      const response = await saveWechatWorkflowPreferences(brandId, {
        defaultAuthor,
        defaultThemeColor: defaultTheme,
        commentMode: defaultCommentMode,
        fanCommentsOnly,
        defaultInputType,
        defaultAccountId,
      });
      setPreferences(response.item);
      setCreateInputType(response.item.defaultInputType);
      setCreateThemeColor(response.item.defaultThemeColor);
      setCreateAccountId(response.item.defaultAccountId || "");
      setNotice("公众号工作流默认配置已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存初始化配置失败。");
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function handleCreateWorkflow() {
    setIsCreatingWorkflow(true);
    setErrorMessage("");
    const calendarItem = calendarItems.find((item) => item.id === createCalendarId);
    const product = products.find((item) => item.id === createProductId);
    try {
      const response = await createWechatWorkflow(brandId, {
        inputType: createInputType,
        accountId: createAccountId || undefined,
        title: createTitle || buildWorkflowTitle(calendarItem, product),
        content: buildWorkflowContent({
          inputType: createInputType,
          calendarItem,
          product,
          injectBrandProfile: createInjectBrandProfile,
          instruction: createInstruction,
        }),
        themeColor: createThemeColor,
        imageMode: createImageMode,
        injectBrandProfile: createInjectBrandProfile,
        selectedMarketingLabels: calendarItem ? [resolveMarketingCalendarTopic(calendarItem)] : [],
        selectedProductLabels: product && product.id !== NO_PRODUCT_VALUE ? [product.productName] : [],
        selectedBrandLabels: createInjectBrandProfile ? ["品牌资料"] : [],
      });
      upsertSession(response.item);
      setActiveSection("workflow");
      setNotice("公众号工作流已创建，请继续完善输入并进入文章阶段。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建公众号工作流失败。");
    } finally {
      setIsCreatingWorkflow(false);
    }
  }

  async function handleDeleteWorkflow(workflow: WechatWorkflowSessionRecord) {
    if (!window.confirm(`确认删除工作流「${workflow.title}」吗？`)) {
      return;
    }
    setDeletingWorkflowId(workflow.id);
    setErrorMessage("");
    try {
      await deleteWechatWorkflow(brandId, workflow.id);
      setSessions((current) => {
        const nextItems = current.filter((item) => item.id !== workflow.id);
        setSelectedWorkflowId((currentSelected) => (currentSelected === workflow.id ? (nextItems[0]?.id || "") : currentSelected));
        return nextItems;
      });
      setNotice("公众号工作流已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除公众号工作流失败。");
    } finally {
      setDeletingWorkflowId("");
    }
  }

  async function handleSaveWorkflowInput() {
    if (!selectedWorkflow) {
      return;
    }
    setIsSavingWorkflowInput(true);
    setErrorMessage("");
    const calendarItem = calendarItems.find((item) => item.id === workflowCalendarId);
    const product = products.find((item) => item.id === workflowProductId);
    try {
      const response = await updateWechatWorkflowInput(brandId, selectedWorkflow.id, {
        inputType: workflowInputType,
        accountId: workflowAccountId || undefined,
        title: workflowTitle,
        content: buildWorkflowContent({
          inputType: workflowInputType,
          calendarItem,
          product,
          injectBrandProfile: workflowInjectBrandProfile,
          instruction: workflowInstruction,
        }),
        themeColor: workflowThemeColor,
        imageMode: workflowImageMode,
        injectBrandProfile: workflowInjectBrandProfile,
        selectedMarketingLabels: calendarItem ? [resolveMarketingCalendarTopic(calendarItem)] : [],
        selectedProductLabels: product && product.id !== NO_PRODUCT_VALUE ? [product.productName] : [],
        selectedBrandLabels: workflowInjectBrandProfile ? ["品牌资料"] : [],
      });
      upsertSession(response.item);
      setNotice("输入阶段已保存，请在文章阶段执行文章 AI。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存输入阶段失败。");
    } finally {
      setIsSavingWorkflowInput(false);
    }
  }

  async function handleGenerateWorkflowArticle() {
    if (!selectedWorkflow) {
      return;
    }
    setIsGeneratingWorkflowArticle(true);
    setErrorMessage("");
    const calendarItem = calendarItems.find((item) => item.id === workflowCalendarId);
    const product = products.find((item) => item.id === workflowProductId);
    try {
      await updateWechatWorkflowInput(brandId, selectedWorkflow.id, {
        inputType: workflowInputType,
        accountId: workflowAccountId || undefined,
        title: workflowTitle,
        content: buildWorkflowContent({
          inputType: workflowInputType,
          calendarItem,
          product,
          injectBrandProfile: workflowInjectBrandProfile,
          instruction: workflowInstruction,
        }),
        themeColor: workflowThemeColor,
        imageMode: workflowImageMode,
        injectBrandProfile: workflowInjectBrandProfile,
        selectedMarketingLabels: calendarItem ? [resolveMarketingCalendarTopic(calendarItem)] : [],
        selectedProductLabels: product && product.id !== NO_PRODUCT_VALUE ? [product.productName] : [],
        selectedBrandLabels: workflowInjectBrandProfile ? ["品牌资料"] : [],
      });
      const response = await generateWechatWorkflowArticle(brandId, selectedWorkflow.id);
      upsertSession(response.item);
      setArticleTitle(response.item.title);
      setArticleSummary(response.item.summary);
      setArticleAuthor(response.item.author);
      setArticleContent(response.item.content);
      setNotice(`文章 AI 已完成，当前模型：${response.item.articleModelName || "未返回"}，请继续进入生图阶段。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "执行文章 AI 失败。");
    } finally {
      setIsGeneratingWorkflowArticle(false);
    }
  }

  async function handleSaveWorkflowArticle() {
    if (!selectedWorkflow) {
      return;
    }
    setIsSavingWorkflowArticle(true);
    setErrorMessage("");
    try {
      const response = await updateWechatWorkflowArticle(brandId, selectedWorkflow.id, {
        title: articleTitle,
        summary: articleSummary,
        author: articleAuthor,
        content: articleContent,
        commentMode: articleCommentMode,
        themeColor: workflowThemeColor,
      });
      upsertSession(response.item);
      setNotice("文章阶段已保存，可继续调用所选生图模型生成封面图与正文配图。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存文章阶段失败。");
    } finally {
      setIsSavingWorkflowArticle(false);
    }
  }

  async function handleGenerateWorkflowImages() {
    if (!selectedWorkflow) {
      return;
    }
    setIsGeneratingWorkflowImages(true);
    setErrorMessage("");
    try {
      const response = await generateWechatWorkflowImages(brandId, selectedWorkflow.id, { preferredImageModel });
      upsertSession(response.item);
      setPublishCoverImageUrl(response.item.imageBundle?.coverImageUrl || "");
      setNotice("生图任务已启动，系统会按 10 秒错峰逐张生成并自动刷新展示；单张最长 240 秒，总任务最长 20 分钟。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "生成公众号配图失败。");
    } finally {
      setIsGeneratingWorkflowImages(false);
    }
  }

  async function handleGenerateWorkflowHtml() {
    if (!selectedWorkflow) {
      return;
    }
    setIsGeneratingWorkflowHtml(true);
    setErrorMessage("");
    try {
      const response = await generateWechatWorkflowHtml(brandId, selectedWorkflow.id, {
        htmlStyleConfig,
      });
      upsertSession(response.item);
      setPublishCoverImageUrl(response.item.publishConfig?.coverImageUrl || response.item.imageBundle?.coverImageUrl || "");
      setHtmlStyleConfig(
        response.item.htmlStyleConfig?.styleType
          ? response.item.htmlStyleConfig
          : createDefaultWechatHtmlStyleConfig()
      );
      setNotice("HTML 阶段已完成，可继续进入发布确认。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "生成公众号 HTML 失败。");
    } finally {
      setIsGeneratingWorkflowHtml(false);
    }
  }

  async function handleSaveWorkflowHtmlStyle() {
    if (!brandId || !selectedWorkflow) {
      return;
    }
    setIsSavingHtmlStyleConfig(true);
    setErrorMessage("");
    try {
      const response = await updateWechatWorkflowHtmlStyle(brandId, selectedWorkflow.id, {
        htmlStyleConfig,
      });
      upsertSession(response.item);
      setHtmlStyleConfig(
        response.item.htmlStyleConfig?.styleType
          ? response.item.htmlStyleConfig
          : createDefaultWechatHtmlStyleConfig()
      );
      setNotice("HTML 排版配置已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存 HTML 排版配置失败。");
    } finally {
      setIsSavingHtmlStyleConfig(false);
    }
  }

  async function handleSavePublishConfirm() {
    if (!selectedWorkflow) {
      return;
    }
    setIsSavingPublishConfirm(true);
    setErrorMessage("");
    try {
      const response = await updateWechatWorkflowPublishConfirm(brandId, selectedWorkflow.id, {
        title: articleTitle,
        summary: articleSummary,
        author: articleAuthor,
        commentMode: articleCommentMode,
        fanCommentsOnly: publishFanCommentsOnly,
        coverImageUrl: publishCoverImageUrl,
      });
      upsertSession(response.item);
      setNotice(response.item.publishConfig?.ready ? "发布确认已完成，可以执行 API 发布。" : "发布确认未完成，请检查封面图、HTML 与 API 配置。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存发布确认失败。");
    } finally {
      setIsSavingPublishConfirm(false);
    }
  }

  async function handlePublishWorkflow() {
    if (!selectedWorkflow) {
      return;
    }
    setIsPublishingWorkflow(true);
    setErrorMessage("");
    try {
      const response = await publishWechatWorkflowToOfficialAccount(brandId, selectedWorkflow.id, { mode: "PUBLISH_WORKFLOW" });
      upsertSession(response.item);
      setDrafts((current) => [response.draft, ...current.filter((item) => item.id !== response.draft.id)]);
      await reloadPublishHistory(brandId);
      setNotice(`公众号工作流已通过 API 发布，media_id：${response.item.publishConfig?.mediaId || "已生成"}`);
      setActiveSection("history");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发布公众号工作流失败。");
    } finally {
      setIsPublishingWorkflow(false);
    }
  }

  async function handleRetryPublishHistory(historyId: string) {
    setRetryingPublishHistoryId(historyId);
    setErrorMessage("");
    try {
      const response = await retryWechatWorkflowPublishToOfficialAccount(brandId, historyId, { mode: "RETRY_PUBLISH_WORKFLOW" });
      upsertSession(response.item);
      setDrafts((current) => [response.draft, ...current.filter((item) => item.id !== response.draft.id)]);
      await reloadPublishHistory(brandId);
      setNotice(`已发起重试发布，新的 media_id：${response.item.publishConfig?.mediaId || "已生成"}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重试公众号发布失败。");
    } finally {
      setRetryingPublishHistoryId("");
    }
  }

  async function handlePublishDraft(draftId: string) {
    setPublishingDraftId(draftId);
    setErrorMessage("");
    try {
      const response = await publishWechatArticleToOfficialAccount(brandId, draftId, { mode: "PUBLISH_ARTICLE" });
      setDrafts((current) => current.map((item) => (item.id === draftId ? response.item : item)));
      setNotice("已一键发布到公众号后台。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发布到公众号后台失败。");
    } finally {
      setPublishingDraftId("");
    }
  }

  async function handleDeleteOpenClawCreativeMaterial(materialId: string) {
    setDeletingOpenClawCreativeMaterialId(materialId);
    setErrorMessage("");
    try {
      const response = await deleteOpenClawCreativeMaterial(materialId, brandId, "wechat");
      setOpenClawCreativeMaterialWorkspace(response.workspace);
      setNotice("创作素材已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除创作素材失败。");
    } finally {
      setDeletingOpenClawCreativeMaterialId("");
    }
  }

  async function handleDeleteOpenClawDailyPlan(planId: string) {
    setDeletingOpenClawDailyPlanId(planId);
    setErrorMessage("");
    try {
      const response = await deleteOpenClawDailyPlan(planId, brandId, "wechat");
      setOpenClawDailyPlanWorkspace(response.workspace);
      setNotice("每日计划已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除每日计划失败。");
    } finally {
      setDeletingOpenClawDailyPlanId("");
    }
  }

  async function handleDeleteOpenClawDiary(diaryId: string) {
    setDeletingOpenClawDiaryId(diaryId);
    setErrorMessage("");
    try {
      const response = await deleteOpenClawLobsterDiary(diaryId, brandId, "wechat");
      setOpenClawLobsterDiaryWorkspace(response.workspace);
      setNotice("每周复盘已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除每周复盘失败。");
    } finally {
      setDeletingOpenClawDiaryId("");
    }
  }

  async function handleUpdateOpenClawDiary(
    diaryId: string,
    payload: {
      diaryDate: string;
      title: string;
      content: string;
    },
  ) {
    setUpdatingOpenClawDiaryId(diaryId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await updateOpenClawLobsterDiary(diaryId, brandId, {
        workspaceScope: "wechat",
        ...payload,
      });
      setOpenClawLobsterDiaryWorkspace(response.workspace);
      setNotice("每周复盘已保存。");
      return response.item;
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存每周复盘失败。";
      setErrorMessage(message);
      throw error;
    } finally {
      setUpdatingOpenClawDiaryId("");
    }
  }

  async function handleDeleteOpenClawVideoWork(workId: string) {
    setDeletingOpenClawVideoWorkId(workId);
    setErrorMessage("");
    try {
      const response = await deleteOpenClawVideoWork(workId, brandId, "wechat");
      setOpenClawVideoWorkWorkspace(response.workspace);
      setNotice("作品已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除作品失败。");
    } finally {
      setDeletingOpenClawVideoWorkId("");
    }
  }

  return (
    <main className={`archive-shell strategy-shell ${props.embedded ? "strategy-shell--embedded" : ""}`}>
      <section className={`strategy-layout ${props.embedded ? "strategy-layout--embedded" : ""}`}>
          {props.embedded ? null : (
          <aside className="strategy-level-panel strategy-level-panel--directory">
            <div className="strategy-level-button-list">
              {visiblePrimarySections.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`strategy-level-button strategy-level-button--section ${item.key === activeSection ? "is-active" : ""}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {visibleOpenClawSections.length ? (
              <div className="strategy-directory-group">
                <div className="strategy-directory-group__title">OpenClaw板块</div>
                <div className="strategy-level-button-list strategy-level-button-list--nested">
                  {visibleOpenClawSections.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`strategy-level-button strategy-level-button--nested ${item.key === activeSection ? "is-active" : ""}`}
                      onClick={() => setActiveSection(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
          )}

          <div className="strategy-content-panel wechat-stage">
            {props.embedded ? null : (
            <article className="workspace-panel strategy-page-header">
              <div>
                <strong>{heroTitle}</strong>
                <p>{heroDescription}</p>
              </div>
              <div className="strategy-page-header-actions">
                <div className="workspace-status">
                  <span className="archive-pill status-ready">公众号工作区</span>
                  <span className={`archive-pill ${isLoading ? "status-in_progress" : "status-ready"}`}>{isLoading ? "加载中" : "已同步"}</span>
                  {hasRunningWechatImageTask ? <span className="archive-pill status-pending">生图任务运行中</span> : null}
                  {isLoading ? <span className="status-text">正在同步公众号配置、工作流和发布记录...</span> : null}
                </div>
              </div>
            </article>
            )}
            {errorMessage ? <div className="wechat-banner wechat-banner--error">{errorMessage}</div> : null}
            {notice ? <div className="wechat-banner wechat-banner--notice">{notice}</div> : null}

            {activeSection === "openclawCreativeMaterials" ? (
              <OpenClawCreativeMaterialWorkspace
                sectionLabel={currentSection.label}
                sectionDescription={currentSection.description}
                isLoading={isLoading}
                canDelete
                items={openClawCreativeMaterialWorkspace.items}
                deletingMaterialId={deletingOpenClawCreativeMaterialId}
                onRefresh={refreshOpenClawWorkspaces}
                onDelete={handleDeleteOpenClawCreativeMaterial}
                formatDateTime={formatWechatHistoryTime}
              />
            ) : null}

            {activeSection === "openclawDailyPlan" ? (
              <OpenClawDailyPlanWorkspace
                sectionLabel={currentSection.label}
                sectionDescription={currentSection.description}
                isLoading={isLoading}
                canDelete
                items={openClawDailyPlanWorkspace.items}
                deletingPlanId={deletingOpenClawDailyPlanId}
                onRefresh={refreshOpenClawWorkspaces}
                onDelete={handleDeleteOpenClawDailyPlan}
                formatDateTime={formatWechatHistoryTime}
              />
            ) : null}

            {activeSection === "openclawLobsterDiary" ? (
              <OpenClawLobsterDiaryWorkspace
                sectionLabel={currentSection.label}
                sectionDescription={currentSection.description}
                isLoading={isLoading}
                canEdit
                canDelete
                items={openClawLobsterDiaryWorkspace.items}
                deletingDiaryId={deletingOpenClawDiaryId}
                updatingDiaryId={updatingOpenClawDiaryId}
                onRefresh={refreshOpenClawWorkspaces}
                onUpdate={handleUpdateOpenClawDiary}
                onDelete={handleDeleteOpenClawDiary}
                formatDateTime={formatWechatHistoryTime}
              />
            ) : null}

            {activeSection === "openclawVideoWorks" ? (
              <OpenClawVideoWorkspace
                sectionLabel={currentSection.label}
                sectionDescription={currentSection.description}
                isLoading={isLoading}
                canDelete
                canPublish={false}
                items={openClawVideoWorkWorkspace.items}
                deletingWorkId={deletingOpenClawVideoWorkId}
                onRefresh={refreshOpenClawWorkspaces}
                onDelete={handleDeleteOpenClawVideoWork}
                onPublish={() => undefined}
                onWechatChannelPublish={() => undefined}
                formatDateTime={formatWechatHistoryTime}
              />
            ) : null}

            {activeSection === "setup" ? (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>配置初始化</strong>
                    <p className="wechat-description">先完成公众号 API 接入信息。</p>
                  </div>
                </div>

                <div className="wechat-config-grid wechat-config-grid--single">
                  <section className="light-data-panel">
                    <div className="wechat-panel-head">
                      <div>
                        <strong>公众号 API 配置</strong>
                        <p className="wechat-inline-tip">固定 API 模式，不再保留 browser 发布能力。</p>
                      </div>
                      <button type="button" className="primary-button" onClick={() => void handleSaveConfig()} disabled={isSavingConfig}>
                        {isSavingConfig ? "保存中..." : "保存 API 配置"}
                      </button>
                    </div>
                    <div className="wechat-form-grid">
                      <label className="wechat-field">
                        <span>AppID</span>
                        <input value={appId} onChange={(event) => setAppId(event.target.value)} placeholder="请输入公众号 AppID" />
                      </label>
                      <label className="wechat-field">
                        <span>AppSecret</span>
                        <input
                          type="password"
                          value={appSecret}
                          onChange={(event) => setAppSecret(event.target.value)}
                          placeholder={config?.appSecretMasked || "请输入公众号 AppSecret"}
                        />
                      </label>
                      <label className="wechat-field wechat-field--full">
                        <span>IP 白名单</span>
                        <textarea
                          value={whitelistText}
                          onChange={(event) => setWhitelistText(event.target.value)}
                          placeholder={"47.97.12.20\n47.97.12.21"}
                        />
                      </label>
                    </div>
                    <div className="wechat-setup-status-card">
                      <div className="wechat-panel-head">
                        <div>
                          <strong>当前初始化缺口</strong>
                          <p className="wechat-inline-tip">公众号正式发布走独立 `POST /wechat/config`，不会复用个人中心第三方接口配置。</p>
                        </div>
                      </div>
                      <div className="wechat-pill-row">
                        {setupRequirementItems.map((item) => (
                          <span key={item.key} className={`archive-pill ${item.ready ? "status-ready" : "status-pending"}`}>
                            {item.ready ? `已补齐 ${item.label}` : `待补 ${item.label}`}
                          </span>
                        ))}
                      </div>
                      {missingSetupRequirementLabels.length ? (
                        <div className="wechat-banner wechat-banner--warning">
                          当前还缺：{missingSetupRequirementLabels.join("、")}。保存成功后会自动登记默认公众号账号。
                        </div>
                      ) : (
                        <div className="wechat-banner wechat-banner--notice">当前配置项已齐，可以保存 API 配置并继续执行正式发布链路。</div>
                      )}
                    </div>
                  </section>
                </div>

                <section className="light-data-panel">
                  <div className="wechat-panel-head">
                    <div>
                      <strong>已登记公众号账号</strong>
                      <p className="wechat-inline-tip">当前先以默认账号为主，多账号结构已经留出接口位。</p>
                    </div>
                  </div>
                  <div className="wechat-account-grid">
                    {accounts.length ? (
                      accounts.map((item) => (
                        <article key={item.id} className="wechat-account-card">
                          <div className="wechat-pill-row">
                            <span className={`archive-pill ${item.configured ? "status-ready" : "status-pending"}`}>
                              {item.configured ? "已配置" : "待配置"}
                            </span>
                            {item.isDefault ? <span className="archive-pill status-ready">默认账号</span> : null}
                          </div>
                          <strong>{item.accountName}</strong>
                          <p>AppID：{item.appId || "未填写"}</p>
                          <p>Secret：{item.appSecretMasked || "未填写"}</p>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">当前还没有公众号账号。保存 API 配置成功后，这里会自动生成默认公众号账号。</div>
                    )}
                  </div>
                </section>
              </article>
            ) : null}

            {activeSection === "workflow" ? (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>创作工作流</strong>
                    <p className="wechat-description">输入阶段会调用技能中心已选文本模型生成文章稿，生图阶段会调用封面图与正文配图技能对应的第三方模型。</p>
                  </div>
                </div>

                <div className="wechat-workflow-layout">
                  <aside className="wechat-workflow-sidebar">
                    <section className="light-data-panel">
                      <div className="wechat-panel-head">
                        <div>
                          <strong>新建工作流</strong>
                          <p className="wechat-inline-tip">支持纯文本、Markdown、HTML 与营销日历派生输入。</p>
                        </div>
                      </div>
                      <div className="wechat-form-grid">
                        <label className="wechat-field">
                          <span>输入方式</span>
                          <select value={createInputType} onChange={(event) => setCreateInputType(event.target.value as WechatWorkflowInputType)}>
                            {inputTypeOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field">
                          <span>公众号账号</span>
                          <select value={createAccountId} onChange={(event) => setCreateAccountId(event.target.value)}>
                            <option value="">按默认账号</option>
                            {accounts.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.accountName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field wechat-field--full">
                          <span>工作流标题</span>
                          <input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="请输入工作流标题" />
                        </label>
                        <label className="wechat-field">
                          <span>营销日历</span>
                          <select value={createCalendarId} onChange={(event) => setCreateCalendarId(event.target.value)}>
                            <option value="">不使用营销日历</option>
                            {calendarItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.date} · {resolveMarketingCalendarTopic(item)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field">
                          <span>产品资料</span>
                          <select value={createProductId} onChange={(event) => setCreateProductId(event.target.value)}>
                            <option value={NO_PRODUCT_VALUE}>不植入产品</option>
                            {products.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.productName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field">
                          <span>图片策略</span>
                          <select value={createImageMode} onChange={(event) => setCreateImageMode(event.target.value as WechatImageMode)}>
                            {imageModeOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-checkbox-row">
                          <input
                            type="checkbox"
                            checked={createInjectBrandProfile}
                            onChange={(event) => setCreateInjectBrandProfile(event.target.checked)}
                          />
                          <span>植入品牌资料</span>
                        </label>
                        <label className="wechat-field wechat-field--full">
                          <span>主题颜色</span>
                          <div className="wechat-swatch-row">
                            {themeOptions.map((item) => (
                              <button
                                key={item.color}
                                type="button"
                                className={`wechat-swatch ${createThemeColor === item.color ? "is-active" : ""}`}
                                style={{ background: item.color }}
                                onClick={() => setCreateThemeColor(item.color)}
                                aria-label={item.label}
                              />
                            ))}
                          </div>
                        </label>
                        <label className="wechat-field wechat-field--full">
                          <span>创作要求 / 原始输入</span>
                          <textarea
                            value={createInstruction}
                            onChange={(event) => setCreateInstruction(event.target.value)}
                            placeholder="输入营销目标、资料摘要，或直接粘贴 Markdown / HTML 内容。"
                          />
                        </label>
                      </div>
                      <button type="button" className="primary-button" onClick={() => void handleCreateWorkflow()} disabled={isCreatingWorkflow}>
                        {isCreatingWorkflow ? "创建中..." : "创建工作流"}
                      </button>
                    </section>

                    <section className="light-data-panel">
                      <div className="wechat-panel-head">
                        <div>
                          <strong>工作流列表</strong>
                          <p className="wechat-inline-tip">{sessions.length} 个会话</p>
                        </div>
                      </div>
                      <div className="wechat-session-list">
                        {sessions.map((item) => (
                          <div key={item.id} className={`wechat-session-item ${item.id === selectedWorkflowId ? "is-active" : ""}`}>
                            <button
                              type="button"
                              className="wechat-session-select"
                              onClick={() => setSelectedWorkflowId(item.id)}
                            >
                              <strong>{item.title}</strong>
                              <span>{item.status}</span>
                              <small>{item.accountName || "未绑定账号"}</small>
                            </button>
                            <button
                              type="button"
                              className="ghost-danger-button wechat-session-delete"
                              onClick={() => void handleDeleteWorkflow(item)}
                              disabled={deletingWorkflowId === item.id}
                            >
                              {deletingWorkflowId === item.id ? "删除中..." : "删除"}
                            </button>
                          </div>
                        ))}
                        {!sessions.length ? <div className="empty-state">还没有工作流，先在上方创建一个。</div> : null}
                      </div>
                    </section>
                  </aside>

                  <div className="wechat-workflow-main">
                    {selectedWorkflow ? (
                      <>
                        <section className="light-data-panel">
                          <div className="wechat-panel-head">
                            <div>
                              <strong>{selectedWorkflow.title}</strong>
                              <p className="wechat-inline-tip">
                                当前步骤：{selectedWorkflow.currentStep} / 状态：{selectedWorkflow.status}
                              </p>
                            </div>
                            <div className="wechat-pill-row">
                              <span className="archive-pill status-ready">{selectedWorkflow.inputType}</span>
                              <span className="archive-pill status-ready">{selectedWorkflow.accountName || "未绑定账号"}</span>
                            </div>
                          </div>
                          <div className="wechat-step-grid">
                            {workflowSteps.map((item, index) => {
                              const currentIndex = resolveCurrentStepIndex(selectedWorkflow.currentStep);
                              const state =
                                index < currentIndex ? "is-done" : index === currentIndex ? "is-current" : "is-upcoming";
                              return (
                                <div key={item.key} className={`wechat-step-card ${state}`}>
                                  <strong>{item.label}</strong>
                                  <p>{item.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        <section className="light-data-panel">
                          <div className="wechat-panel-head">
                            <div>
                              <strong>Step 1. 输入阶段</strong>
                              <p className="wechat-inline-tip">保存后会把工作流推进到文章编辑阶段。</p>
                            </div>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => void handleSaveWorkflowInput()}
                              disabled={isSavingWorkflowInput}
                            >
                              {isSavingWorkflowInput ? "保存中..." : "保存输入并进入文章阶段"}
                            </button>
                          </div>
                          <div className="wechat-form-grid">
                            <label className="wechat-field">
                              <span>输入方式</span>
                              <select value={workflowInputType} onChange={(event) => setWorkflowInputType(event.target.value as WechatWorkflowInputType)}>
                                {inputTypeOptions.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field">
                              <span>公众号账号</span>
                              <select value={workflowAccountId} onChange={(event) => setWorkflowAccountId(event.target.value)}>
                                <option value="">按默认账号</option>
                                {accounts.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.accountName}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>工作流标题</span>
                              <input value={workflowTitle} onChange={(event) => setWorkflowTitle(event.target.value)} placeholder="请输入工作流标题" />
                            </label>
                            <label className="wechat-field">
                              <span>营销日历</span>
                              <select value={workflowCalendarId} onChange={(event) => setWorkflowCalendarId(event.target.value)}>
                                <option value="">不使用营销日历</option>
                                {calendarItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.date} · {resolveMarketingCalendarTopic(item)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field">
                              <span>产品资料</span>
                              <select value={workflowProductId} onChange={(event) => setWorkflowProductId(event.target.value)}>
                                <option value={NO_PRODUCT_VALUE}>不植入产品</option>
                                {products.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.productName}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field">
                              <span>图片策略</span>
                              <select value={workflowImageMode} onChange={(event) => setWorkflowImageMode(event.target.value as WechatImageMode)}>
                                {imageModeOptions.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field">
                              <span>生图模型</span>
                              <select value={preferredImageModel} onChange={(event) => setPreferredImageModel(event.target.value)}>
                                {imageModelOptions.map((item) => (
                                  <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-checkbox-row">
                              <input
                                type="checkbox"
                                checked={workflowInjectBrandProfile}
                                onChange={(event) => setWorkflowInjectBrandProfile(event.target.checked)}
                              />
                              <span>植入品牌资料</span>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>主题颜色</span>
                              <div className="wechat-swatch-row">
                                {themeOptions.map((item) => (
                                  <button
                                    key={item.color}
                                    type="button"
                                    className={`wechat-swatch ${workflowThemeColor === item.color ? "is-active" : ""}`}
                                    style={{ background: item.color }}
                                    onClick={() => setWorkflowThemeColor(item.color)}
                                    aria-label={item.label}
                                  />
                                ))}
                              </div>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>创作要求 / 输入内容</span>
                              <textarea value={workflowInstruction} onChange={(event) => setWorkflowInstruction(event.target.value)} />
                            </label>
                          </div>
                        </section>

                        <section className="light-data-panel">
                          <div className="wechat-panel-head">
                            <div>
                              <strong>Step 2. 文章阶段</strong>
                              <p className="wechat-inline-tip">先执行文章 AI 生成标题、摘要、作者、正文和图片 brief，确认后再保存进入生图阶段。</p>
                            </div>
                            <div className="strategy-inline-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => void handleGenerateWorkflowArticle()}
                                disabled={isGeneratingWorkflowArticle}
                              >
                                {isGeneratingWorkflowArticle ? "执行中..." : "执行文章AI"}
                              </button>
                              <button
                                type="button"
                                className="primary-button"
                                onClick={() => void handleSaveWorkflowArticle()}
                                disabled={isSavingWorkflowArticle}
                              >
                                {isSavingWorkflowArticle ? "保存中..." : "保存文章并进入生图阶段"}
                              </button>
                            </div>
                          </div>
                          <div className="wechat-form-grid">
                            {selectedWorkflow.articleModelName ? (
                              <div className="wechat-pill-row" style={{ marginBottom: 8 }}>
                                <span className="archive-pill status-ready">文本模型：{selectedWorkflow.articleModelName}</span>
                                <span className="archive-pill status-ready">Provider：{selectedWorkflow.articleProvider || selectedWorkflow.articleRuntimeKey || "未知"}</span>
                                {selectedWorkflow.bodyImageBriefs?.length ? (
                                  <span className="archive-pill status-ready">正文配图 briefs：{selectedWorkflow.bodyImageBriefs.length} 条</span>
                                ) : null}
                              </div>
                            ) : null}
                            <label className="wechat-field wechat-field--full">
                              <span>文章标题</span>
                              <input value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} />
                            </label>
                            <label className="wechat-field">
                              <span>作者</span>
                              <input value={articleAuthor} onChange={(event) => setArticleAuthor(event.target.value)} />
                            </label>
                            <label className="wechat-field">
                              <span>评论策略</span>
                              <select value={articleCommentMode} onChange={(event) => setArticleCommentMode(event.target.value as WechatCommentMode)}>
                                {commentModeOptions.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>摘要</span>
                              <textarea value={articleSummary} onChange={(event) => setArticleSummary(event.target.value)} />
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>正文</span>
                              <textarea value={articleContent} onChange={(event) => setArticleContent(event.target.value)} />
                            </label>
                            <div className="wechat-inline-tip">
                              这里展示的是便于编辑的正文纯文本；最终排版 HTML 会在后续独立 HTML 阶段生成。
                            </div>
                          </div>
                        </section>

                        <section className="wechat-placeholder-grid wechat-stage-grid">
                          <article className="light-data-panel wechat-stage-card wechat-stage-card--image">
                            <div className="wechat-stage-shell">
                              <div className="wechat-stage-hero">
                                <div className="wechat-stage-copy">
                                  <span className="wechat-stage-kicker">Step 3</span>
                                  <strong>生成封面图与正文配图</strong>
                                  <p className="wechat-inline-tip">优先生成真实图片素材，封面图负责第一眼吸引，正文配图负责章节节奏和信息分层。</p>
                                </div>
                                <div className="wechat-stage-toolbar">
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() => void handleGenerateWorkflowImages()}
                                    disabled={isGeneratingWorkflowImages || selectedWorkflow.imageBundle?.status === "RUNNING"}
                                  >
                                    {isGeneratingWorkflowImages || selectedWorkflow.imageBundle?.status === "RUNNING" ? "生图中..." : "生成封面图与正文配图"}
                                  </button>
                                </div>
                              </div>
                              {selectedWorkflow.imageBundle ? (
                                <div className="wechat-image-stage">
                                  <div className="wechat-stage-meta-card">
                                    <div className="wechat-pill-row">
                                      <span className="archive-pill status-ready">状态：{selectedWorkflow.imageBundle.status}</span>
                                      {typeof selectedWorkflow.imageBundle.generatedCount === "number" && typeof selectedWorkflow.imageBundle.totalCount === "number" ? (
                                        <span className="archive-pill status-ready">
                                          进度：{selectedWorkflow.imageBundle.generatedCount}/{selectedWorkflow.imageBundle.totalCount}
                                        </span>
                                      ) : null}
                                      <span className="archive-pill status-ready">
                                        {selectedWorkflow.imageBundle.bodyImageUrls.length ? `正文配图 ${selectedWorkflow.imageBundle.bodyImageUrls.length} 张` : "仅封面图"}
                                      </span>
                                      {selectedWorkflow.imageBundle.coverModelName ? (
                                        <span className="archive-pill status-ready">封面模型：{selectedWorkflow.imageBundle.coverModelName}</span>
                                      ) : null}
                                      {selectedWorkflow.imageBundle.bodyModelName ? (
                                        <span className="archive-pill status-ready">正文模型：{selectedWorkflow.imageBundle.bodyModelName}</span>
                                      ) : null}
                                    </div>
                                    <p className="wechat-inline-tip">{selectedWorkflow.imageBundle.promptSummary}</p>
                                    {selectedWorkflow.imageBundle.status === "RUNNING" ? (
                                      <div className="wechat-inline-tip">
                                        当前按 10 秒错峰逐张生成；每张最长 240 秒，系统会自动刷新，生成一张就显示一张。
                                      </div>
                                    ) : null}
                                  </div>
                                  {selectedWorkflow.imageBundle.errorDetail ? (
                                    <div className="wechat-banner wechat-banner--warning">{selectedWorkflow.imageBundle.errorDetail}</div>
                                  ) : null}
                                  {selectedWorkflow.imageBundle.coverImageUrl ? (
                                    <button
                                      type="button"
                                      className="wechat-image-preview-trigger"
                                      onClick={() => handleOpenImagePreview(selectedWorkflow.imageBundle?.coverImageUrl, "公众号封面图预览")}
                                    >
                                      <img src={selectedWorkflow.imageBundle.coverImageUrl} alt="公众号封面图" className="wechat-generated-cover" />
                                    </button>
                                  ) : null}
                                  {selectedWorkflow.imageBundle.bodyImageUrls.length ? (
                                    <div className="wechat-generated-gallery">
                                      {selectedWorkflow.imageBundle.bodyImageUrls.map((imageUrl, index) => (
                                        <button
                                          key={imageUrl}
                                          type="button"
                                          className="wechat-image-preview-trigger"
                                          onClick={() => handleOpenImagePreview(imageUrl, `公众号正文配图 ${index + 1} 预览`)}
                                        >
                                          <img src={imageUrl} alt={`公众号正文配图 ${index + 1}`} className="wechat-generated-thumb" />
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="empty-state">当前图片策略未生成正文配图。</div>
                                  )}
                                </div>
                              ) : (
                                <div className="wechat-stage-empty">
                                  先完成文章阶段，再为当前工作流生成封面图与正文配图。
                                </div>
                              )}
                            </div>
                          </article>
                          <article className="light-data-panel wechat-stage-card wechat-stage-card--html">
                            <div className="wechat-stage-shell">
                              <div className="wechat-stage-hero wechat-stage-hero--html">
                                <div className="wechat-stage-copy">
                                  <span className="wechat-stage-kicker">Step 4</span>
                                  <strong>生成最终公众号 HTML</strong>
                                  <p className="wechat-inline-tip">选择文章排版风格后，系统会调用对应的通用排版、极简排版、空间艺术排版或通知类排版技能，生成可直接发布的公众号 HTML。</p>
                                </div>
                                <div className="wechat-stage-toolbar">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => void handleSaveWorkflowHtmlStyle()}
                                    disabled={isSavingHtmlStyleConfig}
                                  >
                                    {isSavingHtmlStyleConfig ? "保存中..." : "保存排版配置"}
                                  </button>
                                  {selectedWorkflow.htmlContent ? (
                                    <button type="button" className="secondary-button" onClick={() => openWorkflowPreview(selectedWorkflow)}>
                                      预览 HTML
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() => void handleGenerateWorkflowHtml()}
                                    disabled={isGeneratingWorkflowHtml}
                                  >
                                    {isGeneratingWorkflowHtml ? "生成中..." : "生成 HTML"}
                                  </button>
                                </div>
                              </div>
                              <div className="wechat-html-console">
                                <div className="wechat-html-section">
                                  <div className="wechat-html-section__head">
                                    <strong>选择文章排版风格</strong>
                                    <p>选择排版风格后点击"生成 HTML"，将调用相应的排版技能。</p>
                                  </div>
                                  <label className="field" style={{ maxWidth: 300 }}>
                                    <span>排版风格</span>
                                    <select
                                      value={htmlStyleConfig.styleType}
                                      onChange={(event) => setHtmlStyleConfig({ styleType: event.target.value as WechatHtmlStyleType })}
                                    >
                                      {WECHAT_HTML_STYLE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </article>
                          <article className="light-data-panel">
                            <div className="wechat-panel-head">
                              <div>
                                <strong>Step 5. API 发布确认</strong>
                                <p className="wechat-inline-tip">固定 API-only，这里会校验 AppID、AppSecret、白名单、封面图和最终 HTML，并执行工作流发布。</p>
                              </div>
                              <div className="strategy-inline-actions">
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleSavePublishConfirm()}
                                  disabled={isSavingPublishConfirm}
                                >
                                  {isSavingPublishConfirm ? "确认中..." : "保存发布确认"}
                                </button>
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={() => void handlePublishWorkflow()}
                                  disabled={isPublishingWorkflow || !selectedWorkflow.publishConfig?.ready}
                                >
                                  {isPublishingWorkflow ? "发布中..." : "执行 API 发布"}
                                </button>
                              </div>
                            </div>
                            <div className="wechat-form-grid">
                              <label className="wechat-field wechat-field--full">
                                <span>封面图 URL</span>
                                <input value={publishCoverImageUrl} onChange={(event) => setPublishCoverImageUrl(event.target.value)} />
                              </label>
                              <label className="wechat-field">
                                <span>评论策略</span>
                                <select value={articleCommentMode} onChange={(event) => setArticleCommentMode(event.target.value as WechatCommentMode)}>
                                  {commentModeOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="wechat-checkbox-row">
                                <input
                                  type="checkbox"
                                  checked={publishFanCommentsOnly}
                                  onChange={(event) => setPublishFanCommentsOnly(event.target.checked)}
                                />
                                <span>仅粉丝评论</span>
                              </label>
                            </div>
                            {selectedWorkflow.publishConfig ? (
                              <div className="wechat-publish-summary">
                                <div className="wechat-pill-row">
                                  <span className={`archive-pill ${selectedWorkflow.publishConfig.ready ? "status-ready" : "status-pending"}`}>
                                    {selectedWorkflow.publishConfig.ready ? "可发布" : "待补齐"}
                                  </span>
                                  {selectedWorkflow.publishConfig.mediaId ? (
                                    <span className="archive-pill status-ready">media_id：{selectedWorkflow.publishConfig.mediaId}</span>
                                  ) : null}
                                </div>
                                {missingPublishChecklistLabels.length ? (
                                  <div className="wechat-banner wechat-banner--warning">
                                    当前仍缺：{missingPublishChecklistLabels.join("、")}。先回到“配置初始化”补齐凭据，再重新保存发布确认。
                                  </div>
                                ) : (
                                  <div className="wechat-banner wechat-banner--notice">发布校验已通过，可以直接执行 API 发布。</div>
                                )}
                                <div className="wechat-checklist">
                                  {publishChecklistItems.map((item) => (
                                    <span key={item.label} className={`archive-pill ${item.ready ? "status-ready" : "status-pending"}`}>
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="empty-state">先完成 HTML 阶段，再保存发布确认。</div>
                            )}
                          </article>
                        </section>
                        {selectedWorkflow.status === "PUBLISHED" ? (
                          <section className="light-data-panel">
                            <div className="wechat-panel-head">
                              <div>
                                <strong>Step 6. 发布结果</strong>
                                <p className="wechat-inline-tip">当前工作流已经发布完成，可在历史记录中继续查看对应草稿。</p>
                              </div>
                            </div>
                            <div className="wechat-publish-summary">
                              <div className="wechat-pill-row">
                                <span className="archive-pill status-ready">已发布</span>
                                {selectedWorkflow.publishConfig?.mediaId ? (
                                  <span className="archive-pill status-ready">media_id：{selectedWorkflow.publishConfig.mediaId}</span>
                                ) : null}
                              </div>
                              <p className="wechat-inline-tip">
                                发布时间：{selectedWorkflow.publishConfig?.publishedAt || "刚刚"}，绑定草稿：{selectedWorkflow.linkedDraftId || "未生成"}
                              </p>
                            </div>
                          </section>
                        ) : null}
                      </>
                    ) : (
                      <div className="empty-state">先在左侧创建一个公众号工作流。</div>
                    )}
                  </div>
                </div>
              </article>
            ) : null}

            {activeSection === "history" ? (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>发布历史</strong>
                    <p className="wechat-description">当前仅保留工作流发布记录，支持直接查看工作流 HTML 和重试发布。</p>
                  </div>
                </div>
                {isLoading ? (
                  <div className="empty-state">历史记录加载中...</div>
                ) : !publishHistory.length ? (
                  <div className="empty-state">当前还没有工作流发布记录。</div>
                ) : (
                  <div className="wechat-history-stack">
                    <section className="light-data-panel">
                      <div className="wechat-panel-head">
                        <div>
                          <strong>工作流发布记录</strong>
                          <p className="wechat-inline-tip">{publishHistory.length} 条记录，改为卡片式浏览，风格对齐小红书原创笔记作品区。</p>
                        </div>
                      </div>
                      {publishHistory.length ? (
                        <div className="wechat-history-card-grid">
                          {publishHistory.map((item) => (
                            <article key={item.id} className="wechat-history-work-card">
                              <button
                                type="button"
                                className="wechat-history-work-card-stage"
                                onClick={() => {
                                  if (item.coverImageUrl) {
                                    handleOpenImagePreview(item.coverImageUrl, `${item.workflowTitle} 封面图预览`);
                                  }
                                }}
                              >
                                {item.coverImageUrl ? (
                                  <img src={item.coverImageUrl} alt={item.workflowTitle} className="wechat-generated-cover" />
                                ) : (
                                  <span className="wechat-history-work-card-empty">暂无封面</span>
                                )}
                                <span className="wechat-history-work-card-badge wechat-history-work-card-badge--left">公众号</span>
                                <span
                                  className={`wechat-history-work-card-badge ${
                                    item.status === "SUCCESS" ? "wechat-history-work-card-badge--success" : "wechat-history-work-card-badge--failed"
                                  }`}
                                >
                                  {item.status === "SUCCESS" ? "已发布" : "发布失败"}
                                </span>
                              </button>
                              <div className="wechat-history-work-card-body">
                                <div className="wechat-pill-row">
                                  {item.mediaId ? <span className="archive-pill status-ready">media_id 已回写</span> : null}
                                  <span className="archive-pill status-ready">重试 {item.retryCount} 次</span>
                                </div>
                                <strong>{item.workflowTitle}</strong>
                                <p>{item.summary}</p>
                                <p>{formatWechatHistoryTime(item.updatedAt)}</p>
                                <div className="wechat-card-actions">
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() => handleOpenPublishHistoryHtml(item)}
                                  >
                                    查看 HTML
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => void handleRetryPublishHistory(item.id)}
                                    disabled={retryingPublishHistoryId === item.id}
                                  >
                                    {retryingPublishHistoryId === item.id ? "重试中..." : "重试发布"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">当前还没有工作流发布记录。</div>
                      )}
                    </section>
                  </div>
                )}
              </article>
            ) : null}
          </div>
      </section>

      {previewImage ? (
        <div className="wechat-image-preview-overlay" role="dialog" aria-modal="true" onClick={() => setPreviewImage(null)}>
          <div className="wechat-image-preview-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="wechat-image-preview-close" onClick={() => setPreviewImage(null)}>
              关闭
            </button>
            <img src={previewImage.url} alt={previewImage.alt} className="wechat-image-preview-full" />
            <p className="wechat-inline-tip">{previewImage.alt}</p>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .wechat-description,
        .wechat-inline-tip {
          margin: 6px 0 0;
          color: var(--site-hero-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .wechat-stage,
        .wechat-workflow-main,
        .wechat-session-list {
          display: grid;
          gap: 14px;
        }

        .wechat-banner {
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          border: 1px solid var(--site-hero-border);
          background: var(--subtle-surface);
        }

        .wechat-banner--error {
          background: rgba(172, 60, 60, 0.16);
          color: #ffc7c2;
        }

        .wechat-banner--notice {
          background: rgba(45, 125, 78, 0.18);
          color: #baf2cb;
        }

        .wechat-banner--warning {
          background: rgba(190, 136, 54, 0.16);
          color: #ffe2a3;
        }

        .wechat-config-grid,
        .wechat-form-grid,
        .wechat-account-grid,
        .wechat-history-grid,
        .wechat-placeholder-grid,
        .wechat-session-result-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .wechat-stage-grid {
          grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
          align-items: start;
        }

        .wechat-workflow-layout {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 18px;
        }

        .wechat-config-grid--single {
          grid-template-columns: minmax(0, 1fr);
        }

        .wechat-history-shell {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 18px;
        }

        .wechat-history-stack {
          display: grid;
          gap: 18px;
        }

        .wechat-history-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .wechat-workflow-sidebar {
          display: grid;
          align-content: start;
          gap: 14px;
        }

        .wechat-history-sidebar,
        .wechat-history-main {
          display: grid;
          align-content: start;
          gap: 14px;
        }

        .wechat-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .wechat-panel-head strong,
        .wechat-account-card strong,
        .wechat-session-select strong,
        .wechat-history-body strong,
        .wechat-step-card strong {
          display: block;
          color: var(--site-hero-text);
        }

        .wechat-stage-card {
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid var(--site-hero-border);
          background:
            radial-gradient(circle at top right, rgba(109, 129, 255, 0.1), transparent 38%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
            var(--card-surface);
          box-shadow: var(--site-shadow-lg);
        }

        .wechat-stage-card--html {
          background:
            radial-gradient(circle at top right, rgba(88, 114, 255, 0.18), transparent 34%),
            radial-gradient(circle at bottom left, rgba(110, 208, 189, 0.14), transparent 26%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
            var(--card-surface-strong);
        }

        .wechat-stage-shell {
          display: grid;
          gap: 18px;
        }

        .wechat-stage-hero {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          padding: 24px 24px 0;
        }

        .wechat-stage-hero--html {
          padding-bottom: 6px;
          border-bottom: 1px solid var(--site-hero-border);
        }

        .wechat-stage-copy {
          display: grid;
          gap: 8px;
          max-width: 52ch;
        }

        .wechat-stage-copy strong {
          font-size: 28px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: var(--site-hero-text);
        }

        .wechat-stage-kicker {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(97, 123, 255, 0.14);
          color: var(--site-hero-muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .wechat-stage-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
          max-width: 320px;
        }

        .wechat-stage-meta-card,
        .wechat-stage-empty {
          padding: 16px 18px;
          border-radius: 20px;
          border: 1px solid var(--site-hero-border);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
            var(--site-hero-surface);
          color: var(--site-hero-muted);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .wechat-html-console {
          display: grid;
          gap: 16px;
          padding: 0 24px 24px;
          align-items: start;
        }

        .wechat-html-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
        }

        .wechat-html-workbench {
          display: grid;
          gap: 14px;
        }

        .wechat-html-section {
          display: grid;
          gap: 14px;
          min-width: 0;
          padding: 18px;
          border-radius: 24px;
          border: 1px solid var(--site-hero-border);
          background: var(--site-hero-surface);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            var(--site-shadow-md);
        }

        .wechat-html-section--controls {
          gap: 16px;
        }

        .wechat-html-section-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .wechat-html-section-head strong,
        .wechat-summary-head strong {
          display: block;
          color: var(--site-hero-text);
          font-size: 18px;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .wechat-summary-head {
          display: grid;
          gap: 8px;
        }

        .wechat-control-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .wechat-control-cluster {
          display: grid;
          gap: 14px;
          padding: 16px;
          border-radius: 22px;
          border: 1px solid var(--site-hero-border);
          background: var(--subtle-surface);
          min-width: 0;
        }

        .wechat-control-cluster--wide {
          grid-column: 1 / -1;
        }

        .wechat-field {
          display: grid;
          gap: 8px;
          color: var(--site-hero-muted);
          font-size: 13px;
        }

        .wechat-field--full {
          grid-column: 1 / -1;
        }

        .wechat-field input,
        .wechat-field select,
        .wechat-field textarea {
          width: 100%;
          border: 1px solid var(--site-hero-border);
          border-radius: 14px;
          padding: 12px 14px;
          background: var(--subtle-surface);
          color: var(--site-hero-text);
          font: inherit;
        }

        .wechat-field textarea {
          min-height: 138px;
          resize: vertical;
          line-height: 1.7;
        }

        .wechat-checkbox-row {
          display: flex;
          gap: 10px;
          align-items: center;
          color: var(--site-hero-muted);
          font-size: 13px;
        }

        .wechat-swatch-row,
        .wechat-pill-row,
        .wechat-choice-row,
        .wechat-card-actions,
        .wechat-meta-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .wechat-style-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 12px;
        }

        .wechat-style-grid--preset {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .wechat-style-chip {
          display: grid;
          gap: 8px;
          min-height: 142px;
          padding: 16px;
          text-align: left;
          border-radius: 22px;
          border: 1px solid var(--site-hero-border);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
          color: var(--site-hero-text);
          cursor: pointer;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, filter 180ms ease;
          min-width: 0;
        }

        .wechat-style-chip strong {
          font-size: 14px;
          color: var(--site-hero-text);
        }

        .wechat-style-chip span {
          color: var(--site-hero-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .wechat-style-chip-preview {
          display: block;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
            linear-gradient(120deg, rgba(92, 115, 196, 0.86), rgba(162, 174, 216, 0.52) 55%, rgba(123, 201, 255, 0.72));
        }

        .wechat-style-chip:hover {
          transform: translateY(-2px);
          border-color: rgba(97, 123, 255, 0.42);
          box-shadow: 0 16px 30px rgba(17, 28, 55, 0.24);
        }

        .wechat-style-chip.is-active {
          border-color: rgba(97, 123, 255, 0.52);
          box-shadow: 0 20px 40px rgba(69, 96, 206, 0.14);
          background:
            radial-gradient(circle at top right, rgba(101, 140, 255, 0.2), transparent 42%),
            linear-gradient(180deg, rgba(33, 44, 79, 0.98), rgba(43, 56, 99, 0.95));
        }

        .wechat-style-chip.is-active strong,
        .wechat-style-chip.is-active span {
          color: #f5f7ff;
        }

        .wechat-style-chip[data-tone='magazine'] .wechat-style-chip-preview {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.14)),
            linear-gradient(120deg, #6d72ff, #df74da 54%, #7ba7ff);
        }

        .wechat-style-chip[data-tone='newspaper'] .wechat-style-chip-preview {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.14)),
            linear-gradient(120deg, #f0f2f7, #d9dfeb 52%, #c3cad9);
        }

        .wechat-style-chip[data-tone='tech'] .wechat-style-chip-preview {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.12)),
            linear-gradient(120deg, #223b83, #4e8ff4 48%, #7ce0ff);
        }

        .wechat-style-chip[data-tone='ink'] .wechat-style-chip-preview {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.08)),
            linear-gradient(120deg, #16203b, #405274 50%, #bcc5d3);
        }

        .wechat-style-chip[data-tone='notion'] .wechat-style-chip-preview {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.14)),
            linear-gradient(120deg, #f4f5f7, #e7eaef 54%, #d7dee9);
        }

        .wechat-style-chip[data-tone='minimal'] .wechat-style-chip-preview {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.14)),
            linear-gradient(120deg, #f8fafc, #edf2f7 52%, #dfe7f2);
        }

        .wechat-summary-card {
          display: grid;
          gap: 12px;
          padding: 18px 20px;
          border-radius: 24px;
          border: 1px solid var(--site-hero-border);
          background: var(--site-hero-surface);
          min-width: 0;
        }

        .wechat-summary-card strong {
          font-size: 20px;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--site-hero-text);
        }

        .wechat-summary-card--accent {
          background:
            radial-gradient(circle at top right, rgba(109, 129, 255, 0.2), transparent 34%),
            linear-gradient(180deg, rgba(39, 51, 84, 0.82), rgba(20, 29, 48, 0.92));
          box-shadow: 0 20px 36px rgba(7, 15, 31, 0.34);
        }

        .wechat-swatch {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 10px 18px rgba(6, 11, 21, 0.2);
          cursor: pointer;
        }

        .wechat-swatch.is-active {
          outline: 2px solid rgba(53, 86, 232, 0.28);
        }

        .wechat-image-stage,
        .wechat-publish-summary,
        .wechat-checklist,
        .wechat-setup-status-card,
        .wechat-history-detail-grid {
          display: grid;
          gap: 12px;
        }

        .wechat-generated-cover,
        .wechat-generated-thumb {
          width: 100%;
          border-radius: 18px;
          border: 1px solid rgba(125, 138, 170, 0.18);
          background: var(--card-surface);
          object-fit: cover;
        }

        .wechat-generated-cover {
          aspect-ratio: 16 / 9;
          box-shadow: 0 22px 40px rgba(15, 23, 42, 0.12);
        }

        .wechat-choice-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 10px;
        }

        .wechat-choice-grid--compact {
          grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
        }

        .wechat-choice-row .tab-button,
        .wechat-choice-grid .tab-button {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid var(--site-hero-border);
          background: var(--subtle-surface);
          color: var(--site-hero-text);
          box-shadow: none;
          white-space: nowrap;
          width: 100%;
          justify-content: center;
        }

        .wechat-choice-row .tab-button.is-active,
        .wechat-choice-grid .tab-button.is-active {
          border-color: rgba(97, 123, 255, 0.42);
          background: var(--tab-active-bg);
          color: var(--tab-active-text);
          box-shadow: var(--tab-active-shadow);
        }

        .wechat-history-work-card {
          overflow: hidden;
          border: 1px solid var(--site-hero-border);
          border-radius: 22px;
          background: var(--card-surface);
          box-shadow: var(--card-shadow);
        }

        .wechat-history-work-card.is-active {
          border-color: rgba(87, 119, 255, 0.38);
          box-shadow: 0 18px 36px rgba(87, 119, 255, 0.12);
        }

        .wechat-history-work-card-stage {
          position: relative;
          display: block;
          width: 100%;
          padding: 0;
          border: none;
          background: var(--subtle-surface);
          cursor: pointer;
        }

        .wechat-history-work-card-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 220px;
          color: var(--site-hero-muted);
          font-size: 14px;
        }

        .wechat-history-work-card-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.82);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
        }

        .wechat-history-work-card-badge--left {
          left: 14px;
          right: auto;
          background: rgba(87, 119, 255, 0.92);
        }

        .wechat-history-work-card-badge--success {
          background: rgba(22, 163, 74, 0.92);
        }

        .wechat-history-work-card-badge--failed {
          background: rgba(220, 38, 38, 0.92);
        }

        .wechat-history-work-card-badge--pending {
          background: rgba(217, 119, 6, 0.92);
        }

        .wechat-history-work-card-body {
          display: grid;
          gap: 10px;
          padding: 14px;
        }

        .wechat-generated-gallery {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .wechat-generated-thumb {
          aspect-ratio: 16 / 9;
        }

        .wechat-image-preview-trigger {
          padding: 0;
          border: 0;
          background: transparent;
          cursor: zoom-in;
        }

        .wechat-image-preview-trigger :global(img) {
          display: block;
        }

        .wechat-image-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.72);
        }

        .wechat-image-preview-dialog {
          display: grid;
          gap: 12px;
          width: min(960px, 100%);
          max-height: calc(100vh - 48px);
          padding: 18px;
          border-radius: 24px;
          border: 1px solid var(--site-hero-border);
          background: var(--card-surface);
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
        }

        .wechat-image-preview-close {
          justify-self: end;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--button-secondary-border);
          background: var(--button-secondary-bg);
          color: var(--button-secondary-text);
          cursor: pointer;
        }

        .wechat-image-preview-full {
          width: 100%;
          max-height: calc(100vh - 180px);
          object-fit: contain;
          border-radius: 18px;
          background: var(--subtle-surface);
          border: 1px solid var(--site-hero-border);
        }

        .wechat-account-card,
        .wechat-history-card,
        .wechat-session-item,
        .wechat-step-card,
        .wechat-session-result-card {
          border: 1px solid var(--site-hero-border);
          border-radius: 18px;
          background: var(--card-surface);
        }

        .wechat-account-card,
        .wechat-session-item,
        .wechat-step-card,
        .wechat-session-result-card {
          padding: 14px;
        }

        .wechat-account-card p,
        .wechat-step-card p,
        .wechat-history-body p,
        .wechat-session-result-card p {
          margin: 0;
          color: var(--site-hero-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .wechat-session-item {
          display: grid;
          gap: 10px;
          align-items: start;
        }

        .wechat-session-item.is-active {
          border-color: rgba(87, 119, 255, 0.28);
          background: var(--subtle-surface-strong);
        }

        .wechat-session-select {
          padding: 0;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          display: grid;
          gap: 6px;
        }

        .wechat-session-select span,
        .wechat-session-select small {
          color: var(--site-hero-muted);
        }

        .wechat-session-delete {
          justify-self: start;
          min-width: 88px;
          white-space: nowrap;
        }

        .wechat-step-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .wechat-step-card.is-done {
          background: rgba(45, 125, 78, 0.14);
          border-color: rgba(45, 125, 78, 0.3);
        }

        .wechat-step-card.is-current {
          background: var(--subtle-surface-strong);
          border-color: rgba(108, 124, 255, 0.28);
        }

        .wechat-step-card.is-upcoming {
          opacity: 0.86;
        }

        .wechat-history-card {
          overflow: hidden;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
        }

        .wechat-history-cover {
          height: 180px;
        }

        .wechat-history-body {
          display: grid;
          gap: 12px;
          padding: 16px;
        }

        .wechat-meta-list span {
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--subtle-surface);
          color: var(--site-hero-muted);
          font-size: 12px;
        }

        @media (max-width: 1480px) {
          .wechat-stage-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1280px) {
          .wechat-workflow-layout,
          .wechat-history-shell,
          .wechat-step-grid,
          .wechat-history-card-grid,
          .wechat-style-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1120px) {
          .wechat-config-grid,
          .wechat-form-grid,
          .wechat-account-grid,
          .wechat-history-grid,
          .wechat-placeholder-grid,
          .wechat-session-result-grid,
          .wechat-generated-gallery {
            grid-template-columns: 1fr;
          }

          .wechat-control-grid,
          .wechat-style-grid--preset {
            grid-template-columns: 1fr;
          }

          .wechat-html-overview {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .wechat-stage-hero {
            flex-direction: column;
            padding: 18px 18px 0;
          }

          .wechat-stage-toolbar {
            max-width: none;
            width: 100%;
            justify-content: flex-start;
          }

          .wechat-html-console {
            padding: 0 18px 18px;
          }

          .wechat-style-grid {
            grid-template-columns: 1fr;
          }

          .wechat-html-console {
            padding: 0 18px 18px;
          }

          .wechat-html-section {
            padding: 16px;
          }

        }
      `}</style>
    </main>
  );
}
