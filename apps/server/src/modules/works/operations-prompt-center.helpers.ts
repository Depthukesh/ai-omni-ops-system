import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, relative, resolve, sep } from "node:path";

import { bundledOperationsPromptSeeds } from "./operations-prompt-center.seed-data";

export type OperationsPromptSeedRecord = {
  id: string;
  slug: string;
  title: string;
  preview: string;
  content: string;
  sourceFilePath: string;
  sourceCategory: string;
  sourceFileName: string;
  businessStage: string;
  outputType: string;
  scenarioLabel: string;
  tagsJson: string[];
  sortOrder: number;
};

export const OPERATIONS_PROMPT_DEFAULT_MODEL_SEQUENCE = [
  "doubao-seed-2-0-pro-260215",
  "kimi-k2.6",
  "deepseek-v4-pro",
  "deepseek-v4-flash",
] as const;

const SUPPORTED_SOURCE_EXTENSIONS = new Set([".md", ".txt"]);
const GENERIC_PROMPT_TITLES = new Set([
  "执行指令",
  "系统指令",
  "提示词",
  "prompt",
  "prompt 模板",
  "智能体提示词",
  "角色",
  "目的",
]);

export async function loadOperationsPromptSeeds(cwd: string) {
  const sourceRoot = resolveOperationsPromptSourceRoot(cwd);
  if (!sourceRoot) {
    return bundledOperationsPromptSeeds.map((seed, index) => ({
      ...seed,
      title: resolveSeedTitle(seed.title, seed.content, seed.sourceFileName),
      content: normalizeContent(seed.content),
      preview: truncatePreview(seed.preview),
      tagsJson: [...(seed.tagsJson || [])],
      sortOrder: Number(seed.sortOrder) || index + 1,
    }));
  }
  const files = await collectPromptFiles(sourceRoot);
  const seeds = await Promise.all(
    files.map(async (filePath, index) => {
      const content = await readFile(filePath, "utf8");
      const sourceFilePath = normalizePath(relative(sourceRoot, filePath));
      const sourceFileName = basename(filePath);
      const sourceCategory = resolveSourceCategory(sourceFilePath);
      const title = extractPromptTitle(content, sourceFileName);
      const preview = extractPromptPreview(content);
      const businessStage = classifyBusinessStage(sourceCategory, title);
      const outputType = classifyOutputType(title, content);
      const scenarioLabel = classifyScenarioLabel(sourceCategory, title, content);
      const identity = createStableIdentity(sourceFilePath);
      return {
        id: `ops_prompt_${identity.slice(0, 24)}`,
        slug: `ops-prompt-${identity.slice(0, 16)}`,
        title,
        preview,
        content: normalizeContent(content),
        sourceFilePath,
        sourceCategory,
        sourceFileName,
        businessStage,
        outputType,
        scenarioLabel,
        tagsJson: [businessStage, outputType, scenarioLabel].filter(Boolean),
        sortOrder: index + 1,
      } satisfies OperationsPromptSeedRecord;
    }),
  );
  return seeds.sort((left, right) => left.sortOrder - right.sortOrder);
}

function resolveOperationsPromptSourceRoot(cwd: string) {
  const envDir = String(process.env.OPERATIONS_PROMPT_SOURCE_DIR || "").trim();
  const candidates = [
    envDir,
    resolve(cwd, "..", "提示词", "内容获客"),
    resolve(cwd, "提示词", "内容获客"),
    resolve(cwd, "..", "..", "提示词", "内容获客"),
    resolve(cwd, "..", "..", "..", "提示词", "内容获客"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

async function collectPromptFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));

  for (const entry of sortedEntries) {
    const fullPath = resolve(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectPromptFiles(fullPath));
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (!SUPPORTED_SOURCE_EXTENSIONS.has(extension)) {
      continue;
    }
    results.push(fullPath);
  }

  return results;
}

function extractPromptTitle(content: string, sourceFileName: string) {
  const headings = Array.from(
    content.matchAll(/^#{1,3}\s+(.+)$/gm),
    (match) => cleanPromptTitle(match[1] || ""),
  ).filter(Boolean);

  for (const heading of headings) {
    if (isGenericPromptTitle(heading)) {
      continue;
    }
    return heading;
  }
  const inferredTitle = inferPromptTitleFromContent(content);
  if (inferredTitle) {
    return inferredTitle;
  }
  return cleanPromptTitle(sourceFileName.replace(/\.[^.]+$/, "")) || "未命名提示词";
}

function resolveSeedTitle(seedTitle: string, content: string, sourceFileName: string) {
  const cleanedTitle = cleanPromptTitle(seedTitle);
  if (cleanedTitle && !isGenericPromptTitle(cleanedTitle)) {
    return cleanedTitle;
  }
  return extractPromptTitle(content, sourceFileName);
}

function cleanPromptTitle(value: string) {
  const normalized = String(value || "")
    .replace(/[.]{2,}/g, ".")
    .replace(/\s*-\s*智能体提示词$/i, "")
    .replace(/\s*-\s*prompt$/i, "")
    .replace(/^\d+\s*-\s*/, "")
    .trim();
  if (!normalized) {
    return "";
  }

  const pieces = normalized.split("-").map((item) => item.trim()).filter(Boolean);
  if (pieces.length >= 2) {
    const lastPiece = pieces[pieces.length - 1] || "";
    const previousPiece = pieces[pieces.length - 2] || "";
    if (lastPiece === previousPiece) {
      return lastPiece;
    }
    if (pieces.length >= 3 && /^\d+$/.test(pieces[0])) {
      return pieces.slice(2).join(" - ") || pieces[pieces.length - 1];
    }
  }

  return normalized;
}

function isGenericPromptTitle(value: string) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return true;
  }
  if (GENERIC_PROMPT_TITLES.has(normalized)) {
    return true;
  }
  return /^执行指令[：: -]*$/.test(normalized) || /^角色[：: -]*$/.test(normalized);
}

