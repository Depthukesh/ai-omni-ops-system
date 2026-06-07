import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";
import { createId } from "../../common/mock-data";
import type { PromptTemplateRecord, SkillConfigRecord } from "../../common/mock-data";
import { SkillsPromptsService, type CreateSkillConfigPayload } from "./skills-prompts.service";

type ZipEntryLike = {
  entryName: string;
  isDirectory: boolean;
  getData(): Buffer;
};

type AdmZipLike = {
  getEntries(): ZipEntryLike[];
};

type GithubTreeSource = {
  owner: string;
  repo: string;
  ref: string;
  skillPath: string;
  zipUrl: string;
  sourceLabel: string;
};

export type InstallSkillPayload = {
  sourceType: "GITHUB" | "ZIP_UPLOAD";
  githubUrl?: string;
  archiveFileName?: string;
  archiveBase64?: string;
  category?: string;
  provider: string;
  defaultModel: string;
  status?: SkillConfigRecord["status"];
  pointsCost?: number;
  descriptionPrefix?: string;
};

export type InstallSkillResult = {
  skill: SkillConfigRecord;
  initialPrompt?: PromptTemplateRecord;
  parsedOverview: {
    stepSummaries: string[];
    inputHints: string[];
    outputHints: string[];
  };
  references: Array<{
    referenceKey: string;
    title: string;
    sourceType: "FILE" | "DOC" | "MARKDOWN";
    sourceUri?: string;
    usageNote?: string;
    applicableScopes?: string[];
    sortOrder?: number;
  }>;
  scripts: Array<{
    scriptKey: string;
    scriptName: string;
    runtime: "TS" | "JS" | "PYTHON" | "SHELL";
    entry?: string;
    usageNote?: string;
    sortOrder?: number;
  }>;
  sourceType: InstallSkillPayload["sourceType"];
  sourceLabel: string;
  installRootPath: string;
  detectedSkillSlug: string;
  detectedSkillName: string;
  referenceFileCount: number;
  scriptFileCount: number;
};

@Injectable()
export class SkillInstallerService {
  constructor(private readonly skillsPromptsService: SkillsPromptsService) {}

