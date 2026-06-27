import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { resolvePromptFallbackContent } from "./prompt-fallbacks";

export type PromptSourceBundle = {
  content: string;
  entryFilePath?: string;
  referenceFiles: string[];
};

export const PROMPT_SOURCE_CANDIDATES: Record<string, string[]> = {
  prompt_xhs_original_copy: [
    "提示词/original_copy/original_copy/SKILL.md",
    "../../../提示词/original_copy/original_copy/SKILL.md",
    "../提示词/original_copy/original_copy/SKILL.md",
  ],
  prompt_xhs_original_copy_science: [
    "提示词/original_copy/science/SKILL.md",
    "../../../提示词/original_copy/science/SKILL.md",
    "../提示词/original_copy/science/SKILL.md",
  ],
  prompt_xhs_original_copy_review: [
    "提示词/original_copy/review/SKILL.md",
    "../../../提示词/original_copy/review/SKILL.md",
    "../提示词/original_copy/review/SKILL.md",
  ],
  prompt_xhs_original_copy_avoid_pitfall: [
    "提示词/original_copy/avoid_pitfall/SKILL.md",
    "../../../提示词/original_copy/avoid_pitfall/SKILL.md",
    "../提示词/original_copy/avoid_pitfall/SKILL.md",
  ],
  prompt_xhs_original_note: [
    "../../../提示词/original_image/SKILL.md",
    "../提示词/original_image/SKILL.md",
  ],
  prompt_xhs_original_image_generation: [
    "提示词/original_image_generation/SKILL.md",
    "../../../提示词/original_image_generation/SKILL.md",
    "../提示词/original_image_generation/SKILL.md",
  ],
  prompt_xhs_rewrite_copy: [
    "../../../提示词/rewrite_copy/SKILL.md",
    "../提示词/rewrite_copy/SKILL.md",
  ],
  prompt_xhs_rewrite_note: [
    "../../../提示词/rewrite_image/SKILL.md",
    "../提示词/rewrite_image/SKILL.md",
  ],
  prompt_xhs_rewrite_image_generation: [
    "提示词/rewrite_image_generation/SKILL.md",
    "../../../提示词/rewrite_image_generation/SKILL.md",
    "../提示词/rewrite_image_generation/SKILL.md",
  ],
  prompt_xhs_video_note: [
    "../../../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
    "../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
  ],
  prompt_xhs_video_brand_script: [
    "提示词/视频生成提示词/品牌宣传剧本提示词.txt",
    "../../../提示词/视频生成提示词/品牌宣传剧本提示词.txt",
    "../提示词/视频生成提示词/品牌宣传剧本提示词.txt",
  ],
  prompt_xhs_video_spoken_script: [
    "提示词/视频生成提示词/口播带货剧本提示词.txt",
    "../../../提示词/视频生成提示词/口播带货剧本提示词.txt",
    "../提示词/视频生成提示词/口播带货剧本提示词.txt",
  ],
  prompt_xhs_video_skit_script: [
    "提示词/视频生成提示词/短剧带货剧本提示词.txt",
    "../../../提示词/视频生成提示词/短剧带货剧本提示词.txt",
    "../提示词/视频生成提示词/短剧带货剧本提示词.txt",
  ],
  prompt_xhs_video_remix_script: [
    "提示词/视频生成提示词/拆解短视频提示词.txt",
    "../../../提示词/视频生成提示词/拆解短视频提示词.txt",
    "../提示词/视频生成提示词/拆解短视频提示词.txt",
  ],
  prompt_xhs_video_storyboard: [
    "提示词/视频生成提示词/生成故事板提示词.txt",
    "../../../提示词/视频生成提示词/生成故事板提示词.txt",
    "../提示词/视频生成提示词/生成故事板提示词.txt",
  ],
  prompt_douyin_video_note: [
    "../../../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
    "../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
  ],
  prompt_douyin_video_brand_script: [
    "提示词/视频生成提示词/品牌宣传剧本提示词.txt",
    "../../../提示词/视频生成提示词/品牌宣传剧本提示词.txt",
    "../提示词/视频生成提示词/品牌宣传剧本提示词.txt",
  ],
  prompt_douyin_video_spoken_script: [
    "提示词/视频生成提示词/口播带货剧本提示词.txt",
    "../../../提示词/视频生成提示词/口播带货剧本提示词.txt",
    "../提示词/视频生成提示词/口播带货剧本提示词.txt",
  ],
  prompt_douyin_video_skit_script: [
    "提示词/视频生成提示词/短剧带货剧本提示词.txt",
    "../../../提示词/视频生成提示词/短剧带货剧本提示词.txt",
    "../提示词/视频生成提示词/短剧带货剧本提示词.txt",
  ],
  prompt_douyin_video_remix_script: [
    "提示词/视频生成提示词/拆解短视频提示词.txt",
    "../../../提示词/视频生成提示词/拆解短视频提示词.txt",
    "../提示词/视频生成提示词/拆解短视频提示词.txt",
  ],
  prompt_douyin_video_storyboard: [
    "提示词/视频生成提示词/生成故事板提示词.txt",
    "../../../提示词/视频生成提示词/生成故事板提示词.txt",
    "../提示词/视频生成提示词/生成故事板提示词.txt",
  ],
  prompt_douyin_direct_video: [
    "../../../提示词/抖音板块/AI生成视频不带故事板.txt",
    "../提示词/抖音板块/AI生成视频不带故事板.txt",
  ],
  prompt_douyin_remix_short_video: [
    "../../../提示词/复刻视频/复刻短视频.txt",
    "../提示词/复刻视频/复刻短视频.txt",
    "../../../../../技能/复刻视频/SKILL.md",
    "../../../技能/复刻视频/SKILL.md",
    "../技能/复刻视频/SKILL.md",
  ],
  prompt_douyin_remix_short_video_compose: [
    "提示词/复刻视频/复刻短视频-拼接成片提示词.txt",
    "../../../提示词/复刻视频/复刻短视频-拼接成片提示词.txt",
    "../提示词/复刻视频/复刻短视频-拼接成片提示词.txt",
  ],
  prompt_douyin_digital_human_script: [
    "../../../提示词/抖音板块/数字人口播脚本.txt",
    "../提示词/抖音板块/数字人口播脚本.txt",
  ],
  prompt_growth_report: [
    "../../../.trae/skills/brand-omni-growth-analysis/SKILL.md",
    "../../../.runtime/brand-omni-growth-analysis/brand-omni-growth-analysis/SKILL.md",
    "../../../提示词/brand-omni-growth-analysis/brand-omni-growth-analysis/SKILL.md",
  ],
  prompt_opportunity_insight_brand_account: [
    "提示词/账号分析.txt",
    "../../../提示词/账号分析.txt",
    "../提示词/账号分析.txt",
  ],
  prompt_opportunity_insight_competitor_account: [
    "提示词/竞品账号分析.txt",
    "../../../提示词/竞品账号分析.txt",
    "../提示词/竞品账号分析.txt",
  ],
  prompt_opportunity_insight_comment: [
    "提示词/评论洞察提示词.txt",
    "../../../提示词/评论洞察提示词.txt",
    "../提示词/评论洞察提示词.txt",
  ],
  prompt_opportunity_insight_final_report: [
    "提示词/机会洞察总报告提示词.txt",
    "提示词/机会洞察总报告.txt",
    "../../../提示词/机会洞察总报告.txt",
    "../../../提示词/机会洞察总报告提示词.txt",
    "../提示词/机会洞察总报告.txt",
    "../提示词/机会洞察总报告提示词.txt",
  ],
  prompt_visual_report: [
    "../../../提示词/article-visual-report-designer/SKILL.md",
  ],
  prompt_xhs_plan: [
    "../../../提示词/xiaohongshu-brand-marketing-plan/xiaohongshu-brand-marketing-plan/SKILL.md",
    "../../../提示词/_xhs-plan-skill/xiaohongshu-brand-marketing-plan/SKILL.md",
  ],
  prompt_douyin_plan: [
    "../../../提示词/tongcheng-brand-douyin-planning/tongcheng-brand-douyin-planning/SKILL.md",
    "../../../.trae/skills/tongcheng-brand-douyin-planning/SKILL.md",
  ],
  prompt_douyin_hot_topic_candidates: [
    "../../../提示词/抖音板块/热点找选题.txt",
    "../提示词/抖音板块/热点找选题.txt",
  ],
  prompt_douyin_original_copy_viewpoint: [
    "../../../提示词/抖音板块/观点型.txt",
    "../提示词/抖音板块/观点型.txt",
  ],
  prompt_douyin_original_copy_story: [
    "../../../提示词/抖音板块/讲故事.txt",
    "../提示词/抖音板块/讲故事.txt",
  ],
  prompt_douyin_original_copy_process: [
    "../../../提示词/抖音板块/晒过程.txt",
    "../提示词/抖音板块/晒过程.txt",
  ],
  prompt_douyin_original_copy_knowledge: [
    "../../../提示词/抖音板块/教知识.txt",
    "../提示词/抖音板块/教知识.txt",
  ],
  prompt_douyin_original_copy_plot_sales: [
    "../../../提示词/抖音板块/剧情带货类.txt",
    "../提示词/抖音板块/剧情带货类.txt",
  ],
  prompt_douyin_original_copy_seeding: [
    "../../../提示词/抖音板块/种草类.txt",
    "../提示词/抖音板块/种草类.txt",
  ],
  prompt_douyin_original_copy_local_sales: [
    "../../../提示词/抖音板块/同城带货类.txt",
    "../提示词/抖音板块/同城带货类.txt",
  ],
  prompt_douyin_remix_copy_intro: [
    "../../../提示词/抖音板块/拆解开头.txt",
    "../提示词/抖音板块/拆解开头.txt",
  ],
  prompt_douyin_remix_copy_body: [
    "../../../提示词/抖音板块/拆解正文.txt",
    "../提示词/抖音板块/拆解正文.txt",
  ],
  prompt_douyin_remix_copy_outro: [
    "../../../提示词/抖音板块/拆解结尾.txt",
    "../提示词/抖音板块/拆解结尾.txt",
  ],
  prompt_douyin_remix_copy_final: [
    "../../../提示词/抖音板块/二创.txt",
    "../提示词/抖音板块/二创.txt",
  ],
  prompt_xhs_calendar: [
    "../../../提示词/营销日历提示词.txt",
    "../提示词/营销日历提示词.txt",
  ],
  prompt_wechat_article_compose: [
    "../../../提示词/wechat/wechat-article-composer/SKILL.md",
    "../提示词/wechat/wechat-article-composer/SKILL.md",
  ],
  prompt_wechat_cover_image_compose: [
    "../../../提示词/wechat/wechat-cover-image-designer/SKILL.md",
    "../提示词/wechat/wechat-cover-image-designer/SKILL.md",
  ],
  prompt_wechat_body_image_compose: [
    "../../../提示词/wechat/prompt_wechat_body_image_compose.md",
    "../提示词/wechat/prompt_wechat_body_image_compose.md",
    "../../../提示词/wechat/wechat-body-image-designer/SKILL.md",
    "../提示词/wechat/wechat-body-image-designer/SKILL.md",
  ],
  prompt_wechat_html_render: [
    "../../../提示词/wechat/wechat-html-renderer/SKILL.md",
    "../提示词/wechat/wechat-html-renderer/SKILL.md",
  ],
  prompt_wechat_api_publish: [
    "../../../提示词/wechat/wechat-api-publisher/SKILL.md",
    "../提示词/wechat/wechat-api-publisher/SKILL.md",
  ],
};

