import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, relative, resolve, sep } from "node:path";

export type ImagePromptSeedRecord = {
  id: string;
  slug: string;
  title: string;
  preview: string;
  content: string;
  sourceFilePath: string;
  sourceCategory: string;
  sourceFileName: string;
  categoryLabel: string;
  tagsJson: string[];
  previewImageFilePath: string;
  previewImageFileName: string;
  previewImageContentType: string;
  sortOrder: number;
};

const SUPPORTED_MARKDOWN_EXTENSIONS = new Set([".md", ".txt"]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function loadImagePromptSeeds(cwd: string) {
  const sourceRoots = resolveImagePromptSourceRoots(cwd);
  if (!sourceRoots.length) {
    return [] satisfies ImagePromptSeedRecord[];
  }

  const seeds: ImagePromptSeedRecord[] = [];
  for (const sourceRoot of sourceRoots) {
    const files = await collectMarkdownFiles(sourceRoot.absolutePath);
    for (const filePath of files) {
      const content = normalizeContent(await readFile(filePath, "utf8"));
      if (!content) {
        continue;
      }
      const sourceFileName = basename(filePath);
      const sourceFilePath = normalizePath(relative(sourceRoot.absolutePath, filePath));
      const previewImagePath = await resolveSiblingImageFile(filePath);
      const title = extractImagePromptTitle(content, sourceFileName);
      const categoryLabel = extractCategoryLabel(content, sourceRoot.categoryLabel, sourceFilePath);
      const tagsJson = extractTags(content, categoryLabel, sourceRoot.categoryLabel);
      const identity = createStableIdentity(`${sourceRoot.categoryLabel}:${sourceFilePath}`);
      seeds.push({
        id: `img_prompt_${identity.slice(0, 24)}`,
        slug: `img-prompt-${identity.slice(0, 18)}`,
        title,
        preview: extractPromptPreview(content),
        content,
        sourceFilePath: `${sourceRoot.categoryLabel}/${sourceFilePath}`,
        sourceCategory: sourceRoot.categoryLabel,
        sourceFileName,
        categoryLabel,
        tagsJson,
        previewImageFilePath: previewImagePath || "",
        previewImageFileName: previewImagePath ? basename(previewImagePath) : "",
        previewImageContentType: previewImagePath ? resolveImageMimeType(previewImagePath) : "",
        sortOrder: seeds.length + 1,
      });
    }
  }

  return seeds;
}

function resolveImagePromptSourceRoots(cwd: string) {
  const envRoots = String(process.env.IMAGE_PROMPT_SOURCE_DIRS || "")
    .split(/[;,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const candidates = [
    ...envRoots,
    resolve(cwd, "..", "素材", "小红书", "图文"),
    resolve(cwd, "..", "素材", "小红书", "小红书图文"),
    resolve(cwd, "素材", "小红书", "图文"),
    resolve(cwd, "素材", "小红书", "小红书图文"),
    resolve(cwd, "..", "..", "素材", "小红书", "图文"),
    resolve(cwd, "..", "..", "素材", "小红书", "小红书图文"),
    resolve(cwd, "..", "..", "..", "素材", "小红书", "图文"),
    resolve(cwd, "..", "..", "..", "素材", "小红书", "小红书图文"),
  ];

  const seen = new Set<string>();
  return candidates
    .map((absolutePath) => absolutePath.trim())
    .filter((absolutePath) => absolutePath && existsSync(absolutePath))
    .filter((absolutePath) => {
      if (seen.has(absolutePath)) {
        return false;
      }
      seen.add(absolutePath);
      return true;
    })
    .map((absolutePath) => ({
      absolutePath,
      categoryLabel: basename(absolutePath) || "生图提示词",
    }));
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));

  for (const entry of sortedEntries) {
    const fullPath = resolve(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectMarkdownFiles(fullPath));
      continue;
    }
    if (SUPPORTED_MARKDOWN_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

async function resolveSiblingImageFile(filePath: string) {
  const directory = resolve(filePath, "..");
  const stem = basename(filePath, extname(filePath));
  const entries = await readdir(directory, { withFileTypes: true });
  const matched = entries.find((entry) =>
    entry.isFile()
    && basename(entry.name, extname(entry.name)) === stem
    && SUPPORTED_IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()),
  );
  return matched ? resolve(directory, matched.name) : "";
}

function extractImagePromptTitle(content: string, sourceFileName: string) {
  const heading = String(content.match(/^#\s+(.+)$/m)?.[1] || "").trim();
  if (heading) {
    return heading;
  }
  const fileTitle = basename(sourceFileName, extname(sourceFileName))
    .replace(/^case\d+_/, "")
    .replace(/^\d+\-/, "")
    .replace(/\-poster$/i, "")
    .replace(/\-+/g, " ")
    .trim();
  return fileTitle || "未命名生图提示词";
}

function extractCategoryLabel(content: string, fallbackCategory: string, sourceFilePath: string) {
  const directCategory = String(content.match(/\*\*分类：\*\*\s*(.+)$/m)?.[1] || "").trim();
  if (directCategory) {
    return directCategory;
  }
  const pathSegments = normalizePath(sourceFilePath).split("/").filter(Boolean);
  return pathSegments.length > 1 ? pathSegments[0] || fallbackCategory : fallbackCategory;
}

function extractTags(content: string, categoryLabel: string, sourceCategory: string) {
  const styleTags = splitTagLine(content.match(/\*\*风格标签：\*\*\s*(.+)$/m)?.[1] || "");
  const sceneTags = splitTagLine(content.match(/\*\*场景标签：\*\*\s*(.+)$/m)?.[1] || "");
  return Array.from(new Set([categoryLabel, sourceCategory, ...styleTags, ...sceneTags].filter(Boolean))).slice(0, 8);
}

function splitTagLine(value: string) {
  return String(value || "")
    .split(/[，,、|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractPromptPreview(content: string) {
  const lines = content
    .replace(/```[\s\S]*?```/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line
      && !line.startsWith("#")
      && !line.startsWith("**分类：**")
      && !line.startsWith("**风格标签：**")
      && !line.startsWith("**场景标签：**")
      && !line.startsWith("**来源：**")
      && !/^---+$/.test(line),
    );
  const sample = lines[0] || content;
  const normalized = sample.replace(/\s+/g, " ").trim();
  return normalized.length > 96 ? `${normalized.slice(0, 93).trim()}...` : normalized;
}

function normalizeContent(content: string) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function createStableIdentity(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function normalizePath(value: string) {
  return value.split(sep).join("/");
}

function resolveImageMimeType(filePath: string) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "application/octet-stream";
}