  async installSkill(payload: InstallSkillPayload): Promise<InstallSkillResult> {
    const category = String(payload.category || "").trim() || "导入技能";
    const provider = String(payload.provider || "").trim();
    const defaultModel = String(payload.defaultModel || "").trim();
    if (!provider) {
      throw new BadRequestException("安装技能时必须选择供应商");
    }
    if (!defaultModel) {
      throw new BadRequestException("安装技能时必须选择默认模型");
    }

    const loaded = payload.sourceType === "GITHUB"
      ? await this.loadGithubSkill(payload.githubUrl)
      : this.loadUploadedArchive(payload.archiveBase64, payload.archiveFileName);

    const installId = createId("skill_import");
    const installRootPath = resolve(process.cwd(), ".runtime", "installed-skills", installId);
    mkdirSync(installRootPath, { recursive: true });

    const relativeFiles = loaded.entries
      .filter((entry) => {
        if (entry.isDirectory) {
          return false;
        }
        const normalized = normalizeZipPath(entry.entryName);
        return loaded.skillRootPath ? normalized.startsWith(`${loaded.skillRootPath}/`) : true;
      })
      .map((entry) => {
        const normalized = normalizeZipPath(entry.entryName);
        return {
          relativePath: loaded.skillRootPath ? normalized.slice(loaded.skillRootPath.length + 1) : normalized,
          buffer: entry.getData(),
        };
      });

    if (!relativeFiles.length) {
      throw new BadRequestException("技能压缩包中没有可安装文件");
    }

    for (const file of relativeFiles) {
      const nextPath = resolve(installRootPath, file.relativePath);
      ensurePathInsideRoot(installRootPath, nextPath);
      mkdirSync(resolve(nextPath, ".."), { recursive: true });
      writeFileSync(nextPath, file.buffer);
    }

    const skillMarkdown = relativeFiles.find((item) => normalizeZipPath(item.relativePath) === "SKILL.md");
    if (!skillMarkdown) {
      throw new BadRequestException("没有找到 SKILL.md，无法安装技能");
    }

    const markdownText = skillMarkdown.buffer.toString("utf-8");
    const frontmatter = parseFrontmatter(markdownText);
    const detectedSlugBase = slugify(frontmatter.name || loaded.skillFolderName || "imported-skill");
    const detectedSkillSlug = await this.resolveAvailableSlug(detectedSlugBase);
    const detectedSkillName = deriveSkillDisplayName(markdownText, frontmatter.name || loaded.skillFolderName || detectedSkillSlug);
    const parsedOverview = parseSkillMarkdownOverview(markdownText);
    const detectedDescription = buildInstalledSkillDescription({
      descriptionPrefix: String(payload.descriptionPrefix || "").trim(),
      frontmatterDescription: String(frontmatter.description || "").trim(),
      sourceLabel: loaded.sourceLabel,
      parsedOverview,
    });

    const createPayload: CreateSkillConfigPayload = {
      name: detectedSkillName,
      slug: detectedSkillSlug,
      category,
      provider,
      defaultModel,
      status: payload.status || "DRAFT",
      pointsCost: Math.max(0, Number(payload.pointsCost || 0)),
      description: detectedDescription,
    };

    const skill = await this.skillsPromptsService.createSkill(createPayload);
    const initialPrompt = await this.createInitialPromptFromSkillMarkdown({
      markdownText,
      skill,
      defaultModel,
      detectedSkillName,
    });
    const references = buildReferenceManifest(relativeFiles, detectedSkillSlug);
    const scripts = buildScriptManifest(relativeFiles, detectedSkillSlug);

    return {
      skill,
      initialPrompt,
      parsedOverview,
      references,
      scripts,
      sourceType: payload.sourceType,
      sourceLabel: loaded.sourceLabel,
      installRootPath,
      detectedSkillSlug,
      detectedSkillName,
      referenceFileCount: references.length,
      scriptFileCount: scripts.length,
    };
  }

