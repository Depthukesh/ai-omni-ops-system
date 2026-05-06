function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value: string) {
  const escaped = escapeHtml(value);

  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  const codeLines: string[] = [];

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  function closeCodeBlock() {
    if (inCodeBlock) {
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      codeLines.length = 0;
      inCodeBlock = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      closeList();
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmedLine) {
      closeList();
      continue;
    }

    const unorderedListMatch = trimmedLine.match(/^[-*]\s+(.*)$/);
    if (unorderedListMatch) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${renderInlineMarkdown(unorderedListMatch[1])}</li>`);
      continue;
    }

    const orderedListMatch = trimmedLine.match(/^\d+\.\s+(.*)$/);
    if (orderedListMatch) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${renderInlineMarkdown(orderedListMatch[1])}</li>`);
      continue;
    }

    closeList();

    const headingMatch = trimmedLine.match(/^(#{1,6})\s*(.+)$/);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length);
      const content = renderInlineMarkdown(headingMatch[2]);
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const blockquoteMatch = trimmedLine.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      html.push(`<blockquote><p>${renderInlineMarkdown(blockquoteMatch[1])}</p></blockquote>`);
      continue;
    }

    if (trimmedLine === "---" || trimmedLine === "***") {
      html.push("<hr />");
      continue;
    }

    html.push(`<p>${renderInlineMarkdown(trimmedLine)}</p>`);
  }

  closeList();
  closeCodeBlock();

  return `<section class="generated-report-markdown">${html.join("")}</section>`;
}

export function buildVisualReportPreviewDocument(title: string, htmlBody: string) {
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>html,body{margin:0;padding:0;background:#f5f7fb;font-family:"PingFang SC","Microsoft YaHei",sans-serif;}*{box-sizing:border-box;}</style>',
    "</head>",
    `<body>${htmlBody}</body>`,
    "</html>",
  ].join("");
}
