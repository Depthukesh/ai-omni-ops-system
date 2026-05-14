import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

export type PromptSourceBundle = {
  content: string;
  entryFilePath?: string;
  referenceFiles: string[];
};

export const PROMPT_SOURCE_CANDIDATES: Record<string, string[]> = {
  prompt_xhs_original_copy: [
    "../../../提示词/original_copy/original_copy/SKILL.md",
    "../提示词/original_copy/original_copy/SKILL.md",
  ],
  prompt_xhs_original_note: [
    "../../../提示词/original_image/SKILL.md",
    "../提示词/original_image/SKILL.md",
  ],
  prompt_xhs_rewrite_copy: [
    "../../../提示词/rewrite_copy/SKILL.md",
    "../提示词/rewrite_copy/SKILL.md",
  ],
  prompt_xhs_rewrite_note: [
    "../../../提示词/rewrite_image/SKILL.md",
    "../提示词/rewrite_image/SKILL.md",
  ],
  prompt_xhs_video_note: [
    "../../../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
    "../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
  ],
  prompt_growth_report: [
    "../../../.trae/skills/brand-omni-growth-analysis/SKILL.md",
    "../../../.runtime/brand-omni-growth-analysis/brand-omni-growth-analysis/SKILL.md",
    "../../../提示词/brand-omni-growth-analysis/brand-omni-growth-analysis/SKILL.md",
  ],
  prompt_visual_report: [
    "../../../提示词/article-visual-report-designer/SKILL.md",
  ],
  prompt_xhs_plan: [
    "../../../提示词/xiaohongshu-brand-marketing-plan/xiaohongshu-brand-marketing-plan/SKILL.md",
    "../../../提示词/_xhs-plan-skill/xiaohongshu-brand-marketing-plan/SKILL.md",
  ],
  prompt_xhs_calendar: [
    "../../../提示词/营销日历提示词.txt",
    "../提示词/营销日历提示词.txt",
  ],
};

const IGNORED_DIRECTORIES = new Set(["__pycache__", "outputs", "scripts"]);
const READABLE_REFERENCE_EXTENSIONS = new Set([".md", ".txt"]);

type PromptReferenceEntry = {
  fileName: string;
  content: string;
};

function normalizeFileText(content: string) {
  return content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
}

function readTextFile(filePath: string) {
  return normalizeFileText(readFileSync(filePath, "utf8"));
}

function compareReferenceFileNames(left: string, right: string) {
  const leftPrefix = left.match(/^(\d+)[_.-]/);
  const rightPrefix = right.match(/^(\d+)[_.-]/);

  if (leftPrefix && rightPrefix) {
    const numericDifference = Number(leftPrefix[1]) - Number(rightPrefix[1]);
    if (numericDifference !== 0) {
      return numericDifference;
    }
  } else if (leftPrefix || rightPrefix) {
    return leftPrefix ? -1 : 1;
  }

  const leftExt = extname(left).toLowerCase();
  const rightExt = extname(right).toLowerCase();
  if (leftExt !== rightExt) {
    if (leftExt === ".md") {
      return -1;
    }
    if (rightExt === ".md") {
      return 1;
    }
  }

  return left.localeCompare(right, "zh-CN");
}

function listReadableReferenceEntries(entryFilePath: string): PromptReferenceEntry[] {
  const entryDirectory = dirname(entryFilePath);
  const entryFileName = basename(entryFilePath);
  const directoryEntries = readdirSync(entryDirectory, { withFileTypes: true });

  return directoryEntries
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name !== entryFileName)
    .filter((entry) => READABLE_REFERENCE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .sort((left, right) => compareReferenceFileNames(left.name, right.name))
    .map((entry) => ({
      fileName: entry.name,
      content: readTextFile(resolve(entryDirectory, entry.name)),
    }))
    .filter((entry) => entry.content);
}

function formatPromptSourceBundle(entryContent: string, references: PromptReferenceEntry[]) {
  if (!references.length) {
    return entryContent;
  }

  const sections = [entryContent];
  const referenceCatalog = references.map((entry, index) => `${index + 1}. ${entry.fileName}`).join("\n");

  sections.push(
    [
      "## 自动聚合参考资料",
      "以下内容由系统按技能源目录自动拼接，用于执行时补充上下文；引用这些资料时，仍需以用户输入、真实数据和已验证事实为准。",
      "",
      "### 已纳入文件",
      referenceCatalog,
    ].join("\n"),
  );

  references.forEach((reference) => {
    sections.push(`### 参考资料：${reference.fileName}\n${reference.content}`);
  });

  return sections.join("\n\n").trim();
}

export function resolvePromptSourceEntryPath(promptId: string) {
  const candidates = PROMPT_SOURCE_CANDIDATES[promptId];
  if (!candidates?.length) {
    return undefined;
  }

  for (const candidate of candidates) {
    const filePath = resolve(process.cwd(), candidate);
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return undefined;
}

export function readPromptSourceBundle(promptId: string, fallback: string): PromptSourceBundle {
  const entryFilePath = resolvePromptSourceEntryPath(promptId);
  if (!entryFilePath) {
    return {
      content: fallback,
      referenceFiles: [],
    };
  }

  try {
    const entryContent = readTextFile(entryFilePath);
    const referenceEntries = listReadableReferenceEntries(entryFilePath);

    return {
      content: formatPromptSourceBundle(entryContent || fallback, referenceEntries),
      entryFilePath,
      referenceFiles: referenceEntries.map((entry) => entry.fileName),
    };
  } catch {
    return {
      content: fallback,
      entryFilePath,
      referenceFiles: [],
    };
  }
}

export function promptSourceHasReferenceFiles(promptId: string) {
  return readPromptSourceBundle(promptId, "").referenceFiles.length > 0;
}