  private async loadGithubSkill(urlValue?: string) {
    const source = parseGithubTreeUrl(urlValue);
    const response = await fetch(source.zipUrl, {
      headers: {
        "User-Agent": "ai-omni-ops-system-skill-installer",
      },
    });
    if (!response.ok) {
      throw new BadRequestException(`GitHub 技能下载失败：${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("zip") && !contentType.includes("octet-stream")) {
      throw new BadRequestException("GitHub 返回内容不是 zip 压缩包");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return this.readArchiveBuffer(buffer, source.sourceLabel, source.skillPath);
  }

  private loadUploadedArchive(archiveBase64?: string, archiveFileName?: string) {
    const encoded = String(archiveBase64 || "").trim();
    if (!encoded) {
      throw new BadRequestException("请上传技能压缩包");
    }
    const fileName = String(archiveFileName || "").trim() || "skill.zip";
    const buffer = Buffer.from(encoded, "base64");
    return this.readArchiveBuffer(buffer, fileName);
  }

  private readArchiveBuffer(buffer: Buffer, sourceLabel: string, expectedSkillPath?: string) {
    const AdmZip = require("adm-zip") as {
      new (input: Buffer): AdmZipLike;
    };
    const archive = new AdmZip(buffer);
    const entries = archive.getEntries();
    const skillRootPath = this.resolveSkillRoot(entries, expectedSkillPath);
    return {
      entries,
      skillRootPath,
      skillFolderName: basenamePosix(skillRootPath),
      sourceLabel,
    };
  }

  private resolveSkillRoot(entries: ZipEntryLike[], expectedSkillPath?: string) {
    const normalizedExpected = normalizeZipPath(expectedSkillPath || "");
    const skillMarkdownCandidates = entries
      .filter((entry) => !entry.isDirectory)
      .map((entry) => normalizeZipPath(entry.entryName))
      .filter((entryName) => entryName === "SKILL.md" || entryName.endsWith("/SKILL.md"));

    if (!skillMarkdownCandidates.length) {
      throw new BadRequestException("压缩包中没有找到 SKILL.md");
    }

    if (normalizedExpected) {
      const exact = skillMarkdownCandidates.find((entryName) => entryName.endsWith(`/${normalizedExpected}/SKILL.md`) || entryName === `${normalizedExpected}/SKILL.md`);
      if (exact) {
        return normalizeZipPath(exact.slice(0, -"/SKILL.md".length));
      }
    }

    if (skillMarkdownCandidates.length > 1) {
      throw new BadRequestException("压缩包中包含多个技能目录，请只上传单个技能压缩包");
    }

    return normalizeZipPath(skillMarkdownCandidates[0].slice(0, -"/SKILL.md".length));
  }

  private async resolveAvailableSlug(baseSlug: string) {
    const normalizedBase = slugify(baseSlug || "imported-skill");
    const skills = await this.skillsPromptsService.listSkills();
    const used = new Set(skills.map((item) => item.slug));
    if (!used.has(normalizedBase)) {
      return normalizedBase;
    }
    let index = 2;
    while (used.has(`${normalizedBase}-${index}`)) {
      index += 1;
    }
    return `${normalizedBase}-${index}`;
  }

  private async createInitialPromptFromSkillMarkdown(input: {
    markdownText: string;
    skill: SkillConfigRecord;
    defaultModel: string;
    detectedSkillName: string;
  }) {
    const promptScene = await this.resolveAvailablePromptScene(`导入技能-${input.skill.slug}`);
    const prompt = await this.skillsPromptsService.createPrompt({
      name: `${input.detectedSkillName}-安装导入提示词`,
      scene: promptScene,
      version: "v1.0",
      status: "DRAFT",
      modelName: input.defaultModel,
      temperature: 0.7,
      maxTokens: 4000,
      content: buildInstalledSkillPromptContent(input.markdownText, input.detectedSkillName),
    });
    await this.skillsPromptsService.createSkillPromptBinding({
      skillId: input.skill.id,
      skillSlug: input.skill.slug,
      promptId: prompt.id,
      promptScene: prompt.scene,
      bindingType: "PRIMARY",
      isPrimary: true,
      sortOrder: 100,
      enabled: true,
      remarks: "技能安装时自动生成的初始提示词绑定",
    });
    return prompt;
  }

  private async resolveAvailablePromptScene(baseScene: string) {
    const normalizedBase = String(baseScene || "").trim() || "导入技能";
    const prompts = await this.skillsPromptsService.listPrompts();
    const used = new Set(prompts.map((item) => item.scene));
    if (!used.has(normalizedBase)) {
      return normalizedBase;
    }
    let index = 2;
    while (used.has(`${normalizedBase}-${index}`)) {
      index += 1;
    }
    return `${normalizedBase}-${index}`;
  }
}

function parseGithubTreeUrl(urlValue?: string): GithubTreeSource {
  const raw = String(urlValue || "").trim();
  if (!raw) {
    throw new BadRequestException("请填写 GitHub 技能目录链接");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new BadRequestException("GitHub 链接格式不正确");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parsed.hostname !== "github.com" || parts.length < 5 || parts[2] !== "tree") {
    throw new BadRequestException("当前 first pass 仅支持 github.com 的 tree 目录链接");
  }
  const [owner, repo, , ref, ...skillPathParts] = parts;
  if (!owner || !repo || !ref || !skillPathParts.length) {
    throw new BadRequestException("GitHub 技能目录链接缺少 owner/repo/ref/path");
  }
  const skillPath = normalizeZipPath(skillPathParts.join("/"));
  return {
    owner,
    repo,
    ref,
    skillPath,
    zipUrl: `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(ref)}`,
    sourceLabel: raw,
  };
}

function parseFrontmatter(content: string) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const source = matched?.[1] || "";
  const lines = source.split(/\r?\n/);
  const result: Record<string, string> = {};
  for (const line of lines) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!pair) {
      continue;
    }
    result[pair[1].trim().toLowerCase()] = pair[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return {
    name: result.name || "",
    description: result.description || "",
    version: result.version || "",
  };
}

function deriveSkillDisplayName(content: string, fallback: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || humanizeSkillName(fallback);
}

function buildInstalledSkillPromptContent(content: string, skillName: string) {
  const normalized = String(content || "").trim();
  const workflowBlock =
    normalized.match(/##\s+.*?(Workflow|工作流)[\s\S]*?(?=\n##\s+|$)/i)?.[0]
    || normalized.match(/##\s+.*?(Step|步骤)[\s\S]*?(?=\n##\s+|$)/i)?.[0]
    || normalized.slice(0, 6000);
  return [
    `你正在执行已安装技能「${skillName}」。`,
    "请严格依据下面的技能说明、流程步骤、输入输出要求完成任务；缺少参数时先向用户补齐。",
    "",
    "=== 已安装技能说明 ===",
    workflowBlock.trim(),
  ].join("\n");
}

function buildInstalledSkillDescription(input: {
  descriptionPrefix: string;
  frontmatterDescription: string;
  sourceLabel: string;
  parsedOverview: {
    stepSummaries: string[];
    inputHints: string[];
    outputHints: string[];
  };
}) {
  const blocks = [
    input.descriptionPrefix,
    input.frontmatterDescription,
    `安装来源：${input.sourceLabel}`,
    input.parsedOverview.stepSummaries.length
      ? `步骤摘要：\n${input.parsedOverview.stepSummaries.map((item, index) => `${index + 1}. ${item}`).join("\n")}`
      : "",
    input.parsedOverview.inputHints.length
      ? `输入要点：\n${input.parsedOverview.inputHints.map((item) => `- ${item}`).join("\n")}`
      : "",
    input.parsedOverview.outputHints.length
      ? `输出要点：\n${input.parsedOverview.outputHints.map((item) => `- ${item}`).join("\n")}`
      : "",
  ].filter(Boolean);
  return blocks.join("\n\n");
}

function parseSkillMarkdownOverview(content: string) {
  const normalized = String(content || "").trim();
  const headings = Array.from(normalized.matchAll(/^##\s+(.+)$/gm)).map((item) => item[1].trim());
  const stepSummaries = dedupeStrings([
    ...extractHeadingsByKeywords(headings, ["step", "步骤", "流程", "工作流", "phase", "stage"]),
    ...extractListItemsFromKeywordSections(normalized, ["step", "步骤", "流程", "工作流", "phase", "stage"], 6),
  ]).slice(0, 8);
  const inputHints = dedupeStrings([
    ...extractHeadingsByKeywords(headings, ["input", "输入", "参数", "前提", "requirements", "配置"]),
    ...extractListItemsFromKeywordSections(normalized, ["input", "输入", "参数", "前提", "requirements", "配置"], 8),
    ...extractInlineKeywordLines(normalized, ["输入", "参数", "上传", "选择", "知识库", "reference", "model"], 8),
  ]).slice(0, 8);
  const outputHints = dedupeStrings([
    ...extractHeadingsByKeywords(headings, ["output", "输出", "结果", "产出", "deliverable"]),
    ...extractListItemsFromKeywordSections(normalized, ["output", "输出", "结果", "产出", "deliverable"], 8),
    ...extractInlineKeywordLines(normalized, ["输出", "结果", "生成", "产出", "html", "image", "视频"], 8),
  ]).slice(0, 8);

  return {
    stepSummaries: stepSummaries.length ? stepSummaries : extractFallbackNumberedSteps(normalized, 6),
    inputHints: inputHints.length ? inputHints : extractFallbackBullets(normalized, 5),
    outputHints,
  };
}

function extractHeadingsByKeywords(headings: string[], keywords: string[]) {
  return headings.filter((item) => includesAnyKeyword(item, keywords));
}

function extractListItemsFromKeywordSections(content: string, keywords: string[], limit: number) {
  const sections = content.match(/^##\s+.+?$(?:\r?\n(?!##\s).*)*/gm) || [];
  const items: string[] = [];
  for (const section of sections) {
    const title = section.match(/^##\s+(.+)$/m)?.[1] || "";
    if (!includesAnyKeyword(title, keywords)) {
      continue;
    }
    const lines = section
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
      .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(Boolean);
    items.push(...lines);
    if (items.length >= limit) {
      break;
    }
  }
  return items.slice(0, limit);
}

function extractInlineKeywordLines(content: string, keywords: string[], limit: number) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && includesAnyKeyword(line, keywords))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter((line) => line.length <= 120)
    .slice(0, limit);
}

function extractFallbackNumberedSteps(content: string, limit: number) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, "").trim())
    .slice(0, limit);
}

function extractFallbackBullets(content: string, limit: number) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function includesAnyKeyword(value: string, keywords: string[]) {
  const normalized = String(value || "").toLowerCase();
  return keywords.some((item) => normalized.includes(item.toLowerCase()));
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function buildReferenceManifest(
  files: Array<{ relativePath: string; buffer: Buffer }>,
  detectedSkillSlug: string,
) {
  return files
    .filter((item) => normalizeZipPath(item.relativePath).startsWith("references/"))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    .map((item, index) => {
      const normalized = normalizeZipPath(item.relativePath);
      const ext = normalized.split(".").pop()?.toLowerCase() || "";
      const fileName = basenamePosix(normalized);
      const titleBase = fileName.replace(/\.[^.]+$/, "");
      return {
        referenceKey: slugify(`${detectedSkillSlug}-${titleBase}`),
        title: humanizeSkillName(titleBase),
        sourceType: ext === "md" ? "MARKDOWN" as const : ["doc", "docx", "pdf"].includes(ext) ? "DOC" as const : "FILE" as const,
        sourceUri: `installed-skill://${detectedSkillSlug}/${normalized}`,
        usageNote: `技能安装自动导入，源文件：${normalized}`,
        applicableScopes: ["SKILL_INSTALL", detectedSkillSlug],
        sortOrder: (index + 1) * 10,
      };
    });
}