function extractPromptPreview(content: string) {
  const fromPurpose = extractSectionParagraph(content, ["目的", "目标", "用途"]);
  if (fromPurpose) {
    return truncatePreview(fromPurpose);
  }

  const fromRole = extractSectionParagraph(content, ["角色", "身份"]);
  if (fromRole) {
    return truncatePreview(fromRole);
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line
      && !line.startsWith("#")
      && !line.startsWith("```")
      && !/^author:/i.test(line)
      && !/^created:/i.test(line)
      && !/^license:/i.test(line)
      && !/^©/.test(line)
      && !/^---+$/.test(line),
    );
  return truncatePreview(lines[0] || "可用于品牌增长、内容创作和经营转化的运营提示词模板。");
}

function extractSectionParagraph(content: string, headings: string[]) {
  for (const heading of headings) {
    const expression = new RegExp(`^#{1,3}\\s*${escapeForRegExp(heading)}\\s*$([\\s\\S]*?)(?=^#{1,3}\\s|\\Z)`, "m");
    const match = content.match(expression);
    const sectionBody = match?.[1] || "";
    const lines = sectionBody
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("-") && !/^\d+\./.test(line));
    if (lines.length) {
      return lines[0];
    }
  }
  return "";
}

function inferPromptTitleFromContent(content: string) {
  const purposeLine = extractSectionParagraph(content, ["目的", "目标", "用途"]);
  const roleLine = extractSectionParagraph(content, ["角色", "身份"]);
  const outputHeading = extractFirstOutputHeading(content);
  const sample = [purposeLine, roleLine, outputHeading]
    .filter(Boolean)
    .join("\n");
  if (!sample.trim()) {
    return "";
  }

  const topic = inferPromptTopic(sample);
  const suffix = inferPromptSuffix(roleLine || sample);
  if (topic && suffix) {
    return `${topic}${suffix}`;
  }
  if (topic) {
    return `${topic}策略专家`;
  }
  return "";
}

