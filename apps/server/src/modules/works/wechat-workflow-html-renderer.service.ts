import { Injectable } from "@nestjs/common";
import type { WechatArticleDraftRecord, WechatWorkflowSessionRecord } from "./works.service";
import { WechatWorkflowCanonicalService, type WechatArticleCanonicalRecord } from "./wechat-workflow-canonical.service";

@Injectable()
export class WechatWorkflowHtmlRendererService {
  constructor(
    private readonly wechatWorkflowCanonicalService: WechatWorkflowCanonicalService,
  ) {}

  renderWorkflowArticleHtml(params: Pick<
    WechatWorkflowSessionRecord,
    "title" | "author" | "summary" | "content" | "articleCanonical" | "themeColor" | "commentMode"
  >) {
    return this.wechatWorkflowCanonicalService.renderArticleFragment({
      title: params.title,
      author: params.author,
      summary: params.summary,
      content: params.content,
      articleCanonical: params.articleCanonical,
      themeColor: params.themeColor,
      badgeLabel: "公众号工作流文章稿",
      metaLabel: `${params.author} · API 发布准备中 · 评论策略 ${params.commentMode}`,
    });
  }

  renderDraftArticleHtml(params: Pick<
    WechatArticleDraftRecord,
    "title" | "author" | "summary" | "content" | "articleCanonical" | "themeColor" | "commentMode"
  >) {
    return this.wechatWorkflowCanonicalService.renderArticleFragment({
      title: params.title,
      author: params.author,
      summary: params.summary,
      content: params.content,
      articleCanonical: params.articleCanonical,
      themeColor: params.themeColor,
      badgeLabel: "公众号 HTML 草稿",
      metaLabel: `${params.author} · 固定输出 HTML · 评论策略 ${params.commentMode}`,
    });
  }

  renderWorkflowResolvedHtml(params: {
    title: string;
    summary: string;
    author: string;
    content: string;
    articleCanonical?: WechatArticleCanonicalRecord;
    themeColor: string;
    commentMode: WechatWorkflowSessionRecord["commentMode"];
    coverImageUrl?: string;
    bodyImageUrls: string[];
    bodyImageAspectRatio?: string;
  }) {
    const baseHtml = this.renderWorkflowArticleHtml(params);
    return this.injectWechatImagesIntoHtml(baseHtml, {
      coverImageUrl: params.coverImageUrl,
      bodyImageUrls: params.bodyImageUrls,
      bodyImageAspectRatio: params.bodyImageAspectRatio,
    });
  }

  buildWorkflowResolvedHtmlContent(
    params: WechatWorkflowSessionRecord,
    options?: { preferExisting?: boolean; bodyImageAspectRatio?: string },
  ) {
    const baseHtml = options?.preferExisting && String(params.htmlContent || "").trim()
      ? this.extractPublishableHtmlFragment(String(params.htmlContent || "").trim())
      : this.renderWorkflowArticleHtml(params);
    return this.injectWechatImagesIntoHtml(baseHtml, {
      coverImageUrl: params.imageBundle?.coverImageUrl,
      bodyImageUrls: params.imageBundle?.bodyImageUrls || [],
      bodyImageAspectRatio: options?.bodyImageAspectRatio,
    });
  }

  buildDraftResolvedHtmlContent(
    params: WechatArticleDraftRecord,
    options?: { preferExisting?: boolean; bodyImageAspectRatio?: string },
  ) {
    const baseHtml = options?.preferExisting && String(params.htmlContent || "").trim()
      ? this.extractPublishableHtmlFragment(String(params.htmlContent || "").trim())
      : this.renderDraftArticleHtml(params);
    const coverTask = params.imageTasks?.find((item) => item.kind === "cover");
    const bodyTask = params.imageTasks?.find((item) => item.kind === "body");
    return this.injectWechatImagesIntoHtml(baseHtml, {
      coverImageUrl: coverTask?.generatedImageUrls[0],
      bodyImageUrls: bodyTask?.generatedImageUrls || [],
      bodyImageAspectRatio: options?.bodyImageAspectRatio,
    });
  }

