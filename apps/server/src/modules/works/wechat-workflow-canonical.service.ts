import { Injectable } from "@nestjs/common";

export type WechatArticleCanonicalSourceFormat = "plain-text" | "markdown" | "html";

export type WechatArticleCanonicalBlock = {
  id: string;
  type: "heading" | "paragraph";
  text: string;
  depth?: 1 | 2 | 3;
};

export type WechatArticleCanonicalRecord = {
  version: 1;
  sourceFormat: WechatArticleCanonicalSourceFormat;
  plainText: string;
  headings: string[];
  blocks: WechatArticleCanonicalBlock[];
  paragraphCount: number;
  updatedAt: string;
};

export type WechatHtmlCoverageResult = {
  totalBlocks: number;
  coveredBlocks: number;
  totalHeadingBlocks: number;
  coveredHeadingBlocks: number;
  coverageRatio: number;
  headingCoverageRatio: number;
  missingBlocks: WechatArticleCanonicalBlock[];
  shouldFallback: boolean;
};

type WechatWorkflowArticleDocumentInput = {
  title: string;
  author: string;
  summary?: string;
  content: string;
  articleCanonical?: WechatArticleCanonicalRecord;
  themeColor: string;
  badgeLabel: string;
  metaLabel: string;
};

@Injectable()
export class WechatWorkflowCanonicalService {
  buildArticleCanonical(params: {
    content: string;
    inputType?: string;
  }): WechatArticleCanonicalRecord {
    const sourceFormat = this.resolveSourceFormat(params.inputType, params.content);
    const normalizedContent = sourceFormat === "html" ? this.extractPlainTextFromHtml(params.content) : String(params.content || "");
    const lines = normalizedContent
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const blocks = lines.map((line, index) => this.buildCanonicalBlock(line, index));
    const plainText = blocks.map((item) => item.text).join("\n\n").trim();
    return {
      version: 1,
      sourceFormat,
      plainText,
      headings: blocks.filter((item) => item.type === "heading").map((item) => item.text),
      blocks,
      paragraphCount: blocks.filter((item) => item.type === "paragraph").length,
      updatedAt: new Date().toISOString(),
    };
  }

  renderArticleDocument(input: WechatWorkflowArticleDocumentInput) {
    const paragraphs = this.renderRichTextContent(input.content, input.articleCanonical);
    const summary = input.summary
      ? `<section style="margin:18px 0 0;padding:18px 20px;border-radius:22px;background:${this.escapeHtml(input.themeColor)}12;border:1px solid ${this.escapeHtml(input.themeColor)}33;"><div style="font-size:13px;color:${this.escapeHtml(input.themeColor)};font-weight:700;">摘要</div><p style="margin:10px 0 0;color:#24314a;font-size:15px;line-height:1.9;">${this.escapeHtml(input.summary)}</p></section>`
      : "";
    return [
      "<!DOCTYPE html>",
      `<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${this.escapeHtml(input.title)}</title></head>`,
      `<body style="margin:0;background:linear-gradient(180deg,#f7f8fc 0%,#eef2ff 100%);font-family:'PingFang SC','Microsoft YaHei',sans-serif;">`,
      '<main style="max-width:900px;margin:0 auto;padding:28px 16px 48px;">',
      '<section style="padding:26px;border-radius:30px;background:rgba(255,255,255,0.96);border:1px solid rgba(226,232,250,0.9);box-shadow:0 20px 56px rgba(52,68,118,0.12);">',
      `<div style="display:inline-flex;align-items:center;padding:8px 14px;border-radius:999px;background:${this.escapeHtml(input.themeColor)}18;color:${this.escapeHtml(input.themeColor)};font-size:12px;font-weight:700;">${this.escapeHtml(input.badgeLabel)}</div>`,
      `<h1 style="margin:18px 0 8px;font-size:34px;line-height:1.25;color:#17233f;">${this.escapeHtml(input.title)}</h1>`,
      `<div style="color:#63708a;font-size:13px;">${this.escapeHtml(input.metaLabel)}</div>`,
      summary,
      `<section style="margin-top:24px;">${paragraphs}</section>`,
      "</section></main></body></html>",
    ].join("");
  }

