"use client";

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() || "";
    if (isMarkdownTableRow(line) && isMarkdownTableDivider(nextLine)) {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      const headerCells = splitMarkdownTableRow(line);
      const bodyRows: string[][] = [];
      index += 2;
      while (index < lines.length) {
        const tableLine = lines[index].trim();
        if (!isMarkdownTableRow(tableLine)) {
          break;
        }
        bodyRows.push(splitMarkdownTableRow(tableLine));
        index += 1;
      }
      html.push(renderMarkdownTable(headerCells, bodyRows));
      continue;
    }

    if (line.startsWith(">")) {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteLine = lines[index].trim();
        if (!quoteLine.startsWith(">")) {
          break;
        }
        quoteLines.push(quoteLine.replace(/^>\s?/, ""));
        index += 1;
      }
      const quoteHtml = quoteLines
        .filter(Boolean)
        .map((item) => `<p>${renderInlineMarkdown(item)}</p>`)
        .join("");
      html.push(`<blockquote>${quoteHtml}</blockquote>`);
      continue;
    }

    if (line === "---" || line === "***") {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
      html.push("<hr />");
      index += 1;
      continue;
    }

    const unorderedMatch = line.match(/^[-*+•]\s+(.+)$/);
    if (unorderedMatch) {
      if (listType !== "ul") {
        if (listType) {
          html.push(`</${listType}>`);
        }
        html.push("<ul>");
        listType = "ul";
      }
      html.push(renderMarkdownListItem(unorderedMatch[1], getMarkdownIndentLevel(rawLine)));
      index += 1;
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== "ol") {
        if (listType) {
          html.push(`</${listType}>`);
        }
        html.push("<ol>");
        listType = "ol";
      }
      html.push(renderMarkdownListItem(orderedMatch[1], getMarkdownIndentLevel(rawLine)));
      index += 1;
      continue;
    }

    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      index += 1;
      continue;
    }

    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    index += 1;
  }

  if (listType) {
    html.push(`</${listType}>`);
  }

  return `<section class="generated-report-markdown">${html.join("")}</section>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value: string) {
  let html = escapeHtml(value);

  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br />");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  return html;
}

function isMarkdownTableRow(value: string) {
  return value.startsWith("|") && value.endsWith("|") && value.includes("|");
}

function isMarkdownTableDivider(value: string) {
  if (!isMarkdownTableRow(value)) {
    return false;
  }
  return splitMarkdownTableRow(value).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function splitMarkdownTableRow(value: string) {
  return value
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderMarkdownTable(headers: string[], rows: string[][]) {
  const headHtml = headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("");
  const bodyHtml = rows
    .map((row) => {
      const cells = headers.map((_, index) => `<td>${renderInlineMarkdown(row[index] || "")}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return [
    '<div class="generated-report-table-wrap">',
    '<table class="generated-report-table">',
    `<thead><tr>${headHtml}</tr></thead>`,
    `<tbody>${bodyHtml}</tbody>`,
    "</table>",
    "</div>",
  ].join("");
}

function getMarkdownIndentLevel(value: string) {
  const leadingSpaces = value.match(/^\s*/)?.[0].length || 0;
  return Math.max(0, Math.min(4, Math.floor(leadingSpaces / 2)));
}

function renderMarkdownListItem(content: string, indentLevel: number) {
  return `<li class="generated-report-list-item generated-report-list-item--level-${indentLevel}">${renderInlineMarkdown(content)}</li>`;
}