function extractFirstOutputHeading(content: string) {
  const outputSection = extractSectionBody(content, ["输出要求", "输出内容", "输出示例"]);
  if (!outputSection) {
    return "";
  }
  const headingMatch = outputSection.match(/^\s*(?:[-*]\s*)?(?:\d+[.)：:\s-]*)?(?:#{1,3}\s*)?(.{2,24})$/m);
  return cleanPromptTitle(headingMatch?.[1] || "");
}

function extractSectionBody(content: string, headings: string[]) {
  for (const heading of headings) {
    const expression = new RegExp(`^#{1,3}\\s*${escapeForRegExp(heading)}\\s*$([\\s\\S]*?)(?=^#{1,3}\\s|\\Z)`, "m");
    const match = content.match(expression);
    if (match?.[1]) {
      return match[1];
    }
  }
  return "";
}

function inferPromptTopic(sample: string) {
  const topicMappings: Array<[RegExp, string]> = [
    [/(工作日|周一到周五).*(客流|营业额)|工作日客流/, "工作日客流"],
    [/(银发|中老年|老年客群|老年人)/, "银发客群"],
    [/(等位|排队|候位|等待体验)/, "等位体验"],
    [/(深夜|夜间|夜猫子|晚9点)/, "深夜营业"],
    [/(学生|校园|学校周边|社团)/, "校园客群"],
    [/(雨天|下雨|恶劣天气|天气突变)/, "雨天营销"],
    [/(私域|社群|企业微信|朋友圈|裂变)/, "私域运营"],
    [/(会员|VIP|忠诚客户|复购)/, "会员维护"],
    [/(好评|评价|口碑引导)/, "好评引导"],
    [/(差评|投诉|危机|公关)/, "差评处理"],
    [/(选址|商圈|门店位置)/, "门店选址"],
    [/(成本|降本|控费)/, "成本控制"],
    [/(品牌榜单|冲榜|排行)/, "品牌冲榜"],
    [/(法律|法务|合规|合同|侵权)/, "品牌法务"],
    [/(培训|新员工|内训)/, "员工培训"],
    [/(加盟|加盟商|连锁体系)/, "加盟体系"],
    [/(供应链|采购|库存|物流)/, "供应链管理"],
    [/(SOP|流程|标准化)/, "门店SOP"],
    [/(引流|获客|拉新)/, "门店获客"],
    [/(套餐|团购|定价|产品组合)/, "套餐策划"],
    [/(活动|开业|节日营销|促销)/, "营销活动"],
    [/(直播|短视频|视频内容)/, "短视频内容"],
    [/(文案|标题|润色|脚本)/, "文案优化"],
    [/(数据|诊断|分析|ROI|画像|预测)/, "经营分析"],
    [/(品牌|IP|命名|slogan|装修)/i, "品牌建设"],
  ];

  for (const [pattern, title] of topicMappings) {
    if (pattern.test(sample)) {
      return title;
    }
  }

  const purposeLine = sample.split(/\n/).find(Boolean) || "";
  const compactPurpose = purposeLine
    .replace(/^帮助/, "")
    .replace(/^为/, "")
    .replace(/^针对/, "")
    .replace(/[，。；：].*$/, "")
    .trim();
  if (compactPurpose.length >= 4 && compactPurpose.length <= 14) {
    return compactPurpose;
  }
  return "";
}

function inferPromptSuffix(sample: string) {
  const suffixMappings: Array<[RegExp, string]> = [
    [/创意起名大师/, "创意起名大师"],
    [/策划大师/, "策划大师"],
    [/文案助手/, "文案助手"],
    [/话术专家/, "话术专家"],
    [/维护专家/, "维护专家"],
    [/优化师/, "优化师"],
    [/设计师/, "设计师"],
    [/顾问/, "顾问"],
    [/操盘手/, "操盘手"],
    [/分析师/, "分析师"],
    [/策略师/, "策略师"],
    [/专家/, "专家"],
    [/助手/, "助手"],
    [/大师/, "大师"],
  ];

  for (const [pattern, suffix] of suffixMappings) {
    if (pattern.test(sample)) {
      return suffix;
    }
  }
  return "策略专家";
}

function truncatePreview(value: string) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 90) {
    return normalized;
  }
  return `${normalized.slice(0, 87).trim()}...`;
}

function resolveSourceCategory(sourceFilePath: string) {
  const segments = sourceFilePath.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "通用提示词";
  }
  return cleanSourceLabel(segments[0] || "通用提示词");
}

function cleanSourceLabel(value: string) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[.]{2,}/g, ".")
    .trim() || "通用提示词";
}

function classifyBusinessStage(sourceCategory: string, title: string) {
  const mapping: Array<[RegExp, string]> = [
    [/品牌建设/, "品牌建设"],
    [/内容创作|内容种草|行业选题|文案优化/, "内容生产"],
    [/营销推广|场景营销/, "传播种草"],
    [/引流获客|特色服务/, "引流转化"],
    [/客户服务|精细化运营/, "客户运营"],
    [/数据分析|运营管理/, "经营分析"],
    [/智能工具|AI挖词工具/, "工具支持"],
  ];
  const sample = `${sourceCategory} ${title}`;
  for (const [pattern, label] of mapping) {
    if (pattern.test(sample)) {
      return label;
    }
  }
  return "通用经营";
}

function classifyOutputType(title: string, content: string) {
  const sample = `${title}\n${content}`;
  if (/选题|话题/.test(sample)) {
    return "选题生成";
  }
  if (/话术|邀约|投诉|挽回|售后|关怀|自动回复/.test(sample)) {
    return "话术模板";
  }
  if (/数据|分析|诊断|ROI|监测|预测|画像|挖词|计算/.test(sample)) {
    return "数据分析";
  }
  if (/SOP|流程|体系|自动化|选型|预案|设计师/.test(sample)) {
    return "流程规划";
  }
  if (/文案|脚本|剧本|Slogan|起名|故事|海报/.test(sample)) {
    return "文案脚本";
  }
  return "策略方案";
}

function classifyScenarioLabel(sourceCategory: string, title: string, content: string) {
  const sample = `${sourceCategory}\n${title}\n${content}`;
  if (/小红书|笔记|种草/.test(sample)) {
    return "小红书";
  }
  if (/抖音|短视频|直播|Vlog|视频/.test(sample)) {
    return "抖音";
  }
  if (/朋友圈|私域|社群|会员|售后|客户/.test(sample)) {
    return "私域运营";
  }
  if (/门店|探店|团购|外卖|同城|餐饮|店铺|本地/.test(sample)) {
    return "本地生活";
  }
  if (/品牌|IP|企业文化|VI|Slogan/.test(sample)) {
    return "品牌经营";
  }
  if (/AI|自动化|小程序|数字化|系统/.test(sample)) {
    return "智能工具";
  }
  if (/行业选题/.test(sample)) {
    return "行业选题";
  }
  return "通用经营";
}

function createStableIdentity(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function normalizeContent(content: string) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizePath(value: string) {
  return value.split(sep).join("/");
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