  inspectHtmlCoverage(params: {
    htmlContent: string;
    sourceContent: string;
    articleCanonical?: WechatArticleCanonicalRecord;
  }): WechatHtmlCoverageResult {
    const sourceBlocks = params.articleCanonical?.blocks?.length
      ? params.articleCanonical.blocks
      : this.buildArticleCanonical({ content: params.sourceContent }).blocks;
    if (!sourceBlocks.length) {
      return {
        totalBlocks: 0,
        coveredBlocks: 0,
        totalHeadingBlocks: 0,
        coveredHeadingBlocks: 0,
        coverageRatio: 1,
        headingCoverageRatio: 1,
        missingBlocks: [],
        shouldFallback: false,
      };
    }
    const generatedText = this.normalizeComparableText(this.extractPlainTextFromHtml(params.htmlContent));
    const missingBlocks = sourceBlocks.filter((block) => !this.htmlContainsParagraph(generatedText, block.text));
    const totalBlocks = sourceBlocks.length;
    const coveredBlocks = totalBlocks - missingBlocks.length;
    const totalHeadingBlocks = sourceBlocks.filter((block) => block.type === "heading").length;
    const coveredHeadingBlocks = sourceBlocks
      .filter((block) => block.type === "heading")
      .filter((block) => !missingBlocks.some((missing) => missing.id === block.id))
      .length;
    const coverageRatio = totalBlocks ? coveredBlocks / totalBlocks : 1;
    const headingCoverageRatio = totalHeadingBlocks ? coveredHeadingBlocks / totalHeadingBlocks : 1;
    const minimumCoverageRatio = totalBlocks <= 3 ? 1 : 0.8;
    return {
      totalBlocks,
      coveredBlocks,
      totalHeadingBlocks,
      coveredHeadingBlocks,
      coverageRatio,
      headingCoverageRatio,
      missingBlocks,
      shouldFallback: coverageRatio < minimumCoverageRatio || headingCoverageRatio < 1,
    };
  }