function buildDerivedPromptCandidates(promptId: string) {
  if (!/^prompt_design_/.test(promptId)) {
    return [];
  }

  return [
    `提示词/open-design/${promptId}/SKILL.md`,
    `../../../提示词/open-design/${promptId}/SKILL.md`,
    `../提示词/open-design/${promptId}/SKILL.md`,
  ];
}

const IGNORED_DIRECTORIES = new Set(["__pycache__", "outputs", "scripts"]);
const READABLE_REFERENCE_EXTENSIONS = new Set([".md", ".txt"]);

function collectAncestorRoots(startPath: string) {
  const roots: string[] = [];
  let current = resolve(startPath);
  while (!roots.includes(current)) {
    roots.push(current);
    const parent = resolve(current, "..");
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return roots;
}

function buildPromptSearchRoots() {
  const uniqueRoots = new Set<string>();
  for (const root of collectAncestorRoots(process.cwd())) {
    uniqueRoots.add(root);
  }
  for (const root of collectAncestorRoots(__dirname)) {
    uniqueRoots.add(root);
  }
  return Array.from(uniqueRoots);
}

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
  const entries: PromptReferenceEntry[] = [];

  function walk(directoryPath: string, relativePrefix = "") {
    const directoryEntries = readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of directoryEntries) {
      const absolutePath = resolve(directoryPath, entry.name);
      const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        walk(absolutePath, relativePath);
        continue;
      }
      if (resolve(absolutePath) === resolve(entryFilePath)) {
        continue;
      }
      if (!READABLE_REFERENCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        continue;
      }
      const content = readTextFile(absolutePath);
      if (!content) {
        continue;
      }
      entries.push({
        fileName: relativePath,
        content,
      });
    }
  }

  walk(entryDirectory);

  return entries.sort((left, right) => compareReferenceFileNames(left.fileName, right.fileName));
}