  normalizeHtmlSpacing(htmlContent: string) {
    let normalized = String(htmlContent || "").trim();
    if (!normalized) {
      return normalized;
    }
    normalized = normalized
      .replace(/<(p|div|section|figure|figcaption)[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/\1>/gi, "")
      .replace(/\bmin-height\s*:\s*\d+px/gi, "min-height:auto");
    normalized = normalized.replace(/<figure\b([^>]*)>/gi, (_match, attrs) => {
      const nextAttrs = this.normalizeWechatHtmlInlineStyle(attrs, (style) => {
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
      const nextAttrs = this.normalizeWechatHtmlInlineStyle(attrs, (style) => {
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

  extractPublishableHtmlFragment(htmlContent: string) {
    let normalized = String(htmlContent || "").trim();
    if (!normalized) {
      return normalized;
    }
    const bodyMatch = normalized.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) {
      normalized = bodyMatch[1].trim();
    }
    const mainMatch = normalized.match(/^<main\b[^>]*>([\s\S]*?)<\/main>$/i);
    if (mainMatch?.[1]) {
      normalized = mainMatch[1].trim();
    }
    normalized = normalized
      .replace(/<!doctype html>/gi, "")
      .replace(/<\/?html\b[^>]*>/gi, "")
      .replace(/<\/?head\b[^>]*>[\s\S]*?(?=<body\b|$)/gi, "")
      .replace(/<\/?body\b[^>]*>/gi, "")
      .replace(/<\/?main\b[^>]*>/gi, "")
      .trim();
    return this.normalizeHtmlSpacing(normalized);
  }

  private injectWechatImagesIntoHtml(
    htmlContent: string,
    params: {
      coverImageUrl?: string;
      bodyImageUrls?: string[];
      bodyImageAspectRatio?: string;
    },
  ) {
    const normalizedHtml = this.stripWechatGeneratedImageArtifacts(htmlContent);
    if (!normalizedHtml) {
      return normalizedHtml;
    }
    const imageQueue = [
      String(params.coverImageUrl || "").trim(),
      ...(params.bodyImageUrls || []).map((item) => String(item || "").trim()),
    ].filter(Boolean);
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
      return this.replaceWechatImageTag(tag, nextUrl, alt);
    });
    const remainingUrls = imageQueue.slice(cursor);
    if (!remainingUrls.length) {
      return this.normalizeHtmlSpacing(replacedHtml);
    }
    return this.normalizeHtmlSpacing(this.injectWechatGeneratedImageBlocks(replacedHtml, {
      coverImageUrl: cursor === 0 ? imageQueue[0] : undefined,
      bodyImageUrls: cursor === 0 ? imageQueue.slice(1) : remainingUrls,
      bodyImageAspectRatio: params.bodyImageAspectRatio,
    }));
  }

  private stripWechatGeneratedImageArtifacts(htmlContent: string) {
    return String(htmlContent || "")
      .replace(/<figure\b[^>]*data-wechat-generated-image="true"[^>]*>[\s\S]*?<\/figure>/gi, "")
      .trim();
  }

  private normalizeWechatHtmlInlineStyle(
    attrs: string,
    transform: (style: string) => string,
  ) {
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

  private replaceWechatImageTag(tag: string, url: string, alt: string) {
    const normalizedUrl = this.escapeHtml(url);
    const normalizedAlt = this.escapeHtml(alt);
    let nextTag = tag;
    if (/\bsrc\s*=/i.test(nextTag)) {
      nextTag = nextTag.replace(/\bsrc\s*=\s*(['"])(.*?)\1/i, `src="${normalizedUrl}"`);
    } else {
      nextTag = nextTag.replace(/<img\b/i, `<img src="${normalizedUrl}"`);
    }
    if (/\balt\s*=/i.test(nextTag)) {
      nextTag = nextTag.replace(/\balt\s*=\s*(['"])(.*?)\1/i, `alt="${normalizedAlt}"`);
    } else {
      nextTag = nextTag.replace(/<img\b/i, `<img alt="${normalizedAlt}"`);
    }
    return nextTag;
  }

  private injectWechatGeneratedImageBlocks(
    htmlContent: string,
    params: {
      coverImageUrl?: string;
      bodyImageUrls: string[];
      bodyImageAspectRatio?: string;
    },
  ) {
    let normalizedHtml = String(htmlContent || "").trim();
    if (!normalizedHtml) {
      return normalizedHtml;
    }

    const coverImageUrl = String(params.coverImageUrl || "").trim();
    const bodyImageUrls = params.bodyImageUrls.map((item) => String(item || "").trim()).filter(Boolean);
    const bodyImageAspectRatio = String(params.bodyImageAspectRatio || "").trim() || "4 / 3";

    if (coverImageUrl) {
      const coverBlock = this.buildWechatGeneratedImageFigure({
        url: coverImageUrl,
        alt: "公众号封面图",
      });
      normalizedHtml = this.injectWechatCoverImageBlock(normalizedHtml, coverBlock);
    }

    if (bodyImageUrls.length) {
      const bodyBlocks = bodyImageUrls.map((item, index) => this.buildWechatGeneratedImageFigure({
        url: item,
        alt: `公众号正文配图${index + 1}`,
        aspectRatio: bodyImageAspectRatio,
      }));
      normalizedHtml = this.injectWechatBodyImageBlocks(normalizedHtml, bodyBlocks);
    }

    return normalizedHtml;
  }

  private injectWechatCoverImageBlock(htmlContent: string, coverBlock: string) {
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

  private injectWechatBodyImageBlocks(htmlContent: string, bodyBlocks: string[]) {
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

    return this.appendWechatGeneratedImageBlocks(htmlContent, bodyBlocks.join(""));
  }

  private appendWechatGeneratedImageBlocks(htmlContent: string, blocksHtml: string) {
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

  private buildWechatGeneratedImageFigure(params: {
    url: string;
    alt: string;
    aspectRatio?: string;
  }) {
    const normalizedUrl = this.escapeHtml(params.url);
    const normalizedAlt = this.escapeHtml(params.alt);
    return `<figure data-wechat-generated-image="true" style="margin:14px 0;"><img src="${normalizedUrl}" alt="${normalizedAlt}" style="display:block;width:100%;max-width:720px;height:auto;margin:0 auto;border-radius:20px;border:1px solid #e8edf7;background:#fff;box-shadow:0 10px 28px rgba(37,51,90,0.08);" /></figure>`;
  }

  private escapeHtml(value: string) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
