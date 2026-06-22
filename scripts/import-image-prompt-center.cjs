const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const OSS = require("ali-oss");
const { PrismaClient } = require("@prisma/client");

const PROJECT_ROOT = process.cwd();
const DEFAULT_SOURCE_ROOTS = [
  "d:\\王笑东\\aiproject\\AI全域运营\\AI全域智能体\\素材\\小红书\\图文",
  "d:\\王笑东\\aiproject\\AI全域运营\\AI全域智能体\\素材\\小红书\\小红书图文",
];
const SUPPORTED_PROMPT_EXTENSIONS = new Set([".md", ".txt"]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const prisma = new PrismaClient();

async function main() {
  loadEnvFile(path.join(PROJECT_ROOT, ".env"));
  loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));

  const sourceRoots = resolveSourceRoots();
  if (!sourceRoots.length) {
    throw new Error("未找到可导入的生图提示词目录。");
  }

  const oss = createOssClient();
  const imported = [];
  let sortOrder = 0;

  for (const sourceRoot of sourceRoots) {
    const promptFiles = await collectPromptFiles(sourceRoot.absolutePath);
    for (const filePath of promptFiles) {
      const content = normalizeContent(await fsp.readFile(filePath, "utf8"));
      if (!content) {
        continue;
      }

      const sourceFileName = path.basename(filePath);
      const relativePath = normalizePath(path.relative(sourceRoot.absolutePath, filePath));
      const sourceFilePath = `${sourceRoot.categoryLabel}/${relativePath}`;
      const imagePath = await resolveSiblingImageFile(filePath);
      const title = extractTitle(content, sourceFileName);
      const preview = extractPreview(content);
      const categoryLabel = extractCategoryLabel(content, sourceRoot.categoryLabel, relativePath);
      const tagsJson = extractTags(content, categoryLabel, sourceRoot.categoryLabel);
      const identity = createStableIdentity(sourceFilePath);
      const id = `img_prompt_${identity.slice(0, 24)}`;
      const slug = `img-prompt-${identity.slice(0, 18)}`;

      let previewImageStorageKey = null;
      let previewImageFileName = null;
      let previewImageContentType = null;
      if (imagePath) {
        const extension = path.extname(imagePath).toLowerCase() || ".jpg";
        const storageKey = `works/shared/image-prompt-templates/${id}${extension}`;
        const buffer = await fsp.readFile(imagePath);
        const contentType = resolveImageMimeType(imagePath);
        await oss.put(storageKey, buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000",
          },
        });
        previewImageStorageKey = storageKey;
        previewImageFileName = path.basename(imagePath);
        previewImageContentType = contentType;
      }

      sortOrder += 1;
      await prisma.imagePromptTemplate.upsert({
        where: { sourceFilePath },
        create: {
          id,
          slug,
          title,
          preview,
          content,
          status: "ACTIVE",
          sourceFilePath,
          sourceCategory: sourceRoot.categoryLabel,
          sourceFileName,
          categoryLabel,
          tagsJson,
          previewImageStorageKey,
          previewImageFileName,
          previewImageContentType,
          sortOrder,
        },
        update: {
          slug,
          sourceCategory: sourceRoot.categoryLabel,
          sourceFileName,
          categoryLabel,
          tagsJson,
          sortOrder,
          ...(previewImageStorageKey
            ? {
                previewImageStorageKey,
                previewImageFileName,
                previewImageContentType,
              }
            : {}),
        },
      });

      imported.push({
        id,
        title,
        sourceFilePath,
        hasPreviewImage: Boolean(previewImageStorageKey),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        importedCount: imported.length,
        sourceRoots: sourceRoots.map((item) => item.absolutePath),
        missingPreviewCount: imported.filter((item) => !item.hasPreviewImage).length,
      },
      null,
      2,
    ),
  );
}

function resolveSourceRoots() {
  const configured = String(process.env.IMAGE_PROMPT_SOURCE_DIRS || "")
    .split(/[;,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const candidates = configured.length ? configured : DEFAULT_SOURCE_ROOTS;
  const seen = new Set();
  return candidates
    .filter((target) => target && fs.existsSync(target))
    .filter((target) => {
      const normalized = path.resolve(target);
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .map((absolutePath) => ({
      absolutePath: path.resolve(absolutePath),
      categoryLabel: path.basename(absolutePath) || "生图提示词",
    }));
}

async function collectPromptFiles(root) {
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const results = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))) {
    const targetPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectPromptFiles(targetPath)));
      continue;
    }
    if (entry.isFile() && SUPPORTED_PROMPT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(targetPath);
    }
  }
  return results;
}

async function resolveSiblingImageFile(filePath) {
  const dirPath = path.dirname(filePath);
  const stem = path.basename(filePath, path.extname(filePath));
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const matched = entries.find((entry) => {
    return entry.isFile()
      && path.basename(entry.name, path.extname(entry.name)) === stem
      && SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
  });
  return matched ? path.join(dirPath, matched.name) : "";
}

function extractTitle(content, sourceFileName) {
  const heading = String(content.match(/^#\s+(.+)$/m)?.[1] || "").trim();
  if (heading) {
    return heading;
  }
  return path.basename(sourceFileName, path.extname(sourceFileName))
    .replace(/^case\d+_/, "")
    .replace(/^\d+\-/, "")
    .replace(/\-poster$/i, "")
    .replace(/\-+/g, " ")
    .trim() || "未命名生图提示词";
}

function extractCategoryLabel(content, fallbackCategory, relativePath) {
  const directCategory = String(content.match(/\*\*分类：\*\*\s*(.+)$/m)?.[1] || "").trim();
  if (directCategory) {
    return directCategory;
  }
  const pathSegments = normalizePath(relativePath).split("/").filter(Boolean);
  return pathSegments.length > 1 ? pathSegments[0] || fallbackCategory : fallbackCategory;
}

function extractTags(content, categoryLabel, sourceCategory) {
  const styleTags = splitTagLine(content.match(/\*\*风格标签：\*\*\s*(.+)$/m)?.[1] || "");
  const sceneTags = splitTagLine(content.match(/\*\*场景标签：\*\*\s*(.+)$/m)?.[1] || "");
  return Array.from(new Set([categoryLabel, sourceCategory, ...styleTags, ...sceneTags].filter(Boolean))).slice(0, 8);
}

function splitTagLine(value) {
  return String(value || "")
    .split(/[，,、|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractPreview(content) {
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
  const normalized = String(lines[0] || content).replace(/\s+/g, " ").trim();
  return normalized.length > 96 ? `${normalized.slice(0, 93).trim()}...` : normalized;
}

function normalizeContent(content) {
  return String(content || "").replace(/\r\n/g, "\n").trim();
}

function normalizePath(value) {
  return String(value || "").split(path.sep).join("/");
}

function createStableIdentity(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex");
}

function resolveImageMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
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

function createOssClient() {
  const accessKeyId = String(process.env.OSS_ACCESS_KEY_ID || "").trim();
  const accessKeySecret = String(process.env.OSS_ACCESS_KEY_SECRET || "").trim();
  const bucket = String(process.env.OSS_BUCKET || "").trim();
  const region = String(process.env.OSS_REGION || "").trim();
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法导入生图提示词。");
  }
  if (!accessKeyId || !accessKeySecret || !bucket || !region) {
    throw new Error("缺少 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET / OSS_REGION，无法上传预览图到 OSS。");
  }
  return new OSS({
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    internal: readBooleanEnv("OSS_INTERNAL", false),
    secure: true,
  });
}

function readBooleanEnv(key, fallback) {
  const raw = String(process.env[key] || "").trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }
  return fallback;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