function shouldAggregateReferenceFiles(entryFilePath: string) {
  const entryFileName = basename(entryFilePath).toLowerCase();
  return entryFileName === "skill.md";
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
  const candidates = [...(PROMPT_SOURCE_CANDIDATES[promptId] || []), ...buildDerivedPromptCandidates(promptId)];
  if (!candidates?.length) {
    return undefined;
  }

  for (const root of buildPromptSearchRoots()) {
    for (const candidate of candidates) {
      const filePath = resolve(root, candidate);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
  }

  return undefined;
}

export function readPromptSourceBundle(promptId: string, fallback: string): PromptSourceBundle {
  const entryFilePath = resolvePromptSourceEntryPath(promptId);
  const normalizedFallback = resolvePromptFallbackContent(promptId, fallback);
  if (!entryFilePath) {
    return {
      content: normalizedFallback,
      referenceFiles: [],
    };
  }

  try {
    const entryContent = readTextFile(entryFilePath);
    const referenceEntries = shouldAggregateReferenceFiles(entryFilePath)
      ? listReadableReferenceEntries(entryFilePath)
      : [];

    return {
      content: formatPromptSourceBundle(entryContent || normalizedFallback, referenceEntries),
      entryFilePath,
      referenceFiles: referenceEntries.map((entry) => entry.fileName),
    };
  } catch {
    return {
      content: normalizedFallback,
      entryFilePath,
      referenceFiles: [],
    };
  }
}

export function promptSourceHasReferenceFiles(promptId: string) {
  return readPromptSourceBundle(promptId, "").referenceFiles.length > 0;
}