  extractPlainTextFromHtml(htmlContent: string) {
    return String(htmlContent || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|blockquote|pre)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  extractSectionTopics(params: {
    content: string;
    articleCanonical?: WechatArticleCanonicalRecord;
    title: string;
    summary: string;
    selectedMarketingLabels: string[];
    selectedProductLabels: string[];
    selectedBrandLabels: string[];
    injectBrandProfile: boolean;
  }) {
    const normalizeTopic = (value: string) => this.truncateText(
      String(value || "")
        .replace(/^#+\s*/g, "")
        .replace(/^[（(]?(?:第?\s*[一二三四五六七八九十百0-9]+|[0-9]+)[）).、:：\-\s]*/g, "")
        .replace(/^(导语|引言|开场|总结|结语|结尾|正文|小结)[：:\s-]*/g, "")
        .trim(),
      36,
    );
    const canonicalTopics = params.articleCanonical?.blocks
      ?.map((item) => normalizeTopic(item.text))
      .filter((item) => item.length >= 8) || [];
    const paragraphTopics = String(params.content || "")
      .split(/\r?\n+/)
      .map((item) => normalizeTopic(item))
      .filter((item) => item.length >= 8);
    const sentenceTopics = String(params.content || "")
      .split(/[。！？!?；;\n]/)
      .map((item) => normalizeTopic(item))
      .filter((item) => item.length >= 8);
    const fallbackTopics = [
      params.summary,
      params.selectedMarketingLabels[0],
      params.selectedProductLabels[0],
      params.injectBrandProfile ? params.selectedBrandLabels[0] : "",
      params.title,
    ]
      .map((item) => normalizeTopic(item || ""))
      .filter((item) => item.length >= 4);
    const topics = Array.from(new Set([...canonicalTopics, ...paragraphTopics, ...sentenceTopics, ...fallbackTopics])).filter(Boolean);
    return (topics.length ? topics : [normalizeTopic(params.title)]).slice(0, 4);
  }

  renderRichTextContent(content: string, articleCanonical?: WechatArticleCanonicalRecord) {
    if (articleCanonical?.blocks?.length) {
      return this.renderCanonicalBlocks(articleCanonical.blocks);
    }
    const canonical = this.buildArticleCanonical({ content });
    return this.renderCanonicalBlocks(canonical.blocks);
  }

  private normalizeComparableText(content: string) {
    return String(content || "")
      .replace(/\s+/g, "")
      .replace(/[，。！？；：“”‘’、,.!?;:'"()[\]{}<>《》【】\-—_]/g, "")
      .trim()
      .toLowerCase();
  }

  private htmlContainsParagraph(generatedText: string, paragraph: string) {
    const normalizedParagraph = this.normalizeComparableText(paragraph);
    if (!normalizedParagraph) {
      return true;
    }
    if (generatedText.includes(normalizedParagraph)) {
      return true;
    }
    if (normalizedParagraph.length <= 18) {
      return false;
    }
    const head = normalizedParagraph.slice(0, 18);
    const tail = normalizedParagraph.slice(-18);
    return generatedText.includes(head) && generatedText.includes(tail);
  }

  private renderCanonicalBlocks(blocks: WechatArticleCanonicalBlock[]) {
    return blocks.map((block) => {
      if (block.type === "heading") {
        const tag = block.depth === 1 ? "h1" : block.depth === 2 ? "h2" : "h3";
        const style = tag === "h1"
          ? "margin:26px 0 16px;color:#17233f;font-size:30px;line-height:1.28;font-weight:800;"
          : tag === "h2"
            ? "margin:24px 0 14px;color:#17233f;font-size:24px;line-height:1.4;font-weight:800;"
            : "margin:20px 0 12px;color:#24314a;font-size:20px;line-height:1.45;font-weight:700;";
        return `<${tag} style="${style}">${this.renderInlineMarkdown(block.text)}</${tag}>`;
      }
      return `<p style="margin:0 0 14px;color:#24314a;font-size:16px;line-height:1.95;">${this.renderInlineMarkdown(block.text)}</p>`;
    }).join("");
  }

  private buildCanonicalBlock(line: string, index: number): WechatArticleCanonicalBlock {
    const trimmed = String(line || "").trim();
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const depth = Math.min(3, headingMatch[1].length) as 1 | 2 | 3;
      return {
        id: `heading-${index + 1}`,
        type: "heading",
        text: headingMatch[2].trim(),
        depth,
      };
    }
    return {
      id: `paragraph-${index + 1}`,
      type: "paragraph",
      text: trimmed,
    };
  }

  private resolveSourceFormat(inputType: string | undefined, content: string): WechatArticleCanonicalSourceFormat {
    const normalizedInputType = String(inputType || "").trim().toLowerCase();
    if (normalizedInputType === "html") {
      return "html";
    }
    if (normalizedInputType === "markdown") {
      return "markdown";
    }
    const rawContent = String(content || "");
    if (/<[a-z][\s\S]*>/i.test(rawContent)) {
      return "html";
    }
    if (/^\s*#{1,6}\s+/m.test(rawContent) || /\*\*[^*]+\*\*/.test(rawContent) || /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/.test(rawContent)) {
      return "markdown";
    }
    return "plain-text";
  }

  private truncateText(value: string, maxLength: number) {
    const normalized = String(value || "").trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  private renderInlineMarkdown(content: string) {
    let html = this.escapeHtml(content);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label, url) => {
      return `<a href="${url}" target="_blank" rel="noreferrer" style="color:#5166ff;text-decoration:none;">${label}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    html = html.replace(/`([^`]+)`/g, "<code style=\"padding:0 6px;border-radius:6px;background:rgba(81,102,255,0.08);font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:0.92em;\">$1</code>");
    return html;
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
