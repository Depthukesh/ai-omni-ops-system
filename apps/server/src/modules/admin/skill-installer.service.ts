import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";
import { createId } from "../../common/mock-data";
import type { SkillConfigRecord } from "../../common/mock-data";
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
    const detectedDescription = [
      String(payload.descriptionPrefix || "").trim(),
      String(frontmatter.description || "").trim(),
      `安装来源：${loaded.sourceLabel}`,
    ].filter(Boolean).join("\n\n");

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

    return {
      skill,
      sourceType: payload.sourceType,
      sourceLabel: loaded.sourceLabel,
      installRootPath,
      detectedSkillSlug,
      detectedSkillName,
      referenceFileCount: relativeFiles.filter((item) => normalizeZipPath(item.relativePath).startsWith("references/")).length,
      scriptFileCount: relativeFiles.filter((item) => normalizeZipPath(item.relativePath).startsWith("scripts/")).length,
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