function buildScriptManifest(
  files: Array<{ relativePath: string; buffer: Buffer }>,
  detectedSkillSlug: string,
) {
  return files
    .filter((item) => normalizeZipPath(item.relativePath).startsWith("scripts/"))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    .map((item, index) => {
      const normalized = normalizeZipPath(item.relativePath);
      const fileName = basenamePosix(normalized);
      const scriptBase = fileName.replace(/\.[^.]+$/, "");
      return {
        scriptKey: slugify(`${detectedSkillSlug}-${scriptBase}`),
        scriptName: humanizeSkillName(scriptBase),
        runtime: detectScriptRuntime(normalized),
        entry: normalized,
        usageNote: `技能安装自动导入，源文件：${normalized}`,
        sortOrder: (index + 1) * 10,
      };
    });
}

function detectScriptRuntime(pathValue: string): "TS" | "JS" | "PYTHON" | "SHELL" {
  const ext = normalizeZipPath(pathValue).split(".").pop()?.toLowerCase() || "";
  if (ext === "ts") {
    return "TS";
  }
  if (ext === "py") {
    return "PYTHON";
  }
  if (ext === "sh" || ext === "bash") {
    return "SHELL";
  }
  return "JS";
}

function humanizeSkillName(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "导入技能";
  }
  if (/[\u4e00-\u9fa5]/.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .replace(/^baoyu[-_]/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (item) => item.toUpperCase());
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "imported-skill";
}

function normalizeZipPath(value: string) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function basenamePosix(value: string) {
  const parts = normalizeZipPath(value).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function ensurePathInsideRoot(rootPath: string, targetPath: string) {
  const normalizedRoot = resolve(rootPath);
  const normalizedTarget = resolve(targetPath);
  const rootWithSeparator = normalizedRoot.endsWith("\\") || normalizedRoot.endsWith("/")
    ? normalizedRoot
    : `${normalizedRoot}\\`;
  if (normalizedTarget !== normalizedRoot && !normalizedTarget.startsWith(rootWithSeparator)) {
    throw new BadRequestException("压缩包包含非法路径，安装已终止");
  }
}
