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

type WechatRenderableMarkdownBlock =
  | { type: "heading"; depth: 1 | 2 | 3; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

@Injectable()
export class WechatWorkflowCanonicalService {
  inferInputType(params: {
    inputType?: string;
    content: string;
    fallback?: WechatArticleCanonicalSourceFormat;
  }): WechatArticleCanonicalSourceFormat {
    const normalizedInputType = String(params.inputType || "").trim().toLowerCase();
    if (normalizedInputType === "html" || normalizedInputType === "markdown" || normalizedInputType === "plain-text") {
      return normalizedInputType;
    }
    const content = String(params.content || "").trim();
    if (content) {
      return this.resolveSourceFormat(undefined, content);
    }
    return params.fallback || "html";
  }

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
    const fragment = this.renderArticleFragment(input);
    return [
      "<!DOCTYPE html>",
      `<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${this.escapeHtml(input.title)}</title></head>`,
      `<body style="margin:0;background:#ffffff;font-family:'PingFang SC','Microsoft YaHei',sans-serif;">`,
      fragment,
      "</body></html>",
    ].join("");
  }

  renderArticleFragment(input: WechatWorkflowArticleDocumentInput) {
    const paragraphs = this.renderRichTextContent(input.content, input.articleCanonical);
    const summary = input.summary
      ? `<section style="margin:0 0 22px;padding:18px 20px;border-radius:22px;background:${this.escapeHtml(input.themeColor)}12;border:1px solid ${this.escapeHtml(input.themeColor)}33;"><div style="font-size:13px;color:${this.escapeHtml(input.themeColor)};font-weight:700;">摘要</div><p style="margin:10px 0 0;color:#24314a;font-size:15px;line-height:1.9;">${this.escapeHtml(input.summary)}</p></section>`
      : "";
    return [
      summary,
      `<section style="margin:0;">${paragraphs}</section>`,
    ]
      .filter(Boolean)
      .join("");
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
    const sourceFormat = articleCanonical?.sourceFormat || this.resolveSourceFormat(undefined, content);
    if (sourceFormat === "markdown") {
      return this.renderMarkdownContent(content);
    }
    if (articleCanonical?.blocks?.length) {
      return this.renderCanonicalBlocks(articleCanonical.blocks);
    }
    const canonical = this.buildArticleCanonical({ content });
    return this.renderCanonicalBlocks(canonical.blocks);
  }

  private renderMarkdownContent(content: string) {
    const blocks = this.parseMarkdownBlocks(content);
    if (!blocks.length) {
      return this.renderCanonicalBlocks(this.buildArticleCanonical({ content, inputType: "markdown" }).blocks);
    }
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
      if (block.type === "blockquote") {
        const body = block.lines
          .map((line) => `<p style="margin:0 0 12px;color:#42526d;font-size:15px;line-height:1.9;">${this.renderInlineMarkdown(line)}</p>`)
          .join("");
        return `<blockquote style="margin:0 0 18px;padding:14px 16px;border-left:4px solid #8ea3d6;background:#f7f9ff;border-radius:12px;">${body}</blockquote>`;
      }
      if (block.type === "list") {
        const tag = block.ordered ? "ol" : "ul";
        const items = block.items
          .map((item) => `<li style="margin:0 0 10px;color:#24314a;font-size:16px;line-height:1.9;">${this.renderInlineMarkdown(item)}</li>`)
          .join("");
        const extraStyle = block.ordered ? "padding-left:22px;" : "padding-left:20px;";
        return `<${tag} style="margin:0 0 18px;${extraStyle}color:#24314a;">${items}</${tag}>`;
      }
      if (block.type === "table") {
        const headerHtml = block.headers
          .map((item) => `<th style="padding:10px 12px;border:1px solid #d9e0ee;background:#f7f9ff;color:#17233f;font-size:14px;font-weight:700;text-align:left;">${this.renderInlineMarkdown(item)}</th>`)
          .join("");
        const rowHtml = block.rows
          .map((row) => `<tr>${row.map((item) => `<td style="padding:10px 12px;border:1px solid #d9e0ee;color:#24314a;font-size:14px;line-height:1.8;vertical-align:top;">${this.renderInlineMarkdown(item)}</td>`).join("")}</tr>`)
          .join("");
        return `<section style="margin:0 0 18px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border-spacing:0;">${headerHtml ? `<thead><tr>${headerHtml}</tr></thead>` : ""}<tbody>${rowHtml}</tbody></table></section>`;
      }
      const body = block.lines.map((line) => this.renderInlineMarkdown(line)).join("<br />");
      return `<p style="margin:0 0 14px;color:#24314a;font-size:16px;line-height:1.95;">${body}</p>`;
    }).join("");
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

  private parseMarkdownBlocks(content: string): WechatRenderableMarkdownBlock[] {
    const lines = String(content || "").split(/\r?\n/);
    const blocks: WechatRenderableMarkdownBlock[] = [];
    let index = 0;
    while (index < lines.length) {
      const currentLine = String(lines[index] || "");
      const trimmed = currentLine.trim();
      if (!trimmed) {
        index += 1;
        continue;
      }
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        blocks.push({
          type: "heading",
          depth: Math.min(3, headingMatch[1].length) as 1 | 2 | 3,
          text: headingMatch[2].trim(),
        });
        index += 1;
        continue;
      }
      if (this.isMarkdownTableStart(lines, index)) {
        const headers = this.splitMarkdownTableCells(lines[index] || "");
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length) {
          const tableLine = String(lines[index] || "").trim();
          if (!tableLine || !/\|/.test(tableLine)) {
            break;
          }
          rows.push(this.splitMarkdownTableCells(tableLine));
          index += 1;
        }
        blocks.push({ type: "table", headers, rows });
        continue;
      }
      if (/^>\s*/.test(trimmed)) {
        const quoteLines: string[] = [];
        while (index < lines.length) {
          const quoteLine = String(lines[index] || "").trim();
          if (!quoteLine || !/^>\s*/.test(quoteLine)) {
            break;
          }
          quoteLines.push(quoteLine.replace(/^>\s*/, "").trim());
          index += 1;
        }
        blocks.push({ type: "blockquote", lines: quoteLines.filter(Boolean) });
        continue;
      }
      const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        const ordered = Boolean(orderedMatch);
        const items: string[] = [];
        while (index < lines.length) {
          const listLine = String(lines[index] || "").trim();
          const nextMatch = ordered
            ? listLine.match(/^\d+\.\s+(.+)$/)
            : listLine.match(/^[-*+]\s+(.+)$/);
          if (!nextMatch) {
            break;
          }
          items.push(nextMatch[1].trim());
          index += 1;
        }
        blocks.push({ type: "list", ordered, items });
        continue;
      }
      const paragraphLines: string[] = [];
      while (index < lines.length) {
        const paragraphLine = String(lines[index] || "");
        const nextTrimmed = paragraphLine.trim();
        if (!nextTrimmed) {
          break;
        }
        if (
          /^(#{1,6})\s+/.test(nextTrimmed)
          || /^>\s*/.test(nextTrimmed)
          || /^[-*+]\s+/.test(nextTrimmed)
          || /^\d+\.\s+/.test(nextTrimmed)
          || this.isMarkdownTableStart(lines, index)
        ) {
          break;
        }
        paragraphLines.push(nextTrimmed);
        index += 1;
      }
      blocks.push({ type: "paragraph", lines: paragraphLines });
    }
    return blocks.filter((block) => {
      if (block.type === "paragraph" || block.type === "blockquote") {
        return block.lines.some(Boolean);
      }
      if (block.type === "list") {
        return block.items.some(Boolean);
      }
      if (block.type === "table") {
        return block.headers.length > 0 || block.rows.length > 0;
      }
      return Boolean(block.text);
    });
  }

  private isMarkdownTableStart(lines: string[], index: number) {
    const current = String(lines[index] || "").trim();
    const next = String(lines[index + 1] || "").trim();
    return /\|/.test(current)
      && /\|/.test(next)
      && /^[:\-\s|]+$/.test(next)
      && next.includes("-");
  }

  private splitMarkdownTableCells(line: string) {
    const trimmed = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
    return trimmed
      .split("|")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
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
